import { describe, expect, it } from 'vitest';
import { guardCounterPower, ambushBonus, corrodeBonus, createBattle, currentHeroId, guardReductionOf, nextIntentOf, resolveCommand, skillPower, tauntReductionOf, withParty } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../src/core/battle/types';
import { veilSiege as siegeBase } from '../src/content/encounters/veil-siege';
import { openField } from './fixtures/open-field';
const veilSiege = openField(siegeBase);
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { heroDef, newExpedition, starred } from '../src/core/world/world';
import { learnTalent, newProfile, resetTalents, settle, talentReason, talentsValid } from '../src/core/world/profile';
import { parseGame, saveGame, loadGame } from '../src/core/save/expedition-save';
import type { Talents } from '../src/core/world/types';

// Passive talent trees (docs/EXPEDITION_DESIGN.md "Talent tree"). Members are built like the world builds
// them (`starred` with talents) at ★1 and level 1, so the only difference is the talents.
const member = (id: string, talents: Talents = {}, stars = 1) => starred(heroDef(lookup, map, id)!, stars, map, 1, talents);
const party = (members: [string, Talents?][], base: EncounterDefinition = veilSiege) => withParty(base, members.map(([id, t]) => member(id, t)));
const act = (s: BattleState, d: EncounterDefinition, action: ActionId, targetId: string) =>
  resolveCommand(s, d, { beat: s.beat, heroId: currentHeroId(s, d)!, action, targetId });
function until(s: BattleState, d: EncounterDefinition, id: string): BattleState {
  for (let i = 0; i < 40 && currentHeroId(s, d) !== id; i++) s = act(s, d, 'attack', s.enemies.find(e => e.hp > 0)!.id).state;
  expect(currentHeroId(s, d)).toBe(id);
  return s;
}
const set = (s: BattleState, id: string, patch: object): BattleState =>
  ({ ...s, heroes: s.heroes.map(h => h.id === id ? { ...h, ...patch } : h), enemies: s.enemies.map(e => e.id === id ? { ...e, ...patch } : e) });
// Resolves `first`, then plain attacks, until `enemyId` takes its turn; returns that turn.
function enemyTurn(s: BattleState, d: EncounterDefinition, first: [ActionId, string], enemyId: string) {
  let r = act(s, d, ...first);
  for (let i = 0; i < 12; i++) {
    const turn = r.turns.find(t => t.actorId === enemyId); if (turn) return { first: r, turn };
    r = act(r.state, d, 'attack', 'f1');
  }
  throw new Error('enemy never acted');
}
const hero = (s: BattleState, id: string) => s.heroes.find(h => h.id === id)!;
const foe = (s: BattleState, id: string) => s.enemies.find(e => e.id === id)!;
const dealt = (r: ReturnType<typeof act>, target: string) => r.turns[0]!.events.find(e => e.type === 'damage' && e.targetId === target)!.amount!;
const rest: [string, Talents?][] = [['tracer'], ['weaver'], ['healer']];
const full = (a: boolean): Talents => a ? { root: 1, a1: 2, a2: 2, a3: 1 } : { root: 1, b1: 2, b2: 2, b3: 1 };
// The Knight (A6) and the release A classes (duelist, mage, priest, spear, archer) have big trees
// (tests/knight-tree.test.ts, tests/class-trees.test.ts); the other four keep the small tree until release B.
const ids = ['toma', 'sefa', 'brann', 'lio'];

