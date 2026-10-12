# Fateweave gameplay direction

**Asterveil: Rise Beyond** is a browser-first Fantasy Expedition RPG with Tactical Reaction Combat. The desired feeling is: “I understood the danger, made a meaningful decision, and changed the outcome through my own strategy.” Readability, responsive choices and multiple viable approaches matter more than systems volume.

## Implemented prototype loop

Display current state and a single immutable announced Enemy Intent → choose one of three living heroes → choose an available action and valid target → simulate the complete beat as a preview → explicitly confirm or cancel → resolve the hero action → resolve the announced enemy event if its source survives → apply bounded status/resource effects → announce the next beat or end Victory/Defeat.

There is no timer, reflex check, random damage, battle movement grid or automatic player command. The authoritative resolver runs in Node. Visual transitions neither decide nor delay persistence of combat results.

## Three hero identities

- **Guardian / Aegis:** Attack or intercept the announced target with Guard. Guard reduces damage 65%, rounds remaining damage up, and redirects the reduced hit to Aegis. A surviving defensive action gains 1 Counter (cap 2).
- **Tracer / Lyra:** Attack 16 or Mark. Attack gains +22 on Marked or Exposed enemies (38 total) and consumes both statuses. Mark costs the primary action and lasts 3 beats including its application beat. The 38-HP Raider can therefore be eliminated in two beats with Mark/Attack, compared with three unmarked attacks.
- **Weaver / Eira:** Attack or Redirect. Redirect costs 1 Counter; only currently announced redirectable energy attacks qualify. Choose a living marked enemy (source included) or the charged Crystal. Physical attacks do not qualify.

These are prototype values, not final progression or balance decisions. Values live in `src/content/encounters/crystal-rift.ts` and typed actor definitions.

## Intent and environment principles

Enemy attacks announce source, target, type, exact damage and redirectability. One enemy event occurs per beat. At next-event announcement, dead sources are skipped and a downed preferred target is replaced by a living hero. Never secretly substitute a pending event after confirmation. Killing the announced source cancels that attack. A separate two-beat planning strip assumes the current actors survive; it is not a replacement for the frozen current intent. The preview also shows the exact next announced event after the proposed action and enemy response.

Redirected damage equals announced damage. A marked recipient loses Mark and becomes Exposed through the next beat, enabling Lyra's bonus. This effect ends without triggering another attack or reaction chain.

The **Energy Crystal** is a genuine entity with stable ID, one charge and target validation. It absorbs the entire redirected energy attack and grants 8 barrier to every living hero. Barrier is non-stacking and persists until damage absorbs it. It cannot receive physical attacks or ordinary hero Attack. Preview shows absorption, cost and barrier gain before commitment.

## Tactical balance update

The initial encounter allowed the same Raider-first attack policy to win without reading intent, while Mark's +6 bonus did not repay its setup action. After player feedback, Rift Bolt increases from 18 to 30 and the Tracer status bonus from 6 to 22. Enemy HP, basic attacks, Guard, Counter, Crystal charges/barrier, reaction limits and victory conditions remain unchanged. Content version advances to 2 so existing saves reset safely.

Blind Raider-first attacks now lose. Prioritizing Brute still supports an attack-only win in nine beats, with two heroes standing. Guard/Mark without Redirect, Crystal defense and marked-enemy Redirect each support nine-beat wins with all three heroes standing. Thus Redirect is useful without being a required universal combo; target priority and defensive timing change the outcome.

The UI warns when an unprotected hit or the proposed command will down a hero, shows upcoming planned threats, explains Mark's 38-damage follow-up, and reports survivors/remaining HP with Party intact or Costly victory. Keeping all three heroes is an optional challenge, not a new resource, reward or altered victory rule. See `BALANCE_VALIDATION.md` for reproducible command routes and their outcomes. Human enjoyment still needs continued playtesting; simulator results demonstrate concrete choice consequences, not final balance quality.

## Open design questions (future, not implemented)

- Encounter variety, elite/boss intent patterns and Counter economy across encounters.
- Other legal Redirect targets and interrupt rules; each must be explicit and bounded.
- Final Mark duration, Guard mitigation, actor values and encounter difficulty after human playtesting.
- Party composition outside this fixed trio, equipment effects and progression.
- Expedition Threat, Veil Surge, fog reveal, camps and danger/event numerics.
- Accessibility/localization, audio feedback and real mobile ergonomics.

Any additions require separate scoped design and validation; this prototype does not finalize them.
