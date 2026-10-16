import type { ActionId, Command, GearSpecial, HeroDefinition, TalentCap, TalentRule } from '../battle/types';

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
  rows: readonly string[];
  // Floor characters map to zones; S/C/B/G take the zone of `specialZone` entries.
  floorZones: Readonly<Record<string, string>>;
  specialZones: Readonly<Record<'S' | 'C' | 'B' | 'G', string>>;
  zones: readonly ZoneDefinition[];
  tutorialEncounterId: string; bossEncounterId: string;
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
  progression: ProgressionRules;
  potions: PotionRules;
  // Phase 3A: forced elites in one-tile gates and one-time event tiles.
  elites: readonly EliteDefinition[];
  // The rift seal (3B): the boss can be challenged only once `need` of these objectives are done.
  quest: QuestDefinition;
  // 3C: puzzles and secret walls (doors, secret walls and pits sit on '#'/floor tiles of `rows`).
  puzzles: PuzzleDefinitions;
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
// hp/attack/barrier are flat; skill/heal are percent; speed is SPD (boots and charms only).
export type GearStat = 'hp' | 'attack' | 'skill' | 'heal' | 'barrier' | 'speed';
// Rarity 0 common … 4 legendary. Stat values come from (stat, level) through the rules, so an item stores
// only what was rolled. `uid` is 0 while the item is still on the expedition (`found`).
// `plus` (2D-4): forge enhance level (missing = +0).
export interface Item { uid: number; slot: GearSlot; rarity: number; level: number; hero?: string; affixes: GearStat[]; special?: GearSpecial; set?: SetId; plus?: number }
// ---- Equipment sets (2D-3, draft numbers): 2 pieces give a stat, 4 pieces a rule. ----
export type SetId = 'dawn' | 'wind' | 'shadow' | 'thorn' | 'starveil' | 'mender';
export const SET_IDS: readonly SetId[] = ['dawn', 'wind', 'shadow', 'thorn', 'starveil', 'mender'];
// `two`: hp/attack/skill/heal are percent, speed is flat SPD. `four`: see `HeroGear`.
export interface SetDefinition {
  two: { stat: 'hp' | 'attack' | 'skill' | 'heal' | 'speed'; value: number };
  four: { kind: 'barrier' | 'firstStrike' | 'freshHit' | 'thorns' | 'freeCast' | 'overflow'; amount: number };
}
// A value at item level L = round(base + perLevel × (L − 1)).
export type StatCurve = readonly [base: number, perLevel: number];
export interface EquipmentRules {
  bagCap: number;
  // Base stats per slot; affix values per stat; affix count per rarity (legendary also has a special).
  slotStats: Readonly<Record<GearSlot, Partial<Record<GearStat, StatCurve>>>>;
  affixStats: Readonly<Record<GearStat, StatCurve>>;
  affixCount: readonly number[];
  // Random victories drop an item at `dropPercent`, guaranteed after `pity` dry wins; the boss always drops.
  dropPercent: number; pity: number;
  rarityWeights: readonly number[]; bossRarityWeights: readonly number[];
  // Salvaging (or an overflowing bag) returns ore and veil dust by rarity.
  salvage: readonly { ore: number; dust: number }[];
  // A dropped item belongs to one of its zone's sets at `setPercent` (the boss: any set).
  setPercent: number; sets: Readonly<Record<SetId, SetDefinition>>;
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
export interface QuestDefinition { need: number; objectives: readonly QuestObjective[] }
export interface EliteDefinition { id: string; x: number; y: number; encounterId: string; forced: boolean; mini?: boolean }
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
// Salvaging an enhanced piece returns `salvageDustPerPlus` dust per level on top.
export interface ForgeRules {
  plusCap: readonly number[]; plusPercent: number; ore: number; orePerPlus: number; dustPerPlus: number;
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
}
// Mercenary company rules (draft numbers). starCosts[i] upgrades ★(i+1) → ★(i+2).
export interface CompanyRules {
  hireCost: number; dismissRefund: number; offers: number; maxStars: number; starStatPercent: number;
  starCosts: readonly { dupes: number; ore: number }[];
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
export interface Commander { name: string; crest: string; color: string }
export interface Profile {
  seed: number; returns: number; tutorialDone: boolean;
  commander: Commander | null;
  // Every owned mercenary in display order, with stars and stored duplicates.
  company: string[]; members: Record<string, MemberProgress>;
  // The 4 + 4 chosen for the next expedition (subset of `company`).
  party: Roster;
  bank: Bank;
  // Unequipped items (≤ bagCap) and the next item uid.
  items: Item[]; nextItem: number;
  // Forge rolls used so far (fuse and reroll draw from (seed, forge)).
  forge: number;
  // Brewed potions waiting at home (2D-5); a departure packs up to `carry` of each.
  potions: Potions;
  // Hiring board taken indexes for the current `returns` count.
  taken: number[];
  expeditions: number; completes: number;
  // `items` kept in the bag and `salvaged` because the bag was full (2D-2).
  last: { outcome: RunOutcome; ore: number; gold: number; seal: number; steps: number; wins: number; items: number; salvaged: number } | null;
}
export type ProfileEvent =
  | { type: 'blocked'; reason: string }
  | { type: 'party' }
  | { type: 'commander' }
  | { type: 'hired'; heroId: string; duplicate: boolean }
  | { type: 'upgraded'; heroId: string; stars: number }
  | { type: 'dismissed'; heroId: string }
  | { type: 'talent'; heroId: string }
  | { type: 'equipped'; heroId: string }
  | { type: 'salvaged'; count: number; ore: number; dust: number }
  | { type: 'forged'; uid: number; action: 'enhance' | 'fuse' | 'reroll' }
  | { type: 'brewed'; potion: PotionId };
export interface ProfileResult { profile: Profile; event: ProfileEvent }
// Up to 4 deployed (slot order = enemy target slots) and 4 in reserve, swapped at camps.
export const PARTY_SLOTS = 4;
export const RESERVE_SLOTS = 4;
export interface Roster { deployed: string[]; reserve: string[] }

// `elite` and `event` (3A) name the elite or event in `ActiveBattle.source`.
export type BattleKind = 'tutorial' | 'random' | 'boss' | 'elite' | 'event';
// `level`: the monster level fixed when the battle started (missing in older saves = the encounter's own level).
export interface ActiveBattle { kind: BattleKind; encounterId: string; entry: Record<string, number>; commands: Command[]; level?: number; source?: string }
export interface ExpeditionState {
  mapId: string; mapVersion: number; seed: number; rolls: number;
  position: Point; steps: number; pressure: number;
  // `hp` covers every roster member; the battle entry covers the deployed ones.
  revealed: string; roster: Roster; members: Record<string, MemberProgress>;
  hp: Record<string, number>; camp: Point | null;
  // `restReady` is the campfire: one rest, then it needs a won battle to relight.
  resources: Resources; openedChests: string[]; restReady: boolean;
  tutorialDone: boolean; bossDefeated: boolean; completed: boolean;
  wins: number; defeats: number; battle: ActiveBattle | null;
  // Items found on this expedition (kept on complete/withdraw, lost on a wipe) and dry random wins for the pity.
  found: Item[]; dry: number;
  // Potions carried (≤ carry each) and steps of repel left (2D-5).
  potions: Potions; repel: number;
  // 3A: elites beaten and events finished this run, and veil dust found (settles into the bank like ore).
  elitesDefeated: string[]; eventsDone: string[]; dust: number;
  // 3C puzzles and secrets for this run: rune progress per puzzle, solved puzzle ids, pulled levers ('<puzzle>:<i>'),
  // moved boulders' positions and found secret walls. Everything resets with a new run.
  runes: Record<string, number>; solved: string[]; levers: string[]; boulders: Record<string, Point>; secrets: string[];
}
export type WorldEvent =
  | { type: 'moved'; chance: number }
  | { type: 'blocked'; reason: 'wall' | 'edge' | 'busy' | 'party' | 'sealed' | 'stone' | 'pit' }
  | { type: 'roster' }
  | { type: 'encounter'; kind: BattleKind; encounterId: string; chance: number }
  | { type: 'goal' }
  | { type: 'rested' }
  | { type: 'revived'; heroId: string }
  | { type: 'chest'; chestId: string; loot: Resources; potion?: PotionId }
  | { type: 'potion'; potion: PotionId; heal?: Record<string, number> }
  | { type: 'event'; eventId: string }
  | { type: 'eventDone'; eventId: string; choice: EventChoice; heal?: Record<string, number> }
  | { type: 'rune'; puzzleId: string; step: number; solved: boolean; reset: boolean }
  | { type: 'lever'; puzzleId: string; pulled: number; solved: boolean }
  | { type: 'pushed'; puzzleId: string; filled: boolean }
  | { type: 'secret'; secretId: string }
  | { type: 'victory'; kind: BattleKind; encounterId: string; loot: Resources; exp?: Record<string, ExpGain>; item?: Item; dust?: number }
  | { type: 'defeat'; kind: BattleKind; encounterId: string; wiped?: boolean };
// EXP from one victory for one brought member: `percent` is the level-gap multiplier.
export interface ExpGain { gained: number; percent: number; level: number; levelsUp: number }
export interface WorldResult { state: ExpeditionState; event: WorldEvent }
