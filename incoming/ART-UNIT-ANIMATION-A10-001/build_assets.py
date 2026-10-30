"""A10 normalization: Veil Raider (`raider`) and Rift Brute (`brute`), original-cast sheet `units`.

Raw whole-strip PNGs (1024x704 slots, exact seed lockback at (256,64) in frame 1 and, for moves, the last frame) are never edited.
Every strip gets ONE scale (never per pose): the shipped display factor 0.5 (displayRatio 2). Grounded poses sit on the common
sole line (y=496) and foot-centre column (x=256) of the packed 512 cell, the same convention as A5/A6. Raider strips already
face LEFT (owner chose the mirrored seed), so the packed atlas is never flipped again at runtime. The inherited tiny gold
fragment at the top of the old cells is part of the exact idle and is preserved untouched.
Layout mirrors src/game/visuals/unit-frames.ts: 0 idle; 1..8 attack; 9..16 skill; 17..18 hit; 19..21 down (21 = grounded
hold); 22..23 block. Contact/release is figure 4 of each six-figure move = first recover cell.
"""
from pathlib import Path
from PIL import Image,ImageDraw
from scipy.ndimage import label,binary_dilation,distance_transform_edt
import numpy as np
import hashlib,json,io,sys
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent;OUT=ROOT/'public/assets/units'
SOLE=496;FOOT_X=256;SLOT=(1024,704)
def pack(tiles,width):
 x=y=2;row=0;positions={}
 for key,tile in sorted(tiles.items(),key=lambda p:(-p[1].height,-p[1].width,p[0])):
  if tile.width+4>width:return None
  if x+tile.width+2>width:y+=row+4;x=2;row=0
  positions[key]=(x,y);x+=tile.width+4;row=max(row,tile.height)
 return positions,y+row+2
def tile_of(a,mask,scale,keep_islands):
 """Defringe, crop and scale ONE figure -> (tile, foot x in tile, sole y in tile)."""
 if not keep_islands:
  islands,count=label(mask);sizes=np.bincount(islands.ravel());sizes[0]=0;near=binary_dilation(islands==sizes.argmax(),iterations=14)
  for i in range(1,count+1):
   if sizes[i]<400 and not (near&(islands==i)).any():mask=mask&(islands!=i)
  mask=binary_dilation(mask,iterations=2)
 alpha=np.where(mask,a[:,:,3],0);alpha=np.where(alpha<4,0,alpha).astype(np.uint8)
 solid=alpha>=250;_,idx=distance_transform_edt(~solid,return_indices=True);rgb=a[:,:,:3][idx[0],idx[1]]
 soft=(alpha>0)&(alpha<250);out=a[:,:,:3].copy();out[soft]=rgb[soft]
 ys,xs=np.where(alpha>80);box=(xs.min()-2,ys.min()-2,xs.max()+3,ys.max()+3);box=(max(0,box[0]),max(0,box[1]),min(a.shape[1],box[2]),min(a.shape[0],box[3]))
 height=ys.max()-ys.min()+1
 band=(alpha>80)&(np.arange(a.shape[0])[:,None]>ys.max()-max(8,int(.12*height)));foot=np.where(band.any(0))[0];foot_x=(foot.min()+foot.max())/2
 img=Image.fromarray(np.dstack([out,alpha])).crop(box);img=img.resize((max(1,round(img.width*scale)),max(1,round(img.height*scale))),Image.Resampling.LANCZOS)
 return img,(foot_x-box[0])*scale,(ys.max()+1-box[1])*scale
def place(tile,foot_x,sole_y):
 x=round(FOOT_X-foot_x);y=round(SOLE-sole_y)
 y-=max(0,y+tile.height-500);assert x>=0 and y>=0 and x+tile.width<=512 and y+tile.height<=512,(x,y,tile.size)
 cell=Image.new('RGBA',(512,512));cell.alpha_composite(tile,(x,y));return cell,[x,y]
