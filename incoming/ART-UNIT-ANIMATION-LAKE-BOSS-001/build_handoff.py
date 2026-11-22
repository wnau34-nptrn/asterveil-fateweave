#!/usr/bin/env python3
"""Build and verify the Water Spirit art handoff with Pillow, NumPy and OpenCV."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
ART = REPO / "public/assets/art"
CELL = 1024
SOLE = 896
GUTTER = 80
RESAMPLE = Image.Resampling.LANCZOS
BASE = "72c3d0584c0b98c8267314b7d89461a5ac589e4f"
ATLAS = "public/assets/art/units_foes.webp"
SEED_CROP = (0, 2048, 512, 2560)
BODY_BEATS = ("wind-up", "anticipation", "contact", "follow-through")
FX_BEATS = ("prepare", "peak", "settle")

# Source-space windows isolate the painted shapes on the original contact sheet.
EFFECTS = {
    "water-veil": {
        "name": "Water Veil", "anchor": "boss centre",
        "pivot": [128, 133], "ms": [200, 180, 220], "canvasPx": [144, 156, 130],
        "windows": [[0, 110, 325, 370], [333, 12, 735, 369], [750, 143, 1086, 364]],
        "paintWidth": [202, 216, 184], "bottom": 201,
    },
    "surging-wave": {
        "name": "Surging Wave", "anchor": "affected target feet",
        "pivot": [167, 211], "ms": [170, 120, 220], "canvasPx": [74, 94, 76],
        "windows": [[0, 521, 313, 750], [321, 384, 734, 749], [741, 575, 1086, 747]],
        "paintWidth": [172, 222, 205], "bottom": 218,
    },
    "great-wave": {
        "name": "Great Wave", "anchor": "hero side, local copies at the affected feet",
        "pivot": [128, 211], "ms": [140, 210, 220], "canvasPx": [93, 104, 94],
        "windows": [[0, 947, 270, 1041], [267, 837, 797, 1043], [792, 939, 1086, 1044]],
        "paintWidth": [192, 232, 219], "bottom": 218,
        "cascadeScale": [1.0, 0.91, 0.80, 0.70, 0.60], "cascadeStepMs": 42,
    },
    "reflection": {
        "name": "Reflection", "anchor": "Mirror Shade summon slot b2 at the feet",
        "pivot": [128, 214], "ms": [170, 180, 240], "canvasPx": [67, 80, 73],
        "windows": [[5, 1275, 316, 1402], [323, 1068, 742, 1420], [731, 1275, 1080, 1402]],
        "paintWidth": [187, 214, 201], "bottom": 220,
    },
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_json(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def rgba(path):
    with Image.open(path) as image:
        assert image.mode in ("RGB", "RGBA"), (path, image.mode)
        return image.convert("RGBA")


def art(name):
    return rgba(ART / (name + ".webp"))


def clean(image, components=True):
    """Remove the generator's near-transparent matte outside the painted silhouette."""
    arr = np.array(image)
    alpha = arr[..., 3]
    if components:
        count, labels, stats, _ = cv2.connectedComponentsWithStats((alpha >= 18).astype("uint8"))
        retain = stats[:, cv2.CC_STAT_AREA] >= 12
        retain[0] = False
        fringe = cv2.dilate(retain[labels].astype("uint8"), np.ones((5, 5), np.uint8))
        alpha[fringe == 0] = 0
    alpha[alpha <= 8] = 0
    arr[alpha == 0] = 0
    return Image.fromarray(arr)


def solid(image, threshold=64):
    box = image.getchannel("A").point(lambda level: 255 if level >= threshold else 0).getbbox()
    if box is None:
        raise ValueError("Missing painted pixels")
    return box


def clear_margin(image, pixels):
    x0, y0, x1, y1 = image.getbbox()
    assert min(x0, y0, image.width - x1, image.height - y1) >= pixels, (image.size, image.getbbox())


def place(image, scale, ground, pivot, sole):
    width, height = (round(axis * scale) for axis in image.size)
    sprite = image.resize((width, height), RESAMPLE)
    left, top = round(pivot - ground[0] * scale), round(sole - ground[1] * scale)
    result = Image.new("RGBA", (CELL, CELL))
    box = sprite.getbbox()
    assert left + box[0] >= 16 and top + box[1] >= 16, (left, top, box)
    assert left + box[2] <= CELL - 16 and top + box[3] <= CELL - 16, (left, top, box)
    result.alpha_composite(sprite, (left, top))
    return result


