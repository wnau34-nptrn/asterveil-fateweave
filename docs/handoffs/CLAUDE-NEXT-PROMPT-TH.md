# Prompt สำหรับ Claude รับช่วงพัฒนาต่อ

รับช่วงพัฒนา Asterveil: Fateweave ต่อจาก Codex โดยเริ่ม **Combat presentation เฟส 3 — C30–C35** และดำเนินการให้ครบทั้งพัฒนา ทดสอบ และเผยแพร่ตามสิทธิ์ที่เจ้าของอนุญาตไว้ใน `CLAUDE.md`

## เริ่มจากข้อมูลจริงใน repository

- Repository: `wnau34-nptrn/asterveil-fateweave`
- Working branch: `feature/fateweave-initial-prototype`
- Git root บนเครื่องเดิม: `D:\My Drive\AI\Project Game\Asterveil-Fateweave\Asterveil-Fateweave`
- อ่าน `AGENTS.md`, `CLAUDE.md`, `docs/UI_DESIGN.md`, `docs/handoffs/CODEX-TO-CLAUDE.md`, `docs/COMBAT_PRESENTATION_IMPLEMENTATION_PLAN_TH.md`, `docs/combat-presentation/PHASE0_SPEC_TH.md`, `docs/combat-presentation/ASSET_BRIEF_TH.md` และ `docs/validation/COMBAT_PRESENTATION_PHASE2.md` ก่อนเริ่ม
- เฟส 0–2 เสร็จและเผยแพร่แล้ว เฟส 2 อยู่ใน PR #36; runtime source `affee50aaab22fccf939ea50db45ba1efe03ad22`, deployed merge `5446357390536fce2344acce0d145b9bb195d53c`, เอกสารสรุป `33694726f1ba5dd135cef50e9b799b4d11ce85fa` และบันทึกส่งต่อฉบับนี้ที่ใหม่กว่า ให้ตรวจ HEAD/remote และการเปลี่ยนแปลงล่าสุดก่อนลงมือ
- Baseline ล่าสุดผ่าน 507 unit tests, 206 browser tests และเกมสาธารณะ 16/16 กรณี พร้อม resolver traces 9 สถานการณ์ที่ไม่เปลี่ยนจากเฟส 0

## งานเฟส 3

1. Intro ของ Rift Warden: รอยแยก → เงาร่าง → ภาพใกล้/ชื่อ → ลงน้ำหนัก → สนาม เชื่อมกับ transition เดิมโดยไม่เล่นฉากซ้ำยืดเวลา
2. จัดลำดับก่อน `beginBattle` และ opening enemy turns ให้ถูกต้อง กดข้ามหรือ reload แล้วไม่เพิ่ม/ข้ามคำสั่งหรือเทิร์นศัตรู
3. ท่าเฉพาะ Crushing Blow และ Rift Bolt ใช้เป้าหมายและผลจริงของ Guard, โล่, หลบ และการขัดจังหวะ ไม่ทำภาพ AoE ให้ท่าเป้าเดี่ยว
4. ฉากปราบบอสใช้ down/outcome จริง แสดงรางวัลที่คำนวณแล้ว และรักษาระบบ 3 ordinary drops + boss bonus/pity ไม่จ่ายรางวัลซ้ำเมื่อข้ามหรือ reload
5. ฉากเต็มครั้งแรก/ฉากย่อเมื่อฟาร์ม พร้อมตั้งค่า “ครั้งแรก/ทุกครั้ง/แบบย่อ” เก็บแยกจาก progression และกำหนดสถานะเคยดูให้ชัดเจน
6. ปุ่มข้ามอย่างน้อย 44px อยู่ในกรอบแนวตั้ง แตะแล้วไม่หลุดไปยืนยันเป้าสนาม มี reduced-motion และ fallback เมื่อ asset/เสียงโหลดไม่ได้

## ข้อกำหนดที่ต้องรักษา

- ใช้ระบบเฟส 1–2 ต่อ: commit/save ก่อน playback, transient before/after เฉพาะ live UI, contact cue ร่วม, cue/sound cancellation และ cleanup ของ Scene รักษา default resolver/replay ที่ไม่สร้าง snapshot เกินจำเป็น
- ไม่เปลี่ยนกฎต่อสู้ RNG loot เซฟ หรือ encounter version เพื่อทำเอฟเฟกต์ ไม่คำนวณผลซ้ำใน UI และไม่สร้างสถานะ/ดาเมจ/ฮีล/critical ที่ resolver ไม่ได้ให้มา
- รักษากรอบเกมแนวตั้ง, named container `game`, controls/keyboard/modal/rotation guards และการเลือกเป้าหมายโดยผู้เล่น ไม่ queue คำสั่งระหว่าง playback
- ใช้เฉพาะ repository นี้ตามขอบเขตใน `CLAUDE.md` ห้ามนำ code/assets จาก Asterveil-rise-beyond มาใช้เกินข้อยกเว้นเพลงเดิม
- เครื่องเดิมมีงานอื่นที่ยังไม่ commit: `docs/GACHA_MONETIZATION_PROPOSAL_TH.md`, `docs/ONLINE_MMO_BUSINESS_STRATEGY_TH.md` และส่วน Online/MMO ใน working handoff ให้รักษาไว้และ stage เฉพาะงานของคุณ ห้าม reset/stash/discard งานเหล่านี้เพื่อทำให้ tree สะอาด
- หลักฐานภาพเฟส 2 อยู่ภายนอก Git บนเครื่องเดิมใต้ `C:\Users\Warunyu.N\.codex\visualizations\2026\10\21\01a15cd5-a6e8-7f81-961a-2a851f62ed4c` ถ้าเข้าถึงไม่ได้ ให้สร้างหลักฐานใหม่ด้วยเครื่องมือใน repo ไม่อ้างว่าได้ตรวจไฟล์ที่ไม่มี
- เสียงบน iPhone/Safari เครื่องจริงและ device FPS ยังไม่ยืนยัน ห้ามรายงานว่าตรวจผ่านจาก Chromium emulation หรือการจับภาพแบบหยุดนาฬิกา

ตรวจ diff และสถานะปัจจุบันก่อนเริ่ม พัฒนาบน branch ใหม่จาก working branch ตาม workflow เดิม ทดสอบ unit/browser/production และสถานการณ์ skip/reload/hidden-tab/resize/reduced-motion/รางวัลซ้ำที่เกี่ยวข้อง ให้ CI ผ่านก่อน merge และให้ Pages workflow ผ่านก่อนตรวจเกมสาธารณะ อัปเดตแผนงานและ `docs/handoffs/CLAUDE-TO-CODEX.md` หรือบันทึกส่งต่อที่ repo ใช้จริงเมื่อเสร็จ ใช้สิทธิ์ที่อนุญาตไว้ดำเนินการต่อเนื่องโดยไม่เพิ่มจุดขออนุมัติซ้ำ และรายงานผลพร้อมข้อจำกัดตามจริง
