"""Mechanical extraction/composition only. Python 3 + Pillow 12.3.0.

Run this file to rebuild. --verify validates files; --git-ref REF reads the
actual fetched Git blobs (not the working tree) and fully decodes every PNG.
No generative painting, recolouring, keying, alpha replacement or runtime code.
"""
from pathlib import Path
from io import BytesIO
import argparse
import hashlib
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps, __version__ as PILLOW

ROOT = Path(__file__).resolve().parent
PREFIX = 'incoming/ART-VFX-BOSS-SIGNATURE-001/'
BEATS = ('prepare', 'peak', 'settle')
BASE = '5e9e65026b8949f7877db12a2e70496fe2aac77b'

# Manually inspected source separators; row/column sizes returned by the
# generator are not assumed to be the requested size. Very faint source fringe
# can reach separators; delivered layers get fresh 12px transparent padding.
MATR = [(0,324,324,647), (324,648,316,657), (648,969,324,661),
        (969,1270,325,697), (1270,1619,309,690)]
SENT = [(0,324,324,647), (324,599,314,672), (599,946,317,709)]


def row_rects(name, row):
    if name in ('thorn-bloom','thorn-storm','thorn-tempest','thorn-rage','rift-wave','rift-cataclysm'):
        w,h=Image.open(ROOT/'source'/f'{name}.png').size
        # Generator enlarged peak motifs; use inspected clear gaps rather
        # than assuming exact equal-width columns.
        cuts={'thorn-bloom':(704,1468),'thorn-storm':(738,1494),
              'thorn-tempest':(746,1575),'thorn-rage':(592,1456),
              'rift-wave':(665,1560),'rift-cataclysm':(724,1448)}
        xs=(0,*cuts[name],w)
        rects=[(xs[c],0,xs[c+1],h) for c in range(3)]
        if name=='rift-wave':
            # Shared separator column has no visible paint; include it on
            # both neighboring crops to retain the complete last wave tip.
            rects[1]=(665,0,1561,h)
        return rects
    if name == 'matriarch':
        y0,y1,x1,x2 = MATR[row]
        return [(0,y0,x1,y1), (x1,y0,x2,y1), (x2,y0,971,y1)]
    if name == 'sentinel':
        y0,y1,x1,x2 = SENT[row]
        rects = [(0,y0,x1,y1), (x1,y0,x2,y1), (x2,y0,971,y1)]
        # Independent loose shards must remain in their own move's cell.
        if row == 1:
            rects[0] = (0,324,314,628)
            rects[2] = (672,324,971,646)
        if row == 2:
            rects[0] = (0,628,317,946)
            rects[2] = (709,646,971,946)
        return rects
    xs = (0,512,1071,1536) if name == 'beasts' and row == 1 else (0,512,1024,1536)
    return [(xs[c],row*512,xs[c+1],(row+1)*512) for c in range(3)]


def move(key, title, caster, source, row, route, unstoppable=False, phase=False):
    return dict(id=key, name=title, caster=caster, source=source, row=row,
                route=route, unstoppable=unstoppable, phase_change=phase)


MOVES = [
    move('gather-thorns','Gather Thorns','matriarch','matriarch',0,'charge'),
    move('thorn-bloom','Thorn Bloom','matriarch','thorn-bloom',0,'single'),
    move('thorn-storm','Thorn Storm','matriarch','thorn-storm',0,'single',True),
    move('thorn-tempest','Thorn Tempest','matriarch','thorn-tempest',0,'all',True),
    move('thorn-rage','Thorn Rage','matriarch','thorn-rage',0,'caster',phase=True),
    move('rift-gathering','Rift Gathering','sentinel','sentinel',0,'charge'),
    move('rift-wave','Rift Wave','sentinel','rift-wave',0,'all'),
    move('rift-cataclysm','Rift Cataclysm','sentinel','rift-cataclysm',0,'single',True),
    move('rift-awakening','Rift Awakening','sentinel','sentinel-phases',0,'caster',phase=True),
    move('call-the-rift','Call the Rift','sentinel','sentinel-phases',1,'summon'),
    move('war-cry','War Cry','captain','captain',0,'single',True),
    move('call-the-hunt','Call the Hunt','captain','captain',1,'summon'),
    move('horn-charge','Horn Charge','juggernaut','beasts',0,'single'),
    move('stampede','Stampede','tusker','beasts',1,'single'),
]


