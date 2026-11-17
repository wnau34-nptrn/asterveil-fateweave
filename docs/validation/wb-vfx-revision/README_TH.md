# นำเข้า ART-VFX-WB-TRIO-REV-001

เจ้าของสั่ง **“นำเข้าเกมได้”** แล้วมอบหมาย **“คุณทำการตรวจสอบแทนเจ้าของ”**: Codexตรวจและยอมรับrevisionสามจุดสำหรับ390pxแล้ว ดู [ผลตัดสินและขอบเขตหลักฐาน](CODEX_VISUAL_REVIEW_TH.md) เป็นการอนุมัติของCodexตามมอบหมาย ไม่อ้างว่าเจ้าของดูคลิปเอง ยังไม่merge #292หรือเผยแพร่เกม

สาขา `codex/wb-vfx-revision-intake` ต่อจาก PR #292 (`df25df9`) + แพ็กเกจภาพ #293 คง package ต้นทางทั้งสองชุด ไม่เขียนทับไฟล์ใดใน `incoming/ART-VFX-WB-TRIO-001/` หรือแก้ภาพที่ส่งใน revision

## สิ่งที่เข้าเกม

แทนเพียง 7 เฟรมใน `public/assets/fx/boss_signature_fx.webp`: Severing Bolt prepare/peak/settle, Shadow Tide prepare/peak/settle, Wing Gathering prepare (รวม waiting hold ที่ใช้เฟรมนี้อยู่แล้ว)

ใช้ช่อง atlas เดิมทุกช่อง จึงไม่แก้ atlas JSON หรือ `boss-signature-art.json` และไม่แก้ runtime/routing/anchor/pivot/offset/width/normal blending/playback timing ช่วง prepare/peak/settle และ hold ทั้งหมดเหมือนเดิม ไม่แตะ rules/save/catalog.ts/balance/content version; `5278f631cd330bde` เหมือนฐาน

`intake-report.json` บันทึกผลตรวจ RGBA หลัง encode/decode จริง: 7 canvas ตรงภาพใหม่ทุกพิกเซล และอีก **74 canvas ไม่เปลี่ยนทุกพิกเซล** รวม81เฟรม Alpha เดิมทุกพิกเซล ขนาด1778×1949 (13,861,288 bytes decoded) เท่าเดิม WebP จาก2,713,368 เป็น2,721,618 bytes เพิ่ม8,250bytes ผล coverage/budget สร้างซ้ำแล้ว

สคริปต์ตรวจ/สร้างซ้ำ (Pillow12.3.0; ต้องมี baseline Git object ตามคำแนะนำในสคริปต์):

```sh
python3 -I incoming/ART-VFX-WB-TRIO-REV-001/build_revision.py --verify
python3 -I scripts/apply-wb-vfx-revision.py --write
python3 -I scripts/apply-wb-vfx-revision.py
# Start npm run dev first; executable path depends on the installed browser.
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium node scripts/check-wb-vfx-revision-modes.mjs
```

ไม่รัน build_assets.py ของ package เดิมทับ revision ใหม่ สคริปต์เก่านั้นมีไว้สร้าง R1 ชุดเดิม

## การตรวจ

