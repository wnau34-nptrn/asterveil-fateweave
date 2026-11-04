# UXD-06 — ภาพเกมจริงและการตรวจ

เผยแพร่ 2026-11-04 08:30:52 Asia/Bangkok บน merge `b9031154edb5655145edac296ba44491693ef100` ผ่าน [Pages41748274489](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/41748274489) build/browser4/deploy · unit1492/105files · production83/84/80/88รวม335 · source565 (ไม่รวมskips) Local focused browser38distinctผ่าน

ภาพจาก production Pages build บน Chromium /usr/bin/chromium ใช้ touch/mobile emulation ไม่ใช่ Safari/iPhone/เครื่องจริง ไม่มีผลคนจริงหรือค่าประสิทธิภาพมือถือจริง

- [Preview 390×844](preview-844.png)
- [Review 390×844](review-844.png)
- [ผลจริง 390×650](result-650.png)
- [ตัวซ้ำขั้นต่ำขาด แม้มีตรา 390×650](shortage-0-3.png)
- [Review 200% text + insets จำลอง59/34 ที่390×650](review-text200-insets.png)

Fixtureตัวอย่าง ★3→★4: ตัวซ้ำ1/ตรา3/แร่120 ใช้1/2/70 เหลือ0/1/50 คนเดิม ทีมเดิม เลเวลค่ายเดิม ไม่มีRNG/auto-repeat

รายละเอียดกฎ/ขอบเขต/ผลtests/PR/merge/Pagesใน [implementation](../../handoffs/UXD-06-IMPLEMENTATION-TH.md) ภาพไม่ใช่ผลจากผู้เล่นจริง
