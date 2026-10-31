# ART-CHAR-CLASS-NEW-002 — ส่งต่อ Claude

2026-10-30 · base `feature/fateweave-initial-prototype` @ `a748ce1d3753db2253772ee9f0678f7d5926f6be`
branch `art/art-char-class-new-002` · art only · **รอเจ้าของอนุมัติภาพ**

## ผลงานสุดท้าย

หนึ่งแบบต่อคน ไม่มี option set: เคล (`kael`, Martial), วินน์ (`wynne`, Hexer), แอสทริด (`astrid`, Seer) แห่งค่ายทหารรับจ้าง ตาม brief และ OD-14 ใช้ concept B / A / A ตามลำดับ งานต้นฉบับสร้างใหม่ทั้งหมดจากภาพใน Fateweave เท่านั้น

- `unit/`: 512×512 RGBA หันขวา สองเท้าบน y496, pivot `(0.5,497/512)` ไม่มีเงาพื้นหรือปราณติดตัว
- `portrait/`: 512×512 ภาพใกล้พร้อมพื้นหลังวาด หน้า/ผม/ชุดตรง unit
- `weapon/`: 128×128 RGBA ขอบเขตอุปกรณ์ไม่เกิน 112px: ผ้าพันมือคู่ / ตุ๊กตาด้ายแดง / วงแอสโทรเลบ
- `icons/`: 18 เซลล์ 256×256 ตาม skill IDs ใน brief
- `sources/`: output เครื่องมือที่ไม่แก้ไข รวมรอบที่ถูกแทนที่เพื่อ audit เท่านั้น **ไม่ใช่แบบให้เลือก** ใช้เฉพาะเซลล์ใน `unit/portrait/weapon/icons/` เป็นผลงานสุดท้าย
- `review/lineup.png`: 12 allies เดิม + 3 คนใหม่ cell 115px เท่ากัน บน forest battle background พร้อม silhouette ดำ; เส้น cyan/gold อ้างยอดผม/คาง Garran
- `review/portraits-40.png`, `review/icons-44.png`: ภาพตรวจขนาดจริงบน navy; portrait มี enlargement แบบ nearest-neighbour แยกด้านล่าง
- `review/anatomy.png`: ภาพ 512px พร้อม landmark ยอดผม คาง เส้นพื้น

## สิ่งที่ตั้งใจให้ต่างจาก cast

Kael มีมวยผมเดี่ยว กางท่าฝ่ามือต่ำและช่วงขายืนกว้างที่สุด แขนเปลือย ไม่มีโลหะเกราะ/tabard/ลูกประคำ จึงแยกจาก Corin และ Odran ที่พักไว้ Wynne ใช้ปลายฮู้ดตกสองข้าง ตุ๊กตาผ้าและห่วงด้ายแดง มือประคองอย่างระมัดระวัง ไม่มี staff/skull/ทรงหมวกเห็ด Astrid ใช้ผมบ๊อบสั้น เข็มกลัดดาว ผ้าคลุมแยกโค้งจันทร์ และวงแอสโทรเลบติดใกล้มือ ไม่มีหมวกหรือ staff ต่างจาก Eira และไม่มีพัด/ริบบิ้นแบบ Isolde

## วิธีสร้างและตรวจ

อ่าน `AGENTS.md`, `CLAUDE.md`, animation prompt quality guide, owner decisions OD-14 และ project skills ก่อนทำงาน ขอบเขตเฉพาะ package นี้มีลำดับเหนือข้อกำหนดเขียน handoff นอกโฟลเดอร์ จึงบันทึกที่นี่แทน ไม่แก้ runtime, rules/save/content/balance, tests, public, workflow หรือ incoming เก่า และไม่ repack atlas ใด

`prompts.json` เก็บ prompt จริง อ้างอิง ลำดับ output และ artifact UUID ที่เครื่องมือเปิดเผย เครื่องมือไม่ได้เปิดเผย job ID แยกต่างหากจึงบันทึก null ไม่แต่ง ID ขึ้นมา แหล่งอ้างอิงที่ขึ้นต้น `sources/` อยู่ใน package นี้; path อื่นอ้างจาก repo root; PNG ต้นฉบับคง C2PA ไม่มี base64 ใน JSON

`python incoming/ART-CHAR-CLASS-NEW-002/package.py` ทำซ้ำได้ด้วย Pillow ใช้ threshold alpha >40 ตัด dust, หมุนทั้งรูปเพียงเล็กน้อยเพื่อวางสองเท้าตรงพื้น แล้วย่อแบบ uniform/translate เท่านั้น ไม่บิด anatomy ไม่ย่อ/ขยายส่วนหัวแยก ไม่เติมพิกเซลใต้เท้า บันทึก source landmark และ transformation ใน validation; วัดระยะเป็น inclusive pixel extents ตำแหน่งยอดผมของ Wynne ไม่รวมฮู้ด ส่วนศีรษะ Kael รวม topknot

มีการตรวจ Pillow decode/bounds/alpha ทุกภาพ, head/body/ratio, contact columns y496, gear extent และดู review sheets จริง สัดส่วนและการอ่าน silhouette เป็นทั้งการวัดกับการตรวจด้วยตา ไม่ใช่หลักฐาน owner approval ภาพนี้ยังไม่ได้ integrated หรือทดสอบในเกม

`validation.json` มี bytes/SHA-256/การ decode ทุกไฟล์ payload และ anatomy ของ unit; `SHA256SUMS` ครอบคลุมทุกไฟล์รวม validation ยกเว้นตัวเองเพื่อไม่เกิด self-hash cycle

หลัง push ใช้ `python incoming/ART-CHAR-CLASS-NEW-002/verify_remote.py` fetch branch กลับ ตรวจ SHA ทุกไฟล์และ decode PNG ทุกภาพจาก git object bytes ตรวจว่าทุก diff เป็น additions ใต้ package นี้เท่านั้น ไม่ใช้ข้อความจาก API แทนภาพ และไม่ใช้ผล CI เป็นการอนุมัติภาพ

## ขั้นต่อไป

Claude ตรวจ package และ review sheets แล้วส่งเจ้าของอนุมัติภาพก่อน intake; append standalone cells เข้า atlas ในงาน integration แยกต่างหากตาม brief นี้ PR ภาพ **ห้าม merge โดย Codex** ไม่มี animation set หรือ runtime integration ในงานนี้
