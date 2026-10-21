import { describe, expect, it } from 'vitest';
import { encounterById, encounters } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { createBattle, currentHeroId, resolveCommand, skillPower } from '../src/core/battle/engine';
import { clearLegacySaves, expeditionKey, legacyKeys, loadGame, parseGame, saveGame, type StoragePort } from '../src/core/save/expedition-save';
import { boardOffers, commanderReason, createCommander, departure, dismiss, dismissReason, groupOf, hire, hireReason, newProfile, placeMember, settle, upgrade, upgradeCost, upgradeReason } from '../src/core/world/profile';
import type { Direction, ExpeditionState, Point, Profile } from '../src/core/world/types';
import { startPrologue, chooseEvent, questComplete, atMuster, heroCatalog, battleData, battleState, canOpenChest, memberDef, moveMember, swapMembers, canRest, canRevive, chestAt, encounterChance, findTiles, finishBattle, isRevealed, move, newExpedition, openChest, recordBattle, rest, revive, rollPercent, startOf, tileAt } from '../src/core/world/world';
import { actorArt, artOf } from '../src/game/visuals/assets';
import { battleLesson } from '../src/ui/tutorial';

const lookup = encounterById;
// A larger hero catalog (until hiring exists) to exercise the 4 + 4 roster.
const extras = ['guardian', 'tracer', 'weaver', 'healer'].map(id => ({ ...encounterById(map.tutorialEncounterId)!.heroes.find(h => h.id === id)!, id: `${id}-b` }));
const rosterLookup = (id: string) => id === map.tutorialEncounterId ? { ...encounterById(id)!, heroes: [...encounterById(id)!.heroes, ...extras] } : encounterById(id);
const fresh = (seed = 7) => newExpedition(map, lookup, seed);
// Two rift-seal objectives done (3B): the boss can be challenged.
const sealBroken = { elitesDefeated: ['scar-golem'], eventsDone: ['scar-rift'] };
const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
function memory(): StoragePort & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }, removeItem: k => { values.delete(k); } };
}
// Breadth-first route over walkable tiles, optionally treating the boss as passable.
function route(from: Point, to: Point, throughBoss = false, puzzlesOpen = false): Direction[] {
  const opened = (p: Point) => puzzlesOpen && (map.puzzles.secrets.some(s => s.x === p.x && s.y === p.y) || [...map.puzzles.runes, ...map.puzzles.levers].some(d => d.door.x === p.x && d.door.y === p.y));
  const key = (p: Point) => `${p.x},${p.y}`; const prev = new Map<string, [string, Direction]>(); const queue = [from]; const seen = new Set([key(from)]);
  while (queue.length) {
    const p = queue.shift()!;
    if (p.x === to.x && p.y === to.y) break;
    for (const [d, o] of Object.entries(dirs) as [Direction, Point][]) {
      const n = { x: p.x + o.x, y: p.y + o.y }; const t = tileAt(map, n);
      const stone = !puzzlesOpen && map.puzzles.boulders.some(b => (b.at.x === n.x && b.at.y === n.y) || (b.pit.x === n.x && b.pit.y === n.y));
      if (!t || stone || (t.kind === 'wall' && !opened(n)) || (t.kind === 'boss' && !throughBoss) || seen.has(key(n))) continue;
      seen.add(key(n)); prev.set(key(n), [key(p), d]); queue.push(n);
    }
  }
  const path: Direction[] = []; let cur = key(to);
  while (cur !== key(from)) { const step = prev.get(cur); if (!step) return []; path.unshift(step[1]); cur = step[0]; }
  return path;
}
// Plays the active battle with the teaching advisor until it ends, then applies it.
function fight(state: ExpeditionState): ExpeditionState {
  // The encounter as fought: deployed party (stars/levels) and the battle's monster level.
  const data = battleData(state, map, lookup)!; let s = battleState(state, map, lookup)!;
  while (s.outcome === 'active') { const l = battleLesson(s, data)!; s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return finishBattle(recordBattle(state, map, lookup, s.commands), map, lookup).state;
}

describe('chapter map', () => {
  it('has one start, two camps, a boss guarding the only way to the goal, and rectangular rows', () => {
    expect(new Set(map.rows.map(r => r.length)).size).toBe(1);
    expect(findTiles(map, 'start')).toHaveLength(1); expect(findTiles(map, 'camp')).toHaveLength(2);
    const [boss] = findTiles(map, 'boss'); const [goal] = findTiles(map, 'goal');
    for (const camp of findTiles(map, 'camp')) expect(route(startOf(map), camp).length).toBeGreaterThan(0);
    expect(route(startOf(map), goal!)).toEqual([]);
    expect(route(startOf(map), goal!, true).length).toBeGreaterThan(0);
    expect(boss).toBeDefined();
    for (const zone of map.zones) for (const e of zone.pool) expect(lookup(e.encounterId)).toBeDefined();
    expect(lookup(map.tutorialEncounterId)).toBeDefined(); expect(lookup(map.bossEncounterId)).toBeDefined();
  });
});

describe('expedition rules', () => {
  it('moves one tile at a time, blocks walls and edges, and reveals fog around the party', () => {
    const s = fresh(); const start = startOf(map);
    expect(isRevealed(s, map, start)).toBe(true); expect(isRevealed(s, map, { x: 0, y: 0 })).toBe(false);
    expect(move({ ...s, position: { x: 5, y: 25 } }, map, 'left').event).toEqual({ type: 'blocked', reason: 'wall' });
    const r = move(s, map, 'left');
    expect(r.state.position).toEqual({ x: start.x - 1, y: start.y }); expect(r.state.steps).toBe(1);
    expect(s.position).toEqual(start);
  });
  it('rolls are deterministic per seed and step; pressure raises the shown chance until an encounter', () => {
    expect(rollPercent(1, 0)).toBe(rollPercent(1, 0));
    let s = fresh(11); const seen: number[] = [];
    for (let i = 0; i < 40 && !s.battle; i++) {
      const before = encounterChance(s, map, { x: s.position.x + (i % 2 ? 1 : -1), y: s.position.y });
      const r = move(s, map, i % 2 ? 'right' : 'left'); s = r.state;
      if (r.event.type === 'moved' && r.event.chance) { seen.push(r.event.chance); expect(r.event.chance).toBe(before); }
    }
    expect(s.battle?.kind).toBe('tutorial');
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    const again = (() => { let t = fresh(11); for (let i = 0; i < 40 && !t.battle; i++) t = move(t, map, i % 2 ? 'right' : 'left').state; return t; })();
    expect(again).toEqual(s);
  });
  it('blocks movement during a battle and resumes at the same tile with surviving HP after victory', () => {
    let s = fresh(3);
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    const where = s.position;
    expect(move(s, map, 'up').event).toEqual({ type: 'blocked', reason: 'busy' });
    const data = lookup(s.battle.encounterId)!;
    let b = battleState(s, map, lookup)!;
    b = resolveCommand(b, data, { beat: b.beat, heroId: currentHeroId(b, data)!, action: 'attack', targetId: 'raider' }).state;
    s = recordBattle(s, map, lookup, b.commands);
    expect(() => finishBattle(s, map, lookup)).toThrow();
    s = fight(s);
    expect(s.battle).toBeNull(); expect(s.position).toEqual(where); expect(s.tutorialDone).toBe(true); expect(s.wins).toBe(1);
    expect(Object.values(s.hp).some(hp => hp < 76)).toBe(true);
  });
  it('carries fallen heroes into the next battle; a rest heals the standing by half and embers revive one at a time', () => {
    let s = fresh(5); s.tutorialDone = true; s.hp = { guardian: 30, tracer: 0, weaver: 20, healer: 10 };
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    expect(s.battle.kind).toBe('random');
    expect(s.battle.entry).toEqual({ guardian: 30, tracer: 0, weaver: 20, healer: 10 });
    expect(createBattle(lookup(s.battle.encounterId)!, { hp: s.battle.entry }).order).not.toContain('tracer');
    const camp = findTiles(map, 'camp')[1]!;
    let t: ExpeditionState = { ...fresh(5), position: camp, hp: { guardian: 1, tracer: 0, weaver: 0, healer: 40 }, pressure: 20 };
    expect(canRest(t, map)).toBe(true);
    t = rest(t, map, lookup).state;
    expect(t.hp).toEqual({ guardian: 39, tracer: 0, weaver: 0, healer: 46 }); expect(t.pressure).toBe(0); expect(t.camp).toEqual(camp);
    expect(t.restReady).toBe(false); expect(canRest(t, map)).toBe(false);
    expect(rest(t, map, lookup).event).toEqual({ type: 'blocked', reason: 'busy' });
    expect(canRevive(t, map, 'tracer')).toBe(false);
    t = { ...t, resources: { ore: 0, gold: 0, ember: 1, seal: 0 } };
    expect(canRevive(t, map, 'guardian')).toBe(false);
    const r = revive(t, map, lookup, 'tracer');
    expect(r.event).toEqual({ type: 'revived', heroId: 'tracer' });
    expect(r.state.hp).toMatchObject({ tracer: 17, weaver: 0 }); expect(r.state.resources.ember).toBe(0);
    expect(revive(r.state, map, lookup, 'weaver').event.type).toBe('blocked');
    expect(canRest(fresh(), map)).toBe(false);
  });
  it('a camp becomes the return point on arrival, and a victory relights the campfire', () => {
    const camp = findTiles(map, 'camp')[1]!;
    let s: ExpeditionState = { ...fresh(5), position: { x: camp.x - 1, y: camp.y } };
    s = move(s, map, 'right').state;
    expect(s.camp).toEqual(camp); expect(s.battle).toBeNull();
    s = rest(s, map, lookup).state; expect(s.restReady).toBe(false);
    s = { ...s, position: { x: 10, y: 22 } };
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    s = fight(s); expect(s.restReady).toBe(true);
  });
  it('defeat leaves the deployed members down at the last camp; losing every brought member wipes the run; a lost tutorial restarts', () => {
    const loseWith = (state: ExpeditionState, l = lookup) => {
      const data = battleData(state, map, l)!; let b = battleState(state, map, l)!;
      while (b.outcome === 'active') b = resolveCommand(b, data, { beat: b.beat, heroId: currentHeroId(b, data)!, action: 'attack', targetId: b.enemies.find(e => e.hp > 0)!.id }).state;
      return { state: recordBattle(state, map, l, b.commands), outcome: b.outcome };
    };
    const camp = findTiles(map, 'camp')[0]!;
    const s: ExpeditionState = { ...fresh(9), tutorialDone: true, camp, restReady: false, hp: { guardian: 5, tracer: 3, weaver: 2, healer: 1 } };
    s.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...s.hp }, commands: [] };
    const lost = loseWith(s); expect(lost.outcome).toBe('defeat');
    const after = finishBattle(lost.state, map, lookup);
    expect(after.event).toEqual({ type: 'defeat', kind: 'random', encounterId: 'veil-siege', wiped: true }); expect(after.state.battle).toBeNull();
    expect(after.state.hp).toEqual({ guardian: 0, tracer: 0, weaver: 0, healer: 0 }); expect(after.state.defeats).toBe(1);
    // With a living reserve the run goes on; the party must swap at camp before walking on.
    const r: ExpeditionState = { ...newExpedition(map, rosterLookup, 9), tutorialDone: true, camp, restReady: false,
      roster: { deployed: ['guardian', 'tracer', 'weaver', 'healer'], reserve: ['guardian-b'] }, hp: { guardian: 5, tracer: 3, weaver: 2, healer: 1, 'guardian-b': 40 } };
    r.battle = { kind: 'random', encounterId: 'veil-siege', entry: { guardian: 5, tracer: 3, weaver: 2, healer: 1 }, commands: [] };
    const down = finishBattle(loseWith(r, rosterLookup).state, map, rosterLookup);
    expect(down.event).toEqual({ type: 'defeat', kind: 'random', encounterId: 'veil-siege' });
    expect(down.state.hp).toEqual({ guardian: 0, tracer: 0, weaver: 0, healer: 0, 'guardian-b': 40 }); expect(down.state.restReady).toBe(false);
    expect(move(down.state, map, 'left').event).toEqual({ type: 'blocked', reason: 'party' });
    const swapped = swapMembers(down.state, 'guardian', 'guardian-b').state;
    expect(swapped.roster).toEqual({ deployed: ['guardian-b', 'tracer', 'weaver', 'healer'], reserve: ['guardian'] });
    expect(move(swapped, map, 'left').event.type).not.toBe('blocked');
    const t: ExpeditionState = { ...fresh(9), hp: { guardian: 1, tracer: 1, weaver: 1, healer: 1 } };
    t.battle = { kind: 'tutorial', encounterId: 'first-clash', entry: { ...t.hp }, commands: [] };
    const retry = finishBattle(loseWith(t).state, map, lookup).state;
    expect(retry.battle).toEqual({ kind: 'tutorial', encounterId: 'first-clash', entry: { guardian: 76, tracer: 56, weaver: 48, healer: 46 }, commands: [] });
    expect(retry.tutorialDone).toBe(false);
  });
  it('manages the brought 4 + 4 anywhere outside battle: swaps, benches and deploys keep one member deployed', () => {
    const camp = findTiles(map, 'camp')[1]!;
    let s: ExpeditionState = { ...newExpedition(map, rosterLookup, 4), position: camp,
      roster: { deployed: ['guardian', 'tracer', 'weaver', 'healer'], reserve: ['tracer-b', 'weaver-b'] } };
    s.hp = { ...s.hp, 'tracer-b': 56, 'weaver-b': 48 };
    // Away from a muster point it works too (map bag, 2026-10-17); never during a battle or after the goal.
    expect(swapMembers({ ...s, position: { x: 10, y: 22 } }, 'tracer', 'tracer-b').event.type).toBe('roster');
    expect(swapMembers({ ...s, battle: { kind: 'random', encounterId: 'x', entry: {}, commands: [] } }, 'tracer', 'tracer-b').event.type).toBe('blocked');
    expect(moveMember({ ...s, completed: true }, 'healer').event.type).toBe('blocked');
    expect(atMuster({ ...s, position: startOf(map) }, map)).toBe(true);
    expect(swapMembers(s, 'tracer', 'weaver').event.type).toBe('blocked');
    s = swapMembers(s, 'tracer-b', 'tracer').state;
    expect(s.roster).toEqual({ deployed: ['guardian', 'tracer-b', 'weaver', 'healer'], reserve: ['tracer', 'weaver-b'] });
    expect(moveMember(s, 'weaver-b').event.type).toBe('blocked'); // party is full
    s = moveMember(s, 'healer').state; s = moveMember(s, 'weaver-b').state;
    expect(s.roster).toEqual({ deployed: ['guardian', 'tracer-b', 'weaver', 'weaver-b'], reserve: ['tracer', 'healer'] });
    for (const id of ['tracer-b', 'weaver']) s = moveMember(s, id).state;
    expect(s.roster).toEqual({ deployed: ['guardian', 'weaver-b'], reserve: ['tracer', 'healer', 'tracer-b', 'weaver'] });
    expect(moveMember(s, 'weaver-b').event.type).toBe('blocked'); // reserve is full
    let solo: ExpeditionState = { ...fresh(4), position: camp };
    for (const id of ['tracer', 'weaver', 'healer']) solo = moveMember(solo, id).state;
    expect(solo.roster.deployed).toEqual(['guardian']); expect(moveMember(solo, 'guardian').event.type).toBe('blocked');
    // A rest heals the reserve too; the next battle enters with the deployed members only.
    s = { ...s, hp: { ...s.hp, healer: 10 } }; s = rest(s, map, rosterLookup).state; expect(s.hp.healer).toBe(33);
    s = { ...s, position: { x: 10, y: 22 }, tutorialDone: true };
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    expect(Object.keys(s.battle.entry)).toEqual(['guardian', 'weaver-b']);
    expect(battleData(s, map, rosterLookup)!.heroes.map(h => h.id)).toEqual(['guardian', 'weaver-b']);
  });
  it('the boss blocks its tile, and only its defeat opens the goal', () => {
    const [boss] = findTiles(map, 'boss'); const below = { x: boss!.x, y: boss!.y + 1 };
    // The rift seal (3B) holds until two objectives are done.
    let s = { ...fresh(2), tutorialDone: true, position: below };
    expect(move(s, map, 'up').event).toEqual({ type: 'blocked', reason: 'sealed' });
    s = { ...s, ...sealBroken };
    const r = move(s, map, 'up'); expect(r.event).toMatchObject({ type: 'encounter', kind: 'boss' }); expect(r.state.position).toEqual(below);
    s = fight(r.state); expect(s.bossDefeated).toBe(true);
    s = move(s, map, 'up').state; expect(s.position).toEqual(boss);
    s = move(s, map, 'up').state; const g = move(s, map, 'up');
    expect(g.event).toEqual({ type: 'goal' }); expect(g.state.completed).toBe(true);
    expect(move(g.state, map, 'down').event).toEqual({ type: 'blocked', reason: 'busy' });
  });
  it('a full expedition from start to goal is winnable with the advisor and camp rests', () => {
    let s = fresh(2026); const [campA, campB] = [findTiles(map, 'camp')[1]!, findTiles(map, 'camp')[0]!]; const [goal] = findTiles(map, 'goal');
    const walk = (to: Point, throughBoss = false) => {
      for (let guard = 0; guard < 400 && (s.position.x !== to.x || s.position.y !== to.y) && !s.completed; guard++) {
        const dir = route(s.position, to, throughBoss || s.bossDefeated)[0]!; s = move(s, map, dir).state;
        if (s.battle) s = fight(s);
      }
    };
    const camp = () => { for (const id of Object.keys(s.hp)) if (canRevive(s, map, id)) s = revive(s, map, lookup, id).state; if (canRest(s, map)) s = rest(s, map, lookup).state; };
    walk(campA); camp(); walk(campB); camp();
    // The rift seal (3B): beat the mini-boss and clear the rift, resting at the last camp in between.
    const golem = map.elites.find(e => e.mini)!; const rift = map.events.find(e => e.id === 'scar-rift')!;
    expect(move({ ...s, position: { x: findTiles(map, 'boss')[0]!.x, y: findTiles(map, 'boss')[0]!.y + 1 } }, map, 'up').event).toEqual({ type: 'blocked', reason: 'sealed' });
    walk(golem); walk(campB); camp(); walk(rift);
    s = fight(chooseEvent(s, map, lookup, 'fight').state); walk(campB); camp();
    expect(questComplete(s, map)).toBe(true);
    walk(goal!, true);
    expect(s.completed).toBe(true); expect(s.tutorialDone).toBe(true); expect(s.bossDefeated).toBe(true); expect(s.wins).toBeGreaterThan(2);
    // Levels (2D-1): every brought member grew on the way; this short advisor route reaches level 6.
    for (const m of Object.values(s.members)) expect(m.level).toBeGreaterThanOrEqual(4);
    // Forced elites (3A) hold one-tile gates on the way, so the run had to beat them.
    for (const e of map.elites.filter(e => e.forced)) expect(s.elitesDefeated).toContain(e.id);
  });
});

