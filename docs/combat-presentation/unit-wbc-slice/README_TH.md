# WB-C — Morvane (World Boss) ตัวบอสในเกม

16 พฤศจิกายน 2026 · branch `claude/p11-05-wbc-intake` (ต่อจาก `claude/p11-05-wbb-intake`) · P11-05 ขั้น 5

**สถานะ: เจ้าของอนุมัติ motion แล้ว 2026-11-16 — คำพูดของเจ้าของ: "อนุมัติ" ตอบคำถามของ Claude ที่ถามว่าอนุมัติทั้ง Valdrakk และ Morvane หรือท่าไหนต้องแก้ (หลังได้รับคลิปครบทุกท่า ยกเว้นคลิป Staggered ที่ทำไม่ได้ใน fixture) · ผลเทสต์/CI ไม่ใช่การอนุมัติภาพ คลิปเป็น Chromium/SwiftShader จำลองจอ 390×844 แบบสัมผัส ไม่ใช่มือถือจริงหรือ iOS Safari**

## แหล่งภาพ

- Codex PR #288 / branch `art/art-unit-animation-wb-c-001` (`7d69200`), `incoming/ART-UNIT-ANIMATION-WB-C-001/`; นำเข้าเฉพาะโฟลเดอร์ `incoming/` SHA-256 ครบ 69 ไฟล์ตรง `validation.json` (`86b42a29f8f231eb…`), decode ได้ทุกไฟล์; `build_assets.py` ตรวจ hash ของ strip ซ้ำและยืนยันว่าเฟรมแรก/สุดท้ายของทุกท่า (ยกเว้น down) ตรง seed ทุกพิกเซล
- สัดส่วนตาม Codex: ไม่มี drift flag; ความสูงมงกุฎ→ปลายผ้า 41 เฟรมอยู่ใน ±4% (ยกเว้นท่าล้ม 3 เฟรมที่ตั้งใจพังลง); เครื่องวัดกายวิภาควัดไม่ได้ 3 เฟรม = down 1–3 (หัวเอียง แขนทับ ผ้ากอง) — ตรวจด้วยตา ไม่นับเป็นผ่านการวัด **เจ้าของควรดูท่าล้มในคลิป**
- ที่ผมดูด้วยตา (ภาพในเกม 390px): สามคู่แขนคงตำแหน่งและไม่สลับ, ผ้าคลุมสามแฉกครบ, ปลายผ้าอยู่บนเส้นพื้น (แถบ HP ใต้ตัวไม่ถูกทับ), ท่าแต่ละท่าแยกกันได้ที่ขนาดจริง

## Atlas และ registry

- identity ใหม่ `foe_morvane` (sheet `morvane`) ใช้โดย `wb-morvane` เท่านั้น (บอส f1); ลูกน้องใช้ crawler/wisp เดิม ไม่เปลี่ยน
- cell 1024 (ปลายผ้า = sole 896 = 7/8, `displayRatio` 2) ย่อทั้ง cell ด้วย factor เดียว **.32 → cell 328** defringe, trim/dedup, WebP lossless ตรวจสร้างซ้ำพิกเซลต่อพิกเซล
- เลย์เอาต์ 30 เฟรม: 0 = seed; 1–4 Six-Hand Rend (`move1`), 5–8 Severing Bolt, 9–12 Fate Lash, 13–16 Call the Court (ท่าเรียก ไม่มีดาเมจ), 17–20 Shadow Tide, 21–24 Severed Crown (เฟส 70% `move6`); hit 25–26; down 27–29 (ค้างที่ 29)
- ขนาด: 1024×1774, decoded 6.93 MiB, download 1,850,434 B ภายในงบบอส (~2 MB / 8 MiB)
- ภาพนิ่ง/portrait ยังยืมของผู้คุม (`PLACEHOLDER_STILLS`); ทั้งสามบอสมี atlas ของตัวเองแล้ว

## ที่ยังไม่ได้ทำ/ไม่ได้ตรวจ

- ท่าที่ผู้เล่นต้องอ่านในศึกจริง (Call the Court เรียกลูกน้องกลับ, ราชสำนัก +n%) ไม่ได้ตรวจในศึกเต็มของบอสโลก (fixture ใช้บอสตัวเดียว ไม่มีลูกน้อง) — ควรดูเมื่อตั้ง `trio.from`
- ชื่อท่าไทยใน `intentName` ของ Morvane ทั้ง 6 ท่ายังไม่มี (ในศึกเห็นชื่ออังกฤษ)
- VFX วาดเฉพาะ: Severing Bolt, Call the Court, Fate Lash, Shadow Tide และเฟส Severed Crown ผ่านเทสต์ coverage ด้วยข้อยกเว้นที่ระบุชื่อ (`WORLD_BOSS_CODE_VFX` ใน `tests/presentation-coverage.test.ts`)
- `catalog.ts` เปลี่ยนบรรทัด art ของ Morvane จึงเปลี่ยน content version (deploy server+game ชุดเดียวกัน); ไม่มีกติกา/เซฟ/ตัวเลขเปลี่ยน; `presentedEncounters` เพิ่ม Morvane

## คลิป (390×844 เวลาจริง ไม่ retime)

| ไฟล์ | ความยาว | เฟรมที่จับ | ช่องว่างสูงสุด |
| --- | --- | --- | --- |
| `foe_morvane-six-hand-rend-enemy-down-normal-390.mp4` | 1.47 s | 77 | 0.072 s |
| `foe_morvane-shadow-tide-normal-normal-390.mp4` | 2.50 s | 123 | 0.237 s |
| `foe_morvane-call-the-court-normal-normal-390.mp4` | 2.50 s | 123 | 0.24 s |
| `foe_morvane-fate-lash-normal-normal-390.mp4` | 2.48 s | 123 | 0.231 s |
| `foe_morvane-six-hand-rend-normal-normal-390.mp4` | 2.45 s | 116 | 0.26 s |
| `foe_morvane-severed-crown-normal-normal-390.mp4` | 2.49 s | 120 | 0.246 s |
| `foe_morvane-severing-bolt-normal-normal-390.mp4` | 2.47 s | 118 | 0.216 s |

ภาพ `*-foe-390.png` / `*-hero-390.png` คือเฟรมที่ contact ของแต่ละท่า; `…-enemy-down-…` คือบอสล้ม (เฟรมท้ายถูกกล่องชัยชนะบัง ดูท่าล้มที่ ~0.8 s)

## ตรวจแล้ว

`npm run typecheck`, `npm run lint`, `npm run coverage:presentation` (อัปเดตแล้ว), `tests/unit-wbc.test.ts`, Chromium `tests/browser/unit-wbc.spec.ts` 11/11 (ท่า/hit/down/ลด motion/เร็ว/ปล่อย texture)
