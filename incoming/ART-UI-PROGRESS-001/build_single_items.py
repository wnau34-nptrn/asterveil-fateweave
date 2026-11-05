"""Export the single progression items used in game: rift core (256 -> 128 px) and the star sockets (64 px, unchanged), lossless.
Usage: python3 -I build_single_items.py <package dir> <out dir>  (raw files are not modified)."""
import sys
from PIL import Image
import numpy as np
src, out = sys.argv[1:3]
def shrink(im, size):
    a = np.asarray(im.convert('RGBA')).astype(np.float64); a[..., :3] *= a[..., 3:] / 255
    p = np.asarray(Image.fromarray(a.round().astype(np.uint8), 'RGBA').resize((size, size), Image.LANCZOS)).astype(np.float64); al = p[..., 3:]
    p[..., :3] = np.where(al > 0, p[..., :3] * 255 / np.maximum(al, 1), 0)
    return Image.fromarray(np.clip(p.round(), 0, 255).astype(np.uint8), 'RGBA')
shrink(Image.open(f'{src}/rift_core.png'), 128).save(f'{out}/rift_core.webp', 'WEBP', lossless=True, exact=True)
for n in ('star_fate_empty', 'star_fate_lit'):
    Image.open(f'{src}/{n}.png').convert('RGBA').save(f'{out}/{n}.webp', 'WEBP', lossless=True, exact=True)
