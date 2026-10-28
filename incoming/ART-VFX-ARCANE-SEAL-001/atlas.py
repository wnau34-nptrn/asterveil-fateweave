"""Pack the selected R2 layers into one lossless atlas; pixels are copied unchanged."""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[2]
ART=Path(__file__).resolve().parent
layers=[l for l in json.loads((ART/'layers.json').read_text())['layers'] if l['revision']=='R2']
moves=['mark','sigil','storm','dispel'];beats=['prepare','peak','settle']
cell=264  # 256px layer + 4px transparent gutter on every side
atlas=Image.new('RGBA',(cell*3,cell*4))
frames={};art={}
for l in layers:
 im=Image.open(ART/l['file']).convert('RGBA');assert im.size==(256,256)
 col,row=beats.index(l['beat']),moves.index(l['move']);x,y=col*cell+4,row*cell+4
 atlas.alpha_composite(im,(x,y));name=f"{l['move']}_{l['beat']}"
 frames[name]={'frame':{'x':x,'y':y,'w':256,'h':256},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':256,'h':256},'sourceSize':{'w':256,'h':256}}
 art[name]=l['pivot']
assert len(frames)==12
out=ROOT/'public/assets/fx';out.mkdir(exist_ok=True)
atlas.save(out/'arcane_seal_fx.webp',lossless=True,exact=True)
(out/'arcane_seal_fx.json').write_text(json.dumps({'frames':frames,'meta':{'image':'arcane_seal_fx.webp','format':'RGBA8888','size':{'w':atlas.width,'h':atlas.height},'scale':'1'}},indent=2)+'\n')
(ROOT/'src/game/visuals/arcane-seal-art.json').write_text(json.dumps(art,indent=2)+'\n')
(ART/'production-sources.json').write_text(json.dumps({'atlasSha256':hashlib.sha256((out/'arcane_seal_fx.webp').read_bytes()).hexdigest(),'frames':{l['move']+'_'+l['beat']:l['sha256'] for l in layers}},indent=2)+'\n')
print('12 frames',atlas.size,(out/'arcane_seal_fx.webp').stat().st_size,'bytes')
