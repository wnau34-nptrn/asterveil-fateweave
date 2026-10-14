export type ActionId = 'attack' | 'guard' | 'bash' | 'mark' | 'execute' | 'bolt' | 'ward' | 'heal' | 'prayer';
export type Outcome = 'active' | 'victory' | 'defeat';
export interface SkillDefinition { name: string; english: string; icon: string; power: number; cooldown: number }
export interface HeroDefinition {
  id: string; name: string; role: string; lane: 'front' | 'back'; maxHp: number; attack: number;
  actions: readonly ActionId[]; color: number; empoweredByStatuses?: boolean;
}
export interface EnemyDefinition { id: string; name: string; displayName?: string; maxHp: number; color: number }
export interface IntentDefinition {
  sourceId: string; targetId: string; name: string; damage: number; kind: 'physical' | 'energy';
}
export interface EncounterDefinition {
  id: string; version: number; name: string;
  heroes: readonly HeroDefinition[]; enemies: readonly EnemyDefinition[]; intents: readonly IntentDefinition[];
  skills: Record<ActionId, SkillDefinition>;
  rules: { guardReduction: number; markDuration: number; markedBonus: number };
}
export interface HeroState { id: string; hp: number; barrier: number; cooldowns: Partial<Record<ActionId, number>> }
export interface EnemyState { id: string; hp: number; markedUntil: number }
export interface Intent extends IntentDefinition { beat: number }
export interface Command { beat: number; heroId: string; action: ActionId; targetId: string }
export interface BattleState {
  encounterId: string; beat: number; outcome: Outcome;
  heroes: HeroState[]; enemies: EnemyState[]; intent: Intent | null; commands: Command[];
}
export interface BattleEvent {
  type: 'damage' | 'guard' | 'mark' | 'barrier' | 'heal' | 'cancel' | 'down' | 'outcome';
  text: string; sourceId?: string; targetId?: string; amount?: number; absorbed?: number; cause?: 'defeated' | 'interrupted';
}
// Render-only snapshots retain the current beat/intent until both sides finish.
// Only Resolution.state is the committed, saveable battle state.
export interface ResolutionStage { state: BattleState; events: BattleEvent[] }
export interface Resolution { state: BattleState; events: BattleEvent[]; stages: { hero: ResolutionStage; enemy: ResolutionStage } }
export interface TargetOption { id: string; name: string; valid: boolean; reason: string }
