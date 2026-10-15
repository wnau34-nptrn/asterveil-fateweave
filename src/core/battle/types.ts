export type ActionId = 'attack' | 'guard' | 'bash' | 'mark' | 'execute' | 'bolt' | 'ward' | 'heal' | 'prayer' | 'brace' | 'pierce' | 'hinder' | 'volley';
export type Outcome = 'active' | 'victory' | 'defeat';
export interface SkillDefinition { name: string; english: string; icon: string; power: number; cooldown: number }
export interface HeroDefinition {
  id: string; name: string; role: string; lane: 'front' | 'back'; maxHp: number; attack: number; speed: number;
  actions: readonly ActionId[]; color: number; empoweredByStatuses?: boolean;
  // Percent added to this hero's skill power (stars). Attack and max HP are scaled directly.
  skillBonus?: number;
}
export interface EnemyDefinition { id: string; name: string; displayName?: string; maxHp: number; speed: number; color: number }
// Enemy moves aim at a party slot (0-3 in deployment order), not a named hero, so any
// mercenary in that slot is the target. The resolved hero id is stored on Intent.
export interface IntentDefinition { sourceId: string; targetSlot: number; name: string; damage: number; kind: 'physical' | 'energy' }
export interface EncounterDefinition {
  id: string; version: number; name: string;
  heroes: readonly HeroDefinition[]; enemies: readonly EnemyDefinition[]; intents: readonly IntentDefinition[];
  skills: Record<ActionId, SkillDefinition>;
  rules: { guardReduction: number; markDuration: number; markedBonus: number };
}
// Expiry/cooldown values are absolute round numbers, never animation time.
export interface HeroState { id: string; hp: number; barrier: number; cooldowns: Partial<Record<ActionId, number>> }
// `delayedRound`: an archer's hindering shot sends this enemy to the end of that round's queue.
export interface EnemyState { id: string; hp: number; markedUntil: number; interruptedRound?: number; delayedRound?: number }
export interface Intent extends IntentDefinition { targetId: string; beat: number; round: number }
// Party condition carried in from the expedition. Missing ids start at max HP.
export interface BattleEntry { hp: Readonly<Record<string, number>> }
export interface Command { beat: number; heroId: string; action: ActionId; targetId: string }
export interface BattleState {
  encounterId: string; beat: number; round: number; order: string[]; turnIndex: number; outcome: Outcome;
  heroes: HeroState[]; enemies: EnemyState[]; intent: Intent | null; commands: Command[];
  guard: { heroId: string; targetId: string; sourceId: string } | null;
  // Spear brace (2C-2): the next physical enemy hit on a front-lane ally is countered.
  counter: { heroId: string } | null;
}
export interface BattleEvent {
  type: 'damage' | 'guard' | 'mark' | 'barrier' | 'heal' | 'interrupt' | 'cancel' | 'down' | 'outcome' | 'brace' | 'counter' | 'delay';
  text: string; sourceId?: string; targetId?: string; amount?: number; absorbed?: number; cause?: 'defeated' | 'interrupted';
}
// One frame per real actor turn. Only Resolution.state is committed/saved.
export interface TurnStage {
  actorId: string; side: 'hero' | 'enemy'; beat: number; round: number; action?: ActionId; targetId?: string;
  intent: Intent | null; state: BattleState; events: BattleEvent[];
}
export interface Resolution { initial: BattleState; state: BattleState; events: BattleEvent[]; turns: TurnStage[] }
export interface TurnSlot { actorId: string; side: 'hero' | 'enemy'; round: number; speed: number }
export interface TargetOption { id: string; name: string; valid: boolean; reason: string }
