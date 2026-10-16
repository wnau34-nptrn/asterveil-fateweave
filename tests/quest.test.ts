import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { resolveCommand } from '../src/core/battle/engine';
import type { Direction, ExpeditionState, Point } from '../src/core/world/types';
import { battleData, battleState, finishBattle, findTiles, move, newExpedition, questComplete, questDone, recordBattle, tileAt } from '../src/core/world/world';
import { battleLesson } from '../src/ui/tutorial';

// Phase 3B (docs/EXPEDITION_DESIGN.md "Rift seal and mini-boss").
const run = (patch: Partial<ExpeditionState> = {}): ExpeditionState => ({ ...newExpedition(map, lookup, 4, undefined, true), ...patch });
const [boss] = findTiles(map, 'boss');
const below = { x: boss!.x, y: boss!.y + 1 };
const golem = map.elites.find(e => e.mini)!;
function win(state: ExpeditionState) {
  const data = battleData(state, map, lookup)!; let s = battleState(state, map, lookup)!;
  while (s.outcome === 'active') { const l = battleLesson(s, data)!; s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return finishBattle(recordBattle(state, map, lookup, s.commands), map, lookup);
}

describe('rift seal (2 of 3)', () => {
  it('has three objectives, needs two, and every target exists on the map', () => {
    expect(map.quest.need).toBe(2); expect(map.quest.objectives).toHaveLength(3);
    for (const o of map.quest.objectives) {
      if (o.kind === 'elite') expect(map.elites.some(e => e.id === o.target)).toBe(true);
      else if (o.kind === 'event') expect(map.events.some(e => e.id === o.target)).toBe(true);
      else if (o.kind === 'chests') expect(o.count).toBeLessThanOrEqual(map.chests.length);
    }
  });
  it('counts each objective from the run state; any two break the seal', () => {
    const chests = map.chests.slice(0, 4).map(c => c.id);
    expect(questDone(run(), map)).toEqual([]);
    expect(questDone(run({ openedChests: chests.slice(0, 3) }), map)).toEqual([]);
    expect(questDone(run({ openedChests: chests }), map)).toEqual(['chests']);
    expect(questDone(run({ elitesDefeated: [golem.id], eventsDone: ['scar-rift'] }), map)).toEqual(['golem', 'rift']);
    for (const patch of [{ openedChests: chests, elitesDefeated: [golem.id] }, { openedChests: chests, eventsDone: ['scar-rift'] }, { elitesDefeated: [golem.id], eventsDone: ['scar-rift'] }])
      expect(questComplete(run(patch), map)).toBe(true);
    expect(questComplete(run({ elitesDefeated: [golem.id] }), map)).toBe(false);
  });
  it('the boss stays sealed (no battle, no step) until two objectives are done', () => {
    const sealed = move(run({ position: below }), map, 'up');
    expect(sealed.event).toEqual({ type: 'blocked', reason: 'sealed' }); expect(sealed.state.position).toEqual(below); expect(sealed.state.battle).toBeNull();
    const open = move(run({ position: below, openedChests: map.chests.slice(0, 4).map(c => c.id), eventsDone: ['scar-rift'] }), map, 'up');
    expect(open.event).toMatchObject({ type: 'encounter', kind: 'boss' });
  });
});

describe('mini-boss', () => {
  it('stands in the scar off the main path and is optional', () => {
    expect(tileAt(map, golem)?.zoneId).toBe('scar'); expect(golem.forced).toBe(false);
    expect(lookup(golem.encounterId)?.enemies.find(e => e.id === 'brute')?.art).toBe('foe_golem');
  });
  it('pays its own loot table, epic-or-better gear and EXP ×3, without the optional-elite bonus', () => {
    const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const [dir, o] = (Object.entries(dirs) as [Direction, Point][]).find(([, o]) => tileAt(map, { x: golem.x - o.x, y: golem.y - o.y })?.kind === 'floor')!;
    const start = move(run({ position: { x: golem.x - o.x, y: golem.y - o.y } }), map, dir);
    expect(start.event).toMatchObject({ type: 'encounter', kind: 'elite', encounterId: golem.encounterId });
    const done = win(start.state);
    if (done.event.type !== 'victory') throw new Error('lost');
    const L = map.eventRules.miniBoss.loot;
    expect(done.event.loot.ore).toBeGreaterThanOrEqual(L.ore[0]); expect(done.event.loot.ore).toBeLessThanOrEqual(L.ore[1]);
    expect(done.event.loot.gold).toBeGreaterThanOrEqual(L.gold[0]); expect(done.event.loot.gold).toBeLessThanOrEqual(L.gold[1]);
    expect(done.event.loot.seal).toBeGreaterThanOrEqual(1); expect(done.event.loot.seal).toBeLessThanOrEqual(2);
    expect(done.event.item!.rarity).toBeGreaterThanOrEqual(3);
    expect(done.state.elitesDefeated).toEqual([golem.id]); expect(questDone(done.state, map)).toEqual(['golem']);
  });
});
