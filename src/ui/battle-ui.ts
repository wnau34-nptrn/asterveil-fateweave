import { actionReason, createBattle, plannedIntents, previewCommand, resolveCommand, targetOptions } from '../core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition } from '../core/battle/types';
import { loadBattle, saveBattle } from '../core/save/battle-save';
import { browserStorage } from '../platform/browser-storage';
import type { BattleScene } from '../game/scenes/BattleScene';

const actions: readonly ActionId[] = ['attack', 'guard', 'mark', 'redirect'];
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
  constructor(private readonly root: HTMLElement, private readonly data: EncounterDefinition) {
    const loaded = loadBattle(this.storage, data);
    this.state = loaded.state; this.started = loaded.restored;
    if (!this.state.heroes.some(h => h.id === this.heroId && h.hp > 0)) this.heroId = this.state.heroes.find(h => h.hp > 0)?.id ?? this.heroId;
    this.messages = [loaded.restored ? 'Local encounter restored from verified command replay.' : 'The veil gathers. Choose your first move.'];
    root.innerHTML = `
      <header class="masthead"><a class="brand" href="./" aria-label="Asterveil home"><span class="brand-mark">✧</span><span>ASTERVEIL<small>RISE BEYOND</small></span></a><span class="build-tag">FATEWEAVE · COMBAT PROTOTYPE</span><button id="restart" data-ui="restart" class="quiet">↻ Restart</button></header>
      <main><div class="encounter-heading"><div><p class="eyebrow">ENCOUNTER 01 / FLOATING RUINS</p><h1>${data.name}</h1></div><div id="beat-status"></div></div>
      <section id="intent" aria-label="Enemy intent"></section>
      <section id="forecast" class="forecast" aria-label="Upcoming enemy threats"></section>
      <section class="arena" aria-label="Interactive battle arena"><div id="game"></div><div id="start-screen"></div><span class="arena-note">ORIGINAL PLACEHOLDER VISUALS</span></section>
      <section id="party" class="party" aria-label="Select a hero"></section>
      <section class="command-panel"><div id="commands"></div><div id="preview" aria-live="polite"></div></section>
      <details class="field-notes"><summary>Encounter rules & combat log</summary><div class="notes-grid"><div id="rules"></div><div><h3>Combat log</h3><ol id="event-log" role="log" aria-live="polite"></ol></div></div></details>
      <footer><span>Read the danger. Weave a different outcome.</span><span id="save-status"></span></footer></main>`;
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
        case 'cancel': this.targetId = null; this.render(); break;
        case 'restart': this.restart(); break;
      }
    });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') { this.targetId = null; this.render(); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.busy) { clearTimeout(this.timer); this.busy = false; this.render(); }
    });
    this.render();
  }
  attach(scene: BattleScene): void { this.scene = scene; this.render(); }
  choose(id: string): void {
    if (!this.started || this.busy || this.state.outcome !== 'active') return;
    const target = targetOptions(this.state, this.data, this.heroId, this.action).find(t => t.id === id);
    if (target?.valid) { this.targetId = id; this.render(); }
    else if (this.data.heroes.some(h => h.id === id)) this.selectHero(id);
  }
  private selectHero(id: string): void {
    if (this.busy || !this.state.heroes.some(h => h.id === id && h.hp > 0)) return;
    this.heroId = id; this.action = 'attack'; this.targetId = null; this.render();
  }
  private proposed(): Command | null {
    return this.targetId ? { beat: this.state.beat, heroId: this.heroId, action: this.action, targetId: this.targetId } : null;
  }
  private confirm(): void {
    const command = this.proposed();
    if (!this.started || this.busy || !command || this.state.outcome !== 'active') return;
    const result = resolveCommand(this.state, this.data, command);
    // Commit and persist immediately. Animation completion cannot change outcome.
    this.state = result.state; this.targetId = null; this.busy = true;
    this.messages.push(`Beat ${command.beat} · ${command.action.toUpperCase()}`, ...result.events.map(e => e.text));
    this.saved = saveBattle(this.storage, this.state, this.data);
    if (!this.state.heroes.some(h => h.id === this.heroId && h.hp > 0)) this.heroId = this.state.heroes.find(h => h.hp > 0)?.id ?? this.heroId;
    this.action = 'attack'; this.render(); this.scene?.play(result.events);
    this.timer = setTimeout(() => { this.busy = false; this.render(); }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 720);
  }
  private restart(): void {
    clearTimeout(this.timer); this.busy = false; this.state = createBattle(this.data);
    this.heroId = 'tracer'; this.action = 'attack'; this.targetId = null; this.started = true;
    this.messages = ['A new encounter begins.'];
    this.saved = saveBattle(this.storage, this.state, this.data); this.render();
  }
  private set(id: string, content: string): void { this.root.querySelector(`#${id}`)!.innerHTML = content; }
  private render(): void {
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
    const s = this.state; const d = this.data; const disabled = !this.started || this.busy || s.outcome !== 'active';
    this.set('beat-status', `<span class="beat-chip">${this.busy ? 'RESOLVING' : s.outcome === 'active' ? `BEAT ${String(s.beat).padStart(2, '0')}` : s.outcome.toUpperCase()}</span><span class="counter-chip">✦ COUNTER <strong>${s.counter}</strong> / ${d.rules.counterCap}</span>`);
    const intent = s.intent;
    const intendedTarget = s.heroes.find(h => h.id === intent?.targetId);
    const lethal = intent && intendedTarget && intent.damage >= intendedTarget.hp + intendedTarget.barrier;
    this.set('intent', intent ? `<div class="intent-icon">${intent.kind === 'energy' ? '✧' : '⚔'}</div><div><p class="eyebrow">INCOMING ENEMY INTENT</p><strong>${d.enemies.find(e => e.id === intent.sourceId)!.name} · ${intent.name}</strong><p>Targets <b>${d.heroes.find(h => h.id === intent.targetId)!.name}</b> · <b>${intent.damage} damage</b> · ${intent.kind}</p></div><span class="intent-rule ${intent.redirectable ? 'weavable' : ''}">${intent.redirectable ? 'REDIRECTABLE' : 'CANNOT REDIRECT'}</span>` : `<div class="intent-icon">✧</div><div><p class="eyebrow">ENCOUNTER COMPLETE</p><strong>${s.outcome === 'victory' ? 'The rift falls silent.' : 'The veil has prevailed.'}</strong><p>Restart to try another strategy.</p></div>`);
    if (lethal) this.root.querySelector('#intent > div:nth-child(2)')?.insertAdjacentHTML('beforeend', `<p class="lethal-warning">${d.heroes.find(h => h.id === intent.targetId)!.name} will fall to this hit without protection.</p>`);
    this.set('forecast', s.outcome === 'active' ? `<span class="forecast-label">NEXT PLANNED BEATS<small>Assuming actors survive</small></span>${plannedIntents(s, d).map(next => `<span class="forecast-beat"><b>${next.beat} · ${next.name}</b><small>${d.heroes.find(h => h.id === next.targetId)!.name} · ${next.damage} damage · ${next.kind}</small></span>`).join('')}` : '');
    this.set('start-screen', !this.started ? `<div class="start-card"><p class="eyebrow">TACTICAL REACTION COMBAT</p><h2>One choice.<br>A different fate.</h2><p>Three heroes. One action per beat.<br>Inspect the intent, preview, then confirm.<br>Challenge: keep all three heroes standing.<br>No timer. Take your time.</p><button data-ui="start" id="start" class="primary">Start encounter <span>→</span></button></div>` : s.outcome !== 'active' ? `<div class="result-card" role="status"><p class="eyebrow">${s.outcome === 'victory' ? 'RIFT CLEARED' : 'PARTY FALLEN'}</p><h2>${s.outcome === 'victory' ? 'Victory' : 'Defeat'}</h2><p>${s.heroes.filter(h => h.hp > 0).length} / ${s.heroes.length} heroes standing · ${s.heroes.reduce((hp, h) => hp + h.hp, 0)} party HP<br>${s.commands.length} decisions made.</p>${s.outcome === 'victory' ? `<strong class="party-result">${s.heroes.every(h => h.hp > 0) ? 'PARTY INTACT' : 'COSTLY VICTORY'}</strong>` : ''}<button data-ui="restart" class="primary">Play again ↻</button></div>` : '');
    this.set('party', d.heroes.map((h, i) => {
      const hero = s.heroes[i]!; const selected = h.id === this.heroId;
      return `<button id="hero-${h.id}" data-ui="hero" data-value="${h.id}" class="hero-card ${h.id} ${selected ? 'selected' : ''}" aria-pressed="${selected}" ${disabled || hero.hp <= 0 ? 'disabled' : ''}><span class="hero-emblem">${i === 0 ? '♜' : i === 1 ? '➶' : '✧'}</span><span class="hero-details"><span class="hero-name">${h.name}<small>${h.role}</small></span><span class="hp-track"><span style="width:${hero.hp / h.maxHp * 100}%"></span></span><span class="hero-hp">${hero.hp} / ${h.maxHp} HP${hero.barrier ? ` · ${hero.barrier} barrier` : ''}${hero.hp <= 0 ? ' · DOWN' : ''}</span></span>${selected ? '<span class="selected-tag">SELECTED</span>' : ''}</button>`;
    }).join(''));
    const descriptions: Record<ActionId, string> = {
      attack: `Deal ${d.heroes.find(h => h.id === this.heroId)!.attack} damage.${d.heroes.find(h => h.id === this.heroId)!.empoweredByStatuses ? ` +${d.rules.tracerBonus} against Marked/Exposed; consumes status.` : ''}`,
      guard: `Intercept the announced hit. Reduce damage ${d.rules.guardReduction * 100}%. Survive to gain 1 Counter.`,
      mark: `Mark an enemy for ${d.rules.markDuration} beats, including this beat. Lyra can follow with ${d.heroes.find(h => h.empoweredByStatuses)!.attack + d.rules.tracerBonus} damage, or Eira can Redirect an energy hit onto it.`,
      redirect: `Spend ${d.rules.redirectCost} Counter. Energy only. Target a marked enemy or a charged Crystal.`,
    };
    const targets = targetOptions(s, d, this.heroId, this.action);
    this.set('commands', `<div class="section-label"><span>01 / CHOOSE AN ACTION</span><strong>${d.heroes.find(h => h.id === this.heroId)!.name}</strong></div><div class="actions">${actions.map(a => {
      const reason = actionReason(s, d, this.heroId, a);
      return `<div class="action-option"><button id="action-${a}" data-ui="action" data-value="${a}" class="action ${this.action === a ? 'selected' : ''}" aria-pressed="${this.action === a}" aria-describedby="reason-${a}" ${disabled || reason ? 'disabled' : ''}>${a.toUpperCase()}</button><small id="reason-${a}">${escapeHtml(reason || (a === 'attack' ? 'Direct damage' : a === 'guard' ? '+1 Counter' : a === 'mark' ? `Next Lyra hit: ${d.heroes.find(h => h.empoweredByStatuses)!.attack + d.rules.tracerBonus}` : `−${d.rules.redirectCost} Counter`))}</small></div>`;
    }).join('')}</div><p class="action-description">${descriptions[this.action]}</p><div class="section-label"><span>02 / SELECT A TARGET</span></div><div class="targets">${targets.map(t => {
      const enemy = s.enemies.find(e => e.id === t.id); const definition = d.enemies.find(e => e.id === t.id);
      return `<div class="target-option"><button id="target-${t.id}" data-ui="target" data-value="${t.id}" aria-pressed="${this.targetId === t.id}" class="target ${this.targetId === t.id ? 'selected' : ''}" ${disabled || !t.valid ? 'disabled' : ''}><span>${t.name}</span><small>${enemy ? `${enemy.hp}/${definition!.maxHp} HP${enemy.markedUntil > s.beat ? ` · MARKED (${enemy.markedUntil - s.beat} beats)` : ''}${enemy.exposedUntil > s.beat ? ' · EXPOSED' : ''}` : t.id === d.crystal.id ? `${s.crystal.charges} charge · +${d.crystal.barrier} party barrier` : `${s.heroes.find(h => h.id === t.id)!.hp} HP`}</small></button>${t.reason ? `<small class="target-reason">${escapeHtml(t.reason)}</small>` : ''}</div>`;
    }).join('')}</div><p class="crystal-rule">✧ Crystal: Redirect an energy hit here to absorb it and grant ${d.crystal.barrier} barrier to each living hero. ${s.crystal.charges}/${d.crystal.charges} charge remaining.</p>`);
    const command = this.proposed();
    if (command && s.outcome === 'active') {
      const result = previewCommand(s, d, command);
      const fallen = s.heroes.filter(h => h.hp > 0 && result.state.heroes.find(next => next.id === h.id)!.hp === 0);
      const nextIntent = result.state.intent;
      const changes = [...s.heroes.map((h, i) => ({ name: d.heroes[i]!.name, before: h.hp, after: result.state.heroes[i]!.hp })), ...s.enemies.map((e, i) => ({ name: d.enemies[i]!.name, before: e.hp, after: result.state.enemies[i]!.hp }))].filter(v => v.before !== v.after);
      this.set('preview', `<div class="section-label"><span>03 / REVIEW THE OUTCOME</span><span class="preview-tag">DETERMINISTIC</span></div><h3>${this.action.toUpperCase()} → ${targets.find(t => t.id === this.targetId)!.name}</h3>${fallen.length ? `<p class="lethal-warning">${fallen.map(h => d.heroes.find(def => def.id === h.id)!.name).join(', ')} will fall with this choice.</p>` : ''}<ul class="preview-events">${result.events.map(e => `<li>${escapeHtml(e.text)}</li>`).join('')}</ul><div class="predictions">${changes.map(c => `<span>${c.name}<b>${c.before} → ${c.after} HP</b></span>`).join('')}<span>Counter<b>${s.counter} → ${result.state.counter}</b></span></div>${result.state.outcome !== 'active' ? `<p class="predicted-outcome">Predicted ${result.state.outcome.toUpperCase()}</p>` : ''}${nextIntent ? `<p class="next-intent">Next beat: ${nextIntent.name} → ${d.heroes.find(h => h.id === nextIntent.targetId)!.name} · ${nextIntent.damage} damage.</p>` : ''}<div class="confirmation"><button id="confirm" data-ui="confirm" class="primary" ${disabled ? 'disabled' : ''}>Confirm action →</button><button id="cancel" data-ui="cancel" class="quiet">Cancel</button></div>`);
    } else this.set('preview', `<div class="section-label"><span>03 / REVIEW THE OUTCOME</span></div><div class="preview-empty"><span>✧</span><h3>${this.busy ? 'Fate is unfolding…' : s.outcome !== 'active' ? 'Encounter complete' : 'Your next choice matters'}</h3><p>Select a hero, action, and valid target.<br>See both your action and the enemy response before confirming.</p><small>No time limit · Nothing happens until you confirm</small></div>`);
    this.set('rules', `<h3>Field notes</h3><p>One hero acts per beat. The announced enemy event resolves afterward if its source survives. Killing the source cancels that event. Defeated enemies are skipped in future beats; the surviving enemy keeps attacking.</p><p>Guard only protects the announced target. Aegis intercepts, takes 35% damage rounded up, then barrier absorbs. Surviving Guard earns 1 Counter, capped at ${d.rules.counterCap}.</p><p>Marked enemies accept energy Redirect. Redirect consumes Mark and exposes the target through the next beat. Lyra gains +${d.rules.tracerBonus} damage on Marked or Exposed enemies, consuming both statuses.</p><p>Barrier lasts until absorbed. Downed heroes cannot act. No randomness, movement, timers, or automatic commands. Esc cancels a preview.</p>`);
    this.set('event-log', this.messages.slice(-30).map(m => `<li>${escapeHtml(m)}</li>`).join(''));
    this.set('save-status', this.saved && this.storage ? 'LOCAL AUTOSAVE · COMMAND REPLAY' : 'SESSION ONLY · STORAGE UNAVAILABLE');
    this.scene?.sync({ state: s, heroId: this.heroId, targetId: this.targetId });
    if (focus) this.root.querySelector<HTMLElement>(`#${focus}`)?.focus({ preventScroll: true });
  }
}
