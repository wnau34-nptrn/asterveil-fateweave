# Codex prompts — บอสโลกสามตัว (P11-05 §7)

16 พ.ย. 2026 · Claude เขียน prompt (ยังไม่มีภาพใหม่) · ตาม [คู่มือ prompt](ANIMATION_PROMPT_QUALITY_TH.md) และ skill `fateweave-codex-art-brief` · design [§7](../design/WORLD_BOSS_TRIO_P11_05_TH.md)

ลำดับส่ง: **WB-A + แบนเนอร์ + ไอคอน ส่งพร้อมกันได้** → WB-B หลังเจ้าของดูคลิป WB-A ในเกมแล้ว → WB-C หลัง WB-B · ภาพที่ใช้ได้กับการขยับในเกมต้องให้เจ้าของเลือกและอนุมัติเอง (Claude เลือกแทนได้ตามที่มอบหมาย 2026-11-04 แต่บันทึกเป็นการตัดสินของ Claude) ผลเทสต์/CI ไม่ใช่การอนุมัติ

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

## WB-B — ART-UNIT-ANIMATION-WB-B-001 (Valdrakk) · หลัง WB-A ผ่าน

```text
ใช้แม่แบบ WB-A ทุกหัวข้อ เปลี่ยนเป็น:
- seed: incoming/ART-CHAR-WORLDBOSS-001/seed-b.png (หันซ้าย เท้า y≈896) + turnaround-b.png · encounter wb-valdrakk
- ล็อก: สี่ขา ปีกผลึกสองข้าง หางเดียว แกนพลัง cyan บนไหล่ซ้าย — ห้าม mirror ภาพ (แกนจะย้ายข้าง) · ปีกชู/พับในทุกท่าหลัก ไม่กางแนวนอน (ล้น frame) · หางโค้งเก็บใกล้ตัว
- ท่า (ชื่อตรงเกม): shard-talon (Shard Talon ตะปบอุ้งเท้าหน้า) · wing-gust (Wing Gust ปีกตีลม ไม่วาดลม) · wing-gathering (Wing Gathering ชาร์จ: ปีกพับคลุมไหล่ แกนไหล่สว่าง — ท่าค้างเตือน) · worldshard-dive (Worldshard Dive ทั้งทีม: ย่อ → พุ่งต่ำไปซ้าย ตัวยังอยู่ใน frame ใช้ท่าโน้มไม่ใช่บินออกนอกเฟรม) · staggered 6 เฟรม (Staggered: หลังถูกตัดชาร์จ เสียหลัก ปีกข้างหนึ่งตก หัวส่าย → ตั้งหลัก) [R1 แนะนำ: เสียหลักปีกตก · R2: สะบัดหัวมึน] · sky-rend (เฟส 70%: ชูปีกสูงคำราม แนวปีกสว่าง) · hit 4 · down 4 (นอนตะแคง ปีกพับทับตัว ค้าง)
- prompt: เปลี่ยนคำบรรยายเป็น "the SAME four-legged worldshard behemoth ... two raised crystal wings, one curved tail, cyan power core on its LEFT shoulder (never mirrored)" และย้ำ "wings raised or folded, never spread horizontally"
- เกณฑ์เพิ่ม: แกนไหล่อยู่ไหล่ซ้ายทุกเฟรม · นับขา 4 ปีก 2 หาง 1 ทุกเฟรม
```

## WB-C — ART-UNIT-ANIMATION-WB-C-001 (Morvane) · หลัง WB-B ผ่าน

```text
ใช้แม่แบบ WB-A ทุกหัวข้อ เปลี่ยนเป็น:
- seed: incoming/ART-CHAR-WORLDBOSS-001/seed-c.png (หันซ้าย ลอยตัว ไม่มีเท้า: ปลายผ้าคลุม = virtual sole y≈896) + turnaround-c.png · encounter wb-morvane
- ล็อก: แขนสามคู่ (คู่บน/กลางใหญ่/ล่างเล็ก) จับคู่ cuff ตามตำแหน่ง ห้ามสลับคู่ · ผ้าคลุมสามแฉก · แกนพลังกลางอกจุดเดียว · ลอยตัว: ปลายผ้าคลุมอยู่ y=896 ±6px (ลอยขึ้นลงเล็กน้อยได้ บันทึกใน strips.json) · ปลายผ้าห้ามยาวทับพื้นที่แถบ HP ใต้ตัว
- ท่า (ชื่อตรงเกม): six-hand-rend (Six-Hand Rend แขนคู่กลางฟาด) · severing-bolt (Severing Bolt มือคู่ล่างรวมพลังยิง ไม่วาดลูกพลัง) · fate-lash (Fate Lash แขนคู่บนสะบัดด้าย ไม่วาดด้ายยาวออกนอกตัว) · call-the-court (Call the Court: แขนคู่บนเปิดรอยแยกเหนือหัว — รอยแยกเล็กติดมือได้ ไม่ใช่ VFX ใหญ่) · shadow-tide (Shadow Tide ทั้งทีม: หกแขนกางลง ผ้าคลุมพองเล็กน้อย) · severed-crown (เฟส 70%: แกนอกและขอบผ้าคลุมสว่าง ศีรษะเงย) · hit 4 · down 4 (ผ้าคลุมยุบลงกองกับพื้น แสงดับ ค้าง)
- ลูกน้อง (มือเงา f2/f3 + วิญญาณ b2): [R1 แนะนำ: ใช้สไปรต์ crawler/wisp เดิมของเกม ไม่ทำภาพใหม่ — ไม่เพิ่ม atlas] · R2: ร่างมือเงาใหม่ ถ้าเจ้าของเลือก R2 ให้แยกเป็นงาน ART-UNIT-ANIMATION-WB-C-COURT-001 หลังจากนี้
- prompt: "the SAME floating six-armed severed monarch ... three pairs of arms (upper, large middle, small lower), three-tailed cloak, one cyan core in the chest, no legs" และย้ำ "each pair of arms keeps its own position and cuffs"
- เกณฑ์เพิ่ม: นับแขน 6 ทุกเฟรมและคู่ไม่สลับ · ผ้าคลุมไม่ล้น frame
```
