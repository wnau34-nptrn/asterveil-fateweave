# ส่งต่องานพัฒนาให้ Codex ระหว่างรอ Usage ของ Claude (2026-10-23)

Claude ใช้ Usage รายสัปดาห์เกือบหมด (รีเซ็ต พ. 28 ต.ค. 19:00) ระหว่างนี้ให้ Codex พัฒนาต่อตามลำดับในไฟล์นี้ เมื่อ Claude กลับมาจะตรวจ PR ของ Codex ก่อน แล้วค่อยทำงานที่ต้องตัดสินกฎ/สมดุล

## สถานะตอนส่งต่อ (ไม่มีงานค้างฝั่ง Claude)

- สาขาเกม `feature/fateweave-initial-prototype` ที่ `ff29e98` · CI ผ่าน · GitHub Pages เผยแพร่แล้ว · เซฟ v39
- เสร็จวันนี้: ผู้ร่วมทางทีละคน + รับสมัครทหารรับจ้าง 2 ตัวหลัง prologue (เซฟ v38) · ต้นไม้ใหญ่ครบ 10 อาชีพ (เซฟ v39) — สรุปใน `docs/handoffs/NEW-CHAT-HANDOFF-TH.md` และ `docs/handoffs/CODEX-TO-CLAUDE.md`

## กติกาสำหรับ Codex (ทุกงาน)

- อ่าน `AGENTS.md` → `CLAUDE.md` ก่อน (มีสิทธิ์ทำงานจนจบโดยไม่ต้องขออนุมัติซ้ำ)
- สร้างสาขา `codex/<ชื่องาน>` จากสาขาเกม เปิด PR เข้าสาขาเกม ให้ CI ผ่านก่อน merge ทีละงาน
- ตรวจก่อน push: `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build` + เทสต์เบราว์เซอร์ที่เกี่ยวข้อง (`PLAYWRIGHT_CHROMIUM_EXECUTABLE=<chromium> npx playwright test <ไฟล์>`)
- **ห้าม** เปลี่ยนกฎการต่อสู้ (`src/core/battle`), รูปแบบเซฟ (`src/core/save`), ตัวเลขสมดุลหรือแผนที่ในงานชุดนี้ ถ้างานจำเป็นต้องแตะ ให้หยุดแล้วจดไว้ในข้อ "ฝากถึง Claude" ท้ายไฟล์นี้
- ภาพหน้าจอให้เจ้าของ: 390px เท่านั้น 1–2 ภาพต่อหน้าจอ · เอฟเฟกต์ต้องส่งคลิปให้เจ้าของดูก่อนขยาย
- จบแต่ละงาน: เพิ่มบันทึกสั้นๆ ที่ต้น `docs/handoffs/CODEX-TO-CLAUDE.md` และขีดฆ่างานในไฟล์นี้

## ลำดับงานของ Codex

| ลำดับ | งาน | ชนิด | ขึ้นกับ |
|---|---|---|---|
| C1 | ไอคอนวาด 27 สกิลต้นไม้ใหญ่ (ART-SKILL-ICON-003) + ใส่เข้า atlas ในเกม | ภาพ + ต่อเข้าเกม | ทันที |
| ~~C2~~ | ~~แจ้งเตือน "ทีมยังไม่มีผู้รักษา"~~ **ยกเลิก** (เจ้าของ 2026-10-23: ให้ผู้เล่นเรียนรู้การจัดทีมเองบนแผนที่ ห้ามเพิ่มแถบเตือนนี้) | — | — |
| C3 | เอฟเฟกต์ Execute / Ward (ภาพคิว 19) | VFX | ตรวจก่อนว่าเซสชัน Claude "เอฟเฟกต์ Execute / Ward (A8)" ยังไม่ merge |
| C4 | งานภาพที่เหลือในคิว `docs/handoffs/CODEX-ART-QUEUE-TH.md` (ข้อ 14, 16, 17, 18, 20, 22) | ภาพ | ทันที (เปิด PR ไว้ ให้ Claude รับเข้าเกมทีหลังได้) |

ไม่ใช่งานของ Codex (รอ Claude): การตัดระบบต้นไม้เล็กที่ไม่มีอาชีพใช้แล้วออกจาก `src/core/world/talents.ts`

