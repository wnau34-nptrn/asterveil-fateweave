import type { ActionId, BattleEntry, GearSpecial, HeroDefinition, PassiveId, TalentCap, TalentRule, HeroState, EnemyState, BattleEvent, BattleState, Command, EncounterDefinition, Intent, Resolution, TargetOption, TurnSlot, TurnStage } from './types';

const living = (state: BattleState, id: string) => [...state.heroes, ...state.enemies].some(a => a.id === id && a.hp > 0);
const definitions = (data: EncounterDefinition) => [...data.heroes, ...data.enemies];
export function roundOrder(state: BattleState, data: EncounterDefinition, round = state.round): string[] {
  // Explicit original index breaks SPD ties, including ties across the two sides.
  // Enemies delayed for this round (archer's hindering shot) act after everyone else.
  // Heroes hasted for this round (alchemist's tonic) act before everyone else.
  const tier = (id: string) => state.enemies.some(e => e.id === id && e.delayedRound === round) ? 1 : state.heroes.some(h => h.id === id && h.hastedRound === round) ? -1 : 0;
  return definitions(data).map((actor, index) => ({ actor, index })).filter(({ actor }) => living(state, actor.id))
    .sort((a, b) => tier(a.actor.id) - tier(b.actor.id) || b.actor.speed - a.actor.speed || a.index - b.index).map(({ actor }) => actor.id);
}
export function currentActorId(state: BattleState): string | undefined { return state.outcome === 'active' ? state.order[state.turnIndex] : undefined; }
export function currentHeroId(state: BattleState, data: EncounterDefinition): string | undefined {
  const id = currentActorId(state); return data.heroes.some(h => h.id === id) ? id : undefined;
}
// Forecast order assumes today's survivors remain alive. Current-round order is frozen.
// Every hero hit on a corroded enemy gains the flat corrode bonus.
export function corrodeBonus(state: BattleState, data: EncounterDefinition, enemyId: string): number {
  const e = state.enemies.find(foe => foe.id === enemyId);
  return (e?.corrodedUntil ?? 0) > state.round ? e!.corrodeBonus ?? data.rules.corrodeBonus : 0;
}
// ---- Talents (2D-1b): read from the deployed hero definition (world `starred`), like ★5 passives. ----
const talentsOf = (data: EncounterDefinition, heroId: string | undefined) => heroId ? data.heroes.find(h => h.id === heroId)?.talents : undefined;
export const talentRule = (data: EncounterDefinition, heroId: string | undefined, rule: TalentRule): number => talentsOf(data, heroId)?.rules?.[rule] ?? 0;
export const hasCap = (data: EncounterDefinition, heroId: string | undefined, cap: TalentCap): boolean => talentsOf(data, heroId)?.caps?.[cap] !== undefined;
export const capAmount = (data: EncounterDefinition, heroId: string | undefined, cap: TalentCap): number => talentsOf(data, heroId)?.caps?.[cap] ?? 0;
const fraction = (n: number) => Math.round(n * 100) / 100;
// Rule values as this hero has them (talents add to the shared rule).
export const guardReductionOf = (data: EncounterDefinition, heroId: string | undefined): number => fraction(data.rules.guardReduction + talentRule(data, heroId, 'guardReduction'));
export const tauntReductionOf = (data: EncounterDefinition, heroId: string | undefined): number =>
  fraction((hasPassive(data, heroId, 'stoneskin') ? data.rules.stoneskinReduction : data.rules.tauntReduction) + talentRule(data, heroId, 'tauntReduction'));
export const corrodeBonusOf = (data: EncounterDefinition, heroId: string | undefined): number => data.rules.corrodeBonus + talentRule(data, heroId, 'corrodeBonus');
export const ambushBonusOf = (data: EncounterDefinition, heroId: string | undefined): number => data.rules.ambushBonus + talentRule(data, heroId, 'ambushBonus');
// Every hero hit adds the target's corrosion and the bard's song of valor while it plays.
export const hitBonus = (state: BattleState, data: EncounterDefinition, enemyId: string): number =>
  corrodeBonus(state, data, enemyId) + (state.song?.action === 'valor' ? songPower(data, state.song.heroId, 'valor') : 0);
// ★5 passives are read from the deployed hero definition (world `starred`).
export const hasPassive = (data: EncounterDefinition, heroId: string | undefined, passive: PassiveId): boolean =>
  !!heroId && data.heroes.find(h => h.id === heroId)?.passive === passive;
