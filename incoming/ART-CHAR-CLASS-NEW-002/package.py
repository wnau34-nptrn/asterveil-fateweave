#!/usr/bin/env python3
"""Rebuild standalone cells and review sheets; never writes outside this package.

Pillow only. Unit normalization uses rigid rotation, uniform scaling and translation.
No anatomy warping, repainting, per-part scaling or atlas repacking.
"""
from pathlib import Path
import hashlib
import json
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
IDS = ('kael', 'wynne', 'astrid')
SKILLS = {
    'kael': ['gatherfist', 'releasefist', 'flowfist', 'circlefist', 'storedfist', 'perfectfist'],
    'wynne': ['threadhex', 'lifetoll', 'wovenhex', 'longthread', 'tollring', 'knothex'],
    'astrid': ['deflectfate', 'turncycle', 'crossing', 'doubledial', 'starneedle', 'readorbit'],
}
# Hand-inspected source landmarks (x,y), hair crown and chin tip.
# Hood is deliberately excluded from Wynne's head measurement.
SPECS = {
    'kael': dict(source='kael_fix5', hair=(583, 42), chin=(700, 460), height=450),
    'wynne': dict(source='wynne_fix5', hair=(714, 96), chin=(753, 493), height=440),
    'astrid': dict(source='astrid_fix2', hair=(644, 25), chin=(701, 441), height=450),
}
NAVY = '#101b30'
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)

def load(path):
    with Image.open(path) as im:
        im.load()
        return im.convert('RGBA')

def clean(im, threshold=40):
    """Remove generator's nearly transparent dust, retain antialiasing above threshold."""
    im = im.copy()
    a = im.getchannel('A').point(lambda v: v if v > threshold else 0)
    im.putalpha(a)
    return im

def bbox(im, threshold=40):
    return im.getchannel('A').point(lambda v: 255 if v > threshold else 0).getbbox()

def save(im, relative):
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, compress_level=9)

def contact(im):
    a = im.getchannel('A')
    columns = [x for x in range(im.width) if a.getpixel((x, 496)) > 40]
    runs = []
    for x in columns:
        if not runs or x > runs[-1][-1] + 1:
            runs.append([x])
        else:
            runs[-1].append(x)
    return dict(columns=columns, runs=[[r[0], r[-1]] for r in runs])

def rotated_point(point, size, angle):
    x, y = point
    cx, cy = size[0] / 2, size[1] / 2
    a = math.radians(angle)
    return (cx + (x-cx)*math.cos(a) + (y-cy)*math.sin(a),
            cy - (x-cx)*math.sin(a) + (y-cy)*math.cos(a))

def unit(name):
    spec = SPECS[name]
    original = clean(load(ROOT / 'sources' / (spec['source'] + '.png')))
    candidates = []
    # Rigid levelling only, under two degrees. Try whole-cell results to avoid
    # claiming two-foot contact from padding or a one-pixel painted extension.
    for step in sorted(range(-80, 81), key=abs):
        angle = step / 50
        rotated = original.rotate(angle, Image.Resampling.BICUBIC)
        bounds = bbox(rotated)
        hair = rotated_point(spec['hair'], original.size, angle)
        chin = rotated_point(spec['chin'], original.size, angle)
        if name != 'wynne':
            hair = (hair[0], bounds[1])
        scale = spec['height'] / (bounds[3] - 1 - hair[1])
        size = tuple(round(v * scale) for v in original.size)
        small = clean(rotated.resize(size, Image.Resampling.LANCZOS))
        b = bbox(small)
        xoff = round(256 - (b[0] + b[2]) / 2)
        yoff = 497 - b[3]
        out = Image.new('RGBA', (512, 512))
        out.alpha_composite(small, (xoff, yoff))
        feet = contact(out)
        runs = [r for r in feet['runs'] if r[1]-r[0] >= 2]
        if len(runs) >= 2 and runs[-1][0] - runs[0][1] > 20:
            candidates.append((abs(angle), out, angle, scale, xoff, yoff, hair, chin))
            break
    if not candidates:
        raise ValueError(f'{name}: no rigid registration with both feet at y496')
    _, out, angle, scale, xoff, yoff, hair, chin = min(candidates, key=lambda c:c[0])
    save(out, f'unit/{name}.png')
    sy = lambda p: round(p[1] * scale + yoff)
    hair_y, chin_y = sy(hair), sy(chin)
    head, body = chin_y-hair_y+1, 497-hair_y
    return dict(source=f"sources/{spec['source']}.png", source_landmarks={
        'hair':spec['hair'], 'chin':spec['chin']},
        measurement_method='Human inspected hair-crown and chin-tip landmarks, transformed by rigid rotation and uniform scale; inclusive pixel extents (chin-crown+1 and sole-crown+1); hood excluded.',
        rotation_degrees=angle, uniform_scale=scale, translation=[xoff,yoff],
        hair_top_y=hair_y, chin_y=chin_y, measured_head_height=head,
        body_height=body, head_body_ratio=round(head/body,6),
        bounds=bbox(out), foot_contact_y496=contact(out),
        runtime_pivot=[0.5,497/512])

