"""Mechanical source-cell extraction and 390px anchor storyboards. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import hashlib, json

ROOT = Path(__file__).resolve().parent
MOVES = {
    'saint': ['saintstrike', 'communion', 'saintarc', 'vowstrike', 'sharewound', 'lastlight'],
    'dance': ['cadence', 'duet', 'rounddance', 'deepbeat', 'echofoot', 'closingstep'],
}
BEATS = ['prepare', 'peak', 'settle']
ANCHORS = {
    'saintstrike': ['caster hand','struck foe lower torso','struck foe to healed ally lower torso'],
    'communion': ['caster hand','two actual allied recipients lower torso','same two allied recipients'],
    'saintarc': ['caster hand','front-row sweep plus one local contact per struck foe','affected front row low'],
    'vowstrike': ['caster hand','struck foe lower torso','same foe lower torso'],
    'sharewound': ['caster hand','caster to actual linked ally lower torso','same link endpoints'],
    'lastlight': ['caster hand','one struck foe lower torso','struck foe to actual healed allies'],
    'cadence': ['caster hand','cooldown-restored ally lower torso','same ally lower torso'],
    'duet': ['caster hand','caster to actual allied target lower torso','same link endpoints'],
    'rounddance': ['caster hand','floor under actual allied team','same team floor'],
    'deepbeat': ['caster hand','target rendered soles','same rendered soles'],
    'echofoot': ['caster foot','caster foot toward struck foe soles','struck foe lower leg'],
    'closingstep': ['caster hand','caster rendered soles','caster rendered soles'],
}
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def font(n):
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', n)
def actor(im, x, y, role='A'):
    d=ImageDraw.Draw(im)
    c = '#b0b8ca' if role!='F' else '#b998a0'
    d.ellipse((x-4,y-22,x+4,y-14),fill=c)
    d.polygon([(x-4,y-12),(x+4,y-12),(x+7,y+4),(x-7,y+4)],fill=c)
    d.line((x-3,y+4,x-4,y+13),fill=c,width=2)
    d.line((x+3,y+4,x+4,y+13),fill=c,width=2)
    d.text((x-4,y+18),role,font=font(9),fill='#bfc8da')
def stamp(im, art, xy, size, opacity=1):
    art=art.copy(); art.thumbnail(size,Image.Resampling.LANCZOS)
    if opacity!=1: art.putalpha(art.getchannel('A').point(lambda a:round(a*opacity)))
    im.alpha_composite(art,(round(xy[0]-art.width/2),round(xy[1]-art.height/2)))
def board(family, rev, entries):
    im=Image.new('RGBA',(390,1648),'#101827'); d=ImageDraw.Draw(im)
    accent='#f7ce7c' if family=='saint' else '#f7a3ca'
    d.text((16,14),family.upper()+' / '+rev,font=font(22),fill=accent)
    d.text((16,46),'ORIGINAL VFX  /  390px anchor storyboard',font=font(12),fill='#d0d8e8')
    d.text((16,65),'C caster  A ally  F foe / diagrams, not runtime',font=font(11),fill='#94a4bf')
    for row,move in enumerate(MOVES[family]):
        y=94+row*252
        d.text((16,y),f'{row+1:02}  {move}',font=font(17),fill=accent)
        for col,beat in enumerate(BEATS):
            x=8+col*127
            d.rounded_rectangle((x,y+29,x+120,y+207),8,fill='#1c273b',outline='#34435b')
            d.text((x+8,y+38),beat.upper(),font=font(10),fill='#c4cfe3')
            scene=Image.new('RGBA',(120,124))
            art=Image.open(ROOT/family/rev/f'{move}_{beat}.png').convert('RGBA')
            actor(scene,24,69,'A' if move=='communion' or (move in ['saintstrike','lastlight'] and beat=='settle') else 'C')
            target_role='F' if move in ['saintstrike','saintarc','vowstrike','lastlight','echofoot'] else 'A'
            actor(scene,94,69,target_role)
            if beat=='prepare': stamp(scene,art,(32,64),(48,48))
            elif move=='saintarc':
                scene=Image.new('RGBA',(120,124))
                if beat=='peak':
                    sweep=Image.open(ROOT/family/rev/'saintarc_prepare.png').convert('RGBA')
                    stamp(scene,sweep,(60,77),(112,64),.85)
                else: stamp(scene,art,(60,77),(112,64),.85)
                for tx in [27,60,93]:
                    actor(scene,tx,65,'F')
                    if beat=='peak':
                        contact=Image.open(ROOT/family/rev/'saintstrike_peak.png').convert('RGBA')
                        stamp(scene,contact,(tx,76),(27,27))
            elif move in ['saintstrike','lastlight'] and beat=='settle':
                # Source's tapered light is a visual link, positioned foe-to-ally.
                if move=='lastlight': art=ImageOps.mirror(art)
                stamp(scene,art,(60,69),(110,74))
                if move=='lastlight':
                    actor(scene,26,39,'A'); actor(scene,26,97,'A')
            elif move in ['communion','sharewound','duet']:
                stamp(scene,art,(60,70),(112,90))
            elif move=='rounddance':
                scene=Image.new('RGBA',(120,124))
                stamp(scene,art,(60,83),(114,66))
                for tx,ty in [(25,61),(60,53),(95,61),(43,85),(78,85)]: actor(scene,tx,ty,'A')
            elif move=='deepbeat': stamp(scene,art,(94,86),(64,33))
            elif move=='closingstep': stamp(scene,art,(24,73),(65,83))
            elif move=='echofoot':
                if rev=='R2' and beat=='settle': art=ImageOps.mirror(art)
                stamp(scene,art,(65,79),(109,65))
            elif move=='cadence': stamp(scene,art,(94,70),(62,80))
            else: stamp(scene,art,(94,70),(65,78))
            im.alpha_composite(scene,(x,y+61))
        captions={
          'saintstrike':'Foe contact → fine thread → healed ally',
          'communion':'Two allies share the same quiet gold glow',
          'saintarc':'Front-row sweep / one contact per struck foe',
          'vowstrike':'Heavy contact + abstract vow seal on foe',
          'sharewound':'Caster light divides toward the linked ally',
          'lastlight':'One brief foe burst → fading ally threads',
          'cadence':'Cooldown restored on one ally / no damage',
          'duet':'Two ribbons connect caster and one ally',
          'rounddance':'Five ally anchors inside one petal circle',
          'deepbeat':'Low foot pulse / leave faces and HP clear',
          'echofoot':'Step echoes travel → one small foe impact',
          'closingstep':'Flourish blooms on caster / no damage'}
        d.text((12,y+219),captions[move],font=font(11),fill='#c6d1e3')
    d.text((16,1624),'Art direction only. Existing event timing is authoritative.',font=font(10),fill='#94a4bf')
    im.convert('RGB').save(ROOT/family/f'storyboard-{rev}-390.png')

def main():
    manifest={'format':'RGBA PNG; straight alpha; sRGB','note':'Original generated paintings. Mechanical grid crop, fit and padding only. Pivots are art anchors, not battle coordinates.','sources':{},'layers':[]}
    for family,moves in MOVES.items():
        for rev in ['R1','R2']:
            source=ROOT/family/'source'/f'{rev}.png'
            sheet=Image.open(source).convert('RGBA'); w,h=sheet.size
            manifest['sources'][f'{family}/{rev}']={'file':str(source.relative_to(ROOT)),'size':[w,h],'sha256':sha(source)}
            out=ROOT/family/rev; out.mkdir(exist_ok=True)
            for row,move in enumerate(moves):
                for col,beat in enumerate(BEATS):
                    rect=[round(col*w/3),round(row*h/6),round((col+1)*w/3),round((row+1)*h/6)]
                    crop=sheet.crop(rect); bbox=crop.getchannel('A').getbbox()
                    assert bbox, (move,beat,'empty source cell')
                    crop=crop.crop(bbox); crop.thumbnail((240,240),Image.Resampling.LANCZOS)
                    layer=Image.new('RGBA',(256,256)); layer.alpha_composite(crop,((256-crop.width)//2,(256-crop.height)//2))
                    path=out/f'{move}_{beat}.png'; layer.save(path)
                    bounds=layer.getchannel('A').getbbox()
                    assert bounds[0]>=8 and bounds[1]>=8 and bounds[2]<=248 and bounds[3]<=248
                    amin,amax=layer.getchannel('A').getextrema()
                    assert amin==0 and amax>=128, (move,beat,'missing visible core')
                    pivot=[.5,.76] if move in ['rounddance','deepbeat','echofoot','closingstep'] and beat!='prepare' else [.5,.5]
                    manifest['layers'].append({'family':family,'revision':rev,'move':move,'beat':beat,'file':str(path.relative_to(ROOT)),'source':str(source.relative_to(ROOT)),'source_rect':rect,'size':[256,256],'pivot':pivot,'anchor':ANCHORS[move][col],'phase_fraction':[[0,.25],[.25,.65],[.65,1]][col],'alpha_bbox':bounds,'sha256':sha(path)})
            board(family,rev,manifest['layers'])
    (ROOT/'layers.json').write_text(json.dumps(manifest,indent=2)+'\n')
    paths=sorted(p for p in ROOT.rglob('*') if p.is_file() and p.name!='SHA256SUMS')
    (ROOT/'SHA256SUMS').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in paths))
    print(f'Validated {len(manifest["layers"])} transparent 256px layers, four 390px boards, sources and hashes.')

if __name__=='__main__': main()
