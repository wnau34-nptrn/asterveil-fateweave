import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { resolveCommand } from '../src/core/battle/engine';
import { backupLegacySave, expeditionKey, legacyBackupKey, loadGame, parseGame, saveGame, type Game, type StoragePort } from '../src/core/save/expedition-save';
import { boardOffers, buy, depart, dismiss, hire, hireable, hireReason, newProfile, placeMember, setArchived, settle } from '../src/core/world/profile';
import { talentPoints, talentsValid } from '../src/core/world/talents';
import type { ExpeditionState, Profile } from '../src/core/world/types';
import { battleData, battleState, campLevel, campProgress, capXp, finishBattle, heroCatalog, levelOf, levelXp, maxCampXp, memberDef, move, newExpedition, recordBattle } from '../src/core/world/world';
import { battleLesson } from '../src/ui/tutorial';
import { xpAt } from './fixtures/camp-level';
import { legacyEnvelope } from './fixtures/legacy-save';

// P01 (save v44): one camp level and EXP for every owned member, EXP once per victory, the whole catalog held, and the
// move from per-member levels (docs/design/p00/SHARED_PROGRESSION_TEAM_SPEC_TH.md, MIGRATION_ACCEPTANCE_TH.md).
const write = (game: Game): string => { let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game); return raw; };
const memory = (): StoragePort & { values: Map<string, string> } => { const values = new Map<string, string>(); return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); } }; };
function fought(state: ExpeditionState): ExpeditionState {
  const data = battleData(state, map, lookup)!; let s = battleState(state, map, lookup)!;
  while (s.outcome === 'active') { const l = battleLesson(s, data)!; s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return recordBattle(state, map, lookup, s.commands);
}
function firstBattle(profile: Profile, seed = 3): Game {
  const game = depart(profile, map, lookup, seed); let s = game.run;
  for (let i = 0; i < 200 && !s.battle; i++) s = move(s, map, i % 2 ? 'up' : 'down').state;
  return { profile: game.profile, run: s };
}
const veteran = (): Profile => ({ ...newProfile(map, 5), tutorialDone: true, commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } });
// A v43 envelope: members carry their own level/exp (legacy shape); `levels` sets them per member.
function v43(game: Game, levels: Record<string, [number, number]>, runLevels: Record<string, [number, number]> = levels): Record<string, unknown> {
  const raw = legacyEnvelope({ ...JSON.parse(write(game)), version: 43 }) as Record<string, Record<string, unknown> | null>;
  const set = (members: unknown, values: Record<string, [number, number]>) => {
    for (const [id, m] of Object.entries(members as Record<string, Record<string, unknown>>)) {
      delete m.level; delete m.exp; const v = values[id]; if (v && (v[0] > 1 || v[1] > 0)) Object.assign(m, { level: v[0], exp: v[1] });
    }
  };
  set(raw.profile!.members, levels); if (raw.run) set(raw.run.members, runLevels);
  return raw;
}

describe('camp level thresholds and cap', () => {
  it('derives the level from total EXP with next(L) = 20 + 45L, capped by content', () => {
    expect([1, 2, 3, 10].map(l => levelXp(map, l))).toEqual([0, 65, 175, 2205]);
    expect(campLevel(map, 64)).toBe(1); expect(campLevel(map, 65)).toBe(2); expect(campLevel(map, capXp(map) - 1)).toBe(9);
    expect(campLevel(map, maxCampXp(map))).toBe(map.progression.levelCap);
    expect(campProgress(map, 70)).toEqual({ level: 2, exp: 5, need: 110 }); expect(campProgress(map, capXp(map) + 30)).toEqual({ level: 10, exp: 0, need: 0 });
  });
  it('every owned member, in the team, the reserve, the camp or just hired, fights at the camp level', () => {
    let p = { ...veteran(), campXp: xpAt(6), bank: { ore: 0, gold: 999, seal: 0, dust: 0 } };
    p = placeMember(p, map, 'healer', 'bench').profile; expect(p.party.deployed).not.toContain('healer');
    const offer = boardOffers(p, map, lookup).findIndex(id => !p.company.includes(id));
    p = hire(p, map, lookup, offer).profile; const hired = p.company.at(-1)!;
    expect(p.members[hired]).toEqual({ stars: 1, dupes: 0 });
    for (const id of p.company) expect(memberDef(lookup, map, p, id)!.maxHp).toBe(memberDef(lookup, map, { members: { [id]: { stars: p.members[id]!.stars, dupes: 0 } }, campXp: xpAt(6) }, id)!.maxHp);
    // Talent points come from the camp level (stars still add theirs until P04).
    expect(talentPoints(map, p.members[hired], hired, levelOf(map, p))).toBe(5);
    const run = depart(p, map, lookup, 9).run; expect(run.campXp).toBe(p.campXp); expect(levelOf(map, run)).toBe(6);
  });
});

