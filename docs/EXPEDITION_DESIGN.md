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
| 2C-1. Company | Hiring board, duplicates, star upgrades (stats), dismissal | **Implemented** (moved to the lobby in L1) |
| L1. Lobby | Home → Lobby → Map; persistent profile (company ≤ 20, bank, board); choose the 4 + 4; withdraw/complete/wipe settle home | **Implemented** |
| L2. Character creation | Commander (non-combat) name, crest and banner colour, once, between Home and Lobby | **Implemented** |
| 2C-2. New classes | Six new mercenaries (ART-CHAR-MERC-ENEMY-001), one class mechanic at a time; ★3 skill and ★5 passive per class | **Implemented**: all 6 base classes (Garran spear, Mira archer, Toma alchemist, Sefa scout, Brann warden, Lio bard) and the ★3 skill + ★5 passive for all 10 classes (see Star unlocks) |
| 2D. Equipment and level | 2D-1 member + monster levels; 2D-2 equipment (6 slots, 5 rarities, drops, inventory); 2D-3 sets; 2D-4 forge (enhance, fuse, reroll, salvage); 2D-5 map potions; 2D-1b passive talent tree | **Implemented**: 2D-1 (see Levels), 2D-1b (Talent tree), 2D-2 (Equipment), 2D-3 (Equipment sets), 2D-4 (Forge), 2D-5 (Map potions); numbers are drafts |
| 3. Choices and content | 3A events with fight/avoid choices and forced elites; later mini boss, puzzles (rune order, push stone, lever), secrets, map quest "2 of 3" and side quests | **3A implemented** (see Events and elites); the rest planned |
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

## Lobby L1 rules (owner-approved 2026-10-15; numbers are drafts)

**Flow.** Home (title) → Lobby (ค่ายทหารรับจ้าง) → map → back to the Lobby. Character creation (L2) will sit between Home and Lobby. While an expedition is running, the title offers only "เดินทางต่อ". The Lobby opens again once the run is settled.

**Lobby, persistent (`Profile`).**
- **Company:** up to 20 owned mercenaries with stars and duplicates.
- **Party:** the 4 deployed + 4 reserve to bring.
- **Bank:** ore and seals.
- **Hiring board:** derived from `(profile seed, returns)`. It refreshes each time an expedition comes home, and only the taken indexes are stored.
- **Other:** tutorial flag, counts of expeditions and completions, and the last result.
- **Hiring:** a new member joins the company and, if there is room, the reserve.
- **Team tab:** tap a member, then tap a member or an empty slot in another group (ลงสนาม / สำรอง / ในค่าย) to swap or move. At least one member stays deployed.
- **Upgrades and dismissal:** the member panel also holds star upgrades and dismissal (2C-1 costs).

**In the map.**
- The camp keeps rest/revive and team swaps among the brought 8; hiring is gone from the camp.
- The **map entrance** (start tile) is also a muster point. Its lower-right action is **ทางออก**, which opens the team tab and withdraw.
- Stars are fixed for the whole run.

**Ending a run (settled into the profile in the same write that clears the run).**

| Outcome | How | Ore / seals kept |
|---|---|---|
| complete | stepping onto the goal | 100% |
| withdrawn | "ถอนตัวกลับค่าย" at a camp or the entrance (confirm twice) | 100% |
| wiped | every brought member down after a defeat | 50% (rounded down) |

- Embers never leave the map. HP is full again in the Lobby.
- The 2B "free rescue" rule is removed. A defeat with any brought member standing still retreats to the last camp (or the entrance) with the fallen down.

**Lobby look.** A warm dusk camp band shows the brought team around a code-drawn fire, using the existing idle frames with gentle breathing and embers, all off under reduced motion. This is interim until `docs/handoffs/ART-UI-LOBBY-001.md` (scene layers and sit/cheer/idle_alt poses) is delivered.

**Lobby art (ART-UI-LOBBY-001).** The camp scene is the painted lobby with a stone firepit and posed members: front pair sitting, middle pair idle moments, back alternating. The member just hired or upgraded cheers, and everyone cheers after a completed expedition. See `docs/validation/art-ui-lobby-001/INTAKE.md`.

## 2C-2 rules: new classes, one at a time (draft numbers)

**Infrastructure.**
- The hero catalog is the teaching party plus `map.mercenaries` (`src/content/heroes/mercenaries.ts`). New mercenaries appear on the Lobby hiring board automatically.
- Battle field spots follow party slots and lanes, not hero ids:
  - front-lane members take the two front spots in slot order, back-lane members the two back spots;
  - overflow uses the other row.
- Placement rules for art are in `docs/handoffs/ART-PLACEMENT-RULES.md`.
- **Save fix:** an active battle is now validated against the run's own deployed party, stars included. Before this, a save from a battle that included a hired mercenary was wrongly rejected.