describe('commander', () => {
  it('validates the name, crest and colour and stores a normalised name', () => {
    const p = newProfile(map, 1); expect(p.commander).toBeNull();
    expect(commanderReason({ name: '', crest: 'star', color: 'gold', camp: 'ค่ายอารี' })).toBe('name');
    expect(commanderReason({ name: 'ก'.repeat(21), crest: 'star', color: 'gold', camp: 'ค่ายอารี' })).toBe('name');
    expect(commanderReason({ name: '<b>', crest: 'star', color: 'gold', camp: 'ค่ายอารี' })).toBe('name');
    expect(commanderReason({ name: 'อารี', crest: 'dragon', color: 'gold', camp: 'ค่ายอารี' })).toBe('crest');
    expect(commanderReason({ name: 'อารี', crest: 'star', color: 'teal', camp: 'ค่ายอารี' })).toBe('color');
    const r = createCommander(p, { name: '  ผู้กอง   อารี ', crest: 'guard', color: 'cyan', camp: 'ค่ายอารี' });
    expect(r.event).toEqual({ type: 'commander' }); expect(r.profile.commander).toEqual({ name: 'ผู้กอง อารี', crest: 'guard', color: 'cyan', camp: 'ค่ายอารี' });
    expect(createCommander(p, { name: '', crest: 'guard', color: 'cyan', camp: 'ค่ายอารี' }).event.type).toBe('blocked');
  });
  it('migrates a v5 profile without a commander and round-trips one with a commander', () => {
    const p5: Partial<Profile> = newProfile(map, 4); delete p5.commander;
    expect(parseGame(JSON.stringify({ version: 5, profile: p5, run: null }), map, lookup).profile.commander).toBeNull();
    const withCommander = createCommander(newProfile(map, 4), { name: 'Ari', crest: 'flag', color: 'rose', camp: 'ค่ายอารี' }).profile;
    expect(parseGame(JSON.stringify({ version: 6, profile: withCommander, run: null }), map, lookup).profile).toEqual(withCommander);
  });
});

