import { actionReason, createBattle, plannedIntents, previewCommand, resolveCommand, targetOptions } from '../core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition, Resolution } from '../core/battle/types';
import { loadBattle, saveBattle } from '../core/save/battle-save';
import { browserStorage } from '../platform/browser-storage';
import type { BattleScene } from '../game/scenes/BattleScene';
import { actionText, actorName, eventThai, heroText, intentName, reasonThai } from './th';

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
        <span class="build-tag">FATEWEAVE · ต้นแบบการต่อสู้</span>
        <button id="restart" data-ui="restart" class="quiet">↻ เริ่มใหม่</button>
      </header>
      <main>
        <div class="encounter-heading"><div><p class="eyebrow">การต่อสู้ 01 · ซากลอยฟ้า</p><h1>รอยแยกผลึก</h1></div><div id="beat-status"></div></div>
        <div class="battle-layout">
          <section class="battle-board" aria-label="สถานการณ์การต่อสู้">
            <section id="intent" aria-label="ศัตรูกำลังจะทำอะไร"></section>
            <details id="forecast-details" class="forecast-panel"><summary>ดูแผนโจมตีอีก 2 จังหวะข้างหน้า</summary><div id="forecast" class="forecast"></div></details>
            <section class="arena" aria-label="สนามต่อสู้ กดฮีโร่หรือเป้าหมายได้"><div id="game"></div><div id="start-screen"></div><span class="arena-note">ภาพตัวละครต้นแบบ · กดเพื่อเลือกได้</span></section>
            <div id="crystal-info" class="crystal-info"></div>
            <details class="field-notes"><summary>วิธีเล่น · ติดตราและเบี่ยงพลังคืออะไร?</summary><div id="rules"></div></details>
          </section>
          <section class="decision-panel" aria-label="เลือกคำสั่งและตรวจผล">
            <div class="step-section"><h2 class="step-heading"><span>1</span>เลือกฮีโร่ที่จะลงมือ</h2><div id="party" class="party" aria-label="เลือกฮีโร่"></div></div>
            <div id="commands" class="step-section"></div>
            <div id="preview-home"><div id="preview" class="step-section" aria-live="polite"></div></div>
          </section>
        </div>
        <details class="combat-history"><summary>บันทึกการต่อสู้</summary><ol id="event-log" role="log" aria-live="polite"></ol></details>
        <footer><span>หนึ่งจังหวะ · หนึ่งคำสั่ง · ไม่จำกัดเวลา</span><span id="save-status"></span></footer>
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
      if (!this.mobile.matches && window.matchMedia('(max-width: 1040px)').matches) this.root.querySelector('#preview')?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
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
    const show = this.mobile.matches && !!this.proposed() && !disabled;
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
    this.messages.push(`จังหวะ ${command.beat} · ${actorName(command.heroId, this.data)} ${actionText[command.action].name}`, ...result.events.map(event => eventThai(event, before, result.state, this.data)));
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

  private renderSituation(): void {
    const s = this.state; const d = this.data; const intent = s.intent;
    this.set('beat-status', `<span class="beat-chip">${this.busy ? 'กำลังแสดงผล…' : s.outcome === 'active' ? `จังหวะ ${s.beat}` : s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}</span><span class="counter-chip">✦ แต้มเบี่ยงพลัง <strong>${s.counter}</strong> / ${d.rules.counterCap}<small>สะสมจากการตั้งรับสำเร็จ</small></span>`);
    if (intent) {
      const target = s.heroes.find(h => h.id === intent.targetId)!;
      const lethal = intent.damage >= target.hp + target.barrier;
      this.set('intent', `<div class="intent-icon">${intent.kind === 'energy' ? '✧' : '⚔'}</div><div class="intent-copy"><p class="eyebrow">ศัตรูจะทำสิ่งนี้หลังคุณยืนยันคำสั่ง</p><h2>${actorName(intent.sourceId, d)} → ${actorName(intent.targetId, d)}</h2><p>${intentName(intent)} · ${intent.kind === 'energy' ? 'พลังงาน' : 'กายภาพ'} <span class="intent-rule ${intent.redirectable ? 'weavable' : ''}">${intent.redirectable ? 'เบี่ยงทิศได้' : 'เบี่ยงทิศไม่ได้'}</span></p>${lethal ? `<p class="lethal-warning">⚠ ${actorName(intent.targetId, d)} จะล้มหากรับการโจมตีนี้โดยไม่มีการป้องกัน</p>` : ''}</div><div class="intent-damage"><strong>${intent.damage}</strong><small>พลังโจมตี</small></div>`);
    } else this.set('intent', `<div class="intent-icon">✧</div><div class="intent-copy"><p class="eyebrow">การต่อสู้จบแล้ว</p><h2>${s.outcome === 'victory' ? 'คุณปิดรอยแยกได้แล้ว' : 'ทีมของคุณล้มทั้งหมด'}</h2><p>กดเริ่มใหม่เพื่อลองแผนอื่น</p></div>`);
    this.root.querySelector<HTMLElement>('#forecast-details')!.hidden = s.outcome !== 'active';
    this.set('forecast', plannedIntents(s, d).map(next => `<div><b>จังหวะ ${next.beat} · ${intentName(next)}</b><small>${actorName(next.targetId, d)} · พลังโจมตี ${next.damage} · ${next.kind === 'energy' ? 'พลังงาน' : 'กายภาพ'}</small></div>`).join('') + (s.outcome === 'active' ? '<p>แผนนี้สมมติว่าตัวละครยังอยู่ เปลี่ยนได้เมื่อมีใครล้ม การโจมตีจังหวะปัจจุบันจะไม่ถูกเปลี่ยนหลังยืนยัน</p>' : ''));
    this.set('crystal-info', `<span class="crystal-icon">✧</span><div><strong>ผลึกพลังงาน · ${s.crystal.charges ? `ใช้ได้อีก ${s.crystal.charges} ครั้ง` : 'ใช้ไปแล้ว'}</strong><p>${this.mobile.matches ? `เบี่ยงพลังใส่ผลึก → รับการโจมตีแทนทีม + โล่ ${d.crystal.barrier} ทุกคนที่ยังยืน` : `ไอราเบี่ยงพลังใส่ผลึก → รับการโจมตีแทนทีม → ทุกคนที่ยังยืนอยู่ได้โล่ ${d.crystal.barrier}`}</p></div>`);
    this.set('start-screen', !this.started ? `<div class="start-card"><p class="eyebrow">การต่อสู้แบบวางแผน</p><h2>อ่านอันตราย<br>เลือกเปลี่ยนผลลัพธ์</h2><p>แต่ละจังหวะใช้ฮีโร่ 1 คน ออกคำสั่ง 1 ครั้ง<br>ดูผลล่วงหน้าได้ ยังไม่มีอะไรเกิดขึ้นจนกดยืนยัน</p><button data-ui="start" id="start" class="primary">เริ่มต่อสู้ →</button></div>` : s.outcome !== 'active' ? `<div class="result-card" role="status"><p class="eyebrow">${s.outcome === 'victory' ? 'ปิดรอยแยกสำเร็จ' : 'ลองวางแผนใหม่'}</p><h2>${s.outcome === 'victory' ? 'ชนะแล้ว' : 'แพ้แล้ว'}</h2><p>ยืนอยู่ ${s.heroes.filter(h => h.hp > 0).length} / ${s.heroes.length} คน · เลือดทีม ${s.heroes.reduce((hp, h) => hp + h.hp, 0)}<br>ใช้ ${s.commands.length} คำสั่ง</p>${s.outcome === 'victory' ? `<strong class="party-result">${s.heroes.every(h => h.hp > 0) ? 'รักษาทีมครบทุกคน' : 'ชนะ แต่เสียสมาชิกในทีม'}</strong>` : ''}<button data-ui="restart" class="primary">เล่นอีกครั้ง ↻</button></div>` : '');
  }

  private renderParty(disabled: boolean): void {
    const s = this.state;
    this.set('party', this.data.heroes.map((h, i) => {
      const hero = s.heroes[i]!; const text = heroText[h.id]!; const selected = h.id === this.heroId;
      return `<button id="hero-${h.id}" data-ui="hero" data-value="${h.id}" class="hero-card ${h.id} ${selected ? 'selected' : ''}" aria-pressed="${selected}" ${disabled || hero.hp <= 0 ? 'disabled' : ''}><span class="hero-emblem" aria-hidden="true">${text.icon}</span><strong>${text.name}</strong><small>${text.help}</small><span class="hp-track"><span style="width:${hero.hp / h.maxHp * 100}%"></span></span><span class="hero-hp">เลือด ${hero.hp} / ${h.maxHp}${hero.barrier ? `<br>โล่ ${hero.barrier}` : ''}${hero.hp <= 0 ? ' · ล้มแล้ว' : ''}</span>${selected ? '<span class="selected-tag">เลือกอยู่</span>' : ''}</button>`;
    }).join(''));
  }

  private renderCommands(disabled: boolean): void {
    const s = this.state; const d = this.data;
    const hero = d.heroes.find(h => h.id === this.heroId)!;
    const boostedAttack = d.heroes.find(h => h.empoweredByStatuses)!.attack + d.rules.tracerBonus;
    const hints: Record<ActionId, string> = {
      attack: `โจมตีศัตรู ${hero.attack}${hero.empoweredByStatuses ? ` · ติดตรา/เปิดช่อง ${boostedAttack}` : ''}`,
      guard: `ลดความเสียหาย ${d.rules.guardReduction * 100}% · สะสมแต้ม`,
      mark: `เตรียมให้ไลราโจมตี ${boostedAttack} หรือใช้เบี่ยงพลัง`,
      redirect: `ใช้ ${d.rules.redirectCost} แต้ม · พลังงานเท่านั้น`,
    };
    const descriptions: Record<ActionId, string> = {
      attack: `เลือกศัตรูที่จะโจมตี หากกำจัดตัวที่กำลังโจมตีได้ จะหยุดการโจมตีของมันในจังหวะนี้${hero.empoweredByStatuses ? ` เป้าหมายที่ติดตราหรือเปิดช่องจะโดน ${boostedAttack} และสถานะถูกใช้หมด` : ''}`,
      guard: `เลือกคนที่ศัตรูกำลังเล็ง เอกิสจะรับแทนและลดความเสียหาย ${d.rules.guardReduction * 100}% หากเอกิสยังยืนอยู่จะได้ 1 แต้มเบี่ยงพลัง (สูงสุด ${d.rules.counterCap})`,
      mark: `จังหวะนี้ยังไม่ทำดาเมจ แต่ติดตราไว้ ${d.rules.markDuration} จังหวะรวมจังหวะนี้ ไลราโจมตีศัตรูที่ติดตราได้ ${boostedAttack} หรือให้ไอราเบี่ยงพลังงานใส่มันก็ได้`,
      redirect: `ส่งการโจมตีพลังงานที่กำลังมาไปยังศัตรูติดตราหรือผลึก ต้องใช้ ${d.rules.redirectCost} แต้มเบี่ยงพลัง การโจมตีกายภาพใช้คำสั่งนี้ไม่ได้`,
    };
    const targetHeading: Record<ActionId, string> = { attack: 'เลือกศัตรูที่จะโจมตี', guard: 'เลือกคนที่จะปกป้อง', mark: 'เลือกศัตรูที่จะติดตรา', redirect: 'เลือกว่าจะส่งพลังไปที่ไหน' };
    const targets = targetOptions(s, d, this.heroId, this.action);
    this.set('commands', `<h2 class="step-heading"><span>2</span>เลือกคำสั่งของ${actorName(this.heroId, d)}</h2><div class="actions">${hero.actions.map(action => {
      const text = actionText[action]; const reason = actionReason(s, d, this.heroId, action);
      return `<div class="action-option ${this.action === action ? 'current-action' : ''}"><button id="action-${action}" data-ui="action" data-value="${action}" class="action ${this.action === action ? 'selected' : ''}" aria-pressed="${this.action === action}" aria-describedby="reason-${action}" ${disabled || reason ? 'disabled' : ''}><span aria-hidden="true">${text.icon}</span><strong>${text.name}</strong><small>${text.english}</small></button><p id="reason-${action}" class="${reason ? 'unavailable-reason' : ''}">${escapeHtml(reason ? reasonThai(reason, d) : hints[action])}</p></div>`;
    }).join('')}</div><details class="action-help" ${this.mobile.matches ? '' : 'open'}><summary>วิธีใช้${actionText[this.action].name}</summary><p class="action-description">${descriptions[this.action]}</p></details><h2 class="step-heading target-heading"><span>3</span>${targetHeading[this.action]}</h2><div class="targets ${this.action === 'guard' ? 'guard-targets' : ''}">${targets.map(t => {
      const enemy = s.enemies.find(e => e.id === t.id); const definition = d.enemies.find(e => e.id === t.id);
      const ally = s.heroes.find(h => h.id === t.id);
      const info = enemy ? `เลือด ${enemy.hp} / ${definition!.maxHp}${enemy.markedUntil > s.beat ? ` · ติดตราอีก ${enemy.markedUntil - s.beat} จังหวะ` : ''}${enemy.exposedUntil > s.beat ? ' · เปิดช่องให้ไลรา' : ''}` : t.id === d.crystal.id ? `${s.crystal.charges} ครั้ง · ให้โล่ ${d.crystal.barrier} ทุกคน` : `เลือด ${ally!.hp}${s.intent?.targetId === t.id ? ' · ศัตรูเล็งคนนี้' : ''}`;
      return `<div class="target-option ${t.id === d.crystal.id ? 'crystal-target' : ''}"><button id="target-${t.id}" data-ui="target" data-value="${t.id}" aria-pressed="${this.targetId === t.id}" aria-describedby="target-reason-${t.id}" class="target ${this.targetId === t.id ? 'selected' : ''}" ${disabled || !t.valid ? 'disabled' : ''}><strong>${actorName(t.id, d)}</strong><small>${info}</small></button><small id="target-reason-${t.id}" class="target-reason">${escapeHtml(this.mobile.matches && t.reason === 'Guard must protect the announced target.' ? 'ศัตรูไม่ได้เล็งคนนี้' : reasonThai(t.reason, d))}</small></div>`;
    }).join('')}</div>`);
  }

  private renderPreview(result: Resolution, command: Command, disabled: boolean): void {
    const before = this.state; const after = result.state; const d = this.data;
    const playerEvents = result.events.filter(event => event.type === 'mark' || event.type === 'redirect' || (event.type === 'guard' && event.sourceId) || (event.type === 'damage' && d.heroes.some(h => h.id === event.sourceId)) || (event.type === 'down' && command.action === 'attack' && event.targetId === command.targetId));
    const responseEvents = result.events.filter(event => !playerEvents.includes(event));
    const fallen = before.heroes.filter(h => h.hp > 0 && after.heroes.find(next => next.id === h.id)!.hp === 0);
    const changes = [
      ...before.heroes.map(h => { const next = after.heroes.find(n => n.id === h.id)!; return { id: h.id, hp: h.hp, nextHp: next.hp, barrier: h.barrier, nextBarrier: next.barrier, ally: true }; }),
      ...before.enemies.map(e => { const next = after.enemies.find(n => n.id === e.id)!; return { id: e.id, hp: e.hp, nextHp: next.hp, barrier: 0, nextBarrier: 0, ally: false }; }),
    ].filter(c => c.hp !== c.nextHp || c.barrier !== c.nextBarrier);
    const eventsHtml = (events: Resolution['events']) => events.map(event => `<li>${escapeHtml(eventThai(event, before, after, d))}</li>`).join('');
    const next = after.intent;
    this.set('preview', `<div class="preview-header"><h2 id="preview-heading" class="step-heading" tabindex="-1"><span>4</span>ดูผลก่อนกดยืนยัน</h2><button class="sheet-close quiet" data-ui="cancel" aria-label="กลับไปเลือกคำสั่ง">✕</button></div><div class="preview-content"><div class="chosen-command">${actorName(command.heroId, d)} · ${actionText[command.action].name} → ${actorName(command.targetId, d)}</div>${fallen.length ? `<p class="lethal-warning">⚠ ${fallen.map(h => actorName(h.id, d)).join(', ')} จะล้มถ้าใช้คำสั่งนี้</p>` : ''}<div class="outcome-group player-outcome"><h3>คำสั่งของคุณ</h3><ul>${eventsHtml(playerEvents)}</ul></div><div class="outcome-group enemy-outcome"><h3>ศัตรูและผลต่อทีม</h3><ul>${eventsHtml(responseEvents)}</ul></div><div class="predictions">${changes.map(c => `<div class="prediction-row ${c.ally && c.hp > c.nextHp ? 'health-loss' : ''}"><span>${actorName(c.id, d)}</span><b>เลือด ${c.hp} → ${c.nextHp}${c.barrier !== c.nextBarrier ? `<small>โล่ ${c.barrier} → ${c.nextBarrier}</small>` : ''}</b></div>`).join('')}${before.counter !== after.counter ? `<div class="prediction-row"><span>แต้มเบี่ยงพลัง</span><b>${before.counter} → ${after.counter}</b></div>` : ''}${before.crystal.charges !== after.crystal.charges ? `<div class="prediction-row"><span>จำนวนครั้งใช้ผลึก</span><b>${before.crystal.charges} → ${after.crystal.charges}</b></div>` : ''}</div>${after.outcome !== 'active' ? `<p class="predicted-outcome">ผลที่คาด: ${after.outcome === 'victory' ? 'ชนะ' : 'แพ้'}</p>` : ''}${next ? `<p class="next-intent">จังหวะถัดไป: ${intentName(next)} → ${actorName(next.targetId, d)} · พลังโจมตี ${next.damage}</p>` : ''}</div><div class="preview-footer"><div class="confirmation"><button id="confirm" data-ui="confirm" class="primary" ${disabled ? 'disabled' : ''}>ยืนยันคำสั่งนี้ →</button><button id="cancel" data-ui="cancel" class="quiet">ยกเลิก</button></div><p class="confirmation-note">${this.mobile.matches ? 'เลื่อนอ่านผลได้ · ยกเลิกเพื่อเปลี่ยนคำสั่ง' : 'เปลี่ยนใจได้ก่อนยืนยัน · กด Esc เพื่อยกเลิก'}</p></div>`);
  }

  private render(): void {
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
    const s = this.state; const d = this.data; const disabled = !this.started || this.busy || s.outcome !== 'active';
    this.root.classList.toggle('mobile-layout', this.mobile.matches);
    this.renderSituation(); this.renderParty(disabled); this.renderCommands(disabled);
    const command = this.proposed();
    if (command && s.outcome === 'active') this.renderPreview(previewCommand(s, d, command), command, disabled);
    else this.set('preview', `<h2 class="step-heading"><span>4</span>ดูผลก่อนกดยืนยัน</h2><div class="preview-empty"><span aria-hidden="true">✧</span><h3>${this.busy ? 'กำลังแสดงผล…' : s.outcome !== 'active' ? 'การต่อสู้จบแล้ว' : !this.started ? 'กดเริ่มต่อสู้ก่อน' : 'เลือกเป้าหมายเพื่อดูผล'}</h3><p>${s.outcome !== 'active' ? 'กดเริ่มใหม่เพื่อลองแผนอื่น' : 'คุณจะเห็นทั้งคำสั่งของตัวเองและการตอบโต้ของศัตรู ยังไม่มีอะไรเกิดขึ้นจนกดยืนยัน'}</p></div>`);
    this.set('rules', `<h3>คำสั่งหลัก</h3><dl><dt>โจมตี (Attack)</dt><dd>ทำดาเมจทันที กำจัดผู้โจมตีได้ก็หยุดการโจมตีของมันในจังหวะนี้</dd><dt>ตั้งรับ (Guard) · เอกิส</dt><dd>รับแทนคนที่ศัตรูเล็ง ลดความเสียหาย ${d.rules.guardReduction * 100}% ปัดดาเมจที่เหลือขึ้น หากยังยืนอยู่ได้ 1 แต้มเบี่ยงพลัง เก็บได้ ${d.rules.counterCap} แต้ม</dd><dt>ติดตรา (Mark) · ไลรา</dt><dd>ยังไม่ทำดาเมจ แต่ติดตรา ${d.rules.markDuration} จังหวะรวมจังหวะนี้ เพื่อให้ไลราโจมตีแรงขึ้น ${d.rules.tracerBonus} หรือเปิดให้ไอราเบี่ยงพลังใส่ศัตรูตัวนั้น</dd><dt>เบี่ยงพลัง (Redirect) · ไอรา</dt><dd>ใช้ ${d.rules.redirectCost} แต้ม ส่งการโจมตีพลังงานไปที่ศัตรูติดตราหรือผลึก ศัตรูรับดาเมจเต็มและเปิดช่องให้ไลราโจมตีแรงในจังหวะถัดไป</dd><dt>ผลึกและโล่</dt><dd>ผลึกใช้ ${d.crystal.charges} ครั้ง รับพลังงานทั้งหมดแล้วให้โล่ ${d.crystal.barrier} แก่ทุกคนที่ยังยืน โล่รับดาเมจก่อนเลือด ไม่เพิ่มเลือดและไม่ซ้อนกัน</dd></dl><p>แต่ละจังหวะใช้ 1 คำสั่ง ไม่มีเวลานับถอยหลัง ศัตรูที่ถูกกำจัดจะถูกข้ามในจังหวะต่อไป ตัวที่เหลือยังโจมตีต่อได้ เป้าหมายเสริมคือชนะโดยรักษาทีมครบ 3 คน</p>`);
    this.set('event-log', this.messages.slice(-30).map(message => `<li>${escapeHtml(message)}</li>`).join(''));
    this.set('save-status', this.saved && this.storage ? 'บันทึกบนเครื่องนี้อัตโนมัติ' : 'เล่นได้ แต่บันทึกบนเครื่องนี้ไม่ได้');
    this.scene?.sync({ state: s, heroId: this.heroId, targetId: this.targetId });
    this.syncPreview(disabled);
    if (focus) this.root.querySelector<HTMLElement>(`#${focus}`)?.focus({ preventScroll: true });
  }
}
