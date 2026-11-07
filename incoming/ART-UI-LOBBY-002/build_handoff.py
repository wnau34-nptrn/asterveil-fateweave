"""Rebuild static pose package; never draws or composites body parts.

Pillow >= 12, NumPy and OpenCV are needed. Run from any directory.
Only whole-image uniform resizing, transparent margin cleanup, translation,
atlas packing and reference-only review composition happen here.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import tempfile
import statistics
import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
IDS = ['metta', 'lalin', 'kael', 'wynne', 'astrid']
POSES = ['sit', 'cheer', 'idle_alt']
R = Image.Resampling.LANCZOS


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize(source, factor=1.0, baseline_adjustment=0):
    im = Image.open(ROOT / source).convert('RGBA')
    assert im.width == im.height, source
    side = round(512 * factor)
    im = im.resize((side, side), R)
    # Ignore only near-invisible alpha dust from generation/resampling.
    im.putalpha(im.getchannel('A').point(lambda v: 0 if v < 8 else v))
    box = im.getbbox()
    x, y = (512 - side) // 2, 497 - box[3] + baseline_adjustment
    assert box[0] + x >= 0 and box[2] + x <= 512 and box[1] + y >= 0 and box[3]+y<=512, (source, box, x, y)
    out = Image.new('RGBA', (512, 512))
    out.alpha_composite(im, (x, y))
    return out, {'uniformScale': side / Image.open(ROOT / source).width,
                 'scaledCanvas': side, 'translation': [x, y], 'alphaDustThreshold': 8}


def reviews(cells):
    # All four columns use identical canvas scale: seed, sit, cheer, idle_alt.
    board = Image.new('RGBA', (1024, 1280), '#30313d')
    draw = ImageDraw.Draw(board)
    for row, actor in enumerate(IDS):
        images = [Image.open(ROOT / 'seeds' / f'{actor}.png').convert('RGBA')]
        images += [cells[f'{actor}_{pose}'] for pose in POSES]
        for col, im in enumerate(images):
            board.alpha_composite(im.resize((256, 256), R), (col * 256, row * 256))
            draw.line((col * 256, row * 256 + 248, (col + 1) * 256, row * 256 + 248), fill='#c9b58a60')
    board.convert('RGB').save(ROOT / 'review/poses-lineup.png')
    silhouettes = Image.new('RGBA', (360, 450), '#eee8db')
    for row, actor in enumerate(IDS):
        ims = [Image.open(ROOT / 'seeds' / f'{actor}.png').convert('RGBA')]
        ims += [cells[f'{actor}_{p}'] for p in POSES]
        for col, im in enumerate(ims):
            small = im.resize((90, 90), R)
            silhouette = Image.new('RGBA', (90, 90), 'black')
            silhouette.putalpha(small.getchannel('A'))
            silhouettes.alpha_composite(silhouette, (col * 90, row * 90))
    silhouettes.convert('RGB').save(ROOT / 'review/silhouettes.png')
    # Pure art mock: five requested actors plus two existing actors; no runtime/UI changes.
    bg = Image.open(REPO / 'public/assets/lobby/lobby_bg.webp').convert('RGBA')
    phone = ImageOps.fit(bg, (390, 844), method=R, centering=(.5, .72))
    heroes = Image.open(REPO / 'public/assets/lobby/lobby_poses_heroes.webp').convert('RGBA')
    old = Image.open(REPO / 'public/assets/lobby/lobby_poses_mercs.webp').convert('RGBA')
    placements = [
        ('guardian', heroes.crop((1024, 0, 1536, 512)), 55, 606, 90),
        ('garran', old.crop((512, 0, 1024, 512)), 335, 606, 90),
        ('wynne', cells['wynne_cheer'], 195, 606, 90),
        ('lalin', cells['lalin_idle_alt'], 120, 640, 105),
        ('astrid', cells['astrid_idle_alt'], 274, 640, 105),
        ('metta', cells['metta_sit'], 64, 721, 120),
        ('kael', cells['kael_sit'], 326, 721, 120),
    ]
    for name, im, x, foot, size in placements:
        if x > 195:
            im = ImageOps.mirror(im)
        phone.alpha_composite(im.resize((size, size), R), (x - size // 2, foot - round(496 * size / 512)))
    pit = Image.open(REPO / 'public/assets/lobby/lobby_firepit.webp').convert('RGBA').resize((82, 82), R)
    flame = Image.open(REPO / 'public/assets/lobby/camp_flame.webp').convert('RGBA').crop((0, 0, 256, 256)).resize((82, 82), R)
    phone.alpha_composite(pit, (154, 614))
    phone.alpha_composite(flame, (154, 614))
    # Reference-only HUD region boundaries, no invented game data or UI text.
    d = ImageDraw.Draw(phone)
    d.rectangle((8, 8, 381, 98), outline='#dfc59b80')
    d.rectangle((8, 770, 381, 835), outline='#dfc59b80')
    phone.convert('RGB').save(ROOT / 'review/lobby-phone.png')
    mirrored = Image.new('RGBA', (540, 450), '#30313d')
    for row, actor in enumerate(IDS):
        for col, pose in enumerate(POSES):
            small = cells[f'{actor}_{pose}'].resize((90,90),R)
            mirrored.alpha_composite(small, (col*180,row*90))
            mirrored.alpha_composite(ImageOps.mirror(small), (col*180+90,row*90))
    mirrored.convert('RGB').save(ROOT / 'review/mirrored-90.png')
    write_json(ROOT / 'review/composition.json', {
        'type': 'art-only mock, not an in-game screenshot', 'size': [390, 844],
        'actors': [{'id': n, 'x': x, 'footY': f, 'canvasSize': s, 'mirrored': x > 195}
                   for n, _, x, f, s in placements],
        'note': '5 new + 2 existing = 7; requested staging mock, not current runtime party capacity.'})


def main():
    config = json.loads((ROOT / 'selection.json').read_text())
    for folder in ['cells', 'variants', 'review', 'audit']:
        (ROOT / folder).mkdir(exist_ok=True)
    cells, transforms, atlas_map = {}, {}, {}
    atlas = Image.new('RGBA', (1536, 2560))
    for row, actor in enumerate(IDS):
        for col, pose in enumerate(POSES):
            key = f'{actor}_{pose}'
            spec = config['poses'][key]
            im, transform = normalize(spec['raw'], spec.get('scale', 1), spec.get('baselineAdjustment', 0))
            assert im.getchannel('A').getextrema() == (0,255), key
            assert all(im.getpixel(pt)[3] == 0 for pt in [(0,0),(511,0),(0,511),(511,511)]), key
            im.save(ROOT / 'cells' / f'{key}.png')
            cells[key] = im
            transforms[key] = transform
            atlas.alpha_composite(im, (col * 512, row * 512))
            frame = {'x': col * 512, 'y': row * 512, 'w': 512, 'h': 512, 'footY': 496}
            if pose == 'sit':
                frame['seatY'] = spec['seatY']
            atlas_map[key] = frame
    for key, spec in config.get('variants', {}).items():
        im, transform = normalize(spec['raw'], spec.get('scale', 1))
        im.save(ROOT / 'variants' / f'{key}.png')
        transforms[key] = transform
    write_json(ROOT / 'normalization.json', transforms)
    atlas.save(ROOT / 'lobby_poses_p03.webp', lossless=True, exact=True, method=6)
    decoded = Image.open(ROOT / 'lobby_poses_p03.webp').convert('RGBA')
    assert np.array_equal(np.asarray(atlas), np.asarray(decoded)), 'WebP changed pixels'
    write_json(ROOT / 'lobby_poses_p03.json', atlas_map)
    reviews(cells)
    if config.get('variants'):
        variant_board = Image.new('RGBA', (1024, 512), '#30313d')
        for row, actor in enumerate(['lalin', 'kael']):
            variant_board.alpha_composite(Image.open(ROOT / 'seeds' / f'{actor}.png').resize((256,256),R), (0, row*256))
            variant_board.alpha_composite(cells[f'{actor}_idle_alt'].resize((256,256),R), (256,row*256))
            key = f'{actor}_idle_alt_r2'
            variant_board.alpha_composite(Image.open(ROOT / 'variants' / f'{key}.png').resize((256,256),R), (512,row*256))
            variant_board.alpha_composite(ImageOps.mirror(cells[f'{actor}_idle_alt']).resize((256,256),R), (768,row*256))
        variant_board.convert('RGB').save(ROOT / 'review/variants.png')
    audit_reports = {}
    for actor in IDS:
        with tempfile.TemporaryDirectory() as temp:
            d = Path(temp)
            Image.open(ROOT / 'seeds' / f'{actor}.png').save(d / '000.png')
            names = [f'{actor}_{p}' for p in POSES]
            names += [k for k in config.get('variants', {}) if k.startswith(actor + '_')]
            for i, key in enumerate(names, 1):
                src = ROOT / ('cells' if key in cells else 'variants') / f'{key}.png'
                Image.open(src).save(d / f'{i:03}.png')
            out = ROOT / 'audit' / f'{actor}.json'
            run = subprocess.run([sys.executable, str(REPO / 'scripts/unit-anatomy-audit.py'), '--cells', str(d), '--json', str(out)], capture_output=True, text=True)
            data = json.loads(out.read_text())
            rows = next(iter(data['report'].values()))
            data['report'] = {actor: rows}
            data['frames'] = ['seed'] + names
            data['command'] = f'python3 scripts/unit-anatomy-audit.py --cells <seed+{actor}-poses> --json audit/{actor}.json'
            data['scriptExitCode'] = run.returncode
            write_json(out, data)
            scales = [r['scale'] for r in rows[1:] if r['status'] in ('ok', 'drift')]
            summary = {'measured': len(scales), 'total': len(names),
                       'median': statistics.median(scales) if scales else None,
                       'max': max(scales) if scales else None,
                       'notMeasured': [names[i-1] for i,r in enumerate(rows) if i and r['status']=='not-measured'],
                       'scriptExitCode': run.returncode}
            assert scales and summary['median'] <= 1.15 and summary['max'] <= 1.20, summary
            audit_reports[actor] = summary
            print(actor, summary)
    protected = ['public/assets/art/units.webp', 'public/assets/art/units_mercs.webp',
                 'public/assets/art/portraits.webp', 'public/assets/title/title_bg.webp',
                 'public/assets/world/landmark_camp.webp', 'public/assets/lobby/lobby_bg.webp',
                 'public/assets/lobby/lobby_poses_heroes.webp', 'public/assets/lobby/lobby_poses_mercs.webp']
    hashes = {}
    for path in protected:
        content = subprocess.check_output(['git', 'show', config['baseCommit'] + ':' + path], cwd=REPO)
        hashes[path] = hashlib.sha256(content).hexdigest()
    write_json(ROOT / 'protected-sha256.json', hashes)
    files = {}
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or path.name in ['validation.json', 'SHA256SUMS'] or '__pycache__' in path.parts:
            continue
        entry = {'sha256': sha(path), 'bytes': path.stat().st_size}
        if path.suffix.lower() in ['.png', '.webp']:
            with Image.open(path) as im:
                im.load()
                entry.update(size=list(im.size), mode=im.mode)
        files[str(path.relative_to(ROOT))] = entry
    write_json(ROOT / 'validation.json', {'schema':1, 'files':files, 'anatomy':audit_reports,
               'atlas':{'size':[1536,2560], 'frames':15, 'losslessPixelRoundtrip':True,
                        'bytes':(ROOT/'lobby_poses_p03.webp').stat().st_size},
               'ownerArtworkApproval':'pending', 'runtimeTested':False})
    entries = [(p, v['sha256']) for p,v in files.items()]
    entries.append(('validation.json', sha(ROOT/'validation.json')))
    (ROOT/'SHA256SUMS').write_text(''.join(f'{h}  {p}\n' for p,h in sorted(entries)))


if __name__ == '__main__':
    main()
