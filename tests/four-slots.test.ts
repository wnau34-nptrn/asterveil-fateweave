import { describe, expect, it } from 'vitest';
import { encounters, encounterById as lookup, riftWarden, slimeNest } from '../src/content/encounters/catalog';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { mercenaries } from '../src/content/heroes/mercenaries';
import { SPECIES, foes } from '../src/content/enemies/species';
import { chapterOne as map } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { corrodeBonusOf, createBattle, interruptBlock, currentHeroId, encounterProblems, previewCommand, replay, resolveCommand, roundOrder, screened, targetOptions, withParty } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../src/core/battle/types';
import { hardEncounter } from '../src/core/world/world';
import { depart, newProfile } from '../src/core/world/profile';
import { parseGame } from '../src/core/save/expedition-save';
import { actorName } from '../src/ui/th';

// A7 step 2 (owner 2026-10-22): foes stand in four slots, front-row foes screen the back row.
const merc = (id: string) => mercenaries.find(m => m.id === id)!;
const [knight, duelist, mage, priest] = veilSiege.heroes;
const firstValid = (s: BattleState, d: EncounterDefinition) => targetOptions(s, d, currentHeroId(s, d)!, 'attack').find(t => t.valid)!.id;
const until = (s: BattleState, d: EncounterDefinition, id: string) => {
  while (currentHeroId(s, d) !== id) s = resolveCommand(s, d, { beat: s.beat, heroId: currentHeroId(s, d)!, action: 'attack', targetId: firstValid(s, d) }).state;
  return s;
};
const valid = (s: BattleState, d: EncounterDefinition, hero: string, action: ActionId) => targetOptions(s, d, hero, action).filter(t => t.valid).map(t => t.id);

describe('four foe slots', () => {
  it('every encounter places 1–4 foes in distinct slots, at most two per row, each with a move', () => {
    for (const e of encounters) expect(encounterProblems(e), e.id).toEqual([]);
    expect(slimeNest.enemies.map(e => e.id)).toEqual(['f1', 'f2', 'b1', 'b2']);
    for (const m of MAPS) for (const z of m.zones) for (const p of z.pool) expect(lookup(p.encounterId), `${m.id} ${p.encounterId}`).toBeDefined();
  });
  it('flags a broken encounter', () => {
    const bad = { ...veilSiege, enemies: [{ ...veilSiege.enemies[0]!, row: 'front' as const }, veilSiege.enemies[1]!] };
    expect(encounterProblems(bad)).toContain('veil-siege: b1 row front');
    expect(encounterProblems({ ...veilSiege, intents: veilSiege.intents.filter(i => i.sourceId !== 'b1') })).toContain('veil-siege: b1 has no move');
  });
  it('orders up to eight actors by SPD, ties heroes first then f1 f2 b1 b2', () => {
    const d = withParty(slimeNest, veilSiege.heroes.map(h => ({ ...h, speed: 70 })));
    const tied = { ...d, enemies: d.enemies.map(e => ({ ...e, speed: 70 })) };
    expect(roundOrder(createBattle(tied), tied)).toEqual(['guardian', 'tracer', 'weaver', 'healer', 'f1', 'f2', 'b1', 'b2']);
    expect(roundOrder(createBattle(d), d)).toHaveLength(8);
  });
  it('repeated kinds start one move apart and share their displayed name', () => {
    const { intents } = foes(2, [['f1', SPECIES.dewSlime], ['f2', SPECIES.dewSlime]]);
    const first = (id: string) => intents.find(i => i.sourceId === id)!.targetSlot;
    expect(first('f1')).not.toBe(first('f2'));
    expect(actorName('f1', slimeNest)).toBe('Lv2 สไลม์น้ำค้าง'); expect(actorName('f2', slimeNest)).toBe('Lv2 สไลม์น้ำค้าง');
    expect(actorName('b1', slimeNest)).toBe('Lv2 สไลม์ถ่านไฟ');
  });
});

