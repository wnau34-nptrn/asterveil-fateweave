"""Deterministic delivery sizing, packing and preview; does not generate artwork."""
from pathlib import Path
import json, math
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).parent
spec = json.loads((ROOT / 'prompts.json').read_text(encoding='utf-8'))
sources = json.loads((ROOT / 'sources.json').read_text(encoding='utf-8'))
atlas = Image.new('RGBA', (1536, 1280))
mapping = {}
for i, skill in enumerate(spec['skills']):
    sid = skill['id']
    im = Image.open(sources[sid]).convert('RGBA')
    assert im.getextrema()[3][0] == 0, f'{sid}: no transparency'
    box = im.getbbox()
    assert box
    im = im.crop(box)
    # Fit actual alpha coverage rather than the empty bounding-box corners.
    a=im.getchannel('A')
    cx,cy=(im.width-1)/2,(im.height-1)/2
    radius=max(math.hypot(x-cx,y-cy) for y in range(im.height) for x in range(im.width) if a.getpixel((x,y)))
    scale = 96 / radius
    size = tuple(max(1, round(n * scale)) for n in im.size)
    im = im.resize(size, Image.Resampling.LANCZOS)
    cell = Image.new('RGBA', (256,256))
    cell.alpha_composite(im, ((256-im.width)//2,(256-im.height)//2))
    cell.save(ROOT / 'png' / f'{sid}.png')
    col, row = i % 6, i // 6
    atlas.alpha_composite(cell,(col*256,row*256))
    mapping[sid] = dict(index=i,column=col,row=row,x=col*256,y=row*256,width=256,height=256)
atlas.save(ROOT / 'skills_atlas.webp', lossless=True, exact=True)
(ROOT/'skills_atlas.json').write_text(json.dumps(dict(image='skills_atlas.webp',width=1536,height=1280,cellWidth=256,cellHeight=256,columns=6,rows=5,order=[s['id'] for s in spec['skills']],frames=mapping),indent=2)+'\n',encoding='utf-8')
navy=(11,23,48,255)
preview=Image.new('RGBA',(1280,1320),navy)
d=ImageDraw.Draw(preview)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',12)
d.text((20,14),'ASTER VEIL / FATEWEAVE — SKILL ICON REVIEW',font=font,fill='#e5e9f1')
d.text((20,38),'Each class row: 3 skills · normal / cooldown pairs at native 40, 56 and 72 px. Navy #0b1730.',font=small,fill='#a7b8d3')
for group in range(10):
    y=80+group*122
    d.text((16,y),spec['skills'][group*3]['class'],font=font,fill='#e5e9f1')
    x=126
    for n in (40,56,72):
        for k in range(3):
            sid=spec['skills'][group*3+k]['id']
            icon=Image.open(ROOT/'png'/f'{sid}.png').resize((n,n),Image.Resampling.LANCZOS)
            for cooldown in (False,True):
                tile=Image.new('RGBA',(n,n),navy)
                tile.alpha_composite(icon)
                if cooldown:
                    mask=Image.new('RGBA',(n,n)); md=ImageDraw.Draw(mask)
                    md.ellipse((0,0,n-1,n-1),fill=(0,0,0,155))
                    tile=Image.alpha_composite(tile,mask)
                preview.alpha_composite(tile,(x,y+20))
                x+=n+3
            d.text((x-2*n-6,y+n+24),sid,font=small,fill='#a7b8d3')
        x+=12
preview.convert('RGB').save(ROOT/'preview.png')
# Validate final decoded atlas against all cells, and alpha safe-circle geometry.
decoded=Image.open(ROOT/'skills_atlas.webp').convert('RGBA')
for sid,f in mapping.items():
    im=Image.open(ROOT/'png'/f'{sid}.png').convert('RGBA')
    assert im.size==(256,256)
    assert decoded.crop((f['x'],f['y'],f['x']+256,f['y']+256)).tobytes()==im.tobytes()
    alpha=im.getchannel('A')
    for yy in range(256):
        for xx in range(256):
            if alpha.getpixel((xx,yy)):
                assert math.hypot(xx-127.5,yy-127.5)<=100, sid
assert len(mapping)==30
print('PASS: 30 RGBA PNGs; 256px; transparent 200px safe circles; exact lossless atlas roundtrip; ordered mappings; preview generated.')
