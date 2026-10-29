"""Rebuild A7 raw strips and review sheets without repainting source pixels.

Requires Pillow, NumPy and SciPy. Run from any working directory.
The generated source sheets and exact shipped seed crops are immutable inputs.
"""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
BASE = '8616ad3155a179e05210fe6aa552e6d234c9bd24'
ATLAS = 'public/assets/art/units_mercs.webp'
PEOPLE = [('metta', 'saints', 6), ('thiran', 'saints', 7),
          ('lalin', 'dancers', 8), ('wila', 'dancers', 9)]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def isolate(source, columns, rows):
    """Keep each figure's original pixels and coordinates; split only by row.

    Nearest-major-component ownership includes small detached fabric/bead details
    and low-alpha antialias pixels. No per-frame transforms or mask smoothing.
    """
    image = Image.open(source).convert('RGBA')
    rgba = np.array(image)
    alpha = rgba[:, :, 3]
    labels, _ = ndimage.label(alpha > 80)
    counts = np.bincount(labels.ravel())
    objects = ndimage.find_objects(labels)
    major = []
    for index, slices in enumerate(objects, 1):
        if slices is not None and counts[index] > 600:
            ys, xs = slices
            major.append({'label': index, 'box': [xs.start, ys.start, xs.stop, ys.stop],
                          'cx': (xs.start + xs.stop) / 2,
                          'cy': (ys.start + ys.stop) / 2})
    assert len(major) == columns * rows, (source, len(major), columns * rows)
    major.sort(key=lambda item: item['cy'])
    ordered = []
    for row in range(rows):
        ordered += sorted(major[row * columns:(row + 1) * columns], key=lambda item: item['cx'])
    marker = np.zeros(alpha.shape, dtype=np.int16)
    for index, item in enumerate(ordered, 1):
        marker[labels == item['label']] = index
    nearest = ndimage.distance_transform_edt(marker == 0, return_distances=False, return_indices=True)
    owner = marker[tuple(nearest)]
    output = []
    for row in range(rows):
        figures = ordered[row * columns:(row + 1) * columns]
        first = row * columns + 1
        keep = (owner >= first) & (owner < first + columns) & (alpha > 0)
        visible = keep & (alpha > 80)
        ys, _ = np.where(visible)
        top = max(0, int(ys.min()) - 10)
        bottom = min(image.height, int(ys.max()) + 11)
        pixels = np.zeros_like(rgba)
        pixels[keep] = rgba[keep]
        assert np.array_equal(pixels[keep], rgba[keep])
        strip = Image.fromarray(pixels[top:bottom])
        frame_images = []
        spaced = Image.new('RGBA', (640 * columns, 512))
        translations = []
        boxes = []
        clipped = []
        for j, item in enumerate(figures):
            own = (owner == first + j) & (alpha > 0)
            vy, vx = np.where(own & (alpha > 80))
            bounds = [int(vx.min()), int(vy.min()) - top, int(vx.max()) + 1, int(vy.max()) + 1 - top]
            boxes.append(bounds)
            if vx.min() == 0 or vx.max() == image.width - 1 or vy.min() == 0 or vy.max() == image.height - 1:
                clipped.append(j + 1)
            alone = np.zeros_like(rgba)
            alone[own] = rgba[own]
            # Lossless layout-only alternative with genuinely wide gutters.
            # The shared Y offset retains jumping/crouching/down heights.
            cell_width = image.width // columns
            tx = j * (640 - cell_width) + (640 - cell_width) // 2
            ty = 507 - (bottom - top)
            ys_own, xs_own = np.where(own[top:bottom])
            dx, dy = xs_own + tx, ys_own + ty
            assert dx.min() >= j * 640 and dx.max() < (j + 1) * 640
            assert dy.min() >= 0 and dy.max() < 512
            frame_rgba = alone[top:bottom]
            paste = np.array(spaced)
            paste[dy, dx] = frame_rgba[ys_own, xs_own]
            assert np.array_equal(paste[dy, dx], frame_rgba[ys_own, xs_own])
            spaced = Image.fromarray(paste)
            translations.append([tx, ty])
            # Review-only crop; source/raw artwork is never scaled or moved.
            x0, y0, x1, y1 = bounds
            frame_images.append(Image.fromarray(alone[top:bottom]).crop((max(0, x0 - 3), max(0, y0 - 3),
                                                                        min(image.width, x1 + 3), min(bottom - top, y1 + 3))))
        output.append({'image': strip, 'frames': frame_images, 'bounds': boxes,
                       'crop': [0, top, image.width, bottom], 'clipped': clipped,
                       'spaced': spaced, 'translations': translations})
    return output


