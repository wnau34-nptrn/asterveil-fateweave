import type { ActionId, BossPower, Command, GearSpecial, HeroDefinition, TalentCap, TalentRule } from '../battle/types';

export type Direction = 'up' | 'down' | 'left' | 'right';
export interface Point { x: number; y: number }
export type TileKind = 'wall' | 'floor' | 'start' | 'camp' | 'boss' | 'goal';
export interface Tile { kind: TileKind; zoneId: string }

// Encounter chance per step = min(cap, base + pressure). Pressure grows by `step`
// after every quiet step and resets after an encounter or a camp rest.
export interface ZoneDefinition {
  id: string; name: string; safe: boolean; base: number; step: number; cap: number;
  pool: readonly { encounterId: string; weight: number }[];
  loot?: LootTable;
  // Monster levels (2D-1): the zone's entrance side has the low end, its far (north) side the high end.
  levels?: readonly [number, number];
  // Equipment sets that drop here (2D-3).
  sets?: readonly SetId[];
}
// Map-collected resources. Ore will pay for hiring, embers revive one fallen
// member at a camp, and seals will substitute a duplicate in star upgrades.
// `gold` (gold coins) pays only for hiring; ore stays for star upgrades, brewing and the forge.
export type ResourceId = 'ore' | 'gold' | 'ember' | 'seal';
export type Resources = Record<ResourceId, number>;
// A roll gives `min..max` ore; ember/seal give `[guaranteed, percent chance of one more]`.
// `ore` and `gold` are [min, max]; `ember` and `seal` are [base, chance of one more %].
export interface LootTable { ore: readonly [number, number]; gold: readonly [number, number]; ember: readonly [number, number]; seal: readonly [number, number] }
export type ChestTier = 'common' | 'rare';
export interface ChestDefinition { id: string; x: number; y: number; tier: ChestTier }
export interface MapDefinition {
  id: string; version: number; name: string;
  // Chapters (2026-10-17): the map's place in the campaign and a one-line pitch for the Lobby's map choice;
  // `clearStory` plays a closing story the first time the map is completed.
  chapter: number; summary: string; clearStory?: 'warden';
  // `firstFind`: the tutorial (prologue) win leaves this plain piece in the bag (map 1 teaches wearing gear).
  // `bossCharm`: the boss pays the targeted boss charm (boss-equipment.ts); teaching maps leave it out.
  firstFind?: { slot: GearSlot; rarity: number }; bossCharm?: boolean;
  // `bossDrop`: a teaching boss's lighter rarity weights, with sets limited to this map's zones (missing = the shared boss rules).
  bossDrop?: { weights: readonly number[]; zoneSets: boolean };
  // Names shown on the map, in messages and in the summary: the boss and the goal it guards.
  bossName: string; goalName: string;
  // Story recruits (master plan A2): heroes not yet in the company travel this map as guests and join for good at
  // the prologue win, on reaching a camp, or on beating the boss. `firstCompany`: a new company's only member.
  recruits?: readonly { hero: string; at: RecruitPoint }[]; firstCompany: readonly string[];
  // Lobby systems open by chapter (master plan A3): the chapter number whose map must be cleared first.
  unlocks: Readonly<Record<LobbyFeature, number>>;
  guides: readonly GuideDefinition[];
  rows: readonly string[];
  // Floor characters map to zones; S/C/B/G take the zone of `specialZone` entries.
  floorZones: Readonly<Record<string, string>>;
  specialZones: Readonly<Record<'S' | 'C' | 'B' | 'G', string>>;
  zones: readonly ZoneDefinition[];
  tutorialEncounterId: string; bossEncounterId: string;
  // The boss's fight level (4E tuning; missing = the encounter's own level). Monster levels scale HP and damage only.
  bossLevel?: number;
  revealRadius: number;
  // Chests sit on floor tiles; loot tables are drafts until playtested.
  chests: readonly ChestDefinition[];
  loot: { tutorial: LootTable; boss: LootTable; chest: Readonly<Record<ChestTier, LootTable>> };
  camp: { restHealPercent: number; reviveHpPercent: number };
  // Hero ids that join free at ★1, deployed in this slot order.
  startingRoster: readonly string[];
  // Hireable mercenaries beyond the teaching party (the hero catalog is both together).
  mercenaries: readonly HeroDefinition[];
  company: CompanyRules;
  // 4A: the camp market (paid in gold coins) and paid hiring-board refreshes.
  shop: ShopRules;
  progression: ProgressionRules;
  potions: PotionRules;
  // Phase 3A: forced elites in one-tile gates and one-time event tiles.
  elites: readonly EliteDefinition[];
  // The rift seal (3B): the boss can be challenged only once `need` of these objectives are done.
  quest: QuestDefinition;
  // 3C: puzzles and secret walls (doors, secret walls and pits sit on '#'/floor tiles of `rows`).
  puzzles: PuzzleDefinitions;
  // 3D: side quests from the camp NPCs, and the herbs one of them asks for.
  sideQuests: readonly SideQuestDefinition[];
  herbs: readonly (Point & { id: string })[];
  events: readonly MapEventDefinition[];
  eventRules: EventRules;
  // Passive talent tree per hero id (2D-1b).
  talents: Readonly<Record<string, TalentTree>>;
  equipment: EquipmentRules;
}
// ---- Equipment (2D-2, draft numbers) ----
// Six slots: a class weapon (`Item.hero`) and five pieces anyone can wear.
export type GearSlot = 'weapon' | 'head' | 'body' | 'gloves' | 'boots' | 'charm';
export const GEAR_SLOTS: readonly GearSlot[] = ['weapon', 'head', 'body', 'gloves', 'boots', 'charm'];
// Stats design (2026-10-17): hp, barrier (starting shield) and speed (SPD) are flat; attack and support are
// percents; armour/resist/leech are battle percents (capped by the battle rules); regen (HP every
// `regenSteps` steps on the map) and luck (+points on the battle drop chance, capped) work on the map.
export type GearStat = 'hp' | 'attack' | 'support' | 'speed' | 'armour' | 'resist' | 'leech' | 'barrier' | 'regen' | 'luck';
// Rarity 0 common … 4 legendary. Stat values come from (stat, level) through the rules, so an item stores
// only what was rolled. `uid` is 0 while the item is still on the expedition (`found`).
// `plus` (2D-4): forge enhance level (missing = +0).
// `q` (stats design): roll quality in percent (80–120) of the main stats and of each affix, in affix order;
// missing = 100 (items made before the rolls).
// locked protects destruction; investment is the paid enhancement credit, preserved across equipment moves.
export interface Item { uid: number; slot: GearSlot; rarity: number; level: number; hero?: string; affixes: GearStat[]; special?: GearSpecial; set?: SetId; plus?: number;
  boss?:BossPower;
  transferSlot?:number;
  q?: { main: number; affixes: number[] }; locked?: true; investment?: { ore: number; dust: number };
  // Actual paid item-Lv costs only; the original dropped level never grants credit.
  levelInvestment?: {ore:number;dust:number} }
