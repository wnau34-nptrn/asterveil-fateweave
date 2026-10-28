"""Mechanical cutting, alpha cleanup, 128px packing and review compositing.

Artwork is generated separately; this script never paints or recolours items.
Requires Pillow, NumPy and SciPy. Run from any directory.
"""
from pathlib import Path
import hashlib
import json
import math
from PIL import Image, ImageCms, ImageDraw
import numpy as np
from scipy import ndimage

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
CELL = 128
COLS = 10
ICC = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
RES = Image.Resampling.LANCZOS
SLOTS = ['head', 'body', 'gloves', 'boots', 'charm']
LOOKS = ['worn', 'fine', 'master', 'set_dawn', 'set_wind', 'set_shadow', 'set_thorn', 'set_starveil', 'set_mender']
HEROES = ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'sefa', 'brann', 'lio']


def save(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, icc_profile=ICC, **({'lossless': True, 'method': 6, 'exact': True} if path.suffix == '.webp' else {}))


def boundaries(signal, count):
    # Find the transparent gutter nearest each nominal grid division. The source
    # rows are intentionally allowed a few pixels of nonuniform generated space.
    length = len(signal)
    cuts = [0]
    for i in range(1, count):
        centre = length * i / count
        lo, hi = round(centre - length / count * .18), round(centre + length / count * .18)
        values = signal[lo:hi]
        best = np.flatnonzero(values == values.min()) + lo
        cuts.append(int(best[np.argmin(abs(best - centre))]))
    return cuts + [length]


def split(name, cols, rows):
    im = Image.open(OUT / 'sources' / f'{name}.png').convert('RGBA')
    alpha = np.array(im.getchannel('A')) >= 96
    xs = boundaries(alpha.sum(axis=0), cols)
    tiles = {}
    cuts = []
    for c in range(cols):
        ys = boundaries(alpha[:, xs[c]:xs[c+1]].sum(axis=1), rows)
        for r in range(rows):
            box = (xs[c], ys[r], xs[c+1], ys[r+1])
            tiles[r, c] = im.crop(box)
            cuts.append({'row': r, 'col': c, 'box': box})
    return tiles, cuts


