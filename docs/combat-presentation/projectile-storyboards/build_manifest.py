"""Describe original RGBA cells; no repainting or generated game pixels."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
ART=ROOT/'incoming/ART-VFX-PROJECTILE-001'
im=Image.open(ART/'source/seven-skills.png')
assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0
rows=[0,220,435,624,835,1055,1270,1536]
cols=[0,256,720,1024]
names=['hinder','volley','weakshot','pin','track','disengage','knives']
identities=[
'ศรเดี่ยวหางแตกริ้ว · delay รอบหน้าเฉพาะเป้ารอด ไม่ใช่ stun/cancel',
'ศรพัดทองแยกเส้นทางไปศัตรูมีชีวิตทุกตัว · talent ให้ delay แค่ผู้รับ event จริง',
'ศรเข็มทองแคบ · bonus ตาม delayed จริง ไม่สื่อคริติคอลหรือเกราะแตก',
'ศรหมุดคานคู่ลงเฉพาะแถวหน้า · pin หยุด screening ไม่หยุดเทิร์น',
'ศรลาเวนเดอร์ริ้วคู่ · cast หนึ่ง hit; ยิงซ้ำเป็น counter ท้ายรอบที่เกิดจริง',
'ศรหยกหางปัดกลับ · ย้ายคิวเป้าที่ยังไม่เดิน ไม่ย้ายช่องยืนหรือสร้าง dodge',
'มีดเงินกุหลาบหางโค้ง · เลือกแถวหลัง / หน้าเมื่อหลังว่าง / twin ตาม strike จริง']
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
   background=f'../../../incoming/ART-VFX-PROJECTILE-001/reference/{key}-390.png',
   mask=f'../../../incoming/ART-VFX-PROJECTILE-001/reference/{key}-mask.png'))
 records.append(dict(skill=skill,identity=identities[row],frames=frames,
  source='../../../incoming/ART-VFX-PROJECTILE-001/source/seven-skills.png',variants=variants))
meta=dict(base='8f00428',sourceSize=list(im.size),sha256=hashlib.sha256((ART/'source/seven-skills.png').read_bytes()).hexdigest(),alphaRange=list(im.getchannel('A').getextrema()),transparentPixels=im.getchannel('A').histogram()[0],records=records)
(OUT/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
(OUT/'boards.js').write_text('/* global window */\nwindow.projectileStoryboards='+json.dumps(meta,ensure_ascii=False)+';\n')
print('7 three-phase strips; 14 resolver cases; original alpha preserved')