def preview(folder, identity, entries, frame_images):
    # Three ~100px-tall characters per line inside a 390px portrait review sheet.
    canvas = Image.new('RGB', (390, 70 + len(entries) * 270), '#111f36')
    draw = ImageDraw.Draw(canvas)
    font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    font = ImageFont.truetype(font_path, 12) if Path(font_path).exists() else ImageFont.load_default()
    small = ImageFont.truetype(font_path, 10) if Path(font_path).exists() else ImageFont.load_default()
    draw.text((12, 10), f'{identity.upper()} / A7 / ART REVIEW', font=font, fill='#f4dca4')
    draw.text((12, 30), '100px standing scale; no runtime motion approval', font=small, fill='#c5d4e9')
    for i, (entry, frames) in enumerate(zip(entries, frame_images)):
        y = 65 + i * 270
        preferred = 'preferred' if entry['preferred_candidate'] else 'alternative'
        draw.text((10, y), f"{entry['move']} / {entry['revision']} / {preferred}", font=font,
                  fill='#f4dca4' if entry['preferred_candidate'] else '#aebbd0')
        draw.text((10, y + 18), ', '.join(entry['routes_or_intents']), font=small, fill='#c5d4e9')
        # One shared scale per entire strip, preserving lower down silhouettes.
        scale = min(100 / max(f.height for f in frames), 119 / max(f.width for f in frames))
        for j, frame in enumerate(frames):
            col, row = j % 3, j // 3
            resized = frame.resize((max(1, round(frame.width * scale)), max(1, round(frame.height * scale))), Image.Resampling.LANCZOS)
            x = 5 + col * 128 + (120 - resized.width) // 2
            baseline = y + 145 + row * 115
            canvas.paste(resized, (x, baseline - resized.height), resized)
            draw.text((8 + col * 128, baseline + 2), str(j + 1), font=small, fill='#9aabc3')
    canvas.save(folder / 'preview-390.png')


