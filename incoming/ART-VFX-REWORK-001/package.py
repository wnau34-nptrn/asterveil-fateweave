#!/usr/bin/env python3
"""Deterministic straight-alpha normalization and lossless atlas packing. Run python3 -I package.py."""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
BEATS = ['prepare', 'peak', 'end']
CONFIG = {
 'venom_coat': ('caster hands',52), 'venom_stack': ('target waist',52), 'venom_tick': ('target waist',44),
 'venom_burst': ('target centre',90), 'venom_splash': ('target centre',50),
 'shadow_cut': ('target centre',76), 'shadow_afterimage': ('caster feet',95),
 'arcane_gain': ('caster hands',48), 'arcane_release': ('caster hands',94), 'clash': ('target centre',90),
 'blade_storm': ('target centre; settle target feet',76), 'venom_emblem': ('target waist',28), 'arcane_emblem': ('caster hands',28),
}
def sha(path):
 return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path, value):
 path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
def validate():
 files={}
 for p in sorted(ROOT.rglob('*')):
  if not p.is_file() or p.name in ['validation.json','SHA256SUMS'] or '__pycache__' in p.parts: continue
  info={'bytes':p.stat().st_size,'sha256':sha(p)}
  if p.suffix=='.png':
   with Image.open(p) as im: im.load();info.update(size=list(im.size),mode=im.mode)
  files[str(p.relative_to(ROOT))]=info
 for p in [REPO/'public/assets/fx/rework_fx.webp',REPO/'public/assets/fx/rework_fx.json']:
  files['../../'+str(p.relative_to(REPO))]={'bytes':p.stat().st_size,'sha256':sha(p)}
 write(ROOT/'validation.json',{'batch':'ART-VFX-REWORK-001','files':files})
 (ROOT/'SHA256SUMS').write_text(''.join(f'{v["sha256"]}  {k}\n' for k,v in files.items()))
def build():
 layers=[];sources=[];layout={};packed=[]
 for item in json.loads((ROOT/'generation-prompts.json').read_text()):
  name=item['id']; raw=ROOT/'source'/f'{name}.png';raw.parent.mkdir(exist_ok=True)
  if not raw.exists(): shutil.copyfile(item['path'],raw)
  elif Path(item['path']).exists() and sha(raw)!=sha(Path(item['path'])): raise ValueError(f'{name}: existing source differs; preserve it and explicitly select a version')
  with Image.open(raw) as image: image.load();src=image.convert('RGBA')
  count=5 if name=='blade_storm' else 2 if name=='venom_emblem' else 1 if name=='arcane_emblem' else 3
  rects=[[round(i*src.width/count),0,round((i+1)*src.width/count),src.height] for i in range(count)]
  crops=[src.crop(r) for r in rects]
  threshold=16 if name in ['venom_emblem','arcane_emblem'] else 0
  boxes=[im.getchannel('A').point(lambda a: 255 if a>threshold else 0).getbbox() for im in crops]
  if any(b is None for b in boxes): raise ValueError(f'{name}: empty frame')
  # Same union, offset and scale for every beat; never size a quiet prepare independently.
  union=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
  scale=232/max(union[2]-union[0],union[3]-union[1]); dims=(round((union[2]-union[0])*scale),round((union[3]-union[1])*scale))
  offset=((256-dims[0])//2,(256-dims[1])//2)
  layout[name]={'source':str(raw.relative_to(ROOT)),'source_rects':rects,'common_scale':scale,'bounds_alpha_threshold':threshold,'common_union':list(union),'offset':list(offset),'pivot':[.5,.5],'anchor':CONFIG[name][0],'width_at_390':CONFIG[name][1]}
  sources.append({'file':str(raw.relative_to(ROOT)),'sha256':sha(raw),'size':list(src.size)})
  for i,im in enumerate(crops):
   out=Image.new('RGBA',(256,256));out.alpha_composite(im.crop(union).resize(dims,Image.Resampling.LANCZOS),offset)
   if name=='blade_storm': beat=str(i+1) if i<4 else 'settle';frame=f'{name}_{beat}';variant='R1'
   elif name=='venom_emblem': beat='emblem';frame=name;variant='R1' if i==0 else 'R2'
   elif name=='arcane_emblem': beat='emblem';frame=name;variant='R1'
   else: beat=BEATS[i];frame=f'{name}_{beat}';variant='R1'
   dst=ROOT/variant/f'{frame}.png';dst.parent.mkdir(exist_ok=True);out.save(dst)
   bounds=out.getchannel('A').getbbox()
   assert bounds and min(bounds[:2])>=12 and max(bounds[2:])<=244,(name,bounds)
   layers.append({'move':name,'beat':beat,'variant':variant,'file':str(dst.relative_to(ROOT)),'source':str(raw.relative_to(ROOT)),'source_rect':rects[i],'size':[256,256],'alpha_bounds':list(bounds),'pivot':[.5,.5],'anchor':CONFIG[name][0],'blend':'normal','suggested_canvas_width_at_390':CONFIG[name][1],'sha256':sha(dst)})
   if variant=='R1': packed.append((frame,out,bounds))
 # Shelf pack trimmed pixels, with logical source canvas retained for Phaser placement.
 width=1024;x=1;y=1;row=0;placements=[]
 for frame,im,bbox in sorted(packed,key=lambda v:(-(v[2][3]-v[2][1]),v[0])):
  crop=im.crop(bbox);w,h=crop.size
  if x+w+1>width:x=1;y+=row+2;row=0
  placements.append((frame,crop,bbox,x,y));x+=w+2;row=max(row,h)
 height=y+row+1;atlas=Image.new('RGBA',(width,height));frames={}
 for frame,crop,bbox,x,y in placements:
  atlas.paste(crop,(x,y));w,h=crop.size
  frames[frame]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':True,'sourceSize':{'w':256,'h':256},'spriteSourceSize':{'x':bbox[0],'y':bbox[1],'w':w,'h':h}}
 dest=REPO/'public/assets/fx';dest.mkdir(parents=True,exist_ok=True)
 atlas.save(dest/'rework_fx.webp',lossless=True,exact=True)
 write(dest/'rework_fx.json',{'frames':frames,'meta':{'image':'rework_fx.webp','format':'RGBA8888','size':{'w':width,'h':height},'scale':'1'}})
 write(ROOT/'layout.json',layout)
 write(ROOT/'layers.json',{'schema':'art-vfx-three-beat-v1','batch':'ART-VFX-REWORK-001','frame_size':[256,256],'alpha':'straight','padding_min_px':12,'timing':'Existing stage timing unchanged; event-owned contacts only.','sources':sources,'layers':layers})
 validate()
 print(f'{len(layers)} layers; {len(frames)} runtime frames; atlas {width}x{height}, decoded {width*height*4} bytes')
if __name__=='__main__':build()