- typecheck / lint / build ผ่าน
- `npm test -- --maxWorkers=2`: **2038 passed, 23 skipped** (154 files passed,20 skipped); WB VFX เฉพาะ22/22ผ่าน
- `npm run coverage:presentation`:6/6ผ่าน อัปเดต budget download ตาม atlas ใหม่; งบdecodedไม่เพิ่ม
- Chromium `tests/browser/wb-vfx.spec.ts`: **18/18ผ่าน** ครบ13ท่า + Titan/Wing hold/release, Wing break, reduced motion และ fast ตรวจตำแหน่งกับ renderer ในเฟรมเดียวกัน ป้าย HP อยู่บนสุด และ resolver state ตรง expected
- สคริปต์ QA เพิ่มเติม `scripts/check-wb-vfx-revision-modes.mjs` ผ่านครบ6กรณี:3ท่าที่ fast/reduced motion (ดู `modes.json`): peak ตรงจำนวน cue, ไม่มี prepare เมื่อ reduced, Wing holdเป็นbreakable, ป้ายอยู่บนสุด และ stateไม่เปลี่ยน fixture ไม่กำหนด page title และ favicon; identity ตรวจURL/เนื้อหา/atlas ส่วน console ไม่นับ404ของfavicon.icoที่ไม่ใช่assetเกม Browser skill มีในรายการแต่ไม่มี callable JS tool จึงใช้ Playwright ของโปรเจกต์กับ Chromium ในเครื่อง
- รันครั้งแรกด้วย sparse checkout ที่ยังขาด migrations/เอกสาร/ภาพอ้างอิงบางชุดแล้วหยุด เติมไฟล์จาก Git แล้วรันทั้งชุดใหม่ผ่าน ไม่แก้โค้ดเกมเพื่อเลี่ยงเทสต์; npm cache ของระบบเขียนไม่ได้ จึงใช้ cache ชั่วคราวใน/tmp โดยไม่เปลี่ยน dependency/lockfile

## หลักฐานภาพ

คลิปใหม่และภาพนิ่งจากเกมจริงอยู่ [wb-vfx-revision-slice](../../combat-presentation/wb-vfx-revision-slice/README_TH.md) ที่390×844 Chromium touch emulation ไม่ใช่มือถือจริง/iOS Safari ใช้resolver, BattleUI, BattleScene และภาพจากatlasใหม่จริง ไม่ใช่ static composite จากแพ็กเกจภาพ

ภาพเทียบจริง: [Bolt](severing-bolt-before-after-390.png), [Tide](shadow-tide-before-after-390.png), [Wing hold](wing-gathering-before-after-390.png) — ซ้ายก่อนจาก#292/ขวาหลังจากการนำเข้าครั้งนี้ ช่องละ390px ไม่วางVFXเพิ่มเอง; คนละการถ่ายจึงอาจต่างpose/เวลาเลือกเฟรม ดูprovenanceในcomparisons.json

การตรวจด้วยตาของ Codex เป็นการดูภาพนิ่งจากช่วงเตรียม/พีค/hold และลำดับเฟรมที่เลือกจากคลิป **ไม่ได้อ้างว่าได้ดู motion ต่อเนื่อง** เจ้าของมอบหมายให้Codexตรวจแทนแล้ว ผลตัดสินอยู่ในรายงานแยก และไม่ได้ใช้เทสต์แทนการอนุมัติภาพ

ข้อจำกัดที่Codexพิจารณาและยอมรับแล้ว: Bolt บางช่วงพาด bow/เกราะสว่าง, Tide ชิ้นเล็กที่พื้นและอาจถูก HP บังส่วนล่างตามลำดับ DOM เดิม, Wing ขอบบางส่วนยังใกล้cyan core และ peak/settle เดิมเป็นม่วงจัด ไม่แก้ท่า/เวลาเล่นเพื่อชดเชย Codexยอมรับให้ใช้revisionนี้ในขอบเขตภาพ390px ไม่ต้องรอเจ้าของตรวจซ้ำตามการมอบหมาย

## สถานะส่งมอบ

- **สร้างภาพแล้ว:** ใช้7ภาพจาก #293 ไม่สร้างภาพเพิ่มในงานนำเข้า
- **ตรวจด้วยตาแล้ว:** ภาพนิ่ง/ลำดับเฟรมของเกมจริงเท่านั้น
- **ทดสอบในเกมแล้ว:** automated Chromium QA + คลิปจริง5กรณี; ไม่อ้างมือถือจริง
- **ผลอนุมัติ:** Codexยอมรับการใช้revisionตามที่เจ้าของมอบหมายแล้ว อิงภาพนิ่ง/ลำดับเฟรมและQAที่ระบุ ไม่อ้างcontinuous playback reviewหรือคำอนุมัติโดยตรงจากเจ้าของ
