import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { rosterP03 } from '../src/content/heroes/roster-p03';
import { chapterOne as map } from '../src/content/world/chapter1';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { beginBattle, hexTickPower, previewCommand, replay, resolveCommand, skillCooldown, targetOptions } from '../src/core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition, EnemyDefinition, HeroDefinition, IntentDefinition, TalentCap, TurnStage } from '../src/core/battle/types';
import { boardOffers, newProfile } from '../src/core/world/profile';
import { heroCatalog, skillChoices } from '../src/core/world/world';
import { talentsValid } from '../src/core/world/talents';
import { unitStatuses } from '../src/ui/battle-status';
import { battleLesson } from '../src/ui/tutorial';

type Caps = Partial<Record<TalentCap, number>>;
const wynne = rosterP03.find(h => h.id === 'wynne')!;
const foe = (id: 'f1' | 'f2' | 'b1', hp = 1000, speed = 1): EnemyDefinition => ({ id, row: id.startsWith('f') ? 'front' : 'back', name: `Dummy ${id}`, maxHp: hp, speed, color: 0 });
const wait = (id: string, damage = 0, extra: Partial<IntentDefinition> = {}): IntentDefinition => ({ sourceId: id, targetSlot: 0, name: 'Wait', damage, kind: 'physical', ...extra });
// Wynne (and optionally a second hexer) act first each round against practice foes.
function fixture(actions: ActionId[], caps: Caps = {}, enemies = [foe('f1')], intents?: IntentDefinition[], extra: Partial<HeroDefinition> = {}, also: HeroDefinition[] = []): EncounterDefinition {
  return { ...veilSiege, heroes: [{ ...wynne, ...extra, actions: ['attack', ...actions], talents: { caps } }, ...also], enemies, intents: intents ?? enemies.map(e => wait(e.id)) };
}
const stacks = (s: BattleState, id = 'f1', by = 'wynne') => s.enemies.find(e => e.id === id)!.hexes?.find(h => h.heroId === by);
const hp = (s: BattleState, id = 'f1') => s.enemies.find(e => e.id === id)!.hp;
function cast(d: EncounterDefinition, s: BattleState, action: ActionId, targetId = 'f1', heroId = 'wynne'): { state: BattleState; turns: TurnStage[] } {
  const command: Command = { beat: s.beat, heroId, action, targetId };
  const result = resolveCommand(s, d, command);
  expect(previewCommand(s, d, command)).toEqual(result);
  return { state: result.state, turns: result.turns };
}
const events = (turns: TurnStage[]) => turns.flatMap(t => t.events);

describe('P03 Hexer curses', () => {
  it('a thread deals nothing now, then ticks as this round and the next end, and expires', () => {
    const d = fixture(['threadhex']);
    const s = beginBattle(d).state;
    const r = cast(d, s, 'threadhex');
    expect(r.turns[0]!.events.filter(e => e.type === 'damage')).toEqual([]);
    expect(events(r.turns).filter(e => e.type === 'damage' && e.text === 'Curse.').map(e => e.amount)).toEqual([5]);
    expect(stacks(r.state)).toEqual({ heroId: 'wynne', stacks: 1, until: 2 });
    const next = cast(d, r.state, 'attack');
    expect(hp(next.state)).toBe(1000 - 5 - 9 - 5);
    expect(stacks(next.state)).toBeUndefined();
    expect(next.state.enemies[0]!.hexes).toBeUndefined();
  });
  it('stacks up to three; laying again refreshes but never shortens', () => {
    const d = fixture(['threadhex']);
    let s = beginBattle(d).state;
    for (let i = 0; i < 4; i++) s = cast(d, s, 'threadhex').state;
    expect(stacks(s)).toEqual({ heroId: 'wynne', stacks: 3, until: 5 });
    expect(hexTickPower(d, 'wynne', 3)).toBe(15);
  });
  it('keeps one stack per hexer and grows with Magic Power, not hit bonuses', () => {
    const other: HeroDefinition = { ...wynne, id: 'hexb', name: 'B', speed: 79, actions: ['attack', 'threadhex'], skillBonus: 100 };
    const d = fixture(['threadhex'], {}, [foe('f1')], undefined, {}, [other]);
    let s = beginBattle(d).state;
    s = resolveCommand(s, d, { beat: s.beat, heroId: 'wynne', action: 'threadhex', targetId: 'f1' }).state;
    const after = resolveCommand(s, d, { beat: s.beat, heroId: 'hexb', action: 'threadhex', targetId: 'f1' });
    expect(after.state.enemies[0]!.hexes!.map(h => [h.heroId, h.stacks])).toEqual([['wynne', 1], ['hexb', 1]]);
    expect(events(after.turns).filter(e => e.type === 'damage' && e.text === 'Curse.').map(e => [e.sourceId, e.amount])).toEqual([['wynne', 5], ['hexb', 10]]);
  });
  it('needs its hexer standing', () => {
    const d = fixture(['threadhex'], {}, [foe('f1')], [wait('f1', 999)]);
    const s = beginBattle(d).state;
    const r = cast(d, s, 'threadhex');
    expect(r.state.outcome).toBe('defeat');
    expect(events(r.turns).some(e => e.type === 'damage' && e.text === 'Curse.')).toBe(false);
  });
  it('a tick that downs the last foe wins; a foe already down does not tick', () => {
    const d = fixture(['threadhex'], {}, [foe('f1', 4), foe('f2', 1000)]);
    const s = beginBattle(d).state;
    const r = cast(d, s, 'threadhex');
    expect(events(r.turns).filter(e => e.type === 'down').map(e => e.targetId)).toEqual(['f1']);
    expect(r.state.enemies[0]!.hexes).toBeUndefined();
    const lone = fixture(['threadhex'], {}, [foe('f1', 4)]);
    expect(cast(lone, beginBattle(lone).state, 'threadhex').state.outcome).toBe('victory');
  });
  it('shows the curse on the foe', () => {
    const d = fixture(['threadhex']);
    const s = cast(d, beginBattle(d).state, 'threadhex').state;
    expect(unitStatuses(s, d, 'f1').find(x => x.id === 'hex-wynne')).toMatchObject({ kind: 'debuff', duration: 'ถึงจบรอบ 2' });
  });
});

