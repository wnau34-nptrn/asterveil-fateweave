"""Pack approved R1 isolated RGBA cells into one lossless atlas; preserve original pixels."""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[2]
ART=Path(__file__).resolve().parent
source=Image.open(ART/'source/six-skills.png')
records=json.loads((ROOT/'docs/combat-presentation/alchemy-storyboards/manifest.json').read_text())['records']
# Equal cells, no recolouring or painted additions; transparent padding avoids atlas bleed.
w,h=528,188
atlas=Image.new('RGBA',(w*3,h*6))
frames={}; provenance=[]
for row,r in enumerate(records):
 for col,(phase,f) in enumerate(zip(('prepare','peak','tail'),r['frames'])):
  x,y,sw,sh=f['cell'];im=source.crop((x,y,x+sw,y+sh))
  px,py=col*w+8,row*h+8;atlas.alpha_composite(im,(px,py))
  name=f"{r['skill']}_{phase}"
  frames[name]={'frame':{'x':px,'y':py,'w':sw,'h':sh},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':sw,'h':sh},'sourceSize':{'w':sw,'h':sh}}
  provenance.append({'frame':name,'sourceCell':f['cell'],'bright':f['bright']})
out=ROOT/'public/assets/fx';out.mkdir(exist_ok=True)
atlas.save(out/'alchemy_fx.webp',lossless=True,exact=True)
(out/'alchemy_fx.json').write_text(json.dumps({'frames':frames,'meta':{'image':'alchemy_fx.webp','format':'RGBA8888','size':{'w':atlas.width,'h':atlas.height},'scale':'1'}},indent=2)+'\n')
(ART/'production-sources.json').write_text(json.dumps({'sourceSha256':hashlib.sha256((ART/'source/six-skills.png').read_bytes()).hexdigest(),'atlasSha256':hashlib.sha256((out/'alchemy_fx.webp').read_bytes()).hexdigest(),'source':'source/six-skills.png','frames':provenance},indent=2)+'\n')
# Renderer uses bright bounds to preserve geometry and align the physical arrow tip.
(ROOT/'src/game/visuals/alchemy-art.json').write_text(json.dumps({p['frame']:p['bright'] for p in provenance},indent=2)+'\n')
print('18frames',atlas.size,(out/'alchemy_fx.webp').stat().st_size,'bytes')
