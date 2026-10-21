import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { ruinsMap as map } from '../src/content/world/chapter-ruins';
import { chapterOne } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import { depart, hardReason, newProfile, settle } from '../src/core/world/profile';
import type { Profile } from '../src/core/world/types';
import { battleData, hardEncounter } from '../src/core/world/world';
import { beginBattle, enraged, previewCommand, resolveCommand } from '../src/core/battle/engine';
import type { EncounterDefinition, EnemyTrait } from '../src/core/battle/types';

// Hard mode (master plan A9): opens with chapter 3 and per map after a normal clear; monsters +5 levels; richer
// drops; a one-time first-clear reward.
const open = (): Profile => ({ ...newProfile(map, 4), tutorialDone: true, cleared: [map.id], veteran: true });
describe('hard mode', () => {
  it('opens only after the system unlocks and the map is cleared on normal', () => {
    expect(hardReason({ ...newProfile(map, 4), cleared: [map.id] }, MAPS, map.id)).toBe('locked');
    expect(hardReason({ ...open(), cleared: [] }, MAPS, map.id)).toBe('normal');
    expect(hardReason(open(), MAPS, map.id)).toBe('');
    expect(() => depart({ ...open(), cleared: [] }, map, lookup, 3, { maps: MAPS })).toThrow();
    expect(depart(open(), map, lookup, 3, { maps: MAPS }).run.hard).toBe(true); expect(depart(open(), map, lookup, 3).run.hard).toBeUndefined();
  });
  it('every battle but the prologue fights five levels higher', () => {
    const run = depart(open(), map, lookup, 3, { maps: MAPS }).run;
    const fight = (kind: 'random' | 'tutorial') => battleData({ ...run, battle: { kind, encounterId: 'scout-patrol', entry: Object.fromEntries(run.roster.deployed.map(id => [id, run.hp[id]!])), commands: [], level: 2 } }, map, lookup)!.level;
    expect(fight('random')).toBe(2 + map.progression.hardLevels); expect(fight('tutorial')).toBe(2);
  });
  it('a hard clear records the map and pays the first-clear reward once', () => {
    const p = open(); const run = { ...depart(p, map, lookup, 3, { maps: MAPS }).run, completed: true };
    const once = settle(p, run, 'complete', map); const r = map.progression.hardFirstClear;
    expect(once.clearedHard).toEqual([map.id]); expect(once.bank.gold - p.bank.gold).toBeGreaterThanOrEqual(r.gold);
    const twice = settle(once, run, 'complete', map); expect(twice.bank.seal - once.bank.seal).toBe(0);
  });
  it('saves v33 hard runs and hard clears; a hard clear must also be a normal clear', () => {
    const { profile, run } = depart({ ...open(), clearedHard: [map.id] }, map, lookup, 3, { maps: MAPS }); let raw = '';
    saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, { profile, run });
    const back = parseGame(raw, chapterOne, lookup, MAPS); expect(back.run!.hard).toBe(true); expect(back.profile.clearedHard).toEqual([map.id]);
    const bad = JSON.parse(raw); bad.profile.cleared = []; expect(() => parseGame(JSON.stringify(bad), chapterOne, lookup, MAPS)).toThrow();
  });
});

// Hard mode part 2: one trait per foe; bosses get enrage + veilguard and one extra move.
const base = lookup('scout-patrol')!;
const traited = (traits: EnemyTrait[]): EncounterDefinition => {
  const h = hardEncounter(base, 'random', map); return { ...h, enemies: h.enemies.map(e => ({ ...e, traits })) };
};
// The first hero attack on the first living enemy, from a fresh battle.
const firstHit = (d: EncounterDefinition, mark = false) => {
  let s = beginBattle(d).state; const heroId = s.order[s.turnIndex]!; const target = s.enemies.find(e => e.hp > 0)!;
  if (mark) s = { ...s, enemies: s.enemies.map(e => e.id === target.id ? { ...e, markedUntil: s.round + 2 } : e) };
  const command = { beat: s.beat, heroId, action: 'attack' as const, targetId: target.id };
  const r = resolveCommand(s, d, command); expect(previewCommand(s, d, command)).toEqual(r);
  return { before: s, after: r.state, heroId, target: target.id, events: r.events };
};
describe('hard mode traits', () => {
  it('gives every foe one fixed trait and bosses an extra Rift Fury move', () => {
    const h = hardEncounter(base, 'random', map); expect(h.enemies.every(e => e.traits?.length === 1)).toBe(true);
    expect(hardEncounter(base, 'random', map)).toEqual(h);
    const b = hardEncounter(base, 'boss', map); expect(b.enemies.every(e => e.traits?.includes('enrage') && e.traits.includes('veilguard'))).toBe(true);
    const fury = b.intents.find(i => i.name === 'Rift Fury')!; expect(fury).toBeDefined(); expect(b.intents.length).toBe(base.intents.length + 1);
    const heaviest = Math.max(...base.intents.filter(i => i.sourceId === fury.sourceId).map(i => i.damage));
    expect(fury.damage).toBe(Math.ceil(heaviest * map.progression.hardTraits.bossMovePercent / 100));
  });
  it('veilguard cuts damage unless the foe is marked', () => {
    const plain = firstHit(traited([])); const guarded = firstHit(traited(['veilguard'])); const marked = firstHit(traited(['veilguard']), true);
    const lost = (r: typeof plain) => r.before.enemies.find(e => e.id === r.target)!.hp - r.after.enemies.find(e => e.id === r.target)!.hp;
    expect(lost(guarded)).toBeLessThan(lost(plain)); expect(lost(marked)).toBeGreaterThanOrEqual(lost(plain));
  });
  it('thorns hurt the attacker but never below 1 HP', () => {
    const r = firstHit(traited(['thorns'])); expect(r.events.some(e => e.text === 'Thorns.' && e.targetId === r.heroId)).toBe(true);
    const d = traited(['thorns']); let s = beginBattle(d).state; const heroId = s.order[s.turnIndex]!;
    s = { ...s, heroes: s.heroes.map(h => h.id === heroId ? { ...h, hp: 1 } : h) };
    const low = resolveCommand(s, d, { beat: s.beat, heroId, action: 'attack', targetId: s.enemies.find(e => e.hp > 0)!.id });
    expect(low.events.some(e => e.text === 'Thorns.')).toBe(false);
  });
  it('enrage switches on below the HP share and stays off without the trait', () => {
    const d = traited(['enrage']); const s = beginBattle(d).state; const e = s.enemies[0]!; const max = d.enemies.find(x => x.id === e.id)!.maxHp;
    const low = { ...s, enemies: s.enemies.map(x => x.id === e.id ? { ...x, hp: Math.floor(max / 2) } : x) };
    expect(enraged(s, d, e.id)).toBe(false); expect(enraged(low, d, e.id)).toBe(true); expect(enraged(low, traited([]), e.id)).toBe(false);
  });
});