describe('P03 Hexer toll', () => {
  it('binds only a cursed foe; the foe pays before each attacking move and still attacks', () => {
    const d = fixture(['threadhex', 'lifetoll'], {}, [foe('f1')], [wait('f1', 2)]);
    const s = beginBattle(d).state;
    expect(targetOptions(s, d, 'wynne', 'lifetoll').find(t => t.id === 'f1')).toMatchObject({ valid: false, reason: 'No curse on this enemy.' });
    const hexed = cast(d, s, 'threadhex').state;
    const r = cast(d, hexed, 'lifetoll');
    expect(r.state.enemies[0]!.toll).toEqual({ heroId: 'wynne', power: 5, until: 3 });
    const foeTurn = r.turns.find(t => t.side === 'enemy')!;
    expect(foeTurn.events.map(e => e.type)).toEqual(['toll', 'damage', 'damage']);
    expect(foeTurn.events[0]).toMatchObject({ amount: 5, text: 'Toll paid.' });
    expect(foeTurn.targetId).toBe('wynne');
  });
  it('a charge, a phase turn or a cancelled move pays nothing; falling to the toll ends the turn without the move', () => {
    const charge = fixture(['threadhex', 'lifetoll'], {}, [foe('f1')], [wait('f1', 0, { charge: true })]);
    let s = cast(charge, beginBattle(charge).state, 'threadhex').state;
    let r = cast(charge, s, 'lifetoll');
    expect(events(r.turns).some(e => e.text === 'Toll paid.')).toBe(false);
    const lethal = fixture(['threadhex', 'lifetoll'], {}, [foe('f1', 9), foe('f2')], [wait('f1', 30), wait('f2')]);
    s = cast(lethal, beginBattle(lethal).state, 'threadhex').state;
    r = cast(lethal, s, 'lifetoll');
    const turn = r.turns.find(t => t.side === 'enemy' && t.actorId === 'f1')!;
    expect(turn.events.map(e => e.type)).toEqual(['toll', 'down']);
    expect(r.state.heroes[0]!.hp).toBe(wynne.maxHp - 30);
  });
});

