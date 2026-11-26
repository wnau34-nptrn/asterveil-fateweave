"""Crop source props, build a 128px atlas and place props on the mine layout."""
import json

import numpy as np
from PIL import Image

from manifest import ROOT, manifest, write_metadata
from map_visibility import darkened_map, visible_from

SOURCE = ROOT / 'sources'
OUT = ROOT / 'runtime'
PREVIEW = ROOT / 'preview'
TILE = 128
# Tight hand-checked subject rectangles, with a margin around painted edges.
PROPS = [
    ('lantern_off', (65, 7, 204, 247), 90), ('lantern_on', (315, 7, 454, 247), 90),
    ('glow_crystal', (553, 8, 703, 257), 78),
    ('lever_main', (790, 7, 959, 243), 86), ('lever_siding', (1030, 38, 1221, 243), 86),
    ('ore_cart', (14, 273, 243, 491), 108),
    ('cracked_wall_closed', (270, 274, 488, 481), 120),
    ('cracked_wall_open', (519, 274, 739, 483), 120),
    ('beam_n', (812, 265, 937, 494), 71), ('beam_s', (1053, 277, 1195, 482), 71),
    ('beam_e', (28, 559, 236, 703), 71), ('beam_w', (274, 559, 485, 703), 71),
    ('evidence_closed', (506, 511, 746, 737), 116),
    ('evidence_open', (757, 511, 999, 747), 116),
    ('handprint_closed', (1022, 508, 1228, 742), 115),
    ('handprint_open', (6, 768, 254, 985), 115),
    ('worker_wait', (284, 784, 441, 986), 105), ('worker_follow', (556, 751, 697, 1008), 105),
    ('ledger', (748, 794, 998, 973), 76),
    ('dig_order', (1001, 781, 1249, 980), 96),
    ('timber', (263, 1008, 481, 1247), 111),
    ('ore_heap', (496, 1047, 743, 1227), 98),
    ('tools', (763, 1017, 959, 1243), 92),
    ('cask', (1009, 1023, 1238, 1246), 108),
]
EXTRAS = [
    ('child_drawing', (20, 107, 723, 642), 80),
    ('crystal_cluster_tall', (908, 55, 1254, 643), 115),
    ('crystal_cluster_low', (1476, 137, 2137, 628), 113),
]

SITES = {
    'lantern_off': [(9, 20), (7, 17), (13, 14), (16, 10), (21, 8)],
    'glow_crystal': [(12, 17), (13, 13)],
    'lever_main': [(19, 16), (21, 15), (19, 14)],
    'ore_cart': [(20, 17)], 'cracked_wall_closed': [(20, 11)],
    'beam_e': [(14, 3)], 'beam_n': [(17, 3)], 'beam_s': [(20, 3)], 'beam_w': [(20, 5)],
    'evidence_closed': [(22, 5)], 'handprint_closed': [(16, 11), (4, 15)],
    'worker_wait': [(6, 20), (15, 14), (17, 9)],
    'ledger': [(4, 21), (16, 9), (23, 5)],
    'dig_order': [(8, 10)], 'child_drawing': [(20, 10)],
}
DECOR = {
    'timber': [(11, 13), (22, 7)], 'ore_heap': [(5, 17)],
    'tools': [(8, 24)], 'cask': [(14, 24)],
    'crystal_cluster_tall': [(23, 7)], 'crystal_cluster_low': [(16, 2)],
}
PAIRS = [
    ('lantern_off', 'lantern_on'), ('lever_main', 'lever_siding'),
    ('cracked_wall_closed', 'cracked_wall_open'), ('evidence_closed', 'evidence_open'),
    ('handprint_closed', 'handprint_open'), ('worker_wait', 'worker_follow'),
    ('beam_n', 'beam_s', 'beam_e', 'beam_w'),
]


