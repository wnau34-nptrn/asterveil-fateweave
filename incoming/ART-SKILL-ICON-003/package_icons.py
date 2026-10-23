"""Rebuild the C1 delivery from normalized PNGs; --normalize imports generated originals.

Usage: python package_icons.py [--normalize /path/to/generated_images]
Requires Pillow and numpy. Generated originals are identified by sources.json.
"""
import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
GROUPS = [
    ('Knight', ['guard', 'bash', 'rally', 'challenge', 'bulwark', 'rouse'], []),
    ('Duelist', ['mark', 'execute', 'finisher'], ['parry', 'lunge', 'sweep']),
    ('Mage', ['bolt', 'ward', 'sigil'], ['storm', 'aegis', 'dispel']),
    ('Priest', ['heal', 'prayer', 'sanctuary'], ['revive', 'halo', 'bless']),
    ('Spear', ['brace', 'pierce', 'spearwall'], ['hold', 'halt', 'warcry']),
    ('Archer', ['hinder', 'volley', 'weakshot'], ['disengage', 'pin', 'track']),
    ('Alchemist', ['acid', 'haste', 'bomb'], ['smoke', 'fury', 'catalyst']),
    ('Scout', ['ambush', 'evade', 'backstab'], ['knives', 'decoy', 'disarm']),
    ('Warden', ['taunt', 'slam', 'quake'], ['stonearmor', 'guardstone', 'tremor']),
    ('Bard', ['valor', 'mend', 'finale'], ['dread', 'note', 'solo']),
]
NEW = [skill for _, _, skills in GROUPS for skill in skills]


def enclosing_circle(points):
    # Convex hull, followed by an incremental minimum enclosing circle.
    points = sorted(set(points))
    def cross(o, a, b):
        return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    lower, upper = [], []
    for point in points:
        while len(lower)>1 and cross(lower[-2],lower[-1],point)<=0: lower.pop()
        lower.append(point)
    for point in reversed(points):
        while len(upper)>1 and cross(upper[-2],upper[-1],point)<=0: upper.pop()
        upper.append(point)
    import random
    hull=lower[:-1]+upper[:-1];random.Random(0).shuffle(hull)
    circle=None
    def outside(p,c): return c is None or math.hypot(p[0]-c[0],p[1]-c[1])>c[2]+1e-6
    for i,p in enumerate(hull):
        if not outside(p,circle): continue
        circle=(*p,0)
        for j,q in enumerate(hull[:i]):
            if not outside(q,circle): continue
            circle=((p[0]+q[0])/2,(p[1]+q[1])/2,math.dist(p,q)/2)
            for t in hull[:j]:
                if not outside(t,circle): continue
                ax,ay=p;bx,by=q;cx,cy=t
                d=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by))
                if abs(d)<1e-9: continue
                u=((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by))/d
                v=((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax))/d
                circle=(u,v,math.hypot(ax-u,ay-v))
    return circle


