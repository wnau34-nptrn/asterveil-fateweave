#!/usr/bin/env python3
"""Rebuild final R1 strips from untouched whole-strip outputs. Pillow/numpy/scipy.

No generation API is needed. One uniform resize per source strip; never per-pose
scale fitting. Original seed pixels replace ready endpoints. Outputs stay here.
"""
from pathlib import Path
import argparse
import hashlib
import io
import json
import subprocess
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, find_objects, distance_transform_edt

ROOT = Path(__file__).resolve().parent
FRAME = (1024, 768)
SEED_ORIGIN = (256, 200)
SOLE = 697
JOBS = [
    ('foe_golem', 'punch', 'punch', 6, ['Crystal Fist', 'Stone Fist']),
    ('foe_golem', 'veil-quake', 'quake3', 6, ['Veil Quake']),
    ('foe_rift_channeler', 'rift-bolt', 'bolt', 6, ['Rift Bolt', 'Rift Beam']),
    ('foe_rift_wisp', 'hover', 'hover', 4, ['hover']),
    ('foe_rift_wisp', 'star-flame', 'star3', 6, ['Star Flame']),
    ('foe_shard_crawler', 'crystal-stab', 'stab', 6, ['Crystal Stab']),
] + [(u, move, 'crawlerdown2' if u == 'foe_shard_crawler' and move == 'down' else f'{u}-{move}', 4, [move])
     for u in ['foe_golem', 'foe_rift_channeler', 'foe_rift_wisp', 'foe_shard_crawler'] for move in ['hit', 'down']]

def sha(data):
    return hashlib.sha256(data).hexdigest()

def write_json(name, data):
    (ROOT / name).write_text(json.dumps(data, indent=2) + '\n')

def bounds(im):
    return Image.fromarray((np.array(im)[:, :, 3] > 40).astype('uint8')).getbbox()

def figures(im, count):
    """Connected silhouettes, including nearby antialias fragments; no slot slicing.

    Different silhouettes can overlap in x without touching (e.g. bolt arms).
    Connected-component ownership preserves those limbs in full.
    """
    a = np.array(im)
    labs, _ = label(a[:, :, 3] > 40)
    candidates = []
    for k, box in enumerate(find_objects(labs), 1):
        if box and (labs[box] == k).sum() > 1000:
            candidates.append((box[1].start, k))
    assert len(candidates) == count, (len(candidates), count)
    candidates.sort()
    main = np.isin(labs, [k for _, k in candidates])
    distance, nearest = distance_transform_edt(~main, return_indices=True)
    owner = labs[tuple(nearest)]
    results = []
    for _, k in candidates:
        keep = (owner == k) & (distance <= 3) & (a[:, :, 3] > 0)
        out = a.copy()
        out[~keep] = 0
        pose = Image.fromarray(out)
        box = pose.getbbox()
        results.append((pose.crop(box), box))
    return results

def build():
    strips = []
    for unit, move, source, count, intents in JOBS:
        seed = Image.open(ROOT / 'seeds' / f'{unit}.png').convert('RGBA')
        source_im = Image.open(ROOT / 'source-sheets' / f'{source}.png').convert('RGBA')
        poses = figures(source_im, count)
        seed_box = bounds(seed)
        first_box = poses[0][1]
        # Ready reference, never the coiled pose: one scale for the ENTIRE strip.
        first_visible = bounds(poses[0][0])
        ref_height = first_visible[3] - first_visible[1]
        scale = (seed_box[3] - seed_box[1]) / ref_height
        first_bottom = first_box[1] + first_visible[3]
        frames = []
        frame_info = []
        for i, (pose, box) in enumerate(poses):
            frame = Image.new('RGBA', FRAME)
            locked = i == 0 or (i == count - 1 and move != 'down')
            if locked:
                frame.paste(seed, SEED_ORIGIN)
            else:
                pose = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.Resampling.LANCZOS)
                pb = bounds(pose)
                x = round(FRAME[0] / 2 - (pb[0] + pb[2]) / 2)
                # Wisp is floating: retain source bob/coil/sink relative to ready.
                if unit == 'foe_rift_wisp':
                    y = round(SOLE + (box[3] - first_bottom) * scale - pose.height)
                else:
                    y = SOLE - pb[3]
                assert x >= 24 and y >= 24 and x + pose.width <= FRAME[0] - 24 and y + pose.height <= FRAME[1] - 24, (unit, move, i, x, y, pose.size)
                if unit == 'foe_rift_wisp' and move == 'down':
                    alpha = pose.getchannel('A').point(lambda a: round(a * [1, .85, .5, .2][i]))
                    pose.putalpha(alpha)
                frame.alpha_composite(pose, (x, y))
            bbox = frame.getbbox()
            assert bbox and bbox[0] >= 24 and FRAME[0] - bbox[2] >= 24 and bbox[1] >= 24 and FRAME[1] - bbox[3] >= 24
            frames.append(frame)
            frame_info.append({'index': i, 'bounds_alpha_gt0': bbox, 'seed_exact': locked, 'sole_alpha_gt40': bounds(frame)[3] if bounds(frame) else None})
        strip = Image.new('RGBA', (FRAME[0] * count, FRAME[1]))
        for i, frame in enumerate(frames):
            strip.paste(frame, (i * FRAME[0], 0))
        name = f'raw/{unit}-{move}-r1.png'
        strip.save(ROOT / name)
        gaps = [FRAME[0] + frame_info[i + 1]['bounds_alpha_gt0'][0] - frame_info[i]['bounds_alpha_gt0'][2] for i in range(count - 1)]
        assert min(gaps) >= 48
        order = ['ready', 'wind-up', 'deep anticipation', 'contact/release', 'follow-through', 'recover to ready'] if count == 6 else (['ready', 'buckle/dip', 'collapse/sink', 'grounded hold'] if move == 'down' else ['ready', 'bob up' if move == 'hover' else 'recoil', 'bob down' if move == 'hover' else 'brace', 'ready'])
        strips.append({'file': name, 'identity': unit, 'move': move, 'revision': 'r1', 'preferred': True, 'source': f'source-sheets/{source}.png', 'frames': count, 'frame_size': FRAME, 'frame_order': order, 'sha256': sha((ROOT / name).read_bytes()), 'suggested_intents': intents, 'source_uniform_scale': scale, 'logical_seed_origin': SEED_ORIGIN, 'logical_sole_y': SOLE, 'minimum_clear_gutter_px': min(gaps), 'frame_details': frame_info, 'loop': move == 'hover'})
    write_json('strips.json', strips)
    preview(strips)
    inventory()
    print(f'Built {len(strips)} final R1 strips')