def normalize(raw, box, extent):
    crop = raw.crop(box)
    alpha = np.array(crop.getchannel('A'))
    alpha[alpha < 18] = 0
    crop.putalpha(Image.fromarray(alpha))
    crop = crop.crop(crop.getbbox())
    crop.thumbnail((extent, extent), Image.Resampling.LANCZOS)
    frame = Image.new('RGBA', (TILE, TILE))
    frame.alpha_composite(crop, ((TILE - crop.width) // 2, 124 - crop.height))
    return frame


def atlas():
    entries = {}
    for filename, specs in [('props.png', PROPS), ('extras.png', EXTRAS)]:
        raw = Image.open(SOURCE / filename).convert('RGBA')
        for name, box, extent in specs:
            entries[name] = normalize(raw, box, extent)
    page = Image.new('RGBA', (6 * TILE, 5 * TILE))
    frames = {}
    for i, (name, image) in enumerate(entries.items()):
        x, y = i % 6 * TILE, i // 6 * TILE
        assert image.getbbox()[3] == 124 and image.getextrema()[-1][0] == 0
        page.alpha_composite(image, (x, y))
        frames[name] = {'x': x, 'y': y, 'w': TILE, 'h': TILE}
    page.save(OUT / 'decor_mine.webp', lossless=True)
    write_metadata('runtime/decor_mine.json', {'anchor': [.5, 1], 'footY': 124, 'frames': frames})
    return entries


def input_atlas(name):
    source = Image.open(SOURCE / (name + '.webp')).convert('RGBA')
    frames = json.loads((SOURCE / (name + '.json')).read_text())
    return {k: source.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])) for k, f in frames.items()}


def map_grid(entries, lit, origin=None):
    terrain, rails = input_atlas('tiles_mine'), input_atlas('rails_mine')
    rows = json.loads((SOURCE / 'layout.json').read_text())
    seen = visible_from(rows, origin, 1) if origin else None
    paths = {(20, y): 'rail_ns' for y in range(11, 18)}
    paths.update({(20, 14): 'rail_junction_e', (20, 15): 'rail_junction_w', (20, 16): 'rail_junction_e'})
    paths.update({(21, 14): 'rail_ew', (22, 14): 'rail_end_stop', (19, 15): 'rail_ew',
                  (18, 15): 'rail_end_stop_w', (21, 16): 'rail_ew', (22, 16): 'rail_end_stop'})
    positions = {xy: name for name, coords in SITES.items() for xy in coords}
    for name, coords in DECOR.items():
        for xy in coords:
            assert xy not in positions and xy not in paths and rows[xy[1]][xy[0]] == '#'
            positions[xy] = name
    if lit:
        for xy, name in positions.copy().items():
            positions[xy] = dict(pair for pair in PAIRS if len(pair) == 2).get(name, name)
    grid = Image.new('RGBA', (1500, 1500))
    small = {k: im.resize((60, 60), Image.Resampling.LANCZOS) for k, im in {**terrain, **rails, **entries}.items()}
    for y, row in enumerate(rows):
        for x, cell in enumerate(row):
            if cell == '#':
                key = 'mine_wall_face' if y < 24 and rows[y + 1][x] != '#' else 'mine_wall_inner'
            else:
                zone = {',': 'tunnel', ':': 'cavern', 'B': 'cavern', 'G': 'cavern'}.get(cell, 'cavern' if y < 7 else 'yard')
                key = f'{zone}_{(x * 31337 ^ y * 6971 ^ x * y * 991) % 4}'
            at = (x * 60, y * 60)
            grid.paste(small[key], at)
            for overlay in (paths.get((x, y)), positions.get((x, y))):
                if overlay and (overlay in rails or seen is None or cell != ',' or (x, y) in seen):
                    grid.alpha_composite(small[overlay], at)
    return darkened_map(grid, rows, seen) if seen is not None else grid.convert('RGB')


def previews(entries):
    for lit in (True, False):
        cams = [(7, 19), (12, 18), (17, 14), (21, 13), (5, 13), (21, 6)]
        for i, (cx, cy) in enumerate(cams):
            left = np.clip(cx * 60 + 30 - 195, 0, 1110)
            top = np.clip(cy * 60 + 30 - 422, 0, 656)
            grid = map_grid(entries, lit, None if lit else (cx, cy))
            frame = grid.crop((left, top, left + 390, top + 844))
            frame.save(PREVIEW / f'map-{i + 1}-{"lit" if lit else "dark"}.png')
    board = Image.new('RGBA', (390, len(PAIRS) * 76), '#3e4248')
    for i, group in enumerate(PAIRS):
        for k, name in enumerate(group):
            panel = entries[name].resize((60, 60), Image.Resampling.LANCZOS)
            board.alpha_composite(panel, (42 + k * 74, 8 + i * 76))
    board.convert('RGB').save(PREVIEW / 'states-60px.png')
    manifest(propCount=len(entries), tileSize=TILE, footY=124, previewSize=[390, 844])


def main():
    OUT.mkdir(exist_ok=True)
    PREVIEW.mkdir(exist_ok=True)
    write_metadata('placements.json', {'puzzles': SITES, 'decorOnWall': DECOR, 'stateRows': PAIRS})
    previews(atlas())


if __name__ == '__main__':
    main()
