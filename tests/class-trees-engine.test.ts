import { describe, expect, it } from 'vitest';
import { beginBattle, enemyIntent, previewCommand, replay, resolveCommand, skillPower, targetOptions, upcomingTurns } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition, HeroDefinition, HeroTalents, TalentCap } from '../src/core/battle/types';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { mercenaries } from '../src/content/heroes/mercenaries';
import { openField } from './fixtures/open-field';

// Release A big trees (docs/design/SKILL_TREES_ALL_TH.md): the duelist, mage, priest, spear and archer skills and
// modifiers in the pure resolver, read from the hero definition like the Knight's (tests/knight-tree-engine.test.ts).
// veilSiege: raider b1 (SPD 110, back row) and brute f1 (SPD 70, front row); heroes Aegis 80, Lyra 120, Eira 100, Seren 60.
type Patch = { actions?: ActionId[]; talents?: HeroTalents; lane?: HeroDefinition['lane'] };
const merc = (id: string) => mercenaries.find(h => h.id === id)!;
function party(heroes: HeroDefinition[], patch: Record<string, Patch>, base: EncounterDefinition = veilSiege): EncounterDefinition {
  return { ...base, heroes: heroes.map(h => { const p = patch[h.id]; return p ? { ...h, ...(p.actions ? { actions: ['attack', ...p.actions] } : {}), ...(p.talents ? { talents: p.talents } : {}), ...(p.lane ? { lane: p.lane } : {}) } : h; }) };
}
const team = (patch: Record<string, Patch>, base?: EncounterDefinition) => party([...veilSiege.heroes], patch, base);
// The four-hero party with a mercenary in the priest's place (slot 3) or the duelist's (slot 1).
const withMerc = (id: string, slot: number, patch: Record<string, Patch>, base?: EncounterDefinition) => { const h = [...veilSiege.heroes]; h[slot] = merc(id); return party(h, patch, base); };
const caps = (c: Partial<Record<TalentCap, number>>): HeroTalents => ({ caps: c });
// A fresh battle moved to this hero's turn (same round, same queue), as in the Knight tree tests.
function turnOf(d: EncounterDefinition, id: string, s: BattleState = beginBattle(d).state): BattleState { const t = structuredClone(s); t.turnIndex = t.order.indexOf(id); return t; }
const cast = (d: EncounterDefinition, s: BattleState, heroId: string, action: ActionId, targetId: string) => {
  const command = { beat: s.beat, heroId, action, targetId }; const r = resolveCommand(s, d, command);
  expect(previewCommand(s, d, command)).toEqual(r); return r;
};
// Plays on (other heroes attack the first foe they can reach) until `id` has acted or the round has ended.
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
const fromEnemy = (d: EncounterDefinition, r: Result, id: string) => playOn(d, r, x => x.turns.some(t => t.actorId === id)).turns.find(t => t.actorId === id);
const hero = (s: BattleState, id: string) => s.heroes.find(h => h.id === id)!;
const foe = (s: BattleState, id: string) => s.enemies.find(e => e.id === id)!;

