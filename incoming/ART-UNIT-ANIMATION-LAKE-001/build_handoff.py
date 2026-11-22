#!/usr/bin/env python3
"""Build and verify Moonshadow Lake's 512px action rows and 390px previews."""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re

import cv2
import numpy as np
from PIL import Image, ImageDraw

from motion import ACTIONS, ACTION_BEATS, ATLAS_FRAMES, CONTACT, DOWN, HIT, HOVER, MODELS, SEEDS, WINDUP

SIZE = 512
GROUND = 497
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BASE = "72c3d0584c0b98c8267314b7d89461a5ac589e4f"
GRID_Y, GRID_X = np.mgrid[:SIZE, :SIZE].astype(np.float32)
BASE_FILES = {
    "units_foes.webp": "public/assets/art/units_foes.webp",
    "units_foes2.webp": "public/assets/art/units_foes2.webp",
    "units.webp": "public/assets/art/units.webp",
    "battle_riftline.webp": "public/assets/art/battle_riftline.webp",
    "unit-anatomy-audit.py": "scripts/unit-anatomy-audit.py",
    "unit-frames.ts": "src/game/visuals/unit-frames.ts",
}
cv2.setNumThreads(1)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def png(path, image):
    path.parent.mkdir(exist_ok=True, parents=True)
    image.save(path, optimize=True)


def base_asset(name, references):
    path = references / name if references else REPO / BASE_FILES[name]
    if not path.is_file():
        raise FileNotFoundError(f"Missing pinned base input {path}")
    return path


def crop_cell(atlas, index):
    x, y = index % 2 * SIZE, index // 2 * SIZE
    return atlas.crop((x, y, x + SIZE, y + SIZE))


def alpha_box(im, threshold=40):
    return im.getchannel("A").point(lambda value: 255 if value > threshold else 0).getbbox()


def extract_old_seeds(references):
    atlases = {sheet: base_asset(f"units_{sheet}.webp", references) for sheet in ("foes", "foes2")}
    images = {sheet: Image.open(path).convert("RGBA") for sheet, path in atlases.items()}
    data = {}
    for key, (art, sheet, index) in SEEDS.items():
        seed = crop_cell(images[sheet], index)
        path = HERE / "seeds" / f"{key}-standin.png"
        png(path, seed)
        x, y = index % 2 * SIZE, index // 2 * SIZE
        data[key] = {
            "oldArtKey": art, "atlas": BASE_FILES[f"units_{sheet}.webp"], "atlasSha256": digest(atlases[sheet]),
            "cell": index, "box": [x, y, x + SIZE, y + SIZE], "facing": "left",
            "groundY": GROUND, "alphaBounds": alpha_box(seed), "seed": str(path.relative_to(HERE)),
            "seedSha256": digest(path),
        }
    return data


def verify_layout_source(path):
    source = path.read_text()
    sequence = source.split("export function sequence(", 1)[1]

    def numbers(match):
        return tuple(int(n) for n in re.findall(r"\d+", match))

    shared = sequence.split("if (clip === 'skill') return ", 1)[1]
    shared_rows = re.findall(r"phase === 'prepare' \? \[([\d, ]+)\] : \[([\d, ]+)\]", shared)
    for lane, (prepare, recover) in zip(("skill", "attack"), shared_rows, strict=True):
        if numbers(prepare + " " + recover) != ATLAS_FRAMES[lane]:
            raise ValueError(f"Seed layout changed for {lane}")
    for lane in ("hit", "down"):
        match = re.search(rf"pose === '{lane}'\) return \[([\d, ]+)\]", sequence)
        if not match or numbers(match[1]) != ATLAS_FRAMES[lane]:
            raise ValueError(f"Seed layout changed for {lane}")
    for key, actions in ACTIONS.items():
        art = SEEDS[key][0]
        definition = next(line for line in source.splitlines() if f"{art}: {{" in line)
        for action in actions:
            if f"'{action.intent}': '{action.lane}'" not in definition \
                    and f"{action.intent}: '{action.lane}'" not in definition:
                raise ValueError(f"Seed intent mapping changed for {art} / {action.intent}")
        if key == "mist-wisp":
            match = re.search(r"idleLoop: \{ frames: \[([\d, ]+)\], frameMs: 160", definition)
            if not match or numbers(match[1]) != ATLAS_FRAMES["idle"]:
                raise ValueError("Mist Wisp's seed hover layout changed")


