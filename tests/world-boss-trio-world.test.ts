import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { WORLD_BOSS_TRIO } from '../src/content/encounters/world-boss-trio';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { chapterOne as home } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { gameRules } from '../src/content/world/rules';
import { beginBattle, previewCommand, resolveCommand, withParty } from '../src/core/battle/engine';
import type { Command, EncounterDefinition, HeroGear, IntentDefinition } from '../src/core/battle/types';
import { applyCommand, parseCommand } from '../src/core/command/game-command';
import { sequenceSeeds } from '../src/core/command/seed-source';
import { parseGame, SAVE_VERSION, type Game } from '../src/core/save/expedition-save';
import { weekOf } from '../src/core/world/board';
import { serverDay } from '../src/server/ledger';
import { gearTotals, itemValid, TRIO_FIRST, TRIO_SLOTS } from '../src/core/world/equipment';
import { protectedItem } from '../src/core/world/storage';
import { newProfile, equip } from '../src/core/world/profile';
import { WB_BOSSES, type MapDefinition, type Profile, type SweepReward, type WbBossId } from '../src/core/world/types';
import {
  bossCraftReason, claimWorldBoss, craftBossItem, trioLive, trioSharedHp, wbAttemptReason, wbClaimReason, wbEncounter, wbWeekDamage, worldBossAttempt,
} from '../src/core/world/world-boss';
import { GAME_CONTEXT } from '../src/server/worker';
import { currentSave } from './fixtures/current-save';
import { wbTurns } from './fixtures/world-boss';
import { morvaneLesson } from '../src/ui/world-boss-advice';

// P11-05 step 2 (docs/design/WORLD_BOSS_TRIO_P11_05_TH.md §2–§4, §8): the trio's world rules (attempts shared by three
// bosses, a tally per boss, boss shards, milestones), the three item powers in the resolver, crafting, save v65 with the
// v64 migration, the weekly budget and a three-boss week simulation. The shipped rules start the trio in week 2969 (OD-52), so week W (2968) is still the warden's;
// tests that play the trio schedule it with a copy of the rules.

const rules = gameRules.worldBoss; const trio = rules.trio;
const D = 20_773; const W = weekOf(D); // D is a Monday
const commander = { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' } as const;
const base = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(home, 5), tutorialDone: true, commander: { ...commander },
  cleared: MAPS.map(m => m.id), bank: { ore: 100, gold: 100, shard: 7, dust: 10 }, ...patch });
// The maps with the trio scheduled from week `from`.
const live = (from = W): MapDefinition[] => MAPS.map((m, i) => i ? m : { ...m, worldBoss: { ...m.worldBoss, trio: { ...m.worldBoss.trio, from } } });
const LIVE = live(); const liveHome = LIVE[0]!;
const turns = (p: Profile, boss?: WbBossId) => wbTurns(wbEncounter(p, liveHome, lookup, boss)!, rules.maxRounds);
function fight(p: Profile, boss: WbBossId, week = W, maps = LIVE): Profile {
  const n = (p.worldBoss?.weeks.find(w => w.week === week)?.attempts ?? 0) + 1;
  const r = worldBossAttempt(p, maps, lookup, week, n, turns(p, boss), boss);
  if (r.event.type !== 'wbAttempt') throw new Error(`attempt refused: ${r.event.type === 'blocked' ? r.event.reason : r.event.type}`);
  return r.profile;
}
const value = (r: SweepReward): number => r.ore + 2 * r.gold + 12 * (r.shard ?? 0);
const dead = (boss?: WbBossId, week = W) => ({ week, hp: 1500, left: 0, ...(boss ? { boss } : {}) });

