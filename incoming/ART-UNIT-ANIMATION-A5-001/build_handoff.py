"""Rebuild raw row crops and 390px reviews; validate every delivered artifact.

This isolates rows without changing retained source RGBA pixels. It does not
normalize frames or produce a runtime atlas. Requires Pillow, NumPy, SciPy.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_json(name):
    return json.loads((ROOT / name).read_text())


def write_json(name, data):
    (ROOT / name).write_text(json.dumps(data, indent=2) + '\n')


def analyze_source(path, rows, frames):
    rgba = np.asarray(Image.open(path).convert('RGBA'))
    labels, count = ndimage.label(rgba[:, :, 3] > 80)
    sizes = np.bincount(labels.ravel())
    major = [i for i in range(1, count + 1) if sizes[i] > 400]
    bounds = {}
    for i in major:
        yy, xx = np.where(labels == i)
        bounds[i] = [int(xx.min()), int(yy.min()), int(xx.max()+1), int(yy.max()+1)]
    assert len(major) == rows * frames, (path.name, len(major), rows * frames, bounds)
    # Each row has a fixed figure count. Sort by visual centre, then by X.
    major.sort(key=lambda i: (bounds[i][1]+bounds[i][3])/2)
    groups = [sorted(major[r*frames:(r+1)*frames], key=lambda i: bounds[i][0]) for r in range(rows)]
    main = np.isin(labels, major)
    distance, nearest = ndimage.distance_transform_edt(~main, return_indices=True)
    owners = labels[nearest[0], nearest[1]]
    return rgba, bounds, groups, owners, distance


def extract():
    records = []
    for source in read_json('prompts.json')['generations']:
        path = ROOT / source['output']
        rgba, bounds, groups, owners, distance = analyze_source(path, source['rows'], source['frames'])
        height, width = rgba.shape[:2]
        for row, spec in enumerate(source['strips']):
            ids = groups[row]
            # Discard only low-alpha haze isolated more than 4px from any
            # major silhouette. Retain original edge RGBA, never recolor it.
            keep = np.isin(owners, ids) & (rgba[:, :, 3] > 0) & (distance <= 4)
            ys, xs = np.where(keep)
            y0, y1 = max(0, int(ys.min())-12), min(height, int(ys.max())+13)
            pad = 24
            # Give every source pose a generous, equally spaced transparent
            # slot. Preserve its offset from its nominal source slot centre,
            # and preserve ALL source Y offsets, RGBA pixels and shared scale.
            anchors = [round((k+0.5)*width/len(ids)) for k in range(len(ids))]
            pose_bounds=[]
            for i in ids:
                py,px=np.where(keep & (owners==i))
                pose_bounds.append([int(px.min()),int(py.min()),int(px.max()+1),int(py.max()+1)])
            left=min(b[0]-a for b,a in zip(pose_bounds,anchors))
            right=max(b[2]-a for b,a in zip(pose_bounds,anchors))
            slot_width=int(np.ceil((right-left+2*pad)/16)*16)
            out=np.zeros((y1-y0+2*pad,slot_width*len(ids),4),dtype=np.uint8)
            frame_bounds=[]
            translations=[]
            for k,(i,anchor) in enumerate(zip(ids,anchors)):
                py,px=np.where(keep & (owners==i))
                dx=k*slot_width+pad-left-anchor
                dy=pad-y0
                out[py+dy,px+dx]=rgba[py,px]
                assert np.array_equal(out[py+dy,px+dx],rgba[py,px])
                b=bounds[i]
                frame_bounds.append([b[0]+dx,b[1]+dy,b[2]+dx,b[3]+dy])
                translations.append([dx,dy])
            rel = source['group'] + '/raw/' + spec['identity'] + '-' + spec['move'] + '-' + spec['revision'] + '.png'
            Image.fromarray(out).save(ROOT / rel)
            clipped = [k+1 for k,i in enumerate(ids) if bounds[i][0] == 0 or bounds[i][1] == 0 or bounds[i][2] == width or bounds[i][3] == height]
            assert not clipped, (rel, 'source edge clipping', clipped)
            gaps = [frame_bounds[k+1][0]-frame_bounds[k][2] for k in range(len(ids)-1)]
            assert min(gaps) >= 48, (rel, 'insufficient gutters', gaps)
            records.append(dict(**spec, file=rel, frame_count=source['frames'], frame_order='left-to-right',
                source=source['output'], source_row_1based=row+1, source_crop_xyxy=[0,y0,width,y1],
                shared_transparent_padding_px=pad, frame_bounds_alpha_gt80_xyxy=frame_bounds,
                low_alpha_support_radius_px=4,
                slot_width_px=slot_width, source_nominal_slot_centres_x=anchors,
                source_to_raw_frame_translation_xy=translations,
                source_frame_bounds_alpha_gt80_xyxy=[bounds[i] for i in ids],
                transparent_gaps_alpha_gt80_px=gaps, size=[out.shape[1],out.shape[0]], mode='RGBA',
                sha256=digest((ROOT/rel).read_bytes()), retained_pixels_identical_to_source=True,
                source_edge_clipped_frames=clipped))
    write_json('strips.json', records)
    return records


def review(records, output, title):
    font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    font = ImageFont.truetype(font_path, 12)
    small = ImageFont.truetype(font_path, 10)
    heights = [32 + ((r['frame_count']+2)//3)*116 for r in records]
    canvas = Image.new('RGB',(390,64+sum(heights)), '#15252c')
    draw = ImageDraw.Draw(canvas)
    draw.text((10,10),title,fill='#eee4cc',font=font)
    draw.text((10,32),'Static artwork candidates / L to R / no motion approval',fill='#9cbdc4',font=small)
    y=64
    for r, block_h in zip(records,heights):
        color = '#f4cb76' if r['preferred_candidate'] else '#a6b5b9'
        draw.line((8,y,382,y),fill='#34505a')
        draw.text((10,y+6),f"{r['identity']} / {r['move']} / {r['revision']}" + (' *' if r['preferred_candidate'] else ''),font=small,fill=color)
        raw=Image.open(ROOT/r['file']).convert('RGBA')
        all_bounds=r['frame_bounds_alpha_gt80_xyxy']
        shared_top=min(b[1] for b in all_bounds)-3
        shared_bottom=max(b[3] for b in all_bounds)+3
        scale=min(116/max(b[2]-b[0]+6 for b in all_bounds),92/(shared_bottom-shared_top))
        for i,b in enumerate(r['frame_bounds_alpha_gt80_xyxy']):
            # Crop using common alpha-derived frame regions for a STATIC review.
            # Original raw row spacing and pixels remain untouched on disk.
            x0,y0,x1,y1=b
            tile=raw.crop((max(0,x0-3),max(0,y0-3),min(raw.width,x1+3),min(raw.height,y1+3)))
            tile=tile.resize((max(1,round(tile.width*scale)),max(1,round(tile.height*scale))),Image.Resampling.LANCZOS)
            tx=8+(i%3)*128+(120-tile.width)//2
            ty=y+32+(i//3)*116+round((y0-3-shared_top)*scale)+(96-round((shared_bottom-shared_top)*scale))
            canvas.paste(tile,(tx,ty),tile)
            draw.text((12+(i%3)*128,y+132+(i//3)*116),str(i+1),font=small,fill='#a6b5b9')
        y+=block_h
    canvas.save(ROOT/output)


def validate_seeds():
    data=read_json('seeds.json')
    for seed in data['seeds']:
        path=ROOT/seed['file']
        im=Image.open(path).convert('RGBA')
        assert digest(path.read_bytes()) == seed['sha256']
        assert digest(im.tobytes()) == seed['rgba_sha256']
        atlas=Image.open(REPO/seed['atlas']).convert('RGBA')
        assert im.tobytes() == atlas.crop(seed['crop_xyxy']).tobytes()
        blob=subprocess.check_output(['git','rev-parse',data['base_commit']+':'+seed['atlas']],cwd=REPO,text=True).strip()
        assert blob == seed['atlas_git_blob']


def report(records):
    files={}
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name=='validation.json':
            continue
        entry={'sha256':digest(p.read_bytes()),'bytes':p.stat().st_size}
        if p.suffix=='.png':
            im=Image.open(p)
            entry.update(size=list(im.size),mode=im.mode)
            if im.mode=='RGBA':
                alpha=np.asarray(im)[:,:,3]
                entry.update(alpha_range=[int(alpha.min()),int(alpha.max())], transparent_pixel_count=int((alpha==0).sum()))
        files[str(p.relative_to(ROOT))]=entry
    data={'package':'ART-UNIT-ANIMATION-A5-001','seed_base_commit':read_json('seeds.json')['base_commit'],
        'scope':'artwork review only; no runtime integration or owner selection implied',
        'checks':{'seed_crops_exact':True,'transparent_raw_pngs':True,'source_pixels_preserved':True,
            'no_major_silhouette_edge_clipping':True,'raw_strip_count':len(records),
            'figure_count':sum(r['frame_count'] for r in records),
            'preferred_strip_count':sum(r['preferred_candidate'] for r in records)},
        'self_hash_policy':'All other package files have exact full-file SHA-256 below. validation.json cannot contain its own full-file hash; after pushing, compare its complete branch blob bytes and SHA-256 separately with the local manifest. No circular or placeholder hash is used.',
        'files':files}
    write_json('validation.json',data)


def verify_branch(ref):
    prefix=str(ROOT.relative_to(REPO))+'/'
    data=read_json('validation.json')
    names=subprocess.check_output(['git','ls-tree','-r','--name-only',ref,'--',prefix],cwd=REPO,text=True).splitlines()
    expected=set(data['files'])|{'validation.json'}
    assert {p.removeprefix(prefix) for p in names} == expected
    for rel,info in data['files'].items():
        content=subprocess.check_output(['git','show',ref+':'+prefix+rel],cwd=REPO)
        assert digest(content)==info['sha256'],rel
    remote_manifest=subprocess.check_output(['git','show',ref+':'+prefix+'validation.json'],cwd=REPO)
    assert remote_manifest==(ROOT/'validation.json').read_bytes()
    print(json.dumps({'ref':ref,'verified_files':len(names),'validation_json_sha256':digest(remote_manifest),'result':'PASS'},indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--verify-branch')
    args=parser.parse_args()
    if args.verify_branch:
        verify_branch(args.verify_branch)
    else:
        validate_seeds()
        records=extract()
        review(records,'preview-390.png','A5 / all candidates (* preferred)')
        for group in ('heroes','foes'):
            review([r for r in records if r['file'].startswith(group+'/')],group+'/preview-390.png','A5 / '+group+' (* preferred)')
        report(records)
        print('Validated',len(records),'raw strips;',sum(r['frame_count'] for r in records),'figures')
