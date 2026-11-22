# ART-UI-LOBBY-002 — ส่งต่อภาพท่าค่าย

วันที่ 5 พฤศจิกายน 2026 (Asia/Bangkok) · **สร้างภาพแล้ว / ยังไม่นำเข้าเกม / รอเจ้าของเลือกภาพ**

- Branch `art/art-ui-lobby-002` จาก game branch commit `db09e3e775cd6c2853198003bc7682840823821d` ไม่ใช่ main
- อ่าน brief เต็มจาก `claude/camp-ux-4-3` commit `8ceffd18f120e9f7c7ed132e5fc280714f12f130` และ AGENTS/CLAUDE, คู่มือ prompt, LOBBY-001 ส่วน B/Requirements, placement rules, project skill `fateweave-codex-art-brief`
- เปลี่ยนไฟล์เฉพาะชุดนี้ตามคำสั่งเจ้าของ จึงเก็บ handoff ไว้ที่นี่แทนการแก้ CURRENT_STATE หรือ handoff log นอกขอบเขต ไม่ merge / ไม่ deploy

## สิ่งที่ส่ง

`lobby_poses_p03.webp` ขนาด 1536×2560, RGBA จริง, lossless / exact; 3 คอลัมน์ sit → cheer → idle_alt และ 5 แถว metta → lalin → kael → wynne → astrid

JSON ใช้ตำแหน่ง atlas เป็นพิกเซล ส่วน footY/seatY เป็นพิกเซลภายในเฟรม 512×512 (ไม่บวก row offset) `footY=496` คือแถวพิกเซลพื้นรองเท้า ส่วน alpha bbox เป็นขอบแบบ exclusive จึงอาจจบที่ 497 นอกจากนี้ท่อนซุง/ชายริบบิ้นอาจต่ำกว่ารองเท้า 1–2 px; ไม่ใช้ส่วนเหล่านั้นแทนตำแหน่งรองเท้า

seatY ตรวจจากผิวท่อนซุงที่รองรับตัวตามภาพ: Corin 365, Cerise 365, Kael 374, Wynne 375, Astrid 378 เป็นจุดอ้างอิงที่นั่งใต้เสื้อผ้า ไม่ใช่จุดนำไปย้ายรองเท้า runtime ยังคงใช้ footY

- `cells/`: ภาพท่าหลัก 15 ภาพก่อนรวม atlas
- `raw/`: ภาพเต็มจาก ImageGen 20 ภาพ รวมฉบับที่คัดออก พร้อมสาเหตุใน prompts.json; ห้ามนำ raw ทุกไฟล์เข้า runtime โดยไม่อ่าน selection.json
- `variants/`: Cerise-idle_alt R2 (ริบบิ้น) และ Kael-idle_alt R2 (พันผ้าพันมือ)
- `seeds/`, `seeds.json`: seed จริงและ crop ตัวอย่างท่อนซุง; `prompts.json` บันทึกคำสั่งจริง อ้างอิงจริง และ execution filename ที่เครื่องมือเปิดเผย ไม่ใส่ base64 หรือแต่ง provider generation id
- `selection.json`, `normalization.json`: ภาพที่เลือกเข้าสู่ atlas, uniform scale และ translation ที่ทำซ้ำได้
- `audit/*.json`, `validation.json`, `SHA256SUMS`: ผล anatomy, ขนาด/จำนวนไบต์/hash และ manifest ครอบคลุมไฟล์ส่งมอบ
- `build_handoff.py`, `verify_remote.py`: สร้างชุดและตรวจ bytes จาก Git ref ที่ fetch แล้ว

## Seed และภาพที่แนะนำ (ยังไม่ใช่อนุมัติของเจ้าของ)

metta/Corin และ lalin/Cerise ใช้ idle ใน `public/assets/art/units_mercs.webp` เฟรม 6/8 ตาม actorArt จริง: crop (0,1536,512,512)/(0,2048,512,512) ไม่ตีความเลขเฟรมเป็นเลขแถว

Kael ใช้ **NEW-003** เท่านั้น; Wynne/Astrid ใช้ NEW-002 ตาม brief ชุดและสีอิง seed เหล่านี้ ไม่มี Odran/Isolde

แนะนำ R1 ของ Cerise-idle_alt (ขยับพัด) และ Kael-idle_alt (ยืดแขนในท่าย่อ) เพราะอ่าน gesture ได้ชัดที่ 90px; ส่ง R2 ให้เทียบเป็นตัวเลือก ไม่รวมสองแบบใน atlas เดียวกัน `review/variants.png` เรียง seed / R1 / R2 / R1 กลับด้าน แถวบน Cerise แถวล่าง Kael

Corin-cheer ใช้ raw ฉบับ r2, Kael-idle_alt ใช้ raw ฉบับ r3 เป็น R1 ที่แนะนำหลังแก้สเกล; ชื่อ revision ของ raw แยกจากชื่อ R1/R2 สำหรับตัวเลือกส่งเจ้าของ

ฉบับคัดออก: Astrid-cheer แรกมีปื้นขาวด้านหลัง จึงสร้างทั้งท่าใหม่; Corin-cheer และ Kael-idle_alt แรกศีรษะเล็กลง (0.871/0.860 เท่า) จึงสร้างใหม่ ไม่ตัดต่อศีรษะ ไม่ลบปื้นด้วยโค้ด

