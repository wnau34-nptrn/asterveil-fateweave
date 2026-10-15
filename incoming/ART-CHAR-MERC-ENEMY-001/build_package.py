"""Deterministic format export and review composition; no generated drawing here.
Run with Python + Pillow: build_package.py --source-dir <selected imagegen PNG folder>.
Writes exclusively inside this package. Original repository art is read-only.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageCms
import argparse, hashlib, json, subprocess

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
BASE = 'e6dfc92415f2b9bbd76ae0257e30b307c13cecf5'
ICC = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
RESAMPLE = Image.Resampling.LANCZOS
FOOT = 496
PALETTES = ['teal #348f91 / silver / leather','forest #345b3c / charcoal / auburn','brass #b78c48 / amber #e5a63c','steel blue #617f9e / charcoal','stone #899098 / gold #d9bf86','coral #ed927f / charcoal','moss #718746 / brown','mint #a6dfce / ivory','teal #397e77 / olive','teal #427f87 / ivory / mint','slate #494358 / violet #9454d6','indigo #343c70 / violet','teal #397e77 / olive / gold tips','slate / violet / gold banding','pale stone #e4dfcf / gold / violet']
DESCRIPTIONS = ['Garran: tanned broad spear vanguard, short dark hair, teal scale tabard, leaf spear, round buckler','Mira: lean auburn braid, forest hood, longbow, white-fletched arrows','Toma: glasses, goggles, brass vial satchel, apron, amber potion','Sefa: silver-blue short hair, steel blue scarf, dark leather, two daggers, crouch','Brann: broad bearded stone-armored warden, gold trim, two-handed hammer','Lio: curly dark hair, coral layered coat, lute and compact floating notes','Mossback Tusker: brown boar, moss back, flower sprigs, small ivory tusks','Dandelion Sprite: floating ivory seed puff, mint core, leaf body','Briar Stalker: teal olive lynx, thorn spines, teal eyes','Hollow Mycon: teal mushroom cap hood, mint eyes, spore staff','Shard Golem: chunky slate fists, violet crystals, glowing eyes','Rift Weaver: rounded indigo cloth hood, dark ceramic mask, violet core, geometric ribbons','Thorn Matriarch: mint hair, fully covered bark leaf armor, thorn crown with gold tips','Crystal Juggernaut: violet crystal beetle-rhino, gold horn and shell banding','Veilbound Sentinel: pale stone gold guardian, violet cracks, halberd, floating sigil ring']

def dump(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')

def sha(data):
    return hashlib.sha256(data).hexdigest()

def savepng(im, path):
    im.save(path, optimize=True, icc_profile=ICC)

def small_components(im):
    # Remove only disconnected specks <= 3 pixels; keep intentional notes and gems.
    a = im.getchannel('A'); pixels = a.load(); seen = set(); w,h = im.size
    for y in range(h):
        for x in range(w):
            if not pixels[x,y] or (x,y) in seen: continue
            stack=[(x,y)]; seen.add((x,y)); component=[]
            while stack:
                px,py=stack.pop(); component.append((px,py))
                for ny in range(max(0,py-1),min(h,py+2)):
                    for nx in range(max(0,px-1),min(w,px+2)):
                        if pixels[nx,ny] and (nx,ny) not in seen:
                            seen.add((nx,ny)); stack.append((nx,ny))
            if len(component)<=3:
                for point in component: pixels[point]=0
    im.putalpha(a)
    return im

def normalize(source, ident):
    im=Image.open(source).convert('RGBA')
    # Hard body matte at source resolution removes low-alpha generated glow fringe.
    im.putalpha(im.getchannel('A').point(lambda p:255 if p>=224 else 0))
    im=im.crop(im.getbbox())
    height=460
    if ident=='foe_sprite': height=300
    elif ident in ('foe_golem','foe_juggernaut','foe_matriarch'): height=480
    elif ident=='foe_sentinel': height=492
    elif ident in ('foe_tusker','foe_stalker'): height=440
    scale=min(height/im.height, (504 if ident=='foe_sentinel' else 496)/im.width)
    im=im.resize((round(im.width*scale),round(im.height*scale)),RESAMPLE)
    im=small_components(im)
    frame=Image.new('RGBA',(512,512))
    frame.alpha_composite(im,((512-im.width)//2,FOOT+1-im.height))
    return frame

def original_frames():
    im=Image.open(REPO/'public/assets/art/units.webp').convert('RGBA')
    return [im.crop((i%2*512,i//2*512,i%2*512+512,i//2*512+512)) for i in range(6)]

def put_ground(canvas, frame, center, baseline, scale):
    unit=frame.resize((round(512*scale),round(512*scale)),RESAMPLE)
    canvas.alpha_composite(unit,(round(center-unit.width/2),round(baseline-FOOT*scale)))

def reviews(bodies, portraits):
    orig=original_frames()
    for group, frames in [('mercs',orig[:4]+bodies[:6]),('foes',orig[4:]+bodies[6:])]:
        out=Image.new('RGBA',(len(frames)*256,300),'#c9c9c6')
        for i,frame in enumerate(frames): put_ground(out,frame,128+i*256,278,.5)
        savepng(out.convert('RGB'),ROOT/'review'/f'lineup-{group}.png')
    # All 15 new silhouettes, then the six existing silhouettes; exactly 64px tall.
    out=Image.new('RGB',(7*96,3*88),'#e4e4df')
    for i,frame in enumerate(bodies+orig):
        mask=frame.getchannel('A').point(lambda p:255 if p>=128 else 0)
        mask=mask.crop(mask.getbbox()); mask=mask.resize((round(mask.width*64/mask.height),64),RESAMPLE)
        out.paste((0,0,0),(i%7*96+(96-mask.width)//2,i//7*88+12),mask)
    savepng(out,ROOT/'review/silhouettes.png')
    out=Image.open(REPO/'public/assets/art/ruins.webp').convert('RGBA')
    # 2 existing heroes + 2 mercs vs 2 new foes; back actors first, ground depth last.
    for frame,x,y,s in [(orig[2],240,775,.53),(bodies[1],480,790,.55),(orig[0],335,900,.59),(bodies[0],630,918,.59),(bodies[9],1040,792,.65),(bodies[14],1260,925,.78)]: put_ground(out,frame,x,y,s)
    savepng(out.convert('RGB'),ROOT/'review/in-arena.png')
    tiles=Image.open(REPO/'public/assets/world/tileset.webp').convert('RGBA')
    out=Image.new('RGBA',(768,384))
    for row in range(3):
        for col in range(6):
            zone=1 if col<2 else 2 if col<4 else 3
            tile=tiles.crop(((col%2)*128,zone*128,(col%2+1)*128,(zone+1)*128))
            out.alpha_composite(tile,(col*128,row*128))
    for idx,x in [(12,128),(13,384),(14,640)]: put_ground(out,bodies[idx],x,295,192/512)
    savepng(out.convert('RGB'),ROOT/'review/on-map.png')
    # Extra QA: real 40px circular portraits, followed by 160px units on light/dark.
    out=Image.new('RGB',(15*64,64),'#192638'); circle=Image.new('L',(40,40)); ImageDraw.Draw(circle).ellipse((0,0,39,39),fill=255)
    for i,p in enumerate(portraits): out.paste(p.resize((40,40),RESAMPLE),(i*64+12,12),circle)
    savepng(out,ROOT/'review/portraits-40px.png')
    out=Image.new('RGBA',(5*192,3*192),'#f0efe8')
    for i,b in enumerate(bodies):
        if i%2: ImageDraw.Draw(out).rectangle((i%5*192,i//5*192,i%5*192+191,i//5*192+191),fill='#122033')
        put_ground(out,b,96+i%5*192,180+i//5*192,160/512)
    savepng(out.convert('RGB'),ROOT/'review/gameplay-160px.png')

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--source-dir',type=Path,required=True); args=parser.parse_args()
    entries=json.loads((ROOT/'provenance/selected-sources.json').read_text())
    for d in ('mercs','foes','atlas','review'): (ROOT/d).mkdir(exist_ok=True)
    bodies=[]; portraits=[]; record=[]
    originals={p.relative_to(REPO).as_posix():sha(p.read_bytes()) for folder in ('public/assets/art','public/assets/world') for p in (REPO/folder).glob('*.webp')}
    for index,e in enumerate(entries):
        ident=e['id']; folder=ROOT/('mercs' if index<6 else 'foes')
        source=args.source_dir/e['body']; psource=args.source_dir/e['portrait']
        body=normalize(source,ident); portrait=Image.open(psource).convert('RGB').resize((512,512),RESAMPLE)
        savepng(body,folder/f'{ident}.png'); savepng(portrait,folder/f'portrait_{ident}.png')
        bodies.append(body); portraits.append(portrait)
        record.append(dict(id=ident,footY=FOOT,bounds=list(body.getbbox()),facing='right' if index<6 else 'left',palette=PALETTES[index],description=DESCRIPTIONS[index],body_source=e['body'],body_source_sha256=sha(source.read_bytes()),portrait_source=e['portrait'],portrait_source_sha256=sha(psource.read_bytes())))
    def runtime_color(im, detail):
        # Supersampled output grid remains 512px; remove sub-gameplay-size texture.
        color=im.convert('RGB').resize((detail,detail),RESAMPLE).resize((512,512),RESAMPLE)
        if im.mode=='RGBA': color.putalpha(im.getchannel('A'))
        return color
    def encode(quality, detail):
        runtime_bodies=[runtime_color(b,detail) for b in bodies]
        runtime_portraits=[runtime_color(p,detail) for p in portraits]
        for index,e in enumerate(entries):
            folder=ROOT/('mercs' if index<6 else 'foes'); ident=e['id']
            runtime_bodies[index].save(folder/f'{ident}.webp',quality=quality,method=4,icc_profile=ICC)
            runtime_portraits[index].save(folder/f'portrait_{ident}.webp',quality=quality,method=4,icc_profile=ICC)
        for group,start,end,rows in [('mercs',0,6,3),('foes',6,15,5)]:
            for kind,frames in [('units',runtime_bodies),('portraits',runtime_portraits)]:
                atlas=Image.new('RGBA',(1024,rows*512))
                mapping={}
                for offset,index in enumerate(range(start,end)):
                    x=offset%2*512;y=offset//2*512
                    atlas.paste(frames[index],(x,y))
                    mapping[entries[index]['id']]=dict(x=x,y=y,w=512,h=512,footY=FOOT)
                atlas.save(ROOT/'atlas'/f'{kind}_{group}.webp',quality=quality,method=4,icc_profile=ICC)
                dump(ROOT/'atlas'/f'{kind}_{group}.json',mapping)
    quality=65; detail=256; encode(quality,detail)
    total=lambda:sum(p.stat().st_size for p in ROOT.rglob('*.webp'))
    while total()>2_000_000 and quality>30:
        quality-=5; encode(quality,detail)
    assert total()<=2_000_000, f'Budget exceeded: {total()}'
    runtime_bodies=[Image.open(ROOT/('mercs' if i<6 else 'foes')/f'{e["id"]}.webp').convert('RGBA') for i,e in enumerate(entries)]
    runtime_portraits=[Image.open(ROOT/('mercs' if i<6 else 'foes')/f'portrait_{e["id"]}.webp').convert('RGB') for i,e in enumerate(entries)]
    reviews(runtime_bodies,runtime_portraits)
    for path,digest in originals.items():
        assert sha((REPO/path).read_bytes())==digest
        baseline=subprocess.run(['git','show',f'{BASE}:{path}'],cwd=REPO,check=True,stdout=subprocess.PIPE).stdout
        assert sha(baseline)==digest, path
    for index,e in enumerate(entries):
        ident=e['id']; folder=ROOT/('mercs' if index<6 else 'foes')
        for ext in ('png','webp'):
            b=Image.open(folder/f'{ident}.{ext}');p=Image.open(folder/f'portrait_{ident}.{ext}')
            assert b.size==p.size==(512,512) and b.mode=='RGBA' and p.mode=='RGB'
            bounds=b.getbbox();padding=4 if ident=='foe_sentinel' else 8
            assert bounds[0]>=padding and bounds[1]>=padding and bounds[2]<=512-padding and bounds[3]==497, (ident,bounds)
        assert Image.open(folder/f'{ident}.png').getchannel('A').tobytes()==Image.open(folder/f'{ident}.webp').getchannel('A').tobytes()
    for group,size in [('mercs',(1024,1536)),('foes',(1024,2560))]:
        for kind in ('units','portraits'):
            atlas=Image.open(ROOT/'atlas'/f'{kind}_{group}.webp')
            assert atlas.size==size
            if group=='foes': assert atlas.crop((512,2048,1024,2560)).getbbox() is None
    dump(ROOT/'provenance/manifest.json',dict(base_commit=BASE,generator='built-in image_gen; original Asterveil concepts; no external artwork',webp_quality=quality,runtime_color_detail_grid=detail,runtime_bytes=total(),characters=record,unchanged_original_sha256=originals))
    dump(ROOT/'provenance/validation.json',dict(full_body_png=15,full_body_webp=15,portraits_png=15,portraits_webp=15,atlases=4,frame_maps=4,footY=FOOT,dimensions_and_modes='PASS',padding='PASS',alpha_matches_png_webp='PASS',last_foe_slots_empty='PASS',original_hashes_match_git_base='PASS',runtime_bytes=total(),budget_bytes=2_000_000))
    print(json.dumps(dict(runtime_bytes=total(),quality=quality,detail_grid=detail,hashes=len(originals),files=len(list(ROOT.rglob('*.*'))))))

if __name__=='__main__': main()
