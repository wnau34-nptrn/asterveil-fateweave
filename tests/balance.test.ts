import { expect, it } from 'vitest';
import { createBattle, plannedIntents, previewCommand, replay, resolveCommand } from '../src/core/battle/engine';
import { crystalRift as data } from '../src/content/encounters/crystal-rift';
import type { ActionId, BattleState } from '../src/core/battle/types';

type Move = readonly [string, ActionId, string];
function play(moves: readonly Move[]): BattleState {
  return moves.reduce((s, [heroId, action, targetId]) => {
    const c = { beat: s.beat, heroId, action, targetId };
    expect(previewCommand(s, data, c)).toEqual(resolveCommand(s, data, c));
    return resolveCommand(s, data, c).state;
  }, createBattle(data));
}
function attackPolicy(targetOrder: string[]): BattleState {
  let s = createBattle(data);
  for (let i = 0; s.outcome === 'active' && i < 30; i++) {
    const heroId = ['tracer', 'weaver', 'guardian'].find(id => s.heroes.some(h => h.id === id && h.hp > 0))!;
    const targetId = targetOrder.find(id => s.enemies.some(e => e.id === id && e.hp > 0))!;
    s = resolveCommand(s, data, { beat: s.beat, heroId, action: 'attack', targetId }).state;
  }
  return s;
}
it('blindly attacking Raider first loses, while prioritizing Brute is a viable costly offensive route', () => {
  expect(attackPolicy(['raider', 'brute']).outcome).toBe('defeat');
  const focused = attackPolicy(['brute', 'raider']);
  expect(focused.outcome).toBe('victory');
  expect(focused.heroes.filter(h => h.hp > 0)).toHaveLength(2);
  expect(focused.commands).toHaveLength(9);
  expect(replay(data, focused.commands)).toEqual(focused);
});
it('Mark rewards its setup action by enabling a two-beat Raider elimination', () => {
  const marked = play([['tracer', 'mark', 'raider'], ['tracer', 'attack', 'raider']]);
  expect(marked.enemies.find(e => e.id === 'raider')!.hp).toBe(0);
  const unmarked = play([['tracer', 'attack', 'raider'], ['tracer', 'attack', 'raider']]);
  expect(unmarked.enemies.find(e => e.id === 'raider')!.hp).toBe(6);
});
const routes: Array<{ name: string; hp: number[]; moves: Move[] }> = [
  { name: 'Guard + Mark without Redirect', hp: [49, 4, 24], moves: [
    ['tracer', 'mark', 'brute'], ['guardian', 'guard', 'guardian'], ['tracer', 'attack', 'brute'],
    ['tracer', 'mark', 'brute'], ['tracer', 'attack', 'brute'], ['tracer', 'attack', 'brute'],
    ['tracer', 'mark', 'raider'], ['guardian', 'guard', 'tracer'], ['tracer', 'attack', 'raider'],
  ] },
  { name: 'Crystal defense', hp: [53, 3, 32], moves: [
    ['tracer', 'mark', 'brute'], ['guardian', 'guard', 'guardian'], ['tracer', 'attack', 'brute'],
    ['tracer', 'mark', 'brute'], ['tracer', 'attack', 'brute'], ['weaver', 'redirect', 'energy-crystal'],
    ['tracer', 'attack', 'brute'], ['tracer', 'mark', 'raider'], ['tracer', 'attack', 'raider'],
  ] },
  { name: 'Marked-enemy Redirect offense', hp: [45, 17, 24], moves: [
    ['tracer', 'mark', 'brute'], ['guardian', 'guard', 'guardian'], ['tracer', 'attack', 'brute'],
    ['guardian', 'guard', 'tracer'], ['tracer', 'mark', 'brute'], ['weaver', 'redirect', 'brute'],
    ['tracer', 'attack', 'brute'], ['tracer', 'mark', 'raider'], ['tracer', 'attack', 'raider'],
  ] },
];
it.each(routes)('$name keeps all three heroes alive without lengthening the encounter', ({ moves, hp }) => {
  const s = play(moves);
  expect(s.outcome).toBe('victory');
  expect(s.heroes.map(h => h.hp)).toEqual(hp);
  expect(s.heroes.every(h => h.hp > 0)).toBe(true);
  expect(s.commands).toHaveLength(9);
  expect(replay(data, s.commands)).toEqual(s);
});
it('forecast uses the announcement rules without changing state or the frozen current intent', () => {
  const s = createBattle(data); const before = structuredClone(s);
  expect(plannedIntents(s, data)).toMatchObject([
    { beat: 2, sourceId: 'brute', targetId: 'guardian', damage: 30 },
    { beat: 3, sourceId: 'raider', targetId: 'weaver', damage: 9 },
  ]);
  const next = resolveCommand(s, data, { beat: 1, heroId: 'guardian', action: 'guard', targetId: 'tracer' }).state;
  expect(next.intent).toEqual(plannedIntents(s, data)[0]);
  expect(s).toEqual(before);
  s.enemies[0]!.hp = 0;
  expect(plannedIntents(s, data).every(intent => intent.sourceId === 'brute')).toBe(true);
  s.outcome = 'victory'; expect(plannedIntents(s, data)).toEqual([]);
});
