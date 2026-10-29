"""Unit anatomy audit: does each animation frame keep the idle model's head/torso scale?

Bounding-box height and sole alignment cannot catch a pose whose head is drawn larger than the idle model
(Aegis A2: head about 1.35x while the silhouette height matched). This script matches SIFT features from the
upper part of frame 0 (hair, face, helmet, shoulders) into every frame and fits a similarity transform; its scale
is the head/upper-body scale relative to idle, independent of crouch, lunge or limb extension.

  python3 scripts/unit-anatomy-audit.py                     # every shipped atlas in unit-atlases.json
  python3 scripts/unit-anatomy-audit.py aegis vargoth       # selected atlases
  python3 scripts/unit-anatomy-audit.py --cells DIR         # incoming 512px cells; DIR/000.png is the idle model
  ... --json OUT.json                                       # machine-readable report

Needs Pillow, NumPy and opencv-python-headless. It is a QA tool, not a CI gate: a flag is a reason to look at the
frames side by side at play size. Intended head turns, foreshortening, falls and squash poses can legitimately
flag; few inliers (back views, faces hidden by a shield, lying poses) mean "not measured", never "passed".
"""
import argparse, json, sys
from pathlib import Path
import numpy as np
from PIL import Image

try:
    import cv2
except ImportError:
    sys.exit('needs opencv-python-headless (pip install opencv-python-headless)')

ROOT = Path(__file__).resolve().parents[1]
UNITS = ROOT / 'public/assets/units'
TOLERANCE = .12   # head scale drift beyond +/-12% is visible at 390px play size
MIN_INLIERS = 12  # fewer RANSAC inliers: the frame is not measured


def atlas_cells(name, manifest):
    entry = manifest[name]
    atlas = json.loads((UNITS / entry['atlas']).read_text())
    image = Image.open(UNITS / entry['image']).convert('RGBA')
    cells = []
    for i in range(entry['frames']):
        f = atlas['frames'][str(i)]
        size, frame, at = f['sourceSize'], f['frame'], f['spriteSourceSize']
        cell = Image.new('RGBA', (size['w'], size['h']))
        cell.paste(image.crop((frame['x'], frame['y'], frame['x'] + frame['w'], frame['y'] + frame['h'])), (at['x'], at['y']))
        cells.append(cell)
    return cells


def gray(cell, zoom):
    a = np.asarray(cell.resize((cell.width * zoom, cell.height * zoom), Image.Resampling.LANCZOS)).astype(float)
    alpha = a[..., 3:] / 255
    return cv2.cvtColor((a[..., :3] * alpha + (1 - alpha) * 30).astype(np.uint8), cv2.COLOR_RGB2GRAY)


def audit(cells, head=.42, zoom=2):
    sift = cv2.SIFT_create()
    idle = gray(cells[0], zoom)
    left, top, right, bottom = cells[0].getbbox()
    mask = np.zeros_like(idle)
    mask[top * zoom:int((top + (bottom - top) * head) * zoom), left * zoom:right * zoom] = 255
    k0, d0 = sift.detectAndCompute(idle, mask)
    reference = cells[0].tobytes()
    rows = []
    for i, cell in enumerate(cells):
        box = cell.getbbox()
        row = {'frame': i, 'height': box[3] - box[1] if box else 0, 'scale': None, 'inliers': 0}
        if cell.tobytes() == reference:
            row.update(scale=1.0, inliers=len(k0), idle=True)
        else:
            k, d = sift.detectAndCompute(gray(cell, zoom), None)
            if d is not None and len(k) >= 4:
                good = [a for a, b in cv2.BFMatcher().knnMatch(d0, d, k=2) if a.distance < .75 * b.distance]
                if len(good) >= 6:
                    src = np.float32([k0[m.queryIdx].pt for m in good]); dst = np.float32([k[m.trainIdx].pt for m in good])
                    matrix, inliers = cv2.estimateAffinePartial2D(src, dst, ransacReprojThreshold=6)
                    if matrix is not None:
                        row.update(scale=round(float(np.hypot(matrix[0, 0], matrix[1, 0])), 3), inliers=int(inliers.sum()))
        # A collapsed fit (scale near 0, or doubled) is a degenerate match, not a measurement.
        measured = row['inliers'] >= MIN_INLIERS and row['scale'] is not None and .5 < row['scale'] < 2
        row['status'] = 'idle' if row.get('idle') else 'not-measured' if not measured else 'drift' if abs(row['scale'] - 1) > TOLERANCE else 'ok'
        rows.append(row)
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('names', nargs='*')
    parser.add_argument('--cells')
    parser.add_argument('--json')
    args = parser.parse_args()
    report = {}
    if args.cells:
        files = sorted(Path(args.cells).glob('*.png'))
        report[Path(args.cells).name] = audit([Image.open(f).convert('RGBA') for f in files])
    else:
        manifest = json.loads((ROOT / 'src/game/visuals/unit-atlases.json').read_text())
        for name in args.names or manifest:
            report[name] = audit(atlas_cells(name, manifest))
    failed = False
    for name, rows in report.items():
        drift = [r for r in rows if r['status'] == 'drift']
        failed |= bool(drift)
        measured = [r['scale'] for r in rows if r['status'] in ('ok', 'drift')]
        median = f'{np.median(measured):.3f}' if measured else '-'
        print(f"{name}: median head scale {median}; drift {[(r['frame'], r['scale']) for r in drift]}; "
              f"not measured {[r['frame'] for r in rows if r['status'] == 'not-measured']}")
    if args.json:
        Path(args.json).write_text(json.dumps({'tolerance': TOLERANCE, 'minInliers': MIN_INLIERS, 'report': report}, indent=1) + '\n')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
