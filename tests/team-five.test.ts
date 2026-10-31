import { describe, expect, it } from 'vitest';
import { encounters, encounterById as lookup, riftLegion, riftWarden, thornHost } from '../src/content/encounters/catalog';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { mercenaries } from '../src/content/heroes/mercenaries';
import { SPECIES, foes } from '../src/content/enemies/species';
import { chapterOne as map } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { ENEMY_SLOTS, createBattle, currentHeroId, encounterProblems, enemyIntent, previewCommand, replay, resolveCommand, roundOrder, screened, targetOptions, withParty } from '../src/core/battle/engine';
import type { BattleState, EncounterDefinition, HeroDefinition } from '../src/core/battle/types';
import { parseGame, saveGame, type Game } from '../src/core/save/expedition-save';
import { formation, laneReason } from '../src/core/world/formation';
import { depart, newProfile, placeMember, reserveSlots } from '../src/core/world/profile';
import { PARTY_SLOTS, type ExpeditionState, type Profile } from '../src/core/world/types';
import { battleData, battleState, fatigueCut, fatigueOf, finishBattle, memberDef, moveMember, newExpedition, recommendedLane, recordBattle, rest, usePotion, potionReason, findTiles } from '../src/core/world/world';
import { battleLesson } from '../src/ui/tutorial';
import { xpAt } from './fixtures/camp-level';

// P02 (OD-05/OD-11): up to five a side, two appended foe slots, reserve by chapter, fatigue, the calming draught and the
// A6c reserve recovery (save v45).
const merc = (id: string) => mercenaries.find(m => m.id === id)!;
const five: HeroDefinition[] = [...veilSiege.heroes, merc('garran')];
const play = (data: EncounterDefinition, s: BattleState = createBattle(data)): BattleState => {
  while (s.outcome === 'active' && s.commands.length < 300) { const l = battleLesson(s, data)!; s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return s;
};
const write = (game: Game): string => { let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game); return raw; };
const firstValid = (s: BattleState, d: EncounterDefinition) => targetOptions(s, d, currentHeroId(s, d)!, 'attack').find(t => t.valid)!.id;
const pass = (s: BattleState, d: EncounterDefinition) => ({ beat: s.beat, heroId: currentHeroId(s, d)!, action: 'attack' as const, targetId: firstValid(s, d) });

