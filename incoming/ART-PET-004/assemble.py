#!/usr/bin/env python3
"""Paint, pack and validate the ART-PET-004 handoff with Pillow."""
import argparse
import hashlib
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageColor, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
CELL = 256
SUPERSAMPLE = 3
PHASES = ("prepare", "peak", "fade")
ART_HEIGHT = 109  # floor(min(140, 390 * .295) * .95) in field-layout.ts
FX_SIZE = 128
ROWS = (
    ("meadow_fox", "target_foe_center", "Bite the weak point"),
    ("thicket_piglet", "hero_center", "Moss herb"),
    ("rift_crystal_moth", "above_foe_head", "Crystal dust"),
    ("fort_gargoyle_pup", "hero_center", "Stone wall"),
    ("forest_lantern_owl", "hero_center", "Haste light"),
    ("gate_starveil_slime", "hero_center", "Mint drops"),
)


def rgba(hex_color, alpha):
    return (*ImageColor.getrgb(hex_color), min(255, round(alpha)))


def mix(first, second, amount):
    return tuple(round(a + (b - a) * amount) for a, b in zip(first, second))


def bezier(p0, p1, p2, p3, steps=40):
    path = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        path.append(tuple(u**3*a + 3*u*u*t*b + 3*u*t*t*c + t**3*d
                          for a, b, c, d in zip(p0, p1, p2, p3)))
    return path


def arc(rx, ry, start, end, center=(0, 0), tilt=0, steps=56):
    cx, cy = center
    angle = math.radians(tilt)
    path = []
    for i in range(steps + 1):
        t = math.radians(start + (end - start) * i / steps)
        x, y = rx * math.cos(t), ry * math.sin(t)
        path.append((cx + x * math.cos(angle) - y * math.sin(angle),
                     cy + x * math.sin(angle) + y * math.cos(angle)))
    return path


def placed(points, x, y, size=1, angle=0):
    angle = math.radians(angle)
    c, s = math.cos(angle) * size, math.sin(angle) * size
    return [(x + px * c - py * s, y + px * s + py * c) for px, py in points]


