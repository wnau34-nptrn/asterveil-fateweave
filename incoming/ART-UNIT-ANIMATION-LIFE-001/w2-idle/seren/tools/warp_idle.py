#!/usr/bin/env python3
"""Build the eight Seren idle cels and previews from the seed and painted masks."""
import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

SEED_SHA256 = '0298b7eeffbdaee5937847c7071e654286d2c2631a5f6d7bbea1598db72a6c0d'
SIZE = (512, 512)
FRAMES = 8
FRAME_MS = 400
CHARACTER = 'seren'
AMPLITUDE_SCALE = 1.0
GAME_SCALE = 0.359
REGIONS = {
    "hair": [
        [
            (121, 146), (147, 122), (197, 117), (195, 94), (209, 54), (202, 32), (219, 12),
            (269, 7), (284, 26), (335, 38), (325, 62), (338, 101), (332, 145), (296, 185), (272,
            176), (279, 140), (269, 124), (229, 132), (196, 152), (178, 176), (153, 181), (118,
            174),
        ],
    ],
    "breath_chest_shoulders": [
        [
            (109, 171), (148, 163), (182, 171), (211, 189), (235, 201), (237, 227), (213, 246),
            (188, 242), (157, 230), (128, 227), (112, 213),
        ],
        [
            (239, 183), (279, 177), (299, 191), (293, 215), (312, 237), (332, 241), (330, 261),
            (298, 260), (266, 242), (247, 229),
        ],
    ],
    "breath_head": [],
    "cape": [
        [
            (1, 277), (65, 234), (112, 228), (131, 249), (111, 290), (131, 334), (130, 377),
            (108, 400), (76, 390), (38, 423), (0, 423),
        ],
        [
            (338, 276), (380, 275), (419, 303), (468, 315), (495, 355), (479, 406), (466, 455),
            (419, 452), (411, 412), (381, 408), (350, 374), (327, 348),
        ],
        [
            (153, 391), (186, 372), (214, 378), (241, 420), (286, 418), (327, 446), (311, 471),
            (269, 493), (178, 495), (155, 470),
        ],
    ],
    "cloth": [
        [
            (8, 391), (59, 362), (96, 392), (140, 365), (202, 348), (218, 374), (181, 408),
            (148, 452), (113, 501), (72, 480), (41, 451), (0, 469),
        ],
        [
            (217, 329), (241, 323), (263, 334), (267, 387), (284, 431), (293, 475), (239, 477),
            (206, 475), (201, 443), (206, 401),
        ],
        [
            (288, 336), (311, 340), (351, 365), (394, 391), (428, 429), (423, 476), (366, 494),
            (348, 454), (316, 417),
        ],
    ],
    "protected": [
        [
            (125, 52), (154, 50), (169, 27), (197, 14), (210, 32), (212, 67), (198, 98), (164,
            125), (128, 151), (104, 146), (100, 127), (112, 104),
        ],
        [
            (167, 128), (185, 122), (204, 130), (223, 125), (264, 127), (281, 142), (279, 170),
            (254, 193), (220, 198), (199, 187), (180, 176), (160, 163), (149, 144),
        ],
        [
            (104, 217), (130, 229), (148, 242), (145, 267), (128, 294), (105, 296), (75, 278),
            (75, 245),
        ],
        [
            (433, 0), (463, 0), (459, 47), (491, 54), (505, 120), (480, 154), (434, 175), (392,
            175), (380, 209), (379, 241), (383, 257), (367, 277), (341, 357), (320, 374), (309,
            354), (335, 272), (327, 257), (343, 229), (354, 213), (358, 179), (333, 154), (317,
            122), (326, 85), (337, 48), (363, 20), (382, 37),
        ],
        [
            (133, 451), (164, 423), (187, 436), (166, 471), (162, 505), (150, 511), (108, 511),
            (111, 484),
        ],
        [
            (292, 427), (320, 430), (340, 462), (361, 490), (359, 511), (279, 511), (272, 483),
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
        "cape": (3.8 * fabric, 0),
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
