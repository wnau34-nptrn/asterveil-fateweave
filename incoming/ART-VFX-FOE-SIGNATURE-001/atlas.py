"""Pack the ten selected foe-signature moves (40 layers) into one lossless trimmed atlas; pixels are copied unchanged.

Every layer's sha256 is checked against layers.json first. Each 256px layer is cropped to its recorded alpha bounds and shelf-packed
with a 2px transparent gutter; the JSON atlas keeps the original 256px sourceSize, so Phaser origins stay the art pivots.
Run from anywhere: python3 -I incoming/ART-VFX-FOE-SIGNATURE-001/atlas.py
"""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[2]
ART=Path(__file__).resolve().parent
layers=json.loads((ART/'layers.json').read_text())['layers']
assert len(layers)==40
WIDTH,GUTTER=1024,2
beat={'prepare':'prepare','peak-travel':'travel','peak-impact':'impact','settle':'settle'}
items=[]
for l in layers:
 data=(ART/l['file']).read_bytes();assert hashlib.sha256(data).hexdigest()==l['sha256'],l['file']
 im=Image.open(ART/l['file']).convert('RGBA');assert im.size==(256,256)
 box=tuple(l['alpha_bounds']);assert im.getbbox()==box,(l['file'],im.getbbox(),box)
 move=l['file'].split('/')[1].rsplit('_',1)[0];name=f"{move}_{beat[l['component']]}"
 items.append((name,l,im.crop(box),box))
# shelf packing, tallest first
items.sort(key=lambda i:-(i[3][3]-i[3][1]))
x=y=shelf=0;placed=[]
for name,l,crop,box in items:
 w,h=crop.size
 if x+w>WIDTH:x=0;y+=shelf+GUTTER;shelf=0
 placed.append((name,l,crop,box,x,y));x+=w+GUTTER;shelf=max(shelf,h)
height=y+shelf
atlas=Image.new('RGBA',(WIDTH,height))
frames={};art={};sources={}
for name,l,crop,box,px,py in placed:
 atlas.alpha_composite(crop,(px,py));w,h=crop.size
 frames[name]={'frame':{'x':px,'y':py,'w':w,'h':h},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':box[0],'y':box[1],'w':w,'h':h},'sourceSize':{'w':256,'h':256}}
 art[name]={'pivot':l['pivot_normalized'],'bounds':list(box),'anchor':l['anchor']};sources[name]=l['sha256'];assert l['flip_x'] is False and l['direction']=='left'
assert len(frames)==40
frames=dict(sorted(frames.items()));art=dict(sorted(art.items()))
out=ROOT/'public/assets/fx';out.mkdir(exist_ok=True)
atlas.save(out/'foe_signature_fx.webp',lossless=True,exact=True)
(out/'foe_signature_fx.json').write_text(json.dumps({'frames':frames,'meta':{'image':'foe_signature_fx.webp','format':'RGBA8888','size':{'w':atlas.width,'h':atlas.height},'scale':'1'}},indent=2)+'\n')
(ROOT/'src/game/visuals/foe-signature-art.json').write_text(json.dumps(art,indent=2)+'\n')
(ART/'production-sources.json').write_text(json.dumps({'atlasSha256':hashlib.sha256((out/'foe_signature_fx.webp').read_bytes()).hexdigest(),'frames':dict(sorted(sources.items()))},indent=2)+'\n')
print('40 frames',atlas.size,(out/'foe_signature_fx.webp').stat().st_size,'bytes',round(atlas.width*atlas.height*4/2**20,2),'MiB decoded')