class Paint:
    def __init__(self, seed, opacity):
        self.rng = random.Random(seed)
        self.opacity = opacity
        extent = CELL * SUPERSAMPLE
        self.ink = Image.new("RGBA", (extent, extent))
        self.light = Image.new("RGBA", self.ink.size)
        self.detail = ImageDraw.Draw(self.ink)
        self.bloom = ImageDraw.Draw(self.light)

    @staticmethod
    def local(points):
        return [((CELL / 2 + x) * SUPERSAMPLE, (CELL / 2 + y) * SUPERSAMPLE)
                for x, y in points]

    def polygon(self, points, color, strength=255):
        self.detail.polygon(self.local(points), rgba(color, strength))

    def wash(self, x, y, radius, color, strength):
        self.bloom.ellipse(self.local(((x-radius, y-radius), (x+radius, y+radius))),
                           rgba(color, strength))

    def line(self, points, color, width=1, strength=255):
        self.detail.line(self.local(points), rgba(color, strength),
                         width=max(1, round(width * SUPERSAMPLE)), joint="curve")

    def pigment(self, points, shadow, highlight, grain=6, strength=255):
        """Masked pigment wash with diagonal light and fine, deterministic grain."""
        xy = self.local(points)
        left, top = (math.floor(min(v)) for v in zip(*xy))
        right, bottom = (math.ceil(max(v)) + 1 for v in zip(*xy))
        w, h = right - left, bottom - top
        mask = Image.new("L", (w, h))
        ImageDraw.Draw(mask).polygon([(x-left, y-top) for x, y in xy], fill=strength)
        low, high = ImageColor.getrgb(shadow), ImageColor.getrgb(highlight)
        pigment = Image.new("RGBA", mask.size)
        pixels = []
        for y in range(h):
            for x in range(w):
                light = max(0, min(1, .90 - .78*y/h + .14*x/w))
                fleck = self.rng.randint(-grain, grain)
                rgb = mix(low, high, light)
                pixels.append(tuple(max(0, min(255, c+fleck)) for c in rgb) + (255,))
        pigment.putdata(pixels)
        pigment.putalpha(mask)
        self.ink.alpha_composite(pigment, (left, top))

    def ribbon(self, path, width, outer, middle, core, energy=1):
        """A tapered brush with a broken hot edge and a localized light spill."""
        normals = []
        widths = []
        for i, (x, y) in enumerate(path):
            x0, y0 = path[max(0, i-1)]
            x1, y1 = path[min(len(path)-1, i+1)]
            length = math.hypot(x1-x0, y1-y0)
            normals.append((-(y1-y0)/length, (x1-x0)/length))
            phase = i / (len(path)-1)
            widths.append(width * (.02 + .98 * math.sin(math.pi*phase)**1.3)
                          * (1 + .12 * math.sin(phase * 22)))

        def edge(offset):
            return [(x + nx*w*offset, y + ny*w*offset)
                    for (x, y), (nx, ny), w in zip(path, normals, widths)]

        self.bloom.line(self.local(path), rgba(outer, 102*energy),
                        width=max(1, round(width*SUPERSAMPLE*1.6)), joint="curve")
        self.polygon(edge(-.50) + edge(.50)[::-1], outer, 188*energy)
        self.polygon(edge(-.39) + edge(.23)[::-1], middle, 236*energy)
        self.polygon(edge(-.31) + edge(-.09)[::-1], core, 255*energy)
        hot_edge = edge(-.29)
        n = len(path)
        for start, end in ((.15, .33), (.42, .71), (.79, .90)):
            self.line(hot_edge[int(n*start):int(n*end)], "#fffbed", width*.09, 244*energy)

    def star(self, x, y, radius, color, strength=255, angle=0):
        points = [(0, -radius), (.14*radius, -.19*radius), (.68*radius, 0),
                  (.14*radius, .19*radius), (0, radius), (-.14*radius, .19*radius),
                  (-.68*radius, 0), (-.14*radius, -.19*radius)]
        self.wash(x, y, radius*.60, color, strength*.44)
        self.polygon(placed(points, x, y, angle=angle), color, strength)
        self.polygon(placed(points, x, y, size=.6, angle=angle), "#fff9eb", strength)

    def dust(self, points, color):
        for x, y, radius in points:
            self.star(x, y, radius, color, self.rng.randint(116, 228),
                      self.rng.uniform(-30, 30))

    def finish(self):
        glow = self.light.filter(ImageFilter.GaussianBlur(3.5 * SUPERSAMPLE))
        glow.alpha_composite(self.ink)
        result = glow.resize((CELL, CELL), Image.Resampling.LANCZOS)
        alpha = result.getchannel("A").point(
            [0 if value < 3 else round(value*self.opacity) for value in range(256)])
        result.putalpha(alpha)
        result.paste((0, 0, 0, 0), mask=alpha.point([255] + [0]*255))
        return result


def bite(p, phase):
    gold = ("#bc5723", "#ffc268", "#fff3c5")
    if phase == 0:
        p.ribbon(arc(63, 43, 111, 229, (7, 8), -19), 8, *gold, .78)
        p.dust([(-61, 43, 5), (-53, -17, 5), (24, 55, 3)], "#ffcb81")
    elif phase == 1:
        p.ribbon(arc(73, 47, 54, 218, (15, 17), -22), 21, *gold)
        p.ribbon(arc(83, 54, 100, 201, (14, 16), -22), 5, *gold, .72)
        for offset in (0, 20):
            p.ribbon(bezier((16+offset, -6), (13+offset, 1), (6+offset, 10),
                            (-4+offset, 16)), 10, *gold)
        p.star(-46, 27, 16, "#ffaa56", angle=30)
        p.dust([(-76, 14, 6), (-59, 54, 6), (-30, 60, 5), (46, 28, 5),
                (50, -31, 6), (-59, -33, 4), (13, 61, 4)], "#ffd179")
    else:
        p.ribbon(arc(80, 51, 65, 148, (14, 12), -22), 7, *gold)
        p.ribbon(arc(78, 50, 180, 240, (15, 9), -22), 4, *gold)
        p.dust([(-81, 25, 7), (-68, 54, 5), (57, 27, 4), (35, 62, 6), (-52, -33, 4)],
               "#ffd179")


