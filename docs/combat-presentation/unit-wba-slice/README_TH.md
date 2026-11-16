# WB-A — Kragmor (World Boss) ตัวบอสในเกม

16 พฤศจิกายน 2026 · branch `claude/p11-05-trio-art-intake` · P11-05 ขั้น 5

**สถานะ: รอเจ้าของดูคลิปจริงและอนุมัติ motion ด้วยคำพูดของตัวเอง ก่อน merge** — ผลเทสต์/CI ไม่ใช่การอนุมัติภาพ คลิปเป็น Chromium/SwiftShader จำลองจอ 390×844 แบบสัมผัส ไม่ใช่มือถือจริงหรือ iOS Safari

## แหล่งภาพ

- Codex branch `art/art-unit-animation-wb-a-001` (`55f234f`), `incoming/ART-UNIT-ANIMATION-WB-A-001/`; ฐานของ branch นั้นเก่ากว่า feature จึงนำเข้าเฉพาะโฟลเดอร์ `incoming/` (ไม่ merge ทั้ง branch)
- SHA-256 ครบ 52 ไฟล์ตรง `validation.json` (`b4e3e42b204cddc6…`), decode PNG ได้ทุกไฟล์; `build_assets.py` ตรวจ hash ของ strip ซ้ำก่อนสร้าง atlas และยืนยันว่าเฟรมแรกของทุก strip (และเฟรมสุดท้ายยกเว้น down) เป็น seed ตรงทุกพิกเซล
- `anatomy-review.json` ของ Codex: 44 เฟรม 0 drift, 10 เฟรมวัดอัตโนมัติไม่ได้ (หัวก้ม/แขนบัง/ล้ม) ตรวจด้วยตา — **ไม่ใช่ผ่านการวัด** เจ้าของควรดูท่าเหล่านี้ในคลิป: Stone Fist เฟรม 5; Mountain Fall เฟรม 2–5; Boulder Hurl เฟรม 4; Fault Awakening เฟรม 2/4; down เฟรม 3/4

## Atlas และ registry

- identity ใหม่ `foe_kragmor` (sheet `kragmor`) ใช้โดย `wb-kragmor` เท่านั้น (บอส f1); Valdrakk/Morvane ยังใช้ `foe_sentinel` จนกว่า WB-B/WB-C
- cell 1024 (sole y=896 = 7/8, `displayRatio` 2 เหมือนบอส A9) ย่อทั้ง cell ด้วย factor เดียว **.27 → cell 276** แล้ว defringe, trim/dedup, pack WebP lossless ตรวจสร้างซ้ำพิกเซลต่อพิกเซล
- เลย์เอาต์ 30 เฟรม: 0 = seed; 1–4 Stone Fist (`move1`), 5–8 Titan Gathering, 9–12 Mountain Fall, 13–16 Rift Quake, 17–20 Boulder Hurl, 21–24 Fault Awakening (เฟส 70%, `move6`); hit 25–26; down 27–29 (ค้างที่ 29) — contact = เฟรมที่ 3 ของแต่ละท่า (recover แรก) เวลา contact มาจาก UI ไม่ใช่ FPS ภาพ
- ขนาด: 1280×1185, decoded 5.79 MiB, download 1,903,927 B ภายในงบบอสของ skill (~2 MB / 8 MiB) **แต่เกินงบ A9 เดิม (1.5 MB)**: Kragmor สูง ~74% ของ cell (บอส A9 ~49%) ที่ factor .30 ได้ 2.27 MB, .28 ได้ 2.03 MB (วัดจริง); จึงเลือก .27 (cell 276 px) ให้ได้ 1.90 MB — เจ้าของควรดูความคมของภาพในคลิป
- โหลดเฉพาะ encounter ที่ใช้ (`encounterUnitSheets`), ปล่อยเมื่อเปลี่ยน encounter (เทสต์ Chromium); รวมต่อ encounter ผ่าน `tests/encounter-budget.test.ts` (≤ 64 MiB)
- ภาพนิ่ง/portrait ยังยืมของผู้คุม (`PLACEHOLDER_STILLS`) จนกว่า Codex ส่งภาพของ Kragmor เอง (แบนเนอร์/ไอคอน)

## สิ่งที่ยังไม่ทำ (ตั้งใจ)

- ชื่อท่าไทยใน `intentName` (`src/ui/th.ts`) ของ Stone Fist / Titan Gathering / Mountain Fall / Rift Quake / Boulder Hurl / Fault Awakening: ในศึกยังเห็นชื่ออังกฤษ
- VFX วาดเฉพาะของท่าบอสโลก (Titan Gathering ชาร์จ, Fault Awakening) ยังไม่มี: Fault Awakening ผ่านเทสต์ครอบคลุมด้วยข้อยกเว้นที่ระบุชื่อ (`tests/presentation-coverage.test.ts`)
- `encounters` ไม่รวม Kragmor (เทสต์กติกา "advisor ชนะจาก HP เต็ม" ไม่ใช้กับบอสโลก) ใช้ `presentedEncounters` สำหรับ coverage/budget
- `src/content/encounters/catalog.ts` เปลี่ยนบรรทัด art ของ Kragmor จึงเปลี่ยน content version (hash ของ src/content): server กับเกมต้อง deploy ชุดเดียวกัน ไม่มีกติกา/เซฟ/ตัวเลขเปลี่ยน

## คลิป (390×844 เวลาจริง ไม่ retime)

| ไฟล์ | ความยาว | เฟรมที่จับ | ช่องว่างสูงสุด |
| --- | --- | --- | --- |
| `foe_kragmor-fault-awakening-normal-normal-390.mp4` | 2.51 s | 122 | 0.25 s |
| `foe_kragmor-boulder-hurl-normal-normal-390.mp4` | 2.50 s | 123 | 0.249 s |
| `foe_kragmor-titan-gathering-normal-normal-390.mp4` | 2.51 s | 122 | 0.238 s |
| `foe_kragmor-mountain-fall-normal-normal-390.mp4` | 2.47 s | 123 | 0.264 s |
| `foe_kragmor-stone-fist-enemy-down-normal-390.mp4` | 1.55 s | 82 | 0.09 s |
| `foe_kragmor-stone-fist-normal-normal-390.mp4` | 2.47 s | 119 | 0.25 s |
| `foe_kragmor-rift-quake-normal-normal-390.mp4` | 2.53 s | 123 | 0.229 s |

ภาพ `*-foe-390.png` / `*-hero-390.png` คือเฟรมที่ contact ของแต่ละท่า แต่ละคลิปรวมการโดนตีของบอสจริง (hit) จากคำสั่งของฝ่ายเรา; `…-enemy-down-…` คือบอสล้ม (เฟรมท้ายถูกกล่องชัยชนะบัง ดูท่าพังที่ ~0.9 s)

## ตรวจแล้ว

`npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage:presentation` (ตาราง/งบอัปเดตแล้ว), Chromium `tests/browser/unit-wba.spec.ts` 11/11 ท่า/hit/down/ลด motion/เร็ว/ปล่อย texture, `tests/unit-wba.test.ts` (intents, clips, layout, งบ)
