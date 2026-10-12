import type { ActionId, BattleEvent, BattleState, Command, EncounterDefinition, Intent, Resolution, TargetOption } from './types';

// A beat announces exactly one event. Dead sources are skipped at announcement,
// never substituted after the player commits against the announced event.
function announce(state: BattleState, data: EncounterDefinition): Intent | null {
  for (let offset = 0; offset < data.intents.length; offset++) {
    const template = data.intents[(state.beat - 1 + offset) % data.intents.length];
    if (!template || !state.enemies.some(e => e.id === template.sourceId && e.hp > 0)) continue;
    const target = state.heroes.find(h => h.id === template.targetId && h.hp > 0) ?? state.heroes.find(h => h.hp > 0);
    if (target) return { ...template, targetId: target.id, beat: state.beat };
  }
  return null;
}

export function createBattle(data: EncounterDefinition): BattleState {
  const state: BattleState = {
    encounterId: data.id, beat: 1, outcome: 'active', counter: 0,
    heroes: data.heroes.map(h => ({ id: h.id, hp: h.maxHp, barrier: 0 })),
    enemies: data.enemies.map(e => ({ id: e.id, hp: e.maxHp, markedUntil: 0, exposedUntil: 0 })),
    crystal: { id: data.crystal.id, charges: data.crystal.charges }, intent: null, commands: [],
  };
  state.intent = announce(state, data);
  return state;
}

// Planning information only: future targets/sources assume the current actors
// survive. The current announced intent is never modified by this projection.
export function plannedIntents(state: BattleState, data: EncounterDefinition, count = 2): Intent[] {
  if (state.outcome !== 'active') return [];
  const planned: Intent[] = [];
  for (let offset = 1; offset <= count; offset++) {
    const intent = announce({ ...state, beat: state.beat + offset }, data);
    if (intent) planned.push(intent);
  }
  return planned;
}

export function actionReason(state: BattleState, data: EncounterDefinition, heroId: string, action: ActionId): string {
  if (state.outcome !== 'active') return 'The encounter has ended.';
  if (!state.heroes.some(h => h.id === heroId && h.hp > 0)) return 'This hero is down.';
  if (!data.heroes.find(h => h.id === heroId)?.actions.includes(action)) return 'This hero does not have this action.';
  if (action === 'redirect') {
    if (!state.intent?.redirectable || state.intent.kind !== 'energy') return 'Only redirectable energy attacks can be woven.';
    if (state.counter < data.rules.redirectCost) return `Requires ${data.rules.redirectCost} Counter. Guard an incoming hit to earn Counter.`;
    if (state.crystal.charges === 0 && !state.enemies.some(e => e.hp > 0 && e.markedUntil > state.beat)) return 'Requires a marked enemy or a charged crystal.';
  }
  return '';
}

export function targetOptions(state: BattleState, data: EncounterDefinition, heroId: string, action: ActionId): TargetOption[] {
  const unavailable = actionReason(state, data, heroId, action);
  if (action === 'guard') return data.heroes.map(h => {
    const alive = state.heroes.some(s => s.id === h.id && s.hp > 0);
    const reason = unavailable || (!alive ? 'This hero is down.' : state.intent?.targetId !== h.id ? 'Guard must protect the announced target.' : '');
    return { id: h.id, name: `${h.name} · ${h.role}`, valid: !reason, reason };
  });
  const targets = data.enemies.map(e => {
    const actor = state.enemies.find(s => s.id === e.id);
    const reason = unavailable || (!actor || actor.hp <= 0 ? 'This enemy is down.' : action === 'redirect' && actor.markedUntil <= state.beat ? 'Mark this enemy first.' : '');
    return { id: e.id, name: e.name, valid: !reason, reason };
  });
  if (action === 'redirect') targets.push({
    id: data.crystal.id, name: data.crystal.name,
    valid: !unavailable && state.crystal.charges > 0,
    reason: unavailable || (state.crystal.charges <= 0 ? 'The crystal has no charge remaining.' : ''),
  });
  return targets;
}

export function validateCommand(state: BattleState, data: EncounterDefinition, command: Command): string {
  if (state.encounterId !== data.id) return 'Encounter mismatch.';
  if (command.beat !== state.beat) return 'The preview is stale. Select an action again.';
  const unavailable = actionReason(state, data, command.heroId, command.action);
  if (unavailable) return unavailable;
  const target = targetOptions(state, data, command.heroId, command.action).find(t => t.id === command.targetId);
  return target?.valid ? '' : target?.reason || 'Invalid target.';
}

