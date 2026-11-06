import { describe, expect, it } from 'vitest';
import { beginBattle, targetOptions, CHALLENGE_GRUDGE_MAX, enemyIntent, guardCounterPower, previewCommand, resolveCommand, ROUSE_CUT } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition, HeroTalents } from '../src/core/battle/types';
import { veilSiege } from '../src/content/encounters/veil-siege';

// Knight big tree (master plan A6): the three new skills and the branch modifiers, read from the hero definition.
const knight = (actions: ActionId[], talents?: HeroTalents): EncounterDefinition =>
  ({ ...veilSiege, heroes: veilSiege.heroes.map(h => h.id === 'guardian' ? { ...h, actions: ['attack', ...actions], ...(talents ? { talents } : {}) } : h) });
// A fresh battle moved to the knight's turn (same round, same queue).
const knightTurn = (d: EncounterDefinition, s: BattleState = beginBattle(d).state): BattleState => {
  const t = structuredClone(s); t.turnIndex = t.order.indexOf('guardian'); return t;
};
const cast = (d: EncounterDefinition, s: BattleState, action: ActionId, targetId: string) => resolveCommand(s, d, { beat: s.beat, heroId: 'guardian', action, targetId });
describe('knight big tree skills', () => {
  it('challenge makes that enemy aim its next move at the knight', () => {
    const d = knight(['challenge']); const s = knightTurn(d); const foe = 'f1';
    const r = cast(d, s, 'challenge', foe);
    expect(r.events.some(e => e.type === 'taunt' && e.text === 'Challenge.')).toBe(true);
    const hits = r.events.filter(e => e.type === 'damage' && e.sourceId === foe);
    if (hits.length) expect(hits[0]!.targetId).toBe('guardian'); else expect(enemyIntent(r.state, d, foe, r.state.challenge!.round)!.targetId).toBe('guardian');
  });
  it('bulwark cuts front-row hits without changing targets', () => {
    const d = knight(['bulwark']); const s = knightTurn(d); const r = cast(d, s, 'bulwark', 'guardian');
    expect(r.turns[0]!.state.bulwark).toEqual({ heroId: 'guardian' });
    expect(r.turns[0]!.state.taunt).toBeNull();
    expect(enemyIntent(r.turns[0]!.state, d, 'f1', 1)!.targetId).toBe(enemyIntent(s, d, 'f1', 1)!.targetId);
  });
  it('rouse guards the other standing ally with the lowest HP ratio without healing', () => {
    const d = knight(['rouse']); const s = knightTurn(d); s.heroes.find(h => h.id === 'weaver')!.hp = 1;
    const r = cast(d, s, 'rouse', 'guardian');
    expect(r.turns[0]!.state.guard).toMatchObject({ heroId: 'guardian', targetId: 'weaver', all: true });
    expect(r.turns[0]!.events.some(e => e.type === 'heal')).toBe(false);
  });
  it('save v53: challenge hits for its power and remembers what its foe deals the knight until his next turn', () => {
    const d = knight(['challenge']); const s = knightTurn(d);
    const r = cast(d, s, 'challenge', 'f1');
    expect(r.turns[0]!.events.find(e => e.type === 'damage' && e.sourceId === 'guardian')).toMatchObject({ targetId: 'f1', amount: 10 });
    const taken = r.events.filter(e => e.type === 'damage' && e.sourceId === 'f1' && e.targetId === 'guardian').reduce((n, e) => n + (e.amount ?? 0) + (e.absorbed ?? 0), 0);
    expect(taken).toBeGreaterThan(0);
    expect(r.state.heroes.find(h => h.id === 'guardian')!.grudge).toEqual({ enemyId: 'f1', amount: taken });
  });
  it('save v53: the grudge adds to the knight’s next hit, at most CHALLENGE_GRUDGE_MAX, then it is spent', () => {
    const d = knight(['challenge']); const s = knightTurn(d);
    const plain = cast(d, s, 'attack', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount!;
    for (const [amount, bonus] of [[6, 6], [40, CHALLENGE_GRUDGE_MAX]] as const) {
      const t = structuredClone(s); t.heroes.find(h => h.id === 'guardian')!.grudge = { enemyId: 'f1', amount };
      const r = cast(d, t, 'attack', 'f1');
      expect(r.turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(plain + bonus);
      expect(r.turns[0]!.state.heroes.find(h => h.id === 'guardian')!.grudge).toBeUndefined();
      expect(previewCommand(t, d, { beat: t.beat, heroId: 'guardian', action: 'attack', targetId: 'f1' })).toEqual(r);
    }
  });
  it('save v53: rouse takes each covered hit ROUSE_CUT% lighter than the same cover without it', () => {
    const d = knight(['rouse']); const s = knightTurn(d); s.heroes.find(h => h.id === 'weaver')!.hp = 1;
    const cover = cast(d, s, 'rouse', 'guardian').turns[0]!.state; expect(cover.guard).toMatchObject({ targetId: 'weaver', all: true, rouse: true });
    const plain = structuredClone(cover); delete plain.guard!.rouse;
    // Play both on with the same plain attacks until a foe's hit lands on the knight.
    const firstHit = (start: BattleState) => {
      let st = start;
      for (let i = 0; i < 12; i++) {
        const id = st.order[st.turnIndex]!; const foe = targetOptions(st, d, id, 'attack').find(t => t.valid)!;
        const r = resolveCommand(st, d, { beat: st.beat, heroId: id, action: 'attack', targetId: foe.id });
        const hit = r.events.find(e => e.type === 'damage' && e.targetId === 'guardian'); if (hit) return hit; st = r.state;
      }
      throw new Error('no hit');
    };
    const a = firstHit(cover), b = firstHit(plain);
    expect(a.sourceId).toBe(b.sourceId);
    expect(a.amount! + a.absorbed!).toBe(Math.ceil((b.amount! + b.absorbed!) * (1 - ROUSE_CUT / 100)));
  });
});
describe('knight big tree modifiers', () => {
  it('two guards cover two hits for a smaller reduction', () => {
    const d = knight(['guard'], { caps: { twoguard: 5 } }); const s = knightTurn(d);
    const r = cast(d, s, 'guard', s.intent!.targetId); expect(r.turns[0]!.state.guard!.uses).toBe(2);
  });
  it('reflect bash stops an energy move for less damage', () => {
    const plain = knight(['bash']); const reflect = knight(['bash'], { caps: { reflectbash: 30 } });
    // The brute's first move is energy (Rift Bolt).
    const a = cast(plain, knightTurn(plain), 'bash', 'f1'); const b = cast(reflect, knightTurn(reflect), 'bash', 'f1');
    const dealt = (r: typeof a) => r.events.find(e => e.type === 'damage' && e.sourceId === 'guardian')!.amount!;
    expect(dealt(b)).toBe(Math.round(dealt(a) * 0.7));
    expect(b.events.some(e => e.type === 'sigil')).toBe(true); expect(a.events.some(e => e.type === 'sigil' || e.type === 'interrupt')).toBe(false);
  });
  it('banners: bright gives every ally a barrier, rally banner covers two hits', () => {
    const bright = knight(['rally'], { caps: { brightbanner: 6 } }); const r = cast(bright, knightTurn(bright), 'rally', 'guardian');
    expect(r.events.filter(e => e.type === 'barrier' && e.sourceId === 'guardian')).toHaveLength(4);
    const valor = knight(['rally'], { caps: { rallybanner: 10 } }); const v = cast(valor, knightTurn(valor), 'rally', 'guardian');
    expect(v.turns[0]!.state.rally!.ids).toEqual(['guardian', 'guardian', 'tracer', 'tracer', 'weaver', 'weaver', 'healer', 'healer']);
  });
  it('banner of fate opens the battle with a barrier for everyone', () => {
    const d = knight(['guard'], { caps: { fatebanner: 10 } }); const s = beginBattle(d).initial;
    const amount = Math.round(d.heroes.find(h => h.id === 'guardian')!.maxHp / 10); for (const h of s.heroes) expect(h.barrier).toBe(amount);
  });
  it('endless counter adds a share of the knight’s Attack', () => {
    const d = knight(['guard'], { caps: { guardcounter: 8 } }); expect(guardCounterPower(d, 'guardian')).toBe(8 + Math.round(d.heroes[0]!.attack * 0.2));
  });
});
