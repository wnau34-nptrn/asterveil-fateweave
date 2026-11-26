# ยักษ์ผลึก R1 ชุดเต็ม 4b (ART-UNIT-ANIMATION-MINE-BOSS-001) — นำเข้า 2026-11-26

เจ้าของอนุมัติ 4a (“ทำตามที่คุณแนะนำ อนุมัติ 4a”) และยืนยันยักษ์แบบ R1 ที่ 1.32× ของโกเลมหิน ไม่ต้องเป็น semi-chibi Codex ส่ง 4b ใน PR #359 (`77a6e4ba`) ไฟล์ 111 ไฟล์ตรง SHA-256 ใน `validation.json` และ decode ได้ครบ **การอนุมัติ motion ชุดนี้เป็นของเจ้าของ ผลเทสต์และ CI ไม่นับ**

| ตัว | key / atlas | intent → clip | อัตราแสดงผล | atlas (download / decoded) |
|---|---|---|---:|---|
| ยักษ์ผลึก R1 | `foe_crystal_giant` / `crystalgiant` | Crystal Fist 1–4, Shard Beam 5–8, Crystal Collapse 9–12, Crystal Armor 13–16, Crystal Split 17–20, hit 21–22, down 23–25 | 1.67 | 3.67 MB / 12.9 MiB |
| ผลึกย่อย | `foe_crystal_fragment` / `crystalfragment` | Shard Prick 1–4, hit 5–6, down 7–9 | 0.8 | 0.46 MB / 1.5 MiB |

- สร้างด้วย `python3 -I scripts/build-mine-boss.py incoming/ART-UNIT-ANIMATION-MINE-BOSS-001` ตรวจ SHA-256 ทุกไฟล์ ย่อยักษ์จาก cell 768 เป็น 448 (เท้า 7/8 เท่าเดิม) เพื่อให้ 26 เฟรมอยู่ใน texture 2048 เดียว ผลึกย่อย 512 → 256 แพ็ก lossless และตรวจประกอบกลับตรงทุกพิกเซล ภาพนิ่ง/พอร์เทรตเป็นช่อง 5–6 ของ `units_foes4`/`portraits_foes4` ผลที่ [boss-runtime.json](../../validation/map5-mine/boss-runtime.json)
- ขนาด: โกเลมหินสูง 242/512 ของ cell ที่แสดง 2× ยักษ์สูง 572/768 ของ cell ที่แสดง 1.67× = 1.32× ตามที่เลือก
- `scripts/unit-anatomy-audit.py`: ยักษ์ไม่มี drift ทุกเฟรม · ผลึกย่อยเฟรม 3 (พุ่ง) SIFT จับคู่ไม่พอ ตรวจด้วยตาแล้วรูปทรงและเท้าตรง
- VFX `mine-boss-fx` (atlas `mine_boss_fx` 0.12 MB) ตาม event จริงทั้งหมด: เกราะแสดงจาก state ตลอดที่ยักษ์มี `crystalArmor` ร้าวหนึ่งระดับต่อครั้งที่นับ · แตก/หมดเวลาตาม event · สะท้อนจากยักษ์ไปผู้ร่ายที่โดนจริง · ผลึกถล่ม: สามเหลี่ยมเตือนที่เท้าตอนง้าง แล้วผลึกตกกระแทกเฉพาะฮีโร่ที่โดน (reduced motion = ภาพกระแทกนิ่ง) · Crystal Split ตามเหตุการณ์ phase จริง ซึ่งเกิดทันทีในเทิร์นที่ HP ลงต่ำกว่าครึ่ง ยักษ์เล่นท่าแยกผลึกต่อจากท่าโดนตี
- ปรับจากขนาดใน storyboard: ผลึกถล่มขยาย 2.3× (66×82 ทำให้ผลึกสูงแค่ ~10px บังด้วยตัวฮีโร่) และเส้นสะท้อนหนาขึ้น 1.7×
- งบภาพ: ศึกยักษ์ 41.8 MiB decoded / 13.0 MB กับทีม 5 (งบ 64 MiB) [BUDGET_TH](../../validation/w8-field-audit/BUDGET_TH.md)
- คลิป Chromium 390×844 จาก UI และ resolver จริง ทีมจากแคมเปญจำลอง (advisor สายรีบ Lio + Brann seed 1001) กดตามคำแนะนำ 30 คำสั่ง ชนะรอบ 8: [crystal-giant-390.mp4](crystal-giant-390.mp4) (50 วินาที: เกราะขึ้น 6 วิ · ทุบแตก 7.5 วิ · แยกผลึก 17 วิ · ผลึกถล่ม 18 วิ · ล้ม 47 วิ) · ภาพนิ่ง [เกราะ](armor-390.webp) · [ผลึกถล่ม](collapse-390.webp) · ไม่ใช่มือถือจริงหรือ iOS Safari
- ข้อสังเกต: Shard Beam ยังใช้เส้นพลังงานวาดด้วยโค้ด (ชุด 4b ไม่มี VFX ของท่านี้) · reflect/ถล่มเป็นภาพที่ Codex วาดด้วยโค้ด PIL ใน `build.py` ไม่ใช่ ImageGen
