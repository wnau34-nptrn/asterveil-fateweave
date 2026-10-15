# Expedition design — 2D tile board

Fateweave is a single game: an expedition across a square-tile map with turn-based SPD battles. The earlier practice selector is removed. Combat rules are unchanged (see `GAMEPLAY_DIRECTION.md`).

## Source of the design

The owner asked to adapt the non-combat systems of the private Godot project *Asterveil: Rise Beyond* to this 2D tile game. Only **design concepts** were taken from its lock documents (map/exploration, game, party, economy, equipment/loot). No code, data files, names, art or history were imported. Rise Beyond's 3D presentation, 10-member company, 3×3 formation, Orders/Stance, Break/Chain and reserve swap do not apply: they are combat or party rules, and Fateweave keeps its own combat.

## Phase plan

Approved 2026-10-14, re-planned 2026-10-15 for the mercenary roster.

| Phase | Content | Status |
|---|---|---|
| 1. Exploration core | Remove practice mode; tile map, camera, fog; shown per-step encounter chance; carried HP; camps; defeat; expedition save; one-time teaching battle | **Implemented** |
| 2A. Resources and chests | Star ore, veil embers and contract seals; victory drops; six map chests; camp rest at 50% with a campfire; ember revive one member at a time | **Implemented** |
| 2B. Roster of 8 | 4 deployed + 4 reserve, swapped at camp; enemies target party slots instead of hero ids; defeat rule for the roster | **Implemented** |
| 2C-1. Company | Hiring board at camps, duplicates, star upgrades (stats), dismissal, company carried into the next expedition | **Implemented** |
| 2C-2. New classes | Six new mercenaries (ART-CHAR-MERC-ENEMY-001), one class mechanic at a time; ★3 skill and ★5 passive per class | Planned |
| 2D. Equipment and level | Equipment (weapon by class, body, accessory; rarity and affixes; bad-luck protection), shared EXP/level, consumables on the map | Planned |
| 3. Choices and content | Events with fight/avoid choices, elites, mini boss, puzzles (rune order, push stone, lever), secrets, map quest "2 of 3" and side quests | Planned |
| 4. Economy and wrap-up | Local gold and shop, salvage, fast travel between camps, elite respawn on rest, defeat penalty, whole-map balance simulation, completion screen | Planned |

Numbers in phases 2–4 are drafts and need owner approval after playtesting.

## Mercenary decisions (owner, 2026-10-15)

These decisions guide phases 2B–2C. They are not implemented yet.

- **No fixed heroes.** Every party member is a hired mercenary. The starting four (Aegis, Lyra, Eira, Seren) join free at ★1.
- **One mercenary is one character and one portrait.** Art is not tied to a class. The class decides the skills and lane.
- **Roster of 8:** 4 deployed and 4 reserve, swapped at a camp.
- **Hiring board at camps:** random offers drawn from the whole catalog, seeded so reloads cannot re-roll. Every offer costs the same ore.
- **Stars.**
  - Everyone starts at ★1. Hiring someone already on the roster gives that mercenary a duplicate instead of a second copy, even when the roster is full.
  - Upgrade cost: ★2 = 1 duplicate + 20 ore; ★3 = 2 + 40 (unlocks the 3rd skill); ★4 = 3 + 70; ★5 = 4 + 110 (unlocks a passive).
  - Each star adds +8% to base stats.
  - One contract seal can replace one duplicate in an upgrade.
  - Dismissing a mercenary loses its stars and stored duplicates.
- **Stars and roster persist across expeditions.** Map position, HP and carried resources reset when a new expedition starts. This needs a separate roster save.
- **Every class has a unique mechanic.** The four existing classes keep theirs.
  - Spear: counter.
  - Archer: delay SPD.
  - Alchemist: corrode and haste.
  - Scout: first-strike bonus and evade.
  - Hammer warden: taunt-all.
  - Bard: persistent song.

  New mechanics go into the pure resolver one class at a time, each with its own tests.
- **Enemies target lanes/slots** instead of hero ids (2B).
- **Defeat with a roster:** fallen members stay fallen. If all 8 are down, one is revived free.
- **Future gacha:** cosmetic avatars for owned mercenaries with a small stat bonus (proposed cap +3%). No paid power.

## Boundary between world and battle

- The world may pass into battle: each hero's entry HP (`BattleEntry`), and which encounter. Phase 2 will add equipment/level stats limited to values the engine already has (max HP, Attack, SPD, skill power, starting barrier, healing).
- The world never changes combat rules: no Defense/Crit formulas, no item actions in battle, no escape mid-battle. "Not fighting" is a choice made before a battle starts (phase 3 events).
- `beginBattle(data, entry)`, `createBattle` and `replay` accept the entry. Heroes entering at 0 HP are down: they never join the SPD queue and cannot be targeted. An entry with all heroes down is rejected. Without an entry every hero starts at max HP, so earlier fixtures and versions are unchanged.
- The world records only the battle's commands and its entry. HP after a battle is computed by replaying those commands; the world never trusts a supplied HP snapshot.

