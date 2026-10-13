# Fateweave gameplay direction — four-class encounter, version 3

Asterveil: Rise Beyond is a browser-first Fantasy Expedition RPG with Tactical Reaction Combat. Read the announced danger, choose a class skill, and tap a legal target to cast immediately. The user requested replacing the Crystal system with four heroes, front 2 / back 2, each with an individual class and skills.

## Implemented loop

Show one frozen Enemy Intent → select a living hero, one owned action and a legal target → tap the target to commit immediately → resolve the hero skill, then the announced enemy event if not canceled → advance cooldown/status durations → announce the next event or finish Victory/Defeat.

One primary action per beat. No timer, random damage, QTE, automatic player action or initiative system. The pure engine runs under Node; scene transitions never own state or persistence.

## Party and skills

| Hero | Position | Role | Actions |
|---|---|---|---|
| Aegis / เอกิส | Front | Knight / อัศวิน | Attack 10; Guard intercept with 65% reduction; Shield Bash 18, interrupt current physical source |
| Lyra / ไลรา | Front | Duelist / นักดาบ | Attack 16; Mark for 3 beats including application; Precision Strike 28 |
| Eira / ไอรา | Back | Mage / จอมเวท | Attack 11; Arcane Bolt 26; Ward 14 to one ally |
| Seren / เซเรน | Back | Priest / นักบวช | Attack 8; Heal 20 to one ally; Prayer 10 to all living allies |

Lyra consumes Mark to gain +22 on Attack or Precision Strike. Mark costs an action and does no damage. Other heroes leave it intact. Cooldown skills use 3 beats, except Prayer 4; Attack, Guard and Mark have none. A 3-beat skill used on beat 1 becomes available on beat 4. The UI presents remaining waits and rejects early reuse at commit and save replay.

Guard protects only the announced target, with Aegis taking the hit instead. Round the mitigated damage up, then absorb with Aegis's barrier. Shield Bash interrupts only if the chosen enemy is the current physical attacker. Killing any current attacker cancels its event, regardless of attack type.

Ward is non-stacking, persists until absorbed and can act before the same-beat hit. Heal and Prayer happen before the enemy response, clamp at maximum HP, and never revive. All-healthy healing and full-barrier targets are unavailable.

## Formation and intent

Physical attacks select a living front hero; the back row becomes eligible after the front row falls. Energy attacks can reach a preferred back hero. Announcing an event selects its living source and eligible target once. Never substitute the frozen target after a cast. Forecasts project the next two beats assuming current actors survive; the actual next intent appears when the current beat finishes.

Crystal, Redirect, Counter and Exposed are removed from state, commands and rendering. No environmental target or separate reaction resource remains. Values live in typed hero/enemy definitions and `src/content/encounters/veil-siege.ts`.

## Strategy and presentation

The offensive and defensive fixtures both use all four classes and preserve all four members; basic-attack policies targeting either enemy first lose. See `BALANCE_VALIDATION.md` for reproducible routes. These examples establish visible choices without declaring final balance or a mandatory single combo.

The interface is Thai, with secondary English skill names. The field labels both lanes; the dock shows the selected class, its three actions, valid targets and four-member roster. Hero/skill selection and optional skill help do not commit; tapping a legal target does so immediately. The full-outcome preview and confirmation dialog are removed. Rotation preserves a selected uncast skill. After a cast the UI shows the hero stage (cyan, 1 second), then the frozen enemy response (pink, 1 second), and only then selects the next living hero in roster order (Aegis → Lyra → Eira → Seren → Aegis), skipping downed heroes and resetting the chosen action to Attack. Manual selection remains available. Reload derives the next selected hero from the last committed command; a completed battle keeps its final actor selected. Stage HP/barriers and logs reveal only effects that have happened in the displayed phase. Interruption/source defeat explicitly shows a canceled enemy turn. The player can skip presentation; reduced motion keeps static phase labels. The resolver commits/saves once before presentation; reload/hidden-tab completion and restart never submit an extra command. This is a UI selection aid, not a forced initiative rule, so content version and compatible saves remain unchanged.

Victory requires all enemies down and at least one hero alive. Keeping the whole party is an optional challenge, not a separate currency or progression system. Encounter ID/version are now `veil-siege` / 3; old party saves restart rather than being reinterpreted.