## การสร้างและตรวจ

สร้างแต่ละท่าเป็นภาพเต็มหนึ่งภาพต่อ call มี seed แนบจริง ไม่ประกอบแขน/ขา/เสื้อผ้าหรือที่นั่งด้วยโค้ด โค้ดทำเฉพาะย่อทั้งภาพแบบสเกลเดียว, ตัด alpha dust ที่ต่ำกว่า 8/255, เลื่อนทั้งภาพ, รวม atlas และวางภาพสำหรับ review; ไม่ย่อหัวหรือลำตัวแยกกัน เก็บ raw เดิมครบ

รัน `python3 scripts/unit-anatomy-audit.py --cells <seed+ท่าของแต่ละคน>` จริงผ่าน build_handoff.py โดยใส่ seed เป็น 000.png เสมอ ตรวจท่าหลัก 15 + R2 2 รวม 17 ท่า วัดได้ครบ ไม่มีท่าที่ต้องยกเว้นว่า not-measured ทั้ง 5 ครั้ง exit code 0; รายเฟรม/สเกล/inliers ใน audit/*.json

ผลก่อนส่ง: median ต่อคนอยู่ราว 0.95–0.99 และค่าสูงสุด 1.034 ต่ำกว่าเกณฑ์ median ≤1.15 / ทุกเฟรม ≤1.20 ดูผลตัวเลขสุดท้ายใน validation.json

ตรวจด้วยตา: หน้าตา/ชุด/สี/ที่นั่ง, เท้า, ขอบโปร่งใส, ไม่มีเงาพื้น/ออร่า/เอฟเฟกต์, ไม่มีตัวอักษรอ่านได้ ลายบนป้ายของ Wynne เป็นรอยเย็บนามธรรมตาม prompt ไม่ใช่ข้อความ ส่วนดาวบนชุด Astrid เป็นงานปัก/เครื่องประดับที่เป็นวัตถุ ไม่ใช่ VFX

ตรวจภาพที่ 90px และกลับด้านทุกท่าใน `review/mirrored-90.png`; `review/silhouettes.png` เรียง seed / sit / cheer / idle_alt ที่ canvas สูง 90px; `review/poses-lineup.png` เรียงเหมือนกันด้วยสเกลเท่ากันทุกช่อง

`review/lobby-phone.png` ขนาด 390×844 เป็น **ภาพจำลองสำหรับตรวจงานอาร์ต** ใช้ตัวใหม่ครบ 5 คน + Guardian/Garran เดิมอีก 2 คน รวม 7 คนตามคำขอให้เทียบตัวเดิม ฉาก/ไฟ/ที่ก่อไฟมาจาก public เดิม ตัวด้านขวากลับด้านแล้ว มีเฉพาะเส้นขอบเขต HUD ไม่มี UI/data ที่แต่งขึ้น ไม่ใช่ screenshot ของ runtime ปัจจุบัน ซึ่งโค้ดที่อ่านยังจำกัดการวางสมาชิกไว้ 4 จุด จึงไม่อ้างว่าทดสอบทีม 5 คนในเกมแล้ว

Atlas ประมาณ 3 MB / decoded RGBA 15 MiB ตาม canvas ที่ brief กำหนด รักษารายละเอียดและสี ไม่ quantize เพื่อลดไฟล์ งบ 1.6 MB ใน LOBBY-001 เป็นงบ runtime รวมของชุดเดิม; atlas ใหม่นี้เกินตัวเลขนั้นและต้องให้ Claude พิจารณางบโหลด/การแพ็กตอน intake ห้ามอ้างว่าผ่านงบเดิม ดูจำนวนไบต์จริงใน validation.json

ไฟล์ public เดิมไม่เปลี่ยน Hash ของภาพที่ต้องรักษาอยู่ใน `protected-sha256.json` (รวม units, portraits, title, world camp และ lobby เดิม)

## ทำซ้ำ / ตรวจ remote

```bash
python3 incoming/ART-UI-LOBBY-002/build_handoff.py
git diff --check
git fetch origin art/art-ui-lobby-002
python3 incoming/ART-UI-LOBBY-002/verify_remote.py --ref FETCH_HEAD
```

ต้องมี Pillow, NumPy, OpenCV; ไม่ต้องรันทดสอบ gameplay เพราะไม่ได้แก้เกม verify_remote อ่านไฟล์ทุกไฟล์จาก Git object จริง เทียบ validation + SHA256SUMS + bytes local, decode PNG/WebP ทุกภาพด้วย Pillow และตรวจขอบเขต diff/ภาพเดิม ไม่รันโค้ดที่ดึงจาก remote

**ฝากถึง Claude:** นำเข้าหลังเลือกภาพตามขั้นตอนของเจ้าของ เพิ่ม p03 ใน lobbyPose() เป็นงาน integration แยกต่างหาก ตรวจงบโหลด/จำนวนจุดวางตัวและคลิปจริง 390px ตอน intake การผ่าน audit/hash/CI ไม่ใช่อนุมัติภาพหรือ motion ไม่มีการอนุมัติแทนเจ้าของในชุดนี้
