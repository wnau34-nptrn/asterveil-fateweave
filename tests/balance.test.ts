import { expect, it } from 'vitest';
import { createBattle, currentHeroId, previewCommand, replay, resolveCommand, targetOptions } from '../src/core/battle/engine';
import { veilSiege as data } from '../src/content/encounters/veil-siege';
import { partyRoutes } from './fixtures/party-routes';
it.each(partyRoutes)('supports a genuine four-survivor route with exact previews/replay: $hp', ({ moves, hp }) => {
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
it.each([['b1','f1'],['f1','b1']])('blind basic attacks lose when prioritizing %s', (first, second) => {
  let state = createBattle(data);
  while (state.outcome === 'active' && state.commands.length < 50) {
    const heroId = currentHeroId(state, data)!;
    // A front-lane hero cannot reach the screened back row, so it falls back to the other target.
    const valid = targetOptions(state, data, heroId, 'attack').filter(t => t.valid).map(t => t.id);
    const target = [first,second].find(id => valid.includes(id))!;
    state = resolveCommand(state, data, { beat: state.beat, heroId, action: 'attack', targetId: target }).state;
  }
  expect(state.outcome).toBe('defeat'); expect(state.heroes.every(h => h.hp === 0)).toBe(true);
  expect(replay(data, state.commands)).toEqual(state);
});
