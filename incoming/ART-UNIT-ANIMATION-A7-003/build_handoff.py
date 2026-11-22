"""Rebuild A7-003 from immutable generator strips. No runtime changes."""
from pathlib import Path
import hashlib, json, subprocess, sys
from types import SimpleNamespace
import cv2
import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SIZE = 1024
PAD = 256
GROUND = 753
EXPECTED = {
    'odran': 'ca7a30b361eb8e7fd8764cacfd7e56b7cd3f13d3a701586b0b7ee54a92a61ccf',
    'isolde': 'e6d80253147ac8b0cd52edae6c211417fb30779b89b2524963ee724f12b530ba',
}

def dump(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')

def bbox(image, threshold=64):
    a = np.array(image)[..., 3]
    yy, xx = np.where(a > threshold)
    return (int(xx.min()), int(yy.min()), int(xx.max())+1, int(yy.max())+1)

def extract(image, expected):
    """Separate disconnected opaque figures, retaining a 4px antialias fringe.

    Projection cuts would cut diagonal staffs where their x ranges overlap.
    Connected component masks preserve the complete implement instead.
    """
    a = np.array(image)
    count, labels, stats, centers = cv2.connectedComponentsWithStats((a[..., 3] > 64).astype('uint8'), 8)
    ids = sorted([i for i in range(1, count) if stats[i, 4] > 2000], key=lambda i: centers[i, 0])
    if len(ids) != expected:
        raise ValueError(f'Expected {expected} figures, found {len(ids)}')
    output = []
    for idx in ids:
        mask = cv2.dilate((labels == idx).astype('uint8'), np.ones((9, 9), np.uint8))
        # Do not borrow opaque pixels from a neighbouring component.
        mask[(labels != 0) & (labels != idx)] = 0
        pixels = a.copy()
        pixels[..., 3] *= mask
        pixels[pixels[..., 3] == 0] = 0
        im = Image.fromarray(pixels)
        box = im.getbbox()
        output.append((im.crop(box), box, list(map(int, stats[idx, :4]))))
    return output

def main():
    prompts = json.loads((HERE / 'prompts.json').read_text())
    reviews = json.loads((HERE / 'visual-review.json').read_text()) if (HERE / 'visual-review.json').exists() else {}
    strips = []
    audits = []
    seed_entries = []
    preview_rows = {c: [] for c in EXPECTED}
    cursor = {c: 1 for c in EXPECTED}
    for character, digest in EXPECTED.items():
        p = HERE / 'seeds' / (character + '.png')
        assert hashlib.sha256(p.read_bytes()).hexdigest() == digest
        im = Image.open(p)
        assert im.mode == 'RGBA' and im.size == (512, 512)
        seed_entries.append({'character': character, 'runtimeId': 'thiran' if character == 'odran' else 'wila',
                             'file': str(p.relative_to(HERE)), 'sha256': digest, 'sourceBranch': 'art/art-char-redesign-002',
                             'sourcePR': 120, 'soleY': 496, 'logicalGroundY': 497})
    for job in prompts['generations']:
        c, move = job['character'], job['move']
        seed = Image.open(HERE / 'seeds' / (c + '.png')).convert('RGBA')
        raw = Image.open(HERE / job['raw']).convert('RGBA')
        poses = extract(raw, len(job['poses']))
        # Raster registration varies with generator output; no frame receives its own scale.
        # Every delivered character uses the seed's logical size (characterScale=1).
        seed_box = bbox(seed)
        first_box = bbox(poses[0][0])
        scale = (seed_box[3] - seed_box[1]) / (first_box[3] - first_box[1])
        reference = Image.new('RGBA', (SIZE, SIZE))
        reference.paste(seed, (PAD, PAD))
        cell_dir = HERE / 'cells' / f'{c}-{move}'
        cell_dir.mkdir(parents=True, exist_ok=True)
        previous_hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in cell_dir.glob('*.png')}
        reference.save(cell_dir / '000.png')
        cells = []
        transforms = []
        for i, (pose, raw_box, opaque_box) in enumerate(poses):
            canvas = Image.new('RGBA', (SIZE, SIZE))
            resized = pose.resize((round(pose.width*scale), round(pose.height*scale)), Image.Resampling.LANCZOS)
            rb = bbox(resized)
            x = round(SIZE/2 - (rb[0]+rb[2])/2)
            y = GROUND-rb[3]
            if x < 0 or y < 0 or x+resized.width > SIZE or y+resized.height > SIZE:
                raise ValueError(f'{c}-{move}-{i+1}: would crop implement')
            canvas.paste(resized, (x, y))
            locked = move != 'down' and (i == 0 or i == len(poses)-1)
            if locked:
                canvas = reference.copy()
            canvas.save(cell_dir / f'{i+1:03d}.png')
            cells.append(canvas)
            transforms.append({'frame': i+1, 'rawBounds': raw_box, 'opaqueBoundsXYWH': opaque_box,
                               'rawToCellScale': scale, 'offset': [x, y], 'seedLocked': locked})
        spaced = Image.new('RGBA', ((SIZE+96)*len(cells)-96, SIZE))
        for i, cell in enumerate(cells):
            spaced.paste(cell, (i*(SIZE+96), 0))
        out = HERE / 'spaced' / f'{c}-{move}.png'
        out.parent.mkdir(exist_ok=True)
        spaced.save(out)
        audit_json = HERE / 'audits' / f'{c}-{move}.json'
        audit_json.parent.mkdir(exist_ok=True)
        current_hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in cell_dir.glob('*.png')}
        if audit_json.exists() and previous_hashes == current_hashes:
            cached = json.loads(audit_json.read_text())['report'][f'{c}-{move}']
            run = SimpleNamespace(returncode=int(any(r['status']=='drift' for r in cached)))
        else:
            run = subprocess.run([sys.executable, str(ROOT/'scripts/unit-anatomy-audit.py'), '--cells', str(cell_dir),
                                  '--json', str(audit_json)], capture_output=True, text=True)
            (audit_json.with_suffix('.stdout.txt')).write_text(run.stdout+run.stderr)
        report = json.loads(audit_json.read_text())['report'][f'{c}-{move}']
        measured = [r['scale'] for r in report if r['status'] in ('ok', 'drift')]
        median = float(np.median(measured)) if measured else None
        gate = (median is not None and median <= 1.15 and all(v <= 1.20 for v in measured) and run.returncode == 0)
        entry = {'character': c, 'runtimeId': 'thiran' if c == 'odran' else 'wila', 'move': move,
                 'frames': len(cells), 'slotOrder': list(range(cursor[c], cursor[c]+len(cells))),
                 'cellFiles': [f'cells/{c}-{move}/{i:03d}.png' for i in range(1,len(cells)+1)],
                 'referenceCell': f'cells/{c}-{move}/000.png', 'spaced': str(out.relative_to(HERE)),
                 'characterScale': 1.0, 'rawRasterRegistrationScale': scale,
                 'logicalSourceSize': [512,512], 'cellSize': [SIZE,SIZE], 'logicalOriginInCell': [PAD,PAD],
                 'logicalGroundY': 497, 'cellGroundY': GROUND, 'cellPivot': [512,GROUND],
                 'timingWeights': [1,1.2,.75,1,.8,1] if len(cells)==6 else [.8,1,.9,1],
                 'frameTransforms': transforms, 'anatomyGate': gate, 'medianHeadScale': median,
                 'notMeasuredFrames': [r['frame'] for r in report if r['status']=='not-measured'],
                 'auditScriptExitCode': run.returncode,
                 'routes': job['routes'],
                 'recommended': bool(gate and reviews.get(f'{c}-{move}', {}).get('reviewed')),
                 'status': 'candidate-awaiting-owner-selection' if gate and reviews.get(f'{c}-{move}', {}).get('reviewed') else 'missing-not-final'}
        strips.append(entry)
        audits.append({'character':c, 'move':move, 'median':median, 'max':max(measured) if measured else None,
                       'gate':gate, 'notMeasured':entry['notMeasuredFrames'], 'auditExit':run.returncode})
        cursor[c] += len(cells)
        preview_rows[c].append((move, [reference]+cells))
    dump(HERE/'seeds.json', seed_entries)
    dump(HERE/'strips.json', {'schema':1, 'sharedCharacterScale': {'odran':1.0,'isolde':1.0},
                            'note':'Raw raster registration is one transform per strip; never per-frame scaling. Cells use seed-sized logical coordinates with transparent overscan.',
                            'strips':strips})
    dump(HERE/'audits'/'summary.json', audits)
    for c, rows in preview_rows.items():
        # A genuine 390px comparison board: three 130px tiles, identical image scale.
        tile = 130
        out = Image.new('RGB', (390, sum(24+((len(cs)+2)//3)*tile for _,cs in rows)), '#28303a')
        draw = ImageDraw.Draw(out)
        y = 0
        for move, cs in rows:
            draw.text((5,y+4), f'{c} / {move} / seed, then chronological frames', fill='white')
            y += 24
            for i, im in enumerate(cs):
                # Same logical window and scale for every frame, including the seed.
                thumb = im.crop((128,128,896,896)).resize((tile,tile), Image.Resampling.LANCZOS)
                out.paste(thumb, ((i%3)*tile,y+(i//3)*tile),thumb)
                draw.text(((i%3)*tile+3,y+(i//3)*tile+2), 'seed' if i==0 else str(i),fill='white')
            y += ((len(cs)+2)//3)*tile
        out.save(HERE/f'{c}-preview-390.png')
    print(json.dumps(audits, indent=2))

    payload = {}
    for path in sorted(HERE.rglob('*')):
        if not path.is_file() or path.name in ('validation.json', 'SHA256SUMS') or '__pycache__' in path.parts:
            continue
        item = {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': path.stat().st_size}
        if path.suffix.lower() == '.png':
            with Image.open(path) as im:
                im.verify()
            with Image.open(path) as im:
                im.load()
                item.update(size=list(im.size), mode=im.mode)
        payload[str(path.relative_to(HERE))] = item
    dump(HERE/'validation.json', {'schema':1, 'files':payload, 'seedHashesVerified':True,
         'candidateStrips':sum(s['recommended'] for s in strips),
         'missingMoves':[s['character']+'-'+s['move'] for s in strips if not s['recommended']],
         'ownerArtworkSelection':'pending', 'ownerMotionApproval':'pending', 'runtimeIntegrated':False})
    checksum_paths = sorted([HERE/k for k in payload] + [HERE/'validation.json'])
    (HERE/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(HERE))+'\n' for p in checksum_paths))

if __name__ == '__main__':
    main()