def leaf(p, x, y, scale, angle):
    outline = (bezier((-16, 0), (-8, -10), (1, -12), (16, -1), 14) +
               bezier((16, -1), (4, 9), (-6, 9), (-16, 0), 14))
    p.pigment(placed(outline, x, y, scale, angle), "#215e34", "#bcdb52")
    p.polygon(placed([(-16, 0), (-5, -2), (16, -1), (4, 6), (-5, 5)],
                     x, y, scale, angle), "#4d963d")
    p.line(placed([(-13, 0), (-5, 0), (5, -1), (12, -1)], x, y, scale, angle),
           "#dcf18c", 1.5*scale, 220)
    for i in (-4, 2, 7):
        p.line(placed([(i, -1), (i-3, -4)], x, y, scale, angle), "#e4f3a5", .9*scale, 190)


def moss(p, phase):
    green = ("#307c49", "#86cd50", "#e4f58b")
    diagrams = (
        ([((-67, 28), (-89, 59), (29, 73), (53, 45), 7)],
         [(-59, 49, .75, 25), (37, 49, .64, -22)], [(-46, 22, 5), (59, 33, 5)]),
        ([((-59, -25), (-91, -1), (-74, 28), (39, 11), 9),
          ((63, 1), (109, 32), (55, 61), (-48, 44), 11),
          ((-55, 45), (-88, 35), (-97, 24), (-63, 11), 6)],
         [(-63, -20, .86, -48), (-63, 13, .91, 25), (-37, 46, .83, 17),
          (41, 49, 1.02, -27), (74, 27, .86, -63), (60, -18, .86, -51)],
         [(-85, 17, 7), (81, -5, 9), (-18, 27, 6), (20, 53, 5), (61, -37, 5)]),
        ([((-78, 24), (-45, 58), (62, 35), (72, 3), 5)],
         [(-78, -15, .68, -57), (74, -11, .72, -46), (58, 30, .60, -21)],
         [(-83, -37, 5), (81, -34, 5), (-56, 4, 5), (37, 32, 4)]),
    )
    ribbons, leaves, glints = diagrams[phase]
    for *controls, width in ribbons:
        p.ribbon(bezier(*controls), width, *green, .92)
    for placement in leaves:
        leaf(p, *placement)
    p.dust(glints, "#e2ffc0")


def crystal(p, x, y, size, angle):
    points = [(0, -15), (7, -5), (6, 7), (0, 13), (-6, 7), (-7, -5)]
    p.pigment(placed(points, x, y, size, angle), "#6b45bb", "#ead6ff")
    for face, color in [([points[0], (0, 1), points[4], points[5]], "#bd8df5"),
                        ([points[0], points[1], (0, 1)], "#f2e0ff"),
                        ([(0, 1), points[1], points[2], points[3]], "#9354ec")]:
        p.polygon(placed(face, x, y, size, angle), color)
    p.line(placed([(0, -14), (0, 1), (0, 10)], x, y, size, angle), "#f8edff", size, 219)


