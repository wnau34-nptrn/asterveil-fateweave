## 2026-11-28 — บอสโลกเปิดหลังแผนที่ 3 + อันดับดาเมจ (Claude · `claude/exciting-keller-y9xau2`)

- เจ้าของ “บอสโลกเปิดหลัง Map 3 และเพิ่ม Leader board”: feature `worldBoss` (`unlocks.worldBoss: 3`, กติกา+เซิร์ฟเวอร์ตรวจ) · แท็บ “อันดับ” (ดาเมจรวมรายสัปดาห์, รายบอส, สัปดาห์ก่อน, top 20 + อันดับของคุณ, ชื่อ `ค่าย-XXXXX` แบบแชท) · `GET /v1/worldboss/board` อ่าน `hits` เดิม ไม่มี migration · [รายละเอียด](../validation/world-boss-board-2026-11-28/README_TH.md)
- เทสต์: vitest 2385, typecheck, lint, build, Chromium บอสโลก/บทสอน/server-play/อันดับ ผ่าน · ยังไม่ได้ลองบน staging

## 2026-11-28 — AUTO ปลดล็อกที่แผนที่ 2 + บทสอนใช้ (Claude · `claude/exciting-keller-y9xau2`)

- เจ้าของ “ระบบ auto battle เปิดใช้ได้ map 2 และเพิ่มระบบสอบใช้ให้ด้วย” (ตีความ “สอบใช้” = สอนใช้): `LobbyFeature` เพิ่ม `auto` (`unlocks.auto: 1`) · `BattleSession.auto` จาก `featureOpen` ปุ่มแสดงเมื่อปลดล็อกเท่านั้น · บทสอน `open:auto` ในค่าย + `auto` ในศึกทั่วไป/บอสโลกครั้งแรก ([รายละเอียด](../validation/auto-battle/README_TH.md))
- ไม่แตะ rules/save · เทสต์: tsc, eslint, vitest 2379, build, Chromium `auto-battle` 6/6 (ใหม่: ล็อกบนแผนที่ 1 + บทสอนชี้ปุ่ม), `lessons`, `world-boss-p11`, `world-boss-trio-ui`, `gacha` ผ่าน

## 2026-11-28 — หน้าสกิลแสดงทุกสกิลเป็นการ์ด ติดตั้งด้านขวา (Claude · `claude/exciting-keller-y9xau2`)

- เจ้าของ “อยากให้เป็นสกิลทุกสกิลที่สามารถใช้ได้พร้อมรายละเอียด… กดติดตั้งด้านขวา” → เสนอแล้วตอบ “ตามแนะนำ”: เอาตัวเลือกสกิล (select) ออก ทุกสกิลเป็นการ์ด (`skillCard` ใน `character-view.ts`, `skillsView`) ปุ่มติดตั้ง/ถอดด้านขวา, ล็อกพับไว้ท้าย (ปุ่ม “ไปโหนด”), เพิ่ม Lv พับในการ์ด (จำสถานะพับ), ช่องเต็มแล้วกดติดตั้ง → เลือกช่องที่จะแทน (Esc/ยกเลิกได้), แตะช่องด้านบนเลื่อนไปการ์ด
- ไม่แตะ rules/save · คำสั่ง loadout เดิม (`host.loadout`)
- เทสต์: tsc, eslint, vitest, build, Chromium `unified-skills`, `team-character-navigation`, `painted-skill-icons`, `character`, `equipment-comparison`, `magic-power`, `roster-batch1`, `skill-audit`, `boss-equipment`, `tree-shots`, `ui-shots`, `lessons`, `world` (ส่วนสกิล) ผ่าน; selector ในเทสต์ปรับจาก select เป็นการ์ด

## 2026-11-28 — กดอุปกรณ์ในกระเป๋าแล้วเปิด popup รายละเอียด (Claude · `claude/exciting-keller-y9xau2`)

- เจ้าของ “แก้ไขให้กดอุปกรณ์แล้วรายละเอียด popup แสดงขึ้นมา แก้ไขที่เดิมต้องเลื่อนลงไปดูด้านล่าง”: ช่องในกระเป๋าแท็บอุปกรณ์ (`character-panel.ts`) เปิดการ์ดไอเท็มใน `<dialog>` ซ้อน `#gear-detail-dialog` แบบเดียวกับ popup รายละเอียดสกิล แทนการ์ดใต้ตาราง (ไม่แสดงการ์ดของชิ้นแรกค้างไว้แล้ว)
- ปิดด้วย ✕/Esc/แตะนอกกรอบ แล้วโฟกัสกลับช่องเดิม · สวมใส่/รายละเอียด/พัฒนาใน popup ปิด popup ก่อนทำงาน · กลับจากหน้าเทียบโฟกัสช่องในกระเป๋า · ไม่แตะ rules/save
- เทสต์: tsc, eslint, vitest, Chromium `character`, `equipment-comparison`, `boss-equipment`, `world` (ส่วนกระเป๋า/อุปกรณ์), `lessons`, `ui-shots` ผ่าน (เทสต์ปรับให้กด Esc ระหว่างเลือกชิ้น)

## 2026-11-27 — ท่ายืนเอกิส W1b + ไลรา R4 อนุมัติแล้ว (Claude · #381 / #382)

