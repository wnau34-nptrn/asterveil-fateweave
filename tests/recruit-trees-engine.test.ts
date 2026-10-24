import { describe, expect, it } from 'vitest';
import { CATALYST_PER_ROUND, DISARM_MULTIPLIER, DREAD_FINALE, GUARD_STONE_HEAL, SOLO_TIMES, beginBattle, enemyIntent, previewCommand, replay, resolveCommand, skillPower, songPower, targetOptions } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition, HeroDefinition, HeroTalents, TalentCap } from '../src/core/battle/types';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { mercenaries } from '../src/content/heroes/mercenaries';
import { openField } from './fixtures/open-field';

// Recruit big trees (owner 2026-10-23, docs/design/SKILL_TREES_ALL_TH.md): the alchemist, scout, warden and bard skills
// and modifiers in the pure resolver, read from the hero definition like the release A trees (tests/class-trees-engine.test.ts).
// veilSiege: raider b1 (SPD 110, back row: Raking Slash 12 slot 1, Raking Slash 12 slot 0, Shadow Knife 14 slot 3) and
// brute f1 (SPD 70, front row: Rift Bolt 28 slot 2, Crushing Blow 26 slot 1, Rift Bolt 28 slot 2).
type Patch = { actions?: ActionId[]; talents?: HeroTalents; lane?: HeroDefinition['lane'] };
const merc = (id: string) => mercenaries.find(h => h.id === id)!;
function withMerc(id: string, slot: number, patch: Record<string, Patch>, base: EncounterDefinition = veilSiege): EncounterDefinition {
  const heroes = [...veilSiege.heroes]; heroes[slot] = merc(id);
  return { ...base, heroes: heroes.map(h => { const p = patch[h.id]; return p ? { ...h, ...(p.actions ? { actions: ['attack', ...p.actions] } : {}), ...(p.talents ? { talents: p.talents } : {}), ...(p.lane ? { lane: p.lane } : {}) } : h; }) };
}
const caps = (c: Partial<Record<TalentCap, number>>): HeroTalents => ({ caps: c });
function turnOf(d: EncounterDefinition, id: string, s: BattleState = beginBattle(d).state): BattleState { const t = structuredClone(s); t.turnIndex = t.order.indexOf(id); return t; }
const cast = (d: EncounterDefinition, s: BattleState, heroId: string, action: ActionId, targetId: string) => {
  const command = { beat: s.beat, heroId, action, targetId }; const r = resolveCommand(s, d, command);
  expect(previewCommand(s, d, command)).toEqual(r); return r;
};
type Result = ReturnType<typeof cast>;
function playOn(d: EncounterDefinition, r: Result, done: (r: Result) => boolean): Result {
  const all = { ...r, turns: [...r.turns], events: [...r.events] };
  for (let i = 0; i < 12 && !done(all) && all.state.outcome === 'active'; i++) {
    const s = all.state; const id = s.order[s.turnIndex]!;
    const next = cast(d, s, id, 'attack', targetOptions(s, d, id, 'attack').find(o => o.valid)!.id);
    all.turns.push(...next.turns); all.events.push(...next.events); all.state = next.state;
  }
  return all;
}
const fromEnemy = (d: EncounterDefinition, r: Result, id: string) => playOn(d, r, x => x.turns.some(t => t.actorId === id)).turns.find(t => t.actorId === id)!;
const taken = (t: Result['turns'][number]) => { const e = t.events.find(x => x.type === 'damage')!; return { target: e.targetId, amount: e.amount! + e.absorbed! }; };
const hero = (s: BattleState, id: string) => s.heroes.find(h => h.id === id)!;
const foe = (s: BattleState, id: string) => s.enemies.find(e => e.id === id)!;

