# Current state — updated 2026-11-21 (P11-05 go-live check)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`, which again runs the Chromium suite before deploy (P12).
- Save v65 (P11-05 trio book/boss shards/trio items; v64 World Boss book; v63 board book); Phaser/TypeScript/Vite, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet. P09 server authority, ledger, weekly shards done (`?server=off` for local; [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)).
- Perf: R1–R11 merged (`docs/validation/perf-r*-2026-11-20/`, `?sw=off` clears the R8 cache). Image-blank fix (2026-11-21, B1/B2/B3/B6): screens wait ≤1.8 s for decoded main images, next screen prefetched, title preload, saved battle prefetched after 2.5 s on the title (drafts) ([validation](docs/validation/image-blank-fix-2026-11-21/README_TH.md)). B4/B5 built on `claude/image-blank-b4-b5` (PR open, waits for the owner's own approval of the images: blurred placeholders + lossy map atlases, [validation](docs/validation/image-blank-b4-b5-2026-11-21/README_TH.md)); battle decode ~6–7 s at CPU 4× (check on a phone).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3.
- Title uses the original party artwork with a compact primary dock and top-right Setup for audio, save details, account/recovery, feedback, privacy and restart. Import stays the primary action while a local-save offer is available.
- Art delegation remains: record agent picks as agent decisions, never owner visual approval.

## OD-13 status

All online systems before outsiders are built. External-test items (OD-50 dates, E2–E4, `LEGACY_IMPORT`) are parked: owner 2026-11-18 “ไม่ต้องสนใจเส้นตายทดสอบภาพนอกอะไรนั่น”; do not raise them as gates. [Checklist](docs/design/EXTERNAL_TEST_CHECKLIST_TH.md) stays for reference.

- Staging load test ([plan](docs/validation/p12-load/README_TH.md)): workflow `Cloudflare staging load test` (manual; dispatch with ref = game branch) deploys a throwaway `asterveil-api-staging` + D1, runs `tests/server-load.test.ts`, deletes both. Input `trio=now` starts the trio on the staging copy only. Never aim `LOAD_URL` at the dev API.
- World Boss: **OD-52 (2026-11-18): the trio Kragmor/Valdrakk/Morvane replaces the Warden from week 2969 = Mon 23 Nov 2026 06:00 Bangkok** (`trio.from`, PR #301). Week 2968 is the last Warden week (its claims stay open a week). Draft numbers unchanged: 400 HP/attempt (min 1500), first trio week HP = Warden attempts ÷ 3 × 400, Call the Court as is. Pre-fight guides on all three; optional Morvane coach. [Go-live evidence](docs/validation/p11-05-go-live/README_TH.md); [readiness check 2026-11-21](docs/validation/p11-05-trio-check-2026-11-21/README_TH.md) passed (pinned clock + staging). #292 stays separate and unmerged.
- Enemy aim **OD-53** (2026-11-19): pack front-row foes, bosses aim lowest HP% every third move, Ember Slime/Spore Puff chase supports; labels on moves. Casual explorer map-2 first clear 88% → 79% (gate ok); drop Spore Puff `assassin` first if testers find map 2 heavy. [Proposal + results](docs/design/ENEMY_AIM_PROPOSAL_TH.md).
- Lessons after the prologue **OD-54** (2026-11-19): camp Lv2 after the prologue, gear/tree open at once, one free calming draught; ring+bubble lessons on the map/first battle/first camp (`ui/lessons.ts`). Stage C (camp cards and newly opened systems point at their controls), a Setup on/off toggle and the farming lessons (replay, sweep, hunt target, boss target; owner “ทำทั้ง 4 ข้อเลย”) done. [Design](docs/design/TUTORIAL_FLOW_TH.md).
- Chat (#261): owner open numbers, `CHAT_WRITE`, word list, WebSocket. **OD-55**: translucent camp feed (off by default), hidden-camps list. **OD-56** (2026-11-19 “เพิ่มระบบเพื่อน และ chat 1:1”): server friend system (codes, requests, account-wide block, D1 0007) + 1:1 chat for mutual friends in the `Chat` object, “เพื่อน” tab + camp unread badge, flag `FRIENDS` (default on); drafts 50 friends, 2 s/20 per min, 7 d/200 per room ([design](docs/design/FRIENDS_TH.md)). Guild chat stays closed (no guilds).
- P09 open: inactive-guest cleanup, old-token reuse detection. Day reset 06:00 Bangkok. P04-06/shards owner numbers open. P04-05 catch-up EXP recheck with P06. Deploy grace **OD-57**: the API takes the previous content versions for 3 h after a deploy (`[no-grace]` ends it); open pages show a refresh bar ([design](docs/design/p09/CONTENT_GRACE_TH.md)).
- Gacha: G00/G01 analysis delivered (`docs/design/GACHA_G0*`); owner wants system/visual discussion first. No G02–G05/payments; real gacha needs the server wallet on the ledger.
- UXD-08 done; real-device/human trial and team-preset usability review open.

## Open items

- Skill step6 notes (Challenge unused by advisor, Rouse ΔHP−8.6): skill-rework validation.
- Map 3 Briar Lord gate: first try falls to blind attacks 23% (rush)/65% (explorer); Lv10 replays 78–91% accepted (OD-35). No real Safari/iPhone/Android or human usability validation.
- Pending intake: #262 Warden banner, #169 continent. Compact title is implemented from the owner mockup; #234 remains a separate proposal. #55 pets/#53 later bosses wait systems; #122 parked (OD-14). #133 UX and #165 poses have game implementations. Lyra atlas above guideline.

## Workspace

Preserve unpushed/gacha work.

## Opening prompt for next chat

Owner picks. P11-05 readiness check done (nothing to do before the switch). Image-blank B4/B5 PR waits for the owner's image approval, then merge. After Mon 23 Nov 06:00 Bangkok: confirm the trio on the dev API (`/v1/worldboss` three bars).
