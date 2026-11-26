import { describe, expect, it } from 'vitest';
import { autoCommand, autoScore, autoStopReason, autoWatch, readAutoSettings } from '../src/core/battle/auto';
import { createBattle, currentHeroId, replay, resolveCommand, validateCommand } from '../src/core/battle/engine';
import type { BattleState, EncounterDefinition } from '../src/core/battle/types';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { openField } from './fixtures/open-field';

const data = openField(veilSiege);
const play = (d: EncounterDefinition, s: BattleState, off: Parameters<typeof autoCommand>[2] = []) => {
  for (let i = 0; s.outcome === 'active' && i < 300; i++) { const c = autoCommand(s, d, off)!; expect(c).toBeDefined(); s = resolveCommand(s, d, c).state; }
  return s;
};

describe('auto battle command', () => {
  it('always gives a legal command for the current hero and plays a battle to its end', () => {
    let s = createBattle(data);
    for (let i = 0; s.outcome === 'active' && i < 300; i++) {
      const c = autoCommand(s, data)!;
      expect(c.heroId).toBe(currentHeroId(s, data)); expect(validateCommand(s, data, c)).toBe('');
      s = resolveCommand(s, data, c).state;
    }
    expect(s.outcome).not.toBe('active');
  });
  it('is deterministic: the same battle plays the same commands, and they replay to the same state', () => {
    const a = play(data, createBattle(data)), b = play(data, createBattle(data));
    expect(b.commands).toEqual(a.commands);
    expect(replay(data, a.commands)).toEqual(a);
  });
  it('never uses a skill the player switched off; the basic attack cannot be switched off', () => {
    const skills = [...new Set(data.heroes.flatMap(h => h.actions))].filter(a => a !== 'attack');
    const s = play(data, createBattle(data), [...skills, 'attack']);
    expect(s.commands.every(c => c.action === 'attack')).toBe(true);
  });
  it('uses skills when they are on', () => {
    const s = play(data, createBattle(data));
    expect(s.commands.some(c => c.action !== 'attack')).toBe(true);
  });
  it('never heals a hero who is at full HP', () => {
    const s = createBattle(data);
    for (const h of data.heroes) for (const action of h.actions) {
      if (action !== 'heal' || currentHeroId(s, data) !== h.id) continue;
      expect(autoScore(s, data, { beat: s.beat, heroId: h.id, action, targetId: h.id })).toBeLessThanOrEqual(0);
    }
  });
  it('gives no command once the battle has ended', () => {
    const s = play(data, createBattle(data));
    expect(autoCommand(s, data)).toBeUndefined();
  });
});

describe('auto battle stop', () => {
  const s = createBattle(data);
  const hurt = (id: string, hp: number): BattleState => ({ ...s, heroes: s.heroes.map(h => h.id === id ? { ...h, hp } : h) });
  const id = data.heroes[0]!.id, max = data.heroes[0]!.maxHp;
  it('stops when a hero standing at the start falls, even with the HP stop off', () => {
    expect(autoStopReason(hurt(id, 0), data, 0, autoWatch(s, data, 0))).toEqual({ reason: 'down', heroId: id });
  });
  it('stops when a hero drops under the chosen percent, and not at or above it', () => {
    const watch = autoWatch(s, data, 50);
    expect(autoStopReason(hurt(id, Math.ceil(max / 2)), data, 50, watch)).toBeUndefined();
    expect(autoStopReason(hurt(id, Math.ceil(max / 2) - 1), data, 50, watch)).toEqual({ reason: 'low', heroId: id });
    expect(autoStopReason(hurt(id, 1), data, 0, autoWatch(s, data, 0))).toBeUndefined();
  });
  it('a hero already under the line when auto (re)starts only stops it by falling', () => {
    const low = hurt(id, 1); const watch = autoWatch(low, data, 50);
    expect(autoStopReason(low, data, 50, watch)).toBeUndefined();
    expect(autoStopReason(hurt(id, 0), data, 50, watch)).toEqual({ reason: 'down', heroId: id });
  });
  it('a hero already down at the start never stops it', () => {
    const down = hurt(id, 0);
    expect(autoStopReason(down, data, 70, autoWatch(down, data, 70))).toBeUndefined();
  });
});

describe('auto battle settings', () => {
  it('reads defaults from nothing or damaged text and keeps only known stop values', () => {
    expect(readAutoSettings(null)).toEqual({ on: false, stopHp: 50, off: [] });
    expect(readAutoSettings('{oops')).toEqual({ on: false, stopHp: 50, off: [] });
    expect(readAutoSettings(JSON.stringify({ on: true, stopHp: 33, off: ['bolt', 'attack', 'bolt', 4] }))).toEqual({ on: true, stopHp: 50, off: ['bolt'] });
    expect(readAutoSettings(JSON.stringify({ on: true, stopHp: 0, off: [] })).stopHp).toBe(0);
  });
});
