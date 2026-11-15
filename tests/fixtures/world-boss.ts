import { currentHeroId, resolveCommand, targetOptions, createBattle } from '../../src/core/battle/engine';
import type { Command, EncounterDefinition } from '../../src/core/battle/types';
import { battleLesson } from '../../src/ui/tutorial';

// P11-04 tests: plays a World Boss attempt to its end (the battle ends or round `maxRounds + 1` begins). `advisor`
// follows the teaching advisor (as the balance sims do), otherwise plain basic attacks on the first legal foe.
export function wbTurns(data: EncounterDefinition, maxRounds: number, style: 'advisor' | 'attack' = 'advisor', limit = 1000): Command[] {
  let s = createBattle(data);
  for (let i = 0; s.outcome === 'active' && s.round <= maxRounds && i < limit; i++) {
    const l = style === 'advisor' ? battleLesson(s, data) : undefined;
    const c: Command = l ? { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId, ...(l.recipientId ? { recipientId: l.recipientId } : {}),
      ...(l.cooldownAction ? { cooldownAction: l.cooldownAction } : {}), ...(l.cooldownTargetId ? { cooldownTargetId: l.cooldownTargetId } : {}) }
      : (() => { const hero = currentHeroId(s, data)!; const t = targetOptions(s, data, hero, 'attack').find(o => o.valid)!; return { beat: s.beat, heroId: hero, action: 'attack' as const, targetId: t.id }; })();
    s = resolveCommand(s, data, c).state;
  }
  return s.commands;
}
