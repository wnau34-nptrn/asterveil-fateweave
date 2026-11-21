#!/usr/bin/env python3
"""Rebuild art-only PNGs and 390px review fixtures from the recorded source PNGs."""

import argparse
from hashlib import sha256
from io import BytesIO
import json
import math
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent
SCOPE = "incoming/ART-UI-GACHA-003"
R = Image.Resampling.LANCZOS
NAVY = (11, 22, 44, 255)
SCREEN = (390, 844)
KEY_SIZE = (853, 1844)
CRYSTAL = (431, 683)
BASE = (426, 1187)
RESULT = (195, 347)
SAFE_Y = math.floor(SCREEN[1] * 0.70)
FACE = (149, 288, 241, 385)
PHASES = ("prepare", "peak", "settle")
SINGLE_MS = {"loom-charge": (250, 380, 120), "thread-pillar": (140, 325, 130),
             "reveal-character": (180, 460, 360), "reveal-shard": (145, 330, 295)}
TEN_REVEAL_MS = {"reveal-character": (55, 130, 65), "reveal-shard": (40, 115, 65)}
TEN_MS = (115, 370, 165)
ALT_SOURCE = {"loom-charge": "loom-charge-r2-retry", "thread-pillar": "thread-pillar-r2",
              "reveal-character": "reveal-character-r2"}
WIDTHS = {"loom-idle": 278, "loom-charge": 280, "thread-pillar": 268,
          "reveal-character": 356, "reveal-shard": 334, "ten-burst": 360, "ambient-sparkles": 30}
CARD_WINDOW = [(64, 81), (320, 81), (330, 91), (330, 419), (320, 430),
               (64, 430), (54, 419), (54, 91)]
SHARD_WINDOW = [(143, 149), (235, 112), (267, 143), (245, 216),
                (218, 244), (132, 268), (117, 236), (126, 175)]
TEN_POINTS_RAW = [(695, 238), (738, 181), (808, 159), (902, 142), (1009, 133),
                  (1115, 136), (1217, 144), (1306, 164), (1372, 190), (1394, 238)]


