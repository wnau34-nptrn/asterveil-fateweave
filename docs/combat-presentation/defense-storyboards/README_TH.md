# C5.2 — โล่/ป้องกัน 11 ท่า · V1 + Low Aura R3

26 ตุลาคม 2026 · **รอเจ้าของเลือก/แก้ artwork ก่อนต่อ runtime**

เปิด [หน้าเลือกท่า](index.html) เพื่อดู เตรียม → จุดเด่น/ตั้งท่า → สลาย บนสนามเกมจริงกว้าง **390px** ปุ่ม 01/02/03 เลื่อนไปจังหวะนั้นโดยไม่ย่อสนาม มีปุ่มเทียบสนามเปล่า ปรับน้ำหนัก 60–110% และคืนค่าแบบเสนอ ภาพแต่ละจังหวะใช้ screenshot เดิม ไม่มี AI วาด UI ตัวละคร หรือฉากใหม่

## Aura R3 — เฉพาะช่วงขา (แบบเสนอปัจจุบัน)

เจ้าของขอให้ aura อยู่แค่ช่วงขา ไม่สูงถึงศีรษะ จึงวาด Stone Armour/Aegis ใหม่เป็น footprint เตี้ยในมุมมองวงรี แทนริ้วสูงของ R2: ศิลาเป็นริ้วเหลี่ยมติดพื้น 88×32px; ผลึกเป็นโค้งแสงลอยต่ำ 80×28px ยึดขอบล่างกับ foot anchor จริงของแต่ละตัว พื้นที่ทั้งหมดจึงอยู่รอบข้อเท้า/หน้าแข้ง ไม่วาดทับลำตัวหรือใบหน้า ใช้สเกลเดียวร่วมสามจังหวะโดยไม่บีบภาพสูงเดิมให้แบน

หน้าเลือกท่าแสดง **R3 low aura** เป็นค่าเริ่มต้นในสองท่านี้ และมีปุ่ม **เทียบ R2 aura สูง**; คืนค่าจะกลับ R3 เก็บ R2 และภาพ 390px เดิมใน `incoming/ART-VFX-DEFENSE-001/archive/r2/` ส่วน V1 ยังอยู่ archive/v1 ตามเดิม Prompt แก้ไขครบใน `aura-r3-prompts.json` ไม่แตะ UI หรือ pixels ด้วย script

ตรวจภาพ 390px ทั้งสองท่าและทั้งสามจังหวะแล้ว Lint/typecheck และ Playwright render/สลับ R2-R3/reset ผ่าน ยังเป็น artwork รอเลือก ไม่เริ่ม runtime หรือขยายตระกูล

## ประวัติ Aura R2 — Stone Armour / Aegis

เจ้าของเสนอว่าเกราะที่วาดทับชุดดูไม่เข้ากับตัวละคร จึงทำตัวอย่าง aura แทนสองท่าที่ทับชุดชัดที่สุด: Stone Armour ใช้ริ้วพลังศิลาทรงเหลี่ยม/ฝุ่นรอบนอก เปิดศีรษะและลำตัว; Aegis ใช้แสงผลึกโค้งโปร่งโอบนอกเงาร่าง ทั้งสองยังเป็น barrier ตามกลไกเดิม ไม่ใช่การเปลี่ยนกฎ ท่าอื่นยังเก็บ V1 เพื่อรอ feedback ไม่เปลี่ยนทุกท่าเป็นวง aura แบบเดียวกัน

ในรอบ R2 เคยมีปุ่มเทียบ V1 กับ R2; ปัจจุบันแทนด้วยการเทียบ R2/R3 ตามหัวข้อด้านบน ต้นฉบับและ metadata ของ V1 เก็บใน `incoming/ART-VFX-DEFENSE-001/archive/v1/`; prompt แก้ไขเต็มอยู่ `aura-r2-prompts.json` ไม่มีการวาดแก้ UI/ตัวละครหรือแตะ pixels ด้วย script

ตรวจภาพ R2 บนสนามจริง 390px ทั้งสองท่าและแผ่นสามจังหวะแล้ว Lint/typecheck และ Playwright render ผ่าน (11 ท่า พร้อมปุ่ม V1/R2 และ reset ที่คืนภาพได้ตรงเดิม) ใช้ reference เดิมโดยไม่จับผลต่อสู้ใหม่ ยังรอเจ้าของเลือกแบบก่อนต่อ runtime ใน PR #77 ใบเดิม

