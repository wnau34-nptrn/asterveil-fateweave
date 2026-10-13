import { actionReason, createBattle, plannedIntents, resolveCommand, targetOptions } from '../core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition, Resolution } from '../core/battle/types';
import { loadBattle, saveBattle } from '../core/save/battle-save';
import { browserStorage } from '../platform/browser-storage';
import type { BattleScene } from '../game/scenes/BattleScene';
import { actorName, eventThai, heroText, intentName, reasonThai, skillDescription } from './th';
import { actorFrames, artUrl } from '../game/visuals/assets';
import { icon } from './icons';

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export class BattleUI {
  state: BattleState;
  private heroId = 'tracer';
  private action: ActionId = 'attack';
  private started: boolean;
  private busy = false;
  private canvasInputAfterInfo = 0;
  private presentation: { phase: 'hero' | 'enemy'; command: Command; resolution: Resolution; frame: BattleState; heroLogEnd: number } | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private storage = browserStorage();
  private saved = true;
  private messages: string[];
  private scene: BattleScene | undefined;
  private readonly portraitLayout = window.matchMedia('(max-width: 600px) and (orientation: portrait)');
  private readonly mobile = window.matchMedia('(max-width: 600px), (max-width: 960px) and (max-height: 540px)');

  constructor(private readonly root: HTMLElement, private readonly data: EncounterDefinition) {
    const loaded = loadBattle(this.storage, data);
    this.state = loaded.state;
    this.started = loaded.restored;
    const lastCommand = this.state.commands.at(-1);
    if (lastCommand) this.heroId = this.state.outcome === 'active' ? this.nextHeroId(lastCommand.heroId) : lastCommand.heroId;
    if (!this.state.heroes.some(h => h.id === this.heroId && h.hp > 0)) this.heroId = this.state.heroes.find(h => h.hp > 0)?.id ?? this.heroId;
    this.messages = [loaded.restored ? 'กลับมาต่อสู้จากจังหวะที่บันทึกไว้' : 'อ่านการโจมตีของศัตรู แล้วเลือกคำสั่งของคุณ'];
    root.innerHTML = `
      <header class="masthead">
        <div class="encounter-heading"><p class="eyebrow">FATEWEAVE · การต่อสู้ 01</p><h1>ศึกปิดรอยแยก</h1></div>
        <div id="beat-status"></div><button id="battle-info" aria-haspopup="dialog" aria-controls="game-info" data-ui="info" class="quiet" aria-label="ข้อมูลสกิลและวิธีเล่น">ⓘ</button><button id="restart" data-ui="restart" class="quiet" aria-label="เริ่มการต่อสู้ใหม่">${icon('restart')}</button>
      </header>
      <main>
        <section id="turn-phase" class="turn-phase" role="status" aria-live="polite" aria-label="เทิร์นการต่อสู้"></section>
        <div class="battle-layout">
          <section class="battle-board" aria-label="สถานการณ์การต่อสู้">
            <section class="arena" aria-label="สนามต่อสู้ กดฮีโร่หรือเป้าหมายได้">
              <div id="game"></div><div id="field-targets" aria-label="แตะตัวละครในสนามเพื่อใช้สกิล"></div><div id="turn-order" aria-label="ลำดับเหตุการณ์"></div>
              <div class="formation-labels" aria-hidden="true"><span class="back-label">แนวหลัง</span><span class="front-label">แนวหน้า</span></div>
              <div id="start-screen"></div>
            </section>
            <div id="enemy-roster" aria-label="เลือดและสถานะศัตรู"></div>
            <section id="intent" aria-label="ศัตรูกำลังจะทำอะไร"></section>
          </section>
          <section class="decision-panel" aria-label="เลือกฮีโร่ คำสั่ง และเป้าหมาย">
            <div class="team-section"><div class="team-heading"><h2 class="step-heading">ทีมของคุณ</h2><small>แตะการ์ดเพื่อเลือกฮีโร่</small></div><div id="party" class="party" aria-label="เลือกฮีโร่"></div></div>
            <div class="command-dock"><div id="selected-hero" aria-live="polite"></div><div id="commands" class="step-section"></div></div>
          </section>
        </div>
        <div id="help-home"><details class="help-panel"><summary>วิธีเล่น · แผนศัตรู · บันทึกการต่อสู้</summary><div class="battle-notes">
          <div id="formation-info" class="formation-info"></div>
          <details id="forecast-details" class="forecast-panel"><summary>ดูแผนโจมตีอีก 2 จังหวะข้างหน้า</summary><div id="forecast" class="forecast"></div></details>
          <details class="field-notes"><summary>อาชีพ · สกิลและแนวหน้า/หลัง</summary><div id="rules"></div></details>
          <details class="combat-history"><summary>บันทึกการต่อสู้</summary><ol id="event-log" role="log" aria-live="polite"></ol></details>
        </div></details></div>
        <footer><span>เลือกฮีโร่ → เลือกสกิล → แตะตัวละครในสนาม</span><span id="save-status"></span></footer>
      </main><dialog id="game-info" aria-labelledby="info-title"><div class="info-header"><h2 id="info-title">ข้อมูลการต่อสู้</h2><button data-ui="info-close" class="quiet" aria-label="ปิดข้อมูล">✕</button></div><div class="info-content"><section id="info-skill"></section><div id="info-host"></div></div></dialog>`;
    root.addEventListener('click', e => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-ui]');
      if (!button || button.disabled) return;
      const value = button.dataset.value;
      switch (button.dataset.ui) {
        case 'info': this.root.querySelector<HTMLDialogElement>('#game-info')!.showModal(); break;
        case 'info-close': this.root.querySelector<HTMLDialogElement>('#game-info')!.close(); break;
        case 'start': this.started = true; this.render(); break;
        case 'hero': if (value) this.selectHero(value); break;
        case 'action': if (value) { this.action = value as ActionId; this.render(); } break;
        case 'target': if (value) this.choose(value); break;
        case 'skip-turn': this.finishPresentation(); break;
        case 'restart': this.restart(); break;
      }
    });
    const infoDialog = root.querySelector<HTMLDialogElement>('#game-info')!;
    // Phaser can process the closing touch on its next input frame.
    const blockClosingTouch = () => { this.canvasInputAfterInfo = performance.now() + 250; };
    infoDialog.addEventListener('close', blockClosingTouch);
    infoDialog.addEventListener('cancel', blockClosingTouch);
    root.querySelector('[data-ui=info-close]')!.addEventListener('pointerdown', blockClosingTouch);
    this.mobile.addEventListener('change', () => this.render());
    this.portraitLayout.addEventListener('change', () => this.render());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.busy) this.finishPresentation();
    });
    this.render();
  }

  attach(scene: BattleScene): void { this.scene = scene; this.render(); }
  sceneReady(): void { this.render(); }
  fieldLayoutChanged(): void { this.renderFieldTargets(); }
  private get displayState(): BattleState { return this.presentation?.frame ?? this.state; }
  private get actingActor(): string | undefined {
    const p = this.presentation;
    if (!p) return undefined;
    if (p.phase === 'hero') return p.command.heroId;
    return p.resolution.stages.enemy.events.some(e => e.type === 'cancel') ? undefined : p.frame.intent?.sourceId;
  }
  private get actingTarget(): string | undefined {
    const p = this.presentation;
    return p?.phase === 'hero' ? p.command.targetId : p?.resolution.stages.enemy.events.find(e => e.type === 'damage')?.targetId;
  }

  choose(id: string, source: 'target' | 'canvas' = 'target'): void {
    if (this.root.querySelector<HTMLDialogElement>('#game-info')!.open || source === 'canvas' && performance.now() < this.canvasInputAfterInfo) return;
    if (!this.scene?.isReady || !this.started || this.busy || this.state.outcome !== 'active') return;
    const actualTarget = this.action === 'prayer' && this.state.heroes.some(h => h.id === id && h.hp > 0) ? 'party' : id;
    const target = targetOptions(this.state, this.data, this.heroId, this.action).find(t => t.id === actualTarget);
    if (target?.valid) {
      this.execute(actualTarget);
    } else if (!['guard','ward','heal','prayer'].includes(this.action) && this.data.heroes.some(h => h.id === id)) this.selectHero(id);
  }

  private selectHero(id: string): void {
    if (this.busy || !this.state.heroes.some(h => h.id === id && h.hp > 0)) return;
    this.heroId = id; this.action = 'attack'; this.render();
  }

  private nextHeroId(afterId: string): string {
    const order = this.data.heroes;
    const previous = order.findIndex(h => h.id === afterId);
    for (let offset = 1; offset <= order.length; offset++) {
      const next = order[(previous + offset) % order.length]!;
      if (this.state.heroes.some(h => h.id === next.id && h.hp > 0)) return next.id;
    }
    return afterId;
  }

  private execute(targetId: string): void {
    if (!this.scene?.isReady || !this.started || this.busy || this.state.outcome !== 'active') return;
    const command: Command = { beat: this.state.beat, heroId: this.heroId, action: this.action, targetId };
    const before = this.state;
    const result = resolveCommand(before, this.data, command);
    // Commit and persist immediately; animations never decide combat results.
    this.state = result.state; this.busy = true;
    const logStart = this.messages.length;
    this.messages.push(`จังหวะ ${command.beat} · เทิร์นฮีโร่ · ${actorName(command.heroId, this.data)} ${this.data.skills[command.action].name}`,
      ...result.stages.hero.events.map(event => eventThai(event, result.state, this.data)),
      `จังหวะ ${command.beat} · เทิร์นศัตรู · ${actorName(before.intent?.sourceId, this.data)}`,
      ...result.stages.enemy.events.map(event => eventThai(event, result.state, this.data)));
    this.saved = saveBattle(this.storage, this.state, this.data);
    const playback = { phase: 'hero' as 'hero' | 'enemy', command, resolution: result, frame: result.stages.hero.state, heroLogEnd: logStart + 1 + result.stages.hero.events.length };
    this.presentation = playback; this.render(); this.scene?.play(result.stages.hero.events);
    this.root.querySelector<HTMLElement>('#skip-turn')?.focus({ preventScroll: true });
    const arena = this.root.querySelector<HTMLElement>('.arena')!;
    const banner = this.root.querySelector<HTMLElement>('#turn-phase')!;
    // A sticky banner's current rect may already be at the viewport top.
    // Anchor to the non-sticky arena so a cast from the lower dock reveals combat.
    if (!this.portraitLayout.matches) window.scrollTo({ top: window.scrollY + arena.getBoundingClientRect().top - banner.offsetHeight - 8, behavior: 'instant' });
    const delay = 1000;
    this.timer = setTimeout(() => {
      if (this.presentation !== playback) return;
      playback.phase = 'enemy'; playback.frame = result.stages.enemy.state;
      this.render(); this.scene?.play(result.stages.enemy.events);
      this.timer = setTimeout(() => { if (this.presentation === playback) this.finishPresentation(); }, delay);
    }, delay);
  }

  private finishPresentation(): void {
    const playback = this.presentation; if (!playback) return;
    clearTimeout(this.timer); this.timer = undefined; this.scene?.stopEffects();
    this.presentation = undefined; this.busy = false;
    this.heroId = this.state.outcome === 'active' ? this.nextHeroId(playback.command.heroId) : playback.command.heroId;
    this.action = 'attack'; this.render();
    if (this.state.outcome === 'active') this.root.querySelector<HTMLElement>('#action-attack')?.focus({ preventScroll: true });
    if (this.mobile.matches && !this.portraitLayout.matches) this.root.querySelector(this.state.outcome === 'active' ? '.command-dock' : '.arena')?.scrollIntoView({ block: this.state.outcome === 'active' ? 'nearest' : 'center', behavior: 'auto' });
  }

  private restart(): void {
    clearTimeout(this.timer); this.timer = undefined; this.scene?.stopEffects(); this.presentation = undefined; this.busy = false; this.state = createBattle(this.data);
    this.heroId = 'tracer'; this.action = 'attack'; this.started = true;
    this.messages = ['เริ่มการต่อสู้ใหม่แล้ว'];
    this.saved = saveBattle(this.storage, this.state, this.data); this.render();
    if (this.mobile.matches && !this.portraitLayout.matches) this.root.querySelector('.arena')?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  private set(id: string, content: string): void { this.root.querySelector(`#${id}`)!.innerHTML = content; }

  private portrait(id: string): string {
    const frame = actorFrames[id]!;
    return `<span class="portrait" data-actor="${id}" style="--portrait-x:${frame % 2};--portrait-y:${Math.floor(frame / 2)}" aria-hidden="true"><img src="${artUrl('portraits')}" alt="" width="1024" height="1536" draggable="false"></span>`;
  }

  private renderPhase(): void {
    const p = this.presentation; const d = this.data; const s = this.displayState;
    const canceled = p?.phase === 'enemy' && p.resolution.stages.enemy.events.some(e => e.type === 'cancel');
    const mode = p?.phase ?? (s.outcome !== 'active' ? 'finished' : 'choice');
    const actor = this.actingActor ?? (p?.phase === 'enemy' ? p.frame.intent?.sourceId : this.heroId);
    const title = !this.started ? 'เตรียมต่อสู้' : p?.phase === 'hero' ? `เทิร์นฮีโร่ · ${actorName(actor, d)}` : p?.phase === 'enemy' ? canceled ? 'เทิร์นศัตรูถูกหยุด' : `เทิร์นศัตรู · ${actorName(actor, d)}` : s.outcome !== 'active' ? `จบการต่อสู้ · ${s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}` : `เทิร์นของคุณ · ${actorName(this.heroId, d)}`;
    const events = p?.resolution.stages[p.phase].events.filter(e => e.type !== 'outcome');
    const detail = p?.phase === 'hero' ? `${d.skills[p.command.action].name} → ${actorName(p.command.targetId, d)}` : p?.phase === 'enemy' ? canceled ? 'ศัตรูไม่ได้โจมตีในจังหวะนี้' : `${intentName(p.frame.intent!)} → ${actorName(this.actingTarget, d)}` : s.outcome !== 'active' ? 'กดเล่นอีกครั้งเพื่อลองแผนใหม่' : 'เลือกสกิล แล้วแตะตัวละครในสนาม';
    const summary = events?.slice(0, 2).map(e => eventThai(e, this.state, d)).join(' · ') ?? '';
    const phaseRoot = this.root.querySelector<HTMLElement>('#turn-phase')!;
    phaseRoot.dataset.phase = mode; phaseRoot.dataset.actor = actor ?? '';
    phaseRoot.dataset.canceled = String(!!canceled);
    this.set('turn-phase', `<div class="phase-portrait">${actor ? this.portrait(actor) : icon('guard')}</div><div class="phase-copy"><div class="phase-flow"><span class="${mode === 'hero' || mode === 'choice' ? 'current' : 'complete'}" aria-current="${mode === 'hero' || mode === 'choice' ? 'step' : 'false'}">1 · ฮีโร่</span><span class="flow-arrow" aria-hidden="true">→</span><span class="${mode === 'enemy' ? 'current' : ''}" aria-current="${mode === 'enemy' ? 'step' : 'false'}">2 · ศัตรู</span><small>จังหวะ ${s.beat}</small></div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(detail)}</p>${summary ? `<small class="phase-result">${escapeHtml(summary)}</small>` : ''}</div>${p ? '<button id="skip-turn" data-ui="skip-turn" class="quiet">ดูผลทันที</button>' : ''}`);
  }

  private renderSelectedHero(): void {
    const def = this.data.heroes.find(h => h.id === this.heroId)!;
    const hero = this.displayState.heroes.find(h => h.id === this.heroId)!;
    const text = heroText[this.heroId]!;
    this.set('selected-hero', `<div class="selected-info"><h2>${text.name}<span>${text.role} · ${def.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'}</span></h2><p class="selected-resource">เลือด ${hero.hp}/${def.maxHp}${hero.barrier ? ` · โล่ ${hero.barrier}` : ''} · พลังโจมตี ${def.attack}</p></div><span class="selection-state">${hero.hp <= 0 ? 'ล้มแล้ว' : this.presentation?.phase === 'hero' ? 'กำลังลงมือ' : this.presentation ? 'รอศัตรู' : 'เลือกอยู่'}</span>`);
  }

  private renderTimeline(): void {
    const s = this.displayState;
    const intents = [s.intent, ...plannedIntents(s, this.data)].filter(i => i !== null);
    this.set('turn-order', `<p>ลำดับเหตุการณ์ <small>ฮีโร่ → ศัตรู</small></p><ol><li class="timeline-slot hero-slot ${this.presentation?.phase === 'hero' ? 'acting' : ''}">${this.portrait(this.heroId)}<small>${this.presentation?.phase === 'hero' ? 'ลงมือ' : 'คุณเลือก'}</small></li>${intents.map((i, index) => `<li class="timeline-slot ${index === 0 ? 'next-slot' : ''} ${index === 0 && this.presentation?.phase === 'enemy' && this.actingActor ? 'acting enemy-acting' : ''}" aria-label="จังหวะ ${i.beat} ${actorName(i.sourceId, this.data)} โจมตี${actorName(i.targetId, this.data)} พลังโจมตี ${i.damage}">${this.portrait(i.sourceId)}<small>${index === 0 ? this.presentation?.phase === 'enemy' ? this.actingActor ? 'ลงมือ' : 'ถูกหยุด' : 'ถัดไป' : `จังหวะ ${i.beat}`}</small></li>`).join('')}</ol>`);
  }

  private renderSituation(): void {
    const s = this.displayState; const d = this.data; const intent = s.intent;
    this.renderTimeline();
    this.set('enemy-roster', d.enemies.map(e => {
      const enemy = s.enemies.find(v => v.id === e.id)!;
      return `<div class="enemy-card ${enemy.hp <= 0 ? 'fallen' : ''} ${this.actingActor === e.id ? 'active-actor' : ''}" data-enemy="${e.id}">${this.portrait(e.id)}<div><strong>${actorName(e.id, d)}</strong><span class="enemy-hp">HP <b>${enemy.hp} / ${e.maxHp}</b>${enemy.markedUntil > s.beat ? ' · ติดตรา' : enemy.hp <= 0 ? ' · กำจัดแล้ว' : ''}</span><span class="hp-track"><span style="width:${enemy.hp / e.maxHp * 100}%"></span></span></div></div>`;
    }).join(''));
    const living = s.heroes.filter(h => h.hp > 0);
    this.set('beat-status', `<span class="beat-chip">${this.busy ? 'กำลังแสดงผล…' : s.outcome === 'active' ? `จังหวะ ${s.beat}` : s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}</span><span class="formation-chip">หน้า ${living.filter(h => d.heroes.find(v => v.id === h.id)!.lane === 'front').length} · หลัง ${living.filter(h => d.heroes.find(v => v.id === h.id)!.lane === 'back').length}</span>`);
    if (intent) {
      const response = this.presentation?.phase === 'enemy';
      const hit = response ? this.presentation?.resolution.stages.enemy.events.find(e => e.type === 'damage') : undefined;
      const canceled = response && this.presentation?.resolution.stages.enemy.events.some(e => e.type === 'cancel');
      const recipient = hit?.targetId ?? intent.targetId;
      const target = s.heroes.find(h => h.id === recipient)!;
      const lethal = !this.presentation && intent.damage >= target.hp + target.barrier;
      const heading = canceled ? 'การตอบโต้ถูกยกเลิกแล้ว' : response ? 'ศัตรูกำลังลงมือในเทิร์นนี้' : this.presentation ? 'ศัตรูรอตอบโต้หลังเทิร์นฮีโร่' : 'ศัตรูจะตอบโต้หลังฮีโร่ลงมือ';
      this.set('intent', `<div class="intent-icon">${icon(intent.kind === 'energy' ? 'bolt' : 'attack')}</div><div class="intent-copy"><p class="eyebrow">${heading}</p><h2>${actorName(intent.sourceId, d)} <span>→</span> ${actorName(recipient, d)}</h2><p>${intentName(intent)} · ${intent.kind === 'energy' ? 'พลังงาน' : 'กายภาพ'} <span class="intent-rule">${intent.kind === 'physical' ? 'แนวหน้ารับก่อน' : 'ถึงแนวหลังได้'}</span></p>${lethal ? `<p class="lethal-warning">⚠ ${actorName(intent.targetId, d)} จะล้มหากรับการโจมตีนี้โดยไม่มีการป้องกัน</p>` : ''}</div><div class="intent-damage"><strong>${canceled ? '—' : hit ? hit.amount : intent.damage}</strong><small>${hit ? 'เสียเลือด' : 'พลังโจมตี'}</small></div>`);
    } else this.set('intent', `<div class="intent-icon">✧</div><div class="intent-copy"><p class="eyebrow">การต่อสู้จบแล้ว</p><h2>${s.outcome === 'victory' ? 'คุณปิดรอยแยกได้แล้ว' : 'ทีมของคุณล้มทั้งหมด'}</h2><p>กดเริ่มใหม่เพื่อลองแผนอื่น</p></div>`);
    this.root.querySelector<HTMLElement>('#forecast-details')!.hidden = s.outcome !== 'active';
    this.set('forecast', plannedIntents(s, d).map(next => `<div><b>จังหวะ ${next.beat} · ${intentName(next)}</b><small>${actorName(next.targetId, d)} · พลังโจมตี ${next.damage} · ${next.kind === 'energy' ? 'พลังงาน' : 'กายภาพ'}</small></div>`).join('') + (s.outcome === 'active' ? '<p>แผนนี้สมมติว่าตัวละครยังอยู่ เปลี่ยนได้เมื่อมีใครล้ม การโจมตีจังหวะปัจจุบันจะไม่ถูกเปลี่ยนหลังใช้สกิล</p>' : ''));
    this.set('formation-info', '<div><strong>แนวหน้า 2 · แนวหลัง 2</strong><p>กายภาพโจมตีแนวหน้าก่อน · พลังงานถึงแนวหลังได้ · สกิลเฉพาะมีคูลดาวน์</p></div>');
    this.set('start-screen', !this.started ? `<div class="start-card"><p class="eyebrow">การต่อสู้แบบวางแผน</p><h2>อ่านอันตราย<br>เลือกเปลี่ยนผลลัพธ์</h2><p>แต่ละจังหวะใช้ฮีโร่ 1 คน ออกคำสั่ง 1 ครั้ง<br>เลือกสกิล แล้วแตะตัวละครในสนาม</p><button data-ui="start" id="start" class="primary" ${!this.scene?.isReady ? 'disabled' : ''}>${this.scene?.isReady ? 'เริ่มต่อสู้ →' : 'กำลังเตรียมสนาม…'}</button></div>` : s.outcome !== 'active' ? `<div class="result-card" role="status"><p class="eyebrow">${s.outcome === 'victory' ? 'ปิดรอยแยกสำเร็จ' : 'ลองวางแผนใหม่'}</p><h2>${s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}</h2><p>ยืนอยู่ ${s.heroes.filter(h => h.hp > 0).length} / ${s.heroes.length} คน · เลือดทีม ${s.heroes.reduce((hp, h) => hp + h.hp, 0)}<br>ใช้ ${s.commands.length} คำสั่ง</p>${s.outcome === 'victory' ? `<strong class="party-result">${s.heroes.every(h => h.hp > 0) ? 'รักษาทีมครบทุกคน' : 'ชนะ แต่เสียสมาชิกในทีม'}</strong>` : ''}<button data-ui="restart" class="primary">เล่นอีกครั้ง ↻</button></div>` : '');
  }

  private renderParty(disabled: boolean): void {
    const s = this.displayState; const d = this.data;
    this.set('party', this.data.heroes.map((h, i) => {
      const hero = s.heroes[i]!; const text = heroText[h.id]!; const selected = h.id === this.heroId;
      const skills = h.actions.filter(a => a !== 'attack');
      return `<button id="hero-${h.id}" data-ui="hero" data-value="${h.id}" data-lane="${h.lane}" class="hero-card ${h.id} ${hero.hp <= 0 ? 'fallen' : ''} ${selected ? 'selected' : ''} ${this.actingActor === h.id ? 'active-actor' : ''}" aria-pressed="${selected}" ${disabled || hero.hp <= 0 ? 'disabled' : ''}><span class="hero-emblem">${this.portrait(h.id)}</span><span class="hero-copy"><span class="hero-class"><b>${h.lane === 'front' ? 'FRONT' : 'BACK'}</b> ${text.role}</span><strong>${text.name}</strong><span class="hero-hp"><span class="hp-amount"><span class="hp-label">HP</span> ${hero.hp} / ${h.maxHp}</span>${hero.barrier ? `<small class="barrier-info">โล่ ${hero.barrier}</small>` : ''}${hero.hp <= 0 ? ' · ล้มแล้ว' : ''}</span><span class="hp-track"><span style="width:${hero.hp / h.maxHp * 100}%"></span></span></span><span class="hero-skills">${skills.map(action => {
        const remaining = Math.max(0, (hero.cooldowns[action] ?? 0) - s.beat);
        const available = targetOptions(s, d, h.id, action).some(t => t.valid);
        const status = hero.hp <= 0 ? 'ล้มแล้ว' : s.outcome !== 'active' ? 'จบแล้ว' : remaining ? `รอ ${remaining} จังหวะ` : available ? 'พร้อมใช้' : action === 'heal' || action === 'prayer' ? 'เลือดเต็ม' : 'โล่เต็ม';
        return `<span class="skill-status ${available ? 'ready' : 'cooling'}" data-skill="${action}">${icon(action)}<span>${d.skills[action].name}<small>${status}</small></span></span>`;
      }).join('')}</span>${selected ? `<span class="selected-tag">${this.presentation?.phase === 'hero' ? 'ลงมือ' : this.presentation ? 'รอ' : 'เลือกอยู่'}</span>` : ''}</button>`;
    }).join(''));
  }

  private renderCommands(disabled: boolean): void {
    const s = this.displayState; const d = this.data;
    const hero = d.heroes.find(h => h.id === this.heroId)!;
    const options = targetOptions(s,d,this.heroId,this.action);
    const noTarget = !disabled && !options.some(t=>t.valid) ? reasonThai(options.find(t=>t.reason)?.reason ?? '') : '';

    this.set('commands', `<h2 class="step-heading"><span>2</span>${heroText[this.heroId]!.role} · เลือกคำสั่ง</h2><div class="actions">${hero.actions.map(action => {
      const text = d.skills[action]; const reason = actionReason(s, d, this.heroId, action);
      return `<div class="action-option"><button id="action-${action}" data-ui="action" data-value="${action}" class="action ${action} ${this.action === action ? 'selected' : ''}" aria-pressed="${this.action === action}" aria-describedby="reason-${action}" ${disabled || reason ? 'disabled' : ''}>${icon(action)}<strong>${text.name}</strong><small>${text.english}</small><span class="skill-value">${action === 'attack' ? `พลัง ${hero.attack}` : action === 'mark' ? `โบนัส +${d.rules.markedBonus}` : action === 'guard' ? `ลด ${d.rules.guardReduction * 100}%` : `พลัง ${text.power}`}</span></button><p id="reason-${action}" class="${reason ? 'unavailable-reason' : ''}">${escapeHtml(reason ? reasonThai(reason) : text.cooldown ? `คูลดาวน์ ${text.cooldown} จังหวะ` : 'ใช้ได้ทุกจังหวะ')}</p></div>`;
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
    this.root.classList.toggle('mobile-layout', this.mobile.matches);
    const dialog = this.root.querySelector<HTMLDialogElement>('#game-info')!;
    const help = this.root.querySelector<HTMLDetailsElement>('.help-panel')!;
    const host = this.root.querySelector(this.portraitLayout.matches ? '#info-host' : '#help-home')!;
    if (help.parentElement !== host) { if (dialog.open) dialog.close(); host.append(help); help.open = this.portraitLayout.matches; }
    this.set('info-skill', `<h3>${d.skills[this.action].name} · ${heroText[this.heroId]!.name}</h3><p>${skillDescription(this.action, this.heroId, d)}</p>`);
    this.renderPhase(); this.renderSituation(); this.renderSelectedHero(); this.renderParty(disabled); this.renderCommands(disabled);
    this.set('rules', `<h3>4 อาชีพ · แนวหน้า 2 / หลัง 2</h3><p>แนวหน้าที่ยังยืนอยู่รับการโจมตีกายภาพก่อน พลังงานโจมตีแนวหลังได้ เมื่อแนวหน้าล้มหมด กายภาพจะถึงแนวหลัง การโจมตีที่ประกาศไว้ไม่เปลี่ยนหลังใช้สกิล</p>${d.heroes.map(hero => `<h3>${heroText[hero.id]!.name} · ${heroText[hero.id]!.role} · ${hero.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'}</h3><dl>${hero.actions.map(action => `<dt>${d.skills[action].name} (${d.skills[action].english})</dt><dd>${skillDescription(action, hero.id, d)}</dd>`).join('')}</dl>`).join('')}<p>แต่ละจังหวะใช้ 1 คำสั่ง สกิลคูลดาวน์ 3 จังหวะที่ใช้ในจังหวะ 1 จะพร้อมอีกครั้งในจังหวะ 4 การรักษาไม่ชุบชีวิต โล่เวทไม่ซ้อนกัน เป้าหมายเสริมคือชนะโดยรักษาทีมครบ 4 คน</p>`);
    const shownMessages = this.presentation?.phase === 'hero' ? this.messages.slice(0, this.presentation.heroLogEnd) : this.messages;
    this.set('event-log', shownMessages.slice(-30).map(message => `<li>${escapeHtml(message)}</li>`).join(''));
    this.set('save-status', this.saved && this.storage ? 'บันทึกบนเครื่องนี้อัตโนมัติ' : 'เล่นได้ แต่บันทึกบนเครื่องนี้ไม่ได้');
    this.scene?.sync({ state: this.displayState, heroId: this.heroId, targetId: null, phase: this.presentation?.phase, activeActorId: this.actingActor, activeTargetId: this.actingTarget });
    this.renderFieldTargets();
    if (focus) this.root.querySelector<HTMLElement>(`#${focus}`)?.focus({ preventScroll: true });
  }
}
