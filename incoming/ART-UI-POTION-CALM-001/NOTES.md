# ART-UI-POTION-CALM-001 — ยาฟื้นความเหนื่อย (`calm`, P02)

สร้างภาพแล้ว · ภาพนิ่ง 1 เฟรมต่อแบบ · **เจ้าของยังไม่ได้เลือกภาพ**

Branch: `art/art-ui-potion-calm-001`, based on game branch `feature/fateweave-initial-prototype` at `d5fe9eaa668ef6c9a7384a95b0f365ba72dee10a`, never main. Package only; no integration, merge or deployment.

## ตัวเลือกและคำแนะนำ

- **R1 แนะนำ** — aqua / sea-glass blue + หมอกเงินขาว ทรงไหล่กว้าง คอตรงสั้น ฐานแบน แยกจากขวดกลม salve, คอยาวเหลี่ยม tonic และขวดเรียว repel ได้โดยไม่พึ่งสี
- R2 — ฟ้าอ่อนอมลาเวนเดอร์จาง ทรงตระกูลเดียวกับ R1 สีใกล้ repel มากกว่า R1 จึงเป็นตัวรอง
- R3 — aqua ทรงเตี้ยและกว้างกว่า ใบสมุนไพรชัดกว่า แต่กินพื้นที่แนวนอนมากกว่า R1

`calm.png` เป็นสำเนา byte-identical ของ **calm-R1.png เพื่อเสนอเท่านั้น** ไม่ใช่การเลือกแทนเจ้าของ ไม่มีชื่ออังกฤษในเกมที่ยืนยัน; ใช้ id `calm` และชื่อไทยตาม brief.

## ไฟล์และสเกล

- `calm-R1.png`, `calm-R2.png`, `calm-R3.png`, `calm.png`: PNG RGBA 128×128, real alpha; centre-of-cell anchor. R1/R2 extent 108px, R3 105px; padding ≥10px.
- ทุกตัวเลือกใช้ **factor เดียว 108/562** หลัง trim source, ไม่ปรับ stretch หรือขยายแต่ละขวดแยกกัน รายละเอียดจริงใน `normalization.json`.
- ใช้ image_gen สองครั้ง: ครั้งแรกสร้าง R1–R3; ครั้งที่สองขยาย R3 ให้ extent ใกล้ R1/R2 โดยยังคงทรงเตี้ย เพื่อใช้ common scale ได้จริง ทั้งสามภาพสุดท้ายมาจากครั้งที่สอง
- `raw/`: source masters แบ่งเป็น 3 vertical tiles แบบ lossless ต่อ generation; รวมแนวนอนตาม R1/R2/R3 เพื่อคืน master 2172×724 ไม่มีการแก้พิกเซลใน raw. เก็บแต่ละไฟล์ต่ำกว่า 768KB เพื่อช่วยตรวจปัญหา truncation
- `build_assets.py`: alpha ≤8 เป็นศูนย์เพื่อตัด noise จางนอกขวด, trim, downsample แบบ LANCZOS ด้วย common scale, centre และทำ review; ไม่วาดทับ ไม่เปลี่ยนสี และไม่แก้ asset ต้นฉบับ
- `potion_items_preview.png`: 768×128; 5 ช่องเดิมตรงกับ decoded atlas ทุกพิกเซล + R1 เป็นช่องที่ 6. เป็น **ตัวอย่างเท่านั้น**
- `calm.json`: เสนอ `potion_calm` x=640,y=0,w=128,h=128 สำหรับตอน Claude ต่อ atlas
- `review-390.png`: กว้าง 390px; R1/R2/R3 จากบนลงล่าง แต่ละกลุ่มเรียง salve/tonic/repel/calm; แถว 44px สี, 28px สี, 44px greyscale, 28px greyscale บน #0f1a2e; กรอบเป็น review เท่านั้น
- `variants-390.png`: ตัวเลือกที่ขนาด cell 128px เรียง R1/R2/R3

## ที่มาและการตรวจ

อ่าน NOTES.md และ STYLE_CHECK.md ของ ART-UI-EQUIP-001 และ silhouette ใน `src/ui/svg/potion-calm.svg` ผ่าน GitHub connector. แนบ reference ที่เครื่องมือได้รับจริงใน `prompts.json`: crop atlas สามขวดเดิมเพื่อเทียบสไตล์ และ raster silhouette aid ที่สร้างตาม geometry SVG (wave เป็น approximation). งานใหม่ทั้งหมด ไม่ใช้ Asterveil: Rise Beyond.

ตรวจ decoded PNG: RGBA/alpha, ขนาด, padding, common scale, preview pixels, และดู review ที่ 44/28px ทั้งสี/ขาวดำแล้ว ทรง calm มีด้านข้างตรงและฐานกว้างแบน ต่างจากสามขวดเดิม ไม่มีพื้น/กรอบ/ตัวหนังสือ/ราคา/rarity glow ในตัว asset. รายละเอียดเชือก/ใบ/หมอกจางลงเมื่อย่อ 28px ตามธรรมชาติ แต่ทรงหลักยังอ่านออก. ยังไม่ได้ทดสอบในเกม และผลตรวจนี้ไม่ใช่การอนุมัติภาพของเจ้าของ.

`validation.json` ระบุ SHA-256, byte size, dimensions, mode ทุกไฟล์ (text ใช้ null); ยกเว้นตัว manifest เองเพื่อเลี่ยง self-hash. สั่ง `python -B incoming/ART-UI-POTION-CALM-001/build_assets.py /path/to/potion_items.webp` เพื่อ rebuild หรือไม่ใส่ argument เพื่อสร้าง manifest จากไฟล์ที่มี. ไม่ต้องรัน gameplay suite เพราะไม่มี runtime/code/registry เปลี่ยน.

Git CLI fetch ใน session นี้เชื่อมต่อ proxy ไม่ได้ จึงส่ง blob/tree/commit ผ่าน GitHub connector โดยอิง base commit ข้างต้น และอ่านไฟล์ทุกไฟล์กลับจาก commit หลังอัปโหลดเพื่อตรวจ SHA-256 เทียบ manifest พร้อม decode PNG ด้วย Pillow. ผล round-trip รายงานใน PR; ไม่อ้างว่า git CLI fetch สำเร็จ.

## ส่งต่อ Claude

เจ้าของเป็นผู้เลือก R1/R2/R3 ก่อนนำเข้า จากนั้น Claude ต่อ atlas แบบ lossless, เพิ่ม `potion_calm` ใน map, เอาไอคอนเส้นออกจาก equip-art.ts และตรวจหน้าเกม 390px. ไม่เปลี่ยนกฎ เซฟ ราคา หรือสมดุล. สถานะและ handoff อยู่ใน NOTES นี้ตามคำสั่งผู้ใช้ให้แก้เฉพาะโฟลเดอร์งาน จึงไม่ได้แก้ CURRENT_STATE.md หรือ docs/handoffs นอกขอบเขต.
