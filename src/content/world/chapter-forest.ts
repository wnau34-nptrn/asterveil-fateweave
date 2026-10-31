import type { MapDefinition } from '../../core/world/types';
import { gameRules } from './rules';

// Map 2 (chapters plan, owner-approved 2026-10-17; lore draft act 1): the forest trail twisted by the rift. It teaches
// events, a forced elite gate, an optional elite, a cracked-wall secret, two camps to travel between and a herb.
// No rift seal yet. Garran, who guards the trail alone, joins at the first camp. Draft numbers until playtested.
export const forestMap: MapDefinition = {
  ...gameRules,
  id: 'deep-forest', version: 2, name: 'เส้นทางป่าทึบ', chapter: 2, bossName: 'เจ้าป่าหนาม', goalName: 'ทางออกป่า',
  // Skill tomes (docs/design/SKILL_TOMES_TH.md, draft): the thorn lord pays tomes every win, a large one on the first clear.
  tomes: { boss: { medium: 1, small: 2 }, first: { large: 1, core: 0 } },
  summary: 'ทางผ่านป่าที่รอยแยกบิดให้กลายเป็นหนาม ฝ่าด่านอีลิท เจอเหตุการณ์กลางทาง แล้วสงบเจ้าป่าหนาม',
  rows: [
    '################',
    '#######:G:######',
    '########B#######',
    '##,,,,,,C,,,,,##',
    '##,,##,,,,,##,,#',
    '#,,,#,,,,,,,#,,#',
    '#,#,,,,,,##,,,,#',
    '########,#######',
    '#,,,,,,,,,,,,,,#',
    '#,,##,,,C,,,##,#',
    '#,,#,,,,,,,,,#,#',
    '#,,,,,##,,##,,##',
    '###,,,,,S,,,,#,#',
    '################',
  ],
  floorZones: { ',': 'thicket', ':': 'sanctum' },
  specialZones: { S: 'thicket', C: 'camp', B: 'sanctum', G: 'sanctum' },
  zones: [
    { id: 'thicket', name: 'เส้นทางป่าทึบ', safe: false, base: 7, step: 4, cap: 40, levels: [3, 6], sets: ['shadow', 'thorn'],
      pool: [{ encounterId: 'beetle-spore', weight: 3 }, { encounterId: 'beetle-wall', weight: 2 }, { encounterId: 'stalker-spore', weight: 2 }, { encounterId: 'forest-swarm', weight: 1 }, { encounterId: 'thorn-host', weight: 1 }, { encounterId: 'shadow-stalker', weight: 1 }, { encounterId: 'rift-whelp', weight: 1 }],
      loot: { ore: [5, 7], gold: [2, 5], ember: [0, 12], seal: [0, 0] } },
    { id: 'camp', name: 'แคมป์', safe: true, base: 0, step: 0, cap: 0, pool: [] },
    { id: 'sanctum', name: 'ทางออกป่า', safe: true, base: 0, step: 0, cap: 0, pool: [] },
  ],
  bossEncounterId: 'elite-briar-lord', bossLevel: 6,
  // A10 (2026-10-22): plain attacks beat the thorn lord every time; its foes fight with 130% HP and move damage.
  bossPercent: 130,
  bossDrop: { weights: [0, 30, 45, 20, 5], zoneSets: true },
  // Seren, who parted after the map 1 prologue, comes back as the thorn lord's fight starts (owner 2026-10-23).
  recruits: [{ hero: 'garran', at: 'camp' }, { hero: 'healer', at: 'boss' }],
  revealRadius: 3,
  chests: [
    { id: 'forest-west', x: 1, y: 10, tier: 'common' }, { id: 'forest-east', x: 14, y: 5, tier: 'common' },
    { id: 'forest-ridge', x: 3, y: 3, tier: 'rare' }, { id: 'forest-secret', x: 14, y: 12, tier: 'common' },
  ],
  herbs: [{ id: 'forest-herb', x: 13, y: 3 }],
  puzzles: { runes: [], boulders: [], levers: [], secrets: [{ id: 'forest-secret', x: 13, y: 12 }] },
  loot: {
    tutorial: { ore: [10, 10], gold: [5, 5], ember: [1, 0], seal: [0, 0] },
    boss: { ore: [32, 32], gold: [14, 14], ember: [1, 0], seal: [1, 0] },
    chest: { common: { ore: [9, 13], gold: [4, 6], ember: [0, 30], seal: [0, 0] }, rare: { ore: [16, 20], gold: [8, 10], ember: [1, 0], seal: [1, 0] } },
  },
  elites: [
    // Forced: the only way north to the boss.
    { id: 'forest-gate', x: 8, y: 7, encounterId: 'elite-tusk-chief', forced: true, level: 5, percent: 120 },
    // Optional: a dead-end pocket in the north-west.
    { id: 'forest-matriarch', x: 1, y: 6, encounterId: 'thicket-ambush', forced: false, level: 6 },
  ],
  quest: { need: 0, objectives: [] },
  events: [{ id: 'forest-traveller', x: 14, y: 8, kind: 'traveller' }, { id: 'forest-shrine', x: 2, y: 11, kind: 'shrine' }],
};
