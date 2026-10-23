# Fateweave development instructions

## Master plan — owner approval 2026-10-21

The owner approved every recommendation in `docs/MASTER_PLAN_TH.md` ("อนุมัติตามคุณแนะนำทั้งหมด"): releases A–D, the chapter-1 map table (10 maps, Lv30 by release C), the unlock-by-chapter table, a one-Knight start with story recruits, the big skill+passive tree with 3 equipped skills, skill levels paid with role tomes, star fate ★1–5 with a unique effect per star, Bond, pets (one per expedition, a deterministic round-end assist, never in the SPD queue, never SPD), hard mode, conditional-only runes, the Tower of Fate, an offline bot PvP arena, a daily arena, fewer currencies (star shards replace seals; embers fold into ore on the map) and the v1 FX storyboard direction. This supersedes the older limits on skill trees (the tree may now unlock and modify active skills) and on adding these systems. The backend, accounts and Cloudflare hosting of release D are authorized but start only after the owner supplies a Cloudflare account/API token as an environment secret; never commit secrets. The Codex art queue with copy-ready prompts is `docs/handoffs/CODEX-ART-QUEUE-TH.md`; the chapter-1 lore `docs/LORE_CHAPTER1_TH.md` is approved (2026-10-22: Vargoth knew the commander before, survives the chapter; names as drafted). Keep each change in its release order unless the owner reorders it; numbers stay drafts validated by simulation.

## UI rebuild and 4v4 battles — owner approval 2026-10-22

ART-UI-MODERN-001 (`incoming/ART-UI-MODERN-001/`, Codex mockups) is the approved UI direction, used as reference only (rebuild in DOM/CSS from real state; sample names/numbers in the boards are not data). Decisions: the camp keeps its scene and NPC hotspots and gains a bottom navigation bar; map and battle keep their positions (phone D-pad bottom-centre, current field size) and take only the new styling; PC keeps the centred portrait frame (wide layouts reconsidered in release C). Battles become up to 4 heroes vs up to 4 foes (1–4 per encounter, front 2 / back 2), and the field must show all 8. Order: (1) shared UI components + character sheet, (2) four enemy positions in the pure resolver, new encounter sets and a balance simulation, (3) the 8-actor field and battle HUD in the new style. This supersedes the two fixed enemy ids (`raider`/`brute`) once step 2 lands. Formation (owner 2026-10-22): each side is 2 columns × 3 slots holding up to 4 units; a column's lone unit stands in the middle; the player sets hero front/back (rules follow the column stood in, ≤3 per column) at the camp team page and the map bag, plan `docs/design/FORMATION_PLAN_TH.md`.

## VFX — status 2026-10-22

The owner passed the Bolt slice; `game/visuals/bolt-fx.ts` draws Codex's ART-VFX-BOLT-001 painted layers (`public/assets/fx/bolt_fx.*`) with unchanged timing and truthful outcomes (clips in `docs/combat-presentation/bolt-slice/`). Execute/Ward (Codex queue 19 art, `game/visuals/exec-ward-fx.ts`) passed with the owner 2026-10-23. Engineering and passing tests are not visual approval: show the owner clips before expanding effects. Full VFX and combat-presentation rules: `docs/design/SYSTEMS_REFERENCE.md`.

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

## Session workflow and token economy — owner 2026-10-22

