# Unit animation — ขั้น 2

วันที่ 26 ตุลาคม 2026 · branch `codex/unit-animation-controller`

## ผลงาน

เพิ่ม controller `unit-animation.ts` กับตาราง `unit-animation-map.ts` และเชื่อม BattleScene รองรับท่าโจมตีตาม 12 อาชีพ/73 ActionIds และ 22 enemy art identities โดยศัตรูใช้ art + intent แทน ID ช่องสนาม

ใช้ภาพเดิมขยับ/เอน/ย่อเพื่อเป็น fallback ไม่ใช่ sprite sheet เปลี่ยนท่าแขนขา ภาพหลายเฟรมของคู่ pilot ยังเป็นขั้น 3 ท่ารับผลอ่านจาก resolved events: hit เฉพาะ HP damage, block/absorb ไม่เล่น hit, dodge, counter และ down โดย down ไม่ทับ final frame ที่ฟื้นแล้ว

controller ไม่มี timers หรือการแก้ battle/save เริ่มท่าก่อน VFX early returns (Execute/Bolt/Ward), รอ contact ของ BattlePlayback, คืนตำแหน่งภายใน end เดิม, หยุด idle รายตัวและไม่ปลุก idle ของตัวที่ล้ม เป้ากดและข้อมูล HP อยู่กับที่เหมือนเดิม normal/fast ใช้ timing เดิม; reduced intensity และ OS reduced-motion งดการขยับตัวใหม่

## การตรวจ

- `npm run typecheck`, `npm run lint`, `npm run build`: ผ่าน
- `npm test`: 72 files / 847 tests ผ่าน
- focused unit-animation/battle-playback/combat-effects: 3 files / 20 tests ผ่าน
- Chromium Playwright: `tests/browser/presentation.spec.ts --grep '390|presentation mode'`: 7 กรณี ผ่านครบเมื่อรวมการรันทวนกรณี preferences ที่ถูก Vite HMR รีโหลดระหว่างแก้โค้ด (รันทวน 1/1 ผ่าน)
- ตรวจ mode matrix normal/reduced intensity, fast, OS reduced-motion toggle, contact HP, command-once, skip/resize/reload/hidden-tab และภาพจริง 390px ฝ่ายเรา/ศัตรู
- Browser extension ไม่มี js/browser-control tool ในเซสชัน จึงใช้ Playwright ที่มีใน repo กับ `/usr/bin/chromium`; ไม่อ้างว่าเป็น iOS Safari หรือเครื่องจริง
- คลิปเก็บจาก screenshot ทุก 50ms ของ virtual browser clock แล้ว encode 20fps: Lyra Execute → enemy attack → Eira Bolt; ไม่มีเสียง ไม่ใช่ benchmark FPS
- ไม่มีการเปลี่ยนกติกา ดาเมจ schema หรือเซฟ และไม่รวม/อนุมัติ C5 blade VFX

## หลักฐานใน workspace

ไฟล์ภาพและคลิปเก็บที่ `/workspace/asterveil-fateweave/docs/validation/unit-animation-step2/`: `hero-impact-390.png`, `enemy-impact-390.png`, `hero-enemy-cast-390.mp4` โดยตรวจภาพทั้งสองใบแล้ว สนามและ HUD ยังอ่านได้ ไฟล์ binary อาจยังไม่ได้เผยแพร่เมื่อส่งผ่าน text-only GitHub connector; ให้ตรวจรายการไฟล์ใน PR ก่อนอ้างว่าออนไลน์

## ขั้นถัดไป

สร้าง sprite sheet คู่ Lyra + Vargoth Hunter ตามเอกสารสำรวจขั้น 1 แล้วต่อ frame/contact metadata เข้ากับ controller โดยยังใช้ BattlePlayback คุมเวลา การผลิตภาพและนำภาพใหม่ขึ้นเกมไม่รวมในขั้น 2 นี้
