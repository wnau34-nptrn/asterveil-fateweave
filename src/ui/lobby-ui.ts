import type { HeroDefinition } from '../core/battle/types';
import { boardOffers, dismissReason, groupOf, hireReason, upgradeCost, upgradeReason, type Group } from '../core/world/profile';
import { COMPANY_CAP, PARTY_SLOTS, RESERVE_SLOTS, type MapDefinition, type Profile } from '../core/world/types';
import { starred, type EncounterLookup } from '../core/world/world';
import { actorArt, actorFootOrigins, lobbyArt, lobbyPose, unitsUrl, type LobbyPose } from '../game/visuals/assets';
import { icon } from './icons';
import { commanderBadge } from './commander-ui';
import { heroText, passiveText } from './th';
import { portrait, starRow } from './world-ui';

export interface LobbyHost { hire(index: number): void; upgrade(id: string): void; dismiss(id: string): void; place(id: string, group: Group, other?: string): void; depart(): void; home(): void }
export interface LobbyView { profile: Profile; message: string; saved: boolean; cheer?: string }
const outcomeText = { complete: 'สำเร็จการเดินทาง', withdrawn: 'ถอนตัวกลับค่าย', wiped: 'ทีมล้มหมด · การเดินทางล้มเหลว' } as const;
const groupName: Record<Group, string> = { deployed: 'ลงสนาม', reserve: 'สำรอง', bench: 'ในค่าย' };

