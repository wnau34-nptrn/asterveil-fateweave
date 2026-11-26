import { gameRules } from './rules';
import type { CartSwitch } from '../../core/world/mine-puzzles';
import type { MapDefinition, Point, PuzzleDefinitions } from '../../core/world/types';

// Map 5 topology. See docs/design/MAP5_CRYSTAL_MINE_DRAFT_TH.md for the rules and integration plan.
export const mineLayout = {
  rows: [
    '#########################',
    '#########################',
    '############G############',
    '############B#::::::::###',
    '###########:::::::::::#:#',
    '###########:::::::::::#:#',
    '###########:C:::::::::#:#',
    '########::::::::::::::###',
    '#####,,,,,,,,,,,,,,,,,###',
    '#####,,,,#,,,,#,,,,,,,###',
    '#####,,,,,,,,,,,,,,,,,###',
    '########,################',
    '##,,#,,,,,,,,,,,,,,,,####',
    '##,,#,,,,###,,,,,,,,,####',
    '##,,#,,,,,,,,,,,,,,,,,,##',
    '##,,#,,,,##,,,,,,,,,,,###',
    '##,,#,,,,,,,,,,,,,,,,,,##',
    '######,,,,,,,,,,,,,#,####',
    '#####...............,####',
    '###...................###',
    '###.........C.........###',
    '###...................###',
    '###.........S.........###',
    '###...................###',
    '#########################',
  ],
  floorZones: { '.': 'mine-yard', ',': 'mine-tunnels', ':': 'mine-cavern' },
  specialZones: { S: 'mine-yard', C: 'camp', B: 'mine-cavern', G: 'mine-cavern' },
} as const satisfies Pick<MapDefinition, 'rows' | 'floorZones' | 'specialZones'>;

export const mineSites = {
  start: { x: 12, y: 22 },
  yardCamp: { x: 12, y: 20 },
  junction: { x: 12, y: 14 },
  cavernCamp: { x: 12, y: 6 },
  boss: { x: 12, y: 3 },
  overseer: { x: 8, y: 11 },
  crystalEater: { x: 2, y: 13 },
  lanterns: [
    { id: 'mine-yard-lantern', x: 9, y: 20 },
    { id: 'mine-entry-lantern', x: 7, y: 17 },
    { id: 'mine-junction-lantern', x: 13, y: 14 },
    { id: 'mine-worker-lantern', x: 16, y: 10 },
    { id: 'mine-cavern-lantern', x: 21, y: 8 },
  ],
  glowCrystals: [{ x: 12, y: 17 }, { x: 13, y: 13 }],
  workers: [
    { id: 'mine-worker-yard', x: 6, y: 20 },
    { id: 'mine-worker-junction', x: 15, y: 14 },
    { id: 'mine-worker-tunnel', x: 17, y: 9 },
  ],
  secrets: [
    { id: 'mine-workers-passage', x: 16, y: 11 },
    { id: 'mine-crystal-pocket', x: 4, y: 15 },
  ] as const satisfies PuzzleDefinitions['secrets'],
  ledgerPages: [
    { id: 'mine-ledger-yard', x: 4, y: 21 },
    { id: 'mine-ledger-workers', x: 16, y: 9 },
    { id: 'mine-ledger-vault', x: 23, y: 5 },
  ],
  notes: [
    { id: 'mine-dig-order', x: 8, y: 10 },
    { id: 'mine-child-drawing', x: 20, y: 10 },
  ],
} as const;

export const minecart = {
  id: 'mine-cart',
  start: { x: 20, y: 17 },
  wall: { x: 20, y: 11 },
  // The main rail runs north. Each switch can send the cart along a horizontal siding.
  switches: [
    { at: { x: 20, y: 16 }, lever: { x: 19, y: 16 }, sidingEnd: { x: 22, y: 16 } },
    { at: { x: 20, y: 15 }, lever: { x: 21, y: 15 }, sidingEnd: { x: 18, y: 15 } },
    { at: { x: 20, y: 14 }, lever: { x: 19, y: 14 }, sidingEnd: { x: 22, y: 14 } },
  ] as const satisfies readonly (CartSwitch & { readonly lever: Point })[],
} as const;

export const mineBeam = {
  id: 'mine-beam',
  source: { x: 14, y: 3 },
  door: { x: 22, y: 5 },
  crystals: [{ x: 17, y: 3 }, { x: 20, y: 3 }, { x: 20, y: 5 }],
} as const;

