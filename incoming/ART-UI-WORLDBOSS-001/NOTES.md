# ART-UI-WORLDBOSS-001

2026-11-15 · art/art-ui-worldboss-001 → feature/fateweave-initial-prototype

เสนอ **R1**: ท่ายืนนิ่งอ่าน silhouette และขวานได้ง่ายกว่า R2 เมื่อย่อในหัวการ์ดมือถือ
R2 เป็นทางเลือกท่ายกอาวุธ รายละเอียดปลายขวานและลายเกราะจากการสร้างภาพยังต้องให้เจ้าของตรวจเทียบ seed ก่อนเลือก ไม่อ้างว่าเป็นสำเนา pixel-identical ของ sprite
ทั้งสองแบบเป็นภาพนิ่ง ไม่มีแอนิเมชัน ใช้ emblem เดียวกันโดยตั้งใจ

- R1/ และ R2/: banner_worldboss.png 1080×360 RGB; emblem_worldboss.png 256×256 RGBA; ทุกไฟล์มีคู่ lossless WebP
- seeds/: atlas จริง, frame 8 ที่ตัดด้วยพิกัด 512px, battle_riftline และ screenshot จริงจากสาขาเกม
- raw/: ผลสร้างภาพต้นฉบับที่ใช้ build; ไม่มีการแก้ไฟล์ภาพเดิมของเกม
- preview_390.png: ภาพจำลองกว้าง 390px แสดงสองการ์ดและ emblem 40px ตัวอักษรไทยวางเพิ่มเพื่อจำลอง DOM เท่านั้น ไม่ใช่ screenshot ของเกมที่นำเข้าแล้ว
- prompts.json / seeds.json / validation.json: ที่มา วิธีทำ และ SHA-256 ทุกไฟล์ ยกเว้น validation.json ซึ่งไม่สามารถเก็บ self-hash ได้

รันซ้ำ: Python 3 + Pillow, font NotoSansThai-Regular ที่ /usr/share/fonts/truetype/noto/

```sh
python3 -I incoming/ART-UI-WORLDBOSS-001/handoff.py
python3 -I incoming/ART-UI-WORLDBOSS-001/handoff.py --verify
```

ตรวจแล้ว: ขนาด, decode Pillow, alpha จริง (มี 0 และ 255; มุมโปร่งใส), PNG/WebP ตรงกันทุก pixel, contrast สีขาวทุก pixel ครึ่งซ้าย ≥4.5:1 (ดูค่าจริงใน validation.json)
ตรวจด้วยตา: ไม่มีตัวอักษร/UI/player characters ใน asset, โทนทอง/ม่วง/งาช้างและ halo/ขวานอิง seed, emblem อ่านเป็นหน้าผู้คุมในกรอบทองที่ 40px
ข้อจำกัด: ภาพสร้างใหม่มีรายละเอียดเส้นเกราะต่างจาก sprite; การเทียบรูปลักษณ์ขั้นสุดท้ายและการเลือกภาพเป็นของเจ้าของ ผลเทสต์/CI ไม่ใช่อนุมัติภาพ
ไม่ได้นำเข้าเกม ไม่ทดสอบ runtime ไม่เปลี่ยนสถานะ ไม่ merge; Claude นำเข้าหลังเจ้าของเลือก
คำสั่งเฉพาะงานอนุญาตเฉพาะ incoming นี้ จึงบันทึก handoff ที่นี่แทนการแก้ CURRENT_STATE.md/docs/handoffs
Git CLI ติดต่อเครือข่ายไม่ได้ จึงใช้ GitHub connector สร้าง branch/commit/PR และ fetch กลับมาตรวจแทน git push/fetch

raw/*.png.part0–2 คือสำเนา byte chunks ของ raw PNG เพื่อ fetch กลับผ่าน Contents API ที่ไม่คืนไฟล์ >1MB สคริปต์ตรวจ SHA-256 ของการต่อ chunks และ decode PNG ที่ได้อีกครั้ง (raw PNG ต้นฉบับยังเก็บครบ)
