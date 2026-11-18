import type { MapDefinition } from '../../core/world/types';
import { mercenaries } from '../heroes/mercenaries';
import { talentTrees } from '../heroes/talents';

// Game-wide rules shared by every map (chapters plan, owner-approved 2026-10-17): the company, progression, gear,
// forge, potions, market, talents, event numbers and the camp NPCs' side quests. A map spreads these and adds its
// own board, zones, encounters, loot and objectives; tests check that every map uses this exact object.
export type GameRules = Pick<MapDefinition, 'tutorialEncounterId' | 'camp' | 'startingRoster' | 'firstCompany' | 'unlocks' | 'guides' | 'mercenaries' | 'shop' | 'company' | 'progression' | 'talents'
  | 'eventRules' | 'potions' | 'equipment' | 'sideQuests' | 'sweep' | 'board' | 'worldBoss'>;
export const gameRules: GameRules = {
  // The prologue's first battle (Vargoth's vanguard).
  tutorialEncounterId: 'first-clash',
  mercenaries,
  // Phase 3D (draft): one side quest per camp NPC; progress comes from finished runs, rewards are claimed at camp.
  sideQuests: [
    { id: 'smith-rare-ore', npc: 'smith', kind: 'rareChests', target: 6, reward: { ore: 30, dust: 25 } },
    { id: 'broker-proven', npc: 'broker', kind: 'wins', target: 30, reward: { gold: 40 } },
    { id: 'trainer-elites', npc: 'trainer', kind: 'elites', target: 6, reward: { shard: 20 } },
    { id: 'keeper-hidden', npc: 'keeper', kind: 'secrets', target: 6, reward: { gold: 20, dust: 15 } },
    { id: 'herbalist-glow', npc: 'herbalist', kind: 'herbs', target: 6, reward: { potions: { salve: 2, tonic: 2 } } },
    { id: 'scout-puzzles', npc: 'scout', kind: 'puzzles', target: 6, reward: { ore: 40, shard: 10 } },
  ],
  // P05-05 (prototype, draft numbers): one supply per sweep, 3 sweeps per map per day shared by normal and hard. P04-06
  // farm budget (docs/validation/p04-06-2026-11-15): 2 supplies a day kept up to 6 (was 6/18). Each map's rewards are its own `sweepReward`.
  sweep: { daily: 2, cap: 6, cost: 1, perMapDaily: 3 },
  // P05-06 quest board (prototype, draft numbers; docs/validation/p05-06-2026-11-15/README_TH.md; rewards cut in P04-06). Three daily and five
  // weekly tasks that ordinary play fills by itself; `alt` is the second way to finish one. Daily sets stay open three
  // days (today and two catch-up days). Contracts (P05-01 §2.3, OD-37): no fee, no penalty, each pays once a week with
  // the reward of the best map it was done on (`MapDefinition.contract`). A sweep counts only for `sweeps`.
  // P09 part 2 (OD-17, draft; docs/validation/p09-shards-2026-11-15): the weekly universal star shards — 10 a week from
  // the three tasks a sweep cannot finish, paid for by cutting their ore/gold and the map-3 sweep (same weekly value).
  // P11-04 World Boss (draft numbers; docs/design/WORLD_BOSS_P11_04_TH.md). Five attempts a week, eight rounds each;
  // weekly value 114 ore-equivalent at most (60 attempts + 36 personal + 18 shared), paid for by the map-3 sweep cut.
  worldBoss: {
    encounterId: 'world-boss-warden', attempts: 5, maxRounds: 8, attemptReward: { ore: 6, gold: 3 },
    personal: [{ id: 'p-2', attempts: 2, reward: { ore: 0, gold: 0, shard: 1 } }, { id: 'p-4', attempts: 4, reward: { ore: 0, gold: 0, shard: 2 } }],
    shared: [{ id: 's-50', percent: 50, reward: { ore: 0, gold: 3 } }, { id: 's-100', percent: 100, reward: { ore: 0, gold: 0, shard: 1 } }],
    hp: { perAccount: 2500, min: 5000, max: 5_000_000 },
    // P11-05 trio (draft numbers, OD-51 §9 items 3–5; docs/design/WORLD_BOSS_TRIO_P11_05_TH.md §2–§3). OD-52 (owner
    // 2026-11-18): the trio replaces the warden from week 2969 = Monday 23 Nov 2026 06:00 Bangkok (the first week reset
    // after release); the warden's week 2968 and its claims stay as they were.
    // Weekly at most (5 attempts on all three, online): 76 ore-equivalent tradeable + 35 boss shards (the 38 cut from
    // the warden's 114), so the P04-06 total stays 1195 ≤ 1200.
    trio: {
      from: 2969,
      bosses: { kragmor: 'wb-kragmor', valdrakk: 'wb-valdrakk', morvane: 'wb-morvane' },
      attemptReward: { ore: 4, gold: 2 }, attemptShards: 3,
      personal: [{ id: 'p-2', attempts: 2, reward: { ore: 0, gold: 0, shard: 1 }, shards: 2 }, { id: 'p-4', attempts: 4, reward: { ore: 0, gold: 0, shard: 1 }, shards: 3 }],
      shared: [{ id: 's-50', percent: 50, reward: { ore: 0, gold: 2 }, shards: 2 }, { id: 's-100', percent: 100, reward: { ore: 0, gold: 0 }, shards: 3 }],
      hp: { perAttempt: 400, min: 1500, max: 5_000_000 },
      shardCap: 200,
      craft: { shards: 40, ore: 30, dust: 10, level: 11 },
      items: { kragmor: { slot: 'body', power: 'bulwark', first: 'hp' }, valdrakk: { slot: 'gloves', power: 'breaker', first: 'attack' }, morvane: { slot: 'head', power: 'reaper', first: 'support' } },
    },
  },
  board: {
    keepDays: 3, smallTeam: 3,
    daily: [
      { id: 'd-patrol', kind: 'wins', target: 3, alt: { kind: 'sweeps', target: 2 }, reward: { ore: 10, gold: 5 } },
      { id: 'd-gather', kind: 'chests', target: 2, alt: { kind: 'herbs', target: 3 }, reward: { ore: 8, gold: 5, dust: 1 } },
      { id: 'd-job', kind: 'contracts', target: 1, alt: { kind: 'completes', target: 1 }, reward: { ore: 10, gold: 5, tomes: 1 } },
    ],
    weekly: [
      { id: 'w-return', kind: 'completes', target: 4, alt: { kind: 'sweeps', target: 9 }, reward: { ore: 40, gold: 20 } },
      { id: 'w-battles', kind: 'wins', target: 15, reward: { ore: 40, gold: 20, tomes: 2 } },
      { id: 'w-elites', kind: 'elites', target: 3, reward: { ore: 20, gold: 10, dust: 4, shard: 4 } },
      { id: 'w-stories', kind: 'events', target: 4, alt: { kind: 'finds', target: 3 }, reward: { ore: 20, gold: 10, dust: 3, shard: 3 } },
      { id: 'w-jobs', kind: 'contracts', target: 3, reward: { ore: 25, gold: 12, tomes: 2, shard: 3 } },
    ],
    contracts: [
      { id: 'job-swift', kind: 'swift' }, { id: 'job-explorer', kind: 'explorer' }, { id: 'job-bloodless', kind: 'bloodless' },
      { id: 'job-small', kind: 'small' }, { id: 'job-unharmed', kind: 'unharmed' }, { id: 'job-herbs', kind: 'herbs' },
    ],
  },
  // P04-05/06 (OD-34, draft): a campfire rest heals 70% (was 50%); casual parties left camp still hurt and lost the walk back.
  camp: { restHealPercent: 70, reviveHpPercent: 30, reserveHealPercent: 25, relightWins: 3, fatigue: { cap: 12, steps: [7, 11], stepPercent: 10, rest: 5 } },
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
  // Owner 2026-11-07, approved pacing: quests/team after MAP 1; hire/market/hunt after MAP 2.
  // Advanced services stay at MAP 3 explicitly: adding maps must not silently move existing rights to 5/7/9.
  // Revisit the historical A3 future-chapter table only with a new owner-approved progression task.
  unlocks: { tree: 1, forge: 1, brew: 1, gear: 1, level: 2, quests: 1, hire: 2, team: 1, market: 2, fuse: 3, craft: 3, hunt: 2, transfer: 3, bossCharm: 3, hard: 3, tomes: 2 },
  // Phase 4A (draft): the camp market, paid in gold coins, and paid hiring-board refreshes (2 per return).
  shop: {
    items: { shard: { price: 60, limit: 1 }, contract: { price: 150, limit: 1 }, gearbox: { price: 120, limit: 1 }, repel: { price: 30, limit: 2 } },
    gearboxWeights: [0, 0, 60, 30, 10], refreshCosts: [15, 30],
  },
  company: {
    // Hiring costs gold coins only (ore pays for upgrades, brewing and the forge).
    hireCost: 20, dismissRefund: 10, offers: 3, maxStars: 5, starStatPercent: 8,
    featured: ['metta', 'lalin', 'kael', 'wynne', 'astrid'],
    // OD-14 (owner 2026-10-30): one character per class for now; Odran and Isolde rest until a class gets a second.
    parked: ['thiran', 'wila'],
    // (4A) see `shop` for the market and paid board refreshes.
    // P02 (OD-11, draft): reserve 3 → 4 → 5 as chapters 1 and 2 are cleared; with the field of five, at most 10 carried.
    reserveSlots: [3, 4, 5],
    // P04-02 (OD-15/16/23, draft): character shards (a duplicate = 10) plus ore 15/30/45/70 (was 20/40/70/110);
    // universal shards may pay any part of the shards. docs/validation/p04-01-2026-11-13.
    starCosts: [{ shards: 10, ore: 15 }, { shards: 20, ore: 30 }, { shards: 30, ore: 45 }, { shards: 40, ore: 70 }], shardsPerDuplicate: 10,
  },
  // Draft 2D-1 numbers: a first full run ends near level 9; farming low levels is tapered (world `expPercent`).
  progression: { levelCap: 10, levelStatPercent: 3, monsterLevelPercent: 7, expBase: 6, expPerLevel: 2, expFoeHp: 95, summonExpPercent: 25, bossExpMultiplier: 3, nextBase: 20, nextPerLevel: 45, hardLevels: 5, hardFirstClear: { gold: 30, shard: 20 }, firstClearShards: 10,
    hardTraits: { thornsPercent: 20, veilguardPercent: 25, enrageBelow: 50, enragePercent: 30, bossMovePercent: 130, bossLevels: 8 }, treeTiers: [1, 5, 10, 15], treePointLevel: 10, treePointsPerClear: 1, loadoutSize: 3,
    // Skill tomes (docs/design/SKILL_TOMES_TH.md, owner-approved 2026-10-22, draft numbers).
    skillLevels: { max: 5, costs: [{ size: 'small', tomes: 2, gold: 5 }, { size: 'small', tomes: 4, gold: 8 }, { size: 'medium', tomes: 2, gold: 15 }, { size: 'large', tomes: 1, gold: 30, core: 1 }],
      lines: { guardian: 'bulwark', garran: 'bulwark', brann: 'bulwark', tracer: 'blade', weaver: 'blade', mira: 'blade', sefa: 'blade', healer: 'accord', toma: 'accord', lio: 'accord', metta: 'bulwark', thiran: 'bulwark', lalin: 'accord', wila: 'accord', kael: 'blade', wynne: 'accord', astrid: 'accord' },
      battleEvery: 4, chest: { common: 0, rare: 1 }, elite: 2, hardPercent: 150, hardCore: 1, refundPercent: 50, tradeUp: 3, swap: 2 } },
  talents: talentTrees,
  eventRules: {
    banditLevelBonus: 1, prayHeal: 25, prayWound: 5, maxWound: 20, offerOre: 10, offerShard: 3,
    merchant: { salve: 8, tonic: 14, repel: 10, calm: 10 }, traveller: { ore: 10, shard: 3 }, travellerGuide: { ore: 4 },
    abandoned: { healPercent: 20, searchDust: 8, searchFightPercent: 40 },
    riftEncounterId: 'scout-patrol', riftDust: 12,
    eliteExp: 2, eliteRarityWeights: [0, 0, 60, 30, 10],
    optionalElite: { exp: 3, rarityWeights: [0, 0, 20, 50, 30], gold: 12, shard: 3 },
    miniBoss: { exp: 3, rarityWeights: [0, 0, 0, 60, 40], loot: { ore: [18, 24], gold: [9, 12], ember: [1, 0], shard: [3, 0] } },
  },
  potions: {
    carry: 3, salvePercent: 40, tonicPercent: 20, repelSteps: 10, calmRecover: 4,
    brew: { salve: { ore: 6, dust: 2 }, tonic: { ore: 10, dust: 4 }, repel: { ore: 8, dust: 3 }, calm: { ore: 8, dust: 2 } },
    chest: { common: { chance: 35, weights: { salve: 3, tonic: 1, repel: 1, calm: 0 } }, rare: { chance: 70, weights: { salve: 1, tonic: 2, repel: 2, calm: 0 } } },
  },
  // Equipment (2D-2, draft numbers; docs/EXPEDITION_DESIGN.md "Equipment").
  equipment: {
    boss:{chance:25,pity:4,barrier:6,damage:4,
      // P11-05 trio items (draft): bulwark barrier 10 after a hit of 15+, breaker +6, reaper heals 8 (barrier ≤6 past max HP).
      trio:{bulwark:{amount:10,at:15},breaker:{amount:6,at:0},reaper:{amount:8,at:6}}},
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
    forge: { transfer:{ore:12,dust:3,shard:10}, craft:{ore:18,dust:4,orePerLevel:6,dustPerLevel:1}, itemLevel: {baseCap:3,orePerLevel:4,dustPerLevel:1,unlocks:[{elite:'gate-meadow',cap:6},{elite:'gate-thicket',cap:9},{elite:'scar-golem',cap:10}],clears:[{map:'veil-frontier',cap:10}]}, plusCap: [5, 10, 15, 20, 25], plusPercent: 6, ore: 3, orePerPlus: 1, dustPerPlus: 0.5, fuseCount: 3, rerollShards: 10, salvageDustPerPlus: 1, smeltOre: 8, smeltCap: 30 },
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
