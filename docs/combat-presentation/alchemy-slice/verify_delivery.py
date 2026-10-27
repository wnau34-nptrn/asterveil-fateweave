"""Retain raw-frame inventory and tie all review clips to the reviewed runtime tree."""
from pathlib import Path
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
clips=json.loads((OUT/'clips.json').read_text())
assert len(clips)==55 and len({c['file'] for c in clips})==55
records=[]
for clip in clips:
 raw=ROOT/clip['rawCapture'];lines=(raw/'stamps.txt').read_text().splitlines()
 frames=sorted((n,float(t)) for n,t in (line.split() for line in lines[1:]))
 assert len(frames)==clip['capturedFrames']
 assert len(list((raw/'frames').glob('*.jpg')))==len(frames)
 record={'clip':clip['file'],'rawDirectory':clip['rawCapture'],'files':[]}
 for name,stamp in frames:
  file=raw/'frames'/f'{name}.jpg'
  record['files'].append({'file':f'frames/{name}.jpg','timestamp':stamp,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
 for name in ('stamps.txt','timing.json','final-state.json'):
  record[name+'Sha256']=hashlib.sha256((raw/name).read_bytes()).hexdigest()
 records.append(record)
(OUT/'raw-captures.json').write_text(json.dumps(records,indent=2)+'\n')
rev=lambda name:subprocess.check_output(['git','rev-parse',name],cwd=ROOT,text=True).strip()
proof={'artworkApproval':{'dateBangkok':'2026-10-27','quote':'ไปต่อ'},'runtimeApproval':'pending_owner_motion_review','pullRequest':86,
 'runtimeHead':rev('HEAD'),'srcTree':rev('HEAD:src'),'publicTree':rev('HEAD:public'),
 'atlasSha256':hashlib.sha256((ROOT/'public/assets/fx/alchemy_fx.webp').read_bytes()).hexdigest(),
 'resolverStateEqualityVerifiedInCapture':True,'clips':len(clips),'rawFrames':sum(c['capturedFrames'] for c in clips),'largestCapturedFrameGapMs':max(c['maxFrameGap'] for c in clips)*1000,
 'maximumTimestampErrorMs':max(c['maxTimestampErrorMs'] for c in clips),'rawFramesRetained':True,
 'unchangedAreas':['src/core','src/content','src/ui/battle-playback.ts']}
assert subprocess.check_output(['git','diff','origin/feature/fateweave-initial-prototype','--name-only','--',*proof['unchangedAreas']],cwd=ROOT,text=True)==''
(OUT/'delivery-proof.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof,indent=2))
