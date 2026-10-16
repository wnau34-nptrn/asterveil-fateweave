import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { resolveCommand } from '../src/core/battle/engine';
import { parseGame } from '../src/core/save/expedition-save';
import { newProfile, settle } from '../src/core/world/profile';
import type { Direction, ExpeditionState, Point } from '../src/core/world/types';
import { battleData, battleState, chooseEvent, eventChoiceReason, finishBattle, memberDef, move, newExpedition, pendingEvent, recordBattle, startOf, tileAt } from '../src/core/world/world';
import { battleLesson } from '../src/ui/tutorial';

// Phase 3A (docs/EXPEDITION_DESIGN.md "Events and elites").
const R = map.eventRules;
const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const run = (patch: Partial<ExpeditionState> = {}): ExpeditionState => ({ ...newExpedition(map, lookup, 4, undefined, true), ...patch });
const at = (p: Point, patch: Partial<ExpeditionState> = {}) => run({ position: { ...p }, ...patch });
const max = (s: ExpeditionState, id: string) => memberDef(lookup, map, s.members, id)!.maxHp;
const event = (kind: string) => map.events.find(e => e.kind === kind)!;
// A walkable neighbour of `p` that is not itself an elite gate or an event, and the step back onto `p`.
function approach(p: Point): { from: Point; dir: Direction } {
  const back: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
  for (const [d, o] of Object.entries(dirs) as [Direction, Point][]) {
    const n = { x: p.x + o.x, y: p.y + o.y }; const t = tileAt(map, n);
    if (t && t.kind === 'floor' && !map.elites.some(e => e.x === n.x && e.y === n.y) && !map.events.some(e => e.x === n.x && e.y === n.y)) return { from: n, dir: back[d] };
  }
  throw new Error('no approach');
}
// Floor reachable from the start without stepping on any listed tile.
function reachable(blocked: readonly Point[]): Set<string> {
  const key = (p: Point) => `${p.x},${p.y}`; const start = startOf(map); const seen = new Set([key(start)]); const queue = [start];
  while (queue.length) {
    const p = queue.shift()!;
    for (const o of Object.values(dirs)) {
      const n = { x: p.x + o.x, y: p.y + o.y }; const t = tileAt(map, n);
      if (!t || t.kind === 'wall' || t.kind === 'boss' || seen.has(key(n)) || blocked.some(b => b.x === n.x && b.y === n.y)) continue;
      seen.add(key(n)); queue.push(n);
    }
  }
  return seen;
}
function win(state: ExpeditionState) {
  const data = battleData(state, map, lookup)!; let s = battleState(state, map, lookup)!;
  while (s.outcome === 'active') { const l = battleLesson(s, data)!; s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return finishBattle(recordBattle(state, map, lookup, s.commands), map, lookup);
}

describe('elites', () => {
  it('forced elites hold one-tile gates with no way around; optional elites can be walked around', () => {
    expect(map.elites.some(e => e.forced)).toBe(true); expect(map.elites.some(e => !e.forced)).toBe(true);
    const open = reachable([]); const key = (p: Point) => `${p.x},${p.y}`;
    for (const e of map.elites) {
      expect(tileAt(map, e)?.kind).toBe('floor'); expect(lookup(e.encounterId)).toBeDefined();
      const without = reachable([e]);
      // Without the elite's tile the reachable floor shrinks only when it is a true gate.
      expect(without.size < open.size - 1).toBe(e.forced);
      if (!e.forced) for (const n of Object.values(dirs)) { const p = { x: e.x + n.x, y: e.y + n.y }; if (open.has(key(p))) expect(without.has(key(p))).toBe(true); }
    }
  });
  it('stepping into an unbeaten elite forces its fight; a win opens the gate for the run with an item and double EXP', () => {
    const elite = map.elites[0]!; const { from, dir } = approach(elite);
    const r = move(at(from), map, dir);
    expect(r.event).toEqual({ type: 'encounter', kind: 'elite', encounterId: elite.encounterId, chance: 100 });
    expect(r.state.battle).toMatchObject({ kind: 'elite', source: elite.id });
    const done = win(r.state);
    expect(done.event).toMatchObject({ type: 'victory', kind: 'elite' });
    if (done.event.type !== 'victory') throw new Error();
    expect(done.event.item).toBeDefined(); expect(done.event.item!.rarity).toBeGreaterThanOrEqual(2);
    expect(done.state.elitesDefeated).toEqual([elite.id]);
    // Beaten: the tile is plain floor for the rest of the run.
    const again = move({ ...done.state, position: from }, map, dir);
    expect(again.state.battle).toBeNull(); expect(again.state.position).toEqual({ x: elite.x, y: elite.y });
  });
  it('a lost elite fight sends the team back and the elite stays', () => {
    const elite = map.elites[0]!; const { from, dir } = approach(elite);
    const weak = at(from); for (const id of weak.roster.deployed) weak.hp[id] = 1;
    const s = move(weak, map, dir).state; const data = battleData(s, map, lookup)!;
    let b = battleState(s, map, lookup)!;
    // At 1 HP each the team falls before it can beat the elite.
    for (let i = 0; i < 400 && b.outcome === 'active'; i++) { const l = battleLesson(b, data)!; b = resolveCommand(b, data, { beat: b.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
    expect(b.outcome).toBe('defeat');
    const out = finishBattle(recordBattle(s, map, lookup, b.commands), map, lookup).state;
    expect(out.elitesDefeated).toEqual([]); expect(out.battle).toBeNull();
  });
});

describe('map events', () => {
  it('an event tile asks for a choice instead of rolling an encounter', () => {
    const ev = event('shrine'); const { from, dir } = approach(ev); const s = at(from, { pressure: 100 });
    const r = move(s, map, dir);
    expect(r.event).toEqual({ type: 'event', eventId: ev.id }); expect(r.state.rolls).toBe(s.rolls); expect(r.state.battle).toBeNull();
    expect(pendingEvent(r.state, map)?.id).toBe(ev.id);
    expect(eventChoiceReason(r.state, map, 'fight')).toBe('choice');
    expect(eventChoiceReason(at(from), map, 'pray')).toBe('busy');
  });
  it('shrine: pray heals the standing 25% then wounds every max HP 5% (cap 20); offering trades ore for a seal', () => {
    const ev = event('shrine'); const s = at(ev); const full = max(s, 'guardian'); s.hp.guardian = 10; s.hp.tracer = 0;
    const r = chooseEvent(s, map, lookup, 'pray');
    expect(r.event).toMatchObject({ type: 'eventDone', eventId: ev.id, choice: 'pray' });
    expect(r.state.hp.guardian).toBe(10 + Math.ceil(full * R.prayHeal / 100)); expect(r.state.hp.tracer).toBe(0);
    expect(r.state.members.guardian!.wound).toBe(R.prayWound);
    expect(max(r.state, 'guardian')).toBe(Math.round(full * (100 - R.prayWound) / 100));
    expect(r.state.hp.weaver).toBe(max(r.state, 'weaver'));
    expect(r.state.eventsDone).toEqual([ev.id]); expect(pendingEvent(r.state, map)).toBeUndefined();
    expect(eventChoiceReason(at(ev), map, 'offer')).toBe('ore');
    const o = chooseEvent(at(ev, { resources: { ore: 15, gold: 0, ember: 0, seal: 0 } }), map, lookup, 'offer').state;
    expect(o.resources).toEqual({ ore: 15 - R.offerOre, gold: 0, ember: 0, seal: R.offerSeal });
  });
  it('wounds never pass the cap and stay off the profile', () => {
    const s = at(event('shrine')); s.members.guardian = { ...s.members.guardian!, wound: 18 };
    const r = chooseEvent(s, map, lookup, 'pray').state;
    expect(r.members.guardian!.wound).toBe(R.maxWound);
    expect(settle(newProfile(map, 1), r, 'withdrawn', map).members.guardian?.wound).toBeUndefined();
  });
  it('merchant sells potions for ore up to the carry limit and stays open', () => {
    const ev = event('merchant'); let s = at(ev, { resources: { ore: 100, gold: 0, ember: 0, seal: 0 } });
    for (let i = 0; i < map.potions.carry; i++) s = chooseEvent(s, map, lookup, 'buy-salve').state;
    expect(s.potions.salve).toBe(map.potions.carry); expect(s.resources.ore).toBe(100 - map.potions.carry * R.merchant.salve);
    expect(eventChoiceReason(s, map, 'buy-salve')).toBe('carry');
    expect(s.eventsDone).toEqual([]); expect(pendingEvent(s, map)?.id).toBe(ev.id);
    expect(eventChoiceReason({ ...s, resources: { ore: 1, gold: 0, ember: 0, seal: 0 } }, map, 'buy-tonic')).toBe('ore');
  });
  it('traveller: giving a salve pays ore and a seal', () => {
    const ev = event('traveller');
    expect(eventChoiceReason(at(ev), map, 'help')).toBe('salve');
    const r = chooseEvent(at(ev, { potions: { salve: 1, tonic: 0, repel: 0 } }), map, lookup, 'help').state;
    expect(r.potions.salve).toBe(0); expect(r.resources).toMatchObject({ ore: R.traveller.ore, seal: R.traveller.seal }); expect(r.eventsDone).toEqual([ev.id]);
  });
  it('bandits: sneaking past maxes the zone pressure; fighting is a harder battle that always drops an item', () => {
    const ev = event('bandits'); const zone = map.zones.find(z => z.id === tileAt(map, ev)!.zoneId)!;
    const sneak = chooseEvent(at(ev), map, lookup, 'sneak').state;
    expect(sneak.pressure).toBe(zone.cap); expect(sneak.eventsDone).toEqual([ev.id]); expect(sneak.battle).toBeNull();
    const fight = chooseEvent(at(ev), map, lookup, 'fight');
    expect(fight.event).toMatchObject({ type: 'encounter', kind: 'event' });
    expect(fight.state.battle).toMatchObject({ kind: 'event', source: ev.id });
    expect(zone.pool.map(e => e.encounterId)).toContain(fight.state.battle!.encounterId);
    expect(fight.state.eventsDone).toEqual([]);
    const done = win(fight.state);
    if (done.event.type !== 'victory') throw new Error('lost');
    expect(done.event.item).toBeDefined(); expect(done.state.eventsDone).toEqual([ev.id]);
  });
  it('rift: a won fight pays veil dust that settles into the bank', () => {
    const ev = event('rift'); const fight = chooseEvent(at(ev), map, lookup, 'fight').state;
    expect(fight.battle).toMatchObject({ kind: 'event', encounterId: R.riftEncounterId });
    const done = win(fight);
    if (done.event.type !== 'victory') throw new Error('lost');
    expect(done.event.dust).toBe(R.riftDust); expect(done.event.item).toBeUndefined(); expect(done.state.dust).toBe(R.riftDust);
    expect(settle(newProfile(map, 1), done.state, 'withdrawn', map).bank.dust).toBe(R.riftDust);
    expect(settle(newProfile(map, 1), done.state, 'wiped', map).bank.dust).toBeLessThan(R.riftDust);
  });
});

describe('save v13', () => {
  it('round-trips elites, events, dust, wounds and an active elite battle', () => {
    const elite = map.elites[1]!; const { from, dir } = approach(elite);
    let s = at(from, { elitesDefeated: [map.elites[0]!.id], eventsDone: [event('shrine').id], dust: 7 });
    s.members.guardian = { ...s.members.guardian!, wound: 5 }; s.hp.guardian = max(s, 'guardian');
    s = move(s, map, dir).state;
    const profile = newProfile(map, 3);
    const game = parseGame(JSON.stringify({ version: 13, profile, run: s }), map, lookup);
    expect(game.run).toEqual(s);
  });
  it('rejects an elite battle for a beaten elite or an unknown event', () => {
    const elite = map.elites[0]!; const { from, dir } = approach(elite); const s = move(at(from), map, dir).state;
    expect(() => parseGame(JSON.stringify({ version: 13, profile: newProfile(map, 3), run: { ...s, elitesDefeated: [elite.id] } }), map, lookup)).toThrow();
    expect(() => parseGame(JSON.stringify({ version: 13, profile: newProfile(map, 3), run: { ...run(), eventsDone: ['nowhere'] } }), map, lookup)).toThrow();
  });
  it('a run from an older map version settles home as withdrawn instead of losing the profile', () => {
    const s = run({ mapVersion: map.version - 1, resources: { ore: 40, gold: 0, ember: 1, seal: 2 }, steps: 12, wins: 3 });
    const profile = { ...newProfile(map, 3), bank: { ore: 5, gold: 0, seal: 0, dust: 0 } };
    const game = parseGame(JSON.stringify({ version: 12, profile, run: s }), map, lookup);
    expect(game.run).toBeNull(); expect(game.profile.last?.outcome).toBe('withdrawn');
    expect(game.profile.bank.ore).toBeGreaterThan(5); expect(game.profile.expeditions).toBe(profile.expeditions + 1);
  });
});