## Phase 1 rules

**Map.** `src/content/world/chapter1.ts`, 20×28 tiles. `#` is a wall. Floors belong to zones: meadow (green), thicket (yellow), scar (orange) and the safe sanctum around the gate. `S` start, `C` camp (two), `B` boss, `G` goal. The boss stands on the only way to the goal.

**Movement.** One tile per input in four directions: D-pad buttons, arrow keys/WASD (throttled to one hop per 120 ms) or tapping an adjacent tile. There is no path-finding or automatic movement. Walls and edges block without spending a step.

**Fog.** Tiles within 3 (square radius) of every visited position are revealed and stay revealed.

**Encounter chance.** On entering a floor tile of a non-safe zone, roll 0–99 against `min(cap, base + pressure)`. A quiet step adds the zone's `step` to pressure; an encounter or a camp rest resets it to 0. The HUD shows the chance for the current zone.

| Zone | base | step | cap | Pool (weight) |
|---|---|---|---|---|
| meadow | 4% | +3 | 35% | scout-patrol 3, rift-whelp 2 |
| thicket | 6% | +4 | 45% | thicket-ambush 2, shadow-stalker 2, rift-whelp 1 |
| scar | 8% | +5 | 50% | veil-siege 2, rear-ambush 2, thicket-ambush 1 |

Start, camp, boss, goal and sanctum tiles never roll. Rolls come from `(seed, rolls)` with a fixed integer hash; the seed is chosen once per expedition and saved, so reloading cannot re-roll.

**Teaching battle.** The first encounter of an expedition is always `first-clash`. Its schedule gives each class skill a reason in turn order: Lyra Mark → Raider hits Lyra → Eira Ward on the announced energy blast → Aegis Guard → Seren Heal → Lyra Precision Strike on the mark → Eira Bolt → Aegis Bash on the physical attack. Advice appears only in this battle and follows the real SPD owner. It can be hidden in ⓘ. Losing it restarts it at full HP; winning marks the tutorial done.

**After battle.** The party stays on the tile where the battle began.
- Victory: HP carries over exactly; fallen heroes stay down.
- Defeat (not tutorial): return to the last camp reached (or the start) with full HP; the defeated encounter does not follow. Resources are kept. This is interim: the roster defeat rule replaces it in 2B.
- Boss victory clears the boss tile; stepping onto the goal completes the expedition.
- A battle that ends on enemy opening turns before any command is applied on the next load instead of discarding the save.

**Camp.** Phase 2A replaces the phase 1 full rest; see below. Reaching a camp tile makes it the defeat return point.

## Phase 2A rules (draft numbers)

**Resources.** Three counters are carried in the expedition state.
- **Star ore (แร่ดาว):** will pay for hiring and star upgrades in 2C.
- **Veil ember (ถ่านม่านเวล):** revives one fallen member at a camp.
- **Contract seal (ตราสัญญา):** will replace one duplicate in a star upgrade (2C).

Ore and seals have no use yet; the pack dialog says so.

**Loot.** Loot is rolled from the same `(seed, rolls)` stream as encounters and saved in the same write, so a reload never re-rolls it. Ore is rolled from `min..max`. Embers and seals are `guaranteed + percent chance of one more`.

| Source | Ore | Ember | Seal |
|---|---|---|---|
| Victory in meadow | 6–10 | 8% | 0 |
| Victory in thicket | 9–14 | 12% | 0 |
| Victory in scar | 12–18 | 15% | 0 |
| Teaching battle | 10 | 1 | 0 |
| Boss | 60 | 1 | 2 |
| Common chest (4) | 16–24 | 30% | 0 |
| Rare chest (2) | 30–40 | 1 | 1 |

Elites (phase 3) will add guaranteed seals.

**Chests.** There are six, defined as map content (`chests`) on floor tiles in side pockets: meadow west/east, thicket west/east (east is rare), and scar west (rare)/east. Standing on an unopened chest turns the lower-right action into **เปิด**. Each chest opens once (`openedChests`). The chest tile still rolls encounters like any floor tile. The chest markers are code-native placeholders until chest art is commissioned.

**Camp.** Pressing **พัก** on a camp opens the camp sheet.
- **Rest:** standing members heal 50% of max HP (rounded up, capped at max). Pressure resets, and the camp becomes the return point. The campfire (`restReady`) then goes out; any won battle relights it. The fallen do not heal.
- **Revive:** one fallen member per ember, to 30% of max HP (rounded up). This works whether or not the fire is lit.

