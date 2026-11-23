## 2026-11-23 — Map 5 owner decisions (Codex · `codex/map5-crystal-mine-design`)
- Owner replied “ทำตามที่คุณแนะนำ” to the three design choices. Recorded the decision under OD-60 and reconciled the Chapter 1 map description. [Confirmed design](../design/MAP5_CRYSTAL_MINE_DRAFT_TH.md).
- Checked document consistency, relative links and Git whitespace. The next work is rules, content and simulation. Numeric targets await results.

## 2026-11-23 — Map 5 Crystal Mine design (Codex · `codex/map5-crystal-mine-design`)
- Drafted the three mine zones, lanterns, minecart and light puzzles, 2-of-3 seal, Brann/Kael story and Crystal Giant encounter for owner review. [Design, simulation targets and 390px review plan](../design/MAP5_CRYSTAL_MINE_DRAFT_TH.md).
- Branch base `827756f` includes #336 at `24a1f3c`. Reviewed the draft and checked Markdown whitespace with Git.
- Open owner decisions: overseer bypass, puzzle and recruit flow, and armour and shard behaviour. Simulation, art and implementation follow that review.

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

## 2026-11-23 — Scale the Water Spirit’s attendants (Codex · #345 → claude/map4-lake-foes)
- Owner flagged that the attendants looked larger than the boss. Mist Wisp, Stone Crab and Mirror Shade now match the painted scale of Rift Wisp, Shard Crawler and Vargoth Hunter respectively. Still and animated frames share scale and sole. Reflection keeps its shade clear of the right field edge.
- Replaced all eight 390px clips. Chromium checks compare painted bounds with the boss and verify the summoned shade is inside the viewport. Typecheck, lint, build, presentation coverage and npm test (2270 passed, 24 skipped) passed. [Updated clips](../combat-presentation/lake-boss-slice/README_TH.md).
- Pending owner motion approval for #345.

## 2026-11-22 — Map 4 Water Spirit art and VFX (Codex · codex/map4-lake-boss → claude/map4-lake-foes)
- Owner selected Tide Lash R2, Undertow R1 and Reflection R1 (“ทำตามที่คุณแนะนำ”) and approved “ใช้ runtime 768 px (แนะนำ)”. Verified 21 files from #339. Preserved sole and displayed scale, with six moves, hit/down and still/portrait.
- Four encounter-only VFX families route from real events. Water Veil peaks on healing, and Reflection keeps the caster's recover frames while filling the actual summon slot.
- Typecheck, lint, build and coverage 6/6 passed. Full unit run 2268 passed with one audit of obsolete stand-in aliases fixed and rerun in a 129/129 focused pass. Chromium 390px clips 8/8, A11 texture release and Call the Court passed.
- Worst five-hero animation plus dedicated boss FX 60.1 MiB / 17.1 MB. Awaiting owner motion approval. [Review clips](../combat-presentation/lake-boss-slice/README_TH.md).

## 2026-11-22 — Map 4 phase 4 motion choices (Codex · claude/map4-lake-foes)
- Owner: “ทำตามที่คุณแนะนำ” for Tide Lash R2, Undertow R1, Reflection R1. This supersedes the earlier all-R1 pick.
- Verified SHA-256 and RGBA decode for all 21 selected input images from #339, including the Tide Lash R2 strip. Documentation passed git diff --check.
- Next: phase 4 runtime intake on `codex/map4-lake-boss` per the [handoff](CODEX-MAP4-LAKE-CONTINUE-TH.md).

## 2026-11-22 — Map 4 phase 3 motion approval (Codex · #344 → claude/map4-lake-foes)
- Owner: “อนุมัติ” on the revised 390px Shadow Serpent and Weeping Siren R1 clips. Approved presentation source: `52f2fd0`.
- Same source as the size review below. Approval documentation checked with git diff --check. Quality and validate passed. Merge commit `fe213ea`.
- Phase 4 owner choice: “R1 ทั้งสามท่า” for Tide Lash, Undertow and Reflection. Intake source SHA-256 matched for 21 selected body/VFX files from #339.

