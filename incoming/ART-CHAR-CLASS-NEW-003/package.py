#!/usr/bin/env python3
"""Rebuild Kael delivery and review evidence. Writes only inside this package.
Pillow registration: alpha>40, rigid rotation, uniform scaling, translation only.
No per-part rescaling, anatomy warping, sole painting or source modification.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json, math

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[1]
OLD=REPO/'incoming/ART-CHAR-CLASS-NEW-002'
BASE='d5fe9eaa668ef6c9a7384a95b0f365ba72dee10a'
NAVY='#142039'
FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
# Manually inspected on the untouched generator output, excluding topknot.
CROWN=(671,122)
CHIN=(670,497)

def load(p):
    with Image.open(p) as im:
        im.load()
        return im.convert('RGBA')

def clean(im):
    im=im.copy()
    im.putalpha(im.getchannel('A').point(lambda v:v if v>40 else 0))
    return im

def bbox(im):
    return im.getchannel('A').point(lambda v:255 if v>40 else 0).getbbox()

def save(im,p):
    p=ROOT/p;p.parent.mkdir(parents=True,exist_ok=True)
    im.save(p,compress_level=9)

def contact(im):
    cols=[x for x in range(512) if im.getpixel((x,496))[3]>40]
    runs=[]
    for x in cols:
        if not runs or x>runs[-1][1]+1:runs.append([x,x])
        else:runs[-1][1]=x
    return {'columns':cols,'runs':runs,'threshold':40}

def point(p,size,angle):
    x,y=p;cx,cy=size[0]/2,size[1]/2;a=math.radians(angle)
    return (cx+(x-cx)*math.cos(a)+(y-cy)*math.sin(a),cy-(x-cx)*math.sin(a)+(y-cy)*math.cos(a))

def unit():
    source=clean(load(ROOT/'sources/kael-unit-03.png'))
    for step in sorted(range(-100,101),key=abs):
        angle=step/50
        im=source.rotate(angle,Image.Resampling.BICUBIC)
        b=bbox(im);c=point(CROWN,source.size,angle);h=point(CHIN,source.size,angle)
        scale=435/(b[3]-1-c[1])
        size=tuple(round(v*scale) for v in source.size)
        im=clean(im.resize(size,Image.Resampling.LANCZOS));b=bbox(im)
        dx=round(256-(b[0]+b[2])/2);dy=497-b[3]
        out=Image.new('RGBA',(512,512));out.alpha_composite(im,(dx,dy))
        feet=contact(out)
        runs=[r for r in feet['runs'] if r[1]-r[0]>=2]
        if len(runs)>=2 and runs[-1][0]-runs[0][1]>30:break
    else:raise ValueError('No rigid registration with both soles at y496')
    save(out,'unit/kael.png')
    # Actual rounded raster dimensions, not the ideal floating point size.
    sx,sy=size[0]/source.width,size[1]/source.height
    crown=round(c[1]*sy+dy);chin=round(h[1]*sy+dy);bounds=bbox(out)
    head=chin-crown+1;body=497-crown
    return {'source':'sources/kael-unit-03.png','source_landmarks':{'skull_crown':CROWN,'chin':CHIN},
        'measurement_method':'Human inspected scalp crown and chin, topknot excluded; rigid transform to cell. Inclusive extents: chin-crown+1, sole-crown+1. Landmark visual uncertainty about +/-2px.',
        'rotation_degrees':angle,'uniform_scale_requested':scale,'raster_size':size,'translation':[dx,dy],
        'skull_crown_y':crown,'topknot_top_y':bounds[1],'chin_y':chin,'head_height':head,
        'crown_to_sole':body,'ratio':round(head/body,6),'sole_y':496,'foot_contact_y496':feet,
        'bounds':bounds,'runtime_pivot':[0.5,497/512]}

def cast():
    allies=[('Aegis','units',0),('Lyra','units',1),('Eira','units',2),('Seren','units',3),
        ('Garran','units_mercs',0),('Mira','units_mercs',1),('Toma','units_mercs',2),('Sefa','units_mercs',3),
        ('Brann','units_mercs',4),('Lio','units_mercs',5),('Corin','units_mercs',6),('Cerise','units_mercs',8)]
    result=[]
    for name,sheet,i in allies:
        atlas=load(REPO/f'public/assets/art/{sheet}.webp');x,y=i%2*512,i//2*512
        result.append((name,atlas.crop((x,y,x+512,y+512))))
    return result

def reviews(a):
    figures=cast()+[('Kael NEW-003',load(ROOT/'unit/kael.png')),('Wynne',load(OLD/'unit/wynne.png')),('Astrid',load(OLD/'unit/astrid.png'))]
    forest=load(REPO/'public/assets/art/battle_forest.webp')
    sheet=Image.new('RGBA',(700,1040),NAVY);d=ImageDraw.Draw(sheet)
    d.text((14,10),'15 allies | identical 115px logical cells | owner review pending',font=FONT,fill='white')
    for group in range(3):
        y0=40+group*330;sheet.alpha_composite(forest.resize((700,150),Image.Resampling.LANCZOS),(0,y0))
        for col in range(5):
            name,im=figures[group*5+col];x=col*138+12
            small=im.resize((115,115),Image.Resampling.LANCZOS);sheet.alpha_composite(small,(x,y0+20))
            silhouette=Image.new('RGBA',(115,115),'black');silhouette.putalpha(small.getchannel('A'))
            panel=Image.new('RGBA',(124,125),'#9baab6');panel.alpha_composite(silhouette,(4,4));sheet.alpha_composite(panel,(x-4,y0+175))
            d.text((x,y0+142),name,font=FONT,fill='white')
        # Re-inspected actual Garran scalp crown and beard/chin. OLD sheet's y198 crosses his face.
        for row,color in [(66,'#6ee7ff'),(235,'#ffce70')]:
            gy=y0+20+round(row*115/512);d.line((0,gy,699,gy),fill=color)
    d.text((14,1020),'Cyan: Garran hair y66 | gold: chin y235 | black silhouettes below',font=FONT,fill='white')
    save(sheet,'review/lineup.png')
    panel=Image.new('RGBA',(1024,750),NAVY);d=ImageDraw.Draw(panel)
    for i,(name,p) in enumerate([('NEW-002',OLD/'unit/kael.png'),('NEW-003',ROOT/'unit/kael.png')]):
        im=load(p);panel.alpha_composite(im,(i*512,35))
        d.text((i*512+15,10),name+' | original 512px cell',font=FONT,fill='white')
        panel.alpha_composite(forest.resize((512,150)),(i*512,580))
        panel.alpha_composite(im.resize((115,115),Image.Resampling.LANCZOS),(i*512+198,600))
        d.line((i*512,531,i*512+511,531),fill='#ff70a0')
    d.text((12,558),'Same scale in both rows; 115px game-size cells below; soles y496.',font=FONT,fill='white')
    save(panel,'review/kael-before-after.png')
    panel=Image.new('RGBA',(1536,560),NAVY);d=ImageDraw.Draw(panel)
    for i,(name,im,landmarks) in enumerate([
        ('Kael NEW-003',load(ROOT/'unit/kael.png'),[(a['topknot_top_y'],'#bd9cff'),(a['skull_crown_y'],'cyan'),(a['chin_y'],'gold')]),
        ('Corin',figures[10][1],[(43,'cyan'),(213,'gold')]),
        ('Garran',figures[4][1],[(66,'cyan'),(235,'gold')])]):
        panel.alpha_composite(im,(i*512,30));d.text((i*512+10,8),name,font=FONT,fill='white')
        for y,c in landmarks+[(496,'#ff70a0')]:
            d.line((i*512,30+y,(i+1)*512-1,30+y),fill=c);d.text((i*512+5,y+30),str(y),font=FONT,fill=c)
    save(panel,'review/anatomy.png')
    # Exact inputs used by the required unmodified audit script.
    for folder,reference in [('corin',figures[10][1]),('garran',figures[4][1])]:
        save(reference,f'review/audit-{folder}/000.png');save(load(ROOT/'unit/kael.png'),f'review/audit-{folder}/001.png')
    p=Image.new('RGBA',(390,170),NAVY);d=ImageDraw.Draw(p)
    for i,(name,path) in enumerate([('OLD portrait',OLD/'portrait/kael.png'),('NEW portrait',ROOT/'portrait/kael.png')]):
        if not path.exists():continue
        im=load(path).resize((40,40),Image.Resampling.LANCZOS);x=30+i*190
        p.alpha_composite(im,(x,25));p.alpha_composite(im.resize((80,80),Image.Resampling.NEAREST),(x,80));d.text((x,5),name,font=FONT,fill='white')
    save(p,'review/portraits-40.png')

def manifest(a):
    checks={'head_height':145<=a['head_height']<=160,'crown_to_sole':425<=a['crown_to_sole']<=445,
        'ratio':.33<=a['ratio']<=.37,'topknot_top':a['topknot_top_y']>=30,
        'topknot_height':30<=a['skull_crown_y']-a['topknot_top_y']<=45,
        'two_soles':len([r for r in a['foot_contact_y496']['runs'] if r[1]-r[0]>=2])==2,
        'bounds':a['bounds'][0]>0 and a['bounds'][2]<512 and a['bounds'][3]==497,
        'size':load(ROOT/'unit/kael.png').size==(512,512),'real_alpha':load(ROOT/'unit/kael.png').getchannel('A').getextrema()==(0,255)}
    checks.update(broad_silhouette=a['bounds'][2]-a['bounds'][0]>=400,
        portrait_size=(ROOT/'portrait/kael.png').exists() and load(ROOT/'portrait/kael.png').size==(512,512),
        required_audits=all((ROOT/f'review/audit-{n}.json').exists() for n in ('corin','garran')))
    files={}
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name in ('validation.json','SHA256SUMS') or '__pycache__' in p.parts:continue
        data=p.read_bytes();m={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
        if p.suffix.lower() in ('.png','.jpg','.webp'):
            with Image.open(p) as im:im.verify()
            im=load(p);m.update(decode=True,size=list(im.size),mode=im.mode,alpha_extrema=im.getchannel('A').getextrema(),bounds=bbox(im))
        files[str(p.relative_to(ROOT))]=m
    audits={}
    for name in ('corin','garran'):
        p=ROOT/f'review/audit-{name}.json'
        if p.exists():audits[name]=json.loads(p.read_text())
    inspection_path=ROOT/'review/visual-inspection.json'
    inspection=json.loads(inspection_path.read_text()) if inspection_path.exists() else {'performed':False}
    if inspection.get('performed'):
        for name,sha in inspection['reviewed_sha256'].items():
            assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==sha, 'Re-inspect changed artifact: '+name
    val={'package':'ART-CHAR-CLASS-NEW-003','base_commit':BASE,'owner_visual_approval':'pending','runtime_integrated':False,
        'anatomy':a,'checks':checks,'all_technical_checks_pass':all(checks.values()),
        'anatomy_audit':audits,'audit_caveat':'SIFT audit was designed for the same character across frames. Cross-character not-measured is not a pass; manual landmarks and visual review are separate evidence.',
        'reference_landmarks':{'corin':{'skull_crown_y':43,'chin_y':213,'head_height':171,'crown_to_sole':454,'ratio':round(171/454,6)},'garran':{'skull_crown_y':66,'chin_y':235,'head_height':170,'crown_to_sole':431,'ratio':round(170/431,6)}},
        'visual_inspection':inspection,'files':files}
    (ROOT/'validation.json').write_text(json.dumps(val,indent=2)+'\n')
    sums=[]
    for p in sorted(ROOT.rglob('*')):
        if p.is_file() and p.name!='SHA256SUMS' and '__pycache__' not in p.parts:sums.append(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT)}\n')
    (ROOT/'SHA256SUMS').write_text(''.join(sums))
    print(json.dumps({'anatomy':a,'checks':checks},indent=2))
    if not all(checks.values()):raise SystemExit('Technical checks failed')

if __name__=='__main__':
    a=unit()
    portrait=ROOT/'sources/kael-portrait-01.png'
    if portrait.exists():save(load(portrait).resize((512,512),Image.Resampling.LANCZOS),'portrait/kael.png')
    reviews(a);manifest(a)
