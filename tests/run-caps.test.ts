import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import { RUN_CAP, clampRun } from '../src/core/world/caps';
import { newProfile } from '../src/core/world/profile';
import { emptyTomes } from '../src/core/world/tomes';
import type { ExpeditionState } from '../src/core/world/types';
import { findTiles, newExpedition, openChest, rest } from '../src/core/world/world';

// An expedition has no limit on random battles, so its carried resources must stop at the run limits the save validator
// accepts (claude 2026-11-04, after the camp ceilings of tests/storage-caps.test.ts).
const run = (patch: Partial<ExpeditionState> = {}): ExpeditionState => ({ ...newExpedition(map, lookup, 4, undefined, true), ...patch });
const roundTrip = (state: ExpeditionState) => {
  let raw = ''; expect(saveGame({ getItem: () => raw, setItem: (_k, v) => { raw = v; } }, { profile: newProfile(map, 4), run: state })).toBe(true);
  return parseGame(raw, map, lookup).run!;
};

describe('run ceilings', () => {
  it('clampRun fills every carried store to its limit', () => {
    const s = run({ resources: { ore: RUN_CAP.ore + 5, gold: RUN_CAP.gold + 5, ember: RUN_CAP.ember + 1, seal: RUN_CAP.seal + 1 }, dust: RUN_CAP.dust + 9, riftCore: RUN_CAP.riftCore + 1, tomeWins: RUN_CAP.tomeWins + 1 });
    s.tomes = emptyTomes(); s.tomes.blade.small = 100_000;
    clampRun(s);
    expect(s.resources).toEqual({ ore: RUN_CAP.ore, gold: RUN_CAP.gold, ember: RUN_CAP.ember, seal: RUN_CAP.seal });
    expect([s.dust, s.riftCore, s.tomeWins, s.tomes.blade.small]).toEqual([RUN_CAP.dust, RUN_CAP.riftCore, RUN_CAP.tomeWins, 99_999]);
  });
  it('a chest opened at the limits keeps a savable run', () => {
    const chest = map.chests[0]!;
    const s = run({ position: { x: chest.x, y: chest.y }, resources: { ore: RUN_CAP.ore, gold: RUN_CAP.gold, ember: RUN_CAP.ember, seal: RUN_CAP.seal } });
    const r = openChest(s, map); expect(r.event.type).toBe('chest');
    expect(r.state.resources).toEqual({ ore: RUN_CAP.ore, gold: RUN_CAP.gold, ember: RUN_CAP.ember, seal: RUN_CAP.seal });
    expect(roundTrip(r.state).resources).toEqual(r.state.resources);
  });
  it('an optional elite stops returning after the respawn limit', () => {
    const elite = map.elites.find(e => !e.forced && !e.mini)!; const camp = findTiles(map, 'camp')[0]!;
    const s = run({ position: { x: camp.x, y: camp.y }, restReady: true, elitesDefeated: [elite.id], respawns: { [elite.id]: RUN_CAP.respawns } });
    const r = rest(s, map, lookup);
    expect(r.state.respawns[elite.id]).toBe(RUN_CAP.respawns); expect(r.state.elitesDefeated).toContain(elite.id);
  });
});
