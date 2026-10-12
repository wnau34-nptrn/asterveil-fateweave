# Fateweave gameplay direction

**Asterveil: Rise Beyond** is a browser-first Fantasy Expedition RPG with Tactical Reaction Combat. The desired feeling is: “I understood the danger, made a meaningful decision, and changed the outcome through my own strategy.” Readability, responsive choices and multiple viable approaches matter more than systems volume.

## Implemented prototype loop

Display current state and a single immutable announced Enemy Intent → choose one of three living heroes → choose an available action and valid target → simulate the complete beat as a preview → explicitly confirm or cancel → resolve the hero action → resolve the announced enemy event if its source survives → apply bounded status/resource effects → announce the next beat or end Victory/Defeat.

There is no timer, reflex check, random damage, battle movement grid or automatic player command. The authoritative resolver runs in Node. Visual transitions neither decide nor delay persistence of combat results.

## Three hero identities

- **Guardian / Aegis:** Attack or intercept the announced target with Guard. Guard reduces damage 65%, rounds remaining damage up, and redirects the reduced hit to Aegis. A surviving defensive action gains 1 Counter (cap 2).
- **Tracer / Lyra:** Attack or Mark. Attack gains +6 on Marked or Exposed enemies and consumes both statuses. Mark costs the primary action and lasts 3 beats including its application beat.
- **Weaver / Eira:** Attack or Redirect. Redirect costs 1 Counter; only currently announced redirectable energy attacks qualify. Choose a living marked enemy (source included) or the charged Crystal. Physical attacks do not qualify.

These are prototype values, not final progression or balance decisions. Values live in `src/content/encounters/crystal-rift.ts` and typed actor definitions.

## Intent and environment principles

Enemy attacks announce source, target, type, exact damage and redirectability. One enemy event occurs per beat. At next-event announcement, dead sources are skipped and a downed preferred target is replaced by a living hero. Never secretly substitute a pending event after confirmation. Killing the announced source cancels that attack.

Redirected damage equals announced damage. A marked recipient loses Mark and becomes Exposed through the next beat, enabling Lyra's bonus. This effect ends without triggering another attack or reaction chain.

The **Energy Crystal** is a genuine entity with stable ID, one charge and target validation. It absorbs the entire redirected energy attack and grants 8 barrier to every living hero. Barrier is non-stacking and persists until damage absorbs it. It cannot receive physical attacks or ordinary hero Attack. Preview shows absorption, cost and barrier gain before commitment.

Attack is independently useful: an automated real-browser test wins by focusing Raider then Brute using Attack only. Defensive intervention is demonstrated by Guard on beat 1, followed by Crystal Redirect on beat 2. Marked-enemy Redirect is also exercised through the real UI; no universal fixed combo is required.

## Open design questions (future, not implemented)

- Encounter variety, elite/boss intent patterns and Counter economy across encounters.
- Other legal Redirect targets and interrupt rules; each must be explicit and bounded.
- Final Mark duration, Guard mitigation, actor values and encounter difficulty after human playtesting.
- Party composition outside this fixed trio, equipment effects and progression.
- Expedition Threat, Veil Surge, fog reveal, camps and danger/event numerics.
- Accessibility/localization, audio feedback and real mobile ergonomics.

Any additions require separate scoped design and validation; this prototype does not finalize them.