## 2026-11-22 — Map 4 phase 3 elite size review (Codex · #344 → claude/map4-lake-foes)
- The owner asked to compare the new enemies with existing foes. At the same slot size, standing art is now +1.6% vs Tusker for Shadow Serpent and −1.1% vs Rift Weaver for Weeping Siren. Still and animated figures share the same scale.
- The field fits each elite’s painted right edge. The Siren review clips show her in her real back-row slot. Replaced all nine 390px clips, with 9/9 Chromium captures. Typecheck, lint, build, presentation coverage 6/6 and npm test (2262 passed, 24 skipped) passed. [Review clips](../combat-presentation/lake-elites-slice/README_TH.md).
- Pending: owner motion approval for #344. Phase 4 still waits for the owner’s R1/R2 selections.

## 2026-11-22 — Map 4 lake art phase 3 (Codex · codex/map4-lake-elites → claude/map4-lake-foes)
- Owner selected R1 for both elites (“เฟส 3 เลือก R1 ตามที่แนะนำ”). Imported the Shadow Serpent and Weeping Siren from art PR #340. Each of the 7 encounter intents has its own lossless strip. Added hit/down and still/portrait cells 4–5. Water Spirit is the remaining stand-in.
- Verified source hashes and reconstructed frame pixels. Coverage: 48 identities. Elite encounter textures pass 64 MiB (48.3 / 48.2 MiB). Chromium 390px captures passed 9/9. [Clips and evidence](../combat-presentation/lake-elites-slice/README_TH.md).
- Checks: typecheck, lint, build, presentation coverage 6/6, full unit run 2258 passed with two failures corrected and verified in a 73/73 focused rerun. The World Boss rules test now checks Coil Gathering by encounter rather than art status.
- Phase 3 awaits the owner’s motion approval and PR CI before merge. Phase 4 waits for the owner’s R1/R2 picks for Tide Lash, Undertow and Reflection.

