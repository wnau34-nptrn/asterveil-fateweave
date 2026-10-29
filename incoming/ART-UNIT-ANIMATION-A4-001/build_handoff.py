#!/usr/bin/env python3
"""Isolate generated rows without resizing/repositioning artwork; render review sheets.

Dependencies: Pillow, NumPy, SciPy. No game assets, atlases or runtime files are written.
Connected-component ownership separates close rows (not frame normalization).
Every retained source RGBA pixel is copied exactly; one shared crop origin per strip.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import distance_transform_edt, find_objects, label

ROOT = Path(__file__).resolve().parent

# Actual observed figure counts per source row, not the requested ImageGen layout.
SOURCES = {
    'mira_r1': ('heroes', [6, 6, 6, 6, 6, 6]),
    'toma_r1': ('heroes', [6, 6, 6, 6]),
    'dew_r1': ('foes', [6, 6, 6]),
    'ember_r1': ('foes', [6, 6, 6]),
    'bat_r1': ('foes', [4, 6, 6, 6]),
    'mira_r2_final': ('heroes', [6, 6]),
    'mira_down_r1_final': ('heroes', [6]),
    'toma_underhand_r2_final': ('heroes', [6]),
    'toma_block_r1_final': ('heroes', [6]),
    'bat_hover_r2': ('foes', [4]),
}

# identity, move, revision, source, zero-based source row, routing, preferred
STRIPS = [
    ('mira', 'single-arrow', 'r1', 'mira_r1', 0, ['attack', 'hinder', 'pin', 'track', 'weakshot'], True),
    ('mira', 'volley', 'r1', 'mira_r1', 1, ['volley'], False),
    ('mira', 'disengage', 'r1', 'mira_r1', 2, ['disengage'], False),
    ('mira', 'hit', 'r1', 'mira_r1', 3, ['hit'], True),
    ('mira', 'block', 'r1', 'mira_r1', 4, ['block'], True),
    ('mira', 'down', 'r1', 'mira_down_r1_final', 0, ['down'], True),
    ('mira', 'volley', 'r2', 'mira_r2_final', 0, ['volley'], True),
    ('mira', 'disengage', 'r2', 'mira_r2_final', 1, ['disengage'], True),
    ('toma', 'overhand', 'r1', 'toma_r1', 0, ['attack', 'acid', 'bomb', 'smoke'], True),
    ('toma', 'underhand', 'r1', 'toma_r1', 1, ['haste', 'fury', 'catalyst'], False),
    ('toma', 'underhand', 'r2', 'toma_underhand_r2_final', 0, ['haste', 'fury', 'catalyst'], True),
    ('toma', 'hit', 'r1', 'toma_r1', 2, ['hit'], True),
    ('toma', 'block', 'r1', 'toma_block_r1_final', 0, ['block'], True),
    ('toma', 'down', 'r1', 'toma_r1', 3, ['down'], True),
    ('foe_dew_slime', 'jelly-bounce', 'r1', 'dew_r1', 0, ['Jelly Bounce'], True),
    ('foe_dew_slime', 'hit', 'r1', 'dew_r1', 1, ['hit'], True),
    ('foe_dew_slime', 'down', 'r1', 'dew_r1', 2, ['down'], True),
    ('foe_ember_slime', 'ember-spark', 'r1', 'ember_r1', 0, ['Ember Spark'], True),
    ('foe_ember_slime', 'hit', 'r1', 'ember_r1', 1, ['hit'], True),
    ('foe_ember_slime', 'down', 'r1', 'ember_r1', 2, ['down'], True),
    ('foe_ruin_bat', 'hover', 'r1', 'bat_r1', 0, ['hover'], False),
    ('foe_ruin_bat', 'hover', 'r2', 'bat_hover_r2', 0, ['hover'], True),
    ('foe_ruin_bat', 'swoop-bite', 'r1', 'bat_r1', 1, ['Nip'], True),
    ('foe_ruin_bat', 'hit', 'r1', 'bat_r1', 2, ['hit'], True),
    ('foe_ruin_bat', 'down', 'r1', 'bat_r1', 3, ['down'], True),
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_rows(source, group, counts):
    path = ROOT / group / 'source-sheets' / f'{source}-source.png'
    rgba = np.array(Image.open(path).convert('RGBA'))
    labels, _ = label(rgba[:, :, 3] > 80)
    figures = []
    major = np.zeros(labels.shape, np.int32)
    for k, region in enumerate(find_objects(labels), 1):
        if region is None or np.count_nonzero(labels[region] == k) <= 500:
            continue
        y, x = region
        figure = {'label': k, 'box': [x.start, y.start, x.stop, y.stop]}
        figures.append(figure)
        major[labels == k] = k
    assert len(figures) == sum(counts), (source, len(figures), counts)
    # Sorting by vertical centres is safe for these inspected, separated source rows.
    figures.sort(key=lambda f: (f['box'][1] + f['box'][3]) / 2)
    rows, offset = [], 0
    for count in counts:
        rows.append(sorted(figures[offset:offset + count], key=lambda f: f['box'][0]))
        offset += count
    # Associate antialiasing, detached small details and low-alpha pixels with
    # the nearest major figure. Other rows are zeroed, selected pixels unaltered.
    nearest = distance_transform_edt(major == 0, return_distances=False, return_indices=True)
    owners = major[tuple(nearest)]
    return path, rgba, rows, owners


def preview(entries, output, title):
    width, row_height = 390, 124
    canvas = Image.new('RGB', (width, 64 + row_height * len(entries)), '#142330')
    draw = ImageDraw.Draw(canvas)
    font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    font = ImageFont.truetype(font_path, 12) if Path(font_path).exists() else ImageFont.load_default()
    draw.text((10, 10), title, fill='#f6d895', font=font)
    draw.text((10, 31), 'RAW ART REVIEW / 390px / numbers = frame order', fill='#c6d0db', font=font)
    for i, entry in enumerate(entries):
        top = 64 + i * row_height
        draw.rectangle((0, top, 389, top + row_height - 1), fill='#192d3b' if i % 2 else '#142330')
        caption = f"{entry['identity']} / {entry['move']} / {entry['revision'].upper()}"
        draw.text((8, top + 5), caption, font=font, fill='#f6d895' if entry['preferred_candidate'] else '#a2adba')
        im = Image.open(ROOT / entry['file']).convert('RGBA')
        # One common display scale per strip. Preview only, no changes to raw PNG.
        # Crop empty exterior for readability; no per-frame fitting or alignment.
        a = np.array(im)[:, :, 3]
        yy, xx = np.where(a > 80)
        im = im.crop((int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1))
        scale = min(374 / im.width, 82 / im.height)
        shown = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
        canvas.paste(shown, ((width - shown.width) // 2, top + 28 + (82 - shown.height) // 2), shown)
        for frame in range(entry['frame_count']):
            draw.text((int(10 + (frame + .5) * 370 / entry['frame_count']), top + 108), str(frame + 1), font=font, fill='#b6c6d2')
    canvas.save(ROOT / output)


def main():
    seed_manifest = json.loads((ROOT / 'seeds.json').read_text())
    for seed in seed_manifest:
        assert sha(ROOT / seed['seed']) == seed['sha256'], seed['identity']
        # The target repository is read-only input when available. This also
        # keeps the package rebuildable on its own using the pinned seed hashes.
        shipped_path = ROOT.parents[1] / seed['source']
        if shipped_path.exists():
            shipped = Image.open(shipped_path).convert('RGBA').crop(tuple(seed['crop_xyxy']))
            assert np.array_equal(np.array(shipped), np.array(Image.open(ROOT / seed['seed'])))
    sources = {key: source_rows(key, *value) for key, value in SOURCES.items()}
    entries = []
    for identity, move, revision, source, row, routing, preferred in STRIPS:
        group = SOURCES[source][0]
        path, rgba, rows, owners = sources[source]
        figures = rows[row]
        keep = np.isin(owners, [f['label'] for f in figures])
        # Preserve source X positions. The Y crop is shared by the entire strip.
        y0 = max(0, min(f['box'][1] for f in figures) - 12)
        y1 = min(rgba.shape[0], max(f['box'][3] for f in figures) + 12)
        raw = rgba[y0:y1].copy()
        selected = keep[y0:y1]
        raw[~selected] = 0
        relative = f'{group}/raw/{identity}-{move}-{revision}.png'
        out = ROOT / relative
        out.parent.mkdir(exist_ok=True)
        Image.fromarray(raw).save(out)
        decoded = np.array(Image.open(out))
        assert np.array_equal(decoded[selected], rgba[y0:y1][selected])
        assert np.all(decoded[~selected] == 0)
        assert decoded[:, :, 3].min() == 0 and decoded[:, :, 3].max() > 200
        clipped = [i + 1 for i, f in enumerate(figures) if f['box'][0] == 0 or f['box'][1] == 0 or f['box'][2] == rgba.shape[1] or f['box'][3] == rgba.shape[0]]
        assert not clipped, (relative, 'source silhouette reaches canvas edge', clipped)
        entry = {
            'identity': identity, 'move': move, 'revision': revision,
            'file': relative, 'frame_count': len(figures), 'frame_order': 'left-to-right',
            'routes_or_intents': routing, 'preferred_candidate': preferred,
            'source': str(path.relative_to(ROOT)), 'source_row_1based': row + 1,
            'source_crop_xyxy': [0, y0, rgba.shape[1], y1],
            'frame_bounds_alpha_gt80_xyxy': [[f['box'][0], f['box'][1] - y0, f['box'][2], f['box'][3] - y0] for f in figures],
            'size': [raw.shape[1], raw.shape[0]], 'mode': 'RGBA', 'sha256': sha(out),
            'retained_pixels_identical_to_source': True, 'source_edge_clipped_frames': clipped,
        }
        entries.append(entry)
    assert len(entries) == 25 and sum(e['frame_count'] for e in entries) == 146
    (ROOT / 'strips.json').write_text(json.dumps(entries, indent=2) + '\n')
    for group in ['heroes', 'foes']:
        preview([e for e in entries if e['file'].startswith(group + '/')], group + '/preview-390.png', 'A4 / ' + group.upper())
    preview(entries, 'preview-390.png', 'ART-UNIT-ANIMATION-A4-001')
    report = {
        'package': 'ART-UNIT-ANIMATION-A4-001', 'raw_strips': len(entries),
        'raw_frames_including_alternatives': sum(e['frame_count'] for e in entries),
        'preferred_strips': sum(e['preferred_candidate'] for e in entries),
        'all_retained_rgba_pixels_match_sources': True,
        'all_raw_strips_have_transparency': True,
        'seed_hashes_verified': len(seed_manifest),
        'selected_source_silhouettes_touching_canvas_edge': 0,
        'normalization_packing_runtime': 'Not performed; assigned to Claude',
        'review_scope': 'Offline static artwork and file checks; no in-game or motion approval',
        'previews': {p: list(Image.open(ROOT / p).size) for p in ['preview-390.png', 'heroes/preview-390.png', 'foes/preview-390.png']},
        'files': {str(p.relative_to(ROOT)): {'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted(ROOT.rglob('*.png'))},
    }
    (ROOT / 'validation.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'files'}, indent=2))


if __name__ == '__main__':
    main()
