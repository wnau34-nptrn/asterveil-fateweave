import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { forestMap } from '../src/content/world/chapter-forest';
import { chapterOne } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { replay, resolveCommand } from '../src/core/battle/engine';
import { SAVE_VERSION, parseGame, saveGame, type Game } from '../src/core/save/expedition-save';
import { newProfile, settle } from '../src/core/world/profile';
import type { ExpeditionState, MapDefinition, Point, Profile } from '../src/core/world/types';
import { EVENT_CHOICES, battleData, battleState, bossSealed, chooseEvent, eventChoiceReason, findTiles, finishBattle, memberDef, move, newExpedition, questComplete, recordBattle, rollPercent, startOf, tileAt, type BattleReplay } from '../src/core/world/world';
import { campLines, choiceText, eventChoices, eventText, storyQuestText } from '../src/ui/th';
import { battleLesson } from '../src/ui/tutorial';

// P05-02 (owner OD-36–38, save v61): optional story quests on maps 1–2, event choices remembered across runs, the
// abandoned camp and the traveller's second choice, short camp lines and the contract counters (choice log, downed).
const run = (map: MapDefinition, patch: Partial<ExpeditionState> = {}): ExpeditionState => ({ ...newExpedition(map, lookup, 4, undefined, true), ...patch });
const at = (map: MapDefinition, kind: string, patch: Partial<ExpeditionState> = {}) => { const e = map.events.find(x => x.kind === kind)!; return run(map, { position: { x: e.x, y: e.y }, ...patch }); };
const write = (game: Game): string => { let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game); return raw; };
const ids = (s: ExpeditionState) => [...s.roster.deployed, ...s.roster.reserve];
function play(state: ExpeditionState, map: MapDefinition, replayer: BattleReplay = replay) {
  const data = battleData(state, map, lookup)!; let s = battleState(state, map, lookup)!;
  while (s.outcome === 'active') { const l = battleLesson(s, data)!; s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return finishBattle(recordBattle(state, map, lookup, s.commands), map, lookup, replayer);
}
// Floor reachable from the start (walls, the boss and elites block).
function reachable(map: MapDefinition, to: Point): boolean {
  const key = (p: Point) => `${p.x},${p.y}`; const seen = new Set([key(startOf(map))]); const queue = [startOf(map)];
  while (queue.length) {
    const p = queue.shift()!; if (p.x === to.x && p.y === to.y) return true;
    for (const o of [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }]) {
      const n = { x: p.x + o.x, y: p.y + o.y }; const t = tileAt(map, n);
      if (!t || t.kind === 'wall' || t.kind === 'boss' || seen.has(key(n)) || map.elites.some(e => e.x === n.x && e.y === n.y)) continue;
      seen.add(key(n)); queue.push(n);
    }
  }
  return false;
}

describe('P05-02 content', () => {
  it('maps 1–2 have an optional quest whose objectives exist; map 3 keeps its rift seal', () => {
    for (const map of [ruinsMap, forestMap]) {
      expect(map.quest.optional).toBeDefined(); expect(storyQuestText[map.id]).toBeDefined();
      expect(map.quest.need).toBe(map.quest.objectives.length);
      for (const o of map.quest.objectives) {
        if (o.kind === 'event') expect(map.events.some(e => e.id === o.target)).toBe(true);
        if (o.kind === 'chests') expect(o.count).toBeLessThanOrEqual(map.chests.length);
      }
      const r = map.quest.optional!.reward; expect(Object.keys(r).every(k => ['ore', 'gold', 'shard', 'dust', 'potions'].includes(k))).toBe(true);
    }
    expect(chapterOne.quest.optional).toBeUndefined(); expect(chapterOne.quest.need).toBe(2);
  });
  it('the new events sit on reachable floor tiles with text and a choice list matching the rules', () => {
    for (const map of [ruinsMap, forestMap]) for (const e of map.events) {
      expect(tileAt(map, e)?.kind).toBe('floor'); expect(reachable(map, e)).toBe(true);
      expect(map.chests.some(c => c.x === e.x && c.y === e.y) || map.herbs.some(h => h.x === e.x && h.y === e.y)).toBe(false);
    }
    expect(forestMap.events.some(e => e.kind === 'abandoned')).toBe(true);
    for (const kind of Object.keys(EVENT_CHOICES) as (keyof typeof EVENT_CHOICES)[]) {
      expect(eventChoices[kind]).toEqual(EVENT_CHOICES[kind]); expect(eventText[kind].name).toBeTruthy();
      for (const c of EVENT_CHOICES[kind]) expect(choiceText(c, ruinsMap.eventRules).label).toBeTruthy();
    }
  });
});