def isolate_body(source):
    rgba = np.array(source.convert("RGBA"))
    alpha = rgba[:, :, 3]
    # Keep the main silhouette and a thin band for true antialiasing. Disconnected
    # generator dust and alpha haze outside the silhouette do not belong to the rig.
    _, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 52).astype(np.uint8))
    if len(stats) < 2:
        raise ValueError("Missing silhouette in source region")
    body = (labels == (1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    fringe = cv2.dilate(body, np.ones((7, 7), dtype=np.uint8))
    rgba[fringe == 0] = 0
    image = Image.fromarray(rgba)
    return image.crop(image.getbbox())


def slug(model):
    return f"{model.key}-{model.variant}"


def master(model, sources):
    path = HERE / "seeds" / f"{slug(model)}-ready.png"
    if sources:
        filename = "roster.png" if model.source_box else "serpent-r2.png"
        with Image.open(sources / filename) as original:
            piece = original.crop(model.source_box) if model.source_box else original.copy()
        cutout = isolate_body(piece)
        cutout.thumbnail((model.width, model.height), Image.Resampling.LANCZOS)
        box = alpha_box(cutout)
        ready = Image.new("RGBA", (SIZE, SIZE))
        x = round((SIZE - cutout.width) / 2)
        ready.alpha_composite(cutout, (x, model.baseline - box[3]))
        if model.opacity != 1:
            ready.putalpha(ready.getchannel("A").point(lambda alpha: round(alpha * model.opacity)))
        png(path, ready)
    with Image.open(path) as ready:
        return ready.convert("RGBA"), path


def smoothstep(value):
    value = np.clip(value, 0, 1)
    return value * value * (3 - 2 * value)


def xy_in_box(box, point):
    left, top, right, bottom = box
    return left + (right - left) * point[0], top + (bottom - top) * point[1]


def mouth_pose(image, key, variant, box, openness):
    if openness <= .03:
        return image
    x_ratio, y_ratio, rx, ry = {
        ("tide-slime", "r1"): (.22, .65, 20, 13),
        ("shadow-serpent", "r1"): (.23, .40, 20, 8),
        ("shadow-serpent", "r2"): (.15, .34, 13, 6),
        ("weeping-siren", "r1"): (.33, .27, 8, 4),
        ("weeping-siren", "r2"): (.26, .23, 8, 4),
    }[(key, variant)]
    x, y = xy_in_box(box, (x_ratio, y_ratio))
    # Interior mouth paint is clipped to the existing face texture.
    effect = Image.new("RGBA", image.size)
    draw = ImageDraw.Draw(effect)
    height = ry * openness
    draw.ellipse((x - rx, y - height * .35, x + rx, y + height),
                 fill=(18, 28, 57, round(230 * min(1, openness * 1.7))))
    if key == "tide-slime" and openness > .55:
        draw.ellipse((x - rx * .49, y + height * .42, x + rx * .51, y + height * .87), fill=(131, 140, 189, 230))
    alpha = np.minimum(np.array(effect.getchannel("A")), np.array(image.getchannel("A")))
    effect.putalpha(Image.fromarray(alpha))
    return Image.alpha_composite(image, effect)


def blend_tracks(track, strength):
    return {
        channel: tuple(value * strength for value in amount) if isinstance(amount, tuple) else amount * strength
        for channel, amount in track.items()
    }


def render_frame(ready, model, state):
    if not state:
        return ready.copy()
    box = alpha_box(ready)
    left, top, right, bottom = box
    width, height = right - left, bottom - top
    rise = smoothstep((bottom - GRID_Y) / (height * .72))
    dx = rise * state.get("bend", 0)
    # The anchored lower body keeps position. The hover channel intentionally
    # moves the whole cutout above the common virtual ground.
    dy = np.full_like(dx, state.get("hover", 0)) + rise * state.get("sink", 0)
    floor_weight = smoothstep((model.baseline - GRID_Y) / 25)
    for name, joint in model.joints.items():
        if name not in state:
            continue
        cx, cy = xy_in_box(box, joint.center)
        rx, ry = joint.radius
        distance = np.hypot((GRID_X - cx) / (rx * width), (GRID_Y - cy) / (ry * height))
        weight = (1 - smoothstep((distance - .41) / .80)) * floor_weight
        tx, ty, *rotation = state[name]
        dx += tx * weight
        dy += ty * weight
        if rotation:
            px, py = xy_in_box(box, joint.pivot)
            cos, sin = math.cos(rotation[0]), math.sin(rotation[0])
            dx += ((cos - 1) * (GRID_X - px) - sin * (GRID_Y - py)) * weight
            dy += (sin * (GRID_X - px) + (cos - 1) * (GRID_Y - py)) * weight

    # Protect facial planes from pulling by the neighboring neck, chest and
    # hair tracks. Use an exact inverse rotation in the rigid head region.
    if "head" in model.joints:
        head = model.joints["head"]
        tx, ty, *rotation = state.get("head", (0, 0))
        tx += state.get("bend", 0) * .9
        ty += state.get("sink", 0) * .9 + state.get("hover", 0)
        px, py = xy_in_box(box, head.pivot)
        relative_x, relative_y = GRID_X - px - tx, GRID_Y - py - ty
        cos, sin = math.cos(rotation[0] if rotation else 0), math.sin(rotation[0] if rotation else 0)
        source_x = px + cos * relative_x + sin * relative_y
        source_y = py - sin * relative_x + cos * relative_y
        protect = smoothstep((top + height * .62 + ty - GRID_Y) / (height * .19))
        dx = dx * (1 - protect) + (GRID_X - source_x) * protect
        dy = dy * (1 - protect) + (GRID_Y - source_y) * protect

    paint = mouth_pose(ready, model.key, model.variant, box, state.get("mouth", 0))
    pixels = np.asarray(paint).astype(np.float32) / 255
    pixels[:, :, :3] *= pixels[:, :, 3:]
    bent = cv2.remap(pixels, GRID_X - dx, GRID_Y - dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    alpha = bent[:, :, 3:]
    np.divide(bent[:, :, :3], alpha, out=bent[:, :, :3], where=alpha > 0)
    alpha *= 1 - state.get("fade", 0)
    return Image.fromarray(np.rint(np.clip(bent * 255, 0, 255)).astype(np.uint8))


def map_strips(model):
    for action in ACTIONS[model.key]:
        states = tuple(
            blend_tracks(action.windup if windup else action.contact, windup or contact)
            if windup or contact else {} for windup, contact in zip(WINDUP, CONTACT)
        )
        if action.intent == "Coil Gathering":
            states = (*states[:6], blend_tracks(action.contact, .58), {})
        yield action.intent, action.lane, ACTION_BEATS, action.gesture, states
    yield "hit", "hit", ("recoil", "settle"), "Recoils right, then catches its balance.", (
        HIT[model.key], blend_tracks(HIT[model.key], .28),
    )
    yield "down", "down", ("buckle", "drop", "hold"), "Settles into its down hold.", tuple(
        blend_tracks(DOWN[model.key], strength) for strength in (.33, .72, 1)
    )
    if model.key == "mist-wisp":
        yield "idle", "idle", ("rest", "bob-up", "bob-down"), "Three hover poses, loop at 160 ms per frame.", HOVER


def write_strip(model, intent, lane, beats, gesture, frames):
    name = re.sub("[^a-z0-9]+", "-", intent.lower())
    path = HERE / "raw" / f"{slug(model)}-{name}.png"
    strip = Image.new("RGBA", (SIZE * len(frames), SIZE))
    bounds = []
    for i, frame in enumerate(frames):
        box = frame.getbbox()
        if not box or min(box[0], box[1], SIZE - box[2], SIZE - box[3]) < 9:
            raise ValueError(f"{path.name}:{i + 1} trimmed or too close to cell edge: {box}")
        bounds.append(box)
        strip.paste(frame, (i * SIZE, 0))
    if len(frames) != len(ATLAS_FRAMES[lane]):
        raise ValueError(f"{path.name}: wrong frame count")
    png(path, strip)
    return {
        "actor": model.key, "variant": model.variant, "recommended": model.variant == "r1",
        "intent": intent, "clip": lane, "file": str(path.relative_to(HERE)), "frames": len(frames),
        "cellWidth": SIZE, "cellHeight": SIZE, "groundY": GROUND, "facing": "left",
        "phaseOrder": beats, "gesture": gesture, "seedLayoutIndices": ATLAS_FRAMES[lane],
        "seedLayoutOnly": lane in ("attack", "skill"), "frameAlphaBounds": bounds,
        "gaps": [SIZE - a[2] + b[0] for a, b in zip(bounds, bounds[1:])],
    }


def place(image, actor, x, y, size):
    scaled = actor.resize((size, size), Image.Resampling.LANCZOS)
    image.alpha_composite(scaled, (round(x - size / 2), round(y - GROUND * size / SIZE)))


def preview_scene(references):
    background = Image.open(base_asset("battle_riftline.webp", references)).convert("RGBA")
    width, height = 390, 234
    # riftBackdropFrame for a view containing the field alone.
    ax, ay = width / 2, height * .27
    scale = max(width / 1536, height / 768, ax / 768, ay / (1024 * .45), (height - ay) / (1024 * .55))
    left, top = ax - 1536 * scale / 2, ay - 1024 * scale * .45
    stage = background.transform((width, height), Image.Transform.AFFINE,
                                 (1 / scale, 0, -left / scale, 0, 1 / scale, -top / scale),
                                 Image.Resampling.BICUBIC)
    heroes = Image.open(base_asset("units.webp", references)).convert("RGBA")
    place(stage, crop_cell(heroes, 2), 55, 148, 89)
    place(stage, crop_cell(heroes, 0), 128, 192, 100)
    return stage


def preview_variant(model, ready, clips, stage):
    x, y = (281, 193) if model.row == "front" else (319, 168)
    samples = []

    def with_pose(pose):
        panel = stage.copy()
        place(panel, pose, x, y, model.display_size)
        return panel.convert("RGB")

    for _, lane, frames in clips:
        if lane == "idle":
            for _ in range(2):
                samples.extend((with_pose(f), 160) for f in frames)
            continue
        samples.append((with_pose(ready), 300))
        samples.extend((with_pose(f), 95 if lane != "down" else 125) for f in frames)
        samples.append((with_pose(frames[-1]), 480 if lane == "down" else 130))

    path = HERE / "preview" / f"{slug(model)}-390.webp"
    path.parent.mkdir(exist_ok=True)
    samples[0][0].save(path, save_all=True, append_images=[image for image, _ in samples[1:]],
                       duration=[ms for _, ms in samples], loop=0, quality=76, method=4)
    return with_pose(ready)


def measure_anatomy(audit_path, cells):
    spec = importlib.util.spec_from_file_location("repository_anatomy_audit", audit_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.audit(cells)


def file_record(path):
    row = {"sha256": digest(path), "bytes": path.stat().st_size}
    if path.suffix in (".webp", ".png"):
        with Image.open(path) as image:
            row.update(width=image.width, height=image.height, frames=getattr(image, "n_frames", 1), mode=image.mode)
            for index in range(row["frames"]):
                image.seek(index)
                image.load()
    return row


def verify(tree):
    validation = json.loads((tree / "validation.json").read_text())
    expected = validation["files"]
    observed = {str(path.relative_to(tree)) for path in tree.rglob("*") if path.is_file()
                and path.name != "validation.json" and "__pycache__" not in path.parts}
    if observed != set(expected):
        raise ValueError(f"File set changed: {sorted(observed ^ set(expected))}")
    for name, row in expected.items():
        if row != file_record(tree / name):
            raise ValueError(f"Hash, size or Pillow decode mismatch: {name}")
    print(f"Verified SHA-256 and Pillow decode for {len(expected)} package files.")


def build(references, sources):
    layout_path = base_asset("unit-frames.ts", references)
    verify_layout_source(layout_path)
    seeds = extract_old_seeds(references)
    stage = preview_scene(references)
    rows = []
    posters = []
    anatomy = {}
    audit_path = base_asset("unit-anatomy-audit.py", references)
    for model in MODELS:
        ready, path = master(model, sources)
        seeds[model.key].setdefault("variants", {})[model.variant] = {
            "seed": str(path.relative_to(HERE)), "sourceBox": model.source_box, "sha256": digest(path),
            "alphaBounds": alpha_box(ready), "groundY": GROUND, "displaySize390": model.display_size,
            "facing": "left", "recommended": model.variant == "r1",
        }
        clips = []
        all_cells = [ready]
        for intent, lane, beats, gesture, states in map_strips(model):
            frames = [render_frame(ready, model, state) for state in states]
            rows.append(write_strip(model, intent, lane, beats, gesture, frames))
            clips.append((intent, lane, frames))
            all_cells.extend(frames)
        report = measure_anatomy(audit_path, all_cells)
        anatomy[slug(model)] = report
        drift = [(row["frame"], row["scale"]) for row in report if row["status"] == "drift"]
        unmeasured = [row["frame"] for row in report if row["status"] == "not-measured"]
        print(f"{slug(model)}: {len(all_cells)} frames, drift {drift}, not measured {unmeasured}", flush=True)
        posters.append(preview_variant(model, ready, clips, stage))
    panel_height = stage.height
    overview = Image.new("RGB", (stage.width, len(posters) * panel_height))
    for index, panel in enumerate(posters):
        overview.paste(panel, (0, index * panel_height))
    png(HERE / "preview-390.png", overview)
    write_json(HERE / "seeds.json", {"base": BASE, "seeds": seeds})
    write_json(HERE / "strips.json", {"base": BASE, "strips": rows})
    checks = {str(path.relative_to(HERE)): file_record(path) for path in sorted(HERE.rglob("*"))
              if path.is_file() and path.name != "validation.json" and "__pycache__" not in path.parts}
    drift_count = sum(row["status"] == "drift" for report in anatomy.values() for row in report)
    not_measured = sum(row["status"] == "not-measured" for report in anatomy.values() for row in report)
    write_json(HERE / "validation.json", {
        "base": BASE, "fileCount": len(checks), "stripCount": len(rows),
        "stripFrameCount": sum(row["frames"] for row in rows),
        "smallestInterFrameGap": min(gap for row in rows for gap in row["gaps"]),
        "layoutSource": BASE_FILES["unit-frames.ts"], "layoutSourceSha256": digest(layout_path),
        "previewBackdrop": BASE_FILES["battle_riftline.webp"],
        "previewBackdropSha256": digest(base_asset("battle_riftline.webp", references)),
        "anatomyAudit": {"source": BASE_FILES["unit-anatomy-audit.py"], "sha256": digest(audit_path),
                         "drift": drift_count, "notMeasured": not_measured, "report": anatomy},
        "files": checks,
    })
    if drift_count:
        raise SystemExit("Repository anatomy audit flagged scale drift.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--references", type=Path, help="Pinned base files by basename, for a sparse checkout")
    parser.add_argument("--sources", type=Path, help="Optional original ImageGen roster.png and serpent-r2.png")
    parser.add_argument("--verify", nargs="?", type=Path, const=HERE, help="Only verify SHA-256 and Pillow decoding")
    args = parser.parse_args()
    if args.verify:
        verify(args.verify.resolve())
    else:
        build(args.references, args.sources)
        verify(HERE)


if __name__ == "__main__":
    main()
