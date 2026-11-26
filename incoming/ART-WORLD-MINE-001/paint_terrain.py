"""Paint periodic stone beds and add small, seeded details by zone."""
import numpy as np
from PIL import Image, ImageDraw

SIZE = 128
PERIOD = SIZE - 1
Y, X = np.indices((SIZE, SIZE), dtype=float)
U, V = (X % PERIOD) / PERIOD, (Y % PERIOD) / PERIOD
TAU = 2 * np.pi


def wave(x, y, phase=0):
    return np.sin(TAU * (x * U + y * V) + phase)


def paint_stone(color, seed, columns, rows, grout=1.0, wear=1.0, variant=0, aspect=None):
    rng = np.random.default_rng(seed)
    # A warped lattice gives fractured, staggered slabs with no tile border.
    # Periodic distances carry the actual stone silhouette across each edge.
    wx = X % PERIOD + 2.6 * wave(1, 2) + 1.35 * wave(3, -2, .6)
    wy = Y % PERIOD + 2.1 * wave(2, 1, .4) + 1.2 * wave(3, 2)
    if variant:
        falloff = np.sin(np.pi * U)**2 * np.sin(np.pi * V)**2
        wx += (6 * wave(1, 1, variant * 1.6) + 3 * wave(2, -1)) * falloff
        wy += (8 * wave(1, -1, variant * 1.9) + 4 * wave(-2, 1)) * falloff
    cx, cy = [], []
    for row in range(rows):
        for col in range(columns):
            cx.append((col + .27 + .50 * (row % 2) + rng.uniform(-.28, .28)) * PERIOD / columns)
            cy.append((row + .38 + rng.uniform(-.26, .26)) * PERIOD / rows)
    dx = (wx - np.array(cx)[:, None, None] + PERIOD / 2) % PERIOD - PERIOD / 2
    dy = (wy - np.array(cy)[:, None, None] + PERIOD / 2) % PERIOD - PERIOD / 2
    aspect = columns / rows if aspect is None else aspect
    d2 = dx**2 + (aspect * dy)**2
    best = np.argsort(d2, axis=0)[:2]
    a, b = best
    first = np.take_along_axis(d2, best, axis=0)
    ax, bx = (np.take_along_axis(dx, best, axis=0))
    ay, by = (np.take_along_axis(dy, best, axis=0))
    nx, ny = ax - bx, (ay - by) * aspect**2
    length = np.maximum(np.hypot(nx, ny), .01)
    seam = (first[1] - first[0]) / (2 * length)
    light = (-nx - ny) / (1.42 * length)
    relief = -26 * grout * np.exp(-(seam / 1.15)**2)
    relief += (4 + 13 * light) * wear * np.exp(-((seam - 2.1) / 1.25)**2)
    facets = (1.25 * np.floor((-ax - ay * .8 + 1.5 * wave(2, 3)) / 4)).clip(-6, 6)
    grain = 2.4 * wave(9, -4, .7) + 1.7 * wave(18, 11) + 1.4 * wave(27, -17, 1.1)
    grain += 3.1 * wave(5, -2, .6) + 1.8 * wave(-3, 6)
    tone = rng.uniform(-8, 9, len(cx))[a] + facets * wear + grain + relief
    # Keep tiny directional hue shifts in the split planes.
    tint = rng.uniform(-3, 3, (len(cx), 3))[a]
    return np.clip(np.array(color) + tone[..., None] + tint, 0, 255).astype(np.uint8)


