#!/usr/bin/env python3
"""W8 lossless atlas repack: trim each frame to its visible pixels, share identical frames, MaxRects-pack tighter.

Every frame is re-cut from the shipped atlas and verified RGBA-identical wherever it is visible (alpha 0 stays alpha 0) after packing and
WebP lossless encode/decode. Names, sourceSize and the drawn position of each frame are unchanged; only the packed
rectangle and trim offsets move. Prints a JSON report; writes nothing unless --write.

  python3 scripts/repack-atlas-lossless.py public/assets/fx/bolt_fx.json [--write]
  python3 scripts/repack-atlas-lossless.py --unit lyra [--write]   # hashed unit atlas + unit-atlases.json manifest
"""
import argparse, hashlib, io, json, pathlib, sys
import numpy as np
from PIL import Image

PAD = 2  # transparent gap kept around every packed rectangle (no filter bleed between frames)
MAX_SIDE = 2048


def frames_of(data):
    fr = data['frames']
    return list(fr.items()) if isinstance(fr, dict) else [(f['filename'], f) for f in fr]


def source_canvas(img, f):
    """The frame as drawn: its full source-size RGBA canvas."""
    r, src = f['frame'], f.get('sourceSize') or {'w': f['frame']['w'], 'h': f['frame']['h']}
    sss = f.get('spriteSourceSize') or {'x': 0, 'y': 0}
    canvas = Image.new('RGBA', (src['w'], src['h']))
    canvas.paste(img.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])), (sss['x'], sss['y']))
    return canvas


def same_render(a, b):
    """Identical RGBA wherever the original is visible; fully transparent wherever it is not. Phaser uploads textures
    premultiplied, so the RGB of an alpha-0 pixel is never sampled."""
    x, y = np.asarray(a), np.asarray(b)
    visible = y[..., 3] > 0
    return bool((x[visible] == y[visible]).all() and (x[~visible][..., 3] == 0).all())


ORDERS = [lambda w, h: (-max(w, h), -min(w, h)), lambda w, h: (-h, -w), lambda w, h: (-w, -h), lambda w, h: (-w * h,)]


def maxrects(sizes, width, order=ORDERS[0]):
    free, placed, height = [(0, 0, width, 1 << 15)], {}, 0
    for key, (w, h) in sorted(sizes.items(), key=lambda kv: (*order(*kv[1]), kv[0])):
        w2, h2 = w + PAD, h + PAD
        best = None
        for fx, fy, fw, fh in free:
            if w2 <= fw and h2 <= fh:
                score = (fy + h2, fx)
                if best is None or score < best[0]: best = (score, fx, fy)
        if best is None: return None
        _, x, y = best
        placed[key] = (x, y); height = max(height, y + h2)
        rect, nxt = (x, y, w2, h2), []
        for f in free:
            fx, fy, fw, fh = f
            if x >= fx + fw or x + w2 <= fx or y >= fy + fh or y + h2 <= fy: nxt.append(f); continue
            if x > fx: nxt.append((fx, fy, x - fx, fh))
            if x + w2 < fx + fw: nxt.append((x + w2, fy, fx + fw - x - w2, fh))
            if y > fy: nxt.append((fx, fy, fw, y - fy))
            if y + h2 < fy + fh: nxt.append((fx, y + h2, fw, fy + fh - y - h2))
        free = [a for a in nxt if not any(a != b and a[0] >= b[0] and a[1] >= b[1] and a[0] + a[2] <= b[0] + b[2] and a[1] + a[3] <= b[1] + b[3] for b in nxt)]
    return placed, height


