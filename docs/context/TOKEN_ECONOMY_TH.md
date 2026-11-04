# การลดการใช้ token ในการพัฒนา — 2026-11-04

เจ้าของสั่งให้ลดการใช้ token และเลือกให้ Claude ทำงานนี้แทน checkpoint ของ Codex (`cc51cd4`, `bcd6133`, สาขา `codex/uxd-02-release-notes`) ที่ไม่เคย push ขึ้น GitHub

## ปัญหาที่พบ (วัดจาก repo ก่อนแก้)

| รายการ | ก่อน | หลัง |
|---|---|---|
| `CLAUDE.md` (Claude Code โหลดอัตโนมัติทุก session) | 36,681 B, 23 หัวข้อ, 18 หัวข้อเป็นบันทึก release | ~20.4 KB, กฎถาวรเท่านั้น |
| `AGENTS.md` (Codex โหลดทุก session) | 1,861 B | ~1.5 KB |
| `NEW-CHAT-HANDOFF-TH.md` | 225 KB | ไฟล์ชี้ทาง < 1 KB |
| `CODEX-TO-CLAUDE.md` | 438 KB | ~15 KB (สองงานล่าสุด) |
| `CLAUDE-TO-CODEX-DEV-TH.md` | 129 KB (ส่วนบนเป็นบันทึกซ้ำกับ CODEX-TO-CLAUDE) | ~54 KB (คิวงาน + ฝากถึง Claude) |
| typecheck ต่อ PR | 2 ครั้งใน `ci.yml` + 4 ครั้งใน browser shards | 1 ครั้ง |

ตัวเลขข้างบนเป็นไบต์ ไม่ใช่ token และยังไม่ใช่ผลวัดการใช้ token จริง

สาเหตุหลัก: `CLAUDE.md` เคยถูกย่อเหลือ 14,472 B เมื่อ 2026-10-22 แต่โตกลับเป็น 36.7 KB ภายใน 19 commit เพราะทุกงานเพิ่มหัวข้อ release ใหม่ และบันทึกงานแต่ละครั้งถูกเขียนซ้ำในสามไฟล์

## สิ่งที่เปลี่ยน

- `CLAUDE.md` เก็บเฉพาะกฎถาวร ข้อความกฎเดิมคัดลอกมาทั้งย่อหน้า (OD-01–OD-12, master plan, ขอบเขต repo, standing authorization, architecture, development rules, expedition, prompt quality) ส่วน OD-13/OD-14 อยู่ในหัวข้อ "Planning order" กฎศิลป์/VFX ที่กระจายอยู่ในบันทึก release ถูกรวมเป็นหัวข้อ "Art, animation and VFX pipeline"
- กฎ UI/คีย์บอร์ดย้ายไป `docs/context/UI_INPUT_RULES.md` (อ่านก่อนงาน UI) โดย CLAUDE.md มีสรุปและลิงก์
- สถานะปัจจุบันอยู่ใน `CURRENT_STATE.md` (≤ ~5 KB, เขียนทับเมื่อจบงาน, มีข้อความเปิดแชตถัดไป)
- บันทึกงานเขียนครั้งเดียวที่ต้น `docs/handoffs/CODEX-TO-CLAUDE.md` ไม่เกิน 12 บรรทัด
- ฉบับเดิมทั้งหมดเก็บไว้ไม่แก้ไขที่ `docs/handoffs/archive/2026-11-04/` (CLAUDE.md, AGENTS.md และ handoff สามไฟล์ ตรง sha256 กับก่อนแก้)
- `.ignore` ทำให้การค้น (ripgrep, Grep/Glob ของ Claude Code, Codex) ข้าม `docs/**/archive/` ถ้าต้องค้นให้ใช้ `rg --no-ignore`
- `tests/agent-context.test.ts` จำกัดขนาดไฟล์บริบท ตรวจว่ากฎสำคัญยังอยู่ และห้ามหัวข้อ release กลับเข้า CLAUDE.md
- CI: ตัด `npm run typecheck` ที่ซ้ำใน `ci.yml` (`npm run build` ยัง typecheck อยู่), browser shards ใช้ `vite build` แทน `build:pages` เพราะ typecheck รันใน `ci.yml` (PR) และ job `build` (Pages, deploy รอทั้งสองงาน), console ตอนเทสต์เบราว์เซอร์ล้มแสดงไม่เกิน 6 ไฟล์ × 3,000 ตัวอักษร ฉบับเต็มอยู่ใน artifact `playwright-results-*` เหมือนเดิม
- ไม่เปลี่ยน gameplay, กฎ, เซฟ, สมดุล, asset, dependencies, permissions หรือ gate ของ deploy

## วิธีวัดผล (Phase 3 — ยังไม่ได้วัด)

**Offline:** เลือกงานตัวอย่าง 3 แบบ (แก้ตัวเลข content + เทสต์, แก้ CSS หนึ่งหน้า, ตอบคำถามโค้ด) รันบน commit ก่อนและหลังการเปลี่ยนนี้ด้วย model เดียวกันอย่างละ 3 รอบ เก็บจำนวน tool call, ไฟล์ที่อ่าน, การอ่านซ้ำ, ขนาด tool output และ token จาก transcript/`/cost` ถ้ามี ถ้าไม่มีให้รายงานว่า "ไม่ทราบ" อย่าแปลงไบต์เป็น token

**CI:** เทียบเวลาของ job quality/browser/Pages ก่อนและหลัง (ดูจากหน้า Actions) และความยาว log ตอนล้มเหลว

## กติกาต่อจากนี้

1. ห้ามเพิ่มหัวข้อ release หรือสถานะใน `CLAUDE.md` ให้เขียนใน `CURRENT_STATE.md` และ `CODEX-TO-CLAUDE.md`
2. เมื่อ `CODEX-TO-CLAUDE.md` เกิน ~40 KB ให้ย้ายรายการเก่าไป `docs/handoffs/archive/<วันที่>/` แบบไม่แก้ไข
3. ถ้าเทสต์ `agent-context` ล้มเพราะขนาด ให้ย้ายข้อความไป archive อย่าเพิ่มเพดาน เว้นแต่เป็นกฎถาวรใหม่จริง