**1. Garran — Spear (front, SPD 90, HP 70, Attack 12).**
- **ตั้งทวน (Brace)**, cooldown 2, targets himself.
  - Until Garran's next turn, the **first physical enemy hit on any front-lane ally** (himself included, Guard redirects included) is answered after the hit with a counter for the brace power (14, +stars). This can defeat the attacker.
  - Energy hits never trigger it. It cannot be stacked, and it ends if Garran falls.
  - Previews, replay and the advisor use the same resolver (`state.counter`).
- **แทงทะลวง (Piercing Thrust)**, cooldown 2: 22 damage to one enemy.
- **Evidence:** the advisor wins every catalogued encounter with Garran replacing either the Knight or the Duelist (`tests/encounters.test.ts`). Brace counter, consumption, expiry, the energy exception and replay/preview equality are covered in `tests/battle.test.ts`.
- **Art:** his own frame and portrait from ART-CHAR-MERC-ENEMY-001 (`units_mercs`/`portraits_mercs`, mapped in `game/visuals/assets.ts`). Skill icons are code-drawn line icons.
- **Version bumps (skills added to shared encounter content):** veil-siege 7, rear-ambush 5, rift-warden 5, the rest 3.

**2. Mira — Archer (back, SPD 105, HP 50, Attack 13).** Her mechanic is delaying enemy turns.
- **ยิงสกัด (Hindering Shot)**, cooldown 2: 12 damage. A survivor gets `delayedRound = round + 1`.
  - In that round, `roundOrder` places it after every other actor; its relative order with other delayed enemies is unchanged.
  - The current round's frozen order never changes. The round after, it returns to its SPD place.
  - The SPD forecast (`upcomingTurns`) shows the delay.
- **ห่าธนู (Volley)**, cooldown 3: 10 damage to every living enemy.
  - Its target is `enemies`; in the UI, tapping any living enemy casts it.
- **Advisor:** volley while two or more enemies live; otherwise hinder the fastest enemy.
- **Evidence:** the advisor wins every encounter with Mira replacing either back-liner. Delay order, frozen current round, volley, and replay/preview equality are covered in tests.
- **Art:** her own frame and portrait from ART-CHAR-MERC-ENEMY-001.
- **Version bumps:** veil-siege 8, rear-ambush 6, rift-warden 6, the rest 4.

**3. Toma — Alchemist (back, SPD 95, HP 48, Attack 9).** His mechanic is corrosion plus haste.
- **ขวดกรด (Acid Flask)**, cooldown 2: 8 damage.
  - A survivor is corroded for `corrodeDuration` = 2 rounds, including the current one (same rule as Mark).
  - While corroded, every hero hit on it gains a flat `corrodeBonus` (+6). That includes attacks, skills, volley and the spear counter, and it stacks with the Mark bonus. The flask's own hit does not get the bonus.
- **ยาเร่ง (Haste Tonic)**, cooldown 3: any living ally, including Toma, acts before everyone else next round (`hastedRound`).
  - The current round stays frozen, and the SPD forecast shows the change.
  - It cannot be re-applied to an ally who is already hasted.
- **Turn order with both effects:** hasted heroes first, then everyone by SPD, then enemies delayed by Mira.
- **Advisor:** acid on the main target when it is not corroded; otherwise haste the hardest-hitting standing ally.
- **Evidence:** the advisor wins every encounter with Toma replacing either back-liner. Tests cover the corrosion window and bonus, haste ordering for one round only, the no-stacking rule, and replay/preview equality.
- **Art:** his own frame and portrait from ART-CHAR-MERC-ENEMY-001.
- **Version bumps:** veil-siege 9, rear-ambush 7, rift-warden 7, the rest 5.

**4. Sefa — Scout (front, SPD 115, HP 54, Attack 12).** Her mechanic is striking before the enemy moves and stepping out of a hit.
- **จู่โจมก่อน (Ambush)**, cooldown 2: 12 damage, plus `ambushBonus` (+12) when the target still has its turn ahead in the current round (its place in the frozen queue comes after hers). The SPD queue shows who that is.
- **ก้าวเงา (Shadow Step)**, cooldown 3, targets herself.
  - The first enemy hit aimed at Sefa before her next turn misses completely, physical or energy (`HeroState.evading`).
  - A missed hit is not a hit: no barrier is spent and a braced spear keeps its counter.
  - A Guard redirect lands on the Knight instead, so the step stays ready.
  - It lapses when her own turn returns, and it ends if she falls.
  - The intent panel shows "การโจมตีนี้พลาด" with 0 damage, and the field floats "หลบ!".
- **Advisor:** shadow step when the announced hit aims at her; otherwise ambush an enemy that has not acted yet this round.
- **Evidence:** the advisor wins every encounter with Sefa replacing either front-liner. Tests cover the ambush bonus window (including a slower scout), the dodge, the lapse, the kept spear counter, and replay/preview equality.
- **Art:** her own frame and portrait from ART-CHAR-MERC-ENEMY-001.
- **Version bumps** (with the new foes below): veil-siege 10, rear-ambush 8, rift-warden 8, the rest 6; crystal-stampede is new at 1.

