import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { withLevel, withStrength } from '../src/core/battle/engine';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import { createCommander, newProfile } from '../src/core/world/profile';
import type { ExpeditionState } from '../src/core/world/types';
import { battleData, findTiles, move, newExpedition } from '../src/core/world/world';

// A10 (2026-10-22): a boss or elite fights with its map's strength (`map.bossPercent`, `EliteDefinition.percent`),
// stored in the battle when it starts like its level; the encounter content stays the base.
describe('map strength', () => {
  const [boss] = findTiles(map, 'boss');
  const atBoss = (): ExpeditionState => ({ ...newExpedition(map, lookup, 3), tutorialDone: true, position: { x: boss!.x, y: boss!.y + 1 }, elitesDefeated: ['scar-golem'], eventsDone: ['scar-rift'] });
  it('scales every foe’s HP and move damage, keeps charges at 0, and 100 is the base', () => {
    const base = lookup(map.bossEncounterId)!; const up = withStrength(base, 160);
    base.enemies.forEach((e, i) => expect(up.enemies[i]!.maxHp).toBe(Math.round(e.maxHp * 1.6)));
    base.intents.forEach((m, i) => expect(up.intents[i]!.damage).toBe(m.damage ? Math.max(1, Math.round(m.damage * 1.6)) : 0));
    expect(withStrength(base, 100)).toBe(base);
  });
  it('the boss and a gate elite start with their map percent and fight with it', () => {
    const s = move(atBoss(), map, 'up').state; expect(s.battle).toMatchObject({ kind: 'boss', level: map.bossLevel, percent: map.bossPercent });
    const leveled = withLevel(lookup(map.bossEncounterId)!, map.bossLevel!, map.progression.monsterLevelPercent);
    expect(battleData(s, map, lookup)!.enemies.find(e => e.boss)!.maxHp).toBe(withStrength(leveled, map.bossPercent!).enemies.find(e => e.boss)!.maxHp);
    const gate = map.elites.find(e => e.id === 'gate-thicket')!;
    const e = move({ ...newExpedition(map, lookup, 3), tutorialDone: true, position: { x: gate.x, y: gate.y + 1 } }, map, 'up').state;
    expect(e.battle).toMatchObject({ kind: 'elite', source: gate.id, percent: gate.percent });
  });
  it('a battle without a percent (seeded or saved before A10) fights the base', () => {
    const s = move(atBoss(), map, 'up').state; const plain = { ...s.battle! }; delete plain.percent;
    const leveled = withLevel(lookup(map.bossEncounterId)!, map.bossLevel!, map.progression.monsterLevelPercent);
    expect(battleData({ ...s, battle: plain }, map, lookup)!.enemies.map(e => e.maxHp)).toEqual(leveled.enemies.map(e => e.maxHp));
  });
  it('saves keep the stored percent and reject a broken one', () => {
    const profile = createCommander(newProfile(map, 4), { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' }).profile;
    const run = move(atBoss(), map, 'up').state; let raw = '';
    saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; }, removeItem: () => {} }, { profile, run });
    expect(parseGame(raw, map, lookup, MAPS).run!.battle!.percent).toBe(map.bossPercent);
    const bad = JSON.parse(raw); bad.run.battle.percent = 0;
    expect(() => parseGame(JSON.stringify(bad), map, lookup, MAPS)).toThrow();
  });
});
