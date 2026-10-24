import { describe, expect, it } from 'vitest';
import { beginBattle, enemyIntent, guardCounterPower, resolveCommand } from '../src/core/battle/engine';
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
  it('bulwark pulls every move onto the knight with its own reduction', () => {
    const d = knight(['bulwark']); const s = knightTurn(d); const r = cast(d, s, 'bulwark', 'guardian');
    expect(r.state.outcome === 'active' ? r.state.taunt?.reduction ?? 0.6 : 0.6).toBeCloseTo(0.6);
    for (const e of r.events.filter(v => v.type === 'damage' && v.sourceId !== 'guardian' && !v.text.startsWith('Hero'))) expect(e.targetId).toBe('guardian');
  });
  it('rouse restores a share of every standing ally’s max HP', () => {
    const d = knight(['rouse']); const s = knightTurn(d); for (const h of s.heroes) h.hp = 20;
    const r = cast(d, s, 'rouse', 'party'); const heals = r.events.filter(e => e.type === 'heal' && e.sourceId === 'guardian');
    expect(heals).toHaveLength(4); for (const e of heals) expect(e.amount).toBe(Math.round(d.heroes.find(h => h.id === e.targetId)!.maxHp * 12 / 100));
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
  it('banners: bright gives every ally a barrier, valor raises hero hits this round', () => {
    const bright = knight(['rally'], { caps: { brightbanner: 6 } }); const r = cast(bright, knightTurn(bright), 'rally', 'guardian');
    expect(r.events.filter(e => e.type === 'barrier' && e.sourceId === 'guardian')).toHaveLength(4);
    const valor = knight(['rally'], { caps: { valorbanner: 10 } }); const v = cast(valor, knightTurn(valor), 'rally', 'guardian');
    expect(v.turns[0]!.state.banner).toEqual({ heroId: 'guardian', round: 1 });
  });
  it('banner of fate opens the battle with a barrier for everyone', () => {
    const d = knight(['guard'], { caps: { fatebanner: 10 } }); const s = beginBattle(d).initial;
    const amount = Math.round(d.heroes.find(h => h.id === 'guardian')!.maxHp / 10); for (const h of s.heroes) expect(h.barrier).toBe(amount);
  });
  it('endless counter adds a share of the knight’s Attack', () => {
    const d = knight(['guard'], { caps: { guardcounter: 8 } }); expect(guardCounterPower(d, 'guardian')).toBe(8 + Math.round(d.heroes[0]!.attack * 0.2));
  });
});
