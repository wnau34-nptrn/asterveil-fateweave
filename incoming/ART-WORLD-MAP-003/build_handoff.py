#!/usr/bin/env python3
"""Rebuild only this intake. Python 3 + Pillow + numpy + Shapely, no network."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageCms, ImageEnhance
from shapely.geometry import Polygon, Point, box
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent
SIZE = (1080, 3000)
RECT = (60, 1900, 432, 936)
PROFILE = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()


def write_json(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def rgb(path, size=None):
    im = Image.open(ROOT / path).convert('RGB')
    return im.resize(size, Image.Resampling.LANCZOS) if size else im


def build():
    # Minimum-error seams avoid double landmarks caused by wide crossfades.
    master = Image.new('RGB', (2160,6000))
    master.paste(rgb('raw/panel_1.png',(2160,2400)))
    for i,y in ((2,1800),(3,3600)):
        panel=rgb(f'raw/panel_{i}.png',(2160,2400))
        a=np.asarray(master.crop((0,y,2160,y+600)),dtype=np.float32)
        b=np.asarray(panel.crop((0,0,2160,600)),dtype=np.float32)
        cost=np.mean((a-b)**2,axis=2)
        # Keep the seam away from the first/last 40 overlap pixels.
        cost[:40]+=1e6; cost[-40:]+=1e6
        dp=cost[:,0].copy(); back=np.zeros((600,2160),dtype=np.int16)
        for col in range(1,2160):
            options=np.stack([np.r_[np.inf,dp[:-1]],dp,np.r_[dp[1:],np.inf]])
            choice=np.argmin(options,axis=0)
            back[:,col]=np.arange(600)+choice-1
            dp=cost[:,col]+np.min(options,axis=0)
        seam=np.zeros(2160,dtype=np.int16); seam[-1]=np.argmin(dp)
        for col in range(2159,0,-1): seam[col-1]=back[seam[col],col]
        yy=np.arange(600)[:,None]
        alpha=np.clip((yy-seam[None,:]+8)/16,0,1)[:,:,None]
        mixed=np.rint(a*(1-alpha)+b*alpha).astype('uint8')
        master.paste(panel,(0,y)); master.paste(Image.fromarray(mixed),(0,y))
    master=ImageEnhance.Color(master).enhance(.86)
    # The source is always restored LAST, without repainting or colour changes.
    x, y, w, h = RECT
    source = rgb('seeds/region_ch1.webp')
    # Deterministic outside-only edge collar; no hand-painted seam repair.
    ref=source.resize((w*2,h*2),Image.Resampling.LANCZOS)
    collar=48
    edge=np.pad(np.asarray(ref),((collar,collar),(collar,collar),(0,0)),mode='edge')
    yy,xx=np.mgrid[-collar:h*2+collar,-collar:w*2+collar]
    distance=np.maximum.reduce([np.maximum(-xx,0),np.maximum(xx-w*2+1,0),np.maximum(-yy,0),np.maximum(yy-h*2+1,0)])
    mask=Image.fromarray(np.rint(np.clip(1-distance/collar,0,1)*255).astype('uint8'))
    master.paste(Image.fromarray(edge),(x*2-collar,y*2-collar),mask)
    master.paste(ref, (x*2, y*2))
    master.save(ROOT / 'world_map.png', icc_profile=PROFILE)
    game = master.resize(SIZE, Image.Resampling.LANCZOS)
    exact = source.resize((w, h), Image.Resampling.LANCZOS)
    game.paste(exact, (x, y))
    game.save(ROOT / 'world_map.webp', quality=90, method=6, icc_profile=PROFILE)
    master.save(ROOT / 'world_map_2x.webp', quality=88, method=6, icc_profile=PROFILE)
    if (ROOT / 'world_map_2x.webp').stat().st_size > 3_500_000:
        (ROOT / 'world_map_2x.webp').unlink()

    # A shared-edge partition covers the entire canvas (including decorative sea).
    # Shared boundaries have zero area; polygon interiors never overlap.
    polygons = [
        [[0,1870],[180,1840],[360,1860],[540,1830],[570,2200],[540,2600],[570,3000],[0,3000],[0,1870]],
        [[0,550],[540,550],[540,1050],[580,1250],[0,1250],[0,550]],
        [[0,0],[1080,0],[1080,550],[540,550],[0,550],[0,0]],
        [[540,550],[1080,550],[1080,1500],[650,1500],[580,1250],[540,1050],[540,550]],
        [[650,1500],[1080,1500],[1080,3000],[570,3000],[540,2600],[570,2200],[540,1830],[650,1500]],
        [[0,1250],[580,1250],[650,1500],[540,1830],[360,1860],[180,1840],[0,1870],[0,1250]],
    ]
    anchors = [[276,2380],[280,790],[630,400],[890,900],[815,2020],[565,1320]]
    regions = [dict(id=i+1, polygon=p, anchor=anchors[i]) for i,p in enumerate(polygons)]
    shapes=[Polygon(p) for p in polygons]
    assert all(p.is_valid and p.area>0 for p in shapes)
    assert all(shapes[i].intersection(shapes[j]).area==0 for i in range(6) for j in range(i))
    assert unary_union(shapes).equals(box(0,0,*SIZE))
    assert shapes[0].covers(box(x,y,x+w,y+h))
    assert all(p.covers(Point(a)) for p,a in zip(shapes,anchors))
    write_json('world_map.json', dict(size=SIZE, region_rect=dict(x=x,y=y,w=w,h=h), regions=regions))

    # Original generated cloud texture reused from the chapter-1 intake.
    cloud = Image.open(ROOT/'seeds/region_ch1_fog.webp').convert('RGBA').resize(SIZE, Image.Resampling.LANCZOS)
    ca = np.asarray(cloud, dtype=np.float32)
    # Dense pearl-blue backing inside the layer itself: details become silhouettes.
    a = (200 + ca[:,:,3] * (28/255)).clip(0, 228).astype('uint8')
    clear = Image.new('L', SIZE, 0)
    ImageDraw.Draw(clear).polygon(polygons[0], fill=255)
    soft = clear.resize((270,750),Image.Resampling.NEAREST).filter(ImageFilter.MaxFilter(21)).resize(SIZE,Image.Resampling.BILINEAR).filter(ImageFilter.GaussianBlur(28))
    a = np.rint(a * (1 - np.asarray(soft)/255)).astype('uint8')
    # Region 1 and its complete rectangular source are entirely clear.
    a[np.asarray(clear) > 0] = 0
    color = np.empty((3000,1080,4), dtype='uint8')
    for channel, base in enumerate((161,183,196)):
        color[:,:,channel] = (base + ca[:,:,channel] * .18).clip(0,255)
    color[:,:,3] = a
    fog = Image.fromarray(color, 'RGBA')
    fog.save(ROOT/'world_map_fog.webp', quality=86, method=6, exact=True)

    for name, im in [('preview_390.png',game), ('preview_fog_390.png',Image.alpha_composite(game.convert('RGBA'),fog).convert('RGB'))]:
        phone = im.resize((390,1083), Image.Resampling.LANCZOS)
        sheet = Image.new('RGB',(1170,844))
        for j, top in enumerate((0,120,239)):
            sheet.paste(phone.crop((0,top,390,top+844)),(j*390,0))
        sheet.save(ROOT/name,icc_profile=PROFILE)
    overlay = game.convert('RGBA')
    draw = ImageDraw.Draw(overlay)
    for r,c in zip(regions,('#62efad','#83ccff','#f3cd6c','#e69a9f','#76e4e7','#eeeee4')):
        draw.line([tuple(p) for p in r['polygon']],fill=c,width=4)
        ax,ay=r['anchor']; draw.ellipse((ax-9,ay-9,ax+9,ay+9),fill=c)
        draw.text((ax+12,ay),str(r['id']),fill='white',stroke_width=2,stroke_fill='black')
    overlay.convert('RGB').resize((540,1500),Image.Resampling.LANCZOS).save(ROOT/'regions_overlay.png')
    crop = game.crop((x,y,x+w,y+h))
    match = Image.new('RGB',(w*3,h))
    match.paste(crop,(0,0)); match.paste(exact,(w,0)); match.paste(Image.blend(crop,exact,.5),(w*2,0))
    match.save(ROOT/'match_region1.png')

    geometry = json.loads((ROOT/'seeds/region_ch1.json').read_text())
    assert len(geometry['nodes'])==10 and len(geometry['route'])==9
    nodes={p['id']:p for p in geometry['nodes']}
    for route in geometry['route']:
        for node_id,p in ((route['from'],route['points'][0]),(route['to'],route['points'][-1])):
            assert (p['x'],p['y'])==(nodes[node_id]['x'],nodes[node_id]['y'])
    def point(p):
        return dict(x=x+p['x']*.4,y=y+p['y']*.4)
    write_json('region1_world_geometry.json',dict(scale=.4, nodes=[dict(id=p['id'],**point(p)) for p in geometry['nodes']],route=[dict(from_id=r['from'],to_id=r['to'],points=[point(p) for p in r['points']]) for r in geometry['route']]))
    validate(game, exact)


def validate(game, exact):
    x,y,w,h=RECT
    assert np.array_equal(np.asarray(game.crop((x,y,x+w,y+h))),np.asarray(exact))
    budgets={'world_map.webp':1_600_000,'world_map_fog.webp':600_000,'world_map_2x.webp':3_500_000}
    files={}
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name in ('validation.json','SHA256SUMS') or '__pycache__' in p.parts:
            continue
        data=p.read_bytes(); info=dict(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
        if p.suffix.lower() in ('.png','.webp'):
            with Image.open(p) as im:
                im.load(); info.update(size=list(im.size),mode=im.mode)
                if im.mode=='RGBA': info['alpha_range']=list(im.getchannel('A').getextrema())
        if p.name in budgets:
            assert len(data)<=budgets[p.name], f'{p.name}: {len(data)} exceeds budget'
        files[str(p.relative_to(ROOT))]=info
    encoded=np.asarray(rgb('world_map.webp').crop((x,y,x+w,y+h)),dtype=np.float32)
    mae=float(np.abs(encoded-np.asarray(exact,dtype=np.float32)).mean())
    assert mae<6
    write_json('validation.json',dict(files=files, checks=dict(region1_pre_encode_rgb_exact=True,region1_webp_mean_absolute_rgb_error=mae,region1_geometry_error_px=0,source_node_count=10,source_route_count=9,polygon_count=6,polygon_intersection_area_px2=0,polygon_union_area_px2=3240000,polygon_partition='Shapely valid polygons, disjoint interiors, full canvas union, anchors and source rectangle contained',runtime_integration=False,owner_approval=False), dependencies=dict(Pillow=Image.__version__,numpy=np.__version__)))
    entries=[]
    for p in sorted(ROOT.rglob('*')):
        if p.is_file() and p.name!='SHA256SUMS' and '__pycache__' not in p.parts:
            entries.append(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT)}')
    (ROOT/'SHA256SUMS').write_text('\n'.join(entries)+'\n')


if __name__=='__main__':
    build()
