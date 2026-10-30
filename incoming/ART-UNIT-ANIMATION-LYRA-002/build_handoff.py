#!/usr/bin/env python3
"""Rebuild supplied Lyra whole-strip art, cells, anatomy reports and manifest.

Requires Pillow, NumPy, SciPy and opencv-python-headless. Image generation is
nondeterministic; supplied untouched source sheets are immutable build inputs.
Run from repository root: python3 incoming/ART-UNIT-ANIMATION-LYRA-002/build_handoff.py
Use --verify to verify hashes and decode PNGs without rebuilding.
"""
from pathlib import Path
import argparse
import hashlib
import json
import statistics
import subprocess
import sys
import textwrap

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, find_objects, label

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
FRAME = (1024, 640)
SEED_XY = (256, 64)
GROUND_EXCLUSIVE = 576  # seed has actual visible soles at y511, plus y64 offset
MAPS = {
    'mark': [0, 1, 2, 4, 4, 5, 1, 7],
    'parry-stance': [0, 1, 2, 4, 4, 5, 6, 7],
}
ORDERS = {
    'mark': ['idle (exact seed)', 'raise sword', 'rotate wrist / point forward',
             'quiet chest-height point (contact)', 'hold point', 'ease sword back',
             'reverse raised transition toward idle', 'idle (exact seed)'],
    'parry-stance': ['idle (exact seed)', 'rear-foot step / weight back', 'raise diagonal guard',
                     'full bent-knee guard (contact)', 'hold same guard', 'ease guard',
                     'relax toward ready', 'idle (exact seed)'],
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def extract(source):
    rgba = np.array(Image.open(source).convert('RGBA'))
    labels, _ = label(rgba[:, :, 3] > 40)
    parts = [(k, region) for k, region in enumerate(find_objects(labels), 1)
             if region is not None and np.count_nonzero(labels[region] == k) > 1000]
    assert len(parts) == 8, (source, len(parts))
    parts.sort(key=lambda part: part[1][1].start)
    owner = np.zeros(labels.shape, np.int16)
    for index, (k, _) in enumerate(parts, 1):
        owner[labels == k] = index
    distance, nearest = distance_transform_edt(owner == 0, return_indices=True)
    nearest_owner = owner[tuple(nearest)]
    frames = []
    for index, (_, region) in enumerate(parts, 1):
        mask = (nearest_owner == index) & (distance <= 8)
        isolated = np.zeros_like(rgba)
        isolated[mask] = rgba[mask]
        frames.append((Image.fromarray(isolated), region))
    return frames


def build_move(move, seed):
    source = ROOT / 'source-sheets' / f'lyra-{move}-source.png'
    figures = extract(source)
    # Both source sheets first use the conventional seed ready pose. Convert
    # their raster resolution to ONE logical seed-body height, 495px. No local
    # head resize, torso warp or per-pose scaling. Display scale is 1 for both.
    first = figures[0][1][0]
    factor = 495 / (first.stop - first.start)
    cells, placements = [], []
    for output_index, source_index in enumerate(MAPS[move]):
        cell = Image.new('RGBA', FRAME)
        figure, region = figures[source_index]
        if output_index in (0, 7):
            cell.paste(seed, SEED_XY)
            placement = {'exact_seed': True, 'paste_xy': list(SEED_XY)}
        else:
            box = figure.getbbox()
            figure = figure.crop(box)
            figure = figure.resize(tuple(round(v * factor) for v in figure.size), Image.Resampling.LANCZOS)
            xy = (FRAME[0] // 2 - figure.width // 2, GROUND_EXCLUSIVE - figure.height)
            assert xy[0] >= 24 and xy[1] >= 24
            assert xy[0] + figure.width < FRAME[0] - 24
            assert xy[1] + figure.height < FRAME[1] - 24
            cell.paste(figure, xy)
            placement = {'exact_seed': False, 'source_crop': list(box), 'paste_xy': list(xy),
                         'resized_size': list(figure.size)}
        cell.save(ROOT / 'cells' / move / f'{output_index:03}.png', compress_level=9)
        bbox = cell.getbbox()
        placements.append({'frame': output_index + 1, 'source_frame': source_index + 1,
                           'alpha_bounds': list(bbox), **placement})
        cells.append(cell)
    strip = Image.new('RGBA', (FRAME[0] * 8, FRAME[1]))
    for index, cell in enumerate(cells):
        strip.paste(cell, (index * FRAME[0], 0))
    file = f'raw/lyra-{move}-r1.png'
    strip.save(ROOT / file, compress_level=9)
    gutters = [FRAME[0] - placements[i]['alpha_bounds'][2] + placements[i + 1]['alpha_bounds'][0]
               for i in range(7)]
    assert min(gutters) >= 48
    # This invokes the repository tool unchanged, with all eight delivered cells.
    output = ROOT / 'audit' / f'{move}.json'
    result = subprocess.run([sys.executable, str(REPO / 'scripts/unit-anatomy-audit.py'),
                             '--cells', str(ROOT / 'cells' / move), '--json', str(output)],
                            text=True, capture_output=True)
    print(result.stdout, end='')
    assert result.returncode == 0, result.stdout + result.stderr
    report = json.loads(output.read_text())
    rows = report['report'][move]
    assert len(rows) == 8 and all(r['status'] in ('idle', 'ok') for r in rows), rows
    scales = [r['scale'] for r in rows]
    median = statistics.median(r['scale'] for r in rows if r['status'] != 'idle')
    assert median <= 1.15 and max(scales) <= 1.20
    return {
        'identity': 'tracer', 'move': move, 'revision': 'r1', 'file': file,
        'sha256': sha(ROOT / file), 'frames': 8, 'frame_size': list(FRAME),
        'frame_order': ORDERS[move], 'contact_frame_one_based': 4,
        'hold_frames_one_based': [4, 5], 'source_frame_order_one_based': [i + 1 for i in MAPS[move]],
        'facing': 'right', 'loop': False, 'damage': False,
        'suggested_action': 'mark' if move == 'mark' else 'parry',
        'source': str(source.relative_to(ROOT)), 'source_sha256': sha(source),
        'source_raster_to_logical_scale': factor, 'shared_logical_display_scale': 1.0,
        'seed_offset_xy': list(SEED_XY), 'sole_y_in_original_seed': 511,
        'sole_y_in_delivery': 575, 'clear_gutters_px': gutters, 'placements': placements,
        'anatomy': {'report': f'audit/{move}.json', 'median_generated_head_scale': median,
                    'maximum_head_scale_including_idle': max(scales), 'measured_cells': 8,
                    'not_measured': [], 'tool_tolerance': report['tolerance']},
    }, cells


def preview(seed, entries, all_cells):
    board = Image.new('RGB', (390, 2460), '#101526')
    draw = ImageDraw.Draw(board)
    draw.text((10, 10), 'LYRA-002 | exact seed comparison | 390px', fill='#f4d798')
    draw.text((10, 28), 'Art only; owner selection / motion pending', fill='#d4deed')
    # Each pair uses the same coordinate crop and scale. The sole line and head
    # size can be compared without enlarging the idle to fit generated anatomy.
    y = 54
    idle = Image.new('RGBA', FRAME); idle.paste(seed, SEED_XY)
    for entry, cells in zip(entries, all_cells):
        draw.rectangle((5, y, 384, y + 30), fill='#283249')
        draw.text((12, y + 10), entry['move'] + ' | seed (left), frame (right)', fill='#f4d798')
        y += 36
        for index, cell in enumerate(cells):
            for col, frame in enumerate((idle, cell)):
                tile = frame.resize((195, 122), Image.Resampling.LANCZOS)
                board.paste(tile, (col * 195, y), tile)
            draw.text((8, y + 123), 'seed', fill='#aebcd0')
            caption = f'{index + 1}: ' + entry['frame_order'][index].split(' (')[0]
            for line, text in enumerate(textwrap.wrap(caption, width=29)):
                draw.text((203, y + 123 + line * 11), text, fill='#d4deed')
            y += 145
    # Crop to actual content; fixed 390px width with full comparison for 16 cells.
    if y > board.height:
        # Allocate sufficient canvas up front on the next line below; retained
        # as an assertion to prevent silently clipped review rows.
        raise AssertionError(('preview height', y, board.height))
    board.crop((0, 0, 390, y + 8)).save(ROOT / 'preview-390.png', compress_level=9)


def verify():
    manifest = json.loads((ROOT / 'validation.json').read_text())
    paths = {str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_file()
             and p.name != 'validation.json' and '__pycache__' not in p.parts}
    assert paths == set(manifest['files']), ('manifest coverage', paths ^ set(manifest['files']))
    pngs = 0
    for file, entry in manifest['files'].items():
        p = ROOT / file
        assert p.stat().st_size == entry['bytes'] and sha(p) == entry['sha256'], file
        if p.suffix == '.png':
            with Image.open(p) as im:
                im.verify()
            with Image.open(p) as im:
                im.load()
            pngs += 1
    seed = Image.open(ROOT / 'seeds/lyra-seed.png')
    entries = json.loads((ROOT / 'strips.json').read_text())
    for entry in entries:
        strip = Image.open(ROOT / entry['file'])
        for index in range(8):
            cell = Image.open(ROOT / 'cells' / entry['move'] / f'{index:03}.png')
            assert strip.crop((index * FRAME[0], 0, (index + 1) * FRAME[0], FRAME[1])).tobytes() == cell.tobytes()
            if index in (0, 7):
                x, y = SEED_XY
                assert cell.crop((x, y, x + 512, y + 512)).tobytes() == seed.tobytes()
        rows = json.loads((ROOT / entry['anatomy']['report']).read_text())['report'][entry['move']]
        assert all(r['status'] in ('idle', 'ok') and r['scale'] <= 1.20 for r in rows)
    print(f'PASS: {len(paths)} file SHA-256/size checks; {pngs} PNG verify+decode; 16 audited frames; 4 exact idle endpoints')


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--verify', action='store_true')
    if parser.parse_args().verify:
        verify(); return
    seed = Image.open(ROOT / 'seeds/lyra-seed.png').convert('RGBA')
    entries, all_cells = [], []
    for move in MAPS:
        entry, cells = build_move(move, seed)
        entries.append(entry); all_cells.append(cells)
    write_json(ROOT / 'strips.json', entries)
    preview(seed, entries, all_cells)
    files = {str(p.relative_to(ROOT)): {'sha256': sha(p), 'bytes': p.stat().st_size}
             for p in sorted(ROOT.rglob('*')) if p.is_file() and p.name != 'validation.json'
             and '__pycache__' not in p.parts}
    write_json(ROOT / 'validation.json', {
        'package': 'ART-UNIT-ANIMATION-LYRA-002', 'strips': 2, 'frames': 16,
        'minimum_clear_gutter_px': min(min(e['clear_gutters_px']) for e in entries),
        'anatomy_tool': 'scripts/unit-anatomy-audit.py --cells (unchanged)',
        'anatomy': {e['move']: e['anatomy'] for e in entries},
        'owner_artwork_approval': 'pending', 'owner_motion_approval': 'pending',
        'manifest_self_hash': 'Excluded to avoid recursion; compare the fetched manifest with its committed local bytes.',
        'files': files,
    })
    verify()


if __name__ == '__main__':
    main()
