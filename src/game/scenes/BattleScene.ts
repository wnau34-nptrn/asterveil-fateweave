import Phaser from 'phaser';
import type { BattleState, EncounterDefinition, TurnStage } from '../../core/battle/types';
import { effectFamily, effectCaption, type CombatPrefs } from '../visuals/combat-effects';
import { thaiFont } from '../../ui/th';
import { palette } from '../visuals/palette';
import { BOLT_ATLAS, boltAtlasUrls, boltCast, boltImpact, type FxContext } from '../visuals/bolt-fx';
import { EXECUTE_ATLAS, WARD_ATLAS, executeAtlasUrls, wardAtlasUrls, executeCast, executeImpact, wardCast, wardSettle } from '../visuals/exec-ward-fx';
import { BLADE_ATLAS, bladeAtlasUrls, bladeCast, bladeImpact, bladeStance, bladeCues, bladePalettes, isBladeSkill } from '../visuals/blade-fx';
import { FOE_SLOT_INDEX, fieldSlots, slotPlan, type FieldSlot } from '../visuals/field-layout';
import { actorArt, actorFootOrigins, artOf, artUrl, figureRise, mirroredArt, unitsUrl } from '../visuals/assets';

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
  private quiet = false;
  private reducedMotion = false;
  // Logical (CSS pixel) field size. The canvas itself renders at devicePixelRatio and the
  // camera zooms by the same ratio, so layout, targets and input stay in CSS pixels.
  private viewW = 0;
  private viewH = 0;
  private dpr = 1;
  private fitting = false;
  private shaking: Phaser.Tweens.Tween | undefined;
  private effectTimers = new Set<Phaser.Time.TimerEvent>();
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
    this.load.atlas(BOLT_ATLAS, ...boltAtlasUrls());
    this.load.atlas(EXECUTE_ATLAS, ...executeAtlasUrls());
    this.load.atlas(WARD_ATLAS, ...wardAtlasUrls());
    this.load.atlas(BLADE_ATLAS, ...bladeAtlasUrls());
    for (const sheet of ['units', 'mercs', 'foes', 'foes2'] as const) this.load.spritesheet(`battle-${sheet}`, unitsUrl(sheet), { frameWidth: 512, frameHeight: 512 });
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
  sync(view: SceneView, repaint = true): void {
    this.view = view;
    if (!this.ready) return;
    // A summon puts a new foe on the field mid-presentation: redraw so it appears in its empty slot.
    const present = view.state.enemies.filter(e => !e.absent).map(e => e.id);
    if (repaint || present.some(id => !this.bodies.has(id))) this.paint();
    else for (const [id, body] of this.bodies) {
      const hp = [...view.state.heroes, ...view.state.enemies].find(a => a.id === id)?.hp ?? 0;
      const involved = !view.activeActorId || id === view.activeActorId || id === view.activeTargetId;
      body.setAlpha(hp <= 0 ? .28 : involved ? 1 : .55);
    }
  }
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
    const plan = slotPlan(this.encounter.heroes, this.encounter.enemies, new Set(this.encounter.phases?.flatMap(p => p.summon ?? [])));
    // Each HP panel sits just above its own painted figure (per-illustration headroom).
    const rise = new Map([...plan.heroSlots].map(([id, slot]) => [slot, figureRise(artOf(this.encounter, id))] as const)
      .concat(this.encounter.enemies.map(e => [FOE_SLOT_INDEX[e.id]!, figureRise(artOf(this.encounter, e.id))] as const)));
    const slots = fieldSlots(w, h, { ...plan, rise }), heroSlots = plan.heroSlots;
    for (const [i, hero] of this.encounter.heroes.entries()) {
      const slot = slots[heroSlots.get(hero.id)!]!;
      this.actorPanels.set(hero.id, slot);
      this.actor(hero.id, slot, this.view.state.heroes[i]!.hp, false);
    }
    for (const [i, enemy] of this.encounter.enemies.entries()) {
      // Reserves not yet summoned are off the field.
      if (this.view.state.enemies[i]!.absent) continue;
      const slot = slots[FOE_SLOT_INDEX[enemy.id]!]!;
      this.actorPanels.set(enemy.id, slot);
      this.actor(enemy.id, slot, this.view.state.enemies[i]!.hp, true);
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
    const selected = this.view!.heroId === id;
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
    // Input stays at the slot origin while the disposable body lunges/recoils.
    hit.on('pointerdown', () => this.choose(id)); info.add(hit);
  }
  // Idle life: a soft aura under the feet (cyan for heroes, rift violet for foes, brighter for the acting unit),
  // gentle breathing out of phase per unit, and rift motes rising around foes. Off under reduced motion.
  private liven(id: string, body: Phaser.GameObjects.Container, sprite: Phaser.GameObjects.Image, size: number, enemy: boolean, active: boolean): void {
    const tint = enemy ? 0xb072ff : active ? palette.cyan : 0x7fd6ff;
    const aura = this.add.ellipse(0, -2, size * .78, size * .2, tint, active ? .42 : .22).setBlendMode(Phaser.BlendModes.ADD);
    body.addAt(aura, 1);
    if (this.quiet || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
    for (const tween of this.idle) tween.resume();
    for (const timer of this.effectTimers) timer.remove(false);
    this.effectTimers.clear();
    if (this.shaking) { this.shaking.stop(); this.shaking = undefined; }
    for (const [id, body] of this.bodies) {
      this.tweens.killTweensOf(body);
      const origin = this.positions.get(id); if (origin) body.setPosition(origin.x, origin.y);
      for (const child of body.list) if (child instanceof Phaser.GameObjects.Image) child.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    }
    if (this.effects) {
      for (const child of this.effects.list) this.tweens.killTweensOf(child);
      this.effects.destroy(); this.effects = undefined;
    }
  }
  private later(ms: number, run: () => void): void {
    const timer = this.time.delayedCall(ms, () => { this.effectTimers.delete(timer); run(); });
    this.effectTimers.add(timer);
  }
  configureEffects(prefs: CombatPrefs, reducedMotion: boolean): void {
    this.quiet = prefs.intensity === 'reduced'; this.reducedMotion = reducedMotion;
  }
  private anchor(id: string | undefined): { x: number; y: number } | undefined {
    const slot = this.actorPanels.get(id ?? '');
    return slot ? { x: slot.x, y: slot.y - slot.size * .48 } : undefined;
  }
  // Layered skill effects (A8, Bolt first) draw into the same effect layer, sized from the actor's slot.
  private fx(id: string | undefined): FxContext {
    const size = this.actorPanels.get(id ?? '')?.size ?? 96;
    return { scene: this, quiet: this.quiet, reduced: this.reducedMotion, scale: Phaser.Math.Clamp(size / 96, .7, 1.25),
      add: (item, life) => { if (life !== undefined) { this.fade(item, life); return; } if (!this.effects) { this.effects = this.add.container(0, 0); this.root?.add(this.effects); } this.effects.add(item); } };
  }
  private fade(item: Phaser.GameObjects.Shape | Phaser.GameObjects.Graphics | Phaser.GameObjects.Text | Phaser.GameObjects.Image, life: number): void {
    if (!this.effects) { this.effects = this.add.container(0, 0); this.root?.add(this.effects); }
    this.effects.add(item);
    if (!this.reducedMotion) this.tweens.add({ targets: item, alpha: 0, duration: life });
  }
  private caption(id: string, copy: string, color: string, row: number, life: number): void {
    const p = this.anchor(id); if (!p || !copy) return;
    const label = this.text(p.x, Math.max(18, p.y - 22 - row * 23), copy, {
      fontFamily: thaiFont, fontSize: row ? '16px' : '20px', fontStyle: 'bold', color, stroke: '#101c36', strokeThickness: 4,
    }).setOrigin(.5);
    label.setScale(Math.min(1, (this.viewW - 16) / Math.max(1, label.width)));
    label.x = Phaser.Math.Clamp(label.x, label.displayWidth / 2 + 4, this.viewW - label.displayWidth / 2 - 4);
    this.fade(label, life);
    if (!this.quiet && !this.reducedMotion) this.tweens.add({ targets: label, y: Math.max(16, label.y - 18), duration: life });
  }
  prepare(turn: TurnStage, contactMs: number): void {
    if (!this.ready || !contactMs || this.reducedMotion) return;
    if ((turn.side === 'hero' && isBladeSkill(turn.action)) || (turn.side === 'enemy' && turn.intent?.kind === 'physical')) {
      const start = this.anchor(turn.actorId);
      // No anticipation of a hit for a cancelled action or Parry's stance.
      for (const cue of bladeCues(turn).filter(c => !c.parried).slice(0, 1)) {
        const end = this.anchor(cue.event.targetId);
        if (start && end) bladeCast(this.fx(turn.actorId), start, end, contactMs, bladePalettes[this.encounter.heroes.find(h => h.id === turn.actorId)?.role ?? ''] ?? palette.gold, cue.skill);
      }
      return;
    }
    const family = effectFamily(turn), start = this.anchor(turn.actorId);
    const hitEvent = turn.events.find(e => e.type === 'damage' || e.type === 'dodge');
    // Ward (A8): the thread and veil gather on each real barrier recipient (self-cast included).
    if (turn.action === 'ward' && turn.side === 'hero') {
      for (const e of turn.events) { const at = e.type === 'barrier' ? this.anchor(e.targetId) : undefined; if (at) wardCast(this.fx(e.targetId), at, contactMs); }
      return;
    }
    const end = this.anchor(hitEvent?.targetId ?? turn.targetId);
    if (!start || !end) return;
    // Execute (A8): blade glint, then one rose-gold cut that ends exactly at contact.
    if (turn.action === 'execute' && turn.side === 'hero') { executeCast(this.fx(turn.actorId), start, end, contactMs, hitEvent?.type === 'dodge' ? 'dodged' : hitEvent && !hitEvent.amount ? 'blocked' : 'hit'); return; }
    // Bolt (A8 vertical slice): the Astral Thread cast replaces the generic charge ring and trail.
    if (turn.action === 'bolt' && turn.side === 'hero') { boltCast(this.fx(turn.actorId), start, end, contactMs); return; }
    const color = family === 'arcane' ? 0xc5a4ff : family === 'restore' ? 0x85e5be : family === 'mark' ? 0xffa9d4 : family === 'shield' ? palette.cyan : palette.gold;
    const charge = this.add.circle(start.x, start.y, family === 'steel' ? 9 : 18).setStrokeStyle(2, color, .9);
    this.fade(charge, contactMs);
    if (!this.quiet) this.tweens.add({ targets: charge, scale: 1.6, duration: contactMs });
    if (family === 'steel') {
      const source = this.bodies.get(turn.actorId);
      if (source && !this.quiet) this.tweens.add({ targets: source, x: source.x + Math.sign(end.x - start.x) * 14, duration: contactMs, ease: 'Sine.In' });
    }
    if (family === 'arcane' || family === 'mark') {
      const trail = this.add.graphics().lineStyle(this.quiet ? 1 : 3, color, .5).lineBetween(start.x, start.y, end.x, end.y);
      this.fade(trail, contactMs);
      // Keep the traveling core bright until contact; fading during flight made
      // the projectile disappear against the illustrated field before arrival.
      const bolt = this.add.graphics().fillStyle(color).fillEllipse(0,0,this.quiet?12:26,7).fillStyle(0xffffff).fillCircle(4,0,2);
      bolt.setPosition(start.x,start.y).setRotation(Math.atan2(end.y-start.y,end.x-start.x));
      this.effects!.add(bolt);
      this.tweens.add({ targets: bolt, x: end.x, y: end.y, duration: contactMs, ease: 'Quad.In', onComplete: () => bolt.destroy() });
    }
  }
  play(turn: TurnStage, remainingMs = 650): void {
    if (!this.ready) return;
    const events = turn.events, life = Math.max(100, remainingMs - 20), family = effectFamily(turn);
    const paintedBlades = bladeCues(turn);
    const source = this.bodies.get(turn.actorId), origin = this.positions.get(turn.actorId);
    const hold = this.quiet || this.reducedMotion ? 0 : 45;
    if (source && origin) {
      this.tweens.killTweensOf(source);
      if (this.reducedMotion) source.setPosition(origin.x, origin.y);
      else this.tweens.add({ targets: source, x: origin.x, y: origin.y, delay: hold, duration: Math.min(160, life-hold), ease: 'Sine.Out' });
    }
    const rows = new Map<string, number>();
    const say = (id: string, copy: string, color = '#edf4ff') => {
      const row = rows.get(id) ?? 0; rows.set(id, row+1); this.caption(id, copy, color, row, life);
    };
    const landed = events.some(e => (e.type === 'damage' || e.type === 'counter') && (e.amount ?? 0) > 0);
    if (landed && hold) {
      for (const tween of this.idle) tween.pause();
      this.later(hold, () => { for (const tween of this.idle) tween.resume(); });
      this.shake(140, events.some(e => e.type === 'down') ? 4 : 2.5);
    }
    for (const event of events) {
      const id = event.targetId ?? event.sourceId, p = this.anchor(id);
      if (!id || !p || event.type === 'outcome') continue;
      const damage = event.type === 'damage' || event.type === 'counter';
      const intercepted = event.type === 'damage' && turn.side === 'enemy' && turn.before?.guard?.heroId === id && turn.intent?.targetId !== id;
      const shield = ['barrier','guard','brace','sanctuary'].includes(event.type) || !!event.absorbed || intercepted;
      const color = shield ? 0x8addf5 : event.type === 'heal' ? 0x85e5be : event.type === 'mark' ? 0xffa9d4 : family === 'arcane' ? 0xc5a4ff : palette.gold;
      say(id, effectCaption(event), '#' + color.toString(16).padStart(6,'0'));
      const bolt = turn.action === 'bolt' && turn.side === 'hero' && event.sourceId === turn.actorId && (event.type === 'damage' || event.type === 'dodge');
      const execute = turn.action === 'execute' && turn.side === 'hero' && event.sourceId === turn.actorId && (event.type === 'damage' || event.type === 'dodge');
      const ward = turn.action === 'ward' && turn.side === 'hero' && event.type === 'barrier';
      const blade = paintedBlades.find(cue => cue.event === event);
      const parry = event.type === 'parry';
      if (parry && event.sourceId === event.targetId) bladeStance(this.fx(id), p, life, bladePalettes.Duelist!);
      if (blade) bladeImpact(this.fx(id), blade, p, this.anchor(event.sourceId), life,
        bladePalettes[this.encounter.heroes.find(h => h.id === event.sourceId)?.role ?? ''] ?? palette.gold);
      if (execute) {
        const enemy = turn.before?.enemies.find(e => e.id === id);
        executeImpact(this.fx(id), p, life, event.type === 'dodge' ? 'dodged' : event.amount ? 'hit' : 'blocked', !!enemy && enemy.markedUntil >= turn.round);
      }
      if (ward) wardSettle(this.fx(id), p, life);
      if (bolt) boltImpact(this.fx(id), p, this.anchor(event.sourceId), life, event.type === 'dodge' ? 'dodged' : event.amount ? 'hit' : 'blocked');
      if (damage) {
        const from = this.anchor(event.sourceId);
        if (from && !bolt && !execute && !blade) {
          const slash = this.add.graphics().lineStyle(this.quiet ? 2 : 5, color, .9);
          if (family === 'steel' || event.type === 'counter') slash.lineBetween(from.x,from.y,p.x,p.y);
          if (!event.absorbed || event.amount) {
            slash.lineBetween(p.x-17,p.y+19,p.x+17,p.y-19);
            if (!this.quiet) slash.lineStyle(2,0xffffff).lineBetween(p.x-12,p.y+20,p.x+22,p.y-18);
          }
          this.fade(slash,Math.min(life,260));
        }
        const body = this.bodies.get(id), sprite = body?.list.find(c => c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image | undefined;
        if (event.amount && sprite && !this.reducedMotion) {
          // Bolt keeps the body's detail: a short violet multiply tint instead of a white fill flash.
          if (bolt || execute || blade) sprite.setTint(bolt ? 0xcdb8ff : blade ? 0xffe4c4 : 0xffd3dc).setTintMode(Phaser.TintModes.MULTIPLY); else sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
          this.later(90, () => { if (sprite.active) sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY); });
          if (body && !this.quiet) this.tweens.add({ targets:body,x:body.x+(Math.sign(p.x-(from?.x ?? p.x-1)) || 1)*7,delay:hold,duration:80,yoyo:true });
        }
        const before = turn.before?.heroes.find(h => h.id === id), after = turn.after?.heroes.find(h => h.id === id);
        if (event.absorbed && before?.barrier && !after?.barrier) say(id,'โล่หมด','#8addf5');
        if (intercepted) {
          say(id,'รับแทน','#8addf5');
          const protectedAlly = this.anchor(turn.intent?.targetId);
          if (protectedAlly) this.fade(this.add.graphics().lineStyle(3,0x8addf5,.8).lineBetween(protectedAlly.x,protectedAlly.y,p.x,p.y),life);
        }
        const enemy = turn.before?.enemies.find(e => e.id === id);
        if (turn.action === 'execute' && enemy && enemy.markedUntil >= turn.round) say(id,'โจมตีเป้าติดตรา','#ffa9d4');
      }
      if (ward || blade || parry) { /* painted layers above are the whole contact cue */ } else if (shield) {
        const g = this.add.graphics().lineStyle(3,color,.95).fillStyle(color,.12);
        const points = [{x:p.x-22,y:p.y-24},{x:p.x+22,y:p.y-24},{x:p.x+19,y:p.y+8},{x:p.x,y:p.y+26},{x:p.x-19,y:p.y+8}];
        const polygon = points.map(point => new Phaser.Math.Vector2(point.x, point.y));
        g.fillPoints(polygon,true).strokePoints(polygon,true); this.fade(g,life);
      } else if (event.type === 'heal') {
        this.fade(this.add.graphics().lineStyle(4,color).lineBetween(p.x-13,p.y,p.x+13,p.y).lineBetween(p.x,p.y-13,p.x,p.y+13),life);
      } else if (event.type === 'mark') {
        this.fade(this.add.graphics().lineStyle(2,color).strokeCircle(p.x,p.y,23).lineBetween(p.x-30,p.y,p.x-16,p.y).lineBetween(p.x+16,p.y,p.x+30,p.y).lineBetween(p.x,p.y-30,p.x,p.y-16).lineBetween(p.x,p.y+16,p.x,p.y+30),life);
      } else if (!bolt && !execute) {
        const ring = this.add.circle(p.x,p.y,damage?19:25).setStrokeStyle(2,color,.9); this.fade(ring,life);
        if (!this.quiet && !this.reducedMotion) this.tweens.add({targets:ring,scale:damage?2:1.4,duration:Math.min(350,life)});
      }
    }
    // A full-HP Heal emits no heal event. Never invent an amount.
    if (turn.action === 'heal' || turn.action === 'prayer') {
      for (const target of turn.after?.heroes ?? []) {
        if (turn.action === 'heal' && target.id !== turn.targetId) continue;
        const def = this.encounter.heroes.find(h => h.id === target.id);
        if (def && target.hp === def.maxHp && !events.some(e => e.type === 'heal' && e.targetId === target.id)) say(target.id,'HP เต็ม','#85e5be');
      }
    }
    // The denser blade art must not cover the authoritative damage/outcome captions.
    if (paintedBlades.length || turn.action === 'parry') {
      for (const child of [...(this.effects?.list ?? [])]) {
        if (child instanceof Phaser.GameObjects.Text) this.effects?.bringToTop(child);
      }
    }
  }
}
