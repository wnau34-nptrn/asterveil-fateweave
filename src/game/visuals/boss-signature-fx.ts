import type { BattleEvent, BattleState, EncounterDefinition, IntentDefinition, TurnStage } from '../../core/battle/types';
import { enemyIntent, nextIntentOf, phaseMoves } from '../../core/battle/engine';
import type { FxContext } from './bolt-fx';
import legacyArt from './boss-signature-art.json';
import lakeArt from './lake-boss-art.json';

const art = { ...legacyArt, ...lakeArt };

// Boss signature VFX and persistent charge telegraphs (AV07; ART-VFX-BOSS-SIGNATURE-001, one final design per move).
// Every cue is chosen from resolver state/events: a charge or phase never paints damage, an all-party move paints only the
// heroes it really struck, War Cry stays the Captain's offensive shout and Horn Charge/Stampede add no waiting turn.
export const BOSS_ATLAS = 'boss-signature-fx';
export const LAKE_BOSS_ATLAS = 'lake-boss-fx';
export const lakeBossAtlasUrls = (): [string, string] => [`${import.meta.env.BASE_URL}assets/fx/lake_boss_fx.webp`, `${import.meta.env.BASE_URL}assets/fx/lake_boss_fx.json`];
const lakeMoves = new Set(['Water Veil', 'Surging Wave', 'Great Wave', 'Reflection']);
export const isLakeBossMove = (move: string | undefined): boolean => !!move && lakeMoves.has(move);
export const bossAtlasFor = (move: string | undefined): string => isLakeBossMove(move) ? LAKE_BOSS_ATLAS : BOSS_ATLAS;
export const bossAtlasUrls = (): [string, string] => [`${import.meta.env.BASE_URL}assets/fx/boss_signature_fx.webp`, `${import.meta.env.BASE_URL}assets/fx/boss_signature_fx.json`];
type Route = 'charge' | 'single' | 'all' | 'caster' | 'summon';
// Move (intent or phase name) → how it is placed. Names are the content's real intent/phase names.
export const bossMoves: Readonly<Record<string, Route>> = {
  'Gather Thorns': 'charge', 'Thorn Bloom': 'single', 'Thorn Storm': 'single', 'Thorn Tempest': 'all', 'Thorn Rage': 'caster',
  'Rift Gathering': 'charge', 'Rift Wave': 'all', 'Rift Cataclysm': 'single', 'Rift Awakening': 'caster', 'Call the Rift': 'summon',
  'War Cry': 'single', 'Call the Hunt': 'summon', 'Horn Charge': 'single', Stampede: 'single',
  // P11-05 World Boss trio (ART-VFX-WB-TRIO-001, R1 designs). Placed by each layer's own anchor (see `anchored`).
  'Titan Gathering': 'charge', 'Mountain Fall': 'single', 'Rift Quake': 'all', 'Fault Awakening': 'caster',
  'Wing Gust': 'single', 'Wing Gathering': 'charge', 'Worldshard Dive': 'all', 'Sky Rend': 'caster',
  'Severing Bolt': 'single', 'Fate Lash': 'single', 'Call the Court': 'summon', 'Shadow Tide': 'all', 'Severed Crown': 'caster',
  // Map 4 Water Spirit and Shadow Serpent.
  'Water Veil': 'caster', 'Surging Wave': 'single', 'Great Wave': 'all', Reflection: 'summon', 'Coil Gathering': 'charge', 'Crushing Coil': 'single',
};
// Moves whose layers are placed by the anchor recorded for each beat in boss-signature-art.json (the older families keep
// their original placement below, unchanged).
const anchored = new Set(['Titan Gathering', 'Mountain Fall', 'Rift Quake', 'Fault Awakening', 'Wing Gust', 'Wing Gathering', 'Worldshard Dive',
  'Sky Rend', 'Severing Bolt', 'Fate Lash', 'Call the Court', 'Shadow Tide', 'Severed Crown', ...lakeMoves]);
