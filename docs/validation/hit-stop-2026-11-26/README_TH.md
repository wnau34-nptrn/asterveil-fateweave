# P2-2 ส่วนที่ 2 — hit-stop (2026-11-26)

แผน: [docs/UX_GAMEFEEL_AUDIT.md](../../UX_GAMEFEEL_AUDIT.md) P2-2 · เจ้าของสั่ง “ทำ P2-2 ส่วนที่ 2 hit-stop ต่อได้เลย” (ยอมรับการยืดจังหวะ 40–60 ms ต่อการโดนแรง) · **รอเจ้าของดูคลิปก่อน merge**

## ทำอะไร

- `src/ui/battle-playback.ts` `hitStopMs()` / `HIT_STOP_MS = 45`: หยุดเฉพาะเทิร์นที่โจมตีโดนจริง (damage/counter > 0) **และ** มีคนล้ม (`down`) หรือถูกขัดจังหวะ (`interrupt`); ไม่หยุดเมื่อ reduced motion, “เอฟเฟกต์: ลด” หรือเทิร์นถูกยกเลิก
- `src/ui/battle-ui.ts`: ส่งค่าให้ฉาก และเลื่อนเสียงล้มกับเวลาจบเทิร์นออกไปเท่ากับ `HIT_STOP_MS` (เทิร์นที่ไม่มี hit-stop จังหวะเท่าเดิมทุกมิลลิวินาที)
- `src/game/scenes/BattleScene.ts` `hitStop()`: รอให้เฟรมที่โดนวาดเสร็จหนึ่งรอบ แล้วหยุดฉาก Phaser (tween, timer, ท่าตัวละคร, การสั่น) นับเวลาจากตอนที่หยุดจริง แล้วเล่นต่อจากจุดเดิม; `stopEffects()` ปลดหยุดทันทีเสมอ และ timer ที่ค้างจะไม่หยุดฉากซ้ำ
- ระยะที่หยุดจริง ≈45–61 ms ที่ 60 fps (การเล่นต่อมีผลในเฟรมถัดไป)
- ผลต่อสู้ ความเสียหาย save และ replay ไม่เปลี่ยน (เทิร์นถูก resolve และบันทึกก่อนเล่นภาพ)

## ตรวจแล้ว

- typecheck, lint ผ่าน · `npm test` ทั้งชุด 2359 ผ่าน 25 ข้าม (รวม `tests/hit-stop.test.ts` ใหม่ 2 เคส)
- Playwright ใหม่ `tests/browser/hit-stop.spec.ts` (ผ่าน 3/3 รอบ): หยุดต่อเนื่องครั้งเดียว ≈45–65 ms, ไม่มีอะไรขยับระหว่างหยุด, เล่นต่อแล้ว field กลับ (0,0), `stopEffects` ระหว่างหยุดปลดทันทีและไม่หยุดซ้ำ, ค่า 0 ไม่หยุด
- ชุดเดิม combat, battle-hud, battle-rewards, earth-fx, impact-shake: 95 ผ่าน
- fixture `tests/browser/fixtures/earth.ts`: เพิ่ม `hitStop()` และ `paused()` (เรียก `play` ตัวจริงเพราะตัวครอบเดิมส่งต่อแค่ 2 argument)
- คลิป 390px: `hit-stop-compare-390.mp4` (ซ้ายไม่มี ขวามี hit-stop) และ `-slow4x.mp4` — Chromium headless ไม่ใช่ FPS เครื่องจริง; คลิปเล่นภาพฉากซ้ำ ไม่ได้แสดงการเลื่อนเวลาจบเทิร์น
- ยังไม่ได้ทดสอบ iOS Safari / Android จริง
