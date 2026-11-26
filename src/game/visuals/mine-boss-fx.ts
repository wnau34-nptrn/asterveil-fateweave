import type { BattleEvent, BattleState, EncounterDefinition, TurnStage } from '../../core/battle/types';
import type { FxContext } from './bolt-fx';
import art from './mine-boss-art.json';

// Map 5 Crystal Giant VFX (ART-UNIT-ANIMATION-MINE-BOSS-001 4b, owner-approved R1 at 1.32× the stone golem). Every layer is
// chosen from resolver events or state, never from the intent alone: the armour shows only while the foe really has
// `crystalArmor`, its crack level is the number of counted hits, it breaks on the real break event and fades on the real
// expiry; reflect runs from the giant to the caster that really took reflected damage; the collapse paints at the feet of
// each hero the move really struck; the split burst plays on the real phase turn.
export const MINE_BOSS_ATLAS = 'mine-boss-fx';
export const mineBossAtlasUrls = (): [string, string] => [`${import.meta.env.BASE_URL}assets/fx/mine_boss_fx.webp`, `${import.meta.env.BASE_URL}assets/fx/mine_boss_fx.json`];
type Frame = keyof typeof art;
const mineMoves = new Set(['Crystal Armor', 'Crystal Collapse', 'Crystal Split']);
export const isMineBossMove = (move: string | undefined): boolean => !!move && mineMoves.has(move);
export const usesMineBossFx = (data: EncounterDefinition): boolean => data.enemies.some(e => e.crystalArmor) || data.intents.some(i => i.crystalCollapse);

// The armour layer is drawn over the giant's body (frame 0 bounds in the 768 cell: rows 100..672, centred): its centre sits
// this fraction of the drawn cell above the soles and it spans this fraction of the drawn cell (Codex storyboard: 192 px over
// a 223 px cell at 390 px).
export const ARMOR_RISE = (672 - 386) / 768;
export const ARMOR_WIDTH = .86;
// The armour frame the foe's current state shows: whole while no counted hit has landed, then one crack level per hit.
export function armorFrame(state: BattleState, data: EncounterDefinition, id: string): Frame | undefined {
  const foe = state.enemies.find(e => e.id === id), def = data.enemies.find(e => e.id === id)?.crystalArmor;
  if (!foe?.crystalArmor || foe.hp <= 0 || foe.absent || !def) return;
  const cracks = Math.max(0, def.hits - foe.crystalArmor.hits);
  return cracks ? `armor-crack-${Math.min(3, cracks)}` as Frame : 'armor-lift';
}

// ---- Cues from one resolved turn ----
export type MineCue =
  | { kind: 'rise'; id: string }
  | { kind: 'crack'; id: string; frame: Frame }
  | { kind: 'break'; id: string }
  | { kind: 'expire'; id: string }
  | { kind: 'reflect'; id: string; casterId: string; event: BattleEvent }
  | { kind: 'collapse'; id: string; event: BattleEvent }
  | { kind: 'split'; id: string };
const text = (e: BattleEvent, copy: string) => e.text === copy;
export function mineCues(turn: TurnStage, data: EncounterDefinition): MineCue[] {
  if (!usesMineBossFx(data)) return [];
  const cues: MineCue[] = [], cancelled = turn.events.some(e => e.type === 'cancel');
  for (const e of turn.events) {
    if (e.type === 'buff' && text(e, 'Crystal armor rises.') && e.sourceId) cues.push({ kind: 'rise', id: e.sourceId });
    else if (e.type === 'dispel' && text(e, 'Crystal armor breaks.') && e.targetId) cues.push({ kind: 'break', id: e.targetId });
    else if (e.type === 'dispel' && text(e, 'Crystal armor expires.') && e.targetId) cues.push({ kind: 'expire', id: e.targetId });
    else if (e.type === 'damage' && text(e, 'Crystal armor reflects magic.') && e.sourceId && e.targetId) cues.push({ kind: 'reflect', id: e.sourceId, casterId: e.targetId, event: e });
  }
  // A counted hit lowers `hits` without its own event; a breaking hit is shown by the break instead.
  const after = turn.after ?? turn.state;
  for (const foe of turn.before?.enemies ?? []) {
    const was = foe.crystalArmor?.hits, now = after.enemies.find(e => e.id === foe.id)?.crystalArmor?.hits;
    const frame = armorFrame(after, data, foe.id);
    if (was !== undefined && now !== undefined && now < was && frame) cues.push({ kind: 'crack', id: foe.id, frame });
  }
  if (turn.side === 'enemy' && !cancelled && turn.intent?.crystalCollapse) {
    for (const e of turn.events) if (e.type === 'damage' && e.sourceId === turn.actorId && e.targetId) cues.push({ kind: 'collapse', id: e.targetId, event: e });
  }
  // The split is an immediate phase: it lands on whichever turn drops the giant below half (usually a hero's).
  for (const e of turn.events) if (e.type === 'phase' && text(e, 'Crystal Split') && e.sourceId) cues.push({ kind: 'split', id: e.sourceId });
  return cues;
}