### C1 — ไอคอนวาด 27 สกิล + ใส่เข้าเกม

```text
TASK C1 — Asterveil · Fateweave: painted icons for the 27 big-tree skills, delivered into the game
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype, work branch codex/skill-icons-003, PR into the base branch.
1. Make the art exactly as specified in docs/handoffs/CODEX-ART-QUEUE-TH.md section 23 (ART-SKILL-ICON-003): 27 icons, same style/scale/palettes as public/assets/ui/skill_icons.webp. Keep sources under incoming/ART-SKILL-ICON-003/ (png/, preview.png, NOTES.md).
2. Put them in the game: rebuild public/assets/ui/skill_icons.webp as one atlas (256 px cells, 6 columns, row-major) holding the 34 current icons in their current order followed by the 27 new ones in the section-23 order, and update src/game/visuals/skill_icons.json (order, cols, rows) to match. src/ui/icons.ts reads the order, so every listed skill switches from its line icon to the painted one automatically; the line-icon aliases in icons.ts stay as the fallback.
3. Check: npm run typecheck, lint, npx vitest run, build; open the camp character sheet "สกิล" and "ความถนัด" tabs for Toma, Sefa, Brann, Lio, Lyra and Eira and the battle dock with a tree skill equipped; send the owner two 390px screenshots (tree page, battle dock). Keep the atlas file size reasonable (WebP quality ~85).
```

### ~~C2~~ — ยกเลิก (เจ้าของ 2026-10-23)

เจ้าของตัดสิน: แมพ 2 ปล่อยไว้ตามเดิม และไม่ต้องมีแถบเตือน ให้ผู้เล่นเจอเองบนแผนที่เพื่อเรียนรู้การจัดทีม

### C3 — เอฟเฟกต์ Execute / Ward

```text
TASK C3 — Asterveil · Fateweave: Execute and Ward effects (only if not already merged)
First check the base branch feature/fateweave-initial-prototype and open PRs: if Execute/Ward effects already landed (search src/game/visuals for execute/ward fx), skip this task.
Otherwise follow docs/handoffs/NEW-CHAT-HANDOFF-TH.md "งานที่ 3" and CLAUDE.md "VFX — status": build Execute and Ward from the painted layers on branch art/art-vfx-exec-ward-001 (read its NOTES.md) in the same language and code shape as src/game/visuals/bolt-fx.ts: unchanged timing, truthful outcomes (a cancelled or absorbed hit must look like it), reduced-motion still frames. Work branch codex/vfx-exec-ward, PR into the base branch. Record short clips for the owner the same way as docs/combat-presentation/bolt-slice/ and do not expand to other skills before the owner approves them.
```

### C4 — งานภาพที่เหลือ

ใช้กล่อง prompt ของแต่ละข้อใน `docs/handoffs/CODEX-ART-QUEUE-TH.md` ตามเดิม (ข้อ 14 ฉากหลังศึกแมพ 2–3, 16 tile ป่า, 17 บอสบท 1, 18 สัตว์เลี้ยง, 20 แผนที่บท 1, 22 ค้อนตีบวก) ส่งเป็น PR ภาพแยกกัน Claude จะรับเข้าเกมเมื่อกลับมา (ถ้าข้อไหนรับเข้าเกมได้ง่ายแบบ C1 ทำต่อได้เลยตามกติกาด้านบน)

## เมื่อ Usage ของ Claude รีเซ็ต (หลัง พ. 28 ต.ค. 19:00)

เปิดแชตใหม่ (Opus) แล้ววาง:

```text
ทำงานต่อในรีโป wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype
อ่าน docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md, docs/handoffs/CODEX-TO-CLAUDE.md, docs/handoffs/NEW-CHAT-HANDOFF-TH.md และ CLAUDE.md ก่อน
แล้วตรวจงานที่ Codex ทำระหว่างนี้ (PR และ commit บนสาขาเกม): รันเทสต์ ดูภาพ แก้สิ่งที่ผิดกติกา รับภาพที่ค้างเข้าเกม ตรวจก่อน push ตาม CLAUDE.md ตอบเป็นภาษาไทย
```

## ฝากถึง Claude (Codex เขียนต่อท้าย)

- (ว่าง)
