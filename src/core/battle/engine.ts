import type { ActionId, BattleEntry, BattleEvent, BattleState, Command, EncounterDefinition, Intent, Resolution, TargetOption, TurnSlot, TurnStage } from './types';

const living = (state: BattleState, id: string) => [...state.heroes, ...state.enemies].some(a => a.id === id && a.hp > 0);
const definitions = (data: EncounterDefinition) => [...data.heroes, ...data.enemies];
export function roundOrder(state: BattleState, data: EncounterDefinition): string[] {
  // Explicit original index breaks SPD ties, including ties across the two sides.
  return definitions(data).map((actor, index) => ({ actor, index })).filter(({ actor }) => living(state, actor.id))
    .sort((a, b) => b.actor.speed - a.actor.speed || a.index - b.index).map(({ actor }) => actor.id);
}
export function currentActorId(state: BattleState): string | undefined { return state.outcome === 'active' ? state.order[state.turnIndex] : undefined; }
export function currentHeroId(state: BattleState, data: EncounterDefinition): string | undefined {
  const id = currentActorId(state); return data.heroes.some(h => h.id === id) ? id : undefined;
}
// Forecast order assumes today's survivors remain alive. Current-round order is frozen.
export function upcomingTurns(state: BattleState, data: EncounterDefinition, count = 6): TurnSlot[] {
  if (state.outcome !== 'active') return [];
  const slots: TurnSlot[] = [];
  for (let round = state.round; slots.length < count; round++) {
    const order = round === state.round ? state.order.slice(state.turnIndex) : roundOrder(state, data);
    if (!order.length) break;
    for (const id of order) {
      if (!living(state, id)) continue;
      const def = definitions(data).find(a => a.id === id)!;
      slots.push({ actorId: id, side: data.heroes.some(h => h.id === id) ? 'hero' : 'enemy', round, speed: def.speed });
      if (slots.length === count) break;
    }
  }
  return slots;
}
export function enemyIntent(state: BattleState, data: EncounterDefinition, id: string, round: number): Intent | null {
  const moves = data.intents.filter(i => i.sourceId === id);
  const template = moves[(round - 1) % moves.length];
  if (!template || !living(state, id)) return null;
  const alive = state.heroes.filter(h => h.hp > 0);
  const front = alive.filter(h => data.heroes.find(d => d.id === h.id)!.lane === 'front');
  const allowed = template.kind === 'physical' && front.length ? front : alive;
  const target = allowed.find(h => h.id === template.targetId) ?? allowed[0];
  return target ? { ...template, targetId: target.id, beat: state.beat, round } : null;
}
export function plannedIntents(state: BattleState, data: EncounterDefinition, count = 2): Intent[] {
  return upcomingTurns(state, data, (data.heroes.length + data.enemies.length) * (count + 1))
    .filter(t => t.side === 'enemy').slice(0, count).flatMap(t => {
      const intent = enemyIntent(state, data, t.actorId, t.round); return intent ? [intent] : [];
    });
}
function refreshIntent(state: BattleState, data: EncounterDefinition): void { state.intent = plannedIntents(state, data, 1)[0] ?? null; }
function finishOrAdvance(state: BattleState, data: EncounterDefinition, events: BattleEvent[]): void {
  if (state.enemies.every(e => e.hp <= 0)) state.outcome = 'victory';
  else if (state.heroes.every(h => h.hp <= 0)) state.outcome = 'defeat';
  if (state.outcome !== 'active') {
    state.intent = null; state.guard = null; events.push({ type: 'outcome', text: state.outcome }); return;
  }
  state.beat++;
  do {
    state.turnIndex++;
    if (state.turnIndex >= state.order.length) {
      state.round++; state.order = roundOrder(state, data); state.turnIndex = 0;
      for (const e of state.enemies) if (e.markedUntil <= state.round) e.markedUntil = 0;
    }
  } while (!living(state, state.order[state.turnIndex]!));
  if (state.guard && (!living(state, state.guard.heroId) || !living(state, state.guard.sourceId) || currentActorId(state) === state.guard.heroId)) state.guard = null;
  refreshIntent(state, data);
}
function automaticTurns(state: BattleState, data: EncounterDefinition, turns: TurnStage[]): void {
  while (state.outcome === 'active' && !currentHeroId(state, data)) {
    const actorId = currentActorId(state)!;
    const intent = enemyIntent(state, data, actorId, state.round);
    state.intent = intent;
    const events: BattleEvent[] = [];
    const enemy = state.enemies.find(e => e.id === actorId)!;
    if (intent) {
      if (enemy.interruptedRound === state.round) {
        events.push({ type: 'cancel', sourceId: actorId, cause: 'interrupted', text: 'Physical attack interrupted.' });
      } else {
        const guard = state.guard?.sourceId === actorId && state.guard.targetId === intent.targetId && living(state, state.guard.heroId) ? state.guard : null;
        const recipient = state.heroes.find(h => h.id === (guard?.heroId ?? intent.targetId))!;
        const incoming = guard ? Math.ceil(intent.damage * (1 - data.rules.guardReduction)) : intent.damage;
        const absorbed = Math.min(recipient.barrier, incoming); recipient.barrier -= absorbed;
        const amount = Math.min(recipient.hp, incoming - absorbed); recipient.hp -= amount;
        events.push({ type: 'damage', sourceId: actorId, targetId: recipient.id, amount, absorbed, text: 'Enemy attacks on its own turn.' });
        if (!recipient.hp) events.push({ type: 'down', targetId: recipient.id, text: 'Hero falls.' });
      }
      if (state.guard?.sourceId === actorId) state.guard = null;
    }
    delete enemy.interruptedRound;
    const frame = structuredClone(state); const beat = state.beat; const round = state.round;
    finishOrAdvance(state, data, events);
    if (state.outcome !== 'active') { frame.outcome = state.outcome; frame.intent = null; }
    turns.push({ actorId, side: 'enemy', beat, round, intent, targetId: events.find(e => e.type === 'damage')?.targetId ?? intent?.targetId, state: frame, events });
  }
}
export function entryReason(data: EncounterDefinition, entry?: BattleEntry): string {
  if (!entry) return '';
  if (!entry.hp || typeof entry.hp !== 'object') return 'Invalid party entry.';
  for (const [id, hp] of Object.entries(entry.hp)) {
    const hero = data.heroes.find(h => h.id === id);
    if (!hero || !Number.isInteger(hp) || hp < 0 || hp > hero.maxHp) return 'Invalid party entry.';
  }
  return data.heroes.some(h => (entry.hp[h.id] ?? h.maxHp) > 0) ? '' : 'The whole party is down.';
}
// Heroes entering at 0 HP start down: they never join the queue or receive targets.
export function beginBattle(data: EncounterDefinition, entry?: BattleEntry): Resolution {
  const invalid = entryReason(data, entry); if (invalid) throw new Error(invalid);
  const state: BattleState = {
    encounterId: data.id, beat: 1, round: 1, turnIndex: 0, order: [], outcome: 'active', guard: null,
    heroes: data.heroes.map(h => ({ id: h.id, hp: entry?.hp[h.id] ?? h.maxHp, barrier: 0, cooldowns: {} })),
    enemies: data.enemies.map(e => ({ id: e.id, hp: e.maxHp, markedUntil: 0 })), intent: null, commands: [],
  };
  state.order = roundOrder(state, data); refreshIntent(state, data);
  const initial = structuredClone(state); const turns: TurnStage[] = [];
  automaticTurns(state, data, turns);
  return { initial, state, turns, events: turns.flatMap(t => t.events) };
}
export const createBattle = (data: EncounterDefinition, entry?: BattleEntry): BattleState => beginBattle(data, entry).state;
export function actionReason(state: BattleState, data: EncounterDefinition, heroId: string, action: ActionId): string {
  if (state.outcome !== 'active') return 'The encounter has ended.';
  const actor = state.heroes.find(h => h.id === heroId);
  if (!actor || actor.hp <= 0) return 'This hero is down.';
  if (!data.heroes.find(h => h.id === heroId)?.actions.includes(action)) return 'This hero does not have this action.';
  if (currentHeroId(state, data) !== heroId) return 'It is not this hero’s turn.';
  const remaining = (actor.cooldowns[action] ?? 0) - state.round;
  return remaining > 0 ? `Cooldown: ${remaining}` : '';
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
  const state = structuredClone(initial); const events: BattleEvent[] = []; const turns: TurnStage[] = [];
  const hero = data.heroes.find(h => h.id === command.heroId)!; const actor = state.heroes.find(h => h.id === hero.id)!;
  const skill = data.skills[command.action]; const enemy = state.enemies.find(e => e.id === command.targetId);
  const damage = (power: number) => {
    const amount = Math.min(enemy!.hp, power); enemy!.hp -= amount;
    events.push({ type: 'damage', sourceId: hero.id, targetId: enemy!.id, amount, text: 'Hero attacks.' });
    if (!enemy!.hp) events.push({ type: 'down', targetId: enemy!.id, text: 'Enemy falls.' });
  };
  const heal = (id: string, power: number) => {
    const target = state.heroes.find(h => h.id === id)!; if (!target.hp) return;
    const amount = Math.min(power, data.heroes.find(h => h.id === id)!.maxHp - target.hp);
    if (amount) { target.hp += amount; events.push({ type: 'heal', sourceId: hero.id, targetId: id, amount, text: 'Restored HP.' }); }
  };
  switch (command.action) {
    case 'attack': case 'execute': {
      const bonus = hero.empoweredByStatuses && enemy!.markedUntil > state.round ? data.rules.markedBonus : 0;
      damage((command.action === 'attack' ? hero.attack : skill.power) + bonus); if (bonus) enemy!.markedUntil = 0; break;
    }
    case 'bash': {
      damage(skill.power);
      const slot = upcomingTurns(state, data, state.order.length * 2).find(t => t.actorId === command.targetId);
      const intent = slot && enemyIntent(state, data, command.targetId, slot.round);
      if (enemy!.hp > 0 && intent?.kind === 'physical') {
        enemy!.interruptedRound = intent.round;
        events.push({ type: 'interrupt', sourceId: hero.id, targetId: enemy!.id, text: 'Next physical attack interrupted.' });
      }
      break;
    }
    case 'bolt': damage(skill.power); break;
    case 'mark': enemy!.markedUntil = state.round + data.rules.markDuration; events.push({ type: 'mark', sourceId: hero.id, targetId: enemy!.id, text: 'Enemy marked.' }); break;
    case 'guard': state.guard = { heroId: hero.id, targetId: command.targetId, sourceId: state.intent!.sourceId }; events.push({ type: 'guard', sourceId: hero.id, targetId: command.targetId, text: 'Guard until announced attacker acts or Knight returns.' }); break;
    case 'ward': {
      const target = state.heroes.find(h => h.id === command.targetId)!; const amount = Math.max(target.barrier, skill.power) - target.barrier;
      target.barrier += amount; events.push({ type: 'barrier', sourceId: hero.id, targetId: target.id, amount, text: 'Added barrier.' }); break;
    }
    case 'heal': heal(command.targetId, skill.power); break;
    case 'prayer': for (const h of state.heroes) heal(h.id, skill.power); break;
  }
  if (skill.cooldown) actor.cooldowns[command.action] = state.round + skill.cooldown;
  state.commands.push({ ...command });
  const frame = structuredClone(state); finishOrAdvance(state, data, events);
  if (state.outcome !== 'active') { frame.outcome = state.outcome; frame.intent = null; }
  turns.push({ actorId: hero.id, side: 'hero', beat: initial.beat, round: initial.round, action: command.action, targetId: command.targetId, intent: initial.intent, state: frame, events });
  automaticTurns(state, data, turns);
  return { initial, state, turns, events: turns.flatMap(t => t.events) };
}
export const previewCommand = resolveCommand;
export function replay(data: EncounterDefinition, commands: readonly Command[], entry?: BattleEntry): BattleState {
  return commands.reduce((state, command) => resolveCommand(state, data, command).state, createBattle(data, entry));
}
