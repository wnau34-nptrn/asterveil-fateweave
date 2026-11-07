from pathlib import Path
import json
from PIL import Image, ImageDraw
P=Path(__file__).resolve().parent
layers=json.loads((P/'layers.json').read_text())['layers']
moves=list(dict.fromkeys(x['move'] for x in layers))
board=Image.new('RGBA',(390,len(moves)*170),(16,25,47,255));d=ImageDraw.Draw(board)
def paste(canvas,path,xy,size):
 im=Image.open(path).convert('RGBA');im.thumbnail(size,Image.Resampling.LANCZOS);canvas.alpha_composite(im,xy)
for row,move in enumerate(moves):
 y=row*170;d.text((8,y+5),move,fill='white')
 seed='eira' if move.startswith('arcane') else 'sefa' if move in ['venom_coat','shadow_afterimage'] else 'foe_tusker'
 for i,l in enumerate(x for x in layers if x['move']==move):
  x=8+i*76
  paste(board,P/'references'/f'{seed}.png',(x,y+40),(76,100))
  paste(board,P/l['file'],(x,y+65),(76,76))
  d.text((x,y+145),l['beat'] if l['variant']=='R1' else 'R2 fang',fill='#b4c6da')
 if move in ['venom_emblem','arcane_emblem']:
  emblem=P/'R1'/f'{move}.png'
  for n in range(1,4):
   x=175+(n-1)*62
   for i in range(n):paste(board,emblem,(x+i*25,y+55),(28,28))
   d.text((x,y+95),str(n),fill='white')
board.convert('RGB').save(P/'storyboard-390.png')
# Old/new contact at the requested 100px scale; reference atlas contains actual previous silhouettes.
repo=P.parents[1];old=json.loads((repo/'public/assets/fx/blade_fx.json').read_text())
atlas=Image.open(repo/'public/assets/fx/blade_fx.webp').convert('RGBA')
comp=Image.new('RGBA',(220,240),(16,25,47,255));c=ImageDraw.Draw(comp);c.text((5,5),'Old reused / New',fill='white')
for j,(before,after) in enumerate([('backstab_peak','blade_storm_1'),('disarm_peak','venom_burst_peak')]):
 f=old['frames'][before]['frame'];im=atlas.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']));im.thumbnail((100,100));comp.alpha_composite(im,(5,25+j*105));paste(comp,P/'R1'/f'{after}.png',(115,25+j*105),(100,100))
comp.convert('RGB').save(P/'comparison-100px.png')
