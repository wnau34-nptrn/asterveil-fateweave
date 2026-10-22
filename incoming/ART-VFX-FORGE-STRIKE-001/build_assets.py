"""Normalize original generated RGBA artwork and pack a lossless Phaser atlas. Pillow."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json, hashlib

ROOT = Path(__file__).resolve().parent
SPEC = {'hammer':(1,256,256), 'hammer_smear':(1,256,256),
        'hit_flash_a':(6,256,256),'hit_flash_b':(8,256,256),
        'shock_ring':(6,256,256),'spark_arc':(6,48,48),
        'result_glow':(6,256,128),'result_glow_cyan':(6,256,128)}
FRAMES={}
ANIMS={}
(ROOT/'sources').mkdir(exist_ok=True)

def save_layer(name,cells,pivot=(.5,.5)):
    names=[]
    w,h=cells[0].size
    strip=Image.new('RGBA',(w*len(cells),h))
    for i,im in enumerate(cells):
        key=name if name in ('hammer','hammer_smear') else f'{name}_{i:02d}'
        im.save(ROOT/'sources'/f'{key}.png')
        strip.paste(im,(i*w,0))
        FRAMES[key]=(im,pivot)
        names.append(key)
    strip.save(ROOT/'sources'/f'{name}_strip.png')
    ANIMS[name]={'count':len(cells),'cell':[w,h],'layout':'horizontal','frames':names}

for name,(count,w,h) in SPEC.items():
    src=Image.open(ROOT/'generated'/f'{name}.png').convert('RGBA')
    cells=[]
    cols,rows=(3,2) if name=='result_glow_cyan' else (count,1)
    raw=[src.crop((round((i%cols)*src.width/cols),round((i//cols)*src.height/rows),
                  round((i%cols+1)*src.width/cols),round((i//cols+1)*src.height/rows))) for i in range(count)]
    if name=='result_glow_cyan':
        # Generated peak reached the canvas edge; reuse the intact second exposure.
        raw[2]=raw[1].copy()
    bounds=[c.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox() for c in raw]
    top=min(b[1] for b in bounds if b); bottom=max(b[3] for b in bounds if b)
    for i in range(count):
        cell=raw[i].crop((0,top,raw[i].width,bottom))
        if count==1:
            bbox=cell.getchannel('A').point(lambda a:255 if a>4 else 0).getbbox()
            if bbox: cell=cell.crop(bbox)
        fit=cell.resize((w-16,h-16),Image.Resampling.LANCZOS)
        im=Image.new('RGBA',(w,h)); im.paste(fit,(8,8))
        if name=='hammer':
            # Lower painted handle end lands on the documented normalized pivot.
            fit=ImageOps.contain(cell,(236,230),Image.Resampling.LANCZOS)
            im=Image.new('RGBA',(w,h)); im.paste(fit,((w-fit.width)//2,round(.94*h)-fit.height))
        cells.append(im)
    save_layer(name,cells,(.5,.94) if name=='hammer' else (.5,.5))

# Static embers are sampled from the original painted ember sequence, no drawn replacements.
save_layer('spark',[FRAMES[f'spark_arc_{i:02d}'][0].copy() for i in (0,1,2,3)])

# Pale high-luminance cores are separate ADD overlays. Colored art remains NORMAL.
for layer in ('hit_flash_a','hit_flash_b','result_glow','result_glow_cyan'):
    cores=[]
    for key in ANIMS[layer]['frames']:
        im=FRAMES[key][0]
        core=Image.new('RGBA',im.size)
        core.putdata([(r,g,b,round(a*max(0,min(1,(min(r,g,b)-185)/65)))) for r,g,b,a in im.getdata()])
        cores.append(core)
    save_layer(layer+'_core',cores)

atlas=Image.new('RGBA',(2048,2048)); meta={}; x=y=4; rowh=0
for key,(im,pivot) in FRAMES.items():
    w,h=im.size
    if x+w+4>2048: x=4; y+=rowh+8; rowh=0
    assert y+h+4<=2048, 'Atlas overflow'
    atlas.paste(im,(x,y))
    meta[key]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':False,
               'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h},
               'pivot':{'x':pivot[0],'y':pivot[1]}}
    x+=w+8; rowh=max(rowh,h)
atlas.save(ROOT/'forge_strike_fx.webp',lossless=True,exact=True,method=6)
(ROOT/'forge_strike_fx.json').write_text(json.dumps({'frames':meta,'meta':{
    'app':'ART-VFX-FORGE-STRIKE-001','version':'1','image':'forge_strike_fx.webp',
    'format':'RGBA8888','size':{'w':2048,'h':2048},'scale':'1','alphaMode':'straight',
    'animations':ANIMS}},indent=2)+'\n')

# Contact sheet retains frame labels outside art cells; labels are never atlas content.
sheet=Image.new('RGB',(1100,len(ANIMS)*155),'#101e30'); draw=ImageDraw.Draw(sheet)
for row,(name,anim) in enumerate(ANIMS.items()):
    draw.text((8,row*155+3),name,fill='#f2d596')
    for i,key in enumerate(anim['frames']):
        im=FRAMES[key][0]; fit=ImageOps.contain(im,(125,118),Image.Resampling.LANCZOS)
        px=8+i*136; py=row*155+22
        sheet.paste(fit,(px+(125-fit.width)//2,py),fit)
        draw.text((px,row*155+138),key,fill='#b9cfdf')
sheet.save(ROOT/'contact_sheet.png')

def overlay(canvas,key,xy,size,angle=0,opacity=1):
    im=FRAMES[key][0].resize(size,Image.Resampling.LANCZOS)
    if opacity<1: im.putalpha(im.getchannel('A').point(lambda a:round(a*opacity)))
    if angle: im=im.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
    canvas.alpha_composite(im,(round(xy[0]-im.width/2),round(xy[1]-im.height/2)))

# Existing target-project gear is copied only into review composites, never into new VFX.
repo=ROOT.parents[1]
gear=Image.open(repo/'public/assets/ui/equip/gear_items.webp').convert('RGBA').crop((0,0,128,128))
for mode,color in [('dark','#091423'),('light','#dedde2')]:
    canvas=Image.new('RGBA',(390,844),color)
    d=ImageDraw.Draw(canvas)
    d.rounded_rectangle((18,226,372,615),radius=24,fill='#112136' if mode=='dark' else '#ece8e2',outline='#526078',width=1)
    overlay(canvas,'shock_ring_02',(195,422),(184,184),opacity=.4)
    overlay(canvas,'hammer',(238,320),(104,104),125)
    # Exactly 132px placeholder tile. Frame composed before VFX, protected by footprint.
    d.rounded_rectangle((129,356,260,487),radius=12,fill='#17263b',outline='#bb92e8',width=3)
    canvas.alpha_composite(gear,(131,358))
    overlay(canvas,'hit_flash_b_00',(195,422),(122,122),opacity=.85)
    for i in range(4): overlay(canvas,f'spark_{i:02d}',(140+i*33,467+(i%2)*29),(9,9))
    overlay(canvas,'result_glow_02',(195,530),(168,84),opacity=.6)
    # Calm Lv alternative shown below, no result text baked into this artwork preview.
    overlay(canvas,'result_glow_cyan_03',(195,574),(146,73),opacity=.5)
    canvas.convert('RGB').save(ROOT/f'preview_{mode}.png')

decoded=Image.open(ROOT/'forge_strike_fx.webp').convert('RGBA')
checks=[]
for key,(im,pivot) in FRAMES.items():
    f=meta[key]['frame']; back=decoded.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
    assert im.tobytes()==back.tobytes(),key
    assert im.getchannel('A').getextrema()[0]==0,key
    assert not im.getchannel('A').crop((0,0,im.width,4)).getbbox(),key
    checks.append({'frame':key,'size':list(im.size),'alpha':im.getchannel('A').getextrema(),
                   'sha256':hashlib.sha256(im.tobytes()).hexdigest(),'losslessRoundTrip':True})
for mode in ('dark','light'): assert Image.open(ROOT/f'preview_{mode}.png').size==(390,844)
(ROOT/'validation.json').write_text(json.dumps({'frameCount':len(checks),'atlasSize':[2048,2048],
    'previewSize':[390,844],'frames':checks},indent=2)+'\n')
print(f'Validated {len(checks)} frames; lossless atlas round trip; 390x844 previews.')
