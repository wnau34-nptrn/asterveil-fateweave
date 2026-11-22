"""Original material masters for Moon Lake. Coordinates are in a 128 px cell."""
import numpy as np
from PIL import Image

SIZE = 128
Y, X = np.indices((SIZE, SIZE), dtype=float) / (SIZE - 1)
DISTANCE = np.minimum.reduce([X, Y, 1 - X, 1 - Y]) * (SIZE - 1)
LUMA = np.array([.2126, .7152, .0722])


def smooth(value):
    t = np.clip(value, 0, 1)
    return t * t * (3 - 2 * t)


def noise(seed, horizontal, vertical):
    rng = np.random.default_rng(seed)
    grid = rng.uniform(-1, 1, (vertical, horizontal))
    sx, sy = X * horizontal, Y * vertical
    ix, iy = sx.astype(int), sy.astype(int)
    u, v = smooth(sx - ix), smooth(sy - iy)
    north = grid[iy % vertical, ix % horizontal] * (1 - u) + grid[iy % vertical, (ix + 1) % horizontal] * u
    south = grid[(iy + 1) % vertical, ix % horizontal] * (1 - u) + grid[(iy + 1) % vertical, (ix + 1) % horizontal] * u
    return north * (1 - v) + south * v


def mix(first, second, amount):
    amount = np.asarray(amount)[..., None]
    return np.asarray(first) * (1 - amount) + np.asarray(second) * amount


def shade(color, amount):
    return np.asarray(color) + amount[..., None]


def texture(seed):
    return noise(seed, 5, 4) * 6 + noise(seed + 1, 14, 17) * 4 + noise(seed + 2, 49, 49) * 3


def plank(seed):
    warp = noise(106, 6, 14) * .027
    row = ((Y + warp) * 7 + .48) % 1
    seams = np.exp(-((row - .027) / .043) ** 2) + np.exp(-((row - .998) / .03) ** 2)
    edge = np.exp(-((row - .12) / .039) ** 2)
    stagger = np.floor((Y + warp) * 7 + .48) % 7
    end_x = (X + stagger * .283 + .29) % 1
    ends = np.exp(-((end_x - .5) / .012) ** 2)
    grain = noise(212, 7, 53) * 7 + noise(seed, 12, 37) * 7
    grain += np.cos((Y + warp * .55) * np.pi * 126) * 2.2
    metal = np.exp(-((end_x - .466) / .015) ** 2 - ((row - .22) / .062) ** 2)
    metal += np.exp(-((end_x - .534) / .015) ** 2 - ((row - .77) / .062) ** 2)
    material = shade([99, 81, 70], texture(33) + grain - seams * 34 + edge * 16 - ends * 21)
    material = mix(material, [153, 163, 160], metal * .71)
    split = np.exp(-((row - .69 - noise(211, 4, 2) * .065) / .039) ** 2)
    return shade(material, -split * np.maximum(0, noise(seed + 19, 4, 3)) * 25)


def stone(seed, material):
    p = {
        "isle": ((101, 112, 119), (65, 79, 78), 4, 4, .034, 28),
        "pavilion": ((120, 130, 142), (70, 86, 97), 3, 4, .016, 39),
        "sanctum": ((104, 130, 150), (51, 72, 88), 2, 3, .016, 41),
        "wall_top": ((64, 82, 100), (30, 45, 61), 3, 3, .040, 24),
        "wall_face": ((48, 66, 81), (23, 37, 51), 4, 3, .019, 35),
        "wall_inner": ((34, 51, 69), (22, 33, 53), 3, 3, .032, 52),
        "causeway": ((115, 129, 140), (66, 89, 99), 3, 3, .026, 27),
    }
    base, dark, nx, ny, roughness, layout_seed = p[material]
    rng = np.random.default_rng(layout_seed)
    warped_x = X + noise(layout_seed + 10, 5, 4) * roughness
    warped_y = Y + noise(layout_seed + 20, 3, 5) * roughness
    distances, facets = [], []
    for iy in range(ny):
        for ix in range(nx):
            jx = (ix + .5 + (iy % 2) * .44 + rng.uniform(-.18, .18)) / nx
            jy = (iy + .5 + rng.uniform(-.18, .18)) / ny
            dx = (warped_x - jx + .5) % 1 - .5
            dy = (warped_y - jy + .5) % 1 - .5
            power = 2 if material in {"isle", "wall_top", "wall_inner"} else 5
            distances.append((abs(dx * nx) ** power + abs(dy * ny) ** power) ** (1 / power))
            facets.append((dx * nx, dy * ny))
    ranks = np.argsort(distances, axis=0)
    closest, next_cell = ranks[:2]
    ranges = np.asarray(distances)
    at = np.indices((SIZE, SIZE))
    margin = ranges[next_cell, *at] - ranges[closest, *at]
    dx, dy = np.asarray(facets).transpose(1, 0, 2, 3)[:, closest, *at]
    facets_lit = -dx * 8 - dy * 19
    tint = rng.uniform(-11, 11, len(distances))[closest]
    vein = np.exp(-((np.sin((warped_x * 2 - warped_y) * 2 * np.pi) +
                       noise(seed, 6, 8) * .4) / .12) ** 2)
    lichen = smooth((noise(seed + 11, 5, 6) + noise(seed + 12, 14, 14) * .34 - .29) * 2)
    surface = shade(base, facets_lit + tint + texture(seed + 5) + vein * 6)
    moss = [103, 120, 106] if material == "isle" else [136, 158, 170]
    surface = mix(surface, moss, lichen * (.49 if material == "isle" else .18))
    surface = mix(surface, dark, np.exp(-(margin / .064) ** 2) * .91)
    surface = shade(surface, np.exp(-((margin - .104) / .043) ** 2) * (dy + dx < -.12) * 18)
    if material == "wall_face":
        relief = np.cos((Y - .13) * 2 * np.pi)
        surface = shade(surface, relief * 11)
    if material == "sanctum":
        # Thin inlays repeat on the dressed paving and remain flush with the floor.
        inlay = np.exp(-(((X * 2 + .5) % 1 - .5) / .026) ** 2)
        surface = mix(surface, [152, 170, 182], inlay * smooth(margin * 5) * .38)
    return surface


