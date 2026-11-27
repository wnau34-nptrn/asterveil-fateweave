#!/usr/bin/env python3
"""Build the eight Aegis idle cels and previews from the seed and painted masks."""
import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SEED_SHA256 = "0e888a0d889c61f2e4005361d43121e13478944cd3438a9ed6ca3578ee0dbaff"
SIZE = (512, 512)
FRAMES = 8
FRAME_MS = 400
LIMITS = {"breath_chest_shoulders": 6, "breath_head": 4, "hair": 6, "cape": 8, "cloth": 8}


def phase_weight(phase, lag=0):
    """Use a periodic signal whose displacement is zero in the seed pose."""
    return (math.cos(math.tau * lag) - math.cos(math.tau * (phase - lag))) / 2


def load_masks(folder):
    masks = {}
    for part in ("breath", "hair", "cape", "cloth"):
        with Image.open(folder / f"{part}.png") as image:
            if image.size != SIZE or image.mode != "L":
                raise ValueError(f"{part}: expected an 8-bit 512×512 mask")
            masks[part] = np.asarray(image, dtype=np.float64) / 255
    return masks


def fields(phase, masks, y):
    breath = phase_weight(phase)
    hair = phase_weight(phase, 1 / 8) / ((1 + math.sqrt(0.5)) / 2)
    fabric = 2 * phase_weight(phase, 1 / 4)
    upper = y < 130
    mask = masks["breath"] * (1 - masks["hair"])
    # Pin the cape at the shoulder seam, then increase travel toward the hem.
    hang = np.clip((y - 230) / (430 - 230), 0, 1)
    curtain = hang * hang * (3 - 2 * hang)
    return {
        "breath_chest_shoulders": (0, -(mask * ~upper) * 6 * breath),
        "breath_head": (0, -(mask * upper) * 4 * breath),
        "hair": (masks["hair"] * 4.8 * hair, -masks["hair"] * 2.2 * hair),
        "cape": (masks["cape"] * 6.0 * curtain * fabric, 0),
        "cloth": (masks["cloth"] * 5.0 * fabric, 0),
    }


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
        raise ValueError(f"Unexpected Aegis seed SHA-256: {digest}")
    with Image.open(seed_path) as image:
        if image.size != SIZE or image.mode != "RGBA":
            raise ValueError("Expected a 512×512 RGBA seed")
        seed_image = image.copy()
    seed = np.asarray(seed_image)
    masks = load_masks(out / "masks")
    covered = np.logical_or.reduce([mask > 0 for mask in masks.values()])
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
        parts = fields(phase, masks, y)
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
                     "changed_pixels": int(changed.sum()), "outside_mask_changed_pixels": outside})

    save_loop(out / "idle-aegis-400ms.webp", images, FRAME_MS)
    bounds = [image.getchannel("A").getbbox() for image in images]
    crop = (min(b[0] for b in bounds), min(b[1] for b in bounds),
            max(b[2] for b in bounds), max(b[3] for b in bounds))
    seed_top, seed_bottom = bounds[0][1], bounds[0][3]
    preview_scale = 111 / (seed_bottom - seed_top)
    preview_size = (round((crop[2] - crop[0]) * preview_scale),
                    round((crop[3] - crop[1]) * preview_scale))
    small = [image.crop(crop).resize(preview_size, Image.Resampling.LANCZOS) for image in images]
    save_loop(out / "idle-aegis-111px.webp", small, FRAME_MS)
    save_loop(out / "idle-aegis-200ms.webp", images, 200)
    compare = []
    w1_path = Path(__file__).resolve().parents[2] / "w1-aegis-idle" / "frames"
    for index, updated in enumerate(small):
        with Image.open(w1_path / f"{index:03}.png") as original:
            original = original.crop(crop).resize(preview_size, Image.Resampling.LANCZOS)
            panel = Image.new("RGB", (2 * preview_size[0] + 24, preview_size[1] + 28), "#29374a")
            pen = ImageDraw.Draw(panel)
            for x0, label, sprite in ((6, "W1", original), (preview_size[0] + 18, "W1b", updated)):
                pen.text((x0, 4), label, fill="white")
                panel.paste(sprite, (x0, 20), sprite)
            compare.append(panel)
    save_loop(out / "idle-aegis-w1-vs-w1b-111px.webp", compare, FRAME_MS)
    metadata = {
        "character": "aegis", "move": "idle", "seed_sha256": digest, "frame_size": list(SIZE),
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
    args = parser.parse_args()
    build(args.seed, args.out)
