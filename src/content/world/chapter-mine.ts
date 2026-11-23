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

interface CartSwitch {
  readonly at: Point;
  readonly lever: Point;
  readonly sidingEnd: Point;
}

export const minecart = {
  id: 'mine-cart',
  start: { x: 20, y: 17 },
  wall: { x: 20, y: 11 },
  // The main rail runs north. Each switch can send the cart along a horizontal siding.
  switches: [
    { at: { x: 20, y: 16 }, lever: { x: 19, y: 16 }, sidingEnd: { x: 22, y: 16 } },
    { at: { x: 20, y: 15 }, lever: { x: 21, y: 15 }, sidingEnd: { x: 18, y: 15 } },
    { at: { x: 20, y: 14 }, lever: { x: 19, y: 14 }, sidingEnd: { x: 22, y: 14 } },
  ] as const satisfies readonly [CartSwitch, CartSwitch, CartSwitch],
} as const;

export const mineBeam = {
  id: 'mine-beam',
  source: { x: 14, y: 3 },
  door: { x: 22, y: 5 },
  crystals: [{ x: 17, y: 3 }, { x: 20, y: 3 }, { x: 20, y: 5 }],
} as const;
