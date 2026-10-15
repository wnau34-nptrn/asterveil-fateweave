import { actionReason, beginBattle, createBattle, currentHeroId, plannedIntents, replay, resolveCommand, targetOptions, upcomingTurns, skillPower } from '../core/battle/engine';
import type { ActionId, BattleEntry, BattleState, Command, EncounterDefinition, Outcome, Resolution, TurnStage } from '../core/battle/types';
import type { BattleKind } from '../core/world/types';
import { browserStorage } from '../platform/browser-storage';
import type { BattleScene } from '../game/scenes/BattleScene';
import { actorName, eventThai, heroText, intentName, reasonThai, skillDescription } from './th';
import { portrait } from './world-ui';
import { icon } from './icons';
import { battleLesson } from './tutorial';

const tutorialKey = 'asterveil.fateweave.tutorial.v1';

// The expedition owns persistence: every commit is handed to the session before playback.
export interface BattleSession {
  kind: BattleKind; data: EncounterDefinition; entry: BattleEntry; commands: readonly Command[];
  commit(state: BattleState): boolean;
  leaveLabel(outcome: Outcome): string;
  leave(): void;
}
const kindLabel: Record<BattleKind, string> = { tutorial: 'ศึกสอน', random: 'พบศัตรู', boss: 'บอส' };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export class BattleUI {
  state: BattleState;
  private heroId = 'guardian';
  private action: ActionId = 'attack';
  private started: boolean;
  private busy = false;
  private canvasInputAfterInfo = 0;
  private presentation: { phase: 'hero' | 'enemy'; index: number; resolution: Resolution; frame: BattleState; logEnds: number[] } | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private storage = browserStorage();
  private hintsEnabled = true;
  private saved = true;
  private messages: string[];
  private scene: BattleScene | undefined;
  private session: BattleSession | undefined;
  private data: EncounterDefinition;
  private readonly portraitLayout = window.matchMedia('(max-width: 600px) and (orientation: portrait)');
  private readonly mobile = window.matchMedia('(max-width: 600px), (max-width: 960px) and (max-height: 540px)');

  constructor(private readonly root: HTMLElement, data: EncounterDefinition) {
    this.data = data;
    try { this.hintsEnabled = this.storage?.getItem(tutorialKey) !== 'off'; } catch { /* Advice still works without storage. */ }
    this.state = createBattle(data);
    this.started = false;
    this.messages = [];
    root.innerHTML = `
      <header class="masthead">
        <div class="encounter-heading"><p class="eyebrow" id="encounter-kind">การต่อสู้</p><h1 id="encounter-title"></h1></div>
        <div id="beat-status"></div><button id="battle-info" aria-haspopup="dialog" aria-controls="game-info" data-ui="info" class="quiet" aria-label="ข้อมูลสกิลและวิธีเล่น">ⓘ</button>
      </header>
      <main>
        <section id="turn-phase" class="turn-phase" role="status" aria-live="polite" aria-label="เทิร์นการต่อสู้"></section>
        <aside id="battle-coach" class="battle-coach" aria-label="คำใบ้สอนเล่น" hidden><div class="coach-content"><strong id="coach-title"></strong><p id="coach-copy" aria-live="polite"></p></div><button id="coach-dismiss" data-ui="coach-dismiss" class="quiet" aria-label="ปิดคำใบ้สอนเล่น">×</button></aside>
        <div class="battle-layout">
          <section class="battle-board" aria-label="สถานการณ์การต่อสู้">
            <section class="arena" aria-label="สนามต่อสู้ แตะเป้าหมายเพื่อใช้สกิล">
              <div id="game"></div><div id="field-targets" aria-label="แตะตัวละครในสนามเพื่อใช้สกิล"></div>
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
          <section id="tutorial-settings" class="tutorial-settings" aria-label="ตั้งค่าคำใบ้สอนเล่น"></section>
          <details id="forecast-details" class="forecast-panel"><summary>ดูการโจมตีของศัตรู 2 เทิร์นถัดไป</summary><div id="forecast" class="forecast"></div></details>
          <details class="field-notes"><summary>อาชีพ · สกิลและแนวหน้า/หลัง</summary><div id="rules"></div></details>
          <details class="combat-history"><summary>บันทึกการต่อสู้</summary><ol id="event-log" role="log" aria-live="polite"></ol></details>
        </div></details></div>
        <footer><span>เจ้าของเทิร์น → เลือกสกิล → แตะเป้าหมายในสนาม</span><span id="save-status"></span></footer>
      </main><dialog id="game-info" aria-labelledby="info-title"><div class="info-header"><h2 id="info-title">ข้อมูลการต่อสู้</h2><button data-ui="info-close" class="quiet" aria-label="ปิดข้อมูล">✕</button></div><div class="info-content"><section id="info-skill"></section><div id="info-host"></div></div></dialog>

      <section id="skill-popover" popover="manual" role="dialog" aria-modal="false" aria-labelledby="skill-title" aria-describedby="skill-copy skill-availability" tabindex="-1"><div class="skill-popover-heading"><h2 id="skill-title"></h2><button data-ui="skill-close" class="quiet" aria-label="ปิดคำอธิบายสกิล">✕</button></div><p id="skill-copy"></p><p id="skill-availability"></p><small>อ่านแล้วแตะเป้าหมายในสนามเพื่อใช้สกิล</small></section>`;
    root.addEventListener('click', e => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-ui]');
      const popup = root.querySelector<HTMLElement>('#skill-popover')!;
      if (!popup.contains(e.target as Node) && button?.dataset.ui !== 'action') this.closeSkill();
      if (!button || button.disabled) return;
      const modal = root.querySelector('dialog[open]');
      if (modal && !modal.contains(button)) return;
      const value = button.dataset.value;
      switch (button.dataset.ui) {
        case 'info': this.root.querySelector<HTMLDialogElement>('#game-info')!.showModal(); break;
        case 'info-close': this.root.querySelector<HTMLDialogElement>('#game-info')!.close(); break;
        case 'start': if (this.session && !this.started) { this.started = true; this.present(beginBattle(this.data, this.session.entry)); } break;
        case 'hero': if (value) this.selectHero(value); break;
        case 'action': if (value && !this.busy && this.started && this.state.outcome === 'active' && this.data.heroes.find(h => h.id === currentHeroId(this.state, this.data))?.actions.includes(value as ActionId)) { this.action = value as ActionId; this.render(); this.showSkill(); } break;
        case 'skill-close': this.closeSkill(true); break;
        case 'target': if (value) this.choose(value); break;
        case 'skip-turn': this.finishPresentation(); break;
        case 'leave': if (!this.busy && this.state.outcome !== 'active') this.session?.leave(); break;
        case 'coach-dismiss': this.setHints(false); break;
        case 'coach-toggle': this.setHints(!this.hintsEnabled); break;
      }
    });
    const infoDialog = root.querySelector<HTMLDialogElement>('#game-info')!;
    // Phaser can process the closing touch on its next input frame.
    const blockClosingTouch = () => { this.canvasInputAfterInfo = performance.now() + 250; };
    infoDialog.addEventListener('close', blockClosingTouch);
    infoDialog.addEventListener('cancel', blockClosingTouch);
    root.querySelector('[data-ui=info-close]')!.addEventListener('pointerdown', blockClosingTouch);
    root.querySelector('#skill-popover')!.addEventListener('pointerdown', blockClosingTouch);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && root.querySelector('#skill-popover:popover-open')) { e.preventDefault(); this.closeSkill(true); }
    });
    window.addEventListener('resize', () => this.positionSkill());
    this.mobile.addEventListener('change', () => this.render());
    this.portraitLayout.addEventListener('change', () => this.render());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.busy) this.finishPresentation();
    });
    this.render();
  }

  attach(scene: BattleScene): void { this.scene = scene; this.render(); }
  // Starts or resumes a battle from the expedition's recorded entry and commands.
  open(session: BattleSession): void {
    clearTimeout(this.timer); this.timer = undefined; this.scene?.stopEffects(); this.presentation = undefined; this.busy = false;
    this.closeSkill(); this.session = session; this.action = 'attack';
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
  fieldLayoutChanged(): void { this.renderFieldTargets(); this.renderTutorial(); }
  private get displayState(): BattleState { return this.presentation?.frame ?? (!this.started ? beginBattle(this.data, this.session?.entry).initial : this.state); }
  private get stage(): TurnStage | undefined { return this.presentation?.resolution.turns[this.presentation.index]; }
  private get actingActor(): string | undefined { return this.stage?.events.some(e => e.type === 'cancel') ? undefined : this.stage?.actorId; }
  private get actingTarget(): string | undefined { return this.stage?.targetId; }

  choose(id: string, source: 'target' | 'canvas' = 'target'): void {
    if (this.root.querySelector('dialog[open]') || source === 'canvas' && performance.now() < this.canvasInputAfterInfo) return;
    if (!this.scene?.isReady || !this.started || this.busy || this.state.outcome !== 'active') return;
    const actualTarget = this.action === 'prayer' && this.state.heroes.some(h => h.id === id && h.hp > 0) ? 'party' : id;
    const target = targetOptions(this.state, this.data, this.heroId, this.action).find(t => t.id === actualTarget);
    if (target?.valid) {
      this.execute(actualTarget);
    } else if (!['guard','ward','heal','prayer','brace'].includes(this.action) && this.data.heroes.some(h => h.id === id)) this.selectHero(id);
  }

  private selectHero(id: string): void {
    if (this.busy || id !== currentHeroId(this.state, this.data)) return;
    this.heroId = id; this.action = 'attack'; this.render();
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
    let title = lesson.title; let copy = lesson.copy;
    if (p) {
      lesson.step = p.resolution.initial.commands.length + 1;
      const event = this.stage!.events.find(e => e.type !== 'outcome');
      title = p.phase === 'hero' ? 'เทิร์นฮีโร่ตามความเร็ว' : 'ถึงเทิร์นศัตรู';
      copy = event ? eventThai(event, this.displayState, this.data) : 'การตอบโต้จังหวะนี้ถูกยกเลิก';
      if (p.phase === 'hero' && this.stage?.action === 'mark') copy = `${actorName(this.stage!.targetId, this.data)} ติดตราแล้ว · ไลราตีเป้านี้ครั้งถัดไป +${this.data.rules.markedBonus}`;
    } else {
      const next = this.heroId !== lesson.heroId ? `#hero-${lesson.heroId}` : this.action !== lesson.action ? `#action-${lesson.action}` : `#target-${lesson.targetId}`;
      this.root.querySelector(next)?.classList.add('coach-focus');
      if (lesson.step === 1) this.root.querySelector('#intent')?.classList.add('coach-focus');
    }
    const heading = `ศึกสอน ${lesson.step} · ${title}`;
    const titleNode = this.root.querySelector('#coach-title')!; const copyNode = this.root.querySelector('#coach-copy')!;
    // Layout-only updates retain settings focus and avoid repeating live copy.
    if (titleNode.textContent !== heading) titleNode.textContent = heading;
    if (copyNode.textContent !== copy) copyNode.textContent = copy;
    if (resized) this.scene?.refreshLayout();
  }

  private showSkill(): void {
    const skill = this.data.skills[this.action];
    this.root.querySelector('#skill-title')!.textContent = `${skill.name} · ${actorName(this.heroId, this.data)}`;
    this.root.querySelector('#skill-copy')!.textContent = skillDescription(this.action, this.heroId, this.data);
    const options = targetOptions(this.state, this.data, this.heroId, this.action);
    this.root.querySelector('#skill-availability')!.textContent = options.some(t => t.valid) ? 'พร้อมใช้ · แตะเป้าหมายที่มีเครื่องหมาย' : reasonThai(options.find(t => t.reason)?.reason ?? '');
    const popup = this.root.querySelector<HTMLElement>('#skill-popover')!;
    if (!popup.matches(':popover-open')) popup.showPopover();
    this.root.querySelector(`#action-${this.action}`)?.setAttribute('aria-expanded', 'true');
    popup.focus({ preventScroll: true });
    this.positionSkill();
  }

  private positionSkill(): void {
    const popup = this.root.querySelector<HTMLElement>('#skill-popover:popover-open'); if (!popup) return;
    const dock = this.root.querySelector('.command-dock')!.getBoundingClientRect();
    popup.style.left = `${Math.max(8, Math.min(innerWidth - popup.offsetWidth - 8, dock.left))}px`;
    const preferredTop = this.portraitLayout.matches ? this.root.querySelector('.masthead')!.getBoundingClientRect().bottom + 6 : dock.top - popup.offsetHeight - 8;
    popup.style.top = `${Math.max(8, Math.min(innerHeight - popup.offsetHeight - 8, preferredTop))}px`;
  }

  private closeSkill(returnFocus = false): void {
    const popup = this.root.querySelector<HTMLElement>('#skill-popover:popover-open'); if (!popup) return;
    popup.hidePopover();
    this.root.querySelector(`#action-${this.action}`)?.setAttribute('aria-expanded', 'false');
    if (returnFocus) {
      this.canvasInputAfterInfo = performance.now() + 250;
      this.root.querySelector<HTMLElement>(`#action-${this.action}`)?.focus({ preventScroll: true });
    }
  }

  private execute(targetId: string): void {
    if (!this.scene?.isReady || !this.started || this.busy || this.state.outcome !== 'active') return;
    const command: Command = { beat: this.state.beat, heroId: this.heroId, action: this.action, targetId };
    this.present(resolveCommand(this.state, this.data, command));
  }

  private present(result: Resolution): void {
    this.closeSkill();
    // Commit every actual actor turn before presentation. Reload never repeats damage.
    this.state = result.state;
    this.saved = this.session?.commit(this.state) ?? false;
    const logEnds = result.turns.map(turn => {
      this.messages.push(`รอบ ${turn.round} · เทิร์น${turn.side === 'hero' ? 'ฮีโร่' : 'ศัตรู'} · ${actorName(turn.actorId, this.data)}${turn.action ? ` ${this.data.skills[turn.action].name}` : ''}`,
        ...turn.events.map(event => eventThai(event, result.state, this.data)));
      return this.messages.length;
    });
    if (!result.turns.length) { this.busy = false; this.heroId = currentHeroId(this.state, this.data) ?? this.heroId; this.render(); return; }
    this.busy = true;
    const first = result.turns[0]!;
    this.presentation = { phase: first.side, index: 0, resolution: result, frame: first.state, logEnds };
    this.showStage();
    this.root.querySelector<HTMLElement>('#skip-turn')?.focus({ preventScroll: true });
  }

  private showStage(): void {
    const playback = this.presentation; if (!playback) return;
    const turn = playback.resolution.turns[playback.index]!;
    playback.phase = turn.side; playback.frame = turn.state;
    if (turn.side === 'hero') this.heroId = turn.actorId;
    this.render(); this.scene?.play(turn.events);
    this.timer = setTimeout(() => {
      if (this.presentation !== playback) return;
      if (++playback.index < playback.resolution.turns.length) this.showStage();
      else this.finishPresentation();
    }, 1000);
  }

  private finishPresentation(): void {
    if (!this.presentation) return;
    clearTimeout(this.timer); this.timer = undefined; this.scene?.stopEffects();
    this.presentation = undefined; this.busy = false;
    this.heroId = currentHeroId(this.state, this.data) ?? this.heroId;
    this.action = 'attack'; this.render();
    if (this.state.outcome === 'active') this.root.querySelector<HTMLElement>('#action-attack')?.focus({ preventScroll: true });
  }

  private set(id: string, content: string): void { this.root.querySelector(`#${id}`)!.innerHTML = content; }

  private portrait(id: string): string { return portrait(id); }

  private renderPhase(): void {
    const turn = this.stage; const d = this.data; const s = this.displayState;
    const canceled = turn?.events.some(e => e.type === 'cancel');
    const mode = turn?.side ?? (s.outcome !== 'active' ? 'finished' : 'choice');
    const actor = turn?.actorId ?? this.heroId;
    const title = !this.started ? 'เรียงเทิร์นตามความเร็ว' : turn ? canceled ? `${actorName(actor, d)} · ถูกขัดจังหวะ` : `เทิร์น${turn.side === 'hero' ? 'ฮีโร่' : 'ศัตรู'} · ${actorName(actor, d)}` : s.outcome !== 'active' ? `จบการต่อสู้ · ${s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}` : `เทิร์นของคุณ · ${actorName(actor, d)}`;
    const detail = turn ? canceled ? 'ศัตรูเสียเทิร์นนี้' : `${turn.action ? d.skills[turn.action].name : turn.intent ? intentName(turn.intent) : 'ลงมือ'} → ${actorName(turn.targetId, d)}` : s.outcome !== 'active' ? 'กดปุ่มด้านล่างเพื่อไปต่อ' : 'SPD มากเริ่มก่อน · คนละ 1 ครั้งต่อรอบ';
    const phaseRoot = this.root.querySelector<HTMLElement>('#turn-phase')!;
    phaseRoot.dataset.phase = mode; phaseRoot.dataset.actor = actor; phaseRoot.dataset.canceled = String(!!canceled);
    this.set('turn-phase', `<div class="phase-head"><div class="phase-portrait">${this.portrait(actor)}</div><div class="phase-copy"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(detail)}</p></div>${turn ? '<button id="skip-turn" data-ui="skip-turn" class="quiet">ดูผลทันที</button>' : ''}</div><div id="turn-order" aria-label="ลำดับเทิร์นตามความเร็ว"></div>`);
  }

  private renderSelectedHero(): void {
    const def = this.data.heroes.find(h => h.id === this.heroId)!;
    const hero = this.displayState.heroes.find(h => h.id === this.heroId)!;
    const text = heroText[this.heroId]!;
    this.set('selected-hero', `<div class="selected-info"><h2>${text.name}<span>${text.role} · ${def.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'}</span></h2><p class="selected-resource">เลือด ${hero.hp}/${def.maxHp}${hero.barrier ? ` · โล่ ${hero.barrier}` : ''} · พลังโจมตี ${def.attack} · SPD ${def.speed}</p></div><span class="selection-state">${hero.hp <= 0 ? 'ล้มแล้ว' : this.presentation?.phase === 'hero' ? 'กำลังลงมือ' : this.presentation ? 'รอศัตรู' : 'ถึงเทิร์น'}</span>`);
  }

  private renderTimeline(): void {
    const s = this.displayState; const slots = upcomingTurns(s, this.data);
    this.set('turn-order', slots.length ? `<ol>${slots.map((slot, index) => {
      const blocked = slot.side === 'enemy' && (s.enemies.find(e => e.id === slot.actorId)?.interruptedRound === slot.round ||
        index === 0 && this.stage?.events.some(e => e.type === 'cancel'));
      const label = blocked ? 'หยุด' : index === 0 ? 'ตอนนี้' : slot.round > s.round ? `รอบ ${slot.round}` : index === 1 ? 'ถัดไป' : 'รอ';
      return `<li class="turn-slot ${slot.side} ${blocked ? 'blocked-turn' : ''} ${index === 0 ? 'current-turn' : ''}" data-actor="${slot.actorId}" data-round="${slot.round}" ${index === 0 ? 'aria-current="step"' : ''} aria-label="${index === 0 ? 'ตอนนี้' : `ลำดับ ${index + 1}`} ${actorName(slot.actorId, this.data)} ความเร็ว ${slot.speed} รอบ ${slot.round}${blocked ? ' ถูกขัดจังหวะ' : ''}">${this.portrait(slot.actorId)}<span><b>${actorName(slot.actorId, this.data)}</b><small>${label} · ${slot.speed}</small></span></li>`;
    }).join('')}</ol>` : '<p>จบการต่อสู้แล้ว</p>');
  }

  private renderSituation(): void {
    const s = this.displayState; const d = this.data; const intent = this.stage?.side === 'enemy' ? this.stage.intent : s.intent;
    this.renderTimeline();
    this.set('enemy-roster', d.enemies.map(e => {
      const enemy = s.enemies.find(v => v.id === e.id)!;
      return `<div class="enemy-card ${enemy.hp <= 0 ? 'fallen' : ''} ${this.actingActor === e.id ? 'active-actor' : ''}" data-enemy="${e.id}">${this.portrait(e.id)}<div><strong>${actorName(e.id, d)}</strong><span class="enemy-hp">HP <b>${enemy.hp} / ${e.maxHp}</b>${enemy.markedUntil > s.round ? ' · ติดตรา' : enemy.hp <= 0 ? ' · กำจัดแล้ว' : ''}</span><span class="hp-track"><span style="width:${enemy.hp / e.maxHp * 100}%"></span></span></div></div>`;
    }).join(''));
    const living = s.heroes.filter(h => h.hp > 0);
    this.set('beat-status', `<span class="beat-chip">${this.busy ? 'กำลังแสดงผล…' : s.outcome === 'active' ? `รอบ ${s.round}` : s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}</span><span class="formation-chip">หน้า ${living.filter(h => d.heroes.find(v => v.id === h.id)!.lane === 'front').length} · หลัง ${living.filter(h => d.heroes.find(v => v.id === h.id)!.lane === 'back').length}</span>`);
    if (intent) {
      const response = this.presentation?.phase === 'enemy';
      const hit = response ? this.stage?.events.find(e => e.type === 'damage') : undefined;
      const canceled = response ? this.stage?.events.some(e => e.type === 'cancel') : s.enemies.find(e => e.id === intent.sourceId)?.interruptedRound === intent.round;
      const recipient = hit?.targetId ?? intent.targetId;
      const target = s.heroes.find(h => h.id === recipient)!;
      const lethal = !this.presentation && !canceled && intent.damage >= target.hp + target.barrier;
      const heading = canceled ? 'การโจมตีนี้ถูกขัดจังหวะ' : response ? 'ศัตรูกำลังลงมือ' : `การโจมตีศัตรูถัดไป · รอบ ${intent.round}`;
      this.set('intent', `<div class="intent-icon">${icon(intent.kind === 'energy' ? 'bolt' : 'attack')}</div><div class="intent-copy"><p class="eyebrow">${heading}</p><h2>${actorName(intent.sourceId, d)} <span>→</span> ${actorName(recipient, d)}</h2><p>${intentName(intent)} · ${intent.kind === 'energy' ? 'พลังงาน' : 'กายภาพ'} <span class="intent-rule">${intent.kind === 'physical' ? 'แนวหน้ารับก่อน' : 'ถึงแนวหลังได้'}</span></p>${lethal ? `<p class="lethal-warning">⚠ ${actorName(intent.targetId, d)} จะล้มหากรับการโจมตีนี้โดยไม่มีการป้องกัน</p>` : ''}</div><div class="intent-damage"><strong>${canceled ? '—' : hit ? hit.amount : intent.damage}</strong><small>${hit ? 'เสียเลือด' : 'พลังโจมตี'}</small></div>`);
    } else this.set('intent', `<div class="intent-icon">✧</div><div class="intent-copy"><p class="eyebrow">การต่อสู้จบแล้ว</p><h2>${s.outcome === 'victory' ? 'ศัตรูถูกกำจัดแล้ว' : 'ทีมของคุณล้มทั้งหมด'}</h2><p>${s.outcome === 'victory' ? 'เลือดที่เหลือติดตัวไปศึกถัดไป' : 'ทีมจะถอยกลับไปฟื้นตัว'}</p></div>`);
    this.root.querySelector<HTMLElement>('#forecast-details')!.hidden = s.outcome !== 'active';
    this.set('forecast', plannedIntents(s, d).map(next => `<div><b>รอบ ${next.round} · ${actorName(next.sourceId, d)} · ${intentName(next)}</b><small>${actorName(next.targetId, d)} · พลังโจมตี ${next.damage} · ${next.kind === 'energy' ? 'พลังงาน' : 'กายภาพ'}</small></div>`).join('') + (s.outcome === 'active' ? '<p>แผนนี้สมมติว่าตัวละครยังอยู่ เปลี่ยนได้เมื่อมีใครล้ม เป้าหมายจะถูกกำหนดจริงเมื่อถึงเทิร์นศัตรู</p>' : ''));
    this.set('formation-info', '<div><strong>แนวหน้า 2 · แนวหลัง 2</strong><p>กายภาพโจมตีแนวหน้าก่อน · พลังงานถึงแนวหลังได้ · สกิลเฉพาะมีคูลดาวน์</p></div>');
    const k = this.session?.kind ?? 'random'; const fallen = s.heroes.filter(h => h.hp <= 0).length;
    this.set('start-screen', !this.started ? `<div class="start-card"><p class="eyebrow">${kindLabel[k]}</p><h2>${escapeHtml(d.name)}</h2><p>${k === 'tutorial' ? 'ศึกแรกของการเดินทาง · คำแนะนำจะพาใช้สกิลของทุกอาชีพ' : k === 'boss' ? 'ผู้คุมรอยแยกสลับโจมตีกายภาพและพลังงาน · อ่านแผนแล้วป้องกันให้ทัน' : 'ศัตรูขวางทาง · เลือดที่เหลือติดตัวเข้าศึกนี้'}${fallen ? `<br>${fallen} คนล้มอยู่และไม่ได้ลงมือในศึกนี้` : ''}</p><button data-ui="start" id="start" class="primary" ${!this.scene?.isReady ? 'disabled' : ''}>${this.scene?.isReady ? 'เริ่มต่อสู้ →' : 'กำลังเตรียมสนาม…'}</button></div>` : !this.presentation && s.outcome !== 'active' ? `<div class="result-card" role="status"><p class="eyebrow">${s.outcome === 'victory' ? 'ชนะศึก' : k === 'tutorial' ? 'ลองอีกครั้งได้' : 'ถอยกลับไปตั้งหลัก'}</p><h2>${s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}</h2><p>ยืนอยู่ ${s.heroes.filter(h => h.hp > 0).length} / ${s.heroes.length} คน · เลือดทีม ${s.heroes.reduce((hp, h) => hp + h.hp, 0)}<br>ใช้ ${s.commands.length} คำสั่ง</p>${s.outcome === 'victory' ? `<strong class="party-result">${s.heroes.every(h => h.hp > 0) ? 'รักษาทีมครบทุกคน' : 'ชนะ แต่สมาชิกที่ล้มต้องรอพักที่แคมป์'}</strong>` : ''}<button data-ui="leave" id="leave-battle" class="primary">${escapeHtml(this.session?.leaveLabel(s.outcome) ?? 'ไปต่อ')}</button></div>` : '');
  }

  private renderParty(disabled: boolean): void {
    const s = this.displayState; const d = this.data;
    this.set('party', this.data.heroes.map((h, i) => {
      const hero = s.heroes[i]!; const text = heroText[h.id]!; const selected = h.id === this.heroId; const waiting = s.outcome === 'active' && !selected;
      const skills = h.actions.filter(a => a !== 'attack');
      return `<button id="hero-${h.id}" data-ui="hero" data-value="${h.id}" data-lane="${h.lane}" class="hero-card ${h.id} ${hero.hp <= 0 ? 'fallen' : ''} ${selected ? 'selected' : 'waiting-turn'} ${this.actingActor === h.id ? 'active-actor' : ''}" aria-pressed="${selected}" ${disabled || hero.hp <= 0 || waiting ? 'disabled' : ''}><span class="hero-emblem">${this.portrait(h.id)}</span><span class="hero-copy"><span class="hero-class"><b>${h.lane === 'front' ? 'FRONT' : 'BACK'}</b> ${text.role}</span><strong>${text.name}</strong><span class="hero-hp"><span class="hp-amount"><span class="hp-label">HP</span> ${hero.hp} / ${h.maxHp}</span>${hero.barrier ? `<small class="barrier-info">โล่ ${hero.barrier}</small>` : ''}${hero.hp <= 0 ? ' · ล้มแล้ว' : ''}</span><span class="hp-track"><span style="width:${hero.hp / h.maxHp * 100}%"></span></span></span><span class="hero-skills">${skills.map(action => {
        const remaining = Math.max(0, (hero.cooldowns[action] ?? 0) - s.round);
        const available = targetOptions(s, d, h.id, action).some(t => t.valid);
        const status = hero.hp <= 0 ? 'ล้มแล้ว' : s.outcome !== 'active' ? 'จบแล้ว' : waiting ? 'รอเทิร์น' : remaining ? `รอ ${remaining} รอบ` : available ? 'พร้อมใช้' : action === 'heal' || action === 'prayer' ? 'เลือดเต็ม' : 'โล่เต็ม';
        return `<span class="skill-status ${available ? 'ready' : 'cooling'}" data-skill="${action}">${icon(action)}<span>${d.skills[action].name}<small>${status}</small></span></span>`;
      }).join('')}</span>${selected ? `<span class="selected-tag">${this.presentation?.phase === 'hero' ? 'ลงมือ' : this.presentation ? 'รอ' : 'ถึงเทิร์น'}</span>` : ''}</button>`;
    }).join(''));
  }

  private renderCommands(disabled: boolean): void {
    const s = this.displayState; const d = this.data;
    const hero = d.heroes.find(h => h.id === this.heroId)!;
    const options = targetOptions(s,d,this.heroId,this.action);
    const noTarget = !disabled && !options.some(t=>t.valid) ? reasonThai(options.find(t=>t.reason)?.reason ?? '') : '';

    this.set('commands', `<h2 class="step-heading"><span>2</span>${heroText[this.heroId]!.role} · เลือกคำสั่ง</h2><div class="actions">${hero.actions.map(action => {
      const text = d.skills[action]; const reason = actionReason(s, d, this.heroId, action);
      return `<div class="action-option"><button id="action-${action}" data-ui="action" data-value="${action}" aria-haspopup="dialog" aria-controls="skill-popover" aria-expanded="false" class="action ${action} ${this.action === action ? 'selected' : ''}" aria-pressed="${this.action === action}" aria-describedby="reason-${action}" ${disabled ? 'disabled' : ''} data-unavailable="${!!reason}">${icon(action)}<strong>${text.name}</strong><small>${text.english}</small><span class="skill-value">${action === 'attack' ? `พลัง ${hero.attack}` : action === 'mark' ? `โบนัส +${d.rules.markedBonus}` : action === 'guard' ? `ลด ${d.rules.guardReduction * 100}%` : `พลัง ${skillPower(d, this.heroId, action)}`}</span></button><p id="reason-${action}" class="${reason ? 'unavailable-reason' : ''}">${escapeHtml(reason ? reasonThai(reason) : text.cooldown ? `คูลดาวน์ ${text.cooldown} รอบ` : 'ใช้ได้ทุกเทิร์น')}</p></div>`;
    }).join('')}</div><details class="action-help"><summary>วิธีใช้${d.skills[this.action].name}</summary><p class="action-description">${skillDescription(this.action, this.heroId, d)}</p></details><p class="target-hint">${noTarget || (this.action === 'prayer' ? 'แตะฮีโร่ในสนามเพื่อฟื้นฟูทั้งทีม' : ['guard','ward','heal'].includes(this.action) ? 'แตะเพื่อนในสนามที่มีเครื่องหมาย' : 'แตะศัตรูในสนามที่มีเครื่องหมาย')}</p>`);
  }

  private renderFieldTargets(): void {
    if (!this.scene) return;
    const s = this.displayState; const d = this.data;
    const disabled = !this.scene.isReady || !this.started || this.busy || s.outcome !== 'active';
    const options = targetOptions(s, d, this.heroId, this.action);
    const targets = this.action === 'prayer' ? d.heroes.map(h => ({ ...options[0]!, id:h.id, valid:options[0]!.valid && s.heroes.some(v => v.id===h.id && v.hp>0) })) : options;
    this.set('field-targets', targets.map(t => {
      const position = this.scene!.actorTargets.get(t.id); if (!position) return '';
      const hero = s.heroes.find(h => h.id===t.id); const enemy = s.enemies.find(e => e.id===t.id);
      const maxHp = d.heroes.find(h => h.id===t.id)?.maxHp ?? d.enemies.find(e => e.id===t.id)?.maxHp;
      const label = `ใช้${d.skills[this.action].name}กับ${this.action==='prayer' ? 'ทั้งทีม โดยแตะ' : ''}${actorName(t.id,d)} · เลือด ${hero?.hp ?? enemy?.hp}/${maxHp}${!t.valid ? ` · ${reasonThai(t.reason)}` : ''}`;
      const buttonId = this.action==='prayer' ? t.id===this.heroId ? 'party' : `party-${t.id}` : t.id;
      return `<button id="target-${buttonId}" data-ui="target" data-value="${t.id}" data-actor="${t.id}" class="field-target ${disabled || !t.valid ? '' : 'valid-target'}" style="left:${position.x}px;top:${position.y}px;width:${position.width}px;height:${position.height}px" aria-label="${escapeHtml(label)}" ${disabled || !t.valid ? 'disabled' : ''}><span class="field-marker" aria-hidden="true">${icon(this.action)}</span></button>`;
    }).join(''));
  }

  private render(): void {
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
    const s = this.state; const d = this.data; const disabled = !this.scene?.isReady || !this.started || this.busy || s.outcome !== 'active';
    this.set('encounter-title', escapeHtml(d.name));
    this.set('encounter-kind', kindLabel[this.session?.kind ?? 'random']);
    this.root.classList.toggle('mobile-layout', this.mobile.matches);
    const dialog = this.root.querySelector<HTMLDialogElement>('#game-info')!;
    const help = this.root.querySelector<HTMLDetailsElement>('.help-panel')!;
    const host = this.root.querySelector('#info-host')!;
    if (help.parentElement !== host) { if (dialog.open) dialog.close(); host.append(help); help.open = true; }
    this.set('info-skill', `<h3>${d.skills[this.action].name} · ${heroText[this.heroId]!.name}</h3><p>${skillDescription(this.action, this.heroId, d)}</p>`);
    this.root.querySelector<HTMLElement>('#tutorial-settings')!.hidden = this.session?.kind !== 'tutorial';
    this.set('tutorial-settings', `<strong>คำแนะนำศึกสอน</strong><p>อ่านแผนศัตรู · ตั้งรับ · ติดตราแล้วตีเป้าเดิม · ขัดจังหวะ · รักษา</p><button id="coach-toggle" data-ui="coach-toggle" class="quiet" aria-pressed="${this.hintsEnabled}">${this.hintsEnabled ? 'ปิดคำแนะนำ' : 'เปิดคำแนะนำ'}</button>`);
    this.renderPhase(); this.renderSituation(); this.renderSelectedHero(); this.renderParty(disabled); this.renderCommands(disabled);
    this.set('rules', `<h3>ลงสนาม ${d.heroes.length} คน · ศัตรูเล็งตามหมายเลขช่อง</h3><p>รวมฮีโร่และศัตรูเรียง SPD มากไปน้อยเมื่อเริ่มรอบ คนละ 1 ครั้งต่อรอบ ข้ามตัวที่ล้ม SPD เท่ากันใช้ลำดับรายชื่อฮีโร่ก่อน ตามด้วยศัตรู</p><p>แนวหน้าที่ยังยืนอยู่รับการโจมตีกายภาพก่อน พลังงานโจมตีแนวหลังได้ เมื่อแนวหน้าล้มหมด กายภาพจะถึงแนวหลัง ท่าของศัตรูเล็งหมายเลขช่องในทีม ใครยืนช่องนั้นคือเป้า แผนโจมตีเป็นการคาดการณ์ตามคนที่ยังยืนอยู่ เมื่อถึงเทิร์นศัตรูจึงกำหนดเป้าหมายจริง</p>${d.heroes.map(hero => `<h3>${heroText[hero.id]!.name} · ${heroText[hero.id]!.role} · SPD ${hero.speed} · ${hero.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'}</h3><dl>${hero.actions.map(action => `<dt>${d.skills[action].name} (${d.skills[action].english})</dt><dd>${skillDescription(action, hero.id, d)}</dd>`).join('')}</dl>`).join('')}<p>แต่ละตัวลงมือ 1 ครั้งต่อรอบ สกิลคูลดาวน์ 2 รอบที่ใช้ในรอบ 1 จะพร้อมในรอบ 3 พรฟื้นฟูคูลดาวน์ 3 รอบ ${d.enemies.map(e => `${actorName(e.id, d)} SPD ${e.speed}`).join(' · ')} การรักษาไม่ชุบชีวิต โล่เวทไม่ซ้อนกัน เป้าหมายเสริมคือชนะโดยรักษาทีมครบ ${d.heroes.length} คน</p>`);
    const shownMessages = this.presentation ? this.messages.slice(0, this.presentation.logEnds[this.presentation.index]) : this.messages;
    this.set('event-log', shownMessages.slice(-30).map(message => `<li>${escapeHtml(message)}</li>`).join(''));
    this.set('save-status', this.saved && this.storage ? 'บันทึกบนเครื่องนี้อัตโนมัติ' : 'เล่นได้ แต่บันทึกบนเครื่องนี้ไม่ได้');
    this.scene?.sync({ state: this.displayState, heroId: this.heroId, targetId: null, phase: this.presentation?.phase, activeActorId: this.actingActor, activeTargetId: this.actingTarget });
    this.renderFieldTargets();
    this.renderTutorial();
    if (focus) this.root.querySelector<HTMLElement>(`#${focus}`)?.focus({ preventScroll: true });
  }
}
