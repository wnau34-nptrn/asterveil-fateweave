## 2026-11-16 — P11-04 World Boss part 2: screen, client and load probe (Sonnet; branch claude/p11-04-world-boss-ui)
- No owner comment on PR #259: 5/week, 8 rounds, sweep cut, unlock after map 1, HP 2500/account kept. No rule/save/number change (save stays v64).
- UI: "บอสโลก" tab in the camp quest board (`ui/world-boss-panel.ts`): attempts n/5, personal p-2/p-4, shared s-50/s-100 (this + last week) with claim, shared HP bar online (`ServerClient.worldBoss()`), none offline. Attempt plays in the existing `BattleUI` (`roundLimit` 8, "รอบ n/8", `live()` replaces `outcome === 'active'` checks); `GameShell` sends one `worldBoss { attempt, commands }` when it ends. `world-boss-warden` already registered (reuses the warden); `coverage:presentation` unchanged.
- Load probe `tests/probe/p1104-boss-load.test.ts` ([load.md](../validation/p11-04-2026-11-15/load.md)): ~0.1 ms/hit, 10k hits ≈ 1 s CPU, invariants hold (HP ≥ 0, hits once); in-memory SQLite, not Cloudflare.
- Tests: `tests/world-boss-panel.test.ts` (4), Chromium 390px `world-boss-p11.spec.ts` + `quest-board-p05.spec.ts`, unit 1916 pass, typecheck, lint. Screenshots in the validation folder. Not run: online path in a real browser, real devices.
- Open: owner review of #259 numbers; staging load test (network, durable writes, outbox path); rotating boss/level scaling; no motion clips for the boss screen (owner motion approval still needed before any VFX).