describe('duelist tree (Lyra)', () => {
  it('parry halves the first physical hit on her and ripostes; it is spent after one hit', () => {
    const d = team({ tracer: { actions: ['parry'] } }); const r = cast(d, turnOf(d, 'tracer'), 'tracer', 'parry', 'tracer');
    // The raider's Raking Slash (12, physical) aims at slot 1, Lyra.
    const t = fromEnemy(d, r, 'b1')!; const hit = t.events.find(e => e.type === 'damage')!;
    expect(hit).toMatchObject({ targetId: 'tracer', amount: 6 });
    expect(t.events.find(e => e.type === 'counter')).toMatchObject({ sourceId: 'tracer', targetId: 'b1', amount: skillPower(d, 'tracer', 'parry') });
    expect(t.state.parry).toBeNull();
  });
  it('parry modifiers: the riposte marks, the all-round parry cuts every hit without a riposte, endless dance readies the strike', () => {
    const mark = team({ tracer: { actions: ['parry'], talents: caps({ parrymark: 0 }) } });
    expect(foe(fromEnemy(mark, cast(mark, turnOf(mark, 'tracer'), 'tracer', 'parry', 'tracer'), 'b1')!.state, 'b1').markedUntil).toBeGreaterThan(1);
    const all = team({ tracer: { actions: ['parry'], talents: caps({ parryall: 40 }) } }); const a = fromEnemy(all, cast(all, turnOf(all, 'tracer'), 'tracer', 'parry', 'tracer'), 'b1')!;
    expect(a.events.find(e => e.type === 'damage')).toMatchObject({ amount: Math.ceil(12 * 0.6) }); expect(a.events.some(e => e.type === 'counter')).toBe(false);
    expect(a.state.parry).toEqual({ heroId: 'tracer', all: true });
    const dance = team({ tracer: { actions: ['parry', 'execute'], talents: caps({ endlessdance: 0 }) } }); const s = turnOf(dance, 'tracer'); hero(s, 'tracer').cooldowns.execute = 3;
    expect(hero(fromEnemy(dance, cast(dance, s, 'tracer', 'parry', 'tracer'), 'b1')!.state, 'tracer').cooldowns.execute).toBe(2);
  });
  it('lunge reaches the screened back row and spends a mark for the marked bonus', () => {
    const d = team({ tracer: { actions: ['lunge'] } }); const s = turnOf(d, 'tracer'); foe(s, 'b1').markedUntil = 3;
    expect(targetOptions(s, d, 'tracer', 'attack').find(t => t.id === 'b1')!.valid).toBe(false);
    const r = cast(d, s, 'tracer', 'lunge', 'b1');
    expect(r.turns[0]!.events.find(e => e.type === 'damage')).toMatchObject({ targetId: 'b1', amount: skillPower(d, 'tracer', 'lunge') + d.rules.markedBonus });
    expect(foe(r.turns[0]!.state, 'b1').markedUntil).toBe(0);
  });
  it('sweep cuts the whole front row (the back row once the front is down)', () => {
    const open = team({ tracer: { actions: ['sweep'] } }, openField(veilSiege));
    expect(cast(open, turnOf(open, 'tracer'), 'tracer', 'sweep', 'enemies').turns[0]!.events.filter(e => e.type === 'damage').map(e => e.targetId).sort()).toEqual(['b1', 'f1']);
    const d = team({ tracer: { actions: ['sweep'] } }); expect(cast(d, turnOf(d, 'tracer'), 'tracer', 'sweep', 'enemies').turns[0]!.events.filter(e => e.type === 'damage').map(e => e.targetId)).toEqual(['f1']);
    const s = turnOf(d, 'tracer'); foe(s, 'f1').hp = 0;
    expect(cast(d, s, 'tracer', 'sweep', 'enemies').turns[0]!.events.find(e => e.type === 'damage')!.targetId).toBe('b1');
  });
  it('shared mark adds to the allies’ hits on a marked foe; deadline raises the finisher threshold', () => {
    const plain = team({}); const shared = team({ tracer: { talents: caps({ sharedmark: 4 }) } });
    const bolt = (d: EncounterDefinition) => { const s = turnOf(d, 'weaver'); foe(s, 'f1').markedUntil = 3; return cast(d, s, 'weaver', 'bolt', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount!; };
    expect(bolt(shared) - bolt(plain)).toBe(4);
    const finish = (t?: HeroTalents) => { const d = team({ tracer: { actions: ['finisher'], ...(t ? { talents: t } : {}) } }); const s = turnOf(d, 'tracer'); foe(s, 'f1').hp = 90; return cast(d, s, 'tracer', 'finisher', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount!; };
    expect(finish()).toBe(16); expect(finish(caps({ deadline: 50 }))).toBe(32);
  });
});

describe('mage tree (Eira)', () => {
  it('arcane storm hits every foe; arcane charge makes each bolt ready the storm sooner', () => {
    const d = team({ weaver: { actions: ['storm', 'bolt'], talents: caps({ arcanecharge: 0 }) } });
    const r = cast(d, turnOf(d, 'weaver'), 'weaver', 'storm', 'enemies');
    expect(r.turns[0]!.events.filter(e => e.type === 'damage').map(e => e.targetId).sort()).toEqual(['b1', 'f1']);
    const s = turnOf(d, 'weaver'); hero(s, 'weaver').cooldowns.storm = 4;
    expect(hero(cast(d, s, 'weaver', 'bolt', 'f1').turns[0]!.state, 'weaver').cooldowns.storm).toBe(3);
  });
  it('crystal aegis shields every standing ally without stacking on a thicker barrier', () => {
    const d = team({ weaver: { actions: ['aegis'] } }); const s = turnOf(d, 'weaver'); hero(s, 'guardian').barrier = 20; hero(s, 'healer').hp = 0;
    const st = cast(d, s, 'weaver', 'aegis', 'party').turns[0]!.state;
    expect(st.heroes.map(h => h.barrier)).toEqual([20, 8, 8, 0]);
  });
  it('dispel switches a veilguard off until the end of the next round', () => {
    const guarded: EncounterDefinition = { ...veilSiege, rules: { ...veilSiege.rules, traits: { thornsPercent: 20, veilguardPercent: 25, enrageBelow: 50, enragePercent: 30 } },
      enemies: veilSiege.enemies.map(e => e.id === 'f1' ? { ...e, traits: ['veilguard'] } : e) };
    const d = team({ weaver: { actions: ['dispel', 'bolt'] } }, guarded); const s = turnOf(d, 'weaver');
    const blunt = cast(d, s, 'weaver', 'bolt', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount!;
    expect(blunt).toBe(Math.ceil(26 * 0.75));
    const r = cast(d, s, 'weaver', 'dispel', 'f1'); expect(foe(r.turns[0]!.state, 'f1').dispelledUntil).toBe(3);
    const after = structuredClone(r.turns[0]!.state); after.turnIndex = after.order.indexOf('weaver'); after.beat = r.turns[0]!.state.beat;
    expect(cast(d, after, 'weaver', 'bolt', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(26);
  });
  it('piercing bolt reaches past the front row from the front lane and hits harder', () => {
    const d = team({ weaver: { lane: 'front', talents: caps({ piercebolt: 4 }) } }); const plain = team({ weaver: { lane: 'front' } });
    expect(targetOptions(turnOf(plain, 'weaver'), plain, 'weaver', 'bolt').find(t => t.id === 'b1')!.valid).toBe(false);
    expect(cast(d, turnOf(d, 'weaver'), 'weaver', 'bolt', 'b1').turns[0]!.events.find(e => e.type === 'damage')).toMatchObject({ targetId: 'b1', amount: 30 });
  });
  it('twin ward shields the most hurt other ally with half the ward', () => {
    const d = team({ weaver: { talents: caps({ twinward: 0 }) } }); const s = turnOf(d, 'weaver'); hero(s, 'healer').hp = 10;
    const st = cast(d, s, 'weaver', 'ward', 'guardian').turns[0]!.state;
    expect(hero(st, 'guardian').barrier).toBe(14); expect(hero(st, 'healer').barrier).toBe(7);
  });
  it('sigil modifiers: the sealed move reflects onto its caster, drags it to the back of the next round, and fate seal shields the mage', () => {
    const d = team({ weaver: { actions: ['sigil'], talents: caps({ sigilreflect: 30, sigilward: 10, fateseal: 10 }) } });
    const r = cast(d, turnOf(d, 'weaver'), 'weaver', 'sigil', 'f1');
    expect(foe(r.turns[0]!.state, 'f1').delayedRound).toBeUndefined(); expect(hero(r.turns[0]!.state, 'weaver').barrier).toBe(10);
    // The brute's Rift Bolt (28) is sealed and strikes it back for 30%.
    const t = fromEnemy(d, r, 'f1')!; expect(t.events.map(e => e.type)).toEqual(['cancel', 'counter']);
    expect(t.events[1]).toMatchObject({ sourceId: 'weaver', targetId: 'f1', amount: Math.floor(28 * 0.3) });
  });
});

describe('priest tree (Seren)', () => {
  it('revive raises an ally who fell in this battle once per battle; the ally acts from the next round', () => {
    const d = team({ healer: { actions: ['revive', 'heal'] } }); const s = turnOf(d, 'healer');
    hero(s, 'tracer').hp = 0; hero(s, 'tracer').fell = true; hero(s, 'weaver').hp = 0;
    const options = targetOptions(s, d, 'healer', 'revive');
    expect(options.find(t => t.id === 'tracer')!.valid).toBe(true); expect(options.find(t => t.id === 'weaver')!.reason).toBe('Only an ally who fell in this battle.');
    expect(options.find(t => t.id === 'guardian')!.reason).toBe('This ally is standing.');
    const r = cast(d, s, 'healer', 'revive', 'tracer'); const st = r.turns[0]!.state;
    expect(hero(st, 'tracer')).toMatchObject({ hp: Math.round(56 * 0.25), revivedRound: 1 }); expect(st.revived).toEqual(['healer']);
    // Seren is last in round 1, so the revived duelist's first turn opens round 2 (she is the fastest).
    expect(r.state.round).toBe(2); expect(r.state.order[0]).toBe('tracer');
    expect(upcomingTurns(r.state, d, 1)[0]!.actorId).toBe('tracer');
    const again = turnOf(d, 'healer', r.state); hero(again, 'tracer').hp = 0; hero(again, 'tracer').fell = true; delete hero(again, 'healer').cooldowns.revive;
    expect(targetOptions(again, d, 'healer', 'revive').find(t => t.id === 'tracer')!.reason).toBe('Revive is used once per battle.');
  });
  it('a hero revived mid-round does not take a turn left in that round', () => {
    const d = team({ healer: { actions: ['revive'] } }); const s = turnOf(d, 'healer');
    // Put Lyra after Seren in this round's frozen order, as if she fell after the order was set.
    s.order = s.order.filter(id => id !== 'tracer'); s.turnIndex = s.order.indexOf('healer'); s.order.splice(s.turnIndex + 1, 0, 'tracer'); hero(s, 'tracer').hp = 0; hero(s, 'tracer').fell = true;
    const r = cast(d, s, 'healer', 'revive', 'tracer');
    expect(r.turns.some(t => t.actorId === 'tracer')).toBe(false); expect(r.state.round).toBe(2);
  });
  it('halo cuts energy hits on the party until her next turn', () => {
    const d = team({ healer: { actions: ['halo'] } }); const s = turnOf(d, 'weaver');
    // Move Seren before the brute: its Rift Bolt (28, energy) at Eira is cut 30%.
    s.order = ['healer', ...s.order.filter(id => id !== 'healer')]; s.turnIndex = 0;
    const t = fromEnemy(d, cast(d, s, 'healer', 'halo', 'healer'), 'f1')!;
    expect(t.events.find(e => e.type === 'damage')).toMatchObject({ targetId: 'weaver', amount: Math.ceil(28 * 0.7) });
  });
  it('renew heals at the next two round starts, capped by max HP', () => {
    const d = team({ healer: { actions: ['bless'] } }); const s = turnOf(d, 'healer');
    hero(s, 'tracer').hp = 20;
    expect(targetOptions(s, d, 'healer', 'bless').find(t => t.id === 'healer')!.valid).toBe(true);
    const r = cast(d, s, 'healer', 'bless', 'tracer');
    expect(hero(r.state, 'tracer').renew).toEqual({ heroId: 'healer', amount: 8, until: 3 });
    expect(r.events.find(e => e.type === 'heal' && e.text === 'Renew.')).toMatchObject({ amount: 8 });
    expect(hero(r.state, 'tracer').empowered).toBeUndefined();
  });
  it('sanctuary and prayer modifiers: a double sanctuary shields; long prayer heals again next round; quick prayer is ready sooner', () => {
    const d = team({ healer: { actions: ['sanctuary'], talents: caps({ sanctuaryward: 8 }) } });
    expect(hero(cast(d, turnOf(d, 'healer'), 'healer', 'sanctuary', 'weaver').turns[0]!.state, 'weaver').barrier).toBe(8);
    const p = team({ healer: { actions: ['prayer'], talents: caps({ longprayer: 0, quickprayer: 0 }) } }); const s = turnOf(p, 'healer'); for (const h of s.heroes) h.hp = 20;
    const r = cast(p, s, 'healer', 'prayer', 'party');
    expect(r.turns[0]!.state.prayerEcho).toEqual({ heroId: 'healer', round: 2, amount: 5 });
    expect(r.events.filter(e => e.text === 'The prayer lingers.')).toHaveLength(4);
    expect(hero(r.turns[0]!.state, 'healer').cooldowns.prayer).toBe(1 + 2);
  });
  it('last prayer heals the others when the first ally falls; dawn opens with a lingering prayer', () => {
    const d = team({ healer: { talents: caps({ lastprayer: 10 }) } }); const s = turnOf(d, 'tracer'); hero(s, 'tracer').hp = 1; hero(s, 'guardian').hp = 30;
    const r = cast(d, s, 'tracer', 'attack', 'f1'); const t = fromEnemy(d, r, 'b1')!;
    expect(t.events.filter(e => e.text === 'Last prayer.').map(e => e.targetId)).toContain('guardian'); expect(r.state.lastPrayer).toBe(true);
    const dawn = team({ healer: { talents: caps({ dawn: 0 }) } }); expect(beginBattle(dawn).initial.prayerEcho).toEqual({ heroId: 'healer', round: 2, amount: 10 });
  });
});

describe('spear tree (Garran)', () => {
  // Party: Aegis, Garran (front), Eira, Seren. Round 1: raider, Eira, Garran, Aegis, brute (Rift Bolt at slot 2, Eira), Seren.
  const spear = (patch: Patch) => withMerc('garran', 1, { garran: patch });
  it('hold counters physical hits on the back lane without redirecting energy hits', () => {
    const base = spear({ actions: ['hold'], talents: { caps: { holdfirm: 20, holdcounter: 0 } } });
    const d = { ...base, intents: base.intents.map(i => ({ ...i, kind: 'physical' as const })), heroes: base.heroes.map(h => ({ ...h, lane: 'back' as const })) };
    const r = cast(d, turnOf(d, 'garran'), 'garran', 'hold', 'garran');
    expect(enemyIntent(r.turns[0]!.state, d, 'f1', 1)!.targetId).toBe('weaver');
    const t = fromEnemy(d, r, 'f1')!;
    expect(t.events.find(e => e.type === 'damage')).toMatchObject({ targetId: 'weaver', amount: Math.ceil(28 * .8) });
    expect(t.events.find(e => e.type === 'counter')).toMatchObject({ sourceId: 'garran', amount: Math.round(skillPower(d, 'garran', 'brace') * 1.5) });
  });
  it('unyielding keeps him at 1 HP once during hold', () => {
    const base = spear({ actions: ['hold'], talents: caps({ unyielding: 0 }) });
    const d = { ...base, intents: base.intents.map(i => ({ ...i, targetSlot: 1 })) };
    const s = turnOf(d, 'garran'); hero(s, 'garran').hp = 5;
    const t = fromEnemy(d, cast(d, s, 'garran', 'hold', 'garran'), 'f1')!;
    expect(hero(t.state, 'garran').hp).toBe(1); expect(t.state.unyielding).toBe(true);
  });
  it('halt gains 50% against a physical next move and preserves the queue', () => {
    const d = spear({ actions: ['halt'] });
    const phys = { ...d, intents: d.intents.map(i => ({ ...i, kind: 'physical' as const })) };
    const s = turnOf(phys, 'garran'); const r = cast(phys, s, 'garran', 'halt', 'f1').turns[0]!;
    expect(r.state.order).toEqual(s.order); expect(r.events.find(e => e.type === 'damage')!.amount).toBe(21);
  });
  it('war cry covers front allies once without empowering attacks', () => {
    const d = spear({ actions: ['warcry'] }); const st = cast(d, turnOf(d, 'garran'), 'garran', 'warcry', 'garran').turns[0]!.state;
    expect(st.warcry).toEqual({ heroId: 'garran', ids: ['guardian', 'garran'] }); expect(hero(st, 'guardian').empowered).toBeUndefined();
  });
  it('deep pierce hits the back row harder; spear fury readies the thrust after each counter', () => {
    const d = spear({ talents: caps({ deeppierce: 30 }) });
    expect(cast(d, turnOf(d, 'garran'), 'garran', 'pierce', 'b1').turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(Math.round(22 * 1.3));
    // A braced spear (set directly) counters the raider's round-2 Raking Slash at Aegis; the counter readies the thrust.
    const f = withMerc('garran', 1, { garran: { talents: caps({ spearfury: 0 }) } }, openField(veilSiege)); const s = turnOf(f, 'guardian');
    s.counter = { heroId: 'garran' }; hero(s, 'garran').cooldowns.pierce = 4;
    const first = cast(f, s, 'guardian', 'attack', 'f1'); const r = cast(f, first.state, 'healer', 'attack', 'f1');
    const t = fromEnemy(f, r, 'b1')!; expect(t.events.find(e => e.type === 'counter')).toMatchObject({ sourceId: 'garran' });
    expect(hero(t.state, 'garran').cooldowns.pierce).toBe(3);
  });
});

describe('archer tree (Mira)', () => {
  // Party: Aegis, Lyra, Mira (back), Seren. Round 1: Lyra, raider, Mira, Aegis, brute, Seren.
  const archer = (patch: Patch, base?: EncounterDefinition) => withMerc('mira', 2, { mira: patch }, base);
  it('disengage delays a pending foe in this round; quickstep also delays next round, no dodge', () => {
    const d = archer({ actions: ['disengage'], talents: caps({ covershot: 6, quickstep: 0 }) }); const s = turnOf(d, 'mira');
    const r = cast(d, s, 'mira', 'disengage', 'f1').turns[0]!;
    expect(r.state.order.at(-1)).toBe('f1'); expect(hero(r.state, 'mira').evading).toBeUndefined();
    expect(foe(r.state, 'f1').delayedRound).toBe(2);
  });
  it('pinning volley hits the front row and lifts its screen to the end of the next round', () => {
    const d = archer({ actions: ['pin'] }); const r = cast(d, turnOf(d, 'mira'), 'mira', 'pin', 'enemies');
    expect(r.turns[0]!.events.filter(e => e.type === 'damage').map(e => e.targetId)).toEqual(['f1']); expect(r.turns[0]!.state.pinned).toBe(2);
    const lyra = turnOf(d, 'tracer', r.turns[0]!.state); expect(targetOptions(lyra, d, 'tracer', 'attack').find(t => t.id === 'b1')!.valid).toBe(true);
    lyra.round = 3; expect(targetOptions(lyra, d, 'tracer', 'attack').find(t => t.id === 'b1')!.valid).toBe(false);
  });
  it('tracking shot fires again at the round’s end on a hindered target', () => {
    const d = archer({ actions: ['track'] }); const s = turnOf(d, 'mira'); foe(s, 'f1').delayedRound = 1;
    const r = playOn(d, cast(d, s, 'mira', 'track', 'f1'), x => x.state.round > 1); expect(r.turns[0]!.state.tracking).toHaveLength(1);
    expect(r.events.find(e => e.text === 'Tracking shot.')).toMatchObject({ sourceId: 'mira', targetId: 'f1', amount: skillPower(d, 'mira', 'track') });
    expect(r.state.tracking).toBeUndefined();
    const plain = turnOf(d, 'mira'); expect(cast(d, plain, 'mira', 'track', 'f1').turns[0]!.state.tracking).toBeUndefined();
  });
  it('a tracking shot that downs the last foe wins at the round’s end', () => {
    const d = archer({ actions: ['track'] }); const s = turnOf(d, 'mira'); foe(s, 'f1').delayedRound = 1; foe(s, 'b1').hp = 0; foe(s, 'f1').hp = skillPower(d, 'mira', 'track') * 2;
    // Mira acts last in the round, so the round ends with her command.
    s.order = ['tracer', 'guardian', 'healer', 'mira']; s.turnIndex = 3;
    const r = cast(d, s, 'mira', 'track', 'f1'); expect(r.state.outcome).toBe('victory');
    expect(r.events.find(e => e.text === 'Tracking shot.')).toBeDefined();
  });
  it('heavy hinder weakens the next move; chase readies the hinder after a kill; the silent hunter delays the fastest foe in round 1', () => {
    const d = archer({ talents: caps({ heavyhinder: 15, chase: 0 }) }); const s = turnOf(d, 'mira');
    const r = cast(d, s, 'mira', 'hinder', 'f1'); expect(foe(r.turns[0]!.state, 'f1')).toMatchObject({ delayedRound: 2, delayedAlso: 3 });
    const t = fromEnemy(d, r, 'f1')!; expect(t.events.find(e => e.type === 'damage')!.amount).toBe(28); expect(foe(t.state, 'f1').weaken).toBeUndefined();
    const k = turnOf(d, 'mira'); foe(k, 'b1').hp = 3; expect(hero(cast(d, k, 'mira', 'hinder', 'b1').turns[0]!.state, 'mira').cooldowns.hinder).toBeUndefined();
    const hunter = archer({ talents: caps({ stalker: 0 }) }); const b = beginBattle(hunter).initial;
    expect(foe(b, 'b1').delayedRound).toBe(1); expect(b.order[b.order.length - 1]).toBe('b1');
  });
});

describe('release A trees: determinism', () => {
  it('replays a battle of tree skills exactly', () => {
    const d = withMerc('mira', 3, { tracer: { actions: ['parry', 'lunge', 'sweep'] }, weaver: { actions: ['storm', 'aegis', 'bolt'] }, mira: { actions: ['pin', 'track', 'hinder'] }, guardian: { actions: ['guard', 'bash'] } });
    let s = beginBattle(d).state; const plan: Record<string, [ActionId, string][]> = {
      tracer: [['parry', 'tracer'], ['lunge', 'b1'], ['attack', 'f1']], weaver: [['storm', 'enemies'], ['aegis', 'party'], ['bolt', 'f1']], mira: [['pin', 'enemies'], ['hinder', 'f1'], ['track', 'f1']], guardian: [['bash', 'f1'], ['attack', 'f1'], ['attack', 'f1']] };
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
