import type { Reaction, UnitPose } from './unit-animation-map';
import atlasManifest from './unit-atlases.json';
export type UnitClip = 'attack' | 'skill';
export type FramePhase = 'prepare' | 'recover' | 'reaction';
export interface UnitFrames {
  show(pose: UnitPose | Reaction, phase: FramePhase, progress: number, clip?: UnitClip, durationMs?: number): boolean;
  reset(): void;
}
export const pilotSheets = { tracer: 'lyra', foe_hunter: 'hunter' } as const;
export type PilotSheet = typeof pilotSheets[keyof typeof pilotSheets];
export const pilotKey = (art: string): string | undefined => Object.hasOwn(pilotSheets, art) ? `unit-pilot-${pilotSheets[art as keyof typeof pilotSheets]}` : undefined;
export const pilotUrl = (name: PilotSheet): string => `${import.meta.env.BASE_URL}assets/units/${atlasManifest[name].image}`;
export const pilotAtlasUrls = (name: PilotSheet): [string, string] => [pilotUrl(name), `${import.meta.env.BASE_URL}assets/units/${atlasManifest[name].atlas}`];
export function pilotClip(art: string, action: string | undefined, intent: string | undefined): UnitClip | undefined {
  if (art === 'tracer') return action === 'attack' ? 'attack' : action === 'execute' ? 'skill' : undefined;
  if (art === 'foe_hunter') return intent === 'Raking Slash' ? 'attack' : intent === 'Shadow Knife' ? 'skill' : undefined;
  return undefined;
}
// 0 idle; 1..8 slash; 9..16 skill; 17..18 hurt; 19..21 down.
// Frame 5/13 is the contact pose. UI contact remains authoritative, never sprite FPS.
function sequence(pose: UnitPose | Reaction, phase: FramePhase, clip?: UnitClip, art?: string): readonly number[] | undefined {
  if (phase === 'reaction') return pose === 'hit' ? [17, 18] : pose === 'down' ? [19, 20, 21] : undefined;
  if (!clip) return;
  if (clip === 'skill') return phase === 'prepare' ? [9, 10, 11, 12] : [13, 14, 15, 16];
  // Lyra's lowered blade is follow-through, not windup. Never reverse the cut before contact.
  if (art === 'tracer') return phase === 'prepare' ? [1, 2, 3] : [5, 4, 6, 7, 8];
  return phase === 'prepare' ? [1, 2, 3, 4] : [5, 6, 7, 8];
}
export interface FrameSample { from: number; to: number; mix: number }
export function pilotSample(pose: UnitPose | Reaction, phase: FramePhase, progress: number, clip?: UnitClip, art?: string, durationMs = 260): FrameSample | undefined {
  const frames = sequence(pose, phase, clip, art);
  if (!frames) return;
  // Owner feedback: a gentler frame cadence; contact/end cues stay fixed.
  const p = Math.max(0, Math.min(1, progress)) ** 1.08;
  const position = p * frames.length, index = Math.min(frames.length - 1, Math.floor(position));
  const from = frames[index]!, to = frames[Math.min(index + 1, frames.length - 1)]!;
  // A short dissolve at each boundary, capped at 18ms, avoids long double silhouettes.
  // Each phase has its own sequence, so windup can never blend into the contact pose early.
  const window = Math.min(.35, 18 * frames.length / Math.max(1, durationMs));
  const t = Math.max(0, Math.min(1, (position - index - (1 - window)) / window));
  return { from, to, mix: from === to ? 0 : t * t * (3 - 2 * t) };
}
export function pilotFrame(pose: UnitPose | Reaction, phase: FramePhase, progress: number, clip?: UnitClip): number | undefined {
  const sample = pilotSample(pose, phase, progress, clip);
  return sample ? sample.mix >= .5 ? sample.to : sample.from : undefined;
}
