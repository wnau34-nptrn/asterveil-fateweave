export type ActionId = 'attack' | 'guard' | 'bash' | 'mark' | 'execute' | 'bolt' | 'ward' | 'heal' | 'prayer' | 'brace' | 'pierce' | 'hinder' | 'volley' | 'acid' | 'haste' | 'ambush' | 'evade' | 'taunt' | 'slam' | 'valor' | 'mend'
  // ★3 skills (one per class, unlocked at three stars).
  | 'rally' | 'finisher' | 'sigil' | 'sanctuary' | 'spearwall' | 'weakshot' | 'bomb' | 'backstab' | 'quake' | 'finale'
  // Big skill tree skills (master plan A6): the Knight's challenge, bulwark and rouse.
  | 'challenge' | 'bulwark' | 'rouse'
  // Release A big trees (docs/design/SKILL_TREES_ALL_TH.md): duelist parry/lunge/sweep, mage storm/aegis/dispel,
  // priest revive/halo/bless, spear hold/halt/warcry, archer disengage/pin/track.
  | 'parry' | 'lunge' | 'sweep' | 'storm' | 'aegis' | 'dispel' | 'revive' | 'halo' | 'bless' | 'hold' | 'halt' | 'warcry' | 'disengage' | 'pin' | 'track'
  // Recruit big trees (owner 2026-10-23, moved up from release B): alchemist smoke/fury/catalyst, scout knives/decoy/disarm,
  // warden stonearmor/guardstone/tremor, bard dread/note/solo.
  | 'smoke' | 'fury' | 'catalyst' | 'knives' | 'decoy' | 'disarm' | 'stonearmor' | 'guardstone' | 'tremor' | 'dread' | 'note' | 'solo';
// ★5 passives (one per class, always on at five stars).
export type PassiveId = 'stand' | 'keeneye' | 'echo' | 'afterglow' | 'heavycounter' | 'tailwind' | 'potent' | 'shadowcounter' | 'stoneskin' | 'resound';
// Talent-tree capstones (2D-1b): one small rule change per branch, read by the resolver from `HeroDefinition.talents`.
export type TalentCap = 'retribution' | 'guardcounter' | 'deepmark' | 'relentless' | 'splitbolt' | 'wardreflect' | 'twinheal' | 'solace'
  | 'pierceline' | 'frontwall' | 'hunter' | 'volleyhinder' | 'acidspread' | 'quickbrew' | 'shadowlayer' | 'doubleshadow'
  | 'hammercounter' | 'stoneregen' | 'chorus' | 'overture'
  // Knight big tree modifiers (A6): two guards, energy bash, banners at rally and at the battle start.
  | 'twoguard' | 'reflectbash' | 'brightbanner' | 'valorbanner' | 'fatebanner'
  // Release A big trees: duelist, mage, priest, spear and archer modifiers and capstones.
  | 'sharedmark' | 'parrymark' | 'parryall' | 'deadline' | 'endlessdance'
  | 'piercebolt' | 'twinward' | 'sigilreflect' | 'sigildelay' | 'arcanecharge' | 'fateseal'
  | 'sanctuaryward' | 'longprayer' | 'quickprayer' | 'lastprayer' | 'dawn'
  | 'deeppierce' | 'spearfury' | 'holdfirm' | 'holdcounter' | 'unyielding'
  | 'heavyhinder' | 'chase' | 'quickstep' | 'covershot' | 'stalker'
  // Recruit big trees: alchemist, scout, warden and bard modifiers and capstones.
  | 'smokepoison' | 'smokewide' | 'mobilelab' | 'chainreaction'
  | 'twinknives' | 'quickknives' | 'silentend' | 'opportunist'
  | 'runequake' | 'twinstone' | 'thickstone' | 'skyhammer'
  | 'spellnote' | 'twinnote' | 'encore' | 'liferhythm';
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
  // Magic Power: percent added to magical damage, healing, shields and songs. Legacy field name retained.
  skillBonus?: number;
  // Percent added to physical damaging skills: the hero's Attack growth over its class base (stars, levels, talents, gear),
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
  // Skill levels from tomes (save v37): Lv2–5 per active skill (missing = Lv1). See `skillLevelBonus` in the engine.
  skillLevels?: Partial<Record<ActionId, number>>;
}
// Four foe slots (A7 step 2, owner 2026-10-22): `id` is the field position `f1`/`f2` (front row) or `b1`/`b2` (back row),
// 1–4 foes per encounter and at most two per row. `row` must match the id; front-row foes screen the back row.
// `large` draws the foe ~1.5x (presentation only); `boss` marks the foe that hard mode empowers.
// `art` names the illustrated frame (presentation only).
// Hard-mode traits (master plan A9): thorns answers a hero's hit, veilguard blunts hits on a foe that is neither marked
// nor corroded, enrage strengthens its moves below a share of its HP. Numbers come from `rules.traits`.
export type EnemyTrait = 'thorns' | 'veilguard' | 'enrage';
export type EnemySlot = 'f1' | 'f2' | 'b1' | 'b2';
// `reserve`: a minion that waits off the field until a boss phase summons it (owner 2026-10-22).
export interface EnemyDefinition { id: EnemySlot; row: 'front' | 'back'; large?: boolean; boss?: boolean; reserve?: boolean; name: string; displayName?: string; maxHp: number; speed: number; color: number; art?: string; traits?: readonly EnemyTrait[] }
// Enemy moves aim at a party slot (0-3 in deployment order), not a named hero, so any
// mercenary in that slot is the target. The resolved hero id is stored on Intent.
// `unstoppable` (boss signature moves, owner 2026-10-22): Bash and Sigil cannot cancel it; Guard, Ward and taunts still answer it.
// Boss phases (owner 2026-10-22): `phase` puts the move in that phase's cycle (missing = the opening cycle); `all` hits
// every standing hero (Guard and taunts cannot redirect it); `charge` gathers power and deals no damage.
// `special` is set only on the generated phase-change turn.
export interface IntentDefinition { sourceId: string; targetSlot: number; name: string; damage: number; kind: 'physical' | 'energy'; unstoppable?: boolean;
  phase?: number; all?: boolean; charge?: boolean; special?: 'phase' }
