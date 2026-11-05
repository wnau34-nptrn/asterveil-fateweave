#!/usr/bin/env python3
"""Bounds are pixel differences in the captured reference scene, not sprite-cell estimates."""
from pathlib import Path
from PIL import Image,ImageChops
import json,shutil
D=Path(__file__).resolve().parent
result={}
for size in ['390x844','390x650','320x568']:
 model_path=D/'before'/size/'50-battle-model.json';model=json.loads(model_path.read_text());original=Image.open(D/'before'/size/'50-battle-scene.png').convert('RGB');bounds=[]
 for e in model['characters']:
  without=Image.open(D/'before/capture-work'/size/f'without-{e["id"]}.png').convert('RGB')
  diff=ImageChops.difference(original,without);channels=diff.split();mask=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2]).point(lambda x:255 if x>12 else 0)
  r=mask.getbbox();assert r,('No character pixels',size,e['id'])
  x,y,xx,yy=[v/2 for v in r];assert xx-x<int(size.split('x')[0])*.8,('Unexpected scene motion',size,e['id'],r)
  bounds.append({'id':e['id'],'x':x,'y':y,'w':xx-x,'h':yy-y,'method':'reference-image pixel difference >12 RGB, DPR2; includes visible body/shadow','reference':f'before/{size}/50-battle.png'})
 model['characters']=bounds;model_path.write_text(json.dumps(model,ensure_ascii=False,indent=2)+'\n');result[size]={'battle':bounds,'map':json.loads((D/'before'/size/'40-map-hud-model.json').read_text())['characters']}
(D/'character-bounds.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
shutil.rmtree(D/'before/capture-work')
print(json.dumps(result,ensure_ascii=False))

# A portable annotated reference for review, without another duplicate PNG set.
figures=[]
for size,groups in result.items():
 w,h=map(int,size.split('x'))
 for kind,values in groups.items():
  name='50-battle' if kind=='battle' else '40-map-hud'
  shapes=''.join(f'<rect x="{e["x"]}" y="{e["y"]}" width="{e["w"]}" height="{e["h"]}"><title>{e["id"]}</title></rect>' for e in values)
  figures.append(f'<figure><figcaption>{kind} · {size}</figcaption><div style="--bound-w:{w}px;--bound-h:{h}px"><img src="before/{size}/{name}.png"><svg viewBox="0 0 {w} {h}">{shapes}</svg></div></figure>')
(D/'character-bounds.html').write_text('<!doctype html><html lang="th"><meta charset="utf-8"><title>Character bounds from reference images</title><link rel="stylesheet" href="components.css"><style>body{display:block;padding:var(--space-4)}main{display:flex;gap:var(--space-4);flex-wrap:wrap}figure>div{position:relative;width:var(--bound-w);height:var(--bound-h)}img,svg{position:absolute;inset:0;width:100%;height:100%}rect{fill:none;stroke:var(--danger-coral);stroke-width:var(--ui-line)}</style><body><h1>กรอบตัวละครจากภาพก่อน · สำหรับตรวจการบังภาพ</h1><main>'+''.join(figures)+'</main></body></html>')
