"""Normalize whole strips with one shared scale, then losslessly trim/dedup/pack.
Never resizes individual poses. Exact shipped seed at idle/action boundaries.
"""
from pathlib import Path
from PIL import Image, ImageDraw
from scipy.ndimage import label, find_objects, binary_dilation
import numpy as np
import hashlib, json, io
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
OUT=ROOT/'public/assets/units'
def pack(tiles,width):
 x=y=2; row=0; positions={}
 for key,tile in sorted(tiles.items(),key=lambda p:(-p[1].height,-p[1].width,p[0])):
  if tile.width+4>width:return None
  if x+tile.width+2>width:y+=row+4;x=2;row=0
  positions[key]=(x,y);x+=tile.width+4;row=max(row,tile.height)
 return positions,y+row+2
manifest=json.loads((ROOT/'src/game/visuals/unit-atlases.json').read_text());report={}
for name,rows in [('eira',6),('sprite',4)]:
 raw=Image.open(HERE/f'{name}-raw.png').convert('RGBA');a=np.array(raw)
 labels,_=label(a[:,:,3]>80);counts=np.bincount(labels.ravel());regions=[]
 for ident,b in enumerate(find_objects(labels),1):
  if counts[ident]>3000:regions.append((ident,(b[1].start,b[0].start,b[1].stop,b[0].stop)))
 assert len(regions)==rows*4
 # Generated row spacing is nonuniform. Sort by soles first, group four, then X.
 regions.sort(key=lambda r:r[1][3]);regions=[r for i in range(rows) for r in sorted(regions[i*4:i*4+4],key=lambda r:r[1][0])]
 seed=Image.open(HERE/f'{name}-seed.png').convert('RGBA');bbox=seed.getchannel('A').point(lambda v:255 if v>80 else 0).getbbox()
 factor=.42 if name=='eira' else .5
 scale=(bbox[3]-bbox[1])*factor/(regions[0][1][3]-regions[0][1][1])
 idle=Image.new('RGBA',(512,512));idle.alpha_composite(seed.resize((round(512*factor),round(512*factor)),Image.Resampling.LANCZOS),(round(256-256*factor),496-round(bbox[3]*factor)))
 selected=list(range(16))+[16,17,20,21,23] if name=='eira' else list(range(8))+list(range(8))+[8,9,12,13,15]
 cells=[idle]
 for idx in selected:
  ident,(left,top,right,bottom)=regions[idx]
  mask=binary_dilation(labels==ident,iterations=2);pixels=a.copy();pixels[:,:,3]=np.where(mask,pixels[:,:,3],0)
  pixels[:,:,3]=np.where(pixels[:,:,3]<4,0,pixels[:,:,3])
  # Expand two pixels to retain edge antialiasing, bounded to the canvas.
  box=(max(0,left-2),max(0,top-2),min(raw.width,right+2),min(raw.height,bottom+2))
  tile=Image.fromarray(pixels).crop(box);tile=tile.resize((round(tile.width*scale),round(tile.height*scale)),Image.Resampling.LANCZOS)
  col=idx%4;anchor=(col+.5)*raw.width/4
  x=round(256+(box[0]-anchor)*scale);y=496-round((bottom-box[1])*scale)
  assert x>=0 and y>=0 and x+tile.width<=512 and y+tile.height<=512,(name,idx,x,y,tile.size)
  cell=Image.new('RGBA',(512,512));cell.alpha_composite(tile,(x,y));cells.append(cell)
 for i in [1,8,9,16]:cells[i]=idle.copy()
 unique={};ids=[];boxes=[]
 for cell in cells:
  box=cell.getchannel('A').getbbox();ident=hashlib.sha256(cell.tobytes()).hexdigest()
  unique.setdefault(ident,cell.crop(box));ids.append(ident);boxes.append(box)
 options=[]
 for width in [512,768,1024,1280,1536,2048]:
  plan=pack(unique,width)
  if plan and plan[1]<=4096:options.append((width*plan[1],width,plan))
 _,width,(positions,height)=min(options);atlas=Image.new('RGBA',(width,height))
 for ident,tile in unique.items():atlas.paste(tile,positions[ident])
 buf=io.BytesIO();atlas.save(buf,format='WEBP',lossless=True,exact=True,method=6);encoded=buf.getvalue()
 image_name=f'{name}_a1.{hashlib.sha256(encoded).hexdigest()[:12]}.webp';(OUT/image_name).write_bytes(encoded)
 frames={}
 decoded=Image.open(io.BytesIO(encoded)).convert('RGBA')
 for i,(ident,box) in enumerate(zip(ids,boxes)):
  x,y=positions[ident];tile=unique[ident];left,top,right,bottom=box
  frames[str(i)]={'frame':{'x':x,'y':y,'w':tile.width,'h':tile.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':left,'y':top,'w':right-left,'h':bottom-top},'sourceSize':{'w':512,'h':512}}
  rebuilt=Image.new('RGBA',(512,512));rebuilt.paste(decoded.crop((x,y,x+tile.width,y+tile.height)),(left,top))
  aa=np.array(cells[i]);bb=np.array(rebuilt);assert np.array_equal(aa[:,:,3],bb[:,:,3]);assert np.array_equal(aa[aa[:,:,3]>0],bb[aa[:,:,3]>0])
 data={'frames':frames,'meta':{'image':image_name,'size':{'w':width,'h':height},'scale':'1'}}
 encoded_json=json.dumps(data,sort_keys=True,separators=(',',':')).encode();json_name=f'{name}_a1.{hashlib.sha256(encoded_json).hexdigest()[:12]}.json';(OUT/json_name).write_bytes(encoded_json)
 manifest[name]={'image':image_name,'atlas':json_name,'width':width,'height':height,'frames':22,'decodedBytes':width*height*4,'downloadBytes':len(encoded)+len(encoded_json)}
 assert width*height*4<=6*1024*1024,(name,'decoded budget',manifest[name])
 assert len(encoded)+len(encoded_json)<=1_500_000,(name,'download budget')
 preview=Image.new('RGB',(1024,3*150),(13,23,44));draw=ImageDraw.Draw(preview)
 for i,cell in enumerate(cells):
  tile=cell.resize((128,128),Image.Resampling.LANCZOS);preview.paste(tile,((i%8)*128,(i//8)*150),tile);draw.text(((i%8)*128+4,(i//8)*150+128),str(i),fill='white')
 preview.save(HERE/f'{name}-preview.png')
 report[name]={'scale':scale,'displayRatio':1/factor,'cell':512,'origin':[.5,496/512],'rawSize':raw.size,'sourceSha256':hashlib.sha256((HERE/f'{name}-raw.png').read_bytes()).hexdigest(),'selectedRawFrames':selected,'lockedToSeed':[0,1,8,9,16],'uniqueFrames':len(unique),'losslessReconstruction':'all alpha and visible RGBA equal',**manifest[name]}
(ROOT/'src/game/visuals/unit-atlases.json').write_text(json.dumps(manifest,indent=2)+'\n');(HERE/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