def cell_sheet(frames):
    strip = Image.new("RGBA", (len(frames) * CELL + (len(frames) - 1) * GUTTER, CELL))
    for index, frame in enumerate(frames):
        strip.paste(frame, (index * (CELL + GUTTER), 0))
    return strip


def actor_cell(sheet, index):
    image = art(sheet)
    x = 512 * (index % 2)
    y = 512 * (index // 2)
    return image.crop((x, y, x + 512, y + 512))


def body_assets(layout):
    atlas_seed = actor_cell("units_foes", 8)
    atlas_seed.save(ROOT / "seeds/sentinel-cell8.png")
    source = clean(rgba(ROOT / "sources/water-spirit-idle.png"))
    bounds = solid(atlas_seed)
    # Shipped boss logical canvas is twice the zero-based 512px atlas cell.
    height = bounds[3] - bounds[1]
    scale = height / (solid(source)[3] - solid(source)[1])
    idle = place(source, scale, layout["idleGround"], 512, SOLE)
    idle.save(ROOT / "seeds/water-spirit-idle.png")
    write_json("seeds.json", {
        "baseCommit": BASE,
        "standIn": {"art": "foe_sentinel", "atlas": ATLAS, "atlasSha256": sha((REPO / ATLAS).read_bytes()),
                    "cellZeroBased": 8, "crop": SEED_CROP, "file": "seeds/sentinel-cell8.png",
                    "rgbaSha256": sha(atlas_seed.tobytes()), "atlasSoleY": 497},
        "idle": {"file": "seeds/water-spirit-idle.png", "source": "sources/water-spirit-idle.png",
                 "facing": "left", "cell": [CELL, CELL], "origin": [512, SOLE], "sourceScale": scale,
                 "heightReferencePx": height, "rgbaSha256": sha(idle.tobytes())},
    })
    clips = {}
    frames_by_id = {}
    for entry in layout["body"]:
        clip_id = entry["id"]
        source_path = f"sources/{clip_id}.png"
        source = rgba(ROOT / source_path)
        frames = []
        for x0, x1, root_x, sole_y in entry["poses"]:
            sprite = clean(source.crop((x0, 0, x1, source.height)))
            frame = place(sprite, entry["scale"], [root_x - x0, sole_y], 512, SOLE)
            clear_margin(frame, 16)
            frames.append(frame)
        strip = cell_sheet(frames)
        strip_path = f"raw/{clip_id}.png"
        strip.save(ROOT / strip_path)
        for index in range(len(frames) - 1):
            x = index * (CELL + GUTTER) + CELL
            assert strip.crop((x, 0, x + GUTTER, CELL)).getbbox() is None
        beats = BODY_BEATS if len(frames) == 4 else entry["beats"]
        clips[clip_id] = {
            "intentOrReaction": entry["name"], "recommended": entry["recommended"],
            "source": source_path, "raw": strip_path, "facing": "left", "frameCount": len(frames),
            "cells": [[i * (CELL + GUTTER), 0, CELL, CELL] for i in range(len(frames))],
            "bounds": [frame.getbbox() for frame in frames], "alpha64Bounds": [solid(frame) for frame in frames],
            "sourcePoseWindowsAndAnchors": entry["poses"], "sourceSharedScale": entry["scale"],
            "frameOrder": beats,
        }
        if len(frames) == 4:
            clips[clip_id]["previewOrder"] = ["idle", *beats, "idle"]
        frames_by_id[clip_id] = frames
    index = 1
    for clip_id, data in clips.items():
        if data["recommended"]:
            data["suggestedClipIndices"] = list(range(index, index + data["frameCount"]))
            index += data["frameCount"]
    assert index == 30
    write_json("strips.json", {"cellSize": [CELL, CELL], "gutterPx": GUTTER,
                              "soleOrigin": SOLE / CELL, "idleIndex": 0, "clips": clips})
    return idle, frames_by_id


def effect_assets():
    sheet = rgba(ROOT / "sources/vfx.png")
    layers = {}
    for effect, info in EFFECTS.items():
        assets = []
        for stage, window, width in zip(FX_BEATS, info["windows"], info["paintWidth"]):
            patch = clean(sheet.crop(window))
            patch = patch.crop(patch.getbbox())
            height = round(width * patch.height / patch.width)
            if height > 194:
                width = round(width * 194 / height)
                height = 194
            patch = patch.resize((width, height), RESAMPLE)
            layer = Image.new("RGBA", (256, 256))
            layer.alpha_composite(patch, ((256 - width) // 2, info["bottom"] - height))
            clear_margin(layer, 8)
            path = f"vfx/{effect}-{stage}.png"
            layer.save(ROOT / path)
            assets.append({"beat": stage, "file": path, "bounds": layer.getbbox(), "sourceCrop": window})
        layers[effect] = {**info, "layers": assets}
    write_json("layers.json", {"size": [256, 256], "coordinates": "256px canvas, x/y from top left",
                              "source": "sources/vfx.png", "effects": layers})
    return layers


def body_preview(idle, frames_by_id):
    # Two full gameplay-scale samples per row, no text in the artwork.
    groups = [[idle], *frames_by_id.values()]
    panel_h, gap = 140, 5
    result_h = sum((len(group) + 1) // 2 * panel_h for group in groups) + gap * (len(groups) - 1)
    result = Image.new("RGB", (390, result_h), "#30495c")
    y = 0
    for group in groups:
        for index in range((len(group) + 1) // 2 * 2):
            col, row = index % 2, index // 2
            panel = Image.new("RGBA", (195, panel_h), "#162d40" if col else "#102537")
            ImageDraw.Draw(panel).line((14, 125, 181, 125), fill="#345169")
            if index < len(group):
                paste_body(panel, group[index], 96, 125, 118)
            result.paste(panel, (col * 195, y + row * panel_h))
        y += (len(group) + 1) // 2 * panel_h + gap
    result.save(ROOT / "preview-390.png")


def paste_body(panel, body, x, y, size):
    logical = size * 2
    body = body.resize((logical, logical), RESAMPLE)
    panel.alpha_composite(body, (round(x - logical / 2), round(y - logical * SOLE / CELL)))


def render_battle(frames_by_id, layers):
    # Compact mock for 390px, following the current field layout's four column fractions.
    field_h = 376
    background = ImageOps.fit(art("battle_riftline"), (390, field_h), method=RESAMPLE)
    background = Image.alpha_composite(background, Image.new("RGBA", background.size, (7, 25, 42, 126)))
    hero_layout = [(144, 101), (144, 212), (45, 101), (45, 323), (144, 323)]
    heroes = [*(actor_cell("units", i) for i in range(4)), actor_cell("units_mercs", 6)]
    crab = actor_cell("units_foes2", 8)
    wisp = actor_cell("units_foes2", 7)
    shade = actor_cell("units_foes", 9)
    boss_at, shade_at = (295, 212), (345, 323)
    others = [(246, 323), (345, 101)]
    panels = []
    safety = {}
    for effect, info in layers.items():
        for stage, entry in enumerate(info["layers"]):
            view = background.copy()
            effects = Image.new("RGBA", view.size)
            masks = Image.new("L", view.size)
            mask = ImageDraw.Draw(masks)
            actors = [*hero_layout, boss_at, *others]
            if effect == "reflection" and stage > 0:
                actors.append(shade_at)
            for x, y in actors:
                mask.rectangle((x - 32, y + 2, x + 32, y + 19), fill=255)
                if (x, y) == boss_at:
                    mask.rectangle((x - 31, y - 126, x + 28, y - 76), fill=255)
                else:
                    mask.rectangle((x - 18, y - 72, x + 18, y - 42), fill=255)
                    mask.rectangle((x + 14, y - 83, x + 43, y - 56), fill=255)

            if effect == "water-veil":
                targets = [(boss_at[0], boss_at[1] - 47, 1)]
            elif effect == "surging-wave":
                targets = [(*hero_layout[0], 1)]
            elif effect == "great-wave":
                # Sample the cascade at three points. Each target has its own delayed local beat.
                sequence = [hero_layout[i] for i in (0, 1, 4, 2, 3)]
                multipliers = info["cascadeScale"]
                targets = [(x, y, s) for (x, y), s in zip(sequence, multipliers)]
            else:
                targets = [(*shade_at, 1)]

            for index, (x, y, scale) in enumerate(targets):
                local = stage
                if effect == "great-wave":
                    time = (49, 263, 481)[stage] - index * info["cascadeStepMs"]
                    if time < 0:
                        continue
                    prepare, peak, _ = info["ms"]
                    local = 0 if time < prepare else 1 if time < prepare + peak else 2
                size = round(info["canvasPx"][local] * scale)
                layer = rgba(ROOT / info["layers"][local]["file"]).resize((size, size), RESAMPLE)
                px, py = info["pivot"]
                effects.alpha_composite(layer, (round(x - size * px / 256), round(y - size * py / 256)))
            alpha = effects.getchannel("A")
            protected = ImageChops.multiply(alpha, masks)
            effects.putalpha(ImageChops.subtract(alpha, masks))
            overlap = ImageChops.multiply(effects.getchannel("A"), masks)
            assert overlap.getbbox() is None and effects.getbbox() is not None
            safety[f"{effect}/{FX_BEATS[stage]}"] = {
                "maskedPixels": sum(protected.histogram()[1:]),
                "protectedOverlapPixels": sum(overlap.histogram()[1:]),
            }
            view.alpha_composite(effects)
            for (x, y), hero in zip(hero_layout, heroes):
                view.alpha_composite(hero.resize((69, 69), RESAMPLE), (x - 34, y - 67))
            for (x, y), stand_in in zip(others, (crab, wisp)):
                view.alpha_composite(stand_in.resize((65, 65), RESAMPLE), (x - 32, y - 63))
            pose = frames_by_id[f"{effect}-r1"][stage + 1]
            paste_body(view, pose, *boss_at, 118)
            if shade_at in actors:
                x, y = shade_at
                echo = shade.resize((66, 66), RESAMPLE)
                if stage == 1:
                    echo.putalpha(echo.getchannel("A").point(lambda value: round(value * .54)))
                view.alpha_composite(echo, (x - 33, y - 64))
            draw = ImageDraw.Draw(view)
            for x, y in actors:
                draw.rounded_rectangle((x - 21, y + 4, x + 21, y + 9), 2, fill="#253d50", outline="#a1afba")
                draw.rounded_rectangle((x - 19, y + 6, x + 12, y + 7), 1, fill="#96bd82")
            panels.append(view.convert("RGB"))
    board = Image.new("RGB", (390, len(panels) * (field_h + 6) - 6), "#324b61")
    for index, panel in enumerate(panels):
        board.paste(panel, (0, index * (field_h + 6)))
    board.save(ROOT / "storyboard-390.png")
    return safety


def audit(idle, frames_by_id):
    with TemporaryDirectory(prefix="lake-boss-audit-") as directory:
        temp = Path(directory)
        cells = temp / "water-spirit"
        cells.mkdir()
        ids = ["idle"]
        for clip_id, frames in frames_by_id.items():
            ids.extend(f"{clip_id}/{i + 1}" for i in range(len(frames)))
        frames = [idle, *(frame for frames in frames_by_id.values() for frame in frames)]
        for index, frame in enumerate(frames):
            frame.resize((512, 512), RESAMPLE).save(cells / f"{index:03}.png")
        out = temp / "audit.json"
        env = {**os.environ, "OPENCV_FOR_THREADS_NUM": "2"}
        process = subprocess.run([sys.executable, str(REPO / "scripts/unit-anatomy-audit.py"),
                                  "--cells", str(cells), "--json", str(out)], env=env, check=False)
        report = json.loads(out.read_text())
        for label, row in zip(ids, report["report"]["water-spirit"]):
            row["pose"] = label
        report["exitCode"] = process.returncode
        return report


def file_inventory():
    known = {}
    for file in sorted(ROOT.rglob("*")):
        if not file.is_file() or file.name == "validation.json" or "__pycache__" in file.parts:
            continue
        data = file.read_bytes()
        entry = {"sha256": sha(data), "bytes": len(data)}
        if file.suffix == ".png":
            with Image.open(file) as image:
                image.load()
                entry.update(size=list(image.size), mode=image.mode)
        known[file.relative_to(ROOT).as_posix()] = entry
    return known


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.verify:
        report = read_json("validation.json")
        assert report["files"] == file_inventory(), "Package differs from validation.json"
        assert report["anatomy"]["exitCode"] == 0, "Anatomy audit reported drift"
        print(f"Verified {len(report['files'])} files and decoded each PNG")
        return
    layout = read_json("source-layout.json")
    idle, frames = body_assets(layout)
    layers = effect_assets()
    body_preview(idle, frames)
    safety = render_battle(frames, layers)
    report = audit(idle, frames)
    write_json("validation.json", {"baseCommit": BASE, "files": file_inventory(),
                                  "storyboardSafety": safety, "anatomy": report})
    if report["exitCode"]:
        raise SystemExit("Anatomy audit reported drift")


if __name__ == "__main__":
    main()