export function resolveCommand(initial: BattleState, data: EncounterDefinition, command: Command): Resolution {
  const invalid = validateCommand(initial, data, command);
  if (invalid) throw new Error(invalid);
  const state = structuredClone(initial);
  const events: BattleEvent[] = [];
  const hero = data.heroes.find(h => h.id === command.heroId)!;
  const enemy = state.enemies.find(e => e.id === command.targetId);
  const emit = (event: BattleEvent) => events.push(event);
  const damageEnemy = (id: string, amount: number, sourceId: string) => {
    const target = state.enemies.find(e => e.id === id)!;
    const dealt = Math.min(target.hp, amount);
    target.hp -= dealt;
    emit({ type: 'damage', sourceId, targetId: id, amount: dealt, text: `${data.enemies.find(e => e.id === id)!.name} takes ${dealt} damage.` });
    if (target.hp === 0) emit({ type: 'down', targetId: id, text: `${data.enemies.find(e => e.id === id)!.name} falls.` });
  };
  let guardId: string | undefined;
  let redirectId: string | undefined;
  switch (command.action) {
    case 'attack': {
      const bonus = hero.empoweredByStatuses && (enemy!.markedUntil > state.beat || enemy!.exposedUntil > state.beat) ? data.rules.tracerBonus : 0;
      damageEnemy(command.targetId, hero.attack + bonus, hero.id);
      if (bonus) { enemy!.markedUntil = 0; enemy!.exposedUntil = 0; }
      break;
    }
    case 'guard':
      guardId = command.targetId;
      emit({ type: 'guard', sourceId: hero.id, targetId: guardId, text: `${hero.name} protects ${data.heroes.find(h => h.id === guardId)!.name}; damage reduced by ${data.rules.guardReduction * 100}%.` });
      break;
    case 'mark':
      enemy!.markedUntil = state.beat + data.rules.markDuration;
      emit({ type: 'mark', sourceId: hero.id, targetId: enemy!.id, text: `${data.enemies.find(e => e.id === enemy!.id)!.name} is marked for ${data.rules.markDuration} beats (including this beat).` });
      break;
    case 'redirect':
      state.counter -= data.rules.redirectCost;
      redirectId = command.targetId;
      emit({ type: 'redirect', sourceId: hero.id, targetId: redirectId, text: `${hero.name} redirects ${state.intent!.name}; spends ${data.rules.redirectCost} Counter.` });
      break;
  }
  const intent = state.intent;
  if (intent && state.enemies.some(e => e.id === intent.sourceId && e.hp > 0)) {
    if (redirectId === data.crystal.id) {
      state.crystal.charges--;
      for (const ally of state.heroes.filter(h => h.hp > 0)) ally.barrier = Math.max(ally.barrier, data.crystal.barrier);
      emit({ type: 'barrier', targetId: data.crystal.id, amount: data.crystal.barrier, text: `Crystal absorbs the entire ${intent.damage}-damage attack. Each living hero gains ${data.crystal.barrier} barrier (does not stack).` });
    } else if (redirectId) {
      damageEnemy(redirectId, intent.damage, intent.sourceId);
      const target = state.enemies.find(e => e.id === redirectId)!;
      target.markedUntil = 0;
      target.exposedUntil = state.beat + data.rules.exposedDuration;
    } else {
      const recipientId = guardId ? hero.id : intent.targetId;
      const recipient = state.heroes.find(h => h.id === recipientId)!;
      // Guard intercepts for an ally, rounds up, then existing barrier absorbs.
      const incoming = guardId ? Math.ceil(intent.damage * (1 - data.rules.guardReduction)) : intent.damage;
      const absorbed = Math.min(recipient.barrier, incoming);
      recipient.barrier -= absorbed;
      const dealt = Math.min(recipient.hp, incoming - absorbed);
      recipient.hp -= dealt;
      emit({ type: 'damage', sourceId: intent.sourceId, targetId: recipientId, amount: dealt, text: `${data.heroes.find(h => h.id === recipientId)!.name} takes ${dealt} damage${absorbed ? ` (${absorbed} absorbed by barrier)` : ''}.` });
      if (guardId && recipient.hp > 0) {
        state.counter = Math.min(data.rules.counterCap, state.counter + 1);
        emit({ type: 'guard', targetId: recipientId, text: `Successful Guard: Counter ${state.counter}/${data.rules.counterCap}.` });
      }
      if (recipient.hp === 0) emit({ type: 'down', targetId: recipientId, text: `${data.heroes.find(h => h.id === recipientId)!.name} is down.` });
    }
  } else if (intent) emit({ type: 'cancel', sourceId: intent.sourceId, text: `${intent.name} is canceled: its source is down.` });
  state.commands.push({ ...command });
  if (state.enemies.every(e => e.hp === 0)) state.outcome = 'victory';
  else if (state.heroes.every(h => h.hp === 0)) state.outcome = 'defeat';
  if (state.outcome !== 'active') {
    state.intent = null;
    emit({ type: 'outcome', text: state.outcome === 'victory' ? 'Victory! The rift is quiet.' : 'Defeat. The veil overwhelms your party.' });
  } else {
    state.beat++;
    for (const foe of state.enemies) {
      if (foe.markedUntil <= state.beat) foe.markedUntil = 0;
      if (foe.exposedUntil <= state.beat) foe.exposedUntil = 0;
    }
    state.intent = announce(state, data);
  }
  return { state, events };
}

// The preview is the actual resolver on a cloned state, never a second formula.
export const previewCommand = resolveCommand;

export function replay(data: EncounterDefinition, commands: readonly Command[]): BattleState {
  return commands.reduce((state, command) => resolveCommand(state, data, command).state, createBattle(data));
}
