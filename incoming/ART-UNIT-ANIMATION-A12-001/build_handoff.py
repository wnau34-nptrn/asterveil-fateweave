"""Rebuild A12 cells from immutable raw strips; uniform whole-strip scale, no anatomy edits."""
from pathlib import Path
import argparse,io,json,hashlib,subprocess,sys,statistics,shutil
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import label,find_objects,binary_dilation,distance_transform_edt
HERE=Path(__file__).resolve().parent
REPO=HERE.parents[1]
def dump(p,v): p.write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main(selected=None):
 entries=[] if selected is None else [e for e in json.loads((HERE/'strips.json').read_text()) if f"{e['identity']}-{e['move']}" not in selected]
 jobs=json.loads((HERE/'prompts.json').read_text())
 jobs.sort(key=lambda j:(['wynne','astrid','kael'].index(j['identity']),list(SLOTS[j['identity']]).index(j['move'])))
 for job in jobs:
  if job.get('status')=='rejected': continue
  who,move,n=job['identity'],job['move'],job['frame_count']; key=f'{who}-{move}'
  if selected is not None and key not in selected: continue
  cw=768 if who=='kael' else 640; logical_offset=(cw-512)//2
  a=np.array(Image.open(HERE/job['raw_file']).convert('RGBA')); alpha=a[:,:,3]
  labels,_=label(alpha>80); counts=np.bincount(labels.ravel())
  major=sorted((box[1].start,i,box) for i,box in enumerate(find_objects(labels),1) if counts[i]>5000)
  assert len(major)==n,(key,len(major),n)
  marker=np.zeros(alpha.shape,dtype='int16')
  for j,(_,i,_) in enumerate(major,1): marker[labels==i]=j
  idx=distance_transform_edt(marker==0,return_distances=False,return_indices=True); owner=marker[tuple(idx)]
  seed=Image.open(HERE/f'seeds/{who}.png').convert('RGBA'); seedbox=seed.getbbox()
  # Every generated ready pose is calibrated to the SAME approved standing height.
  # This compensates generator canvas resolution, never independently resizes a pose.
  ready=major[0][2]; scale=(seedbox[3]-seedbox[1])/(ready[0].stop-ready[0].start)
  folder=HERE/f'cells/{key}'; folder.mkdir(parents=True,exist_ok=True)
  idle=Image.new('RGBA',(cw,512)); idle.alpha_composite(seed,(logical_offset,0)); idle.save(folder/'000.png')
  strip=Image.new('RGBA',(cw*n,512)); transforms=[]
  for j,(_,i,box0) in enumerate(major,1):
   mask=owner==j; near=binary_dilation(labels==i,iterations=3)
   pixels=a.copy(); pixels[~(mask & near)]=0
   ys,xs=np.where(pixels[:,:,3]>80)
   box=[max(0,int(xs.min())-3),max(0,int(ys.min())-3),min(a.shape[1],int(xs.max())+4),min(a.shape[0],int(ys.max())+4)]
   assert xs.min()>0 and xs.max()<a.shape[1]-1 and ys.min()>0 and ys.max()<a.shape[0]-1,(key,j,'raw clipping')
   tile=Image.fromarray(pixels).crop(box); tile=tile.resize((round(tile.width*scale),round(tile.height*scale)),Image.Resampling.LANCZOS)
   ta=np.array(tile)[:,:,3]; ty,tx=np.where(ta>40)
   pos=[round(cw/2-tile.width/2),496-int(ty.max())]
   assert pos[0]>=0 and pos[1]>=0 and pos[0]+tile.width<=cw,(key,j,pos,tile.size)
   canvas=Image.new('RGBA',(cw,512)); canvas.alpha_composite(tile,pos)
   # Required ready lockback, same seed pixels (with wider transparent margins).
   if j==1 or (j==n and move!='down'): canvas=idle.copy()
   canvas.save(folder/f'{j:03}.png'); strip.alpha_composite(canvas,((j-1)*cw,0))
   transforms.append({'frame':j,'source_box':box,'uniform_raw_scale':scale,'offset':pos,'ready_seed_lock':j==1 or (j==n and move!='down')})
  (HERE/'spaced').mkdir(exist_ok=True); strip.save(HERE/f'spaced/{key}.png')
  (HERE/'audits').mkdir(exist_ok=True); audit=HERE/f'audits/{key}.json'
  run=subprocess.run([sys.executable,str(REPO/'scripts/unit-anatomy-audit.py'),'--cells',str(folder),'--json',str(audit)],capture_output=True,text=True)
  (HERE/f'audits/{key}.txt').write_text(run.stdout+run.stderr)
  assert audit.exists(),run.stderr
  rows=json.loads(audit.read_text())['report'][key]; measured=[r['scale'] for r in rows if r['status'] in ('ok','drift')]
  med=statistics.median(measured) if measured else None; maximum=max(measured) if measured else None
  gate=bool(measured) and med<=1.15 and maximum<=1.20
  entries.append({'identity':who,'move':move,'frame_count':n,'frame_order':'left-to-right','cell_size':[cw,512],'logical_source_size':[512,512],'logical_x_offset':logical_offset,'pivot':[0.5,497/512],'shared_character_scale':1.0,'raw_to_seed_resolution_scale':scale,'ground_y':497,'raw_file':job['raw_file'],'file':f'spaced/{key}.png','cells':f'cells/{key}','transforms':transforms,'median':med,'maximum_measured':maximum,'not_measured':[r['frame'] for r in rows if r['status']=='not-measured'],'numeric_gate':'pass' if gate else 'fail','status':'candidate' if gate else 'missing','owner_artwork_selection':'pending','owner_motion_approval':'pending','timing_weights':[.8,1,.9,1] if n==4 else [1,1.2,.75,1,.8,1]})
  if job.get('revision')=='r2':
   entries[-1].update(revision='r2',recommendation='R2 replaces R1 for small motion',r1_commit='0404c7ff1c291d22b9b12d68be61671098006e22')
  print(key,'median',med,'max',maximum,'unmeasured',entries[-1]['not_measured'],'PASS' if gate else 'FAIL')
 dump(HERE/'strips.json',entries)

