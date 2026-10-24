# C5.1 — ฟันดาบ / แทง (Blade family)

24 ตุลาคม 2026 · **R2 แก้ความเบา/บางตาม feedback — รอเจ้าของตรวจคลิปใหม่ ยังไม่อนุมัติภาพ และยังไม่เริ่มตระกูล 2**

เจ้าของระบุให้ปรับเฉพาะฟัน/แทงทั้ง 10 สกิลในคลิปล่าสุด ภาพร่วมถูกวาดแก้ด้วย ImageGen ให้มีเนื้อสีทึบและคมกว้างขึ้น; รอยฟัน/แทงในเกมใหญ่ขึ้น 25% และเพิ่มน้ำหนักให้ Attack/Backstab/Ambush/Disarm/Parry ที่เล็กกว่าเพื่อน ลำดับเฟรมแยกจาก alpha แล้ว จึงคงพีกเต็มความสว่างสูงสุดประมาณ 180ms ก่อนสลาย (อายุภาพสูงสุด 350ms และไม่เกินเวลาที่เหลือของ stage) ประกายเตรียมและปะทะหนาขึ้น จำนวนเศษแสงเท่าเดิม ไม่แก้ Bolt/Execute/Ward หรือเพิ่มการโดน

ภาพร่วมชุดเดียว `public/assets/fx/blade_fx.webp` + `.json`, โมดูล `src/game/visuals/blade-fx.ts`, ต้นฉบับและ prompt ใน `incoming/ART-VFX-BLADE-001/` ใช้ภาษาเส้นโค้งปลายเรียว แกน ivory ขอบสีตามอาชีพ เหมือน Bolt / Execute / Ward ที่ผ่านแล้ว ทุกสกิลเลือกทรง ขนาด ทิศ และจำนวนเศษแสงจากตารางเล็ก ไม่มีภาพแยกรายสกิล

ก่อน contact มีประกายเล็กที่ต้นทาง; เมื่อถึง contact เดิมจึงเห็นรอยฟัน/แทงกับดาวเล็กที่ผู้รับจริง แล้วสลาย เศษแสงไม่ใช่การตีเพิ่ม ไม่เปลี่ยน `battle-playback.ts`, resolver, กฎ, balance หรือเซฟ ภาพเป็น normal alpha ไม่มี full-screen flash หรือสีขาวทับร่าง

## คลิป 390 × 844

| สกิล | คลิปโดนจริง |
|---|---|
| Attack | [attack-hit-normal](attack-hit-normal-390.mp4) |
| Finisher | [finisher-hit-normal](finisher-hit-normal-390.mp4) |
| Lunge | [lunge-hit-normal](lunge-hit-normal-390.mp4) |
| Sweep | [sweep-hit-normal](sweep-hit-normal-390.mp4) |
| Backstab | [backstab-hit-normal](backstab-hit-normal-390.mp4) |
| Ambush | [ambush-hit-normal](ambush-hit-normal-390.mp4) |
| Disarm | [disarm-hit-normal](disarm-hit-normal-390.mp4) |
| Parry | [parry-hit-normal](parry-hit-normal-390.mp4) — ตั้งท่าก่อน แล้วฟันสวนเมื่อ enemy stage มี Parry + counter จริง |
| Pierce | [pierce-hit-normal](pierce-hit-normal-390.mp4) |
| Halt | [halt-hit-normal](halt-hit-normal-390.mp4) |

ภาพกายภาพฝั่งศัตรูใช้ชุดเดียวกัน จึงตรวจผลที่มีจริงใน resolver ได้โดยไม่สร้างเหตุการณ์หลบหรือโล่ให้ศัตรูขึ้นมาเอง:

