// Hero idle life (owner 2026-11-27): a gentle breath for every hero, slower while HP is low. Presentation only: it
// reads the shown state the scene passes in, drives the hero's own sprite (never the body container the attack motions
// own, never the DOM hit zones or HP labels) and is computed per frame, so there is no looping tween to pile up across
// repaints. All numbers are drafts.
//
// Owner 2026-11-27 (“มันตลกอ่ะ” → “เก็บข้อ 3 ไว้ เอาเข้าเกมได้”): stretching, swaying, floating or tilting the flat
// painted sprite read as rubbery, so per-class rhythms, the low-HP hunch, the turn owner's step and the skill lean were
// removed. Real standing loops and cheers are drawn by Codex (ART-UNIT-ANIMATION-LIFE-001); a hero whose art brings its
// own `idleLoop` skips this code breath entirely.

export interface LifeSprite {
  x: number; y: number; rotation: number; scaleX: number; scaleY: number;
  setPosition(x: number, y: number): unknown;
  setRotation(rotation: number): unknown;
  setScale(x: number, y: number): unknown;
}
// The breath the heroes had before (scaleY +2.2% / scaleX −0.8%, ~3.6 s a breath). Low HP slows it (tired).
export const BREATH = { period: 3600, swell: .022, narrow: .008 } as const;
export const LOW_HP = .3;
export const LOW_HP_SLOWER = 1.5;
export interface LifeState { alive: boolean; low: boolean }
export interface LifeOffset { sx: number; sy: number }

/** The scale offset at time t (ms) for one hero; `low` (0..1) blends in the slower breath. */
export function breathAt(t: number, phase: number, low: number): LifeOffset {
  const period = BREATH.period * (1 + (LOW_HP_SLOWER - 1) * low);
  const k = .5 - .5 * Math.cos(((t + phase) / period) * Math.PI * 2);
  return { sx: -BREATH.narrow * k, sy: BREATH.swell * k };
}

interface Rig { sprite: LifeSprite; sx: number; sy: number; breathe: boolean; phase: number; state: LifeState; paused: boolean; clock: number; w: { on: number; low: number } }
// Blend low HP in and life back after a motion over this time (ms), so nothing snaps.
const EASE_MS = 240;
export class HeroLife {
  private rigs = new Map<string, Rig>();
  private enabled = true;
  /** `codeBreath` false: the art has its own standing loop. */
  bind(id: string, sprite: LifeSprite, codeBreath: boolean): void {
    let phase = 0; for (const ch of id) phase = (phase * 31 + ch.charCodeAt(0)) % 997;
    this.rigs.set(id, { sprite, sx: sprite.scaleX, sy: sprite.scaleY, breathe: codeBreath, phase: phase * 3, clock: 0,
      state: { alive: true, low: false }, paused: false, w: { on: 1, low: 0 } });
  }
  set(id: string, state: LifeState): void {
    const rig = this.rigs.get(id); if (!rig) return;
    // A hero who falls lets go at once: the down frame owns the sprite.
    if (!state.alive && rig.state.alive) { this.restore(rig); rig.w.on = 0; }
    rig.state = state;
  }
  /** A pose or reaction owns the unit: it starts from the rest pose and life fades back in after it. */
  pause(id: string, paused: boolean): void {
    const rig = this.rigs.get(id); if (!rig) return;
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
    const dt = Math.max(0, Math.min(100, delta)), k = Math.min(1, dt / EASE_MS);
    for (const rig of this.rigs.values()) {
      const s = rig.state, w = rig.w;
      if (!s.alive || !rig.breathe) continue;
      w.on += ((rig.paused ? 0 : 1) - w.on) * k; w.low += ((s.low ? 1 : 0) - w.low) * k;
      if (rig.paused) continue;
      // Each rig keeps its own clock, slowed while low, so a slower breath never jumps phase.
      rig.clock += dt / (1 + (LOW_HP_SLOWER - 1) * w.low);
      const o = breathAt(rig.clock, rig.phase, 0);
      rig.sprite.setScale(rig.sx * (1 + o.sx * w.on), rig.sy * (1 + o.sy * w.on));
    }
  }
  private restore(rig: Rig): void { rig.sprite.setScale(rig.sx, rig.sy); }
  clear(): void { for (const rig of this.rigs.values()) this.restore(rig); this.rigs.clear(); }
  /** Test/QA view of a hero's blended weights. */
  weights(id: string): Readonly<Rig['w']> | undefined { return this.rigs.get(id)?.w; }
}
