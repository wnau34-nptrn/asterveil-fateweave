# Fateweave gameplay direction — owned hero turns

Asterveil: Rise Beyond is a browser-first Fantasy Expedition RPG with Tactical Reaction Combat. The player reads the frozen enemy intent, inspects one of the current hero's skills, and taps a legal field target to cast.

## Implemented loop

Start with Aegis → Lyra → Eira → Seren → Aegis, skipping fallen heroes. One primary hero action is followed by at most one frozen enemy response per beat. The next hero may act only after that presentation ends or is skipped. The engine reconstructs the owner from committed commands and surviving actors, rejects every other actor at commit/preview/replay, and has no clock, random damage or automatic player action.

Portrait cards for other heroes are disabled. Clicking their field sprites cannot change the acting hero. Allies remain legal recipients of Guard, Ward, Heal and Prayer; choosing an ally as a target does not let that ally issue a command. Restart starts with the Knight; reload/switching reconstruct the correct living owner. Victory/Defeat have no further acting owner.

## Party and skills

| Hero | Position | Role | Owned actions |
|---|---|---|---|
| Aegis / เอกิส | Front | Knight | Attack 10; Guard intercept with 65% reduction; Shield Bash 18 interrupts the announced physical source |
| Lyra / ไลรา | Front | Duelist | Attack 16; Mark for 5 beats including application; Precision Strike 28 |
| Eira / ไอรา | Back | Mage | Attack 11; Arcane Bolt 26; Ward 14 to one living ally |
| Seren / เซเรน | Back | Priest | Attack 8; Heal 20 to one ally; Prayer 10 to all living allies |

Mark costs an action and deals no damage. It adds +22 to Lyra's next Attack or Precision Strike on that target and is consumed; other classes leave it intact. Five beats let a Mark on turn 2 survive Mage/Priest/Knight actions until Lyra's next turn 6. An unused Mark expires when turn 7 begins. Cooldowns remain global beats: most special skills use 3, Prayer 4; Attack, Guard and Mark have none. The owner usually returns after 4 beats, but skips can make a skill still cooling. Cooling skills may be inspected; legal-target validation prevents using them.

Guard protects only the announced target, redirecting the hit into Aegis. Round reduced damage up, then absorb with his barrier. Bash interrupts only the announced physical attacker; energy continues unless that attacker is defeated. Killing a frozen source cancels its response without substituting another attacker. Ward does not stack; it persists until absorbed. Healing occurs before the response, clamps at maximum HP and never revives. Full-health/full-barrier targets cannot receive an unavailable restoration.

## Formation and presentation

Physical attacks prefer living front heroes; rear heroes become eligible once the front falls. Energy reaches the preferred rear hero. The source/target freezes at announcement and is not retargeted after a skill. Forecasts assume currently living actors survive; the real next intent appears on completion.

The Thai HUD fits one viewport on desktop, tablet and mobile. Figures stand in staggered pairs on the courtyard; ≥44px native targets follow their bodies. The current hero's three skills remain visible. Clicking a skill selects it and opens a nonmodal floating explanation with actual power, rules, cooldown and availability. It does not commit, preview full outcomes or require confirmation. Close/Escape returns focus to the selected skill; a valid field target can cast directly. The popup does not change arena geometry or scroll the game. Optional ⓘ contains rules, forecasts and history.

A cast commits/saves once, then shows the hero stage (cyan, 1 second) and frozen enemy stage (pink or gold cancellation, 1 second). HP/barriers/log display only actual effects of that stage. All commands lock during presentation, including the battle selector. Skip/hidden-tab completion use the committed result; restart cancels timers and effects. Reduced motion keeps static stage labels. The next living hero is enforced, not a freely changeable selection aid.

## Three encounters and saves

The original `veil-siege` is now version 4; `rear-ambush` and `rift-warden` are version 2. Old free-selection saves start fresh instead of replaying under different rules. Storage keys and envelope version remain stable; each battle keeps its own validated command replay, and a separate validated preference selects the battle. In-tab committed snapshots retain switching progress without storage, but cannot survive refresh. Restart affects only the selected battle.

- Original: enemies 64/164 HP; intent powers 12 physical → 28 energy → 12 physical → 26 physical → 14 energy → 28 energy, unchanged.
- Rear ambush: enemies 72/148 HP; Mage energy 15 → Priest energy 16 → Priest energy 15 → Duelist physical 15 → Mage energy 18 → Mage energy 15.
- Rift Warden: one 250-HP boss; Duelist physical 23 → Mage energy 20 → Knight physical 26 → Priest energy 18 → Duelist physical 17 → Mage energy 23.

The new encounters' incoming damage was tuned for enforced rotation. All hero values and skill powers remain unchanged apart from the longer Mark duration. Two tested plans per encounter preserve all four heroes, while the tested fixed-priority Attack-only policies lose. See `BALANCE_VALIDATION.md`; these are regression examples rather than exhaustive or final balance.

Optional hints cover only the current owner's first three turns: Knight Guard (or boss Bash), Duelist Mark, then a legal Mage Bolt/Ward. They never suggest stealing another hero's turn. They can be dismissed/reopened independently of battle saves.

The selector is independent combat practice. Crystal/Redirect/Counter, expedition progression, unlocks, rewards, equipment and persistent expedition HP are not implemented.