describe('P11-05 trio content and scheduling', () => {
  it('names three catalog encounters, one item per boss on its own slot, and is scheduled from week 2969 (OD-52: Monday 23 Nov 2026 06:00 Bangkok)', () => {
    expect(trio.from).toBe(2969); expect(W).toBe(2968); expect(trioLive(rules, W)).toBe(false); expect(trioLive(rules, W + 1)).toBe(true);
    expect(weekOf(serverDay(Date.parse('2026-11-23T05:59:59+07:00')))).toBe(2968); expect(weekOf(serverDay(Date.parse('2026-11-23T06:00:00+07:00')))).toBe(2969); expect(trioLive(liveHome.worldBoss, W)).toBe(true); expect(trioLive(liveHome.worldBoss, W - 1)).toBe(false);
    expect(WB_BOSSES.map(b => lookup(trio.bosses[b]))).toEqual(WORLD_BOSS_TRIO);
    for (const b of WB_BOSSES) { const it = trio.items[b]; expect(TRIO_SLOTS[it.power]).toBe(it.slot); expect(TRIO_FIRST[it.power]).toBe(it.first); }
    expect(new Set(WB_BOSSES.map(b => trio.items[b].slot)).size).toBe(3);
    expect(trio.craft).toEqual({ shards: 40, ore: 30, dust: 10, level: 11 });
    // Every map shares the same rules object.
    for (const m of MAPS) expect(m.worldBoss).toBe(rules);
  });

  it('a warden week takes no boss; a trio week needs one', () => {
    const p = base();
    expect(wbAttemptReason(p, MAPS, lookup, W, 1, turns(p), 'kragmor')).toBe('boss');
    expect(wbAttemptReason(p, LIVE, lookup, W, 1, turns(p))).toBe('boss');
    expect(wbAttemptReason(p, LIVE, lookup, W, 1, turns(p), 'nobody' as WbBossId)).toBe('boss');
    expect(wbAttemptReason(p, LIVE, lookup, W, 1, turns(p, 'valdrakk'), 'valdrakk')).toBe('');
    // A list played against another boss does not replay on this one.
    expect(wbAttemptReason(p, LIVE, lookup, W, 1, turns(p, 'valdrakk'), 'kragmor')).not.toBe('');
  });

  it('the shared HP of each boss follows its attempts last week ×400, at least 1500', () => {
    expect(trioSharedHp(rules, 0)).toBe(1500); expect(trioSharedHp(rules, 3)).toBe(1500); expect(trioSharedHp(rules, 40)).toBe(16_000);
    expect(trioSharedHp(rules, 1e9)).toBe(trio.hp.max);
  });
});