def cells():
    portraits = load(ROOT / 'sources/portraits.png')
    gear = load(ROOT / 'sources/gear.png')
    for col, name in enumerate(IDS):
        w = portraits.width // 3
        save(portraits.crop((col*w,0,(col+1)*w,portraits.height)).resize((512,512),Image.Resampling.LANCZOS), f'portrait/{name}.png')
        w = gear.width // 3
        item = clean(gear.crop((col*w,0,(col+1)*w,gear.height)))
        item = item.crop(bbox(item))
        item.thumbnail((112,112), Image.Resampling.LANCZOS)
        out = Image.new('RGBA',(128,128))
        out.alpha_composite(item,((128-item.width)//2,(128-item.height)//2))
        save(out,f'weapon/{name}.png')
        icons = load(ROOT / f'sources/{name}_icons.png')
        for i, skill in enumerate(SKILLS[name]):
            x,y = i%3*512,i//3*512
            tile = icons.crop((x,y,x+512,y+512))
            if skill == 'perfectfist':
                tile = load(ROOT / 'sources/perfectfist_fix.png')
            save(tile.resize((256,256),Image.Resampling.LANCZOS),f'icons/{skill}.png')

def reviews(anatomy):
    allies=[('Aegis','units',0),('Lyra','units',1),('Eira','units',2),('Seren','units',3),
            ('Garran','units_mercs',0),('Mira','units_mercs',1),('Toma','units_mercs',2),
            ('Sefa','units_mercs',3),('Brann','units_mercs',4),('Lio','units_mercs',5),
            ('Corin','units_mercs',6),('Cerise','units_mercs',8)]
    figures=[]
    for label,sheet,frame in allies:
        atlas=load(REPO/f'public/assets/art/{sheet}.webp')
        x,y=frame%2*512,frame//2*512
        figures.append((label,atlas.crop((x,y,x+512,y+512))))
    figures += [(n.title(),load(ROOT/f'unit/{n}.png')) for n in IDS]
    # Three groups, each 5 allies at exactly 115x115 logical cells.
    forest=load(REPO/'public/assets/art/battle_forest.webp')
    sheet=Image.new('RGBA',(700,1040),NAVY)
    d=ImageDraw.Draw(sheet)
    d.text((14,10),'15 allies | 115px cells | same scale | reference: Garran',font=FONT,fill='white')
    for group in range(3):
        y0=40+group*330
        bg=forest.resize((700,150),Image.Resampling.LANCZOS)
        sheet.alpha_composite(bg,(0,y0))
        for col in range(5):
            label,im=figures[group*5+col]
            x=col*138+12
            small=im.resize((115,115),Image.Resampling.LANCZOS)
            sheet.alpha_composite(small,(x,y0+20))
            silhouette=Image.new('RGBA',(115,115),'black')
            silhouette.putalpha(small.getchannel('A'))
            panel=Image.new('RGBA',(124,125),'#9baab6')
            panel.alpha_composite(silhouette,(4,4))
            sheet.alpha_composite(panel,(x-4,y0+175))
            d.text((x,y0+142),label,font=FONT,fill='white')
        # Garran hair top and chin manually inspected at atlas cell y66/y198.
        for row,color in [(66,'#6ee7ff'),(198,'#ffce70')]:
            gy=y0+20+round(row*115/512)
            d.line((0,gy,699,gy),fill=color,width=1)
    d.text((14,1020),'Cyan: Garran hair top | gold: chin. Silhouettes below each group.',font=FONT,fill='white')
    save(sheet,'review/lineup.png')
    p=Image.new('RGBA',(390,180),NAVY);d=ImageDraw.Draw(p)
    d.text((12,10),'Portraits at native 40px (enlargement below)',font=FONT,fill='white')
    for i,n in enumerate(IDS):
        tile=load(ROOT/f'portrait/{n}.png').resize((40,40),Image.Resampling.LANCZOS)
        p.alpha_composite(tile,(20+i*125,35))
        p.alpha_composite(tile.resize((80,80),Image.Resampling.NEAREST),(20+i*125,90))
        d.text((65+i*125,45),n.title(),font=FONT,fill='white')
    save(p,'review/portraits-40.png')
    p=Image.new('RGBA',(690,270),NAVY);d=ImageDraw.Draw(p)
    for row,n in enumerate(IDS):
        for col,skill in enumerate(SKILLS[n]):
            p.alpha_composite(load(ROOT/f'icons/{skill}.png').resize((44,44),Image.Resampling.LANCZOS),(col*114+30,row*85+12))
            d.text((col*114+6,row*85+61),skill,font=FONT,fill='white')
    save(p,'review/icons-44.png')
    p=Image.new('RGBA',(1536,550),NAVY);d=ImageDraw.Draw(p)
    for i,n in enumerate(IDS):
        p.alpha_composite(load(ROOT/f'unit/{n}.png'),(i*512,25))
        a=anatomy[n]
        for y,c in [(a['hair_top_y'],'cyan'),(a['chin_y'],'gold'),(496,'#ff70a0')]:
            d.line((i*512,y+25,(i+1)*512-1,y+25),fill=c)
        d.text((i*512+10,5),f"{n}: head {a['measured_head_height']} body {a['body_height']} ratio {a['head_body_ratio']}",font=FONT,fill='white')
    save(p,'review/anatomy.png')

def manifests(anatomy):
    files={}
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name in ('validation.json','SHA256SUMS') or '__pycache__' in p.parts:
            continue
        data=p.read_bytes();entry=dict(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
        if p.suffix=='.png':
            with Image.open(p) as im:
                im.verify()
            im=load(p)
            entry.update(decode=True,size=list(im.size),mode=im.mode,alpha_extrema=im.getchannel('A').getextrema(),bounds=bbox(im))
        files[str(p.relative_to(ROOT))]=entry
    checks={n:dict(head=145<=a['measured_head_height']<=165,
        body=440<=a['body_height']<=460,ratio=.32<=a['head_body_ratio']<=.36,
        bounds=a['bounds'][1]>=37 and a['bounds'][2]-a['bounds'][0]<=480 and a['bounds'][3]-a['bounds'][1]<=460,
        both_feet=len(a['foot_contact_y496']['runs'])>=2) for n,a in anatomy.items()}
    delivery_checks={}
    for folder,size,names in [('unit',512,IDS),('portrait',512,IDS),('weapon',128,IDS),
                              ('icons',256,[s for skills in SKILLS.values() for s in skills])]:
        delivery_checks[folder+'_count']=len(list((ROOT/folder).glob('*.png')))==len(names)
        for name in names:
            im=load(ROOT/folder/(name+'.png'))
            delivery_checks[f'{folder}/{name}:dimensions']=im.size==(size,size)
            if folder in ('unit','weapon'):
                delivery_checks[f'{folder}/{name}:real_alpha']=im.getchannel('A').getextrema()==(0,255)
            if folder=='weapon':
                b=bbox(im)
                delivery_checks[f'{folder}/{name}:extent']=max(b[2]-b[0],b[3]-b[1])<=112
    payload=dict(package='ART-CHAR-CLASS-NEW-002',base_commit='a748ce1d3753db2253772ee9f0678f7d5926f6be',
        owner_visual_approval='pending',runtime_integrated=False,anatomy=anatomy,checks=checks,
        delivery_checks=delivery_checks,
        all_technical_checks_pass=all(all(c.values()) for c in checks.values()) and all(delivery_checks.values()),files=files)
    (ROOT/'validation.json').write_text(json.dumps(payload,indent=2)+'\n')
    paths=[p for p in sorted(ROOT.rglob('*')) if p.is_file() and p.name!='SHA256SUMS' and '__pycache__' not in p.parts]
    (ROOT/'SHA256SUMS').write_text(''.join(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT)}\n" for p in paths))
    print(json.dumps(checks,indent=2))
    if not payload['all_technical_checks_pass']:
        raise SystemExit('Technical gates failed; do not present this as accepted')

if __name__=='__main__':
    anatomy={n:unit(n) for n in IDS}
    cells()
    reviews(anatomy)
    manifests(anatomy)
