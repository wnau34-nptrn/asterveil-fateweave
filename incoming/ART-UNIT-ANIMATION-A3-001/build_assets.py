"""A3 normalization: Seren (healer) and Hollow Mycon (foe_mycon).

Raw ImageGen strips are never edited. Each strip gets ONE scale (never per pose), derived from the
visible area of its first (ready) figure against the shipped seed, a common sole line (y=496) and
a common foot-centre column (x=256). Edge colour is defringed from the nearest opaque pixel, then
lossless trim/dedup/pack. Owner selection 2026-10-28: Seren staff attack = R2, Mycon cast = R2.
Atlas frame layout is documented in FRAMES below and mirrored in src/game/visuals/unit-frames.ts.
"""
from pathlib import Path
from PIL import Image,ImageDraw
from scipy.ndimage import label,find_objects,binary_dilation,binary_erosion,grey_dilation,distance_transform_edt
import numpy as np
import hashlib,json,io,sys
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent;OUT=ROOT/'public/assets/units'
RAW=HERE/'raw';SEEDS=HERE/'seeds';FACTORS={'seren':.36,'mycon':.5};FACTOR=.5;SOLE=496;FOOT_X=256
def pack(tiles,width):
 x=y=2;row=0;positions={}
 for key,tile in sorted(tiles.items(),key=lambda p:(-p[1].height,-p[1].width,p[0])):
  if tile.width+4>width:return None
  if x+tile.width+2>width:y+=row+4;x=2;row=0
  positions[key]=(x,y);x+=tile.width+4;row=max(row,tile.height)
 return positions,y+row+2
def components(alpha,minimum=1500):
 labels,_=label(alpha>80);counts=np.bincount(labels.ravel())
 return labels,sorted([(b[1].start,b[0].start,b[1].stop,b[0].stop,i) for i,b in enumerate(find_objects(labels),1) if counts[i]>minimum])
def split_attack_r2(mask,a):
 """Hand-set ownership for the four touching figures of seren-attack-r2 (poses 3-6), read from
 zoomed crops: pose 4's staff gem overlaps pose 5's robe at x1435-1555, y500-610, pose 5's gem star tip (x<=1830, y>=538) sits against pose 6's cape tail (x>=1822 above y538)."""
 y,x=np.mgrid[0:mask.shape[0],0:mask.shape[1]]
 p3=x<1091;r,g,b=[a[:,:,k].astype(int) for k in range(3)];staffy=((r>=170)&(g>=120)&(b<=130))|((g>r+20)&(g>b))
 # The cross tip overlaps pose 5's boot (brown): take only gold/green pixels there.
 p4=(x>=1091)&((x<1445)|((y>=498)&(x<1536))|((y>=558)&(x<1566)&staffy));p6=((y<538)&(x>=1822))|((y>=538)&(x>=1832));p5=~(p3|p4|p6)
 return [mask&p3,mask&p4,mask&p5,mask&p6]
def poses_of(name,count):
 raw=Image.open(RAW/f'{name}.png').convert('RGBA');a=np.array(raw);labels,regions=components(a[:,:,3])
 if len(regions)==count:masks=[labels==r[4] for r in sorted(regions)];notes=None
 else:
  # Find the merged component (several figures) and split it; the others are single figures.
  masks=[];notes=[]
  merged=max(regions,key=lambda r:(r[2]-r[0])*(r[3]-r[1]));single=[r for r in regions if r!=merged]
  assert name=='seren-attack-r2' and count-len(single)==4;parts=split_attack_r2(labels==merged[4],a);notes.append({'mergedBox':merged[:4],'split':'manual ownership rules in split_attack_r2'})
  items=[(r[0],labels==r[4]) for r in single]+[(int(np.where(m.any(0))[0][0]),m) for m in parts];masks=[m for _,m in sorted(items,key=lambda p:p[0])]
 return raw,a,masks,notes