ACT=[None,1,2,2,3,4,5,None]
REACT_HIT=[1,2];REACT_DOWN=[1,2,3];REACT_BLOCK=[1,2]
STRIPS={
 'raider':{'factor':.5,'order':[('attack','raider-raking-slash-r1',6,ACT),('skill','raider-shadow-knife-r1',6,ACT),('hit','raider-hit-r1',4,REACT_HIT),('down','raider-down-r1',4,REACT_DOWN),('block','raider-block-r1',4,REACT_BLOCK)]},
 'brute':{'factor':.5,'order':[('attack','brute-crushing-blow-r1',6,ACT),('skill','brute-rift-bolt-r1',6,ACT),('hit','brute-hit-r1',4,REACT_HIT),('down','brute-down-r1',4,REACT_DOWN),('block','brute-block-r1',4,REACT_BLOCK)]},
}
manifest=json.loads((ROOT/'src/game/visuals/unit-atlases.json').read_text());report={}
for key,spec in STRIPS.items():
 F=spec['factor']
 seed=np.array(Image.open(HERE/'seeds'/f'{key}-seed.png').convert('RGBA'));seed_mask=seed[:,:,3]>0
 st,sfx,ssy=tile_of(seed,seed_mask,F,True);idle,idle_pos=place(st,sfx,ssy)
 cache={};strip_report={};transforms=[]
 def strip_cells(name,count,pick):
  if name not in cache:
   path=HERE/'raw'/f'{name}.png';raw=Image.open(path).convert('RGBA');assert raw.size==(SLOT[0]*count,SLOT[1])
   a=np.array(raw);tiles=[]
   for i in range(count):
    sl=a[:,i*SLOT[0]:(i+1)*SLOT[0]];tiles.append(tile_of(sl,sl[:,:,3]>0,F,False))
   cache[name]=tiles;strip_report[name]={'rawSize':raw.size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'figures':count,'scale':F}
  tiles=cache[name];cells=[]
  for p in pick:
   if p is None:cells.append(idle);continue
   tile,fx,sy=tiles[p];cell,pos=place(tile,fx,sy);cells.append(cell);transforms.append({'strip':name,'figure':p,'position':pos,'centreX':fx,'soleY':sy})
  return cells
 cells=[idle];clips={}
 for clip,name,count,pick in spec['order']:
  clips[clip]=len(cells);cells+=strip_cells(name,count,pick)
 unique={};ids=[];boxes=[]
 for cell in cells:
  box=cell.getchannel('A').getbbox();digest=hashlib.sha256(cell.tobytes()).hexdigest();unique.setdefault(digest,cell.crop(box));ids.append(digest);boxes.append(box)
 options=[]
 for width in [512,768,1024,1280,1536,2048]:
  plan=pack(unique,width)
  if plan and plan[1]<=4096:options.append((width*plan[1],width,plan))
 _,width,(positions,height)=min(options);atlas=Image.new('RGBA',(width,height))
 for digest,tile in unique.items():atlas.paste(tile,positions[digest])
 buf=io.BytesIO();atlas.save(buf,format='WEBP',lossless=True,exact=True,method=6);encoded=buf.getvalue();image_name=f'{key}_a10.{hashlib.sha256(encoded).hexdigest()[:12]}.webp'
 decoded=Image.open(io.BytesIO(encoded)).convert('RGBA');frames={}
 for i,(digest,box) in enumerate(zip(ids,boxes)):
  x,y=positions[digest];tile=unique[digest];left,top,right,bottom=box
  frames[str(i)]={'frame':{'x':x,'y':y,'w':tile.width,'h':tile.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':left,'y':top,'w':right-left,'h':bottom-top},'sourceSize':{'w':512,'h':512}}
  rebuilt=Image.new('RGBA',(512,512));rebuilt.paste(decoded.crop((x,y,x+tile.width,y+tile.height)),(left,top));aa=np.array(cells[i]);bb=np.array(rebuilt);assert np.array_equal(aa[:,:,3],bb[:,:,3]);assert np.array_equal(aa[aa[:,:,3]>0],bb[aa[:,:,3]>0])
 data={'frames':frames,'meta':{'image':image_name,'size':{'w':width,'h':height},'scale':'1'}};encoded_json=json.dumps(data,sort_keys=True,separators=(',',':')).encode();json_name=f'{key}_a10.{hashlib.sha256(encoded_json).hexdigest()[:12]}.json'
 if '--write' in sys.argv:
  (OUT/image_name).write_bytes(encoded);(OUT/json_name).write_bytes(encoded_json)
  for old in OUT.glob(f'{key}_a10.*'):
   if old.name not in (image_name,json_name):old.unlink()
 manifest[key]={'image':image_name,'atlas':json_name,'width':width,'height':height,'frames':len(cells),'decodedBytes':width*height*4,'downloadBytes':len(encoded)+len(encoded_json)}
 print(key,manifest[key],clips)
 assert width*height*4<=6*1024*1024,(key,'decoded budget',manifest[key]);assert len(encoded)+len(encoded_json)<=1_500_000,(key,'download budget',manifest[key])
 rows=(len(cells)+7)//8;preview=Image.new('RGB',(1024,rows*150),(13,23,44));draw=ImageDraw.Draw(preview)
 for i,cell in enumerate(cells):
  tile=cell.resize((128,128),Image.Resampling.LANCZOS);preview.paste(tile,((i%8)*128,(i//8)*150),tile);draw.text(((i%8)*128+4,(i//8)*150+128),str(i),fill='white')
  yy=(i//8)*150+int(128*SOLE/512);draw.line(((i%8)*128,yy,(i%8)*128+127,yy),fill=(90,90,90))
 preview.save(HERE/f'{key}-preview.png')
 report[key]={'factor':F,'displayRatio':1/F,'cell':512,'origin':[.5,SOLE/512],'idlePosition':idle_pos,'facing':'left','clipStarts':clips,'strips':strip_report,'transforms':transforms,'uniqueFrames':len(unique),'losslessReconstruction':'all alpha and visible RGBA equal',**manifest[key]}
if '--write' in sys.argv:
 (ROOT/'src/game/visuals/unit-atlases.json').write_text(json.dumps(manifest,indent=2)+'\n');(HERE/'validation-normalized.json').write_text(json.dumps(report,indent=2)+'\n')
