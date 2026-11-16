# ART-ITEM-WORLDBOSS-001

ไอคอนอุปกรณ์จากเศษบอสสามชิ้น ตามคำขอ2026-11-16 ใช้พลังที่มีจริงใน save v65 ไม่เปลี่ยนพลัง/ตัวเลข/slot หรือระบบเซฟ ชุดนี้เป็น art handoff ให้ Claude repack lossless ภายหลัง ยังไม่นำเข้าเกม ไม่ merge ผลเทสต์/CIไม่ใช่การอนุมัติภาพของเจ้าของ

Branch `art/art-item-worldboss-001` จากสาขาเกม `feature/fateweave-initial-prototype` ที่ `cca1c3db38028781306072011d8dc4c0aed438f3` เปลี่ยนเฉพาะ `incoming/ART-ITEM-WORLDBOSS-001/` ไม่แก้ src/tests/public/.github/ ภาพเดิมหรือเอกสารสถานะนอก package ส่งต่อด้วย NOTES นี้ตามขอบเขตงานภาพ

## ส่งมอบ

| PNG | Power / slot | ภาพจำ |
| --- | --- | --- |
| boss_bulwark.png | bulwark / body | เกราะอกหินผลึกคราก์มอร์ แผล cyan กลางอก ขอบผลึกติดเกราะ5แฉก |
| boss_breaker.png | breaker / gloves | ถุงมือกรงเล็บคู่ ลายแผ่นปีกผลึกของ Valdrakk แกน cyan ฝังที่ข้อมือใกล้กล้อง |
| boss_reaper.png | reaper / head | มงกุฎ/หมวกว่างของ Morvane แกนกลางกลม ด้ายเงาขาด3เส้นติดหลังมงกุฎ |

ทุกไฟล์ **128×128 RGBA, alphaจริง, มุมทั้งสี่โปร่งใส** ไม่มีข้อความ เครื่องหมายบอส ตราชุด หรือกรอบ rarity/UIฝังในภาพ ชิ้นอุปกรณ์อยู่กึ่งกลางและกินด้านยาว104px =81.25%ของเซลล์ มีขอบว่างอย่างน้อย12px อัญมณี/ขอบทองเป็นส่วนทางกายภาพของชิ้นอุปกรณ์ ไม่ใช่ badgeแยก

`preview_390.png` เทียบภาพจริงที่128/64/40px โดยไม่ขยายภาพ40/64เพื่อหลอกการอ่าน แต่ละกลุ่มมี3คอลัมน์: **master ของslotนั้น / ไอคอนใหม่ / bossไอคอนเดิม** ด้านขวาเป็นแบบอย่างการเพนต์ ไม่ใช่การเปลี่ยนหรือจับคู่พลังเก่า กรอบ rarity/เครื่องหมายบอส/ตราชุดไม่ได้ใส่แม้ใน preview เพื่อให้ดูชิ้นจริงล้วน

## ข้อเท็จจริงที่ตรวจซ้ำ

- `public/assets/ui/equip/gear_items.webp` เป็น1280×1152 RGBA เซลล์128² ตาม `src/game/visuals/equip/gear_items.json`
- cropเดิม: boss_aegis=(640,896), boss_focus=(768,896), boss_lantern=(896,896), ขนาด128²ทุกช่อง คัดลอก pixelจากatlasจริงไว้ใน references ไม่แก้atlas
- **ไม่มี key *_legendary ใน atlasนี้** `gearCell()` ใช้ tier master ร่วมสำหรับrarity3และ4 จึงใช้ gear_body_master / gear_gloves_master / gear_head_master เป็นภาพlegendaryที่เกมเลือกจริง มิได้สร้างชื่อช่องขึ้นเอง
- ภาพcropไม่มีกรอบ rarityฝังอยู่ กรอบสีเกิดจาก DOM/CSS ของ `.gear-art[data-rarity]` และ `src/ui/equip-art.ts` วางเครื่องหมายบอส/ตราชุดเอง จึงไม่วาดซ้ำใน PNG
- seed-a/b/c จาก art commit `46f366dc931e4994d3a6ccd9ad3951ac444a70cf` ของ PR #263 แนบกับ generatorตามชิ้นทุกครั้ง มุมมอง3/4 เส้นขอบเข้มและแสงจากซ้ายบนอิงไอคอนอุปกรณ์ ไม่ใช้ภาพตัวบอสเป็นไอคอนแทนชิ้นของ

