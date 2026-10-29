#!/usr/bin/env python3
"""Rebuild the art-only handoff from untouched source PNGs. Requires Pillow/numpy.

Run `python build_handoff.py`, or `python build_handoff.py --verify` after a
fresh git fetch/checkout. Generation itself is recorded, not deterministic;
all processing of the retained generator outputs is reproducible.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
W, H = 1024, 896
SEED_X, SEED_Y = 256, 160
SOLE = 497 + SEED_Y


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')


def bbox(im, threshold=32):
    return im.getchannel('A').point(lambda a: 255 if a > threshold else 0).getbbox()


def verify():
    report = json.loads((ROOT / 'validation.json').read_text())
    actual = {p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*')
              if p.is_file() and p.name != 'validation.json' and '__pycache__' not in p.parts}
    expected = set(report['files'])
    assert actual == expected, (actual - expected, expected - actual)
    for name, record in report['files'].items():
        p = ROOT / name
        assert sha(p) == record['sha256'], name
        assert p.stat().st_size == record['bytes'], name
        if p.suffix == '.png':
            with Image.open(p) as im:
                im.load()
                assert list(im.size) == record['size'], name
                assert im.mode == 'RGBA', (name, im.mode)
    for name in report['bosses']:
        manifest = json.loads((ROOT / name / 'strips.json').read_text())
        for s in manifest:
            im = Image.open(ROOT / name / s['file'])
            seed = Image.open(ROOT / name / s['seed']).convert('RGBA')
            assert im.crop((SEED_X, SEED_Y, SEED_X+512, SEED_Y+512)).tobytes() == seed.tobytes()
            assert sha(ROOT / name / s['file']) == s['sha256']
            bounds = s['frame_bounds_xyxy']
            assert all(b[0] >= 24 and b[2] <= W-24 and b[1] > 0 and b[3] < H for b in bounds)
            assert all(W + bounds[i+1][0] - bounds[i][2] >= 48 for i in range(len(bounds)-1))
    print(f"Verified {len(expected)} file SHA-256 values; every PNG fully decoded; exact idle lock, margins and gutters passed.")


def build():
    jobs = json.loads((ROOT / 'generation.json').read_text())
    bosses = sorted({j['boss'] for j in jobs if j['accepted']})
    all_strips = []
    for boss in bosses:
        home = ROOT / boss
        seed_name = 'seeds/idle-left.png' if boss == 'foe_matriarch' else 'seeds/idle.png'
        seed = Image.open(home / seed_name).convert('RGBA')
        sb = bbox(seed)
        strips = []
        selected = [j for j in jobs if j['boss'] == boss and j['accepted']]
        preview = Image.new('RGBA', (390, len(selected)*560+42), '#142036')
        d = ImageDraw.Draw(preview)
        d.text((10, 10), boss + ' | BODY ART / not in-game motion', fill='#f1dfab')
        for row, j in enumerate(selected):
            src = Image.open(ROOT / j['source']).convert('RGBA')
            n = j['frames']
            arr = np.asarray(src.getchannel('A'))
            # Find a zero-ink cut in the gutter near each nominal slot boundary.
            ink = (arr > 8).sum(axis=0)
            cuts = [0]
            for i in range(1, n):
                lo, hi = int((i-.23)*src.width/n), int((i+.23)*src.width/n)
                candidates = np.flatnonzero(ink[lo:hi] == 0) + lo
                assert len(candidates), f"No clear source gutter: {j['source']} boundary {i}"
                cuts.append(int(min(candidates, key=lambda x: abs(x-i*src.width/n))))
            cuts.append(src.width)
            crops = [src.crop((cuts[i], 0, cuts[i+1], src.height)) for i in range(n)]
            bounds = [bbox(c) for c in crops]
            assert all(bounds), j['source']
            # Upright ready at both ends is mandatory; never size from a folded pose.
            ref_height = (bounds[0][3]-bounds[0][1])
            scale = (sb[3]-sb[1]) / ref_height
            out = Image.new('RGBA', (W*n, H))
            frame_bounds = []
            transforms = []
            for i, c in enumerate(crops):
                b = bounds[i]
                fig = c.crop(b)
                fig = fig.resize((round(fig.width*scale), round(fig.height*scale)), Image.Resampling.LANCZOS)
                # One shared scale. Per-frame ground translation does not resize anatomy.
                x = round(W/2 + ((cuts[i]+(b[0]+b[2])/2) - (i+.5)*src.width/n)*scale - fig.width/2)
                foot = j.get('sole_source_y', {}).get(str(i), b[3]-1)
                y = round(SOLE - (foot-b[1])*scale)
                frame = Image.new('RGBA', (W,H))
                assert x >= 24 and x+fig.width <= W-24 and y > 0 and y+fig.height < H, (j['move'], i, x,y,fig.size)
                frame.alpha_composite(fig, (x,y))
                if i == 0 or (i == n-1 and j['move'] != 'down'):
                    frame = Image.new('RGBA', (W,H))
                    frame.paste(seed,(SEED_X,SEED_Y))
                out.paste(frame,(i*W,0))
                frame_bounds.append(bbox(frame,0))
                transforms.append({'source_crop_xyxy':[cuts[i]+b[0],b[1],cuts[i]+b[2],b[3]], 'scale':scale, 'paste_xy':[x,y], 'source_sole_y':foot, 'seed_locked':i==0 or (i==n-1 and j['move']!='down')})
            dest = home/'raw'/f"{j['move']}-r1.png"
            out.save(dest, compress_level=9)
            entry = {'file':dest.relative_to(home).as_posix(),'move':j['move'],'revision':'r1','frame_count':n,'frame_size':[W,H], 'frame_order':j['frame_order'], 'sha256':sha(dest),'suggested_intents':j['intents'],'preferred_candidate':True,'source':j['source'],'seed':seed_name,'logical_seed_rect_xywh':[SEED_X,SEED_Y,512,512],'sole_y':SOLE,'facing':'left','shared_scale':scale,'frame_bounds_xyxy':frame_bounds,'transforms':transforms,'hold_frame_0based':j.get('hold_frame'),'contact_frame_0based':3 if n==6 else None}
            strips.append(entry)
            d.text((9,42+row*560), j['move']+' | '+str(n)+' frames',fill='#f3ddb2')
            # Two columns at 390px; bodies around 90px tall, three rows per move.
            for i in range(n):
                tile = out.crop((i*W,0,(i+1)*W,H)).resize((192,168), Image.Resampling.LANCZOS)
                preview.alpha_composite(tile,(2+(i%2)*194,58+row*560+(i//2)*176))
            all_strips.append({'boss':boss,**entry})
        preview.save(home/'preview-390.png')
        write(home/'strips.json',strips)
        write(home/'prompts.json',[j for j in jobs if j['boss']==boss])
    write(ROOT/'strips.json',all_strips)
    overview = Image.new('RGBA',(390,914),'#142036')
    od = ImageDraw.Draw(overview)
    od.text((8,8),'A9 signature poses | anticipation -> contact',fill='#f1dfab')
    for row,(boss,move) in enumerate([
        ('foe_matriarch','thorn-tempest'),('foe_juggernaut','horn-charge'),
        ('foe_sentinel','rift-cataclysm'),('foe_captain','war-cry')]):
        od.text((8,35+row*220),boss+' / '+move,fill='#f1dfab')
        strip=Image.open(ROOT/boss/'raw'/f'{move}-r1.png')
        for col,idx in enumerate([2,3]):
            tile=strip.crop((idx*W,0,(idx+1)*W,H)).resize((192,168),Image.Resampling.LANCZOS)
            overview.alpha_composite(tile,(col*194,55+row*220))
    overview.save(ROOT/'preview-390.png')
    report={'schema':1,'base_commit':'5e9e65026b8949f7877db12a2e70496fe2aac77b','bosses':bosses,'validation_self_excluded':True,'checks':'Full decode, SHA-256, exact first/last ready seed, >=48px gutters and unclipped margins. Artwork/motion approval belongs to owner.','files':{}}
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name=='validation.json' or '__pycache__' in p.parts:
            continue
        record={'sha256':sha(p),'bytes':p.stat().st_size}
        if p.suffix=='.png':
            with Image.open(p) as im:
                im.load();record.update(size=list(im.size),mode=im.mode)
        report['files'][p.relative_to(ROOT).as_posix()]=record
    write(ROOT/'validation.json',report)
    verify()


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--verify',action='store_true')
    args=parser.parse_args()
    verify() if args.verify else build()
