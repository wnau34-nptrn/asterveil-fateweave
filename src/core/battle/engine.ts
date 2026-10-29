import type { SongId, BossPhase, IntentDefinition, EnemyTrait, HeroGear, ActionId, BattleEntry, GearSpecial, HeroDefinition, PassiveId, TalentCap, TalentRule, HeroState, EnemyState, BattleEvent, BattleState, Command, EncounterDefinition, Intent, Resolution, TargetOption, TurnSlot, TurnStage } from './types';

const living = (state: BattleState, id: string) => [...state.heroes, ...state.enemies].some(a => a.id === id && a.hp > 0);
const definitions = (data: EncounterDefinition) => [...data.heroes, ...data.enemies];
// A hero revived this round stands but acts only from the next round.
const acts = (state: BattleState, id: string) => living(state, id) && state.heroes.find(h => h.id === id)?.revivedRound !== state.round;
export function roundOrder(state: BattleState, data: EncounterDefinition, round = state.round): string[] {
  // Explicit original index breaks SPD ties, including ties across the two sides.
  // Enemies delayed for this round (archer's hindering shot) act after everyone else.
  // Heroes hasted for this round (alchemist's tonic) act before everyone else.
  const tier = (id: string) => state.enemies.some(e => e.id === id && (e.delayedRound === round || e.delayedAlso === round)) ? 1 : state.heroes.some(h => h.id === id && h.hastedRound === round) ? -1 : 0;
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
export const guardReductionOf = (data: EncounterDefinition, heroId: string | undefined): number => fraction(data.rules.guardReduction + talentRule(data, heroId, 'guardReduction') - capAmount(data, heroId, 'twoguard') / 100 + levelPoints(data, heroId, 'guard') / 100);
export const rallyReductionOf = (data: EncounterDefinition, heroId: string | undefined): number => fraction(data.rules.rallyReduction + levelPoints(data, heroId, 'rally') / 100);
// ---- Skill levels (tomes, save v37, docs/design/SKILL_TOMES_TH.md) ----
// A skill with power grows by a percent per level; a percent skill by points; a skill without numbers shields its user.
export type SkillLevelKind = 'power' | 'percent' | 'utility';
const PERCENT_LEVELS: readonly ActionId[] = ['guard', 'rally', 'bulwark', 'halo', 'smoke', 'fury', 'stonearmor', 'guardstone', 'dread'];
export const skillLevelKind = (data: EncounterDefinition, action: ActionId): SkillLevelKind =>
  PERCENT_LEVELS.includes(action) ? 'percent' : action === 'revive' || data.skills[action].power <= 0 ? 'utility' : 'power';
export const skillLevel = (data: EncounterDefinition, heroId: string | undefined, action: ActionId): number =>
  Math.min(5, Math.max(1, (heroId ? data.heroes.find(h => h.id === heroId)?.skillLevels?.[action] : undefined) ?? 1));
// Steps above Lv1; a mastered (Lv5) skill with a cooldown of 3 or more spends its last step on one round less instead.
export function skillLevelSteps(data: EncounterDefinition, heroId: string | undefined, action: ActionId): { steps: number; cooldown: number } {
  const level = skillLevel(data, heroId, action); const master = level >= 5 && data.skills[action].cooldown >= 3;
  return { steps: master ? 3 : level - 1, cooldown: master ? 1 : 0 };
}
export function skillCooldown(data: EncounterDefinition, heroId: string | undefined, action: ActionId): number {
  let cooldown = data.skills[action].cooldown - skillLevelSteps(data, heroId, action).cooldown;
  if (action === 'cadence') cooldown -= capAmount(data, heroId, 'dancerCadenceQuick');
  if (action === 'duet') cooldown -= capAmount(data, heroId, 'dancerDuetQuick');
  if (action === 'deepbeat' && hasCap(data, heroId, 'dancerDeep')) cooldown++;
  if (action === 'lastlight' && hasCap(data, heroId, 'lastlightRatio')) cooldown++;
  return Math.max(0, cooldown);
}
function levelPoints(data: EncounterDefinition, heroId: string | undefined, action: ActionId): number {
  return skillLevelKind(data, action) === 'percent' ? skillLevelSteps(data, heroId, action).steps * data.rules.skillLevel.percentPoints : 0;
}
export const levelBarrier = (data: EncounterDefinition, heroId: string | undefined, action: ActionId): number =>
  skillLevelKind(data, action) === 'utility' ? skillLevelSteps(data, heroId, action).steps * data.rules.skillLevel.barrier : 0;
// Knight endless counter (A6 capstone): every guarded hit is answered with the cap plus a share of his Attack.
export const GUARD_COUNTER_ATTACK = 0.2;
export const guardCounterPower = (data: EncounterDefinition, heroId: string): number =>
  capAmount(data, heroId, 'guardcounter') + Math.round((data.heroes.find(h => h.id === heroId)?.attack ?? 0) * GUARD_COUNTER_ATTACK);
export const tauntReductionOf = (data: EncounterDefinition, heroId: string | undefined): number =>
  fraction((hasPassive(data, heroId, 'stoneskin') ? data.rules.stoneskinReduction : data.rules.tauntReduction) + talentRule(data, heroId, 'tauntReduction'));
// Corrode grows with the alchemist's Support (docs/STATS_DESIGN.md: Acid Flask "Attack / Support"); talents add flat.
export const corrodeBonusOf = (data: EncounterDefinition, heroId: string | undefined): number =>
  Math.round(data.rules.corrodeBonus * (100 + (data.heroes.find(h => h.id === heroId)?.skillBonus ?? 0)) / 100) + talentRule(data, heroId, 'corrodeBonus');
export const ambushBonusOf = (data: EncounterDefinition, heroId: string | undefined): number => data.rules.ambushBonus + talentRule(data, heroId, 'ambushBonus');
// Every hero hit adds the target's corrosion and the bard's song of valor while it plays.
export const hitBonus = (state: BattleState, data: EncounterDefinition, enemyId: string): number =>
  corrodeBonus(state, data, enemyId) + (state.song?.action === 'valor' ? songPower(data, state.song.heroId, 'valor') : 0);
// ★5 passives are read from the deployed hero definition (world `starred`).
export const hasPassive = (data: EncounterDefinition, heroId: string | undefined, passive: PassiveId): boolean =>
  !!heroId && data.heroes.find(h => h.id === heroId)?.passive === passive;
// A bard's song (resound ★5 makes it stronger). The song of dread is a percent cut to every enemy move.
export function songPower(data: EncounterDefinition, heroId: string, action: SongId): number {
  const power = skillPower(data, heroId, action);
  return hasPassive(data, heroId, 'resound') ? Math.round(power * (1 + data.rules.resound)) : power;
}
// Who acts on which target: the UI and the resolver share these groups.
export type TargetKind = 'self' | 'ally' | 'party' | 'enemies' | 'enemy';
export function targetKind(action: ActionId): TargetKind {
  if (action === 'prayer' || action === 'aegis' || action === 'rounddance') return 'party';
  if (['volley', 'bomb', 'sweep', 'storm', 'pin', 'knives', 'tremor', 'quake', 'saintarc'].includes(action)) return 'enemies';
  if (['brace', 'evade', 'taunt', 'valor', 'mend', 'rally', 'spearwall', 'finale', 'bulwark', 'parry', 'halo', 'hold', 'warcry', 'dread', 'stonearmor', 'rouse'].includes(action)) return 'self';
  if (['guard', 'ward', 'heal', 'haste', 'sanctuary', 'bless', 'revive', 'fury', 'decoy', 'guardstone', 'solo', 'cadence', 'duet', 'deepbeat', 'closingstep'].includes(action)) return 'ally';
  return 'enemy';
}
// Front-row foes screen the back row (owner 2026-10-22): while a front foe stands, a front-lane hero's single-target
// move reaches only the front row unless it is a reach skill; back-lane heroes reach every foe and area moves hit all.
// A mage's piercing bolt (tree modifier) also reaches, and an archer's pinning volley stops the screen for a while.
export const REACH_SKILLS: readonly ActionId[] = ['pierce', 'mark', 'backstab', 'challenge', 'lunge'];
export const ENEMY_SLOTS = ['f1', 'f2', 'b1', 'b2'] as const;
export function screened(state: BattleState, data: EncounterDefinition, heroId: string, action: ActionId, enemyId: string): boolean {
  const hero = data.heroes.find(h => h.id === heroId);
  if (!hero || hero.lane === 'back' || REACH_SKILLS.includes(action) || data.enemies.find(e => e.id === enemyId)?.row !== 'back') return false;
  if ((action === 'bolt' && hasCap(data, heroId, 'piercebolt')) || (state.pinned ?? 0) >= state.round) return false;
  return state.enemies.some(e => e.hp > 0 && data.enemies.find(d => d.id === e.id)?.row === 'front');
}
// Content check: 1–4 foes in distinct slots, at most two per row, each row matching its slot, every foe with a move.
export function encounterProblems(data: EncounterDefinition): string[] {
  const problems: string[] = []; const ids = data.enemies.map(e => e.id);
  if (!ids.length || ids.length > 4) problems.push(`${data.id}: ${ids.length} foes`);
  if (new Set(ids).size !== ids.length) problems.push(`${data.id}: repeated slot`);
  for (const e of data.enemies) {
    if (!ENEMY_SLOTS.includes(e.id) || e.row !== (e.id.startsWith('f') ? 'front' : 'back')) problems.push(`${data.id}: ${e.id} row ${e.row}`);
    if (!data.intents.some(i => i.sourceId === e.id)) problems.push(`${data.id}: ${e.id} has no move`);
  }
  for (const i of data.intents) if (!ids.includes(i.sourceId as never)) problems.push(`${data.id}: move from missing ${i.sourceId}`);
  // Phases belong to a boss; they summon only reserves, and reserves come only from a phase.
  for (const p of data.phases ?? []) {
    if (!data.enemies.find(e => e.id === p.sourceId)?.boss) problems.push(`${data.id}: phase on a non-boss ${p.sourceId}`);
    for (const slot of [...p.summon ?? [], ...p.hardSummon ?? []]) if (!data.enemies.find(e => e.id === slot)?.reserve) problems.push(`${data.id}: summons non-reserve ${slot}`);
  }
  for (const e of data.enemies.filter(x => x.reserve)) if (!(data.phases ?? []).some(p => [...p.summon ?? [], ...p.hardSummon ?? []].includes(e.id))) problems.push(`${data.id}: reserve ${e.id} is never summoned`);
  if (!data.enemies.some(e => !e.reserve)) problems.push(`${data.id}: no foe on the field`);
  return problems;
}
// Bosses resist control (owner 2026-10-22): a boss (`boss`) whose turn was cancelled is steadfast for its next two rounds,
// and an `unstoppable` signature move can never be cancelled. Bash and Sigil still deal their damage.
export function interruptBlock(state: BattleState, data: EncounterDefinition, enemyId: string, intent: Intent | null | undefined): '' | 'steadfast' | 'unstoppable' {
  if (!intent) return '';
  if (intent.unstoppable) return 'unstoppable';
  return data.enemies.find(e => e.id === enemyId)?.boss && intent.round <= (state.enemies.find(e => e.id === enemyId)?.steadyRound ?? 0) ? 'steadfast' : '';
}
export const STEADFAST_ROUNDS = 2;
const resistEvent = (heroId: string, enemyId: string, why: 'steadfast' | 'unstoppable'): BattleEvent =>
  ({ type: 'resist', sourceId: heroId, targetId: enemyId, text: why === 'unstoppable' ? 'Unstoppable move.' : 'Steadfast boss.' });
// A scout's ambush strikes harder at an enemy that still has its turn ahead in the current round.
export const ambushBonus = (state: BattleState, data: EncounterDefinition, enemyId: string, heroId?: string): number =>
  state.order.indexOf(enemyId) > state.turnIndex ? ambushBonusOf(data, heroId) : 0;
// Magical damage and support use Magic Power (legacy field `skillBonus`); physical damage uses
// Attack (`damageBonus`). Flat talent bonuses and skill levels keep their existing order.
export const SUPPORT_SKILLS: readonly ActionId[] = ['ward', 'heal', 'prayer', 'valor', 'mend', 'bless', 'aegis'];
export const MAGIC_DAMAGE_SKILLS: readonly ActionId[] = ['bolt', 'sigil', 'storm', 'dispel', 'acid', 'bomb', 'catalyst', 'finale', 'note'];
export const usesMagicPower = (action: ActionId): boolean => SUPPORT_SKILLS.includes(action) || MAGIC_DAMAGE_SKILLS.includes(action);
// Percent skills (bulwark, halo, blessing, war cry, revive): their power is a percent that only talents raise.
export const PERCENT_SKILLS: readonly ActionId[] = ['bulwark', 'halo', 'revive', 'smoke', 'fury', 'stonearmor', 'guardstone', 'dread'];
export function skillPower(data: EncounterDefinition, heroId: string, action: ActionId): number {
  const hero = data.heroes.find(h => h.id === heroId);
  // Skill levels: a percent skill gains points, a skill with power a percent on top of its Attack/Support bonus.
  if (PERCENT_SKILLS.includes(action)) return data.skills[action].power + (hero?.talents?.power?.[action] ?? 0) + levelPoints(data, heroId, action);
  const bonus = (usesMagicPower(action) ? hero?.skillBonus : hero?.damageBonus) ?? 0;
  const level = skillLevelKind(data, action) === 'power' ? skillLevelSteps(data, heroId, action).steps * data.rules.skillLevel.powerPercent : 0;
  return Math.max(0, Math.round(data.skills[action].power * (100 + bonus + level) / 100) + (hero?.talents?.power?.[action] ?? 0) - (action === 'lastlight' && hasCap(data, heroId, 'metta4') ? 4 : 0));
}
export const finaleHealPower = (data: EncounterDefinition, heroId: string): number =>
  Math.round(data.rules.finaleHeal * (100 + (data.heroes.find(h => h.id === heroId)?.skillBonus ?? 0) + skillLevelSteps(data, heroId, 'finale').steps * data.rules.skillLevel.powerPercent) / 100);
// Extra damage a hero's own hits gain from its capstones (duelist deep mark, archer hunter) and mark-hunter gear.
export function talentHitBonus(state: BattleState, data: EncounterDefinition, heroId: string, enemy: EnemyState): number {
  const marked = enemy.markedUntil > state.round;
  const fresh = state.order.indexOf(enemy.id) > state.turnIndex ? data.heroes.find(h => h.id === heroId)?.gear?.freshHit ?? 0 : 0;
  return (marked ? capAmount(data, heroId, 'deepmark') + (hasGear(data, heroId, 'markhunter') ? GEAR_MARK_HUNTER : 0) : 0)
    + (isDelayed(enemy, state.round) ? capAmount(data, heroId, 'hunter') : 0) + fresh + (marked ? sharedMark(state, data, heroId) : 0)
    // Scout opportunist (capstone): her hits on a foe still to act this round.
    + (state.order.indexOf(enemy.id) > state.turnIndex ? capAmount(data, heroId, 'opportunist') : 0);
}
// ---- Recruit big trees (owner 2026-10-23, docs/design/SKILL_TREES_ALL_TH.md, draft numbers) ----
// Catalyst: per corroded round left; disarm: a physical next move is cut; tremor: every front foe's next move is cut;
// guardian stone heals the warden when it holds; a finale of dread shields allies; solo triples the song.
export const CATALYST_PER_ROUND = 8; export const DISARM_MULTIPLIER = 1.6;
export const NOTE_PER_ROUND = 3; export const NOTE_MAX_ROUNDS = 3;
export const isDelayed = (enemy: EnemyState, round: number): boolean => Math.max(enemy.delayedRound ?? 0, enemy.delayedAlso ?? 0) >= round;
export const GUARD_STONE_HEAL = 6; export const DREAD_FINALE = 10; export const SOLO_TIMES = 3; export const FURY_EXPOSED = 10;
// Alchemist chain reaction (capstone): a corroded foe that falls passes its corrosion to another standing foe of its row
// (else any other standing foe).
function chainReaction(state: BattleState, data: EncounterDefinition, foe: EnemyState, events: BattleEvent[]): void {
  if (foe.hp > 0 || (foe.corrodedUntil ?? 0) <= state.round) return;
  const alchemist = data.heroes.find(h => hasCap(data, h.id, 'chainreaction') && living(state, h.id)); if (!alchemist) return;
  const others = state.enemies.filter(e => e.hp > 0 && e.id !== foe.id); const row = (id: string) => data.enemies.find(e => e.id === id)?.row;
  const next = others.find(e => row(e.id) === row(foe.id)) ?? others[0]; if (!next) return;
  next.corrodedUntil = Math.max(next.corrodedUntil ?? 0, foe.corrodedUntil!); next.corrodeBonus = Math.max(next.corrodeBonus ?? 0, foe.corrodeBonus ?? data.rules.corrodeBonus);
  delete foe.corrodedUntil; delete foe.corrodeBonus;
  events.push({ type: 'corrode', sourceId: alchemist.id, targetId: next.id, amount: next.corrodeBonus, text: 'Chain reaction.' });
}
// Duelist shared mark (tree modifier): allies' hits on a marked foe gain her bonus.
const sharedMark = (state: BattleState, data: EncounterDefinition, heroId: string): number =>
  data.heroes.filter(h => h.id !== heroId && living(state, h.id)).reduce((n, h) => Math.max(n, capAmount(data, h.id, 'sharedmark')), 0);
// Duelist parry: the first physical hit taken until her next turn is cut by this share and answered with its power.
export const PARRY_REDUCTION = 0.5;
// A cooldown counted down by one round (spear fury, endless dance).
function shorten(hero: HeroState | undefined, action: ActionId, round: number): void {
  const at = hero?.cooldowns[action]; if (at === undefined) return;
  if (at - 1 <= round) delete hero!.cooldowns[action]; else hero!.cooldowns[action] = at - 1;
}
// C12: cooldowns are absolute rounds. Only equipped, still-cooling non-dance skills qualify.
export const DANCE_SKILLS: readonly ActionId[] = ['cadence', 'duet', 'rounddance', 'deepbeat', 'echofoot', 'closingstep'];
export function cooldownTargets(state: BattleState, data: EncounterDefinition, heroId: string): ActionId[] {
  const actor = state.heroes.find(h => h.id === heroId); const def = data.heroes.find(h => h.id === heroId);
  if (!actor || actor.hp <= 0 || !def) return [];
  return def.actions.filter(a => a !== 'attack' && !DANCE_SKILLS.includes(a) && (actor.cooldowns[a] ?? 0) > state.round)
    .sort((a, b) => actor.cooldowns[b]! - actor.cooldowns[a]! || def.actions.indexOf(a) - def.actions.indexOf(b));
}
function danceAllies(state: BattleState, data: EncounterDefinition, heroId: string): HeroState[] {
  const total = (h: HeroState) => cooldownTargets(state, data, h.id).reduce((n, a) => n + h.cooldowns[a]! - state.round, 0);
  return state.heroes.filter(h => h.id !== heroId && h.hp > 0 && cooldownTargets(state, data, h.id).length)
    .sort((a, b) => total(b) - total(a));
}
// Explicit spell overrides do not gain the base-only conversion cap a second time.
export function saintRatioOf(data: EncounterDefinition, heroId: string, action: ActionId = 'attack'): number {
  if (action === 'communion') return 50 + capAmount(data, heroId, 'communionRatio') + capAmount(data, heroId, 'metta1');
  if (action === 'lastlight' && hasCap(data, heroId, 'metta4')) return capAmount(data, heroId, 'metta4');
  if (action === 'lastlight' && hasCap(data, heroId, 'lastlightRatio')) return capAmount(data, heroId, 'lastlightRatio');
  return 30 + capAmount(data, heroId, 'saintRatio');
}

// ---- Equipment (2D-2) ----
export const GEAR_MARK_HUNTER = 8; export const GEAR_RENEWAL = 4;
export const hasGear = (data: EncounterDefinition, heroId: string | undefined, special: GearSpecial): boolean =>
  !!heroId && !!data.heroes.find(h => h.id === heroId)?.gear?.specials?.includes(special);

export function bossPowerReady(state:BattleState,data:EncounterDefinition,heroId:string,power:NonNullable<HeroGear['boss']>['power']):number {
  const gear=data.heroes.find(h=>h.id===heroId)?.gear?.boss,actor=state.heroes.find(h=>h.id===heroId);
  return actor&&actor.hp>0&&actor.bossUsedRound!==state.round&&gear?.power===power?gear.amount:0;
}
function bossBarrier(state:BattleState,data:EncounterDefinition,ownerId:string,targetId:string,power:'aegis'|'lantern',events:BattleEvent[]):void {
  const amount=bossPowerReady(state,data,ownerId,power),target=state.heroes.find(h=>h.id===targetId);
  if(!amount||!target||target.hp<=0)return;
  state.heroes.find(h=>h.id===ownerId)!.bossUsedRound=state.round;
  const added=Math.max(target.barrier,amount)-target.barrier;target.barrier+=added;
  if(added)events.push({type:'barrier',sourceId:ownerId,targetId,amount:added,text:power==='aegis'?'ตราพิทักษ์ผู้คุมมอบโล่หลังรับการโจมตี':'ประทีปผนึกมอบโล่หลังรักษาเพื่อน'});
}
// Healing cast by this hero, raised by its equipment's heal bonus.
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
// A10 map tuning: a copy whose foes have `percent` of their HP and move damage (the encounter content stays the base).
export function withStrength(data: EncounterDefinition, percent: number): EncounterDefinition {
  if (percent === 100) return data;
  const scale = (n: number) => n && Math.max(1, Math.round(n * percent / 100));
  return { ...data, enemies: data.enemies.map(e => ({ ...e, maxHp: scale(e.maxHp) })), intents: data.intents.map(i => ({ ...i, damage: scale(i.damage) })) };
}
export function upcomingTurns(state: BattleState, data: EncounterDefinition, count = 6): TurnSlot[] {
  if (state.outcome !== 'active') return [];
  const slots: TurnSlot[] = [];
  for (let round = state.round; slots.length < count; round++) {
    const order = round === state.round ? state.order.slice(state.turnIndex) : roundOrder(state, data, round);
    if (!order.length) break;
    for (const id of order) {
      if (round === state.round ? !acts(state, id) : !living(state, id)) continue;
      const def = definitions(data).find(a => a.id === id)!;
      slots.push({ actorId: id, side: data.heroes.some(h => h.id === id) ? 'hero' : 'enemy', round, speed: def.speed });
      if (slots.length === count) break;
    }
  }
  return slots;
}
// A warden's taunt covers enemy turns from the cast until the warden's own next turn, so forecasts
// for later turns already show the original targets again.
function taunted(state: BattleState, data: EncounterDefinition, enemyId: string, round: number, t: { heroId: string; round: number } | null | undefined = state.taunt): string | undefined {
  if (!t || !living(state, t.heroId)) return undefined;
  if (round === t.round) return t.heroId;
  if (round !== t.round + 1) return undefined;
  const order = round === state.round ? state.order : roundOrder(state, data, round);
  return order.indexOf(enemyId) < order.indexOf(t.heroId) ? t.heroId : undefined;
}
// Boss phases (owner 2026-10-22): the next phase whose HP threshold the boss has reached, still to begin.
export function pendingPhase(state: BattleState, data: EncounterDefinition, id: string): BossPhase | undefined {
  const foe = state.enemies.find(e => e.id === id); const def = data.enemies.find(e => e.id === id);
  const next = data.phases?.filter(p => p.sourceId === id)[foe?.phase ?? 0];
  return foe && def && next && foe.hp > 0 && foe.hp * 100 <= def.maxHp * next.below ? next : undefined;
}
// The move cycle a foe uses now: its current phase's moves (a phase without moves of its own keeps the latest earlier
// cycle). The cycle counts from the round after the phase began.
export function phaseMoves(state: BattleState, data: EncounterDefinition, id: string): IntentDefinition[] {
  let p = state.enemies.find(e => e.id === id)?.phase ?? 0;
  while (p > 0 && !data.intents.some(i => i.sourceId === id && (i.phase ?? 0) === p)) p--;
  return data.intents.filter(i => i.sourceId === id && (i.phase ?? 0) === p);
}
export function enemyIntent(state: BattleState, data: EncounterDefinition, id: string, round: number): Intent | null {
  const foe = state.enemies.find(e => e.id === id);
  if (!foe || !living(state, id)) return null;
  const alive = state.heroes.filter(h => h.hp > 0);
  // A reached phase takes the boss's next turn: it summons and changes its moves instead of attacking. It cannot be
  // cancelled; it names no real target (the first standing hero only keeps the intent shape).
  const phase = pendingPhase(state, data, id);
  if (phase) return alive[0] ? { sourceId: id, targetSlot: 0, name: phase.name, damage: 0, kind: 'energy', unstoppable: true, special: 'phase', targetId: alive[0].id, beat: state.beat, round } : null;
  // Each phase's moves cycle from the round after the phase began (the opening cycle from round 1).
  const moves = phaseMoves(state, data, id);
  const template = moves[((round - (foe.phaseRound ?? 0) - 1) % moves.length + moves.length) % moves.length];
  if (!template) return null;
  const front = alive.filter(h => data.heroes.find(d => d.id === h.id)!.lane === 'front');
  const allowed = template.kind === 'physical' && front.length ? front : alive;
  const target = allowed.find(h => h.id === data.heroes[template.targetSlot]?.id) ?? allowed[0];
  const warden = taunted(state, data, id, round);
  const c = state.challenge; const duel = c && c.enemyId === id && c.round === round && living(state, c.heroId) ? c.heroId : undefined;
  if (!target) return null;
  const drawn = !warden && !duel ? taunted(state, data, id, round, foe.drawnBy) : undefined;
  const stoned = !warden && !duel && !drawn && !template.all && !template.charge && state.stone?.ids.includes(target.id)
    ? taunted(state, data, id, round, state.stone) : undefined;
  return { ...template, targetId: warden ?? duel ?? drawn ?? stoned ?? target.id, beat: state.beat, round, ...(stoned ? { stoned: true, stoneTargetId: target.id } : {}) };
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
// The battle is won when every foe is down, or, in a boss fight with phases, the moment every boss falls: its minions
// flee (owner 2026-10-22). Mini-bosses and elites (no phases) are won only by downing every foe.
function settled(state: BattleState, data: EncounterDefinition, events: BattleEvent[]): boolean {
  const bosses = data.phases?.length ? data.enemies.filter(e => e.boss) : [];
  if (state.enemies.every(e => e.hp <= 0) || (bosses.length && bosses.every(b => state.enemies.find(e => e.id === b.id)!.hp <= 0))) state.outcome = 'victory';
  else if (state.heroes.every(h => h.hp <= 0)) state.outcome = 'defeat';
  if (state.outcome === 'active') return false;
  state.intent = null; state.guard = null; state.counter = null; state.taunt = null; state.song = null; state.rally = null; state.sanctuary = null; state.solace = null;
  if (state.challenge) state.challenge = null; if (state.bulwark) state.bulwark = null; if (state.warcry) state.warcry = null;
  if (state.parry) state.parry = null; if (state.halo) state.halo = null; if (state.hold) state.hold = null; if (state.prayerEcho) state.prayerEcho = null; if (state.tracking) delete state.tracking;
  if (state.stone) state.stone = null;
  events.push({ type: 'outcome', text: state.outcome }); return true;
}
// Archer tracking shots fire again as their round ends, on a target still standing.
function trackingShots(state: BattleState, data: EncounterDefinition, events: BattleEvent[]): void {
  const due = state.tracking?.filter(t => t.round === state.round) ?? []; if (!state.tracking) return;
  state.tracking = state.tracking.filter(t => t.round > state.round); if (!state.tracking.length) delete state.tracking;
  for (const t of due) {
    const foe = state.enemies.find(e => e.id === t.enemyId);
    if (foe && foe.hp > 0 && living(state, t.heroId)) strikeBack(state, data, t.heroId, foe, t.power, events, 'Tracking shot.');
  }
}
function finishOrAdvance(state: BattleState, data: EncounterDefinition, events: BattleEvent[]): void {
  if (settled(state, data, events)) return;
  state.beat++;
  do {
    state.turnIndex++;
    if (state.turnIndex >= state.order.length) {
      trackingShots(state, data, events); if (settled(state, data, events)) return;
      state.round++; state.order = roundOrder(state, data); state.turnIndex = 0;
      // A priest's long prayer (or dawn) heals every standing ally again as its round begins.
      const echo = state.prayerEcho;
      if (echo && echo.round === state.round) {
        state.prayerEcho = null;
        if (living(state, echo.heroId)) for (const h of state.heroes) {
          const amount = h.hp > 0 ? Math.min(echo.amount, data.heroes.find(d => d.id === h.id)!.maxHp - h.hp) : 0;
          if (amount) { h.hp += amount; events.push({ type: 'heal', sourceId: echo.heroId, targetId: h.id, amount, text: 'The prayer lingers.' }); }
        }
      }
      for (const h of state.heroes) if (h.renew) {
        const renew = h.renew;
        if (h.hp > 0 && renew.until >= state.round && living(state, renew.heroId)) {
          const amount = Math.min(renew.amount, data.heroes.find(d => d.id === h.id)!.maxHp - h.hp);
          if (amount) { h.hp += amount; events.push({ type: 'heal', sourceId: renew.heroId, targetId: h.id, amount, text: 'Renew.' }); }
        }
        if (renew.until <= state.round || h.hp <= 0 || !living(state, renew.heroId)) delete h.renew;
      }
      for (const e of state.enemies) if (e.markedUntil <= state.round) e.markedUntil = 0;
      // A song of mending heals every standing ally as each new round begins.
      if (state.song?.action === 'mend' && living(state, state.song.heroId)) {
        const power = songPower(data, state.song.heroId, 'mend');
        for (const h of state.heroes) {
          // A bard's solo gives that ally the song three times over.
          const times = (h.solo?.round ?? 0) >= state.round ? SOLO_TIMES : 1;
          const amount = h.hp > 0 ? Math.min(power * times, data.heroes.find(d => d.id === h.id)!.maxHp - h.hp) : 0;
          if (amount) { h.hp += amount; events.push({ type: 'heal', sourceId: state.song.heroId, targetId: h.id, amount, text: 'The song mends the party.' }); }
        }
      }
    }
  } while (!acts(state, state.order[state.turnIndex]!));
  if (state.guard && (!living(state, state.guard.heroId) || (!state.guard.all && !living(state, state.guard.sourceId)) || currentActorId(state) === state.guard.heroId)) state.guard = null;
  if (state.counter && (!living(state, state.counter.heroId) || currentActorId(state) === state.counter.heroId)) state.counter = null;
  if (state.taunt && (!living(state, state.taunt.heroId) || currentActorId(state) === state.taunt.heroId)) state.taunt = null;
  if (state.song && !living(state, state.song.heroId)) state.song = null;
  if (state.rally && (!living(state, state.rally.heroId) || currentActorId(state) === state.rally.heroId)) state.rally = null;
  if (state.sanctuary && (!living(state, state.sanctuary.heroId) || currentActorId(state) === state.sanctuary.heroId)) state.sanctuary = null;
  if (state.solace && (!living(state, state.solace.heroId) || currentActorId(state) === state.solace.heroId)) state.solace = null;
  if (state.parry && (!living(state, state.parry.heroId) || currentActorId(state) === state.parry.heroId)) state.parry = null;
  if (state.halo && (!living(state, state.halo.heroId) || currentActorId(state) === state.halo.heroId)) state.halo = null;
  if (state.hold && (!living(state, state.hold.heroId) || currentActorId(state) === state.hold.heroId)) state.hold = null;
  if (state.bulwark && (!living(state, state.bulwark.heroId) || currentActorId(state) === state.bulwark.heroId)) state.bulwark = null;
  if (state.warcry && (!living(state, state.warcry.heroId) || currentActorId(state) === state.warcry.heroId)) state.warcry = null;
  if (state.stone && (!living(state, state.stone.heroId) || currentActorId(state) === state.stone.heroId)) state.stone = null;
  if (state.challenge && (!living(state, state.challenge.heroId) || !living(state, state.challenge.enemyId) || state.round > state.challenge.round)) state.challenge = null;
  for (const h of state.heroes) if (h.evading && (h.hp <= 0 || currentActorId(state) === (h.evadeBy ?? h.id) || !!h.evadeBy && !living(state, h.evadeBy))) { delete h.evading; delete h.evadeBy; delete h.evadeExtra; delete h.evadePhysical; }
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
// Stats step 2: Armour (physical) and Resistance (energy) cut a hit taken by a percent, capped by the rules.
export const defenseOf = (data: EncounterDefinition, heroId: string, kind: Intent['kind']): number =>
  Math.min(data.rules.defenseCap, (kind === 'physical' ? data.heroes.find(h => h.id === heroId)?.armour : data.heroes.find(h => h.id === heroId)?.resist) ?? 0);
// Leech: a standing hero heals by a share of the damage its own hit dealt (rounded down, never above max HP).
function leech(state: BattleState, data: EncounterDefinition, heroId: string, dealt: number, events: BattleEvent[]): void {
  const def = data.heroes.find(h => h.id === heroId); const hero = state.heroes.find(h => h.id === heroId);
  const amount = def && hero && hero.hp > 0 ? Math.min(Math.floor(dealt * Math.min(data.rules.leechCap, def.leech ?? 0) / 100), def.maxHp - hero.hp) : 0;
  if (amount > 0) { hero!.hp += amount; events.push({ type: 'heal', sourceId: heroId, targetId: heroId, amount, text: 'Leech.' }); }
}
// Hard-mode traits (A9). A veilguarded foe takes less unless it is marked or corroded.
const hasTrait = (data: EncounterDefinition, enemyId: string, trait: EnemyTrait): boolean => !!data.enemies.find(e => e.id === enemyId)?.traits?.includes(trait);
function veiled(state: BattleState, data: EncounterDefinition, enemy: EnemyState, raw: number): number {
  const t = data.rules.traits; if (!t || !hasTrait(data, enemy.id, 'veilguard') || (enemy.dispelledUntil ?? 0) > state.round) return raw;
  return enemy.markedUntil > state.round || (enemy.corrodedUntil ?? 0) > state.round ? raw : Math.ceil(raw * (1 - t.veilguardPercent / 100));
}
// A thorned foe answers each hero hit that damaged it; thorns never take the hero below 1 HP.
function thorned(state: BattleState, data: EncounterDefinition, enemy: EnemyState, heroId: string, dealt: number, events: BattleEvent[]): void {
  const t = data.rules.traits; const hero = state.heroes.find(h => h.id === heroId);
  if (!t || !dealt || !hero || hero.hp <= 1 || !hasTrait(data, enemy.id, 'thorns')) return;
  const back = Math.min(hero.hp - 1, Math.max(1, Math.floor(dealt * t.thornsPercent / 100))); hero.hp -= back;
  events.push({ type: 'damage', sourceId: enemy.id, targetId: heroId, amount: back, absorbed: 0, text: 'Thorns.' });
}
// An enraged foe below its HP share hits harder.
export function enraged(state: BattleState, data: EncounterDefinition, enemyId: string): boolean {
  const t = data.rules.traits; const e = state.enemies.find(x => x.id === enemyId); const def = data.enemies.find(x => x.id === enemyId);
  return !!t && !!e && !!def && hasTrait(data, enemyId, 'enrage') && e.hp > 0 && e.hp * 100 <= def.maxHp * t.enrageBelow;
}
function strikeBack(state: BattleState, data: EncounterDefinition, heroId: string, enemy: EnemyState, power: number, events: BattleEvent[], text: string): void {
  const dealt = Math.min(enemy.hp, veiled(state, data, enemy, power + hitBonus(state, data, enemy.id))); enemy.hp -= dealt;
  events.push({ type: 'counter', sourceId: heroId, targetId: enemy.id, amount: dealt, text });
  if (!enemy.hp) { events.push({ type: 'down', targetId: enemy.id, text: 'Enemy falls.' }); chainReaction(state, data, enemy, events); }
  leech(state, data, heroId, dealt, events);
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
    } else if (state.hold?.heroId === recipient.id && hasCap(data, recipient.id, 'unyielding') && !state.unyielding) {
      // Spear unyielding (capstone): the first downing hit while he holds the line leaves him at 1 HP.
      amount = recipient.hp - 1; state.unyielding = true; events.push({ type: 'stand', sourceId: recipient.id, targetId: recipient.id, text: 'Unyielding.' });
    } else if (hasGear(data, recipient.id, 'laststand') && !state.lastStand?.includes(recipient.id)) {
      amount = recipient.hp - 1; state.lastStand = [...state.lastStand ?? [], recipient.id];
      events.push({ type: 'stand', sourceId: recipient.id, targetId: recipient.id, text: 'Last stand keeps the hero at 1 HP.' });
    }
  }
  recipient.hp -= amount;
  events.push({ type: 'damage', sourceId: actorId, targetId: recipient.id, amount, absorbed, text: 'Enemy attacks on its own turn.' });
  if (!recipient.hp) {
    recipient.fell = true; events.push({ type: 'down', targetId: recipient.id, text: 'Hero falls.' });
    // Priest last prayer (capstone): the first ally to fall in a battle heals every other standing ally.
    const priest = state.lastPrayer ? undefined : data.heroes.find(h => hasCap(data, h.id, 'lastprayer') && living(state, h.id));
    if (priest) {
      state.lastPrayer = true;
      for (const h of state.heroes.filter(x => x.hp > 0)) {
        const amount = Math.min(capAmount(data, priest.id, 'lastprayer'), data.heroes.find(d => d.id === h.id)!.maxHp - h.hp);
        if (amount) { h.hp += amount; events.push({ type: 'heal', sourceId: priest.id, targetId: h.id, amount, text: 'Last prayer.' }); }
      }
    }
  }
  if(amount>0&&recipient.hp>0)bossBarrier(state,data,recipient.id,recipient.id,'aegis',events);
  if (reflect && living(state, reflect.heroId) && enemy.hp > 0) strikeBack(state, data, reflect.heroId, enemy, reflect.amount, events, 'The ward reflects the hit.');
  // Thorn set (4 pieces): a physical hit taken is answered.
  const thorns = data.heroes.find(h => h.id === recipient.id)!.gear?.thorns;
  if (thorns && intent.kind === 'physical' && enemy.hp > 0 && recipient.hp > 0) strikeBack(state, data, recipient.id, enemy, thorns, events, 'Thorns strike back.');
  // A guarding knight's counter and a taunting warden's hammer counter (talents).
  if (enemy.hp > 0 && protector === recipient.id && state.guard?.heroId === recipient.id && hasCap(data, recipient.id, 'guardcounter') && recipient.hp > 0)
    strikeBack(state, data, recipient.id, enemy, guardCounterPower(data, recipient.id), events, 'The knight counters.');
  if (enemy.hp > 0 && state.taunt?.heroId === recipient.id && hasCap(data, recipient.id, 'hammercounter') && recipient.hp > 0)
    strikeBack(state, data, recipient.id, enemy, capAmount(data, recipient.id, 'hammercounter'), events, 'The warden hammers back.');
  const holder = state.hold;
  if (holder && enemy.hp > 0 && intent.kind === 'physical' && living(state, holder.heroId) && data.heroes.find(h => h.id === recipient.id)!.lane === 'back') {
    const power = Math.round(skillPower(data, holder.heroId, 'brace') * (hasCap(data, holder.heroId, 'holdcounter') ? 1.5 : 1));
    strikeBack(state, data, holder.heroId, enemy, power, events, 'Held spear counters.'); spearFury(state, data, holder.heroId);
  }
  const cry = state.warcry;
  if (cry && cry.ids.includes(recipient.id) && intent.kind === 'physical' && living(state, cry.heroId)) {
    cry.ids.splice(cry.ids.indexOf(recipient.id), 1);
    if (recipient.hp > 0 && enemy.hp > 0) strikeBack(state, data, recipient.id, enemy, skillPower(data, cry.heroId, 'warcry'), events, 'War cry counter.');
  }
  // A braced spear answers the first physical hit on any front-lane ally while it stands; a spear wall answers every one.
  const brace = state.counter;
  if (brace && enemy.hp > 0 && intent.kind === 'physical' && living(state, brace.heroId) && data.heroes.find(h => h.id === recipient.id)!.lane === 'front') {
    const power = brace.wall ? skillPower(data, brace.heroId, 'spearwall')
      : Math.round(skillPower(data, brace.heroId, 'brace') * (hasPassive(data, brace.heroId, 'heavycounter') ? 1 + data.rules.heavyCounter : 1));
    strikeBack(state, data, brace.heroId, enemy, power, events, brace.wall ? 'Spear wall counters.' : 'Braced spear counters.');
    spearFury(state, data, brace.heroId);
    if (!brace.wall) state.counter = null;
  }
}
// Spear fury (capstone): each counter readies his piercing thrust one round sooner.
function spearFury(state: BattleState, data: EncounterDefinition, heroId: string): void {
  if (hasCap(data, heroId, 'spearfury')) shorten(state.heroes.find(h => h.id === heroId), 'pierce', state.round);
}
// A boss phase begins on the boss's own turn: it summons its waiting reserves into their slots (they join the queue
// next round) and its moves switch to the new phase's cycle.
function beginPhase(state: BattleState, data: EncounterDefinition, enemy: EnemyState, events: BattleEvent[]): void {
  const phase = pendingPhase(state, data, enemy.id); if (!phase) return;
  enemy.phase = (enemy.phase ?? 0) + 1; enemy.phaseRound = state.round;
  events.push({ type: 'phase', sourceId: enemy.id, targetId: enemy.id, text: phase.name });
  for (const slot of phase.summon ?? []) {
    const minion = state.enemies.find(e => e.id === slot); const def = data.enemies.find(e => e.id === slot);
    if (minion?.absent && def) { delete minion.absent; minion.hp = def.maxHp; events.push({ type: 'summon', sourceId: enemy.id, targetId: slot, text: 'Reinforcements.' }); }
  }
}
// A duelist's parry: the parried attacker is countered (marked with parry mark) and the parry is spent; endless dance
// readies her precision strike one round sooner.
function parried(state: BattleState, data: EncounterDefinition, enemy: EnemyState, duelist: HeroState, events: BattleEvent[]): void {
  state.parry = null; if (duelist.hp <= 0) return;
  events.push({ type: 'parry', sourceId: duelist.id, targetId: enemy.id, text: 'Parry.' });
  if (enemy.hp > 0) strikeBack(state, data, duelist.id, enemy, skillPower(data, duelist.id, 'parry'), events, 'The duelist ripostes.');
  if (enemy.hp > 0 && hasCap(data, duelist.id, 'parrymark')) { enemy.markedUntil = Math.max(enemy.markedUntil, state.round + data.rules.markDuration); events.push({ type: 'mark', sourceId: duelist.id, targetId: enemy.id, text: 'Enemy marked.' }); }
  if (hasCap(data, duelist.id, 'endlessdance')) shorten(duelist, 'execute', state.round);
}
function automaticTurns(state: BattleState, data: EncounterDefinition, turns: TurnStage[], presentation = false): void {
  while (state.outcome === 'active' && !currentHeroId(state, data)) {
    const actorId = currentActorId(state)!;
    const intent = enemyIntent(state, data, actorId, state.round);
    state.intent = intent;
    const before = presentation ? structuredClone(state) : undefined;
    const events: BattleEvent[] = [];
    const enemy = state.enemies.find(e => e.id === actorId)!;
    if (intent) {
      const g = state.guard; const guard = g && (g.sourceId === actorId || g.uses || g.all) && g.targetId === intent.targetId && living(state, g.heroId) ? g : null;
      // One enemy hit on one hero: a shadow step dodges it, otherwise reductions apply and it lands.
      const strike = (recipient: HeroState, guard: BattleState['guard']) => {
        // An archer's disengage dodges physical hits only.
        if (recipient.evading && !(recipient.evadePhysical && intent.kind !== 'physical')) {
          // A scout's shadow step: the whole hit misses, so nothing is absorbed and no counter triggers.
          if (recipient.evadeExtra) recipient.evadeExtra--; else { delete recipient.evading; delete recipient.evadeBy; delete recipient.evadePhysical; }
          events.push({ type: 'dodge', sourceId: actorId, targetId: recipient.id, amount: 0, text: 'The attack misses the evading scout.' });
          const mend = Math.min(talentRule(data, recipient.id, 'dodgeHeal'), data.heroes.find(h => h.id === recipient.id)!.maxHp - recipient.hp);
          if (mend > 0) { recipient.hp += mend; events.push({ type: 'heal', sourceId: recipient.id, targetId: recipient.id, amount: mend, text: 'The scout recovers after dodging.' }); }
          if (hasPassive(data, recipient.id, 'shadowcounter')) strikeBack(state, data, recipient.id, enemy, data.rules.shadowCounter, events, 'The scout strikes back from the shadows.');
        } else {
          // Reductions apply in order: Guard, a taunting warden (stoneskin ★5 is stronger), then a knight's rally.
          const strong = enraged(state, data, enemy.id) ? Math.ceil(intent.damage * (1 + data.rules.traits!.enragePercent / 100)) : intent.damage;
          // The alchemist's smoke weakens the foe's next move.
          const weakened = enemy.weaken ? Math.ceil(strong * (1 - enemy.weaken / 100)) : strong;
          // Recruit trees: a song of dread cuts every move; a fury tonic leaves its drinker exposed.
          const dread = state.song?.action === 'dread' && living(state, state.song.heroId) ? songPower(data, state.song.heroId, 'dread') : 0;
          const quiet = dread ? Math.ceil(weakened * (1 - dread / 100)) : weakened;
          const raw = (recipient.exposed?.round ?? 0) >= state.round ? Math.ceil(quiet * (1 + recipient.exposed!.percent / 100)) : quiet;
          let incoming = guard ? Math.ceil(raw * (1 - guardReductionOf(data, guard.heroId))) : raw;
          let protector = guard?.heroId;
          if (state.taunt?.heroId === recipient.id) incoming = Math.ceil(incoming * (1 - tauntReductionOf(data, recipient.id)));
          const rally = state.rally;
          if (rally && rally.ids.includes(recipient.id) && living(state, rally.heroId)) {
            incoming = Math.ceil(incoming * (1 - rallyReductionOf(data, rally.heroId))); rally.ids.splice(rally.ids.indexOf(recipient.id), 1); protector ??= rally.heroId;
          }
          if (state.bulwark && living(state, state.bulwark.heroId) && data.heroes.find(h => h.id === recipient.id)!.lane === 'front') incoming = Math.ceil(incoming * (1 - skillPower(data, state.bulwark.heroId, 'bulwark') / 100));
          // Talents: a braced spear's front wall, a priest's solace, then a bard's chorus (flat).
          const brace = state.counter;
          if (brace && intent.kind === 'physical' && living(state, brace.heroId) && hasCap(data, brace.heroId, 'frontwall') && data.heroes.find(h => h.id === recipient.id)!.lane === 'front')
            incoming = Math.ceil(incoming * (1 - capAmount(data, brace.heroId, 'frontwall') / 100));
          if (state.solace?.targetId === recipient.id && living(state, state.solace.heroId)) incoming = Math.ceil(incoming * (1 - capAmount(data, state.solace.heroId, 'solace') / 100));
          // Release A trees: a priest's halo (energy), a spear holding firm, then a duelist's parry.
          if (state.halo && intent.kind === 'energy' && living(state, state.halo.heroId)) incoming = Math.ceil(incoming * (1 - skillPower(data, state.halo.heroId, 'halo') / 100));
          if (state.hold && living(state, state.hold.heroId) && intent.kind === 'physical' && data.heroes.find(h => h.id === recipient.id)!.lane === 'back') incoming = Math.ceil(incoming * (1 - capAmount(data, state.hold.heroId, 'holdfirm') / 100));
          const parry = state.parry?.heroId === recipient.id && (state.parry.all || intent.kind === 'physical') ? state.parry : null;
          if (parry) incoming = Math.ceil(incoming * (1 - (parry.all ? capAmount(data, recipient.id, 'parryall') / 100 : PARRY_REDUCTION)));
          // A warden's guardian stone takes the edge off this ally's first hit, and he recovers.
          const stone = state.stone;
          if (intent.stoned && stone && recipient.id === stone.heroId && living(state, stone.heroId)) {
            incoming = Math.ceil(incoming * (1 - stone.percent / 100));
            const warden = state.heroes.find(h => h.id === stone.heroId)!; const mend = Math.min(GUARD_STONE_HEAL, data.heroes.find(d => d.id === warden.id)!.maxHp - warden.hp);
            if (mend > 0) { warden.hp += mend; events.push({ type: 'heal', sourceId: warden.id, targetId: warden.id, amount: mend, text: 'Guardian stone.' }); }
          }
          // The recipient's own Armour or Resistance (gear), by the move's kind.
          const defense = defenseOf(data, recipient.id, intent.kind); if (defense) incoming = Math.ceil(incoming * (1 - defense / 100));
          if (state.song?.action === 'valor' && living(state, state.song.heroId) && hasCap(data, state.song.heroId, 'chorus')) incoming = Math.max(0, incoming - capAmount(data, state.song.heroId, 'chorus'));
          hit(state, data, enemy, intent, recipient, incoming, events, protector);
          if (parry && !parry.all) parried(state, data, enemy, recipient, events);
        }
      };
      if (intent.special === 'phase') beginPhase(state, data, enemy, events);
      else if (enemy.interruptedRound === state.round) {
        events.push({ type: 'cancel', sourceId: actorId, cause: intent.kind === 'energy' ? 'sealed' : 'interrupted', text: intent.kind === 'energy' ? 'Energy move sealed.' : 'Physical attack interrupted.' });
        if (data.enemies.find(e => e.id === actorId)?.boss) enemy.steadyRound = state.round + STEADFAST_ROUNDS;
        // Mage sigil reflect (tree modifier): a sealed move strikes its own caster for a share of its damage.
        const by = enemy.interruptedBy;
        if (by && intent.kind === 'energy' && hasCap(data, by, 'sigilreflect') && living(state, by)) strikeBack(state, data, by, enemy, Math.floor(intent.damage * capAmount(data, by, 'sigilreflect') / 100), events, 'The seal reflects the move.');
      } else if (intent.charge) events.push({ type: 'charge', sourceId: actorId, targetId: intent.targetId, text: 'Gathering power.' });
      // A whole-party move strikes every standing hero; Guard cannot cover it.
      else if (intent.all) { for (const h of state.heroes.filter(x => x.hp > 0)) if (h.hp > 0) strike(h, null); }
      else strike(state.heroes.find(h => h.id === (guard?.heroId ?? intent.targetId))!, guard);
      // A two-guard knight covers a set number of hits; a plain guard ends when its announced attacker acts.
      if (guard?.uses && events.some(e => e.type === 'damage' && e.sourceId === actorId)) { guard.uses--; if (!guard.uses) state.guard = null; }
      else if (state.guard?.sourceId === actorId && !state.guard.uses && !state.guard.all) state.guard = null;
      if (state.challenge?.enemyId === actorId) state.challenge = null;
      if (intent.stoned && state.stone) {
        state.stone.ids = state.stone.ids.filter(id => id !== intent.stoneTargetId);
      }
      delete enemy.drawnBy;
    }
    delete enemy.interruptedRound; delete enemy.interruptedBy; delete enemy.weaken;
    const frame = structuredClone(state); const beat = state.beat; const round = state.round;
    finishOrAdvance(state, data, events);
    if (state.outcome !== 'active') { frame.outcome = state.outcome; frame.intent = null; }
    turns.push({ actorId, side: 'enemy', beat, round, intent, targetId: events.find(e => e.type === 'damage' || e.type === 'dodge')?.targetId ?? intent?.targetId, state: frame, events, ...(presentation ? {before, after: structuredClone(state)} : {}) });
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
// Opt-in boundaries avoid extra snapshot work in previews, replay and simulation.
export function beginBattle(data: EncounterDefinition, entry?: BattleEntry, presentation = false): Resolution {
  const invalid = entryReason(data, entry); if (invalid) throw new Error(invalid);
  const state: BattleState = {
    encounterId: data.id, beat: 1, round: 1, turnIndex: 0, order: [], outcome: 'active', guard: null, counter: null, taunt: null, song: null,
    // Equipment can start a standing hero with a barrier.
    heroes: data.heroes.map(h => { const hp = entry?.hp[h.id] ?? h.maxHp; return { id: h.id, hp, barrier: hp > 0 ? h.gear?.barrier ?? 0 : 0, cooldowns: {} }; }),
    // Reserves wait off the field at 0 HP until a boss phase summons them.
    enemies: data.enemies.map(e => e.reserve ? { id: e.id, hp: 0, markedUntil: 0, absent: true } : { id: e.id, hp: e.maxHp, markedUntil: 0 }), intent: null, commands: [],
  };
  // Wind set (4 pieces): the wearer acts before everyone in round 1.
  for (const h of state.heroes) if (h.hp > 0 && data.heroes.find(d => d.id === h.id)!.gear?.firstStrike) h.hastedRound = 1;
  // Bard overture (talent): the battle opens with the song of mending already playing.
  const bard = data.heroes.find(h => hasCap(data, h.id, 'overture') && state.heroes.find(s => s.id === h.id)!.hp > 0);
  if (bard) state.song = { heroId: bard.id, action: 'mend', since: 1 };
  // Knight banner of fate (A6 capstone): every standing hero starts with a barrier of a share of his max HP.
  for (const k of data.heroes.filter(h => hasCap(data, h.id, 'fatebanner') && state.heroes.find(s => s.id === h.id)!.hp > 0)) {
    const amount = Math.round(k.maxHp * capAmount(data, k.id, 'fatebanner') / 100);
    for (const h of state.heroes) if (h.hp > 0) h.barrier = Math.max(h.barrier, amount);
  }
  // Priest dawn (capstone): a prayer already lingers, healing the party as round 2 begins.
  const dawn = data.heroes.find(h => hasCap(data, h.id, 'dawn') && state.heroes.find(s => s.id === h.id)!.hp > 0);
  if (dawn) state.prayerEcho = { heroId: dawn.id, round: 2, amount: skillPower(data, dawn.id, 'prayer') };
  // Archer silent hunter (capstone): the fastest foe on the field acts last in round 1.
  if (data.heroes.some(h => hasCap(data, h.id, 'stalker') && state.heroes.find(s => s.id === h.id)!.hp > 0)) {
    const fastest = data.enemies.filter(e => state.enemies.find(s => s.id === e.id)!.hp > 0).reduce<typeof data.enemies[number] | undefined>((best, e) => !best || e.speed > best.speed ? e : best, undefined);
    if (fastest) state.enemies.find(e => e.id === fastest.id)!.delayedRound = 1;
  }
  // Alchemist mobile lab (capstone): the slowest standing ally starts hasted (acts first in round 1).
  if (data.heroes.some(h => hasCap(data, h.id, 'mobilelab') && state.heroes.find(s => s.id === h.id)!.hp > 0)) {
    const slowest = data.heroes.filter(h => state.heroes.find(s => s.id === h.id)!.hp > 0).reduce<HeroDefinition | undefined>((low, h) => !low || h.speed < low.speed ? h : low, undefined);
    if (slowest) state.heroes.find(h => h.id === slowest.id)!.hastedRound = 1;
  }
  state.order = roundOrder(state, data); refreshIntent(state, data);
  const initial = structuredClone(state); const turns: TurnStage[] = [];
  automaticTurns(state, data, turns, presentation);
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
  if (['cadence', 'duet', 'deepbeat', 'closingstep'].includes(action)) return data.heroes.map(h => {
    const actor = state.heroes.find(a => a.id === h.id);
    const reason = unavailable || (!actor || actor.hp <= 0 ? 'This hero is down.' : h.id === heroId ? 'Choose another ally.' : !cooldownTargets(state, data, h.id).length ? 'No eligible skill is cooling down.' : '');
    return { id: h.id, name: h.name, valid: !reason, reason };
  });
  if (action === 'rounddance') {
    const reason = unavailable || (!danceAllies(state, data, heroId).length ? 'No eligible skill is cooling down.' : '');
    return [{ id: 'party', name: 'Party', valid: !reason, reason }];
  }
  if (action === 'aegis') {
    const adds = state.heroes.some(h => h.hp > 0 && h.barrier < skillPower(data, heroId, 'aegis'));
    const user = state.heroes.find(h => h.id === heroId);
    const secondary = !!user && user.barrier < levelBarrier(data, heroId, action);
    const reason = unavailable || (!adds && !secondary ? 'The party already has this barrier.' : '');
    return [{ id: 'party', name: 'Party', valid: !reason, reason }];
  }
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
      (action === 'valor' || action === 'mend' || action === 'dread') && state.song?.heroId === heroId && state.song.action === action ? 'Already playing this song.' :
      action === 'finale' && state.song?.heroId !== heroId ? 'No song is playing.' : action === 'rouse' && !state.heroes.some(h => h.hp > 0 && h.id !== heroId) ? 'Choose another ally.' : '');
    return [{ id: heroId, name: data.heroes.find(h => h.id === heroId)?.name ?? heroId, valid: !reason, reason }];
  }
  if (action === 'haste') return data.heroes.map(h => {
    const ally = state.heroes.find(s => s.id === h.id)!;
    const reason = unavailable || (ally.hp <= 0 ? 'This hero is down.' : ally.hastedRound === state.round + 1 ? 'Already hasted.' : '');
    return { id: h.id, name: h.name, valid: !reason, reason };
  });
  // A priest's revive raises an ally who fell in this battle, once per battle; a blessing goes to another standing ally.
  if (action === 'revive') return data.heroes.map(h => {
    const ally = state.heroes.find(s => s.id === h.id)!;
    const reason = unavailable || (state.revived?.includes(heroId) ? 'Revive is used once per battle.' : ally.hp > 0 ? 'This ally is standing.' : !ally.fell ? 'Only an ally who fell in this battle.' : '');
    return { id: h.id, name: h.name, valid: !reason, reason };
  });
  // Recruit trees: fury goes to any standing ally; decoy, guardian stone and solo to another one (solo needs a song
  // that changes hits or healing).
  if (['fury', 'decoy', 'guardstone', 'solo'].includes(action)) return data.heroes.map(h => {
    const ally = state.heroes.find(s => s.id === h.id)!;
    const reason = unavailable || (ally.hp <= 0 ? 'This hero is down.' : action !== 'fury' && h.id === heroId ? 'Choose another ally.' :
      action === 'decoy' && ally.evading ? 'Already evading.' : action === 'solo' && (state.song?.heroId !== heroId || state.song.action === 'dread') ? 'No song of valor or mending is playing.' : '');
    return { id: h.id, name: h.name, valid: !reason, reason };
  });
  if (action === 'bless') return data.heroes.map(h => {
    const ally = state.heroes.find(s => s.id === h.id)!;
    const reason = unavailable || (ally.hp <= 0 ? 'This hero is down.' : '');
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
      screened(state, data, heroId, action, e.id) ? 'A front-row enemy shields this target.' : '');
    return { id: e.id, name: e.name, valid: !reason, reason };
  });
}
export function validateCommand(state: BattleState, data: EncounterDefinition, command: Command): string {
  if (state.encounterId !== data.id) return 'Encounter mismatch.';
  if (command.beat !== state.beat) return 'The preview is stale. Select an action again.';
  const reason = actionReason(state, data, command.heroId, command.action);
  if (reason) return reason;
  const selectsSkill = command.action === 'duet' && hasCap(data, command.heroId, 'lalin2');
  if (selectsSkill && (!command.cooldownAction || !cooldownTargets(state, data, command.targetId).includes(command.cooldownAction))) return 'Choose an eligible cooling skill.';
  if (!selectsSkill && command.cooldownAction !== undefined) return 'This action does not select a cooling skill.';
  const selectsAlly = command.action === 'echofoot' && hasCap(data, command.heroId, 'dancerEchoChoose');
  const allies = danceAllies(state, data, command.heroId);
  if (selectsAlly && allies.length && !allies.some(h => h.id === command.cooldownTargetId)) return 'Choose an ally with an eligible cooling skill.';
  if (command.cooldownTargetId !== undefined && (!selectsAlly || !allies.some(h => h.id === command.cooldownTargetId))) return 'Invalid cooldown recipient.';
  const target = targetOptions(state, data, command.heroId, command.action).find(t => t.id === command.targetId);
  return target?.valid ? '' : target?.reason || 'Invalid target.';
}
export function resolveCommand(initial: BattleState, data: EncounterDefinition, command: Command, presentation = false): Resolution {
  const invalid = validateCommand(initial, data, command); if (invalid) throw new Error(invalid);
  const state = structuredClone(initial); const events: BattleEvent[] = []; const turns: TurnStage[] = [];
  const hero = data.heroes.find(h => h.id === command.heroId)!; const actor = state.heroes.find(h => h.id === hero.id)!;
  const base = data.skills[command.action]; const enemy = state.enemies.find(e => e.id === command.targetId);
  const skill = { ...base, power: skillPower(data, hero.id, command.action), cooldown: skillCooldown(data, hero.id, command.action) };
  let directDamage = 0;
  let cooldownAdjustment = 0;
  // Every hero hit adds corrosion, valor and its own capstone bonuses.
  const strike = (foe: EnemyState, power: number, text: string) => {
    const boss=foe===enemy&&targetKind(command.action)==='enemy'&&power>0&&foe.markedUntil>state.round?bossPowerReady(state,data,hero.id,'focus'):0;
    if(boss)actor.bossUsedRound=state.round;
    const banner = (actor.empowered?.round ?? 0) >= state.round ? actor.empowered!.percent : 0;
    const raised = banner ? Math.round(power * (100 + banner) / 100) : power;
    // A bard's solo gives this hero the song of valor twice more.
    const solo = (actor.solo?.round ?? 0) >= state.round && state.song?.action === 'valor' && living(state, state.song.heroId) ? songPower(data, state.song.heroId, 'valor') * (SOLO_TIMES - 1) : 0;
    const amount = Math.min(foe.hp, veiled(state, data, foe, raised + boss + solo + hitBonus(state, data, foe.id) + talentHitBonus(state, data, hero.id, foe))); foe.hp -= amount; directDamage += amount;
    events.push({ type: 'damage', sourceId: hero.id, targetId: foe.id, amount, text });
    if (!foe.hp) { events.push({ type: 'down', targetId: foe.id, text: 'Enemy falls.' }); chainReaction(state, data, foe, events); }
    leech(state, data, hero.id, amount, events);
    thorned(state, data, foe, hero.id, amount, events);
  };
  const damage = (power: number) => strike(enemy!, power, 'Hero attacks.');
  // Split bolt (talent): the other living enemies take half the skill power; piercing line only the one in the same column.
  const splash = (power: number, column = false) => { for (const foe of state.enemies.filter(e => e.hp > 0 && e.id !== enemy!.id && (!column || e.id[1] === enemy!.id[1]))) strike(foe, Math.floor(power / 2), 'The hit carries on.'); };
  const row = (id: string) => data.enemies.find(e => e.id === id)?.row;
  const barrier = (h: HeroState, amount: number) => {
    const added = h.hp > 0 ? Math.max(h.barrier, amount) - h.barrier : 0;
    if (added) { h.barrier += added; events.push({ type: 'barrier', sourceId: hero.id, targetId: h.id, amount: added, text: 'Added barrier.' }); }
  };
  const livingBefore = state.enemies.filter(e => e.hp > 0).map(e => e.id);
  const heal = (id: string, power: number) => {
    const target = state.heroes.find(h => h.id === id)!; if (!target.hp) return;
    const amount = Math.min(power, data.heroes.find(h => h.id === id)!.maxHp - target.hp);
    if (amount) { target.hp += amount; events.push({ type: 'heal', sourceId: hero.id, targetId: id, amount, text: 'Restored HP.' }); }
    // Afterglow (★5): healing beyond full HP becomes a barrier (capped, not stacking).
    // The mender set (4 pieces) does the same with its own cap; the larger cap applies.
    const cap = Math.max(hasPassive(data, hero.id, 'afterglow') ? data.rules.afterglowCap : 0, hero.gear?.overflowCap ?? 0);
    const glow = cap ? Math.min(cap, power - amount) - target.barrier : 0;
    if (glow > 0) { target.barrier += glow; events.push({ type: 'barrier', sourceId: hero.id, targetId: id, amount: glow, text: 'Overflowing light becomes a barrier.' }); }
  };
  const nextIntent = () => nextIntentOf(state, data, command.targetId);
  // A foe's next move is cut by a percent (the larger cut stands); an alchemist's corrosion.
  const weaken = (foe: EnemyState, percent: number) => {
    foe.weaken = Math.max(foe.weaken ?? 0, percent); events.push({ type: 'weaken', sourceId: hero.id, targetId: foe.id, amount: foe.weaken, text: 'Next move weakened.' });
  };
  const corrode = (foe: EnemyState) => {
    if (foe.hp <= 0) return;
    foe.corrodedUntil = state.round + data.rules.corrodeDuration + (hasPassive(data, hero.id, 'potent') ? 1 : 0); foe.corrodeBonus = corrodeBonusOf(data, hero.id);
    events.push({ type: 'corrode', sourceId: hero.id, targetId: foe.id, amount: foe.corrodeBonus, text: 'Enemy corroded.' });
  };
  switch (command.action) {
    case 'saintstrike': case 'communion': case 'vowstrike': case 'sharewound': case 'lastlight': {
      let power = skill.power;
      const hurt = (h: HeroState, percent: number) => h.id !== hero.id && h.hp > 0 && h.hp * 100 < data.heroes.find(d => d.id === h.id)!.maxHp * percent;
      if (command.action === 'saintstrike' && state.heroes.some(h => hurt(h, 50))) power += capAmount(data, hero.id, 'metta2');
      if (command.action === 'vowstrike' && state.heroes.filter(h => h.hp > 0 && h.hp < data.heroes.find(d => d.id === h.id)!.maxHp && data.heroes.find(d => d.id === h.id)!.lane === 'front').length >= 2) power += capAmount(data, hero.id, 'thiran3');
      damage(power); break;
    }
    case 'saintarc': {
      const foes = state.enemies.filter(e => e.hp > 0); const front = foes.filter(e => row(e.id) === 'front');
      for (const foe of front.length ? front : foes) strike(foe, skill.power, 'Saint arc.');
      break;
    }
    case 'cadence': case 'duet': case 'rounddance': case 'deepbeat': case 'echofoot': case 'closingstep': {
      if (command.action === 'echofoot') damage(skill.power);
      const allies = danceAllies(state, data, hero.id);
      const chosen = state.heroes.find(h => h.id === command.targetId);
      const reduce = (target: HeroState, amount: number, count: number, explicit?: ActionId, shortest = false) => {
        let actions = cooldownTargets(state, data, target.id);
        if (shortest) actions = [...actions].sort((a, b) => target.cooldowns[a]! - target.cooldowns[b]!);
        if (explicit) actions = [explicit, ...actions.filter(a => a !== explicit)];
        for (const action of actions.slice(0, count)) {
          const before = target.cooldowns[action]!; const after = Math.max(state.round, before - amount);
          if (after <= state.round) delete target.cooldowns[action]; else target.cooldowns[action] = after;
          if (before > after) events.push({ type: 'cooldown', sourceId: hero.id, targetId: target.id, action, amount: before - after, text: 'Cooldown recovered.' });
        }
      };
      switch (command.action) {
        case 'cadence':
          reduce(chosen!, 1, 1, undefined, hasCap(data, hero.id, 'dancerCadenceShort'));
          if (hasCap(data, hero.id, 'lalin1') && !state.commands.some(c => c.heroId === hero.id && c.action === 'cadence')) cooldownAdjustment--;
          break;
        case 'duet':
          if (hasCap(data, hero.id, 'wila4')) {
            reduce(chosen!, 1, 1, command.cooldownAction);
            const second = allies.find(h => h.id !== chosen!.id); if (second) reduce(second, 1, 1);
          } else reduce(chosen!, hasCap(data, hero.id, 'dancerDuetFocus') ? 2 : 1, hasCap(data, hero.id, 'dancerDuetFocus') ? 1 : 2, command.cooldownAction);
          break;
        case 'rounddance': {
          const pair = hasCap(data, hero.id, 'dancerRoundPair');
          for (const ally of pair ? allies.slice(0, 2) : allies) reduce(ally, pair ? 2 : 1, 1);
          if (hasCap(data, hero.id, 'wila1') && !state.commands.some(c => c.heroId === hero.id && c.action === 'rounddance')) cooldownAdjustment--;
          if (hasCap(data, hero.id, 'wila3') && (pair ? Math.min(2, allies.length) : allies.length) >= 3) cooldownAdjustment--;
          break;
        }
        case 'deepbeat':
          reduce(chosen!, (hasCap(data, hero.id, 'dancerDeep') ? 3 : 2) + (chosen!.hp * 2 < data.heroes.find(h => h.id === chosen!.id)!.maxHp ? capAmount(data, hero.id, 'lalin3') : 0), 1); break;
        case 'echofoot': {
          const recipient = hasCap(data, hero.id, 'dancerEchoChoose') ? allies.find(h => h.id === command.cooldownTargetId) : allies[0];
          if (recipient) reduce(recipient, 1, 1); break;
        }
        case 'closingstep': {
          const count = cooldownTargets(state, data, chosen!.id).length;
          reduce(chosen!, 2, hasCap(data, hero.id, 'lalin4') ? 1 : 2);
          if (count === 1) cooldownAdjustment -= capAmount(data, hero.id, 'dancerClosingQuick');
          cooldownAdjustment -= capAmount(data, hero.id, 'lalin4'); break;
        }
      }
      break;
    }
    case 'attack': case 'execute': case 'lunge': {
      const bonus = hero.empoweredByStatuses && enemy!.markedUntil > state.round ? data.rules.markedBonus : 0;
      damage((command.action === 'attack' ? hero.attack : skill.power) + bonus); if (bonus) enemy!.markedUntil = 0;
      // Duelist talent: a precision strike on a marked enemy restores her HP.
      if (bonus && command.action === 'execute') heal(hero.id, talentRule(data, hero.id, 'executeHeal'));
      break;
    }
    case 'bash': {
      const slot = upcomingTurns(state, data, state.order.length * 2).find(t => t.actorId === command.targetId);
      const intent = slot && enemyIntent(state, data, command.targetId, slot.round);
      // Knight retribution (talent): a bash that stops a move hits harder. Reflect bash (A6) also stops energy moves
      // but hits for less.
      const reflect = hasCap(data, hero.id, 'reflectbash'); const blocked = interruptBlock(state, data, command.targetId, intent);
      const stops = !blocked && (intent?.kind === 'physical' || (reflect && intent?.kind === 'energy'));
      const power = reflect ? Math.round(skill.power * (100 - capAmount(data, hero.id, 'reflectbash')) / 100) : skill.power;
      damage(power + (stops ? capAmount(data, hero.id, 'retribution') : 0));
      if (enemy!.hp > 0 && stops) {
        enemy!.interruptedRound = intent!.round;
        events.push(intent!.kind === 'physical' ? { type: 'interrupt', sourceId: hero.id, targetId: enemy!.id, text: 'Next physical attack interrupted.' } : { type: 'sigil', sourceId: hero.id, targetId: enemy!.id, text: 'Next energy move sealed.' });
      } else if (enemy!.hp > 0 && blocked) events.push(resistEvent(hero.id, enemy!.id, blocked));
      break;
    }
    case 'bolt': {
      const power = skill.power + capAmount(data, hero.id, 'piercebolt'); damage(power); if (hasCap(data, hero.id, 'splitbolt')) splash(power);
      // Arcane charge (capstone): each bolt readies the storm one round sooner.
      if (hasCap(data, hero.id, 'arcanecharge')) shorten(actor, 'storm', state.round);
      break;
    }
    case 'pierce': {
      // Deep pierce (tree modifier) hits the back row harder.
      const power = row(enemy!.id) === 'back' && hasCap(data, hero.id, 'deeppierce') ? Math.round(skill.power * (100 + capAmount(data, hero.id, 'deeppierce')) / 100) : skill.power;
      damage(power); if (hasCap(data, hero.id, 'pierceline')) splash(power, true); break;
    }
    case 'parry':
      state.parry = { heroId: hero.id, ...(hasCap(data, hero.id, 'parryall') ? { all: true } : {}) };
      events.push({ type: 'parry', sourceId: hero.id, targetId: hero.id, text: 'Parry stance.' }); break;
    case 'sweep': {
      // The front row; with the front row down, the back row.
      const live = state.enemies.filter(e => e.hp > 0); const front = live.filter(e => row(e.id) === 'front');
      const hit = front.length ? front : live;
      for (const foe of hit) strike(foe, skill.power, 'The sweep cuts the row.');
      const low = hit.filter(e => e.hp > 0).reduce<EnemyState | undefined>((a, e) => !a || e.hp < a.hp ? e : a, undefined);
      if (low) { low.markedUntil = Math.max(low.markedUntil, state.round + data.rules.markDuration + (hasPassive(data, hero.id, 'keeneye') ? 1 : 0)); events.push({ type: 'mark', sourceId: hero.id, targetId: low.id, text: 'Enemy marked.' }); }
      break;
    }
    case 'storm': for (const foe of state.enemies.filter(e => e.hp > 0)) strike(foe, skill.power, 'The storm strikes every enemy.'); break;
    case 'aegis': for (const h of state.heroes) barrier(h, skill.power); break;
    case 'dispel':
      damage(skill.power);
      if (enemy!.hp > 0) { enemy!.dispelledUntil = state.round + 2; delete enemy!.steadyRound; events.push({ type: 'dispel', sourceId: hero.id, targetId: enemy!.id, text: 'Veilguard dispelled.' }); }
      break;
    case 'revive': {
      const ally = state.heroes.find(h => h.id === command.targetId)!; const def = data.heroes.find(h => h.id === ally.id)!;
      ally.hp = Math.max(1, Math.round(def.maxHp * skill.power / 100)); ally.revivedRound = state.round; delete ally.fell;
      state.revived = [...state.revived ?? [], hero.id];
      events.push({ type: 'revive', sourceId: hero.id, targetId: ally.id, amount: ally.hp, text: 'Revived.' }); break;
    }
    case 'halo': state.halo = { heroId: hero.id }; events.push({ type: 'buff', sourceId: hero.id, targetId: hero.id, amount: skill.power, text: 'Halo.' }); break;
    case 'bless': {
      const ally = state.heroes.find(h => h.id === command.targetId)!;
      ally.renew = { heroId: hero.id, amount: skill.power, until: state.round + 2 };
      events.push({ type: 'buff', sourceId: hero.id, targetId: ally.id, amount: skill.power, text: 'Renew.' }); break;
    }
    case 'hold': state.hold = { heroId: hero.id, round: state.round }; events.push({ type: 'hold', sourceId: hero.id, targetId: hero.id, text: 'Hold the line.' }); break;
    case 'halt': damage(Math.round(skill.power * (nextIntent()?.kind === 'physical' ? 1.5 : 1))); break;
    case 'warcry':
      state.warcry = { heroId: hero.id, ids: state.heroes.filter(h => h.hp > 0 && data.heroes.find(d => d.id === h.id)!.lane === 'front').map(h => h.id) };
      events.push({ type: 'buff', sourceId: hero.id, targetId: hero.id, amount: skill.power, text: 'War cry.' }); break;
    case 'disengage': {
      const next = nextIntent(); damage(skill.power + (next && next.targetId !== hero.id && hasCap(data, hero.id, 'covershot') ? capAmount(data, hero.id, 'covershot') : 0));
      const at = state.order.indexOf(enemy!.id);
      if (enemy!.hp > 0 && at > state.turnIndex) { state.order.splice(at, 1); state.order.push(enemy!.id); events.push({ type: 'delay', sourceId: hero.id, targetId: enemy!.id, text: 'Enemy acts last this round.' }); }
      if (enemy!.hp > 0 && hasCap(data, hero.id, 'quickstep')) { enemy!.delayedRound = state.round + 1; events.push({ type: 'delay', sourceId: hero.id, targetId: enemy!.id, text: 'Enemy acts last next round.' }); }
      break;
    }
    case 'pin':
      for (const foe of state.enemies.filter(e => e.hp > 0 && row(e.id) === 'front')) strike(foe, skill.power, 'The volley pins the front row.');
      state.pinned = state.round + 1; events.push({ type: 'pin', sourceId: hero.id, targetId: hero.id, text: 'The front row stops screening.' }); break;
    case 'track':
      damage(skill.power);
      if (enemy!.hp > 0 && isDelayed(enemy!, state.round)) state.tracking = [...state.tracking ?? [], { heroId: hero.id, enemyId: enemy!.id, round: state.round, power: skill.power }];
      break;
    case 'backstab': damage(skill.power + ambushBonus(state, data, enemy!.id, hero.id)); break;
    // ---- Recruit big trees ----
    case 'smoke': {
      // Smoke: the target's next move is cut whatever its kind (a wide smoke cuts the target's whole row by less; a
      // poison smoke corrodes the target too). Nothing is cancelled, so a boss's signature move is only cut.
      const wide = hasCap(data, hero.id, 'smokewide');
      for (const foe of state.enemies.filter(e => e.hp > 0 && (e.id === enemy!.id || (wide && row(e.id) === row(enemy!.id))))) weaken(foe, wide ? capAmount(data, hero.id, 'smokewide') : skill.power);
      if (hasCap(data, hero.id, 'smokepoison')) corrode(enemy!);
      break;
    }
    case 'fury': {
      const ally = state.heroes.find(h => h.id === command.targetId)!;
      ally.empowered = { percent: Math.max(skill.power, (ally.empowered?.round ?? 0) >= state.round ? ally.empowered!.percent : 0), round: state.round + 1 };
      ally.exposed = { percent: FURY_EXPOSED, round: state.round + 1 };
      events.push({ type: 'buff', sourceId: hero.id, targetId: ally.id, amount: skill.power, text: 'Fury tonic.' }); break;
    }
    case 'catalyst': {
      // A corroded target bursts for every round of corrosion left, then the corrosion is spent.
      const left = Math.max(0, (enemy!.corrodedUntil ?? 0) - state.round);
      damage(skill.power + left * CATALYST_PER_ROUND);
      if (left) { delete enemy!.corrodedUntil; delete enemy!.corrodeBonus; }
      break;
    }
    case 'knives': {
      // The back row whatever screens it (the front row when the back row is empty); twin knives also cut the front row by half.
      const live = state.enemies.filter(e => e.hp > 0); const back = live.filter(e => row(e.id) === 'back'); const front = live.filter(e => row(e.id) === 'front');
      for (const foe of back.length ? back : front) strike(foe, skill.power, 'Throwing knives.');
      if (back.length && hasCap(data, hero.id, 'twinknives')) for (const foe of front.filter(e => e.hp > 0)) strike(foe, Math.floor(skill.power / 2), 'Throwing knives.');
      break;
    }
    case 'decoy': {
      const ally = state.heroes.find(h => h.id === command.targetId)!; ally.evading = true; ally.evadeBy = hero.id; delete ally.evadePhysical;
      events.push({ type: 'evade', sourceId: hero.id, targetId: ally.id, text: 'Shadow cover.' }); break;
    }
    case 'disarm': {
      const next = nextIntent(); damage(Math.round(skill.power * (ambushBonus(state, data, enemy!.id, hero.id) && next && next.targetId !== hero.id ? DISARM_MULTIPLIER : 1))); break;
    }
    case 'stonearmor': barrier(actor, Math.round(hero.maxHp * skill.power / 100)); break;
    case 'guardstone': {
      // A twin stone covers the most hurt other standing ally too, each by less; a thick stone cuts more.
      const ratio = (h: HeroState) => h.hp / data.heroes.find(d => d.id === h.id)!.maxHp;
      const twin = hasCap(data, hero.id, 'twinstone') ? state.heroes.filter(h => h.hp > 0 && h.id !== command.targetId && h.id !== hero.id).reduce<HeroState | undefined>((low, h) => !low || ratio(h) < ratio(low) ? h : low, undefined) : undefined;
      const percent = hasCap(data, hero.id, 'twinstone') ? capAmount(data, hero.id, 'twinstone') : hasCap(data, hero.id, 'thickstone') ? capAmount(data, hero.id, 'thickstone') : skill.power;
      state.stone = { heroId: hero.id, ids: [command.targetId, ...twin ? [twin.id] : []], percent, round: state.round };
      for (const id of state.stone.ids) events.push({ type: 'buff', sourceId: hero.id, targetId: id, amount: percent, text: 'Guardian stone.' });
      break;
    }
    case 'tremor': {
      const live = state.enemies.filter(e => e.hp > 0); const front = live.filter(e => row(e.id) === 'front');
      for (const foe of front.length ? front : live) { strike(foe, skill.power, 'The ground shakes.'); if (foe.hp > 0) foe.drawnBy = { heroId: hero.id, round: nextIntentOf(state, data, foe.id)?.round ?? state.round }; }
      break;
    }
    case 'note': {
      const rounds = state.song?.heroId === hero.id ? Math.min(NOTE_MAX_ROUNDS, state.round - (state.song.since ?? state.round)) : 0;
      const power = skill.power + rounds * NOTE_PER_ROUND;
      damage(Math.round(power * (state.song?.heroId === hero.id ? 1 + capAmount(data, hero.id, 'songnote') / 100 : 1)));
      // Twin note: another standing foe of the target's row takes a share.
      const other = hasCap(data, hero.id, 'twinnote') ? state.enemies.find(e => e.hp > 0 && e.id !== enemy!.id && row(e.id) === row(enemy!.id)) : undefined;
      if (other) strike(other, Math.floor(power * capAmount(data, hero.id, 'twinnote') / 100), 'The note carries on.');
      break;
    }
    case 'solo': {
      const ally = state.heroes.find(h => h.id === command.targetId)!; ally.solo = { heroId: hero.id, round: state.round + 1 };
      events.push({ type: 'buff', sourceId: hero.id, targetId: ally.id, amount: SOLO_TIMES, text: 'Solo.' }); break;
    }
    case 'finisher': {
      const maxHp = data.enemies.find(e => e.id === enemy!.id)!.maxHp;
      // Deadline (capstone) raises the threshold.
      const threshold = hasCap(data, hero.id, 'deadline') ? capAmount(data, hero.id, 'deadline') / 100 : data.rules.finisherThreshold;
      damage(enemy!.hp < maxHp * threshold ? skill.power * 2 : skill.power); break;
    }
    case 'weakshot': damage(skill.power + (isDelayed(enemy!, state.round) ? data.rules.weakshotBonus : 0)); break;
    case 'quake': {
      const live = state.enemies.filter(e => e.hp > 0); const front = live.filter(e => row(e.id) === 'front');
      for (const foe of front.length ? front : live) { strike(foe, skill.power, 'Earthshaker.'); if (hasCap(data, hero.id, 'skyhammer')) heal(hero.id, capAmount(data, hero.id, 'skyhammer')); }
      break;
    }
    case 'sigil': {
      // Sigil bind is the mage's answer to energy moves (shield bash only stops physical ones).
      const intent = nextIntent(); damage(skill.power); const blocked = interruptBlock(state, data, enemy!.id, intent);
      if (enemy!.hp > 0 && intent?.kind === 'energy' && !blocked) {
        enemy!.interruptedRound = intent.round; enemy!.interruptedBy = hero.id;
        events.push({ type: 'sigil', sourceId: hero.id, targetId: enemy!.id, text: 'Next energy move sealed.' });
        if (intent && hasCap(data, hero.id, 'sigilward')) barrier(state.heroes.find(h => h.id === intent.targetId)!, capAmount(data, hero.id, 'sigilward'));
        // Fate seal (capstone): a seal that lands shields the mage.
        if (hasCap(data, hero.id, 'fateseal')) barrier(actor, capAmount(data, hero.id, 'fateseal'));
      } else if (enemy!.hp > 0 && intent?.kind === 'energy' && blocked) events.push(resistEvent(hero.id, enemy!.id, blocked));
      break;
    }
    case 'rally':
      state.rally = { heroId: hero.id, ids: state.heroes.filter(h => h.hp > 0).flatMap(h => hasCap(data, hero.id, 'rallybanner') ? [h.id, h.id] : [h.id]) };
      events.push({ type: 'rally', sourceId: hero.id, targetId: hero.id, text: 'Every ally’s first hit is reduced until the knight’s next turn.' });
      // Rally modifiers (A6): a bright banner shields every standing ally; a valor banner raises hero hits this round.
      if (hasCap(data, hero.id, 'brightbanner')) for (const h of state.heroes.filter(a => a.hp > 0)) {
        const amount = Math.max(h.barrier, capAmount(data, hero.id, 'brightbanner')) - h.barrier;
        if (amount) { h.barrier += amount; events.push({ type: 'barrier', sourceId: hero.id, targetId: h.id, amount, text: 'Added barrier.' }); }
      }
      break;
    case 'challenge': {
      const slot = upcomingTurns(state, data, state.order.length * 2 + data.enemies.length).find(t => t.actorId === command.targetId);
      if (slot) state.challenge = { heroId: hero.id, enemyId: command.targetId, round: slot.round };
      events.push({ type: 'taunt', sourceId: hero.id, targetId: command.targetId, text: 'Challenge.' }); break;
    }
    case 'bulwark':
      state.bulwark = { heroId: hero.id };
      events.push({ type: 'buff', sourceId: hero.id, targetId: hero.id, amount: skill.power, text: 'Bulwark.' }); break;
    case 'rouse': {
      const allies = state.heroes.filter(h => h.hp > 0 && h.id !== hero.id);
      const ratio = (h: HeroState) => h.hp / data.heroes.find(d => d.id === h.id)!.maxHp;
      const low = allies.reduce((a, h) => ratio(h) < ratio(a) ? h : a);
      state.guard = { heroId: hero.id, targetId: low.id, sourceId: state.intent!.sourceId, all: true };
      events.push({ type: 'guard', sourceId: hero.id, targetId: low.id, text: 'Stand beside.' }); break;
    }
    case 'sanctuary':
      state.sanctuary = { heroId: hero.id, targetId: command.targetId };
      events.push({ type: 'sanctuary', sourceId: hero.id, targetId: command.targetId, text: 'The ally cannot fall until the priest’s next turn.' });
      // Priest tree modifiers: solace cuts the damage the ally takes, a double sanctuary adds a barrier.
      if (hasCap(data, hero.id, 'solace')) state.solace = { heroId: hero.id, targetId: command.targetId };
      if (hasCap(data, hero.id, 'sanctuaryward')) barrier(state.heroes.find(h => h.id === command.targetId)!, capAmount(data, hero.id, 'sanctuaryward'));
      break;
    case 'spearwall': state.counter = { heroId: hero.id, wall: true }; events.push({ type: 'brace', sourceId: hero.id, targetId: hero.id, amount: skill.power, text: 'Spear wall until its next turn.' }); break;
    case 'finale': {
      // The song ends and is released at once: valor strikes every enemy, mending heals every ally, dread cuts every
      // enemy's next move. An encore (capstone) plays the same song again at once, once per battle.
      const song = state.song!.action; state.song = null;
      events.push({ type: 'finale', sourceId: hero.id, targetId: hero.id, text: song === 'valor' ? 'Finale of valor.' : song === 'mend' ? 'Finale of mending.' : 'Finale of dread.' });
      if (song === 'valor') for (const foe of state.enemies.filter(e => e.hp > 0)) strike(foe, skill.power, 'The finale strikes every enemy.');
      else if (song === 'dread') for (const ally of state.heroes) barrier(ally, DREAD_FINALE);
      else {
        const power = finaleHealPower(data, hero.id);
        for (const h of state.heroes) heal(h.id, power);
      }
      if (hasCap(data, hero.id, 'encore') && !state.encored?.includes(hero.id)) {
        state.encored = [...state.encored ?? [], hero.id]; state.song = { heroId: hero.id, action: song, since: state.round };
        events.push({ type: 'song', sourceId: hero.id, targetId: hero.id, amount: songPower(data, hero.id, song), text: 'Encore.' });
      }
      break;
    }
    case 'ambush':
      damage(skill.power + ambushBonus(state, data, enemy!.id, hero.id));
      // Scout shadow layer (talent): an ambush leaves her in shadow step.
      if (hasCap(data, hero.id, 'shadowlayer') && !actor.evading) { actor.evading = true; events.push({ type: 'evade', sourceId: hero.id, targetId: hero.id, text: 'Scout evades the next hit until its next turn.' }); }
      break;
    case 'slam': damage(skill.power + (nextIntent()?.targetId === hero.id ? data.rules.quakeBonus : 0)); if (hasCap(data, hero.id, 'runequake')) splash(skill.power, true); break;
    case 'valor': case 'mend': case 'dread':
      state.song = { heroId: hero.id, action: command.action, since: state.round };
      events.push({ type: 'song', sourceId: hero.id, targetId: hero.id, amount: songPower(data, hero.id, command.action), text: command.action === 'valor' ? 'Song of valor: every hero hit is stronger.' : command.action === 'mend' ? 'Song of mending: the party heals each round.' : 'Song of dread: every enemy move is weaker.' });
      // Bard life rhythm (capstone): each new song shields every standing ally.
      if (hasCap(data, hero.id, 'liferhythm')) for (const h of state.heroes) barrier(h, capAmount(data, hero.id, 'liferhythm'));
      break;
    case 'taunt':
      state.taunt = { heroId: hero.id, round: state.round };
      events.push({ type: 'taunt', sourceId: hero.id, targetId: hero.id, text: 'Every enemy attack aims at the warden until his next turn.' }); break;
    case 'evade': actor.evading = true; delete actor.evadeBy; delete actor.evadePhysical; if (hasCap(data, hero.id, 'doubleshadow')) actor.evadeExtra = 1; events.push({ type: 'evade', sourceId: hero.id, targetId: hero.id, text: 'Scout evades the next hit until its next turn.' }); break;
    case 'hinder': {
      damage(skill.power);
      if (enemy!.hp > 0) { enemy!.delayedRound = state.round + 1; events.push({ type: 'delay', sourceId: hero.id, targetId: enemy!.id, text: 'Enemy acts last next round.' }); }
      if (enemy!.hp > 0 && hasCap(data, hero.id, 'heavyhinder')) enemy!.delayedAlso = state.round + 2;
      break;
    }
    case 'acid':
      // The flask's own hit lands before the corrosion takes hold.
      damage(skill.power);
      // Acid spread (talent): every other living enemy is corroded too, without damage.
      for (const foe of state.enemies.filter(e => e.hp > 0 && (e.id === enemy!.id || hasCap(data, hero.id, 'acidspread')))) corrode(foe);
      break;
    case 'haste': {
      // Haste (owner 2026-10-23): an ally still to act this round acts right after the alchemist; one who has acted
      // (or the alchemist herself) acts before everyone next round. Order only: nobody gains a turn.
      const ally = state.heroes.find(h => h.id === command.targetId)!; const at = state.order.indexOf(ally.id);
      if (at > state.turnIndex + 1) {
        state.order.splice(at, 1); state.order.splice(state.turnIndex + 1, 0, ally.id);
        events.push({ type: 'haste', sourceId: hero.id, targetId: ally.id, text: 'Ally acts next.' });
      } else if (at === state.turnIndex + 1) events.push({ type: 'haste', sourceId: hero.id, targetId: ally.id, text: 'Ally acts next.' });
      else { ally.hastedRound = state.round + 1; events.push({ type: 'haste', sourceId: hero.id, targetId: ally.id, text: 'Ally acts first next round.' }); }
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
    case 'guard': state.guard = { heroId: hero.id, targetId: command.targetId, sourceId: state.intent!.sourceId, ...(hasCap(data, hero.id, 'twoguard') ? { uses: 2 } : {}) }; events.push({ type: 'guard', sourceId: hero.id, targetId: command.targetId, text: 'Guard until announced attacker acts or Knight returns.' }); break;
    case 'ward': {
      // Echo (★5): a ward on the hero the enemy has announced it will strike is stronger.
      const power = hasPassive(data, hero.id, 'echo') && state.intent?.targetId === command.targetId ? Math.round(skill.power * (1 + data.rules.echoBonus)) : skill.power;
      const target = state.heroes.find(h => h.id === command.targetId)!; const amount = Math.max(target.barrier, power) - target.barrier;
      target.barrier += amount; events.push({ type: 'barrier', sourceId: hero.id, targetId: target.id, amount, text: 'Added barrier.' });
      if (hasCap(data, hero.id, 'wardreflect')) target.reflect = { heroId: hero.id, amount: capAmount(data, hero.id, 'wardreflect') };
      // Twin ward (tree modifier): the most hurt other standing ally gets half the ward.
      if (hasCap(data, hero.id, 'twinward')) {
        const ratio = (h: HeroState) => h.hp / data.heroes.find(d => d.id === h.id)!.maxHp;
        const other = state.heroes.filter(h => h.hp > 0 && h.id !== target.id).reduce<HeroState | undefined>((low, h) => !low || ratio(h) < ratio(low) ? h : low, undefined);
        if (other) barrier(other, Math.floor(power / 2));
      }
      break;
    }
    case 'heal': {
      const hpBefore=state.heroes.find(h=>h.id===command.targetId)!.hp;
      heal(command.targetId, skill.power);
      // Priest talents: a small barrier, a half heal for the most hurt other ally, and solace on the target.
      const shield = talentRule(data, hero.id, 'healBarrier'); const target = state.heroes.find(h => h.id === command.targetId)!;
      if (shield > target.barrier) { events.push({ type: 'barrier', sourceId: hero.id, targetId: target.id, amount: shield - target.barrier, text: 'Added barrier.' }); target.barrier = shield; }
      if (hasCap(data, hero.id, 'twinheal')) {
        const ratio = (h: HeroState) => h.hp / data.heroes.find(d => d.id === h.id)!.maxHp;
        const other = state.heroes.filter(h => h.hp > 0 && h.id !== target.id && ratio(h) < 1).reduce<HeroState | undefined>((low, h) => !low || ratio(h) < ratio(low) ? h : low, undefined);
        if (other) heal(other.id, Math.floor(skill.power / 2));
      }
      if(target.id!==hero.id&&target.hp>hpBefore)bossBarrier(state,data,hero.id,target.id,'lantern',events);
      break;
    }
    case 'prayer':
      for (const h of state.heroes) heal(h.id, skill.power);
      // Long prayer (tree modifier): half of it heals again as the next round begins.
      if (hasCap(data, hero.id, 'longprayer')) state.prayerEcho = { heroId: hero.id, round: state.round + 1, amount: Math.floor(skill.power / 2) };
      break;
  }
  // Saint converts only HP removed by its direct command, once, before outcome/turn advancement.
  // No conversion from equipment retaliation, leech, overkill or another actor's damage.
  if (hero.role === 'Saint' && directDamage > 0 && actor.hp > 0) {
    const ratio = (h: HeroState) => h.hp / data.heroes.find(d => d.id === h.id)!.maxHp;
    let injured = state.heroes.filter(h => h.id !== hero.id && h.hp > 0 && ratio(h) < 1).sort((a, b) => ratio(a) - ratio(b));
    if (hasCap(data, hero.id, 'thiran2')) injured = [...injured.filter(h => data.heroes.find(d => d.id === h.id)!.lane === 'front'), ...injured.filter(h => data.heroes.find(d => d.id === h.id)!.lane !== 'front')];
    let percent = saintRatioOf(data, hero.id, command.action);
    if (command.action === 'vowstrike' && injured.some(h => ratio(h) * 100 < (capAmount(data, hero.id, 'vowThreshold') || 40))) percent = 45;
    if (command.action === 'saintstrike' && livingBefore.some(id => state.enemies.find(e => e.id === id)!.hp <= 0) && hasCap(data, hero.id, 'saintFinish')) percent = capAmount(data, hero.id, 'saintFinish');
    const total = Math.floor(directDamage * percent / 100);
    const share = command.action === 'sharewound';
    const count = share && hasCap(data, hero.id, 'shareThree') ? 3 : share || hasCap(data, hero.id, 'thiran4') ? 2 : 1;
    injured = injured.slice(0, count);
    let left = total;
    injured.forEach((h, i) => {
      const priority = share && i === 0 && injured.length === 2 ? capAmount(data, hero.id, 'metta3') || capAmount(data, hero.id, 'sharePriority') : 0;
      const part = i === injured.length - 1 ? left : priority ? Math.floor(total * priority / 100) : Math.floor(total / injured.length);
      left -= part;
      // Conversion cannot become an overflow shield; only actual missing HP is restored.
      const amount = Math.min(part, data.heroes.find(d => d.id === h.id)!.maxHp - h.hp);
      if (amount > 0) { h.hp += amount; events.push({ type: 'heal', sourceId: hero.id, targetId: h.id, amount, text: 'Damage becomes an ally’s life.' }); }
    });
  }
  // A levelled skill without numbers shields its user (tomes).
  const shield = levelBarrier(data, hero.id, command.action); if (shield && actor.hp > 0) barrier(actor, shield);
  const cooldown = command.action === 'volley' && hasPassive(data, hero.id, 'tailwind') || command.action === 'haste' && hasCap(data, hero.id, 'quickbrew')
    || command.action === 'prayer' && hasCap(data, hero.id, 'quickprayer') || command.action === 'knives' && hasCap(data, hero.id, 'quickknives') ? skill.cooldown - 1 : skill.cooldown;
  // Star-veil set (4 pieces): the battle's first skill with a cooldown is ready again at once.
  const effectiveCooldown = Math.max(0, cooldown + cooldownAdjustment);
  const free = !!effectiveCooldown && !!hero.gear?.freeCast && !state.freeCast?.includes(hero.id);
  if (free) state.freeCast = [...state.freeCast ?? [], hero.id];
  else if (effectiveCooldown) actor.cooldowns[command.action] = state.round + effectiveCooldown;
  // Duelist relentless (talent): downing an enemy readies her precision strike again.
  const downed = livingBefore.some(id => state.enemies.find(e => e.id === id)!.hp <= 0);
  if (hasCap(data, hero.id, 'relentless') && downed) delete actor.cooldowns.execute;
  // Archer chase (capstone): downing an enemy readies her hindering shot again.
  if (hasCap(data, hero.id, 'chase') && downed) delete actor.cooldowns.hinder;
  // Scout silent end (capstone): a backstab that downs a foe readies her ambush again.
  if (command.action === 'backstab' && hasCap(data, hero.id, 'silentend') && downed) delete actor.cooldowns.ambush;
  state.commands.push({ ...command });
  const frame = structuredClone(state); finishOrAdvance(state, data, events);
  if (state.outcome !== 'active') { frame.outcome = state.outcome; frame.intent = null; }
  turns.push({ actorId: hero.id, side: 'hero', beat: initial.beat, round: initial.round, action: command.action, targetId: command.targetId, intent: initial.intent, state: frame, events, ...(presentation ? {before: structuredClone(initial), after: structuredClone(state)} : {}) });
  automaticTurns(state, data, turns, presentation);
  return { initial, state, turns, events: turns.flatMap(t => t.events) };
}
export const previewCommand = resolveCommand;
export function replay(data: EncounterDefinition, commands: readonly Command[], entry?: BattleEntry): BattleState {
  return commands.reduce((state, command) => resolveCommand(state, data, command).state, createBattle(data, entry));
}
