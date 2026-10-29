"""Read six authored cells; metadata only, no source pixel mutation."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
SOURCE=ROOT/'incoming/ART-VFX-DEFENSE-001/proposals/rally-r4/source.png'
im=Image.open(SOURCE)
assert im.mode=='RGBA' and im.width%3==0 and im.height%2==0
alpha=im.getchannel('A');assert alpha.getextrema()[0]==0
w,h=im.width//3,im.height//2
rows=[]
for row in range(2):
 frames=[]
 for col in range(3):
  left,top=col*w,row*h
  b=alpha.crop((left,top,left+w,top+h)).point(lambda p:255 if p>24 else 0).getbbox()
  assert b
  x0,y0,x1,y1=b;frames.append([left+x0,top+y0,x1-x0,y1-y0])
 rows.append(dict(frames=frames,frameMax=[max(f[2] for f in frames),max(f[3] for f in frames)]))
anchors=json.loads((ROOT/'incoming/ART-VFX-DEFENSE-001/reference/anchors.json').read_text())['rally']
record=dict(skill='rally',thai='ตั้งรับหมู่',identity='Knight ส่งคลื่นคำสั่งข้างตัว → ทั้งทีมตอบรับด้วยเส้นโค้งสั้นบนพื้น → แสงจาง ไม่พาดผ่านชุด',revision='Rally R4 · คำสั่งตั้งรับ',source='../../../incoming/ART-VFX-DEFENSE-001/proposals/rally-r4/source.png',background='../../../incoming/ART-VFX-DEFENSE-001/reference/rally-390.png',anchors=anchors,command=dict(**rows[0],width=68,height=42,dx=85,dy=22),response=dict(**rows[1],width=90,height=14,dy=27),sourceSize=list(im.size),alphaRange=list(alpha.getextrema()),sha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest())
(OUT/'manifest.json').write_text(json.dumps([record],ensure_ascii=False,indent=2)+'\n')
(OUT/'boards.js').write_text('/* global window */\nwindow.defenseStoryboards = '+json.dumps([record],ensure_ascii=False)+';\n')
print(record['sourceSize'],record['alphaRange'],rows)
