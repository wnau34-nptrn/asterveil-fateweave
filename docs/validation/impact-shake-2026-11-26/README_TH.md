# P2-2 ส่วนที่ 1 — ฉากสั่นแบบ trauma (2026-11-26)

แผน: [docs/UX_GAMEFEEL_AUDIT.md](../../UX_GAMEFEEL_AUDIT.md) P2-2 · เจ้าของสั่ง “ทำ P2-2 ส่วนที่ 1 ต่อได้เลย” · **รอเจ้าของดูคลิปก่อน merge**
ขอบเขต: presentation เท่านั้น ไม่เปลี่ยนผลต่อสู้ ความเสียหาย save หรือจังหวะ (ระยะเวลาสั่นใกล้เดิม ไม่มี hit-stop)

## ทำอะไร

- `src/game/visuals/impact-shake.ts`: ความแรง = trauma² × 4px, ตำแหน่งจากคลื่น sine 2 ชั้น (≈5–16 Hz) แทนค่าสุ่มทุกเฟรม, trauma ลดลง 7.2/วินาที
  - โดนธรรมดา trauma 0.8 → สูงสุด ≈2.6px ใน ≈110 ms (เดิม 2.5px 140 ms) · ศัตรูล้ม trauma 1 → 4px ใน ≈139 ms (เดิม 4px 140 ms)
  - โดนซ้อนกันบวก trauma ต่อจากที่เหลือ (สูงสุด 1) แทนการเริ่มใหม่
- `BattleScene.shake()` ใช้โมดูลนี้; ยังสั่นเฉพาะ field layer (ไม่ขยับกล้อง) และกลับ (0,0) ทุกครั้ง
- “เอฟเฟกต์: ลด” และ reduced motion: ไม่สั่นเหมือนเดิม

## ตรวจแล้ว

- typecheck, lint ผ่าน · vitest ใหม่ `tests/impact-shake.test.ts` 4 เคส (ไม่มี trauma = 0 พอดี, ไม่เกินเพดาน, เฟรมต่อเฟรมไม่กระโดด, บวก trauma และหมดใน 100–150 ms) + `battle-playback`, `combat-effects` ผ่าน
- Playwright ใหม่ `tests/browser/impact-shake.spec.ts` 3 เคส (fixture earth จริง): สั่นจริง ≤4px, ไม่กระโดดระหว่างเฟรม, จบที่ (0,0); เอฟเฟกต์ลด/reduced motion ไม่ขยับ
- ชุดเดิม earth-fx, alchemy-fx, healing-fx, battle-hud: 129 ผ่าน 1 ไม่ผ่านในรอบรวม (`alchemy catalyst/corroded`) — รันซ้ำแยก 3 รอบผ่านทั้งบนโค้ดใหม่และโค้ดเดิม จึงไม่เกี่ยวกับงานนี้ (น่าจะเกิดจากเครื่องรับโหลดหนัก)
- เพิ่ม `field()` ใน `tests/browser/fixtures/earth.ts` เพื่ออ่านตำแหน่ง field layer
- คลิป 390px: `shake-before-after-390.mp4` (ก่อนซ้าย หลังขวา โจมตี 3 ครั้ง) และ `shake-before-after-390-slow4x.mp4` (ช้าลง 4 เท่า) — Chromium headless, ไม่ใช่ FPS เครื่องจริง
- ยังไม่ได้ทดสอบ iOS Safari / Android จริง
