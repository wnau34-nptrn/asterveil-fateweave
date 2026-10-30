"""Rebuild lossless layers, placement boards and validation; Python 3 + Pillow.

Run from any directory. Source PNGs are retained image-generation originals.
Only crop, proportional resize and transparent padding are applied to art.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import json

ROOT = Path(__file__).resolve().parent
BEATS = ['prepare', 'peak', 'settle']
BG = '#1a2447'
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def write(name, data):
    (ROOT/name).write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n')

def fade(i, opacity=.7):
    i = i.copy()
    i.putalpha(i.getchannel('A').point(lambda a: round(a*opacity)))
    return i

def effect(board, layer, x, y, width=None, opacity=.7):
    w = width or layer['suggested_canvas_width_at_390']
    i = Image.open(ROOT/layer['file']).convert('RGBA').resize((w,w), Image.Resampling.LANCZOS)
    board.alpha_composite(fade(i,opacity), (round(x-layer['pivot'][0]*w), round(y-layer['pivot'][1]*w)))

def actor(board, name, x, foot, width=111):
    i = Image.open(ROOT/'references'/f'{name}.png').convert('RGBA').resize((width,width),Image.Resampling.LANCZOS)
    board.alpha_composite(i,(round(x-width/2),round(foot-width*497/512)))

def build():
    config = json.loads((ROOT/'layout.json').read_text())
    layers=[]
    sources=[]
    for move,c in config.items():
        p=ROOT/'source'/f'{move}.png'
        source=Image.open(p).convert('RGBA'); source.load()
        sources.append({'file':str(p.relative_to(ROOT)), 'sha256':sha(p),'size':list(source.size)})
        cell=source.width//3
        rects=c.get('source_rects', [[n*cell,0,(n+1)*cell,source.height] for n in range(3)])
        # One scale across all three beats, never fit each beat separately.
        scale=min(232/max(r[2]-r[0] for r in rects),232/max(r[3]-r[1] for r in rects))
        for n,beat in enumerate(BEATS):
            rect=rects[n]
            rw,rh=rect[2]-rect[0],rect[3]-rect[1]
            dims=(round(rw*scale),round(rh*scale))
            offset=((256-dims[0])//2,(256-dims[1])//2)
            crop=source.crop(rect).resize(dims,Image.Resampling.LANCZOS)
            out=Image.new('RGBA',(256,256));out.alpha_composite(crop,offset)
            target=ROOT/c['family']/'R3'/f'{move}-{beat}.png'
            target.parent.mkdir(parents=True,exist_ok=True);out.save(target)
            pivot=c['pivots'][n]
            pivot=[round((offset[0]+pivot[0]*rw*scale)/256,6),round((offset[1]+pivot[1]*rh*scale)/256,6)]
            bounds=out.getchannel('A').getbbox()
            assert bounds and min(bounds[:2])>=8 and max(bounds[2:])<=248
            layers.append({'move':move,'beat':beat,'variant':'R3','file':str(target.relative_to(ROOT)),
                'source':str(p.relative_to(ROOT)),'source_rect':rect,'source_size':list(source.size),
                'sha256':sha(target),'size':[256,256],'alpha_bounds':list(bounds),'pivot':pivot,
                'source_anchor':[round(rect[0]+c['pivots'][n][0]*rw),round(rect[1]+c['pivots'][n][1]*rh)],
                'anchor':c['anchors'][n],'suggested_canvas_width_at_390':c['widths'][n],
                'suggested_time_ms':c['times'][n:n+2],'blend':'normal','z_order':c['z_order']})
    write('layers.json',{'schema':'art-vfx-three-beat-v1','batch':'ART-VFX-SONG-SHADOW-002','family':'song-shadow',
        'frame_size':[256,256],'alpha':'straight','padding_min_px':8,
        'coordinates':'normalized canvas pivots, not battle coordinates',
        'timing':'Keep previous three beat ranges and existing runtime stageTiming; no duration changes.',
        'sources':sources,'moves':config,'layers':layers})
    # Every layer compared at exactly 100px canvas width, normal alpha .7.
    h=58+len(layers)*130
    comparison=Image.new('RGBA',(390,h),BG);d=ImageDraw.Draw(comparison)
    d.text((10,8),'Previous R2 song / R1 shadow     R3',font=FONT,fill='white')
    d.text((10,25),'100px canvas | alpha .7 | #1a2447',font=FONT,fill='white')
    for n,l in enumerate(layers):
        y=58+n*130
        oldmove='finale' if l['move'].startswith('finale-') else l['move']
        old=Image.open(ROOT/'references'/f'{oldmove}-{l["beat"]}.png').convert('RGBA').resize((100,100),Image.Resampling.LANCZOS)
        new=Image.open(ROOT/l['file']).resize((100,100),Image.Resampling.LANCZOS)
        comparison.alpha_composite(fade(old),(43,y+20));comparison.alpha_composite(fade(new),(238,y+20))
        d.text((10,y),f'{l["move"]} / {l["beat"]}',font=FONT,fill='white')
    comparison.convert('RGB').save(ROOT/'comparison-100px.png')
    (ROOT/'review').mkdir(exist_ok=True)
    for n,move in enumerate(config):
        panel=Image.new('RGB',(390,448),BG)
        panel.paste(comparison.crop((0,0,390,58)).convert('RGB'),(0,0))
        panel.paste(comparison.crop((0,58+n*390,390,58+(n+1)*390)).convert('RGB'),(0,58))
        panel.save(ROOT/'review'/f'{move}-comparison-100px.png')
    # Exactly 390px art placement diagram: real seed sprites, 111px slots.
    board=Image.new('RGBA',(390,55+len(config)*480),BG);d=ImageDraw.Draw(board)
    d.text((10,8),'R3 placement storyboard | 390px | alpha .7',font=FONT,fill='white')
    d.text((10,25),'Art simulation, not runtime or motion approval',font=FONT,fill='white')
    for n,(move,c) in enumerate(config.items()):
        top=55+n*480
        for b,beat in enumerate(BEATS):
            l=next(l for l in layers if l['move']==move and l['beat']==beat)
            row=top+b*160; foot=row+145
            d.text((10,row+2),f'{move} / {beat}  {l["suggested_time_ms"]} ms',font=FONT,fill='white')
            # Buff recipient is a different actor at x=285; Lio is x=90.
            receiver=move=='solo' or move.startswith('finale-') or (move=='valor' and beat=='settle')
            floor=move in ['valor','solo','evade']
            x=285 if receiver else 90
            if not floor and beat=='prepare':x=118
            if move=='dread' and beat=='settle':x=332
            if move=='finale' and beat=='settle':x=285
            if beat=='peak' and move in ['dread','finale']:x=195
            y=foot if floor else foot-38
            if floor:effect(board,l,x,y)
            actor(board,'sefa' if move=='evade' else 'lio',90,foot)
            actor(board,'enemy' if move in ['dread','finale'] else 'ally',285,foot)
            if not floor:effect(board,l,x,y)
            # HP/face labels are added in open space; art is not masked to fake clearance.
            d.text((65,row+20),'Sefa' if move=='evade' else 'Lio',font=FONT,fill='white')
            d.text((255,row+20),'Enemy' if move in ['dread','finale'] else 'Ally',font=FONT,fill='white')
    board.convert('RGB').save(ROOT/'storyboard-390.png')
    for n,move in enumerate(config):
        panel=Image.new('RGB',(390,535),BG)
        panel.paste(board.crop((0,0,390,55)).convert('RGB'),(0,0))
        panel.paste(board.crop((0,55+n*480,390,55+(n+1)*480)).convert('RGB'),(0,55))
        panel.save(ROOT/'review'/f'{move}-storyboard-390.png')
    files={}
    for p in sorted(ROOT.rglob('*')):
        if p.is_file() and p.name not in ['validation.json','SHA256SUMS']:
            item={'sha256':sha(p),'bytes':p.stat().st_size}
            if p.suffix=='.png':
                with Image.open(p) as i:i.load();item.update(size=list(i.size),mode=i.mode)
            files[str(p.relative_to(ROOT))]=item
    write('validation.json',{'batch':'ART-VFX-SONG-SHADOW-002','files':files,
        'checks':{'layers':len(layers),'RGBA_256':True,'transparent_padding_min_px':8,
        'comparison_canvas_px':100,'comparison_alpha':.7,'storyboard_width':390},
        'approval':'Pending owner artwork selection and actual runtime motion review.'})
    (ROOT/'SHA256SUMS').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in sorted(ROOT.rglob('*')) if p.is_file() and p.name!='SHA256SUMS'))

if __name__=='__main__':build()
