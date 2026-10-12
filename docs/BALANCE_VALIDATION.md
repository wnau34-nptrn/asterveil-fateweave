# Tactical balance update — content version 2

Player feedback: the initial encounter rewarded attack spam and did not give enough reason to read intent or use the other actions. This update changes two prototype values, not the rules architecture:

| Value | Before | Now | Decision consequence |
|---|---|---|---|
| Rift Bolt | 18 damage | 30 damage | Repeated Brute energy hits can down the Guardian; source priority, interception and redirection matter |
| Tracer Mark/Exposed bonus | +6 | +22 (38 total) | A two-action Mark/Attack investment beats two unmarked hits; a full-HP Raider can fall in two beats |

Basic attacks and HP, Guard 65%, Counter cap/cost, Crystal one charge/+8 barrier and bounded reaction rules are unchanged. The current intent is still frozen. The next two planned intents assume actors survive and use the same announcement rules; preview shows the exact next announced intent after the complete proposed beat. Lethal warnings use authoritative HP/barrier and preview results. Party intact / Costly victory summarizes existing state, with no score currency, reward or new victory condition.

## Reproducible strategy comparisons

Every route runs through the authoritative resolver from the normal initial state. `tests/balance.test.ts` checks replay and preview equality as well as outcomes. All winning routes below use nine decisions.

| Strategy | Outcome | Living heroes | HP [Aegis, Lyra, Eira] |
|---|---|---|---|
| Attack Raider first; highest-damage living hero | Defeat | 0 | [0, 0, 0] |
| Attack Brute first, then Raider; Lyra then Eira | Costly victory | 2 | [34, 0, 24] |
| Guard + Mark, no Redirect | Party intact | 3 | [49, 4, 24] |
| Crystal defense | Party intact | 3 | [53, 3, 32] plus Aegis's 8 barrier |
| Marked-enemy Redirect offense | Party intact | 3 | [45, 17, 24] |

These are verified examples, not exhaustive optimal strategies or a claim of final balance. A player can still choose an offensive victory; keeping the entire party requires a different plan. Crystal and enemy redirection offer alternatives and neither is compulsory.

### Guard/Mark without Redirect

Lyra Mark Brute → Aegis Guard Aegis → Lyra Attack Brute → Lyra Mark Brute → Lyra Attack Brute → Lyra Attack Brute → Lyra Mark Raider → Aegis Guard Lyra → Lyra Attack Raider.

### Crystal defense

Lyra Mark Brute → Aegis Guard Aegis → Lyra Attack Brute → Lyra Mark Brute → Lyra Attack Brute → Eira Redirect Crystal → Lyra Attack Brute → Lyra Mark Raider → Lyra Attack Raider.

At beat 6, attacking can cancel the Bolt by killing Brute, while Crystal absorbs the Bolt and prepares barriers for the following Raider attacks. The defensive plan preserves Lyra without a later Guard; this is a real tradeoff using existing rules.

### Marked-enemy Redirect

Lyra Mark Brute → Aegis Guard Aegis → Lyra Attack Brute → Aegis Guard Lyra → Lyra Mark Brute → Eira Redirect Brute → Lyra Attack Brute → Lyra Mark Raider → Lyra Attack Raider.

Counter preparation and an unconsumed Mark enable the 30-damage reflection. Exposed then boosts Lyra's follow-up. This route leaves the Crystal unused.

## Save compatibility and publication

Encounter version increments from 1 to 2. Version-1 command logs are not replayed under the new damage values; the game starts a fresh encounter safely. The Pages workflow builds and runs the full production browser suite before deployment. See `VALIDATION.md` for actual check results and browser/device limits.
