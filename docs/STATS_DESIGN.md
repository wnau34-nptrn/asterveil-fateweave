# Stats and gear rolls: design proposal (2026-10-17, awaiting owner approval)

Owner request (2026-10-17): more stats than HP, Attack and SPD; gear rolls those stats so no two items are alike; and every stat must fit the whole skill kit of every class. This document is step 1 of the agreed plan: an audit and a full stat × skill × class table. No code changes until it is approved. All numbers are drafts.

## 1. Audit: what the stats do today

| Stat | Where it comes from | What it changes in battle |
|---|---|---|
| HP | class base, stars/levels %, talents %, gear flat, sets | max HP |
| Attack | class base, stars/levels %, talents %, gear flat, sets | **basic Attack only** (and its Mark bonus) |
| Skill % (`skillBonus`) | stars/levels %, talents %, gear %, starveil set | **every** skill with power: damage, heals, shields, counters, songs |
| SPD | class base, boots/charms, wind set | turn order |
| Heal % | gear affix, mender set | Heal-type skills only |
| Starting barrier | gear affix, dawn set | shield at battle start |

Problems found:

1. **Attack barely matters.** Skills use a fixed power (Precision Strike 28, Arcane Bolt 26…) scaled only by Skill %. Attack from gear or talents raises only the basic Attack. Example: the archer's talent "สายธนูตึง" (+Attack %) does not raise Volley, Hindering Shot or Weak-point Shot. Attack gear is nearly worthless to the Priest, Mage and Bard.
2. **One Skill % buffs everything.** Damage dealers and supports want the same stat, so gear has no identity.
3. **Little defence.** Enemy moves are already split into physical and energy, but no player stat uses that split. Defence is only HP and a starting shield.

## 2. Proposed stats

The rule for every stat: at least three classes must want it as a main stat, and every class has two or three stats it wants.

| Stat (Thai) | Applies to | Cap |
|---|---|---|
| HP (เลือด) | max HP | none |
| Attack (พลังโจมตี) | basic Attack **and every damaging skill**, counters included | none |
| Support (พลังเสริม, %) | heals, shields, songs, Corrode, Finale's heal; replaces Skill % and Heal % | none |
| SPD (ความเร็ว) | turn order; still rare, boots and charms only | none |
| Armour (เกราะ, %) | reduces **physical** damage taken | 30% |
| Resistance (ต้านพลังงาน, %) | reduces **energy** damage taken | 30% |
| Leech (ดูดเลือด, %) | heals self by a share of the damage that hero deals | 20% |
| Trail regen (ฟื้นฟูระหว่างเดิน) | map only: heals HP every 5 steps | none |
| Luck (โชค) | map only: + points to the battle drop chance | +15 |

Every stat stays deterministic: no crit chance and no dodge chance, so preview always equals the result and replays stay exact.

## 3. Scaling rule: identical at ★1 Lv1

- **Damage skills:** value = round(base power × hero Attack ÷ class base Attack).
  - With no stars, levels, talents or gear, every number is exactly what it is today.
  - Stars and levels already raise Attack by the same % they raise Skill % today, so growth curves barely move.
  - What changes: flat Attack from gear or talents now raises skill damage too.
- **Support skills:** value = round(base power × (100 + Support) ÷ 100). This is today's formula with Skill % renamed.
- **Flat rule bonuses stay flat:** Mark +22, Ambush +12, Weak-point +12, Quake +10, Hammer counter. **Owner question A:** should these scale with Attack too?
- **Damage taken:** enemy hit × (1 − Guard/Taunt/Rally reductions) × (1 − Armour or Resistance), rounded up as Guard is today. Shields absorb after that.

## 4. Every skill and its stat

| Class | Skill | Kind | Base | Scales with |
|---|---|---|---|---|
| Knight Aegis (ATK 10) | Attack | damage | 10 | Attack |
| | Guard | utility (65% cover) | – | – (talent/HP/Armour make it better) |
| | Shield Bash | damage + stop physical | 18 | Attack |
| | ★3 Rally Guard | utility (35% first hit) | – | – |
| Duelist Lyra (ATK 16) | Mark | utility | – | – |
| | Precision Strike | damage | 28 | Attack |
| | ★3 Finishing Lunge | damage | 16 (×2 low HP) | Attack |
| Mage Eira (ATK 11) | Arcane Bolt | damage | 26 | Attack |
| | Ward | shield | 14 | Support |
| | ★3 Sigil Bind | damage + stop energy | 8 | Attack |
| Priest Seren (ATK 8) | Heal | heal | 20 | Support |
| | Prayer | party heal | 10 | Support |
| | ★3 Sanctuary | utility | – | – |
| Spear Garran (ATK 12) | Brace | counter | 14 | Attack |
| | Piercing Thrust | damage | 22 | Attack |
| | ★3 Spear Wall | counters | 8 | Attack |
| Archer Mira (ATK 13) | Hindering Shot | damage + delay | 12 | Attack |
| | Volley | damage, all | 10 | Attack |
| | ★3 Weak-point Shot | damage | 16 | Attack |
| Alchemist Toma (ATK 9) | Acid Flask | damage + Corrode | 8 / +6 | Attack / Support |
| | Haste Tonic | utility | – | – |
| | ★3 Blast Flask | damage, all | 10 | Attack |
| Scout Sefa (ATK 12) | Ambush | damage | 12 | Attack |
| | Shadow Step | utility | – | – |
| | ★3 Backstab | damage | 20 | Attack |
| Warden Brann (ATK 11) | Challenge | utility (35% less) | – | – |
| | Rune Slam | damage | 18 | Attack |
| | ★3 Earthshaker | damage | 14 | Attack |
| Bard Lio (ATK 9) | Song of Valor | team +damage | +4 | Support |
| | Song of Mending | heal per round | 5 | Support |
| | ★3 Finale | damage, all / party heal | 16 / 12 | Attack / Support |