describe('front row screens the back row', () => {
  const d = withParty(veilSiege, [merc('garran'), duelist!, mage!, priest!]);
  it('front-lane heroes reach only the front row; back-lane heroes and reach skills reach all', () => {
    let s = until(createBattle(d), d, 'tracer');
    expect(valid(s, d, 'tracer', 'attack')).toEqual(['f1']); expect(valid(s, d, 'tracer', 'execute')).toEqual(['f1']);
    expect(valid(s, d, 'tracer', 'mark')).toEqual(['b1', 'f1']);
    expect(targetOptions(s, d, 'tracer', 'attack').find(t => t.id === 'b1')!.reason).toBe('A front-row enemy shields this target.');
    expect(() => resolveCommand(s, d, { beat: s.beat, heroId: 'tracer', action: 'attack', targetId: 'b1' })).toThrow('shields');
    s = until(s, d, 'weaver'); expect(valid(s, d, 'weaver', 'bolt')).toEqual(['b1', 'f1']);
    s = until(s, d, 'garran'); expect(valid(s, d, 'garran', 'pierce')).toEqual(['b1', 'f1']);
    expect(screened(s, d, 'garran', 'attack', 'b1')).toBe(true); expect(screened(s, d, 'garran', 'pierce', 'b1')).toBe(false);
    // The piercing thrust really lands on the back row, and previews/replays the same.
    const c = { beat: s.beat, heroId: 'garran', action: 'pierce' as const, targetId: 'b1' }; const r = resolveCommand(s, d, c);
    expect(r.events.some(e => e.type === 'damage' && e.targetId === 'b1')).toBe(true);
    expect(previewCommand(s, d, c)).toEqual(r); expect(replay(d, r.state.commands)).toEqual(r.state);
  });
  it('the back row opens once the front row falls; area moves never care', () => {
    const s = until(createBattle(d), d, 'tracer'); s.enemies.find(e => e.id === 'f1')!.hp = 0;
    expect(valid(s, d, 'tracer', 'attack')).toEqual(['b1']);
    const sefa = withParty(veilSiege, [merc('sefa'), duelist!, mage!, merc('mira')]);
    let a = until(createBattle(sefa), sefa, 'mira');
    expect(valid(a, sefa, 'mira', 'volley')).toEqual(['enemies']);
    a = until(a, sefa, 'sefa'); expect(valid(a, sefa, 'sefa', 'ambush')).toEqual(['f1']);
    expect(valid({ ...a }, { ...sefa }, 'sefa', 'attack')).not.toContain('b1');
  });
  it('the knight challenges a back-row foe but cannot bash it', () => {
    const k = withParty(veilSiege, [{ ...knight!, actions: ['attack', 'bash', 'challenge'] }, duelist!, mage!, priest!]);
    const s = until(createBattle(k), k, 'guardian');
    expect(screened(s, k, 'guardian', 'challenge', 'b1')).toBe(false); expect(screened(s, k, 'guardian', 'bash', 'b1')).toBe(true);
  });
});

describe('world rules for four slots', () => {
  it('hard mode gives traits to at most the two toughest foes; the boss gets enrage + veilguard and Rift Fury', () => {
    const nest = hardEncounter(slimeNest, 'random', map);
    const traited = nest.enemies.filter(e => e.traits?.length);
    expect(traited).toHaveLength(2);
    const hp = [...slimeNest.enemies].sort((a, b) => b.maxHp - a.maxHp).map(e => e.maxHp);
    for (const e of traited) expect(e.maxHp).toBeGreaterThanOrEqual(hp[1]!);
    const boss = hardEncounter(lookup('vanguard-captain')!, 'boss', map);
    const captain = boss.enemies.find(e => e.boss)!;
    expect(captain.traits).toEqual(['enrage', 'veilguard']); expect(boss.enemies.filter(e => e.traits?.length)).toHaveLength(2);
    expect(boss.intents.find(i => i.name === 'Rift Fury')!.sourceId).toBe(captain.id);
  });
  it('a v34 battle whose commands aim at raider/brute restarts from its entry', () => {
    const game = depart(newProfile(map, 4), map, lookup, 9); const run = { ...game.run, tutorialDone: true };
    run.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...run.hp }, commands: [{ beat: 1, heroId: 'tracer', action: 'attack', targetId: 'raider' }] };
    const back = parseGame(JSON.stringify({ version: 34, profile: game.profile, run }), map, lookup);
    expect(back.run!.battle).toMatchObject({ encounterId: 'veil-siege', commands: [] });
    expect(back.run!.hp).toEqual(run.hp);
  });
  it('corrosion grows with the alchemist’s Support', () => {
    const plain = withParty(veilSiege, [knight!, duelist!, mage!, merc('toma')]);
    const geared = withParty(veilSiege, [knight!, duelist!, mage!, { ...merc('toma'), skillBonus: 50 }]);
    expect(corrodeBonusOf(plain, 'toma')).toBe(veilSiege.rules.corrodeBonus);
    expect(corrodeBonusOf(geared, 'toma')).toBe(Math.round(veilSiege.rules.corrodeBonus * 1.5));
  });
});

