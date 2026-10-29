---
name: fateweave-art-intake
description: Import a Codex art package from incoming/<ID>/ into Asterveil-Fateweave — verify hashes, normalize unit animation strips or VFX layers, lossless-pack atlases, wire registry/frame layout, check texture budgets, run tests and capture real 390px clips for owner motion review. Use for W1–W8 unit animation or VFX intake, atlas repacking, or texture-budget checks. Project-made skill (not upstream).
---

# Fateweave — นำภาพของ Codex เข้าเกม

Skill นี้สร้างใหม่สำหรับโปรเจกต์นี้ (2026-10-29) จาก pipeline ที่ใช้จริงใน A1–A4 และ C5 ไม่ได้มาจากแหล่งภายนอก
คำสั่งผู้ใช้ปัจจุบัน, `CLAUDE.md` และ `AGENTS.md` มีลำดับเหนือกว่า skill นี้ ใช้ร่วมกับ Phaser skills (`phaser-animations`, `phaser-loading-assets`, `phaser-sprites-and-images`) สำหรับ API ของ engine

## ขอบเขตที่ต้องคงไว้

- ไม่เปลี่ยน rules (`src/core/battle`), save (`src/core/save`), content ตัวเลข, balance หรือ playback timing; ผลบนจอต้องตรง event จริง
- คง optional loading, fallback ภาพนิ่ง, cache, reduced-motion และความเร็ว normal/fast
- ไม่แก้ไฟล์ดิบใน `incoming/<ID>/raw` ที่ Codex ส่งมา ผลที่ normalize แล้วไปที่ `public/assets/...`
- ผลเทสต์และ CI ไม่ใช่การอนุมัติภาพ ต้องให้เจ้าของดูคลิปจริงก่อน merge/เผยแพร่ตาม brief

## ขั้นตอน

1. **ตรวจ package** — fetch branch ของ PR ภาพ ตรวจ SHA-256 ทุกไฟล์เทียบ `validation.json` และ decode PNG ด้วย Pillow ถ้าไม่ตรง (เช่นไฟล์ถูกตัด) ให้ขอ Codex push ใหม่ ห้ามซ่อมเอง อ่าน `NOTES.md`, `strips.json`, `seeds.json` และ R1/R2 ที่เจ้าของเลือก
2. **Normalize** — ทำ `incoming/<ID>/build_assets.py` ตามแบบ `incoming/ART-UNIT-ANIMATION-A4-001/build_assets.py`:
   - หนึ่ง scale ต่อ strip (ไม่ใช่ต่อท่า) อิงพื้นที่มองเห็นเทียบ seed; ระวังท่าแรกที่ปีก/อาวุธพับ
   - ท่ายืนพื้นวาง sole line / foot-centre ร่วม (ชุดก่อน: y=496, x=256 ใน cell 512); ท่าลอยรักษาความสูงตามธรรมชาติ
   - defringe ขอบ แล้ว trim/dedup/pack แบบ lossless (WebP `lossless=True, exact=True`) ชื่อไฟล์มี hash ตามแบบ `scripts/pack-unit-atlases.py`
   - รัน Python ที่อ่านไฟล์ดาวน์โหลดด้วย `python3 -I` และส่ง path เป็นอาร์กิวเมนต์
3. **Wire runtime** — อัปเดต `src/game/visuals/unit-atlases.json`, `unit-frames.ts` (frame layout), `unit-animation-map.ts` (ท่า ↔ action/intent จริง) หรือโมดูล VFX `*-fx.ts` + `*-art.json`; ไม่แตะตัวเลขเกม
4. **งบภาพ** (`docs/design/UNIT_ANIMATION_ROLLOUT_TH.md` §7): ตัวทั่วไป download ≤ ~1.5 MB, decoded ≤ 6 MiB; บอส ~2 MB / 8 MiB; encounter รวม ≤ ~64 MiB decoded (ทวนสำหรับสนาม 10 ตัวตาม OD-05 ก่อน W6–W8) เกินงบให้ลดเฟรมซ้ำ/พื้นที่โปร่งใส/แยก FX ก่อนลดคุณภาพ
5. **เทสต์** — `npm run typecheck`, `npm run lint`, `npm test` (เพิ่ม `tests/unit-aN.test.ts` ตามแบบ `tests/unit-a4.test.ts`: scale/pivot ร่วม, budget, frame count) แล้ว Playwright เฉพาะที่เกี่ยวข้อง เช่น `npx playwright test tests/browser/unit-a4.spec.ts tests/browser/unit-loading.spec.ts` ปล่อยชุดเต็มให้ CI
6. **คลิปจริง 390px** — ใช้ spec `tests/browser/unit-aN-clips.spec.ts` ตามแบบชุดก่อน เก็บใน `docs/combat-presentation/unit-aN-slice/` พร้อม `README_TH.md` และ proof (`scripts/unit-a4-proof.py` เป็นแบบอย่าง) ระบุว่าเป็น Chromium emulation ไม่ใช่มือถือจริง/iOS Safari
7. **ส่งเจ้าของ** — ภาพ 390px 1–2 ภาพต่อหน้าจอ + คลิป รอคำอนุมัติ motion ตาม brief แล้วจึง merge/เผยแพร่ตาม standing authorization
8. **บันทึก** — `docs/handoffs/CODEX-TO-CLAUDE.md`, `NEW-CHAT-HANDOFF-TH.md`, สถานะใน rollout plan และ feedback ภาพสำหรับ Codex รอบหน้า

## ตรวจด้วยตาอย่างรวดเร็ว

ใช้ skill `playwright-cli` (ดู `docs/tools/AGENT_SKILLS_TH.md` สำหรับการตั้งค่า Chromium ในคลาวด์) เพื่อเปิด dev server ที่ 390×844 ดู console error และถ่ายภาพ ไม่ใช่สำหรับคลิปส่งเจ้าของ (คลิปใช้ spec ที่ทำซ้ำได้)
