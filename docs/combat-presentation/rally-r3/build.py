"""Describe the Rally artwork proposal only; do not alter production atlas/source."""
from pathlib import Path
from PIL import Image
import json, hashlib

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SOURCE = ROOT/'incoming/ART-VFX-DEFENSE-001/proposals/rally-r3/source.png'
im=Image.open(SOURCE)
assert im.mode=='RGBA'
alpha=im.getchannel('A')
assert alpha.getextrema()[0]==0 and alpha.getextrema()[1]>=128
assert 2.5<im.width/im.height<3.5
occupied=alpha.point(lambda p:255 if p>24 else 0)
columns=[sum(occupied.crop((x,0,x+1,im.height)).tobytes()) for x in range(im.width)]
cuts=[0]
for f in [1/3,2/3]:
    nominal=round(im.width*f)
    cuts.append(min(range(nominal-round(im.width*.04),nominal+round(im.width*.04)),key=lambda x:(sum(columns[max(0,x-2):x+3]),abs(x-nominal))))
cuts.append(im.width)
frames=[]
for left,right in zip(cuts,cuts[1:]):
    box=occupied.crop((left,0,right,im.height)).getbbox()
    assert box
    x0,y0,x1,y1=box
    frames.append([left+x0,y0,x1-x0,y1-y0])
anchors=json.loads((ROOT/'incoming/ART-VFX-DEFENSE-001/reference/anchors.json').read_text())['rally']
record=dict(skill='rally',thai='ตั้งรับหมู่',identity='เครื่องหมายพลังน้ำเงิน–เงินบนพื้นแยกซ้าย–ขวา อยู่ต่ำกว่ารองเท้าและแถบ HP ไม่พาดทับชุด ไม่สื่อว่าเพิ่ม barrier',
    revision='Rally R3 artwork',width=90,height=12,dx=0,dy=27,anchor='feet',placement='targets',
    frames=frames,frameMax=[max(f[2] for f in frames),max(f[3] for f in frames)],
    source='../../../incoming/ART-VFX-DEFENSE-001/proposals/rally-r3/source.png',
    background='../../../incoming/ART-VFX-DEFENSE-001/reference/rally-390.png',anchors=anchors,
    sourceSize=list(im.size),alphaRange=list(alpha.getextrema()),sha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest())
(OUT/'manifest.json').write_text(json.dumps([record],ensure_ascii=False,indent=2)+'\n')
(OUT/'boards.js').write_text('/* global window */\nwindow.defenseStoryboards = '+json.dumps([record],ensure_ascii=False)+';\n')
print(record['sourceSize'],record['alphaRange'],frames)
