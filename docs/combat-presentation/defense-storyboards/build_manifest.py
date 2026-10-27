"""Inspect alpha and describe shared-scale placements; never repaint generated pixels."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'incoming/ART-VFX-DEFENSE-001'
OUT = Path(__file__).resolve().parent
SPECS = [
    ('guard', 'ตั้งรับแทน', 'วงเล็บรับนอกโล่เดิมด้านผู้ใช้ → รับแทนเป้าที่ประกาศ ไม่ใช่โล่ดูดซับ', 62, 88, 'source', 42, 0),
    ('aegis', 'เกราะผลึก', 'Aura ผลึกลอยต่ำรอบเท้าและหน้าแข้ง เว้นชุดและช่วงตัว; barrier ตามผู้รับจริง', 80, 28, 'targets', 0, 0),
    ('rally', 'ตั้งรับหมู่', 'Knight ส่งคำสั่ง ทีมตอบรับที่พื้น คุ้มการโดนครั้งแรก ไม่ใช่ barrier', 90, 14, 'targets', 0, 27),
    ('bulwark', 'กำแพงโล่', 'ฐานตั้งรับหนักแน่นเว้นกลางโปร่ง คุ้มเฉพาะแนวหน้า ลดความเสียหาย', 88, 100, 'targets', 0, 4),
    ('stonearmor', 'เกราะหิน', 'Aura ศิลาเหลี่ยมต่ำติดพื้นรอบเท้า ไม่เกินเข่า เพิ่ม barrier ให้ผู้ใช้', 88, 32, 'source', 0, 0),
    ('guardstone', 'ศิลาดึง', 'ศิลาลอยพ้นอาวุธกับสายเกี่ยว เป้าเดี่ยวแรกเปลี่ยนไปผู้ใช้ ไม่ใช่ barrier', 62, 64, 'targets', 54, -4),
    ('halo', 'วงแสงคุ้มกัน', 'วงรีเหนือศีรษะ ลดเฉพาะความเสียหายพลังงานแก่ทั้งทีม', 58, 32, 'targets', 0, -48),
    ('sanctuary', 'พรคุ้มภัย', 'กลีบแสงประคองจากล่าง ป้องกัน HP ต่ำกว่า 1 ไม่ใช่ฟื้นคืนชีพ', 68, 96, 'targets', 0, 0),
    ('brace', 'ตั้งทวน', 'ทวนเดี่ยวค้ำเฉียงนิ่ง รอสวนกายภาพที่แนวหน้า 1 ครั้ง ไม่แทงตอนตั้งท่า', 92, 64, 'source', 15, 10),
    ('spearwall', 'กำแพงทวน', 'ซี่ทวนตั้งขนาน รอสวนทุกกายภาพที่แนวหน้า ไม่โจมตีตอนร่าย', 88, 86, 'source', 45, 3),
    ('hold', 'ทวนคุ้มหลัง', 'แนวทวนต่ำพาดคุ้มหลัง รอสวนเมื่อแนวหลังโดน ไม่เปลี่ยนเป้า', 116, 50, 'source', 0, 28),
]

def main():
    (ART / 'source').mkdir(parents=True, exist_ok=True)
    prompts = json.loads((ART / 'generation-prompts.json').read_text())
    anchors = json.loads((ART / 'reference/anchors.json').read_text())
    previous = {r['skill']: r for r in json.loads((ART / 'archive/r2/manifest.json').read_text())}
    records = []
    for skill, thai, identity, width, height, placement, dx, dy in SPECS:
        source = ART / 'source' / f'{skill}.png'
        original = next(p['original'] for p in prompts if p['skill'] == skill)
        if not source.exists():
            shutil.copyfile(original, source)
        im = Image.open(source)
        assert im.mode == 'RGBA', (skill, im.mode)
        alpha = im.getchannel('A')
        assert alpha.getextrema()[0] == 0 and alpha.getextrema()[1] >= 128
        if skill == 'rally':
            # Selected R4 has separate three-phase command/response rows.
            assert im.size == (1536, 1024)
            layers = []
            for row in range(2):
                frames = []
                for col in range(3):
                    left, top = col * 512, row * 512
                    box = alpha.crop((left, top, left+512, top+512)).point(lambda p: 255 if p > 24 else 0).getbbox()
                    assert box
                    x0,y0,x1,y1 = box
                    frames.append([left+x0,top+y0,x1-x0,y1-y0])
                layers.append(dict(frames=frames,frameMax=[max(f[2] for f in frames),max(f[3] for f in frames)]))
            records.append(dict(skill=skill,thai=thai,identity='Knight ส่งคำสั่งข้างตัว → ทีมตอบรับพร้อมกันที่พื้น ไม่พาดชุด ไม่ใช่ barrier',
                revision='Rally R4 command/response',width=90,height=14,placement='targets',dx=0,dy=27,anchor='feet',
                **layers[1],command=dict(**layers[0],width=68,height=42,dx=85,dy=22,anchor='body'),
                source='../../../incoming/ART-VFX-DEFENSE-001/source/rally.png',
                background='../../../incoming/ART-VFX-DEFENSE-001/reference/rally-390.png',
                sourceSize=list(im.size),alphaRange=list(alpha.getextrema()),sha256=hashlib.sha256(source.read_bytes()).hexdigest(),anchors=anchors[skill]))
            continue
        assert 2.5 < im.width / im.height < 3.5
        occupied = alpha.point(lambda p: 255 if p > 24 else 0)
        columns = [sum(occupied.crop((x, 0, x+1, im.height)).tobytes()) for x in range(im.width)]
        cuts = [0]
        for fraction in (1/3, 2/3):
            nominal = round(im.width * fraction)
            candidates = range(nominal-round(im.width*.04), nominal+round(im.width*.04))
            cuts.append(min(candidates, key=lambda x: (sum(columns[max(0,x-2):x+3]), abs(x-nominal))))
        cuts.append(im.width)
        frames = []
        for left, right in zip(cuts, cuts[1:]):
            box = occupied.crop((left, 0, right, im.height)).getbbox()
            assert box, (skill, 'empty phase')
            x0,y0,x1,y1 = box
            frames.append([left+x0,y0,x1-x0,y1-y0])
        records.append(dict(skill=skill,thai=thai,identity=identity,width=width,height=height,
            placement=placement,dx=dx,dy=dy,frames=frames,
            frameMax=[max(f[2] for f in frames),max(f[3] for f in frames)],
            source=f'../../../incoming/ART-VFX-DEFENSE-001/source/{skill}.png',
            background=f'../../../incoming/ART-VFX-DEFENSE-001/reference/{skill}-390.png',
            sourceSize=list(im.size),alphaRange=list(alpha.getextrema()),
            sha256=hashlib.sha256(source.read_bytes()).hexdigest(),anchors=anchors[skill]))
        if skill in previous:
            records[-1]['previous'] = previous[skill]
            records[-1]['revision'] = 'R3 low aura'
            records[-1]['anchor'] = 'feet'
        print(skill,im.size,frames)
    (OUT/'manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    (OUT/'boards.js').write_text('/* global window */\nwindow.defenseStoryboards = '+json.dumps(records,ensure_ascii=False)+';\n')

if __name__ == '__main__':
    main()
