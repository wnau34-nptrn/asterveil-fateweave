"""Normalize whole-sheet generation with shared scale and a fixed grid/foot anchor.
Requires Pillow/numpy/scipy. No per-frame scaling, recoloring, or pose synthesis.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
from scipy.ndimage import label,find_objects,binary_dilation
import json,shutil
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
OUT=ROOT/'public/assets/units';OUT.mkdir(parents=True,exist_ok=True)
sources={'lyra':'exec-08e71daf-67e5-4b04-b6c3-a393eff7910f.png','hunter':'exec-6e0c598f-f502-4d47-a3ad-60de2b397102.png'}
report={}
for name,src in sources.items():
 raw=HERE/(name+'-raw.png')
 if not raw.exists():shutil.copy(ROOT.parent/'generated_images'/src,raw)
 im=Image.open(raw).convert('RGBA');arr=np.array(im);labels,n=label(arr[:,:,3]>80);counts=np.bincount(labels.ravel());regions=[]
 for ident,box in enumerate(find_objects(labels),1):
  if counts[ident]>3000:
   x,y=box[1],box[0];regions.append((ident,(x.start,y.start,x.stop,y.stop)))
 assert len(regions)==24,(name,len(regions))
 # Row assignment by component bottom: generous gutters isolate whole characters including swords.
 regions.sort(key=lambda r:(round((r[1][3]-240)/256),r[1][0]))
 seed=Image.open(HERE/(name+'-seed.png')).convert('RGBA');bbox=seed.getchannel('A').point(lambda v:255 if v>80 else 0).getbbox()
 scale=(bbox[3]-bbox[1])*.5/(regions[0][1][3]-regions[0][1][1])
 frames=[]
 idle=Image.new('RGBA',(512,512));small=seed.resize((256,256),Image.Resampling.LANCZOS);idle.alpha_composite(small,(128,496-round(bbox[3]*.5)))
 frames.append(idle)
 selected=list(range(16))+[16,17,20,21,23]
 for j,idx in enumerate(selected):
  ident,box=regions[idx];x0,y0,x1,y1=box
  # Retain antialiasing around the connected character, discard ghost alpha in empty gutters.
  mask=binary_dilation(labels==ident,iterations=2);pixels=arr.copy();pixels[:,:,3]=np.where(mask,pixels[:,:,3],0)
  pixels[:,:,3]=np.where(pixels[:,:,3]<4,0,pixels[:,:,3]);tile=Image.fromarray(pixels).crop(box)
  w,h=round(tile.width*scale),round(tile.height*scale);tile=tile.resize((w,h),Image.Resampling.LANCZOS)
  cell=Image.new('RGBA',(512,512));col=idx%4;anchor=col*256+128
  x=round(256+(x0-anchor)*scale);y=496-h
  assert 0<=x and x+w<=512 and y>=0,(name,idx,x,y,w,h)
  cell.alpha_composite(tile,(x,y));frames.append(cell)
 # Exact shipped poses at both ends prevent a costume/scale pop on entry or exit.
 for index in [1,8,9,16]:frames[index]=idle.copy()
 atlas=Image.new('RGBA',(2048,3072));preview=Image.new('RGB',(1024,6*150),(13,23,44));draw=ImageDraw.Draw(preview)
 for i,cell in enumerate(frames):
  atlas.alpha_composite(cell,((i%4)*512,(i//4)*512));thumb=cell.resize((128,128),Image.Resampling.LANCZOS);preview.paste(thumb,((i%8)*128,(i//8)*150),thumb);draw.text(((i%8)*128+3,(i//8)*150+128),str(i),fill='white')
 atlas.save(OUT/(name+'_pilot.webp'),lossless=True,method=6);preview.crop((0,0,1024,450)).save(HERE/(name+'-preview.png'))
 report[name]={'scale':scale,'frames':22,'actionFrames':21,'cell':512,'atlas':[2048,3072],'displayRatio':2,'origin':[.5,496/512],'bytes':(OUT/(name+'_pilot.webp')).stat().st_size,'selectedRawFrames':selected,'lockedToSeed':[1,8,9,16]}
(HERE/'validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
