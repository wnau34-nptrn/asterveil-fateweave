#!/usr/bin/env python3
"""Build the eight Lyra idle cels and previews from the seed and painted masks."""
import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

SEED_SHA256 = 'a0d462ce8c0469fab74e267b14e7dc73fd43fc53330a648704d63ac8a086ad3e'
SIZE = (512, 512)
FRAMES = 8
FRAME_MS = 400
CHARACTER = 'lyra'
AMPLITUDE_SCALE = 0.72
GAME_SCALE = 0.497
REGIONS = {
    "hair": [
        [
            (88, 136), (98, 83), (90, 38), (139, 24), (177, 10), (271, 7), (322, 26), (321, 69),
            (358, 113), (358, 154), (322, 194), (290, 205), (286, 172), (278, 144), (246, 135),
            (212, 131), (185, 145), (162, 163), (177, 187), (145, 203), (92, 190),
        ],
    ],
    "breath_chest_shoulders": [
        [
            (146, 196), (181, 179), (223, 189), (259, 192), (285, 210), (309, 228), (290, 254),
            (259, 250), (225, 237), (201, 218), (169, 216),
        ],
    ],
    "breath_head": [],
    "cape": [
        [
            (0, 227), (76, 227), (141, 223), (145, 248), (131, 310), (103, 361), (0, 370),
        ],
        [
            (383, 247), (511, 244), (511, 403), (457, 419), (447, 390), (410, 370), (369, 349),
            (352, 321),
        ],
        [
            (192, 386), (229, 373), (278, 420), (285, 499), (173, 493),
        ],
        [
            (302, 331), (374, 342), (438, 360), (463, 427), (445, 469), (358, 455), (338, 404),
        ],
    ],
    "cloth": [
        [
            (0, 159), (78, 153), (115, 178), (158, 175), (160, 207), (137, 235), (85, 253), (40,
            235), (0, 217),
        ],
        [
            (283, 190), (317, 189), (349, 164), (380, 163), (382, 205), (343, 235), (287, 242),
        ],
        [
            (9, 382), (66, 351), (125, 335), (145, 352), (127, 379), (119, 417), (88, 473), (50,
            475), (39, 420), (0, 436),
        ],
    ],
    "protected": [
        [
            (172, 143), (193, 131), (215, 137), (244, 139), (282, 138), (291, 171), (277, 191),
            (252, 206), (224, 205), (192, 191), (163, 170),
        ],
        [
            (501, 36), (510, 46), (380, 273), (390, 290), (372, 304), (349, 291), (326, 321),
            (302, 326), (281, 308), (277, 278), (300, 230), (323, 226),
        ],
        [
            (164, 251), (185, 242), (215, 247), (252, 263), (284, 242), (304, 256), (312, 310),
            (270, 328), (228, 323), (187, 304), (166, 284),
        ],
        [
            (90, 441), (143, 408), (170, 416), (134, 475), (121, 511), (55, 511), (57, 480),
        ],
        [
            (285, 405), (332, 415), (349, 455), (393, 482), (397, 511), (290, 511), (288, 466),
        ],
    ],
}
REFERENCE_LIMITS = {"breath_chest_shoulders": 6, "breath_head": 4, "hair": 6, "cape": 8, "cloth": 8}

LIMITS = {part: limit * AMPLITUDE_SCALE for part, limit in REFERENCE_LIMITS.items()}

def phase_weight(phase, lag=0):
    """Use a periodic signal whose displacement is zero in the seed pose."""
    return (math.cos(math.tau * lag) - math.cos(math.tau * (phase - lag))) / 2


