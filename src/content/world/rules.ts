import type { MapDefinition } from '../../core/world/types';
import { mercenaries } from '../heroes/mercenaries';
import { talentTrees } from '../heroes/talents';

// Game-wide rules shared by every map (chapters plan, owner-approved 2026-10-17): the company, progression, gear,
// forge, potions, market, talents, event numbers and the camp NPCs' side quests. A map spreads these and adds its
// own board, zones, encounters, loot and objectives; tests check that every map uses this exact object.
export type GameRules = Pick<MapDefinition, 'tutorialEncounterId' | 'camp' | 'startingRoster' | 'firstCompany' | 'unlocks' | 'guides' | 'mercenaries' | 'shop' | 'company' | 'progression' | 'talents'
  | 'eventRules' | 'potions' | 'equipment' | 'sideQuests'>;
export const gameRules: GameRules = {
  // The prologue's first battle (Vargoth's vanguard).
  tutorialEncounterId: 'first-clash',
  mercenaries,
  // Phase 3D (draft): one side quest per camp NPC; progress comes from finished runs, rewards are claimed at camp.
  sideQuests: [
    { id: 'smith-rare-ore', npc: 'smith', kind: 'rareChests', target: 6, reward: { ore: 30, dust: 25 } },
    { id: 'broker-proven', npc: 'broker', kind: 'wins', target: 30, reward: { gold: 40 } },
    { id: 'trainer-elites', npc: 'trainer', kind: 'elites', target: 6, reward: { seal: 2 } },
    { id: 'keeper-hidden', npc: 'keeper', kind: 'secrets', target: 6, reward: { gold: 20, dust: 15 } },
    { id: 'herbalist-glow', npc: 'herbalist', kind: 'herbs', target: 6, reward: { potions: { salve: 2, tonic: 2 } } },
    { id: 'scout-puzzles', npc: 'scout', kind: 'puzzles', target: 6, reward: { ore: 40, seal: 1 } },
  ],
  camp: { restHealPercent: 50, reviveHpPercent: 30 },
  startingRoster: ['guardian', 'tracer', 'weaver', 'healer'],
  // A new ค่ายทหารรับจ้าง starts with the Knight alone (owner 2026-10-21); the other three join on map 1.
  firstCompany: ['guardian'],
  // Master plan A3 (owner 2026-10-21): the chapter whose map opens each lobby system. A chapter whose map is not built
  // yet falls back to the latest built chapter before it.
  // Guided tasks (A4, draft rewards): each NPC teaches the system that just opened. Map 1 guarantees what they need.
  guides: [
    { id: 'guide-wear', npc: 'keeper', feature: 'gear', kind: 'wear', reward: { ore: 6 } },
    { id: 'guide-enhance', npc: 'smith', feature: 'forge', kind: 'enhance', reward: { dust: 6 } },
    { id: 'guide-talent', npc: 'trainer', feature: 'tree', kind: 'talent', reward: { ore: 8 } },
    { id: 'guide-brew', npc: 'herbalist', feature: 'brew', kind: 'brew', reward: { potions: { salve: 1 } } },
    { id: 'guide-level', npc: 'smith', feature: 'level', kind: 'itemLevel', reward: { dust: 4 } },
    { id: 'guide-hire', npc: 'broker', feature: 'hire', kind: 'hire', reward: { gold: 10 } },
    { id: 'guide-reserve', npc: 'scout', feature: 'team', kind: 'reserve', reward: { potions: { repel: 1 } } },
  ],
  unlocks: { tree: 1, forge: 1, brew: 1, gear: 1, level: 2, quests: 2, hire: 3, team: 3, market: 3, fuse: 5, craft: 5, hunt: 5, transfer: 7, bossCharm: 9, hard: 3, tomes: 2 },
  // Phase 4A (draft): the camp market, paid in gold coins, and paid hiring-board refreshes (2 per return).
  shop: {
    items: { seal: { price: 60, limit: 2 }, contract: { price: 150, limit: 1 }, gearbox: { price: 120, limit: 1 }, repel: { price: 30, limit: 2 } },
    gearboxWeights: [0, 0, 60, 30, 10], refreshCosts: [15, 30],
  },
  company: {
    // Hiring costs gold coins only (ore pays for upgrades, brewing and the forge).
    hireCost: 20, dismissRefund: 10, offers: 3, maxStars: 5, starStatPercent: 8,
    featured: ['metta', 'thiran', 'lalin', 'wila'],
    // (4A) see `shop` for the market and paid board refreshes.
    sealSharePercent: 50,
    starCosts: [{ dupes: 1, ore: 20 }, { dupes: 2, ore: 40 }, { dupes: 3, ore: 70 }, { dupes: 4, ore: 110 }],
  },
  // Draft 2D-1 numbers: a first full run ends near level 9; farming low levels is tapered (world `expPercent`).
  progression: { levelCap: 10, levelStatPercent: 3, monsterLevelPercent: 7, expBase: 6, expPerLevel: 2, expFoeHp: 95, summonExpPercent: 25, bossExpMultiplier: 3, nextBase: 20, nextPerLevel: 45, joinBehind: 2, reserveExpPercent: 50, catchUpBehind: 2, catchUpPercent: 50, hardLevels: 5, hardFirstClear: { gold: 30, seal: 2 },
    hardTraits: { thornsPercent: 20, veilguardPercent: 25, enrageBelow: 50, enragePercent: 30, bossMovePercent: 130, bossLevels: 8 }, treeTiers: [1, 5, 10, 15], loadoutSize: 3,
    // Skill tomes (docs/design/SKILL_TOMES_TH.md, owner-approved 2026-10-22, draft numbers).
    skillLevels: { max: 5, costs: [{ size: 'small', tomes: 2, gold: 5 }, { size: 'small', tomes: 4, gold: 8 }, { size: 'medium', tomes: 2, gold: 15 }, { size: 'large', tomes: 1, gold: 30, core: 1 }],
      lines: { guardian: 'bulwark', garran: 'bulwark', brann: 'bulwark', tracer: 'blade', weaver: 'blade', mira: 'blade', sefa: 'blade', healer: 'accord', toma: 'accord', lio: 'accord', metta: 'bulwark', thiran: 'bulwark', lalin: 'accord', wila: 'accord' },
      battleEvery: 4, chest: { common: 0, rare: 1 }, elite: 2, hardPercent: 150, hardCore: 1, refundPercent: 50, tradeUp: 3, swap: 2 } },
  talents: talentTrees,
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
      weapon: { attack: [8, 1.5] }, supportWeapon: { support: [8, 1.5] }, magicWeapon: { support: [8, 1.5] }, head: { hp: [4, 1], resist: [3, 0.4] }, body: { hp: [7, 2], armour: [3, 0.4] },
      gloves: { attack: [4, 1] }, boots: { hp: [4, 1], speed: [1, 0.25] }, charm: { support: [6, 1.2] },
    },
    affixStats: { hp: [4, 1], attack: [3, 0.7], support: [3, 0.7], speed: [1, 0.15], armour: [2, 0.4], resist: [2, 0.4], leech: [3, 0.5], barrier: [3, 0.5], regen: [2, 0.3], luck: [2, 0.3] },
    // 5–6 stats per slot so the three affixes of an epic piece are a real choice (per-class simulation 2026-10-17).
    // SPD only on boots and charms; weapons follow their class (support classes use `supportWeapon`).
    affixPools: {
      magicWeapon: ['support', 'leech', 'hp', 'armour', 'resist', 'barrier'],
      weapon: ['attack', 'leech', 'hp', 'armour', 'resist', 'barrier'], supportWeapon: ['support', 'hp', 'resist', 'armour', 'barrier', 'luck'],
      head: ['hp', 'resist', 'support', 'luck', 'attack', 'armour'], body: ['hp', 'armour', 'resist', 'barrier', 'support', 'regen'],
      gloves: ['attack', 'leech', 'support', 'hp', 'luck'], boots: ['speed', 'hp', 'regen', 'armour', 'resist'], charm: ['support', 'attack', 'luck', 'speed', 'leech', 'hp'],
    },
    supportHeroes: ['weaver', 'healer', 'toma', 'lio'], magicWeaponHeroes: ['weaver'],
    quality: [80, 120], regenSteps: 5, luckCap: 15,
    affixCount: [0, 1, 2, 3, 3],
    dropPercent: 35, pity: 6,
    rarityWeights: [55, 28, 12, 4, 1], bossRarityWeights: [0, 0, 20, 45, 35], bossDrops: 3, wipeKeep: 1, hardRarityWeights: [25, 35, 25, 12, 3],
    salvage: [{ ore: 2, dust: 1 }, { ore: 3, dust: 2 }, { ore: 5, dust: 4 }, { ore: 8, dust: 8 }, { ore: 12, dust: 15 }],
    // Sets (2D-3, draft numbers): meadow dawn/wind, thicket shadow/thorn, scar star-veil/mender.
    setPercent: 60,
    // Forge (2D-4, draft numbers): caps +5/+10/+15/+20/+25, +6% base stats per level.
    hunt: {weaponBiasPercent:70,pityDrops:12},
    storage: {step:30,costs:[200,400,800]},
    forge: { transfer:{ore:12,dust:3,seal:1}, craft:{ore:18,dust:4,orePerLevel:6,dustPerLevel:1}, itemLevel: {baseCap:3,orePerLevel:4,dustPerLevel:1,unlocks:[{elite:'gate-meadow',cap:6},{elite:'gate-thicket',cap:9},{elite:'scar-golem',cap:10}],clears:[{map:'veil-frontier',cap:10}]}, plusCap: [5, 10, 15, 20, 25], plusPercent: 6, ore: 3, orePerPlus: 1, dustPerPlus: 0.5, fuseCount: 3, rerollSeals: 1, salvageDustPerPlus: 1, smeltOre: 8, smeltCap: 30 },
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
