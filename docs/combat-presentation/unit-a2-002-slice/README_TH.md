# A2-002 — เอกิส (`guardian`) วาดใหม่ ปลด anatomyHold

30 ตุลาคม 2026 · branch `claude/aegis-a2-002` · รอเจ้าของดูคลิปและอนุมัติ motion (ผลเทสต์/CI ไม่ใช่การอนุมัติ)

- แหล่งภาพ: `incoming/ART-UNIT-ANIMATION-A2-002/` (Codex PR #112; cell 000–025, เลื่อนตาม `cell-transforms.json`) — Claude ตรวจรับ: sha256 ตรง, 000 = seed, median 0.982, ไม่มี drift, 023 ตรวจด้วยตา
- แพ็ก: `incoming/ART-UNIT-ANIMATION-A2-002/build_assets.py` — สเกลเดียวทั้งชุด ×.36, พื้นเท้า y=496, lossless; atlas `aegis_a2` 1280×699, decoded 3.41MiB, ดาวน์โหลด 1,172,543 B (ชุด A2-001 4.22MiB / 1.40MB ถูกแทนที่)
- ตรวจ anatomy หลังแพ็ก: `scripts/unit-anatomy-audit.py aegis` → median 0.984, drift [], not measured [] (`anatomy-packed.json`)
- mapping (เลย์เอาต์เฟรมเดิม): 2–7=001–006 ฟัน (สัมผัสเฟรม 5=004); 10–15=007–012 ยกโล่ (สัมผัส 13=010); 23–28=013–018 bash (สัมผัส 26=016); 17–18=019–020 hit; 19–21=021–023 down; 30–31=024–025 block; 0/1/8/9/16/22/29 = idle
- ปลด `anatomyHold`; ไม่เปลี่ยน rules/save/content/balance/ActionId/contact/end/timing; Vargoth และตัวอื่นไม่แตะ; เทสต์ที่ยึด hold ย้อนกลับ (unit-a1/a2/a3/a4/a5/a6/a7/a8, loading, optional-unit-assets)
- คลิปจริง 26 คลิป 390px (Chromium จำลอง ไม่ใช่มือถือจริง/iOS Safari): โจมตีปกติ normal/fast/reduced/OS-reduce, bash, ยกโล่ (guard), rally/challenge/bulwark/rouse, Shield Smash/Mace Swing, counter, reflect, down, revive — ไฟล์ `*-390.mp4` + `clips.json`
- ภาพก่อน (ถือภาพนิ่ง) ดูที่ `docs/validation/aegis-anatomy-2026-10-29/clips/*-before.mp4`
- ข้อจำกัด: ท่านอน 023 วัดด้วยเครื่องมือไม่ได้ (not-measured) ตรวจด้วยตา
