import Phaser from 'phaser';
import type { BattleEvent, TurnStage } from '../../core/battle/types';
import type { FxContext } from './bolt-fx';

export const HEALING_ATLAS = 'healing-fx';
export const healingAtlasUrls = (): [string, string] => [`${import.meta.env.BASE_URL}assets/fx/healing_fx.webp`, `${import.meta.env.BASE_URL}assets/fx/healing_fx.json`];
export const healingSkills = ['heal', 'prayer', 'rouse', 'revive', 'bless', 'mend'] as const;
export type HealingSkill = typeof healingSkills[number];
export const isHealingSkill = (action: string | undefined): action is HealingSkill => healingSkills.some(skill => skill === action);
export interface HealingCue { kind: 'cast' | 'tick' | 'redirect' | 'barrier'; skill: HealingSkill; sourceId: string; targetId: string; event: BattleEvent }
export interface HealingPoint { x: number; y: number; footY: number }
export type HealingLookup = (id: string) => HealingPoint | undefined;

// Upkeep shares the ending actor's stage. Its existing event discriminator and authoritative
// pre-upkeep snapshot identify the real owner; the selected action/target cannot identify it.
export function healingCues(turn: TurnStage): HealingCue[] {
  const cues: HealingCue[] = [];
  const castSkill = turn.side === 'hero' && isHealingSkill(turn.action) ? turn.action : undefined;
  const cancelled = turn.events.some(e => e.type === 'cancel');
  const state = turn.state;
  for (const event of turn.events) {
    const { sourceId, targetId } = event;
    if (!sourceId || !targetId) continue;
    let skill: HealingSkill | undefined, kind: HealingCue['kind'] = 'cast';
    if (event.type === 'heal' && (event.amount ?? 0) > 0) {
      if (event.text === 'Renew.' && state.heroes.find(h => h.id === targetId)?.renew?.heroId === sourceId) { skill = 'bless'; kind = 'tick'; }
      else if (event.text === 'The song mends the party.' && state.song?.action === 'mend' && state.song.heroId === sourceId) { skill = 'mend'; kind = 'tick'; }
      else if (event.text === 'The prayer lingers.' && state.prayerEcho?.heroId === sourceId) { skill = 'prayer'; kind = 'tick'; }
      else if (!cancelled && sourceId === turn.actorId && (castSkill === 'heal' || castSkill === 'prayer') && event.text === 'Restored HP.') skill = castSkill;
    } else if (!cancelled && sourceId === turn.actorId && castSkill) {
      if (event.type === 'barrier' && (event.amount ?? 0) > 0) { skill = castSkill; kind = 'barrier'; }
      else if (castSkill === 'rouse' && event.type === 'guard' && state.guard?.all && state.guard.heroId === sourceId && state.guard.targetId === targetId) skill = castSkill;
      else if (castSkill === 'revive' && event.type === 'revive' && (event.amount ?? 0) > 0 && turn.before?.heroes.some(h => h.id === targetId && h.hp === 0 && h.fell)) skill = castSkill;
      else if (castSkill === 'bless' && event.type === 'buff' && state.heroes.find(h => h.id === targetId)?.renew?.heroId === sourceId) skill = castSkill;
      else if (castSkill === 'mend' && event.type === 'song' && state.song?.action === 'mend' && state.song.heroId === sourceId) skill = castSkill;
    }
    if (skill) cues.push({ kind, skill, sourceId, targetId, event });
    const guard = turn.before?.guard;
    // all=true remains valid for later attackers too. A dodge/cancel has no interception hit.
    if (!cancelled && turn.side === 'enemy' && event.type === 'damage' && guard?.all && guard.heroId === targetId
      && turn.intent?.targetId === guard.targetId && targetId !== guard.targetId
      && turn.before?.heroes.some(h => h.id === targetId && h.hp > 0)) {
      cues.push({ kind: 'redirect', skill: 'rouse', sourceId, targetId, event });
    }
  }
  return cues;
}
const scale = (ctx: FxContext) => ctx.scale / (111 / 96);
const gestures: Record<HealingSkill, number> = { heal: .04, prayer: .07, rouse: 0, revive: .09, bless: .025, mend: .06 };
function paint(ctx: FxContext, at: HealingPoint, strip: string, phase: string): Phaser.GameObjects.Image {
  const s = scale(ctx);
  // Real buff badges occupy the floor centre. Keep narrow seeds/brackets beside them.
  const offset = strip === 'rouse_protector' ? -20 : strip === 'rouse_ally' || strip === 'bless' || strip === 'barrier' ? 20 : 0;
  const image = ctx.scene.add.image(at.x + offset * s, at.footY + 34 * s, HEALING_ATLAS, `${strip}_${phase}`)
    .setOrigin(.5, .875).setDisplaySize(128 * s, 32 * s);
  ctx.add(image); return image;
}
export function healingPrepare(ctx: FxContext, cues: readonly HealingCue[], lookup: HealingLookup, contactMs: number): void {
  if (ctx.reduced) return;
  const cue = cues.find(c => c.kind === 'cast') ?? cues.find(c => c.kind === 'barrier');
  if (!cue) return;
  const at = lookup(cue.sourceId); if (!at) return;
  const strip = cue.kind === 'barrier' ? 'barrier' : cue.skill === 'rouse' ? 'rouse_protector' : cue.skill;
  const image = paint(ctx, at, strip, 'prepare').setAlpha(.18);
  if (cue.kind === 'barrier') image.setTint(0x8addf5);
  ctx.scene.tweens.add({ targets: image, alpha: ctx.quiet ? .42 : .72, duration: Math.max(1, contactMs), ease: 'Sine.In', onComplete: () => image.destroy() });
}
export function healingContact(ctx: FxContext, cue: HealingCue, lookup: HealingLookup, life: number): void {
  const at = lookup(cue.targetId); if (!at) return;
  const strip = cue.kind === 'barrier' ? 'barrier' : cue.skill === 'rouse' ? cue.kind === 'redirect' ? 'rouse_protector' : 'rouse_ally'
    : cue.kind === 'tick' && cue.skill !== 'prayer' ? `${cue.skill}_tick` : cue.skill;
  const draw = (point: HealingPoint, name: string) => {
    const opacity = ctx.reduced ? .55 : ctx.quiet ? .6 : .94;
    const peak = paint(ctx, point, name, 'peak').setAlpha(opacity);
    if (cue.kind === 'barrier') peak.setTint(0x8addf5);
    if (ctx.reduced) return;
    const tail = paint(ctx, point, name, 'tail').setAlpha(0);
    if (cue.kind === 'barrier') tail.setTint(0x8addf5);
    const sx = peak.scaleX, duration = Math.max(1, Math.min(life, 430));
    ctx.scene.tweens.add({ targets: peak, alpha: 0, duration, onUpdate: tween => {
      if (!peak.active || !tail.active) return;
      const p = tween.progress, blend = Phaser.Math.Clamp((p - .4) / .3, 0, 1);
      peak.scaleX = sx * (1 - gestures[cue.skill] * (ctx.quiet ? .4 : 1) * (1 - Math.min(1, p / .4)) ** 3);
      tail.scaleX = peak.scaleX;
      peak.alpha = opacity * (1 - blend); tail.alpha = (ctx.quiet ? .22 : .38) * blend * (1 - Phaser.Math.Clamp((p - .75) / .25, 0, 1));
    }, onComplete: () => { peak.destroy(); tail.destroy(); } });
  };
  draw(at, strip);
  if (cue.skill === 'rouse' && cue.kind === 'cast') { const source = lookup(cue.sourceId); if (source) draw(source, 'rouse_protector'); }
}
