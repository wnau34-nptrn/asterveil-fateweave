"""Package original generated RGBA flipbooks. Run with Pillow; writes only here."""
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance
import json, hashlib

ROOT = Path(__file__).resolve().parent
SPEC = {
    'execute': [('blade_glint','execute',0),('slash_ribbon','execute',1),
                ('contact_star','execute',2),('falling_spark','execute',3),
                ('rose_mark_pulse','supplement',0)],
    'ward': [('weave_thread','ward',0),('curved_veil','ward',1),
             ('settle','ward',2),('dissolve','ward',3),
             ('rim_crescent','supplement',1),('sparse_rune','supplement',2),
             ('quiet_rim','supplement',3)]}

def split(sheet, row):
    src = Image.open(ROOT/'generated'/f'{sheet}.png').convert('RGBA')
    # The supplemental generator used uneven row heights. Explicit reviewed row
    # bounds prevent a neighboring row's glints from leaking into quiet rims.
    boundaries=[0,320/1254,690/1254,990/1254,1] if sheet=='supplement' else [0,.25,.5,.75,1]
    cells = [src.crop((round(i*src.width/4),round(boundaries[row]*src.height),
                      round((i+1)*src.width/4),round(boundaries[row+1]*src.height))) for i in range(4)]
    # Retain grid-relative centers and relative frame sizes. Reserve a certified
    # transparent outer band, including the 4px inset where Bolt had a square.
    out=[]
    for cell in cells:
        im=ImageOps.contain(cell,(192,192),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(256,256)); canvas.paste(im,((256-im.width)//2,(256-im.height)//2))
        # Guard against any generated square outline: smoothly taper only the
        # exterior 16% of the cell, leaving the principal artwork untouched.
        pixels=canvas.load()
        for y in range(32,224):
            for x in range(32,224):
                r,g,b,a=pixels[x,y]
                d=min(x-32,y-32,223-x,223-y)
                a=round(a*min(1,max(0,d/16)))
                pixels[x,y]=(r,g,b,a) if a else (0,0,0,0)
        out.append(canvas)
    return out

def overlay(canvas,im,xy,size):
    fit=im.resize(size,Image.Resampling.LANCZOS)
    canvas.alpha_composite(fit,(round(xy[0]-size[0]/2),round(xy[1]-size[1]/2)))

report={}
for effect, spec in SPEC.items():
    folder=ROOT/effect; sources=folder/'sources'; sources.mkdir(parents=True,exist_ok=True)
    atlas=Image.new('RGBA',(2048,2048)); frames={}; animations={}; images={}
    n=0
    for layer,sheet,row in spec:
        cells=split(sheet,row); strip=Image.new('RGBA',(1024,256))
        for i,im in enumerate(cells):
            name=f'{layer}_{i:02d}'; images[name]=im
            im.save(sources/f'{name}.png'); strip.paste(im,(i*256,0))
            x=4+(n%7)*264; y=4+(n//7)*264; n+=1
            atlas.paste(im,(x,y))
            frames[name]={'frame':{'x':x,'y':y,'w':256,'h':256},'rotated':False,'trimmed':False,
              'spriteSourceSize':{'x':0,'y':0,'w':256,'h':256},'sourceSize':{'w':256,'h':256},
              'pivot':{'x':.5,'y':.5}}
        strip.save(sources/f'{layer}_strip.png')
        animations[layer]={'count':4,'cell':[256,256],'layout':'horizontal',
                           'frames':[f'{layer}_{i:02d}' for i in range(4)]}
    static='contact_star_01' if effect=='execute' else 'settle_01'
    images['static_impact']=images[static]; frames['static_impact']=frames[static].copy()
    images['static_impact'].save(sources/'static_impact.png')
    path=ROOT/f'{effect}_fx.webp'; atlas.save(path,lossless=True,exact=True,method=6)
    meta={'app':'ART-VFX-EXEC-WARD-001','version':'1','image':path.name,'format':'RGBA8888',
          'size':{'w':2048,'h':2048},'scale':'1','alphaMode':'straight','animations':animations,
          'staticImpactFrame':'static_impact'}
    (ROOT/f'{effect}_fx.json').write_text(json.dumps({'frames':frames,'meta':meta},indent=2)+'\n')
    decoded=Image.open(path).convert('RGBA'); checks=[]
    for name, f in frames.items():
        r=f['frame']; im=decoded.crop((r['x'],r['y'],r['x']+256,r['y']+256))
        assert im.tobytes()==images[name].tobytes(), name
        a=im.getchannel('A')
        bands=[a.crop(box).getextrema()[1] for box in [(0,0,256,16),(0,240,256,256),(0,0,16,256),(240,0,256,256)]]
        assert max(bands)==0, name
        # A square frame spanning the cell would appear as long runs on these
        # rows/columns. Check every line in the outer 32px, not just four pixels.
        longest=0
        for k in list(range(32))+list(range(224,256)):
            for line in [[a.getpixel((j,k)) for j in range(256)], [a.getpixel((k,j)) for j in range(256)]]:
                run=0
                for v in line:
                    run=run+1 if v>8 else 0; longest=max(longest,run)
        assert longest<128,(name,longest)
        checks.append({'frame':name,'alphaRange':a.getextrema(),'outer16pxAlphaMax':max(bands),'outer32pxLongestRunAbove8':longest})
    bg=Image.open(ROOT.parents[1]/'public/assets/art/ruins.webp').convert('RGB')
    bg=ImageOps.fit(bg,(390,844),method=Image.Resampling.LANCZOS)
    samples= [('blade_glint_02',(105,210),(84,84)),('slash_ribbon_03',(225,370),(104,104)),
              ('contact_star_01',(280,485),(70,70)),('rose_mark_pulse_02',(312,474),(36,36)),
              ('falling_spark_01',(280,630),(80,80))] if effect=='execute' else [
              ('weave_thread_02',(105,210),(80,104)),('curved_veil_03',(225,370),(84,110)),
              ('settle_01',(280,500),(84,110)),('quiet_rim_02',(280,650),(84,110))]
    for mode,factor in [('dark',.38),('light',1.65)]:
        canvas=ImageEnhance.Brightness(bg).enhance(factor).convert('RGBA')
        if mode=='light': canvas=Image.blend(canvas,Image.new('RGBA',canvas.size,'#e6e3f2'),.28)
        for name,xy,size in samples: overlay(canvas,images[name],xy,size)
        canvas.convert('RGB').save(folder/f'preview_{mode}.png')
        assert Image.open(folder/f'preview_{mode}.png').size==(390,844)
    # All exported frames on a single flat background: no decorative cell lines.
    qa=Image.new('RGBA',(768,((len(images)+5)//6)*128),'#10182b')
    for i,(name,im) in enumerate(images.items()):
        qa.alpha_composite(im.resize((128,128),Image.Resampling.LANCZOS),((i%6)*128,(i//6)*128))
    qa.convert('RGB').save(folder/'review_frames.png')
    report[effect]={'atlasRoundtrip':'exact RGBA','atlasSize':[2048,2048],'previews':[390,844],
                    'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'frames':checks}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('Validated both lossless atlases, all frames, transparent borders and four 390x844 previews')