**Balance evidence.** The advisor's full run (seed 2026, revive then rest at each camp) still reaches the goal. The advisor still wins every encounter from 60% HP. Human playtesting is still needed.

## Phase 2B rules

**Party slots.**
- `IntentDefinition.targetSlot` (0–3, deployment order) replaces the old hero-id target, so whoever stands in that slot is the target.
- The front-lane rule is unchanged: a physical move hits the front lane while anyone there stands. If the slot is empty, down, or blocked by that rule, the move falls back to the first allowed member.
- The resolved hero id is still stored on `Intent.targetId`, so Guard, previews and the advisor work as before.
- Old content maps guardian/tracer/weaver/healer to slots 0/1/2/3. With the starting four in their default order, every battle plays exactly as before; the full balance suite is unchanged.
- Every encounter version was bumped: veil-siege 6, rear-ambush 4, rift-warden 4, the rest 2.
- `withParty(data, heroes)` deploys 1–4 unique heroes into an encounter.

**Roster.**
- `roster: { deployed (1–4, slot order), reserve (0–4) }`. HP is tracked for every member.
- The battle entry contains only the deployed members.
- Until hiring exists (2C), the hero catalog is the four starting members, so the reserve starts empty.

**Camp team tab.**
- The camp sheet has two tabs: "พักและชุบ" (rest/revive) and "จัดทีม" (team).
- To change the team, tap a member, then tap a member or an empty slot on the other side:
  - deployed ↔ reserve swaps the two;
  - a member tapped onto an empty slot moves there.
- At least one member stays deployed. Changes are allowed only at a camp, never in battle.
- A rest heals reserve members too; embers can revive anyone on the roster.
- If no deployed member can stand, movement is blocked ("ทีมที่ลงสนามล้มหมด"). The camp sheet then opens on the team tab.

**Defeat (replaces the 2A interim).**
- The deployed members stay down. The party returns to the last camp reached (or the start), and resources are kept.
- If the whole roster is down, slot 1 gets back up free at 30% HP and the campfire is relit.
- A lost teaching battle still restarts at full HP.
- With only four members before hiring, a full defeat leaves one member standing. Recovery then needs embers.
- A deployed party that is down while the reserve stands can occur only after a camp was reached, because reserve members come from camps. So there is always a camp to swap at.

## Phase 2C-1 rules (draft numbers)

**Stars.**
- Each star above ★1 adds 8% to max HP and Attack (rounded) and +8% skill power via `HeroDefinition.skillBonus`, which the resolver, previews and skill text all read through `skillPower`. SPD never changes, so stars never reorder turns.
- The ★3 skill and ★5 passive unlocks are not implemented yet. They need per-class designs and arrive with the class work in 2C-2.

**Hiring board.**
- At a camp, the "จ้าง" tab shows three distinct offers from the hero catalog, derived from `(seed, camp position, wins)`. A reload cannot re-roll them, and every won battle refreshes the board. Only the taken offer indexes are saved (`board`).
- Every hire costs 30 ore.
- A new mercenary joins the reserve (or the deployed party if the reserve is full) at ★1 with full HP.
- Hiring someone already on the roster stores one duplicate instead, even when the roster is full. A ★5 member cannot be offered as a duplicate.
- A new member cannot join when the roster already holds 8.
- Until the six new mercenaries exist, the catalog is the starting four, so every offer is a duplicate.

**Upgrades** (team tab, tap a member):

| To | Duplicates | Ore |
|---|---|---|
| ★2 | 1 | 20 |
| ★3 | 2 | 40 |
| ★4 | 3 | 70 |
| ★5 | 4 | 110 |

- One contract seal may stand in for one missing duplicate.
- A standing member gains the added max HP; a fallen member stays at 0.

**Dismissal.** Dismissing a member returns 15 ore and loses its stars and duplicates. It needs a second press to confirm. The last deployed member cannot be dismissed.

**Company carry-over.**
- Starting a new expedition (from the info dialog, the completion banner or the title) keeps the roster order, stars and duplicates.
- HP resets to full; position, fog, resources, chests, camp, flags and the board start over.
- The company lives inside the single expedition save, so an incompatible save also loses it. A separate company save can come later if needed.

**Encounters added for the expedition** (all reuse the two illustrated enemy slots `raider`/`brute`):

