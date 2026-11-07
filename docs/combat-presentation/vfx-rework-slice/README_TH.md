# ART-VFX-REWORK-001 — ตรวจ motion ที่ 390px

คลิปจาก Chromium touch emulation ขนาด 390×844 ไม่ใช่ผลบนมือถือจริงหรือ iOS Safari การผ่านเทสต์ไม่ใช่การอนุมัติ motion ของเจ้าของ

สนามนี้เป็น encounter สังเคราะห์สำหรับ QA (ตั้งเลือดสูงให้ดูเอฟเฟกต์จนจบ) ไม่แก้ content หรือตัวเลขที่เกมใช้งานจริง

ชุดทดสอบใช้ BattleUI, BattleScene, playback และ resolver จริง ภาวะก่อนเริ่มเกิดจากการ replay คำสั่งจริง (เคลือบพิษ → โจมตี, หรือ Bolt สามครั้ง) ภาพ/ตัวเลขบนจอจึงมาจาก event ของเกม ไม่ใช่ storyboard ที่สร้างขึ้น

ข้อสังเกตจาก event จริง: หากเคลือบพิษยังเหลือจำนวน hit สกิล disarm อาจติดพิษใหม่ระหว่างการโจมตี/ระเบิด จึงอาจยังเห็น emblem หลัง burst ได้ ภาพต้องตามสถานะสุดท้ายจริง ไม่บังคับลบเอง

กรณี: coat, stack, tick (จบรอบจริง), burst พร้อม splash, storm สี่ hit, early หยุดหลังหนึ่ง hit เมื่อเป้าล้ม, shadow พร้อมการหลบภายหลัง, arcane-gain, arcane-release สามประจุ และ clash; storm มี normal/fast/reduced/OS reduced-motion

สร้างซ้ำ:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium VFX_REWORK_CLIPS=1 npx playwright test tests/browser/vfx-rework-clips.spec.ts --output=/tmp/vfx-rework-out
python3 -I tests/browser/fixtures/encode-vfx-rework-clips.py /tmp/vfx-rework-out
```

Encoder เก็บ timestamp ของทุกเฟรม CDP แบบ variable frame rate แล้ว decode MP4 ตรวจขนาด 390×844, จำนวนเฟรม และ timestamp อีกครั้ง โดยไม่สร้างเฟรมแทรก คลิปใช้เวลา wall clock ของ Chromium ที่รันในคลาวด์ จึงดู `clips.json` สำหรับช่องว่างระหว่างเฟรมจริงก่อนตัดสินความลื่น

ผลตรวจ local:
- typecheck, lint, build และ coverage:presentation ผ่าน; ตรวจ asset 69 hashes/ขนาดไฟล์, decode PNG และเทียบคืน 37 เฟรมจาก lossless atlas ผ่าน
- npm test รอบแรก: 115 files / 1647 tests ผ่าน, 6 skipped, 4 failures (manifest ไม่อยู่ใน sparse checkout, hash เปลี่ยนระหว่างจัด artifact และ timeout สองกรณีขณะรันพร้อม browser)
- รัน 4 files ที่ล้มซ้ำหลังแก้สภาพแวดล้อม: 21 tests ผ่าน รวม boss balance 128.21s โดยใช้ timeout เดิม 180s; ไม่มีการเปลี่ยนกติกา/ตัวเลขเพื่อให้ผ่าน
- Browser ที่เกี่ยวข้อง 37 กรณีผ่านจากรอบหลักและรอบรันซ้ำ; ชุดใหม่ 13 กรณีตรวจซ้ำโดยนับเฉพาะ image ที่มองเห็นจริง รวมคมฟันครบ 4 มุม
- คลิปชุดสุดท้ายรอ optional unit atlas ครบและ warmup 1–3s ก่อนบันทึก; ทุกคลิปใช้ resolver/state/จังหวะเกมจริง
- ผล quality + browser ของ PR เป็น gate สุดท้าย ดูสถานะจาก PR; ยังไม่ merge และยังรอเจ้าของตรวจ motion

เปิด `index.html` เพื่อดูทั้งหมด หรือเปิด MP4 แยกไฟล์ได้จากรายการใน `clips.json` โดย `heroEffectCapture` ระบุจำนวนเฟรมและช่องว่างเฉพาะช่วงเอฟเฟกต์จริง


Encounter นี้เป็น QA fixture ที่ปรับ HP/SPD เฉพาะใน tests เพื่อให้เห็นหลาย hit และจบรอบได้ครบ ไม่ได้เปลี่ยน content ของเกม

ข้อจำกัดการบันทึก: Chromium/SwiftShader ในคลาวด์มีช่องว่างระหว่างเฟรมและ GPU latency บางช่วง จึงอาจไม่เห็นทุก beat ใน MP4; `heroEffectCapture` วัดหน้าต่าง contact ที่ CPU ขอ การตรวจครบ 4 มุมใช้ source browser assertions แยก คลิปนี้ไม่ใช่ผล FPS บนมือถือจริง