describe('bosses resist control (owner 2026-10-22)', () => {
  // The warden alone and slow, four physical moves; the fourth is its unstoppable signature.
  const boss = riftWarden.enemies.find(e => e.boss)!;
  const d: EncounterDefinition = { ...riftWarden, phases: undefined, enemies: [{ ...boss, speed: 10 }],
    intents: [{ sourceId: 'f1', targetSlot: 0, name: 'Crushing Blow', damage: 20, kind: 'physical' }, { sourceId: 'f1', targetSlot: 1, name: 'Crushing Blow', damage: 20, kind: 'physical' }, { sourceId: 'f1', targetSlot: 1, name: 'Crushing Blow', damage: 20, kind: 'physical' },
      { sourceId: 'f1', targetSlot: 0, name: 'Crushing Blow', damage: 30, kind: 'physical', unstoppable: true }] };
  const bash = (s: BattleState) => resolveCommand(until(s, d, 'guardian'), d, { beat: until(s, d, 'guardian').beat, heroId: 'guardian', action: 'bash', targetId: 'f1' });
  it('a cancelled boss turn makes it steadfast for its next round; bash still hits', () => {
    let r = bash(createBattle(d)); expect(r.events.map(e => e.type)).toContain('interrupt');
    // The slow boss's round-1 turn is cancelled later in the round; it is then steadfast through round 3,
    // so the knight's next bash (ready in round 3) cannot cancel it.
    let next = until(r.state, d, 'guardian'); expect(next.round).toBe(2); expect(next.enemies[0]!.steadyRound).toBe(3);
    next = until(resolveCommand(next, d, { beat: next.beat, heroId: 'guardian', action: 'attack', targetId: 'f1' }).state, d, 'guardian'); expect(next.round).toBe(3);
    const hp = next.enemies[0]!.hp; r = bash(next);
    expect(r.events.find(e => e.type === 'resist')).toMatchObject({ text: 'Steadfast boss.', targetId: 'f1' });
    expect(r.events.some(e => e.type === 'interrupt')).toBe(false); expect(r.state.enemies[0]!.hp).toBeLessThan(hp);
    expect(r.turns.some(t => t.events.some(e => e.type === 'cancel'))).toBe(false);
    expect(replay(d, r.state.commands)).toEqual(r.state);
  });
  it('an unstoppable move cannot be cancelled, and a non-boss is never steadfast', () => {
    // No earlier cancel: attack three times, then bash into the round-4 signature move.
    let s = createBattle(d);
    for (let i = 0; i < 3; i++) { s = until(s, d, 'guardian'); s = resolveCommand(s, d, { beat: s.beat, heroId: 'guardian', action: 'attack', targetId: 'f1' }).state; }
    const r = bash(s); expect(r.events.find(e => e.type === 'resist')).toMatchObject({ text: 'Unstoppable move.' });
    const plain = { ...d, enemies: [{ ...d.enemies[0]!, boss: false }] };
    const first = createBattle(plain); first.enemies[0]!.steadyRound = 1;
    expect(interruptBlock(first, plain, 'f1', { ...plain.intents[0]!, targetId: 'guardian', beat: 0, round: 1 })).toBe('');
  });
  it('every boss has one unstoppable signature and hard mode makes Rift Fury unstoppable', () => {
    for (const id of ['vanguard-captain', 'elite-briar-lord', 'rift-warden']) {
      const e = lookup(id)!; const b = e.enemies.find(x => x.boss)!;
      expect(e.intents.filter(i => i.sourceId === b.id && i.unstoppable && !i.phase), id).toHaveLength(1);
    }
    expect(hardEncounter(riftWarden, 'boss', map).intents.find(i => i.name === 'Rift Fury')!.unstoppable).toBe(true);
  });
});