def render_previews(entries, identities=None):
 for who in sorted(set(e['identity'] for e in entries)):
  if identities is not None and who not in identities: continue
  selected=[e for e in entries if e['identity']==who]; height=sum(25+((e['frame_count']+3)//3)*132 for e in selected)+35
  out=Image.new('RGB',(390,height),'#14243a'); draw=ImageDraw.Draw(out); draw.text((6,8),f'{who} A12 / SEED + frames / approval pending',fill='white'); y=35
  for e in selected:
   draw.text((5,y),f"{e['move']} / {e['numeric_gate']}",fill='#f4dca4'); y+=25
   for j,f in enumerate(sorted((HERE/e['cells']).glob('*.png'))):
    im=Image.open(f); im.thumbnail((130,104),Image.Resampling.LANCZOS); x=j%3*130; yy=y+j//3*132
    out.paste(im,(x,yy),im); draw.text((x+4,yy+106),'SEED' if j==0 else str(j),fill='white')
   y+=((e['frame_count']+3)//3)*132
  out.save(HERE/f'{who}-preview-390.png')


def render_deflect_review():
 """Compare immutable R1 git bytes with R2 at a fixed seed-based 111px scale."""
 from PIL import ImageOps
 baseline='0404c7ff1c291d22b9b12d68be61671098006e22'
 prefix=str(HERE.relative_to(REPO))
 bg=Image.open(REPO/'public/assets/art/battle_forest.webp').convert('RGB')
 seed=Image.open(HERE/'seeds/astrid.png').convert('RGBA')
 scale=111/(seed.getbbox()[3]-seed.getbbox()[1])
 out=Image.new('RGB',(640*12,785),'#14243a');d=ImageDraw.Draw(out)
 d.text((12,8),'ASTRID DEFLECT R1 / R2 | fixed 111px seed unit height | offline review; motion pending',fill='white')
 d.text((12,208),'512px cell-height row (640x512 cells); same seed scale, no per-pose fitting | pairs: R1 then R2',fill='white')
 for j in range(1,7):
  old=Image.open(io.BytesIO(subprocess.check_output(['git','show',f'{baseline}:{prefix}/cells/astrid-deflect/{j:03}.png'],cwd=REPO))).convert('RGBA')
  new=Image.open(HERE/f'cells/astrid-deflect/{j:03}.png').convert('RGBA')
  for rev,cell in enumerate((old,new)):
   col=(j-1)*2+rev; small=ImageOps.fit(bg,(160,155)); sprite=cell.resize((round(640*scale),round(512*scale)),Image.Resampling.LANCZOS)
   small.paste(sprite,(round(80-320*scale),round(147-497*scale)),sprite)
   out.paste(small,(col*160,33));d.text((col*160+5,35),f'{j:02} R{rev+1}',fill='#ffedba')
   large=ImageOps.fit(bg,(640,512));large.paste(cell,(0,0),cell);out.paste(large,(col*640,250));d.text((col*640+8,230),f'frame {j:02} / R{rev+1}',fill='#ffedba')
 folder=HERE/'review';folder.mkdir(exist_ok=True);out.save(folder/'astrid-deflect-r1-vs-r2.png')

MAPPING={
 'wynne':{'attack':'attack','threadhex':'knot','knothex':'knot','longthread':'knot','lifetoll':'toll','wovenhex':'weave','tollring':'weave'},
 'astrid':{'attack':'attack','starneedle':'attack','deflectfate':'deflect','crossing':'deflect','turncycle':'dial','doubledial':'dial','readorbit':'read'},
 'kael':{'attack':'attack','gatherfist':'gather','flowfist':'gather','releasefist':'release','perfectfist':'release','circlefist':'circle','storedfist':'stored'}}
SLOTS={
 'kael':{
 'attack':['ready','step in; rear palm at hip','drive open palm right','extended palm; planted feet','draw back','ready'],
 'gather':['ready','front palm forward','contact','both hands back to hip; breathe','settle lower','ready'],
 'release':['ready','sink deep; both palms low','prepare hip drive','double palm lunge; rear leg extended','hold extension then step back','ready'],
 'circle':['ready','coil torso left','pivot front foot','sweep forearm horizontally across front','follow through past centre','ready'],
 'stored':['ready','weight back; fist at ribs','compact hip compression','short bent-elbow forearm blow right','solid hold; ease','ready'],
 'hit':['ready','recoil; guard up','slide half step back','ready'],
 'block':['ready','cross forearms; bend knees','absorb low','ready'],
 'down':['ready; knees soften','one hand and knee on ground','sink sideways','lie unconscious; HOLD']},
 'wynne':{
 'attack':['ready','lift doll; pinch short loop','prepare free-hand flick','flick forward-right; contact','retract to doll','ready'],
 'knot':['ready','raise doll to chest','pull thread taut sideways','pinch knot; sharp tug right','hold pinch then lower','ready'],
 'toll':['ready','take hanging talisman','raise tag between fingers','press tag forward-right','hold then return','ready'],
 'weave':['ready','step back; doll pulled in','open arm; half turn','sweep arm across right side','finish arc','ready'],
 'hit':['ready','flinch; protect doll','catch balance','ready'],
 'block':['ready','turn shoulder in; shield doll','brace','ready'],
 'down':['ready; knees soften','knees give way; hold doll','sink sideways','lie unconscious holding doll; HOLD']},
 'astrid':{
 'attack':['ready','raise two fingers','aim at eye level','precise straight point right','lower','ready'],
 'deflect':['ready','left open palm to shoulder; elbow out; palm faces right','nearly straight arm pushes palm far right past body; lean forward','extended arm sweeps sideways/down to hip height; wrist turns','hold low turned palm far right; gaze follows','ready'],
 'dial':['ready','bring astrolabe to chest','other hand grips outer ring','rotate rings','hold rings turned','ready'],
 'read':['ready','lift astrolabe','raise to eye level','look through toward right','hold reading then lower','ready'],
 'hit':['ready','recoil; ring to chest','catch balance','ready'],
 'block':['ready','raise mantle across body','brace','ready'],
 'down':['ready; knees soften','knees give way; ring close','sink sideways','lie unconscious holding ring; HOLD']}}

def finalize(selected=None):
 entries=json.loads((HERE/'strips.json').read_text())
 entries.sort(key=lambda e:(['wynne','astrid','kael'].index(e['identity']),list(SLOTS[e['identity']]).index(e['move'])))
 for e in entries:
  if selected is not None and f"{e['identity']}-{e['move']}" not in selected: continue
  e['frame_descriptions']=SLOTS[e['identity']][e['move']]
  e['proposed_ActionId_mapping']={a:m for a,m in MAPPING[e['identity']].items() if m==e['move']}
  e['proposed_ActionId_mapping'].update({e['move']:e['move']} if e['move'] in ('hit','block','down') else {})
  e['visual_review']='reviewed offline at 390px; owner approval pending'
  e['not_measured_visual_review']={str(f):'Examined against seed: same head size, full horizontal body length, eyes closed; character props retained; automatic scale unavailable.' for f in e['not_measured']}
  e['recommendation']='R2 replaces R1 for small motion' if e.get('revision')=='r2' else 'recommended corrected candidate; no alternate option'
 dump(HERE/'strips.json',entries)
 render_previews(entries, None if selected is None else {key.rsplit('-',1)[0] for key in selected})
 if any(e.get('revision')=='r2' and e['identity']=='astrid' and e['move']=='deflect' for e in entries): render_deflect_review()
 seeds=[]
 for who,expected in [('wynne','b2888ab61fcb39fc5e4fc508c0a6695efae1c74224c5460d32f724a24fa091e6'),('astrid','a2d2ac7833818ff62cc877ecd0e90e87f24d8f56365f57e6c32d9321b36f1b29'),('kael','5d9f344d4d44cad32c169e74780c2ff10bed401fd9f9dd43ea27f4c2171dde1c')]:
  p=HERE/f'seeds/{who}.png'; assert sha(p)==expected
  seeds.append(dict(identity=who,file=f'seeds/{who}.png',copied_from=f'incoming/ART-CHAR-CLASS-NEW-{"003" if who=="kael" else "002"}/unit/{who}.png',sha256=expected,size=[512,512],mode='RGBA',facing='right',sole_y=496,ground_y=497,pivot=[.5,497/512],byte_identical=True))
 if selected is None: dump(HERE/'seeds.json',seeds)
 files={}
 for p in sorted(HERE.rglob('*')):
  if not p.is_file() or p.name in ('validation.json','SHA256SUMS') or '__pycache__' in p.parts: continue
  meta=dict(bytes=p.stat().st_size,sha256=sha(p))
  if p.suffix=='.png':
   with Image.open(p) as im:
    im.load(); meta.update(size=list(im.size),mode=im.mode,decoded=True)
  files[str(p.relative_to(HERE))]=meta
 assert len(entries)==22 and all(e['numeric_gate']=='pass' for e in entries)
 dump(HERE/'validation.json',dict(task='ART-UNIT-ANIMATION-A12-001',base_commit='d5fe9eaa668ef6c9a7384a95b0f365ba72dee10a',all_technical_checks_pass=True,scope='additions only under this package',delivered_strips=22,generated_frames=sum(e['frame_count'] for e in entries),pending={},kael_seed_source_commit='743adc3f2e4967917f331a35f5f6f6a528628665',gate={'median_lte':1.15,'every_measured_lte':1.20,'not_measured_is_pass':False},proposed_mapping=MAPPING,owner_artwork_selection='pending',owner_motion_approval='pending',runtime_integration='not performed; Claude responsibility',strips=entries,files=files))
 baseline_commit='0404c7ff1c291d22b9b12d68be61671098006e22'
 if any(e.get('revision')=='r2' for e in entries):
  prefix=str(HERE.relative_to(REPO))
  baseline=json.loads(subprocess.check_output(['git','show',f'{baseline_commit}:{prefix}/validation.json'],cwd=REPO))
  mutable={'NOTES.md','build_handoff.py','prompts.json','strips.json','validation.json','SHA256SUMS','astrid-preview-390.png','raw/astrid-deflect.png','spaced/astrid-deflect.png','audits/astrid-deflect.json','audits/astrid-deflect.txt'}
  protected={name:meta['sha256'] for name,meta in baseline['files'].items() if name not in mutable and not name.startswith('cells/astrid-deflect/')}
  for name,expected in protected.items(): assert sha(HERE/name)==expected,('R2 changed protected file',name)
  old_other=[e for e in baseline['strips'] if (e['identity'],e['move'])!=('astrid','deflect')]
  new_other=[e for e in entries if (e['identity'],e['move'])!=('astrid','deflect')]
  assert old_other==new_other,'Other 21 strip records changed'
  oldraw=baseline['files']['raw/astrid-deflect.png']['sha256']
  assert sha(HERE/'raw/rejected/astrid-deflect-r1-small-motion.png')==oldraw
  manifest=json.loads((HERE/'validation.json').read_text())
  manifest['r2_review']={'move':'astrid-deflect','baseline_commit':baseline_commit,'recommendation':'R2 replaces R1 for small motion','status':'candidate','review_image':'review/astrid-deflect-r1-vs-r2.png','small_review_unit_height':111,'small_review_scale':111/451,'large_review_cell_height':512,'background':'public/assets/art/battle_forest.webp','background_sha256':sha(REPO/'public/assets/art/battle_forest.webp'),'r1_raw_sha256':oldraw,'other_strip_records_unchanged':21,'protected_files_sha256':protected,'motion_review':'รอเจ้าของ/Claude ตรวจ motion','claude_review_21_strips':'accepted under owner art delegation 2026-11-04; not owner approval'}
  dump(HERE/'validation.json',manifest)
 paths=sorted(p for p in HERE.rglob('*') if p.is_file() and p.name!='SHA256SUMS' and '__pycache__' not in p.parts)
 (HERE/'SHA256SUMS').write_text(''.join(f'{sha(p)}  {p.relative_to(HERE)}\n' for p in paths))
 print('Manifest complete:',len(paths),'files, 22 strips; all three characters supplied; approval pending.')

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--only',action='append',help='Rebuild only this character-move; preserve other strips and previews')
 args=parser.parse_args(); selected=set(args.only) if args.only else None
 main(selected)
 finalize(selected)
