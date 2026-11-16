# WB-B — Valdrakk (World Boss) ตัวบอสในเกม

16 พฤศจิกายน 2026 · branch `claude/p11-05-wbb-intake` · P11-05 ขั้น 5

**สถานะ: เจ้าของอนุมัติ motion แล้ว 2026-11-16 — คำพูดของเจ้าของ: "อนุมัติ" ตอบคำถามของ Claude ที่ถามว่าอนุมัติทั้ง Valdrakk และ Morvane หรือท่าไหนต้องแก้ (หลังได้รับคลิปครบทุกท่า ยกเว้นคลิป Staggered ที่ทำไม่ได้ใน fixture) · ผลเทสต์/CI ไม่ใช่การอนุมัติภาพ คลิปเป็น Chromium/SwiftShader จำลองจอ 390×844 แบบสัมผัส ไม่ใช่มือถือจริงหรือ iOS Safari · Codex ยังระบุว่าสัดส่วน ±4% รับรองไม่ครบทุกเฟรม — เจ้าของอนุมัติหลังดูท่าจริง**

## แหล่งภาพ

- Codex PR #285 / branch `art/art-unit-animation-wb-b-001` (`8ab34af`), `incoming/ART-UNIT-ANIMATION-WB-B-001/`; นำเข้าเฉพาะโฟลเดอร์ `incoming/` (PR แตะแค่โฟลเดอร์นี้) SHA-256 ครบ 64 ไฟล์ตรง `validation.json` (`cd122e5179f4bf73…`), decode ได้ทุกไฟล์; `build_assets.py` ตรวจ hash ของ strip ซ้ำและยืนยันว่าเฟรมแรก/สุดท้ายของทุกท่า (ยกเว้น down) ตรง seed ทุกพิกเซล
- **Codex เองระบุว่ายังไม่ผ่านเกณฑ์สัดส่วน ±4% ครบ 44 เฟรม** (`integration_ready: false`): เฟรมที่ไม่ใช่ seed 29 เฟรม มี 20 เฟรมที่เครื่องวัดลำตัวไม่ได้ ("วัดไม่ได้" ไม่นับเป็นผ่าน) 9 เฟรมเข้า ±4% แบบประมาณ และเครื่องวัดของโปรเจกต์ให้ 10 drift flags (top 42% ของสัตว์สี่ขาคือปีก ไม่ใช่ลำตัว) — นำเข้าเป็น draft เพื่อให้เจ้าของดูท่าจริงในเกม **เจ้าของควรเทียบความยาวลำตัวกับ seed ในคลิป**; ถ้าเห็นลำตัวยืด/หด ส่งกลับ Codex แก้เป็น strip ทั้งแถว (ห้ามสเกลรายเฟรม)
- ที่ผมดูด้วยตา (ภาพในเกม 390px): ลำตัวสม่ำเสมอกับ seed ไม่เห็นการยืดชัดเจน เท้าอยู่บนพื้น; จุดเดียวที่ควรพิจารณา: **Wing Gust** ปีกข้างหนึ่งกางออกข้างเกือบแนวนอน (บรีฟห้ามกางแนวนอน; ยังอยู่ใน frame)

## Atlas และ registry

- identity ใหม่ `foe_valdrakk` (sheet `valdrakk`) ใช้โดย `wb-valdrakk` เท่านั้น (บอส f1); Morvane ยังใช้ `foe_sentinel` จนกว่า WB-C
- cell 1024 (sole 896 = 7/8, `displayRatio` 2) ย่อทั้ง cell ด้วย factor เดียว **.26 → cell 266** defringe, trim/dedup, WebP lossless ตรวจสร้างซ้ำพิกเซลต่อพิกเซล
- เลย์เอาต์ 30 เฟรม: 0 = seed; 1–4 Shard Talon (`move1`), 5–8 Wing Gust, 9–12 Wing Gathering, 13–16 Worldshard Dive, 17–20 **Staggered** (`move5`; ท่าที่เอนจินสร้างเองหลังตัดชาร์จ ไม่ใช่ hit/down), 21–24 Sky Rend (เฟส 70% `move6`); hit 25–26; down 27–29 (ค้างที่ 29)
- ขนาด: 512×2759, decoded 5.39 MiB, download 1,931,778 B ภายในงบบอส (~2 MB / 8 MiB) เกินงบ A9 เดิม (1.5 MB) เพราะตัวใหญ่เต็ม cell (ตัวกว้าง 83% ของ cell)
- ภาพนิ่ง/portrait ยังยืมของผู้คุม (`PLACEHOLDER_STILLS`)

## ที่ยังไม่ได้ทำ/ไม่ได้ตรวจ

- **คลิปของท่า Staggered ไม่มี**: ต้องตัดชาร์จจริงในศึก fixture ปัจจุบันไม่รองรับ (เทสต์ unit ตรวจ clip/เฟรมของ Staggered แล้ว แต่ยังไม่มีคลิปให้เจ้าของดู) — ควรดูในศึกจริงของบอสโลกหลังตั้ง `trio.from`
- ชื่อท่าไทยใน `intentName` ของ Shard Talon / Wing Gust / Wing Gathering / Worldshard Dive / Staggered / Sky Rend ยังไม่มี (ในศึกเห็นชื่ออังกฤษ)
- VFX วาดเฉพาะ: Wing Gust, Worldshard Dive และเฟส Sky Rend ผ่านเทสต์ coverage ด้วยข้อยกเว้นที่ระบุชื่อ (`tests/presentation-coverage.test.ts`)
- `catalog.ts` เปลี่ยนบรรทัด art ของ Valdrakk จึงเปลี่ยน content version (deploy server+game ชุดเดียวกัน); ไม่มีกติกา/เซฟ/ตัวเลขเปลี่ยน; `presentedEncounters` เพิ่ม Valdrakk (ไม่ใช่ `encounters`)

## คลิป (390×844 เวลาจริง ไม่ retime)

| ไฟล์ | ความยาว | เฟรมที่จับ | ช่องว่างสูงสุด |
| --- | --- | --- | --- |
| `foe_valdrakk-worldshard-dive-normal-normal-390.mp4` | 2.53 s | 123 | 0.223 s |
| `foe_valdrakk-sky-rend-normal-normal-390.mp4` | 2.43 s | 123 | 0.229 s |
| `foe_valdrakk-wing-gathering-normal-normal-390.mp4` | 2.53 s | 127 | 0.233 s |
| `foe_valdrakk-wing-gust-normal-normal-390.mp4` | 2.51 s | 125 | 0.214 s |
| `foe_valdrakk-shard-talon-enemy-down-normal-390.mp4` | 1.48 s | 79 | 0.077 s |
| `foe_valdrakk-shard-talon-normal-normal-390.mp4` | 2.36 s | 112 | 0.281 s |

ภาพ `*-foe-390.png` / `*-hero-390.png` คือเฟรมที่ contact ของแต่ละท่า; `…-enemy-down-…` คือบอสล้ม (เฟรมท้ายถูกกล่องชัยชนะบัง ดูท่าล้มที่ ~0.8 s)

## ตรวจแล้ว

`npm run typecheck`, `npm run lint`, `npm run coverage:presentation` (อัปเดตแล้ว), `tests/unit-wbb.test.ts` (intents, clips, Staggered, layout, งบ), Chromium `tests/browser/unit-wbb.spec.ts` 10/10 (ท่า/hit/down/ลด motion/เร็ว/ปล่อย texture)
