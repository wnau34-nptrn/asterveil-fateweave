"""Package original generated sprites; build review composites without modifying source art.
Usage: python tools/build.py common.png common_open.png rare.png rare_open.png ore.png ember.png seal.png
Requires Pillow; render_icons.cjs requires sharp. Run from repository root.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageCms
import json, sys, hashlib, subprocess

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parents[1]
NAMES=['chest_common','chest_common_open','chest_rare','chest_rare_open','item_ore','item_ember','item_seal']
ICC=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
PATHS={
 'chest':'<path d="M3 11V9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v11H3ZM3 11h18M7 6v14M17 6v14M10 11v4h4v-4"/>',
 'chest-open':'<path d="M4 9 6 3h12l2 6ZM3 13h18v7H3ZM7 13v7M17 13v7M10 13v3h4v-3"/>',
 'ore':'<path d="m9 7 3-4 4 5-3 12-5-4ZM8 9 5 7 2 12l6 6M16 10l3-3 3 5-7 6M9 7l4 3 3-2M13 10v10"/>',
 'ember':'<path d="M8 5c1 4-4 6-4 10a8 8 0 0 0 16 0c0-4-3-7-6-11 1 4-1 6-3 7M12 13c-3 3-4 6 0 7 4-1 3-4 0-7Z"/>',
 'seal':'<path d="m8 14-3 7 5-2 2 2 1-6M15 14l4 7 1-5 2-1-4-3"/><circle cx="12" cy="8" r="6"/><path d="M9 5c-3 5 5 6 6 3M15 5c3 5-5 6-6 3"/>',
 'pack':'<path d="M8 7V5a4 4 0 0 1 8 0v2M6 7h12l3 5v9H3v-9ZM6 7v5h12V7M8 16h8v5M12 11v3"/>',
 'star':'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
}
PATHS['star-filled']=PATHS['star'].replace('<path ','<path fill="currentColor" ')
for name,body in PATHS.items():
 (OUT/'icons'/f'{name}.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>\n')
star='m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z'
for name,fill in [('star_badge','#d9bf86'),('star_badge_empty','#14243a')]:
 (OUT/'icons'/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="{star}" fill="{fill}" stroke="#08121f" stroke-width="1.8" stroke-linejoin="round"/>'+(f'<path d="m9.2 8.7 2.8-5.7 2.8 5.7" fill="none" stroke="#f2d596" stroke-width="1" stroke-linejoin="round"/>' if name=='star_badge' else '<path d="m9.2 8.7 2.8-5.7 2.8 5.7" fill="none" stroke="#8d7855" stroke-width="1" stroke-linejoin="round"/>')+'</svg>\n')
if len(sys.argv)==1: sys.exit()
frames=[]
for i,(name,source) in enumerate(zip(NAMES,sys.argv[1:],strict=True)):
 im=Image.open(source).convert('RGBA')
 assert im.getextrema()[3][0]==0, 'Generated image must have real alpha'
 # Discard imperceptible alpha=1 generator speckles before computing the trim box.
 im.putalpha(im.getchannel('A').point(lambda a: 0 if a<=1 else a))
 box=im.getchannel('A').getbbox()
 im=im.crop(box)
 if i<4:
  # Equal horizontal footprint, shared physical ground baseline; no fabricated shadow.
  im.thumbnail((100,110),Image.Resampling.LANCZOS)
  im=im.crop(im.getchannel('A').getbbox())
  x=(128-im.width)//2; y=118-im.height
 else:
  im.thumbnail((100,104),Image.Resampling.LANCZOS)
  im=im.crop(im.getchannel('A').getbbox())
  x=(128-im.width)//2; y=(128-im.height)//2
 frame=Image.new('RGBA',(128,128)); frame.alpha_composite(im,(x,y))
 frame.save(OUT/('chests' if i<4 else 'items')/(name+'.png'),icc_profile=ICC)
 frames.append(frame)
for folder,start,count in [('chests',0,4),('items',4,3)]:
 atlas=Image.new('RGBA',(128*count,128)); mapping={}
 for j in range(count):
  atlas.alpha_composite(frames[start+j],(j*128,0))
  mapping[NAMES[start+j]]={'x':j*128,'y':0,'w':128,'h':128}
  if start==0: mapping[NAMES[j]]['footY']=118
 atlas.save(OUT/folder/(folder+'.webp'),quality=85,method=6,exact=True,icc_profile=ICC)
 (OUT/folder/(folder+'.json')).write_text(json.dumps(mapping,indent=2)+'\n')

# Text-free evidence: upper block 48px tiles, lower block 64px tiles.
tiles=Image.open(ROOT/'public/assets/world/tileset.webp').convert('RGBA')
decor=Image.open(ROOT/'public/assets/world/decor.webp').convert('RGBA')
camp=Image.open(ROOT/'public/assets/world/landmark_camp.webp').convert('RGBA')
sheet=Image.new('RGBA',(768,448),'#0d1c2e')
for row,size in enumerate([48,64]):
 y0=16+row*208
 for tx in range(12):
  for ty in range(3):
   tile=tiles.crop(((tx%4)*128,0,(tx%4+1)*128,128)).resize((size,size),Image.Resampling.LANCZOS)
   sheet.alpha_composite(tile,(tx*size,y0+ty*size))
 for j,frame in enumerate(frames[:4]):
  sheet.alpha_composite(frame.resize((size,size),Image.Resampling.LANCZOS),(size*(j*2+1),y0+size))
 sheet.alpha_composite(decor.crop((256,0,384,128)).resize((size,size),Image.Resampling.LANCZOS),(size*8,y0+size))
 sheet.alpha_composite(camp.resize((size*2,size*2),Image.Resampling.LANCZOS),(size*9,y0))
sheet.convert('RGB').save(OUT/'review/chests-on-map.png')
items=Image.new('RGBA',(768,400),'#0d1c2e')
for col,frame in enumerate(frames[4:]):
 x=40+col*240
 for y,size in [(16,128),(164,48),(232,32)]: items.alpha_composite(frame.resize((size,size),Image.Resampling.LANCZOS),(x,y))
# SVG thumbnails are rendered from the actual delivery SVGs by render_icons.cjs.
items.save(OUT/'review/items-base.png')
portrait=Image.open(ROOT/'public/assets/art/portraits.webp').convert('RGBA').crop((0,0,512,512)).resize((40,40),Image.Resampling.LANCZOS)
mask=Image.new('L',(40,40));ImageDraw.Draw(mask).ellipse((0,0,39,39),fill=255)
row=Image.new('RGBA',(240,72),'#0d1c2e');row.paste(portrait,(16,16),mask);row.save(OUT/'review/star-base.png')
hashes={str(p.relative_to(ROOT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'public/assets/world/tileset.webp',ROOT/'public/assets/world/decor.webp',ROOT/'public/assets/art/units.webp',ROOT/'public/assets/art/portraits.webp']}
(OUT/'tools/source-hashes.json').write_text(json.dumps(hashes,indent=2)+'\n')
