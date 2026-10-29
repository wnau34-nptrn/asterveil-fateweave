# C5.7 ผนึกอาคม (Mark / Sigil Bind / Arcane Storm / Dispel) — runtime จริง รอเจ้าของตรวจ motion

สถานะ 2026-10-28: นำภาพ R2 ของ ART-VFX-ARCANE-SEAL-001 (PR #89; Codex เลือก R2 ตามที่เจ้าของมอบหมาย) เข้าเกมแล้วบนสาขา `codex/c5-7-arcane-seal-vfx` **ยังไม่ merge/เผยแพร่** จนกว่าเจ้าของตรวจคลิป 390px และอนุมัติ motion ผล tests ไม่ใช่การอนุมัติภาพ

## สิ่งที่ทำ
- `incoming/ART-VFX-ARCANE-SEAL-001/atlas.py` แพ็ก 12 เลเยอร์ R2 แบบ lossless เป็น `public/assets/fx/arcane_seal_fx.webp/json` (792×1056, 554,408 ไบต์; ตรวจ sha256 ต้นทางและพิกเซลตรงเลเยอร์ทุกชิ้น) pivot อยู่ใน `src/game/visuals/arcane-seal-art.json`
- `src/game/visuals/arcane-seal-fx.ts` + ต่อใน `BattleScene` (prepare/play/update) ตามแบบ alchemy: cue มาจาก event ที่ resolver ปล่อยจริงของท่าฮีโร่เท่านั้น ไม่แก้ core/save/content/balance/playback timing
- Mark: เฉพาะ event `mark` ของท่า Mark (ไม่ใช่ Sweep/Parry-mark) → ปั๊มที่กลางลำตัวเป้าหมาย แล้วหดเป็นตราข้างเอว ไม่มีแฟลชดาเมจ
- Sigil Bind: ต่อ event damage/dodge ที่เท้าเป้าหมาย; เลเยอร์ settle (โซ่ตึง) แสดงเฉพาะเมื่อมี event `sigil` จริง (ท่าเป้าหมายประกาศพลังงานและไม่ถูกต้านทาน)
- Arcane Storm: สำเนาเฉพาะที่ต่อศัตรูที่โดนจริงทุกตัว (รวมแถวหลัง) เศษคริสตัลตกลงด้านข้างหน้า แล้ว settle หนึ่งครั้งที่เท้าตามดาเมจจริง เลี่ยงตัวที่ล้ม/ไม่โดน
- Dispel: วงแหวนกลวงที่กลางลำตัว; เศษ settle แสดงเฉพาะเมื่อมี event `dispel` (ไม่แสดงเมื่อเป้าหมายตายจากดาเมจ)
- หลบ (dodge) ลดความทึบและไม่มี settle; กันดาเมจ 0 = ย้อมฟ้าแบบ alchemy; เลเยอร์กลางลำตัวอยู่หน้ายูนิต (วงกลวง ไม่บังหน้า) ชั้นพื้นอยู่หลังยูนิต ข้อความ HP/ตัวเลขถูกยกขึ้นบนสุดตามเดิม
- โหมด: normal/fast ใช้เวลาเดิมของ stage; reduced (ในเกม) และ OS reduced motion = peak นิ่งภาพเดียวไม่มี prepare/tween; fast ย่อตามเวลาจริงที่เหลือ

## คลิปจริง 390px (Chromium cloud/SwiftShader emulation ไม่ใช่มือถือจริง/Safari)
21 คลิป: 4 ท่า × normal/fast/reduced/osreduce + sigil-energy, dispel-kill, storm-kill, storm-backonly, mark-backonly ใช้เวลาจริงของเฟรม ไม่ interpolate/retime ไม่อ้าง 60fps ดู `*-390.mp4`, ภาพ `*-prepare-390.png`, `*-cast-390.png`, `*-afterglow-390.png` และ `clips.json`
ทำซ้ำ: `SEAL_CLIPS=1 npx playwright test tests/browser/arcane-seal-clips.spec.ts --output=test-results/arcane-seal-delivery` แล้ว `python tests/browser/fixtures/encode-arcane-seal-clips.py`

## งบภาพ/ความจำ (บันทึกตาม OD-05: สนามอนาคต 5 ฮีโร่ + ศัตรูสูงสุด 5 = 10 ตัว)
- atlas นี้ 792×1056 RGBA = 3.19 MiB decoded ไฟล์ 541 KiB ใช้ร่วมทุกตัว ไม่เพิ่มต่อยูนิต
- ต่อ 1 การร่าย: Storm สูงสุดหนึ่ง peak + หนึ่ง settle ต่อศัตรูที่โดนจริง (ศัตรูสูงสุด 5 ตัว ⇒ ≤10 image จาก atlas เดียว); ท่าอื่น ≤2 image ไม่เพิ่ม texture
- ต้องวัดจริงอีกครั้งเมื่อสนาม 10 ตัวจริงมาถึง (P02) ตอนนี้ยังเป็น 4v4

## ข้อจำกัด
Chromium emulation เท่านั้น; ตำแหน่ง hand/centre/feet อิง transform ของ sprite จริงเหมือน alchemy แต่ยังไม่ผ่านการตรวจ motion โดยเจ้าของ
