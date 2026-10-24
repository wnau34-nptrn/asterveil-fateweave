"""Deterministic resize, atlas packing and review compositing; no painted pixel edits."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json, hashlib

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
GEN = Path('C:/Users/Warunyu.N/.codex/generated_images/01a16151-4743-7f50-ab06-baa45a65c68a')
SOURCES = [('vanguard_captain', 'exec-1719b880-2827-4799-9d99-70540e462c12.png', 'exec-edf1b867-8e3d-4783-9313-a89651edb626.png'), ('vargoth_hunter', 'exec-d107a45d-b481-46d4-a285-34e6c1c8d163.png', 'exec-df020673-474d-4a5a-9b55-e05cb64cca8f.png')]
L = Image.Resampling.LANCZOS
units = Image.new('RGBA', (1024,512))
portraits = Image.new('RGB', (1024,512))
frames = {}
report = {}
for i,(key,unit,portrait) in enumerate(SOURCES):
    src = Image.open(GEN/unit).convert('RGBA')
    assert src.getchannel('A').getextrema() == (0,255)
    crop = src.crop(src.getbbox())
    crop.thumbnail((480,470), L)
    crop = crop.crop(crop.getbbox())
    frame = Image.new('RGBA',(512,512))
    frame.alpha_composite(crop, ((512-crop.width)//2,497-crop.height))
    bust = Image.open(GEN/portrait).convert('RGB').resize((512,512),L)
    for image,name in [(frame,key),(bust,'portrait_'+key)]:
        image.save(ROOT/(name+'.png'))
        image.save(ROOT/(name+'.webp'),quality=85,method=6)
    units.alpha_composite(frame,(512*i,0))
    portraits.paste(bust,(512*i,0))
    frames[key] = dict(x=512*i,y=0,w=512,h=512,footY=496)
    report[key] = dict(bounds=frame.getbbox(),source=unit,portraitSource=portrait)
units.save(ROOT/'units_ruins_boss.webp',quality=85,method=6)
portraits.save(ROOT/'portraits_ruins_boss.webp',quality=85,method=6)
for name in ['units_ruins_boss','portraits_ruins_boss']:
    (ROOT/(name+'.json')).write_text(json.dumps(frames,indent=2)+'\n')
# Artwork-only phone review: arena band plus neutral reserved interface space.
preview = Image.new('RGBA',(390,844),'#111728')
bg = ImageOps.fit(Image.open(REPO/'public/assets/art/ruins.webp').convert('RGBA'),(390,400),method=L)
preview.alpha_composite(bg,(0,80))
heroes = Image.open(REPO/'public/assets/art/units.webp').convert('RGBA')
def actor(frame,x,y,size,baseline=496):
    sprite=frame.resize((size,size),L)
    preview.alpha_composite(sprite,(round(x-size/2),round(y-baseline*size/512)))
for index,x,y in [(2,57,272),(3,57,388),(0,145,316),(1,145,435)]:
    actor(heroes.crop(((index%2)*512,(index//2)*512,(index%2+1)*512,(index//2+1)*512)),x,y,100)
actor(units.crop((512,0,1024,512)),331,284,100)
actor(units.crop((0,0,512,512)),273,404,150)
preview.convert('RGB').save(ROOT/'preview.png')
# Large review and 40px portrait / 64px silhouette checks.
review=Image.new('RGB',(1024,650),'#a2a4ad')
review.paste(units,(0,0),units)
for i in range(2):
    bust=portraits.crop((i*512,0,(i+1)*512,512)).resize((40,40),L)
    review.paste(bust,(i*512+230,540))
    small=units.crop((i*512,0,(i+1)*512,512)).resize((64,64),L)
    sil=Image.new('RGBA',(64,64),'black');sil.putalpha(small.getchannel('A'))
    review.paste(sil,(i*512+300,530),sil)
review.save(ROOT/'review.png')
existing=['units.webp','portraits.webp','units_foes.webp','portraits_foes.webp','ruins.webp']
hashes={str(Path('public/assets/art')/p):hashlib.sha256((REPO/'public/assets/art'/p).read_bytes()).hexdigest() for p in existing}
report['existingArtSHA256']=hashes
report['runtimeAtlasBytes']=sum((ROOT/p).stat().st_size for p in ['units_ruins_boss.webp','portraits_ruins_boss.webp'])
report['allWebPBytes']=sum(p.stat().st_size for p in ROOT.glob('*.webp'))
(ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
