"""Pack the selected R1 Saint and Dance layers into one lossless atlas; pixels are copied unchanged.

R1 was chosen by Claude on the owner's behalf (the owner's standing pattern is "use Codex's recommendation", but the
NOTES recommend neither revision). R1 reads cleaner at 390px: slender amber threads and pink ribbons that keep their
pigment when stacked, and its peak paintings are not clipped at the cell edges as often as R2's. R2 stays in the folder for a swap.
Layers the resolver cannot truthfully feed are left out (see docs/combat-presentation/saint-dance-slice/README_TH.md).
Run from anywhere: python3 -I incoming/ART-VFX-SAINT-DANCE-001/atlas.py
"""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[2]
ART=Path(__file__).resolve().parent
REV='R1'
layers={(l['move'],l['beat']):l for l in json.loads((ART/'layers.json').read_text())['layers'] if l['revision']==REV}
moves=['saintstrike','communion','saintarc','vowstrike','sharewound','lastlight','cadence','duet','rounddance','deepbeat','echofoot','closingstep']
use={m:['prepare'] for m in moves}
use['saintstrike']+=['peak','settle'];use['communion']+=['settle'];use['saintarc']+=['peak'];use['vowstrike']+=['peak','settle'];use['lastlight']+=['peak']
for m in moves[6:]:use[m]=['prepare','peak','settle']
use['rounddance']=['prepare','settle']  # its peak painting is clipped by the source cell on both sides; the clean settle ring is used for the whole cue
beats=['prepare','peak','settle']
cell=264
atlas=Image.new('RGBA',(cell*3,cell*len(moves)))
frames={};art={};sources={}
for row,m in enumerate(moves):
 for b in use[m]:
  l=layers[(m,b)];data=(ART/l['file']).read_bytes();assert hashlib.sha256(data).hexdigest()==l['sha256'],l['file']
  im=Image.open(ART/l['file']).convert('RGBA');assert im.size==(256,256)
  x,y=beats.index(b)*cell+4,row*cell+4;atlas.alpha_composite(im,(x,y));name=f'{m}_{b}'
  frames[name]={'frame':{'x':x,'y':y,'w':256,'h':256},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':256,'h':256},'sourceSize':{'w':256,'h':256}}
  art[name]=l['pivot'];sources[name]=l['sha256']
out=ROOT/'public/assets/fx';out.mkdir(exist_ok=True)
atlas.save(out/'saint_dance_fx.webp',lossless=True,exact=True)
(out/'saint_dance_fx.json').write_text(json.dumps({'frames':frames,'meta':{'image':'saint_dance_fx.webp','format':'RGBA8888','size':{'w':atlas.width,'h':atlas.height},'scale':'1'}},indent=2)+'\n')
(ROOT/'src/game/visuals/saint-dance-art.json').write_text(json.dumps(art,indent=2)+'\n')
(ART/'production-sources.json').write_text(json.dumps({'revision':REV,'atlasSha256':hashlib.sha256((out/'saint_dance_fx.webp').read_bytes()).hexdigest(),'frames':sources},indent=2)+'\n')
print(len(frames),'frames',atlas.size,(out/'saint_dance_fx.webp').stat().st_size,'bytes')