## เอกลักษณ์ตามกลไกจริง

| ท่า | รูปทรงเสนอ | ความหมาย / ข้อจำกัด | ภาพ |
|---|---|---|---|
| Guard | วงเล็บโค้งข้างผู้ใช้ | รับแทนเป้าที่ประกาศ ลดความเสียหาย ไม่ให้ barrier | [3 จังหวะ](guard-board.png) · [390px](guard-peak-390.png) |
| Aegis R3 | Aura ผลึกโค้งต่ำรอบเท้าและหน้าแข้ง | barrier แยกรายคน เฉพาะผู้ได้รับจริง | [3 จังหวะ](aegis-board.png) · [390px](aegis-peak-390.png) |
| Rally | ริ้วธงคลี่เป็นพัด | ลดการโดนครั้งแรกของเพื่อนแต่ละคน ไม่ใช่ barrier เว้นแต่ modifier ให้จริง | [3 จังหวะ](rally-board.png) · [390px](rally-peak-390.png) |
| Bulwark | เสาตั้งฉากกับฐานหนัก | ลดความเสียหายให้แนวหน้า ไม่มีโล่ดูดซับ | [3 จังหวะ](bulwark-board.png) · [390px](bulwark-peak-390.png) |
| Stone Armour R3 | Aura ศิลาเหลี่ยมต่ำติดพื้น ไม่เกินเข่า | barrier ของผู้ใช้ ช่องลำตัว/ใบหน้าต้องโปร่ง | [3 จังหวะ](stonearmor-board.png) · [390px](stonearmor-peak-390.png) |
| Guardian Stone | ศิลาลอยกับสายเกี่ยว | เป้าเดี่ยวแรกเปลี่ยนไปผู้ใช้ ลดท่าและฟื้นผู้ใช้เมื่อรับจริง ไม่ดึงหมู่/รวบรวมพลัง | [3 จังหวะ](guardstone-board.png) · [390px](guardstone-peak-390.png) |
| Halo | วงรีเหนือศีรษะ | ลดเฉพาะพลังงานทั้งทีม ไม่ใช่ heal หรือ absorb | [3 จังหวะ](halo-board.png) · [390px](halo-peak-390.png) |
| Sanctuary | กลีบประคองจากล่าง | HP ของผู้รับไม่ต่ำกว่า 1 ไม่ใช่ heal/ชุบชีวิต หรือ barrier เว้นแต่ modifier | [3 จังหวะ](sanctuary-board.png) · [390px](sanctuary-peak-390.png) |
| Brace | ทวนเดี่ยวค้ำเฉียง | ตั้งท่ารอสวนกายภาพที่แนวหน้า 1 ครั้ง ไม่แทงตอนร่าย | [3 จังหวะ](brace-board.png) · [390px](brace-peak-390.png) |
| Spear Wall | ซี่ทวนสามซี่ขนาน | รอสวนกายภาพที่แนวหน้าทุกครั้ง ไม่มีการโจมตีตอนตั้งท่า | [3 จังหวะ](spearwall-board.png) · [390px](spearwall-peak-390.png) |
| Hold | แนวทวนต่ำทอดขวาง | รอสวนเมื่อแนวหลังโดน ไม่เปลี่ยนเป้า; ลดความเสียหายเมื่อมี holdfirm จริง | [3 จังหวะ](hold-board.png) · [390px](hold-peak-390.png) |

สีตาม skill icons: Knight royal blue/silver/gold; Mage violet/pearl cyan/faint gold; Priest ivory/gold/ขอบ emerald; Spear teal/silver/bronze; Warden slate/stone grey/gold ไม่ใช้การเปลี่ยนสีอย่างเดียวเพื่อแยกท่า Ward ที่ผ่านแล้วไม่วาดใหม่

## อ่านแบบอย่างไร

