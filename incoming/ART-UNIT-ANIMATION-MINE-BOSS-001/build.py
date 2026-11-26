"""Rebuild the R1 motion sample. Inputs and outputs are independent of game runtime."""
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


def normalize_fist():
    idle = Image.open(ROOT / 'seeds/giant-r1.png').convert('RGBA')
    assert idle.size == (CELL, CELL) and idle.getbbox()[3] == BASELINE
    raw = np.array(Image.open(ROOT / 'raw/crystal-fist.png').convert('RGBA'))
    n, labels, stats, centers = cv2.connectedComponentsWithStats((raw[..., 3] > 70).astype(np.uint8), 8)
    major = sorted((i for i in range(1, n) if stats[i, -1] > 10000), key=lambda i: centers[i, 0])
    assert len(major) == 4
    poses = []
    for i in major:
        pixels = raw.copy()
        mask = cv2.dilate((labels == i).astype(np.uint8), np.ones((7, 7), np.uint8))
        pixels[..., 3] *= mask
        poses.append(crop_body(Image.fromarray(pixels)))
    scale = min(572 / np.median([pose.height for pose in poses]), (CELL - 28) / max(p.width for p in poses))
    reference = (idle.getbbox()[0] + idle.getbbox()[2]) // 2
    cells = []
    for i, pose in enumerate(poses):
        box = pose.crop((0, int(pose.height * .82), pose.width, pose.height)).getbbox()
        pose_scale = scale * 1.065 if i == 0 else scale
        x = round(reference - (box[0] + box[2]) / 2 * pose_scale)
        body = pose.resize((round(pose.width * pose_scale), round(pose.height * pose_scale)), Image.Resampling.LANCZOS)
        cell = Image.new('RGBA', (CELL, CELL))
        x = max(14, min(x, CELL - 14 - body.width))
        cell.alpha_composite(body, (x, BASELINE - body.height))
        l, t, r, b = cell.getbbox()
        assert l > 10 and t > 10 and r < CELL - 10 and b == BASELINE, (i, l, t, r, b)
        cells.append(cell)
    idle.save(FRAMES / '000.png')
    strip = Image.new('RGBA', (CELL * 4, CELL))
    for i, cell in enumerate(cells, 1):
        cell.save(FRAMES / f'{i:03d}.png')
        strip.alpha_composite(cell, ((i - 1) * CELL, 0))
    strip.save(ROOT / 'crystal-fist.png')
    fragment = Image.open(ROOT / 'seeds/fragment.png')
    assert fragment.size == (512, 512) and fragment.getbbox()[3] == 497
    fragment.save(ROOT / 'fragment-idle.png')
    return [idle, *cells]


def vfx():
    # Faceted plates, leaving the head and central read clear for the battle HUD.
    plates = [
        [(31, 100), (63, 69), (85, 103), (69, 163), (43, 181), (21, 132)],
        [(171, 103), (193, 69), (225, 100), (235, 132), (213, 181), (187, 163)],
        [(59, 187), (89, 152), (105, 168), (100, 199), (78, 221), (56, 213)],
        [(151, 168), (167, 152), (197, 187), (200, 213), (178, 221), (156, 199)],
    ]
    names = ['armor-lift', 'armor-crack-1', 'armor-break', 'split-release']
    for phase, name in enumerate(names):
        img = Image.new('RGBA', (512, 512))
        draw = ImageDraw.Draw(img)
        def facet(vertices, center, colors):
            for i, point in enumerate(vertices):
                tri = [center, point, vertices[(i + 1) % len(vertices)]]
                draw.polygon([(x * 2, y * 2) for x, y in tri], fill=colors[i % len(colors)])
            outline = [*vertices, vertices[0]]
            draw.line([(x * 2, y * 2) for x, y in outline], fill=(138, 240, 201, 188), width=3, joint='curve')

        greens = [(29, 139, 109, 188), (49, 191, 143, 175), (9, 91, 76, 207),
                  (66, 207, 158, 184), (26, 112, 91, 185)]
        if phase < 2:
            for poly in plates:
                center = tuple(sum(p[i] for p in poly) // len(poly) for i in (0, 1))
                facet(poly, center, greens)
            if phase == 1:
                crack = [(32, 101), (49, 112), (43, 123), (68, 134), (56, 153), (63, 167)]
                draw.line([(x * 2, y * 2) for x, y in crack], fill='#d4ffdc', width=5, joint='curve')
                draw.line([(x * 2 + 3, y * 2 + 2) for x, y in crack], fill='#143d38', width=2)
        else:
            shards = ([(42, 77), (209, 73), (25, 131), (228, 131), (49, 186), (206, 202),
                       (84, 218), (176, 223)] if phase == 2 else [(53, 79), (201, 64), (28, 93), (221, 87)])
            for i, (x, y) in enumerate(shards):
                s = 1 + i % 3 * .27
                if phase == 3 and i < 2:
                    s *= 1.7
                facet([(x - 6 * s, y + 12 * s), (x + 4 * s, y - 12 * s),
                       (x + 10 * s, y - 4 * s), (x + 5 * s, y + 9 * s)], (x + 3, y), greens)
        img.resize((256, 256), Image.Resampling.LANCZOS).save(FX / f'{name}.png')
    return names


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


def preview(cells, names):
    still = scene(cells[0], fragments=True)
    still.save(PREVIEW / 'field-390.png')
    shots = [scene(cell) for cell in cells]
    shots[0].save(PREVIEW / 'crystal-fist-390.gif', save_all=True, append_images=shots[1:],
                  duration=[650, 130, 120, 95, 235], loop=0, disposal=2)
    band_heights = [231, 231, 231, 422]
    board = Image.new('RGB', (390, sum(band_heights)), '#252c32')
    for i, name in enumerate(names):
        shot = scene(cells[0], name, fragments=i == 3)
        shot.save(PREVIEW / f'{name}-390.png')
        top = 226 if name == 'split-release' else 278
        board.paste(shot.crop((0, top, 390, top + band_heights[i])), (0, sum(band_heights[:i])))
    board.save(PREVIEW / 'vfx-storyboard-390.png')

    scale = Image.new('RGB', (390, 3 * 205), '#3d434c')
    for i, (unit, height) in enumerate([
        (Image.open(SOURCES / 'stone-golem.png'), 126), (cells[0], round(126 * 1.32)),
        (Image.open(SOURCES / 'water-spirit.png'), 131),
    ]):
        actor(scale, unit, 195, 182 + i * 205, height)
    scale.save(PREVIEW / 'scale-390.png')


def main():
    for directory in (FRAMES, FX, PREVIEW):
        directory.mkdir(exist_ok=True)
    cells = normalize_fist()
    names = vfx()
    preview(cells, names)
    write_metadata('strips.json', {
        'giant': {'logicalCell': 768, 'footY': 672, 'idle': 'frames/000.png', 'heightVsStoneGolem': 1.32,
                  'strips': [{'move': 'Crystal Fist', 'path': 'crystal-fist.png', 'firstFrame': 1, 'count': 4,
                              'beats': ['windup', 'brace', 'impact', 'follow-through'], 'durationMs': [130, 120, 95, 235]}]},
        'fragment': {'logicalCell': 512, 'footY': 497, 'idle': 'fragment-idle.png'},
        'effects': [{'file': f'vfx/{name}.png', 'cell': 256, 'anchor': [.5, .5], 'suggestedMs': duration}
                    for name, duration in zip(names, [180, 140, 220, 170])],
    })
    manifest(phase='4a only', logicalCell=CELL, footY=BASELINE, bodyFrames=len(cells), effects=names)


if __name__ == '__main__':
    main()