describe('P03 Hexer tree and Wynne branch', () => {
  it('a2x adds per stack; a2y lays two on a fresh foe only', () => {
    expect(hexTickPower(fixture([], { hexThreadPer: 1 }), 'wynne', 2)).toBe(12);
    const d = fixture(['threadhex'], { hexThreadFresh: 2 });
    let s = cast(d, beginBattle(d).state, 'threadhex').state;
    expect(stacks(s)!.stacks).toBe(2);
    s = cast(d, s, 'threadhex').state; expect(stacks(s)!.stacks).toBe(3);
  });
  it('woven hex curses the front row (a4 quicker with two); long thread lives longer (c2x) or doubles (c2y)', () => {
    const d = fixture(['wovenhex'], { hexWovenQuick: 1 }, [foe('f1'), foe('f2'), foe('b1')]);
    const s = beginBattle(d).state;
    const r = cast(d, s, 'wovenhex', 'enemies');
    expect(r.turns[0]!.events.filter(e => e.type === 'hex').map(e => e.targetId)).toEqual(['f1', 'f2']);
    expect(r.state.heroes[0]!.cooldowns.wovenhex).toBe(s.round + 3);
    const long = fixture(['longthread'], { hexLongLife: 1 });
    expect(stacks(cast(long, beginBattle(long).state, 'longthread').state)).toEqual({ heroId: 'wynne', stacks: 1, until: 4 });
    const dbl = fixture(['longthread'], { hexLongDouble: 2 });
    expect(stacks(cast(dbl, beginBattle(dbl).state, 'longthread').state)).toEqual({ heroId: 'wynne', stacks: 2, until: 2 });
    const plain = fixture(['longthread']);
    expect(stacks(cast(plain, beginBattle(plain).state, 'longthread').state)!.until).toBe(3);
  });
  it('b2x/b2y strengthen or lengthen the toll; the ring binds every cursed foe, b4 more on a full curse', () => {
    const d = fixture(['threadhex', 'knothex', 'lifetoll', 'tollring'], { hexTollLong: 1, hexRingFull: 2 }, [foe('f1'), foe('f2')]);
    let s = beginBattle(d).state;
    expect(targetOptions(s, d, 'wynne', 'tollring')[0]).toMatchObject({ valid: false, reason: 'No curse on any enemy.' });
    s = cast(d, s, 'threadhex').state; s = cast(d, s, 'knothex').state;
    const ring = cast(d, s, 'tollring', 'enemies').state;
    expect(ring.enemies.map(e => e.toll?.power)).toEqual([6, undefined]);
    expect(cast(d, s, 'lifetoll').state.enemies[0]!.toll!.until).toBe(s.round + 2);
  });
  it('knot hex lays two (cap three); c4 also extends the curse it tightens, at most three round-ends ahead', () => {
    const d = fixture(['threadhex', 'knothex'], { hexKnotLife: 1 });
    let s = cast(d, beginBattle(d).state, 'threadhex').state;
    s = cast(d, s, 'knothex').state;
    expect(stacks(s)).toEqual({ heroId: 'wynne', stacks: 3, until: 4 });
  });
  it('wynne1 lengthens the first thread per foe; wynne2 readies the long thread sooner; wynne3 adds on a full curse; wynne4 keeps a full curse two ends ahead', () => {
    const d = fixture(['threadhex', 'knothex', 'longthread'], { wynne1: 1, wynne2: 1, wynne3: 1, wynne4: 1 });
    let s = cast(d, beginBattle(d).state, 'threadhex').state;
    expect(stacks(s)!.until).toBe(3);
    s = cast(d, s, 'threadhex').state; expect(stacks(s)!.until).toBe(3);
    expect(skillCooldown(d, 'wynne', 'longthread')).toBe(2);
    expect(hexTickPower(d, 'wynne', 3)).toBe(18);
    s = cast(d, s, 'knothex').state; expect(stacks(s)!.stacks).toBe(3);
    const full = cast(d, s, 'threadhex').state;
    expect(stacks(full)!.until).toBe(s.round + 2);
  });
  it('replays to the same state and the advisor curses', () => {
    const d = fixture(['threadhex', 'lifetoll'], {}, [foe('f1'), foe('f2')], [wait('f1', 1), wait('f2', 1)]);
    let s = beginBattle(d).state; const used: ActionId[] = [];
    for (let i = 0; i < 5; i++) { const l = battleLesson(s, d)!; used.push(l.action); s = cast(d, s, l.action, l.targetId).state; }
    expect(used).toContain('threadhex');
    expect(replay(d, s.commands)).toEqual(s);
  });
});

describe('P03 Wynne in the world', () => {
  it('joins the catalog and featured slot only; twenty-node tree on the shared budget', () => {
    expect(heroCatalog(lookup, map).map(h => h.id).slice(-3, -1)).toEqual(['kael', 'wynne']);
    expect(ruinsMap.draft!.pool).not.toContain('wynne');
    const seen = new Set<string>();
    for (let seed = 0; seed < 80; seed++) seen.add(boardOffers(newProfile(map, seed), map, lookup)[3]!);
    expect(seen.has('wynne')).toBe(true);
    expect(map.talents.wynne).toHaveLength(20);
    expect(talentsValid(map, 'wynne', 5, { p1: 1, p2: 1 })).toBe(true);
    expect(talentsValid(map, 'wynne', 5, { c2x: 1, c1s: 1, c2y: 1 })).toBe(false);
    expect(skillChoices(wynne, map, { c1s: 1 })).toEqual(['threadhex', 'lifetoll', 'longthread']);
  });
});
