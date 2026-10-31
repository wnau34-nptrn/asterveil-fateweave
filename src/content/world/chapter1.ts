import type { MapDefinition } from '../../core/world/types';
import { gameRules } from './rules';

// Chapter 1 layout: start (S) in the green south, camp (C) in the yellow middle,
// final camp before the boss (B) who guards the goal (G). '#' is impassable.
// Version 2 (phase 3A) narrows the two zone gates to one tile each, held by an elite.
export const chapterOne: MapDefinition = {
  ...gameRules,
  id: 'veil-frontier', version: 7, name: 'แนวรอยแยก',
  // Skill tomes (docs/design/SKILL_TOMES_TH.md, draft): the rift warden pays more, and its first clear a rift core.
  tomes: { boss: { medium: 3, small: 2 }, first: { large: 1, core: 0 } },
  chapter: 3, summary: 'ชายแดนแอสเตอร์เวลที่รอยแยกเปิดกว้าง ทำลายผนึกแล้วโค่นผู้คุมรอยแยก', clearStory: 'warden', bossCharm: true, bossName: 'ผู้คุมรอยแยก', goalName: 'ประตูรอยแยก',
  rows: [
    '#######################',
    '########:G:############',
    '########:::############',
    '#########B#############',
    '####;;;;;C;;;;;;#######',
    '####;;##;;;##;;;;######',
    '###;;;##;;;##;;#;;#####',
    '###;;;;;;#;;;;;#;;#####',
    '##;#;;;###;;;;;;;;#;;##',
    '#####;;;;;;##;;;#######',
    '#########;#############',
    '####,,,,,,,,,,,,#######',
    '###,,,##,,,,,##,,,#####',
    '###,,,##,,#,,##,,,,,,,#',
    '###,,,,,,,#,,,,,,,#####',
    '##,#,,,#,,,,,#,,,######',
    '#####,,#,,C,,#,,#######',
    '######,,,,,,,,,########',
    '#######,,....,#########',
    '#####...........#######',
    '####....##...##..######',
    '###.....##...##...#..##',
    '###..#.........#..#####',
    '###..#...##....#..#####',
    '##.#.....##.....#######',
    '#####.....S....########',
    '#######.......#########',
    '#######################',
  ],
  floorZones: { '.': 'meadow', ',': 'thicket', ';': 'scar', ':': 'sanctum' },
  specialZones: { S: 'meadow', C: 'camp', B: 'sanctum', G: 'sanctum' },
  zones: [
    { id: 'meadow', name: 'ทุ่งชายแดน', safe: false, base: 4, step: 3, cap: 35, levels: [6, 7], sets: ['dawn', 'wind'],
      pool: [{ encounterId: 'slime-pair', weight: 3 }, { encounterId: 'bat-swarm', weight: 2 }, { encounterId: 'slime-nest', weight: 1 }, { encounterId: 'scout-patrol', weight: 2 }, { encounterId: 'tusker-bats', weight: 1 }],
      loot: { ore: [4, 6], gold: [2, 4], ember: [0, 8], seal: [0, 0] } },
    { id: 'thicket', name: 'พงหนามชายแดน', safe: false, base: 6, step: 4, cap: 45, levels: [7, 9], sets: ['shadow', 'thorn'],
      pool: [{ encounterId: 'beetle-spore', weight: 3 }, { encounterId: 'beetle-wall', weight: 2 }, { encounterId: 'stalker-spore', weight: 2 }, { encounterId: 'forest-swarm', weight: 1 }, { encounterId: 'thorn-host', weight: 1 }, { encounterId: 'shadow-stalker', weight: 1 }, { encounterId: 'rift-whelp', weight: 1 }],
      loot: { ore: [5, 8], gold: [2, 5], ember: [0, 12], seal: [0, 0] } },
    { id: 'scar', name: 'แผลรอยแยก', safe: false, base: 8, step: 5, cap: 50, levels: [9, 10], sets: ['starveil', 'mender'],
      pool: [{ encounterId: 'channeler-wisps', weight: 2 }, { encounterId: 'crawler-pack', weight: 2 }, { encounterId: 'rift-host', weight: 1 }, { encounterId: 'rift-legion', weight: 1 }, { encounterId: 'veil-siege', weight: 1 }, { encounterId: 'rear-ambush', weight: 1 }, { encounterId: 'crystal-stampede', weight: 1 }],
      loot: { ore: [7, 11], gold: [4, 6], ember: [0, 15], seal: [0, 0] } },
    { id: 'camp', name: 'แคมป์', safe: true, base: 0, step: 0, cap: 0, pool: [] },
    { id: 'sanctum', name: 'ประตูรอยแยก', safe: true, base: 0, step: 0, cap: 0, pool: [] },
  ],
  bossEncounterId: 'rift-warden', bossLevel: 11,
  // A10 (2026-10-22): the warden died in about six rounds having landed two blows (campaign simulation,
  // docs/validation/balance-sim/CAMPAIGN.md), so its foes fight with 160% HP and move damage here.
  bossPercent: 160,
  revealRadius: 3,
  // Draft phase 2A numbers: chests sit in side pockets away from the main route.
  chests: [
    { id: 'meadow-west', x: 3, y: 23, tier: 'common' }, { id: 'meadow-east', x: 17, y: 23, tier: 'common' },
    { id: 'thicket-west', x: 3, y: 12, tier: 'common' }, { id: 'thicket-east', x: 17, y: 12, tier: 'rare' },
    { id: 'scar-west', x: 3, y: 6, tier: 'rare' }, { id: 'scar-east', x: 17, y: 6, tier: 'common' },
    // 3C: puzzle vaults (rare) and secret pockets (common).
    { id: 'meadow-vault', x: 20, y: 21, tier: 'rare' }, { id: 'thicket-vault', x: 21, y: 13, tier: 'rare' }, { id: 'scar-vault', x: 20, y: 8, tier: 'rare' },
    { id: 'meadow-secret', x: 2, y: 24, tier: 'common' }, { id: 'thicket-secret', x: 2, y: 15, tier: 'common' }, { id: 'scar-secret', x: 2, y: 8, tier: 'common' },
  ],
  // Glowing herbs for the herbalist, one per zone.
  herbs: [{ id: 'meadow-herb', x: 7, y: 23 }, { id: 'thicket-herb', x: 12, y: 15 }, { id: 'scar-herb', x: 12, y: 7 }],
  // Phase 3C (draft): one puzzle per zone guarding a rare chest, and one secret wall per zone hiding a common one.
  // The map is 23 columns wide: x 20–21 hold the vaults behind the old east wall.
  puzzles: {
    runes: [{ id: 'meadow-runes', door: { x: 18, y: 21 }, stones: [{ x: 5, y: 21, glyph: 'star' }, { x: 11, y: 19, glyph: 'moon' }, { x: 16, y: 22, glyph: 'sun' }] }],
    boulders: [{ id: 'thicket-boulder', at: { x: 19, y: 13 }, pit: { x: 20, y: 13 } }],
    levers: [{ id: 'scar-levers', door: { x: 18, y: 8 }, levers: [{ x: 5, y: 9 }, { x: 15, y: 9 }] }],
    secrets: [{ id: 'meadow-secret', x: 3, y: 24 }, { id: 'thicket-secret', x: 3, y: 15 }, { id: 'scar-secret', x: 3, y: 8 }],
  },
  loot: {
    tutorial: { ore: [10, 10], gold: [5, 5], ember: [1, 0], seal: [0, 0] },
    boss: { ore: [36, 36], gold: [18, 18], ember: [1, 0], seal: [2, 0] },
    chest: { common: { ore: [10, 14], gold: [5, 7], ember: [0, 30], seal: [0, 0] }, rare: { ore: [18, 24], gold: [9, 12], ember: [1, 0], seal: [1, 0] } },
  },
  // Map potions (2D-5, draft numbers).
  // Phase 3A (draft numbers): elites hold the one-tile gates; events wait in the side areas, two per zone.
  // A10: `percent` makes these fights tougher than the base content (plain attacks lost them rarely).
  elites: [
    // Optional: the meadow passage is wide, so the Tusk Chief can be challenged or walked around.
    { id: 'gate-meadow', x: 9, y: 18, encounterId: 'elite-tusk-chief', forced: false, level: 8, percent: 120 },
    // Forced: the only way from the thicket to the scar and the boss.
    { id: 'gate-thicket', x: 9, y: 10, encounterId: 'elite-briar-lord', forced: true, level: 9, percent: 130 },
    // Mini-boss (3B): optional, in the scar's right-hand pocket; beating it is one rift-seal objective.
    { id: 'scar-golem', x: 17, y: 6, encounterId: 'mini-veil-golem', forced: false, mini: true, level: 10, percent: 140 },
  ],
  // The rift seal (3B, draft): any two of the three open the way to the boss.
  quest: { need: 2, objectives: [
    { id: 'golem', kind: 'elite', target: 'scar-golem' },
    { id: 'chests', kind: 'chests', count: 6 },
    { id: 'rift', kind: 'event', target: 'scar-rift' },
  ] },
  events: [
    { id: 'meadow-traveller', x: 4, y: 20, kind: 'traveller' }, { id: 'meadow-merchant', x: 3, y: 21, kind: 'merchant' },
    { id: 'thicket-bandits', x: 4, y: 13, kind: 'bandits' }, { id: 'thicket-shrine', x: 16, y: 14, kind: 'shrine' },
    { id: 'scar-rift', x: 5, y: 7, kind: 'rift' }, { id: 'scar-bandits', x: 14, y: 8, kind: 'bandits' },
  ],
};
