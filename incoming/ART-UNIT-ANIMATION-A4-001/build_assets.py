"""A4 normalization: Mira (archer), Toma (alchemist), Dew Slime, Ember Slime, Ruin Bat.

Raw ImageGen strips are never edited. Each strip gets ONE scale (never per pose), derived from the
visible area of its first (ready) figure against the shipped seed. Grounded poses sit on the common
sole line (y=496) and foot-centre column (x=256); airborne/jump poses keep their natural height
relative to the strip's ready figure instead of being bottom-aligned. Edge colour is defringed from
the nearest opaque pixel, then lossless trim/dedup/pack. Owner selection 2026-10-28 ("use Codex's
recommendation"): R2 for Mira volley/disengage, Toma underhand and Ruin Bat hover; the preferred
candidate everywhere else. Frame layout is mirrored in src/game/visuals/unit-frames.ts.
"""
from pathlib import Path
from PIL import Image,ImageDraw
from scipy.ndimage import label,find_objects,binary_dilation,distance_transform_edt
import numpy as np
import hashlib,json,io,sys
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent;OUT=ROOT/'public/assets/units'
SOLE=496;FOOT_X=256;GROUND_TOLERANCE=.06
def pack(tiles,width):
 x=y=2;row=0;positions={}
 for key,tile in sorted(tiles.items(),key=lambda p:(-p[1].height,-p[1].width,p[0])):
  if tile.width+4>width:return None
  if x+tile.width+2>width:y+=row+4;x=2;row=0
  positions[key]=(x,y);x+=tile.width+4;row=max(row,tile.height)
 return positions,y+row+2
def components(alpha,minimum=300):
 labels,_=label(alpha>80);counts=np.bincount(labels.ravel())
 return labels,sorted([(b[1].start,b[0].start,b[1].stop,b[0].stop,i) for i,b in enumerate(find_objects(labels),1) if counts[i]>minimum])
def tile_of(a,mask,scale,centre):
 """Defringe, mask, crop and scale ONE figure -> (tile, centre x in tile, sole y in tile, visible area, raw sole y)."""
 islands,count=label(mask);sizes=np.bincount(islands.ravel());sizes[0]=0;near=binary_dilation(islands==sizes.argmax(),iterations=14)
 for i in range(1,count+1):
  if sizes[i]<400 and not (near&(islands==i)).any():mask=mask&(islands!=i)
 mask=binary_dilation(mask,iterations=2);alpha=np.where(mask,a[:,:,3],0);alpha=np.where(alpha<4,0,alpha).astype(np.uint8)
 solid=alpha>=250;_,idx=distance_transform_edt(~solid,return_indices=True);rgb=a[:,:,:3][idx[0],idx[1]]
 soft=(alpha>0)&(alpha<250);out=a[:,:,:3].copy();out[soft]=rgb[soft]
 ys,xs=np.where(alpha>80);box=(xs.min()-2,ys.min()-2,xs.max()+3,ys.max()+3);box=(max(0,box[0]),max(0,box[1]),min(a.shape[1],box[2]),min(a.shape[0],box[3]))
 height=ys.max()-ys.min()+1
 if centre=='centroid':foot_x=xs.mean()
 else:
  band=(alpha>80)&(np.arange(a.shape[0])[:,None]>ys.max()-max(8,int(.12*height)));foot=np.where(band.any(0))[0];foot_x=(foot.min()+foot.max())/2
 img=Image.fromarray(np.dstack([out,alpha])).crop(box);img=img.resize((max(1,round(img.width*scale)),max(1,round(img.height*scale))),Image.Resampling.LANCZOS)
 return img,(foot_x-box[0])*scale,(ys.max()+1-box[1])*scale,int((alpha>80).sum()),int(ys.max()+1),height
def place(tile,foot_x,sole_y):
 x=round(FOOT_X-foot_x);y=round(SOLE-sole_y);assert x>=0 and y>=0 and x+tile.width<=512,(x,y,tile.size)
 cell=Image.new('RGBA',(512,512));cell.alpha_composite(tile,(x,y));return cell,[x,y]
def seed_cell(path,factor,centre):
 raw=Image.open(path).convert('RGBA');a=np.array(raw);labels,regions=components(a[:,:,3],5000)
 main=max(regions,key=lambda r:(labels==r[4]).sum());mask=labels==main[4]
 tile,fx,sy,area,_,_=tile_of(a,mask,factor,centre);cell,pos=place(tile,fx,sy);return cell,area
