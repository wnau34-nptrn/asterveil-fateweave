import { describe, expect, it } from 'vitest';
import { beginBattle, levelBarrier, previewCommand, resolveCommand, skillCooldown, skillPower, targetOptions } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition, HeroDefinition } from '../src/core/battle/types';
import { veilSiege } from '../src/content/encounters/veil-siege';

// Owner 2026-11-04 (docs/design/LOGIC_AUDIT_2026-10-24_TH.md items 4–5): Heal may aim at a full-HP ally when Afterglow or
// the mender set would add a barrier; Revive levels raise the HP restored instead of shielding the priest.
type Patch = Partial<Pick<HeroDefinition, 'passive' | 'gear' | 'skillLevels'>> & { actions?: ActionId[] };
const team = (healer: Patch): EncounterDefinition => ({ ...veilSiege, heroes: veilSiege.heroes.map(h => h.id === 'healer'
  ? { ...h, ...healer, actions: ['attack', ...(healer.actions ?? ['heal'])] } as HeroDefinition : h) });
const turnOf = (d: EncounterDefinition): BattleState => { const s = structuredClone(beginBattle(d).state); s.turnIndex = s.order.indexOf('healer'); return s; };
const hero = (s: BattleState, id: string) => s.heroes.find(h => h.id === id)!;
const option = (s: BattleState, d: EncounterDefinition, action: ActionId, id: string) => targetOptions(s, d, 'healer', action).find(t => t.id === id)!;
const cast = (s: BattleState, d: EncounterDefinition, action: ActionId, targetId: string) => {
  const command = { beat: s.beat, heroId: 'healer', action, targetId }; const r = resolveCommand(s, d, command);
  expect(previewCommand(s, d, command)).toEqual(r); return r;
};

describe('Heal on a full-HP ally (logic audit 4)', () => {
  it('stays unavailable without an overflow source', () => {
    const d = team({}); const s = turnOf(d);
    expect(option(s, d, 'heal', 'guardian')).toMatchObject({ valid: false, reason: 'This ally is at full health.' });
  });
  it('with Afterglow it is available and turns the whole heal into the capped barrier', () => {
    const d = team({ passive: 'afterglow' }); const s = turnOf(d);
    expect(option(s, d, 'heal', 'guardian').valid).toBe(true);
    const after = hero(cast(s, d, 'heal', 'guardian').turns[0]!.state, 'guardian');
    expect(after.hp).toBe(hero(s, 'guardian').hp); expect(after.barrier).toBe(Math.min(d.rules.afterglowCap, skillPower(d, 'healer', 'heal')));
  });
  it('is refused again once the ally already holds that barrier (no wasted turn)', () => {
    const d = team({ passive: 'afterglow' }); const s = turnOf(d); hero(s, 'guardian').barrier = d.rules.afterglowCap;
    expect(option(s, d, 'heal', 'guardian')).toMatchObject({ valid: false, reason: 'This ally is at full health.' });
    hero(s, 'guardian').barrier = d.rules.afterglowCap - 1; expect(option(s, d, 'heal', 'guardian').valid).toBe(true);
  });
  it('the mender set overflow counts the same way', () => {
    const d = team({ gear: { overflowCap: 6 } }); const s = turnOf(d);
    expect(option(s, d, 'heal', 'guardian').valid).toBe(true);
    expect(hero(cast(s, d, 'heal', 'guardian').turns[0]!.state, 'guardian').barrier).toBe(6);
  });
  it('a downed ally still cannot be healed', () => {
    const d = team({ passive: 'afterglow' }); const s = turnOf(d); hero(s, 'tracer').hp = 0;
    expect(option(s, d, 'heal', 'tracer')).toMatchObject({ valid: false, reason: 'This hero is down.' });
  });
});

describe('Revive levels (logic audit 5)', () => {
  const at = (level: number) => team({ actions: ['revive'], skillLevels: { revive: level } });
  it('each level adds revivePoints to the HP percent, Lv5 included, with no barrier or cooldown change', () => {
    const points = veilSiege.rules.skillLevel.revivePoints;
    for (const level of [1, 2, 3, 4, 5]) {
      const d = at(level);
      expect(skillPower(d, 'healer', 'revive')).toBe(veilSiege.skills.revive.power + (level - 1) * points);
      expect(levelBarrier(d, 'healer', 'revive')).toBe(0);
      expect(skillCooldown(d, 'healer', 'revive')).toBe(veilSiege.skills.revive.cooldown);
    }
  });
  it('a Lv3 revive raises the ally with the larger share and gives the priest no barrier', () => {
    const d = at(3); const s = turnOf(d); hero(s, 'tracer').hp = 0; hero(s, 'tracer').fell = true;
    const max = d.heroes.find(h => h.id === 'tracer')!.maxHp; const st = cast(s, d, 'revive', 'tracer').turns[0]!.state;
    expect(hero(st, 'tracer').hp).toBe(Math.round(max * skillPower(d, 'healer', 'revive') / 100));
    expect(hero(st, 'healer').barrier).toBe(hero(s, 'healer').barrier);
  });
});

