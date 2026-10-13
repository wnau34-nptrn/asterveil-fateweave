import { expect, it } from 'vitest';
import { createBattle, resolveCommand } from '../src/core/battle/engine';
import { loadBattle, saveBattle, type StoragePort } from '../src/core/save/battle-save';
import { veilSiege as data } from '../src/content/encounters/veil-siege';

function memory(): StoragePort {
  const values = new Map<string, string>();
  return { getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); } };
}
it('restores the entire authoritative state by replaying saved commands', () => {
  const storage = memory();
  const s = resolveCommand(createBattle(data), data, { beat: 1, heroId: 'guardian', action: 'guard', targetId: 'tracer' }).state;
  expect(saveBattle(storage, s, data)).toBe(true);
  expect(loadBattle(storage, data)).toEqual({ state: s, restored: true });
});
it('handles absent and denied storage without crashing', () => {
  const blocked: StoragePort = { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Quota'); } };
  for (const storage of [undefined, blocked]) {
    expect(saveBattle(storage, createBattle(data), data)).toBe(false);
    expect(loadBattle(storage, data)).toEqual({ state: createBattle(data), restored: false });
  }
});
it('starts fresh instead of replaying a previous balance version under new damage rules', () => {
  const raw = JSON.stringify({ version: 1, encounterId: data.id, contentVersion: data.version - 1, commands: [{ beat: 1, heroId: 'guardian', action: 'guard', targetId: 'tracer' }] });
  expect(loadBattle({ getItem: () => raw, setItem: () => {} }, data)).toEqual({ state: createBattle(data), restored: false });
});
it.each(['{bad', '{}', '{"version":2}', '{"version":1,"encounterId":"crystal-rift","contentVersion":2,"commands":[null]}',
  '{"version":1,"encounterId":"crystal-rift","contentVersion":2,"commands":[{"beat":1,"heroId":"weaver","action":"redirect","targetId":"brute"}]}'])('discards invalid saves: %s', raw => {
  expect(loadBattle({ getItem: () => raw, setItem: () => {} }, data).restored).toBe(false);
});

it('replays a new class skill and its cooldown when restoring', () => {
  const storage = memory();
  let state = resolveCommand(createBattle(data), data, { beat: 1, heroId: 'guardian', action: 'guard', targetId: 'tracer' }).state;
  state = resolveCommand(state, data, { beat: 2, heroId: 'healer', action: 'heal', targetId: 'guardian' }).state;
  saveBattle(storage, state, data);
  expect(loadBattle(storage, data)).toEqual({ state, restored: true });
  expect(state.heroes[3]!.cooldowns.heal).toBe(5);
});
it('rejects a save that reuses a cooling-down skill', () => {
  const commands = [1,2].map(beat => ({ beat, heroId: 'weaver', action: 'bolt', targetId: 'brute' }));
  const raw = JSON.stringify({ version: 1, encounterId: data.id, contentVersion: data.version, commands });
  expect(loadBattle({ getItem: () => raw, setItem: () => {} }, data)).toEqual({ state: createBattle(data), restored: false });
});
