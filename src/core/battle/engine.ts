import type { ActionId, BattleEvent, BattleState, Command, EncounterDefinition, Intent, Resolution, TargetOption } from './types';

// Targets freeze at announcement. Front heroes screen physical attacks;
// energy attacks can reach the preferred back hero.
function announce(state: BattleState, data: EncounterDefinition): Intent | null {
  for (let offset = 0; offset < data.intents.length; offset++) {
    const template = data.intents[(state.beat - 1 + offset) % data.intents.length];
    if (!template || !state.enemies.some(e => e.id === template.sourceId && e.hp > 0)) continue;
    const living = state.heroes.filter(h => h.hp > 0);
    const front = living.filter(h => data.heroes.find(d => d.id === h.id)!.lane === 'front');
    const allowed = template.kind === 'physical' && front.length ? front : living;
    const target = allowed.find(h => h.id === template.targetId) ?? allowed[0];
    if (target) return { ...template, targetId: target.id, beat: state.beat };
  }
  return null;
}
export function createBattle(data: EncounterDefinition): BattleState {
  const state: BattleState = {
    encounterId: data.id, beat: 1, outcome: 'active',
    heroes: data.heroes.map(h => ({ id: h.id, hp: h.maxHp, barrier: 0, cooldowns: {} })),
    enemies: data.enemies.map(e => ({ id: e.id, hp: e.maxHp, markedUntil: 0 })), intent: null, commands: [],
  };
  state.intent = announce(state, data); return state;
}
export function plannedIntents(state: BattleState, data: EncounterDefinition, count = 2): Intent[] {
  if (state.outcome !== 'active') return [];
  return Array.from({ length: count }, (_, i) => announce({ ...state, beat: state.beat + i + 1 }, data)).filter(i => i !== null);
}
export function actionReason(state: BattleState, data: EncounterDefinition, heroId: string, action: ActionId): string {
  if (state.outcome !== 'active') return 'The encounter has ended.';
  const actor = state.heroes.find(h => h.id === heroId);
  if (!actor || actor.hp <= 0) return 'This hero is down.';
  if (!data.heroes.find(h => h.id === heroId)?.actions.includes(action)) return 'This hero does not have this action.';
  const remaining = (actor.cooldowns[action] ?? 0) - state.beat;
  if (remaining > 0) return `Cooldown: ${remaining}`;
  return '';
}
export function targetOptions(state: BattleState, data: EncounterDefinition, heroId: string, action: ActionId): TargetOption[] {
  const unavailable = actionReason(state, data, heroId, action);
  if (action === 'prayer') {
    const injured = state.heroes.some(h => h.hp > 0 && h.hp < data.heroes.find(d => d.id === h.id)!.maxHp);
    const reason = unavailable || (!injured ? 'The living party is at full health.' : '');
    return [{ id: 'party', name: 'Party', valid: !reason, reason }];
  }
  if (['guard', 'ward', 'heal'].includes(action)) return data.heroes.map(h => {
    const actor = state.heroes.find(s => s.id === h.id)!;
    const reason = unavailable || (actor.hp <= 0 ? 'This hero is down.' :
      action === 'guard' && state.intent?.targetId !== h.id ? 'Guard must protect the announced target.' :
      action === 'heal' && actor.hp >= h.maxHp ? 'This ally is at full health.' :
      action === 'ward' && actor.barrier >= data.skills.ward.power ? 'This ally already has this barrier.' : '');
    return { id: h.id, name: h.name, valid: !reason, reason };
  });
  return data.enemies.map(e => {
    const actor = state.enemies.find(s => s.id === e.id);
    const reason = unavailable || (!actor || actor.hp <= 0 ? 'This enemy is down.' : '');
    return { id: e.id, name: e.name, valid: !reason, reason };
  });
}
export function validateCommand(state: BattleState, data: EncounterDefinition, command: Command): string {
  if (state.encounterId !== data.id) return 'Encounter mismatch.';
  if (command.beat !== state.beat) return 'The preview is stale. Select an action again.';
  const reason = actionReason(state, data, command.heroId, command.action);
  if (reason) return reason;
  const target = targetOptions(state, data, command.heroId, command.action).find(t => t.id === command.targetId);
  return target?.valid ? '' : target?.reason || 'Invalid target.';
}
export function resolveCommand(initial: BattleState, data: EncounterDefinition, command: Command): Resolution {
  const invalid = validateCommand(initial, data, command); if (invalid) throw new Error(invalid);
  const state = structuredClone(initial);
  const events: BattleEvent[] = [];
  const hero = data.heroes.find(h => h.id === command.heroId)!;
  const actor = state.heroes.find(h => h.id === hero.id)!;
  const skill = data.skills[command.action];
  const enemy = state.enemies.find(e => e.id === command.targetId);
  const emit = (event: BattleEvent) => events.push(event);
  const damageEnemy = (amount: number) => {
    const dealt = Math.min(enemy!.hp, amount); enemy!.hp -= dealt;
    emit({ type: 'damage', sourceId: hero.id, targetId: enemy!.id, amount: dealt, text: `Enemy takes ${dealt} damage.` });
    if (!enemy!.hp) emit({ type: 'down', targetId: enemy!.id, text: 'Enemy falls.' });
  };
  const heal = (id: string, power: number) => {
    const target = state.heroes.find(h => h.id === id)!;
    if (target.hp <= 0) return;
    const amount = Math.min(power, data.heroes.find(h => h.id === id)!.maxHp - target.hp);
    if (amount) { target.hp += amount; emit({ type: 'heal', sourceId: hero.id, targetId: id, amount, text: `Restored ${amount} HP.` }); }
  };
  let guardId: string | undefined;
  let interrupted = false;
  switch (command.action) {
    case 'attack': case 'execute': {
      const bonus = hero.empoweredByStatuses && enemy!.markedUntil > state.beat ? data.rules.markedBonus : 0;
      damageEnemy((command.action === 'attack' ? hero.attack : skill.power) + bonus);
      if (bonus) enemy!.markedUntil = 0;
      break;
    }
    case 'bash':
      damageEnemy(skill.power);
      interrupted = state.intent?.kind === 'physical' && state.intent.sourceId === enemy!.id;
      break;
    case 'bolt': damageEnemy(skill.power); break;
    case 'mark':
      enemy!.markedUntil = state.beat + data.rules.markDuration;
      emit({ type: 'mark', sourceId: hero.id, targetId: enemy!.id, text: 'Enemy marked.' }); break;
    case 'guard':
      guardId = command.targetId;
      emit({ type: 'guard', sourceId: hero.id, targetId: guardId, text: 'Knight intercepts the announced hit.' }); break;
    case 'ward': {
      const target = state.heroes.find(h => h.id === command.targetId)!;
      const amount = Math.max(target.barrier, skill.power) - target.barrier;
      target.barrier += amount;
      emit({ type: 'barrier', sourceId: hero.id, targetId: target.id, amount, text: `Added ${amount} barrier.` }); break;
    }
    case 'heal': heal(command.targetId, skill.power); break;
    case 'prayer': for (const h of state.heroes) heal(h.id, skill.power); break;
  }
  if (skill.cooldown) actor.cooldowns[command.action] = state.beat + skill.cooldown;
  const intent = state.intent;
  if (intent) {
    if (!state.enemies.some(e => e.id === intent.sourceId && e.hp > 0) || interrupted) {
      const defeated = !state.enemies.some(e => e.id === intent.sourceId && e.hp > 0);
      emit({ type: 'cancel', sourceId: intent.sourceId, cause: defeated ? 'defeated' : 'interrupted', text: 'Announced attack canceled.' });
    } else {
      const recipient = state.heroes.find(h => h.id === (guardId ? hero.id : intent.targetId))!;
      const incoming = guardId ? Math.ceil(intent.damage * (1 - data.rules.guardReduction)) : intent.damage;
      const absorbed = Math.min(recipient.barrier, incoming); recipient.barrier -= absorbed;
      const dealt = Math.min(recipient.hp, incoming - absorbed); recipient.hp -= dealt;
      emit({ type: 'damage', sourceId: intent.sourceId, targetId: recipient.id, amount: dealt, absorbed, text: `Hero takes ${dealt} damage.` });
      if (!recipient.hp) emit({ type: 'down', targetId: recipient.id, text: 'Hero falls.' });
    }
  }
  state.commands.push({ ...command });
  if (state.enemies.every(e => e.hp === 0)) state.outcome = 'victory';
  else if (state.heroes.every(h => h.hp === 0)) state.outcome = 'defeat';
  if (state.outcome !== 'active') {
    state.intent = null; emit({ type: 'outcome', text: state.outcome });
  } else {
    state.beat++;
    for (const e of state.enemies) if (e.markedUntil <= state.beat) e.markedUntil = 0;
    state.intent = announce(state, data);
  }
  return { state, events };
}
export const previewCommand = resolveCommand;
export function replay(data: EncounterDefinition, commands: readonly Command[]): BattleState {
  return commands.reduce((state, command) => resolveCommand(state, data, command).state, createBattle(data));
}
