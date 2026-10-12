import { describe, expect, it } from 'vitest';
import { actionReason, createBattle, previewCommand, replay, resolveCommand, targetOptions, validateCommand } from '../src/core/battle/engine';
import type { ActionId, BattleState, Command } from '../src/core/battle/types';
import { crystalRift as data } from '../src/content/encounters/crystal-rift';

const start = () => createBattle(data);
const command = (s: BattleState, heroId: string, action: ActionId, targetId: string): Command => ({ beat: s.beat, heroId, action, targetId });
const act = (s: BattleState, heroId: string, action: ActionId, targetId: string) => resolveCommand(s, data, command(s, heroId, action, targetId));
const guarded = () => act(start(), 'guardian', 'guard', 'tracer').state;

describe('Fateweave deterministic rules', () => {
  it('initializes independent state with all actors and a frozen announced intent', () => {
    const a = start(); const b = start();
    expect(a.heroes.map(h => h.hp)).toEqual([64, 44, 42]);
    expect(a.enemies.map(e => e.hp)).toEqual([38, 90]);
    expect(a.intent).toMatchObject({ sourceId: 'raider', targetId: 'tracer', damage: 9, beat: 1 });
    a.heroes[0]!.hp = 1;
    expect(b.heroes[0]!.hp).toBe(64);
  });
  it('deals deterministic damage without mutating the input', () => {
    const s = start(); const before = structuredClone(s);
    const r = act(s, 'tracer', 'attack', 'brute');
    expect(s).toEqual(before);
    expect(r.state.enemies[1]!.hp).toBe(74);
    expect(r.state.heroes[1]!.hp).toBe(35);
    expect(r.state.commands).toHaveLength(1);
  });
  it('clamps HP and reports actual damage on overkill', () => {
    const s = start(); s.enemies[0]!.hp = 2;
    const r = act(s, 'tracer', 'attack', 'raider');
    expect(r.state.enemies[0]!.hp).toBe(0);
    expect(r.events.find(e => e.targetId === 'raider' && e.type === 'damage')?.amount).toBe(2);
  });
  it('intercepts for the teammate, mitigates, and generates one Counter', () => {
    const s = guarded();
    expect(s.heroes[0]!.hp).toBe(60);
    expect(s.heroes[1]!.hp).toBe(44);
    expect(s.counter).toBe(1);
    expect(s.intent).toMatchObject({ sourceId: 'brute', kind: 'energy', damage: 18 });
  });
  it('caps Counter and allows self Guard', () => {
    let s = guarded(); s.counter = data.rules.counterCap;
    s = act(s, 'guardian', 'guard', 'guardian').state;
    expect(s.counter).toBe(2);
    expect(s.heroes[0]!.hp).toBe(53);
  });
  it('does not award Counter when the guarding hero falls', () => {
    const s = start(); s.heroes[0]!.hp = 1;
    const r = act(s, 'guardian', 'guard', 'tracer').state;
    expect(r.counter).toBe(0); expect(r.heroes[0]!.hp).toBe(0);
  });
  it('rejects Guard on a teammate outside the incoming intent', () => {
    expect(() => act(start(), 'guardian', 'guard', 'weaver')).toThrow('announced target');
  });
  it('restricts actions by hero and rejects stale commands', () => {
    const s = start();
    expect(actionReason(s, data, 'weaver', 'mark')).toContain('does not have');
    expect(validateCommand(s, data, { beat: 0, heroId: 'tracer', action: 'attack', targetId: 'brute' })).toContain('stale');
  });
  it('marks an enemy for three beats including the committed beat', () => {
    let s = act(start(), 'tracer', 'mark', 'brute').state;
    expect(s.enemies[1]!.markedUntil).toBe(4);
    s = act(s, 'guardian', 'attack', 'brute').state;
    s = act(s, 'guardian', 'attack', 'brute').state;
    expect(s.beat).toBe(4); expect(s.enemies[1]!.markedUntil).toBe(0);
  });
  it('Tracer benefits from a mark and consumes it', () => {
    const s = act(start(), 'tracer', 'mark', 'brute').state;
    const r = act(s, 'tracer', 'attack', 'brute').state;
    expect(r.enemies[1]!.hp).toBe(68); expect(r.enemies[1]!.markedUntil).toBe(0);
  });
  it('rejects Mark on a down or unknown enemy', () => {
    const s = start(); s.enemies[0]!.hp = 0;
    expect(() => act(s, 'tracer', 'mark', 'raider')).toThrow('down');
    expect(() => act(s, 'tracer', 'mark', 'unknown')).toThrow('Invalid target');
  });
  it('requires Counter for Redirect and disallows physical attacks', () => {
    const s = act(start(), 'tracer', 'attack', 'brute').state;
    expect(() => act(s, 'weaver', 'redirect', 'energy-crystal')).toThrow('Counter');
    const physical = start(); physical.counter = 1;
    expect(() => act(physical, 'weaver', 'redirect', 'energy-crystal')).toThrow('energy');
  });
  it('only marked enemies and charged crystals are valid Redirect targets', () => {
    const s = guarded();
    const targets = targetOptions(s, data, 'weaver', 'redirect');
    expect(targets.filter(t => t.valid).map(t => t.id)).toEqual(['energy-crystal']);
    expect(() => act(s, 'weaver', 'redirect', 'brute')).toThrow('Mark');
    expect(() => act(s, 'weaver', 'redirect', 'guardian')).toThrow('Invalid target');
    s.crystal.charges = 0;
    expect(actionReason(s, data, 'weaver', 'redirect')).toContain('marked enemy');
  });
  it('redirects to the crystal, spends Counter, and grants real barriers', () => {
    const s = guarded(); const r = act(s, 'weaver', 'redirect', 'energy-crystal').state;
    expect(r.counter).toBe(0); expect(r.crystal.charges).toBe(0);
    expect(r.heroes.map(h => h.barrier)).toEqual([8, 8, 8]);
    expect(r.heroes[0]!.hp).toBe(s.heroes[0]!.hp);
    const hit = act(r, 'tracer', 'attack', 'brute').state;
    expect(hit.heroes[2]!.hp).toBe(41); expect(hit.heroes[2]!.barrier).toBe(0);
  });
  it('rejects an exhausted crystal even if another Redirect target exists', () => {
    const s = guarded(); s.crystal.charges = 0; s.enemies[1]!.markedUntil = 5;
    expect(() => act(s, 'weaver', 'redirect', 'energy-crystal')).toThrow('no charge');
  });
  it('redirects exact announced damage to a marked source and exposes it', () => {
    const s = guarded(); s.enemies[1]!.markedUntil = 5;
    const r = act(s, 'weaver', 'redirect', 'brute').state;
    expect(r.enemies[1]).toMatchObject({ hp: 72, markedUntil: 0, exposedUntil: 4 });
    expect(r.heroes[0]!.hp).toBe(60); expect(r.counter).toBe(0);
    expect(act(r, 'tracer', 'attack', 'brute').state.enemies[1]!.hp).toBe(50);
  });
  it('can redirect damage onto the other enemy without an unlimited reaction chain', () => {
    const s = guarded(); s.enemies[0]!.markedUntil = 5;
    const r = act(s, 'weaver', 'redirect', 'raider');
    expect(r.state.enemies[0]!.hp).toBe(20);
    expect(r.events.filter(e => e.type === 'damage')).toHaveLength(1);
  });
  it('cancels the announced attack when Attack kills its source', () => {
    const s = start(); s.enemies[0]!.hp = 10;
    const r = act(s, 'tracer', 'attack', 'raider');
    expect(r.state.heroes[1]!.hp).toBe(44);
    expect(r.events.some(e => e.type === 'cancel')).toBe(true);
    expect(r.state.intent?.sourceId).toBe('brute');
  });
  it('finishes Victory immediately and rejects further commands', () => {
    const s = start(); s.enemies[1]!.hp = 0; s.enemies[0]!.hp = 1;
    const r = act(s, 'tracer', 'attack', 'raider').state;
    expect(r.outcome).toBe('victory'); expect(r.intent).toBeNull();
    expect(() => act(r, 'guardian', 'attack', 'raider')).toThrow('ended');
  });
  it('clamps hero HP at zero and ends Defeat after the last hero falls', () => {
    const s = start(); s.heroes.forEach(h => { h.hp = h.id === 'tracer' ? 1 : 0; });
    const r = act(s, 'tracer', 'mark', 'brute').state;
    expect(r.outcome).toBe('defeat'); expect(r.intent).toBeNull();
    expect(r.heroes.every(h => h.hp === 0)).toBe(true);
  });
  it('does not secretly change an announced target, then announces a living target next beat', () => {
    const s = start(); s.heroes[1]!.hp = 1;
    const r = act(s, 'tracer', 'mark', 'brute');
    expect(r.events.find(e => e.type === 'damage')?.targetId).toBe('tracer');
    expect(r.state.intent?.targetId).toBe('guardian');
  });
  it('all legal initial previews match committed results and leave source untouched', () => {
    for (const s of [start(), guarded()]) for (const h of data.heroes) for (const a of h.actions) {
      for (const target of targetOptions(s, data, h.id, a).filter(t => t.valid)) {
        const c = command(s, h.id, a, target.id); const before = structuredClone(s);
        expect(previewCommand(s, data, c)).toEqual(resolveCommand(s, data, c));
        expect(s).toEqual(before);
      }
    }
  });
  it('supports a winning attack-only route and exact deterministic replay', () => {
    let s = start(); const commands: Command[] = [];
    while (s.outcome === 'active' && commands.length < 30) {
      const h = ['tracer', 'weaver', 'guardian'].find(id => s.heroes.some(a => a.id === id && a.hp > 0))!;
      const target = s.enemies.find(e => e.hp > 0)!;
      const c = command(s, h, 'attack', target.id); commands.push(c);
      s = resolveCommand(s, data, c).state;
    }
    expect(s.outcome).toBe('victory');
    expect(replay(data, commands)).toEqual(s);
    expect(replay(data, commands)).toEqual(replay(data, commands));
  });
});
