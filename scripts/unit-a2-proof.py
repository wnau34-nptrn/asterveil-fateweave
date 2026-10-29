"""Retain capture metadata/state and bind every video/source/art to a reproducible proof."""
from pathlib import Path
import json,hashlib,subprocess,shutil
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/combat-presentation/unit-a2-slice'
clips=json.loads((OUT/'clips.json').read_text());assert len(clips)==26
proof={'base':'f0ee801792f4a0a081a2752cadfdd99d63b50dbe','sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
 'sourceTree':subprocess.check_output(['git','rev-parse','HEAD:src'],cwd=ROOT,text=True).strip(),'publicTree':subprocess.check_output(['git','rev-parse','HEAD:public'],cwd=ROOT,text=True).strip(),
 'environment':'Chromium / SwiftShader / cloud 390x844 touch emulation, not a physical phone or iOS Safari','retiming':'none; every captured frame and final hold preserved using CDP timestamps',
 'ownerVisualApproval':'No new owner visual approval is inferred from generation or tests.','clips':[]}
for clip in clips:
 raw=ROOT/clip['rawCapture'];name=clip['file'].removesuffix('-390.mp4');dest=OUT/'capture-metadata'/name;dest.mkdir(parents=True,exist_ok=True)
 for filename in ['stamps.txt','timing.json','final-state.json']:shutil.copyfile(raw/filename,dest/filename)
 video=OUT/clip['file'];proof['clips'].append({'file':clip['file'],'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'bytes':video.stat().st_size,'metadata':str(dest.relative_to(OUT)),**{k:clip[k] for k in ['capturedFrames','maxFrameGap','maxTimestampErrorMs','duration']}})
proof['capturedFrames']=sum(c['capturedFrames'] for c in clips);proof['maxFrameGap']=max(c['maxFrameGap'] for c in clips);proof['maxTimestampErrorMs']=max(c['maxTimestampErrorMs'] for c in clips)
proof['art']={}
for name in ['aegis','vargoth']:
 report=json.loads((ROOT/'incoming/ART-UNIT-ANIMATION-A2-001/validation.json').read_text())[name]
 proof['art'][name]={**report,'atlasSHA256':hashlib.sha256((ROOT/'public/assets/units'/report['image']).read_bytes()).hexdigest(),'jsonSHA256':hashlib.sha256((ROOT/'public/assets/units'/report['atlas']).read_bytes()).hexdigest()}
(OUT/'proof.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps({k:proof[k] for k in ['sourceTree','publicTree','capturedFrames','maxFrameGap','maxTimestampErrorMs']},indent=2))