- สนาม 390×844px ทุกช่องเป็นภาพจริงจาก fixture ที่ใช้ BattleUI/BattleScene ล่าสุด การจับภาพไม่ออกคำสั่งต่อสู้และตรวจว่า committed commands ว่าง พิกัดผู้ใช้/ผู้รับและ events ใน `reference/anchors.json` ได้จาก resolver จริงที่รันแยกในหน่วยความจำ
- ภาพนิ่งนี้ไม่ใช่ผลต่อสู้ที่กำลังทำงาน HP/UI คงเดิม ไม่มีการเพิ่ม barrier/ฮีล/ตัวเลขลง UI; ภาพการสลายหมายถึงชั้น VFX จบ ไม่หมายถึงสถานะหมดหรือโล่แตก
- หน้าพรีวิวเป็น compositor ภาพนิ่ง ไม่เรียก playback/resolver หรือเขียนเซฟ ใช้สเกลเดียวร่วมทั้ง 3 จังหวะต่อท่าเพื่อรักษาขนาดที่วาดไว้ ไม่ยืดแต่ละ phase ให้เต็มกรอบใหม่
- ตัวอย่างเป็นการตั้งรับ ไม่มีคลิป counter ปลอม การสวน/รับแทน/กันล้ม/ดูดซับจริงต้องอ่าน resolved events และทดสอบใน runtime หลังเลือก artwork แล้ว
- ไม่แก้กฎ เซฟ สมดุล เวลา playback unit-animation หรือ assets ที่ใช้ใน production ไม่มี `defense_fx` หรือ `defense-fx.ts` ในขั้นนี้
- หลังเจ้าของเลือกภาพ: รวม atlas/module เดียว ต่อ runtime แล้วตรวจ normal/fast/reduced-intensity/OS reduced motion และ cleanup ก่อนส่งคลิปจริง 390×844 ให้ตรวจ ใช้ PR ตระกูลนี้ใบเดิมและไม่เริ่มตระกูล 3

## ต้นฉบับและทำซ้ำ

`incoming/ART-VFX-DEFENSE-001/source/` เก็บ PNG RGBA ต้นฉบับจาก built-in ImageGen แบบไม่แตะ pixels; `generation-prompts.json` เก็บ prompt เต็มกับชื่อ original ใน output directory ไม่ใช้ Shado หรือ CLI/API สร้างภาพ ไม่มี asset จาก repository อื่น

[manifest.json](manifest.json) บันทึกขนาดจริง alpha range SHA-256 ขอบเขตทั้งสาม phase ขนาดวาง และ events/anchors; `build_manifest.py` วิเคราะห์ alpha และเขียน metadata เท่านั้น ตัดพื้นที่วางด้วย canvas ใน browser ไม่วาดเติมหรือลบพื้นหลังด้วย script

```sh
DEFENSE_STORYBOARDS=references PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/defense-storyboards.spec.ts
python docs/combat-presentation/defense-storyboards/build_manifest.py
DEFENSE_STORYBOARDS=render PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/defense-storyboards.spec.ts
```

เปิดผ่าน Vite ของ repository หรือ local HTTP server ที่ root เพื่อให้เส้นทางภาพตรง ไฟล์ fixture ใต้ tests ไม่ได้ ship ใน production; capture tests ถูก gate ด้วย `DEFENSE_STORYBOARDS` และไม่เปลี่ยน gate ของ blade

ตรวจด้วย Chromium headless/SwiftShader ใน cloud ที่ 390px ไม่ใช่อุปกรณ์จริงหรือ Safari ใช้ Playwright ของ repository ตาม handoff เนื่องจากเซสชันนี้ไม่มี callable Browser `js`/runtime tool การตรวจแบบนิ่งและผลทดสอบไม่ใช่การอนุมัติภาพหรือคลิปจากเจ้าของ

ผลตรวจชุดส่ง: source RGBA **11 strips ขนาด 2172×724px** มี alpha จริงทั้งหมด และ hash/bytes ตรง original; ภาพ 3 จังหวะ **11 แผ่น 1170×950px** (ช่องละ 390×844px) และภาพจุดเด่น **11 ภาพ 390×844px** ครบ เปิดตรวจทุกท่าและแผ่นสามจังหวะตัวแทนแล้ว Typecheck/lint/build ผ่าน; Playwright reference 1/1 และ render/selection/controls 1/1 ผ่าน โดยข้ามอีกโหมดตาม gate ไม่รัน gameplay suite ใหม่เพราะไม่มี runtime เปลี่ยน
