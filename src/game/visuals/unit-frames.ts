import type { Reaction, UnitPose } from './unit-animation-map';
import atlasManifest from './unit-atlases.json';
export type UnitClip = 'attack' | 'skill';
export type FramePhase = 'prepare' | 'recover' | 'reaction';
export interface UnitFrames {
  show(pose: UnitPose | Reaction, phase: FramePhase, progress: number, clip?: UnitClip, durationMs?: number): boolean;
  reset(): void;
}
// Registry is keyed by visual identity, never by an enemy's field slot.
// Keep shipped pilot texture keys/clip sequences stable while adding identities here.
interface UnitDefinition {
  sheet: keyof typeof atlasManifest;
  displayRatio: number;
  actions?: Readonly<Record<string, UnitClip>>;
  intents?: Readonly<Record<string, UnitClip>>;
}
export const unitRegistry = {
  tracer: { sheet: 'lyra', displayRatio: 2, actions: { attack: 'attack', execute: 'skill' } },
  foe_hunter: { sheet: 'hunter', displayRatio: 2, intents: { 'Raking Slash': 'attack', 'Shadow Knife': 'skill' } },
  weaver: { sheet: 'eira', displayRatio: 1 / .42, actions: { attack: 'attack', bolt: 'attack', storm: 'attack', dispel: 'attack', ward: 'skill', sigil: 'skill', aegis: 'skill' } },
  foe_sprite: { sheet: 'sprite', displayRatio: 2, intents: { 'Seed Spark': 'attack' } },
} as const satisfies Record<string, UnitDefinition>;
export const unitSheets = Object.fromEntries(Object.entries(unitRegistry).map(([art, definition]) => [art, definition.sheet])) as Record<keyof typeof unitRegistry, UnitSheet>;
export type UnitSheet = typeof unitRegistry[keyof typeof unitRegistry]['sheet'];
export function unitDefinition(art: string): UnitDefinition | undefined {
  return Object.hasOwn(unitRegistry, art) ? unitRegistry[art as keyof typeof unitRegistry] : undefined;
}
export const unitKey = (art: string): string | undefined => {
  const definition = unitDefinition(art);
  return definition ? `unit-pilot-${definition.sheet}` : undefined;
};
export const unitDisplayRatio = (art: string): number => unitDefinition(art)?.displayRatio ?? 1;
export const unitUrl = (name: UnitSheet): string => `${import.meta.env.BASE_URL}assets/units/${atlasManifest[name].image}`;
export const unitAtlasUrls = (name: UnitSheet): [string, string] => [unitUrl(name), `${import.meta.env.BASE_URL}assets/units/${atlasManifest[name].atlas}`];
export function unitClip(art: string, action: string | undefined, intent: string | undefined): UnitClip | undefined {
  const definition = unitDefinition(art);
  return action ? definition?.actions?.[action] : intent ? definition?.intents?.[intent] : undefined;
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
export function unitSample(pose: UnitPose | Reaction, phase: FramePhase, progress: number, clip?: UnitClip, art?: string, durationMs = 260): FrameSample | undefined {
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
export function unitFrame(pose: UnitPose | Reaction, phase: FramePhase, progress: number, clip?: UnitClip): number | undefined {
  const sample = unitSample(pose, phase, progress, clip);
  return sample ? sample.mix >= .5 ? sample.to : sample.from : undefined;
}
