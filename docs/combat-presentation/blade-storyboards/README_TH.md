# C5.1 — แบบภาพเฉพาะฟัน/แทง 10 ท่า · V1

25 ตุลาคม 2026 · **แบบเสนอ รอเจ้าของตรวจ ยังไม่ใช่ runtime assets และยังไม่อนุมัติภาพ/คลิป**

เจ้าของเห็นว่า R2 หนาเกินไปและแต่ละท่าคล้ายกัน หลัง R3 จึงอนุมัติให้ทำ artwork แยกรายท่าก่อนนำไปทำ VFX จริง ชุดนี้ออกแบบรูปทรงใหม่ 10 ท่า ท่าละ 3 จังหวะ (เตรียม → ปะทะ → สลาย) รวม 30 ภาพใน strip โปร่งใส 10 ไฟล์ สร้างด้วย built-in ImageGen หลังเจ้าของอนุญาตให้ใช้แทน Shado ซึ่งยังติดปัญหา AI Link port busy `10048` ไม่มีการปิด Sophos หรือเปลี่ยนการป้องกันระบบ

เปิด [หน้าพรีวิวเลือกท่าและปรับน้ำหนัก](index.html) เลือกท่าด้านบน ใช้ “ดูสนามเปล่า” เทียบการบังตัวละคร และปรับน้ำหนัก 60–110% ได้ ค่าแบบเสนอคือ 100% (ภายในภาพปะทะใช้ alpha .88) ปุ่มคืนค่ากลับมาแบบเสนอ หน้าพรีวิวอ่านไฟล์ภาพอย่างเดียว ไม่เรียก resolver และไม่เขียนเซฟ เปิดผ่านเซิร์ฟเวอร์ Vite ของโครงการหรือเปิดไฟล์ HTML ใน browser ได้

## งานภาพ

| ท่า | รูปทรงเฉพาะ | Storyboard 3 ช่อง | ปะทะ 390px |
|---|---|---|---|
| Attack | คม comma เฉียงสั้น กระชับ | [ภาพ](attack-board.png) | [ภาพ](attack-contact-390.png) |
| Finisher | ตะขอคมยาวกดลง เน้นปลายปิดงาน | [ภาพ](finisher-board.png) | [ภาพ](finisher-contact-390.png) |
| Lunge | ปลายพุ่งยาวพร้อมร่องลมเปิดด้านหลัง | [ภาพ](lunge-board.png) | [ภาพ](lunge-contact-390.png) |
| Sweep | เสี้ยวบางแบนกวาดตามแนวนอน | [ภาพ](sweep-board.png) | [ภาพ](sweep-contact-390.png) |
| Backstab | ปลายสั้นแทงย้อนจากอีกด้าน หางเยื้อง | [ภาพ](backstab-board.png) | [ภาพ](backstab-contact-390.png) |
| Ambush | ตะขอฟันเสยขึ้นจากล่าง ช่องกลางเปิด | [ภาพ](ambush-board.png) | [ภาพ](ambush-contact-390.png) |
| Disarm | ตะขอเล็กเกี่ยวออก ไม่ทำภาพอาวุธแตก | [ภาพ](disarm-board.png) | [ภาพ](disarm-contact-390.png) |
| Parry | วงเล็บรับเล็ก → คมฟันคืนกลับ | [ภาพ](parry-board.png) | [ภาพ](parry-contact-390.png) |
| Pierce | เข็มยาวตรงบางที่สุด ริ้วตามแกนเดียว | [ภาพ](pierce-board.png) | [ภาพ](pierce-contact-390.png) |
| Halt | ปลายสั้นฐานแน่น ริ้วเบนกลับ | [ภาพ](halt-board.png) | [ภาพ](halt-contact-390.png) |

คุมสีตามตระกูล icon: นักดาบ ivory/rose, หน่วยสอดแนม steel blue/slate, ทวน ivory/teal ใช้ชั้นสีโปร่งและแกนคมขนาดเล็ก ไม่มี full-screen flash, X-slash หรืออนุภาคจำนวนมาก จุดเตรียมอยู่ที่ผู้ใช้และปะทะอยู่ที่ผู้รับจริงจาก event ของ fixture; Parry ใช้ผู้รับของ counter จริง ไม่แสดงการสวนในจังหวะตั้งท่า

## อ่านภาพอย่างไร

