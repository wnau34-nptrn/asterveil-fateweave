import type { HeroDefinition } from '../core/battle/types';
import type { Direction, ExpeditionState, MapDefinition, Point } from '../core/world/types';
import { canRest, encounterChance, isRevealed, tileAt, zoneOf } from '../core/world/world';
import { actorFrames, artUrl } from '../game/visuals/assets';
import { heroText } from './th';
import { icon } from './icons';

export interface WorldHost { move(dir: Direction): void; rest(): void; newExpedition(): void }
export interface WorldView { state: ExpeditionState; message: string; locked: boolean; saved: boolean; banner?: { eyebrow: string; title: string; detail: string } }

const keyDirections: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
const dirLabel: Record<Direction, string> = { up: 'เดินขึ้น', down: 'เดินลง', left: 'เดินซ้าย', right: 'เดินขวา' };

export function portrait(id: string): string {
  const frame = actorFrames[id]!;
  return `<span class="portrait" data-actor="${id}" style="--portrait-x:${frame % 2};--portrait-y:${Math.floor(frame / 2)}" aria-hidden="true"><img src="${artUrl('portraits')}" alt="" width="1024" height="1536" draggable="false"></span>`;
}

// DOM renderer for the pure expedition state. It owns no rules: every input is
// forwarded to the host, which commits and saves before the view updates.
export class WorldUI {
  private view: WorldView | undefined;
  private lastKey = 0;
  private confirmNew = false;
  private readonly width: number;
  constructor(private readonly root: HTMLElement, private readonly map: MapDefinition, private readonly heroes: readonly HeroDefinition[], private readonly host: WorldHost) {
    this.width = map.rows[0]!.length;
    root.innerHTML = `
      <header class="world-bar">
        <div class="world-heading"><p class="eyebrow">${map.name}</p><h1 id="zone-name"></h1></div>
        <span id="danger-chip" class="danger-chip" role="status"></span>
        <button id="world-info-button" data-world="info" class="quiet" aria-haspopup="dialog" aria-controls="world-info" aria-label="ข้อมูลการเดินทางและวิธีเล่น">ⓘ</button>
      </header>
      <div class="world-main">
        <section class="map-viewport" id="map-viewport" aria-label="แผนที่ แตะช่องติดกันหรือใช้ปุ่มลูกศรเพื่อเดิน">
          <div class="map-grid" id="map-grid" style="--cols:${this.width};--rows:${map.rows.length}" aria-hidden="true">${map.rows.map((row, y) => [...row].map((_, x) => this.cell({ x, y })).join('')).join('')}<div class="party-token" id="party-token">${portrait('guardian')}</div></div>
          <div id="world-banner" class="world-banner" role="status" hidden></div>
        </section>
        <aside class="world-side" aria-label="ทีมและการควบคุม">
          <div id="world-party" class="world-party" aria-label="เลือดทีม"></div>
          <section id="world-goal" class="world-goal" aria-label="เป้าหมายการเดินทาง"></section>
          <div class="world-controls">
            <p id="world-message" class="world-message" aria-live="polite"></p>
            <div class="dpad" role="group" aria-label="เดินทีละช่อง">
              ${(['up', 'left', 'right', 'down'] as Direction[]).map(d => `<button id="move-${d}" data-world="move" data-dir="${d}" class="dpad-${d}" aria-label="${dirLabel[d]}">${icon(d)}</button>`).join('')}
              <button id="rest" data-world="rest" class="dpad-center" aria-label="พักที่แคมป์ ฟื้นเลือดและชุบทุกคน">${icon('camp')}<small>พัก</small></button>
            </div>
          </div>
          <p id="world-save" class="world-save"></p>
        </aside>
      </div>
      <dialog id="world-info" aria-labelledby="world-info-title"><div class="info-header"><h2 id="world-info-title">การเดินทาง</h2><button data-world="info-close" class="quiet" aria-label="ปิดข้อมูล">✕</button></div><div class="info-content" id="world-info-content"></div></dialog>`;
    root.addEventListener('click', e => {
      const el = e.target as HTMLElement;
      const button = el.closest<HTMLButtonElement>('button[data-world]');
      if (button && !button.disabled) {
        switch (button.dataset.world) {
          case 'move': this.input(button.dataset.dir as Direction); break;
          case 'rest': if (!this.view?.locked) this.host.rest(); break;
          case 'info': this.renderInfo(); root.querySelector<HTMLDialogElement>('#world-info')!.showModal(); break;
          case 'info-close': root.querySelector<HTMLDialogElement>('#world-info')!.close(); break;
          case 'new-now': this.host.newExpedition(); break;
          case 'new': if (this.confirmNew) { this.confirmNew = false; root.querySelector<HTMLDialogElement>('#world-info')!.close(); this.host.newExpedition(); } else { this.confirmNew = true; this.renderInfo(); root.querySelector<HTMLElement>('#new-expedition')?.focus(); } break;
        }
        return;
      }
      const tile = el.closest<HTMLElement>('.tile.adjacent');
      if (tile && this.view) {
        const x = Number(tile.dataset.x), y = Number(tile.dataset.y); const p = this.view.state.position;
        this.input(x > p.x ? 'right' : x < p.x ? 'left' : y > p.y ? 'down' : 'up');
      }
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

  private input(dir: Direction): void { if (this.view && !this.view.locked && !this.view.state.completed) this.host.move(dir); }

  private cell(p: Point): string {
    const tile = tileAt(this.map, p)!;
    const content = tile.kind === 'camp' ? icon('camp') : tile.kind === 'goal' ? icon('goal') : tile.kind === 'start' ? icon('flag') : tile.kind === 'boss' ? `<span class="boss-mark">${portrait('brute')}</span>` : '';
    return `<div class="tile t-${tile.kind} z-${tile.zoneId || 'none'} fog" data-x="${p.x}" data-y="${p.y}">${content}</div>`;
  }

  render(view: WorldView): void {
    this.view = view; const s = view.state;
    const tile = tileAt(this.map, s.position)!; const zone = zoneOf(this.map, tile.zoneId);
    this.root.querySelector('#zone-name')!.textContent = tile.kind === 'camp' ? 'แคมป์พักแรม' : zone?.name ?? '';
    const chance = encounterChance(s, this.map);
    const chip = this.root.querySelector<HTMLElement>('#danger-chip')!;
    chip.dataset.level = chance === 0 ? 'safe' : chance < 15 ? 'low' : chance < 30 ? 'mid' : 'high';
    chip.innerHTML = chance === 0 ? `${icon('safe')}<span>พื้นที่ปลอดภัย</span>` : `${icon('danger')}<span>โอกาสพบศัตรู <b>${chance}%</b></span>`;
    chip.setAttribute('aria-label', chance === 0 ? 'พื้นที่ปลอดภัย ไม่พบศัตรู' : `โอกาสพบศัตรูในก้าวถัดไปประมาณ ${chance} เปอร์เซ็นต์`);
    const grid = this.root.querySelector<HTMLElement>('#map-grid')!;
    grid.querySelectorAll<HTMLElement>('.tile').forEach(el => {
      const p = { x: Number(el.dataset.x), y: Number(el.dataset.y) };
      el.classList.toggle('fog', !isRevealed(s, this.map, p));
      el.classList.toggle('adjacent', !view.locked && !s.completed && Math.abs(p.x - s.position.x) + Math.abs(p.y - s.position.y) === 1 && tileAt(this.map, p)!.kind !== 'wall');
      if (el.classList.contains('t-boss')) el.classList.toggle('cleared', s.bossDefeated);
    });
    grid.querySelector<HTMLElement>('#party-token')!.style.setProperty('--x', String(s.position.x));
    grid.querySelector<HTMLElement>('#party-token')!.style.setProperty('--y', String(s.position.y));
    this.root.querySelector('#world-party')!.innerHTML = this.heroes.map(h => {
      const hp = s.hp[h.id] ?? 0; const text = heroText[h.id]!;
      return `<div class="world-hero ${hp <= 0 ? 'fallen' : ''}" id="world-hero-${h.id}">${portrait(h.id)}<span><b>${text.name}</b><small>${hp <= 0 ? 'ล้มแล้ว' : `HP ${hp}/${h.maxHp}`}</small><span class="hp-track"><span style="width:${hp / h.maxHp * 100}%"></span></span></span></div>`;
    }).join('');
    this.root.querySelector('#world-goal')!.innerHTML = `<h2>เป้าหมาย</h2><ul>
      <li class="${s.tutorialDone ? 'done' : ''}">ผ่านการปะทะครั้งแรก</li>
      <li class="${s.camp ? 'done' : ''}">พักที่แคมป์ ${icon('camp')}</li>
      <li class="${s.bossDefeated ? 'done' : ''}">ชนะผู้คุมรอยแยก</li>
      <li class="${s.completed ? 'done' : ''}">ไปถึงประตูรอยแยก ${icon('goal')}</li></ul>
      <p>เดิน ${s.steps} ก้าว · ชนะ ${s.wins} · แพ้ ${s.defeats}</p>`;
    const message = this.root.querySelector('#world-message')!;
    if (message.textContent !== view.message) message.textContent = view.message;
    for (const d of ['up', 'down', 'left', 'right'] as Direction[]) this.root.querySelector<HTMLButtonElement>(`#move-${d}`)!.disabled = view.locked || s.completed;
    const restButton = this.root.querySelector<HTMLButtonElement>('#rest')!;
    restButton.disabled = view.locked || !canRest(s, this.map);
    restButton.classList.toggle('ready', !restButton.disabled);
    this.root.querySelector('#world-save')!.textContent = view.saved ? 'บันทึกอัตโนมัติบนเครื่องนี้' : 'เล่นได้ แต่บันทึกบนเครื่องนี้ไม่ได้';
    const banner = this.root.querySelector<HTMLElement>('#world-banner')!;
    banner.hidden = !view.banner;
    banner.innerHTML = view.banner ? `<div class="banner-card"><p class="eyebrow">${view.banner.eyebrow}</p><h2>${view.banner.title}</h2><p>${view.banner.detail}</p>${s.completed ? '<button data-world="new-now" id="new-expedition-banner" class="primary">เริ่มการเดินทางใหม่</button>' : ''}</div>` : '';
    this.layout();
  }

  // Camera: keep the party centred, clamped to the map edges.
  private layout(): void {
    const viewport = this.root.querySelector<HTMLElement>('#map-viewport')!; const grid = this.root.querySelector<HTMLElement>('#map-grid')!;
    if (!this.view || !viewport.clientWidth) return;
    const w = viewport.clientWidth, h = viewport.clientHeight;
    const size = Math.max(36, Math.min(64, Math.floor(Math.min(w, h) / 7)));
    grid.style.setProperty('--tile', `${size}px`);
    const mapW = this.width * size, mapH = this.map.rows.length * size; const p = this.view.state.position;
    const clamp = (v: number, view: number, total: number) => total <= view ? (view - total) / 2 : Math.max(view - total, Math.min(0, v));
    grid.style.transform = `translate(${clamp(w / 2 - (p.x + .5) * size, w, mapW)}px, ${clamp(h / 2 - (p.y + .5) * size, h, mapH)}px)`;
  }

  private renderInfo(): void {
    const s = this.view?.state;
    this.root.querySelector('#world-info-content')!.innerHTML = `
      <section class="world-rules"><h3>เดินทีละช่อง</h3><p>แตะช่องที่อยู่ติดกัน ใช้ปุ่มลูกศร หรือแป้น ←↑↓→ / WASD ทุกก้าวในพื้นที่อันตรายมีโอกาสพบศัตรู ตัวเลขบนแถบด้านบนคือโอกาสของก้าวถัดไป ยิ่งเดินโดยไม่เจอ โอกาสยิ่งเพิ่ม และกลับไปต่ำสุดเมื่อพบศัตรูหรือพักที่แคมป์</p>
      <h3>เลือดติดตัว</h3><p>จบศึกแล้วเลือดไม่ฟื้นเอง สมาชิกที่ล้มยังล้มอยู่จนกว่าจะพักที่แคมป์ ศึกถัดไปเริ่มด้วยเลือดที่เหลือ</p>
      <h3>แคมป์ ${icon('camp')}</h3><p>ยืนบนแคมป์แล้วกด “พัก” เพื่อฟื้นเลือดเต็มและชุบทุกคน แคมป์ที่พักล่าสุดคือจุดกลับเมื่อแพ้ เกมบันทึกทุกก้าวอัตโนมัติ</p>
      <h3>เมื่อแพ้</h3><p>ทีมกลับแคมป์ที่พักล่าสุด (หรือจุดเริ่ม) และฟื้นเลือดเต็ม ศัตรูที่ชนะคุณไม่ตามมา</p>
      <h3>ผู้คุมรอยแยก ${portrait('brute')}</h3><p>บอสเฝ้าทางเดียวไปประตูรอยแยก ${icon('goal')} เดินชนบอสเพื่อเริ่มศึก ชนะแล้วเดินไปที่ประตูเพื่อจบการเดินทาง</p></section>
      ${s ? `<p class="world-stats">เดินแล้ว ${s.steps} ก้าว · ชนะ ${s.wins} ศึก · แพ้ ${s.defeats} ครั้ง</p>` : ''}
      <button data-world="new" id="new-expedition" class="${this.confirmNew ? 'danger-button' : 'quiet'}">${this.confirmNew ? 'ยืนยัน: ลบการเดินทางนี้แล้วเริ่มใหม่' : 'เริ่มการเดินทางใหม่'}</button>`;
  }
}
