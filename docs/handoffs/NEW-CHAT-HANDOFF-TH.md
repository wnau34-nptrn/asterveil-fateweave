# ส่งต่องานให้แชตใหม่ (Claude) — อัปเดต 2026-10-22 รอบค่ำ

อ่านไฟล์นี้ก่อน แล้วอ่าน `CLAUDE.md` (กติกาหลัก สั้นลงแล้ว) — รายละเอียดระบบเดิมอยู่ใน `docs/design/SYSTEMS_REFERENCE.md` อ่านเฉพาะหัวข้อของระบบที่จะแก้ แผนใหญ่ `docs/MASTER_PLAN_TH.md`

## ข้อมูลพื้นฐาน

- รีโป `wnau34-nptrn/asterveil-fateweave` สาขาเกม `feature/fateweave-initial-prototype` (draft PR #1) ทุก push ผ่าน CI แล้วเผยแพร่ GitHub Pages เอง: https://wnau34-nptrn.github.io/asterveil-fateweave/
- ถ้าระบบกำหนดสาขา `claude/...` ให้ทำงานบนสาขานั้นที่ตั้งจากสาขาเกม แล้ว push ทั้งสาขานั้นและ `feature/fateweave-initial-prototype` (เจ้าของสั่งให้ทำงานบนสาขาเกม)
- คุยกับเจ้าของเป็นภาษาไทย ใช้ "ค่ายทหารรับจ้าง" ห้าม "บริษัท" ห้ามคำว่า ม่านเวล; เรื่องหน้าตาเจ้าของตัดสิน ส่งภาพ 390px หน้าละ 1–2 ภาพ
- ตรวจก่อน push: `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build` + เทสต์เบราว์เซอร์ที่เกี่ยวข้อง
  (`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npx playwright test <ไฟล์> -g "<ชื่อ>"`) ชุดเต็มปล่อย CI
- ภาพรีวิวหน้าตัวละคร: `UI_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/ui-shots.spec.ts`; คลิป Bolt: `BOLT_CLIPS=1 npx playwright test tests/browser/bolt-clips.spec.ts` (ประกอบวิดีโอจาก `frames/` + `stamps.txt` ด้วย ffmpeg)
- ข้อความ commit ห้ามใส่ชื่อรุ่นโมเดล; เซฟเวอร์ชัน 34

## ทำเสร็จวันนี้ (2026-10-22)

- A7 ขั้นที่ 1: หน้าภาพรวม/หุ่นแต่งตัว, กระเป๋าตาราง 5 ช่อง (`#pick-…` แล้วการ์ดมี `#wear-…`/`#compare-…`), ชิปตัวกรอง, หน้ารายละเอียด/เทียบไอเท็ม (mockup 02), ต้นไม้อัศวินแบบโหนด (แตะ = เลือก, `#character-talent-learn` = ลงแต้ม)
- A7 ขั้นที่ 1: ช่างตีเหล็ก (mockup 05) ทำแล้ว — แถบเหรียญ, แท็บไอคอน, ไอเท็มกลางจอ, ชิปวิธีพัฒนา, การ์ดผลลัพธ์ ▲▼ (id เดิมครบ) ภาพรีวิว: `FORGE_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/forge-shots.spec.ts` สรุปรางวัล (09) ทำแล้ว (`SUMMARY_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/summary-shots.spec.ts`) ป้ายจ้าง (10) ทำแล้ว (`HIRE_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/hire-shots.spec.ts`; ชิปแนวหน้า/หลัง, ปุ่มสุ่มป้ายย้ายไว้เหนือรายการ) เหลือ: → หน้าค่าย+แถบเมนูล่าง (06) ทำแล้ว (`LOBBY_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/lobby-shots.spec.ts`) — ข้อ 1 ครบ
- ไอคอนสกิลวาด 33 สกิล (`icon(<skill>)` → `public/assets/ui/skill_icons.webp`; `lineIcon()` สำหรับโหนดที่ไม่ใช่สกิล)
- บอสแมพ 1 (หัวหน้ากองหน้า + นักล่าเผ่าอสูร) อยู่ใน atlas foes เฟรม 9–10
- Bolt ใช้ภาพวาดของ Codex (`public/assets/fx/bolt_fx.*`) เจ้าของให้ผ่าน และขยายลูกพลังแล้ว
- คิวงาน Codex ข้อ 13–21 (ศัตรูใหม่ 9 ตัว แมพ 1 เป็นสไลม์/ค้างคาวหน้าตาอ่อน, ฉากหลังศึก, ไอคอนโจมตี, tile ป่า, บอสบท 1, สัตว์เลี้ยง, Execute/Ward, แผนที่บท 1, แผนที่โลก) — `docs/handoffs/CODEX-ART-QUEUE-TH.md`
- `CLAUDE.md` ย่อเหลือ 14 KB + กติกาเปิดแชตใหม่/เลือกรุ่นโมเดล

## การตัดสินใจของเจ้าของที่ต้องทำตาม

- mockup `incoming/ART-UI-MODERN-001/` คือทิศทาง UI (สร้างด้วย DOM/CSS จาก state จริง)
- หน้าค่าย: คงฉากและจุดแตะ NPC + เพิ่มแถบเมนูล่าง; แผนที่/ศึก: คงตำแหน่ง D-pad และขนาดสนาม เปลี่ยนแค่สไตล์; PC คงกรอบแนวตั้งกลางจอ
- ศึก 4 ต่อ 4 (ศัตรู 1–4 ตัว หน้า 2 หลัง 2) ทำหลัง UI ขั้นที่ 1
- ศัตรูหน้าตาไล่จากอ่อนไปโหดตามแมพ: แมพ 1 สไลม์/ค้างคาว ทัพอสูรเฉพาะศึกเนื้อเรื่อง

## งานถัดไป (ทำตามลำดับ) + รุ่นที่แนะนำ

1. ~~A7 ขั้นที่ 1 (UI ตาม mockup ครบ: ช่างตีเหล็ก สรุปรางวัล ป้ายจ้าง หน้าค่าย+แถบเมนูล่าง)~~ เสร็จแล้ว 2026-10-22 — ตีบวก/เพิ่ม Lv ทีละ 1 ขั้น, เอฟเฟกต์ค้อนชั่วคราว (รอภาพ Codex คิวข้อ 22), ฉากค่ายแสดงเฉพาะตัวหลัก 4 ตัว
2. **A7 ขั้นที่ 2 ระบบศัตรู 4 ช่อง (Opus):** engine, encounters, `field-layout.ts`, `hardEncounter`, เซฟ/เวอร์ชันศึก, `npm run sim`, แมพ 1 ใช้สไลม์เมื่อภาพ ART-CHAR-FOES-002 มา; เขียนสรุปตัวเลขให้เจ้าของดูก่อนลงมือ
3. **A7 ขั้นที่ 3 สนาม 8 ตัว + HUD (Opus วางโครง → Sonnet เก็บ)**
4. รับภาพ Codex เมื่อมาถึง (Sonnet): ไอคอนโจมตี, ฉากหลังศึก, tile ป่า, แผนที่บท 1, Execute/Ward

## รอเจ้าของ / รอคนอื่น

- Codex: คิวข้อ 13–21
- เจ้าของ: 3 คำถามใน `docs/LORE_CHAPTER1_TH.md`, Cloudflare token (รุ่น D), ร่างต้นไม้อาชีพอื่น + ระบบตำรา (A6 ส่วน 2, Opus เขียนร่างก่อน)

## ข้อความเปิดแชตใหม่

งานที่ 1 (Sonnet):
```text
ทำงานต่อในรีโป wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype
อ่าน docs/handoffs/NEW-CHAT-HANDOFF-TH.md และ CLAUDE.md ก่อน
แล้วทำ "งานถัดไป" ข้อ 1 (A7 ขั้นที่ 1 ส่วนที่เหลือ เริ่มจากช่างตีเหล็ก mockup 05) ส่งภาพหน้าจอทีละหน้า ตอบเป็นภาษาไทย
```

งานที่ 2 (Opus):
```text
ทำงานต่อในรีโป wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype
อ่าน docs/handoffs/NEW-CHAT-HANDOFF-TH.md, CLAUDE.md และหัวข้อที่เกี่ยวข้องใน docs/design/SYSTEMS_REFERENCE.md ก่อน
แล้วทำ "งานถัดไป" ข้อ 2 (ระบบศัตรู 4 ช่อง) เริ่มจากสรุปแผนและตัวเลขให้เจ้าของดู ตอบเป็นภาษาไทย
```