describe('P11-05 trio attempts and milestones', () => {
  it('five attempts a week shared by the three bosses; each boss keeps its own tally and pays its own shards', () => {
    const p0 = base(); let p = fight(p0, 'kragmor');
    const w1 = p.worldBoss!.weeks[0]!;
    expect(w1.attempts).toBe(1); expect(Object.keys(w1.bosses)).toEqual(['kragmor']); expect(w1.legacy).toBeUndefined();
    expect(p.bank).toEqual({ ...p0.bank, ore: p0.bank.ore + 4, gold: p0.bank.gold + 2 });
    expect(p.bossShards).toEqual({ kragmor: 3 });
    p = fight(p, 'valdrakk'); // p-2: central shard 1 + 2 Valdrakk shards
    expect(p.bossShards).toEqual({ kragmor: 3, valdrakk: 5 }); expect(p.bank.shard).toBe(p0.bank.shard + 1);
    p = fight(fight(fight(p, 'morvane'), 'kragmor'), 'valdrakk'); // p-4 on Kragmor
    const w = p.worldBoss!.weeks[0]!;
    expect(w.attempts).toBe(5); expect(w.claimed).toEqual(['p-2', 'p-4']);
    expect(Object.fromEntries(WB_BOSSES.map(b => [b, w.bosses[b]!.attempts]))).toEqual({ kragmor: 2, valdrakk: 2, morvane: 1 });
    expect(p.bossShards).toEqual({ kragmor: 9, valdrakk: 8, morvane: 3 }); // 20 = offline 5 attempts (budget.md)
    expect(p.bank.shard).toBe(p0.bank.shard + 2); expect(p.bank.ore).toBe(p0.bank.ore + 20); expect(p.bank.gold).toBe(p0.bank.gold + 10);
    const sum = wbWeekDamage(w); expect(sum.damage).toBe(WB_BOSSES.reduce((n, b) => n + w.bosses[b]!.damage, 0));
    expect(sum.best).toBe(Math.max(...WB_BOSSES.map(b => w.bosses[b]!.best)));
    for (const b of WB_BOSSES) expect(wbAttemptReason(p, LIVE, lookup, W, 6, turns(p, b), b)).toBe('used');
  });

  it('the Morvane coach leads the starter team to a completed, credited attempt', () => {
    const p = { ...newProfile(liveHome, 7), tutorialDone: true, cleared: [liveHome.id] };
    const data = wbEncounter(p, liveHome, lookup, 'morvane')!;
    let state = beginBattle(data).state;
    while (state.outcome === 'active' && state.round <= rules.maxRounds) {
      const lesson = morvaneLesson(state, data);
      expect(lesson).toBeDefined();
      const { heroId, action, targetId, recipientId, cooldownAction, cooldownTargetId } = lesson!;
      state = resolveCommand(state, data, { beat: state.beat, heroId, action, targetId, recipientId, cooldownAction, cooldownTargetId }).state;
    }
    expect(state.round).toBeGreaterThan(rules.maxRounds);
    const result = worldBossAttempt(p, LIVE, lookup, W, 1, state.commands, 'morvane');
    expect(result.event).toMatchObject({ type: 'wbAttempt', boss: 'morvane', attempt: 1 });
    expect(result.profile.worldBoss?.weeks[0]?.bosses.morvane?.damage).toBeGreaterThan(0);
  });

  it('the event names the boss and its shards; a full shard store refuses the attempt whole', () => {
    const p = base(); const r = worldBossAttempt(p, LIVE, lookup, W, 1, turns(p, 'morvane'), 'morvane');
    expect(r.event).toMatchObject({ type: 'wbAttempt', boss: 'morvane', shards: 3, reward: trio.attemptReward, milestones: [] });
    const two = worldBossAttempt(r.profile, LIVE, lookup, W, 2, turns(p, 'kragmor'), 'kragmor');
    expect(two.event).toMatchObject({ boss: 'kragmor', shards: 3, milestones: [{ id: 'p-2', reward: trio.personal[0]!.reward, shards: 2 }] });
    const full = base({ bossShards: { kragmor: trio.shardCap - 2 } });
    expect(wbAttemptReason(full, LIVE, lookup, W, 1, turns(full, 'kragmor'), 'kragmor')).toBe('full');
    expect(wbAttemptReason(full, LIVE, lookup, W, 1, turns(full, 'valdrakk'), 'valdrakk')).toBe('');
  });

  it('shared milestones are per boss, online only (OD-49), for those who fought that boss, once each', () => {
    const p = fight(base(), 'kragmor');
    expect(wbClaimReason(p, LIVE, 'kragmor:s-50', W, W)).toBe('offline');
    expect(wbClaimReason(p, LIVE, 'valdrakk:s-50', W, W, dead('valdrakk'))).toBe('absent');
    expect(wbClaimReason(p, LIVE, 's-50', W, W, dead())).toBe('absent'); // no warden attempt this week
    expect(wbClaimReason(p, LIVE, 'kragmor:s-50', W, W, dead('valdrakk'))).toBe('expired'); // another boss's bar
    expect(wbClaimReason(p, LIVE, 'kragmor:s-50', W, W, dead())).toBe('expired');
    expect(wbClaimReason(p, LIVE, 'kragmor:s-77', W, W, dead('kragmor'))).toBe('unknown');
    expect(wbClaimReason(p, LIVE, 'kragmor:s-100', W, W, { ...dead('kragmor'), left: 1 })).toBe('progress');
    const got = claimWorldBoss(p, LIVE, 'kragmor:s-50', W, W, dead('kragmor'));
    expect(got.event).toEqual({ type: 'wbClaimed', week: W, id: 'kragmor:s-50', reward: trio.shared[0]!.reward, boss: 'kragmor', shards: 2 });
    expect(got.profile.bossShards).toEqual({ kragmor: 5 }); expect(got.profile.bank.gold).toBe(p.bank.gold + 2);
    expect(wbClaimReason(got.profile, LIVE, 'kragmor:s-50', W, W, dead('kragmor'))).toBe('claimed');
    const all = claimWorldBoss(got.profile, LIVE, 'kragmor:s-100', W, W + 1, dead('kragmor')).profile; // last week's, claimed next week
    expect(all.bossShards).toEqual({ kragmor: 8 });
  });

  it('the warden keeps its own rewards and plain ids while the trio is not scheduled', () => {
    const p = base(); const r = worldBossAttempt(p, MAPS, lookup, W, 1, turns(p), undefined);
    expect(r.event).toMatchObject({ type: 'wbAttempt', reward: rules.attemptReward }); expect(r.event).not.toHaveProperty('boss');
    expect(r.profile.worldBoss!.weeks[0]).toMatchObject({ attempts: 1, bosses: {} }); expect(r.profile.worldBoss!.weeks[0]!.legacy!.attempts).toBe(1);
    expect(r.profile.bossShards).toBeUndefined();
    expect(wbClaimReason(r.profile, MAPS, 's-50', W, W, dead())).toBe('');
    expect(wbClaimReason(r.profile, MAPS, 'kragmor:s-50', W, W, dead('kragmor'))).toBe('absent');
  });

  it('the command layer passes `boss` through offline', () => {
    const p = base(); const g: Game = { profile: p, run: null }; const list = turns(p, 'valdrakk');
    const ctx = { ...GAME_CONTEXT, home: liveHome, maps: LIVE, seeds: sequenceSeeds([1]) };
    const out = applyCommand(g, { kind: 'worldBoss', attempt: 1, commands: list, day: D, boss: 'valdrakk' }, ctx);
    expect('rejected' in out).toBe(false);
    if (!('rejected' in out)) expect(out.game.profile).toEqual(worldBossAttempt(p, LIVE, lookup, W, 1, list, 'valdrakk').profile);
    expect(applyCommand(g, { kind: 'worldBoss', attempt: 1, commands: list, day: D, boss: 'nobody' as WbBossId }, ctx)).toEqual({ rejected: 'boss' });
    expect(parseCommand({ kind: 'worldBoss', attempt: 1, commands: [], boss: 'nobody' })).toBeUndefined();
    expect(parseCommand({ kind: 'craftBossItem', boss: 'kragmor', affixes: ['armour', 'regen'], set: 'dawn' })).toBeDefined();
  });
});

