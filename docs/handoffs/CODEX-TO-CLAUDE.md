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
