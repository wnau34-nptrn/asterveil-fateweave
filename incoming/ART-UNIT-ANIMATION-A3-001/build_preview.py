"""Make review-only contact sheets; never modify raw art or produce runtime frames."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 10)
BG = (19, 29, 40, 255)
FG = (225, 233, 240, 255)
data = json.loads((ROOT / 'generation.json').read_text())
reports = []
overview = {}

for g in data['generations']:
    im = Image.open(ROOT / g['retainedOutput']).convert('RGBA')
    n = g['frames']
    # Whole-strip scaling only. Never resize individual poses or move their soles.
    # Reference first ready-pose height, manually excluding neighboring staff/cape.
    ready_bounds = {
        'seren-attack-r1': (214, 633), 'seren-attack-r2': (151, 608),
        'seren-heal-r1': (200, 615), 'seren-prayer-r1': (225, 688),
        'seren-sanctuary-r1': (129, 629), 'seren-hit-r1': (65, 673),
        'seren-block-r1': (77, 671), 'seren-down-r1': (96, 664),
        'hollow-mycon-cast-r1': (178, 574), 'hollow-mycon-cast-r2': (216, 622),
        'hollow-mycon-hit-r1': (117, 632), 'hollow-mycon-down-r1': (119, 630),
    }
    top, sole = ready_bounds[g['id']]
    seed_rise = 512 if g['id'].startswith('seren') else 460
    scale = (115 * seed_rise / 512) / (sole - top)
    strip = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    # Equal-width source windows are review crops, NOT production frame cuts.
    # Keep each window visible, so gutter/overlap defects remain reviewable.
    panels = (n + 1) // 2
    panel_h = max(185, strip.height + 22)
    sheet = Image.new('RGBA', (390, 58 + panels * panel_h + 28), BG)
    d = ImageDraw.Draw(sheet)
    d.text((12, 9), g['id'], font=FONT, fill=FG)
    d.text((12, 26), '390px art review | nominal 115px seed box', font=SMALL, fill=FG)
    d.text((12, 41), 'Equal source windows; NOT production frame cuts.', font=SMALL, fill=FG)
    for j in range(panels):
        y = 58 + j * panel_h
        for x in range(12, 378, 12):
            for yy in range(y, y + panel_h - 18, 12):
                shade = (31, 44, 56, 255) if ((x//12 + yy//12) % 2) else (25, 37, 49, 255)
                d.rectangle((x, yy, min(x+11, 377), min(yy+11, y+panel_h-19)), fill=shade)
        for k in range(2):
            frame = j * 2 + k
            if frame >= n:
                continue
            left, right = round(frame*strip.width/n), round((frame+1)*strip.width/n)
            crop = strip.crop((left, 0, right, strip.height))
            sheet.alpha_composite(crop, (12 + k*183 + (183-crop.width)//2, y))
            d.text((12+k*183, y+panel_h-16), f'Window {frame+1}/{n}', font=SMALL, fill=FG)
    d.text((12, sheet.height-20), 'Raw preserved. Owner selection / Claude intake pending.', font=SMALL, fill=FG)
    out = ROOT / 'preview' / (g['id'] + '-390.png')
    sheet.convert('RGB').save(out)
    reports.append({'id': g['id'], 'rawSize': list(im.size), 'mode': im.mode,
                    'alphaExtrema': list(im.getchannel('A').getextrema()),
                    'sha256': hashlib.sha256((ROOT/g['retainedOutput']).read_bytes()).hexdigest(),
                    'expectedFigures': n, 'layout': 'one horizontal row, left to right; irregular gutters',
                    'preview': str(out.relative_to(ROOT)), 'wholeStripPreviewScale': scale,
                    'firstPoseTopSole': [top, sole], 'normalizationAppliedToRaw': False})
    overview.setdefault(g['id'].split('-')[0], []).append(sheet.convert('RGB'))

for name, sheets in overview.items():
    board = Image.new('RGB', (390, sum(s.height for s in sheets)), BG[:3])
    y = 0
    for s in sheets:
        board.paste(s, (0, y)); y += s.height
    board.save(ROOT / 'preview' / (name + '-all-390.png'))

seeds = []
for f in sorted((ROOT/'seeds').glob('*.png')):
    seeds.append({'path': str(f.relative_to(ROOT)), 'sha256': hashlib.sha256(f.read_bytes()).hexdigest()})
(ROOT/'validation.json').write_text(json.dumps({'previewWidth': 390,
    'previewScaleNote': '115px = floor(390 * .295), width cap in field-layout.ts. Arena height may reduce this. Static art contact sheet, not an in-engine screenshot.',
    'seeds': seeds, 'strips': reports}, indent=2)+'\n')
print(f'Validated {len(reports)} RGBA strips; wrote 390px review sheets.')
