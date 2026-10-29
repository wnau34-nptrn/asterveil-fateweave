"""A8 normalization: Shard/Veil Golem, Rift Channeler, Rift Wisp, Shard Crawler.

Raw ImageGen strips (this folder's raw/, hashes in validation.json/strips.json) are never edited. One scale per strip is derived
from the visible area of its first (ready) figure against the shipped seed (the ready figure is the exact seed, so it is the same
scale as the idle cell). Grounded poses sit on the common sole line (y=496) and foot-centre column (x=256); the airborne Rift Wisp keeps
every pose at its painted offset from the ready figure (height and sideways drift) instead of being re-aligned. Faded wisp frames keep
their painted alpha (low alpha threshold, defringe from the most opaque pixels). Edge colour is defringed, then lossless trim/dedup/pack.
There is one final strip per move (NOTES.md), so no candidate selection applies. Frame layout is mirrored in src/game/visuals/unit-frames.ts.
"""
from pathlib import Path
from PIL import Image,ImageDraw
from scipy.ndimage import label,find_objects,binary_dilation,distance_transform_edt
import numpy as np
import hashlib,json,io,sys
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent;OUT=ROOT/'public/assets/units'
SOLE=496;FOOT_X=256;GROUND_TOLERANCE=.06;SLOT=1024
def pack(tiles,width):
 x=y=2;row=0;positions={}
 for key,tile in sorted(tiles.items(),key=lambda p:(-p[1].height,-p[1].width,p[0])):
  if tile.width+4>width:return None
  if x+tile.width+2>width:y+=row+4;x=2;row=0
  positions[key]=(x,y);x+=tile.width+4;row=max(row,tile.height)
 return positions,y+row+2
def components(alpha,thr,minimum=300):
 labels,_=label(alpha>thr);counts=np.bincount(labels.ravel())
 return labels,sorted([(b[1].start,b[0].start,b[1].stop,b[0].stop,i) for i,b in enumerate(find_objects(labels),1) if counts[i]>minimum])
def tile_of(a,mask,scale,centre,thr,anchor=None):
 """Defringe, mask, crop and scale ONE figure -> (tile, centre x in tile, sole y in tile, visible area, raw sole y)."""
 islands,count=label(mask);sizes=np.bincount(islands.ravel());sizes[0]=0;near=binary_dilation(islands==sizes.argmax(),iterations=14)
 for i in range(1,count+1):
  if sizes[i]<400 and not (near&(islands==i)).any():mask=mask&(islands!=i)
 mask=binary_dilation(mask,iterations=2);alpha=np.where(mask,a[:,:,3],0);alpha=np.where(alpha<4,0,alpha).astype(np.uint8)
 # A faded frame (Rift Wisp down) has no fully opaque pixel: defringe from its most opaque pixels, keep the painted alpha.
 solid=alpha>=min(250,int(.9*alpha.max()));_,idx=distance_transform_edt(~solid,return_indices=True);rgb=a[:,:,:3][idx[0],idx[1]]
 soft=(alpha>0)&(alpha<alpha.max()*.98);out=a[:,:,:3].copy();out[soft]=rgb[soft]
 ys,xs=np.where(alpha>thr);box=(xs.min()-2,ys.min()-2,xs.max()+3,ys.max()+3);box=(max(0,box[0]),max(0,box[1]),min(a.shape[1],box[2]),min(a.shape[0],box[3]))
 height=ys.max()-ys.min()+1
 if centre=='centroid':foot_x=xs.mean()
 elif centre=='slot':foot_x=anchor
 else:
  band=(alpha>thr)&(np.arange(a.shape[0])[:,None]>ys.max()-max(8,int(.12*height)));foot=np.where(band.any(0))[0];foot_x=(foot.min()+foot.max())/2
 img=Image.fromarray(np.dstack([out,alpha])).crop(box);img=img.resize((max(1,round(img.width*scale)),max(1,round(img.height*scale))),Image.Resampling.LANCZOS)
 return img,(foot_x-box[0])*scale,(ys.max()+1-box[1])*scale,int((alpha>thr).sum()),int(ys.max()+1),height,float(xs.mean())
def place(tile,foot_x,sole_y):
 x=round(FOOT_X-foot_x);y=round(SOLE-sole_y)
 # A long reach (golem fist) may pass the cell edge: slide the whole figure inwards by the overflow (reported as 'slide').
 slide=max(0,-x,x+tile.width-512)*(1 if x<0 else -1) if (x<0 or x+tile.width>512) else 0;x+=slide
 assert x>=0 and y>=0 and x+tile.width<=512 and y+tile.height<=512,(x,y,tile.size)
 cell=Image.new('RGBA',(512,512));cell.alpha_composite(tile,(x,y));return cell,[x,y,slide]
