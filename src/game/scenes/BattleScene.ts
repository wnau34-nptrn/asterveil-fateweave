import Phaser from 'phaser';
import type { BattleEvent, BattleState, EncounterDefinition } from '../../core/battle/types';
import { actorName, thaiFont } from '../../ui/th';
import { palette } from '../visuals/palette';
import { drawRiftBackdrop } from '../visuals/rift-backdrop';
import { actorFrames, artUrl } from '../visuals/assets';

export interface SceneView { state: BattleState; heroId: string; targetId: string | null; phase?: 'hero' | 'enemy'; activeActorId?: string; activeTargetId?: string }
export class BattleScene extends Phaser.Scene {
  private view: SceneView | undefined;
  private layer: Phaser.GameObjects.Container | undefined;
  private backdrop: Phaser.GameObjects.Image | undefined;
  private backdropSize = '';
  private positions = new Map<string, { x: number; y: number }>();
  private bodies = new Map<string, Phaser.GameObjects.Container>();
  private effects: Phaser.GameObjects.Container | undefined;
  private ready = false;
  constructor(private readonly encounter: EncounterDefinition, private readonly choose: (id: string) => void, private readonly onReady: () => void) { super('battle'); }
  get isReady(): boolean { return this.ready; }
  preload(): void {
    this.load.image('rift-ruins', artUrl('ruins'));
    this.load.spritesheet('battle-units', artUrl('units'), { frameWidth: 512, frameHeight: 512 });
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
    this.positions.clear();
    const { width: w, height: h } = this.scale;
    const compact = w < 900;
    const short = w < 900 || h < 360;
    const portrait = w < 900 && h >= 280;
    const stageTop = short ? portrait ? 110 : 60 : 135;
    const stageHeight = Math.max(80, h - (portrait ? 20 : 35) - stageTop);
    if (this.backdropSize !== `${w}:${h}`) {
      this.backdrop?.destroy();
      this.backdrop = drawRiftBackdrop(this, w, h);
      this.backdropSize = `${w}:${h}`;
    }
    const bg = this.add.graphics(); this.layer.add(bg);
    const platform = (x: number, y: number, rx: number) => {
      bg.fillStyle(0x07131f, 0.48); bg.fillEllipse(x, y + 8, rx * 2, short ? 13 : 24);
      bg.lineStyle(1, palette.cyan, 0.4); bg.strokeEllipse(x, y + 9, rx * 2, short ? 13 : 24);
      bg.lineStyle(1, palette.gold, 0.25); bg.strokeEllipse(x, y + 9, rx * 2 - 6, short ? 10 : 20);
    };
    this.encounter.heroes.forEach((hero, i) => {
      const x = w * (hero.lane === 'back' ? (compact ? 0.12 : 0.14) : (compact ? 0.34 : 0.31));
      const laneIndex = this.encounter.heroes.filter(h => h.lane === hero.lane).findIndex(h => h.id === hero.id);
      const ratio = laneIndex === 0 ? 0.20 : 0.82;
      const y = stageTop + stageHeight * ratio;
      platform(x, y + (short ? 20 : 39), short ? 32 : 75);
      this.actor(hero.id, actorName(hero.id, this.encounter), x, y, hero.color, this.view!.state.heroes[i]!.hp, hero.maxHp, false, short);
    });
    this.encounter.enemies.forEach((enemy, i) => {
      const x = w * (portrait ? enemy.id === 'brute' ? 0.68 : 0.88 : enemy.id === 'brute' ? 0.84 : 0.73);
      const y = stageTop + stageHeight * (enemy.id === 'brute' ? 0.70 : 0.22);
      platform(x, y + (short ? 21 : enemy.id === 'brute' ? 55 : 35), short ? 38 : enemy.id === 'brute' ? 108 : 72);
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
    this.layer.sort('depth');
  }
  private actor(id: string, name: string, x: number, y: number, color: number, hp: number, maxHp: number, enemy: boolean, compact: boolean): void {
    this.positions.set(id, { x, y });
    const body = this.add.container(x, y); this.layer!.add(body);
    this.bodies.set(id, body);
    const info = this.add.container(x, y).setDepth(10); this.layer!.add(info);
    const involved = !this.view!.activeActorId || id === this.view!.activeActorId || id === this.view!.activeTargetId;
    body.setAlpha(hp <= 0 ? 0.28 : involved ? 1 : 0.55);
    info.setAlpha(hp <= 0 ? 0.4 : involved ? 1 : 0.75);
    const g = this.add.graphics(); body.add(g);
    const short = compact;
    const portrait = this.scale.width < 900 && this.scale.height >= 280;
    const selected = this.view!.heroId === id || this.view!.targetId === id;
    if (selected && hp > 0) { g.lineStyle(2, palette.gold); g.strokeEllipse(0, 25, 68, 22); }
    if (id === this.view!.activeActorId && hp > 0) {
      g.lineStyle(3, enemy ? 0xf19b9f : palette.cyan); g.strokeEllipse(0, 24, short ? 78 : 115, short ? 26 : 33);
    }
    const size = short ? id === 'brute' ? 110 : 80 : id === 'brute' ? 215 : enemy ? 142 : 145;
    const sprite = this.add.image(0, short ? 15 : id === 'brute' ? 55 : 39, 'battle-units', actorFrames[id]!).setOrigin(0.5, 1).setDisplaySize(size, size);
    body.add(sprite);
    const label = this.add.text(0, short ? 20 : enemy && id === 'brute' ? 70 : 51, name, { fontFamily: thaiFont, fontSize: compact ? '12px' : '14px', color: '#f0f5ff', stroke: '#101c36', strokeThickness: 3 }).setOrigin(0.5);
    // Hero HP sits beside the silhouette so the next hero cannot cover it.
    const hpX = enemy ? 0 : short ? portrait ? 0 : 42 : 90;
    const hpY = enemy ? short ? 43 : id === 'brute' ? 99 : 80 : short && portrait ? 39 : 7;
    const barY = enemy ? short ? 34 : id === 'brute' ? 86 : 65 : short && portrait ? 28 : 20;
    const barWidth = enemy ? 70 : 52;
    const bar = this.add.graphics(); bar.fillStyle(0x101c36); bar.fillRoundedRect(hpX - barWidth / 2, barY, barWidth, 5, 2);
    bar.fillStyle(color); bar.fillRoundedRect(hpX - barWidth / 2, barY, barWidth * hp / maxHp, 5, 2);
    const hpLabel = this.add.text(hpX, hpY, `${hp} / ${maxHp}`, { fontFamily: thaiFont, fontSize: '10px', color: '#d4e6f7', stroke: '#101c36', strokeThickness: 3 }).setOrigin(0.5);
    // Compact hero cards carry exact HP; keep canvas rows clear for artwork.
    hpLabel.setVisible(enemy || !portrait);
    info.add([label, bar, hpLabel]);
    const hit = this.add.zone(0, sprite.y, Math.max(64, size * 0.7), size).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.choose(id)); body.add(hit);
    const status = this.view!.state.enemies.find(e => e.id === id);
    if (status && (status.markedUntil > this.view!.state.beat)) {
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
