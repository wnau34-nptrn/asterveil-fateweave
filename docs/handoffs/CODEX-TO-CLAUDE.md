## 2026-11-09 — Gacha G00/G01 analysis
- PR #211 merged `3174b5a` into `feature/fateweave-initial-prototype`; topic `docs/gacha-g00-g01-analysis`. Owner requested analysis/simulation/docs only; rates and all numeric proposals remain draft.
- G00 decision sheet + G01 actual-source ore/gold/free acquisition audit + migration/trust/P09 readiness; CURRENT_STATE updated. Evidence: `docs/validation/gacha-g00-g01-2026-11-09/README_TH.md`.
- 33 cases × 4,000 accounts × 365 days, seed20261109; source/input hashes, median/P90/P99, population censoring, favorite/collection, paid30d, veteran/returner, hoarding/growth sensitivities.
- 80/96 favorite from account start: ★5 median11/P9016 visits; after acquisition8/9; starting favorite9/9. Thin income23/40; no farm30/38. These are basket simulations, not real playtest pacing.
- Validation passed: model self-check/full-run assertions, original TypeScript board/roll comparison20 seed/return pairs, deterministic rerun, 28/30-day budgets, ore negative control, generated-table repeat, links/source hashes/context sizes/diff checks.
- PR quality (lint/unit/build) passed before merge; browser workflow not triggered by docs-only path filter. No runtime/rules/save/balance/P09/payment changes; no human/device results claimed.
- Open owner choices: 80 vs100 trial, OD-07 timing/early favorite access, absent-mode budget, universal/overflow/story compensation, legacy/account trust. Questions sent to “ฝากถึง Claude”; do not start G02/P09/G03/G04/G05 automatically.

## 2026-11-09 — Skill popup proportions
- PR #210 merged (`b1d1d42`); owner requested smaller upgrade button and balanced popup typography.
- Scoped popup CSS: compact header/body spacing, explicit inline-flex icon/text alignment, 14px upgrade label/18px icon, 44px touch targets; secondary link wraps at 13px.
- No gameplay/save/balance changes. Build/lint passed; context checks 8/8; popup browser checks 5/5 including long Sigil text at 390px.
- Remote quality and all four browser shards plus aggregate passed before merge; existing workflow handles publication.

## 2026-11-08 — Next-chat handoff for gacha G00/G01
- Owner selected the first step in a new chat; prepared `docs/handoffs/GACHA-G00-G01-NEXT-CHAT-TH.md` and updated CURRENT_STATE next scope/opening prompt.
- Begin decisions/economy with actual ore/gold/free-acquisition/legacy-account inputs;80/96 and rates remain drafts, not approved production config.
- No runtime/rules/save/balance/P09/payment changes authorized by this analysis handoff; no game files changed.
- Starting reference: PR #209 merge0fb8d8c + notes1b2ea1a; branch `docs/gacha-g00-g01-next-chat`; validation: content/link/diff checks and agent-context.
- Automatic new-chat creation unavailable in this session; provide copy-ready launch prompt rather than claiming a new session exists.

## 2026-11-08 — Gacha80 proposal and development plan (docs only)
- PR #209 merged `0fb8d8c` after quality passed (browser gate not triggered: docs only); branch `docs/gacha-80-economy-development-plan`; owner requested revised recommendations, development plan and GitHub storage, not game implementation.
- Recommended test baseline80 exchange/80–96 free tickets per28d;100 alternative; rates,SR convention,shards and paid packs remain draft.
- Added proposal, G00–G08 dependency/acceptance plan and reproducible8,000×12-case/365-day Monte Carlo evidence; old30-point results are reference only.
- Linked P10 without marking P04/P09/P10 complete; sent save/balance/trust-boundary questions under ฝากถึง Claude.
- No runtime/rules/save/content/balance/hosting changes; no supplied artwork imported. Validation passed: doc links/arithmetic/model sanity, context limits8/8, diff checks, and CI lint/unit/build.
- Next: await owner scope; suggested G00/G01 before live pulls or payments. Files: `docs/design/GACHA_80_PROPOSAL_TH.md`, `GACHA_DEVELOPMENT_PLAN_TH.md`; evidence `docs/validation/gacha-economy-80-2026-11-08/`.