// A bard's song (resound ★5 makes it stronger).
export function songPower(data: EncounterDefinition, heroId: string, action: 'valor' | 'mend'): number {
  const power = skillPower(data, heroId, action);
  return hasPassive(data, heroId, 'resound') ? Math.round(power * (1 + data.rules.resound)) : power;
}
// Who acts on which target: the UI and the resolver share these groups.
export type TargetKind = 'self' | 'ally' | 'party' | 'enemies' | 'enemy';
export function targetKind(action: ActionId): TargetKind {
  if (action === 'prayer') return 'party';
  if (action === 'volley' || action === 'bomb') return 'enemies';
  if (['brace', 'evade', 'taunt', 'valor', 'mend', 'rally', 'spearwall', 'finale'].includes(action)) return 'self';
  if (['guard', 'ward', 'heal', 'haste', 'sanctuary'].includes(action)) return 'ally';
  return 'enemy';
}
// A scout's ambush strikes harder at an enemy that still has its turn ahead in the current round.
export const ambushBonus = (state: BattleState, data: EncounterDefinition, enemyId: string, heroId?: string): number =>
  state.order.indexOf(enemyId) > state.turnIndex ? ambushBonusOf(data, heroId) : 0;
// Skill power as cast by this hero (stars and levels add a percentage, talents a flat amount).
export function skillPower(data: EncounterDefinition, heroId: string, action: ActionId): number {
  const hero = data.heroes.find(h => h.id === heroId);
  return Math.round(data.skills[action].power * (100 + (hero?.skillBonus ?? 0)) / 100) + (hero?.talents?.power?.[action] ?? 0);
}
// Extra damage a hero's own hits gain from its capstones (duelist deep mark, archer hunter) and mark-hunter gear.
export function talentHitBonus(state: BattleState, data: EncounterDefinition, heroId: string, enemy: EnemyState): number {
  const marked = enemy.markedUntil > state.round;
  const fresh = state.order.indexOf(enemy.id) > state.turnIndex ? data.heroes.find(h => h.id === heroId)?.gear?.freshHit ?? 0 : 0;
  return (marked ? capAmount(data, heroId, 'deepmark') + (hasGear(data, heroId, 'markhunter') ? GEAR_MARK_HUNTER : 0) : 0)
    + ((enemy.delayedRound ?? 0) >= state.round ? capAmount(data, heroId, 'hunter') : 0) + fresh;
}
// ---- Equipment (2D-2) ----
export const GEAR_MARK_HUNTER = 8; export const GEAR_RENEWAL = 4;
export const hasGear = (data: EncounterDefinition, heroId: string | undefined, special: GearSpecial): boolean =>
  !!heroId && !!data.heroes.find(h => h.id === heroId)?.gear?.specials?.includes(special);