describe('EXP once per victory', () => {
  it('a victory pays the camp once; finishing again, reloading or settling never adds more', () => {
    const start = firstBattle(veteran()); const before = start.run!.campXp;
    const won = finishBattle(fought(start.run!), map, lookup); if (won.event.type !== 'victory') throw new Error('expected a win');
    const gain = won.event.exp!; expect(gain.gained).toBeGreaterThan(0); expect(won.state.campXp).toBe(before + gain.gained);
    // The battle is cleared in the same state that holds the EXP: it cannot be finished twice.
    expect(won.state.battle).toBeNull(); expect(() => finishBattle(won.state, map, lookup)).toThrow();
    // Saving and loading the won state twice keeps the same EXP.
    const once = parseGame(write({ profile: start.profile, run: won.state }), map, lookup, MAPS);
    expect(parseGame(write(once), map, lookup, MAPS)).toEqual(once); expect(once.run!.campXp).toBe(before + gain.gained);
    // Settling hands the run's EXP back and is not an award: settling the same run again gives the same camp EXP.
    for (const outcome of ['complete', 'withdrawn', 'wiped'] as const) {
      const home = settle(start.profile, won.state, outcome, map); expect(home.campXp).toBe(before + gain.gained);
      expect(settle(home, won.state, outcome, map).campXp).toBe(home.campXp);
    }
  });
  it('the same victory pays the same EXP for a team of one, four or eight', () => {
    const big = firstBattle({ ...veteran(), company: ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'lio'],
      members: Object.fromEntries(['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'lio'].map(id => [id, { stars: 1, dupes: 0 }])),
      party: { deployed: ['guardian', 'tracer', 'weaver', 'healer'], reserve: ['garran', 'mira', 'toma', 'lio'] } });
    const small = { ...big.run!, roster: { deployed: big.run!.roster.deployed, reserve: [] } };
    for (const id of big.run!.roster.reserve) { delete small.hp[id]; delete small.members[id]; }
    const a = finishBattle(fought(big.run!), map, lookup).event, b = finishBattle(fought(small), map, lookup).event;
    expect(a.type === 'victory' && a.exp).toEqual(b.type === 'victory' && b.exp);
  });
  it('stops at the cap: no new EXP, a migrated partial is kept, and a level-up raises standing HP only', () => {
    const at = firstBattle({ ...veteran(), campXp: capXp(map) + 40 });
    const won = finishBattle(fought(at.run!), map, lookup); if (won.event.type !== 'victory') throw new Error('expected a win');
    expect(won.event.exp).toMatchObject({ gained: 0, level: 10, levelsUp: 0 }); expect(won.state.campXp).toBe(capXp(map) + 40);
    const near = firstBattle({ ...veteran(), campXp: capXp(map) - 1 });
    const up = finishBattle(fought(near.run!), map, lookup); expect(up.state.campXp).toBe(capXp(map));
    // A level-up: the fallen stay down, the standing gain the max-HP difference (members outside the run follow the level too).
    const low = firstBattle({ ...veteran(), campXp: xpAt(2) - 1 }); const run = structuredClone(low.run!); run.hp.healer = 0; run.battle!.entry.healer = 0;
    const r = finishBattle(fought(run), map, lookup); if (r.event.type !== 'victory') throw new Error('expected a win');
    expect(r.event.exp!.levelsUp).toBeGreaterThanOrEqual(1); expect(r.state.hp.healer).toBe(0);
    expect(() => parseGame(write({ profile: low.profile, run: { ...low.run!, campXp: maxCampXp(map) + 1 } }), map, lookup, MAPS)).toThrow();
  });
  it('rejects a run whose camp EXP is below the profile it left from', () => {
    const g = firstBattle({ ...veteran(), campXp: xpAt(3) });
    expect(() => parseGame(write({ profile: g.profile, run: { ...g.run!, campXp: xpAt(3) - 1 } }), map, lookup, MAPS)).toThrow();
    expect(() => parseGame(write({ profile: { ...g.profile, campXp: 1.5 }, run: null }), map, lookup)).toThrow();
  });
});

describe('holding the whole catalog (OD-14)', () => {
  it('has no company cap; a known ID hired again is a duplicate, never a second ID', () => {
    let p: Profile = { ...veteran(), bank: { ore: 0, gold: 99999, seal: 0, dust: 0 } };
    for (let returns = 0; returns < 60 && p.company.length < hireable(map, lookup).length; returns++) {
      p = { ...p, returns, taken: [] };
      for (let i = 0; i < boardOffers(p, map, lookup).length; i++) if (!hireReason(p, map, lookup, i)) p = hire(p, map, lookup, i).profile;
    }
    expect([...p.company].sort()).toEqual(hireable(map, lookup).sort()); expect(new Set(p.company).size).toBe(p.company.length);
    const dupes = Object.values(p.members).reduce((n, m) => n + m.dupes, 0); expect(dupes).toBeGreaterThan(0);
    expect(parseGame(write({ profile: p, run: null }), map, lookup).profile).toEqual(p);
  });
  it('parked Odran and Isolde are never offered anew, but an owner keeps them, their stars and their duplicates', () => {
    expect(hireable(map, lookup)).not.toContain('thiran'); expect(hireable(map, lookup)).not.toContain('wila');
    for (let seed = 0; seed < 200; seed++) for (const returns of [0, 1, 2]) expect(boardOffers({ ...newProfile(map, seed), returns }, map, lookup).some(id => ['thiran', 'wila'].includes(id))).toBe(false);
    for (const m of MAPS) for (const r of m.recruits ?? []) expect(['thiran', 'wila']).not.toContain(r.hero);
    for (const m of MAPS) expect(m.draft?.pool ?? []).not.toContain('thiran');
    const p = { ...veteran(), company: ['guardian', 'thiran', 'wila'], members: { guardian: { stars: 1, dupes: 0 }, thiran: { stars: 2, dupes: 1, talents: { p1: 1 } }, wila: { stars: 1, dupes: 0 } },
      party: { deployed: ['guardian', 'thiran'], reserve: [] }, campXp: xpAt(4), bank: { ore: 0, gold: 999, seal: 0, dust: 0 } };
    const back = parseGame(write({ profile: p, run: null }), map, lookup).profile; expect(back).toEqual(p);
    expect(buy(back, map, 'contract', 'wila').profile.members.wila!.dupes).toBe(1);
  });
  it('a story or starter recruit the company already owns brings no second ID and no duplicate', () => {
    const p = { ...veteran(), company: ['guardian', 'tracer', 'weaver', 'healer', 'lio'], members: Object.fromEntries(['guardian', 'tracer', 'weaver', 'healer', 'lio'].map(id => [id, { stars: 1, dupes: 0 }])) };
    const run = newExpedition(map, lookup, 4, { roster: p.party, members: structuredClone(p.members), campXp: p.campXp }, true); run.recruited = ['lio'];
    const home = settle(p, run, 'withdrawn', map); expect(home.company.filter(id => id === 'lio')).toHaveLength(1); expect(home.members.lio).toEqual({ stars: 1, dupes: 0 });
  });
});

describe('camp archive', () => {
  it('puts bench members away without touching what they own; bringing them back or dismissing clears it', () => {
    let p: Profile = { ...veteran(), company: ['guardian', 'tracer', 'weaver', 'healer', 'mira'], party: { deployed: ['guardian', 'tracer', 'weaver', 'healer'], reserve: [] },
      members: { ...veteran().members, mira: { stars: 3, dupes: 2, talents: { a1: 1 }, skillLevels: { volley: 2 } } }, campXp: xpAt(5) };
    expect(setArchived(p, 'guardian', true).event).toEqual({ type: 'blocked', reason: 'busy' });
    expect(setArchived(p, 'mira', false).event).toEqual({ type: 'blocked', reason: 'unchanged' });
    const before = structuredClone(p.members.mira);
    p = setArchived(p, 'mira', true).profile; expect(p.archived).toEqual(['mira']); expect(p.members.mira).toEqual(before);
    expect(parseGame(write({ profile: p, run: null }), map, lookup).profile).toEqual(p);
    expect(placeMember(p, map, 'mira', 'reserve').profile.archived).toBeUndefined();
    expect(setArchived(p, 'mira', false).profile.archived).toBeUndefined();
    expect(dismiss(p, map, 'mira').profile.archived).toBeUndefined();
    const bad = JSON.parse(write({ profile: p, run: null })); bad.profile.archived = ['guardian'];
    expect(() => parseGame(JSON.stringify(bad), map, lookup)).toThrow();
  });
});

describe('save v43 → v44 migration', () => {
  it('takes the most advanced owned member (bench included), never the sum; everyone projects to it', () => {
    const p = { ...veteran(), company: ['guardian', 'tracer', 'weaver', 'healer', 'garran'], members: Object.fromEntries(['guardian', 'tracer', 'weaver', 'healer', 'garran'].map(id => [id, { stars: 1, dupes: 0 }])) };
    const raw = v43({ profile: p, run: null }, { guardian: [4, 10], tracer: [3, 0], weaver: [1, 0], healer: [2, 60], garran: [6, 7] });
    const g = parseGame(JSON.stringify(raw), map, lookup, MAPS);
    expect(g.profile.campXp).toBe(xpAt(6) + 7); expect(levelOf(map, g.profile)).toBe(6);
    expect(g.migrated).toEqual({ from: 43, level: 6, campXp: xpAt(6) + 7, best: 'garran' });
    for (const m of Object.values(g.profile.members)) { expect(m).not.toHaveProperty('level'); expect(m).not.toHaveProperty('exp'); }
    // Saving writes v44 once; loading it again is not another migration.
    const again = parseGame(write(g), map, lookup, MAPS); expect(again.migrated).toBeUndefined(); expect(again.profile).toEqual(g.profile);
  });
  it('missing levels are Lv1/0; a capped member keeps its partial EXP without overflowing', () => {
    const p = veteran();
    expect(parseGame(JSON.stringify(v43({ profile: p, run: null }, {})), map, lookup).profile.campXp).toBe(0);
    const capped = parseGame(JSON.stringify(v43({ profile: p, run: null }, { guardian: [10, 300] })), map, lookup).profile;
    expect(capped.campXp).toBe(capXp(map) + 300); expect(levelOf(map, capped)).toBe(10);
    expect(() => parseGame(JSON.stringify(v43({ profile: p, run: null }, { guardian: [10, 9999] })), map, lookup)).toThrow();
    const odd = v43({ profile: p, run: null }, {}) as { profile: { members: Record<string, Record<string, unknown>> } }; odd.profile.members.guardian!.level = 3;
    expect(() => parseGame(JSON.stringify(odd), map, lookup)).toThrow();
  });
  it('keeps stars, duplicates, grants, talents, gear and skill levels; no member loses talent budget', () => {
    const p = { ...veteran(), members: { ...veteran().members, guardian: { stars: 3, dupes: 2, grants: ['c1s'], talents: { a1: 2, b1: 1 }, loadout: ['guard'], skillLevels: { bash: 2 } },
      tracer: { stars: 1, dupes: 0, talents: { a1: 1 } } } } as Profile;
    const raw = v43({ profile: p, run: null }, { guardian: [5, 0], tracer: [2, 0] });
    const g = parseGame(JSON.stringify(raw), map, lookup);
    expect(g.profile.members).toEqual(p.members); expect(levelOf(map, g.profile)).toBe(5);
    for (const [id, m] of Object.entries(g.profile.members)) expect(talentsValid(map, id, levelOf(map, g.profile), m.talents ?? {}, m.stars, m.grants)).toBe(true);
    expect(talentPoints(map, g.profile.members.tracer, 'tracer', levelOf(map, g.profile))).toBeGreaterThan(talentPoints(map, g.profile.members.tracer, 'tracer', 2));
  });
  it('an active run uses its members’ newer levels (not guests), keeps the map, and restarts its battle from entry', () => {
    const start = firstBattle(veteran()); const s = fought(start.run!);
    expect(s.battle!.commands.length).toBeGreaterThan(0);
    const raw = v43({ profile: start.profile, run: s }, { guardian: [3, 0] }, { guardian: [4, 5], tracer: [2, 0] });
    const g = parseGame(JSON.stringify(raw), map, lookup, MAPS);
    expect(g.profile.campXp).toBe(xpAt(4) + 5); expect(g.run!.campXp).toBe(xpAt(4) + 5);
    expect(g.run!.position).toEqual(s.position); expect(g.run!.steps).toBe(s.steps); expect(g.run!.battle!.entry).toEqual(s.battle!.entry);
    expect(g.run!.battle!.commands).toEqual([]); expect(g.migrated).toMatchObject({ battle: true, best: 'guardian' });
    // The restarted battle replays deterministically after the move and pays once.
    const again = parseGame(write(g), map, lookup, MAPS); expect(battleState(again.run!, map, lookup)).toEqual(battleState(g.run!, map, lookup));
    const won = finishBattle(fought(again.run!), map, lookup); expect(won.state.campXp).toBeGreaterThan(g.run!.campXp);
  });
  it('guests and recruits still on their way do not count; this run’s recruits do; arrivals become a list', () => {
    const ruins = MAPS[0]!; const p = { ...veteran(), company: ['guardian'], members: { guardian: { stars: 1, dupes: 0 } }, party: { deployed: ['guardian'], reserve: [] } };
    const roster = { deployed: ['guardian', 'tracer', 'healer'], reserve: [] };
    const run = newExpedition(ruins, lookup, 4, { roster, members: Object.fromEntries(roster.deployed.map(id => [id, { stars: 1, dupes: 0 }])) }, true);
    const env = v43({ profile: p, run }, { guardian: [2, 0] }, { guardian: [2, 0], tracer: [5, 0], healer: [7, 0] }) as { run: Record<string, unknown> };
    env.run.recruited = ['tracer']; env.run.guests = ['healer']; env.run.arrivals = { weaver: 9 };
    const g = parseGame(JSON.stringify(env), map, lookup, MAPS);
    // Seren (a guest, Lv7) and Aira's old arrival level do not count; Lyra (recruited on this run, Lv5) does.
    expect(g.profile.campXp).toBe(xpAt(5)); expect(g.run!.campXp).toBe(xpAt(5)); expect(g.run!.arrivals).toEqual(['weaver']);
    expect(levelOf(map, g.run!)).toBe(5); expect(g.run!.members.healer).toEqual({ stars: 1, dupes: 0 });
  });
  it('preserves a frozen v42 hiring board and the taken offers', () => {
    const p = { ...veteran(), taken: [1], boardPool: heroCatalog(lookup, map).map(h => h.id).filter(id => !['metta', 'thiran', 'lalin', 'wila'].includes(id)) };
    const g = parseGame(JSON.stringify(v43({ profile: p, run: null }, {})), map, lookup).profile;
    expect(g.boardPool).toEqual(p.boardPool); expect(g.taken).toEqual([1]); expect(boardOffers(g, map, lookup)).toEqual(boardOffers(p, map, lookup));
  });
  it('backs the original save up once; failed storage, bad JSON and future versions never overwrite it', () => {
    const store = memory(); const raw = JSON.stringify(v43({ profile: veteran(), run: null }, { guardian: [3, 0] }));
    store.setItem(expeditionKey, raw);
    const g = loadGame(store, map, lookup, MAPS)!; expect(g.migrated).toMatchObject({ level: 3 });
    expect(store.getItem(legacyBackupKey(43))).toBe(raw); expect(store.getItem(expeditionKey)).toBe(raw);
    // A second load of the same old save keeps the first backup.
    store.setItem(legacyBackupKey(43), 'first'); loadGame(store, map, lookup, MAPS); expect(store.getItem(legacyBackupKey(43))).toBe('first');
    const full: StoragePort = { getItem: k => k === expeditionKey ? raw : null, setItem: () => { throw new Error('QuotaExceeded'); } };
    expect(loadGame(full, map, lookup, MAPS)?.profile.campXp).toBe(xpAt(3)); expect(backupLegacySave(full, raw, 43)).toBe(false);
    for (const bad of ['{', JSON.stringify({ ...JSON.parse(raw), version: 99 })]) {
      const s = memory(); s.setItem(expeditionKey, bad); expect(loadGame(s, map, lookup, MAPS)).toBeUndefined(); expect(s.getItem(expeditionKey)).toBe(bad); expect(s.values.size).toBe(1);
    }
  });
});
