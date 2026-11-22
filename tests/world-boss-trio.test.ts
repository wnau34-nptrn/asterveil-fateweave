import { describe, expect, it } from 'vitest';
import { encounterById, encounters, WORLD_BOSS_HP, LAKE_STANDINS } from '../src/content/encounters/catalog';
import { WORLD_BOSS_TRIO, wbKragmor, wbMorvane, wbValdrakk } from '../src/content/encounters/world-boss-trio';
import { rosterP03 } from '../src/content/heroes/roster-p03';
import { gameRules } from '../src/content/world/rules';
import {
  courtPercent, createBattle, currentHeroId, encounterProblems, enemyIntent, interruptBlock, lockedMove, nextIntentOf, plannedIntents,
  postponeReason, previewCommand, replay, resolveCommand, roundOrder, targetOptions,
} from '../src/core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition, Resolution } from '../src/core/battle/types';
import { wbTurns } from './fixtures/world-boss';

// P11-05 step 1 (docs/design/WORLD_BOSS_TRIO_P11_05_TH.md §1.4): R1 breakable charge (Valdrakk), R2 court + summon
// (Morvane) and the three v1 encounters.
const foe = (s: BattleState, id: string) => s.enemies.find(e => e.id === id)!;
const command = (s: BattleState, heroId: string, action: ActionId, targetId: string): Command => ({ beat: s.beat, heroId, action, targetId });
// One hero turn: a plain attack on the first legal foe that is not the boss (the boss when nothing else stands).
function attack(s: BattleState, d: EncounterDefinition): Resolution {
  const hero = currentHeroId(s, d)!; const options = targetOptions(s, d, hero, 'attack').filter(t => t.valid);
  return resolveCommand(s, d, command(s, hero, 'attack', (options.find(t => t.id !== 'f1') ?? options[0]!).id));
}
// Plays attacks until `ready` holds on a hero turn; every resolved turn is collected.
function until(s: BattleState, d: EncounterDefinition, ready: (s: BattleState) => boolean, log: Resolution['turns'] = []): BattleState {
  for (let i = 0; !ready(s); i++) { if (i > 80 || s.outcome !== 'active') throw new Error('never ready'); const r = attack(s, d); log.push(...r.turns); s = r.state; }
  return s;
}
const bossTurn = (log: Resolution['turns'], round: number) => log.find(t => t.actorId === 'f1' && t.round === round)!;
const chargeNext = (heroId: string) => (s: BattleState) => currentHeroId(s, wbValdrakk) === heroId && !!nextIntentOf(s, wbValdrakk, 'f1')?.charge;

describe('World Boss trio v1 content', () => {
  it('three valid encounters with the World Boss HP that existing encounters do not share', () => {
    expect(WORLD_BOSS_TRIO.map(d => [d.id, d.version])).toEqual([['wb-kragmor', 1], ['wb-valdrakk', 2], ['wb-morvane', 2]]);
    for (const d of WORLD_BOSS_TRIO) {
      expect(encounterProblems(d)).toEqual([]);
      expect(d.enemies.find(e => e.boss)!.maxHp).toBe(WORLD_BOSS_HP);
      expect(encounterById(d.id)).toBe(d); expect(encounters.some(e => e.id === d.id)).toBe(false); // catalog lookup only (design §8 step 2)
    }
    expect(wbValdrakk.intents.filter(i => i.breakable).every(i => i.charge)).toBe(true);
    expect(wbMorvane.enemies.find(e => e.id === 'f1')!.court).toEqual({ percent: 10, by: ['f2', 'f3', 'b2'] });
  });
  it('no existing encounter uses the new fields, so their rules are unchanged without a version bump', () => {
    // Map 4's serpent uses a breakable charge in a new encounter (version 1), so no older rule changed.
    for (const d of encounters.filter(e => !WORLD_BOSS_TRIO.includes(e) && !LAKE_STANDINS.has(e.id))) {
      expect(d.intents.some(i => i.breakable || i.summon)).toBe(false);
      expect(d.enemies.some(e => e.court)).toBe(false);
    }
  });
  it('content checks reject a court or summon that names a missing foe or the boss itself', () => {
    const bad: EncounterDefinition = { ...wbMorvane, enemies: wbMorvane.enemies.map(e => e.id === 'f1' ? { ...e, court: { percent: 10, by: ['b3', 'f1'] } } : e),
      intents: wbMorvane.intents.map(i => i.summon ? { ...i, summon: ['b1'] } : i) };
    expect(encounterProblems(bad)).toEqual(expect.arrayContaining(['wb-morvane: f1 court b3', 'wb-morvane: f1 court f1', 'wb-morvane: f1 summons b1']));
  });
  it('every attempt replays to the same state and forecasts the move it then uses', () => {
    for (const d of WORLD_BOSS_TRIO) for (const style of ['advisor', 'attack'] as const) {
      const commands = wbTurns(d, gameRules.worldBoss.maxRounds, style);
      let s = createBattle(d);
      for (const c of commands) {
        const forecast = plannedIntents(s, d, 1)[0];
        const preview = previewCommand(s, d, c); const result = resolveCommand(s, d, c);
        expect(preview).toEqual(result);
        const first = result.turns.find(t => t.side === 'enemy');
        const pick = (i: typeof forecast) => i && { name: i.name, damage: i.damage, special: i.special, court: i.court, staggeredMove: i.staggeredMove };
        if (first && forecast && first.actorId === forecast.sourceId && first.round === forecast.round) expect(pick(first.intent!)).toEqual(pick(forecast));
        s = result.state;
      }
      expect(replay(d, commands)).toEqual(s);
      expect(s.enemies.find(e => e.id === 'f1')!.hp).toBeGreaterThan(0); // the boss never falls inside an attempt
    }
  });
});

