"""Mechanical image_gen atlas packing, SVG review rendering and contract validation.

No painting or changes to existing game files. Requires Pillow, NumPy, SciPy,
and CairoSVG for rendering the review-only SVG previews.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageCms
from scipy import ndimage
import numpy as np
import hashlib, json, subprocess, io, re
import xml.etree.ElementTree as ET

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
RAW=OUT/'provenance/generated'
ICC=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
RES=Image.Resampling.LANCZOS
BG='#0d1c2e'
GEAR=['weapon_guardian','weapon_tracer','weapon_weaver','weapon_healer','weapon_garran','weapon_mira','weapon_toma','weapon_sefa','weapon_brann','weapon_lio','gear_head','gear_body','gear_gloves','gear_boots','gear_charm']
SETS=['set_dawn','set_wind','set_shadow','set_thorn','set_starveil','set_mender']
POTIONS=['potion_salve','potion_tonic','potion_repel','item_dust','item_gold']
ICONS=['gear-weapon','gear-head','gear-body','gear-gloves','gear-boots','gear-charm','dust','potion-salve','potion-tonic','potion-repel','forge','enhance','fuse','reroll','salvage','brew','set','gold']
PROTECTED=['public/assets/world/items.webp','public/assets/world/chests.webp','public/assets/art/units.webp','public/assets/art/units_mercs.webp','public/assets/art/portraits.webp']

def save(im,path):
    im.save(OUT/path,icc_profile=ICC,**({'lossless':True,'method':6,'exact':True} if str(path).endswith('.webp') else {}))

def grid(im,cols,rows):
    return [im.crop((round(c*im.width/cols),round(r*im.height/rows),round((c+1)*im.width/cols),round((r+1)*im.height/rows))) for r in range(rows) for c in range(cols)]

def normalize(tile,maxdim=104):
    tile=tile.convert('RGBA');a=np.array(tile.getchannel('A'))
    labels,n=ndimage.label(a>=96)
    sizes=np.bincount(labels.ravel());sizes[0]=0
    keep=sizes>=max(12,sizes.max()*.001)
    mask=ndimage.binary_dilation(keep[labels],iterations=1)
    a[~mask]=0;a[a<40]=0;tile.putalpha(Image.fromarray(a))
    tile=tile.crop(tile.getbbox());ratio=min(maxdim/tile.width,maxdim/tile.height)
    tile=tile.resize((round(tile.width*ratio),round(tile.height*ratio)),RES)
    tile.putalpha(tile.getchannel('A').point(lambda v:0 if v<32 else v))
    tile=tile.crop(tile.getbbox())
    canvas=Image.new('RGBA',(128,128));canvas.alpha_composite(tile,((128-tile.width)//2,(128-tile.height)//2))
    return canvas

def pack(frames,ids,cols,path):
    atlas=Image.new('RGBA',(cols*128,((len(frames)+cols-1)//cols)*128));mapping={}
    for i,(id,frame) in enumerate(zip(ids,frames)):
        x=i%cols*128;y=i//cols*128
        atlas.alpha_composite(frame,(x,y));mapping[id]={'x':x,'y':y,'w':128,'h':128}
    save(atlas,path+'.png');save(atlas,path+'.webp')
    (OUT/(path+'.json')).write_text(json.dumps(mapping,indent=2)+'\n')

def build():
    source=Image.open(RAW/'gear.png')
    rows=[0,356,679,971]
    columns=[[0,345,675,1005,1336,1619],[0,335,670,990,1328,1619],[0,312,665,982,1336,1619]]
    # Source generations have nonuniform gutters; these cuts preserve complete objects.
    cuts=[source.crop((columns[r][c],rows[r],columns[r][c+1],rows[r+1])) for r in range(3) for c in range(5)]
    pack([normalize(c) for c in cuts],GEAR,5,'items/gear_items')
    pack([normalize(c,112) for c in grid(Image.open(RAW/'emblems.png'),3,2)],SETS,6,'emblems/set_emblems')
    consumables=[normalize(c,96 if i==0 else 108) for i,c in enumerate(grid(Image.open(RAW/'potions.png'),2,2))]
    consumables.append(normalize(Image.open(RAW/'gold.png'),104))
    pack(consumables,POTIONS,5,'items/potion_items')

def frames(path,cols,rows):return grid(Image.open(OUT/path).convert('RGBA'),cols,rows)

def svg_preview(name,size):
    import cairosvg
    svg=(OUT/'icons'/f'{name}.svg').read_text().replace('stroke="currentColor"','stroke="#f4f7fc"')
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(),output_width=size,output_height=size))).convert('RGBA')

def review_actor(im):
    # Remove tiny disconnected adjacent-cell crumbs in review copies only.
    a=np.array(im.getchannel('A'));labels,n=ndimage.label(a>=32)
    sizes=np.bincount(labels.ravel());sizes[0]=0
    keep=sizes>=sizes.max()*.002
    for i,box in enumerate(ndimage.find_objects(labels),1):
        if box and box[0].start<8 and sizes[i]<sizes.max()*.02:keep[i]=False
    mask=ndimage.binary_dilation(keep[labels],iterations=1)
    a[~mask]=0;im.putalpha(Image.fromarray(a))
    return im

def reviews():
    gear=frames('items/gear_items.webp',5,3)
    potions=frames('items/potion_items.webp',5,1)
    emblems=frames('emblems/set_emblems.webp',6,1)
    all_items=gear+emblems+potions
    # Each painted tile has an unscaled 128, 56 and 32 px sample. No labels.
    paint_rows=(len(all_items)+4)//5
    sheet=Image.new('RGBA',(5*256,paint_rows*156+3*62),BG)
    for i,im in enumerate(all_items):
        x=i%5*256;y=i//5*156
        for size,dx,dy in [(128,0,12),(56,132,48),(32,196,60)]:sheet.alpha_composite(im.resize((size,size),RES),(x+dx,y+dy))
    for i,name in enumerate(ICONS):
        x=i%6*206+24;y=paint_rows*156+i//6*62+16
        sheet.alpha_composite(svg_preview(name,24),(x,y));sheet.alpha_composite(svg_preview(name,15),(x+45,y+5))
    save(sheet,'review/items-sizes.png')
    # Review-only code-style rarity outlines. No frames are exported with items.
    mock=Image.new('RGBA',(5*88+32,3*88+32),BG)
    from PIL import ImageDraw
    draw=ImageDraw.Draw(mock)
    for r,im in enumerate([gear[0],gear[11],potions[0]]):
        for c,color in enumerate(['#b9c8d8','#7fd99a','#6fb7ff','#c79bff','#f2b84b']):
            x=24+c*88;y=24+r*88
            draw.rounded_rectangle((x-3,y-3,x+50,y+50),radius=5,outline=color,width=2)
            mock.alpha_composite(im.resize((48,48),RES),(x,y))
            mock.alpha_composite(emblems[(r+c)%6].resize((18,18),RES),(x+34,y+34))
    save(mock,'review/rarity-mock.png')
    grey=Image.new('RGBA',((len(potions)+len(emblems))*88+24,104),BG)
    for i,im in enumerate(potions+emblems):
        for size,dy in [(32,8),(16,64)]:
            tile=im.resize((size,size),RES);a=tile.getchannel('A');tile=ImageOps.grayscale(tile).convert('RGBA');tile.putalpha(a)
            grey.alpha_composite(tile,(i*88+12+(32-size)//2,dy))
    save(grey,'review/greyscale.png')
    units=Image.open(ROOT/'public/assets/art/units.webp').convert('RGBA')
    mercs=Image.open(ROOT/'public/assets/art/units_mercs.webp').convert('RGBA')
    actors=[review_actor(im) for im in grid(units,2,3)[:4]+grid(mercs,2,3)]
    # Correct class order in source atlases: guardian, tracer, weaver, healer;
    # Garran, Mira, Toma, Sefa, Brann, Lio.
    versus=Image.new('RGBA',(5*352,2*264),BG)
    for i,(weapon,actor) in enumerate(zip(gear[:10],actors)):
        x=i%5*352;y=i//5*264
        versus.alpha_composite(actor.resize((240,240),RES),(x,y+12))
        versus.alpha_composite(weapon,(x+224,y+44))
        versus.alpha_composite(weapon.resize((32,32),RES),(x+272,y+188))
    save(versus,'review/weapons-vs-units.png')

def validate():
    contracts=[('items/gear_items',GEAR,5,3,6),('items/potion_items',POTIONS,5,1,6),('emblems/set_emblems',SETS,6,1,6)]
    images={}
    for path,ids,cols,rows,pad in contracts:
        im=Image.open(OUT/(path+'.webp'))
        assert im.size==(cols*128,rows*128) and im.mode=='RGBA'
        assert im.info.get('icc_profile')
        mapping=json.loads((OUT/(path+'.json')).read_text());assert list(mapping)==ids
        boxes=[]
        for i,frame in enumerate(grid(im,cols,rows)):
            box=frame.getbbox();assert box and min(box[0],box[1],128-box[2],128-box[3])>=pad,(ids[i],box)
            assert mapping[ids[i]]=={'x':i%cols*128,'y':i//cols*128,'w':128,'h':128}
            assert frame.getchannel('A').getextrema()==(0,255)
            boxes.append(list(box))
        png=Image.open(OUT/(path+'.png')).convert('RGBA');assert png.tobytes()==im.tobytes()
        images[path+'.webp']={'bytes':(OUT/(path+'.webp')).stat().st_size,'size':list(im.size),'alpha_bounds':boxes}
    actual=sorted(p.stem for p in (OUT/'icons').glob('*.svg'));assert actual==sorted(ICONS)
    for name in ICONS:
        p=OUT/'icons'/f'{name}.svg';svg=p.read_text();root=ET.fromstring(svg)
        for k,v in {'viewBox':'0 0 24 24','fill':'none','stroke':'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round'}.items():assert root.attrib[k]==v,(name,k)
        assert not re.search(r'#[0-9a-fA-F]{3,8}|<text|<image|<script|href=|rgb\(',svg)
        assert all(el.tag.split('}')[-1] in ['svg','path','circle','ellipse','line','polyline','polygon','rect'] for el in root.iter())
        for size in [15,24]:assert svg_preview(name,size).getbbox()
    files=list(OUT.rglob('*.webp'))+list((OUT/'icons').glob('*.svg'))
    assert len(files)==21
    total=sum(p.stat().st_size for p in files);assert total<=600000,total
    hashes={}
    for path in PROTECTED:
        digest=hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
        assert digest==hashlib.sha256(subprocess.check_output(['git','show','HEAD:'+path],cwd=ROOT)).hexdigest(),path
        hashes[path]=digest
    report={'base_commit':'8ba23cd5b5bb1cd3602ba98f620eb598a5995a12','runtime_bytes':total,'runtime_files':21,'svg_count':18,'painted_frames':26,'images':images,'protected_sha256':hashes}
    (OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'runtime_bytes':total,'files':21,'painted_frames':26,'icons':18,'protected_hashes_unchanged':True}))

if __name__=='__main__':
    import sys
    if '--validate' not in sys.argv:build();reviews()
    validate()
