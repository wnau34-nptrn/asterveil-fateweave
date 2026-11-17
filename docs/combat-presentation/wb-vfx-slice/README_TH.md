# คลิป VFX ท่าบอสโลก (ART-VFX-WB-TRIO-001, P11-05 step 5)

คลิปจริงเวลาจริงที่ 390×844 จาก Chromium (touch emulation ไม่ใช่มือถือจริง/iOS Safari) ทุกคลิปเป็นเทิร์นจริงของ resolver: Guardian ตีหนึ่งครั้ง แล้วบอสใช้ท่านั้น
สร้างซ้ำ: `WB_VFX_CLIPS=1 npx playwright test tests/browser/wb-vfx-clips.spec.ts --trace off --output=test-results/wb-vfx-delivery` แล้ว `python3 -I tests/browser/fixtures/encode-wb-vfx-clips.py`

- `<ท่า>-normal-390.mp4` ทั้ง 13 ท่า (ภาพนิ่ง `-prepare`/`-peak` เลือกจากช่วงที่เลเยอร์นั้นแสดงจริง alpha > .5, `-end` = เฟรมสุดท้าย)
- `titan-gathering-normal` / `wing-gathering-normal` ถ่ายต่อ 1.8 วินาทีหลังจบเทิร์นเพื่อให้เห็น hold ที่ค้างรอ: Titan → วงเล็บแข็งของ Mountain Fall (ตัดไม่ได้), Wing → เปลือกร้าวทำลายได้
- `*-release` เริ่มจาก hold ที่ค้างอยู่แล้วปล่อยท่า (hold หายเมื่อปล่อยจริง), `wing-gathering-break` Bash ตัด charge: ไม่มี cue/hold และท่าถัดไปเป็น Staggered
- สนามทดสอบ: ฮีโร่ห้าคนของ encounter บอสโลกจริง ความเร็วจัดให้ Guardian เล่นก่อนบอส (fixture `tests/fixtures/wb-vfx.ts`) Morvane มีราชสำนักยืนครบ Call the Court: Guardian ล้ม f2 (HP 1 ใน fixture) แล้วบอสเรียกคืนเฉพาะ f2
- ใช้ดีไซน์ R1 ทั้งหมด (ตามที่ Codex แนะนำ) R2 ของ Wing Gathering / Call the Court ยังไม่นำเข้า

ผลเทสต์และคลิปไม่ใช่การอนุมัติ เจ้าของต้องอนุมัติ motion/ภาพเอง
