import { currentHeroId, resolveCommand, targetOptions, validateCommand } from './engine';
import type { ActionId, BattleEvent, BattleState, Command, EncounterDefinition } from './types';

// Auto battle (owner 2026-11-26): random battles only, one plain style, the player switches skills off and picks the HP
// that stops it. It is meant to be weaker than a player who reads the field: it scores each legal command by what that
// hero's own action does right now (the same resolver the player uses), and never looks at the enemies' announced moves,
// the turns after it or set-ups across turns. So it does not guard or ward against a big hit, interrupt, delay or bend a
// move on purpose, and it spends a skill as soon as the skill is worth more than a basic attack.
// Pure and deterministic: no clocks or random numbers, so the same battle always plays the same way.

// Effects that only pay off later or that read a foe's move: worth a little (or nothing), never more than a real hit.
const CONTROL: ReadonlySet<BattleEvent['type']> = new Set(['interrupt', 'cancel', 'delay', 'shove', 'deflect', 'dial']);
const IGNORED: ReadonlySet<BattleEvent['type']> = new Set(['damage', 'heal', 'barrier', 'revive', 'down', 'outcome', 'phase', 'summon', 'charge', 'resist', 'dodge']);
export const AUTO_UTILITY = 4, AUTO_KILL = 12, AUTO_REVIVE = 30, AUTO_SKILL = 2;

const enemyIds = (data: EncounterDefinition) => new Set<string>(data.enemies.map(e => e.id));
const maxHp = (data: EncounterDefinition, id: string) => data.heroes.find(h => h.id === id)?.maxHp ?? 1;

// What one command is worth from the acting hero's own turn (the enemy turns that follow are not looked at).
export function autoScore(state: BattleState, data: EncounterDefinition, command: Command): number {
  const turn = resolveCommand(state, data, command).turns[0]; if (!turn) return 0;
  const foes = enemyIds(data); let value = 0, direct = 0; const kinds = new Set<BattleEvent['type']>();
  for (const e of turn.events) {
    const onFoe = !!e.targetId && foes.has(e.targetId); const amount = e.amount ?? 0;
    if (e.type === 'damage' && e.sourceId === command.heroId) {
      if (onFoe) { value += amount; direct += amount; } else value -= amount * 1.5;
    } else if (e.type === 'down' && onFoe) value += AUTO_KILL;
    else if (e.type === 'heal' && e.sourceId === command.heroId && !onFoe) {
      const before = state.heroes.find(h => h.id === e.targetId);
      value += amount * (before && before.hp * 2 < maxHp(data, before.id) ? 1.5 : 1); direct += amount;
    } else if (e.type === 'barrier' && e.sourceId === command.heroId && !onFoe) { value += amount / 2; direct += amount; }
    else if (e.type === 'revive' && e.sourceId === command.heroId) { value += AUTO_REVIVE + amount; direct += amount; }
    else if (!IGNORED.has(e.type) && !CONTROL.has(e.type) && (!e.sourceId || e.sourceId === command.heroId)) kinds.add(e.type);
  }
  // A pure status move (a mark, a song, a guard...) is worth a little, but not twice in a row from the same hero.
  const last = [...state.commands].reverse().find(c => c.heroId === command.heroId);
  if (kinds.size && !(direct === 0 && last?.action === command.action)) value += AUTO_UTILITY * kinds.size;
  if (command.action !== 'attack' && value > 0) value += AUTO_SKILL;
  return value;
}

// On about `AUTO_LAPSE`% of turns auto battle only makes a basic attack, like a player who is not paying attention
// (the simulation's casual player follows the advice on ~70% of turns). The roll comes from the battle itself (its
// encounter, beat and hero), so the same turn always gets the same answer and replays never change.
export const AUTO_LAPSE = 30;
export function lapse(state: BattleState, heroId: string): boolean {
  let h = 2166136261;
  for (const ch of `${state.encounterId}:${state.beat}:${heroId}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100) < AUTO_LAPSE;
}

// The command auto battle gives the current hero, or undefined when it has none (the player takes over).
// `off`: skills the player switched off for auto battle; the basic attack is always allowed.
export function autoCommand(state: BattleState, data: EncounterDefinition, off: readonly ActionId[] = []): Command | undefined {
  if (state.outcome !== 'active') return;
  const heroId = currentHeroId(state, data); if (!heroId) return;
  const hero = data.heroes.find(h => h.id === heroId); if (!hero) return;
  let best: { command: Command; score: number } | undefined;
  for (const action of hero.actions) {
    if (action !== 'attack' && off.includes(action)) continue;
    if (lapse(state, heroId) && action !== 'attack') continue;
    for (const target of targetOptions(state, data, heroId, action)) {
      if (!target.valid) continue;
      const command: Command = { beat: state.beat, heroId, action, targetId: target.id };
      // Moves that need a second choice (the Seer bending a move onto another foe) are left to the player.
      if (validateCommand(state, data, command)) continue;
      // Ties go to the foe nearest to falling, then to the earlier skill and target.
      const foe = state.enemies.find(e => e.id === target.id);
      const score = autoScore(state, data, command) - (foe ? foe.hp / 1000 : 0);
      if (!best || score > best.score) best = { command, score };
    }
  }
  return best?.command;
}

// When auto battle hands the battle back. `watch` is taken when auto starts (or resumes) in a battle: heroes standing
// then, and those already under the stop HP then (they do not stop it again; only falling does).
export interface AutoWatch { standing: string[]; low: string[] }
// `stopHp`: percent of max HP; 0 = never stop for HP (a hero falling still stops it).
export const AUTO_STOP_CHOICES = [0, 30, 50, 70] as const;
const under = (data: EncounterDefinition, hp: number, id: string, stopHp: number) => stopHp > 0 && hp * 100 < stopHp * maxHp(data, id);
export function autoWatch(state: BattleState, data: EncounterDefinition, stopHp: number): AutoWatch {
  const standing = state.heroes.filter(h => h.hp > 0);
  return { standing: standing.map(h => h.id), low: standing.filter(h => under(data, h.hp, h.id, stopHp)).map(h => h.id) };
}
export type AutoStop = { reason: 'down' | 'low'; heroId: string };
export function autoStopReason(state: BattleState, data: EncounterDefinition, stopHp: number, watch: AutoWatch): AutoStop | undefined {
  for (const id of watch.standing) {
    const hp = state.heroes.find(h => h.id === id)?.hp ?? 0;
    if (hp <= 0) return { reason: 'down', heroId: id };
  }
  for (const id of watch.standing) {
    const hp = state.heroes.find(h => h.id === id)?.hp ?? 0;
    if (!watch.low.includes(id) && under(data, hp, id, stopHp)) return { reason: 'low', heroId: id };
  }
}

// The player's auto battle settings (kept on the device; not part of the save).
export interface AutoSettings { on: boolean; stopHp: number; off: ActionId[] }
export const autoSettingsKey = 'asterveil.fateweave.auto-battle.v1';
export const defaultAutoSettings = (): AutoSettings => ({ on: false, stopHp: 50, off: [] });
export function readAutoSettings(raw: string | null): AutoSettings {
  const base = defaultAutoSettings(); if (!raw) return base;
  try {
    const v = JSON.parse(raw) as Partial<AutoSettings>;
    return {
      on: v.on === true,
      stopHp: (AUTO_STOP_CHOICES as readonly number[]).includes(v.stopHp as number) ? v.stopHp as number : base.stopHp,
      off: Array.isArray(v.off) ? [...new Set(v.off.filter((a): a is ActionId => typeof a === 'string' && a !== 'attack'))] : [],
    };
  } catch { return base; }
}
