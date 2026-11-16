#!/usr/bin/env python3
"""Build original world-boss VFX layers and illustrative review boards only.

python3 -I incoming/ART-VFX-WB-TRIO-001/build_handoff.py
python3 -I incoming/ART-VFX-WB-TRIO-001/build_handoff.py --verify
python3 -I incoming/ART-VFX-WB-TRIO-001/build_handoff.py --git-ref FETCH_HEAD
Pinned Pillow/NumPy required; no generator/network access during rebuild.
"""
import argparse
from functools import lru_cache
from io import BytesIO
import hashlib
import json
from pathlib import Path
import runpy
import subprocess
import numpy as np
from PIL import Image,ImageOps,__version__ as PILLOW

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[1]
PREFIX=ROOT.relative_to(REPO).as_posix()+'/'
BEATS=('prepare','peak','settle')
SPEC=json.loads((ROOT/'effects-specs.json').read_text())
BASE=json.loads((ROOT/'seeds/context.json').read_text())['base_commit']
Boards=runpy.run_path(str(ROOT/'review_boards.py'))['Boards']

def digest(data):return hashlib.sha256(data).hexdigest()
def write(name,data):(ROOT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def clean(im):
    a=np.array(im.convert('RGBA'));a[a[:,:,3]<=8]=0
    return Image.fromarray(a)

def separators(im):
    ink=np.array(im.getchannel('A')).sum(axis=0);w=im.width/3;cuts=[0]
    for i in [1,2]:
        lo,hi=int((i-.30)*w),int((i+.30)*w);z=np.flatnonzero(ink[lo:hi]==0)+lo
        assert len(z),(i,'no transparent separator; regenerate source')
        cuts.append(int(min(z,key=lambda x:abs(x-i*w))))
    return cuts+[im.width]

def normalize(source,rect,pivot,beat,ground=False,flip=False,contact=None):
    im=clean(source);piece=im.crop(rect);b=piece.getchannel('A').getbbox();assert b
    global_b=[rect[0]+b[0],rect[1]+b[1],rect[0]+b[2],rect[1]+b[3]]
    fig=piece.crop(b);w,h=fig.size
    if contact:point=(contact[0]-global_b[0],contact[1]-global_b[1])
    elif ground:point=(w/2,h*(.90 if beat=='settle' else .82))
    else:point=(w/2,h/2)
    if flip:fig=ImageOps.mirror(fig);point=(w-point[0],point[1])
    # Padding is guaranteed by pivot-relative constraints, not by cropping a motif.
    px,py=pivot;qx,qy=point;cap=160 if beat=='settle' else 230
    scale=min(cap/w,cap/h,(px-13)/max(qx,.001),(243-px)/max(w-qx,.001),
              (py-13)/max(qy,.001),(243-py)/max(h-qy,.001))
    size=(max(1,round(w*scale)),max(1,round(h*scale)));fig=fig.resize(size,Image.Resampling.LANCZOS)
    xy=(round(px-qx*scale),round(py-qy*scale));assert xy[0]>=12 and xy[1]>=12 and xy[0]+size[0]<=244 and xy[1]+size[1]<=244
    out=Image.new('RGBA',(256,256));out.alpha_composite(fig,xy)
    return out,{'source_crop_xyxy':list(rect),'source_alpha_bbox_xyxy':global_b,'alpha_cleanup':'alpha<=8 and hidden RGB cleared; source bytes unchanged',
      'uniform_scale':scale,'paste_xy':list(xy),'resized':list(size),'flip_x':flip,'pivot_in_cropped_source_after_flip':list(point),
      'source_contact_xy':contact,'settle_max_extent':160 if beat=='settle' else None}

def placement(d,beat):
    base=d.get('base',d['id']);route=d['route'];ground=base in ['mountain-fall','rift-quake','shadow-tide'] and not(base=='mountain-fall' and beat=='prepare')
    pivot=[128,210] if ground else [128,128]
    if route=='summon':anchor='summoned_slot.chest'
    elif beat=='prepare':
        if base in ['rift-quake','shadow-tide']:anchor='caster.feet'
        elif base=='severing-bolt':anchor='caster.lower_hands'
        elif base=='fate-lash':anchor='caster.upper_hands_safe'
        elif base=='wing-gathering':anchor='caster.left_shoulder_core'
        elif base=='sky-rend':anchor='caster.upper_back'
        elif base in ['wing-gust','worldshard-dive']:anchor='caster.wing_base'
        else:anchor='caster.forward_chest'
    elif route in ['caster','charge']:anchor='caster.left_shoulder_core' if base=='wing-gathering' else 'caster.upper_back' if base=='sky-rend' else 'caster.chest'
    elif route=='all':anchor='whole_hero_side.actual_target_feet' if ground else 'whole_hero_side.actual_target_chests'
    else:anchor='target.feet' if ground else 'target.chest'
    width=80 if beat=='prepare' else 130 if beat=='peak' else 60
    if route=='all' and beat!='prepare':width=74 if beat=='peak' else 42
    if route=='summon':width={'prepare':64,'peak':78,'settle':40}[beat]
    if route=='charge' and beat!='prepare':width=110 if beat=='peak' else 54
    return anchor,pivot,width,ground

def layer_path(d,beat):
    base=d.get('base',d['id'])
    return f"alternatives/{d['id']}/layers/{base}-{beat}.png" if d.get('alternative') else f'layers/{base}-{beat}.png'

def read(ref,name):
    return subprocess.check_output(['git','show',f'{ref}:{PREFIX}{name}'],cwd=REPO) if ref else (ROOT/name).read_bytes()

def renderer(ref,records):
    @lru_cache(None)
    def asset(name):
        with Image.open(BytesIO(read(ref,name))) as im:return im.convert('RGBA')
    return Boards(asset,{(r['design'],r['beat']):r for r in records})

def manifest():
    files={}
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name=='validation.json' or '__pycache__' in p.parts:continue
        data=p.read_bytes();r={'sha256':digest(data),'bytes':len(data)}
        if p.suffix in ['.png','.webp']:
            with Image.open(p) as im:
                r.update(size=list(im.size),mode=im.mode,frames=im.n_frames)
                for i in range(im.n_frames):im.seek(i);im.load()
        files[p.relative_to(ROOT).as_posix()]=r
    audit=json.loads((ROOT/'storyboard-audit.json').read_text());panels=[p for b in audit['boards'] for p in b['panels']]+audit['waiting_holds']
    write('validation.json',{'task':ROOT.name,'base_commit':BASE,'pillow':PILLOW,'files':files,
      'self_excluded':True,'self_receipt':'validation.json SHA recorded in PR; --git-ref separately compares manifest bytes',
      'checks':{'primary_moves':13,'primary_layers':39,'alternative_layers':6,'straight_rgba_256':True,'minimum_alpha_margin_px':12,'storyboard_width':390,
        'masked_remaining_face_hp_name_intent_overlap':0,'normal_blend':True,'runtime_tested':False,'owner_visual_motion_approval':'pending'},
      'mask_totals':{'panels':len(panels),'overlap_pixels_before_removed_by_stencils':sum(p['masked_pixels'] for p in panels),'remaining_overlap':sum(p['remaining_overlap'] for p in panels)},
      'mask_limit':'Zero remaining overlap is after illustrative effect-only stencils, not naturally clear runtime placement. Every removed-pixel count retained.'})

def build():
    records=[];sources=[]
    for d in SPEC['designs']:
        ident=d['id'];source_name=SPEC['selected_sources'].get(ident,ident);path=ROOT/'source'/f'{source_name}.png';source=Image.open(path).convert('RGBA');im=clean(source);cuts=separators(im);sources.append({'design':ident,'file':path.relative_to(ROOT).as_posix(),'sha256':digest(path.read_bytes()),'size':list(source.size),'cuts_x':cuts})
        for i,beat in enumerate(BEATS):
            anchor,pivot,width,ground=placement(d,beat);rect=(cuts[i],0,cuts[i+1],source.height);base=d.get('base',ident);flip=base=='rift-quake' and beat=='peak';contact=[1104,553] if base=='mountain-fall' and beat=='peak' else None
            layer,transform=normalize(source,rect,pivot,beat,ground,flip,contact);out=ROOT/layer_path(d,beat);out.parent.mkdir(parents=True,exist_ok=True);layer.save(out,compress_level=9)
            a=layer.getchannel('A');box=a.getbbox();records.append({'design':ident,'move':base,'name':d['name'].replace(' R2',''),'boss':d['boss'],'beat':beat,'version':d.get('alternative','R1'),'recommended':not bool(d.get('alternative')),
              'file':out.relative_to(ROOT).as_posix(),'source':path.relative_to(ROOT).as_posix(),'source_crop':list(rect),'transform':transform,'size':[256,256],'mode':'RGBA','alpha':'straight','alpha_bbox':list(box),
              'checksum':digest(out.read_bytes()),'sha256':digest(out.read_bytes()),'anchor':anchor,'pivot_px':pivot,'pivot_normalized':[v/256 for v in pivot],'width_390':width,'suggested_canvas_width_390':width,'visible_width_390':(box[2]-box[0])*width/256,
              'offset_390':[12,0] if base=='wing-gathering' else [0,0],'route':d['route'],'actual_targets_only':True,'zero_damage_cue':d['route'] in ['charge','caster','summon'],'unstoppable':bool(d.get('unstoppable')),'breakable':bool(d.get('breakable')),'phase_change':bool(d.get('phase_change')),'blend':'normal','additive_intended':False,
              'direction':'enemy-right toward hero-left; local phase/charge/summon has no hero impact','suggested_ms':[0,140] if beat=='prepare' else [140,320] if beat=='peak' else [320,540],
              'timing_note':'Art windows only; preserve existing normal/fast/reduced-motion duration and actual event contacts; settle fades and never emits damage.'})
    boards=renderer(None,records);audits=[]
    for d in SPEC['designs']:
        board,audit=boards.storyboard(d);board.save(ROOT/audit['file'],compress_level=9);audits.append(audit)
    contrast=[]
    for boss in ['kragmor','valdrakk','morvane']:
        board,metrics=boards.contrast(SPEC['designs'],boss);board.save(ROOT/'storyboards'/f'contrast-{boss}-390.png',compress_level=9);contrast.extend(metrics)
    comparisons=[
      ('telegraphs-390.png',[('titan-gathering','prepare','NORMAL / Titan action key'),('wing-gathering','prepare','BREAKABLE / cracked shell R1'),('mountain-fall','prepare','UNSTOPPABLE / release warning')],'THREE TELEGRAPH SILHOUETTES','80px / navy left / gold armour right',[80,80,80]),
      ('severing-vs-lash-390.png',[('severing-bolt','peak','Severing Bolt / straight'),('fate-lash','peak','Fate Lash / curved')],'STRAIGHT / CURVED THREADS','130px normal blend; hero direction left',[130,130]),
      ('court-vs-rift-390.png',[('call-the-court','peak','Call the Court R1 / reaching hand'),('call-the-court-r2','peak','Call the Court R2 / cloth plume'),('seeds/style/call-the-rift-peak.png','peak','OLD Call the Rift / upright tear')],'SUMMON LANGUAGE COMPARISON','Local slot cue; no damage or floor ring',[100,100,100]),
      ('wing-gathering-variants-390.png',[('wing-gathering','prepare','R1 / cracked thin shell / recommended'),('wing-gathering-r2','prepare','R2 / fractured feather folds')],'BREAKABLE CHARGE / R1 + R2','80px / choose ONE design; owner decides',[80,80])]
    for name,keys,title,subtitle,widths in comparisons:boards.compare(keys,title,subtitle,widths).save(ROOT/'storyboards'/name,compress_level=9)
    waiting,waiting_checks=boards.waiting();waiting.save(ROOT/'storyboards/waiting-holds-390.png',compress_level=9)
    Image.open(ROOT/'storyboards/telegraphs-390.png').save(ROOT/'preview-390.png',compress_level=9)
    boards.overview(SPEC['designs']).save(ROOT/'preview-peaks-390.png',compress_level=9)
    telegraphs=[{'charge':'Titan Gathering','ordinary_action_prepare':'layers/titan-gathering-prepare.png','actual_following_release':'Mountain Fall','actual_waiting_hold':'layers/mountain-fall-prepare.png','kind':'unstoppable-release warning; do not imply zero-damage charge itself uninterruptible'},
      {'charge':'Wing Gathering','actual_following_release':'Worldshard Dive','actual_waiting_hold':'layers/wing-gathering-prepare.png','alternative_hold':'alternatives/wing-gathering-r2/layers/wing-gathering-prepare.png','kind':'breakable charge; prefer fragile shell/feather key even though following dive is normal'}]
    for t in telegraphs:t.update(anchor='caster.forward_chest' if t['charge']=='Titan Gathering' else 'caster.left_shoulder_core',pivot_px=[128,128],width_390=80,lifetime='actual waiting state until release/interruption/death/intent replacement',motion='no spin; reduced motion static; fit existing presentation timing')
    write('layers.json',{'schema':1,'task':ROOT.name,'base_commit':BASE,'beats':list(BEATS),'primary_move_count':13,'primary_layer_count':39,'alternative_layer_count':6,'moves':[d for d in SPEC['designs'] if not d.get('alternative')],'alternatives':[d for d in SPEC['designs'] if d.get('alternative')],'layers':records,'telegraphs':telegraphs,'storyboards':audits,
      'routing':'Actual affected heroes only for all; actual target only for single; phases/charge paint no damage; summon only actual restored slots. Staging fixtures are illustrative, not resolver events.',
      'shadow_tide_choice':'Use actual_target_feet / [128,210] for low cloth wave, avoiding body labels; proposed integration choice, no rule change.',
      'alternatives_policy':'R1 primary recommended for Wing Gathering/Call the Court; R2 supplied separately. Owner chooses one; never stack alternatives.',
      'anchor_definitions_390':{'caster.forward_chest':'chest minus60px x at216px world-boss cell; forward offset is included in anchor, not an additional offset','caster.left_shoulder_core':'Valdrakk cyan core; record offset_390 adds12px toward rear to avoid head','caster.wing_base':'Valdrakk prepare-only proposed seed point(485,475)','caster.upper_back':'Sky Rend proposed seed point(600,400), fan above back','caster.upper_hands_safe':'Morvane overhead-forward point(200,165), loop projects ahead of raised hand, away from labels','caster.lower_hands':'Morvane seed point(530,510)','pose_chest':'peak chest is cyan-weighted centroid in a documented body ROI; fixture reference only, not an engine socket'},
      'mask_policy':'Effects alone are stencilled around face/HP/name/intent. Zero residual overlap after stencils is not proof of naturally safe runtime anchors.'})
    write('storyboard-audit.json',{'boards':audits,'waiting_holds':waiting_checks,'contrast':contrast,'runtime_capture':False,'assertion':'remaining_overlap=0 after effect-only masks; before counts and removed fractions retained'})
    write('production-sources.json',{'sources':sources,'normalization':'source bytes immutable; clear only alpha<=8/invisible RGB; proportional resize; fresh transparent padding>=12px; optional recorded VFX-only flip, no recolour/repaint/keying.',
      'source_beats':'Each source request paints one complete prepare/peak/settle row. Every selected crop/transform recorded in layers.json. Rejected outputs retained too.',
      'ground_contact':'[128,210] pivot for feet layers. Mountain peak contact manually proposed at source(1104,553); other ground motifs use lower footprint82%/settle90%. Verify actual renderer feet during intake.',
      'flips':[{'file':'layers/rift-quake-peak.png','why':'Generated fracture ridges lead toward right; mirrored VFX only to propagate left. No boss/hero seed is mirrored.'}]})
    write('seeds.json',{'task':ROOT.name,'boss_seed_commit':'46f366dc931e4994d3a6ccd9ad3951ac444a70cf','numeric_rng_seed':None,'seed_policy':'Boss seed attached every generation as palette/identity context only; original old VFX layers also attached. Hero/background/minions/poses are read-only composition/anchor references, not new body art.',
      'files':[{'file':p.relative_to(ROOT).as_posix(),'sha256':digest(p.read_bytes()),'bytes':p.stat().st_size} for p in sorted((ROOT/'seeds').rglob('*')) if p.is_file()]})
    manifest();verify()

def verify(ref=None):
    report=json.loads((ROOT/'validation.json').read_text());expected=set(report['files'])|{'validation.json'}
    if ref:
        assert read(ref,'validation.json')==(ROOT/'validation.json').read_bytes()
        actual=subprocess.check_output(['git','ls-tree','-r','--name-only',ref,'--',PREFIX],cwd=REPO,text=True).splitlines();assert set(actual)=={PREFIX+n for n in expected}
    else:
        actual={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in p.parts};assert actual==expected,(actual-expected,expected-actual)
    images=0
    for name,r in report['files'].items():
        data=read(ref,name);assert digest(data)==r['sha256'] and len(data)==r['bytes'],name
        if Path(name).suffix in ['.png','.webp']:
            with Image.open(BytesIO(data)) as im:
                assert list(im.size)==r['size'] and im.mode==r['mode'] and im.n_frames==r['frames'],name
                for i in range(im.n_frames):im.seek(i);im.load()
                if name.endswith('390.png'):assert im.width==390
                if name.startswith('layers/') or name.startswith('alternatives/'):
                    assert im.size==(256,256) and im.mode=='RGBA';a=im.getchannel('A');b=a.getbbox();assert b and min(b[:2])>=12 and max(b[2:])<=244,name
                    hist=a.histogram();assert hist[0]>10000 and sum(hist[1:255])>20,name
                images+=1
    meta=json.loads(read(ref,'layers.json'));records=meta['layers'];assert len(records)==45 and sum(r['file'].startswith('layers/') for r in records)==39
    assert len(meta['moves'])==13 and len(meta['alternatives'])==2
    for g in json.loads(read(ref,'generation-prompts.json'))['generations']:
        assert g['prompt'] and any(p in g['references'] for p in ['seeds/seed-a.png','seeds/seed-b.png','seeds/seed-c.png'])
        assert sum(p.startswith('seeds/style/') for p in g['references'])>=2
    for r in records:
        assert digest(read(ref,r['file']))==r['checksum']==r['sha256'];assert r['blend']=='normal' and not r['additive_intended']
        assert r['pivot_px'] in [[128,128],[128,210]]
        source=Image.open(BytesIO(read(ref,r['source']))).convert('RGBA');t=r['transform'];rebuilt,_=normalize(source,t['source_crop_xyxy'],r['pivot_px'],r['beat'],r['pivot_px']==[128,210],t['flip_x'],t['source_contact_xy'])
        shipped=Image.open(BytesIO(read(ref,r['file']))).convert('RGBA');assert rebuilt.tobytes()==shipped.tobytes(),r['file']
    boards=renderer(ref,records)
    for d,stored in zip(SPEC['designs'],meta['storyboards']):
        board,audit=boards.storyboard(d);assert audit==stored
        actual=Image.open(BytesIO(read(ref,stored['file']))).convert('RGBA');assert actual.tobytes()==board.tobytes(),stored['file']
        assert all(p['remaining_overlap']==0 for p in audit['panels'])
        for panel in audit['panels']:
            ids=[x['actor_id'] for x in panel['instances']]
            if d['route']=='all' and panel['beat']!='prepare':assert ids==panel['fixture_actual_targets']
            if d['route']=='summon':assert ids==['f2','b2'] and 'f3' not in ids
    waiting,waiting_checks=boards.waiting();audit=json.loads(read(ref,'storyboard-audit.json'))
    assert waiting_checks==audit['waiting_holds'] and all(r['remaining_overlap']==0 for r in waiting_checks)
    assert waiting.tobytes()==Image.open(BytesIO(read(ref,'storyboards/waiting-holds-390.png'))).convert('RGBA').tobytes()
    assert boards.overview(SPEC['designs']).tobytes()==Image.open(BytesIO(read(ref,'preview-peaks-390.png'))).convert('RGBA').tobytes()
    print(json.dumps({'verified_files':len(expected) if ref else len(report['files']),'decoded_images':images,'primary_layers':39,'alternative_layers':6,'boards_reconstructed':15,'remaining_masked_overlap':0,'git_ref':ref,'manifest_sha256':digest((ROOT/'validation.json').read_bytes()),'owner_approval':'pending'}))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--verify',action='store_true');p.add_argument('--git-ref');args=p.parse_args()
    verify(args.git_ref) if args.verify or args.git_ref else build()
