import type { MapDefinition } from '../../core/world/types';
import { mercenaries } from '../heroes/mercenaries';
import { talentTrees } from '../heroes/talents';

// Chapter 1 layout: start (S) in the green south, camp (C) in the yellow middle,
// final camp before the boss (B) who guards the goal (G). '#' is impassable.
// Version 2 (phase 3A) narrows the two zone gates to one tile each, held by an elite.
export const chapterOne: MapDefinition = {
  id: 'veil-frontier', version: 4, name: 'ชายแดนแอสเตอร์เวล',
  rows: [
    '####################',
    '########:G:#########',
    '########:::#########',
    '#########B##########',
    '####;;;;;C;;;;;;####',
    '####;;##;;;##;;;;###',
    '###;;;##;;;##;;#;;##',
    '###;;;;;;#;;;;;#;;##',
    '####;;;###;;;;;;;;##',
    '#####;;;;;;##;;;####',
    '#########;##########',
    '####,,,,,,,,,,,,####',
    '###,,,##,,,,,##,,,##',
    '###,,,##,,#,,##,,,##',
    '###,,,,,,,#,,,,,,,##',
    '####,,,#,,,,,#,,,###',
    '#####,,#,,C,,#,,####',
    '######,,,,,,,,,#####',
    '#######,,....,######',
    '#####...........####',
    '####....##...##..###',
    '###.....##...##...##',
    '###..#.........#..##',
    '###..#...##....#..##',
    '####.....##.....####',
    '#####.....S....#####',
    '#######.......######',
    '####################',
  ],
  floorZones: { '.': 'meadow', ',': 'thicket', ';': 'scar', ':': 'sanctum' },
  specialZones: { S: 'meadow', C: 'camp', B: 'sanctum', G: 'sanctum' },
  zones: [
    { id: 'meadow', name: 'ทุ่งชายแดน', safe: false, base: 4, step: 3, cap: 35, levels: [1, 3], sets: ['dawn', 'wind'],
      pool: [{ encounterId: 'scout-patrol', weight: 3 }, { encounterId: 'rift-whelp', weight: 2 }],
      loot: { ore: [6, 10], gold: [3, 6], ember: [0, 8], seal: [0, 0] } },
    { id: 'thicket', name: 'พงหนามชายแดน', safe: false, base: 6, step: 4, cap: 45, levels: [4, 6], sets: ['shadow', 'thorn'],
      pool: [{ encounterId: 'thicket-ambush', weight: 2 }, { encounterId: 'shadow-stalker', weight: 2 }, { encounterId: 'rift-whelp', weight: 1 }],
      loot: { ore: [9, 14], gold: [4, 8], ember: [0, 12], seal: [0, 0] } },
    { id: 'scar', name: 'แผลรอยแยก', safe: false, base: 8, step: 5, cap: 50, levels: [7, 9], sets: ['starveil', 'mender'],
      pool: [{ encounterId: 'veil-siege', weight: 2 }, { encounterId: 'rear-ambush', weight: 2 }, { encounterId: 'crystal-stampede', weight: 1 }],
      loot: { ore: [12, 18], gold: [6, 10], ember: [0, 15], seal: [0, 0] } },
    { id: 'camp', name: 'แคมป์', safe: true, base: 0, step: 0, cap: 0, pool: [] },
    { id: 'sanctum', name: 'ประตูรอยแยก', safe: true, base: 0, step: 0, cap: 0, pool: [] },
  ],
  tutorialEncounterId: 'first-clash', bossEncounterId: 'rift-warden',
  revealRadius: 3,
  // Draft phase 2A numbers: chests sit in side pockets away from the main route.
  chests: [
    { id: 'meadow-west', x: 3, y: 23, tier: 'common' }, { id: 'meadow-east', x: 17, y: 23, tier: 'common' },
    { id: 'thicket-west', x: 3, y: 12, tier: 'common' }, { id: 'thicket-east', x: 17, y: 12, tier: 'rare' },
    { id: 'scar-west', x: 3, y: 6, tier: 'rare' }, { id: 'scar-east', x: 17, y: 6, tier: 'common' },
  ],
  loot: {
    tutorial: { ore: [10, 10], gold: [5, 5], ember: [1, 0], seal: [0, 0] },
    boss: { ore: [60, 60], gold: [30, 30], ember: [1, 0], seal: [2, 0] },
    chest: { common: { ore: [16, 24], gold: [8, 12], ember: [0, 30], seal: [0, 0] }, rare: { ore: [30, 40], gold: [15, 20], ember: [1, 0], seal: [1, 0] } },
  },
  camp: { restHealPercent: 50, reviveHpPercent: 30 },
  startingRoster: ['guardian', 'tracer', 'weaver', 'healer'],
  mercenaries,
  company: {
    // Hiring costs gold coins only (ore pays for upgrades, brewing and the forge).
    hireCost: 20, dismissRefund: 10, offers: 3, maxStars: 5, starStatPercent: 8,
    starCosts: [{ dupes: 1, ore: 20 }, { dupes: 2, ore: 40 }, { dupes: 3, ore: 70 }, { dupes: 4, ore: 110 }],
  },
  // Draft 2D-1 numbers: a first full run ends near level 9; farming low levels is tapered (world `expPercent`).
  progression: { levelCap: 10, levelStatPercent: 3, monsterLevelPercent: 7, expBase: 6, expPerLevel: 2, bossExpMultiplier: 3, nextBase: 10, nextPerLevel: 10 },
  talents: talentTrees,
  // Map potions (2D-5, draft numbers).
  // Phase 3A (draft numbers): elites hold the one-tile gates; events wait in the side areas, two per zone.
  elites: [
    // Optional: the meadow passage is wide, so the Tusk Chief can be challenged or walked around.
    { id: 'gate-meadow', x: 9, y: 18, encounterId: 'elite-tusk-chief', forced: false },
    // Forced: the only way from the thicket to the scar and the boss.
    { id: 'gate-thicket', x: 9, y: 10, encounterId: 'elite-briar-lord', forced: true },
    // Mini-boss (3B): optional, in the scar's right-hand pocket; beating it is one rift-seal objective.
    { id: 'scar-golem', x: 17, y: 6, encounterId: 'mini-veil-golem', forced: false, mini: true },
  ],
  // The rift seal (3B, draft): any two of the three open the way to the boss.
  quest: { need: 2, objectives: [
    { id: 'golem', kind: 'elite', target: 'scar-golem' },
    { id: 'chests', kind: 'chests', count: 4 },
    { id: 'rift', kind: 'event', target: 'scar-rift' },
  ] },
  events: [
    { id: 'meadow-traveller', x: 4, y: 20, kind: 'traveller' }, { id: 'meadow-merchant', x: 16, y: 21, kind: 'merchant' },
    { id: 'thicket-bandits', x: 4, y: 13, kind: 'bandits' }, { id: 'thicket-shrine', x: 16, y: 14, kind: 'shrine' },
    { id: 'scar-rift', x: 5, y: 7, kind: 'rift' }, { id: 'scar-bandits', x: 14, y: 8, kind: 'bandits' },
  ],
  eventRules: {
    banditLevelBonus: 1, prayHeal: 25, prayWound: 5, maxWound: 20, offerOre: 10, offerSeal: 1,
    merchant: { salve: 8, tonic: 14, repel: 10 }, traveller: { ore: 10, seal: 1 },
    riftEncounterId: 'scout-patrol', riftDust: 12,
    eliteExp: 2, eliteRarityWeights: [0, 0, 60, 30, 10],
    optionalElite: { exp: 3, rarityWeights: [0, 0, 20, 50, 30], gold: 20, seal: 1 },
    miniBoss: { exp: 3, rarityWeights: [0, 0, 0, 60, 40], loot: { ore: [30, 40], gold: [15, 20], ember: [1, 0], seal: [1, 0] } },
  },
  potions: {
    carry: 3, salvePercent: 40, tonicPercent: 20, repelSteps: 10,
    brew: { salve: { ore: 6, dust: 2 }, tonic: { ore: 10, dust: 4 }, repel: { ore: 8, dust: 3 } },
    chest: { common: { chance: 35, weights: { salve: 3, tonic: 1, repel: 1 } }, rare: { chance: 70, weights: { salve: 1, tonic: 2, repel: 2 } } },
  },
  // Equipment (2D-2, draft numbers; docs/EXPEDITION_DESIGN.md "Equipment").
  equipment: {
    bagCap: 60,
    slotStats: {
      weapon: { attack: [2, 0.5], skill: [3, 1] }, head: { hp: [4, 1], skill: [1, 0.5] }, body: { hp: [7, 2] },
      gloves: { attack: [1, 0.35], skill: [1, 0.5] }, boots: { hp: [4, 1], speed: [1, 0.25] }, charm: { skill: [4, 1] },
    },
    affixStats: { hp: [4, 1], attack: [1, 0.35], skill: [2, 0.5], heal: [4, 1], barrier: [3, 0.5], speed: [1, 0.15] },
    affixCount: [0, 1, 2, 3, 3],
    dropPercent: 35, pity: 6,
    rarityWeights: [55, 28, 12, 4, 1], bossRarityWeights: [0, 0, 50, 35, 15],
    salvage: [{ ore: 2, dust: 1 }, { ore: 3, dust: 2 }, { ore: 5, dust: 4 }, { ore: 8, dust: 8 }, { ore: 12, dust: 15 }],
    // Sets (2D-3, draft numbers): meadow dawn/wind, thicket shadow/thorn, scar star-veil/mender.
    setPercent: 60,
    // Forge (2D-4, draft numbers): caps +5/+10/+15/+20/+25, +6% base stats per level.
    forge: { plusCap: [5, 10, 15, 20, 25], plusPercent: 6, ore: 3, orePerPlus: 1, dustPerPlus: 0.5, fuseCount: 3, rerollSeals: 1, salvageDustPerPlus: 1 },
    sets: {
      dawn: { two: { stat: 'hp', value: 10 }, four: { kind: 'barrier', amount: 12 } },
      wind: { two: { stat: 'speed', value: 3 }, four: { kind: 'firstStrike', amount: 0 } },
      shadow: { two: { stat: 'attack', value: 8 }, four: { kind: 'freshHit', amount: 6 } },
      thorn: { two: { stat: 'hp', value: 6 }, four: { kind: 'thorns', amount: 6 } },
      starveil: { two: { stat: 'skill', value: 10 }, four: { kind: 'freeCast', amount: 0 } },
      mender: { two: { stat: 'heal', value: 15 }, four: { kind: 'overflow', amount: 8 } },
    },
  },
};
