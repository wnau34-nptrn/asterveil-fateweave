## 2026-11-26 — นำเข้ายักษ์ผลึก R1 ชุดเต็ม 4b (Claude · `claude/mine-boss-4b-intake`)

- PR #359 (`77a6e4ba`) ไฟล์ตรง SHA-256 ครบ `scripts/build-mine-boss.py` แพ็กยักษ์ 26 เฟรม (cell 448 เท้า 7/8, อัตรา 1.67 = 1.32× โกเลมหิน) ผลึกย่อย 10 เฟรม และ VFX 16 ชั้น lossless · ภาพนิ่ง/พอร์เทรต foes4 ช่อง 5–6
- `src/game/visuals/mine-boss-fx.ts`: เกราะจาก state (ร้าวตามครั้งที่นับ), แตก/หมดเวลา/สะท้อน/ถล่ม/แยกผลึกจาก event จริง; ยักษ์เล่นท่า Split หลังท่าโดนตีเพราะ phase เกิดทันที · ขยายภาพถล่ม 2.3× เพราะขนาด storyboard มองไม่เห็นในเกม
- Vitest ทั้งชุดผ่าน (+`tests/mine-boss-fx.test.ts`), `npm run coverage:presentation` (56 identities), anatomy audit ผ่าน, คลิป 390px 30 คำสั่ง [README](../combat-presentation/mine-boss-slice/README_TH.md)
- PR #364 (docs) merged · รอเจ้าของอนุมัติ motion ก่อน merge PR นี้ · Shard Beam ยังเป็นเส้นวาดด้วยโค้ด

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