// A boss phase: once the boss's HP falls to `below` percent, its next turn summons the `summon` reserves (if any) and
// switches its moves to that phase's cycle. `hardSummon` reserves join only in hard mode (world `hardEncounter`).
export interface BossPhase { sourceId: EnemySlot; below: number; summon?: readonly EnemySlot[]; hardSummon?: readonly EnemySlot[]; name: string }
export interface EncounterDefinition {
  id: string; version: number; name: string;
  // Monster level (2D-1): the content numbers are this level's; `withLevel` rescales a copy.
  level?: number;
  heroes: readonly HeroDefinition[]; enemies: readonly EnemyDefinition[]; intents: readonly IntentDefinition[];
  phases?: readonly BossPhase[];
  skills: Record<ActionId, SkillDefinition>;
  // corrode*: alchemist acid adds a flat bonus to every hero hit on the target for corrodeDuration rounds.
  // ambushBonus: scout ambush adds this when the target has not acted yet this round.
  rules: { traits?: { thornsPercent: number; veilguardPercent: number; enrageBelow: number; enragePercent: number }; guardReduction: number; markDuration: number; markedBonus: number; corrodeDuration: number; corrodeBonus: number; ambushBonus: number; tauntReduction: number;
    // ★3/★5 numbers (drafts): see docs/EXPEDITION_DESIGN.md "Star unlocks".
    rallyReduction: number; finisherThreshold: number; echoBonus: number; afterglowCap: number; heavyCounter: number;
    weakshotBonus: number; quakeBonus: number; shadowCounter: number; stoneskinReduction: number; resound: number; finaleHeal: number;
    // Stats step 2 caps (percent).
    defenseCap: number; leechCap: number;
    // Skill levels (tomes, save v37): each level above 1 adds `powerPercent` to a skill's power, `percentPoints` to a
    // percent skill, or a `barrier` on use to a skill without numbers (docs/design/SKILL_TOMES_TH.md).
    skillLevel: { powerPercent: number; percentPoints: number; barrier: number } };
}
// Expiry/cooldown values are absolute round numbers, never animation time.
// `hastedRound`: an alchemist's haste makes this hero act before everyone in that round.
// `evading`: a scout's shadow step; the first enemy hit on this hero before its next turn misses.
// Talents: `evadeExtra` = further hits a doubled shadow step dodges; `reflect` = a ward that strikes back once when it absorbs a hit.
// Release A trees: `evadePhysical` = this dodge only takes a physical hit (archer disengage); `fell` = downed during this
// battle (only those can be revived); `revivedRound` = revived this round (acts from the next one);
// `empowered` = a percent added to this hero's hits until the end of `round` (priest blessing, spear war cry).
export interface HeroState { id: string; hp: number; barrier: number; cooldowns: Partial<Record<ActionId, number>>; bossUsedRound?:number; hastedRound?: number; evading?: boolean; evadeExtra?: number; evadePhysical?: boolean; reflect?: { heroId: string; amount: number };
  fell?: boolean; revivedRound?: number; empowered?: { percent: number; round: number };
  // Recruit trees: `exposed` = hits taken are raised by a percent until the end of `round` (alchemist fury tonic);
  // `solo` = this hero gets the bard's playing song three times over until the end of `round`.
  exposed?: { percent: number; round: number }; solo?: { heroId: string; round: number } }
