import type { BattleEvent, BattleState, EncounterDefinition, IntentDefinition, TurnStage } from '../../core/battle/types';
import { enemyIntent, nextIntentOf, phaseMoves } from '../../core/battle/engine';
import type { FxContext } from './bolt-fx';
import art from './boss-signature-art.json';

// Boss signature VFX and persistent charge telegraphs (AV07; ART-VFX-BOSS-SIGNATURE-001, one final design per move).
// Every cue is chosen from resolver state/events: a charge or phase never paints damage, an all-party move paints only the
// heroes it really struck, War Cry stays the Captain's offensive shout and Horn Charge/Stampede add no waiting turn.
export const BOSS_ATLAS = 'boss-signature-fx';
export const bossAtlasUrls = (): [string, string] => [`${import.meta.env.BASE_URL}assets/fx/boss_signature_fx.webp`, `${import.meta.env.BASE_URL}assets/fx/boss_signature_fx.json`];
type Route = 'charge' | 'single' | 'all' | 'caster' | 'summon';
// Move (intent or phase name) → how it is placed. Names are the content's real intent/phase names.
export const bossMoves: Readonly<Record<string, Route>> = {
  'Gather Thorns': 'charge', 'Thorn Bloom': 'single', 'Thorn Storm': 'single', 'Thorn Tempest': 'all', 'Thorn Rage': 'caster',
  'Rift Gathering': 'charge', 'Rift Wave': 'all', 'Rift Cataclysm': 'single', 'Rift Awakening': 'caster', 'Call the Rift': 'summon',
  'War Cry': 'single', 'Call the Hunt': 'summon', 'Horn Charge': 'single', Stampede: 'single',
};
export const slug = (name: string): string => name.toLowerCase().replace(/ /g, '-');
type Frame = keyof typeof art;
const frame = (name: string, beat: 'prepare' | 'peak' | 'settle'): Frame | undefined => {
  const key = `${slug(name)}_${beat}`; return Object.hasOwn(art, key) ? key as Frame : undefined;
};
// A move this module paints on the given turn (an enemy turn, not cancelled).
export function bossMove(turn: TurnStage): string | undefined {
  if (turn.side !== 'enemy' || !turn.intent || turn.events.some(e => e.type === 'cancel')) return;
  return Object.hasOwn(bossMoves, turn.intent.name) ? turn.intent.name : undefined;
}
export const usesBossSignature = (data: EncounterDefinition): boolean =>
  data.intents.some(i => Object.hasOwn(bossMoves, i.name)) || !!data.phases?.some(p => Object.hasOwn(bossMoves, p.name));

// ---- Persistent waiting-turn telegraph ----
// Held between a performed charge and its release. `unstoppable` (rigid toothed brackets) when the announced release is
// unstoppable; `normal` (open breathing curves) otherwise. It never marks the zero-damage charge itself uninterruptible.
export interface ChargeHold { enemyId: string; charge: string; release: string; kind: 'normal' | 'unstoppable'; frame: string }
// `acted`: the actor whose shown turn has already resolved. A turn's `after` snapshot still has that actor at the turn
// index, so its next move is the following round's, not the one it just made.
export function chargeHolds(state: BattleState, data: EncounterDefinition, acted?: string): ChargeHold[] {
  if (state.outcome !== 'active') return [];
  return state.enemies.flatMap(foe => {
    if (foe.absent || foe.hp <= 0) return [];
    const done = acted === foe.id && state.order[state.turnIndex] === foe.id;
    const next = done ? enemyIntent(state, data, foe.id, state.round + 1) : nextIntentOf(state, data, foe.id);
    if (!next || next.special) return [];
    const moves: IntentDefinition[] = phaseMoves(state, data, foe.id);
    const index = ((next.round - (foe.phaseRound ?? 0) - 1) % moves.length + moves.length) % moves.length;
    const charge = moves[(index - 1 + moves.length) % moves.length];
    // The charge must have been the boss's previous turn in this cycle, performed (not sealed/interrupted) this phase.
    if (!charge?.charge || moves.length < 2 || next.round - 1 <= (foe.phaseRound ?? 0) || foe.interruptedRound === next.round - 1) return [];
    const kind = next.unstoppable ? 'unstoppable' as const : 'normal' as const;
    return [{ enemyId: foe.id, charge: charge.name, release: next.name, kind, frame: `${slug(kind === 'unstoppable' ? next.name : charge.name)}_prepare` }];
  });
}

