"""Deterministic crop/normalization/atlas export of ImageGen artwork; no painting.
Run from any directory with Python, Pillow, numpy, scipy: python package.py
Old decoded atlas cells are kept byte-for-byte; lossless WebP avoids recompression drift.
"""
from pathlib import Path
import hashlib, importlib.util, json, math, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import label, binary_dilation

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[1]
BASE='5a613a5'
IDS=['metta','thiran','lalin','wila']
SKILLS=['saintstrike','communion','saintarc','vowstrike','sharewound','lastlight','cadence','duet','rounddance','deepbeat','echofoot','closingstep']
RESAMPLE=Image.Resampling.LANCZOS
for path in ['units','portraits','icons','review','provenance','sources/cells']:(HERE/path).mkdir(exist_ok=True,parents=True)

def dump(path,value):path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
def old_bytes(path):return subprocess.check_output(['git','show',f'{BASE}:{path}'],cwd=REPO)
def old_image(path):
 import io
 return Image.open(io.BytesIO(old_bytes(path))).convert('RGBA')
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
 sheet=Image.open(HERE/'sources/units-sheet.png').convert('RGBA'); arr=np.asarray(sheet)
 labels,n=label(arr[:,:,3]>=8); counts=np.bincount(labels.ravel()); big=np.argsort(counts[1:])[-4:]+1
 # Four connected silhouettes are isolated globally (the generated grid's ribbons
 # slightly cross nominal cell borders). Do not hard-crop a character at a grid edge.
 centers={i:(float(np.where(labels==i)[0].mean()),float(np.where(labels==i)[1].mean())) for i in big}
 top=sorted(big,key=lambda i:centers[i][0])[:2]; bottom=[i for i in big if i not in top]
 ordered=sorted(top,key=lambda i:centers[i][1])+sorted(bottom,key=lambda i:centers[i][1])
 units=[];validation={}
 for ident,index in zip(IDS,ordered):
  mask=binary_dilation(labels==index,iterations=2); a=arr.copy();a[:,:,3]=np.where(mask,a[:,:,3],0);a[a[:,:,3]<4]=0
  body=Image.fromarray(a).crop(Image.fromarray(a[:,:,3]).getbbox())
  scale=min(460/body.height,480/body.width);body=body.resize((round(body.width*scale),round(body.height*scale)),RESAMPLE)
  frame=Image.new('RGBA',(512,512));frame.alpha_composite(body,((512-body.width)//2,497-body.height));frame.save(HERE/f'units/{ident}.png',optimize=True);units.append(frame)
  bbox=frame.getbbox(); opaque=frame.getchannel('A').point(lambda p:255 if p>40 else 0).getbbox()
  assert bbox[3]==497 and bbox[0]>=16 and bbox[2]<=496 and bbox[1]>=16,(ident,bbox)
  validation[ident]={'alphaBounds':bbox,'opaqueBounds':opaque,'footY':496,'frame':[512,512],'sourceComponent':int(index),'sourceBounds':Image.fromarray(a[:,:,3]).getbbox()}
 portraits=[];ps=Image.open(HERE/'sources/portraits-sheet.png').convert('RGBA'); cw=ps.width//2;ch=ps.height//2
 for i,ident in enumerate(IDS):
  p=ps.crop((i%2*cw,i//2*ch,(i%2+1)*cw,(i//2+1)*ch)).resize((512,512),RESAMPLE)
  p.save(HERE/f'portraits/{ident}.png',optimize=True);portraits.append(p)
 # Reuse the proven C1 icon normalization contract: rigid crop/resize/rotation,
 # alpha within radius112 of center, no pixel drawing or new image synthesis.
 spec=importlib.util.spec_from_file_location('c1_icons',REPO/'incoming/ART-SKILL-ICON-003/package_icons.py');norm=importlib.util.module_from_spec(spec);spec.loader.exec_module(norm)
 icons=[];iss=Image.open(HERE/'sources/icons-sheet.png').convert('RGBA');cw=iss.width//4;ch=iss.height//3
 for i,skill in enumerate(SKILLS):
  cell=iss.crop((i%4*cw,i//4*ch,(i%4+1)*cw,(i//4+1)*ch));cp=HERE/f'sources/cells/{skill}.png';cell.save(cp)
  icon=norm.normalize(cp);icon.save(HERE/f'icons/{skill}.png',optimize=True);icons.append(icon)
  a=np.asarray(icon)[:,:,3];ys,xs=np.where(a>0); oy,ox=np.where(a>=128)
  radius=float(np.sqrt((xs-127.5)**2+(ys-127.5)**2).max());extent=int(max(ox.max()-ox.min()+1,oy.max()-oy.min()+1))
  assert radius<=112 and 190<=extent<=205,(skill,radius,extent)
  validation[skill]={'alphaRadius':round(radius,2),'opaqueExtent':extent,'frame':[256,256]}
 # Expand mercenary sheets from six to ten frames; keep all old cells decoded-exact.
 checks={}
 for name,frames in [('units_mercs',units),('portraits_mercs',portraits)]:
  path=f'public/assets/art/{name}.webp'; old=old_image(path);atlas=Image.new('RGBA',(1024,2560));atlas.paste(old,(0,0))
  for i,frame in enumerate(frames,6):atlas.paste(frame,(i%2*512,i//2*512))
  atlas.save(REPO/path,lossless=True,method=6,exact=True)
  out=Image.open(REPO/path).convert('RGBA');assert np.array_equal(np.asarray(old),np.asarray(out.crop((0,0,*old.size))));checks[name]='first six cells RGBA identical'
  dump(HERE/f'{name}.json',{ident:{'frame':i+6,'x':(i+6)%2*512,'y':(i+6)//2*512,'w':512,'h':512,'footY':496} for i,ident in enumerate(IDS)})
 # Append four unique weapons in new columns, leaving all old 5x3 cells intact.
 gear_source=Image.open(HERE/'sources/gear-sheet.png').convert('RGBA');gw=gear_source.width//2;gh=gear_source.height//2
 old_gear=old_image('public/assets/ui/equip/gear_items.webp');gear=Image.new('RGBA',(896,384));gear.paste(old_gear,(0,0))
 gear_meta=json.loads(old_bytes('src/game/visuals/equip/gear_items.json'))
 for i,ident in enumerate(IDS):
  item=gear_source.crop((i%2*gw,i//2*gh,(i%2+1)*gw,(i//2+1)*gh));item.putalpha(item.getchannel('A').point(lambda p:0 if p<4 else p));item=item.crop(item.getbbox());scale=min(112/item.width,112/item.height);item=item.resize((round(item.width*scale),round(item.height*scale)),RESAMPLE)
  cell=Image.new('RGBA',(128,128));cell.alpha_composite(item,((128-item.width)//2,(128-item.height)//2));cell.save(HERE/f'icons/weapon_{ident}.png',optimize=True)
  col=5+i%2;row=i//2;gear.paste(cell,(col*128,row*128));gear_meta[f'weapon_{ident}']={'x':col*128,'y':row*128,'w':128,'h':128}
 gear.save(REPO/'public/assets/ui/equip/gear_items.webp',lossless=True,exact=True,method=6);dump(REPO/'src/game/visuals/equip/gear_items.json',gear_meta)
 decoded=Image.open(REPO/'public/assets/ui/equip/gear_items.webp').convert('RGBA');assert np.array_equal(np.asarray(old_gear),np.asarray(decoded.crop((0,0,640,384))))
 checks['gear_items']='all old 5x3 cells RGBA identical; four unique weapons added in columns 5-6'
 old_meta=json.loads(old_bytes('src/game/visuals/skill_icons.json'));order=old_meta['order']+SKILLS;rows=math.ceil(len(order)/6)
 old=old_image('public/assets/ui/skill_icons.webp');atlas=Image.new('RGBA',(1536,rows*256));atlas.paste(old,(0,0))
 for i,icon in enumerate(icons,len(old_meta['order'])):atlas.paste(icon,(i%6*256,i//6*256))
 atlas.save(REPO/'public/assets/ui/skill_icons.webp',lossless=True,method=6,exact=True)
 out=Image.open(REPO/'public/assets/ui/skill_icons.webp').convert('RGBA')
 for i in range(len(old_meta['order'])):
  box=(i%6*256,i//6*256,(i%6+1)*256,(i//6+1)*256);assert np.array_equal(np.asarray(old.crop(box)),np.asarray(out.crop(box))),i
 checks['skill_icons']='first 61 cells RGBA identical'
 meta={**old_meta,'rows':rows,'order':order};dump(REPO/'src/game/visuals/skill_icons.json',meta);dump(HERE/'skills_atlas.json',meta)
 # Actual pixel-size review assets, not mocked gameplay or claimed device evidence.
 lineup=Image.new('RGB',(10*160,190),'#14243a');all_units=[old_image('public/assets/art/units_mercs.webp').crop((i%2*512,i//2*512,(i%2+1)*512,(i//2+1)*512)) for i in range(6)]+units
 d=ImageDraw.Draw(lineup)
 for i,u in enumerate(all_units):
  u=u.resize((160,160),RESAMPLE);lineup.paste(u,(i*160,6),u);d.text((i*160+4,170),(['garran','mira','toma','sefa','brann','lio']+IDS)[i],fill='white')
 lineup.save(HERE/'review/lineup-160.png')
 preview=Image.new('RGB',(640,760),'#12223b');d=ImageDraw.Draw(preview)
 for i,(u,p) in enumerate(zip(units,portraits)):
  x=i*160;u=u.resize((115,115),RESAMPLE);preview.paste(u,(x+22,8),u);portrait=p.resize((40,40),RESAMPLE);preview.paste(portrait,(x+60,132));d.text((x+35,179),IDS[i],fill='white')
 for row,size in enumerate([40,56,72]):
  y=220+row*175;d.text((10,y),f'Native {size}px, normal / cooldown',fill='white')
  for i,icon in enumerate(icons):
   x=(i%6)*104+6;yy=y+22+(i//6)*(size+12);small=icon.resize((size,size),RESAMPLE);preview.paste(small,(x,yy),small)
   # cooled variant is separate lower half of the same native-sized visual sample.
   dark=Image.new('RGBA',(size,size),'#12223b');dark.alpha_composite(small);dark.alpha_composite(Image.new('RGBA',(size,size),(0,0,0,156)))
   if size==40:preview.paste(dark.convert('RGB'),(x+size+3,yy))
 preview.save(HERE/'review/native-sizes.png')
 # A compact icon sheet with labels for QA; each skill's runtime cell remains unlabelled.
 review=Image.new('RGB',(6*180,2*210),'#12223b');d=ImageDraw.Draw(review)
 for i,(skill,icon) in enumerate(zip(SKILLS,icons)):
  x=i%6*180;y=i//6*210;v=icon.resize((160,160),RESAMPLE);review.paste(v,(x+10,y+5),v);d.text((x+10,y+177),skill,fill='white')
 review.save(HERE/'review/icons-160.png')
 dump(HERE/'provenance/validation.json',{'base':BASE,'checkedOldPixels':checks,'frames':validation,'unitOrder':IDS,'skillOrder':SKILLS,'runtimeRows':{'mercs':5,'skills':rows},'reviewBoundary':'packaged art only; no live browser or owner visual acceptance claimed'})
 manifest={str(p.relative_to(HERE)):{'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(HERE.rglob('*')) if p.is_file() and p.name!='manifest.json'}
 dump(HERE/'provenance/manifest.json',manifest)
 print(json.dumps({'units':4,'portraits':4,'icons':12,'runtimeIcons':len(order),'rows':rows,'oldPixels':checks},indent=2))

if __name__=='__main__':main()
