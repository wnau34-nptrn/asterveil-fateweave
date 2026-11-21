# P10 กาชาตั๋วฟรี — หลักฐานทดสอบและจำลอง (2026-11-21)

สเปก: [GACHA_P10_SPEC_TH.md](../../design/GACHA_P10_SPEC_TH.md) · คำตัดสิน OD-58

## ทดสอบแล้ว (เครื่อง dev, Node 24, Vitest)

- `tests/gacha.test.ts` — config (15 คน ไม่มีตัวพัก เรตรวม 100%), งบ 24/สัปดาห์ = 96/28 วัน, เรตที่สังเกตจาก 60,000 draw ตรงเรตประกาศ, ปฏิเสธ locked/config/count/tickets โดยไม่แตะเซฟ, 10 ครั้ง = 10×1, การแปลงผลทุกแบบ (joined/duplicate/universal/shards/stored/unlocked), ประวัติ 30 รายการ, แลก 80 ครั้งเดียว, เซฟ v66 round-trip + ปฏิเสธค่าแก้, v65 โหลดได้
- `tests/server-gacha.test.ts` — commit เดียวกับ receipt `gacha:<serial>`, retry ได้คำตอบเดิมไม่หักซ้ำ, requestId ซ้ำ payload ต่าง 409, seq ชน 409 stale, คำสั่งถูกปฏิเสธไม่ใช้ seed, `/v1/verify` replay ผ่าน, journal ใน SQLite ของ DO + `/gacha` แบ่งหน้า, เครื่องอื่น 423, telemetry ไม่มี id, นำเข้าเซฟเริ่มกระเป๋าว่าง (D24)
- `tests/game-command.test.ts` — คำสั่งใหม่ผ่าน `applyCommand` เท่ากับเรียกกฎตรง
- ทั้งชุด `npm test`: 2154 ผ่าน · typecheck · lint

## จำลองแล้ว

`SIM_REPORT=1 npx vitest run tests/gacha-sim.test.ts` (2,000 ผู้เล่น/กรณี, 364 วัน, เริ่มมี 7 จาก 15 ตัว, สุ่มทีละ 10, แลกตัวโปรด `astrid` ทุก 80 แต้ม; กาชาอย่างเดียว). ตารางผลอยู่ในสเปก §4. ใช้กฎจริงของเกม ไม่ใช่สูตรแยก

## ยังไม่ทำ / รออนุมัติ

- หน้าตู้ 390px + คลิปการสุ่ม (PR UI) — รอเจ้าของอนุมัติภาพ/flow
- staging load test ที่มีการสุ่มพร้อมกัน (workflow `Cloudflare staging load test`)
- ไม่มีการทดสอบบน iPhone/Android จริง
