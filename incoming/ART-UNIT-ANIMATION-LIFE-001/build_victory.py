#!/usr/bin/env python3
"""Claude intake for ART-UNIT-ANIMATION-LIFE-001 R3 victory poses (owner 2026-11-27 picks: Aegis R3, Eira R3b, Seren R3).

Codex cells are 768x768 with the 512 seed pasted unscaled at (128, 256). In game each hero's frame 0 is that seed scaled
down and placed in a 512 cell (sole row 496). This script measures that seed -> frame 0 mapping per hero (checks it by
rendering the scaled seed against the shipped frame 0), maps victory frames 2..6 with the SAME mapping (one scale per
strip, premultiplied LANCZOS) into 512 cells and packs them losslessly (scripts/repack-atlas-lossless.py) as a small
separate atlas public/assets/units/<sheet>_victory.<hash>.{webp,json}, listed in src/game/visuals/victory-atlases.json.
The main unit atlases are untouched: the cheer is optional art fetched in the background, so the battle-start download
budget per hero does not grow.

  python3 -I incoming/ART-UNIT-ANIMATION-LIFE-001/build_victory.py <repo root> [--write]
Prints a JSON report (mapping, check error, new frame names, budget before/after). Writes only with --write.
"""
import hashlib, importlib.util, io, json, pathlib, sys
import numpy as np
from PIL import Image

ROOT = pathlib.Path(sys.argv[1]).resolve()
WRITE = '--write' in sys.argv
PKG = ROOT / 'incoming/ART-UNIT-ANIMATION-LIFE-001'
PICKS = {  # sheet -> (seed, chosen review cells)
    'aegis': ('seeds/aegis-seed.png', 'r3/review/cells/aegis-victory-r3'),
    'eira': ('seeds/eira-seed.png', 'r3/review/cells/eira-victory-r3b'),
    'seren': ('seeds/seren-seed.png', 'r3/review/cells/seren-victory-r3'),
    # Owner 2026-11-27 “ไลรา R4: เอาเข้าเกมแบบทดลองเลย” (trial).
    'lyra': ('seeds/lyra-seed.png', 'r4-lyra/cells/lyra-victory-r4'),
    # LIFE-002 (Codex PR #384): only Lio R1 met every gate. Paths are relative to incoming/ART-UNIT-ANIMATION-LIFE-001.
    'lio': ('../ART-UNIT-ANIMATION-LIFE-002/seeds/lio-seed.png', '../ART-UNIT-ANIMATION-LIFE-002/cells/lio-victory'),
}
SEED_AT = (128, 256)

spec = importlib.util.spec_from_file_location('repack', ROOT / 'scripts/repack-atlas-lossless.py')
repack_mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(repack_mod)


def verify_package(folder='r3'):
    """Every delivered file of a round matches its validation.json (SHA-256 and size)."""
    v = json.loads((PKG / folder / 'validation.json').read_text())
    entries = v.get('files', v) if isinstance(v, dict) else v
    items = entries.items() if isinstance(entries, dict) else [(e.get('path'), e) for e in entries]
    checked = 0
    for rel, meta in items:
        if not rel or not isinstance(meta, dict) or 'sha256' not in meta: continue
        p = PKG / folder / rel
        if not p.exists(): p = PKG / rel
        data = p.read_bytes()
        assert hashlib.sha256(data).hexdigest() == meta['sha256'], f'sha256 mismatch: {rel}'
        if 'size' in meta or 'bytes' in meta: assert len(data) == meta.get('size', meta.get('bytes')), f'size mismatch: {rel}'
        if p.suffix == '.png': Image.open(io.BytesIO(data)).load()
        checked += 1
    assert checked > 0, 'validation.json lists no files'
    return checked


def verify_package2():
    """LIFE-002 delivery: every file named by its validation.json matches (SHA-256, size)."""
    root = PKG.parent / 'ART-UNIT-ANIMATION-LIFE-002'
    v = json.loads((root / 'validation.json').read_text()); n = 0
    for rel, meta in v['files'].items():
        data = (root / rel).read_bytes()
        assert hashlib.sha256(data).hexdigest() == meta['sha256'] and len(data) == meta['size'], f'LIFE-002 mismatch: {rel}'
        n += 1
    return n


def premul_resize(img, size):
    a = np.asarray(img.convert('RGBA')).astype(np.float32) / 255
    a[..., :3] *= a[..., 3:4]
    chans = [Image.fromarray((a[..., i] * 255).round().astype(np.uint8)).resize(size, Image.LANCZOS) for i in range(4)]
    out = np.stack([np.asarray(c).astype(np.float32) / 255 for c in chans], -1)
    alpha = out[..., 3:4]
    rgb = np.where(alpha > 1e-4, out[..., :3] / np.maximum(alpha, 1e-4), 0)
    return Image.fromarray((np.concatenate([np.clip(rgb, 0, 1), alpha], -1) * 255).round().astype(np.uint8), 'RGBA')


def bbox(img, t=16):
    return img.getchannel('A').point(lambda v: 255 if v > t else 0).getbbox()


def frame_canvas(img, data, name):
    return repack_mod.source_canvas(img, dict(repack_mod.frames_of(data))[name])


