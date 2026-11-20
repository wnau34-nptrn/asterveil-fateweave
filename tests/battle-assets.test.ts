import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: {} }));
import { existsSync, readFileSync } from 'node:fs';
import { presentedEncounters } from '../src/content/encounters/catalog';
import { heroes } from '../src/content/heroes/team';
import { mercenaries } from '../src/content/heroes/mercenaries';
import { ALL_SHEETS, allBattleAtlases, atlasesForActions, encounterAtlases, encounterSheets, sheetsForArt } from '../src/game/visuals/battle-assets';
import { actorArt, artOf } from '../src/game/visuals/assets';
import { HEALING_ATLAS } from '../src/game/visuals/healing-fx';
import { EARTH_ATLAS } from '../src/game/visuals/earth-fx';
import { ALCHEMY_ATLAS } from '../src/game/visuals/alchemy-fx';
import { PROJECTILE_ATLAS } from '../src/game/visuals/projectile-fx';
import { SEAL_ATLAS } from '../src/game/visuals/arcane-seal-fx';
import { COMMAND_ATLAS } from '../src/game/visuals/command-fx';
import { SONG_ATLAS } from '../src/game/visuals/song-fx';
import skillAtlas from '../src/game/visuals/skill_icons.json';

// Perf audit R1/R2 (docs/validation/perf-audit-2026-11-20): what a battle loads, and the runtime skill-icon sheet.
const keys = (list: { key: string }[]) => list.map(r => r.key).sort();
const CORE = keys(atlasesForActions([]));
describe('battle artwork per encounter (R1)', () => {
  it('lists the thirteen former startup atlases once, each with files on disk', () => {
    const all = allBattleAtlases();
    expect(new Set(all.map(r => r.key)).size).toBe(13);
    for (const r of all) for (const url of r.urls) expect(existsSync(`public/${url.replace(/^\//, '').replace(/\?.*$/, '')}`), url).toBe(true);
  });
  it('loads the six core atlases for any team, and a skill family only with one of its skills', () => {
    expect(CORE).toHaveLength(6);
    const cases: [string, string[]][] = [['heal', [HEALING_ATLAS]], ['quake', [EARTH_ATLAS, HEALING_ATLAS]], ['acid', [ALCHEMY_ATLAS, HEALING_ATLAS]],
      ['volley', [PROJECTILE_ATLAS]], ['track', [PROJECTILE_ATLAS]], ['sigil', [SEAL_ATLAS]], ['threadhex', [SEAL_ATLAS]], ['taunt', [COMMAND_ATLAS]],
      ['valor', [SONG_ATLAS]], ['rouse', [HEALING_ATLAS]], ['attack', []], ['guard', []]];
    for (const [action, extra] of cases) expect(keys(atlasesForActions(['attack', action])), action).toEqual([...CORE, ...extra].sort());
  });
  it('every presented encounter gets the core set plus the families of its heroes, and the still sheets of all its actors', () => {
    for (const data of presentedEncounters) {
      expect(keys(encounterAtlases(data))).toEqual(keys(atlasesForActions(data.heroes.flatMap(h => h.actions))));
      const needed = new Set([...data.heroes.map(h => h.id), ...data.enemies.map(e => artOf(data, e.id))].flatMap(a => actorArt[a] ? [actorArt[a].sheet] : []));
      expect(encounterSheets(data), data.id).toEqual(ALL_SHEETS.filter(s => needed.has(s)));
    }
  });
  it('a one-class team loads less than the old startup preload', () => {
    const knight = [...heroes, ...mercenaries].find(h => h.id === 'guardian')!;
    expect(atlasesForActions(knight.actions).length).toBeLessThan(13);
    expect(sheetsForArt(['guardian', 'foe_dew_slime'])).toEqual(['units', 'foes2']);
  });
});

// VP8L (lossless WebP) stores width-1 and height-1 as two 14-bit fields after the 0x2f signature byte.
function vp8lSize(path: string): [number, number] {
  const b = readFileSync(path);
  expect(b.subarray(12, 16).toString('ascii')).toBe('VP8L');
  const bits = b.readUInt32LE(21);
  return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
}
describe('runtime skill-icon sheet (R2)', () => {
  it('is the lossless 256 px master at exactly half size, same grid', () => {
    const [mw, mh] = vp8lSize('public/assets/ui/skill_icons.webp'), [w, h] = vp8lSize('public/assets/ui/skill_icons_128.webp');
    expect([mw, mh]).toEqual([skillAtlas.cols * skillAtlas.cell, skillAtlas.rows * skillAtlas.cell]);
    expect([w, h]).toEqual([mw / 2, mh / 2]);
  });
  it('the game loads the runtime sheet with its current revision', async () => {
    const { createHash } = await import('node:crypto');
    const rev = createHash('sha256').update(readFileSync('public/assets/ui/skill_icons_128.webp')).digest('hex').slice(0, 8);
    expect(readFileSync('src/ui/icons.ts', 'utf8')).toContain(`assets/ui/skill_icons_128.webp?v=${rev}`);
  });
});
