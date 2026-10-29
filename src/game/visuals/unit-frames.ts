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
  // Identity-specific frame ranges. A clip absent here uses the shared layout in `sequence`.
  clips?: Readonly<Partial<Record<UnitClip, FrameRange>>>;
  // Identity-specific reaction frames (block/counter, or a non-standard hit/down layout).
  reactions?: Readonly<Partial<Record<Reaction, readonly number[]>>>;
  // AV04: clips that let something go (arrow, thrown knife, flask). The body reaches its release frame at `at` of the
  // windup, the same instant the painted flight starts, and holds it until the authoritative contact cue.
  // `point`: where the projectile leaves, measured on the release frame (arrowhead / open hand), in slot units from the
  // sole (x toward the foe, y up negative), the same space as BattleScene's landmarks.
  release?: Readonly<Partial<Record<UnitClip, Release>>>;
}
export interface FrameRange { prepare: readonly number[]; recover: readonly number[] }
export interface Release { frame: number; at: number; point: readonly [number, number] }
// Fraction of the windup at which a releasing clip lets go: late enough to show the draw, early enough for a readable flight.
export const RELEASE_AT = .55;
export const unitRegistry = {
  // AV02: finisher (overhead cut) and sweep (wide cut) use the slash clip, lunge the thrust clip; the parry riposte is the
  // thrust (12 → 13). Mark and the parry stance have no matching gesture yet (brief CODEX-AV02-GESTURES-TH) and stay procedural.
  // Lyra's lowered blade is follow-through, not windup. Never reverse the cut before contact.
  tracer: { sheet: 'lyra', displayRatio: 2, actions: { attack: 'attack', execute: 'skill', finisher: 'attack', sweep: 'attack', lunge: 'skill' },
    clips: { attack: { prepare: [1, 2, 3], recover: [5, 4, 6, 7, 8] } }, reactions: { counter: [12, 13, 14] } },
  foe_hunter: { sheet: 'hunter', displayRatio: 2, intents: { 'Raking Slash': 'attack', 'Shadow Knife': 'skill' } },
  weaver: { sheet: 'eira', displayRatio: 1 / .42, actions: { attack: 'attack', bolt: 'attack', storm: 'attack', dispel: 'attack', ward: 'skill', sigil: 'skill', aegis: 'skill' } },
  foe_sprite: { sheet: 'sprite', displayRatio: 2, intents: { 'Seed Spark': 'attack' } },
  guardian: { sheet: 'aegis', displayRatio: 1 / .36, actions: { attack: 'attack', bash: 'bash', guard: 'skill', rally: 'skill', challenge: 'skill', bulwark: 'skill', rouse: 'skill' },
    reactions: { block: [30, 31], counter: [30, 5, 7] } },
  foe_vargoth_guard: { sheet: 'vargoth', displayRatio: 2, intents: { 'Crushing Blow': 'attack', 'Shield Smash': 'bash', 'Mace Swing': 'attack', 'Rift Bolt': 'skill' },
    clips: { bash: { prepare: [24, 25, 26, 27], recover: [28, 29, 30, 31] } }, reactions: { block: [22, 23] } },
  // A3: heal/revive/bless share the heal gesture, prayer/halo the prayer gesture. No new gesture for passives.
  healer: { sheet: 'seren', displayRatio: 1 / .36, actions: { attack: 'attack', heal: 'skill', revive: 'skill', bless: 'skill', prayer: 'prayer', halo: 'prayer', sanctuary: 'sanctuary' }, reactions: { block: [38, 39] } },
  foe_mycon: { sheet: 'mycon', displayRatio: 2, intents: { 'Spore Hex': 'skill' } },
  // A4: hinder/pin/track/weakshot share the single-arrow gesture; volley and disengage have their own. Toma throws
  // overhand for flasks and underhand for tonics. No new gesture for passives.
  mira: { sheet: 'mira', displayRatio: 1 / .42, actions: { attack: 'attack', hinder: 'attack', weakshot: 'attack', pin: 'attack', track: 'attack', volley: 'skill', disengage: 'disengage' },
    // AV04: the string lets go (5/13/26) when the arrow leaves; contact and end stay the UI cues.
    reactions: { block: [30, 31] }, release: {
      attack: { frame: 5, at: RELEASE_AT, point: [.59, -.53] }, skill: { frame: 13, at: RELEASE_AT, point: [.43, -.90] },
      disengage: { frame: 26, at: RELEASE_AT, point: [.52, -.55] } } },
  toma: { sheet: 'toma', displayRatio: 1 / .42, actions: { attack: 'attack', acid: 'attack', bomb: 'attack', smoke: 'attack', haste: 'skill', fury: 'skill', catalyst: 'skill' },
    // AV03/AV04: only the basic attack paints a thrown flask; its hand opens (5) as the flask leaves.
    reactions: { block: [22, 23] }, release: { attack: { frame: 5, at: RELEASE_AT, point: [.39, -.52] } } },
  foe_dew_slime: { sheet: 'dew', displayRatio: 2, intents: { 'Jelly Bounce': 'attack' } },
  foe_ember_slime: { sheet: 'ember', displayRatio: 2, intents: { 'Ember Spark': 'skill' } },
  // A5: Garran thrusts for attack/pierce/halt, holds a low spear guard for brace/spearwall/hold and shouts for warcry.
  // Brann swings for attack, slams for slam/quake/tremor, plants the hammer to taunt and braces for the stone skills.
  garran: { sheet: 'garran', displayRatio: 1 / .42, actions: { attack: 'attack', pierce: 'attack', halt: 'attack', brace: 'stance', spearwall: 'stance', hold: 'stance', warcry: 'skill' },
    // AV02: the riposte catches on the guard (30) and drives the spear (5, 6) in the same reaction window.
    reactions: { block: [30, 31], counter: [30, 5, 6] } },
  brann: { sheet: 'brann', displayRatio: 1 / .37, actions: { attack: 'attack', slam: 'skill', quake: 'skill', tremor: 'skill', taunt: 'taunt', stonearmor: 'brace', guardstone: 'brace' }, reactions: { block: [38, 39] } },
  foe_tusker: { sheet: 'tusker', displayRatio: 2, intents: { 'Tusk Charge': 'attack', Stampede: 'skill' } },
  foe_stalker: { sheet: 'stalker', displayRatio: 2, intents: { 'Thorn Pounce': 'attack' } },
  foe_thorn_beetle: { sheet: 'beetle', displayRatio: 2, intents: { 'Thorn Bite': 'attack' } },
  // A6: Sefa's double slash serves attack/ambush, the long low stab backstab/disarm; evade and decoy share the backstep.
  // Lio strums for attack/note, plays the sustained song for valor/mend/solo; dread and finale have their own gestures.
  sefa: { sheet: 'sefa', displayRatio: 1 / .42, actions: { attack: 'attack', ambush: 'attack', backstab: 'skill', disarm: 'skill', knives: 'knives', evade: 'evade', decoy: 'evade' },
    reactions: { block: [38, 39] }, release: { knives: { frame: 26, at: RELEASE_AT, point: [.52, -.45] } } },
  lio: { sheet: 'lio', displayRatio: 1 / .42, actions: { attack: 'attack', note: 'attack', valor: 'skill', mend: 'skill', solo: 'skill', dread: 'dread', finale: 'finale' }, reactions: { block: [38, 39] } },
  foe_riftweaver: { sheet: 'riftweaver', displayRatio: 2, intents: { 'Rune Lash': 'attack', 'Rift Needle': 'skill', 'Ribbon Snare': 'snare' } },
  foe_spore_puff: { sheet: 'sporepuff', displayRatio: 2, intents: { 'Spore Dust': 'attack' } },
  foe_ruin_bat: { sheet: 'bat', displayRatio: 2, intents: { Nip: 'attack' }, idleLoop: { frames: [22, 23, 24, 25], frameMs: 150 } },
} as const satisfies Record<string, UnitDefinition>;
// Anatomy hold (animation-visual-audit-2026-10-29): an identity whose generated poses do not match its approved
// idle model (head/torso proportions) keeps its mapping and atlas in the repository but is neither loaded nor drawn;
// the battle shows the shipped static seed with the procedural body motion until an anatomy-locked redraw is packed.
// Never hide the mismatch by rescaling poses or lengthening the dissolve.
export const anatomyHold: ReadonlySet<string> = new Set(['guardian']);
export const unitSheets = Object.fromEntries(Object.entries(unitRegistry).filter(([art]) => !anatomyHold.has(art)).map(([art, definition]) => [art, definition.sheet])) as Partial<Record<keyof typeof unitRegistry, UnitSheet>>;
export type UnitSheet = typeof unitRegistry[keyof typeof unitRegistry]['sheet'];
export function unitDefinition(art: string): UnitDefinition | undefined {
  return Object.hasOwn(unitRegistry, art) ? unitRegistry[art as keyof typeof unitRegistry] : undefined;
}
export const unitKey = (art: string): string | undefined => {
  const definition = anatomyHold.has(art) ? undefined : unitDefinition(art);
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
  const definition = art ? unitDefinition(art) : undefined;
  if (phase === 'reaction') {
    const own = definition?.reactions?.[pose as Reaction];
    if (own) return own;
    if (pose === 'hit') return [17, 18];
    if (pose === 'down') return [19, 20, 21];
    return;
  }
  if (!clip) return;
  const own = definition?.clips?.[clip];
  if (own) return phase === 'prepare' ? own.prepare : own.recover;
  if (clip === 'bash') return phase === 'prepare' ? [22, 23, 24, 25] : [26, 27, 28, 29];
  // Seren: prayer 22..29 and sanctuary 30..37; Mira: disengage 22..29 (block 30..31). Contact on the first recover frame like every clip.
  // A5: Garran stance 22..29; Brann taunt 22..29 and stone brace 30..37 (block 38..39). Contact stays the first recover frame.
  // A6: Sefa knives 22..29, evade 30..37 (block 38..39); Lio dread 22..29, finale 30..37 (block 38..39); Rift Weaver snare 22..29.
  if (clip === 'prayer' || clip === 'sanctuary' || clip === 'disengage' || clip === 'stance' || clip === 'taunt' || clip === 'brace'
    || clip === 'knives' || clip === 'evade' || clip === 'dread' || clip === 'finale' || clip === 'snare') {
    const start = clip === 'sanctuary' || clip === 'brace' || clip === 'evade' || clip === 'finale' ? 30 : 22;
    return phase === 'prepare' ? [start, start + 1, start + 2, start + 3] : [start + 4, start + 5, start + 6, start + 7];
  }
  if (clip === 'skill') return phase === 'prepare' ? [9, 10, 11, 12] : [13, 14, 15, 16];
  return phase === 'prepare' ? [1, 2, 3, 4] : [5, 6, 7, 8];
}
// Fraction of the windup (contact cue) at which the body lets its projectile go, if this clip releases one.
export function unitRelease(art: string, clip: UnitClip | undefined): Release | undefined {
  return clip ? unitDefinition(art)?.release?.[clip] : undefined;
}
// Hover loop frame at a given time, or undefined for identities without one.
export function unitIdleFrame(art: string, elapsedMs: number): number | undefined {
  const loop = unitDefinition(art)?.idleLoop;
  return loop ? loop.frames[Math.floor(Math.max(0, elapsedMs) / loop.frameMs) % loop.frames.length] : undefined;
}
export interface FrameSample { from: number; to: number; mix: number }
export function unitSample(pose: UnitPose | Reaction, phase: FramePhase, progress: number, clip?: UnitClip, art?: string, durationMs = 260): FrameSample | undefined {
  const windup = sequence(pose, phase, clip, art);
  if (!windup) return;
  // AV04: a releasing clip draws over [0, at) and dissolves into its release frame exactly at `at` (the flight start),
  // then holds it to contact. Without a release the windup spans the whole prepare and contact shows the next clip.
  const release = phase === 'prepare' && art ? unitRelease(art, clip) : undefined;
  if (release && progress >= release.at) return { from: release.frame, to: release.frame, mix: 0 };
  const frames = release ? [...windup, release.frame] : windup;
  // Owner feedback: a gentler frame cadence; contact/end cues stay fixed.
  const raw = Math.max(0, Math.min(1, release ? progress / release.at * windup.length / frames.length : progress));
  const p = raw ** 1.08;
  const position = p * frames.length, index = Math.min(frames.length - 1, Math.floor(position));
  const from = frames[index]!, to = frames[Math.min(index + 1, frames.length - 1)]!;
  // A short dissolve at each boundary, capped at 18ms, avoids long double silhouettes.
  // Each phase has its own sequence, so windup can never blend into the contact pose early.
  const window = Math.min(.35, 18 * frames.length / Math.max(1, release ? durationMs * release.at : durationMs));
  const t = Math.max(0, Math.min(1, (position - index - (1 - window)) / window));
  return { from, to, mix: from === to ? 0 : t * t * (3 - 2 * t) };
}
export function unitFrame(pose: UnitPose | Reaction, phase: FramePhase, progress: number, clip?: UnitClip): number | undefined {
  const sample = unitSample(pose, phase, progress, clip);
  return sample ? sample.mix >= .5 ? sample.to : sample.from : undefined;
}
