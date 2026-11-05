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
def build_legacy():
 jobs=[j for j in json.loads((HERE/'prompts.json').read_text()) if j.get('status')!='rejected' and j['variant'] in ('r1','r2','r3')]
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
CAMP_BASELINE='47ff96c437aca1bba770b4e9edb847678b2fe8d9'
CAMP_REFERENCE_COMMIT='fb1c7d7aa4e9bb56ad2a1b831e4c31c6915d021d'
# Human-inspected outer extremities in generator source pixels (1254 square), including sparkles.
# Background tents/sky extend to the edges by design; these points cover the principal emblem.
CAMP_LANDMARKS={
 'r2a':[(627,198),(979,574),(628,957),(271,574),(718,331),(910,422),(326,710),(534,835),(373,342),(479,342),(794,705),(833,744)],
 'r2b':[(627,135),(1017,555),(628,1015),(238,555),(729,300),(939,425),(302,710),(529,834),(336,316),(469,316),(823,709),(869,754)]}
def git_blob(commit,name):
 import subprocess
 return subprocess.check_output(['git','show',f'{commit}:{HERE.relative_to(REPO)}/{name}'],cwd=REPO)
def build_camp():
 baseline=json.loads(git_blob(CAMP_BASELINE,'validation.json'))
 mutable={'NOTES.md','build_handoff.py','verify_remote.py','prompts.json','seeds.json','validation.json','SHA256SUMS'}
 protected={n:m['sha256'] for n,m in baseline['files'].items() if n not in mutable}
 for name,expected in protected.items():assert sha(HERE/name)==expected,('Legacy asset changed',name)
 jobs=[j for j in json.loads((HERE/'prompts.json').read_text()) if j.get('round')=='camp-r2' and j.get('status')!='rejected']
 assert {j['variant'] for j in jobs}=={'r2a','r2b'} and len(jobs)==2
 stats=[]
 for job in sorted(jobs,key=lambda j:j['variant']):
  variant=job['variant']
  with Image.open(HERE/job['source_file']) as source:
   source.load();assert source.size==(1254,1254)
   if 'A' in source.getbands():assert source.getchannel('A').getextrema()==(255,255)
   master=source.convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS)
  for size in (1024,512,192,180):save(master if size==1024 else master.resize((size,size),Image.Resampling.LANCZOS),HERE/f'icon-{variant}-{size}.png')
  points=[[x*1024/1254,y*1024/1254] for x,y in CAMP_LANDMARKS[variant]]
  radii=[float(np.hypot(x-512,y-512)) for x,y in points]
  assert max(radii)<=409.6,(variant,max(radii))
  stats.append(dict(variant=variant,round='camp-r2',source=job['source_file'],source_sha256=sha(HERE/job['source_file']),master=f'icon-{variant}-1024.png',sizes=[1024,512,192,180],mode='RGB',embedded_color_profile='sRGB IEC61966-2.1',resize='Pillow LANCZOS, direct from 1024 master',emblem_extremities_master_xy=points,max_landmark_radius=max(radii),safe_circle_radius=409.6,measurement='manually inspected emblem/ribbon/sparkle extremities; +/-4 source px; backgrounds full bleed',visual_review='inspected at 180/120/60/40px; one coherent generated painting, owner selection pending'))
 options=[('CLAUDE TEMP','seeds/final-r1-camp-1024.png'),('R2A','icon-r2a-1024.png'),('R2B - recommended','icon-r2b-1024.png')]
 for theme,bg,fg in [('dark','#101823','#edf4fb'),('light','#e8edf1','#14243a')]:
  out=Image.new('RGB',(540,805),bg);d=ImageDraw.Draw(out)
  d.text((14,10),f'CAMP ICON / {theme.upper()} HOME / actual pixels',fill=fg)
  d.text((14,28),'Temporary composite vs coherent paintings / 180 120 60 40',fill=fg)
  for row,(name,file) in enumerate(options):
   y=60+row*245;d.text((14,y),name,fill=fg);master=Image.open(HERE/file).convert('RGB')
   for x,size in [(14,180),(212,120),(350,60),(428,40)]:
    im=master.resize((size,size),Image.Resampling.LANCZOS);out.paste(im,(x,y+28+180-size));d.text((x,y+215),str(size),fill=fg)
  save(out,HERE/f'preview-camp-{theme}.png')
 out=Image.new('RGB',(390,390),'#172437');d=ImageDraw.Draw(out)
 d.text((10,10),'CAMP ICON / safe 80% circle + OS mask review',fill='white')
 for i,(name,file) in enumerate(options):
  x=5+i*130;im=Image.open(HERE/file).convert('RGB').resize((120,120),Image.Resampling.LANCZOS)
  d.text((x+4,40),('TEMP','R2A','R2B')[i],fill='white');out.paste(im,(x,65));d.ellipse((x+12,77,x+108,173),outline='white',width=1)
  mask=Image.new('L',(120,120));ImageDraw.Draw(mask).ellipse((0,0,119,119),fill=255);out.paste(im,(x,220),mask)
 d.text((10,360),'Review simulation; exports remain opaque squares.',fill='white')
 save(out,HERE/'preview-camp-maskable-390.png')
 seeds=json.loads(git_blob(CAMP_BASELINE,'seeds.json'))
 import subprocess
 for name,origin in [('lobby_bg.webp','public/assets/lobby/lobby_bg.webp'),('final-r1-camp-1024.png','incoming/ART-UI-APPICON-001/final-r1-camp-1024.png')]:
  expected=hashlib.sha256(subprocess.check_output(['git','show',f'{CAMP_REFERENCE_COMMIT}:{origin}'],cwd=REPO)).hexdigest()
  assert sha(HERE/'seeds'/name)==expected
  seeds.append(dict(file='seeds/'+name,copied_from=origin,source_commit=CAMP_REFERENCE_COMMIT,sha256=expected,byte_identical=True))
 dump(HERE/'seeds.json',seeds)
 files={}
 for p in sorted(HERE.rglob('*')):
  if not p.is_file() or p.name in ('validation.json','SHA256SUMS') or '__pycache__' in p.parts:continue
  meta=dict(bytes=p.stat().st_size,sha256=sha(p))
  if p.suffix.lower() in ('.png','.webp'):
   with Image.open(p) as im:im.load();meta.update(size=list(im.size),mode=im.mode,decoded=True)
  files[str(p.relative_to(HERE))]=meta
 manifest={**baseline,'recommended':'r2b','owner_selection':{'selected_direction':'R1 gold star and ribbon with game camp background, per user handoff','camp_r2_variant':'pending'},'variants':baseline['variants']+stats,'files':files,'camp_r2':{'baseline_commit':CAMP_BASELINE,'reference_commit':CAMP_REFERENCE_COMMIT,'protected_files_sha256':protected,'old_r1_r2_r3_exports_unchanged':True,'recommendation':'R2b: larger emblem and quieter camp at 60px','owner_approval':'pending'}}
 dump(HERE/'validation.json',manifest)
 paths=sorted(p for p in HERE.rglob('*') if p.is_file() and p.name!='SHA256SUMS' and '__pycache__' not in p.parts)
 (HERE/'SHA256SUMS').write_text(''.join(f'{sha(p)}  {p.relative_to(HERE)}\n' for p in paths))
 print('Camp R2a/R2b built; original assets protected:',len(protected))
def main():
 jobs=json.loads((HERE/'prompts.json').read_text())
 if any(j.get('round')=='camp-r2' for j in jobs):build_camp()
 else:build_legacy()

if __name__=='__main__': main()
