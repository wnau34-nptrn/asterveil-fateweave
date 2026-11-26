# ศัตรูเหมืองผลึกร้าง (ART-UNIT-ANIMATION-MINE-001) — นำเข้า 2026-11-26

เจ้าของสั่ง “นำเข้าศัตรูเหมือง 5 ตัวเลย” หลังเลือกหัวหน้าคุมเหมือง R2 (หมวกเหล็ก ผลึกที่ไหล่) และตัวกินผลึก R1 (สีม่วง) ทั้ง 5 ตัวเป็น semi-chibi ตามกติกาสไตล์ภาพของโปรเจกต์ ยักษ์ผลึกและผลึกย่อยยังใช้ภาพแทน (รอ 4b)

| ศัตรู | key / atlas | intent → clip | อัตราแสดงผล | atlas (download / decoded) |
|---|---|---|---:|---|
| ค้างคาวผลึก | `foe_crystal_bat` / `crystalbat` | Crystal Cry → attack, hover 22–25 | 0.75 | 2.21 MB / 9.3 MiB |
| โกเลมแร่ | `foe_ore_golem` / `oregolem` | Ore Fist → attack | 1.0 | 2.63 MB / 9.9 MiB |
| คนงานถูกสิง | `foe_possessed_worker` / `possessedworker` | Pick Swing → attack, ยอมแพ้ = down 19–21 | 1.0 | 2.18 MB / 9.3 MiB |
| หัวหน้าคุมเหมือง (R2) | `foe_mine_overseer` / `mineoverseer` | Overseer Hammer → attack, Crystal Spark → skill | 1.1 | 4.28 MB / 16.2 MiB |
| ตัวกินผลึก (R1) | `foe_crystal_eater` / `crystaleater` | Crystal Bite → attack, Shard Eruption → skill | 1.0 | 3.88 MB / 13.6 MiB |

- สร้างด้วย `python3 -I scripts/build-mine-foes.py <incoming/ART-UNIT-ANIMATION-MINE-001>` ตรวจ SHA-256 ทุกเฟรมกับ `validation.json` แพ็ก lossless ไม่ย่อขนาด และประกอบกลับตรงทุกพิกเซล ภาพนิ่งและพอร์เทรต `units_foes4`/`portraits_foes4` (+ `_half`) ผลอยู่ที่ [foes-runtime.json](../../validation/map5-mine/foes-runtime.json)
- อัตราแสดงผล: ภาพวาดเกือบเต็มช่อง 512 แบบศัตรูทะเลสาบ (1.06–1.25) ไม่ใช่ 2 แบบชุดเก่า เลือกให้ขนาดเทียบฮีโร่ตรงภาพตัวอย่างของ Codex (`preview/field-00-390.png`) ค้างคาวเล็กลง หัวหน้าคุมเหมืองใหญ่สุด
- งบภาพ: ทุกสนามเหมืองอยู่ใน 64 MiB decoded (สูงสุด `mine-yard-patrol` 56.0 MiB กับทีม 5) download ต่อสนาม 13.7–15.9 MB เกินเป้าอ่อน ~12 MB แบบเดียวกับสนามทะเลสาบ (`water-spirit` 17.6 MB) [BUDGET_TH](../../validation/w8-field-audit/BUDGET_TH.md)
- คลิป Chromium 390×844 จาก UI และ resolver จริง (ทีมจากแคมเปญจำลอง เล่นตามคำแนะนำ 6 คำสั่ง): [ลาดตระเวนลาน](mine-yard-patrol-390.mp4) · [หัวหน้าคุมเหมือง](elite-mine-overseer-390.mp4) · [ตัวกินผลึก](elite-crystal-eater-390.mp4) · ภาพนิ่ง `*-390.webp` ฉากรบยังเป็น `ruins` จนกว่าฉากเหมือง (#357) จะนำเข้า · ไม่ใช่การทดสอบบนมือถือจริงหรือ iOS Safari
- ข้อสังเกตที่ยังไม่แก้: Crystal Spark ของหัวหน้าคุมเหมือง (เฟรม 9–16) ขยับน้อย · คนงานถือพลั่วแทนจอบ · การอนุมัติ motion เป็นของเจ้าของ
