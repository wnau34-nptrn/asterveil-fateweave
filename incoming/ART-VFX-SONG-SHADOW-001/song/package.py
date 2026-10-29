"""Rebuild art intake only: python incoming/ART-VFX-SONG-SHADOW-001/song/package.py.

Requires Pillow. Sources stay byte-identical. No runtime assets are written.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
BEATS = ('prepare', 'peak', 'settle')
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(n): return ImageFont.truetype(FONT, n)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

SONG = {
 'valor': dict(times=[0,120,280,480], anchors=['caster feet','caster feet','ally feet'], widths=[58,76,34], description='Self song / team buff; sparks drift to allies.'),
 'finale': dict(times=[0,140,300,520], anchors=['caster hand','hand to enemy side','affected foe waist'], widths=[42,98,42], description='One release wave; one contact per affected foe.'),
 'dread': dict(times=[0,120,260,460], anchors=['caster hand','hand to target waist','beside target waist'], widths=[38,78,24], description='One foe: damage, then a small tremor if applied.'),
 'note': dict(times=[0,90,200,340], anchors=['caster hand','hand to target waist','target waist'], widths=[32,74,34], description='One blade / one target / one small contact.'),
 'solo': dict(times=[0,100,220,380], anchors=['caster feet']*3, widths=[56,48,44], description='Self only; short gentle light, no damage.'),
}
SHADOW = {
 'evade': dict(times=[0,90,200,340], anchors=['caster feet']*3, widths=[62,64,54], description='Self dodge-ready cue; wisps and one shimmer.'),
 'decoy': dict(times=[0,120,280,480], anchors=['beside caster feet']*3, widths=[40,46,44], description='One adjacent illusion; fade, no hit or shield.'),
}
# Hand-inspected source rectangles: generated sheets do not have uniform cells.
RECTS = {
 'song/R1': [
  [(0,100,280,390),(280,0,740,390),(740,100,972,390)],
  [(0,395,280,670),(280,395,740,670),(740,395,972,670)],
  [(0,670,270,970),(270,675,740,970),(740,680,972,970)],
  [(0,975,275,1220),(275,970,740,1190),(740,975,972,1220)],
  [(0,1250,320,1619),(320,1190,700,1619),(700,1250,972,1619)],
 ],
 'song/R2': [
  [(0,0,325,340),(325,0,690,345),(690,0,971,340)],
  [(0,345,325,665),(325,345,700,665),(700,345,971,665)],
  [(0,670,325,930),(325,670,710,930),(710,670,971,930)],
  [(0,935,325,1235),(325,935,715,1200),(715,935,971,1235)],
  [(0,1300,340,1620),(340,1200,655,1620),(655,1320,971,1620)],
 ],
 'shadow/R1': [
  [(0,0,512,500),(512,0,1024,500),(1024,0,1536,500)],
  [(0,510,512,1024),(512,510,1024,1024),(1024,510,1536,1024)],
 ],
}
# Actual ellipse/sole centres in the original sheets; broad glow bounds are not soles.
FLOOR_POINTS = {
 'song/R1': {'valor': [(140,320),(500,325),(850,270)], 'solo': [(160,1490),(500,1500),(840,1495)]},
 'song/R2': {'valor': [(165,255),(490,285),(835,200)], 'solo': [(165,1480),(490,1520),(815,1505)]},
 'shadow/R1': {'evade': [(256,375),(768,387),(1280,385)], 'decoy': [(256,900),(768,920),(1280,920)]},
}

def build_layers(family, variants, specs):
 folder = ROOT/family
 records = []
 for variant in variants:
  source = folder/'source'/f'{variant}.png'
  sheet = Image.open(source).convert('RGBA')
  for row,(move,spec) in enumerate(specs.items()):
   for col,beat in enumerate(BEATS):
    rect = RECTS[f'{family}/{variant}'][row][col]
    assert rect[2] <= sheet.width and rect[3] <= sheet.height, (source,rect,sheet.size)
    crop = sheet.crop(rect)
    # Preserve every source pixel inside the recorded rectangle, including alpha.
    crop.thumbnail((240,240), Image.Resampling.LANCZOS)
    out = Image.new('RGBA',(256,256))
    out.alpha_composite(crop, ((256-crop.width)//2,(256-crop.height)//2))
    bounds = out.getchannel('A').getbbox()
    assert bounds and min(bounds[:2]) >= 8 and max(bounds[2:]) <= 248
    path = folder/variant/f'{move}-{beat}.png'
    path.parent.mkdir(exist_ok=True)
    out.save(path)
    is_floor = 'feet' in spec['anchors'][col]
    pivot = [0.5,0.5]
    source_anchor = None
    if is_floor:
     source_anchor = FLOOR_POINTS[f'{family}/{variant}'][move][col]
     pivot = [round(((256-crop.width)//2+(source_anchor[0]-rect[0])*crop.width/(rect[2]-rect[0]))/256,4),
              round(((256-crop.height)//2+(source_anchor[1]-rect[1])*crop.height/(rect[3]-rect[1]))/256,4)]
    records.append(dict(move=move,beat=beat,variant=variant,file=str(path.relative_to(folder)),
      source=str(source.relative_to(folder)),source_rect=list(rect),source_size=list(sheet.size),
      sha256=sha(path),size=[256,256],alpha_bounds=list(bounds),pivot=pivot,source_anchor=source_anchor,
      anchor=spec['anchors'][col],suggested_canvas_width_at_390=spec['widths'][col],
      suggested_time_ms=spec['times'][col:col+2],blend='normal',z_order='rear floor, foreground thin rim; protect faces and labels'))
 manifest=dict(schema='art-vfx-three-beat-v1',batch='ART-VFX-SONG-SHADOW-001',family=family,
  frame_size=[256,256],alpha='straight',padding_min_px=8,coordinates='normalized canvas pivots, not battle coordinates',
  timing='Art suggestions only. Preserve existing action duration and authoritative contact instant.',
  sources=[dict(file=str(p.relative_to(folder)),sha256=sha(p),size=list(Image.open(p).size)) for p in sorted((folder/'source').glob('*.png'))],
  moves=specs,layers=records)
 (folder/'layers.json').write_text(json.dumps(manifest,indent=2)+'\n')
 return records

def board(family,variant,specs,records):
 height=108+len(specs)*224+58
 im=Image.new('RGBA',(390,height),'#101B2C'); d=ImageDraw.Draw(im)
 accent='#F4BD91' if family=='song' else '#9BBAD2'
 d.text((16,14),f'{family.upper()} / {variant}',font=font(19),fill=accent)
 d.text((16,42),'3 beats / original painted layers / 390px',font=font(12),fill='#CFD9E4')
 d.text((16,63),'Anchor diagrams; sample HP, no runtime claims.',font=font(11),fill='#9EADC0')
 d.text((16,82),'Faces + HP protected. C = caster, T = target/ally.',font=font(10),fill='#9EADC0')
 for row,(move,spec) in enumerate(specs.items()):
  top=108+row*224
  d.text((14,top),move.upper(),font=font(15),fill=accent)
  for col,beat in enumerate(BEATS):
   x=9+col*128; y=top+25
   d.rounded_rectangle((x,y,x+120,y+158),radius=7,fill='#1B2A3D')
   d.text((x+7,y+7),f'{col+1} {beat}',font=font(11),fill='#E4EAF1')
   d.text((x+7,y+23),f"{spec['times'][col]}-{spec['times'][col+1]} ms",font=font(10),fill='#9EADC0')
   # Neutral layout diagram; face and HP coordinates kept separate from paint.
   for ax,label in [(x+30,'C'),(x+89,'T')]:
    d.text((ax-15,y+40),'HP 100',font=font(8),fill='#DDE9F1')
    d.ellipse((ax-5,y+56,ax+5,y+66),fill='#77899D')
    d.rounded_rectangle((ax-6,y+69,ax+6,y+93),radius=4,fill='#52657A')
    d.line((ax-4,y+93,ax-5,y+110),fill='#77899D',width=3)
    d.line((ax+4,y+93,ax+5,y+110),fill='#77899D',width=3)
    d.text((ax-3,y+115),label,font=font(9),fill='#B5C4D3')
   rec=next(r for r in records if r['variant']==variant and r['move']==move and r['beat']==beat)
   art=Image.open(ROOT/family/rec['file'])
   # Board fits the full layer at the documented 390px canvas size.
   width=spec['widths'][col]
   art=art.resize((width,width),Image.Resampling.LANCZOS)
   anchor=rec['anchor']
   if anchor=='caster feet': point=(x+30,y+110)
   elif anchor=='ally feet': point=(x+89,y+110)
   elif anchor=='beside caster feet': point=(x+65,y+110)
   elif anchor=='caster hand': point=(x+40,y+85)
   elif anchor=='beside target waist': point=(x+106,y+86)
   elif anchor.startswith('hand to'): point=(x+65,y+86)
   else: point=(x+89,y+86)
   overlay=Image.new('RGBA',im.size)
   overlay.alpha_composite(art,(round(point[0]-width*rec['pivot'][0]),round(point[1]-width*rec['pivot'][1])))
   # Preview uses the same required protected regions as the integration brief.
   mask=overlay.getchannel('A'); md=ImageDraw.Draw(mask)
   for ax in (x+30,x+89):
    md.rectangle((ax-18,y+38,ax+19,y+51),fill=0)
    md.ellipse((ax-8,y+53,ax+8,y+69),fill=0)
   overlay.putalpha(mask); im.alpha_composite(overlay); d=ImageDraw.Draw(im)
   d.text((x+7,y+138),anchor.replace('affected ','')[:21],font=font(8),fill='#C0CEDB')
  # One line of semantics; never infer game results from artwork.
  words=spec['description'].split(); lines=['']
  for word in words:
   if len(lines[-1])+len(word)>53: lines.append('')
   lines[-1]+=(' ' if lines[-1] else '')+word
  for n,line in enumerate(lines): d.text((14,top+188+n*14),line,font=font(11),fill='#BDCCDB')
 d.text((14,height-44),'Normal alpha. Keep existing gameplay timing.',font=font(11),fill=accent)
 d.text((14,height-25),'Art review only; Claude supplies real 390px motion clips.',font=font(10),fill='#9EADC0')
 im.convert('RGB').save(ROOT/family/f'storyboard-{variant}-390.png')

def main():
 for family,variants,specs in [('song',['R1','R2'],SONG),('shadow',['R1'],SHADOW)]:
  records=build_layers(family,variants,specs)
  for variant in variants: board(family,variant,specs,records)
  print(f'{family}: {len(records)} transparent 256px layers; {len(variants)} boards at 390px')

if __name__=='__main__': main()