describe('talent trees: content and stats', () => {
  it('every class has the same 7-node shape (11 ranks)', () => {
    for (const id of ids) {
      const tree = map.talents[id]!;
      expect(tree.map(n => `${n.id}${n.max}`)).toEqual(['root1', 'a12', 'a22', 'a31', 'b12', 'b22', 'b31']);
    }
  });
  it('no talents leaves the definition unchanged; stat nodes scale max HP, Attack and skill power', () => {
    for (const id of ids) expect(member(id)).toEqual(heroDef(lookup, map, id));
    const base = heroDef(lookup, map, 'garran')!;
    const t = member('garran', { a1: 2, b1: 2 });
    expect(t.maxHp).toBe(Math.round(base.maxHp * 1.10)); expect(t.attack).toBe(Math.round(base.attack * 1.08));
    // Stats design (2026-10-17): Attack % feeds damaging skills (damageBonus), not Support.
    expect(member('weaver', { c1: 2 })).toMatchObject({ damageBonus: 8, skillBonus: 0 });
    // Talents add to stars and levels.
    expect(starred(base, 2, map, 3, { a1: 1 }).maxHp).toBe(Math.round(base.maxHp * (100 + 8 + 6 + 5) / 100));
  });
  it('flat skill nodes add to skill power', () => {
    const d = party([['guardian'], ['garran', { b1: 1, a1: 1, a2k: 1 }], ['weaver'], ['healer']]);
    // b1 (+4% Attack) also raises Piercing Thrust now that damaging skills scale with Attack; a2k adds a flat 6 to brace.
    expect(skillPower(d, 'garran', 'pierce')).toBe(Math.round(skillPower(party([['guardian'], ['garran'], ['weaver'], ['healer']]), 'garran', 'pierce') * 1.04));
    expect(skillPower(d, 'garran', 'brace')).toBe(Math.round(14 * 1.04) + 6);
  });
});

describe('talent points, gates and reset (lobby)', () => {
  const leveled = (level: number) => { const p = newProfile(map, 3); p.members.sefa = { stars: 1, dupes: 0, level, exp: 0 }; return p; };
  it('one point per level above 1; the root comes first; tier 2 needs tier 1; the capstone needs 4 in its branch', () => {
    let p = leveled(1);
    expect(talentReason(p, map, 'sefa', 'root')).toBe('points');
    p = leveled(10);
    expect(talentReason(p, map, 'sefa', 'a1')).toBe('locked');
    p = learnTalent(p, map, 'sefa', 'root').profile;
    expect(talentReason(p, map, 'sefa', 'root')).toBe('max');
    expect(talentReason(p, map, 'sefa', 'a2')).toBe('locked');
    for (const n of ['a1', 'a1', 'a2'] as const) p = learnTalent(p, map, 'sefa', n).profile;
    expect(talentReason(p, map, 'sefa', 'a3')).toBe('locked');
    p = learnTalent(p, map, 'sefa', 'a2').profile;
    expect(talentReason(p, map, 'sefa', 'a3')).toBe('');
    for (const n of ['a3', 'b1', 'b1', 'b2'] as const) p = learnTalent(p, map, 'sefa', n).profile;
    // 9 points spent at level 10: nothing more, the tree cannot be completed.
    expect(p.members.sefa!.talents).toEqual({ root: 1, a1: 2, a2: 2, a3: 1, b1: 2, b2: 1 });
    expect(talentReason(p, map, 'sefa', 'b2')).toBe('points');
    const reset = resetTalents(p, 'sefa');
    expect(reset.event.type).toBe('talent'); expect(reset.profile.members.sefa!.talents).toBeUndefined();
    expect(resetTalents(reset.profile, 'sefa').event.type).toBe('blocked');
  });
  it('talents stay in the profile after an expedition and travel with the member', () => {
    let p = learnTalent(leveled(3), map, 'sefa', 'root').profile;
    p = learnTalent(p, map, 'sefa', 'b1').profile;
    const run = newExpedition(map, lookup, 1, { roster: p.party, members: structuredClone(p.members) });
    expect(run.members.sefa!.talents).toEqual({ root: 1, b1: 1 });
    run.members.sefa = { ...run.members.sefa!, level: 4, exp: 2 };
    expect(settle(p, run, 'wiped', map).members.sefa).toEqual({ stars: 1, dupes: 0, level: 4, exp: 2, talents: { root: 1, b1: 1 } });
  });
  it.each([
    ['too many points', 2, { root: 1, a1: 1 }],
    ['a rank above the max', 5, { root: 2 }],
    ['a node without the root', 5, { a1: 1 }],
    ['tier 2 without tier 1', 5, { root: 1, a2: 1 }],
    ['a capstone too early', 6, { root: 1, a1: 2, a2: 1, a3: 1 }],
    ['an unknown node', 5, { root: 1, c1: 1 } as Talents],
  ])('rejects %s', (_, level, t) => expect(talentsValid(map, 'sefa', level, t)).toBe(false));
});