def seed_cell(path,factor,centre,thr):
 raw=Image.open(path).convert('RGBA');a=np.array(raw);labels,regions=components(a[:,:,3],thr,5000)
 main=max(regions,key=lambda r:(labels==r[4]).sum());mask=labels==main[4]
 tile,fx,sy,area,_,_,_=tile_of(a,mask,factor,'centroid' if centre=='slot' else centre,thr);cell,pos=place(tile,fx,sy);return cell,area
# clips: eight cells per action = four prepare + four recover (contact = recover[0], strip figure 3). None = seed idle.
ACT=[None,1,2,2,3,4,5,None]
REACT_HIT=[1,2];REACT_DOWN=[1,2,3];HOVER=[None,1,2]
STRIPS={
 'golem':{'seed':'foe_golem','factor':.5,'centre':'foot','air':False,'thr':80,
  'order':[('attack','foe_golem-punch-r1',ACT),('skill','foe_golem-veil-quake-r1',ACT),('hit','foe_golem-hit-r1',REACT_HIT),('down','foe_golem-down-r1',REACT_DOWN)]},
 'channeler':{'seed':'foe_rift_channeler','factor':.5,'centre':'foot','air':False,'thr':80,
  'order':[('attack','foe_rift_channeler-rift-bolt-r1',ACT),('alias',None,None),('hit','foe_rift_channeler-hit-r1',REACT_HIT),('down','foe_rift_channeler-down-r1',REACT_DOWN)]},
 'wisp':{'seed':'foe_rift_wisp','factor':.5,'centre':'slot','air':True,'thr':12,
  'order':[('attack','foe_rift_wisp-star-flame-r1',ACT),('alias',None,None),('hit','foe_rift_wisp-hit-r1',REACT_HIT),('down','foe_rift_wisp-down-r1',REACT_DOWN),('hover','foe_rift_wisp-hover-r1',HOVER)]},
 'crawler':{'seed':'foe_shard_crawler','factor':.5,'centre':'foot','air':False,'thr':80,
  'order':[('attack','foe_shard_crawler-crystal-stab-r1',ACT),('alias',None,None),('hit','foe_shard_crawler-hit-r1',REACT_HIT),('down','foe_shard_crawler-down-r1',REACT_DOWN)]},
}
manifest=json.loads((ROOT/'src/game/visuals/unit-atlases.json').read_text());report={}
for key,spec in STRIPS.items():
 FACTOR=spec['factor'];centre=spec['centre'];thr=spec['thr']
 idle,seed_area=seed_cell(HERE/'seeds'/f"{spec['seed']}.png",FACTOR,centre,thr);cache={};transforms=[];strip_report={}
 def strip_cells(stripname,pick):
  if stripname not in cache:
   path=HERE/'raw'/f'{stripname}.png';raw=Image.open(path).convert('RGBA');a=np.array(raw);labels,regions=components(a[:,:,3],thr);masks=[labels==r[4] for r in regions]
   assert len(masks)==raw.width//SLOT,(stripname,len(masks))
   areas=[int((a[:,:,3][binary_dilation(m,iterations=2)]>thr).sum()) for m in masks]
   first=areas[0];scale=FACTOR*np.sqrt(seed_area/first)
   # Slot mode (floating wisp): every figure keeps its painted sideways offset from the ready figure.
   ready_x=np.where(binary_dilation(masks[0],iterations=2)&(a[:,:,3]>thr))[1].mean()
   tiles=[tile_of(a,m,scale,centre,thr,anchor=ready_x+i*SLOT) for i,m in enumerate(masks)];cache[stripname]=(scale,tiles)
   strip_report[stripname]={'rawSize':raw.size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'figures':len(masks),'scale':scale,'referenceArea':first}
  scale,tiles=cache[stripname];cells=[];base_bottom=tiles[0][4];base_height=tiles[0][5]
  # An airborne strip that sinks below the sole line moves up uniformly just enough to keep the lowest pose at y<=500.
  lift=max(0,max((t[4]-base_bottom)*scale for t in tiles)-(500-SOLE-2)) if spec['air'] else 0
  for p in pick:
   if p is None:cells.append(idle);continue
   tile,fx,sy,_,raw_bottom,_,_=tiles[p];offset=(raw_bottom-base_bottom)*scale
   natural=spec['air'] or abs(raw_bottom-base_bottom)>GROUND_TOLERANCE*base_height
   cell,pos=place(tile,fx,sy-offset+lift if natural else sy);cells.append(cell);transforms.append({'strip':stripname,'figure':p,'position':pos[:2],'slide':pos[2],'centreX':fx,'soleY':sy,'natural':bool(natural),'offsetPx':round(float(offset),1),'lift':round(float(lift),1)})
  return cells
 cells=[idle];clips={}
 for name,stripname,pick in spec['order']:
  if name=='alias':cells+=[idle]*8;continue
  block=strip_cells(stripname,pick);clips[name]=len(cells);cells+=block
 unique={};ids=[];boxes=[]
 for cell in cells:
  box=cell.getchannel('A').getbbox();digest=hashlib.sha256(cell.tobytes()).hexdigest();unique.setdefault(digest,cell.crop(box));ids.append(digest);boxes.append(box)
 options=[]
 for width in [512,768,1024,1280,1536,2048]:
  plan=pack(unique,width)
  if plan and plan[1]<=4096:options.append((width*plan[1],width,plan))
 _,width,(positions,height)=min(options);atlas=Image.new('RGBA',(width,height))
 for digest,tile in unique.items():atlas.paste(tile,positions[digest])
 buf=io.BytesIO();atlas.save(buf,format='WEBP',lossless=True,exact=True,method=6);encoded=buf.getvalue();image_name=f'{key}_a8.{hashlib.sha256(encoded).hexdigest()[:12]}.webp'
 decoded=Image.open(io.BytesIO(encoded)).convert('RGBA');frames={}
 for i,(digest,box) in enumerate(zip(ids,boxes)):
  x,y=positions[digest];tile=unique[digest];left,top,right,bottom=box
  frames[str(i)]={'frame':{'x':x,'y':y,'w':tile.width,'h':tile.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':left,'y':top,'w':right-left,'h':bottom-top},'sourceSize':{'w':512,'h':512}}
  rebuilt=Image.new('RGBA',(512,512));rebuilt.paste(decoded.crop((x,y,x+tile.width,y+tile.height)),(left,top));aa=np.array(cells[i]);bb=np.array(rebuilt);assert np.array_equal(aa[:,:,3],bb[:,:,3]);assert np.array_equal(aa[aa[:,:,3]>0],bb[aa[:,:,3]>0])
 data={'frames':frames,'meta':{'image':image_name,'size':{'w':width,'h':height},'scale':'1'}};encoded_json=json.dumps(data,sort_keys=True,separators=(',',':')).encode();json_name=f'{key}_a8.{hashlib.sha256(encoded_json).hexdigest()[:12]}.json'
 if '--write' in sys.argv:
  (OUT/image_name).write_bytes(encoded);(OUT/json_name).write_bytes(encoded_json)
  for old in OUT.glob(f'{key}_a8.*'):
   if old.name not in (image_name,json_name):old.unlink()
 manifest[key]={'image':image_name,'atlas':json_name,'width':width,'height':height,'frames':len(cells),'decodedBytes':width*height*4,'downloadBytes':len(encoded)+len(encoded_json)}
 print(key,manifest[key],clips)
 assert width*height*4<=6*1024*1024,(key,'decoded budget',manifest[key]);assert len(encoded)+len(encoded_json)<=1_500_000,(key,'download budget',manifest[key])
 rows=(len(cells)+7)//8;preview=Image.new('RGB',(1024,rows*150),(13,23,44));draw=ImageDraw.Draw(preview)
 for i,cell in enumerate(cells):
  tile=cell.resize((128,128),Image.Resampling.LANCZOS);preview.paste(tile,((i%8)*128,(i//8)*150),tile);draw.text(((i%8)*128+4,(i//8)*150+128),str(i),fill='white')
 preview.save(HERE/f'{key}-preview.png')
 report[key]={'factor':FACTOR,'displayRatio':1/FACTOR,'cell':512,'origin':[.5,SOLE/512],'seedArea':seed_area,'clipStarts':clips,'strips':strip_report,'transforms':transforms,'uniqueFrames':len(unique),'losslessReconstruction':'all alpha and visible RGBA equal',**manifest[key]}
if '--write' in sys.argv:
 (ROOT/'src/game/visuals/unit-atlases.json').write_text(json.dumps(manifest,indent=2)+'\n');(HERE/'validation-normalized.json').write_text(json.dumps(report,indent=2)+'\n')
