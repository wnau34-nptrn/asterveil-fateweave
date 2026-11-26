"""Rebuild the round 4 mine terrain atlas and terrain previews."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from map_visibility import darkened_map, visible_from
from finish_terrain import TILE, make_terrain, mean_lightness

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'sources'
OUT = ROOT / 'runtime'
PREVIEW = ROOT / 'preview'
ROWS = json.loads((SOURCE / 'layout.json').read_text())


def load_atlas(image_path, frame_path):
    atlas = Image.open(image_path).convert('RGBA')
    frames = json.loads(frame_path.read_text())
    return {name: atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])) for name, f in frames.items()}


def save_terrain(tiles):
    frames = json.loads((OUT / 'tiles_mine.json').read_text())
    assert set(frames) == set(tiles)
    atlas = Image.new('RGBA', (4 * TILE, 4 * TILE))
    for name, frame in frames.items():
        assert tiles[name].size == (frame['w'], frame['h']) == (TILE, TILE)
        atlas.paste(tiles[name], (frame['x'], frame['y']))
    atlas.save(OUT / 'tiles_mine.webp', lossless=True, method=6)


def validate_terrain(tiles):
    arrays = {name: np.asarray(tile) for name, tile in tiles.items()}
    assert all(np.all(a[..., 3] == 255) for a in arrays.values())
    lightness = {name: mean_lightness(pixels) for name, pixels in arrays.items()}
    wall_names = ('mine_wall_top', 'mine_wall_face', 'mine_wall_inner')
    top, face, inner = (lightness[name] for name in wall_names)
    assert inner < face < top
    assert all(42 <= lightness[f'yard_{i}'] <= 48 for i in range(4))
    zones = {}
    for zone in ('yard', 'tunnel', 'cavern'):
        names = [f'{zone}_{i}' for i in range(4)]
        mean = np.mean([lightness[name] for name in names])
        minimum = min(lightness[name] for name in names)
        assert minimum - top >= 15, (zone, minimum - top)
        zones[zone] = {'mean': round(mean, 2), 'meanDeltaToWallTop': round(mean - top, 2),
                       'minimumTileDeltaToWallTop': round(minimum - top, 2)}
        for a in names:
            for b in names:
                assert np.array_equal(arrays[a][:, -1], arrays[b][:, 0]), (a, b, 'horizontal')
                assert np.array_equal(arrays[a][-1], arrays[b][0]), (a, b, 'vertical')
    for a in wall_names:
        for b in wall_names:
            assert np.array_equal(arrays[a][:, -1], arrays[b][:, 0]), (a, b, 'wall horizontal')
    return {'space': 'CIELAB L* (sRGB, D65)', 'tiles': {k: round(v, 2) for k, v in lightness.items()},
            'zones': zones}


def cell_hash(x, y):
    # The game's unsigned 32-bit cellHash with the default salt.
    mask = 0xffffffff
    h = ((x + 1) * 0x27d4eb2d ^ (y + 1) * 0x165667b1 ^ 0x9e3779b9) & mask
    h = ((h ^ (h >> 15)) * 0x85ebca6b) & mask
    return h ^ (h >> 13)


def walkable(x, y):
    return 0 <= y < len(ROWS) and 0 <= x < len(ROWS[y]) and ROWS[y][x] != '#'


def wall_frame(x, y):
    if walkable(x, y + 1):
        return 'mine_wall_face'
    if any(walkable(x + dx, y + dy) for dy in (-1, 0, 1) for dx in (-1, 0, 1)):
        return 'mine_wall_top'
    return 'mine_wall_inner'


def seam_previews(tiles):
    rng = np.random.default_rng(357)
    small = {key: im.resize((60, 60), Image.Resampling.LANCZOS) for key, im in tiles.items()}
    for zone in ('yard', 'tunnel', 'cavern'):
        for side in (4, 6):
            board = Image.new('RGB', (side * 60, side * 60))
            indices = np.zeros((side, side), dtype=int) if side == 4 else rng.integers(0, 4, (side, side))
            for y, row in enumerate(indices):
                for x, i in enumerate(row):
                    board.paste(small[f'{zone}_{i}'], (x * 60, y * 60))
            board.save(PREVIEW / f'seams-{zone}-{side}x{side}-60px.png')
    wall = Image.new('RGB', (360, 180))
    for y, row in enumerate([
        ('inner', 'inner', 'inner', 'inner', 'inner', 'inner'),
        ('top', 'top', 'inner', 'top', 'face', 'top'),
        ('face', 'face', 'face', 'face', 'face', 'face'),
    ]):
        for x, name in enumerate(row):
            wall.paste(small[f'mine_wall_{name}'], (x * 60, y * 60))
    wall.save(PREVIEW / 'seams-wall-6x3-60px.png')


def comparison_sheet(left, right, name):
    panel = Image.new('RGB', (516, 268), '#181b24')
    draw = ImageDraw.Draw(panel)
    for (title, tiles, groups), x in zip((left, right), (8, 268), strict=True):
        draw.text((x, 7), title, fill='white')
        for row, group in enumerate(groups):
            for column, tile in enumerate(group):
                image = tiles[tile].resize((60, 60), Image.Resampling.LANCZOS)
                panel.paste(image, (x + column * 60, 20 + row * 60))
    panel.save(PREVIEW / name)


def comparisons(tiles, lake, previous):
    mine_names = [[f'{zone}_{i}' for i in range(4)] for zone in ('yard', 'tunnel', 'cavern')]
    mine_names.append([f'mine_wall_{part}' for part in ('top', 'face', 'inner')])
    lake_names = [[f'{zone}_{i}' for i in range(4)] for zone in ('shore', 'isle', 'pavilion')]
    lake_names.append([f'lake_wall_{part}' for part in ('top', 'face', 'inner')])
    current = ('Crystal mine · Round 4', tiles, mine_names)
    comparison_sheet(current, ('Moon lake', lake, lake_names), 'lake-comparison-60px.png')
    comparison_sheet(('Crystal mine · Round 3', previous, mine_names), current, 'round3-vs-round4-60px.png')


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
                key = wall_frame(x, y)
            else:
                zone = {',': 'tunnel', ':': 'cavern', 'B': 'cavern', 'G': 'cavern'}.get(cell, 'cavern' if y < 7 else 'yard')
                key = f'{zone}_{cell_hash(x, y) % 4}'
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
            seen = visible_from(ROWS, (cx, cy), 1)
            dark = darkened_map(grid, ROWS, seen)
            dark.crop((left, top, left + 390, top + 844)).save(PREVIEW / 'map-2-dark.png')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    repo = ROOT.parents[1]
    parser.add_argument('--lake-atlas', type=Path, default=repo / 'public/assets/world/lake_tiles.webp')
    parser.add_argument('--lake-frames', type=Path, default=repo / 'src/content/world/lake-tiles.json')
    args = parser.parse_args()
    PREVIEW.mkdir(exist_ok=True)
    previous = load_atlas(SOURCE / 'round3/tiles_mine.webp', OUT / 'tiles_mine.json')
    save_terrain(make_terrain(SOURCE / 'round4', previous))
    tiles = load_atlas(OUT / 'tiles_mine.webp', OUT / 'tiles_mine.json')
    rails = load_atlas(OUT / 'rails_mine.webp', OUT / 'rails_mine.json')
    lightness = validate_terrain(tiles)
    runtime_bytes = sum(p.stat().st_size for p in OUT.iterdir())
    assert runtime_bytes < 2_500_000, runtime_bytes
    map_previews(tiles, rails)
    seam_previews(tiles)
    comparisons(tiles, load_atlas(args.lake_atlas, args.lake_frames), previous)
    files = {}
    for file in sorted(ROOT.rglob('*')):
        if file.is_file() and file.name != 'validation.json' and '__pycache__' not in file.parts:
            item = {'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'bytes': file.stat().st_size}
            if file.suffix in ('.png', '.webp'):
                with Image.open(file) as image:
                    image.load()
                    item['size'] = image.size
                    item['mode'] = image.mode
            files[str(file.relative_to(ROOT))] = item
    (ROOT / 'validation.json').write_text(json.dumps({'runtimeBytes': runtime_bytes, 'lightness': lightness, 'files': files}, indent=2) + '\n')


if __name__ == '__main__':
    main()