def tile_of(a,mask,scale):
 """Defringe, mask, crop and scale ONE figure; returns (RGBA tile, foot centre x, sole y in tile)."""
 # Neighbour fragments that survived the split: drop small islands that are not near the main figure.
 islands,count=label(mask);sizes=np.bincount(islands.ravel());sizes[0]=0;near=binary_dilation(islands==sizes.argmax(),iterations=14)
 for i in range(1,count+1):
  if sizes[i]<400 and not (near&(islands==i)).any():mask=mask&(islands!=i)
 mask=binary_dilation(mask,iterations=2);alpha=np.where(mask,a[:,:,3],0);alpha=np.where(alpha<4,0,alpha).astype(np.uint8)
 solid=alpha>=250;_,idx=distance_transform_edt(~solid,return_indices=True);rgb=a[:,:,:3][idx[0],idx[1]]
 soft=(alpha>0)&(alpha<250);out=a[:,:,:3].copy();out[soft]=rgb[soft]
 ys,xs=np.where(alpha>80);box=(xs.min()-2,ys.min()-2,xs.max()+3,ys.max()+3);box=(max(0,box[0]),max(0,box[1]),min(a.shape[1],box[2]),min(a.shape[0],box[3]))
 height=ys.max()-ys.min()+1;band=(alpha>80)&(np.arange(a.shape[0])[:,None]>ys.max()-max(8,int(.12*height)));foot=np.where(band.any(0))[0];foot_x=(foot.min()+foot.max())/2
 img=Image.fromarray(np.dstack([out,alpha])).crop(box);img=img.resize((max(1,round(img.width*scale)),max(1,round(img.height*scale))),Image.Resampling.LANCZOS)
 return img,(foot_x-box[0])*scale,(ys.max()+1-box[1])*scale,int((alpha>80).sum())
def place(tile,foot_x,sole_y):
 x=round(FOOT_X-foot_x);y=round(SOLE-sole_y);assert x>=0 and y>=0 and x+tile.width<=512 and y+tile.height<=512,(x,y,tile.size)
 cell=Image.new('RGBA',(512,512));cell.alpha_composite(tile,(x,y));return cell,[x,y]
def seed_cell(name):
 raw=Image.open(SEEDS/f'{name}-seed.png').convert('RGBA');a=np.array(raw);labels,regions=components(a[:,:,3],5000)
 main=max(regions,key=lambda r:(labels==r[4]).sum());mask=labels==main[4]
 tile,foot_x,sole_y,area=tile_of(a,mask,FACTOR);cell,pos=place(tile,foot_x,sole_y);return cell,area