def mark(p, phase):
    lilac = ("#8559e4", "#c09af4", "#f4ddff")
    if phase == 0:
        p.ribbon(arc(46, 25, 188, 341, (0, 5)), 4, *lilac, .7)
        for x, y, scale, angle in [(-39, -13, .43, -32), (26, -32, .51, 34),
                                     (54, -9, .32, 20), (-14, -41, .31, 12)]:
            crystal(p, x, y, scale, angle)
        p.dust([(-53, -23, 5), (38, -27, 5), (2, -23, 4), (-24, -10, 5)], "#d9acff")
    elif phase == 1:
        for angle in range(-135, 180, 90):
            p.ribbon(arc(36, 24, angle-25, angle+25), 5.5, *lilac)
        for x, y, angle in [(-37, 0, -90), (37, 0, 90), (0, -26, 0), (0, 25, 180)]:
            p.polygon(placed([(0, -6), (5, -1), (0, 3), (-5, -1)], x, y, angle=angle),
                      "#e6d0ff")
        crystal(p, 0, 0, 1.32, 0)
        for spec in [(-53, -13, .39, -34), (50, 10, .38, 42), (23, -36, .29, 25)]:
            crystal(p, *spec)
        p.dust([(-55, 7, 5), (56, -10, 5), (37, -22, 4), (-20, -31, 4)], "#ddbbff")
    else:
        for start, end in ((-165, -99), (-64, -17), (10, 49), (123, 170)):
            p.ribbon(arc(42, 27, start, end), 3, *lilac, .81)
        crystal(p, 0, 1, .78, 0)
        p.dust([(-54, -10, 4), (52, 1, 5), (-26, -31, 5), (29, -28, 3)], "#ddbbff")


def plate(p, x, y, scale, angle, center=False):
    silhouette = [(-22,-20), (-8,-28), (16,-24), (23,-11), (20,10), (8,23), (0,27),
                  (-14,17), (-24,3)]
    if center:
        silhouette = [(-29,-14), (0,-27), (28,-14), (24,12), (14,25), (0,33),
                      (-14,25), (-24,12)]
    p.pigment(placed(silhouette, x, y, scale, angle), "#584f4b", "#f3d49e")
    bevel = [(u*.84, v*.84) for u, v in silhouette]
    p.pigment(placed(bevel, x, y, scale, angle), "#313a52", "#a4a0a6")
    facets = [([(-17,-9), (0,-19), (15,-10), (7,0), (-11,4)], "#a8a2ac"),
              ([(7,0), (15,-10), (17,6), (7,17), (0,21)], "#50566b"),
              ([(-11,4), (7,0), (0,21), (-13,11)], "#666878")]
    for face, color in facets:
        p.polygon(placed(face, x, y, scale, angle), color, 230)
    p.line(placed(silhouette[:4], x, y, scale, angle), "#ffe9b8", 2.1*scale, 250)
    p.line(placed([(-14,-11), (-5,-15), (0,-14), (5,-9)], x, y, scale, angle),
           "#d6c2b0", 1.3*scale, 211)
    p.line(placed([(-5,10), (1,4), (7,1), (9,-4)], x, y, scale, angle),
           "#31384c", 1.7*scale, 223)


def wall(p, phase):
    champagne = ("#9b725b", "#d3ac78", "#fff0be")
    if phase == 0:
        p.ribbon(arc(64, 28, 22, 175, (0, 26)), 7, *champagne, .8)
        for spec in [(-69, 6, .64, -26), (66, 3, .68, 29), (3, 39, .51, 7)]:
            plate(p, *spec)
        p.dust([(-54, -17, 5), (58, -23, 6), (10, 54, 4)], "#ffe6b4")
    elif phase == 1:
        p.ribbon(arc(70, 33, 10, 172, (0, 26)), 10, *champagne)
        p.ribbon(arc(71, 29, 9, 77, (0, 29)), 3, *champagne, .78)
        for spec in [(-54, 4, .89, -20), (53, 4, .93, 23)]:
            plate(p, *spec)
        plate(p, 0, 31, .95, 0, center=True)
        p.star(-56, -20, 10, "#ffe4a8", angle=20)
        p.dust([(58, -20, 8), (-77, 13, 6), (78, 19, 5), (38, 47, 5),
                (-36, 50, 5), (8, -2, 5)], "#ffe6b4")
    else:
        p.ribbon(arc(75, 33, 21, 155, (0, 24)), 6, *champagne)
        for spec in [(-69, 12, .52, -32), (70, 13, .55, 34), (0, 37, .77, 0)]:
            plate(p, *spec)
        p.dust([(-83, 0, 5), (81, -3, 6), (31, 49, 5), (-27, 55, 4)], "#ffe6b4")