describe('optional quests never seal the boss', () => {
  it('the map 1 captain can be challenged with no chest opened; the forest lord too', () => {
    for (const map of [ruinsMap, forestMap]) {
      const s = run(map); expect(questComplete(s, map)).toBe(false); expect(bossSealed(s, map)).toBe(false);
      const boss = findTiles(map, 'boss')[0]!; const r = move(run(map, { position: { x: boss.x, y: boss.y + 1 } }), map, 'up', lookup);
      expect(r.event).toMatchObject({ type: 'encounter', kind: 'boss' });
    }
    // The rift seal still holds on map 3.
    expect(bossSealed(run(chapterOne), chapterOne)).toBe(true);
  });
});

describe('traveller: help or point the way', () => {
  it('help needs a salve; guide costs nothing, pays ore, finishes the event and is logged', () => {
    const r = ruinsMap.eventRules; const s = at(ruinsMap, 'traveller');
    expect(eventChoiceReason(s, ruinsMap, 'help')).toBe('salve'); expect(eventChoiceReason(s, ruinsMap, 'guide')).toBe('');
    expect(eventChoiceReason(s, ruinsMap, 'fight')).toBe('choice');
    const out = chooseEvent(s, ruinsMap, lookup, 'guide');
    expect(out.event).toMatchObject({ type: 'eventDone', choice: 'guide' });
    expect(out.state.resources.ore).toBe(s.resources.ore + r.travellerGuide.ore); expect(out.state.potions).toEqual(s.potions);
    expect(out.state.eventsDone).toEqual(['ruins-traveller']); expect(out.state.choices).toEqual({ 'ruins-traveller': 'guide' });
    const helped = chooseEvent(at(ruinsMap, 'traveller', { potions: { salve: 1, tonic: 0, repel: 0, calm: 0 } }), ruinsMap, lookup, 'help');
    expect(helped.state.potions.salve).toBe(0); expect(helped.state.choices).toEqual({ 'ruins-traveller': 'help' });
  });
});

describe('abandoned camp', () => {
  const R = forestMap.eventRules.abandoned;
  it('shelter heals standing members and fills the zone pressure; pass changes nothing but the log', () => {
    const base = at(forestMap, 'abandoned'); const hurt = { ...base, hp: Object.fromEntries(ids(base).map(id => [id, 5])) };
    const out = chooseEvent(hurt, forestMap, lookup, 'shelter');
    for (const id of ids(base)) expect(out.state.hp[id]).toBe(Math.min(memberDef(lookup, forestMap, base, id)!.maxHp, 5 + Math.ceil(memberDef(lookup, forestMap, base, id)!.maxHp * R.healPercent / 100)));
    expect(out.state.pressure).toBe(forestMap.zones.find(z => z.id === 'thicket')!.cap);
    const pass = chooseEvent(base, forestMap, lookup, 'pass');
    expect({ ...pass.state, choices: undefined, eventsDone: [] }).toEqual({ ...base, choices: undefined });
    expect(pass.state.choices).toEqual({ 'forest-camp': 'pass' }); expect(pass.state.eventsDone).toEqual(['forest-camp']);
  });
  it('search pays dust at once, or first wakes a zone battle that pays the dust and no item after the win', () => {
    const seeds = Array.from({ length: 40 }, (_, i) => i + 1);
    const quiet = seeds.find(seed => rollPercent(seed, 0) >= R.searchFightPercent)!, loud = seeds.find(seed => rollPercent(seed, 0) < R.searchFightPercent)!;
    const calm = chooseEvent(at(forestMap, 'abandoned', { seed: quiet, rolls: 0 }), forestMap, lookup, 'search');
    expect(calm.event).toMatchObject({ type: 'eventDone', choice: 'search' }); expect(calm.state.dust).toBe(R.searchDust);
    const woke = chooseEvent(at(forestMap, 'abandoned', { seed: loud, rolls: 0 }), forestMap, lookup, 'search');
    expect(woke.event).toMatchObject({ type: 'encounter', kind: 'event' }); expect(woke.state.battle?.source).toBe('forest-camp');
    expect(forestMap.zones[0]!.pool.some(p => p.encounterId === woke.state.battle!.encounterId)).toBe(true);
    expect(woke.state.dust).toBe(0); expect(woke.state.eventsDone).toEqual([]); expect(woke.state.choices).toEqual({ 'forest-camp': 'search' });
    const won = play(woke.state, forestMap);
    expect(won.event).toMatchObject({ type: 'victory', dust: R.searchDust }); expect(won.event.type === 'victory' && won.event.item).toBeFalsy();
    expect(won.state.eventsDone).toEqual(['forest-camp']); expect(won.state.found).toEqual(woke.state.found);
  });
});