def normalize(path):
    im=Image.open(path).convert('RGBA')
    a=np.asarray(im).copy();a[a[:,:,3]<4]=0
    im=Image.fromarray(a)
    # Two boundary points per scanline suffice to enclose the entire alpha support.
    points=[]
    for y,row in enumerate(a[:,:,3]):
        x=np.flatnonzero(row)
        if x.size: points.extend([(int(x[0]),y),(int(x[-1]),y)])
    cx,cy,r=enclosing_circle(points)
    side=math.ceil(2*r+8)
    square=Image.new('RGBA',(side,side))
    square.alpha_composite(im,(round((side-1)/2-cx),round((side-1)/2-cy)))
    square=square.resize((220,220),Image.Resampling.LANCZOS)
    # A rigid orientation adjustment improves diagonal motifs' cell occupancy.
    # No anisotropic scaling, clipping, painting, or content synthesis.
    candidates=[]
    for angle in [0]+[sign*n for n in range(2,47,2) for sign in (-1,1)]:
        rotated=square.rotate(angle,Image.Resampling.BICUBIC)
        alpha=np.asarray(rotated)[:,:,3];y,x=np.where(alpha>=128)
        extent=max(x.max()-x.min()+1,y.max()-y.min()+1)
        candidates.append((extent,angle,rotated))
        if extent>=194: break
    extent,angle,im=max(candidates,key=lambda v:v[0]) if candidates[-1][0]<194 else candidates[-1]
    if extent>198:
        size=round(220*198/extent);im=im.resize((size,size),Image.Resampling.LANCZOS)
    out=Image.new('RGBA',(256,256))
    out.alpha_composite(im,((256-im.width)//2,(256-im.height)//2))
    a=np.asarray(out).copy();a[a[:,:,3]<4]=0
    return Image.fromarray(a)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--normalize', type=Path)
    args = parser.parse_args()
    (HERE / 'png').mkdir(exist_ok=True)
    if args.normalize:
        sources = json.loads((HERE / 'sources.json').read_text())
        for skill, filename in sources.items():
            normalize(args.normalize / filename).save(HERE / 'png' / f'{skill}.png')
    old_order = json.loads((HERE / 'original_order.json').read_text())
    assert len(old_order) == 34 and len(NEW) == 27
    icons = {s: Image.open(ROOT / 'incoming/ART-SKILL-ICON-001-R1/png' / f'{s}.png').convert('RGBA') for s in old_order if s != 'attack'}
    icons['attack'] = Image.open(ROOT / 'incoming/ART-SKILL-ICON-002/png/attack.png').convert('RGBA')
    for s in NEW:
        icons[s] = Image.open(HERE / 'png' / f'{s}.png').convert('RGBA')
    order = old_order + NEW
    atlas = Image.new('RGBA', (1536, 2816))
    bounds = {}
    for i, s in enumerate(order):
        im = icons[s]
        assert im.size == (256, 256), (s, im.size)
        atlas.alpha_composite(im, (i % 6 * 256, i // 6 * 256))
        if s in NEW:
            a = np.asarray(im)[:, :, 3]
            ys, xs = np.where(a > 0)
            oy, ox = np.where(a >= 128)
            radius = float(np.sqrt((xs - 127.5) ** 2 + (ys - 127.5) ** 2).max())
            extent = int(max(ox.max() - ox.min() + 1, oy.max() - oy.min() + 1))
            assert radius <= 112, (s, radius)
            assert 190 <= extent <= 205, (s, extent)
            assert a.min() == 0 and a.max() == 255
            bounds[s] = {'opaque_extent': extent, 'alpha_radius': round(radius, 2)}
    atlas.save(HERE / 'skills_atlas.webp', quality=85, method=6, exact=True)
    metadata = {'cell': 256, 'cols': 6, 'rows': 11, 'order': order}
    encoded = json.dumps(metadata, indent=2) + '\n'
    (HERE / 'skills_atlas.json').write_text(encoded)
    (ROOT / 'src/game/visuals/skill_icons.json').write_text(encoded)
    (ROOT / 'public/assets/ui/skill_icons.webp').write_bytes((HERE / 'skills_atlas.webp').read_bytes())
    (HERE / 'bounds.json').write_text(json.dumps(bounds, indent=2) + '\n')
    # Native output pixels: every size has its own normal/cooldown pair.
    preview = Image.new('RGB', (2710, 1460), '#0b1730')
    draw = ImageDraw.Draw(preview)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
    title = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 21)
    draw.text((20, 12), 'ART-SKILL-ICON-003 | existing + new | normal / 61% black cooldown | native pixel sizes', font=title, fill='#f2dfb4')
    for row, (name, old, new) in enumerate(GROUPS):
        y = 70 + row * 138
        draw.text((16, y + 28), name, font=title, fill='#f2dfb4')
        start = 165
        for size in (40, 56, 72):
            draw.text((start, y - 24), f'{size} px: N / CD', font=font, fill='#aebcd3')
            x = start
            for s in old + new:
                im = icons[s].resize((size, size), Image.Resampling.LANCZOS)
                for cooldown in (False, True):
                    tile = Image.new('RGBA', (size, size), '#0b1730')
                    tile.alpha_composite(im)
                    if cooldown:
                        tile.alpha_composite(Image.new('RGBA', tile.size, (0, 0, 0, 156)))
                    preview.paste(tile.convert('RGB'), (x, y))
                    x += size + 4
                draw.text((x - 2 * (size + 4), y + size + 5), s, font=font, fill='#69ddcb' if s in new else '#aebcd3')
                x += 9
            start += 6 * (2 * (size + 4) + 9) + 24
    preview.save(HERE / 'preview.png')
    print(json.dumps({'icons': len(order), 'size': atlas.size, 'webp_bytes': (HERE / 'skills_atlas.webp').stat().st_size, 'bounds': bounds}, indent=2))


if __name__ == '__main__':
    main()
