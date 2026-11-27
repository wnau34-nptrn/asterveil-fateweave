#!/usr/bin/env python3
"""Build the eight Eira idle cels and previews from the seed and painted masks."""
import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

SEED_SHA256 = '89ae5c46336cefb82325e170ad1c0abffc2848fe18d2cc86073b935467864b4b'
SIZE = (512, 512)
FRAMES = 8
FRAME_MS = 400
CHARACTER = 'eira'
AMPLITUDE_SCALE = 0.86
GAME_SCALE = 0.42
REGIONS = {
    "hair": [
        [
            (12, 231), (62, 201), (97, 212), (157, 205), (171, 169), (212, 146), (256, 133),
            (271, 146), (253, 177), (239, 202), (249, 232), (225, 251), (174, 273), (148, 275),
            (115, 305), (117, 329), (35, 356), (9, 328),
        ],
        [
            (318, 100), (361, 108), (394, 164), (397, 218), (423, 235), (418, 266), (457, 256),
            (489, 272), (505, 305), (498, 362), (460, 385), (412, 350), (405, 309), (377, 282),
            (343, 255), (318, 225), (337, 194), (347, 165),
        ],
    ],
    "breath_chest_shoulders": [
        [
            (218, 247), (253, 228), (268, 254), (249, 284), (214, 302), (185, 294), (173, 280),
        ],
        [
            (322, 251), (352, 272), (374, 282), (381, 308), (361, 338), (330, 326), (313, 291),
        ],
    ],
    "breath_head": [
        [
            (62, 163), (101, 142), (162, 133), (225, 98), (292, 79), (390, 68), (478, 69), (472,
            110), (428, 157), (388, 181), (361, 157), (347, 119), (278, 129), (228, 166), (201,
            201), (169, 228), (111, 229), (63, 201),
        ],
        [
            (94, 82), (128, 68), (151, 43), (181, 33), (203, 51), (181, 87), (154, 104), (154,
            139), (100, 137),
        ],
    ],
    "cape": [
        [
            (7, 358), (34, 322), (90, 306), (124, 310), (180, 300), (195, 333), (156, 384), (96,
            401), (53, 388), (2, 372),
        ],
        [
            (32, 389), (119, 374), (164, 352), (212, 346), (234, 380), (210, 431), (192, 509),
            (140, 511), (104, 453), (78, 448), (79, 511), (36, 511), (46, 458), (21, 434),
        ],
        [
            (292, 401), (324, 392), (355, 389), (381, 365), (431, 344), (483, 358), (511, 382),
            (511, 478), (493, 508), (456, 511), (436, 470), (398, 500), (364, 508), (356, 475),
            (305, 491), (292, 465),
        ],
    ],
    "cloth": [
        [
            (161, 277), (178, 261), (204, 263), (224, 284), (210, 330), (184, 365), (153, 367),
            (147, 340),
        ],
        [
            (345, 298), (365, 290), (388, 308), (398, 358), (419, 377), (433, 409), (402, 420),
            (374, 386), (356, 360),
        ],
    ],
    "protected": [
        [
            (258, 162), (284, 151), (317, 150), (341, 164), (343, 194), (325, 221), (298, 232),
            (267, 225), (242, 207), (248, 179),
        ],
        [
            (117, 263), (150, 275), (173, 279), (183, 301), (174, 320), (145, 324), (102, 308),
            (101, 288),
        ],
        [
            (496, 76), (511, 72), (511, 280), (463, 281), (454, 239), (436, 266), (421, 301),
            (423, 321), (405, 330), (350, 458), (339, 479), (312, 501), (309, 473), (321, 438),
            (372, 324), (359, 314), (364, 296), (386, 286), (417, 234), (412, 206), (411, 156),
            (453, 127),
        ],
        [
            (259, 390), (289, 396), (303, 417), (293, 460), (302, 511), (225, 511), (222, 479),
            (241, 454), (246, 417),
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
        "cape": (4.5 * fabric, 0),
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