// Lobby (ค่ายทหารรับจ้าง) between expeditions: hire, upgrade, dismiss, choose the 4 + 4 to
// bring, and depart. It owns no rules; every action goes to the host, which saves first.
export class LobbyUI {
  private view: LobbyView | undefined;
  // The team or hire sheet floats over the camp; the scene alone shows when it is closed.
  private sheet: 'team' | 'hire' | null = null;
  private sceneDrawn = '';
  private picked: string | undefined;
  private confirmDismiss = false;
  constructor(private readonly root: HTMLElement, private readonly map: MapDefinition, private readonly lookup: EncounterLookup, private readonly heroes: readonly HeroDefinition[], private readonly host: LobbyHost) {
    // Escape closes the sheet even after a redraw moved focus out of it (only while the lobby shows).
    root.ownerDocument.addEventListener('keydown', e => { if (e.key === 'Escape' && this.sheet && !root.hidden) { e.preventDefault(); this.closeSheet(); } });
    root.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-lobby]');
      if (!b || b.disabled) return;
      const id = b.dataset.hero;
      switch (b.dataset.lobby) {
        case 'tab': this.sheet = b.dataset.tab as 'team' | 'hire'; this.picked = undefined; this.confirmDismiss = false; this.draw(); this.focus(`#lobby-tab-${this.sheet}`); break;
        case 'close': this.closeSheet(); break;
        case 'pick': this.pick(id, b.dataset.group as Group); break;
        case 'hire': this.host.hire(Number(b.dataset.index)); break;
        case 'upgrade': if (this.picked) this.host.upgrade(this.picked); break;
        case 'dismiss':
          if (!this.picked) break;
          if (!this.confirmDismiss) { this.confirmDismiss = true; this.draw(); this.focus('#lobby-dismiss'); break; }
          this.confirmDismiss = false; { const target = this.picked; this.picked = undefined; this.host.dismiss(target); } break;
        case 'depart': this.host.depart(); break;
        case 'home': this.host.home(); break;
      }
    });
  }
  private closeSheet(): void { const was = this.sheet; this.sheet = null; this.picked = undefined; this.confirmDismiss = false; this.draw(); if (was) this.focus(`#lobby-tab-${was}`); }
  render(view: LobbyView): void {
    this.view = view;
    if (this.picked && !view.profile.company.includes(this.picked)) this.picked = undefined;
    this.draw();
  }
  private escape(text: string): string { return text.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!); }
  private focus(sel: string): void { this.root.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true }); }
  // Tap a member, then a member or an empty slot in another group to swap or move.
  private pick(id: string | undefined, group: Group): void {
    const p = this.view!.profile; this.confirmDismiss = false;
    const from = this.picked && groupOf(p, this.picked);
    if (!this.picked || from === group) { this.picked = id && id !== this.picked ? id : undefined; this.draw(); if (id) this.focus(`#lobby-member-${this.picked ?? id}`); return; }
    const moving = this.picked; this.picked = undefined;
    this.host.place(moving, group, id);
    this.focus(`#lobby-member-${moving}`);
  }
  private hero(id: string): HeroDefinition { return starred(this.heroes.find(h => h.id === id)!, this.view!.profile.members[id]?.stars ?? 1, this.map); }
  private stars(n: number): string { return starRow(n, this.map.company.maxStars); }

  private toastShown = '';
  private draw(): void {
    const p = this.view!.profile; const last = p.last;
    const ready = p.party.deployed.length > 0;
    // A notice toasts once; redraws (tab switches, picks) keep it settled instead of replaying it.
    const notice = last ? `${last.outcome}:${last.steps}:${last.ore}:${p.expeditions}` : this.view!.message;
    const toast = notice && notice !== this.toastShown ? 'toast-new' : 'toast-seen'; this.toastShown = notice;
    // The camp scene fills the screen and is rebuilt only when who stands there (or how) changes.
    if (!this.root.querySelector('.lobby-scene-host')) this.root.innerHTML = '<div class="lobby-shell"><div class="lobby-scene-host"></div><div class="lobby-hud"></div></div>';
    const scene = this.scene(p);
    if (scene !== this.sceneDrawn) { this.root.querySelector('.lobby-scene-host')!.innerHTML = scene; this.sceneDrawn = scene; }
    const menu = (id: 'team' | 'hire', glyph: Parameters<typeof icon>[0], label: string, badge: string) =>
      `<button id="lobby-tab-${id}" data-lobby="tab" data-tab="${id}" class="lobby-menu-button${this.sheet === id ? ' active' : ''}" aria-expanded="${this.sheet === id}" aria-controls="lobby-sheet">${icon(glyph)}<span>${label}</span>${badge ? `<small>${badge}</small>` : ''}</button>`;
    const openOffers = boardOffers(p, this.map, this.lookup).filter((_, i) => !hireReason(p, this.map, this.lookup, i)).length;
    this.root.querySelector('.lobby-hud')!.innerHTML = `
      <header class="lobby-top"><button data-lobby="home" class="round-glass" aria-label="กลับหน้าแรก">${icon('left')}</button>
        ${p.commander ? commanderBadge(p.commander) : ''}<div class="lobby-who"><p class="eyebrow">ค่ายทหารรับจ้าง · ${this.view!.saved ? 'บันทึกอัตโนมัติ' : 'บันทึกบนเครื่องนี้ไม่ได้'}</p><h1 id="lobby-commander">${p.commander ? this.escape(p.commander.name) : 'เตรียมทีมก่อนออกเดินทาง'}</h1></div>
        <div class="lobby-bank" aria-label="คลัง แร่ดาว ${p.bank.ore} ตราสัญญา ${p.bank.seal}"><span class="glass-capsule">${icon('ore')}<b>${p.bank.ore}</b></span><span class="glass-capsule">${icon('seal')}<b>${p.bank.seal}</b></span></div></header>
      ${last ? `<p class="lobby-result glass-capsule ${toast}" data-outcome="${last.outcome}" role="status">${icon(last.outcome === 'wiped' ? 'danger' : last.outcome === 'complete' ? 'star' : 'camp')}<span><b>${outcomeText[last.outcome]}</b> · เดิน ${last.steps} ก้าว ชนะ ${last.wins} ศึก · ได้แร่ดาว ${last.ore}${last.seal ? ` ตราสัญญา ${last.seal}` : ''}${last.outcome === 'wiped' ? ' (เก็บได้ครึ่งเดียว)' : ''}</span></p>`
        : this.view!.message ? `<p class="lobby-result glass-capsule ${toast}" role="status"><span>${this.view!.message}</span></p>` : ''}
      ${this.sheet ? `<section id="lobby-sheet" class="lobby-sheet" role="dialog" aria-modal="false" aria-labelledby="lobby-sheet-title">
        <div class="lobby-sheet-head"><h2 id="lobby-sheet-title">${this.sheet === 'team' ? `${icon('flag')} จัดทีม <small>${p.company.length}/${COMPANY_CAP}</small>` : `${icon('ore')} ป้ายจ้างทหารรับจ้าง`}</h2>
          <button data-lobby="close" class="round-glass" aria-label="ปิด">${icon('close')}</button></div>
        <div class="lobby-content">${this.sheet === 'team' ? this.team(p) : this.board(p)}</div></section>` : ''}
      <footer class="lobby-bottom">
        <nav class="lobby-menu" aria-label="ค่าย">${menu('team', 'flag', 'ทีม', `${p.party.deployed.length}+${p.party.reserve.length}`)}${menu('hire', 'ore', 'จ้าง', openOffers ? String(openOffers) : '')}</nav>
        <button id="lobby-depart" data-lobby="depart" class="primary"${ready ? '' : ' disabled'}>${icon('map')}<span>ออกเดินทาง<small>${this.map.name} · ${p.party.deployed.length}+${p.party.reserve.length} คน</small></span></button>
      </footer>`;
  }

  // Warm camp scene (ART-UI-LOBBY-001): the brought team gathers around the fire. Front members sit on
  // logs, the middle pair has a character moment, the back alternates; the member just hired or upgraded
  // cheers, and everyone cheers after a completed expedition. Right of the fire the frames are mirrored.
  private scene(p: Profile): string {
    const ids = [...p.party.deployed, ...p.party.reserve].filter(id => lobbyPose(id, 'sit') ?? actorArt[id]);
    const spots = [[18, 0, 1], [33, 1, .92], [67, 1, .92], [82, 0, 1], [8, 2, .78], [43, 2, .74], [57, 2, .74], [92, 2, .78]] as const;
    const party = p.last?.outcome === 'complete';
    const units = ids.slice(0, spots.length).map((id, i) => {
      const [x, depth, scale] = spots[i]!;
      const pose: LobbyPose = party || id === this.view!.cheer ? 'cheer' : depth === 0 ? 'sit' : depth === 1 ? 'idle_alt' : i % 2 ? 'idle_alt' : 'sit';
      const frame = lobbyPose(id, pose);
      // Pose frames share the battle frames' 512 px sole line (y=496); without one, fall back to the idle frame.
      const art = frame ? { url: frame.url, fx: frame.column * 50, fy: frame.row / (frame.rows - 1) * 100, size: `300% ${frame.rows * 100}%`, sole: 15 / 512 * 100 }
        : { url: unitsUrl(actorArt[id]!.sheet), fx: (actorArt[id]!.frame % 2) * 100, fy: Math.floor(actorArt[id]!.frame / 2) * 50, size: '200% 300%', sole: (1 - (actorFootOrigins[id] ?? 1)) * 100 };
      return `<span class="lobby-unit" data-depth="${depth}" data-actor="${id}" data-pose="${frame ? pose : 'idle'}" style="--ux:${x}%;--us:${scale};--fx:${art.fx}%;--fy:${art.fy}%;--fs:${art.size};--flip:${x > 50 ? -1 : 1};--sole:${art.sole.toFixed(2)}%;animation-delay:${i * -620}ms"><i style="background-image:url(${art.url})"></i></span>`;
    }).join('');
    return `<div class="lobby-scene" aria-hidden="true" style="--lobby-bg:url(${lobbyArt('lobby_bg')});--lobby-fg:url(${lobbyArt('lobby_fg')});--lobby-pit:url(${lobbyArt('lobby_firepit')})"><div class="lobby-fire"><b></b><i></i><i></i><i></i></div>${units}<div class="lobby-fg"></div><div class="lobby-embers">${'<i></i>'.repeat(7)}</div></div>`;
  }
  private card(p: Profile, id: string | undefined, group: Group, slot: number): string {
    if (!id) return `<button class="team-card empty${this.picked ? ' target' : ''}" data-lobby="pick" data-group="${group}" aria-label="${groupName[group]} ช่อง ${slot + 1} ว่าง"${this.picked ? '' : ' disabled'}><span>ว่าง</span></button>`;
    const h = this.hero(id); const text = heroText[id]!; const lane = h.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง';
    return `<button id="lobby-member-${id}" class="team-card" data-lobby="pick" data-hero="${id}" data-group="${group}" aria-pressed="${this.picked === id}"
      aria-label="${groupName[group]}${group === 'deployed' ? ` ช่อง ${slot + 1}` : ''} · ${text.name} ${p.members[id]!.stars} ดาว ${text.role} ${lane} เลือด ${h.maxHp}">${group === 'deployed' ? `<i class="slot-no">${slot + 1}</i>` : ''}${portrait(id)}<b>${text.name}</b>${this.stars(p.members[id]!.stars)}<small>เลือด ${h.maxHp}</small><small class="lane">${text.role} · ${lane}</small></button>`;
  }
  private team(p: Profile): string {
    const row = (ids: string[], group: Group, size: number) => Array.from({ length: size }, (_, i) => this.card(p, ids[i], group, i)).join('');
    const bench = p.company.filter(id => groupOf(p, id) === 'bench');
    return `<h3>${icon('flag')} ลงสนาม <span class="camp-embers">ศัตรูเล็งตามหมายเลขช่อง</span></h3><div class="team-grid">${row(p.party.deployed, 'deployed', PARTY_SLOTS)}</div>
      <h3>${icon('camp')} สำรอง <span class="camp-embers">พาเข้าด่าน สลับได้ที่แคมป์</span></h3><div class="team-grid">${row(p.party.reserve, 'reserve', RESERVE_SLOTS)}</div>
      <h3>${icon('rest')} ในค่าย <span class="camp-embers">ไม่ได้เข้าด่านรอบนี้</span></h3>
      <div class="team-grid bench">${bench.map((id, i) => this.card(p, id, 'bench', i)).join('')}${this.picked && groupOf(p, this.picked) !== 'bench' ? this.card(p, undefined, 'bench', bench.length) : ''}${!bench.length && !this.picked ? '<p class="camp-note">ทุกคนอยู่ในทีมที่จะพาไปแล้ว</p>' : ''}</div>
      ${this.picked ? this.memberPanel(p, this.picked) : ''}
      ${this.picked ? `<p class="camp-note picked-hint" id="lobby-hint">เลือก${heroText[this.picked]!.name}แล้ว · แตะคนหรือช่องว่างในกลุ่มอื่นเพื่อสลับ แตะซ้ำเพื่อยกเลิก</p>`
        : `<details class="lobby-help" id="lobby-hint"><summary>${icon('info')} วิธีจัดทีม</summary><p>แตะสมาชิกเพื่อดูการอัปดาว หรือแตะต่อที่กลุ่มอื่นเพื่อสลับและจัดทีม</p></details>`}`;
  }
  private memberPanel(p: Profile, id: string): string {
    const m = p.members[id]!; const cost = upgradeCost(p, this.map, id); const reason = upgradeReason(p, this.map, id);
    const need = cost ? cost.dupes + cost.seals : 0;
    const why: Record<string, string> = { maxed: 'ดาวเต็มแล้ว', dupes: 'ตัวซ้ำไม่พอ', ore: 'แร่ดาวไม่พอ' };
    const label = !cost ? 'ดาวเต็มแล้ว' : reason ? `${why[reason]} · ★${m.stars + 1} ใช้ตัวซ้ำ ${need}${cost.seals ? ' (ตราแทนได้ 1)' : ''} แร่ ${cost.ore}`
      : `อัปเป็น ★${m.stars + 1} · ตัวซ้ำ ${cost.dupes}${cost.seals ? ' + ตรา 1' : ''} · แร่ ${cost.ore}`;
    const last = dismissReason(p, id) === 'last';
    return `<div class="member-panel" aria-live="polite"><p><b>${heroText[id]!.name}</b> ${this.stars(m.stars)} <span>ตัวซ้ำที่เก็บไว้ ${m.dupes}</span></p>${this.unlocks(id, m.stars)}
      <div class="member-actions"><button id="lobby-upgrade" data-lobby="upgrade" class="primary"${reason ? ' disabled' : ''}>${label}</button>
      <button id="lobby-dismiss" data-lobby="dismiss" class="danger-button"${last ? ' disabled' : ''}>${last ? 'ต้องมีคนลงสนาม 1 คน' : this.confirmDismiss ? `ยืนยันเลิกจ้าง · ดาวหาย +${this.map.company.dismissRefund} แร่` : 'เลิกจ้าง'}</button></div></div>`;
  }
  // What ★3 (a third skill) and ★5 (a passive) unlock for this class, and whether they are open yet.
  private unlocks(id: string, stars: number): string {
    const unlocks = this.heroes.find(h => h.id === id)?.unlocks; if (!unlocks) return '';
    const data = this.lookup(this.map.tutorialEncounterId)!; const skill = data.skills[unlocks.skill]; const passive = passiveText[unlocks.passive];
    const row = (need: number, iconName: Parameters<typeof icon>[0], name: string, help: string) =>
      `<li class="${stars >= need ? 'unlocked' : 'locked'}"><span class="unlock-star">★${need}</span>${icon(iconName)}<b>${name}</b><small>${stars >= need ? 'ปลดล็อกแล้ว' : `ปลดล็อกที่ ★${need}`} · ${help}</small></li>`;
    return `<ul class="member-unlocks" aria-label="สิ่งที่ปลดล็อกจากดาว">${row(3, unlocks.skill, skill.name, 'สกิลใหม่ในการต่อสู้')}${row(5, 'starFilled', passive.name, passive.help(data))}</ul>`;
  }
  private board(p: Profile): string {
    const why: Record<string, string> = { taken: 'จ้างแล้ว', ore: 'แร่ดาวไม่พอ', full: `ค่ายเต็ม ${COMPANY_CAP} คน`, maxed: 'ดาวเต็มแล้ว' };
    return `<p class="hire-cost">จ้างคนละ ${icon('ore')} ${this.map.company.hireCost} · ป้ายเปลี่ยนใหม่เมื่อกลับจากการเดินทาง</p>
      <ul class="hire-list">${boardOffers(p, this.map, this.lookup).map((id, i) => {
        const reason = hireReason(p, this.map, this.lookup, i); const h = this.hero(id); const text = heroText[id]!; const m = p.members[id];
        const status = m ? `${this.stars(m.stars)} ตัวซ้ำ ${m.dupes} · มีในค่าย` : 'ใหม่ · ★1';
        return `<li class="${reason === 'taken' ? 'taken' : ''}">${portrait(id)}<span><b>${text.name}</b><small>${text.role} · ${h.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'} · ${text.help}</small><small class="hire-status">${status}</small></span>
          <button id="hire-${i}" data-lobby="hire" data-index="${i}" class="secondary"${reason ? ' disabled' : ''} aria-label="จ้าง${text.name} ใช้แร่ดาว ${this.map.company.hireCost}">${reason ? why[reason] ?? 'จ้างไม่ได้' : `จ้าง · ${this.map.company.hireCost}`}</button></li>`;
      }).join('')}</ul>
      <details class="lobby-help"><summary>${icon('info')} วิธีจ้างและอัปดาว</summary><p>ทุกคนเริ่ม ★1 · จ้างคนที่มีอยู่แล้วจะได้ตัวซ้ำไว้อัปดาวในแท็บทีม · ป้ายเปลี่ยนใหม่ทุกครั้งที่กลับจากการเดินทาง</p></details>`;
  }
}
