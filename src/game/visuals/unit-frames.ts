import type { Reaction, UnitPose } from './unit-animation-map';
import atlasManifest from './unit-atlases.json';
export type UnitClip = 'attack' | 'skill' | 'bash' | 'prayer' | 'sanctuary' | 'disengage' | 'stance' | 'taunt' | 'brace' | 'knives' | 'evade' | 'dread' | 'finale' | 'snare' | 'arc' | 'communion' | 'lastlight' | 'partner' | 'circle' | 'closing' | 'echo' | 'move1' | 'move2' | 'move3' | 'move4' | 'move5' | 'move6' | 'move7' | 'mark' | 'parry';
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
  // Body alpha once downed while its frames are drawn. A collapse painted as fading out (A8 Rift Wisp) is already its
  // corpse emphasis and must not be dimmed a second time. The static seed fallback always uses CORPSE_ALPHA.
  corpseAlpha?: number;
  // Identity-specific frame ranges. A clip absent here uses the shared layout in `sequence`.
  clips?: Readonly<Partial<Record<UnitClip, FrameRange>>>;
  // Identity-specific reaction frames (block/counter, or a non-standard hit/down layout).
  reactions?: Readonly<Partial<Record<Reaction, readonly number[]>>>;
  // AV04: clips that let something go (arrow, thrown knife, flask). The body reaches its release frame at `at` of the
  // windup, the same instant the painted flight starts, and holds it until the authoritative contact cue.
  // `point`: where the projectile leaves, measured on the release frame (arrowhead / open hand), in slot units from the
  // sole (x toward the foe, y up negative), the same space as BattleScene's landmarks.
  release?: Readonly<Partial<Record<UnitClip, Release>>>;
  // A7: the atlas has its own layout. Only the listed `clips`/`reactions` draw frames; anything absent (a strip held back
  // by the anatomy gate) stays procedural instead of falling onto the shared 0..37 layout.
  own?: true;
  // Frame shown for a downed actor (the held prone pose). Default 21 on the shared layout, 0 (seed) on an `own` layout.
  downFrame?: number;
  // A9 bosses: the atlas cell is 1024 seed units square with the soles at 7/8 of its height (the Captain's axe hangs below the
  // soles). Defaults to the shared layout (496/512).
  soleOrigin?: number;
}
export interface FrameRange { prepare: readonly number[]; recover: readonly number[] }
export interface Release { frame: number; at: number; point: readonly [number, number] }
// Fraction of the windup at which a releasing clip lets go: late enough to show the draw, early enough for a readable flight.
export const RELEASE_AT = .55;
export const CORPSE_ALPHA = .28;
// A9 boss strips: frame 0 is the exact seed, each move adds [wind-up, anticipation, contact, follow-through] from `base`; the
// strip's own ready/recover frames are the seed. Prepare ends on the anticipation, contact is the first recover frame.
const bossMove = (base: number): FrameRange => ({ prepare: [0, base, base + 1], recover: [base + 2, base + 3, 0] });
const BOSS_SOLE = 896 / 1024;
export const unitRegistry = {
  // AV02: finisher (overhead cut) and sweep (wide cut) use the slash clip, lunge the thrust clip; the parry riposte is the
  // thrust (12 → 13). LYRA-002 (PR #114): Mark points the blade at chest height (22..29), the parry stance takes a bent-knee
  // diagonal guard (30..37); each holds its contact pose (25 = 26, 33 = 34) and ends on the shipped idle.
  // Lyra's lowered blade is follow-through, not windup. Never reverse the cut before contact.
  tracer: { sheet: 'lyra', displayRatio: 2, actions: { attack: 'attack', execute: 'skill', finisher: 'attack', sweep: 'attack', lunge: 'skill', mark: 'mark', parry: 'parry' },
    clips: { attack: { prepare: [1, 2, 3], recover: [5, 4, 6, 7, 8] }, mark: { prepare: [23, 24, 25], recover: [26, 27, 28, 29] },
      parry: { prepare: [31, 32, 33], recover: [34, 35, 36, 37] } }, reactions: { counter: [12, 13, 14] } },
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
  // A7 (assumed owner pick = Codex recommendation; docs/combat-presentation/unit-a7-slice/README_TH.md). Every strip is six slots with
  // slot 0 = seed idle; contact = first recover frame. Strips failing the anatomy gate are absent and keep the procedural body.
  metta: { sheet: 'metta', displayRatio: 1 / .42, own: true, downFrame: 34,
    actions: { attack: 'attack', saintstrike: 'attack', vowstrike: 'attack', saintarc: 'arc', communion: 'communion', sharewound: 'communion', lastlight: 'lastlight' },
    clips: { attack: { prepare: [1, 2], recover: [3, 4, 5, 6] }, arc: { prepare: [7, 8], recover: [9, 10, 11, 12] }, communion: { prepare: [13, 14], recover: [15, 16, 17, 18] }, lastlight: { prepare: [19, 20, 21], recover: [22, 23, 24] } },
    reactions: { hit: [25, 26, 27], block: [28, 29, 30], down: [31, 32, 33, 34] } },
  // Odran (thiran) has no A7 entry: the redesigned still (PR #120) is the seed with procedural motion until ART-UNIT-ANIMATION-A7-003.
  // Lalin: partner turn R2 (cadence/duet/deepbeat) and closing step R2 from A7-001; A7-002 adds dance-strike (attack), circle-spin (rounddance),
  // echo-closing-step (echofoot) and her own hit/block/down (frames 31..40, cells already at the .42 factor).
  lalin: { sheet: 'lalin', displayRatio: 1 / .42, own: true, downFrame: 40,
    actions: { attack: 'attack', cadence: 'partner', duet: 'partner', deepbeat: 'partner', rounddance: 'circle', echofoot: 'echo', closingstep: 'closing' },
    clips: { partner: { prepare: [1, 2, 3], recover: [4, 5, 6] }, closing: { prepare: [7, 8, 9], recover: [10, 11, 12] },
      attack: { prepare: [13, 14], recover: [15, 16, 17, 18] }, circle: { prepare: [19, 20], recover: [21, 22, 23, 24] }, echo: { prepare: [25, 26, 27], recover: [28, 29, 30] } },
    reactions: { hit: [31, 32, 33], block: [34, 35, 36], down: [37, 38, 39, 40] } },
  // Isolde (wila): same, redesigned still + procedural motion until A7-003.
  foe_riftweaver: { sheet: 'riftweaver', displayRatio: 2, intents: { 'Rune Lash': 'attack', 'Rift Needle': 'skill', 'Ribbon Snare': 'snare' } },
  foe_spore_puff: { sheet: 'sporepuff', displayRatio: 2, intents: { 'Spore Dust': 'attack' } },
  // A10 (original cast, sheet `units`): Raking Slash / Crushing Blow are the cut and the claw hammer (clip attack), Shadow Knife
  // (free-hand throw) and Rift Bolt (paired palms) the skill clip. The Raider atlas is already mirrored to face left; a packed
  // atlas is never flipped again. Block = the 0-damage reaction (fully absorbed hit).
  raider: { sheet: 'raider', displayRatio: 2, intents: { 'Raking Slash': 'attack', 'Shadow Knife': 'skill' }, reactions: { block: [22, 23] } },
  brute: { sheet: 'brute', displayRatio: 2, intents: { 'Crushing Blow': 'attack', 'Rift Bolt': 'skill' }, reactions: { block: [22, 23] } },
  foe_ruin_bat: { sheet: 'bat', displayRatio: 2, intents: { Nip: 'attack' }, idleLoop: { frames: [22, 23, 24, 25], frameMs: 150 } },
  // A8: the golem punches for both Crystal Fist and Stone Fist (attack) and slams overhead for Veil Quake (skill); the Channeler's
  // palms release for Rift Beam and the older Rift Bolt name; Star Flame and Crystal Stab have one gesture each. The wisp hovers (idleLoop 22..24,
  // seed / bob up / bob down) and its down frames keep the painted fade. Hit 17..18 and down 19..21 use the shared layout; 21 is the held collapse.
  foe_golem: { sheet: 'golem', displayRatio: 2, intents: { 'Crystal Fist': 'attack', 'Stone Fist': 'attack', 'Veil Quake': 'skill' } },
  foe_rift_channeler: { sheet: 'channeler', displayRatio: 2, intents: { 'Rift Beam': 'attack', 'Rift Bolt': 'attack' } },
  foe_rift_wisp: { sheet: 'wisp', displayRatio: 2, intents: { 'Star Flame': 'attack' }, idleLoop: { frames: [22, 23, 24], frameMs: 160 }, corpseAlpha: 1 },
  foe_shard_crawler: { sheet: 'crawler', displayRatio: 2, intents: { 'Crystal Stab': 'attack' } },
  // A9: boss strips are one per move (`move1`.. in the order of each atlas, see docs/combat-presentation/unit-a9-slice). Phase turns
  // carry the phase name (Thorn Rage, Call the Rift, Rift Awakening, Call the Hunt) and play their own gesture. The Matriarch
  // atlas already faces left (owner decision); it is never mirrored at runtime.
  foe_matriarch: { sheet: 'matriarch', displayRatio: 2, soleOrigin: BOSS_SOLE, downFrame: 25,
    intents: { 'Thorn Tempest': 'move1', 'Briar Lash': 'move2', 'Gather Thorns': 'move3', 'Thorn Bloom': 'move4', 'Thorn Storm': 'move4', 'Thorn Rage': 'move5' },
    clips: { move1: bossMove(1), move2: bossMove(5), move3: bossMove(9), move4: bossMove(13), move5: bossMove(17) },
    reactions: { hit: [21, 22], down: [23, 24, 25] } },
  foe_juggernaut: { sheet: 'juggernaut', displayRatio: 2, soleOrigin: BOSS_SOLE, downFrame: 13,
    intents: { 'Horn Charge': 'move1', 'Shard Burst': 'move2' },
    clips: { move1: bossMove(1), move2: bossMove(5) }, reactions: { hit: [9, 10], down: [11, 12, 13] } },
  foe_sentinel: { sheet: 'sentinel', displayRatio: 2, soleOrigin: BOSS_SOLE, downFrame: 33,
    intents: { 'Rift Cataclysm': 'move1', 'Raking Slash': 'move2', 'Crushing Blow': 'move3', 'Rift Bolt': 'move4', 'Rift Wave': 'move4',
      'Rift Gathering': 'move5', 'Rift Awakening': 'move6', 'Call the Rift': 'move7' },
    clips: { move1: bossMove(1), move2: bossMove(5), move3: bossMove(9), move4: bossMove(13), move5: bossMove(17), move6: bossMove(21), move7: bossMove(25) },
    reactions: { hit: [29, 30], down: [31, 32, 33] } },
  foe_captain: { sheet: 'captain', displayRatio: 2, soleOrigin: BOSS_SOLE, downFrame: 17,
    intents: { 'War Cry': 'move1', 'Crushing Blow': 'move2', 'Call the Hunt': 'move3' },
    clips: { move1: bossMove(1), move2: bossMove(5), move3: bossMove(9) }, reactions: { hit: [13, 14], down: [15, 16, 17] } },
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
export const unitDownFrame = (art: string): number => { const d = unitDefinition(art); return d?.downFrame ?? (d?.own ? 0 : 21); };
// Soles anchor of an identity's atlas; the shared layout puts them at 496/512.
export const unitSoleOrigin = (art: string): number => unitDefinition(art)?.soleOrigin ?? 496 / 512;
export const unitDisplayRatio = (art: string): number => unitDefinition(art)?.displayRatio ?? 1;
export const unitUrl = (name: UnitSheet): string => `${import.meta.env.BASE_URL}assets/units/${atlasManifest[name].image}`;
export const unitAtlasUrls = (name: UnitSheet): [string, string] => [unitUrl(name), `${import.meta.env.BASE_URL}assets/units/${atlasManifest[name].atlas}`];
export function unitClip(art: string, action: string | undefined, intent: string | undefined): UnitClip | undefined {
  const definition = unitDefinition(art);
  return action ? definition?.actions?.[action] : intent ? definition?.intents?.[intent] : undefined;
}
// 0 idle; 1..8 slash; 9..16 skill; 17..18 hurt; 19..21 down. Identities with one gesture alias the other clip to idle (A3 Mycon, A4 Ember/Dew/Bat, A5 Stalker/Beetle, A6 Spore Puff, A8 Channeler/Wisp/Crawler).
// Frame 5/13 is the contact pose. UI contact remains authoritative, never sprite FPS.
function sequence(pose: UnitPose | Reaction, phase: FramePhase, clip?: UnitClip, art?: string): readonly number[] | undefined {
  const definition = art ? unitDefinition(art) : undefined;
  if (phase === 'reaction') {
    const own = definition?.reactions?.[pose as Reaction];
    if (own) return own;
    if (definition?.own) return;
    if (pose === 'hit') return [17, 18];
    if (pose === 'down') return [19, 20, 21];
    return;
  }
  if (!clip) return;
  const own = definition?.clips?.[clip];
  if (own) return phase === 'prepare' ? own.prepare : own.recover;
  if (definition?.own) return;
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
