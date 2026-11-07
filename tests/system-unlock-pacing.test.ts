import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { forestMap } from '../src/content/world/chapter-forest';
import { MAPS } from '../src/content/world/maps';
import { parseGame } from '../src/core/save/expedition-save';
import { activeGuides, boardOffers, buy, claimGuide, claimQuest, depart, featureOpen, hire, newProfile, settle } from '../src/core/world/profile';
import { chooseHuntTarget } from '../src/core/world/targeted-loot';
import { currentSave } from './fixtures/current-save';

const fresh = () => ({ ...newProfile(ruinsMap, 3, ['guardian', 'tracer', 'weaver', 'healer']), tutorialDone: true });
const load = (profile: ReturnType<typeof fresh>) => parseGame(currentSave({ profile, run: null }), ruinsMap, lookup, MAPS).profile;
describe('owner-approved unlock pacing, 2026-11-07', () => {
  it('opens the quest board after a successful MAP 1 return with earlier progress intact and one reward only', () => {
    const q = ruinsMap.sideQuests.find(q => q.kind === 'wins')!;
    const p = { ...fresh(), quests: { [q.id]: { progress: q.target - 1, claimed: false } } };
    const run = { ...depart(p, ruinsMap, lookup, 7).run, wins: 1 };
    expect(featureOpen(p, MAPS, 'quests')).toBe(false);
    for (const outcome of ['withdrawn', 'wiped'] as const) {
      const home = settle(p, run, outcome, ruinsMap);
      expect(featureOpen(home, MAPS, 'quests')).toBe(false); expect(home.cleared).toEqual([]);
    }
    const home = load(settle(p, run, 'complete', ruinsMap));
    expect(home.veteran).toBeUndefined(); expect(featureOpen(home, MAPS, 'quests')).toBe(true);
    expect(home.quests[q.id]).toEqual({ progress: q.target, claimed: false });
    const claimed = claimQuest(home, ruinsMap, q.id);
    expect(claimed.event).toEqual({ type: 'claimed', questId: q.id });
    expect(claimed.profile.bank.gold).toBe(home.bank.gold + q.reward.gold!);
    const reloaded = load(claimed.profile);
    expect(claimQuest(reloaded, ruinsMap, q.id).event).toEqual({ type: 'blocked', reason: 'claimed' });
    expect(claimQuest(home, ruinsMap, ruinsMap.sideQuests[0]!.id).event).toEqual({ type: 'blocked', reason: 'progress' });
  });
  it('opens hiring, market and hunt after MAP 2; actions and guides work, survive reload/replay, and do not open advanced services', () => {
    const p = fresh(); const after1 = settle(p, depart(p, ruinsMap, lookup, 7).run, 'complete', ruinsMap);
    for (const f of ['hire', 'market', 'hunt'] as const) expect(featureOpen(after1, MAPS, f)).toBe(false);
    expect(activeGuides(after1, MAPS).some(g => g.id === 'guide-hire')).toBe(false);
    expect(claimGuide(after1, MAPS, 'guide-hire', true).event.type).toBe('blocked');
    const trip = depart(after1, forestMap, lookup, 9);
    const after2 = load(settle(trip.profile, trip.run, 'complete', forestMap)); after2.bank.gold = 500;
    for (const f of ['hire', 'market', 'hunt'] as const) expect(featureOpen(after2, MAPS, f)).toBe(true);
    for (const f of ['fuse', 'craft', 'transfer', 'bossCharm', 'hard'] as const) expect(featureOpen(after2, MAPS, f)).toBe(false);
    expect(activeGuides(after2, MAPS).some(g => g.id === 'guide-hire')).toBe(true);
    const index = boardOffers(after2, ruinsMap, lookup).findIndex(id => !after2.company.includes(id)); expect(index).toBeGreaterThanOrEqual(0);
    const hired = hire(after2, ruinsMap, lookup, index);
    expect(hired.event.type).toBe('hired'); expect(hired.profile.company).toHaveLength(after2.company.length + 1);
    const guided = claimGuide(hired.profile, MAPS, 'guide-hire'); expect(guided.event.type).toBe('guide');
    const bought = buy(guided.profile, ruinsMap, 'repel'); expect(bought.event.type).toBe('bought');
    expect(bought.profile.bank.gold).toBe(guided.profile.bank.gold - ruinsMap.shop.items.repel.price);
    const targeted = chooseHuntTarget(bought.profile, 'tracer'); expect(targeted.event.type).toBe('huntTarget');
    const saved = load(targeted.profile); expect(saved).toEqual(targeted.profile);
    expect(claimGuide(saved, MAPS, 'guide-hire').event.type).toBe('blocked');
    for (const map of [ruinsMap, forestMap]) {
      const replay = depart(saved, map, lookup, 11);
      expect(replay.run.hunt?.target).toBe('tracer');
      const home = settle(replay.profile, replay.run, 'withdrawn', map);
      for (const f of ['quests', 'hire', 'market', 'hunt'] as const) expect(featureOpen(home, MAPS, f)).toBe(true);
      expect(home.veteran).toBeUndefined();
    }
  });
});
