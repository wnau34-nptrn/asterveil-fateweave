"""Pack the selected R2 command layers (Taunt, Challenge, War Cry) into one lossless atlas; pixels are copied unchanged.

R2 was chosen by Claude on the owner's behalf (the owner delegated the pick; Codex gave no recommendation):
thicker shield rim, right-pointing thread without a flip, clearly separated war-cry ribs. R1 stays in the folder
for a swap. Run from anywhere: python3 -I incoming/ART-VFX-COMMAND-001/atlas.py
"""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[2]
ART=Path(__file__).resolve().parent
REV='R2'
layers=[l for l in json.loads((ART/'layers.json').read_text())['layers'] if l['revision']==REV]
moves=['taunt','challenge','warcry']
# column order: prepare, peak main, peak detail, settle
names={'taunt':['prepare','pulse','motes','settle'],'challenge':['prepare','crest','thread','settle'],'warcry':['prepare','cone','impact','wisps']}
roles={'taunt':['prepare','peak-pulse','peak-motes','settle-mark'],'challenge':['prepare','peak-crest','peak-thread','settle-crest'],'warcry':['prepare','peak-cone','peak-impact','settle-wisps']}
cell=264  # 256px layer + 4px transparent gutter on every side
atlas=Image.new('RGBA',(cell*4,cell*3))
frames={};art={};sources={}
for l in layers:
 move=l['move'];col=roles[move].index(l['role']);row=moves.index(move)
 data=(ART/l['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==l['sha256'],l['path']
 im=Image.open(ART/l['path']).convert('RGBA');assert im.size==(256,256)
 x,y=col*cell+4,row*cell+4;atlas.alpha_composite(im,(x,y));name=f"{move}_{names[move][col]}"
 frames[name]={'frame':{'x':x,'y':y,'w':256,'h':256},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':256,'h':256},'sourceSize':{'w':256,'h':256}}
 art[name]=l['pivot'];sources[name]=l['sha256'];assert not l['flipX']
assert len(frames)==12
out=ROOT/'public/assets/fx';out.mkdir(exist_ok=True)
atlas.save(out/'command_fx.webp',lossless=True,exact=True)
(out/'command_fx.json').write_text(json.dumps({'frames':frames,'meta':{'image':'command_fx.webp','format':'RGBA8888','size':{'w':atlas.width,'h':atlas.height},'scale':'1'}},indent=2)+'\n')
(ROOT/'src/game/visuals/command-art.json').write_text(json.dumps(art,indent=2)+'\n')
(ART/'production-sources.json').write_text(json.dumps({'revision':REV,'atlasSha256':hashlib.sha256((out/'command_fx.webp').read_bytes()).hexdigest(),'frames':sources},indent=2)+'\n')
print('12 frames',atlas.size,(out/'command_fx.webp').stat().st_size,'bytes')
