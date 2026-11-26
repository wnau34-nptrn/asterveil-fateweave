"""Build unit cels, pose strips and 390px review previews."""
import cv2
import numpy as np
from PIL import Image, ImageDraw

from manifest import ROOT, manifest, write_metadata

CELL = 512
FLOOR = 497
UNITS = {
    'bat': ('Crystal Cry', None, 282, 108),
    'golem': ('Ore Fist', None, 402, 0),
    'worker': ('Pick Swing', None, 365, 0),
    'overseer': ('Overseer Hammer', 'Crystal Spark', 440, 0),
    'eater': ('Crystal Bite', 'Shard Eruption', 370, 0),
}
# Optional hand-tuned adjustment relative to a strip's common reference scale.
STRIP_SCALE = {
    ('worker', 'attack'): 1.075,
    ('worker', 'reactions'): 1.16,
}
# Preserve the target upper-body size when visual evidence shows drift in only one pose.
POSE_SCALE = {
    ('bat', 'reactions', 1): 1.06, ('bat', 'reactions', 2): 1.10, ('bat', 'reactions', 4): 1.11,
    ('eater', 'reactions', 0): 1.18, ('eater', 'reactions', 1): 1.18,
    ('worker', 'reactions', 2): 1.12, ('worker', 'reactions', 3): 1.08,
    ('worker', 'reactions', 4): 1.12, ('overseer', 'attack', 4): .925,
}
RAW = ROOT / 'raw'
FRAMES = ROOT / 'frames'
STRIPS = ROOT / 'strips'
PREVIEW = ROOT / 'preview'


def subject(image):
    alpha = np.array(image.getchannel('A'))
    alpha[alpha < 24] = 0
    image.putalpha(Image.fromarray(alpha))
    return image.crop(image.getbbox())


def identify_poses(raw_path, count, rows):
    image = Image.open(raw_path).convert('RGBA')
    rgba = np.array(image)
    support = (rgba[..., 3] > 68).astype(np.uint8)
    total, labels, stats, centers = cv2.connectedComponentsWithStats(support, 8)
    components = sorted(range(1, total), key=lambda i: stats[i, -1], reverse=True)
    major = components[:count]
    assert len(major) == count and stats[major[-1], -1] > 8000, (raw_path, stats[major, -1])
    major.sort(key=lambda i: centers[i, 1])
    cols = count // rows
    ordered = [i for row in range(rows) for i in sorted(major[row * cols:(row + 1) * cols], key=lambda i: centers[i, 0])]
    if len(components) > count and stats[components[count], -1] > stats[major[-1], -1] * .65:
        raise ValueError(f'Ambiguous cel count in {raw_path}')
    poses = []
    for i in ordered:
        chosen = [i]
        for j in components[count:]:
            if stats[j, -1] < 45:
                break
            distances = {k: np.linalg.norm(centers[k] - centers[j]) for k in major}
            if min(distances, key=distances.get) == i and distances[i] < image.width / (cols * 2):
                chosen.append(j)
        selection = cv2.dilate(np.isin(labels, chosen).astype(np.uint8), np.ones((7, 7), np.uint8))
        extracted = rgba.copy()
        extracted[..., 3] *= selection
        poses.append(subject(Image.fromarray(extracted)))
    return poses


def cel(pose, ratio, foot_y, center=256):
    resized = pose.resize((round(pose.width * ratio), round(pose.height * ratio)), Image.Resampling.LANCZOS)
    x = round(center - resized.width / 2)
    y = foot_y - resized.height
    assert x >= 12 and x + resized.width <= CELL - 12 and y >= 8, (x, y, resized.size)
    image = Image.new('RGBA', (CELL, CELL))
    image.alpha_composite(resized, (x, y))
    return image


def output_strip(name, key, frames):
    directory = STRIPS / name
    directory.mkdir(exist_ok=True)
    strip = Image.new('RGBA', (CELL * len(frames), CELL))
    for i, frame in enumerate(frames):
        strip.alpha_composite(frame, (CELL * i, 0))
    filename = directory / f'{key}.png'
    strip.save(filename)
    return str(filename.relative_to(ROOT))


def make_unit(name, profile):
    first, second, height, lift = profile
    raw = ROOT / 'seeds' / f'{name}.png'
    seed = subject(Image.open(raw).convert('RGBA'))
    idle = cel(seed, min(height / seed.height, 480 / seed.width), FLOOR - lift)
    stage = FRAMES / name
    stage.mkdir(exist_ok=True)
    frame_table = [idle] * (26 if name == 'bat' else 22)
    descriptors = []
    actions = [('attack', first, 1, 8, 2), ('reactions', 'Hit and Down', 17, 5, 1)]
    if second:
        actions.append(('skill', second, 9, 8, 2))
    if name == 'bat':
        actions.append(('hover', 'Idle flight', 22, 4, 1))
    for key, move, start, count, rows in actions:
        source = RAW / f'{name}-{key}.png'
        poses = identify_poses(source, count, rows)
        nominal = np.median([p.height for p in poses[:2 if key == 'reactions' else count]])
        scale = (idle.getbbox()[3] - idle.getbbox()[1]) / nominal
        scale *= STRIP_SCALE.get((name, key), 1)
        scale = min(scale, min(480 / p.width for p in poses), min((FLOOR - lift - 10) / p.height for p in poses))
        action_cels = []
        for i, pose in enumerate(poses):
            # The bat falls from its flight anchor across the three down cels.
            offset = [lift, lift, int(lift * .62), int(lift * .28), 0][i] if key == 'reactions' else lift
            correction = POSE_SCALE.get((name, key, i), 1)
            ratio = min(scale * correction, 480 / pose.width, (FLOOR - offset - 10) / pose.height)
            action_cels.append(cel(pose, ratio, FLOOR - offset))
        frame_table[start:start + count] = action_cels
        if key == 'reactions':
            for part, begin, end in [('hit', 0, 2), ('down', 2, 5)]:
                descriptors.append({'move': 'Surrender' if name == 'worker' and part == 'down' else part,
                                    'firstFrame': start + begin, 'count': end - begin, 'source': str(source.relative_to(ROOT)),
                                    'strip': output_strip(name, part, action_cels[begin:end])})
        else:
            descriptors.append({'move': move, 'firstFrame': start, 'count': count, 'source': str(source.relative_to(ROOT)),
                                'strip': output_strip(name, key, action_cels)})
    if not second:
        descriptors.append({'move': None, 'firstFrame': 9, 'count': 8, 'fallbackFrame': 0})
    for i, frame in enumerate(frame_table):
        frame.save(stage / f'{i:03d}.png')
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
    cels, meta = {}, {}
    for name, design in UNITS.items():
        cels[name], meta[name] = make_unit(name, design)
    preview(cels)
    write_metadata('strips.json', {'logicalCell': CELL, 'feet': FLOOR, 'facing': 'left', 'units': meta})
    manifest(logicalCell=CELL, unitCount=len(cels), celsByUnit={k: len(v) for k, v in cels.items()})


if __name__ == '__main__':
    main()
