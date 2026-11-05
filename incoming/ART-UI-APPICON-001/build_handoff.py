"""Package original generated icons: sRGB RGB PNG masters, Lanczos sizes and actual-size reviews."""
from pathlib import Path
import hashlib,json,struct
import numpy as np
from PIL import Image,ImageDraw,ImageCms
HERE=Path(__file__).resolve().parent
REPO=HERE.parents[1]
BASE='2b9a7ffb92cc0ffc40644a4dee81049bd389627e'
ICC=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
# Fix profile creation timestamp so identical inputs produce identical PNG bytes.
ICC=ICC[:24]+struct.pack('>6H',2026,1,1,0,0,0)+ICC[36:]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def save(im,p):
 assert im.mode=='RGB'
 im.save(p,icc_profile=ICC)
def main():
 jobs=[j for j in json.loads((HERE/'prompts.json').read_text()) if j.get('status')!='rejected']
 assert {j['variant'] for j in jobs}=={'r1','r2','r3'} and len(jobs)==3
 stats=[]
 for job in sorted(jobs,key=lambda j:j['variant']):
  with Image.open(HERE/job['source_file']) as source:
   source.load();assert source.width==source.height
   if 'A' in source.getbands():assert source.getchannel('A').getextrema()==(255,255),'Generator source is not opaque'
   # Input is generated in standard sRGB; embed explicit standard sRGB ICC on exported RGB files.
   master=source.convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS)
  for size in (1024,512,192,180):
   im=master if size==1024 else master.resize((size,size),Image.Resampling.LANCZOS)
   save(im,HERE/f'icon-{job["variant"]}-{size}.png')
  a=np.array(master).astype(float);yy,xx=np.mgrid[:1024,:1024];r=np.hypot(xx-511.5,yy-511.5)
  # Gold/skin proxy isolates important warm foreground from cyan/navy glow.
  warm=(a[:,:,0]>95)&(a[:,:,0]>a[:,:,2]*1.25)&(a[:,:,1]>55)
  assert warm.any()
  outside=int((warm&(r>409.6)).sum());assert outside==0,(job['variant'],'warm foreground outside 80% circle',outside)
  sy,sx=np.where(warm)
  stats.append(dict(variant=job['variant'],source=job['source_file'],source_sha256=sha(HERE/job['source_file']),master=f'icon-{job["variant"]}-1024.png',sizes=[1024,512,192,180],mode='RGB',embedded_color_profile='sRGB IEC61966-2.1',resize='Pillow LANCZOS, direct from 1024 master',warm_foreground_bounds_xyxy=[int(sx.min()),int(sy.min()),int(sx.max()+1),int(sy.max()+1)],warm_foreground_max_radius=float(r[warm].max()),safe_circle_radius=409.6,warm_pixels_outside_safe_circle=outside,safe_area_method='warm color proxy plus human inspection of all key shapes; glow/background excluded',visual_review='inspected at 180/120/60/40px on dark/light homes and circular mask; owner selection pending'))
 for theme,bg,fg in [('dark','#101823','#edf4fb'),('light','#e8edf1','#14243a')]:
  out=Image.new('RGB',(540,805),bg);d=ImageDraw.Draw(out)
  d.text((14,10),f'APP ICON / {theme.upper()} HOME / actual pixels',fill=fg)
  d.text((14,28),'180 / 120 / 60 / 40 px; square deliverables, no fake corners',fill=fg)
  for row,variant in enumerate(('r1','r2','r3')):
   y=60+row*245;d.text((14,y),variant.upper()+(' - recommended' if variant=='r1' else ''),fill=fg)
   master=Image.open(HERE/f'icon-{variant}-1024.png').convert('RGB')
   for x,size in [(14,180),(212,120),(350,60),(428,40)]:
    im=master.resize((size,size),Image.Resampling.LANCZOS);out.paste(im,(x,y+28+180-size));d.text((x,y+215),str(size),fill=fg)
  save(out,HERE/f'preview-{theme}.png')
 # Mask simulation is a review only; exported icons always remain opaque square RGB.
 out=Image.new('RGB',(390,450),'#172437');d=ImageDraw.Draw(out)
 d.text((10,10),'OS MASK REVIEW / central 80% guide',fill='white')
 d.text((10,28),'Top: square + safe circle / Bottom: circular crop',fill='white')
 for i,variant in enumerate(('r1','r2','r3')):
  im=Image.open(HERE/f'icon-{variant}-1024.png').convert('RGB').resize((120,120),Image.Resampling.LANCZOS);x=5+i*130
  out.paste(im,(x,65));d.ellipse((x+12,77,x+108,173),outline='#edf4fb',width=1);d.text((x+40,48),variant.upper(),fill='white')
  mask=Image.new('L',(120,120));ImageDraw.Draw(mask).ellipse((0,0,119,119),fill=255);out.paste(im,(x,215),mask)
 d.text((10,360),'Masks are simulated, not device screenshots.',fill='white')
 d.text((10,380),'Important shapes remain inside 80% circle.',fill='white')
 save(out,HERE/'preview-maskable-390.png')
 refs={
 'asterveil.svg':'public/assets/asterveil.svg','logo.svg':'public/assets/title/logo.svg','title_bg.webp':'public/assets/title/title_bg.webp','tokens.css':'src/ui/tokens.css','isolde-portrait.png':'incoming/ART-CHAR-REDESIGN-001/portrait/isolde.png'}
 seeds=[]
 for name,origin in refs.items():
  p=HERE/'seeds'/name;assert sha(p)==sha(REPO/origin)
  seeds.append(dict(file='seeds/'+name,copied_from=origin,sha256=sha(p),byte_identical=True))
 dump(HERE/'seeds.json',seeds)
 files={}
 for p in sorted(HERE.rglob('*')):
  if not p.is_file() or p.name in ('validation.json','SHA256SUMS') or '__pycache__' in p.parts:continue
  item=dict(bytes=p.stat().st_size,sha256=sha(p))
  if p.suffix.lower() in ('.png','.webp'):
   with Image.open(p) as im:im.load();item.update(size=list(im.size),mode=im.mode,decoded=True)
  files[str(p.relative_to(HERE))]=item
 dump(HERE/'validation.json',dict(task='ART-UI-APPICON-001',base_commit=BASE,brief_source_commit='3c9f3aa7f87be156087827dd834c2a3a9f3cd4f3',recommended='r1',owner_selection='pending',integration='not performed',all_technical_checks_pass=True,variants=stats,files=files))
 paths=sorted(p for p in HERE.rglob('*') if p.is_file() and p.name!='SHA256SUMS' and '__pycache__' not in p.parts)
 (HERE/'SHA256SUMS').write_text(''.join(f'{sha(p)}  {p.relative_to(HERE)}\n' for p in paths))
 print('3 RGB/sRGB opaque square masters + 9 derivatives; mask safe-area proxy passed; all images decoded.')
if __name__=='__main__': main()
