#!/usr/bin/env python3
"""Build Valdrakk body handoff only; no game integration. Python 3, Pillow, NumPy.

python -I incoming/ART-UNIT-ANIMATION-WB-B-001/build_handoff.py
python -I incoming/ART-UNIT-ANIMATION-WB-B-001/build_handoff.py --verify
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
SEED = ROOT / 'seeds/seed-b.png'
CELL = 1024
SOLE = 896
BASE = '8e672a17211239ab5b12acf2f33d51d01bae0ecd'
CANONICAL_SLOT_WIDTH = 362
# Fixed ONCE from Shard Talon ready torso-only calibration; never per-pose fit.
GLOBAL_SCALE = 2.8401709469953085
SPECS = {
 'shard-talon': {'source':'shard-talon-r3', 'intent':'Shard Talon', 'ground':[545,546,545,550,546,546],
  'order':['ready','raise far front-right paw; lean back','rear crouch; aim low','low left claw contact','low follow-through','ready']},
 'wing-gust': {'source':'wing-gust-r2', 'intent':'Wing Gust', 'ground':[545]*6,
  'order':['ready','lower both wings','raise both wings','sweep wings forward left','curved forward wing follow-through','ready']},
 'wing-gathering': {'source':'wing-gathering-r2', 'intent':'Wing Gathering', 'ground':[542,541,540,542,541,541], 'hold':2,'choice':'R1',
  'order':['ready','start folding wings back','fold along back; visible bright core; charge hold','deepest compression','partly release','ready']},
 'worldshard-dive': {'source':'worldshard-dive-r3', 'intent':'Worldshard Dive', 'ground':[545,545,544,549,549,545],
  'order':['ready','rear crouch','hips raised; head low','low left dive; rear knees tucked','low skid stop','ready'],
  'exceptions':{'2':'rear support paw is anchor; forebody lifted/low head','3':'low dive; front contact paw anchor, trailing rear feet above baseline'}},
 'staggered': {'source':'staggered', 'intent':'Staggered', 'ground':[545,541,542,545,544,545], 'choice':'R1',
  'order':['ready','near wing loses alignment','near wing droops; knees weak','head sways low; near wing droops','brace; recover balance','ready']},
 'sky-rend': {'source':'sky-rend', 'intent':'Sky Rend / phase70%', 'ground':[545,544,544,545,544,545],
  'order':['ready','crouch','both wings high; internal glow','neck raised; mouth open roar','relax','ready']},
 'hit': {'source':'hit', 'intent':'hit', 'ground':[642]*4,
  'order':['ready','recoil right','brace','ready']},
 'down': {'source':'down', 'intent':'down', 'ground':[585,583,575,574], 'hold':3,
  'order':['ready','front knees buckle','side collapse; wings folded; core dark','held side-prone; core dark; never rises'],
  'exceptions':{'1':'front knee/paw contact; not upright four-paw stance','2':'collapsed body/paws contact; other paws tucked','3':'held lying body/paw contact; not an upright sole'}}
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


def preview_tiles(draw_to, frames, start_y, title, scale=.22, frame_indices=None):
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
            tile = f.resize((225,225), Image.Resampling.LANCZOS)
            bg = Image.new('RGBA', (390,280), '#142036')
            bg.alpha_composite(tile,(82,30))
            images.append(bg)
        durations = [420,220,280,180,260,420] if len(frames)==6 else [420,220,280,700]
        images[0].save(ROOT/'previews'/f'{move}.webp', save_all=True, append_images=images[1:],
            duration=durations, loop=1 if move=='down' else 0, lossless=True, exact=True)
    compare = Image.new('RGBA',(390,300),'#142036')
    d = ImageDraw.Draw(compare)
    d.text((18,12),'Valdrakk / seed B',fill='#f0d798')
    d.text((215,12),'Sentinel / current',fill='#b9c6dc')
    # Both logical cells use the same displayed width and their actual sole origin.
    for j, path in enumerate([SEED, ROOT/'seeds/sentinel-ready.png']):
        im = Image.open(path).convert('RGBA')
        tile = im.resize((225,225),Image.Resampling.LANCZOS)
        compare.alpha_composite(tile,(round((j+.5)*195-112.5),43))
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
                assert im.mode == record['mode'], name
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
        raw = Image.open(ROOT/s['raw']).convert('RGBA')
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
                crop = raw.crop(t['source_crop_xyxy'])
                scaled = crop.resize((round(crop.width*t['uniform_scale']),round(crop.height*t['uniform_scale'])),Image.Resampling.LANCZOS)
                xy = t['paste_xy']
                assert xy[0]>=32 and xy[1]>=32 and xy[0]+scaled.width<=992 and xy[1]+scaled.height<=992
                reconstructed = Image.new('RGBA',(CELL,CELL))
                reconstructed.alpha_composite(scaled,tuple(xy))
                assert reconstructed.tobytes()==cell.tobytes(), (s['move'],i,'transform does not reproduce pixels')
    assert strips['logical_frame_count'] == 44
    dive = next(m for m in strips['moves'] if m['move']=='worldshard-dive')
    assert min(b[0] for b in dive['frame_bounds_xyxy']) >= 49, 'Dive left reach exceeds seed by40px'
    for generation in json.loads((ROOT/'prompts.json').read_text())['generations']:
        assert 'seeds/seed-b.png' in generation['references']
        assert (ROOT/generation['original']).is_file()
    calibration = json.loads((ROOT/'seeds/scale-calibration.json').read_text())
    assert calibration['global_scale']==GLOBAL_SCALE
    if (ROOT/'anatomy-review.json').exists():
        review = json.loads((ROOT/'anatomy-review.json').read_text())
        assert not review['not_measured_is_pass'] and not review['integration_ready']
    print(f'PASS technical integrity: {len(names)} SHA-256/byte lengths; {image_count} images fully decoded (all animated frames); 44 logical cells, seed locks, shared scale, real alpha, margins and derived raw gutters.')
    print('ANATOMICAL ACCEPTANCE PENDING: consult torso-audit.json and anatomy-review.json; technical verification is not motion approval.')


def build():
    (ROOT/'previews').mkdir(exist_ok=True)
    seed = Image.open(SEED).convert('RGBA')
    assert seed.size == (CELL,CELL)
    all_frames, moves = {}, []
    for move, spec in SPECS.items():
        source_path = ROOT/'raw/original'/f"{spec['source']}.png"
        source = Image.open(source_path).convert('RGBA')
        cleaned = clean(source)
        n = len(spec['order'])
        original_cuts = cuts_for(cleaned, n)
        pieces = []
        original_bounds = []
        for i in range(n):
            c = cleaned.crop((original_cuts[i],0,original_cuts[i+1],cleaned.height))
            box = bbox(c)
            pieces.append((c.crop(box),box))
            original_bounds.append([original_cuts[i]+box[0],box[1],original_cuts[i]+box[2],box[3]])
        # Padding only, no redraw/no rescale: derived raw has >=64px true-alpha gaps.
        pitch = max(fig.width for fig,box in pieces)+64
        raw = Image.new('RGBA',(n*pitch+64,source.height))
        for i,(fig,box) in enumerate(pieces):
            raw.paste(fig,(64+i*pitch,box[1]))
        raw_path = ROOT/'raw'/f'{move}.png'
        raw.save(raw_path,compress_level=9)
        cuts = [0]+[64+i*pitch-32 for i in range(1,n)]+[raw.width]
        # Resolution is derived from ORIGINAL generator canvas, never padded width.
        resolution_scale = CANONICAL_SLOT_WIDTH / (source.width/n)
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
                'source_sole_y':ground, 'sole_y':SOLE, 'measured_primary_contact_y':896 if locked else round(y+(ground-b[1])*scale),
                'mapped_ground_y':float(SOLE) if locked else y+(ground-b[1])*scale,
                'ground_measurement': 'annotated lowest visible gold support-claw/body contact in source; perspective-staggered other paws can be higher',
                'ground_note':spec.get('exceptions',{}).get(str(i),'primary support paw on y896; other paws preserve three-quarter perspective'),
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
            'original_pose_bounds_xyxy':original_bounds,'original_cuts_x':original_cuts,
            'original_clear_gutters_after_alpha_cleanup_px':[original_bounds[i+1][0]-original_bounds[i][2] for i in range(n-1)],
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
    write('strips.json',{'schema':1,'task':ROOT.name,'base_commit':BASE,'seed':'seeds/seed-b.png',
        'logical_frame_count':44,'canonical_body_scale':GLOBAL_SCALE,
        'scale_policy':'One torso-only calibration from Shard Talon ready (seeds/scale-calibration.json); original generator canvas width/N converts source resolution. No per-frame or per-strip anatomical rescaling. Body shape review is separate.',
        'ground_policy':'Every grounded/contact landmark maps to y896, with deep crouch and down shape preserved.',
        'raw_cleanup':'raw/original contains EVERY generator PNG byte-for-byte including rejected iterations. Derived raw/<move>.png clears alpha<=8 and invisible RGB, crops alpha bboxes then adds64px alpha0 gaps WITHOUT resizing or painting. Original gaps are reported separately and are not claimed to pass.',
        'preview_scale':.22,'preview_seed_height_px':734*.22,'preview_positions':placements,'moves':moves})
    seed_files = {p.relative_to(ROOT).as_posix():digest(p) for p in sorted((ROOT/'seeds').rglob('*')) if p.is_file()}
    write('seeds.json',{'schema':1,'character':'Valdrakk / วัลดรัค อสูรโลกแตก',
        'source_branch':'art/art-char-worldboss-001','source_commit':'46f366dc931e4994d3a6ccd9ad3951ac444a70cf',
        'source_path':'incoming/ART-CHAR-WORLDBOSS-001/seed-b.png','local_seed':'seeds/seed-b.png',
        'sha256':digest(SEED),'files_sha256':seed_files,'size':[CELL,CELL],'facing':'left','mirror':False,'sole_y':SOLE,
        'silhouette_center_x':512,'priority':'Seed primary; turnaround only shape guide',
        'sampling_seed':None,'sampling_note':'Generator exposes no numeric RNG seed; all original PNG bytes retained.',
        'invariants':['four legs/gold claws','two raised or folded wings','one up-curled right tail/cyan tip','one round cyan near-left shoulder core','cyan eyes'],
        'motion_approval':'pending owner; technical checks are not approval'})
    manifest = {'schema':1,'task':ROOT.name,'base_commit':BASE,'self_excluded':True,
        'self_sha_receipt':'validation.json SHA-256 recorded in PR body, outside this manifest',
        'motion_frames':44,'checks':'44 cells, seed lock, one canonical body scale, source resolution conversion, true alpha, margins, >=48px raw gutters, complete image decode',
        'runtime_test':'not integrated; previews are offline body playback, not game captures',
        'torso_tolerance_status':'See torso-audit.json and anatomy-review.json. Not-measured is NOT passed; +/-4% anatomical acceptance remains pending for those frames.',
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
