"""Prepare the hand-painted round 4 material sheets for the mine atlas."""
import numpy as np
from PIL import Image

TILE = 128
ZONES = {'yard': 45, 'tunnel': 45, 'cavern': 37.5}


def mean_lightness(pixels):
    """Average pixel CIE L* (sRGB, D65)."""
    rgb = np.asarray(pixels, dtype=float)[..., :3] / 255
    linear = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
    y = linear @ np.array([.2126, .7152, .0722])
    return float(np.where(y > (6 / 29) ** 3, 116 * np.cbrt(y) - 16, (29 / 3) ** 3 * y).mean())


def grade(pixels, target):
    """Apply a uniform exposure adjustment to the source brushwork."""
    low, high = -128, 128
    for _ in range(12):
        value = (low + high) / 2
        if mean_lightness(np.clip(pixels + value, 0, 255)) < target:
            low = value
        else:
            high = value
    return np.clip(pixels + (low + high) / 2, 0, 255)


def as_image(pixels):
    return Image.fromarray(np.rint(np.clip(pixels, 0, 255)).astype(np.uint8)).convert('RGBA')


def sine_transform(values, axis):
    """Unnormalized type-I discrete sine transform via odd reflection."""
    values = np.moveaxis(values, axis, 0)
    zeros = np.zeros_like(values[:1])
    mirrored = np.concatenate((zeros, values, zeros, -values[::-1]), axis=0)
    result = -np.fft.fft(mirrored, axis=0).imag[1:len(values) + 1]
    return np.moveaxis(result, 0, axis)


def match_boundaries(pixels, horizontal, vertical):
    """Match a common perimeter by spreading only the color correction.

    A discrete harmonic extension leaves the painted detail and contours in
    the interior intact, with no paste-over strip at the tile edge.
    """
    correction = np.zeros_like(pixels)
    correction[[0, -1]] = horizontal - pixels[[0, -1]]
    correction[:, [0, -1]] = vertical[:, None] - pixels[:, [0, -1]]
    rhs = np.zeros((TILE - 2, TILE - 2, 3))
    rhs[0] += correction[0, 1:-1]
    rhs[-1] += correction[-1, 1:-1]
    rhs[:, 0] += correction[1:-1, 0]
    rhs[:, -1] += correction[1:-1, -1]
    freq = 2 - 2 * np.cos(np.arange(1, TILE - 1) * np.pi / (TILE - 1))
    spectrum = sine_transform(sine_transform(rhs, 0), 1) / (freq[:, None] + freq[None, :])[..., None]
    correction[1:-1, 1:-1] = sine_transform(sine_transform(spectrum, 0), 1) / (2 * (TILE - 1)) ** 2
    return pixels + correction


def floor_tiles(path, zone, target):
    image = Image.open(path).convert('RGB')
    box_w, box_h = image.width // 2, image.height // 2
    # Trim the sheet split, including the hairline the generator draws at it.
    inset = 8
    variants = []
    for row in range(2):
        for col in range(2):
            x, y = col * box_w, row * box_h
            box = (x + inset, y + inset, x + box_w - inset, y + box_h - inset)
            pixels = np.asarray(image.crop(box).resize((TILE, TILE), Image.Resampling.LANCZOS), dtype=float)
            if zone in ('yard', 'cavern'):
                gray = (pixels @ np.array([.2126, .7152, .0722]))[..., None]
                saturation = .57
                if zone == 'cavern':
                    # Keep emerald facets while drawing slate toward neutral gray.
                    green = pixels[..., 1] - np.maximum(pixels[..., 0], pixels[..., 2])
                    saturation = (.53 + .47 * np.clip(green / 15, 0, 1))[..., None]
                pixels = gray + saturation * (pixels - gray)
            variants.append(grade(pixels, target))
    # Both directions use the median of the painted edge samples across all
    # variants, so a gravel chip or crystal at one edge cannot mark every join.
    horizontal = np.median([p[y] for p in variants for y in (0, -1)], axis=0)
    vertical = np.median([p[:, x] for p in variants for x in (0, -1)], axis=0)
    corner = np.mean([horizontal[0], horizontal[-1], vertical[0], vertical[-1]], axis=0)
    for edge in (horizontal, vertical):
        weight = np.linspace(1, 0, 6)[:, None]
        for end in (edge[:6], edge[-6:][::-1]):
            end += weight * (corner - end)
    return [as_image(match_boundaries(p, horizontal, vertical)) for p in variants]


def cliff_face(path):
    image = Image.open(path).convert('RGB')
    width = round(image.width * TILE / image.height)
    strip = np.asarray(image.resize((width, TILE), Image.Resampling.LANCZOS), dtype=float)
    # Choose a repeat-length where the painted ledges have the closest
    # heights and colors across the overlap, especially the upper lip.
    overlap = 15
    rows = np.ones(TILE)
    rows[16:31] = 2
    candidates = range(8, width - TILE - overlap - 8)
    distances = []
    for x in candidates:
        first = strip[:, x:x + overlap]
        after = strip[:, x + TILE:x + TILE + overlap]
        distances.append(np.mean(np.abs(first - after) * rows[:, None, None]))
    start = candidates[int(np.argmin(distances))]
    face = strip[:, start:start + TILE].copy()
    t = np.linspace(0, 1, overlap)[None, :, None]
    face[:, :overlap] = (1 - t) * strip[:, start + TILE:start + TILE + overlap] + t * face[:, :overlap]
    face[:, [0, -1]] = (face[:, :1] + face[:, -1:]) / 2
    return grade(face, 17.5)


def make_terrain(source, previous):
    tiles = {}
    for zone, target in ZONES.items():
        variations = floor_tiles(source / f'{zone}.png', zone, target)
        for i, variant in enumerate(variations):
            tiles[f'{zone}_{i}'] = variant

    face = cliff_face(source / 'wall_face.png')
    inner_edge = np.asarray(previous['mine_wall_inner'], dtype=float)[:, 0, :3]
    # Keep the contact near the existing dark rock. Carry some of the cliff's
    # stratum color into it without putting bright lines through the deep rock.
    edge = .85 * inner_edge + .15 * face[:, 0]
    for part in ('top', 'face', 'inner'):
        name = f'mine_wall_{part}'
        paint = face if part == 'face' else np.asarray(previous[name], dtype=float)[..., :3].copy()
        paint[:, [0, -1]] = edge[:, None]
        tiles[name] = as_image(paint)
    return tiles
