#!/usr/bin/env python3
"""Rebuild A10 delivery from immutable whole-strip outputs (Pillow, NumPy, SciPy).

Run: python3 -I incoming/ART-UNIT-ANIMATION-A10-001/build_handoff.py
Verify only: append --verify. Source generation is not deterministic; all source PNGs
are supplied. Offline extraction, shared-scale placement, previews and manifests are.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, find_objects, label

ROOT = Path(__file__).resolve().parent
SLOT = (1024, 704)
SEED_OFFSET = (256, 64)
MOVES = {
    'raider': [('raking-slash', 'Raking Slash'), ('shadow-knife', 'Shadow Knife'),
               ('hit', 'hit'), ('block', 'block'), ('down', 'down')],
    'brute': [('crushing-blow', 'Crushing Blow'), ('rift-bolt', 'Rift Bolt'),
              ('hit', 'hit'), ('block', 'block'), ('down', 'down')],
}
ORDERS = {
    6: ['ready', 'wind-up', 'deeper wind-up / anticipation', 'contact / release',
        'follow-through', 'recover to ready'],
    'hit': ['ready', 'recoil', 'deep recoil', 'recover to ready'],
    'block': ['ready', 'raise guard', 'brace / parry', 'recover to ready'],
    'down': ['ready', 'buckle', 'collapse', 'grounded hold (do not loop)'],
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def visible_box(image, threshold=40):
    return image.getchannel('A').point(lambda a: 255 if a > threshold else 0).getbbox()


def source_figures(path, count):
    """Separate complete connected silhouettes, retaining antialiased edges.

    Ownership uses nearest major component, not rectangular slicing (blade/wing
    bounds sometimes overlap). No paint, pose warping or per-frame scaling.
    """
    rgba = np.array(Image.open(path).convert('RGBA'))
    labels, _ = label(rgba[:, :, 3] > 40)
    major = []
    for k, region in enumerate(find_objects(labels), 1):
        if region is not None and np.count_nonzero(labels[region] == k) > 1000:
            major.append((k, region))
    assert len(major) == count, (path.name, len(major), count)
    major.sort(key=lambda item: item[1][1].start)
    owner = np.zeros(labels.shape, np.int16)
    for index, (k, _) in enumerate(major, 1):
        owner[labels == k] = index
    distance, nearest = distance_transform_edt(owner == 0, return_indices=True)
    ownership = owner[tuple(nearest)]
    figures, boxes = [], []
    for index, (_, region) in enumerate(major, 1):
        mask = (ownership == index) & (distance <= 12) & (rgba[:, :, 3] > 0)
        isolated = np.zeros_like(rgba)
        isolated[mask] = rgba[mask]
        image = Image.fromarray(isolated)
        box = visible_box(image)
        # Source first/last ready figures are replaced by exact seed; only used
        # motion frames must be complete within the generator canvas.
        if index != 1 and not (index == count and count != 4):
            assert box[0] > 0 and box[2] < image.width, (path.name, index, box)
        figures.append(image)
        boxes.append(box)
    return figures, boxes


def build_strip(unit, move, intent):
    count = 6 if move not in ('hit', 'block', 'down') else 4
    source = ROOT / 'source-sheets' / f'{unit}-{move}-source.png'
    figures, boxes = source_figures(source, count)
    seed = Image.open(ROOT / 'seeds' / f'{unit}-seed.png').convert('RGBA')
    # Exclude tiny inherited atlas fragment from body-height calibration only.
    seed_labels, _ = label(np.array(seed)[:, :, 3] > 40)
    areas = np.bincount(seed_labels.ravel()); areas[0] = 0
    body_y, body_x = find_objects(seed_labels)[int(areas.argmax()) - 1]
    target_height = body_y.stop - body_y.start
    first = boxes[0]
    scale = target_height / (first[3] - first[1])
    ground_y = 64 + (493 if unit == 'raider' else 496)
    frames, info = [], []
    for index, (figure, box) in enumerate(zip(figures, boxes)):
        frame = Image.new('RGBA', SLOT)
        locked = index == 0 or (index == count - 1 and move != 'down')
        if locked:
            frame.paste(seed, SEED_OFFSET)
            placement = {'seed_offset': list(SEED_OFFSET), 'pixel_exact_seed': True}
        else:
            # Expand by 12 for soft alpha edges; use same scale for every frame.
            crop_box = (max(0, box[0] - 12), max(0, box[1] - 12),
                        min(figure.width, box[2] + 12), min(figure.height, box[3] + 12))
            crop = figure.crop(crop_box)
            size = tuple(round(v * scale) for v in crop.size)
            crop = crop.resize(size, Image.Resampling.LANCZOS)
            new_box = visible_box(crop)
            x = SLOT[0] // 2 - (new_box[0] + new_box[2]) // 2
            y = ground_y + 1 - new_box[3]
            assert x >= 24 and y >= 24 and x + crop.width <= SLOT[0] - 24
            assert y + crop.height <= SLOT[1] - 24, (unit, move, index, size, y)
            frame.paste(crop, (x, y))
            placement = {'source_crop': list(crop_box), 'resized': list(size),
                         'paste_xy': [x, y], 'pixel_exact_seed': False}
        box_out = visible_box(frame, 0)
        assert box_out[0] >= 24 and box_out[2] <= SLOT[0] - 24
        assert box_out[1] >= 24 and box_out[3] <= SLOT[1] - 24
        info.append({'frame': index + 1, 'source_visible_box': list(box),
                     'output_alpha_box': list(box_out), **placement})
        frames.append(frame)
    strip = Image.new('RGBA', (SLOT[0] * count, SLOT[1]))
    for index, frame in enumerate(frames):
        strip.paste(frame, (index * SLOT[0], 0))
    gaps = [SLOT[0] - info[i]['output_alpha_box'][2] + info[i + 1]['output_alpha_box'][0]
            for i in range(count - 1)]
    assert min(gaps) >= 48
    filename = f'raw/{unit}-{move}-r1.png'
    strip.save(ROOT / filename, compress_level=9)
    return {
        'identity': unit, 'file': filename, 'move': move, 'revision': 'r1',
        'frame_count': count, 'frame_size': list(SLOT),
        'frame_order': ORDERS[count if count == 6 else move],
        'sha256': sha(ROOT / filename), 'suggested_intents': [intent],
        'facing': 'left', 'source': str(source.relative_to(ROOT)),
        'source_sha256': sha(source), 'source_to_delivery_shared_scale': scale,
        'logical_seed_offset': list(SEED_OFFSET), 'sole_y_in_frame': ground_y,
        'clear_gutters_px': gaps, 'preferred': True,
        'loop': False, 'end_behavior': 'hold final grounded frame' if move == 'down' else 'ready',
        'frames': info,
    }, frames


def preview(entries, all_frames):
    # Each action occupies a 390px storyboard with two columns; whole raw strips
    # remain horizontal. Display all frames at one shared review scale.
    height = 70 + sum(42 + math.ceil(len(frames) / 2) * 150 for frames in all_frames)
    board = Image.new('RGB', (390, height), '#101526')
    draw = ImageDraw.Draw(board)
    draw.text((12, 10), 'A10 | Raider + Brute | one R1 per move', fill='#f5d99e')
    draw.text((12, 29), 'LEFT facing | body artwork review | 390 px', fill='white')
    draw.text((12, 47), 'Not in-game playback or motion approval', fill='#b4c0d4')
    y = 70
    for entry, frames in zip(entries, all_frames):
        draw.rectangle((7, y, 382, y + 32), fill='#263047')
        draw.text((13, y + 10), entry['identity'] + ' / ' + entry['move'] + ' / r1', fill='#f5d99e')
        y += 42
        for index, frame in enumerate(frames):
            x = (index % 2) * 195
            row_y = y + (index // 2) * 150
            # Crop transparent slot margins with SAME crop and SAME scale for all
            # frames, retaining consistent body size even in collapse poses.
            tile = frame.resize((195, 134), Image.Resampling.LANCZOS)
            board.paste(tile, (x, row_y), tile)
            draw.text((x + 8, row_y + 134), str(index + 1) + ' ' + entry['frame_order'][index].split(' / ')[0], fill='#d2dae8')
        y += math.ceil(len(frames) / 2) * 150
    board.save(ROOT / 'preview-390.png', compress_level=9)


def verify():
    data = json.loads((ROOT / 'validation.json').read_text())
    paths = {str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_file()
             and p.name != 'validation.json' and '__pycache__' not in p.parts}
    assert paths == set(data['files']), ('manifest coverage', paths ^ set(data['files']))
    pngs = 0
    for name, expected in data['files'].items():
        p = ROOT / name
        assert sha(p) == expected['sha256'] and p.stat().st_size == expected['bytes'], name
        if p.suffix.lower() == '.png':
            with Image.open(p) as im:
                im.verify()
            with Image.open(p) as im:
                im.load()
            pngs += 1
    for entry in json.loads((ROOT / 'strips.json').read_text()):
        assert sha(ROOT / entry['file']) == entry['sha256']
        im = Image.open(ROOT / entry['file'])
        seed = Image.open(ROOT / 'seeds' / (entry['identity'] + '-seed.png'))
        x, y = SEED_OFFSET
        assert im.crop((x, y, x + 512, y + 512)).tobytes() == seed.tobytes()
    print(f'PASS: {len(paths)} file SHA-256/size checks; {pngs} PNG verify+load; 10 exact idle lockbacks')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    if args.verify:
        verify()
        return
    entries, all_frames = [], []
    for unit, moves in MOVES.items():
        for move, intent in moves:
            entry, frames = build_strip(unit, move, intent)
            entries.append(entry); all_frames.append(frames)
    write_json(ROOT / 'strips.json', entries)
    preview(entries, all_frames)
    files = {}
    for path in sorted(ROOT.rglob('*')):
        if path.is_file() and path.name != 'validation.json' and '__pycache__' not in path.parts:
            files[str(path.relative_to(ROOT))] = {'bytes': path.stat().st_size, 'sha256': sha(path)}
    write_json(ROOT / 'validation.json', {
        'package': 'ART-UNIT-ANIMATION-A10-001', 'strips': 10, 'frames': 48,
        'one_final_version_per_move': True, 'minimum_clear_gutter_px': min(min(e['clear_gutters_px']) for e in entries),
        'exact_idle_lockbacks': 10, 'all_raw_rgba': True,
        'validation_self_hash': 'Excluded to avoid recursive self-hash; validate this manifest using the fetched Git blob.',
        'review_scope': 'Offline artwork and static 390px storyboard only; no game integration or owner motion approval.',
        'files': files,
    })
    verify()


if __name__ == '__main__':
    main()
