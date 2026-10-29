"""Mechanical atlas packing, edge normalization and review composition; no artwork synthesis.
Run: python package_assets.py TILE_SOURCE PROP_SOURCE
Requires Pillow and numpy. Sources are original built-in imagegen outputs.
"""
from pathlib import Path
import json, sys, re
import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).parent
ROOT = OUT.parents[1]
def save_json(name, value):
    (OUT/name).write_text(json.dumps(value, indent=2)+'\n', encoding='utf-8')
def cells(path, cols, rows):
    im = Image.open(path).convert('RGBA')
    return [im.crop((round(x*im.width/cols), round(y*im.height/rows), round((x+1)*im.width/cols), round((y+1)*im.height/rows))).resize((128,128), Image.Resampling.LANCZOS) for y in range(rows) for x in range(cols)]
def periodic(a):
    # Blend opposite boundary bands, retaining the original interior brushwork.
    a = a.copy()
    for axis in (0,1):
        b = np.swapaxes(a,0,axis)
        for k in range(10):
            weight = .5*(1-k/10)**2
            lo,hi=b[k].copy(), b[-1-k].copy()
            b[k]=lo*(1-weight)+hi*weight
            b[-1-k]=hi*(1-weight)+lo*weight
        a=np.swapaxes(b,0,axis)
    return a
raw=cells(sys.argv[1],4,3)
arr=[np.array(i.convert('RGB'),dtype=float) for i in raw[:11]]
for start in (0,4):
    group=arr[start:start+4]
    common=periodic(np.mean(group,axis=0))
    yy,xx=np.indices((128,128)); dist=np.minimum.reduce([xx,yy,127-xx,127-yy])
    weight=np.clip(dist/12,0,1)[...,None]
    for i in range(start,start+4): arr[i]=periodic(arr[i]*weight+common*(1-weight))
for i in range(8,11): arr[i]=periodic(arr[i])
tiles=[Image.fromarray(np.uint8(np.clip(a,0,255))).convert('RGBA') for a in arr]
names=[f'forest_{i}' for i in range(4)]+[f'grove_{i}' for i in range(4)]+['forest_wall_top','forest_wall_face','forest_wall_inner']
atlas=Image.new('RGBA',(512,384))
frames={}
for i,(name,im) in enumerate(zip(names,tiles)):
    x,y=i%4*128,i//4*128; atlas.paste(im,(x,y)); frames[name]={'x':x,'y':y,'w':128,'h':128}