## 2026-11-15 — P11-04 World Boss part 1: rules + server (Opus; branch claude/p11-04-world-boss, PR #259)
- No owner comment on weekly shards (#258), P04-06 budget or the Bangkok-midnight reset: kept. Save v64 (`Profile.worldBoss`, optional); no D1 migration, gacha wallet or payments.
- Rules `core/world/world-boss.ts`: weekly `world-boss-warden` (boss copy HP 2400), camp field team at full HP; `worldBoss { attempt, commands }` carries every turn and the resolver replays it (≤8 rounds, must end and hurt the boss). 5 attempts/week (OD-06, not 3/day). Attempt ore 6/gold 3; personal p-2/p-4 by attempt count (shard 1/2); shared s-50/s-100 (gold 3/shard 1) via `claimWorldBoss`, online only. No World Boss sweep. Offline uses the device day like sweep/board.
- Server: receipts `wb:w<week>:a<n>`/`wb:w<week>:<id>` in the account `reward_ledger`; hits queue in account DO `wb_hits`, Worker hands them to new `WorldBoss` DO (taken once, HP ≥ 0, late hits 0, resent on next answer). Claims use the HP the Worker read, logged (`boss`) for `/verify`. `GET /v1/worldboss`; `ServerClient.worldBoss()`. Wrangler DO migration v3.
- Budget: map-3 sweep 28/14 → 24/12 pays 114 ore-eq/week (formula 1195 ≤ 1200); week sim ±2% for players, login-only −11%. Shared HP 2500/last-week account, min 5000.
- Tests: `tests/world-boss-p11.test.ts` (15) + ledger/shards/game-command updates; unit suite, typecheck, lint, build; Chromium 390px sweep/quest-board specs. [Validation](../validation/p11-04-2026-11-15/README_TH.md).
- Open: owner review of 5/week, 8 rounds, sweep cut, unlock after map 1, HP numbers; part 2 = screen/art/clips + load test of the single DO.

## 2026-11-15 — P09 part 2: weekly universal star shards on the ledger (Opus; branch claude/p09-weekly-shards)
- No owner comment on #256 (P04-06) or #257 (ledger): budget and Bangkok-midnight reset kept. Save stays v63; no D1 migration, no gacha wallet.
- Farmable weekly source (OD-17): `SweepReward.shard`; weekly board tasks `w-elites` 4, `w-stories` 3, `w-jobs` 3 = 10 universal shards/week (none has a sweep option, so login-only earns none). Receipted by the existing `board:weekly:w<week>:<id>` rows; offline rules identical (`claimBoard` pays `bank.shard`, refuses `full` at the cap).
- Same total budget: 1 shard = 12 ore-eq (shop 10 for 60 gold; 1 gold = 2 ore); those tasks' ore/gold cut (20/10, 20/10, 25/12) and map-3 sweep 30/15 → 28/14. Week sim: sweep+board value ±1% for every playing pattern, login-only −5%; rush-3 gets 7/10 shards.
- Tests: new `tests/shards-p09.test.ts` (7: content, budget guard, claim once/cap, week boundary/catch-up/expired, sweep pays none, server Sunday 23:59 claim + retry after midnight + receipts + verify); unit 1890 pass, typecheck/lint/build, `npm run sim` 29/29, browser `quest-board-p05`/`sweep-p05` at 390px. [Validation](../validation/p09-shards-2026-11-15/README_TH.md).
- Open (owner): 10/week and the shard rate; sweep shards would need a weekly counter (save bump); P04-06 open items; reset time zone.

## 2026-11-15 — P09 reward ledger for sweep and quest board (Opus; branch claude/p09-reward-ledger)
- No owner comment on P04-06 (#256): payouts and numbers unchanged. Save stays v63; no D1 migration (the ledger lives in each account's Durable Object SQLite).
- Server owns the calendar: `CommandContext.clock` — online `sweep`/`claimBoard`/`depart` run on the server's game day (midnight Asia/Bangkok, `GAME_DAY_OFFSET_MINUTES` draft) and a command carrying its own `day` is refused `client_day`. Offline keeps the device day (missing day → `day`).
- `reward_ledger` (receipt PK, one row per payout: `sweep:<n>` per `d<day>`, `board:<tab>:<d|w period>:<id>`) written in the same transaction as game+log; replies carry `receipts` (stored in the book, retry byte-identical, retry across midnight pays nothing). An existing receipt refuses the command (`duplicate_receipt`, log `refused`). Log gains `day`/`refused` columns (added to old tables); `replayLog` replays with the stamped day.
- Device: `ServerClient` strips `day` from dated commands, reads `clock {day,next,now}` from `/v1/session`/`/v1/state` and shows the server day (advances at `next` by elapsed time, ignoring device clock skew).
- Tests: new `tests/server-ledger.test.ts` (14: day/week boundaries, quota reset, catch-up/expired periods, retry, client day refused, verify + tamper, duplicate receipt, DO column migration/unique rollback, skewed device); full unit suite 1883 pass, typecheck/lint/build. Doc [LEDGER_P09_TH.md](../design/p09/LEDGER_P09_TH.md).
- Open: owner on day-reset time zone (Bangkok midnight draft), P04-06 target share/login-only income; universal shards (OD-17) can now use the ledger; admin ledger view not built.

## 2026-11-15 — P04-06 farm and quest budget (Opus; branch claude/p04-06-farm-budget)
- No owner comment on PR #254 (sweep) or #255 (board): rules kept; only draft numbers changed, by simulation. Save stays v63.
- New `tests/sim/week-sim.ts` (`playExpedition` in balance-sim) plays post-campaign weeks on the real rules (lobby, one map-3 run per session, sweeps, board claims); probe `tests/probe/p0406-budget.test.ts` (`BUDGET_OUT`).
- Finding: old drafts gave sweep+board 39–45% (explorer) / 63–68% (rush) of weekly ore, and a login-only player 1523 ore/week (> 3 rush sessions). Cut: sweep supply 2/day kept to 6 (was 6/18), map-3 sweep 30/15/2/1 (hard tomes 2), maps 1–2 10/5; board dailies ~½, weeklies/contracts ~⅔. Now explorer 22–30%, rush 42–53%, login-only 530; 3 sessions lose no sweeps vs daily.
- No profit loops: new `tests/farm-budget-p04.test.ts` (craft/enhance/level→salvage, fuse, transfer, smelt one-way, no gold back, reward kinds). Duplicates and targeted farming checked; old maps' sets also drop on map 3 (open for P06).
- Tests: unit suite, typecheck/lint, browser `sweep-p05`/`quest-board-p05` (390px), `npm run sim` 29/29 (no report change). [Validation](../validation/p04-06-2026-11-15/README_TH.md).
- Open (owner): target share ~20–30%; login-only sweep income; board + World Boss + weekly universal shards (after P09 ledger) share one budget.

## 2026-11-15 — P05-06 quest board prototype (Opus; branch claude/p05-06-quest-board)
- No owner comment on the P05-05 sweep assumptions (PR #254), so the sweep is unchanged.
- Runtime (offline prototype, draft numbers, save v63, optional `Profile.board` + `run.day`): `core/world/board.ts`, `gameRules.board`, `MapDefinition.contract`, camp command `claimBoard { tab, id, period, day }`; `depart` takes the device `day`. One camp board with tabs รายวัน/รายสัปดาห์/สัญญา/งานค่าย (`src/ui/quest-board.ts`); the six NPC side quests stay one-time.
- 3 daily + 5 weekly tasks with `alt` ways; progress counted automatically when a run settles (`settleBoard`) or a sweep is made (`sweeps` only); missed days open ≤2 catch-up sets (excess fills the oldest); claim once per period, daily window 3 days, last week claimable through this week; six `job-*` contracts checked on completed runs only (OD-37), once a week each at the best map's reward; swift limits 18/30/90 steps from the probe `tests/probe/p0506-board.test.ts`.
- Tests: new `board-p05` (12) + browser `quest-board-p05.spec.ts` (390px); existing quest-board specs open the camp tab; unit suite, typecheck/lint/build; `npm run sim` 29/29 (no report change). [Validation](../validation/p05-06-2026-11-15/README_TH.md).
- Open (owner review): contracts auto-checked (no accept step), fixed task set, catch-up/claim windows, reward budget with P04-06; P09 must replace the device day with server time + period receipts before OD-13.

## 2026-11-15 — P05-05 sweep prototype (Opus; branch claude/beautiful-pascal-7otow6, PR #254)
- Owner answered the P04-05/P05-04 questions "ทำตามที่แนะนำ" → OD-39 (keep catch-up EXP 115%/130% + campfire 70%, recheck in P06), OD-40 (hard non-boss fights that lose to blind attacks count as OD-35; elites not strengthened), OD-41 (hard rewards unchanged, no extra ore/gold). No code change from these.
- Runtime (offline prototype, draft numbers, save v62 with optional `Profile.sweep`): `core/world/sweep.ts` + camp command `sweep { mapId, hard, day, serial }`. Cleared maps only (hard row needs `clearedHard`), 1 supply per sweep (6/day, kept to 18), 3 per map per day shared by normal and hard, fixed per-map table (`sweepReward`: ore/gold/dust/small tomes ≈ a third of a quick run; hard = same ore/gold, +1 tome). All or nothing; a full store refuses; `serial` ≠ `sweep.count` → `stale` (no double pay). No EXP/items/shards/cores; quests, `choices`, `storyQuests`, counters, market and board untouched. No World Boss sweep.
- `day` is the device's calendar day (clock set back gains nothing; forward is not trusted). The dev API accepts it as sent: server time + ledger are P09 work before OD-13 testing.
- Tests: new `sweep-p05` (12) + browser `sweep-p05.spec.ts` (390px), full unit suite, typecheck/lint/build, `npm run sim` 29/29 (no report changed; sweep is outside the sim paths). Yardstick probe `tests/probe/p0505-sweep.test.ts`. [Validation](../validation/p05-05-2026-11-15/README_TH.md).
- Open (owner review): shared normal/hard limit at equal cost, no EXP/items from a sweep, table/supply numbers (with P04-06 farm budget and P05-06 board). Not tried on real devices or against the deployed dev API.

## 2026-11-15 — P05-02 cross-run story state (Opus; branch claude/p05-02-story-state, PR #253)
- Owner answered the P05-01 questions "ทำตามที่แนะนำ" → OD-36 (traveller on map 1), OD-37 (contracts never penalise), OD-38 (market `contract` shown as ใบเรียกตัวซ้ำ, id kept). P04-05/P05-04 questions still open; nothing applied there.
- Runtime (draft numbers, save v61, all fields optional): `quest.optional` on maps 1–2 never seals the boss (`bossSealed`), pays once on a run that comes home (`Profile.storyQuests`); traveller `guide`; abandoned camp on map 2 (`shelter`/`search` 40% fight/`pass`); `Profile.choices` flags + `last.events`/`last.story` → `campLines`; run counters `choices`, `downed`. Map versions unchanged (rows same).
- Tests: new `story-p05` (12) + browser `story-p05.spec.ts` (390px), unit 1839, typecheck/lint/build, `npm run sim` 29/29 (forest boss arrival HP 72→64%, all rows 100%). [Validation](../validation/p05-02-2026-11-15/README_TH.md).
- Open: contract N/rewards for P05-06; abandoned-camp art (uses faded bandit prop, Claude pick).

## 2026-11-14 — P05-01 activity inventory (Sonnet; branch claude/p05-01-activity-inventory)
- Docs only: [ACTIVITY_INVENTORY_TH.md](../design/p05/ACTIVITY_INVENTORY_TH.md) lists what exists (6 camp side quests, 7 guides, map-3 rift seal only, 5 event kinds / 8 placements: map1 0, map2 2, map3 6, no contracts; shop item `contract` is a duplicate purchase, a name clash) and marks reuse/adjust/add against 3/6/6.
- Proposal: story quests map1 explore (3 chests, add), map2 choice (traveller+shrine events, add), map3 reuse seal; events 3 reuse / 2 adjust (shrine text, traveller second choice) / 1 add (abandoned camp); 6 contracts all new (fast, explorer, no-fight events, small team, no one downed, herb carry) — no "kill N" ones.
- P05-02 must decide: optional (non-gating) quest field, cross-run choice flags (save migration from v60), counters for event choices and downed members, contract rewards/N from simulation. No runtime/save/test change; `git diff --check` only.
- Owner questions: one traveller on map 1? contracts penalty-free? rename shop "contract" label? Owner P04-05 / P05-04 questions still unanswered, nothing applied.

## 2026-11-14 — P05-04 rest/defeat/hard-mode review + hard trait merge (Opus; branch claude/p05-04-hard-rewards)
- Measured (new `tests/probe/p0504-hard.test.ts`; bench `BENCH_HARD=1 BENCH_REPLAYS=n`): wipes are rare (normal #1 casual rush 8%, hard #1 2–4%); a hard boss loss mostly sends the party back to camp with the reserve. Hard warden per attempt: casual rush 22/79/98% after 0/1/3 normal replays, explorer 75/96/100%, blind ≤15% — a real first challenge that eases with replays (OD-35).
- Hard pays like a normal replay plus ~2 tomes, 1 rift core (the Lv5 key), +0.5–1.5 epic+ items and the one-time 30 gold/20 shards; no number change. Owner P04-05 question still unanswered, so nothing applied there.
- Fix: `hardEncounter` replaced a foe's own traits, so the veil golem lost its P05-03 bark on hard; hard traits now add to them (`mini-veil-golem` v10→v11, the only encounter whose hard form changes). Hard golem blind attacks rush 25→11%, explorer 68→58% (no replays).
- Report pointer: `npm run sim` writes `docs/validation/roster-30/batch-1/CAMPAIGN.md` (rows count attempts); the 11-08 `balance-sim/CAMPAIGN.md` is labelled frozen; CLAUDE.md index fixed.
- Tests: p05-boss-bark +1, `npm run sim` 29/29 (no new baseline), unit 1827, typecheck, lint, coverage:presentation pass. [Validation](../validation/p05-04-2026-11-14/README_TH.md).
- Owner questions: P04-05 forest cost; hard non-boss fights fall to blind attacks 61–100% (accept like OD-35?); hard ore/gold premium (e.g. 125%) or keep.

## 2026-11-14 — P04-05/06 pacing: catch-up EXP + campfire 70% (Opus; branch claude/p04-05-pacing)
- Measured first (new `tests/probe/p0405-pacing.test.ts`, sim `hooks`): casual rush enters the rift at camp Lv4–5 and its failures are the walk back from the mini-boss at 30–60% HP into a random fight 2–3 levels up. Fatigue thresholds, reserve heal, relight 3→2 and field reserve swaps were not the bottleneck (field swap hurt: the party pushes on instead of resting).
- Changes (draft, no save/boss change): `expPercent` 2 levels under 115% (was 100), 3+ 130% (was 110); `camp.restHealPercent` 50→70.
- Campaign: casual rush rift #1 83→96%, advisor rush 92→100%, casual explorer forest #1 71→81%, advisor explorer forest 92→100%. Cost: blind attacks win the forest boss more for rush companies (casual 12→34%, advisor 0→25%); advisor gate holds.
- Tests: `npm run sim` 29/29 (gate without a new baseline), unit/typecheck/lint/build pass; levels/world tests follow the new numbers. [Validation](../validation/p04-05-2026-11-14/README_TH.md).
- Owner questions: accept the forest blind-attack cost or use the campfire alone; recheck with P06 camp-level caps.

## 2026-11-14 — P05-03 veil golem bark (Sonnet; branch claude/p05-03-golem)
- Content only (draft): `mini-veil-golem` v9→v10 wears the `veilguard` bark (barkRules), weaver chip 50%, golem announced moves ×1.8 (22→40, 30→54). Map 1 captain unchanged (blind 0%; Guard/Bash, Ward from Eira, Mark from Lyra).
- Bench first tries blind attacks rush 63→11%, explorer 92→19%; casual 97→96 / 100→100, keep 79→79 / 91→89, advisor 98/100 unchanged. Campaign mini blind (with replays) 86→73%.
- Tests: campaign-sim 5/5 (no fixture change), other 7 sim files, unit 1805, typecheck, lint, coverage:presentation pass; p05-boss-bark +golem. [Validation](../validation/p05-03-2026-11-14/README_TH.md).
- Open: P04-05/06 fatigue/reserve-swap + pacing (OD-34).

## 2026-11-14 — P05 enemy difficulty: boss bark + chip shift (Opus; branch claude/p05-enemy-difficulty)
- Measured first (new bench of captured boss states, `tests/probe/p05-*.test.ts`): casual rift #1 failures = rift warden + arriving hurt; helpers' unanswered chip cost every style the same, bosses' announced moves split advisor from blind attacks; the Briar Lord fell to blind attacks only narrowly (end HP 8–33%).
- Changes (content only, draft): `veilguard` bark on Briar Lord (v11) and rift warden (v21) on normal mode at the hard-mode numbers (answer: Aira's Mark from the prologue, acid, dispel); warden wisps 70%; tusk chief (v8) sprite −25%, charges +25%; briar stalker −20%, lord moves ~+10%. No save/rule change.
- Campaign before→after: casual rush rift #1 71→79%, explorer/casual forest #1 58→71%, advisor rush rift #1 83→92%, casual hard #1 90→98%; blind attacks forest boss 42–71%→0–46%, map 3 gate first try 57/85%→23/65%. Cost: explorer/advisor forest #1 100→92 (one seed, random fight after a changed path) → gate baseline rebuilt with reason; rush/casual forest #1 96→92.
- Tests: new p05-boss-bark (7); warden route HP fixture; class-sim main/off tolerance 0.5→1 pt (Lio support/speed ties off gear, 86/86). campaign-sim 5/5, other `npm run sim` suites, typecheck, lint, unit, coverage:presentation pass. [Validation](../validation/p05-2026-11-14/README_TH.md).
- Owner questions in the validation note: further rift #1 gains belong to level pacing/campfire; map 3 gate in Lv10 replays still falls to blind attacks 78–91%; no 390px clip of the bark yet.

## 2026-11-14 — P04-04b sim gates (Sonnet; branch claude/p04-04b-sim-gates)
- Tooling only (OD-32): casual campaign companies 48 seeds (advisor 12), gate scales cell/group counts, fixture rebuilt from base 444f06b; character-sim passes camp EXP/clears to rosterMap, CHARACTERS.md regenerated (clears/builds unchanged, HP 41 cells slightly changed).
- Tests: campaign-sim 5/5, character-sim 4/4 (SIM_REPORT=1). Details: docs/validation/p04-04b-2026-11-14/README_TH.md.
- Open: casual rift #1 ~71% (P05).

## 2026-11-14 — P04-04 low-star role check + rift #1 recheck (measurement only)
- Branch `claude/p04-04-low-star-sim` → PR. No rule/number/save change. New `tests/sim/low-star-sim.ts` + `tests/low-star-sim.test.ts` (in `npm run sim`; `STRESS=1` = no gear, camp −2); `rosterMap` takes an optional camp EXP/clears/hard.
- 15 classes, team of five (companions ★3), maps 1–3 + hard: subject ★1/★3/★5 clear 180/180/180 everywhere, ★1 never falls, ★1/★5 own output 0.69–1.04 (median 0.82–0.91; stats alone 0.76–0.80) → OD-01 holds. Hard without gear fails at every star alike.
- Rift #1 rush/casual 9→7 was noise: same arrival level/stars per company, +1 tree point not −; 48 companies 32→34 (P04-02→P04-03), advisor 45→45. Casual ~70% at the rift predates P04-03.
- Found: `character-sim` traversal starts at camp Lv1 (no `campXp`), so CHARACTERS.md overstates "map level".
- Proposals for owner (none applied): keep stars; 48-company casual campaign gate/baseline; fix character-sim camp level; casual rift with P05; fatigue/reserve swap check later. Details: [validation](../validation/p04-04-2026-11-14/README_TH.md).
- Tests: typecheck, lint, low-star gate under SIM_REPORT=1.

## 2026-11-14 — P04-03 tree points off stars (save v60) + PR #241 browser fixes
- Owner first asked for the whole-chapter picture (10 maps, node levels, level caps, hit games) → [TREE_BIGPICTURE_P04_03_TH](../design/p04/TREE_BIGPICTURE_P04_03_TH.md); then “ดำเนินการตามที่คุณแนะนำได้” → OD-27–OD-30.
- Branch `claude/p04-03-tree-points` (on top of P04-02) → PR. `talentPoints(map, level, clears)` = camp Lv2–10 + 1 per map in `Profile.cleared`; a run carries `clears`; stars/hard give none. v60 resets an over-allowance tree free (`Profile.treeReset` notice in the tree page), keeps other builds, lets a run in progress finish and resets at settle; `upgradeStoredGame` does the same for server games.
- Tests: typecheck/lint/unit pass (new `tree-points` 8, exhaustive build counter `tests/sim/tree-points.ts`); `npm run sim` 28/28 after refreshing the C12 campaign baseline (total 224→224; rush/casual rift #1 9→7 companies) and the tome floor 1.5→1.4. Details: [validation](../validation/p04-03-2026-11-14/README_TH.md).
- PR #241 (P04-02): browser gate was red on stale expectations only (ore 15, seal→3 shards, fees 10 shards, `seal-list` class, v59 import note); fixed in `tests/browser`.
- Open: OD-29/30 content (personal branches for 10 characters, tier 4, level caps) at P06; no load-time dialog for the reset notice; P04-04 low-star role check.

## 2026-11-13 — P04-02 character + universal shards (save v59)
- Owner “ตามที่แนะนำ” on P04-01 → OD-23–26 (ore 160, shard set A, OD-07 from account start, core five 35–45). Branch `claude/p04-02-shards` (on top of P04-01 #240) → PR.
- Stars cost own shards 10/20/30/40 (+ ore 15/30/45/70); universal shards (`bank.shard`) pay any of the rest; seals removed (loot seal → 3 shards, quests/hard ×10, market pack 10/60 gold once per return, forge fees 10); first normal clear +10; ★5 duplicates → universal; owned story recruits paid once (`profile.storyShards`). Save v59 converts dupes/seals ×10; the server converts DO-stored games when read (`upgradeStoredGame`).
- Tests: typecheck/lint/unit all pass (new `shards-p04` 8), Playwright `star-upgrade` 15/15, `npm run sim` 28/28 after refreshing the C12 campaign baseline (14 equal/3 up/3 down, total 1859→1867; stars equal or higher). Details: [p04-02 validation](../validation/p04-02-2026-11-13/README_TH.md).
- Open: P04-03 tree points (12 vs 15), shard art (uses the seal painting), real devices.

## 2026-11-13 — P04 owner choices + P04-01 star pacing simulation
- Owner “ตามที่แนะนำทั้งหมด” on P04-00 S1–S8 → OD-15–OD-22 in OWNER_DECISIONS. Branch `claude/p04-01-sim` → PR.
- [P04-01 validation](../validation/p04-01-2026-11-13/README_TH.md): stdlib Python model in sessions (character shards, 100% universal fill, run/first-clear/weekly-shop sources, ore kept, no gacha), 30 sets × thin/standard × 5 schedules × 1,000 accounts. Thin ore income caps the first ★5 at ~12 sessions; sets A/B meet OD-07 with core five ≈37–39. Tree points: boss win = map clear today, so OD-20 gives 12 (15 with hard clears).
- Docs/analysis only (`git diff --check`); no rule/number/save change. Open: owner picks star ore, shard set, OD-07 counting point, core-five target.

## 2026-11-13 — P04-00 economy/stars scope sheet + Pages server default
- Owner “ข้อ 1” → PR #238 merged: Pages build presets `VITE_FATEWEAVE_API` (dev Worker), so the home-screen app and browsers start in server play; `?server=off` still opts out. P09-03 PR #237 merged after full CI.
- Owner “ยืนยัน ทำ P04-00”; branch `claude/p04-00-scope` → PR. [SCOPE_P04_00_TH](../design/p04/SCOPE_P04_00_TH.md): settled decisions, what the code does now (stars +8%, dupes 1/2/3/4 + ore, seals ≤50%, tree points still `(Lv−1)+(★−1)`, camp cap 10, no milestones), system choices S1–S8 with recommendations, player models, P04-01…06 order (05/06 runtime waits for the ledger).
- Docs only (`git diff --check`); no rule/number/save change. Open: owner answers S1–S8; privacy contact, test date T, admin row, consent publish.

## 2026-11-13 — P09-03 credential rotation + id-free telemetry + in-game feedback
- Owner “ยืนยัน ทำ P09-03 ต่อได้เลย”; branch `claude/p09-03-telemetry` → PR into `feature/fateweave-initial-prototype` (P09-02g was #236, merged).
- Rotation: `/v1/token/rotate` (device makes the next credential, stores it first; server keeps the old secret 10 min; client rotates every 24 h, recovers a lost answer without a new guest). D1 `0006` adds device `prev_hash/prev_until/rotated_at`, `telemetry_daily`, `feedback`.
- Telemetry: server-derived daily totals (session, commander, run start/end, battle result) via an internal DO→Worker header written after the answer; device error codes from a fixed list (`/v1/telemetry`). No account id/device/IP stored.
- Feedback: dialog from the title and world/battle settings (`/v1/feedback`, 3 per 10 min, purged with the account); admins see latest feedback and 14-day totals (`/v1/admin/*`, audited). Privacy page updated.
- Tests: typecheck/lint/unit/build; new `server-telemetry` (6); Playwright `server-play` 6/6 (Chromium 390px; feedback form/admin screenshots checked); smoke adds rotate/report/feedback. Details: [TELEMETRY_P09_03_TH](../design/p09/TELEMETRY_P09_03_TH.md).
- No rule/number/save v58 change. Open: privacy contact line, test date T, owner admin row, consent publish, inactive guests, old-token reuse detection.

## 2026-11-13 — P09-02g account deletion + privacy page + shared rate limits + dated import close
- Owner “ยืนยัน ใช้ 14 วันตามที่เสนอ”; branch `claude/p09-02g-account-safety` → PR into `feature/fateweave-initial-prototype`.
- Deletion: `/v1/account/delete` (`{confirm:'delete'}`, typed “ลบบัญชี” in the panel) → `deleting` + 14-day `delete_after`, other devices revoked; game routes 403 `account_deleting`; `/v1/account/cancel` until the deadline (also after Google/code sign-in on a new device); hourly Cron purges DO (`deleteAll`) then D1 rows; D1 `0005` `account_audit` (id/action/time only).
- `public/privacy.html` (Thai) linked from the title and account panel. Rate limits: per-account game counts in the account DO, IP/account-route counts in a `RateLimit` DO per key (IPv6 /64), isolate filter kept, fail-open. `LEGACY_IMPORT_UNTIL` auto-close + T−28/−14/−7 plan.
- Tests: typecheck/lint/unit all pass/build; new `server-safety` (8); Playwright `server-play` account tests 2/2 (Chromium 390px; delete-confirm/deleting/privacy screenshots checked); Worker dry-run bundles with `LIMIT`. Smoke adds delete/cancel. Details: [SAFETY_P09_02G_TH](../design/p09/SAFETY_P09_02G_TH.md).
- No rule/number/save v58 change. Open: owner contact line on the privacy page, date T for import close, token rotation, consent publish, inactive-guest cleanup, real devices.

## 2026-11-13 — P09-02f incremental battle in DO + admin-only verify + sign-out
- Owner “ทำ P09-02f”; branch `claude/p09-02f-perf` → PR #233 merged into `feature/fateweave-initial-prototype`; dev deploy (cloudflare-dev run 33) smoke OK.
- `core/command/battle-memo.ts`: DO keeps resolved turns, a `battle` command resolves only new ones via `resolveCommand` (optional `CommandContext.battles`/`BattleReplay`; full replay on any mismatch); `/verify` uses a fresh memo. `sqlStore` no longer clones the immutable command book per load/commit.
- `/v1/verify` admin-only: D1 `0004_admin_audit.sql` (`admins` rows added by owner via `wrangler d1 execute`, no secret; `admin_audit` per check; `{accountId}` audits another account). `/v1/sessions/revoke` (`this` warns `unrecoverable`, `others`) + account-panel buttons.
- Workers CPU: DO command p50 3 / p95 6 / max 12 ms (was 7/19/24), verify 1–2 ms (was 215), import 8 ms. Node: long-battle turn 47 ≈19→3.5 ms.
- Tests: typecheck/lint/unit 1787/build; new `server-perf` (6); Playwright `server-play` 4/4 (Chromium 390px, sign-out screenshot checked); CI quality+browser green. Details: [PERF_P09_02F_TH](../design/p09/PERF_P09_02F_TH.md).
- No rule/number/save v58 change. Open: owner admin row, D8, close import, account delete/privacy, token rotation, real rate limits.

## 2026-11-13 — P09-02e one-time local-save import (owner D11) + DO log snapshots
- Branch `claude/p09-02e-import` → PR into `feature/fateweave-initial-prototype`.
- Worker `/v1/import`: `checkUpload` (size/SHA-256/version 1–58), D1 fingerprint claim first (migration `0003_legacy_import.sql`, unique), DO `importSave` (`decideUpload` + `parseGame` replay, raw save kept, import snapshot); 201 / 403 import_closed (`LEGACY_IMPORT` var) / 409 already_imported·fingerprint_used·has_game / 413 / 422; fingerprint released when DO refuses.
- DO `snapshots` every 50 seq + run end; `/v1/verify` replays from the latest (`{ok, seq, from}`). Client `ServerClient.importSave` (requestId from the save hash), title offer in server play (390px checked).
- Tests: typecheck/lint/unit 1781 pass/build; new `server-import` (6), client import test, Playwright `server-play` 4/4 (Chromium 390px). Not measured on Workers; no real-device test. Details: [IMPORT_P09_02E_TH](../design/p09/IMPORT_P09_02E_TH.md).
- No rule/number/save v58 change (only `SAVE_VERSION` exported). Open: close import before OD-13, admin-only verify, incremental battle, sign-out/revoke.

## 2026-11-12 — P09-02d Google sign-in + recovery codes + account moves (owner D1)
- Owner “ดำเนินการต่อได้เลย”; branch `claude/p09-02d-google` → PR #229 into `feature/fateweave-initial-prototype`.
- Worker: `src/server/google.ts` (RS256 ID token vs Google JWKS, iss/aud/azp/exp/iat), `accounts.ts` link/sign-in/recovery (D1 migration `0002_identities.sql`, sub only, code hash only, one-time, device-made credentials for idempotent retries), routes `/v1/account|link|signin|recovery-code|recover`; `GOOGLE_CLIENT_ID` var.
- Client: `ServerClient` account methods, `platform/google-identity.ts` (GIS popup), `ui/account-panel.ts` (title button; never merges, switch with warning), `ui/save-place.ts` server save labels.
- Measurement: `tests/server-measure.test.ts` (+ deploy workflow vs real Worker with Tail CPU by route). Node: verify 180–210 ms @300 cmds, ≈1 s with 47-turn battles; long-battle turn ≈20 ms.
- Tests: typecheck/lint/unit 1774/build; server-account 8; Playwright server-play 2/2 (stub GIS, 390px); smoke vs local wrangler dev (real JWKS fetch). Real Google click and mobile browsers untested. Details: [ACCOUNT_P09_02D_TH](../design/p09/ACCOUNT_P09_02D_TH.md).
- No rule/number/save v58 change. Open: D11 import (next), snapshots/admin-only verify, incremental battle, camp-side account button, sign-out/revoke, consent screen publish before OD-13.

## 2026-11-12 — P09-02c follow-ups: smooth server-play walking, smoke rollout wait
- Owner tried the dev Worker on a phone (“ใช้ได้ แต่จังหวะเดินเหมือนจะหน่วงๆ”) and asked for the walking fix before P09-02d (#229 held until this merges). Branch `claude/p09-02c-walk-lag`.
- Server play: steps move the token at once (landing tile checked locally with the same rules; findings shown only from the server answer), refused steps are not sent, steps/battle turns don't lock the screen (note after 0.9 s), one tapped step is buffered; recruit scenes no longer replay after entering. #228: `cloudflare-dev.yml` waits for the new Worker version and fails on smoke failure (the #227 run had hidden one: rollout race); smoke now passes on the real Worker.
- Tests: unit 1766 pass, lint/typecheck, `server-play.spec.ts` 2/2, world movement/prologue/draft specs pass. Details: [CLIENT_SERVER_P09_02C_TH §2b](../design/p09/CLIENT_SERVER_P09_02C_TH.md). Proposed next after P09-02d: loading screens + prefetch, measured with `?perf=1` on a phone first.

## 2026-11-12 — P09-02c game shell talks to the dev API (switch, off by default)
- Owner “ดำเนินการต่อได้เลย”; branch `claude/p09-02c-client-server` → PR into `feature/fateweave-initial-prototype`.
- `src/platform/server-client.ts` (`ServerClient`, `serverSwitch`): guest token per API URL, per-page session id, one `{requestId, seq, command}` at a time, retries on the same requestId/seq (lost answer, 5xx, 429), 409 stale/gap → reread state, 423 → other device, content version from `__CONTENT_VERSION__` (vite define from `scripts/content-version.mjs`, now importable).
- `game-shell.ts`: every command is `exec(cmd, then)` — local unchanged (sync), server mode locks all views (`inert`), shows a wait note/problem card (`src/ui/server-play.css`), adopts `view`/`events` via `src/ui/server-game.ts`, never touches the local save; battle turns queue, leaving waits for the last answer.
- Server D12: `POST /v1/session` claims the account for a session (`X-Fateweave-Session`, DO table `session`); other sessions get 423 `other_device`; smoke script covers it.
- Tests: `tests/server-client.test.ts` 7 (client vs real Worker+DO in process, fakes moved to `tests/fixtures/server-fakes.ts`), server-api +1, `tests/browser/server-play.spec.ts` (390px: 423 card, lost answer retry, inert lock, no local save, reload resume); typecheck/lint/unit 1766 pass/build; local world+combat+rewards specs re-run. Details: [CLIENT_SERVER_P09_02C_TH](../design/p09/CLIENT_SERVER_P09_02C_TH.md).
- No rule/number/save v58 change. Open: server-mode save labels, UI types → ClientProfile/ClientRun, Google sign-in (next prompt; client ID from #226), D11 import, long-battle/verify CPU, live test against the deployed Worker.

## 2026-11-12 — P09-02b Worker + per-account DO + D1 (dev, not wired to UI)
- Owner “เริ่ม P09-02b”; branch `claude/p09-02b-worker-do-d1` → PR #225 into `feature/fateweave-initial-prototype`.
- Step 1: `cloudflare-probe.yml` proved the existing secret creates/queries/deletes D1 and deploys/deletes a Worker with a SQLite DO (throwaway resources removed).
- `src/server/`: Worker front door (`api.ts`: /health unchanged, /v1/guest, /v1/state, /v1/command, /v1/verify; size/media/content-version/auth/rate limits/CORS), DO `GameAccount` (`account-object.ts`) over pure `GameHost` (`game-host.ts`: `processCommand`, crypto seeds logged, state+book+log in one `transactionSync`, `replayLog`), D1 guests with token hashes (`accounts.ts`, `cloudflare/migrations/0001_accounts.sql`). Content version = `scripts/content-version.mjs`.
- `cloudflare-dev.yml` now tests, finds/creates D1 `asterveil-dev`, migrates, deploys, runs `cloudflare/smoke.mjs` + Workers Tail CPU on game-branch pushes; old `index.mjs` probe removed.
- Tests: `tests/server-api.test.ts` 8 (node:sqlite fakes); typecheck/lint/unit 1758/build pass; local `wrangler dev` and deployed dev Worker smoke OK. Numbers: SERVER_P09_02B_TH §5 (~3 KB/command; Workers CPU: Worker 0–2 ms, DO command 1–6 ms).
- No rule/number/save v58/UI change. Open: P09-02c, Google OAuth client from owner, D11 import, D8 plan, log snapshots, real rate limiting; Wrangler printed the account name in early probe logs (filtered since).

## 2026-11-12 — P09-02a2 seed-free client view + command envelope (local)
- Owner “อนุมัติตามที่คุณแนะนำ ดำเนินการได้” after #222; branch `claude/p09-02a2-client-view` → PR into `feature/fateweave-initial-prototype`.
- `src/core/command/client-view.ts`: `clientView(game, {home, lookup})` drops `profile.seed/forge`, `run.seed/rolls`, adds `hireBoard` (`boardOffers`+`hireReason` per slot); `clientEvents` strips the settled run.
- `src/core/command/command-envelope.ts`: pure `processCommand(game, book, {requestId, seq, command}, sha, ctx)` = `decideCommand` → `parseCommand` → `applyCommand`, stores 64 replies for retries; refused commands use their seq. Local shell does not use it.
- UI: `LobbyView.board` replaces `boardOffers`/`hireReason` calls in `lobby-ui.ts`; `game-shell.ts` passes it from `clientView`. Survey: no other UI reads seed/rolls/forge.
- Tests: `tests/client-view.test.ts` 11; typecheck/lint/unit 1750 passed (6 skipped)/build pass; local Playwright lobby market/hire/fit (13) + hire-shots/unlock-pacing (3 passed, 1 skipped). No rules/numbers/save v58/Cloudflare change.
- Open: leftovers + P09-02b in `docs/design/p09/CLIENT_VIEW_TH.md` §5.

## 2026-11-12 — P09 owner decisions D1/D11/D12
- Owner “อนุมัติ” on Claude's recommendations: D1 Google sign-in + recovery code, D11 import a local save once per account before the external test, D12 one device at a time. Recorded in `docs/design/OWNER_DECISIONS_TH.md` and `docs/design/p09/README_TH.md` (docs only).
- Owner “อนุมัติตามที่คุณแนะนำ ดำเนินการได้”: P09-02a2 (seed-free client view + command envelope) opened as a separate Opus session.

## 2026-11-12 — P09-02a command layer + seeds behind a port (local)
- Owner “ดำเนินการต่อได้” after P09-01 (#221); branch `claude/p09-02a-command-layer` → PR into `feature/fateweave-initial-prototype`.
- `src/core/command/game-command.ts`: 55 JSON command kinds (camp + map + `battle`), `parseCommand` shape check, pure `applyCommand(game, cmd, ctx)` calling the existing `core/world` rules; `depart` includes the prologue start, `move` to the goal / a wiped battle / `withdraw` settle in the same command.
- Seeds: `SeedSource` port (`core/command/seed-source.ts`), local `platform/seed-source.ts` keeps the old clock+Math.random generator. `placeCampMember` moved from `src/ui/camp-team.ts` to `src/core/world/camp-team.ts`.
- `src/ui/game-shell.ts` now sends every action through `applyCommand` (no other UI file changed); messages/effects unchanged.
- Tests: `tests/game-command.test.ts` 66 (equality with direct calls for every kind, JSON round-trip, malformed/rejected, replay determinism, save reload); typecheck/lint/unit 1739/build pass; local Playwright gameplay specs: see PR.
- No change to rules, numbers, save v58, Worker or D1. Seed survey and remaining server work: `docs/design/p09/COMMAND_LAYER_TH.md` (only `lobby-ui` `boardOffers` needs the seed on the device).
- Open: owner D1/D11/D12; next P09-02a2 seed-free client view (after Codex HUD work).

## 2026-11-11 — P09-01 guest account + cloud save design (no database)
- Branch `claude/p09-01-account-cloud-save-design`; owner approved starting the database-free part (“อนุมัติ ทำตามที่แนะนำ”).
- Thai design set `docs/design/p09/` (index README_TH with owner decisions D1–D9 + recommendations; account flow, cloud save envelope, trust boundary, D1/API draft). Facts from code are marked [โค้ด], proposals [เสนอ].
- Owner then chose D10 = ค (“เลือก ค.”): server decides everything, online-only, seeds on the server (recorded in OWNER_DECISIONS_TH). Main doc `docs/design/p09/SERVER_AUTHORITY_TH.md`; seeds are made on the device today (`freshSeed` in game-shell) — must move.
- Pure, unwired `src/core/cloud/cloud-save.ts`: `checkUpload`/`decideUpload` (one-time legacy import envelope), `decideCommand` (seq/idempotent retry). 11 tests `tests/cloud-save-envelope.test.ts`, incl. a bank edited to the cap still passing `parseGame`.
- No change to save v58, rules, balance, UI, Worker or D1; no secret used, nothing deployed.
- Open: owner D1/D11/D12; next P09-02a command layer for camp/map actions (local); Worker+DO+D1 needs D1 Edit/DO on the token; measure request volume/CPU before choosing the plan.

Earlier entries preserved verbatim: [2026-11-13 archive](archive/2026-11-13/CODEX-TO-CLAUDE.md), [2026-11-10 archive](archive/2026-11-10/CODEX-TO-CLAUDE.md).