// Exploration content is independent of encounter tuning and can be composed with the final encounter data.
export const mineExploration = {
  ...mineLayout,
  id: 'crystal-mine',
  chapter: 5,
  name: 'เหมืองผลึกร้าง',
  bossName: 'ยักษ์ผลึก',
  goalName: 'โพรงผลึกยักษ์',
  mine: { darkZones: ['mine-tunnels'], crystals: mineSites.glowCrystals, workers: mineSites.workers, rescueCamp: mineSites.yardCamp, cart: minecart, beam: mineBeam },
  lanterns: mineSites.lanterns,
  notes: mineSites.notes,
  puzzles: { secrets: mineSites.secrets, runes: [], levers: [], boulders: [] },
  recruits: [{ hero: 'brann', at: 'camp', camp: mineSites.yardCamp }, { hero: 'kael', at: 'first-objective' }],
  quest: { need: 2, objectives: [
    { id: 'overseer', kind: 'elite', target: 'mine-overseer' },
    { id: 'lanterns', kind: 'lanterns', count: mineSites.lanterns.length },
    { id: 'workers', kind: 'rescued', count: mineSites.workers.length },
  ] },
} as const satisfies Pick<MapDefinition, 'rows' | 'floorZones' | 'specialZones' | 'id' | 'chapter' | 'name' | 'bossName' | 'goalName' | 'mine' | 'lanterns' | 'notes' | 'puzzles' | 'recruits' | 'quest'>;

export const mineMap: MapDefinition = {
  ...gameRules,
  ...mineExploration,
  version: 1,
  summary: 'จุดตะเกียงตามอุโมงค์ พาคนงานกลับลาน แล้วฝ่าผนึกไปหยุดยักษ์ผลึก',
  mine: { ...mineExploration.mine, darkPressurePercent: 125 },
  revealRadius: 3,
  // Keep both repeat rewards within one manual clear's base ore and gold until the economy review.
  sweepReward: { normal: { ore: 20, gold: 10, dust: 2 }, hard: { ore: 20, gold: 10, dust: 2 } },
  contract: { reward: { ore: 25, gold: 12, dust: 1 }, swiftSteps: 215 },
  zones: [
    { id: 'mine-yard', name: 'ลานคนงาน', safe: false, base: 4, step: 2, cap: 32, levels: [13, 14],
      pool: [{ encounterId: 'mine-yard-patrol', weight: 1 }], loot: { ore: [7, 11], gold: [4, 6], ember: [0, 14], shard: [0, 0] } },
    { id: 'mine-tunnels', name: 'อุโมงค์รางรถแร่', safe: false, base: 5, step: 3, cap: 38, levels: [14, 15],
      pool: [{ encounterId: 'mine-tunnel-patrol', weight: 2 }, { encounterId: 'mine-yard-patrol', weight: 1 }],
      loot: { ore: [8, 12], gold: [4, 7], ember: [0, 14], shard: [0, 0] } },
    { id: 'mine-cavern', name: 'โพรงผลึกยักษ์', safe: true, base: 0, step: 0, cap: 0, pool: [] },
    { id: 'camp', name: 'แคมป์', safe: true, base: 0, step: 0, cap: 0, pool: [] },
  ],
  chests: mineSites.ledgerPages.map((page, index) => ({ ...page, tier: index === 2 ? 'rare' : 'common' })),
  story: { objectives: mineSites.ledgerPages.map(page => ({ id: page.id, kind: 'chest', target: page.id })), reward: { ore: 20 } },
  herbs: [],
  events: [{ id: 'mine-ore-merchant', kind: 'merchant', x: 19, y: 21 }],
  elites: [
    { ...mineSites.overseer, id: 'mine-overseer', forced: true, encounterId: 'elite-mine-overseer', level: 14 },
    { ...mineSites.crystalEater, id: 'mine-crystal-eater', forced: false, encounterId: 'elite-crystal-eater', level: 15 },
  ],
  bossEncounterId: 'crystal-giant',
  bossLevel: 16,
  loot: {
    tutorial: { ore: [10, 10], gold: [5, 5], ember: [1, 0], shard: [0, 0] },
    boss: { ore: [42, 42], gold: [21, 21], ember: [1, 0], shard: [7, 0] },
    chest: { common: { ore: [12, 16], gold: [6, 8], ember: [0, 30], shard: [0, 0] }, rare: { ore: [22, 28], gold: [11, 14], ember: [1, 0], shard: [4, 0] } },
  },
};
