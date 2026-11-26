"""Rebuild the mine's lossless atlas, rail layer and layout previews."""
import hashlib
import json
from pathlib import Path
import re

import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'sources'
OUT = ROOT / 'runtime'
PREVIEW = ROOT / 'preview'
TILE = 128
ROWS = json.loads((SOURCE / 'layout.json').read_text())


def save_atlas(name, entries, columns):
    atlas = Image.new('RGBA', (columns * TILE, (len(entries) + columns - 1) // columns * TILE))
    frames = {}
    for i, (key, image) in enumerate(entries.items()):
        x, y = i % columns * TILE, i // columns * TILE
        atlas.paste(image, (x, y))
        frames[key] = {'x': x, 'y': y, 'w': TILE, 'h': TILE}
    atlas.save(OUT / f'{name}.webp', lossless=True)
    (OUT / f'{name}.json').write_text(json.dumps(frames, indent=2) + '\n')


def terrain():
    art = Image.open(SOURCE / 'materials.png').convert('RGB')
    w, h = art.size
    color_sets = [(91, 80, 66), (86, 89, 93), (64, 78, 77), (44, 48, 55)]
    tiles = {}
    yy, xx = np.indices((TILE, TILE))
    edge = np.minimum.reduce([xx, yy, TILE - 1 - xx, TILE - 1 - yy])
    mask = np.clip(edge / 19, 0, 1)[..., None]
    mask = mask * mask * (3 - 2 * mask)
    for i, zone in enumerate(('yard', 'tunnel', 'cavern', 'wall')):
        left, top = i % 2 * (w // 2), i // 2 * (h // 2)
        panel = art.crop((left + 12, top + 12, left + w // 2 - 12, top + h // 2 - 12))
        variants = ('mine_wall_top', 'mine_wall_face', 'mine_wall_inner') if zone == 'wall' else [f'{zone}_{j}' for j in range(4)]
        for j, key in enumerate(variants):
            base = np.array(color_sets[i], dtype=float)
            if key == 'mine_wall_inner':
                base -= 8
            if key == 'mine_wall_face':
                crop = panel.resize((TILE, TILE), Image.Resampling.LANCZOS)
                weight = .85
            else:
                pw, ph = panel.size
                dx, dy = j % 2 * pw // 3, j // 2 * ph // 3
                crop = panel.crop((dx, dy, dx + pw * 2 // 3, dy + ph * 2 // 3)).resize((TILE, TILE), Image.Resampling.LANCZOS)
                weight = .62 if zone != 'wall' else .34
            array = np.array(crop, dtype=float)
            detail = np.clip((array - np.median(array, axis=(0, 1))) * weight, -40, 48)
            if key == 'mine_wall_top':
                detail += np.where(yy[..., None] < 64, 7, 0)
            if key == 'mine_wall_face':
                detail += np.where(yy[..., None] > 76, -9, 0)
            pixels = np.clip(base + mask * detail, 0, 255).astype('uint8')
            tiles[key] = Image.fromarray(pixels).convert('RGBA')
    for zone in ('yard', 'tunnel', 'cavern'):
        for a in range(4):
            for b in range(4):
                first = np.array(tiles[f'{zone}_{a}'])
                second = np.array(tiles[f'{zone}_{b}'])
                assert np.array_equal(first[:, -1], second[:, 0])
                assert np.array_equal(first[-1], second[0])
    return tiles


def tracks():
    entries = {}
    for name in ('ns', 'junction_w', 'junction_e', 'ew', 'end_stop'):
        tile = Image.new('RGBA', (TILE, TILE))
        draw = ImageDraw.Draw(tile)
        if name in ('ew', 'end_stop'):
            for x in range(8, 125, 23):
                draw.rounded_rectangle((x, 37, x + 9, 90), 2, fill='#59412e', outline='#392d29', width=2)
            for y in (47, 79):
                draw.line((0, y + 2, 127 if name == 'ew' else 72, y + 2), fill='#343437', width=6)
                draw.line((0, y, 127 if name == 'ew' else 72, y), fill='#92908b', width=3)
            if name == 'end_stop':
                draw.rounded_rectangle((65, 34, 83, 92), 3, fill='#745439', outline='#352b25', width=3)
        else:
            for y in range(8, 125, 23):
                draw.rounded_rectangle((37, y, 90, y + 9), 2, fill='#59412e', outline='#392d29', width=2)
            for x in (47, 79):
                draw.line((x + 2, 0, x + 2, 127), fill='#343437', width=6)
                draw.line((x, 0, x, 127), fill='#92908b', width=3)
            if name.startswith('junction'):
                end = 0 if name.endswith('w') else 127
                draw.line([(64, 103), (64, 78), ((end + 64) // 2, 63), (end, 63)], fill='#59412e', width=50)
                for y in (47, 79):
                    points = [(47 + y - 47, 107), (45 + y - 47, 83), ((end + 64) // 2, y), (end, y)]
                    draw.line([(x, y + 2) for x, y in points], fill='#343437', width=6)
                    draw.line(points, fill='#92908b', width=3)
        entries[f'rail_{name}'] = tile
    entries['rail_end_stop_w'] = ImageOps.mirror(entries['rail_end_stop'])
    return entries


def map_previews(tiles, rails):
    grid = Image.new('RGBA', (25 * 60, 25 * 60))
    rail_sites = {(20, y): 'rail_ns' for y in range(11, 18)}
    rail_sites.update({(20, 14): 'rail_junction_e', (20, 15): 'rail_junction_w', (20, 16): 'rail_junction_e'})
    for x, y, end in [(21, 14, 22), (19, 15, 18), (21, 16, 22)]:
        rail_sites[x, y] = 'rail_ew'
        rail_sites[end, y] = 'rail_end_stop_w' if end < x else 'rail_end_stop'
    for y, row in enumerate(ROWS):
        for x, cell in enumerate(row):
            if cell == '#':
                if y < 24 and ROWS[y + 1][x] != '#':
                    key = 'mine_wall_face'
                elif y and ROWS[y - 1][x] != '#':
                    key = 'mine_wall_top'
                else:
                    key = 'mine_wall_inner'
            else:
                zone = {',': 'tunnel', ':': 'cavern', 'B': 'cavern', 'G': 'cavern'}.get(cell, 'cavern' if y < 7 else 'yard')
                key = f'{zone}_{(x * 31337 ^ y * 6971 ^ x * y * 991) % 4}'
            xy = (x * 60, y * 60)
            grid.paste(tiles[key].resize((60, 60), Image.Resampling.LANCZOS), xy)
            if (x, y) in rail_sites:
                grid.alpha_composite(rails[rail_sites[x, y]].resize((60, 60), Image.Resampling.LANCZOS), xy)
    for i, (cx, cy) in enumerate(((12, 19), (19, 13), (19, 6))):
        left = min(max(0, cx * 60 + 30 - 195), 1500 - 390)
        top = min(max(0, cy * 60 + 30 - 422), 1500 - 844)
        viewport = grid.crop((left, top, left + 390, top + 844)).convert('RGB')
        viewport.save(PREVIEW / f'map-{i + 1}-lit.png')
        if i == 1:
            y, x = np.indices((844, 390))
            distance = np.hypot(x - (cx * 60 + 30 - left), y - (cy * 60 + 30 - top))
            factor = 1 - np.clip((distance - 39) / 47, 0, 1) * .66
            dark = Image.fromarray((np.asarray(viewport) * factor[..., None]).astype('uint8'))
            dark.save(PREVIEW / 'map-2-dark.png')


def fight(bg):
    for width, height, band in ((390, 844, 372), (1366, 768, 480)):
        preview = Image.new('RGB', (width, height), '#181b22')
        # Match the battle's horizon while slicing the art to the visible field.
        field = ImageOps.fit(bg, (width, band), Image.Resampling.LANCZOS, centering=(.5, .45))
        hero = [(0.15, .44), (.15, .64), (.2, .84), (.35, .55), (.37, .78)]
        foe = [(.83, .44), (.85, .64), (.88, .86), (.65, .57), (.69, .82)]
        for side, slots in enumerate((hero, foe)):
            for number, (x, y) in enumerate(slots):
                actor_file = SOURCE / f'actor-{side}-{number}.png'
                figure = Image.open(actor_file).convert('RGBA')
                figure = figure.crop(figure.getbbox())
                scale = (0.17 if side == 0 else .20) * band / figure.height
                figure = figure.resize((round(figure.width * scale), round(figure.height * scale)), Image.Resampling.LANCZOS)
                px, py = round(x * width), round(y * band)
                draw = ImageDraw.Draw(field)
                draw.ellipse((px - 15, py - 3, px + 15, py + 3), fill='#303034')
                field.paste(figure, (px - figure.width // 2, py - figure.height), figure)
                draw.rectangle((px - 15, py + 5, px + 15, py + 7), fill='#9d7854' if side else '#799e69')
        preview.paste(field, (0, (height - band) // 2))
        preview.save(PREVIEW / f'battle-{width}.png')


def main():
    OUT.mkdir(exist_ok=True)
    PREVIEW.mkdir(exist_ok=True)
    tiles, rails = terrain(), tracks()
    save_atlas('tiles_mine', tiles, 4)
    save_atlas('rails_mine', rails, 3)
    bg = Image.open(SOURCE / 'bg.png').convert('RGB')
    assert bg.size == (1536, 1024), bg.size
    bg.save(OUT / 'bg_mine.webp', lossless=True, method=6)
    runtime_bytes = sum(p.stat().st_size for p in OUT.iterdir())
    assert runtime_bytes < 2_500_000, runtime_bytes
    map_previews(tiles, rails)
    fight(bg)
    files = {}
    for file in sorted(ROOT.rglob('*')):
        if file.is_file() and file.name != 'validation.json':
            item = {'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'bytes': file.stat().st_size}
            if file.suffix in ('.png', '.webp'):
                with Image.open(file) as image:
                    image.load()
                    item['size'] = image.size
                    item['mode'] = image.mode
            files[str(file.relative_to(ROOT))] = item
    (ROOT / 'validation.json').write_text(json.dumps({'runtimeBytes': runtime_bytes, 'files': files}, indent=2) + '\n')


if __name__ == '__main__':
    main()
