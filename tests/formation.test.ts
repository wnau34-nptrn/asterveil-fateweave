import { describe, expect, it } from 'vitest';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { mercenaries } from '../src/content/heroes/mercenaries';
import { createBattle, currentHeroId, enemyIntent, previewCommand, replay, resolveCommand, screened, targetOptions, withParty } from '../src/core/battle/engine';
import type { BattleState, EncounterDefinition, HeroDefinition } from '../src/core/battle/types';
import { formation, laneReason, placed, withLane } from '../src/core/world/formation';
import { depart, newProfile, placeMember, setPartyLane } from '../src/core/world/profile';
import { battleData, battleLanes, heroDef, recommendedLane, setLane } from '../src/core/world/world';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import type { Lane, Roster } from '../src/core/world/types';

// Formation (owner 2026-10-22): the column a hero stands in is its lane in the rules; each column holds at most 3.
const rec = recommendedLane(lookup, map);
const party = veilSiege.heroes; // guardian/tracer front, weaver/healer back
const lined = (lanes: Record<string, Lane>, heroes: readonly HeroDefinition[] = party): EncounterDefinition => withParty(veilSiege, placed(heroes, lanes));
const firstValid = (s: BattleState, d: EncounterDefinition) => targetOptions(s, d, currentHeroId(s, d)!, 'attack').find(t => t.valid)!.id;
const until = (s: BattleState, d: EncounterDefinition, id: string) => {
  while (currentHeroId(s, d) !== id) s = resolveCommand(s, d, { beat: s.beat, heroId: currentHeroId(s, d)!, action: 'attack', targetId: firstValid(s, d) }).state;
  return s;
};
// Every physical move this round lands on one of `ids`.
const physicalTargets = (s: BattleState, d: EncounterDefinition) =>
  d.enemies.flatMap(e => { const i = enemyIntent(s, d, e.id, s.round); return i && i.kind === 'physical' ? [i.targetId] : []; });

describe('formation lanes', () => {
  const roster: Roster = { deployed: ['guardian', 'tracer', 'weaver', 'healer'], reserve: [] };
  it('defaults to class lanes and caps a column at three, later slots stepping over', () => {
    expect(formation(roster, rec)).toEqual({ guardian: 'front', tracer: 'front', weaver: 'back', healer: 'back' });
    const fronts: Roster = { deployed: ['guardian', 'tracer', 'sefa', 'brann'], reserve: [] };
    expect(formation(fronts, rec)).toEqual({ guardian: 'front', tracer: 'front', sefa: 'front', brann: 'back' });
    expect(formation({ ...roster, lanes: { weaver: 'front', healer: 'front' } }, rec)).toEqual({ guardian: 'front', tracer: 'front', weaver: 'front', healer: 'back' });
  });
  it('moves a member, trades two, and refuses a fourth in a column', () => {
    const three = withLane(roster, rec, 'weaver', 'front');
    expect(formation(three, rec)).toEqual({ guardian: 'front', tracer: 'front', weaver: 'front', healer: 'back' });
    expect(laneReason(three, rec, 'healer', 'front')).toBe('full');
    expect(laneReason(three, rec, 'healer', 'front', 'tracer')).toBe('');
    expect(formation(withLane(three, rec, 'healer', 'front', 'tracer'), rec)).toEqual({ guardian: 'front', tracer: 'back', weaver: 'front', healer: 'front' });
    expect(laneReason(three, rec, 'weaver', 'front')).toBe('same');
    expect(laneReason(three, rec, 'mira', 'front')).toBe('unknown');
    expect(laneReason(three, rec, 'healer', 'front', 'healer')).toBe('unknown');
    const oneFront = withLane(withLane(roster, rec, 'tracer', 'back'), rec, 'weaver', 'back');
    expect(Object.values(formation(oneFront, rec)).filter(l => l === 'back')).toHaveLength(3);
  });
});

