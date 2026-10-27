# C5.3 — แสงรักษา / artwork R1 รอเลือกก่อน runtime

27 ตุลาคม 2026 · `codex/vfx-family-3-healing` → `feature/fateweave-initial-prototype` · หนึ่ง PR ตลอดตระกูล3

เปิด [หน้าเลือก 6 ท่า / 3 จังหวะ](index.html) ขนาดสนามจริง390×844 มีเลือกท่า/phase, เทียบสนามเปล่า, ปรับน้ำหนัก60–110% และคืนค่า แบบเริ่มต้น100% คือข้อเสนอ ไม่ใช่ภาพที่เจ้าของเลือกแล้ว

| ท่า | รูปทรง / กลไกจริง |
|---|---|
| Heal | กลีบมิ้นต์ประคองจุดเดียว เฉพาะผู้ได้คืน HP จริง; ไม่วาด heal เมื่อเต็ม HP; barrier/twin heal ต้องอ่าน event แยกใน runtime |
| Prayer | พัดแสงโปร่งตอบรับหลายคน เฉพาะผู้ได้ heal; longprayer echo ต้องเป็นอีก cue ในรอบถัดไป |
| Rouse | ฐานทองที่ผู้คุ้มและฐานหยกที่เพื่อนที่ถูกคุ้ม แยกเป็นคู่ ไม่ใช่ฮีล ไม่ใช้คลื่น Rally; ตำแหน่งมาจาก guard/all ของ resolver |
| Revive | จุดรุ่งแสงจากพื้นเปิดออกเฉพาะคนที่ล้มในศึกนี้; reference มี prelude คำสั่งจริงจนเพื่อนล้ม ไม่ตั้ง fell หรือปลอม revive event |
| Bless | ตอน cast เป็นเมล็ดพร ไม่ฟื้น HP; เลือก “ฮีลรอบถัดไปจริง” เพื่อดูใบพร/หยดน้ำของ Renew ที่มี heal event |
| Mend | ตอนเริ่มเพลงเป็นริ้วเสียงที่ Bard; เลือก tick เพื่อดูริ้วรับการรักษาของเพื่อนที่ได้ heal ตอนเริ่มรอบใหม่จริง |

ทั้ง6ท่ามีเตรียม/จุดเด่น/สลาย รวม18ช่อง และ Bless/Mend tick แยกอีก6ช่อง ภาพสลายไม่สื่อว่าสถานะหมด ภาพเหล่านี้เป็น **static concept composites**: screenshot สนาม/ตัวละคร/HP/UI จริงหนึ่งภาพต่อท่าเหมือนกันทุก phase เพื่อเทียบ footprint และน้ำหนัก ไม่ใช่ภาพ HP หลัง heal ไม่ใช่คลิป runtime และไม่ใช่การอนุมัติ motion

เปิดภาพจุดเด่นทีละ390px: [Heal](heal-cast-1-390.png) · [Prayer](prayer-cast-1-390.png) · [Rouse](rouse-cast-1-390.png) · [Revive](revive-cast-1-390.png) · [Bless cast](bless-cast-1-390.png)/[tick](bless-tick-1-390.png) · [Mend cast](mend-cast-1-390.png)/[tick](mend-tick-1-390.png)

ImageGen สร้างเฉพาะเอฟเฟกต์ RGBA ไม่มี UI/ตัวละคร/ฉากที่ AI วาดทับ เก็บต้นฉบับสองแผ่นกับ prompt เต็มที่ [ART-VFX-HEALING-001](../../../incoming/ART-VFX-HEALING-001/NOTES.md) ไม่คัดลอกของจาก sibling project ขั้น compositor แยกcell/ฉายลงระนาบพื้นด้วย X/Y scale ร่วมต่อstrip/alpha blend; peak สูง18px (tick16px), baseline footY+34 และเว้นแถบชุด/รองเท้า/HPถึงfootY+14; ไม่มีการวาด pixels ใหม่ จุดยึดจาก actorPanels จริง, recipients จาก resolver จริง ภาพ Rouse แยกครึ่งทอง/หยกของcell ไปคนละผู้รับ ไม่แสดงทั้งคู่ซ้ำทุกคน

## ฐานและ release proof ที่ตรวจแล้ว

ฐานที่ fetch: `e618483eac9bddf1e5d76da6603d6cc5b403d758` (docs-only follow-up หลังตระกูล2)

- PR#77 merged `afeef4a3e356046efe4814803fb1c8161509e5c6`; ตรวจ metadata ผ่าน GitHub connector
- Pages run40441295039 completed/success ตรง mergeSHA; build, browser4shards และ deploy success ตรง release proof
- defense atlas ใน checkout496190bytes SHA256 `f618e519eb083d85e7493b51f762666a6dd52224cc7157c648d89de1de526e20` ตรง [release.json](../../validation/defense-vfx-release/release.json)
- ไม่อ้างตรวจ HTTP200 หรือ hash จาก CDN ใหม่

## ทำซ้ำ / ตรวจ

```sh
HEALING_ART=references PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/healing-art.spec.ts
python docs/combat-presentation/healing-storyboards/build_manifest.py
HEALING_ART=render PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/healing-art.spec.ts
python docs/combat-presentation/healing-storyboards/verify_composites.py
```

ผลตรวจ: 858unit/75filesผ่าน; reference capture1/1 และ viewer/control/export1/1 ผ่าน (คนละโหมด อีกข้อ skip ตามโหมด); typecheck/lint/buildผ่าน ตรวจ24composites390×844 และเทียบ pixels ทุกพื้นที่นอกแถบพื้นสองแถวตรง screenshot อ้างอิงทั้งหมด ชุด/รองเท้า/HP/HUD จึงไม่มี pixels ของ VFX ทับ การผ่านนี้ตรวจการจัดภาพ/กลไกอ้างอิง ไม่ใช่การผ่านmotionหรือความสวยโดยเจ้าของ

ใช้ Chromium cloud/SwiftShader ไม่ใช่ผลมือถือจริงหรือ Safari; Browser plugin ไม่มี callable browser-control tool ในเซสชันนี้ จึงใช้ Playwright สำหรับ local fixture ผู้ดูเลือกภาพก่อนสร้างหนึ่ง healing atlas/module แล้วจึงต่อ runtime และส่งคลิปจริงครบ6ท่า/เหตุการณ์/normal-fast-reduced-OS-reduced ใน PR เดิม ห้ามตีความหน้าภาพนี้เป็นการผ่าน runtime หรือเริ่มตระกูล4