def paint_masks(folder):
    """Rasterize traced regions with a smooth falloff and a guard around fixed details."""
    folder.mkdir(exist_ok=True)
    y, x = np.indices(SIZE)
    edge_distance = np.minimum.reduce((x, y, SIZE[0] - 1 - x, SIZE[1] - 1 - y))
    protected = Image.new("L", SIZE)
    pen = ImageDraw.Draw(protected)
    for polygon in REGIONS["protected"]:
        pen.polygon(polygon, fill=255)
    fixed = np.asarray(protected) > 0
    guard = cv2.dilate(fixed.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))) > 0
    weights = {}
    for name in LIMITS:
        region = Image.new("L", SIZE)
        pen = ImageDraw.Draw(region)
        for polygon in REGIONS[name]:
            pen.polygon(polygon, fill=255)
        eligible = (np.asarray(region) > 0) & ~guard & (edge_distance > 2)
        distance = cv2.distanceTransform(eligible.astype(np.uint8), cv2.DIST_L2, cv2.DIST_MASK_PRECISE)
        taper = np.clip((distance - 0.5) / 14, 0, 1)
        weights[name] = taper * taper * (3 - 2 * taper)

    union = np.maximum(1, sum(weights.values()))
    for name, weight in weights.items():
        Image.fromarray(np.rint(255 * weight / union).astype(np.uint8)).save(folder / f"{name}.png")
    protected.save(folder / "protected.png")


def load_masks(folder):
    masks = {}
    for part in (*LIMITS, "protected"):
        with Image.open(folder / f"{part}.png") as image:
            if image.size != SIZE or image.mode != "L":
                raise ValueError(f"{part}: expected an 8-bit 512×512 mask")
            masks[part] = np.asarray(image, dtype=np.float64) / 255
    return masks


def fields(phase, masks):
    breath = phase_weight(phase)
    hair = phase_weight(phase, 1 / 8) / ((1 + math.sqrt(0.5)) / 2)
    fabric = 2 * phase_weight(phase, 1 / 4)
    weights = {
        "breath_chest_shoulders": (0, -6 * breath),
        "breath_head": (0, -4 * breath),
        "hair": (4.8 * hair, -2.2 * hair),
        "cape": (6.0 * fabric, 0),
        "cloth": (5.0 * fabric, 0),
    }
    return {part: (dx * masks[part] * AMPLITUDE_SCALE, dy * masks[part] * AMPLITUDE_SCALE)
            for part, (dx, dy) in weights.items()}


def minimum_jacobian(parts):
    """Check orientation of the inverse mapping using finite differences."""
    dx = sum(part[0] for part in parts.values())
    dy = sum(part[1] for part in parts.values())
    dx_y, dx_x = np.gradient(dx)
    dy_y, dy_x = np.gradient(dy)
    return float(np.min((1 - dx_x) * (1 - dy_y) - dx_y * dy_x))


def sample_bilinear(image, x, y):
    left = np.floor(x).astype(np.intp)
    top = np.floor(y).astype(np.intp)
    right = np.minimum(left + 1, image.shape[1] - 1)
    bottom = np.minimum(top + 1, image.shape[0] - 1)
    horizontal = (x - left)[:, None]
    vertical = (y - top)[:, None]
    a = image[top, left] * (1 - horizontal) + image[top, right] * horizontal
    b = image[bottom, left] * (1 - horizontal) + image[bottom, right] * horizontal
    return a * (1 - vertical) + b * vertical


def warp(seed, premultiplied, x, y, parts):
    dx = sum(part[0] for part in parts.values())
    dy = sum(part[1] for part in parts.values())
    moving = (np.abs(dx) + np.abs(dy)) > 1e-9
    frame = seed.copy()
    if not moving.any():
        return frame
    sx = (x - dx)[moving]
    sy = (y - dy)[moving]
    if sx.min() < 0 or sx.max() > SIZE[0] - 1 or sy.min() < 0 or sy.max() > SIZE[1] - 1:
        raise ValueError("Warp samples beyond the source image")
    sampled = sample_bilinear(premultiplied, sx, sy)
    alpha = sampled[:, 3:]
    np.divide(sampled[:, :3] * 255, alpha, out=sampled[:, :3], where=alpha > 0)
    rounded = np.rint(np.clip(sampled, 0, 255)).astype(np.uint8)
    rounded[rounded[:, 3] == 0, :3] = 0
    # Preserve hidden RGB wherever both the seed and the output are fully transparent.
    original = seed[moving]
    hidden = (rounded[:, 3] == 0) & (original[:, 3] == 0)
    rounded[hidden] = original[hidden]
    frame[moving] = rounded
    return frame


def heatmap(seed_image, seed, frame):
    difference = np.abs(frame.astype(np.int16) - seed.astype(np.int16))
    strength = difference.max(axis=2)
    base = Image.alpha_composite(Image.new("RGBA", SIZE, "#29374a"), seed_image)
    opacity = np.where(strength > 0, np.minimum(245, 105 + 4 * strength), 0).astype(np.uint8)
    base.paste("#ff5c23", (0, 0, *SIZE), Image.fromarray(opacity))
    return base.convert("RGB")