**5. Brann — Hammer warden (front, SPD 65, HP 92, Attack 11).** His mechanic is drawing every attack onto himself.
- **ยั่วยุ (Challenge)**, cooldown 3, targets himself.
  - From the cast until Brann's next turn, every enemy move aims at him, physical or energy (`state.taunt`).
  - This is applied when the intent is decided, so the announced target, the SPD forecast and Guard all show Brann. Later turns already show the original slots again.
  - Hits he takes while taunting are reduced by `tauntReduction` (35%, rounded up, after Guard).
  - It ends at his next turn, if he falls, or when the battle ends. It cannot be stacked.
- **ทุบค้อนรูน (Rune Slam)**, cooldown 2: 18 damage.
- **Advisor:** challenge when the announced hit aims at someone else; otherwise slam.
- **Evidence:** the advisor wins every encounter with Brann replacing either front-liner. Tests cover the redirected forecast, the reduced hits (12 → 8, 26 → 17), the expiry, and replay/preview equality.
- **Art:** his own frame and portrait from ART-CHAR-MERC-ENEMY-001.
- **Version bumps:** veil-siege 11, rear-ambush 9, rift-warden 9, crystal-stampede 2, the rest 7.

**6. Lio — Bard (back, SPD 85, HP 50, Attack 9).** His mechanic is a persistent song (`state.song`).
- Only one song plays at a time. It lasts until Lio switches songs, falls or the battle ends.
- Starting the same song again is refused ("กำลังบรรเลงเพลงนี้อยู่แล้ว"). Each song has its own cooldown (2).
- **เพลงกล้า (Song of Valor):** every hero hit gains +4. That covers attacks, skills, volley and the spear counter (`hitBonus`), and it stacks with corrosion and Mark.
- **เพลงฟื้น (Song of Mending):** as each new round begins, every standing ally heals 5. It never exceeds max HP and never revives the fallen.
- **Advisor:** mending once any standing ally is below half HP; otherwise valor if no song plays; otherwise attack.
- **Evidence:** the advisor wins every encounter with Lio replacing either back-liner. Tests cover the valor bonus and switching, mending caps, the song stopping when Lio falls, and replay/preview equality.
- **Art:** his own frame and portrait from ART-CHAR-MERC-ENEMY-001.
- **Version bumps:** veil-siege 12, rear-ambush 10, rift-warden 10, crystal-stampede 3, the rest 8.

## Veil Frontier foes in battle (ART-CHAR-MERC-ENEMY-001)

- Enemy ids remain the two **field positions**: `raider` (back, normal size) and `brute` (front, large). `EnemyDefinition.art` picks the illustrated frame. Without it, the original Raider/Brute frames are shown (the teaching battle and veil-siege keep them).
- Physical-looking foes use physical moves and energy-looking foes energy moves. The elite and mini-boss art may mix both.
- HP, SPD, damage and target slots are unchanged except where noted, so the balance evidence carries over.

| Encounter (zone) | Foes (art) | Moves |
|---|---|---|
| scout-patrol → "ภูตเมล็ดลม" (meadow) | Dandelion Sprite (`foe_sprite`) | Seed Spark, all energy (was a mix) |
| rift-whelp → "หมูป่าหลังตะไคร่" (meadow, thicket) | Mossback Tusker (`foe_tusker`) | Tusk Charge, all physical, aimed at slots 1/0/1 |
| shadow-stalker → "ลิงซ์หนามพราง" (thicket) | Briar Stalker (`foe_stalker`) | Thorn Pounce, all physical, aimed at slots 1/0/1 |
| thicket-ambush → "ราชินีแห่งพงหนาม" (thicket) | Hollow Mycon (`foe_mycon`) + Thorn Matriarch (`foe_matriarch`, elite art) | Mycon Spore Hex (energy); Matriarch Thorn Bloom (energy) and Briar Lash (physical) |
| rear-ambush (scar) | Rift Weaver (`foe_riftweaver`) + the original Rift Channeler | Weaver Rune Lash (energy) and one Ribbon Snare (physical, Bash can stop it) |
| **crystal-stampede** (scar, new, weight 1, replaces thicket-ambush in the scar pool) | Shard Golem (`foe_golem`, 100 HP, SPD 75) + Crystal Juggernaut (`foe_juggernaut`, elite art, 180 HP, SPD 60) | Crystal Fist 16/18/16 (physical); Horn Charge 24/26 (physical) and Shard Burst 22 (energy) |
| rift-warden (boss) | Veilbound Sentinel (`foe_sentinel`, mini-boss art) | unchanged |

