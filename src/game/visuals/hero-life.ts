// Hero idle life (owner 2026-11-27, items 1–3): a per-class standing rhythm, a low-HP slump and the turn owner's ready
// posture. Presentation only: it reads the shown state the scene passes in, drives the hero's own sprite (never the
// body container the attack motions own, never the DOM hit zones or HP labels) and is computed per frame, so there is
// no looping tween to pile up across repaints. All numbers are drafts.
//
// A hero whose art brings its own standing loop (`idleLoop`, ART-UNIT-ANIMATION-LIFE-001) keeps only the posture layer
// (ready, lean, slump); the code rhythm steps aside so the drawn loop is not doubled.

export interface LifeSprite {
  x: number; y: number; rotation: number; scaleX: number; scaleY: number;
  setPosition(x: number, y: number): unknown;
  setRotation(rotation: number): unknown;
  setScale(x: number, y: number): unknown;
}
// period: one breath (ms). breathe: scaleY swell. bob: vertical float (px at size 96). shift: weight shift sideways (px).
// sway: rotation (rad) at the feet. bounce: bob uses |sin| (on the toes) instead of a smooth float.
export interface LifeStyle { period: number; breathe: number; bob: number; shift: number; sway: number; bounce?: boolean }
const steady: LifeStyle = { period: 1900, breathe: .016, bob: 0, shift: 0, sway: 0 };
export const LIFE_STYLES: Readonly<Record<string, LifeStyle>> = {
  // Front line: slow, heavy, grounded.
  Knight: { period: 2800, breathe: .018, bob: 0, shift: 0, sway: 0 },
  Warden: { period: 2600, breathe: .017, bob: 0, shift: .4, sway: 0 },
  Spear: { period: 2200, breathe: .014, bob: 0, shift: .8, sway: .006 },
  // Quick fighters: light on the feet.
  Martial: { period: 1500, breathe: .010, bob: 1.3, shift: 0, sway: 0, bounce: true },
  Duelist: { period: 1800, breathe: .010, bob: 0, shift: 1.3, sway: .010 },
  Scout: { period: 1500, breathe: .010, bob: .8, shift: .8, sway: 0, bounce: true },
  // Archer: weight from foot to foot.
  Archer: { period: 2200, breathe: .012, bob: 0, shift: 1.6, sway: .012 },
  // Casters: a small float.
  Mage: { period: 2400, breathe: .008, bob: 2.0, shift: 0, sway: 0 },
  Hexer: { period: 2500, breathe: .008, bob: 1.5, shift: 0, sway: .008 },
  Seer: { period: 2800, breathe: .008, bob: 2.2, shift: 0, sway: 0 },
  Saint: { period: 2700, breathe: .010, bob: 1.2, shift: 0, sway: 0 },
  Priest: { period: 2500, breathe: .013, bob: .6, shift: 0, sway: 0 },
  Alchemist: { period: 1900, breathe: .012, bob: 0, shift: .8, sway: .006 },
  // Music: swaying to a beat.
  Bard: { period: 1700, breathe: .010, bob: .5, shift: 0, sway: .022 },
  Dancer: { period: 1100, breathe: .008, bob: 1.0, shift: .6, sway: .028, bounce: true },
};
export const lifeStyle = (role: string | undefined): LifeStyle => LIFE_STYLES[role ?? ''] ?? steady;
// Low HP (draft): under this share of max HP the hero breathes faster and hunches.
export const LOW_HP = .3;
export type Lean = 'foe' | 'ally' | 'self';
export interface LifeState { alive: boolean; low: boolean; ready: boolean; relaxed: boolean; lean?: Lean }
export interface LifeOffset { x: number; y: number; rotation: number; sx: number; sy: number }
const TAU = Math.PI * 2;
// Blend toward the posture targets over this time (ms), so the turn handover never snaps.
const EASE_MS = 180;

/** The offset at time t (ms) for one hero. `w` mixes postures in (0..1 each), `dir` = facing (+1 toward the foes). */
export function lifeOffset(style: LifeStyle | undefined, t: number, phase: number, w: { low: number; ready: number; relaxed: number; foe: number; ally: number; self: number }, dir: number, scale: number): LifeOffset {
  let x = 0, y = 0, rotation = 0, sx = 0, sy = 0;
  if (style) {
    // Low HP: shorter, deeper breaths; floating casters sink toward the ground.
    const period = style.period * (1 - .4 * w.low), calm = 1 - .3 * w.relaxed;
    const a = ((t + phase) / period) * TAU, s = Math.sin(a);
    const breathe = style.breathe * (1 + .5 * w.low) * calm;
    sy += breathe * (.5 + .5 * s); sx -= breathe * .35 * (.5 + .5 * s);
    const bob = style.bob * (1 - .6 * w.low) * calm * scale;
    y -= style.bounce ? bob * Math.abs(Math.sin(a)) : bob * (.5 + .5 * Math.sin(a - .8));
    const side = Math.sin(a * .5);
    x += style.shift * calm * scale * side;
    rotation += style.sway * calm * side;
  }
  // Low HP slump: shoulders drop and the body tips forward a little.
  sy -= .028 * w.low; sx += .008 * w.low; rotation += .035 * dir * w.low; y += 1 * scale * w.low;
  // Turn owner: a half step out and standing tall; while a skill is chosen, lean toward its side.
  x += 3 * scale * dir * w.ready; sy += .014 * w.ready;
  x += 4 * scale * dir * w.foe; rotation += .05 * dir * w.foe;
  x -= 2 * scale * dir * w.ally; rotation -= .03 * dir * w.ally;
  sy += .018 * w.self; y -= 2 * scale * w.self;
  // Everyone else eases down while one hero is choosing.
  sy -= .008 * w.relaxed;
  return { x, y, rotation, sx, sy };
}

