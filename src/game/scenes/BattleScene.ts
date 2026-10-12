import Phaser from 'phaser';
import type { BattleEvent, BattleState, EncounterDefinition } from '../../core/battle/types';
import { palette } from '../visuals/palette';

export interface SceneView { state: BattleState; heroId: string; targetId: string | null }
export class BattleScene extends Phaser.Scene {
  private view: SceneView | undefined;
  private layer: Phaser.GameObjects.Container | undefined;
  private positions = new Map<string, { x: number; y: number }>();
  private ready = false;
  constructor(private readonly encounter: EncounterDefinition, private readonly choose: (id: string) => void) { super('battle'); }
  create(): void {
    this.ready = true;
    this.scale.on('resize', this.paint, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.paint, this));
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
    const bg = this.add.graphics(); this.layer.add(bg);
    bg.fillGradientStyle(0x162746, 0x1d294b, 0x294463, 0x24405a, 1);
    bg.fillRect(0, 0, w, h);
    // Original geometric floating ruins. No supplied art or external assets.
    for (let i = 0; i < 7; i++) {
      const x = w * i / 6; const y = h * (0.22 + (i % 3) * 0.06);
      bg.fillStyle(0x344462, 0.75);
      bg.fillTriangle(x - 90, y + 40, x, y - 75, x + 110, y + 40);
      bg.fillStyle(palette.mist, 0.22); bg.fillTriangle(x - 28, y - 35, x, y - 75, x + 24, y - 35);
    }
    bg.lineStyle(1, palette.mist, 0.08);
    for (let i = 0; i < 9; i++) bg.lineBetween(0, h * 0.52 + i * 24, w, h * 0.52 + i * 24);
    const platform = (x: number, y: number, rx: number) => {
      bg.fillStyle(palette.stone); bg.fillEllipse(x, y + 15, rx * 2, 42);
      bg.fillTriangle(x - rx + 8, y + 16, x + rx - 8, y + 16, x - 12, y + 62);
      bg.fillStyle(palette.grass); bg.fillEllipse(x, y + 7, rx * 2, 25);
      bg.lineStyle(1, palette.cyan, 0.25); bg.strokeEllipse(x, y + 7, rx * 2, 25);
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
    const crystalLabel = this.add.text(cx, cy + 61, compact ? 'CRYSTAL' : 'ENERGY CRYSTAL', { fontFamily: 'sans-serif', fontSize: compact ? '10px' : '12px', color: '#9ae7ef' }).setOrigin(0.5);
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
    g.fillStyle(color); g.fillRoundedRect(-17, -2, 34, 30, 10);
    g.fillStyle(0x11233d); g.fillRoundedRect(-15, 18, 12, 11, 3); g.fillRoundedRect(3, 18, 12, 11, 3);
    g.fillStyle(enemy ? color : 0xffe1ba); g.fillCircle(0, -19, enemy && id === 'brute' ? 23 : 19);
    g.fillStyle(enemy ? 0x423153 : color); g.fillEllipse(0, -30, 39, 18);
    if (enemy) {
      g.fillTriangle(-19, -24, -27, -46, -5, -31); g.fillTriangle(19, -24, 27, -46, 5, -31);
    }
    g.fillStyle(enemy ? 0xfed5ff : 0x24314c); g.fillCircle(-6, -18, 2); g.fillCircle(6, -18, 2);
    if (id === 'guardian') {
      g.fillStyle(0xcee9ff); g.fillRoundedRect(-29, -1, 19, 28, 5); g.lineStyle(2, color); g.lineBetween(-20, 1, -20, 22);
    } else if (id === 'tracer' || id === 'raider') {
      g.lineStyle(4, palette.gold); g.lineBetween(19, 16, 34, -14);
    } else {
      g.lineStyle(3, enemy ? 0x6b507f : palette.gold); g.lineBetween(24, 27, 24, -28);
      g.fillStyle(color); g.fillCircle(24, -31, 6);
    }
    const label = this.add.text(0, 40, name, { fontFamily: 'sans-serif', fontSize: compact ? '11px' : '13px', color: '#f0f5ff' }).setOrigin(0.5);
    const bar = this.add.graphics(); bar.fillStyle(0x101c36); bar.fillRoundedRect(-35, 53, 70, 5, 2);
    bar.fillStyle(color); bar.fillRoundedRect(-35, 53, 70 * hp / maxHp, 5, 2);
    const hpLabel = this.add.text(0, 69, `${hp} / ${maxHp}`, { fontFamily: 'sans-serif', fontSize: '10px', color: '#bed1e8' }).setOrigin(0.5);
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
