import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { MAPS } from '../src/content/world/maps';
import { mineMap } from '../src/content/world/chapter-mine';
import { captured, setCapture, playMapBattle, simulateCampaign, type Policy, type Style } from './sim/balance-sim';

import { encounterById } from '../src/content/encounters/catalog';
import { levelXp, memberDef } from '../src/core/world/world';
import type { ActionId } from '../src/core/battle/types';
import type { ExpeditionState } from '../src/core/world/types';

const full = process.env.SIM_REPORT === '1';
const samples = full ? Number(process.env.MINE_SIM_SEEDS ?? 4) : 1;
const pairs = [['lio', 'brann'], ['lio', 'sefa'], ['toma', 'brann'], ['toma', 'sefa']];
it('runs the campaign through the mine with real commands and encounters', () => {
  const rows: string[] = [];
  let sampleEntry: ExpeditionState | undefined;
  if (full) setCapture(true);
  const policies: Policy[] = full ? ['rush', 'explorer'] : ['rush'];
  const styles: Style[] = full ? ['advisor', 'casual'] : ['advisor'];
  const pairCount = full ? pairs.length : 1;
  for (const style of styles) for (const policy of policies) for (const pair of pairs.slice(0, pairCount)) {
    let entered = 0; let first = 0; let boss = 0; let bossWon = 0; let blind = 0; let adds = 0;
    for (let i = 0; i < samples; i++) {
      const result = simulateCampaign(1001 + 37 * i, policy, style, 0, 0, 16, pair, MAPS);
      if (full && !sampleEntry) {
        sampleEntry = captured.find(item => item.mapId === mineMap.id && item.label === 'boss')?.state;
        if (sampleEntry) setCapture(false);
      }
      const run = result.expeditions.find(expedition => expedition.mapId === mineMap.id);
      if (!run) continue;
      entered++;
      if (run.outcome === 'complete') first++;
      boss += run.battles.boss?.fought ?? 0;
      bossWon += run.battles.boss?.won ?? 0;
      blind += run.battles['boss:attack']?.won ?? 0;
      adds += run.battles['boss:attack-adds']?.won ?? 0;
    }
    rows.push(`| ${style} | ${policy} | ${pair.join(' + ')} | ${entered}/${samples} | ${first}/${entered} | ${bossWon}/${boss} | ${blind}/${boss} | ${adds}/${boss} |`);
    if (!full) expect(first).toBe(1);
  }
  if (full) {
    setCapture(false);
    const benches = sampleEntry ? bench(sampleEntry) : [];
    mkdirSync('docs/validation/map5-mine', { recursive: true });
    writeFileSync('docs/validation/map5-mine/SIM.md', [
      '# Crystal Mine campaign simulation', '',
      `Campaign maps 1–5 in order with no post-clear replays, ${samples} seeds per starter pair and strategy. Results count first mine attempts; boss counts include repeated fights in that attempt.`, '',
      '| Player | Route | OD-59 pair | Entered mine / seeds | First mine clear | Boss wins / fights | Basic boss-first | Basic adds-first |',
      '|---|---|---|---:|---:|---:|---:|---:|', ...rows, '',
      '## Boss entry stress test', '',
      'One observed entry supplies the gear for its carried members. Other heroes use ★1 without gear. Entry HP varies from 55% to 100% in 5-point steps. This tests different lineups and injured starts independently of campaign routing.', '',
      '| Party | Lv | Advisor wins | Basic boss-first | Basic adds-first | Winning round median |',
      '|---|---:|---:|---:|---:|---:|', ...benches, '',
    ].join('\n'));
  }
}, Math.max(60_000, samples * 100_000));

function bench(reference: ExpeditionState): string[] {
  const parties = {
    physical: ['guardian', 'tracer', 'garran', 'kael', 'healer'],
    magic: ['guardian', 'weaver', 'lio', 'toma', 'healer'],
    defensive: ['guardian', 'brann', 'healer', 'lalin', 'garran'],
    'single target': ['guardian', 'tracer', 'healer', 'sefa', 'kael'],
  };
  const rows: string[] = [];
  for (const [name, ids] of Object.entries(parties)) for (const level of [13, 16]) {
    const state: ExpeditionState = { ...structuredClone(reference), campXp: levelXp(mineMap, level),
      clears: level === 13 ? 4 : 5, roster: { deployed: ids, reserve: [] },
      members: Object.fromEntries(ids.map(id => [id, reference.members[id] ?? { stars: 1, shards: 0 }])),
      battle: { ...reference.battle!, lanes: {}, commands: [], entry: {} } };
    if (name === 'single target') {
      const allowed: readonly ActionId[] = ['guard', 'bash', 'mark', 'execute', 'heal', 'backstab', 'gatherfist', 'releasefist'];
      for (const id of ids) {
        const available = memberDef(encounterById, mineMap, state, id)!.actions;
        state.members[id] = { ...state.members[id]!, loadout: allowed.filter(action => available.includes(action)) };
      }
    }
    const rounds: number[] = [];
    let bossFirst = 0, addsFirst = 0;
    for (let hp = 55; hp <= 100; hp += 5) {
      state.battle!.entry = Object.fromEntries(ids.map(id => [id, Math.floor(memberDef(encounterById, mineMap, state, id)!.maxHp * hp / 100)]));
      const advised = playMapBattle(mineMap, state, 'advisor');
      if (advised.outcome === 'victory') rounds.push(advised.round);
      if (playMapBattle(mineMap, state, 'attack').outcome === 'victory') bossFirst++;
      if (playMapBattle(mineMap, state, 'attack', true).outcome === 'victory') addsFirst++;
    }
    rounds.sort((a, b) => a - b);
    rows.push(`| ${name} | ${level} | ${rounds.length}/10 | ${bossFirst}/10 | ${addsFirst}/10 | ${rounds[Math.floor(rounds.length / 2)] ?? '–'} |`);
  }
  return rows;
}
