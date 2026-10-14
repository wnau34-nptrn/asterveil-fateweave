# Fateweave gameplay direction — SPD rounds

Battles use a deterministic combined hero/enemy initiative queue. They are started by the expedition (`EXPEDITION_DESIGN.md`) with the party's carried HP; heroes entering at 0 HP are down and never join the queue.

## Turn rules

At round start, sort living heroes and enemies by descending SPD. Ties use permanent definition order (hero list followed by enemy list). Freeze the queue for that round; each actor takes one turn, skipped if defeated. Re-sort survivors when the queue ends. No speed-changing skill is shipped; changes to configured speed are picked up at a round boundary, never by rearranging an in-progress queue.

Default order is Lyra 120 → Raider/Hunter 110 → Eira 100 → Aegis 80 → Brute/Channeler/Warden 70 → Seren 60. A faster enemy can open before heroes: `beginBattle` resolves those automatic turns and exposes their presentation frames; replay includes them exactly once. The player can command only the current hero. Enemy turns automatically execute when reached, never after every hero action. Several heroes or enemies may occur consecutively.

`round` advances once the queue is exhausted; `beat` is an internal actor-turn serial for stale-command rejection. Save only hero commands and replay deterministic automatic enemies. One command commits all following enemy turns up to the next living hero or outcome, and exposes separate render-only frames/events for each actor. UI presentation cannot affect results.

## Skills and targeting

Hero HP/Attack/powers remain Knight 76/10, Duelist 56/16, Mage 48/11, Priest 46/8. Knight/Duelist are front, Mage/Priest back. Physical targets screen the back while a front hero survives; energy can reach the rear. Enemy plans select their own template by `(round - 1) % ownMoves.length`. Forecasts assume current survivors remain; targets are determined when the enemy's turn starts.

Guard protects the displayed next attack's target/source until that enemy acts or the Knight returns. It redirects damage to the Knight, applies 65% reduction rounded up, then barrier/HP. Bash deals 18 and cancels the selected enemy's next physical turn, even if that enemy already acted this round; energy cannot be interrupted. A defeated enemy is skipped without a phantom hit.

Mark lasts 2 rounds including application, adding +22 to the Duelist's next Attack (38) or Strike (50) on that enemy. Other classes do not consume it. A round-1 Mark remains usable in round 2 and expires entering round 3. Bash/Strike/Bolt/Ward/Heal cooldowns are 2 rounds; Prayer is 3. No cooldown on Attack/Guard/Mark. Ward is non-stacking 14 and persists until absorbed; Heal is 20, Prayer is 10 per living ally. Healing clamps and cannot revive.

## HUD and lifecycle

The persistent phase/order band shows six slots on larger screens or four on compact phones/short screens, including both sides. Each slot exposes actor, SPD, now/next and round boundaries. It remains visible without document scrolling. Distinct cyan/pink phases show the actual acting side; each actor gets one second, including an interrupted enemy's canceled turn. Adjacent heroes have no invented retaliation. Skills/cards/selector lock during playback. Skip, hidden-tab completion and reload retain exactly the already committed outcome.

Skill clicks open the existing nonmodal floating Thai explanation without casting or moving the field. Legal character targets still cast immediately. Support recipients never become alternative actors. Cooling skills remain inspectable but have no legal cast targets. Original art remains grounded/staggered; short portrait fields reserve nonoverlapping ≥44px ally zones. Optional rules, enemy forecasts, logs and advice controls live in ⓘ.

Teaching advice runs only in the one-time `first-clash` battle and lasts the whole battle: Mark → Ward → Guard → Heal → Precision Strike on the mark → Bolt → Bash on a physical attack, then situational advice. It always follows the current SPD owner. During presentation it reads the command's original lesson and shows that actor's actual event. Dismissal preference stays separate from saves.

## Content and persistence

Versions: veil-siege / 5, rear-ambush / 3, rift-warden / 3, plus the expedition encounters listed in `EXPEDITION_DESIGN.md`. Battle progress is part of the expedition save; there is no restart or battle picker.

- Original enemies 78/200 HP, SPD 110/70. Raider own round cycle: physical 12 → physical 12 → energy 14. Brute: energy 28 → physical 26 → energy 28. Incoming powers unchanged.
- Rear enemies 90/180 HP, SPD 110/70. Hunter: Priest energy 24 → Duelist physical 23 → Mage energy 23. Channeler: Mage energy 23 → Priest energy 23 → Mage energy 27.
- Boss 350 HP / SPD 70: Duelist physical 29 → Mage energy 25 → Knight physical 33 → Priest energy 23 → Duelist physical 21 → Mage energy 29.

Enemy HP and the two later encounters' powers are tuned for one enemy turn per round and round cooldowns. Seven tested plans preserve all four heroes; five specific blind Attack policies lose. These are regression examples, not exhaustive balance or physical-device proof. No Crystal/Redirect/Counter, equipment, reserves or new speed-buff skill is implemented.
