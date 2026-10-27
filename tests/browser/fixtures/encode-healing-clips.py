"""Encode CDP frames with their real timestamps, as in the approved VFX slices.
Usage: python tests/browser/fixtures/encode-healing-clips.py [capture directory] [--merge]
Requires Pillow, ffmpeg and ffprobe. No generated animation or interpolated frames.
"""
from pathlib import Path
from PIL import Image
import json
import subprocess
import sys

root = Path(__file__).resolve().parents[3]
captures = root / next((arg for arg in sys.argv[1:] if not arg.startswith('--')), 'test-results/healing-delivery')
out = root / 'docs/combat-presentation/healing-slice'
out.mkdir(parents=True, exist_ok=True)
manifest = json.loads((out/'clips.json').read_text()) if '--merge' in sys.argv and (out/'clips.json').exists() else []
encoded = 0
for stamps in sorted(captures.glob('*/stamps.txt')):
    lines = stamps.read_text().splitlines()
    click = float(lines[0].split()[1])
    frames = sorted([(n, float(t)) for n, t in (line.split() for line in lines[1:])], key=lambda f: f[1])
    assert frames[0][1] <= click <= frames[-1][1], 'Missing or invalid input timestamp'
    impacts = json.loads((stamps.parent / 'timing.json').read_text())
    name = stamps.parent.name.removeprefix('healing-clips-healing-clip-')
    concat = stamps.parent / 'concat.txt'
    text = []
    for i, (n, t) in enumerate(frames):
        text.append(f"file '{(stamps.parent / 'frames' / (n + '.jpg')).as_posix()}'")
        text.append('option framerate 60')
        text.append(f'duration {max(.001, frames[i + 1][1] - t) if i + 1 < len(frames) else .05:.6f}')
    text.append(f"file '{(stamps.parent / 'frames' / (frames[-1][0] + '.jpg')).as_posix()}'")
    text.append('option framerate 60')
    concat.write_text('\n'.join(text) + '\n')
    target = out / f'{name}-390.mp4'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat), '-fps_mode', 'vfr', '-c:v', 'libx264', '-crf', '20', '-profile:v', 'high', '-level:v', '3.1', '-vf', 'scale=in_range=full:out_range=tv', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-video_track_timescale', '90000', '-movflags', '+faststart', str(target)], check=True)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'quiet', '-show_streams', '-show_format', '-of', 'json', str(target)]))
    stream = probe['streams'][0]
    assert (stream['width'], stream['height']) == (390, 844)
    manifest = [entry for entry in manifest if entry['file'] != target.name]
    encoded += 1
    manifest.append({'file': target.name, 'width': stream['width'], 'height': stream['height'], 'duration': float(probe['format']['duration']), 'capturedFrames': len(frames), 'clickOffset': round(click - frames[0][1], 3), 'maxFrameGap': round(max(b[1] - a[1] for a, b in zip(frames, frames[1:])), 3), 'impacts': [{**impact, 'at': round(impact['at'] - frames[0][1], 3)} for impact in impacts]})
    # Export real cast and upkeep frames separately. Each uses the first captured paint
    # at/after its actual callback+180ms; no generated frames or timing interpolation.
    for label, cue in [('cast', next(i for i in impacts if i['side']=='hero' and i.get('action') in ['heal','prayer','rouse','revive','bless','mend'])),
                       ('tick', next((i for i in impacts if any(c['kind']=='tick' for c in i['cues'])), None))]:
        if cue is None:
            continue
        selected = next((f for f in frames if f[1] >= cue['at']+.18), frames[-1])
        Image.open(stamps.parent/'frames'/(selected[0]+'.jpg')).save(out/f'{name}-{label}-390.png')
    assert int(stream['nb_frames']) == len(frames)+1, 'All captured frames plus final hold must survive'
(out / 'clips.json').write_text(json.dumps(manifest, indent=2) + '\n')
(out / 'clips.js').write_text('/* global window */\nwindow.healingClips = '+json.dumps(manifest)+';\n')
print(f'Encoded {encoded} actual-timestamp clips, preserved {len(manifest)} review entries in {out}')
