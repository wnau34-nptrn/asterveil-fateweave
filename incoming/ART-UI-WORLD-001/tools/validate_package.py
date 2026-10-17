from pathlib import Path
from PIL import Image
import hashlib,json,re
P=Path(__file__).resolve().parents[1]
errors=[]
def check(ok,msg):
 if not ok:errors.append(msg)
required=['world-390x844','world-844x390','world-1366x768','world-states','encounter-transition','title-390x844','title-1366x768','battle-390x844','battle-1366x768']
for n in required:
 f=P/'mockups'/(n+'.png');check(f.exists(),'Missing mockup '+n)
 if re.search(r'\d+x\d+$',n) and f.exists():
  match=re.search(r'(\d+)x(\d+)$',n);check(Image.open(f).size==(int(match[1]),int(match[2])),'Wrong size '+n)
frames=json.loads((P/'tiles/tileset.json').read_text());im=Image.open(P/'tiles/tileset.png').convert('RGBA')
for zone in ['meadow','thicket','scar','sanctum']:
 for i in range(4):check(zone+'_'+str(i) in frames,'Missing floor '+zone+'_'+str(i))
for n in ['camp_ground_0','camp_ground_1','wall_top','wall_face','wall_inner']:check(n in frames,'Missing '+n)
check(max(im.size)<=2048,'Atlas exceeds limit')
for n,f in frames.items():
 check(f['w']==f['h']==128,'Bad frame '+n);check(f['x']+128<=im.width and f['y']+128<=im.height,'Atlas bounds '+n)
 crop=im.crop((f['x'],f['y'],f['x']+128,f['y']+128));check(crop.getchannel('A').getextrema()[1]>=240,'Empty floor '+n)
decor=json.loads((P/'tiles/decor.json').read_text());di=Image.open(P/'tiles/decor.png').convert('RGBA')
for zone in ['meadow','thicket','scar','sanctum']:check(sum(f['zone']==zone for f in decor.values())>=6,'Too few props '+zone)
for n,f in decor.items():
 crop=di.crop((f['x'],f['y'],f['x']+128,f['y']+128));a=crop.getchannel('A');check(a.getextrema()[0]==0 and a.getextrema()[1]>128,'Missing transparency/content '+n)
 solid=a.point(lambda v:255 if v>=96 else 0).getbbox();check(solid and solid[3]>=121 and solid[3]<=128,'Bad baseline '+n)
for n in ['landmark_camp','landmark_start','landmark_gate','landmark_gate_open','boss_pedestal','landmark_boss_cleared']:
 for ext in ['webp','png']:
  f=P/'tiles'/(n+'.'+ext);check(f.exists(),'Missing landmark '+n+'.'+ext)
  if f.exists():
   li=Image.open(f).convert('RGBA');check(li.size==(256,256),'Landmark dimensions '+n);check(li.getchannel('A').getextrema()[0]==0 and li.getchannel('A').getextrema()[1]>128,'Blank landmark '+n)
for n in ['fog_tile','fog_edge_n','fog_edge_s','fog_edge_e','fog_edge_w','fog_corner_ne','fog_corner_se','fog_corner_sw','fog_corner_nw','token_frame','step_hint']:
 check(Image.open(P/'tiles'/(n+'.png')).size==(128,128),'Bad dimensions '+n)
for n in ['step_dust','camp_fire']:
 for ext in ['webp','png']:check(Image.open(P/'tiles'/(n+'.'+ext)).size==(512,128),'Bad strip '+n)
 check(len(json.loads((P/'tiles'/(n+'.json')).read_text()))==4,'Bad frame count '+n)
icons=['up','down','left','right','camp','rest','flag','gate','star','danger','safe-shield','boss','map','footprints','info','close','settings','check','circle','attack','guard','bash','mark','precision-strike','arcane-bolt','ward','heal','prayer','talk']
for n in icons:
 f=P/'icons'/(n+'.svg');check(f.exists(),'Missing icon '+n)
 if f.exists():
  s=f.read_text();check('viewBox="0 0 24 24"' in s and 'currentColor' in s and 'stroke-width="1.8"' in s,'Invalid icon '+n);check('<text' not in s,'Text in icon '+n)
