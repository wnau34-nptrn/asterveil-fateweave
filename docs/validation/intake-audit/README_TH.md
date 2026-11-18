# ตรวจงานที่ยังไม่เข้าเกม — 18 พฤศจิกายน 2026

ตรวจตามคำขอเจ้าของ “ตรวจสอบว่ามีอะไรที่เอาเข้าเกมไม่สำเร็จมั้ย” จากกิ่งเกมล่าสุด `c0e6319546cd75ff7993f90d0fce0a459b5bf291` เทียบ runtime, receipts และ PR ที่ยังเปิดอยู่ ไม่ปรับภาพหรือกติกา และไม่เริ่มนำเข้าแพ็กที่ยังรอเลือก/รอระบบ

## ผลตรวจชุด World Boss ล่าสุด

**ไม่พบการนำเข้าล้มเหลวหรือตกหล่นในชุด trio ที่ได้รับอนุญาตแล้ว**

| รายการ | ผล |
| --- | --- |
| Kragmor / Valdrakk / Morvane body | มี atlas และ JSON ของตัวเอง, registry/ท่าตรงจริง; PR #282/#287/#289 เข้ากิ่งเกมแล้ว |
| แบนเนอร์ 3 ตัว + การ์ดรวม + emblem | มีครบ 7 WebP ใน `public/assets/ui/worldboss`, mapping และ UI เรียกใช้จริง (#284) |
| Bulwark / Breaker / Reaper | มี 3 cell แยกใน gear atlas, `gearCell` ผูกกับ boss power จริง; hash revision ตรง `41f13dbb` |
| VFX 13 ท่า + revision 7 เลเยอร์ | เข้าผ่าน #294; ตรวจ lossless สร้างซ้ำตรงทุก byte, 7 canvas ตรง revision และ 74 canvas อื่นไม่เปลี่ยน; alpha/anchor/pivot/layout ตรง receipts |
| ภาพสำรองและ portrait | #295 merge แล้ว; ทั้งสามชี้ `worldboss` คนละ frame แทน Warden; ทดสอบโหลดช้า/โหลดล้มเหลวผ่าน |

ไฟล์ runtime/metadata ที่ตรวจ hash 19 ไฟล์อยู่ใน [hashes.json](hashes.json) (รวม gear atlas); body/UI ชื่อ hash ตรงไฟล์จริง และ stills/VFX ตรง receipts ไม่มีการเปลี่ยน `incoming/` เดิม

PR ต้นทาง #280/#281/#283/#285/#288/#291/#292/#293 ที่ยังเปิดอยู่ **ไม่ใช่หลักฐานว่ายังไม่ได้นำเข้า**: ข้อมูลถูกนำเข้าผ่าน PR เกมคนละฉบับแล้ว รักษาข้อห้าม merge #292 แยกต่างหาก; R2 ที่ไม่ได้เลือกยังเป็นตัวเลือกอ้างอิง ไม่ใช่ไฟล์ตกหล่น

## นำเข้าแล้ว แต่ยังไม่เปิดใช้งานในเส้นทางปกติ

`src/content/world/rules.ts` ยังไม่กำหนด `worldBoss.trio.from`; `trioLive()` ใน `src/core/world/world-boss.ts` จึงคืน false และหน้า World Boss ยังคง Warden ตาม OD-51 นี่เป็น feature gate ไม่ใช่ภาพโหลดล้มเหลว งานที่ค้างคือ step 6 simulation/probe, การตัดสินตัวเลข/กำหนดเปิด และ staging run เมื่อ trio live ห้ามแก้ gate หรือ balance ในงานตรวจนี้

## ยังไม่ได้นำเข้าจริง / งานพักไว้

| งาน | สถานะที่ตรวจพบ |
| --- | --- |
| #262 แบนเนอร์ Rift Warden `ART-UI-WORLDBOSS-001` | Draft/ยังไม่ merge; ไม่พบ mapping ภาพ Warden ในชุดแบนเนอร์ runtime และการ์ด Warden ยังใช้ medallion ตัวอักษร รอเลือกภาพ R1/R2 ตาม brief |
| #169 แผนที่ทวีป `ART-WORLD-MAP-003` | Draft/ยังไม่ merge; runtime ใช้ `region_ch1` อยู่ ยังไม่มีแผนที่ทวีป/เส้นทางแตะของชุดนี้ |
| #234 Title compact | PR เปิดอยู่/ยังไม่ merge; `game-shell.ts` ยังเป็น `title-card`/`title-actions` เดิม ยังไม่ใช่ dock + settings sheet ของ PR นี้ ไม่พบข้อมูลพอจะสรุปว่า CI หรือการนำเข้าล้มเหลว |
| #55 สัตว์เลี้ยง / #53 บอสแมพ 4–10 | ยังไม่ merge; คิวศิลป์ระบุรอระบบรุ่น B/C ไม่ใช่ส่วนตกหล่นของ trio |
| #122 Odran / Isolde animation | พักตาม OD-14 ห้ามนำเข้าอัตโนมัติ |
| #212 ภาพกาชา | เป็น reference ตามขอบเขตส่งมอบ ไม่ใช่ระบบกาชาที่พร้อมเปิด |

#165 camp poses มี runtime mapping ของทั้งห้าตัวแล้ว แม้ PR ภาพยังเปิด; #133 เป็นชุด artwork/สเปก UX ซึ่ง UXD-01–08 ถูกทำผ่านงานเกมแยกแล้ว จึงไม่จัดสอง PR นี้เป็นการนำเข้าล้มเหลว ไม่ได้ตรวจทุก byte ของแพ็กเกจเก่านอก trio

## การตรวจและข้อจำกัด

- Vitest WB body/VFX/presentation coverage/budget: 61/61; equipment art: 122/122
- Chromium 390px source fixtures `world-boss-stills.spec.ts` + `wb-vfx.spec.ts`: 24/24 ครบ loading/failure, 13 VFX routes, hold/release/break, reduced/fast และ state/HP layering
- `scripts/apply-wb-vfx-revision.py` ผ่าน; `build_revision.py --verify` ผ่าน 48 manifest files / 7 RGBA layers
- ตรวจ GitHub ครั้งเดียวพบการเผยแพร่ commit ที่ตรวจผ่านทั้ง build/browser/deploy แล้ว ไม่รอหรือ poll Pages
- การอ่านเว็บ Pages โดยตรงจากเครื่องนี้ถูก network proxy ปฏิเสธ 403 จึงไม่อ้างว่าตรวจหน้าเว็บสดหรือเทียบ bytes จาก CDN สำเร็จ; 403 นี้ไม่ใช่ HTTP error ที่ยืนยันว่ามาจากเกม
- เป็นการตรวจไฟล์/การเชื่อมและทดสอบ Chromium ในเครื่อง ไม่ใช่การอนุมัติภาพใหม่ การตรวจ motion ต่อเนื่อง หรือผลมือถือจริง ไม่ทำชื่อท่าภาษาไทย และไม่เปลี่ยน rules/save/catalog/balance/timing/Rise Beyond
