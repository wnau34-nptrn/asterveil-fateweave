# ส่งต่องานพัฒนาให้ Codex ระหว่างรอ Usage ของ Claude (2026-10-23)

## P00 publication complete — PR #72

Merged into game branch as `aab276d9f7eb46f782039414a83b50c19beef8af`, head `e638f3b`. PR quality CI run 672 (`40245547986`) passed. Local baseline: full sim 28/28 and focused 55/55; final artifacts: 19 documentation/report files, 29 tracked links, hashes and whitespace validated. Issue #69 marks P00 complete and remains open. Next is P01-A/B in `docs/design/p00/SHARED_PROGRESSION_TEAM_SPEC_TH.md`; no runtime rules were changed by P00. No screenshots or human playtest were claimed. This note records delivery only.

## P00 completed — shared progression/team specification and baseline

- Owner authorized proceeding after the consolidated plan. Branch `docs/p00-shared-level-team-spec` targets game branch. Added `docs/design/p00/SHARED_PROGRESSION_TEAM_SPEC_TH.md` and `MIGRATION_ACCEPTANCE_TH.md`: canonical camp XP, atomic profile/run transitions, legacy withdrawal boundary, ownership and six-position/five-live-actor vocabulary. Runtime remains unchanged; PR #59 still awaits visual review.
- Baseline on `e62292a`: full sim 28/28 across seven files plus focused roster/save/formation/talent checks 55/55. Artifacts, hashes, policies and twenty current campaign cells are in `docs/validation/p00/`. No new browser screenshots, human playtest, new-system validation or real-device claim.
- P00-01/02/03 marked complete in development plan. Next P01-A/B: implement shared Lv/XP and migration with field4/reserve4 and current star-point formula; five-member prototype waits P02 and star-point redesign waits P04. See the copy-ready next task in the plan.
- Documentation-only change; link/whitespace review before publication. Migration matrix is specified, not implemented or tested against new rules. Publication PR #72; merge evidence is tracked through issue #69.

## 2026-10-25 — Plan publication verified

PR #70 merged as `aafec236507458f45303a6af3a26438dfb276534`; quality CI run 665 passed. `docs/DEVELOPMENT_PLAN_TH.md` and issue #69 are the delivery entrypoints. Start P00 next. Design/research documents are now published; older local-only status notes below are historical. No gameplay changes in this delivery.

## 2026-10-25 — Consolidated delivery plan prepared for GitHub

Owner requested publishing the full development plan. `docs/DEVELOPMENT_PLAN_TH.md` is the current delivery index; issue #69 tracks P00–P11 and is not closed by publishing the plan. All D01–D37 have an assigned phase. Older copy-ready implementation tasks below need reconciliation with shared camp levels and the five-member prototype; start P00 first. No runtime changes in this task. See CODEX-TO-CLAUDE for scope/validation/publication.

## 2026-10-25 — Shared-level design update completed

Documented owner's equal-level direction and recommendations in `docs/design/SHARED_LEVEL_TEAM_BOSSES_TH.md`: shared camp Lv/EXP/point entitlement, individual builds, multiple accessible boss-counter routes. Updated overview links and marked individual catch-up/team-four economy assumptions superseded or needing recalculation. No battle/save/balance implementation. See CODEX-TO-CLAUDE for migration concerns and validation.

## 2026-10-25 — Concrete progression recommendation completed

Added `docs/design/PROGRESSION_RECOMMENDED_BASELINE_TH.md` at the owner's request for our recommended direction. It selects a structural baseline and clearly labels provisional point/star/session values. No runtime, save or balance edits. Preserve prior approved plans as historical authority; the new document proposes their revision rather than claiming approval. Next work is economy/build validation; see CODEX-TO-CLAUDE for details.

## 2026-10-25 — Progression/promotion proposal completed

Owner requested the next discussion round. Added `docs/design/PROGRESSION_PROMOTION_DISCUSSION_TH.md` covering D06–D10 and impacts on gacha and save investments. Proposal only: no battle/save/balance changes. Existing approved C12 and unique-star directions are not silently superseded. See CODEX-TO-CLAUDE for scope and validation; unresolved formulas and structural tradeoffs are documented for the next discussion.

## 2026-10-25 — Comparative research advisory completed

Added `docs/GAME_RESEARCH_RECOMMENDATIONS_TH.md` at owner's request: evidence from seven games and recommendations for all37 discussion topics. This is advisory, not approval to implement proposed progression/gacha or a replacement of approved C12. No runtime changes. See CODEX-TO-CLAUDE for validation.

## 2026-10-25 — Owner requested consolidated Game Detail and discussion list

Documentation completed in `docs/GAME_DETAIL_TH.md` and `docs/GAME_DESIGN_DISCUSSION_TH.md` (37 open topics). No additional C12 batch or new game rules implemented. Owner wants to discuss gaps before further design; preserve existing approvals while keeping recent gacha/promotion proposals explicitly unresolved. See CODEX-TO-CLAUDE entry for audit findings and validation.

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
| ~~C1~~ | ~~ไอคอนวาด 27 สกิลต้นไม้ใหญ่ + ใส่เข้า atlas~~ **ส่งแล้ว 2026-10-23, PR #60 รอรีวิว** | ภาพ + ต่อเข้าเกม | — |
| ~~C2~~ | ~~แจ้งเตือน "ทีมยังไม่มีผู้รักษา"~~ **ยกเลิก** (เจ้าของ 2026-10-23: ให้ผู้เล่นเรียนรู้การจัดทีมเองบนแผนที่ ห้ามเพิ่มแถบเตือนนี้) | — | — |
| ~~C3~~ | ~~เอฟเฟกต์ Execute / Ward~~ **เสร็จแล้ว เจ้าของให้ผ่าน 2026-10-23** (`src/game/visuals/exec-ward-fx.ts`) | — | — |
| ~~C4~~ | ~~งานภาพที่เหลือในคิว~~ **ส่งครบแล้ว (ตรวจ 2026-10-23)** | — | — |
| C5 | เอฟเฟกต์ภาพวาดของสกิลที่เหลือทั้งหมด ทำเป็น 8 ตระกูล ทีละตระกูล (ภาพ + ต่อเข้าเกม + คลิปให้เจ้าของ) | VFX | ทันที ทำตระกูลละ 1 PR ห้ามข้ามไปตระกูลถัดไปก่อนเจ้าของให้ผ่าน |

