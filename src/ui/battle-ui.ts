import { actionReason, beginBattle, createBattle, currentHeroId, plannedIntents, replay, resolveCommand, targetOptions, targetKind, upcomingTurns, skillPower, guardReductionOf } from '../core/battle/engine';
import type { ActionId, BattleEntry, BattleState, Command, EncounterDefinition, Outcome, Resolution, TurnStage } from '../core/battle/types';
import { gameBounds, shortcutBlocked } from '../platform/keyboard';
import { sfx } from '../platform/sfx';
import { BattlePlayback, stageTiming } from './battle-playback';
import { combatPrefsKey, readCombatPrefs, contactSounds, effectFamily } from '../game/visuals/combat-effects';
import type { BattleKind } from '../core/world/types';
import { browserStorage } from '../platform/browser-storage';
import type { BattleScene } from '../game/scenes/BattleScene';
import { actorName, eventThai, heroText, intentName, intentRuleThai, intentTargetThai, reasonThai, skillDescription } from './th';
import { portrait } from './portraits';
import { artOf } from '../game/visuals/assets';
import { riftBackdropFrame } from '../game/visuals/rift-backdrop';
import { icon, lineIcon } from './icons';
import { infoTabs, selectInfoTab } from './info-tabs';
import { foeProfile, unitStatuses } from './battle-status';
import { battleLesson } from './tutorial';
import { heroVoice } from './story-ui';

const tutorialKey = 'asterveil.fateweave.tutorial.v1';

// The expedition owns persistence: every commit is handed to the session before playback.
export interface BattleSession {
  kind: BattleKind; data: EncounterDefinition; entry: BattleEntry; commands: readonly Command[];
  commit(state: BattleState): boolean;
  leaveLabel(outcome: Outcome): string;
  leave(): void;
}
const kindLabel: Record<BattleKind, string> = { tutorial: 'ศึกแรก', random: 'พบศัตรู', boss: 'บอส', elite: 'อีลิท', event: 'เหตุการณ์' };