// ---- Equipment sets (2D-3, draft numbers): 2 pieces give a stat, 4 pieces a rule. ----
export type SetId = 'dawn' | 'wind' | 'shadow' | 'thorn' | 'starveil' | 'mender';
export const SET_IDS: readonly SetId[] = ['dawn', 'wind', 'shadow', 'thorn', 'starveil', 'mender'];
// `two`: hp/attack/support are percent, speed is flat SPD. `four`: see `HeroGear`.
export interface SetDefinition {
  two: readonly { stat: 'hp' | 'attack' | 'support' | 'speed'; value: number }[];
  four: { kind: 'barrier' | 'firstStrike' | 'freshHit' | 'thorns' | 'freeCast' | 'overflow'; amount: number };
}
// A value at item level L = round(base + perLevel × (L − 1)).
export type StatCurve = readonly [base: number, perLevel: number];
export interface HuntPlan {target?:string;misses:number}
export interface BossProgress {target:BossPower;misses:number;rewarded:boolean}
export interface BossPlan extends BossProgress {version:1;boss:string}
export interface EquipmentRules {
  boss:{chance:number;pity:number;barrier:number;damage:number};
  hunt:{weaponBiasPercent:number;pityDrops:number};
  bagCap: number;
  // Main stats per slot (a support class's weapon uses `supportWeapon`); affix values per stat; the affixes each
  // slot can roll (`supportWeapon` again for support classes); affix count per rarity (legendary also has a special).
  slotStats: Readonly<Record<GearSlot | 'supportWeapon', Partial<Record<GearStat, StatCurve>>>>;
  affixStats: Readonly<Record<GearStat, StatCurve>>;
  affixPools: Readonly<Record<GearSlot | 'supportWeapon', readonly GearStat[]>>;
  supportHeroes: readonly string[];
  // Roll quality range (percent) and the map stats: regen heals every `regenSteps` steps, luck is capped.
  quality: readonly [min: number, max: number]; regenSteps: number; luckCap: number;
  affixCount: readonly number[];
  // Random victories drop an item at `dropPercent`, guaranteed after `pity` dry wins; the boss always drops
  // `bossDrops` items. A wiped team still brings home its `wipeKeep` best found items.
  dropPercent: number; pity: number;
  rarityWeights: readonly number[]; bossRarityWeights: readonly number[]; bossDrops: number; wipeKeep: number;
  // Explicit recycling returns ore and veil dust by rarity. Overflow is preserved.
  salvage: readonly { ore: number; dust: number }[];
  // A dropped item belongs to one of its zone's sets at `setPercent` (the boss: any set).
  setPercent: number; sets: Readonly<Record<SetId, SetDefinition>>;
  storage: {step:number;costs:readonly number[]};
  forge: ForgeRules;
}
// ---- Phase 3A: elites and map events (draft numbers) ----
// An elite stands on its tile like the boss: the only way past is to beat it (it uses its encounter's own level).
// `forced`: the elite stands on a one-tile gate with no way around (checked by tests); otherwise it can be bypassed.
// `mini` (3B): a mini-boss; it pays the `miniBoss` reward instead of the elite one.
// Quest objectives read the run's own state: a beaten elite, a finished event, or a number of opened chests.
export type QuestObjective = { id: string; kind: 'elite' | 'event'; target: string } | { id: string; kind: 'chests'; count: number };
// 3C puzzles. Runes: step on the stones in order to open `door`. Levers: pull every lever to open `door`.
// Boulder: push it (walk into it) along the floor into `pit`, which fills and becomes floor. Secrets: walls you can walk through.
export type RuneGlyph = 'star' | 'moon' | 'sun';
export interface PuzzleDefinitions {
  runes: readonly { id: string; stones: readonly (Point & { glyph: RuneGlyph })[]; door: Point }[];
  levers: readonly { id: string; levers: readonly Point[]; door: Point }[];
  boulders: readonly { id: string; at: Point; pit: Point }[];
  secrets: readonly (Point & { id: string })[];
}
// 3D side quests count what finished runs did. Rewards add to the bank and the home potion stock.
export type SideQuestKind = 'wins' | 'elites' | 'secrets' | 'puzzles' | 'rareChests' | 'herbs';
export interface SideQuestDefinition {
  id: string; npc: string; kind: SideQuestKind; target: number;
  reward: { ore?: number; gold?: number; seal?: number; dust?: number; potions?: Partial<Record<PotionId, number>> };
}
// Guided tasks (master plan A4): one per camp NPC and lobby system, shown once the system opens. Done is read from the
// profile (`guideDone`); the small reward is claimed once, or the task is skipped.
export type GuideKind = 'wear' | 'enhance' | 'talent' | 'brew' | 'itemLevel' | 'hire' | 'reserve';
export interface GuideDefinition { id: string; npc: string; feature: LobbyFeature; kind: GuideKind; reward: SideQuestDefinition['reward'] }
export interface QuestDefinition { need: number; objectives: readonly QuestObjective[] }
// `level`: the fight level (4E tuning; missing = the encounter's own level).
export interface EliteDefinition { id: string; x: number; y: number; encounterId: string; forced: boolean; mini?: boolean; level?: number }
export type MapEventKind = 'bandits' | 'shrine' | 'merchant' | 'traveller' | 'rift';
export interface MapEventDefinition { id: string; x: number; y: number; kind: MapEventKind }
export type EventChoice = 'fight' | 'sneak' | 'pray' | 'offer' | 'buy-salve' | 'buy-tonic' | 'buy-repel' | 'help';
export interface EventRules {
  // Bandits: a battle from the zone pool one level above the tile; the win always drops an item. Sneaking fills pressure.
  banditLevelBonus: number;
  // Shrine: prayer heals standing members `prayHeal`% and wounds every brought member `prayWound`% max HP for the run.
  prayHeal: number; prayWound: number; maxWound: number; offerOre: number; offerSeal: number;
  merchant: Readonly<Record<PotionId, number>>;
  traveller: { ore: number; seal: number };
  // Rift: an energy battle at the tile's level; the win brings veil dust home.
  riftEncounterId: string; riftDust: number;
  // Elites: EXP multiplier and the drop's rarity weights.
  eliteExp: number; eliteRarityWeights: readonly number[];
  // An optional elite (not on a gate) pays more to make challenging it worth the risk: its own EXP multiplier and
  // rarity weights, plus bonus gold and seals added to the battle's loot.
  optionalElite: { exp: number; rarityWeights: readonly number[]; gold: number; seal: number };
  // A mini-boss (3B) replaces the zone loot with its own table and uses its own EXP multiplier and rarity weights.
  miniBoss: { exp: number; rarityWeights: readonly number[]; loot: LootTable };
}
// ---- Map potions (2D-5, draft numbers) ----
// salve heals one standing member, tonic every standing member (percent of max HP); repel stops random
// encounters for `repelSteps` steps. Potions are used on the map only, never in battle.
export type PotionId = 'salve' | 'tonic' | 'repel';
export const POTION_IDS: readonly PotionId[] = ['salve', 'tonic', 'repel'];
export type Potions = Record<PotionId, number>;
export interface PotionRules {
  carry: number; salvePercent: number; tonicPercent: number; repelSteps: number;
  // Brewing cost in the lobby, per potion.
  brew: Readonly<Record<PotionId, { ore: number; dust: number }>>;
  // A chest adds one potion at `chance` percent (if the party can carry it), picked by weight.
  chest: Readonly<Record<ChestTier, { chance: number; weights: Readonly<Record<PotionId, number>> }>>;
}
// Forge (2D-4, draft numbers). Enhancing always succeeds: +1 costs `ore + orePerPlus × n` ore and ceil(n × dustPerPlus) dust
// for the n-th level, up to `plusCap[rarity]`; each level adds `plusPercent` to the slot's base stats (not affixes).
// Fusing three pieces of one slot and rarity raises the chosen main piece one rarity; rerolling one affix costs a seal.
// Recycling returns base salvage plus paid enhancement and item-Lv investment.
export interface ForgeRules {
  transfer:{ore:number;dust:number;seal:number};
  craft: {ore:number;dust:number;orePerLevel:number;dustPerLevel:number};
  itemLevel: {baseCap:number; orePerLevel:number; dustPerLevel:number; unlocks:readonly {elite:string;cap:number}[];
    // Completing a map (normal difficulty) raises the cap; other maps leave it alone (chapters, 2026-10-21).
    clears:readonly {map:string;cap:number}[]};
  plusCap: readonly number[]; plusPercent: number; ore: number; orePerPlus: number; dustPerPlus: number;
  // Smelting (owner-approved 2026-10-16): `smeltOre` ore per veil dust, at most `smeltCap` dust per return home.
  smeltOre: number; smeltCap: number;
  fuseCount: number; rerollSeals: number; salvageDustPerPlus: number;
}
export type Gear = Partial<Record<GearSlot, Item>>;
// ---- Talent tree (2D-1b, draft numbers) ----
// Same shape for every class: a root, then branches A and B (tier 1 → tier 2 → capstone).
// One point per level above 1, spent and reset only in the Lobby.
export type TalentNode = 'root' | 'a1' | 'a2' | 'a3' | 'b1' | 'b2' | 'b3';
export const TALENT_NODES: readonly TalentNode[] = ['root', 'a1', 'a2', 'a3', 'b1', 'b2', 'b3'];
// Per rank: `stat` percent of max HP/Attack/skill power, flat `power` on one skill, a `rule` amount, or a capstone.
export type TalentEffect =
  | { stat: 'hp' | 'attack' | 'skill'; percent: number }
  | { power: ActionId; amount: number }
  | { rule: TalentRule; amount: number }
  | { cap: TalentCap; amount?: number };
