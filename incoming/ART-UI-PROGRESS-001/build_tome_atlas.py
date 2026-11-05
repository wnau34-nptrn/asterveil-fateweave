"""Build the in-game tome atlas from the delivered 256px cells: nine tomes, 128px cells, 3x3, lossless.
Usage: python3 -I build_tome_atlas.py <package dir> <out webp> <out json>  (raw files are not modified)."""
import json, sys
from PIL import Image
import numpy as np
src, out_webp, out_json = sys.argv[1:4]
lines, sizes = ('bulwark', 'blade', 'accord'), ('small', 'medium', 'large')
atlas = Image.new('RGBA', (384, 384), (0, 0, 0, 0)); frames = {}
for r, l in enumerate(lines):
    for c, z in enumerate(sizes):
        im = Image.open(f'{src}/tome_{l}_{z}.png').convert('RGBA')
        a = np.asarray(im).astype(np.float64); a[..., :3] *= a[..., 3:] / 255  # premultiply: no dark fringe when shrinking
        pm = Image.fromarray(a.round().astype(np.uint8), 'RGBA').resize((128, 128), Image.LANCZOS)
        p = np.asarray(pm).astype(np.float64); al = p[..., 3:]
        p[..., :3] = np.where(al > 0, p[..., :3] * 255 / np.maximum(al, 1), 0)
        atlas.paste(Image.fromarray(np.clip(p.round(), 0, 255).astype(np.uint8), 'RGBA'), (c * 128, r * 128))
        frames[f'tome_{l}_{z}'] = {'x': c * 128, 'y': r * 128, 'w': 128, 'h': 128}
atlas.save(out_webp, 'WEBP', lossless=True, exact=True)
json.dump(frames, open(out_json, 'w'), indent=2); open(out_json, 'a').write('\n')
