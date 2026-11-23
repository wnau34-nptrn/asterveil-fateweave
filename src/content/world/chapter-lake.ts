import type { MapDefinition } from '../../core/world/types';
import { gameRules } from './rules';

// Map 4 ทะเลสาบเงาจันทร์ (owner OD-60 2026-11-22 "ตามแนะนำทั้ง 4 ข้อ ทำต่อได้"; concept docs/design/CHAPTER1_MAPS_TH.md §3):
// act 2 opens on a moonlit lake that shows the past. New mechanic: the tide (core/world/tide.ts) turns every 8 steps,
// so shallow water is walked by counting steps; the camps can wait for it. Shore → isles → the moon pavilion (boss).
// Puzzles: mirrored runes open the dock vault, two water-gate levers (on shallow tiles, so pulled at low tide) open a
// shortcut past the serpent bridge, and a boulder sunk into the channel is a lasting causeway. Draft numbers until playtested.
export const lakeMap: MapDefinition = {
  ...gameRules,
  id: 'moon-lake', version: 1, name: 'ทะเลสาบเงาจันทร์', chapter: 4, bossName: 'ภูตธารา', goalName: 'ศาลาจันทร์',
  summary: 'ทะเลสาบใต้แสงจันทร์ที่สะท้อนอดีต น้ำขึ้นลงทุก 8 ก้าว นับก้าวให้ดีแล้วไปปลดปล่อยภูตธาราที่ศาลาจันทร์',
  tomes: { boss: { medium: 3, small: 3 }, first: { large: 1, core: 1 } },
  // Rush clears took 143–167 steps (tests/lake-sim.test.ts), so a swift contract allows ~1.5× like map 3.
  // Draft: map 3's sweep and contract pay until the P04 economy pass re-measures the lake (keeps the P04-06 weekly budget).
  sweepReward: { normal: { ore: 24, gold: 12, dust: 2, tomes: 1 }, hard: { ore: 24, gold: 12, dust: 2, tomes: 2 } },
  contract: { reward: { ore: 25, gold: 12, dust: 1, tomes: 1 }, swiftSteps: 215 },
  bossCharm: true,
  rows: [
    '#####################',
    '#########:G:#########',
    '#########:::#########',
    '##########B##########',
    '######;;;;;;;;;######',
    '#####;;;#;;;#;;;#####',
    '####;;;;;;;;;;;;;####',
    '####;;;##;;;##;;;####',
    '##########,#,########',
    '##,,,,,,,,,,#~~~,,,##',
    '##,,C,~~~~~~~~~~,,,##',
    '##,,,,~~~=======,,,##',
    '##,,,,~,~==,,,==~~###',
    '##,,,,~~~===~===~~###',
    '##,,,,,,,~~~~~~~,,###',
    '##,,,,~~~~~~~~~~~~###',
    '##,,,,,,,,###########',
    '#####,###############',
    '####.............####',
    '###.......C.......#.#',
    '###...##.....##...#.#',
    '###...............###',
    '###.......#.......###',
    '###...............###',
    '###...##.....##...###',
    '###...............###',
    '###.......S.......###',
    '####.............####',
    '#####################',
    '#####################',
  ],
  floorZones: { '.': 'shore', ',': 'isle', '~': 'shallows', '=': 'shallows', ';': 'pavilion', ':': 'sanctum' },
  specialZones: { S: 'shore', C: 'camp', B: 'sanctum', G: 'sanctum' },
  tide: { period: 8, shallow: '~', deep: '=' },
  zones: [
    { id: 'shore', name: 'ท่าเรือร้าง', safe: false, base: 5, step: 3, cap: 40, levels: [10, 11], sets: ['dawn', 'wind'],
      pool: [{ encounterId: 'lake-slimes', weight: 3 }, { encounterId: 'lake-mist', weight: 2 }, { encounterId: 'crab-wall', weight: 2 }],
      loot: { ore: [7, 10], gold: [3, 6], ember: [0, 12], shard: [0, 0] } },
    { id: 'isle', name: 'เกาะกลางน้ำ', safe: false, base: 7, step: 4, cap: 45, levels: [11, 12], sets: ['shadow', 'thorn'],
      pool: [{ encounterId: 'lake-mist', weight: 2 }, { encounterId: 'crab-wall', weight: 2 }, { encounterId: 'isle-host', weight: 2 }],
      loot: { ore: [8, 12], gold: [4, 6], ember: [0, 15], shard: [0, 0] } },
    { id: 'shallows', name: 'น้ำตื้น', safe: false, base: 6, step: 3, cap: 40, levels: [11, 12], sets: ['shadow', 'starveil'],
      pool: [{ encounterId: 'lake-slimes', weight: 2 }, { encounterId: 'lake-mist', weight: 2 }],
      loot: { ore: [8, 12], gold: [4, 6], ember: [0, 15], shard: [0, 0] } },
    { id: 'pavilion', name: 'ลานศาลาจันทร์', safe: false, base: 8, step: 5, cap: 50, levels: [12, 13], sets: ['starveil', 'mender'],
      pool: [{ encounterId: 'pavilion-mist', weight: 2 }, { encounterId: 'isle-host', weight: 2 }, { encounterId: 'crab-wall', weight: 1 }],
      loot: { ore: [9, 13], gold: [5, 7], ember: [0, 15], shard: [0, 0] } },
    { id: 'camp', name: 'แคมป์', safe: true, base: 0, step: 0, cap: 0, pool: [] },
    { id: 'sanctum', name: 'ศาลาจันทร์', safe: true, base: 0, step: 0, cap: 0, pool: [] },
  ],
  bossEncounterId: 'water-spirit', bossLevel: 14, bossPercent: 225,
  revealRadius: 3,
  // OD-60 §4: Cerise (the Dancer, `lalin`) dances at the interrupted moon festival and joins at the second camp; Lio sings
  // the lake's song at the first. A company that already has either is paid a duplicate instead (OD-22).
  recruits: [{ hero: 'lio', at: 'camp', camp: { x: 10, y: 19 } }, { hero: 'lalin', at: 'camp', camp: { x: 4, y: 10 } }],
  chests: [
    { id: 'shore-west', x: 4, y: 23, tier: 'common' }, { id: 'shore-east', x: 16, y: 23, tier: 'common' },
    { id: 'dock-vault', x: 19, y: 19, tier: 'rare' },
    { id: 'lake-oar', x: 11, y: 12, tier: 'common' }, { id: 'siren-hoard', x: 17, y: 14, tier: 'rare' },
    { id: 'isle-west', x: 2, y: 9, tier: 'common' }, { id: 'pavilion-west', x: 4, y: 6, tier: 'rare' }, { id: 'pavilion-east', x: 16, y: 6, tier: 'common' },
  ],
  herbs: [{ id: 'shore-herb', x: 4, y: 26 }, { id: 'isle-herb', x: 2, y: 15 }, { id: 'pavilion-herb', x: 6, y: 4 }],
  lanterns: [{ id: 'lantern-islet', x: 7, y: 12 }, { id: 'lantern-centre', x: 13, y: 12 }, { id: 'lantern-east', x: 17, y: 10 }],
  notes: [{ id: 'note-weaver-book', x: 16, y: 7 }, { id: 'note-keeper-letter', x: 12, y: 8 }],
  puzzles: {
    // The order shows in the pool's reflection, mirrored left to right (the UI draws the hint).
    runes: [{ id: 'dock-runes', door: { x: 18, y: 20 }, stones: [{ x: 15, y: 22, glyph: 'moon' }, { x: 12, y: 25, glyph: 'sun' }, { x: 8, y: 25, glyph: 'star' }, { x: 5, y: 22, glyph: 'moon' }] }],
    boulders: [{ id: 'spit-boulder', at: { x: 8, y: 14 }, pit: { x: 9, y: 14 } }],
    levers: [{ id: 'water-gate', door: { x: 14, y: 8 }, levers: [{ x: 6, y: 10 }, { x: 15, y: 9 }] }],
    secrets: [{ id: 'bridge-secret', x: 11, y: 8 }],
  },
  loot: {
    tutorial: { ore: [10, 10], gold: [5, 5], ember: [1, 0], shard: [0, 0] },
    boss: { ore: [42, 42], gold: [21, 21], ember: [1, 0], shard: [7, 0] },
    chest: { common: { ore: [12, 16], gold: [6, 8], ember: [0, 30], shard: [0, 0] }, rare: { ore: [22, 28], gold: [11, 14], ember: [1, 0], shard: [4, 0] } },
  },
  elites: [
    // Forced on the great bridge (the water gate is the way round).
    { id: 'lake-serpent', x: 10, y: 8, encounterId: 'elite-shadow-serpent', forced: true, level: 12, percent: 270 },
    // Optional, on the small isle beyond the central one; its hoard is a rare chest.
    { id: 'lake-siren', x: 16, y: 14, encounterId: 'elite-weeping-siren', forced: false, level: 12, percent: 320 },
  ],
  // The pavilion seal (2 of 3): the serpent, three moon lanterns, the memorial rite at the lakeside shrine.
  quest: { need: 2, objectives: [
    { id: 'serpent', kind: 'elite', target: 'lake-serpent' },
    { id: 'lanterns', kind: 'lanterns', count: 3 },
    { id: 'rite', kind: 'event', target: 'lake-shrine' },
  ] },
  // Side story "the ferryman's boat": help the old ferryman, find his oar on the central island, come home in one run.
  // Pays once, and the boat crosses water at any tide on every later run here.
  story: { objectives: [{ id: 'ferryman', kind: 'event', target: 'lake-ferryman' }, { id: 'oar', kind: 'chest', target: 'lake-oar' }],
    reward: { shard: 15, dust: 20 }, boat: true },
  events: [
    { id: 'lake-ferryman', x: 4, y: 19, kind: 'traveller' }, { id: 'lake-pirates', x: 16, y: 25, kind: 'bandits' },
    { id: 'shore-reflection', x: 16, y: 19, kind: 'reflection' },
    { id: 'lake-shrine', x: 2, y: 12, kind: 'shrine' }, { id: 'raft-merchant', x: 3, y: 16, kind: 'merchant' },
    { id: 'east-reflection', x: 18, y: 9, kind: 'reflection' },
  ],
};