## 2026-11-22 — Map 4 lake art phase 2: tide slime, mist wisp, stone crab, mirror shade (Sonnet; claude/map4-lake-foes, based on #337)
- Imports ART-UNIT-ANIMATION-LAKE-001 R1 (Codex #340, checked) for the four plain foes: `scripts/build-lake-foes.py` (hash-checked inputs, lossless pack, pixel-exact rebuild) → 4 atlases + new still/portrait sheet `foes3`; `assets.ts` (`foes3`, actorArt, figureTops), `unit-frames.ts` / `unit-animation-map.ts` (shared layout; wisp hovers 22–24), species + mirror shade art keys, `LAKE_STANDINS` now only serpent, siren, Water Spirit. No rules/save/number changes.
- Tests: typecheck, eslint, npm test, coverage:presentation (identities 42→46), new tests/unit-lake-foes.test.ts, A4 hover test lists the lake wisp; real 390px clips in `docs/combat-presentation/lake-foes-slice/` (README_TH.md).
- Notes: portraits are square crops of the seeds (no painted bust from Codex); crab/shade atlases 7.0/7.6 MiB decoded (> 6 MiB guideline, encounter totals pass). Owner motion approval pending.
- Next: phase 3 (serpent + siren, owner chose R1), phase 4 (boss + VFX).

## 2026-11-22 — Map 4 lake art phase 1: world tiles, decor, battle scene imported (Sonnet; claude/map4-lake-art, based on #337)
- Owner: "ดำเนินการเฟส 1 ได้ ส่วนเฟส 3 เลือก R1 ตามที่แนะนำ" → phase 3 uses R1 (serpent coiled on stone, siren sitting on a rock). Plan: `MAP4-LAKE-ART-IMPORT-PHASES-TH.md`.
- ART-WORLD-LAKE-001 (Codex PR #338, files copied as shipped, lossless): `lake_tiles.webp` 6x5, `lake_decor.webp` 3x3, `battle_lake.webp`; frames in `src/content/world/lake-{tiles,decor}.json`. `world-art.ts` (`isLakeArt`, `tileFrame`, `lakeHighFrame`, lake `floorFrame`/`decorAt`), `world-ui.ts` (`#map-grid[data-art=lake]`, water tiles carry high-tide + causeway frames), `world.css` (low-tide frame + high-tide frame fading in on `data-tide`, painted lanterns from the decor atlas), `screen-images.ts` + `game-feel.css` (`lake` battle scene, preload), LQIP regenerated. Rules/saves/numbers unchanged.
- Tests: typecheck, eslint, npm test 2241 pass, build, coverage:presentation, Chromium lake-map.spec (4) with new 390px shots in `docs/validation/map4-lake/`; new `lake world art` tests in tests/world-art.test.ts.
- Cell edges (owner asked, 2026-11-22): the seamless lake floors got a faint per-cell edge via CSS `#map-grid[data-art=lake] .tile::before`, art untouched.
- Owner approval (2026-11-22, after the cell-edge change, own word): "อนุมัติ" for the phase 1 screens. Not done: the tide clip `lake-tide-clip.webp` is the old stand-in; the lake shrine/raft still use the old map props (decor frames `lakeside_shrine`, `merchant_raft` not wired); phases 2–4. Note: the repo tracks a `node_modules` entry; `npm ci` removed it locally, do not commit that deletion.

## 2026-11-22 — Map 4 lake art review: Codex PRs #338/#339/#340 pass intake checks (Sonnet; branch claude/map4-lake-art, docs only)
- Owner asked for a fresh chat to check Codex's lake art. Branches `art/art-world-lake-001` (#338), `art/art-unit-animation-lake-001` (#340), `art/art-unit-animation-lake-boss-001` (#339); each Codex commit touches `incoming/<ID>/` only (the wider diff is the #337 base). Not merged, not edited.
- Checked: SHA-256 vs `validation.json` all match (the 3 non-matches in #340 are repo files: unit-frames.ts, battle_riftline.webp, audit script, whose hashes equal the repo); every PNG/WebP decodes; I re-ran `scripts/unit-anatomy-audit.py` on cells cut from every strip (8 foe/shade sets + boss): no head-scale drift, only boss frame 9 (fall) not measured.
- World: tide luma at 60px low 168 / high 120 / deep 50 and different patterns (sand ridges / ripples / flat), seamless tiles, decor 9 items + lantern on/off, bg 1536x1024 RGB opaque, runtime 1.63 MB (<2.5). Foes: 35 strips/187 frames, sole 497/512 matches seed, no edge clipping. Boss: 6 moves x R1/R2 + hit/down, sole 0.875, 12 VFX layers 256x256 no edge touch.
- Notes for import: foe previews still use the rift backdrop (swap to bg_lake); land zones read as wood/green-grey/light-grey/blue-grey stone (check pavilion vs sanctum in the 390px screen); wisp and siren R2 float (sole not 497).
- NOT done: import into game (world-art.ts lake zones, LAKE_STANDINS, unit-frames.ts, boss-signature-fx paintedAs), atlas packing, coverage:presentation, 390px screens/clip, owner picks R1/R2 + motion approval. Open next chat: do the import off #337 (or the game branch once #336/#337 merge).

## 2026-11-22 — Map 4 ทะเลสาบเงาจันทร์: tide, content, save v68 + screens (Opus; claude/map4-moonlake PR #336, claude/map4-lake-ui PR #337)
- Owner: §5 of CHAPTER1_MAPS answered “ตามแนะนำทั้ง 4 ข้อ ทำต่อได้” → OD-60 (story recruits maps 4–8, camp cap +3 per clear, other systems separate, one map at a time).
- #336: `core/world/tide.ts` (8-step tide from steps + camp waits; shallow at low tide, deep by boat, washed back), `content/world/chapter-lake.ts` (3 puzzles, seal 2/3, ferryman story + boat, reflections + notes → `Profile.notes`, Kael lake job, Lio/Cerise camp recruits), `mend` intent (Water Veil, diminishing), serpent/siren/spirit, `capLevel`, save v68. Map gated out of `main.ts` until #337.
- #337: tide chip, water tiles, `waitTide` command, camp wait, lanterns/notes, goals/story, journal, lake texts; removes the gate. **Waits for owner approval of the 390px screens + clip.**
- Tests: npm test 2239, lint, build, Chromium lake-map.spec (4). Sim: casual first try 75% rush / 98% explorer, blind boss 0–33% ([validation](../validation/map4-lake/README_TH.md)).
- Open: C12 campaign gate fails identically on the base commit (220 < 226, pre-existing, not re-baselined); lake sweep/contract = map 3 values until the P04 economy pass; Codex brief `CODEX-ART-MAP4-LAKE-TH.md` not yet sent; real devices.

## 2026-11-22 — C12 campaign gate: OD-59 starter pairs re-baselined (OD-61) (Opus; claude/eloquent-albattani-jrtn3t → game branch)
- `npm run sim` failed the C12 gate (explorer/casual 220 < 226) since #333. Per-commit probes: #313–#332 = 229, #333 = 220; gacha P10 has no sim effect. Tip code with the old pairs = 229 seed for seed, so only the starter mix moved it (no lio+toma; support first; the test seeds give Toma 29/48).
- Owner: “ทำตามที่คุณแนะนำ” → that group re-baselined in `tests/fixtures/c12-campaign-before.json` (ซากชายแดน #1 94%, ป่าทึบ #1 65%); other 15 cells unchanged. CAMPAIGN.md refreshed.
- Tests: typecheck, lint, `npm test` 2160 passed, `npm run sim` 29/29 (C12 gate included). [Validation](../validation/c12-gate-od59-2026-11-22/README_TH.md). Open: Toma-first pairs weak at the forest first try (casual 23–30/48), only if the owner wants a balance pass.

## 2026-11-22 — OD-59 first fate weave + cabinet after map 1; lessons on a new game (Opus; claude/fate-first PR #333, claude/lessons-new-game PR #332)
- Owner: gacha after the prologue instead of the starter choice → recommendation → “เห็นด้วย ดำเนินการได้”; screens “อนุมัติ”. Also reported lessons vanishing after a restart (#332: `LessonGuide.restart()` on a new company; "off" kept).
- `map.draft.fate`: one offer each, support then attacker (run seed); save v67, v66 runs mid-pick keep three offers (`draft.legacy`). `unlocks.gacha = 1`, camp tile `#lobby-gacha`, `firstClearTickets: 10` on map 1. Lessons: quests → World Boss → cabinet → team after map 1; `tickets` pointer later.
- Tests: npm test 2160, lint, build, Playwright world/lessons/gacha; sim STARTERS all four pairs 100% first clear. [Validation](../validation/od59-fate-first-2026-11-22/README_TH.md). Open: real devices.

## 2026-11-22 — P10 follow-up: owner confirmation + staging load with concurrent pulls (Opus; claude/p10-gacha-load → game branch)
- Owner: “ยืนยันตามแนะนำ ดำเนินการขั้นต่อไปได้” → shard units (dup 10 / unlock 50 / 1–2 shards) and D24 confirmed in OD-58 and the spec.
- `tests/server-load.test.ts`: each account spends its trio tickets (2+2) with a same-id retry and a racing request per pull; asserts one charge, 409 for the race, journal = pulls, wallet 0. Staging run 44970708223 (`trio=now`, 4×5 accounts) passed; first run showed 429 for a 12-command burst (limit working), test now paces 1 pull/s. [Validation](../validation/p10-gacha-2026-11-21/README_TH.md).
- Tests: typecheck, eslint; staging workflow pass. Open: points icon at 24px, single-pull full reveal clip, real devices.

## 2026-11-21 — P10 free-ticket gacha: spec, rules, server, 390px cabinet (Opus; claude/p10-gacha-* → game branch, PRs #327–#330)
- Owner: “ทำระบบกาชาก่อน”; 80-point exchange, 7.5% full over 15, else 1–2 shards, 96 tickets/28 days from existing sources, no sales → OD-58 + [spec](../design/GACHA_P10_SPEC_TH.md) (#327 merged).
- #328 core: `core/world/gacha.ts` (one seed per pull, 10 = 10×1, grants joined/duplicate/universal/shards/stored/unlocked), commands `gachaPull`/`gachaExchange` (config version checked), `rules.ts` `gacha` v1 + tickets on board/trio (24/week), opens after MAP2, save v66. Shard units mapped to P04-02 (dup 10, unlock 50).
- #329 server: ledger `gacha:<serial>` (+`detail` column), `GET /v1/gacha/history`, id-free telemetry `gacha`, import starts the wallet empty (D24 recommendation). No D1 migration needed.
- #330 UI: third hiring tab “ทอชะตา” (confirm → results from the committed entry, rates, exchange, history) with ART-UI-GACHA-003 R1 (owner pick “ใช้ R1 ทั้งหมด”; `scripts/build-gacha-art.py`, 2.83 MB, cabinet-only) on #212 key art; **owner approved look+motion 2026-11-21 “อนุมัติ”** ([validation](../validation/p10-gacha-2026-11-21/README_TH.md)). Codex PR #326 closed unmerged (imported via #330).
- Tests: typecheck, lint, `npm test` 2155+, gacha/server-gacha/gacha-sim, Playwright gacha (3) locally; CI per PR. Simulated: real rules, 2,000 players (spec §4).
- Open: owner confirmation of D24 + shard-unit mapping; staging load test with concurrent pulls; points icon thin at 24px (brief Codex if the owner asks); single-pull full-character reveal not yet in a clip; real devices.

## 2026-11-21 — Image-blank B4 (blurred placeholders) + B5 (lossy map atlases) (Sonnet; claude/image-blank-b4-b5 → game branch, PR #325)
- Owner: “ทำ B4 กับ B5 ต่อใน chat ใหม่”. Presentation/encoding only. Owner approved the images in their own words: “ภาพใช้ได้ merge ได้เลย”.
- B4: `scripts/build-lqip.py` → `src/ui/lqip.generated.ts` (8 paintings), `src/ui/lqip.ts` `trackLqip`, CSS at the end of `game-feel.css`; wired into title, camp backdrop, battle, story.
- B5: `tileset` 907→239 KB, `decor` 736→255 KB (q92, alpha lossless); masters in `assets-master/world/`, `scripts/build-lossy-world.py`, `WORLD_REV` `?v=`. `title_party` left as is (only 1.4×).
- Tests: typecheck, lint, Vitest 2136 pass, build, Playwright lqip/image-ready/lobby/story/world/battle-hud/portrait/combat/region pass; `image-ready.spec` camp test now gates the backdrop until after the click. Perf single sample: no blank images at screen switch; times noisy. [Validation](../validation/image-blank-b4-b5-2026-11-21/README_TH.md).
- Open: re-measure on a real phone.

## 2026-11-21 — P11-05 go-live check before the trio switch (Opus; claude/p11-05-trio-check → game branch, PR #324)
- Owner: “เริ่มข้อ 4” (check readiness before OD-52, Mon 23 Nov 2026 06:00 Bangkok = week 2969). No game code/rules/numbers changed; tests only.
- `tests/world-boss-trio-switch.test.ts` (shipped rules, clock pinned around 2026-11-22T23:00Z): calendar/reset, offline rules, Worker + World Boss object (warden to 05:59:59, three bars at 06:00 = floor(warden attempts ÷ 3) × 400 / min 1500, warden refused after, trio pays boss shards, warden `s-50` of 2968 claimable in 2969, closed in 2970, verify ok). `tests/browser/world-boss-trio-switch.spec.ts` (offline, Asia/Bangkok, 05:59 → 06:00:30): banner/page warden → trio, three guides, Kragmor fight drawn.
- Staging load test `trio=now` on the game branch passed (4×5 accounts, no 429/5xx, staging deleted). [Validation](../validation/p11-05-trio-check-2026-11-21/README_TH.md).
- Tests: typecheck, eslint, world-boss Vitest set (118 + 4 new), Playwright new spec; CI quality + browser on the PR. Owner action before the switch: none (avoid deploying around 06:00 Monday). Open: real switch on dev API, real devices.

## 2026-11-21 — Image-blank fix B1/B2/B3/B6 (Opus; claude/image-blank-fix → game branch)
- Owner: “ไม่ต้องการให้คนเล่นเห็นว่าภาพเป็นช่องว่าง…” → “ดำเนินการตามที่แนะนำ”. `ui/image-ready.ts` (`whenImagesReady`, cap 1800 ms draft, never throws), `ui/screen-images.ts` (camp/map/battle image lists); `GameShell.afterImages` holds the old screen with a loading button until the next one's main images decode; idle low-priority prefetch of the next screen; title preload in `index.html`; mid-battle save prefetches its encounter after 2.5 s on the title (immediate start blocked the main thread 4+ s). Presentation only.
- Result (Chromium 4G+CPU 4×, cold): no blank images on title/map/battle when shown (title 5.0 → 2.3 s, map 3.9 → 1.3 s, battle bg 6.4 → 1.6 s); camp still hits the cap when tapped at once. [Validation](../validation/image-blank-fix-2026-11-21/README_TH.md).
- Tests: image-ready.test (8), Vitest all, typecheck, lint, build; Playwright image-ready (new, 3) + world/keyboard/lessons/server-play/combat/story-p05/lobby-shots/update-banner/unit-loading (3 expectations updated for B6/async switch). Open: B4/B5 need owner image review; real-device decode time.

## 2026-11-20 — Same figure size in every fight; the first battle's coach no longer shrinks the field (Opus; claude/field-size-coach → game branch)
- Owner (first-battle 390px shot: figures smaller than other fights): “ดำเนินการทั้ง 2 ข้อ”.
- Coach: while a lesson shows, `#battle-coach` takes the `#unit-inspector` place (inspector hidden, back when hints end/dismissed); arena 425 → 473px.
- `fieldSlots`: a figure clears only the band of the nearest row above with a unit over it (else the top edge), not the tallest figure of every row; one large foe no longer shrinks the whole field. `foeLineRows`: of two non-boss lines, the one with a large foe stands at the bottom (rules unchanged: two foes in a column stay neighbours).
- Sizes (378×477, hero px): every non-boss fight 104–105 (first battle 98 → 104; with the coach 83 → ~104); boss fights unchanged (98, captain 83).
- Tests: field-layout (+ same size in every non-boss fight), foe-lines, full Vitest 2113, lint, typecheck, build; Playwright combat/battle-hud/status/team-five/field-a11 (64). Shot `docs/validation/field-size-2026-11-20/first-battle-390.png`. Chromium only.

## 2026-11-20 — Perf R11: shorter server retry (Sonnet; perf/r11-server-timeout → game branch)
- Owner: “เริ่ม R11”. `server-client.ts`: waited requests 3 attempts × 7 s (was 5 × 15 s), same requestId/seq each time; import/chat/report keep old limits; `onReconnecting` hook → shell shows “กำลังเชื่อมต่อใหม่…” at once. Numbers are drafts.
- Result (Chromium 390px, blackholed command): card 81.5 → 22.3 s, reconnecting note 60.9 → 7.2 s. [Validation](../validation/perf-r11-2026-11-20/README_TH.md). No real device/dev API.
- Tests: server-client-retry.test (6 new), Vitest all, typecheck, lint, build, Playwright server-play (7). Remaining audit items: none from R1–R11 except owner picks.

## 2026-11-20 — Perf R10: half-size DOM portraits (Opus; claude/perf-r10 → game branch)
- Owner: “ต่อ R10 เลย”. `scripts/portraits-half.py` builds `portraits*_half.webp` (256 px cells, same encoding as the master) + `portraits-half.json` revisions; `portrait(id)` uses them, `portrait(id, true)` keeps the 512 px master for the story figure; World Boss unchanged.
- Result (camp/map, starting team): portraits 1.55 → 0.67 MB, decoded 28 → 7 MiB (mercs sheet 4.93 MB/14 MiB → 1.45 MB/3.5 MiB). [Validation](../validation/perf-r10-2026-11-20/README_TH.md). Not owner-viewed.
- Tests: portraits-half.test (5), Vitest all, typecheck, lint, build, Playwright 9 specs (133; 5 world.spec atlas-name checks updated).

## 2026-11-20 — Perf R9: idle animations off the main thread (Opus; claude/perf-r9 → game branch)
- Owner: “ต่อ R9 เลย”. Measured idle main-thread time per screen (CPU 4×, 5 s): title 691 ms and map 184 ms came from `logo-glow` (animated `drop-shadow`) and `toast-life` (`visibility` keyframe). Toast keyframe drops `visibility`; the title glow is a second `aria-hidden` logo copy behind with a fixed glow, faded by opacity.
- Result: title 691 → 6 ms, map 184 → 38 ms per 5 s idle. [Validation](../validation/perf-r9-2026-11-20/README_TH.md) (glow still: fixed 22 px radius fading instead of a growing radius; not owner-viewed).
- Tests: Vitest all, typecheck, lint, build, Playwright world/keyboard/update-banner/lessons/ui-shots (117).

## 2026-11-20 — Perf R8: asset-cache service worker (Opus; claude/perf-r8 → game branch)
- Owner: “ต่อ R8 เลย”. Build writes `sw.js` (vite plugin `fateweave-service-worker`: `src/platform/service-worker.js` + build id + SHA-256 manifest of `assets/`, music excluded); cache-first by path+hash, prunes on activate, never touches pages/version.json/API/music. Registered in production only, not under automation unless `?sw=1`; `?sw=off` removes it and its cache. No file renames.
- Result (preview build, 4G, CPU 4×, revisit): warm HTTP cache 40 → 11 network requests; cleared HTTP cache 9.0 → 2.3–4.4 MB. [Validation](../validation/perf-r8-2026-11-20/README_TH.md). Not measured on real Pages/Safari.
- Tests: service-worker.test (4), Vitest all, typecheck, lint, build, Playwright update-banner/unit-loading/perf-probe/portrait-keyboard (22).

## 2026-11-20 — Perf R6+R7: lighter battles (Opus; claude/perf-r6-r7 → game branch)
- Owner: “ต่อ R6 กับ R7 เลย”. `battle-ui.ts` `set()` via `setHtml`, focus restored only when replaced, backdrop measured once per frame; `BattleScene.sync()` skips the full `paint()` when the field is idle (`fieldIdle`, `UnitAnimation.still`) and `paintKey` is unchanged; `GameShell.local()` passes `battleMemo` (R7).
- Result (Chromium 390px, CPU 4×, SwiftShader, 3 wins in a row vs after R1): FPS 20.5–23.9 → 23.2–26.4, long tasks per fight 2.1–13.8 s → 0.9–7.3 s. [Validation](../validation/perf-r6-r7-2026-11-20/README_TH.md).
- Tests: Vitest all, typecheck, lint, build, Playwright 16 battle specs (132). No real device. Remaining audit items: R8 hashed asset names/SW cache, R9 idle CSS animations, R10 small portraits, R11 shorter retry.

## 2026-11-20 — Perf R5: server-play steps at the player's pace (Opus; claude/perf-r5 → game branch)
- Owner: “ต่อ R5 เลย”. `game-shell.ts` `guesses` replaces the one-step `nextMove`: up to 3 steps shown at once (each guessed on the device from the previous guess), sent one by one in order; a confirmed `moved` keeps the token on the furthest guess, any other answer drops the rest and shows the server state. No API/protocol/rule/save change.
- Result (local Worker/DO + 300 ms delay, CPU 4×): taps every 200 ms 7/8 → 8/8 sent, press → visible step 24–286 → 12–24 ms. [Validation](../validation/perf-r5-2026-11-20/README_TH.md). Accepted risk: a fight on the first step snaps the token back from up to 3 tiles ahead (`MAX_AHEAD`).
- Tests: server-play.spec 7/7 (one updated, one new), Vitest all, typecheck, lint, build. Not measured against the real dev API; no real device.

## 2026-11-20 — Perf R3+R4: smooth map steps (Opus; claude/perf-r3-r4 → game branch)
- Owner: “ต่อ R3 กับ R4 เลย”. `ui/dom-cheap.ts` (`replayClass` rewinds one-shot animations instead of `void offsetWidth`; `setHtml` skips unchanged markup); `world-ui.ts` incremental fog (one element per cell), fog backdrop via `background-position` instead of inherited `--ox/--oy` (that alone recalculated ~1,370 elements per step), `--t`/`data-zone` only on change; `game-shell.ts` `show()` writes only changed attributes, no repeated `focus()` on the pad.
- Result (Chromium 390px, CPU 4×, local play): press → visible step p50/p95 154/215 → 27/42 ms, no long tasks (was 12 per 10 steps). [Validation](../validation/perf-r3-r4-2026-11-20/README_TH.md). The 120 ms key-repeat guard is unchanged.
- Tests: Vitest all, typecheck, lint, build, Playwright world/keyboard/lessons/map tabs/team-five/server-play/story (141). No real device. Next suggested: R5 server step queue (Opus).

## 2026-11-20 — Perf audit + R1/R2 (Opus; claude/perf-audit-2026-11-20 report only, claude/perf-r1-r2 → game branch)
- Owner: “ตรวจสอบอาการดีเลย์ โหลดภาพช้า เดินหน่วงๆ … ยังไม่ต้องแก้ไขจริง”, then “แก้ R1 กับ R2 ก่อนเลย” and “ทำต่อจนเปิด PR แล้ว merge ได้เลย”. Audit report (causes C1–C7, recommendations R1–R11) stays unmerged on `claude/perf-audit-2026-11-20`.
- R1: `game/visuals/battle-assets.ts`; `BattleScene` lazy mode (`main.ts`): no startup VFX/unit-sheet preload; each encounter loads 6 core atlases + skill-family atlases its heroes use + its still sheets; `fieldReady` gates Start/inputs (checked per added texture; failures never block; pilots still optional); GameShell prefetches the team/map set on the map. QA fixtures stay eager.
- R2: `skill_icons_128.webp` (lossless half size, `scripts/skill-icons-runtime.py`); 256 px master kept.
- Results (4G, CPU 4×): title download 26.3 → 5.0 MB, load 24.8 → 5.4 s; battle textures 151–170 → 116–135 MiB; a battle opened straight from a save waits 4.5 s (no prefetch). [Validation](../validation/perf-r1-r2-2026-11-20/README_TH.md).
- Tests: Vitest all + `battle-assets.test`, budget report regenerated, typecheck, lint, build, Playwright 11 specs (195). Icons not owner-viewed; no real device; Pages/dev API not reachable from the container.
- Next suggested: R3+R4 (walk reflow/fog, Sonnet), then R5 server step queue (Opus).

## 2026-11-20 — Foe lines: spear-straight rows, centred boss, ≤4 escorts (Opus; claude/review-standing-positions-j1gnf4 → game branch)
- Owner (vanguard-captain 390px shot, “ตำแหน่งยืนมั่วมาก”): no half rows (spear lines), boss exactly centred, balanced non-boss fields, a boss keeps ≤4 escorts and nobody in b1; “ดำเนินการตามที่แนะนำได้”.
- `core/battle/foe-lines.ts`: f_n/b_n share a row; boss line middle (3 top, 2 bottom); no boss 1/2/3 lines → mid / top+bottom / 1 top, 3 mid, 2 bottom. `foeNeighbours` follows these rows. `encounterProblems` rejects a boss with >4 escorts or a foe in its line. `bossRole` marks a stripped boss `leader`.
- `field-layout.ts`: rows by line, boss with nobody behind at the centre of the foes' half, shared rows across sides with an evenly placed middle row (replaces the 2026-11-18 per-side top-row drop).
- Content: b1→b3 golem (v12, HP 200→190 so the Garran advisor route still wins), captain (v8), briar lord (v12), Valdrakk (v2); warden/World Boss warden (v22/v2) drop b1 and call b2+f3 in both modes; thorn-host, rift-legion, Morvane v2 (neighbour rule).
- Tests: foe-lines.test (new), field-layout, boss-phases, team-five, world-boss-trio, encounter routes; full Vitest, typecheck, lint, build, `npm run sim` (hard warden blind attack 4%→11%). [Validation](../validation/foe-lines-2026-11-20/README_TH.md). Not owner-viewed in game; Chromium 390px only.
- Open: hard-mode warden is a little easier (one wisp fewer); World Boss warden's last week (2968) changes composition mid-week.

## 2026-11-20 — Content version grace + refresh notice (Sonnet; claude/content-version-grace → game branch)
- Owner (after the 409 “เวอร์ชันเกมไม่ตรงกับเซิร์ฟเวอร์” on 19 Nov: the dev API deploys in minutes, Pages ~40 min later): “ให้เซิร์ฟเวอร์ยอมรับเวอร์ชันก่อนหน้าได้ชั่วคราวระหว่าง deploy แล้ว deploy เสร็จจะมีประกาศให้ทำการ Refresh version ใหม่” (OD-57).
- API: `contentAccepted`/`graceActive` (`api.ts`), Worker vars `CONTENT_PREVIOUS` + `CONTENT_PREVIOUS_UNTIL`; the 409 names the chain. `cloudflare-dev.yml` step “Work out the content version grace” (`scripts/content-grace.mjs`: live API's own 409, chained, ≤3, 3 h; `[no-grace]`/`no_grace` input turns it off). Page: build writes `version.json`; `update-check.ts` + `update-banner.ts` show “มีเวอร์ชันใหม่พร้อมแล้ว” with refresh/later only when the live build differs.
- Tests: content-grace.test (9), update-banner.spec (2 at 390px), full Vitest, typecheck, lint, build. Design [CONTENT_GRACE_TH.md](../design/p09/CONTENT_GRACE_TH.md). Not yet seen across a real deploy: the first push after this merge deploys the grace itself (it only protects the push after that).
- First real deploy (a74336f): the grace step ran but wrote empty vars, because the commit body mentioned the off-marker and the check searched the whole message. Fixed: only the commit's first line counts (claude/grace-marker-subject-only). That deploy was unaffected (#311 left the content version at 0170adf9c26fc692). The live read of the API's 409 is still unproven on a real content change.

## 2026-11-20 — Shorter field HP bars, smaller numbers (Opus; claude/field-hp-compact → game branch)
- Owner (390px screenshot): “ปรับลดความยาวของหลอดเลือดลงให้เหมาะสม และปรับขนาดตัวเลขของเลือดให้เล็กลง”. `.field-health` max width 72 → 50px; overlaid counter 9/8/7 → 7.5/6.5/6px by length (`battle-ui.ts`). Presentation only; no rule/save change.
- Tests: battle-hud, status, combat specs (55, Chromium 390px incl. 9999/9999 fit + centring), full Vitest 2082, typecheck, lint, build. Shot `docs/validation/field-hp-compact-2026-11-20/battle-390.png`. Not owner-viewed; no real device.

[รายการก่อนหน้านี้](archive/2026-11-23/CODEX-TO-CLAUDE.md)
