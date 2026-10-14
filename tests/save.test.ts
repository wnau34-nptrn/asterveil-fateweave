import { expect, it } from 'vitest';
import { createBattle, resolveCommand } from '../src/core/battle/engine';
import { battleSaveKey, loadBattle, loadSelectedEncounter, rememberEncounter, saveBattle, type StoragePort } from '../src/core/save/battle-save';
import { battles, rearAmbush, riftWarden } from '../src/content/encounters/catalog';
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

it('retains independent replays and restarts only the selected battle', () => {
  const storage=memory();
  const states=battles.map(({data},i)=>resolveCommand(createBattle(data),data,
    i===0?{beat:1,heroId:'tracer',action:'mark',targetId:'brute'}:
      i===1?{beat:1,heroId:'weaver',action:'ward',targetId:'weaver'}:
        {beat:1,heroId:'guardian',action:'bash',targetId:'brute'}).state);
  battles.forEach(({data},i)=>expect(saveBattle(storage,states[i]!,data)).toBe(true));
  battles.forEach(({data},i)=>expect(loadBattle(storage,data)).toEqual({state:states[i],restored:true}));
  saveBattle(storage,createBattle(rearAmbush),rearAmbush);
  expect(loadBattle(storage,rearAmbush).restored).toBe(false);
  expect(loadBattle(storage,data).state).toEqual(states[0]);
  expect(loadBattle(storage,riftWarden).state).toEqual(states[2]);
  expect(battleSaveKey(data)).toBe('asterveil.fateweave.battle.v1');
});
it('restores only a catalogued selection and tolerates missing, invalid and denied selection storage', () => {
  const storage=memory(), catalog=battles.map(c=>c.data);
  expect(loadSelectedEncounter(storage,catalog)).toBe(data);
  expect(rememberEncounter(storage,rearAmbush)).toBe(true);
  expect(loadSelectedEncounter(storage,catalog)).toBe(rearAmbush);
  storage.setItem('asterveil.fateweave.encounter.v1','unregistered');
  expect(loadSelectedEncounter(storage,catalog)).toBe(data);
  const denied:StoragePort={getItem:()=>{throw new Error('Denied');},setItem:()=>{throw new Error('Denied');}};
  expect(loadSelectedEncounter(denied,catalog)).toBe(data);
  expect(rememberEncounter(denied,riftWarden)).toBe(false);
  expect(rememberEncounter(undefined,riftWarden)).toBe(false);
});
it('rejects foreign or outdated content in one save slot without affecting the other battle', () => {
  const storage=memory();
  const state=resolveCommand(createBattle(data),data,{beat:1,heroId:'tracer',action:'mark',targetId:'brute'}).state;
  saveBattle(storage,state,data);
  storage.setItem(battleSaveKey(rearAmbush),storage.getItem(battleSaveKey(data))!);
  expect(loadBattle(storage,rearAmbush).restored).toBe(false);
  storage.setItem(battleSaveKey(rearAmbush),JSON.stringify({version:1,encounterId:rearAmbush.id,contentVersion:0,commands:[]}));
  expect(loadBattle(storage,rearAmbush)).toEqual({state:createBattle(rearAmbush),restored:false});
  expect(loadBattle(storage,data).state).toEqual(state);
});