def mapping(seed, frame0):
    """Scale and offset so that the seed, scaled, lands on the shipped frame 0. Fit on the alpha bbox, then refine the
    offset by a small search that minimises the alpha error."""
    sb, fb = bbox(seed), bbox(frame0)
    s = ((fb[2] - fb[0]) / (sb[2] - sb[0]) + (fb[3] - fb[1]) / (sb[3] - sb[1])) / 2
    best = None
    target = np.asarray(frame0.getchannel('A')).astype(np.float32)
    for ds in (-.004, -.002, 0, .002, .004):
        sc = s + ds; w, h = round(seed.width * sc), round(seed.height * sc)
        small = premul_resize(seed, (w, h))
        ox0, oy0 = fb[0] - sb[0] * sc, fb[3] - sb[3] * sc
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                ox, oy = round(ox0) + dx, round(oy0) + dy
                cell = Image.new('RGBA', (512, 512)); cell.paste(small, (ox, oy))
                err = float(np.abs(np.asarray(cell.getchannel('A')).astype(np.float32) - target).mean())
                if best is None or err < best[0]: best = (err, sc, ox, oy)
    return best


def main():
    report = {'checkedFiles': verify_package() + verify_package('r4-lyra') + verify_package2(), 'heroes': {}}
    manifest_path = ROOT / 'src/game/visuals/unit-atlases.json'; manifest = json.loads(manifest_path.read_text())
    victory = {}
    base = ROOT / 'public/assets/units'
    for sheet, (seed_rel, cells_rel) in PICKS.items():
        entry = manifest[sheet]
        data = json.loads((base / entry['atlas']).read_text()); img = Image.open(base / entry['image']).convert('RGBA')
        names = [n for n, _ in repack_mod.frames_of(data)]
        assert all(n.isdigit() for n in names), names
        seed = Image.open(PKG / seed_rel).convert('RGBA')
        err, s, ox, oy = mapping(seed, frame_canvas(img, data, '0'))
        assert err < 6, (sheet, 'seed does not map onto frame 0', err)
        cells = sorted((PKG / cells_rel).glob('*.png'))
        assert len(cells) == 6, (sheet, len(cells))
        first = Image.open(cells[0]).convert('RGBA'); probe = Image.new('RGBA', (768, 768)); probe.paste(seed, SEED_AT)
        assert np.array_equal(np.asarray(first), np.asarray(probe)), (sheet, 'cell 000 is not the seed at (128,256)')
        start = 1000
        added = []
        for i, path in enumerate(cells[1:]):
            big = Image.open(path).convert('RGBA'); assert big.size == (768, 768)
            w = round(768 * s)
            small = premul_resize(big, (w, w))
            px, py = ox - round(SEED_AT[0] * s), oy - round(SEED_AT[1] * s)
            cell = Image.new('RGBA', (512, 512)); cell.paste(small, (px, py))
            # Nothing of the pose may fall outside the 512 cell.
            lost = int(np.asarray(small.getchannel('A')).sum()) - int(np.asarray(cell.getchannel('A')).sum())
            assert lost == 0, (sheet, path.name, 'clipped', lost)
            name = str(start + i)
            data['frames'][name] = {'frame': {'x': 0, 'y': 0, 'w': 512, 'h': 512}, 'rotated': False, 'trimmed': False,
                                    'spriteSourceSize': {'x': 0, 'y': 0, 'w': 512, 'h': 512}, 'sourceSize': {'w': 512, 'h': 512}, '_new': cell}
            added.append({'frame': int(name), 'from': f'{cells_rel}/{path.name}', 'bbox': bbox(cell), 'sole': bbox(cell)[3]})
        new = [(n, f.pop('_new')) for n, f in data['frames'].items() if '_new' in f]
        vdata = {'frames': {}, 'meta': {'scale': '1'}}
        tmp = Image.new('RGBA', (512 * len(new), 512))
        for k, (n, cell) in enumerate(new):
            tmp.paste(cell, (512 * k, 0))
            vdata['frames'][str(k + 1)] = {'frame': {'x': 512 * k, 'y': 0, 'w': 512, 'h': 512}, 'rotated': False, 'trimmed': False,
                                           'spriteSourceSize': {'x': 0, 'y': 0, 'w': 512, 'h': 512}, 'sourceSize': {'w': 512, 'h': 512}}
        tmp_path = PKG / f'.tmp-{sheet}.png'; tmp.save(tmp_path)
        try:
            out, webp, _ = repack_mod.repack(tmp_path, vdata)
        finally:
            tmp_path.unlink()
        stem = f'{sheet}_victory'
        image_name = f'{stem}.{hashlib.sha256(webp).hexdigest()[:12]}.webp'
        out['meta']['image'] = image_name
        raw = (json.dumps(out, separators=(',', ':'), sort_keys=True) + '\n').encode()
        json_name = f'{stem}.{hashlib.sha256(raw).hexdigest()[:12]}.json'
        after = {'image': image_name, 'atlas': json_name, 'width': out['meta']['size']['w'], 'height': out['meta']['size']['h'],
                 'frames': len(out['frames']), 'decodedBytes': out['meta']['size']['w'] * out['meta']['size']['h'] * 4, 'downloadBytes': len(webp) + len(raw)}
        for k, a in enumerate(added): a['frame'] = k + 1
        report['heroes'][sheet] = {'mapping': {'scale': round(s, 5), 'offset': [ox, oy], 'alphaError': round(err, 3)}, 'added': added, 'atlas': after}
        if WRITE:
            for old in base.glob(f'{stem}.*'): old.unlink()
            (base / image_name).write_bytes(webp); (base / json_name).write_bytes(raw)
            victory[sheet] = after
    if WRITE: (ROOT / 'src/game/visuals/victory-atlases.json').write_text(json.dumps(victory, indent=2) + '\n'); (PKG / 'integration-victory.json').write_text(json.dumps(report, indent=2, default=list) + '\n')
    print(json.dumps(report, indent=1, default=list))


if __name__ == '__main__':
    main()