describe('save v46', () => {
  it('a v45 battle that used Revive restarts from its entry HP; the profile is kept', async () => {
    const { chapterOne: map } = await import('../src/content/world/chapter1');
    const { encounterById: lookup } = await import('../src/content/encounters/catalog');
    const { depart, newProfile } = await import('../src/core/world/profile');
    const { parseGame, saveGame } = await import('../src/core/save/expedition-save');
    const p = newProfile(map, 17); p.tutorialDone = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
    const game = depart(p, map, lookup, 77);
    game.run.battle = { kind: 'random', encounterId: map.tutorialEncounterId, entry: { ...game.run.hp }, commands: [{ heroId: 'healer', beat: 0, action: 'revive', targetId: 'tracer' }] };
    let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game); expect(JSON.parse(raw).version).toBe(50);
    const old = JSON.parse(raw) as { version: number }; old.version = 45;
    const migrated = parseGame(JSON.stringify(old), map, lookup);
    expect(migrated.run!.battle!.commands).toEqual([]); expect(migrated.run!.battle!.entry).toEqual(game.run.battle.entry);
    expect(migrated.profile.members).toEqual(game.profile.members); expect(migrated.profile.bank).toEqual(game.profile.bank);
  });
});

describe('save v48 (skill rework 2026-11-05)', () => {
  it('a v47 battle that used cadence, duet or turn cycle restarts from its entry HP; others keep their commands', async () => {
    const { chapterOne: map } = await import('../src/content/world/chapter1');
    const { encounterById: lookup } = await import('../src/content/encounters/catalog');
    const { depart, newProfile } = await import('../src/core/world/profile');
    const { parseGame, saveGame } = await import('../src/core/save/expedition-save');
    const p = newProfile(map, 17); p.tutorialDone = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
    for (const action of ['cadence', 'duet', 'turncycle'] as const) {
      const game = depart(p, map, lookup, 77);
      game.run.battle = { kind: 'random', encounterId: map.tutorialEncounterId, entry: { ...game.run.hp }, commands: [{ heroId: 'lalin', beat: 0, action, targetId: 'guardian' }] };
      let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game);
      const old = JSON.parse(raw) as { version: number }; old.version = 47;
      const migrated = parseGame(JSON.stringify(old), map, lookup);
      expect(migrated.run!.battle!.commands).toEqual([]); expect(migrated.run!.battle!.entry).toEqual(game.run.battle.entry);
      expect(migrated.profile.members).toEqual(game.profile.members);
    }
  });
});

describe('save v49 (skill rework step 2, 2026-11-06)', () => {
  it('a v48 battle that used Life Toll or the Toll Ring restarts from its entry HP; the profile is kept', async () => {
    const { chapterOne: map } = await import('../src/content/world/chapter1');
    const { encounterById: lookup } = await import('../src/content/encounters/catalog');
    const { depart, newProfile } = await import('../src/core/world/profile');
    const { parseGame, saveGame } = await import('../src/core/save/expedition-save');
    const p = newProfile(map, 17); p.tutorialDone = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
    for (const action of ['lifetoll', 'tollring'] as const) {
      const game = depart(p, map, lookup, 77);
      game.run.battle = { kind: 'random', encounterId: map.tutorialEncounterId, entry: { ...game.run.hp }, commands: [{ heroId: 'wynne', beat: 0, action, targetId: 'f1' }] };
      let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game);
      const old = JSON.parse(raw) as { version: number }; old.version = 48;
      const migrated = parseGame(JSON.stringify(old), map, lookup);
      expect(migrated.run!.battle!.commands).toEqual([]); expect(migrated.run!.battle!.entry).toEqual(game.run.battle.entry);
      expect(migrated.profile.members).toEqual(game.profile.members);
    }
  });
});

describe('save v50 (skill rework step 3: Garran, 2026-11-06)', () => {
  it('a v49 battle that used a reworked spear skill restarts from its entry HP; others and the profile are kept', async () => {
    const { chapterOne: map } = await import('../src/content/world/chapter1');
    const { encounterById: lookup } = await import('../src/content/encounters/catalog');
    const { depart, newProfile } = await import('../src/core/world/profile');
    const { parseGame, saveGame } = await import('../src/core/save/expedition-save');
    const p = newProfile(map, 17); p.tutorialDone = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
    const v49 = (game: ReturnType<typeof depart>) => {
      let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game);
      const old = JSON.parse(raw) as { version: number }; old.version = 49; return parseGame(JSON.stringify(old), map, lookup);
    };
    for (const action of ['brace', 'pierce', 'spearwall', 'hold', 'halt', 'warcry'] as const) {
      const game = depart(p, map, lookup, 77);
      game.run.battle = { kind: 'random', encounterId: map.tutorialEncounterId, entry: { ...game.run.hp }, commands: [{ heroId: 'garran', beat: 0, action, targetId: 'f1' }] };
      const migrated = v49(game);
      expect(migrated.run!.battle!.commands).toEqual([]); expect(migrated.run!.battle!.entry).toEqual(game.run.battle.entry);
      expect(migrated.profile.members).toEqual(game.profile.members);
    }
    // A v49 battle with no spear skill keeps its commands (replay-validated as before).
    const plain = depart(p, map, lookup, 77);
    plain.run.battle = { kind: 'random', encounterId: map.tutorialEncounterId, entry: { ...plain.run.hp }, commands: [] };
    expect(v49(plain).run!.battle).toEqual(plain.run.battle);
  });
});
