# Fateweave development instructions

This file holds lasting rules only. It is loaded into every Claude Code session, so keep it short (`tests/agent-context.test.ts` enforces the size). Current state lives in [CURRENT_STATE.md](CURRENT_STATE.md); dated release notes go to the handoff log, never here. The full pre-2026-11-04 text of this file (release notes for C5.x, A2–A10, W8, P01, P02, Aegis, Lyra, song/shadow) is preserved verbatim in [docs/handoffs/archive/2026-11-04/CLAUDE.md](docs/handoffs/archive/2026-11-04/CLAUDE.md); open it only when a task needs that history.

## Start of a session — read only what the task needs

1. This file and [CURRENT_STATE.md](CURRENT_STATE.md) (both short). Do not read the handoff logs or archives in full.
2. Find the task's code with targeted searches (`rg` with a path/glob, symbol names) and read only the files and line ranges you need. Archives under `docs/**/archive/` are excluded from searches by `.ignore`; search them explicitly (`rg --no-ignore`) when history matters.
3. Open the matching skill in `.claude/skills/` and only the design documents the task touches: owner decisions [docs/design/OWNER_DECISIONS_TH.md](docs/design/OWNER_DECISIONS_TH.md) and the plan [docs/DEVELOPMENT_PLAN_TH.md](docs/DEVELOPMENT_PLAN_TH.md) when choosing or scoping a task or when a decision is unclear; [docs/design/SYSTEMS_REFERENCE.md](docs/design/SYSTEMS_REFERENCE.md) for system/VFX details.
4. The newest entries of [docs/handoffs/CODEX-TO-CLAUDE.md](docs/handoffs/CODEX-TO-CLAUDE.md) (top of file) only when continuing or reviewing another agent's work.

## Owner design decisions — 2026-10-28
Design-clarification rounds are recorded in [docs/design/OWNER_DECISIONS_TH.md](docs/design/OWNER_DECISIONS_TH.md). Round 1 (OD-01–OD-04): base stars give stats only (advanced stars a small non-essential effect; per-character identity lives in p branches); tree points come from camp level + camp milestones, not stars; no rarity tiers, every class has at least one guaranteed free character, bosses never need gacha characters; duplicates stay character-specific plus a farmable universal star shard that replaces seals. These supersede the master plan's per-star fate effects and the SR/SSR draft; numbers remain drafts. Round 2 (OD-05–OD-08): the field team is definitely 5 (P02 delivers it; this supersedes "up to 4 heroes" once P02 lands; enemy max 1–5 stays the P00 proposal); target play is 20–30 min sessions 3–5×/week with no daily obligation; a favourite reaches ★5 in about 7–10 sessions; promotion keeps the same character: base ★5 → promote → advanced ★1–5, refining existing skills (one choice from each of two pairs), no new general skills. Round 3 (OD-09–OD-12): bosses are not hard-gated by specific skills: they telegraph several mechanics each turn that the player may answer for an advantage or ignore and take a penalty (debuff, heavy hit), never an instant loss; the five tool categories (interrupt, energy shield, healing, area attack, guard/taunt) help but are not required; defeat/withdraw penalties stay as now; A6c plus fatigue (fielded +1, benched −1 per battle, steps lower attack/healing only, never SPD or turns), fatigue-recovery potions, and up to 10 carried (field 5 + reserve unlocked 3→4→5 by chapter); the commander stays a story identity with no mechanics.

## Planning order (owner)