def dump(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def load_png(path):
    with Image.open(ROOT / path) as im:
        return im.convert("RGBA")


def png(image):
    data = BytesIO()
    image.save(data, "PNG", optimize=True)
    return data.getvalue()


def clean(image, threshold=7):
    pixels = np.array(image)
    pixels[pixels[:, :, 3] <= threshold] = 0
    return Image.fromarray(pixels)


def alpha_box(image):
    return image.getchannel("A").getbbox()


def trimmed(raw):
    image = clean(raw)
    return image.crop(alpha_box(image))


def mask(size, points):
    image = Image.new("L", size)
    ImageDraw.Draw(image).polygon(points, fill=255)
    return image


def rgba_mask(image):
    output = Image.new("RGBA", image.size, (255, 255, 255, 0))
    output.putalpha(image)
    return clean(output, 0)


def hide(image, blocked):
    output = image.copy()
    output.putalpha(ImageChops.subtract(output.getchannel("A"), blocked))
    return clean(output, 0)


def place(source, canvas_size, source_pivot, pivot, scale):
    width, height = [max(1, round(a * b)) for a, b in zip(source.size, scale)]
    sprite = source.resize((width, height), R)
    x, y = [round(target - origin * factor)
            for origin, target, factor in zip(source_pivot, pivot, scale)]
    out = Image.new("RGBA", canvas_size)
    out.alpha_composite(sprite, (x, y))
    return out


def fit(raw, canvas, available):
    sprite = trimmed(raw)
    scale = min(wanted / actual for wanted, actual in zip(available, sprite.size))
    return clean(place(sprite, canvas, (sprite.width / 2, sprite.height / 2),
                       (canvas[0] / 2, canvas[1] / 2), (scale, scale)))


def split(name, count, cuts=None, clear_top=False):
    source = load_png(f"source/{name}.png")
    cuts = cuts or [round(i * source.width / count) for i in range(count + 1)]
    cells = []
    for left, right in zip(cuts, cuts[1:]):
        cell = source.crop((left, 0, right, source.height))
        if clear_top:
            # One peripheral chip reaches the upper boundary of the source row.
            # Fade that boundary so no hard, clipped edge enters the exported canvas.
            fade = Image.new("L", (1, cell.height), 255)
            fade.paste(0, (0, 0, 1, 3))
            for row in range(3, 20):
                fade.putpixel((0, row), round((row - 3) * 255 / 17))
            cell.putalpha(ImageChops.multiply(cell.getchannel("A"), fade.resize(cell.size)))
        cells.append(clean(cell))
    return cells


def square_row(name):
    cells = split(name, 3, clear_top=name == "reveal-shard")
    pivots = {
        "loom-charge": [(368, 359), (369, 357), (345, 357)],
        "loom-charge-r2-retry": [(350, 369), (331, 368), (352, 357)],
        "reveal-character": [(360, 358), (365, 361), (356, 363)],
        "reveal-character-r2": [(363, 346), (361, 345), (367, 345)],
        "reveal-shard": [(351, 365), (361, 351), (363, 354)],
    }[name]
    extent = max(max(abs(a - x), abs(b - y), abs(c - x), abs(d - y))
                 for cell, (x, y) in zip(cells, pivots) for a, b, c, d in [alpha_box(cell)])
    scale = 237 / extent
    return [clean(place(cell, (512, 512), pivot, (256, 256), (scale, scale)))
            for cell, pivot in zip(cells, pivots)]


def tall_row(name):
    if name == "ten-burst-retry":
        cuts = [0, 600, 1465, 2172]
        pivots = [(273, 607), (438, 602), (374, 555)]
        scale = (0.625, 0.81)
    elif name == "thread-pillar":
        cuts = [0, 512, 1024, 1536]
        pivots = [(252, 900), (245, 901), (243, 901)]
        scale = (0.87, 0.87)
    else:
        cuts = [0, 450, 1040, 1536]
        pivots = [(250, 890), (319, 878), (235, 845)]
        scale = (0.76, 0.76)

    cells = split(name, 3, cuts)
    frames = [clean(place(cell, (512, 1024), source_pivot, (256, 967), scale))
              for cell, source_pivot in zip(cells, pivots)]
    points = []
    if name == "ten-burst-retry":
        # A light shear tilts the existing painted ring without changing its ten strands.
        shear = 0.105
        frames = [clean(frame.transform(frame.size, Image.Transform.AFFINE,
                  (1, 0, 0, shear, 1, -256 * shear), Image.Resampling.BICUBIC))
                  for frame in frames]
        for x, y in TEN_POINTS_RAW:
            tx = 256 + (x - cuts[1] - pivots[1][0]) * scale[0]
            ty = 967 + (y - pivots[1][1]) * scale[1] - (tx - 256) * shear
            points.append([round(tx), round(ty)])
    return frames, points


def project(point):
    return tuple(round(coordinate * target / source)
                 for coordinate, target, source in zip(point, SCREEN, KEY_SIZE))


def pivot_at(image, pivot, width, anchor):
    ratio = width / image.width
    resized = image.resize((width, round(image.height * ratio)), R)
    origin = tuple(round(a - p * ratio) for a, p in zip(anchor, pivot))
    left, top, right, bottom = alpha_box(resized)
    require(0 <= origin[0] + left and origin[0] + right <= SCREEN[0] and
            0 <= origin[1] + top and origin[1] + bottom <= SCREEN[1],
            f"Painted VFX exceeds the review viewport at {anchor}")
    out = Image.new("RGBA", SCREEN)
    out.alpha_composite(resized, origin)
    return out


def anchored_reveal(image, width):
    ratio = width / 512
    blocked = Image.new("L", image.size)
    left, top = (RESULT[0] - width / 2, RESULT[1] - width / 2)
    # A guard around the display-space face window absorbs resampling lobes.
    face = [(FACE[0] - left - 3) / ratio, (FACE[1] - top - 3) / ratio,
            (FACE[2] - left + 3) / ratio, (FACE[3] - top + 3) / ratio]
    draw = ImageDraw.Draw(blocked)
    draw.rounded_rectangle([face[0]-8, face[1]-8, face[2]+8, face[3]+8], radius=20, fill=255)
    blocked = blocked.filter(ImageFilter.GaussianBlur(3))
    ImageDraw.Draw(blocked).rectangle(face, fill=255)
    return hide(image, blocked)


def idle_frames(glint):
    raw = split("loom-idle", 4)
    phase_pivots = [(275, 361), (275, 361), (274, 361), (274, 361)]
    rings = [place(cell, (512, 512), pivot, (256, 256), (1.12, 1.12))
             for cell, pivot in zip(raw, phase_pivots)]
    # Median preserves the stable painted rings, then dims their baked glints.
    plate = np.median(np.stack([np.array(im, dtype=np.float32) for im in rings]), axis=0)
    yy, xx = np.ogrid[:512, :512]
    distance = np.hypot(xx - 256, yy - 256)
    plate[:, :, 3] *= np.where(distance < 58, 0.22, 0.56)
    base = clean(Image.fromarray(plate.astype(np.uint8)))
    glint = glint.crop(alpha_box(glint))
    frames, positions = [], []
    tilt = -0.56
    for phase in range(4):
        angle = 0.30 + phase * math.tau / 4
        pulse = Image.new("RGBA", base.size, (119, 218, 255, 0))
        pulse.putalpha(Image.fromarray(np.uint8((73 + 25 * math.cos(angle)) *
                                              np.exp(-(distance / 26) ** 2))))
        frame = Image.alpha_composite(base, pulse)
        marks = []
        for offset, size in [(0, 44), (math.pi, 27)]:
            u, v = 184 * math.cos(angle + offset), 103 * math.sin(angle + offset)
            x = round(256 + u * math.cos(tilt) - v * math.sin(tilt))
            y = round(256 + u * math.sin(tilt) + v * math.cos(tilt))
            small = ImageOps.contain(glint, (size, size), R)
            frame.alpha_composite(small, (x - small.width // 2, y - small.height // 2))
            marks.append([x, y])
        positions.append(marks)
        frames.append(clean(frame, 4))
    return frames, positions


def build_art():
    art = {}
    card_mask = mask((384, 512), CARD_WINDOW)
    shard_mask = mask((384, 384), SHARD_WINDOW)
    art["frames/mask.png"] = rgba_mask(card_mask)
    art["frames/mask-shard.png"] = rgba_mask(shard_mask)
    art["icons/fate-ticket.png"] = fit(load_png("source/fate-ticket.png"), (256, 256), (228, 228))
    art["icons/exchange-knot.png"] = fit(load_png("source/exchange-knot.png"), (256, 256), (228, 228))
    card = fit(load_png("source/character-card.png"), (384, 512), (303, 405))
    aura = fit(load_png("source/character-card-new.png"), (384, 512), (354, 482))
    shard = fit(load_png("source/character-shard.png"), (384, 384), (344, 354))
    art["frames/character-card.png"] = hide(card, card_mask)
    art["frames/character-card-new.png"] = hide(Image.alpha_composite(aura, card), card_mask)
    art["frames/character-shard.png"] = hide(shard, shard_mask)
    for n, source in enumerate(split("ambient-sparkles", 4), 1):
        art[f"vfx/ambient-sparkles-{n:02}.png"] = fit(source, (256, 256), (186, 186))
    frames, idle_marks = idle_frames(art["vfx/ambient-sparkles-01.png"])
    for n, frame in enumerate(frames, 1):
        art[f"vfx/loom-idle-{n:02}.png"] = frame
    ten_points = []
    for name in ("loom-charge", "thread-pillar", "ten-burst", "reveal-character", "reveal-shard"):
        versions = [("vfx", name)]
        if name in ALT_SOURCE:
            versions.append((f"alternatives/{name}-r2/vfx", ALT_SOURCE[name]))
        for directory, source in versions:
            if name == "ten-burst":
                frames, ten_points = tall_row("ten-burst-retry")
            elif name == "thread-pillar":
                frames, _ = tall_row(source)
            else:
                frames = square_row(source)
            if name.startswith("reveal"):
                frames = [anchored_reveal(frame, WIDTHS[name]) for frame in frames]
            for phase, frame in zip(PHASES, frames):
                art[f"{directory}/{name}-{phase}.png"] = frame
    return art, ten_points, idle_marks


def build_layers(art, ten_points, idle_marks):
    records = []
    for path, image in art.items():
        width, height = image.size
        category = Path(path).parent.name
        default = not path.startswith("alternatives/")
        pivot = [width // 2, height if height == 1024 else height // 2]
        record = {"path": path, "size": [width, height], "pivot": pivot,
                  "blend": "normal", "alpha": "straight", "alpha_bounds": alpha_box(image),
                  "loop": False, "recommended": default}
        if category == "vfx":
            family, beat = Path(path).stem.rsplit("-", 1)
            record.update(family=family, beat=beat, width_390=WIDTHS[family])
            if family in ("loom-idle", "loom-charge", "thread-pillar", "ten-burst"):
                record["anchor"] = "loom_crystal"
                record["anchor_key_art"] = list(CRYSTAL)
                if height == 1024:
                    record["pivot_anchor"] = "loom_platform"
                    record["anchor_offset_key_art"] = [b - c for b, c in zip(BASE, CRYSTAL)]
            elif family.startswith("reveal"):
                record.update(anchor="reward_center", protected_face_390=FACE)
            else:
                record["anchor"] = "decorative_spawn"
            if family == "loom-idle":
                record.update(loop=True, suggested_ms=220)
            elif family in SINGLE_MS:
                record["suggested_ms"] = SINGLE_MS[family][PHASES.index(beat)]
                if family in TEN_REVEAL_MS:
                    record["ten_short_suggested_ms"] = TEN_REVEAL_MS[family][PHASES.index(beat)]
            elif family == "ten-burst":
                record["suggested_ms"] = TEN_MS[PHASES.index(beat)]
            else:
                record["suggested_ms"] = 480
        elif category == "icons":
            record.update(anchor="dom_icon_center", width_390=24, width_range_390=[20, 48])
        else:
            record.update(anchor="reward_center", width_390=166 if path.endswith("shard.png") else 184)
            if "mask" in Path(path).stem:
                record["role"] = "portrait_clip_white_alpha"
            else:
                record["portrait_mask"] = "frames/mask-shard.png" if path.endswith("shard.png") else "frames/mask.png"
        record["sha256"] = sha256(png(image)).hexdigest()
        records.append(record)
    return {
        "schema": 1,
        "coordinates": "x/y pixels from top left; bounds use exclusive right/bottom",
        "stage_390": SCREEN,
        "key_art_size": KEY_SIZE,
        "key_art_anchors": {"loom_crystal": CRYSTAL, "loom_platform": BASE},
        "stage_anchors": {"loom_crystal": project(CRYSTAL), "loom_platform": project(BASE),
                          "reward_center": RESULT, "button_area_y_inclusive": SAFE_Y},
        "idle_glint_centers_canvas": idle_marks,
        "ten_peak_targets_canvas_left_to_right": ten_points,
        "single_suggested_ms": {reward: sum(SINGLE_MS["loom-charge"]) + sum(SINGLE_MS["thread-pillar"]) +
                                sum(SINGLE_MS[f"reveal-{reward}"]) for reward in ("character", "shard")},
        "skip": "Cut directly to the already committed reward display at any beat; timings are art proposals.",
        "layers": records,
    }


def circle_crop(image, size):
    return ImageOps.contain(image.crop(alpha_box(image)), size, R)


def reward_chip(art, kind, portrait, width):
    name = {"character": "character-card", "new": "character-card-new", "shard": "character-shard"}[kind]
    aperture_name = "mask-shard" if kind == "shard" else "mask"
    frame = art[f"frames/{name}.png"]
    aperture = art[f"frames/{aperture_name}.png"].getchannel("A")
    back = Image.new("RGBA", frame.size, (14, 28, 52, 0))
    back.putalpha(aperture)
    subject = Image.new("RGBA", frame.size)
    if kind == "shard":
        backplate = circle_crop(portrait, (171, 171))
        subject.alpha_composite(backplate, ((frame.width - backplate.width) // 2, 117))
    else:
        left, top, right, bottom = aperture.getbbox()
        backplate = ImageOps.fit(portrait, (right - left, bottom - top), R)
        subject.alpha_composite(backplate, (left, top))
    subject.putalpha(ImageChops.multiply(subject.getchannel("A"), aperture))
    back.alpha_composite(subject)
    back.alpha_composite(frame)
    return back.resize((width, round(width * frame.height / frame.width)), R)


def composite_center(base, image, xy):
    base.alpha_composite(image, (xy[0] - image.width // 2, xy[1] - image.height // 2))


def stage_fx(art, name, beat, directory="vfx"):
    image = art[f"{directory}/{name}-{beat}.png"]
    if image.height == 1024:
        pivot, anchor = (256, 1024), project(BASE)
    elif name.startswith("reveal"):
        pivot, anchor = (256, 256), RESULT
    else:
        pivot, anchor = (image.width // 2, image.height // 2), project(CRYSTAL)
    fx = pivot_at(image, pivot, WIDTHS[name], anchor)
    if fx.getchannel("A").crop((0, SAFE_Y, *SCREEN)).getbbox():
        raise ValueError(f"VFX enters button region: {directory}/{name}-{beat}")
    if name.startswith("reveal") and fx.getchannel("A").crop(FACE).getbbox():
        raise ValueError(f"VFX covers the face window: {directory}/{name}-{beat}")
    return fx


def board(panels, columns):
    gap = 12
    rows = math.ceil(len(panels) / columns)
    w, h = panels[0].size
    out = Image.new("RGBA", (columns * w + gap * (columns + 1), rows * h + gap * (rows + 1)), NAVY)
    for i, image in enumerate(panels):
        x = gap + (i % columns) * (w + gap)
        y = gap + (i // columns) * (h + gap)
        out.alpha_composite(image, (x, y))
        ImageDraw.Draw(out).rectangle((x - 1, y - 1, x + w, y + h), outline=(54, 75, 105, 255))
    return out


def review(art, ten_points):
    key_art = load_png("reference/key-art-390.png")
    navy = Image.new("RGBA", SCREEN, NAVY)
    portraits = [load_png(f"reference/{name}-portrait.png") for name in ("corin", "mira", "toma")]
    full = reward_chip(art, "new", portraits[0], 184)
    shard = reward_chip(art, "shard", portraits[1], 166)
    cards = [(f"frames/{stem}.png", reward_chip(art, kind, portraits[0 if kind != "shard" else 1],
               166 if kind == "shard" else 184)) for stem, kind in
             [("character-card", "character"), ("character-card-new", "new"), ("character-shard", "shard")]]
    crop = (0, 51, 390, 585)

    def scene(family=None, beat=None, reward=None, base=key_art):
        panel = base.copy()
        if family:
            panel.alpha_composite(stage_fx(art, family, beat))
        if reward:
            composite_center(panel, full if reward == "character" else shard, RESULT)
        return panel

    details = []
    icon_row = []
    for base in (navy, key_art):
        panel = base.copy()
        for row, name in enumerate(("fate-ticket", "exchange-knot")):
            icon = art[f"icons/{name}.png"]
            for x, size in zip((86, 185, 287), (24, 48, 104)):
                composite_center(panel, icon.resize((size, size), R), (x, 209 + 164 * row))
        icon_row.append(panel.crop(crop))
    details.extend(icon_row)
    for _, card in cards:
        for base in (navy, key_art):
            panel = base.copy()
            composite_center(panel, card, RESULT)
            details.append(panel.crop(crop))
    for path in art:
        if Path(path).parent.name != "vfx":
            continue
        family, beat = Path(path).stem.rsplit("-", 1)
        for base in (navy, key_art):
            panel = base.copy()
            if family == "ambient-sparkles":
                for x, scale in [(145, 30), (252, 96)]:
                    composite_center(panel, art[path].resize((scale, scale), R), (x, 318))
            else:
                panel.alpha_composite(stage_fx(art, family, beat, str(Path(path).parent)))
            details.append(panel.crop(crop))

    common = [scene("loom-idle", "02"), scene("loom-charge", "peak"), scene("thread-pillar", "peak")]
    single = common + [
        scene("reveal-character", "prepare"),
        scene("reveal-character", "peak", "character"),
        scene("reveal-character", "settle", "character"),
        scene("reveal-shard", "peak", "shard"),
        scene("reveal-shard", "settle", "shard"),
    ]
    ten = common + [scene("ten-burst", "peak")]
    orbit = scene("ten-burst", "settle")
    x0, y0 = project(BASE)
    ratio = WIDTHS["ten-burst"] / 512
    points = [(round(x0 + (x - 256) * ratio), round(y0 + (y - 1024) * ratio)) for x, y in ten_points]
    for index, point in enumerate(points):
        is_full = index in (2, 7)
        badge = reward_chip(art, "character" if is_full else "shard", portraits[index % 3], 30 if is_full else 35)
        composite_center(orbit, badge, point)
    ten.extend([orbit, scene("reveal-character", "peak", "character"),
                scene("reveal-shard", "peak", "shard"), orbit.copy()])
    grayscale = [ImageOps.grayscale(scene(name, "peak").convert("RGB")).convert("RGBA")
                 for name in ("reveal-character", "reveal-shard")]
    return {
        "preview-390.png": board(details, 8),
        "storyboards/single-390.png": board(single, 4),
        "storyboards/ten-390.png": board(ten, 4),
        "storyboards/reveal-grayscale-390.png": board(grayscale, 2),
    }


def require(condition, issue):
    if not condition:
        raise ValueError(issue)


def examine(path, data):
    item = {"path": path, "bytes": len(data), "sha256": sha256(data).hexdigest()}
    if path.endswith(".png"):
        with Image.open(BytesIO(data)) as check:
            check.verify()
        with Image.open(BytesIO(data)) as decoded:
            decoded.load()
            require(decoded.format == "PNG" and decoded.mode == "RGBA", f"Expected RGBA PNG: {path}")
            item.update(size=decoded.size, mode=decoded.mode)
    return item


def make_package():
    art, ten_points, idle_marks = build_art()
    require(len(ten_points) == len({tuple(point) for point in ten_points}) == 10, "Expected ten unique targets")
    peak_alpha = art["vfx/ten-burst-peak.png"].getchannel("A")
    for x, y in ten_points:
        require(peak_alpha.crop((x - 5, y - 5, x + 6, y + 6)).getextrema()[1] >= 127,
                f"Ten-burst target has no painted endpoint near {(x, y)}")
    require(len({tuple(marks[0]) for marks in idle_marks}) == 4, "Idle glint phases repeat")
    mask_checks = {"frames/character-card.png": "frames/mask.png",
                   "frames/character-card-new.png": "frames/mask.png",
                   "frames/character-shard.png": "frames/mask-shard.png"}
    for path, image in art.items():
        if path.startswith("icons/") or "/ambient-sparkles-" in path:
            expected_size = (256, 256)
        elif path in ("frames/mask-shard.png", "frames/character-shard.png"):
            expected_size = (384, 384)
        elif path.startswith("frames/"):
            expected_size = (384, 512)
        elif "/thread-pillar-" in path or "/ten-burst-" in path:
            expected_size = (512, 1024)
        else:
            expected_size = (512, 512)
        require(image.mode == "RGBA" and image.size == expected_size, f"Format or dimensions differ: {path}")
        bounds = alpha_box(image)
        require(bounds is not None and min(bounds[0], bounds[1], image.width - bounds[2],
                 image.height - bounds[3]) >= 12, f"Alpha margin violation: {path} {bounds}")
        require(image.getchannel("A").getextrema()[0] == 0, f"Missing true alpha: {path}")
        if path in mask_checks:
            blocked = art[mask_checks[path]].getchannel("A")
            require(not ImageChops.multiply(image.getchannel("A"), blocked).getbbox(),
                    f"Portrait aperture obstruction: {path}")
    art_meta = build_layers(art, ten_points, idle_marks)
    out = {path: png(image) for path, image in art.items()}
    runtime = [path for path in art if not path.startswith("alternatives/") and "/mask" not in path]
    alternative_bytes = sum(len(value) for path, value in out.items() if path.startswith("alternatives/"))
    packed = {}
    for path in art:
        if "/mask" in path:
            continue
        target = BytesIO()
        # Estimates production lossless payload. No WebP or game atlas is written.
        art[path].save(target, "WEBP", lossless=True, method=6, exact=True)
        packed[path] = target.tell()
    alternatives = {family: {
        "r1_estimated_lossless_webp_bytes": sum(packed[f"vfx/{family}-{beat}.png"] for beat in PHASES),
        "r2_estimated_lossless_webp_bytes": sum(packed[f"alternatives/{family}-r2/vfx/{family}-{beat}.png"]
                                               for beat in PHASES),
    } for family in ALT_SOURCE}
    out.update({path: png(image) for path, image in review(art, ten_points).items()})
    out["layers.json"] = dump(art_meta)
    static_paths = {"NOTES.md", "build_handoff.py", "requirements.txt", "prompts.json"}
    raw = sorted(path.relative_to(ROOT).as_posix() for path in (ROOT / "source").glob("*.png"))
    refs = sorted(path.relative_to(ROOT).as_posix() for path in (ROOT / "reference").glob("*.png"))
    prompts = json.loads((ROOT / "prompts.json").read_bytes())
    require(sorted(attempt["raw"] for attempt in prompts["attempts"]) == raw, "Raw sources and prompt log disagree")
    static_paths.update(raw + refs)
    inventory = {p: (ROOT / p).read_bytes() for p in static_paths}
    inventory.update(out)
    validation = {
        "schema": 1,
        "generated_pngs": len([path for path in out if path.endswith(".png")]),
        "shipping_rgba_layers_including_alternatives_and_masks": len(art),
        "source_pngs": len(raw),
        "primary_runtime_png_bytes": sum(len(out[p]) for p in runtime),
        "primary_runtime_estimated_lossless_webp_bytes": sum(packed[p] for p in runtime),
        "alternative_png_bytes": alternative_bytes,
        "all_runtime_variants_estimated_lossless_webp_bytes": sum(packed.values()),
        "replacement_cost_by_variant": alternatives,
        "largest_primary_pngs": sorted(
            ({"path": p, "bytes": len(out[p])} for p in runtime),
            key=lambda item: item["bytes"], reverse=True)[:4],
        "button_region_start_y_390": SAFE_Y,
        "protected_face_390": FACE,
        "status": {"canvas_margins": "pass", "portrait_masks": "pass",
                   "reveal_face_and_button_region_in_390_fixture": "pass",
                   "ten_terminal_positions": "pass", "idle_glint_phases": "pass",
                   "owner_approval": "pending"},
        "manifest_self_sha256": "Excluded to avoid circular hashing. Compare the manifest bytes separately.",
        "files": [examine(p, inventory[p]) for p in sorted(inventory)],
    }
    out["validation.json"] = dump(validation)
    return out, validation


def git_output(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def verify(saved, read_file, actual_names):
    expected_names = {item["path"] for item in saved["files"]} | {"validation.json"}
    require(expected_names == set(actual_names), "File inventory differs")
    for item in saved["files"]:
        received = examine(item["path"], read_file(item["path"]))
        require(dump(received) == dump(item), f"Remote/working bytes failed validation: {item['path']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--verify", action="store_true", help="Rebuild in memory and verify the working package.")
    mode.add_argument("--git-ref", help="Verify the actual Git blobs at this fetched ref against the local manifest.")
    args = parser.parse_args()
    if args.git_ref:
        tree = git_output("ls-tree", "--full-tree", "-rz", "--name-only", args.git_ref, "--", SCOPE)
        names = [path.decode().removeprefix(SCOPE + "/") for path in tree.split(b"\x00") if path]

        def read_file(path):
            return git_output("show", f"{args.git_ref}:{SCOPE}/{path}")

        manifest = read_file("validation.json")
        require(manifest == (ROOT / "validation.json").read_bytes(), "Fetched manifest bytes differ")
        saved = json.loads(manifest)
        verify(saved, read_file, names)
        print(f"{args.git_ref}: {len(names)} files verified, manifest SHA-256 {sha256(manifest).hexdigest()}")
        return

    outputs, validation = make_package()
    if args.verify:
        manifest = (ROOT / "validation.json").read_bytes()
        require(manifest == outputs["validation.json"], "Rebuilt manifest differs")
        verify(json.loads(manifest), lambda path: (ROOT / path).read_bytes(),
               [p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*") if p.is_file()])
    else:
        for name, payload in outputs.items():
            output = ROOT / name
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(payload)
    print(f"{len(validation['files']) + 1} files, {validation['primary_runtime_png_bytes']:,} runtime PNG bytes, "
          f"{validation['primary_runtime_estimated_lossless_webp_bytes']:,} lossless WebP bytes (estimate)")


if __name__ == "__main__":
    main()