def build():
    records = json.loads((ROOT / 'prompts.json').read_text())
    config = json.loads((ROOT / 'moves.json').read_text())
    all_entries, seeds = [], []
    atlas_bytes = subprocess.check_output(['git', 'show', f'{BASE}:{ATLAS}'], cwd=REPO)
    from io import BytesIO
    atlas = Image.open(BytesIO(atlas_bytes)).convert('RGBA')
    for identity, family, cell in PEOPLE:
        folder = ROOT / family / identity
        for sub in ['seeds', 'raw', 'source-sheets', 'spaced']:
            (folder / sub).mkdir(parents=True, exist_ok=True)
        crop = [(cell % 2) * 512, (cell // 2) * 512, (cell % 2 + 1) * 512, (cell // 2 + 1) * 512]
        seed = atlas.crop(tuple(crop))
        seed_path = folder / 'seeds' / f'{identity}.png'
        seed.save(seed_path)
        assert np.array_equal(np.array(Image.open(seed_path)), np.array(seed))
        seed_info = {'identity': identity, 'base_commit': BASE, 'atlas': ATLAS,
                     'atlas_git_blob': '2f2ed2ebdca12584d9324c53fcc67694c68b0d22',
                     'cell_zero_based': cell, 'crop_xyxy': crop, 'size': [512, 512],
                     'facing': 'right', 'runtime_sole_reference_y': 497,
                     'file': str(seed_path.relative_to(ROOT)), 'sha256': sha(seed_path),
                     'pixel_identical_to_pinned_atlas': True}
        seeds.append(seed_info)
        entries, frames_for_preview = [], []
        for kind, cols, rows in [('actions', 6, 4), ('reactions', 4, 3), ('r2', 6, 2)]:
            record = next(r for r in records if r['identity'] == identity and r['kind'] == kind)
            source = ROOT / record['source']
            extracted = isolate(source, cols, rows)
            for row, info in enumerate(config[identity][kind]):
                item = extracted[row]
                move, routes, preferred, order, weights = info
                revision = 'r2' if kind == 'r2' else 'r1'
                path = folder / 'raw' / f'{identity}-{move}-{revision}.png'
                item['image'].save(path)
                spaced_path = folder / 'spaced' / path.name
                item['spaced'].save(spaced_path)
                saved = np.array(Image.open(path))
                original = np.array(Image.open(source).convert('RGBA'))
                x0, y0, x1, y1 = item['crop']
                visible_saved = saved[:, :, 3] > 0
                assert np.array_equal(saved[visible_saved], original[y0:y1, x0:x1][visible_saved])
                assert not item['clipped'], (str(source), move, item['clipped'])
                entry = {'identity': identity, 'move': move, 'revision': revision,
                         'file': str(path.relative_to(ROOT)), 'frame_count': cols,
                         'frame_order': 'left-to-right', 'frame_descriptions': order,
                         'routes_or_intents': routes, 'preferred_candidate': preferred,
                         'source': record['source'], 'source_row_1based': row + 1,
                         'source_crop_xyxy': item['crop'], 'frame_bounds_alpha_gt80_xyxy': item['bounds'],
                         'size': list(item['image'].size), 'mode': 'RGBA', 'sha256': sha(path),
                         'retained_pixels_identical_to_source': True, 'source_edge_clipped_frames': item['clipped'],
                         'spaced_file': str(spaced_path.relative_to(ROOT)),
                         'spaced_cell_size': [640, 512], 'spaced_scale': 1,
                         'raw_to_spaced_translation_xy_per_frame': item['translations'],
                         'spaced_note': 'Layout-only transparent padding; no scaling, rotation, repainting or per-frame Y alignment. Shared strip Y preserves airborne/down heights.',
                         'relative_frame_hold_weights_for_review_only': weights,
                         'timing_note': 'Relative pose emphasis only; Claude retains existing runtime timing.',
                         'extraction_note': 'Figures may cross nominal equal-width slots; use bounds and source ownership algorithm, not a naive equal-width cut.'}
                entries.append(entry)
                frames_for_preview.append(item['frames'])
        dump(folder / 'strips.json', entries)
        dump(folder / 'prompts.json', [r for r in records if r['identity'] == identity])
        dump(folder / 'seeds.json', [seed_info])
        notes_path = folder / 'NOTES.md'
        text = notes_path.read_text().split('## Frame order')[0].rstrip()
        table = '\n\n## Frame order\n\nEvery sequence reads left to right.\n\n| Strip | Frames in order |\n| --- | --- |\n'
        for entry in entries:
            table += f"| `{Path(entry['file']).name}` | " + ' → '.join(entry['frame_descriptions']) + ' |\n'
        notes_path.write_text(text + table)
        preview(folder, identity, entries, frames_for_preview)
        all_entries += entries
    dump(ROOT / 'strips.json', all_entries)
    dump(ROOT / 'seeds.json', seeds)
    validate(all_entries)


def validate(entries):
    checks = []
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or path.name == 'validation.json' or '__pycache__' in path.parts:
            continue
        info = {'file': str(path.relative_to(ROOT)), 'bytes': path.stat().st_size, 'sha256': sha(path)}
        if path.suffix == '.png':
            with Image.open(path) as im:
                im.load()
                info.update(size=list(im.size), mode=im.mode, decodes=True)
                if im.mode == 'RGBA':
                    extrema = im.getchannel('A').getextrema()
                    info['alpha_extrema'] = list(extrema)
                    assert extrema[0] == 0, path
                    assert extrema[1] > 80, path
        checks.append(info)
    report = {'package': 'ART-UNIT-ANIMATION-A7-001', 'base_commit': BASE,
              'raw_strip_count': len(entries), 'figure_count_including_alternatives': sum(e['frame_count'] for e in entries),
              'preferred_strip_count': sum(e['preferred_candidate'] for e in entries),
              'all_selected_source_silhouettes_inside_canvas': True,
              'raw_retained_source_pixels_unchanged': True, 'files': checks,
              'manifest_exclusion': 'validation.json excludes its own self-referential hash; verify its SHA-256 by direct local-versus-fetched Git blob comparison after push.',
              'approval': 'Art candidates only; owner artwork selection and in-game motion approval pending.'}
    dump(ROOT / 'validation.json', report)
    print(json.dumps({k: v for k, v in report.items() if k not in ['files']}, indent=2))
    print(f'Validated {len(checks)} payload files plus validation.json')


if __name__ == '__main__':
    build()
