---
name: fateweave-codex-art-brief
description: Write or review a Codex image/animation/VFX brief (prompt) for Asterveil-Fateweave. Use when preparing an ART-* request for Codex, a W1–W8 animation/VFX wave prompt, a fix request for a broken incoming/<ID>/ package, or when checking whether a brief is complete before sending it to Codex. Project-made skill (not upstream).
---

# Fateweave — brief สำหรับ Codex สร้างภาพ

Skill นี้สร้างใหม่สำหรับโปรเจกต์นี้ (2026-10-29) จากคู่มือของเกม ไม่ได้มาจากแหล่งภายนอก
คำสั่งผู้ใช้ปัจจุบัน, `CLAUDE.md` และ `AGENTS.md` มีลำดับเหนือกว่า skill นี้เสมอ

## อ่านก่อนเขียน brief (แหล่งข้อเท็จจริง)

1. `docs/handoffs/ANIMATION_PROMPT_QUALITY_TH.md` — เกณฑ์คุณภาพ prompt และแม่แบบส่งต่อ (ฉบับหลัก)
2. `docs/design/ANIMATION_VFX_COMPLETION_PLAN_TH.md` — ลำดับระลอก W1–W8 ห้ามเริ่ม wave ใหม่เองถ้าเจ้าของยังไม่สั่ง
3. `docs/handoffs/CODEX-ANIMATION-VFX-PROMPTS-TH.md` — prompt copy-ready ที่มีอยู่แล้วและกติการ่วม ใช้ของเดิมก่อนเขียนใหม่
4. `docs/design/UNIT_ANIMATION_ROLLOUT_TH.md` §6–§7 — ขั้นตอนต่อชุดและงบภาพ
5. package ล่าสุดที่ผ่านแล้วเป็นแบบอย่าง: `incoming/ART-UNIT-ANIMATION-A4-001/` (ร่างกาย), `incoming/ART-VFX-ARCANE-SEAL-001/` (VFX)
6. ข้อเท็จจริงจากโค้ด: ท่า/สกิลใน `src/content/heroes/talents.ts`, ศัตรูใน `src/content/enemies/species.ts`, encounter ใน `src/content/encounters/`, seed/ตำแหน่ง cell ใน `src/game/visuals/assets.ts`, frame layout ใน `src/game/visuals/unit-frames.ts`

อย่าแต่งชื่อไฟล์ ภาพอ้างอิง ชื่อท่า หรือความสามารถของเครื่องมือ ตรวจจาก repository ทุกครั้ง

## ขอบเขตหน้าที่ (ห้ามสลับ)

- Codex: ทำภาพเท่านั้น branch `art/<id-ตัวเล็ก>` จากสาขาเกม `feature/fateweave-initial-prototype` ไฟล์อยู่เฉพาะ `incoming/<ID>/` ห้ามแตะ `src/ tests/ public/ .github/` และภาพเดิม เปิด PR แต่ไม่ merge
- Claude: normalize/pack/registry/เทสต์/คลิปในเกม (ดู skill `fateweave-art-intake`)
- ภาพต้นฉบับเท่านั้น ห้ามนำจาก Asterveil: Rise Beyond (ยกเว้นเพลงตาม CLAUDE.md)

## เช็กลิสต์ brief ที่ครบ

ใช้หัวข้อจากแม่แบบใน `ANIMATION_PROMPT_QUALITY_TH.md` ("รูปแบบส่งต่องานให้ Codex") ครบทุกหัวข้อ และตรวจว่ามีสิ่งต่อไปนี้:

- [ ] ID งาน `ART-…-NNN`, branch `art/<id>`, base เป็นสาขาเกม (ไม่ใช่ `main`)
- [ ] seed = ภาพในเกมปัจจุบัน ระบุ atlas/cell จาก `assets.ts` ทิศที่หัน และเส้นพื้น (ชุดก่อนใช้ y≈497 ใน cell 512)
- [ ] หนึ่ง strip ต่อท่าทั้งแถว (เตรียม → ปล่อย → ตามแรง → คืนท่า) จำนวนเฟรมตาม brief ของชุด ไม่ใช้ค่าตัวอย่าง
- [ ] ขนาดตัวเท่ากันทุกแถบและใกล้ seed; ช่องโปร่งใสระหว่างท่ากว้างจริง (feedback A3/A4: แถบติดกัน, scale ต่อแถบต่างกันมาก, ท่าแรกปีกพับตั้ง scale ไม่ได้)
- [ ] alpha จริง ไม่มีลายตารางปลอม; เผื่อพื้นที่อาวุธ/ผม ไม่ตัดขอบ
- [ ] แยกร่างกายกับ VFX: ไม่วาดกระสุน/แสงใหญ่ใน body strip
- [ ] VFX: ชั้นโปร่งใส 256×256 สามจังหวะ (เตรียม/พีค/จบ), storyboard กว้าง 390px, anchor (มือผู้ร่าย/กลางตัวเป้า/เท้าเป้า/ทั้งฝั่ง) และเวลาเสนอ, ไม่บังหน้าและป้าย HP, ไม่มีตัวอักษรจริง
- [ ] R1/R2 เมื่อท่าตีความได้หลายแบบ พร้อมตัวที่แนะนำ
- [ ] ไฟล์ส่งมอบ: seeds, raw strips, preview 390px, `prompts.json`, `seeds.json`, `strips.json`, `validation.json`, `NOTES.md`, สคริปต์ handoff ที่ทำซ้ำได้
- [ ] push ด้วย git ปกติ แล้ว fetch กลับมาตรวจ SHA-256 ทุกไฟล์เทียบ `validation.json` และ decode ด้วย Pillow (PR #90 เคยถูกตัดที่ ~768 KB)
- [ ] ระบุว่าการเลือกภาพและการอนุมัติ motion เป็นของเจ้าของ ผล CI/ผลเทสต์ไม่ใช่การอนุมัติ

## สิ่งที่ brief ห้ามเปลี่ยน

ไม่เปลี่ยน rules/save/content/balance/playback timing ไม่ขยายขอบเขตไป family7 หรือ wave ถัดไปเองถ้าเจ้าของยังไม่สั่ง
ถ้างานภาพต้องการการเปลี่ยนกฎ/เซฟ/ตัวเลข ให้บันทึกคำถามใน "ฝากถึง Claude" ของ `docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md` ตาม `AGENTS.md`

## รายงาน

แยกให้ชัด: "เขียน prompt แล้ว" / "Codex สร้างภาพแล้ว" / "นำเข้าและทดสอบในเกมแล้ว" อย่าอ้างผลที่ยังไม่เห็นจริง
