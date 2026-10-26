# ส่งต่องานให้แชตใหม่ (Claude) — อัปเดต 2026-10-22 หลัง A10 สมดุลรอบเล็ก (เซฟ v37)

ล่าสุด: เจ้าของปฏิเสธ Rally R2 เพราะทับชุด มี R3 พลังบนพื้นแยกซ้าย–ขวา `docs/combat-presentation/rally-r3/README_TH.md` (90×12, feet dy27) รอเลือก artwork ยังไม่ promote runtime; PR#77 ใบเดิมไม่เริ่มตระกูล3

## 2026-10-27 — Rally เดิมไม่ผ่าน รอเลือก artwork R2 ใหม่

เจ้าของไม่ชอบ Rally ในชุดคลิปและขอแก้ artwork แล้ว มีข้อเสนอริ้วพลังน้ำเงินแนวนอนช่วงขา3จังหวะที่ `docs/combat-presentation/rally-r2/README_TH.md` / `index.html` ต้นฉบับ/Promptอยู่ `incoming/ART-VFX-DEFENSE-001/proposals/rally-r2/` ยังไม่ได้แทน source/atlas/runtime/คลิปเดิม รอเลือกแบบก่อน promote/repack/อัด Rally ใหม่ใน PR#77 ใบเดิม ไม่ถือว่าท่าอื่นผ่านและยังไม่เริ่มตระกูล3


## 2026-10-27 — C5.2 runtime ครบแล้ว รอตรวจ 18 คลิป