atlas/mapping/DOM SHA และพิกัดcropอยู่ `references/context.json` seedและreferenceทุกไฟล์มีSHAใน seeds.json ไม่มีภาพจาก Asterveil: Rise Beyond

## งานภาพและการ normalize

source/ เก็บผล generatorที่เลือกเดิมทุก byte ส่วน prompts.jsonมีคำสั่งจริง/reference/revisionรวมรอบเกราะที่ไม่เลือก รอบแรกผลึกกลางดูเหมือนเพชรลอยแยกจากเกราะ จึงสร้างแก้ให้เป็นลิ่มสามเหลี่ยมติดกับขอบคอจริง เพื่อไม่สับสนกับเครื่องหมายบอสที่ DOMวางเพิ่ม

ตัด alpha bbox จากsourceหลังลบเฉพาะ haze alpha≤8 แล้วใช้ **uniform scale** ต่อชิ้นให้ด้านยาว104px ไม่ยืดสัดส่วน วางกึ่งกลาง128²ด้วย Lanczos เคลียร์ RGBที่alpha0 ไม่วาดรายละเอียดใหม่ในสคริปต์ sourceทั้งหมด1254² ข้อมูลcrop/scale/size/pasteอยู่ใน seeds.json

ตรวจด้วยตาที่128/64/40pxแล้ว: เกราะ/ถุงมือ/หมวกแยกชนิดออก, cyanเป็นจุดเด่นบนม่วง/ทอง, rim/outlineแยกจากพื้นnavy, ถุงมือเป็นคู่สวมใส่และเห็นกรงเล็บ, หมวกไม่มีหัว/หน้าคนอยู่ข้างใน และด้ายเงา3เส้นมีปลายขาดชัดที่128px ความเหมือนเส้น/แสง/ความอิ่มสีกับชุดเดิมเป็น judgementด้านภาพของเจ้าของ ไม่อ้างว่าตรวจด้วยตัวเลขแล้วถือว่าอนุมัติ

## ทำซ้ำและตรวจรับ

ใช้ Python3, Pillow12.3.0, NumPy2.3.5 ตาม requirements.txt:

```sh
python -I incoming/ART-ITEM-WORLDBOSS-001/handoff.py
python -I incoming/ART-ITEM-WORLDBOSS-001/handoff.py --verify
```

buildและverifyใช้ packageนี้ลำพังได้ ไม่ต้องใช้atlasต้นทางหรือnetwork ไม่เปิด/เขียนเกมatlas เครื่องมือสร้างภาพไม่เปิด numeric RNG seedจึงบันทึก null การประมวลผล sourceที่เก็บไว้ทำซ้ำได้ แต่ไม่อ้างว่าการสุ่มสร้างภาพใหม่ให้pixelเดิม

ตรวจขนาด/mode, alpha0/255และขอบโปร่งใสจริง, corner alpha0, bbox/padding/81.25%fill, previewครบ3ขนาด, Pillow decodeเต็มทุกPNG, SHA-256+byte lengthทุกไฟล์ และbuildซ้ำเทียบmanifest ไม่รันgameplay suiteเพราะไม่มีruntime change

validation.jsonยกเว้นself-hashที่ทำไม่ได้ SHAของmanifestอยู่ในPRเป็นreceipt หลัง git push ให้ fetchกลับเข้าobject databaseใหม่แล้วรัน --verify เพื่อยืนยันไฟล์ไม่ถูกตัด ไม่ตรวจworkingcopyเดิมแทนremote

## ส่งต่อ Claude

เพิ่มสามframeใหม่ด้วยชื่อ **boss_bulwark / boss_breaker / boss_reaper** ในการ lossless-repack ของgear_items ตามcell128² คงpixelของframeเก่าทั้งหมด และเพิ่ม mapping JSONให้ตรง `gearCell()` ที่เลือก `boss_${item.boss}` อยู่แล้ว ไม่เปลี่ยนboss powerหรือslot ไม่อบเครื่องหมายบอส/ตราชุด/rarityframeลงatlasซ้ำ ตรวจDOMจริงที่40/64pxตอนนำเข้าและให้เจ้าของตัดสินรูป ก่อน mergeตามขั้นตอนของงานนำเข้า