describe('save v8', () => {
  const memory = () => { const v = new Map<string, string>(); return { getItem: (k: string) => v.get(k) ?? null, setItem: (k: string, x: string) => { v.set(k, x); } }; };
  it('round-trips talents and loads v7 data unchanged', () => {
    const profile = newProfile(map, 4); profile.members.tracer = { stars: 1, dupes: 0, level: 3, exp: 0, talents: { a1: 1, b1: 1 } };
    const run = newExpedition(map, lookup, 2, { roster: profile.party, members: structuredClone(profile.members) });
    const store = memory(); saveGame(store, { profile, run });
    const back = loadGame(store, map, lookup)!;
    expect(back.profile.members.tracer!.talents).toEqual({ a1: 1, b1: 1 });
    expect(back.run!.hp.tracer).toBe(starred(heroDef(lookup, map, 'tracer')!, 1, map, 3, { a1: 1, b1: 1 }).maxHp);
    const v7 = JSON.stringify({ version: 7, profile: newProfile(map, 4), run: null });
    expect(parseGame(v7, map, lookup).profile.members.tracer).toEqual({ stars: 1, dupes: 0 });
  });
  it('rejects invalid talents', () => {
    const profile = newProfile(map, 4); profile.members.tracer = { stars: 1, dupes: 0, talents: { a1: 1 } };
    expect(() => parseGame(JSON.stringify({ version: 37, profile, run: null }), map, lookup)).toThrow();
  });
});

describe('knight talents (Aegis)', () => {
  it('retribution: a bash that stops a physical move hits harder', () => {
    const plain = party([['guardian'], ...rest]); const t = party([['guardian', { b1: 2, b3r: 1 }], ...rest]);
    const s = until(createBattle(plain), plain, 'guardian'); const target = s.enemies.find(e => nextIntentOf(s, plain, e.id)?.kind === 'physical')!.id;
    const st = until(createBattle(t), t, 'guardian');
    // The skill's own growth (Attack % and the flat node) plus the retribution bonus.
    expect(dealt(act(st, t, 'bash', target), target)).toBe(dealt(act(s, plain, 'bash', target), target) + skillPower(t, 'guardian', 'bash') - skillPower(plain, 'guardian', 'bash') + 8);
  });
  it('guard reduces more and counters the attacker', () => {
    const d = party([['guardian', { a2i: 1, b4: 1 }], ...rest]);
    expect(guardReductionOf(d, 'guardian')).toBe(0.75);
    const s = until(createBattle(d), d, 'guardian'); const intent = s.intent!;
    const r = act(s, d, 'guard', intent.targetId);
    const turn = r.turns.find(x => x.actorId === intent.sourceId)!;
    expect(turn.events.find(e => e.type === 'damage')).toMatchObject({ targetId: 'guardian' });
    expect(turn.events.find(e => e.type === 'damage')!.amount! + turn.events.find(e => e.type === 'damage')!.absorbed!).toBe(Math.ceil(intent.damage * 0.25));
    expect(turn.events.find(e => e.type === 'counter')).toMatchObject({ sourceId: 'guardian', targetId: intent.sourceId, amount: guardCounterPower(d, 'guardian') });
  });
});