def feather(p, x, y, size, angle):
    outline = [(-20, 1), (-11, -4), (-10, -8), (3, -11), (13, -9), (22, -3),
               (13, 5), (5, 7), (1, 5), (-6, 7), (-9, 3), (-15, 3), (-18, 6)]
    p.pigment(placed(outline, x, y, size, angle), "#bf5929", "#ffd56c")
    p.line(placed([(-20, 3), (-8, 0), (8, -3), (19, -3)], x, y, size, angle),
           "#fff0a7", 1.6 * size, 238)
    for i in (-7, 0, 7):
        p.line(placed([(i, -1), (i+4, -6)], x, y, size, angle), "#ffe599", size, 200)


def lantern(p, x, y, scale):
    def shape(points, color, strength=255):
        p.polygon(placed(points, x, y, scale), color, strength)

    p.wash(x, y, 22 * scale, "#ffb743", 125)
    shape([(-3,-24),(3,-24),(5,-16),(13,-10),(11,13),(5,19),(-5,19),(-11,13),
           (-13,-10),(-5,-16)], "#ffca63")
    shape([(-8,-9),(8,-9),(7,12),(0,16),(-7,12)], "#a95121")
    shape([(-4,-8),(4,-8),(6,10),(0,13),(-6,10)], "#fff4a7")
    shape([(-6,-11),(0,-17),(7,-11)], "#fff7d3")
    shape([(-9,12),(0,15),(9,12),(6,17),(-6,17)], "#f6ac47")
    p.star(x, y+1, 17*scale, "#ffdc78")


def haste(p, phase):
    amber = ("#d2742a", "#ffba47", "#ffef9f")
    diagrams = (
        ([((-73, 25), (-52, 53), (52, 55), (66, 23), 7)],
         [(-60, 4, .66, -115), (62, 7, .68, -69)], [(-60, -20, 5), (50, 42, 5)]),
        ([((-44, 46), (-113, 29), (-77, -4), (-65, -37), 10),
          ((-40, 45), (30, 65), (102, 24), (71, -28), 12),
          ((27, 43), (59, 36), (73, 20), (58, 8), 4)],
         [(-70, -22, .92, -119), (65, -28, .91, -59), (77, 6, .7, -68)],
         [(-51, -34, 7), (52, -13, 8), (-75, 24, 7), (57, 43, 5), (81, -24, 5)]),
        ([((-54, 43), (-94, 18), (-91, -5), (-73, -36), 6),
          ((43, 36), (89, 19), (91, -17), (72, -41), 6)],
         [(-79, -36, .7, -118), (72, -41, .76, -61)], [(-92, -6, 4), (90, -12, 5), (42, 36, 4)]),
    )
    ribbons, feathers, sparkles = diagrams[phase]
    for *controls, width in ribbons:
        p.ribbon(bezier(*controls), width, *amber)
    for spec in feathers:
        feather(p, *spec)
    lantern(p, 3, (23, 12, 5)[phase], (.56, 1, .62)[phase])
    p.dust(sparkles, "#ffcc6d")