export interface TalentNodeDef { id: TalentNode; name: string; max: number; effect: TalentEffect }
export type TalentTree = readonly TalentNodeDef[];
export type Talents = Partial<Record<TalentNode, number>>;
// Levels and EXP (2D-1, draft numbers). Each level adds `levelStatPercent` to max HP, Attack and skill
// power; monsters gain `monsterLevelPercent` HP/damage per level. EXP per enemy = expBase + expPerLevel × L.
export interface ProgressionRules {
  levelCap: number; levelStatPercent: number; monsterLevelPercent: number;
  expBase: number; expPerLevel: number; bossExpMultiplier: number;
  // EXP to go from level L to L+1 = nextBase + nextPerLevel × L.
  nextBase: number; nextPerLevel: number;
  // Catch-up (master plan A2, draft): a new member joins `joinBehind` levels below the company's best; reserve
  // members gain `reserveExpPercent` of the EXP; a member `catchUpBehind`+ levels below the best brought member
  // gains `catchUpPercent` more.
  joinBehind: number; reserveExpPercent: number; catchUpBehind: number; catchUpPercent: number;
}
// Mercenary company rules (draft numbers). starCosts[i] upgrades ★(i+1) → ★(i+2).
// 4A camp market: each item has a gold price and a limit per return home. The gear box rolls a rare-or-better
// piece at the company's highest level; the contract adds one duplicate to a chosen member.
export const SHOP_ITEMS = ['seal', 'contract', 'gearbox', 'repel'] as const;
export type ShopItemId = typeof SHOP_ITEMS[number];
export interface ShopRules {
  items: Record<ShopItemId, { price: number; limit: number }>;
  gearboxWeights: readonly number[];
  // The hiring board can be redrawn this many times per return, each at the next price.
  refreshCosts: readonly number[];
}
export interface CompanyRules {
  hireCost: number; dismissRefund: number; offers: number; maxStars: number; starStatPercent: number;
  starCosts: readonly { dupes: number; ore: number }[];
  // Seals may stand in for this share (percent, rounded up) of a star's duplicates.
  sealSharePercent: number;
}
// `level`/`exp` (2D-1) are optional for older data: missing means level 1 with no EXP.
// `talents` (2D-1b): ranks spent per node; missing means none. `gear` (2D-2): equipped items by slot.
// `wound` (3A, run only): percent of max HP lost to a shrine prayer until the expedition ends.
export interface MemberProgress { stars: number; dupes: number; level?: number; exp?: number; talents?: Talents; gear?: Gear; wound?: number }
// The team brought into one expedition and their star progress (fixed during the run).
// `potions`: what the expedition packs (2D-5; missing = none).
export interface Company { roster: Roster; members: Record<string, MemberProgress>; potions?: Potions }

