export type ActionId = 'attack' | 'guard' | 'bash' | 'mark' | 'execute' | 'bolt' | 'ward' | 'heal' | 'prayer' | 'brace' | 'pierce' | 'hinder' | 'volley' | 'acid' | 'haste' | 'ambush' | 'evade' | 'taunt' | 'slam' | 'valor' | 'mend'
  // ★3 skills (one per class, unlocked at three stars).
  | 'rally' | 'finisher' | 'sigil' | 'sanctuary' | 'spearwall' | 'weakshot' | 'bomb' | 'backstab' | 'quake' | 'finale';
// ★5 passives (one per class, always on at five stars).
export type PassiveId = 'stand' | 'keeneye' | 'echo' | 'afterglow' | 'heavycounter' | 'tailwind' | 'potent' | 'shadowcounter' | 'stoneskin' | 'resound';
// Talent-tree capstones (2D-1b): one small rule change per branch, read by the resolver from `HeroDefinition.talents`.
export type TalentCap = 'retribution' | 'guardcounter' | 'deepmark' | 'relentless' | 'splitbolt' | 'wardreflect' | 'twinheal' | 'solace'
  | 'pierceline' | 'frontwall' | 'hunter' | 'volleyhinder' | 'acidspread' | 'quickbrew' | 'shadowlayer' | 'doubleshadow'
  | 'hammercounter' | 'stoneregen' | 'chorus' | 'overture';
// Talent numbers that add to a rule for this hero only (summed over ranks).
export type TalentRule = 'guardReduction' | 'tauntReduction' | 'corrodeBonus' | 'ambushBonus' | 'executeHeal' | 'healBarrier' | 'hasteHeal' | 'dodgeHeal';
// What a member's spent talent points do in battle (world `starred` builds it; stat nodes are already in maxHp/attack/skillBonus).
// `power` adds flat skill power, `rules` adds to the named rule, `caps` maps a capstone to its amount (0 when it has none).
export interface HeroTalents { power?: Partial<Record<ActionId, number>>; rules?: Partial<Record<TalentRule, number>>; caps?: Partial<Record<TalentCap, number>> }
// Legendary equipment specials (2D-2): last stand (once per battle a downing hit leaves 1 HP),
// mark hunter (hits on a marked enemy +amount), renewal (heal at the start of each own turn).
export type GearSpecial = 'laststand' | 'markhunter' | 'renewal';
export type BossPower = 'aegis' | 'focus' | 'lantern';
// What a member's equipment adds beyond max HP/Attack/SPD/skill power (world `starred` builds it).
// Set 4-piece bonuses (2D-3): `firstStrike` acts first in round 1, `freshHit` adds to hits on an enemy that has not
// acted yet this round, `thorns` answers physical hits taken, `freeCast` spares the battle's first skill its cooldown,
// `overflowCap` turns overhealing into a barrier up to that cap. A 4-piece starting barrier adds to `barrier`.
export interface HeroGear { barrier?: number; specials?: GearSpecial[];
  boss?:{power:BossPower;amount:number};
  firstStrike?: boolean; freshHit?: number; thorns?: number; freeCast?: boolean; overflowCap?: number }