## 2026-11-08 — Skill popup + continuous enhancement
- PR #208 merged `117a0d4`; branch `codex/skill-popup-continuous-enhancement`; quality + all 4 browser shards/aggregate passed.
- Owner approved both changes and integration: “อนุมัติ เอาเข้าเกมได้”.
- Native node modal keeps details, points and explicit 1-point upgrade visible; X/Escape/backdrop restore tree focus/scroll.
- Enhancement commits one displayed step per click and prepares the next immediately with fresh costs/resources and stale/duplicate/repeat guards.
- Other forge services and rules/save/content/balance unchanged.
- Local build/typecheck/lint, 50 focused browser cases and 8 boundary unit tests passed. Full unit's boss timeout passed separately in 110.28s; full CI quality passed.
- Evidence: `docs/validation/skill-popup-continuous-enhancement/README_TH.md`; real-device Safari remains unverified. Await owner's next task.

## 2026-11-08 — ART-UI-TITLE-PARTY-001
- PR #207 merged `4ea37ca` after quality + all browser shards/aggregate passed; owner approved integration: “เอาเข้าเกม”.
- Clean background plate derived from approved artwork; real logo, start/continue controls and saved-game summary retained.
- Fixed portrait framing avoids drift cropping edge characters; existing ambient rays/motes and reduced-motion preserved.
- Source/concept retained in `incoming/ART-UI-TITLE-PARTY-001/`; no rules/save/balance changes.
- Pages build/typecheck/lint passed; portrait browser 5/5 passed; unit 1,662 passed + 6 skipped. Evidence: `docs/validation/title-party/README_TH.md`; real-device Safari unverified.

## 2026-11-08 — ART-UI-AEGIS-APPICON-002
- Branch `codex/aegis-app-icon`; PR #206 merged `55d58b7` after quality + all browser shards/aggregate passed. Owner approved integration: “เอาเข้าเกมได้”.
- Preserved approved original; resized 32/180/192/512px PNGs, replaced old SVG favicon precedence, versioned icon/manifest URLs.
- PWA purpose is `any`: source has baked rounded corners and is not an adaptive-maskable composition.
- No gameplay/rules/save changes. Pages build/typecheck/lint passed; unit 1,662 passed + 6 skipped; built PNG decoding and manifest/base-path references passed.
- iOS installed shortcuts may need removal/re-add; actual device not tested.
- Deployment follow-up: final docs exceeded CURRENT_STATE 6000-byte gate by 65 bytes; shortened task line and reran agent-context before pushing.

## 2026-11-08 — TEAM-FORMATION-EDITOR-002
- Branch `codex/team-formation-preset-layout`; Merged PR #205 into the game branch, merge `7c401617eb232497339de979ab027ae37a3f008a`, after quality + all browser shards/aggregate passed.
- Owner approved formation-first mockup: remove duplicate field strip, place reserves/camp members on the plan, save exact team as preset explicitly.
- One selection for diagram/roster, atomic group+lane UI adapter, existing world validators and save/preset schema unchanged.
- Native preset dialog: choose slot/name, explicit overwrite, rename/clear preserved, Escape/focus/rotation gates.
- Keep scout NPC greeting below the top formation. Map/battle UI unchanged.
- Local typecheck/lint/build passed; unit 1,662 passed + 6 skipped, focused browser 23/23 + compatibility 8/8 passed. Full CI quality + browser passed.
- Evidence and actual 390px screenshots: `docs/validation/team-formation-editor/README_TH.md`.
- No battle/save/balance changes; real-device Safari remains unverified. P09 stays on hold.