// ---- One-shot move cues ----
export interface BossCue { move: string; beat: 'peak'; at: 'caster' | 'target' | 'summoned'; id: string; event?: BattleEvent; outcome: 'hit' | 'blocked' | 'dodged' | 'none' }
// Contact cues own actual events only: struck/dodging heroes for attacks, the phase event for a phase, each summon event.
export function bossCues(turn: TurnStage): BossCue[] {
  const move = bossMove(turn); if (!move) return [];
  const route = bossMoves[move]!, actor = turn.actorId;
  if (route === 'charge') return turn.events.some(e => e.type === 'charge' && e.sourceId === actor) ? [{ move, beat: 'peak', at: 'caster', id: actor, outcome: 'none' }] : [];
  if (route === 'caster' || route === 'summon') {
    if (!turn.events.some(e => e.type === 'phase' && e.sourceId === actor)) return [];
    if (route === 'caster' || move === 'Call the Hunt') return [{ move, beat: 'peak', at: 'caster', id: actor, outcome: 'none' }];
    return turn.events.flatMap(e => e.type === 'summon' && e.sourceId === actor && e.targetId ? [{ move, beat: 'peak' as const, at: 'summoned' as const, id: e.targetId, event: e, outcome: 'none' as const }] : []);
  }
  return turn.events.flatMap(e => e.sourceId === actor && e.targetId && (e.type === 'damage' || e.type === 'dodge')
    ? [{ move, beat: 'peak' as const, at: 'target' as const, id: e.targetId, event: e,
      outcome: e.type === 'dodge' ? 'dodged' as const : (e.amount ?? 0) > 0 ? 'hit' as const : 'blocked' as const }] : []);
}

// ---- Painting ----
// `side`: the direction the unit faces (+1 right for heroes, -1 left for foes).
export interface BossPoint { x: number; y: number; feetY: number; size: number; side: 1 | -1 }
export type BossLookup = (id: string) => BossPoint | undefined;
const NORMAL = 0;
// Display width at a 390px field (Codex's suggested widths), scaled with the slot like the other painted families.
const width = (ctx: FxContext, name: Frame) => art[name].width * ctx.scale / (111 / 96);
function paint(ctx: FxContext, name: Frame, x: number, y: number): Phaser.GameObjects.Image {
  const img = ctx.scene.add.image(x, y, BOSS_ATLAS, name), pivot = art[name].pivot;
  img.setOrigin(pivot[0]! / 256, pivot[1]! / 256).setScale(width(ctx, name) / 256).setBlendMode(NORMAL);
  img.setData('bossFrame', name); ctx.add(img); return img;
}
// Feet moves (Stampede) stand on the ground; everything else on the chest, the caster's just forward of it.
const spot = (p: BossPoint, move: string, caster: boolean) => move === 'Stampede'
  ? { x: p.x, y: p.feetY } : { x: p.x + (caster ? p.side * p.size * .27 : 0), y: p.y };
export function bossPrepare(ctx: FxContext, turn: TurnStage, lookup: BossLookup, contactMs: number): boolean {
  const move = bossMove(turn), name = move && frame(move, 'prepare'), at = lookup(turn.actorId);
  if (!move || !name || !at) return false;
  if (ctx.reduced) return true;
  const p = spot(at, move, true), img = paint(ctx, name, p.x, p.y).setAlpha(.2);
  img.setData('bossPrepare', true);
  ctx.scene.tweens.add({ targets: img, alpha: ctx.quiet ? .6 : .92, duration: Math.max(1, contactMs) });
  return true;
}
export function bossContact(ctx: FxContext, cue: BossCue, lookup: BossLookup, life: number): void {
  const peak = frame(cue.move, 'peak'), settle = frame(cue.move, 'settle');
  // War Cry's cone leaves the Captain's forward chest (its pivot is the cone's emission edge); the wisps settle on the target.
  const warCry = cue.move === 'War Cry', caster = cue.at === 'caster' || warCry;
  const source = warCry ? cue.event && lookup(cue.event.sourceId ?? '') : lookup(cue.id), target = lookup(cue.id);
  if (!peak || !settle || !source || !target) return;
  const dodged = cue.outcome === 'dodged', blocked = cue.outcome === 'blocked';
  const base = spot(source, cue.move, caster && cue.at !== 'summoned'), opacity = ctx.reduced ? .8 : ctx.quiet ? .7 : 1;
  const tint = (img: Phaser.GameObjects.Image) => { if (blocked) img.setTint(0x8addf5); return img; };
  // A dodged hit shows only the passing settle wisps beside the body, never the impact.
  const first = dodged ? undefined : tint(paint(ctx, peak, base.x, base.y).setAlpha(opacity));
  const end = warCry ? spot(target, cue.move, false) : base;
  const last = tint(paint(ctx, settle, end.x, end.y + (dodged ? target.size * .25 : 0)).setAlpha(0));
  if (ctx.reduced) { last.setAlpha(first ? 0 : opacity * .7); return; }
  const duration = Math.max(1, Math.min(life, 520));
  ctx.scene.tweens.addCounter({ from: 0, to: 1, duration, onUpdate: tw => {
    const t = tw.getValue() ?? 0;
    if (first?.active) first.setAlpha(opacity * Math.max(0, 1 - Math.max(0, t - .3) / .35));
    if (last.active) last.setAlpha(opacity * (dodged ? .6 : .85) * Math.sin(Math.min(1, Math.max(0, (t - .25) / .75)) * Math.PI));
  }, onComplete: () => { first?.destroy(); last.destroy(); } });
}