// ---- Lobby profile (persistent between expeditions) ----
export const COMPANY_CAP = 20;
export type RunOutcome = 'complete' | 'withdrawn' | 'wiped';
// `dust` (veil dust, 2D-2) comes from salvage and pays for the forge (2D-4).
// `gold` pays for hiring only.
export interface Bank { ore: number; gold: number; seal: number; dust: number }
// The player's commander (non-combat leader of the company), created once (L2).
// `camp`: the name of the player's ค่ายทหารรับจ้าง (owner 2026-10-21), shown in the lobby, summary and arena.
export interface Commander { name: string; crest: string; color: string; camp: string }
export interface Profile {
  bossLoot?:Record<string,BossProgress>;
  hunt?:{target?:string;pity:Record<string,number>};
  seed: number; returns: number; tutorialDone: boolean;
  commander: Commander | null;
  // A company saved before lobby systems opened by chapter (save v31) keeps every system open.
  veteran?: true;
  // Every owned mercenary in display order, with stars and stored duplicates.
  company: string[]; members: Record<string, MemberProgress>;
  // The 4 + 4 chosen for the next expedition (subset of `company`).
  party: Roster;
  bank: Bank;
  // Unequipped items (≤ upgraded storage capacity), persistent pending rewards and the next uid.
  overflow?:Item[]; storageTier?:number;
  items: Item[]; nextItem: number;
  // Forge rolls used so far (fuse and reroll draw from (seed, forge)).
  forge: number;
  // Brewed potions waiting at home (2D-5); a departure packs up to `carry` of each.
  potions: Potions;
  // 3D side quests: progress gathered from finished runs and whether the reward was claimed (one-time each).
  quests: Record<string, { progress: number; claimed: boolean }>;
  // Guided tasks claimed or skipped (save v32; missing = none).
  guides?: Record<string, 'claimed' | 'skipped'>;
  // 4A: market items bought and hiring-board refreshes used since the last return (both reset on return).
  shop: Partial<Record<ShopItemId, number>>; refreshes: number;
  // Veil dust smelted from ore since the last return (reset on return).
  smelted: number;
  // Hiring board taken indexes for the current `returns` count.
  taken: number[];
  forgeLevel?: number;
  expeditions: number; completes: number;
  // Chapters (2026-10-17): ids of the maps this company has completed at least once (each opens the next map).
  cleared: string[];
  // `items` kept in the bag and `salvaged` because the bag was full (2D-2).
  last: { outcome: RunOutcome; ore: number; gold: number; seal: number; steps: number; wins: number; items: number; salvaged: number } | null;
}
export type ProfileEvent =
  | {type:'bossTarget'}
  | {type:'huntTarget'}
  | {type:'storageCollected';count:number}
  | {type:'storageExpanded'}
  | { type: 'blocked'; reason: string }
  | { type: 'party' }
  | { type: 'commander' }
  | { type: 'guide'; id: string; skipped: boolean }
  | { type: 'hired'; heroId: string; duplicate: boolean }
  | { type: 'upgraded'; heroId: string; stars: number }
  | { type: 'dismissed'; heroId: string }
  | { type: 'talent'; heroId: string }
  | { type: 'equipped'; heroId: string }
  | { type: 'salvaged'; count: number; ore: number; dust: number }
  | { type: 'forged'; uid: number; action: 'enhance' | 'fuse' | 'reroll' | 'level' | 'craft' | 'transfer' }
  | { type: 'equipmentLocked'; uid: number; locked: boolean }
  | { type: 'smelted'; dust: number }
  | { type: 'brewed'; potion: PotionId }
  | { type: 'claimed'; questId: string }
  | { type: 'bought'; item: ShopItemId; heroId?: string; uid?: number }
  | { type: 'refreshed' };