atlas.save(OUT/'tiles_forest.png'); atlas.save(OUT/'tiles_forest.webp',lossless=True,method=6)
save_json('tiles_forest.json',frames)
props=cells(sys.argv[2],4,2)
propnames=['roots','thorn_arch','teal_fungus','fallen_log','lantern_moss','rift_touched_stump','fern_clump','stone_marker']
decor=Image.new('RGBA',(512,256)); df={}
for i,(name,p) in enumerate(zip(propnames,props)):
    box=p.getbbox(); assert box, name
    p=p.crop(box); p.thumbnail((112,112),Image.Resampling.LANCZOS)
    tile=Image.new('RGBA',(128,128)); tile.paste(p,((128-p.width)//2,124-p.height))
    props[i]=tile
    x,y=i%4*128,i//4*128; decor.paste(tile,(x,y)); df[name]={'x':x,'y':y,'w':128,'h':128,'anchor':{'x':.5,'y':1},'footY':124,'zone':'forest'}
decor.save(OUT/'decor_forest.png'); decor.save(OUT/'decor_forest.webp',lossless=True,method=6)
save_json('decor_forest.json',df)
# A camera crop of actual map-2 grid geometry, rendered at runtime's 390/6.5=60px.
source=(ROOT/'src/content/world/chapter-forest.ts').read_text(encoding='utf-8')
rows=re.findall(r"^\s*'([#,:GBCS]+)'", source, re.M)
assert len(rows)==14
preview=Image.new('RGBA',(390,844),(16,44,50,255))
ox,oy=-315,4
for y,row in enumerate(rows):
    for x,c in enumerate(row):
        wall=c=='#'
        if wall:
            idx=9 if y+1<len(rows) and rows[y+1][x]!='#' else 8 if any(0<=y+dy<len(rows) and 0<=x+dx<16 and rows[y+dy][x+dx]!='#' for dx,dy in [(1,0),(-1,0),(0,1)]) else 10
        else: idx=(x*13+y*7)%4+(4 if x<7 or x>10 else 0)
        pos=(ox+x*60,oy+y*60)
        preview.alpha_composite(tiles[idx].resize((60,60),Image.Resampling.LANCZOS),pos)
        if not wall and c==',' and (x*17+y*11)%9==0:
            p=props[(x+y*3)%8].resize((60,60),Image.Resampling.LANCZOS)
            preview.alpha_composite(p,pos)
# Grounded step hints and a neutral party-position ring, not regenerated character art.
d=ImageDraw.Draw(preview)
cx,cy=ox+8*60+30,oy+8*60+30
for dx,dy in [(0,-1),(1,0),(-1,0),(0,1)]:
    px,py=cx+dx*60,cy+dy*60
    d.rounded_rectangle((px-26,py-26,px+26,py+26),radius=10,outline=(116,212,207,150),width=1)
d.ellipse((cx-18,cy-10,cx+18,cy+14),fill=(16,44,50,180),outline=(230,220,184,255),width=3)
d.ellipse((cx-5,cy-4,cx+5,cy+6),fill=(116,212,207,255))
preview.convert('RGB').save(OUT/'preview.png')
# Mixed variant grid and wall strips at 128px plus props over both floor families.
review=Image.new('RGBA',(1024,768),(16,44,50,255))
for y in range(6):
    for x in range(8):
        idx=(x+y*3)%4+(4 if x>=4 else 0)
        if y==4: idx=8+x%3
        review.alpha_composite(tiles[idx],(x*128,y*128))
        if y==5: review.alpha_composite(props[x],(x*128,y*128))
review.convert('RGB').save(OUT/'seam_review.png')
report={'tileSize':128,'previewSize':list(preview.size),'runtimeTilePx':60,'tileFrames':len(frames),'decorFrames':len(df),'tiles':{},'decor':{}}
for name,t in zip(names,tiles):
    a=np.array(t); assert np.array_equal(a[0],a[-1]) and np.array_equal(a[:,0],a[:,-1]),name
    report['tiles'][name]={'oppositeEdgesExact':True,'meanLuma':round(float(np.mean(np.array(t.convert('RGB'))@np.array([.2126,.7152,.0722]))),2)}
for name,p in zip(propnames,props):
    a=np.array(p); assert a[:,:,3].min()==0 and a[:,:,3].max()>0
    assert not np.any(a[0,:,3]) and not np.any(a[-1,:,3]) and not np.any(a[:,0,3]) and not np.any(a[:,-1,3])
    report['decor'][name]={'transparentPadding':True,'bbox':list(p.getbbox())}
for start in (0,4):
    for a in tiles[start:start+4]:
        for b in tiles[start:start+4]:
            aa,bb=np.array(a),np.array(b)
            assert np.array_equal(aa[:,0],bb[:,-1]) and np.array_equal(aa[0],bb[-1])
for file in ('tiles_forest','decor_forest'):
    a=np.array(Image.open(OUT/(file+'.png')).convert('RGBA')); b=np.array(Image.open(OUT/(file+'.webp')).convert('RGBA'))
    assert np.array_equal(a[:,:,3],b[:,:,3]) and np.array_equal(a[a[:,:,3]>0],b[a[:,:,3]>0])
report['webpBytes']=sum((OUT/(n+'.webp')).stat().st_size for n in ['tiles_forest','decor_forest'])
save_json('validation.json',report)
print(json.dumps(report,indent=2))
