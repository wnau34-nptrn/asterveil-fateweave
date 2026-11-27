"""Build and verify the Map 5 event art package with Pillow."""
import argparse
import hashlib
import json
from math import cos, hypot, pi, radians, sin
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
SOURCE = ROOT / "source"
BASE = REPO / "incoming/ART-WORLD-MINE-PROPS-001"
WORLD = REPO / "public/assets/world"
CELL = 128
FOOT = 124
LANCZOS = Image.Resampling.LANCZOS
KINDS = ("trapped", "cart", "vein", "ore-merchant")
ART = ("trapped_R1", "trapped_R2", "cart", "vein", "ore_merchant")
RUNTIME_ART = ("trapped_R1", "cart", "vein", "ore_merchant")
POSITIONS = ((6, 13), (5, 23), (18, 13), (19, 21))
# Height limits preserve the usual mine prop scale and the UI clearance.
HEIGHTS = dict.fromkeys(ART, 108)
HEIGHTS["ore_merchant"] = 88


def read_json(path):
    return json.loads(path.read_text())


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def rgba(path):
    with Image.open(path) as image:
        image.load()
        return image.convert("RGBA")


def normalize(name):
    raw = rgba(SOURCE / f"{name}.png")
    assert min(raw.size) >= 512
    alpha = raw.getchannel("A")
    raw.putalpha(alpha.point(lambda value: value if value >= 18 else 0))
    bounds = raw.getbbox()
    assert bounds and alpha.getextrema()[0] == 0
    assert 0 < bounds[0] < bounds[2] < raw.width
    assert 0 < bounds[1] < bounds[3] < raw.height
    prop = raw.crop(bounds)
    prop.thumbnail((112, HEIGHTS[name]), LANCZOS)
    frame = Image.new("RGBA", (CELL, CELL))
    frame.alpha_composite(prop, ((CELL - prop.width) // 2, FOOT - prop.height))
    left, top, right, bottom = frame.getbbox()
    assert left >= 8 and right <= 120 and top >= 3 and bottom == FOOT
    frame.save(ROOT / f"{name}.png")
    return frame


def build_glow():
    # A raised-cosine radial falloff with zero slope at the outer edge.
    glow = Image.new("RGBA", (CELL, CELL))
    glow.putdata([
        (38, 255, 151, round(122 * (1 + cos(pi * radius)) / 2))
        if radius < 1 else (0, 0, 0, 0)
        for y in range(CELL)
        for x in range(CELL)
        for radius in [hypot((x - 63.5) / 60, (y - 77) / 49)]
    ])
    glow.save(ROOT / "vein_glow.png")


def atlas_frames(path, frames):
    page = rgba(path)
    return {
        name: page.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
        for name, f in frames.items()
    }


def badge(image, x, y, size):
    # Rasterize an approximation of the centered CSS badge at 4x.
    d = round(size * 14 / 48)
    hi = d * 4
    glyph = Image.new("RGBA", (hi, hi))
    draw = ImageDraw.Draw(glyph)
    draw.ellipse((0, 0, hi - 1, hi - 1), fill="#f4cf73", outline="#372516", width=4)
    draw.rounded_rectangle((hi*.46, hi*.24, hi*.54, hi*.54), radius=2, fill="#53321c")
    draw.ellipse((hi*.45, hi*.63, hi*.55, hi*.74), fill="#53321c")
    image.alpha_composite(glyph.resize((d, d), LANCZOS), (x + (size - d) // 2, y + round(size * .02)))


def marker(image, prop, x, y, size):
    image.alpha_composite(prop.resize((size, size), LANCZOS), (x, y))
    badge(image, x, y, size)


def review_floors(terrain):
    # The lighter swatch is a stress test using the yard tile's actual texture.
    pale = ImageOps.colorize(ImageOps.grayscale(terrain["yard_0"]), "#a77d4d", "#fff0c2",
                             blackpoint=35, whitepoint=130)
    tunnel = ImageEnhance.Brightness(terrain["tunnel_1"]).enhance(.69)
    return pale.convert("RGBA"), tunnel


def floor_row(props, floors, size):
    margin = 8
    out = Image.new("RGBA", ((size + margin) * len(props) + margin, 2 * (size + margin) + margin),
                    "#27272d")
    for row, floor in enumerate(floors):
        for col, prop in enumerate(props):
            x, y = margin + col * (size + margin), margin + row * (size + margin)
            out.paste(floor.resize((size, size), LANCZOS), (x, y))
            marker(out, prop, x, y, size)
    return out


def lit_overlays():
    placements = read_json(BASE / "placements.json")
    decor = atlas_frames(WORLD / "mine_decor.webp", read_json(BASE / "runtime/decor_mine.json")["frames"])
    lit = {group[0]: group[1] for group in placements["stateRows"] if len(group) == 2}
    props = {tuple(xy): decor[lit.get(name, name)]
             for name, points in (placements["puzzles"] | placements["decorOnWall"]).items()
             for xy in points}
    rail_atlas = atlas_frames(BASE / "sources/rails_mine.webp", read_json(BASE / "sources/rails_mine.json"))
    tracks = {(20, y): "rail_ns" for y in range(11, 18)}
    tracks.update({
        (20, 14): "rail_junction_e", (20, 15): "rail_junction_w", (20, 16): "rail_junction_e",
        (21, 14): "rail_ew", (22, 14): "rail_end_stop", (19, 15): "rail_ew",
        (18, 15): "rail_end_stop_w", (21, 16): "rail_ew", (22, 16): "rail_end_stop",
    })
    return {xy: rail_atlas[name] for xy, name in tracks.items()}, props


def map_panels(props):
    rows = read_json(BASE / "sources/layout.json")
    # Use the prior lit preview's tile selection and overlays at 48 px.
    terrain = atlas_frames(BASE / "sources/tiles_mine.webp", read_json(BASE / "sources/tiles_mine.json"))
    tracks, decor = lit_overlays()
    size = 48
    world = Image.new("RGBA", (len(rows[0]) * size, len(rows) * size))
    for y, row in enumerate(rows):
        for x, cell in enumerate(row):
            if cell == "#":
                key = "mine_wall_face" if y + 1 < len(rows) and rows[y + 1][x] != "#" else "mine_wall_inner"
            else:
                zone = {",": "tunnel", ":": "cavern", "B": "cavern", "G": "cavern"}.get(
                    cell, "cavern" if y < 7 else "yard")
                key = f"{zone}_{(x * 31337 ^ y * 6971 ^ x * y * 991) % 4}"
            at = (x * size, y * size)
            world.paste(terrain[key].resize((size, size), LANCZOS), at)
            for layer in (tracks, decor):
                if (x, y) in layer:
                    world.alpha_composite(layer[x, y].resize((size, size), LANCZOS), at)

    # Map 5 review camera (5, 13), sourced from the prior prop build.py.
    legacy = rgba(BASE / "preview/map-5-lit.png")
    original_origin = (135, 388)
    legacy = legacy.resize((312, 675), LANCZOS)
    origin = tuple(round(value * size / 60) for value in original_origin)
    height = 192
    out = Image.new("RGBA", (390, 4 * height + 3 * 6), "#1b1d22")
    for index, (prop, (x, y)) in enumerate(zip(props, POSITIONS, strict=True)):
        left = max(0, min(world.width - 390, x * size - 171))
        top = max(0, min(world.height - height, y * size - 72))
        panel = world.crop((left, top, left + 390, top + height))
        if index == 0:
            panel.paste(legacy, (origin[0] - left, origin[1] - top))
        marker(panel, prop, x * size - left, y * size - top, size)
        out.paste(panel, (0, index * (height + 6)))
    return out


def legacy_tint(image, matrix):
    tinted = image.convert("RGB").convert("RGB", matrix)
    tinted.putalpha(image.getchannel("A"))
    return tinted


def sepia(image, amount, brightness):
    sepia_matrix = ((.393, .769, .189), (.349, .686, .168), (.272, .534, .131))
    rows = [tuple((amount * value + (1 - amount) * (i == j)) * brightness
                  for j, value in enumerate(row)) + (0,)
            for i, row in enumerate(sepia_matrix)]
    matrix = sum(rows, ())
    return legacy_tint(image, matrix)


def vein_tint(image):
    c, s = cos(radians(150)), sin(radians(150))
    rotated = legacy_tint(image, (
        .213 + c*.787 - s*.213, .715 - c*.715 - s*.715, .072 - c*.072 + s*.928, 0,
        .213 - c*.213 + s*.143, .715 + c*.285 + s*.140, .072 - c*.072 - s*.283, 0,
        .213 - c*.213 - s*.787, .715 - c*.715 + s*.715, .072 + c*.928 + s*.072, 0,
    ))
    rows = [tuple(-.4 * luma + 1.4 * (i == j) for j, luma in enumerate((.213, .715, .072))) + (0,)
            for i in range(3)]
    matrix = sum(rows, ())
    return legacy_tint(rotated, matrix)


def centered_label(draw, x, y, label):
    draw.text((x, y), label, fill="#f4e6d3", anchor="mt")


def comparisons(art, props, floors):
    borrowed = rgba(WORLD / "map_props.webp")
    old = [borrowed.crop((x*CELL, y*CELL, (x+1)*CELL, (y+1)*CELL))
           for x, y in ((0, 1), (1, 0), (2, 0), (3, 0))]
    old = (sepia(old[0], .5, .8), sepia(old[1], .6, .9), vein_tint(old[2]), old[3])
    out = Image.new("RGBA", (338, 466), "#28252a")
    draw = ImageDraw.Draw(out)
    for row, (kind, before, after) in enumerate(zip(KINDS, old, props, strict=True)):
        y = 28 + 108 * row
        centered_label(draw, 59, y + 43, kind)
        for x, prop in ((116, before), (224, after)):
            floor = floors[0] if row in (1, 3) else floors[1]
            out.paste(floor.resize((96, 96), LANCZOS), (x, y))
            marker(out, prop, x, y, 96)
    centered_label(draw, 164, 9, "Borrowed")
    centered_label(draw, 272, 9, "Dedicated")
    out.save(ROOT / "preview/compare.png")

    decor = read_json(BASE / "runtime/decor_mine.json")["frames"]
    miner = atlas_frames(WORLD / "mine_decor.webp", {"worker_follow": decor["worker_follow"]})["worker_follow"]
    busts = rgba(REPO / "public/assets/lobby/npc/npc_busts.webp")
    names = ("Bork", "Pino", "Halda", "Mimi", "Fern", "Kael")
    people = [("Trapped R1", art["trapped_R1"]), ("Trapped R2", art["trapped_R2"]),
              ("Ore Merchant", art["ore_merchant"]), ("Yard miner", miner)]
    for index, name in enumerate(names):
        x, y = index % 3 * 256, index // 3 * 256
        people.append((name, busts.crop((x, y, x + 256, y + 256))))
    out = Image.new("RGBA", (4 * 144, 3 * 152), "#28252a")
    draw = ImageDraw.Draw(out)
    for index, (name, person) in enumerate(people):
        x, y = index % 4 * 144 + 8, index // 4 * 152 + 4
        out.alpha_composite(person.resize((128, 128), LANCZOS), (x, y))
        centered_label(draw, x + 64, y + 130, name)
    for col, size in ((2, 48), (3, 96)):
        left = col * 144 + (144 - size) // 2
        top = 2 * 152 + (128 - size) // 2 + 4
        out.paste(floors[1].resize((size, size), LANCZOS), (left, top))
        marker(out, art["trapped_R2"], left, top, size)
        centered_label(draw, col * 144 + 72, 2 * 152 + 134, f"R2 at {size} px")
    out.save(ROOT / "preview/people-compare.png")


def build():
    for folder in ("runtime", "preview"):
        (ROOT / folder).mkdir(exist_ok=True)
    art = {name: normalize(name) for name in ART}
    build_glow()
    props = [art[name] for name in RUNTIME_ART]
    atlas = Image.new("RGBA", (CELL * len(props), CELL))
    frames = {}
    for index, (kind, prop) in enumerate(zip(KINDS, props, strict=True)):
        x = CELL * index
        atlas.paste(prop, (x, 0))
        frames[kind] = dict(x=x, y=0, w=CELL, h=CELL)
    atlas.save(ROOT / "runtime/mine_events.webp", lossless=True, exact=True)
    write_json(ROOT / "runtime/mine_events.json", {"anchor": [0.5, 1], "footY": FOOT, "frames": frames})
    terrain = atlas_frames(WORLD / "mine_tiles.webp", read_json(BASE / "sources/tiles_mine.json"))
    floors = review_floors(terrain)
    for size in (48, 96):
        floor_row(props, floors, size).save(ROOT / f"preview/markers-{size}.png")
    map_panels(props).save(ROOT / "preview/markers-390.png")
    comparisons(art, props, floors)
    write_json(ROOT / "validation.json", manifest())


def manifest():
    files = {}
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or path.name == "validation.json":
            continue
        key = path.relative_to(ROOT).as_posix()
        entry = {"sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
        if path.suffix in (".png", ".webp"):
            image = rgba(path)  # Full Pillow decode
            alpha = image.getchannel("A")
            bbox = alpha.getbbox()
            entry.update(dimensions=list(image.size), bbox=bbox,
                         alpha_coverage=round(1 - alpha.histogram()[0] / (image.width * image.height), 8),
                         footY=FOOT if ((path.parent == ROOT and path.stem in ART)
                                          or key == "runtime/mine_events.webp") else None)
        files[key] = entry
    return {"algorithm": "SHA-256", "footY": FOOT, "files": files,
            "self_exclusion": "validation.json is excluded from its own digest list."}


def verify():
    current = json.loads(json.dumps(manifest()))
    expected = read_json(ROOT / "validation.json")
    bad = sorted(key for key in current["files"].keys() | expected["files"].keys()
                 if current["files"].get(key) != expected["files"].get(key))
    if bad:
        raise SystemExit("Manifest mismatch: " + ", ".join(bad))
    assert current == expected
    atlas = rgba(ROOT / "runtime/mine_events.webp")
    assert atlas.size == (4 * CELL, CELL)
    for i, name in enumerate(RUNTIME_ART):
        assert atlas.crop((i * CELL, 0, (i + 1) * CELL, CELL)).tobytes() == rgba(ROOT / f"{name}.png").tobytes()
    count = sum("dimensions" in data for data in current["files"].values())
    print(f"Verified {len(current['files'])} SHA-256 digests and fully decoded {count} images.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true", help="Verify existing assets without rebuilding.")
    if parser.parse_args().verify:
        verify()
    else:
        build()
        verify()
