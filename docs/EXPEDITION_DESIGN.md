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
| 3. Choices and content | 3A events with fight/avoid choices and forced elites; later mini boss, puzzles (rune order, push stone, lever), secrets, map quest "2 of 3" and side quests | **3A–3D implemented** (see Events and elites; Rift seal and mini-boss; Puzzles and secrets; Camp side quests) |
| 4. Economy and wrap-up | Local gold and shop, salvage, fast travel between camps, elite respawn on rest, defeat penalty, whole-map balance simulation, completion screen | **Phase 4 done:** 4A, 4B, 4C, 4E and 4F implemented; 4D kept as is (see Camp market; Camp travel and elite returns; Balance simulation; Expedition summary) |

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
- **Veil ember (ถ่านคืนชีพ):** revives one fallen member at a camp.
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

**Monster levels.** Every encounter has a reference level (its content numbers): first-clash 1; meadow encounters 2; thicket 5; scar 8; Rift Warden 10. Zones have level ranges (meadow 1–3, thicket 4–6, scar 7–9): a random battle takes the level of the tile it starts on, low at the zone's southern (entrance) rows and high at its northern rows (`monsterLevelAt`), and stores it in the battle. The tutorial keeps its own level; elites, the mini-boss and the boss fight at their map fight level (4E: `EliteDefinition.level`, `map.bossLevel`). `withLevel` scales enemy max HP and move damage by 7% per level from the reference; SPD and rules never change. The map HUD shows the level here, in red with "อันตราย" when the deployed team's average level is 2+ below it; enemy names in battle read "Lv5 …".

