#!/usr/bin/env python3
"""Build the shipped map atlases from the lossless masters (B5, 2026-11-21).

assets-master/world/{tileset,decor}.webp (lossless, never shipped) -> public/assets/world/ (lossy, same size/frames).
Image size and every frame coordinate stay identical; only the pixel encoding changes. Alpha is kept lossless.
Run: python3 scripts/build-lossy-world.py [--report]   (Pillow). After a change bump the `?v=` in
src/game/visuals/world-art.ts (WORLD_REV, SHA-256 prefix printed below). --report also prints per-frame error."""
import hashlib, io, json, os, sys
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS = {'tileset': 92, 'decor': 92}  # WebP quality per atlas

def build(name, q, report):
    src = os.path.join(ROOT, 'assets-master/world', name + '.webp')
    im = Image.open(src).convert('RGBA')
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, alpha_quality=100, method=6)
    data = buf.getvalue()
    out = os.path.join(ROOT, 'public/assets/world', name + '.webp'); open(out, 'wb').write(data)
    print(f'{name}: master {os.path.getsize(src)} -> {len(data)} bytes ({os.path.getsize(src)/len(data):.2f}x), rev {hashlib.sha256(data).hexdigest()[:8]}')
    if report:
        a = np.asarray(im).astype(int); b = np.asarray(Image.open(io.BytesIO(data)).convert('RGBA')).astype(int)
        vis = a[..., 3] > 0
        d = np.abs(a[..., :3] - b[..., :3]).max(axis=2)
        print(f'  alpha max diff {np.abs(a[..., 3] - b[..., 3]).max()}; visible RGB mean {d[vis].mean():.2f} max {d[vis].max()}')
        frames = json.load(open(os.path.join(ROOT, 'src/content/world', name + '.json')))
        worst = 0
        for k, f in frames.items():
            x, y, w, h = f['x'], f['y'], f['w'], f['h']
            m = vis[y:y+h, x:x+w]; dd = d[y:y+h, x:x+w]
            e = np.zeros_like(m); e[0, :] = e[-1, :] = e[:, 0] = e[:, -1] = True
            ring = dd[m & e]
            if ring.size: worst = max(worst, ring.max())
        print(f'  worst visible frame-edge RGB diff {worst}')

if __name__ == '__main__':
    for n, q in JOBS.items(): build(n, q, '--report' in sys.argv)