check('<text' not in (P/'title/logo.svg').read_text(),'Logo not outlined')
check(Image.open(P/'title/title_bg.webp').size==(1920,1080),'Wrong title size')
check(Image.open(P/'ui/panel_frame_9slice.png').size==(128,128),'Wrong panel size')
for n in ['STYLE_GUIDE.md','NOTES.md','tokens.css','ui/HUD_KIT.md','fx/README.md','fx/effects.css']:check((P/n).exists(),'Missing document '+n)
runtime_files=[f for d in ['tiles','ui','icons','title','fx'] for f in (P/d).glob('*') if f.suffix in ['.png','.webp','.svg','.css','.json']]+[P/'tokens.css']
total=sum(f.stat().st_size for f in runtime_files);check(total<=2500000,'Runtime budget exceeded: '+str(total))
checks=json.loads((P/'reference/validation.json').read_text());check(not checks['errors'],'Browser console errors');check(all(checks['interactions'].values()),'Reference interaction failure');check(len(checks['checks'])==33,'Missing viewport checks')
for c in checks['checks']:check(not c['small'] and not c['outside'] and not c['clipped'] and c['scrollWidth']<=c['w'] and c['scrollHeight']<=c['h'],'Layout failure '+str((c['mode'],c['w'],c['h'])));check(c.get('fullMap',True) and c.get('noSidebar',True) and c.get('cornerControls',True),'Full-screen HUD failure '+str((c['mode'],c['w'],c['h'])))
originals=json.loads((P/'reference/original-art-provenance.json').read_text())
for original in originals['files']:
 data=(P/'reference'/(original['name']+'.webp')).read_bytes();blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\x00'+data).hexdigest();check(blob==original['gitBlobSha'],'Source art changed '+original['name'])
# WCAG text colours on the stable navy backing used by the reference.
def lum(h):
 v=[int(h[i:i+2],16)/255 for i in (1,3,5)];v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v];return sum(x*k for x,k in zip(v,[.2126,.7152,.0722]))
contrast={}
for fg,bg in [('#f4f7fc','#14243a'),('#bbcadb','#14243a'),('#74d4ef','#14243a'),('#68e5b6','#14243a'),('#ed927f','#14243a'),('#b59aff','#14243a'),('#d9bf86','#14243a'),('#172135','#d9bf86'),('#f4f7fc','#39414c'),('#bbcadb','#39414c')]:
 ratio=(max(lum(fg),lum(bg))+.05)/(min(lum(fg),lum(bg))+.05);contrast[fg+' on '+bg]=round(ratio,2);check(ratio>=4.5,'Contrast below AA '+fg)
files=[]
for f in sorted(P.rglob('*')):
 if not f.is_file() or f.name in ['MANIFEST.json','intake-validation.json']:continue
 d={'path':str(f.relative_to(P)),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'runtime':f in runtime_files}
 if f.suffix in ['.png','.webp']:
  ii=Image.open(f);d.update(w=ii.width,h=ii.height,mode=ii.mode)
 files.append(d)
manifest={'version':1,'package':'ART-UI-WORLD-001','runtimeBudgetBytes':2500000,'runtimeBytesIncludingPngFallbacks':total,'runtimePrimaryTransferBytes':sum(f.stat().st_size for f in runtime_files if f.suffix!='.png' and f.name!='logo.source.svg'),'files':files}
(P/'MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
report={'passed':not errors,'errors':errors,'runtimeBytesIncludingPngFallbacks':total,'runtimeBudgetBytes':2500000,'viewportChecks':len(checks['checks']),'textContrastRatios':contrast,'sourceArtPreservation':'reference copies only; no runtime changes','limitations':['Static art reference, not integrated gameplay','Chromium emulation; physical mobile/Safari not tested']}
(P/'reference/intake-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
raise SystemExit(bool(errors))