// ---- Painting ----
// `drawn`: the giant's drawn cell (slot size × display ratio); `x`/`feetY`: its soles on screen.
export interface MineBody { x: number; feetY: number; drawn: number }
export interface MinePoint { x: number; y: number; feetY: number }
export type MineLookup = { body: (id: string) => MineBody | undefined; point: (id: string) => MinePoint | undefined };
function paint(ctx: FxContext, name: Frame, x: number, y: number, w: number, h = w): Phaser.GameObjects.Image {
  const [u, v] = art[name].anchor;
  const img = ctx.scene.add.image(x, y, MINE_BOSS_ATLAS, name).setOrigin(u, v).setScale(w / 256, h / 256);
  img.setData('mineFrame', name); ctx.add(img); return img;
}
const armorAt = (b: MineBody) => ({ x: b.x, y: b.feetY - b.drawn * ARMOR_RISE, w: b.drawn * ARMOR_WIDTH });
// Plays frames in order over their own timings, squeezed into `life`. Reduced motion holds the last frame (or `still`).
function sequence(ctx: FxContext, frames: readonly Frame[], place: (name: Frame) => Phaser.GameObjects.Image, life: number, still?: Frame, opacity = 1): void {
  if (ctx.reduced) {
    const img = place(still ?? frames[frames.length - 1]!).setAlpha(opacity * .9);
    ctx.scene.tweens.add({ targets: img, alpha: 0, delay: Math.min(life, 220), duration: 1, onComplete: () => img.destroy() });
    return;
  }
  const total = frames.reduce((n, f) => n + art[f].ms, 0), k = Math.min(1, Math.max(1, life) / Math.max(1, total));
  let t = 0;
  frames.forEach((name, i) => {
    const img = place(name).setAlpha(0), d = art[name].ms * k, last = i === frames.length - 1;
    ctx.scene.tweens.add({ targets: img, alpha: opacity * (ctx.quiet ? .8 : 1), delay: t, duration: 1 });
    ctx.scene.tweens.add({ targets: img, alpha: 0, delay: t + d, duration: last ? Math.max(1, Math.min(160, life - t - d)) : 1, onComplete: () => img.destroy() });
    t += d;
  });
}
// Windup cues: the armour gathers on the giant, the collapse warns at each hero it will strike. A cancelled turn paints nothing.
export function minePrepare(ctx: (id: string) => FxContext, turn: TurnStage, data: EncounterDefinition, at: MineLookup, contactMs: number): boolean {
  if (turn.side !== 'enemy' || !isMineBossMove(turn.intent?.name) || !usesMineBossFx(data)) return false;
  if (turn.events.some(e => e.type === 'cancel')) return true;
  const fx = ctx(turn.actorId);
  if (fx.reduced) return true;
  const show = (img: Phaser.GameObjects.Image, to: number) => {
    img.setAlpha(.15).setData('minePrepare', true);
    fx.scene.tweens.add({ targets: img, alpha: fx.quiet ? to * .7 : to, duration: Math.max(1, contactMs) });
  };
  if (turn.intent!.name === 'Crystal Armor' && turn.events.some(e => e.type === 'buff' && e.sourceId === turn.actorId)) {
    const b = at.body(turn.actorId); if (b) { const a = armorAt(b); show(paint(fx, 'armor-lift', a.x, a.y, a.w * .92), .55); }
  }
  if (turn.intent!.crystalCollapse) {
    for (const cue of mineCues(turn, data)) if (cue.kind === 'collapse') {
      const p = at.point(cue.id), c = ctx(cue.id); if (p) show(paint(c, 'collapse-0', p.x, p.feetY, 66 * c.scale, 82 * c.scale), 1);
    }
  }
  return true;
}
export function mineContact(ctx: (id: string) => FxContext, cues: readonly MineCue[], at: MineLookup, life: number): void {
  for (const cue of cues) {
    const fx = ctx(cue.id);
    if (cue.kind === 'collapse') {
      const p = at.point(cue.id); if (!p) continue;
      const w = 66 * fx.scale, h = 82 * fx.scale;
      sequence(fx, ['collapse-1', 'collapse-2'], name => paint(fx, name, p.x, p.feetY, w, h), life, 'collapse-reduced');
      continue;
    }
    if (cue.kind === 'reflect') {
      const b = at.body(cue.id), c = at.point(cue.casterId); if (!b || !c) continue;
      const from = armorAt(b), su = art['reflect-0'].sourceUv[0]!, u = art['reflect-0'].anchor[0]!;
      const dx = from.x - c.x, dy = from.y - c.y, span = Math.hypot(dx, dy);
      const w = span / (su - u), h = 112 * fx.scale * .78;
      sequence(fx, ['reflect-0', 'reflect-1', 'reflect-2'], name => paint(fx, name, c.x, c.y, w, h).setRotation(Math.atan2(dy, dx)), life);
      continue;
    }
    const b = at.body(cue.id); if (!b) continue;
    const a = armorAt(b), place = (name: Frame) => paint(fx, name, a.x, a.y, a.w);
    if (cue.kind === 'rise') sequence(fx, ['armor-lift'], place, Math.min(life, 260), undefined, .9);
    else if (cue.kind === 'crack') sequence(fx, [cue.frame], place, Math.min(life, 240));
    else if (cue.kind === 'break') sequence(fx, ['armor-crack-3', 'armor-break'], place, life);
    else if (cue.kind === 'expire') sequence(fx, ['armor-fade-0', 'armor-fade-1', 'armor-fade-2'], place, life);
    else if (cue.kind === 'split') sequence(fx, ['split-release'], place, Math.min(life, 420));
  }
}