describe('P11-05 trio items: crafting', () => {
  const rich = (patch: Partial<Profile> = {}) => base({ bank: { ore: 100, gold: 100, shard: 7, dust: 50 }, bossShards: { kragmor: 45, valdrakk: 40 }, ...patch });
  it('makes the chosen item without a roll, pays 40 shards + 30 ore + 10 dust, and the item is valid, locked and protected', () => {
    const p = rich(); const r = craftBossItem(p, MAPS, 'kragmor', ['armour', 'regen'], 'thorn');
    expect(r.event).toEqual({ type: 'bossCrafted', uid: p.nextItem, boss: 'kragmor' });
    const item = r.profile.items.at(-1)!;
    expect(item).toEqual({ uid: p.nextItem, slot: 'body', rarity: 4, level: 11, affixes: ['hp', 'armour', 'regen'], q: { main: 100, affixes: [100, 100, 100] }, boss: 'bulwark', set: 'thorn', locked: true });
    expect(itemValid(home, item, p.company)).toBe(true); expect(protectedItem(item)).toBe(true);
    expect(r.profile.bossShards).toEqual({ kragmor: 5, valdrakk: 40 }); expect(r.profile.bank).toEqual({ ...p.bank, ore: 70, dust: 40 });
    const v = craftBossItem(r.profile, MAPS, 'valdrakk', ['leech', 'luck']).profile;
    expect(v.items.at(-1)).toMatchObject({ slot: 'gloves', boss: 'breaker', affixes: ['attack', 'leech', 'luck'] }); expect(v.items.at(-1)!.set).toBeUndefined();
    expect(v.bossShards).toEqual({ kragmor: 5 }); // a spent boss leaves the store
    expect(p.items.length).toBe(rich().items.length); // input unchanged
  });
  it('refuses a closed forge, wrong affixes or set, too few shards/ore/dust and a full bag', () => {
    const p = rich();
    expect(bossCraftReason({ ...p, cleared: [MAPS[0]!.id] }, MAPS, 'kragmor', ['armour', 'regen'])).toBe('locked');
    expect(bossCraftReason(p, MAPS, 'kragmor', ['hp', 'regen'])).toBe('affixes'); // the fixed first affix
    expect(bossCraftReason(p, MAPS, 'kragmor', ['speed', 'regen'])).toBe('affixes'); // not on body
    expect(bossCraftReason(p, MAPS, 'kragmor', ['regen', 'regen'])).toBe('affixes');
    expect(bossCraftReason(p, MAPS, 'kragmor', ['regen'])).toBe('affixes');
    expect(bossCraftReason(p, MAPS, 'kragmor', ['armour', 'regen'], 'nope' as 'dawn')).toBe('set');
    expect(bossCraftReason(p, MAPS, 'morvane', ['resist', 'luck'])).toBe('shards');
    expect(bossCraftReason({ ...p, bank: { ...p.bank, ore: 29 } }, MAPS, 'kragmor', ['armour', 'regen'])).toBe('ore');
    expect(bossCraftReason({ ...p, bank: { ...p.bank, dust: 9 } }, MAPS, 'kragmor', ['armour', 'regen'])).toBe('dust');
    const filler = { uid: 0, slot: 'head' as const, rarity: 0, level: 1, affixes: [] };
    expect(bossCraftReason({ ...p, items: Array.from({ length: 200 }, (_, i) => ({ ...filler, uid: i + 1 })) }, MAPS, 'kragmor', ['armour', 'regen'])).toBe('bag');
  });
  it('worn trio items reach the battle as their powers, alongside the charm', () => {
    let p = rich(); p = craftBossItem(p, MAPS, 'kragmor', ['armour', 'regen']).profile; const uid = p.items.at(-1)!.uid;
    p = equip(p, 'guardian', uid).profile;
    expect(gearTotals(home, p.members.guardian!.gear).gear?.trio).toEqual([{ power: 'bulwark', amount: 10, at: 15 }]);
    // A trio power never stands on another slot, and a charm power never on body.
    const item = p.members.guardian!.gear!.body!;
    expect(itemValid(home, { ...item, slot: 'charm', affixes: ['hp', 'support', 'luck'] }, p.company)).toBe(false);
    expect(itemValid(home, { ...item, boss: 'aegis' }, p.company)).toBe(false);
    expect(itemValid(home, { ...item, affixes: ['armour', 'hp', 'regen'] }, p.company)).toBe(false);
    expect(itemValid(home, { ...item, special: 'renewal' }, p.company)).toBe(false);
  });
});

