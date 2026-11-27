"""Encode hero-life CDP frames with their real timestamps (no interpolated frames).
Usage: python3 tests/browser/fixtures/encode-hero-life-clips.py [capture dir] [out dir]
Requires ffmpeg.
"""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[3]
captures = root / (sys.argv[1] if len(sys.argv) > 1 else 'test-results/hero-life-clips')
out = root / (sys.argv[2] if len(sys.argv) > 2 else 'docs/validation/hero-life-2026-11-27')
out.mkdir(parents=True, exist_ok=True)
for stamps in sorted(captures.glob('*/stamps.txt')):
    frames = sorted([(n, float(t)) for n, t in (l.split() for l in stamps.read_text().splitlines() if l.strip())], key=lambda f: f[1])
    name = stamps.parent.name.split('hero-life-clip-')[-1]
    lines = []
    for i, (n, t) in enumerate(frames):
        lines.append(f"file '{(stamps.parent / 'frames' / (n + '.jpg')).as_posix()}'")
        lines.append(f'duration {max(.001, frames[i + 1][1] - t) if i + 1 < len(frames) else .05:.6f}')
    lines.append(f"file '{(stamps.parent / 'frames' / (frames[-1][0] + '.jpg')).as_posix()}'")
    concat = stamps.parent / 'concat.txt'; concat.write_text('\n'.join(lines) + '\n')
    target = out / f'{name}-390.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(concat), '-vf', 'scale=390:-2,fps=30',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', str(target)], check=True)
    print(target.relative_to(root), len(frames), 'frames')
