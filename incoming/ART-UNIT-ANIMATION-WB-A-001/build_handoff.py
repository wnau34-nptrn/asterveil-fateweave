#!/usr/bin/env python3
"""Build Kragmor body handoff only; no game integration. Python 3, Pillow, NumPy.

python -I incoming/ART-UNIT-ANIMATION-WB-A-001/build_handoff.py
python -I incoming/ART-UNIT-ANIMATION-WB-A-001/build_handoff.py --verify
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
SEED = ROOT / 'references/seed-a.png'
CELL = 1024
SOLE = 896
BASE = '081766e1cfec0b66f5e4de136adb062c894e3daf'
CANONICAL_SLOT_WIDTH = 362
# Calibrate once from Stone Fist's upright ready: crown y273 to actual sole y544.
# All sheets use this SAME scale in canonical 362px slot coordinates.
GLOBAL_SCALE = (896 - 136) / (544 - 273)
SPECS = {
    'stone-fist': {'intent': 'Stone Fist', 'ground': [544]*6,
        'order': ['ready', 'draw right fist back', 'full anticipation', 'low-left punch contact', 'follow-through', 'ready']},
    'titan-gathering': {'intent': 'Titan Gathering', 'ground': [543]*6, 'hold': 2,
        'order': ['ready', 'hands toward chest', 'chest charge hold', 'press hands down', 'straighten', 'ready'], 'choice': 'R1'},
    'mountain-fall': {'intent': 'Mountain Fall', 'ground': [547, 546, 546, 547, 547, 547],
        'order': ['ready', 'clasped fists overhead with squat', 'deepest anticipation squat', 'two-hand ground smash left', 'low post-smash hold', 'ready']},
    'rift-quake': {'intent': 'Rift Quake', 'ground': [544, 544, 545, 544, 545, 544],
        'order': ['ready', 'front foot lifted', 'front foot high, rear foot planted', 'stomp contact', 'body recoil', 'ready'],
        'exceptions': {'1': 'front foot intentionally lifted; rear/support foot is sole landmark', '2': 'front foot intentionally lifted; rear/support foot is sole landmark'}},
    'boulder-hurl': {'intent': 'Boulder Hurl', 'ground': [544, 544, 545, 544, 544, 544],
        'order': ['ready', 'near hand takes rock from shoulder, holds at waist', 'same near hand cocks rock beside head', 'same near arm releases left, empty hand', 'same arm follows through empty', 'ready'],
        'held_rock_frames': [1, 2], 'projectile_absent_frames': [3, 4]},
    'fault-awakening': {'intent': 'Fault Awakening', 'ground': [546]*6,
        'order': ['ready', 'bow', 'arms open, chest brightens', 'lift chin and roar left', 'relax', 'ready']},
    'hit': {'intent': 'hit', 'ground': [643]*4,
        'order': ['ready', 'recoil to right', 'brace', 'ready']},
    'down': {'intent': 'down', 'ground': [619, 620, 619, 619], 'hold': 3,
        'order': ['ready', 'knees buckle, brace hand', 'torso crumples into half-height heap', 'held prone heap, chest dark'],
        'exceptions': {'1': 'knees/brace contact ground; not an upright sole', '2': 'collapsed body contact, not feet; body scale unchanged', '3': 'prone body contact, not feet; held down, never returns to seed'}}
}


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def write(name, data):
    (ROOT / name).write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')


def bbox(im, threshold=0):
    return im.getchannel('A').point(lambda a: 255 if a > threshold else 0).getbbox()


def clean(im):
    arr = np.array(im.convert('RGBA'))
    arr[arr[:, :, 3] <= 8] = 0
    return Image.fromarray(arr)


def cuts_for(im, n):
    ink = np.array(im.getchannel('A')).sum(axis=0)
    w = im.width / n
    cuts = [0]
    for i in range(1, n):
        lo, hi = int((i-.23)*w), int((i+.23)*w)
        candidates = np.flatnonzero(ink[lo:hi] == 0) + lo
        assert len(candidates), ('no alpha gutter', i)
        cuts.append(int(min(candidates, key=lambda x: abs(x-i*w))))
    return cuts + [im.width]


def frame_at(sheet, i):
    return sheet.crop((i*CELL, 0, (i+1)*CELL, CELL))


def preview_tiles(draw_to, frames, start_y, title, scale=.213, frame_indices=None):
    # Exactly one world-pixel-to-preview scale; no pose fit/individual zoom.
    d = ImageDraw.Draw(draw_to)
    d.text((8, start_y), title, fill='#f0d798')
    top = start_y + 24
    positions = []
    for i in range(0, len(frames), 2):
        pair = frames[i:i+2]
        # Very wide poses use a full row rather than clipping or shrinking.
        wide = any((bbox(f)[2]-bbox(f)[0])*scale > 190 for f in pair)
        for j, f in enumerate(pair):
            tile = f.resize((round(CELL*scale), round(CELL*scale)), Image.Resampling.LANCZOS)
            b = bbox(tile)
            if wide:
                x, y = round((390-tile.width)/2), top+j*238
            else:
                x, y = round((j+.5)*195-tile.width/2), top
            # If an asymmetric pose would reach the canvas edge, reserve full width.
            if x+b[0] < 0 or x+b[2] > 390:
                x = round((390-tile.width)/2)
                y = top+j*238
                wide = True
            assert x+b[0] >= 0 and x+b[2] <= 390
            draw_to.alpha_composite(tile, (x, y))
            logical = frame_indices[i+j] if frame_indices is not None else i+j
            d.text((8+j*195 if not wide else 8, y+219), str(logical+1), fill='#b9c6dc')
            positions.append({'frame': logical, 'paste_xy': [x,y], 'scale': scale})
        top += 476 if wide else 238
    return top+12, positions


def make_previews(all_frames):
    canvas = Image.new('RGBA', (390, 10000), '#142036')
    y = 8
    placements = {}
    for move, frames in all_frames.items():
        y, placements[move] = preview_tiles(canvas, frames, y, move)
    canvas.crop((0,0,390,y)).save(ROOT/'preview-390.png', compress_level=9)
    overview = Image.new('RGBA', (390, 5000), '#142036')
    y = 8
    for move, frames in all_frames.items():
        indices = [1, 3] if move=='down' else [1, 2] if len(frames)==4 else [2, 3]
        selected = [frames[i] for i in indices]
        y, _ = preview_tiles(overview, selected, y, move, frame_indices=indices)
    overview.crop((0,0,390,y)).save(ROOT/'preview-keyposes-390.png', compress_level=9)
    # Offline animated WebPs: same ~162px seed, not runtime capture or approved timing.
    for move, frames in all_frames.items():
        images = []
        for f in frames:
            tile = f.resize((218,218), Image.Resampling.LANCZOS)
            bg = Image.new('RGBA', (390,280), '#142036')
            bg.alpha_composite(tile,(86,30))
            images.append(bg)
        durations = [420,220,280,180,260,420] if len(frames)==6 else [420,220,280,700]
        images[0].save(ROOT/'previews'/f'{move}.webp', save_all=True, append_images=images[1:],
            duration=durations, loop=1 if move=='down' else 0, lossless=True, exact=True)
    compare = Image.new('RGBA',(390,300),'#142036')
    d = ImageDraw.Draw(compare)
    d.text((18,12),'Kragmor / seed A',fill='#f0d798')
    d.text((215,12),'Sentinel / current',fill='#b9c6dc')
    # Both logical cells use the same displayed width and their actual sole origin.
    for j, path in enumerate([SEED, ROOT/'references/sentinel-ready.png']):
        im = Image.open(path).convert('RGBA')
        tile = im.resize((218,218),Image.Resampling.LANCZOS)
        compare.alpha_composite(tile,(round((j+.5)*195-109),49))
    d.line((8,240,382,240),fill='#70634b')
    d.text((8,270),'Same displayed cell width; sole = 7/8 height',fill='#b9c6dc')
    compare.save(ROOT/'sentinel-compare.png',compress_level=9)
    return placements


def verify():
    report = json.loads((ROOT/'validation.json').read_text())
    names = {p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*')
             if p.is_file() and p.name != 'validation.json' and '__pycache__' not in p.parts}
    assert names == set(report['files']), (names-set(report['files']), set(report['files'])-names)
    image_count = 0
    for name, record in report['files'].items():
        p = ROOT/name
        assert digest(p) == record['sha256'] and p.stat().st_size == record['bytes'], name
        if p.suffix in ['.png', '.webp']:
            with Image.open(p) as im:
                assert list(im.size) == record['size']
                assert im.n_frames == record['frames']
                for i in range(im.n_frames):
                    im.seek(i); im.load()
                image_count += 1
    seed = Image.open(SEED).convert('RGBA')
    strips = json.loads((ROOT/'strips.json').read_text())
    for s in strips['moves']:
        im = Image.open(ROOT/s['file']).convert('RGBA')
        assert im.size == (CELL*s['frame_count'], CELL)
        assert frame_at(im,0).tobytes() == seed.tobytes(), s['move']
        if s['move'] != 'down':
            assert frame_at(im,s['frame_count']-1).tobytes() == seed.tobytes()
        assert all(t['uniform_scale'] == s['effective_source_scale'] for t in s['transforms'])
        assert s['canonical_body_scale'] == GLOBAL_SCALE
        assert min(s['raw_clear_gutters_px']) >= 48
        for i, t in enumerate(s['transforms']):
            cell = frame_at(im,i)
            b = bbox(cell)
            assert b and b[0] >= 32 and b[1] >= 32 and b[2] <= 992 and b[3] <= 992, (s['move'],i,b)
            assert list(b) == s['frame_bounds_xyxy'][i]
            a = cell.getchannel('A'); hist = a.histogram()
            assert hist[0] > 300000 and sum(hist[1:255]) > 100, (s['move'],i,'alpha')
            assert np.any(np.array(a)[894:900] > 32), (s['move'],i,'missing visible ground contact near y896')
            mapped = t['paste_xy'][1]+(t['source_sole_y']-t['source_crop_xyxy'][1])*t['uniform_scale']
            if not t['seed_locked']:
                assert abs(mapped-SOLE) <= .5, (s['move'],i,mapped)
    assert strips['logical_frame_count'] == 44
    print(f'PASS {len(names)} SHA-256/byte lengths; {image_count} images fully decoded (all animated frames); 44 logical cells, seed locks, shared scale, real alpha, margins and raw gutters.')


def build():
    (ROOT/'previews').mkdir(exist_ok=True)
    seed = Image.open(SEED).convert('RGBA')
    assert seed.size == (CELL,CELL)
    all_frames, moves = {}, []
    for move, spec in SPECS.items():
        source_path = ROOT/'source'/f'{move}.png'
        source = Image.open(source_path).convert('RGBA')
        raw = clean(source)
        raw_path = ROOT/'raw'/f'{move}.png'
        raw.save(raw_path, compress_level=9)
        n = len(spec['order'])
        cuts = cuts_for(raw, n)
        resolution_scale = CANONICAL_SLOT_WIDTH / (raw.width/n)
        scale = GLOBAL_SCALE*resolution_scale
        raw_bounds, transforms, frames = [], [], []
        for i in range(n):
            cell = raw.crop((cuts[i],0,cuts[i+1],raw.height))
            b = bbox(cell)
            global_b = [cuts[i]+b[0],b[1],cuts[i]+b[2],b[3]]
            raw_bounds.append(global_b)
            fig = cell.crop(b)
            size = (round(fig.width*scale),round(fig.height*scale))
            fig = fig.resize(size,Image.Resampling.LANCZOS)
            # One bottom-center silhouette anchor, same as seed center x≈512.
            # Ground landmarks are annotated actual feet/support contact, never hand bbox bottoms.
            x = round(512 - fig.width/2)
            ground = spec['ground'][i]
            y = round(SOLE-(ground-b[1])*scale)
            assert x >= 0 and y >= 0 and x+fig.width <= CELL and y+fig.height <= CELL, (move,i,x,y,fig.size)
            frame = Image.new('RGBA',(CELL,CELL))
            frame.alpha_composite(fig,(x,y))
            locked = i==0 or (move != 'down' and i==n-1)
            if locked:
                frame = seed.copy()
            frames.append(frame)
            transforms.append({'source_crop_xyxy':global_b, 'uniform_scale':scale, 'paste_xy':[x,y],
                'source_sole_y':ground, 'sole_y':SOLE,
                'mapped_ground_y':float(SOLE) if locked else y+(ground-b[1])*scale,
                'ground_measurement': 'annotated visible feet/support contact, not alpha-bbox bottom',
                'ground_note':spec.get('exceptions',{}).get(str(i),'feet remain grounded'),
                'seed_locked':locked, 'anchor_x_policy':'alpha silhouette center x=512; no per-frame scaling',
                'rounding_error_y_px':y+(ground-b[1])*scale-SOLE})
        gaps = [raw_bounds[i+1][0]-raw_bounds[i][2] for i in range(n-1)]
        assert min(gaps) >= 48, (move,gaps)
        output = Image.new('RGBA',(CELL*n,CELL))
        for i, frame in enumerate(frames):
            output.paste(frame,(i*CELL,0))
        path = ROOT/'strips'/f'{move}.png'
        output.save(path,compress_level=9)
        all_frames[move] = frames
        moves.append({'move':move,'intent':spec['intent'],'file':path.relative_to(ROOT).as_posix(),
            'raw':raw_path.relative_to(ROOT).as_posix(),'generator_original':source_path.relative_to(ROOT).as_posix(),
            'frame_count':n,'frame_size':[CELL,CELL],'frame_order':spec['order'],'facing':'left',
            'raw_pose_bounds_xyxy':raw_bounds,'raw_cuts_x':cuts,'raw_clear_gutters_px':gaps,
            'canonical_slot_width':CANONICAL_SLOT_WIDTH,'source_resolution_scale':resolution_scale,
            'canonical_body_scale':GLOBAL_SCALE,'effective_source_scale':scale,'transforms':transforms,
            'frame_bounds_xyxy':[list(bbox(f)) for f in frames],
            'hold_frame_0based':spec.get('hold'),'contact_frame_0based':3 if n==6 else None,
            'held_rock_frames_0based':spec.get('held_rock_frames',[]),
            'projectile_absent_frames_0based':spec.get('projectile_absent_frames',[]),
            'runtime_mapping_guidance': {'prepare':[0,1,2],'recover':[3,4,0]} if n==6 else {'reaction':[1,2,3] if move=='down' else [1,2], 'final_down_hold':3 if move=='down' else None}})
    placements = make_previews(all_frames)
    write('strips.json',{'schema':1,'task':ROOT.name,'base_commit':BASE,'seed':'references/seed-a.png',
        'logical_frame_count':44,'canonical_body_scale':GLOBAL_SCALE,
        'scale_policy':'One calibration from Stone Fist ready; sheet canvas-width/N only converts source resolution. No per-strip pose-height fit and no per-frame scaling.',
        'ground_policy':'Every grounded/contact landmark maps to y896, with deep crouch and down shape preserved.',
        'raw_cleanup':'Originals retained in source/. Raw removes alpha<=8 haze and clears hidden RGB at alpha0; no pose redrawing or per-pose resize.',
        'preview_scale':.213,'preview_seed_height_px':760*.213,'preview_positions':placements,'moves':moves})
    write('seeds.json',{'schema':1,'character':'Kragmor / คราก์มอร์ ไททันรอยแยก',
        'source_branch':'art/art-char-worldboss-001','source_commit':'46f366dc931e4994d3a6ccd9ad3951ac444a70cf',
        'source_path':'incoming/ART-CHAR-WORLDBOSS-001/seed-a.png','local_seed':'references/seed-a.png',
        'sha256':digest(SEED),'size':[CELL,CELL],'facing':'left','sole_y':SOLE,'silhouette_center_x':512,
        'seed_priority':'Seed primary, turnaround secondary; owner request selects A/Kragmor for this body batch.',
        'sampling_seed':None,'sampling_note':'Image tool exposes no numeric RNG seed; retained original PNGs make processing reproducible.',
        'invariants':['five crown shards','three claws per hand','two hands','single cyan chest fissure','secondary violet seams'],
        'motion_approval':'pending; technical checks do not constitute owner motion approval'})
    manifest = {'schema':1,'task':ROOT.name,'base_commit':BASE,'self_excluded':True,
        'self_sha_receipt':'validation.json SHA-256 recorded in PR body, outside this manifest',
        'motion_frames':44,'checks':'44 cells, seed lock, one canonical body scale, source resolution conversion, true alpha, margins, >=48px raw gutters, complete image decode',
        'runtime_test':'not integrated; previews are offline body playback, not game captures',
        'owner_motion_approval':'pending','files':{}}
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name=='validation.json' or '__pycache__' in p.parts:
            continue
        r = {'sha256':digest(p),'bytes':p.stat().st_size}
        if p.suffix in ['.png','.webp']:
            with Image.open(p) as im:
                r.update(size=list(im.size),mode=im.mode,frames=im.n_frames)
                for i in range(im.n_frames):
                    im.seek(i);im.load()
        manifest['files'][p.relative_to(ROOT).as_posix()] = r
    write('validation.json',manifest)
    verify()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify',action='store_true')
    args=parser.parse_args()
    verify() if args.verify else build()
