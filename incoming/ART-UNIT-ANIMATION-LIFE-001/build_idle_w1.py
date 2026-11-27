#!/usr/bin/env python3
"""Claude intake for ART-UNIT-ANIMATION-LIFE-001 W1 (owner 2026-11-27 “ดำเนินการได้”, trial): Aegis idle loop warped from the seed.

Frames w1-aegis-idle/frames/001..007 (512 seed space) are mapped onto Aegis's in-game frame 0 with the same measured
seed -> frame-0 mapping as build_victory.py, appended to the shipped aegis atlas as frames 32..38 and repacked losslessly
(every shipped frame verified RGBA-identical).

  python3 -I incoming/ART-UNIT-ANIMATION-LIFE-001/build_idle_w1.py <repo root> [--write]
"""
import hashlib, importlib.util, io, json, pathlib, sys
import numpy as np
from PIL import Image

ROOT = pathlib.Path(sys.argv[1]).resolve(); WRITE = '--write' in sys.argv
PKG = ROOT / 'incoming/ART-UNIT-ANIMATION-LIFE-001'
spec = importlib.util.spec_from_file_location('bv', PKG / 'build_victory.py'); sys.argv = sys.argv[:2]
bv = importlib.util.module_from_spec(spec); spec.loader.exec_module(bv)
# Owner 2026-11-27 “ท่ายืนเอกิส W1 ให้ขยับแรงขึ้น”: W1b (stronger warp) replaces W1 in the trial.
W1 = PKG / 'w1b-aegis-idle'


def main():
    v = json.loads((W1 / 'validation.json').read_text()); files = v.get('files', v)
    for rel, meta in files.items():
        if isinstance(meta, dict) and 'sha256' in meta:
            assert hashlib.sha256((W1 / rel).read_bytes()).hexdigest() == meta['sha256'], rel
    seed = Image.open(PKG / 'seeds/aegis-seed.png').convert('RGBA')
    assert (W1 / 'frames/000.png').read_bytes() == (PKG / 'seeds/aegis-seed.png').read_bytes()
    manifest_path = ROOT / 'src/game/visuals/unit-atlases.json'; manifest = json.loads(manifest_path.read_text())
    base = ROOT / 'public/assets/units'; entry = manifest['aegis']
    data = json.loads((base / entry['atlas']).read_text()); img = Image.open(base / entry['image']).convert('RGBA')
    names = [n for n, _ in bv.repack_mod.frames_of(data)]
    err, s, ox, oy = bv.mapping(seed, bv.frame_canvas(img, data, '0'))
    assert err < 1, err
    w = round(512 * s); start = max(int(n) for n in names) + 1
    # Frame 0 rebuilt by this mapping must match the shipped frame 0 (so the loop starts from the very same pixels).
    def cell_of(src):
        small = bv.premul_resize(src, (w, w)); cell = Image.new('RGBA', (512, 512)); cell.paste(small, (ox, oy)); return cell
    zero = np.asarray(cell_of(seed)).astype(int); shipped = np.asarray(bv.frame_canvas(img, data, '0')).astype(int)
    report = {'mapping': {'scale': round(s, 5), 'offset': [ox, oy], 'alphaError': err}, 'frame0MaxDiff': int(np.abs(zero - shipped).max())}
    tmp = Image.new('RGBA', (img.width + 512 * 7, max(img.height, 512))); tmp.paste(img, (0, 0)); added = []
    for k in range(1, 8):
        cell = cell_of(Image.open(W1 / f'frames/{k:03d}.png').convert('RGBA')); name = str(start + k - 1)
        x = img.width + 512 * (k - 1); tmp.paste(cell, (x, 0))
        data['frames'][name] = {'frame': {'x': x, 'y': 0, 'w': 512, 'h': 512}, 'rotated': False, 'trimmed': False,
                                'spriteSourceSize': {'x': 0, 'y': 0, 'w': 512, 'h': 512}, 'sourceSize': {'w': 512, 'h': 512}}
        moved = int((np.abs(np.asarray(cell).astype(int) - zero).sum(-1) > 0).sum()); added.append({'frame': int(name), 'changedPixelsVsFrame0': moved})
    tmp_path = PKG / '.tmp-aegis-idle.png'; tmp.save(tmp_path)
    try: out, webp, _ = bv.repack_mod.repack(tmp_path, data)
    finally: tmp_path.unlink()
    decoded = Image.open(io.BytesIO(webp)).convert('RGBA')
    for n in names: assert bv.repack_mod.same_render(bv.frame_canvas(decoded, out, n), bv.frame_canvas(img, data, n)), n
    stem = entry['image'].split('.')[0]; image_name = f'{stem}.{hashlib.sha256(webp).hexdigest()[:12]}.webp'; out['meta']['image'] = image_name
    raw = (json.dumps(out, separators=(',', ':'), sort_keys=True) + '\n').encode(); json_name = f'{stem}.{hashlib.sha256(raw).hexdigest()[:12]}.json'
    after = {'image': image_name, 'atlas': json_name, 'width': out['meta']['size']['w'], 'height': out['meta']['size']['h'], 'frames': len(out['frames']),
             'decodedBytes': out['meta']['size']['w'] * out['meta']['size']['h'] * 4, 'downloadBytes': len(webp) + len(raw)}
    report.update({'idleFrames': [0] + [a['frame'] for a in added], 'added': added, 'before': entry, 'after': after})
    if WRITE:
        (base / entry['image']).unlink(); (base / entry['atlas']).unlink(); (base / image_name).write_bytes(webp); (base / json_name).write_bytes(raw)
        manifest['aegis'] = {**entry, **after}; manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
        (PKG / 'integration-idle-w1b.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=1))


if __name__ == '__main__':
    main()