describe('contract counters: downed', () => {
  it('counts members who stood at the start of a battle and fell, on a win or a loss; not the prologue', () => {
    const loud = Array.from({ length: 40 }, (_, i) => i + 1).find(seed => rollPercent(seed, 0) < forestMap.eventRules.abandoned.searchFightPercent)!;
    const fight = chooseEvent(at(forestMap, 'abandoned', { seed: loud, rolls: 0 }), forestMap, lookup, 'search').state;
    // A win where the first deployed member ends down (the replay is edited after the fact).
    const first = fight.roster.deployed[0]!;
    const downOne: BattleReplay = (d, c, e) => { const s = replay(d, c, e); return { ...s, heroes: s.heroes.map(h => h.id === first ? { ...h, hp: 0 } : h) }; };
    const won = play(fight, forestMap, downOne); expect(won.event.type).toBe('victory'); expect(won.state.downed).toBe(1);
    // A loss downs everyone who stood.
    const weak = { ...fight, battle: { ...fight.battle!, entry: Object.fromEntries(Object.keys(fight.battle!.entry).map(id => [id, 1])) } };
    const lost = play(weak, forestMap); expect(lost.event.type).toBe('defeat');
    expect(lost.state.downed).toBe(Object.keys(fight.battle!.entry).length);
    // No battle, no change.
    expect(run(forestMap).downed).toBeUndefined();
  });
});

