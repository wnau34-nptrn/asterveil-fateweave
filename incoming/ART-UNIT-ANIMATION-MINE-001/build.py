"""Build the Mine R2 body cells, packed strips and review images."""
import json
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

from manifest import ROOT, manifest, write_metadata

CELL = 512
FLOOR = 497
UNITS = {
    'bat': ('Crystal Cry', None, 278, 108),
    'golem': ('Ore Fist', None, 355, 0),
    'worker': ('Pick Swing', None, 345, 0),
    'overseer': ('Overseer Hammer', 'Crystal Spark', 402, 0),
    'eater': ('Crystal Bite', 'Shard Eruption', 330, 0),
}
RAW = ROOT / 'raw'
FRAMES = ROOT / 'frames'
STRIPS = ROOT / 'strips'
PREVIEW = ROOT / 'preview'
ATTACK_TRAVEL = (4, 10, 14, 2, -18, -12, -5, 0)
REACTION_SLOTS = {
    'bat': (0, 1, 2, 4, 3),
    'worker': (1, 2, 3, 5, 6),
}



def isolate(image):
    """Remove alpha traces left by the source renderer and retain soft edges."""
    rgba = np.array(image.convert('RGBA'))
    alpha = rgba[:, :, 3]
    alpha[alpha < 45] = 0
    alpha[alpha > 248] = 255
    rgba[alpha == 0] = 0
    image = Image.fromarray(rgba)
    box = image.getbbox()
    if not box:
        raise ValueError('A source pose is empty')
    return image.crop(box)


