# Balance validation — SPD initiative

Versions are veil-siege / 5, rear-ambush / 3, rift-warden / 3. All moves belong to the current SPD owner. Each surviving hero/enemy acts once per round. Original incoming powers and all hero stats/powers stay unchanged; enemy HP and later encounters' powers are tuned for fewer enemy turns and round-based cooldowns. Mark lasts 2 rounds; specials cool down for 2, Prayer for 3.

`party-routes.ts` and `encounter-routes.ts` hold legal plans. Core tests compare exact HP, pure previews, individual turn events and deterministic replay. Browser tests play all seven through actual controls, reload their first committed command and restart that selected battle. Attack-only always uses the current owner and a fixed target priority.

| Plan | Hero commands | Final round | Survivors | HP [Knight, Duelist, Mage, Priest] | Total |
|---|---|---|---|---|---|
| Original · combo | 18 | 5 | 4 | [76, 28, 12, 46] | 162 |
| Original · unmarked strikes/sustain | 19 | 5 | 4 | [66, 54, 40, 32] | 192 |
| Original · guided Mark/Ward/Guard | 21 | 6 | 4 | [76, 54, 36, 42] | 208 |
| Rear · Mark/Ward/Guard | 21 | 6 | 4 | [76, 53, 42, 15] | 186 |
| Rear · unmarked strikes/healing | 18 | 5 | 4 | [76, 56, 5, 46] | 183 |
| Boss · Mark/interruption | 21 | 6 | 4 | [76, 56, 43, 23] | 198 |
| Boss · unmarked strikes/healing | 23 | 6 | 4 | [76, 56, 43, 43] | 218 |
| Original · Attack, Raider first | 23 | 9 | 0 | [0, 0, 0, 0] | 0 |
| Original · Attack, Brute first | 24 | 10 | 0 | [0, 0, 0, 0] | 0 |
| Rear · Attack, Hunter first | 20 | 9 | 0 | [0, 0, 0, 0] | 0 |
| Rear · Attack, Channeler first | 16 | 7 | 0 | [0, 0, 0, 0] | 0 |
| Boss · Attack | 31 | 10 | 0 | [0, 0, 0, 0] | 0 |

A round-1 Mark survives to the next Duelist turn in round 2; Strike deals 50 and consumes it. If unused it expires entering round 3. Round-1 special cooldowns stay unavailable throughout round 2 and become ready in round 3, even if other actors die. Guard and interruption can survive intervening actor turns but never grant the player another actor or invent an enemy response.

Plans differ in targets, Mark use, Ward, Guard, healing and damage choices. Some sustain plans have more ending HP; this is not promised for every route. Attack-only results cover five stated policies, not every possible targeting strategy. Human feedback and physical mobile/Safari checks remain open. The publication workflow requires the complete production browser suite before artifact deployment. `VALIDATION.md` records final counts/evidence.
