import type { HeroDefinition } from '../core/battle/types';
import { boardOffers, dismissReason, equipReason, groupOf, hireReason, talentPoints, talentReason, talentsSpent, upgradeCost, upgradeReason, type Group } from '../core/world/profile';
import { salvageValue } from '../core/world/equipment';
import { COMPANY_CAP, GEAR_SLOTS, PARTY_SLOTS, RESERVE_SLOTS, type GearSlot, type MapDefinition, type Profile, type TalentNode } from '../core/world/types';
import { expToNext, starred, type EncounterLookup } from '../core/world/world';
import { actorArt, actorFootOrigins, lobbyArt, lobbyPose, unitsUrl, type LobbyPose } from '../game/visuals/assets';
import { icon } from './icons';
import { commanderBadge } from './commander-ui';
import { heroText, itemLines, itemName, itemOwner, passiveText, rarityText, setText, slotIcon, slotText, statName, talentBranches, talentHelp, wornSets } from './th';
import { enhanceCost, enhanceReason, findItem, fuseMaterials, fuseReason, rerollReason } from '../core/world/forge';
import { portrait, starRow } from './world-ui';

export interface LobbyHost { hire(index: number): void; upgrade(id: string): void; dismiss(id: string): void; place(id: string, group: Group, other?: string): void; talent(id: string, node: TalentNode): void; resetTalents(id: string): void;
  equip(id: string, uid: number): void; unequip(id: string, slot: GearSlot): void; salvage(uids: number[]): void;
  enhance(uid: number): void; fuse(uid: number): void; reroll(uid: number, index: number): void; depart(): void; home(): void }
export interface LobbyView { profile: Profile; message: string; saved: boolean; cheer?: string }
const outcomeText = { complete: 'สำเร็จการเดินทาง', withdrawn: 'ถอนตัวกลับค่าย', wiped: 'ทีมล้มหมด · การเดินทางล้มเหลว' } as const;
const groupName: Record<Group, string> = { deployed: 'ลงสนาม', reserve: 'สำรอง', bench: 'ในค่าย' };

