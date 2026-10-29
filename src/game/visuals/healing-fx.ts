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
export interface HealingContext extends FxContext { addRim?(image: Phaser.GameObjects.Image): void }

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
const scale = (ctx: HealingContext) => ctx.scale / (111 / 96);
const gestures: Record<HealingSkill, number> = { heal: .06, prayer: .08, rouse: .02, revive: .1, bless: .04, mend: .08 };
// The core is centred on the rendered soles, not below the HP/status panel.
// Follow is refreshed after unit animation, so cast/reaction/idle offsets never detach the light.
function paint(ctx: HealingContext, lookup: HealingLookup, id: string, strip: string, phase: string, rim = false): Phaser.GameObjects.Image | undefined {
  const at = lookup(id); if (!at) return;
  const s = scale(ctx);
  const image = ctx.scene.add.image(at.x, at.footY, HEALING_ATLAS, `${strip}_${phase}`)
    .setOrigin(.5, .75).setDisplaySize(192 * s, 96 * s);
  image.setData('healingRise', 0); image.setData('healingRim', rim);
  if (rim) image.setCrop(0, 198, 576, 18);
  const follow = () => {
    const point = lookup(id); if (!point || !image.active) return;
    image.setPosition(point.x, point.footY + (rim ? 6 * s : 0) - (image.getData('healingRise') as number) * s);
  };
  image.setData('healingFollow', follow);
  follow();
  if (rim && ctx.addRim) ctx.addRim(image); else ctx.add(image);
  return image;
}
export function healingPrepare(ctx: HealingContext, cues: readonly HealingCue[], lookup: HealingLookup, contactMs: number): void {
  if (ctx.reduced) return;
  const cue = cues.find(c => c.kind === 'cast') ?? cues.find(c => c.kind === 'barrier');
  if (!cue) return;
  const strip = cue.kind === 'barrier' ? 'barrier' : cue.skill === 'rouse' ? 'rouse_protector' : cue.skill;
  const image = paint(ctx, lookup, cue.sourceId, strip, 'prepare'); if (!image) return;
  image.setAlpha(.3);
  const rim = paint(ctx, lookup, cue.sourceId, strip, 'prepare', true)?.setAlpha(.3);
  if (cue.kind === 'barrier') { image.setTint(0x8addf5); rim?.setTint(0x8addf5); }
  ctx.scene.tweens.add({ targets: [image, ...(rim ? [rim] : [])], alpha: ctx.quiet ? .6 : .88, duration: Math.max(1, contactMs), ease: 'Sine.In', onComplete: () => { image.destroy(); rim?.destroy(); } });
}
export function healingContact(ctx: HealingContext, cue: HealingCue, lookup: HealingLookup, life: number): void {
  const strip = cue.kind === 'barrier' ? 'barrier' : cue.skill === 'rouse' ? cue.kind === 'redirect' ? 'rouse_protector' : 'rouse_ally'
    : cue.kind === 'tick' && cue.skill !== 'prayer' ? `${cue.skill}_tick` : cue.skill;
  const draw = (id: string, name: string) => {
    const opacity = ctx.reduced ? .7 : ctx.quiet ? .74 : 1;
    const peak = paint(ctx, lookup, id, name, 'peak'); if (!peak) return;
    peak.setAlpha(opacity);
    const rim = paint(ctx, lookup, id, name, 'peak', true)?.setAlpha(opacity);
    if (cue.kind === 'barrier') { peak.setTint(0x8addf5); rim?.setTint(0x8addf5); }
    if (ctx.reduced) return;
    const tail = paint(ctx, lookup, id, name, 'tail')!;
    const wake = paint(ctx, lookup, id, name, 'tail')!;
    tail.setAlpha(0); wake.setAlpha(0);
    if (cue.kind === 'barrier') { tail.setTint(0x8addf5); wake.setTint(0x8addf5); }
    const sx = peak.scaleX, sy = peak.scaleY, duration = Math.max(1, life);
    // A clear core holds first; feathered tail and a delayed softer wake dissolve behind it.
    // Timing remains inside the existing stage, with no new hit, heal or delayed callback.
    ctx.scene.tweens.add({ targets: peak, alpha: 0, duration, onUpdate: tween => {
      if (!peak.active || !tail.active || !wake.active) return;
      const p = tween.progress, blend = Phaser.Math.Clamp((p - .4) / .32, 0, 1);
      const drift = ctx.quiet ? .35 : 1;
      peak.scaleX = sx * (1 - gestures[cue.skill] * drift * (1 - Math.min(1, p / .35)) ** 3);
      peak.alpha = opacity * (1 - blend); if (rim) rim.alpha = peak.alpha;
      const trailing = Phaser.Math.Clamp((p - .2) / .3, 0, 1) * (1 - Phaser.Math.Clamp((p - .65) / .35, 0, 1));
      const delayed = Phaser.Math.Clamp((p - .38) / .3, 0, 1) * (1 - Phaser.Math.Clamp((p - .72) / .28, 0, 1));
      tail.setScale(sx * (1 + .4 * p * drift), sy * (1 + .18 * p * drift));
      wake.setScale(sx * (1.12 + .35 * p * drift), sy * (1.12 + .2 * p * drift));
      tail.setData('healingRise', p * 7 * drift); wake.setData('healingRise', p * 13 * drift);
      tail.alpha = (ctx.quiet ? .55 : 1) * trailing; wake.alpha = (ctx.quiet ? .2 : .42) * delayed;
    }, onComplete: () => { peak.destroy(); rim?.destroy(); tail.destroy(); wake.destroy(); } });
  };
  draw(cue.targetId, strip);
  if (cue.skill === 'rouse' && cue.kind === 'cast') draw(cue.sourceId, 'rouse_protector');
}
