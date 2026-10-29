---
name: fateweave-rules-and-sim
description: Checklist for changing Asterveil-Fateweave battle rules, content numbers, saves or balance — pure deterministic resolver, preview equality, replay-validated saves, version bumps, meaningful Vitest tests and `npm run sim` balance simulation. Use before touching src/core/battle, src/core/save, src/core/world, src/content numbers or simulation tests. Project-made skill (not upstream).
---

# Fateweave — กฎเกม, เซฟ และ simulation แบบ deterministic

Skill นี้สร้างใหม่สำหรับโปรเจกต์นี้ (2026-10-29) โดยสรุปจาก `CLAUDE.md` ("Current architecture", "Development rules") และเอกสารระบบ ไม่ได้มาจากแหล่งภายนอก
ไม่พบ Skill สำเร็จรูปที่ตรวจสอบได้สำหรับหมวดนี้ เมื่อขัดกัน `CLAUDE.md` และคำสั่งผู้ใช้ชนะ

## ใช้เมื่อไร

- งานที่เจ้าของสั่งให้เปลี่ยนกฎ/ตัวเลข/เซฟ (โมเดล Opus ตาม CLAUDE.md) ไม่ใช่งานภาพหรือ UI
- งานภาพ/VFX/animation ห้ามใช้ skill นี้เป็นเหตุผลแก้กฎ — ถ้าจำเป็นให้ถามเจ้าของ (Codex: เขียนใน "ฝากถึง Claude")

## หลักที่ห้ามละเมิด

1. `src/core/battle` เป็น pure: ไม่มี import Phaser/browser, ไม่มีนาฬิกา, ไม่มีสุ่มดาเมจ; state serialize ได้, ID คงที่, command มี beat stamp
2. กฎใหม่เข้า resolver + `src/content` ก่อนต่อ UI; preview เรียก resolver ตัวเดียวกัน ห้ามคำนวณซ้ำใน UI/scene/tween
3. หนึ่ง action หลักต่อเทิร์น หนึ่งเทิร์นต่อผู้รอดต่อรอบ; ข้ามคิวที่ตาย; ล็อกเป้าจริงตอนศัตรูเริ่มเทิร์น; validate เป้าและ action ซ้ำตอน commit; ปฏิเสธ beat เก่า
4. state ไม่ขึ้นกับ animation: restart/resize/พักแท็บไม่เปลี่ยนผล command ที่ commit แล้ว
5. เปลี่ยนข้อมูล encounter หรือความหมายกฎ → bump `EncounterDefinition.version`; เปลี่ยนรูปเซฟ → bump เวอร์ชันใน `core/save/expedition-save.ts` และปฏิเสธ/ย้ายเซฟเก่าอย่างปลอดภัย เซฟ validate ด้วย command replay

## เทสต์ที่ต้องมี (Vitest, `tests/*.test.ts`)

ขอบ HP, ข้อจำกัด, Guard/interruption, Mark follow-up, การเลือกเป้าตามแถว (หน้าบังหลัง f1/f2 กับ b1/b2), cooldown, barrier/heal, ผลแพ้ชนะ, **preview เท่ากับผลจริง**, **replay ได้ผลเดิม** และเซฟเวอร์ชันเก่าถูกปฏิเสธ/ย้าย
ใช้แบบอย่างจาก `tests/battle.test.ts`, `tests/four-slots.test.ts`, `tests/formation.test.ts`

## Balance simulation

- `npm run sim` (ตั้ง `SIM_REPORT=1`) รันชุด sim ใน `package.json`; รายงานอยู่ `docs/validation/balance-sim/` (เช่น `CAMPAIGN.md`)
- ต้องคงเส้นทางรุกที่ชนะได้และการป้องกันที่ใช้ได้ เทียบโจมตีปกติทั้งสองลำดับความสำคัญเป้า และเส้นทางรุก/รับของสี่อาชีพ ตัวเลือกต้องมีผลเห็นได้โดยไม่บังคับคอมโบเดียว
- ตัวเลขเป็นร่างจนผ่าน simulation; รายงานตัวเลขใหม่และผล sim ให้เจ้าของ

## ก่อนส่ง

`npm run typecheck && npm run lint && npm test && npm run build` แล้ว `npm run sim` เมื่อแตะตัวเลข; ถ้าแตะ UI/input ให้รัน Playwright spec ที่เกี่ยวข้อง อัปเดต `docs/design/SYSTEMS_REFERENCE.md` และ handoff
