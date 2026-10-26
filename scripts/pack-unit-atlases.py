"""Lossless repack of approved animation cells: trim alpha and alias identical frames.
No resizing, new artwork, or frame/pivot changes. Requires Pillow and NumPy.
"""
from pathlib import Path
from PIL import Image
import hashlib,json,io
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/assets/units'
def pack(rects,width):
 rows=[];placed={};y=2;x=2;height=0
 for key,tile in sorted(rects.items(),key=lambda kv:(-kv[1].height,-kv[1].width,kv[0])):
  if tile.width+4>width:return None
  if x+tile.width+2>width:y+=height+4;x=2;height=0
  placed[key]=(x,y);x+=tile.width+4;height=max(height,tile.height)
 return placed,y+height+2
manifest={};report={}
for name in ['lyra','hunter']:
 original=Image.open(OUT/(name+'_pilot.webp')).convert('RGBA');unique={};ids={};boxes={}
 for i in range(22):
  x=(i%4)*512;y=(i//4)*512;cell=original.crop((x,y,x+512,y+512));box=cell.getchannel('A').getbbox();assert box
  ident=hashlib.sha256(cell.tobytes()).hexdigest();ids[str(i)]=ident;boxes[str(i)]=box
  if ident not in unique:unique[ident]=cell.crop(box)
 candidates=[]
 for width in [512,768,1024,1280,1536,2048]:
  plan=pack(unique,width)
  if plan and plan[1]<=4096:candidates.append((width*plan[1],width,plan))
 _,width,(positions,height)=min(candidates)
 atlas=Image.new('RGBA',(width,height))
 for ident,tile in unique.items():atlas.paste(tile,positions[ident])
 encoded=io.BytesIO();atlas.save(encoded,format='WEBP',lossless=True,exact=True,method=6)
 image_bytes=encoded.getvalue();image_name=f'{name}_pilot.{hashlib.sha256(image_bytes).hexdigest()[:12]}.webp';(OUT/image_name).write_bytes(image_bytes)
 frames={}
 for frame,ident in ids.items():
  x,y=positions[ident];tile=unique[ident];left,top,right,bottom=boxes[frame]
  frames[frame]={'frame':{'x':x,'y':y,'w':tile.width,'h':tile.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':left,'y':top,'w':right-left,'h':bottom-top},'sourceSize':{'w':512,'h':512}}
 data={'frames':frames,'meta':{'image':image_name,'size':{'w':width,'h':height},'scale':'1'}}
 raw=json.dumps(data,sort_keys=True,separators=(',',':')).encode();json_name=f'{name}_pilot.{hashlib.sha256(raw).hexdigest()[:12]}.json';(OUT/json_name).write_bytes(raw)
 manifest[name]={'image':image_name,'atlas':json_name,'width':width,'height':height,'frames':22,'decodedBytes':width*height*4,'downloadBytes':len(raw)+len(image_bytes)}
 report[name]={'originalBytes':(OUT/(name+'_pilot.webp')).stat().st_size,'originalDecodedBytes':original.width*original.height*4,'uniqueFrames':len(unique),**manifest[name]}
 # Verify alpha and all visible RGB pixels after reconstruction, not just bounding boxes.
 import numpy as np
 packed=Image.open(io.BytesIO(image_bytes)).convert("RGBA")
 for frame,info in frames.items():
  src=info['frame'];box=info['spriteSourceSize'];rebuild=Image.new('RGBA',(512,512));rebuild.paste(packed.crop((src['x'],src['y'],src['x']+src['w'],src['y']+src['h'])),(box['x'],box['y']))
  i=int(frame);expected=original.crop(((i%4)*512,(i//4)*512,(i%4)*512+512,(i//4)*512+512));a=np.array(expected);b=np.array(rebuild)
  assert np.array_equal(a[:,:,3],b[:,:,3]),(name,frame,'alpha')
  assert np.array_equal(a[a[:,:,3]>0],b[a[:,:,3]>0]),(name,frame,'visible pixels')
(ROOT/'src/game/visuals/unit-atlases.json').write_text(json.dumps(manifest,indent=2)+'\n')
p=ROOT/'docs/validation/unit-animation-loading';p.mkdir(parents=True,exist_ok=True);(p/'packing.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