// Lobby (ค่ายทหารรับจ้าง) between expeditions: hire, upgrade, dismiss, choose the 4 + 4 to
// bring, and depart. It owns no rules; every action goes to the host, which saves first.
export class LobbyUI {
  private view: LobbyView | undefined;
  // The team, hire or talent-tree sheet floats over the camp; the scene alone shows when it is closed.
  // The tree sheet is its own window, opened from a member in the team sheet (`picked`).
  // The equipment sheet (2D-2) works the same way.
  // The forge (2D-4) is a third menu sheet.
  private sheet: 'team' | 'hire' | 'tree' | 'gear' | 'forge' | null = null;
  private forgeUid: number | undefined;
  private gearSlot: GearSlot | undefined;
  private confirmSalvage: number | undefined;
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
        case 'tab': this.sheet = b.dataset.tab as 'team' | 'hire' | 'forge'; this.picked = undefined; this.confirmDismiss = false; this.draw(); this.focus(`#lobby-tab-${this.sheet}`); break;
        case 'close': this.closeSheet(); break;
        case 'pick': this.pick(id, b.dataset.group as Group); break;
        case 'hire': this.host.hire(Number(b.dataset.index)); break;
        case 'upgrade': if (this.picked) this.host.upgrade(this.picked); break;
        case 'dismiss':
          if (!this.picked) break;
          if (!this.confirmDismiss) { this.confirmDismiss = true; this.draw(); this.focus('#lobby-dismiss'); break; }
          this.confirmDismiss = false; { const target = this.picked; this.picked = undefined; this.host.dismiss(target); } break;
        case 'tree': case 'gear': if (id ?? this.picked) {
          const kind = b.dataset.lobby as 'tree' | 'gear'; this.picked = id ?? this.picked; this.sheet = kind; this.confirmDismiss = false; this.confirmSalvage = undefined;
          this.draw(); this.focus(id ? `#${kind}-member-${id}` : '#lobby-sub-back');
        } break;
        case 'sub-back': { const was = this.sheet; this.sheet = 'team'; this.draw(); this.focus(was === 'gear' ? '#lobby-gear-open' : '#lobby-tree-open'); break; }
        case 'slot': { const slot = b.dataset.slot as GearSlot; this.gearSlot = this.gearSlot === slot ? undefined : slot; this.confirmSalvage = undefined; this.draw(); this.focus(`#gear-slot-${slot}`); break; }
        case 'equip': if (this.picked) { this.confirmSalvage = undefined; this.host.equip(this.picked, Number(b.dataset.uid)); this.focus(`#gear-slot-${this.gearSlot ?? ''}`); } break;
        case 'unequip': if (this.picked && this.gearSlot) { this.host.unequip(this.picked, this.gearSlot); this.focus(`#gear-slot-${this.gearSlot}`); } break;
        case 'salvage': {
          const uid = Number(b.dataset.uid); const item = this.view!.profile.items.find(i => i.uid === uid);
          // Rare and better items need a second press.
          if (item && item.rarity >= 2 && this.confirmSalvage !== uid) { this.confirmSalvage = uid; this.draw(); this.focus(`#salvage-${uid}`); break; }
          this.confirmSalvage = undefined; this.host.salvage([uid]); this.focus('#lobby-sub-back'); break;
        }
        case 'forge-pick': this.forgeUid = Number(b.dataset.uid); this.draw(); this.focus('#forge-enhance'); break;
        case 'enhance': if (this.forgeUid) { this.host.enhance(this.forgeUid); this.focus('#forge-enhance'); } break;
        case 'fuse': if (this.forgeUid) { this.host.fuse(this.forgeUid); this.focus('#forge-fuse'); } break;
        case 'reroll': if (this.forgeUid) { const i = Number(b.dataset.index); this.host.reroll(this.forgeUid, i); this.focus(`#forge-reroll-${i}`); } break;
        case 'salvage-common': this.host.salvage(this.view!.profile.items.filter(i => i.rarity === 0).map(i => i.uid)); this.focus('#lobby-sub-back'); break;
        case 'talent': if (this.picked) { const node = b.dataset.node as TalentNode; this.host.talent(this.picked, node); this.focus(`#talent-${node}`); } break;
        case 'reset-talents': if (this.picked) { this.host.resetTalents(this.picked); this.focus('#lobby-tree-back'); } break;
        case 'depart': this.host.depart(); break;
        case 'home': this.host.home(); break;
      }
    });
  }
  private closeSheet(): void { const was = this.sheet === 'tree' || this.sheet === 'gear' ? 'team' : this.sheet; this.sheet = null; this.picked = undefined; this.confirmDismiss = false; this.draw(); if (was) this.focus(`#lobby-tab-${was}`); }
  render(view: LobbyView): void {
    this.view = view;
    if (this.picked && !view.profile.company.includes(this.picked)) this.picked = undefined;
    if ((this.sheet === 'tree' || this.sheet === 'gear') && !this.picked) this.sheet = 'team';
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
  private hero(id: string): HeroDefinition { const m = this.view!.profile.members[id]; return starred(this.heroes.find(h => h.id === id)!, m?.stars ?? 1, this.map, m?.level ?? 1, m?.talents, m?.gear); }
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
    const menu = (id: 'team' | 'hire' | 'forge', glyph: Parameters<typeof icon>[0], label: string, badge: string) =>
      `<button id="lobby-tab-${id}" data-lobby="tab" data-tab="${id}" class="lobby-menu-button${this.sheet === id || id === 'team' && (this.sheet === 'tree' || this.sheet === 'gear') ? ' active' : ''}" aria-expanded="${this.sheet === id || id === 'team' && (this.sheet === 'tree' || this.sheet === 'gear')}" aria-controls="lobby-sheet">${icon(glyph)}<span>${label}</span>${badge ? `<small>${badge}</small>` : ''}</button>`;
    const openOffers = boardOffers(p, this.map, this.lookup).filter((_, i) => !hireReason(p, this.map, this.lookup, i)).length;
    this.root.querySelector('.lobby-hud')!.innerHTML = `
      <header class="lobby-top"><button data-lobby="home" class="round-glass" aria-label="กลับหน้าแรก">${icon('left')}</button>
        ${p.commander ? commanderBadge(p.commander) : ''}<div class="lobby-who"><p class="eyebrow">ค่ายทหารรับจ้าง · ${this.view!.saved ? 'บันทึกอัตโนมัติ' : 'บันทึกบนเครื่องนี้ไม่ได้'}</p><h1 id="lobby-commander">${p.commander ? this.escape(p.commander.name) : 'เตรียมทีมก่อนออกเดินทาง'}</h1></div>
        <div class="lobby-bank" aria-label="คลัง แร่ดาว ${p.bank.ore} ตราสัญญา ${p.bank.seal} ผงม่านเวล ${p.bank.dust}"><span class="glass-capsule">${icon('ore')}<b>${p.bank.ore}</b></span><span class="glass-capsule">${icon('seal')}<b>${p.bank.seal}</b></span><span class="glass-capsule">${icon('dust')}<b>${p.bank.dust}</b></span></div></header>
      ${last ? `<p class="lobby-result glass-capsule ${toast}" data-outcome="${last.outcome}" role="status">${icon(last.outcome === 'wiped' ? 'danger' : last.outcome === 'complete' ? 'star' : 'camp')}<span><b>${outcomeText[last.outcome]}</b> · เดิน ${last.steps} ก้าว ชนะ ${last.wins} ศึก · ได้แร่ดาว ${last.ore}${last.seal ? ` ตราสัญญา ${last.seal}` : ''}${last.outcome === 'wiped' ? ' (เก็บได้ครึ่งเดียว)' : ''}${last.items ? ` · อุปกรณ์ ${last.items} ชิ้น` : ''}${last.salvaged ? ` (คลังเต็ม แยกชิ้นอัตโนมัติ ${last.salvaged})` : ''}</span></p>`
        : this.view!.message ? `<p class="lobby-result glass-capsule ${toast}" role="status"><span>${this.view!.message}</span></p>` : ''}
      ${this.sheet ? `<section id="lobby-sheet" class="lobby-sheet" role="dialog" aria-modal="false" aria-labelledby="lobby-sheet-title">
        <div class="lobby-sheet-head">${this.sheet === 'tree' || this.sheet === 'gear' ? `<button id="lobby-sub-back" data-lobby="sub-back" class="round-glass" aria-label="กลับไปจัดทีม">${icon('left')}</button>` : ''}<h2 id="lobby-sheet-title">${this.sheet === 'team' ? `${icon('flag')} จัดทีม <small>${p.company.length}/${COMPANY_CAP}</small>` : this.sheet === 'tree' ? `${icon('starFilled')} ต้นไม้ความถนัด` : this.sheet === 'gear' ? `${icon('gearBody')} อุปกรณ์ <small>คลัง ${p.items.length}/${this.map.equipment.bagCap}</small>` : this.sheet === 'forge' ? `${icon('dust')} ช่างตีเหล็ก` : `${icon('ore')} ป้ายจ้างทหารรับจ้าง`}</h2>
          <button data-lobby="close" class="round-glass" aria-label="ปิด">${icon('close')}</button></div>
        <div class="lobby-content">${this.sheet === 'team' ? this.team(p) : this.sheet === 'tree' && this.picked ? this.tree(p, this.picked) : this.sheet === 'gear' && this.picked ? this.gear(p, this.picked) : this.sheet === 'forge' ? this.forge(p) : this.board(p)}</div></section>` : ''}
      <footer class="lobby-bottom">
        <nav class="lobby-menu" aria-label="ค่าย">${menu('team', 'flag', 'ทีม', `${p.party.deployed.length}+${p.party.reserve.length}`)}${menu('hire', 'ore', 'จ้าง', openOffers ? String(openOffers) : '')}${menu('forge', 'dust', 'ช่าง', '')}</nav>
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
      aria-label="${groupName[group]}${group === 'deployed' ? ` ช่อง ${slot + 1}` : ''} · ${text.name} ${p.members[id]!.stars} ดาว ${text.role} ${lane} เลือด ${h.maxHp}">${group === 'deployed' ? `<i class="slot-no">${slot + 1}</i>` : ''}${portrait(id)}<b>${text.name}</b>${this.stars(p.members[id]!.stars)}<small>Lv${p.members[id]!.level ?? 1} · เลือด ${h.maxHp}</small><small class="lane">${text.role} · ${lane}</small></button>`;
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
    return `<div class="member-panel" aria-live="polite"><p><b>${heroText[id]!.name}</b> ${this.stars(m.stars)} <span>Lv${m.level ?? 1}${(m.level ?? 1) < this.map.progression.levelCap ? ` · EXP ${m.exp ?? 0}/${expToNext(this.map, m.level ?? 1)}` : ' · เลเวลสูงสุด'} · ตัวซ้ำที่เก็บไว้ ${m.dupes}</span></p>${this.unlocks(id, m.stars)}<div class="member-subs">${this.treeButton(p, id)}${this.gearButton(p, id)}</div>
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
  // A row of company portraits to switch the member shown in a sub-sheet; `badge` marks a member (free points, …).
  private memberPicker(p: Profile, id: string, kind: 'tree' | 'gear', badge: (c: string) => string): string {
    return `<div class="tree-members" role="group" aria-label="เลือกสมาชิก">${p.company.map(c => { const mark = badge(c);
      return `<button id="${kind}-member-${c}" data-lobby="${kind}" data-hero="${c}" class="tree-member" aria-pressed="${c === id}" aria-label="${heroText[c]!.name} Lv${p.members[c]!.level ?? 1}${mark ? ` · ${mark}` : ''}">${portrait(c)}<small>${heroText[c]!.name}</small>${mark ? `<i>${mark}</i>` : ''}</button>`;
    }).join('')}</div>`;
  }
  private gearButton(p: Profile, id: string): string {
    const worn = Object.keys(p.members[id]!.gear ?? {}).length;
    return `<button id="lobby-gear-open" data-lobby="gear" class="secondary tree-toggle">${icon('gearBody')}<span>อุปกรณ์</span><small>ใส่ ${worn}/6</small></button>`;
  }
  // Equipment sheet (2D-2): member picker, six slots, then the bag (filtered by the chosen slot) with equip and salvage.
  private gear(p: Profile, id: string): string {
    const m = p.members[id]!; const h = this.hero(id); const rules = this.map.equipment; const slot = this.gearSlot;
    const picker = this.memberPicker(p, id, 'gear', c => { const n = Object.keys(p.members[c]!.gear ?? {}).length; return n ? `${n}` : ''; });
    const slots = GEAR_SLOTS.map(sl => { const it = m.gear?.[sl];
      return `<button id="gear-slot-${sl}" data-lobby="slot" data-slot="${sl}" class="gear-slot" aria-pressed="${slot === sl}" ${it ? `data-rarity="${it.rarity}"` : ''} aria-label="${slotText[sl]}: ${it ? `${itemName(it)} Lv${it.level}` : 'ว่าง'}">${icon(slotIcon[sl])}<b>${slotText[sl]}</b><small>${it ? `${itemName(it)} Lv${it.level}` : 'ว่าง'}</small></button>`;
    }).join('');
    const worn = slot && m.gear?.[slot];
    const detail = slot ? `<div class="gear-detail">${worn ? `<p><b>${itemName(worn)} Lv${worn.level}</b> · ${itemLines(rules, worn).join(' · ')}</p>
      <button id="gear-unequip" data-lobby="unequip" class="secondary"${p.items.length >= rules.bagCap ? ' disabled' : ''}>${p.items.length >= rules.bagCap ? 'คลังเต็ม ถอดไม่ได้' : 'ถอดเก็บเข้าคลัง'}</button>` : `<p>ยังไม่ได้ใส่${slotText[slot]}</p>`}</div>` : '';
    const bag = p.items.filter(i => !slot || i.slot === slot).sort((a, b) => b.rarity - a.rarity || b.level - a.level);
    const rows = bag.map(i => { const reason = equipReason(p, id, i.uid); const confirm = this.confirmSalvage === i.uid; const v = salvageValue(this.map, i);
      return `<li data-rarity="${i.rarity}"><div><b>${itemName(i)} Lv${i.level}</b><small>${itemLines(rules, i).join(' · ')}</small><small class="gear-owner">${itemOwner(i)}</small></div>
        <span class="gear-actions"><button id="equip-${i.uid}" data-lobby="equip" data-uid="${i.uid}" class="primary"${reason ? ' disabled' : ''}>${reason === 'class' ? 'คนอื่นใช้' : 'ใส่'}</button>
        <button id="salvage-${i.uid}" data-lobby="salvage" data-uid="${i.uid}" class="${confirm ? 'danger-button' : 'secondary'}" aria-label="แยกชิ้น${itemName(i)} ได้แร่ ${v.ore} ผง ${v.dust}">${confirm ? 'ยืนยันแยก' : 'แยก'}</button></span></li>`;
    }).join('');
    const commons = p.items.filter(i => i.rarity === 0).length;
    return `${picker}<p class="gear-stats"><b>${heroText[id]!.name}</b> Lv${m.level ?? 1} · เลือด ${h.maxHp} · พลังโจมตี ${h.attack} · พลังสกิล +${h.skillBonus ?? 0}% · SPD ${h.speed}</p>
      <div class="gear-slots">${slots}</div>${detail}${this.sets(m.gear)}
      <h3>${icon('pack')} คลัง${slot ? ` · ${slotText[slot]}` : ''} <span class="camp-embers">${bag.length} ชิ้น · แตะช่องเพื่อกรอง</span></h3>
      ${rows ? `<ul class="gear-bag">${rows}</ul>` : '<p class="camp-note">ยังไม่มีอุปกรณ์ในคลัง · ชนะศึกบนแผนที่เพื่อหาอุปกรณ์</p>'}
      ${commons ? `<button id="salvage-common" data-lobby="salvage-common" class="secondary">แยกขั้นธรรมดาทั้งหมด (${commons} ชิ้น)</button>` : ''}`;
  }
  // Sets worn (2D-3): pieces and the 2- and 4-piece bonuses, lit when active.
  private sets(gear: Profile['members'][string]['gear']): string {
    const worn = wornSets(this.map.equipment, gear); if (!worn.length) return '';
    return `<ul class="gear-sets" aria-label="ชุดอุปกรณ์ที่ใส่">${worn.map(w => `<li><b>ชุด${w.name}</b> <span>${w.pieces}/4 ชิ้น</span>
      <small class="${w.pieces >= 2 ? 'on' : ''}">2 ชิ้น: ${w.two}</small><small class="${w.pieces >= 4 ? 'on' : ''}">4 ชิ้น: ${w.four}</small></li>`).join('')}</ul>`;
  }
  // Forge (2D-4): pick any piece (bag or worn), then enhance, fuse or reroll it. All rules live in core/world/forge.
  private forge(p: Profile): string {
    const rules = this.map.equipment;
    const all = [...p.items.map(i => ({ item: i, owner: undefined as string | undefined })),
      ...Object.entries(p.members).flatMap(([owner, m]) => Object.values(m.gear ?? {}).map(i => ({ item: i!, owner })))].sort((a, b) => b.item.rarity - a.item.rarity || (b.item.plus ?? 0) - (a.item.plus ?? 0) || b.item.level - a.item.level);
    if (this.forgeUid && !findItem(p, this.forgeUid)) this.forgeUid = undefined;
    const list = all.map(({ item, owner }) => `<li data-rarity="${item.rarity}"><button id="forge-item-${item.uid}" data-lobby="forge-pick" data-uid="${item.uid}" class="forge-pick" aria-pressed="${this.forgeUid === item.uid}">
      <b>${itemName(item)} Lv${item.level}</b><small>${owner ? `ใส่อยู่: ${heroText[owner]?.name ?? owner}` : 'ในคลัง'}${item.set ? ` · ชุด${setText[item.set]}` : ''}</small></button></li>`).join('');
    const why: Record<string, string> = { maxed: 'เต็มแล้ว', ore: 'แร่ดาวไม่พอ', dust: 'ผงม่านเวลไม่พอ', seal: 'ตราสัญญาไม่พอ', materials: 'ชิ้นในคลังไม่พอ' };
    let detail = '<p class="camp-note">แตะอุปกรณ์ด้านล่างเพื่อเลือกชิ้นที่จะพัฒนา</p>';
    const found = this.forgeUid ? findItem(p, this.forgeUid) : undefined;
    if (found) {
      const { item } = found; const cost = enhanceCost(this.map, item); const eReason = enhanceReason(p, this.map, item.uid);
      const mats = fuseMaterials(p, this.map, item.uid); const fReason = fuseReason(p, this.map, item.uid); const need = rules.forge.fuseCount - 1;
      detail = `<div class="forge-detail" data-rarity="${item.rarity}"><p><b>${itemName(item)} Lv${item.level}</b> · ${itemLines(rules, item).join(' · ')}</p>
        <h4>ตีบวก <small>สำเร็จทุกครั้ง · ค่าพื้นฐาน +${rules.forge.plusPercent}% ต่อขั้น · สูงสุด +${rules.forge.plusCap[item.rarity]}</small></h4>
        <button id="forge-enhance" data-lobby="enhance" class="primary"${eReason ? ' disabled' : ''}>${cost ? `ตีบวก +${(item.plus ?? 0) + 1} · แร่ ${cost.ore} ผง ${cost.dust}` : 'ตีบวกเต็มแล้ว'}${eReason && eReason !== 'maxed' ? ` · ${why[eReason]}` : ''}</button>
        <h4>หลอมรวม <small>ใช้${slotText[item.slot]}${rarityText[item.rarity]}ในคลังอีก ${need} ชิ้น · ได้ขั้นถัดไป เก็บชุดและค่าเดิม ระดับตีบวกเหลือครึ่ง</small></h4>
        ${item.rarity < 4 ? `<p class="forge-mats">${mats.length ? `จะใช้: ${mats.map(m => `${itemName(m)} Lv${m.level}`).join(', ')}` : 'ยังไม่มีชิ้นที่ใช้หลอมได้'}</p>` : ''}
        <button id="forge-fuse" data-lobby="fuse" class="secondary"${fReason ? ' disabled' : ''}>${item.rarity >= 4 ? 'ขั้นสูงสุดแล้ว' : `หลอมเป็น${rarityText[item.rarity + 1]}${fReason ? ` · ${why[fReason]}` : ''}`}</button>
        ${item.affixes.length ? `<h4>ปรับค่า <small>ใช้ตราสัญญา ${rules.forge.rerollSeals} อัน สุ่มค่าที่เลือกใหม่ ค่าอื่นคงเดิม</small></h4>
        <div class="forge-rerolls">${item.affixes.map((a, i) => { const r = rerollReason(p, this.map, item.uid, i);
          return `<button id="forge-reroll-${i}" data-lobby="reroll" data-index="${i}" class="secondary"${r ? ' disabled' : ''}>สุ่ม${statName[a]}ใหม่${r ? ` · ${why[r]}` : ''}</button>`; }).join('')}</div>` : ''}</div>`;
    }
    return `<p class="hire-cost">${icon('ore')} ${p.bank.ore} · ${icon('dust')} ${p.bank.dust} · ${icon('seal')} ${p.bank.seal} · ผงม่านเวลได้จากการแยกชิ้น</p>${detail}
      <h3>${icon('pack')} อุปกรณ์ทั้งหมด <span class="camp-embers">${all.length} ชิ้น</span></h3>${list ? `<ul class="forge-list">${list}</ul>` : '<p class="camp-note">ยังไม่มีอุปกรณ์ · ชนะศึกบนแผนที่เพื่อหาอุปกรณ์</p>'}`;
  }
  // Opens the member's talent tree in its own sheet.
  private treeButton(p: Profile, id: string): string {
    if (!this.map.talents[id]) return '';
    const m = p.members[id]!; const points = talentPoints(this.map, m); const spent = talentsSpent(m.talents); const free = points - spent;
    return `<button id="lobby-tree-open" data-lobby="tree" class="secondary tree-toggle">${icon('starFilled')}<span>ต้นไม้ความถนัด</span><small>${free > 0 ? `แต้มว่าง ${free}` : `ใช้ ${spent}/${points} แต้ม`}</small></button>`;
  }
  // Passive talent tree (2D-1b), its own sheet: pick a member at the top, then root → two branches of tier 1 → tier 2 → capstone.
  private tree(p: Profile, id: string): string {
    const nodes = this.map.talents[id]; if (!nodes) return '';
    const m = p.members[id]!; const points = talentPoints(this.map, m); const free = points - talentsSpent(m.talents);
    const data = this.lookup(this.map.tutorialEncounterId)!; const branches = talentBranches[id] ?? ['สาย A', 'สาย B'];
    const why: Record<string, string> = { max: 'เต็มแล้ว', locked: 'ยังล็อก', points: 'แต้มไม่พอ' };
    const members = this.memberPicker(p, id, 'tree', c => { const cm = p.members[c]!; const left = talentPoints(this.map, cm) - talentsSpent(cm.talents); return left > 0 ? String(left) : ''; });
    const node = (n: TalentNode) => {
      const def = nodes.find(x => x.id === n)!; const rank = m.talents?.[n] ?? 0; const reason = talentReason(p, this.map, id, n);
      const state = rank >= def.max ? 'full' : rank ? 'partial' : reason === 'locked' ? 'locked' : 'open';
      return `<button id="talent-${n}" data-lobby="talent" data-node="${n}" class="talent-node${n.endsWith('3') ? ' capstone' : ''}" data-state="${state}"${reason ? ' aria-disabled="true"' : ''}
        aria-label="${def.name} ขั้น ${rank}/${def.max} · ${talentHelp(def, data)}${reason ? ` · ${why[reason]}` : ' · แตะเพื่อลงแต้ม'}"><b>${def.name}</b><i>${rank}/${def.max}</i><small>${talentHelp(def, data)}</small></button>`;
    };
    const gate = '<p class="talent-gate">ยอดสาย: ลงสายนี้ครบ 4 แต้ม</p>';
    return `${members}
      <section id="lobby-tree" class="talent-tree" aria-label="ต้นไม้ความถนัดของ${heroText[id]!.name}">
      <p class="talent-points"><b>${heroText[id]!.name}</b> Lv${m.level ?? 1} · แต้ม ${free}/${points} · ได้ 1 แต้มทุกเลเวลอัป · รีเซ็ตได้ฟรีที่ค่าย</p>
      <div class="talent-root">${node('root')}</div>
      <div class="talent-branches">${(['a', 'b'] as const).map((b, i) => `<div class="talent-branch"><h4>${branches[i]}</h4>${node(`${b}1`)}${node(`${b}2`)}${gate}${node(`${b}3`)}</div>`).join('')}</div>
      <button id="lobby-reset-talents" data-lobby="reset-talents" class="secondary"${talentsSpent(m.talents) ? '' : ' disabled'}>รีเซ็ตแต้ม (ฟรี)</button></section>`;
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
