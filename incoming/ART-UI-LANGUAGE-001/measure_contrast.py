#!/usr/bin/env python3
"""WCAG ratios sampled from actual Chromium backgrounds with foreground text hidden.
Three pixels per text-line rectangle; no visual estimate or canvas colour assumption.
"""
import json,sys
from PIL import Image
jobs=json.load(open(sys.argv[1]));out=[]
def lum(rgb):
 c=[x/255 for x in rgb[:3]];c=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c]
 return .2126*c[0]+.7152*c[1]+.0722*c[2]
for j in jobs:
 im=Image.open(j['path']).convert('RGB');minimum=100;failures=[];worst=None;count=0
 for t in j['texts']:
  import re
  fg=list(map(float,re.findall(r'[\d.]+',t['fg'])))
  if len(fg)<3:raise ValueError(t)
  for x,y in t['points']:
   bg=im.getpixel((min(im.width-1,round(x*2)),min(im.height-1,round(y*2))))
   a=fg[3] if len(fg)>3 else 1;actual=[fg[i]*a+bg[i]*(1-a) for i in range(3)]
   l1,l2=sorted([lum(actual),lum(bg)]);ratio=(l2+.05)/(l1+.05);threshold=3 if t['px']>=18 and t['weight']>=700 else 4.5
   count+=1
   if ratio<minimum:minimum=ratio;worst={'text':t['text'],'foreground':fg,'background':bg,'ratio':round(ratio,3),'at':[x,y]}
   if ratio+1e-6<threshold and not any(f['text']==t['text'] for f in failures):failures.append({'text':t['text'],'ratio':round(ratio,3),'required':threshold,'background':bg,'foreground':fg})
 out.append({'key':j['key'],'samples':count,'minimum':round(minimum,3),'worst':worst,'failures':failures})
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False,indent=2)
