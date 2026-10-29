import Phaser from 'phaser';
import { anatomyHold, unitKey, unitDisplayRatio, unitAtlasUrls, unitClip, type UnitClip, type UnitSheet } from '../visuals/unit-frames';
import { OptionalUnitAssets } from '../visuals/optional-unit-assets';
import { unitFrameView } from '../visuals/unit-frame-view';
import { UnitAnimation } from '../visuals/unit-animation';
import { unitPose, unitReactions } from '../visuals/unit-animation-map';
import type { BattleEvent, BattleState, EncounterDefinition, TurnStage } from '../../core/battle/types';
import { effectFamily, effectCaption, type CombatPrefs } from '../visuals/combat-effects';
import { thaiFont } from '../../ui/th';
import { palette } from '../visuals/palette';
import { BOLT_ATLAS, boltAtlasUrls, boltCast, boltImpact, type FxContext } from '../visuals/bolt-fx';
import { EXECUTE_ATLAS, WARD_ATLAS, executeAtlasUrls, wardAtlasUrls, executeCast, executeImpact, wardCast, wardSettle } from '../visuals/exec-ward-fx';
import { BLADE_ATLAS, bladeAtlasUrls, bladeCast, bladeImpact, bladeStance, bladeCues, bladePalettes, isBladeSkill } from '../visuals/blade-fx';
import { DEFENSE_ATLAS, defenseAtlasUrls, defenseCast, defenseContact, defenseCues, isDefenseSkill } from '../visuals/defense-fx';
import { HEALING_ATLAS, healingAtlasUrls, healingPrepare, healingContact, healingCues, isHealingSkill, type HealingContext } from '../visuals/healing-fx';
import { PROJECTILE_ATLAS, projectileAtlasUrls, projectileCues, projectilePrepare, projectileContact, isProjectileSkill } from '../visuals/projectile-fx';
import { SEAL_ATLAS, sealAtlasUrls, sealCues, sealEvents, sealPrepare, sealContact, isSealSkill, type SealSpot } from '../visuals/arcane-seal-fx';
import { SONG_ATLAS, songAtlasUrls, isSongSkill, songPlan, songPrepare, songContact, type SongSpot } from '../visuals/song-fx';
import { FOE_SIGNATURE_ATLAS, foeSignatureAtlasUrls, foeSignatureCues, foeSignaturePrepare, foeSignatureContact, isFoeSignatureMove, type FoeSpot } from '../visuals/foe-signature-fx';
import { COMMAND_ATLAS, commandAtlasUrls, commandCues, commandPrepare, commandContact, isCommandSkill, type CommandSpot } from '../visuals/command-fx';
import { ALCHEMY_ATLAS, alchemyAtlasUrls, alchemyCues, alchemyEvents, alchemyPrepare, alchemyContact, alchemyHealingCues, isAlchemySkill, type AlchemySkill } from '../visuals/alchemy-fx';
import { EARTH_ATLAS, earthAtlasUrls, earthCues, earthPrepare, earthContact, earthHealingCues, earthHealingEvents, isEarthSkill, type EarthSkill } from '../visuals/earth-fx';
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
  private healingLayer: Phaser.GameObjects.Container | undefined;
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
  private readonly unitAnimation = new UnitAnimation();
  private readonly optionalUnits = new OptionalUnitAssets();
  private optionalDirty = false;
  private stageActive = false;
  private battleVisible = false;
  private optionalRequest = true;
  constructor(private encounter: EncounterDefinition, private readonly choose: (id: string) => void, private readonly onReady: () => void, private readonly onLayout: () => void) { super('battle'); this.optionalUnits.setEncounter(encounter); }
  get isReady(): boolean { return this.ready; }
  setBattleVisible(visible: boolean): void { this.battleVisible = visible; if (visible) this.optionalRequest = true; }
  setEncounter(data: EncounterDefinition): void {
    this.stopEffects(); this.encounter = data; this.view = undefined;
    this.actorTargets.clear(); this.actorPanels.clear();
    this.optionalUnits.setEncounter(data);
    this.optionalRequest = true;
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
    this.load.atlas(PROJECTILE_ATLAS, ...projectileAtlasUrls());
    this.load.atlas(EARTH_ATLAS, ...earthAtlasUrls());
    this.load.atlas(ALCHEMY_ATLAS, ...alchemyAtlasUrls());
    this.load.atlas(SEAL_ATLAS, ...sealAtlasUrls());
    this.load.atlas(COMMAND_ATLAS, ...commandAtlasUrls());
    this.load.atlas(FOE_SIGNATURE_ATLAS, ...foeSignatureAtlasUrls());
    this.load.atlas(SONG_ATLAS, ...songAtlasUrls());
    this.load.atlas(DEFENSE_ATLAS, ...defenseAtlasUrls());
    this.load.atlas(HEALING_ATLAS, ...healingAtlasUrls());
    for (const sheet of ['units', 'mercs', 'foes', 'foes2'] as const) this.load.spritesheet(`battle-${sheet}`, unitsUrl(sheet), { frameWidth: 512, frameHeight: 512 });
  }
  create(): void {
    this.ready = true;
    // Turn banners and scrolling move the canvas without resizing its texture.
    const updateInputBounds = () => this.scale.updateBounds();
    this.game.canvas.addEventListener('pointerdown', updateInputBounds, { capture: true, passive: true });
    this.game.canvas.addEventListener('touchstart', updateInputBounds, { capture: true, passive: true });
    this.scale.on('resize', this.paint, this);
    this.load.on('complete', this.optionalUnitsLoaded, this);
    this.fit(true);
    this.events.once('shutdown', () => {
      this.stopEffects(); this.unitAnimation.clear();
      for (const tween of this.idle) tween.remove(); this.idle = [];
      this.game.canvas.removeEventListener('pointerdown', updateInputBounds, true);
      this.game.canvas.removeEventListener('touchstart', updateInputBounds, true);
      this.scale.off('resize', this.paint, this);
      this.load.off('complete', this.optionalUnitsLoaded, this);
      this.optionalUnits.reset(); this.optionalDirty = false;
      this.ready = false;
    });
    this.paint();
    this.onReady();
    this.optionalRequest = true;
  }
  private hasOptionalUnit = (name: UnitSheet): boolean => this.textures.exists(`unit-pilot-${name}`);
  // Held identities draw no frames, so they keep the plain procedural motion (and its recover length).
  private framedClip(art: string, action?: string, intent?: string): UnitClip | undefined {
    return anatomyHold.has(art) ? undefined : unitClip(art, action, intent);
  }
  private requestOptionalUnits(): void {
    const names = this.optionalUnits.request(this.hasOptionalUnit);
    for (const name of names) this.load.atlas(`unit-pilot-${name}`, ...unitAtlasUrls(name));
    if (names.length && !this.load.isLoading()) this.load.start();
  }
  private optionalUnitsLoaded(): void {
    if (!this.load.isLoading() && this.optionalUnits.complete(this.hasOptionalUnit)) this.optionalDirty = true;
  }
  // A missed resize notification would leave the canvas stretched against the DOM targets;
  // re-measure the arena twice a second while the battle renders.
  update(time: number, delta: number): void {
    if (this.battleVisible && this.optionalRequest) { this.optionalRequest = false; this.requestOptionalUnits(); }
    this.unitAnimation.update(delta);
    for (const image of this.songFloor) (image.getData('songFollow') as (() => void) | undefined)?.();
    for (const image of [...(this.healingLayer?.list ?? []), ...(this.effects?.list ?? []), ]) {
      const follow = image.getData('healingFollow') as (() => void) | undefined;
      follow?.();
      (image.getData('projectileFollow') as (() => void) | undefined)?.();
      (image.getData('earthFollow') as (() => void) | undefined)?.();
      (image.getData('alchemyFollow') as (() => void) | undefined)?.();
      (image.getData('sealFollow') as (() => void) | undefined)?.();
      (image.getData('commandFollow') as (() => void) | undefined)?.();
      (image.getData('foeSigFollow') as (() => void) | undefined)?.();
      (image.getData('songFollow') as (() => void) | undefined)?.();
    }
    // Adopt newly decoded art only at a safe boundary, never repaint an actor mid-attack.
    if (this.optionalDirty && !this.stageActive && this.view) this.paint();
    if (time < this.nextSizeCheck) return;
    this.nextSizeCheck = time + 500;
    this.fit();
  }
  sync(view: SceneView, repaint = true): void {
    const previous = this.view?.state;
    this.view = view;
    if (!this.ready) return;
    // A summon puts a new foe on the field mid-presentation: redraw so it appears in its empty slot.
    const present = view.state.enemies.filter(e => !e.absent).map(e => e.id);
    if (repaint || present.some(id => !this.bodies.has(id))) this.paint();
    else for (const [id, body] of this.bodies) {
      const hp = [...view.state.heroes, ...view.state.enemies].find(a => a.id === id)?.hp ?? 0;
      const oldHp = [...(previous?.heroes ?? []), ...(previous?.enemies ?? [])].find(a => a.id === id)?.hp;
      if (oldHp !== undefined && (oldHp > 0) !== (hp > 0)) this.unitAnimation.reset(id);
      const involved = !view.activeActorId || id === view.activeActorId || id === view.activeTargetId;
      body.setAlpha(hp <= 0 ? .28 : involved ? 1 : .55);
    }
  }
  private paint(): void {
    if (!this.view) return;
    this.optionalDirty = false;
    this.stopEffects(); this.unitAnimation.clear(); this.bodies.clear();
    for (const t of this.idle) t.remove(); this.idle = [];
    // The camera only carries the pixel-ratio zoom; clear any effect so art and DOM targets share one origin.
    // The camera stays at its defaults; the root container alone carries the pixel-ratio scale,
    // so art, input zones and the DOM targets (CSS pixels) share one origin.
    this.cameras.main.resetFX().setZoom(1).setScroll(0, 0);
    this.root ??= this.add.container(0, 0);
    this.root.setPosition(0, 0).setScale(this.dpr);
    this.layer?.destroy();
    // Old bodies are gone; release only optional textures absent from the new encounter.
    for (const name of this.optionalUnits.unused(this.hasOptionalUnit)) this.textures.remove(`unit-pilot-${name}`);
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
    const ratio = unitDisplayRatio(key);
    // Packed animation atlases already face their side (A9 Matriarch, A10 Raider); only the static seed cell is mirrored.
    const pilot = unitKey(key), framed = !!pilot && this.textures.exists(pilot);
    const sprite = this.add.image(0, 0, framed ? pilot : `battle-${art.sheet}`, framed ? hp <= 0 ? 21 : 0 : art.frame)
      .setOrigin(.5, framed ? 496 / 512 : actorFootOrigins[key] ?? 1).setDisplaySize(size * (framed ? ratio : 1), size * (framed ? ratio : 1)).setFlipX(!framed && mirroredArt.has(key));
    body.add(sprite);
    const nextFrame = framed ? this.add.image(0, 0, pilot, 0)
      .setOrigin(sprite.originX, sprite.originY).setDisplaySize(size * ratio, size * ratio).setFlipX(sprite.flipX).setVisible(false) : undefined;
    if (nextFrame) body.add(nextFrame);
    const alive = () => [...(this.view?.state.heroes ?? []), ...(this.view?.state.enemies ?? [])].some(a => a.id === id && a.hp > 0);
    const idleStart = this.idle.length;
    if (hp > 0) this.liven(id, body, sprite, size, enemy, id === this.view!.activeActorId);
    const idleTweens = this.idle.slice(idleStart);
    this.unitAnimation.bind(id, body, size, paused => {
      for (const tween of idleTweens) { if (paused || !alive()) tween.pause(); else tween.resume(); }
    }, nextFrame ? unitFrameView(key, sprite, nextFrame, alive, () => {
      nextFrame.setPosition(sprite.x, sprite.y).setScale(sprite.scaleX, sprite.scaleY).setFlipX(sprite.flipX);
      nextFrame.setTint(sprite.tintTopLeft).setTintMode(sprite.tintMode);
    }) : undefined);
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
    this.stageActive = false;
    this.unitAnimation.settle();
    for (const timer of this.effectTimers) timer.remove(false);
    this.effectTimers.clear();
    if (this.shaking) { this.shaking.stop(); this.shaking = undefined; }
    for (const [id, body] of this.bodies) {
      this.tweens.killTweensOf(body);
      const origin = this.positions.get(id); if (origin) body.setPosition(origin.x, origin.y);
      for (const child of body.list) if (child instanceof Phaser.GameObjects.Image) child.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    }
    for (const layer of [this.effects, this.healingLayer]) {
      if (!layer) continue;
      for (const child of layer.list) this.tweens.killTweensOf(child);
      layer.destroy();
    }
    this.effects = undefined; this.healingLayer = undefined;
    // Song/shadow floor layers live inside their unit's body (above its contact shadow, behind the sprite), so remove them explicitly.
    for (const image of [...this.songFloor]) { this.tweens.killTweensOf(image); image.destroy(); }
  }
  private later(ms: number, run: () => void): void {
    const timer = this.time.delayedCall(ms, () => { this.effectTimers.delete(timer); run(); });
    this.effectTimers.add(timer);
  }
  configureEffects(prefs: CombatPrefs, reducedMotion: boolean): void {
    if (reducedMotion || prefs.intensity === 'reduced') this.unitAnimation.settle();
    this.unitAnimation.setLoops(!(reducedMotion || prefs.intensity === 'reduced'));
    this.quiet = prefs.intensity === 'reduced'; this.reducedMotion = reducedMotion;
  }
  private anchor(id: string | undefined): { x: number; y: number } | undefined {
    const slot = this.actorPanels.get(id ?? '');
    return slot ? { x: slot.x, y: slot.y - slot.size * .48 } : undefined;
  }
  // Layered skill effects (A8, Bolt first) draw into the same effect layer, sized from the actor's slot.
  private defensePoint = (id:string) => {
    const body=this.anchor(id),slot=this.actorPanels.get(id);
    return body&&slot?{...body,footY:slot.y}:undefined;
  };
  // Unit-local sole position, including cast/reaction/idle offsets and field shake.
  // Input/HP stay at the stationary slot; healing paint follows the rendered unit instead.
  healingAnchor(id: string) {
    const body = this.bodies.get(id), slot = this.actorPanels.get(id);
    if (!body || !slot) return;
    const sprite = body.list.find(child => child instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image | undefined;
    const foot = body.getLocalTransformMatrix().transformPoint(sprite?.x ?? 0, sprite?.y ?? 0);
    return { x: foot.x + (this.layer?.x ?? 0), footY: foot.y + (this.layer?.y ?? 0), y: foot.y - slot.size * .48 };
  }
  // Landmarks are transformed with the actual sprite, including pose scale/rotation and root DPR.
  projectileAnchor(id: string) {
    const body=this.bodies.get(id),slot=this.actorPanels.get(id);
    const sprite=body?.list.find(c=>c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image|undefined;
    if(!sprite||!slot)return;
    const knife=this.encounter.heroes.find(h=>h.id===id)?.role==='Scout';
    const matrix=sprite.getWorldTransformMatrix();
    const ratio=sprite.texture.key.startsWith('unit-pilot-')?unitDisplayRatio(artOf(this.encounter,id)):1;
    const point=(x:number,y:number)=>{const p=matrix.transformPoint(x*sprite.width/ratio,y*sprite.height/ratio);return {x:p.x/this.dpr,y:p.y/this.dpr};};
    const bodyAt=point(0,-.48),release=point(knife?-.4:.36,-(knife?.58:.86));
    return {...bodyAt,releaseX:release.x,releaseY:release.y,size:slot.size};
  }
  earthAnchor(id:string,skill:EarthSkill,prepare=false){
    const body=this.bodies.get(id),slot=this.actorPanels.get(id);
    const sprite=body?.list.find(c=>c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image|undefined;
    if(!sprite||!slot)return;
    const ratio=sprite.texture.key.startsWith('unit-pilot-')?unitDisplayRatio(artOf(this.encounter,id)):1;
    const x=prepare?.10:skill==='bash'?-.31:skill==='slam'?-.30:0;
    const y=prepare?-.98:skill==='bash'?-.80:skill==='slam'?-.62:.04;
    const p=sprite.getWorldTransformMatrix().transformPoint(x*sprite.width/ratio,y*sprite.height/ratio);
    return {x:p.x/this.dpr,y:p.y/this.dpr,size:slot.size};
  }
  alchemyAnchor(id:string,skill:AlchemySkill,prepare=false){
    const body=this.bodies.get(id),slot=this.actorPanels.get(id);
    const sprite=body?.list.find(c=>c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image|undefined;
    if(!sprite||!slot)return;
    const ratio=sprite.texture.key.startsWith('unit-pilot-')?unitDisplayRatio(artOf(this.encounter,id)):1,matrix=sprite.getWorldTransformMatrix();
    const sole=matrix.transformPoint(0,0),support=skill==='haste'||skill==='fury';
    const rightEdge=sole.x/this.dpr>this.viewW*.76;
    const x=prepare?.10:support?.40:rightEdge?.33:-.46,y=prepare?-.98:support?-.35:-.64;
    const p=matrix.transformPoint(x*sprite.width/ratio,y*sprite.height/ratio);
    return {x:p.x/this.dpr,y:p.y/this.dpr,size:slot.size};
  }
  // Arcane Seal landmarks follow the rendered unit: caster hand, lower torso (waist) or sole contact.
  sealAnchor(id:string,spot:SealSpot){
    const body=this.bodies.get(id),slot=this.actorPanels.get(id);
    const sprite=body?.list.find(c=>c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image|undefined;
    if(!sprite||!slot)return;
    const ratio=sprite.texture.key.startsWith('unit-pilot-')?unitDisplayRatio(artOf(this.encounter,id)):1,matrix=sprite.getWorldTransformMatrix();
    const x=spot==='hand'?.36:0,y=spot==='hand'?-.86:spot==='centre'?-.40:.04;
    const p=matrix.transformPoint(x*sprite.width/ratio,y*sprite.height/ratio),sole=matrix.transformPoint(0,0);
    return {x:p.x/this.dpr,y:p.y/this.dpr,size:slot.size,side:(sole.x/this.dpr>this.viewW*.76?-1:1) as 1|-1};
  }
  // Command landmarks (C5.9): upper body, shield front/rim and the resolved foe body; never the floor.
  commandAnchor(id:string,spot:CommandSpot){
    const body=this.bodies.get(id),slot=this.actorPanels.get(id);
    const sprite=body?.list.find(c=>c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image|undefined;
    if(!sprite||!slot)return;
    const ratio=sprite.texture.key.startsWith('unit-pilot-')?unitDisplayRatio(artOf(this.encounter,id)):1,matrix=sprite.getWorldTransformMatrix();
    const at={chest:[.08,-.58],forward:[.24,-.60],shield:[.30,-.50],crown:[.28,-.68],foe:[0,-.55]}[spot];
    const p=matrix.transformPoint(at[0]!*sprite.width/ratio,at[1]!*sprite.height/ratio),sole=matrix.transformPoint(0,0);
    return {x:p.x/this.dpr,y:p.y/this.dpr,size:slot.size,side:(sole.x/this.dpr>this.viewW*.76?-1:1) as 1|-1};
  }
  // Foe signature landmarks (AV06) follow the rendered unit: a hero's chest, a foe's forward hand (foes face left) or the sole.
  foeAnchor(id:string,spot:FoeSpot){
    const body=this.bodies.get(id),slot=this.actorPanels.get(id);
    const sprite=body?.list.find(c=>c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image|undefined;
    if(!sprite||!slot)return;
    const ratio=sprite.texture.key.startsWith('unit-pilot-')?unitDisplayRatio(artOf(this.encounter,id)):1;
    const at={chest:[0,-.50],hand:[-.34,-.62],feet:[0,.04]}[spot];
    const p=sprite.getWorldTransformMatrix().transformPoint(at[0]!*sprite.width/ratio,at[1]!*sprite.height/ratio);
    return {x:p.x/this.dpr,y:p.y/this.dpr,size:slot.size};
  }
  // Song/shadow landmarks (C5.8/C5.9) follow the rendered unit: caster hand, lower torso (waist) or sole contact.
  songAnchor(id:string,spot:SongSpot){
    const body=this.bodies.get(id),slot=this.actorPanels.get(id);
    const sprite=body?.list.find(c=>c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image|undefined;
    if(!sprite||!slot)return;
    const ratio=sprite.texture.key.startsWith('unit-pilot-')?unitDisplayRatio(artOf(this.encounter,id)):1,matrix=sprite.getWorldTransformMatrix();
    const x=spot==='hand'?.36:0,y=spot==='hand'?-.86:spot==='waist'?-.40:.04;
    const p=matrix.transformPoint(x*sprite.width/ratio,y*sprite.height/ratio),sole=matrix.transformPoint(0,0);
    return {x:p.x/this.dpr,y:p.y/this.dpr,size:slot.size,side:(sole.x/this.dpr>this.viewW*.76?-1:1) as 1|-1};
  }
  // Floor layers (rings, pools, wisps) sit in the actor layer just behind the unit they stand under; the shared effect layers
  // are painted behind the whole field and would be hidden by it.
  private songFloor = new Set<Phaser.GameObjects.Image>();
  private songFx(id:string){
    const front=this.fx(id);
    return {front,back:{...front,add:(item:Phaser.GameObjects.Image)=>{
      // The unit whose feet the layer stands under; the layer's follow() sets world coordinates, so offset by the body's origin.
      let owner:Phaser.GameObjects.Container|undefined,best=Infinity;
      for(const body of this.bodies.values()){const d=Math.hypot(body.x-item.x,body.y-item.y);if(d<best){best=d;owner=body;}}
      const sprite=owner?.list.find(c=>c instanceof Phaser.GameObjects.Image);
      if(!owner||!sprite){this.layer?.add(item);return;}
      owner.addAt(item,owner.list.indexOf(sprite));
      const body=owner,follow=item.getData('songFollow') as (()=>void)|undefined;
      item.setData('songLocal',()=>({x:body.x,y:body.y}));
      if(follow)follow();else item.setPosition(item.x-body.x,item.y-body.y);
      this.songFloor.add(item);item.once('destroy',()=>this.songFloor.delete(item));
    }}};
  }
  private sealFx(id:string){return {front:this.fx(id),back:this.projectileFx(id)};}
  private projectileFx(id:string):FxContext {
    return {...this.fx(id),add:item=>{
      if(!this.healingLayer){this.healingLayer=this.add.container(0,0);this.root?.addAt(this.healingLayer,0);}
      this.healingLayer.add(item);
    }};
  }
  private healingFx(id: string): HealingContext {
    return { ...this.fx(id), addRim: item => this.fx(id).add(item), add: item => {
      if (!this.healingLayer) { this.healingLayer = this.add.container(0, 0); this.root?.addAt(this.healingLayer, 0); }
      this.healingLayer.add(item);
    } };
  }
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
    this.stageActive = true;
    if (!this.ready || !contactMs || this.reducedMotion) return;
    const hitEvent = turn.events.find(e => (e.type === 'damage' || e.type === 'dodge') && e.sourceId === turn.actorId);
    const pose = unitPose(turn, this.encounter);
    if (!this.quiet && pose) {
      const from = this.anchor(turn.actorId), to = this.anchor(hitEvent?.targetId ?? turn.targetId);
      const direction = from && to ? Math.sign(to.x - from.x) : turn.side === 'hero' ? 1 : -1;
      this.unitAnimation.begin(turn.actorId, pose, direction || (turn.side === 'hero' ? 1 : -1), contactMs, this.framedClip(artOf(this.encounter, turn.actorId), turn.action, turn.intent?.name));
    }
    if(this.textures.exists(PROJECTILE_ATLAS)){
      const seen=new Set<string>();
      for(const cue of projectileCues(turn)){const key=cue.sourceId+cue.skill;projectilePrepare(this.projectileFx(cue.sourceId),cue,id=>this.projectileAnchor(id),contactMs,!seen.has(key));seen.add(key);}
      if(turn.side==='hero'&&isProjectileSkill(turn.action))return;
    }
    // Foe signature moves (AV06): painted gather + travel to the real recipient; a cancelled turn paints nothing.
    if(turn.side==='enemy'&&isFoeSignatureMove(turn.intent?.name)&&this.textures.exists(FOE_SIGNATURE_ATLAS)){
      foeSignaturePrepare(this.fx(turn.actorId),foeSignatureCues(turn),(id,spot)=>this.foeAnchor(id,spot),contactMs);return;
    }
    if(turn.side==='hero'&&isCommandSkill(turn.action)&&this.textures.exists(COMMAND_ATLAS)){
      commandPrepare({front:this.fx(turn.actorId)},turn,(id,spot)=>this.commandAnchor(id,spot),contactMs);return;
    }
    if(turn.side==='hero'&&isSongSkill(turn.action)&&this.textures.exists(SONG_ATLAS)&&songPrepare(this.songFx(turn.actorId),turn,(id,spot)=>this.songAnchor(id,spot),contactMs))return;
    if(turn.side==='hero'&&isSealSkill(turn.action)&&this.textures.exists(SEAL_ATLAS)){
      sealPrepare(this.sealFx(turn.actorId),turn,(id,spot)=>this.sealAnchor(id,spot),contactMs);return;
    }
    if(turn.side==='hero'&&isAlchemySkill(turn.action)&&this.textures.exists(ALCHEMY_ATLAS)){
      alchemyPrepare(this.projectileFx(turn.actorId),turn,(id,skill,pre)=>this.alchemyAnchor(id,skill,pre),contactMs);return;
    }
    if(turn.side==='hero'&&isEarthSkill(turn.action)&&this.textures.exists(EARTH_ATLAS)){
      earthPrepare(this.projectileFx(turn.actorId),earthCues(turn),(id,skill,pre)=>this.earthAnchor(id,skill,pre),contactMs);return;
    }
    if (turn.side === 'hero' && isHealingSkill(turn.action) && this.textures.exists(HEALING_ATLAS)) {
      healingPrepare(this.healingFx(turn.actorId), healingCues(turn), id => this.healingAnchor(id), contactMs);
      return;
    }
    if (turn.side==='hero' && isDefenseSkill(turn.action) && this.textures.exists(DEFENSE_ATLAS)) {
      for (const cue of defenseCues(turn,this.encounter)) defenseCast(this.fx(cue.targetId),cue,this.defensePoint,contactMs);
      return;
    }
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
    this.stageActive = true;
    if (!this.ready) return;
    const events = turn.events, life = Math.max(100, remainingMs - 20), family = effectFamily(turn);
    // Sanctuary at 1 HP can prevent HP loss without absorbing a barrier point.
    const savedWithoutDamage = (event:BattleEvent) => event.type==='damage'&&!event.amount&&!event.absorbed&&events.some(e=>e.type==='sanctuary'&&e.targetId===event.targetId);
    // Veil Quake is physical but painted by the foe-signature layers, never by the generic blade slash.
    const foeReady=this.textures.exists(FOE_SIGNATURE_ATLAS)&&turn.side==='enemy'&&isFoeSignatureMove(turn.intent?.name);
    const paintedFoe=foeReady?foeSignatureCues(turn):[];
    const foeEventSet=new Set(paintedFoe.map(c=>c.event));
    const paintedBlades = bladeCues(turn).filter(c=>!savedWithoutDamage(c.event)&&!(foeReady&&!c.parried));
    const paintedDefense = this.textures.exists(DEFENSE_ATLAS)?defenseCues(turn,this.encounter).filter(c=>c.kind!=='absorb'||!(paintedBlades.some(b=>b.event===c.event)||foeEventSet.has(c.event))):[];
    const earthHeals=this.textures.exists(HEALING_ATLAS)?earthHealingEvents(turn):[];
    const paintedHealing = this.textures.exists(HEALING_ATLAS) ? [...healingCues(turn),...earthHealingCues(turn),...alchemyHealingCues(turn)] : [];
    const paintedAlchemy=this.textures.exists(ALCHEMY_ATLAS)?alchemyCues(turn):[];
    const alchemyEventSet=new Set(this.textures.exists(ALCHEMY_ATLAS)?alchemyEvents(turn):[]);
    const paintedSeal=this.textures.exists(SEAL_ATLAS)?sealCues(turn):[];
    const sealEventSet=new Set(this.textures.exists(SEAL_ATLAS)?sealEvents(turn):[]);
    const songReady=this.textures.exists(SONG_ATLAS),paintedSong=songReady?songPlan(turn):undefined;
    const songEventSet=new Set(paintedSong?.events??[]);
    const commandReady=this.textures.exists(COMMAND_ATLAS);
    const paintedCommand=commandReady?commandCues(turn).filter(c=>!paintedDefense.some(d=>d.event===c.event)):[];
    const commandEventSet=new Set(commandReady?paintedCommand.map(c=>c.event):[]);
    const paintedEarth=this.textures.exists(EARTH_ATLAS)?earthCues(turn):[];
    const earthEvents=new Set(paintedEarth.map(c=>c.event));
    const paintedProjectiles=this.textures.exists(PROJECTILE_ATLAS)?projectileCues(turn):[];
    const projectileEvents=new Set(paintedProjectiles.map(c=>c.event));
    const healingEvents = new Set([...paintedHealing.map(c => c.event),...earthHeals]);
    const defenseEvents = new Set(paintedDefense.map(c=>c.event));
    for(const event of events)if(savedWithoutDamage(event))defenseEvents.add(event);
    const hold = this.quiet || this.reducedMotion ? 0 : 45;
    this.unitAnimation.contact(turn.actorId, remainingMs);
    if (!this.quiet && !this.reducedMotion) {
      for (const [id, reaction] of unitReactions(turn, this.encounter)) {
        const at = this.anchor(id), from = this.anchor(reaction.sourceId);
        const direction = at && from ? Math.sign(from.x - at.x) : this.encounter.heroes.some(h => h.id === id) ? 1 : -1;
        this.unitAnimation.react(id, reaction.pose, direction, remainingMs);
      }
    }
    const rows = new Map<string, number>();
    const say = (id: string, copy: string, color = '#edf4ff') => {
      const row = rows.get(id) ?? 0; rows.set(id, row+1); this.caption(id, copy, color, row, life);
    };
    const landed = events.some(e => (e.type === 'damage' || e.type === 'counter') && (e.amount ?? 0) > 0);
    if (landed && hold) {
      this.shake(140, events.some(e => e.type === 'down') ? 4 : 2.5);
    }
    for(const image of [...(this.healingLayer?.list??[])])if(projectileEvents.has(image.getData('projectileEvent') as BattleEvent)){this.tweens.killTweensOf(image);image.destroy();}
    for(const image of [...(this.healingLayer?.list??[])])if(image.getData('earthPrepare')){this.tweens.killTweensOf(image);image.destroy();}
    for(const image of [...(this.healingLayer?.list??[])])if(image.getData('alchemyPrepare')){this.tweens.killTweensOf(image);image.destroy();}
    for(const layer of [this.healingLayer,this.effects])for(const image of [...(layer?.list??[])])if(image.getData('sealPrepare')){this.tweens.killTweensOf(image);image.destroy();}
    for(const image of [...(this.healingLayer?.list??[]),...(this.effects?.list??[])])if(image.getData('commandTag')==='prepare'){this.tweens.killTweensOf(image);image.destroy();}
    for(const image of [...(this.healingLayer?.list??[]),...(this.effects?.list??[])])if(image.getData('foeSigTag')==='prepare'){this.tweens.killTweensOf(image);image.destroy();}
    for(const image of [...(this.healingLayer?.list??[]),...(this.effects?.list??[]),...this.songFloor])if(image.getData('songPrepare')){this.tweens.killTweensOf(image);image.destroy();}
    if(paintedSong)songContact(this.songFx(paintedSong.casterId),paintedSong,(id,spot)=>this.songAnchor(id,spot),life);
    for(const cue of paintedFoe)foeSignatureContact(this.fx(cue.targetId),cue,(id,spot)=>this.foeAnchor(id,spot),life);
    for(const cue of paintedCommand)commandContact({front:this.fx(cue.kind==='cast'?cue.sourceId:cue.targetId)},cue,(id,spot)=>this.commandAnchor(id,spot),life);
    for(const cue of paintedSeal)sealContact(this.sealFx(cue.targetId),cue,(id,spot)=>this.sealAnchor(id,spot),life);
    for(const cue of paintedAlchemy)alchemyContact(this.projectileFx(cue.targetId),cue,(id,skill,pre)=>this.alchemyAnchor(id,skill,pre),life);
    for(const cue of paintedEarth)earthContact(this.projectileFx(cue.targetId),cue,(id,skill,pre)=>this.earthAnchor(id,skill,pre),life);
    for(const cue of paintedProjectiles)projectileContact(this.projectileFx(cue.targetId),cue,id=>this.projectileAnchor(id),life);
    for (const cue of paintedHealing) healingContact(this.healingFx(cue.targetId), cue, id => this.healingAnchor(id), life);
    for (const cue of paintedDefense) defenseContact(this.fx(cue.targetId),cue,this.defensePoint,life);
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
      const projectile=projectileEvents.has(event),earth=earthEvents.has(event),alchemy=alchemyEventSet.has(event)||sealEventSet.has(event)||commandEventSet.has(event)||songEventSet.has(event)||foeEventSet.has(event);
      const defense = defenseEvents.has(event) || healingEvents.has(event);
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
        if (from && !bolt && !execute && !blade && !defense && !projectile && !earth && !alchemy) {
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
          if (bolt || execute || blade || defense || projectile || earth || alchemy) sprite.setTint(bolt ? 0xcdb8ff : blade ? 0xffe4c4 : defense ? 0xc6e8e2 : 0xffd3dc).setTintMode(Phaser.TintModes.MULTIPLY); else sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
          this.later(90, () => { if (sprite.active) sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY); });
        }
        const before = turn.before?.heroes.find(h => h.id === id), after = turn.after?.heroes.find(h => h.id === id);
        if (event.absorbed && before?.barrier && !after?.barrier) say(id,'โล่หมด','#8addf5');
        if (intercepted) {
          say(id,'รับแทน','#8addf5');
          const protectedAlly = this.anchor(turn.intent?.targetId);
          if (protectedAlly && !defense) this.fade(this.add.graphics().lineStyle(3,0x8addf5,.8).lineBetween(protectedAlly.x,protectedAlly.y,p.x,p.y),life);
        }
        const enemy = turn.before?.enemies.find(e => e.id === id);
        if (turn.action === 'execute' && enemy && enemy.markedUntil >= turn.round) say(id,'โจมตีเป้าติดตรา','#ffa9d4');
      }
      const projectileStatus=paintedProjectiles.length>0&&turn.side==='hero'&&event.sourceId===turn.actorId&&(event.type==='delay'||event.type==='pin');
      const earthStatus=paintedEarth.length>0&&event.sourceId===turn.actorId&&['interrupt','sigil','resist'].includes(event.type);
      const sealStatus=paintedSeal.length>0&&event.sourceId===turn.actorId&&['sigil','dispel'].includes(event.type);
      if (ward || blade || parry || defense || projectile || projectileStatus || earth || earthStatus || alchemy || sealStatus) { /* painted layers above are the whole contact cue */ } else if (shield) {
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
    if (paintedBlades.length || paintedDefense.length || paintedHealing.length || paintedProjectiles.length || paintedEarth.length || paintedAlchemy.length || paintedSeal.length || paintedCommand.length || paintedFoe.length || !!paintedSong || turn.action === 'parry') {
      for (const child of [...(this.effects?.list ?? [])]) {
        if (child instanceof Phaser.GameObjects.Text) this.effects?.bringToTop(child);
      }
    }
  }
}
