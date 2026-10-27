"""Verify all delivered PNGs keep actual sprite and outside-field pixels unchanged."""
from pathlib import Path
from PIL import Image,ImageChops
import json
OUT=Path(__file__).resolve().parent
records=json.loads((OUT/'manifest.json').read_text())['records']
results=[]
for r in records:
 for v in r['variants']:
  bg=Image.open(OUT/v['background']).convert('RGB')
  mask=Image.open(OUT/v['mask']).getchannel('A')
  left,top,w,h=(v['anchors']['canvas'][k] for k in ('left','top','width','height'))
  for phase in range(3):
   im=Image.open(OUT/f"{v['key']}-{phase}-390.png").convert('RGB')
   assert im.size==(390,844)
   diff=ImageChops.difference(im,bg)
   d=diff.convert('L').point(lambda p:255 if p else 0)
   protected=ImageChops.multiply(d,mask)
   assert not protected.getbbox(),(v['key'],phase,'costume pixels changed')
   box=d.getbbox();assert box,(v['key'],phase,'invisible effect')
   assert box[0]>=left and box[1]>=top and box[2]<=left+w and box[3]<=top+h,(v['key'],phase,'outside field')
   count=sum(p>0 for p in d.getdata())
   assert count>=10,(v['key'],phase,'unreadable effect')
   results.append(dict(key=v['key'],phase=phase,changedPixels=count,bounds=box,costumePixelsChanged=0))
(OUT/'composite-verification.json').write_text(json.dumps(results,indent=2)+'\n')
print(f'{len(results)} composites: actual sprite pixels and outside-field pixels unchanged; all phases visible')
