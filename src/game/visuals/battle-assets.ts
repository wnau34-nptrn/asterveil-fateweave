// Battle artwork an encounter needs before its field is ready (perf audit 2026-11-20, R1). The game page no longer
// preloads every VFX atlas and unit sheet at startup: BattleScene in lazy mode fetches what the coming encounter uses
// (and GameShell prefetches the team's set on the map), so the title and camp download only their own artwork.
// Presentation is unchanged: every skill still plays its painted layers, because the field waits for these atlases.
import type { EncounterDefinition } from '../../core/battle/types';
import { actorArt, artOf, type ArtSheet } from './assets';
import { BOLT_ATLAS, boltAtlasUrls } from './bolt-fx';
import { EXECUTE_ATLAS, WARD_ATLAS, executeAtlasUrls, wardAtlasUrls } from './exec-ward-fx';
import { BLADE_ATLAS, bladeAtlasUrls } from './blade-fx';
import { REWORK_ATLAS, reworkAtlasUrls } from './rework-fx';
import { DEFENSE_ATLAS, defenseAtlasUrls } from './defense-fx';
import { HEALING_ATLAS, healingAtlasUrls, isHealingSkill } from './healing-fx';
import { PROJECTILE_ATLAS, projectileAtlasUrls, isProjectileSkill } from './projectile-fx';
import { EARTH_ATLAS, earthAtlasUrls, isEarthSkill } from './earth-fx';
import { ALCHEMY_ATLAS, alchemyAtlasUrls, isAlchemySkill } from './alchemy-fx';
import { SEAL_ATLAS, sealAtlasUrls, isSealFx } from './arcane-seal-fx';
import { COMMAND_ATLAS, commandAtlasUrls, isCommandSkill } from './command-fx';
import { SONG_ATLAS, songAtlasUrls, isSongSkill } from './song-fx';

export interface AtlasRequest { key: string; urls: [string, string] }
type Uses = (action: string) => boolean;

// Layers whose cues follow many kinds of events (any barrier absorb, venom/arcane stacks, Duelist parries, bolt/execute/
// ward casts that draw without a fallback): every battle loads them.
const core = (): AtlasRequest[] => [
  { key: BOLT_ATLAS, urls: boltAtlasUrls() }, { key: EXECUTE_ATLAS, urls: executeAtlasUrls() }, { key: WARD_ATLAS, urls: wardAtlasUrls() },
  { key: BLADE_ATLAS, urls: bladeAtlasUrls() }, { key: REWORK_ATLAS, urls: reworkAtlasUrls() }, { key: DEFENSE_ATLAS, urls: defenseAtlasUrls() },
];
// Skill-family layers: their cues only ever come from a hero using one of the family's skills (checked in each *-fx.ts:
// `turn.side === 'hero' && isXSkill(turn.action)`, Tracking-shot follow-ups need `track`, Rouse redirects need `rouse`,
// War-cry counters need `warcry`). Earth and Alchemy also paint their heals with the healing atlas.
const families = (): [AtlasRequest, Uses][] => [
  [{ key: HEALING_ATLAS, urls: healingAtlasUrls() }, a => isHealingSkill(a) || isEarthSkill(a) || isAlchemySkill(a)],
  [{ key: PROJECTILE_ATLAS, urls: projectileAtlasUrls() }, isProjectileSkill],
  [{ key: EARTH_ATLAS, urls: earthAtlasUrls() }, isEarthSkill],
  [{ key: ALCHEMY_ATLAS, urls: alchemyAtlasUrls() }, isAlchemySkill],
  [{ key: SEAL_ATLAS, urls: sealAtlasUrls() }, isSealFx],
  [{ key: COMMAND_ATLAS, urls: commandAtlasUrls() }, isCommandSkill],
  [{ key: SONG_ATLAS, urls: songAtlasUrls() }, isSongSkill],
];
/** Every startup VFX atlas (eager mode: QA fixtures and anything that does not opt into lazy loading). */
export function allBattleAtlases(): AtlasRequest[] { return [...core(), ...families().map(([r]) => r)]; }
/** The VFX atlases a set of hero actions can paint. */
export function atlasesForActions(actions: Iterable<string>): AtlasRequest[] {
  const list = [...actions];
  return [...core(), ...families().filter(([, uses]) => list.some(uses)).map(([r]) => r)];
}
export function encounterAtlases(data: EncounterDefinition): AtlasRequest[] { return atlasesForActions(data.heroes.flatMap(h => h.actions)); }

export const ALL_SHEETS: readonly ArtSheet[] = ['units', 'mercs', 'foes', 'foes2', 'foes3', 'worldboss'];
export const sheetKey = (sheet: ArtSheet): string => `battle-${sheet}`;
/** The still unit sheets an encounter draws from (heroes, foes and reserves a phase can summon). */
export function sheetsForArt(art: Iterable<string>): ArtSheet[] {
  const used = new Set([...art].flatMap(a => actorArt[a] ? [actorArt[a].sheet] : []));
  return ALL_SHEETS.filter(s => used.has(s));
}
export function encounterSheets(data: EncounterDefinition): ArtSheet[] {
  return sheetsForArt([...data.heroes.map(h => h.id), ...data.enemies.map(e => artOf(data, e.id))]);
}
