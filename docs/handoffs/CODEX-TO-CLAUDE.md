## 2026-11-28 — PET-1 ไข่/ฟัก/เลือกสัตว์เลี้ยง, เซฟ v71 (Claude · `claude/pet-1-eggs`)

- OD-63 “ตามคำแนะนำ”: เนื้อหา 6 ตัว (`gameRules.pets`, id จาก ART-PET-002, ตัวเลขร่าง §5.2b) · `core/world/pets.ts` hatch/choose/runPet/settlePetEgg · `unlocks.pets: 4` · ไข่เลือกได้จากผ่านแมพ 4 (และ 5) ครั้งแรกใน `settle` · คำสั่ง `hatchEgg`/`choosePet` + event `petEgg` · ledger `pet:egg:<map>`/`pet:hatch:<kind>` · เซฟ v71 (`profile.pets`, `run.pet` ล็อกตลอดการเดินทาง; เซฟ ≤v70 ได้ไข่ตามประวัติผ่านแมพ 4/5)
- ยังไม่มีผลในเกม: ไม่มี UI/พรแผนที่/ท่าศึก/อาหาร (PET-2…6) · รายละเอียด [SYSTEMS_REFERENCE §Pets](../design/SYSTEMS_REFERENCE.md)
- เทสต์: `tests/pets.test.ts` 16 (กติกา, settle, migration, รูปเซฟเสีย, คำสั่ง, เซิร์ฟเวอร์ receipt + replay `verify`) · vitest ทั้งชุด 2410 ผ่าน, typecheck, lint, build · เทสต์อื่นแก้แค่เลขเวอร์ชัน 70→71 และเซฟเก่าที่ผ่านแมพ 4/5 ได้ไข่
- log นี้เกิน 40 KB: ย้ายรายการก่อน 2026-11-27 ไป [archive/2026-11-28](archive/2026-11-28/CODEX-TO-CLAUDE.md)

## 2026-11-28 — วิเคราะห์ระบบสัตว์เลี้ยง (เอกสารอย่างเดียว) (Claude · `claude/pet-system-analysis`)

- เจ้าของ “เอาเข้าระบบสัตว์เลี้ยง แต่ยังไม่ต้องแก้เกม ให้ research และวิเคราะห์ก่อน”: [PET_SYSTEM_ANALYSIS_TH](../design/PET_SYSTEM_ANALYSIS_TH.md) — สิ่งที่อนุมัติแล้ว/เปิด, เทียบเกมอื่น, ทาง A/B/C (แนะนำ A ทำเป็นขั้น), 6 ตัวพร้อมพรแผนที่+ท่าจบรอบ, ไข่เลือกได้จากบอสแมพ 4, อัปด้วยแร่+ผง, เซฟ v71, ชุด PET-1…6, คำถาม Q1–Q9
- ไม่แตะโค้ด/กติกา/เซฟ · ตรวจ `git diff --check` · เจ้าของตอบ “ตามคำแนะนำ” + อาหารซื้อด้วยทอง → OD-63, merge PR #391; ถัดไป PET-1 · ART-PET-002 (PR #55) ยังไม่มีคำอนุมัติภาพจริง

## 2026-11-28 — ปุ่มจัดทีมอัตโนมัติ (Claude · `claude/exciting-keller-y9xau2`)

- เจ้าของ “เพิ่มปุ่มจัดทีมอัตโนมัติ ที่หน้าจัดทีม กดปุ่มเดียวจัดทีมให้ทั้งตัวจริงและสำรอง”: คำสั่ง `autoTeam` (`core/world/auto-team.ts`) ตัวจริง 5 (คนรักษา+แทงก์ก่อน, แนวละ ≤3) + สำรองเต็ม จากค่าความแข็งปัจจุบัน ไม่ดึงคลังสมาชิก · [รายละเอียด](../validation/auto-team-2026-11-28/README_TH.md)
- เทสต์: vitest 2392, typecheck, lint, build, Chromium `auto-team` 390/320 + team/roster/lessons ผ่าน

## 2026-11-28 — บอสโลกเปิดหลังแผนที่ 3 + อันดับดาเมจ (Claude · `claude/exciting-keller-y9xau2`)

- เจ้าของ “บอสโลกเปิดหลัง Map 3 และเพิ่ม Leader board”: feature `worldBoss` (`unlocks.worldBoss: 3`, กติกา+เซิร์ฟเวอร์ตรวจ) · แท็บ “อันดับ” (ดาเมจรวมรายสัปดาห์, รายบอส, สัปดาห์ก่อน, top 20 + อันดับของคุณ, ชื่อ `ค่าย-XXXXX` แบบแชท) · แต่ละแถวมีทีม (เลเวลค่าย + ฮีโร่/ดาว ของครั้งที่ดาเมจสูงสุด, คอลัมน์ `team` ใหม่ใน `hits`/`wb_hits`) · `GET /v1/worldboss/board` · [รายละเอียด](../validation/world-boss-board-2026-11-28/README_TH.md)
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