def droplet(p, x, y, scale, angle):
    outline = (bezier((0,-16), (5,-9), (12,-2), (10,5), 15)
               + bezier((10,5), (8,17), (-12,17), (-10,4), 15)
               + bezier((-10,4), (-9,-2), (-4,-9), (0,-16), 15))
    p.pigment(placed(outline, x, y, scale, angle), "#1d8b91", "#b8ffdb")
    p.ribbon(placed(arc(7.5, 6, 6, 104, (0, 6), steps=20), x, y, scale, angle),
             2.2*scale, "#3cc5b5", "#a5f5d5", "#ddfff0", .85)
    p.star(*placed([(-3, 1)], x, y, scale, angle)[0], 4.6*scale, "#d2fff1")


def mint(p, phase):
    veil = ("#8966ce", "#c9a9ff", "#f3dbff")
    diagrams = (
        ([((-65, 28), (-33, 56), (37, 54), (61, 23), 6)],
         [(-48, 15, .63, -32), (51, 17, .62, 28)],
         [(-27, 34, 5), (44, 39, 5), (66, 4, 4)]),
        ([((-79, 16), (-94, 52), (21, 63), (63, 28), 8),
          ((-56, 38), (-10, 55), (95, 37), (78, 13), 4)],
         [(-63, 8, .97, -39), (-36, 37, .76, -20), (4, 28, .67, 10),
          (45, 36, .76, 23), (67, 1, 1.06, 38)],
         [(-79, -15, 10), (-55, 33, 7), (-18, 48, 6), (19, 46, 7), (80, 24, 8),
          (80, -20, 8), (40, -2, 5)]),
        ([((-75, 32), (-30, 54), (49, 57), (74, 23), 5)],
         [(-76, 15, .58, -34), (-39, 48, .53, -23), (72, 21, .59, 44)],
         [(-85, 1, 7), (-63, 41, 5), (50, 43, 5), (86, 3, 6)]),
    )
    ribbons, drops, glints = diagrams[phase]
    for *controls, width in ribbons:
        p.ribbon(bezier(*controls), width, *veil, .86)
    for spec in drops:
        droplet(p, *spec)
    p.dust(glints, "#e1baff")


PAINTERS = (bite, moss, mark, wall, haste, mint)


def read_json(folder, name):
    return json.loads((folder / name).read_text(encoding="utf-8"))


def write_json(folder, name, data):
    (folder / name).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def pack(folder):
    atlas = Image.new("RGBA", (3 * CELL, len(ROWS) * CELL))
    metadata = {
        "image": "pet_assist_fx.webp", "width": atlas.width, "height": atlas.height,
        "cellSize": CELL, "columns": list(PHASES), "reducedMotion": "peak",
        "pivot": {"x": .5, "y": .5}, "rows": [], "frames": {},
    }
    seed_manifest = read_json(folder, "seeds.json")["rows"]
    for row, ((pet, anchor, _), painter) in enumerate(zip(ROWS, PAINTERS)):
        keys = []
        for col, (phase, opacity) in enumerate(zip(PHASES, (.82, 1, .51))):
            paint = Paint(seed_manifest[pet][phase], opacity)
            painter(paint, col)
            x, y = CELL * col, CELL * row
            atlas.paste(paint.finish(), (x, y))
            key = f"{pet}_{phase}"
            keys.append(key)
            metadata["frames"][key] = {"x": x, "y": y, "w": CELL, "h": CELL}
        metadata["rows"].append({"id": pet, "anchor": anchor, "frames": keys})
    atlas.save(folder / metadata["image"], lossless=True, exact=True, method=6)
    write_json(folder, "pet_assist_fx.json", metadata)
    return atlas


