"""Cut and seam-match the ImageGen paintings for the 128 px mine atlas."""
import numpy as np
from PIL import Image

TILE = 128
ZONES = {
    'yard': (49, ((70, 40), (648, 92), (112, 631), (675, 674))),
    'tunnel': (45, ((50, 55), (666, 97), (102, 648), (643, 625))),
    'cavern': (39, ((83, 55), (676, 139), (28, 676), (656, 646))),
}
WALLS = {'top': 21, 'face': 17, 'inner': 13}


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


def cut(image, box):
    return np.asarray(image.crop(box).resize((TILE, TILE), Image.Resampling.LANCZOS), dtype=float)


def seam_weight(width):
    half = TILE // 2
    distance = np.abs(np.arange(TILE) - (half - .5)) - .5
    t = np.clip(1 - distance / width, 0, 1)
    return t * t * (3 - 2 * t)


def repair_offset(pixels, donor, axes, width):
    """Move joins to the center and feather in continuous painted material."""
    half = TILE // 2
    shifts = (half,) * len(axes)
    offset = np.roll(pixels, shifts, axis=axes)
    weight = seam_weight(width)
    mask = weight[None, :] if axes == (1,) else np.maximum(weight[:, None], weight[None, :])
    repaired = offset + (donor - offset) * mask[..., None]
    # Pin the join to the same sampled paint color on both sides, including corners.
    for axis in axes:
        view = np.moveaxis(repaired, axis, 0)
        view[half - 1:half + 1] = (view[half - 1] + view[half]) / 2
    return np.roll(repaired, tuple(-s for s in shifts), axis=axes)


def as_image(pixels):
    return Image.fromarray(np.rint(pixels).astype(np.uint8)).convert('RGBA')


def make_terrain(source):
    tiles = {}
    for zone, (target, offsets) in ZONES.items():
        image = Image.open(source / f'{zone}.png').convert('RGB')
        variants = []
        turns = (0, 1, 2, 3) if zone == 'cavern' else (0, 0, 0, 0)
        for (x, y), turn in zip(offsets, turns, strict=True):
            crop = cut(image, (x, y, x + 520, y + 520))
            variants.append(grade(np.rot90(crop, turn), target))
        # Sample the join from a quiet patch of the same painting. The feather
        # preserves the artwork in the interior of each independent crop.
        donor = grade(cut(image, (391, 379, 851, 839)), target)
        for index, variant in enumerate(variants):
            tiles[f'{zone}_{index}'] = as_image(repair_offset(variant, donor, (0, 1), 5))

    image = Image.open(source / 'walls.png').convert('RGB')
    span = image.width // 3
    wall_art = []
    for index, target in enumerate(WALLS.values()):
        x = index * span
        painting = cut(image, (x + 16, 8, x + span - 16, image.height - 8))
        if index == 0:
            painting = painting[::-1]
        painting = grade(painting, target)
        wall_art.append(repair_offset(painting, np.roll(painting, TILE // 4, axis=1), (1,), 12))
    # Use the continuous interior rock to join dissimilar wall types.
    # Matching just the contact pixels keeps the ledges and deep baselines intact.
    donor = np.roll(wall_art[-1], TILE // 2, axis=1)
    for name, painting in zip(WALLS, wall_art, strict=True):
        tiles[f'mine_wall_{name}'] = as_image(repair_offset(painting, donor, (1,), 1))
    return tiles
