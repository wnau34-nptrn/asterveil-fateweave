import type { Reaction, UnitPose } from './unit-animation-map';
import atlasManifest from './unit-atlases.json';
export type UnitClip = 'attack' | 'skill' | 'bash' | 'prayer' | 'sanctuary' | 'disengage' | 'stance' | 'taunt' | 'brace' | 'knives' | 'evade' | 'dread' | 'finale' | 'snare';
export type FramePhase = 'prepare' | 'recover' | 'reaction';
export interface UnitFrames {
  show(pose: UnitPose | Reaction, phase: FramePhase, progress: number, clip?: UnitClip, durationMs?: number): boolean;
  reset(): void;
  /** Optional looping idle (A4 Ruin Bat hover); never called during a motion, reduced motion or for a downed actor. */
  idle?(elapsedMs: number): void;
}
// Registry is keyed by visual identity, never by an enemy's field slot.
// Keep shipped pilot texture keys/clip sequences stable while adding identities here.
interface UnitDefinition {
  sheet: keyof typeof atlasManifest;
  displayRatio: number;
  actions?: Readonly<Record<string, UnitClip>>;
  intents?: Readonly<Record<string, UnitClip>>;
  // Looping hover frames and the per-frame time; the static idle (frame 0) remains the fallback.
  idleLoop?: { frames: readonly number[]; frameMs: number };
}
export const unitRegistry = {
  tracer: { sheet: 'lyra', displayRatio: 2, actions: { attack: 'attack', execute: 'skill' } },
  foe_hunter: { sheet: 'hunter', displayRatio: 2, intents: { 'Raking Slash': 'attack', 'Shadow Knife': 'skill' } },
  weaver: { sheet: 'eira', displayRatio: 1 / .42, actions: { attack: 'attack', bolt: 'attack', storm: 'attack', dispel: 'attack', ward: 'skill', sigil: 'skill', aegis: 'skill' } },
  foe_sprite: { sheet: 'sprite', displayRatio: 2, intents: { 'Seed Spark': 'attack' } },
  guardian: { sheet: 'aegis', displayRatio: 1 / .36, actions: { attack: 'attack', bash: 'bash', guard: 'skill', rally: 'skill', challenge: 'skill', bulwark: 'skill', rouse: 'skill' } },
  foe_vargoth_guard: { sheet: 'vargoth', displayRatio: 2, intents: { 'Crushing Blow': 'attack', 'Shield Smash': 'bash', 'Mace Swing': 'attack', 'Rift Bolt': 'skill' } },
  // A3: heal/revive/bless share the heal gesture, prayer/halo the prayer gesture. No new gesture for passives.
  healer: { sheet: 'seren', displayRatio: 1 / .36, actions: { attack: 'attack', heal: 'skill', revive: 'skill', bless: 'skill', prayer: 'prayer', halo: 'prayer', sanctuary: 'sanctuary' } },
  foe_mycon: { sheet: 'mycon', displayRatio: 2, intents: { 'Spore Hex': 'skill' } },
  // A4: hinder/pin/track/weakshot share the single-arrow gesture; volley and disengage have their own. Toma throws
  // overhand for flasks and underhand for tonics. No new gesture for passives.
  mira: { sheet: 'mira', displayRatio: 1 / .42, actions: { attack: 'attack', hinder: 'attack', weakshot: 'attack', pin: 'attack', track: 'attack', volley: 'skill', disengage: 'disengage' } },
  toma: { sheet: 'toma', displayRatio: 1 / .42, actions: { attack: 'attack', acid: 'attack', bomb: 'attack', smoke: 'attack', haste: 'skill', fury: 'skill', catalyst: 'skill' } },
  foe_dew_slime: { sheet: 'dew', displayRatio: 2, intents: { 'Jelly Bounce': 'attack' } },
  foe_ember_slime: { sheet: 'ember', displayRatio: 2, intents: { 'Ember Spark': 'skill' } },
  // A5: Garran thrusts for attack/pierce/halt, holds a low spear guard for brace/spearwall/hold and shouts for warcry.
  // Brann swings for attack, slams for slam/quake/tremor, plants the hammer to taunt and braces for the stone skills.
  garran: { sheet: 'garran', displayRatio: 1 / .42, actions: { attack: 'attack', pierce: 'attack', halt: 'attack', brace: 'stance', spearwall: 'stance', hold: 'stance', warcry: 'skill' } },
  brann: { sheet: 'brann', displayRatio: 1 / .37, actions: { attack: 'attack', slam: 'skill', quake: 'skill', tremor: 'skill', taunt: 'taunt', stonearmor: 'brace', guardstone: 'brace' } },
  foe_tusker: { sheet: 'tusker', displayRatio: 2, intents: { 'Tusk Charge': 'attack', Stampede: 'skill' } },
  foe_stalker: { sheet: 'stalker', displayRatio: 2, intents: { 'Thorn Pounce': 'attack' } },
  foe_thorn_beetle: { sheet: 'beetle', displayRatio: 2, intents: { 'Thorn Bite': 'attack' } },
  // A6: Sefa's double slash serves attack/ambush, the long low stab backstab/disarm; evade and decoy share the backstep.
  // Lio strums for attack/note, plays the sustained song for valor/mend/solo; dread and finale have their own gestures.
  sefa: { sheet: 'sefa', displayRatio: 1 / .42, actions: { attack: 'attack', ambush: 'attack', backstab: 'skill', disarm: 'skill', knives: 'knives', evade: 'evade', decoy: 'evade' } },
  lio: { sheet: 'lio', displayRatio: 1 / .42, actions: { attack: 'attack', note: 'attack', valor: 'skill', mend: 'skill', solo: 'skill', dread: 'dread', finale: 'finale' } },
  foe_riftweaver: { sheet: 'riftweaver', displayRatio: 2, intents: { 'Rune Lash': 'attack', 'Rift Needle': 'skill', 'Ribbon Snare': 'snare' } },
  foe_spore_puff: { sheet: 'sporepuff', displayRatio: 2, intents: { 'Spore Dust': 'attack' } },
  foe_ruin_bat: { sheet: 'bat', displayRatio: 2, intents: { Nip: 'attack' }, idleLoop: { frames: [22, 23, 24, 25], frameMs: 150 } },
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
// 0 idle; 1..8 slash; 9..16 skill; 17..18 hurt; 19..21 down. Identities with one gesture alias the other clip to idle (A3 Mycon, A4 Ember/Dew/Bat, A5 Stalker/Beetle, A6 Spore Puff).
// Frame 5/13 is the contact pose. UI contact remains authoritative, never sprite FPS.
function sequence(pose: UnitPose | Reaction, phase: FramePhase, clip?: UnitClip, art?: string): readonly number[] | undefined {
  if (phase === 'reaction') {
    if (pose === 'hit') return [17, 18];
    if (pose === 'down') return [19, 20, 21];
    if (art === 'guardian' || art === 'foe_vargoth_guard') {
      if (pose === 'block') return art === 'guardian' ? [30, 31] : [22, 23];
      if (pose === 'counter' && art === 'guardian') return [30, 5, 7];
    }
    if (art === 'healer' && pose === 'block') return [38, 39];
    if (art === 'mira' && pose === 'block') return [30, 31];
    if (art === 'toma' && pose === 'block') return [22, 23];
    if (art === 'garran' && pose === 'block') return [30, 31];
    if (art === 'brann' && pose === 'block') return [38, 39];
    if ((art === 'sefa' || art === 'lio') && pose === 'block') return [38, 39];
    return;
  }
  if (!clip) return;
  if (clip === 'bash') {
    const start = art === 'foe_vargoth_guard' ? 24 : 22;
    return phase === 'prepare' ? [start, start + 1, start + 2, start + 3] : [start + 4, start + 5, start + 6, start + 7];
  }
  // Seren: prayer 22..29 and sanctuary 30..37; Mira: disengage 22..29 (block 30..31). Contact on the first recover frame like every clip.
  // A5: Garran stance 22..29; Brann taunt 22..29 and stone brace 30..37 (block 38..39). Contact stays the first recover frame.
  // A6: Sefa knives 22..29, evade 30..37 (block 38..39); Lio dread 22..29, finale 30..37 (block 38..39); Rift Weaver snare 22..29.
  if (clip === 'prayer' || clip === 'sanctuary' || clip === 'disengage' || clip === 'stance' || clip === 'taunt' || clip === 'brace'
    || clip === 'knives' || clip === 'evade' || clip === 'dread' || clip === 'finale' || clip === 'snare') {
    const start = clip === 'sanctuary' || clip === 'brace' || clip === 'evade' || clip === 'finale' ? 30 : 22;
    return phase === 'prepare' ? [start, start + 1, start + 2, start + 3] : [start + 4, start + 5, start + 6, start + 7];
  }
  if (clip === 'skill') return phase === 'prepare' ? [9, 10, 11, 12] : [13, 14, 15, 16];
  // Lyra's lowered blade is follow-through, not windup. Never reverse the cut before contact.
  if (art === 'tracer') return phase === 'prepare' ? [1, 2, 3] : [5, 4, 6, 7, 8];
  return phase === 'prepare' ? [1, 2, 3, 4] : [5, 6, 7, 8];
}
// Hover loop frame at a given time, or undefined for identities without one.
export function unitIdleFrame(art: string, elapsedMs: number): number | undefined {
  const loop = unitDefinition(art)?.idleLoop;
  return loop ? loop.frames[Math.floor(Math.max(0, elapsedMs) / loop.frameMs) % loop.frames.length] : undefined;
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
