"""Isolate generated whole rows, add gutters, and render static review sheets.

No per-pose scaling, anchor normalization, endpoint substitution or atlas packing.
Requires Pillow, NumPy and SciPy. Run from any directory; outputs stay here.
"""
from pathlib import Path
import hashlib
import io
import json
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
PACKAGE = ROOT.name
BASE = json.loads((ROOT / 'seeds.json').read_text())['base_commit']
LAYOUTS = {
    'sefa_r1': ([170, 330, 494, 662, 838], [6, 6, 6, 4, 4, 4]),
    'lio_r1': ([164, 327, 489, 651, 789, 920], [6, 6, 6, 6, 4, 4, 4]),
    'rift_r1': ([220, 435, 646, 851], [6, 6, 5, 4, 4]),
    'spore_r1': ([405, 710], [6, 4, 4]),
    'sefa_extra': ([500], [6, 6]),
    'lio_extra': ([380, 680], [6, 6, 4]),
    'rift_extra': ([500], [6, 6]),
}

# source, observed row, unit, move, candidate, preferred, routes, chronological poses
SPECS = [
 ('sefa_r1',0,'sefa','double-slash','r1',True,['attack','ambush'],['ready','first dagger wind-up','first slash right','second cross slash','low follow-through','recover']),
 ('sefa_r1',1,'sefa','low-stab','r1',False,['backstab','disarm'],['ready','crouch','coil dagger','low lunge thrust right','retract','ready']),
 ('sefa_extra',1,'sefa','low-stab','r2',True,['backstab','disarm'],['ready','drop low','dagger at hip','long low thrust right','retract and rise','ready']),
 ('sefa_r1',2,'sefa','knives','r1',True,['knives'],['ready holding dagger','hand near shoulder','cock elbow','empty-hand release right','empty-hand follow-through','ready with next dagger']),
 ('sefa_extra',0,'sefa','evade','r1',True,['evade','decoy'],['ready','sink weight','front foot pushes off','back foot plants facing right','defensive settle','ready']),
 ('sefa_r1',3,'sefa','hit','r1',True,['hit'],['ready','recoil left','deep guarded flinch','ready']),
 ('sefa_r1',4,'sefa','block','r1',True,['block'],['ready','cross daggers','braced recoil','ready']),
 ('sefa_r1',5,'sefa','down','r1',True,['down'],['ready','knees buckle','lower onto side','collapsed hold']),
 ('lio_r1',0,'lio','strum-strike','r1',True,['attack','note'],['ready','lift strum hand','prepare sharp strum','hard strum right','follow-through','ready']),
 ('lio_extra',1,'lio','strum-strike','r2',False,['attack','note'],['ready','draw instrument back','swing forward right','instrument strike extension','retract','ready']),
 ('lio_r1',1,'lio','sustained-song','r1',True,['valor','mend','solo'],['ready playing','sway left plucking','upright upstrum','sway right plucking','upright downstrum','ready playing']),
 ('lio_r1',2,'lio','dread-chord','r1',True,['dread'],['ready','hunch and lift hand','gather stern strum','hard downward strum','hunched follow-through','recover']),
 ('lio_r1',3,'lio','finale','r1',False,['finale'],['ready','gather instrument','raise near face','high diagonal flourish','lower','recover']),
 ('lio_extra',0,'lio','finale','r2',True,['finale'],['ready','gather and bend knees','lift instrument','instrument above head flourish','lower flourish','ready']),
 ('lio_r1',4,'lio','hit','r1',True,['hit'],['ready','recoil clutching instrument','deep flinch','recover']),
 ('lio_r1',5,'lio','block','r1',True,['block'],['ready','protective brace','absorb recoil','recover']),
 ('lio_extra',2,'lio','down','r1',True,['down'],['ready','knees buckle clutch instrument','kneel and lean on forearm','collapsed on side']),
 ('rift_r1',0,'foe_riftweaver','rune-lash','r1',True,['Rune Lash'],['ready shard at chest','coil arm','raise lead elbow','open-glove whip snap left','low follow-through','recover']),
 ('rift_r1',1,'foe_riftweaver','rift-needle','r1',True,['Rift Needle'],['ready','pinch near shard','draw pinched wrist back','two-finger flick left','wrist follow-through','recover']),
 ('rift_extra',0,'foe_riftweaver','ribbon-snare','r1',True,['Ribbon Snare'],['ready','grasp cloth at chest','wrist toward shoulder','compact wrist cast left','low follow-through','recover']),
 ('rift_extra',1,'foe_riftweaver','ribbon-snare','r2',False,['Ribbon Snare'],['ready','hold cloth at hip','sweep elbow back','low sidearm cloth release','low follow-through','recover']),
 ('rift_r1',3,'foe_riftweaver','hit','r1',True,['hit'],['ready','recoil right','hunch clutching shard','ready']),
 ('rift_r1',4,'foe_riftweaver','down','r1',True,['down'],['ready','hood dips knees buckle','robe sinks','collapsed robe hold']),
 ('spore_r1',0,'foe_spore_puff','spore-dust','r1',True,['Spore Dust'],['ready','compress','inflate caps flare','body squeeze release without cloud','deflate','original size']),
 ('spore_r1',1,'foe_spore_puff','hit','r1',True,['hit'],['ready','recoil right caps tilt','deep squash roots curl','recover']),
 ('spore_r1',2,'foe_spore_puff','down','r1',True,['down'],['ready','caps sag body droops','roots fold down','flattened coherent hold']),
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def dump(name, obj):
    (ROOT / name).write_text(json.dumps(obj, indent=2) + '\n')


def load_source(g):
    data = np.asarray(Image.open(ROOT / g['source']).convert('RGBA'))
    labels, _ = nd.label(data[:, :, 3] > 80)
    components = []
    for idx, slices in enumerate(nd.find_objects(labels), 1):
        if slices is not None and np.count_nonzero(labels[slices] == idx) > 500:
            y, x = slices
            components.append((idx, [x.start, y.start, x.stop, y.stop]))
    cuts, counts = LAYOUTS[g['id']]
    rows = [[] for _ in counts]
    major = np.zeros(labels.shape, np.int32)
    for idx, bounds in components:
        row = int(np.searchsorted(cuts, (bounds[1] + bounds[3]) / 2))
        rows[row].append((idx, bounds))
        major[labels == idx] = idx
    for row, count in zip(rows, counts):
        row.sort(key=lambda v: v[1][0])
        assert len(row) == count, (g['id'], len(row), count)
    distance, nearest = nd.distance_transform_edt(major == 0, return_indices=True)
    owner = major[tuple(nearest)]
    # Geometric fringe isolation: retain original pixels up to 8 px from the
    # opaque silhouette. Discard distant near-transparent matte noise.
    owner[(distance > 8) | (data[:, :, 3] == 0)] = 0
    return data, owner, rows


def render(records, out, title):
    width, row_height = 390, 140
    im = Image.new('RGB', (width, 72 + len(records) * row_height), '#101a2a')
    d = ImageDraw.Draw(im)
    font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    font = ImageFont.truetype(font_path, 12)
    small = ImageFont.truetype(font_path, 10)
    d.text((12, 10), title, font=font, fill='#f5d39b')
    d.text((12, 30), 'STATIC ART REVIEW / gold = recommended', font=small, fill='#c9d4df')
    d.text((12, 46), '6-frame actions / 4-frame reactions / no runtime approval', font=small, fill='#c9d4df')
    for i, r in enumerate(records):
        y = 72 + row_height * i
        d.line((8, y, 382, y), fill='#304259')
        label = r['unit'] + ' / ' + r['move'] + ' / ' + r['candidate'].upper()
        d.text((10, y+6), label, font=font, fill='#f5d39b' if r['preferred'] else '#98a9bc')
        strip = Image.open(ROOT/r['file']).convert('RGBA')
        # ONE shared scale across this whole strip, natural falling height kept.
        max_w = max(b[2]-b[0] for b in r['frame_bounds'])
        scale = min(48/max_w, 82/strip.height)
        for n, b in enumerate(r['frame_bounds']):
            x0, _, x1, _ = b
            frame = strip.crop((x0, 0, x1, strip.height))
            frame = frame.resize((max(1,round(frame.width*scale)),max(1,round(frame.height*scale))),Image.Resampling.LANCZOS)
            x = 8+n*63+(60-frame.width)//2
            im.paste(frame,(x,y+30),frame)
            d.text((8+n*63+26,y+119),str(n+1),font=small,fill='#91a8bb')
    im.save(ROOT/out)


def main():
    generations = json.loads((ROOT/'prompts.json').read_text())['generation']
    sources = {g['id']: (g, *load_source(g)) for g in generations}
    for s in json.loads((ROOT/'seeds.json').read_text())['seeds']:
        seed = Image.open(ROOT/s['seed']).convert('RGBA')
        atlas = Image.open(io.BytesIO(subprocess.check_output(['git','show',BASE+':'+s['atlas']],cwd=REPO))).convert('RGBA')
        assert seed.tobytes() == atlas.crop(s['crop']).tobytes(), s['id']
        assert sha((ROOT/s['seed']).read_bytes()) == s['sha256']
    records = []
    for source_id, row, unit, move, candidate, preferred, routes, order in SPECS:
        g, data, owner, rows = sources[source_id]
        figures = rows[row]
        assert len(figures) == len(order)
        parts = []
        for component, core in figures:
            assert core[0]>0 and core[1]>0 and core[2]<data.shape[1] and core[3]<data.shape[0], (source_id,core)
            ys,xs = np.where(owner == component)
            parts.append((component,[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]))
        left = min(b[0] for _,b in parts)
        top = max(0,min(b[1] for _,b in parts)-16)
        bottom = min(data.shape[0],max(b[3] for _,b in parts)+16)
        right = max(b[2] for _,b in parts)
        out = np.zeros((bottom-top+32,right-left+96*(len(parts)-1)+64,4),np.uint8)
        frame_bounds, source_bounds = [], []
        retained = 0
        for n,(component,b) in enumerate(parts):
            x0,y0,x1,y1 = b
            frame = data[y0:y1,x0:x1].copy()
            mask = owner[y0:y1,x0:x1] == component
            frame[~mask] = 0
            dx,dy = x0-left+32+n*96,y0-top+16
            out[dy:dy+frame.shape[0],dx:dx+frame.shape[1]] = frame
            assert np.array_equal(out[dy:dy+frame.shape[0],dx:dx+frame.shape[1]][mask],data[y0:y1,x0:x1][mask])
            retained += int(mask.sum())
            frame_bounds.append([dx,dy,dx+frame.shape[1],dy+frame.shape[0]])
            source_bounds.append(b)
        gutters = [frame_bounds[n+1][0]-frame_bounds[n][2] for n in range(len(parts)-1)]
        assert min(gutters)>=64
        filename = g['group']+'/raw/'+unit+'-'+move+'-'+candidate+'.png'
        Image.fromarray(out).save(ROOT/filename)
        assert Image.open(ROOT/filename).mode == 'RGBA'
        records.append(dict(unit=unit,move=move,candidate=candidate,preferred=preferred,routes=routes,file=filename,frames=len(order),frame_order=order,source=g['source'],source_row_zero_based=row,source_bounds=source_bounds,frame_bounds=frame_bounds,source_y_crop=[top,bottom],gutter_insert_px=96,minimum_alpha_gutter_px=min(gutters),retained_source_pixels=retained,retained_rgba_exact=True,per_frame_scale_applied=False,source_core_edge_clear=True))
    dump('strips.json',dict(package=PACKAGE,base_commit=BASE,strips=records,excluded_source_rows=[dict(source='heroes/source-sheets/lio_r1.png',row=6,reason='crowded bottom margin; separate down pass selected'),dict(source='foes/source-sheets/rift_r1.png',row=2,reason='ribbon touches next figure; separate compact and sidearm strips selected')]))
    render(records,'preview-390.png','A6 / Sefa, Lio, Rift Weaver, Spore Puff')
    for group in ['heroes','foes']:
        render([r for r in records if r['file'].startswith(group+'/')],group+'/preview-390.png','A6 / '+group+' / static candidate review')
    files=[]
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name in ['validation.json','post-push-verification.json'] or '__pycache__' in p.parts:
            continue
        item=dict(path=p.relative_to(ROOT).as_posix(),bytes=p.stat().st_size,sha256=sha(p.read_bytes()))
        if p.suffix=='.png':
            with Image.open(p) as image:
                image.load()
                item.update(width=image.width,height=image.height,mode=image.mode)
                if image.mode=='RGBA':
                    alpha=np.asarray(image)[:,:,3]
                    item.update(transparent_pixels=int((alpha==0).sum()),visible_pixels=int((alpha>0).sum()))
        files.append(item)
    dump('validation.json',dict(package=PACKAGE,base_commit=BASE,seeds_exact=4,raw_strips=len(records),preferred_strips=sum(r['preferred'] for r in records),figures=sum(r['frames'] for r in records),all_retained_rgba_exact=True,minimum_gutter_px=min(r['minimum_alpha_gutter_px'] for r in records),all_pngs_decoded=True,hash_scope='Every package file except validation.json (self-hash) and post-push-verification.json (post-push receipt); git object transport verifies those separately.',files=files))
    print(json.dumps(dict(raw_strips=len(records),preferred=sum(r['preferred'] for r in records),figures=sum(r['frames'] for r in records),files_hashed=len(files))))


if __name__=='__main__':
    main()
