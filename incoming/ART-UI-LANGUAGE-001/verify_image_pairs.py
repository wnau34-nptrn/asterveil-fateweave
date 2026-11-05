#!/usr/bin/env python3
"""Verify that the exported R1/R2 HUD PNGs visibly differ and the measured numeral fonts are 12/11px."""
from pathlib import Path
from PIL import Image,ImageChops
import json
D=Path(__file__).resolve().parent
p=D/'verification.json';report=json.loads(p.read_text());checks=[]
for id in ['f-map-hud','h-battle-hud']:
 for w,h in [[390,844],[390,650],[320,568]]:
  a=D/'export'/f'{id}-{w}x{h}.png';b=D/'export'/f'{id}-r2-q4-{w}x{h}.png'
  with Image.open(a) as aa,Image.open(b) as bb:
   diff=ImageChops.difference(aa.convert('RGB'),bb.convert('RGB'));r,g,blue=diff.split();mask=ImageChops.lighter(ImageChops.lighter(r,g),blue);count=sum(v>0 for v in mask.getdata());bbox=mask.getbbox()
  variants={r['variant']:sorted({n['px'] for n in r['hudPaint']['hudNumerals']}) for r in report['records'] if r['page'] in [id,id+'-r2-q4'] and r['size']==[w,h]}
  ok=count>0 and variants.get('r1')==[12] and variants.get('r2-q4')==[11]
  checks.append({'page':id,'size':[w,h],'r1':str(a.relative_to(D)),'r2':str(b.relative_to(D)),'changedPixels':count,'differenceBoundsCSS':[v/2 for v in bbox] if bbox else None,'measuredNumeralFonts':variants,'pass':ok})
report['revisionChecks']['imageComparisons']=checks
if not all(c['pass'] for c in checks):
 report['revisionChecks']['pass']=False;report['revisionChecks']['failures'].append({'rule':'R1/R2 HUD image/font comparison','checks':checks});report['criteria'][3]['status']='fail';report['criteria'][3]['failures'].append('R1/R2 image comparison')
report['pass']=all(c['status']=='pass' for c in report['criteria']) and report['revisionChecks']['pass']
p.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('R1/R2 visible pixel differences:',[(c['page'],c['size'],c['changedPixels']) for c in checks]);assert all(c['pass'] for c in checks)