ไม่ใช่งานของ Codex (รอ Claude): การตัดระบบต้นไม้เล็กที่ไม่มีอาชีพใช้แล้วออกจาก `src/core/world/talents.ts`

### C1 — ส่งแล้ว: PR #60 รอรีวิว (2026-10-23)

```text
TASK C1 — Asterveil · Fateweave: painted icons for the 27 big-tree skills, delivered into the game
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype, work branch codex/skill-icons-003, PR into the base branch.
1. Make the art exactly as specified in docs/handoffs/CODEX-ART-QUEUE-TH.md section 23 (ART-SKILL-ICON-003): 27 icons, same style/scale/palettes as public/assets/ui/skill_icons.webp. Keep sources under incoming/ART-SKILL-ICON-003/ (png/, preview.png, NOTES.md).
2. Put them in the game: rebuild public/assets/ui/skill_icons.webp as one atlas (256 px cells, 6 columns, row-major) holding the 34 current icons in their current order followed by the 27 new ones in the section-23 order, and update src/game/visuals/skill_icons.json (order, cols, rows) to match. src/ui/icons.ts reads the order, so every listed skill switches from its line icon to the painted one automatically; the line-icon aliases in icons.ts stay as the fallback.
3. Check: npm run typecheck, lint, npx vitest run, build; open the camp character sheet "สกิล" and "ความถนัด" tabs for Toma, Sefa, Brann, Lio, Lyra and Eira and the battle dock with a tree skill equipped; send the owner two 390px screenshots (tree page, battle dock). Keep the atlas file size reasonable (WebP quality ~85).
```

### ~~C2~~ — ยกเลิก (เจ้าของ 2026-10-23)

เจ้าของตัดสิน: แมพ 2 ปล่อยไว้ตามเดิม และไม่ต้องมีแถบเตือน ให้ผู้เล่นเจอเองบนแผนที่เพื่อเรียนรู้การจัดทีม

### ~~C3~~ — เสร็จแล้ว (เจ้าของให้ผ่าน 2026-10-23)

เอฟเฟกต์ Execute / Ward อยู่ในเกมแล้ว (`src/game/visuals/exec-ward-fx.ts`) ไม่ต้องทำซ้ำ

### ~~C4~~ — ส่งครบแล้ว (Claude ตรวจ 2026-10-23)

- อยู่ในเกมแล้ว: 14 ฉากหลังศึก (`battle_forest.webp`), 16 tile ป่า, 20 แผนที่บท 1 (`region_ch1.webp`), 22 ค้อนตีบวก (`forge_strike_fx.webp`)
- ส่งแล้ว รออยู่ในสาขาภาพจนกว่าระบบของรุ่นนั้นจะมา (ไม่ต้องทำซ้ำ): 17 บอสบท 1 (`art/art-char-boss-ch1-002`, แมพ 4–10 รุ่น B–C), 18 สัตว์เลี้ยง (`art/art-pet-002`, รุ่น B), 10 รูน (`art/art-ui-rune-001`, รุ่น B), 11 คู่แข่งลานประลอง (`art/art-char-rival-001`, รุ่น B)
- ยังไม่ส่ง: 12 หอคอยแห่งชะตา (รุ่น C ทำทีหลังได้) · 23 ไอคอน 27 สกิลส่งพร้อม runtime แล้วใน PR #60 (C1), รอรีวิว

### C5 — เอฟเฟกต์ของทุกสกิล เป็นตระกูล (เพิ่ม 2026-10-23)

ตอนนี้มีเอฟเฟกต์ภาพวาด 3 สกิล (Bolt `bolt-fx.ts`, Execute/Ward `exec-ward-fx.ts` เจ้าของให้ผ่านแล้ว) ที่เหลือ ~58 สกิลยังใช้เอฟเฟกต์โค้ดสั้นๆ แทนที่จะวาดทีละสกิล ให้ทำ "ตระกูล" ที่ใช้ภาพชุดเดียวกัน แล้วแต่ละสกิลเปลี่ยนแค่สี/ขนาด/ทิศ/จำนวน ตามลำดับ (ใช้บ่อยก่อน):

