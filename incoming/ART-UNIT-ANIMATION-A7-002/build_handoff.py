"""Rebuild padded strips, audit cells and 390px reviews. No runtime/atlas writes.

Requires Pillow, numpy, scipy, opencv-python-headless. Raw generator PNGs and
exact seed crops are immutable inputs. One area-derived scale per whole strip,
following A7-001's integration convention (factor .42), never per-frame fitting.
"""
from pathlib import Path
import hashlib, json, subprocess, sys, statistics
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, find_objects, distance_transform_edt, binary_dilation

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
FACTOR = .42

def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    entries = []
    seeds = []
    for who in ('lalin', 'wila'):
        source = REPO / f'incoming/ART-UNIT-ANIMATION-A7-001/dancers/{who}'
        path = HERE / f'seeds/{who}.png'
        expected = json.loads((source / 'seeds.json').read_text())[0]
        assert sha(path) == expected['sha256']
        seeds.append({**expected, 'file': str(path.relative_to(HERE)), 'copied_from': str((source / 'seeds' / path.name).relative_to(REPO))})
    dump(HERE / 'seeds.json', seeds)
    for job in json.loads((HERE / 'prompts.json').read_text()):
        who, move = job['identity'], job['move']
        key = f'{who}-{move}'
        n = 6 if move in ('dance-strike', 'circle-spin', 'echo-closing-step') else 4
        rawpath = HERE / f'raw/{key}.png'
        a = np.array(Image.open(rawpath).convert('RGBA'))
        alpha = a[:, :, 3]
        labels, _ = label(alpha > 80)
        counts = np.bincount(labels.ravel())
        major = sorted([(b[1].start, i, b) for i, b in enumerate(find_objects(labels), 1) if counts[i] > 5000])
        assert len(major) == n, (key, len(major), n)
        marker = np.zeros(alpha.shape, dtype='int16')
        for j, (_, i, _) in enumerate(major, 1):
            marker[labels == i] = j
        idx = distance_transform_edt(marker == 0, return_distances=False, return_indices=True)
        owner = marker[tuple(idx)]
        seed = Image.open(HERE / f'seeds/{who}.png').convert('RGBA')
        scale = FACTOR * float(np.sqrt((np.array(seed)[:, :, 3] > 80).sum() / counts[major[0][1]]))
        bottom = major[0][2][0].stop
        folder = HERE / f'cells/{key}'
        folder.mkdir(parents=True, exist_ok=True)
        for stale in folder.glob('*.png'):
            stale.unlink()
        idle = Image.new('RGBA', (640, 512))
        idle.paste(seed.resize((215, 215), Image.Resampling.LANCZOS), (212, 288))
        idle.save(folder / '000.png')
        transforms = []
        strip = Image.new('RGBA', (640 * n, 512))
        for j, (_, i, _) in enumerate(major, 1):
            mask = owner == j
            near = binary_dilation(mask & (alpha > 80), iterations=3)
            pixels = a.copy()
            pixels[~(mask & near)] = 0
            ys, xs = np.where(pixels[:, :, 3] > 80)
            box = (max(0, int(xs.min()) - 3), max(0, int(ys.min()) - 3), min(a.shape[1], int(xs.max()) + 4), min(a.shape[0], int(ys.max()) + 4))
            assert xs.min() > 0 and xs.max() < a.shape[1] - 1
            assert ys.min() > 0 and ys.max() < a.shape[0] - 1
            tile = Image.fromarray(pixels).crop(box)
            tile = tile.resize((round(tile.width * scale), round(tile.height * scale)), Image.Resampling.LANCZOS)
            pos = (round(320 - tile.width / 2), round(497 + (box[1] - bottom) * scale))
            assert pos[0] >= 0 and pos[1] >= 0 and pos[0] + tile.width <= 640 and pos[1] + tile.height <= 512, (key, j, pos, tile.size)
            canvas = Image.new('RGBA', (640, 512))
            canvas.alpha_composite(tile, pos)
            canvas.save(folder / f'{j:03}.png')
            strip.paste(canvas, ((j - 1) * 640, 0))
            transforms.append({'frame_1based': j, 'source_box': box, 'position': pos, 'tile_size': tile.size})
        (HERE / 'spaced').mkdir(exist_ok=True)
        strip.save(HERE / f'spaced/{key}.png')
        auditpath = HERE / f'audits/{key}.json'
        auditpath.parent.mkdir(exist_ok=True)
        run = subprocess.run([sys.executable, str(REPO / 'scripts/unit-anatomy-audit.py'), '--cells', str(folder), '--json', str(auditpath)], capture_output=True, text=True)
        (HERE / f'audits/{key}.txt').write_text(run.stdout + run.stderr)
        assert auditpath.exists() and run.returncode in (0, 1), run.stderr
        rows = json.loads(auditpath.read_text())['report'][key]
        measured = [r['scale'] for r in rows if r['status'] in ('ok', 'drift')]
        median = statistics.median(measured)
        assert measured and median <= 1.15 and max(measured) <= 1.20, (key, measured)
        original = next(s for s in json.loads((REPO / f'incoming/ART-UNIT-ANIMATION-A7-001/dancers/{who}/strips.json').read_text()) if s['move'] == move and s['revision'] == 'r1')
        entries.append({'identity': who, 'move': move, 'frame_count': n, 'frame_order': 'left-to-right', 'frame_descriptions': original['frame_descriptions'], 'routes_or_intents': original['routes_or_intents'], 'raw_file': f'raw/{key}.png', 'file': f'spaced/{key}.png', 'cell_size': [640, 512], 'scale': scale, 'seed_audit_factor': FACTOR, 'shared_y_reference': 497, 'transforms': transforms, 'median': median, 'maximum_measured': max(measured), 'not_measured': [r['frame'] for r in rows if r['status'] == 'not-measured'], 'numeric_gate': 'pass', 'owner_artwork_selection': 'pending', 'owner_motion_approval': 'pending'})
    dump(HERE / 'strips.json', entries)
    for who in ('lalin', 'wila'):
        selected = [e for e in entries if e['identity'] == who]
        height = sum(40 + ((e['frame_count'] + 3) // 3) * 135 for e in selected) + 35
        preview = Image.new('RGB', (390, height), '#14243a')
        draw = ImageDraw.Draw(preview)
        draw.text((10, 10), f'{who.upper()} A7-002 / seed + generated / NOT APPROVED', fill='white')
        y = 35
        for entry in selected:
            key = f"{who}-{entry['move']}"
            draw.text((8, y), f"{entry['move']} median={entry['median']:.3f} max={entry['maximum_measured']:.3f}", fill='#f4dca4')
            y += 30
            for j, file in enumerate(sorted((HERE / f'cells/{key}').glob('*.png'))):
                cell = Image.open(file).convert('RGBA')
                # Fixed review crop/scale for every cell, including seed; no per-pose fit.
                tile = cell.crop((125, 195, 515, 512)).resize((130, 106), Image.Resampling.LANCZOS)
                x, row = j % 3 * 130, j // 3 * 135
                preview.paste(tile, (x, y + row), tile)
                draw.text((x + 4, y + row + 108), 'SEED' if j == 0 else f'{j:02}', fill='white')
            y += ((entry['frame_count'] + 3) // 3) * 135 + 10
        preview.save(HERE / f'{who}-preview-390.png')
    files = []
    for path in sorted(HERE.rglob('*')):
        if not path.is_file() or path.name == 'validation.json' or '__pycache__' in path.parts:
            continue
        item = {'file': str(path.relative_to(HERE)), 'bytes': path.stat().st_size, 'sha256': sha(path)}
        if path.suffix == '.png':
            with Image.open(path) as im:
                im.load()
                item.update(size=list(im.size), mode=im.mode, decoded=True)
        files.append(item)
    dump(HERE / 'validation.json', {'task': 'ART-UNIT-ANIMATION-A7-002', 'base_commit': 'd83cd71da71971a1ce3fed74a4b3d069636bbcd3', 'gate': {'median_lte': 1.15, 'max_measured_lte': 1.20, 'not_measured_is_pass': False}, 'strips': entries, 'files': files})
    print('8 strips passed brief numeric gate; unmeasured frames require visual review.')

if __name__ == '__main__':
    main()
