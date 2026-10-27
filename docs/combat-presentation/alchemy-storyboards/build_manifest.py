"""Describe original RGBA cells; no repainting or generated game pixels."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
ART=ROOT/'incoming/ART-VFX-ALCHEMY-001'
im=Image.open(ART/'source/six-skills.png')
assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0
rows=[0,172,342,512,683,853,1024]
cols=[0,512,1024,1536]
names=['acid','bomb','smoke','catalyst','haste','fury']
identities=[
'Acid · คราบกัดกร่อนคมบาง hit เดียวแก่เป้าหลัก ส่วน spread เป็นคราบเท่านั้น ไม่มี damage เพิ่ม',
'Bomb · burst เศษแสงทองแดงสั้นตามผู้รับ damage จริงทุกตัวรวมแถวหลัง',
'Smoke · ริ้วควันม่วงเงินโปร่ง ลดแรงท่าถัดไป ไม่ damage / stun / cancel',
'Catalyst · เศษแสงพีชยุบเข้าจุดปฏิกิริยาเดียว ใช้ corrosion ตาม event จริง ไม่แตกเป็นหลาย hit',
'Haste · ริบบอนฟ้าเงินเร่งทิศบน ally จริง เปลี่ยนลำดับเท่านั้น ไม่เพิ่ม turn / teleport / heal ปลอม',
'Fury · ประกายอำพันแดงกระชับ buff empowered+exposed ไม่โจมตีหรือ heal ขณะ cast']
def normalized(value):
 if isinstance(value,float):return round(value,6)
 if isinstance(value,list):return [normalized(v) for v in value]
 if isinstance(value,dict):return {k:normalized(v) for k,v in value.items()}
 return value
# Raw capture retains full precision; review manifest uses sub-pixel CSS precision.
anchors=normalized(json.loads((ART/'reference/anchors.json').read_text()))
records=[]
for row,skill in enumerate(names):
 frames=[]
 for phase in range(3):
  cell=[cols[phase],rows[row],cols[phase+1]-cols[phase],rows[row+1]-rows[row]]
  x,y,w,h=cell
  a=im.getchannel('A').crop((x,y,x+w,y+h))
  box=a.point(lambda p:255 if p>=85 else 0).getbbox()
  assert box
  frames.append(dict(cell=cell,bright=list(box)))
 variants=[]
 for key,a in anchors.items():
  if a['skill']!=skill:continue
  variants.append(dict(key=key,scenario=a['scenario'],anchors=a,
   background=f'../../../incoming/ART-VFX-ALCHEMY-001/reference/{key}-390.png',
   mask=f'../../../incoming/ART-VFX-ALCHEMY-001/reference/{key}-mask.png'))
 records.append(dict(skill=skill,identity=identities[row],frames=frames,
  source='../../../incoming/ART-VFX-ALCHEMY-001/source/six-skills.png',variants=variants))
meta=dict(base='1f783f83417f4d8b641040e04cc4be209c265f8b',sourceSize=list(im.size),sha256=hashlib.sha256((ART/'source/six-skills.png').read_bytes()).hexdigest(),alphaRange=list(im.getchannel('A').getextrema()),transparentPixels=im.getchannel('A').histogram()[0],records=records)
(OUT/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
(OUT/'boards.js').write_text('/* global window */\nwindow.alchemyStoryboards='+json.dumps(meta,ensure_ascii=False)+';\n')
print('6 three-phase strips; 14 real resolver cases; original alpha preserved')