- เจ้าของดูคลิปยืนยันแล้ว “อนุมัติ”: ไลรา R4 (#382 merge แล้ว) และท่ายืนเอกิสแบบดัดภาพ W1b (#381) · W1b ขยับแรงขึ้นตามคำขอ “ให้ขยับแรงขึ้น” (อก 6 หัว 4 ผม 5.3 ผ้าคลุม 6 ปลายผ้า 5 px บน seed) เฟรม 32–38 บน atlas เอกิสเดิม 1.47 MB
- แก้เทสต์ให้รับท่ายืนวนลูป: `unit-a2`/`unit-a3` (เอกิสพักอยู่ได้ที่ 0/32–38), `unit-loading` นับ atlas ท่าชนะ 4 ไฟล์ · ท่ายืนจากภาพหยุดก่อนท่าชนะและกลับมาในศึกถัดไป
- LIFE-002 ส่งแล้ว (Codex PR #384, แฮชครบ 50 ไฟล์): ผ่านเฉพาะลิโอ R1; มิร่า R2/เซฟา R1/เซรีส ตกแค่เช็กพื้นเฟรม 1 เพราะกติกาใน brief (20+ px) ต่างจากที่ Codex ตรวจ (alpha ≥128 จุดเดียว) — เฟรม 1 คือ seed เดิม ตัวอื่นติดสัดส่วน/อาวุธ/ภาพเสีย
- เปิดค้าง: merge #381 เมื่อ CI ผ่าน · นำเข้า LIFE-002 ที่ผ่าน + prompt แก้ตัวที่เหลือ · prompt ท่ายืนแบบดัดภาพของไลรา/ไอรา/เซเรน · มือถือจริงยังไม่ทดสอบ (ต่อใน chat ใหม่ตาม CURRENT_STATE) · [ผลตรวจ](../validation/hero-life-2026-11-27/README_TH.md)

## 2026-11-27 — ท่าชนะจากภาพ R3 เข้าเกม (Claude · `claude/hero-victory-r3`)

- เจ้าของ “ตรวจสอบ codex” → “ขอ Prompt แก้ไลราและนำที่คุณแนะนำเข้าเกม”: นำเข้าเอกิส R3 ไอรา R3b เซเรน R3 จาก PR #377 เป็น atlas แยก `<sheet>_victory` (โหลดเบื้องหลัง ไม่กันเริ่มต่อสู้ atlas หลักไม่เปลี่ยน) เล่นครั้งเดียวเมื่อชนะจริงแล้วค้างเฟรมสุดท้าย · prompt ไลรา R4 และนำร่องท่ายืนเอกิสแบบดัดภาพ (W1) อยู่ใน brief
- แก้: `bodySprite()` รู้จัก texture `unit-victory-`; repaint เบื้องหลังเมื่อภาพมาถึงใช้ state ของ hero life ใหม่
- เทสต์: typecheck, lint, vitest ทั้งชุด + `unit-victory`, coverage:presentation, Chromium `hero-life` 4/4 · [ผลตรวจ/คลิป](../validation/hero-life-2026-11-27/README_TH.md)
- เจ้าของอนุมัติคลิปท่าชนะ “อนุมัติ” (2026-11-27) · เปิดค้าง: ไลรา R4 · W1 (Codex ส่งแล้ว รอตรวจ) · มือถือจริงยังไม่ทดสอบ

## 2026-11-27 — ฮีโร่มีชีวิตชีวาในฉากต่อสู้ แบบเบา (Claude · `claude/hero-life-code`, PR #376)

- เจ้าของสั่ง “ทำ ข้อ 1, 2, 3 และ 6” → ดูคลิปรอบแรกแล้ว “มันตลกอ่ะ” → “เก็บข้อ 3 ไว้ เอาเข้าเกมได้”, “ทำตามที่คุณแนะนำ”: ตัดท่าตามอาชีพ/โยก/ลอย/เอน/กระโดด เหลือหายใจแบบเดิม (ช้าลงเมื่อเลือด <30%), แสงโล่, วงแสงทองที่เท้าเจ้าของเทิร์น, ประกายตอนชนะ, ทรุดตอนแพ้ ท่าจริงให้ Codex วาด (ART-UNIT-ANIMATION-LIFE-001)
- โค้ด: `src/game/visuals/hero-life.ts` (ต่อเฟรม ไม่มี tween วน) + `BattleScene` (`applyLife`, `finish`, `lifeProbe`) + `battle-ui` (`readyId`, `finish` จาก outcome จริง) · `idleLoop`/`victory` ในภาพแทนโค้ดได้
- เทสต์: typecheck, lint, vitest, build, Chromium `hero-life` 3/3 + battle/auto · [ผลตรวจและคลิป 390px](../validation/hero-life-2026-11-27/README_TH.md)
- เปิดค้าง: ยังไม่วัดบนมือถือจริง · ส่ง brief ให้ Codex วาดท่ายืน/ท่าชนะ

## 2026-11-27 — เครื่องหมายเหตุการณ์ในอุโมงค์มืดเห็นง่ายขึ้น (Claude · `claude/mine-event-beacons`)

- เจ้าของสั่ง “แก้เครื่องหมายในอุโมงค์มืดให้เห็นง่ายขึ้น” เฉพาะการแสดงผลใน `world-ui.ts`/CSS: ชั้น `#beacon-layer` วาดวง “!” เรืองแสงเหนือความมืดสำหรับเหตุการณ์ที่ยังไม่จบในโซนมืดห่าง 1–3 ก้าว (`BEACON_RANGE = 3` ร่าง) และ `.step-hint.on-event` ลดกรอบ ย้ายลูกศรไปมุม (ปุ่มยัง 44px) ไม่เปลี่ยนกฎ เซฟ หรือช่องที่เปิดเผย
- เทสต์: Chromium `mine-events` 7/7 (เพิ่มสเปกเดินเข้าหาสายแร่: beacon ปรากฏที่ 3 ก้าว hint หลบเมื่อติดกัน beacon หายเมื่อเปิดหน้าต่าง), vitest, typecheck, lint · [ภาพ 390px](../validation/map5-mine/event-markers-2026-11-27/02-dark-beacons-390.webp)
- เปิดค้าง: เจ้าของยังไม่ได้ดูผลนี้ · ตัวภาพเครื่องหมายเองในช่องติดกันยังมืดตามความมืดของอุโมงค์

## 2026-11-27 — นำเข้าเครื่องหมายเหตุการณ์แผนที่ 5 (Claude · `claude/map5-event-markers`)

- Codex ส่ง ART-MAP5-EVENTS-001 (#371) เจ้าของสั่ง “นำเข้าเกมเลย ใช้ R1” ตรวจ SHA-256 23 ไฟล์ตรง และ decode ผ่าน
- `public/assets/world/mine_events.webp` (512×128 lossless, rev ใน `MINE_REV.events`), `mineEventsUrl()` + preload แผนที่ 5, CSS `--ex` ต่อ `data-kind` แทนเซลล์ยืมและ filter ชั้น `vein_glow` ยังไม่ใช้
- เทสต์: `tests/mine-art.test.ts` 8 ผ่าน (เพิ่ม 2: ไฟล์/rev/CSS และเซลล์ไม่ซ้ำ), typecheck, lint, Chromium `mine-events` 6/6; ภาพ [390px](../validation/map5-mine/event-markers-2026-11-27/01-markers-390.webp) (อุโมงค์ถูกความมืดรัศมี 1 ช่องบัง เห็นชัดที่รถแร่และพ่อค้า)
- เจ้าของอนุมัติภาพ 2026-11-27: “อนุมัติ นำเข้าเกมได้” (merge เป็น #372)
- เปิดค้าง: คนงาน/สายแร่ในอุโมงค์มืดมองไม่เห็นจนกว่าจะติดกัน และถูกปุ่มลูกศรทับ (ระบบความมืดเดิม) · PR #371 ของ Codex ยังเปิดอยู่

## 2026-11-27 — brief ภาพเครื่องหมายเหตุการณ์แผนที่ 5 (Claude · `claude/map5-event-art-brief`)

- เจ้าของสั่ง “brief ภาพสำหรับเครื่องหมายเหตุการณ์ในแผนที่ 5” เอกสารอย่างเดียว ไม่แตะโค้ดและไม่สร้างภาพ
- เพิ่ม ART-MAP5-EVENTS-001 เป็นข้อ 34 ใน `docs/handoffs/CODEX-ART-QUEUE-TH.md` (ตารางข้อเท็จจริงที่ตรวจจากโค้ด + กล่อง prompt สำหรับ Codex): แอตลาส 4 เซลล์ 128 px footY 124 แสดงที่ 48 px, semi-chibi สำหรับคนงานกับพ่อค้า, พร็อพรถแร่/สายแร่ต้องต่างจาก `ore_cart`/ผลึกเดิม, ไม่ให้หน้าตาชน NPC ค่าย, จุดสำคัญอยู่ใต้ “!” ไม่ได้
- ตรวจ: `git diff --check` · ยังไม่ส่ง Codex และยังไม่มีภาพ
- รอเจ้าของ: เลือกแบบคนงานติดอยู่ R1/R2 และอนุมัติภาพหลัง Claude นำเข้า; ยืนยันว่าคนใหม่เป็น semi-chibi แม้คนงานเดิมในลานเป็นสัดส่วนจริง

## 2026-11-26 — test UX ที่พังเป็นพักๆ บน CI (Claude · `claude/youthful-heisenberg-4hppmi`)

- Pages run ของ #367 ล้มที่ `ux-audit-s2-s4` (ค่ายขึ้นช้ากว่า 5 วิบน CI) และ PR #368 รอบแรกล้มที่ `ux-hud-reveal` (อ่านแอนิเมชันหลังมันจบ 320 ms แล้ว) เจ้าของอนุมัติให้แก้
- แก้เฉพาะ test: รอค่าย 15 วิแบบ spec อื่น และ `ux-hud-reveal` บันทึกการเริ่ม `animate` ของ HUD แต่ละส่วน (ตรวจว่าเริ่มครั้งเดียวและไม่เล่นซ้ำ) แทนการอ่านแอนิเมชันที่ยังวิ่งอยู่ · ไม่แก้โค้ดเกม
- Chromium สอง spec ×3 รอบ ผ่าน 15/15

## 2026-11-26 — ต่อสู้อัตโนมัติ (Claude · `claude/youthful-heisenberg-4hppmi`)

- เจ้าของ (OD-62): AI ใช้สกิลได้แต่ไม่ฉลาดเท่าคน ใช้ในการต่อสู้สุ่มและบอสโลก (“ให้บอสโลก มี Auto ด้วย”) มีแบบเดียว ผู้เล่นปิดสกิลรายท่าและตั้ง HP ที่หยุดได้ ยกเลิกกฎเดิม “ไม่มีปุ่ม AUTO”
- `core/battle/auto.ts`: ให้คะแนนจากผลของเทิร์นฮีโร่เองผ่าน resolver ไม่อ่านท่าศัตรู ราว 30% ของเทิร์น (บอสโลก 50%) แค่โจมตีพื้นฐานแบบ deterministic · `BattleUI` ปุ่ม AUTO + ค่าตั้งที่ ⓘ → ตั้งค่า (เก็บในเครื่อง ไม่แก้เซฟ) · sim style `auto`
- Vitest ทั้งชุด 2359 ผ่าน, typecheck/lint/build, Chromium `auto-battle` 5/5 · sim 12 บริษัท: การต่อสู้สุ่มชนะ 100% และ HP ใกล้ advisor บอสที่ให้ออโต้เล่นเองแผนที่ 4 ชนะ 85% แผนที่ 5 ชนะ 42% · ดาเมจบอสโลก (lapse 50%) 76–105% ของตัวสอนเล่น [ผลตรวจ](../validation/auto-battle/README_TH.md)
- เปิดค้าง: ค่า lapse/คะแนนเป็นร่าง, ยังไม่ได้ทดสอบบนมือถือจริง

## 2026-11-26 — UX audit P2-2 ส่วนที่ 2 hit-stop (Claude · `claude/gallant-edison-a7kkl3`, ยังไม่ merge)

- เจ้าของสั่ง “ทำ P2-2 ส่วนที่ 2 hit-stop ต่อได้เลย”: `hitStopMs()` 45 ms เฉพาะโดนจริง + ล้ม/ขัดจังหวะ, ฉากหยุดหลังวาดเฟรมที่โดน, เวลาจบเทิร์นเลื่อนเท่ากัน
- vitest ทั้งชุด 2359 + Playwright ใหม่และชุดต่อสู้ 95 ผ่าน · [ผลตรวจและคลิป](../validation/hit-stop-2026-11-26/README_TH.md) · รอเจ้าของดูคลิปก่อน merge

## 2026-11-26 — UX audit P2-2 ส่วนที่ 1 ฉากสั่นแบบ trauma (Claude · `claude/gallant-edison-a7kkl3`, ยังไม่ merge)

- เจ้าของสั่ง “ทำ P2-2 ส่วนที่ 1 ต่อได้เลย”: `impact-shake.ts` trauma² + คลื่น sine แทนค่าสุ่ม, โดนซ้อนบวก trauma; ไม่มี hit-stop (ส่วนที่ 2 รอเจ้าของตัดสินเรื่องจังหวะ)
- vitest 4 + Playwright 3 ใหม่ผ่าน · [ผลตรวจและคลิป](../validation/impact-shake-2026-11-26/README_TH.md) · รอเจ้าของดูคลิปก่อน merge

## 2026-11-26 — UX audit P2-1 staged reveal เข้าค่าย (Claude · `claude/gallant-edison-a7kkl3`)

- เจ้าของสั่ง “ทำ P2-1 staged reveal ต่อได้เลย”: `hud-reveal.ts` HUD ค่ายตามฉากมา 100 ms (220 ms) เฉพาะตอนเข้าค่าย
- Playwright ใหม่ 2 + ชุด camp เดิมผ่าน · [ผลตรวจ](../validation/ux-hud-reveal-2026-11-26/README_TH.md)

## 2026-11-26 — UX audit P1-5 หน้าเลือกงานช่าง (Claude · `claude/gallant-edison-a7kkl3`)

- เจ้าของสั่ง “ทำ P1-5 หน้าเลือกงานช่างต่อได้เลย”: ป้ายสถานะจาก rule เดิม (`forge-task-status.ts`), ตีบวก/เพิ่มเลเวลเป็นการ์ดเต็มความกว้าง
- vitest 4 + Playwright ใหม่ 2 + ชุด forge เดิม 49 ผ่าน · [ผลตรวจ](../validation/ux-forge-launcher-2026-11-26/README_TH.md)

## 2026-11-26 — ภาพตัวเต็มทุกแท็บ + สีประจำคลาส (Claude · `claude/gallant-edison-a7kkl3`)

- เจ้าของ: “ภาพตัวละครใช้แบบตัวเต็มทุกแท็บ ใช้สีประจำคลาส” · `heroStage()`/`classTone()` ใน `portraits.ts`, `--class-tone` บน dialog ตัวละคร
- vitest `class-tone` + Playwright `ux-hero-stage` ใหม่ และชุดหน้าตัวละครเดิม 51 เคสผ่าน · [ผลตรวจ](../validation/ux-hero-stage-2026-11-26/README_TH.md)

## 2026-11-26 — UX audit S2–S4 transition (Claude · `claude/gallant-edison-a7kkl3`)

- เจ้าของสั่ง “เริ่ม S2–S4 ต่อได้เลย”: เปลี่ยนตัว/แท็บมีอนิเมชันเข้าตามทิศ (`character-panel.ts` `cue`), ปิด dialog/sheet ทิ้งสำเนา inert ที่จางหาย (`dialog-leave.ts`, `lobby-ui.ts`), token `--swap-ms`/`--tab-ms`/`--sheet-exit-ms`
- Playwright ใหม่ 3 เคส + ชุดหน้าตัวละคร/ค่ายผ่าน · [ผลตรวจและคลิป 390px](../validation/ux-audit-s2-s4-2026-11-26/README_TH.md)
- รอเจ้าของดูคลิปก่อน merge · ยังไม่ทำ: ภาพตัวละครแบบเดียวทุกแท็บ และสีประจำคลาส (คำถาม §9)

## 2026-11-26 — UX audit + Sprint 1 S1/S5 (Claude · `claude/gallant-edison-a7kkl3`)

- Audit เทียบคลิป reference (หลักการเท่านั้น): [docs/UX_GAMEFEEL_AUDIT.md](../UX_GAMEFEEL_AUDIT.md) · เจ้าของ “อนุมัติแผน เริ่ม S1 และ S5 ได้เลย”
- S1: แถวบนค่ายไม่ตัดคำ/ไม่ล้นที่ 320–480px, ปุ่มสุ่มกาชา sticky อยู่ในจอที่ 360×640 · S5: `gearEmpty()` empty state พร้อมปุ่มไปต่อ 3 จุด
- typecheck/lint/vitest/build ผ่าน, Playwright ใหม่ 8 + ชุดเกี่ยวข้อง 66 ผ่าน · [ผลตรวจ](../validation/ux-audit-s1-s5-2026-11-26/README_TH.md)
- ถัดไป: S2–S4 (transition เปลี่ยนตัว/แท็บ, exit sheet) ต้องส่งคลิป 390px ให้เจ้าของก่อน merge

## 2026-11-26 — เหตุการณ์ข้างทางแผนที่ 5 (Claude · `claude/mine-side-events` · PR #366)

- เจ้าของสั่ง “ทำเหตุการณ์ข้างทางของแผนที่ 5”: คนงานติดอยู่ (ขุด/ผ่าน), รถแร่ทิ้งไว้ (ยาสุ่มตาม seed), สายแร่สด (แร่แลกภัยคุกคาม), พ่อค้าแร่ (แร่→ทอง 3 ครั้ง/เที่ยว + ยา) ผ่าน `chooseEvent` เดิม
- สมุดบัญชีเหมืองครบปลดสูตรอาวุธผลึก (`forge.crystal`, ผ่าน `storyQuests`) · งานค่ายลุงบอร์ก `smith-mine-crystals` อีลิทเหมือง ×3 · เซฟ v70 (`sold`), แผนที่เหมือง v2
- แก้ด้วย: ตรวจคำสั่งฝั่งเซิร์ฟเวอร์ไม่รับ `gaze`/`away` ของทะเลสาบ ตอนนี้ใช้รายการเดียว `EVENT_CHOICE_IDS`
- Vitest ทั้งชุดผ่าน, typecheck/lint/build, Chromium `mine-events` 6/6 + spec เกี่ยวข้อง 26/26, CI quality+browser ผ่าน · จำลอง 48 seed เป้ายักษ์ผลึกคงเดิม [ผลตรวจ](../validation/map5-mine/README_TH.md)
- เปิดค้าง: ภาพเครื่องหมายเหตุการณ์ยืมของเดิม (รอ Codex) ตัวเลขเป็นร่างจนถึงรอบเศรษฐกิจ P04

## 2026-11-26 — นำเข้ายักษ์ผลึก R1 ชุดเต็ม 4b (Claude · `claude/mine-boss-4b-intake`)

- PR #359 (`77a6e4ba`) ไฟล์ตรง SHA-256 ครบ `scripts/build-mine-boss.py` แพ็กยักษ์ 26 เฟรม (cell 448 เท้า 7/8, อัตรา 1.67 = 1.32× โกเลมหิน) ผลึกย่อย 10 เฟรม และ VFX 16 ชั้น lossless · ภาพนิ่ง/พอร์เทรต foes4 ช่อง 5–6
- `src/game/visuals/mine-boss-fx.ts`: เกราะจาก state (ร้าวตามครั้งที่นับ), แตก/หมดเวลา/สะท้อน/ถล่ม/แยกผลึกจาก event จริง; ยักษ์เล่นท่า Split หลังท่าโดนตีเพราะ phase เกิดทันที · ขยายภาพถล่ม 2.3× เพราะขนาด storyboard มองไม่เห็นในเกม
- Vitest ทั้งชุดผ่าน (+`tests/mine-boss-fx.test.ts`), `npm run coverage:presentation` (56 identities), anatomy audit ผ่าน, คลิป 390px 30 คำสั่ง [README](../combat-presentation/mine-boss-slice/README_TH.md)
- PR #364 (docs) merged · เจ้าของอนุมัติ motion “อนุมัติ” (2026-11-26) แล้ว merge #365 · Shard Beam ยังเป็นเส้นวาดด้วยโค้ด

## 2026-11-26 — ภาพเหมืองเข้าเกมครบยกเว้นยักษ์ (Claude · `claude/friendly-heisenberg-xapns5`, PR #356 #361 #362 #363 รวมแล้ว)

- เหมือง (เซฟ v69, ยักษ์จูน 48 seed), ของบนแผนที่, ศัตรู semi-chibi 5 ตัว, พื้น/ราง/ฉากรบ อยู่ในสาขาเกมแล้ว กติกาถาวร: สไตล์ภาพ semi-chibi (`CLAUDE.md`)
- Codex ส่ง 4b ยักษ์ (`77a6e4ba`): ไฟล์ 111 ไฟล์ตรง SHA-256 และ decode ได้ ยังไม่ได้ตรวจภาพหรือนำเข้า → งานแชตถัดไป (ดู CURRENT_STATE)

## 2026-11-26 — นำเข้าพื้น ราง และฉากรบเหมือง (Claude · `claude/friendly-heisenberg-xapns5`)

- เจ้าของสั่ง “นำเข้าพื้นเหมืองเลย” หลังรอบ 4 ของ #357 ผ่าน (Claude วัด L* ซ้ำได้ค่าเดียวกับ Codex) พื้น `mine_tiles`, ราง `mine_rails` (`railAt`), ฉากรบ `battle_mine` + LQIP [ผลตรวจ](../validation/map5-mine/README_TH.md)
- Vitest และ `tests/mine-art.test.ts` ผ่าน, Chromium 390px แผนที่และศึก · เหลือยักษ์ 4b (#359)

## 2026-11-26 — นำเข้าศัตรูเหมือง semi-chibi 5 ตัว (Claude · `claude/friendly-heisenberg-xapns5`)

- เจ้าของสั่ง “นำเข้าศัตรูเหมือง 5 ตัวเลย” (หัวหน้าคุมเหมือง R2, ตัวกินผลึก R1) และบันทึกกติกาถาวร “สไตล์ภาพต้องเป็น semi chibi” ใน `CLAUDE.md`
- `scripts/build-mine-foes.py` → atlas lossless 5 ชุด + `units_foes4`/`portraits_foes4` อัตราแสดงผล 0.75–1.1 ตามภาพตัวอย่าง ไม่ใช่ 2 [slice](../combat-presentation/mine-foes-slice/README_TH.md)
- ทุกสนามเหมือง ≤56 MiB decoded (งบ 64) Vitest ผ่าน, coverage ใหม่ (54 identities), คลิป 390px 3 สนาม · พื้น #357 รอบ 4 และยักษ์ 4b (#359) ยังรอ Codex

## 2026-11-26 — ตรวจภาพเหมืองรอบแรกและนำเข้าของบนแผนที่ (Claude · `claude/friendly-heisenberg-xapns5`)

- PR #356 (เหมือง เซฟ v69) รวมแล้ว เจ้าของเลือกยักษ์ R1 และ “ทำตามที่คุณแนะนำ อนุมัติ 4a” Codex ส่ง #357–#360 ไฟล์ตรง SHA-256 ครบ
- #358 ของบนแผนที่ผ่านและรวมแล้ว นำเข้าเกม: `mine_decor.webp`, `.mine-prop` ตามสถานะ, ตะเกียง ประตู ทางลับ โน้ต ของประดับ [ผลตรวจ](../validation/map5-mine/README_TH.md)
- #357 (พื้นเห็นตาราง สไตล์แบน ผนังไม่ต่อกัน) และ #360 (ศัตรูสัดส่วนสมจริง ไม่เข้ากับ semi-chibi) ส่งกลับแก้, #359 ทำ 4b ต่อ ตาม[รอบที่ 2 ของ brief](CODEX-ART-MAP5-MINE-TH.md)
- Vitest 2308 ผ่าน, typecheck, lint, Chromium mine/lake 8/8

## 2026-11-26 — จูนยักษ์ผลึกด้วยการจำลอง 48 seed (Claude · `claude/friendly-heisenberg-xapns5`)

- รวมสาขาเกมเข้างานเหมืองของ Codex (ชนกันที่ `world-ui.ts` จุดเดียว) เจ้าของสั่ง “ทำตามที่คุณแนะนำ เริ่มข้อ 1” คือขยายการจำลองและจูนก่อนเปิด PR
- 48 seed ค่าเดิม: casual สายรีบผ่าน 96% ศึกยาว 10–12 รอบ ค่าใหม่ HP 580, Fist 225, Beam 205, ถล่ม 68, ผลึกย่อย 59/45 (`crystal-giant` v2): casual สายรีบ 78% สายสำรวจ 99% advisor ≥99% โจมตีปกติชนะ ≤22% ชุดทีม 9–10/10 ตัวเลขยังเป็นร่าง
- เพิ่ม `tests/mine-tune.test.ts` (ข้ามโดยค่าเริ่มต้น) และ `resume` ใน `simulateCampaign` เพื่อเล่นเฉพาะเหมืองซ้ำจากแคมเปญที่เก็บไว้ ผลตรงกับการรันเต็ม
- Vitest 2306 ผ่าน, typecheck, lint, presentation coverage ผ่าน ยังไม่เปิด PR และยังไม่มีคลิป 390px ให้เจ้าของดู [ผลตรวจ](../validation/map5-mine/README_TH.md)

## 2026-11-23 — Crystal Mine campaign, save and boss (Codex · `codex/map5-crystal-mine-design`)
- Owner authorized Codex to take over Claude's work. Activated Map 5 after the lake with save v69, the Crystal Giant, temporary presentation and mine interactions. v68 lake and an active v69 boss both resume in tests.
- Vitest 2,303 passed and 24 skipped. Lint, typecheck, build and presentation audits passed. Chromium mine and lake passed 8/8 at 390px. [Mine validation and reports](../validation/map5-mine/README_TH.md).
- Four seeds per OD-59 pair/style/route: 64/64 first mine clears. Some explorer basic-only groups and stress-test round counts still miss draft targets. Expand tuning and compare silhouettes at 390px before locking balance and art.

## 2026-11-23 — Crystal Mine world commands (Codex · `codex/map5-crystal-mine-design`)
- Connected light, both puzzles, worker delivery and the 2-of-3 seal to game commands. Brann and Kael now have recruitment triggers and a one-time settlement payout. All three routes reach a completed run with test encounters. [Design and tests](../design/MAP5_CRYSTAL_MINE_DRAFT_TH.md#กระดานต้นแบบ).
- Full Vitest started during edits and reported 2,288 passed with one failure in the opened-wall visibility regression. The final mine, lake and command suites passed all 109 tests after the wall fix. Lint, typecheck and build passed.
- The campaign entry awaits save validation and real encounters. The Claude handoff lists the new fields and checks before registration, balancing and UI integration.

## 2026-11-23 — Crystal Mine board prototype (Codex · `codex/map5-crystal-mine-design`)
- Built the 25×25 board, minecart and beam traces, wall-aware light and worker escort. The focused mine and lake suites passed 25 tests. Lint, typecheck and build passed. [Board and test scope](../design/MAP5_CRYSTAL_MINE_DRAFT_TH.md#กระดานต้นแบบ).
- Full Vitest: 2,279 passed and one existing VFX asset check failed because its intake files were outside the sparse checkout. Restored the tracked files and reran the affected VFX and mine suites (32 passed).
- The approved mine layout is ready for world command wiring. Follow the Claude handoff for v68 compatibility, recruit triggers, the Crystal Giant and the campaign simulation before activating Map 5.

## 2026-11-23 — Map 5 owner decisions (Codex · `codex/map5-crystal-mine-design`)
- Owner replied “ทำตามที่คุณแนะนำ” to the three design choices. Recorded the decision under OD-60 and reconciled the Chapter 1 map description. [Confirmed design](../design/MAP5_CRYSTAL_MINE_DRAFT_TH.md).
- Checked document consistency, relative links and Git whitespace. The next work is rules, content and simulation. Numeric targets await results.

## 2026-11-23 — Map 5 Crystal Mine design (Codex · `codex/map5-crystal-mine-design`)
- Drafted the three mine zones, lanterns, minecart and light puzzles, 2-of-3 seal, Brann/Kael story and Crystal Giant encounter for owner review. [Design, simulation targets and 390px review plan](../design/MAP5_CRYSTAL_MINE_DRAFT_TH.md).
- Branch base `827756f` includes #336 at `24a1f3c`. Reviewed the draft and checked Markdown whitespace with Git.
- Open owner decisions: overseer bypass, puzzle and recruit flow, and armour and shard behaviour. Simulation, art and implementation follow that review.
## 2026-11-25 — แท่นบนแผนที่ไม่กระโดดตอนเปลี่ยนภาพ (Claude · `claude/friendly-heisenberg-xapns5`)

- เจ้าของรายงานว่าหลังชนะบอส แท่นวาร์ปสีม่วงขยับออกแล้วเด้งกลับที่เดิม สาเหตุคือ keyframe `gate-open` ใช้ `transform: scale()` ซึ่งทับ `translate(-50%, -100%)` ของ `.sprite` ตลอด 640ms (เลื่อนขวา 1 ช่อง ลง 2 ช่อง แล้วกลับตอนจบ)
- แก้ให้ keyframe ใช้ property `scale` และให้ `.landmark.lv-gate-open` ใช้ `transform-origin: 0 0` แท่นจึงขยายจากจุดตั้งบนพื้น ใช้กับ landmark ทุกชนิด (ประตูและแท่นบอส) ไม่แก้กฎ เซฟ หรือเวลาเล่น
- เพิ่ม Playwright `a landmark that changes art grows in place` ใน `tests/browser/world.spec.ts` (ล้มกับโค้ดเดิม เลื่อน 74px; ผ่านหลังแก้) typecheck, lint, Vitest world 69 กรณีผ่าน

## 2026-11-25 — ตำแหน่งชาร์จ, Aura และมงกุฎของบอส (Claude · `claude/lucid-mendel-11prf7`)

- เจ้าของรายงานว่าสกิลของเจ้าป่าหนามไม่ตรงตำแหน่งที่ยืน ตอนนี้ hold ของบอสชุดเก่าอยู่บนตัวแล้ว และ hold ของอสรพิษเงาใช้เฟรมที่ถูกต้อง (เดิมขึ้นกรงเล็บของมอร์เวน)
- Aura ของบอส (`src/game/visuals/boss-aura.ts`) มี Aura เบาตลอดศึก และแรงขึ้นตอนชาร์จ ทำจากเงาตัวบอสในสีของบอสเอง วูบวาบลอยขึ้นตามรูปทรง วงเวทบนพื้นและละอองแสงไม่ลงต่ำกว่าเท้า คราก์มอร์และวัลดรัคใช้สีม่วง ความแรงเท่าบอสตัวอื่น
- ลองใช้ Glow filter แล้ว แต่ทำให้ software Chromium ช้าราว 9 เท่า จนชุด battle-hud ล้ม 3 กรณี จึงเปลี่ยนเป็นเงาตัวบอสแบบ fill tint ที่ซ้อนอยู่หลังตัว
- มงกุฎบอสวางเหนือภาพตัวจริง (`BattleScene.crownSpot`) จากเดิมที่จมในปีกวัลดรัคและหัวมอร์เวน และเยื้องจากหัวภูตธารา
- เจ้าของพูดว่า “นำเข้าเกมได้เลย” (2026-11-25) งานนี้แก้เฉพาะภาพ ไม่แก้กฎ เซฟ หรือเวลาเล่น ผลตรวจอยู่ที่ [ผลตรวจ](../validation/boss-hold-placement-2026-11-25/README_TH.md)

## 2026-11-24 — Combat audio and hit effects across the player roster

- Draft PR #353 on `3b746ac`. Covers 15 recruitable heroes plus Odran and Isolde in legacy saves. The owner requested full roster coverage.
- Typecheck, lint, Pages build, 54 focused Vitest cases, and 42 dev / 5 production Playwright cases passed.
- Basic attacks route through existing effect hooks by weapon and role. Skill audio follows the existing pose, release timing and result events. Save and turn resolution are unchanged.
- See the [validation report](../validation/roster-contact-2026-11-24/README_TH.md) for test scope and capture limits.

## 2026-11-24 — จังหวะภาพและเสียงปะทะ (Codex · `codex/fateweave-steel-contact`)

- เจ้าของอนุมัติให้ทำแพตช์และคลิปเทียบ. สาขาฐาน `b39ed8d`. รอตรวจคลิปใน Draft PR.
- วางเสียงเหวี่ยง Duelist/Execute ใกล้ contact เดิม. แยกเสียงรับโล่เต็มและลดภาพ Execute ซ้อน/ประกายโดนเมื่อหลบ. เวลาเทิร์นและเซฟใช้ระบบเดิม.
- Typecheck, lint, Pages build, Playwright 24 กรณีผ่าน. Unit 2270 ผ่าน, 24 ข้าม, boss-balance ผ่านเมื่อรันแยก.
- [ผลตรวจและข้อจำกัด](../validation/steel-contact-2026-11-24/README_TH.md). การฟังบนมือถือจริงยังไม่ยืนยัน.

## 2026-11-24 — Game Feel: ท่าคืนตัวหลัง contact

- สาขา `codex/fateweave-recovery-continuity` · PR #350. เจ้าของอนุมัติให้นำเข้าเกมและรวมฐานล่าสุดที่มี #351 ก่อนตรวจ CI.
- ต่อท่าคืนตัวจาก transform ที่วาดล่าสุด ลดจังหวะกระโดดหลัง impact เมื่อ cue มาก่อนเฟรมถัดไป. เวลา cue และข้อมูล authoritative ใช้เส้นทางเดิม.
- Typecheck, lint, production Pages build, unit เจาะจง 28 กรณี และ Chromium 21 กรณีผ่าน. ชุด unit รวมผ่าน 2269 กรณี ข้าม 24 กรณี และรันทวน 2 กรณีที่ติด fixture/timeout แล้วผ่าน.
- ดู [ผลวัดและข้อจำกัด](../validation/recovery-continuity-2026-11-24/README_TH.md). ไม่มีการอนุมัติภาพใหม่. งานถัดไปตรวจความหน่วงบนมือถือจริง.

## 2026-11-24 — Atlas บอสใช้ URL เดียว (Codex · `codex/fateweave-shared-units-atlas`)

- เจ้าของอนุมัติให้ทำ PR แยก. ภาพบนแท่นบอสใช้ `unitsUrl('units')` เหมือน Phaser. รวม #351 ที่ `411b9e1`.
- Chromium 390px: cold download 2 → 1 ประหยัด 1.89 MiB ทุกรอบจากสามคู่. Warm download 0 ทั้งก่อนและหลัง.
- Typecheck, lint, production Pages build, Playwright เดิน/เข้าศึก และการเก็บภาพ/คลิป 390px กับ desktop ผ่าน. Unit 2269 ผ่าน 24 ข้าม และเทสต์ boss-balance ที่ชน timeout ผ่านเมื่อรันแยก.
- [ผลวัดและข้อจำกัด](../validation/shared-units-atlas-2026-11-24/README_TH.md)

## 2026-11-23 — Full-slot equipment art (Codex · `codex/full-slot-equipment-art`)
- Owner approved integrating mockup v5. Equipped art uses the full slot with an opaque rarity-tinted background. Empty slots show 32 px icons and faint slot labels. Equipped slots retain their accessible names.
- Lint, typecheck and Pages build passed locally. The shared Chromium regression checks fill, label visibility and stable slot size at 320 px, 390 px and desktop. Physical iOS Safari remains unverified.

## 2026-11-23 — Compact character equipment slots (Codex · `codex/compact-equipment-slots`)
- Owner requested smaller slots that keep their size after equipping. The character equipment tab now gives empty icons and worn-item art the same grid row, with a 28–30px art area.
- Regression coverage measures all six slots before and after auto-equipping in camp and on the map at 320px, 390px and desktop widths. Lint, typecheck and build passed. iOS Safari remains unverified.

## 2026-11-23 — Finish the Moon Lake stack (Codex · #336 → game branch)
- Owner: “อนุมัติ” for the four ordinary foes' motion and the Map 4 screens. #343 merged as `39c081f`; #337 merged as `966ea02`; semi-chibi boss #345 was `9afb8e1`. [390px review](../validation/map4-lake/README_TH.md).
- Reconciled the latest first-fate/cabinet UI with the lake tile and quest imports. Preserved the owner-approved C12 starter-pair baseline. The two branches used OD-60 for separate decisions; the C12 decision is catalogued as OD-61, and Map 4 keeps OD-60.
- Chromium: 12 lake-map/boss cases, 8 ordinary-foe captures, and 8 checks on the combined branch (lake, prologue and cabinet). Typecheck, lint and presentation coverage 6/6 passed. The quest-board and sweep browser tests now explicitly select map 3 after the selector gained map 4; the production replay passed 6/6.

## 2026-11-23 — Integrate the Water Spirit semi-chibi motion (Codex · #345 → claude/map4-lake-foes)
- Owner: “อนุมัติ” on the eight 390px motion previews from art PR #346. Integrated the 30-frame body, matching fallback still and HUD portrait into phase 4 with the existing six move timings and VFX.
- 768px cells losslessly packed in 1972×1974. Worst five-hero field including the lake-only VFX uses 62.8/64 MiB. Presentation coverage 6/6 and Chromium lake-boss captures 8/8 passed. Animated and fallback bounds agree within 1px at 390px. [Updated clips and budget](../combat-presentation/lake-boss-slice/README_TH.md).
- Phase 2 ordinary-foe motion and map 4 screen approvals are tracked separately.

## 2026-11-23 — Water Spirit semi-chibi motion (Codex · art PR #346)
- Owner approved the 390px standing preview and requested new animation (“อนุมัติ ต้องทำ animation ใหม่”). [Art and eight runtime preview clips](https://github.com/wnau34-nptrn/asterveil-fateweave/blob/c2ed3c8c93e2890609379df14d2f81d7efae0633/incoming/ART-UNIT-ANIMATION-LAKE-BOSS-CHIBI-002/NOTES.md) cover the six existing moves, idle, hit and down.
- 29/29 moving frames pass the head-scale audit. The 768px body packs losslessly at 1979×1974 with the documented shelf layout. Chromium preview passed eight 390×844 resolver/VFX scenarios.
- Pending owner review of the new motion. Claude intake target is #345; use the documented shelf layout and derive fallback/portrait from the approved seed. The existing runtime motion is still in #345.

## 2026-11-23 — Water Spirit semi-chibi concept (Codex · #345)
- Owner feedback “ดีกว่าเดิมเยอะเลย” followed by “บันทึกใน github ด้วย”. Saved the [standing concept and original PNG](../../incoming/ART-MAP4-WATER-SPIRIT-CHIBI-001/README_TH.md) as the preferred art reference.
- Verified the PNG decodes as RGBA with transparency, matches the delivered source byte for byte, and documented its SHA-256. Scope is concept archival. Runtime motion approval remains pending for #345.


_Older entries: [archive/2026-11-26](archive/2026-11-26/CODEX-TO-CLAUDE.md)._
