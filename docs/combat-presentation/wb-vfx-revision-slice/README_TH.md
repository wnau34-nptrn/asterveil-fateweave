# คลิปหลังนำเข้า revision — 390px

คลิปเกมจริงจาก atlas `boss_signature_fx` หลังแทน7เลเยอร์ของ ART-VFX-WB-TRIO-REV-001 ใช้ Chromium touch emulation390×844, normal speed / normal motion ไม่ใช่มือถือจริง/iOS Safari ทุกกรณีใช้ BattleUI/BattleScene/playback และเทิร์นจริงจากresolver ไม่ใช่ภาพ composite

1. [Severing Bolt normal](severing-bolt-normal-390.mp4)
2. [Shadow Tide normal](shadow-tide-normal-390.mp4)
3. [Wing Gathering normal + waiting hold](wing-gathering-normal-390.mp4)
4. [Wing Gathering release — hold หายเมื่อปล่อย Worldshard Dive](wing-gathering-release-390.mp4)
5. [Wing Gathering break — Bash ตัด charge / บอส Staggered ไม่มี cue/hold](wing-gathering-break-390.mp4)

ภาพ `*-prepare/peak/end-390.jpg` เป็น screencast frame เดิมไม่แต่งภาพ เลือกจากช่วงที่เลเยอร์แสดงจริง alpha>.5; end คือเฟรมสุดท้าย (normal Wingเห็นhold) ตัวบอสและเป้าหมายอยู่ในตำแหน่ง renderer จริง ไม่มีการย้ายภาพ VFX เพื่อทำหลักฐาน

[ภาพเทียบก่อน/หลังจริง + ข้อจำกัด](../../validation/wb-vfx-revision/README_TH.md) (แต่ละช่อง390px, ภาพก่อน/หลังถ่ายคนละครั้ง จังหวะร่างกายอาจต่างกัน) · [ข้อมูลเวลาของคลิป](clips.json)

คลิปเก็บเวลาจริงทุก CDP frame ที่ได้รับ แล้ว encode/ถอดรหัสตรวจจำนวนและ timestamp ซ้ำ ไม่สังเคราะห์เฟรมหรือยืดเวลา ช่องว่างสูงสุดระหว่างเฟรมในคลิปชุดนี้224–294ms ตาม clips.json จึงไม่ใช่การรับรอง60fpsหรือการจับทุกเฟรมrender การตรวจด้วยตาของ Codex เป็นภาพนิ่ง/ลำดับเฟรมเท่านั้น ไม่อ้าง motion ต่อเนื่อง

**เจ้าของ: “นำเข้าเกมได้”** อนุญาตให้นำ revision นี้เข้าเกมแล้ว คลิปใหม่ยังรอเจ้าของอนุมัติภาพและmotionอีกครั้ง ผลเทสต์ไม่ใช่คำอนุมัติ; PR #292 ยังไม่merge

สร้างซ้ำจากrepo:

```sh
WB_VFX_CLIPS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/wb-vfx-clips.spec.ts --grep 'severing-bolt-normal|shadow-tide-normal|wing-gathering' --trace off --output=test-results/wb-vfx-revision-clean-capture
python3 -I tests/browser/fixtures/encode-wb-vfx-clips.py test-results/wb-vfx-revision-clean-capture docs/combat-presentation/wb-vfx-revision-slice
```

Executable path เป็นของเครื่องที่ถ่าย; เครื่องอื่นใช้ Chromium ที่ติดตั้งจริง ไม่เปลี่ยน timing เพื่อให้คลิปดูช้าลง
