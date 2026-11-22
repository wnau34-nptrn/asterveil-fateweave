"""Build ART-WORLD-LAKE-001 with Python 3.11+, Pillow and numpy.

Run python package_assets.py to pack, render and validate. Run with --verify to
check a shipped copy without writing any outputs.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
from sources.paint_tiles import LUMA, SIZE, build_tiles, smooth

OUT = Path(__file__).resolve().parent
SOURCE = OUT / "sources"
BAND = 12
SCREEN_TILE = 60
IMAGE_SUFFIXES = {".png", ".webp"}
WATER = {"~", "="}
FLOOR = {".": "shore", "S": "shore", ",": "isle", ";": "pavilion", ":": "sanctum",
         "B": "sanctum", "G": "sanctum"}
PROPS = {
    "moon_lantern_off": ("isle", 105), "moon_lantern_on": ("isle", 105),
    "moored_skiff": ("shore", 108), "weathered_dock_post": ("shore", 88),
    "lakeside_shrine": ("isle", 114), "merchant_raft": ("isle", 112),
    "reed_clump": ("isle", 106), "rune_reflection_stone": ("shore", 102),
    "oar_pile": ("shore", 96),
}
REF_SIZE = (1536, 1024)
HORIZON = .45
FIELD_HORIZON = .27
# Measured sky/water/terrace landmarks in the refined source. Reframing
# places the terrace beneath the highest 5v5 review soles.
SOURCE_WATER_Y = 423
SOURCE_TERRACE_Y = 499
TERRACE_Y = 448
SCENIC_WATERLINE_Y = 422


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def open_image(path):
    with Image.open(path) as image:
        image.load()
        return image.copy()


def save_atlas(name, frames, cols, metadata=None):
    rows = (len(frames) + cols - 1) // cols
    atlas = Image.new("RGBA", (cols * SIZE, rows * SIZE))
    index = {}
    for i, (key, frame) in enumerate(frames.items()):
        x, y = (i % cols) * SIZE, (i // cols) * SIZE
        atlas.paste(frame, (x, y))
        index[key] = {"x": x, "y": y, "w": SIZE, "h": SIZE}
        if metadata:
            index[key].update(metadata[key])
    atlas.save(OUT / f"{name}.png", optimize=True)
    atlas.save(OUT / f"{name}.webp", lossless=True, method=6, exact=True)
    save_json(f"{name}.json", index)
    return atlas, index


def extract_props():
    source = open_image(SOURCE / "decor_lake_generated.png")
    assert source.mode == "RGBA"
    rgba = np.asarray(source).copy()
    # Remove isolated 1–8/255 alpha flecks in the source's transparent gutters.
    rgba[rgba[:, :, 3] <= 8] = 0
    source = Image.fromarray(rgba)
    frames, meta = {}, {}
    for i, (name, (zone, longest_side)) in enumerate(PROPS.items()):
        col, row = i % 3, i // 3
        cell = source.crop((source.width * col // 3, source.height * row // 3,
                            source.width * (col + 1) // 3, source.height * (row + 1) // 3))
        bounds = cell.getchannel("A").getbbox()
        assert bounds and all(edge >= 2 for edge in
                              (bounds[0], bounds[1], cell.width - bounds[2], cell.height - bounds[3])), (name, bounds)
        prop = cell.crop(bounds)
        prop.thumbnail((longest_side, longest_side), Image.Resampling.LANCZOS)
        bounds = prop.getchannel("A").getbbox()
        assert bounds
        prop = prop.crop(bounds)
        tile = Image.new("RGBA", (SIZE, SIZE))
        tile.paste(prop, ((SIZE - prop.width) // 2, 124 - prop.height))
        frames[name] = tile
        meta[name] = {"anchor": {"x": .5, "y": 1}, "footY": 124, "zone": zone}

    # Both states share the same roof, stone and alpha. Mix the generated
    # light chamber onto that stable body, feathering around the pillars.
    unlit = np.asarray(frames["moon_lantern_off"]).copy()
    lit = np.asarray(frames["moon_lantern_on"])
    yy, xx = np.indices((SIZE, SIZE))
    lamp = smooth((1 - np.sqrt(((xx - 63) / 16) ** 2 + ((yy - 67) / 15) ** 2)) * 2.3)
    weight = (lamp * (lit[:, :, 3] / 255))[..., None]
    unlit[:, :, :3] = np.rint(unlit[:, :, :3] * (1 - weight) + lit[:, :, :3] * weight)
    unlit[unlit[:, :, 3] == 0] = 0
    frames["moon_lantern_on"] = Image.fromarray(unlit)
    return frames, meta


def shore_edge(water, neighbors):
    """Blend the water side up to 12 px into adjacent land from any floor family.

    Each cardinal edge samples the touching terrain row or column. The
    diagonal terms carry that fade between water cells around shoreline bends.
    """
    yy, xx = np.indices((SIZE, SIZE))
    weighted = np.zeros((SIZE, SIZE, 3))
    total = np.zeros((SIZE, SIZE))
    remaining = np.ones((SIZE, SIZE))
    for (dx, dy), land in neighbors.items():
        a = np.asarray(land)[:, :, :3]
        distance_x = (xx if dx < 0 else SIZE - 1 - xx) if dx else 0
        distance_y = (yy if dy < 0 else SIZE - 1 - yy) if dy else 0
        land_x = (SIZE - 1 if dx < 0 else 0) if dx else xx
        land_y = (SIZE - 1 if dy < 0 else 0) if dy else yy
        weight = (1 - smooth(np.hypot(distance_x, distance_y) / BAND))
        # Cardinal samples own the edge. Diagonals taper around the corners.
        if dx and dy:
            weight *= .5
        weighted += weight[..., None] * a[land_y, land_x]
        total += weight
        remaining *= 1 - weight
    base = np.asarray(water)[:, :, :3]
    value = np.divide(weighted, total[..., None], out=np.zeros_like(weighted), where=total[..., None] > 0)
    mixed = (1 - remaining[..., None]) * value + remaining[..., None] * base
    result = np.uint8(np.rint(mixed))
    for (dx, dy), land in neighbors.items():
        a = np.asarray(land)[:, :, :3]
        if dx and dy:
            continue
        # Keep the contact edge exact, with the corners handled by the blend.
        if dx:
            result[1:-1, 0 if dx < 0 else -1] = a[1:-1, -1 if dx < 0 else 0]
        else:
            result[0 if dy < 0 else -1, 1:-1] = a[-1 if dy < 0 else 0, 1:-1]
    return Image.fromarray(result).convert("RGBA")


def map_preview(rows, families, tide, center, size, tile_px):
    width, height = size
    cols, lines = len(rows[0]), len(rows)
    assert len(rows) == 30 and all(len(row) == 21 for row in rows)
    # Position of the field is an art-review camera. Map geometry comes
    # directly from the frozen revision in sources/map_rows.json.
    ox, oy = (round(width / 2 - center[0] * tile_px), round(height / 2 - center[1] * tile_px))
    family_frames = {name: tuple(items.values()) for name, items in families.items()}

    def char(x, y):
        return rows[y][x] if 0 <= x < cols and 0 <= y < lines else "#"

    def floor(c, y):
        return ("shore" if y >= 18 else "isle") if c == "C" else FLOOR.get(c)

    def get_frame(name, x, y):
        # Unsigned 32-bit arithmetic mirrors world-art.ts cellHash.
        mask = 0xffffffff
        h = (((x + 1) * 0x27d4eb2d) ^ ((y + 1) * 0x165667b1) ^ 0x9e3779b9) & mask
        h = ((h ^ (h >> 15)) * 0x85ebca6b) & mask
        h ^= h >> 13
        frames = family_frames[name]
        return frames[h % len(frames)]

    scene = Image.new("RGBA", size, "#142333")
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            sx, sy = ox + x * tile_px, oy + y * tile_px
            if sx + tile_px <= 0 or sx >= width or sy + tile_px <= 0 or sy >= height:
                continue
            if c == "#":
                key = "lake_wall_face" if char(x, y + 1) != "#" else "lake_wall_inner"
                if key == "lake_wall_inner" and any(char(x + dx, y + dy) != "#"
                                                    for dy in (-1, 0, 1) for dx in (-1, 0, 1)):
                    key = "lake_wall_top"
                tile = get_frame(key, x, y)
            elif c in WATER:
                tile = get_frame("deep" if c == "=" else tide, x, y)
                adjacent = {}
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
                    key = floor(char(x + dx, y + dy), y + dy)
                    if key:
                        adjacent[(dx, dy)] = get_frame(key, x + dx, y + dy)
                if adjacent:
                    tile = shore_edge(tile, adjacent)
            else:
                tile = get_frame(floor(c, y), x, y)
            scene.alpha_composite(tile.resize((tile_px, tile_px), Image.Resampling.LANCZOS), (sx, sy))
    return scene.convert("RGB")


def lower_moon(source):
    # Move the original disc and its glow out of the top crop, preserving
    # the source sky and the moonlit reflection on the same horizontal axis.
    sky = np.asarray(source, dtype=float).copy()
    x, old_y, new_y, radius = 651, 183, 274, 148
    offsets = np.arange(-radius, radius + 1)
    yy, xx = np.meshgrid(offsets, offsets, indexing="ij")
    distance = np.hypot(xx, yy)
    fade = smooth((radius - distance) / 68)[..., None]
    old_rows = old_y + offsets
    new_rows = new_y + offsets
    cols = slice(x - radius, x + radius + 1)
    original = sky[old_rows, cols].copy()
    left = sky[old_rows, x - radius - 5:x - radius].mean(axis=1)
    right = sky[old_rows, x + radius + 1:x + radius + 6].mean(axis=1)
    # Smooth the reference samples vertically so wisps outside the patch
    # do not turn into horizontal streaks across otherwise clear sky.
    offsets_y = np.arange(-21, 22)
    kernel = np.exp(-.5 * (offsets_y / 8) ** 2)
    kernel /= kernel.sum()
    left, right = (
        np.array([np.convolve(channel, kernel, mode="valid")
                  for channel in np.pad(samples, ((21, 21), (0, 0)), mode="edge").T]).T
        for samples in (left, right)
    )
    mix_x = (xx / (2 * radius) + .5)[..., None]
    blue = left[:, None, :] * (1 - mix_x) + right[:, None, :] * mix_x
    sky[old_rows, cols] = original * (1 - fade) + blue * fade

    target = sky[new_rows, cols]
    glow = np.maximum(0, original - blue) * smooth((110 - distance) / 39)[..., None]
    disc = smooth((65 - distance) / 8)[..., None]
    sky[new_rows, cols] = (target + glow) * (1 - disc) + original * disc
    return Image.fromarray(np.uint8(np.clip(np.rint(sky), 0, 255)))

def backdrop():
    source = lower_moon(open_image(SOURCE / "bg_lake_generated.png").convert("RGB"))
    assert source.size == REF_SIZE
    width, height = REF_SIZE
    result = Image.new("RGB", REF_SIZE)
    landmarks = [(0, 0), (SOURCE_WATER_Y, SCENIC_WATERLINE_Y), (SOURCE_TERRACE_Y, TERRACE_Y), (height, height)]
    for (sy0, dy0), (sy1, dy1) in zip(landmarks, landmarks[1:]):
        strip = source.crop((0, sy0, width, sy1))
        result.paste(strip.resize((width, dy1 - dy0), Image.Resampling.LANCZOS), (0, dy0))
    result.save(OUT / "bg_lake.webp", lossless=True, method=6)
    return result


def figure(draw, x, y, size, enemy):
    color, ink, ring, face = ("#ddcde9", "#2c2a40", "#bca1ed", -1) if enemy else (
        "#d2e7df", "#253c47", "#7edbd8", 1)
    s = size
    draw.ellipse((x - s * .34, y - 4, x + s * .34, y + 6), outline=ring, width=2)
    draw.ellipse((x - s * .12, y - s * .83, x + s * .12, y - s * .60),
                 fill=ink, outline=color, width=2)
    draw.polygon([(x + face * s * .1, y - s * .77), (x + face * s * .19, y - s * .71),
                  (x + face * s * .08, y - s * .68)], fill=color)
    draw.polygon([(x - s * .22, y - s * .58), (x + s * .22, y - s * .58),
                  (x + s * .17, y - s * .28), (x + s * .11, y - 2), (x + s * .03, y - 2),
                  (x, y - s * .23), (x - s * .04, y - 2), (x - s * .13, y - 2),
                  (x - s * .18, y - s * .28)], fill=ink, outline=color, width=2)
    draw.rectangle((x - s * .31, y + 11, x + s * .31, y + 17), fill="#111e2e", outline=color)
    draw.rectangle((x - s * .28, y + 13, x + s * .17, y + 15), fill=ring)


def battle_preview(bg, size):
    width, height = size
    vw = min(width, 480)
    # Match the field boxes of the previous background handoff.
    fx, fy, fw, fh = 6, 152, vw - 12, height - 390
    ax, ay = fx + fw / 2, fy + fh * FIELD_HORIZON
    scale = max(fw / 1536, fh / 768, ax / 768, (vw - ax) / 768,
                ay / (1024 * HORIZON), (height - ay) / (1024 * (1 - HORIZON)))
    bw, bh = 1536 * scale, 1024 * scale
    bx, by = ax - bw / 2, ay - bh * HORIZON
    frame = bg.transform((vw, height), Image.Transform.AFFINE,
                         (1 / scale, 0, -bx / scale, 0, 1 / scale, -by / scale),
                         Image.Resampling.BICUBIC)
    shade = Image.new("RGBA", frame.size)
    stops = [(0, .75), (.22, 0), (.52, 0), (.74, .70), (1, .90)]
    shade_draw = ImageDraw.Draw(shade)
    for y, alpha in enumerate(np.interp(np.arange(height) / height, *zip(*stops))):
        shade_draw.line((0, y, vw, y), fill=(5, 11, 20, int(alpha * 255)))
    frame = Image.alpha_composite(frame.convert("RGBA"), shade).convert("RGB")

    # Use the regular, equal-rise three-row case of fieldSlots. Each side
    # has a full outside column and two inner actors with a free centre.
    edge, panel, status, gap = 8, 14, 13, 8
    body_size = min(int(min(140, fw * .295) * .95),
                    int((fh - 2 * edge - 3 * (panel + status) - 2 * gap) // (3 * 1.022)))
    rise = body_size * 1.022
    step = (fh - 2 * edge - panel - status - 3 * rise - 2 * (panel + status + gap)) / 3
    soles = [fy + edge + rise + step + row * (rise + panel + status + gap + step) for row in range(3)]
    draw = ImageDraw.Draw(frame)
    for col, x in enumerate((.115, .37, .63, .885)):
        rows = (0, 1, 2) if col in (0, 3) else (0, 2)
        for row in rows:
            figure(draw, fx + fw * x, soles[row], body_size, col >= 2)
    terrace = by + TERRACE_Y * scale
    assert min(soles) >= terrace + 3, (soles, terrace)
    canvas = Image.new("RGB", size, "#080e19")
    canvas.paste(frame, ((width - vw) // 2, 0))
    return canvas, {"view": [vw, height], "field": [fx, fy, fw, fh],
                    "backdrop": [round(p, 3) for p in (bx, by, bw, bh)],
                    "horizon": ay, "terraceStart": round(terrace, 3),
                    "soles": [round(y, 3) for y in soles], "actors": [5, 5]}


def review(families, props):
    scene = Image.new("RGBA", (1024, 712), "#182b3d")
    tiled_zones = ("shore", "isle", "pavilion", "sanctum", "shallow_low", "shallow_high", "deep", "causeway")
    # 2×2 blocks of mixed variants for each zone.
    for i, name in enumerate(tiled_zones):
        tx, ty = i % 4 * 256, i // 4 * 256
        frames = list(families[name].values())
        for j in range(4):
            tile = frames[j % len(frames)]
            scene.alpha_composite(tile, (tx + j % 2 * 128, ty + j // 2 * 128))
    for i, prop in enumerate(props.values()):
        scene.alpha_composite(prop, (8 + i * 112, 516))
    # Low, high and deep, at 60 px, in color and in grayscale.
    for i, name in enumerate(tiled_zones[4:7]):
        mini = next(iter(families[name].values())).resize((60, 60), Image.Resampling.LANCZOS)
        scene.alpha_composite(mini, (18 + i * 80, 647))
        scene.alpha_composite(mini.convert("L").convert("RGBA"), (280 + i * 80, 647))
    for i, name in enumerate(("lake_wall_top", "lake_wall_face", "lake_wall_inner")):
        mini = next(iter(families[name].values())).resize((60, 60), Image.Resampling.LANCZOS)
        scene.alpha_composite(mini, (768 + i * 80, 647))
    return scene.convert("RGB")


def validate_tiles(families, props):
    report = {"tileSize": SIZE, "blendBandPx": BAND, "runtimeTilePx": SCREEN_TILE,
              "sameFamilyBoundaries": {}, "waterToFloorBoundaries": {}, "tiles": {}, "decor": {}}
    for family, items in families.items():
        arrays = {name: np.asarray(tile) for name, tile in items.items()}
        for first in arrays.values():
            for second in arrays.values():
                assert np.array_equal(first[:, -1], second[:, 0]), family
                assert np.array_equal(first[-1], second[0]), family
        report["sameFamilyBoundaries"][family] = {"orderedPairs": len(items) ** 2, "checks": 2 * len(items) ** 2,
                                                  "maxChannelDelta": 0}
        for name, tile in items.items():
            full = arrays[name]
            assert np.all(full[:, :, 3] == 255), name
            small = np.asarray(tile.resize((SCREEN_TILE, SCREEN_TILE), Image.Resampling.LANCZOS))
            report["tiles"][name] = {"opaque": True, "oppositeEdgesExact": True,
                                     "meanLuma": round(float((full[:, :, :3] @ LUMA).mean()), 2),
                                     "meanLumaAt60px": round(float((small[:, :, :3] @ LUMA).mean()), 2)}

    bounds = []
    for name in ("shallow_low", "shallow_high", "deep"):
        means = [report["tiles"][key]["meanLumaAt60px"] for key in families[name]]
        bounds.append((min(means), max(means)))
    assert bounds[0][0] - bounds[1][1] > 24 and bounds[1][0] - bounds[2][1] > 42, bounds
    report["tideLumaAt60px"] = dict(zip(("shallow_low", "shallow_high", "deep"), bounds))

    # Test the 12 px treatment on every water variant against every floor
    # variant, in all four cardinal directions.
    for water_family in ("shallow_low", "shallow_high", "deep"):
        for floor_family in ("shore", "isle", "pavilion", "sanctum"):
            count = 0
            for water in families[water_family].values():
                for land in families[floor_family].values():
                    for axis, first, dx, dy in ((1, True, -1, 0), (1, False, 1, 0),
                                                (0, True, 0, -1), (0, False, 0, 1)):
                        blended = np.swapaxes(np.asarray(shore_edge(water, {(dx, dy): land})), 0, axis)
                        wet = np.swapaxes(np.asarray(water), 0, axis)
                        dry = np.swapaxes(np.asarray(land), 0, axis)
                        if not first:
                            blended, wet, dry = blended[::-1], wet[::-1], dry[::-1]
                        assert np.array_equal(blended[0], dry[-1])
                        assert np.array_equal(blended[BAND:], wet[BAND:])
                        count += 1
            report["waterToFloorBoundaries"][f"{water_family}/{floor_family}"] = {
                "checks": count, "maxChannelDelta": 0, "waterBeyondBandUnchanged": True}

    for name, prop in props.items():
        alpha = prop.getchannel("A")
        box = alpha.getbbox()
        assert box and box[0] > 0 and box[1] > 0 and box[2] < SIZE and box[3] == 124
        assert alpha.getextrema() == (0, 255)
        report["decor"][name] = {"bbox": list(box), "footY": 124, "transparentPadding": True}
    assert props["moon_lantern_off"].getchannel("A").tobytes() == props["moon_lantern_on"].getchannel("A").tobytes()
    report["lanternStatesShareAlpha"] = True
    return report


def binary_check(name, expected):
    image = open_image(OUT / name)
    assert image.mode == expected.mode and image.size == expected.size, name
    assert image.tobytes() == expected.tobytes(), name
    # VP8L marks the actual lossless WebP bitstream.
    assert b"VP8L" in (OUT / name).read_bytes()[:40], name


def file_record(path):
    data = path.read_bytes()
    entry = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
    if path.suffix.lower() in IMAGE_SUFFIXES:
        with Image.open(path) as image:
            image.load()
            entry.update({"size": list(image.size), "mode": image.mode})
    return entry


def package_files():
    return sorted(path for path in OUT.rglob("*") if path.is_file() and path.name != "validation.json"
                  and "__pycache__" not in path.parts)


def verify():
    report = read_json(OUT / "validation.json")
    actual = {path.relative_to(OUT).as_posix(): file_record(path) for path in package_files()}
    expected = report["files"]
    assert set(actual) == set(expected), (sorted(expected.keys() - actual.keys()), sorted(actual.keys() - expected.keys()))
    for name, record in actual.items():
        assert record == expected[name], name
    print(f"Verified SHA-256 and size of {len(actual)} files. Decoded {sum('size' in x for x in actual.values())} images.")


def build():
    families = build_tiles(read_json(OUT / "seeds.json")["tiles"], BAND)
    tiles = {name: tile for group in families.values() for name, tile in group.items()}
    props, metadata = extract_props()
    report = validate_tiles(families, props)
    for name, frames, cols, meta in (("tiles_lake", tiles, 6, None), ("decor_lake", props, 3, metadata)):
        atlas, index = save_atlas(name, frames, cols, meta)
        binary_check(f"{name}.webp", atlas)
        assert open_image(OUT / f"{name}.png").tobytes() == atlas.tobytes()
        report[name] = {"size": list(atlas.size), "frames": len(index), "lossless": True}
    bg = backdrop()
    binary_check("bg_lake.webp", bg)
    report["bg_lake"] = {"size": list(bg.size), "lossless": True, "mode": bg.mode, "opaque": True,
                         "scenicWaterlineY": SCENIC_WATERLINE_Y, "frameHorizonY": REF_SIZE[1] * HORIZON,
                         "terraceStartY": TERRACE_Y}

    map_source = read_json(SOURCE / "map_rows.json")
    rows = map_source["rows"]
    # Compare the snapshot to the current checkout when it is beside src/.
    branch_file = OUT.parents[1] / map_source["source"]
    if branch_file.exists():
        import re
        current_rows = re.search(r"\brows: \[(.*?)\n  \]", branch_file.read_text(encoding="utf-8"), re.S)
        assert current_rows and re.findall(r"'([^']+)'", current_rows[1]) == rows
    report["mapPreview"] = {"size": [390, 844], "center": [10.5, 12], "grid": [21, 30],
                            "tilePx": SCREEN_TILE, "mapRevision": map_source["revision"]}
    for tide in ("shallow_low", "shallow_high"):
        name = "low" if tide.endswith("_low") else "high"
        map_preview(rows, families, tide, (10.5, 12), (390, 844), SCREEN_TILE).save(
            OUT / f"preview_map_{name}_390x844.png", optimize=True)

    # A full-grid comparison supplements the 1:1 display-size camera crops.
    overview = Image.new("RGB", (21 * 28 * 2 + 12, 30 * 28), "#182b3d")
    for i, tide in enumerate(("shallow_low", "shallow_high")):
        sample = map_preview(rows, families, tide, (10.5, 15), (21 * 28, 30 * 28), 28)
        overview.paste(sample, (i * (sample.width + 12), 0))
    overview.save(OUT / "preview_map_overview.png", optimize=True)

    report["battlePreview"] = {}
    for size in ((390, 844), (1366, 768)):
        key = "x".join(map(str, size))
        image, geometry = battle_preview(bg, size)
        image.save(OUT / f"preview_battle_{key}.png", optimize=True)
        report["battlePreview"][key] = geometry
    review(families, props).save(OUT / "seam_review.png", optimize=True)

    webps = ["tiles_lake.webp", "decor_lake.webp", "bg_lake.webp"]
    runtime = webps + ["tiles_lake.json", "decor_lake.json"]
    report["webpBytes"] = sum((OUT / name).stat().st_size for name in webps)
    report["runtimeBytes"] = sum((OUT / name).stat().st_size for name in runtime)
    assert report["runtimeBytes"] < 2_500_000, report["runtimeBytes"]
    report["files"] = {path.relative_to(OUT).as_posix(): file_record(path) for path in package_files()}
    report["manifestVerification"] = "The manifest itself is compared byte-for-byte with the original after fetch."
    save_json("validation.json", report)
    verify()
    print(f"Runtime: {report['runtimeBytes']:,} bytes. All tile, shore, alpha and lossless checks passed.")


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--verify", action="store_true", help="decode images and check manifest without rebuilding")
    args = cli.parse_args()
    verify() if args.verify else build()
