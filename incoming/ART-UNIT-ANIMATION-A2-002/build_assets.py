"""A2-002 Aegis: ONE scale (factor .36 of the 512 cell) for the whole strip, shared sole line y=496, lossless pack.
Cells come from cells/ exactly as delivered (cell-transforms.json already applied by Codex); only the uniform
runtime downscale + a single shared offset are applied, never per-pose scaling."""
from pathlib import Path
from PIL import Image,ImageDraw
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
manifest=json.loads((ROOT/'src/game/visuals/unit-atlases.json').read_text())
factor=.36
seed=Image.open(HERE/'cells/000.png').convert('RGBA');bottom=seed.getchannel('A').point(lambda v:255 if v>80 else 0).getbbox()[3]
size=round(512*factor);ox=round(256-256*factor);oy=496-round(bottom*factor)
def cell(n):
 c=Image.open(HERE/f'cells/{n:03d}.png').convert('RGBA');assert c.size==(512,512)
 out=Image.new('RGBA',(512,512));out.alpha_composite(c.resize((size,size),Image.Resampling.LANCZOS),(ox,oy));return out
C={n:cell(n) for n in range(26)}
idle=C[0]
# Frame layout is unchanged from A2-001: 0 idle; 1..8 slash; 9..16 raise shield; 17..18 hit; 19..21 down; 22..29 bash; 30..31 block.
cells=[idle,idle]+[C[n] for n in range(1,7)]+[idle,idle]+[C[n] for n in range(7,13)]+[idle]+[C[19],C[20]]+[C[21],C[22],C[23]]+[idle]+[C[n] for n in range(13,19)]+[idle]+[C[24],C[25]]
assert len(cells)==32
unique={};ids=[];boxes=[]
for c in cells:
 box=c.getchannel('A').getbbox();ident=hashlib.sha256(c.tobytes()).hexdigest();unique.setdefault(ident,c.crop(box));ids.append(ident);boxes.append(box)
options=[]
for width in [512,768,1024,1280,1536,2048]:
 plan=pack(unique,width)
 if plan and plan[1]<=4096:options.append((width*plan[1],width,plan))
_,width,(positions,height)=min(options);atlas=Image.new('RGBA',(width,height))
for ident,tile in unique.items():atlas.paste(tile,positions[ident])
buf=io.BytesIO();atlas.save(buf,format='WEBP',lossless=True,exact=True,method=6);encoded=buf.getvalue();image_name=f'aegis_a2.{hashlib.sha256(encoded).hexdigest()[:12]}.webp';(OUT/image_name).write_bytes(encoded)
decoded=Image.open(io.BytesIO(encoded)).convert('RGBA');frames={}
for i,(ident,box) in enumerate(zip(ids,boxes)):
 x,y=positions[ident];tile=unique[ident];left,top,right,bottom_=box
 frames[str(i)]={'frame':{'x':x,'y':y,'w':tile.width,'h':tile.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':left,'y':top,'w':right-left,'h':bottom_-top},'sourceSize':{'w':512,'h':512}}
 rebuilt=Image.new('RGBA',(512,512));rebuilt.paste(decoded.crop((x,y,x+tile.width,y+tile.height)),(left,top));aa=np.array(cells[i]);bb=np.array(rebuilt);assert np.array_equal(aa[:,:,3],bb[:,:,3]);assert np.array_equal(aa[aa[:,:,3]>0],bb[aa[:,:,3]>0])
data={'frames':frames,'meta':{'image':image_name,'size':{'w':width,'h':height},'scale':'1'}};ej=json.dumps(data,sort_keys=True,separators=(',',':')).encode();json_name=f'aegis_a2.{hashlib.sha256(ej).hexdigest()[:12]}.json';(OUT/json_name).write_bytes(ej)
old=manifest['aegis']
manifest['aegis']={'image':image_name,'atlas':json_name,'width':width,'height':height,'frames':32,'decodedBytes':width*height*4,'downloadBytes':len(encoded)+len(ej)}
assert width*height*4<=6*1024*1024 and len(encoded)+len(ej)<=1_500_000,manifest['aegis']
(ROOT/'src/game/visuals/unit-atlases.json').write_text(json.dumps(manifest,indent=2)+'\n')
preview=Image.new('RGB',(1024,4*150),(13,23,44));d=ImageDraw.Draw(preview)
for i,c in enumerate(cells):
 t=c.resize((128,128),Image.Resampling.LANCZOS);preview.paste(t,((i%8)*128,(i//8)*150),t);d.text(((i%8)*128+4,(i//8)*150+128),str(i),fill='white')
preview.save(HERE/'aegis-a2-002-preview.png')
(HERE/'build-report.json').write_text(json.dumps({'factor':factor,'displayRatio':1/factor,'offset':[ox,oy],'seedBottomAlpha80':bottom,'uniqueFrames':len(unique),'replaced':old,'new':manifest['aegis'],'frameMap':'0,1=idle;2-7=001-006;8,9=idle;10-15=007-012;16=idle;17-18=019-020;19-21=021-023;22=idle;23-28=013-018;29=idle;30-31=024-025'},indent=2)+'\n')
print(manifest['aegis'])
