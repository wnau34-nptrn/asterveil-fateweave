"""Describe isolated source cells with one shared scale per three-phase strip; no repainting."""
from pathlib import Path
from PIL import Image
import hashlib
import json

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'incoming/ART-VFX-HEALING-001'
OUT = Path(__file__).resolve().parent
SPECS = [
    ('heal', 'ประคองแสงเดี่ยว', 'กลีบมิ้นต์รวมที่ผู้รับ heal จริง ไม่แสดงฮีลเมื่อ HP เต็ม', 70, 18),
    ('prayer', 'คำอธิษฐานหมู่', 'พัดแสงบางตอบรับเฉพาะเพื่อนที่มี heal event; echo เป็นอีกจังหวะในรอบถัดไป', 74, 18),
    ('rouse', 'ยืนเคียงข้าง', 'ผู้คุ้มสีทองและเพื่อนสีหยกเป็นคู่ฐานข้างเท้า ตาม guard.all จริง ไม่มีฮีล', 104, 18),
    ('revive', 'รุ่งแสงคืนชีพ', 'แสงเปิดจากฐานเท้าของเพื่อนที่ล้มในศึกนี้เท่านั้น ไม่ครอบร่างหรือศีรษะ', 80, 18),
    ('bless', 'เมล็ดพรต่อเนื่อง', 'cast วางเมล็ดพร Renew ไม่มีฮีลทันที; เลือก tick เพื่อดูการรักษาที่เกิดจริงภายหลัง', 58, 18),
    ('mend', 'เริ่มเพลงฟื้น', 'cast เป็นริ้วเสียงเฉพาะผู้ร่าย; เลือก tick เพื่อดูการตอบรับของผู้ได้ heal จริงเมื่อเริ่มรอบ', 76, 18),
]

def strip(source, row, rows):
    im = Image.open(ART / 'source' / source)
    assert im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] == 0
    frames = []
    for col in range(3):
        x0, x1 = round(col * im.width / 3), round((col + 1) * im.width / 3)
        y0, y1 = round(row * im.height / rows), round((row + 1) * im.height / rows)
        alpha = im.getchannel('A').crop((x0, y0, x1, y1))
        box = alpha.point(lambda p: 255 if p >= 96 else 0).getbbox()
        assert box
        left, top, right, bottom = box
        frames.append(dict(cell=[x0, y0, x1-x0, y1-y0], anchor=[(left+right)/2, bottom], brightSize=[right-left,bottom-top]))
    return dict(source=f'../../../incoming/ART-VFX-HEALING-001/source/{source}', frames=frames,
        frameMax=[max(f['brightSize'][i] for f in frames) for i in range(2)],
        sourceSize=list(im.size), alphaRange=list(im.getchannel('A').getextrema()),
        transparentPixels=im.getchannel('A').histogram()[0], sha256=hashlib.sha256((ART/'source'/source).read_bytes()).hexdigest())

anchors = json.loads((ART / 'reference/anchors.json').read_text())
records = []
for row, (skill, thai, identity, width, height) in enumerate(SPECS):
    a = anchors[skill]
    records.append(dict(skill=skill, thai=thai, identity=identity, width=width, height=height,
        **strip('cast-six-skills.png', row, 6), anchors=a,
        background=f'../../../incoming/ART-VFX-HEALING-001/reference/{skill}-390.png'))
    if skill in ('bless', 'mend'):
        records[-1]['tick'] = dict(**strip('upkeep-two-skills.png', 0 if skill == 'bless' else 1, 2),
            width=66 if skill == 'bless' else 72, height=16,
            identity='ฮีลภายหลังเฉพาะ recipient ของ heal event จริง ไม่ใช่ผลตอน cast')
(OUT / 'manifest.json').write_text(json.dumps(records, ensure_ascii=False, indent=2)+'\n')
(OUT / 'boards.js').write_text('/* global window */\nwindow.healingStoryboards = '+json.dumps(records, ensure_ascii=False)+';\n')
print('6 cast strips + 2 upkeep strips; original RGBA pixels preserved')
