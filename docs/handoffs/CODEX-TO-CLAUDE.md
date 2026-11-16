## 2026-11-16 — P11-05 World Boss trio: design + simulation (Opus; branch claude/world-boss-trio-design)
- Design only, no game code (save v64). Includes PR #272's OD-46–49 commit (names, 5 shared attempts, items, offline shards); the OD-46 id collides with main's external-test OD-46 (open question 2).
- [WORLD_BOSS_TRIO_P11_05_TH.md](../design/WORLD_BOSS_TRIO_P11_05_TH.md): Kragmor (existing rules: veilguard, charge→unstoppable, quake), Valdrakk (new R1 breakable charge: a cancelled charge staggers the dive), Morvane (new R2 court: +10% per standing minion, a move that calls downed minions back); encounters `wb-*` v1, no other bumps.
- Rewards: attempt ore 4/gold 2 + 3 boss shards; p-2/p-4 one universal shard + 2/3 boss shards; per-boss s-50/s-100 online only. Items body `bulwark`/gloves `breaker`/head `reaper` (Lv11 legendary, 40 shards + 30 ore + 10 dust, chosen affixes/set, no RNG). Budget 76 tradeable + 38 in boss shards → 1195 ≤ 1200.
- Save v65 plan (per-boss book, `legacy` warden week, `bossShards`, new `Item.boss` values), one DO with three bars, receipts `wb:w<W>:<boss>:s-50`, HP = last week's attempts on that boss × 400 (min 1500).
- Probe `tests/probe/p1105-world-boss-trio.test.ts` (TRIO_OUT): [validation](../validation/p11-05-2026-11-16/README_TH.md) — no instant loss for advisor play at any camp tier, visible penalties for ignoring, shared-HP falls most weeks from ~20 accounts. tsc + eslint pass; no `npm run sim`/browser (no game change).
- Open (owner): trio for the 14 Dec external test or warden first; OD renumbering; chosen-affix crafting and price; WB universal shard 3→2; HP ×400; Morvane's lower damage. Next: implementation step 1 (resolver R1/R2 + encounters, Opus).

## 2026-11-16 — Game day reset at 06:00 Bangkok (Opus; branch claude/day-reset-6am)
- Owner: "เวลารีเซ็ตวัน ตั้งไว้ 6 โมงเช้า". `GAME_DAY_RESET_HOUR = 6` in `src/server/ledger.ts` (offset UTC+7−6h; the server day, the Monday week and the World Boss week start 06:00 Bangkok = 23:00 UTC). Offline device day in `game-shell.ts` `today()` also turns at 06:00 local. No rule/number/save change.
- Tests: `server-ledger` boundary checks updated (05:59 = previous day, 23:00 UTC start); server/world-boss/shard unit tests pass; browser specs `quest-board-p05`/`world-boss-p11` use the same 06:00 day. Docs: LEDGER_P09_TH.md, CURRENT_STATE.md.
## 2026-11-16 — P12 owner decisions OD-46: external test T = 14 Dec (Opus; branch claude/p12-owner-decisions)
- Owner: "ให้บัญชี guest ก็พิมพ์ได้ ที่เหลืออนุมัติตามแนะนำ" → OD-46: T = 2026-12-14, `CHAT_WRITE=all`, Cloudflare Free first, 10–20 known invitees, draft numbers kept, load workflow added to `main`.
- `cloudflare/wrangler.json`: `LEGACY_IMPORT_UNTIL` = 2026-11-30T00:00:00+07:00 (T−14, closes itself); T−7 switch to `closed` is the next session's job. Checklist + CURRENT_STATE updated; `git diff --check`.
- Load workflow added to `main` (#268) and run on Cloudflare: passed on all 4 runners ([results](../validation/p12-load/README_TH.md)); staging Worker/D1 deleted.
- Open (owner): privacy contact text, `accountId` for the admin row, Google consent Publish before 30 Nov.

## 2026-11-15 — P12 external-test readiness: Pages browser gate, staging load test, owner checklist (Opus; branch claude/p12-external-test-readiness)
- No owner comment on chat PR #261. No rule/save/number change (save v64); no payments, PvP or Co-op.
- `pages.yml`: the Chromium suite (4 shards + FX fixtures) runs on every push again and `deploy` needs `build` + `browser` (OD-13 gate restored); CLAUDE.md line updated.
- Load test `tests/server-load.test.ts` (runs only with `LOAD_URL`): guests → import a cleared-map camp save → 5 World Boss attempts each sent twice at once + `/v1/state` (outbox), chat polling 1/s and sends every 12 s; asserts HP ≥ 0 and drops by at least own damage, identical retry answers, every sent message seen, no 5xx. Workflow `cloudflare-load.yml` (manual): deploys a throwaway `asterveil-api-staging` + D1 `asterveil-staging`, 1–4 runners, then deletes both. [Plan/results](../validation/p12-load/README_TH.md).
- Local `wrangler dev` runs pass (3 accounts: 15/15 identical retries, HP matches damage, chat 19/19). Cloudflare run: see the PR/handoff below if dispatched; dev API is never the target.
- Owner checklist [EXTERNAL_TEST_CHECKLIST_TH.md](../design/EXTERNAL_TEST_CHECKLIST_TH.md): T, privacy contact, admin row, Google consent publish, `CHAT_WRITE`, chat privacy wording, Cloudflare plan, invites + open draft numbers.
- Tests: typecheck, lint, unit 1933 pass, `git diff --check`. Open: everything in checklist §1, token-reuse detection, real devices.

## 2026-11-15 — P11 chat: world channel, server + camp UI (Opus; branch claude/p11-chat)
- No owner comment on PR #259/#260. OD-13 order: World Boss done → chat (this) → external test. No rule/save/balance change (save v64), no payments, no PvP/Co-op.
- Design [CHAT_P11_TH.md](../design/CHAT_P11_TH.md): one world channel, HTTP polling 8 s, pseudonymous handle `ค่าย-XXXXX` (SHA-256 of account id), 160 chars, links/e-mail/long numbers refused, profanity masked, pace 4 s / 8 a min / 60 an hr per account (exact, in the DO) + 30/min per IP net (RateLimit gate), report ×3 auto-hide, admin list/hide/mute via D1 `admins` (audited), retention 7 d / 500 msgs (reported 30 d), purge on account deletion, owner switch `CHAT_WRITE` all|linked|off.
- Code: `core/chat/filter.ts`, `server/chat.ts` (DO `Chat`, wrangler tag v4), `server/api.ts` chat routes, `worker.ts` purge order, `ServerClient.chat*`, `ui/chat-panel.ts` + camp button `#lobby-chat` (offline disabled with reason); privacy page gained a chat section.
- Tests: `tests/chat-p11.test.ts` 14, load probe `tests/probe/p11-chat-load.test.ts`, Chromium 390px `chat-p11.spec.ts` 2 + server-play/lobby/quest/world-boss specs; unit 1933 pass, typecheck, lint, build. [Validation](../validation/p11-chat-2026-11-15/README_TH.md).
- Open (owner): draft numbers, guests writing (`CHAT_WRITE`), word list, WebSocket later, more channels; staging load test of `Chat` + `WorldBoss` DOs; Pages browser gate before external tests.
- Older entries (2026-11-11 → 2026-11-14) moved verbatim to `archive/2026-11-15/`.

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


Earlier entries preserved verbatim: [2026-11-15 archive](archive/2026-11-15/CODEX-TO-CLAUDE.md), [2026-11-13 archive](archive/2026-11-13/CODEX-TO-CLAUDE.md), [2026-11-10 archive](archive/2026-11-10/CODEX-TO-CLAUDE.md).
