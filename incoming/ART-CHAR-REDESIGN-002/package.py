"""Deterministic artwork normalization/packaging; changes only this incoming folder.
Run with Python, Pillow, numpy, scipy after fetching the game base.
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


def dump(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def git_bytes(ref, path):
    return subprocess.check_output(['git', 'show', f'{ref}:{path}'], cwd=REPO)


def rgba(raw):
    return Image.open(io.BytesIO(raw)).convert('RGBA')


def frame(atlas, index):
    x, y = index % 2 * 512, index // 2 * 512
    return atlas.crop((x, y, x + 512, y + 512))


def normalize():
    # Batch 1 routine: global connected-component mask, two-pixel dilation,
    # alpha cleanup, one proportional scale and translation. No body reshaping.
    raw = Image.open(HERE / 'sources/isolde-ready.png').convert('RGBA')
    arr = np.array(raw)
    labels, count = label(arr[:, :, 3] >= 8)
    assert count
    component = int(np.argmax(np.bincount(labels.ravel())[1:]) + 1)
    mask = binary_dilation(labels == component, iterations=2)
    arr[:, :, 3] = np.where(mask, arr[:, :, 3], 0)
    arr[arr[:, :, 3] < 4] = 0
    clean = Image.fromarray(arr)
    box = clean.getbbox()
    body = clean.crop(box)
    scale = min(480 / body.width, 460 / body.height)
    body = body.resize((round(body.width * scale), round(body.height * scale)), RESAMPLE)
    out = Image.new('RGBA', (512, 512))
    offset = ((512 - body.width) // 2, 497 - body.height)
    out.alpha_composite(body, offset)
    out.save(HERE / 'unit/isolde.png', optimize=True)
    return out, {'sourceBoundsExclusive': box, 'sourceSize': raw.size,
                 'scale': scale, 'offset': offset, 'sourceComponent': component}


def anatomy(unit, landmarks):
    a = np.asarray(unit)[:, :, 3]
    bbox = unit.getbbox()
    assert bbox[0] >= 16 and bbox[2] <= 496 and bbox[1] >= 37 and bbox[3] == 497
    assert bbox[2] - bbox[0] <= 480 and bbox[3] - bbox[1] <= 460
    assert np.any(a == 0) and np.any(a >= 250)
    hair = landmarks['hairTopY']
    # Hair ROI excludes the bell crown and short streamers.
    ys, _ = np.where(a[:180, 200:410] >= 40)
    assert int(ys.min()) == hair
    feet = {}
    for side in ('left', 'right'):
        x1, x2 = landmarks[side + 'FootX']
        ys, xs = np.where(a[470:, x1:x2] >= 40)
        row = int(470 + ys.max())
        assert row == 496, (side, row)
        feet[side] = {'contactRow': row, 'xRoi': [x1, x2],
                      'contactPixels': int(np.count_nonzero(a[row, x1:x2] >= 40))}
    height = 497 - hair
    head = landmarks['chinY'] - hair + 1
    ratio = head / height
    assert 145 <= head <= 165 and 440 <= height <= 460 and .32 <= ratio <= .36
    return {'alphaBoundsExclusive': bbox, 'frame': [512, 512], 'realAlpha': True,
            'hairTopY': hair, 'chinY': landmarks['chinY'], 'headHeight': head,
            'bodyHeight': height, 'headBodyRatio': ratio, 'feet': feet,
            'soleInclusive': 496, 'pivot': [.5, 497 / 512],
            'measurementMethod': 'Visually reviewed chin landmark; alpha hair/sole scan. Inclusive heights.'}


def reviews(base, unit, landmarks, background):
    odran = Image.open(HERE / 'unit/odran.png').convert('RGBA')
    cast = [frame(base, 6), odran, frame(base, 8), unit]
    names = ['Corin (unchanged)', 'Odran (PR118 exact)', 'Cerise (unchanged)', 'Isolde ready']
    bg = background.convert('RGB').resize((640, 427), RESAMPLE)
    out = Image.new('RGB', (640, 360), '#e7eeeb')
    out.paste(bg.crop((0, 262, 640, 427)), (0, 0))
    d = ImageDraw.Draw(out)
    for i, u in enumerate(cast):
        v = u.resize((115, 115), RESAMPLE)
        x = i * 160 + 22
        out.paste(v, (x, 22), v)
        black = Image.new('RGBA', v.size, 'black')
        black.putalpha(v.getchannel('A'))
        out.paste(black, (x, 205), black)
        d.text((i*160+5, 145), names[i], fill='white')
        d.text((i*160+5, 323), names[i], fill='#101a20')
    for key, color in [('hairTopY', '#66ffff'), ('chinY', '#ff99bb')]:
        y = 22 + round(landmarks['ceriseGuide'][key] * 115 / 512)
        d.line((0, y, 639, y), fill=color)
    d.text((7, 171), '115px / cyan: Cerise hair top; pink: chin / same cell scale', fill='#101a20')
    d.text((7, 344), 'Art QA composition; not a gameplay screenshot.', fill='#101a20')
    out.save(HERE / 'review/lineup.png')
    full = Image.new('RGBA', (512, 512), '#d5ddd9')
    full.alpha_composite(unit)
    d = ImageDraw.Draw(full)
    for y, text, color in [(37, 'hair top 37', '#004499'), (194, 'chin 194', '#aa0044'),
                           (496, 'both soles 496', '#005522')]:
        d.line((0, y, 511, y), fill=color)
        d.text((4, max(0, y-13)), text, fill=color)
    full.convert('RGB').save(HERE / 'review/anatomy-512.png')
    native = Image.new('RGB', (320, 160), '#17263b')
    native.paste(unit.resize((115, 115), RESAMPLE), (15, 5), unit.resize((115, 115), RESAMPLE))
    portrait = Image.open(HERE / 'portrait/isolde.png').convert('RGB').resize((40, 40), RESAMPLE)
    native.paste(portrait, (180, 20))
    ImageDraw.Draw(native).text((10, 130), 'Unit 115px / unchanged portrait 40px', fill='white')
    native.save(HERE / 'review/native-sizes.png')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default='origin/feature/fateweave-initial-prototype')
    args = parser.parse_args()
    base_sha = subprocess.check_output(['git', 'rev-parse', args.base], cwd=REPO, text=True).strip()
    copies = json.loads((HERE / 'provenance/approved-copies.json').read_text())
    for path, expected in copies['files'].items():
        raw = (HERE / path).read_bytes()
        assert digest(raw) == expected['sha256'] and len(raw) == expected['bytes'], path
    landmarks = json.loads((HERE / 'landmarks.json').read_text())
    unit, transform = normalize()
    metrics = anatomy(unit, landmarks['isolde'])
    atlas_path = 'public/assets/art/units_mercs.webp'
    base_raw = git_bytes(base_sha, atlas_path)
    base = rgba(base_raw)
    atlas = base.copy()
    odran = Image.open(HERE / 'unit/odran.png').convert('RGBA')
    atlas.paste(odran, (512, 1536))
    atlas.paste(unit, (512, 2048))
    target = HERE / 'packaged/units_mercs.webp'
    # Transparent RGB participates in the untouched-cell equality check.
    atlas.save(target, lossless=True, exact=True, method=6)
    assert target.stat().st_size <= len(base_raw), 'atlas exceeds current base download size'
    actual = Image.open(target).convert('RGBA')
    assert actual.size == base.size
    unchanged = np.ones((base.height, base.width), dtype=bool)
    for i, cell in [(7, odran), (9, unit)]:
        assert np.array_equal(np.asarray(frame(actual, i)), np.asarray(cell))
        unchanged[i//2*512:(i//2+1)*512, i%2*512:(i%2+1)*512] = False
    assert np.array_equal(np.asarray(base)[unchanged], np.asarray(actual)[unchanged])
    untouched = []
    for i in range(base.width//512 * (base.height//512)):
        if i not in (7, 9):
            assert np.array_equal(np.asarray(frame(base, i)), np.asarray(frame(actual, i)))
            untouched.append(i)
    background = rgba(git_bytes(base_sha, 'public/assets/art/battle_forest.webp'))
    reviews(base, unit, landmarks, background)
    files = {}
    decoded = 0
    for path in sorted(HERE.rglob('*')):
        if path.is_file() and path.name != 'validation.json' and '__pycache__' not in path.parts:
            if path.suffix in ('.png', '.webp'):
                with Image.open(path) as image:
                    image.load()
                decoded += 1
            files[str(path.relative_to(HERE))] = {'sha256': digest(path.read_bytes()), 'bytes': path.stat().st_size}
    report = {'task': 'ART-CHAR-REDESIGN-002', 'baseCommit': base_sha,
              'anatomy': metrics, 'normalization': transform, 'approvedCopies': copies,
              'atlas': {'baseSha256': digest(base_raw), 'baseBytes': len(base_raw),
                        'outputBytes': target.stat().st_size, 'replacedFrames': [7, 9],
                        'untouchedFramesPixelIdentical': untouched, 'allUntouchedPixelsIdentical': True,
                        'lossless': True, 'dimensions': actual.size},
              'portraitAndWeaponDesignsChanged': False, 'packagedPortraitAndGearNeeded': False,
              'ownerVisualApproval': False, 'runtimeIntegrated': False,
              'files': files, 'manifestExcludes': ['validation.json (recursive hash)'],
              'decodedImages': decoded}
    dump(HERE / 'validation.json', report)
    print(json.dumps({k: report[k] for k in ['baseCommit', 'anatomy', 'atlas', 'decodedImages']}, indent=2))


if __name__ == '__main__':
    main()