- Elite and mini-boss **rules** (tougher stats, rewards, map placement) remain phase 3. Only their art is in use now.
- **Matriarch facing:** she was delivered facing right. The runtime atlas mirrors her frame and portrait so she faces the party.
- **Evidence:** the advisor wins all nine encounters from 60% HP and with every new class swapped in. Both scripted rear-ambush plans still win. The full-expedition run still reaches the goal.

## L2 rules: commander creation

**Flow.**
- **New game:** Home → "เริ่มเกม" → create commander → Lobby.
- **Old save without a commander:** "เข้าค่าย" opens the creation screen once.
- **Replacing a save:** starting a new game over an existing save needs the title's second press. The old save is only replaced when the commander is confirmed; backing out keeps it.

**Commander.**
- The commander leads the company from the camp and never fights. This keeps "no fixed heroes"; mercenaries remain the only fighters.
- The commander has a **name**, a **crest** and a **banner colour**:
  - Name: 1–20 code points after whitespace is collapsed; Thai marks count; `<`, `>` and control characters are refused.
  - Crest: one of 6 (ดาวนำทาง, โล่พิทักษ์, ธงศึก, ศรเวท, แสงเยียวยา, ตราล่า).
  - Banner colour: one of 6 Luminous Veil tones.
- The Lobby header shows the crest and the name.
- It cannot be changed in this version.
- The crest uses the shipped line icons; there is no commander portrait art yet.

## Phase 2C-1 rules (draft numbers; now applied in the Lobby)

**Stars.**
- Each star above ★1 adds 8% to max HP and Attack (rounded) and +8% skill power via `HeroDefinition.skillBonus`, which the resolver, previews and skill text all read through `skillPower`. SPD never changes, so stars never reorder turns.
- ★3 adds each class's third skill and ★5 switches on its passive (world `starred`); see Star unlocks.

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

Key `asterveil.fateweave.expedition.v1`, envelope `{ version: 6, profile, run }` (run = the expedition below, or null). State fields:
- map id/version, seed, roll counter;
- position, steps, pressure, fog string;
- roster `{ deployed, reserve }`, `members` (stars/duplicates per brought member), HP for every brought member, last camp;
- resources `{ ore, ember, seal }`, `openedChests`, `restReady`;
- tutorial/boss/completed flags, wins/defeats;
- the active battle `{ kind, encounterId, entry, commands }`.

Every field is validated on load. The active battle is replayed under current rules, so a foreign-owner command, an unknown encounter or a wrong map version rejects the save, and the title screen then offers only a new expedition. A finished battle is applied in the same write that records its last command, so a reload never repeats damage.

The practice keys (`asterveil.fateweave.battle.v1`, `.rear-ambush`, `.rift-warden`, `asterveil.fateweave.encounter.v1`) are deleted at start and never read. The teaching-advice preference key `asterveil.fateweave.tutorial.v1` is kept.

Save history:
- Version 1 (phase 1) was new; earlier practice saves were intentionally dropped.
- Version 6 (L2) adds `profile.commander` (`null` until created). v5 profiles migrate with `null`. A v6 profile must contain the field, and an invalid name, crest or colour is rejected.
- Version 5 (lobby L1) splits the envelope into `profile` and `run`.
  - A v1–v4 `state` becomes the run; its camp board is dropped.
  - The profile is built from the run's roster and stars, with an empty bank.
  - A run that had already reached the goal, or had lost everyone, is settled at once.
  - The profile is validated field by field: company ≤ 20 unique catalog ids, party ⊆ company, members, bank, board indexes and the last result. Run members must belong to the company.
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

## Star unlocks (★3 skill, ★5 passive; approved 2026-10-15, draft numbers)

Every class (the starting four included) gains one battle skill at ★3 and one always-on passive at ★5. `starred` appends the skill to the member's actions and sets `passive`; the resolver reads both from the deployed hero definition, so ★1–2 members and old battles are unchanged. Numbers live in `veil-siege.ts` skills and rules.