export const slug = (name: string): string => name.toLowerCase().replace(/ /g, '-');
type Frame = keyof typeof art;
export const paintedAs: Readonly<Record<string, string>> = { 'Coil Gathering': 'Rift Gathering', 'Crushing Coil': 'Horn Charge' };
const frame = (name: string, beat: 'prepare' | 'peak' | 'settle'): Frame | undefined => {
  const key = `${slug(paintedAs[name] ?? name)}_${beat}`; return Object.hasOwn(art, key) ? key as Frame : undefined;
};
// A move this module paints on the given turn (an enemy turn, not cancelled).
export function bossMove(turn: TurnStage): string | undefined {
  if (turn.side !== 'enemy' || !turn.intent || turn.events.some(e => e.type === 'cancel')) return;
  return Object.hasOwn(bossMoves, turn.intent.name) ? turn.intent.name : undefined;
}
const encounterHasMove = (data: EncounterDefinition, match: (move: string) => boolean): boolean =>
  data.intents.some(i => match(i.name)) || !!data.phases?.some(p => match(p.name));
export const usesBossSignature = (data: EncounterDefinition): boolean =>
  encounterHasMove(data, move => Object.hasOwn(bossMoves, move) && !isLakeBossMove(move));
export const usesLakeBossSignature = (data: EncounterDefinition): boolean => encounterHasMove(data, isLakeBossMove);

// ---- Persistent waiting-turn telegraph ----
// Held between a performed charge and its release. `unstoppable` (rigid toothed brackets) when the announced release is
// unstoppable; `breakable` (a cracked shell with a jagged gap: Bash/Sigil can still break it, P11-05 R1) when the charge
// itself is breakable and the release is not unstoppable; `normal` (open breathing curves) otherwise. It never marks the
// zero-damage charge itself uninterruptible, and a broken charge clears it (the next move is the generated stagger).
export type HoldKind = 'normal' | 'unstoppable' | 'breakable';
export interface ChargeHold { enemyId: string; charge: string; release: string; kind: HoldKind; frame: string }
// `acted`: the actor whose shown turn has already resolved. A turn's `after` snapshot still has that actor at the turn
// index, so its next move is the following round's, not the one it just made.
export function chargeHolds(state: BattleState, data: EncounterDefinition, acted?: string): ChargeHold[] {
  if (state.outcome !== 'active') return [];
  return state.enemies.flatMap(foe => {
    if (foe.absent || foe.hp <= 0) return [];
    const done = acted === foe.id && state.order[state.turnIndex] === foe.id;
    const next = done ? enemyIntent(state, data, foe.id, state.round + 1) : nextIntentOf(state, data, foe.id);
    if (!next || next.special) return [];
    const moves: IntentDefinition[] = phaseMoves(state, data, foe.id);
    const index = ((next.round - (foe.phaseRound ?? 0) - 1) % moves.length + moves.length) % moves.length;
    const charge = moves[(index - 1 + moves.length) % moves.length];
    // The charge must have been the boss's previous turn in this cycle, performed (not sealed/interrupted) this phase.
    if (!charge?.charge || moves.length < 2 || next.round - 1 <= (foe.phaseRound ?? 0) || foe.interruptedRound === next.round - 1) return [];
    const kind: HoldKind = next.unstoppable ? 'unstoppable' : charge.breakable ? 'breakable' : 'normal';
    return [{ enemyId: foe.id, charge: charge.name, release: next.name, kind, frame: `${slug(kind === 'unstoppable' ? next.name : charge.name)}_prepare` }];
  });
}

