import type { BattleEvent, EncounterDefinition, TurnStage } from '../../core/battle/types';
import type { FxContext } from './bolt-fx';

// Basic attacks with their own silhouettes. Blade users keep the painted cuts.
export type BasicWeapon = 'arrow' | 'flask' | 'orb' | 'rhythm' | 'impact';
const weapons: Readonly<Partial<Record<string, BasicWeapon>>> = {
  Archer: 'arrow', Alchemist: 'flask', Mage: 'orb', Priest: 'orb', Hexer: 'orb', Seer: 'orb',
  Bard: 'rhythm', Dancer: 'rhythm', Saint: 'impact', Martial: 'impact', Warden: 'impact',
};
export const basicWeaponForRole = (role: string): BasicWeapon | undefined => weapons[role];
export function basicWeapon(turn: TurnStage, data: EncounterDefinition): BasicWeapon | undefined {
  if (turn.side !== 'hero' || turn.action !== 'attack') return;
  return basicWeaponForRole(data.heroes.find(h => h.id === turn.actorId)?.role ?? '');
}
export interface BasicCue { weapon: BasicWeapon; tint: number; sourceId: string; targetId: string; event: BattleEvent; outcome: 'hit' | 'blocked' | 'dodged' }
export function basicCues(turn: TurnStage, data: EncounterDefinition): BasicCue[] {
  const weapon = basicWeapon(turn, data);
  if (!weapon || turn.events.some(e => e.type === 'cancel')) return [];
  const tint = weapon === 'arrow' ? 0xb3dfa6 : weapon === 'flask' ? 0xffd69b : data.heroes.find(hero => hero.id === turn.actorId)?.color ?? 0xf2d596;
  return turn.events.flatMap(event => event.sourceId === turn.actorId && event.targetId && (event.type === 'damage' || event.type === 'dodge')
    ? [{ weapon, tint, sourceId: turn.actorId, targetId: event.targetId, event,
      outcome: event.type === 'dodge' ? 'dodged' as const : (event.amount ?? 0) > 0 ? 'hit' as const : 'blocked' as const }] : []);
}
export interface BasicPoint { x: number; y: number; releaseX: number; releaseY: number; size: number }
export type BasicLookup = (id: string) => BasicPoint | undefined;
// The recipient's near edge; a dodged shot passes below the body.
const edge = (at: BasicPoint, outcome: BasicCue['outcome']) => ({ x: at.x - at.size * .36, y: at.y + (outcome === 'dodged' ? at.size * .28 : 0) });
function draw(ctx: FxContext, { weapon, tint }: BasicCue): Phaser.GameObjects.Graphics {
  const g = ctx.scene.add.graphics(), s = ctx.scale;
  if (weapon === 'arrow') {
    // Shaft, head and fletching; the origin is the arrowhead so the flight starts on the nocked tip.
    g.lineStyle(2.4 * s, 0x5b3a22, 1).lineBetween(-34 * s, 0, -4 * s, 0);
    g.fillStyle(0xe8f2ff, 1).fillTriangle(0, 0, -8 * s, -3.5 * s, -8 * s, 3.5 * s);
    g.fillStyle(tint, 1).fillTriangle(-34 * s, 0, -27 * s, -5 * s, -24 * s, 0).fillTriangle(-34 * s, 0, -27 * s, 5 * s, -24 * s, 0);
  } else if (weapon === 'flask') {
    // A small corked round flask with an amber fill.
    g.fillStyle(0xffd69b, .95).fillCircle(0, 0, 6.5 * s).lineStyle(1.6 * s, 0x5b3a22, 1).strokeCircle(0, 0, 6.5 * s);
    g.fillStyle(0xfff4dc, .9).fillCircle(-2 * s, -2.4 * s, 1.8 * s);
    g.fillStyle(0x7a5232, 1).fillRect(-2.2 * s, -11 * s, 4.4 * s, 5 * s);
  } else if (weapon === 'orb') {
    g.fillStyle(tint, .85).fillCircle(0, 0, 7 * s).fillStyle(0xfff4dc, .9).fillCircle(0, 0, 3 * s);
  } else {
    g.lineStyle(2 * s, tint, .95).strokeCircle(0, 0, 6 * s).strokeCircle(0, 0, 11 * s);
  }
  ctx.add(g); return g;
}
// The flight leaves the rendered weapon at `releaseAt` of the windup (the body's release frame) and lands at contact.
export function basicPrepare(ctx: FxContext, cue: BasicCue, lookup: BasicLookup, contactMs: number, releaseAt: number): void {
  if (ctx.reduced || cue.weapon === 'impact' || !lookup(cue.sourceId) || !lookup(cue.targetId)) return;
  const delay = Math.max(1, Math.round(contactMs * releaseAt)), travel = Math.max(1, contactMs - delay);
  const item = draw(ctx, cue).setVisible(false);
  item.setData('basicPrepare', true);
  let t = 0;
  const follow = () => {
    const from = lookup(cue.sourceId), at = lookup(cue.targetId); if (!from || !at || !item.active) return;
    const to = edge(at, cue.outcome), dx = to.x - from.releaseX, dy = to.y - from.releaseY;
    // Arrows fly flat; a flask lobs.
    const lift = (cue.weapon === 'arrow' ? .10 : cue.weapon === 'flask' ? .42 : .06) * Math.abs(dx) * (ctx.quiet ? .6 : 1);
    item.setPosition(from.releaseX + dx * t, from.releaseY + dy * t - 4 * lift * t * (1 - t));
    item.rotation = cue.weapon === 'arrow' ? Math.atan2(dy - 4 * lift * (1 - 2 * t), dx) : cue.weapon === 'flask' ? t * 7 : 0;
  };
  item.setData('basicFollow', follow); follow();
  const flight = ctx.scene.tweens.addCounter({ from: 0, to: 1, delay, duration: travel,
    onStart: () => { if (item.active) item.setVisible(true); }, onUpdate: tw => { t = tw.getValue() ?? 0; follow(); },
    onComplete: () => { if (item.active) item.destroy(); } });
  // A counter tween has no target: stop it with its item, whichever cleanup (contact, skip, repaint) destroys that first.
  item.once('destroy', () => flight.stop());
}
// Contact: an arrow stops with a short spark at the real recipient, a flask breaks in a small amber splash. A dodge shows
// the shot passing (no impact); a blocked shot shows a cyan glance. Captions/HP stay the authoritative numbers.
export function basicContact(ctx: FxContext, cue: BasicCue, lookup: BasicLookup, life: number): void {
  const at = lookup(cue.targetId); if (!at) return;
  const p = edge(at, cue.outcome), s = ctx.scale, color = cue.outcome === 'blocked' ? 0x8addf5 : cue.tint;
  const g = ctx.scene.add.graphics(); ctx.add(g);
  if (cue.outcome === 'dodged') {
    g.lineStyle(2 * s, color, .55).lineBetween(p.x + 10 * s, p.y, p.x - 26 * s, p.y + 4 * s);
  } else if (cue.outcome === 'blocked') {
    g.lineStyle(2 * s, color, .9).strokeCircle(p.x, p.y, 10 * s);
  } else if (cue.weapon === 'arrow') {
    g.lineStyle((ctx.quiet ? 1.6 : 2.4) * s, color, .95);
    for (const a of [-.9, -.3, .3, .9]) g.lineBetween(p.x + Math.cos(Math.PI + a) * 5 * s, p.y + Math.sin(Math.PI + a) * 5 * s, p.x + Math.cos(Math.PI + a) * 15 * s, p.y + Math.sin(Math.PI + a) * 15 * s);
  } else if (cue.weapon === 'flask') {
    g.fillStyle(color, ctx.quiet ? .45 : .7).fillCircle(p.x, p.y, 11 * s);
    g.lineStyle(1.6 * s, 0xfff4dc, .9);
    for (const a of [0, 1.3, 2.5, 3.8, 5.1]) g.lineBetween(p.x + Math.cos(a) * 6 * s, p.y + Math.sin(a) * 6 * s, p.x + Math.cos(a) * 14 * s, p.y + Math.sin(a) * 14 * s);
  } else {
    const radius = cue.weapon === 'impact' ? 13 : 10;
    g.lineStyle((ctx.quiet ? 1.5 : 2.5) * s, color, .9).strokeCircle(p.x, p.y, radius * s);
    if (!ctx.quiet && !ctx.reduced) g.strokeCircle(p.x, p.y, (radius + 5) * s);
  }
  if (ctx.reduced) return;
  ctx.scene.tweens.add({ targets: g, alpha: 0, duration: Math.max(1, Math.min(life, 280)), onComplete: () => g.destroy() });
}