// `delayedRound`: an archer's hindering shot sends this enemy to the end of that round's queue.
// `corrodeBonus`: the bonus of the flask that corroded it (talents can raise it; missing = the rule's value).
// `steadyRound` (boss steadfast): the last round a boss whose turn was cancelled cannot be interrupted again.
// `absent`: a reserve not yet summoned (kept at 0 HP, so it is out of the queue and the target lists).
// `phase`/`phaseRound`: how many boss phases have begun, and the round the latest began (its cycle counts from there).
// `interruptedBy`: the hero whose Bash/Sigil cancelled that turn. `weaken`: its next move is cut by this percent
// (archer heavy hinder). `dispelledUntil`: a mage's dispel switches off its veilguard while the round is below this.
export interface EnemyState { id: string; hp: number; markedUntil: number; absent?: boolean; phase?: number; phaseRound?: number; interruptedRound?: number; interruptedBy?: string; steadyRound?: number; delayedRound?: number; corrodedUntil?: number; corrodeBonus?: number;
  weaken?: number; dispelledUntil?: number }
// `held`: a spear's hold the line turned this move from a back-lane ally to him; `decoyed`: a scout's decoy drew it.
export interface Intent extends IntentDefinition { targetId: string; beat: number; round: number; held?: boolean; decoyed?: boolean }
// Party condition carried in from the expedition. Missing ids start at max HP.
export interface BattleEntry { hp: Readonly<Record<string, number>> }
export interface Command { beat: number; heroId: string; action: ActionId; targetId: string }
export interface BattleState {
  encounterId: string; beat: number; round: number; order: string[]; turnIndex: number; outcome: Outcome;
  heroes: HeroState[]; enemies: EnemyState[]; intent: Intent | null; commands: Command[];
  // `uses` (Knight twoguard): the guard covers this many hits on the target from any enemy until the knight returns.
  guard: { heroId: string; targetId: string; sourceId: string; uses?: number } | null;
  // Spear brace (2C-2): the next physical enemy hit on a front-lane ally is countered.
  // Spear wall (★3): `wall` counters every physical hit on the front lane, not only the first.
  counter: { heroId: string; wall?: boolean } | null;
  // Hammer warden taunt (2C-2): from the cast until the warden's next turn, every enemy move aims at him.
  // `reduction`: the Knight's bulwark uses the same pull with its own reduction.
  taunt: { heroId: string; round: number; reduction?: number } | null;
  // Knight challenge (A6): that enemy's move in `round` aims at the knight.
  challenge?: { heroId: string; enemyId: string; round: number } | null;
  // Knight valor banner (A6): every hero hit is stronger for the rest of `round`.
  banner?: { heroId: string; round: number } | null;
  // Bard song (2C-2): persists until the bard switches songs, falls or the battle ends.
  // Recruit trees: the song of dread (`dread`) cuts every enemy move while it plays.
  song: { heroId: string; action: SongId } | null;
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
  // ---- Release A big trees ----
  // Duelist parry: until her next turn her first physical hit taken is halved and countered (`all`: every hit cut, no counter).
  parry?: { heroId: string; all?: boolean } | null;
  // Priest halo: energy hits on heroes are reduced until her next turn.
  halo?: { heroId: string } | null;
  // Priest long prayer / dawn: as `round` begins, every standing ally heals `amount`.
  prayerEcho?: { heroId: string; round: number; amount: number } | null;
  // Priests who used their once-per-battle revive; `lastPrayer` = the last-prayer capstone has fired.
  revived?: string[]; lastPrayer?: boolean;
  // Spear hold the line: from the cast until his next turn, moves aimed at back-lane allies turn to him.
  hold?: { heroId: string; round: number } | null; unyielding?: boolean;
  // Archer pinning volley: the front row screens nothing while the round is at most `round`.
  pinned?: number;
  // Archer tracking shots that fire again as `round` ends (if the target is still standing).
  tracking?: { heroId: string; enemyId: string; round: number; power: number }[];
  // ---- Recruit big trees (owner 2026-10-23) ----
  // Scout decoy: from the cast until her next turn, the next move aimed at `targetId` turns to her.
  decoy?: { heroId: string; targetId: string; round: number } | null;
  // Warden guardian stone: each listed ally's first hit taken is cut by `percent` until his next turn (he heals when it holds).
  stone?: { heroId: string; ids: string[]; percent: number } | null;
  // Bards whose encore (capstone) has already replayed a song this battle.
  encored?: string[];
}
export type SongId = 'valor' | 'mend' | 'dread';
export interface BattleEvent {
  type: 'damage' | 'guard' | 'mark' | 'barrier' | 'heal' | 'interrupt' | 'cancel' | 'down' | 'outcome' | 'brace' | 'counter' | 'delay' | 'corrode' | 'haste' | 'evade' | 'dodge' | 'taunt' | 'song' | 'rally' | 'sigil' | 'sanctuary' | 'stand' | 'finale' | 'resist' | 'phase' | 'summon' | 'charge'
    | 'parry' | 'revive' | 'buff' | 'hold' | 'pin' | 'dispel' | 'weaken';
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
