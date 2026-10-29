"""Preserve every CDP frame and timestamp; verify the MP4 by decoding it again."""
from pathlib import Path
from PIL import Image
import json, subprocess, sys, re
ROOT=Path(__file__).resolve().parents[3]
CAP=ROOT/(sys.argv[1] if len(sys.argv)>1 else 'test-results/unit-a3-delivery');OUT=ROOT/'docs/combat-presentation/unit-a3-slice';OUT.mkdir(parents=True,exist_ok=True)
manifest=[]
for stamps in sorted(CAP.glob('*/stamps.txt')):
 lines=stamps.read_text().splitlines();click=float(lines[0].split()[1]);frames=sorted([(n,float(t)) for n,t in (s.split() for s in lines[1:])],key=lambda f:f[1]);assert frames[0][1]<=click<=frames[-1][1]
 impacts=json.loads((stamps.parent/'timing.json').read_text());hero=next(i['turn'] for i in impacts if i['turn']['side']=='hero' and i['turn']['actorId']=='healer');intent=hero.get('intent') or hero['before']['intent'];suffix=re.search(r'-(enemy-down|hurt|down|revive|normal)-(normal|fast|reduced|osreduce)$',stamps.parent.name);assert suffix,stamps.parent.name
 name=f"{hero['action']}-{intent['name'].replace(' ','')}-{suffix[1]}-{suffix[2]}";concat=[]
 for i,(n,t) in enumerate(frames):
  concat.extend([f"file '{stamps.parent/'frames'/f'{n}.jpg'}'",'option framerate 90000',f'duration {max(1/90000,frames[i+1][1]-t) if i+1<len(frames) else .05:.6f}'])
 concat.extend([f"file '{stamps.parent/'frames'/f'{frames[-1][0]}.jpg'}'",'option framerate 90000'])
 path=stamps.parent/'concat.txt';path.write_text('\n'.join(concat)+'\n');target=OUT/f'{name}-390.mp4'
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(path),'-fps_mode','vfr','-enc_time_base','1:90000','-x264-params','fps=60/1:force-cfr=0','-bf','0','-c:v','libx264','-crf','20','-profile:v','high','-level:v','3.1','-vf','scale=in_range=full:out_range=tv','-pix_fmt','yuv420p','-color_range','tv','-video_track_timescale','90000','-movflags','+faststart',str(target)],check=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(target)]));stream=probe['streams'][0];assert (stream['width'],stream['height'])==(390,844)
 decoded=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(target)]))['frames']
 expected=[t-frames[0][1] for _,t in frames]+[frames[-1][1]-frames[0][1]+.05];assert len(decoded)==len(expected)==int(stream['nb_frames'])
 error=max(abs(float(f['best_effort_timestamp_time'])-t) for f,t in zip(decoded,expected));assert error<.0005;assert float(probe['format']['duration'])>=expected[-1]-.001
 for label,impact in [('seren',next(i for i in impacts if i['turn']['side']=='hero' and i['turn']['actorId']=='healer')),('mycon',next((i for i in impacts if i['turn']['side']=='enemy'),None))]:
  if impact and name in ['attack-SporeHex-normal-normal','prayer-SporeHex-normal-normal','heal-SporeHex-normal-normal']:
   selected=min(frames,key=lambda f:abs(f[1]-(impact['at']+.18)));Image.open(stamps.parent/'frames'/f'{selected[0]}.jpg').save(OUT/f'{name}-{label}-390.png')
 manifest.append({'file':target.name,'duration':float(probe['format']['duration']),'capturedFrames':len(frames),'maxFrameGap':round(max(b[1]-a[1] for a,b in zip(frames,frames[1:])),3),'maxTimestampErrorMs':round(error*1000,4),'clickOffset':round(click-frames[0][1],3),'rawCapture':str(stamps.parent.relative_to(ROOT)),'captureStartUTCSeconds':frames[0][1],'impacts':[{**i,'at':round(i['at']-frames[0][1],3)} for i in impacts]})
(OUT/'clips.json').write_text(json.dumps(manifest,indent=2)+'\n');(OUT/'clips.js').write_text('/* global window */\nwindow.unitA3Clips='+json.dumps(manifest)+';\n');print(f'Encoded and independently decoded {len(manifest)} actual-timestamp clips')