## 2026-11-08 — CAMP-HUD-CHARACTER-QUEST-001
+- Branch `codex/camp-hud-character-quest-layout`; Merged PR #204 into the game branch, merge `deb193f3b967cedade82f063c1e9efd623ba1f76`, after quality + all four browser shards/aggregate passed. Owner explicitly approved push/PR/merge/deploy after the initial automatic-review block.
+- เจ้าของอนุมัติ mockup: HUD/ปุ่มกระดานโปร่ง; รายการเควสต์ทึบ กระชับ กดดูรายละเอียดเต็ม
+- ค่าย: ฟาร์มย้ายขึ้น HUD; แถบล่าง ทีม/ตัวละคร/จ้าง/กระเป๋า/ช่าง/ยา; ตัวละครเปิดคน/แท็บล่าสุดตรง ไม่ผ่านทีม
+- ทีมตัดส่วนพัฒนา/เลเวลค่ายซ้ำออก; เควสต์ใช้ native disclosure และปุ่มรับเดิม
+- Rules/save/balance/unlock pacing unchanged; no new daily quests or farming mechanics.
+- Validation: typecheck/lint/build passed; 1,656 unit tests + isolated boss-balance retry passed (first attempt timed out). Browser 29/29 + existing camp/quest compatibility 12/12 passed; context 8/8 passed.
+- Evidence: `docs/validation/camp-hud-layout/README_TH.md` (actual 390px game screenshots).
+- CI follow-up: preserve scout greeting when team opens via NPC; direct Team stays compact. Commander identity assertion includes camp level; focused regression 2/2 passed. Full CI quality + browser passed after the fix.
- Open: real Safari/device feel remains unverified; P09 stays on hold.

## 2026-11-07 — MAP-TEAM-CHARACTER-TABS-001
- Owner approved separate map team, one-tap carried-only presets, primary tree tab and no development tab on MAP.
- Merged PR #203 (`codex/map-team-character-tabs` → game branch), merge `ae8889c4997ec69b28527235d899f73d94233b2c`, after quality + browser success.
- HUD goals/team/bag share one row; T team / B bag; team dialog preserves camp-only preset saving, missing-member feedback and current-plan status.
- MAP character = overview/gear/skills/talents; camp adds development. No duplicate development links; skill-level/tome services stay camp-only.
- Reuses existing roster/preset/formation/talent commands; no battle/save/balance/capacity/art changes or P09.
- Local full unit 1,657 passed/6 skipped, focused unit 30 passed; new browser/regressions and 5 corrected tab/focus/scroll cases passed. CI quality + browser 4 shards/aggregate passed.
- Evidence and 390px screenshots: `docs/validation/map-team-character-tabs/README_TH.md`; next task awaits owner.

## 2026-11-07 — SYSTEM-UNLOCK-PACING-002
- Owner approved the recommended pacing: quests after MAP 1; hiring/market/hunt after MAP 2; other current services stay at their existing MAP 1/2/3 milestones.
- Merged PR #202 (`codex/system-unlock-pacing-002` → game branch), merge `f05754cc3de006613d9019382c4472c063b470ce`, after quality + browser passed.
- Explicit MAP 3 thresholds preserve advanced-service availability when future maps are added; old A3 table remains historical, linked to the new decision.
- Quest board retains progress/rewards/claim-once and adds preparation guidance; guides remain one at a time, hire guide follows MAP 2.
- Local full unit 1,657 passed/6 skipped; focused regressions + 4 browser tests passed; CI quality + browser (4 shards/aggregate) passed. Old world.spec assertion MAP 3→2 fixed.
- No battle/save format/balance/reward/cost/slot changes, parked recruits still parked; no future systems or P09.
- Evidence: `docs/validation/system-unlock-pacing/README_TH.md`; next task awaits owner.

## 2026-11-07 — SYSTEM-UNLOCK-AUDIT-001
- Merged PR #201 (`codex/system-unlock-audit-001` → `feature/fateweave-initial-prototype`), merge `2d7f35d1dd5cddcde89f63e227c7a9fce9fb6257`, after quality + browser success.
- Owner: camp team opens after MAP 1; changed shared threshold 3→1, so UI lock and reserve guide follow it automatically.
- Pure team operations keep existing roster/lane/capacity checks; no battle/save format/balance/art/P09 changes.
- Non-veteran regressions cover settlement outcomes, M2 entry/M1 replay, save load, field/reserve/formation/preset and one-time guide claims.
- Typecheck/lint/build and CI quality + browser passed; local related browser 19/19. Full local unit: 1,653 pass, boss simulation timeout; isolated unchanged retry passed in 149s.
- Audit distinguishes approved milestones, latest-built-map fallback and proposals for campaign guards in pure services; other gates unchanged.
- Evidence and open proposals: `docs/validation/system-unlock-audit/README_TH.md`; next task awaits owner selection.

