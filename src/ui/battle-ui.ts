import { actionReason, createBattle, plannedIntents, previewCommand, resolveCommand, targetOptions } from '../core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition, Resolution } from '../core/battle/types';
import { loadBattle, saveBattle } from '../core/save/battle-save';
import { browserStorage } from '../platform/browser-storage';
import type { BattleScene } from '../game/scenes/BattleScene';
import { actorName, eventThai, heroText, intentName, reasonThai, skillDescription } from './th';

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export class BattleUI {
  state: BattleState;
  private heroId = 'tracer';
  private action: ActionId = 'attack';
  private targetId: string | null = null;
  private started: boolean;
  private busy = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private storage = browserStorage();
  private saved = true;
  private messages: string[];
  private scene: BattleScene | undefined;
  private readonly mobile = window.matchMedia('(max-width: 600px), (max-width: 960px) and (max-height: 540px)');

  constructor(private readonly root: HTMLElement, private readonly data: EncounterDefinition) {
    const loaded = loadBattle(this.storage, data);
    this.state = loaded.state;
    this.started = loaded.restored;
    if (!this.state.heroes.some(h => h.id === this.heroId && h.hp > 0)) this.heroId = this.state.heroes.find(h => h.hp > 0)?.id ?? this.heroId;
    this.messages = [loaded.restored ? 'กลับมาต่อสู้จากจังหวะที่บันทึกไว้' : 'อ่านการโจมตีของศัตรู แล้วเลือกคำสั่งของคุณ'];
    root.innerHTML = `
      <header class="masthead">
        <a class="brand" href="./" aria-label="หน้าหลัก Asterveil"><span class="brand-mark">✧</span><span>ASTERVEIL<small>RISE BEYOND</small></span></a>
        <div class="encounter-heading"><p class="eyebrow">FATEWEAVE · การต่อสู้ 01</p><h1>ศึกปิดรอยแยก</h1></div>
        <div id="beat-status"></div><button id="restart" data-ui="restart" class="quiet" aria-label="เริ่มการต่อสู้ใหม่">↻</button>
      </header>
      <main>
        <div class="battle-layout">
          <section class="battle-board" aria-label="สถานการณ์การต่อสู้">
            <section class="arena" aria-label="สนามต่อสู้ กดฮีโร่หรือเป้าหมายได้">
              <div id="game"></div><div id="turn-order" aria-label="ลำดับเหตุการณ์"></div>
              <div class="formation-labels" aria-hidden="true"><span class="back-label">แนวหลัง</span><span class="front-label">แนวหน้า</span></div>
              <section id="intent" aria-label="ศัตรูกำลังจะทำอะไร"></section>
              <div id="start-screen"></div>
            </section>
          </section>
          <section class="decision-panel" aria-label="เลือกฮีโร่ คำสั่ง และเป้าหมาย">
            <div id="selected-hero" aria-live="polite"></div>
            <div id="commands" class="step-section"></div>
            <div class="team-section"><h2 class="step-heading"><span>1</span>ทีมของคุณ</h2><div id="party" class="party" aria-label="เลือกฮีโร่"></div></div>
          </section>
          <div id="preview-home"><div id="preview" class="step-section" aria-live="polite"></div></div>
        </div>
        <div class="battle-notes">
          <div id="formation-info" class="formation-info"></div>
          <details id="forecast-details" class="forecast-panel"><summary>ดูแผนโจมตีอีก 2 จังหวะข้างหน้า</summary><div id="forecast" class="forecast"></div></details>
          <details class="field-notes"><summary>อาชีพ · สกิลและแนวหน้า/หลัง</summary><div id="rules"></div></details>
          <details class="combat-history"><summary>บันทึกการต่อสู้</summary><ol id="event-log" role="log" aria-live="polite"></ol></details>
        </div>
        <footer><span>เลือกฮีโร่ → คำสั่ง → เป้าหมาย → ดูผลก่อนยืนยัน</span><span id="save-status"></span></footer>
      </main>
      <dialog id="mobile-preview" aria-labelledby="preview-heading"><div id="mobile-preview-host"></div></dialog>`;
    root.addEventListener('click', e => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-ui]');
      if (!button || button.disabled) return;
      const value = button.dataset.value;
      switch (button.dataset.ui) {
        case 'start': this.started = true; this.render(); break;
        case 'hero': if (value) this.selectHero(value); break;
        case 'action': if (value) { this.action = value as ActionId; this.targetId = null; this.render(); } break;
        case 'target': if (value) this.choose(value); break;
        case 'confirm': this.confirm(); break;
        case 'cancel': this.cancelPreview(); break;
        case 'restart': this.restart(); break;
      }
    });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.targetId) { e.preventDefault(); this.cancelPreview(); }
    });
    const dialog = root.querySelector<HTMLDialogElement>('#mobile-preview')!;
    dialog.addEventListener('cancel', e => { e.preventDefault(); this.cancelPreview(); });
    dialog.addEventListener('click', e => {
      const bounds = dialog.getBoundingClientRect();
      if (e.target === dialog && (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom)) this.cancelPreview();
    });
    this.mobile.addEventListener('change', () => this.render());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.busy) { clearTimeout(this.timer); this.busy = false; this.render(); }
    });
    this.render();
  }

  attach(scene: BattleScene): void { this.scene = scene; this.render(); }

  choose(id: string): void {
    if (!this.started || this.busy || this.state.outcome !== 'active') return;
    const target = targetOptions(this.state, this.data, this.heroId, this.action).find(t => t.id === id);
    if (target?.valid) {
      this.targetId = id;
      this.render();

    } else if (this.data.heroes.some(h => h.id === id)) this.selectHero(id);
  }

  private selectHero(id: string): void {
    if (this.busy || !this.state.heroes.some(h => h.id === id && h.hp > 0)) return;
    this.heroId = id; this.action = 'attack'; this.targetId = null; this.render();
  }

  private proposed(): Command | null {
    return this.targetId ? { beat: this.state.beat, heroId: this.heroId, action: this.action, targetId: this.targetId } : null;
  }

  private cancelPreview(): void {
    const returnFocus = this.targetId ? `target-${this.targetId}` : `action-${this.action}`;
    this.targetId = null;
    this.render();
    this.root.querySelector<HTMLElement>(`#${returnFocus}`)?.focus({ preventScroll: true });
  }

  private syncPreview(disabled: boolean): void {
    const dialog = this.root.querySelector<HTMLDialogElement>('#mobile-preview')!;
    const preview = this.root.querySelector<HTMLElement>('#preview')!;
    const show = !!this.proposed() && !disabled;
    const host = this.root.querySelector(show ? '#mobile-preview-host' : '#preview-home')!;
    if (!show && dialog.open) dialog.close();
    if (preview.parentElement !== host) host.append(preview);
    document.body.classList.toggle('mobile-preview-open', show);
    if (show && !dialog.open) {
      dialog.showModal();
      this.root.querySelector<HTMLElement>('#preview-heading')?.focus({ preventScroll: true });
    }
  }

  private confirm(): void {
    const command = this.proposed();
    if (!this.started || this.busy || !command || this.state.outcome !== 'active') return;
    const before = this.state;
    const result = resolveCommand(before, this.data, command);
    // Commit and persist immediately; animations never decide combat results.
    this.state = result.state; this.targetId = null; this.busy = true;
    this.messages.push(`จังหวะ ${command.beat} · ${actorName(command.heroId, this.data)} ${this.data.skills[command.action].name}`, ...result.events.map(event => eventThai(event, result.state, this.data)));
    this.saved = saveBattle(this.storage, this.state, this.data);
    if (!this.state.heroes.some(h => h.id === this.heroId && h.hp > 0)) this.heroId = this.state.heroes.find(h => h.hp > 0)?.id ?? this.heroId;
    this.action = 'attack'; this.render(); this.scene?.play(result.events);
    if (this.mobile.matches && this.state.outcome !== 'active') this.root.querySelector('.arena')?.scrollIntoView({ block: 'center', behavior: 'auto' });
    this.timer = setTimeout(() => { this.busy = false; this.render(); }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 720);
  }

  private restart(): void {
    clearTimeout(this.timer); this.busy = false; this.state = createBattle(this.data);
    this.heroId = 'tracer'; this.action = 'attack'; this.targetId = null; this.started = true;
    this.messages = ['เริ่มการต่อสู้ใหม่แล้ว'];
    this.saved = saveBattle(this.storage, this.state, this.data); this.render();
    if (this.mobile.matches) this.root.querySelector('.arena')?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  private set(id: string, content: string): void { this.root.querySelector(`#${id}`)!.innerHTML = content; }

  private portrait(id: string): string {
    return `<img src="${import.meta.env.BASE_URL}assets/portraits/${id}.svg" alt="" width="80" height="80">`;
  }

  private renderSelectedHero(): void {
    const def = this.data.heroes.find(h => h.id === this.heroId)!;
    const hero = this.state.heroes.find(h => h.id === this.heroId)!;
    const text = heroText[this.heroId]!;
    this.set('selected-hero', `<div class="selected-portrait ${this.heroId}">${this.portrait(this.heroId)}</div><div class="selected-info"><p class="eyebrow">${text.role} · ${def.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'}</p><h2>${text.name}</h2><div class="selected-hp">เลือด <strong>${hero.hp} / ${def.maxHp}</strong></div><div class="hp-track"><span style="width:${hero.hp / def.maxHp * 100}%"></span></div><p class="selected-resource">${hero.barrier ? `✧ โล่ ${hero.barrier} · ` : ''}พลังโจมตี ${def.attack}</p><p class="hero-specialty">${text.help}</p></div>`);
  }

  private renderTimeline(): void {
    const s = this.state;
    const intents = [s.intent, ...plannedIntents(s, this.data)].filter(i => i !== null);
    this.set('turn-order', `<p>ลำดับเหตุการณ์ <small>เลือก 1 คำสั่งต่อจังหวะ</small></p><ol><li class="timeline-slot hero-slot">${this.portrait(this.heroId)}<small>คุณเลือก</small></li>${intents.map((i, index) => `<li class="timeline-slot ${index === 0 ? 'next-slot' : ''}" aria-label="จังหวะ ${i.beat} ${actorName(i.sourceId, this.data)} โจมตี${actorName(i.targetId, this.data)} พลังโจมตี ${i.damage}">${this.portrait(i.sourceId)}<small>${index === 0 ? 'ถัดไป' : `จังหวะ ${i.beat}`}</small></li>`).join('')}</ol>`);
  }

  private renderSituation(): void {
    const s = this.state; const d = this.data; const intent = s.intent;
    this.renderTimeline();
    const living = s.heroes.filter(h => h.hp > 0);
    this.set('beat-status', `<span class="beat-chip">${this.busy ? 'กำลังแสดงผล…' : s.outcome === 'active' ? `จังหวะ ${s.beat}` : s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}</span><span class="formation-chip">หน้า ${living.filter(h => d.heroes.find(v => v.id === h.id)!.lane === 'front').length} · หลัง ${living.filter(h => d.heroes.find(v => v.id === h.id)!.lane === 'back').length}</span>`);
    if (intent) {
      const target = s.heroes.find(h => h.id === intent.targetId)!;
      const lethal = intent.damage >= target.hp + target.barrier;
      this.set('intent', `<div class="intent-icon">${intent.kind === 'energy' ? '✧' : '⚔'}</div><div class="intent-copy"><p class="eyebrow">ศัตรูจะทำสิ่งนี้หลังคุณยืนยันคำสั่ง</p><h2>${actorName(intent.sourceId, d)} → ${actorName(intent.targetId, d)}</h2><p>${intentName(intent)} · ${intent.kind === 'energy' ? 'พลังงาน' : 'กายภาพ'} <span class="intent-rule">${intent.kind === 'physical' ? 'แนวหน้ารับก่อน' : 'ถึงแนวหลังได้'}</span></p>${lethal ? `<p class="lethal-warning">⚠ ${actorName(intent.targetId, d)} จะล้มหากรับการโจมตีนี้โดยไม่มีการป้องกัน</p>` : ''}</div><div class="intent-damage"><strong>${intent.damage}</strong><small>พลังโจมตี</small></div>`);
    } else this.set('intent', `<div class="intent-icon">✧</div><div class="intent-copy"><p class="eyebrow">การต่อสู้จบแล้ว</p><h2>${s.outcome === 'victory' ? 'คุณปิดรอยแยกได้แล้ว' : 'ทีมของคุณล้มทั้งหมด'}</h2><p>กดเริ่มใหม่เพื่อลองแผนอื่น</p></div>`);
    this.root.querySelector<HTMLElement>('#forecast-details')!.hidden = s.outcome !== 'active';
    this.set('forecast', plannedIntents(s, d).map(next => `<div><b>จังหวะ ${next.beat} · ${intentName(next)}</b><small>${actorName(next.targetId, d)} · พลังโจมตี ${next.damage} · ${next.kind === 'energy' ? 'พลังงาน' : 'กายภาพ'}</small></div>`).join('') + (s.outcome === 'active' ? '<p>แผนนี้สมมติว่าตัวละครยังอยู่ เปลี่ยนได้เมื่อมีใครล้ม การโจมตีจังหวะปัจจุบันจะไม่ถูกเปลี่ยนหลังยืนยัน</p>' : ''));
    this.set('formation-info', '<div><strong>แนวหน้า 2 · แนวหลัง 2</strong><p>กายภาพโจมตีแนวหน้าก่อน · พลังงานถึงแนวหลังได้ · สกิลเฉพาะมีคูลดาวน์</p></div>');
    this.set('start-screen', !this.started ? `<div class="start-card"><p class="eyebrow">การต่อสู้แบบวางแผน</p><h2>อ่านอันตราย<br>เลือกเปลี่ยนผลลัพธ์</h2><p>แต่ละจังหวะใช้ฮีโร่ 1 คน ออกคำสั่ง 1 ครั้ง<br>ดูผลล่วงหน้าได้ ยังไม่มีอะไรเกิดขึ้นจนกดยืนยัน</p><button data-ui="start" id="start" class="primary">เริ่มต่อสู้ →</button></div>` : s.outcome !== 'active' ? `<div class="result-card" role="status"><p class="eyebrow">${s.outcome === 'victory' ? 'ปิดรอยแยกสำเร็จ' : 'ลองวางแผนใหม่'}</p><h2>${s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}</h2><p>ยืนอยู่ ${s.heroes.filter(h => h.hp > 0).length} / ${s.heroes.length} คน · เลือดทีม ${s.heroes.reduce((hp, h) => hp + h.hp, 0)}<br>ใช้ ${s.commands.length} คำสั่ง</p>${s.outcome === 'victory' ? `<strong class="party-result">${s.heroes.every(h => h.hp > 0) ? 'รักษาทีมครบทุกคน' : 'ชนะ แต่เสียสมาชิกในทีม'}</strong>` : ''}<button data-ui="restart" class="primary">เล่นอีกครั้ง ↻</button></div>` : '');
  }

  private renderParty(disabled: boolean): void {
    const s = this.state;
    this.set('party', this.data.heroes.map((h, i) => {
      const hero = s.heroes[i]!; const text = heroText[h.id]!; const selected = h.id === this.heroId;
      return `<button id="hero-${h.id}" data-ui="hero" data-value="${h.id}" data-lane="${h.lane}" class="hero-card ${h.id} ${selected ? 'selected' : ''}" aria-pressed="${selected}" ${disabled || hero.hp <= 0 ? 'disabled' : ''}><span class="hero-emblem" aria-hidden="true">${this.portrait(h.id)}</span><strong>${text.name}</strong><small>${text.help}</small><span class="hp-track"><span style="width:${hero.hp / h.maxHp * 100}%"></span></span><span class="hero-hp"><span class="hp-label">เลือด</span> ${hero.hp} / ${h.maxHp}${hero.barrier ? `<br>โล่ ${hero.barrier}` : ''}${hero.hp <= 0 ? ' · ล้มแล้ว' : ''}</span>${selected ? '<span class="selected-tag">เลือกอยู่</span>' : ''}</button>`;
    }).join(''));
  }

  private renderCommands(disabled: boolean): void {
    const s = this.state; const d = this.data;
    const hero = d.heroes.find(h => h.id === this.heroId)!;
    const allyAction = ['guard', 'ward', 'heal', 'prayer'].includes(this.action);
    const targets = targetOptions(s, d, this.heroId, this.action);
    this.set('commands', `<h2 class="step-heading"><span>2</span>${heroText[this.heroId]!.role} · เลือกคำสั่ง</h2><div class="actions">${hero.actions.map(action => {
      const text = d.skills[action]; const reason = actionReason(s, d, this.heroId, action);
      return `<div class="action-option"><button id="action-${action}" data-ui="action" data-value="${action}" class="action ${action} ${this.action === action ? 'selected' : ''}" aria-pressed="${this.action === action}" aria-describedby="reason-${action}" ${disabled || reason ? 'disabled' : ''}><span aria-hidden="true">${text.icon}</span><strong>${text.name}</strong><small>${text.english}</small></button><p id="reason-${action}" class="${reason ? 'unavailable-reason' : ''}">${escapeHtml(reason ? reasonThai(reason) : text.cooldown ? `คูลดาวน์ ${text.cooldown} จังหวะ` : 'ใช้ได้ทุกจังหวะ')}</p></div>`;
    }).join('')}</div><details class="action-help"><summary>วิธีใช้${d.skills[this.action].name}</summary><p class="action-description">${skillDescription(this.action, this.heroId, d)}</p></details><h2 class="step-heading target-heading"><span>3</span>${this.action === 'prayer' ? 'ฟื้นฟูทีม' : allyAction ? 'เลือกเพื่อน' : 'เลือกศัตรู'}</h2><div class="targets ${allyAction ? 'ally-targets' : ''}">${targets.map(t => {
      const enemy = s.enemies.find(e => e.id === t.id); const ally = s.heroes.find(h => h.id === t.id);
      const info = enemy ? `เลือด ${enemy.hp} / ${d.enemies.find(e => e.id === t.id)!.maxHp}${enemy.markedUntil > s.beat ? ' · ติดตรา' : ''}` : ally ? `เลือด ${ally.hp} / ${d.heroes.find(h => h.id === t.id)!.maxHp}${s.intent?.targetId === t.id ? ' · ศัตรูเล็ง' : ''}` : 'ทุกคนที่ยังยืนอยู่';
      return `<div class="target-option"><button id="target-${t.id}" data-ui="target" data-value="${t.id}" aria-pressed="${this.targetId === t.id}" aria-describedby="target-reason-${t.id}" class="target ${this.targetId === t.id ? 'selected' : ''}" ${disabled || !t.valid ? 'disabled' : ''}><strong>${actorName(t.id, d)}</strong><small>${info}</small></button><small id="target-reason-${t.id}" class="target-reason">${escapeHtml(reasonThai(t.reason))}</small></div>`;
    }).join('')}</div>`);
  }

  private renderPreview(result: Resolution, command: Command, disabled: boolean): void {
    const before = this.state; const after = result.state; const d = this.data;
    const playerEvents = result.events.filter(event => ['mark', 'guard', 'heal', 'barrier'].includes(event.type) || (event.type === 'damage' && d.heroes.some(h => h.id === event.sourceId)) || (event.type === 'down' && d.enemies.some(e => e.id === event.targetId)));
    const responseEvents = result.events.filter(event => !playerEvents.includes(event));
    const fallen = before.heroes.filter(h => h.hp > 0 && after.heroes.find(next => next.id === h.id)!.hp === 0);
    const changes = [
      ...before.heroes.map(h => { const next = after.heroes.find(n => n.id === h.id)!; return { id: h.id, hp: h.hp, nextHp: next.hp, barrier: h.barrier, nextBarrier: next.barrier, ally: true }; }),
      ...before.enemies.map(e => { const next = after.enemies.find(n => n.id === e.id)!; return { id: e.id, hp: e.hp, nextHp: next.hp, barrier: 0, nextBarrier: 0, ally: false }; }),
    ].filter(c => c.hp !== c.nextHp || c.barrier !== c.nextBarrier);
    const eventsHtml = (events: Resolution['events']) => events.map(event => `<li>${escapeHtml(eventThai(event, after, d))}</li>`).join('');
    const next = after.intent;
    this.set('preview', `<div class="preview-header"><h2 id="preview-heading" class="step-heading" tabindex="-1"><span>4</span>ดูผลก่อนกดยืนยัน</h2><button class="sheet-close quiet" data-ui="cancel" aria-label="กลับไปเลือกคำสั่ง">✕</button></div><div class="preview-content"><div class="chosen-command">${actorName(command.heroId, d)} · ${this.data.skills[command.action].name} → ${actorName(command.targetId, d)}</div>${fallen.length ? `<p class="lethal-warning">⚠ ${fallen.map(h => actorName(h.id, d)).join(', ')} จะล้มถ้าใช้คำสั่งนี้</p>` : ''}<div class="outcome-group player-outcome"><h3>คำสั่งของคุณ</h3><ul>${eventsHtml(playerEvents)}</ul></div><div class="outcome-group enemy-outcome"><h3>ศัตรูและผลต่อทีม</h3><ul>${eventsHtml(responseEvents)}</ul></div><div class="predictions">${changes.map(c => `<div class="prediction-row ${c.ally && c.hp > c.nextHp ? 'health-loss' : ''}"><span>${actorName(c.id, d)}</span><b>เลือด ${c.hp} → ${c.nextHp}${c.barrier !== c.nextBarrier ? `<small>โล่ ${c.barrier} → ${c.nextBarrier}</small>` : ''}</b></div>`).join('')}</div>${after.outcome !== 'active' ? `<p class="predicted-outcome">ผลที่คาด: ${after.outcome === 'victory' ? 'ชนะ' : 'แพ้'}</p>` : ''}${next ? `<p class="next-intent">จังหวะถัดไป: ${intentName(next)} → ${actorName(next.targetId, d)} · พลังโจมตี ${next.damage}</p>` : ''}</div><div class="preview-footer"><div class="confirmation"><button id="confirm" data-ui="confirm" class="primary" ${disabled ? 'disabled' : ''}>ยืนยันคำสั่งนี้ →</button><button id="cancel" data-ui="cancel" class="quiet">ยกเลิก</button></div><p class="confirmation-note">${this.mobile.matches ? 'เลื่อนอ่านผลได้ · ยกเลิกเพื่อเปลี่ยนคำสั่ง' : 'เปลี่ยนใจได้ก่อนยืนยัน · กด Esc เพื่อยกเลิก'}</p></div>`);
  }

  private render(): void {
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
    const s = this.state; const d = this.data; const disabled = !this.started || this.busy || s.outcome !== 'active';
    this.root.classList.toggle('mobile-layout', this.mobile.matches);
    this.renderSituation(); this.renderSelectedHero(); this.renderParty(disabled); this.renderCommands(disabled);
    const command = this.proposed();
    if (command && s.outcome === 'active') this.renderPreview(previewCommand(s, d, command), command, disabled);
    else this.set('preview', `<h2 class="step-heading"><span>4</span>ดูผลก่อนกดยืนยัน</h2><div class="preview-empty"><span aria-hidden="true">✧</span><h3>${this.busy ? 'กำลังแสดงผล…' : s.outcome !== 'active' ? 'การต่อสู้จบแล้ว' : !this.started ? 'กดเริ่มต่อสู้ก่อน' : 'เลือกเป้าหมายเพื่อดูผล'}</h3><p>${s.outcome !== 'active' ? 'กดเริ่มใหม่เพื่อลองแผนอื่น' : 'คุณจะเห็นทั้งคำสั่งของตัวเองและการตอบโต้ของศัตรู ยังไม่มีอะไรเกิดขึ้นจนกดยืนยัน'}</p></div>`);
    this.set('rules', `<h3>4 อาชีพ · แนวหน้า 2 / หลัง 2</h3><p>แนวหน้าที่ยังยืนอยู่รับการโจมตีกายภาพก่อน พลังงานโจมตีแนวหลังได้ เมื่อแนวหน้าล้มหมด กายภาพจะถึงแนวหลัง การโจมตีที่ประกาศไว้ไม่เปลี่ยนหลังยืนยัน</p>${d.heroes.map(hero => `<h3>${heroText[hero.id]!.name} · ${heroText[hero.id]!.role} · ${hero.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'}</h3><dl>${hero.actions.map(action => `<dt>${d.skills[action].name} (${d.skills[action].english})</dt><dd>${skillDescription(action, hero.id, d)}</dd>`).join('')}</dl>`).join('')}<p>แต่ละจังหวะใช้ 1 คำสั่ง สกิลคูลดาวน์ 3 จังหวะที่ใช้ในจังหวะ 1 จะพร้อมอีกครั้งในจังหวะ 4 การรักษาไม่ชุบชีวิต โล่เวทไม่ซ้อนกัน เป้าหมายเสริมคือชนะโดยรักษาทีมครบ 4 คน</p>`);
    this.set('event-log', this.messages.slice(-30).map(message => `<li>${escapeHtml(message)}</li>`).join(''));
    this.set('save-status', this.saved && this.storage ? 'บันทึกบนเครื่องนี้อัตโนมัติ' : 'เล่นได้ แต่บันทึกบนเครื่องนี้ไม่ได้');
    this.scene?.sync({ state: s, heroId: this.heroId, targetId: this.targetId });
    this.syncPreview(disabled);
    if (focus) this.root.querySelector<HTMLElement>(`#${focus}`)?.focus({ preventScroll: true });
  }
}
