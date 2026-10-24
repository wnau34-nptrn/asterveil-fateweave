"""Validate the delivered package and build text-free greyscale review evidence."""
from pathlib import Path
from PIL import Image,ImageOps
import json,hashlib,xml.etree.ElementTree as ET,subprocess
OUT=Path(__file__).resolve().parents[1]; ROOT=OUT.parents[1]
report={'frames':{},'runtime_files':{},'source_hashes':{}}
for folder,count in [('chests',4),('items',3)]:
 atlas=Image.open(OUT/folder/(folder+'.webp'))
 assert atlas.size==(128*count,128) and atlas.mode=='RGBA'
 assert atlas.info.get('icc_profile'), 'Explicit sRGB profile required'
 mapping=json.loads((OUT/folder/(folder+'.json')).read_text())
 assert len(mapping)==count
 for i,(name,m) in enumerate(mapping.items()):
  assert (m['x'],m['y'],m['w'],m['h'])==(i*128,0,128,128)
  png=Image.open(OUT/folder/(name+'.png'))
  assert png.size==(128,128) and png.mode=='RGBA'
  box=png.getchannel('A').getbbox();assert box
  assert min(box[0],box[1],128-box[2],128-box[3])>=4,(name,box)
  frame=atlas.crop((i*128,0,(i+1)*128,128))
  assert frame.getchannel('A').tobytes()==png.getchannel('A').tobytes(), 'Atlas alpha/frame mismatch'
  if folder=='chests':
   assert m['footY']==118 and box[3]==118
   assert 89<=box[2]-box[0]<=103,(name,box)
  report['frames'][name]={'size':[128,128],'alpha_bounds':list(box),**m}
for p in sorted((OUT/'icons').glob('*.svg')):
 node=ET.parse(p).getroot();assert node.attrib['viewBox']=='0 0 24 24'
 assert not any(n.tag.endswith('text') or n.tag.endswith('image') for n in node.iter())
 if not p.stem.startswith('star_badge'):
  for k,v in {'fill':'none','stroke':'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round'}.items():assert node.attrib[k]==v
  assert '#' not in p.read_text()
 assert len(list((OUT/'icons').glob('*.svg')))==10
for p in sorted(OUT.rglob('*')):
 if p.suffix in ['.webp','.svg']:report['runtime_files'][p.relative_to(OUT).as_posix()]=p.stat().st_size
report['runtime_bytes']=sum(report['runtime_files'].values());assert report['runtime_bytes']<=350000
for path,digest in json.loads((OUT/'tools/source-hashes.json').read_text()).items():
 current=hashlib.sha256((ROOT/path).read_bytes()).hexdigest();assert current==digest
 # Also compare each checked source against the base Git blob, not just an earlier working copy.
 original=subprocess.check_output(['git','show','e6dfc92415f2b9bbd76ae0257e30b307c13cecf5:'+path],cwd=ROOT)
 assert hashlib.sha256(original).hexdigest()==digest
 report['source_hashes'][path]=digest
maps=Image.open(OUT/'review/chests-on-map.png').convert('RGB')
items=Image.open(OUT/'review/items-sizes.png').convert('RGB')
grey=Image.new('RGB',(768,944),'#0d1c2e')
grey.paste(maps,(0,0));grey.paste(items,(0,448))
for i,name in enumerate(['chest_common','chest_common_open','chest_rare','chest_rare_open']):
 frame=Image.open(OUT/'chests'/(name+'.png')).resize((40,40),Image.Resampling.LANCZOS)
 grey.paste(frame,(120+i*144,880),frame)
ImageOps.grayscale(grey).convert('RGB').save(OUT/'review/greyscale.png')
for name,size in [('chests-on-map',(768,448)),('items-sizes',(768,400)),('greyscale',(768,944)),('star-row',(240,72))]:assert Image.open(OUT/'review'/(name+'.png')).size==size
(OUT/'tools/validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