- One big task per chat. When a big task ends, update `docs/handoffs/NEW-CHAT-HANDOFF-TH.md` (and `CODEX-TO-CLAUDE.md`), then open the next task in a new cloud session (`create_session`, prompt = the handoff's opening message for that task) with the fitting model, and tell the owner its name. The owner authorized this; no extra confirmation is needed.
- Model choice: Sonnet for UI built from existing mockups, CSS/layout tweaks, Codex art intake, Codex prompts, docs, test fixes and small number changes. Opus for resolver/save/rule changes (e.g. the four-enemy step), balance simulation, skill-tree/system design and multi-layer decisions. A UI step that needs a new architecture: Opus lays the structure, Sonnet finishes.
- Inside a chat, routine self-contained work (running/fixing tests, capturing screenshots, searching code, mechanical edits with a clear spec) may go to a Sonnet subagent (`Agent` with `model: "sonnet"`); keep decisions and the final check in the main chat. Skip delegation for tiny steps.
- Screenshots for the owner: 390px only, 1–2 per screen, unless the owner asks for more. Look at only the images you need.
- Run focused tests locally; leave the full browser suite to CI.

## Portrait game and desktop keyboard — owner-approved 2026-10-19

The owner chose a mobile portrait game that also plays on PC. This replaces earlier wide desktop/landscape layouts; older dated UI notes are historical.

- Every view uses one portrait frame, up to 480px wide, centred on desktop (up to 960px high) with native-sized controls. Mobile portrait uses the available phone area. Coarse-pointer landscape shows rotation guidance and gates gameplay input; a desktop window below 320px wide or 560px high requests more space instead of shrinking touch targets.
- `#app` is the named size container `game`. Component breakpoints use `@container game` and `cqw`/`cqh`; pointer/hover/reduced-motion remain media queries. The root is sized from `platform/viewport.ts`. Top-layer native dialogs centre on the game frame, and floating descriptions clamp to `gameBounds()`, not the monitor edges.
- Battle commands stay in the centred lower dock and become available on the actual hero turn. Slot keys 1–4 select the displayed action; selecting never commits. A valid field target tap/click commits once. Attack is the initial selection; Escape cancels targeting, after which a new selection is required. Full skill descriptions are explicit via the dock's ⓘ button, not an automatic interruption on every selection.
- The six-actor queue uses circular portraits with 44px buttons. Name/SPD/HP details are available on request and accessible labels preserve round/side/interruption information. Waiting allies retain readable HP; only the actual owner can issue a command.
- WASD/arrows move on the map (existing step/repeat throttle); B toggles the map bag, I toggles world/battle information, Escape closes the top surface or cancels targeting. Ignore skill-key repeats, browser modifiers, IME/editing, background/rotation-blocked input and input behind other modals. Never queue commands during presentation for the next hero.
- Use the game/arena dimensions in `BattleScene`, not viewport-wide media queries. Rotation, resize, inspection and keyboard selection must preserve saves and cannot add a command. No resolver, encounter or save-format changes are part of this UI work.

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

Systems quick index (details and owner scopes in `docs/design/SYSTEMS_REFERENCE.md`): save envelope `core/save/expedition-save.ts` (v39); world rules `core/world` + content `content/world` (maps 1 ซากชายแดน, 2 เส้นทางป่าทึบ, 3 แนวรอยแยก; chapters, recruits, unlocks, guides, hard mode); battle resolver `core/battle` (SPD rounds, intents by slot, Guard/Mark/Bash, traits); big skill trees and loadouts (A6: all ten classes, `content/heroes/talents.ts`; the recruits' trees moved up 2026-10-23, save v39); skill levels with tomes (`core/world/tomes.ts`, save v37); equipment/sets/forge/storage/boss gear/affix transfer/crafting/targeted farming; events, elites, puzzles, quests; music/SFX; camp NPCs, map props, item art, market, currencies; balance simulation `npm run sim` (A10 campaign maps 1→3 + hard: `docs/validation/balance-sim/CAMPAIGN.md`; map strength `bossPercent`/elite `percent`). Foes stand in four slots `f1`/`f2` (front row) and `b1`/`b2` (back row); front-row foes screen the back row (A7 step 2, owner 2026-10-22; plan and numbers `docs/design/FOUR_FOES_PLAN_TH.md`). Formation (save v36): the column a hero stands in is its lane in the rules, set at the camp team page/map bag (`core/world/formation.ts`, `roster.lanes`, fixed per battle in `ActiveBattle.lanes`). Never use the term ม่านเวล; the group is the ค่ายทหารรับจ้าง, never บริษัท.
