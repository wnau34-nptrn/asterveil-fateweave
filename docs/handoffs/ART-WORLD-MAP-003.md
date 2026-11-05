# ART-WORLD-MAP-003 — แผนที่โลกแอสเตอร์เวลเวอร์ชันผลิตจริง (brief สำหรับ Codex)

Claude 2026-11-05 · สถานะ: **เขียน prompt แล้ว** (ยังไม่ได้ส่ง/ยังไม่มีภาพ) · ต่อจากภาพ concept ART-WORLD-MAP-001 ที่เจ้าของผ่านเป็นทิศทางเมื่อ 2026-10-22 เจ้าของขอ (2026-11-05) ให้ทำเวอร์ชันผลิตจริงก่อนแล้วค่อยนำเข้าเกม ปุ่ม "แผนที่โลก" ในหน้าเลือกแผนที่เป็นงานของ Claude หลังได้ภาพ

```text
CODEX HANDOFF — ART-WORLD-MAP-003 (art only)
Asterveil · Fateweave · repository wnau34-nptrn/asterveil-fateweave

อ่านก่อนเริ่ม: AGENTS.md, CLAUDE.md, docs/handoffs/ANIMATION_PROMPT_QUALITY_TH.md, docs/handoffs/ART-PLACEMENT-RULES.md, docs/LORE_CHAPTER1_TH.md, incoming/ART-WORLD-MAP-001/NOTES.md (concept ที่เจ้าของผ่านเป็นทิศทาง: ตาราง 6 ภูมิภาคและรายการ 10 จุดของบทที่ 1), incoming/ART-WORLD-CH1-MAP-001/NOTES.md และ region_ch1.json (แผนที่ภูมิภาคบทที่ 1 ที่อยู่ในเกมแล้ว)

เป้าหมาย:
วาดแผนที่ทั้งทวีปแอสเตอร์เวลเวอร์ชันผลิตจริงสำหรับหน้า "แผนที่โลก" ของเกม (มือถือแนวตั้ง) ให้คมกว่าและกลมกลืนกับแผนที่บทที่ 1 ในเกมมากกว่า concept เดิม (concept เดิมเป็นภาพ 1672×941 ขยายขึ้น ความละเอียดต่ำ สีจัดเกินไป)

บริบท:
- เกมใช้กรอบแนวตั้ง ≤ 480px กว้าง ผู้เล่นเลื่อนดูแผนที่ในแนวตั้ง แผนที่โลกเป็นภาพ "ซูมออก" ที่แตะภูมิภาคเพื่อลงไปดูแผนที่ภูมิภาคนั้น ปัจจุบันมีแค่ภูมิภาค 1 (ชายแดนตะวันตกเฉียงใต้ = บทที่ 1 ทั้ง 10 จุด) ภูมิภาคอื่นจะถูกหมอกปิดจนกว่าจะมีบทใหม่
- บทที่ 2–6 ยังไม่ใช่เรื่องที่ยืนยัน: ภูมิภาค 2–6 เป็นข้อเสนอจาก concept ให้ใช้ภูมิศาสตร์/สีตามตาราง concept แต่ไม่ใส่ชื่อหรือเรื่องราวที่ยังไม่ได้อนุมัติ

ข้อกำหนดภาพ:
1. ภาพเดียวแนวตั้ง ทั้งทวีป มองจากมุมสูงเฉียงแบบเดียวกับ region_ch1.webp แสงมาจากมุมซ้ายบน (ตรงกับแผนที่บทที่ 1)
2. ภูมิภาค 1 (ชายแดนตะวันตกเฉียงใต้) ต้องเป็นภาพเดียวกับ public/assets/world/region_ch1.webp ที่ตำแหน่งและสเกลที่ระบุใน region_rect (ดูไฟล์ส่งมอบ) เพื่อให้แตะลงจากแผนที่โลกไปแผนที่บทที่ 1 ได้ต่อเนื่อง ห้ามออกแบบภูมิภาค 1 ใหม่ 10 จุดและเส้นทางต้องตรงกับ region_ch1.json (ซูมแล้วตรงกับ region_ch1.webp ได้ภายใน ±6 px ที่สเกลของแผนที่โลก)
3. ภูมิภาค 2–6 ตามตาราง ART-WORLD-MAP-001: 2 ที่ราบสูงหิมะ (ภูเขาแยกเหนือชุมชนเล็ก), 3 ทุ่งหญ้าอำพันเหนือ (หอดูดาวทรงกลมที่พัง), 4 ป่าใบไม้เปลี่ยนสีตะวันออกเฉียงเหนือ (มหาวิหารรากไม้ยักษ์), 5 ดินดอนสามเหลี่ยมน้ำขึ้นลงตะวันออกเฉียงใต้ (วิหารขั้นบันไดกลางน้ำ), 6 ใจกลางทวีป (นครมีกำแพงวงแหวนและหอคอยเกลียว) รอยแยกสีม่วงไหลจากชายแดนตะวันตกเฉียงใต้ไปใจกลางตามเดิม
4. ลดความจัดของสีลงเทียบ concept (ไม่ชมพู/ม่วงฉูดฉาด) ใช้พาเลตเดียวกับ region_ch1: มรกตอุ่น ฟ้าเย็น ม่วงเข้มเฉพาะรอยแยก ทองอ่อนที่ทางเดิน
5. ห้ามมีตัวอักษร ตัวเลข ป้ายชื่อ เส้นขอบภูมิภาค จุดปักหมุด หรือ UI ในภาพ (เกมวาดป้าย/หมุดเอง)
6. ภาพต้นฉบับเท่านั้น ห้ามนำภาพ/แผนที่/โลโก้จาก Asterveil: Rise Beyond หรือเกมอื่น
7. อ่านออกที่ความกว้างจอ 390px: รูปทรงภูมิภาคอ่านได้ที่ขนาดย่อ ไม่มีรายละเอียดจิ๋วที่เบลอกลายเป็นสัญญาณรบกวน

ขนาดและไฟล์:
- master world_map.png: 2160 × 6000 px (แนวตั้ง, RGB sRGB ทึบ) = สเกล 2× ของ 1080 × 3000 ที่เกมใช้แสดง ถ้าเครื่องมือสร้างภาพจำกัดขนาด ให้สร้างเป็นท่อนซ้อนทับกัน แล้วต่อด้วยสคริปต์ที่ทำซ้ำได้ (ไม่ต่อด้วยมือ ไม่แต้มแก้ที่รอยต่อ) และบันทึกวิธีใน NOTES.md
- world_map.webp: 1080 × 3000 (สำหรับเกม) ขนาดไฟล์ ≤ 1.6 MB (ถ้าเกินให้ลดรายละเอียดซ้ำก่อนลดคุณภาพ) และ world_map_2x.webp เฉพาะถ้า ≤ 3.5 MB
- world_map_fog.webp: 1080 × 3000 RGBA ชั้นเมฆหมอก alpha นุ่มจริง คลุมภูมิภาค 2–6 แบบทึบพอซ่อนรายละเอียดแต่เห็นเงาลางๆ ของจุดเด่นแต่ละภูมิภาค ภูมิภาค 1 ต้องโล่งชัด ขนาด ≤ 0.6 MB
- world_map.json: { "size": [1080, 3000], "region_rect": { "x","y","w","h" } (ที่วางของ region_ch1.webp ในภาพโลก), "regions": [ { "id": 1..6, "polygon": [[x,y],...] พิกัดภาพ 1080×3000, "anchor": [x,y] (จุดกลางสำหรับหมุดและโฟกัสเลื่อน) } ] } ภูมิภาคไม่ทับกัน ปิดสนิท ครอบคลุมแผ่นดินหลัก
- preview: preview_390.png (กรอบ 390×844 แนวตั้งเลื่อนดูส่วนต่างๆ 3 ตำแหน่ง), preview_fog_390.png (มีหมอกคลุมภูมิภาค 2–6), regions_overlay.png (โพลิกอนบนภาพ ใช้ตรวจเท่านั้น ไม่ส่งเข้าเกม), match_region1.png (แผนที่โลกที่ตำแหน่ง region_rect เทียบกับ region_ch1.webp แบบซ้อนทับให้ตรวจความตรง)
- prompts.json (prompt จริง ภาพอ้างอิง generation id ถ้าเปิดเผยได้ ไม่ใส่ base64), seeds/ + seeds.json (ภาพอ้างอิงที่ใช้ รวม concept เดิม world_portrait.png / world_concept.png และ region_ch1.webp), validation.json + SHA256SUMS, NOTES.md ภาษาไทย (วิธีสร้าง ตำแหน่ง region_rect การจัดพาเลต ข้อจำกัด), build_handoff.py, verify_remote.py
- ถ้าตีความได้หลายแบบ (เช่นการวางรอยแยก) ส่ง R1/R2 พร้อมตัวแนะนำ

Prompt สำหรับเครื่องมือสร้างภาพ (ปรับตามภูมิภาค; แนบ world_concept.png, world_portrait.png และ region_ch1.webp เป็นภาพอ้างอิง):
"Painted fantasy world map of a single continent, tall portrait composition, high-angle three-quarter aerial view, polished game-map illustration, light from the upper left. The south-west frontier is the same landscape as the attached region_ch1 painting (emerald woods, slate ruins, silver water, a narrow violet rift with a small gate and throne) at its exact place and scale. A violet scar runs from the frontier toward the centre of the continent. Other regions: north-west snowy highlands with a split mountain above a small settlement; northern amber steppe with a broken ring-shaped observatory; north-east autumn forest with a giant root cathedral; south-east turquoise tidal delta with a stepped tidal temple; central pale-gold heartland with a ring-walled city and a spindle tower. Calmer, less saturated palette than the concept: warm emerald, cool cyan, champagne roads, violet only for the rift. No text, no letters, no numbers, no labels, no borders, no pins, no UI, no watermark. Crisp readable shapes at phone size."

เกณฑ์ตรวจรับ: ภูมิภาค 1 ตรง region_ch1.webp ภายใน ±6 px; ภูมิภาค 2–6 ตรงตารางและไม่ใส่ชื่อ/เนื้อเรื่องใหม่; พาเลตกลมกลืนกับแผนที่บทที่ 1; อ่านออกที่ 390px; ไม่มีตัวอักษร; ขนาดไฟล์ตามที่ระบุ; SHA-256 ตรง validation.json และ decode ด้วย Pillow ผ่านทุกไฟล์; โพลิกอนครบ 6 ภูมิภาคไม่ทับกัน

ขอบเขต: สร้าง branch art/art-world-map-003 จาก feature/fateweave-initial-prototype (ไม่ใช่ main) เปลี่ยนไฟล์เฉพาะใต้ incoming/ART-WORLD-MAP-003/ ห้ามแตะ src/ tests/ public/ .github/ หรือไฟล์ของแพ็กเกจเดิม เปิด PR แต่ไม่ merge push ด้วย git ปกติ แล้ว fetch กลับมาตรวจ SHA-256 ทุกไฟล์และ decode ภาพ การเลือกภาพเป็นของเจ้าของ ผล CI/เทสต์ไม่ใช่การอนุมัติ ส่วนนำเข้า public/ ปุ่ม "แผนที่โลก" และหมอก/โฟกัสเป็นงานของ Claude หลังเจ้าของเลือกภาพ
```