describe('five a side in the resolver', () => {
  it('appends f3/b3 without reordering the first four slots; encounters field 1–5 foes', () => {
    expect(ENEMY_SLOTS.slice(0, 4)).toEqual(['f1', 'f2', 'b1', 'b2']); expect(ENEMY_SLOTS.slice(4)).toEqual(['f3', 'b3']);
    for (const e of encounters) expect(encounterProblems(e), e.id).toEqual([]);
    expect(thornHost.enemies.map(e => e.id)).toEqual(['f1', 'f2', 'f3', 'b1', 'b2']);
    expect(riftLegion.enemies.map(e => e.id)).toEqual(['f1', 'f2', 'b1', 'b2', 'b3']);
    const six = { ...thornHost, ...foes(5, [['f1', SPECIES.thornBeetle], ['f2', SPECIES.thornBeetle], ['f3', SPECIES.thornBeetle], ['b1', SPECIES.sporePuff], ['b2', SPECIES.sporePuff], ['b3', SPECIES.sporePuff]]) };
    expect(encounterProblems(six)).toContain('thorn-host: 6 foes');
    // Five new-set foes appear on the maps.
    expect(MAPS.flatMap(m => m.zones.flatMap(z => z.pool.map(p => p.encounterId)))).toEqual(expect.arrayContaining(['thorn-host', 'rift-legion']));
  });
  it('fields five heroes, never six; ten actors each take one turn a round in SPD order', () => {
    expect(() => withParty(thornHost, [...five, merc('mira')])).toThrow();
    const d = withParty(thornHost, five); const s = createBattle(d);
    expect(s.order).toHaveLength(10); expect(new Set(s.order).size).toBe(10);
    const tied = { ...d, heroes: d.heroes.map(h => ({ ...h, speed: 70 })), enemies: d.enemies.map(e => ({ ...e, speed: 70 })) };
    expect(roundOrder(createBattle(tied), tied)).toEqual(['guardian', 'tracer', 'weaver', 'healer', 'garran', 'f1', 'f2', 'f3', 'b1', 'b2']);
    // Round 1 to round 2: every surviving actor acted exactly once.
    let r = createBattle(d); const acted: string[] = [];
    while (r.round === 1 && r.outcome === 'active') {
      const res = resolveCommand(r, d, { beat: r.beat, heroId: currentHeroId(r, d)!, action: 'attack', targetId: firstValid(r, d) });
      acted.push(...res.turns.filter(t => t.round === 1).map(t => t.actorId)); r = res.state;
    }
    expect(new Set(acted).size).toBe(acted.length);
  });
  it('plays 5v5, 5v1 and 1v5 with exact previews and deterministic replay', () => {
    const cases: EncounterDefinition[] = [withParty(thornHost, five), withParty(riftLegion, five), withParty({ ...veilSiege, ...foes(1, [['f1', SPECIES.tusker]]) }, five), withParty(thornHost, [merc('garran')])];
    for (const d of cases) {
      let s = createBattle(d);
      while (s.outcome === 'active' && s.commands.length < 300) {
        const l = battleLesson(s, d)!; const c = { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId };
        const r = resolveCommand(s, d, c); expect(previewCommand(s, d, c)).toEqual(r); s = r.state;
      }
      expect(s.outcome).not.toBe('active'); expect(replay(d, s.commands)).toEqual(s);
    }
    expect(play(withParty(thornHost, five)).outcome).toBe('victory'); expect(play(withParty(riftLegion, five)).outcome).toBe('victory');
  });
  it('f3 screens the back row like f1/f2; b3 is reachable once the front row falls', () => {
    const d = withParty(thornHost, five); const s = createBattle(d);
    expect(screened(s, d, 'guardian', 'attack', 'b2')).toBe(true);
    const onlyF3 = { ...s, enemies: s.enemies.map(e => e.id === 'f3' || e.id.startsWith('b') ? e : { ...e, hp: 0 }) } as BattleState;
    expect(screened(onlyF3, d, 'guardian', 'attack', 'b1')).toBe(true);
    const open = { ...s, enemies: s.enemies.map(e => e.id.startsWith('f') ? { ...e, hp: 0 } : e) } as BattleState;
    expect(screened(open, d, 'guardian', 'attack', 'b1')).toBe(false);
    const l = withParty(riftLegion, five); const ls = { ...createBattle(l), enemies: createBattle(l).enemies.map(e => e.id.startsWith('f') ? { ...e, hp: 0 } : e) } as BattleState;
    expect(screened(ls, l, 'guardian', 'attack', 'b3')).toBe(false);
  });
  it('a move on the fifth party slot aims at the fifth hero', () => {
    const d = withParty(riftLegion, [...veilSiege.heroes, merc('mira')]); const s = createBattle(d);
    const fifthMove = d.intents.find(i => i.targetSlot === 4)!; expect(fifthMove.sourceId).toBe('b3');
    expect(enemyIntent(s, d, 'b3', 1)!.targetId).toBe('mira');
  });
  it('a boss phase summons only into room: five standing or a full row leaves the reserve waiting', () => {
    // The warden with its front guard only (its P02 back guard b3 and hard-mode f3 left out).
    const alone = { ...riftWarden, enemies: riftWarden.enemies.filter(e => !['b3', 'f3'].includes(e.id)), intents: riftWarden.intents.filter(i => !['b3', 'f3'].includes(i.sourceId)), phases: riftWarden.phases!.map(p => ({ ...p, hardSummon: undefined })) };
    const roomy = withParty(alone, five);
    const crowd: EncounterDefinition = { ...roomy, enemies: [...roomy.enemies, ...foes(10, [['f3', SPECIES.shardCrawler], ['b3', SPECIES.riftWisp]]).enemies],
      intents: [...roomy.intents, ...foes(10, [['f3', SPECIES.shardCrawler], ['b3', SPECIES.riftWisp]]).intents],
      phases: [{ sourceId: 'f1', below: 70, summon: ['b1', 'b2'], name: 'Call the Rift' }] };
    // f1 (the boss, below its threshold and fastest) f2 f3 b3 stand: the phase calls b1 and b2 but only one fits.
    const crowdData = { ...crowd, enemies: crowd.enemies.map(e => e.id === 'f1' ? { ...e, speed: 999 } : e) };
    expect(encounterProblems(crowdData)).toEqual([]);
    const entryFoe = (data: EncounterDefinition) => ({ ...data, enemies: data.enemies.map(e => e.id === 'f1' ? { ...e, maxHp: 1000 } : e) });
    const low = entryFoe(crowdData); const s = createBattle({ ...low, phases: [{ sourceId: 'f1', below: 100, summon: ['b1', 'b2'], name: 'Call the Rift' }] });
    expect(s.enemies.filter(e => e.hp > 0)).toHaveLength(5);
    expect(s.enemies.find(e => e.id === 'b1')!.absent).toBeUndefined(); expect(s.enemies.find(e => e.id === 'b2')!.absent).toBe(true);
    // With room (no f3/b3) both arrive.
    const open = createBattle({ ...entryFoe({ ...roomy, enemies: roomy.enemies.map(e => e.id === 'f1' ? { ...e, speed: 999 } : e) }), phases: [{ sourceId: 'f1', below: 100, summon: ['b1', 'b2'], name: 'Call the Rift' }] });
    expect(open.enemies.filter(e => !e.absent && e.hp > 0).map(e => e.id).sort()).toEqual(['b1', 'b2', 'f1', 'f2']);
  });
  it('a tired hero hits and heals for less; SPD and the turn order stay the same', () => {
    const d = withParty(thornHost, five); const tired = withParty(thornHost, five.map(h => h.id === 'tracer' || h.id === 'healer' ? { ...h, fatigue: 20 } : h));
    expect(roundOrder(createBattle(tired), tired)).toEqual(roundOrder(createBattle(d), d));
    let a = createBattle(d), b = createBattle(tired);
    while (currentHeroId(a, d) !== 'tracer') { const c = pass(a, d); a = resolveCommand(a, d, c).state; b = resolveCommand(b, tired, c).state; }
    const hit = (s: BattleState, data: EncounterDefinition) => resolveCommand(s, data, { beat: s.beat, heroId: 'tracer', action: 'attack', targetId: 'f1' }).events.find(e => e.type === 'damage' && e.sourceId === 'tracer')!.amount!;
    expect(hit(b, tired)).toBe(Math.round(hit(a, d) * 0.8));
    let ha = a, hb = b;
    while (currentHeroId(ha, d) !== 'healer') { ha = resolveCommand(ha, d, pass(ha, d)).state; hb = resolveCommand(hb, tired, pass(hb, tired)).state; }
    const hurt = (s: BattleState) => ({ ...s, heroes: s.heroes.map(h => h.id === 'guardian' ? { ...h, hp: 10 } : h) });
    ha = hurt(ha); hb = hurt(hb);
    const heal = (s: BattleState, data: EncounterDefinition) => resolveCommand(s, data, { beat: s.beat, heroId: 'healer', action: 'heal', targetId: 'guardian' }).events.find(e => e.type === 'heal')!.amount!;
    expect(heal(hb, tired)).toBe(Math.round(heal(ha, d) * 0.8));
  });
});