describe('alchemist tree (Toma)', () => {
  it('smoke cuts the target’s next move whatever its kind; poison smoke corrodes; wide smoke covers the row for less', () => {
    const d = withMerc('toma', 3, { toma: { actions: ['smoke'] } });
    const r = cast(d, turnOf(d, 'toma'), 'toma', 'smoke', 'f1'); expect(foe(r.state, 'f1').weaken).toBe(40);
    // The brute's Rift Bolt (28, energy) at Eira.
    expect(taken(fromEnemy(d, r, 'f1'))).toEqual({ target: 'weaver', amount: Math.ceil(28 * 0.6) });
    const poison = withMerc('toma', 3, { toma: { actions: ['smoke'], talents: caps({ smokepoison: 0 }) } });
    expect(foe(cast(poison, turnOf(poison, 'toma'), 'toma', 'smoke', 'f1').state, 'f1').corrodedUntil).toBeGreaterThan(1);
    const wide = withMerc('toma', 3, { toma: { actions: ['smoke'], talents: caps({ smokewide: 25 }) } }, openField(veilSiege));
    const w = cast(wide, turnOf(wide, 'toma'), 'toma', 'smoke', 'f1').state;
    expect([foe(w, 'f1').weaken, foe(w, 'b1').weaken]).toEqual([25, 25]);
  });
  it('fury tonic raises the ally’s hits and leaves them exposed until the end of the next round', () => {
    const d = withMerc('toma', 3, { toma: { actions: ['fury'] } });
    const r = cast(d, turnOf(d, 'toma'), 'toma', 'fury', 'weaver');
    expect(hero(r.state, 'weaver')).toMatchObject({ empowered: { percent: 25, round: 2 }, exposed: { percent: 10, round: 2 } });
    expect(taken(fromEnemy(d, r, 'f1'))).toEqual({ target: 'weaver', amount: Math.ceil(28 * 1.1) });
  });
  it('catalyst bursts the corrosion left and spends it; a plain target takes the catalyst alone', () => {
    const d = withMerc('toma', 3, { toma: { actions: ['catalyst'] } }); const s = turnOf(d, 'toma');
    Object.assign(foe(s, 'f1'), { corrodedUntil: 3, corrodeBonus: 6 });
    const r = cast(d, s, 'toma', 'catalyst', 'f1');
    expect(r.turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(skillPower(d, 'toma', 'catalyst') + 2 * CATALYST_PER_ROUND + 6);
    expect(foe(r.state, 'f1').corrodedUntil).toBeUndefined();
    expect(cast(d, turnOf(d, 'toma'), 'toma', 'catalyst', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(skillPower(d, 'toma', 'catalyst'));
  });
  it('chain reaction passes the corrosion of a fallen foe on; the mobile lab hastes the slowest ally in round 1', () => {
    const d = withMerc('toma', 3, { toma: { talents: caps({ chainreaction: 0 }) } }); const s = turnOf(d, 'tracer');
    Object.assign(foe(s, 'f1'), { hp: 1, corrodedUntil: 3, corrodeBonus: 9 });
    const r = cast(d, s, 'tracer', 'attack', 'f1').turns[0]!;
    expect(foe(r.state, 'b1')).toMatchObject({ corrodedUntil: 3, corrodeBonus: 9 }); expect(r.events.some(e => e.text === 'Chain reaction.')).toBe(true);
    const lab = withMerc('toma', 3, { toma: { talents: caps({ mobilelab: 0 }) } });
    expect(beginBattle(lab).initial.order[0]).toBe('guardian');
  });
});

describe('scout tree (Sefa)', () => {
  it('throwing knives hit the screened back row; twin knives cut the front row by half; quick knives are ready sooner', () => {
    const d = withMerc('sefa', 1, { sefa: { actions: ['knives'] } }); const r = cast(d, turnOf(d, 'sefa'), 'sefa', 'knives', 'enemies').turns[0]!;
    expect(r.events.filter(e => e.type === 'damage').map(e => [e.targetId, e.amount])).toEqual([['b1', skillPower(d, 'sefa', 'knives')]]);
    const twin = withMerc('sefa', 1, { sefa: { actions: ['knives'], talents: caps({ twinknives: 0 }) } });
    expect(cast(twin, turnOf(twin, 'sefa'), 'sefa', 'knives', 'enemies').turns[0]!.events.find(e => e.targetId === 'f1')!.amount).toBe(Math.floor(skillPower(twin, 'sefa', 'knives') / 2));
    const quick = withMerc('sefa', 1, { sefa: { actions: ['knives'], talents: caps({ quickknives: 0 }) } }); const q = turnOf(quick, 'sefa');
    expect(hero(cast(quick, q, 'sefa', 'knives', 'enemies').state, 'sefa').cooldowns.knives).toBe(q.round + 2);
  });
  it('shadow cover grants another ally a dodge and preserves the enemy target', () => {
    const d = withMerc('sefa', 1, { sefa: { actions: ['decoy'] } }); const s = turnOf(d, 'sefa');
    expect(targetOptions(s, d, 'sefa', 'decoy').find(o => o.id === 'sefa')!.valid).toBe(false);
    const r = cast(d, s, 'sefa', 'decoy', 'weaver');
    expect(enemyIntent(r.state, d, 'f1', 1)!.targetId).toBe('weaver');
    const t = fromEnemy(d, r, 'f1'); expect(t.events.some(e => e.type === 'dodge' && e.targetId === 'weaver')).toBe(true);
    expect(hero(t.state, 'weaver').evading).toBeUndefined();
  });
  it('disarm gains damage before the target acts when it aims at an ally, with no weaken', () => {
    const d = withMerc('sefa', 1, { sefa: { actions: ['disarm'], lane: 'back' } });
    const r = cast(d, turnOf(d, 'sefa'), 'sefa', 'disarm', 'b1');
    expect(r.turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(Math.round(skillPower(d, 'sefa', 'disarm') * DISARM_MULTIPLIER));
    expect(foe(r.turns[0]!.state, 'b1').weaken).toBeUndefined();
  });
  it('a backstab that downs a foe readies the ambush (silent end); the opportunist hits foes yet to act harder', () => {
    const d = withMerc('sefa', 1, { sefa: { actions: ['backstab', 'ambush'], talents: caps({ silentend: 0 }) } }); const s = turnOf(d, 'sefa');
    hero(s, 'sefa').cooldowns.ambush = 3; foe(s, 'f1').hp = 1;
    expect(hero(cast(d, s, 'sefa', 'backstab', 'f1').state, 'sefa').cooldowns.ambush).toBeUndefined();
    const opp = withMerc('sefa', 1, { sefa: { talents: caps({ opportunist: 4 }) } });
    // Sefa (SPD 115) acts before the brute this round.
    expect(cast(opp, turnOf(opp, 'sefa'), 'sefa', 'attack', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(merc('sefa').attack + 4);
  });
});

describe('warden tree (Brann)', () => {
  it('stone armour shields him with a share of his max HP', () => {
    const d = withMerc('brann', 0, { brann: { actions: ['stonearmor'] } });
    expect(hero(cast(d, turnOf(d, 'brann'), 'brann', 'stonearmor', 'brann').state, 'brann').barrier).toBe(Math.round(merc('brann').maxHp * 0.2));
  });
  it('a guardian stone softens the ally’s first hit and heals him; a twin stone covers the most hurt ally too; a thick stone cuts more', () => {
    const d = withMerc('brann', 0, { brann: { actions: ['guardstone'] } }); const s = turnOf(d, 'brann'); hero(s, 'brann').hp = 50;
    expect(targetOptions(s, d, 'brann', 'guardstone').find(o => o.id === 'brann')!.valid).toBe(false);
    const r = cast(d, s, 'brann', 'guardstone', 'tracer');
    // Round 2: the brute's Crushing Blow (26, physical) at Lyra.
    const t = fromEnemy(d, playOn(d, r, x => x.state.round === 2), 'f1');
    expect(taken(t)).toEqual({ target: 'brann', amount: Math.ceil(26 * 0.6) });
    expect(t.events.find(e => e.text === 'Guardian stone.')).toMatchObject({ targetId: 'brann', amount: GUARD_STONE_HEAL });
    const twin = withMerc('brann', 0, { brann: { actions: ['guardstone'], talents: caps({ twinstone: 25 }) } }); const w = turnOf(twin, 'brann'); hero(w, 'weaver').hp = 10;
    expect(cast(twin, w, 'brann', 'guardstone', 'tracer').state.stone).toEqual({ heroId: 'brann', ids: ['tracer', 'weaver'], percent: 25, round: 1 });
    const thick = withMerc('brann', 0, { brann: { actions: ['guardstone'], talents: caps({ thickstone: 55 }) } });
    expect(cast(thick, turnOf(thick, 'brann'), 'brann', 'guardstone', 'tracer').state.stone!.percent).toBe(55);
  });
  it('tremor hits the front row and weakens its next move', () => {
    const d = withMerc('brann', 0, { brann: { actions: ['tremor'] } }); const r = cast(d, turnOf(d, 'brann'), 'brann', 'tremor', 'enemies').turns[0]!;
    expect(r.events.filter(e => e.type === 'damage').map(e => e.targetId)).toEqual(['f1']); expect(foe(r.state, 'f1').drawnBy).toMatchObject({ heroId: 'brann' }); expect(foe(r.state, 'f1').weaken).toBeUndefined();
  });
  it('a rune quake carries the slam to the foe behind; the sky hammer delays a foe that aims at him', () => {
    const d = withMerc('brann', 0, { brann: { talents: caps({ runequake: 0 }) } });
    const r = cast(d, turnOf(d, 'brann'), 'brann', 'slam', 'f1').turns[0]!;
    expect(r.events.find(e => e.type === 'damage' && e.targetId === 'b1')!.amount).toBe(Math.floor(skillPower(d, 'brann', 'slam') / 2));
    const sky = withMerc('brann', 0, { brann: { actions: ['quake'], talents: caps({ skyhammer: 4 }) } }); const s = turnOf(sky, 'brann');
    s.taunt = { heroId: 'brann', round: s.round };
    hero(s, 'brann').hp = 40; const q = cast(sky, s, 'brann', 'quake', 'enemies'); expect(q.turns[0]!.events.find(e => e.type === 'heal')).toMatchObject({ targetId: 'brann', amount: 4 }); expect(foe(q.state, 'f1').delayedRound).toBeUndefined();
  });
});

describe('bard tree (Lio)', () => {
  it('the song of dread cuts every enemy move while it plays', () => {
    const d = withMerc('lio', 3, { lio: { actions: ['dread'] } });
    const r = cast(d, turnOf(d, 'lio'), 'lio', 'dread', 'lio'); expect(r.state.song).toMatchObject({ heroId: 'lio', action: 'dread' });
    expect(taken(fromEnemy(d, r, 'f1'))).toEqual({ target: 'weaver', amount: Math.ceil(28 * (1 - songPower(d, 'lio', 'dread') / 100)) });
  });
  it('a finale of dread weakens every foe; an encore plays the song again once; each new song shields the party (life rhythm)', () => {
    const d = withMerc('lio', 3, { lio: { actions: ['dread', 'finale'], talents: caps({ encore: 0, liferhythm: 5 }) } });
    let s = turnOf(d, 'lio'); s.song = { heroId: 'lio', action: 'dread' };
    const r = cast(d, s, 'lio', 'finale', 'lio');
    expect(r.turns[0]!.events.filter(e => e.type === 'barrier')).toHaveLength(4); expect(hero(r.turns[0]!.state, 'weaver').barrier).toBe(DREAD_FINALE);
    expect(r.state.song).toMatchObject({ heroId: 'lio', action: 'dread' }); expect(r.state.encored).toEqual(['lio']);
    s = turnOf(d, 'lio', r.state); s.round = r.state.round; hero(s, 'lio').cooldowns = {};
    expect(cast(d, s, 'lio', 'finale', 'lio').state.song).toBeNull();
    const shield = cast(d, turnOf(d, 'lio'), 'lio', 'dread', 'lio').state;
    expect(shield.heroes.filter(h => h.hp > 0).every(h => h.barrier === 5)).toBe(true);
  });
  it('a sharp note strikes; a spell note weakens the target; a twin note carries to the foe of its row', () => {
    const d = withMerc('lio', 3, { lio: { actions: ['note'], talents: caps({ songnote: 20 }) } });
    const r = cast(d, turnOf(d, 'lio'), 'lio', 'note', 'b1').turns[0]!;
    expect(r.events.find(e => e.type === 'damage')!.amount).toBe(skillPower(d, 'lio', 'note')); expect(foe(r.state, 'b1').weaken).toBeUndefined();
    const twin = withMerc('lio', 3, { lio: { actions: ['note'], talents: caps({ twinnote: 70 }) } }, openField(veilSiege));
    expect(cast(twin, turnOf(twin, 'lio'), 'lio', 'note', 'f1').turns[0]!.events.find(e => e.targetId === 'b1')!.amount).toBe(Math.floor(skillPower(twin, 'lio', 'note') * 0.7));
  });
  it('a solo gives one ally the song of valor three times over; it needs a song of valor or mending', () => {
    const d = withMerc('lio', 3, { lio: { actions: ['valor', 'solo'] } }); const s = turnOf(d, 'lio');
    expect(targetOptions(s, d, 'lio', 'solo').every(o => !o.valid)).toBe(true);
    s.song = { heroId: 'lio', action: 'valor' };
    const r = cast(d, s, 'lio', 'solo', 'tracer'); expect(hero(r.state, 'tracer').solo).toEqual({ heroId: 'lio', round: 2 });
    const t = turnOf(d, 'tracer', r.state); t.round = r.state.round;
    const hit = cast(d, t, 'tracer', 'attack', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount;
    expect(hit).toBe(veilSiege.heroes[1]!.attack + songPower(d, 'lio', 'valor') * SOLO_TIMES);
  });
});

describe('recruit trees: determinism', () => {
  it('replays a battle of recruit tree skills exactly', () => {
    const heroes = [merc('brann'), merc('sefa'), merc('toma'), merc('lio')];
    const d: EncounterDefinition = { ...veilSiege, heroes: heroes.map(h => ({ ...h, actions: ['attack', ...({ brann: ['guardstone', 'tremor', 'stonearmor'], sefa: ['knives', 'decoy', 'disarm'], toma: ['smoke', 'fury', 'catalyst', 'acid'], lio: ['dread', 'note', 'solo', 'valor'] } as Record<string, ActionId[]>)[h.id]!] })) };
    let s = beginBattle(d).state; const plan: Record<string, [ActionId, string][]> = {
      brann: [['guardstone', 'toma'], ['tremor', 'enemies'], ['stonearmor', 'brann']], sefa: [['decoy', 'lio'], ['knives', 'enemies'], ['disarm', 'f1']],
      toma: [['acid', 'f1'], ['smoke', 'b1'], ['catalyst', 'f1'], ['fury', 'sefa']], lio: [['valor', 'lio'], ['solo', 'sefa'], ['note', 'b1'], ['dread', 'lio']] };
    const used: Record<string, number> = {};
    for (let i = 0; i < 40 && s.outcome === 'active'; i++) {
      const id = s.order[s.turnIndex]!; const list = plan[id]!; const n = used[id] ?? 0;
      const valid = (a: ActionId, t: string) => targetOptions(s, d, id, a).some(o => o.id === t && o.valid);
      const [action, target] = n < list.length && valid(...list[n]!) ? list[n]! : ['attack', targetOptions(s, d, id, 'attack').find(o => o.valid)!.id] as [ActionId, string];
      used[id] = n + 1; s = cast(d, s, id, action, target).state;
    }
    expect(replay(d, s.commands)).toEqual(s);
  });
});
