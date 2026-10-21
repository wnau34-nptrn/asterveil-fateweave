import type { MapDefinition } from '../../core/world/types';
import { mercenaries } from '../heroes/mercenaries';
import { talentTrees } from '../heroes/talents';

// Chapter 1 layout: start (S) in the green south, camp (C) in the yellow middle,
// final camp before the boss (B) who guards the goal (G). '#' is impassable.
// Version 2 (phase 3A) narrows the two zone gates to one tile each, held by an elite.
export const chapterOne: MapDefinition = {
  id: 'veil-frontier', version: 6, name: 'ชายแดนแอสเตอร์เวล',
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
    { id: 'meadow', name: 'ทุ่งชายแดน', safe: false, base: 4, step: 3, cap: 35, levels: [1, 3], sets: ['dawn', 'wind'],
      pool: [{ encounterId: 'scout-patrol', weight: 3 }, { encounterId: 'rift-whelp', weight: 2 }],
      loot: { ore: [4, 6], gold: [2, 4], ember: [0, 8], seal: [0, 0] } },
    { id: 'thicket', name: 'พงหนามชายแดน', safe: false, base: 6, step: 4, cap: 45, levels: [4, 6], sets: ['shadow', 'thorn'],
      pool: [{ encounterId: 'thicket-ambush', weight: 2 }, { encounterId: 'shadow-stalker', weight: 2 }, { encounterId: 'rift-whelp', weight: 1 }],
      loot: { ore: [5, 8], gold: [2, 5], ember: [0, 12], seal: [0, 0] } },
    { id: 'scar', name: 'แผลรอยแยก', safe: false, base: 8, step: 5, cap: 50, levels: [7, 9], sets: ['starveil', 'mender'],
      pool: [{ encounterId: 'veil-siege', weight: 2 }, { encounterId: 'rear-ambush', weight: 2 }, { encounterId: 'crystal-stampede', weight: 1 }],
      loot: { ore: [7, 11], gold: [4, 6], ember: [0, 15], seal: [0, 0] } },
    { id: 'camp', name: 'แคมป์', safe: true, base: 0, step: 0, cap: 0, pool: [] },
    { id: 'sanctum', name: 'ประตูรอยแยก', safe: true, base: 0, step: 0, cap: 0, pool: [] },
  ],
  tutorialEncounterId: 'first-clash', bossEncounterId: 'rift-warden', bossLevel: 11,
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
  // Phase 3C (draft): one puzzle per zone guarding a rare chest, and one secret wall per zone hiding a common one.
  // The map is 23 columns wide: x 20–21 hold the vaults behind the old east wall.
  // Phase 3D (draft): one side quest per camp NPC; progress comes from finished runs, rewards are claimed at camp.
  sideQuests: [
    { id: 'smith-rare-ore', npc: 'smith', kind: 'rareChests', target: 6, reward: { ore: 30, dust: 25 } },
    { id: 'broker-proven', npc: 'broker', kind: 'wins', target: 30, reward: { gold: 40 } },
    { id: 'trainer-elites', npc: 'trainer', kind: 'elites', target: 6, reward: { seal: 2 } },
    { id: 'keeper-hidden', npc: 'keeper', kind: 'secrets', target: 6, reward: { gold: 20, dust: 15 } },
    { id: 'herbalist-glow', npc: 'herbalist', kind: 'herbs', target: 6, reward: { potions: { salve: 2, tonic: 2 } } },
    { id: 'scout-puzzles', npc: 'scout', kind: 'puzzles', target: 6, reward: { ore: 40, seal: 1 } },
  ],
  // Glowing herbs for the herbalist, one per zone.
  herbs: [{ id: 'meadow-herb', x: 7, y: 23 }, { id: 'thicket-herb', x: 12, y: 15 }, { id: 'scar-herb', x: 12, y: 7 }],
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
  camp: { restHealPercent: 50, reviveHpPercent: 30 },
  startingRoster: ['guardian', 'tracer', 'weaver', 'healer'],
  mercenaries,
  // Phase 4A (draft): the camp market, paid in gold coins, and paid hiring-board refreshes (2 per return).
  shop: {
    items: { seal: { price: 60, limit: 2 }, contract: { price: 150, limit: 1 }, gearbox: { price: 120, limit: 1 }, repel: { price: 30, limit: 2 } },
    gearboxWeights: [0, 0, 60, 30, 10], refreshCosts: [15, 30],
  },
  company: {
    // Hiring costs gold coins only (ore pays for upgrades, brewing and the forge).
    hireCost: 20, dismissRefund: 10, offers: 3, maxStars: 5, starStatPercent: 8,
    // (4A) see `shop` for the market and paid board refreshes.
    sealSharePercent: 50,
    starCosts: [{ dupes: 1, ore: 20 }, { dupes: 2, ore: 40 }, { dupes: 3, ore: 70 }, { dupes: 4, ore: 110 }],
  },
  // Draft 2D-1 numbers: a first full run ends near level 9; farming low levels is tapered (world `expPercent`).
  progression: { levelCap: 10, levelStatPercent: 3, monsterLevelPercent: 7, expBase: 6, expPerLevel: 2, bossExpMultiplier: 3, nextBase: 20, nextPerLevel: 45 },
  talents: talentTrees,
  // Map potions (2D-5, draft numbers).
  // Phase 3A (draft numbers): elites hold the one-tile gates; events wait in the side areas, two per zone.
  elites: [
    // Optional: the meadow passage is wide, so the Tusk Chief can be challenged or walked around.
    { id: 'gate-meadow', x: 9, y: 18, encounterId: 'elite-tusk-chief', forced: false, level: 6 },
    // Forced: the only way from the thicket to the scar and the boss.
    { id: 'gate-thicket', x: 9, y: 10, encounterId: 'elite-briar-lord', forced: true, level: 9 },
    // Mini-boss (3B): optional, in the scar's right-hand pocket; beating it is one rift-seal objective.
    { id: 'scar-golem', x: 17, y: 6, encounterId: 'mini-veil-golem', forced: false, mini: true, level: 10 },
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
  eventRules: {
    banditLevelBonus: 1, prayHeal: 25, prayWound: 5, maxWound: 20, offerOre: 10, offerSeal: 1,
    merchant: { salve: 8, tonic: 14, repel: 10 }, traveller: { ore: 10, seal: 1 },
    riftEncounterId: 'scout-patrol', riftDust: 12,
    eliteExp: 2, eliteRarityWeights: [0, 0, 60, 30, 10],
    optionalElite: { exp: 3, rarityWeights: [0, 0, 20, 50, 30], gold: 12, seal: 1 },
    miniBoss: { exp: 3, rarityWeights: [0, 0, 0, 60, 40], loot: { ore: [18, 24], gold: [9, 12], ember: [1, 0], seal: [1, 0] } },
  },
  potions: {
    carry: 3, salvePercent: 40, tonicPercent: 20, repelSteps: 10,
    brew: { salve: { ore: 6, dust: 2 }, tonic: { ore: 10, dust: 4 }, repel: { ore: 8, dust: 3 } },
    chest: { common: { chance: 35, weights: { salve: 3, tonic: 1, repel: 1 } }, rare: { chance: 70, weights: { salve: 1, tonic: 2, repel: 2 } } },
  },
  // Equipment (2D-2, draft numbers; docs/EXPEDITION_DESIGN.md "Equipment").
  equipment: {
    boss:{chance:25,pity:4,barrier:6,damage:4},
    bagCap: 60,
    // Stats design (owner-approved 2026-10-17, draft numbers): attack and support are percents; armour/resist/leech
    // are battle percents; regen and luck work on the map. Each value rolls 80–120% of its level value.
    slotStats: {
      weapon: { attack: [8, 1.5] }, supportWeapon: { support: [8, 1.5] }, head: { hp: [4, 1], resist: [3, 0.4] }, body: { hp: [7, 2], armour: [3, 0.4] },
      gloves: { attack: [4, 1] }, boots: { hp: [4, 1], speed: [1, 0.25] }, charm: { support: [6, 1.2] },
    },
    affixStats: { hp: [4, 1], attack: [3, 0.7], support: [3, 0.7], speed: [1, 0.15], armour: [2, 0.4], resist: [2, 0.4], leech: [3, 0.5], barrier: [3, 0.5], regen: [2, 0.3], luck: [2, 0.3] },
    // 5–6 stats per slot so the three affixes of an epic piece are a real choice (per-class simulation 2026-10-17).
    // SPD only on boots and charms; weapons follow their class (support classes use `supportWeapon`).
    affixPools: {
      weapon: ['attack', 'leech', 'hp', 'armour', 'resist', 'barrier'], supportWeapon: ['support', 'hp', 'resist', 'armour', 'barrier', 'luck'],
      head: ['hp', 'resist', 'support', 'luck', 'attack', 'armour'], body: ['hp', 'armour', 'resist', 'barrier', 'support', 'regen'],
      gloves: ['attack', 'leech', 'support', 'hp', 'luck'], boots: ['speed', 'hp', 'regen', 'armour', 'resist'], charm: ['support', 'attack', 'luck', 'speed', 'leech', 'hp'],
    },
    supportHeroes: ['healer', 'toma', 'lio'],
    quality: [80, 120], regenSteps: 5, luckCap: 15,
    affixCount: [0, 1, 2, 3, 3],
    dropPercent: 35, pity: 6,
    rarityWeights: [55, 28, 12, 4, 1], bossRarityWeights: [0, 0, 20, 45, 35], bossDrops: 3, wipeKeep: 1,
    salvage: [{ ore: 2, dust: 1 }, { ore: 3, dust: 2 }, { ore: 5, dust: 4 }, { ore: 8, dust: 8 }, { ore: 12, dust: 15 }],
    // Sets (2D-3, draft numbers): meadow dawn/wind, thicket shadow/thorn, scar star-veil/mender.
    setPercent: 60,
    // Forge (2D-4, draft numbers): caps +5/+10/+15/+20/+25, +6% base stats per level.
    hunt: {weaponBiasPercent:70,pityDrops:12},
    storage: {step:30,costs:[200,400,800]},
    forge: { transfer:{ore:12,dust:3,seal:1}, craft:{ore:18,dust:4,orePerLevel:6,dustPerLevel:1}, itemLevel: {baseCap:3,orePerLevel:4,dustPerLevel:1,unlocks:[{elite:'gate-meadow',cap:6},{elite:'gate-thicket',cap:9},{elite:'scar-golem',cap:10}]}, plusCap: [5, 10, 15, 20, 25], plusPercent: 6, ore: 3, orePerPlus: 1, dustPerPlus: 0.5, fuseCount: 3, rerollSeals: 1, salvageDustPerPlus: 1, smeltOre: 8, smeltCap: 30 },
    sets: {
      dawn: { two: [{ stat: 'hp', value: 10 }], four: { kind: 'barrier', amount: 12 } },
      wind: { two: [{ stat: 'speed', value: 3 }], four: { kind: 'firstStrike', amount: 0 } },
      shadow: { two: [{ stat: 'attack', value: 8 }], four: { kind: 'freshHit', amount: 6 } },
      thorn: { two: [{ stat: 'hp', value: 6 }], four: { kind: 'thorns', amount: 6 } },
      starveil: { two: [{ stat: 'attack', value: 6 }, { stat: 'support', value: 6 }], four: { kind: 'freeCast', amount: 0 } },
      mender: { two: [{ stat: 'support', value: 12 }], four: { kind: 'overflow', amount: 8 } },
    },
  },
};