describe('duelist tree modifiers (Lyra)', () => {
  it('deep mark: her hits on a marked enemy gain 6', () => {
    const plain = party([['guardian'], ['tracer']]); const t = party([['guardian'], ['tracer', { a1: 2, a2d: 1 }]]);
    const mark = (s: BattleState) => set(s, 'f1', { markedUntil: s.round + 2 });
    const a = dealt(act(mark(until(createBattle(plain), plain, 'tracer')), plain, 'attack', 'f1'), 'f1');
    const b = dealt(act(mark(until(createBattle(t), t, 'tracer')), t, 'attack', 'f1'), 'f1');
    expect(b - a).toBe(Math.round(16 * 1.08) - 16 + 6);
  });
  it('a precision strike on a marked enemy heals her; relentless readies it after a kill', () => {
    const d = party([['guardian'], ['tracer', { b1: 1, b3d: 1 }]]);
    let s = until(createBattle(d), d, 'tracer'); s = set(set(s, 'tracer', { hp: 20 }), 'f1', { markedUntil: s.round + 2 });
    expect(hero(act(s, d, 'execute', 'f1').turns[0]!.state, 'tracer').hp).toBe(26);
    const r = party([['guardian'], ['tracer', { b1: 1, b3r: 1 }]]);
    const low = set(until(createBattle(r), r, 'tracer'), 'b1', { hp: 5 });
    expect(hero(act(low, r, 'execute', 'b1').turns[0]!.state, 'tracer').cooldowns.execute).toBeUndefined();
    expect(hero(act(low, r, 'execute', 'f1').turns[0]!.state, 'tracer').cooldowns.execute).toBeDefined();
  });
});

describe('mage tree modifiers (Eira)', () => {
  it('split bolt hits the other enemy for half', () => {
    const d = party([['guardian'], ['tracer'], ['weaver', { a1: 1, a2s: 1 }]]);
    const r = act(until(createBattle(d), d, 'weaver'), d, 'bolt', 'f1');
    expect(dealt(r, 'b1')).toBe(Math.floor(skillPower(d, 'weaver', 'bolt') / 2));
    expect(skillPower(d, 'weaver', 'bolt')).toBe(26);
  });
  it('a reflecting ward strikes back the first hit it absorbs', () => {
    const d = party([['guardian'], ['tracer'], ['weaver', { b1: 1, b2r: 1 }], ['healer']]);
    expect(skillPower(d, 'weaver', 'ward')).toBe(14);
    const s = until(createBattle(d), d, 'weaver'); const intent = s.intent!;
    const { turn } = enemyTurn(s, d, ['ward', intent.targetId], intent.sourceId);
    expect(turn.events.find(e => e.type === 'counter')).toMatchObject({ sourceId: 'weaver', targetId: intent.sourceId, amount: 6 });
  });
});

describe('priest tree modifiers (Seren)', () => {
  it('twin heal restores the most hurt other ally for half', () => {
    const d = party([['guardian'], ['tracer'], ['weaver'], ['healer', { a1: 2, a2t: 1 }]]);
    expect(skillPower(d, 'healer', 'heal')).toBe(Math.round(20 * 1.08));
    let s = until(createBattle(d), d, 'healer'); s = set(set(s, 'guardian', { hp: 20 }), 'tracer', { hp: 10 });
    const heals = act(s, d, 'heal', 'guardian').turns[0]!.events.filter(e => e.type === 'heal');
    expect(heals.map(e => [e.targetId, e.amount])).toEqual([['guardian', skillPower(d, 'healer', 'heal')], ['tracer', Math.floor(skillPower(d, 'healer', 'heal') / 2)]]);
  });
  it('heal adds a small barrier; solace on a sanctuary softens the target’s hits', () => {
    const b = party([['guardian'], ['tracer'], ['weaver'], ['healer', { a1: 1, a2b: 1 }]]);
    let s = until(createBattle(b), b, 'healer'); s = set(s, 'tracer', { hp: 10 });
    expect(hero(act(s, b, 'heal', 'tracer').turns[0]!.state, 'tracer').barrier).toBe(4);
    const d = party([['guardian'], ['tracer'], ['weaver'], ['healer', { b1s: 1, b2s: 1 }]]);
    s = until(createBattle(d), d, 'healer'); const target = nextIntentOf(s, d, 'b1')!.targetId;
    const { first: r, turn } = enemyTurn(s, d, ['sanctuary', target], 'b1');
    expect(r.turns[0]!.state.solace).toEqual({ heroId: 'healer', targetId: target });
    const hit = turn.events.find(e => e.type === 'damage')!; expect(hit.targetId).toBe(target);
    expect(hit.amount! + hit.absorbed!).toBe(Math.ceil(turn.intent!.damage * 0.85));
  });
});