def dump(name, value):
    (ROOT/name).write_text(json.dumps(value,indent=2)+'\n')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def font(size=12):
    return ImageFont.load_default(size=size)


def extract(src, rect):
    piece = src.crop(rect)
    alpha=piece.getchannel('A');w,h=piece.size
    for edge in ((0,0,w,1),(0,h-1,w,h),(0,0,1,h),(w-1,0,w,h)):
        assert not sum(alpha.crop(edge).histogram()[41:]), ('visible source paint touches crop edge',rect,edge)
    bbox = piece.getchannel('A').getbbox()
    assert bbox, rect
    piece = piece.crop(bbox)
    scale = min(232/piece.width,232/piece.height)
    size = (max(1,round(piece.width*scale)),max(1,round(piece.height*scale)))
    piece = piece.resize(size,Image.Resampling.LANCZOS)
    out = Image.new('RGBA',(256,256))
    offset = ((256-size[0])//2,(256-size[1])//2)
    out.alpha_composite(piece,offset)
    return out, dict(source_alpha_bbox=list(bbox),scale=scale,offset=list(offset),resized=list(size))


def paste(canvas, im, width, anchor, pivot=(.5,.5)):
    size = round(width)
    canvas.alpha_composite(im.resize((size,size),Image.Resampling.LANCZOS),
                          (round(anchor[0]-size*pivot[0]),round(anchor[1]-size*pivot[1])))


def sprite(canvas, name, x, y, size, shields):
    im=Image.open(ROOT/'seeds'/f'{name}.png').convert('RGBA')
    canvas.alpha_composite(im.resize((size,size),Image.Resampling.LANCZOS),(x,y))
    d=ImageDraw.Draw(canvas)
    label=(x+6,y-13,x+size-6,y-2)
    d.rounded_rectangle(label,radius=3,fill='#112031',outline='#adc5d1')
    d.rectangle((x+8,y-10,x+size-8,y-5),fill='#69baa7')
    shields.append(label)
    # Conservative head regions measured on these read-only reference sprites.
    # Beasts' heads sit forward/lower. This masking is disclosed in NOTES.
    if name in ('juggernaut','tusker'):
        box=(x,y+size*.25,x+size*.5,y+size*.68)
    elif name=='gold-hero':
        box=(x+size*.38,y+size*.02,x+size*.76,y+size*.40)
    elif name=='matriarch':
        box=(x+size*.3,y+size*.02,x+size*.58,y+size*.4)
    else:
        box=(x+size*.25,y+size*.02,x+size*.64,y+size*.4)
    shields.append(tuple(round(v) for v in box))


def safe_composite(board, fx, shields):
    before=sum(fx.getchannel('A').histogram()[1:])
    d=ImageDraw.Draw(fx)
    for box in shields:
        d.rectangle(box,fill=(0,0,0,0))
    for box in shields:
        assert not fx.getchannel('A').crop(box).getbbox()
    board.alpha_composite(fx)
    return before-sum(fx.getchannel('A').histogram()[1:])


def storyboard(m, images):
    board=Image.new('RGBA',(390,904),'#0b1425')
    d=ImageDraw.Draw(board)
    d.text((14,12),m['name'],font=font(20),fill='#f8ebd7')
    flags=('UNSTOPPABLE / ' if m['unstoppable'] else '')+m['route'].upper()
    d.text((14,39),flags+' | final artwork',font=font(12),fill='#b7b5e3')
    d.text((14,60),'Illustrative staging; normal blend; not runtime footage',font=font(11),fill='#aebccd')
    checks=[]
    for i,beat in enumerate(BEATS):
        top=86+i*270
        d=ImageDraw.Draw(board)
        d.rounded_rectangle((8,top,382,top+260),radius=10,fill='#101d30',outline='#324354')
        d.text((18,top+10),f'{i+1:02} {beat.upper()}',font=font(13),fill='#e1e8ef')
        shields=[]
        if m['route']=='all' and beat!='prepare':
            targets=[(40,top+85),(107,top+85),(174,top+85),(73,top+185),(140,top+185)]
            for x,y in targets:
                sprite(board,'gold-hero',x-27,y-28,62,shields)
        else:
            targets=[(86,top+150)]
            sprite(board,'gold-hero',28,top+76,116,shields)
        sprite(board,m['caster'],251,top+70,116,shields)
        fx=Image.new('RGBA',board.size)
        im=images[(m['id'],beat)]
        if m['id']=='stampede':
            paste(fx,im,84 if beat=='prepare' else 112,
                  (306 if beat=='prepare' else 86,top+190),pivot=(.5,210/256))
        elif beat=='prepare' or m['route'] in ('charge','caster'):
            paste(fx,im,82 if beat=='prepare' else 102,(277 if beat=='prepare' else 306,top+145))
        elif m['route']=='summon':
            # Caster-side summon cue, never a hit on an existing hero.
            paste(fx,im,97 if beat=='peak' else 61,(222,top+154))
        elif m['id']=='war-cry' and beat=='peak':
            paste(fx,im,172,(300,top+153),pivot=(226/256,.5))
        else:
            for x,y in targets:
                size=(67 if m['route']=='all' else 112) if beat=='peak' else 54
                paste(fx,im,size,(x,y+10))
        hidden=safe_composite(board,fx,shields)
        d=ImageDraw.Draw(board)
        caption='caster hold / no damage' if m['route']=='charge' else 'cue only / no damage' if m['route'] in ('caster','summon') else 'actual affected targets only'
        d.text((18,top+238),caption,font=font(11),fill='#9facbd')
        checks.append(dict(beat=beat,protected_rects=shields,masked_pixels=hidden,remaining_overlap=0))
    path=ROOT/'storyboards'/f"{m['id']}-390.png"
    board.save(path)
    return dict(file=str(path.relative_to(ROOT)),width=390,height=904,checks=checks)


def contrast_board(images, group):
    moves=[m for m in MOVES if m['caster']==group]
    board=Image.new('RGBA',(390,70+len(moves)*218),'#0b1425')
    d=ImageDraw.Draw(board)
    d.text((12,12),f'{group.upper()} / NORMAL BLEND',font=font(17),fill='#f8ebd7')
    d.text((12,38),'P / peak / S: navy above, gold armour below',font=font(11),fill='#adbed2')
    hero=Image.open(ROOT/'seeds/gold-hero.png').convert('RGBA')
    # Exact bright shield/body crop from the shipped hero, not a yellow swatch.
    armor=hero.crop((340,180,490,405)).resize((112,75),Image.Resampling.LANCZOS)
    for r,m in enumerate(moves):
        y=66+r*218;d=ImageDraw.Draw(board)
        d.text((12,y),m['name'],font=font(14),fill='#e0d7ec')
        for c,beat in enumerate(BEATS):
            x=12+c*126
            d.rounded_rectangle((x,y+24,x+112,y+103),radius=5,fill='#142139')
            board.alpha_composite(armor,(x,y+117))
            for cy in (y+64,y+154):
                paste(board,images[m['id'],beat],76,(x+56,cy))
            d=ImageDraw.Draw(board)
            d.text((x+4,y+197),beat,font=font(10),fill='#adbed2')
    path=ROOT/'storyboards'/f'contrast-{group}-390.png';board.save(path)


def telegraph_board(images):
    board=Image.new('RGBA',(390,656),'#0b1425');d=ImageDraw.Draw(board)
    d.text((12,12),'WAITING TURN / SILHOUETTE KEY',font=font(17),fill='#f7e7d2')
    d.text((12,38),'Open curves = normal | rigid teeth = unstoppable',font=font(11),fill='#b7c5d6')
    for r,(caster,normal,locked) in enumerate([
        ('matriarch','gather-thorns','thorn-tempest'),('sentinel','rift-gathering','rift-cataclysm')]):
        y=82+r*282
        for c,key in enumerate((normal,locked)):
            x=20+c*190;shields=[]
            sprite(board,caster,x+14,y+20,135,shields)
            fx=Image.new('RGBA',board.size)
            paste(fx,images[key,'prepare'],105,(x+46,y+112))
            safe_composite(board,fx,shields)
            d=ImageDraw.Draw(board)
            d.text((x,y+180),'NORMAL' if c==0 else 'UNSTOPPABLE',font=font(13),fill='#eadfe9')
            d.text((x,y+204),'soft open arc' if c==0 else 'locked double teeth',font=font(11),fill='#abbacc')
    board.save(ROOT/'storyboards/telegraphs-390.png')


def build():
    records=[];images={};sources={}
    for m in MOVES:
        srcpath=ROOT/'source'/f"{m['source']}.png"
        src=Image.open(srcpath).convert('RGBA')
        sources[srcpath.name]=dict(file=str(srcpath.relative_to(ROOT)),size=list(src.size),sha256=sha(srcpath.read_bytes()))
        for beat,rect in zip(BEATS,row_rects(m['source'],m['row'])):
            im,transform=extract(src,rect)
            flip_x=m['id']=='rift-wave' or (m['id']=='rift-cataclysm' and beat=='peak')
            if flip_x:
                im=ImageOps.mirror(im)
            transform['flip_x']=flip_x
            path=ROOT/'layers'/f"{m['id']}-{beat}.png";im.save(path)
            images[m['id'],beat]=im
            anchor='caster.forward_chest' if beat=='prepare' else 'caster.chest' if m['route'] in ('charge','caster') else 'caster.hand' if m['route']=='summon' else 'target.feet' if m['id']=='stampede' else 'target.chest'
            pivot=[128,128]
            if m['id']=='stampede':
                anchor='caster.feet' if beat=='prepare' else 'target.feet';pivot=[128,210]
            if m['id']=='war-cry' and beat=='peak':
                anchor='caster.forward_chest';pivot=[226,128]
            if m['id']=='call-the-rift' and beat!='prepare':
                anchor='summoned_slot.chest'
            if m['route']=='all' and beat!='prepare':
                anchor='whole_hero_side.actual_target_chests'
            timing=[0,140] if beat=='prepare' else [140,320] if beat=='peak' else [320,540]
            records.append(dict(file=str(path.relative_to(ROOT)),move=m['id'],beat=beat,
                source=str(srcpath.relative_to(ROOT)),source_crop=list(rect),transform=transform,
                sha256=sha(path.read_bytes()),size=[256,256],mode='RGBA',alpha='straight',
                alpha_bbox=list(im.getchannel('A').getbbox()),pivot_px=pivot,
                pivot_normalized=[p/256 for p in pivot],anchor=anchor,
                suggested_ms=timing,blend='normal',additive_intended=False,
                orientation='enemy-right / release-left',
                depth='behind actor except contact edge; mask every face and HP/name/status label',
                suggested_canvas_width_390=64 if beat=='prepare' else 104 if beat=='peak' else 54))
    boards=[storyboard(m,images) for m in MOVES]
    for group in ('matriarch','sentinel','captain','juggernaut','tusker'):
        contrast_board(images,group)
    telegraph_board(images)
    # Summary preview is already exactly 390px, never a resized wide sheet.
    Image.open(ROOT/'storyboards/telegraphs-390.png').save(ROOT/'preview-390.png')
    telegraphs=[
        dict(charge='gather-thorns',normal='layers/gather-thorns-prepare.png',
             unstoppable_release='thorn-tempest',hold='layers/thorn-tempest-prepare.png'),
        dict(charge='rift-gathering',normal='layers/rift-gathering-prepare.png',
             unstoppable_release='rift-cataclysm',hold='layers/rift-cataclysm-prepare.png')]
    for t in telegraphs:
        t.update(anchor='caster.forward_chest',pivot_px=[128,128],width_390=90,offset_from_chest_390=[-30,0],
                 lifetime='authoritative waiting turn until release, interrupt, death or intent replacement',
                 motion='normal: slow 0.85-1 opacity breathe; unstoppable: rigid double teeth, no spin; reduced motion: static',
                 selection='Use unstoppable hold when the real announced release is unstoppable. Do not imply the zero-damage charge itself is uninterruptible.')
    dump('layers.json',dict(schema=1,id='ART-VFX-BOSS-SIGNATURE-001',base_commit=BASE,
        final_versions=1,beats=list(BEATS),moves=MOVES,sources=list(sources.values()),
        layers=records,telegraphs=telegraphs,storyboards=boards,
        integration='Suggestions only: preserve authoritative events and existing presentation total duration. No gameplay rules or new charge turns. All-side = one instance per actual affected hero; no damage at charge/summon/phase cue. Captain War Cry is an offensive single-target unstoppable shout, unlike Garran ally command VFX.'))
    dump('seeds.json',dict(purpose='Read-only shipped art crops for review; not regenerated bodies or effect-generator inputs',base_commit=BASE,
        references=[dict(file=f'seeds/{name}.png',atlas='public/assets/art/units_foes.webp',cell=cell,cell_size=[512,512],mirror_for_enemy_side=name=='matriarch',sha256=sha((ROOT/'seeds'/f'{name}.png').read_bytes()))
                    for name,cell in [('matriarch',6),('sentinel',8),('captain',10),('juggernaut',7),('tusker',0)]]+
                   [dict(file='seeds/gold-hero.png',atlas='public/assets/art/units.webp',cell=0,cell_size=[512,512],sha256=sha((ROOT/'seeds/gold-hero.png').read_bytes()))]))
    entries={}
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name=='validation.json' or '__pycache__' in p.parts:
            continue
        item=dict(sha256=sha(p.read_bytes()),bytes=p.stat().st_size)
        if p.suffix=='.png':
            with Image.open(p) as im:
                im.load();item.update(size=list(im.size),mode=im.mode)
        entries[str(p.relative_to(ROOT))]=item
    dump('validation.json',dict(schema=1,pillow=PILLOW,files=entries,
        self_exclusion='A manifest cannot hash itself. --git-ref additionally compares SHA-256 of validation.json fetched bytes to local manifest bytes.',
        checks=dict(final_moves=14,final_layers=42,rgba_layers=True,transparent_border_px=12,
                    storyboard_width=390,normal_blend_contrast_review='See five contrast boards; owner artwork and motion decisions pending',
                    runtime_tested=False,owner_motion_approved=False)))
    verify()


def verify(ref=None):
    manifest=json.loads((ROOT/'validation.json').read_text());pngs=0
    def read(name):
        if ref:
            return subprocess.check_output(['git','show',f'{ref}:{PREFIX}{name}'],cwd=ROOT)
        return (ROOT/name).read_bytes()
    for name,expected in manifest['files'].items():
        data=read(name)
        assert sha(data)==expected['sha256'],name
        assert len(data)==expected['bytes'],name
        if name.endswith('.png'):
            with Image.open(BytesIO(data)) as im:
                im.verify()
            with Image.open(BytesIO(data)) as im:
                im.load();assert list(im.size)==expected['size'] and im.mode==expected['mode'],name
                if name.startswith('layers/'):
                    assert im.size==(256,256) and im.mode=='RGBA',name
                    a=im.getchannel('A');box=a.getbbox();assert box and min(box[:2])>=12 and max(box[2:])<=244,name
                    assert a.getextrema()==(0,255) or a.getextrema()[0]==0,name
                if '390.png' in name:
                    assert im.width==390,name
            pngs+=1
    if ref:
        assert sha(read('validation.json'))==sha((ROOT/'validation.json').read_bytes())
        actual=subprocess.check_output(['git','ls-tree','-r','--name-only',ref,'--',PREFIX],cwd=ROOT.parents[1]).decode().splitlines()
        expected={PREFIX+x for x in manifest['files']}|{PREFIX+'validation.json'}
        assert set(actual)==expected,(set(actual)-expected,expected-set(actual))
    print(json.dumps(dict(verified_files=len(manifest['files'])+(1 if ref else 0),decoded_pngs=pngs,git_ref=ref,manifest_sha256=sha((ROOT/'validation.json').read_bytes()))))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--verify',action='store_true');parser.add_argument('--git-ref')
    args=parser.parse_args()
    if args.verify or args.git_ref:
        verify(args.git_ref)
    else:
        build()
