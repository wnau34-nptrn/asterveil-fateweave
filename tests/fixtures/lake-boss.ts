// Isolate each catalog move while retaining the lake field and replaying its real resolver events.
import { waterSpirit } from '../../src/content/encounters/catalog';
import { beginBattle, resolveCommand, targetOptions } from '../../src/core/battle/engine';
import type { ActionId, Command, EncounterDefinition } from '../../src/core/battle/types';

export const lakeBossMoves = ['Tide Lash', 'Water Veil', 'Surging Wave', 'Undertow', 'Great Wave', 'Reflection'] as const;
export type LakeBossMove = typeof lakeBossMoves[number];
export type LakeBossScenario = 'normal' | 'sealed' | 'full' | 'down';

export function lakeBossFixture(move: LakeBossMove, scenario: LakeBossScenario = 'normal') {
  const base = waterSpirit;
  const boss = base.enemies.find(e => e.boss)!;
  const phase = move === 'Reflection' ? base.phases![0]! : undefined;
  const { phase: _phase, ...intent } = base.intents.find(i => i.sourceId === boss.id && i.name === (phase ? 'Tide Lash' : move))!;
  void _phase;
  const heroId = scenario === 'sealed' ? 'weaver' : 'guardian';
  const action: ActionId = scenario === 'sealed' ? 'sigil' : scenario === 'full' ? 'guard' : 'attack';
  const build = (maxHp: number): EncounterDefinition => ({
    ...base,
    heroes: base.heroes.map(h => h.id === heroId
      ? { ...h, speed: 200, actions: [...new Set([...h.actions, action])] }
      : { ...h, speed: Math.min(h.speed, 70) }),
    enemies: base.enemies.map(e => e.id === boss.id ? { ...e, maxHp, speed: 110 } : { ...e, speed: 25 }),
    phases: phase ? [phase] : undefined,
    intents: [...base.intents.filter(i => i.sourceId !== boss.id), intent],
  });
  const entry = { hp: Object.fromEntries(base.heroes.map(h => [h.id, h.maxHp])) };
  const act = (data: EncounterDefinition) => {
    const state = beginBattle(data, entry, true).state;
    const targetId = targetOptions(state, data, heroId, action).find(o => o.valid && o.id === (action === 'guard' ? heroId : boss.id))!.id;
    const command: Command = { beat: state.beat, heroId, action, targetId };
    return { state, command, result: resolveCommand(state, data, command, true) };
  };
  let data = build(scenario === 'down' ? 1 : boss.maxHp);
  if (phase) {
    const dealt = boss.maxHp - act(data).result.state.enemies.find(e => e.id === boss.id)!.hp;
    data = build(Math.floor(dealt * 100 / (100 - phase.below)));
  }
  const { state, command, result } = act(data);
  return { data, entry, prelude: [] as Command[], state, command, result,
    turn: result.turns.find(t => t.side === 'enemy' && t.actorId === boss.id)! };
}