def save_loop(path, images, duration):
    images[0].save(
        path, save_all=True, append_images=images[1:], duration=duration,
        loop=0, lossless=True, quality=100, method=4,
    )


def build(seed_path, out):
    digest = hashlib.sha256(seed_path.read_bytes()).hexdigest()
    if digest != SEED_SHA256:
        raise ValueError(f"Unexpected {CHARACTER} seed SHA-256: {digest}")
    with Image.open(seed_path) as image:
        if image.size != SIZE or image.mode != "RGBA":
            raise ValueError("Expected a 512×512 RGBA seed")
        seed_image = image.copy()
    seed = np.asarray(seed_image)
    masks = load_masks(out / "masks")
    protected = masks.pop("protected") > 0
    covered = np.logical_or.reduce([mask > 0 for mask in masks.values()])
    if np.any(covered & protected):
        raise ValueError("Motion masks overlap protected seed details")
    edge = np.zeros(covered.shape, dtype=bool)
    edge[[0, -1], :] = True
    edge[:, [0, -1]] = True
    if np.any(covered & edge):
        raise ValueError("Masks must leave all four canvas edges fixed")

    for directory in ("frames", "diff"):
        (out / directory).mkdir(parents=True, exist_ok=True)
    premultiplied = seed.astype(np.float64)
    premultiplied[:, :, :3] *= premultiplied[:, :, 3:] / 255
    y, x = np.indices(covered.shape)
    measured = dict.fromkeys(LIMITS, 0.0)
    images = []
    rows = []

    for index in range(FRAMES):
        phase = index / FRAMES
        parts = fields(phase, masks)
        jacobian = minimum_jacobian(parts)
        if jacobian <= 0:
            raise ValueError(f"Folded inverse mapping at frame {index}: {jacobian}")
        for name, (dx, dy) in parts.items():
            peak = float(np.max(np.hypot(dx, dy)))
            if peak > LIMITS[name] + 1e-9:
                raise ValueError(f"{name} displacement exceeds its limit at frame {index}")
            measured[name] = max(measured[name], peak)
        frame = warp(seed, premultiplied, x, y, parts)
        changed = np.any(frame != seed, axis=2)
        outside = int(np.count_nonzero(changed & ~covered))
        if outside or (index == 0 and changed.any()):
            raise ValueError(f"Unexpected protected pixel changes at frame {index}: {outside}")
        rendered = Image.fromarray(frame)
        filename = f"{index:03}.png"
        if index == 0:
            shutil.copyfile(seed_path, out / "frames" / filename)
        else:
            rendered.save(out / "frames" / filename)
        heatmap(seed_image, seed, frame).save(out / "diff" / filename)
        images.append(rendered)
        rows.append({"file": f"frames/{filename}", "phase": phase,
                     "changed_pixels": int(changed.sum()), "outside_mask_changed_pixels": outside,
                     "protected_changed_pixels": int(np.count_nonzero(changed & protected)),
                     "minimum_inverse_jacobian": round(jacobian, 6)})

    save_loop(out / "idle-400ms.webp", images, FRAME_MS)
    save_loop(out / "idle-200ms.webp", images, 200)
    small = [image.resize((111, 111), Image.Resampling.LANCZOS) for image in images]
    save_loop(out / "idle-111px.webp", small, FRAME_MS)
    metadata = {
        "character": CHARACTER, "game_seed_scale": GAME_SCALE, "amplitude_scale": AMPLITUDE_SCALE, "move": "idle", "seed_sha256": digest, "frame_size": list(SIZE),
        "frameMs": FRAME_MS, "loop": True, "frames": rows,
        "phase_lags": {"hair": 0.125, "cape": 0.25, "cloth": 0.25},
        "displacement_limits_px": LIMITS,
        "measured_max_displacement_px": {name: round(value, 4) for name, value in measured.items()},
    }
    (out / "strips.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--paint-masks", action="store_true", help="rebuild the checked-in masks from the traced polygons")
    args = parser.parse_args()
    if args.paint_masks:
        paint_masks(args.out / "masks")
    build(args.seed, args.out)
