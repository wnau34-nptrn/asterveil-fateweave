"""Rebuild with ImageMagick; Pillow is used only to read/audit, never to edit images."""
from pathlib import Path
import subprocess, json, hashlib, tempfile, argparse
from PIL import Image
ROOT=Path(__file__).resolve().parent

def run(*args):
 args=list(map(str,args))
 # No timestamp chunks: source bytes are retained separately and rebuilds hash identically.
 if args[-1].endswith('.png'):args[-1:-1]=['-strip']
 subprocess.run(['magick',*args],check=True)
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def restore_plates(panel, seed, td):
 # Static composite only: mimic existing DOM-over-canvas order, never alter game art.
 for i,(x,y,w,h) in enumerate([(12,293,72,14),(111,293,72,14),(209,293,72,14),(111,489,72,14),(209,489,72,14),(307,489,72,14),(12,627,72,14),(111,627,72,14),(209,627,72,14)]):
  patch=td/'plate.png';run(seed,'-crop',f'{w}x{h}+{x}+{y}','+repage',patch)
  run(panel,patch,'-gravity','NorthWest','-geometry',f'+{x}+{y}','-compose','Over','-composite',panel)
def build():
 data=json.loads((ROOT/'layers.json').read_text())
 with tempfile.TemporaryDirectory() as td:
  td=Path(td)
  for row in data['layers']:
   name=Path(row['file']).name; m=row['original_metadata']['move']; b=row['original_metadata']['beat']
   raw=ROOT/'source'/('wing-hold.png' if m=='wing-gathering' else m+'.png')
   resized=td/'resize.png';cell=td/'cell.png'
   run(raw,'-resize','256x256!' if m=='wing-gathering' else '768x256!',resized)
   i=['prepare','peak','settle'].index(b)
   run(resized,'-crop',f'256x256+{0 if m=="wing-gathering" else i*256}+0','+repage',cell)
   if m=='shadow-tide':
    run(cell,'-channel','RGB','-sigmoidal-contrast','6x40%','+channel',cell)
   run(ROOT/'seeds'/name,cell,'-compose','Atop','-composite','-define','png:color-type=6','PNG32:'+str(ROOT/row['file']))
   if m=='shadow-tide':
    # A narrow inner crest outline remains inside the old alpha footprint.
    edge=td/'edge.png';rim=td/'rim.png'
    run(ROOT/'seeds'/name,'-alpha','extract','-threshold','35%','-morphology','EdgeIn','Diamond:3',edge)
    run('-size','256x256','xc:#dfd0fc',edge,'-alpha','off','-compose','CopyOpacity','-composite',rim)
    run(ROOT/row['file'],rim,'-compose','Atop','-composite','PNG32:'+str(ROOT/row['file']))
   row['sha256']=digest(ROOT/row['file'])
  (ROOT/'layers.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
  # Static placement studies. Coordinates manually read from the real 390px capture;
  # not renderer socket telemetry, not a claim of game integration or motion QA.
  placements={'severing-bolt':{'prepare':(213,421),'peak':(43,575),'settle':(43,575)},'shadow-tide':{'prepare':(244,483),'peak':(43,629),'settle':(43,629)},'wing-gathering':{'prepare':(247,409)}}
  evidence=[]
  for row in data['layers']:
   md=row['original_metadata'];m=md['move'];b=md['beat'];name=Path(row['file']).name
   x,y=placements[m][b];w=md['suggested_canvas_width_390'];px,py=md['pivot_px'];pos=(round(x-px*w/256),round(y-py*w/256))
   panels=[]
   for label,art in [('R1',ROOT/'seeds'/name),('REV',ROOT/row['file'])]:
    fx=td/'fx.png';panel=td/(label+'.png');run(art,'-resize',f'{w}x{w}!',fx)
    run(ROOT/'seeds'/f'game-{m}.png',fx,'-gravity','NorthWest','-geometry',f'{pos[0]:+}{pos[1]:+}','-compose','Over','-composite',panel)
    restore_plates(panel,ROOT/'seeds'/f'game-{m}.png',td)
    head=td/'head.png';run('-size','390x36','xc:#101a30','-font','DejaVu-Sans','-fill','white','-pointsize','14','-gravity','center','-annotate','0',f'{m} {b} | {label}',head)
    out=td/(label+'-labeled.png');run(head,panel,'-append',out);panels.append(out)
   target=ROOT/'evidence'/f'{m}-{b}-compare-390.png';run(*panels,'+append',target)
   evidence.append({'file':str(target.relative_to(ROOT)),'kind':'static composite on unchanged real game frame','panel_width':390,'x':x,'y':y,'canvas_width':w,'pivot':md['pivot_px'],'placement':'manual landmark approximation; original metadata retained; no runtime socket measurement'})
   focus={'severing-bolt':{'prepare':(360,170),'peak':(510,170),'settle':(545,120)},'shadow-tide':{'prepare':(460,100),'peak':(600,100),'settle':(610,90)},'wing-gathering':{'prepare':(365,150)}}
   cy,ch=focus[m][b];run(target,'-crop',f'780x{ch}+0+{cy}','+repage',ROOT/'evidence'/f'{m}-{b}-detail-390.png')
  # R1/R2/new with the same Valdrakk screenshot, pivot and 80px canvas.
  panels=[]
  for label,art in [('R1',ROOT/'seeds/wing-gathering-prepare.png'),('R2',ROOT/'seeds/wing-gathering-r2-prepare.png'),('REV',ROOT/'layers/wing-gathering-prepare.png')]:
   fx=td/'fx.png';p=td/(label+'-variant.png');run(art,'-resize','80x80!',fx)
   run(ROOT/'seeds/game-wing-gathering.png',fx,'-geometry','+207+369','-compose','Over','-composite','-crop','390x280+0+250','+repage',p)
   h=td/'h.png';run('-size','390x30','xc:#101a30','-font','DejaVu-Sans','-pointsize','14','-fill','white','-gravity','center','-annotate','0',label,h)
   out=td/(label+'-detail.png');run(h,p,'-append',out);panels.append(out)
  run(*panels,'+append',ROOT/'evidence/wing-r1-r2-rev-on-valdrakk-390.png')
  (ROOT/'evidence/placements.json').write_text(json.dumps(evidence,indent=2)+'\n')

def audit():
 data=json.loads((ROOT/'layers.json').read_text());checks=[]
 original=json.loads((ROOT/'seeds/original-metadata.json').read_text())
 assert [r['original_metadata'] for r in data['layers']]==original,'original metadata changed'
 for row in data['layers']:
  p=ROOT/row['file']; seed=ROOT/'seeds'/p.name
  assert digest(seed)==row['source_sha256'], seed
  with Image.open(p) as im,Image.open(seed) as old:
   im.load();old.load();assert im.size==(256,256) and im.mode=='RGBA'
   a=im.getchannel('A');assert a.tobytes()==old.getchannel('A').tobytes(),'alpha changed'
   box=a.getbbox();x0,y0,x1,y1=box;margins=[x0,y0,256-x1,256-y1];assert min(margins)>=12
   assert digest(p)==row['sha256']
   checks.append({'file':row['file'],'size':[256,256],'mode':'RGBA','alpha_extrema':list(a.getextrema()),'alpha_bbox':list(box),'clear_margins_ltrb':margins,'alpha_equal_original':True,'transparent_pixels':a.histogram()[0],'nonzero_pixels':65536-a.histogram()[0],'metadata_equal_original':True})
 files={}
 for p in sorted(ROOT.rglob('*')):
  if p.is_file() and p.name!='validation.json':
   v={'sha256':digest(p),'bytes':p.stat().st_size}
   if p.suffix.lower()=='.png':
    with Image.open(p) as im:im.load();v.update(size=list(im.size),mode=im.mode,frames=im.n_frames)
   files[str(p.relative_to(ROOT))]=v
 return {'task':'ART-VFX-WB-TRIO-REV-001','source_commit':'df25df95ce31581e418b19a595aca3780a5d62a6','pillow':Image.__version__,'files':files,'self_excluded':'validation.json','checks':checks,'status':{'created':True,'visually_reviewed':'static composites and sampled original clip frames only','in_game_tested':False,'owner_approved':False}}
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--verify',action='store_true');args=parser.parse_args()
 if args.verify:
  expected=json.loads((ROOT/'validation.json').read_text());actual=audit();assert expected==actual,'manifest/inventory/check mismatch';print(f"PASS: {len(actual['files'])} files, 7 RGBA layers, original alpha/pivots/anchors/margins preserved; not owner approval")
 else:
  build();(ROOT/'validation.json').write_text(json.dumps(audit(),ensure_ascii=False,indent=2)+'\n');print('Built 7 layers and real-game static comparisons')