export interface ProfileResult { profile: Profile; event: ProfileEvent }
// Up to 4 deployed (slot order = enemy target slots) and 4 in reserve, swapped at camps.
export const PARTY_SLOTS = 4;
export const RESERVE_SLOTS = 4;
export interface Roster { deployed: string[]; reserve: string[] }

// `elite` and `event` (3A) name the elite or event in `ActiveBattle.source`.
export type BattleKind = 'tutorial' | 'random' | 'boss' | 'elite' | 'event';
// `level`: the monster level fixed when the battle started (missing in older saves = the encounter's own level).
export interface ActiveBattle { kind: BattleKind; encounterId: string; entry: Record<string, number>; commands: Command[]; level?: number; source?: string }
export type RecruitPoint = 'prologue' | 'camp' | 'boss';
export type LobbyFeature = 'tree' | 'forge' | 'brew' | 'gear' | 'level' | 'quests' | 'hire' | 'team' | 'market' | 'fuse' | 'craft' | 'hunt' | 'transfer' | 'bossCharm';
export interface ExpeditionState {
  // Story recruits (save v30): guests travel with the run but are not company members yet; `recruited` joined
  // during this run and are added to the company when it settles (whatever the outcome). Missing = none.
  guests?: string[]; recruited?: string[];
  bossLoot?:BossPlan;
  // Missing plan preserves legacy RNG and drop behavior until this expedition ends.
  hunt?:HuntPlan;
  mapId: string; mapVersion: number; seed: number; rolls: number;
  position: Point; steps: number; pressure: number;
  // `hp` covers every roster member; the battle entry covers the deployed ones.
  revealed: string; roster: Roster; members: Record<string, MemberProgress>;
  hp: Record<string, number>; camp: Point | null;
  // `restReady` is the campfire: one rest, then it needs a won battle to relight.
  resources: Resources; openedChests: string[]; restReady: boolean;
  tutorialDone: boolean; bossDefeated: boolean; completed: boolean;
  wins: number; defeats: number; battle: ActiveBattle | null;
  // Items found on this expedition (kept on complete/withdraw; a wipe keeps only the best `wipeKeep`) and dry random wins for the pity.
  found: Item[]; dry: number;
  // Potions carried (≤ carry each) and steps of repel left (2D-5).
  potions: Potions; repel: number;
  // 3A: elites beaten and events finished this run, and veil dust found (settles into the bank like ore).
  elitesDefeated: string[]; eventsDone: string[]; dust: number;
  // 3C puzzles and secrets for this run: rune progress per puzzle, solved puzzle ids, pulled levers ('<puzzle>:<i>'),
  // moved boulders' positions and found secret walls. Everything resets with a new run.
  runes: Record<string, number>; solved: string[]; levers: string[]; boulders: Record<string, Point>; secrets: string[];
  // 3D: glowing herbs picked up this run (they count for the herbalist's quest when the run settles, not on a wipe).
  herbs: string[];
  // 4B: camps reached this run ("x,y"), the destinations of free camp travel. 4C: how often each optional elite
  // has come back after a rest (each return fights one level higher and pays no gold/seal bonus).
  visited: string[]; respawns: Record<string, number>;
  // Map bag (2026-10-17): the company's own items (uid > 0) taken off on the map. They always come home, even
  // after a wipe. Found items taken off go back to `found`.
  spare: Item[];
}
export type WorldEvent =
  | { type: 'talent'; heroId: string }
  | { type: 'moved'; chance: number }
  | { type: 'blocked'; reason: 'wall' | 'edge' | 'busy' | 'party' | 'sealed' | 'stone' | 'pit' }
  | { type: 'roster' }
  | { type: 'equipped'; heroId: string }
  | { type: 'encounter'; kind: BattleKind; encounterId: string; chance: number }
  | { type: 'goal' }
  | { type: 'rested'; respawned?: string[] }
  | { type: 'revived'; heroId: string }
  | { type: 'chest'; chestId: string; loot: Resources; potion?: PotionId }
  | { type: 'potion'; potion: PotionId; heal?: Record<string, number> }
  | { type: 'event'; eventId: string }
  | { type: 'eventDone'; eventId: string; choice: EventChoice; heal?: Record<string, number> }
  | { type: 'rune'; puzzleId: string; step: number; solved: boolean; reset: boolean }
  | { type: 'lever'; puzzleId: string; pulled: number; solved: boolean }
  | { type: 'pushed'; puzzleId: string; filled: boolean }
  | { type: 'secret'; secretId: string }
  | { type: 'herb'; herbId: string }
  | { type: 'travelled'; to: Point }
  | { type: 'victory'; kind: BattleKind; encounterId: string; loot: Resources; exp?: Record<string, ExpGain>; item?: Item; items?: Item[]; dust?: number }
  | { type: 'defeat'; kind: BattleKind; encounterId: string; wiped?: boolean };
// EXP from one victory for one brought member: `percent` is the level-gap multiplier.
export interface ExpGain { gained: number; percent: number; level: number; levelsUp: number }
export interface WorldResult { state: ExpeditionState; event: WorldEvent }
