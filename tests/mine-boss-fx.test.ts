import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: {} }));
import { encounterById } from '../src/content/encounters/catalog';
import { createBattle, currentActorId, resolveCommand, withParty } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition, TurnStage } from '../src/core/battle/types';
import { armorFrame, mineCues, usesMineBossFx } from '../src/game/visuals/mine-boss-fx';
import { unitClip, unitDefinition } from '../src/game/visuals/unit-frames';
import atlases from '../src/game/visuals/unit-atlases.json';

// ART-UNIT-ANIMATION-MINE-BOSS-001: the Crystal Giant's layers follow resolver events and state only.
const giant = encounterById('crystal-giant')!;
const guardian = encounterById('first-clash')!.heroes.find(h => h.id === 'guardian')!;
const mage = encounterById('veil-siege')!.heroes.find(h => h.id === 'weaver')!;
const party = (data: EncounterDefinition) => withParty(data, [
  { ...guardian, speed: 80, maxHp: 1_000, attack: 10, actions: ['attack', 'bash'] },
  { ...mage, speed: 79, maxHp: 1_000, attack: 10, actions: ['attack', 'bolt'] },
]);
const act = (data: EncounterDefinition, state: BattleState, action: ActionId = 'attack') =>
  resolveCommand(state, data, { beat: state.beat, heroId: currentActorId(state)!, action, targetId: 'f1' }, true);
const cuesOf = (data: EncounterDefinition, turns: readonly TurnStage[]) => turns.flatMap(t => mineCues(t, data).map(c => ({ kind: c.kind, id: c.id })));

describe('Crystal Giant presentation', () => {
  it('registers the R1 giant and fragment on their own atlases', () => {
    expect(giant.enemies[0]!.art).toBe('foe_crystal_giant');
    expect(giant.enemies.slice(1).map(e => e.art)).toEqual(['foe_crystal_fragment', 'foe_crystal_fragment']);
    expect(atlases.crystalgiant.frames).toBe(26);
    expect(atlases.crystalfragment.frames).toBe(10);
    expect(unitDefinition('foe_crystal_giant')?.soleOrigin).toBe(.875);
    for (const move of ['Crystal Fist', 'Shard Beam', 'Crystal Collapse', 'Crystal Armor', 'Crystal Split']) expect(unitClip('foe_crystal_giant', undefined, move), move).toBeDefined();
    expect(usesMineBossFx(giant)).toBe(true);
    expect(usesMineBossFx(encounterById('mine-yard-patrol')!)).toBe(false);
  });

  it('shows the armour from state and cracks it once per counted hit, then breaks on the real event', () => {
    const data = party(giant);
    const opening = createBattle(data);
    expect(armorFrame(opening, data, 'f1')).toBe('armor-lift');
    const one = act(data, opening);
    expect(cuesOf(data, one.turns)).toContainEqual({ kind: 'crack', id: 'f1' });
    expect(armorFrame(one.state, data, 'f1')).toBe('armor-crack-1');
    const broken = act(data, opening, 'bash');
    const kinds = cuesOf(data, broken.turns).map(c => c.kind);
    expect(kinds).toContain('break');
    expect(kinds).not.toContain('crack');
    expect(armorFrame(broken.state, data, 'f1')).toBeUndefined();
  });

  it('reflects only onto the caster that took reflected damage', () => {
    const data = party(giant);
    let state = createBattle(data);
    state = act(data, state).state;
    const bolt = act(data, state, 'bolt');
    const reflect = bolt.turns.flatMap(t => mineCues(t, data)).filter(c => c.kind === 'reflect');
    expect(reflect).toEqual([expect.objectContaining({ id: 'f1', casterId: 'weaver' })]);
  });

  it('drops the collapse only at the feet of heroes the move struck', () => {
    const data = withParty(giant, [{ ...guardian, speed: 200, maxHp: 1_000, actions: ['attack', 'guard'] }]);
    let state = createBattle(data);
    state = act(data, state).state;
    state = act(data, state).state;
    const collapse = act(data, state).turns.flatMap(t => mineCues(t, data)).filter(c => c.kind === 'collapse');
    expect(collapse.map(c => c.id)).toEqual(['guardian']);
  });

  it('bursts the split on the real phase turn', () => {
    const data = withParty(giant, [{ ...mage, actions: ['attack'], attack: 1, speed: 70, maxHp: 1_000 }]);
    const state = createBattle(data);
    state.enemies[0]!.hp = giant.enemies[0]!.maxHp / 2 + 1;
    const half = act(data, state);
    const split = act(data, half.state);
    expect(cuesOf(data, [...half.turns, ...split.turns]).filter(c => c.kind === 'split')).toEqual([{ kind: 'split', id: 'f1' }]);
  });
});
