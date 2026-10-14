# Expedition design — 2D tile board

Fateweave is a single game: an expedition across a square-tile map with turn-based SPD battles. The earlier practice selector is removed. Combat rules are unchanged (see `GAMEPLAY_DIRECTION.md`).

## Source of the design

The owner asked to adapt the non-combat systems of the private Godot project *Asterveil: Rise Beyond* to this 2D tile game. Only **design concepts** were taken from its lock documents (map/exploration, game, party, economy, equipment/loot). No code, data files, names, art or history were imported. Rise Beyond's 3D presentation, 10-member company, 3×3 formation, Orders/Stance, Break/Chain and reserve swap do not apply: they are combat or party rules, and Fateweave keeps its own combat.

## Phase plan (approved 2026-10-14)

| Phase | Content | Status |
|---|---|---|
| 1. Exploration core | Remove practice mode; tile map, camera, fog; shown per-step encounter chance; carried HP; camps; defeat; expedition save; one-time teaching battle | **Implemented** |
| 2. Loot and team power | Equipment (weapon by class, body, accessory; rarity and random affixes; bad-luck protection), shared EXP/level, consumables used on the map, treasure chests | Planned |
| 3. Choices and content | Events with fight/avoid choices, elites, mini boss, puzzles (rune order, push stone, lever), secrets, map quest "2 of 3" and side quests | Planned |
| 4. Economy and wrap-up | Local gold and shop, salvage, fast travel between camps, elite respawn on rest, defeat gold penalty (30% of gold gained since the last camp), whole-map balance simulation, completion screen | Planned |

Numbers in phases 2–4 are drafts and need owner approval before they ship.

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
- Defeat (not tutorial): return to the last rested camp (or the start) with full HP; the defeated encounter does not follow. No penalty until gold exists (phase 4).
- Boss victory clears the boss tile; stepping onto the goal completes the expedition.
- A battle that ends on enemy opening turns before any command is applied on the next load instead of discarding the save.

**Camp.** Stand on a camp tile and press **พัก**: full HP, revive the fallen, pressure 0, and this camp becomes the defeat return point. Camps can be used any number of times.

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

Key `asterveil.fateweave.expedition.v1`, envelope `{ version: 1, state }`. State: map id/version, seed, roll counter, position, steps, pressure, fog string, party HP, last camp, tutorial/boss/completed flags, wins/defeats, and the active battle `{ kind, encounterId, entry, commands }`.

Every field is validated on load. The active battle is replayed under current rules, so a foreign-owner command, an unknown encounter or a wrong map version rejects the save, and the title screen then offers only a new expedition. A finished battle is applied in the same write that records its last command, so a reload never repeats damage.

The practice keys (`asterveil.fateweave.battle.v1`, `.rear-ambush`, `.rift-warden`, `asterveil.fateweave.encounter.v1`) are deleted at start and never read. The teaching-advice preference key `asterveil.fateweave.tutorial.v1` is kept.

Save history: none before this. Version 1 is new; earlier practice saves are intentionally dropped, not migrated.

## UI

- **Title:** Continue (with a summary) or New expedition; replacing an existing save needs a second confirming press.
- **World:** zone name, encounter-chance chip and ⓘ in the top bar. The map has a camera that follows the party and is clamped to the map edges. The team HP cards, a goal checklist on large screens, the last message, the D-pad and the camp **พัก** button sit beside or below the map.
  - Portrait phones: map, then the four HP cards in one row, then message and D-pad.
  - Short landscape: map on the left, a compact column on the right.
  - No page scrolling at the 11 tested viewports.
- **Battle:** the existing HUD. The header shows the battle kind (ศึกสอน / พบศัตรู / บอส) and name. There is no restart or battle picker. The result button returns to the map, retreats to camp, or retries the teaching battle.
- **Renderer:** the battle view keeps its layout while hidden, so Phaser never sizes to zero, and the Phaser loop sleeps while exploring.
