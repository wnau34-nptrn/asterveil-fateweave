import type { MapDefinition } from '../../core/world/types';
import { gameRules } from './rules';

// Map 1 (chapters plan, owner-approved 2026-10-17): a short teaching expedition through the ruined frontier fort.
// The prologue starts here. It teaches moving, battles, chests and potions, wearing the first find from the bag,
// a camp rest and a small boss; no elites, events, puzzles or rift seal. Draft numbers until playtested.
export const ruinsMap: MapDefinition = {
  ...gameRules,
  id: 'ruined-border', version: 1, name: 'ซากชายแดน', chapter: 1, bossName: 'หัวหน้ากองหน้า', goalName: 'ประตูป้อม',
  summary: 'ซากป้อมชายแดนที่กองหน้าของวาร์กอธบุกเข้ามา ฝึกเดินทาง เปิดหีบ สวมอุปกรณ์ แล้วขับไล่หัวหน้ากองหน้า',
  rows: [
    '##############',
    '######:G:#####',
    '#######B######',
    '####...C...###',
    '###..#...#..##',
    '##...#...#...#',
    '##.#.......#.#',
    '#..#..##...#.#',
    '#.....##.....#',
    '##.....S....##',
    '####......####',
    '##############',
  ],
  floorZones: { '.': 'meadow', ':': 'sanctum' },
  specialZones: { S: 'meadow', C: 'camp', B: 'sanctum', G: 'sanctum' },
  zones: [
    { id: 'meadow', name: 'ซากป้อมชายแดน', safe: false, base: 8, step: 5, cap: 40, levels: [1, 3], sets: ['dawn', 'wind'],
      pool: [{ encounterId: 'scout-patrol', weight: 3 }, { encounterId: 'rift-whelp', weight: 2 }],
      loot: { ore: [4, 6], gold: [2, 4], ember: [0, 10], seal: [0, 0] } },
    { id: 'camp', name: 'แคมป์', safe: true, base: 0, step: 0, cap: 0, pool: [] },
    { id: 'sanctum', name: 'ประตูป้อม', safe: true, base: 0, step: 0, cap: 0, pool: [] },
  ],
  bossEncounterId: 'vanguard-captain', bossLevel: 3,
  revealRadius: 3,
  // The prologue win leaves one plain body piece in the bag, so the first lesson on the map is wearing it.
  firstFind: { slot: 'body', rarity: 1 },
  chests: [
    { id: 'ruins-west', x: 2, y: 6, tier: 'common' }, { id: 'ruins-east', x: 12, y: 7, tier: 'common' },
    { id: 'ruins-tower', x: 4, y: 3, tier: 'rare' },
  ],
  herbs: [],
  puzzles: { runes: [], boulders: [], levers: [], secrets: [] },
  loot: {
    tutorial: { ore: [10, 10], gold: [5, 5], ember: [1, 0], seal: [0, 0] },
    boss: { ore: [30, 30], gold: [12, 12], ember: [1, 0], seal: [1, 0] },
    chest: { common: { ore: [8, 12], gold: [4, 6], ember: [0, 30], seal: [0, 0] }, rare: { ore: [14, 18], gold: [7, 9], ember: [1, 0], seal: [0, 0] } },
  },
  elites: [],
  // No rift seal on the teaching map: the captain can be challenged at once.
  quest: { need: 0, objectives: [] },
  events: [],
};