- [โล่รับเต็ม](attack-blocked-normal-390.mp4): เสี้ยวแสงมุกที่ขอบด้านผู้โจมตี ไม่มีรอยฟัน/ดาวบนร่าง ไม่มี body tint
- [โล่รับบางส่วน](attack-partial-normal-390.mp4): เห็นขอบโล่และผลต่อ HP ตาม amount/absorbed จริง
- [หลบ](attack-dodged-normal-390.mp4): ริ้วผ่านนอกตัว ไม่มีดาวปะทะ
- [Guard รับแทน](attack-guarded-normal-390.mp4): ภาพติดผู้รับ damage จริง พร้อมข้อความรับแทนเดิม
- [ยกเลิกเพราะขัดจังหวะ](attack-cancelled-normal-390.mp4): ไม่มีรอยฟันหรือปะทะล่าช้าจากศัตรูที่ถูกยกเลิก
- [Fast](lunge-hit-fast-390.mp4), [ความเข้มลดลง](lunge-hit-reduced-390.mp4), [OS reduced motion](lunge-hit-osreduce-390.mp4): ใช้ cue เดิม; OS reduced motion ใช้เฟรมนิ่งทันที ไม่มี tween ของภาพชุดนี้

คลิปเป็นเวลาจริงจาก Chromium headless / SwiftShader บน Windows ผ่าน fixture ทดสอบที่ใช้ BattleUI, BattleScene, playback และ resolver จริง ปรับทีม/ความเร็ว/HP และเงื่อนไขเริ่มต้นเฉพาะใน fixture เพื่อเรียกทุกสกิลและผลอย่างแน่นอน ไม่ใช่เซฟหรือค่าความสมดุลในเกม ไม่ใช่หลักฐานจาก iPhone/Safari หรือเครื่องจริง ไม่มีการ interpolate เฟรมหรือเร่ง/ชะลอวิดีโอ; `clips.json` บอกขนาด ระยะเวลา จำนวนเฟรม ช่องว่างเฟรม และเวลา impact ที่ renderer ได้รับจริง ภาพ contact เลือกจาก cue นี้ +70ms ไม่ประมาณจากเวลาที่แตะปุ่มซึ่งยังมีงาน layout คั่นอยู่

## ตรวจซ้ำ

```text
npm run typecheck
npm run lint
npx vitest run
npm run build
npx playwright test tests/browser/blade-fx.spec.ts tests/browser/combat.spec.ts tests/browser/presentation.spec.ts tests/browser/bolt-fx.spec.ts tests/browser/exec-ward-fx.spec.ts
```

อัดซ้ำใน PowerShell (อย่าอัดพร้อม simulation หรือ browser suite อื่น):

```powershell
$env:FX_CLIPS='1'
npx playwright test tests/browser/blade-clips.spec.ts --output test-results/blade-r2-delivery
python tests/browser/fixtures/encode-blade-clips.py test-results/blade-r2-delivery
```

ใช้ Python ที่มี Pillow และ ffmpeg/ffprobe ใน PATH การ pack atlas: `python incoming/ART-VFX-BLADE-001/package.py`

ผลตรวจ R2: typecheck / lint / build ผ่าน; **31/31 browser tests ผ่าน** (family 18 + playback 13) ตรวจ HP ก่อน/ตรง contact, valid atlas frames, พีกทึบที่ contact +130ms, ตัวเลขอยู่เหนือแสง, skip cleanup, ผลจริงและ fast/reduced/resize รวมความกว้าง 320/390/1366px ตั้งนาฬิกาทดสอบก่อนเริ่ม Phaser เพื่อไม่เปลี่ยน clock กลาง render loop

Vitest บนฐานเกมล่าสุด `a8cf3c7`, `npx vitest run --maxWorkers=1`: **756/756 ผ่าน (65 files)** ไม่มีการแก้ test timeout/กฎ/ตัวเลข ไฟล์ `src/core`, `src/content` และ `battle-playback.ts` ไม่ต่างจาก base branch

## ภาพ contact จากการอัดจริง

![Lunge](lunge-hit-normal-390.png)

![Sweep](sweep-hit-normal-390.png)

เจ้าของตัดสินคุณภาพภาพจากคลิปก่อนอนุมัติขยายตระกูลถัดไป ผลเทสต์ไม่ใช่การอนุมัติภาพ