describe('spear tree modifiers (Garran)', () => {
  it('piercing line hits the foe behind the target for half', () => {
    const d = party([['garran', { b1: 1, b2l: 1 }], ...rest]);
    const r = act(until(createBattle(d), d, 'garran'), d, 'pierce', 'f1');
    expect(dealt(r, 'b1')).toBe(Math.floor(skillPower(d, 'garran', 'pierce') / 2));
  });
  it('a braced front wall softens physical hits on the front lane', () => {
    const d = party([['garran', { a1: 1, a2f: 1 }], ...rest]);
    let s = act(until(createBattle(d), d, 'garran'), d, 'brace', 'garran').state; let hit;
    for (let i = 0; i < 12 && !hit; i++) {
      const r = act(s, d, 'attack', 'f1');
      for (const t of r.turns) { const e = t.events.find(x => x.type === 'damage' && t.side === 'enemy' && t.intent?.kind === 'physical'); if (e && !hit) hit = { e, damage: t.intent!.damage, counter: t.events.find(x => x.type === 'counter') }; }
      s = r.state;
    }
    expect(hit!.e.amount! + hit!.e.absorbed!).toBe(Math.ceil(hit!.damage * 0.9));
    expect(hit!.counter?.amount).toBe(14);
  });
});

describe('archer tree modifiers (Mira)', () => {
  it('hunter: her hits on a hindered enemy gain 6', () => {
    const plain = party([['mira'], ...rest]); const t = party([['mira', { a1: 1, a2h: 1 }], ...rest]);
    const hinder = (s: BattleState) => set(s, 'f1', { delayedRound: s.round });
    const a = dealt(act(hinder(until(createBattle(plain), plain, 'mira')), plain, 'attack', 'f1'), 'f1');
    const b = dealt(act(hinder(until(createBattle(t), t, 'mira')), t, 'attack', 'f1'), 'f1');
    expect(b - a).toBe(Math.round(13 * 1.04) - 13 + 6);
  });
  it('a heavier volley is stronger; a hindering volley delays the fastest standing enemy', () => {
    expect(skillPower(party([['mira', { b1: 1, b2t: 1 }], ...rest]), 'mira', 'volley')).toBe(Math.round(10 * 1.03) + 4);
    const d = party([['mira', { b1: 1, b2h: 1 }], ...rest]);
    const s = until(createBattle(d), d, 'mira'); const r = act(s, d, 'volley', 'enemies').turns[0]!;
    expect(foe(r.state, 'b1').delayedRound).toBe(s.round + 1); expect(foe(r.state, 'f1').delayedRound).toBeUndefined();
  });
});

describe('alchemist talents (Toma)', () => {
  it('stronger corrosion spreads to every enemy', () => {
    const d = party([['toma', full(true)], ...rest]);
    const s = until(createBattle(d), d, 'toma'); const r = act(s, d, 'acid', 'f1').turns[0]!;
    for (const id of ['f1', 'b1']) expect(corrodeBonus(r.state, d, id)).toBe(d.rules.corrodeBonus + 4);
    expect(r.events.find(e => e.type === 'damage' && e.targetId === 'b1')).toBeUndefined();
  });
  it('haste heals the ally and is ready sooner', () => {
    const d = party([['toma', full(false)], ...rest]);
    const s = set(until(createBattle(d), d, 'toma'), 'tracer', { hp: 10 }); const r = act(s, d, 'haste', 'tracer').turns[0]!.state;
    expect(hero(r, 'tracer').hp).toBe(18); expect(hero(r, 'toma').cooldowns.haste).toBe(s.round + 2);
  });
});

describe('scout talents (Sefa)', () => {
  it('a stronger ambush leaves her in shadow step', () => {
    const d = party([['guardian'], ['sefa', full(true)], ['weaver'], ['healer']]);
    const s = until(createBattle(d), d, 'sefa');
    expect(ambushBonus(s, d, 'f1', 'sefa')).toBe(s.order.indexOf('f1') > s.turnIndex ? d.rules.ambushBonus + 8 : 0);
    expect(hero(act(s, d, 'ambush', 'f1').turns[0]!.state, 'sefa').evading).toBe(true);
  });
  it('a doubled shadow step dodges twice and each dodge heals her', () => {
    const d = party([['guardian'], ['sefa', full(false)], ['weaver'], ['healer']]);
    const s = set(until(createBattle(d), d, 'sefa'), 'sefa', { hp: 30 });
    const r = act(s, d, 'evade', 'sefa');
    expect(hero(r.turns[0]!.state, 'sefa').evadeExtra).toBe(1);
    const turn = r.turns.find(t => t.actorId === 'b1')!;
    expect(turn.events.map(e => e.type)).toEqual(['dodge', 'heal']);
    expect(hero(turn.state, 'sefa')).toMatchObject({ hp: 36, evading: true });
  });
});

