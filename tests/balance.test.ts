import { expect, it } from 'vitest';
import { createBattle, previewCommand, replay, resolveCommand } from '../src/core/battle/engine';
import { veilSiege as data } from '../src/content/encounters/veil-siege';
import { offensive, defensive } from './fixtures/party-routes';
it.each([{ moves: offensive, hp: [62,42,2,28] }, { moves: defensive, hp: [18,32,26,18] }])('supports a genuine four-survivor route with exact previews/replay: $hp', ({ moves, hp }) => {
  let state = createBattle(data);
  for (const [heroId, action, targetId] of moves) {
    const command = { beat: state.beat, heroId, action, targetId };
    const before = structuredClone(state);
    const result = resolveCommand(state, data, command);
    expect(previewCommand(state, data, command)).toEqual(result); expect(state).toEqual(before);
    state = result.state;
  }
  expect(state.outcome).toBe('victory'); expect(state.heroes.map(h => h.hp)).toEqual(hp);
  expect(new Set(state.commands.map(c => c.heroId)).size).toBe(4);
  expect(replay(data, state.commands)).toEqual(state);
});
it.each([['raider','brute'],['brute','raider']])('blind basic attacks lose when prioritizing %s', (first, second) => {
  let state = createBattle(data);
  while (state.outcome === 'active' && state.commands.length < 50) {
    const hero = data.heroes.filter(h => state.heroes.find(a => a.id === h.id)!.hp > 0).sort((a,b) => b.attack-a.attack)[0]!;
    const target = [first,second].find(id => state.enemies.find(e => e.id === id)!.hp > 0)!;
    state = resolveCommand(state, data, { beat: state.beat, heroId: hero.id, action: 'attack', targetId: target }).state;
  }
  expect(state.outcome).toBe('defeat'); expect(state.heroes.every(h => h.hp === 0)).toBe(true);
  expect(replay(data, state.commands)).toEqual(state);
});