describe('settling: flags, story reward and camp lines', () => {
  const home = (): Profile => { const p = newProfile(ruinsMap, 3, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true; return p; };
  const done = (patch: Partial<ExpeditionState> = {}) => run(ruinsMap, { openedChests: ruinsMap.chests.map(c => c.id), choices: { 'ruins-traveller': 'guide' }, eventsDone: ['ruins-traveller'], ...patch });
  it('a returning run pays the optional quest once, remembers the choice and lists it for the camp', () => {
    const p0 = home(); const reward = ruinsMap.quest.optional!.reward;
    const p1 = settle(p0, done(), 'withdrawn', ruinsMap);
    expect(p1.storyQuests).toEqual(['ruined-border']); expect(p1.choices).toEqual({ 'ruins-traveller': 'guide' });
    expect(p1.last).toMatchObject({ events: ['ruins-traveller'], story: 'ruined-border' });
    const plain = settle(p0, done({ openedChests: [] }), 'withdrawn', ruinsMap);
    expect(p1.bank.shard - plain.bank.shard).toBe(reward.shard ?? 0); expect(p1.bank.ore - plain.bank.ore).toBe(reward.ore ?? 0);
    expect(plain.storyQuests).toBeUndefined(); expect(plain.last?.story).toBeUndefined();
    // Never twice, and the latest choice replaces the old flag.
    const p2 = settle(p1, done({ choices: { 'ruins-traveller': 'help' } }), 'complete', ruinsMap);
    expect(p2.storyQuests).toEqual(['ruined-border']); expect(p2.last?.story).toBeUndefined(); expect(p2.choices).toEqual({ 'ruins-traveller': 'help' });
    // A wiped run keeps its flags but finishes no quest.
    const wiped = settle(p0, done(), 'wiped', ruinsMap); expect(wiped.storyQuests).toBeUndefined(); expect(wiped.choices).toEqual({ 'ruins-traveller': 'guide' });
    // A run with no event choice leaves the flags as they were.
    const quiet = settle(p1, run(ruinsMap), 'withdrawn', ruinsMap); expect(quiet.choices).toEqual(p1.choices); expect(quiet.last?.events).toBeUndefined();
  });
  it('camp lines name the story quest first, then one short line per choice, at most three', () => {
    const events = MAPS.flatMap(m => m.events);
    const p1 = settle(home(), done(), 'withdrawn', ruinsMap); const lines = campLines(p1, events);
    expect(lines).toEqual([storyQuestText['ruined-border']!.done, expect.stringContaining('ชี้ทาง')]);
    expect(campLines({ last: null }, events)).toEqual([]);
    const many: Profile['last'] = { ...p1.last!, story: undefined, events: ['forest-traveller', 'forest-shrine', 'forest-camp', 'scar-rift'] };
    expect(campLines({ last: many, choices: { 'forest-traveller': 'help', 'forest-shrine': 'pray', 'forest-camp': 'pass', 'scar-rift': 'fight' } }, events)).toHaveLength(3);
  });
});

describe('save v61', () => {
  const profile = (): Profile => { const p = newProfile(ruinsMap, 3, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true; return p; };
  it('round-trips the story flags, paid quests, last result and the run counters', () => {
    expect(SAVE_VERSION).toBe(67);
    const p = settle(profile(), run(ruinsMap, { openedChests: ruinsMap.chests.map(c => c.id), choices: { 'ruins-traveller': 'guide' }, eventsDone: ['ruins-traveller'] }), 'withdrawn', ruinsMap);
    const r = { ...run(forestMap), choices: { 'forest-camp': 'search' as const, 'forest-shrine': 'offer' as const }, downed: 3 };
    const raw = write({ profile: p, run: r }); expect(JSON.parse(raw).version).toBe(67);
    expect(parseGame(raw, forestMap, lookup, MAPS)).toEqual({ profile: p, run: r });
  });
  it('a v60 save without the new fields loads unchanged', () => {
    const p = profile(); const r = run(ruinsMap);
    const back = parseGame(JSON.stringify({ version: 60, profile: p, run: r }), ruinsMap, lookup, MAPS);
    expect(back.profile).toEqual(p); expect(back.run).toEqual(r);
    expect(back.profile.choices).toBeUndefined(); expect(back.run?.downed).toBeUndefined();
  });
  it('rejects forged values and drops flags of events no map has any more', () => {
    const p = profile(); const r = run(forestMap);
    const bad = (pp: unknown, rr: unknown) => () => parseGame(JSON.stringify({ version: 61, profile: pp, run: rr }), forestMap, lookup, MAPS);
    expect(bad(p, { ...r, choices: { 'forest-camp': 'fight' } })).toThrow();
    expect(bad(p, { ...r, choices: { 'ruins-traveller': 'guide' } })).toThrow();
    expect(bad(p, { ...r, downed: 0 })).toThrow(); expect(bad(p, { ...r, downed: 1.5 })).toThrow();
    expect(bad({ ...p, choices: { 'forest-shrine': 'help' } }, r)).toThrow();
    expect(bad({ ...p, storyQuests: ['veil-frontier'] }, r)).toThrow(); expect(bad({ ...p, storyQuests: ['ruined-border', 'ruined-border'] }, r)).toThrow();
    expect(bad({ ...p, last: { outcome: 'complete', ore: 0, gold: 0, shard: 0, steps: 1, wins: 0, items: 0, salvaged: 0, story: 'veil-frontier' } }, r)).toThrow();
    const kept = parseGame(JSON.stringify({ version: 61, profile: { ...p, choices: { 'gone-event': 'help', 'forest-shrine': 'pray' } }, run: r }), forestMap, lookup, MAPS);
    expect(kept.profile.choices).toEqual({ 'forest-shrine': 'pray' });
  });
});