describe('R1 breakable charge (Valdrakk)', () => {
  const d = wbValdrakk;
  it('a Bash that cancels the wing charge staggers the dive: no damage in forecast or result, then the cycle goes on', () => {
    const s = until(createBattle(d), d, chargeNext('guardian'));
    const charge = nextIntentOf(s, d, 'f1')!; expect(charge).toMatchObject({ name: 'Wing Gathering', breakable: true });
    const log: Resolution['turns'] = [];
    const bashed = resolveCommand(s, d, command(s, 'guardian', 'bash', 'f1')); log.push(...bashed.turns);
    let t = bashed.state;
    expect(bashed.events.map(e => e.type)).toContain('interrupt');
    t = until(t, d, () => !!bossTurn(log, charge.round), log);
    const cancelled = bossTurn(log, charge.round);
    expect(cancelled.events.map(e => e.type)).toEqual(['cancel']);
    expect(foe(cancelled.state, 'f1').staggerRound).toBe(charge.round + 1);
    const staggered = enemyIntent(cancelled.state, d, 'f1', charge.round + 1)!;
    expect(staggered).toMatchObject({ name: 'Staggered', damage: 0, special: 'stagger', staggeredMove: 'Worldshard Dive' });
    expect(lockedMove(staggered)).toBe(true);
    // A hero turn with the stagger next: it is not a big move, so a Seer could not delay it.
    t = until(t, d, x => !!currentHeroId(x, d) && nextIntentOf(x, d, 'f1')?.special === 'stagger', log);
    expect(postponeReason(t, d, 'f1')).not.toBe('');
    t = until(t, d, x => x.round > charge.round + 1, log);
    const turn = bossTurn(log, charge.round + 1);
    expect(turn.intent).toMatchObject({ special: 'stagger' });
    expect(turn.events.map(e => e.type)).toEqual(['stagger']);
    expect(foe(t, 'f1').staggerRound).toBeUndefined();
    expect(enemyIntent(t, d, 'f1', charge.round + 2)).toMatchObject({ name: 'Shard Talon', damage: 28 });
  });
  it('an unanswered charge lets the dive strike every standing hero', () => {
    const log: Resolution['turns'] = [];
    const s = until(createBattle(d), d, chargeNext('guardian'));
    const round = nextIntentOf(s, d, 'f1')!.round + 1;
    until(s, d, x => x.round > round, log);
    const dive = bossTurn(log, round);
    expect(dive.intent).toMatchObject({ name: 'Worldshard Dive', all: true, damage: 20 });
    const hit = new Set(dive.events.filter(e => e.type === 'damage' && e.sourceId === 'f1').map(e => e.targetId));
    const downed = dive.events.filter(e => e.type === 'down' && hit.has(e.targetId)).length;
    expect(hit.size).toBe(dive.state.heroes.filter(h => h.hp > 0).length + downed);
  });
  it('a steadfast boss shrugs off the Bash; the dive still lands', () => {
    const s = until(createBattle(d), d, chargeNext('guardian'));
    const charge = nextIntentOf(s, d, 'f1')!; foe(s, 'f1').steadyRound = charge.round;
    expect(interruptBlock(s, d, 'f1', charge)).toBe('steadfast');
    const bashed = resolveCommand(s, d, command(s, 'guardian', 'bash', 'f1'));
    expect(bashed.events.map(e => e.type)).toContain('resist');
    const log: Resolution['turns'] = [...bashed.turns];
    until(bashed.state, d, x => x.round > charge.round + 1, log);
    expect(foe(bashed.state, 'f1').staggerRound).toBeUndefined();
    expect(bossTurn(log, charge.round + 1).intent).toMatchObject({ name: 'Worldshard Dive' });
  });
  it('a Seer delay moves the charge and dive on; a Bash on the delayed charge still staggers the dive', () => {
    const astrid = rosterP03.find(h => h.id === 'astrid')!;
    const seer: EncounterDefinition = { ...d, heroes: [...d.heroes.slice(0, 4), { ...astrid, lane: 'back' as const }] };
    let s = until(createBattle(seer), seer, x => currentHeroId(x, seer) === 'astrid' && !!nextIntentOf(x, seer, 'f1')?.charge);
    const first = nextIntentOf(s, seer, 'f1')!;
    expect(postponeReason(s, seer, 'f1')).toBe('');
    s = resolveCommand(s, seer, command(s, 'astrid', 'turncycle', 'f1')).state;
    expect(enemyIntent(s, seer, 'f1', first.round)).toMatchObject({ name: 'Shard Talon', delayedMove: 'Wing Gathering' });
    s = until(s, seer, x => currentHeroId(x, seer) === 'guardian' && !!nextIntentOf(x, seer, 'f1')?.charge);
    const charge = nextIntentOf(s, seer, 'f1')!; expect(charge.round).toBe(first.round + 1);
    const log: Resolution['turns'] = [];
    const bashed = resolveCommand(s, seer, command(s, 'guardian', 'bash', 'f1')); log.push(...bashed.turns);
    until(bashed.state, seer, x => x.round > charge.round + 1, log);
    expect(bossTurn(log, charge.round + 1).intent).toMatchObject({ special: 'stagger', staggeredMove: 'Worldshard Dive' });
  });
});