## 5. What each class wants

★★ main, ★ useful, – little use.

| Class | HP | ATK | SUP | SPD | ARM | RES | Leech |
|---|---|---|---|---|---|---|---|
| Knight | ★★ | ★ | – | ★★ | ★★ | ★ | – |
| Duelist | ★ | ★★ | – | ★★ | – | – | ★★ |
| Mage | ★ | ★★ | ★★ | ★ | – | ★ | – |
| Priest | ★★ | – | ★★ | ★ | – | ★★ | – |
| Spear | ★★ | ★★ | – | – | ★★ | – | ★ |
| Archer | ★ | ★★ | – | ★★ | – | – | ★ |
| Alchemist | ★ | ★ | ★★ | ★★ | – | – | – |
| Scout | ★ | ★★ | – | ★★ | – | – | ★★ |
| Warden | ★★ | ★ | – | – | ★★ | ★★ | – |
| Bard | ★ | ★ | ★★ | ★★ | – | ★ | – |

Count of classes per stat:

| Stat | Main (★★) | Useful (★) |
|---|---|---|
| HP | 4 | 6 |
| ATK | 5 | 4 |
| SUP | 4 | – |
| SPD | 6 | 2 |
| ARM | 3 | – |
| RES | 2 | 3 |
| Leech | 2 | 2 |

Every stat has buyers, and no class wants everything.

## 6. Gear

### Main stat by slot

Each slot has a fixed main stat, and the item's value rolls 80–120% of the level value.

| Slot | Main stat |
|---|---|
| Weapon | Attack, or Support for the Priest, Bard and Alchemist weapons |
| Head | HP + Resistance |
| Body | HP + Armour |
| Gloves | Attack |
| Boots | HP + SPD |
| Charm | Support |

### Affixes

The affix count by rarity stays 0/1/2/3/3. Each affix rolls 80–120% of its level value, shown as e.g. `เกราะ +7% (สูงสุด 8%)`.

| Slot | Affix pool |
|---|---|
| Weapon | follows the class: damage classes roll Attack, Leech, SPD; support classes roll Support, HP, SPD |
| Head | HP, Resistance, Support, Luck |
| Body | HP, Armour, Resistance, Starting barrier |
| Gloves | Attack, Leech, Support |
| Boots | SPD, HP, Trail regen |
| Charm | Support, Attack, Luck, SPD |

### Other gear changes

- The forge's Reroll also rerolls the 80–120% values.
- **Sets:**
  - starveil "Skill +10%" becomes "Attack +6% and Support +6%".
  - mender "Heal +15%" becomes "Support +12%".
  - The others are unchanged.
- **Legendary specials:** unchanged.

## 7. Talents

- **Attack % nodes** now raise skill damage too. This fixes the archer, scout, spear and warden nodes that did nothing for their skills.
- **Skill % nodes** are re-pointed by role:
  - Mage root and "พลังเวท" become Attack %.
  - Priest, Alchemist and Bard roots become Support %.
- No other talent node changes.

## 8. Saves and versions

- **Save v21:**
  - Items gain a roll per stat.
  - The old `skill` and `heal` affixes become `support`.
  - Old items migrate at 100%.
- **Encounter versions:** bumped, because rule semantics change. A battle in progress from an older save is rejected safely, as rule 6 requires.
- **Starting battles:** the ★1 Lv1 numbers do not change, so the tutorial plans and the balance regression stay valid.

## 9. Plan after approval

1. Damage skills scale from Attack and Support replaces Skill %. Unit tests prove every ★1 Lv1 number is unchanged and preview equals result.
2. Armour, Resistance and Leech in the resolver, with tests.
3. Gear main stats, affix pools and 80–120% rolls (save v21). Trail regen and Luck on the map.
4. Stat sheet UI: every stat on the member detail, in the bag and in the Lobby.
5. Per-class simulation: each class geared for its main stats vs. off-stats; tune the caps and the per-level values.

## 10. Owner questions

| | Question | Recommendation |
|---|---|---|
| A | Should flat rule bonuses (Mark +22, Ambush +12, …) scale with Attack? | No: they stay the reward for setting up combos. |
| B | Keep Trail regen and Luck (map stats)? | Yes: they give boots and charms map value. |
| C | Caps: Armour/Resistance 30%, Leech 20%, Luck +15? | Yes, as drafts until the simulation. |
| D | Should support weapons (Priest, Bard, Alchemist) give Support instead of Attack? | Yes. |
