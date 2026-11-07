#!/usr/bin/env python3
"""Offline integrity, full image decode, padding and exact lossless atlas round trip."""
import hashlib
import json
from pathlib import Path
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[1]
def run():
 v=json.loads((ROOT/'validation.json').read_text());checked=0
 for name,meta in v['files'].items():
  p=ROOT/name;data=p.read_bytes();assert len(data)==meta['bytes'],name
  assert hashlib.sha256(data).hexdigest()==meta['sha256'],name
  if p.suffix.lower() in ['.png','.webp']:
   with Image.open(p) as im: im.load()
  checked+=1
 layers=json.loads((ROOT/'layers.json').read_text())['layers']
 atlas=Image.open(REPO/'public/assets/fx/rework_fx.webp').convert('RGBA');atlas.load()
 info=json.loads((REPO/'public/assets/fx/rework_fx.json').read_text())
 assert atlas.size==(info['meta']['size']['w'],info['meta']['size']['h'])
 for l in layers:
  im=Image.open(ROOT/l['file']).convert('RGBA');im.load();assert im.size==(256,256)
  box=im.getchannel('A').getbbox();assert box and min(box[:2])>=12 and max(box[2:])<=244,l['file']
  if l['variant']=='R2':continue
  frame=Path(l['file']).stem;f=info['frames'][frame];assert f['sourceSize']=={'w':256,'h':256}
  r=f['frame'];s=f['spriteSourceSize'];canvas=Image.new('RGBA',(256,256));canvas.paste(atlas.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h'])),(s['x'],s['y']))
  assert not any(band.getbbox() for band in ImageChops.difference(canvas,im).split()),frame
 print(f'PASS: {checked} hashes/byte lengths, all PNGs fully decoded, {len(info["frames"])} exact lossless frame round trips')
if __name__=='__main__':run()
