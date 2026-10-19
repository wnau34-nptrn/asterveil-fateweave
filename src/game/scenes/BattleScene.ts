import Phaser from 'phaser';
import type { BattleEvent, BattleState, EncounterDefinition } from '../../core/battle/types';
import { thaiFont } from '../../ui/th';
import { palette } from '../visuals/palette';
import { fieldSlots, type FieldSlot } from '../visuals/field-layout';
import { actorArt, actorFootOrigins, artOf, artUrl, mirroredArt, unitsUrl } from '../visuals/assets';

// Device pixels per CSS pixel for the canvas buffer (capped: 3x covers current phones).
export const pixelRatio = (): number => Math.min(3, Math.max(1, window.devicePixelRatio || 1));

export interface ActorTarget { x: number; y: number; width: number; height: number }
export interface SceneView { state: BattleState; heroId: string; targetId: string | null; phase?: 'hero' | 'enemy'; activeActorId?: string; activeTargetId?: string }
export class BattleScene extends Phaser.Scene {
  private view: SceneView | undefined;
  private layer: Phaser.GameObjects.Container | undefined;
  private positions = new Map<string, { x: number; y: number }>();
  readonly actorTargets = new Map<string, ActorTarget>();
  readonly actorPanels = new Map<string, FieldSlot>();
  private bodies = new Map<string, Phaser.GameObjects.Container>();
  private effects: Phaser.GameObjects.Container | undefined;
  private ready = false;
  // Logical (CSS pixel) field size. The canvas itself renders at devicePixelRatio and the
  // camera zooms by the same ratio, so layout, targets and input stay in CSS pixels.
  private viewW = 0;
  private viewH = 0;
  private dpr = 1;
  private fitting = false;
  private shaking: Phaser.Tweens.Tween | undefined;
  private root: Phaser.GameObjects.Container | undefined;
  private nextSizeCheck = 0;
  // Idle life (breathing, auras, motes) is rebuilt with each paint and never touches state.
  private idle: Phaser.Tweens.Tween[] = [];
  constructor(private encounter: EncounterDefinition, private readonly choose: (id: string) => void, private readonly onReady: () => void, private readonly onLayout: () => void) { super('battle'); }
  get isReady(): boolean { return this.ready; }
  setEncounter(data: EncounterDefinition): void {
    this.stopEffects(); this.encounter = data; this.view = undefined;
    this.actorTargets.clear(); this.actorPanels.clear();
  }
  refreshLayout(): void {
    // DOM teaching strips change the field without a window resize. Refresh
    // immediately so sprites and targets cannot remain clipped in the old size.
    if (this.ready) this.fit();
  }
  // Size the canvas to its parent at the screen's pixel density (sharp art on 2x/3x phones).
  // clientWidth/Height ignore CSS transforms, so view transitions never resize the buffer.
  private fit(force = false): void {
    const parent = this.game.canvas.parentElement; if (!parent || this.fitting) return;
    // The canvas is absolutely positioned (CSS), so its buffer can never grow the arena;
    // the clamp is a second guard against a resize feedback loop on any engine.
    const w = Math.min(parent.clientWidth, window.innerWidth), h = Math.min(parent.clientHeight, window.innerHeight);
    if (!w || !h) return;
    const dpr = pixelRatio();
    if (!force && w === this.viewW && h === this.viewH && dpr === this.dpr) return;
    this.fitting = true;
    try {
      this.viewW = w; this.viewH = h; this.dpr = dpr;
      this.scale.zoom = 1 / dpr; // Phaser styles the canvas at buffer × zoom = CSS size
      this.scale.resize(Math.round(w * dpr), Math.round(h * dpr)); // emits 'resize' → paint
      Object.assign(this.game.canvas.style, { width: `${w}px`, height: `${h}px` });
      this.scale.updateBounds();
    } finally { this.fitting = false; }
  }
  private text(x: number, y: number, value: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    return this.add.text(x, y, value, { ...style, resolution: this.dpr });
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
    this.fit(true);
    this.events.once('shutdown', () => {
      this.game.canvas.removeEventListener('pointerdown', updateInputBounds, true);
      this.game.canvas.removeEventListener('touchstart', updateInputBounds, true);
      this.scale.off('resize', this.paint, this);
      this.ready = false;
    });
    this.paint();
    this.onReady();
  }
  // A missed resize notification would leave the canvas stretched against the DOM targets;
  // re-measure the arena twice a second while the battle renders.
  update(time: number): void {
    if (time < this.nextSizeCheck) return;
    this.nextSizeCheck = time + 500;
    this.fit();
  }
  sync(view: SceneView): void { this.view = view; if (this.ready) this.paint(); }
  private paint(): void {
    if (!this.view) return;
    this.stopEffects(); this.bodies.clear();
    for (const t of this.idle) t.remove(); this.idle = [];
    // The camera only carries the pixel-ratio zoom; clear any effect so art and DOM targets share one origin.
    // The camera stays at its defaults; the root container alone carries the pixel-ratio scale,
    // so art, input zones and the DOM targets (CSS pixels) share one origin.
    this.cameras.main.resetFX().setZoom(1).setScroll(0, 0);
    this.root ??= this.add.container(0, 0);
    this.root.setPosition(0, 0).setScale(this.dpr);
    this.layer?.destroy();
    this.layer = this.add.container(0, 0); this.root.addAt(this.layer, 0);
    this.positions.clear(); this.actorTargets.clear(); this.actorPanels.clear();
    const w = this.viewW, h = this.viewH;
    const bg = this.add.graphics(); this.layer.add(bg);
    const slots = fieldSlots(w, h);
    const free = { back: [slots[0]!, slots[1]!], front: [slots[2]!, slots[3]!] };
    for (const [i, hero] of this.encounter.heroes.entries()) {
      const own = free[hero.lane], other = free[hero.lane === 'front' ? 'back' : 'front'];
      const slot = own.shift() ?? other.shift()!;
      this.actorPanels.set(hero.id, slot);
      this.actor(hero.id, slot, this.view.state.heroes[i]!.hp, false);
    }
    for (const [i, enemy] of this.encounter.enemies.entries()) {
      const slot = slots[4 + i]!;
      this.actorPanels.set(enemy.id, slot);
      this.actor(enemy.id, slot, this.view.state.enemies[i]!.hp, true);
    }
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
  private actor(id: string, slot: FieldSlot, hp: number, enemy: boolean): void {
    const { x, y, size } = slot;
    this.positions.set(id, { x, y });
    // Sort bodies by their feet rather than roster insertion order.
    const body = this.add.container(x, y).setDepth(y); this.layer!.add(body);
    this.bodies.set(id, body);
    const info = this.add.container(x, y).setDepth(this.viewH + 1); this.layer!.add(info);
    const involved = !this.view!.activeActorId || id === this.view!.activeActorId || id === this.view!.activeTargetId;
    body.setAlpha(hp <= 0 ? 0.28 : involved ? 1 : 0.55);
    info.setAlpha(hp <= 0 ? 0.4 : involved ? 1 : 0.75);
    const g = this.add.graphics(); body.add(g);
    const selected = this.view!.heroId === id || this.view!.targetId === id;
    // A contact shadow and selection ring share the same foot anchor.
    g.fillStyle(0x07131f, .65); g.fillEllipse(0, 0, size * .65, size * .12);
    if (selected && hp > 0) { g.lineStyle(2, palette.gold); g.strokeEllipse(0, 0, size * .68, size * .14); }
    if (id === this.view!.activeActorId && hp > 0) {
      g.lineStyle(3, enemy ? 0xf19b9f : palette.cyan); g.strokeEllipse(0, 0, size * .72, size * .16);
    }
    const key = artOf(this.encounter, id); const art = actorArt[key]!;
    const sprite = this.add.image(0, 0, `battle-${art.sheet}`, art.frame).setOrigin(0.5, actorFootOrigins[key] ?? 1).setDisplaySize(size, size).setFlipX(mirroredArt.has(key));
    body.add(sprite);
    if (hp > 0) this.liven(id, body, sprite, size, enemy, id === this.view!.activeActorId);
    const hitWidth = Math.max(44, Math.min(72, size * .7));
    const hitHeight = Math.max(44, size * .9);
    this.actorTargets.set(id, { x: x - hitWidth / 2, y: y + sprite.y - hitHeight, width: hitWidth, height: hitHeight });
    const hit = this.add.zone(0, sprite.y, Math.max(64, size * 0.7), size).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.choose(id)); body.add(hit);
    if (this.view!.state.intent?.sourceId === id && hp > 0) {
      const warning = this.text(35, -38, '◆', { fontFamily: thaiFont, fontSize: '15px', color: '#fdbdcf' }).setOrigin(0.5);
      info.add(warning);
    }
  }
  // Idle life: a soft aura under the feet (cyan for heroes, rift violet for foes, brighter for the acting unit),
  // gentle breathing out of phase per unit, and rift motes rising around foes. Off under reduced motion.
  private liven(id: string, body: Phaser.GameObjects.Container, sprite: Phaser.GameObjects.Image, size: number, enemy: boolean, active: boolean): void {
    const tint = enemy ? 0xb072ff : active ? palette.cyan : 0x7fd6ff;
    const aura = this.add.ellipse(0, -2, size * .78, size * .2, tint, active ? .42 : .22).setBlendMode(Phaser.BlendModes.ADD);
    body.addAt(aura, 1);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const phase = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 1000;
    const sx = sprite.scaleX, sy = sprite.scaleY;
    this.idle.push(this.tweens.add({ targets: sprite, scaleY: sy * 1.022, scaleX: sx * .992, duration: 1500 + phase % 600, delay: phase, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    this.idle.push(this.tweens.add({ targets: aura, alpha: active ? .62 : .36, scaleX: 1.08, duration: 1300 + phase % 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    if (active) this.idle.push(this.tweens.add({ targets: sprite, y: sprite.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    // Rift motes: a few sparks drifting up through each foe.
    const motes = enemy ? 4 : active ? 3 : 0;
    for (let i = 0; i < motes; i++) {
      const dot = this.add.circle(0, 0, enemy ? 2.2 : 1.8, enemy ? 0xd9b8ff : 0xfff1c4, .9).setBlendMode(Phaser.BlendModes.ADD); body.add(dot);
      const x0 = (((phase * (i + 3)) % 100) / 100 - .5) * size * .6; const y0 = -size * (.1 + ((phase + i * 37) % 30) / 100);
      dot.setPosition(x0, y0).setAlpha(0);
      this.idle.push(this.tweens.add({ targets: dot, y: y0 - size * .45, x: x0 + (i % 2 ? 8 : -8), alpha: { from: 0, to: .9, yoyo: true }, duration: 2200 + i * 350, delay: i * 520 + phase % 400, repeat: -1, ease: 'Sine.Out' }));
    }
  }
  // Impact shake moves the field layer, never the camera: the camera carries the
  // devicePixelRatio zoom, and a camera shake left the art offset from the DOM targets.
  private shake(duration: number, strength: number): void {
    const layer = this.layer; if (!layer) return;
    if (this.shaking) this.shaking.stop();
    layer.setPosition(0, 0);
    this.shaking = this.tweens.addCounter({
      from: 1, to: 0, duration,
      onUpdate: tween => { if (layer.active) { const k = tween.getValue()! * strength; layer.setPosition((Math.random() * 2 - 1) * k, (Math.random() * 2 - 1) * k); } },
      onComplete: () => { if (layer.active) layer.setPosition(0, 0); },
      onStop: () => { if (layer.active) layer.setPosition(0, 0); },
    });
  }
  stopEffects(): void {
    if (this.shaking) { this.shaking.stop(); this.shaking = undefined; }
    for (const body of this.bodies.values()) this.tweens.killTweensOf(body);
    if (this.effects) {
      for (const child of this.effects.list) this.tweens.killTweensOf(child);
      this.effects.destroy(); this.effects = undefined;
    }
  }
  play(events: BattleEvent[]): void {
    if (!this.ready || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.effects = this.add.container(0, 0); this.root?.add(this.effects);
    const source = this.view?.activeActorId ? this.bodies.get(this.view.activeActorId) : undefined;
    const target = this.view?.activeTargetId ? this.positions.get(this.view.activeTargetId) : undefined;
    if (source && target && events.some(event => event.type === 'damage')) {
      this.tweens.add({ targets: source, x: source.x + Math.sign(target.x - source.x) * 16, duration: 160, yoyo: true, ease: 'Sine.Out' });
    }
    // Hit reaction: the struck unit flashes white and recoils a step away from the attacker.
    for (const event of events) {
      if (event.type !== 'damage' || !event.targetId || !event.amount) continue;
      const body = this.bodies.get(event.targetId); const sprite = body?.list.find(c => c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image | undefined;
      if (!body || !sprite) continue;
      const from = event.sourceId ? this.positions.get(event.sourceId) : undefined; const away = from ? Math.sign(body.x - from.x) || 1 : 1;
      this.time.delayedCall(140, () => { if (!sprite.active) return; sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL); this.time.delayedCall(90, () => { if (sprite.active) sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY); }); });
      this.tweens.add({ targets: body, x: body.x + away * 10, duration: 90, delay: 140, yoyo: true, ease: 'Quad.Out' });
    }
    // Impact: a short camera shake for any landed hit (stronger when a fighter falls).
    const landed = events.filter(event => event.type === 'damage' && (event.amount ?? 0) > 0);
    if (landed.length) this.shake(events.some(event => event.type === 'down') ? 220 : 140, events.some(event => event.type === 'down') ? 7 : 4);
    for (const [index, event] of events.entries()) {
      const position = event.targetId ? this.positions.get(event.targetId) : undefined;
      if (!position) continue;
      if (event.type === 'damage') {
        const ring = this.add.circle(position.x, position.y, 25, 0xffffff, 0.15).setStrokeStyle(2, palette.gold);
        this.effects.add(ring);
        this.tweens.add({ targets: ring, radius: 55, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
        const label = event.amount ? `−${event.amount}` : event.absorbed ? `โล่รับ ${event.absorbed}` : 'ป้องกันได้';
        const text = this.text(position.x, position.y - 20, label, { fontFamily: thaiFont, fontSize: event.amount ? '32px' : '23px', fontStyle: 'bold', color: this.view?.phase === 'enemy' ? '#ffb6b8' : '#ffe0a6', stroke: '#101c36', strokeThickness: 5 }).setOrigin(0.5).setScale(.6);
        this.effects.add(text);
        // Numbers pop in large, then rise and fade.
        this.tweens.add({ targets: text, scale: 1.15, duration: 110, ease: 'Back.Out', yoyo: false, onComplete: () => this.tweens.add({ targets: text, scale: 1, y: position.y - 70, alpha: 0, duration: 620, delay: 120 + index * 40, onComplete: () => text.destroy() }) });
        // The struck body flashes white for a moment.
        const struck = event.targetId ? this.bodies.get(event.targetId) : undefined;
        const sprite = struck?.list.find((child): child is Phaser.GameObjects.Image => child instanceof Phaser.GameObjects.Image);
        if (sprite && event.amount) { sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL); this.time.delayedCall(90, () => { if (sprite.active) sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY); }); }
      }
      if (event.type === 'dodge') {
        const text = this.text(position.x, position.y - 20, 'หลบ!', { fontFamily: thaiFont, fontSize: '22px', color: '#a9d4ff', stroke: '#101c36', strokeThickness: 4 }).setOrigin(0.5);
        this.effects.add(text);
        this.tweens.add({ targets: text, x: position.x - 24, y: position.y - 60, alpha: 0, duration: 650, onComplete: () => text.destroy() });
      }
      if (event.type === 'heal' || event.type === 'barrier') {
        const circle = this.add.circle(position.x, position.y, 18).setStrokeStyle(3, palette.cyan);
        this.effects.add(circle);
        this.tweens.add({ targets: circle, scale: 3, alpha: 0, duration: 650, onComplete: () => circle.destroy() });
        const label = this.text(position.x, position.y - 20, `${event.type === 'heal' ? '+' : 'โล่ +'}${event.amount}`, { fontFamily: thaiFont, fontSize: '20px', color: event.type === 'heal' ? '#85e5be' : '#8addf5', stroke: '#101c36', strokeThickness: 4 }).setOrigin(0.5);
        this.effects.add(label);
        this.tweens.add({ targets: label, y: position.y - 65, alpha: 0, duration: 650, onComplete: () => label.destroy() });
      }
    }
  }
}