describe('lobby profile', () => {
  const rich = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(map, 21), bank: { ore: 500, gold: 0, seal: 0, dust: 0 }, ...patch });
  it('stars scale max HP, Attack and skill power by 8% each but never SPD', () => {
    const p = rich({ members: { guardian: { stars: 3, dupes: 0 }, tracer: { stars: 1, dupes: 0 }, weaver: { stars: 1, dupes: 0 }, healer: { stars: 1, dupes: 0 } } });
    const g = memberDef(lookup, map, p.members, 'guardian')!;
    expect([g.maxHp, g.attack, g.speed, g.skillBonus]).toEqual([88, 12, 80, 16]);
    const run = departure(p, map, lookup, 5); expect(run.hp.guardian).toBe(88);
    run.battle = { kind: 'random', encounterId: 'veil-siege', entry: { guardian: 88, tracer: 56, weaver: 48, healer: 46 }, commands: [] };
    const data = battleData(run, map, lookup)!;
    expect(skillPower(data, 'guardian', 'bash')).toBe(21); expect(skillPower(data, 'tracer', 'execute')).toBe(28);
  });
  it('offers a fixed board per return; hiring a company member stores a duplicate; a new one joins the reserve', () => {
    // The board refreshes per return; find one whose first offer is already in the company.
    let p = rich({ bank: { ore: 100, gold: 100, seal: 0, dust: 0 } });
    while (!p.members[boardOffers(p, map, lookup)[0]!] && p.returns < 50) p = { ...p, returns: p.returns + 1 };
    const offers = boardOffers(p, map, lookup);
    expect(offers).toHaveLength(3); expect(new Set(offers).size).toBe(3); expect(boardOffers(p, map, lookup)).toEqual(offers);
    const r = hire(p, map, lookup, 0);
    expect(r.event).toEqual({ type: 'hired', heroId: offers[0], duplicate: true });
    p = r.profile; expect(p.members[offers[0]!]!.dupes).toBe(1); expect(p.bank.ore).toBe(100); expect(p.bank.gold).toBe(100 - map.company.hireCost); expect(p.taken).toEqual([0]);
    expect(hireReason(p, map, lookup, 0)).toBe('taken');
    expect(hireReason({ ...p, bank: { ore: 999, gold: map.company.hireCost - 1, seal: 0, dust: 0 } }, map, lookup, 1)).toBe('gold');
    let q = rich({ bank: { ore: 999, gold: 999, seal: 0, dust: 0 } }); let guard = 0;
    while (q.company.length < 8 && guard++ < 60) {
      const i = boardOffers(q, map, rosterLookup).findIndex((id, n) => !q.members[id] && !q.taken.includes(n));
      if (i < 0) { q = { ...q, returns: q.returns + 1, taken: [] }; continue; }
      const id = boardOffers(q, map, rosterLookup)[i]!; q = hire(q, map, rosterLookup, i).profile;
      expect(q.company.at(-1)).toBe(id); expect(q.members[id]).toEqual({ stars: 1, dupes: 0 });
    }
    expect(q.party.reserve).toHaveLength(4); expect(q.company).toHaveLength(8);
  });
  it('upgrades with duplicates and ore, lets one seal replace one duplicate, and caps at ★5', () => {
    let p = rich({ bank: { ore: 500, gold: 0, seal: 1, dust: 0 } });
    expect(upgradeCost(p, map, 'guardian')).toEqual({ dupes: 0, seals: 1, ore: 20 }); expect(upgradeReason(p, map, 'guardian')).toBe('');
    p = upgrade(p, map, 'guardian').profile; expect(p.members.guardian).toEqual({ stars: 2, dupes: 0 }); expect(p.bank).toEqual({ ore: 480, gold: 0, seal: 0, dust: 0 });
    expect(upgradeReason(p, map, 'guardian')).toBe('dupes');
    p.members.guardian!.dupes = 1; p.bank.seal = 1;
    expect(upgradeCost(p, map, 'guardian')).toEqual({ dupes: 1, seals: 1, ore: 40 });
    p = upgrade(p, map, 'guardian').profile; expect(p.members.guardian).toEqual({ stars: 3, dupes: 0 });
    p.members.guardian = { stars: 5, dupes: 9 }; expect(upgradeReason(p, map, 'guardian')).toBe('maxed');
  });
  it('dismissing loses progress, refunds half the hire cost and never empties the deployment', () => {
    let p = rich({ bank: { ore: 0, gold: 0, seal: 0, dust: 0 }, members: { guardian: { stars: 2, dupes: 1 }, tracer: { stars: 1, dupes: 0 }, weaver: { stars: 1, dupes: 0 }, healer: { stars: 1, dupes: 0 } } });
    p = dismiss(p, map, 'guardian').profile;
    expect(p.company).toEqual(['tracer', 'weaver', 'healer']); expect(p.party.deployed).toEqual(['tracer', 'weaver', 'healer']); expect(p.members.guardian).toBeUndefined(); expect(p.bank.gold).toBe(map.company.dismissRefund);
    p = dismiss(dismiss(p, map, 'tracer').profile, map, 'weaver').profile;
    expect(dismissReason(p, 'healer')).toBe('last'); expect(dismiss(p, map, 'healer').event.type).toBe('blocked');
  });
  it('chooses the 4 + 4 from the company: swaps and moves between deployed, reserve and the bench', () => {
    let p: Profile = { ...rich(), company: ['guardian', 'tracer', 'weaver', 'healer', 'guardian-b', 'tracer-b'],
      members: { ...rich().members, 'guardian-b': { stars: 1, dupes: 0 }, 'tracer-b': { stars: 1, dupes: 0 } } };
    expect(groupOf(p, 'guardian-b')).toBe('bench');
    p = placeMember(p, 'guardian-b', 'deployed', 'guardian').profile;
    expect(p.party.deployed).toEqual(['guardian-b', 'tracer', 'weaver', 'healer']); expect(groupOf(p, 'guardian')).toBe('bench');
    p = placeMember(p, 'guardian', 'reserve').profile; p = placeMember(p, 'healer', 'bench').profile;
    expect(p.party).toEqual({ deployed: ['guardian-b', 'tracer', 'weaver'], reserve: ['guardian'] });
    expect(placeMember(p, 'tracer-b', 'deployed').profile.party.deployed).toEqual(['guardian-b', 'tracer', 'weaver', 'tracer-b']);
    let solo = rich(); for (const id of ['tracer', 'weaver', 'healer']) solo = placeMember(solo, id, 'bench').profile;
    expect(placeMember(solo, 'guardian', 'bench').event).toEqual({ type: 'blocked', reason: 'last' });
    const run = departure(p, map, rosterLookup, 3);
    expect(run.roster).toEqual(p.party); expect(Object.keys(run.hp)).toEqual(['guardian-b', 'tracer', 'weaver', 'guardian']);
  });
  it('settles a finished run: complete and withdrawn keep everything, a wipe keeps half; embers never leave', () => {
    const p = rich({ bank: { ore: 10, gold: 0, seal: 1, dust: 0 } });
    const run = { ...departure(p, map, lookup, 3), resources: { ore: 41, gold: 0, ember: 3, seal: 3 }, steps: 50, wins: 4, tutorialDone: true };
    expect(settle(p, run, 'complete', map)).toMatchObject({ bank: { ore: 51, gold: 0, seal: 4, dust: 0 }, completes: 1, expeditions: 1, returns: 1, tutorialDone: true, last: { outcome: 'complete', ore: 41, seal: 3, steps: 50, wins: 4 } });
    expect(settle(p, run, 'withdrawn', map).bank).toEqual({ ore: 51, gold: 0, seal: 4, dust: 0 });
    const wiped = settle({ ...p, taken: [0] }, run, 'wiped', map);
    expect(wiped.bank).toEqual({ ore: 30, gold: 0, seal: 2, dust: 0 }); expect(wiped.completes).toBe(0); expect(wiped.taken).toEqual([]);
    expect(boardOffers(wiped, map, lookup)).not.toBe(boardOffers(p, map, lookup));
  });
});