describe('warden talents (Brann)', () => {
  it('a challenged warden hammers back every hit', () => {
    const d = party([['brann', full(true)], ...rest]);
    expect(skillPower(d, 'brann', 'slam')).toBe(Math.round(18 * 1.08) + 8);
    let s = act(until(createBattle(d), d, 'brann'), d, 'taunt', 'brann').state; const counters: number[] = [];
    for (let i = 0; i < 12 && currentHeroId(s, d) !== 'brann'; i++) {
      const r = act(s, d, 'attack', 'f1');
      for (const t of r.turns) if (t.side === 'enemy') counters.push(...t.events.filter(e => e.type === 'counter' && e.sourceId === 'brann').map(e => e.amount!));
      s = r.state;
    }
    expect(counters.length).toBeGreaterThan(0); expect(counters.every(a => a === 6)).toBe(true);
  });
  it('a tougher challenge reduces more; below half HP he recovers at his turn', () => {
    const d = party([['brann', full(false)], ...rest]);
    expect(tauntReductionOf(d, 'brann')).toBe(0.45);
    let s = until(createBattle(d), d, 'brann'); s = set(s, 'brann', { hp: 30 });
    const events = []; for (let i = 0; i < 12; i++) { const r = act(s, d, currentHeroId(s, d) === 'brann' ? 'taunt' : 'attack', currentHeroId(s, d) === 'brann' ? 'brann' : 'f1'); events.push(...r.events); s = r.state; if (events.some(e => e.text === 'Stone regen.')) break; }
    expect(events.find(e => e.text === 'Stone regen.')).toMatchObject({ targetId: 'brann', amount: 6 });
  });
});

describe('bard talents (Lio)', () => {
  it('chorus: while valor plays every enemy hit is 2 lower', () => {
    const d = party([['lio', full(true)], ...rest]);
    expect(skillPower(d, 'lio', 'valor')).toBe(Math.round(4 * 1.04) + 2);
    expect(member('lio', full(true)).attack).toBe(Math.round(9 * 1.14));
    let s = act(until(createBattle(d), d, 'lio'), d, 'valor', 'lio').state; let hit;
    for (let i = 0; i < 6 && !hit; i++) { const r = act(s, d, 'attack', 'f1'); for (const t of r.turns) if (t.side === 'enemy' && !hit) hit = { e: t.events.find(e => e.type === 'damage'), damage: t.intent!.damage }; s = r.state; }
    expect(hit!.e!.amount! + hit!.e!.absorbed!).toBe(hit!.damage - 2);
  });
  it('overture: the battle opens with the song of mending', () => {
    const d = party([['lio', full(false)], ...rest]);
    expect(createBattle(d).song).toEqual({ heroId: 'lio', action: 'mend' });
    expect(skillPower(d, 'lio', 'mend')).toBe(Math.round(5 * 1.04) + 4);
    expect(createBattle(party([['lio'], ...rest])).song).toBeNull();
  });
});

describe('talent text', () => {
  it('skill descriptions show the hero’s talent numbers and capstones', async () => {
    const { skillDescription } = await import('../src/ui/th');
    const d = party([['guardian', { a2i: 1, b4: 1 }], ...rest]);
    expect(skillDescription('guard', 'guardian', d)).toContain('75%');
    expect(skillDescription('guard', 'guardian', d)).toContain('ความถนัด: ทุกครั้งที่รับการโจมตีแทน โต้กลับผู้โจมตี 8');
    expect(skillDescription('guard', 'guardian', party([['guardian'], ...rest]))).not.toContain('ความถนัด');
  });
});