def preview(strips):
    # Two poses per 390px row: seed is ~90px tall, suitable for mobile review.
    height = 48 + sum(24 + ((s['frames'] + 1) // 2) * 154 for s in strips)
    board = Image.new('RGB', (390, height), '#11172c')
    d = ImageDraw.Draw(board)
    d.text((8, 7), 'A8 / LEFT / R1 - artwork review', fill='#ddd4fa')
    d.text((8, 23), '2 poses per row / owner motion approval pending', fill='#aaa2c2')
    y = 48
    for item in strips:
        d.text((6, y), item['identity'].replace('foe_', '') + ' / ' + item['move'], fill='#e1d2ff')
        y += 24
        src = Image.open(ROOT / item['file'])
        for i in range(item['frames']):
            frame = src.crop((i * FRAME[0], 0, (i+1) * FRAME[0], FRAME[1]))
            frame.thumbnail((195, 146), Image.Resampling.LANCZOS)
            x, fy = (i % 2) * 195, y + (i // 2) * 154
            board.paste(frame, (x, fy), frame)
            d.text((x + 4, fy + 2), str(i+1) + ' ' + item['frame_order'][i], fill='#aaa2c2')
        y += ((item['frames'] + 1) // 2) * 154
    board.save(ROOT / 'preview-390.png')

def inventory():
    files = {}
    for f in sorted(ROOT.rglob('*')):
        if not f.is_file() or f.name == 'validation.json' or '__pycache__' in f.parts:
            continue
        b = f.read_bytes()
        rec = {'sha256': sha(b), 'bytes': len(b)}
        if f.suffix == '.png':
            im = Image.open(io.BytesIO(b)); im.verify()
            im = Image.open(io.BytesIO(b)); im.load()
            rec.update(size=im.size, mode=im.mode, pillow_decoded=True)
        files[str(f.relative_to(ROOT))] = rec
    write_json('validation.json', {'schema': 1, 'scope': 'ART-UNIT-ANIMATION-A8-001', 'hash_algorithm': 'sha256', 'self_hash_excluded': 'validation.json (self-reference); git blob/commit protects manifest', 'files': files, 'artwork_selection': 'pending owner', 'motion_approval': 'pending owner; no runtime integration in this PR'})

def verify_ref(ref):
    repo = ROOT.parents[1]
    prefix = str(ROOT.relative_to(repo))
    def blob(name):
        return subprocess.check_output(['git', 'show', f'{ref}:{prefix}/{name}'], cwd=repo)
    v = json.loads(blob('validation.json'))
    actual = subprocess.check_output(['git','ls-tree','-r','--name-only',ref,'--',prefix],cwd=repo,text=True).splitlines()
    expected = {f'{prefix}/{name}' for name in v['files']} | {f'{prefix}/validation.json'}
    assert set(actual) == expected, 'Manifest file coverage mismatch'
    decoded = 0
    for name, rec in v['files'].items():
        data = blob(name)
        assert len(data) == rec['bytes'] and sha(data) == rec['sha256'], name
        if name.endswith('.png'):
            im = Image.open(io.BytesIO(data)); im.verify()
            im = Image.open(io.BytesIO(data)); im.load()
            assert list(im.size) == rec['size'] and im.mode == rec['mode'], name
            decoded += 1
    print(f'{ref}: {len(expected)} files covered, {len(v["files"])} SHA-256 matches, {decoded} PNGs verified and fully Pillow-decoded')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify-ref')
    args = parser.parse_args()
    verify_ref(args.verify_ref) if args.verify_ref else build()
