import Phaser from 'phaser';
import type { BattleEvent, BattleState, EncounterDefinition } from '../../core/battle/types';
import { actorName, thaiFont } from '../../ui/th';
import { palette } from '../visuals/palette';
import { drawRiftBackdrop } from '../visuals/rift-backdrop';
import { actorArt, actorFootOrigins, artOf, artUrl, unitsUrl } from '../visuals/assets';

export interface ActorTarget { x: number; y: number; width: number; height: number }
export interface SceneView { state: BattleState; heroId: string; targetId: string | null; phase?: 'hero' | 'enemy'; activeActorId?: string; activeTargetId?: string }
export class BattleScene extends Phaser.Scene {
  private view: SceneView | undefined;
  private layer: Phaser.GameObjects.Container | undefined;
  private backdrop: Phaser.GameObjects.Image | undefined;
  private backdropSize = '';
  private positions = new Map<string, { x: number; y: number }>();
  readonly actorTargets = new Map<string, ActorTarget>();
  private bodies = new Map<string, Phaser.GameObjects.Container>();
  private effects: Phaser.GameObjects.Container | undefined;
  private ready = false;
  constructor(private encounter: EncounterDefinition, private readonly choose: (id: string) => void, private readonly onReady: () => void, private readonly onLayout: () => void) { super('battle'); }
  get isReady(): boolean { return this.ready; }
  setEncounter(data: EncounterDefinition): void {
    this.stopEffects(); this.encounter = data; this.view = undefined;
    this.actorTargets.clear();
  }
  refreshLayout(): void {
    // DOM teaching strips change the field without a window resize. Refresh
    // immediately so sprites and targets cannot remain clipped in the old size.
    if (this.ready && this.scale.getParentBounds()) this.scale.refresh();
  }
  preload(): void {
    this.load.image('rift-ruins', artUrl('ruins'));
    for (const sheet of ['units', 'mercs', 'foes'] as const) this.load.spritesheet(`battle-${sheet}`, unitsUrl(sheet), { frameWidth: 512, frameHeight: 512 });
  }
  create(): void {
    this.ready = true;
    // Turn banners and scrolling move the canvas without resizing its texture.
    const updateInputBounds = () => this.scale.updateBounds();
    this.game.canvas.addEventListener('pointerdown', updateInputBounds, { capture: true, passive: true });
    this.game.canvas.addEventListener('touchstart', updateInputBounds, { capture: true, passive: true });
    this.scale.on('resize', this.paint, this);
    this.events.once('shutdown', () => {
      this.game.canvas.removeEventListener('pointerdown', updateInputBounds, true);
      this.game.canvas.removeEventListener('touchstart', updateInputBounds, true);
      this.scale.off('resize', this.paint, this);
      this.ready = false; this.backdropSize = ''; this.backdrop = undefined;
    });
    this.paint();
    this.onReady();
  }
  sync(view: SceneView): void { this.view = view; if (this.ready) this.paint(); }
  private paint(): void {
    if (!this.view) return;
    this.stopEffects(); this.bodies.clear();
    this.layer?.destroy();
    this.layer = this.add.container(0, 0);
    this.positions.clear(); this.actorTargets.clear();
    const { width: w, height: h } = this.scale;
    const short = w < 900 || h < 360;
    const phone = window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches;
    if (this.backdropSize !== `${w}:${h}`) {
      this.backdrop?.destroy();
      this.backdrop = drawRiftBackdrop(this, w, h);
      this.backdropSize = `${w}:${h}`;
    }
    const bg = this.add.graphics(); this.layer.add(bg);
    // These are sole positions on the courtyard, not image centers. Each
    // front fighter steps diagonally past its back-row partner; the second
    // pair is offset again so faces and touch targets stay unobstructed.
    const spots = { back0: { x: .14, y: .48 }, front0: { x: .35, y: .59 }, back1: { x: .16, y: .77 }, front1: { x: .39, y: .90 } };
    // Reserve independent 44px ally targets on the shortest portrait fields.
    // Upper and lower pairs stay staggered; all sole anchors remain on the floor.
    if (phone && h < 170) {
      const rearTop = h * .48;
      const frontTop = Math.min(h * .59, h - 16 - 46);
      spots.back0.y = rearTop / h;
      spots.front0.y = frontTop / h;
      spots.back1.y = Math.min(h - 16, Math.max(h * .77, rearTop + 46)) / h;
      spots.front1.y = Math.min(h - 16, Math.max(h * .90, frontTop + 46)) / h;
    }
    // Field spots follow party slots and lanes, not hero ids: front-lane members take the
    // front spots in slot order, back-lane members the back spots; overflow uses the other row.
    const formation: Record<string, { x: number; y: number }> = { raider: { x: .85, y: .51 }, brute: { x: .70, y: .81 } };
    const free = { front: [spots.front0, spots.front1], back: [spots.back0, spots.back1] };
    for (const hero of this.encounter.heroes) {
      const own = free[hero.lane]; const other = free[hero.lane === 'front' ? 'back' : 'front'];
      formation[hero.id] = own.shift() ?? other.shift()!;
    }
    this.encounter.heroes.forEach((hero, i) => {
      const x = w * formation[hero.id]!.x;
      const y = Math.min(h * formation[hero.id]!.y, h - (phone ? 16 : hero.lane === 'back' ? 50 : 42));
      this.actor(hero.id, actorName(hero.id, this.encounter), x, y, hero.color, this.view!.state.heroes[i]!.hp, hero.maxHp, false, short);
    });
    this.encounter.enemies.forEach((enemy, i) => {
      const x = w * formation[enemy.id]!.x;
      const y = Math.min(h * formation[enemy.id]!.y, h - 46);
      this.actor(enemy.id, actorName(enemy.id, this.encounter), x, y, enemy.color, this.view!.state.enemies[i]!.hp, enemy.maxHp, true, short);
    });
    const intent = this.view.state.intent;
    const source = this.positions.get(this.view.phase ? this.view.activeActorId ?? '' : intent?.sourceId ?? '');
    const target = this.positions.get(this.view.phase ? this.view.activeTargetId ?? '' : intent?.targetId ?? '');
    if (source && target) {
      bg.lineStyle(2, this.view.phase === 'hero' ? palette.cyan : intent?.kind === 'energy' ? palette.corruption : 0xf08da1, 0.55);
      const dx = target.x - source.x; const dy = target.y - source.y;
      for (let t = 0.15; t < 0.8; t += 0.09) bg.lineBetween(source.x + dx * t, source.y + dy * t, source.x + dx * (t + 0.04), source.y + dy * (t + 0.04));
    }
    this.layer.sort('depth'); this.onLayout();
  }
  private actor(id: string, name: string, x: number, y: number, color: number, hp: number, maxHp: number, enemy: boolean, compact: boolean): void {
    this.positions.set(id, { x, y });
    // Sort bodies by their feet rather than roster insertion order.
    const body = this.add.container(x, y).setDepth(y); this.layer!.add(body);
    this.bodies.set(id, body);
    const info = this.add.container(x, y).setDepth(this.scale.height + 1); this.layer!.add(info);
    const involved = !this.view!.activeActorId || id === this.view!.activeActorId || id === this.view!.activeTargetId;
    body.setAlpha(hp <= 0 ? 0.28 : involved ? 1 : 0.55);
    info.setAlpha(hp <= 0 ? 0.4 : involved ? 1 : 0.75);
    const g = this.add.graphics(); body.add(g);
    const short = compact;
    const phone = window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches;
    const portrait = phone || this.scale.width < 900 && this.scale.height >= 280;
    const selected = this.view!.heroId === id || this.view!.targetId === id;
    const size = Math.max(44, Math.min(phone ? id === 'brute' ? 120 : 100 : short ? id === 'brute' ? 110 : 80 : id === 'brute' ? 215 : 145, this.scale.width * (id === 'brute' ? .32 : .25), this.scale.height * (id === 'brute' ? .36 : .30)));
    // A contact shadow and selection ring share the same foot anchor.
    g.fillStyle(0x07131f, .65); g.fillEllipse(0, 0, size * .65, size * .12);
    if (selected && hp > 0) { g.lineStyle(2, palette.gold); g.strokeEllipse(0, 0, size * .68, size * .14); }
    if (id === this.view!.activeActorId && hp > 0) {
      g.lineStyle(3, enemy ? 0xf19b9f : palette.cyan); g.strokeEllipse(0, 0, size * .72, size * .16);
    }
    const key = artOf(this.encounter, id); const art = actorArt[key]!;
    const sprite = this.add.image(0, 0, `battle-${art.sheet}`, art.frame).setOrigin(0.5, actorFootOrigins[key] ?? 1).setDisplaySize(size, size);
    body.add(sprite);
    const hitWidth = Math.max(44, Math.min(72, size * .7));
    const hitHeight = Math.max(44, size * .9);
    this.actorTargets.set(id, { x: x - hitWidth / 2, y: y + sprite.y - hitHeight, width: hitWidth, height: hitHeight });
    const label = this.add.text(0, 14, name, { fontFamily: thaiFont, fontSize: phone ? '10px' : compact ? '12px' : '14px', color: '#f0f5ff', stroke: '#101c36', strokeThickness: 3 }).setOrigin(0.5);
    label.setVisible(!phone || enemy);
    const hpX = 0;
    const hpY = 35;
    const barY = phone && !enemy ? 8 : 24;
    const barWidth = phone ? enemy ? Math.min(65, this.scale.width * .17) : 35 : enemy ? 70 : 52;
    const bar = this.add.graphics(); bar.fillStyle(0x101c36); bar.fillRoundedRect(hpX - barWidth / 2, barY, barWidth, 5, 2);
    bar.fillStyle(color); bar.fillRoundedRect(hpX - barWidth / 2, barY, barWidth * hp / maxHp, 5, 2);
    const hpLabel = this.add.text(hpX, hpY, `${hp} / ${maxHp}`, { fontFamily: thaiFont, fontSize: '10px', color: '#d4e6f7', stroke: '#101c36', strokeThickness: 3 }).setOrigin(0.5);
    // Compact hero cards carry exact HP; keep canvas rows clear for artwork.
    hpLabel.setVisible(enemy || !portrait && this.scale.height >= 280);
    info.add([label, bar, hpLabel]);
    const hit = this.add.zone(0, sprite.y, Math.max(64, size * 0.7), size).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.choose(id)); body.add(hit);
    const status = this.view!.state.enemies.find(e => e.id === id);
    if (status && (status.markedUntil > this.view!.state.round)) {
      const icon = this.add.text(-30, -20, '◇', { fontFamily: thaiFont, fontSize: '18px', color: '#e6b7ff', stroke: '#101c36', strokeThickness: 3 }).setOrigin(0.5);
      info.add(icon);
    }
    if (this.view!.state.intent?.sourceId === id && hp > 0) {
      const warning = this.add.text(35, -38, '◆', { fontFamily: thaiFont, fontSize: '15px', color: '#fdbdcf' }).setOrigin(0.5);
      info.add(warning);
    }
  }
  stopEffects(): void {
    for (const body of this.bodies.values()) this.tweens.killTweensOf(body);
    if (this.effects) {
      for (const child of this.effects.list) this.tweens.killTweensOf(child);
      this.effects.destroy(); this.effects = undefined;
    }
  }
  play(events: BattleEvent[]): void {
    if (!this.ready || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.effects = this.add.container(0, 0).setDepth(20);
    const source = this.view?.activeActorId ? this.bodies.get(this.view.activeActorId) : undefined;
    const target = this.view?.activeTargetId ? this.positions.get(this.view.activeTargetId) : undefined;
    if (source && target && events.some(event => event.type === 'damage')) {
      this.tweens.add({ targets: source, x: source.x + Math.sign(target.x - source.x) * 16, duration: 160, yoyo: true, ease: 'Sine.Out' });
    }
    for (const [index, event] of events.entries()) {
      const position = event.targetId ? this.positions.get(event.targetId) : undefined;
      if (!position) continue;
      if (event.type === 'damage') {
        const ring = this.add.circle(position.x, position.y, 25, 0xffffff, 0.15).setStrokeStyle(2, palette.gold);
        this.effects.add(ring);
        this.tweens.add({ targets: ring, radius: 55, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
        const label = event.amount ? `−${event.amount}` : event.absorbed ? `โล่รับ ${event.absorbed}` : 'ป้องกันได้';
        const text = this.add.text(position.x, position.y - 20, label, { fontFamily: thaiFont, fontSize: '23px', color: this.view?.phase === 'enemy' ? '#ffb6b8' : '#ffe0a6', stroke: '#101c36', strokeThickness: 4 }).setOrigin(0.5);
        this.effects.add(text);
        this.tweens.add({ targets: text, y: position.y - 65, alpha: 0, duration: 650, delay: index * 40, onComplete: () => text.destroy() });
      }
      if (event.type === 'dodge') {
        const text = this.add.text(position.x, position.y - 20, 'หลบ!', { fontFamily: thaiFont, fontSize: '22px', color: '#a9d4ff', stroke: '#101c36', strokeThickness: 4 }).setOrigin(0.5);
        this.effects.add(text);
        this.tweens.add({ targets: text, x: position.x - 24, y: position.y - 60, alpha: 0, duration: 650, onComplete: () => text.destroy() });
      }
      if (event.type === 'heal' || event.type === 'barrier') {
        const circle = this.add.circle(position.x, position.y, 18).setStrokeStyle(3, palette.cyan);
        this.effects.add(circle);
        this.tweens.add({ targets: circle, scale: 3, alpha: 0, duration: 650, onComplete: () => circle.destroy() });
        const label = this.add.text(position.x, position.y - 20, `${event.type === 'heal' ? '+' : 'โล่ +'}${event.amount}`, { fontFamily: thaiFont, fontSize: '20px', color: event.type === 'heal' ? '#85e5be' : '#8addf5', stroke: '#101c36', strokeThickness: 4 }).setOrigin(0.5);
        this.effects.add(label);
        this.tweens.add({ targets: label, y: position.y - 65, alpha: 0, duration: 650, onComplete: () => label.destroy() });
      }
    }
  }
}