// Healing cast by this hero, raised by its equipment's heal bonus.
export function healPower(data: EncounterDefinition, heroId: string, power: number): number {
  const bonus = data.heroes.find(h => h.id === heroId)?.gear?.healBonus ?? 0;
  return bonus ? Math.round(power * (100 + bonus) / 100) : power;
}
// Deploys a party (in slot order) into an encounter; enemy slots then resolve to these heroes.
export function withParty(data: EncounterDefinition, party: readonly HeroDefinition[]): EncounterDefinition {
  if (!party.length || party.length > 4 || new Set(party.map(h => h.id)).size !== party.length) throw new Error('Invalid party.');
  return { ...data, heroes: party };
}
// Monster level (2D-1): enemy max HP and move damage change by `percent` per level away from the
// encounter's reference level (`data.level`). SPD never changes, so turn order is unaffected.
export function withLevel(data: EncounterDefinition, level: number, percent = 7): EncounterDefinition {
  const ref = data.level ?? level; const factor = 1 + (level - ref) * percent / 100;
  if (level === ref) return { ...data, level };
  const scale = (n: number) => Math.max(1, Math.round(n * factor));
  return { ...data, level, enemies: data.enemies.map(e => ({ ...e, maxHp: scale(e.maxHp) })), intents: data.intents.map(i => ({ ...i, damage: scale(i.damage) })) };
}
export function upcomingTurns(state: BattleState, data: EncounterDefinition, count = 6): TurnSlot[] {
  if (state.outcome !== 'active') return [];
  const slots: TurnSlot[] = [];
  for (let round = state.round; slots.length < count; round++) {
    const order = round === state.round ? state.order.slice(state.turnIndex) : roundOrder(state, data, round);
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
// A warden's taunt covers enemy turns from the cast until the warden's own next turn, so forecasts
// for later turns already show the original targets again.
function taunted(state: BattleState, data: EncounterDefinition, enemyId: string, round: number): string | undefined {
  const t = state.taunt; if (!t || !living(state, t.heroId)) return undefined;
  if (round === t.round) return t.heroId;
  if (round !== t.round + 1) return undefined;
  const order = round === state.round ? state.order : roundOrder(state, data, round);
  return order.indexOf(enemyId) < order.indexOf(t.heroId) ? t.heroId : undefined;
}
export function enemyIntent(state: BattleState, data: EncounterDefinition, id: string, round: number): Intent | null {
  const moves = data.intents.filter(i => i.sourceId === id);
  const template = moves[(round - 1) % moves.length];
  if (!template || !living(state, id)) return null;
  const alive = state.heroes.filter(h => h.hp > 0);
  const front = alive.filter(h => data.heroes.find(d => d.id === h.id)!.lane === 'front');
  const allowed = template.kind === 'physical' && front.length ? front : alive;
  const target = allowed.find(h => h.id === data.heroes[template.targetSlot]?.id) ?? allowed[0];
  const warden = taunted(state, data, id, round);
  return target ? { ...template, targetId: warden ?? target.id, beat: state.beat, round } : null;
}
export function plannedIntents(state: BattleState, data: EncounterDefinition, count = 2): Intent[] {
  return upcomingTurns(state, data, (data.heroes.length + data.enemies.length) * (count + 1))
    .filter(t => t.side === 'enemy').slice(0, count).flatMap(t => {
      const intent = enemyIntent(state, data, t.actorId, t.round); return intent ? [intent] : [];
    });
}
// The next move this enemy announces (its next queue slot), used by bash, sigil bind, backstab and earthshaker.
export function nextIntentOf(state: BattleState, data: EncounterDefinition, enemyId: string): Intent | null {
  const slot = upcomingTurns(state, data, (state.order.length || 1) * 2 + data.enemies.length).find(t => t.actorId === enemyId);
  return slot ? enemyIntent(state, data, enemyId, slot.round) : null;
}
function refreshIntent(state: BattleState, data: EncounterDefinition): void { state.intent = plannedIntents(state, data, 1)[0] ?? null; }
function finishOrAdvance(state: BattleState, data: EncounterDefinition, events: BattleEvent[]): void {
  if (state.enemies.every(e => e.hp <= 0)) state.outcome = 'victory';
  else if (state.heroes.every(h => h.hp <= 0)) state.outcome = 'defeat';
  if (state.outcome !== 'active') {
    state.intent = null; state.guard = null; state.counter = null; state.taunt = null; state.song = null; state.rally = null; state.sanctuary = null; state.solace = null; events.push({ type: 'outcome', text: state.outcome }); return;
  }
  state.beat++;
  do {
    state.turnIndex++;
    if (state.turnIndex >= state.order.length) {
      state.round++; state.order = roundOrder(state, data); state.turnIndex = 0;
      for (const e of state.enemies) if (e.markedUntil <= state.round) e.markedUntil = 0;
      // A song of mending heals every standing ally as each new round begins.
      if (state.song?.action === 'mend' && living(state, state.song.heroId)) {
        const power = healPower(data, state.song.heroId, songPower(data, state.song.heroId, 'mend'));
        for (const h of state.heroes) {
          const amount = h.hp > 0 ? Math.min(power, data.heroes.find(d => d.id === h.id)!.maxHp - h.hp) : 0;
          if (amount) { h.hp += amount; events.push({ type: 'heal', sourceId: state.song.heroId, targetId: h.id, amount, text: 'The song mends the party.' }); }
        }
      }
    }
  } while (!living(state, state.order[state.turnIndex]!));
  if (state.guard && (!living(state, state.guard.heroId) || !living(state, state.guard.sourceId) || currentActorId(state) === state.guard.heroId)) state.guard = null;
  if (state.counter && (!living(state, state.counter.heroId) || currentActorId(state) === state.counter.heroId)) state.counter = null;
  if (state.taunt && (!living(state, state.taunt.heroId) || currentActorId(state) === state.taunt.heroId)) state.taunt = null;
  if (state.song && !living(state, state.song.heroId)) state.song = null;
  if (state.rally && (!living(state, state.rally.heroId) || currentActorId(state) === state.rally.heroId)) state.rally = null;
  if (state.sanctuary && (!living(state, state.sanctuary.heroId) || currentActorId(state) === state.sanctuary.heroId)) state.sanctuary = null;
  if (state.solace && (!living(state, state.solace.heroId) || currentActorId(state) === state.solace.heroId)) state.solace = null;
  for (const h of state.heroes) if (h.evading && (h.hp <= 0 || currentActorId(state) === h.id)) { delete h.evading; delete h.evadeExtra; }
  // Warden stone regen (talent): below half HP, he recovers at the start of his turn.
  const turnHero = state.heroes.find(h => h.id === currentActorId(state));
  const regen = turnHero ? capAmount(data, turnHero.id, 'stoneregen') : 0;
  if (turnHero && regen) {
    const max = data.heroes.find(d => d.id === turnHero.id)!.maxHp; const amount = turnHero.hp * 2 < max ? Math.min(regen, max - turnHero.hp) : 0;
    if (amount) { turnHero.hp += amount; events.push({ type: 'heal', sourceId: turnHero.id, targetId: turnHero.id, amount, text: 'Stone regen.' }); }
  }
  // Renewal gear: a small heal at the start of the wearer's turn.
  if (turnHero && hasGear(data, turnHero.id, 'renewal')) {
    const amount = Math.min(GEAR_RENEWAL, data.heroes.find(d => d.id === turnHero.id)!.maxHp - turnHero.hp);
    if (amount > 0) { turnHero.hp += amount; events.push({ type: 'heal', sourceId: turnHero.id, targetId: turnHero.id, amount, text: 'Renewal.' }); }
  }
  refreshIntent(state, data);
}
function strikeBack(state: BattleState, data: EncounterDefinition, heroId: string, enemy: EnemyState, power: number, events: BattleEvent[], text: string): void {
  const dealt = Math.min(enemy.hp, power + hitBonus(state, data, enemy.id)); enemy.hp -= dealt;
  events.push({ type: 'counter', sourceId: heroId, targetId: enemy.id, amount: dealt, text });
  if (!enemy.hp) events.push({ type: 'down', targetId: enemy.id, text: 'Enemy falls.' });
}
// `protector`: the knight whose Guard or Rally reduced this hit (his ★5 stand may keep the recipient up once).
function hit(state: BattleState, data: EncounterDefinition, enemy: EnemyState, intent: Intent, recipient: HeroState, incoming: number, events: BattleEvent[], protector?: string): void {
  const actorId = enemy.id;
  const absorbed = Math.min(recipient.barrier, incoming); recipient.barrier -= absorbed;
  // A mage's reflecting ward (talent) strikes back once when it absorbs a hit.
  const reflect = absorbed ? recipient.reflect : undefined; if (absorbed || !recipient.barrier) delete recipient.reflect;
  let amount = Math.min(recipient.hp, incoming - absorbed);
  if (amount && amount >= recipient.hp) {
    const sanctuary = state.sanctuary;
    if (sanctuary?.targetId === recipient.id && living(state, sanctuary.heroId)) {
      amount = recipient.hp - 1; events.push({ type: 'sanctuary', sourceId: sanctuary.heroId, targetId: recipient.id, text: 'Sanctuary keeps the ally standing.' });
    } else if (protector && !state.standUsed && hasPassive(data, protector, 'stand') && living(state, protector)) {
      amount = recipient.hp - 1; state.standUsed = true; events.push({ type: 'stand', sourceId: protector, targetId: recipient.id, text: 'The knight’s stand keeps the ally at 1 HP.' });
    } else if (hasGear(data, recipient.id, 'laststand') && !state.lastStand?.includes(recipient.id)) {
      amount = recipient.hp - 1; state.lastStand = [...state.lastStand ?? [], recipient.id];
      events.push({ type: 'stand', sourceId: recipient.id, targetId: recipient.id, text: 'Last stand keeps the hero at 1 HP.' });
    }
  }
  recipient.hp -= amount;
  events.push({ type: 'damage', sourceId: actorId, targetId: recipient.id, amount, absorbed, text: 'Enemy attacks on its own turn.' });
  if (!recipient.hp) events.push({ type: 'down', targetId: recipient.id, text: 'Hero falls.' });
  if (reflect && living(state, reflect.heroId) && enemy.hp > 0) strikeBack(state, data, reflect.heroId, enemy, reflect.amount, events, 'The ward reflects the hit.');
  // Thorn set (4 pieces): a physical hit taken is answered.
  const thorns = data.heroes.find(h => h.id === recipient.id)!.gear?.thorns;
  if (thorns && intent.kind === 'physical' && enemy.hp > 0 && recipient.hp > 0) strikeBack(state, data, recipient.id, enemy, thorns, events, 'Thorns strike back.');
  // A guarding knight's counter and a taunting warden's hammer counter (talents).
  if (enemy.hp > 0 && protector === recipient.id && state.guard?.heroId === recipient.id && hasCap(data, recipient.id, 'guardcounter') && recipient.hp > 0)
    strikeBack(state, data, recipient.id, enemy, capAmount(data, recipient.id, 'guardcounter'), events, 'The knight counters.');
  if (enemy.hp > 0 && state.taunt?.heroId === recipient.id && hasCap(data, recipient.id, 'hammercounter') && recipient.hp > 0)
    strikeBack(state, data, recipient.id, enemy, capAmount(data, recipient.id, 'hammercounter'), events, 'The warden hammers back.');
  // A braced spear answers the first physical hit on any front-lane ally while it stands; a spear wall answers every one.
  const brace = state.counter;
  if (brace && enemy.hp > 0 && intent.kind === 'physical' && living(state, brace.heroId) && data.heroes.find(h => h.id === recipient.id)!.lane === 'front') {
    const power = brace.wall ? skillPower(data, brace.heroId, 'spearwall')
      : Math.round(skillPower(data, brace.heroId, 'brace') * (hasPassive(data, brace.heroId, 'heavycounter') ? 1 + data.rules.heavyCounter : 1));
    strikeBack(state, data, brace.heroId, enemy, power, events, brace.wall ? 'Spear wall counters.' : 'Braced spear counters.');
    if (!brace.wall) state.counter = null;
  }
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
        events.push({ type: 'cancel', sourceId: actorId, cause: intent.kind === 'energy' ? 'sealed' : 'interrupted', text: intent.kind === 'energy' ? 'Energy move sealed.' : 'Physical attack interrupted.' });
      } else {
        const guard = state.guard?.sourceId === actorId && state.guard.targetId === intent.targetId && living(state, state.guard.heroId) ? state.guard : null;
        const recipient = state.heroes.find(h => h.id === (guard?.heroId ?? intent.targetId))!;
        if (recipient.evading) {
          // A scout's shadow step: the whole hit misses, so nothing is absorbed and no counter triggers.
          if (recipient.evadeExtra) recipient.evadeExtra--; else delete recipient.evading;
          events.push({ type: 'dodge', sourceId: actorId, targetId: recipient.id, amount: 0, text: 'The attack misses the evading scout.' });
          const mend = Math.min(talentRule(data, recipient.id, 'dodgeHeal'), data.heroes.find(h => h.id === recipient.id)!.maxHp - recipient.hp);
          if (mend > 0) { recipient.hp += mend; events.push({ type: 'heal', sourceId: recipient.id, targetId: recipient.id, amount: mend, text: 'The scout recovers after dodging.' }); }
          if (hasPassive(data, recipient.id, 'shadowcounter')) strikeBack(state, data, recipient.id, enemy, data.rules.shadowCounter, events, 'The scout strikes back from the shadows.');
        } else {
          // Reductions apply in order: Guard, a taunting warden (stoneskin ★5 is stronger), then a knight's rally.
          let incoming = guard ? Math.ceil(intent.damage * (1 - guardReductionOf(data, guard.heroId))) : intent.damage;
          let protector = guard?.heroId;
          if (state.taunt?.heroId === recipient.id) incoming = Math.ceil(incoming * (1 - tauntReductionOf(data, recipient.id)));
          const rally = state.rally;
          if (rally && rally.ids.includes(recipient.id) && living(state, rally.heroId)) {
            incoming = Math.ceil(incoming * (1 - data.rules.rallyReduction)); rally.ids = rally.ids.filter(id => id !== recipient.id); protector ??= rally.heroId;
          }
          // Talents: a braced spear's front wall, a priest's solace, then a bard's chorus (flat).
          const brace = state.counter;
          if (brace && intent.kind === 'physical' && living(state, brace.heroId) && hasCap(data, brace.heroId, 'frontwall') && data.heroes.find(h => h.id === recipient.id)!.lane === 'front')
            incoming = Math.ceil(incoming * (1 - capAmount(data, brace.heroId, 'frontwall') / 100));
          if (state.solace?.targetId === recipient.id && living(state, state.solace.heroId)) incoming = Math.ceil(incoming * (1 - capAmount(data, state.solace.heroId, 'solace') / 100));
          if (state.song?.action === 'valor' && living(state, state.song.heroId) && hasCap(data, state.song.heroId, 'chorus')) incoming = Math.max(0, incoming - capAmount(data, state.song.heroId, 'chorus'));
          hit(state, data, enemy, intent, recipient, incoming, events, protector);
        }
      }
      if (state.guard?.sourceId === actorId) state.guard = null;
    }
    delete enemy.interruptedRound;
    const frame = structuredClone(state); const beat = state.beat; const round = state.round;
    finishOrAdvance(state, data, events);
    if (state.outcome !== 'active') { frame.outcome = state.outcome; frame.intent = null; }
    turns.push({ actorId, side: 'enemy', beat, round, intent, targetId: events.find(e => e.type === 'damage' || e.type === 'dodge')?.targetId ?? intent?.targetId, state: frame, events });
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
    encounterId: data.id, beat: 1, round: 1, turnIndex: 0, order: [], outcome: 'active', guard: null, counter: null, taunt: null, song: null,
    // Equipment can start a standing hero with a barrier.
    heroes: data.heroes.map(h => { const hp = entry?.hp[h.id] ?? h.maxHp; return { id: h.id, hp, barrier: hp > 0 ? h.gear?.barrier ?? 0 : 0, cooldowns: {} }; }),
    enemies: data.enemies.map(e => ({ id: e.id, hp: e.maxHp, markedUntil: 0 })), intent: null, commands: [],
  };
  // Wind set (4 pieces): the wearer acts before everyone in round 1.
  for (const h of state.heroes) if (h.hp > 0 && data.heroes.find(d => d.id === h.id)!.gear?.firstStrike) h.hastedRound = 1;
  // Bard overture (talent): the battle opens with the song of mending already playing.
  const bard = data.heroes.find(h => hasCap(data, h.id, 'overture') && state.heroes.find(s => s.id === h.id)!.hp > 0);
  if (bard) state.song = { heroId: bard.id, action: 'mend' };
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
  if (targetKind(action) === 'enemies') {
    const reason = unavailable || (!state.enemies.some(e => e.hp > 0) ? 'This enemy is down.' : '');
    return [{ id: 'enemies', name: 'Enemies', valid: !reason, reason }];
  }
  if (targetKind(action) === 'self') {
    // Self-only stances. Shadow step, challenge and rally lapse at the actor's own turn, so they cannot stack either.
    const reason = unavailable || ((action === 'brace' || action === 'spearwall') && state.counter?.heroId === heroId ? 'Already braced.' :
      (action === 'valor' || action === 'mend') && state.song?.heroId === heroId && state.song.action === action ? 'Already playing this song.' :
      action === 'finale' && state.song?.heroId !== heroId ? 'No song is playing.' : '');
    return [{ id: heroId, name: data.heroes.find(h => h.id === heroId)?.name ?? heroId, valid: !reason, reason }];
  }
  if (action === 'haste') return data.heroes.map(h => {
    const ally = state.heroes.find(s => s.id === h.id)!;
    const reason = unavailable || (ally.hp <= 0 ? 'This hero is down.' : ally.hastedRound === state.round + 1 ? 'Already hasted.' : '');
    return { id: h.id, name: h.name, valid: !reason, reason };
  });
  if (['guard', 'ward', 'heal', 'sanctuary'].includes(action)) return data.heroes.map(h => {
    const actor = state.heroes.find(s => s.id === h.id)!;
    const reason = unavailable || (actor.hp <= 0 ? 'This hero is down.' :
      action === 'guard' && state.intent?.targetId !== h.id ? 'Guard must protect the announced target.' :
      action === 'heal' && actor.hp >= h.maxHp ? 'This ally is at full health.' :
      action === 'ward' && actor.barrier >= skillPower(data, heroId, 'ward') ? 'This ally already has this barrier.' : '');
    return { id: h.id, name: h.name, valid: !reason, reason };
  });
  return data.enemies.map(e => {
    const actor = state.enemies.find(s => s.id === e.id);
    const reason = unavailable || (!actor || actor.hp <= 0 ? 'This enemy is down.' :
      action === 'backstab' && nextIntentOf(state, data, e.id)?.targetId === heroId ? 'This enemy is aiming at the scout.' : '');
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
  const base = data.skills[command.action]; const enemy = state.enemies.find(e => e.id === command.targetId);
  const skill = { ...base, power: skillPower(data, hero.id, command.action) };
  // Every hero hit adds corrosion, valor and its own capstone bonuses.
  const strike = (foe: EnemyState, power: number, text: string) => {
    const amount = Math.min(foe.hp, power + hitBonus(state, data, foe.id) + talentHitBonus(state, data, hero.id, foe)); foe.hp -= amount;
    events.push({ type: 'damage', sourceId: hero.id, targetId: foe.id, amount, text });
    if (!foe.hp) events.push({ type: 'down', targetId: foe.id, text: 'Enemy falls.' });
  };
  const damage = (power: number) => strike(enemy!, power, 'Hero attacks.');
  // Split bolt / piercing line (talents): the other living enemies take half the skill power.
  const splash = (power: number) => { for (const foe of state.enemies.filter(e => e.hp > 0 && e.id !== enemy!.id)) strike(foe, Math.floor(power / 2), 'The hit carries on.'); };
  const livingBefore = state.enemies.filter(e => e.hp > 0).map(e => e.id);
  const heal = (id: string, base: number) => {
    const target = state.heroes.find(h => h.id === id)!; if (!target.hp) return;
    const power = healPower(data, hero.id, base);
    const amount = Math.min(power, data.heroes.find(h => h.id === id)!.maxHp - target.hp);
    if (amount) { target.hp += amount; events.push({ type: 'heal', sourceId: hero.id, targetId: id, amount, text: 'Restored HP.' }); }
    // Afterglow (★5): healing beyond full HP becomes a barrier (capped, not stacking).
    // The mender set (4 pieces) does the same with its own cap; the larger cap applies.
    const cap = Math.max(hasPassive(data, hero.id, 'afterglow') ? data.rules.afterglowCap : 0, hero.gear?.overflowCap ?? 0);
    const glow = cap ? Math.min(cap, power - amount) - target.barrier : 0;
    if (glow > 0) { target.barrier += glow; events.push({ type: 'barrier', sourceId: hero.id, targetId: id, amount: glow, text: 'Overflowing light becomes a barrier.' }); }
  };
  const nextIntent = () => nextIntentOf(state, data, command.targetId);
  switch (command.action) {
    case 'attack': case 'execute': {
      const bonus = hero.empoweredByStatuses && enemy!.markedUntil > state.round ? data.rules.markedBonus : 0;
      damage((command.action === 'attack' ? hero.attack : skill.power) + bonus); if (bonus) enemy!.markedUntil = 0;
      // Duelist talent: a precision strike on a marked enemy restores her HP.
      if (bonus && command.action === 'execute') heal(hero.id, talentRule(data, hero.id, 'executeHeal'));
      break;
    }
    case 'bash': {
      const slot = upcomingTurns(state, data, state.order.length * 2).find(t => t.actorId === command.targetId);
      const intent = slot && enemyIntent(state, data, command.targetId, slot.round);
      // Knight retribution (talent): a bash that stops a physical move hits harder.
      damage(skill.power + (intent?.kind === 'physical' ? capAmount(data, hero.id, 'retribution') : 0));
      if (enemy!.hp > 0 && intent?.kind === 'physical') {
        enemy!.interruptedRound = intent.round;
        events.push({ type: 'interrupt', sourceId: hero.id, targetId: enemy!.id, text: 'Next physical attack interrupted.' });
      }
      break;
    }
    case 'bolt': case 'pierce': damage(skill.power); if (hasCap(data, hero.id, command.action === 'bolt' ? 'splitbolt' : 'pierceline')) splash(skill.power); break;
    case 'backstab': damage(skill.power); break;
    case 'finisher': {
      const maxHp = data.enemies.find(e => e.id === enemy!.id)!.maxHp;
      damage(enemy!.hp < maxHp * data.rules.finisherThreshold ? skill.power * 2 : skill.power); break;
    }
    case 'weakshot': damage(skill.power + ((enemy!.delayedRound ?? 0) >= state.round ? data.rules.weakshotBonus : 0)); break;
    case 'quake': damage(skill.power + (nextIntent()?.targetId === hero.id ? data.rules.quakeBonus : 0)); break;
    case 'sigil': {
      // Sigil bind is the mage's answer to energy moves (shield bash only stops physical ones).
      const intent = nextIntent(); damage(skill.power);
      if (enemy!.hp > 0 && intent?.kind === 'energy') {
        enemy!.interruptedRound = intent.round;
        events.push({ type: 'sigil', sourceId: hero.id, targetId: enemy!.id, text: 'Next energy move sealed.' });
      }
      break;
    }
    case 'rally':
      state.rally = { heroId: hero.id, ids: state.heroes.filter(h => h.hp > 0).map(h => h.id) };
      events.push({ type: 'rally', sourceId: hero.id, targetId: hero.id, text: 'Every ally’s first hit is reduced until the knight’s next turn.' }); break;
    case 'sanctuary':
      state.sanctuary = { heroId: hero.id, targetId: command.targetId };
      events.push({ type: 'sanctuary', sourceId: hero.id, targetId: command.targetId, text: 'The ally cannot fall until the priest’s next turn.' }); break;
    case 'spearwall': state.counter = { heroId: hero.id, wall: true }; events.push({ type: 'brace', sourceId: hero.id, targetId: hero.id, amount: skill.power, text: 'Spear wall until its next turn.' }); break;
    case 'finale': {
      // The song ends and is released at once: valor strikes every enemy, mending heals every ally.
      const song = state.song!.action; state.song = null;
      events.push({ type: 'finale', sourceId: hero.id, targetId: hero.id, text: song === 'valor' ? 'Finale of valor.' : 'Finale of mending.' });
      if (song === 'valor') for (const foe of state.enemies.filter(e => e.hp > 0)) strike(foe, skill.power, 'The finale strikes every enemy.');
      else {
        const power = Math.round(data.rules.finaleHeal * (100 + (hero.skillBonus ?? 0)) / 100);
        for (const h of state.heroes) heal(h.id, power);
      }
      break;
    }
    case 'ambush':
      damage(skill.power + ambushBonus(state, data, enemy!.id, hero.id));
      // Scout shadow layer (talent): an ambush leaves her in shadow step.
      if (hasCap(data, hero.id, 'shadowlayer') && !actor.evading) { actor.evading = true; events.push({ type: 'evade', sourceId: hero.id, targetId: hero.id, text: 'Scout evades the next hit until its next turn.' }); }
      break;
    case 'slam': damage(skill.power); break;
    case 'valor': case 'mend':
      state.song = { heroId: hero.id, action: command.action };
      events.push({ type: 'song', sourceId: hero.id, targetId: hero.id, amount: songPower(data, hero.id, command.action), text: command.action === 'valor' ? 'Song of valor: every hero hit is stronger.' : 'Song of mending: the party heals each round.' }); break;
    case 'taunt':
      state.taunt = { heroId: hero.id, round: state.round };
      events.push({ type: 'taunt', sourceId: hero.id, targetId: hero.id, text: 'Every enemy attack aims at the warden until his next turn.' }); break;
    case 'evade': actor.evading = true; if (hasCap(data, hero.id, 'doubleshadow')) actor.evadeExtra = 1; events.push({ type: 'evade', sourceId: hero.id, targetId: hero.id, text: 'Scout evades the next hit until its next turn.' }); break;
    case 'hinder': {
      damage(skill.power);
      if (enemy!.hp > 0) { enemy!.delayedRound = state.round + 1; events.push({ type: 'delay', sourceId: hero.id, targetId: enemy!.id, text: 'Enemy acts last next round.' }); }
      break;
    }
    case 'acid':
      // The flask's own hit lands before the corrosion takes hold.
      damage(skill.power);
      // Acid spread (talent): every other living enemy is corroded too, without damage.
      for (const foe of state.enemies.filter(e => e.hp > 0 && (e.id === enemy!.id || hasCap(data, hero.id, 'acidspread')))) {
        foe.corrodedUntil = state.round + data.rules.corrodeDuration + (hasPassive(data, hero.id, 'potent') ? 1 : 0); foe.corrodeBonus = corrodeBonusOf(data, hero.id);
        events.push({ type: 'corrode', sourceId: hero.id, targetId: foe.id, amount: foe.corrodeBonus, text: 'Enemy corroded.' });
      }
      break;
    case 'haste': {
      const ally = state.heroes.find(h => h.id === command.targetId)!; ally.hastedRound = state.round + 1;
      events.push({ type: 'haste', sourceId: hero.id, targetId: ally.id, text: 'Ally acts first next round.' });
      heal(ally.id, talentRule(data, hero.id, 'hasteHeal')); break;
    }
    case 'volley': case 'bomb': {
      for (const foe of state.enemies.filter(e => e.hp > 0)) strike(foe, skill.power, command.action === 'bomb' ? 'The flask bursts over every enemy.' : 'Volley hits every enemy.');
      // Archer volley hinder (talent): the fastest standing enemy acts last next round.
      const fastest = command.action === 'volley' && hasCap(data, hero.id, 'volleyhinder')
        ? data.enemies.filter(e => state.enemies.find(s => s.id === e.id)!.hp > 0).reduce<typeof data.enemies[number] | undefined>((best, e) => !best || e.speed > best.speed ? e : best, undefined) : undefined;
      if (fastest) { state.enemies.find(e => e.id === fastest.id)!.delayedRound = state.round + 1; events.push({ type: 'delay', sourceId: hero.id, targetId: fastest.id, text: 'Enemy acts last next round.' }); }
      break;
    }
    case 'brace': state.counter = { heroId: hero.id }; events.push({ type: 'brace', sourceId: hero.id, targetId: hero.id, amount: skill.power, text: 'Spear braced until its next turn.' }); break;
    case 'mark': enemy!.markedUntil = state.round + data.rules.markDuration + (hasPassive(data, hero.id, 'keeneye') ? 1 : 0); events.push({ type: 'mark', sourceId: hero.id, targetId: enemy!.id, text: 'Enemy marked.' }); break;
    case 'guard': state.guard = { heroId: hero.id, targetId: command.targetId, sourceId: state.intent!.sourceId }; events.push({ type: 'guard', sourceId: hero.id, targetId: command.targetId, text: 'Guard until announced attacker acts or Knight returns.' }); break;
    case 'ward': {
      // Echo (★5): a ward on the hero the enemy has announced it will strike is stronger.
      const power = hasPassive(data, hero.id, 'echo') && state.intent?.targetId === command.targetId ? Math.round(skill.power * (1 + data.rules.echoBonus)) : skill.power;
      const target = state.heroes.find(h => h.id === command.targetId)!; const amount = Math.max(target.barrier, power) - target.barrier;
      target.barrier += amount; events.push({ type: 'barrier', sourceId: hero.id, targetId: target.id, amount, text: 'Added barrier.' });
      if (hasCap(data, hero.id, 'wardreflect')) target.reflect = { heroId: hero.id, amount: capAmount(data, hero.id, 'wardreflect') };
      break;
    }
    case 'heal': {
      heal(command.targetId, skill.power);
      // Priest talents: a small barrier, a half heal for the most hurt other ally, and solace on the target.
      const shield = talentRule(data, hero.id, 'healBarrier'); const target = state.heroes.find(h => h.id === command.targetId)!;
      if (shield > target.barrier) { events.push({ type: 'barrier', sourceId: hero.id, targetId: target.id, amount: shield - target.barrier, text: 'Added barrier.' }); target.barrier = shield; }
      if (hasCap(data, hero.id, 'twinheal')) {
        const ratio = (h: HeroState) => h.hp / data.heroes.find(d => d.id === h.id)!.maxHp;
        const other = state.heroes.filter(h => h.hp > 0 && h.id !== target.id && ratio(h) < 1).reduce<HeroState | undefined>((low, h) => !low || ratio(h) < ratio(low) ? h : low, undefined);
        if (other) heal(other.id, Math.floor(skill.power / 2));
      }
      if (hasCap(data, hero.id, 'solace')) state.solace = { heroId: hero.id, targetId: target.id };
      break;
    }
    case 'prayer': for (const h of state.heroes) heal(h.id, skill.power); break;
  }
  const cooldown = command.action === 'volley' && hasPassive(data, hero.id, 'tailwind') || command.action === 'haste' && hasCap(data, hero.id, 'quickbrew') ? skill.cooldown - 1 : skill.cooldown;
  // Star-veil set (4 pieces): the battle's first skill with a cooldown is ready again at once.
  const free = !!cooldown && !!hero.gear?.freeCast && !state.freeCast?.includes(hero.id);
  if (free) state.freeCast = [...state.freeCast ?? [], hero.id];
  else if (cooldown) actor.cooldowns[command.action] = state.round + cooldown;
  // Duelist relentless (talent): downing an enemy readies her precision strike again.
  if (hasCap(data, hero.id, 'relentless') && livingBefore.some(id => state.enemies.find(e => e.id === id)!.hp <= 0)) delete actor.cooldowns.execute;
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