| id / version | Enemies (HP, SPD) | Moves per own round |
|---|---|---|
| first-clash / 1 | Scout 56, 110; Young Brute 100, 70 | Scout: phys 10 Lyra → phys 10 Aegis → energy 12 Seren. Brute: energy 16 Eira → phys 14 Lyra → energy 16 Eira |
| scout-patrol / 1 | Patrol 64, 110 | phys 11 Lyra → energy 12 Seren → phys 11 Aegis |
| rift-whelp / 1 | Whelp 120, 70 | energy 18 Eira → phys 16 Aegis → energy 18 Seren |
| thicket-ambush / 1 | Lurker 66, 110; Thorn Brute 140, 70 | Lurker: phys 12 Lyra → energy 14 Eira → phys 12 Aegis. Brute: energy 20 Seren → phys 20 Lyra → energy 22 Eira |
| shadow-stalker / 1 | Stalker 96, 110 | energy 18 Seren → phys 16 Lyra → energy 18 Eira |

veil-siege / 5, rear-ambush / 3 and rift-warden / 3 keep their content and versions.

**Balance evidence (not final).** The teaching advisor (`battleLesson`) is used as a test bot. It wins every catalogued encounter from 60% HP. One complete run (seed 2026: walk to each camp, rest, then walk to the goal through the boss) reaches the goal. Blind Attack still loses veil-siege, rear-ambush and the boss from full HP, and loses thicket-ambush from 40% HP. Human playtesting is still needed.

## Save

Key `asterveil.fateweave.expedition.v1`, envelope `{ version: 4, state }`. State fields:
- map id/version, seed, roll counter;
- position, steps, pressure, fog string;
- roster `{ deployed, reserve }`, `members` (stars/duplicates per member), `board`, HP for every roster member, last camp;
- resources `{ ore, ember, seal }`, `openedChests`, `restReady`;
- tutorial/boss/completed flags, wins/defeats;
- the active battle `{ kind, encounterId, entry, commands }`.

Every field is validated on load. The active battle is replayed under current rules, so a foreign-owner command, an unknown encounter or a wrong map version rejects the save, and the title screen then offers only a new expedition. A finished battle is applied in the same write that records its last command, so a reload never repeats damage.

The practice keys (`asterveil.fateweave.battle.v1`, `.rear-ambush`, `.rift-warden`, `asterveil.fateweave.encounter.v1`) are deleted at start and never read. The teaching-advice preference key `asterveil.fateweave.tutorial.v1` is kept.

Save history:
- Version 1 (phase 1) was new; earlier practice saves were intentionally dropped.
- Version 4 (phase 2C-1) adds `members` and `board`. Older saves migrate with every member at ★1 and no board. Stars outside 1–5, missing members, and malformed or out-of-range board entries are rejected.
- Version 3 (phase 2B) adds `roster`. v1/v2 saves migrate with the starting four deployed and an empty reserve. Unknown, duplicated or missing members, an empty deployment, and HP keys that differ from the roster are rejected.
- Version 2 (phase 2A) adds resources, opened chests and the campfire flag. A v1 save migrates with zero resources, no opened chests and a lit campfire. The map layout and map version are unchanged. Tested in `tests/world.test.ts`.
- Unknown resource keys, unknown or repeated chest ids, and a non-boolean campfire flag are rejected.

## UI

- **Title:** Continue (with a summary) or New expedition; replacing an existing save needs a second confirming press.
- **Pack and camp (2A):**
  - A pack capsule under the top-right corner shows ore/ember/seal counts and opens the pack dialog.
  - The lower-right action is **พัก** on a camp (opens the camp sheet), **เปิด** on an unopened chest, and otherwise disabled.
- **World:** zone name, encounter-chance chip and ⓘ in the top bar. The map has a camera that follows the party and is clamped to the map edges. The team HP cards, a goal checklist on large screens, the last message, the D-pad and the camp **พัก** button sit beside or below the map.
  - Portrait phones: map, then the four HP cards in one row, then message and D-pad.
  - Short landscape: map on the left, a compact column on the right.
  - No page scrolling at the 11 tested viewports.
- **Battle:** the existing HUD. The header shows the battle kind (ศึกสอน / พบศัตรู / บอส) and name. There is no restart or battle picker. The result button returns to the map, retreats to camp, or retries the teaching battle.
- **Renderer:** the battle view keeps its layout while hidden, so Phaser never sizes to zero, and the Phaser loop sleeps while exploring.

## Visual integration (ART-UI-WORLD-001 R2)

The exploration map is full screen, with a floating HUD and no sidebar. It uses the accepted tile, decor, landmark, fog and token art. Intake results, accepted and deferred files, budget and screenshots are in `docs/validation/art-ui-world-001/INTAKE.md`. The art never changes rules: hints mark only legal neighbours, the lower-right action is enabled only by `canRest`, and every number comes from `ExpeditionState`.