describe('resources and chests', () => {
  it('places every chest on a reachable floor tile with a unique id', () => {
    expect(new Set(map.chests.map(c => c.id)).size).toBe(map.chests.length);
    for (const c of map.chests) {
      expect(tileAt(map, c)?.kind).toBe('floor');
      // Vault and secret chests (3C) sit behind puzzle doors and secret walls: reachable once those are open.
      const behind = c.id.endsWith('-vault') || c.id.endsWith('-secret');
      expect(route(startOf(map), c).length > 0).toBe(!behind);
      if (behind) expect(route(startOf(map), c, false, true).length).toBeGreaterThan(0);
    }
  });
  it('opens a chest once, with loot fixed by the seed and roll counter', () => {
    const chest = map.chests.find(c => c.tier === 'rare')!;
    const s: ExpeditionState = { ...fresh(12), position: { x: chest.x, y: chest.y } };
    expect(chestAt(map, s.position)).toEqual(chest); expect(canOpenChest(s, map)).toBe(true);
    const a = openChest(s, map); const b = openChest(s, map);
    expect(a).toEqual(b);
    if (a.event.type !== 'chest') throw new Error('expected a chest');
    expect(a.event.loot.seal).toBe(1); expect(a.event.loot.ember).toBe(1);
    const rare = map.loot.chest.rare.ore; expect(a.event.loot.ore).toBeGreaterThanOrEqual(rare[0]); expect(a.event.loot.ore).toBeLessThanOrEqual(rare[1]);
    expect(a.state.resources).toEqual(a.event.loot); expect(a.state.openedChests).toEqual([chest.id]);
    expect(canOpenChest(a.state, map)).toBe(false); expect(openChest(a.state, map).event.type).toBe('blocked');
    expect(canOpenChest(fresh(), map)).toBe(false);
  });
  it('a victory adds loot from its zone, the tutorial grants an ember and the boss grants seals', () => {
    let s = fresh(3);
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    s = fight(s);
    expect(s.resources).toEqual({ ore: 10, gold: 5, ember: 1, seal: 0 });
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    const before = s.resources.ore; const goldBefore = s.resources.gold; s = fight(s);
    const zone = map.zones.find(z => z.id === 'meadow')!.loot!;
    expect(s.resources.ore - before).toBeGreaterThanOrEqual(zone.ore[0]); expect(s.resources.ore - before).toBeLessThanOrEqual(zone.ore[1]);
    expect(s.resources.gold - goldBefore).toBeGreaterThanOrEqual(zone.gold[0]); expect(s.resources.gold - goldBefore).toBeLessThanOrEqual(zone.gold[1]);
    const [boss] = findTiles(map, 'boss');
    let t: ExpeditionState = { ...fresh(2), tutorialDone: true, position: { x: boss!.x, y: boss!.y + 1 }, ...sealBroken };
    t = fight(move(t, map, 'up').state);
    expect(t.resources).toEqual({ ore: map.loot.boss.ore[0], gold: map.loot.boss.gold[0], ember: 1, seal: 2 });
  });
});

