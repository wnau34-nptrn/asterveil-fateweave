"""Encode CDP frames with their real timestamps, as in the approved VFX slices.
Usage: python tests/browser/fixtures/encode-defense-clips.py [capture directory]
Requires Pillow, ffmpeg and ffprobe. No generated animation or interpolated frames.
"""
from pathlib import Path
from PIL import Image
import json
import subprocess
import sys

root = Path(__file__).resolve().parents[3]
captures = root / (sys.argv[1] if len(sys.argv) > 1 else 'test-results/defense-delivery')
out = root / 'docs/combat-presentation/defense-slice'
out.mkdir(parents=True, exist_ok=True)
manifest = []
for stamps in sorted(captures.glob('*/stamps.txt')):
    lines = stamps.read_text().splitlines()
    click = float(lines[0].split()[1])
    frames = sorted([(n, float(t)) for n, t in (line.split() for line in lines[1:])], key=lambda f: f[1])
    assert frames[0][1] <= click <= frames[-1][1], 'Missing or invalid input timestamp'
    impacts = json.loads((stamps.parent / 'timing.json').read_text())
    name = stamps.parent.name.removeprefix('defense-clips-defense-clip-')
    concat = stamps.parent / 'concat.txt'
    text = []
    for i, (n, t) in enumerate(frames):
        text.append(f"file '{(stamps.parent / 'frames' / (n + '.jpg')).as_posix()}'")
        text.append(f'duration {max(.001, frames[i + 1][1] - t) if i + 1 < len(frames) else .05:.6f}')
    text.append(f"file '{(stamps.parent / 'frames' / (frames[-1][0] + '.jpg')).as_posix()}'")
    concat.write_text('\n'.join(text) + '\n')
    target = out / f'{name}-390.mp4'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat), '-fps_mode', 'vfr', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(target)], check=True)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'quiet', '-show_streams', '-show_format', '-of', 'json', str(target)]))
    stream = probe['streams'][0]
    assert (stream['width'], stream['height']) == (390, 844)
    manifest.append({'file': target.name, 'width': stream['width'], 'height': stream['height'], 'duration': float(probe['format']['duration']), 'capturedFrames': len(frames), 'clickOffset': round(click - frames[0][1], 3), 'maxFrameGap': round(max(b[1] - a[1] for a, b in zip(frames, frames[1:])), 3), 'impacts': [{**impact, 'at': round(impact['at'] - frames[0][1], 3)} for impact in impacts]})
    # Still extracted from the real cast/response cue, not from input time.
    response = any(x in name for x in ['guard-normal','-counter-','-stone-','-save-','-blocked-','-partial-','-dodged-','-cancelled-'])
    impact = next(i for i in impacts if i['side'] == ('enemy' if response else 'hero'))
    contact = impact['at'] + .07
    selected = min(frames, key=lambda f: abs(f[1] - contact))
    Image.open(stamps.parent / 'frames' / (selected[0] + '.jpg')).save(out / f'{name}-390.png')
(out / 'clips.json').write_text(json.dumps(manifest, indent=2) + '\n')
(out / 'clips.js').write_text('/* global window */\nwindow.defenseClips = '+json.dumps(manifest)+';\n')
print(f'Encoded {len(manifest)} actual-timestamp clips into {out}')
