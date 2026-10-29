"""Pack the 42 boss-signature layers (one final design per move, ART-VFX-BOSS-SIGNATURE-001) into one lossless, trimmed
atlas; pixels are copied unchanged. Trimmed frames keep their 256px source size, so pivots stay in layer pixels.
Run from anywhere: python3 -I incoming/ART-VFX-BOSS-SIGNATURE-001/atlas.py
"""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[2]
ART=Path(__file__).resolve().parent
spec=json.loads((ART/'layers.json').read_text())
layers=spec['layers']
assert len(layers)==42
WIDTH,GAP=2048,2
items=[]
for l in layers:
 data=(ART/l['file']).read_bytes();assert hashlib.sha256(data).hexdigest()==l['sha256'],l['file']
 im=Image.open(ART/l['file']).convert('RGBA');assert im.size==(256,256)
 box=im.getbbox();items.append((l,im.crop(box),box))
# Shelf packing, tallest first.
items.sort(key=lambda t:-t[1].height)
x=y=shelf=0;placed=[]
for l,im,box in items:
 if x+im.width>WIDTH:x,y,shelf=0,y+shelf+GAP,0
 placed.append((l,im,box,x,y));x+=im.width+GAP;shelf=max(shelf,im.height)
H=y+shelf
atlas=Image.new('RGBA',(WIDTH,H))
frames={};art={};sources={}
for l,im,box,px,py in placed:
 name=f"{l['move']}_{l['beat']}"
 atlas.alpha_composite(im,(px,py))
 frames[name]={'frame':{'x':px,'y':py,'w':im.width,'h':im.height},'rotated':False,'trimmed':True,
  'spriteSourceSize':{'x':box[0],'y':box[1],'w':im.width,'h':im.height},'sourceSize':{'w':256,'h':256}}
 art[name]={'pivot':l['pivot_px'],'width':l['suggested_canvas_width_390'],'anchor':l['anchor']}
 sources[name]=l['sha256']
out=ROOT/'public/assets/fx'
atlas.save(out/'boss_signature_fx.webp',lossless=True,exact=True)
(out/'boss_signature_fx.json').write_text(json.dumps({'frames':frames,'meta':{'image':'boss_signature_fx.webp','format':'RGBA8888','size':{'w':WIDTH,'h':H},'scale':'1'}},indent=2)+'\n')
(ROOT/'src/game/visuals/boss-signature-art.json').write_text(json.dumps(art,indent=2,sort_keys=True)+'\n')
(ART/'production-sources.json').write_text(json.dumps({'atlasSha256':hashlib.sha256((out/'boss_signature_fx.webp').read_bytes()).hexdigest(),'frames':sources},indent=2)+'\n')
print(len(frames),'frames',atlas.size,(out/'boss_signature_fx.webp').stat().st_size,'bytes, decoded',WIDTH*H*4)
