# Codex prompts — บอสโลกสามตัว (P11-05 §7)

16 พ.ย. 2026 · Claude เขียน prompt (ยังไม่มีภาพใหม่) · ตาม [คู่มือ prompt](ANIMATION_PROMPT_QUALITY_TH.md) และ skill `fateweave-codex-art-brief` · design [§7](../design/WORLD_BOSS_TRIO_P11_05_TH.md)

ลำดับส่ง: WB-A + แบนเนอร์ + ไอคอน ส่งแล้ว (PR #280/#281/#283; WB-A นำเข้าและเจ้าของอนุมัติ motion 2026-11-16) → **WB-B และ WB-C ส่งได้ตอนนี้ (ขนานกันได้เพราะเวลา)** · ภาพที่ใช้ได้กับการขยับในเกมต้องให้เจ้าของเลือกและอนุมัติเอง (Claude เลือกแทนได้ตามที่มอบหมาย 2026-11-04 แต่บันทึกเป็นการตัดสินของ Claude) ผลเทสต์/CI ไม่ใช่การอนุมัติ

## กติการ่วม (ใส่ทุกงาน)

```text
ขอบเขตงานที่ผู้ใช้อนุญาต:
- ทำภาพเท่านั้น branch art/<id ตัวเล็ก> จาก feature/fateweave-initial-prototype (ไม่ใช่ main) ไฟล์อยู่เฉพาะ incoming/<ID>/
- ห้ามแตะ src/ tests/ public/ .github/ ภาพเดิม และเอกสารสถานะ (CURRENT_STATE.md, docs/handoffs/) — เขียน handoff ใน NOTES.md ของ package
- ภาพต้นฉบับเท่านั้น ห้ามใช้ภาพ/ชื่อ/เนื้อหาจาก Asterveil: Rise Beyond · ไม่มีตัวอักษร โลโก้ หรือ UI ในภาพ
- เปิด PR เข้า feature/fateweave-initial-prototype แต่ไม่ merge · push ด้วย git ปกติ แล้ว fetch กลับมาตรวจ SHA-256 ทุกไฟล์เทียบ validation.json และ decode ด้วย Pillow (ไฟล์ >1MB เคยถูกตัด — ถ้าใช้ connector ให้แบ่ง .partN แบบ ART-UI-WORLDBOSS-001)
- ไฟล์ส่งมอบ: seeds/ (สำเนา seed ที่ใช้ + SHA), raw/ (ผล generator ทุก byte), preview 390px, prompts.json, seeds.json, strips.json (เฉพาะงาน motion), validation.json, NOTES.md, สคริปต์ handoff ที่ทำซ้ำได้ (python3 -I ... และ --verify)
- เกมไม่เปลี่ยน: กฎ เซฟ ตัวเลข เวลาเล่น ไม่ใช่งานนี้ ถ้าภาพต้องการการเปลี่ยนสิ่งเหล่านี้ ให้เขียนคำถามใน NOTES.md หัวข้อ "ฝากถึง Claude"
```

---

## WB-A — ART-UNIT-ANIMATION-WB-A-001 (Kragmor body motion) · ส่งก่อน

```text
เป้าหมาย:
ชุดท่าร่างกายของบอสโลก Kragmor (คราก์มอร์ ไททันรอยแยก) จาก seed A เพื่อให้ Claude ประกอบ atlas บอสใหม่แทนการยืมสไปรต์ผู้คุม (foe_sentinel)

บริบทเกมและไฟล์ที่ตรวจแล้ว:
- encounter wb-kragmor ใน src/content/encounters/catalog.ts (ท่าจริงของบอส f1 ด้านล่าง) · ภาพบอสในสนามใช้ displayRatio 2, sole 896/1024 (BOSS_SOLE ใน src/game/visuals/unit-frames.ts)
- ท่าบอสในเกมเล่นแบบ bossMove: เฟรมพร้อม → 2 เฟรมเตรียม → 2 เฟรมคืนท่า; hit 2 เฟรม, down 3 เฟรมค้างท่าล้ม (อ้างอิงรูปแบบ incoming/ART-UNIT-ANIMATION-A9-001)
- ไม่มีลูปยืน (idle) ในเกม: เฟรมพร้อม = seed เอง

ภาพอ้างอิงที่แนบ/เข้าถึงได้:
- seed: origin/art/art-char-worldboss-001 → incoming/ART-CHAR-WORLDBOSS-001/seed-a.png (1024×1024 RGBA หันซ้าย เท้า y≈896) + turnaround-a.png (แนวทางรูปทรงเท่านั้น seed เป็นหลัก) + concept-a.png
- ข้อมูล transform ใน seeds.json ของ package นั้น · แนบ seed-a.png ให้ generator ทุกครั้ง

ข้อกำหนดที่ยืนยันแล้ว:
- หันซ้าย ทุกเฟรมขนาดตัวเท่า seed (uniform scale เดียวทั้งชุด) เท้าแตะ y=896 ใน frame 1024×1024 ยกเว้นท่าที่ตั้งใจลอย/ย่อตัว (บันทึกใน strips.json)
- ล็อก: ผลึกมงกุฎ 5 ชิ้น, กรงเล็บ 3 นิ้วต่อมือ, แผลพลัง cyan กลางอกจุดเดียว, รอยแตกม่วงเป็นแสงรอง, มือใหญ่สองข้าง
- ห้ามใช้ขอบมือ/หินเป็นเส้นพื้น · เผื่อมือยกเหนือมงกุฎ ไม่ตัดขอบ · ช่องโปร่งใสระหว่างท่า ≥48px ใน raw sheet
- alpha จริง (ไม่มีลายตารางปลอม) · body เท่านั้น: ไม่วาดคลื่นกระแทก ฝุ่นใหญ่ ก้อนหินที่ปล่อยแล้ว หรือแสงระเบิด (VFX มาจากโค้ด/งานอื่น)

ท่า ทิศ จำนวนเฟรม และจังหวะ (ชื่อท่าตรงเกม):
1. stone-fist (Stone Fist 30, ตีเดี่ยวกายภาพ) 6 เฟรม: พร้อม(seed ตรง) → ง้างหมัดขวา → เอนตัวเต็มแรง → กระแทกไปทางซ้ายต่ำ → ตามแรง → คืนท่า(seed ตรง)
2. titan-gathering (Titan Gathering ชาร์จ ไม่มีดาเมจ) 6: พร้อม → มือทั้งสองเข้าหาอก → แผลอกสว่างขึ้น ไหล่ห่อ (ท่าค้างได้เป็นสัญญาณเตือน) → กดพลังลง → ยืดตัว → คืนท่า  [R1 แนะนำ: มือเข้าหาอก · R2: กำหมัดสองข้างทุบอกเบา ๆ]
3. mountain-fall (Mountain Fall 50 ตัดไม่ได้ ช่องหน้า) 6: พร้อม → ยกมือสองข้างประสานเหนือหัว → ย่อเข่าสูงสุด → ทุบลงพื้นด้านซ้าย (ตัวต่ำสุด) → ค้างหลังทุบ → คืนท่า
4. rift-quake (Rift Quake 14 ทั้งทีม) 6: พร้อม → ยกเท้าหน้า → ถ่ายน้ำหนัก → กระทืบ (ไม่มีคลื่นวาด) → สะเทือนตัว → คืนท่า
5. boulder-hurl (Boulder Hurl 26) 6: พร้อม → ล้วงหินจากพื้น/ไหล่ (หินติดมือ) → ง้างหลังหัว → ขว้าง มือยืดไปทางซ้าย หินหลุดมือแล้วไม่วาด → ตามแรง → คืนท่า
6. fault-awakening (เฟส 70% "Fault Awakening") 6: พร้อม → ก้มตัว → แผลอกและรอยแตกสว่าง แขนกาง → เงยหน้าคำราม (ปากเปิด) → ผ่อนลง → คืนท่า
7. hit 4: พร้อม → สะท้านถอยหลัง (ไปทางขวา) → ตั้งหลัก → คืนท่า
8. down 4: พร้อม → เข่าทรุด → ลำตัวพังลงเป็นกองหินครึ่งหนึ่ง → ค้างท่านอน (ไม่ลุก) แผลอกดับ

ขนาดเฟรม จุดยึด และรูปแบบไฟล์:
- raw: หนึ่งภาพต่อท่า สร้างทุก pose ของท่านั้นในภาพเดียวเรียงซ้ายไปขวา (whole strip) เพื่อให้สเกลเท่ากัน ไม่สร้างทีละเฟรม
- normalized: strips/<move>.png = N×(1024×1024) RGBA ต่อแถวเดียว ทุกเฟรมใช้ uniform scale เดียวกับ seed, เท้า y=896, x กลางตัวตาม seed; เฟรมแรก/สุดท้ายของท่าโจมตีและ hit = seed-a.png ทุก pixel
- strips.json: ต่อท่า → ไฟล์ raw, bbox ของแต่ละ pose ใน raw, scale, paste_xy, sole_y ที่วัดได้, หมายเหตุท่าที่ตั้งใจไม่แตะพื้น
- preview-390.png: แผ่นเทียบทุกท่าที่ความสูงบอสในสนาม (~160–170px ตาม preview-390-a ของ PR #263) + sentinel-compare: เฟรมพร้อมเทียบผู้คุมเดิม

คำอธิบายด้านภาพ:
ไททันหินผลึกมหึมา มวลหนัก เคลื่อนช้าแต่ทรงพลัง ท่าใหญ่ต้องอ่านออกจาก silhouette ที่สูง 160px: มือยกสูงชัด ทุบต่ำชัด ท่าชาร์จเห็นมือเข้าหาอกและอกสว่าง

Prompt สำหรับเครื่องมือสร้างภาพ (แนบ seed-a.png เป็น reference ทุกครั้ง; เปลี่ยน <MOVE POSES> ต่อท่า):
"Sprite animation strip of the SAME colossal crystal-stone rift titan from the attached reference, identical design, colors, proportions and lighting: five crystal crown shards, three-clawed massive stone hands, one cyan glowing fissure in the chest, secondary violet cracks. Facing left, side-on 3/4 game view, full body, feet on one flat ground line. Exactly <N> poses in one row, left to right: <MOVE POSES>. Same scale in every pose, wide empty transparent gaps between poses, nothing touching the image edges, transparent background (real alpha, no checkerboard, no floor, no shadow plate). No shockwaves, no dust clouds, no thrown rocks in flight, no explosions, no text, no UI."

งานปรับ asset และ metadata (Codex):
ตัดแต่ละ pose ด้วย alpha bbox → ย่อ/ขยายด้วย scale เดียวของชุด (วัดจากเฟรมพร้อมให้ตรง seed) → วางลง 1024×1024 ที่เท้า y=896 → บันทึก strips.json · ห้ามยืด/ย่อรายเฟรมเพื่อให้ "พอดี" — ถ้า pose ล้น frame ให้สร้างใหม่แทน

งานนำเข้าเกมและการเปลี่ยนสถานะ (Claude ภายหลัง ไม่ใช่งาน Codex):
lossless atlas ใหม่ (sheet kragmor), registry move1…, encounter-only loading, presentation coverage, unit-anatomy-audit, คลิป 390px ให้เจ้าของอนุมัติ motion

เกณฑ์ตรวจรับ:
- มงกุฎ 5 ชิ้น/กรงเล็บ 3 นิ้ว/แผลอกจุดเดียวครบทุกเฟรม ไม่มีอวัยวะงอกหรือหาย
- สเกลตัวทุกเฟรมห่างจาก seed ไม่เกิน ±4% (วัดความสูงลำตัวไม่รวมมือยก) · เท้าอยู่ที่ y=896 ±3px ยกเว้นที่บันทึกไว้
- ไม่มีส่วนใดตัดขอบ frame · ไม่มี VFX ในร่าง · alpha จริง
- strips.json, validation.json ตรงไฟล์จริง และ --verify ผ่านหลัง fetch กลับ

สมมติฐานและข้อมูลที่ยังขาด:
- เวลาเล่นต่อเฟรมเป็นของ Claude ตอนนำเข้า · ถ้า generator ทำ 6 pose ในภาพเดียวไม่ได้ ให้ลด 1 pose กลาง แล้วบันทึกใน NOTES (ห้ามแยกสร้างทีละเฟรม)
```

---

## แบนเนอร์ — ART-UI-WORLDBOSS-002 (สามบอส + การ์ดรวม) · ส่งคู่ WB-A ได้

```text
เป้าหมาย:
หัวการ์ดแท็บบอสโลกในค่าย (แทน banner ผู้คุมของ ART-UI-WORLDBOSS-001) หนึ่งใบต่อบอส + การ์ดรวมสามตัวสำหรับหน้าค่าย

บริบทเกมและไฟล์ที่ตรวจแล้ว:
- แท็บบอสโลกอยู่ใน src/ui/world-boss-panel.ts (DOM) ข้อความชื่อบอส/สิทธิ์/ดาเมจเป็นตัวอักษร DOM สีขาววางทับครึ่งซ้าย · กรอบ 390px ของเกม (แบนเนอร์แสดงกว้าง ~358px)
- รูปแบบอ้างอิง: origin/art/art-ui-worldboss-001 → incoming/ART-UI-WORLDBOSS-001/ (R1 banner 1080×360 + handoff.py + การวัด contrast)

ภาพอ้างอิง: seed-a.png / seed-b.png / seed-c.png + concept-a/b/c.png จาก PR #263 (incoming/ART-CHAR-WORLDBOSS-001) · ฉาก public/assets/art/battle_riftline.webp (แนบ)

ข้อกำหนดที่ยืนยันแล้ว:
- banner_kragmor / banner_valdrakk / banner_morvane: 1080×360 RGB, PNG + lossless WebP ตรงกันทุก pixel
- banner_trio: 1080×288 RGB สามตัวในภาพเดียว (A กลาง-หลัง, B ซ้าย, C ขวา หรือข้อเสนออื่นที่อ่านได้ที่ 358px) 
- ครึ่งซ้าย (x<540) มืดพอให้ตัวอักษรขาว contrast ≥4.5:1 ทุก pixel (วัดและบันทึกใน validation.json เหมือน ART-UI-WORLDBOSS-001) · บอสอยู่ครึ่งขวา
- รูปลักษณ์ตาม seed (มงกุฎ 5/กรงเล็บ 3 ของ A; สี่ขา ปีกสองข้างชู หางเดียว แกนพลังไหล่ซ้าย ของ B ห้าม mirror; หกแขนสามคู่ ผ้าคลุมสามแฉก แกนอก ของ C) · ไม่มีตัวอักษร โลโก้ UI หรือฮีโร่
- emblem ต่อบอส 256×256 RGBA (หน้าบอสในกรอบ อ่านออกที่ 40px) แบบ emblem_worldboss

Prompt (ต่อบอส แนบ seed + concept + battle_riftline):
"Wide cinematic banner, 3:1, the SAME <BOSS DESCRIPTION> from the attached reference on the right half, dramatic low angle, rift-torn night sky with cyan and violet light; the left half fades into very dark navy smoke for overlaid white text. No text, no logo, no UI, no other characters."

เกณฑ์ตรวจรับ: ขนาด/โหมดตรง · contrast ครึ่งซ้าย ≥4.5:1 ทุก pixel · รูปลักษณ์ตรง seed (เจ้าของตัดสิน) · preview_390.png จำลองการ์ดที่ 358px พร้อมข้อความไทยวางทับเพื่อจำลองเท่านั้น
```

---

## ไอคอนของบอส — ART-ITEM-WB-TRIO-001 · ส่งคู่ WB-A ได้

```text
เป้าหมาย:
ไอคอนของสามชิ้นที่สร้างจากเศษบอส (พลังเป็นของจริงในเกมแล้ว save v65): bulwark เกราะอก / breaker ถุงมือ / reaper หมวก

บริบทเกมและไฟล์ที่ตรวจแล้ว:
- atlas ไอคอนอุปกรณ์ public/assets/ui/equip/gear_items.webp (1280×1152 RGBA) + src/game/visuals/equip/gear_items.json: ช่อง 128×128 · ของบอสเดิม boss_aegis / boss_focus / boss_lantern (x 640–896, y 896) เป็นแบบอย่าง
- DOM วางเครื่องหมาย ◆ ของบอสและตราชุดอุปกรณ์ทับเอง (src/ui/equip-art.ts) → ห้ามวาด ◆ หรือตราชุดลงในไอคอน

ภาพอ้างอิง: crop ไอคอน boss_aegis/boss_focus/boss_lantern และ body/gloves/head legendary ที่มีอยู่จาก gear_items.webp (แนบ) + seed-a/b/c.png

ข้อกำหนดที่ยืนยันแล้ว:
- boss_bulwark.png: เกราะอกหินผลึกของ Kragmor (แผล cyan กลางอก ขอบผลึก 5 แฉก)
- boss_breaker.png: ถุงมือกรงเล็บผลึกของ Valdrakk (ลายปีก แกนพลังที่ข้อมือ)
- boss_reaper.png: มงกุฎ/หมวกด้ายขาดของ Morvane (ด้ายเงาขาดสามเส้น แกนกลาง)
- 128×128 RGBA alpha จริง มุมโปร่งใส · มุมมอง แสง เส้นขอบ ความอิ่มสีเท่าไอคอนเดิม (กรอบ legendary เดิมถ้าไอคอนเดิมมี) · อ่านออกที่ 40px และ 64px
- ไม่มีตัวอักษร ◆ หรือตราชุด

Prompt (ต่อชิ้น แนบ crop ไอคอนเดิม + seed):
"Single game equipment icon in exactly the same style, angle, outline weight and lighting as the attached reference icons: <ITEM>, inspired by the attached boss. Centered, fills about 80% of a square canvas, transparent background (real alpha), no text, no symbols, no frame unless the reference icons have one."

เกณฑ์ตรวจรับ: ขนาด/alpha ตรง · preview แสดงสามชิ้นข้างไอคอนเดิมที่ 40/64/128px · validation.json/--verify ผ่าน · ไม่แก้ gear_items.webp (Claude repack lossless เอง)
```

---

## WB-B — ART-UNIT-ANIMATION-WB-B-001 (Valdrakk) · **ส่งได้แล้ว** (เจ้าของอนุมัติ motion WB-A 2026-11-16, PR #282 merge แล้ว)

ฉบับนี้ครบในตัว (ไม่ต้องอ้างแม่แบบ WB-A) · ใช้ package `incoming/ART-UNIT-ANIMATION-WB-A-001/` (อยู่ในสาขาเกมแล้ว) เป็นแบบอย่างรูปแบบไฟล์ ซึ่ง Claude นำเข้าได้โดยไม่ต้องแก้ pipeline

```text
เป้าหมาย:
ชุดท่าร่างกายของบอสโลก Valdrakk (วัลดรัค อสูรโลกแตก) จาก seed B เพื่อให้ Claude ประกอบ atlas บอสใหม่ (sheet valdrakk) แทนการยืมสไปรต์ผู้คุม (foe_sentinel)

บริบทเกมและไฟล์ที่ตรวจแล้ว:
- encounter wb-valdrakk ใน src/content/encounters/catalog.ts: บอส f1 SPD 125, ท่าจริง Shard Talon (กายภาพ) · Wing Gust (พลังงาน) · Wing Gathering (ชาร์จ ไม่มีดาเมจ ทำลายได้) · Worldshard Dive (ทั้งทีม พลังงาน) · เฟส 70% "Sky Rend" · และท่าที่เอนจินสร้างเอง "Staggered" (ไม่มีดาเมจ เกิดเมื่อชาร์จถูกตัด: เสียหลักแทนที่ Dive รอบถัดไป)
- ในเกมบอสเล่นแบบ bossMove: เฟรมพร้อม(seed) → 2 เฟรมเตรียม → 2 เฟรมคืนท่า → seed; hit 2 เฟรม; down 3 เฟรมค้างท่าล้ม · displayRatio 2, sole 896/1024 · ไม่มี idle loop (เฟรมพร้อม = seed)
- Claude จะประกอบเป็น atlas 30 เฟรม: 0 = seed; move1–6 ท่าละ 4 เฟรม (strip เฟรม 2–5); hit 2; down 3 — ตามงาน WB-A

ภาพอ้างอิงที่แนบ/เข้าถึงได้ (แนบ seed ให้ generator ทุกครั้ง):
- seed: origin/art/art-char-worldboss-001 commit 46f366dc931e4994d3a6ccd9ad3951ac444a70cf → incoming/ART-CHAR-WORLDBOSS-001/seed-b.png (1024×1024 RGBA หันซ้าย เท้า y≈896; ตัวกว้าง x 89–934, สูง y 170–899) + turnaround-b.png (รูปทรงเท่านั้น seed เป็นหลัก) + concept-b.png + seeds.json (transform)
- layout: incoming/ART-UNIT-ANIMATION-WB-A-001/references/layout-6.png (6 ช่อง) และ layout-4.png (4 ช่อง) ใช้ซ้ำได้ ตรวจว่า seed-b พอดีช่องก่อน (ตัวกว้างกว่า Kragmor ถ้าไม่พอให้สร้าง layout ใหม่ในสัดส่วนเดียวกันและบันทึก)

ข้อกำหนดที่ยืนยันแล้ว:
- หันซ้าย ห้าม mirror seed · uniform scale เดียวทั้งชุดเท่า seed · เท้าหน้า/หลังที่รับน้ำหนักแตะ y=896 (ยกเว้นท่าที่ตั้งใจย่อ/ลอยบันทึกใน strips.json)
- ล็อกภาพจำ: สี่ขากรงเล็บทอง · ปีกผลึกม่วงสองข้างชูขึ้น (ข้างหลังอีกข้างอยู่ฝั่งไกลกล้อง) · หางเดียวม้วนโค้งขึ้นด้านขวา ปลายสว่างฟ้า · แกนพลังวงกลมสีฟ้าหนึ่งดวงบนไหล่ด้านใกล้กล้อง (ไหล่ซ้ายของสัตว์) · ตาสีฟ้า · ห้ามเพิ่มแขน/ขา/ปีกที่สาม
- ปีกชูหรือพับตลอด ห้ามกางแนวนอน (ล้ม frame) ยอดปีกใน seed อยู่ y≈170 ดังนั้นทุกเฟรมต้องมีที่ว่างบน ≥32px และซ้าย/ขวา ≥32px
- ช่องโปร่งใสระหว่างท่าใน raw sheet ≥48px · alpha จริง ไม่มีลายตารางปลอม · body เท่านั้น: ไม่วาดลม แสง ฝุ่น คลื่น เศษผลึกที่หลุดตัว หรือเงาพื้น (VFX มาจากโค้ด/งานอื่น)
- บทเรียนจาก WB-A (ช่วยให้ผ่านรอบแรก): (1) เฟรมที่หัวก้ม/แขนบัง ทำให้เครื่องวัดกายวิภาคอัตโนมัติวัดไม่ได้ 10 จาก 44 เฟรม — ท่าหลักให้เห็นหัวและแกนไหล่ชัดเมื่อทำได้ ไม่ให้ปีกบังหัวหรือแกนทั้งหมด (down เป็นข้อยกเว้น) (2) เฟรมแรก/สุดท้ายของทุกท่า (ยกเว้น down) ต้องเป็น seed ตรงทุก pixel (3) ตัวใหญ่เต็มช่องทำให้ atlas ต้องย่อ — อย่าขยายตัวเกิน seed

ท่า ทิศ จำนวนเฟรม และจังหวะ (ชื่อท่าตรงเกม; 6 เฟรมต่อท่าหลัก; ผู้ดูควรเห็นการเปลี่ยนใหญ่ทุกเฟรม):
1. shard-talon (Shard Talon ตะปบกายภาพ) 6: พร้อม(seed ตรง) → ยกอุ้งเท้าหน้าขวาสูงถอยหลังตัวเล็กน้อย → ย่อตัวหลัง เอนหน้า เล็งต่ำ → ตะปบลงซ้ายต่ำ (เล็บถึงพื้น) → ตามแรง ตัวต่ำ → คืนท่า(seed ตรง)
2. wing-gust (Wing Gust พลังงาน) 6: พร้อม → หุบปีกลงเล็กน้อย → ยกปีกสองข้างสูง/ตั้ง สูดอก → สะบัดปีกไปข้างหน้าทางซ้าย (ปีกอยู่ในเฟรม ไม่วาดลม) → ปีกตามแรง → คืนท่า
3. wing-gathering (Wing Gathering ชาร์จ ไม่มีดาเมจ ท่าค้างเตือน) 6: พร้อม → ปีกเริ่มพับเข้า → ปีกพับแนบหลัง/คลุมไหล่หลัง ตัวย่อ ย่อเข่า (แกนไหล่ด้านใกล้กล้อง**ต้องยังมองเห็น** และสว่างขึ้น) → กดตัวต่ำสุด พลังอัด → เริ่มคลาย → คืนท่า [R1 แนะนำ: ปีกพับแนบหลัง · R2: ปีกหุบเป็นโดมเหนือหลัง]
4. worldshard-dive (Worldshard Dive ทั้งทีม) 6: พร้อม → ย่อหลัง ปีกกางเฉียงหลัง → ยกก้นขึ้น โน้มหัวต่ำ → พุ่งต่ำไปทางซ้าย (แสดงด้วยการลดส่วนหน้า/ยืดส่วนหลัง ตัวยังอยู่ในเฟรม ขอบซ้ายขยับเกินตำแหน่ง seed ไม่เกิน ~40px) → ไถลหยุด ตัวต่ำ → คืนท่า
5. staggered (Staggered: เสียหลักหลังถูกตัดชาร์จ ไม่มีดาเมจ) 6: พร้อม → สะดุ้ง ปีกข้างหนึ่งหลุดจากแนว → ปีกข้างหน้าตก ตัวเอียง ขาหน้าอ่อน → หัวส่ายต่ำ ตาพร่า → ตั้งหลัก → คืนท่า [R1 แนะนำ: ปีกข้างหนึ่งตก · R2: สะบัดหัวมึนปีกคงชู]
6. sky-rend (เฟส 70% "Sky Rend") 6: พร้อม → ย่อตัว → ชูปีกสองข้างสูงสุด (แนวปีกสว่างภายในตัวปีก ไม่มีแสงนอกร่าง) → ยืดคอเงยหน้าคำราม ปากเปิด → ผ่อนลง → คืนท่า
7. hit 4: พร้อม → สะท้านถอยหลัง (ไปทางขวา) → ตั้งหลัก → คืนท่า
8. down 4: พร้อม → ขาหน้าทรุด → ตะแคงล้ม ปีกพับทับตัว → นอนตะแคงค้าง ไม่ลุก แกนไหล่ดับ

ขนาดเฟรม จุดยึด และรูปแบบไฟล์ (เหมือน WB-A):
- raw: หนึ่งภาพต่อท่า สร้างทุก pose ของท่านั้นในภาพเดียวเรียงซ้ายไปขวา (whole strip) ไม่สร้างทีละเฟรม; ถ้าทำ 6 pose ในภาพเดียวไม่ได้ ให้ลด 1 pose กลางแล้วบันทึกใน NOTES (ห้ามแยกสร้างทีละเฟรม)
- normalized: strips/<move>.png = N×(1024×1024) RGBA แถวเดียว uniform scale เดียวกับ seed (วัดจาก shard-talon เฟรมพร้อมครั้งเดียว) เท้า y=896 x กลางตัวตาม seed; ผล: 6 ท่า×6 + hit 4 + down 4 = 44 เฟรม
- strips.json (ต่อท่า: raw, bbox แต่ละ pose, scale, paste_xy, sole_y ที่วัด, ข้อยกเว้น) · preview-390.png (ทุกเฟรมสเกลเดียว บอสสูง ~160px) + preview-keyposes-390.png + previews/<move>.webp ขนาด 390×280 + compare กับผู้คุมเดิม · anatomy audit ด้วย scripts/unit-anatomy-audit.py ผ่าน audit_anatomy.py (ดูแบบอย่าง WB-A) พร้อม anatomy-review.json สำหรับเฟรมที่วัดไม่ได้

คำอธิบายด้านภาพ:
อสูรสี่ขาคล้ายสิงห์ปีกผลึก เร็วและดุ ท่าต้องอ่านจาก silhouette ที่สูง 160px: ตะปบ = อุ้งเท้าหน้ายกสูงแล้วลงต่ำชัด, ชาร์จ = ปีกพับ ตัวต่ำ แกนไหล่สว่าง (สัญญาณให้ผู้เล่นตัดจังหวะ), Dive = หัวต่ำตัวลาด, เสียหลัก = ปีกตกข้างเดียวและตัวเอียง ต่างจากท่าอื่นอย่างชัดเจน

Prompt สำหรับเครื่องมือสร้างภาพ (แนบ seed-b.png และ layout เป็น reference ทุกครั้ง; เปลี่ยน <N> และ <MOVE POSES>):
"Sprite animation strip of the SAME four-legged worldshard behemoth from the attached reference, identical design, colors, proportions and lighting: crystal-scaled violet body with gold thorn trim, two raised crystal wings, ONE curved tail with a glowing cyan tip, ONE round cyan power core on the near-side (left) shoulder, cyan eyes, golden claws. Facing left, side-on 3/4 game view, full body, feet on one flat ground line. Exactly <N> poses in one row, left to right: <MOVE POSES>. Same scale in every pose, never enlarged beyond the reference, wide empty transparent gaps between poses, nothing touching the image edges, wings always raised or folded (never spread horizontally), the core stays on the same shoulder (never mirrored), exactly four legs, two wings, one tail in every pose. Transparent background (real alpha, no checkerboard, no floor, no shadow plate). No wind, no light beams, no dust, no shockwaves, no detached crystal shards, no explosions, no text, no UI."

งานปรับ asset และ metadata (Codex): ตัดแต่ละ pose ด้วย alpha bbox → scale เดียวของชุด → วางลง 1024×1024 ที่ y=896 → strips.json · ห้ามยืด/ย่อรายเฟรมเพื่อให้ "พอดี" ถ้า pose ล้นให้สร้างใหม่

งานนำเข้าเกมและการเปลี่ยนสถานะ (Claude ภายหลัง ไม่ใช่งาน Codex): atlas lossless sheet valdrakk (identity foe_valdrakk, move1–6), encounter-only loading, presentation coverage, คลิป 390px ให้เจ้าของอนุมัติ motion

เกณฑ์ตรวจรับ:
- นับ ขา 4 / ปีก 2 / หาง 1 / แกนไหล่ 1 ทุกเฟรม แกนอยู่ไหล่ด้านใกล้กล้องทุกเฟรม (ยกเว้น down ที่แกนดับแต่ตำแหน่งเดิม)
- สเกลตัวห่างจาก seed ไม่เกิน ±4% (วัดความยาวลำตัวไม่รวมปีกและหาง) · เท้าที่รับน้ำหนัก y=896 ±3px ยกเว้นที่บันทึกไว้
- ไม่มีส่วนใดตัดขอบ frame · ไม่มี VFX ในร่าง · alpha จริง · เฟรมแรก/สุดท้ายตรง seed (ยกเว้น down)
- staggered อ่านต่างจาก hit และ down ได้ที่ 160px
- strips.json, validation.json ตรงไฟล์จริง และ --verify ผ่านหลัง fetch กลับ

ขอบเขตงานที่ผู้ใช้อนุญาต: (ใส่ "กติการ่วม" ด้านบนทั้งบล็อก) · branch art/art-unit-animation-wb-b-001 จาก feature/fateweave-initial-prototype (ฐานล่าสุดรวม WB-A แล้ว) · เจ้าของเลือกภาพและอนุมัติ motion เอง ผล CI/เทสต์ไม่ใช่การอนุมัติ
```

## WB-C — ART-UNIT-ANIMATION-WB-C-001 (Morvane) · **ส่งได้แล้ว** (ส่งขนานกับ WB-B ได้เพราะเวลา; บทเรียนจาก WB-B ที่จะได้ภายหลังให้ Claude แจ้งกลับ)

ฉบับนี้ครบในตัว · ใช้ package `incoming/ART-UNIT-ANIMATION-WB-A-001/` (อยู่ในสาขาเกมแล้ว) เป็นแบบอย่างรูปแบบไฟล์

```text
เป้าหมาย:
ชุดท่าร่างกายของบอสโลก Morvane (มอร์เวน ราชันด้ายขาด) จาก seed C เพื่อให้ Claude ประกอบ atlas บอสใหม่ (sheet morvane) แทนการยืมสไปรต์ผู้คุม (foe_sentinel)

บริบทเกมและไฟล์ที่ตรวจแล้ว:
- encounter wb-morvane ใน src/content/encounters/catalog.ts: บอส f1 SPD 80, ท่าจริง Six-Hand Rend (กายภาพ ตีเดี่ยว) · Severing Bolt (พลังงาน) · Fate Lash (พลังงาน) · Call the Court (ไม่มีดาเมจ: เรียกลูกน้องที่ล้มกลับ) · Shadow Tide (ทั้งทีม พลังงาน) · เฟส 70% "Severed Crown"
- ลูกน้อง (มือเงา f2/f3 + วิญญาณ b2) ใช้สไปรต์ crawler/wisp เดิมของเกม **ไม่ต้องทำภาพใหม่**
- ในเกมบอสเล่นแบบ bossMove: เฟรมพร้อม(seed) → 2 เฟรมเตรียม → 2 เฟรมคืนท่า → seed; hit 2 เฟรม; down 3 เฟรมค้างท่าล้ม · displayRatio 2, sole 896/1024 · ไม่มี idle loop (เฟรมพร้อม = seed)
- Claude จะประกอบเป็น atlas 30 เฟรม: 0 = seed; move1–6 ท่าละ 4 เฟรม (strip เฟรม 2–5); hit 2; down 3 — ตามงาน WB-A

ภาพอ้างอิงที่แนบ/เข้าถึงได้ (แนบ seed ให้ generator ทุกครั้ง):
- seed: origin/art/art-char-worldboss-001 commit 46f366dc931e4994d3a6ccd9ad3951ac444a70cf → incoming/ART-CHAR-WORLDBOSS-001/seed-c.png (1024×1024 RGBA หันซ้าย; ตัวกว้าง x 191–832 สูง y 134–897) + turnaround-c.png (รูปทรงเท่านั้น seed เป็นหลัก) + concept-c.png + seeds.json (transform)
- layout: incoming/ART-UNIT-ANIMATION-WB-A-001/references/layout-6.png (6 ช่อง) และ layout-4.png (4 ช่อง) ตัวสูง ~74% ของ cell เท่า Kragmor ตรวจว่า seed-c พอดีช่อง ถ้าไม่พอให้สร้าง layout ใหม่ในสัดส่วนเดียวกันและบันทึก

ข้อกำหนดที่ยืนยันแล้ว:
- ทิศตาม seed ห้าม mirror · uniform scale เดียวทั้งชุดเท่า seed (วัดจาก six-hand-rend เฟรมพร้อมครั้งเดียว)
- **ลอยตัว ไม่มีเท้า**: ปลายผ้าคลุมแฉกกลาง (จุดต่ำสุดใน seed y≈897) = เส้นพื้นเสมือน y=896 ในเฟรมพร้อม · ท่าที่ตั้งใจลอยขึ้น/ลงได้ไม่เกิน ~24px (บันทึก sole_y ที่วัดใน strips.json) · ปลายผ้าห้ามต่ำกว่า y=899 ยกเว้น down ที่ผ้ากองกับพื้น (ปลายผ้าห้ามทับพื้นที่แถบ HP ใต้ตัว)
- ล็อกภาพจำ: **แขนสามคู่** — คู่บนชูสูงมีปลอกทองที่ปลายแขน · คู่กลางใหญ่ปลอกทองขนาดใหญ่ (ใน seed ข้างหนึ่งเหยียดไปทางซ้าย อีกข้างพาดเข้าหน้าอก) · คู่ล่างเล็กที่เอว มือแนบกันหน้าท้อง · จับคู่ตามตำแหน่ง/ปลอก ห้ามสลับคู่หรือเพิ่ม/ลดแขน · ผ้าคลุมสามแฉกแทนขา · แกนพลัง cyan กลมหนึ่งดวงกลางอก · มงกุฎทองลอยเหนือศีรษะ · ไม่มีขา
- ช่องว่างด้านบน: ยอดมงกุฎ seed อยู่ y≈134 ทุกเฟรมต้องมีที่ว่าง ≥32px บน/ซ้าย/ขวา (แขนชูสูงต้องไม่ล้น)
- ช่องโปร่งใสระหว่างท่าใน raw sheet ≥48px · alpha จริง ไม่มีลายตารางปลอม · body เท่านั้น: ไม่วาดลูกพลัง ด้านทอง เส้นด้ายยาวออกนอกตัว รอยแยกใหญ่ ควัน แสงนอกร่าง (VFX มาจากโค้ด/งานอื่น) — Call the Court อนุญาตรอยแยกเล็กที่ติดปลายมือเท่านั้น
- บทเรียนจาก WB-A: (1) เฟรมที่หัวก้ม/แขนบัง ทำให้เครื่องวัดกายวิภาคอัตโนมัติวัดไม่ได้ 10 จาก 44 เฟรม — ท่าหลักให้เห็นหัว มงกุฎ และแกนอกชัดเมื่อทำได้ (down เป็นข้อยกเว้น) (2) เฟรมแรก/สุดท้ายของทุกท่า (ยกเว้น down) ต้องเป็น seed ตรงทุก pixel (3) ตัวใหญ่เต็มช่องทำให้ atlas ต้องย่อ — อย่าขยายตัวเกิน seed

ท่า ทิศ จำนวนเฟรม และจังหวะ (ชื่อท่าตรงเกม; 6 เฟรมต่อท่าหลัก; แต่ละเฟรมต้องเห็นการเปลี่ยนชัด):
1. six-hand-rend (Six-Hand Rend กายภาพ แขนคู่กลางฟาด) 6: พร้อม(seed ตรง) → คู่กลางดึงถอยเข้าหาตัว กรงเล็บกาง คู่บนยกสูง → คู่กลางกางออกข้างสุด ลำตัวหมุนไปขวาเล็กน้อย (anticipation) → ฟาดคู่กลางลงทางซ้ายพร้อมกัน ลำตัวโน้มซ้าย → ตามแรง ผ้าคลุมพลิ้วตาม → คืนท่า(seed ตรง)
2. severing-bolt (Severing Bolt พลังงาน มือคู่ล่างรวมพลังยิง) 6: พร้อม → คู่ล่างยกขึ้นประกบกันหน้าอก → คู่ล่างดึงห่างกันเป็นรูปเตรียมยิง แกนอกสว่างขึ้น (ไม่มีลูกพลังในมือ) → คู่ล่างผลักไปข้างหน้าทางซ้าย มือเปิด → ตามแรง ปรับตัว → คืนท่า
3. fate-lash (Fate Lash พลังงาน แขนคู่บนสะบัดด้าย) 6: พร้อม → คู่บนลดลงมาตรงหน้า นิ้วเหมือนจับด้าย → คู่บนยกสูงสุดไขว้เหนือหัว (ไม่วาดด้าย) → สะบัดคู่บนเฉียงลงทางซ้าย → ตามแรง → คืนท่า
4. call-the-court (Call the Court ไม่มีดาเมจ ท่าเตือน) 6: พร้อม → คู่บนยกสองข้าง → คู่บนเปิดแยกกันเหนือหัวเหมือนฉีกม่าน (รอยแยกเล็กติดปลายมือเท่านั้น) → ค้างเปิดสูงสุด ตัวเงยเล็กน้อย แกนอกสว่าง → ปล่อยมือลงช้า → คืนท่า [R1 แนะนำ: คู่บนฉีกม่านเหนือหัว · R2: ทุกคู่ยื่นลงหาพื้น เรียกจากเงา]
5. shadow-tide (Shadow Tide ทั้งทีม พลังงาน) 6: พร้อม → หกแขนหุบเข้าหาตัว → หกแขนกางลงต่ำสองข้าง ผ้าคลุมพองเล็กน้อย → กดพลังลง ตัวลอยต่ำลงเล็กน้อย ผ้าคลุมแผ่ในเฟรม → ตามแรง → คืนท่า
6. severed-crown (เฟส 70% "Severed Crown") 6: พร้อม → ก้มตัว หดแขน → ศีรษะเงย ยกคู่บนสุด แกนอกและขอบผ้าคลุมสว่างขึ้นในตัวภาพ มงกุฎสว่าง → ค้างพีค คำราม → ผ่อนลง → คืนท่า
7. hit 4: พร้อม → สะท้านถอยหลัง (ไปทางขวา) ผ้าคลุมกระพือ → ตั้งหลัก → คืนท่า
8. down 4: พร้อม → ตัวทรุดลง แขนห้อย → ผ้าคลุมยุบลงกองกับพื้น แกนดับ → นอนกองค้าง ไม่ลุก (ท่านี้ผ้าติดพื้นที่ y=896)

ขนาดเฟรม จุดยึด และรูปแบบไฟล์ (เหมือน WB-A):
- raw: หนึ่งภาพต่อท่า สร้างทุก pose ของท่านั้นในภาพเดียวเรียงซ้ายไปขวา (whole strip) ไม่สร้างทีละเฟรม; ถ้าทำ 6 pose ในภาพเดียวไม่ได้ ให้ลด 1 pose กลางแล้วบันทึกใน NOTES (ห้ามแยกสร้างทีละเฟรม)
- normalized: strips/<move>.png = N×(1024×1024) RGBA แถวเดียว uniform scale เดียวกับ seed, x กลางตัวตาม seed; ผล: 6 ท่า×6 + hit 4 + down 4 = 44 เฟรม
- strips.json (ต่อท่า: raw, bbox แต่ละ pose, scale, paste_xy, sole_y ที่วัด, ข้อยกเว้นลอยตัว) · preview-390.png (ทุกเฟรมสเกลเดียว บอสสูง ~160px) + preview-keyposes-390.png + previews/<move>.webp ขนาด 390×280 + compare กับผู้คุมเดิม · anatomy audit ด้วย scripts/unit-anatomy-audit.py ผ่าน audit_anatomy.py (ดูแบบอย่าง WB-A) พร้อม anatomy-review.json สำหรับเฟรมที่วัดไม่ได้

คำอธิบายด้านภาพ:
ราชันเงาลอยตัวหกแขน ดูสง่าและน่ากลัว ท่าต้องอ่านจาก silhouette ที่สูง 160px แยกด้วยคู่แขน: ฟาด = คู่กลางกวาดลงต่ำชัด, ยิง = คู่ล่างผลักไปหน้า, สะบัดด้าย = คู่บนฟาดจากเหนือหัว, เรียก = คู่บนฉีกออกจากกันเหนือหัวนิ่งแล้วค้าง (สัญญาณเตือนผู้เล่น), Tide = ทุกแขนกางต่ำและผ้าคลุมแผ่

Prompt สำหรับเครื่องมือสร้างภาพ (แนบ seed-c.png และ layout เป็น reference ทุกครั้ง; เปลี่ยน <N> และ <MOVE POSES>):
"Sprite animation strip of the SAME floating six-armed severed monarch from the attached reference, identical design, colors, proportions and lighting: violet shadow body with gold armor trim, a floating gold crown above the head, ONE round cyan power core in the chest, THREE PAIRS of arms (upper pair raised with gold bracers, large middle pair with big gold cuffs, small lower pair near the waist), a three-tailed tattered violet cloak instead of legs, no legs. Same facing as the reference, full body, floating with the lowest cloak tip on one flat ground line. Exactly <N> poses in one row, left to right: <MOVE POSES>. Same scale in every pose, never enlarged beyond the reference, wide empty transparent gaps between poses, nothing touching the image edges, each pair of arms keeps its own position and cuffs (never swap pairs), exactly six arms, one core, three cloak tails in every pose. Transparent background (real alpha, no checkerboard, no floor, no shadow plate). No energy orbs, no threads or strings, no big rifts or portals, no smoke, no light beams, no text, no UI."

งานปรับ asset และ metadata (Codex): ตัดแต่ละ pose ด้วย alpha bbox → scale เดียวของชุด → วางลง 1024×1024 ให้ปลายผ้าต่ำสุดของเฟรมพร้อม y=896 → strips.json · ห้ามยืด/ย่อรายเฟรมเพื่อให้ "พอดี" ถ้า pose ล้นให้สร้างใหม่

งานนำเข้าเกมและการเปลี่ยนสถานะ (Claude ภายหลัง ไม่ใช่งาน Codex): atlas lossless sheet morvane (identity foe_morvane, move1–6), encounter-only loading, presentation coverage, คลิป 390px ให้เจ้าของอนุมัติ motion

เกณฑ์ตรวจรับ:
- นับ แขน 6 (สามคู่ไม่สลับ) / แกนอก 1 / ผ้าคลุม 3 แฉก / มงกุฎ 1 ทุกเฟรม (ยกเว้น down ที่แกนดับ) · ท่าที่แขนซ้อนกันตามมุมมองยังเห็นว่าเป็นคู่ไหน
- สเกลตัวห่างจาก seed ไม่เกิน ±4% (วัดความสูงจากมงกุฎถึงปลายผ้าไม่รวมแขนที่ชู) · ปลายผ้าต่ำสุดของเฟรมพร้อมที่ y=896 ±3px
- ไม่มีส่วนใดตัดขอบ frame · ไม่มี VFX ในร่าง · alpha จริง · เฟรมแรก/สุดท้ายตรง seed (ยกเว้น down)
- call-the-court อ่านต่างจาก fate-lash ที่ 160px (ฉีกออกจากกันแล้วค้าง ไม่ใช่สะบัด)
- strips.json, validation.json ตรงไฟล์จริง และ --verify ผ่านหลัง fetch กลับ

ขอบเขตงานที่ผู้ใช้อนุญาต: ตามบล็อก "ขอบเขตงานที่ผู้ใช้อนุญาต" ด้านบนทั้งหมด · branch art/art-unit-animation-wb-c-001 จาก feature/fateweave-initial-prototype (ฐานล่าสุดรวม WB-A แล้ว) · เจ้าของเลือกภาพและอนุมัติ motion เอง ผล CI/เทสต์ไม่ใช่การอนุมัติ
```

---

## VFX ท่าบอสโลก — ART-VFX-WB-TRIO-001 · **ส่งได้แล้ว** (ทำคู่กับ WB-B/WB-C ได้ ไม่ขึ้นกับภาพร่างกาย)

บอสโลกทั้งสามตัวมีท่าร่างกายแล้ว แต่ท่าพลังงาน ท่าทั้งทีม ท่าเฟส 70% และท่าชาร์จยังใช้ VFX ที่วาดด้วยโค้ดหรือชุดฟันร่วม ต้องการ VFX วาดเฉพาะ รูปแบบเดียวกับ `incoming/ART-VFX-BOSS-SIGNATURE-001/` (ผ่านและใช้ในเกมแล้ว) · ฝั่ง Claude ภายหลัง: เพิ่มชื่อท่าใน `bossMoves` ของ `boss-signature-fx.ts`, atlas, คลิป 390px ให้เจ้าของอนุมัติ

```text
เป้าหมาย:
ชุด VFX วาดเฉพาะของท่าบอสโลก Kragmor / Valdrakk / Morvane รวม 13 ท่า × 3 จังหวะ (prepare → peak → settle) = 39 เลเยอร์โปร่งใส เพื่อแทนเอฟเฟกต์วาดด้วยโค้ดและชุดร่วม และให้ผู้เล่นอ่านออกว่าท่าไหนตัดจังหวะได้ ตัดไม่ได้ หรือโดนทั้งทีม (OD-09–OD-12: บอสบอกกลไกล่วงหน้า ผู้เล่นเลือกตอบหรือไม่ตอบ)

บริบทเกมและไฟล์ที่ตรวจแล้ว:
- ระบบเดิม: src/game/visuals/boss-signature-fx.ts + boss-signature-art.json (anchor, pivot, width ต่อเลเยอร์) + atlas public/assets/fx/boss_signature_fx.* · เลเยอร์ 256×256 RGBA ตรง (straight alpha) ชื่อ <move>-<beat>.png, pivot กลาง [128,128] (ท่าพื้น [128,210]) · blend ปกติ ไม่ใช้ additive
- เส้นทางของท่า (Claude จะผูกเอง): charge = วางที่หน้าอกบอสตลอดเทิร์นรอ; single = ที่ตัวฮีโร่ที่โดนจริง; all = เฉพาะฮีโร่ที่โดนจริงทีละตัวเล็ก ไม่คลุมจอ; caster = ที่ตัวบอส (เฟสเปลี่ยน ไม่มีดาเมจ); summon = ที่ช่องลูกน้องที่ถูกเรียกจริง ใต้แถบ HP ไม่ใช่วงพื้น
- telegraph ในเทิร์นรอ: ท่าชาร์จที่ตามด้วยท่าตัดไม่ได้ (unstoppable) ใช้ layer prepare ของ "ท่าที่ปล่อย" เป็นสัญลักษณ์เตือน = วงเล็บแข็งมีฟันสองอันประสานกัน ช่องกลางเห็นชัด (ไม่หมุน) ส่วนชาร์จปกติใช้เส้นโค้งเปิดยืดหยุ่น หนึ่งท่าชาร์จ (Wing Gathering) "ทำลายได้" ต้องดูต่างจากทั้งสองแบบ
- ทิศปล่อย: ฝั่งศัตรูไปทางขวา→ฮีโร่ซ้ายของจอ · ไม่วาดบนใบหน้าและป้าย HP/ชื่อ/เจตนา ไม่มีตัวอักษร ตัวเลข

ภาพอ้างอิงที่แนบ/เข้าถึงได้:
- รูปแบบและเกณฑ์: incoming/ART-VFX-BOSS-SIGNATURE-001/ (NOTES.md, layers/, layers.json, storyboards/, validation.json, build_handoff.py) และ docs/handoffs/CODEX-ANIMATION-VFX-PROMPTS-TH.md §W7-b
- seed ตัวบอส (เพื่อคุมสี/สเกล): origin/art/art-char-worldboss-001 commit 46f366dc931e4994d3a6ccd9ad3951ac444a70cf → incoming/ART-CHAR-WORLDBOSS-001/seed-a.png (Kragmor), seed-b.png (Valdrakk), seed-c.png (Morvane) · เฟรมท่าจริงอยู่ที่ incoming/ART-UNIT-ANIMATION-WB-A-001, WB-B-001, WB-C-001 (strips/*.png ใช้ดูท่าและตำแหน่งมือ/ปีก/แขนตอนปล่อย)
- seed ฮีโร่/พื้นหลังสำหรับ storyboard: ใช้ชุดเดียวกับ ART-VFX-BOSS-SIGNATURE-001 (seeds/) + พื้นหลัง battle_riftline

ท่าที่ต้องทำ 13 ท่า (ชื่อตรงเกม; คอลัมน์เส้นทาง/จุดยึดเป็นข้อเสนอให้ปรับได้ใน layers.json):
KRAGMOR (ไททันหินผลึก ม่วง/cyan หนักช้า — ภาษา VFX: เศษผลึก หิน แรงอัด ไม่มีสายลม)
1. Titan Gathering — charge ปกติ, ศูนย์ดาเมจ · prepare=ผลึก/หินเล็กลอยเข้าหาอก เส้นโค้งเปิด; peak=บีบเป็นก้อนแกนผลึกกลางอก; settle=เศษหลุดช้า · จุดยึด caster.chest/forward_chest
2. Mountain Fall — ตัดไม่ได้ ตีเดี่ยวช่องหน้า · **prepare = วงเล็บแข็งมีฟัน** (ใช้เป็น telegraph เทิร์นรอ), peak=แรงทุบลงพื้นใต้ฮีโร่ แรงอัดตั้งฉากลง รอยแตกสั้น, settle=ฝุ่นผลึกจาง · จุดยึด target.feet pivot [128,210]
3. Rift Quake — ทั้งทีม (ปกติตัดได้) · prepare=เสี้ยวรอยร้าวที่พื้นหน้าบอส; peak=สามคลื่นรอยร้าววิ่งไปใต้เท้าฮีโร่แต่ละตัว (ต่อฮีโร่ที่โดนจริงเท่านั้น); settle=เศษหินตกเบา · whole_hero_side.actual_target_feet
4. Fault Awakening — เฟสเปลี่ยน ที่ตัวบอส ไม่มีดาเมจ · prepare=รอยแตก cyan ไหลขึ้นจากอก; peak=ผลึกมงกุฎและรอยแยกกระจายออก; settle=ประกายม่วงจาง · caster.chest

VALDRAKK (อสูรปีกผลึก ม่วง/cyan เร็ว — ภาษา VFX: ขนผลึกคม รอยตัดลม ไม่ใช่เมฆหรือสายฟ้า)
5. Wing Gust — ตีเดี่ยวพลังงาน · prepare=ขนผลึกสามชิ้นหุบเป็นเสี้ยว; peak=รอยโค้งขนผลึกพุ่งเฉียงไปที่ฮีโร่; settle=ขนผลึกร่วงจาง · target.chest
6. Wing Gathering — charge **ทำลายได้** (Bash/Sigil ตัดได้) · prepare ต้องดู "เปราะ": เส้นโค้งผลึกบางมีรอยร้าวสว่างชัด ต่างจากชาร์จปกติและจากวงเล็บแข็ง; peak=ผลึกอัดแน่นที่ไหล่แกน cyan; settle=เศษหลุด · caster.chest [R1 แนะนำ: เปลือกผลึกบางร้าว · R2: ขนผลึกพับซ้อนมีรอยแตก]
7. Worldshard Dive — ทั้งทีมพลังงาน (ปกติ) · prepare=เสี้ยวผลึกชี้ลง; peak=เศษโลกแตกเฉียงพุ่งผ่านแต่ละฮีโร่ (ต่อฮีโร่ที่โดนจริง); settle=ผงผลึกจาง · whole_hero_side.actual_target_chests
8. Sky Rend — เฟสเปลี่ยน ที่ตัวบอส · prepare=ลายแตกวิ่งตามขอบปีก; peak=ขนผลึกกางเป็นมงกุฎเหนือหลัง กระจายออก; settle=ประกายจาง · caster.chest

MORVANE (ราชันเงาหกแขน ม่วง/ทอง/cyan — ภาษา VFX: ด้ายเงา ผ้าคลุม รอยฉีก ไม่ใช่ขนหรือผลึกหิน)
9. Severing Bolt — ตีเดี่ยวพลังงาน · prepare=ด้ายเงาสองเส้นดึงตึงที่มือคู่ล่าง; peak=ลำตัดแคบเฉียงสว่างปลาย cyan ไปที่ฮีโร่; settle=เส้นด้ายขาดสั้นๆ · target.chest
10. Fate Lash — ตีเดี่ยวพลังงาน · prepare=เส้นด้ายสะบัดโค้งเหนือหัวบอส (ไม่ทับป้าย); peak=ด้ายหนาฟาดเป็นวงโค้งผ่านฮีโร่; settle=เศษด้ายร่วง · target.chest · ต้องอ่านต่างจาก Severing Bolt (โค้งยาวหนา vs ลำตรงแคบ)
11. Call the Court — summon: เรียกลูกน้องที่ล้มกลับ ไม่มีดาเมจ · prepare=ผ้าเงาเปิดที่ช่องลูกน้อง; peak=มือ/ด้ายเงายื่นขึ้นจากช่องที่ถูกเรียก; settle=เศษเงาจาง · summoned_slot.chest ใต้ป้าย HP ไม่ใช่วงพื้น ต้องต่างจาก Call the Rift ของผู้คุมเดิม (ไม่ใช่รอยฉีกตั้งตรง) [R1 แนะนำ: มือเงายื่นขึ้น · R2: ผ้าคลุมเงาพุ่งขึ้นเป็นเสา]
12. Shadow Tide — ทั้งทีมพลังงาน · prepare=ขอบเงาคลื่นต่ำที่หน้าบอส; peak=คลื่นเงาเตี้ยผ่านใต้ตัวฮีโร่แต่ละตัว (ต่อฮีโร่ที่โดนจริง); settle=ฝอยเงาจาง · whole_hero_side.actual_target_chests (หรือเท้า เสนอใน layers.json)
13. Severed Crown — เฟสเปลี่ยน ที่ตัวบอส · prepare=ขอบมงกุฎทองสว่างเป็นเส้น; peak=วงมงกุฎด้ายขาดกระจายออก; settle=ประกายทองจาง · caster.chest

ไม่ต้องทำ VFX ใหม่: Stone Fist, Boulder Hurl, Shard Talon, Six-Hand Rend (กายภาพ ใช้ชุดฟันร่วมแล้ว) และ Staggered (ท่าเสียหลัก ไม่มีเอฟเฟกต์) · ห้ามทำตัวบอสซ้ำ (ร่างกายมีใน WB-A/B/C แล้ว)

ข้อกำหนดที่ยืนยันแล้ว:
- เลเยอร์ 256×256 RGBA ตรง ขอบว่างพอ ไม่ตัดขอบ; blend ปกติ: ใช้เส้นขอบมืด (ม่วงเข้ม/คราม) + ขอบสว่าง (งาช้าง/มิ้นต์/cyan) ให้อ่านได้บนพื้นนาวีและบนเกราะทอง (ทดสอบทั้งคู่ใน storyboard เหมือนชุดเดิม)
- หนึ่งดีไซน์สุดท้ายต่อท่า (ท่าที่มี R1/R2 ให้ส่งทั้งสองและระบุตัวที่แนะนำ) · ท่าใหญ่ต้องอ่านได้ที่ความกว้างจริง: peak ~130px, prepare ~80px ในจอ 390px (บอสโลกใหญ่กว่าบอสเดิม ให้เสนอ width ใน layers.json)
- ท่าทั้งทีมใช้ชิ้นเล็กต่อฮีโร่ที่โดนจริง ไม่คลุมทั้งจอ · settle ถอยลงและเลือนหาย ไม่ค้างเป็นการโจมตีอีกครั้ง · ไม่วาดดาเมจ ตัวเลข สถานะ หรือแสงนอกบริบท
- ห้ามเดา ให้บันทึกที่ไม่แน่ใจใน NOTES.md "ฝากถึง Claude"; ห้ามเปลี่ยนกติกา เซฟ ตัวเลข เวลาเล่น

ไฟล์ส่งมอบ (ตามรูปแบบ ART-VFX-BOSS-SIGNATURE-001): layers/<move>-<prepare|peak|settle>.png, storyboards/<move>-390.png (สามช่องต่อท่า: พื้นนาวี + เกราะทอง), storyboards/telegraphs-390.png เทียบ telegraph ทั้งสามแบบ (ชาร์จปกติ / ทำลายได้ / วงเล็บแข็งตัดไม่ได้), storyboards/contrast-*-390.png, layers.json (anchor, pivot, width ที่เสนอ, route, unstoppable, breakable, phase_change, checksum), generation-prompts.json, seeds/ + seeds.json, source/ (ผล generator ทุก byte), production-sources.json, validation.json, NOTES.md, build_handoff.py ที่ทำซ้ำได้ (--verify และ --git-ref)

Prompt สำหรับเครื่องมือสร้างภาพ (ปรับต่อท่า; แนบ seed บอสตัวนั้นและตัวอย่างเลเยอร์เดิม 1–2 ชิ้นเป็นภาพอ้างอิงสไตล์ทุกครั้ง):
"A single transparent game VFX painting for the <BEAT> beat of the <BOSS> move '<MOVE>': <DESCRIPTION FROM THE TABLE>. Matches the painted style, line weight and rim lighting of the attached reference layers. Dark plum/indigo contour with bright ivory, mint and cyan edge light so it reads on both dark navy and polished gold armor. Centered in a square canvas with generous empty margin, real alpha transparency (no checkerboard, no background, no floor shadow), normal blending only. No characters, no bodies, no faces, no text, no numbers, no UI, no damage figures."

งานนำเข้าเกม (Claude ภายหลัง ไม่ใช่งาน Codex): ต่อ atlas boss_signature_fx, เพิ่มชื่อท่าใน bossMoves/art json, anchor เท้า/หน้าอกของบอสโลก, telegraph ทำลายได้, คลิป 390px ให้เจ้าของอนุมัติ

เกณฑ์ตรวจรับ:
- ครบ 13 ท่า × 3 เลเยอร์ = 39 ไฟล์ ขนาด 256×256 RGBA, alpha จริง, ขอบว่าง ≥ 12px, SHA-256 ตรง validation.json ทั้งหลัง push และ fetch กลับ
- telegraph สามแบบแยกออกจากกันที่ 390px: ชาร์จปกติ (Titan Gathering) / ทำลายได้ (Wing Gathering) / วงเล็บแข็งตัดไม่ได้ (Mountain Fall)
- ท่าเดี่ยว/ทั้งทีม/เฟส/summon ตรงเส้นทาง ไม่บังใบหน้า ป้าย HP ชื่อ เจตนา (ตรวจด้วย mask ใน storyboard และบันทึกพิกเซลที่ทับ)
- Severing Bolt ≠ Fate Lash, Call the Court ≠ Call the Rift อ่านต่างกันที่ขนาดจริง
- ภาษา VFX ของแต่ละบอสต่างกัน (ผลึก/ขนผลึก/ด้ายเงา) แต่เส้นขอบและแสงขอบตระกูลเดียวกับชุดเดิม

ขอบเขตงานที่ผู้ใช้อนุญาต: ตามบล็อก "ขอบเขตงานที่ผู้ใช้อนุญาต" ด้านบนทั้งหมด · branch art/art-vfx-wb-trio-001 จาก feature/fateweave-initial-prototype (ฐานล่าสุด) · เจ้าของเลือกภาพและอนุมัติ motion เอง ผล CI/เทสต์ไม่ใช่การอนุมัติ
```
