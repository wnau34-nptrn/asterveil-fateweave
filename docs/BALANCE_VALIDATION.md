# Four-class balance validation — encounter version 3

The user requested removing the Crystal system and replacing the party with two front and two back heroes, each with its own class and skills. The encounter now uses class cooldowns, interception, physical interruption, Mark follow-ups, ally barriers and healing. These are prototype values, not final progression or exhaustive balance.

## Reproducible policies

`tests/fixtures/party-routes.ts` owns the winning command sequences. `tests/balance.test.ts` checks outcomes, whole-party survival, exact preview equality and deterministic replay. Browser tests execute both routes through the actual controls, and separately play both basic-attack policies to defeat.

| Strategy | Decisions | Outcome | Survivors | Final HP [Aegis, Lyra, Eira, Seren] |
|---|---|---|---|---|
| Basic attacks, Raider first, highest-damage living hero | 11 | Defeat | 0 | [0, 0, 0, 0] |
| Basic attacks, Brute first, highest-damage living hero | 15 | Defeat | 0 | [0, 0, 0, 0] |
| Offensive class-skill route | 11 | Victory | 4 | [62, 42, 2, 28] |
| Defensive interception/barrier/healing route | 16 | Victory | 4 | [18, 32, 26, 18] |

### Offensive route

1. Lyra Mark Brute
2. Lyra Precision Strike Brute
3. Eira Arcane Bolt Brute
4. Aegis Shield Bash Brute
5. Lyra Precision Strike Brute
6. Seren Prayer Party
7. Aegis Shield Bash Brute
8. Lyra Precision Strike Brute
9. Lyra Mark Raider
10. Eira Arcane Bolt Raider
11. Lyra Precision Strike Raider

Prayer before beat 6's energy hit keeps Eira alive; damage skills rotate through cooldowns. Final party HP is 134. Shield Bash on an energy beat deals damage without interrupting the Bolt. Killing the announced source still cancels its attack normally.

### Defensive route

1. Lyra Mark Brute
2. Aegis Guard Eira
3. Lyra Precision Strike Brute
4. Aegis Guard Lyra
5. Eira Arcane Bolt Brute
6. Eira Ward Eira
7. Aegis Shield Bash Raider
8. Seren Heal Aegis
9. Lyra Precision Strike Brute
10. Aegis Shield Bash Brute
11. Eira Arcane Bolt Brute
12. Aegis Guard Eira
13. Lyra Precision Strike Brute
14. Seren Heal Eira
15. Lyra Mark Raider
16. Lyra Precision Strike Raider

Interceptions redirect reduced damage into the durable Knight; Ward absorbs before HP, while Heal restores selected allies before the enemy responds. Physical Shield Bash prevents the corresponding announced hit. This longer example wins with 94 party HP and a different health distribution. It demonstrates another viable policy rather than promising that defense always yields more total HP.

## Bounds and publication

Basic-attack results describe two concrete tested policies, not an exhaustive proof that every possible Attack-only sequence loses. Human playtesting and further encounters remain future work. Combat has no random damage or timing advantage.

The encounter is `veil-siege`, version 3. Old three-member saves restart safely. Current automated coverage is 47 Node tests and 44 production browser scenarios; `VALIDATION.md` records the checks and device limits. GitHub Pages deploys only after the full production suite passes.

## Optional teaching opening

The first three hints suggest Knight Guard protecting Lyra, Mark on Brute, then a marked Precision Strike on that same target. This is advice rather than a required script. The `guided` route in `tests/fixtures/party-routes.ts` continues that opening with class skills and wins in 14 beats with all four heroes standing: [47, 20, 22, 28], total 117 HP. Browser coverage plays the route through actual controls and verifies interception at 5 damage, no immediate Mark damage, the 50-power marked strike, and the full victory. Existing offensive/defensive routes and both basic-attack defeats retain their original outcomes.


## Two additional encounters

All new values are content definitions using the existing immutable resolver. `tests/fixtures/encounter-routes.ts` owns these reproducible commands; `tests/encounters.test.ts` checks every preview/stage, exact HP, all four participating heroes and deterministic replay. Four production browser cases execute the same routes, including reload, outcome and restarting the selected encounter.

| Encounter / plan | Beats | Survivors | Final HP [Knight, Duelist, Mage, Priest] | Total HP |
|---|---|---|---|---|
| Rear ambush · Ward then Mark/strike | 11 | 4 | [76, 20, 4, 8] | 108 |
| Rear ambush · interception/barrier/healing | 16 | 4 | [55, 20, 2, 8] | 85 |
| Rift Warden · Mark/strike and physical interruption | 14 | 4 | [30, 14, 6, 8] | 58 |
| Rift Warden · unmarked strikes and sustain | 16 | 4 | [7, 14, 4, 8] | 33 |
| Rear ambush · basic attacks, Hunter first | 14 | 0 | [0, 0, 0, 0] | 0 |
| Rear ambush · basic attacks, Channeler first | 14 | 0 | [0, 0, 0, 0] | 0 |
| Rift Warden · basic attacks | 10 | 0 | [0, 0, 0, 0] | 0 |

The rear ambush opens with an 18-power energy attack through a healthy front line. Ward absorbs 14 before HP, leaving the Mage at 44/48; Bash deals damage but cannot cancel this energy hit. Its sustained route protects the Priest's low HP with timed Guard and restores the Mage before subsequent hits. Against the boss, opening Bash leaves 232/250 HP and cancels its physical response; the following energy attack still reaches the Mage. The boss sustain route wins without using Mark, demonstrating another viable choice rather than one mandatory combo.

Both offensive examples follow the available opening hints. The sustained examples take longer and end with less total HP; they establish viability, not a promise that defense always maximizes health. Tested spam policies use the highest-attack living hero and one fixed enemy priority. Other policies and final balance still need human feedback. No new combat rule, random damage, progression or character-stat change was introduced. Original version-3 outcomes and saves are unchanged; new IDs start at content version 1.