## 2026-11-07 — Handoff: SYSTEM-UNLOCK-AUDIT-001
- Owner requested the next chat audit current system unlocks; camp team must work after clearing MAP 1.
- Handoff: `docs/handoffs/SYSTEM-UNLOCK-AUDIT-TH.md`; updated CURRENT_STATE priority and opening prompt.
- Verified `rules.ts` still sets team=3; traced featureMap/featureOpen and lobby locked panel; veteran bypass must be excluded from fresh-profile reproduction.
- Scope next chat: audit actual systems, fix confirmed availability/UI/core guard/guide mismatches, preserve saves and battle/balance rules.
- This task changes documentation only; no runtime gate fix. Checks: content review and `git diff --check`.
- No chat/session creation tool is available here; supplied a ready-to-paste opening prompt instead of claiming a new chat exists.

## 2026-11-07 — Owner-authorized merge of PR #200
- Merged `art/art-vfx-rework-001` into `feature/fateweave-initial-prototype`; merge commit `ff9274e73989b6bdf5af520ac7099793edb7a998`.
- Owner instruction: "ทำการ Merge เข้าเกมได้ของ PR #200". This authorizes this PR's merge; no broader animation approvals inferred.
- Verified latest head `01c97ab`: quality + browser both success; expected-head merge succeeded and PR is closed/merged.
- Updated CURRENT_STATE and validation status; docs-only follow-up checked with `git diff --check`. No new gameplay/art changes.
- Evidence: `docs/combat-presentation/vfx-rework-slice/README_TH.md`. Real-device/Safari validation remains unverified.

## 2026-11-07 — ART-VFX-REWORK-001 (Codex art + intake)
- PR #200 · Branch `art/art-vfx-rework-001` → `feature/fateweave-initial-prototype`; no merge (owner motion review pending).
- Generated poison/storm/shadow/arcane/clash layers, R1 drop + R2 fang; raw sources/prompts and lossless pipeline in `incoming/ART-VFX-REWORK-001/`.
- Event-only routing in visuals/BattleScene; no rules/save/content/balance/stage timing changes; fallback/reduced/fast retained.
- Validation, real 390px Chromium clips and test results: `docs/combat-presentation/vfx-rework-slice/README_TH.md`.
- Owner explicitly authorized Codex to make art and integrate in §31; R1 recommendation is Codex's choice, not owner approval.
- CI follow-up: legacy knives/evade ring assertions now verify the new painted layers; state/cleanup checks retained; same 571 source cases partitioned across 4 runners (disjoint union verified).
- Open: owner reviews motion; do not merge/publish automatically. Real mobile/Safari unverified.

# Codex → Claude handoff

Newest first. One entry per finished task, at most 12 lines; link a validation README for evidence instead of pasting run ids or logs. Write each entry only here. Older entries (to 2026-11-03) are preserved verbatim in [archive/2026-11-04/CODEX-TO-CLAUDE.md](archive/2026-11-04/CODEX-TO-CLAUDE.md) and those of 2026-11-04 in [archive/2026-11-06/CODEX-TO-CLAUDE.md](archive/2026-11-06/CODEX-TO-CLAUDE.md); move entries there when this file passes ~40 KB. Current state: [CURRENT_STATE.md](../../CURRENT_STATE.md).

## 2026-11-07 — Codex brief ART-VFX-REWORK-001 (motion review follow-up)

- Branch `claude/art-vfx-rework-brief`, docs only. After the 390px motion-review clips of the step 5–6 skills the owner said "ตามที่คุณแนะนำเลย อะไรต้องแก้ไข ขอ prompt codex"; no clip was approved individually.
- Added copy-ready brief §31 in `docs/handoffs/CODEX-ART-QUEUE-TH.md`: own effect layers for venom coat/stack/tick/burst+splash, blade storm (4 slash variants), shadow step hit + afterimage, Eira arcane charge/release, Kael clash. Semantics taken from engine events; no rule/save/number change.
- Checks: `git diff --check`. Open: Codex package → intake (`fateweave-art-intake`) → real 390px clips → owner verdict in their own words.

## 2026-11-07 — UI frame group 4: run summary + battle rewards (Claude, branch feature/ui-frame-group4)
- CSS only (`src/ui/sheet-frame.css`): header divider/left title on the summary, gold primary plate on "กลับค่าย"/"ไปต่อ", hud-edge borders; text sizes, content, order, button positions unchanged (summary return keeps 52px). No rules/save change. Closes the UI frame series (groups 1–4).
- Evidence + before/after 390×844, 390×650, 320×568: `docs/validation/ui-frame-group4-2026-11-07/README_TH.md` (ui-language-audit: font-size sets and <12px counts identical, no hscroll; Chromium headless only).
- Owner got the images before merge. Open: none new; next task is the owner's pick (CURRENT_STATE.md).

