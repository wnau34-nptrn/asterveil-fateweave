"""Original ImageGen art: deterministic Batch 1 crop/scale/translation only.

python incoming/ART-CHAR-REDESIGN-001/package.py --prepare-only
python incoming/ART-CHAR-REDESIGN-001/package.py --base origin/feature/fateweave-initial-prototype
Full export reads the specified Git base, writes only inside this package, and
compares EVERY untouched decoded pixel/cell. No runtime files are modified.
"""
from pathlib import Path
import argparse
import hashlib
import io
import json
import subprocess
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, binary_dilation

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
RESAMPLE = Image.Resampling.LANCZOS
IDS = ('odran', 'isolde')
BASE_PATHS = {
    'units_mercs': 'public/assets/art/units_mercs.webp',
    'portraits_mercs': 'public/assets/art/portraits_mercs.webp',
    'gear_items': 'public/assets/ui/equip/gear_items.webp',
}


def dump(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def isolate(source):
    # Same global connected-component mask, dilation and alpha cleanup as Batch 1.
    arr = np.asarray(source.convert('RGBA')).copy()
    labels, count = label(arr[:, :, 3] >= 8)
    assert count, 'empty source'
    component = int(np.argmax(np.bincount(labels.ravel())[1:]) + 1)
    mask = binary_dilation(labels == component, iterations=2)
    arr[:, :, 3] = np.where(mask, arr[:, :, 3], 0)
    arr[arr[:, :, 3] < 4] = 0
    body = Image.fromarray(arr)
    return body.crop(body.getbbox()), component


def normalize(source, size, max_extent, sole=None):
    body, component = isolate(source)
    scale = min(max_extent[0] / body.width, max_extent[1] / body.height)
    body = body.resize((round(body.width * scale), round(body.height * scale)), RESAMPLE)
    frame = Image.new('RGBA', size)
    offset = ((size[0] - body.width) // 2,
              sole + 1 - body.height if sole is not None else (size[1] - body.height) // 2)
    frame.alpha_composite(body, offset)
    return frame, {'sourceComponent': component, 'scale': scale, 'offset': offset}


def pack(name, old, replacements, cell):
    atlas = old.copy()
    for (col, row), im in replacements.items():
        assert im.size == (cell, cell)
        atlas.paste(im, (col * cell, row * cell))
    target = HERE / 'packaged' / (name + '.webp')
    atlas.save(target, lossless=True, method=6, exact=True)
    decoded = Image.open(target).convert('RGBA')
    assert decoded.size == old.size
    original, actual = np.asarray(old), np.asarray(decoded)
    unchanged = np.ones(original.shape[:2], dtype=bool)
    checks = []
    for y in range(0, old.height, cell):
        for x in range(0, old.width, cell):
            coord = (x // cell, y // cell)
            box = (x, y, min(x + cell, old.width), min(y + cell, old.height))
            if coord in replacements:
                unchanged[y:y+cell, x:x+cell] = False
                assert np.array_equal(np.asarray(replacements[coord]), np.asarray(decoded.crop(box)))
            else:
                assert np.array_equal(np.asarray(old.crop(box)), np.asarray(decoded.crop(box))), (name, coord)
                checks.append(list(coord))
    assert np.array_equal(original[unchanged], actual[unchanged])
    return {'dimensions': old.size, 'untouchedCellsPixelIdentical': checks,
            'replacedCells': [list(c) for c in replacements], 'lossless': True}


def reviews(units, portraits, weapons):
    refs = [Image.open(HERE / 'review' / (name + '-units-reference.png')).convert('RGBA')
            for name in ('corin', 'cerise')]
    cast = [refs[0], units[0], refs[1], units[1]]
    names = ['Corin (unchanged)', 'Odran / thiran', 'Cerise (unchanged)', 'Isolde / wila']
    bg = Image.open(HERE / 'review/battle_forest-reference.webp').convert('RGB')
    lineup = Image.new('RGB', (640, 340), '#edf0ed')
    backdrop = bg.resize((640, round(bg.height * 640 / bg.width)), RESAMPLE)
    lineup.paste(backdrop.crop((0, max(0, backdrop.height-165), 640, max(0, backdrop.height-165)+165)), (0, 0))
    d = ImageDraw.Draw(lineup)
    for i, (name, unit) in enumerate(zip(names, cast)):
        small = unit.resize((115, 115), RESAMPLE)
        x = i * 160 + 22
        lineup.paste(small, (x, 22), small)
        black = Image.new('RGBA', small.size, (0, 0, 0, 255))
        black.putalpha(small.getchannel('A'))
        lineup.paste(black, (x, 199), black)
        d.text((i*160+7, 145), name, fill='white')
        d.text((i*160+7, 318), name, fill='#111111')
    d.text((8, 177), '115 px cells / black silhouettes / art QA, not gameplay capture', fill='#111111')
    lineup.save(HERE / 'review/lineup.png')
    native = Image.new('RGB', (640, 250), '#16263a')
    d = ImageDraw.Draw(native)
    for i, ident in enumerate(IDS):
        x = i * 320
        u = units[i].resize((115, 115), RESAMPLE)
        native.paste(u, (x+12, 12), u)
        native.paste(portraits[i].resize((40, 40), RESAMPLE), (x+152, 20))
        native.paste(weapons[i], (x+175, 95), weapons[i])
        d.text((x+12, 138), ident + ' / unit 115px', fill='white')
        d.text((x+12, 162), 'portrait 40px / weapon 128px', fill='white')
    native.save(HERE / 'review/native-sizes.png')
    p40 = Image.new('RGB', (640, 92), '#16263a')
    d = ImageDraw.Draw(p40)
    pcast = [Image.open(HERE/'review/corin-portraits-reference.png'), portraits[0],
             Image.open(HERE/'review/cerise-portraits-reference.png'), portraits[1]]
    for i, (name, portrait) in enumerate(zip(names, pcast)):
        p40.paste(portrait.convert('RGB').resize((40, 40), RESAMPLE), (i*160+60, 8))
        d.text((i*160+7, 61), name, fill='white')
    p40.save(HERE / 'review/portraits-40.png')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default='origin/feature/fateweave-initial-prototype')
    parser.add_argument('--prepare-only', action='store_true')
    args = parser.parse_args()
    for folder in ('unit', 'portrait', 'weapon', 'packaged', 'review', 'provenance'):
        (HERE / folder).mkdir(exist_ok=True)
    units, portraits, weapons, frames = [], [], [], {}
    gear_sheet = Image.open(HERE / 'sources/weapons-sheet.png').convert('RGBA')
    for i, ident in enumerate(IDS):
        unit, detail = normalize(Image.open(HERE / f'sources/{ident}-unit.png'),
                                 (512, 512), (480, 460), sole=496)
        bbox = unit.getbbox()
        assert bbox[1] >= 37 and bbox[3] == 497 and bbox[2]-bbox[0] <= 480
        assert bbox[3]-bbox[1] <= 460 and bbox[0] >= 16 and bbox[2] <= 496
        alpha = np.asarray(unit.getchannel('A'))
        assert np.any(alpha == 0) and np.any(alpha == 255)
        assert np.any(alpha[496] > 0) and not np.any(alpha[497:] > 0)
        unit.save(HERE / f'unit/{ident}.png', optimize=True)
        units.append(unit)
        frames[ident] = {**detail, 'alphaBoundsExclusive': bbox, 'frame': [512, 512],
                         'pivot': [0.5, 497/512], 'soleInclusive': 496, 'realAlpha': True}
        portrait = Image.open(HERE / f'sources/{ident}-portrait.png').convert('RGBA').resize((512, 512), RESAMPLE)
        portrait.save(HERE / f'portrait/{ident}.png', optimize=True)
        portraits.append(portrait)
        w = gear_sheet.width // 2
        weapon, _ = normalize(gear_sheet.crop((i*w, 0, (i+1)*w, gear_sheet.height)),
                              (128, 128), (112, 112))
        weapon.save(HERE / f'weapon/{ident}.png', optimize=True)
        weapons.append(weapon)
    reviews(units, portraits, weapons)
    checks = {}
    # The small current gear base was independently downloaded through GitHub.
    old_gear = Image.open(HERE / 'provenance/base-gear_items.webp').convert('RGBA')
    checks['gear_items'] = pack('gear_items', old_gear, {(6, 0): weapons[0], (6, 1): weapons[1]}, 128)
    base_sha = None
    if not args.prepare_only:
        base_sha = subprocess.check_output(['git', 'rev-parse', args.base], cwd=REPO, text=True).strip()
        for name, cells in [('units_mercs', units), ('portraits_mercs', portraits)]:
            raw = subprocess.check_output(['git', 'show', f'{base_sha}:{BASE_PATHS[name]}'], cwd=REPO)
            old = Image.open(io.BytesIO(raw)).convert('RGBA')
            checks[name] = pack(name, old, {(1, 3): cells[0], (1, 4): cells[1]}, 512)
        gear_raw = subprocess.check_output(['git', 'show', f'{base_sha}:{BASE_PATHS["gear_items"]}'], cwd=REPO)
        checks['gear_items'] = pack('gear_items', Image.open(io.BytesIO(gear_raw)).convert('RGBA'),
                                    {(6, 0): weapons[0], (6, 1): weapons[1]}, 128)
    files = {}
    for path in sorted(HERE.rglob('*')):
        if path.is_file() and path.name != 'validation.json' and '__pycache__' not in path.parts:
            if path.suffix in ('.png', '.webp'):
                with Image.open(path) as image:
                    image.load()
            files[str(path.relative_to(HERE))] = {'sha256': sha(path), 'bytes': path.stat().st_size}
    validation = {'task': 'ART-CHAR-REDESIGN-001', 'baseRef': args.base, 'baseCommit': base_sha,
                  'status': 'prepared-partial' if args.prepare_only else 'packaged-local',
                  'frames': frames, 'atlasChecks': checks, 'files': files,
                  'manifestExcludes': ['validation.json (self-reference)'],
                  'missing': ['current base unit/portrait atlases', 'normal git push',
                              'fetch-back SHA-256 and Pillow verification', 'pull request'] if args.prepare_only else
                             [],
                  'deliveryVerification': 'Separate post-push verify_remote.py run; results recorded in PR.',
                  'ownerVisualApproval': False, 'runtimeIntegrated': False}
    dump(HERE / 'validation.json', validation)
    print(json.dumps({'status': validation['status'], 'frames': frames,
                      'atlasChecks': {k: len(v['untouchedCellsPixelIdentical']) for k,v in checks.items()},
                      'decodedImages': sum(p.suffix in ('.png', '.webp') for p in HERE.rglob('*'))}, indent=2))


if __name__ == '__main__':
    main()