def recover_alpha(image):
    """Extract silhouettes from a neutral checker matte on opaque source sheets."""
    rgba = np.array(image.convert('RGBA'))
    rgb = rgba[:, :, :3].copy()
    brightness = rgb.mean(axis=2)
    chroma = np.ptp(rgb, axis=2)
    subject = ((chroma > 19) | (brightness < 90)).astype(np.uint8)
    _, labels, stats, _ = cv2.connectedComponentsWithStats(subject, 8)
    large = np.flatnonzero(stats[:, cv2.CC_STAT_AREA] > 2200)
    large = large[large != 0]
    subject = np.uint8(np.isin(labels, large))
    subject = cv2.morphologyEx(subject, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(subject, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    backing = np.zeros_like(subject)
    for contour in contours:
        cv2.drawContours(backing, [contour], -1, 1, cv2.FILLED)
    mask = np.full(subject.shape, cv2.GC_BGD, np.uint8)
    mask[cv2.dilate(backing, np.ones((7, 7), np.uint8)) != 0] = cv2.GC_PR_BGD
    mask[backing != 0] = cv2.GC_PR_FGD
    mask[cv2.erode(backing, np.ones((7, 7), np.uint8)) != 0] = cv2.GC_FGD
    background_model = np.zeros((1, 65), np.float64)
    foreground_model = background_model.copy()
    cv2.grabCut(rgb, mask, None, background_model, foreground_model, 2, cv2.GC_INIT_WITH_MASK)
    rgba[:, :, 3] = cv2.GaussianBlur((mask % 2 * 255).astype(np.uint8), (3, 3), .55)
    return Image.fromarray(rgba)


def poses_from_sheet(path, count):
    image = Image.open(path).convert('RGBA')
    if np.mean(np.asarray(image.getchannel('A')) < 45) < .10:
        image = recover_alpha(image)
    rgba = np.array(image)
    support = np.uint8(rgba[:, :, 3] >= 120)
    total, labels, stats, centers = cv2.connectedComponentsWithStats(support, 8)
    slots = {}
    for label in sorted(range(1, total), key=lambda index: stats[index, 4], reverse=True):
        if stats[label, 4] < 100:
            break
        x, y = centers[label]
        col = min(3, int(x * 4 / image.width))
        row = min(1, int(y * 2 / image.height))
        slots.setdefault(row * 4 + col, []).append(label)
    poses = []
    for index in range(count):
        components = slots.get(index, [])
        if not components or stats[components[0], 4] < 4000:
            raise ValueError(f'No full silhouette for slot {index} of {path}')
        main = components[0]
        # Include separated pieces such as a grounded shovel, but exclude scattered matte noise.
        keep = [main, *(i for i in components[1:] if stats[i, 4] >= 320)]
        selection = cv2.dilate(np.uint8(np.isin(labels, keep)), np.ones((5, 5), np.uint8))
        cut = rgba.copy()
        cut[:, :, 3] *= selection
        poses.append(isolate(Image.fromarray(cut)))
    return poses


def cel(pose, ratio, foot_y, center=256):
    resized = pose.resize((round(pose.width * ratio), round(pose.height * ratio)), Image.Resampling.LANCZOS)
    resized = isolate(resized)
    x = round(center - resized.width / 2)
    y = foot_y - resized.height
    if not (x >= 8 and x + resized.width <= CELL - 8 and y >= 8):
        raise ValueError(f'Pose does not fit its frame: {(x, y, resized.size)}')
    image = Image.new('RGBA', (CELL, CELL))
    image.alpha_composite(resized, (x, y))
    return image


def output_strip(name, key, frames):
    directory = STRIPS / name
    directory.mkdir(exist_ok=True)
    strip = Image.new('RGBA', (CELL * len(frames), CELL))
    for index, frame in enumerate(frames):
        strip.paste(frame, (CELL * index, 0))
    filename = directory / f'{key}.png'
    strip.save(filename)
    return str(filename.relative_to(ROOT))


def action_cells(poses, idle_height, name, key, lift, corrections):
    upright = poses[:2] if key == 'reactions' else poses
    shared = idle_height / np.median([pose.height for pose in upright])
    offsets = [lift] * len(poses)
    if key == 'reactions' and name == 'bat':
        offsets = [lift, lift, 68, 28, 0]
    if key == 'hover':
        offsets = [lift, lift - 12, lift, lift + 12]
    centers = [256 + shift for shift in ATTACK_TRAVEL] if key == 'attack' else [256] * len(poses)
    scales = corrections.get(name, {}).get(key, [1] * len(poses))
    frames = []
    for pose, offset, center, adjustment in zip(poses, offsets, centers, scales, strict=True):
        ratio = min(shared * adjustment, (2 * (min(center, CELL - center) - 12)) / pose.width,
                    (FLOOR - offset - 12) / pose.height)
        frames.append(cel(pose, ratio, FLOOR - offset, center))
    return frames


def make_unit(name, profile, corrections):
    first, second, height, lift = profile
    seed = isolate(Image.open(ROOT / 'seeds' / f'{name}.png'))
    idle = cel(seed, min(height / seed.height, 478 / seed.width), FLOOR - lift)
    stage = FRAMES / name
    stage.mkdir(exist_ok=True)
    frame_table = [idle] * (26 if name == 'bat' else 22)
    descriptors = []
    actions = [('attack', first, 1, 8), ('reactions', 'Hit and Down', 17, 5)]
    if second:
        actions.append(('skill', second, 9, 8))
    for key, move, start, count in actions:
        source = RAW / f'{name}-{key}.png'
        slots = REACTION_SLOTS.get(name, tuple(range(count))) if key == 'reactions' else tuple(range(count))
        source_count = 8 if name == 'bat' and key == 'reactions' else max(slots) + 1
        poses = poses_from_sheet(source, source_count)
        action = action_cells([poses[index] for index in slots], idle.getbbox()[3] - idle.getbbox()[1],
                              name, key, lift, corrections)
        frame_table[start:start + count] = action
        source_name = str(source.relative_to(ROOT))
        if key == 'reactions':
            for part, begin, end in [('hit', 0, 2), ('down', 2, 5)]:
                descriptors.append({'move': 'Surrender' if name == 'worker' and part == 'down' else part,
                                    'firstFrame': start + begin, 'count': end - begin, 'source': source_name,
                                    'strip': output_strip(name, part, action[begin:end])})
            if name == 'bat':
                hover = action_cells([seed, *poses[5:]], idle.getbbox()[3] - idle.getbbox()[1],
                                     name, 'hover', lift, corrections)
                hover[0] = idle
                frame_table[22:26] = hover
                descriptors.append({'move': 'Idle flight', 'firstFrame': 22, 'count': 4, 'source': source_name,
                                    'strip': output_strip(name, 'hover', hover)})
        else:
            descriptors.append({'move': move, 'firstFrame': start, 'count': count, 'source': source_name,
                                'strip': output_strip(name, key, action)})
    if not second:
        descriptors.append({'move': None, 'firstFrame': 9, 'count': 8, 'fallbackFrame': 0})
    for index, frame in enumerate(frame_table):
        frame.save(stage / f'{index:03d}.png')
    return frame_table, {'directory': str(stage.relative_to(ROOT)), 'frames': len(frame_table), 'footY': FLOOR,
                         'airborneOffset': lift, 'strips': sorted(descriptors, key=lambda item: item['firstFrame'])}


def field():
    scene = Image.open(ROOT / 'sources/bg_mine.webp').convert('RGB')
    ax, ay = 195, 170 + 477 * .27
    scale = max(378 / 1536, 477 / 768, ax / 768, ay / (1024 * .45), (844 - ay) / (1024 * .55))
    left, top = ax - 768 * scale, ay - 1024 * .45 * scale
    return scene.transform((390, 844), Image.Transform.AFFINE,
                           (1 / scale, 0, -left / scale, 0, 1 / scale, -top / scale),
                           Image.Resampling.BICUBIC)


def display(stage, image, x, y, frame_px, foot_y):
    image = image.resize((frame_px, frame_px), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(stage)
    draw.ellipse((x - 16, y - 3, x + 16, y + 3), fill='#282725')
    stage.paste(image, (x - frame_px // 2, y - round(foot_y * frame_px / CELL)), image)
    draw.rectangle((x - 19, y + 7, x + 19, y + 10), fill='#78cdb3')


def preview(cels):
    slots = [(333, 272, 94), (250, 488, 105), (328, 613, 103), (306, 398, 109), (236, 615, 103)]
    base = field()
    for i, (x, y) in enumerate([(47, 272), (136, 272), (49, 491), (53, 614), (139, 614)]):
        display(base, Image.open(ROOT / 'sources' / f'actor-0-{i}.png'), x, y, 90, 497)
    for k in (0, 5, 18, 21):
        panel = base.copy()
        for (x, y, size), poses in zip(slots, cels.values()):
            display(panel, poses[k], x, y, size, FLOOR)
        panel.save(PREVIEW / f'field-{k:02d}-390.png')
    variants = Image.new('RGB', (390, 235), '#363943')
    for row, unit in enumerate(('overseer', 'eater')):
        variant = isolate(Image.open(ROOT / 'seeds' / f'{unit}-r2.png'))
        original = cels[unit][0]
        height = original.getbbox()[3] - original.getbbox()[1]
        alternate = cel(variant, min(height / variant.height, 478 / variant.width), FLOOR)
        for col, frame in enumerate((original, alternate)):
            sprite = frame.resize((115, 115), Image.Resampling.LANCZOS)
            variants.paste(sprite, (40 + col * 195, row * 116), sprite)
    variants.save(PREVIEW / 'elite-variants-390.png')
    for unit, poses in cels.items():
        panel = Image.new('RGB', (390, 224), '#44464a')
        for i, pose_index in enumerate([0, 3, 5, 7, 17, 19, 20, 21]):
            img = poses[pose_index].resize((96, 96), Image.Resampling.LANCZOS)
            panel.paste(img, (i % 4 * 97, i // 4 * 112), img)
        panel.save(PREVIEW / f'{unit}-poses-390.png')
        clips = {
            '': ((0, *range(1, 9), 0, 17, 18, 19, 20, 21),
                 [550] + [100] * 8 + [400, 90, 120, 140, 150, 700]),
        }
        if UNITS[unit][1]:
            clips['-skill'] = ((0, *range(9, 17)), [550] + [100] * 8)
        if unit == 'bat':
            clips['-hover'] = (range(22, 26), [130] * 4)
        for suffix, (indices, durations) in clips.items():
            frames = []
            for pose_index in indices:
                scene = base.copy()
                display(scene, poses[pose_index], 291, 485, 118, FLOOR)
                frames.append(scene)
            frames[0].save(PREVIEW / f'{unit}{suffix}-390.gif', save_all=True, append_images=frames[1:],
                           loop=0, duration=durations, disposal=2)



def main():
    for directory in (FRAMES, STRIPS, PREVIEW):
        directory.mkdir(exist_ok=True)
    corrections = json.loads((ROOT / 'pose-scale.json').read_text())
    cels, meta = {}, {}
    for name, design in UNITS.items():
        cels[name], meta[name] = make_unit(name, design, corrections)
    preview(cels)
    write_metadata('strips.json', {'logicalCell': CELL, 'feet': FLOOR, 'facing': 'left', 'units': meta})
    audit_dir = ROOT / 'anatomy'
    audit_dir.mkdir(exist_ok=True)
    audit_script = ROOT.parents[1] / 'scripts' / 'unit-anatomy-audit.py'
    for unit in cels:
        subprocess.run([sys.executable, str(audit_script), '--cells', str(FRAMES / unit),
                        '--json', str(audit_dir / f'{unit}.json')], check=True)
    manifest(logicalCell=CELL, unitCount=len(cels), celsByUnit={name: len(value) for name, value in cels.items()})


if __name__ == '__main__':
    main()