const shieldReason = 'A front-row enemy shields this target.';
// Rounds a hero's skill still cools (0 = ready).
const cooling = (s: BattleState, heroId: string, action: ActionId): number => Math.max(0, (s.heroes.find(h => h.id === heroId)?.cooldowns[action] ?? 0) - s.round);
function bannerCopy(turn: TurnStage, d: EncounterDefinition): string {
  const phase = turn.events.find(e => e.type === 'phase'), summons = turn.events.filter(e => e.type === 'summon').length;
  if (phase) return `${d.enemies.find(e => e.id === phase.sourceId)?.displayName ?? actorName(phase.sourceId, d)} เปลี่ยนช่วง${summons ? ` · เรียกลูกน้อง ${summons} ตัว` : ''}`;
  if (turn.events.some(e => e.type === 'charge')) return `${d.enemies.find(e => e.id === turn.actorId)?.displayName ?? actorName(turn.actorId, d)} รวบรวมพลัง · ท่าถัดไปขัดไม่ได้`;
  if (turn.side === 'enemy' && turn.intent?.all) return `${intentName(turn.intent)} · โจมตีทั้งทีม`;
  return '';
}
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export class BattleUI {
  state: BattleState;
  private heroId = 'guardian';
  private action: ActionId = 'attack';
  private targeting = true;
  private inspectedActorId = '';
  private started: boolean;
  private busy = false;
  private canvasInputAfterInfo = 0;
  private presentation: { phase: 'hero' | 'enemy'; index: number; resolution: Resolution; frame: BattleState; logEnds: number[]; revealed: boolean; logStart: number } | undefined;
  private playback = new BattlePlayback();
  private storage = browserStorage();
  private hintsEnabled = true;
  private saved = true;
  private combatPrefs = readCombatPrefs(null);
  private messages: string[];
  private scene: BattleScene | undefined;
  private session: BattleSession | undefined;
  private data: EncounterDefinition;
  private turnTitle = '';

  constructor(private readonly root: HTMLElement, data: EncounterDefinition) {
    this.data = data;
    try { this.combatPrefs = readCombatPrefs(this.storage?.getItem(combatPrefsKey) ?? null); } catch { /* Defaults work without storage. */ }
    try { this.hintsEnabled = this.storage?.getItem(tutorialKey) !== 'off'; } catch { /* Advice still works without storage. */ }
    this.state = createBattle(data);
    this.started = false;
    this.messages = [];
    root.innerHTML = `
      <header class="masthead">
        <div class="encounter-heading"><p class="eyebrow" id="encounter-kind">การต่อสู้</p><h1 id="encounter-title"></h1></div>
        <div id="beat-status"></div><button id="battle-info" aria-haspopup="dialog" aria-controls="game-info" data-ui="info" class="quiet" aria-label="สถานะยูนิต ข้อมูลการต่อสู้และตั้งค่าเสียง">ⓘ</button>
      </header>
      <main>
        <section id="turn-phase" class="turn-phase" role="status" aria-live="polite" aria-label="เทิร์นการต่อสู้"></section>
        <aside id="battle-coach" class="battle-coach" aria-label="คำแนะนำจากทีม" hidden><span id="coach-face" class="coach-face" aria-hidden="true"></span><div class="coach-content"><strong id="coach-title"></strong><p id="coach-copy" aria-live="polite"></p></div><button id="coach-dismiss" data-ui="coach-dismiss" class="quiet" aria-label="ปิดคำใบ้สอนเล่น">×</button></aside>
        <div class="battle-layout">
          <section class="battle-board" aria-label="สถานการณ์การต่อสู้">
            <section class="arena" aria-label="สนามต่อสู้ แตะเป้าหมายเพื่อใช้สกิล">
              <div id="game"></div><div id="field-statuses" aria-label="บัฟและดีบัฟในสนาม"></div><div id="field-targets" aria-label="แตะตัวละครในสนามเพื่อใช้สกิล"></div><div id="field-banner" role="status" aria-live="polite" hidden></div>
              <div class="formation-labels" aria-hidden="true"><span class="back-label">แนวหลัง</span><span class="front-label">แนวหน้า</span></div>
              <div id="start-screen"></div>
            </section>
            <div id="enemy-roster" aria-label="เลือดและสถานะศัตรู"></div>
            <section id="intent" aria-label="ศัตรูกำลังจะทำอะไร"></section>
          </section>
          <section class="decision-panel" aria-label="สกิลเจ้าของเทิร์นและเป้าหมาย">
            <div class="team-section"><div class="team-heading"><h2 class="step-heading">ทีมของคุณ</h2><small>สั่งได้เฉพาะเจ้าของเทิร์น</small></div><div id="party" class="party" aria-label="ทีมและเจ้าของเทิร์น"></div></div>
            <div class="command-dock"><div id="selected-hero" aria-live="polite"></div><div id="commands" class="step-section"></div></div>
          </section>
        </div>
        <div id="help-home"><details class="help-panel"><summary>วิธีเล่น · แผนศัตรู · บันทึกการต่อสู้</summary><div class="battle-notes">
          <div id="formation-info" class="formation-info"></div>

          <details id="forecast-details" class="forecast-panel"><summary>ดูการโจมตีของศัตรู 2 เทิร์นถัดไป</summary><div id="forecast" class="forecast"></div></details>
          <details class="field-notes"><summary>อาชีพ · สกิลและแนวหน้า/หลัง</summary><div id="rules"></div></details>

        </div></details></div>
        <footer><span>เจ้าของเทิร์น → เลือกสกิล → แตะเป้าหมายในสนาม</span><span id="save-status"></span></footer>
      </main><dialog id="game-info" aria-labelledby="info-title"><div class="info-header"><h2 id="info-title">ข้อมูลการต่อสู้</h2><button data-ui="info-close" class="quiet" aria-label="ปิดข้อมูล">✕</button></div>${infoTabs('battle', true, true)}<div class="info-content"><section id="battle-panel-status" role="tabpanel" aria-labelledby="battle-tab-status"><p class="status-help">เลือกยูนิตเพื่อดูบัฟและดีบัฟ · ตรวจดูได้โดยไม่ใช้เทิร์น</p><p id="status-frame" class="status-frame"></p><div id="status-units" class="status-units" role="group" aria-label="เลือกยูนิตที่ต้องการตรวจสถานะ"></div><section id="status-details" aria-live="polite" aria-atomic="true"></section></section><section id="battle-panel-settings" role="tabpanel" aria-labelledby="battle-tab-settings" hidden><section class="battle-sound" aria-labelledby="battle-sound-title"><h3 id="battle-sound-title">เพลงและเสียงเอฟเฟกต์</h3><div id="battle-sfx-controls"></div></section><section id="combat-settings" class="tutorial-settings" aria-label="ตั้งค่าภาพการต่อสู้"></section><section id="tutorial-settings" class="tutorial-settings" aria-label="ตั้งค่าคำใบ้สอนเล่น"></section></section><section id="battle-panel-guide" role="tabpanel" aria-labelledby="battle-tab-guide" hidden><section id="info-skill"></section><div id="info-host"></div></section><section id="battle-panel-history" role="tabpanel" aria-labelledby="battle-tab-history" hidden><h3>บันทึกการต่อสู้</h3><ol id="event-log" role="log" aria-live="polite"></ol></section></div></dialog>

      <section id="turn-detail" popover="auto" role="dialog" aria-label="รายละเอียดลำดับเทิร์น"><p></p><button data-ui="turn-close" class="quiet" aria-label="ปิดรายละเอียดเทิร์น">×</button></section>
      <section id="skill-popover" popover="manual" role="dialog" aria-modal="false" aria-labelledby="skill-title" aria-describedby="skill-copy skill-availability" tabindex="-1"><div class="skill-popover-heading"><h2 id="skill-title"></h2><button data-ui="skill-close" class="quiet" aria-label="ปิดคำอธิบายสกิล">✕</button></div><p id="skill-copy"></p><p id="skill-availability"></p><small>อ่านแล้วแตะเป้าหมายในสนามเพื่อใช้สกิล</small></section>`;
    root.addEventListener('click', e => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-ui]');
      const popup = root.querySelector<HTMLElement>('#skill-popover')!;
      if (!popup.contains(e.target as Node) && button?.dataset.ui !== 'action') this.closeSkill();
      if (!button || button.disabled || root.closest('[inert]') || document.documentElement.dataset.orientationBlocked === 'true') return;
      const modal = root.querySelector('dialog[open]');
      if (modal && !modal.contains(button)) return;
      const value = button.dataset.value;
      switch (button.dataset.ui) {
        case 'info': {
          this.inspectedActorId = this.heroId; this.renderStatuses();
          const tab = this.root.querySelector<HTMLButtonElement>('#battle-tab-status')!; selectInfoTab(tab);
          this.root.querySelector<HTMLDialogElement>('#game-info')!.showModal(); tab.focus({ preventScroll: true }); break;
        }
        case 'status-unit': if (value) { this.inspectedActorId = value; this.renderStatuses(); this.root.querySelector<HTMLElement>(`#status-unit-${value}`)?.focus({ preventScroll: true }); } break;
        case 'info-close': this.root.querySelector<HTMLDialogElement>('#game-info')!.close(); break;
        case 'start': if (this.session && !this.started) { this.started = true; this.present(beginBattle(this.data, this.session.entry, true)); } break;
        case 'hero': if (value) this.selectHero(value); break;
        case 'action': if (value && !this.busy && this.started && this.state.outcome === 'active' && this.data.heroes.find(h => h.id === currentHeroId(this.state, this.data))?.actions.includes(value as ActionId)) { this.closeSkill(); this.root.querySelector<HTMLElement>('#turn-detail:popover-open')?.hidePopover(); this.action = value as ActionId; this.targeting = true; this.render(); } break;
        case 'skill-info': this.showSkill(); break;
        case 'cancel-action': this.cancelAction(); break;
        case 'turn-info': this.showTurnInfo(button); break;
        case 'turn-close': this.root.querySelector<HTMLElement>('#turn-detail')!.hidePopover(); break;
        case 'skill-close': this.closeSkill(true); break;
        case 'target': if (value) this.choose(value); break;
        case 'skip-turn': this.finishPresentation(); break;
        case 'leave': if (!this.busy && this.state.outcome !== 'active') this.session?.leave(); break;
        case 'coach-dismiss': this.setHints(false); break;
        case 'combat-speed': case 'combat-intensity': {
          if (button.dataset.ui === 'combat-speed') this.combatPrefs.speed = this.combatPrefs.speed === 'normal' ? 'fast' : 'normal';
          else this.combatPrefs.intensity = this.combatPrefs.intensity === 'standard' ? 'reduced' : 'standard';
          try { this.storage?.setItem(combatPrefsKey, JSON.stringify(this.combatPrefs)); } catch { /* Session preference still applies. */ }
          this.renderCombatSettings(); this.root.querySelector<HTMLElement>(`#${button.id}`)?.focus({ preventScroll: true }); break;
        }
        case 'coach-toggle': this.setHints(!this.hintsEnabled); break;
      }
    });
    const infoDialog = root.querySelector<HTMLDialogElement>('#game-info')!;
    // Phaser can process the closing touch on its next input frame.
    const blockClosingTouch = () => { this.canvasInputAfterInfo = performance.now() + 250; };
    infoDialog.addEventListener('close', () => {
      blockClosingTouch();
      if (!root.closest('[inert]') && !root.classList.contains('view-off')) root.querySelector<HTMLElement>('#battle-info')!.focus({ preventScroll: true });
    });
    infoDialog.addEventListener('cancel', event => {
      event.preventDefault(); blockClosingTouch(); infoDialog.close();
      // Native Escape can leave the settings range as the key target until the
      // queued close event. Restore the visible trigger before the next key.
      root.querySelector<HTMLElement>('#battle-info')!.focus({ preventScroll: true });
    });
    root.querySelector('[data-ui=info-close]')!.addEventListener('pointerdown', blockClosingTouch);
    root.querySelector('#skill-popover')!.addEventListener('pointerdown', blockClosingTouch);
    document.addEventListener('keydown', e => {
      if (shortcutBlocked(e) || root.classList.contains('view-off') || root.closest('[inert]') || document.querySelector('.story-view:not([hidden]), .summary-view:not([hidden])') || document.querySelector('dialog[open]')) return;
      if (e.key === 'Escape') {
        if (root.querySelector('#skill-popover:popover-open')) { e.preventDefault(); this.closeSkill(true); }
        else if (root.querySelector('#turn-detail:popover-open')) { e.preventDefault(); root.querySelector<HTMLElement>('#turn-detail')!.hidePopover(); }
        else if (this.started && !this.busy && this.state.outcome === 'active') { e.preventDefault(); this.cancelAction(); }
        return;
      }
      const match = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
      const slot = match ? Number(match[1]) : /^[1-4]$/.test(e.key) ? Number(e.key) : 0;
      if (!slot || !this.started || this.busy || this.state.outcome !== 'active') return;
      const action = this.data.heroes.find(h => h.id === currentHeroId(this.state, this.data))?.actions[slot - 1];
      if (!action) return;
      e.preventDefault(); this.closeSkill(); this.root.querySelector<HTMLButtonElement>(`#action-${action}`)?.click();
    });
    new ResizeObserver(() => { this.positionSkill(); this.placeBackdrop(); this.root.querySelector<HTMLElement>('#turn-detail:popover-open')?.hidePopover(); }).observe(root);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.busy) this.finishPresentation(false);
    });
    window.addEventListener('resize', () => { if (this.busy) this.finishPresentation(false); });
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
      this.scene?.configureEffects(this.combatPrefs, event.matches);
      if (this.busy) this.finishPresentation(false); else this.render();
    });
    this.render();
  }

  attach(scene: BattleScene): void { this.scene = scene; this.render(); }
  // Starts or resumes a battle from the expedition's recorded entry and commands.
  open(session: BattleSession): void {
    this.playback.cancel(); this.scene?.stopEffects(); this.presentation = undefined; this.busy = false;
    this.closeSkill(); this.session = session; this.action = 'attack'; this.targeting = true;
    this.canvasInputAfterInfo = performance.now() + 250;
    if (this.data !== session.data) { this.scene?.setEncounter(session.data); this.data = session.data; }
    this.state = replay(session.data, session.commands, session.entry);
    this.started = session.commands.length > 0;
    this.heroId = currentHeroId(this.state, this.data) ?? this.state.heroes.find(h => h.hp > 0)?.id ?? this.data.heroes[0]!.id;
    this.messages = [this.started ? 'กลับมาต่อสู้จากจังหวะที่บันทึกไว้' : `${kindLabel[session.kind]} · ${session.data.name}`];
    this.saved = true;
    this.render(); this.scene?.refreshLayout();
  }
  private get teaching(): boolean { return this.session?.kind === 'tutorial' && this.hintsEnabled; }
  get encounter(): EncounterDefinition { return this.data; }
  sceneReady(): void { this.render(); }
  fieldLayoutChanged(): void { this.renderFieldTargets(); this.renderFieldStatuses(); this.renderTutorial(); this.placeBackdrop(); }
  // The battle painting lies behind the whole view, framed to the arena so fighters stand on its floor.
  private placeBackdrop(): void {
    const arena = this.root.querySelector<HTMLElement>('.arena'); if (!arena) return;
    const v = this.root.getBoundingClientRect(), a = arena.getBoundingClientRect(); if (!a.width || !a.height) return;
    const f = riftBackdropFrame({ w: v.width, h: v.height }, { x: a.left - v.left, y: a.top - v.top, w: a.width, h: a.height });
    const style = this.root.style;
    style.setProperty('--bd-x', `${f.x.toFixed(1)}px`); style.setProperty('--bd-y', `${f.y.toFixed(1)}px`);
    style.setProperty('--bd-w', `${f.w.toFixed(1)}px`); style.setProperty('--bd-h', `${f.h.toFixed(1)}px`);
  }
  private get displayState(): BattleState { return this.presentation?.frame ?? (!this.started ? beginBattle(this.data, this.session?.entry).initial : this.state); }
  private get stage(): TurnStage | undefined { return this.presentation?.resolution.turns[this.presentation.index]; }
  private get actingActor(): string | undefined { return this.stage?.events.some(e => e.type === 'cancel') ? undefined : this.stage?.actorId; }
  private get actingTarget(): string | undefined { return this.stage?.targetId; }

  choose(id: string, source: 'target' | 'canvas' = 'target'): void {
    if (!this.targeting || this.root.closest('[inert]') || this.root.querySelector('dialog[open]') || source === 'canvas' && performance.now() < this.canvasInputAfterInfo) return;
    if (!this.scene?.isReady || !this.started || this.busy || this.state.outcome !== 'active') return;
    const actualTarget = this.action === 'prayer' && this.state.heroes.some(h => h.id === id && h.hp > 0) ? 'party'
      : targetKind(this.action) === 'enemies' && this.state.enemies.some(e => e.id === id && e.hp > 0) ? 'enemies' : id;
    const target = targetOptions(this.state, this.data, this.heroId, this.action).find(t => t.id === actualTarget);
    if (target?.valid) {
      this.execute(actualTarget);
    } else if (targetKind(this.action) === 'enemy' && this.data.heroes.some(h => h.id === id)) this.selectHero(id);
  }

  private selectHero(id: string): void {
    if (this.busy || id !== currentHeroId(this.state, this.data)) return;
    this.heroId = id; this.action = 'attack'; this.targeting = true; this.render();
  }

  private setHints(enabled: boolean): void {
    this.hintsEnabled = enabled;
    // Removing the strip moves the field under its closing touch.
    this.canvasInputAfterInfo = performance.now() + 250;
    try { this.storage?.setItem(tutorialKey, enabled ? 'on' : 'off'); } catch { /* Preference is optional. */ }
    this.render();
    const focus = this.root.querySelector<HTMLDialogElement>('#game-info')!.open ? '#coach-toggle' :
      enabled && this.started && this.state.outcome === 'active' ? '#coach-dismiss' : '#battle-info';
    this.root.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
  }

  private renderTutorial(): void {
    const coach = this.root.querySelector<HTMLElement>('#battle-coach')!;
    const lesson = this.started && this.teaching ? battleLesson(this.presentation?.resolution.initial ?? this.displayState, this.data) : undefined;
    const resized = coach.hidden !== !lesson;
    coach.hidden = !lesson;
    this.root.querySelectorAll('.coach-focus').forEach(el => el.classList.remove('coach-focus'));
    if (!lesson) { delete coach.dataset.lesson; if (resized) this.scene?.refreshLayout(); return; }
    coach.dataset.lesson = String(lesson.step);
    const p = this.presentation;
    let title = `${heroText[lesson.heroId]?.name ?? ''} · ${lesson.title}`; let copy = `“${heroVoice(lesson.heroId, lesson.action)}” ${lesson.copy}`;
    const speaker = p ? undefined : lesson.heroId; const face = this.root.querySelector<HTMLElement>('#coach-face')!;
    if (face.dataset.hero !== (speaker ?? '')) { face.dataset.hero = speaker ?? ''; face.innerHTML = speaker ? portrait(speaker) : ''; }
    if (p?.revealed) {
      lesson.step = p.resolution.initial.commands.length + 1;
      const event = this.stage!.events.find(e => e.type !== 'outcome');
      title = p.phase === 'hero' ? 'เทิร์นฮีโร่ตามความเร็ว' : 'ถึงเทิร์นศัตรู';
      copy = event ? eventThai(event, this.displayState, this.data) : 'การตอบโต้จังหวะนี้ถูกยกเลิก';
      if (p.phase === 'hero' && this.stage?.action === 'mark') copy = `${actorName(this.stage!.targetId, this.data)} ติดตราแล้ว · ไลราตีเป้านี้ครั้งถัดไป +${this.data.rules.markedBonus}`;
    } else if (p) {
      title = 'กำลังเตรียมท่า'; copy = 'ติดตามผู้ลงมือและเป้าหมาย · ผลจะแสดงเมื่อท่าถึงเป้า';
    } else {
      const next = this.heroId !== lesson.heroId ? `#hero-${lesson.heroId}` : this.action !== lesson.action ? `#action-${lesson.action}` : `#target-${lesson.targetId}`;
      this.root.querySelector(next)?.classList.add('coach-focus');
      if (lesson.step === 1) this.root.querySelector('#intent')?.classList.add('coach-focus');
    }
    const heading = `ศึกแรก ${lesson.step} · ${title}`;
    const titleNode = this.root.querySelector('#coach-title')!; const copyNode = this.root.querySelector('#coach-copy')!;
    // Layout-only updates retain settings focus and avoid repeating live copy.
    if (titleNode.textContent !== heading) titleNode.textContent = heading;
    if (copyNode.textContent !== copy) copyNode.textContent = copy;
    if (resized) this.scene?.refreshLayout();
  }

  private showSkill(): void {
    if (!this.started || this.busy || this.state.outcome !== 'active') return;
    const skill = this.data.skills[this.action];
    this.root.querySelector('#skill-title')!.textContent = `${skill.name} · ${actorName(this.heroId, this.data)}`;
    this.root.querySelector('#skill-copy')!.textContent = skillDescription(this.action, this.heroId, this.data);
    const options = targetOptions(this.state, this.data, this.heroId, this.action);
    this.root.querySelector('#skill-availability')!.textContent = options.some(t => t.valid) ? 'พร้อมใช้ · แตะเป้าหมายที่มีเครื่องหมาย' : reasonThai(options.find(t => t.reason)?.reason ?? '');
    const popup = this.root.querySelector<HTMLElement>('#skill-popover')!;
    if (!popup.matches(':popover-open')) popup.showPopover();
    this.root.querySelector('#skill-details')?.setAttribute('aria-expanded', 'true');
    popup.focus({ preventScroll: true });
    this.positionSkill();
  }

  private positionSkill(): void {
    const popup = this.root.querySelector<HTMLElement>('#skill-popover:popover-open'); if (!popup) return;
    const bounds = gameBounds();
    const dock = this.root.querySelector('.command-dock')!.getBoundingClientRect();
    popup.style.left = `${Math.max(bounds.left + 8, Math.min(bounds.right - popup.offsetWidth - 8, dock.left))}px`;
    const preferredTop = this.root.querySelector('.masthead')!.getBoundingClientRect().bottom + 6;
    popup.style.top = `${Math.max(bounds.top + 8, Math.min(bounds.bottom - popup.offsetHeight - 8, preferredTop))}px`;
  }

  private cancelAction(): void {
    this.closeSkill(); this.targeting = false; this.canvasInputAfterInfo = performance.now() + 250; this.render();
    this.root.querySelector<HTMLElement>(`#action-${this.action}`)?.focus({ preventScroll: true });
  }

  private showTurnInfo(button: HTMLButtonElement): void {
    const id = button.dataset.value!; const d = this.data;
    const def = d.heroes.find(h => h.id === id) ?? d.enemies.find(e => e.id === id);
    const actor = this.displayState.heroes.find(h => h.id === id) ?? this.displayState.enemies.find(e => e.id === id);
    if (!def || !actor) return;
    const popup = this.root.querySelector<HTMLElement>('#turn-detail')!;
    popup.querySelector('p')!.textContent = `${actorName(id, d)} · SPD ${def.speed} · เลือด ${actor.hp}/${def.maxHp}`;
    popup.showPopover(); const bounds = gameBounds(), anchor = button.getBoundingClientRect();
    popup.style.left = `${Math.max(bounds.left + 8, Math.min(bounds.right - popup.offsetWidth - 8, anchor.left))}px`;
    popup.style.top = `${Math.min(bounds.bottom - popup.offsetHeight - 8, anchor.bottom + 4)}px`;
  }

  private closeSkill(returnFocus = false): void {
    const popup = this.root.querySelector<HTMLElement>('#skill-popover:popover-open'); if (!popup) return;
    popup.hidePopover();
    this.root.querySelector('#skill-details')?.setAttribute('aria-expanded', 'false');
    if (returnFocus) {
      this.canvasInputAfterInfo = performance.now() + 250;
      this.root.querySelector<HTMLElement>(`#action-${this.action}`)?.focus({ preventScroll: true });
    }
  }

  private execute(targetId: string): void {
    if (!this.scene?.isReady || !this.started || this.busy || this.state.outcome !== 'active') return;
    const command: Command = { beat: this.state.beat, heroId: this.heroId, action: this.action, targetId };
    this.present(resolveCommand(this.state, this.data, command, true));
  }

  private present(result: Resolution): void {
    this.closeSkill();
    // Commit every actual actor turn before presentation. Reload never repeats damage.
    this.state = result.state;
    this.saved = this.session?.commit(this.state) ?? false;
    const logStart = this.messages.length;
    const logEnds = result.turns.map(turn => {
      this.messages.push(`รอบ ${turn.round} · เทิร์น${turn.side === 'hero' ? 'ฮีโร่' : 'ศัตรู'} · ${actorName(turn.actorId, this.data)}${turn.action ? ` ${this.data.skills[turn.action].name}` : ''}`,
        ...turn.events.map(event => eventThai(event, turn.after!, this.data)));
      return this.messages.length;
    });
    if (!result.turns.length) { this.busy = false; this.heroId = currentHeroId(this.state, this.data) ?? this.heroId; this.render(); return; }
    this.busy = true;
    const first = result.turns[0]!;
    this.presentation = { phase: first.side, index: 0, resolution: result, frame: first.before!, logEnds, revealed: false, logStart };
    this.showStage();
    this.root.querySelector<HTMLElement>('#skip-turn')?.focus({ preventScroll: true });
  }

  private showStage(): void {
    const playback = this.presentation; if (!playback) return;
    const turn = playback.resolution.turns[playback.index]!;
    playback.phase = turn.side; playback.frame = turn.before!; playback.revealed = false;
    if (turn.side === 'hero') this.heroId = turn.actorId;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timing = stageTiming(turn, reduced, this.combatPrefs.speed === 'fast', this.session?.kind === 'boss');
    this.scene?.configureEffects(this.combatPrefs, reduced);
    this.render();
    let stopPrepare = () => {};
    this.playback.start([
      { at: 0, run: () => {
        if (timing.contact && !turn.events.some(e => e.type === 'cancel')) {
          stopPrepare = sfx.play(effectFamily(turn) === 'steel' ? 'swing' : 'charge'); this.playback.own(stopPrepare);
        }
      } },
      { at: timing.contact, run: () => {
        if (this.presentation !== playback) return;
        stopPrepare();
        playback.frame = turn.after!; playback.revealed = true;
        this.render(false); this.scene?.play(turn, timing.end - timing.contact); this.stageSound(turn);
      } },
      { at: Math.min(timing.end - 40, timing.contact + (this.combatPrefs.speed === 'fast' ? 140 : 220)), run: () => {
        if (turn.events.some(e => e.type === 'down')) this.playback.own(sfx.play('down'));
      } },
      { at: timing.end, run: () => {
        if (this.presentation !== playback) return;
        this.scene?.stopEffects();
        if (++playback.index < playback.resolution.turns.length) this.showStage();
        else this.finishPresentation();
      } },
    ]);
    this.playback.own(() => this.scene?.stopEffects());
    this.scene?.prepare(turn, timing.contact);
  }

  // Placeholder synth sounds for one actor turn (platform/sfx.ts), from its events.
  private stageSound(turn: TurnStage): void {
    for (const name of contactSounds(turn)) this.playback.own(sfx.play(name));
  }
  private renderCombatSettings(): void {
    this.set('combat-settings', `<h3>ภาพการต่อสู้</h3><p>ค่าที่เปลี่ยนใช้ตั้งแต่เทิร์นถัดไป · ไม่เปลี่ยนผลต่อสู้</p><button data-ui="combat-speed" id="combat-speed" class="quiet" aria-pressed="${this.combatPrefs.speed === 'fast'}">ความเร็ว: ${this.combatPrefs.speed === 'fast' ? 'เร็ว' : 'ปกติ'}</button><button data-ui="combat-intensity" id="combat-intensity" class="quiet" aria-pressed="${this.combatPrefs.intensity === 'reduced'}">เอฟเฟกต์: ${this.combatPrefs.intensity === 'reduced' ? 'ลด' : 'มาตรฐาน'}</button><p>เมื่ออุปกรณ์ตั้งค่าลดการเคลื่อนไหว จะแสดงผลทันทีโดยไม่เคลื่อนภาพ</p>`);
  }

  private finishPresentation(audible = true): void {
    if (!this.presentation) return;
    this.playback.cancel(); this.scene?.stopEffects();
    if (audible && !document.hidden && this.state.outcome !== 'active') this.playback.own(sfx.play(this.state.outcome === 'victory' ? 'victory' : 'defeat'));
    this.presentation = undefined; this.busy = false;
    this.heroId = currentHeroId(this.state, this.data) ?? this.heroId;
    this.action = 'attack'; this.targeting = true; this.render();
    if (this.state.outcome === 'active' && !document.hidden && !this.root.closest('[inert]') && !this.root.querySelector('dialog[open]')) this.root.querySelector<HTMLElement>('#action-attack')?.focus({ preventScroll: true });
  }

  private set(id: string, content: string): void { this.root.querySelector(`#${id}`)!.innerHTML = content; }

  // Enemy ids are field positions; their portrait follows the encounter's art.
  private portrait(id: string): string { return portrait(artOf(this.data, id)); }

  private renderPhase(): void {
    const turn = this.stage; const d = this.data; const s = this.displayState;
    const canceled = turn?.events.some(e => e.type === 'cancel');
    const mode = turn?.side ?? (s.outcome !== 'active' ? 'finished' : 'choice');
    const actor = turn?.actorId ?? this.heroId;
    const title = !this.started ? 'เรียงเทิร์นตามความเร็ว' : turn ? canceled ? `${actorName(actor, d)} · ถูกขัดจังหวะ` : `เทิร์น${turn.side === 'hero' ? 'ฮีโร่' : 'ศัตรู'} · ${actorName(actor, d)}` : s.outcome !== 'active' ? `จบการต่อสู้ · ${s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}` : `เทิร์นของคุณ · ${actorName(actor, d)}`;
    const detail = turn ? canceled ? 'ศัตรูเสียเทิร์นนี้' : `${turn.action ? d.skills[turn.action].name : turn.intent ? intentName(turn.intent) : 'ลงมือ'} → ${actorName(turn.targetId, d)}` : s.outcome !== 'active' ? 'กดปุ่มด้านล่างเพื่อไปต่อ' : 'SPD มากเริ่มก่อน · คนละ 1 ครั้งต่อรอบ';
    this.turnTitle = title;
    const phaseRoot = this.root.querySelector<HTMLElement>('#turn-phase')!;
    phaseRoot.dataset.phase = mode; phaseRoot.dataset.actor = actor; phaseRoot.dataset.canceled = String(!!canceled);
    phaseRoot.dataset.effect = turn ? effectFamily(turn) : 'idle';
    phaseRoot.dataset.speed = this.combatPrefs.speed;
    phaseRoot.dataset.intensity = this.combatPrefs.intensity;
    phaseRoot.dataset.cue = this.presentation ? this.presentation.revealed ? 'impact' : 'prepare' : 'idle';
    this.set('turn-phase', `<div class="phase-head"><div class="phase-portrait">${this.portrait(actor)}</div><div class="phase-copy"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(detail)}</p></div>${turn ? '<button id="skip-turn" data-ui="skip-turn" class="quiet">ดูผลทันที</button>' : ''}</div><div id="turn-order" aria-label="ลำดับเทิร์นตามความเร็ว"></div>`);
  }

  private renderSelectedHero(): void {
    const def = this.data.heroes.find(h => h.id === this.heroId)!;
    const hero = this.displayState.heroes.find(h => h.id === this.heroId)!;
    const text = heroText[this.heroId]!;
    this.set('selected-hero', `<div class="selected-info"><h2>${text.name}<span>${text.role} · ${def.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'}</span></h2><p class="selected-resource">เลือด ${hero.hp}/${def.maxHp}${hero.barrier ? ` · โล่ ${hero.barrier}` : ''} · พลังโจมตี ${def.attack} · SPD ${def.speed}</p></div><span class="selection-state">${hero.hp <= 0 ? 'ล้มแล้ว' : this.presentation?.phase === 'hero' ? 'กำลังลงมือ' : this.presentation ? 'รอศัตรู' : 'ถึงเทิร์น'}</span><button id="skill-details" data-ui="skill-info" class="quiet" aria-label="ดูคำอธิบายสกิล" aria-haspopup="dialog" aria-controls="skill-popover"${!this.started || this.busy || this.state.outcome !== 'active' ? ' disabled' : ''}>ⓘ</button><button id="cancel-action" data-ui="cancel-action" class="quiet" aria-label="ยกเลิกการเลือกสกิล"${!this.started || this.busy || !this.targeting || this.state.outcome !== 'active' ? ' disabled' : ''}>×</button>`);
  }

  private renderTimeline(): void {
    const s = this.presentation?.revealed ? this.stage!.state : this.displayState; const slots = upcomingTurns(s, this.data, 8);
    this.set('turn-order', slots.length ? `<ol>${slots.map((slot, index) => {
      const blocked = slot.side === 'enemy' && (s.enemies.find(e => e.id === slot.actorId)?.interruptedRound === slot.round ||
        index === 0 && this.stage?.events.some(e => e.type === 'cancel'));
      const label = blocked ? 'หยุด' : index === 0 ? 'ตอนนี้' : slot.round > s.round ? `รอบ ${slot.round}` : index === 1 ? 'ถัดไป' : 'รอ';
      return `<li class="turn-slot ${slot.side} ${blocked ? 'blocked-turn' : ''} ${index === 0 ? 'current-turn' : ''} ${slot.round > s.round ? 'later-round' : ''}" data-actor="${slot.actorId}" data-round="${slot.round}" ${index === 0 ? 'aria-current="step"' : ''} aria-label="${index === 0 ? 'ตอนนี้' : `ลำดับ ${index + 1}`} ${actorName(slot.actorId, this.data)} ความเร็ว ${slot.speed} รอบ ${slot.round}${blocked ? ' ถูกขัดจังหวะ' : ''}"><button data-ui="turn-info" data-value="${slot.actorId}" class="turn-icon" title="${escapeHtml(actorName(slot.actorId, this.data))} · SPD ${slot.speed}" aria-label="${escapeHtml(actorName(slot.actorId, this.data))} · SPD ${slot.speed}${blocked ? ' · ถูกขัดจังหวะ' : ''}">${this.portrait(slot.actorId)}</button><b class="turn-speed" aria-hidden="true">${slot.speed}</b><span class="sr-only"><b>${actorName(slot.actorId, this.data)}</b><small>${label} · ${slot.speed}</small></span></li>`;
    }).join('')}</ol>` : '<p>จบการต่อสู้แล้ว</p>');
  }

  private renderSituation(): void {
    const s = this.displayState; const d = this.data; const intent = this.stage?.side === 'enemy' ? this.stage.intent : s.intent;
    this.renderTimeline();
    // Reserves not yet summoned are not on the field.
    this.set('enemy-roster', d.enemies.filter(e => !s.enemies.find(v => v.id === e.id)?.absent).map(e => {
      const enemy = s.enemies.find(v => v.id === e.id)!;
      return `<div class="enemy-card ${enemy.hp <= 0 ? 'fallen' : ''} ${this.actingActor === e.id ? 'active-actor' : ''}" data-enemy="${e.id}">${this.portrait(e.id)}<div><strong>${actorName(e.id, d)}</strong><span class="enemy-hp">HP <b>${enemy.hp} / ${e.maxHp}</b>${enemy.markedUntil > s.round ? ' · ติดตรา' : enemy.hp <= 0 ? ' · กำจัดแล้ว' : ''}</span><span class="hp-track"><span style="width:${enemy.hp / e.maxHp * 100}%"></span></span></div></div>`;
    }).join(''));
    const living = s.heroes.filter(h => h.hp > 0);
    this.set('beat-status', `<span class="beat-chip">${this.busy ? 'กำลังแสดงผล…' : s.outcome === 'active' ? `รอบ ${s.round}` : s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}</span><span class="turn-title" aria-hidden="true">${escapeHtml(this.turnTitle)}</span><span class="formation-chip">หน้า ${living.filter(h => d.heroes.find(v => v.id === h.id)!.lane === 'front').length} · หลัง ${living.filter(h => d.heroes.find(v => v.id === h.id)!.lane === 'back').length}</span>`);
    if (intent) {
      const response = this.presentation?.phase === 'enemy';
      const hit = response ? this.stage?.events.find(e => e.type === 'damage') : undefined;
      const canceled = response ? this.stage?.events.some(e => e.type === 'cancel') : s.enemies.find(e => e.id === intent.sourceId)?.interruptedRound === intent.round;
      const dodge = response ? this.stage?.events.find(e => e.type === 'dodge') : undefined;
      const recipient = hit?.targetId ?? dodge?.targetId ?? intent.targetId;
      const target = s.heroes.find(h => h.id === recipient)!;
      const lethal = !this.presentation && !canceled && !target.evading && intent.damage >= target.hp + target.barrier;
      const heading = canceled ? 'การโจมตีนี้ถูกขัดจังหวะ' : dodge ? 'การโจมตีนี้พลาด' : response ? 'ศัตรูกำลังลงมือ' : `การโจมตีศัตรูถัดไป · รอบ ${intent.round}`;
      this.set('intent', `<div class="intent-icon">${icon(intent.kind === 'energy' ? 'bolt' : 'attack')}</div><div class="intent-copy"><p class="eyebrow">${heading}</p><h2>${actorName(intent.sourceId, d)} <span>→</span> ${intentTargetThai(intent, d, recipient)}</h2><p>${intentName(intent)}${intent.special || intent.charge ? '' : ` · ${intent.kind === 'energy' ? 'พลังงาน' : 'กายภาพ'}`} <span class="intent-rule">${intentRuleThai(intent)}</span></p>${lethal ? `<p class="lethal-warning">⚠ ${actorName(intent.targetId, d)} จะล้มหากรับการโจมตีนี้โดยไม่มีการป้องกัน</p>` : ''}</div><div class="intent-damage"><strong>${canceled || (!hit && !dodge && (intent.special === 'phase' || intent.charge)) ? '—' : dodge ? 0 : hit ? hit.amount : intent.damage}</strong><small>${dodge ? 'หลบได้' : hit ? 'เสียเลือด' : intent.special === 'phase' ? 'ไม่โจมตี' : intent.charge ? 'สะสมพลัง' : 'พลังโจมตี'}</small></div>`);
    } else this.set('intent', `<div class="intent-icon">✧</div><div class="intent-copy"><p class="eyebrow">การต่อสู้จบแล้ว</p><h2>${s.outcome === 'victory' ? 'ศัตรูถูกกำจัดแล้ว' : 'ทีมของคุณล้มทั้งหมด'}</h2><p>${s.outcome === 'victory' ? 'เลือดที่เหลือติดตัวไปศึกถัดไป' : 'ทีมจะถอยกลับไปฟื้นตัว'}</p></div>`);
    this.root.querySelector<HTMLElement>('#forecast-details')!.hidden = s.outcome !== 'active';
    this.set('forecast', plannedIntents(s, d).map(next => `<div><b>รอบ ${next.round} · ${actorName(next.sourceId, d)} · ${intentName(next)}</b><small>${intentTargetThai(next, d)}${next.special || next.charge ? '' : ` · พลังโจมตี ${next.damage} · ${next.kind === 'energy' ? 'พลังงาน' : 'กายภาพ'}`}${next.special || next.charge || next.all || next.unstoppable ? ` · ${intentRuleThai(next)}` : ''}</small></div>`).join('') + (s.outcome === 'active' ? '<p>แผนนี้สมมติว่าตัวละครยังอยู่ เปลี่ยนได้เมื่อมีใครล้ม เป้าหมายจะถูกกำหนดจริงเมื่อถึงเทิร์นศัตรู</p>' : ''));
    this.set('formation-info', '<div><strong>แนวหน้า 2 · แนวหลัง 2</strong><p>กายภาพโจมตีแนวหน้าก่อน · พลังงานถึงแนวหลังได้ · สกิลเฉพาะมีคูลดาวน์</p></div><div><strong>ศัตรูแถวหน้าบังแถวหลัง</strong><p>ฮีโร่แนวหน้าตีแถวหลังได้เมื่อแถวหน้าล้ม หรือใช้สกิลตีทะลุ (แทงทะลวง ติดตรา แทงข้างหลัง ท้าดวล) · ฮีโร่แนวหลังตีได้ทุกช่อง</p></div>');
    const k = this.session?.kind ?? 'random'; const fallen = s.heroes.filter(h => h.hp <= 0).length;
    this.set('start-screen', !this.started ? `<div class="start-card"><p class="eyebrow">${kindLabel[k]}</p><h2>${escapeHtml(d.name)}</h2><p>${k === 'tutorial' ? 'ศึกแรกของการเดินทาง · คำแนะนำจะพาใช้สกิลของทุกอาชีพ' : k === 'boss' ? 'บอสสลับโจมตีกายภาพและพลังงาน · อ่านแผนแล้วป้องกันให้ทัน' : 'ศัตรูขวางทาง · เลือดที่เหลือติดตัวเข้าศึกนี้'}${fallen ? `<br>${fallen} คนล้มอยู่และไม่ได้ลงมือในศึกนี้` : ''}</p><button data-ui="start" id="start" class="primary" ${!this.scene?.isReady ? 'disabled' : ''}>${this.scene?.isReady ? 'เริ่มต่อสู้ →' : 'กำลังเตรียมสนาม…'}</button></div>` : !this.presentation && s.outcome !== 'active' ? `<div class="result-card" role="status"><p class="eyebrow">${s.outcome === 'victory' ? 'ชนะศึก' : k === 'tutorial' ? 'ลองอีกครั้งได้' : 'ถอยกลับไปตั้งหลัก'}</p><h2>${s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}</h2><p>ยืนอยู่ ${s.heroes.filter(h => h.hp > 0).length} / ${s.heroes.length} คน · เลือดทีม ${s.heroes.reduce((hp, h) => hp + h.hp, 0)}<br>ใช้ ${s.commands.length} คำสั่ง</p>${s.outcome === 'victory' ? `<strong class="party-result">${s.heroes.every(h => h.hp > 0) ? 'รักษาทีมครบทุกคน' : 'ชนะ แต่สมาชิกที่ล้มต้องรอพักที่แคมป์'}</strong>` : ''}<button data-ui="leave" id="leave-battle" class="primary">${escapeHtml(this.session?.leaveLabel(s.outcome) ?? 'ไปต่อ')}</button></div>` : '');
  }

  private renderParty(disabled: boolean): void {
    const s = this.displayState; const d = this.data;
    this.set('party', this.data.heroes.map((h, i) => {
      const hero = s.heroes[i]!; const text = heroText[h.id]!; const selected = h.id === this.heroId; const waiting = s.outcome === 'active' && !selected;
      const skills = h.actions.filter(a => a !== 'attack');
      return `<button id="hero-${h.id}" data-ui="hero" data-value="${h.id}" data-lane="${h.lane}" class="hero-card ${h.id} ${hero.hp <= 0 ? 'fallen' : ''} ${selected ? 'selected' : 'waiting-turn'} ${this.actingActor === h.id ? 'active-actor' : ''}" aria-pressed="${selected}" ${disabled || hero.hp <= 0 || waiting ? 'disabled' : ''}><span class="hero-emblem">${this.portrait(h.id)}</span><span class="hero-copy"><span class="hero-class"><b>${h.lane === 'front' ? 'FRONT' : 'BACK'}</b> ${text.role}</span><strong>${text.name}</strong><span class="hero-hp"><span class="hp-amount"><span class="hp-label">HP</span> ${hero.hp} / ${h.maxHp}</span>${hero.barrier ? `<small class="barrier-info">โล่ ${hero.barrier}</small>` : ''}${hero.evading ? '<small class="barrier-info">ก้าวเงา</small>' : ''}${s.taunt?.heroId === h.id ? '<small class="barrier-info">ยั่วยุ</small>' : ''}${s.song?.heroId === h.id ? `<small class="barrier-info">${d.skills[s.song.action].name}</small>` : ''}${s.rally?.ids.includes(h.id) ? '<small class="barrier-info">ตั้งรับหมู่</small>' : ''}${s.sanctuary?.targetId === h.id ? '<small class="barrier-info">คุ้มภัย</small>' : ''}${s.counter?.heroId === h.id && s.counter.wall ? '<small class="barrier-info">กำแพงทวน</small>' : ''}${hero.hp <= 0 ? ' · ล้มแล้ว' : ''}</span><span class="hp-track"><span style="width:${hero.hp / h.maxHp * 100}%"></span></span></span><span class="hero-skills">${skills.map(action => {
        const remaining = Math.max(0, (hero.cooldowns[action] ?? 0) - s.round);
        const available = targetOptions(s, d, h.id, action).some(t => t.valid);
        const status = hero.hp <= 0 ? 'ล้มแล้ว' : s.outcome !== 'active' ? 'จบแล้ว' : waiting ? 'รอเทิร์น' : remaining ? `รอ ${remaining} รอบ` : available ? 'พร้อมใช้' : action === 'heal' || action === 'prayer' ? 'เลือดเต็ม' : action === 'ward' ? 'โล่เต็ม' : action === 'finale' ? 'ยังไม่มีเพลง' : 'ยังใช้ไม่ได้';
        return `<span class="skill-status ${available ? 'ready' : 'cooling'}" data-skill="${action}">${icon(action)}<span>${d.skills[action].name}<small>${status}</small></span></span>`;
      }).join('')}</span>${selected ? `<span class="selected-tag">${this.presentation?.phase === 'hero' ? 'ลงมือ' : this.presentation ? 'รอ' : 'ถึงเทิร์น'}</span>` : ''}</button>`;
    }).join(''));
  }

  private renderCommands(disabled: boolean): void {
    const s = this.displayState; const d = this.data;
    const hero = d.heroes.find(h => h.id === this.heroId)!;
    const options = targetOptions(s,d,this.heroId,this.action);
    const noTarget = !disabled && !options.some(t=>t.valid) ? reasonThai(options.find(t=>t.reason)?.reason ?? '') : '';

    this.root.querySelector<HTMLElement>('.command-dock')!.dataset.ready = String(!disabled);
    this.set('commands', `<h2 class="step-heading"><span>2</span>${heroText[this.heroId]!.role} · เลือกคำสั่ง</h2><div class="actions">${hero.actions.map((action, index) => {
      const text = d.skills[action]; const reason = actionReason(s, d, this.heroId, action);
      return `<div class="action-option"><button id="action-${action}" data-ui="action" data-value="${action}" aria-keyshortcuts="${index + 1}" class="action ${action} ${this.targeting && this.action === action ? 'selected' : ''}" aria-pressed="${this.targeting && this.action === action}" aria-describedby="reason-${action}" ${disabled ? 'disabled' : ''} data-unavailable="${!!reason}"><kbd class="key-hint">${index + 1}</kbd>${icon(action)}<strong>${text.name}</strong><small>${text.english}</small><span class="skill-value">${action === 'attack' ? `พลัง ${hero.attack}` : action === 'mark' ? `โบนัส +${d.rules.markedBonus}` : action === 'guard' ? `ลด ${Math.round(guardReductionOf(d, this.heroId) * 100)}%` : action === 'rally' ? `ลด ${d.rules.rallyReduction * 100}%` : action === 'sanctuary' ? 'กันล้ม' : `พลัง ${skillPower(d, this.heroId, action)}`}</span></button>${cooling(s, this.heroId, action) ? `<span class="cd-badge" aria-hidden="true">รอ ${cooling(s, this.heroId, action)}</span>` : ''}<p id="reason-${action}" class="${reason ? 'unavailable-reason' : ''}">${escapeHtml(reason ? reasonThai(reason) : text.cooldown ? `คูลดาวน์ ${text.cooldown} รอบ` : 'ใช้ได้ทุกเทิร์น')}</p></div>`;
    }).join('')}</div><details class="action-help"><summary>วิธีใช้${d.skills[this.action].name}</summary><p class="action-description">${skillDescription(this.action, this.heroId, d)}</p></details><p class="target-hint">${!this.targeting ? 'เลือกสกิลเพื่อเล็งเป้าหมาย' : noTarget || `${d.skills[this.action].name} — ` + (this.action === 'prayer' ? 'แตะฮีโร่ในสนามเพื่อฟื้นฟูทั้งทีม' : targetKind(this.action) === 'enemies' ? 'แตะศัตรูตัวใดก็ได้เพื่อโจมตีทุกตัว' : this.action === 'brace' ? 'แตะตัวเองในสนามเพื่อตั้งทวน' : this.action === 'evade' ? 'แตะตัวเองในสนามเพื่อก้าวเงา' : this.action === 'taunt' ? 'แตะตัวเองในสนามเพื่อยั่วยุ' : this.action === 'valor' || this.action === 'mend' ? 'แตะตัวเองในสนามเพื่อบรรเลงเพลง' : targetKind(this.action) === 'self' ? `แตะตัวเองในสนามเพื่อใช้${d.skills[this.action].name}` : targetKind(this.action) === 'ally' ? 'แตะเพื่อนในสนามที่มีเครื่องหมาย' : 'แตะศัตรูในสนามที่มีเครื่องหมาย')}</p>`);
  }

  private renderFieldTargets(): void {
    if (!this.scene) return;
    const s = this.displayState; const d = this.data;
    const disabled = !this.targeting || !this.scene.isReady || !this.started || this.busy || s.outcome !== 'active';
    const options = targetOptions(s, d, this.heroId, this.action);
    const targets = this.action === 'prayer' ? d.heroes.map(h => ({ ...options[0]!, id:h.id, valid:options[0]!.valid && s.heroes.some(v => v.id===h.id && v.hp>0) }))
      : targetKind(this.action) === 'enemies' ? d.enemies.map(e => ({ ...options[0]!, id:e.id, valid:options[0]!.valid && s.enemies.some(v => v.id===e.id && v.hp>0) })) : options;
    this.set('field-targets', targets.map(t => {
      const position = this.scene!.actorTargets.get(t.id); if (!position) return '';
      const hero = s.heroes.find(h => h.id===t.id); const enemy = s.enemies.find(e => e.id===t.id);
      const maxHp = d.heroes.find(h => h.id===t.id)?.maxHp ?? d.enemies.find(e => e.id===t.id)?.maxHp;
      const label = `ใช้${d.skills[this.action].name}กับ${this.action==='prayer' ? 'ทั้งทีม โดยแตะ' : targetKind(this.action)==='enemies' ? 'ศัตรูทุกตัว โดยแตะ' : ''}${actorName(t.id,d)} · เลือด ${hero?.hp ?? enemy?.hp}/${maxHp}${!t.valid ? ` · ${reasonThai(t.reason)}` : ''}`;
      const buttonId = this.action==='prayer' ? t.id===this.heroId ? 'party' : `party-${t.id}` : targetKind(this.action)==='enemies' ? `enemies-${t.id}` : t.id;
      const screen = !disabled && !t.valid && t.reason === shieldReason;
      return `<button id="target-${buttonId}" data-ui="target" data-value="${t.id}" data-actor="${t.id}" class="field-target ${disabled || !t.valid ? '' : 'valid-target'} ${screen ? 'screened-target' : ''}" style="left:${position.x}px;top:${position.y}px;width:${position.width}px;height:${position.height}px" aria-label="${escapeHtml(label)}" ${disabled || !t.valid ? 'disabled' : ''}><span class="field-marker" aria-hidden="true">${icon(this.action)}</span>${screen ? `<span class="screen-marker" aria-hidden="true">${lineIcon('guard')}ถูกบัง</span>` : ''}</button>`;
    }).join(''));
  }

  // Boss phase, summon, charge and all-party moves get a field banner while their turn is shown.
  private renderFieldBanner(): void {
    const banner = this.root.querySelector<HTMLElement>('#field-banner')!;
    const turn = this.presentation?.revealed ? this.stage : undefined;
    const copy = turn ? bannerCopy(turn, this.data) : '';
    banner.hidden = !copy; banner.dataset.kind = turn?.events.find(e => e.type === 'phase' || e.type === 'summon' || e.type === 'charge')?.type ?? (turn?.intent?.all ? 'all' : '');
    if (banner.textContent !== copy) banner.textContent = copy;
  }

  private renderFieldStatuses(): void {
    const s = this.displayState, d = this.data;
    this.set('field-statuses', !this.started || !this.scene ? '' : [...d.heroes, ...d.enemies].map(a => {
      const slot = this.scene!.actorPanels.get(a.id), rows = unitStatuses(s, d, a.id);
      if (!slot) return '';
      const position = slot.panel, actor = [...s.heroes, ...s.enemies].find(h => h.id === a.id)!;
      const enemy = d.enemies.some(e => e.id === a.id);
      const label = `${actorName(a.id, d)} · ${rows.map(r => `${r.kind === 'buff' ? 'บัฟ' : 'ดีบัฟ'} ${r.name}: ${r.duration}`).join(' · ')} · รายละเอียดที่ปุ่มข้อมูล แท็บสถานะ`;
      // Standard grid: a foe's name stands above its head, every HP/status panel under the feet (owner 2026-10-22).
      const name = `<span class="field-unit-name">${escapeHtml(actorName(a.id, d))}</span>`, above = slot.label && enemy ? slot.label : undefined;
      const tag = above ? `<div class="field-unit-label" data-field-label="${a.id}" style="left:${above.x}px;top:${above.y}px;width:${above.width}px;height:${above.height}px;opacity:${actor.hp > 0 ? 1 : .4}">${name}</div>` : '';
      return `${tag}<div class="field-unit-info ${slot.compact ? 'compact' : ''} ${slot.tiny ? 'tiny' : ''} ${slot.side ? 'side' : ''} ${slot.label ? 'grid' : ''} ${enemy ? 'enemy' : 'ally'}" data-field-unit="${a.id}" style="left:${position.x}px;top:${position.y}px;width:${position.width}px;height:${position.height}px;--field-icon:${slot.iconSize}px;opacity:${actor.hp > 0 ? 1 : .4}">${slot.label ? '' : name}<span class="field-health" aria-label="${escapeHtml(actorName(a.id, d))} HP ${actor.hp}/${a.maxHp}"><span class="field-hp-value">${actor.hp}/${a.maxHp}</span><span class="field-hp-track"><span style="width:${actor.hp / a.maxHp * 100}%;background:#${a.color.toString(16).padStart(6, '0')}"></span></span></span>${rows.length ? `<span class="field-statuses" data-status-actor="${a.id}" role="img" aria-label="${escapeHtml(label)}">${rows.slice(0, slot.maxIcons).map(r => `<span class="field-status ${r.kind}" data-status="${r.id}" aria-hidden="true">${icon(r.icon)}</span>`).join('')}${rows.length > slot.maxIcons ? `<span class="field-status-more" aria-hidden="true">+${rows.length - slot.maxIcons}</span>` : ''}</span>` : ''}</div>`;
    }).join(''));
  }

  private renderStatuses(): void {
    const s = this.displayState, d = this.data;
    const actors = [...d.heroes, ...d.enemies.filter(e => !s.enemies.find(v => v.id === e.id)?.absent)];
    if (!actors.some(a => a.id === this.inspectedActorId)) this.inspectedActorId = this.heroId;
    const states = [...s.heroes, ...s.enemies];
    this.set('status-frame', this.presentation ? `รอบ ${s.round} · สถานะตามจังหวะที่กำลังแสดง` : `รอบ ${s.round} · ${s.outcome === 'active' ? 'สถานะปัจจุบัน' : 'จบการต่อสู้แล้ว'}`);
    this.set('status-units', actors.map(a => {
      const actor = states.find(v => v.id === a.id)!;
      const rows = unitStatuses(s, d, a.id), ally = d.heroes.some(h => h.id === a.id);
      return `<button id="status-unit-${a.id}" data-ui="status-unit" data-value="${a.id}" class="status-unit ${ally ? 'ally' : 'enemy'}" aria-pressed="${a.id === this.inspectedActorId}">${this.portrait(a.id)}<span><strong>${escapeHtml(actorName(a.id, d))}</strong><small>${ally ? 'ฝ่ายเรา' : 'ศัตรู'} · ${actor.hp <= 0 ? 'ล้มแล้ว' : 'HP ' + actor.hp + '/' + a.maxHp}</small><span class="status-mini" role="img" aria-label="${rows.length ? escapeHtml(rows.map(r => (r.kind === 'buff' ? 'บัฟ ' : 'ดีบัฟ ') + r.name).join(' · ')) : 'ไม่มีสถานะชั่วคราว'}">${rows.slice(0, 3).map(r => `<span class="${r.kind}" aria-hidden="true">${icon(r.icon)}</span>`).join('')}${rows.length > 3 ? '<small>+' + (rows.length - 3) + '</small>' : ''}</span></span></button>`;
    }).join(''));
    const id = this.inspectedActorId, def = actors.find(a => a.id === id)!, actor = states.find(a => a.id === id)!;
    const rows = unitStatuses(s, d, id);
    this.set('status-details', `<div class="status-selected">${this.portrait(id)}<div><h3>${escapeHtml(actorName(id, d))}</h3><p>HP ${actor.hp} / ${def.maxHp}${actor.hp <= 0 ? ' · ล้มแล้ว' : ''}</p></div></div>${this.foeSheet(id)}${rows.length ? (['buff', 'debuff'] as const).map(kind => {
      const group = rows.filter(r => r.kind === kind);
      return group.length ? `<section class="status-group ${kind}"><h4>${kind === 'buff' ? 'บัฟ · ผลเสริม' : 'ดีบัฟ · ผลลดทอน'}</h4><ul>${group.map(r => `<li data-status="${r.id}"><div class="status-name">${icon(r.icon)}<strong>${escapeHtml(r.name)}</strong></div><p>${escapeHtml(r.detail)}</p><p class="status-duration">${escapeHtml(r.duration)}</p></li>`).join('')}</ul></section>` : '';
    }).join('') : `<p class="status-empty">${actor.hp <= 0 ? 'ยูนิตล้มแล้ว ไม่มีสถานะชั่วคราวที่มีผล' : s.outcome !== 'active' ? 'การต่อสู้จบแล้ว ไม่มีสถานะชั่วคราวที่มีผล' : 'ไม่มีบัฟหรือดีบัฟชั่วคราว'}</p>` }`);
  }

  // Enemy stats and move cycle in the status panel (presentation only).
  private foeSheet(id: string): string {
    const p = foeProfile(this.displayState, this.data, id); if (!p) return '';
    return `<section class="foe-sheet" aria-label="ข้อมูลศัตรู"><dl class="foe-stats">${p.stats.map(r => `<div><dt>${r.label}</dt><dd>${escapeHtml(r.value)}</dd></div>`).join('')}</dl>`
      + `<p class="foe-position">${escapeHtml(p.position)}</p><h4>ท่าโจมตี · วนตามลำดับทีละรอบ</h4><ol class="foe-moves">${p.moves.map(m => `<li class="${m.next ? 'next' : ''}" data-kind="${m.kind}">`
      + `<div class="status-name">${icon(m.kind === 'energy' ? 'bolt' : 'attack')}<strong>${escapeHtml(m.name)}</strong>${m.unstoppable ? '<span class="foe-ult">ท่าไม้ตาย · ขัดไม่ได้</span>' : ''}${m.next ? '<span class="foe-next">ถัดไป</span>' : ''}</div>`
      + `<p>${m.kind === 'energy' ? 'พลังงาน' : 'กายภาพ'} · พลัง ${m.damage} · เล็ง ${escapeHtml(m.target)}</p></li>`).join('')}</ol></section>`;
  }

  private render(repaint = true): void {
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
    const s = this.state; const d = this.data; const disabled = !this.scene?.isReady || !this.started || this.busy || s.outcome !== 'active';
    this.set('encounter-title', escapeHtml(d.name));
    this.set('encounter-kind', kindLabel[this.session?.kind ?? 'random']);
    this.root.classList.add('mobile-layout');
    this.root.dataset.targeting = String(this.targeting);
    const dialog = this.root.querySelector<HTMLDialogElement>('#game-info')!;
    const help = this.root.querySelector<HTMLDetailsElement>('.help-panel')!;
    const host = this.root.querySelector('#info-host')!;
    if (help.parentElement !== host) { if (dialog.open) dialog.close(); host.append(help); help.open = true; }
    this.set('info-skill', `<h3>${d.skills[this.action].name} · ${heroText[this.heroId]!.name}</h3><p>${skillDescription(this.action, this.heroId, d)}</p>`);
    this.root.querySelector<HTMLElement>('#tutorial-settings')!.hidden = this.session?.kind !== 'tutorial';
    this.set('tutorial-settings', `<strong>คำแนะนำศึกแรก</strong><p>อ่านแผนศัตรู · ตั้งรับ · ติดตราแล้วตีเป้าเดิม · ขัดจังหวะ · รักษา</p><button id="coach-toggle" data-ui="coach-toggle" class="quiet" aria-pressed="${this.hintsEnabled}">${this.hintsEnabled ? 'ปิดคำแนะนำ' : 'เปิดคำแนะนำ'}</button>`);
    this.renderCombatSettings(); this.renderStatuses();
    this.renderPhase(); this.renderSituation(); this.renderSelectedHero(); this.renderParty(disabled); this.renderCommands(disabled);
    this.set('rules', `<h3>ลงสนาม ${d.heroes.length} คน · ศัตรูเล็งตามหมายเลขช่อง</h3><p>รวมฮีโร่และศัตรูเรียง SPD มากไปน้อยเมื่อเริ่มรอบ คนละ 1 ครั้งต่อรอบ ข้ามตัวที่ล้ม SPD เท่ากันใช้ลำดับรายชื่อฮีโร่ก่อน ตามด้วยศัตรู</p><p>แนวหน้าที่ยังยืนอยู่รับการโจมตีกายภาพก่อน พลังงานโจมตีแนวหลังได้ เมื่อแนวหน้าล้มหมด กายภาพจะถึงแนวหลัง ท่าของศัตรูเล็งหมายเลขช่องในทีม ใครยืนช่องนั้นคือเป้า แผนโจมตีเป็นการคาดการณ์ตามคนที่ยังยืนอยู่ เมื่อถึงเทิร์นศัตรูจึงกำหนดเป้าหมายจริง</p>${d.heroes.map(hero => `<h3>${heroText[hero.id]!.name} · ${heroText[hero.id]!.role} · SPD ${hero.speed} · ${hero.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'}</h3><dl>${hero.actions.map(action => `<dt>${d.skills[action].name} (${d.skills[action].english})</dt><dd>${skillDescription(action, hero.id, d)}</dd>`).join('')}</dl>`).join('')}<p>แต่ละตัวลงมือ 1 ครั้งต่อรอบ สกิลคูลดาวน์ 2 รอบที่ใช้ในรอบ 1 จะพร้อมในรอบ 3 พรฟื้นฟูคูลดาวน์ 3 รอบ ${d.enemies.map(e => `${actorName(e.id, d)} SPD ${e.speed}`).join(' · ')} การรักษาไม่ชุบชีวิต โล่เวทไม่ซ้อนกัน เป้าหมายเสริมคือชนะโดยรักษาทีมครบ ${d.heroes.length} คน</p>`);
    const p = this.presentation;
    const shownMessages = p ? this.messages.slice(0, p.revealed ? p.logEnds[p.index] : p.index ? p.logEnds[p.index - 1] : p.logStart) : this.messages;
    this.set('event-log', shownMessages.slice(-30).map(message => `<li>${escapeHtml(message)}</li>`).join(''));
    this.set('save-status', this.saved && this.storage ? 'บันทึกบนเครื่องนี้อัตโนมัติ' : 'เล่นได้ แต่บันทึกบนเครื่องนี้ไม่ได้');
    this.scene?.sync({ state: this.displayState, heroId: this.heroId, targetId: null, phase: this.presentation?.phase, activeActorId: this.actingActor, activeTargetId: this.actingTarget }, repaint);
    this.renderFieldTargets();
    this.renderFieldStatuses();
    this.renderFieldBanner();
    this.renderTutorial();
    if (focus) this.root.querySelector<HTMLElement>(`#${focus}`)?.focus({ preventScroll: true });
    this.placeBackdrop();
  }
}
