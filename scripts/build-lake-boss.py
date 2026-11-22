#!/usr/bin/env python3
"""Import the approved Moon Lake boss artwork from ART-UNIT-ANIMATION-LAKE-BOSS-001.

Usage: python3 -I scripts/build-lake-boss.py <package-dir>
The 256px VFX layers keep their shipped pixels and pivots. The owner-approved 768px
body keeps the source framing and sole at 7/8. All runtime files are packed losslessly.
"""
import hashlib
import io
import json
from pathlib import Path
import runpy
import sys

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = Path(sys.argv[1])
VALIDATION = json.loads((PACKAGE / 'validation.json').read_text())['files']
PACKING = runpy.run_path(str(ROOT / 'scripts/repack-atlas-lossless.py'))
SHIPPED_ANCHORS = {
    'water-veil': 'caster.chest',
    'surging-wave': 'target.feet',
    'great-wave': 'whole_hero_side.actual_target_feet',
    'reflection': 'summoned_slot.feet',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def checked_image(name):
    data = (PACKAGE / name).read_bytes()
    record = VALIDATION[name]
    assert sha(data) == record['sha256'], name
    image = Image.open(io.BytesIO(data))
    image.load()
    assert image.mode == 'RGBA' and list(image.size) == record['size'], name
    return image


def pack(images, image_name, max_side=2048):
    """Trim and pack without changing alpha, visible RGB or the frame's original origin."""
    boxes = {name: image.getchannel('A').getbbox() for name, image in images.items()}
    assert all(boxes.values())
    tiles = {name: images[name].crop(box) for name, box in boxes.items()}
    sizes = {name: tile.size for name, tile in tiles.items()}
    widest = max(w for w, _ in sizes.values()) + PACKING['PAD']
    best = None
    for width in range(widest, max_side + 1, 8):
        for order in PACKING['ORDERS']:
            positions, height = PACKING['maxrects'](sizes, width, order)
            key = (width * height, max(width, height), width)
            if height <= max_side and (best is None or key < best[0]):
                best = (key, width, height, positions)
    assert best is not None, f'No {max_side}px packing for {image_name}'
    _, width, height, positions = best
    texture = Image.new('RGBA', (width, height))
    frames = {}
    for name, tile in tiles.items():
        x, y = positions[name]
        x += 1
        y += 1
        w, h = tile.size
        left, top, _, _ = boxes[name]
        texture.paste(tile, (x, y))
        sw, sh = images[name].size
        frames[name] = {
            'frame': {'x': x, 'y': y, 'w': w, 'h': h},
            'rotated': False, 'trimmed': True,
            'spriteSourceSize': {'x': left, 'y': top, 'w': w, 'h': h},
            'sourceSize': {'w': sw, 'h': sh},
        }
    packed = webp(texture)
    decoded = Image.open(io.BytesIO(packed)).convert('RGBA')
    for name, frame in frames.items():
        source = np.asarray(images[name])
        rebuilt = np.asarray(PACKING['source_canvas'](decoded, frame))
        assert np.array_equal(source[..., 3], rebuilt[..., 3]), name
        assert np.array_equal(source[source[..., 3] > 0], rebuilt[source[..., 3] > 0]), name
    return packed, {'frames': frames, 'meta': {'image': image_name, 'size': {'w': width, 'h': height}, 'scale': '1'}}


def webp(image):
    buffer = io.BytesIO()
    image.save(buffer, 'WEBP', lossless=True, exact=True, method=6)
    return buffer.getvalue()


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n')


def build_vfx():
    layers = json.loads((PACKAGE / 'layers.json').read_text())['effects']
    images, metadata = {}, {}
    for key, anchor in SHIPPED_ANCHORS.items():
        effect = layers[key]
        assert [layer['beat'] for layer in effect['layers']] == ['prepare', 'peak', 'settle']
        for layer, width in zip(effect['layers'], effect['canvasPx'], strict=True):
            name = f"{key}_{layer['beat']}"
            image = checked_image(layer['file'])
            assert image.size == (256, 256) and list(image.getchannel('A').getbbox()) == layer['bounds']
            images[name] = image
            metadata[name] = {'anchor': anchor, 'pivot': effect['pivot'], 'width': width}
    packed, atlas = pack(images, 'lake_boss_fx.webp')
    out = ROOT / 'public/assets/fx'
    (out / 'lake_boss_fx.webp').write_bytes(packed)
    write_json(out / 'lake_boss_fx.json', atlas)
    write_json(ROOT / 'src/game/visuals/lake-boss-art.json', metadata)


SELECTED_MOVES = (
    'tide-lash-r2', 'water-veil-r1', 'surging-wave-r1', 'undertow-r1',
    'great-wave-r1', 'reflection-r1', 'hit-r1', 'down-r1',
)
BODY_SIZE = 768


def build_body():
    strips = json.loads((PACKAGE / 'strips.json').read_text())
    assert strips['cellSize'] == [1024, 1024] and strips['soleOrigin'] == .875
    seed = checked_image('seeds/water-spirit-idle.png')
    assert seed.size == (1024, 1024)
    original = [seed]
    for key, count in zip(SELECTED_MOVES, [4, 4, 4, 4, 4, 4, 2, 3], strict=True):
        clip = strips['clips'][key]
        assert clip['facing'] == 'left' and len(clip['cells']) == count == clip['frameCount'], key
        strip = checked_image(clip['raw'])
        for x, y, w, h in clip['cells']:
            assert w == h == 1024 and x + w <= strip.width and y + h <= strip.height, key
            original.append(strip.crop((x, y, x + w, y + h)))
    frames = {str(i): frame.resize((BODY_SIZE, BODY_SIZE), Image.Resampling.LANCZOS) for i, frame in enumerate(original)}
    assert len(frames) == 30
    packed, atlas = pack(frames, 'waterspirit')
    image_name = f'waterspirit_lake.{sha(packed)[:12]}.webp'
    atlas['meta']['image'] = image_name
    layout = (json.dumps(atlas, separators=(',', ':'), sort_keys=True) + '\n').encode()
    layout_name = f'waterspirit_lake.{sha(layout)[:12]}.json'
    width, height = atlas['meta']['size'].values()
    entry = {'image': image_name, 'atlas': layout_name, 'width': width, 'height': height,
             'frames': len(frames), 'decodedBytes': width * height * 4, 'downloadBytes': len(layout) + len(packed)}
    units = ROOT / 'public/assets/units'
    manifest_path = ROOT / 'src/game/visuals/unit-atlases.json'
    manifest = json.loads(manifest_path.read_text())
    prior = manifest.get('waterspirit')
    (units / image_name).write_bytes(packed)
    (units / layout_name).write_bytes(layout)
    manifest['waterspirit'] = entry
    write_json(manifest_path, manifest)
    if prior:
        for key in ('image', 'atlas'):
            if prior[key] != entry[key]:
                (units / prior[key]).unlink()

    # Append frame 6, keeping the first six lake stills and portraits pixel-identical.
    still = seed.resize((512, 512), Image.Resampling.LANCZOS)
    l, t, r, b = seed.getchannel('A').getbbox()
    centre = ((l + r) // 2, (t + b) // 2)
    radius = round(max(r - l, b - t) * .55)
    portrait = seed.crop((centre[0] - radius, centre[1] - radius, centre[0] + radius, centre[1] + radius))
    portrait = portrait.resize((480, 480), Image.Resampling.LANCZOS)
    art_dir = ROOT / 'public/assets/art'
    revisions = {}
    for name, cell, offset in [('units_foes3', still, 0), ('portraits_foes3', portrait, 16)]:
        target = art_dir / f'{name}.webp'
        grid = Image.open(target).convert('RGBA')
        assert grid.size == (1024, 2560)
        grid.paste((0, 0, 0, 0), (0, 1536, 512, 2048))
        grid.paste(cell, (offset, 1536 + offset))
        data = webp(grid)
        target.write_bytes(data)
        revisions[name] = sha(data)[:8]
    bounds = still.getchannel('A').point(lambda alpha: 255 if alpha > 40 else 0).getbbox()
    assert bounds
    x, y, r, b = bounds
    write_json(ROOT / 'src/game/visuals/lake-boss-still.json', {
        'soleOrigin': strips['soleOrigin'], 'bounds': {'x': x, 'y': y, 'w': r - x, 'h': b - y}, 'revisions': revisions,
    })
    write_json(ROOT / 'docs/validation/map4-lake/boss-runtime.json', {
        'sourceCell': 1024, 'runtimeCell': BODY_SIZE, 'soleOrigin': strips['soleOrigin'],
        'selectedStrips': SELECTED_MOVES, 'atlas': entry, 'stillRevisions': revisions,
    })
    print(json.dumps(entry, indent=2))


if __name__ == '__main__':
    build_body()
    build_vfx()