// ---- One-shot move cues ----
export interface BossCue { move: string; beat: 'peak'; at: 'caster' | 'target' | 'summoned'; id: string; event?: BattleEvent; outcome: 'hit' | 'blocked' | 'dodged' | 'none' }
// Contact cues own actual events only: struck/dodging heroes for attacks, the phase event for a phase, each summon event.
export function bossCues(turn: TurnStage): BossCue[] {
  const move = bossMove(turn); if (!move) return [];
  const route = bossMoves[move]!, actor = turn.actorId;
  if (move === 'Water Veil') {
    const mend = turn.events.find(e => e.type === 'heal' && e.sourceId === actor && e.targetId === actor && (e.amount ?? 0) > 0);
    return mend ? [{ move, beat: 'peak', at: 'caster', id: actor, event: mend, outcome: 'none' }] : [];
  }
  if (route === 'charge') return turn.events.some(e => e.type === 'charge' && e.sourceId === actor) ? [{ move, beat: 'peak', at: 'caster', id: actor, outcome: 'none' }] : [];
  if (route === 'caster' || route === 'summon') {
    const phased = turn.events.some(e => e.type === 'phase' && e.sourceId === actor);
    if (route === 'caster' || move === 'Call the Hunt') return phased ? [{ move, beat: 'peak', at: 'caster', id: actor, outcome: 'none' }] : [];
    // Each foe really brought back: a phase's reserves (Call the Rift) or a summon move's court (Call the Court, P11-05 R2,
    // which is an ordinary intent with no phase event). A standing or un-called slot gets nothing.
    return turn.events.flatMap(e => e.type === 'summon' && e.sourceId === actor && e.targetId ? [{ move, beat: 'peak' as const, at: 'summoned' as const, id: e.targetId, event: e, outcome: 'none' as const }] : []);
  }
  return turn.events.flatMap(e => e.sourceId === actor && e.targetId && (e.type === 'damage' || e.type === 'dodge')
    ? [{ move, beat: 'peak' as const, at: 'target' as const, id: e.targetId, event: e,
      outcome: e.type === 'dodge' ? 'dodged' as const : (e.amount ?? 0) > 0 ? 'hit' as const : 'blocked' as const }] : []);
}

// ---- Painting ----
// `side`: the direction the unit faces (+1 right for heroes, -1 left for foes).
export interface BossPoint { x: number; y: number; feetY: number; size: number; side: 1 | -1 }
export type BossLookup = (id: string) => BossPoint | undefined;
const NORMAL = 0;
// Display width at a 390px field (Codex's suggested widths), scaled with the slot like the other painted families.
const width = (ctx: FxContext, name: Frame) => art[name].width * fieldScale(ctx);
function paint(ctx: FxContext, name: Frame, x: number, y: number, size = 1): Phaser.GameObjects.Image {
  const atlas = Object.hasOwn(lakeArt, name) ? LAKE_BOSS_ATLAS : BOSS_ATLAS;
  const img = ctx.scene.add.image(x, y, atlas, name), pivot = art[name].pivot;
  img.setOrigin(pivot[0]! / 256, pivot[1]! / 256).setScale(width(ctx, name) * size / 256).setBlendMode(NORMAL);
  img.setData('bossFrame', name); ctx.add(img); return img;
}
// Feet moves (Stampede) stand on the ground; everything else on the chest, the caster's just forward of it.
const legacySpot = (p: BossPoint, move: string, caster: boolean) => move === 'Stampede'
  ? { x: p.x, y: p.feetY } : { x: p.x + (caster ? p.side * p.size * .27 : 0), y: p.y };