describe('the team of five in the world (save v45)', () => {
  const company = (deployed: string[], reserve: string[]): ExpeditionState =>
    newExpedition(map, lookup, 9, { roster: { deployed, reserve }, members: Object.fromEntries([...deployed, ...reserve].map(id => [id, { stars: 1, dupes: 0 }])), campXp: xpAt(6), reserveSlots: 3 }, true);
  const battleAt = (s: ExpeditionState, encounterId: string): ExpeditionState => ({ ...s, battle: { kind: 'random', encounterId, entry: Object.fromEntries(s.roster.deployed.map(id => [id, s.hp[id]!])), commands: [] } });
  const finish = (s: ExpeditionState) => { const d = battleData(s, map, lookup)!; return finishBattle(recordBattle(s, map, lookup, play(d, battleState(s, map, lookup)!).commands), map, lookup); };
  it('five stand 3/2 at most; the reserve opens by chapter 3 → 4 → 5', () => {
    expect(PARTY_SLOTS).toBe(5);
    const roster = { deployed: ['guardian', 'tracer', 'garran', 'weaver', 'healer'], reserve: [] };
    const lanes = formation(roster, recommendedLane(lookup, map));
    expect(Object.values(lanes).filter(l => l === 'front')).toHaveLength(3); expect(laneReason(roster, recommendedLane(lookup, map), 'weaver', 'front')).toBe('full');
    const p = newProfile(map, 1);
    expect(reserveSlots(p, map)).toBe(3); expect(reserveSlots({ ...p, cleared: ['ruined-border'] }, map)).toBe(4);
    expect(reserveSlots({ ...p, cleared: ['ruined-border', 'deep-forest'] }, map)).toBe(5); expect(reserveSlots({ ...p, veteran: true }, map)).toBe(5);
    const full: Profile = { ...p, company: ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'sefa', 'brann'], members: Object.fromEntries(['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'sefa', 'brann'].map(id => [id, { stars: 1, dupes: 0 }])),
      party: { deployed: ['guardian', 'tracer', 'weaver', 'healer', 'garran'], reserve: ['mira', 'toma', 'sefa'] } };
    expect(placeMember(full, map, 'brann', 'reserve').event).toEqual({ type: 'blocked', reason: 'full' });
    expect(placeMember({ ...full, cleared: ['ruined-border'] }, map, 'brann', 'reserve').profile.party.reserve).toHaveLength(4);
    const run = depart({ ...full, tutorialDone: true, cleared: ['ruined-border'] }, map, lookup, 4).run;
    expect(run.reserveSlots).toBe(4); expect(run.roster.deployed).toHaveLength(5);
    expect(moveMember({ ...run, roster: { ...run.roster, reserve: [...run.roster.reserve, 'brann'] } }, 'guardian').event.type).toBe('blocked');
  });
  it('after each battle the field tires by one and the reserve rests by one; steps at 7 and 11 points cut 10% each', () => {
    let s = company(['guardian', 'tracer', 'weaver', 'healer', 'garran'], ['mira']);
    s.fatigue = { mira: 2 };
    const r = finish(battleAt(s, 'slime-pair')); expect(r.event.type).toBe('victory');
    expect(r.state.fatigue).toEqual({ guardian: 1, tracer: 1, weaver: 1, healer: 1, garran: 1, mira: 1 });
    expect([0, 6, 7, 10, 11, 12].map(n => fatigueCut(map, n))).toEqual([0, 0, 10, 10, 20, 20]);
    s = { ...r.state, fatigue: { ...r.state.fatigue, guardian: 12 } };
    const tired = finish(battleAt(s, 'slime-pair')).state; expect(fatigueOf(tired, 'guardian')).toBe(12); expect(fatigueOf(tired, 'mira')).toBe(0);
    // The battle reads the cut it started with and replays with it.
    const b = battleAt({ ...s, fatigue: { guardian: 11 } }, 'slime-pair');
    expect(battleData(b, map, lookup)!.heroes.find(h => h.id === 'guardian')!.fatigue).toBe(20);
    expect(battleData(b, map, lookup)!.heroes.find(h => h.id === 'tracer')!.fatigue).toBeUndefined();
  });
  it('A6c: a win lets the standing reserve recover 25% of max HP; the fallen stay down, and a loss heals nobody', () => {
    const s = company(['guardian', 'tracer', 'weaver', 'healer', 'garran'], ['mira', 'toma']);
    const mira = memberDef(lookup, map, s, 'mira')!.maxHp;
    const won = finish(battleAt({ ...s, hp: { ...s.hp, mira: 10, toma: 0 } }, 'slime-pair')).state;
    expect(won.hp.mira).toBe(Math.min(mira, 10 + Math.ceil(mira * 0.25))); expect(won.hp.toma).toBe(0);
    const doomed = { ...s, hp: { ...s.hp, mira: 10, guardian: 1, tracer: 1, weaver: 1, healer: 1, garran: 1 } };
    const lost = finishBattle(recordBattle(battleAt(doomed, 'rift-legion'), map, lookup, (() => { const d = battleData(battleAt(doomed, 'rift-legion'), map, lookup)!; let st = battleState(battleAt(doomed, 'rift-legion'), map, lookup)!;
      while (st.outcome === 'active') st = resolveCommand(st, d, pass(st, d)).state; return st.commands; })()), map, lookup);
    expect(lost.event.type).toBe('defeat'); expect(lost.state.hp.mira).toBe(10); expect(fatigueOf(lost.state, 'guardian')).toBe(1);
  });
  it('a camp rest and the calming draught ease fatigue; neither changes SPD', () => {
    const camp = findTiles(map, 'camp')[0]!;
    let s: ExpeditionState = { ...company(['guardian', 'tracer'], ['mira']), position: camp, fatigue: { guardian: 9, tracer: 2 }, potions: { salve: 0, tonic: 0, repel: 0, calm: 1 } };
    expect(potionReason(s, map, lookup, 'calm', 'mira')).toBe('rested'); expect(potionReason(s, map, lookup, 'calm')).toBe('target');
    s = usePotion(s, map, lookup, 'calm', 'guardian').state; expect(s.fatigue).toEqual({ guardian: 5, tracer: 2 }); expect(s.potions.calm).toBe(0);
    s = rest(s, map, lookup).state; expect(s.fatigue).toBeUndefined();
  });
  it('saves v45 with fatigue and reserve slots; rejects forged values', () => {
    const p: Profile = { ...newProfile(map, 2), tutorialDone: true, company: ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira'], members: Object.fromEntries(['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira'].map(id => [id, { stars: 1, dupes: 0 }])),
      party: { deployed: ['guardian', 'tracer', 'weaver', 'healer', 'garran'], reserve: ['mira'] } };
    const game = depart(p, map, lookup, 5); game.run.fatigue = { guardian: 3 };
    const raw = write(game); expect(JSON.parse(raw).version).toBe(45);
    expect(parseGame(raw, map, lookup)).toEqual(game);
    const forge = (patch: Record<string, unknown>) => { const j = JSON.parse(raw); Object.assign(j.run, patch); return JSON.stringify(j); };
    for (const bad of [{ fatigue: { guardian: 13 } }, { fatigue: { brann: 1 } }, { fatigue: {} }, { reserveSlots: 6 }, { reserveSlots: 2 }])
      expect(() => parseGame(forge(bad), map, lookup), JSON.stringify(bad)).toThrow();
  });
  it('v44 → v45: the profile fills the fifth field slot from the reserve and keeps everyone; a run in progress keeps four reserve slots', () => {
    const ids = ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'sefa'];
    const p: Profile = { ...newProfile(map, 2), tutorialDone: true, company: ids, members: Object.fromEntries(ids.map(id => [id, { stars: 1, dupes: 0 }])),
      party: { deployed: ids.slice(0, 4), reserve: ids.slice(4) } };
    const old = (run: unknown) => { const j = JSON.parse(write({ profile: p, run: null })); j.version = 44; delete j.profile.potions.calm; j.run = run; return JSON.stringify(j); };
    const migrated = parseGame(old(null), map, lookup);
    expect(migrated.profile.party).toEqual({ deployed: ids.slice(0, 5), reserve: ids.slice(5) }); expect(migrated.profile.company).toEqual(ids);
    expect(migrated.profile.potions.calm).toBe(0);
    const legacyRun = JSON.parse(write(depart(p, map, lookup, 3)));
    expect(legacyRun.run.roster.reserve).toEqual(ids.slice(4)); delete legacyRun.run.reserveSlots; delete legacyRun.run.potions.calm;
    const withRun = parseGame(old(legacyRun.run), map, lookup);
    expect(withRun.run!.roster.reserve).toHaveLength(4); expect(withRun.run!.reserveSlots).toBeUndefined(); expect(withRun.run!.potions.calm).toBe(0);
  });
});
