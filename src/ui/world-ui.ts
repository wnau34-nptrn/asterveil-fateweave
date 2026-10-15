import type { HeroDefinition } from '../core/battle/types';
import type { Direction, ExpeditionState, MapDefinition, Point } from '../core/world/types';
import { atCamp, canOpenChest, canRest, canRevive, chestAt, dismissReason, encounterChance, isRevealed, rosterIds, starred, tileAt, upgradeCost, upgradeReason, zoneOf } from '../core/world/world';
import { PARTY_SLOTS, RESERVE_SLOTS } from '../core/world/types';
import { actorFrames, artUrl } from '../game/visuals/assets';
import { SOURCE_TILE, decorAt, floorFrame, fogLayers, landmarkAt, tileSizeFor, tileset, worldArtUrl, type Landmark } from '../game/visuals/world-art';
import { heroText, resourceOrder, resourceText } from './th';
import { icon } from './icons';

export interface WorldHost { move(dir: Direction): void; rest(): void; revive(heroId: string): void; swap(a: string, b: string): void; moveMember(id: string): void; hire(index: number): void; upgrade(id: string): void; dismiss(id: string): void; board(): { id: string; reason: string }[]; openChest(): void; newExpedition(): void }
export interface WorldBanner { kind: 'encounter' | 'boss' | 'tutorial' | 'complete'; eyebrow: string; title: string; detail: string }
export interface WorldView { state: ExpeditionState; message: string; locked: boolean; saved: boolean; banner?: WorldBanner; effect?: 'rest' | 'loot' }

const keyDirections: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
const dirLabel: Record<Direction, string> = { up: 'เดินขึ้น', down: 'เดินลง', left: 'เดินซ้าย', right: 'เดินขวา' };
const offsets: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const shards: readonly [string, string, string, string, string][] = [
  ['8%', '14%', '-60px', '-35px', '-18deg'], ['30%', '10%', '-25px', '-55px', '24deg'], ['55%', '12%', '25px', '-55px', '-22deg'], ['78%', '18%', '60px', '-30px', '30deg'],
  ['10%', '66%', '-60px', '40px', '22deg'], ['32%', '70%', '-25px', '55px', '-26deg'], ['58%', '68%', '25px', '55px', '18deg'], ['80%', '60%', '60px', '40px', '-28deg'],
];

export function portrait(id: string): string {
  const frame = actorFrames[id]!;
  return `<span class="portrait" data-actor="${id}" style="--portrait-x:${frame % 2};--portrait-y:${Math.floor(frame / 2)}" aria-hidden="true"><img src="${artUrl('portraits')}" alt="" width="1024" height="1536" draggable="false"></span>`;
}
const goals = (s: ExpeditionState) => [
  { done: s.tutorialDone, label: 'ผ่านการปะทะครั้งแรก' }, { done: !!s.camp, label: 'ไปถึงแคมป์' },
  { done: s.bossDefeated, label: 'ชนะผู้คุมรอยแยก' }, { done: s.completed, label: 'ไปถึงประตูรอยแยก' },
];

