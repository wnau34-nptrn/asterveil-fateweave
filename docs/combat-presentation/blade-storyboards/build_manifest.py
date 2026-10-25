"""Inspect source RGBA strips and emit browser layout metadata; never repaint source pixels."""
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parents[3]
art = root / 'incoming/ART-VFX-BLADE-STORYBOARD-001'
names = ['attack', 'finisher', 'lunge', 'sweep', 'backstab', 'ambush', 'disarm', 'parry', 'pierce', 'halt']
anchors = json.loads((art / 'reference/anchors.json').read_text())
specs = [
    ('ฟันเฉียงสั้น', 'คมกระชับหนึ่งครั้ง ปลายเรียวและเว้นกลางโปร่ง', 84, 76, False),
    ('ฟันกดปิดงาน', 'ตะขอคมยาวกดลง เน้นปลายคมโดยไม่ใช้ X-slash', 88, 110, False),
    ('พุ่งตัด', 'ปลายพุ่งกับร่องลมเปิดด้านหลัง ต่างจากเข็มตรงของ Pierce', 116, 62, True),
    ('ฟันกวาด', 'เสี้ยวแบนทอดกว้างตามแนวนอน อ่านเป็นการกวาดครั้งเดียว', 142, 54, False),
    ('ลอบแทงย้อน', 'ปลายสั้นเข้าจากด้านตรงข้าม พร้อมหางโค้งเยื้องเล็กน้อย', 76, 46, True),
    ('ฟันเสยจู่โจม', 'คมรูปตะขอเปิดพุ่งขึ้นจากล่าง เว้นช่องให้เห็นตัวเป้าหมาย', 88, 104, False),
    ('เกี่ยวปัดอาวุธ', 'ตะขอเล็กหมุนเกี่ยวออก ไม่มีภาพอาวุธแตกหรือสถานะที่ไม่ได้เกิด', 62, 72, False),
    ('ตั้งท่า → ฟันสวน', 'กรอบรับเล็กที่ต้นทาง แล้วคมคืนกลับเมื่อมี counter จริงเท่านั้น', 88, 74, False),
    ('แทงทะลุแนว', 'เข็มยาวตรงบางที่สุด มีเพียงเส้นนำทางร่วมแกนเดียว', 130, 32, True),
    ('แทงหยุดแน่น', 'ปลายสั้นฐานแน่นและริ้วเบนกลับ ไม่ใช้สัญลักษณ์บล็อก', 74, 62, True),
]
records = []
for name, (thai, identity, w, h, axial) in zip(names, specs):
    source = art / 'source' / f'{name}.png'
    im = Image.open(source).convert('RGBA')
    a = im.getchannel('A')
    low, high = a.getextrema()
    assert low == 0 and high >= 128, (name, 'missing real transparency')
    assert im.width / im.height > 2.5, (name, im.size)
    occupied = a.point(lambda p: 255 if p > 32 else 0)
    pixels = occupied.tobytes()
    columns = [sum(pixels[x::im.width]) / 255 for x in range(im.width)]
    cuts = [0]
    for fraction in (1/3, 2/3):
        nominal = round(im.width * fraction)
        candidates = range(max(cuts[-1]+1, nominal-round(im.width*.085)), min(im.width, nominal+round(im.width*.085)))
        cuts.append(min(candidates, key=lambda x: (sum(columns[max(0,x-3):x+4]), abs(x-nominal))))
    cuts.append(im.width)
    frames = []
    for left, right in zip(cuts, cuts[1:]):
        box = occupied.crop((left, 0, right, im.height)).getbbox()
        assert box, (name, 'empty phase')
        x0, y0, x1, y1 = box
        frames.append([left+x0, y0, x1-x0, y1-y0])
    record = dict(skill=name, thai=thai, identity=identity, width=w, height=h, axial=axial,
                  source=f'../../../incoming/ART-VFX-BLADE-STORYBOARD-001/source/{name}.png',
                  background=f'../../../incoming/ART-VFX-BLADE-STORYBOARD-001/reference/{name}-390.png',
                  sourceSize=list(im.size), alphaRange=list(a.getextrema()), frames=frames, anchors=anchors[name])
    records.append(record)
    print(name, im.size, frames)
out = Path(__file__).resolve().parent
(out/'manifest.json').write_text(json.dumps(records, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(out/'boards.js').write_text('/* global window */\nwindow.bladeStoryboards = '+json.dumps(records, ensure_ascii=False)+';\n', encoding='utf-8')
