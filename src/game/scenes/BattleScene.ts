import Phaser from 'phaser';
import type { BattleEvent, BattleState, EncounterDefinition } from '../../core/battle/types';
import { palette } from '../visuals/palette';
import { drawRiftBackdrop } from '../visuals/rift-backdrop';

export interface SceneView { state: BattleState; heroId: string; targetId: string | null }
export class BattleScene extends Phaser.Scene {
  private view: SceneView | undefined;
  private layer: Phaser.GameObjects.Container | undefined;
  private backdrop: Phaser.GameObjects.Graphics | undefined;
  private backdropSize = '';
  private positions = new Map<string, { x: number; y: number }>();
  private ready = false;
  constructor(private readonly encounter: EncounterDefinition, private readonly choose: (id: string) => void) { super('battle'); }
  create(): void {
    this.ready = true;
    this.scale.on('resize', this.paint, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.paint, this);
      this.ready = false; this.backdropSize = ''; this.backdrop = undefined;
    });
    this.paint();
  }
  sync(view: SceneView): void { this.view = view; if (this.ready) this.paint(); }
  private paint(): void {
    if (!this.view) return;
    this.layer?.destroy();
    this.layer = this.add.container(0, 0);
    this.positions.clear();
    const { width: w, height: h } = this.scale;
    const compact = w < 600;
    if (this.backdropSize !== `${w}:${h}`) {
      this.backdrop?.destroy();
      this.backdrop = drawRiftBackdrop(this, w, h);
      this.backdropSize = `${w}:${h}`;
    }
    const bg = this.add.graphics(); this.layer.add(bg);
    const platform = (x: number, y: number, rx: number) => {
      bg.fillStyle(palette.stone); bg.fillEllipse(x, y + 15, rx * 2, 42);
      bg.fillTriangle(x - rx + 8, y + 16, x + rx - 8, y + 16, x - 12, y + 62);
      bg.fillStyle(palette.grass); bg.fillEllipse(x, y + 7, rx * 2, 25);
      bg.lineStyle(1, palette.cyan, 0.25); bg.strokeEllipse(x, y + 7, rx * 2, 25);
      bg.lineStyle(1, palette.gold, 0.4); bg.strokeEllipse(x, y + 9, rx * 2 - 6, 22);
    };
    const hx = compact ? 66 : w * 0.23; const ex = compact ? w - 66 : w * 0.78;
    this.encounter.heroes.forEach((hero, i) => {
      const y = compact ? 67 + i * 94 : 98 + i * 100;
      platform(hx, y + 20, compact ? 48 : 100);
      this.actor(hero.id, hero.role, hx, y, hero.color, this.view!.state.heroes[i]!.hp, hero.maxHp, false, compact);
    });
    this.encounter.enemies.forEach((enemy, i) => {
      const y = compact ? 105 + i * 135 : 140 + i * 135;
      platform(ex, y + 25, compact ? 51 : 112);
      this.actor(enemy.id, enemy.name, ex, y, enemy.color, this.view!.state.enemies[i]!.hp, enemy.maxHp, true, compact);
    });
    const cx = w / 2; const cy = compact ? 154 : h * 0.48;
    this.positions.set(this.encounter.crystal.id, { x: cx, y: cy });
    platform(cx, cy + 40, compact ? 33 : 50);
    const crystal = this.add.graphics(); this.layer.add(crystal);
    const charged = this.view.state.crystal.charges > 0;
    crystal.fillStyle(charged ? palette.cyan : palette.stone, 0.15); crystal.fillCircle(cx, cy, compact ? 27 : 45);
    crystal.lineStyle(2, charged ? palette.cyan : palette.mist, 0.8);
    crystal.fillStyle(charged ? palette.cyan : palette.stone);
    const points = [[cx, cy - 28], [cx + 14, cy], [cx, cy + 28], [cx - 14, cy]].map(([x, y]) => new Phaser.Math.Vector2(x, y));
    crystal.fillPoints(points, true);
    crystal.strokePoints(points, true);
    crystal.lineStyle(1, 0xffffff, 0.65); crystal.lineBetween(cx, cy - 28, cx + 3, cy + 18);
    crystal.lineStyle(3, palette.gold, charged ? 0.8 : 0.25);
    crystal.lineBetween(cx - 19, cy - 9, cx - 25, cy + 27);
    crystal.lineBetween(cx + 19, cy - 9, cx + 25, cy + 27);
    crystal.strokeEllipse(cx, cy + 30, 53, 15);
    const crystalLabel = this.add.text(cx, cy + 61, compact ? 'CRYSTAL' : 'ENERGY CRYSTAL', { fontFamily: 'sans-serif', fontSize: compact ? '10px' : '12px', color: '#9ae7ef', stroke: '#101c36', strokeThickness: 3 }).setOrigin(0.5);
    this.layer.add(crystalLabel);
    const hit = this.add.zone(cx, cy, 65, 85).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.choose(this.encounter.crystal.id)); this.layer.add(hit);
    if (this.view.targetId === this.encounter.crystal.id) { crystal.lineStyle(2, palette.gold); crystal.strokeCircle(cx, cy, 33); }
    const intent = this.view.state.intent;
    if (intent) {
      const source = this.positions.get(intent.sourceId)!; const target = this.positions.get(intent.targetId)!;
      bg.lineStyle(2, intent.redirectable ? palette.corruption : 0xf08da1, 0.4);
      const dx = target.x - source.x; const dy = target.y - source.y;
      for (let t = 0.15; t < 0.8; t += 0.09) bg.lineBetween(source.x + dx * t, source.y + dy * t, source.x + dx * (t + 0.04), source.y + dy * (t + 0.04));
    }
  }
  private actor(id: string, name: string, x: number, y: number, color: number, hp: number, maxHp: number, enemy: boolean, compact: boolean): void {
    this.positions.set(id, { x, y });
    const body = this.add.container(x, y); this.layer!.add(body);
    if (hp <= 0) body.setAlpha(0.28);
    const g = this.add.graphics(); body.add(g);
    const selected = this.view!.heroId === id || this.view!.targetId === id;
    if (selected && hp > 0) { g.lineStyle(2, palette.gold); g.strokeEllipse(0, 25, 68, 22); }
    // Chibi silhouette: large head, small body, distinct equipment.
    if (id === 'tracer') {
      g.fillStyle(0xc95168); g.fillTriangle(-9, -4, -40, -9, -24, 24);
    }
    if (id === 'weaver') {
      g.fillStyle(0xddd6f5); g.fillRoundedRect(-23, -28, 46, 34, 13);
    }
    g.fillStyle(color); g.fillRoundedRect(-17, -2, 34, 30, 10);
    g.fillStyle(0x11233d); g.fillRoundedRect(-15, 18, 12, 11, 3); g.fillRoundedRect(3, 18, 12, 11, 3);
    g.fillStyle(enemy ? color : 0xffe1ba); g.fillCircle(0, -19, enemy && id === 'brute' ? 23 : 19);
    g.fillStyle(enemy ? 0x423153 : color); g.fillEllipse(0, -30, 39, 18);
    if (!enemy) {
      g.fillStyle(id === 'weaver' ? 0xf2e9ff : id === 'guardian' ? 0xd6a366 : 0x643a35);
      g.fillTriangle(-18, -32, 10, -34, -8, -21);
      if (id === 'weaver') {
        g.fillStyle(0x263254); g.fillTriangle(-14, -28, 3, -45, 20, -28);
        g.fillEllipse(0, -28, 50, 7);
        g.lineStyle(2, palette.gold); g.lineBetween(-13, -29, 16, -29);
      }
    }
    if (enemy) {
      g.fillTriangle(-19, -24, -27, -46, -5, -31); g.fillTriangle(19, -24, 27, -46, 5, -31);
    }
    g.fillStyle(enemy ? 0xfed5ff : 0x24314c); g.fillCircle(-6, -18, 2); g.fillCircle(6, -18, 2);
    if (id === 'guardian') {
      g.fillStyle(0xcee9ff); g.fillRoundedRect(-29, -1, 19, 28, 5);
      g.lineStyle(2, palette.gold); g.strokeRoundedRect(-29, -1, 19, 28, 5); g.lineBetween(-20, 1, -20, 22);
    } else if (id === 'tracer' || id === 'raider') {
      g.lineStyle(4, palette.gold); g.lineBetween(19, 16, 34, -14);
    } else {
      g.lineStyle(3, enemy ? 0x6b507f : palette.gold); g.lineBetween(24, 27, 24, -28);
      g.fillStyle(color); g.fillCircle(24, -31, 6);
    }
    if (id === 'brute') {
      g.fillStyle(palette.corruption, 0.5);
      g.fillTriangle(-15, -3, -34, -13, -28, 18);
      g.fillTriangle(15, -3, 34, -13, 28, 18);
      g.setScale(1.2);
    }
    const label = this.add.text(0, 40, name, { fontFamily: 'sans-serif', fontSize: compact ? '11px' : '13px', color: '#f0f5ff', stroke: '#101c36', strokeThickness: 3 }).setOrigin(0.5);
    // Hero HP sits beside the silhouette so the next hero cannot cover it.
    const hpX = enemy ? 0 : compact ? 57 : 76;
    const hpY = enemy ? 69 : 7;
    const barY = enemy ? 53 : 20;
    const barWidth = enemy ? 70 : 52;
    const bar = this.add.graphics(); bar.fillStyle(0x101c36); bar.fillRoundedRect(hpX - barWidth / 2, barY, barWidth, 5, 2);
    bar.fillStyle(color); bar.fillRoundedRect(hpX - barWidth / 2, barY, barWidth * hp / maxHp, 5, 2);
    const hpLabel = this.add.text(hpX, hpY, `${hp} / ${maxHp}`, { fontFamily: 'sans-serif', fontSize: '10px', color: '#d4e6f7', stroke: '#101c36', strokeThickness: 3 }).setOrigin(0.5);
    body.add([label, bar, hpLabel]);
    const hit = this.add.zone(0, 0, 78, 100).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.choose(id)); body.add(hit);
    if (this.view!.state.intent?.sourceId === id && hp > 0) {
      const warning = this.add.text(35, -38, '◆', { fontFamily: 'sans-serif', fontSize: '15px', color: '#fdbdcf' }).setOrigin(0.5);
      body.add(warning);
    }
  }
  play(events: BattleEvent[]): void {
    if (!this.ready || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const [index, event] of events.entries()) {
      const position = event.targetId ? this.positions.get(event.targetId) : undefined;
      if (!position) continue;
      if (event.type === 'damage') {
        const ring = this.add.circle(position.x, position.y, 25, 0xffffff, 0.15).setStrokeStyle(2, palette.gold);
        this.tweens.add({ targets: ring, radius: 55, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
        const text = this.add.text(position.x, position.y - 20, `−${event.amount}`, { fontFamily: 'sans-serif', fontSize: '23px', color: '#ffe0a6', stroke: '#101c36', strokeThickness: 4 }).setOrigin(0.5);
        this.tweens.add({ targets: text, y: position.y - 65, alpha: 0, duration: 650, delay: index * 40, onComplete: () => text.destroy() });
      }
      if (event.type === 'redirect' || event.type === 'barrier') {
        const circle = this.add.circle(position.x, position.y, 18).setStrokeStyle(3, palette.cyan);
        this.tweens.add({ targets: circle, scale: 3, alpha: 0, duration: 650, onComplete: () => circle.destroy() });
      }
    }
  }
}