describe('game save', () => {
  const game = (run: ExpeditionState | null = fresh(), profile = newProfile(map, 4)) => ({ profile, run });
  const v6 = (run: unknown, profile: unknown = newProfile(map, 4)) => JSON.stringify({ version: 6, profile, run });
  it('round-trips the profile and an in-progress battle by replay', () => {
    const storage = memory(); let s = fresh(3);
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    const data = lookup(s.battle.encounterId)!; let b = battleState(s, map, lookup)!;
    b = resolveCommand(b, data, { beat: b.beat, heroId: 'tracer', action: 'mark', targetId: 'brute' }).state;
    s = recordBattle(s, map, lookup, b.commands);
    expect(saveGame(storage, game(s))).toBe(true);
    expect(loadGame(storage, map, lookup)).toEqual(game(s));
    expect(battleState(loadGame(storage, map, lookup)!.run!, map, lookup)).toEqual(b);
    expect(saveGame(storage, game(null))).toBe(true); expect(loadGame(storage, map, lookup)).toEqual(game(null));
  });
  it.each([
    ['malformed', () => '{bad'],
    ['wrong version', (s: ExpeditionState) => JSON.stringify({ version: 999, profile: newProfile(map, 4), run: s })],
    ['wall position', (s: ExpeditionState) => v6({ ...s, position: { x: 0, y: 0 } })],
    ['hp above max', (s: ExpeditionState) => v6({ ...s, hp: { ...s.hp, tracer: 99 } })],
    ['foreign owner command', (s: ExpeditionState) => v6({ ...s, battle: { kind: 'random', encounterId: 'veil-siege', entry: s.hp, commands: [{ beat: 1, heroId: 'guardian', action: 'attack', targetId: 'brute' }] } })],
    ['unknown encounter', (s: ExpeditionState) => v6({ ...s, battle: { kind: 'random', encounterId: 'crystal-rift', entry: s.hp, commands: [] } })],
    ['negative ore', (s: ExpeditionState) => v6({ ...s, resources: { ore: -1, gold: 0, ember: 0, seal: 0 } })],
    ['extra resource', (s: ExpeditionState) => v6({ ...s, resources: { ore: 1, gold: 0, ember: 0, seal: 0, gem: 5 } })],
    ['unknown chest', (s: ExpeditionState) => v6({ ...s, openedChests: ['vault'] })],
    ['repeated chest', (s: ExpeditionState) => v6({ ...s, openedChests: ['meadow-west', 'meadow-west'] })],
    ['missing campfire flag', (s: ExpeditionState) => v6({ ...s, restReady: 'yes' })],
    ['unknown roster member', (s: ExpeditionState) => v6({ ...s, roster: { deployed: ['guardian', 'ghost'], reserve: [] } })],
    ['duplicate roster member', (s: ExpeditionState) => v6({ ...s, roster: { deployed: ['guardian', 'tracer', 'weaver', 'healer'], reserve: ['healer'] } })],
    ['empty deployment', (s: ExpeditionState) => v6({ ...s, roster: { deployed: [], reserve: ['guardian', 'tracer', 'weaver', 'healer'] } })],
    ['hp for a non-member', (s: ExpeditionState) => v6({ ...s, roster: { deployed: ['guardian', 'tracer', 'weaver'], reserve: [] } })],
    ['star above max', (s: ExpeditionState) => v6({ ...s, members: { ...s.members, guardian: { stars: 6, dupes: 0 } } })],
    ['member missing progress', (s: ExpeditionState) => v6({ ...s, members: { guardian: { stars: 1, dupes: 0 } } })],
    ['bad fog', (s: ExpeditionState) => v6({ ...s, revealed: 'x' })],
    ['run member outside the company', (s: ExpeditionState) => v6(s, { ...newProfile(map, 4), company: ['guardian', 'tracer', 'weaver'], party: { deployed: ['guardian'], reserve: [] },
      members: { guardian: { stars: 1, dupes: 0 }, tracer: { stars: 1, dupes: 0 }, weaver: { stars: 1, dupes: 0 } } })],
    ['party outside the company', (s: ExpeditionState) => v6(s, { ...newProfile(map, 4), party: { deployed: ['guardian-b'], reserve: [] } })],
    ['company over the cap', (s: ExpeditionState) => v6(s, { ...newProfile(map, 4), company: Array.from({ length: 21 }, () => 'guardian') })],
    ['negative bank', (s: ExpeditionState) => v6(s, { ...newProfile(map, 4), bank: { ore: -5, seal: 0 } })],
    ['board index out of range', (s: ExpeditionState) => v6(s, { ...newProfile(map, 4), taken: [7] })],
    ['commander with an unknown crest', (s: ExpeditionState) => v6(s, { ...newProfile(map, 4), commander: { name: 'Ari', crest: 'dragon', color: 'gold', camp: 'ค่ายอารี' } })],
    ['commander with an empty name', (s: ExpeditionState) => v6(s, { ...newProfile(map, 4), commander: { name: '   ', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } })],
    ['commander missing from a v6 profile', (s: ExpeditionState) => { const p: Partial<Profile> = newProfile(map, 4); delete p.commander; return v6(s, p); }],
    ['unknown result', (s: ExpeditionState) => v6(s, { ...newProfile(map, 4), last: { outcome: 'fled', ore: 0, seal: 0, steps: 0, wins: 0 } })],
  ])('rejects %s', (_, make) => {
    expect(() => parseGame(make(fresh()), map, lookup)).toThrow();
    expect(loadGame({ getItem: () => make(fresh()), setItem: () => {} }, map, lookup)).toBeUndefined();
  });
  it('migrates v1–v4 single-run saves into a profile built from the run roster', () => {
    const v2: Partial<ExpeditionState> = { ...fresh(8), steps: 4, resources: { ore: 9, gold: 0, ember: 1, seal: 0 } }; delete v2.roster; delete v2.members;
    const g2 = parseGame(JSON.stringify({ version: 2, state: v2 }), map, lookup);
    expect(g2.run).toEqual({ ...fresh(8), steps: 4, resources: { ore: 9, gold: 0, ember: 1, seal: 0 } });
    expect(g2.profile).toMatchObject({ company: ['guardian', 'tracer', 'weaver', 'healer'], party: { deployed: ['guardian', 'tracer', 'weaver', 'healer'], reserve: [] }, bank: { ore: 0, gold: 0, seal: 0, dust: 0 } });
    const v1: Partial<ExpeditionState> = { ...fresh(8), steps: 4 };
    delete v1.resources; delete v1.openedChests; delete v1.restReady; delete v1.roster; delete v1.members;
    expect(parseGame(JSON.stringify({ version: 1, state: v1 }), map, lookup).run).toEqual({ ...fresh(8), steps: 4 });
    const v4 = { ...fresh(8), board: { key: '10,16:0', taken: [1] }, members: { ...fresh(8).members, guardian: { stars: 2, dupes: 0 } }, hp: { ...fresh(8).hp, guardian: 82 } };
    const g4 = parseGame(JSON.stringify({ version: 4, state: v4 }), map, lookup);
    expect(g4.run).not.toHaveProperty('board'); expect(g4.profile.members.guardian).toEqual({ stars: 2, dupes: 0 });
    const done = parseGame(JSON.stringify({ version: 4, state: { ...fresh(8), completed: true, resources: { ore: 20, gold: 0, ember: 1, seal: 1 } } }), map, lookup);
    expect(done.run).toBeNull(); expect(done.profile.bank).toEqual({ ore: 20, gold: 0, seal: 1, dust: 0 }); expect(done.profile.last?.outcome).toBe('complete');
  });
  it('round-trips an active battle fought by a hired mercenary in a non-default slot', () => {
    const roster = { deployed: ['garran', 'tracer', 'weaver', 'healer'], reserve: ['guardian'] };
    const members = Object.fromEntries([...roster.deployed, ...roster.reserve].map(id => [id, { stars: id === 'garran' ? 2 : 1, dupes: 0 }]));
    let s = newExpedition(map, lookup, 6, { roster, members }, true);
    s.battle = { kind: 'random', encounterId: 'veil-siege', entry: Object.fromEntries(roster.deployed.map(id => [id, s.hp[id]!])), commands: [] };
    const data = battleData(s, map, lookup)!; let b = battleState(s, map, lookup)!;
    b = resolveCommand(b, data, { beat: b.beat, heroId: 'tracer', action: 'attack', targetId: 'brute' }).state; s = recordBattle(s, map, lookup, b.commands);
    const profile = { ...newProfile(map, 4), company: ['guardian', 'tracer', 'weaver', 'healer', 'garran'], members, party: roster };
    expect(parseGame(v6(s, profile), map, lookup)).toEqual({ profile, run: s });
    expect(s.hp.garran).toBe(76);
  });
  it('tolerates absent or denied storage and clears practice-mode slots', () => {
    const denied: StoragePort = { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Denied'); } };
    expect(saveGame(undefined, game())).toBe(false); expect(saveGame(denied, game())).toBe(false);
    expect(loadGame(denied, map, lookup)).toBeUndefined();
    const storage = memory(); for (const k of legacyKeys) storage.setItem(k, 'x'); storage.setItem(expeditionKey, 'keep');
    clearLegacySaves(storage); expect([...storage.values.keys()]).toEqual([expeditionKey]);
  });
  it('settles a run that already ended on enemy opening turns instead of discarding the save', () => {
    const s = { ...fresh(4), tutorialDone: true, hp: { guardian: 0, tracer: 0, weaver: 0, healer: 1 }, resources: { ore: 9, gold: 0, ember: 2, seal: 0 } };
    s.battle = { kind: 'random', encounterId: 'scout-patrol', entry: { ...s.hp }, commands: [] };
    expect(battleState(s, map, lookup)!.outcome).toBe('defeat');
    const loaded = parseGame(v6(s), map, lookup);
    expect(loaded.run).toBeNull(); expect(loaded.profile.last).toMatchObject({ outcome: 'wiped', ore: 4 }); expect(loaded.profile.bank.ore).toBe(4);
    for (const data of encounters) expect(() => createBattle(data, { hp: { guardian: 0, tracer: 0, weaver: 0, healer: 1 } })).not.toThrow();
  });
});

describe('character art', () => {
  it('maps every hireable mercenary and every encounter enemy to its own illustrated frame', () => {
    const ids = [...heroCatalog(lookup, map).map(h => h.id), ...encounters.flatMap(e => e.enemies.map(x => artOf(e, x.id)))];
    for (const id of new Set(ids)) expect(actorArt[id], id).toBeDefined();
    // All nine Veil Frontier foes fight somewhere, and every random pool entry exists.
    expect(Object.keys(actorArt).filter(k => k.startsWith('foe_')).every(k => ids.includes(k))).toBe(true);
    for (const zone of map.zones) for (const p of zone.pool) expect(encounterById(p.encounterId), p.encounterId).toBeDefined();
    const used = Object.values(actorArt).map(a => `${a.sheet}:${a.frame}`);
    expect(new Set(used).size).toBe(used.length);
  });
});

describe('gold coins (hiring currency, save v14)', () => {
  it('v13 data migrates: the bank gets one hire of gold, the run and the last result start at 0 gold', () => {
    const p = newProfile(map, 4) as Partial<Profile> & { bank: Record<string, number> }; const run = fresh(5) as ExpeditionState & { resources: Record<string, number> };
    delete (p.bank as Record<string, number>).gold; delete (run.resources as Record<string, number>).gold;
    const g = parseGame(JSON.stringify({ version: 13, profile: { ...p, last: { outcome: 'withdrawn', ore: 3, seal: 0, steps: 1, wins: 0, items: 0, salvaged: 0 } }, run }), map, lookup);
    expect(g.profile.bank.gold).toBe(map.company.hireCost); expect(g.profile.last?.gold).toBe(0); expect(g.run!.resources.gold).toBe(0);
  });
  it('gold rides with the run and settles home like ore (half on a wipe)', () => {
    const run = { ...fresh(5), resources: { ore: 0, gold: 41, ember: 0, seal: 0 } };
    expect(settle(newProfile(map, 1), run, 'withdrawn', map).bank.gold).toBe(41);
    expect(settle(newProfile(map, 1), run, 'wiped', map).bank.gold).toBe(20);
    expect(settle(newProfile(map, 1), run, 'complete', map).last?.gold).toBe(41);
  });
});

describe('prologue', () => {
  it('a first expedition meets Vargoth\'s vanguard at the start tile before any step; later runs and moved runs do not', () => {
    const s = fresh(9);
    const r = startPrologue(s, map);
    expect(r.event).toEqual({ type: 'encounter', kind: 'tutorial', encounterId: map.tutorialEncounterId, chance: 100 });
    expect(r.state.battle).toMatchObject({ kind: 'tutorial', encounterId: map.tutorialEncounterId }); expect(r.state.position).toEqual(s.position);
    expect(startPrologue({ ...s, tutorialDone: true }, map).event.type).toBe('blocked');
    expect(startPrologue(r.state, map).event.type).toBe('blocked');
    expect(startPrologue({ ...s, steps: 1 }, map).event.type).toBe('blocked');
    // Won, it marks the tutorial done like any tutorial battle.
    expect(fight(r.state).tutorialDone).toBe(true);
  });
});