- แต่ละช่องคือสนาม 390×844px จริง โดยใช้ภาพอ้างอิงเดิมซ้ำทั้ง 3 จังหวะ จึงไม่มี AI วาดหน้าตัวละคร ฉาก หรือ UI ใหม่
- HP/UI ในภาพอ้างอิงคงเดิมทุกช่อง: **นี่คือแบบภาพนิ่งของ VFX ไม่ใช่การบันทึกผลต่อสู้ที่ทำงานแล้ว** ไม่มีตัวเลขความเสียหายหรือสถานะสมมุติเขียนลง texture
- เวลา contact/end ยังเป็นของ `src/ui/battle-playback.ts` และไม่ได้เปลี่ยนในงานนี้ รูปทั้ง 3 ช่องไม่ใช่ช่วงเวลาที่แบ่งเท่ากัน
- เมื่อผลิตจริงยังต้องแยก hit / blocked / dodged / guarded / cancelled / absorbed ตาม resolved events; block ห้ามมีดาวบนตัว, dodge ห้ามมี contact, cancel ห้ามมีภาพมาถึงช้า
- ภาพต้นฉบับแต่ละ strip เป็น concept ไม่ใช่ flipbook สำเร็จ ใช้กำหนด silhouette/layers/พื้นที่ก่อนสร้างเฟรมเคลื่อนไหวจริง ชิ้นส่วนที่เหมือนกันยังรวมเป็น atlas เดียวได้
- ผลตรวจทางเทคนิคไม่ใช่การอนุมัติภาพ ต้องตรวจคลิปหลังนำแบบที่เลือกไปทำจริงอีกครั้ง ยังไม่เริ่มตระกูล 2

## ไฟล์และการทำซ้ำ

- Source RGBA 10 strips ขนาดจริงไฟล์ละ **2172×724px** (ขอ 1536×512 แต่เครื่องมือคืนขนาดนี้): `incoming/ART-VFX-BLADE-STORYBOARD-001/source/`
- Prompt เต็มทุกท่า: [generation-prompts.json](../../../incoming/ART-VFX-BLADE-STORYBOARD-001/generation-prompts.json)
- ภาพสนามที่จับจากเกมโดยไม่มีคำสั่งต่อสู้ และ anchor จริง: `incoming/ART-VFX-BLADE-STORYBOARD-001/reference/`
- [manifest.json](manifest.json) เก็บขนาด source, alpha range, พื้นที่ของ 3 phase และขนาดวางเสนอ แต่ละภาพยังมี alpha จริงและไม่ถูกวาดแก้/ลบพื้นหลังด้วย script
- `build_manifest.py` วิเคราะห์เฉพาะ alpha และเขียน metadata; `viewer.js` จัดวางภาพด้วย canvas; PNG ของ storyboard จับจาก browser จริง

```powershell
$env:FX_STORYBOARDS='references'
npx playwright test tests/browser/blade-storyboards.spec.ts
python docs/combat-presentation/blade-storyboards/build_manifest.py
$env:FX_STORYBOARDS='render'
npx playwright test tests/browser/blade-storyboards.spec.ts
```

ต้องใช้ Python ที่มี Pillow; ไม่ต้องมี image API key การสร้าง artwork ในรอบนี้ใช้เครื่องมือ ImageGen ในแชต ไม่ใช้ CLI/API fallback

ตรวจไฟล์ส่งครบแล้ว: **10 storyboard ขนาด 1170×950px** (สนาม 390×844px จำนวน 3 ช่องต่อแผ่น), **10 ภาพปะทะ 390×844px**, source RGBA 10 strips มี alpha จริงทั้งหมด เปิดตรวจภาพปะทะทุกท่าและแผ่น 3 จังหวะตัวแทนแล้ว Typecheck / lint / build ผ่าน; Playwright จับ reference 1/1 และ render/ปุ่มเทียบภาพ 1/1 ผ่าน (อีก test ข้ามตามโหมดที่เลือก) ทดสอบด้วย Chromium ในเครื่อง ไม่ใช่การตรวจอุปกรณ์จริง ไม่มี production source เปลี่ยน จึงไม่รัน unit/battle suite ใหม่สำหรับงานภาพนิ่งนี้ ภาพเหล่านี้ยังไม่ได้ต่อเข้า gameplay; VFX R3 และคลิปเดิมใน [blade-slice](../blade-slice/README_TH.md) ยังเป็น implementation ปัจจุบันใน PR #59
