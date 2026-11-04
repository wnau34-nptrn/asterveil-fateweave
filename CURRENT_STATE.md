# Current state — updated 2026-11-04

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages URL https://wnau34-nptrn.github.io/asterveil-fateweave/ through `pages.yml`; pre-release pushes deploy after lint/unit/build, with the full browser gate on PRs (owner update `aabc5dc`). Restore the Pages browser gate before OD-13 external tests.
- Save v45; 1–5 units a side (P02), shared camp Lv/EXP (P01), reserve by chapter3→4→5, fatigue, carry≤10. W1–W8/P01/P02 are published.
- UXD-01…06 published. UXD-07 unified skills (equip/level/tree/tomes), reviewed skill spending and persisted receipts merged through PR #145 as `26c5ab638ef3eac1929635e3a2c078372cb58fca`, tested head `902bbf3` from `ab06dfd`. Merge tree equals tested head. No core/content/save/schema/price/RNG/battle changes.
- PR quality1518/107 and browser348+source565+focus3 passed; post-merge quality passed. UXD-07 is complete at merge under the pre-release rule; Pages deploys automatically, with no deployment-success claim here. Validation: `docs/validation/uxd-07/README_TH.md`.

- HUD team → character navigation follow-up merged through PR #146 as `1b0616be8a31bc324a7eb447d2034e74998110cc` (tested head `fa55f22`, same tree). Direct character portraits, last-view context, persistent HUD, pre-review scroll and bag-origin restoration; PR quality1518/107 + production browser356 + source565 + focus3 passed. Validation: `docs/validation/team-hud-navigation/README_TH.md`.

- Storage ceilings in core (owner pick ค, PR #147 `claude/storage-caps-core`): `core/world/caps.ts` is the one source of the v45 limits; trades/smelt/buy/brew/claims refuse `'full'`, settle/dismiss fill to the cap. No save version/price/RNG/balance/battle change. Validation: `docs/validation/storage-caps/README_TH.md`.

## Active task

- None after PR #147 merges. No next task started.

## Next (owner picks; nothing auto-started)

- UXD-08 combined UX check/release, including real-device/human trials; UXD-07 itself does not start it.
- OD-13 after P02: P09 accounts/cloud save/telemetry+feedback/admin → P04 → server-authoritative rewards → chat + World Boss → external test. PvP async/Co-op excluded.

## Open items

- Claude questions: smelt/tome caps, stale Tremor/Slam/Rouse comments and coverage label closed by PR #147; logic audit 1–3 were already fixed (C11 v42). Owner rule choices pending: audit 4 (Heal a full-HP ally with Afterglow) and 5 (Revive levels give a barrier, not revive HP). Missing calm potion art (art task). Run-side caps (e.g. run ore 999,999) not audited.
- No real Safari/iPhone/Android or human usability results. P02-03 real-device trial pending; forest boss still falls to plain attacks with five.
- UX audit branch `codex/ux-ui-audit-2026-11-04` is archived separately; other team-layout/camp map overlay/fifth campfire actor/inventory proposals remain open; this follow-up completes HUD character navigation only.
- Art: A7-002 redraw has no Codex PR; A7-003 parked (OD-14); Kael/Wynne/Astrid pending owner confirmation; Lyra atlas above guideline. Open PRs #133 UX art/plan, #122 A7-003, #55 pets, #53 boss frames. Do not merge the Artwork branch into the game automatically.

## Workspace

- Healthy checkout `/workspace/asterveil-uxd-06-work`; original `/workspace/asterveil-fateweave` has unresolved HEAD/staged old work and is preserved untouched. Git CLI remote/push works with the configured network; no auth changes.
- CURRENT_STATE.md now exists after context restructure `ab06dfd`. No Artwork workspace; read `art/art-ui-ux-002` separately. Never import checkpoints `cc51cd4`/`bcd6133` or `codex/uxd-02-release-notes` automatically.

## Opening prompt for next chat

```text
ทำงานต่อใน wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype
อ่าน CLAUDE.md และ CURRENT_STATE.md ก่อน ตรวจ remote head/ancestry และ worktree จริง
งาน: <เจ้าของเลือก> ตอบไทย ไม่เริ่ม UXD-08/P04/P09 อัตโนมัติ ไม่ reset งานเดิมหรือรวม Artwork/checkpoints เอง
```
