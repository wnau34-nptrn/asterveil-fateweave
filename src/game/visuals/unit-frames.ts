import type { Reaction, UnitPose } from './unit-animation-map';
export type UnitClip = 'attack' | 'skill';
export type FramePhase = 'prepare' | 'recover' | 'reaction';
export interface UnitFrames {
  show(pose: UnitPose | Reaction, phase: FramePhase, progress: number, clip?: UnitClip): boolean;
  reset(): void;
}
export const pilotSheets = { tracer: 'lyra', foe_hunter: 'hunter' } as const;
export const pilotKey = (art: string): string | undefined => Object.hasOwn(pilotSheets, art) ? `unit-pilot-${pilotSheets[art as keyof typeof pilotSheets]}` : undefined;
export const pilotUrl = (name: string): string => `${import.meta.env.BASE_URL}assets/units/${name}_pilot.webp`;
export function pilotClip(art: string, action: string | undefined, intent: string | undefined): UnitClip | undefined {
  if (art === 'tracer') return action === 'attack' ? 'attack' : action === 'execute' ? 'skill' : undefined;
  if (art === 'foe_hunter') return intent === 'Raking Slash' ? 'attack' : intent === 'Shadow Knife' ? 'skill' : undefined;
  return undefined;
}
// 0 idle; 1..8 slash; 9..16 skill; 17..18 hurt; 19..21 down.
// Frame 5/13 is the contact pose. UI contact remains authoritative, never sprite FPS.
export function pilotFrame(pose: UnitPose | Reaction, phase: FramePhase, progress: number, clip?: UnitClip): number | undefined {
  // Owner feedback: a gentler frame cadence; contact/end cues stay fixed.
  const p = Math.max(0, Math.min(1, progress)) ** 1.08;
  if (phase === 'reaction') {
    if (pose === 'hit') return 17 + Math.min(1, Math.floor(p * 2));
    if (pose === 'down') return 19 + Math.min(2, Math.floor(p * 3));
    return undefined;
  }
  if (!clip) return undefined;
  const offset = clip === 'attack' ? 1 : 9;
  return offset + (phase === 'prepare' ? Math.min(3, Math.floor(p * 4)) : 4 + Math.min(3, Math.floor(p * 4)));
}
