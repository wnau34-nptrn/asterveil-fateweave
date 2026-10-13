import { describe, expect, it } from 'vitest';
import { actionReason, createBattle, plannedIntents, previewCommand, replay, resolveCommand, targetOptions, validateCommand } from '../src/core/battle/engine';
import type { ActionId, BattleState, Command } from '../src/core/battle/types';
import { veilSiege as data } from '../src/content/encounters/veil-siege';
const start = () => createBattle(data);
const command = (s: BattleState, heroId: string, action: ActionId, targetId: string): Command => ({ beat: s.beat, heroId, action, targetId });
const act = (s: BattleState, hero: string, action: ActionId, target: string) => resolveCommand(s, data, command(s, hero, action, target));
describe('four-class deterministic combat', () => {
  it('has two front/two back heroes, independent state and no environmental resource', () => {
    const a = start(); const b = start();
    expect(data.heroes.map(h => h.lane)).toEqual(['front', 'front', 'back', 'back']);
    expect(a.heroes.map(h => h.hp)).toEqual([76, 56, 48, 46]);
    expect(a).not.toHaveProperty('crystal'); expect(a).not.toHaveProperty('counter');
    a.heroes[0]!.cooldowns.bash = 99; expect(b.heroes[0]!.cooldowns).toEqual({});
  });
  it('uses three owned commands for each distinct class', () => {
    expect(new Set(data.heroes.map(h => h.role)).size).toBe(4);
    for (const h of data.heroes) expect(h.actions).toHaveLength(3);
    expect(actionReason(start(), data, 'weaver', 'heal')).toContain('does not have');
  });
  it('deals exact damage without changing the input or announced target', () => {
    const s = start(); const original = structuredClone(s); const r = act(s, 'tracer', 'attack', 'brute');
    expect(s).toEqual(original); expect(r.state.enemies[1]!.hp).toBe(148);
    expect(r.state.heroes[1]!.hp).toBe(44); expect(r.state.intent?.targetId).toBe('weaver');
  });
  it('intercepts for front/back targets and rounds Guard upward', () => {
    let s = act(start(), 'guardian', 'guard', 'tracer').state;
    expect(s.heroes[0]!.hp).toBe(71); expect(s.heroes[1]!.hp).toBe(56);
    s = act(s, 'guardian', 'guard', 'weaver').state;
    expect(s.heroes[0]!.hp).toBe(61); expect(s.heroes[2]!.hp).toBe(48);
    expect(() => act(start(), 'guardian', 'guard', 'healer')).toThrow('announced target');
  });
  it('blocks physical access to back rows while a front hero survives', () => {
    const changed = { ...data, intents: data.intents.map(i => ({ ...i, targetId: 'healer' })) };
    const s = createBattle(changed); expect(s.intent?.targetId).toBe('guardian');
    expect(plannedIntents(s, changed)[0]?.targetId).toBe('healer');
    s.heroes[0]!.hp = 0; s.heroes[1]!.hp = 0;
    expect(plannedIntents(s, changed)[1]?.targetId).toBe('healer');
  });
  it('reassigns physical targeting to the remaining front hero after a down', () => {
    const s = start(); s.heroes[1]!.hp = 1;
    const n = act(s, 'tracer', 'mark', 'brute').state;
    expect(n.heroes[1]!.hp).toBe(0); expect(plannedIntents(n, data)[0]?.targetId).toBe('guardian');
  });
  it('Bash interrupts only the current physical source', () => {
    const s = start(); const r = act(s, 'guardian', 'bash', 'raider');
    expect(r.state.enemies[0]!.hp).toBe(46); expect(r.state.heroes[1]!.hp).toBe(56);
    expect(r.events.find(e => e.type === 'cancel')?.cause).toBe('interrupted');
    expect(act(s, 'guardian', 'bash', 'brute').state.heroes[1]!.hp).toBe(44);
    const energy = act(s, 'tracer', 'mark', 'brute').state;
    expect(act(energy, 'guardian', 'bash', 'brute').state.heroes[2]!.hp).toBe(20);
  });
  it('tracks per-hero cooldowns and permits reuse exactly at the ready beat', () => {
    let s = act(start(), 'weaver', 'bolt', 'brute').state;
    expect(s.heroes[2]!.cooldowns.bolt).toBe(4);
    expect(actionReason(s, data, 'weaver', 'bolt')).toBe('Cooldown: 2');
    expect(() => act(s, 'weaver', 'bolt', 'brute')).toThrow('Cooldown');
    s = act(s, 'guardian', 'guard', 'weaver').state;
    expect(actionReason(s, data, 'weaver', 'bolt')).toBe('Cooldown: 1');
    s = act(s, 'guardian', 'guard', 'guardian').state;
    expect(actionReason(s, data, 'weaver', 'bolt')).toBe('');
    expect(act(s, 'weaver', 'bolt', 'brute').state.heroes[2]!.cooldowns.bolt).toBe(7);
  });
  it('Mark enables a 50-damage precision strike and is consumed', () => {
    const s = act(start(), 'tracer', 'mark', 'brute').state;
    const r = act(s, 'tracer', 'execute', 'brute').state;
    expect(r.enemies[1]!.hp).toBe(114); expect(r.enemies[1]!.markedUntil).toBe(0);
    expect(act(s, 'tracer', 'attack', 'brute').state.enemies[1]!.hp).toBe(126);
  });
  it('expires Mark after three beats including application', () => {
    let s = act(start(), 'tracer', 'mark', 'brute').state;
    s = act(s, 'guardian', 'guard', 'weaver').state;
    s = act(s, 'guardian', 'guard', 'guardian').state;
    expect(s.beat).toBe(4); expect(s.enemies[1]!.markedUntil).toBe(0);
  });
  it('Ward absorbs the same-beat hit and reports actual absorption', () => {
    const r = act(start(), 'weaver', 'ward', 'tracer');
    expect(r.state.heroes[1]).toMatchObject({ hp: 56, barrier: 2 });
    expect(r.events.find(e => e.type === 'damage')).toMatchObject({ amount: 0, absorbed: 12 });
    expect(r.events.find(e => e.type === 'barrier')?.amount).toBe(14);
  });
  it('Ward does not stack, and Guard reduces before using barrier', () => {
    const s = start(); s.heroes[0]!.barrier = 10;
    const r = act(s, 'guardian', 'guard', 'tracer').state;
    expect(r.heroes[0]).toMatchObject({ hp: 76, barrier: 5 });
    s.heroes[2]!.barrier = 14;
    expect(targetOptions(s, data, 'weaver', 'ward').find(t => t.id === 'weaver')?.valid).toBe(false);
  });
  it('heals before the announced hit and clamps at max HP', () => {
    const s = start(); s.heroes[1]!.hp = 10;
    expect(act(s, 'healer', 'heal', 'tracer').state.heroes[1]!.hp).toBe(18);
    s.heroes[0]!.hp = 73;
    expect(act(s, 'healer', 'heal', 'guardian').events.find(e => e.type === 'heal')?.amount).toBe(3);
  });
  it('Prayer heals all living injured allies, never resurrects, and has a four-beat cooldown', () => {
    const s = start(); s.heroes[0]!.hp = 60; s.heroes[1]!.hp = 40; s.heroes[2]!.hp = 0;
    const r = act(s, 'healer', 'prayer', 'party');
    expect(r.state.heroes.map(h => h.hp)).toEqual([70, 38, 0, 46]);
    expect(r.events.filter(e => e.type === 'heal')).toHaveLength(2);
    expect(r.state.heroes[3]!.cooldowns.prayer).toBe(5);
    expect(() => act(s, 'healer', 'heal', 'weaver')).toThrow('down');
    expect(() => act(start(), 'healer', 'prayer', 'party')).toThrow('full health');
  });
  it('rejects unavailable targets, stale commands and foreign encounter IDs', () => {
    const s = start(); expect(() => act(s, 'healer', 'heal', 'guardian')).toThrow('full health');
    expect(() => act(s, 'weaver', 'bolt', 'party')).toThrow('Invalid target');
    expect(validateCommand(s, data, { ...command(s, 'tracer', 'attack', 'brute'), beat: 0 })).toContain('stale');
    expect(validateCommand({ ...s, encounterId: 'other' }, data, command(s, 'tracer', 'attack', 'brute'))).toContain('mismatch');
  });
  it('clamps overkill and cancels the defeated source instead of substituting', () => {
    const s = start(); s.enemies[0]!.hp = 2;
    const r = act(s, 'weaver', 'bolt', 'raider');
    expect(r.events.find(e => e.type === 'damage')?.amount).toBe(2);
    expect(r.events.find(e => e.type === 'cancel')?.cause).toBe('defeated');
    expect(r.state.heroes[1]!.hp).toBe(56);
  });
  it('produces genuine Victory/Defeat and rejects commands after the end', () => {
    const s = start(); s.enemies[0]!.hp = 1; s.enemies[1]!.hp = 0;
    const won = act(s, 'tracer', 'attack', 'raider').state;
    expect(won.outcome).toBe('victory'); expect(won.intent).toBeNull();
    expect(() => act(won, 'tracer', 'attack', 'raider')).toThrow('ended');
    const loss = start(); loss.heroes.forEach(h => { h.hp = h.id === 'tracer' ? 1 : 0; });
    expect(act(loss, 'tracer', 'mark', 'brute').state.outcome).toBe('defeat');
  });
  it('previews every legal action exactly and replays cooldowns without mutating the source', () => {
    const injured = start(); injured.heroes.forEach(h => { h.hp -= 10; });
    const fresh = start();
    for (const s of [fresh, injured]) for (const h of data.heroes) for (const action of h.actions) for (const t of targetOptions(s, data, h.id, action).filter(t => t.valid)) {
      const c = command(s, h.id, action, t.id); const before = structuredClone(s);
      const result = resolveCommand(s, data, c);
      expect(previewCommand(s, data, c)).toEqual(result); expect(s).toEqual(before);
      if (s === fresh) expect(replay(data, result.state.commands)).toEqual(result.state);
    }
    const cast = act(start(), 'weaver', 'bolt', 'brute').state;
    expect(replay(data, cast.commands)).toEqual(cast);
  });
});