def water(seed, tide):
    if tide == "deep":
        depth = noise(seed, 4, 7) * 3 + noise(seed + 5, 3, 29) * 3
        drift = noise(seed + 7, 6, 17)
        lines = np.sin((Y * 15 + noise(seed + 9, 4, 9) * .24) * 2 * np.pi)
        glints = smooth((drift - .20) * 1.7) * smooth((lines - .83) * 6) * 13
        return shade([24, 54, 80], depth + glints)
    if tide == "shallow_high":
        base = mix([59, 119, 149], [83, 151, 177], .34 + noise(seed, 5, 9) * .26)
        ripple_phase = Y * 9 + noise(seed + 12, 4, 9) * .45 + np.sin(X * 2 * np.pi) * .13
        ripple = ((ripple_phase + .5) % 1) - .5
        streak = smooth((noise(seed + 3, 7, 13) + .34) * 1.65)
        glint = np.exp(-(ripple / .083) ** 2) * streak
        trough = np.exp(-((ripple - .14) / .115) ** 2) * streak
        base = shade(base, texture(seed) * .44 + noise(seed + 72, 4, 31) * 3 - trough * 11)
        return mix(base, [143, 200, 217], glint * .62)
    # True exposed sandbars with bright shoulders and distinct flat shale footholds.
    bar_y = .49 + np.sin((X + .14) * 2 * np.pi) * .067 + noise(seed + 11, 5, 4) * .13
    bar_dist = abs(Y - bar_y)
    wet_width = .24 + noise(seed + 5, 5, 4) * .097
    sand = smooth((wet_width - bar_dist) / .067)
    foam = np.exp(-((bar_dist - wet_width - .021) / .017) ** 2)
    base = shade([89, 164, 187], noise(seed, 6, 24) * 7 + noise(seed + 3, 4, 5) * 8)
    sand_detail = texture(seed + 2) + np.cos((Y - bar_y) * 2 * np.pi * 24) * 3
    shoal = mix([177, 172, 141], [211, 204, 163], smooth((wet_width - bar_dist) * 5))
    result = mix(base, shade(shoal, sand_detail), sand)
    result = mix(result, [201, 231, 227], foam * .66)

    rng = np.random.default_rng(seed)
    for x_slot in (.22, .48, .76):
        center_x = x_slot + rng.uniform(-.041, .041)
        center_y = bar_y[SIZE // 2, round(center_x * (SIZE - 1))] + rng.uniform(-.084, .084)
        dx = (X - center_x) / rng.uniform(.063, .116)
        dy = (Y - center_y) / rng.uniform(.035, .061)
        boulder = (abs(dx + dy * .22)**2.7 + abs(dy)**2.7) ** .37 + noise(seed + 29, 16, 18) * .13
        result = mix(result, [98, 111, 114], smooth((1.18 - boulder) * 7) * .8)
        surface = shade([147, 152, 139], -dx * 13 - dy * 20 + texture(seed + 13))
        result = mix(result, surface, smooth((.91 - boulder) * 11))
    return result


def causeway(seed):
    bed = water(seed, "shallow_high")
    slabs = stone(seed, "causeway")
    bank = abs(Y - .5 + noise(seed + 7, 7, 5) * .055)
    surround = np.exp(-((bank - .324) / .042) ** 2)
    bed = mix(bed, [66, 113, 128], surround * .65)
    slabs = shade(slabs, -smooth((Y - .66) * 5) * 16)
    rim = np.exp(-((Y - .21 - noise(seed + 7, 7, 5) * .055) / .026) ** 2)
    slabs = shade(slabs, rim * 25)
    return mix(bed, slabs, smooth((.333 - bank) * 13))


def closed_perimeter(image):
    # The analytic paints wrap already. Enforce the last stored sample after quantization.
    image = np.uint8(np.clip(np.rint(image), 0, 255))
    image[-1] = image[0]
    image[:, -1] = image[:, 0]
    return Image.fromarray(image).convert("RGBA")


def build_tiles(seeds, blend_band):
    families = {}
    for name, seed_list in seeds.items():
        if name == "shore":
            artwork = [plank(seed) for seed in seed_list]
        elif name == "causeway":
            artwork = [causeway(seed_list[0])]
        elif name in {"shallow_low", "shallow_high", "deep"}:
            artwork = [water(seed, name) for seed in seed_list]
        else:
            material = name.removeprefix("lake_")
            artwork = [stone(seed, material) for seed in seed_list]
        perimeter = np.mean(artwork, axis=0)
        weight = smooth(DISTANCE / blend_band)
        families[name] = {
            (name if len(artwork) == 1 else f"{name}_{i}"): closed_perimeter(mix(perimeter, frame, weight))
            for i, frame in enumerate(artwork)
        }
    return families
