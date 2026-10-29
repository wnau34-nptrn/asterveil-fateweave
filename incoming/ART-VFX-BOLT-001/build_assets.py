"""Reproducible size normalization and lossless Phaser atlas packing. Pillow required."""
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance
import json, hashlib

ROOT = Path(__file__).parent
SPEC = {'cast_thread': (2,2,256,256), 'comet_core': (2,2,128,128),
        'tapered_wake': (1,1,256,64), 'impact_petals': (4,2,256,256),
        'spark': (3,1,32,32), 'dissolve_wisps': (2,2,256,256), 'light_core':(1,1,128,128)}
frames = {}
atlas = Image.new('RGBA', (2048,2048))
x=y=rowh=0
manifest = {}
def put(name, im, pivot=(.5,.5)):
    global x,y,rowh
    w,h=im.size
    if x+w+4>2048: x=0; y+=rowh+8; rowh=0
    assert y+h+8<=2048
    x+=4
    atlas.paste(im,(x,y))
    # Extrude edge texels into a 2px gutter; transparent margins are retained.
    for d in (1,2):
        atlas.paste(im.crop((0,0,1,h)),(x-d,y))
        atlas.paste(im.crop((w-1,0,w,h)),(x+w-1+d,y))
        atlas.paste(im.crop((0,0,w,1)),(x,y-d if y>=d else 0))
        atlas.paste(im.crop((0,h-1,w,h)),(x,y+h-1+d))
    frames[name]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':False,
        'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h},
        'pivot':{'x':pivot[0],'y':pivot[1]}}
    x+=w+4; rowh=max(rowh,h)

for name,(cols,rows,w,h) in SPEC.items():
    src=Image.open(ROOT/'generated'/f'{name}.png').convert('RGBA')
    raw=[]
    for i in range(cols*rows):
        cx,cy=i%cols,i//cols
        cell=src.crop((round(cx*src.width/cols),round(cy*src.height/rows),
                       round((cx+1)*src.width/cols),round((cy+1)*src.height/rows)))
        raw.append(cell)
    # Fixed union crop for shimmer frames: preserve anchor and relative shimmer size.
    crop=None
    if name in ('comet_core','spark','tapered_wake','light_core'):
        bounds=[c.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox() for c in raw]
        bounds=[b for b in bounds if b]
        crop=(min(b[0] for b in bounds), min(b[1] for b in bounds),
              max(b[2] for b in bounds), max(b[3] for b in bounds))
    cells=[]
    for cell in raw:
        if crop: cell=cell.crop(crop)
        im=Image.new('RGBA',(w,h))
        fit=cell.resize((w-8,h-8),Image.Resampling.LANCZOS) if name=='tapered_wake' else ImageOps.contain(cell,(w-8,h-8),Image.Resampling.LANCZOS)
        im.paste(fit,((w-fit.width)//2,(h-fit.height)//2))
        cells.append(im)
    sheet=Image.new('RGBA',(w*len(cells),h))
    for i,im in enumerate(cells):
        frame=f'{name}_{i:02d}'
        im.save(ROOT/'sources'/f'{frame}.png')
        sheet.paste(im,(i*w,0))
        put(frame,im,(1,.5) if name=='tapered_wake' else (.5,.5))
    sheet.save(ROOT/'sources'/f'{name}_strip.png')
    manifest[name]={'count':len(cells),'cell':[w,h],'layout':'horizontal',
                    'frames':[f'{name}_{i:02d}' for i in range(len(cells))]}
    if name=='comet_core':
        cells[0].save(ROOT/'sources'/'comet_core.png');put('comet_core',cells[0])

atlas.save(ROOT/'bolt_fx.webp',lossless=True,exact=True,method=6)
(ROOT/'bolt_fx.json').write_text(json.dumps({'frames':frames,'meta':{'app':'ART-VFX-BOLT-001',
    'version':'1','image':'bolt_fx.webp','format':'RGBA8888','size':{'w':2048,'h':2048},
    'scale':'1','alphaMode':'straight','animations':manifest}},indent=2)+'\n')

# Battle scenery only: no generated actors or UI in previews.
bg=Image.open(ROOT.parents[1]/'public/assets/art/ruins.webp').convert('RGB')
bg=ImageOps.fit(bg,(390,844),method=Image.Resampling.LANCZOS)
def overlay(canvas,frame,xy,size):
    im=Image.open(ROOT/'sources'/f'{frame}.png')
    im=im.resize(size,Image.Resampling.LANCZOS)
    canvas.alpha_composite(im,(round(xy[0]-size[0]/2),round(xy[1]-size[1]/2)))
for mode,factor in [('dark',.38),('light',1.65)]:
    canvas=ImageEnhance.Brightness(bg).enhance(factor).convert('RGBA')
    if mode=='light': canvas=Image.blend(canvas,Image.new('RGBA',canvas.size,'#e6e3f2'),.28)
    # Separated mobile-scale phase samples, top to bottom; no timeline text baked in.
    overlay(canvas,'cast_thread_02',(105,210),(96,96))
    overlay(canvas,'tapered_wake_00',(182,370),(80,20))
    overlay(canvas,'comet_core_01',(225,370),(24,24))
    overlay(canvas,'impact_petals_03',(280,485),(88,88))
    overlay(canvas,'dissolve_wisps_01',(280,630),(88,88))
    for i in range(3): overlay(canvas,f'spark_{i:02d}',(260+i*12,580-i*13),(8,8))
    canvas.convert('RGB').save(ROOT/f'preview_{mode}.png')

decoded=Image.open(ROOT/'bolt_fx.webp').convert('RGBA')
checks=[]
for name,f in frames.items():
    r=f['frame']; im=decoded.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
    source=Image.open(ROOT/'sources'/f'{name}.png').convert('RGBA')
    assert im.tobytes()==source.tobytes(),name
    assert source.getchannel('A').getextrema()[0]==0
    checks.append({'frame':name,'size':list(source.size),'alphaRange':list(source.getchannel('A').getextrema())})
for mode in ['dark','light']: assert Image.open(ROOT/f'preview_{mode}.png').size==(390,844)
(ROOT/'validation.json').write_text(json.dumps({'atlasRoundtrip':'exact RGBA match','frames':checks,
    'previews':[390,844],'sha256':hashlib.sha256((ROOT/'bolt_fx.webp').read_bytes()).hexdigest()},indent=2)+'\n')
print(f'Validated {len(frames)} frames, lossless atlas and 390x844 previews')