// Rendered point for an anchor name from Codex's layers.json. `p.side` is the facing (foes -1: forward is screen-left);
// vertical offsets use the rendered body height (chest is its middle, feet its bottom). `offset` is [rear, down] in 390px
// field pixels. These are fitted to the rendered trio bodies (clips in docs/combat-presentation/wb-vfx-slice/).
export function anchorPoint(p: BossPoint, anchor: string, scale = 1, offset: readonly number[] = [0, 0]): { x: number; y: number } {
  const h = Math.max(1, (p.feetY - p.y) * 2), f = p.side, at = (dx: number, dy: number) =>
    ({ x: p.x + f * dx - f * (offset[0] ?? 0) * scale, y: p.y + dy + (offset[1] ?? 0) * scale });
  switch (anchor) {
    case 'caster.forward_chest': return at(p.size * .27, 0);
    case 'caster.left_shoulder_core': return at(p.size * .25, h * .09); // Valdrakk's cyan core, clear of its lowered head
    case 'caster.wing_base': return at(-p.size * .05, -h * .22);
    case 'caster.upper_back': return at(-p.size * .2, -h * .3);
    case 'caster.lower_hands': return at(p.size * .22, h * .08);
    case 'caster.upper_hands_safe': return at(p.size * .34, -h * .12);
    case 'caster.feet': case 'target.feet': case 'whole_hero_side.actual_target_feet': case 'summoned_slot.feet': return { x: at(0, 0).x, y: p.feetY + (offset[1] ?? 0) * scale };
    default: return at(0, 0); // caster.chest, target.chest, whole_hero_side.actual_target_chests, summoned_slot.chest
  }
}
const fieldScale = (ctx: FxContext) => ctx.scale / (111 / 96);
const spot = (ctx: FxContext, p: BossPoint, move: string, caster: boolean, name: Frame) => anchored.has(move)
  ? anchorPoint(p, art[name].anchor, fieldScale(ctx), (art[name] as { offset?: number[] }).offset) : legacySpot(p, move, caster);
const greatWaveWidths = [1, .91, .8, .7, .6] as const;
export function greatWaveScales(cues: readonly BossCue[], lookup: BossLookup): ReadonlyMap<string, number> {
  return new Map(cues.filter(cue => cue.move === 'Great Wave').map(cue => ({ id: cue.id, x: lookup(cue.id)?.x ?? 0 }))
    .sort((a, b) => b.x - a.x).map(({ id }, i) => [id, greatWaveWidths[i] ?? .6]));
}
export function bossPrepare(ctx: FxContext, turn: TurnStage, lookup: BossLookup, contactMs: number): boolean {
  const move = bossMove(turn), name = move && frame(move, 'prepare'), at = lookup(turn.actorId);
  if (!move || !name || !at) return false;
  if (ctx.reduced) return true;
  if (isLakeBossMove(move)) {
    const cues = bossCues(turn);
    const scales = greatWaveScales(cues, lookup);
    const veil = move === 'Water Veil';
    const targets = veil ? [turn.actorId] : cues.map(cue => cue.id);
    for (const id of targets) {
      const target = lookup(id);
      if (!target) continue;
      const targetFx = { ...ctx, scale: Math.max(.7, Math.min(1.25, target.size / 96)) };
      const p = spot(targetFx, target, move, veil, name);
      const img = paint(targetFx, name, p.x, p.y, scales.get(id)).setAlpha(.2);
      img.setData('bossPrepare', true);
      ctx.scene.tweens.add({ targets: img, alpha: ctx.quiet ? .6 : .92, duration: Math.max(1, contactMs) });
    }
    return true;
  }
  // A summon move gathers at each slot that really returns when that slot is drawn; a slot still empty (a fallen court
  // foe is not drawn until it returns) gathers at the caster's forward chest instead. Nothing returns: no cue.
  const summon = art[name].anchor === 'summoned_slot.chest' && bossMoves[move] === 'summon';
  const returns = summon ? turn.events.filter(e => e.type === 'summon' && e.sourceId === turn.actorId && e.targetId) : [];
  const drawn = returns.map(e => lookup(e.targetId!)).filter((q): q is BossPoint => !!q);
  const points: { q: BossPoint; caster: boolean }[] = !summon ? [{ q: at, caster: true }] : drawn.length ? drawn.map(q => ({ q, caster: false })) : returns.length ? [{ q: at, caster: true }] : [];
  for (const { q, caster } of points) {
    const p = caster && summon ? anchorPoint(q, 'caster.forward_chest') : spot(ctx, q, move, true, name), img = paint(ctx, name, p.x, p.y).setAlpha(.2);
    img.setData('bossPrepare', true);
    ctx.scene.tweens.add({ targets: img, alpha: ctx.quiet ? .6 : .92, duration: Math.max(1, contactMs) });
  }
  return true;
}
// A sealed turn resolves immediately. Show the interrupted gather during that same stage.
export function sealedWaterVeil(ctx: FxContext, turn: TurnStage, lookup: BossLookup, life: number): void {
  if (ctx.reduced || turn.side !== 'enemy' || turn.intent?.name !== 'Water Veil'
    || !turn.events.some(e => e.type === 'cancel' && e.sourceId === turn.actorId)) return;
  const target = lookup(turn.actorId);
  if (!target) return;
  const name = 'water-veil_prepare';
  const p = spot(ctx, target, 'Water Veil', true, name);
  const image = paint(ctx, name, p.x, p.y).setAlpha(ctx.quiet ? .65 : .85);
  ctx.scene.tweens.add({ targets: image, alpha: 0, duration: Math.min(life, 210), onComplete: () => image.destroy() });
}

