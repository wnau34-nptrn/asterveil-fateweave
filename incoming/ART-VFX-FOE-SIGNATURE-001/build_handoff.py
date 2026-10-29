#!/usr/bin/env python3
"""Rebuild packaging from untouched ImageGen sources. Python 3 + Pillow 12.3.0.
No VFX painting, recolouring, or alpha reconstruction: crop/trim/resample/composite only.
--verify checks exact manifest coverage and hashes, then fully decodes every PNG.
--verify-git REF verifies bytes read with git show (including validation.json equality).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import argparse, hashlib, io, json, subprocess
ROOT=Path(__file__).resolve().parent
MOVES=[('seed-spark','Seed Spark','seeds-embers',0),('ember-spark','Ember Spark','seeds-embers',1),('spore-hex','Spore Hex','spores',0),('spore-dust','Spore Dust','dust',0),('star-flame','Star Flame','star-rune',0),('rune-lash','Rune Lash','star-rune',1),('rift-needle','Rift Needle','rift-shard',0),('shard-burst','Shard Burst','rift-shard',1),('rift-bolt-foe','Rift Bolt','bolt-quake',0),('veil-quake','Veil Quake','quake',0)]
KINDS=['prepare','peak-travel','peak-impact','settle']
def sha(b): return hashlib.sha256(b).hexdigest()
def write(name,obj): (ROOT/name).write_text(json.dumps(obj,indent=2)+'\n')
def font(size):
 try: return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',size)
 except OSError: return ImageFont.load_default(size=size)
def check(data,name):
 if name.endswith('.png'):
  with Image.open(io.BytesIO(data)) as im:
   im.load()
   if name.startswith('layers/'):
    assert im.mode=='RGBA' and im.size==(256,256),name
    a=im.getchannel('A'); b=a.getbbox(); assert b and min(b[:2])>=12 and max(b[2:])<=244,(name,b)
    assert a.getextrema()[0]==0 and a.getextrema()[1]>200,name
    assert all(px[:3]==(0,0,0) for px in im.get_flattened_data() if px[3]==0),name
   if name.startswith('storyboards/') or name=='preview-390.png': assert im.width==390,name

def verify(ref=None):
 manifest=json.loads((ROOT/'validation.json').read_text()); prefix=ROOT.relative_to(ROOT.parents[1]).as_posix()+'/'
 if ref:
  def read(n): return subprocess.check_output(['git','show',f'{ref}:{prefix}{n}'],cwd=ROOT)
  assert read('validation.json')==(ROOT/'validation.json').read_bytes(),'fetched validation.json differs'
  files=subprocess.check_output(['git','ls-tree','-r','--name-only',ref,'--',prefix],cwd=ROOT.parents[1]).decode().splitlines()
  names={n[len(prefix):] for n in files}
 else:
  read=lambda n:(ROOT/n).read_bytes()
  names={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()}
 assert names==set(manifest['files'])|{'validation.json'},('manifest coverage',names ^ (set(manifest['files'])|{'validation.json'}))
 layer_hashes=[v['sha256'] for n,v in manifest['files'].items() if n.startswith('layers/')]
 assert len(layer_hashes)==40 and len(set(layer_hashes))==40,'layer uniqueness/count'
 pngs=0
 for n,v in manifest['files'].items():
  b=read(n); assert sha(b)==v['sha256'] and len(b)==v['bytes'],n
  check(b,n); pngs+=n.endswith('.png')
 print(json.dumps({'verified_files':len(names),'hashed_files':len(manifest['files']),'pngs_fully_decoded':pngs,'ref':ref,'validation_manifest_sha256':sha(read('validation.json'))}))

def build():
 spec=json.loads((ROOT/'sources.json').read_text()); layers=[]; (ROOT/'layers').mkdir(exist_ok=True);(ROOT/'storyboards').mkdir(exist_ok=True)
 for slug,title,sheet,row in MOVES:
  source=Image.open(ROOT/f'source/{sheet}.png').convert('RGBA'); cfg=spec[sheet]; xs=cfg.get('row_x',{}).get(str(row),cfg['x']); ys=cfg['y']
  for col,kind in enumerate(KINDS):
   rect=(xs[col],ys[row],xs[col+1],ys[row+1]); crop=source.crop(rect)
   crop.putdata([p if p[3]>2 else (0,0,0,0) for p in crop.get_flattened_data()])
   bounds=crop.getchannel('A').getbbox(); assert bounds
   cw,ch=crop.size
   assert max(crop.getchannel('A').crop(b).getextrema()[1] for b in [(0,0,1,ch),(cw-1,0,cw,ch),(0,0,cw,1),(0,ch-1,cw,ch)])<32,(slug,kind,'source crop clipping')
   ground=slug=='veil-quake'
   trim=crop.crop(bounds); trim.thumbnail((224,208) if ground else (224,224),Image.Resampling.LANCZOS)
   out=Image.new('RGBA',(256,256)); pos=((256-trim.width)//2,224-trim.height if ground else (256-trim.height)//2); out.paste(trim,pos)
   # Canonical transparent RGB; preserve all visible generated pixels and straight alpha.
   out.putdata([p if p[3] else (0,0,0,0) for p in out.get_flattened_data()])
   path=f'layers/{slug}_{kind}.png';out.save(ROOT/path)
   ground=slug=='veil-quake'; anchor=('caster.feet' if ground else 'caster.chest') if kind=='prepare' else ('target.feet' if ground else 'target.chest')
   pivot=[128,224] if ground else [128,128]
   if kind=='peak-travel': anchor='caster.feet → target.feet' if ground else 'caster.chest → target.chest'
   layers.append(dict(file=path,move=title,side='foe',beat='peak' if kind.startswith('peak') else kind,component=kind,source=f'source/{sheet}.png',source_crop=list(rect),source_alpha_bounds=list(bounds),packed_xy=list(pos),packed_size=list(trim.size),alpha_bounds=list(out.getchannel('A').getbbox()),pivot_px=pivot,pivot_normalized=[p/256 for p in pivot],anchor=anchor,direction='left',flip_x=False,blend='normal',additive_required=False,suggested_ms={'prepare':[0,120],'peak-travel':[120,270],'peak-impact':[240,330],'settle':[330,480]}[kind],suggested_texture_display_px={'prepare':40,'peak-travel':132,'peak-impact':52,'settle':40}[kind],sha256=sha((ROOT/path).read_bytes())))
 write('layers.json',{'schema':1,'package':'ART-VFX-FOE-SIGNATURE-001','texture_size':[256,256],'alpha':'straight RGBA','final_versions_per_move':1,'beat_order':['prepare','peak','settle'],'timing_note':'Suggestions only; map to existing event beats. Two independent peak components share one beat. Stop travel at resolved target; no impact on unrelated heroes.','layers':layers})
 hero=Image.open(ROOT/'references/hero.png').convert('RGBA').resize((170,170),Image.Resampling.LANCZOS)
 caster=Image.open(ROOT/'references/caster.png').convert('RGBA').resize((140,140),Image.Resampling.LANCZOS)
 protected=[]
 def place(canvas,slug,kind,xy,size):
  im=Image.open(ROOT/f'layers/{slug}_{kind}.png').resize((size,size),Image.Resampling.LANCZOS)
  x,y=xy; py=224/256 if slug=='veil-quake' else 0.5
  canvas.alpha_composite(im,(round(x-size/2),round(y-size*py)))
 for slug,title,_,_ in MOVES:
  board=Image.new('RGBA',(390,754),(13,20,37,255)); d=ImageDraw.Draw(board);d.text((16,12),title+'  |  FOE → HERO',font=font(17),fill='#f3dfb0')
  d.text((16,38),'Art storyboard • normal alpha • not runtime',font=font(11),fill='#a8b4cb')
  for i,beat in enumerate(['prepare','peak','settle']):
   top=66+i*226;d.rectangle((8,top,381,top+217),fill='#17243b',outline='#39475d');d.text((18,top+8),beat.upper(),font=font(12),fill='#d4d9e3')
   board.alpha_composite(hero,(10,top+38));board.alpha_composite(caster,(240,top+60))
   d.rectangle((62,top+28,130,top+32),fill='#75bcae');d.rectangle((276,top+39,334,top+43),fill='#c58b9d')
   # Real sprite face / illustrative HP protected boxes. No masks hide asset defects.
   boxes=[(66,top+42,135,top+102),(58,top+23,135,top+36),(280,top+65,331,top+111),(272,top+35,340,top+47)]
   fx=Image.new('RGBA',board.size)
   ground=slug=='veil-quake'; cy=top+203 if ground else top+140
   if beat=='prepare': place(fx,slug,'prepare',(294,cy),40)
   elif beat=='peak':
    place(fx,slug,'peak-travel',(195,cy),132);place(fx,slug,'peak-impact',(106,cy),52)
   else: place(fx,slug,'settle',(106,cy),40)
   for box in boxes: assert fx.getchannel('A').crop(box).getbbox() is None,(slug,beat,'face/HP overlap',box)
   board.alpha_composite(fx);protected.append({'move':title,'beat':beat,'face_hp_rectangles':boxes,'zero_effect_alpha_over_protected_rectangles':True})
  board.convert('RGB').save(ROOT/f'storyboards/{slug}-390.png')
 write('storyboards/anchors.json',{'width':390,'not_runtime':True,'notes':'Existing target-repository sprites for review context only; caster proxy is Riftweaver. No masking. Energy peaks terminate at hero chest. Quake uses feet.','panels':protected})
 # 390px contact sheet, two backgrounds per move. Gold is deliberately brighter than armour.
 preview=Image.new('RGB',(390,10*201+48),'#0d1425');d=ImageDraw.Draw(preview);d.text((12,10),'FOE SIGNATURES • normal alpha',font=font(17),fill='#eadab9')
 for i,(slug,title,_,_) in enumerate(MOVES):
  y=48+i*201;d.text((12,y),title,font=font(14),fill='white')
  for j,bg in enumerate(['#15223a','#e9c36a']):
   yy=y+24+j*83; d.rectangle((8,yy,381,yy+78),fill=bg)
   for k,kind in enumerate(KINDS):
    im=Image.open(ROOT/f'layers/{slug}_{kind}.png').resize((76,76),Image.Resampling.LANCZOS);preview.paste(im,(18+k*93,yy+1),im)
 preview.save(ROOT/'preview-390.png')
 files={}
 for p in sorted(ROOT.rglob('*')):
  if p.is_file() and p.name!='validation.json':
   n=p.relative_to(ROOT).as_posix();b=p.read_bytes();check(b,n);files[n]={'sha256':sha(b),'bytes':len(b)}
 write('validation.json',{'schema':1,'all_files_except_self':True,'self_integrity':'Compare validation.json fetched bytes to local bytes; self-hash is reported by --verify-git (self-reference excluded).','checks':{'layers':40,'moves':10,'dimensions':[256,256],'straight_rgba':True,'transparent_border_min_px':16,'storyboards_width':390,'protected_face_hp_overlap_px':0},'files':files})
 verify()
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--verify',action='store_true');parser.add_argument('--verify-git');args=parser.parse_args()
 if args.verify_git:verify(args.verify_git)
 elif args.verify:verify()
 else:build()