| ลำดับ | ตระกูล | สกิล |
|---|---|---|
| 1 | ~~ฟันดาบ/แทง~~ R4: เจ้าของเลือก [แบบภาพ 10 ท่า](../combat-presentation/blade-storyboards/README_TH.md) รวม Pierce R2 และสั่งทำ VFX จริงแล้ว ต่อเข้าเกมครบ 2026-10-26 **ผ่านและ merge R4 แล้ว 2026-10-26 (`d14a3e1`, PR #59)** (`codex/vfx-family-1-blade`, PR #59, [คลิป](../combat-presentation/blade-slice/README_TH.md)) | attack, finisher, lunge, sweep, backstab, ambush, disarm, parry (ฟันสวน), pierce, halt |
| 2 | ~~โล่/ป้องกัน~~ **เจ้าของให้ผ่าน27ต.ค.2026** หลังRally R5วงพื้นเท่านั้น, PR#77 merged `afeef4a`; Pagesเผยแพร่สำเร็จ [release proof](../validation/defense-vfx-release/README_TH.md) | guard, aegis, rally, bulwark, stonearmor, guardstone, halo, sanctuary, brace, spearwall, hold |
| 3 | แสงรักษา — **เจ้าของเลือกartwork R1แล้ว27ต.ค.2026 ต่อruntimeครบ6ท่า ล่าสุดR2แก้แสงเบา/หางฟุ้ง/ตำแหน่งunit [รอตรวจคลิป](../combat-presentation/healing-slice/README_TH.md)**, branch `codex/vfx-family-3-healing`, [draft PR#78](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/78), ยังไม่merge/เผยแพร่/เริ่มตระกูล4; [handoff](C5-FAMILY-3-HEALING-HANDOFF-TH.md), Rouseเป็นguard ไม่ใช่heal | heal, prayer, rouse, revive, bless, mend (เพลงฟื้น) |
| 4 | ลูกธนู/มีดบิน | hinder, volley, weakshot, pin, track, disengage, knives |
| 5 | ทุบ/แผ่นดิน | bash, slam, quake, tremor |
| 6 | ขวดเล่นแร่ | acid, bomb, smoke, catalyst, haste, fury |
| 7 | ออร่า/เพลง/ตรา | mark, valor, dread, solo, warcry, taunt, challenge, decoy, evade, finale, note |
| 8 | เวทอาร์เคนที่เหลือ | storm, sigil, dispel |

```text
TASK C5 — Asterveil · Fateweave: painted VFX families for every remaining skill (one family per PR)
Read AGENTS.md and CLAUDE.md ("VFX — status") first, then docs/design/SYSTEMS_REFERENCE.md (VFX and combat-presentation rules), docs/combat-presentation/vfx-art-direction/README_TH.md, and the approved slices: src/game/visuals/bolt-fx.ts and src/game/visuals/exec-ward-fx.ts with public/assets/fx/{bolt,execute,ward}_fx.* and their clips in docs/combat-presentation/bolt-slice/ and exec-ward-slice/. Base branch feature/fateweave-initial-prototype; work branch codex/vfx-family-<n>-<name>; PR into the base branch.
Goal: replace the short code-drawn effects of every other skill with painted layers in the same language, built as 8 families (table in docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md section C5). Each family = one shared painted atlas (public/assets/fx/<family>_fx.webp + .json, sources under incoming/ART-VFX-<FAMILY>-001/) and one module src/game/visuals/<family>-fx.ts; each skill in the family picks its colour/scale/direction/count from a small table, not its own art.
Rules (same as the approved slices): timing comes from src/ui/battle-playback.ts and must not change; outcomes must be truthful (a dodged, blocked, guarded, cancelled or absorbed hit must look like it, read from the resolved events, never guessed); reduced-motion uses a still frame; nothing in the effect may change state (no rule, save or resolver changes); the class palettes from the skill icons; readable at 390px.
Process: family 1 first. For each family: make the art, wire it, run npm run typecheck, lint, npx vitest run, build and the battle Playwright tests, record short clips at 390px like the approved slices (one clip per skill type: hit, and where it applies blocked/dodged), put them in docs/combat-presentation/<family>-slice/, open the PR and stop. Start the next family only after the owner approves the clips (an approval is noted in docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md). Log each finished family at the top of docs/handoffs/CODEX-TO-CLAUDE.md.
```

### C6 — concept ตัวละครอาชีพใหม่ 5 อาชีพ (เจ้าของยืนยัน 15 อาชีพ 2026-10-23)

ทำ concept sheet ภาพตัวละครของ 5 อาชีพใหม่ใน `docs/MASTER_PLAN_TH.md` A6b: โหราจารย์ (หลัง), นักมวย (หน้า), นักสาป (หลัง), นักบุญรบ (หน้า), นักเต้นรำ (หลัง) สไตล์เดียวกับภาพทหารรับจ้างในเกม (`incoming/ART-CHAR-MERC-ENEMY-001/`) ให้ท่าทางและอาวุธสื่อกลไกของอาชีพ เป็น PR ภาพเท่านั้น (`art/art-char-class-new-001`, `incoming/ART-CHAR-CLASS-NEW-001/`) ห้ามแตะโค้ด กลไก ชื่อตัวละคร และสกิลรอ Claude ออกแบบ ไม่มีระบบธาตุ (อย่าใส่สัญลักษณ์ธาตุในภาพ)

```text
CODEX HANDOFF — ART-CHAR-CLASS-NEW-001
Asterveil · Fateweave: concept sheets for five new mercenary classes (concept only, no code)

Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-char-class-new-001; files only under incoming/ART-CHAR-CLASS-NEW-001/. Do not change src/, tests/, public/, .github/. PR into the base branch; do not merge. Original artwork only; nothing from Asterveil: Rise Beyond. Never use the word ม่านเวล; the player's group is the ค่ายทหารรับจ้าง.

READ FIRST: incoming/ART-CHAR-MERC-ENEMY-001/ (mercs/, NOTES.md, STYLE_CHECK.md: the chibi-proportion painted style, outline, lighting and palette rules of the current mercenaries) and the in-game unit/portrait atlases in public/assets/art/. Match that style exactly so the new classes stand next to Aegis, Lyra, Eira, Seren, Garran, Mira, Toma, Sefa, Brann and Lio. There is NO element system: no element symbols, colour-coded element auras or elemental badges.

Each class must read at a glance from its silhouette and weapon, and must not look like an existing class (no sword-and-board knight, no rapier duelist, no staff mage, no bow, no spear, no flask belt, no hammer, no lute). Lane = where it stands in battle (front row / back row).

1. โหราจารย์ — Seer (back row). Bends fate: turns one enemy's attack onto another enemy and skips an enemy ahead in its move cycle. Calm, mysterious; star-chart cloak, floating astrolabe rings or fate threads between the fingers; cool silver-violet and deep blue with small gold stars. No staff.
2. นักมวย — Martial Artist (front row). Builds "ปราณ" (inner energy) with each hit and spends it on finishers. Unarmed: wrapped fists/forearm guards, light flexible clothing, a visible ki glow that grows (show 1 pip and full-charge variants). Warm earth and saffron tones.
3. นักสาป — Hexer (back row). Stacks curses that drain foes at the end of each round and make cursed foes hurt themselves when they act. Hooded, talismans/paper charms or a cursed doll, faint dark-crimson sigils; unsettling but not gory, still friendly chibi proportions.
4. นักบุญรบ — Battle Saint (front row). A front-line healer: every strike sends healing light to the most wounded ally. Mace or knuckle-cross with a small shield or prayer beads, half armour over vestments; white, warm gold and soft mint light. Must not look like Seren (back-row priest) or Aegis (knight).
5. นักเต้นรำ — Dancer (back row). Speeds allies' skills back up (cooldown refresh) through rhythm: ribbons, fans or bells, flowing layered skirt/sash with motion lines; coral, teal and gold. Graceful, not a bard (no instrument).

DELIVERABLES per class (folders 01_seer … 05_dancer):
- Two design options (A and B) on one concept sheet each: full-body front view, 3/4 view, back silhouette, face close-up, weapon/prop callouts, 6-swatch palette.
- One in-game test: a battle unit sprite (same canvas and pivot as the current mercs in the atlas) and a circular portrait crop, for option A only, so the owner sees it at real size.
- review/lineup.png: option A of all five standing beside the ten existing classes at in-game unit size (silhouette check), and review/lineup_390.png composited on a 390x844 battle-field mock.
- NOTES.md: per class the silhouette idea, how the pose/prop shows its mechanic, palette hex codes, and a short Thai name suggestion for each option (the owner picks names; Claude designs skills later).
- PROMPTS.md / provenance like ART-CHAR-MERC-ENEMY-001.

After the PR is open, add the entry Codex owes Claude (AGENTS.md) and stop: production sprites/portraits for the chosen options are a later task after the owner chooses A or B.
```

### C7 — ภาพอุปกรณ์หลายแบบ (เจ้าของขอ 2026-10-23: ตอนนี้ซ้ำกันหมด)

ตอนนี้ `gear_items.webp` มี 1 ภาพต่อช่อง + อาวุธ 1 ภาพต่ออาชีพ (`src/game/visuals/equip-art.ts` `gearCell`) ทำให้อุปกรณ์ทุกชิ้นในช่องเดียวกันหน้าตาเหมือนกัน

```text
CODEX HANDOFF — ART-UI-EQUIP-002
Asterveil · Fateweave: equipment art variety (painted items by set and rarity tier) + wiring into the game

Read AGENTS.md and CLAUDE.md first. Base branch feature/fateweave-initial-prototype; work branch codex/equip-art-002; PR into the base branch (merge when CI passes, per AGENTS.md). Original artwork only; nothing from Asterveil: Rise Beyond. Never use the word ม่านเวล.

READ FIRST: incoming/ART-UI-EQUIP-001/ (the approved item style: 128 px cells, centred item, painted, no rarity colour in the art — the UI draws rarity frames and the set emblem), src/game/visuals/equip-art.ts and src/game/visuals/equip/gear_items.json (current mapping), src/ui/equip-art.ts (how the cell is shown), src/core/world/types.ts (Item: slot, rarity, set, hero, boss) and src/content/world/rules.ts / src/content/world/sets.ts or wherever SET_IDS are described (dawn, wind, shadow, thorn, starveil, mender) so each set's look matches its theme.

PROBLEM: every head/body/gloves/boots/charm piece shares one picture, and each class weapon has one picture, so loot never looks new.

ART (same style, scale and lighting as ART-UI-EQUIP-001; readable at 48 px on navy #0b1730; no text, no rarity colours, no frames):
1. Armour pieces — for each of the 5 slots (head, body, gloves, boots, charm):
   - 3 plain tiers for pieces without a set: "worn" (rarity 1–2: cloth/leather, simple), "fine" (rarity 3: reinforced, small trim), "masterwork" (rarity 4–5: ornate, gold/silver detail).
   - 1 look per set (6 sets): dawn, wind, shadow, thorn, starveil, mender — the set's motif must be obvious and consistent across its 5 slots (a player should recognise a full set at a glance).
   = 5 × 9 = 45 cells.
2. Class weapons — for each of the 10 classes (guardian, tracer, weaver, healer, garran, mira, toma, sefa, brann, lio): 3 tiers by rarity (1–2 / 3 / 4–5), same weapon family, growing in craft and glow (e.g. Lyra: plain rapier → engraved rapier → star-steel rapier). = 30 cells. Keep the current weapon as the middle tier's reference so the identity stays.
3. Boss gear — 3 unique boss charms for Item.boss 'aegis', 'focus', 'lantern' (currently they reuse the plain charm). = 3 cells.
Check the actual rarity range in src/core/world/types.ts and src/core/world/equipment.ts before fixing the tier thresholds; adjust the tier split to that range if it differs.

WIRING (UI only, no rule/save changes):
- New atlas public/assets/ui/equip/gear_items.webp (+ src/game/visuals/equip/gear_items.json frame names, e.g. gear_head_worn, gear_head_fine, gear_head_master, gear_head_set_dawn …, weapon_tracer_1/2/3, boss_aegis …). Keep potion_items and set_emblems unchanged.
- gearCell(item): boss item → boss frame; weapon → weapon_<hero>_<tier>; set piece → gear_<slot>_set_<set>; otherwise gear_<slot>_<tier by rarity>. Fallback to the old frame names if a frame is missing. Update the --cols/--rows in src/ui/equip-art.ts (derive them from the JSON like the skill-icon atlas fix in PR #60) so no neighbour cell bleeds in.
- Tests: a Vitest unit test for gearCell's mapping (every slot × tier, every set, every class weapon tier, boss items) and the existing equipment/forge/character browser tests; npm run typecheck, lint, npx vitest run, build.

DELIVERABLES: incoming/ART-UI-EQUIP-002/ (png sources, preview grid at 48/64/96 px with sample rarity frames, NOTES.md with the mapping table), the runtime atlas + JSON + code change, and two 390px screenshots for the owner (bag grid with mixed loot, character sheet with a full set worn). Then add the entry Codex owes Claude (AGENTS.md).
```

### C8 — ฉากเรื่องตามสถานที่ (Claude ตรวจเกม 2026-10-23)

ตอนนี้ฉากบทพูดมีแค่ 3 ฉากของแมพ 1 (`public/assets/story/story_awaken|rift|retreat.webp`) ฉากรับเข้าทีมทุกฉาก (ไลรา, ทหารรับจ้างที่รับสมัคร, ไอราที่บอสแมพ 1, การ์แรนที่แคมป์ป่า, เซเรนที่บอสแมพ 2) ใช้ฉาก "retreat" ของซากป้อมเหมือนกันหมด แม้จะอยู่ในป่า

```text
CODEX HANDOFF — ART-STORY-SCENES-002
Asterveil · Fateweave: story backdrops per place + wiring

Read AGENTS.md and CLAUDE.md first. Base branch feature/fateweave-initial-prototype; work branch codex/story-scenes-002; PR into the base branch (merge when CI passes). Original artwork only; nothing from Asterveil: Rise Beyond. Never use the word ม่านเวล; the group is the ค่ายทหารรับจ้าง.
READ FIRST: incoming/ART-STORY-PROLOGUE-001/ (approved story backdrop style, size and NOTES), public/assets/story/, src/ui/story-ui.ts (StoryScene, prologue/prologueEnd/recruitStory: every recruit scene is hard-coded to 'retreat'), src/ui/game-shell.ts (where scenes play), docs/LORE_CHAPTER1_TH.md (places and mood), src/content/world/chapter-ruins.ts / chapter-forest.ts / chapter1.ts (map ids).
ART (same painted style, framing and safe area for the bottom dialogue box as the prologue set; no characters baked in, no text):
1. camp_night — the commander's camp fire inside the ruined fort at night (recruitment of the first mercenaries, Lyra's join, Aira at the gate).
2. forest_camp — a lantern-lit camp in the deep forest (เส้นทางป่าทึบ; Garran's join).
3. forest_gate — the thorn lord's clearing before the boss fight (Seren's return).
4. rift_line — the violet rift front of แนวรอยแยก (map 3 scenes).
WIRING (UI only): add the four scenes to StoryScene and the story asset loading; recruitStory takes a scene argument; game-shell chooses it from the map and the moment (ruined-border: camp_night for the starter recruitment and the boss-start return; deep-forest: forest_camp at the camp, forest_gate at the boss; veil-frontier: rift_line); keep prologue scenes unchanged; fall back to 'retreat' if a scene is missing. Update the story browser tests (tests/browser/world.spec.ts story checks) and run npm run typecheck, lint, npx vitest run, build + those tests. Two 390px screenshots for the owner (starter recruitment scene, Seren's return in the forest). Then add the entry Codex owes Claude (AGENTS.md).
```

### C9 — เสียงประกอบจริง (รอเจ้าของตัดสิน)

ตอนนี้เสียงประกอบทั้งหมดเป็นเสียงสังเคราะห์ชั่วคราวจากโค้ด (`src/platform/sfx.ts` — เจ้าของเลือกไว้ 2026-10-16) ถ้าเจ้าของต้องการเสียงจริง (ดาบ เวท โล่ เดินบนแผนที่ ชนะ/แพ้ เปิดกล่อง) ให้ Claude เขียน prompt เพิ่ม — ยังไม่ต้องทำจนกว่าเจ้าของสั่ง

### C10 — หน้าสรุปผลหลังชนะศึก (done 2026-10-24; PR #63 and compact revision #64 merged; CI passed)

```text
CODEX HANDOFF — UI-BATTLE-REWARDS-001
Asterveil · Fateweave: victory rewards screen

Read AGENTS.md and CLAUDE.md first. Base branch feature/fateweave-initial-prototype; work branch codex/battle-rewards-001; open a PR into the base branch. UI only: no rule, resolver, content number or save-format changes. Never use the word ม่านเวล; the group is the ค่ายทหารรับจ้าง.

PROBLEM: after a victory the player only sees the small result-card in BattleUI (src/ui/battle-ui.ts, `result-card`: "ชนะแล้ว", standing count, team HP, command count) and, back on the map, one long text line built in GameShell.commitBattle (src/ui/game-shell.ts ~line 520: lootThai + item names + dust/tomes + expThai). The owner wants a proper rewards summary: what was gained and how much EXP each character got.

DATA (already computed, do not recompute): finishBattle returns `{ type: 'victory', kind, loot: Resources, exp?: Record<heroId, ExpGain{gained, percent, level, levelsUp}>, item?, items?, dust?, tomes?, riftCore? }` (src/core/world/types.ts). EXP before the fight comes from the pre-finish state (next.members[id] before finishBattle) so bars can fill from old to new value; level thresholds via the existing EXP helpers used by the character sheet (src/ui/character-metrics.ts / character-view.ts EXP bar).

BUILD: a victory rewards panel shown once after the battle result, before returning to the map (replaces the long text line; keep a short map message such as "ชนะศึก"):
1. Header by kind: ชนะศึก / ท้าสู้อีลิทสำเร็จ / มินิบอสล้มแล้ว / {bossName}ล้มแล้ว.
2. EXP per brought member: portrait (src/ui/portraits.ts), name, Lv, "+N EXP", an EXP bar animating from old to new (reduced motion: no animation), a "เลเวลอัป! Lv X" badge when levelsUp > 0, and a small note when percent < 100 ("ได้ EXP น้อยลงเพราะเลเวลสูงกว่าศัตรู"). Downed members still show what they received.
3. Items: cards with gear art (src/ui/equip-art.ts gearArt), itemName, Lv and rarity colour (rarityText); tap for the existing item description if one exists.
4. Resources: ore, gold, star dust, tomes, rift core, each with its existing icon; hide zeros.
5. One primary button "ไปต่อ →" (≥44px, focused, Enter/Escape close). It must never commit anything: the battle is already saved by commitBattle before the panel opens; closing only dismisses. Reload while it is open must not duplicate rewards (it simply does not reappear).
Use the approved navy-glass style (src/ui/tokens.css, components.css, incoming/ART-UI-MODERN-001 as reference), the portrait frame rules (@container game, 390px phone first) and DOM text, not canvas. Defeat/wipe keeps the current flow (the run summary in summary-ui.ts already covers wipes). Tutorial victory keeps the story flow (show the panel after it or skip it — state which).

TESTS: a Playwright test in tests/browser/ that wins a fight and checks the panel lists every brought member with +EXP, shows a level-up badge when one happens, shows items/resources, and that closing returns to the map with the same save; update any existing test that read the old map message text. Run npm run typecheck, lint, npx vitest run, build and the touched browser specs. Two 390px screenshots for the owner (normal win with an item, a level-up). Then add the entry Codex owes Claude (AGENTS.md) and merge when CI passes.
```

### ~~C11~~ — ปรับสกิลตามผลตรวจ (เสร็จ 2026-10-24 · PR #66 merged)

งานกฎ/เซฟ/สมดุล: เจ้าของอนุญาต 2026-10-24 ให้ Codex merge เองเมื่อผ่านทุกการตรวจ และดูแลสมดุลทั้งหมดเอง Claude ตรวจย้อนหลังหลัง Usage รีเซ็ต

```text
CODEX HANDOFF — RULES-SKILL-AUDIT-001
Asterveil · Fateweave: implement the approved skill audit

Read AGENTS.md, CLAUDE.md (development rules 1–6, save/encounter versioning), docs/design/SKILL_AUDIT_TH.md (the spec — owner approved 2026-10-24), docs/MASTER_PLAN_TH.md A6b (one owner class per mechanic, no elements, every character playable) and docs/design/SKILL_TREES_ALL_TH.md and docs/design/LOGIC_AUDIT_2026-10-24_TH.md (also fix its items 1–3 in this PR; magical skills now scale with Magic Power — keep that for every new or changed skill) first. Base branch feature/fateweave-initial-prototype; work branch codex/skill-audit-001; open a PR into the base branch. This changes rules and saves. The owner authorized you (2026-10-24) to own the whole balance pass and to merge it yourself once every check below passes; Claude reviews afterwards. Never use the word ม่านเวล; the group is the ค่ายทหารรับจ้าง.

GOAL: every ❌ (16) and ⚠ (7) row in SKILL_AUDIT_TH.md section 2 becomes its "ข้อเสนอ" column, so each mechanic group in section 1 has exactly one owner class. Where the proposal offers two options, take the first. Keep node/skill ids when only the effect changes (painted icons use the ids); give a new id only when the old one would lie, and list every id change in the PR.

WHERE: src/core/battle (types.ts ActionId/caps/state, engine.ts resolution, preview uses the same resolver — never duplicate arithmetic), src/content/encounters/veil-siege.ts (skill definitions, cooldowns), src/content/heroes/talents.ts (tree nodes, mods/caps), src/ui/th.ts (Thai names, descriptions, capText — descriptions must state the real numbers and conditions), src/ui/battle-status.ts, battle-playback.ts, tutorial.ts (advisor must not recommend removed effects), src/ui/icons.ts. Pure resolver: no Phaser/browser, no clocks or random damage. Draft numbers: pick values near the existing ones (e.g. damage-reduction 20–30%, bonuses +50% as written) and validate them by simulation.

SAVE/VERSIONS: bump SAVE_VERSION 41 → 42 in src/core/save/expedition-save.ts (v41 = Magic Power, PR #65); for every class whose tree nodes changed meaning, refund that class's tree points on load (follow migrateTrees / RECRUIT_TREES); drop the commands of an in-progress battle that used a changed skill (see how v40 handled haste) or settle it safely; bump EncounterDefinition.version of every encounter whose rules change (src/content/encounters/catalog.ts and siblings) so old battle saves are rejected safely. Update every test that expects version 41.

TESTS: unit tests for each changed skill (effect, boundary, preview equals resolution, deterministic replay, cooldown), the save migration (v41 save with spent points loads with a refund), and keep the existing suites green (balance regression, talents, recruit-trees-engine, battle). Update browser specs that use changed skills (grep tests/browser for each skill id). Run npm run typecheck, npm run lint, npm test, npm run build, the touched browser specs, and npm run sim.

REPORT: in the PR and in docs/handoffs/CODEX-TO-CLAUDE.md (under "ฝากถึง Claude"): a table per changed skill (old → new, id kept/changed, numbers), sim before/after (docs/validation/balance-sim/*.md: campaign clear rates maps 1–3 + hard, TREES.md use counts per tree skill — every changed skill should now be used, e.g. Sefa's shadow build was 2/10), and the open questions. Balance is yours: tune the draft numbers of changed skills, trees and, if needed, encounter strength until the sim targets hold — every map 1–3 first-run clear rate and hard mode no worse than before, no class or tree build left unused or dominant, the balance regression suite green — and report every number you changed. FUTURE CLASSES (owner 2026-10-24: balance must cover all 15 classes and all 30 characters of MASTER_PLAN A6b): the five new classes and the second character of each class are not in the code yet, so they cannot be simulated in this PR. Prepare for them: (1) keep their mechanic groups free — no existing skill may take enemy-intent redirection onto another foe or shifting an enemy's intent cycle (โหราจารย์), a self-built combo resource (นักมวย), end-of-round curse damage or damage-on-act (นักสาป), damage converted to ally healing (นักบุญรบ), or cooldown refunds for allies (นักเต้นรำ); add these five rows to SKILL_AUDIT_TH.md section 1 as reserved. (2) Make the sim data-driven per class and per character (no hard-coded class lists), and add a per-character check: every playable character, built to the map's level with its best tree build, in a standard team of four, clears maps 1–3 within the target rate, and no character's win rate or HP left is far above the rest. Then each new class/character later only adds data and must pass the same check before release. Mark SKILL_AUDIT_TH.md rows as implemented. Merge the PR when typecheck, lint, unit tests, build, browser specs, CI and the sim targets all pass; if a target cannot be met, merge only what passes and write the remaining gap under "ฝากถึง Claude".
```

### C11 — สถานะ 2026-10-24 (ประวัติก่อน Codex ทำเสร็จ)

> C11 ปิดแล้วด้วย PR #66 merge `abf10a8`; ข้อความส่งต่อด้านล่างเป็นประวัติ ผลทดสอบจบงานอยู่ในหัวข้อ C11 — ผลจบงาน ถัดไป

ยังไม่มี C11 ที่ไหนก่อนหน้านี้ Claude เปิดสาขา `codex/skill-audit-001` จาก f56d2fb และ push คอมมิตเริ่มต้น 600683f (แก้ `src/core/battle/types.ts` เท่านั้น ยังไม่ผ่าน typecheck) แล้วหยุดตามที่เจ้าของสั่ง Codex ทำต่อด้วย prompt ข้างล่าง (ใช้แทน prompt C11 เดิม แต่ทุกข้อของเดิมยังมีผล)

```text
CODEX HANDOFF — RULES-SKILL-AUDIT-001 (continue)
Continue C11 on the existing branch codex/skill-audit-001 (head 600683f, based on f56d2fb). Do not start a new branch. All of the C11 prompt above still applies (spec, save v41 → v42, tree refunds, encounter versions, tests, sim, balance ownership, reserved rows, data-driven per-character sim, merge when everything passes). C12 stays blocked until this is merged.

ALREADY DONE in 600683f (types only, resolver not wired, typecheck fails until you finish): TalentCap renames valorbanner → rallybanner, sigildelay → sigilward, spellnote → songnote; HeroState.renew; EnemyState.delayedAlso and drawnBy; Intent.stoned (held/decoyed removed); guard.all; BattleState.bulwark (taunt.reduction and banner removed), song.since, warcry, stone.round (decoy state removed). Keep or change these as you see fit.

DESIGN DECISIONS Claude had made (follow unless the sim says otherwise; record any change):
- Knight: bulwark keeps id, becomes กำแพงโล่ — front-lane allies take power% less until his next turn (60 is too strong for a row; start ~30), no pull. rouse keeps id, becomes ยืนเคียงข้าง — targetKind self; the lowest-HP-ratio other standing ally is guarded (guard.all, guard reduction) until his next turn; power 0 (utility). Node c2v cap rallybanner — rally covers two hits per ally (list each id twice, remove one per hit); remove the valor banner code.
- Duelist sweep: after the hits, mark the lowest-HP standing foe it hit.
- Mage dispel: also clears a boss's steadyRound. sigilward (proposal option 2, because option 1 "next move weaker" belongs to the alchemist): a seal that lands gives a barrier (cap amount, ~10) to the hero that move aimed at.
- Priest bless keeps id, becomes พรต่อเนื่อง — any standing ally gains renew {amount = power, until = round+2}; heal at each new round start; make it a Magic Power support skill (remove from PERCENT_SKILLS/PERCENT_LEVELS, add to SUPPORT_SKILLS), power ~8.
- Spear hold = ทวนคุ้มหลัง: no redirect; he counters every physical hit on a back-lane ally until his next turn (brace power); holdfirm = back-lane allies take holdfirm% less physical during hold; holdcounter = hold counters +50%; unyielding stays. halt: +50% if the target's next move is physical (no queue change). warcry = เสียงศึก: listed front-lane allies each counter their first physical hit until his next turn, damage = warcry power as a physical skill (~8; remove from percent lists).
- Archer disengage = ยิงถอยคิว: hit, then the target moves to the end of this round's queue if it has not acted; quickstep also delays it next round; covershot = +amount damage when the target's next move aims at an ally. heavyhinder: hinder delays round+1 and round+2 (delayedAlso), no weaken; hunter/weakshot/track read either round.
- Scout backstab: no target restriction, + ambush bonus when the target has not acted this round. decoy keeps id, becomes เงาคุ้มกัน — gives shadow step (evading) to another standing ally. disarm = ปาดตัดหน้า: ×1.6 damage when the target has not acted this round and its next move aims at an ally other than her; remove DISARM_PERCENT.
- Warden slam: + rules.quakeBonus when the target's next move aims at him. quake: front-row area hit (targetKind enemies, front row else all), no condition; skyhammer: quake heals him a small amount per foe hit (no queue delay). guardstone = ศิลาดึง: the first move aimed at each covered ally (until his next turn) turns to him (intent.stoned) and is cut by power% (twinstone two allies, thickstone larger cut), he heals GUARD_STONE_HEAL when it holds. tremor: front foes take damage and their next move aims at him (drawnBy), no weaken.
- Bard dread: power 15, finale of dread gives every ally a barrier (~10) instead of weakening. note: + per round the song has played continuously (song.since; e.g. +3 per round, max 3 rounds). songnote: a note while a song plays hits +amount%.
- Alchemist bomb: description only (state the corroded bonus).
- Also update every UI place that read removed state (battle-status, battle-playback, th.ts event texts, tutorial advisor, character-metrics) and LOGIC_AUDIT items 1–3 (metric labels by effect type, bulwark metric via skillPower, block Aegis when no standing ally would gain barrier).
BASELINE: regenerate the "before" sim numbers from f56d2fb in a separate worktree (Claude's baseline run was local only).
```

### C11 — ผลจบงาน 2026-10-24 (Codex)

- PR #66 https://github.com/wnau34-nptrn/asterveil-fateweave/pull/66 · merge `abf10a8256e04040aa2b509bc6e5aa7c27c7654d` → `feature/fateweave-initial-prototype` · save v42 · 10 playable classes/characters (C12 not started).
- typecheck/lint/unit 795/build/Pages build ผ่าน; browser CI 242 ผ่าน; exact-code sim 26 checks ผ่าน; no-regression gate 20 cells ผ่าน. ทุกตัว × แมพ 1–3 เคลียร์ 12/12 seeds ในเงื่อนไขมาตรฐานที่ระบุไว้
- ก่อน/หลังและทุกตัวเลข: `docs/validation/balance-sim/C11.md`, `c11-before/`, `CAMPAIGN.md`, `TREES.md` (usage + ablation), `CHARACTERS.md` (build per character/map). บันทึกข้อจำกัด/ฝากถึง Claude ใน `CODEX-TO-CLAUDE.md` แล้ว ไม่มี C11 acceptance gap ค้าง
- เงื่อนไขเริ่ม C12 เรื่อง C11 merge สำเร็จแล้ว แต่งานนี้ไม่ได้เริ่ม C12

### C12 — ครบ 15 อาชีพ 30 ตัว (เจ้าของสั่ง 2026-10-24: "ให้ codex ทำให้หมดเลย")

เริ่มหลัง C11 merge แล้ว · Codex ออกแบบ ลงโค้ด จูนสมดุล และ merge เองทีละชุด Claude ตรวจย้อนหลัง

- [x] Phase 1 (ออกแบบ 2026-10-24; merged PR #67 2026-10-25, `0b0f649`, quality CI ผ่าน): ออกแบบ `docs/design/ROSTER_30_TH.md` — 15 เจ้าของกลไก, 5 ต้นไม้ × 16 โหนด, 30 ตัว/กิ่งประจำตัว, กฎขอบเขต/เซฟ/sim/ภาพ และลำดับ 5 batch; เอกสารเท่านั้น ไม่อ้างว่าตัวใหม่เล่นได้แล้ว
- [x] Batch 1: นักบุญรบ + นักเต้นรำ 4 ตัว / กิ่ง p / เซฟ v43 — PR #68 merged 2026-10-25 (`24dfefb`), unit 838 / browser 244 / sim 28 / campaign gate 20 cells ผ่าน ดู `docs/validation/roster-30/batch-1/README.md`
- [ ] Batch 2: นักมวย + นักสาป
- [ ] Batch 3: โหราจารย์
- [ ] Batch 4–5: ตัวที่สองของสิบอาชีพเดิมและกิ่ง p คู่เดิม


```text
CODEX HANDOFF — ROSTER-30-001
Asterveil · Fateweave: 15 classes × 2 unique characters — design, build and balance

Start only after C11 (RULES-SKILL-AUDIT-001) is merged. Read AGENTS.md, CLAUDE.md, docs/MASTER_PLAN_TH.md A6b (owner rules: 15 classes × 2 characters, no element system, every character playable and worth raising, class mechanics never overlap, new characters are different, not stronger), docs/design/SKILL_AUDIT_TH.md (mechanic-owner table incl. the five reserved rows), docs/design/SKILL_TREES_ALL_TH.md, docs/EXPEDITION_DESIGN.md (roster rules: ★1 start, duplicates upgrade, roster 4+4), incoming/ART-CHAR-CLASS-NEW-001/ (five new class concepts, PR #61). The owner authorized you (2026-10-24) to design, implement, balance and merge all of it yourself, batch by batch; Claude reviews afterwards. Base branch feature/fateweave-initial-prototype; one branch + PR per phase/batch (codex/roster-30-<n>). Original work only; nothing from Asterveil: Rise Beyond. Never use ม่านเวล; the group is the ค่ายทหารรับจ้าง.

PHASE 1 — DESIGN (docs only, merge when git diff --check passes): write docs/design/ROSTER_30_TH.md:
- the full mechanic-owner table for 15 classes (existing 10 after C11 + โหราจารย์, นักมวย, นักสาป, นักบุญรบ, นักเต้นรำ as in A6b); every mechanic group has exactly one owner; list what each class must never do;
- for each new class: lane, base stats near existing ranges, 3 starting actions, a big tree in the existing format (src/content/heroes/talents.ts: branches a/b/c, tiers 1–4, choice pairs, 16 nodes) that unlocks/modifies skills inside its own mechanic;
- for each of the 30 characters (the 10 existing heroes + recruits keep their identities; fill each class to two): name (Thai-friendly, original), class, how they join (story recruit / prologue draft pool / hiring board, keep story recruits as they are), personal signature skill or passive and a personal tree branch so the two characters of one class play differently (MASTER_PLAN A6b line on the second character), and one line of personality/lore that fits docs/LORE_CHAPTER1_TH.md;
- the batch order (suggested: batch 1 นักบุญรบ + นักเต้นรำ, batch 2 นักมวย + นักสาป, batch 3 โหราจารย์, batch 4–5 the second characters of the old classes) and which art each batch needs.

PHASE 2+ — BUILD, one batch per PR:
- rules first in the pure resolver (src/core/battle types/engine; preview = resolution, deterministic replay, no Phaser/clocks/random damage), content in src/content (heroes/mercenaries.ts or a new roster file, encounters/veil-siege.ts skill definitions, talents.ts trees), then UI: src/ui/th.ts names/descriptions with real numbers, battle-status.ts, battle-playback.ts, icons.ts, tutorial.ts advisor, hiring board/roster/character sheet, portraits;
- art: production unit sprites (512px, same chibi style and pivot footY=496 as runtime units), portraits, skill icons and basic VFX cues for every new character. For the five new classes use the option the owner picked in PR #61; if the owner has not picked when you reach that batch, use option A and note it (art is data and can be swapped). Second characters need new original concepts + production art in the same style;
- saves: bump SAVE_VERSION (src/core/save/expedition-save.ts) whenever saved data or rule meaning changes, migrate old saves safely (new heroes simply absent; refund trees only where nodes changed), bump EncounterDefinition.version when encounter rules change;
- tests: unit tests per new skill/passive/tree node (effect, boundary, cooldown, preview equality, replay), save migration, recruit/hire flow, browser specs for the new UI; npm run typecheck, lint, npm test, build, touched browser specs, npm run sim.
- balance (yours): the data-driven per-character check from C11 must hold for every playable character after each batch — built to the map's level with its best tree build in a standard team of four it clears maps 1–3 at the target rate; no character, class or build far above or below the rest; existing campaign and hard-mode clear rates no worse than before. Tune numbers until it holds and list every number you changed.
- merge each batch PR when all checks, CI and the balance check pass; otherwise merge only what passes and record the gap.

REPORT after every batch in docs/handoffs/CODEX-TO-CLAUDE.md (per character: kit, tree, sim numbers, art used, open questions under "ฝากถึง Claude"), update MASTER_PLAN A6b status, CLAUDE.md systems index (save version, class count) and two 390px screenshots per batch for the owner (character sheet + a battle using the new skills).
```

## เมื่อ Usage ของ Claude รีเซ็ต (หลัง พ. 28 ต.ค. 19:00)

เปิดแชตใหม่ (Opus) แล้ววาง:

```text
ทำงานต่อในรีโป wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype
อ่าน docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md, docs/handoffs/CODEX-TO-CLAUDE.md, docs/handoffs/NEW-CHAT-HANDOFF-TH.md และ CLAUDE.md ก่อน
แล้วตรวจงานที่ Codex ทำระหว่างนี้ (PR และ commit บนสาขาเกม): รันเทสต์ ดูภาพ แก้สิ่งที่ผิดกติกา รับภาพที่ค้างเข้าเกม ตรวจก่อน push ตาม CLAUDE.md ตอบเป็นภาษาไทย
```

## ฝากถึง Claude (Codex เขียนต่อท้าย)

- 2026-10-27 C5.3: `src/content/encounters/veil-siege.ts` มีcommentเก่าว่าRouseฮีล แต่engineปัจจุบันสร้างguard/all เลือกเพื่อนHP ratioต่ำสุด งานภาพยึดengine ไม่แก้rules/save/balance/content โปรดตรวจcommentแยกเมื่อแก้เอกสารกลไก ไม่ใช่คำขอเปลี่ยนRouseเป็นheal

- 2026-10-25: P00–P02/P04/P06 in `docs/DEVELOPMENT_PLAN_TH.md` will affect battle/save/balance when implemented. This task only documents those impacts: shared Lv/EXP, actor capacity, talent entitlement and migrations need one coherent specification before code changes. No rule changes were made as part of publishing the plan.


- 2026-10-24: เจ้าของถามหาจุดไม่สมเหตุผลอื่น (ยังไม่ได้สั่งแก้) ดู `docs/design/LOGIC_AUDIT_2026-10-24_TH.md`: ฝากพิจารณา Aegis ที่ใช้ได้แต่ไม่เพิ่มโล่, Heal ที่เลือกคนเลือดเต็มไม่ได้แม้มี Afterglow และ Revive อัปเลเวลแล้วเพิ่มโล่ผู้ใช้แทน HP ที่ชุบ ห้ามถือว่าข้อสังเกตเหล่านี้เป็นการอนุมัติเปลี่ยนกติกา; จุด UI แสดงหน่วย/scaling ผิดและ Bulwark ไม่รวมเลเวลเป็นข้อบกพร่องที่ยืนยันแล้ว

## Unit animation pilot — owner visual approval 2026-10-26

เจ้าของให้ผ่าน Lyra/Vargoth Hunter ทั้งภาพและท่า และอนุญาตนำเข้าเกมจริง โดยขอช้าลงนิดเดียว ปรับคืนท่า sprite 240→260ms และ ease frame cadence เล็กน้อย คง contact/end เดิม นี่คือการอนุมัติคู่ pilot ของ PR #74 ไม่ใช่การอนุมัติ C5 blade VFX หรือขยายทุกยูนิต
