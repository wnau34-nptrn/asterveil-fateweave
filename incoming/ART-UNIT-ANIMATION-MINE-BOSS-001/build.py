"""Build the R1 motion and VFX package. Inputs and outputs are independent of game runtime."""
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

from manifest import ROOT, manifest, write_metadata

SOURCES = ROOT / 'sources'
PREVIEW = ROOT / 'preview'
FRAMES = ROOT / 'frames'
FX = ROOT / 'vfx'
BASELINE = 672
CELL = 768


def crop_body(image, box=None):
    crop = image.convert('RGBA')
    if box is not None:
        crop = crop.crop(box)
    alpha = np.array(crop.getchannel('A'))
    alpha[alpha < 36] = 0
    crop.putalpha(Image.fromarray(alpha))
    return crop.crop(crop.getbbox())


def poses_from_sheet(path, count):
    raw = np.array(Image.open(path).convert('RGBA'))
    if np.mean(raw[..., 3] < 85) < .08:
        # The fragment fall sheet came back with a white matte.
        rgb = raw[..., :3].copy()
        seed = np.uint8((rgb.mean(axis=2) < 225) | (np.ptp(rgb, axis=2) > 23))
        seed = cv2.morphologyEx(seed, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        mask = np.full(seed.shape, cv2.GC_BGD, np.uint8)
        mask[cv2.dilate(seed, np.ones((9, 9), np.uint8)) != 0] = cv2.GC_PR_BGD
        mask[seed != 0] = cv2.GC_PR_FGD
        mask[cv2.erode(seed, np.ones((9, 9), np.uint8)) != 0] = cv2.GC_FGD
        bg = np.zeros((1, 65), np.float64)
        fg = bg.copy()
        cv2.grabCut(rgb, mask, None, bg, fg, 2, cv2.GC_INIT_WITH_MASK)
        raw[..., 3] = cv2.GaussianBlur((mask % 2 * 255).astype(np.uint8), (3, 3), .55)
    support = (raw[..., 3] > 85).astype(np.uint8)
    n, labels, stats, centers = cv2.connectedComponentsWithStats(support, 8)
    order = sorted(range(1, n), key=lambda i: stats[i, -1], reverse=True)
    assert len(order) >= count
    major = sorted(order[:count], key=lambda i: centers[i, 0])
    assert stats[major, -1].min() > 3500, path
    poses = []
    for i in major:
        selection = cv2.dilate((labels == i).astype(np.uint8), np.ones((5, 5), np.uint8))
        pixels = raw.copy()
        pixels[..., 3] *= selection
        poses.append(crop_body(Image.fromarray(pixels)))
    return poses


def body_strip(key, name, count, cell, foot, idle, start, folder, corrections):
    poses = poses_from_sheet(ROOT / 'raw' / f'{key}.png', count)
    bbox = idle.getbbox()
    standing = bbox[3] - bbox[1]
    height = standing * (.83 if key.endswith('down') else 1)
    nominal = height / np.median([pose.height for pose in poses])
    scales = corrections.get(key, [1] * count)
    nominal = min(nominal, (cell - 22) / max(p.width for p in poses),
                  (foot - 10) / max(p.height for p in poses))
    result = []
    sheet = Image.new('RGBA', (count * cell, cell))
    for i, (pose, adjustment) in enumerate(zip(poses, scales, strict=True)):
        ratio = min(nominal * adjustment, (cell - 22) / pose.width, (foot - 10) / pose.height)
        body = crop_body(pose.resize((round(pose.width * ratio), round(pose.height * ratio)), Image.Resampling.LANCZOS))
        soles = body.crop((0, int(body.height * .82), body.width, body.height)).getbbox()
        x = round((bbox[0] + bbox[2]) / 2 - (soles[0] + soles[2]) / 2)
        x = max(10, min(x, cell - 10 - body.width))
        frame = Image.new('RGBA', (cell, cell))
        frame.alpha_composite(body, (x, foot - body.height))
        assert frame.getbbox()[3] == foot and frame.getbbox()[1] >= 8, (key, i)
        frame.save(folder / f'{start + i:03d}.png')
        sheet.paste(frame, (i * cell, 0))
        result.append(frame)
    path = 'crystal-fist.png' if key == 'fist' else f'{key.replace("_", "-")}.png'
    sheet.save(ROOT / path)
    beats, timing = {
        4: (['windup', 'brace', 'impact', 'follow-through'], [130, 120, 95, 235]),
        2: (['recoil', 'settle'], [95, 150]),
        3: (['buckle', 'fall', 'rest'], [140, 180, 500]),
    }[count]
    return result, dict(move=name, path=path, source=f'raw/{key}.png', firstFrame=start, count=count,
                        beats=beats, durationMs=timing, returnToIdle=count == 4)


def backdrop():
    im = Image.open(SOURCES / 'bg_mine.webp').convert('RGB')
    view_w, view_h = 390, 844
    x, y, w, h = 6, 170, 378, 477
    ax, ay = x + w / 2, y + h * .27
    scale = max(w / 1536, h / 768, ax / 768, (view_w - ax) / 768,
                ay / (1024 * .45), (view_h - ay) / (1024 * .55))
    left, top = ax - 768 * scale, ay - 1024 * .45 * scale
    return im.transform((view_w, view_h), Image.Transform.AFFINE,
                        (1 / scale, 0, -left / scale, 0, 1 / scale, -top / scale),
                        Image.Resampling.BICUBIC)


def actor(stage, frame, x, bottom, height):
    body = crop_body(frame)
    body = body.resize((round(body.width * height / body.height), height), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(stage)
    draw.ellipse((x - 19, bottom - 5, x + 19, bottom + 4), fill='#272629')
    stage.paste(body, (x - body.width // 2, bottom - height), body)


def scene(cell, effect=None, fragments=False):
    stage = backdrop()
    # Reference geometry is the measured phone field in PR #349.
    allies = [(47, 272), (136, 272), (49, 491), (53, 614), (139, 614)]
    for i, (x, y) in enumerate(allies):
        actor(stage, Image.open(SOURCES / f'actor-0-{i}.png'), x, y, 78)
    # Draw all cels from the same logical pivot, including the extended fist.
    giant_scale = round(126 * 1.32) / 572
    logical_size = round(CELL * giant_scale)
    displayed = cell.resize((logical_size, logical_size), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(stage)
    draw.ellipse((264, 482, 302, 491), fill='#272629')
    stage.paste(displayed, (283 - logical_size // 2, 487 - round(BASELINE * giant_scale)), displayed)
    if fragments:
        for x, y in [(239, 605), (239, 272)]:
            actor(stage, Image.open(ROOT / 'fragment-idle.png'), x, y, 36)
    if effect:
        layer = Image.open(FX / (effect + '.png')).resize((192, 192), Image.Resampling.LANCZOS)
        stage.paste(layer, (187, 306), layer)
        if effect == 'split-release':
            draw = ImageDraw.Draw(stage)
            for x, y in [(239, 578), (239, 248)]:
                draw.polygon([(x - 6, y), (x + 4, y - 11), (x + 8, y + 1), (x, y + 9)], fill='#5bd3a5')
    draw = ImageDraw.Draw(stage)
    for x, y in allies + [(283, 487)] + ([(239, 605), (239, 272)] if fragments else []):
        draw.rounded_rectangle((x - 24, y + 7, x + 24, y + 11), 2, fill='#76d3b8')
    return stage


GIANT = [('fist', 'Crystal Fist', 4), ('beam', 'Shard Beam', 4),
         ('collapse', 'Crystal Collapse', 4), ('armor', 'Crystal Armor', 4),
         ('split', 'Crystal Split', 4), ('hit', 'Hit', 2), ('down', 'Down', 3)]
FRAGMENT = [('prick', 'Shard Prick', 4), ('frag_hit', 'Hit', 2), ('frag_down', 'Down', 3)]
ALLIES = [(47, 272), (136, 272), (49, 491), (53, 614), (139, 614)]


def effects_4b():
    effects = [
        ('armor-lift', ['armor-lift'], [180], 'boss-center', [.5, .5]),
        ('armor-cracks', ['armor-crack-1', 'armor-crack-2', 'armor-crack-3'], [140, 140, 140], 'boss-center', [.5, .5]),
        ('armor-break', ['armor-break'], [220], 'boss-center', [.5, .5]),
        ('armor-fade', [f'armor-fade-{i}' for i in range(3)], [110, 130, 160], 'boss-center', [.5, .5]),
        ('split-release', ['split-release'], [170], 'boss-center', [.5, .5]),
        ('reflect', [f'reflect-{i}' for i in range(3)], [100, 130, 150], 'caster-center', [.16, .5]),
        ('collapse', [f'collapse-{i}' for i in range(3)], [270, 135, 180], 'target-feet', [.5, .83]),
    ]
    for level in (2, 3):
        image = Image.open(FX / 'armor-crack-1.png').convert('RGBA')
        painter = ImageDraw.Draw(image)
        fractures = [[(222, 101), (205, 110), (207, 123), (191, 134), (200, 157)],
                     [(80, 158), (82, 173), (72, 179), (77, 191), (65, 205)],
                     [(171, 158), (180, 175), (173, 184), (185, 203)]]
        for points in fractures[:1 if level == 2 else 3]:
            painter.line([(x + 2, y + 1) for x, y in points], fill='#163d37', width=4)
            painter.line(points, fill='#b8f6d0', width=2)
        image.save(FX / f'armor-crack-{level}.png')
    armor = Image.open(FX / 'armor-lift.png').convert('RGBA')
    for i, opacity in enumerate((.75, .42, .12)):
        image = armor.copy()
        image.putalpha(armor.getchannel('A').point(lambda a: round(a * opacity)))
        image.save(FX / f'armor-fade-{i}.png')

    for i in range(3):
        image = Image.new('RGBA', (512, 512))
        draw = ImageDraw.Draw(image)
        wire = [(440, 245), (383, 236), (326, 259), (267, 239), (209, 265), (151, 247), (102, 256)]
        trail = (wire[:4], wire, wire[-4:])[i]
        draw.line(trail, fill=(29, 138, 109, (120, 200, 100)[i]), width=(6, 12, 7)[i], joint='curve')
        draw.line(trail, fill=(179, 244, 207, (185, 248, 125)[i]), width=3, joint='curve')
        x, y = trail[-1]
        draw.polygon([(x - 21, y), (x + 4, y - 12), (x + 9, y), (x + 4, y + 10)],
                     fill=(134, 248, 204, (185, 240, 105)[i]))
        image.resize((256, 256), Image.Resampling.LANCZOS).save(FX / f'reflect-{i}.png')

        image = Image.new('RGBA', (512, 512))
        draw = ImageDraw.Draw(image)
        warn = [(256, 385), (332, 432), (180, 432), (256, 385)]
        if i == 0:
            draw.polygon(warn, fill=(202, 113, 54, 35))
            draw.line(warn, fill='#ffc47e', width=6, joint='curve')
        else:
            dx, dy, size = (246, 193, 1) if i == 1 else (249, 333, .78)
            def shard(x, y, scale, angle):
                # Hand laid facets share the emerald palette of the existing shields.
                points = [(-33, -50), (12, -56), (42, -18), (22, 67), (-25, 43)]
                poly = [(round(x + (a + angle * b) * scale), round(y + b * scale)) for a, b in points]
                for j, tint in enumerate(('#26896d', '#73dea9', '#1d6958', '#114940', '#42ae8d')):
                    draw.polygon([poly[j], poly[(j + 1) % 5], (x, y)], fill=tint)
                draw.line(poly + poly[:1], fill='#8be5bc', width=2)
            shard(dx, dy, size, .32)
            if i == 1:
                draw.line([(281, 34), (267, 100)], fill=(170, 223, 200, 150), width=4)
                draw.line([(311, 64), (298, 122)], fill=(170, 223, 200, 96), width=3)
            if i == 2:
                for x, y, scale, angle in ((177, 384, .43, -.6), (313, 381, .46, .5), (354, 419, .19, .7)):
                    shard(x, y, scale, angle)
                draw.arc((148, 388, 364, 464), 0, 180, fill='#95dcc0', width=5)
        image.resize((256, 256), Image.Resampling.LANCZOS).save(FX / f'collapse-{i}.png')
    (FX / 'collapse-reduced.png').write_bytes((FX / 'collapse-2.png').read_bytes())
    return [dict(name=name, frames=[f'vfx/{p}.png' for p in paths], cell=256, anchor=anchor,
                 anchorRole=role, durationMs=timing) for name, paths, timing, role, anchor in effects]


def place_effect(stage, path, at, size, anchor, slope=0):
    layer = Image.open(ROOT / path).resize(size, Image.Resampling.LANCZOS)
    if slope:
        layer = layer.transform(size, Image.Transform.AFFINE, (1, 0, 0, -slope, 1, slope * anchor[0] * size[0]),
                                Image.Resampling.BICUBIC)
    xy = tuple(round(p - a * span) for p, a, span in zip(at, anchor, size, strict=True))
    stage.paste(layer, xy, layer)


def storyboards(idle, split_impact, effects):
    panels = []
    for effect in effects:
        kind = effect['name']
        for i, path in enumerate(effect['frames']):
            stage = scene(idle, fragments=kind == 'split-release')
            if kind == 'collapse':
                for x, y in ALLIES:
                    # Ground cue, falling shard or local impact, behind the HP band.
                    place_effect(stage, path, (x, y - 4), (66, 82), effect['anchor'])
                view = stage.crop((0, 187, 390, 634))
            elif kind == 'reflect':
                # Direction is right-to-left, with the end just beside the caster.
                place_effect(stage, path, (49, 452), (328, 112), effect['anchor'], slope=-.18)
                view = stage.crop((0, 301, 390, 506))
            else:
                is_split = kind == 'split-release'
                shot = scene(split_impact if is_split else idle, Path(path).stem, fragments=is_split)
                view = shot.crop((0, 234 if kind == 'split-release' else 278, 390,
                                  629 if kind == 'split-release' else 508))
            panels.append((f'{kind}  {i + 1} / {len(effect["frames"])}', view))
    reduced = scene(idle)
    for x, y in ALLIES:
        place_effect(reduced, 'vfx/collapse-reduced.png', (x, y - 4), (66, 82), [.5, .83])
    panels.append(('collapse · reduced motion', reduced.crop((0, 187, 390, 634))))
    for label, image in panels:
        box = Image.new('RGB', (390, image.height + 24), '#252c32')
        ImageDraw.Draw(box).text((8, 5), label, fill='#e6faf5')
        box.paste(image, (0, 24))
        yield box


def main():
    idle = Image.open(FRAMES / '000.png').convert('RGBA')
    fragment = Image.open(ROOT / 'fragment-idle.png').convert('RGBA')
    stage_fragment = FRAMES / 'fragment'
    stage_fragment.mkdir(exist_ok=True)
    (stage_fragment / '000.png').write_bytes((ROOT / 'fragment-idle.png').read_bytes())
    corrections = json.loads((ROOT / 'pose-scale.json').read_text())
    units = {}
    for unit, moves, cell, foot, seed, folder in (
        ('giant', GIANT, 768, 672, idle, FRAMES), ('fragment', FRAGMENT, 512, 497, fragment, stage_fragment),
    ):
        strips = []
        frame_index = 1
        for key, intent, count in moves:
            cells, info = body_strip(key, intent, count, cell, foot, seed, frame_index, folder, corrections)
            strips.append(info)
            frame_index += count
            if unit == 'giant':
                shots = [scene(sprite, fragments=key == 'split' and i >= 3)
                         for i, sprite in enumerate([seed, *cells, seed])]
            else:
                shots = [scene(idle) for _ in range(count + 2)]
                for shot, sprite in zip(shots, [seed, *cells, seed], strict=True):
                    display = sprite.resize((50, 50), Image.Resampling.LANCZOS)
                    for x, y in [(239, 605), (239, 272)]:
                        shot.paste(display, (x - 25, y - round(foot * 50 / cell)), display)
                        ImageDraw.Draw(shot).rounded_rectangle((x - 24, y + 7, x + 24, y + 11), 2, fill='#76d3b8')
            shots[0].save(PREVIEW / (Path(info['path']).stem + '-390.gif'), save_all=True,
                          append_images=shots[1:], duration=[500, *info['durationMs'], 360], loop=0, disposal=2)
        units[unit] = dict(logicalCell=cell, footY=foot, facing='left',
                           idle=str((folder / '000.png').relative_to(ROOT)), frames=frame_index, strips=strips)
    units['giant']['heightVsStoneGolem'] = 1.32
    effects = effects_4b()
    next(e for e in effects if e['name'] == 'reflect')['sourceUv'] = [.86, .48]
    scene(idle, fragments=True).save(PREVIEW / 'field-390.png')
    split = next(move for move in units['giant']['strips'] if move['move'] == 'Crystal Split')
    split_impact = Image.open(FRAMES / f'{split["firstFrame"] + 2:03d}.png')
    panels = list(storyboards(idle, split_impact, effects))
    board = Image.new('RGB', (390, sum(p.height for p in panels)))
    y = 0
    for image in panels:
        board.paste(image, (0, y))
        y += image.height
    board.save(PREVIEW / 'vfx-storyboard-390.png')
    write_metadata('strips.json', dict(units, effects=effects, reducedMotion={
        'collapse': {'file': 'vfx/collapse-reduced.png', 'anchor': [.5, .83], 'holdMs': 220},
    }))
    script = ROOT.parents[1] / 'scripts/unit-anatomy-audit.py'
    for folder, report in ((FRAMES, 'anatomy.json'), (stage_fragment, 'anatomy-fragment.json')):
        subprocess.run([sys.executable, str(script), '--cells', str(folder), '--json', str(ROOT / report)], check=True)
    manifest(phase='4b', logicalCell=CELL, footY=BASELINE, bodyFrames=units['giant']['frames'],
             fragmentFrames=units['fragment']['frames'], effects=[e['name'] for e in effects])


if __name__ == '__main__':
    main()