def slab_details(name, index, stone):
    rng = np.random.default_rng(300 + index + {'yard': 0, 'tunnel': 40, 'cavern': 80}[name])
    image = Image.fromarray(stone)
    if name == 'yard':
        # Scuffed parallel cart ruts drift sideways, wrapping naturally at every edge.
        rut_x = X % PERIOD - 3.7 * wave(0, 1, .4) - 1.2 * wave(0, 3)
        where = (rut_x - 13 + PERIOD / 2) % PERIOD - PERIOD / 2
        rut = -8 * np.exp(-(where / 2.1)**2) + 4 * np.exp(-((where + 3.6) / 1.3)**2)
        where = (rut_x - 49 + PERIOD / 2) % PERIOD - PERIOD / 2
        rut += -7 * np.exp(-(where / 2.6)**2) + 3 * np.exp(-((where + 4) / 1.8)**2)
        image = Image.fromarray(np.clip(stone + rut[..., None], 0, 255).astype(np.uint8))
    detail = Image.new('RGBA', image.size)
    draw = ImageDraw.Draw(detail)
    for _ in range({'yard': 36, 'tunnel': 25, 'cavern': 17}[name]):
        x, y = rng.integers(8, 120, 2).tolist()
        w, h = rng.integers(2, 6, 2).tolist()
        pts = [(x - w, y), (x - 1, y - h), (x + w - 1, y - h + 1), (x + w, y + 1),
               (x + 1, y + h - 1)]
        r, g, b = image.getpixel((x, y))
        def lit(delta, alpha):
            return tuple(max(0, min(255, t + delta)) for t in (r, g, b)) + (alpha,)
        draw.polygon([(px + 1, py + 1) for px, py in pts], fill=lit(-31, 120))
        draw.polygon(pts, fill=lit(12, 125))
        draw.line(pts[:3], fill=lit(32, 145))
        draw.line(pts[2:5], fill=lit(-19, 135))
    if name == 'cavern':
        crosses = ((29, 36), (96, 97), (68, 88), (94, 38))
        x, y = crosses[index]
        draw.line([(x - 14, y + 12), (x - 4, y + 6), (x + 2, y + 9), (x + 12, y)], fill=(14, 35, 35, 220), width=2)
        for dx, dy, h in [(-6, 4, 6), (0, 6, 11), (6, 6, 7)]:
            q, r = x + dx, y + dy
            draw.polygon([(q - 4, r), (q - 2, r - h + 2), (q + 1, r - h),
                          (q + 4, r - 2), (q + 1, r + 2)], fill='#175b4e')
            draw.polygon([(q - 2, r - h + 2), (q + 1, r - h), (q, r + 1), (q - 4, r)],
                         fill='#328c72')
            draw.line([(q - 3, r - 1), (q - 2, r - h + 2), (q + 1, r - h)], fill='#6abea2')
    return Image.alpha_composite(image.convert('RGBA'), detail)


def wall(name):
    if name == 'face':
        bed = paint_stone((48, 52, 59), 92, 3, 6, grout=.54, wear=.9, aspect=1.5).astype(float)
        # Cross the horizontal seam with actual lithologic bands, not blank edges.
        strata = .7 * wave(1, 0, .5) + .4 * wave(2, 0, 1.1)
        course = Y - strata * 6 - 2 * wave(1, 0, .7)
        lip = 17 * np.exp(-((course - 18) / 9)**2) - 12 * np.exp(-((course - 34) / 6)**2)
        layers = 6 * np.sin(course * .29) + 2.4 * np.sin(course * .88)
        contour = lip + layers - 13 * V
        bed += contour[..., None]
    elif name == 'top':
        bed = paint_stone((57, 62, 69), 109, 4, 4, grout=.88).astype(float)
        lip = np.exp(-((Y - 110 - 4 * wave(1, 0)) / 12)**2)
        bed += (9 * lip)[..., None]
    else:
        bed = paint_stone((37, 41, 48), 163, 4, 5, grout=.63, wear=.66).astype(float)
    return Image.fromarray(np.clip(bed, 0, 255).astype(np.uint8)).convert('RGBA')


def make_terrain():
    zones = {
        'yard': ((91, 80, 66), 201, 5, 5, .26, .65),
        'tunnel': ((86, 89, 93), 212, 4, 5, .84, 1.08),
        'cavern': ((65, 79, 77), 235, 4, 4, .93, 1.03),
    }
    tiles = {}
    # Blend subtle color variation into the same continuous stone structure.
    # The structural texture runs unchanged through the entire tile.
    d = np.minimum.reduce((X, Y, PERIOD - X, PERIOD - Y))
    decor_mask = np.clip(d / 8, 0, 1)[..., None]
    for name, (color, seed, cols, rows, grout, wear) in zones.items():
        common = paint_stone(color, seed, cols, rows, grout=grout, wear=wear)
        baseline = np.asarray(slab_details(name, 0, common))
        for i in range(4):
            stone = paint_stone(color, seed, cols, rows, grout=grout, wear=wear, variant=i)
            source = np.asarray(slab_details(name, i, stone))
            tile = np.round(baseline * (1 - decor_mask) + source * decor_mask).astype(np.uint8)
            tiles[f'{name}_{i}'] = Image.fromarray(tile)
    for name in ('top', 'face', 'inner'):
        tiles[f'mine_wall_{name}'] = wall(name)
    return tiles
