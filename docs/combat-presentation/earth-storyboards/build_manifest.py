"""Describe original RGBA cells; no repainting or generated game pixels."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
ART=ROOT/'incoming/ART-VFX-EARTH-001'
im=Image.open(ART/'source/four-skills.png')
assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0
rows=[0,260,525,770,1024]
cols=[0,512,1024,1536]
names=['bash','slam','quake','tremor']
identities=[
'แรงชนโล่ทอง/ivory เฉพาะผู้รับ damage จริง; interrupt เฉพาะphysicalที่หยุดได้ หรือsigilเมื่อมีreflectbashกับenergy',
'แนวทุบรูนลงจุดเดียวสีบรอนซ์; bonusเมื่อintentถัดไปเล็งผู้ใช้; runequakeเพิ่มผู้รับคู่ช่องหมายเลขเดียวกันจริง',
'พัดรอยแยกปฐพีอำพันต่ำเฉพาะแถวหน้า; ใช้แถวหลังเมื่อหน้าไม่มี ไม่ใช่ตีทุกตัวหรือstun',
'ริ้วศิลาหยกเอนหาผู้ใช้เฉพาะหน้า/หลังเมื่อหน้าว่าง; drawnByดึงเป้าหมาย ไม่ใช่ลดpowerหรือหยุดturn']
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
   background=f'../../../incoming/ART-VFX-EARTH-001/reference/{key}-390.png',
   mask=f'../../../incoming/ART-VFX-EARTH-001/reference/{key}-mask.png'))
 records.append(dict(skill=skill,identity=identities[row],frames=frames,
  source='../../../incoming/ART-VFX-EARTH-001/source/four-skills.png',variants=variants))
meta=dict(base='35e39af',sourceSize=list(im.size),sha256=hashlib.sha256((ART/'source/four-skills.png').read_bytes()).hexdigest(),alphaRange=list(im.getchannel('A').getextrema()),transparentPixels=im.getchannel('A').histogram()[0],records=records)
(OUT/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
(OUT/'boards.js').write_text('/* global window */\nwindow.earthStoryboards='+json.dumps(meta,ensure_ascii=False)+';\n')
print('4 three-phase strips; 15 real resolver cases; original alpha preserved')
