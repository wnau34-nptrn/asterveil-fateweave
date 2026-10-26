# ลดภาระโหลดแอนิเมชัน — 2026-10-26

เจ้าของแจ้งว่าโหลดช้าลงหลังเพิ่ม pilot Lyra/Hunter จึงแก้การโหลดและแพ็กภาพเดิม ไม่เปลี่ยนจังหวะที่ผ่านแล้ว

- ก่อนแก้ BattleScene preload แผ่น pilot ทั้งคู่ก่อน ready แม้อยู่หน้าชื่อเกมหรือสนามไม่มียูนิตนั้น
- หลังแก้ core พร้อมแล้วเริ่มเล่นได้ทันที; โหลด pilot เบื้องหลังเฉพาะ actor art ของ encounter ปัจจุบันเมื่อเปิดสนาม ไม่มี request pilot ที่หน้าชื่อเกม
- Phaser `wake()` ทำ update ทันที จึงเลื่อน wake ไป microtask ให้ GameShell ติดตั้ง encounter ใหม่เสร็จก่อน ป้องกันโหลด Hunter จาก tutorial ที่ค้างใน scene
- โหลดไม่สำเร็จใช้ภาพเดิมและ procedural motion; ไม่วน request ซ้ำใน encounter เดียว ลองใหม่ได้เมื่อเข้า encounter อีกครั้ง
- เมื่อโหลดสำเร็จใช้ภาพใหม่เมื่อพ้น stage หรือ paint ตามปกติ ไม่ repaint กลางการโจมตี ล้าง texture ของ pilot ที่ไม่อยู่ใน encounter หลังทำลายภาพเก่าแล้ว

| ขนาด pilot ทั้งคู่ | ก่อน | หลัง |
| --- | ---: | ---: |
| Download bytes (หลังรวม JSON) | 2,753,042 | 2,467,380 |
| Decoded RGBA bytes | 50,331,648 (48 MiB) | 10,279,936 (9.8 MiB) |
| Optional pilot ที่ title | ทั้งคู่ | 0 |

ลด decoded pixel budget 79.6% และ download bytes 10.4% ตัวเลข RGBA เป็นขนาดภาพถอดรหัส ไม่ใช่การวัด RAM/GPU รวมจริงหรือเวลาโหลดบนเครื่องเจ้าของ

รัน `python scripts/pack-unit-atlases.py` (Pillow + NumPy) เพื่อสร้างซ้ำจากแผ่น approved เดิม: trim alpha, alias เฟรมซ้ำ, lossless WebP, hashed URL และ Phaser atlas JSON รักษา sourceSize 512×512/ตำแหน่งเท้าเดิมทุกเฟรม สคริปต์ decode WebP ใหม่แล้ว reconstruct ตรวจ alpha และ visible RGBA เท่าต้นฉบับครบ 44 เฟรม ไม่ resize และไม่สร้างภาพใหม่ เก็บต้นฉบับไว้เป็น source และรองรับ client รุ่นเก่า

## การตรวจสอบ

- Unit scheduling/cache/failure/eviction และ atlas bounds/source size: 4 tests; full Vitest 858 tests / 75 files ผ่าน
- Typecheck, lint, Pages production build ผ่าน
- Chromium: จงใจ hold ภาพ optional ทั้งคู่ไว้ แต่ Start, commit และ skip เทิร์นยังทำงาน; จำลอง 503 ยังเล่นได้; title ไม่ร้องขอ pilot และ encounter ไม่มี Hunter ไม่โหลด Hunter
- Pilot basic/Execute/Shadow Knife ที่ 390px และ presentation modes/lifecycle ใช้ Playwright บน Chromium; ผลสุดท้ายบันทึกใน CODEX-TO-CLAUDE.md ภาพตัวอย่าง 390px อยู่ในโฟลเดอร์นี้

ไม่ได้วัดเวลาโหลดบนมือถือจริง/iOS Safari และไม่ได้อ้าง FPS หรือเวลาโหลดเร็วขึ้นเป็นเปอร์เซ็นต์ Core unit/VFX assets เดิมยัง preload ตามเดิม งานนี้เอา pilot ออกจาก readiness gate และลดภาระภาพที่เพิ่มขึ้น
