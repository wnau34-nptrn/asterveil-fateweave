"""Normalize approved Water Spirit source sheets to the Moon Lake body frame contract."""

import hashlib
import json
from pathlib import Path
from statistics import median
import sys

from PIL import Image, ImageDraw, ImageFont

PACKAGE = Path(__file__).resolve().parent
CELL = 1024
GROUND = 896
GUTTER = 80
IDLE_HEIGHT = 500
BODY_CENTRE = 557
BEATS = ('wind-up', 'anticipation', 'contact', 'follow-through')


def open_sprite(path):
    with Image.open(path) as source:
        source.load()
        assert source.mode == 'RGBA' and source.getchannel('A').getextrema() == (0, 255), path
        return source.copy()


def alpha_box(image):
    return image.getchannel('A').point(lambda alpha: 255 if alpha >= 24 else 0).getbbox()


def place(sprite, scale, centre):
    bounds = alpha_box(sprite)
    assert bounds is not None, 'Empty pose'
    sprite = sprite.crop(bounds)
    sprite = sprite.resize((round(sprite.width * scale), round(sprite.height * scale)), Image.Resampling.LANCZOS)
    left = round(centre - sprite.width / 2)
    top = GROUND - sprite.height
    assert 0 <= left < left + sprite.width <= CELL and top >= 0, 'Pose exceeds logical canvas'
    cell = Image.new('RGBA', (CELL, CELL))
    cell.paste(sprite, (left, top))
    return cell


def write_json(path, content):
    path.write_text(json.dumps(content, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def build():
    recipe = json.loads((PACKAGE / 'source-layout.json').read_text())
    raw = PACKAGE / 'raw'
    raw.mkdir(exist_ok=True)
    seeds = PACKAGE / 'seeds'
    seeds.mkdir(exist_ok=True)

    idle = open_sprite(PACKAGE / 'sources/approved-idle.png')
    _, top, _, bottom = alpha_box(idle)
    idle = place(idle, IDLE_HEIGHT / (bottom - top), BODY_CENTRE)
    idle.save(seeds / 'water-spirit-idle.png')

    cells_dir = None
    if len(sys.argv) > 1:
        cells_dir = Path(sys.argv[1])
        cells_dir.mkdir(exist_ok=True, parents=True)

    preview_rows = [('Idle', [idle])]
    clips = {}
    for key, layout in recipe.items():
        source = open_sprite(PACKAGE / 'sources' / f'{key}.png')
        cuts = layout['cuts']
        assert cuts[0] == 0 and cuts[-1] == source.width
        sprites = [source.crop((left, 0, right, source.height)) for left, right in zip(cuts, cuts[1:])]
        assert all(alpha_box(pose) is not None for pose in sprites), key
        selected = layout['scaleFrames']
        heights = [alpha_box(sprites[i])[3] - alpha_box(sprites[i])[1] for i in selected]
        scale = layout.get('targetHeight', IDLE_HEIGHT) / median(heights)
        poses = [place(pose, scale, centre) for pose, centre in zip(sprites, layout['centres'], strict=True)]
        count = len(poses)
        strip = Image.new('RGBA', (CELL * count + GUTTER * (count - 1), CELL))
        boxes = []
        for index, pose in enumerate(poses):
            left = index * (CELL + GUTTER)
            strip.paste(pose, (left, 0))
            boxes.append([left, 0, CELL, CELL])
        strip.save(raw / f'{key}.png')
        clips[key] = {
            'intentOrReaction': layout['label'], 'facing': 'left', 'frameCount': count,
            'source': f'sources/{key}.png', 'raw': f'raw/{key}.png', 'cells': boxes,
            'bounds': [alpha_box(pose) for pose in poses], 'sourceSharedScale': round(scale, 5),
            'frameOrder': layout.get('frameOrder', BEATS),
        }
        preview_rows.append((layout['label'], poses))

    write_json(PACKAGE / 'strips.json', {'cellSize': [CELL, CELL], 'gutterPx': GUTTER, 'soleOrigin': GROUND / CELL, 'idleIndex': 0, 'clips': clips})

    preview_height = 175
    preview = Image.new('RGBA', (390, preview_height * sum((len(poses) + 1) // 2 for _, poses in preview_rows)), '#203450')
    draw = ImageDraw.Draw(preview)
    y = 0
    image_index = 0
    for label, poses in preview_rows:
        for i, pose in enumerate(poses):
            if cells_dir is not None:
                pose.save(cells_dir / f'{image_index:03d}.png')
            image_index += 1
            if i % 2 == 0:
                draw.text((12, y + 5), label if i == 0 else f'{label} (cont.)', fill='white', font=ImageFont.load_default())
            box = alpha_box(pose)
            if box is None:
                raise ValueError(label)
            sprite = pose.crop(box)
            sprite = sprite.resize((round(sprite.width * .285), round(sprite.height * .285)), Image.Resampling.LANCZOS)
            x = (i % 2) * 195 + (195 - sprite.width) // 2
            preview.alpha_composite(sprite, (x, y + 167 - sprite.height))
            if i % 2 or i == len(poses) - 1:
                y += preview_height
    preview.convert('RGB').save(PACKAGE / 'preview-390.png')
    files = {}
    for folder in ['sources', 'raw', 'seeds']:
        for path in sorted((PACKAGE / folder).glob('*.png')):
            with Image.open(path) as image:
                image.verify()
            with Image.open(path) as image:
                assert image.mode == 'RGBA'
                files[path.relative_to(PACKAGE).as_posix()] = {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'size': image.size}
    write_json(PACKAGE / 'validation.json', {'frameTotal': image_index, 'files': files})


if __name__ == '__main__':
    build()