**Member levels.** Per member, cap 10. Each level adds 3% max HP, Attack and skill power (stacking with stars' 8%); SPD never changes. EXP to the next level = 20 + 45 × level (65, 110 … 425; retuned in 4E from 10 + 10 × level).

**EXP.** Each victory gives every brought member (deployed and reserve, standing or fallen) `enemies × (6 + 2 × monster level)`, ×3 for the boss, multiplied by the level gap (`expPercent`): up to 2 levels above the monster 100%, 3 → 75%, 4 → 50%, 5 → 25%, 6+ → 10% (never zero); 3+ levels below the monster 110% (120% before 4E). A level-up raises max HP and standing members gain the difference. Levels are kept in the profile whatever the outcome. The advisor's short full run ends at level 6.

**Save v7.** Members may carry `level`/`exp`; an active battle may carry its monster `level`. v6 data loads unchanged (level 1, encounter level). The command validator now also accepts the ★3 skills.

## Talent tree (2D-1b; owner-scoped and approved 2026-10-16, draft numbers)

The owner asked for a skill tree made only of passives ("ความถนัด"). This scopes the CLAUDE.md rule-10 exception for a skill tree: passive nodes only, no new battle buttons.

- Points: 1 per level-up (9 at the level cap 10). Owner update 2026-10-19: spend in the Lobby or on the map through a brought character sheet, outside battle. Reset remains free only in the Lobby. Map spending keeps current HP unchanged (including fallen members), uses existing gates and budget, advances no steps/RNG, persists immediately in v21, and settles home with levels/EXP on every outcome.
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

**Drops.** The tutorial never drops. A random victory drops one item at 35%, guaranteed after 6 dry wins in a row (pity, `dry` in the run); the boss always drops three (`bossDrops`; each rare 20 / epic 45 / legendary 35, owner 2026-10-16: the final boss must out-pay the mini-boss and elites). Normal weights: common 55, good 28, rare 12, epic 4, legendary 1. Slot uniform; a weapon is made for one of the brought members. Rolls use the run's (seed, rolls) stream, so a reload cannot re-roll a drop.

**Found items** ride with the run (shown in the map pack). Completing or withdrawing brings them home; a wipe keeps only the best one (`wipeKeep` 1: highest rarity, then level, then the earliest found; owner 2026-10-16) and loses the rest. The bag holds 60 unequipped items; whatever does not fit is salvaged automatically and reported.

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
| Star Veil (เวทแสงดาว) | scar | skill power +10% | the battle's first skill with a cooldown is ready again at once |
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

## Events and elites (3A; approved 2026-10-16, revised the same day: "แก้ไขเป็นบางตัวบังคับสู้"; draft numbers)

**Some elites are forced fights.** `EliteDefinition.forced` marks an elite that stands on a one-tile gate with no way around (tests check the map geometry matches the flag). The others stand in open ground and can be challenged or walked around. Map version 3:

| Elite | Tile | Type | Encounter (reference level) |
|---|---|---|---|
| จ่าฝูงแห่งทุ่ง (Tusker Chief + Dandelion Sprite) | `gate-meadow` (9,18), in the wide meadow → thicket passage | optional (gold token) | `elite-tusk-chief` (Lv5) |
| เจ้าป่าหนาม (Briar Lord + Briar Stalker) | `gate-thicket` (9,10), the only way thicket → scar | **forced** (coral token) | `elite-briar-lord` (Lv8) |

- Stepping into an unbeaten elite starts its battle at once, like the boss. A forced elite cannot be avoided; an optional one only fights if the team steps onto its tile.
- A win marks the elite beaten for the run (the token disappears and the tile is floor) and pays the zone's normal loot plus a reward that depends on the type (owner request 2026-10-16: optional elites pay more, to make the risk worth it):

| Reward | Forced elite (gate) | Optional elite (challenge) |
|---|---|---|
| EXP multiplier | ×2 | ×3 |
| Guaranteed item, rarity weights (common : uncommon : rare : epic : legendary) | 0 : 0 : 60 : 30 : 10 | 0 : 0 : 20 : 50 : 30 |
| Bonus on top of zone loot | — | gold +20, seal +1 |

  Numbers live in `map.eventRules` (`eliteExp`/`eliteRarityWeights` and `optionalElite`). The optional elite's token carries a chest badge. Its encounter message and the world info sheet name the bonus before the fight.
- A loss sends the team back like any defeat, and the elite stays.
- Step hints into an elite tile are red, like the boss. Forced elites wear a coral ring, optional ones gold.

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

**Tests.** `tests/events.test.ts` (forced elites on one-tile gates and optional ones that can be bypassed, elite fight, win/loss, every event choice, wounds, dust settling, save v13 and stale-map settling), the full-expedition run in `tests/world.test.ts` (it must beat every forced elite) and the advisor/class regressions that cover both elite encounters, plus browser tests for the forced elite gate and the shrine/merchant dialog.

## Gold coins: a hiring-only currency (owner request 2026-10-16, draft numbers)

Hiring no longer competes with brewing and the forge for ore.

- **Gold coins (เหรียญทอง, `gold`)** pay only for hiring: 20 per hire; dismissal refunds 10.
- **Ore** keeps paying for star upgrades, brewing, the forge and the merchant.
- **Drops:** every win rolls gold like ore.

| Source | Gold |
|---|---|
| Meadow / thicket / scar win (elite and event fights use their zone) | 2–4 / 2–5 / 4–6 (4A; were 3–6 / 4–8 / 6–10) |
| Tutorial | 5 |
| Boss | 18 (4A; was 30) |
| Common / rare chest | 8–12 / 15–20 |

- Gold rides in `run.resources` and settles into `bank.gold` like ore: all of it on complete or withdraw, half on a wipe. The last-result line shows it.
- Gold is rolled after the other resources, so earlier rolls keep their order.
- **UI:** the lobby bank shows gold first; the hire button, board text and the **จ้าง** menu use the coin icon; the map pack lists gold under ore (line icon until painted art exists).

**Save v14.** Run resources, the bank and the last result gain `gold`. v13 and older data migrate with 0 gold in the run and the last result, and **one hire's worth (20) in the bank**, so a company that saved ore for hiring can still hire once.

## Lobby on portrait phones (owner request 2026-10-16)

- **Portrait:** the camp scene is 3 screen-widths wide and pans sideways (native swipe, scroll snap, and ≥44 px arrow buttons at the edges, hidden at each end and while a sheet is open). It opens on the fire with the team; the six staff stand full size at their stations, three on each side. Returning to the lobby re-centres it; redraws keep the pan.
- **Landscape and wide screens:** unchanged (`--pan: 1`).
- **NPC frames:** frames now change by `transform` on a one-cell window over the atlas, never by `background-position`. Repainting the whole atlas every frame flickered on iOS Safari.
- **Runtime atlases:** downscaled from the ART-CHAR-NPC-001 masters in `incoming/` (unchanged):
  - NPC atlases: 512 → 320 px cells (1280×960);
  - stations: 960×640;
  - busts: 768×512.

  Decoded image memory drops from about 90 MB to about 35 MB, and runtime bytes from 2.03 MB to 1.60 MB. Intake status: ACCEPTED_WITH_TECH_FIX.

## Rift seal and mini-boss (3B; approved 2026-10-16, draft numbers)

**The rift seal.** The boss can be challenged only after **2 of 3** objectives (`map.quest`):

| Objective | Done when |
|---|---|
| `golem` | the mini-boss `scar-golem` is beaten (`run.elitesDefeated`) |
| `chests` | 4 of the 6 chests are open (`run.openedChests`) |
| `rift` | the scar rift event is cleared (`run.eventsDone`) |

- Progress is derived from state that already exists (`questDone`, `questComplete`), so the save shape and version are unchanged (v14).
- Stepping into the boss while sealed is blocked with reason `sealed`. No battle starts and the team stays put; the message names the progress.
- The objective capsule gains a fifth goal, "ทำลายผนึกรอยแยก n/2". The goals dialog lists the three objectives with live progress, and the boss step hint shows a grey lock instead of red.
- Finishing an objective adds "ผนึกรอยแยก n/2" (or "ผนึกแตกแล้ว") to the result message.

**Mini-boss.** "ยักษ์หินแห่งรอยแผล" (`mini-veil-golem`, Lv9):
- Veil Golem 240 HP (physical, signature *Veil Quake* 30 at slot 2) with a Rift Weaver 95 HP (energy).
- Art `foe_golem` / `foe_riftweaver`.
- Stands in the scar's right-hand pocket at (17,6), an optional elite (`mini: true`, not forced).
- Its win replaces the zone loot with `eventRules.miniBoss`:

| Reward | Mini-boss |
|---|---|
| EXP multiplier | ×3 |
| Item rarity weights (common : uncommon : rare : epic : legendary) | 0 : 0 : 0 : 60 : 40 (epic or better) |
| Ore | 30–40 |
| Gold | 15–20 |
| Ember | 1 |
| Seal | 1 |

- The optional-elite bonus does not stack with this reward.
- Token: purple ring and boss badge. The banner reads "มินิบอส".

**Map version 4** (the new mini-boss tile). Runs saved on v3 settle home as withdrawn.

**Tests.**
- `tests/quest.test.ts`: objectives, any-two, sealed boss, mini-boss reward.
- The full-expedition run now beats the mini-boss and the rift before the boss.
- The advisor and class regressions include `mini-veil-golem`.
- Browser test: sealed hint and message, goals dialog, mini-boss token and encounter.

## Lore and prologue (owner-approved 2026-10-16)

**Setting.** The land is **แอสเตอร์เวล** (Asterveil). Its sky is torn by **รอยแยก** (rifts), and the demon tribes pour out of them.
- **Player:** the commander is **ผู้ทอชะตา**, the one who can see the threads of fate of the mercenaries. The game shows this as the forecast of enemy attacks; the commander never fights.
- **Antagonist:** **วาร์กอธ** (Vargoth), chief of the rift demon tribes. The chapter 1 boss, ผู้คุมรอยแยก, is his general at the rift gate; Vargoth himself is kept for a later chapter.
- **Retired term:** the owner retired "ม่านเวล". Terms renamed in the game:

| Old | New |
|---|---|
| ชายแดนม่านเวล (map) | ชายแดนแอสเตอร์เวล |
| ถ่านม่านเวล (ember) | ถ่านคืนชีพ |
| ผงม่านเวล (dust) | ฝุ่นดาว |
| ยาไล่ม่าน (repel) | ยาไล่อสูร |
| ศาลม่านเก่า (shrine) | ศาลเก่า |
| ด่านโจรม่าน (bandits) | ด่านโจร |
| ยักษ์หินม่านเวล (mini-boss) | ยักษ์หินรอยแยก |
| พงหนามม่านเวล (zone) | พงหนามชายแดน |
| เวทม่านดาว (set) | เวทแสงดาว |
| title tagline | ข้ามรอยแยก · ถักทอโชคชะตา |

**Prologue.** A company that has never won its first battle departs straight after commander creation, skipping the lobby. The opening scene has four panels (`ui/story-ui.ts`) over the ruins backdrop:
1. The narrator: the commander wakes.
2. Aegis: "you are the fate-weaver".
3. Vargoth: "this land will be my tribe's".
4. Lyra: "command us".

Then `startPrologue` starts the `first-clash` battle (now "กองหน้าของวาร์กอธ": demon hunter + demon guard, version 10) at the start tile before any step. The save holds the battle, so a reload skips the scene and resumes the fight.
- **Scene controls:** next ("ต่อไป"), skip ("ข้าม"), and Escape to skip.
- **After the win:** a closing scene plays: Vargoth withdraws and will wait at the rift gate, and Seren points to the camp and the rift seal.
- **Vargoth's art:** none yet; a dark silhouette of the rift sentinel portrait stands in until an art handoff.

**Voiced advice.** The first-battle advice is back, labelled "ศึกแรก". The hero whose turn it is says the line (`heroVoice`), with their face, followed by the advisor's move. It can still be hidden from ⓘ.

## Puzzles and secrets (3C; approved 2026-10-16, draft numbers)

**One puzzle per zone guards a rare chest, and one secret wall per zone hides a common chest.**
- **Map version 5 is 23 columns wide:** the vaults sit at x 19–21 behind the old east wall, so no existing coordinate moved.
- **No new battle buttons:** everything is driven by the ordinary one-tile steps.
- **Rules:** pure, in `core/world/puzzles.ts` and `move`. Numbers and places live in `map.puzzles`.

| Zone | Puzzle | How it works | Reward |
|---|---|---|---|
| Meadow | Rune stones ✦ ☾ ☀ at (5,21), (11,19), (16,22) | Step on them in the order carved on the stone door at (18,21). A wrong stone resets the sequence; stepping on the first stone always counts as stone 1. | The door opens onto the vault, rare chest `meadow-vault` at (20,21). |
| Thicket | Boulder at (19,13), pit at (20,13) | Walking into the boulder pushes it one tile in the walking direction, onto plain floor or into its pit, which fills. An open pit blocks. | Rare chest `thicket-vault` at (21,13). |
| Scar | Levers at (5,9) and (15,9), on opposite sides | Each lever counts once; pulling both opens the storeroom door at (18,8). | Rare chest `scar-vault` at (20,8). |

- **Secret walls:**
  - At (3,24), (3,15) and (3,8), drawn with faint violet cracks.
  - They can be walked through. Until found they show no step hint.
  - The first pass reports "พบทางลับ"; behind each is a common chest (`*-secret`).
- **Puzzle steps roll no encounter:** stones, levers, pushes and the first pass through a secret wall answer instead of rolling. Doorways and secret passages have no zone, so they never roll.
- **Rift seal:** the "chests" objective rises from 4 to **6 of 12** chests.

**Save v15.** The run gains `runes` (step per unsolved rune puzzle), `solved`, `levers` (`<puzzle>:<index>`), `boulders` (moved positions) and `secrets`. Everything resets with each new run.
- **Migration:** v14 data migrates with no puzzle state; runs saved on map version 4 settle home as withdrawn.
- **Position checks:** the party may stand in an opened doorway or a secret passage, never in a closed door, a boulder or an open pit.

**Art:** code-drawn placeholders for the stones, levers, boulder, pit, door and cracks. The painted pass is commissioned as `docs/handoffs/ART-WORLD-PUZZLE-001.md` (owner request 2026-10-16).

**Tests:**
- `tests/puzzles.test.ts`: runes in order and reset, levers, boulder and pit, secret walls, save v15.
- The chest reachability test opens puzzles before reaching vaults.
- A browser test walks the rune door, the boulder and a secret wall.

## Camp side quests (3D; approved 2026-10-16, draft numbers)

**Each of the six camp NPCs asks for one thing.** Progress is gathered from finished expeditions and the reward is claimed from that NPC in the Lobby, once.
- **Where the rules live:** `map.sideQuests` holds the data; `settle` adds progress, and `claimReason`/`claimQuest` in `core/world/profile.ts` handle claims.
- **No new battle rules or buttons.**

| NPC | Quest | Counts per run | Target | Reward |
|---|---|---|---|---|
| ลุงบอร์ก (smith) | แร่จากกล่องหายาก | rare chests opened | 6 | ore 30 · dust 25 |
| พีโน่ (broker) | ผลงานให้ลูกค้าดู | battles won | 30 | gold 40 |
| ครูฮัลดา (trainer) | บททดสอบของครู | elites beaten | 6 | seal 2 |
| มิมี่ (keeper) | ห้องลับในกำแพง | secret walls found | 6 | gold 20 · dust 15 |
| เฟิร์น (herbalist) | สมุนไพรเรืองแสง | glowing herbs picked | 6 | salve 2 · tonic 2 |
| คาเอล (scout) | ไขกลไกโบราณ | puzzles solved | 6 | ore 40 · seal 1 |

**Counting rules:**
- Progress is added when the run settles (complete, withdrawn or wiped) and is capped at the target.
- Herbs come home only if the team was not wiped. Everything else is kept, like EXP.
- A claimed quest stops counting.

**Glowing herbs:**
- There are three, one per zone: meadow (7,23), thicket (12,15) and scar (12,7), on plain floor.
- Stepping on one picks it (once per run) and rolls no encounter.
- They are code-drawn placeholders.
- They are new tile content, not a board change, so the map version stays 5.

**UI:**
- Each NPC's service sheet shows the quest card under the NPC's line: name, request, progress bar, reward, and a claim button, disabled while progress is incomplete.
- A gold "!" floats over an NPC whose reward is ready.
- Claiming saves first, then the NPC cheers and the result toasts.

**Save v16.**
- The profile gains `quests` (`{ progress, claimed }` per known quest id). Progress is limited to 0..target; `claimed` is allowed only at the target.
- The run gains `herbs` (known herb ids, unique).
- v15 data migrates with none.

**Tests:**
- `tests/side-quests.test.ts`: content and geometry, herb pickup, settle, wipe, claim once, save v16 and migration.
- A browser test picks a herb and claims the herbalist's reward.

## Balance simulation (4E; 2026-10-16)

**What it is.** `npm run sim` runs a scripted player through whole companies using only the pure rules: world, profile and battle.
- It writes `docs/validation/balance-sim/REPORT.md`.
- `npm test` keeps a small 3-company sweep as a guard: deterministic, every company finishes, wipes under a third, exploring pays more than rushing, and all 12 chests can be reached.
- The code is `tests/sim/balance-sim.ts`. It changes no rules.

**The scripted player.**
- *Rush* breaks the seal (golem and rift) and fights the boss.
- *Explorer* also takes every chest, herb, puzzle, secret, optional elite and event.
- Battles are played either by the teaching advisor or by blind basic attacks on the first valid target. The blind player is a lower bound; a real player lies between the two.
- Between expeditions it:
  - claims quests, hires and upgrades stars;
  - spends talents and equips the best pieces;
  - salvages commons when the bag fills and brews salves.
- On the map it:
  - rests or revives at camps and swaps in reserves;
  - drinks potions when low;
  - withdraws when spent.
- **Sweep:** 24 seeds × 6 expeditions per scenario.

**Findings** (draft numbers; nothing has been retuned):

1. **The advisor never loses.**
   - Every battle kind is won 100% of the time, with 95–100% party HP after a win; the boss is beaten at full HP.
   - Every company completes its first expedition.
   - Battles are only dangerous for the blind player: 0% completion over 6 expeditions and 88–100% wipes. The forced elite is won 63% of the time and the optional elite 72%.
2. **Levels cap on the first expedition.** With advisor battles both routes reach the level cap (10) in about 13 wins. Fighting up pays 120% EXP, and the curve needs only 540 EXP in total. Levels and talents stop growing after the first trip.
3. **Ore and gold pile up.**
   - One explorer run settles about 770 ore and 425 gold. That is 21 hires at 20 gold, against 3 board offers per return.
   - After 6 expeditions the explorer bank holds about 4,300 ore and 2,300 gold.
   - Stars are limited by duplicates (★3.3 at best), not by ore.
4. **Side quests are finished in one explorer run.**
   - The explorer claims all six before its second expedition.
   - The rush player only ever finishes the broker and trainer quests.
5. **The merchant tile (16,21) is the only way to the sun rune stone and the meadow-east chest.** Its dialog opens on every pass. (Fixed in 4A: the merchant moved to (3,21), map version 6.)

**Tuning options proposed to the owner:**
- Levels: steeper curve (for example `nextBase` 20 and `nextPerLevel` 25), less EXP for fighting up, or a higher cap with chapters.
- Battles: tougher elites, mini-boss and boss (HP or damage), or let fewer heals through. The target would be the advisor keeping about 60–75% HP and the blind player completing within 2–4 expeditions.
- Economy: about half the ore and gold from chests and battles, or new sinks (a camp shop in 4A, forge costs).
- Side quests: higher targets (for example 6 rare chests, 30 wins, 6 secrets), or a repeatable tier.
- Map: move the merchant off the only path, or keep it as a deliberate stop.

**Applied tuning (owner approved 2026-10-16: "levels and battle difficulty first").**
- **EXP curve:** EXP to the next level is 20 + 45 × level (it was 10 + 10 × level), and the fighting-up bonus is 110% (it was 120%). Existing EXP stays valid because every step is larger.
- **Fight levels:** elites, the mini-boss and the boss fight one level above their reference level.
  - The level is stored in the battle when it starts, so a saved battle keeps its old level.

  | Fight | Was | Now |
  |---|---|---|
  | Tusk Chief | 5 | 6 |
  | Briar Lord | 8 | 9 |
  | Golem | 9 | 10 |
  | Rift Warden | 10 | 11 |

- **Casual player:** the simulation adds a casual player who follows the advice on about 70% of turns. The advisor reads every intent and stays an upper bound that barely loses HP whatever the numbers.
- **Results** (casual; tuning ran 8 seeds × 4 expeditions, and the final report runs 24 seeds × 6 expeditions):

  | Route | Before | After |
  |---|---|---|
  | Explorer | most finished on trip 1–2 | median trip 2 (range 1–3); the first trip usually ends in a wipe that keeps levels and half the haul |
  | Rush | most finished on trip 1–2 | a risky route: median trip 5 (range 3–6), forced elite won 77% |
  | Advisor | reached level 10 on the first trip | ~level 6 after the first trip, cap on the third (explorer) |

  - A trial at +2 levels with 20 + 60 × level made the rush route almost unwinnable for the casual player, so it was reverted.
- The full numbers are in `docs/validation/balance-sim/REPORT.md`.
- The economy (ore and gold surplus), side-quest targets and the merchant tile are unchanged until 4A.

## Camp market and board refresh (4A; approved 2026-10-16, draft numbers)

**Gold coins** now pay for hiring, paid board refreshes and the market. Ore still pays for stars, brewing, the forge and the map merchant.
- **Rules:** `refreshBoard`/`refreshReason` and `buy`/`buyReason`/`shopLeft` in `core/world/profile.ts`.
- **Numbers:** `map.shop`.
- **Where:** everything happens in the broker's sheet (พีโน่), which has two tabs: ป้ายจ้าง and ตลาด.

**Board refresh** (owner request):
- The hiring board can be redrawn **2 times per return**, for **15** and then **30** gold.
- A redraw clears the "hired" marks.
- With no redraw the board is exactly the board it was before 4A.
- The redraw count resets when an expedition comes home.

**Market** (limits reset on each return):

| Item | Price | Limit | Effect |
|---|---|---|---|
| ตราสัญญา (seal) | 60 | 2 | +1 seal |
| ใบสัญญาซ้ำ (contract) | 150 | 1 | +1 duplicate for a chosen member below max stars |
| หีบอุปกรณ์ (gear box) | 120 | 1 | A rare-or-better piece (weights 60/30/10) at the company's highest level, any set. It rolls from the profile's lobby roll counter (shared with the forge), so a reload cannot re-roll it. The bag must have room. |
| ยาไล่อสูร (repel) | 30 | 2 | +1 repel in the home potion stock |

**Income cut (about 40%, draft).** Ore and gold from zone wins, chests, the boss, the mini-boss and optional elites are reduced. The tutorial is unchanged.

| Source | Ore | Gold |
|---|---|---|
| Meadow / thicket / scar win | 4–6 / 5–8 / 7–11 | 2–4 / 2–5 / 4–6 |
| Common chest | 10–14 | 5–7 |
| Rare chest and mini-boss | 18–24 | 9–12 |
| Boss | 36 | 18 |
| Optional elite gold bonus | – | 12 |

**Side quests.** Targets doubled or more: rare chests 6, wins 30, elites 6, secrets 6, herbs 6, puzzles 6. Each can be finished within three explorer runs.

**Map version 6.** The merchant moved from (16,21), the only way to the sun rune stone, to the meadow's west corner (3,21). Runs saved on map version 5 settle home as withdrawn.

**Save v17.**
- The profile gains `shop` (items bought this return, each within its limit) and `refreshes` (0..2).
- v16 data migrates with none.

**Simulation** (`npm run sim`, after 6 expeditions; the scripted player buys seals up to 3, a contract, a gear box, redraws while it has gold, and enhances worn gear):
- **Gold:** the bank now ends near 100–330 (was 480–2,500).
- **Ore:** the explorer still ends with 1,800–2,200. Enhancing is limited by dust, not ore.
- **Seals:** they pile up (about 50 for explorers), because only one seal can stand in for a duplicate per star.
- These are open for the owner.

**Tests:**
- `tests/shop.test.ts`: refresh prices, limit and reset; unchanged board without a refresh; market limits and gold; contract; gear box determinism, rarity, level and full bag; save v17.
- A browser test refreshes twice and buys a contract and a gear box.

## Smelting and the seal share (owner-approved 2026-10-16, draft numbers)

**Smelting.** The smith (ลุงบอร์ก) smelts ore into veil dust at a deliberately poor rate: **8 ore per dust**, at most **30 dust per return home**.
- **Where:** buttons +1 and +5 in the forge sheet.
- **Rules:** `smelt`/`smeltReason`/`smeltLeft` in `core/world/forge.ts`; numbers in `map.equipment.forge` (`smeltOre`, `smeltCap`).
- **Why:** salvaging stays the main dust source, and surplus ore now feeds enhancing.

**Seal share.** Contract seals may stand in for up to **half (rounded up)** of the duplicates a star needs (`map.company.sealSharePercent` 50; `sealLimit`). It was a single seal before.

| Upgrade to | ★2 | ★3 | ★4 | ★5 |
|---|---|---|---|---|
| Duplicates needed | 1 | 2 | 3 | 4 |
| Seals allowed | 1 | 1 | 2 | 2 |

**Save v18.** The profile gains `smelted` (0..cap, reset on return). v17 data migrates with 0.

**Simulation after 6 expeditions** (advisor explorer):
- **Bank:** ore about 740 (was 2,200) and seals about 49 (explorers still collect many from chests and elites).
- **Stars:** the best deployed member reaches ★5.0 (was ★3.3).
- **Rush route:** unchanged (ore about 200).

**Tests:**
- `tests/shop.test.ts`: smelt rate, cap, reset and save v18; seal limits per star.
- A browser test smelts at the forge.

## Expedition summary (4F; 2026-10-16)

**When a run ends** (goal reached, withdrawn at a muster point, or every brought member down), a full-screen summary shows over the lobby before the player continues.

**What it shows:**
- **The run:** steps, wins, retreats, elites beaten, chests opened and puzzles solved.
- **Resources kept:** ore, gold, seals and dust, after the wipe halving.
- **New gear:** pieces that reached the bag, best first, with the auto-salvage count.
- **Level-ups:** each member's level before and after.
- **Side quests:** progress for every quest that moved, marked when ready to claim at camp.

**First clear.** The first time the rift warden falls, Vargoth answers before the summary in three story panels: the warden fell, the rifts go deeper and he will wait, then Aegis calls the team home.

**Presentation:**
- The backdrop follows the outcome: retreat for a clear, awaken for a withdrawal, rift for a wipe.
- The archway theme plays during the summary.
- It is full screen on portrait phones.

**Data and saves.**
- `runSummary` in `ui/summary-ui.ts` builds the summary from the profile before and after `settle` plus the finished run.
- It owns no rules and adds no save field.
- A reload during the summary simply lands in the lobby, which still shows the last-result line.

**Tests:**
- `tests/summary.test.ts` covers the counts, haul, gear, level-ups, quests, first clear and the wipe.
- Browser tests cover a withdrawal, a wipe and a first clear (Vargoth, then the summary, then the lobby).

## Camp travel and elite returns (4B/4C; owner-approved 2026-10-16) and the defeat penalty (4D)

**4B camp travel (free).**
- **From where:** a camp or the entrance only.
- **To where:** the entrance, or any camp reached this run (`run.visited`, recorded when the party steps onto a camp).
- **Effects:**
  - There is no encounter roll and pressure resets.
  - Arriving at a camp makes it the return point.
- **UI:** a **วาร์ป** tab in the camp sheet.
- **Rules:** `travelTargets` and `travel` in `core/world/world.ts`.

**4C optional elite returns.**
- **When:** resting at a camp brings back every beaten **optional** elite. Gate guards (`forced`) and the mini-boss stay beaten.
- **Tracking:** `run.respawns` counts the returns.
- **Fight level:** a returned elite fights at its map fight level plus its return count.
- **Rewards:** EXP and the elite drop as usual, but no optional-elite gold or seal bonus, because seals were already plentiful.
- **Messages:** the rest message names the elites that came back.
- **Side quest:** returns count toward the trainer's elite quest and the summary.

**4D defeat penalty.** Kept as is, as the owner approved:
- a wipe keeps half the resources and the best found item, loses the other gear and herbs, and keeps levels;
- the summary (4F) spells it out.

**Save v19.**
- The run gains `visited` (camp tiles) and `respawns` (known optional elites, 1..99).
- v18 runs start with the camp they last reached and no returns.

**Simulation.** The scripted explorer fights each optional elite once, so its numbers are unchanged.

**Tests:**
- `tests/travel.test.ts`: visits, travel targets and refusals, the rest return and its level, the quest count, and save v19 with migration.
- A browser test rests (the elite returns), then travels to the entrance.

## Map bag (owner request and decisions 2026-10-17)

The pack capsule on the map is now the **bag** (กระเป๋า). It opens a sheet with three tabs, usable anywhere outside battle:

- **Items (ของ):** potions (drink a salve, tonic or repel), resources, the gear found so far and chests opened.
- **Gear (อุปกรณ์):** pick any brought member, see the six slots and their stats, then wear or take off gear.
  - What can be worn on the map: items found on this run (`run.found`), and the company's own items already worn by the brought members.
  - An own item that is taken off waits in `run.spare`. Items in the Lobby bag stay in the Lobby.
  - Weapons keep their class. HP never rises from gear; it is capped at the new maximum.
- **Team (ทีม):** the 4 + 4 swap grid, now usable anywhere outside battle (not only at camps or the entrance). Tapping a member shows their details: role, lane, stars, level and EXP, HP/Attack/SPD, wound, skills with descriptions, ★3/★5 unlocks and worn gear, with a shortcut to their gear.

Owner decisions:

| Question | Decision |
|---|---|
| Where can gear change on the map? | Anywhere outside battle. |
| Which items? | Finds from this run and the gear the brought members already wear. |
| Wipe with a find worn? | Worn finds count with the bag finds for the wipe rule: only the best one (`wipeKeep`) comes home. |
| Where can the party change? | Anywhere outside battle. |

Settling (`settle`):

- Members keep what they wear.
- A worn find that is kept gets a new uid and stays worn.
- A worn find that is lost frees its slot. The member gets back the own item they left the Lobby with, if that item is in `spare`.
- Every own item in `spare` comes home to the Lobby bag, even past the bag limit.

Save v20: the run gains `spare` (older runs: none), and run members may wear finds (uid 0). On load, the run's own items, worn and spare, must exactly match what the profile says those members wear (`ownItemsMatch`), so the bag can neither copy nor lose an item.

Phones show only the bag icon, ore and new gear on the capsule; wider screens also show gold, embers, seals and potions.

Tests: `tests/map-bag.test.ts` (wear, take off, party away from camp, settle on finish and wipe, save v20) and the browser test "map bag".

## Chapters: two short teaching maps before the rift frontier (owner-approved 2026-10-17)

The current map becomes map 3, "แนวรอยแยก". Two short new maps come before it and teach the systems in order. Each one is a real expedition, not a practice mode.

| Map | Size and time | Levels | Teaches |
|---|---|---|---|
| 1. ซากชายแดน | about 12×10, 8–12 min | 1–3 | Moving, battle, chests, potions, wearing gear from the bag, camp rest, a small boss. The prologue and the first clash move here. |
| 2. เส้นทางป่าทึบ | about 16×14, 15–20 min | 3–6 | Events, elites (forced and optional), a simple puzzle, reserve swaps, camp travel, herbs. |
| 3. แนวรอยแยก | the current map | about 6–15 | Everything: rift seal, mini-boss, rift warden. |

### Lobby

- Lobby systems unlock in order.
- Each camp NPC gives one skippable guided task with a small reward. The maps guarantee the materials each task needs:
  - after map 1: forge enhance, a talent point and brewing;
  - after map 2: hiring, the 4 + 4 team, and a ★2 upgrade (map 2's boss drops a duplicate contract).

### Decisions

| Decision | Choice |
|---|---|
| Map names | as listed above |
| Level cap | rises to 15, and map 3 moves up |
| Existing companies | anyone who already cleared the frontier counts maps 1–2 as cleared |
| Running expedition | keeps its map id |
| Order of work | the stats work (docs/STATS_DESIGN.md) comes first, so the tutorials teach the final systems |

### Technical plan

1. Split game-wide rules (company, progression, equipment, potions, shop, talents, mercenaries) out of `MapDefinition`.
2. A map choice in the Lobby. Choosing a chapter is not choosing rooms on the board.
3. Save v21: cleared maps and guided tasks.
4. Build map 1, then map 2.
5. Re-level map 3 and simulate all three maps.


## Forge phase 2 — 2026-10-20 (current)

Rarity fusion preserves the main item's full +, Lv, class, set, original affixes and quality rolls, and both development ledgers. It adds random affixes/specials as before. Select exactly two same-slot/same-rarity bag donors; locked/worn pieces cannot be consumed. Recommendations exclude all enhanced or invested pieces. Explicitly chosen developed donors refund actual enhancement and Lv capital in full at consumption, without base salvage; wallet overflow blocks the whole action.

The smith can raise a chosen item's Lv, retaining rarity/set/rolls/affixes/+. Initial permanent cap is Lv3; defeating gate-meadow unlocks Lv6, gate-thicket Lv9 and scar-golem Lv10. Completing the chapter also unlocks Lv10. Record the best tier on return, including withdrawal/wipe; optional-elite respawn history counts. Hero Lv does not unlock this. Draft costs per next item level N are 4×N ore +1 dust, summed atomically for the selected target. Use existing ore/dust after earning the area tier, without another currency. Item.levelInvestment records actual costs; no credit for an item's original drop/market level. Recycling and donor consumption return it 100%, independently of enhancement investment.

Save v23 adds profile.forgeLevel and validates levelInvestment/active-run ownership. v1–v22 remain supported. Legacy completed chapters unlock Lv10; incomplete legacy companies start at Lv3 because no permanent elite history existed. Existing high-level items remain intact and usable, with no invented upgrade spending. Prices/caps live in content. No map/encounter version or active combat change. Overflow, crafting and affix transfer remain later phases.


## Camp storage phase 3 — 2026-10-20 (current)

Full camp bags preserve excess loot in profile.overflow instead of auto-recycling. Returned owned/spare gear and dismissed members' equipment receive the same protection, including locks and both investment ledgers. Wipe retention remains unchanged. Pending items have owned UIDs and persist across reload; resolve the tray through explicit collection/recycling before departure. Collect before equipping/forging. Bulk recycling excludes locked, enhanced and invested pieces; source/UID/duplicate/capacity/wallet checks are atomic. Existing individual development recycling still refunds investment.

Three permanent capacity tiers add 30 slots each (60 → 90 → 120 → 150), purchased for draft 200/400/800 gold using existing currency. No auto-collection or item destruction when buying capacity. Upgraded capacity applies to bag validation, unequip and shop purchases. Save v24 accepts v1–v23; migration initializes tier 0 and empty pending without inventing previously destroyed equipment. Map/encounter versions, loot probabilities, combat and resource rewards are unchanged. Targeted farming, weapon crafting, boss gear and affix transfer remain later phases.
