#!/usr/bin/env python3
"""Static art only. Rebuild retained generated sources; never writes outside this package.

python -I incoming/ART-CHAR-WORLDBOSS-001/build_handoff.py
python -I incoming/ART-CHAR-WORLDBOSS-001/build_handoff.py --verify
Requires Python 3 and Pillow 12.3.0. No generation API or numeric RNG seed is implied.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
BASE = '8f39dc8a6f6936d7861455e4580eb1f6ae7cf7c4'
RESAMPLE = Image.Resampling.LANCZOS


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def write(name, data):
    (ROOT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def bounds(im, threshold=32):
    return im.getchannel('A').point(lambda a: 255 if a > threshold else 0).getbbox()


def art_cell(key):
    manifest = json.loads((REPO / 'src/game/visuals/unit-atlases.json').read_text())
    entry = manifest[key]
    atlas_path = REPO / 'public/assets/units' / entry['atlas']
    image_path = REPO / 'public/assets/units' / entry['image']
    frame = json.loads(atlas_path.read_text())['frames']['0']
    size, rect, at = frame['sourceSize'], frame['frame'], frame['spriteSourceSize']
    cell = Image.new('RGBA', (size['w'], size['h']))
    with Image.open(image_path) as im:
        cut = im.convert('RGBA').crop((rect['x'], rect['y'], rect['x'] + rect['w'], rect['y'] + rect['h']))
    cell.paste(cut, (at['x'], at['y']))
    return cell, [atlas_path, image_path]


def fit_figure(cell, max_width, max_height):
    # Preview trimming only; seed pixels and source anchors remain authoritative.
    figure = cell.crop(bounds(cell, 8))
    ratio = min(max_width / figure.width, max_height / figure.height)
    return figure.resize((round(figure.width * ratio), round(figure.height * ratio)), RESAMPLE)


def panel(draw, rect, colour, fraction=1):
    x, y, w, h = rect
    draw.rounded_rectangle((x, y, x+w-1, y+h-1), radius=3, fill='#0c1429', outline='#b8a46c')
    draw.rectangle((x+2, y+3, x+2+round((w-5)*fraction), y+h-4), fill=colour)


def overlap_pixels(a, b):
    aa = a.getchannel('A').point(lambda v: 255 if v > 32 else 0)
    bb = b.getchannel('A').point(lambda v: 255 if v > 32 else 0)
    from PIL import ImageChops
    return ImageChops.multiply(aa, bb).histogram()[255]


def preview(seed, assets, boss_key=None, boss_width=172):
    # Art staging derived from four tactical columns (.115/.37/.63/.885).
    # Deliberately an offline mockup; not a screenshot or runtime geometry claim.
    with Image.open(REPO / 'public/assets/art/battle_riftline.webp') as bg:
        field = ImageOps.fit(bg.convert('RGBA'), (390, 570), method=RESAMPLE)
    out = Image.new('RGBA', (390, 844), '#0b1429')
    out.alpha_composite(field, (0, 118))
    draw = ImageDraw.Draw(out)
    draw.rounded_rectangle((10, 12, 379, 105), radius=14, fill='#15223d', outline='#887b61')
    # No letters or numbers in any delivered PNG, including mock UI.
    for i in range(7):
        draw.ellipse((22+i*51, 24, 58+i*51, 60), fill='#283b59', outline='#ac9459')
    panel(draw, (24, 77, 340, 13), '#bd83f4', .77)
    draw.rounded_rectangle((10, 700, 379, 832), radius=14, fill='#15223d', outline='#887b61')
    for i in range(3):
        draw.rounded_rectangle((24+i*117, 719, 130+i*117, 811), radius=9, fill='#263650', outline='#b7a16c')
        draw.ellipse((60+i*117, 742, 94+i*117, 776), fill='#86c7e6')
    # Five shipped heroes, proposed 2-front/3-back formation to reserve the boss silhouette.
    entries = [('eira', 45, 302, 57, 79), ('aegis', 144, 302, 61, 86),
               ('metta', 45, 490, 58, 81), ('seren', 45, 656, 56, 79),
               ('lyra', 144, 656, 62, 82),
               ('wisp', 345, 291, 39, 54), ('wisp', 345, 498, 39, 54),
               ('wisp', 345, 656, 39, 54), ('crawler', 246, 656, 64, 48)]
    layers, boxes, hp_rects = {}, {}, []
    for index, (key, x, sole, w, h) in enumerate(entries):
        fig = fit_figure(assets[key], w, h)
        xy = (round(x-fig.width/2), sole-fig.height)
        layer = Image.new('RGBA', out.size)
        layer.alpha_composite(fig, xy)
        ident = key + '-' + str(index)
        layers[ident] = layer
        boxes[ident] = [*xy, xy[0]+fig.width, sole]
        out.alpha_composite(layer)
        rect = (max(2, x-26), sole+6, 52, 11)
        hp_rects.append(rect)
        panel(draw, rect, '#74cbd9' if index < 5 else '#d78ab8', .85)
    # Keep complete width clear of front heroes and the b3 wisp; ~220px tall read-test is separate.
    # C's lower cloak sweeps toward b3; give that variant a narrower 160px footprint.
    fig = fit_figure(seed, boss_width, 220)
    if boss_key:
        fig = fit_figure(seed, 125, 116)
    boss_x, sole = 246, 510
    xy = (round(boss_x-fig.width/2), sole-fig.height)
    boss_layer = Image.new('RGBA', out.size)
    boss_layer.alpha_composite(fig, xy)
    out.alpha_composite(boss_layer)
    rect = (205, 526, 82, 13)
    hp_rects.append(rect)
    panel(draw, rect, '#d7a5ee', .72)
    hp_mask = Image.new('RGBA', out.size)
    hp_draw = ImageDraw.Draw(hp_mask)
    for x, y, w, h in hp_rects:
        hp_draw.rectangle((x, y, x+w-1, y+h-1), fill='white')
    overlaps = {name: overlap_pixels(boss_layer, layer) for name, layer in layers.items()}
    return out, {'kind': 'offline art mockup, not in-game capture', 'canvas': [390, 844],
        'f1_sole_xy': [boss_x, sole], 'boss_bbox_xyxy': [*xy, xy[0]+fig.width, sole],
        'boss_painted_size_px': list(fig.size), 'other_actor_bounds': boxes,
        'hp_rects_xywh': hp_rects, 'boss_overlaps_actor_pixels_alpha_gt32': overlaps,
        'boss_overlaps_hp_pixels_alpha_gt32': overlap_pixels(boss_layer, hp_mask),
        'tactical_columns': [.115, .37, .63, .885],
        'staging': 'f1 center; f2 crawler bottom; b1/b3/b2 wisps top/middle/bottom; five heroes in proposed 2-front/3-back formation',
        'runtime_limitation': 'Pixel row spacing and enlarged art scale are proposed for concept comparison. Current fieldSlots is not executed or changed.'}


def verify():
    report = json.loads((ROOT / 'validation.json').read_text())
    actual = {p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and p.name != 'validation.json' and '__pycache__' not in p.parts}
    assert actual == set(report['files']), (actual - set(report['files']), set(report['files']) - actual)
    images = 0
    for name, record in report['files'].items():
        p = ROOT / name
        assert sha(p) == record['sha256'], name
        assert p.stat().st_size == record['bytes'], name
        if p.suffix == '.png':
            with Image.open(p) as im:
                im.load()
                assert im.format == 'PNG' and list(im.size) == record['size'] and im.mode == record['mode'], name
                images += 1
    for key, record in json.loads((ROOT / 'seeds.json').read_text())['variants'].items():
        with Image.open(ROOT / f'seed-{key}.png') as im:
            assert im.size == (1024, 1024) and im.mode == 'RGBA'
            assert im.getchannel('A').getextrema() == (0, 255)
            alpha_hist = im.getchannel('A').histogram()
            assert alpha_hist[0] > 400000 and sum(alpha_hist[1:255]) > 1000
            b = bounds(im)
            assert 894 <= b[3]-1 <= 898, (key, b)
            for threshold in (0, 32):
                left, top, right, bottom = bounds(im, threshold)
                assert left >= 32 and top >= 32 and right <= 992 and bottom <= 992
            assert list(b) == record['alpha_gt32_bbox_xyxy']
        proof = report['preview_checks'][key]
        assert proof['boss_overlaps_hp_pixels_alpha_gt32'] == 0
        assert not any(proof['boss_overlaps_actor_pixels_alpha_gt32'].values()), proof
        assert proof['boss_painted_size_px'][1] > max(x['boss_painted_size_px'][1] for x in report['baseline_previews'].values())
    print(f'PASS: {len(actual)} SHA-256/byte lengths; {images} PNG full decodes; three real-alpha left-facing seed margins/sole lines; preview masks.')
    print('Facing, anatomy and absence of lettering are visual reviews, not inferred from alpha checks. Owner selection remains pending.')


def build():
    sources = ['docs/design/WORLD_BOSS_P11_04_TH.md', 'docs/LORE_CHAPTER1_TH.md',
        'src/content/encounters/catalog.ts', 'src/game/visuals/unit-frames.ts',
        'src/game/visuals/field-layout.ts', 'src/game/visuals/unit-atlases.json',
        'incoming/ART-UNIT-ANIMATION-A9-001/sentinel-preview.png',
        'incoming/ART-UNIT-ANIMATION-A9-001/captain-preview.png',
        'incoming/ART-UNIT-ANIMATION-A9-001/preview-390.png',
        'public/assets/art/battle_riftline.webp']
    refs = {p: sha(REPO/p) for p in sources}
    assets = {}
    for key in ['aegis', 'lyra', 'eira', 'seren', 'metta', 'wisp', 'crawler', 'sentinel', 'captain']:
        assets[key], paths = art_cell(key)
        refs.update({p.relative_to(REPO).as_posix(): sha(p) for p in paths})
    variants, checks, baselines = {}, {}, {}
    for key in ['sentinel', 'captain']:
        pic, metadata = preview(assets[key], assets, boss_key=key)
        pic.save(ROOT / f'baseline-390-{key}.png', compress_level=9)
        baselines[key] = metadata
    proof = Image.new('RGBA', (390, 844), '#111b32')
    for i, key in enumerate('abc'):
        src = Image.open(ROOT / f'source/seed-{key}-original.png').convert('RGBA')
        significant = bounds(src)
        # Uniform scale: never stretch proportions, redraw, mirror or cut a hand/wing.
        scale = min(840/(significant[2]-significant[0]), 760/(significant[3]-significant[1]))
        cleaned = src.copy()
        cleaned.putalpha(src.getchannel('A').point(lambda v: 0 if v <= 8 else v))
        sized = cleaned.resize((round(src.width*scale), round(src.height*scale)), RESAMPLE)
        x = round(512 - (significant[0]+significant[2])/2*scale)
        y = round(896 - (significant[3]-1)*scale)
        assert x >= 0 and y >= 0 and x+sized.width <= 1024 and y+sized.height <= 1024
        seed = Image.new('RGBA', (1024, 1024))
        seed.alpha_composite(sized, (x, y))
        seed.save(ROOT / f'seed-{key}.png', compress_level=9)
        # Concept = same exact model on a plain background, no added illustration elements.
        concept = Image.new('RGBA', (2048, 2048), '#111b32')
        concept.alpha_composite(seed.resize((2048, 2048), RESAMPLE))
        concept.save(ROOT / f'concept-{key}.png', compress_level=9)
        pic, metadata = preview(seed, assets, boss_width=160 if key == 'c' else 172)
        pic.save(ROOT / f'preview-390-{key}.png', compress_level=9)
        checks[key] = metadata
        readtest = fit_figure(seed, 350, 220)
        proof.alpha_composite(readtest, (round((390-readtest.width)/2), 30+i*274))
        variants[key] = {'file': f'seed-{key}.png', 'source': f'source/seed-{key}-original.png',
            'frame_size': [1024, 1024], 'facing': 'left', 'pose': 'static combat ready',
            'sole_xy': [512, 896], 'anchor_type': 'lowest cloak tip, virtual sole' if key == 'c' else 'feet',
            'source_alpha_gt32_bbox_xyxy': list(significant), 'uniform_scale': scale,
            'paste_xy': [x, y], 'source_sole_y': significant[3]-1,
            'alpha_cleanup': 'alpha <=8 removed as generator haze; remaining values preserved before Lanczos resize',
            'alpha_gt32_bbox_xyxy': list(bounds(seed)), 'alpha_gt0_bbox_xyxy': list(bounds(seed, 0)),
            'concept': {'size': [2048, 2048], 'method': '2x normalized seed over plain navy; not native 2048 generation'},
            'turnaround_views_left_to_right': ['front', 'left side', 'back'],
            'seed_priority': 'Seed controls final anatomy and ornament placement if turnaround paint differs.'}
    proof.save(ROOT / 'silhouette-220-390.png', compress_level=9)
    write('seeds.json', {'schema': 1, 'base_commit': BASE, 'variants': variants,
        'reference_sha256': refs, 'reference_discrepancy': 'A9 preview-390.png is a 390x914 signature pose contact sheet, not a battle screenshot and contains no heroes. New previews use shipped atlas frame 0 for the five actual heroes and companions.',
        'generation_random_seeds': None, 'owner_selection': None})
    report = {'schema': 1, 'task': ROOT.name, 'base_commit': BASE,
        'validation_self_excluded': True, 'self_hash_receipt': 'SHA-256 of validation.json must be recorded outside this manifest (PR body). A cryptographic manifest cannot hash itself.',
        'preview_checks': checks, 'baseline_previews': baselines,
        'visual_review': {'left_facing': 'reviewed all 3 seeds', 'full_body': 'reviewed: 2 feet A, 4 paws/2 wings/tail B, 6 arms/3 cloak tips C', 'lettering': 'no visible lettering in generated art or mockups', 'turnarounds': 'front/left/back reviewed; orthographic paint guidance, not exact mesh projections', 'owner_approval': 'pending; no test or CI result is approval'},
        'runtime_testing': 'Not integrated. No animations, game launch, runtime screenshots or motion approval claimed.', 'files': {}}
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name == 'validation.json' or '__pycache__' in p.parts:
            continue
        record = {'sha256': sha(p), 'bytes': p.stat().st_size}
        if p.suffix == '.png':
            with Image.open(p) as im:
                im.load()
                record.update(size=list(im.size), mode=im.mode)
        report['files'][p.relative_to(ROOT).as_posix()] = record
    write('validation.json', report)
    verify()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    verify() if args.verify else build()
