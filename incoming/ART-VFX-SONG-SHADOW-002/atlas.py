"""Pack song/shadow R3 (seven moves, 21 layers) plus the unchanged Note (song R2) and Decoy (shadow R1) layers into one lossless atlas.

Each 256px layer keeps its pixels; only transparent padding is trimmed (sourceSize stays 256, so the pivots of layers.json apply to the full canvas).
Run: python3 -I incoming/ART-VFX-SONG-SHADOW-002/atlas.py
"""
from pathlib import Path
from PIL import Image
import json,hashlib,io
import numpy as np
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent;OLD=ROOT/'incoming/ART-VFX-SONG-SHADOW-001'
tiles={};art={};sources={}
def take(base,layers,keep,rev):
 for l in layers:
  if not keep(l):continue
  data=(base/l['file']).read_bytes();assert hashlib.sha256(data).hexdigest()==l['sha256'],l['file']
  im=Image.open(base/l['file']).convert('RGBA');assert im.size==(256,256)
  name=f"{l['move']}_{l['beat']}";assert name not in tiles,name
  tiles[name]=(im,im.getchannel('A').getbbox());art[name]=l['pivot'];sources[name]={'sha256':l['sha256'],'from':rev}
take(HERE,json.loads((HERE/'layers.json').read_text())['layers'],lambda l:l['variant']=='R3','002/R3')
take(OLD/'song',json.loads((OLD/'song/layers.json').read_text())['layers'],lambda l:l['move']=='note' and l['variant']=='R2','001/song R2')
take(OLD/'shadow',json.loads((OLD/'shadow/layers.json').read_text())['layers'],lambda l:l['move']=='decoy' and l['variant']=='R1','001/shadow R1')
assert len(tiles)==27,len(tiles)
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
buf=io.BytesIO();atlas.save(buf,format='WEBP',lossless=True,exact=True,method=6);enc=buf.getvalue()
dec=Image.open(io.BytesIO(enc)).convert('RGBA')
for k,(im,box) in tiles.items():
 x,y=pos[k];aa=np.array(dec.crop((x,y,x+box[2]-box[0],y+box[3]-box[1])));bb=np.array(im.crop(box))
 assert (aa[:,:,3]==bb[:,:,3]).all() and (aa[bb[:,:,3]>0]==bb[bb[:,:,3]>0]).all(),k
out=ROOT/'public/assets/fx';out.mkdir(exist_ok=True)
(out/'song_shadow_fx.webp').write_bytes(enc)
(out/'song_shadow_fx.json').write_text(json.dumps({'frames':frames,'meta':{'image':'song_shadow_fx.webp','format':'RGBA8888','size':{'w':width,'h':height},'scale':'1'}},indent=2)+'\n')
(ROOT/'src/game/visuals/song-shadow-art.json').write_text(json.dumps(art,indent=2)+'\n')
(HERE/'production-sources.json').write_text(json.dumps({'revisions':'R3 for valor/solo/evade/dread/finale/finale-mend/finale-dread; note = song R2, decoy = shadow R1 (not in R3)','atlasSha256':hashlib.sha256(enc).hexdigest(),'frames':sources},indent=2)+'\n')
print(len(tiles),'frames',atlas.size,len(enc),'bytes; decoded',width*height*4/2**20,'MiB')