# Each clip: eight cells = four prepare + four recover; recover[0] is the contact pose. None = seed idle.
STRIPS={
 'seren':{'seed':'seren','clips':{
  'attack':('seren-attack-r2',6,[None,1,2,2,3,4,5,None]),'heal':('seren-heal-r1',6,[None,1,2,2,3,4,5,None]),
  'prayer':('seren-prayer-r1',6,[None,1,2,3,4,4,5,None]),'sanctuary':('seren-sanctuary-r1',6,[None,1,2,2,3,4,5,None])},
  'hit':('seren-hit-r1',4,[1,2]),'down':('seren-down-r1',4,[0,2,3]),'block':('seren-block-r1',4,[1,2]),
  'order':['idle','attack','heal','hit','down','prayer','sanctuary','block']},
 'mycon':{'seed':'hollow-mycon','clips':{'skill':('hollow-mycon-cast-r2',6,[None,1,2,2,3,4,4,None])},
  'hit':('hollow-mycon-hit-r1',4,[1,2]),'down':('hollow-mycon-down-r1',4,[0,2,3]),
  'order':['idle','alias8','skill','hit','down']},
}
manifest=json.loads((ROOT/'src/game/visuals/unit-atlases.json').read_text());report={}
for ident_name,spec in STRIPS.items():
 FACTOR=FACTORS[ident_name]
 idle,seed_area=seed_cell(spec['seed']);cache={};transforms=[];strip_report={}
 def strip_cells(stripname,count,pick):
  if stripname not in cache:
   raw,a,masks,notes=poses_of(stripname,count);assert len(masks)==count
   # Scale from the first figure's visible area against the seed. Down strips begin in a buckle,
   # which keeps nearly the same mass as the ready pose, so the same rule is used (checked visually).
   first=int((a[:,:,3][binary_dilation(masks[0],iterations=2)]>80).sum());scale=FACTOR*np.sqrt(seed_area/first)
   tiles=[tile_of(a,m,scale) for m in masks];cache[stripname]=(scale,tiles,notes)
   soles=[t[2]/scale for t in tiles];strip_report[stripname]={'rawSize':raw.size,'sha256':hashlib.sha256((RAW/f'{stripname}.png').read_bytes()).hexdigest(),'scale':scale,'firstFigureArea':first,'splitNotes':notes}
  scale,tiles,_=cache[stripname];cells=[]
  for p in pick:
   if p is None:cells.append(idle);continue
   tile,foot_x,sole_y,_=tiles[p];cell,pos=place(tile,foot_x,sole_y);cells.append(cell);transforms.append({'strip':stripname,'figure':p,'position':pos,'footX':foot_x,'soleY':sole_y})
  return cells
 cells=[idle]
 clips={}
 for part in spec['order'][1:]:
  if part=='alias8':cells+=[idle]*8
  elif part in spec['clips']:
   stripname,count,pick=spec['clips'][part];block=strip_cells(stripname,count,pick);clips[part]=len(cells);cells+=block
  else:
   stripname,count,pick=spec[part];block=strip_cells(stripname,count,pick);clips[part]=len(cells);cells+=block
 unique={};ids=[];boxes=[]
 for cell in cells:
  box=cell.getchannel('A').getbbox();digest=hashlib.sha256(cell.tobytes()).hexdigest();unique.setdefault(digest,cell.crop(box));ids.append(digest);boxes.append(box)
 options=[]
 for width in [512,768,1024,1280,1536,2048]:
  plan=pack(unique,width)
  if plan and plan[1]<=4096:options.append((width*plan[1],width,plan))
 _,width,(positions,height)=min(options);atlas=Image.new('RGBA',(width,height))
 for digest,tile in unique.items():atlas.paste(tile,positions[digest])
 buf=io.BytesIO();atlas.save(buf,format='WEBP',lossless=True,exact=True,method=6);encoded=buf.getvalue();image_name=f'{ident_name}_a3.{hashlib.sha256(encoded).hexdigest()[:12]}.webp'
 decoded=Image.open(io.BytesIO(encoded)).convert('RGBA');frames={}
 for i,(digest,box) in enumerate(zip(ids,boxes)):
  x,y=positions[digest];tile=unique[digest];left,top,right,bottom=box
  frames[str(i)]={'frame':{'x':x,'y':y,'w':tile.width,'h':tile.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':left,'y':top,'w':right-left,'h':bottom-top},'sourceSize':{'w':512,'h':512}}
  rebuilt=Image.new('RGBA',(512,512));rebuilt.paste(decoded.crop((x,y,x+tile.width,y+tile.height)),(left,top));aa=np.array(cells[i]);bb=np.array(rebuilt);assert np.array_equal(aa[:,:,3],bb[:,:,3]);assert np.array_equal(aa[aa[:,:,3]>0],bb[aa[:,:,3]>0])
 data={'frames':frames,'meta':{'image':image_name,'size':{'w':width,'h':height},'scale':'1'}};encoded_json=json.dumps(data,sort_keys=True,separators=(',',':')).encode();json_name=f'{ident_name}_a3.{hashlib.sha256(encoded_json).hexdigest()[:12]}.json'
 if '--write' in sys.argv:
  (OUT/image_name).write_bytes(encoded);(OUT/json_name).write_bytes(encoded_json)
  for old in OUT.glob(f'{ident_name}_a3.*'):
   if old.name not in (image_name,json_name):old.unlink()
 key={'seren':'seren','mycon':'mycon'}[ident_name]
 manifest[key]={'image':image_name,'atlas':json_name,'width':width,'height':height,'frames':len(cells),'decodedBytes':width*height*4,'downloadBytes':len(encoded)+len(encoded_json)}
 assert width*height*4<=6*1024*1024,(key,'decoded budget',manifest[key]);assert len(encoded)+len(encoded_json)<=1_500_000,(key,'download budget',manifest[key])
 rows=(len(cells)+7)//8;preview=Image.new('RGB',(1024,rows*150),(13,23,44));draw=ImageDraw.Draw(preview)
 for i,cell in enumerate(cells):
  tile=cell.resize((128,128),Image.Resampling.LANCZOS);preview.paste(tile,((i%8)*128,(i//8)*150),tile);draw.text(((i%8)*128+4,(i//8)*150+128),str(i),fill='white')
 preview.save(HERE/f'{ident_name}-preview.png')
 report[key]={'factor':FACTOR,'displayRatio':1/FACTOR,'cell':512,'origin':[.5,SOLE/512],'seedArea':seed_area,'clipStarts':clips,'strips':strip_report,'transforms':transforms,'uniqueFrames':len(unique),'losslessReconstruction':'all alpha and visible RGBA equal',**manifest[key]}
if '--write' in sys.argv:
 (ROOT/'src/game/visuals/unit-atlases.json').write_text(json.dumps(manifest,indent=2)+'\n');(HERE/'validation-normalized.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:{x:v[x] for x in ['frames','uniqueFrames','decodedBytes','downloadBytes','clipStarts']} for k,v in report.items()},indent=1))