describe('R2 court and summon (Morvane)', () => {
  const d = wbMorvane;
  it('each standing court foe raises the monarch\'s moves by 10% (×1.0/1.1/1.2/1.3), forecast included', () => {
    const s = createBattle(d); const rend = (st: BattleState) => enemyIntent(st, d, 'f1', 1)!;
    expect(rend(s)).toMatchObject({ name: 'Six-Hand Rend', damage: Math.ceil(24 * 1.3), court: 30 });
    foe(s, 'f2').hp = 0; expect(courtPercent(s, d, 'f1')).toBe(20); expect(rend(s)).toMatchObject({ damage: Math.ceil(24 * 1.2), court: 20 });
    foe(s, 'b2').hp = 0; expect(rend(s)).toMatchObject({ damage: Math.ceil(24 * 1.1), court: 10 });
    foe(s, 'f3').hp = 0; expect(rend(s).damage).toBe(24); expect(rend(s).court).toBeUndefined();
    // Only the monarch has a court; its minions' moves stay as they are.
    expect(courtPercent(createBattle(d), d, 'f2')).toBe(0);
  });
  it('the court bonus is the damage that lands', () => {
    const log: Resolution['turns'] = [];
    until(createBattle(d), d, x => x.round > 1, log);
    const turn = bossTurn(log, 1); const hit = turn.events.find(e => e.type === 'damage' && e.sourceId === 'f1')!;
    const court = turn.intent!.court ?? 0; expect([10, 20, 30]).toContain(court);
    expect(turn.intent!.damage).toBe(Math.ceil(24 * (100 + court) / 100));
    expect((hit.amount ?? 0) + (hit.absorbed ?? 0)).toBe(turn.intent!.damage);
  });
  it('Call the Court brings the fallen court back at full HP with no statuses; they act from the next round', () => {
    let s = createBattle(d);
    s = until(s, d, x => nextIntentOf(x, d, 'f1')?.name === 'Call the Court' && !!currentHeroId(x, d));
    const call = nextIntentOf(s, d, 'f1')!; expect(lockedMove(call)).toBe(true);
    Object.assign(foe(s, 'f2'), { hp: 0, markedUntil: 9, corrodedUntil: 9, venom: { heroId: 'tracer', stacks: 2, until: 9 } });
    foe(s, 'b2').hp = 0;
    const log: Resolution['turns'] = [];
    s = until(s, d, x => x.round > call.round || bossTurn(log, call.round) !== undefined, log);
    const turn = bossTurn(log, call.round);
    expect(turn.events.map(e => [e.type, e.targetId])).toEqual([['summon', 'f2'], ['summon', 'b2']]);
    expect(turn.events.some(e => e.type === 'damage')).toBe(false);
    const max = (id: string) => d.enemies.find(e => e.id === id)!.maxHp;
    expect(foe(turn.state, 'f2')).toEqual({ id: 'f2', hp: max('f2'), markedUntil: 0, summonedRound: call.round });
    expect(foe(turn.state, 'b2').hp).toBe(max('b2'));
    // They do not act in the round they return.
    const rest = until(s, d, x => x.round > call.round, log);
    expect(log.filter(t => t.round === call.round && t.beat > turn.beat && (t.actorId === 'f2' || t.actorId === 'b2'))).toEqual([]);
    expect(roundOrder(rest, d)).toEqual(expect.arrayContaining(['f2', 'b2']));
  });
  it('a sealed call brings nobody back', () => {
    const s = until(createBattle(d), d, x => nextIntentOf(x, d, 'f1')?.name === 'Call the Court' && !!currentHeroId(x, d));
    foe(s, 'f2').hp = 0; foe(s, 'f1').interruptedRound = nextIntentOf(s, d, 'f1')!.round;
    const log: Resolution['turns'] = [];
    until(s, d, () => log.some(t => t.actorId === 'f1'), log);
    expect(log.find(t => t.actorId === 'f1')!.events.map(e => e.type)).toEqual(['cancel']);
  });
  it('a full field leaves a summoned foe waiting; it never replaces anyone', () => {
    const wisp = d.enemies.find(e => e.id === 'b2')!;
    const crowd: EncounterDefinition = { ...d,
      enemies: [...d.enemies, { ...wisp, id: 'b1' }, { ...wisp, id: 'b3', reserve: true }],
      intents: [...d.intents.filter(i => i.sourceId === 'b2').flatMap(i => [{ ...i, sourceId: 'b1' }, { ...i, sourceId: 'b3' }]),
        ...d.intents.map(i => i.summon ? { ...i, summon: ['f3', 'b3'] as const } : i)] };
    // Real content keeps a boss to four escorts with nobody behind it (owner 2026-11-20); the resolver still guards a full field.
    expect(encounterProblems(crowd)).toEqual([`${d.id}: 5 escorts`, `${d.id}: a foe in the boss's line`]);
    let s = createBattle(crowd); expect(s.enemies.filter(e => e.hp > 0).length).toBe(5);
    s = until(s, crowd, x => nextIntentOf(x, crowd, 'f1')?.name === 'Call the Court' && !!currentHeroId(x, crowd));
    for (const e of s.enemies) if (e.id !== 'f1' && !e.absent) e.hp = crowd.enemies.find(x => x.id === e.id)!.maxHp;
    foe(s, 'f3').hp = 0;
    const log: Resolution['turns'] = [];
    until(s, crowd, () => log.some(t => t.actorId === 'f1'), log);
    const turn = log.find(t => t.actorId === 'f1')!;
    expect(turn.events.map(e => [e.type, e.targetId])).toEqual([['summon', 'f3']]);
    expect(foe(turn.state, 'b3')).toMatchObject({ hp: 0, absent: true });
  });
});

describe('Kragmor uses existing rules only', () => {
  it('veilguard boss, a charge before its unstoppable fall, a whole-party quake', () => {
    const boss = wbKragmor.enemies.find(e => e.boss)!;
    expect(boss.traits).toEqual(['veilguard']);
    const moves = wbKragmor.intents.filter(i => i.sourceId === 'f1' && !i.phase);
    expect(moves.map(m => m.name)).toEqual(['Stone Fist', 'Titan Gathering', 'Mountain Fall', 'Rift Quake', 'Boulder Hurl', 'Stone Fist']);
    expect(moves[2]).toMatchObject({ unstoppable: true, damage: 50 }); expect(moves[3]).toMatchObject({ all: true });
    expect(wbKragmor.intents.some(i => i.breakable || i.summon)).toBe(false);
  });
});