export type Outcome = 'active' | 'victory' | 'defeat';
export interface SkillDefinition { name: string; english: string; icon: string; power: number; cooldown: number }
export interface HeroDefinition {
  id: string; name: string; role: string; lane: 'front' | 'back'; maxHp: number; attack: number; speed: number;
  actions: readonly ActionId[]; color: number; empoweredByStatuses?: boolean;
  // Support (stats 2026-10-17): percent added to support skills (heals, shields, songs) from stars, levels, talents and gear.
  skillBonus?: number;
  // Percent added to damaging skills: the hero's Attack growth over its class base (stars, levels, talents, gear),
  // so a skill hits as hard at ★1 Lv1 as its listed power and grows with Attack.
  damageBonus?: number;
  // Defence and sustain from gear (stats step 2, percents): Armour cuts physical hits taken, Resistance energy hits,
  // Leech heals the hero by a share of the damage its own hits deal. Capped by `rules.defenseCap`/`rules.leechCap`.
  armour?: number; resist?: number; leech?: number;
  // Class unlocks: the ★3 skill joins `actions` and the ★5 passive becomes `passive` (world `starred`).
  unlocks?: { skill: ActionId; passive: PassiveId };
  passive?: PassiveId;
  talents?: HeroTalents;
  gear?: HeroGear;
}
// `id` is the field position (`raider` back, `brute` front/large); `art` names the illustrated frame (presentation only).
// Hard-mode traits (master plan A9): thorns answers a hero's hit, veilguard blunts hits on a foe that is neither marked
// nor corroded, enrage strengthens its moves below a share of its HP. Numbers come from `rules.traits`.
export type EnemyTrait = 'thorns' | 'veilguard' | 'enrage';
export interface EnemyDefinition { id: string; name: string; displayName?: string; maxHp: number; speed: number; color: number; art?: string; traits?: readonly EnemyTrait[] }
// Enemy moves aim at a party slot (0-3 in deployment order), not a named hero, so any
// mercenary in that slot is the target. The resolved hero id is stored on Intent.
export interface IntentDefinition { sourceId: string; targetSlot: number; name: string; damage: number; kind: 'physical' | 'energy' }
export interface EncounterDefinition {
  id: string; version: number; name: string;
  // Monster level (2D-1): the content numbers are this level's; `withLevel` rescales a copy.
  level?: number;
  heroes: readonly HeroDefinition[]; enemies: readonly EnemyDefinition[]; intents: readonly IntentDefinition[];
  skills: Record<ActionId, SkillDefinition>;
  // corrode*: alchemist acid adds a flat bonus to every hero hit on the target for corrodeDuration rounds.
  // ambushBonus: scout ambush adds this when the target has not acted yet this round.
  rules: { traits?: { thornsPercent: number; veilguardPercent: number; enrageBelow: number; enragePercent: number }; guardReduction: number; markDuration: number; markedBonus: number; corrodeDuration: number; corrodeBonus: number; ambushBonus: number; tauntReduction: number;
    // ★3/★5 numbers (drafts): see docs/EXPEDITION_DESIGN.md "Star unlocks".
    rallyReduction: number; finisherThreshold: number; echoBonus: number; afterglowCap: number; heavyCounter: number;
    weakshotBonus: number; quakeBonus: number; shadowCounter: number; stoneskinReduction: number; resound: number; finaleHeal: number;
    // Stats step 2 caps (percent).
    defenseCap: number; leechCap: number };
}
// Expiry/cooldown values are absolute round numbers, never animation time.
// `hastedRound`: an alchemist's haste makes this hero act before everyone in that round.
// `evading`: a scout's shadow step; the first enemy hit on this hero before its next turn misses.
// Talents: `evadeExtra` = further hits a doubled shadow step dodges; `reflect` = a ward that strikes back once when it absorbs a hit.
export interface HeroState { id: string; hp: number; barrier: number; cooldowns: Partial<Record<ActionId, number>>; bossUsedRound?:number; hastedRound?: number; evading?: boolean; evadeExtra?: number; reflect?: { heroId: string; amount: number } }
// `delayedRound`: an archer's hindering shot sends this enemy to the end of that round's queue.
// `corrodeBonus`: the bonus of the flask that corroded it (talents can raise it; missing = the rule's value).
export interface EnemyState { id: string; hp: number; markedUntil: number; interruptedRound?: number; delayedRound?: number; corrodedUntil?: number; corrodeBonus?: number }
export interface Intent extends IntentDefinition { targetId: string; beat: number; round: number }
// Party condition carried in from the expedition. Missing ids start at max HP.
export interface BattleEntry { hp: Readonly<Record<string, number>> }
export interface Command { beat: number; heroId: string; action: ActionId; targetId: string }
export interface BattleState {
  encounterId: string; beat: number; round: number; order: string[]; turnIndex: number; outcome: Outcome;
  heroes: HeroState[]; enemies: EnemyState[]; intent: Intent | null; commands: Command[];
  guard: { heroId: string; targetId: string; sourceId: string } | null;
  // Spear brace (2C-2): the next physical enemy hit on a front-lane ally is countered.
  // Spear wall (★3): `wall` counters every physical hit on the front lane, not only the first.
  counter: { heroId: string; wall?: boolean } | null;
  // Hammer warden taunt (2C-2): from the cast until the warden's next turn, every enemy move aims at him.
  taunt: { heroId: string; round: number } | null;
  // Bard song (2C-2): persists until the bard switches songs, falls or the battle ends.
  song: { heroId: string; action: 'valor' | 'mend' } | null;
  // Knight rally (★3): each listed ally's first enemy hit is reduced until the knight's next turn.
  rally?: { heroId: string; ids: string[] } | null;
  // Priest sanctuary (★3): the ally cannot drop below 1 HP until the priest's next turn.
  sanctuary?: { heroId: string; targetId: string } | null;
  // Knight stand (★5) is used once per battle.
  standUsed?: boolean;
  // Priest solace (talent): the healed ally takes less damage until the priest's next turn.
  solace?: { heroId: string; targetId: string } | null;
  // Heroes whose last-stand equipment has already saved them this battle.
  lastStand?: string[];
  // Heroes who have used their star-veil free cast this battle.
  freeCast?: string[];
}
export interface BattleEvent {
  type: 'damage' | 'guard' | 'mark' | 'barrier' | 'heal' | 'interrupt' | 'cancel' | 'down' | 'outcome' | 'brace' | 'counter' | 'delay' | 'corrode' | 'haste' | 'evade' | 'dodge' | 'taunt' | 'song' | 'rally' | 'sigil' | 'sanctuary' | 'stand' | 'finale';
  text: string; sourceId?: string; targetId?: string; amount?: number; absorbed?: number; cause?: 'defeated' | 'interrupted' | 'sealed';
}
// One frame per real actor turn. Only Resolution.state is committed/saved.
export interface TurnStage {
  actorId: string; side: 'hero' | 'enemy'; beat: number; round: number; action?: ActionId; targetId?: string;
  intent: Intent | null; state: BattleState; events: BattleEvent[];
  // Transient authoritative presentation boundaries; never part of BattleState or a save.
  // `after` includes round upkeep/cleanup emitted by advancing this turn.
  before?: BattleState; after?: BattleState;
}
export interface Resolution { initial: BattleState; state: BattleState; events: BattleEvent[]; turns: TurnStage[] }
export interface TurnSlot { actorId: string; side: 'hero' | 'enemy'; round: number; speed: number }
export interface TargetOption { id: string; name: string; valid: boolean; reason: string }