def normalize(im):
    im = im.convert('RGBA')
    a = np.array(im.getchannel('A'))
    labels, _ = ndimage.label(a >= 96)
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    keep = sizes >= max(16, sizes.max() * .003)
    a[~ndimage.binary_dilation(keep[labels], iterations=1)] = 0
    a[a < 40] = 0
    im.putalpha(Image.fromarray(a))
    im = im.crop(im.getbbox())
    factor = 104 / max(im.size)
    im = im.resize((round(im.width * factor), round(im.height * factor)), RES)
    im.putalpha(im.getchannel('A').point(lambda v: 0 if v < 32 else v))
    canvas = Image.new('RGBA', (CELL, CELL))
    canvas.alpha_composite(im, ((CELL-im.width)//2, (CELL-im.height)//2))
    return canvas


def build():
    tiles, cuts = {}, {}
    for group, looks in [('armour_plain', LOOKS[:3]), ('armour_dawn_wind_shadow', LOOKS[3:6]), ('armour_thorn_starveil_mender', LOOKS[6:])]:
        parts, cuts[group] = split(group, 5, 3)
        for r, look in enumerate(looks):
            for c, slot in enumerate(SLOTS):
                tiles[f'gear_{slot}_{look}'] = normalize(parts[r, c])
    legacy = Image.open(ROOT / 'incoming/ART-UI-EQUIP-001/items/gear_items.png').convert('RGBA')
    oldmap = json.loads((ROOT / 'incoming/ART-UI-EQUIP-001/items/gear_items.json').read_text())
    for group, heroes in [('weapons_a', HEROES[:5]), ('weapons_b', HEROES[5:])]:
        parts, cuts[group] = split(group, 3, 5)
        for r, hero in enumerate(heroes):
            for c in range(3):
                if c == 1:
                    f = oldmap[f'weapon_{hero}']
                    tile = legacy.crop((f['x'], f['y'], f['x']+CELL, f['y']+CELL))
                else:
                    tile = normalize(parts[r, c])
                tiles[f'weapon_{hero}_{c+1}'] = tile
    parts, cuts['boss_charms'] = split('boss_charms', 3, 1)
    for c, boss in enumerate(['aegis', 'focus', 'lantern']):
        tiles[f'boss_{boss}'] = normalize(parts[0, c])
    assert len(tiles) == 78
    mapping = {}
    atlas = Image.new('RGBA', (COLS*CELL, math.ceil(len(tiles)/COLS)*CELL))
    for i, (name, tile) in enumerate(tiles.items()):
        x, y = i % COLS * CELL, i // COLS * CELL
        atlas.alpha_composite(tile, (x, y))
        mapping[name] = {'x': x, 'y': y, 'w': CELL, 'h': CELL}
        save(tile, OUT / 'cells' / f'{name}.png')
    # Compatibility aliases point at existing cells, never duplicate imagery.
    for hero in HEROES:
        mapping[f'weapon_{hero}'] = mapping[f'weapon_{hero}_2']
    for slot in SLOTS:
        mapping[f'gear_{slot}'] = mapping[f'gear_{slot}_fine']
    save(atlas, OUT / 'gear_items.png')
    save(atlas, ROOT / 'public/assets/ui/equip/gear_items.webp')
    (ROOT / 'src/game/visuals/equip/gear_items.json').write_text(json.dumps(mapping, indent=2)+'\n')
    (OUT / 'source-cuts.json').write_text(json.dumps(cuts, indent=2)+'\n')
    previews(tiles)
    validate(tiles, mapping, atlas)


def previews(tiles):
    colours = ['#b9c8d8', '#7fd99a', '#6fb7ff', '#c79bff', '#f2b84b']
    emblems = Image.open(ROOT / 'public/assets/ui/equip/set_emblems.webp').convert('RGBA')
    for size in [48, 64, 96]:
        pitch, top = size + 24, 36
        sheet = Image.new('RGBA', (pitch*10, top+math.ceil(len(tiles)/10)*(pitch+18)), '#0b1730')
        draw = ImageDraw.Draw(sheet)
        draw.text((12, 10), f'ART-UI-EQUIP-002 | {size}px | 78 cells, atlas order', fill='#dde8f4')
        for i, (name, tile) in enumerate(tiles.items()):
            x, y = i % 10*pitch+12, i//10*(pitch+18)+top
            draw.rounded_rectangle((x-2, y-2, x+size+1, y+size+1), radius=6, outline=colours[i%5], width=2)
            sheet.alpha_composite(tile.resize((size, size), RES), (x, y))
            if '_set_' in name:
                si = ['dawn', 'wind', 'shadow', 'thorn', 'starveil', 'mender'].index(name.split('_set_')[1])
                emblem = emblems.crop((si*128, 0, (si+1)*128, 128)).resize((16, 16), RES)
                sheet.alpha_composite(emblem, (x+size-14, y+size-14))
            draw.text((x, y+size+6), f'{i+1:02}', fill='#b9c8d8')
        save(sheet, OUT / 'review' / f'preview-{size}.png')


def validate(tiles, mapping, atlas):
    decoded = Image.open(ROOT / 'public/assets/ui/equip/gear_items.webp').convert('RGBA')
    assert decoded.tobytes() == atlas.tobytes()
    assert decoded.size == (1280, 1024)
    bounds = {}
    for name, tile in tiles.items():
        box = tile.getbbox()
        assert box and min(box[0], box[1], CELL-box[2], CELL-box[3]) >= 6, (name, box)
        assert tile.getchannel('A').getextrema() == (0, 255)
        bounds[name] = box
    assert len({tuple(mapping[n].values()) for n in tiles}) == 78
    report = {'unique_cells': len(tiles), 'aliases': len(mapping)-len(tiles), 'dimensions': decoded.size,
              'runtime_bytes': (ROOT / 'public/assets/ui/equip/gear_items.webp').stat().st_size,
              'alpha_bounds': bounds,
              'source_sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (OUT/'sources').glob('*.png')}}
    (OUT/'validation.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps({k: v for k, v in report.items() if k not in ['alpha_bounds', 'source_sha256']}))


if __name__ == '__main__':
    build()