describe('lanes in battle rules', () => {
  it('a mage standing in front is screened from the back row; standing behind it reaches it', () => {
    const front = lined({ weaver: 'front', tracer: 'back' });
    let s = until(createBattle(front), front, 'weaver');
    expect(screened(s, front, 'weaver', 'attack', 'b1')).toBe(true);
    s = until(s, front, 'tracer'); expect(screened(s, front, 'tracer', 'attack', 'b1')).toBe(false);
  });
  it('a knight standing behind is not hit by physical moves while a front hero stands, then is', () => {
    const d = lined({ guardian: 'back', weaver: 'front' });
    const s = createBattle(d);
    const targets = physicalTargets(s, d); expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) expect(['tracer', 'weaver']).toContain(t);
    const down = structuredClone(s); for (const h of down.heroes) if (h.id === 'tracer' || h.id === 'weaver') h.hp = 0;
    for (const t of physicalTargets(down, d)) expect(['guardian', 'healer']).toContain(t);
  });
  it('3 front / 1 back and 1 front / 3 back steer physical moves to the front column', () => {
    const threeOne = lined({ weaver: 'front' });
    for (const t of physicalTargets(createBattle(threeOne), threeOne)) expect(t).not.toBe('healer');
    const oneThree = lined({ tracer: 'back', weaver: 'back' });
    for (const t of physicalTargets(createBattle(oneThree), oneThree)) expect(t).toBe('guardian');
  });
  it('a spear brace counts allies by the lane they stand in; preview equals resolve and replays', () => {
    const garran = mercenaries.find(m => m.id === 'garran')!;
    const heroes = [garran, party[1]!, party[2]!, party[3]!];
    const d = lined({ weaver: 'front' }, heroes);
    let s = until(createBattle(d), d, 'garran');
    const c = { beat: s.beat, heroId: 'garran', action: 'brace' as const, targetId: 'garran' };
    const r = resolveCommand(s, d, c); expect(previewCommand(s, d, c)).toEqual(r);
    s = r.state; expect(replay(d, s.commands)).toEqual(s);
  });
});

describe('formation in the world and save v36', () => {
  it('is set at the camp, travels with the party, and is fixed when a battle starts', () => {
    let p = newProfile(map, 5);
    expect(setPartyLane(p, map, lookup, 'weaver', 'front').event.type).toBe('party');
    p = setPartyLane(p, map, lookup, 'weaver', 'front').profile;
    expect(setPartyLane(p, map, lookup, 'healer', 'front').event).toEqual({ type: 'blocked', reason: 'full' });
    const { run } = depart(p, map, lookup, 9);
    expect(battleLanes(run, map, lookup)).toEqual({ guardian: 'front', tracer: 'front', weaver: 'front', healer: 'back' });
    run.battle = { kind: 'random', encounterId: map.tutorialEncounterId, entry: { ...run.hp }, commands: [], lanes: { ...run.roster.lanes! } };
    expect(battleData(run, map, lookup)!.heroes.find(h => h.id === 'weaver')!.lane).toBe('front');
    expect(setLane(run, map, lookup, 'weaver', 'back').event.type).toBe('blocked');
    let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, { profile: p, run });
    expect(JSON.parse(raw).version).toBe(44); expect(parseGame(raw, map, lookup)).toEqual({ profile: p, run });
    const bad = JSON.parse(raw); bad.run.roster.lanes.weaver = 'middle'; expect(() => parseGame(JSON.stringify(bad), map, lookup)).toThrow();
    const stray = JSON.parse(raw); stray.run.battle.lanes = { mira: 'front' }; expect(() => parseGame(JSON.stringify(stray), map, lookup)).toThrow();
  });
  it('changes on the map outside battle; a benched member keeps its column', () => {
    const { run } = depart(newProfile(map, 5), map, lookup, 9);
    const moved = setLane(run, map, lookup, 'guardian', 'back', 'weaver');
    expect(moved.event.type).toBe('roster');
    expect(battleLanes(moved.state, map, lookup)).toEqual({ guardian: 'back', tracer: 'front', weaver: 'front', healer: 'back' });
    let p = setPartyLane(newProfile(map, 5), map, lookup, 'weaver', 'front').profile;
    p = placeMember(p, 'weaver', 'reserve').profile; p = placeMember(p, 'weaver', 'deployed').profile;
    expect(formation(p.party, rec).weaver).toBe('front');
  });
  it('a v35 battle keeps every class lane, uncapped', () => {
    const { profile, run } = depart(newProfile(map, 5), map, lookup, 9);
    run.roster = { deployed: ['guardian', 'tracer', 'sefa', 'brann'], reserve: ['weaver', 'healer'] };
    for (const id of ['sefa', 'brann']) { run.members[id] = { stars: 1, dupes: 0 }; run.hp[id] = heroDef(lookup, map, id)!.maxHp; profile.company.push(id); profile.members[id] = { stars: 1, dupes: 0 }; }
    run.battle = { kind: 'random', encounterId: map.tutorialEncounterId, entry: Object.fromEntries(run.roster.deployed.map(id => [id, run.hp[id]!])), commands: [] };
    const raw = JSON.stringify({ version: 35, profile, run });
    const back = parseGame(raw, map, lookup).run!;
    expect(back.battle!.lanes).toBeUndefined();
    expect(battleData(back, map, lookup)!.heroes.map(h => h.lane)).toEqual(['front', 'front', 'front', 'front']);
    // A new battle with the same party caps the front column at three.
    back.battle = { ...back.battle!, lanes: {} }; expect(battleData(back, map, lookup)!.heroes.map(h => h.lane)).toEqual(['front', 'front', 'front', 'back']);
  });
});
