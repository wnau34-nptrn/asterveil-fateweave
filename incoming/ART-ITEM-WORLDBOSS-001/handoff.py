#!/usr/bin/env python3
"""Rebuild three standalone boss-gear icons; never edits or repacks the game's atlas.

python -I incoming/ART-ITEM-WORLDBOSS-001/handoff.py
python -I incoming/ART-ITEM-WORLDBOSS-001/handoff.py --verify
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
ITEMS={
    'bulwark':{'slot':'body','boss':'Kragmor','seed':'a','master':'gear_body_master','legacy':'boss_aegis'},
    'breaker':{'slot':'gloves','boss':'Valdrakk','seed':'b','master':'gear_gloves_master','legacy':'boss_focus'},
    'reaper':{'slot':'head','boss':'Morvane','seed':'c','master':'gear_head_master','legacy':'boss_lantern'}
}


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def write(name,data):
    (ROOT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def bounds(im,threshold=0):
    return im.getchannel('A').point(lambda a:255 if a>threshold else 0).getbbox()


def check_icons():
    report={}
    for item in ITEMS:
        with Image.open(ROOT/f'boss_{item}.png') as im:
            im.load()
            assert im.format=='PNG' and im.mode=='RGBA' and im.size==(128,128)
            alpha=im.getchannel('A');hist=alpha.histogram();box=bounds(im)
            assert alpha.getextrema()==(0,255)
            assert all(im.getpixel(p)[3]==0 for p in [(0,0),(127,0),(0,127),(127,127)])
            assert box[0]>=10 and box[1]>=10 and box[2]<=118 and box[3]<=118
            assert 102<=max(box[2]-box[0],box[3]-box[1])<=105
            assert hist[0]>5000 and sum(hist[1:255])>100
            report[item]={'size':[128,128],'mode':'RGBA','alpha_extrema':[0,255],
                'transparent_corners':True,'alpha_bbox_xyxy':list(box),'transparent_pixels':hist[0],
                'partial_alpha_pixels':sum(hist[1:255]),'largest_dimension_fraction':max(box[2]-box[0],box[3]-box[1])/128,
                'slot':ITEMS[item]['slot'],'expected_atlas_key':f'boss_{item}'}
    return report


def preview():
    im=Image.new('RGBA',(390,1200),'#142036')
    d=ImageDraw.Draw(im)
    font=ImageFont.load_default(size=12)
    small=ImageFont.load_default(size=10)
    d.text((6,7),'Boss gear | exact 128 / 64 / 40 px comparison',font=font,fill='#f0d798')
    d.text((6,25),'No baked rarity frame, boss marker or set emblem',font=small,fill='#b9c6dc')
    y=52
    positions={}
    for item,spec in ITEMS.items():
        d.line((4,y-7,386,y-7),fill='#46526b')
        d.text((6,y),f'boss_{item} | {spec["slot"]} / {spec["boss"]}',font=font,fill='#f0d798')
        images=[Image.open(ROOT/'references'/f'{spec["master"]}.png').convert('RGBA'),
                Image.open(ROOT/f'boss_{item}.png').convert('RGBA'),
                Image.open(ROOT/'references'/f'{spec["legacy"]}.png').convert('RGBA')]
        labels=[spec['master'].replace('gear_',''),f'NEW {item}',spec['legacy']]
        for j,label in enumerate(labels):
            b=d.textbbox((0,0),label,font=small)
            d.text((round((j+.5)*130-(b[2]-b[0])/2),y+23),label,font=small,fill='#e3d1a9' if j==1 else '#b9c6dc')
        top=y+45
        rows=[]
        for size in [128,64,40]:
            locations=[]
            for j,pic in enumerate(images):
                tile=pic if size==128 else pic.resize((size,size),Image.Resampling.LANCZOS)
                x=round((j+.5)*130-size/2)
                im.alpha_composite(tile,(x,top))
                locations.append([x,top])
            d.text((6,top+size+3),f'{size}px',font=small,fill='#b9c6dc')
            rows.append({'size':size,'columns_master_new_legacy_xy':locations})
            top+=size+26
        positions[item]=rows
        y=top+12
    d.text((6,y),'Legacy boss column: paint-style reference, not a power mapping.',font=small,fill='#a8bad4')
    im.crop((0,0,390,y+24)).convert('RGB').save(ROOT/'preview_390.png',compress_level=9)
    return positions


def verify():
    report=json.loads((ROOT/'validation.json').read_text())
    names={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and p.name!='validation.json' and '__pycache__' not in p.parts}
    assert names==set(report['files'])
    count=0
    for name,r in report['files'].items():
        p=ROOT/name
        assert sha(p)==r['sha256'] and p.stat().st_size==r['bytes'],name
        if p.suffix=='.png':
            with Image.open(p) as im:
                im.load();assert list(im.size)==r['size'] and im.mode==r['mode'];count+=1
    assert check_icons()==report['icons']
    positions=json.loads((ROOT/'seeds.json').read_text())['preview']
    assert all([r['size'] for r in rows]==[128,64,40] for rows in positions.values())
    print(f'PASS: {len(names)} SHA-256/byte lengths; {count} PNG full decodes; three 128px RGBA icons with real alpha, transparent corners, padding and ~80% fill; preview includes128/64/40px.')


def build():
    transforms={}
    for item in ITEMS:
        src=Image.open(ROOT/'source'/f'boss_{item}.png').convert('RGBA')
        a=np.array(src);a[a[:,:,3]<=8]=0
        cleaned=Image.fromarray(a)
        box=bounds(cleaned)
        figure=cleaned.crop(box)
        scale=104/max(figure.size)
        size=(round(figure.width*scale),round(figure.height*scale))
        figure=figure.resize(size,Image.Resampling.LANCZOS)
        xy=(round((128-size[0])/2),round((128-size[1])/2))
        output=Image.new('RGBA',(128,128));output.alpha_composite(figure,xy)
        pixels=np.array(output);pixels[pixels[:,:,3]==0]=0;output=Image.fromarray(pixels)
        output.save(ROOT/f'boss_{item}.png',compress_level=9)
        transforms[item]={'source':f'source/boss_{item}.png','source_crop_xyxy':list(box),
            'uniform_scale':scale,'resize':list(size),'paste_xy':list(xy),'target_longest_dimension':104,
            'mirror':False,'alpha_cleanup':'source alpha<=8 discarded, transparent RGB cleared; no redraw or per-axis stretch'}
    positions=preview()
    write('seeds.json',{'schema':1,'base_commit':'cca1c3db38028781306072011d8dc4c0aed438f3',
        'seed_commit':'46f366dc931e4994d3a6ccd9ad3951ac444a70cf','items':ITEMS,'transforms':transforms,
        'reference_sha256':{p.relative_to(ROOT).as_posix():sha(p) for p in sorted((ROOT/'references').rglob('*')) if p.is_file()},
        'preview':positions,'rng_seed':None,'reproducibility':'Generator exposes no numeric RNG seed; retained source images make processing deterministic.',
        'frame_policy':'None baked. Legendary rarity3/4 uses master icon tier; frame, boss marker and set emblem belong to DOM.'})
    report={'schema':1,'task':ROOT.name,'icons':check_icons(),
        'visual_review':{'style':'compared to exact atlas crops at128/64/40px; owner decides final style match',
            'bulwark':'stone chest, central cyan fissure, five attached crystal rim tips; no detached boss badge',
            'breaker':'paired wearable claw gauntlets, wing plate motif, cyan wrist core',
            'reaper':'empty crown/helm, central core, three severed shadow threads',
            'no_baked_text_marker_set_emblem_or_rarity_frame':True},
        'integration':'not imported; gear_items.webp and mapping unchanged; Claude performs lossless repack',
        'approval':'pending; technical checks are not artwork approval','self_excluded':True,
        'manifest_receipt':'SHA-256 of validation.json recorded externally in PR description','files':{}}
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name=='validation.json' or '__pycache__' in p.parts:
            continue
        r={'sha256':sha(p),'bytes':p.stat().st_size}
        if p.suffix=='.png':
            with Image.open(p) as im:
                im.load();r.update(size=list(im.size),mode=im.mode)
        report['files'][p.relative_to(ROOT).as_posix()]=r
    write('validation.json',report)
    verify()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify',action='store_true')
    args=parser.parse_args()
    verify() if args.verify else build()
