import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { newProfile, settle } from '../src/core/world/profile';
import type { ExpeditionState, Item } from '../src/core/world/types';
import { newExpedition } from '../src/core/world/world';
import { runSummary } from '../src/ui/summary-ui';
import { xpAt } from './fixtures/camp-level';

// 4F: the summary reads the profile before and after settling plus the finished run.
const run = (patch: Partial<ExpeditionState> = {}): ExpeditionState => ({ ...newExpedition(map, lookup, 4, undefined, true), ...patch });
const item: Item = { uid: 0, slot: 'body', rarity: 3, level: 5, affixes: ['hp'] };

describe('expedition summary', () => {
  it('counts the run, the haul kept, new gear, level-ups and side-quest progress', () => {
    const before = newProfile(map, 3);
    const r = run({ steps: 120, wins: 14, defeats: 1, elitesDefeated: ['gate-thicket'], openedChests: ['meadow-west'], solved: ['scar-levers'], secrets: ['meadow-secret'],
      herbs: [map.herbs[0]!.id], resources: { ore: 50, gold: 20, ember: 0, seal: 2 }, dust: 7, found: [item] });
    r.members.guardian = { ...r.members.guardian!}; r.campXp = Math.max(r.campXp, xpAt(4));
    const after = settle(before, r, 'complete', map);
    const s = runSummary(before, r, after, 'complete', map);
    expect(s).toMatchObject({ outcome: 'complete', firstClear: true, steps: 120, wins: 14, defeats: 1, elites: 1, chests: 1, puzzles: 1, secrets: 1, herbs: 1,
      kept: { ore: 50, gold: 20, seal: 2, dust: 7 } });
    expect(s.items).toHaveLength(1); expect(s.items[0]!.rarity).toBe(3);
    expect(s.campLevel).toEqual({ from: 1, to: 4 });
    expect(s.quests.find(q => q.npc === 'broker')).toMatchObject({ from: 0, to: 14, ready: false });
    // A later clear is not the first.
    expect(runSummary(after, r, settle(after, r, 'complete', map), 'complete', map).firstClear).toBe(false);
  });
  it('a wipe keeps half the resources, only the best item and no herbs', () => {
    const before = newProfile(map, 3);
    const r = run({ resources: { ore: 50, gold: 20, ember: 0, seal: 2 }, found: [item], herbs: [map.herbs[0]!.id] });
    const s = runSummary(before, r, settle(before, r, 'wiped', map), 'wiped', map);
    expect(s.kept).toMatchObject({ ore: 25, gold: 10, seal: 1 }); expect(s.items).toHaveLength(1); expect(s.items[0]).toMatchObject({ rarity: item.rarity, level: item.level }); expect(s.herbs).toBe(0); expect(s.firstClear).toBe(false);
  });
});
