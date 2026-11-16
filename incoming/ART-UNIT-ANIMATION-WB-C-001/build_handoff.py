#!/usr/bin/env python3
"""Rebuild Morvane body-only handoff; no runtime integration.
python3 -I incoming/ART-UNIT-ANIMATION-WB-C-001/build_handoff.py
python3 -I incoming/ART-UNIT-ANIMATION-WB-C-001/build_handoff.py --verify
Python3 + pinned Pillow/NumPy; audits additionally use OpenCV.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT = Path(__file__).resolve().parent
CELL,SOLE = 1024,896
SEED = ROOT/'seeds/seed-c.png'
ANN = json.loads((ROOT/'annotations.json').read_text())
INPUT = json.loads((ROOT/'motion-specs.json').read_text())
GLOBAL_SCALE = ANN['calibration']['global_scale']
BASE = json.loads((ROOT/'seeds/context.json').read_text())['base_commit']
ORDERS = {
 'six-hand-rend':['ready','middle pair draws back; upper pair high','middle pair open; slight right anticipation','both middle hands sweep low left','middle pair follow-through low; cloak trails','ready'],
 'severing-bolt':['ready','lower pair clasps at chest','lower pair opens aiming; chest bright','lower small palms push left','lower pair follows through','ready'],
 'fate-lash':['ready','upper pair pinches before face','upper wrists cross overhead','upper pair lashes down left','upper pair follow-through','ready'],
 'call-the-court':['ready','upper pair draws together above crown','upper pair opens outward','held wide opening; chest bright','upper pair releases slowly','ready'],
 'shadow-tide':['ready','all three pairs tuck inward','six hands open low','six palms press down; cloak spreads','release low','ready'],
 'severed-crown':['ready','bow; arms contract','head rises; upper pair raised; internal glow','held open-mouth roar','relax','ready'],
 'hit':['ready','recoil right; cloak flutters','brace','ready'],
 'down':['ready','sink; six arms hang','collapse; three cloth tails pool; core dark','held collapsed pile; core dark; no rise']}

def write(name,data):
    (ROOT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def bbox(im,threshold=0):
    return im.getchannel('A').point(lambda v:255 if v>threshold else 0).getbbox()

def clean(im):
    a=np.array(im.convert('RGBA'));a[a[:,:,3]<=8]=0
    return Image.fromarray(a)

def cuts_for(im,n):
    ink=np.array(im.getchannel('A')).sum(axis=0);w=im.width/n;cuts=[0]
    for i in range(1,n):
        lo,hi=int((i-.28)*w),int((i+.28)*w)
        choices=np.flatnonzero(ink[lo:hi]==0)+lo
        assert len(choices),(i,'no clean-alpha separator; regenerate whole strip')
        cuts.append(int(min(choices,key=lambda x:abs(x-i*w))))
    return cuts+[im.width]

def frame_at(im,i):
    return im.crop((i*CELL,0,(i+1)*CELL,CELL))

def preview_tiles(draw_to, frames, start_y, title, scale=.21, frame_indices=None):
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
    # Offline animated WebPs: same ~160px seed, not runtime capture or approved timing.
    for move, frames in all_frames.items():
        images = []
        for f in frames:
            tile = f.resize((215,215), Image.Resampling.LANCZOS)
            bg = Image.new('RGBA', (390,280), '#142036')
            bg.alpha_composite(tile,(87,30))
            images.append(bg)
        durations = [420,220,280,180,260,420] if len(frames)==6 else [420,220,280,700]
        images[0].save(ROOT/'previews'/f'{move}.webp', save_all=True, append_images=images[1:],
            duration=durations, loop=1 if move=='down' else 0, lossless=True, exact=True)
    compare = Image.new('RGBA',(390,300),'#142036')
    d = ImageDraw.Draw(compare)
    d.text((18,12),'Morvane / seed C',fill='#f0d798')
    d.text((215,12),'Sentinel / current',fill='#b9c6dc')
    # Both logical cells use the same displayed width and their actual sole origin.
    for j, path in enumerate([SEED, ROOT/'seeds/sentinel-ready.png']):
        im = Image.open(path).convert('RGBA')
        tile = im.resize((215,215),Image.Resampling.LANCZOS)
        compare.alpha_composite(tile,(round((j+.5)*195-107.5),52))
    d.line((8,240,382,240),fill='#70634b')
    d.text((8,270),'Same displayed cell width; sole = 7/8 height',fill='#b9c6dc')
    compare.save(ROOT/'sentinel-compare.png',compress_level=9)
    return placements


def manifest():
    report={'schema':1,'task':ROOT.name,'base_commit':BASE,'self_excluded':True,
      'self_sha_receipt':'validation.json SHA is recorded in PR body, outside manifest to avoid recursion',
      'logical_cells':44,'owner_motion_approval':'pending','runtime_test':'offline previews only; not integrated or tested in game',
      'checks':'SHA/bytes/modes/full decode; seed locks; transform reconstruction; one calibrated scale; real alpha; margins; cloth-tip anchor; crown-to-cloak height excluding raised arms',
      'anatomy_note':'Height check is not head/torso anatomy approval. Consult anatomy-audit.json and anatomy-review.json; not-measured never passes.',
      'files':{}}
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name=='validation.json' or '__pycache__' in p.parts:continue
        record={'sha256':digest(p),'bytes':p.stat().st_size}
        if p.suffix in ['.png','.webp']:
            with Image.open(p) as im:
                record.update(size=list(im.size),mode=im.mode,frames=im.n_frames)
                for i in range(im.n_frames):im.seek(i);im.load()
        report['files'][p.relative_to(ROOT).as_posix()]=record
    write('validation.json',report)

def verify():
    report=json.loads((ROOT/'validation.json').read_text())
    names={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and p.name!='validation.json' and '__pycache__' not in p.parts}
    assert names==set(report['files'])
    images=0
    for name,record in report['files'].items():
        p=ROOT/name;assert digest(p)==record['sha256'] and p.stat().st_size==record['bytes'],name
        if p.suffix in ['.png','.webp']:
            with Image.open(p) as im:
                assert list(im.size)==record['size'] and im.mode==record['mode'] and im.n_frames==record['frames'],name
                for i in range(im.n_frames):im.seek(i);im.load()
                images+=1
    seed=Image.open(SEED).convert('RGBA');spec=json.loads((ROOT/'strips.json').read_text());height=json.loads((ROOT/'height-audit.json').read_text())
    count=0;locks=0
    for move in spec['moves']:
        sheet=Image.open(ROOT/move['file']).convert('RGBA');raw=Image.open(ROOT/move['raw']).convert('RGBA')
        assert sheet.size==(move['frame_count']*CELL,CELL)
        assert move['canonical_body_scale']==GLOBAL_SCALE
        assert min(move['derived_raw_clear_gutters_px'])>=48
        for i,t in enumerate(move['transforms']):
            count+=1;f=frame_at(sheet,i);b=bbox(f);a=f.getchannel('A');hist=a.histogram()
            assert b and b[0]>=32 and b[1]>=32 and b[2]<=992 and b[3]<=899,(move['move'],i,b)
            assert list(b)==move['frame_bounds_xyxy'][i]
            assert hist[0]>300000 and sum(hist[1:255])>100
            assert t['uniform_scale']==move['effective_source_scale']
            if t['seed_locked']:
                locks+=1;assert f.tobytes()==seed.tobytes()
            else:
                crop=raw.crop(t['source_crop_xyxy']);z=t['uniform_scale'];size=(round(crop.width*z),round(crop.height*z));fig=crop.resize(size,Image.Resampling.LANCZOS);x,y=t['paste_xy']
                assert x>=32 and y>=32 and x+fig.width<=992 and y+fig.height<=899
                rebuilt=Image.new('RGBA',(CELL,CELL));rebuilt.alpha_composite(fig,(x,y));assert rebuilt.tobytes()==f.tobytes(),(move['move'],i,'transform mismatch')
                assert abs(t['measured_cloak_tip_y']-896)<=.5
    assert count==44 and locks==15
    assert len(height['frames'])==44
    assert all(abs(t['height_ratio_vs_seed']-1)<=.04 for t in height['frames'] if t['status']!='intentional-collapse')
    assert sum(t['status']=='intentional-collapse' for t in height['frames'])==3
    for g in json.loads((ROOT/'prompts.json').read_text())['generations']:
        assert 'seeds/seed-c.png' in g['references'] and g['prompt'] and (ROOT/g['original']).exists()
    print(f'PASS technical integrity: {len(names)} SHA-256/byte lengths; {images} images fully decoded including animated frames;44 cells/15 exact seed locks/shared scale/reconstruction/alpha/margins/cloth anchor;41 crown-to-cloak measurements within4%,3 intentional down collapses.')
    print('Owner visual/motion approval pending; anatomy not-measured/flags are retained, not automatic passes.')

def build():
    (ROOT/'previews').mkdir(exist_ok=True);seed=Image.open(SEED).convert('RGBA');assert seed.size==(1024,1024)
    all_frames={};moves=[];height_rows=[];proof_frames={}
    for move,name in INPUT['selected'].items():
        n=INPUT['specs'][move]['n'];path=ROOT/'raw/original'/f'{name}.png';source=Image.open(path).convert('RGBA');im=clean(source);cuts=cuts_for(im,n)
        pieces=[];original_bounds=[]
        for i in range(n):
            c=im.crop((cuts[i],0,cuts[i+1],im.height));b=bbox(c);pieces.append((c.crop(b),b));original_bounds.append([cuts[i]+b[0],b[1],cuts[i]+b[2],b[3]])
        pitch=max(fig.width for fig,b in pieces)+64
        raw=Image.new('RGBA',(n*pitch+64,im.height));raw_bounds=[]
        for i,(fig,b) in enumerate(pieces):
            x=64+i*pitch;raw.paste(fig,(x,b[1]));raw_bounds.append([x,b[1],x+fig.width,b[3]])
        raw_path=ROOT/'raw'/f'{move}.png';raw.save(raw_path,compress_level=9)
        resolution_scale=362/(source.width/n);scale=GLOBAL_SCALE*resolution_scale;frames=[];transforms=[];proof=[]
        for i,raw_b in enumerate(raw_bounds):
            original_b=original_bounds[i];source_tip=original_b[3]-1;crown=ANN['frames'][move][i]['crown_xy'];fig=raw.crop(raw_b)
            size=(round(fig.width*scale),round(fig.height*scale));fig=fig.resize(size,Image.Resampling.LANCZOS);x=round(512-fig.width/2);y=round(896-(source_tip-raw_b[1])*scale)
            locked=i==0 or (move!='down' and i==n-1);collapse=move=='down' and i>0
            if not locked:assert x>=32 and y>=32 and x+fig.width<=992 and y+fig.height<=899,(move,i,'regenerate overflow',x,y,fig.size)
            f=Image.new('RGBA',(CELL,CELL));f.alpha_composite(fig,(x,y))
            if locked:f=seed.copy()
            mapped_tip=896.0 if locked else y+(source_tip-raw_b[1])*scale
            mapped_crown=[554.,137.] if locked else [x+(crown[0]-original_b[0])*scale,y+(crown[1]-raw_b[1])*scale]
            height=759.0 if locked else (source_tip-crown[1])*scale;ratio=height/759
            if not collapse:assert abs(ratio-1)<=.04,(move,i,'height outside4%',ratio)
            row={'move':move,'frame':i,'seed_locked':locked,'crown_xy':mapped_crown,'cloak_tip_y':mapped_tip,'height_px':height,'height_ratio_vs_seed':ratio,'status':'intentional-collapse' if collapse else 'seed-exact' if locked else 'within-4pct','measurement':'visible gold crown apex to lowest cleaned-alpha center cloth tip; raised arms excluded','source_crown_xy':crown,'source_cloak_tip_y':source_tip}
            height_rows.append(row);frames.append(f)
            transforms.append({'source_crop_xyxy':raw_b,'original_pose_bbox_xyxy':original_b,'source_crown_xy':crown,'source_cloak_tip_y':source_tip,'uniform_scale':scale,'paste_xy':[x,y],'seed_locked':locked,'sole_y':896,'measured_cloak_tip_y':mapped_tip,'hover_offset_y':0,'hover_note':'intentional collapse; cloth pooled on y896, not upright hover' if collapse else 'lowest cloth-tip hover anchor remains y896; no feet; arm motion preserves anchor','anchor_x_policy':'alpha-silhouette center x512; no pose fitting/scaling'})
            q=f.copy();draw=ImageDraw.Draw(q);cx,cy=mapped_crown;draw.line((cx-28,cy,cx+28,cy),fill='#ffc64d',width=5);draw.ellipse((cx-7,cy-7,cx+7,cy+7),outline='#ffc64d',width=3);draw.line((480,mapped_tip,544,mapped_tip),fill='#6cffa8',width=5);proof.append(q)
        sheet=Image.new('RGBA',(CELL*n,CELL))
        for i,f in enumerate(frames):sheet.paste(f,(i*CELL,0))
        out=ROOT/'strips'/f'{move}.png';sheet.save(out,compress_level=9);all_frames[move]=frames;proof_frames[move]=proof
        gaps=[raw_bounds[i+1][0]-raw_bounds[i][2] for i in range(n-1)]
        moves.append({'move':move,'file':out.relative_to(ROOT).as_posix(),'raw':raw_path.relative_to(ROOT).as_posix(),'generator_original':path.relative_to(ROOT).as_posix(),'frame_count':n,'frame_size':[CELL,CELL],'frame_order':ORDERS[move],'facing':'left','mirror':False,'raw_pose_bounds_xyxy':raw_bounds,'original_pose_bounds_xyxy':original_bounds,'original_cuts_x':cuts,'original_gaps_after_cleanup_px':[original_bounds[i+1][0]-original_bounds[i][2] for i in range(n-1)],'derived_raw_clear_gutters_px':gaps,'canonical_body_scale':GLOBAL_SCALE,'source_resolution_scale':resolution_scale,'effective_source_scale':scale,'transforms':transforms,'frame_bounds_xyxy':[list(bbox(f)) for f in frames],'hold_frame_0based':3 if move in ['call-the-court','down'] else None,'choice':'R1' if move=='call-the-court' else None,'runtime_intake_indices_0based':[1,2,3] if move=='down' else [1,2] if move=='hit' else [1,2,3,4]})
    positions=make_previews(all_frames)
    proof=Image.new('RGBA',(390,10000),'#142036');yy=8
    for move,frames in proof_frames.items():yy,_=preview_tiles(proof,frames,yy,move+' / crown-cloak')
    proof.crop((0,0,390,yy)).save(ROOT/'previews/height-landmarks-390.png',compress_level=9)
    write('height-audit.json',{'task':ROOT.name,'seed_crown_xy':[554,137],'seed_cloak_tip_y':896,'seed_body_height':759,'tolerance':.04,'policy':'Crown apex to longest center-cloak tip excludes raised arms. Down collapse intentionally reduces projected height, not a per-pose rescale. Manual landmark overlay retained; this is not a head/torso anatomy certificate.','frames':height_rows})
    write('strips.json',{'task':ROOT.name,'base_commit':BASE,'seed':'seeds/seed-c.png','logical_frame_count':44,'canonical_body_scale':GLOBAL_SCALE,'calibration':ANN['calibration'],'scale_policy':'Calibrate once from Six-Hand Rend ready. Original canvas width/N converts raster resolution only; no per-frame or per-strip anatomical fit.','raw_policy':'raw/original is byte-exact generator output incl rejected versions. raw/<move> is DERIVED: clear alpha<=8 and hidden RGB, crop alpha bbox and pad >=64px; no redraw/rescale. Original and padded bboxes/gaps separate.','anchor_policy':'No feet: actual cleaned-alpha lowest cloak endpoint maps to896; alpha bbox <=899. Down uses pooled cloth contact. All actual hover offsets0; torso/cloth articulation preserves original pose.','preview_scale':.21,'preview_seed_height_px':763*.21,'preview_positions':positions,'moves':moves})
    write('seeds.json',{'task':ROOT.name,'character':'Morvane / มอร์เวน ราชันด้ายขาด','source_commit':'46f366dc931e4994d3a6ccd9ad3951ac444a70cf','source_path':'incoming/ART-CHAR-WORLDBOSS-001/seed-c.png','local_seed':'seeds/seed-c.png','sha256':digest(SEED),'size':[1024,1024],'facing':'left','mirror':False,'virtual_sole_y':896,'no_feet':True,'priority':'Seed primary; turnaround only shape guide','numeric_rng_seed':None,'generation_note':'Generator exposes no numeric seed; original PNGs retained. All prompts include seed-c. Each request creates one whole strip.','files_sha256':{p.relative_to(ROOT).as_posix():digest(p) for p in sorted((ROOT/'seeds').rglob('*')) if p.is_file()},'invariants':['upper pair slim gold bracers','middle pair huge gold cuffs/large hands','lower pair small hands at waist','one round cyan chestcore','one gold crown','three cloak tails; no legs'],'owner_motion_approval':'pending'})
    manifest();verify()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--verify',action='store_true');a=p.parse_args();verify() if a.verify else build()