PR [#77](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/77) · `codex/vfx-family-2-defense` ต่อภาพครบ11ท่าเป็น atlas/module เดียวแล้ว เจ้าของเลือก aura R3 ช่วงขาและสั่งทำ runtime เมื่อ26ต.ค. ดูคลิปจริง18ไฟล์และหน้าเลือกใน `docs/combat-presentation/defense-slice/README_TH.md` / `index.html` ครอบคลุมรับแทน ดูดซับ กันล้ม สวน หลบ ยกเลิก fast/reduced/OS reduced motion ทดสอบ858unit + defense36 + legacy16 ผ่าน ไม่มีการแก้กฎ/เซฟ/สมดุล/เวลา playback ยังไม่มี owner clip approval, merge หรือ deploy หยุดรอเจ้าของตรวจใน PR ใบนี้ก่อนตระกูล3; ตรวจสถานะ CIตามลิงก์ในsliceก่อน merge


## 2026-10-26 — C5.2 artwork V1 รอเลือกก่อนต่อ runtime

Draft PR [#77](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/77) · สาขา `codex/vfx-family-2-defense` มี artwork โปร่งใส 11 ท่า × 3 จังหวะแล้ว; ล่าสุดปรับ Stone Armour/Aegis เป็น low aura R3 เฉพาะเท้า/หน้าแข้งตาม feedback ไม่ให้สูงถึงหัว พร้อมปุ่มเทียบ R2/R3 ดู `docs/combat-presentation/defense-storyboards/README_TH.md` และ `index.html` (หน้าเลือกท่า 390px เทียบสนามเปล่า/ปรับน้ำหนักได้) เก็บต้นฉบับและ prompts ใน `incoming/ART-VFX-DEFENSE-001/` ยังไม่มี owner artwork approval, runtime atlas/module หรือคลิปจริง งานถัดไปคือรับ feedback/เลือกแบบ แล้วทำ runtime ใน PR ตระกูล 2 ใบเดิมตาม `C5-FAMILY-2-DEFENSE-HANDOFF-TH.md` ห้ามเริ่มตระกูล 3 จนเจ้าของตรวจคลิปตระกูล 2 ผ่าน ไม่รวม/เผยแพร่ draft งานภาพนี้ก่อนขั้น review ที่ขอไว้


ส่งต่อ VFX โดยเฉพาะ 2026-10-26: เจ้าของขอ handoff ไปแชตใหม่สำหรับขั้นถัดไป ดู [C5.2 โล่/ป้องกัน — พร้อมข้อความเปิดแชต](C5-FAMILY-2-DEFENSE-HANDOFF-TH.md) เริ่ม artwork 11 ท่าก่อน runtime; C5.1 merge/เผยแพร่แล้ว ตระกูล 2 ยังไม่เริ่ม คิว P01 และงานอื่นด้านล่างเป็นคนละขอบเขต

อัปเดต R4 2026-10-26: เจ้าของเลือกแบบภาพทั้ง 10 ท่า รวม Pierce หอกหนา และสั่งทำ VFX จริงแล้ว โมดูล blade-fx.ts ใช้ atlas เดียว 38 frames จากภาพเตรียม/ปะทะ/สลายที่เลือก เก็บต้นฉบับและ hash ไว้ครบ รวมฐาน roster batch 1 e79e8a4 แล้ว ดู CODEX-TO-CLAUDE.md บนสุดและคลิปใน docs/combat-presentation/blade-slice/ หลังส่งชุดตรวจ **เจ้าของอนุมัติและ merge R4 แล้ว 2026-10-26 ผ่าน PR #59 (`d14a3e1`) เผยแพร่สำเร็จผ่าน Pages run 40348106389 แล้ว (build +4 browser shards +deploy) HTTP200 และ hash ของ blade_fx.webp ตรง R4 ดู docs/validation/blade-vfx-release/README_TH.md; ไม่เริ่ม C5.2 อัตโนมัติในงาน merge นี้**


อัปเดต Pierce R2 2026-10-25: เจ้าของให้หัวหอก/แกนแทงหนาขึ้นเพราะ V1 ดูเหมือนธนู แก้ภาพครบ 3 จังหวะและหน้าพรีวิว #pierce แล้ว ยังเป็น concept ไม่ใช่ runtime; ดูบันทึกบนสุด CODEX-TO-CLAUDE.md

อัปเดต 2026-10-25: เจ้าของอนุมัติทำ artwork เฉพาะฟัน/แทงทั้ง 10 ท่าก่อนแก้ runtime ต่อ สร้าง storyboard V1 ครบ 30 จังหวะด้วย ImageGen (เจ้าของอนุญาตแทน Shado ที่เชื่อมต่อไม่ได้) ดู `docs/combat-presentation/blade-storyboards/README_TH.md` และหน้าพรีวิวเลือกท่า/ปรับน้ำหนักในโฟลเดอร์เดียวกัน ส่งใน PR #59 เดิม **รอเจ้าของตรวจแบบภาพ ยังไม่ต่อภาพชุดใหม่นี้เข้าเกม ไม่ merge/publish และไม่เริ่ม C5.2**

อัปเดต Codex 2026-10-24: C5.1 R3 บน `codex/vfx-family-1-blade`, PR #59 ปรับฟัน/แทงทั้ง 10 สกิลหลังเจ้าของเห็นว่า R2 หนาและคล้ายกัน ใช้ atlas เดิม ลดความทึบ/ความหนา และแยกสัดส่วนกับการเคลื่อนแต่ละท่า รวมฐาน C11 ล่าสุด 1a50c01 แล้ว รอเจ้าของตรวจ [คลิปใหม่ 390px](../combat-presentation/blade-slice/README_TH.md) ยังไม่ merge/publish และห้ามเริ่ม C5.2 จนเจ้าของอนุมัติคลิป อ่านบันทึกบนสุด `CODEX-TO-CLAUDE.md` และผลตรวจใน slice notes ก่อนทำต่อ
## แก้โหลด pilot — 2026-10-26

เจ้าของผ่านท่าโจมตีแล้ว แต่แจ้งว่าโหลดช้า จึงเอา pilot ออกจาก preload และโหลดเบื้องหลังเฉพาะยูนิตในสนามพร้อม fallback ใช้ภาพเดิมระหว่างรอ แพ็ก lossless รักษาพิกเซล/ขนาดตัว/จุดยืนเดิม ลด decoded RGBA 48 → 9.8 MiB (79.6%) และขนาดดาวน์โหลดรวม metadata 10.4% ไม่มี pilot request ที่ title ไม่แก้กฎ/เซฟ/จังหวะที่ผ่านแล้ว PR [#76](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/76) รวมเป็น `b4433c981544e3a63aa32f8a95d7bbca078b1315` และเผยแพร่สำเร็จผ่าน [Pages run 40325728873](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40325728873) (build + browser ครบ 4 shards + deploy) Unit 858/75 files และ browser CI 249 ผ่าน / capture-only skips 36; รายละเอียดใน CODEX-TO-CLAUDE.md และ `docs/validation/unit-animation-loading/` คิว P01-A/B ด้านล่างยังคงเดิม ไม่เริ่มงานอื่นอัตโนมัติ

## แอนิเมชันแก้ไขล่าสุด — 2026-10-26

เจ้าของแจ้งว่าเปลี่ยนท่าโจมตียังไม่ต่อเนื่อง หลังอนุมัติภาพ pilot แล้ว แก้ลำดับดาบ Lyra, เชื่อมเฟรมช่วงสั้น, ease การคืนตัว และรับ reaction ต่อจากตำแหน่งที่ถูกโจมตี โดยใช้ atlas ที่อนุมัติเดิม PR [#75](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/75) รวมแล้วเป็น `ef9b5df13dcd69dd149f27b75ea56ec4f0f06c45` และเผยแพร่สำเร็จผ่าน [Pages run 40270097579](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40270097579). หลักฐานอยู่ `docs/validation/unit-animation-smoothing/` (คลิป 390px และ before/after). Unit 854 / browser CI 246 ผ่าน, capture-only skips 36. รายละเอียดใน CODEX-TO-CLAUDE.md งานนี้ไม่ขยาย approval ไป C5 หรือยูนิตอื่น และไม่เริ่มงานใหม่อัตโนมัติ คิวงานหลักด้านล่างยังเป็นคนละขอบเขตกับการแก้แอนิเมชันนี้


## P00 publication complete — PR #72

Merged into game branch as `aab276d9f7eb46f782039414a83b50c19beef8af`, head `e638f3b`. PR quality CI run 672 (`40245547986`) passed. Local baseline: full sim 28/28 and focused 55/55; final artifacts: 19 documentation/report files, 29 tracked links, hashes and whitespace validated. Issue #69 marks P00 complete and remains open. Next is P01-A/B in `docs/design/p00/SHARED_PROGRESSION_TEAM_SPEC_TH.md`; no runtime rules were changed by P00. No screenshots or human playtest were claimed. This note records delivery only.

## P00 completed — shared progression/team specification and baseline

- Owner authorized proceeding after the consolidated plan. Branch `docs/p00-shared-level-team-spec` targets game branch. Added `docs/design/p00/SHARED_PROGRESSION_TEAM_SPEC_TH.md` and `MIGRATION_ACCEPTANCE_TH.md`: canonical camp XP, atomic profile/run transitions, legacy withdrawal boundary, ownership and six-position/five-live-actor vocabulary. Runtime remains unchanged; PR #59 still awaits visual review.
- Baseline on `e62292a`: full sim 28/28 across seven files plus focused roster/save/formation/talent checks 55/55. Artifacts, hashes, policies and twenty current campaign cells are in `docs/validation/p00/`. No new browser screenshots, human playtest, new-system validation or real-device claim.
- P00-01/02/03 marked complete in development plan. Next P01-A/B: implement shared Lv/XP and migration with field4/reserve4 and current star-point formula; five-member prototype waits P02 and star-point redesign waits P04. See the copy-ready next task in the plan.
- Documentation-only change; link/whitespace review before publication. Migration matrix is specified, not implemented or tested against new rules. Publication PR #72; merge evidence is tracked through issue #69.

## 2026-10-25 — Plan publication verified

PR #70 merged as `aafec236507458f45303a6af3a26438dfb276534`; quality CI run 665 passed. `docs/DEVELOPMENT_PLAN_TH.md` and issue #69 are the delivery entrypoints. Start P00 next. Design/research documents are now published; older local-only status notes below are historical. No gameplay changes in this delivery.

## 2026-10-25 — Start here: consolidated plan published to GitHub

Read `docs/DEVELOPMENT_PLAN_TH.md` and tracking issue #69 before older prompts below. The owner requested an actionable plan covering all discussion: P00–P11, task dependencies/exit gates, all D01–D37. Next work is P00 shared-level/team-five/migration specifications and baseline; do not auto-run old Batch2 with a reserved save version. The document distinguishes existing runtime from new directions and unvalidated numbers. This publication contains documentation only. Documentation PR #70 targets the game branch. Publication status is recorded in CODEX-TO-CLAUDE and issue #69.

## 2026-10-25 — Latest direction: shared levels and boss mechanics

Read `docs/design/SHARED_LEVEL_TEAM_BOSSES_TH.md` first. Owner wants equal levels to enable switching. Recommended scope is every owned hero via shared camp Lv/EXP; this supersedes individual catch-up training in the earlier design baseline. Stars/builds remain individual, with baseline boss counters accessible without a particular gacha hero. Team five is still a prototype direction, runtime remains four. No game code changed; next design work must recalculate EXP/economy and validate team/encounter rules together.

## 2026-10-25 — Use the recommended baseline for the next design calculation

Owner requested a concrete recommendation, now in `docs/design/PROGRESSION_RECOMMENDED_BASELINE_TH.md`. It proposes Lv15 promotion, a small existing-skill extension, gameplay-based talent points, bounded advanced stars and account-level progression targets. Treat its numeric values as prototype inputs, not simulated results or implemented rules. Next design work should calculate the economy and validate builds rather than ask the owner to choose every number. Local documentation branch only; current runtime is unchanged.

## 2026-10-25 — Active discussion: stars, promotion and skill trees

Next-round proposal is in `docs/design/PROGRESSION_PROMOTION_DISCUSSION_TH.md`. Base ★1–5 → advanced ★1–5, existing-skill extensions and preserved personal identity are proposed, not implemented. Review conflicts with star-derived talent points and unique-star plans before any code change. Costs, unlock levels, point/migration formulas and gacha rates remain open. Current task remains design discussion on local `docs/game-detail-review`; no publication or additional C12 batch.

## 2026-10-25 — Research completed; discuss recommendations next

Owner requested comparative game research and recommendations after the list-only consolidation. Read `docs/GAME_RESEARCH_RECOMMENDATIONS_TH.md` alongside Game Detail and D01–D37. Advisory directions are now provided for all37 topics; no numerical gacha/promotion rules approved or implemented. Keep runtime at existing C12 Batch1 scope until an implementation task is requested. Local branch docs/game-detail-review; no publication.

## 2026-10-25 — Active task: consolidate design, then discuss gaps

Read `docs/GAME_DETAIL_TH.md` and `docs/GAME_DESIGN_DISCUSSION_TH.md` first. Owner explicitly requested listing missing/unclear/improvable areas before designing them. The C12 Batch2 implementation prompt below remains the earlier development handoff; do not auto-start it during this design review. Current runtime still e79e8a4/v43 with14 characters. New gacha/promotion/monthly-release numbers are proposals, not approved final rules. Documentation branch: `docs/game-detail-review`; no PR/publication yet.

## 2026-10-25 — C12 Batch 1 merged; next Batch 2

PR #68 merged `24dfefbb5777a2233ab376725fb57dbd1bac719f` into `feature/fateweave-initial-prototype`. Current game: 12 classes / 14 characters, save v43; quality CI 838 unit tests, full browser CI 244 tests, final full sim 28 checks, 42 character/map cells ×12 seeds, paired campaign gate 20/20 pass. Report: `docs/validation/roster-30/batch-1/README.md`. Original three recruit offers are preserved, one extra featured slot advertises the new cohort. Do not remove the v43 frozen-board migration or explicit cooldown replay metadata. Older Batch 1 prompts below are historical.

Copy-ready next task:

```text
ทำ C12 Batch 2 ใน asterveil-fateweave จากสาขาเกมล่าสุด feature/fateweave-initial-prototype บน codex/roster-30-3 อ่าน AGENTS.md, CLAUDE.md, ROSTER_30_TH.md, SKILL_AUDIT_TH.md และรายงาน Batch 1 ก่อน เพิ่มนักมวย อรุณ/ภาคิน (Martial, arun/phakin) และนักสาป รัตติ/พิม (Hexer, ratti/pim) ตามต้นไม้/กิ่ง p/เจ้าของกลไกในแผน ไม่มีธาตุ/เพิ่มเทิร์น/เพิ่ม SPD ใช้ pure resolver+preview/replay ปราณ 0–3 คำสาปแยก source อายุและภาษีตอนลงมือ สร้างภาพ production จาก concept A ตามข้อยกเว้น C12 และตัวที่สองภาพใหม่ เซฟ v44 migration ต้องเก็บเซฟ v43/boardPool/คำสั่งเลือก cooldown เดิม เพิ่มแค็ตตาล็อกเป็น 18 ตัว 14 อาชีพ โดยไม่เปลี่ยนสามข้อเสนอเดิมและทีม 4+4 เก็บ baseline จากเกมหลัง Batch 1; เทสต์/unit/browser390/simรายตัวทุก18×แมพ1–3/แคมเปญเปรียบเทียบ20cellsด้วยpolicyเดียวกัน/ablation ต้องผ่านก่อน merge อัปเดต handoff+รายงาน+รูป2ภาพและ publish ตาม standing authorization ห้ามแตะ C5 VFX family ที่ยังรอตรวจ
```

No create_session tool is callable in this environment; no new cloud session was created automatically.

## 2026-10-24 — C12 Phase 1 designed; next Batch 1

เอกสารออกแบบ: `docs/design/ROSTER_30_TH.md` บน `codex/roster-30-1` ฐานเกม `1a50c012` มี 30 ตัว 15 อาชีพ กิ่งส่วนตัวและห้าชุดลงโค้ด ยังไม่เปลี่ยนเกม/เซฟ/สมดุล ตัวเล่นจริงยัง 10 คน v42 PR #67 merge แล้ว 2026-10-25 (`0b0f6496712e73fd0eb768aca6048cdfc15a85b1`), quality CI run 653 ผ่าน ก่อนเริ่มชุดถัดไปให้ดึงฐานเกมล่าสุด

ข้อความเริ่มงานถัดไป:

```text
ทำ C12 Batch 1 ใน asterveil-fateweave จาก feature/fateweave-initial-prototype หลัง Phase 1 merge บน codex/roster-30-2 อ่าน AGENTS.md, CLAUDE.md, docs/design/ROSTER_30_TH.md, C12 ใน docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md และ CODEX-TO-CLAUDE.md ก่อน เพิ่มนักบุญรบเมตตา/ธีรัน นักเต้นรำลลิน/วิลา กิ่ง p แบบใช้งบแต้มเดิม กฎ pure resolver/save migration/content/UI/ภาพ production/test/sim ตามสเปก C12 อนุญาตแก้ rules/save/balance โดยเฉพาะ ตัวเลขทั้งหมดต้องจำลอง ไม่เพิ่ม SPD/เทิร์น ไม่ทับกลไกอาชีพอื่น ไม่แตะ VFX family C5 ที่รอรีวิว รูปจริง 390px สองรูปและรายงานผลก่อน/หลัง อัปเดต handoff หลังทำเสร็จ push/PR/merge เมื่อ checks ผ่านตาม standing authorization
```


## 2026-10-24 — C11 completed by Codex

PR #66 merged to `feature/fateweave-initial-prototype`: `abf10a8256e04040aa2b509bc6e5aa7c27c7654d`. Save v42; 10 playable classes/characters. Quality CI: 795 unit tests, typecheck/lint/build pass. Full browser CI: 242 tests pass. Final sim: 26 checks pass; 20 campaign acceptance cells pass; each character clears 12/12 seeds on maps 1–3 in the documented raised-character scenario. Read `docs/validation/balance-sim/C11.md` and the top entry in `CODEX-TO-CLAUDE.md` for every changed skill/number, migrations, method and review questions. C12 was not started; its prerequisite is now met. Older entries below are historical.


## 2026-10-24 — Magic Power (owner-approved)

Completed `codex/magic-power-scaling`, PR #65 merged as `f0ae3cf` after both CI workflows passed: shared spell/support scaling, Magic Power UI, mage weapons/talent, encounter versions and v41 migration. Validation: 756 unit tests, 23 full simulation checks, 8 character/gear checks and 3 boss reward checks passed. See `docs/design/MAGIC_POWER_TH.md` and CODEX-TO-CLAUDE.md for tests, simulation/PR status and screenshot. Basic attacks remain physical.

## 2026-10-24 — C10 victory rewards

PR #63 merged as `5d14ca1`, CI passed. Owner requested compact two-row EXP and one-page rewards; completed in PR #64, merged as `ae6e510` after both CI workflows passed. See CODEX-TO-CLAUDE.md. Tutorial intentionally skips rewards; rules/saves unchanged.

## 2026-10-23 — Codex C1: painted big-tree skill icons (ART-SKILL-ICON-003)

- Work branch `codex/skill-icons-003`, based on `feature/fateweave-initial-prototype`. C1 explicitly authorizes source art plus game integration. PR #60: https://github.com/wnau34-nptrn/asterveil-fateweave/pull/60 — open for review; no merge into the game branch. Implementation commit c3e1ad2. Latest base documentation merged cleanly; no code changes from the base refresh.
- 27 original painted RGBA PNGs, prompt/source provenance, bounds, native 40/56/72 normal/cooldown preview and reproducible packaging under `incoming/ART-SKILL-ICON-003/`.
- Runtime atlas now 61 icons: original 34 IDs in unchanged order, then section 23's 27 IDs. 256 px cells, 6 columns × 11 rows, 1536×2816. Quality-85 WebP 1,186,696 bytes; delivery/runtime bytes and metadata match. Original art uses its native R1/-002 256 px sources. Five unused cells stay transparent.
- Fixed the previously hardcoded 6×6 CSS atlas sizing: `icon()` derives background-size from JSON dimensions, preventing adjacent-cell fragments in the taller atlas. SVG fallback aliases and line-icon modifier nodes stay intact.
- Validation: typecheck, lint, 64 Vitest files / 751 tests, production build, focused Chromium 390×844 checks of Skills/Talents for Toma, Sefa, Brann, Lio, Lyra and weaver (requested Eira; current Thai name ไอรา). Equipped Lunge displays/selects/reloads in the battle dock without an accidental command. Dedicated `playwright.icons.config.ts` owns port 5193 so another worktree's server cannot be reused. Existing build chunk-size advisory only; no gameplay/save/rule changes.
- Owner screenshots: `incoming/ART-SKILL-ICON-003/qa/tree-390.png` and `battle-dock-390.png`. Both visually inspected after the CSS correction; Chromium touch emulation, not real iOS/phone verification. Artistic acceptance remains the owner's judgement.


อ่านไฟล์นี้ก่อน แล้วอ่าน `CLAUDE.md` (กติกาหลัก สั้นลงแล้ว) — รายละเอียดระบบเดิมอยู่ใน `docs/design/SYSTEMS_REFERENCE.md` อ่านเฉพาะหัวข้อของระบบที่จะแก้ แผนใหญ่ `docs/MASTER_PLAN_TH.md`

## ข้อมูลพื้นฐาน

- รีโป `wnau34-nptrn/asterveil-fateweave` สาขาเกม `feature/fateweave-initial-prototype` (draft PR #1) ทุก push ผ่าน CI แล้วเผยแพร่ GitHub Pages เอง: https://wnau34-nptrn.github.io/asterveil-fateweave/
- ถ้าระบบกำหนดสาขา `claude/...` ให้ทำงานบนสาขานั้นที่ตั้งจากสาขาเกม แล้ว push ทั้งสาขานั้นและ `feature/fateweave-initial-prototype` (เจ้าของสั่งให้ทำงานบนสาขาเกม)
- คุยกับเจ้าของเป็นภาษาไทย ใช้ "ค่ายทหารรับจ้าง" ห้าม "บริษัท" ห้ามคำว่า ม่านเวล; เรื่องหน้าตาเจ้าของตัดสิน ส่งภาพ 390px หน้าละ 1–2 ภาพ
- เซฟเวอร์ชัน 39 (ต้นไม้ใหญ่ครบ 10 อาชีพ)
- **รอ Claude หลัง Usage รีเซ็ต (เจ้าของอนุมัติแล้ว):** ปรับสกิลตาม `docs/design/SKILL_AUDIT_TH.md` (รออนุมัติรายข้อ), แคมป์/ตัวสำรอง `docs/MASTER_PLAN_TH.md` A6c, 15 อาชีพ A6b
- **ระหว่างรอ Usage ของ Claude (ถึง 28 ต.ค.): Codex ทำงานตาม `docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md`**
- ตรวจก่อน push: `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build` + เทสต์เบราว์เซอร์ที่เกี่ยวข้อง
  (`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npx playwright test <ไฟล์> -g "<ชื่อ>"`) ชุดเต็มปล่อย CI
- ภาพรีวิวหน้าตัวละคร: `UI_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/ui-shots.spec.ts`; คลิป Bolt: `BOLT_CLIPS=1 npx playwright test tests/browser/bolt-clips.spec.ts` (ประกอบวิดีโอจาก `frames/` + `stamps.txt` ด้วย ffmpeg)
- ข้อความ commit ห้ามใส่ชื่อรุ่นโมเดล; เซฟเวอร์ชัน 39

## ทำเสร็จวันนี้ (2026-10-22)

- A7 ขั้นที่ 1: หน้าภาพรวม/หุ่นแต่งตัว, กระเป๋าตาราง 5 ช่อง (`#pick-…` แล้วการ์ดมี `#wear-…`/`#compare-…`), ชิปตัวกรอง, หน้ารายละเอียด/เทียบไอเท็ม (mockup 02), ต้นไม้อัศวินแบบโหนด (แตะ = เลือก, `#character-talent-learn` = ลงแต้ม)
- A7 ขั้นที่ 1: ช่างตีเหล็ก (mockup 05) ทำแล้ว — แถบเหรียญ, แท็บไอคอน, ไอเท็มกลางจอ, ชิปวิธีพัฒนา, การ์ดผลลัพธ์ ▲▼ (id เดิมครบ) ภาพรีวิว: `FORGE_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/forge-shots.spec.ts` สรุปรางวัล (09) ทำแล้ว (`SUMMARY_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/summary-shots.spec.ts`) ป้ายจ้าง (10) ทำแล้ว (`HIRE_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/hire-shots.spec.ts`; ชิปแนวหน้า/หลัง, ปุ่มสุ่มป้ายย้ายไว้เหนือรายการ) เหลือ: → หน้าค่าย+แถบเมนูล่าง (06) ทำแล้ว (`LOBBY_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/lobby-shots.spec.ts`) — ข้อ 1 ครบ
- ไอคอนสกิลวาด 33 สกิล (`icon(<skill>)` → `public/assets/ui/skill_icons.webp`; `lineIcon()` สำหรับโหนดที่ไม่ใช่สกิล)
- บอสแมพ 1 (หัวหน้ากองหน้า + นักล่าเผ่าอสูร) อยู่ใน atlas foes เฟรม 9–10
- Bolt ใช้ภาพวาดของ Codex (`public/assets/fx/bolt_fx.*`) เจ้าของให้ผ่าน และขยายลูกพลังแล้ว
- คิวงาน Codex ข้อ 13–21 (ศัตรูใหม่ 9 ตัว แมพ 1 เป็นสไลม์/ค้างคาวหน้าตาอ่อน, ฉากหลังศึก, ไอคอนโจมตี, tile ป่า, บอสบท 1, สัตว์เลี้ยง, Execute/Ward, แผนที่บท 1, แผนที่โลก) — `docs/handoffs/CODEX-ART-QUEUE-TH.md`
- `CLAUDE.md` ย่อเหลือ 14 KB + กติกาเปิดแชตใหม่/เลือกรุ่นโมเดล
- **บอสใหม่ (เจ้าของ 2026-10-22, `docs/design/FOUR_FOES_PLAN_TH.md` ข้อ 8–9):** บอสไม่หวั่นไหว (ถูกขัดแล้วขัดซ้ำไม่ได้ 2 รอบ), ท่าไม้ตายขัดไม่ได้, เรียกลูกน้อง/เปลี่ยนเฟสตามเลือด (ท่าโจมตีทั้งทีม, รวบรวมพลัง), บอสล้ม = ชนะ (เฉพาะศึกบอสที่มีช่วง), มินิบอสได้แค่ไม่หวั่นไหว, หน้าสถานะศัตรูแสดงค่า การบัง ท่าที่วน และช่วงถัดไป
- **A7 ขั้นที่ 2 ระบบศัตรู 4 ช่อง เสร็จ** (สรุปเต็ม + ตัวเลขจริง `docs/design/FOUR_FOES_PLAN_TH.md`): ช่อง f1 f2 b1 b2, แถวหน้าบังแถวหลัง (สกิลตีทะลุ: แทงทะลวง ติดตรา แทงข้างหลัง ท้าดวล; ฮีโร่แนวหลังตีได้ทุกช่อง), ภาพศัตรู 9 ตัว ART-CHAR-FOES-002 เข้าเกมแล้ว, ชุดศึกใหม่ 11 ชุดใน 3 แมพ, EXP คิดจาก HP, เซฟ v35, สนามชั่วคราว 4 คอลัมน์

## การตัดสินใจของเจ้าของที่ต้องทำตาม

- mockup `incoming/ART-UI-MODERN-001/` คือทิศทาง UI (สร้างด้วย DOM/CSS จาก state จริง)
- หน้าค่าย: คงฉากและจุดแตะ NPC + เพิ่มแถบเมนูล่าง; แผนที่/ศึก: คงตำแหน่ง D-pad และขนาดสนาม เปลี่ยนแค่สไตล์; PC คงกรอบแนวตั้งกลางจอ
- ศึก 4 ต่อ 4 (ศัตรู 1–4 ตัว หน้า 2 หลัง 2) — แถวหน้าบังแถวหลัง สกิลบางอย่างตีทะลุได้ (เจ้าของ 2026-10-22)
- ศัตรูหน้าตาไล่จากอ่อนไปโหดตามแมพ: แมพ 1 สไลม์/ค้างคาว ทัพอสูรเฉพาะศึกเนื้อเรื่อง

## งานถัดไป (แผนที่เจ้าของเห็นด้วย 2026-10-22) + รุ่นที่แนะนำ

ประวัติ (เสร็จแล้ว):
- 1. ~~A7 ขั้นที่ 1 (UI ตาม mockup ครบ: ช่างตีเหล็ก สรุปรางวัล ป้ายจ้าง หน้าค่าย+แถบเมนูล่าง)~~ เสร็จแล้ว 2026-10-22 — ตีบวก/เพิ่ม Lv ทีละ 1 ขั้น, เอฟเฟกต์ค้อนชั่วคราว (รอภาพ Codex คิวข้อ 22), ฉากค่ายแสดงเฉพาะตัวหลัก 4 ตัว
- 2. ~~A7 ขั้นที่ 2 ระบบศัตรู 4 ช่อง~~ เสร็จแล้ว 2026-10-22 — ความยากช่วงหลังของตัวจำลองยังง่ายเพราะทีมถึงเพดาน Lv10 บนแมพ Lv1–9; แก้ด้วยการปรับเลเวลแนวรอยแยก (A10)
- 3. **A7 ขั้นที่ 3 สนาม 8 ตัว + HUD — โครงเสร็จแล้ว 2026-10-22 (Opus) รอเจ้าของดูภาพ → Sonnet เก็บ:** ทำแล้ว: `field-layout.ts` สนาม 8 ช่อง (4 คอลัมน์ บน/ล่าง + **ช่องกลาง: คอลัมน์ที่ศึกนั้นมีตัวเดียว (นับลูกน้องที่ถูกเรียกได้) ยืนแถวกลาง เช่นบอสเดี่ยว — เจ้าของขอ 2026-10-22** `slotPlan()`, ตัวปกติ ~1.2 เท่าของเดิม, ตัวใหญ่ `LARGE_SCALE` 1.5 เท่าจากเท้าเดิม, สนามเตี้ย <260px ใช้กริดเดิม `shortSlots`), ~~ป้ายท่าถัดไปบนหัวศัตรู~~ (เอาออกแล้วตามเจ้าของ), **ตารางยืนมาตรฐาน 2×3 ต่อฝั่ง แถบ HP เหนือหัวทุกตัว (`docs/design/FOUR_FOES_PLAN_TH.md` ข้อ 11)**, ป้าย "ถูกบัง" บนเป้าที่ถูกแถวหน้าบัง (`.screen-marker`), คิว SPD 8 ช่องพร้อมตัวเลข SPD และเส้นแบ่งรอบถัดไป (กว้าง <388px แสดง 6), ป้ายกลางสนาม `#field-banner` ตอนบอสเปลี่ยนช่วง/เรียกลูกน้อง/รวบรวมพลัง/โจมตีทั้งทีม, ลูกน้องที่ถูกเรียกโผล่ในช่องว่างทันทีระหว่างแสดงผล, การ์ดเจตนาไม่โชว์ "0 พลังโจมตี" ตอนเปลี่ยนช่วง ภาพรีวิว: `BATTLE_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/battle-shots.spec.ts` · **HUD บีบแล้ว (เจ้าของ 2026-10-22):** หัวเรื่องเทิร์นอยู่ในแถบหัวข้างชิปรอบ, คิวแถวเดียว, ⓘ/× อยู่แถวเดียวกับคำแนะนำเป้า, บรรทัด "ใช้ได้ทุกเทิร์น/คูลดาวน์" ใต้ปุ่มสกิลเหลือแค่ให้โปรแกรมอ่านจอ (สกิลที่ติดคูลดาวน์มีป้าย "รอ N") → สนามสูง 513px ที่ 390×844 (เดิม 455) · **เหลือให้ Sonnet (หลังเจ้าของตอบ):** ปรับตามความเห็นเจ้าของ, แอนิเมชันลูกน้องปรากฏ (ตอนนี้โผล่ทันที), แสงรวบรวมพลังบนตัวบอส, หัว HUD ตาม mockup 08 (ROUND/ชื่อศึก), ภาพ PC 1366×768
- 3b. ~~จัดแผนฝั่งเรา~~ เสร็จแล้ว 2026-10-22 (เซฟ v36) — สรุปท้าย `docs/design/FORMATION_PLAN_TH.md` (ตาราง 2×3 ในหน้าทีมค่าย + แท็บทีมกระเป๋า, คอลัมน์ 3 ตัวในสนามขนาดเต็ม ตัวกลางเยื้องเข้ากลางสนาม, ตัวจำลองไม่พบแผนที่เหนือชัด) รอเจ้าของดูภาพ 390px
- สนามศึก (2026-10-22 ช่วงท้าย, เจ้าของตัดสินทีละข้อ): ตารางยืนมาตรฐาน 2×3 ต่อฝั่ง ทุกศึกตำแหน่งเดิม, บอสแถวกลางเสมอ, แถบ HP ใต้เท้าทุกตัว ชื่อศัตรูเหนือหัวตามที่ว่างของภาพ (`figureTops`), ไม่มีป้ายเล็งเป้า/ถูกบังบนสนาม, HUD บีบ (สนาม 513px ที่ 390×844), คง 4 ต่อ 4 และสัตว์เลี้ยงจะยืนในช่องว่างฝั่งเรา — รายละเอียด `docs/design/FOUR_FOES_PLAN_TH.md` ข้อ 10–11, `docs/design/FORMATION_PLAN_TH.md`

- 1. ~~รับภาพรุ่น A จาก Codex~~ เสร็จแล้ว 2026-10-22 (Sonnet): ไอคอนโจมตีวาดเข้า atlas (ช่อง 33), ฉากหลังศึกแยกตามแมพ (`BattleSession.scene` → `#battle-view[data-scene]`, `public/assets/art/battle_forest|riftline.webp`), tile/ของตกแต่งป่าแมพ 2 รวมเข้า `tileset.webp` (4×9) / `decor.webp` (6×6) ผ่าน `floorFrame`/`decorAt` ใน `world-art.ts` (พื้นป่า + กลุ่มป่าลึกบล็อก 4×4), หน้าเลือกแผนที่เป็นภาพบท 1 + หมอก + 10 โหนด (`lobby-ui.ts` `mapList`, `region_ch1.json`; ปุ่มใน CSS ห้ามใช้ transform จัดกลางเพราะ `button:active` ทับ), เอฟเฟกต์ค้อนใช้ภาพ Codex อยู่แล้ว (ef17855) ภาพรีวิว: `REGION_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/region-shots.spec.ts` · **ยังไม่ได้ทำ (เก็บสนาม):** ลูกน้องบอสค่อยๆ ปรากฏ, แสงรวบรวมพลัง, หัวจอแบบ mockup 08, ภาพ PC 1366×768
ลำดับต่อไป (เจ้าของเห็นด้วย: A10 ทำท้ายสุดของรุ่น A เพราะต้นไม้ใหม่เพิ่มพลังทีม):
1. **รับภาพรุ่น A + เก็บรายละเอียดสนามศึก (Sonnet)** — ภาพจาก Codex ในสาขา `art/...` (ยังไม่ merge): ไอคอนโจมตี (`art/art-skill-icon-002`), ฉากหลังศึกป่าทึบ/แนวรอยแยก แยกตามแมพ (`art/art-world-battle-bg-001`; เส้นพื้นต้องเข้ากับตารางยืน FLOOR .38), tile ป่าแมพ 2 (`art/art-world-tiles-002`), หน้าเลือกแผนที่บท 1 + หมอก (`art/art-world-ch1-map-001`), เอฟเฟกต์ค้อนตีอุปกรณ์แทนค้อนชั่วคราว (`art/art-vfx-forge-strike-001`) — อ่าน NOTES.md ของแต่ละงาน; เก็บงานสนาม: ลูกน้องบอสค่อยๆ ปรากฏ, แสงตอนรวบรวมพลัง, หัวจอแบบ mockup 08 (ROUND + ชื่อศึก), ตรวจ PC 1366×768
2. ~~ร่างต้นไม้อาชีพอื่น + ระบบตำรา (Opus, A6 ส่วน 2)~~ **ร่างเสร็จ เจ้าของอนุมัติตามที่แนะนำ 2026-10-22:** `docs/design/SKILL_TREES_ALL_TH.md` (9 อาชีพ โครงเดียวกับอัศวิน สกิล 6 ตัว/อาชีพ สกิลใหม่ 27 ตัว กลไกใหม่ 6 ชิ้น แนะนำรุ่น A ทำ นักดาบ นักเวท นักบวช ทวน ธนู) และ `docs/design/SKILL_TOMES_TH.md` (ตำรา 3 สายตามอาชีพ × 3 ขนาด, Lv1–5, ค่าใช้จ่าย ที่มา การแลก เซฟ v37) แต่ละไฟล์มีคำถามท้ายไฟล์ 3 ข้อ — ไอคอนตำราจาก `art/art-ui-progress-001`
3. **เอฟเฟกต์ Execute / Ward (Sonnet, A8)** — หลังข้อ 1; ภาพ `art/art-vfx-exec-ward-001` ทำภาษาเดียวกับ `game/visuals/bolt-fx.ts` แล้วส่งคลิปเจ้าของก่อนขยาย
4. ~~ลงโค้ดต้นไม้รุ่น A + ระบบตำรา~~ **เสร็จแล้ว 2026-10-22 (เซฟ v37)** — ต้นไม้ใหญ่ นักดาบ นักเวท นักบวช ทวน ธนู (สกิลใหม่ 15 ตัว ทุกโหนดมีเทสต์ ผู้แนะนำใช้สกิลต้นไม้ ตัวจำลอง 3 บิลด์ต่ออาชีพชนะทุกบิลด์ `docs/validation/balance-sim/TREES.md`), ตำรา Lv1–5 (หน้าแท็บสกิลที่ค่าย แลกที่ครูฝึก รางวัลแมพ 2–3) สิ่งที่ปรับจากร่าง: ท้ายไฟล์ `SKILL_TREES_ALL_TH.md` และ `SKILL_TOMES_TH.md` · ภาพรีวิว `TREE_SHOTS=<โฟลเดอร์> npx playwright test tests/browser/tree-shots.spec.ts` · **ค้าง:** ภารกิจครูฝึก "เพิ่มเลเวลสกิลครั้งแรก", ไอคอนตำรา (`art/art-ui-progress-001`), ไอคอนวาดสกิลใหม่ 15 ตัว (คิว Codex)
5. ~~A10 ปรับสมดุลรอบเล็ก~~ **เสร็จแล้ว 2026-10-22 (Opus)** — ตัวจำลองแคมเปญใหม่ (ค่ายใหม่เล่นแมพ 1→2→3 + เล่นซ้ำ + โหมดยาก, `docs/validation/balance-sim/CAMPAIGN.md`), แนวรอยแยก Lv6–10 (แผนที่ v7), ความแรงต่อแผนที่ `bossPercent`/อีลิท `percent` (ผู้คุมรอยแยก 160% ฯลฯ), บอสโหมดยาก +10 เลเวล, จังหวะตำราใหม่ (ทุก 4 ชนะ หีบหายาก 1 ไม่มีแก่นตอนจบครั้งแรก ทองถูกลงครึ่ง) ตารางก่อน/หลัง + สิ่งที่ยังไม่ถึงเป้า: `docs/MASTER_PLAN_TH.md` A10 · **รอเจ้าของตัดสิน:** จะเพิ่มดาเมจศัตรูทั้งเกม (ศึกปกติ/อีลิทยังง่ายมากสำหรับผู้แนะนำ) และให้เลเวลสำคัญขึ้น (`levelStatPercent`) หรือไม่

เก็บไว้รุ่น B–C (ยังไม่ใส่เกม): บอสแมพ 4–10 + วาร์กอธ (`art/art-char-boss-ch1-002`), สัตว์เลี้ยง (`art/art-pet-002`), รูน 12 แบบ (`art/art-ui-rune-001`; เปลี่ยนชื่อ `rune_veil` ตอนรับเข้า), คู่แข่งลานประลอง (`art/art-char-rival-001`), concept แผนที่โลก (`art/art-world-map-001`: เจ้าของผ่านเป็นทิศทาง 2026-10-22; ภาพจริงรุ่น C ให้ตำแหน่ง 10 แห่งของภูมิภาค 1 ตรงกับแผนที่บท 1, ลดความจัดของสีลงให้เข้ากับ HUD, ภาพแนวตั้งเห็นทั้งทวีป) · ยังไม่มา: ข้อ 12 หอคอยแห่งชะตา

## รอเจ้าของ / รอคนอื่น

- Codex: คิวข้อ 14–21 (ข้อ 13 ศัตรูใหม่ รับเข้าแล้ว)
- เจ้าของ: Cloudflare token (รุ่น D) — เนื้อเรื่องบท 1 อนุมัติแล้ว 2026-10-22 (ตามที่แนะนำ, `docs/LORE_CHAPTER1_TH.md` ท้ายไฟล์), ต้นไม้รุ่น A + ตำรา ลงโค้ดแล้ว รอเจ้าของดูภาพ 390px (หน้าต้นไม้นักดาบ, แท็บสกิล)

## ~~งานค้าง: ผู้ร่วมทางทีละตัว + รับสมัครหลัง prologue~~ เสร็จแล้ว 2026-10-23 (Opus, เซฟ v38)

- เจ้าของอนุมัติ: prologue สู้ 4 → ไอรา/เซเรนแยกย้าย → ไลราเข้าทีม → รับสมัครฟรี 2 รอบ (เลือก 1 จาก 3: ลิโอ/แบรนน์/เซฟา/โทมะ, การันตีลิโอหรือโทมะถ้าทีมยังไม่มี) → ไอรากลับมาตอนเข้าศึกบอสแมพ 1 → เซเรนกลับมาตอนเข้าศึกบอสแมพ 2 ไม่มีตัวระดับ R
- โค้ด: `world.ts` `recruit`/`disband`/`draftOffers`/`draftPick`; `types.ts` `MapDefinition.draft`/`prologueGuests`, `run.arrivals`/`run.draft`; `profile.ts` `depart`/`settle`; `world-ui.ts` `#draft-dialog` (กด Escape ปิดไม่ได้); `game-shell.ts` ฉากก่อนเข้าทีม; `story-ui.ts` บทพูดแยกย้าย + บทพูด 4 ทหารรับจ้าง; แมพ 1 v3
- ตัวจำลอง: `tests/starter-sim.test.ts` → `docs/validation/balance-sim/STARTERS.md` (ทุกคู่ผ่านแมพ 1) และ `CAMPAIGN.md`
- ~~ปัญหาแมพ 3~~ แก้ในงานที่ 6 (ดูด้านล่าง)

## ~~งานที่ 6: ต้นไม้ใหญ่ ลิโอ/แบรนน์/เซฟา/โทมะ~~ เสร็จแล้ว 2026-10-23 (Opus, ทำต่อในแชตเดิม, เซฟ v39)

- ต้นไม้ใหญ่ 4 อาชีพ (16 โหนดต่ออาชีพ สกิลใหม่ 12 ตัว) สรุปและผลตัวจำลองใน `docs/design/SKILL_TREES_ALL_TH.md` หัวข้อ "ลงโค้ดแล้ว — ทหารรับจ้าง 4 อาชีพ" ตอนนี้ต้นไม้ใหญ่ครบ 10 อาชีพ (ระบบต้นไม้เล็กใน `core/world/talents.ts` ยังอยู่แต่ไม่มีอาชีพใช้แล้ว)
- แมพ 3 แย่ลงเพราะทีมไม่มีนักบวช ไม่ใช่เพราะต้นไม้ ตัวจำลองตอนนี้ส่งเซเรนลงสนามเมื่อเข้าค่าย (`SIM_NO_PRIEST=1` ดูแบบไม่จัดทีม) และบิลด์แรกของลิโอ/โทมะเก็บสกิลฟื้น → แมพ 3 รอบแรก Rush 92% Explorer 100% (เท่าก่อนรับสมัคร) ตัวเลขใน `docs/MASTER_PLAN_TH.md` A2
- เจ้าของตัดสิน (2026-10-23): แมพ 2 ปล่อยไว้ตามเดิม (casual รอบแรกผ่าน 50–58%) และ **ไม่ทำแถบเตือนทีมไม่มีผู้รักษา** ให้ผู้เล่นเรียนรู้เอง · ไอคอนวาด 27 สกิลในคิว Codex ข้อ 23

## ข้อความเปิดแชตใหม่

งานที่ 1 (Sonnet):
```text
ทำงานต่อในรีโป wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype
อ่าน docs/handoffs/NEW-CHAT-HANDOFF-TH.md, CLAUDE.md, docs/design/FOUR_FOES_PLAN_TH.md ข้อ 10–11 และหัวข้อที่เกี่ยวข้องใน docs/design/SYSTEMS_REFERENCE.md ก่อน
แล้วทำ "งานถัดไป" ข้อ 1 (รับภาพรุ่น A จาก Codex: ไอคอนโจมตี ฉากหลังศึกแยกตามแมพ tile ป่า หน้าเลือกแผนที่บท 1 เอฟเฟกต์ค้อน + เก็บรายละเอียดสนามศึก) ส่งภาพหน้าจอ 390px ให้เจ้าของดู ตอบเป็นภาษาไทย
```

งานที่ 3 (Sonnet) — งานถัดไป:
```text
ทำงานต่อในรีโป wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype
อ่าน docs/handoffs/NEW-CHAT-HANDOFF-TH.md, CLAUDE.md และหัวข้อ VFX ใน docs/design/SYSTEMS_REFERENCE.md ก่อน
แล้วทำ "งานถัดไป" ข้อ 3: เอฟเฟกต์ Execute / Ward จากภาพ Codex สาขา art/art-vfx-exec-ward-001 (อ่าน NOTES.md) ทำภาษาเดียวกับ game/visuals/bolt-fx.ts จังหวะเดิม ผลตรงจริง แล้วส่งคลิปให้เจ้าของดูก่อนขยาย ตอบเป็นภาษาไทย
```

งานที่ 7 — ยกเลิก (เจ้าของ 2026-10-23: ไม่ทำแถบเตือนทีมไม่มีผู้รักษา)

งานที่ 6 (Opus) — เสร็จแล้ว (เก็บไว้อ้างอิง):
```text
ทำงานต่อในรีโป wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype
อ่าน docs/handoffs/NEW-CHAT-HANDOFF-TH.md, CLAUDE.md, docs/MASTER_PLAN_TH.md (A2 หัวข้อ "แก้แล้ว 2026-10-23" และ A6), docs/design/SKILL_TREES_ALL_TH.md และ docs/design/SKILL_TOMES_TH.md ก่อน
แล้วทำต้นไม้ใหญ่ของลิโอ (กวีรูน) แบรนน์ (ผู้พิทักษ์ค้อน) เซฟา (นักสอดแนม) โทมะ (นักเล่นแร่) ตามรูปแบบรุ่น A (เจ้าของอนุมัติให้เลื่อนขึ้นมาก่อน เพราะเป็นตัวที่ผู้เล่นรับสมัครหลัง prologue) แล้วจำลองใหม่ (npm run sim) ดูแมพ 2–3 รอบแรกที่แย่ลง (Rush advisor แมพ 3 ผ่าน 25%) ถ้ายังไม่พอให้ปรับเลเวลเข้าร่วม/ความยาก รายงานตัวเลขก่อน/หลัง ตรวจก่อน push ตาม CLAUDE.md ตอบเป็นภาษาไทย
```

งานที่ 5 (Opus) — เสร็จแล้ว (เก็บไว้อ้างอิง):
```text
ทำงานต่อในรีโป wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype
อ่าน docs/handoffs/NEW-CHAT-HANDOFF-TH.md, CLAUDE.md, docs/MASTER_PLAN_TH.md (A10), docs/design/SKILL_TREES_ALL_TH.md และ docs/design/SKILL_TOMES_TH.md (หัวข้อ "ลงโค้ดแล้ว") ก่อน
แล้วทำ "งานถัดไป" ข้อ 5: A10 ปรับสมดุลรอบเล็ก (แนวรอยแยก Lv6–10, ดาเมจบอส, ตัวจำลองรวมแผนการยืน ต้นไม้ และตำรา, จังหวะได้ตำรา) รายงานตัวเลขก่อน/หลัง ตรวจก่อน push ตาม CLAUDE.md ตอบเป็นภาษาไทย
```
