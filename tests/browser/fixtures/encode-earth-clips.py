"""Encode CDP frames with their real timestamps, as in the approved VFX slices.
Usage: python tests/browser/fixtures/encode-earth-clips.py [capture directory] [--merge]
Requires Pillow, ffmpeg and ffprobe. No generated animation or interpolated frames.
"""
from pathlib import Path
from PIL import Image
import json
import subprocess
import sys

root = Path(__file__).resolve().parents[3]
captures = root / next((arg for arg in sys.argv[1:] if not arg.startswith('--')), 'test-results/earth-delivery')
out = root / 'docs/combat-presentation/earth-slice'
out.mkdir(parents=True, exist_ok=True)
manifest = json.loads((out/'clips.json').read_text()) if '--merge' in sys.argv and (out/'clips.json').exists() else []
encoded = 0
for stamps in sorted(captures.glob('*/stamps.txt')):
    lines = stamps.read_text().splitlines()
    click = float(lines[0].split()[1])
    frames = sorted([(n, float(t)) for n, t in (line.split() for line in lines[1:])], key=lambda f: f[1])
    assert frames[0][1] <= click <= frames[-1][1], 'Missing or invalid input timestamp'
    impacts = json.loads((stamps.parent / 'timing.json').read_text())
    name = stamps.parent.name.removeprefix('earth-clips-earth-clip-')
    concat = stamps.parent / 'concat.txt'
    text = []
    for i, (n, t) in enumerate(frames):
        text.append(f"file '{(stamps.parent / 'frames' / (n + '.jpg')).as_posix()}'")
        # Fine input ticks preserve compositor frames closer than1/60s.
        text.append('option framerate 90000')
        text.append(f'duration {max(1/90000, frames[i + 1][1] - t) if i + 1 < len(frames) else .05:.6f}')
    text.append(f"file '{(stamps.parent / 'frames' / (frames[-1][0] + '.jpg')).as_posix()}'")
    text.append('option framerate 90000')
    concat.write_text('\n'.join(text) + '\n')
    target = out / f'{name}-390.mp4'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat), '-fps_mode', 'vfr', '-enc_time_base', '1:90000', '-x264-params', 'fps=60/1:force-cfr=0', '-bf', '0', '-c:v', 'libx264', '-crf', '20', '-profile:v', 'high', '-level:v', '3.1', '-vf', 'scale=in_range=full:out_range=tv', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-video_track_timescale', '90000', '-movflags', '+faststart', str(target)], check=True)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'quiet', '-show_streams', '-show_format', '-of', 'json', str(target)]))
    stream = probe['streams'][0]
    assert (stream['width'], stream['height']) == (390, 844)
    manifest = [entry for entry in manifest if entry['file'] != target.name]
    encoded += 1
    manifest.append({'file': target.name, 'width': stream['width'], 'height': stream['height'], 'duration': float(probe['format']['duration']), 'capturedFrames': len(frames), 'clickOffset': round(click - frames[0][1], 3), 'maxFrameGap': round(max(b[1] - a[1] for a, b in zip(frames, frames[1:])), 3), 'impacts': [{**impact, 'at': round(impact['at'] - frames[0][1], 3)} for impact in impacts]})
    # Export real cast and upkeep frames separately. Each uses the first captured paint
    # at/after its actual callback+180ms; no generated frames or timing interpolation.
    for label, cue in [('cast', next(i for i in impacts if i['side']=='hero' and i.get('action') in ['bash','slam','quake','tremor'])),
                       ('followup', None)]:
        if cue is None:
            continue
        selected = next((f for f in frames if f[1] >= cue['at']+.18), frames[-1])
        Image.open(stamps.parent/'frames'/(selected[0]+'.jpg')).save(out/f'{name}-{label}-390.png')
    if name.endswith('-normal-normal'):
        cue = next(i for i in impacts if i['side']=='hero' and i.get('action') in ['bash','slam','quake','tremor'])
        when = cue['at'] + cue.get('remainingMs', 390)*.6/1000
        selected = next((f for f in frames if f[1]>=when), frames[-1])
        Image.open(stamps.parent/'frames'/(selected[0]+'.jpg')).save(out/f'{name}-afterglow-390.png')
    # Keep the actual pre-contact flight frame and original raw capture location.
    cast=next(i for i in impacts if i['side']=='hero' and i.get('action') in ['bash','slam','quake','tremor'])
    selected=min(frames,key=lambda f:abs(f[1]-(cast['at']-.09)))
    Image.open(stamps.parent/'frames'/(selected[0]+'.jpg')).save(out/f'{name}-flight-390.png')
    manifest[-1]['rawCapture']=str(stamps.parent.relative_to(root))
    manifest[-1]['captureStartUTCSeconds']=frames[0][1]
    assert int(stream['nb_frames']) == len(frames)+1, 'All captured frames plus final hold must survive'
    decoded = json.loads(subprocess.check_output(['ffprobe','-v','quiet','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(target)]))['frames']
    expected = [t-frames[0][1] for _,t in frames] + [frames[-1][1]-frames[0][1]+.05]
    error = max(abs(float(frame['best_effort_timestamp_time'])-t) for frame,t in zip(decoded,expected))
    assert len(decoded) == len(expected) and error < .0005, 'Captured timestamps must survive encoding'
    assert float(probe['format']['duration']) >= expected[-1]-.001, 'MP4 duration must include the final presented frame'
    manifest[-1]['maxTimestampErrorMs'] = round(error*1000,4)
(out / 'clips.json').write_text(json.dumps(manifest, indent=2) + '\n')
(out / 'clips.js').write_text('/* global window */\nwindow.earthClips = '+json.dumps(manifest)+';\n')
print(f'Encoded {encoded} actual-timestamp clips, preserved {len(manifest)} review entries in {out}')
