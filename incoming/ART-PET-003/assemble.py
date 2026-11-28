#!/usr/bin/env python3
"""Rebuild the ART-PET-003 atlases, reviews and manifest from approved seeds.

Requires Python 3.10+, Pillow with WebP support, and NumPy.
Run from a checkout with: python incoming/ART-PET-003/assemble.py
"""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
SIZE = 256
SOLE = 240
R = Image.Resampling
EGG_COLUMNS = (
    "egg_idle", "egg_wobble_l", "egg_wobble_r", "egg_crack_1",
    "egg_crack_2", "egg_crack_3", "egg_open",
)
WALK_COLUMNS = ("walk_a", "walk_b", "walk_c", "walk_d")
ICONS = ("luck", "forage", "farsight", "ward", "lantern", "renewal")
# Coordinates are local to the approved idle_a cells, with far and near
# legs paired diagonally. Smaller lifts on far paws preserve their overlap.
LEGS = (
    ((94, 183, 1, 1), (135, 199, -1, .72), (166, 191, -1, 1), (198, 198, 1, .8)),
    ((47, 180, 1, 1), (88, 199, -1, .72), (122, 200, -1, 1), (165, 205, 1, .8)),
    (),
    ((83, 186, 1, 1), (124, 202, -1, .72), (157, 192, -1, 1), (202, 199, 1, .8)),
    ((127, 203, 1, 1), (170, 203, -1, 1)),
    (),
)
RIM = [(60, 152), (79, 160), (89, 151), (102, 166), (118, 156),
       (128, 166), (143, 150), (154, 161), (173, 152), (196, 156)]


def blank(w=SIZE, h=SIZE):
    return Image.new("RGBA", (w, h))


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def cell(x, y, w=SIZE, h=SIZE, foot=SOLE):
    return {"x": x, "y": y, "w": w, "h": h, "footY": foot}


def crop(image, frame):
    x, y, w, h = (frame[k] for k in ("x", "y", "w", "h"))
    return image.crop((x, y, x + w, y + h))


def rgba(path):
    with Image.open(path) as image:
        return image.convert("RGBA")


def alpha_box(image):
    return image.getchannel("A").getbbox()


def shifted(image, dx, dy):
    result = blank(*image.size)
    result.alpha_composite(image, (dx, dy))
    return result


def clean_alpha(image):
    alpha = image.getchannel("A").point([0] * 8 + list(range(8, 256)))
    image.putalpha(alpha)
    result = blank(*image.size)
    result.alpha_composite(image)
    return result


def save_webp(image, path):
    clean_alpha(image).save(path, lossless=True, method=6)


def smoothstep(x, start, end):
    t = np.clip((x - start) / (end - start), 0, 1)
    return t * t * (3 - 2 * t)