def storyboard(folder, atlas, units_path, background_path):
    units = Image.open(units_path).convert("RGBA")
    assert units.size == (1024, 1536)
    guardian = units.crop((0, 0, 512, 512)).resize(
        (ART_HEIGHT, ART_HEIGHT), Image.Resampling.LANCZOS)
    raider = ImageOps.mirror(units.crop((0, 1024, 512, 1536))).resize(
        (ART_HEIGHT, ART_HEIGHT), Image.Resampling.LANCZOS)

    width, panel_height, header, row_header, footer = 390, 179, 79, 48, 24
    height = header + len(ROWS) * (row_header + 3 * panel_height) + footer
    board = Image.new("RGBA", (width, height), "#141a26")
    draw = ImageDraw.Draw(board)
    font = ImageFont.load_default(size=12)
    small = ImageFont.load_default(size=10)
    title = ImageFont.load_default(size=25)
    subtitle = ImageFont.load_default(size=17)
    draw.text((16, 13), "ASTERVEIL  /  FATEWEAVE", fill="#dbb98c", font=small)
    draw.text((16, 27), "Pet battle assists", fill="#fff1d7", font=title)
    draw.text((16, 57), "390 px battle-scale storyboard", fill="#aebcd3", font=font)

    bg = Image.open(background_path).convert("RGBA")
    bg = ImageOps.fit(bg, (width, panel_height), method=Image.Resampling.LANCZOS,
                      centering=(.5, .69))
    bg.alpha_composite(Image.new("RGBA", bg.size, (17, 23, 42, 74)))
    accents = ("#ffca80", "#b6db79", "#d5adff", "#edc999", "#ffc270", "#9aefdc")
    face_regions = ((129, 75, 159, 96), (230, 75, 262, 97))
    hp_regions = ((109, 161, 179, 175), (211, 161, 281, 175))
    for row, (row_id, anchor, name) in enumerate(ROWS):
        top = header + row * (row_header + 3 * panel_height)
        draw.line((16, top, 374, top), fill="#3a4357")
        draw.text((16, top + 6), name, fill=accents[row], font=subtitle)
        draw.text((16, top + 27), row_id.replace("_", " ").title(),
                  fill="#b2bfd1", font=small)
        for col, phase in enumerate(PHASES):
            panel = bg.copy()
            ui = ImageDraw.Draw(panel)
            for x in (144, 246):
                ui.ellipse((x-38, 148, x+38, 160), fill="#192330")
            panel.alpha_composite(guardian, (90, 50))
            panel.alpha_composite(raider, (192, 51))

            x = 144 if anchor == "hero_center" else 246
            y = 34 if anchor == "above_foe_head" else 103
            fx = atlas.crop((col*CELL, row*CELL, (col+1)*CELL, (row+1)*CELL))
            fx = fx.resize((FX_SIZE, FX_SIZE), Image.Resampling.LANCZOS)
            offset = (x - FX_SIZE // 2, y - FX_SIZE // 2)
            alpha = Image.new("L", panel.size)
            alpha.paste(fx.getchannel("A"), offset)
            for region in (*face_regions, *hp_regions):
                assert alpha.crop(region).getextrema()[1] <= 12, (row_id, phase, region)
            assert fx.getchannel("A").crop((0, 0, FX_SIZE, max(0, -offset[1]))).getbbox() is None, (
                row_id, phase, "top clipping")
            panel.alpha_composite(fx, offset)

            ui = ImageDraw.Draw(panel)
            ui.rounded_rectangle((10, 10, 77, 29), radius=4, fill="#1c2935")
            ui.text((16, 13), phase.title(), fill=accents[row] if col == 1 else "#d9e2ef", font=font)
            for center, ink, label in ((144, "#5bc78f", "Hero HP"), (246, "#e68b80", "Foe HP")):
                ui.rounded_rectangle((center-35, 161, center+35, 175), radius=3, fill="#202b39")
                ui.text((center, 167), label, anchor="mm", fill="#eaf0f8", font=small)
                ui.line((center-31, 173, center+31, 173), fill=ink)
            panel_y = top + row_header + col * panel_height
            board.alpha_composite(panel, (0, panel_y))
            draw.line((0, panel_y + panel_height - 1, width, panel_y + panel_height - 1),
                      fill="#394553")
    board.convert("RGB").save(folder / "storyboard_390.png", optimize=True)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def scan(folder, expected_atlas=None):
    image_names = {"pet_assist_fx.webp", "storyboard_390.png"}
    names = image_names | {"pet_assist_fx.json", "prompts.json", "seeds.json", "NOTES.md", "assemble.py"}
    files = {name: {"sha256": digest(folder / name)} for name in sorted(names)}
    cells = {}
    for name in sorted(image_names):
        with Image.open(folder / name) as image:
            image.load()
            files[name].update(dimensions=list(image.size), mode=image.mode,
                               alphaExtrema=list(image.getchannel("A").getextrema())
                               if "A" in image.getbands() else None)
            if name == "storyboard_390.png":
                assert image.format == "PNG" and image.width == 390
                assert image.mode == "RGB"
                continue
            assert image.format == "WEBP" and image.mode == "RGBA"
            assert image.size == (3*CELL, len(ROWS)*CELL)
            assert image.getchannel("A").getextrema() == (0, 255)
            if expected_atlas is not None:
                assert image.tobytes() == expected_atlas.tobytes()
            metadata = read_json(folder, "pet_assist_fx.json")
            assert metadata["columns"] == list(PHASES)
            assert (metadata["width"], metadata["height"]) == image.size
            assert len(metadata["frames"]) == 18
            assert len(metadata["rows"]) == len(ROWS)
            for row, (pet, anchor, _) in enumerate(ROWS):
                keys = [f"{pet}_{phase}" for phase in PHASES]
                assert metadata["rows"][row] == {"id": pet, "anchor": anchor, "frames": keys}
                for col, key in enumerate(keys):
                    x, y = col * CELL, row * CELL
                    assert metadata["frames"][key] == {"x": x, "y": y, "w": CELL, "h": CELL}
                    frame = image.crop((x, y, x+CELL, y+CELL))
                    alpha = frame.getchannel("A")
                    bbox = alpha.getbbox()
                    assert bbox and bbox[0] >= 20 and bbox[1] >= 20, (key, bbox)
                    assert bbox[2] <= CELL-20 and bbox[3] <= CELL-20, (key, bbox)
                    # Reject invisible RGB and long edge strokes inside the blank perimeter.
                    assert all(a or (r == g == b == 0) for r, g, b, a in frame.get_flattened_data())
                    for edge in range(32):
                        for s in (edge, CELL-1-edge):
                            assert sum(alpha.crop((0, s, CELL, s+1)).histogram()[1:]) < 40
                            assert sum(alpha.crop((s, 0, s+1, CELL)).histogram()[1:]) < 40
                    radius = max(
                        math.hypot(index % CELL-127.5, index // CELL-127.5) * FX_SIZE/CELL
                        for index, value in enumerate(alpha.get_flattened_data()) if value >= 30
                    )
                    if col == 1:
                        assert 28 <= radius <= 56, (key, radius)
                    cells[key] = {"alphaExtrema": list(alpha.getextrema()), "alphaBounds": list(bbox),
                                  "radiusCssPxAtAlpha30": round(radius, 1)}
    return {"files": files, "cells": cells, "transparentBorderPx": 20}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    root = HERE.parents[1]
    parser.add_argument("--units", type=Path, default=root / "public/assets/art/units.webp")
    parser.add_argument("--background", type=Path,
                        default=root / "public/assets/art/battle_forest.webp")
    parser.add_argument("--verify", type=Path, metavar="PACKAGE",
                        help="Verify a downloaded package without regenerating it")
    args = parser.parse_args()
    if args.verify:
        assert read_json(args.verify, "validation.json") == scan(args.verify)
        print("SHA-256 and Pillow decode verified for the downloaded package.")
        return
    atlas = pack(HERE)
    storyboard(HERE, atlas, args.units, args.background)
    write_json(HERE, "validation.json", scan(HERE, expected_atlas=atlas))


if __name__ == "__main__":
    main()
