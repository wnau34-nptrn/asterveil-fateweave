"""Whole-strip normalization: ONE scale per identity, common sole/grid anchor.
Lossless trim/dedup/pack follows normalization. Never rescales a pose independently.
"""
from pathlib import Path
from PIL import Image,ImageDraw
from scipy.ndimage import label,find_objects,binary_dilation
import numpy as np
import hashlib,json,io
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent;OUT=ROOT/'public/assets/units'
def pack(tiles,width):
 x=y=2;row=0;positions={}
 for key,tile in sorted(tiles.items(),key=lambda p:(-p[1].height,-p[1].width,p[0])):
  if tile.width+4>width:return None
  if x+tile.width+2>width:y+=row+4;x=2;row=0
  positions[key]=(x,y);x+=tile.width+4;row=max(row,tile.height)
 return positions,y+row+2
manifest=json.loads((ROOT/'src/game/visuals/unit-atlases.json').read_text());report={}
for name in ['aegis','vargoth']:
 raw=Image.open(HERE/f'{name}-raw.png').convert('RGBA');a=np.array(raw)
 labels,_=label(a[:,:,3]>80);counts=np.bincount(labels.ravel());regions=[]
 for ident,b in enumerate(find_objects(labels),1):
  if counts[ident]>1500:regions.append((ident,(b[1].start,b[0].start,b[1].stop,b[0].stop)))
 # ImageGen changed the requested layout. Explicit observed row bands, never assume requested slots.
 bands=[(330,350,7),(500,520,7),(675,690,7),(830,850,4),(990,1024,4)] if name=='aegis' else [(200,240,6),(600,620,8),(800,820,4),(990,1024,4)]
 rows=[]
 for top,bottom,n in bands:
  row=sorted([r for r in regions if top<=r[1][3]<=bottom],key=lambda r:r[1][0]);assert len(row)==n,(name,top,len(row));rows.append(row)
 seed=Image.open(HERE/f'{name}-seed.png').convert('RGBA');bbox=seed.getchannel('A').point(lambda v:255 if v>80 else 0).getbbox()
 factor=.36 if name=='aegis' else .5
 reference=rows[0][0][1];scale=(bbox[3]-bbox[1])*factor/(reference[3]-reference[1])
 idle=Image.new('RGBA',(512,512));idle.alpha_composite(seed.resize((round(512*factor),round(512*factor)),Image.Resampling.LANCZOS),(round(256-256*factor),496-round(bbox[3]*factor)))
 transforms=[]
 def pose(row,col):
  ident,(left,top,right,bottom)=rows[row][col];mask=binary_dilation(labels==ident,iterations=2);pixels=a.copy();pixels[:,:,3]=np.where(mask,pixels[:,:,3],0);pixels[:,:,3]=np.where(pixels[:,:,3]<4,0,pixels[:,:,3])
  box=(max(0,left-2),max(0,top-2),min(raw.width,right+2),min(raw.height,bottom+2));tile=Image.fromarray(pixels).crop(box);tile=tile.resize((round(tile.width*scale),round(tile.height*scale)),Image.Resampling.LANCZOS)
  # Fixed row grid X; all soles share Y496. Down retains its falling silhouette, no height normalization.
  anchor=(344+280*col if row==2 else 276+320*col) if name=='vargoth' and row>=2 else (col+.5)*raw.width/len(rows[row]);x=round(256+(box[0]-anchor)*scale);y=496-round((bottom-box[1])*scale)
  assert x>=0 and y>=0 and x+tile.width<=512 and y+tile.height<=512,(name,row,col,x,y,tile.size)
  cell=Image.new('RGBA',(512,512));cell.alpha_composite(tile,(x,y));transforms.append({'row':row,'column':col,'sourceBox':box,'gridAnchorX':anchor,'position':[x,y]});return cell
 if name=='aegis':
  attack=[idle]+[pose(0,c) for c in [1,2,3,4,5,6]]+[idle]
  support=[idle]+[pose(2,c) for c in [1,2,3,4,5,6]]+[idle]
  bash=[idle]+[pose(1,c) for c in [1,2,3,4,5,6]]+[idle]
  hit=[pose(3,c) for c in [0,1]];down=[pose(4,c) for c in [0,2,3]];block=[pose(3,c) for c in [0,3]]
  cells=[idle]+attack+support+hit+down+bash+block
 else:
  attack=[idle]+[pose(0,c) for c in [1,2,3,4,4,5]]+[idle]
  support=[idle]+[pose(1,c) for c in [1,2,3,4,5,6]]+[idle]
  hit=[pose(2,c) for c in [0,1]];down=[pose(3,c) for c in [0,2,3]];block=[pose(2,c) for c in [0,3]]
  cells=[idle]+attack+support+hit+down+block
  # Separate whole-strip edit has a different source resolution. Normalize the ENTIRE
  # eight-pose strip once against its seed-sized reference, never per pose.
  shield=Image.open(HERE/'vargoth-shield-raw.png').convert('RGBA');sa=np.array(shield);sl,_=label(sa[:,:,3]>80);sc=np.bincount(sl.ravel())
  sr=[(i,(b[1].start,b[0].start,b[1].stop,b[0].stop)) for i,b in enumerate(find_objects(sl),1) if sc[i]>2500]
  assert len(sr)==8
  sr=sorted([r for r in sr if r[1][1]<512],key=lambda r:r[1][0])+sorted([r for r in sr if r[1][1]>=512],key=lambda r:r[1][0])
  shield_scale=(bbox[3]-bbox[1])*factor/(sr[0][1][3]-sr[0][1][1]);bash=[idle]
  for idx in range(1,7):
   ident,(left,top,right,bottom)=sr[idx];mask=binary_dilation(sl==ident,iterations=2);pixels=sa.copy();pixels[:,:,3]=np.where(mask,pixels[:,:,3],0);pixels[:,:,3]=np.where(pixels[:,:,3]<4,0,pixels[:,:,3])
   box=(max(0,left-2),max(0,top-2),min(shield.width,right+2),min(shield.height,bottom+2));tile=Image.fromarray(pixels).crop(box);tile=tile.resize((round(tile.width*shield_scale),round(tile.height*shield_scale)),Image.Resampling.LANCZOS)
   anchor=(idx%4+.5)*shield.width/4;x=round(256+(box[0]-anchor)*shield_scale);y=496-round((bottom-box[1])*shield_scale)
   assert x>=0 and y>=0 and x+tile.width<=512 and y+tile.height<=512
   cell=Image.new('RGBA',(512,512));cell.alpha_composite(tile,(x,y));bash.append(cell);transforms.append({'source':'vargoth-shield-raw.png','column':idx%4,'row':idx//4,'scale':shield_scale,'sourceBox':box,'gridAnchorX':anchor,'position':[x,y]})
  cells+=bash+[idle]
 unique={};ids=[];boxes=[]
 for cell in cells:
  box=cell.getchannel('A').getbbox();ident=hashlib.sha256(cell.tobytes()).hexdigest();unique.setdefault(ident,cell.crop(box));ids.append(ident);boxes.append(box)
 options=[]
 for width in [512,768,1024,1280,1536,2048]:
  plan=pack(unique,width)
  if plan and plan[1]<=4096:options.append((width*plan[1],width,plan))
 _,width,(positions,height)=min(options);atlas=Image.new('RGBA',(width,height))
 for ident,tile in unique.items():atlas.paste(tile,positions[ident])
 buf=io.BytesIO();atlas.save(buf,format='WEBP',lossless=True,exact=True,method=6);encoded=buf.getvalue();image_name=f'{name}_a2.{hashlib.sha256(encoded).hexdigest()[:12]}.webp';(OUT/image_name).write_bytes(encoded)
 decoded=Image.open(io.BytesIO(encoded)).convert('RGBA');frames={}
 for i,(ident,box) in enumerate(zip(ids,boxes)):
  x,y=positions[ident];tile=unique[ident];left,top,right,bottom=box
  frames[str(i)]={'frame':{'x':x,'y':y,'w':tile.width,'h':tile.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':left,'y':top,'w':right-left,'h':bottom-top},'sourceSize':{'w':512,'h':512}}
  rebuilt=Image.new('RGBA',(512,512));rebuilt.paste(decoded.crop((x,y,x+tile.width,y+tile.height)),(left,top));aa=np.array(cells[i]);bb=np.array(rebuilt);assert np.array_equal(aa[:,:,3],bb[:,:,3]);assert np.array_equal(aa[aa[:,:,3]>0],bb[aa[:,:,3]>0])
 data={'frames':frames,'meta':{'image':image_name,'size':{'w':width,'h':height},'scale':'1'}};encoded_json=json.dumps(data,sort_keys=True,separators=(',',':')).encode();json_name=f'{name}_a2.{hashlib.sha256(encoded_json).hexdigest()[:12]}.json';(OUT/json_name).write_bytes(encoded_json)
 manifest[name]={'image':image_name,'atlas':json_name,'width':width,'height':height,'frames':len(cells),'decodedBytes':width*height*4,'downloadBytes':len(encoded)+len(encoded_json)}
 assert width*height*4<=6*1024*1024,(name,'decoded budget',manifest[name]);assert len(encoded)+len(encoded_json)<=1_500_000,(name,'download budget',manifest[name])
 preview=Image.new('RGB',(1024,((len(cells)+7)//8)*150),(13,23,44));draw=ImageDraw.Draw(preview)
 for i,cell in enumerate(cells):
  tile=cell.resize((128,128),Image.Resampling.LANCZOS);preview.paste(tile,((i%8)*128,(i//8)*150),tile);draw.text(((i%8)*128+4,(i//8)*150+128),str(i),fill='white')
 preview.save(HERE/f'{name}-preview.png')
 report[name]={'scale':scale,'factor':factor,'displayRatio':1/factor,'cell':512,'origin':[.5,496/512],'rawSize':raw.size,'sourceSha256':hashlib.sha256((HERE/f'{name}-raw.png').read_bytes()).hexdigest(),'transforms':transforms,'lockedToSeed':[0,1,8,9,16]+([22,29] if name=='aegis' else [24,31]),**({'shieldStripScale':shield_scale,'shieldRawSize':shield.size,'shieldSourceSha256':hashlib.sha256((HERE/'vargoth-shield-raw.png').read_bytes()).hexdigest()} if name=='vargoth' else {}),'uniqueFrames':len(unique),'losslessReconstruction':'all alpha and visible RGBA equal',**manifest[name]}
(ROOT/'src/game/visuals/unit-atlases.json').write_text(json.dumps(manifest,indent=2)+'\n');(HERE/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:{x:v[x] for x in ['scale','frames','uniqueFrames','decodedBytes','downloadBytes']} for k,v in report.items()},indent=2))
