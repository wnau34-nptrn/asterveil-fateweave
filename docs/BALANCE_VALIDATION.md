# Balance validation — fixed hero ownership

The current versions are `veil-siege` / 4, `rear-ambush` / 2 and `rift-warden` / 2. Every move must belong to the next living hero in Knight → Duelist → Mage → Priest order. Old free-selection fixtures were replaced with legal rotation plans; the original encounter's incoming damage is unchanged. New encounter powers were tuned for this rotation. Hero HP/attack, Guard, skill powers and cooldowns remain unchanged. Mark now lasts 5 beats to remain usable on the next Duelist turn.

## Reproducible policies

`party-routes.ts` and `encounter-routes.ts` own the command sequences. Core tests compare exact HP, previews, render stages, source immutability and replay; browser cases execute all seven winning routes with actual controls, reload and restart. The forced-turn Attack-only policy always uses the current owner and a fixed enemy priority; it cannot choose a higher-damage hero out of turn.

| Encounter / plan | Beats | Survivors | Final HP [Knight, Duelist, Mage, Priest] | Total |
|---|---|---|---|---|
| Original · offense | 13 | 4 | [52, 6, 4, 18] | 80 |
| Original · sustain | 14 | 4 | [72, 14, 18, 38] | 142 |
| Original · guided Guard/Mark/Mage opening | 14 | 4 | [57, 16, 14, 28] | 115 |
| Rear ambush · combo | 14 | 4 | [70, 51, 7, 5] | 133 |
| Rear ambush · barrier/healing | 15 | 4 | [76, 56, 1, 5] | 138 |
| Boss · Mark/strike and physical interruption | 14 | 4 | [70, 36, 2, 30] | 138 |
| Boss · unmarked strikes, Ward/healing | 15 | 4 | [60, 26, 6, 20] | 112 |
| Original · Attack, Raider first | 12 | 0 | [0, 0, 0, 0] | 0 |
| Original · Attack, Brute first | 14 | 0 | [0, 0, 0, 0] | 0 |
| Rear ambush · Attack, Hunter first | 15 | 0 | [0, 0, 0, 0] | 0 |
| Rear ambush · Attack, Channeler first | 16 | 0 | [0, 0, 0, 0] | 0 |
| Boss · Attack | 13 | 0 | [0, 0, 0, 0] | 0 |

A Mark on beat 2 stays active through Mage, Priest and Knight turns. A marked Precision Strike on beat 6 deals 50 and consumes it; the Mage's intervening Bolt does not consume it. If Lyra chooses another action on beat 6, the old Mark expires as beat 7 starts. When only a few heroes survive, cooldowns still reject early reuse despite skipped turns. Foreign-owner commands are rejected by the same resolver used for preview and save restoration.

All three encounters have at least two concrete four-survivor plans, with different healing/barrier/damage decisions. The sustained plans do not promise greater health in every encounter. Attack-only results cover the stated policies, not every possible targeting strategy. Human feedback, physical-device verification and final balance remain open.

Current automated coverage is 45 Node cases and 44 production browser cases. GitHub Pages uploads/deploys only after the complete production suite passes. `VALIDATION.md` records each change's evidence and limitations.
