import type { UnitClip, UnitFrames } from './unit-frames';
import type { Reaction, UnitPose } from './unit-animation-map';

// Small renderer port: no Phaser dependency, rules, timers, saves or input hit zones.
export interface UnitBody {
  x: number; y: number; rotation: number; scaleX: number; scaleY: number;
  setPosition(x: number, y: number): unknown;
  setRotation(rotation: number): unknown;
  setScale(x: number, y: number): unknown;
}
interface Binding { body: UnitBody; x: number; y: number; rotation: number; sx: number; sy: number; size: number; frames?: UnitFrames; idle(paused: boolean): void }
interface Motion { pose: UnitPose | Reaction; direction: number; elapsed: number; duration: number; phase: 'prepare' | 'recover' | 'reaction'; clip?: UnitClip }
export class UnitAnimation {
  private bindings = new Map<string, Binding>();
  private motions = new Map<string, Motion>();
  bind(id: string, body: UnitBody, size: number, idle: Binding['idle'], frames?: UnitFrames): void {
    this.bindings.set(id, { body, x: body.x, y: body.y, rotation: body.rotation, sx: body.scaleX, sy: body.scaleY, size, idle, frames });
  }
  begin(id: string, pose: UnitPose, direction: number, contactMs: number, clip?: UnitClip): void {
    this.start(id, { pose, direction, elapsed: 0, duration: contactMs, phase: 'prepare', clip });
  }
  contact(id: string, remainingMs: number): void {
    const motion = this.motions.get(id);
    if (motion && remainingMs <= 0) {
      const rig = this.bindings.get(id)!;
      this.restore(rig); rig.idle(false); this.motions.delete(id); return;
    }
    if (motion) { motion.phase = 'recover'; motion.elapsed = 0; motion.duration = Math.min(motion.clip ? 260 : 240, remainingMs); this.bindings.get(id)?.frames?.show(motion.pose, 'recover', 0, motion.clip); }
  }
  react(id: string, pose: Reaction, direction: number, remainingMs: number): void {
    this.start(id, { pose, direction, elapsed: 0, duration: Math.min(pose === 'down' ? 320 : 200, remainingMs), phase: 'reaction' });
  }
  private start(id: string, motion: Motion): void {
    const rig = this.bindings.get(id);
    if (!rig || motion.duration <= 0) return;
    this.restore(rig); rig.idle(true);
    this.motions.set(id, motion);
    rig.frames?.show(motion.pose, motion.phase, 0, motion.clip);
  }
  private restore(rig: Binding): void {
    rig.frames?.reset();
    rig.body.setPosition(rig.x, rig.y); rig.body.setRotation(rig.rotation); rig.body.setScale(rig.sx, rig.sy);
  }
  update(delta: number): void {
    for (const [id, motion] of this.motions) {
      const rig = this.bindings.get(id)!;
      motion.elapsed += Math.max(0, delta);
      const p = Math.min(1, motion.elapsed / motion.duration);
      // Prepare holds at the contact pose if render time reaches the cue first.
      const weight = motion.phase === 'prepare' ? Math.sin(p * Math.PI / 2) : motion.phase === 'recover' ? 1 - p : Math.sin(p * Math.PI);
      const d = motion.direction || 1, scale = Math.min(1.25, rig.size / 96);
      let x = 0, y = 0, angle = 0, squash = 0;
      switch (motion.pose) {
        case 'slash': x = 13; angle = .08; break;
        case 'thrust': case 'punch': x = 18; angle = .04; break;
        case 'charge': x = 20; angle = .07; break;
        case 'pounce': x = 16; y = -8; break;
        case 'smash': y = -4; angle = -.10; break;
        case 'shoot': x = -6; angle = -.06; break;
        case 'throw': x = -4; angle = -.12; break;
        case 'cast': y = -5; angle = -.025; break;
        case 'guard': x = -3; squash = .025; break;
        case 'song': angle = .06; y = -2; break;
        case 'dance': x = 5; y = -5; angle = .10; break;
        case 'hit': x = -7; angle = -.06; break;
        case 'dodge': x = -13; y = -4; break;
        case 'block': x = -2; squash = .02; break;
        case 'down': y = 6; angle = -.18; break;
        case 'counter': x = 10; angle = .07; break;
      }
      const framed = rig.frames?.show(motion.pose, motion.phase, p, motion.clip);
      if (framed) { angle = 0; squash = 0; if (motion.phase === 'reaction') { x = 0; y = 0; } }
      rig.body.setPosition(rig.x + x * d * weight * scale, rig.y + y * weight * scale);
      rig.body.setRotation(rig.rotation + angle * d * weight);
      rig.body.setScale(rig.sx * (1 + squash * weight), rig.sy * (1 - squash * weight));
      if (p === 1 && motion.phase !== 'prepare') { this.restore(rig); rig.idle(false); this.motions.delete(id); }
    }
  }
  settle(): void {
    this.motions.clear();
    for (const rig of this.bindings.values()) { this.restore(rig); rig.idle(false); }
  }
  reset(id: string): void {
    this.motions.delete(id);
    const rig = this.bindings.get(id);
    if (rig) { this.restore(rig); rig.idle(false); }
  }
  clear(): void { this.settle(); this.bindings.clear(); }
}
