import { describe, expect, it } from 'vitest';
import { guardCounterPower, ambushBonus, corrodeBonus, createBattle, currentHeroId, guardReductionOf, nextIntentOf, resolveCommand, skillPower, tauntReductionOf, withParty } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../src/core/battle/types';
import { veilSiege as siegeBase } from '../src/content/encounters/veil-siege';
import { openField } from './fixtures/open-field';
const veilSiege = openField(siegeBase);
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { heroDef, newExpedition, starred } from '../src/core/world/world';
import { isBigTree } from '../src/core/world/talents';
import { learnTalent, newProfile, resetTalents, settle, talentReason, talentsValid } from '../src/core/world/profile';
import { parseGame, saveGame, loadGame } from '../src/core/save/expedition-save';
import type { Talents } from '../src/core/world/types';
import { xpAt } from './fixtures/camp-level';

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
// Every class has a big tree (tests/knight-tree.test.ts, tests/class-trees.test.ts); these four arrived 2026-10-23.
const ids = ['toma', 'sefa', 'brann', 'lio'];

describe('talent trees: content and stats', () => {
  it('every class has a big tree (owner 2026-10-23: the recruits moved up from release B)', () => {
    for (const id of [...ids, 'guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira']) {
      const tree = map.talents[id]!; expect(isBigTree(tree), id).toBe(true);
      expect(new Set(tree.map(n => n.branch))).toEqual(new Set(['a', 'b', 'c']));
      expect(tree.filter(n => 'unlock' in n.effect)).toHaveLength(id === 'guardian' ? 4 : 4);
    }
  });
  it('no talents leaves the definition unchanged; stat nodes scale max HP, Attack and skill power', () => {
    for (const id of ids) expect(member(id)).toEqual(heroDef(lookup, map, id));
    const base = heroDef(lookup, map, 'garran')!;
    const t = member('garran', { a1: 2, b1: 2 });
    expect(t.maxHp).toBe(Math.round(base.maxHp * 1.10)); expect(t.attack).toBe(Math.round(base.attack * 1.08));
    // Stats design (2026-10-17): Attack % feeds damaging skills (damageBonus), not Support.
    expect(member('weaver', { c1: 2 })).toMatchObject({ damageBonus: 0, skillBonus: 8 });
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

describe('talent points and reset (lobby)', () => {
  const leveled = (level: number) => { const p = newProfile(map, 3); p.members.sefa = { stars: 1, dupes: 0 }; p.campXp = xpAt(level); return p; };
  it('one point per level above 1; a modifier needs its branch tier; resetting refunds everything', () => {
    expect(talentReason(leveled(1), map, 'sefa', 'a1')).toBe('points');
    let p = leveled(10);
    for (const n of ['a1', 'a1', 'a2b'] as const) p = learnTalent(p, map, 'sefa', n).profile;
    expect(talentReason(p, map, 'sefa', 'a2l')).not.toBe('');
    expect(p.members.sefa!.talents).toEqual({ a1: 2, a2b: 1 });
    const reset = resetTalents(p, 'sefa');
    expect(reset.event.type).toBe('talent'); expect(reset.profile.members.sefa!.talents).toBeUndefined();
    expect(resetTalents(reset.profile, 'sefa').event.type).toBe('blocked');
  });
  it('talents stay in the profile after an expedition and travel with the member', () => {
    let p = learnTalent(leveled(3), map, 'sefa', 'a1').profile;
    p = learnTalent(p, map, 'sefa', 'b1').profile;
    const run = newExpedition(map, lookup, 1, { roster: p.party, members: structuredClone(p.members) });
    expect(run.members.sefa!.talents).toEqual({ a1: 1, b1: 1 });
    run.members.sefa = { ...run.members.sefa!}; run.campXp = Math.max(run.campXp, xpAt(4));
    const home = settle(p, run, 'wiped', map); expect(home.members.sefa).toEqual({ stars: 1, dupes: 0, talents: { a1: 1, b1: 1 } }); expect(home.campXp).toBe(xpAt(4));
  });
  it.each([
    ['too many points', 2, { a1: 2 }],
    ['a rank above the max', 5, { a1: 3 }],
    ['both choices of one skill', 9, { a1: 2, a2b: 1, a2l: 1 }],
    ['an unknown node', 5, { root: 1 } as Talents],
  ])('rejects %s', (_, level, t) => expect(talentsValid(map, 'sefa', level, t)).toBe(false));
});

describe('save v8', () => {
  const memory = () => { const v = new Map<string, string>(); return { getItem: (k: string) => v.get(k) ?? null, setItem: (k: string, x: string) => { v.set(k, x); } }; };
  it('round-trips talents and loads v7 data unchanged', () => {
    const profile = newProfile(map, 4); profile.members.tracer = { stars: 1, dupes: 0, talents: { a1: 1, b1: 1 } }; profile.campXp = xpAt(3);
    const run = newExpedition(map, lookup, 2, { roster: profile.party, members: structuredClone(profile.members), campXp: profile.campXp });
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

describe('save v39 (recruit big trees)', () => {
  it('refunds the four classes’ small-tree ranks and grants the star skills and passives they had', () => {
    // A v38 company kept a level on every member: Seren's rank-two refund needs Lv6, Toma was still Lv2.
    const legacy = (m: object, level: number) => ({ ...m, level, exp: 0 });
    const profile = { ...newProfile(map, 4), members: { ...newProfile(map, 4).members, sefa: legacy({ stars: 3, dupes: 0, talents: { root: 1, a1: 2, a2: 2 } }, 6),
      brann: legacy({ stars: 5, dupes: 0, talents: { root: 1 } }, 6), lio: { stars: 5, dupes: 0 }, toma: legacy({ stars: 1, dupes: 0, talents: { root: 1 } }, 2) } } as unknown as ReturnType<typeof newProfile>;
    delete (profile as Partial<typeof profile>).campXp; profile.company.push('sefa', 'brann', 'lio', 'toma');
    const back = parseGame(JSON.stringify({ version: 38, profile, run: null }), map, lookup).profile;
    expect(back.members.sefa).toEqual({ stars: 3, dupes: 0, grants: ['a3'] }); expect(back.campXp).toBe(xpAt(6));
    expect(back.members.brann!.grants).toEqual(['a4', 'b2']); expect(back.members.lio!.grants).toEqual(['a4', 'b3']);
    expect(back.members.toma).toEqual({ stars: 1, dupes: 0 });
    // The granted nodes are live: a ★3 scout can take Backstab into battle.
    expect(heroDef(lookup, map, 'sefa') && starred(heroDef(lookup, map, 'sefa')!, 3, map, 6, {}, undefined, { grants: ['a3'], loadout: ['ambush', 'evade', 'backstab'] }).actions).toContain('backstab');
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
    expect(skillPower(d, 'weaver', 'bolt')).toBe(Math.round(26 * 1.04));
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

describe('alchemist tree modifiers (Toma)', () => {
  it('deeper corrosion is stronger; spreading acid corrodes every enemy without damage', () => {
    const deep = party([['toma', { a2d: 1 }], ...rest]); const s = until(createBattle(deep), deep, 'toma');
    expect(corrodeBonus(act(s, deep, 'acid', 'f1').turns[0]!.state, deep, 'f1')).toBe(deep.rules.corrodeBonus + 3);
    const d = party([['toma', { a2s: 1 }], ...rest]);
    const r = act(until(createBattle(d), d, 'toma'), d, 'acid', 'f1').turns[0]!;
    for (const id of ['f1', 'b1']) expect(corrodeBonus(r.state, d, id)).toBe(d.rules.corrodeBonus);
    expect(r.events.find(e => e.type === 'damage' && e.targetId === 'b1')).toBeUndefined();
  });
  it('a mixed haste heals the ally; a twin brew is ready sooner', () => {
    const d = party([['toma', { b2h: 1 }], ...rest]);
    const s = set(until(createBattle(d), d, 'toma'), 'tracer', { hp: 10 }); expect(hero(act(s, d, 'haste', 'tracer').turns[0]!.state, 'tracer').hp).toBe(18);
    const q = party([['toma', { b2q: 1 }], ...rest]); const t = until(createBattle(q), q, 'toma');
    expect(hero(act(t, q, 'haste', 'tracer').turns[0]!.state, 'toma').cooldowns.haste).toBe(t.round + 2);
  });
});

describe('scout tree modifiers (Sefa)', () => {
  it('a stronger ambush; a layered ambush leaves her in shadow step', () => {
    const d = party([['guardian'], ['sefa', { a2b: 1 }], ['weaver'], ['healer']]);
    const s = until(createBattle(d), d, 'sefa');
    expect(ambushBonus(s, d, 'f1', 'sefa')).toBe(s.order.indexOf('f1') > s.turnIndex ? d.rules.ambushBonus + 6 : 0);
    const l = party([['guardian'], ['sefa', { a2l: 1 }], ['weaver'], ['healer']]);
    expect(hero(act(until(createBattle(l), l, 'sefa'), l, 'ambush', 'f1').turns[0]!.state, 'sefa').evading).toBe(true);
  });
  it('a doubled shadow step dodges twice; breathing in the shadow heals each dodge', () => {
    const d = party([['guardian'], ['sefa', { b2d: 1 }], ['weaver'], ['healer']]);
    expect(hero(act(until(createBattle(d), d, 'sefa'), d, 'evade', 'sefa').turns[0]!.state, 'sefa').evadeExtra).toBe(1);
    const h = party([['guardian'], ['sefa', { b2h: 1 }], ['weaver'], ['healer']]);
    const s = set(until(createBattle(h), h, 'sefa'), 'sefa', { hp: 30 });
    const turn = act(s, h, 'evade', 'sefa').turns.find(t => t.actorId === 'b1')!;
    expect(turn.events.map(e => e.type)).toEqual(['dodge', 'heal']); expect(hero(turn.state, 'sefa').hp).toBe(36);
  });
});

describe('warden tree modifiers (Brann)', () => {
  it('a challenged warden hammers back every hit; a deeper rune slam is stronger', () => {
    const d = party([['brann', { a2h: 1 }], ...rest]);
    expect(skillPower(party([['brann', { b3d: 1 }], ...rest]), 'brann', 'slam')).toBe(18 + 6);
    let s = act(until(createBattle(d), d, 'brann'), d, 'taunt', 'brann').state; const counters: number[] = [];
    for (let i = 0; i < 12 && currentHeroId(s, d) !== 'brann'; i++) {
      const r = act(s, d, 'attack', 'f1');
      for (const t of r.turns) if (t.side === 'enemy') counters.push(...t.events.filter(e => e.type === 'counter' && e.sourceId === 'brann').map(e => e.amount!));
      s = r.state;
    }
    expect(counters.length).toBeGreaterThan(0); expect(counters.every(a => a === 6)).toBe(true);
  });
  it('a tougher challenge reduces more; stone regen heals below half HP at his turn', () => {
    expect(tauntReductionOf(party([['brann', { a2t: 1 }], ...rest]), 'brann')).toBe(0.4);
    const d = party([['brann', { c4: 1 }], ...rest]);
    let s = until(createBattle(d), d, 'brann'); s = set(s, 'brann', { hp: 30 });
    const events = []; for (let i = 0; i < 12; i++) { const r = act(s, d, currentHeroId(s, d) === 'brann' ? 'taunt' : 'attack', currentHeroId(s, d) === 'brann' ? 'brann' : 'f1'); events.push(...r.events); s = r.state; if (events.some(e => e.text === 'Stone regen.')) break; }
    expect(events.find(e => e.text === 'Stone regen.')).toMatchObject({ targetId: 'brann', amount: 8 });
  });
});

describe('bard tree modifiers (Lio)', () => {
  it('chorus: while valor plays every enemy hit is 2 lower; a rousing verse raises valor', () => {
    expect(skillPower(party([['lio', { a2r: 1 }], ...rest]), 'lio', 'valor')).toBe(4 + 2);
    const d = party([['lio', { a2c: 1 }], ...rest]);
    let s = act(until(createBattle(d), d, 'lio'), d, 'valor', 'lio').state; let hit;
    for (let i = 0; i < 6 && !hit; i++) { const r = act(s, d, 'attack', 'f1'); for (const t of r.turns) if (t.side === 'enemy' && !hit) hit = { e: t.events.find(e => e.type === 'damage'), damage: t.intent!.damage }; s = r.state; }
    expect(hit!.e!.amount! + hit!.e!.absorbed!).toBe(hit!.damage - 2);
  });
  it('overture: the battle opens with the song of mending', () => {
    expect(createBattle(party([['lio', { b2o: 1 }], ...rest])).song).toMatchObject({ heroId: 'lio', action: 'mend' });
    expect(skillPower(party([['lio', { b2w: 1 }], ...rest]), 'lio', 'mend')).toBe(5 + 2);
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