Owner 2026-10-30 (OD-13): finish the online systems before any outside players — order W8 → P01 → P02 → P09 accounts/cloud save/telemetry+feedback/admin → P04 → server-authoritative rewards (ledger, daily/weekly quests, sweep, free-ticket gacha) → chat + World Boss → external test; PvP async/Co-op excluded. Cloudflare repo secrets exist (Workers Scripts Edit; owner adds D1 Edit before database work). Owner 2026-10-30 (OD-14): 15 classes × 1 character for now (Saint = Corin `metta`, Dancer = Cerise `lalin`; new classes proposed Kael/Wynne/Astrid pending confirmation); Odran `thiran`/Isolde `wila` are parked (kept in existing saves, no new acquisition, A7-003 animation on hold); every character is free via story/board and gacha yields a character (early unlock, or that character's shards if owned) or shards. W1–W8, P01 and P02 are done; the owner picks each next task (see CURRENT_STATE.md). Reconcile older copy-ready prompts that assume unchanged progression/save schemas. [Tracking issue #69](https://github.com/wnau34-nptrn/asterveil-fateweave/issues/69).

## Master plan — owner approval 2026-10-21

The owner approved every recommendation in `docs/MASTER_PLAN_TH.md` ("อนุมัติตามคุณแนะนำทั้งหมด"): releases A–D, the chapter-1 map table (10 maps, Lv30 by release C), the unlock-by-chapter table, a one-Knight start with story recruits, the big skill+passive tree with 3 equipped skills, skill levels paid with role tomes, star fate ★1–5 with a unique effect per star, Bond, pets (one per expedition, a deterministic round-end assist, never in the SPD queue, never SPD), hard mode, conditional-only runes, the Tower of Fate, an offline bot PvP arena, a daily arena, fewer currencies (star shards replace seals; embers fold into ore on the map) and the v1 FX storyboard direction. This supersedes the older limits on skill trees (the tree may now unlock and modify active skills) and on adding these systems. The backend, accounts and Cloudflare hosting of release D are authorized but start only after the owner supplies a Cloudflare account/API token as an environment secret; never commit secrets. The Codex art queue with copy-ready prompts is `docs/handoffs/CODEX-ART-QUEUE-TH.md`; the chapter-1 lore `docs/LORE_CHAPTER1_TH.md` is approved (2026-10-22: Vargoth knew the commander before, survives the chapter; names as drafted). Keep each change in its release order unless the owner reorders it; numbers stay drafts validated by simulation.

## UI direction and formation

ART-UI-MODERN-001 (`incoming/ART-UI-MODERN-001/`) is the approved UI direction, used as reference only: rebuild in DOM/CSS from real state; sample names/numbers in boards are not data. The camp keeps its scene, NPC hotspots and bottom navigation bar; map and battle keep their positions. Battles are 1–5 units a side (P02, save v45); formation rules: `docs/design/FORMATION_PLAN_TH.md`, `docs/design/FOUR_FOES_PLAN_TH.md`, P02 notes `docs/validation/p02/README_TH.md`.

## Art, animation and VFX pipeline

- Codex makes art (into `incoming/` only); Claude integrates it in-game. Plan and wave history: `docs/design/ANIMATION_VFX_COMPLETION_PLAN_TH.md`.
- Owner artwork selection and motion approval are required per batch. Engineering and passing tests are not visual approval: show the owner real 390px clips before expanding effects, and record approvals as the owner's own words (never inferred from tests).
- Presentation work keeps rules/save/content/balance/playback timing unchanged and routes VFX from actual events (truthful outcomes).
- Atlases are lossless; repack with `scripts/repack-atlas-lossless.py`, verify with `scripts/verify-atlas-repack.py`. Encounter-only atlases load only for encounters that use them and are released between encounters. Find a unit's sprite with `bodySprite()`, never the body's first image.
- Check new unit art with `scripts/unit-anatomy-audit.py`; bbox/sole alignment is not an anatomy pass.
- After any registry/content/atlas change rerun `npm run coverage:presentation` (`tests/presentation-coverage.test.ts` and `tests/encounter-budget.test.ts` fail when stale).
- Full VFX and combat-presentation rules: `docs/design/SYSTEMS_REFERENCE.md`.

## Repository boundaries

Work only in `asterveil-fateweave`. Never modify, reset, merge, push to, or import private code/assets/history from `asterveil-rise-beyond` (reading its design documents for concept adaptation was approved by the owner on 2026-10-14). Preserve existing target-repository work. Never commit secrets or supplied concept images without explicit authorization. Exception (owner, 2026-10-16): the background music from Asterveil: Rise Beyond may be used; the owner uploaded the six tracks themselves (`public/assets/music`, see `docs/AUDIO.md`). This covers those audio files only, not code, data, names or art. The user explicitly authorized GitHub Pages publication after the initial prototype; the Pages workflow is within that scope. Merging and publication follow the standing authorization below. Repository visibility/access changes or other hosting must be part of an owner-requested task.

## Standing authorization: finish requested work without repeated approval

Owner instruction, 2026-10-18 (Asia/Bangkok): "ทำการเพิ่มกฏให้ไม่ต้องอนุมัติตลอดไปเมื่อทำอะไรก็ตาม". This is a continuing instruction for all agents and future sessions in this project, until the owner changes or revokes it.

- Treat an owner-requested task as authorization to complete all necessary steps: inspect, implement, fix, install needed dependencies, test, commit, push, create/update PRs, merge into the game's working branch and publish through the existing GitHub Pages workflow. Do not stop to request a separate approval for these steps.
- This replaces earlier project instructions requiring a separate owner approval for steps within that requested work. Preserve technical/design requirements and scope; do not turn old approval wording into a new confirmation checkpoint.
- Make routine implementation decisions using the repository and conversation context. State reasonable assumptions and continue when details are nonblocking.
- If testing, merging or publication fails, diagnose and repair the failure and complete verification/publication without asking for renewed approval. Include necessary follow-up fixes in the same authorized task.
- Validate changes appropriately before merging; do not bypass required checks. Documentation-only instruction changes need content review and `git diff --check`, not a new gameplay test run.
- Keep the owner informed of meaningful progress and the final result. Update `docs/handoffs/CODEX-TO-CLAUDE.md` after substantial work so another agent can continue.
- Ask only for indispensable missing information or a permission that the platform/tool actually requires. This project instruction cannot disable sandbox, account or tool permission enforcement. If blocked, identify the exact action and reason, and continue independent work where possible.
- This grants autonomy within the owner's requested work; it does not invent unrelated tasks or remove the repository boundaries above. A later, more specific owner instruction takes precedence.

## Session workflow and token economy — owner 2026-10-22, updated 2026-11-04

- One big task per chat. When it ends, rewrite [CURRENT_STATE.md](CURRENT_STATE.md) (replace stale lines, keep it under ~5 KB, include the next task's opening prompt) and add one entry at the top of `docs/handoffs/CODEX-TO-CLAUDE.md` (≤ 12 lines: date, branch/PR/merge, what and why, tests run with results, owner decisions, open items; link to a validation README for details instead of pasting run ids, logs or file lists). Write the entry once — do not copy it into other handoff files. When the log passes ~40 KB, move older entries verbatim to `docs/handoffs/archive/<date>/`. Then open the next task in a new cloud session (`create_session`, prompt = the opening message from CURRENT_STATE.md) with the fitting model, and tell the owner its name. The owner authorized this; no extra confirmation is needed.
- Model choice: a lighter model (Sonnet) for UI built from existing mockups, CSS/layout tweaks, Codex art intake, Codex prompts, docs, test fixes and small number changes; the strongest model (Opus) for resolver/save/rule changes, balance simulation, skill-tree/system design and multi-layer decisions. A UI step that needs a new architecture: the strong model lays the structure, the lighter one finishes.
- Inside a chat, routine self-contained work (running/fixing tests, capturing screenshots, broad code searches, mechanical edits with a clear spec) may go to a lighter-model subagent; keep decisions and the final check in the main chat. Skip delegation for tiny steps — a subagent re-reads its context from scratch.
- Keep tool output small: read line ranges, cap command output (`| tail -n 40`, `--reporter=dot`, `git diff --stat` before full diffs), and do not re-read files you have just edited or already have in context.
- CI: after pushing a PR, subscribe to its activity (`subscribe_pr_activity`) instead of polling; on failure read only the failing job's log tail, then the uploaded artifact if needed. Run focused tests locally; leave the full browser suite to CI.
- Screenshots for the owner: 390px only, 1–2 per screen, unless the owner asks for more. Look at only the images you need.
- Project skills (owner 2026-10-29): before art briefs, art/VFX intake, Phaser rendering/loading work, browser checks or rule/save/balance changes, use the matching skill in `.claude/skills/` (catalog and setup: `docs/tools/AGENT_SKILLS_TH.md`). Skills are guidance; the owner's request and this file take precedence.


## Portrait game and desktop keyboard — owner-approved 2026-10-19

A mobile portrait game that also plays on PC: one portrait frame up to 480px wide, centred on desktop, native-sized controls, touch targets ≥ 44px, DOM-native HUD text. The full layout, battle-dock, targeting and keyboard rules are in [docs/context/UI_INPUT_RULES.md](docs/context/UI_INPUT_RULES.md) — read it before any UI, layout or input change. No resolver, encounter or save-format changes are part of UI work.

## Current architecture

- Phaser 4.2.1 + strict TypeScript + Vite. Framework rules are different from Godot; Godot Lock documents are not requirements here.
- `src/core/battle` owns serializable authoritative state, stable IDs, beat-stamped commands, legal targets, deterministic resolution, preview and replay. No Phaser/browser imports or clocks/random damage in rules.
- Typed `src/content` definitions own actor values, announced intent schedule, hero lanes, class skills, cooldowns and tunable numeric rules.
- `BattleScene` adapts state into disposable shapes/text, pointer selection and VFX. No damage or resource mutations in scenes or tweens.
- `BattleUI` owns temporary skill selection, floating explanations and presentation lock; it commits once, saves immediately and projects state into DOM. Never allow selection alone or background/resume to confirm a command.
- `core/save` accepts an injected storage port and validates saves by command replay. `platform/browser-storage` handles browser API access.
- CSS tokens (`src/ui/tokens.css`, Luminous Veil) define the navy-glass HUD; self-hosted OFL subset fonts Kanit/Noto Sans Thai live in `public/assets/fonts`; Phaser uses original generated unit and backdrop atlases with code-native input, HP/status labels and short VFX. Generated artwork and asset frame mapping live in `game/visuals`; HUD text and controls must remain DOM-native.

## Development rules

1. Keep exactly one primary action per actor turn and one turn per surviving actor each round. Skip dead queue entries and freeze the real target when the enemy starts its turn.
2. Add new rules to the pure resolver and content before wiring UI. Preview must use the same resolver, not duplicate arithmetic.
3. Use meaningful tests for HP boundaries, restrictions, Guard/interruption, Mark follow-ups, formation targeting, cooldowns, barriers/healing, outcomes, preview equality and deterministic replay. Keep a winning offensive route and viable defensive interventions. The balance regression suite compares basic attacks with both target priorities and four-class offensive/defensive routes; choices must have visible consequences without forcing one fixed combo.
4. State is independent of animation. Restart, resize and tab suspension must never change the committed command outcome.
5. Validate all targets and actions again at commit. Downed actors cannot act; reject stale beats.
6. If encounter data or rule semantics change, bump `EncounterDefinition.version`; saves from the old version must be rejected safely.
7. Keep DOM text/controls responsive, touch targets >=44px, readable unavailable-action reasons, immediate casting on a valid marked character, reduced-motion support and keyboard focus.
8. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. For UI/input changes also run relevant Playwright gameplay tests and inspect screenshots of real canvas content.
9. Report tested browsers/devices honestly. Chromium touch emulation does not verify iOS Safari or real devices.
10. Do not add empty architecture folders, cards, formation switching or final asset production without a scoped task. Skill trees, pets, runes, the tower, offline PvP and (after the owner supplies credentials) the backend/accounts follow `docs/MASTER_PLAN_TH.md`. Expedition systems follow the phase plan in `docs/EXPEDITION_DESIGN.md`; validate draft numbers through simulation/playtesting and report them under the standing authorization above.

## Expedition (single game, no practice mode)

The game is one expedition on a **2D square-tile board** with free four-direction one-tile hops (buttons, arrow keys/WASD, adjacent taps). Never add path-finding auto-movement, linear nodes, dice, cards or room selection. The owner approved adapting Rise Beyond's non-combat *concepts* (Threat-style encounter chance, camps, carried HP, loot/equipment, events, elites, quests); never import its code, data, names or art. Rules, phase status and the approved mercenary decisions (no fixed heroes; roster 4+4; ★1 start, duplicates upgrade; unique class mechanics) are in `docs/EXPEDITION_DESIGN.md`.

Systems quick index (details and owner scopes in `docs/design/SYSTEMS_REFERENCE.md`): save envelope `core/save/expedition-save.ts` (v45 P02: 1–5 a side, reserve by chapter, fatigue; v44 P01: one camp level `campXp`, no company cap, parked thiran/wila, bench archive; v43 C12 Batch 1 adds Saint/Dancer with paid personal branches; preserves v42 investments, battle commands and legacy hiring offers); world rules `core/world` + content `content/world` (maps 1 ซากชายแดน, 2 เส้นทางป่าทึบ, 3 แนวรอยแยก; chapters, recruits, unlocks, guides, hard mode); battle resolver `core/battle` (SPD rounds, intents by slot, Guard/Mark/Bash, traits); big skill trees and loadouts (A6: twelve classes / fourteen characters after C12 Batch 1, `content/heroes/talents.ts`; the recruits' trees moved up 2026-10-23, save v39); skill levels with tomes (`core/world/tomes.ts`, save v37); equipment/sets/forge/storage/boss gear/affix transfer/crafting/targeted farming; events, elites, puzzles, quests; music/SFX; camp NPCs, map props, item art, market, currencies; balance simulation `npm run sim` (C11 catalog-driven per-character map traversal `CHARACTERS.md`; A10 campaign maps 1→3 + hard: `docs/validation/balance-sim/CAMPAIGN.md`; map strength `bossPercent`/elite `percent`). Foes stand in four slots `f1`/`f2` (front row) and `b1`/`b2` (back row); front-row foes screen the back row (A7 step 2, owner 2026-10-22; plan and numbers `docs/design/FOUR_FOES_PLAN_TH.md`). Formation (save v36): the column a hero stands in is its lane in the rules, set at the camp team page/map bag (`core/world/formation.ts`, `roster.lanes`, fixed per battle in `ActiveBattle.lanes`). Never use the term ม่านเวล; the group is the ค่ายทหารรับจ้าง, never บริษัท.


## Animation prompt quality and Codex handoff — owner 2026-10-29

Before writing image/animation prompts or handing artwork tasks to Codex, read [the animation prompt quality guide](docs/handoffs/ANIMATION_PROMPT_QUALITY_TH.md). It defines technical briefs, seed/scale/anchor consistency, small-batch whole-strip generation, delivery metadata and verification. It supplements the existing W1–W8 plan and copy-ready prompts; it does not change task order, owner artwork/motion decisions, gameplay rules or the Codex-art/Claude-integration split. The working game branch is `feature/fateweave-initial-prototype`, not `main`. Preserve all existing instructions above.
