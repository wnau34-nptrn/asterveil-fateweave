import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { parseGame } from '../src/core/save/expedition-save';
import { claimQuest, claimReason, newProfile, settle } from '../src/core/world/profile';
import type { Direction, ExpeditionState, Point, Profile } from '../src/core/world/types';
import { move, newExpedition, tileAt } from '../src/core/world/world';

// Phase 3D (docs/EXPEDITION_DESIGN.md "Camp side quests").
const run = (patch: Partial<ExpeditionState> = {}): ExpeditionState => ({ ...newExpedition(map, lookup, 4, undefined, true), ...patch });
const quest = (npc: string) => map.sideQuests.find(q => q.npc === npc)!;
const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

describe('side quest content', () => {
  it('every camp NPC has exactly one quest with a reward; herbs sit on plain floor away from other pieces', () => {
    expect(map.sideQuests.map(q => q.npc).sort()).toEqual(['broker', 'herbalist', 'keeper', 'scout', 'smith', 'trainer']);
    for (const q of map.sideQuests) expect(Object.keys(q.reward).length).toBeGreaterThan(0);
    const taken = [...map.chests, ...map.elites, ...map.events, ...map.puzzles.secrets, ...map.puzzles.runes.flatMap(r => [...r.stones, r.door]),
      ...map.puzzles.levers.flatMap(l => [...l.levers, l.door]), ...map.puzzles.boulders.flatMap(b => [b.at, b.pit])];
    for (const h of map.herbs) {
      expect(tileAt(map, h)?.kind).toBe('floor');
      expect(taken.some(t => t.x === h.x && t.y === h.y)).toBe(false);
    }
    // Each quest can be finished within three expeditions (4A raised the targets above one map's worth).
    expect(map.herbs.length * 3).toBeGreaterThanOrEqual(quest('herbalist').target);
    expect(map.puzzles.secrets.length * 3).toBeGreaterThanOrEqual(quest('keeper').target);
    expect(map.chests.filter(c => c.tier === 'rare').length * 3).toBeGreaterThanOrEqual(quest('smith').target);
    expect(map.elites.length * 3).toBeGreaterThanOrEqual(quest('trainer').target);
  });
});

describe('herbs', () => {
  it('stepping on a herb picks it once and rolls no encounter', () => {
    const h = map.herbs[0]!;
    for (const [d, o] of Object.entries(dirs) as [Direction, Point][]) {
      const from = { x: h.x - o.x, y: h.y - o.y }; if (tileAt(map, from)?.kind !== 'floor') continue;
      const s = run({ position: from, pressure: 95 });
      const r = move(s, map, d);
      expect(r.event).toEqual({ type: 'herb', herbId: h.id }); expect(r.state.herbs).toEqual([h.id]); expect(r.state.rolls).toBe(s.rolls);
      const back = move({ ...r.state, position: from, repel: 9 }, map, d);
      expect(back.event.type).toBe('moved'); expect(back.state.herbs).toEqual([h.id]);
      return;
    }
    throw new Error('no floor next to the herb');
  });
});

describe('settling and claiming', () => {
  const done = (p: Profile, id: string) => p.quests[id] ?? { progress: 0, claimed: false };
  it('finished runs add progress capped at the target; herbs are lost on a wipe', () => {
    const vault = map.chests.find(c => c.tier === 'rare')!.id; const common = map.chests.find(c => c.tier === 'common')!.id;
    const r = run({ wins: 99, elitesDefeated: [map.elites[0]!.id], secrets: [map.puzzles.secrets[0]!.id], solved: [map.puzzles.levers[0]!.id],
      openedChests: [vault, common], herbs: [map.herbs[0]!.id, map.herbs[1]!.id] });
    const p = settle(newProfile(map, 3), r, 'withdrawn', map);
    expect(done(p, quest('broker').id)).toEqual({ progress: quest('broker').target, claimed: false });
    expect(done(p, quest('trainer').id).progress).toBe(1); expect(done(p, quest('keeper').id).progress).toBe(1);
    expect(done(p, quest('scout').id).progress).toBe(1); expect(done(p, quest('smith').id).progress).toBe(1);
    expect(done(p, quest('herbalist').id).progress).toBe(2);
    const wiped = settle(p, r, 'wiped', map);
    expect(done(wiped, quest('herbalist').id).progress).toBe(2); expect(done(wiped, quest('trainer').id).progress).toBe(2);
    // An empty run changes nothing.
    expect(settle(newProfile(map, 3), run(), 'withdrawn', map).quests).toEqual({});
  });
  it('a complete quest is claimed once for its reward', () => {
    const q = quest('herbalist'); let p = newProfile(map, 3);
    expect(claimReason(p, map, q.id)).toBe('progress'); expect(claimQuest(p, map, q.id).event).toEqual({ type: 'blocked', reason: 'progress' });
    for (let i = 0; i * map.herbs.length < q.target; i++) p = settle(p, run({ herbs: map.herbs.map(h => h.id) }), 'complete', map);
    const r = claimQuest(p, map, q.id);
    expect(r.event).toEqual({ type: 'claimed', questId: q.id });
    expect(r.profile.potions.salve).toBe(p.potions.salve + q.reward.potions!.salve!);
    expect(r.profile.quests[q.id]).toEqual({ progress: q.target, claimed: true });
    expect(claimReason(r.profile, map, q.id)).toBe('claimed');
    // Claimed quests stop counting.
    expect(settle(r.profile, run({ herbs: [map.herbs[0]!.id] }), 'complete', map).quests[q.id]).toEqual({ progress: q.target, claimed: true });
    const b = quest('broker'); const paid = claimQuest(settle(newProfile(map, 3), run({ wins: 99 }), 'complete', map), map, b.id);
    expect(paid.profile.bank.gold).toBe(b.reward.gold);
    expect(claimReason(p, map, 'nope')).toBe('quest');
  });
});

describe('save v16', () => {
  it('round-trips quests and herbs and rejects impossible values; v15 data gains empty ones', () => {
    const q = quest('smith'); const s = run({ herbs: [map.herbs[1]!.id] });
    const profile = { ...newProfile(map, 3), quests: { [q.id]: { progress: 2, claimed: false } } };
    const raw = (p: unknown, r: unknown = s, version = 16) => JSON.stringify({ version, profile: p, run: r });
    const g = parseGame(raw(profile), map, lookup); expect(g.run).toEqual(s); expect(g.profile.quests).toEqual(profile.quests);
    expect(() => parseGame(raw({ ...profile, quests: { [q.id]: { progress: q.target + 1, claimed: false } } }), map, lookup)).toThrow();
    expect(() => parseGame(raw({ ...profile, quests: { [q.id]: { progress: 1, claimed: true } } }), map, lookup)).toThrow();
    expect(() => parseGame(raw({ ...profile, quests: { nope: { progress: 0, claimed: false } } }), map, lookup)).toThrow();
    expect(() => parseGame(raw(profile, { ...s, herbs: ['nowhere'] }), map, lookup)).toThrow();
    const old = newProfile(map, 3) as Partial<Profile>; delete old.quests; const oldRun = run() as Partial<ExpeditionState>; delete oldRun.herbs;
    const migrated = parseGame(raw(old, oldRun, 15), map, lookup);
    expect(migrated.profile.quests).toEqual({}); expect(migrated.run?.herbs).toEqual([]);
  });
});