// Resolver fixtures: one fast hero against target dummies (as tests/boss-equipment.test.ts).
function fixture(gear: HeroGear, id = 'tracer', foes: { hp?: number; boss?: boolean; intents?: Omit<IntentDefinition, 'sourceId'>[] }[] = [{}]): EncounterDefinition {
  const hero = { ...veilSiege.heroes.find(h => h.id === id)!, speed: 1000, maxHp: 200, gear };
  const slots = ['f1', 'f2', 'b1', 'b2'] as const;
  return { ...withParty(veilSiege, [hero]),
    enemies: foes.map((f, i) => ({ id: slots[i]!, row: 'front' as const, name: 'Enemy', maxHp: f.hp ?? 10000, speed: 0, color: 0, ...(f.boss ? { boss: true } : {}) })),
    intents: foes.flatMap((f, i) => (f.intents ?? [{ targetSlot: 0, name: 'hit', damage: 20, kind: 'physical' as const }]).map(x => ({ ...x, sourceId: slots[i]! }))) };
}
const bulwark: HeroGear = { trio: [{ power: 'bulwark', amount: 10, at: 15 }] };
const breaker: HeroGear = { trio: [{ power: 'breaker', amount: 6, at: 0 }] };
const reaper: HeroGear = { trio: [{ power: 'reaper', amount: 8, at: 6 }] };
const same = (data: EncounterDefinition, cmd: Command) => { const s = beginBattle(data).state; const r = resolveCommand(s, data, { ...cmd, beat: s.beat }); expect(r).toEqual(previewCommand(s, data, { ...cmd, beat: s.beat })); return r; };
const markCmd: Command = { beat: 0, heroId: 'tracer', action: 'mark', targetId: 'f1' };
const attackCmd: Command = { beat: 0, heroId: 'tracer', action: 'attack', targetId: 'f1' };