| Class | ★3 skill | ★5 passive |
|---|---|---|
| Aegis (Knight) | **Rally Guard** `rally` (cd 3): until Aegis's next turn, each living ally's first enemy hit is reduced 35% (after Guard/taunt) | **Stand** `stand`: once per battle, a hit Aegis reduced (Guard or Rally) that would down its recipient leaves them at 1 HP |
| Lyra (Duelist) | **Finishing Lunge** `finisher` 16 (cd 2): double below 40% enemy HP; does not use Mark | **Keen Eye** `keeneye`: her Marks last one round longer |
| Eira (Mage) | **Sigil Bind** `sigil` 8 (cd 3): cancels the target's next *energy* move (Bash covers physical) | **Echo** `echo`: Ward +50% on the hero the enemy has announced it will strike |
| Seren (Priest) | **Sanctuary** `sanctuary` (cd 3): one ally cannot drop below 1 HP until Seren's next turn | **Afterglow** `afterglow`: healing beyond full HP becomes a barrier (≤8, not stacking) |
| Garran (Spear) | **Spear Wall** `spearwall` 8 (cd 3): counters *every* physical hit on the front lane until his next turn | **Heavy Counter** `heavycounter`: Brace counters +50% |
| Mira (Archer) | **Weak-point Shot** `weakshot` 16 (cd 2): +12 on a hindered (delayed) enemy | **Tailwind** `tailwind`: Volley cooldown 2 |
| Toma (Alchemist) | **Blast Flask** `bomb` 10 (cd 3): every enemy; corrosion adds as usual | **Potent** `potent`: corrosion lasts one round longer |
| Sefa (Scout) | **Backstab** `backstab` 20 (cd 2): only an enemy whose next move is not aimed at Sefa | **Shadow Counter** `shadowcounter`: a dodged hit is answered for 8 |
| Brann (Warden) | **Earthshaker** `quake` 14 (cd 2): +10 if the target's next move aims at Brann | **Stoneskin** `stoneskin`: Challenge reduces hits 50% (not 35%) |
| Lio (Bard) | **Finale** `finale` (cd 3): ends Lio's song and releases it: valor = 16 to every enemy, mending = heal every ally 12 | **Resound** `resound`: songs +50% (valor and mending) |

- UI: a ★3 member has four command buttons (one row, ≥44 px at 320 px wide); passives appear in the affected skill's description; the lobby member panel lists both unlocks with their state.
- Tests: `tests/stars.test.ts` (each skill and passive, unlock gating, ★5 parties win veil-siege with their ★3 skills) and browser tests for the four-button row and the lobby panel.

## Levels (2D-1, approved 2026-10-15, draft numbers)

**Monster levels.** Every encounter has a reference level (its content numbers): first-clash 1; meadow encounters 2; thicket 5; scar 8; Rift Warden 10. Zones have level ranges (meadow 1–3, thicket 4–6, scar 7–9): a random battle takes the level of the tile it starts on, low at the zone's southern (entrance) rows and high at its northern rows (`monsterLevelAt`), and stores it in the battle. The tutorial and boss keep their own level. `withLevel` scales enemy max HP and move damage by 7% per level from the reference; SPD and rules never change. The map HUD shows the level here, in red with "อันตราย" when the deployed team's average level is 2+ below it; enemy names in battle read "Lv5 …".