## 2026-11-06 — Team presets + easier team page (Claude, PR #196, save v56)
- เจ้าของสั่ง: preset สลับทั้งทีมแตะเดียว + หน้าจัดทีม "ทีมบน คลังล่าง" · research HSR/Genshin/FEH/Raid/SW/AFK/Pokémon → ตารางใน README
- กฎบริสุทธิ์ `core/world/presets.ts`: 4 ชุด (ร่าง) ชื่อ ≤12 · ค่าย = ใช้ภายในสำรองที่ปลดตามบท (เกินรอในค่าย), เลิกจ้างแล้วหลุดจากทุกชุด · แผนที่ = นอกศึก เฉพาะคนที่พามา ไม่มีใครเข้า/ออก · formation/fatigue/ศึกไม่เปลี่ยน; replay หลังใช้ชุดเท่ากับจัดมือ (เทสต์)
- เซฟ v56: `Profile.presets` (ทับ v55 ของ #193 ที่ merge ระหว่างทำ) · #195 Sefa อ้าง v56 เหมือนกัน → ตัวที่ merge หลังบวกเป็น v57 (แจ้ง session skill rework แล้ว)
- UI: ค่าย ชุดทีม → ลงสนาม → สำรอง → แผนการยืน → ตัวละครในค่าย → แถบตัวละคร; ปุ่มแตะเดียว ใส่ลงสนาม/สำรอง/พักในค่าย; กระเป๋าแผนที่มีแถวชุดทีม (ขาด/ล้ม/เหนื่อย)
- Tests: typecheck/lint/build, vitest 1641, Playwright ทีม/ค่าย/world 148 + team-presets.spec (Chromium) · ภาพ/README `docs/validation/team-presets-2026-11-06/README_TH.md` · ไม่ได้ลองอุปกรณ์จริง
- เปิด: เจ้าของยังไม่ได้ลองเล่นจริง; จำนวนชุด 4 เป็นร่าง

## 2026-11-06 — UI frame group 3: map + battle dialogs (Claude, PR #194 merged, owner approved images)
- เจ้าของสั่งทำทั้งชุดพร้อมกัน; แก้เฉพาะ CSS `src/ui/sheet-frame.css` (หัวหน้าต่างชิดซ้ายสีทอง 19px, ปิด 44px ที่ 333,11 = เท่าแผ่นบริการ; ปุ่ม primary แผ่นทองเดียวกัน, secondary เปลี่ยนแค่มุม) ครอบ goals/pack/info/camp+entrance+withdraw/event และ `#game-info`; ไม่แตะ HUD/เนื้อหา/กฎ/เซฟ
- วัด 390/320: ขนาดตัวอักษรเท่าเดิม, ไม่มีเลื่อนแนวนอน, เนื้อหาในหน้าต่างเลื่อนลง 1px (หัวสูงขึ้น 1px) ยกเว้น `#game-info` ลง ~4px; ปุ่มอื่นอยู่ที่เดิม
- Tests: world.spec + battle-shots (93 ผ่าน), ui-language-audit ก่อน/หลัง (เพิ่มภาพ 53a/53b ของ `#game-info`); ผลและภาพ `docs/validation/ui-frame-group3-2026-11-06/README_TH.md`
- เจ้าของอนุมัติภาพ; PR gate quality+browser ผ่านครบ → merge · ต่อไป: จัดทีม preset (session_014iPEcP6oUwVRPxyN3wu8Go) แล้วกรอบสรุป/รางวัล

## 2026-11-06/07 — Skill rework step 6: small fixes (Claude, PRs #191 #192 #193 #195 #198 merged; saves v53–v55, v57 Sefa, v58 Shadow Step)
- เจ้าของ "ตามที่คุณแนะนำ" + "ดำเนินการต่อได้" = การ์ดขั้น 6 ในหน้า artifact "ตรวจสกิล Fateweave" · เซฟ v53–v57 (หนึ่งเวอร์ชันต่อชุด, ศึกค้างที่ใช้สกิลที่เปลี่ยนเริ่มใหม่)
- v53 #191: ส่งไม้ Toma 50%, Aegis challenge ตี 10 + แค้นสะสม, rouse −20%, Seren sanctuary พรค้างทั้งศึก, bless 6+6 · bash ผลักท้ายคิว: วัดแล้วทีมเสียเลือด เจ้าของเลือกคงเดิม
- v54 #192: Kael storedfist ปะทะท่า, circlefist 1 ปราณ/เลือด 10% · Lio solo ×2 + โน้ต 6, finale +20%/รอบ
- v55 #193: Mira ยิงถอยหลัง/ศรตามรอยเด้ง, Eira เกราะผลึกสะท้อน/ปลดพลังเวท (ประจุจาก bolt), Brann slam แค้นสะสม · v56: Sefa พายุคม/เคลือบพิษ/ระเบิดพิษ
- หายเข้าเงา (การ์ด) ทำ campaign gate ตก → เจ้าของเลือก ก้าวเงา = ตี 8 + หลบ (v58, #198) และ gate แบบดูทั้งแคมเปญ (ช่องเสียได้ ≤1 ค่ายเมื่อทั้งกลุ่มไม่แย่ลง) · v56 = ชุดทีม #196 (session อื่น) ประสานเลขเซฟผ่าน send_message
- Tests ทุกชุด: typecheck/lint/unit ~1635, sim 28/28 (campaign gate), Playwright ที่เกี่ยวข้อง (Chromium) · ตัวเลขทั้งหมด README §9 `docs/validation/skill-rework-2026-11-05/README_TH.md`
- เปิด: challenge ยังไม่ถูกเลือกใน sim, rouse ΔHP −8.6, ความยากศัตรู (ถ้าเจ้าของต้องการ) เป็นงานแยก · เจ้าของยังไม่ได้ดูภาพในเกม

## 2026-11-06 — Skill rework step 5: Toma (Claude, PR #190 merged)
- เจ้าของ "ดำเนินการขั้นต่อไปได้" = การ์ด Toma ในหน้า artifact "ตรวจสกิล Fateweave" (ไม่มีโน้ตเจ้าของ) · เซฟ v52 (ศึกค้างที่ใช้ haste/smoke/catalyst เริ่มใหม่จากเลือดเข้า)
- กฎ: haste ส่งไม้ (`HeroState.baton` +20% การลงมือครั้งถัดไป: ดาเมจ/รักษา/โล่) · smoke บนเป้าติดกรด ลาม 20% ไปศัตรูข้าง ๆ · catalyst 6+8 ไม่ล้างกรด กระเด็น 50% ไปศัตรูข้าง ๆ · ศัตรูข้าง ๆ = ใกล้สุดซ้าย/ขวาในแถวเดียวกัน (`foeNeighbours`, Claude ตีความ)
- Sim 28/28 (TREES/CLASSES/CHARACTERS เปลี่ยนเฉพาะ Toma): catalyst 0→12 ครั้ง, haste ΔHP −7.8/−6.9 → −3.3/−6.0, นักปรุงยา 43→47% · Playwright alchemy-fx + unit-a4 91 ผ่าน (2 เคสจังหวะเวลาตกเมื่อรัน 3 workers ผ่านเมื่อ 1 worker)
- ถามเจ้าของ: ส่งไม้ 20% ยังไม่คุ้มเท่า Toma ตีเอง (ลอง 50% = ΔHP +1.5/+3.4) · advisor gate ทำ campaign gate ตก จึงไม่ใช้ · รายละเอียด README §8 `docs/validation/skill-rework-2026-11-05/README_TH.md`
- เปิด: ควันลามเกิดน้อยใน sim · เจ้าของยังไม่ได้ดูภาพกระเด็น/ควันลาม · ขั้นถัดไป = ปรับเล็ก (ข้อ 6 ของการ์ด) รอเจ้าของสั่ง

## 2026-11-06 — Skill rework step 4: Astrid (Claude, branch feature/skill-rework-astrid)
- เจ้าของอนุมัติรูปแบบ (การ์ด Astrid ใน artifact "ตรวจสกิล Fateweave") + นิยาม "ท่าใหญ่"/"เลื่อน 1 รอบ"/กันโกง ("เห็นด้วย") บันทึกใน README §7 และ SYSTEMS_REFERENCE
- กฎ: deflectfate ตี 6 + คูลดาวน์ 4→3 · turncycle = เลื่อนท่าใหญ่ (ตี 8; ท่าใหญ่ถัดไปไปรอบหน้า ศัตรูใช้ท่าถัดไปในวงแทน; charge เลื่อนพร้อมท่าแรง; ครั้งเดียวต่อท่า; ถูกขัด/เบนแล้วเลื่อนไม่ได้) · doubledial = ดาวตก 18 ทุกตัวตอนจบรอบ หายถ้า Astrid ล้ม · `cycleShift`/`Command.steps` ถอดออก (`cycleLag`+`postpone`, `meteors`) · เซฟ v51
- b2y คืนคูลดาวน์เมื่อเลื่อนได้จริง · b4 = `seerMeteorBig` +6 (ข้อเสนอ Claude รอเจ้าของดู) · ป้าย "<ท่า> เลื่อนไปรอบหน้า" บนการ์ดเจตนา (เห็นที่ 390px) · VFX Mark/Dispel/Storm ตามเหตุการณ์จริง + `tests/browser/seer-fx.spec.ts`
- Advisor: เลื่อนมีค่า 10% ของท่าใหญ่ (80% ถ้าเป้าเหลือ ≤50) — 40% ทำให้กดบ่อยแต่ไม่ช่วย
- Sim 28/28 เฉพาะแถว Astrid: กิ่ง b 9/10 43% → 10/10 60%, กิ่ง a 9→10/10, ประจำตัว 54→60%; ΔHP turncycle +0.6/+2.1/+5.3, doubledial +13.2 · probe `tests/probe/astrid-probe.test.ts`
- เปิด: เบนชะตายังใช้ 2–4 ครั้ง · ขั้นถัดไป Toma (รอเจ้าของสั่ง) · เจ้าของยังไม่ได้ดูท่าทาง

## 2026-11-06 — iPhone web app: HUD text in the top ~100pt is blurred by iOS (Claude, branch fix/battle-header-layer)
- วัดภาพจริง: หัวแถวบน (≈70–95pt) นุ่ม แต่ตัวหนังสือที่ ≥108pt คม; ไม่มี filter/mask/overlay ใน DOM; สไตล์ที่แก้ใน #186 ไม่เปลี่ยนความคมเลย (วินิจฉัยรอบนั้นผิด); ตำแหน่งบนจอเท่ากันทั้งโหมดโปร่ง/ปกติ → สมมติฐาน: เอฟเฟกต์แถบบนของ iOS 26 ทับโซนบนสุดของเว็บแอป
- แก้ (เฉพาะ standalone): `--safe-top-fallback` = 36px ทุกหน้าจอได้ที่ว่างบนเพิ่ม; แตะกล่องตัวเลข (เปิดด้วยแตะมุมซ้ายบน 5 ครั้ง) เพื่อวนค่า 36/0/24/48 บนเครื่อง
- ยังไม่ยืนยันบนเครื่องจริง: ถ้าหัวแถวคมขึ้นที่ค่าไหน ให้ตั้งเป็นค่าเริ่มต้น และตรวจแผนที่/ค่าย/แผ่นบริการว่าหัวไม่ซ้อนโซนนี้

## 2026-11-06 — Skill rework step 3: Garran (Claude, PR #185 feature/skill-rework-garran)
- เจ้าของ "ดำเนินการตามที่คุณแนะนำได้เลย" = การ์ด Garran ในหน้า artifact "ตรวจสกิล Fateweave" (ตามโน้ตเจ้าของ) + เจ้าของเลือก brace = แทงเป้าทันที 8 แล้วตั้งทวนสวน 14 เหมือนเดิม (แทนปะทะท่า)
- กฎ: pierce ทะลุตัวหลังเป้า 50% (b2l เต็ม) · spearwall สวน 10 + ลดดาเมจแนวหน้า 5%/ครั้ง (สูงสุด 15%) · hold = ปักทวนตรึง 12 + ท่าถัดไปเบา 30% · halt = ผลักสลับแถวกับตัวหลังในคอลัมน์จนจบเทิร์นของตัวที่ถูกผลัก (ล็อก 2 รอบ, บอส/ตัวใหญ่ไม่ถูกผลัก, คูลดาวน์ 4) · warcry = พุ่งหอก 26 ตีถึงแถวหลัง รับเพิ่ม 20% · เซฟ v50 ศึกค้างที่ใช้ 6 ท่านี้เริ่มใหม่จากเลือดเข้า
- advisor ทวนใช้ preview ของ resolver + ผลหลังหน้าต่าง preview; ผลักนับลบเมื่อซ่อนตัวที่ทีมกำลังตี (วัดได้ −2.8 ถ้าไม่เลือก) · ฉากวาดสองตัวสลับแถวตามสถานะจริง (`standSlotId`) ภาพ 390px ใน README
- Tests: typecheck/lint/unit 1610 ผ่าน, Playwright command-fx + unit-a5 40 ผ่าน, sim 28/28: ผู้คุมแนว 9/10 49% → 10/10 57% (โจมตีปกติ 37→11), brace ΔHP −2.3→+0.9, warcry +2.4, ตัวอื่นไม่เปลี่ยน
- รายละเอียด `docs/validation/skill-rework-2026-11-05/README_TH.md` §6 · เปิด: spearwall ไม่ถูกเลือก, hold −1.2 · ขั้นถัดไป Astrid (รอเจ้าของสั่ง) · เจ้าของยังไม่ได้ดูท่าทาง

## 2026-11-06 — Battle header text sharper; home-screen app back to normal status bar (Claude)
- iPhone เว็บแอป: `black-translucent` (PR #175) ทำให้ iOS วาดหน้าที่ y=0 แต่ตัดที่ 793/852 → ล่าง 59pt วาดไม่ได้ (โหมดทดลอง #182 ยืนยัน) → เอาออก (#183) กลับเป็นแถบสถานะปกติ ที่ว่างล่างเหลือ ~26pt; ค่าที่วัด: inner 793, screen 852, env top 0, env bottom 34
- หัวแถวบนของหน้าต่อสู้ดูเบลอ ไม่ใช่เกา/filter แต่เป็นสไตล์ (เงาฟุ้ง 6px, ชิป 9px/400) → ปรับให้คม ดู `docs/validation/battle-header-text/`
- เปิด: ผู้ใช้ยังไม่ยืนยันผลบนเครื่องจริงหลังปรับ; ฉากพื้นหลังต่อสู้เป็นไฟล์แนวนอน 1536×1024 ขยาย ~1.6× (ถ้าต้องการคมกว่านี้ → ภาพแนวตั้งจาก Codex)

## 2026-11-06 — Skill rework step 2: Wynne pulls (Claude, PR #184 feature/skill-rework-wynne)
- เจ้าของ "ดำเนินการขั้นถัดไป Wynne ได้": ภาษีชีวิต/วงภาษีแทบไม่ถูกใช้ → ดึงด้าย (สาปทำงานทันที คลาย 1 ชั้น ต่ออายุชั้นที่เหลือ, คูลดาวน์ 2) + วงด้ายดึง (ตัวที่มีสาปทำงานทันที ตัวที่ไม่มีติด 1 ชั้น ใช้ได้ทุกเทิร์น)
- ถอดภาษี (`toll`/`payToll`/event `toll`) · โหนด b2x `hexPullHeavy`, b2y `hexPullKeep`, b4 `hexRingFull` ความหมายใหม่ · เซฟ v49 ศึกค้างที่ใช้ lifetoll/tollring เริ่มใหม่จากเลือดเข้า
- การต่ออายุตอนดึงเป็นการตัดสินของ Claude: ถ้าไม่ต่อ สาปจะหมดในรอบที่ดึง (เป็นที่กฎ ไม่ใช่การให้คะแนน)
- Tests: typecheck/lint/unit 1610 ผ่าน, Playwright roster-p03 + unit-a12-clips ผ่าน (คลิปถูกข้ามตาม env), sim ผ่าน: กิ่ง b 46→54% (tollring 0→11), ดึงด้าย 2–5 ครั้ง ตัวอื่นไม่เปลี่ยน
- รายละเอียด `docs/validation/skill-rework-2026-11-05/README_TH.md` §5 · ขั้นถัดไป Garran (รอเจ้าของสั่ง) · เจ้าของยังไม่ได้ดูท่าทาง/VFX


Older entries moved verbatim to [archive/2026-11-08/CODEX-TO-CLAUDE.md](archive/2026-11-08/CODEX-TO-CLAUDE.md).
