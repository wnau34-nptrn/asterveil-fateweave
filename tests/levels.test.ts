import { describe, expect, it } from 'vitest';
import { encounterById } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { resolveCommand, withLevel } from '../src/core/battle/engine';
import { loadGame, parseGame, saveGame } from '../src/core/save/expedition-save';
import { newProfile, settle } from '../src/core/world/profile';
import type { ExpeditionState } from '../src/core/world/types';
import { battleData, battleState, expPercent, expToNext, finishBattle, memberDef, monsterLevelAt, move, newExpedition, recordBattle, tileAt } from '../src/core/world/world';
import { battleLesson } from '../src/ui/tutorial';

const lookup = encounterById;
const zoneRows = (zone: string) => map.rows.flatMap((row, y) => row.split('').some((_, x) => tileAt(map, { x, y })?.zoneId === zone) ? [y] : []);
const floorIn = (zone: string, y: number) => { for (let x = 0; x < map.rows[0]!.length; x++) { const t = tileAt(map, { x, y }); if (t?.kind === 'floor' && t.zoneId === zone) return { x, y }; } return undefined; };
// Win the active battle with the teaching advisor and apply it.
function win(state: ExpeditionState) {
  const data = battleData(state, map, lookup)!; let s = battleState(state, map, lookup)!;
  while (s.outcome === 'active') { const l = battleLesson(s, data)!; s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return finishBattle(recordBattle(state, map, lookup, s.commands), map, lookup);
}
// First random battle of a fresh, tutorial-done expedition.
function randomBattle(seed = 3): ExpeditionState {
  let s = newExpedition(map, lookup, seed, undefined, true);
  for (let i = 0; i < 200 && !s.battle; i++) s = move(s, map, i % 2 ? 'up' : 'down').state;
  return s;
}

describe('monster levels', () => {
  it('scale enemy HP and damage by 7% per level from the encounter level; SPD never changes', () => {
    const base = encounterById('thicket-ambush')!; expect(base.level).toBe(5);
    expect(withLevel(base, 5, 7)).toEqual({ ...base, level: 5 });
    const up = withLevel(base, 6, 7), down = withLevel(base, 4, 7);
    base.enemies.forEach((e, i) => {
      expect(up.enemies[i]!.maxHp).toBe(Math.round(e.maxHp * 1.07)); expect(down.enemies[i]!.maxHp).toBe(Math.round(e.maxHp * 0.93));
      expect(up.enemies[i]!.speed).toBe(e.speed);
    });
    base.intents.forEach((m, i) => expect(up.intents[i]!.damage).toBe(Math.round(m.damage * 1.07)));
  });
  it('rise with depth inside each zone: entrance rows low, far rows high', () => {
    for (const [zone, lo, hi] of [['meadow', 1, 3], ['thicket', 4, 6], ['scar', 7, 9]] as const) {
      const rows = zoneRows(zone); const south = floorIn(zone, Math.max(...rows))!, north = floorIn(zone, Math.min(...rows))!;
      expect(monsterLevelAt(map, south)).toBe(lo); expect(monsterLevelAt(map, north)).toBe(hi);
      for (const y of rows) { const p = floorIn(zone, y); if (p) { const l = monsterLevelAt(map, p)!; expect(l).toBeGreaterThanOrEqual(lo); expect(l).toBeLessThanOrEqual(hi); } }
    }
  });
  it('a random battle keeps the tile’s monster level and is fought at it', () => {
    const s = randomBattle(); expect(s.battle?.kind).toBe('random');
    expect(s.battle!.level).toBe(monsterLevelAt(map, s.position));
    expect(battleData(s, map, lookup)!.level).toBe(s.battle!.level);
  });
});

describe('member levels and EXP', () => {
  it('EXP tapers when a member is far above the monster, never to zero, and rewards fighting up', () => {
    expect([-4, -3, 0, 2, 3, 4, 5, 6, 9].map(g => expPercent(5 + g, 5))).toEqual([110, 110, 100, 100, 75, 50, 25, 10, 10]);
  });
  it('a victory gives every brought member EXP, level-ups raise max HP and standing HP', () => {
    const s = randomBattle(); const level = s.battle!.level!; const enemies = battleData(s, map, lookup)!.enemies.length;
    const r = win(s); expect(r.event.type).toBe('victory');
    const exp = r.event.type === 'victory' ? r.event.exp! : {};
    const each = enemies * (map.progression.expBase + map.progression.expPerLevel * level);
    for (const id of [...s.roster.deployed, ...s.roster.reserve]) {
      expect(exp[id]!.gained).toBe(Math.round(each * expPercent(1, level) / 100));
      const m = r.state.members[id]!; expect(m.level).toBe(exp[id]!.level);
      if (exp[id]!.levelsUp) expect(memberDef(lookup, map, r.state.members, id)!.maxHp).toBeGreaterThan(memberDef(lookup, map, s.members, id)!.maxHp);
    }
  });
  it('elites, the mini-boss and the boss fight at the map\'s fight level (4E), above their reference level', () => {
    for (const e of map.elites) {
      const s = { ...newExpedition(map, lookup, 5, undefined, true), position: { x: e.x + 1, y: e.y }, elitesDefeated: [] };
      const r = move(tileAt(map, s.position)?.kind === 'floor' ? s : { ...s, position: { x: e.x, y: e.y + 1 } }, map, tileAt(map, s.position)?.kind === 'floor' ? 'left' : 'up');
      expect(r.state.battle).toMatchObject({ kind: 'elite', level: e.level });
      expect(e.level).toBeGreaterThan(lookup(e.encounterId)!.level!);
      expect(battleData(r.state, map, lookup)!.enemies[0]!.maxHp).toBeGreaterThan(lookup(e.encounterId)!.enemies[0]!.maxHp);
    }
    expect(map.bossLevel).toBeGreaterThan(lookup(map.bossEncounterId)!.level!);
  });
  it('stops at the level cap and adds 3% stats per level', () => {
    const s = newExpedition(map, lookup, 1);
    const at = (level: number) => memberDef(lookup, map, { guardian: { stars: 1, dupes: 0, level } }, 'guardian')!;
    expect(at(10).maxHp).toBe(Math.round(at(1).maxHp * (100 + 9 * map.progression.levelStatPercent) / 100));
    expect(expToNext(map, 1)).toBe(65); expect(expToNext(map, 9)).toBe(425);
    s.members.guardian = { stars: 1, dupes: 0, level: map.progression.levelCap, exp: 0 };
    expect(s.members.guardian.level).toBe(10);
  });
  it('levels are kept in the profile whatever the outcome', () => {
    const run = newExpedition(map, lookup, 1); run.members.guardian = { stars: 1, dupes: 0, level: 4, exp: 12 };
    for (const outcome of ['complete', 'withdrawn', 'wiped'] as const) expect(settle(newProfile(map, 1), run, outcome, map).members.guardian).toEqual({ stars: 1, dupes: 0, level: 4, exp: 12 });
  });
});

describe('save v7', () => {
  const memory = () => { const v = new Map<string, string>(); return { getItem: (k: string) => v.get(k) ?? null, setItem: (k: string, x: string) => { v.set(k, x); } }; };
  it('round-trips member levels and the battle level; v6 data still loads', () => {
    const run = randomBattle(); run.members.guardian = { stars: 1, dupes: 0, level: 3, exp: 5 };
    const profile = { ...newProfile(map, 4), tutorialDone: true }; profile.members.guardian = { stars: 1, dupes: 0, level: 3, exp: 5 };
    const store = memory(); saveGame(store, { profile, run });
    const back = loadGame(store, map, lookup)!;
    expect(back.run!.members.guardian).toEqual({ stars: 1, dupes: 0, level: 3, exp: 5 }); expect(back.run!.battle!.level).toBe(run.battle!.level);
    const v6 = JSON.stringify({ version: 6, profile: newProfile(map, 4), run: newExpedition(map, lookup, 2) });
    expect(parseGame(v6, map, lookup).profile.members.guardian).toEqual({ stars: 1, dupes: 0 });
  });
  it.each([
    ['a level above the cap', { level: 11, exp: 0 }],
    ['EXP beyond the next level', { level: 2, exp: 140 }],
  ])('rejects %s', (_, bad) => {
    const profile = newProfile(map, 4); profile.members.guardian = { stars: 1, dupes: 0, ...bad };
    expect(() => parseGame(JSON.stringify({ version: 7, profile, run: null }), map, lookup)).toThrow();
  });
});