**Member levels.** Per member, cap 10. Each level adds 3% max HP, Attack and skill power (stacking with stars' 8%); SPD never changes. EXP to the next level = 10 + 10 × level (20, 30 … 100).

**EXP.** Each victory gives every brought member (deployed and reserve, standing or fallen) `enemies × (6 + 2 × monster level)`, ×3 for the boss, multiplied by the level gap (`expPercent`): up to 2 levels above the monster 100%, 3 → 75%, 4 → 50%, 5 → 25%, 6+ → 10% (never zero); 3+ levels below the monster 120%. A level-up raises max HP and standing members gain the difference. Levels are kept in the profile whatever the outcome. The advisor's short full run ends at level 6.

**Save v7.** Members may carry `level`/`exp`; an active battle may carry its monster `level`. v6 data loads unchanged (level 1, encounter level). The command validator now also accepts the ★3 skills.

## Talent tree (2D-1b; owner-scoped and approved 2026-10-16, draft numbers)

The owner asked for a skill tree made only of passives ("ความถนัด"). This scopes the CLAUDE.md rule-10 exception for a skill tree: passive nodes only, no new battle buttons.

- Points: 1 per level-up (9 at the level cap 10). Spent and reset (free, any time) only in the Lobby, in the talent-tree sheet (its own window, opened from a member in the team sheet, with a member picker and a back button); talents are fixed during an expedition (levels gained on the run add points for the next visit).
- Shape (same for every class): root (1 rank) → branch A and branch B, each tier 1 (2 ranks) → tier 2 (2 ranks) → capstone (1 rank). 7 nodes, 11 ranks, so a member cannot take everything.
- Gates: the root first; tier 2 needs 1 rank in its tier 1; a capstone needs 4 ranks in its branch.
- Stat nodes add to the star/level percent (`starred`); every other effect is read by the resolver from `HeroDefinition.talents`, so preview and replay use the same rules. 0 points = today's numbers.

| Class | Root | A tier 1 / tier 2 / capstone | B tier 1 / tier 2 / capstone |
|---|---|---|---|
| Aegis (ผู้ลงทัณฑ์ / ปราการ) | HP +5% | Attack +4%/rank · Bash +4/rank · **Retribution**: a Bash that stops a physical move +8 | HP +5%/rank · Guard reduction +5%/rank · **Counter**: a guarded hit is answered for 8 |
| Lyra (ดาบเจาะ / นักเต้นดาบ) | Attack +4% | Attack +4%/rank · Precision Strike +4/rank · **Deep Mark**: her hits on a marked enemy +6 | HP +5%/rank · Precision Strike on a marked enemy heals her 3/rank · **Relentless**: downing an enemy resets Precision Strike |
| Eira (เวทโจมตี / เวทป้องกัน) | Skill +4% | Skill +4%/rank · Bolt +4/rank · **Split Bolt**: other enemies take half | HP +5%/rank · Ward +3/rank · **Reflect**: a ward that absorbs a hit strikes back 6 (once) |
| Seren (ผู้เยียวยา / ผู้คุ้มครอง) | Skill +4% | Heal +3/rank · Prayer +2/rank · **Twin Heal**: the most hurt other ally gets half | HP +5%/rank · Heal adds a 2/rank barrier (not stacking) · **Solace**: the healed ally takes 15% less until Seren's next turn |
| Garran (ทวนรุก / ทวนรับ) | HP +5% | Attack +4%/rank · Pierce +4/rank · **Piercing Line**: other enemies take half | HP +5%/rank · Brace counter +3/rank · **Front Wall**: while braced, physical hits on the front lane −10% |
| Mira (นักแม่นธนู / ฝนธนู) | Attack +4% | Attack +4%/rank · Hinder +3/rank · **Hunter**: her hits on a hindered enemy +6 | HP +5%/rank · Volley +2/rank · **Volley Hinder**: Volley hinders the fastest enemy |
| Toma (กรดกัดกร่อน / ยาเสริม) | Skill +4% | Acid +2/rank · corrosion +2/rank · **Acid Spread**: Acid corrodes the other enemies (no damage) | HP +5%/rank · Haste heals 4/rank · **Quick Brew**: Haste cooldown −1 |
| Sefa (นักลอบ / นักหลบ) | Attack +4% | Attack +4%/rank · Ambush bonus +4/rank · **Shadow Layer**: Ambush grants Shadow Step | HP +5%/rank · a dodge heals 3/rank · **Double Shadow**: Shadow Step dodges two hits |
| Brann (ค้อนรูน / ปราการหิน) | HP +5% | Attack +4%/rank · Rune Slam +4/rank · **Hammer Counter**: while challenging, each hit is answered for 6 | HP +6%/rank · Challenge reduction +5%/rank · **Stone Regen**: below half HP he heals 6 at the start of his turn |
| Lio (เพลงรบ / เพลงปลอบ) | Skill +4% | Valor +1/rank · Attack +5%/rank · **Chorus**: while valor plays every enemy hit −2 | HP +5%/rank · Mending +2/rank · **Overture**: the battle opens with mending playing |

Counters from talents add corrosion/valor like other counters. Stone regen does not trigger on Brann's very first turn of a battle.

**Save v8.** Members may carry `talents` (ranks per node); every load re-checks ranks, gates and points against the member's level. v7 data loads unchanged (no talents).

**Tests.** `tests/talents.test.ts` (shape, stats, every node's effect, gates, points, reset, settle, save) and a lobby browser test (separate sheet, member picker, spend, gate reason, ≥44px nodes, reset, saved v8, phone portrait).

## Equipment (2D-2; design approved 2026-10-15, draft numbers)

Sets are 2D-3 (below); the forge (enhance, fuse, reroll; 2D-4) and map potions (2D-5) come later. Icons are code-drawn placeholders until the ART-UI-EQUIP-001 handoff.

**Slots.** Weapon (one class only: `Item.hero`), head, body, gloves, boots, charm. Values come from the item level L (the monster level it dropped at) as `round(base + perLevel × (L − 1))`, never stored:

| Slot | Base stats (L1 → L10) |
|---|---|
| Weapon | Attack 2 → 7, skill power +3% → +12% |
| Head | HP 4 → 13, skill +1% → +6% |
| Body | HP 7 → 25 |
| Gloves | Attack 1 → 4, skill +1% → +6% |
| Boots | HP 4 → 13, SPD +1 → +3 |
| Charm | skill +4% → +13% |

**Rarity.** Common / good / rare / epic / legendary with 0 / 1 / 2 / 3 / 3 distinct affixes; a legendary also has one special. Affixes (L1 → L10): HP +4 → +13, Attack +1 → +4, skill +2% → +7%, healing +4% → +13%, starting barrier 3 → 8, SPD +1 → +2 (boots and charms only). Specials: **last stand** (once per battle a hit that would down the wearer leaves 1 HP), **mark hunter** (the wearer's hits on a marked enemy +8), **renewal** (heal 4 at the start of the wearer's turn).

**Stats in battle.** Gear adds flat max HP, Attack and SPD after the star/level/talent percentages, and adds its skill percent to theirs; healing percent raises every heal the wearer casts (including mending), and the barrier is present at the start of each battle for standing heroes. The resolver reads `HeroDefinition.gear`; nothing worn leaves a definition unchanged.

**Drops.** The tutorial never drops. A random victory drops one item at 35%, guaranteed after 6 dry wins in a row (pity, `dry` in the run); the boss always drops one (rare 50 / epic 35 / legendary 15). Normal weights: common 55, good 28, rare 12, epic 4, legendary 1. Slot uniform; a weapon is made for one of the brought members. Rolls use the run's (seed, rolls) stream, so a reload cannot re-roll a drop.

**Found items** ride with the run (shown in the map pack). Completing or withdrawing brings them home; a wipe loses them. The bag holds 60 unequipped items; whatever does not fit is salvaged automatically and reported.

**Lobby.** From a member in the team sheet, **อุปกรณ์** opens the equipment sheet (its own window, with a member picker and a back button): six slots, the bag filtered by the chosen slot, equip (swaps with the slot), unequip (needs bag space) and salvage (rare and better ask for a second press; one button salvages every common). Salvage: common 2 ore + 1 dust, good 3 + 2, rare 5 + 4, epic 8 + 8, legendary 12 + 15. Veil dust is banked for the forge. Dismissing a member returns their gear to the bag (overflow salvaged).

**Save v9.** Members may carry `gear`; the profile gains `items`, `nextItem`, `bank.dust` and last-result `items`/`salvaged`; the run gains `found` and `dry`. Every item is checked (slot, class, affixes, special, uid unique and below `nextItem`). v1–v8 data migrates with nothing.

**Tests.** `tests/equipment.test.ts` (stats, validity, rolls, battle effects, drops and pity, settle, equip/unequip/salvage/dismiss, save v9) and a lobby browser test.

## Equipment sets (2D-3; design approved 2026-10-15, draft numbers)

A dropped item belongs to one of its zone's two sets at 60% (the boss: any of the six). Any slot can carry a set, the weapon included. Pieces of the same set count together: 2 pieces give a stat, 4 pieces add a rule. Six slots allow 4 + 2 or 2 + 2 + 2; nothing forces a full set.

| Set | Drops in | 2 pieces | 4 pieces |
|---|---|---|---|
| Dawn Guardian (ผู้พิทักษ์รุ่งอรุณ) | meadow | max HP +10% | start each battle with a 12 barrier (adds to gear barriers) |
| Swift Wind (สายลมเร็ว) | meadow | SPD +3 | act before everyone in round 1 |
| Shadow Hunter (นักล่าเงา) | thicket | Attack +8% | the wearer's hits on an enemy that has not acted yet this round +6 |
| Thorn (หนามสวน) | thicket | max HP +6% | a physical hit taken is answered for 6 (while both stand) |
| Star Veil (เวทม่านดาว) | scar | skill power +10% | the battle's first skill with a cooldown is ready again at once |
| Mender (ผู้เยียวยา) | scar | healing +15% | overhealing becomes a barrier up to 8 (not stacking; with Afterglow the larger cap applies) |

Set percentages add to the star/level/talent percentages. The resolver reads the 4-piece rules from `HeroDefinition.gear` (`firstStrike`, `freshHit`, `thorns`, `freeCast`, `overflowCap`). The equipment sheet lists each worn set with its pieces and lights the active bonuses; bag rows name the set.

**Save v10.** Items may carry `set`; unknown sets are rejected. v9 data loads unchanged.

**Tests.** `tests/sets.test.ts` (each bonus, 2 + 2 mixing, set rolls, zone sets, save) and a lobby browser test.

## Forge (2D-4; design approved 2026-10-15, draft numbers)

The lobby's **ช่าง** menu opens the forge sheet: every piece (bag or worn) in one list, then three actions on the chosen piece. Rules live in `core/world/forge.ts`, numbers in `map.equipment.forge`.

- **Enhance (ตีบวก).** Always succeeds. Level n costs `3 + n` ore and `ceil(n / 2)` veil dust. Each level adds 6% to the slot's base stats (affixes unchanged). Caps by rarity: +5 / +10 / +15 / +20 / +25.
- **Fuse (หลอมรวม).** The chosen piece (bag or worn) plus two bag pieces of the same slot and rarity become the chosen piece one rarity up. It keeps its class, level, set and affixes, gains affixes up to the new rarity's count (an epic fusing into a legendary gains a special instead), and keeps half its enhance level. The cheapest matching pieces are used (lowest enhance, then lowest level), and the sheet names them before the press. Another class's weapon can be material.
- **Reroll (ปรับค่า).** One contract seal turns the chosen affix into one the piece does not have yet; the others stay.
- **Salvage** of an enhanced piece returns 1 extra dust per enhance level.
- Fuse and reroll draw from `(profile seed, forge)`, a counter saved in the profile, so a reload never changes a result.

**Save v11.** Items may carry `plus` (checked against the rarity cap); the profile gains `forge` (older data: 0).

**Tests.** `tests/forge.test.ts` (costs, caps, stats, worn pieces, fuse rules and determinism, reroll, salvage, save) and a lobby browser test.

## Map potions (2D-5; design approved 2026-10-16, draft numbers)

| Potion | Effect | Brew cost |
|---|---|---|
| Salve (ยาฟื้นแผล) | one standing member heals 40% of max HP | 6 ore + 2 dust |
| Tonic (ยาฟื้นหมู่) | every standing member heals 20% of max HP | 10 ore + 4 dust |
| Repel (ยาไล่ม่าน) | the next 10 steps through encounter zones roll no random encounter and add no pressure (the boss still blocks its tile) | 8 ore + 3 dust |

- **Brewing** happens in the lobby's **ยา** sheet; the home stock has no cap.
- **Packing:** each departure packs up to 3 of each, taken out of the stock.
- **Chests:** a common chest adds a potion at 35% (salve 3 : tonic 1 : repel 1); a rare chest at 70% (1 : 2 : 2). Nothing is added when that potion is already at 3.
- **Use:** on the map only, from the pack dialog (a salve asks who drinks it); never in battle. Nothing revives: reviving stays the job of embers at a camp.
- The danger chip shows the steps of repel left.
- **Settling:** complete or withdraw brings unused potions home; a wipe loses them.
- **Phone layout:** with four lobby menu buttons, portrait phones put the depart button on its own full-width row.

**Save v12.** The profile gains `potions` (the home stock); the run gains `potions` (carried, ≤ 3 each) and `repel`. v11 data migrates with none.

**Tests.** `tests/potions.test.ts` (brewing, packing, settling, each potion, battle lock, chests, save) and a browser test (brew, depart, drink a salve and a repel).

## Events and elites (3A; approved 2026-10-16 "อีลิทบังคับสู้", draft numbers)

**Elites are forced fights.** The map (version 2) narrows two passages to a single tile, and an elite stands on each:

| Elite | Gate | Encounter (reference level) |
|---|---|---|
| จ่าฝูงแห่งทุ่ง (Tusker Chief + Dandelion Sprite) | `gate-meadow` (9,18), meadow → thicket | `elite-tusk-chief` (Lv5) |
| เจ้าป่าหนาม (Briar Lord + Briar Stalker) | `gate-thicket` (9,10), thicket → scar | `elite-briar-lord` (Lv8) |

- Stepping into an unbeaten elite starts its battle at once, like the boss; there is no way around.
- A win marks the elite beaten for the run (the token disappears and the tile is floor). It also gives EXP ×2, a guaranteed item (rarity weights 0 : 0 : 60 : 30 : 10, so rare or better) and the zone's normal loot.
- A loss sends the team back like any defeat, and the elite stays.
- Step hints into an elite tile are red, like the boss.

**Event tiles** ("!" markers) open a choice dialog instead of rolling an encounter. Closing the dialog leaves the event waiting: the action button (**ดู**) reopens it. Finished events lose their marker for the run.

| Event | Choices |
|---|---|
| Bandits (thicket, scar) | **Fight:** a battle from the zone pool at the tile's level +1; the win always drops an item. **Sneak past:** no fight, but the zone pressure rises to its cap. |
| Shrine (thicket) | **Pray:** standing members heal 25%, then every brought member's max HP drops 5% for the rest of the run (a wound, capped at 20%). **Offer:** 10 ore for 1 seal. |
| Merchant (meadow) | Buy a salve (8 ore), tonic (14) or repel (10), up to the carry limit; the merchant never closes. |
| Traveller (meadow) | **Help:** give a salve for 10 ore and 1 seal. |
| Rift (scar) | **Fight:** `scout-patrol` at the tile's level; the win pays 12 veil dust instead of an item. |

- Choices are pure world rules (`chooseEvent`, `eventChoiceReason` in `core/world/world.ts`; numbers in `map.eventRules`). Fights are battles of kind `event` with the event as `source`.
- Veil dust from the run (`run.dust`) settles into the bank like ore (kept in full on complete/withdraw, halved on a wipe).
- Wounds live on the run's members only (`MemberProgress.wound`) and never reach the profile. `memberDef` (and the map HUD) applies them, and HP is clamped to the lowered maximum.

**Save v13.** The run gains `elitesDefeated`, `eventsDone` and `dust`; members may carry `wound`; battles may be `elite`/`event` with a `source` (an elite battle for a beaten elite, or an event battle for a finished event, is rejected). v12 data migrates empty. A run saved on an older map version can no longer be replayed on the new board, so it is settled home as **withdrawn** (its ore, seals, found items, potions, dust and EXP) instead of discarding the whole save.

**Tests.** `tests/events.test.ts` (one-tile gates, forced elite fight, win/loss, every event choice, wounds, dust settling, save v13 and stale-map settling), the full-expedition run in `tests/world.test.ts` (it now beats both elites) and the advisor/class regressions that cover both elite encounters, plus browser tests for the elite gate and the shrine/merchant dialog.
