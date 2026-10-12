export type ActionId = 'attack' | 'guard' | 'mark' | 'redirect';
export type Outcome = 'active' | 'victory' | 'defeat';
export interface HeroDefinition {
  id: string; name: string; role: string; maxHp: number; attack: number;
  actions: readonly ActionId[]; color: number; empoweredByStatuses?: boolean;
}
export interface EnemyDefinition {
  id: string; name: string; maxHp: number; color: number;
}
export interface IntentDefinition {
  sourceId: string; targetId: string; name: string;
  damage: number; kind: 'physical' | 'energy'; redirectable: boolean;
}
export interface EncounterDefinition {
  id: string; version: number; name: string;
  heroes: readonly HeroDefinition[]; enemies: readonly EnemyDefinition[];
  intents: readonly IntentDefinition[];
  crystal: { id: string; name: string; charges: number; barrier: number };
  rules: {
    counterCap: number; redirectCost: number; guardReduction: number;
    markDuration: number; exposedDuration: number; tracerBonus: number;
  };
}
export interface HeroState { id: string; hp: number; barrier: number }
export interface EnemyState { id: string; hp: number; markedUntil: number; exposedUntil: number }
export interface Intent extends IntentDefinition { beat: number }
export interface Command { beat: number; heroId: string; action: ActionId; targetId: string }
export interface BattleState {
  encounterId: string; beat: number; outcome: Outcome; counter: number;
  heroes: HeroState[]; enemies: EnemyState[];
  crystal: { id: string; charges: number };
  intent: Intent | null; commands: Command[];
}
export interface BattleEvent {
  type: 'damage' | 'guard' | 'mark' | 'redirect' | 'barrier' | 'cancel' | 'down' | 'outcome';
  text: string; sourceId?: string; targetId?: string; amount?: number;
}
export interface Resolution { state: BattleState; events: BattleEvent[] }
export interface TargetOption { id: string; name: string; valid: boolean; reason: string }