def warp(image, displacement):
    # Invert the continuous displacement on a 4 px mesh. The same source
    # pixels and anchor are used across the strip, including the loop seam.
    spacing = 4
    dest_y, dest_x = np.mgrid[0:SIZE + 1:spacing, 0:SIZE + 1:spacing].astype(float)
    src_x, src_y = dest_x.copy(), dest_y.copy()
    for _ in range(9):
        dx, dy = displacement(src_x, src_y)
        src_x = dest_x - dx
        src_y = dest_y - dy
    mesh = []
    for row in range(SIZE // spacing):
        for col in range(SIZE // spacing):
            top, left = row * spacing, col * spacing
            corners = ((row, col), (row + 1, col), (row + 1, col + 1), (row, col + 1))
            source = tuple(coord for r, c in corners for coord in (src_x[r, c], src_y[r, c]))
            mesh.append(((left, top, left + spacing, top + spacing), source))
    return clean_alpha(image.transform(image.size, Image.Transform.MESH, mesh, R.BICUBIC))


def walk_frame(seed, row, phase):
    if row == 5:
        # Contact squash, takeoff stretch, floating apex, landing stretch.
        sx, sy, rise = ((1.035, .91, 0), (.951, 1.09, 5),
                        (1.00, .98, 18), (.978, 1.04, 7))[phase]
        return warp(seed, lambda x, y: ((x - 128) * (sx - 1), (y - SOLE) * (sy - 1) - rise))

    if row == 2:
        # The wing sections rotate around their own root. The body stays
        # centered, with the whole creature rising above its virtual sole.
        sweep_l, sweep_r, rise = ((-10, 10, 9), (1, -2, 5), (14, -15, 0), (2, -1, 4))[phase]

        def wings(x, y):
            left = 1 - smoothstep(x, 105, 148)
            right = smoothstep(x, 170, 208)
            height = 1 - .55 * smoothstep(y, 141, 205)
            hinge_x, hinge_y = 148, 168
            turn = np.deg2rad(sweep_l * left + sweep_r * right) * height
            dx, dy = x - hinge_x, y - hinge_y
            return dx * (np.cos(turn) - 1) - dy * np.sin(turn), dy * (np.cos(turn) - 1) + dx * np.sin(turn) - rise

        return warp(seed, wings)

    stride = (1, 0, -1, 0)[phase]
    passing = (0, 1, 0, -1)[phase]
    bob = (-2, 1, -2, 1)[phase]

    def grounded(x, y):
        dx = np.zeros_like(x)
        dy = bob * (1 - smoothstep(y, 180, 231))
        for foot_x, joint_y, pair, weight in LEGS[row]:
            bend = smoothstep(y, joint_y, 236)
            influence = np.maximum(0, 1 - ((x - foot_x) / 31) ** 2) ** 2 * bend
            dx += influence * pair * stride * weight * (11 if row == 4 else 15)
            dy -= influence * max(0, -pair * passing) * weight * (16 if row == 4 else 13)
        if row == 0:
            tail = (1 - smoothstep(x, 62, 111)) * smoothstep(y, 129, 155)
            dy += tail * (3 * stride - 2 * passing)
        if row == 1:
            dy += (1 - smoothstep(y, 107, 153)) * 3 * passing
        if row == 3:
            dy += (1 - smoothstep(x, 93, 136)) * (1 - smoothstep(y, 138, 166)) * 3 * passing
        if row == 4:
            belly = np.exp(-((x - 156) / 34) ** 2 - ((y - 199) / 27) ** 2)
            dx += belly * (8 * stride + 4 * passing)
            dx += (1 - smoothstep(y, 185, 222)) * 3 * stride
            dy += belly * (x - 156) * .08 * stride
        return dx, dy

    frame = warp(seed, grounded)
    return shifted(frame, 0, SOLE + 1 - alpha_box(frame)[3])


def mask_polygon(points, size=(SIZE, SIZE)):
    supersample = 3
    width, height = size
    mask = Image.new("L", (width * supersample, height * supersample))
    ImageDraw.Draw(mask).polygon([(x * supersample, y * supersample) for x, y in points], fill=255)
    return mask.resize(size, R.LANCZOS)


def masked(image, mask):
    result = image.copy()
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint16)
    coverage = np.asarray(mask, dtype=np.uint16)
    result.putalpha(Image.fromarray(((alpha * coverage + 127) // 255).astype(np.uint8)))
    return clean_alpha(result)


def crack(egg, paths, shade, sheen):
    ink = blank(SIZE * 3, SIZE * 3)
    draw = ImageDraw.Draw(ink)
    for points in paths:
        xyz = [(x * 3, y * 3) for x, y in points]
        draw.line([(x, y + 4) for x, y in xyz], fill=sheen, width=7, joint="curve")
        draw.line(xyz, fill=shade, width=7, joint="curve")
    alpha = egg.getchannel("A")
    surface = masked(ink.resize(egg.size, R.LANCZOS), alpha)
    frame = egg.copy()
    frame.alpha_composite(surface)
    frame.putalpha(alpha)
    return frame


def open_egg(egg, tint, shade, sheen):
    top = masked(egg, mask_polygon([(60, 0), (196, 0), *reversed(RIM)]))
    bottom = masked(egg, mask_polygon([*RIM, (196, 255), (60, 255)]))
    top = crack(top, [RIM], shade, sheen)
    bottom = crack(bottom, [RIM], shade, sheen)
    mouth = blank()
    draw = ImageDraw.Draw(mouth)
    draw.ellipse((68, 137, 188, 186), fill=shade, outline=sheen, width=2)
    draw.ellipse((75, 144, 182, 184), fill=tint)
    for inset in range(25):
        # A soft gradient inside the opening. The silhouette stays crisp.
        t = inset / 24
        color = tuple(round(a + (b - a) * t) for a, b in zip(tint, (255, 252, 218)))
        draw.ellipse((76 + inset * 1.45, 145 + inset * .7, 181 - inset * 1.45, 185 - inset * .48), fill=color)
    result = blank()
    result.alpha_composite(mouth)
    result.alpha_composite(bottom)
    result.alpha_composite(shifted(top.rotate(13, R.BICUBIC, center=(128, 155)), -6, -38))
    return result


def fragments(egg, shade, sheen):
    polygons = (
        [(101, 105), (119, 96), (128, 113), (117, 139), (104, 124), (91, 121)],
        [(147, 112), (173, 130), (171, 147), (142, 153), (157, 131)],
        [(82, 162), (96, 156), (120, 166), (111, 189), (94, 181), (80, 183)],
        [(132, 169), (146, 161), (156, 174), (181, 170), (175, 192), (148, 193)],
        [(75, 200), (94, 191), (110, 201), (104, 211), (86, 218)],
        [(119, 209), (135, 194), (160, 200), (168, 216), (147, 228), (126, 222)],
    )
    for polygon, angle in zip(polygons, (-32, 23, -14, 42, -49, 12)):
        edged = crack(egg, [polygon + [polygon[0]]], shade, sheen)
        shard = masked(edged, mask_polygon(polygon))
        shard = shard.crop(alpha_box(shard))
        shard = shard.resize((round(shard.width * 1.18), round(shard.height * 1.18)), R.LANCZOS)
        shard = shard.rotate(angle, R.BICUBIC, expand=True)
        frame = blank(128, 128)
        frame.alpha_composite(shard, ((128 - shard.width) // 2, (128 - shard.height) // 2))
        yield frame


def diamond(cx, cy, w, h, neck=.21):
    return [(cx, cy-h), (cx+w*neck, cy-h*neck), (cx+w, cy),
            (cx+w*neck, cy+h*neck), (cx, cy+h), (cx-w*neck, cy+h*neck),
            (cx-w, cy), (cx-w*neck, cy-h*neck)]


def flash(beat, color):
    scale = 3
    frame = blank(SIZE * scale, SIZE * scale)
    draw = ImageDraw.Draw(frame)

    def star(cx, cy, w, h, fill):
        draw.polygon([(round(x * scale), round(y * scale)) for x, y in diamond(cx, cy, w, h)], fill=fill)

    # Three discrete energy poses, with transparent space between rays.
    rgb = color[:3]
    if beat < 2:
        w, h = ((32, 42), (55, 68))[beat]
        star(128, 155, w, h, (*rgb, 218))
        star(128, 155, w * .60, h * .62, (255, 251, 223, 255))
    for i, (x, y) in enumerate(((94, 107), (168, 113), (83, 167), (175, 170), (144, 204), (112, 86))):
        spread = (0.74, 1, 1.47)[beat]
        cx, cy = 128 + (x-128) * spread, 153 + (y-153) * spread
        w, h = ((4, 10), (7, 13), (4, 8))[beat]
        star(cx, cy, w + i % 2, h, (*rgb, (234, 255, 158)[beat]))
        if beat == 1:
            star(cx, cy, w * .55, h * .55, (255, 251, 223, 255))
    return frame.resize((SIZE, SIZE), R.LANCZOS)


def build_egg(egg, palette, path):
    shade, sheen, tint = palette
    main = [(76, 151), (90, 151), (102, 166), (118, 156), (128, 166),
            (143, 150), (154, 161), (173, 152), (190, 155)]
    paths = [[main[:4], [(102, 166), (106, 179), (103, 185)]],
             [main[:7], [(102, 166), (106, 179), (103, 185)], [(128, 166), (138, 179), (134, 196)]],
             [main, [(90, 151), (99, 134), (97, 123)], [(102, 166), (106, 179), (103, 185)],
              [(128, 166), (138, 179), (134, 196), (147, 207)], [(154, 161), (164, 182), (175, 189)]]]
    atlas = blank(7 * SIZE, 2 * SIZE)
    poses = (egg, egg.rotate(8, R.BICUBIC, center=(128, SOLE)),
             egg.rotate(-8, R.BICUBIC, center=(128, SOLE)),
             *(crack(egg, pattern, shade, sheen) for pattern in paths),
             open_egg(egg, tint, shade, sheen))
    frames = {}
    for index, (name, pose) in enumerate(zip(EGG_COLUMNS, poses)):
        atlas.alpha_composite(pose, (index * SIZE, 0))
        frames[name] = cell(index * SIZE, 0)
    for index, shard in enumerate(fragments(egg, shade, sheen)):
        atlas.alpha_composite(shard, (index * 128, SIZE))
        frames[f"egg_fragment_{index + 1}"] = cell(index * 128, SIZE, 128, 128, 64)
    for index in range(3):
        x = (3 + index) * SIZE
        atlas.alpha_composite(flash(index, tint), (x, SIZE))
        frames[f"egg_flash_{index + 1}"] = cell(x, SIZE)
    save_webp(atlas, path)
    return frames


def normalize_source(source, bounds, area, anchor=SOLE):
    fragment = clean_alpha(source.crop(bounds))
    box = alpha_box(fragment)
    fragment = fragment.crop(box)
    fragment.thumbnail(area, R.LANCZOS)
    result = blank()
    result.alpha_composite(fragment, ((SIZE - fragment.width) // 2, anchor + 1 - fragment.height))
    return result


def make_seed_atlas(prop_path, icon_path, output):
    props = rgba(prop_path)
    icons = rgba(icon_path)
    prop_boxes = ((173, 147, 494, 552), (718, 147, 1044, 555), (1298, 147, 2033, 584))
    icon_boxes = ((104, 92, 451, 462), (575, 92, 916, 445), (1053, 110, 1476, 441),
                  (92, 559, 451, 956), (616, 541, 908, 956), (1114, 581, 1437, 947))
    if props.size != (2172, 724) or icons.size != (1536, 1024):
        raise ValueError("Source sizes differ from the recorded generation sheets")
    seeds = blank(3 * SIZE, 2 * SIZE)
    for i, (box, cap) in enumerate(zip(prop_boxes, ((132, 152), (132, 152), (224, 138)))):
        seeds.alpha_composite(normalize_source(props, box, cap), (i * SIZE, 0))
    for i, box in enumerate(icon_boxes):
        seed = normalize_source(icons, box, (110, 110), anchor=182)
        fragment = seed.crop(alpha_box(seed))
        x = i * 128 + (128 - fragment.width) // 2
        y = SIZE + (128 - fragment.height) // 2
        seeds.alpha_composite(fragment, (x, y))
    save_webp(seeds, output)


def build_walk(source, seeds, output):
    atlas = blank(4 * SIZE, 6 * SIZE)
    frames = {}
    for row, pet in enumerate(seeds["rows"]):
        original = crop(source, seeds["frames"][f"{pet}_idle_a"])
        for index, phase in enumerate(WALK_COLUMNS):
            name = f"{pet}_{phase}"
            frames[name] = cell(index * SIZE, row * SIZE)
            atlas.alpha_composite(walk_frame(original, row, index), (index * SIZE, row * SIZE))
    save_webp(atlas, output / "pets_walk.webp")
    return frames


def build_den(prop_seeds, egg, output):
    empty = crop(prop_seeds, cell(512, 0))
    occupied = empty.copy()
    # Seat the egg in the cushion well and keep all basket pixels registered.
    shell = egg.crop(alpha_box(egg)).resize((56, 70), R.LANCZOS)
    occupied.alpha_composite(shell, (98, 121))
    packing = blank(2 * SIZE, SIZE)
    packing.alpha_composite(empty)
    packing.alpha_composite(occupied, (SIZE, 0))
    save_webp(packing, output / "pet_den.webp")
    return {"den_empty": cell(0, 0), "den_egg_waiting": cell(SIZE, 0)}


def paint(target, sprite, x, y, size, frame=None):
    if frame is not None:
        sprite = crop(sprite, frame)
    target.alpha_composite(sprite.resize((size, size), R.LANCZOS), (x, y))


def label(image, text, x, y, size=12, color="#ded8bf"):
    ImageDraw.Draw(image).text((x, y), text, font=ImageFont.load_default(size=size), fill=color)


def heading(image, title, y):
    ImageDraw.Draw(image).line((16, y + 10, 374, y + 10), fill="#374556")
    text_width = ImageFont.load_default(size=14).getlength(title)
    ImageDraw.Draw(image).rectangle((13, y, 24 + text_width, y + 22), fill="#111b2a")
    label(image, title, 16, y, 14, "#f6dc9b")


def backdrop(art, w, h, centering):
    return ImageOps.fit(art, (w, h), R.LANCZOS, centering=centering)


def build_preview(root, output, frames, source, seeds):
    eggs = (rgba(output / "egg.webp"), rgba(output / "egg_r2.webp"))
    walk = rgba(output / "pets_walk.webp")
    den = rgba(output / "pet_den.webp")
    icons = rgba(output / "pet_blessing_icons.webp")
    tiles = rgba(root / "public/assets/world/tileset.webp")
    camp = rgba(root / "public/assets/lobby/lobby_bg.webp")
    tile_coords = ((0, 0), (1, 0), (2, 2), (0, 7), (0, 1), (0, 3))
    grounds = [crop(tiles, cell(x * 128, y * 128, 128, 128)).resize((48, 48), R.LANCZOS)
               for x, y in tile_coords]
    names = ("Meadow fox", "Thicket piglet", "Rift crystal moth",
             "Fort gargoyle pup", "Forest lantern owl", "Gate starveil slime")
    board = Image.new("RGBA", (390, 849), "#111b2a")
    label(board, "Asterveil / Fateweave", 16, 9, 23, "#fff1cb")
    label(board, "Pet hatch, walk cycles and camp den", 17, 40, 13, "#adb8c6")
    heading(board, "Hatch options", 67)
    for row, (name, sheet) in enumerate(zip(("R1  Gold", "R2  Cream"), eggs)):
        y = 93 + row * 86
        label(board, name, 16, y, 12, "#fff1cb")
        for i, pose in enumerate(EGG_COLUMNS):
            paint(board, sheet, 14 + i * 52, y + 13, 48, frames["egg.webp"][pose])
        for i, title in enumerate(("Idle", "Left", "Right", "Crack 1", "Crack 2", "Crack 3", "Open")):
            label(board, title, 18 + i * 52, y + 62, 10, "#afbccc")
    label(board, "Fragments and flash beats", 16, 267, 12)
    for row, sheet in enumerate(eggs):
        y = 283 + row * 27
        label(board, f"R{row+1}", 16, y + 5, 11)
        for i in range(6):
            paint(board, sheet, 44 + i * 32, y - 3, 28, frames["egg.webp"][f"egg_fragment_{i+1}"])
        for i in range(3):
            paint(board, sheet, 247 + i * 41, y - 7, 40, frames["egg.webp"][f"egg_flash_{i+1}"])
    heading(board, "Walk cycles / 48 px", 342)
    for i, title in enumerate(("A", "B", "C", "D")):
        label(board, title, 159 + 61 * i, 367, 10, "#acbac9")
    for i, (name, pet, tile) in enumerate(zip(names, seeds["rows"], grounds)):
        y = 383 + 51 * i
        label(board, name, 16, y + 19, 12, "#eadfc4")
        for j, phase in enumerate(WALK_COLUMNS):
            x = 139 + j * 61
            board.alpha_composite(tile, (x, y))
            paint(board, walk, x, y, 48, frames["pets_walk.webp"][f"{pet}_{phase}"])
    heading(board, "Camp pet den", 697)
    for x, title, pose in ((16, "Empty", "den_empty"), (200, "Egg waiting", "den_egg_waiting")):
        y = 723
        board.alpha_composite(backdrop(camp, 174, 69, (.5, .73)), (x, y))
        paint(board, den, x + 47, y - 24, 80, frames["pet_den.webp"][pose])
        label(board, title, x + 2, y + 70, 10)
    for i, name in enumerate(ICONS):
        x = 17 + i * 61
        paint(board, icons, x, 814, 24, frames["pet_blessing_icons.webp"][name])
        label(board, name, x + 26, 820, 9)
    board.convert("RGB").save(output / "preview_390.png", optimize=True)

    # Review playback only. The existing game owns the hatch mechanics
    # and the integration will choose its walk cadence.
    motion = Image.new("RGBA", (390, 487), "#111b2a")
    label(motion, "Asterveil / Pet motion", 16, 10, 23, "#fff1cb")
    heading(motion, "Hatch options", 47)
    label(motion, "R1  Gold", 60, 69, 12)
    label(motion, "R2  Cream", 254, 69, 12)
    heading(motion, "Walk loops / 48 px", 193)
    for i, name in enumerate(names):
        x = 16 + (i % 2) * 184
        y = 223 + (i // 2) * 79
        label(motion, name, x, y, 12)
        for j in range(3):
            motion.alpha_composite(grounds[i], (x + 48 * j, y + 17))
    label(motion, "Walk sample 10 fps   /   Hatch sample pet: meadow fox", 16, 469, 11, "#afbccc")
    happy = crop(source, seeds["frames"]["meadow_fox_happy"])
    wobble = (0, 2, -2, 1, 0, 4, -4, 5, -3, 0, 7, -8, 8, -5)
    sequence = []
    for step in range(32):
        frame = motion.copy()
        for x, atlas in zip((37, 231), eggs):
            egg = crop(atlas, frames["egg.webp"]["egg_idle"])
            if step < 14:
                egg = egg.rotate(wobble[step], R.BICUBIC, center=(128, SOLE))
            elif step < 17:
                egg = crop(atlas, frames["egg.webp"][f"egg_crack_{step-13}"])
            else:
                egg = crop(atlas, frames["egg.webp"]["egg_open"])
            paint(frame, egg, x, 74, 96)
            if 17 <= step < 20:
                beat = step - 17
                for i in range(6):
                    dx, dy = ((-13, -10), (15, -13), (-22, 1), (23, 0), (-19, 14), (17, 12))[i]
                    travel = 1 + .58 * beat
                    paint(frame, atlas, x + 33 + round(dx * travel), 108 + round(dy * travel), 30,
                          frames["egg.webp"][f"egg_fragment_{i+1}"])
                paint(frame, atlas, x, 74, 96, frames["egg.webp"][f"egg_flash_{beat+1}"])
            if step >= 20:
                paint(frame, happy, x + 23, 114 + (4 if step == 20 else 0), 50)
        for i, pet in enumerate(seeds["rows"]):
            x = 64 + (i % 2) * 184
            y = 240 + (i // 2) * 79
            phase = WALK_COLUMNS[step % 4]
            paint(frame, walk, x, y, 48, frames["pets_walk.webp"][f"{pet}_{phase}"])
        sequence.append(frame.convert("RGB"))
    sequence[0].save(output / "motion_390.webp", save_all=True, append_images=sequence[1:],
                     duration=100, loop=0, method=4, quality=92)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def entry(path):
    result = {"sha256": sha256(path), "bytes": path.stat().st_size}
    if path.suffix.lower() not in (".png", ".webp"):
        return result
    with Image.open(path) as im:
        result.update({"dimensions": list(im.size), "mode": im.mode, "decodedFrames": im.n_frames})
        for index in range(im.n_frames):
            im.seek(index)
            im.load()
        im.seek(0)
        alpha = im.convert("RGBA").getchannel("A")
        result.update({"transparentCorners": all(alpha.getpixel(p) == 0 for p in corners(im.size)),
                       "alphaExtrema": list(alpha.getextrema())})
    return result


def corners(size):
    w, h = size
    return [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]


def audit(output, frame_sets):
    files = {p.name: entry(p) for p in sorted(output.iterdir())
             if p.is_file() and p.name != "validation.json"}
    for filename, frames in frame_sets.items():
        atlas = rgba(output / filename)
        checks = {}
        for name, specification in frames.items():
            frame = crop(atlas, specification)
            alpha = frame.getchannel("A")
            box = alpha.getbbox()
            clear = all(alpha.getpixel(p) == 0 for p in corners(frame.size))
            if not clear or box is None or not (0 < box[0] < box[2] < frame.width and
                                                0 < box[1] < box[3] < frame.height):
                raise ValueError(f"{filename} {name}: opaque corner, empty cell or edge clipping")
            solid = alpha.point([0] * 128 + [255] * 128).getbbox()
            checks[name] = {"transparentCorners": clear, "alphaExtrema": list(alpha.getextrema()),
                            "alphaBounds": list(box), "solidBounds": list(solid) if solid else None}
            grounded_walk = filename == "pets_walk.webp" and not name.startswith(("rift_", "gate_"))
            if grounded_walk and box[3] != SOLE + 1:
                raise ValueError(f"{name}: sole y is {box[3] - 1}, expected {SOLE}")
        if filename in ("egg.webp", "egg_r2.webp"):
            shell = crop(atlas, frames["egg_idle"]).getchannel("A").tobytes()
            for stage in range(1, 4):
                fracture = crop(atlas, frames[f"egg_crack_{stage}"]).getchannel("A").tobytes()
                if fracture != shell:
                    raise ValueError(f"{filename}: crack stage {stage} changes silhouette alpha")
        files[filename]["frames"] = checks
    return {"hashAlgorithm": "SHA-256", "selfDigest": "Compare the manifest byte-for-byte across checkouts",
            "files": files}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=HERE.parents[1])
    parser.add_argument("--output", type=Path, default=HERE)
    parser.add_argument("--bootstrap-sources", nargs=2, type=Path, metavar=("PROPS_PNG", "ICONS_PNG"))
    parser.add_argument("--verify", action="store_true", help="Decode and verify every file against validation.json")
    args = parser.parse_args()
    output = args.output.resolve()
    if args.verify:
        expected = read_json(output / "validation.json")
        metadata = read_json(output / "strips.json")
        actual = audit(output, {name: info["frames"] for name, info in metadata["atlases"].items()})
        if actual != expected:
            differing = sorted(name for name in set(expected["files"]) | set(actual["files"])
                               if expected["files"].get(name) != actual["files"].get(name))
            raise SystemExit("Manifest mismatch: " + ", ".join(differing or ["validation metadata"]))
        print(f"Verified SHA-256 for {len(actual['files'])} files and decoded all images and animation frames.")
        return

    root = args.root.resolve()
    output.mkdir(parents=True, exist_ok=True)
    if args.bootstrap_sources:
        make_seed_atlas(*args.bootstrap_sources, output / "prop_seeds.webp")
    seed_path = "incoming/ART-PET-002"
    approved_map = read_json(root / seed_path / "pets.json")
    source = rgba(root / seed_path / "pets.webp")
    props = rgba(output / "prop_seeds.webp")
    seeds = {
        "approvedPets": {"image": f"{seed_path}/pets.webp", "framesFile": f"{seed_path}/pets.json",
                         "imageSHA256": sha256(root / seed_path / "pets.webp"),
                         "frames": {f"{pet}_idle_a": approved_map["frames"][f"{pet}_idle_a"]
                                    for pet in approved_map["rows"]}},
        "generatedProps": {"image": "prop_seeds.webp",
                           "frames": {"egg_r1": cell(0, 0), "egg_r2": cell(SIZE, 0),
                                      "den_empty": cell(2 * SIZE, 0),
                                      **{name: cell(i * 128, SIZE, 128, 128, 64)
                                         for i, name in enumerate(ICONS)}}},
        "reviewBackdrop": ["public/assets/world/tileset.webp", "public/assets/lobby/lobby_bg.webp"],
        "placement": {"anchorX": 128, "footY": SOLE, "solePixelY": SOLE, "facing": "right"},
    }
    dump(output / "seeds.json", seeds)
    egg_r1 = crop(props, cell(0, 0))
    egg_r2 = crop(props, cell(SIZE, 0))
    frames = {
        "egg.webp": build_egg(egg_r1, ((99, 50, 45), (255, 220, 131), (255, 194, 101)), output / "egg.webp"),
        "egg_r2.webp": build_egg(egg_r2, ((63, 82, 73), (255, 241, 189), (169, 233, 213)), output / "egg_r2.webp"),
        "pets_walk.webp": build_walk(source, approved_map, output),
        "pet_den.webp": build_den(props, egg_r1, output),
        "pet_blessing_icons.webp": {name: cell(i * 128, 0, 128, 128, 64) for i, name in enumerate(ICONS)},
        "prop_seeds.webp": seeds["generatedProps"]["frames"],
    }
    save_webp(props.crop((0, SIZE, 6 * 128, SIZE + 128)), output / "pet_blessing_icons.webp")
    dump(output / "strips.json", {
        "coordinates": "All rectangles are in atlas pixels. footY is local. Center X is half the cell width.",
        "hatch": {"provisional": "egg.webp", "alternate": "egg_r2.webp", "wobbleMs": 1400,
                  "rattles": 3, "burstMs": 300, "petPose": "happy"},
        "walk": {"facing": "right", "mirrorForLeft": True, "loop": list(WALK_COLUMNS),
                 "rows": approved_map["rows"], "virtualBaselineRows": ["rift_crystal_moth", "gate_starveil_slime"]},
        "atlases": {name: {"dimensions": list(rgba(output / name).size), "frames": record}
                    for name, record in frames.items()},
    })
    build_preview(root, output, frames, source, approved_map)
    dump(output / "validation.json", audit(output, frames))


if __name__ == "__main__":
    main()