def repack(image_path, data):
    img = Image.open(image_path).convert('RGBA')
    tiles, unique, frames = {}, {}, {}
    for name, f in frames_of(data):
        canvas = source_canvas(img, f)
        box = canvas.getbbox() or (0, 0, 1, 1)
        tile = canvas.crop(box)
        key = hashlib.sha256(tile.tobytes() + repr(tile.size).encode()).hexdigest()
        unique.setdefault(key, tile)
        tiles[name] = (key, box, canvas.size, canvas)
    sizes = {k: t.size for k, t in unique.items()}
    widest = max(w for w, _ in sizes.values()) + PAD
    best = None
    for width in range(widest, MAX_SIDE + 1, 8):
        for order in ORDERS:
            plan = maxrects(sizes, width, order)
            # Both sides stay within 2048 (the size every shipped atlas already respected), safe on low-end GPUs.
            if plan and plan[1] <= MAX_SIDE and (best is None or width * plan[1] < best[0]): best = (width * plan[1], width, plan)
    _, width, (positions, height) = best
    atlas = Image.new('RGBA', (width, height))
    for key, tile in unique.items(): atlas.paste(tile, (positions[key][0] + 1, positions[key][1] + 1))
    buf = io.BytesIO(); atlas.save(buf, format='WEBP', lossless=True, exact=False, method=6, quality=100)
    decoded = Image.open(io.BytesIO(buf.getvalue())).convert('RGBA')
    for name, (key, box, size, canvas) in tiles.items():
        x, y = positions[key][0] + 1, positions[key][1] + 1
        w, h = unique[key].size
        frames[name] = {**dict(frames_of(data))[name], 'frame': {'x': x, 'y': y, 'w': w, 'h': h}, 'rotated': False, 'trimmed': True,
                        'spriteSourceSize': {'x': box[0], 'y': box[1], 'w': w, 'h': h}, 'sourceSize': {'w': size[0], 'h': size[1]}}
        check = Image.new('RGBA', size); check.paste(decoded.crop((x, y, x + w, y + h)), (box[0], box[1]))
        if not same_render(check, canvas): sys.exit(f'frame {name} differs after repack')
    out = {**data, 'frames': frames, 'meta': {**data.get('meta', {}), 'size': {'w': width, 'h': height}}}
    return out, buf.getvalue(), img.size


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('atlas', nargs='?'); ap.add_argument('--unit'); ap.add_argument('--write', action='store_true')
    a = ap.parse_args()
    if a.unit:
        manifest_path = pathlib.Path('src/game/visuals/unit-atlases.json'); manifest = json.loads(manifest_path.read_text())
        entry = manifest[a.unit]; base = pathlib.Path('public/assets/units')
        json_path, image_path = base / entry['atlas'], base / entry['image']
    else:
        json_path = pathlib.Path(a.atlas); image_path = json_path.with_name(json.loads(json_path.read_text())['meta']['image'])
    data = json.loads(json_path.read_text())
    out, webp, old = repack(image_path, data)
    report = {'atlas': str(json_path), 'before': {'size': old, 'decodedBytes': old[0] * old[1] * 4, 'imageBytes': image_path.stat().st_size},
              'after': {'size': [out['meta']['size']['w'], out['meta']['size']['h']], 'decodedBytes': out['meta']['size']['w'] * out['meta']['size']['h'] * 4, 'imageBytes': len(webp)},
              'frames': len(out['frames']), 'verified': 'every frame RGBA-identical where visible, transparent elsewhere (premultiplied upload)'}
    keep = report['after']['decodedBytes'] < report['before']['decodedBytes'] or report['after']['imageBytes'] < report['before']['imageBytes']
    report['written'] = bool(a.write and keep)
    if a.write and keep:
        if a.unit:
            stem = entry['image'].split('.')[0]
            image_name = f"{stem}.{hashlib.sha256(webp).hexdigest()[:12]}.webp"
            out['meta']['image'] = image_name
            raw = (json.dumps(out, separators=(',', ':'), sort_keys=True) + '\n').encode()
            json_name = f"{stem}.{hashlib.sha256(raw).hexdigest()[:12]}.json"
            (base / entry['image']).unlink(); (base / entry['atlas']).unlink()
            (base / image_name).write_bytes(webp); (base / json_name).write_bytes(raw)
            manifest[a.unit] = {**entry, 'image': image_name, 'atlas': json_name, 'width': out['meta']['size']['w'], 'height': out['meta']['size']['h'],
                                'decodedBytes': report['after']['decodedBytes'], 'downloadBytes': len(webp) + len(raw)}
            manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
        else:
            image_path.write_bytes(webp); json_path.write_text(json.dumps(out, indent=1) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