describe('P11-05 trio item powers in the resolver (preview equals the result)', () => {
  it('bulwark: a single hit of 15+ HP that leaves the wearer standing gives barrier 10, once a round', () => {
    const r = same(fixture(bulwark, 'tracer', [{}, {}]), markCmd);
    expect(r.turns[1]!.state.heroes[0]).toMatchObject({ hp: 180, barrier: 10, bossUsedRound: 1 });
    expect(r.turns[2]!.state.heroes[0]).toMatchObject({ hp: 170, barrier: 0 }); // the second hit is absorbed by it, no second barrier
    const light = same(fixture(bulwark, 'tracer', [{ intents: [{ targetSlot: 0, name: 'tap', damage: 14, kind: 'physical' }] }]), markCmd);
    expect(light.state.heroes[0]).toMatchObject({ hp: 186, barrier: 0 }); expect(light.state.heroes[0]!.bossUsedRound).toBeUndefined();
    const data = fixture(bulwark); const s = beginBattle(data).state; s.heroes[0]!.hp = 20;
    expect(resolveCommand(s, data, { ...markCmd, beat: s.beat }).state.heroes[0]).toMatchObject({ hp: 0, barrier: 0 });
    // With the warden's aegis charm as well, the heavy hit takes bulwark (one boss power a round).
    const both = same(fixture({ ...bulwark, boss: { power: 'aegis', amount: 6 } }), markCmd);
    expect(both.turns[1]!.state.heroes[0]).toMatchObject({ barrier: 10 });
  });

  it('breaker: +6 on the chosen foe that announces a charge next or was interrupted this round', () => {
    const charge = [{ targetSlot: 0, name: 'gather', damage: 0, kind: 'physical' as const, charge: true }, { targetSlot: 0, name: 'slam', damage: 20, kind: 'physical' as const }];
    const plain = (same(fixture({}, 'tracer', [{ intents: charge }]), attackCmd).turns[0]!.events.find(e => e.type === 'damage') as { amount: number }).amount;
    const raised = same(fixture(breaker, 'tracer', [{ intents: charge }]), attackCmd);
    expect(raised.turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(plain + 6); expect(raised.turns[0]!.state.heroes[0]!.bossUsedRound).toBe(1);
    // No charge ahead and no interruption: no bonus.
    const calm = same(fixture(breaker), attackCmd);
    expect(calm.turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(plain); expect(calm.turns[0]!.state.heroes[0]!.bossUsedRound).toBeUndefined();
    // Interrupted this round (by an earlier turn): the bonus applies.
    const data = fixture(breaker); const s = beginBattle(data).state; s.enemies[0]!.interruptedRound = s.round;
    expect(resolveCommand(s, data, { ...attackCmd, beat: s.beat }).turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(plain + 6);
  });

  it('reaper: downing a foe that is not a boss heals 8; past max HP a barrier of at most 6; never on a boss', () => {
    const two = (boss = false) => fixture(reaper, 'tracer', [{ hp: 5, boss }, {}]);
    const data = two(); const s = beginBattle(data).state; s.heroes[0]!.hp = 100;
    const r = resolveCommand(s, data, { ...attackCmd, beat: s.beat }); expect(r).toEqual(previewCommand(s, data, { ...attackCmd, beat: s.beat }));
    expect(r.turns[0]!.state.heroes[0]).toMatchObject({ hp: 108, barrier: 0, bossUsedRound: 1 });
    const fullHp = same(two(), attackCmd); expect(fullHp.turns[0]!.state.heroes[0]).toMatchObject({ hp: 200, barrier: 6 });
    const nearly = beginBattle(data).state; nearly.heroes[0]!.hp = 197;
    expect(resolveCommand(nearly, data, { ...attackCmd, beat: nearly.beat }).turns[0]!.state.heroes[0]).toMatchObject({ hp: 200, barrier: 5 });
    const boss = same(two(true), attackCmd); expect(boss.turns[0]!.state.heroes[0]).toMatchObject({ hp: 200, barrier: 0 }); expect(boss.turns[0]!.state.heroes[0]!.bossUsedRound).toBeUndefined();
  });
});

describe('P11-05 save v65', () => {
  it('keeps the trio book and boss shards; refuses broken books and shards', () => {
    const p = fight(fight(base(), 'kragmor'), 'morvane'); const game: Game = { profile: p, run: null };
    const raw = currentSave(game); expect(JSON.parse(raw).version).toBe(SAVE_VERSION); expect(SAVE_VERSION).toBe(66);
    // Trio tallies are valid only on rules that schedule the trio for that week.
    expect(() => parseGame(raw, home, lookup, MAPS)).toThrow();
    const back = parseGame(raw, liveHome, lookup, LIVE).profile;
    expect(back.worldBoss).toEqual(p.worldBoss); expect(back.bossShards).toEqual(p.bossShards);
    const w = p.worldBoss!.weeks[0]!;
    const bad = (patch: Partial<Profile>) => () => parseGame(JSON.stringify({ version: SAVE_VERSION, profile: { ...p, ...patch }, run: null }), liveHome, lookup, LIVE);
    expect(bad({ worldBoss: { weeks: [{ ...w, attempts: 3 }] } })).toThrow(); // not the sum of the tallies
    expect(bad({ worldBoss: { weeks: [{ ...w, bosses: { ...w.bosses, nobody: { attempts: 1, damage: 1, best: 1 } } as never, attempts: 3 }] } })).toThrow();
    expect(bad({ worldBoss: { weeks: [{ ...w, claimed: [...w.claimed, 'valdrakk:s-50'] }] } })).toThrow(); // never fought Valdrakk
    expect(bad({ worldBoss: { weeks: [{ ...w, claimed: [...w.claimed, 's-50'] }] } })).toThrow(); // no warden attempt
    expect(bad({ worldBoss: { weeks: [{ ...w, bosses: { ...w.bosses, kragmor: { attempts: 1, damage: 5, best: 6 } } }] } })).toThrow();
    expect(bad({ bossShards: { kragmor: trio.shardCap + 1 } })).toThrow();
    expect(bad({ bossShards: { kragmor: 0 } })).toThrow();
    expect(bad({ bossShards: {} })).toThrow();
    expect(parseGame(JSON.stringify({ version: SAVE_VERSION, profile: { ...p, worldBoss: { weeks: [{ ...w, claimed: [...w.claimed, 'kragmor:s-50'] }] } }, run: null }), liveHome, lookup, LIVE).profile.worldBoss!.weeks[0]!.claimed).toContain('kragmor:s-50');
  });

  it('a v64 week moves to `legacy` with its attempts: no attempt is refilled, milestones stay paid, nothing else changes', () => {
    const v64week = { week: W, attempts: 3, damage: 1500, best: 600, claimed: ['p-2', 's-50'] };
    const p = { ...base(), worldBoss: { weeks: [{ week: W - 1, attempts: 0, damage: 0, best: 0, claimed: [] }, v64week] } } as unknown as Profile;
    const loaded = parseGame(JSON.stringify({ version: 64, profile: p, run: null }), liveHome, lookup, LIVE).profile;
    expect(loaded.worldBoss).toEqual({ weeks: [{ week: W - 1, attempts: 0, bosses: {}, claimed: [] },
      { week: W, attempts: 3, bosses: {}, legacy: { attempts: 3, damage: 1500, best: 600 }, claimed: ['p-2', 's-50'] }] });
    expect(loaded.bank).toEqual(p.bank); expect(loaded.bossShards).toBeUndefined();
    // On the switch week the warden's attempts still count toward the five: two trio attempts are left.
    let q = fight(loaded, 'valdrakk'); expect(q.worldBoss!.weeks.at(-1)!.claimed).toEqual(['p-2', 's-50', 'p-4']);
    q = fight(q, 'valdrakk'); expect(wbAttemptReason(q, LIVE, lookup, W, 6, turns(q, 'kragmor'), 'kragmor')).toBe('used');
    // The warden's own shared reward of that week is claimable only once (already paid), its s-100 with its old reward.
    expect(wbClaimReason(q, LIVE, 's-50', W, W, dead())).toBe('claimed');
    expect(claimWorldBoss(q, LIVE, 's-100', W, W, dead()).event).toMatchObject({ type: 'wbClaimed', id: 's-100', reward: rules.shared[1]!.reward });
    // A broken v64 book stays refused after the move.
    const broken = { ...p, worldBoss: { weeks: [{ ...v64week, damage: 0 }] } };
    expect(() => parseGame(JSON.stringify({ version: 64, profile: broken, run: null }), home, lookup, MAPS)).toThrow();
    const v63 = parseGame(JSON.stringify({ version: 63, profile: base(), run: null }), home, lookup, MAPS).profile;
    expect(v63.worldBoss).toBeUndefined(); expect(v63.bossShards).toBeUndefined();
  });
});

describe('P11-05 weekly budget and a three-boss week simulation', () => {
  it('the trio pays 76 tradeable at most, the 38 cut becomes 35 boss shards, and the P04-06 total is 1195 ≤ 1200', () => {
    const tradeable = rules.attempts * value(trio.attemptReward) + trio.personal.reduce((n, m) => n + value(m.reward), 0)
      + WB_BOSSES.length * trio.shared.reduce((n, m) => n + value(m.reward), 0);
    const warden = rules.attempts * value(rules.attemptReward) + rules.personal.reduce((n, m) => n + value(m.reward), 0) + rules.shared.reduce((n, m) => n + value(m.reward), 0);
    expect(tradeable).toBe(76); expect(warden).toBe(114);
    const shards = rules.attempts * trio.attemptShards + trio.personal.reduce((n, m) => n + m.shards, 0) + WB_BOSSES.length * trio.shared.reduce((n, m) => n + m.shards, 0);
    expect(shards).toBe(35);
    const moved = warden - tradeable; expect(moved).toBe(38);
    const board = gameRules.board.weekly.reduce((n, o) => n + value(o.reward), 0);
    const sweeps = gameRules.sweep.daily * 7 * value(home.sweepReward!.normal);
    expect([board, sweeps]).toEqual([409, 672]);
    expect(board + sweeps + tradeable + moved).toBe(1195); expect(board + sweeps + tradeable + moved).toBeLessThanOrEqual(1200);
  });

  // Plays `weeks` weeks of five attempts from the camp with the advisor, spread over the bosses in `order`; online
  // claims every shared milestone (each boss's bar taken as gone), offline none (OD-49).
  function weeks(order: readonly WbBossId[], online: boolean, n: number): { shards: Partial<Record<WbBossId, number>>; tradeable: number; damage: Record<WbBossId, number>; firstItem?: number } {
    let p = base({ bank: { ore: 0, gold: 0, shard: 0, dust: 0 } }); let firstItem: number | undefined;
    const before = p.bank; const damage = { kragmor: 0, valdrakk: 0, morvane: 0 };
    for (let k = 0; k < n; k++) {
      const week = W + k;
      for (let a = 0; a < rules.attempts; a++) p = fight(p, order[a % order.length]!, week);
      if (online) for (const b of WB_BOSSES) for (const m of trio.shared) {
        const id = `${b}:${m.id}`; if (!wbClaimReason(p, LIVE, id, week, week, dead(b, week))) p = claimWorldBoss(p, LIVE, id, week, week, dead(b, week)).profile;
      }
      const w = p.worldBoss!.weeks.find(x => x.week === week)!; for (const b of WB_BOSSES) damage[b] += w.bosses[b]?.damage ?? 0;
      if (firstItem === undefined && WB_BOSSES.some(b => (p.bossShards?.[b] ?? 0) >= trio.craft.shards)) firstItem = k + 1;
    }
    const tradeable = p.bank.ore - before.ore + 2 * (p.bank.gold - before.gold) + 12 * (p.bank.shard - before.shard);
    return { shards: p.bossShards ?? {}, tradeable, damage, ...(firstItem ? { firstItem } : {}) };
  }

  it('online five attempts over three bosses: 76 tradeable and 35 shards a week; offline 64 and 20; one boss reaches an item in two weeks', () => {
    const spread = weeks(['kragmor', 'valdrakk', 'morvane'], true, 1);
    expect(spread.tradeable).toBe(76); expect(spread.shards).toEqual({ kragmor: 14, valdrakk: 13, morvane: 8 }); // p-2 on Valdrakk, p-4 on Kragmor (budget.md: 35)
    const off = weeks(['kragmor', 'valdrakk', 'morvane'], false, 1);
    expect(off.tradeable).toBe(64); expect(Object.values(off.shards).reduce((a, b) => a + b, 0)).toBe(20);
    const one = weeks(['kragmor'], true, 2);
    expect(one.shards).toEqual({ kragmor: 50 }); expect(one.firstItem).toBe(2); // 25 a week (1.6 weeks)
    const offOne = weeks(['kragmor'], false, 2); expect(offOne.shards).toEqual({ kragmor: 40 }); expect(offOne.firstItem).toBe(2); // 20 a week
    // Every attempt counted and hurt its boss (no attempt is lost to the trio's mechanics).
    for (const b of WB_BOSSES) expect(spread.damage[b]).toBeGreaterThan(0);
  });
});