interface Rig { sprite: LifeSprite; x: number; y: number; rotation: number; sx: number; sy: number; style?: LifeStyle; dir: number; scale: number; phase: number;
  state: LifeState; paused: boolean; w: { on: number; low: number; ready: number; relaxed: number; foe: number; ally: number; self: number } }
export class HeroLife {
  private rigs = new Map<string, Rig>();
  private clock = 0;
  private enabled = true;
  /** `codeIdle` false: the art has its own standing loop, keep only the posture layer. */
  bind(id: string, sprite: LifeSprite, role: string | undefined, size: number, codeIdle: boolean, dir = 1): void {
    let phase = 0; for (const ch of id) phase = (phase * 31 + ch.charCodeAt(0)) % 997;
    this.rigs.set(id, { sprite, x: sprite.x, y: sprite.y, rotation: sprite.rotation, sx: sprite.scaleX, sy: sprite.scaleY,
      style: codeIdle ? lifeStyle(role) : undefined, dir, scale: Math.min(1.25, Math.max(.7, size / 96)), phase: phase * 7,
      state: { alive: true, low: false, ready: false, relaxed: false }, paused: false,
      w: { on: 1, low: 0, ready: 0, relaxed: 0, foe: 0, ally: 0, self: 0 } });
  }
  set(id: string, state: LifeState): void {
    const rig = this.rigs.get(id); if (!rig) return;
    // A hero who falls lets go at once: the down frame owns the sprite.
    if (!state.alive && rig.state.alive) { this.restore(rig); rig.w.on = 0; }
    rig.state = state;
  }
  /** A pose or reaction owns the unit: life fades out and back in around it. */
  pause(id: string, paused: boolean): void {
    const rig = this.rigs.get(id); if (!rig) return;
    // The motion starts from the rest pose (its frames and landmarks are measured there); life fades back in after it.
    if (paused && !rig.paused) { this.restore(rig); rig.w.on = 0; }
    rig.paused = paused;
  }
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) for (const rig of this.rigs.values()) { this.restore(rig); rig.w.on = 0; }
  }
  get active(): boolean { return this.enabled && this.rigs.size > 0; }
  update(delta: number): void {
    if (!this.enabled) return;
    const dt = Math.max(0, Math.min(100, delta)); this.clock += dt;
    const k = Math.min(1, dt / EASE_MS);
    for (const rig of this.rigs.values()) {
      const s = rig.state, w = rig.w;
      if (!s.alive) continue;
      const toward = (v: number, on: boolean) => v + ((on ? 1 : 0) - v) * k;
      w.on = toward(w.on, !rig.paused); w.low = toward(w.low, s.low); w.ready = toward(w.ready, s.ready);
      w.relaxed = toward(w.relaxed, s.relaxed); w.foe = toward(w.foe, s.lean === 'foe'); w.ally = toward(w.ally, s.lean === 'ally'); w.self = toward(w.self, s.lean === 'self');
      if (rig.paused) continue;
      const o = lifeOffset(rig.style, this.clock, rig.phase, w, rig.dir, rig.scale);
      rig.sprite.setPosition(rig.x + o.x * w.on, rig.y + o.y * w.on);
      rig.sprite.setRotation(rig.rotation + o.rotation * w.on);
      rig.sprite.setScale(rig.sx * (1 + o.sx * w.on), rig.sy * (1 + o.sy * w.on));
    }
  }
  private restore(rig: Rig): void {
    rig.sprite.setPosition(rig.x, rig.y); rig.sprite.setRotation(rig.rotation); rig.sprite.setScale(rig.sx, rig.sy);
  }
  clear(): void { for (const rig of this.rigs.values()) this.restore(rig); this.rigs.clear(); }
  /** Test/QA view of a hero's blended posture weights. */
  weights(id: string): Readonly<Rig['w']> | undefined { return this.rigs.get(id)?.w; }
}