export function bossContact(ctx: FxContext, cue: BossCue, lookup: BossLookup, life: number, size = 1): void {
  const peak = frame(cue.move, 'peak'), settle = frame(cue.move, 'settle');
  // War Cry's cone leaves the Captain's forward chest (its pivot is the cone's emission edge); the wisps settle on the target.
  const warCry = cue.move === 'War Cry', caster = cue.at === 'caster' || warCry;
  const source = warCry ? cue.event && lookup(cue.event.sourceId ?? '') : lookup(cue.id), target = lookup(cue.id);
  if (!peak || !settle || !source || !target) return;
  const dodged = cue.outcome === 'dodged', blocked = cue.outcome === 'blocked';
  const base = spot(ctx, source, cue.move, caster && cue.at !== 'summoned', peak), opacity = ctx.reduced ? .8 : ctx.quiet ? .7 : 1;
  const tint = (img: Phaser.GameObjects.Image) => { if (blocked) img.setTint(0x8addf5); return img; };
  // A dodged hit shows only the passing settle wisps beside the body, never the impact.
  const first = dodged ? undefined : tint(paint(ctx, peak, base.x, base.y, size).setAlpha(opacity));
  const end = warCry ? spot(ctx, target, cue.move, false, settle) : anchored.has(cue.move) ? spot(ctx, source, cue.move, caster && cue.at !== 'summoned', settle) : base;
  const last = tint(paint(ctx, settle, end.x, end.y + (dodged ? target.size * .25 : 0), size).setAlpha(0));
  if (ctx.reduced) { last.setAlpha(first ? 0 : opacity * .7); return; }
  const duration = Math.max(1, Math.min(life, 520));
  ctx.scene.tweens.addCounter({ from: 0, to: 1, duration, onUpdate: tw => {
    const t = tw.getValue() ?? 0;
    if (first?.active) first.setAlpha(opacity * Math.max(0, 1 - Math.max(0, t - .3) / .35));
    if (last.active) last.setAlpha(opacity * (dodged ? .6 : .85) * Math.sin(Math.min(1, Math.max(0, (t - .25) / .75)) * Math.PI));
  }, onComplete: () => { first?.destroy(); last.destroy(); } });
}
// Waiting-turn hold placement for the trio's anchored frames (Mountain Fall brackets at the forward chest, Wing Gathering's
// cracked shell at the shoulder core). Undefined for the older families, which keep BattleScene's lower-chest placement.
export function holdPlacement(p: BossPoint, hold: ChargeHold, scale: number): { x: number; y: number; width: number } | undefined {
  const name = hold.frame as Frame, move = anchoredHold.get(hold.frame);
  if (!move || !Object.hasOwn(art, name)) return;
  const s = scale / (111 / 96);
  return { ...anchorPoint(p, art[name].anchor, s, (art[name] as { offset?: number[] }).offset), width: art[name].width * s };
}
const anchoredHold = new Map([...anchored].map(m => [`${slug(m)}_prepare`, m]));