// Full-screen DOM renderer for the pure expedition state (Luminous Veil R2).
// It owns no rules: every input is forwarded to the host, which commits and
// saves before the view updates. Animations only decorate committed state.
export class WorldUI {
  private view: WorldView | undefined;
  private previous: { position: Point; chance: number; revealed: string; boss: boolean; done: boolean } | undefined;
  private lastKey = 0;
  private confirmNew = false;
  private campTab: 'care' | 'team' | 'hire' = 'care';
  private picked: string | undefined;
  private confirmDismiss = false;
  private tile = 48;
  private readonly width: number;
  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  constructor(private readonly root: HTMLElement, private readonly map: MapDefinition, private readonly heroes: readonly HeroDefinition[], private readonly host: WorldHost) {
    this.width = map.rows[0]!.length;
    root.innerHTML = `
      <section class="map-view" id="map-viewport" aria-label="แผนที่ ใช้ปุ่มลูกศรหรือแตะช่องที่ไฮไลต์เพื่อเดินทีละช่อง">
        <div class="map-grid" id="map-grid" aria-hidden="true" style="--cols:${this.width};--rows:${map.rows.length}">
          <div class="floor-layer">${this.floorCells()}</div>
          <div class="sprite-layer" id="sprite-layer">${this.staticSprites()}<div class="party-token" id="party-token"><span class="token-portrait">${portrait('guardian')}</span></div></div>
          <div class="fog-layer" id="fog-layer"></div>
          <div class="hint-layer" id="hint-layer"></div>
        </div>
        <div class="map-vignette"></div>
        <div class="world-motes" aria-hidden="true">${Array.from({ length: 6 }, (_, i) => `<i style="left:${12 + i * 15}%;top:${22 + (i * 37) % 60}%;animation-delay:${i * -700}ms"></i>`).join('')}</div>
        <div class="world-fx" id="world-fx" aria-hidden="true"></div>
      </section>
      <div class="world-hud">
        <div class="hud-location glass-capsule"><span class="location-mark">${icon('map')}</span><div><p class="eyebrow">${map.name}</p><h1 id="zone-name"></h1></div></div>
        <div class="hud-top-right">
          <div id="danger-chip" class="hud-danger glass-capsule" role="status" aria-live="polite"></div>
          <button id="world-info-button" data-world="info" class="hud-info round-glass" aria-haspopup="dialog" aria-controls="world-info" aria-label="ข้อมูลการเดินทางและวิธีเล่น">${icon('info')}</button>
        </div>
        <div class="hud-party" id="world-party" aria-label="เลือดทีม"></div>
        <button id="objective-button" data-world="goals" class="hud-objective glass-capsule" aria-haspopup="dialog" aria-controls="world-goals"></button>
        <button id="world-pack" data-world="pack" class="hud-pack glass-capsule" aria-haspopup="dialog" aria-controls="pack-dialog"></button>
        <p id="world-message" class="hud-event glass-capsule" role="status" aria-live="polite"></p>
        <div class="hud-movement">
          <div class="ghost-dpad" role="group" aria-label="เดินทีละช่อง">
            ${(['up', 'left', 'right', 'down'] as Direction[]).map(d => `<button id="move-${d}" data-world="move" data-dir="${d}" class="dpad-${d}" aria-label="${dirLabel[d]}">${icon(d)}</button>`).join('')}
            <span class="dpad-centre" aria-hidden="true">${icon('footprints')}</span>
          </div>
          <span class="movement-caption">เดินทีละ 1 ช่อง</span>
        </div>
        <div class="hud-action">
          <button id="rest" data-world="interact" class="interact-button"></button>
          <span id="action-caption" class="context-caption"></span>
        </div>
      </div>
      <div id="world-banner" class="world-banner" role="status" hidden></div>
      <dialog id="world-goals" class="world-dialog" aria-labelledby="world-goals-title"><div class="info-header"><h2 id="world-goals-title">เป้าหมายการเดินทาง</h2><button data-world="goals-close" class="quiet" aria-label="ปิดเป้าหมาย">${icon('close')}</button></div><div class="info-content" id="world-goals-content"></div></dialog>
      <dialog id="camp-dialog" class="world-dialog" aria-labelledby="camp-title"><div class="info-header"><h2 id="camp-title">${icon('camp')} แคมป์พักแรม</h2><button data-world="camp-close" class="quiet" aria-label="ปิดแคมป์">${icon('close')}</button></div><div class="info-content" id="camp-content"></div></dialog>
      <dialog id="pack-dialog" class="world-dialog" aria-labelledby="pack-title"><div class="info-header"><h2 id="pack-title">สัมภาระ</h2><button data-world="pack-close" class="quiet" aria-label="ปิดสัมภาระ">${icon('close')}</button></div><div class="info-content" id="pack-content"></div></dialog>
      <dialog id="world-info" class="world-dialog" aria-labelledby="world-info-title"><div class="info-header"><h2 id="world-info-title">ข้อมูลการเดินทาง</h2><button data-world="info-close" class="quiet" aria-label="ปิดข้อมูล">${icon('close')}</button></div><div class="info-content" id="world-info-content"></div></dialog>`;
    root.addEventListener('click', e => {
      const el = e.target as HTMLElement;
      const button = el.closest<HTMLButtonElement>('button[data-world]');
      if (button && !button.disabled) {
        const dialog = (id: string) => root.querySelector<HTMLDialogElement>(id)!;
        switch (button.dataset.world) {
          case 'move': this.input(button.dataset.dir as Direction); break;
          case 'interact': this.interact(); break;
          case 'camp-rest': if (!this.view?.locked) this.host.rest(); break;
          case 'camp-revive': if (!this.view?.locked && button.dataset.hero) this.host.revive(button.dataset.hero); break;
          case 'camp-close': dialog('#camp-dialog').close(); break;
          case 'camp-tab': this.campTab = button.dataset.tab as WorldUI['campTab']; this.picked = undefined; this.confirmDismiss = false; this.renderCamp(); this.root.querySelector<HTMLElement>(`#camp-tab-${this.campTab}`)?.focus(); break;
          case 'team-pick': this.confirmDismiss = false; this.pickMember(button.dataset.hero, button.dataset.side as 'deployed' | 'reserve'); break;
          case 'hire': if (!this.view?.locked) this.host.hire(Number(button.dataset.index)); break;
          case 'upgrade': if (!this.view?.locked && this.picked) this.host.upgrade(this.picked); break;
          case 'dismiss': if (this.view?.locked || !this.picked) break;
            if (!this.confirmDismiss) { this.confirmDismiss = true; this.renderCamp(); this.root.querySelector<HTMLElement>('#team-dismiss')?.focus(); break; }
            this.confirmDismiss = false; { const id = this.picked; this.picked = undefined; this.host.dismiss(id); } break;
          case 'pack': this.renderPack(); dialog('#pack-dialog').showModal(); break;
          case 'pack-close': dialog('#pack-dialog').close(); break;
          case 'info': this.confirmNew = false; this.renderInfo(); dialog('#world-info').showModal(); break;
          case 'info-close': dialog('#world-info').close(); break;
          case 'goals': this.renderGoals(); dialog('#world-goals').showModal(); break;
          case 'goals-close': dialog('#world-goals').close(); break;
          case 'new': this.confirmNew = true; this.renderInfo(); root.querySelector<HTMLElement>('#confirm-new')?.focus(); break;
          case 'cancel-new': this.confirmNew = false; this.renderInfo(); root.querySelector<HTMLElement>('#new-expedition')?.focus(); break;
          case 'confirm-new': this.confirmNew = false; dialog('#world-info').close(); this.host.newExpedition(); break;
          case 'new-now': this.host.newExpedition(); break;
        }
        return;
      }
      const hint = el.closest<HTMLElement>('.step-hint');
      if (hint?.dataset.dir) this.input(hint.dataset.dir as Direction);
    });
    root.querySelector('#world-info')!.addEventListener('close', () => { this.confirmNew = false; });
    document.addEventListener('keydown', e => {
      const dir = keyDirections[e.key];
      if (!dir || root.hidden || root.querySelector('dialog[open]') || e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as HTMLElement).closest?.('input, textarea')) return;
      e.preventDefault();
      const now = performance.now(); if (now - this.lastKey < 120) return; this.lastKey = now;
      this.input(dir);
    });
    new ResizeObserver(() => this.layout()).observe(root.querySelector('#map-viewport')!);
  }

  // The lower-right action is contextual: camp opens the camp sheet, an unopened chest opens.
  private interact(): void {
    const s = this.view?.state; if (!s || this.view!.locked) return;
    if (atCamp(s, this.map)) {
      // Open on the team tab when the deployed party cannot walk on.
      this.campTab = s.roster.deployed.some(id => s.hp[id]! > 0) ? 'care' : 'team'; this.picked = undefined;
      this.renderCamp(); this.root.querySelector<HTMLDialogElement>('#camp-dialog')!.showModal();
    }
    else if (canOpenChest(s, this.map)) this.host.openChest();
  }
  // Tap a member, then a member or an empty slot on the other side to swap or move.
  private pickMember(id: string | undefined, side: 'deployed' | 'reserve'): void {
    const s = this.view?.state; if (!s || this.view!.locked) return;
    const pickedSide = this.picked && (s.roster.deployed.includes(this.picked) ? 'deployed' : 'reserve');
    if (!this.picked || pickedSide === side) { this.picked = id && id !== this.picked ? id : undefined; this.renderCamp(); this.focusTeam(this.picked ?? id); return; }
    const from = this.picked; this.picked = undefined;
    if (id) this.host.swap(from, id); else this.host.moveMember(from);
    this.focusTeam(from);
  }
  private focusTeam(id: string | undefined): void { if (id) this.root.querySelector<HTMLElement>(`#team-${id}`)?.focus(); }
  private input(dir: Direction): void { if (this.view && !this.view.locked && !this.view.state.completed) this.host.move(dir); }

  private floorCells(): string {
    let html = '';
    for (let y = 0; y < this.map.rows.length; y++) for (let x = 0; x < this.width; x++) {
      const frame = tileset[floorFrame(this.map, { x, y })]!;
      html += `<div class="tile t-${tileAt(this.map, { x, y })!.kind}" style="--x:${x};--y:${y};--fx:${frame.x / SOURCE_TILE};--fy:${frame.y / SOURCE_TILE}"></div>`;
    }
    return html;
  }
  // Decor and landmarks are built once; visibility follows fog and variants follow flags.
  private staticSprites(): string {
    let html = '';
    for (let y = 0; y < this.map.rows.length; y++) for (let x = 0; x < this.width; x++) {
      const prop = decorAt(this.map, { x, y });
      if (prop) html += `<span class="decor sprite" data-cell="${x},${y}" style="--x:${x};--y:${y};--fx:${prop.x / SOURCE_TILE};--fy:${prop.y / SOURCE_TILE};z-index:${y * 3 + 1}"></span>`;
      const chest = chestAt(this.map, { x, y });
      if (chest) html += `<span class="chest sprite" data-cell="${x},${y}" data-chest="${chest.id}" data-tier="${chest.tier}" style="--x:${x};--y:${y};z-index:${y * 3 + 1}"></span>`;
      const kind = tileAt(this.map, { x, y })!.kind;
      if (['camp', 'start', 'goal', 'boss'].includes(kind)) html += `<span class="landmark sprite" data-cell="${x},${y}" data-kind="${kind}" style="--x:${x};--y:${y};z-index:${y * 3 + 1}">${kind === 'boss' ? '<span class="boss-unit"></span>' : ''}</span>`;
    }
    return html;
  }

  render(view: WorldView): void {
    const s = view.state; const prev = this.previous;
    this.view = view;
    const tile = tileAt(this.map, s.position)!; const zone = zoneOf(this.map, tile.zoneId);
    this.root.querySelector('#zone-name')!.textContent = tile.kind === 'camp' ? 'แคมป์พักแรม' : zone?.name ?? '';
    this.root.dataset.zone = tile.kind === 'camp' ? 'camp' : tile.zoneId;
    this.renderDanger(encounterChance(s, this.map), prev?.chance);
    this.renderParty(s);
    const done = goals(s).filter(g => g.done).length; const next = goals(s).find(g => !g.done);
    this.root.querySelector('#objective-button')!.innerHTML = `<span class="objective-symbol">${icon('goal')}</span><span class="objective-text">${next ? next.label : 'สำเร็จการเดินทาง'}</span><span class="objective-count">${done}/4</span>${icon('right')}`;
    this.root.querySelector('#objective-button')!.setAttribute('aria-label', `เป้าหมาย ${done} จาก 4 · ${next ? `ถัดไป ${next.label}` : 'สำเร็จแล้ว'} · เปิดรายการ`);
    const message = this.root.querySelector<HTMLElement>('#world-message')!;
    if (message.textContent !== view.message) message.textContent = view.message;
    message.hidden = !view.message;
    message.classList.toggle('rest-feedback', view.effect === 'rest');
    message.classList.toggle('loot-feedback', view.effect === 'loot');
    for (const d of ['up', 'down', 'left', 'right'] as Direction[]) this.root.querySelector<HTMLButtonElement>(`#move-${d}`)!.disabled = view.locked || s.completed;
    this.renderAction(s, view.locked);
    this.renderPackButton(s, view.effect === 'loot');
    if (this.root.querySelector<HTMLDialogElement>('#camp-dialog')!.open) { if (atCamp(s, this.map) && !view.locked) this.renderCamp(); else this.root.querySelector<HTMLDialogElement>('#camp-dialog')!.close(); }
    if (!prev || prev.revealed !== s.revealed) this.renderFog(s);
    this.renderSprites(s, prev);
    this.renderHints(s, view.locked);
    this.renderBanner(view);
    if (view.effect === 'rest' && !this.reduced.matches) this.sparkle();
    this.previous = { position: { ...s.position }, chance: encounterChance(s, this.map), revealed: s.revealed, boss: s.bossDefeated, done: s.completed };
    this.layout();
  }

  private renderAction(s: ExpeditionState, locked: boolean): void {
    const camp = atCamp(s, this.map); const chest = !camp && canOpenChest(s, this.map);
    const available = !locked && (camp || chest);
    const fallen = rosterIds(s).filter(id => s.hp[id] === 0).length;
    const action = this.root.querySelector<HTMLButtonElement>('#rest')!;
    action.disabled = !available; action.classList.toggle('available', available);
    action.dataset.context = camp ? 'camp' : chest ? 'chest' : 'none';
    const label = camp ? 'พัก' : chest ? 'เปิด' : 'โต้ตอบ';
    action.innerHTML = `${icon(camp ? 'rest' : chest ? 'chest' : 'talk')}<span>${label}</span>${available ? '<i class="context-dot"></i>' : ''}`;
    const caption = camp ? (canRest(s, this.map) ? 'พักฟื้นหรือชุบคนที่ล้ม' : fallen ? 'ชุบคนที่ล้มด้วยถ่าน' : 'ไฟแคมป์รอศึกถัดไป') : chest ? 'เปิดกล่องสมบัติ' : 'ยืนบนแคมป์หรือกล่องสมบัติ';
    action.setAttribute('aria-label', camp ? `แคมป์ · เปิดหน้าต่างพักและชุบ · ${caption}` : chest ? 'เปิดกล่องสมบัติ' : 'โต้ตอบ · ยังไม่มีจุดให้โต้ตอบ ยืนบนแคมป์หรือกล่องสมบัติ');
    this.root.querySelector('#action-caption')!.textContent = caption;
  }

  private renderPackButton(s: ExpeditionState, gained: boolean): void {
    const pack = this.root.querySelector<HTMLElement>('#world-pack')!;
    pack.innerHTML = resourceOrder.map(id => `<span class="pack-item" data-resource="${id}">${icon(id)}<b>${s.resources[id]}</b></span>`).join('');
    pack.setAttribute('aria-label', `สัมภาระ · ${resourceOrder.map(id => `${resourceText[id].name} ${s.resources[id]}`).join(' · ')} · เปิดรายละเอียด`);
    if (gained && !this.reduced.matches) { pack.classList.remove('gain'); void pack.offsetWidth; pack.classList.add('gain'); }
  }

  private renderPack(): void {
    const s = this.view?.state; if (!s) return;
    const opened = s.openedChests.length;
    this.root.querySelector('#pack-content')!.innerHTML = `<ul class="pack-list">${resourceOrder.map(id => `<li data-resource="${id}">${icon(id)}<div><b>${resourceText[id].name}</b><small>${resourceText[id].use}</small></div><strong>${s.resources[id]}</strong></li>`).join('')}</ul>
      <p class="world-stats">เปิดกล่องสมบัติแล้ว ${opened}/${this.map.chests.length} กล่อง · ของตกจากศึกที่ชนะและกล่องสมบัติ</p>`;
  }

  private stars(s: ExpeditionState, id: string): number { return s.members[id]?.stars ?? 1; }
  // Member stats as they fight: the catalog entry scaled by the member's stars.
  private hero(id: string, s = this.view?.state): HeroDefinition { const base = this.heroes.find(h => h.id === id)!; return s ? starred(base, this.stars(s, id), this.map) : base; }
  private starRow(n: number): string { return `<span class="star-row" aria-label="${n} ดาว">${'★'.repeat(n)}<i>${'★'.repeat(this.map.company.maxStars - n)}</i></span>`; }
  private renderCamp(): void {
    const s = this.view?.state; if (!s) return;
    const tab = (id: WorldUI['campTab'], label: string) => `<button id="camp-tab-${id}" data-world="camp-tab" data-tab="${id}" role="tab" aria-selected="${this.campTab === id}" class="${this.campTab === id ? 'active' : ''}">${label}</button>`;
    const tabs = `<div class="camp-tabs" role="tablist" aria-label="แคมป์">${tab('care', 'พัก/ชุบ')}${tab('team', `ทีม <small>${s.roster.deployed.length}+${s.roster.reserve.length}</small>`)}${tab('hire', 'จ้าง')}</div>`;
    this.root.querySelector('#camp-content')!.innerHTML = tabs + (this.campTab === 'care' ? this.campCare(s) : this.campTab === 'team' ? this.campTeam(s) : this.campHire(s));
  }
  private memberPanel(s: ExpeditionState, id: string): string {
    const m = s.members[id]!; const cost = upgradeCost(s, this.map, id); const reason = upgradeReason(s, this.map, id);
    const need = cost ? cost.dupes + cost.seals : 0;
    const why: Record<string, string> = { maxed: 'ดาวเต็มแล้ว', dupes: 'ตัวซ้ำไม่พอ', ore: 'แร่ดาวไม่พอ', camp: 'อัปได้ที่แคมป์' };
    const upgradeLabel = !cost ? 'ดาวเต็มแล้ว' : reason ? `${why[reason]} · ★${m.stars + 1} ใช้ตัวซ้ำ ${need}${cost.seals ? ' (ตราแทนได้ 1)' : ''} แร่ ${cost.ore}`
      : `อัปเป็น ★${m.stars + 1} · ตัวซ้ำ ${cost.dupes}${cost.seals ? ' + ตรา 1' : ''} · แร่ ${cost.ore}`;
    const last = dismissReason(s, this.map, id) === 'last';
    return `<div class="member-panel" aria-live="polite"><p><b>${heroText[id]!.name}</b> ${this.starRow(m.stars)} <span>ตัวซ้ำที่เก็บไว้ ${m.dupes}</span></p>
      <div class="member-actions"><button id="team-upgrade" data-world="upgrade" class="primary"${reason ? ' disabled' : ''}>${upgradeLabel}</button>
      <button id="team-dismiss" data-world="dismiss" class="danger-button"${last ? ' disabled' : ''}>${last ? 'ต้องมีคนลงสนาม 1 คน' : this.confirmDismiss ? `ยืนยันเลิกจ้าง · ดาวและตัวซ้ำหาย +${this.map.company.dismissRefund} แร่` : 'เลิกจ้าง'}</button></div></div>`;
  }
  private campHire(s: ExpeditionState): string {
    const why: Record<string, string> = { taken: 'จ้างแล้ว', ore: 'แร่ดาวไม่พอ', full: 'ทีมเต็ม 8 คน', maxed: 'ดาวเต็มแล้ว', camp: 'จ้างได้ที่แคมป์' };
    const offers = this.host.board();
    return `<section class="camp-section hire-section" role="tabpanel"><h3>${icon('flag')} ป้ายจ้างทหารรับจ้าง <span class="camp-embers">${icon('ore')} แร่ดาว ${s.resources.ore}</span></h3>
      <ul class="hire-list">${offers.map(({ id, reason }, i) => {
        const h = this.hero(id); const text = heroText[id]!; const m = s.members[id];
        const status = m ? `${this.starRow(m.stars)} ตัวซ้ำ ${m.dupes} · มีในทีม` : 'ใหม่ · ★1 เข้าสำรอง';
        return `<li class="${reason === 'taken' ? 'taken' : ''}">${portrait(id)}<span><b>${text.name}</b><small>${text.role} · ${h.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'} · ${text.help}</small><small class="hire-status">${status}</small></span>
          <button id="hire-${i}" data-world="hire" data-index="${i}" class="secondary"${reason ? ' disabled' : ''} aria-label="จ้าง${text.name} ใช้แร่ดาว ${this.map.company.hireCost}">${reason ? why[reason] ?? 'จ้างไม่ได้' : `จ้าง · ${this.map.company.hireCost}`}</button></li>`;
      }).join('')}</ul>
      <p class="camp-note">ทุกคนเริ่ม ★1 · จ้างคนที่มีอยู่แล้วจะได้ตัวซ้ำไว้อัปดาวในแท็บทีม · ป้ายเปลี่ยนใหม่ทุกครั้งที่ชนะศึก</p></section>`;
  }
  private campCare(s: ExpeditionState): string {
    const ready = canRest(s, this.map); const embers = s.resources.ember;
    const fallen = rosterIds(s).filter(id => s.hp[id] === 0).map(id => this.hero(id));
    const reviveHp = (max: number) => Math.max(1, Math.ceil(max * this.map.camp.reviveHpPercent / 100));
    return `
      <section class="camp-section" role="tabpanel"><h3>${icon('rest')} พักฟื้น</h3>
        <p>ทุกคนในทีมและตัวสำรองที่ยังยืนอยู่ฟื้นเลือด ${this.map.camp.restHealPercent}% ของเลือดสูงสุด ไฟแคมป์ใช้ได้ 1 ครั้ง แล้วต้องชนะศึกอีกครั้งจึงจุดใหม่ได้</p>
        <button id="camp-rest" data-world="camp-rest" class="primary"${ready ? '' : ' disabled'}>${ready ? `พักฟื้น +${this.map.camp.restHealPercent}%` : 'ไฟแคมป์มอด · ชนะศึกก่อน'}</button></section>
      <section class="camp-section"><h3>${icon('ember')} ชุบชีวิต <span class="camp-embers">ถ่านม่านเวล ${embers}</span></h3>
        ${fallen.length ? `<ul class="revive-list">${fallen.map(h => { const ok = canRevive(s, this.map, h.id); return `<li>${portrait(h.id)}<span><b>${heroText[h.id]!.name}</b><small>ฟื้นด้วยเลือด ${reviveHp(h.maxHp)}/${h.maxHp}</small></span><button id="camp-revive-${h.id}" data-world="camp-revive" data-hero="${h.id}" class="secondary"${ok ? '' : ' disabled'} aria-label="ชุบ${heroText[h.id]!.name} ใช้ถ่านม่านเวล 1">${ok ? 'ชุบ · ใช้ 1' : 'ไม่มีถ่าน'}</button></li>`; }).join('')}</ul>`
          : '<p>ไม่มีใครล้ม</p>'}
        <p class="camp-note">ชุบได้ครั้งละ 1 คน ต่อถ่านม่านเวล 1 ก้อน หาได้จากศึกและกล่องสมบัติ</p></section>`;
  }
  private campTeam(s: ExpeditionState): string {
    const card = (id: string | undefined, side: 'deployed' | 'reserve', slot: number) => {
      if (!id) return `<button class="team-card empty${this.picked ? ' target' : ''}" data-world="team-pick" data-side="${side}" aria-label="${side === 'deployed' ? `ช่อง ${slot + 1} ว่าง` : 'ช่องสำรองว่าง'}"${this.picked ? '' : ' disabled'}><span>ว่าง</span></button>`;
      const h = this.hero(id); const hp = s.hp[id] ?? 0; const text = heroText[id]!;
      const lane = h.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง';
      return `<button id="team-${id}" class="team-card${hp <= 0 ? ' fallen' : ''}" data-world="team-pick" data-hero="${id}" data-side="${side}" aria-pressed="${this.picked === id}" aria-label="${side === 'deployed' ? `ช่อง ${slot + 1} · ` : 'สำรอง · '}${text.name} ${this.stars(s, id)} ดาว ${text.role} ${lane} ${hp <= 0 ? 'ล้มแล้ว' : `เลือด ${hp} จาก ${h.maxHp}`}">${side === 'deployed' ? `<i class="slot-no">${slot + 1}</i>` : ''}${portrait(id)}<b>${text.name}</b>${this.starRow(this.stars(s, id))}<small>${hp <= 0 ? 'ล้มแล้ว' : `${hp}/${h.maxHp}`}</small><small class="lane">${text.role} · ${lane}</small></button>`;
    };
    const row = (ids: string[], side: 'deployed' | 'reserve', size: number) => Array.from({ length: size }, (_, i) => card(ids[i], side, i)).join('');
    const deployedUp = s.roster.deployed.some(id => s.hp[id]! > 0);
    return `<section class="camp-section team-section" role="tabpanel">
        <h3>${icon('flag')} ลงสนาม <span class="camp-embers">ศัตรูเล็งตามหมายเลขช่อง</span></h3>
        <div class="team-grid">${row(s.roster.deployed, 'deployed', PARTY_SLOTS)}</div>
        <h3>${icon('camp')} สำรอง</h3>
        <div class="team-grid">${row(s.roster.reserve, 'reserve', RESERVE_SLOTS)}</div>
        ${this.picked ? this.memberPanel(s, this.picked) : ''}
        <p class="camp-note" id="team-hint">${this.picked ? `เลือก${heroText[this.picked]!.name}แล้ว · แตะคนหรือช่องว่างอีกฝั่งเพื่อสลับ แตะซ้ำเพื่อยกเลิก` : !deployedUp ? 'ทีมที่ลงสนามล้มหมด · สลับตัวสำรองที่ยังยืนอยู่หรือชุบก่อนออกเดินทาง' : s.roster.reserve.length ? 'แตะสมาชิก แล้วแตะคนหรือช่องว่างอีกฝั่งเพื่อสลับ' : 'ยังไม่มีตัวสำรอง · จ้างทหารรับจ้างได้ที่แคมป์ในช่วงถัดไป'}</p></section>`;
  }

  private renderDanger(chance: number, before: number | undefined): void {
    const chip = this.root.querySelector<HTMLElement>('#danger-chip')!;
    const level = chance === 0 ? 'safe' : chance < 15 ? 'low' : chance < 30 ? 'mid' : 'high';
    chip.dataset.level = level;
    const fill = level === 'safe' ? 1 : Math.min(1, chance / 40);
    chip.innerHTML = `<span class="danger-label">${icon(level === 'safe' ? 'safe' : 'danger')}<span>${level === 'safe' ? 'ปลอดภัย' : 'ก้าวถัดไป'}</span><strong>${chance}%</strong></span><span class="gauge"><span style="width:${fill * 100}%"></span></span>`;
    chip.setAttribute('aria-label', level === 'safe' ? 'พื้นที่ปลอดภัย โอกาสพบศัตรู 0 เปอร์เซ็นต์' : `โอกาสพบศัตรูในก้าวถัดไป ${chance} เปอร์เซ็นต์`);
    if (before !== undefined && chance > before && !this.reduced.matches) { chip.classList.remove('rise'); void chip.offsetWidth; chip.classList.add('rise'); }
  }

  private renderParty(s: ExpeditionState): void {
    this.root.querySelector('#world-party')!.innerHTML = s.roster.deployed.map(id => this.hero(id, s)).map(h => {
      const hp = s.hp[h.id] ?? 0; const ratio = hp / h.maxHp; const text = heroText[h.id]!;
      const state = hp <= 0 ? 'fallen' : ratio < .25 ? 'critical' : ratio < .6 ? 'hurt' : 'healthy';
      return `<div class="world-hero ${state}" id="world-hero-${h.id}" aria-label="${text.name} ${this.stars(s, h.id)} ดาว ${hp <= 0 ? 'ล้มแล้ว' : `เลือด ${hp} จาก ${h.maxHp}`}">${portrait(h.id)}<span class="hero-copy"><b>${text.name}${this.stars(s, h.id) > 1 ? `<i class="hero-stars">★${this.stars(s, h.id)}</i>` : ''}</b><small>${hp <= 0 ? 'ล้มแล้ว' : `${hp}/${h.maxHp}`}</small><span class="hp"><span style="width:${ratio * 100}%"></span></span></span></div>`;
    }).join('');
  }

  private renderFog(s: ExpeditionState): void {
    let html = '';
    for (let y = 0; y < this.map.rows.length; y++) for (let x = 0; x < this.width; x++) {
      const layers = fogLayers(this.map, s, { x, y });
      if (layers.length) html += `<div class="fog-cell${layers[0] === 'fog_tile' ? ' opaque' : ''}" style="--x:${x};--y:${y};background-image:${layers.map(l => `url(${worldArtUrl(l)})`).join(',')}"></div>`;
    }
    this.root.querySelector('#fog-layer')!.innerHTML = html;
    this.root.querySelectorAll<HTMLElement>('.sprite[data-cell]').forEach(el => {
      const [x, y] = el.dataset.cell!.split(',').map(Number); el.hidden = !isRevealed(s, this.map, { x: x!, y: y! });
    });
  }

  private renderSprites(s: ExpeditionState, prev: WorldUI['previous']): void {
    this.root.querySelectorAll<HTMLElement>('.landmark').forEach(el => {
      const [x, y] = el.dataset.cell!.split(',').map(Number);
      const art = landmarkAt(this.map, s, { x: x!, y: y! }) as Landmark;
      if (el.dataset.art === art) return;
      const changed = !!el.dataset.art; el.dataset.art = art;
      el.style.backgroundImage = `url(${worldArtUrl(art)})`;
      el.classList.toggle('has-boss', art === 'boss_pedestal');
      if (changed && !this.reduced.matches) { el.classList.remove('lv-gate-open'); void el.offsetWidth; el.classList.add('lv-gate-open'); }
    });
    this.root.querySelectorAll<HTMLElement>('.chest').forEach(el => {
      const open = s.openedChests.includes(el.dataset.chest!);
      if (el.dataset.open === String(open)) return;
      const changed = el.dataset.open !== undefined; el.dataset.open = String(open);
      el.innerHTML = icon(open ? 'chestOpen' : 'chest');
      if (changed && open && !this.reduced.matches) { el.classList.remove('lv-chest-open'); void el.offsetWidth; el.classList.add('lv-chest-open'); }
    });
    const token = this.root.querySelector<HTMLElement>('#party-token')!;
    token.style.setProperty('--x', String(s.position.x)); token.style.setProperty('--y', String(s.position.y));
    token.style.zIndex = String(s.position.y * 3 + 2);
    const moved = prev && (prev.position.x !== s.position.x || prev.position.y !== s.position.y);
    const hop = moved && Math.abs(prev!.position.x - s.position.x) + Math.abs(prev!.position.y - s.position.y) === 1;
    token.classList.toggle('instant', !!moved && !hop);
    if (hop && !this.reduced.matches) {
      token.classList.remove('lv-hop'); void token.offsetWidth; token.classList.add('lv-hop');
      const dust = document.createElement('span');
      dust.className = 'step-dust sprite'; dust.style.setProperty('--x', String(prev!.position.x)); dust.style.setProperty('--y', String(prev!.position.y));
      dust.style.zIndex = String(prev!.position.y * 3 + 2);
      dust.addEventListener('animationend', () => dust.remove());
      this.root.querySelector('#sprite-layer')!.append(dust);
    }
  }

  // Only legal neighbours get a hint; a boss tile is a legal step that starts its fight.
  private renderHints(s: ExpeditionState, locked: boolean): void {
    const layer = this.root.querySelector('#hint-layer')!;
    if (locked || s.completed) { layer.innerHTML = ''; return; }
    layer.innerHTML = (Object.entries(offsets) as [Direction, Point][]).map(([dir, o]) => {
      const p = { x: s.position.x + o.x, y: s.position.y + o.y }; const t = tileAt(this.map, p);
      if (!t || t.kind === 'wall') return '';
      return `<span class="step-hint${t.kind === 'boss' && !s.bossDefeated ? ' boss' : ''}" data-dir="${dir}" style="--x:${p.x};--y:${p.y}"><i>${icon(dir)}</i></span>`;
    }).join('');
  }

  private renderBanner(view: WorldView): void {
    const banner = this.root.querySelector<HTMLElement>('#world-banner')!; const b = view.banner;
    banner.hidden = !b; banner.dataset.kind = b?.kind ?? '';
    if (!b) { banner.innerHTML = ''; return; }
    const key = `${b.kind}:${b.title}`;
    if (banner.dataset.key === key) return;
    banner.dataset.key = key;
    const transition = b.kind !== 'complete' && !this.reduced.matches;
    const headIcon = b.kind === 'boss' ? 'boss' : b.kind === 'complete' ? 'star' : 'danger';
    banner.innerHTML = `${transition ? `<div class="lv-encounter-flash"></div><div class="lv-veil-shatter">${shards.map(([l, t, x, y, a]) => `<i style="--shard-left:${l};--shard-top:${t};--shard-x:${x};--shard-y:${y};--shard-angle:${a}"></i>`).join('')}</div>` : ''}<div class="banner-card ${b.kind === 'boss' ? 'lv-boss-reveal' : 'lv-sheet'}"><p class="eyebrow">${icon(headIcon)}<span>${b.eyebrow}</span></p><h2>${b.title}</h2><p>${b.detail}</p>${b.kind === 'complete' ? '<button data-world="new-now" id="new-expedition-banner" class="primary">เริ่มการเดินทางใหม่</button>' : ''}</div>`;
  }

  private sparkle(): void {
    const fx = this.root.querySelector('#world-fx')!; const token = this.root.querySelector<HTMLElement>('#party-token')!.getBoundingClientRect();
    const host = this.root.querySelector<HTMLElement>('#map-viewport')!.getBoundingClientRect();
    [[20, 55], [35, 40], [50, 65], [65, 45], [80, 55], [50, 30]].forEach(([x, y], i) => {
      const s = document.createElement('span'); s.className = 'lv-heal-sparkle';
      s.style.left = `${token.left - host.left + token.width * x! / 100}px`; s.style.top = `${token.top - host.top + token.height * y! / 100}px`;
      s.style.animationDelay = `${i * 40}ms`; s.addEventListener('animationend', () => s.remove()); fx.append(s);
    });
  }

  // Camera: centre the party in the open area between the top HUD and the lower controls.
  private layout(): void {
    const viewport = this.root.querySelector<HTMLElement>('#map-viewport')!; const grid = this.root.querySelector<HTMLElement>('#map-grid')!;
    if (!this.view || !viewport.clientWidth) return;
    const w = viewport.clientWidth, h = viewport.clientHeight;
    this.tile = tileSizeFor(w, h); const t = this.tile;
    this.root.style.setProperty('--t', `${t}px`);
    const band = (r: DOMRect) => r.width > 0 && r.right > w / 2 - 1.5 * t && r.left < w / 2 + 1.5 * t;
    const rect = (sel: string) => this.root.querySelector<HTMLElement>(sel)?.getBoundingClientRect();
    let top = 0, bottom = h;
    for (const sel of ['.hud-location', '.hud-top-right', '.hud-party', '.hud-objective', '.hud-pack']) { const r = rect(sel); if (r && band(r)) top = Math.max(top, r.bottom); }
    for (const sel of ['.hud-movement', '.hud-action', '#world-message']) { const r = rect(sel); if (r && band(r) && !(sel === '#world-message' && this.root.querySelector<HTMLElement>(sel)!.hidden)) bottom = Math.min(bottom, r.top); }
    const focusY = bottom - top >= 3 * t ? (top + bottom) / 2 : h / 2;
    const p = this.view.state.position;
    const ox = Math.round(w / 2 - (p.x + .5) * t), oy = Math.round(focusY - (p.y + .5) * t);
    grid.style.transform = `translate(${ox}px, ${oy}px)`;
    viewport.style.setProperty('--ox', `${ox}px`); viewport.style.setProperty('--oy', `${oy}px`);
  }

  private renderGoals(): void {
    const s = this.view?.state; if (!s) return;
    this.root.querySelector('#world-goals-content')!.innerHTML = `<ul class="goal-list">${goals(s).map(g => `<li class="${g.done ? 'done' : ''}">${icon(g.done ? 'check' : 'circle')}<span>${g.label}</span></li>`).join('')}</ul><p class="world-stats">เดินแล้ว ${s.steps} ก้าว · ชนะ ${s.wins} ศึก · แพ้ ${s.defeats} ครั้ง</p>`;
  }

  private renderInfo(): void {
    const s = this.view?.state;
    this.root.querySelector('#world-info-content')!.innerHTML = `
      <section class="world-rules"><h3>เดินทีละช่อง</h3><p>แตะช่องที่ไฮไลต์ ใช้ปุ่มลูกศรมุมซ้ายล่าง หรือแป้น ←↑↓→ / WASD ทุกก้าวในพื้นที่อันตรายมีโอกาสพบศัตรู ตัวเลขมุมขวาบนคือโอกาสของก้าวถัดไป ยิ่งเดินโดยไม่เจอ โอกาสยิ่งเพิ่ม และกลับไปต่ำสุดเมื่อพบศัตรูหรือพักที่แคมป์</p>
      <h3>เลือดติดตัว</h3><p>จบศึกแล้วเลือดไม่ฟื้นเอง สมาชิกที่ล้มยังล้มอยู่จนกว่าจะชุบที่แคมป์ ศึกถัดไปเริ่มด้วยเลือดที่เหลือ</p>
      <h3>${icon('camp')} แคมป์</h3><p>ยืนบนแคมป์แล้วกด “พัก” มุมขวาล่าง พักฟื้นได้ ${this.map.camp.restHealPercent}% ครั้งเดียวจนกว่าจะชนะศึกถัดไป คนที่ล้มต้องใช้ถ่านม่านเวลชุบทีละคน แคมป์ล่าสุดที่ไปถึงคือจุดกลับเมื่อแพ้</p>
      <h3>${icon('chest')} ของตกและกล่องสมบัติ</h3><p>ชนะศึกได้แร่ดาวและบางครั้งได้ถ่านม่านเวล ยืนบนกล่องแล้วกด “เปิด” กล่องหายากมีตราสัญญา ดูของที่มีได้จากช่องสัมภาระ</p>
      <h3>${icon('flag')} ทีมและตัวสำรอง</h3><p>ลงสนามได้ 4 คน สำรองได้ 4 คน สลับตัวได้ที่แคมป์ ศัตรูเล็งตามหมายเลขช่อง ใครยืนช่องนั้นคือเป้า (กายภาพยังโดนแนวหน้าก่อน)</p>
      <h3>เมื่อแพ้</h3><p>ทีมถอยกลับแคมป์ล่าสุดที่ไปถึง (หรือจุดเริ่ม) คนที่ล้มยังล้มอยู่ ต้องชุบหรือสลับตัวสำรอง ถ้าทุกคนในทีมและสำรองล้มหมด 1 คนจะลุกขึ้นได้ฟรีและไฟแคมป์จุดใหม่ ของที่เก็บมาแล้วไม่หาย</p>
      <h3>${icon('boss')} ผู้คุมรอยแยก</h3><p>บอสเฝ้าทางเดียวไปประตูรอยแยก เดินชนบอสเพื่อเริ่มศึก ชนะแล้วเดินไปที่ประตูเพื่อจบการเดินทาง</p></section>
      ${s ? `<p class="world-stats">เดินแล้ว ${s.steps} ก้าว · ชนะ ${s.wins} ศึก · แพ้ ${s.defeats} ครั้ง</p>` : ''}
      <p id="world-save" class="world-save">${this.view?.saved ? 'บันทึกอัตโนมัติบนเครื่องนี้ทุกก้าว' : 'เล่นได้ แต่บันทึกบนเครื่องนี้ไม่ได้'}</p>
      ${this.confirmNew ? `<div class="confirm-new" role="group" aria-labelledby="confirm-new-copy"><p id="confirm-new-copy">ความคืบหน้าของการเดินทางนี้จะถูกแทนที่</p><div class="confirm-actions"><button data-world="confirm-new" id="confirm-new" class="danger-button">ยืนยันเริ่มใหม่</button><button data-world="cancel-new" id="cancel-new" class="secondary">เดินทางต่อ</button></div></div>`
        : '<button data-world="new" id="new-expedition" class="danger-button">เริ่มการเดินทางใหม่</button>'}`;
  }
}
