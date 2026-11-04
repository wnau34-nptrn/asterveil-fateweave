import { describe, expect, it } from 'vitest';
import { chapterOne as map } from '../src/content/world/chapter1';
import { MAPS as maps } from '../src/content/world/maps';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { BANK_CAP, POTION_CAP, RIFT_CORE_CAP, TOME_CAP } from '../src/core/world/caps';
import { activeGuides, brew, buy, claimGuide, claimQuest, depart, dismiss, newProfile, settle } from '../src/core/world/profile';
import { smelt } from '../src/core/world/forge';
import { emptyTomes, tradeTomes } from '../src/core/world/tomes';
import type { Profile } from '../src/core/world/types';
import { parseGame, saveGame } from '../src/core/save/expedition-save';

// Every camp command must leave a profile the v45 validator accepts (Codex notes UXD-05 smelt dust, UXD-07 tome trades).
function roundTrip(profile: Profile): Profile {
  let raw = ''; expect(saveGame({ getItem: () => raw, setItem: (_k, v) => { raw = v; } }, { profile, run: null })).toBe(true);
  return parseGame(raw, map, lookup, maps).profile;
}
function tomeProfile(): Profile {
  const p = newProfile(map, 17); p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier']; p.tomes = emptyTomes(); return p;
}

describe('storage ceilings shared by commands and saves', () => {
  it('refuses a same-line upsize into a full stack and allows the last tome', () => {
    const p = tomeProfile(); p.tomes!.bulwark.small = 10; p.tomes!.bulwark.medium = TOME_CAP;
    expect(tradeTomes(p, maps, map, 'bulwark', 'small').event).toEqual({ type: 'blocked', reason: 'full' });
    p.tomes!.bulwark.medium = TOME_CAP - 1; const r = tradeTomes(p, maps, map, 'bulwark', 'small');
    expect(r.profile.tomes!.bulwark.medium).toBe(TOME_CAP); expect(roundTrip(r.profile)).toEqual(r.profile);
  });
  it('refuses a cross-line trade into a full stack, whatever the source', () => {
    const p = tomeProfile(); p.tomes!.blade.large = 50; p.tomes!.bulwark.large = TOME_CAP;
    expect(tradeTomes(p, maps, map, 'blade', 'large', 'bulwark').event).toEqual({ type: 'blocked', reason: 'full' });
    expect(tradeTomes(p, maps, map, 'blade', 'large', 'accord').event.type).toBe('tomeTrade');
  });
  it('smelt stops at the dust ceiling', () => {
    const p = newProfile(map, 3); p.bank.ore = 100_000; p.bank.dust = BANK_CAP.dust;
    expect(smelt(p, map, 1).event).toEqual({ type: 'blocked', reason: 'full' });
    p.bank.dust = BANK_CAP.dust - 1; const r = smelt(p, map, 1); expect(r.profile.bank.dust).toBe(BANK_CAP.dust); expect(roundTrip(r.profile)).toEqual(r.profile);
  });
  it('a quota or ore shortage is still reported before the ceiling', () => {
    const p = newProfile(map, 3); p.bank.ore = 0; p.bank.dust = BANK_CAP.dust;
    expect(smelt(p, map, 1).event).toEqual({ type: 'blocked', reason: 'ore' });
  });
  it('buying a seal or repel and brewing stop at their ceilings', () => {
    const p = newProfile(map, 3); p.bank.gold = 100_000; p.bank.seal = BANK_CAP.seal; p.potions.repel = POTION_CAP; p.bank.ore = 10_000; p.bank.dust = 10_000; p.potions.salve = POTION_CAP;
    expect(buy(p, map, 'seal').event).toEqual({ type: 'blocked', reason: 'full' });
    expect(buy(p, map, 'repel').event).toEqual({ type: 'blocked', reason: 'full' });
    expect(brew(p, map, 'salve').event).toEqual({ type: 'blocked', reason: 'full' });
    p.bank.seal--; p.potions.repel--; p.potions.salve--;
    for (const r of [buy(p, map, 'seal'), buy(p, map, 'repel'), brew(p, map, 'salve')]) { expect(r.event.type).not.toBe('blocked'); expect(roundTrip(r.profile)).toEqual(r.profile); }
  });
  it('a side-quest reward that would pass a ceiling waits until resources are used', () => {
    const q = map.sideQuests.find(s => s.reward.gold || s.reward.ore || s.reward.seal || s.reward.dust)!; const key = (['gold', 'ore', 'seal', 'dust'] as const).find(k => q.reward[k])!;
    const p = newProfile(map, 3); p.quests[q.id] = { progress: q.target, claimed: false }; p.bank[key] = BANK_CAP[key];
    expect(claimQuest(p, map, q.id).event).toEqual({ type: 'blocked', reason: 'full' }); expect(p.quests[q.id]!.claimed).toBe(false);
    p.bank[key] = BANK_CAP[key] - q.reward[key]!; const r = claimQuest(p, map, q.id); expect(r.event.type).toBe('claimed'); expect(roundTrip(r.profile)).toEqual(r.profile);
  });
  it('a guide reward past a ceiling is refused, but skipping it still works', () => {
    const p = newProfile(map, 3); const g = activeGuides(p, maps).find(x => x.reward.gold || x.reward.ore || x.reward.dust || x.reward.seal);
    if (!g) return; const key = (['gold', 'ore', 'seal', 'dust'] as const).find(k => g.reward[k])!; p.bank[key] = BANK_CAP[key];
    expect(claimGuide(p, maps, g.id, true).event).toEqual({ type: 'guide', id: g.id, skipped: true });
  });
  it('a return home fills each store to its ceiling and always saves', () => {
    const p = newProfile(map, 5); p.bank = { gold: BANK_CAP.gold, ore: BANK_CAP.ore - 1, seal: BANK_CAP.seal, dust: BANK_CAP.dust }; p.potions.salve = POTION_CAP;
    p.tomes = emptyTomes(); p.tomes.blade.small = TOME_CAP; p.riftCore = RIFT_CORE_CAP;
    const run = depart(p, map, lookup, 9).run; run.resources.ore = 500; run.resources.gold = 500; run.resources.seal = 5; run.dust = 50; run.potions.salve = 1;
    run.tomes = emptyTomes(); run.tomes.blade.small = 3; run.riftCore = 2;
    const home = settle(p, run, 'withdrawn', map);
    expect(home.bank).toEqual(BANK_CAP); expect(home.potions.salve).toBe(POTION_CAP); expect(home.tomes!.blade.small).toBe(TOME_CAP); expect(home.riftCore).toBe(RIFT_CORE_CAP);
    expect(roundTrip(home)).toEqual(home);
  });
  it('a dismissal refund fills gold to the ceiling and the member still leaves', () => {
    const p = newProfile(map, 5); p.bank.gold = BANK_CAP.gold; const id = p.company[p.company.length - 1]!;
    const r = dismiss(p, map, id); expect(r.event).toEqual({ type: 'dismissed', heroId: id }); expect(r.profile.bank.gold).toBe(BANK_CAP.gold); expect(roundTrip(r.profile)).toEqual(r.profile);
  });
});