# clips: name -> (strip, picks) with eight cells per clip = four prepare + four recover (contact = recover[0]).
# Pick indexes are 0-based figures; None = seed idle. Reactions list their figures directly.
ACT=[None,1,2,2,3,4,5,None]
STRIPS={
 'mira':{'folder':'heroes','seed':'mira','factor':.42,'centre':'foot','air':False,
  'order':[('attack','mira-single-arrow-r1',ACT),('skill','mira-volley-r2',ACT),('hit','mira-hit-r1',[1,2]),('down','mira-down-r1',[1,3,5]),('disengage','mira-disengage-r2',ACT),('block','mira-block-r1',[1,2])]},
 'toma':{'folder':'heroes','seed':'toma','factor':.42,'centre':'foot','air':False,
  'order':[('attack','toma-overhand-r1',ACT),('skill','toma-underhand-r2',ACT),('hit','toma-hit-r1',[1,2]),('down','toma-down-r1',[1,3,5]),('block','toma-block-r1',[1,2])]},
 'dew':{'folder':'foes','seed':'foe_dew_slime','factor':.5,'centre':'foot','air':False,
  'order':[('attack','foe_dew_slime-jelly-bounce-r1',ACT),('alias',None,None),('hit','foe_dew_slime-hit-r1',[1,2]),('down','foe_dew_slime-down-r1',[1,3,5])]},
 'ember':{'folder':'foes','seed':'foe_ember_slime','factor':.5,'centre':'foot','air':False,
  'order':[('alias',None,None),('skill','foe_ember_slime-ember-spark-r1',ACT),('hit','foe_ember_slime-hit-r1',[1,2]),('down','foe_ember_slime-down-r1',[1,3,5])]},
 'bat':{'folder':'foes','seed':'foe_ruin_bat','factor':.5,'centre':'centroid','air':True,
  'order':[('attack','foe_ruin_bat-swoop-bite-r1',ACT),('alias',None,None),('hit','foe_ruin_bat-hit-r1',[1,2]),('down','foe_ruin_bat-down-r1',[1,3,5]),('hover','foe_ruin_bat-hover-r2',[0,1,2,3])]},
}
manifest=json.loads((ROOT/'src/game/visuals/unit-atlases.json').read_text());report={}
for key,spec in STRIPS.items():
 FACTOR=spec['factor'];folder=HERE/spec['folder'];centre=spec['centre']
 idle,seed_area=seed_cell(folder/'seeds'/f"{spec['seed']}-seed.png",FACTOR,centre);cache={};transforms=[];strip_report={}
 def strip_cells(stripname,pick):
  if stripname not in cache:
   raw=Image.open(folder/'raw'/f'{stripname}.png').convert('RGBA');a=np.array(raw);labels,regions=components(a[:,:,3]);masks=[labels==r[4] for r in regions]
   areas=[int((a[:,:,3][binary_dilation(m,iterations=2)]>80).sum()) for m in masks]
   # A flapping loop starts with wings folded upward (little area): use the mean of the loop so body size matches the seed.
   first=int(np.mean(areas)) if stripname.endswith('hover-r2') else areas[0];scale=FACTOR*np.sqrt(seed_area/first)
   tiles=[tile_of(a,m,scale,centre) for m in masks];cache[stripname]=(scale,tiles)
   strip_report[stripname]={'rawSize':raw.size,'sha256':hashlib.sha256((folder/'raw'/f'{stripname}.png').read_bytes()).hexdigest(),'figures':len(masks),'scale':scale,'referenceArea':first}
  scale,tiles=cache[stripname];cells=[];base_bottom=tiles[0][4];base_height=tiles[0][5]
  # Airborne strips that end grounded (the bat's fall) would overflow the cell below the sole line; move the
  # whole strip up uniformly so the lowest pose rests at y<=500 and every relative height is preserved.
  lift=max(0,max((t[4]-base_bottom)*scale for t in tiles)-2) if spec['air'] else 0
  for p in pick:
   if p is None:cells.append(idle);continue
   tile,fx,sy,_,raw_bottom,_=tiles[p];offset=(raw_bottom-base_bottom)*scale
   # Airborne identities keep every pose relative to the ready figure; grounded ones snap to the sole line
   # unless the pose clearly leaves the ground (e.g. the slime's leap).
   natural=spec['air'] or abs(raw_bottom-base_bottom)>GROUND_TOLERANCE*base_height
   cell,pos=place(tile,fx,sy-offset+lift if natural else sy);cells.append(cell);transforms.append({'strip':stripname,'figure':p,'position':pos,'centreX':fx,'soleY':sy,'natural':bool(natural),'offsetPx':round(float(offset),1)})
  return cells
 cells=[idle];clips={};loop=None
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
 buf=io.BytesIO();atlas.save(buf,format='WEBP',lossless=True,exact=True,method=6);encoded=buf.getvalue();image_name=f'{key}_a4.{hashlib.sha256(encoded).hexdigest()[:12]}.webp'
 decoded=Image.open(io.BytesIO(encoded)).convert('RGBA');frames={}
 for i,(digest,box) in enumerate(zip(ids,boxes)):
  x,y=positions[digest];tile=unique[digest];left,top,right,bottom=box
  frames[str(i)]={'frame':{'x':x,'y':y,'w':tile.width,'h':tile.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':left,'y':top,'w':right-left,'h':bottom-top},'sourceSize':{'w':512,'h':512}}
  rebuilt=Image.new('RGBA',(512,512));rebuilt.paste(decoded.crop((x,y,x+tile.width,y+tile.height)),(left,top));aa=np.array(cells[i]);bb=np.array(rebuilt);assert np.array_equal(aa[:,:,3],bb[:,:,3]);assert np.array_equal(aa[aa[:,:,3]>0],bb[aa[:,:,3]>0])
 data={'frames':frames,'meta':{'image':image_name,'size':{'w':width,'h':height},'scale':'1'}};encoded_json=json.dumps(data,sort_keys=True,separators=(',',':')).encode();json_name=f'{key}_a4.{hashlib.sha256(encoded_json).hexdigest()[:12]}.json'
 if '--write' in sys.argv:
  (OUT/image_name).write_bytes(encoded);(OUT/json_name).write_bytes(encoded_json)
  for old in OUT.glob(f'{key}_a4.*'):
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
