// Synthetic QA encounters only. All events, deaths, upkeep and commands use the real resolver.
import { veilSiege } from '../../src/content/encounters/veil-siege';
import { heroes } from '../../src/content/heroes/team';
import { mercenaries } from '../../src/content/heroes/mercenaries';
import { beginBattle, currentHeroId, resolveCommand, targetOptions } from '../../src/core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition, TurnStage } from '../../src/core/battle/types';

export const healingSkillList = ['heal', 'prayer', 'rouse', 'revive', 'bless', 'mend'] as const;
export type FixtureHealingSkill = typeof healingSkillList[number];
export function healingFixture(skill: FixtureHealingSkill, scenario = 'normal') {
  const role = skill === 'rouse' ? 'Knight' : skill === 'mend' ? 'Bard' : 'Priest';
  const actor = [...heroes, ...mercenaries].find(h => h.role === role)!;
  const party = [actor, ...heroes.filter(h => h.id !== actor.id).slice(0, 3)];
  const data: EncounterDefinition = { ...structuredClone(veilSiege),
    heroes: party.map((h, i) => ({ ...h, speed: i === 0 ? 200 : 50, ...(i === 0 ? { actions: ['attack', skill, ...(scenario === 'solo' ? ['solo' as const] : [])] as ActionId[],
      ...(scenario === 'overflow' ? { passive: 'afterglow' as const } : {}),
      talents: { caps: scenario === 'twin' ? { twinheal: 1 } : scenario === 'echo' ? { longprayer: 1 } : scenario === 'barrier' ? { liferhythm: 6 } : {} } } : {}) })),
    enemies: veilSiege.enemies.map(e => ({ ...e, maxHp: 9999, speed: 100 })),
    intents: veilSiege.enemies.map(e => ({ sourceId: e.id, targetSlot: scenario === 'source-down' ? 0 : skill === 'rouse' ? 3 : 1,
      name: 'QA announced attack', damage: scenario === 'source-down' ? 200 : 4, kind: 'energy' as const })),
  };
  const entry = { hp: Object.fromEntries(data.heroes.map((h, i) => [h.id, scenario === 'full' ? h.maxHp : skill === 'revive' && i === 1 ? 1 : scenario === 'overflow' && i === 1 ? h.maxHp-1 : h.maxHp-15-i*3])) };
  const prelude: Command[] = [];
  let state = beginBattle(data, entry, true).state;
  const command = (s: BattleState, action: ActionId = 'attack'): Command => {
    const heroId = currentHeroId(s, data)!;
    const options = targetOptions(s, data, heroId, action).filter(t => t.valid);
    return { beat: s.beat, heroId, action, targetId: (options.find(t => t.id !== heroId) ?? options[0])!.id };
  };
  if (skill === 'revive') {
    do { const cmd = command(state); prelude.push(cmd); state = resolveCommand(state, data, cmd, true).state; }
    while (currentHeroId(state, data) !== actor.id && prelude.length < 12);
    if (!state.heroes.some(h => !h.hp && h.fell)) throw new Error('No actual fallen ally');
  }
  const legal = targetOptions(state, data, actor.id, skill).filter(t => t.valid);
  const targetId = (legal.find(t => t.id !== actor.id) ?? legal[0])?.id;
  const commands: Command[] = [], turns: TurnStage[] = [];
  const cast = targetId ? resolveCommand(state, data, { beat: state.beat, heroId: actor.id, action: skill, targetId }, true) : undefined;
  if (cast) {
    turns.push(...cast.turns); let next = cast.state;
    const throughRound = state.round + (scenario === 'solo' ? 2 : 1);
    for (let i = 0; i < 16 && next.round < throughRound && next.outcome === 'active'; i++) {
      const action = scenario === 'solo' && next.round === state.round+1 && currentHeroId(next, data) === actor.id ? 'solo' : 'attack';
      const cmd = command(next, action); commands.push(cmd);
      const resolved = resolveCommand(next, data, cmd, true); turns.push(...resolved.turns); next = resolved.state;
    }
  }
  return { data, entry, actor, prelude, state, targetId, cast, commands, turns };
}
