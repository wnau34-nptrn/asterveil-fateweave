"""Pack the selected song (R2, Codex's recommendation) and shadow (R1, the only revision) layers into one lossless atlas.

Each 256px layer keeps its pixels unchanged; only the transparent padding is trimmed (sourceSize stays 256, so a
layer's pivot from layers.json still applies to the full canvas). Run from anywhere: python3 -I incoming/ART-VFX-SONG-SHADOW-001/atlas.py
"""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[2];ART=Path(__file__).resolve().parent
PICK={'song':'R2','shadow':'R1'}
tiles={};art={};sources={}
for family,rev in PICK.items():
 for l in json.loads((ART/family/'layers.json').read_text())['layers']:
  if l['variant']!=rev:continue
  data=(ART/family/l['file']).read_bytes();assert hashlib.sha256(data).hexdigest()==l['sha256'],l['file']
  im=Image.open(ART/family/l['file']).convert('RGBA');assert im.size==(256,256)
  box=im.getchannel('A').getbbox();name=f"{l['move']}_{l['beat']}"
  tiles[name]=(im,box);art[name]=l['pivot'];sources[name]=l['sha256']
assert len(tiles)==21,len(tiles)
def pack(width):
 x=y=2;row=0;pos={}
 for k,(im,box) in sorted(tiles.items(),key=lambda p:(-(p[1][1][3]-p[1][1][1]),p[0])):
  w,h=box[2]-box[0],box[3]-box[1]
  if x+w+2>width:y+=row+4;x=2;row=0
  pos[k]=(x,y);x+=w+4;row=max(row,h)
 return pos,y+row+2
width=1024;pos,height=pack(width)
atlas=Image.new('RGBA',(width,height));frames={}
for k,(im,box) in tiles.items():
 x,y=pos[k];atlas.alpha_composite(im.crop(box),(x,y));w,h=box[2]-box[0],box[3]-box[1]
 frames[k]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':box[0],'y':box[1],'w':w,'h':h},'sourceSize':{'w':256,'h':256}}
import io
buf=io.BytesIO();atlas.save(buf,format='WEBP',lossless=True,exact=True,method=6);enc=buf.getvalue()
# exact lossless check: every layer's visible RGBA survives
dec=Image.open(io.BytesIO(enc)).convert('RGBA')
for k,(im,box) in tiles.items():
 x,y=pos[k];a=dec.crop((x,y,x+box[2]-box[0],y+box[3]-box[1]));b=im.crop(box)
 import numpy as np;aa=np.array(a);bb=np.array(b);assert (aa[:,:,3]==bb[:,:,3]).all() and (aa[bb[:,:,3]>0]==bb[bb[:,:,3]>0]).all(),k
out=ROOT/'public/assets/fx';out.mkdir(exist_ok=True)
(out/'song_shadow_fx.webp').write_bytes(enc)
(out/'song_shadow_fx.json').write_text(json.dumps({'frames':frames,'meta':{'image':'song_shadow_fx.webp','format':'RGBA8888','size':{'w':width,'h':height},'scale':'1'}},indent=2)+'\n')
(ROOT/'src/game/visuals/song-shadow-art.json').write_text(json.dumps(art,indent=2)+'\n')
(ART/'production-sources.json').write_text(json.dumps({'revisions':PICK,'atlasSha256':hashlib.sha256(enc).hexdigest(),'frames':sources},indent=2)+'\n')
print('21 frames',atlas.size,len(enc),'bytes; decoded',width*height*4)
