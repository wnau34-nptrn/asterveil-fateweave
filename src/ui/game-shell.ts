import type { BattleState, Outcome } from '../core/battle/types';
import { clearLegacySaves, loadGame, saveGame, type Game } from '../core/save/expedition-save';
import { createCommander, depart, brew, dismiss, equip, hire, learnTalent, newProfile, placeMember, resetTalents, salvage, settle, unequip, upgrade, canWithdraw } from '../core/world/profile';
import type { Direction, EventChoice, ExpeditionState, MapDefinition, PotionId, Profile, ProfileResult, RunOutcome, WorldEvent } from '../core/world/types';
import { battleData, chooseEvent, finishBattle, heroCatalog, move, moveMember, openChest, recordBattle, usePotion, rest, revive, swapMembers, type EncounterLookup } from '../core/world/world';
import { browserStorage } from '../platform/browser-storage';
import type { BattleUI } from './battle-ui';
import type { NpcId } from '../game/visuals/assets';
import { choiceText, eventText, expThai, heroText, itemLines, itemName, lootThai, potionText } from './th';
import { enhance, findItem, fuse, reroll } from '../core/world/forge';
import { CommanderUI } from './commander-ui';
import { LobbyUI } from './lobby-ui';
import { WorldUI, type WorldBanner } from './world-ui';
import { icon, type IconName } from './icons';

// Owns the authoritative game (lobby profile + current run) and switches between the
// title, lobby, world and battle views. Every commit is saved before anything animates.
export class GameShell {
  private game: Game | undefined;
  private get state(): ExpeditionState | undefined { return this.game?.run ?? undefined; }
  private set state(run: ExpeditionState | undefined) { if (this.game) this.game = { ...this.game, run: run ?? null }; }
  private lobby: LobbyUI;
  private commander: CommanderUI;
  private replacing = false;
  private lobbyMessage = '';
  // The member who was just hired or upgraded cheers in the lobby scene.
  private lobbyCheer = '';
  private readonly storage = browserStorage();
  private saved = true;
  private message = '';
  private locked = false;
  private banner: WorldBanner | undefined;
  private effect: 'rest' | 'loot' | undefined;
  private world: WorldUI;
  private onBattleVisibility: (visible: boolean) => void = () => {};
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private readonly root: HTMLElement, private readonly map: MapDefinition, private readonly lookup: EncounterLookup, private readonly battle: BattleUI,
    private readonly views: { title: HTMLElement; commander: HTMLElement; lobby: HTMLElement; world: HTMLElement; battle: HTMLElement }) {
    clearLegacySaves(this.storage);
    this.game = loadGame(this.storage, map, lookup);
    this.world = new WorldUI(views.world, map, heroCatalog(lookup, map), {
      move: dir => this.move(dir), rest: () => this.rest(), revive: id => this.revive(id), swap: (a, b) => this.roster(swapMembers(this.state!, map, a, b)), moveMember: id => this.roster(moveMember(this.state!, map, id)),
      withdraw: () => this.endRun('withdrawn'), openChest: () => this.openChest(), usePotion: (potion, id) => this.drink(potion, id),
      chooseEvent: choice => this.chooseEvent(choice),
    }, Object.fromEntries(map.elites.map(e => [e.id, lookup(e.encounterId)?.enemies.find(f => f.id === 'brute')?.art ?? 'brute'])));
    this.lobby = new LobbyUI(views.lobby, map, lookup, heroCatalog(lookup, map), {
      hire: i => this.profileChange(hire(this.game!.profile, map, lookup, i)), upgrade: id => this.profileChange(upgrade(this.game!.profile, map, id)),
      dismiss: id => this.profileChange(dismiss(this.game!.profile, map, id)), place: (id, group, other) => this.profileChange(placeMember(this.game!.profile, id, group, other)),
      talent: (id, node) => this.profileChange(learnTalent(this.game!.profile, map, id, node)), resetTalents: id => this.profileChange(resetTalents(this.game!.profile, id)),
      equip: (id, uid) => this.profileChange(equip(this.game!.profile, id, uid)), unequip: (id, slot) => this.profileChange(unequip(this.game!.profile, map, id, slot)),
      salvage: uids => this.profileChange(salvage(this.game!.profile, map, uids)),
      enhance: uid => this.profileChange(enhance(this.game!.profile, map, uid)), fuse: uid => this.profileChange(fuse(this.game!.profile, map, uid)),
      reroll: (uid, i) => this.profileChange(reroll(this.game!.profile, map, uid, i)), brew: potion => this.profileChange(brew(this.game!.profile, map, potion)),
      depart: () => this.depart(), home: () => this.showTitle(),
    });
    this.commander = new CommanderUI(views.commander, { create: c => this.createCommander(c), back: () => { this.replacing = false; this.showTitle(); } });
    views.title.addEventListener('click', e => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-title]');
      if (!button) return;
      if (button.dataset.title === 'continue' && this.game) { if (this.state) this.resume(); else if (!this.game.profile.commander) this.showCommander(false); else this.showLobby(); }
      if (button.dataset.title === 'new') {
        if (this.game && button.dataset.confirm !== 'yes') { button.dataset.confirm = 'yes'; button.textContent = 'ยืนยัน: ลบค่ายและทีมทั้งหมดแล้วเริ่มใหม่'; return; }
        this.showCommander(true);
      }
    });
    this.showTitle();
  }
  setBattleVisibilityListener(listener: (visible: boolean) => void): void { this.onBattleVisibility = listener; }

  private show(view: 'title' | 'commander' | 'lobby' | 'world' | 'battle'): void {
    // Entering a different view replays a short fade-and-settle (off under reduced motion).
    if (this.root.dataset.view !== view) { const next = this.views[view]; next.classList.remove('view-enter'); void next.offsetWidth; next.classList.add('view-enter'); }
    this.views.title.hidden = view !== 'title'; this.views.commander.hidden = view !== 'commander'; this.views.world.hidden = view !== 'world'; this.views.lobby.hidden = view !== 'lobby';
    // The battle view keeps its layout while hidden so Phaser never sizes to zero.
    this.views.battle.classList.toggle('view-off', view !== 'battle');
    this.views.battle.inert = view !== 'battle';
    this.root.dataset.view = view;
    this.onBattleVisibility(view === 'battle');
  }
  private showTitle(): void {
    const g = this.game; const s = g?.run;
    // Save summary as icon chips: the run in progress, or the company waiting at camp.
    const chips = !g ? [] : s ? [['footprints', `เดินแล้ว ${s.steps} ก้าว`], ['star', `ชนะ ${s.wins} ศึก`], ...(s.battle ? [['danger', 'ค้างอยู่ในศึก']] : [])]
      : [['camp', 'อยู่ที่ค่าย'], ['flag', `ทีม ${g.profile.company.length} คน`], ['ore', `แร่ดาว ${g.profile.bank.ore}`]];
    const summary = chips.map(([i, t]) => `<span>${icon(i as IconName)}${t}</span>`).join('');
    // Layered title: drifting painting, light rays and motes behind a logo that resolves into focus.
    this.views.title.innerHTML = `<div class="title-stage" aria-hidden="true"><div class="title-bg"></div><div class="title-rays"></div>
      <div class="title-motes">${'<i></i>'.repeat(14)}</div><div class="title-vignette"></div></div>
      <div class="title-card"><h1 class="title-logo"><img src="${import.meta.env.BASE_URL}assets/title/logo.svg" alt="Asterveil · Fateweave" width="700" height="224"></h1><p class="title-copy">ข้ามม่านเวล · ถักทอโชคชะตา</p>
      <div class="title-actions">${g ? `<p class="title-save">${s ? 'การเดินทางที่บันทึกไว้' : 'ค่ายของคุณ'}<span class="title-chips">${summary}</span></p><button id="continue" data-title="continue" class="primary">${s ? 'เดินทางต่อ →' : 'เข้าค่าย →'}</button>` : ''}
      <button id="new-game" data-title="new" class="${g ? 'secondary' : 'primary'}">${g ? 'เริ่มเกมใหม่' : 'เริ่มเกม'}</button>
      ${this.storage ? '' : '<p class="title-warning">เบราว์เซอร์นี้ไม่อนุญาตให้บันทึก เล่นได้แต่จะไม่จำความคืบหน้า</p>'}</div><p class="title-footer">ชายแดนม่านเวล</p></div>`;
    this.show('title');
    this.views.title.querySelector<HTMLElement>(g ? '#continue' : '#new-game')?.focus({ preventScroll: true });
  }
  private persist(): void { if (this.game) this.saved = saveGame(this.storage, this.game); }
  // Seeds only choose future rolls; rules never read the clock.
  private freshSeed(): number { return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0; }
  // Home → create commander → Lobby. A new game replaces the save only on confirmation.
  private showCommander(replacing: boolean): void { this.replacing = replacing; this.show('commander'); this.commander.open(); }
  private createCommander(c: Parameters<typeof createCommander>[1]): void {
    const base = this.replacing || !this.game ? newProfile(this.map, this.freshSeed()) : this.game.profile;
    const result = createCommander(base, c); if (result.event.type !== 'commander') return;
    this.game = { profile: result.profile, run: this.replacing ? null : this.game?.run ?? null }; this.replacing = false;
    this.lobbyMessage = `ยินดีต้อนรับ ผู้บัญชาการ${result.profile.commander!.name} · เลือกทีมแล้วออกเดินทางได้เลย`;
    this.persist(); this.showLobby();
  }
  private showLobby(): void {
    this.show('lobby');
    this.lobby.render({ profile: this.game!.profile, message: this.lobbyMessage, cheer: this.lobbyCheer, saved: this.saved && !!this.storage, ...(this.npcCheer ? { npcCheer: this.npcCheer } : {}) });
    this.npcCheer = undefined;
  }
  private profileChange(result: ProfileResult): void {
    if (!this.game || this.game.run) return;
    const e = result.event; const name = (id: string) => heroText[id]?.name ?? '';
    if (e.type === 'blocked') return;
    this.game = { ...this.game, profile: { ...result.profile, last: null } }; this.persist();
    this.lobbyMessage = e.type === 'hired' ? (e.duplicate ? `ได้ตัวซ้ำของ${name(e.heroId)} · ใช้อัปดาวในแท็บทีม` : `จ้าง${name(e.heroId)}แล้ว`)
      : e.type === 'upgraded' ? `${name(e.heroId)}ขึ้นเป็น ★${e.stars} แล้ว` : e.type === 'dismissed' ? `เลิกจ้าง${name(e.heroId)}แล้ว · ได้แร่ดาวคืน ${this.map.company.dismissRefund}` : e.type === 'talent' || e.type === 'equipped' ? '' : e.type === 'salvaged' ? `แยกชิ้น ${e.count} ชิ้น · ได้แร่ดาว ${e.ore} ผงม่านเวล ${e.dust}`
      : e.type === 'forged' ? this.forgedText(result.profile, e.uid, e.action) : e.type === 'brewed' ? `ปรุง${potionText[e.potion].name}แล้ว · มีอยู่ ${result.profile.potions[e.potion]} ขวด` : 'จัดทีมแล้ว';
    this.lobbyCheer = e.type === 'hired' || e.type === 'upgraded' ? e.heroId : '';
    // The camp NPC whose service just succeeded cheers once.
    this.npcCheer = ({ hired: 'broker', talent: 'trainer', equipped: 'keeper', salvaged: 'keeper', forged: 'smith', brewed: 'herbalist' } as Partial<Record<string, NpcId>>)[e.type];
    this.showLobby();
  }
  // Forge result: the piece as it is now (fuse and reroll show what was rolled).
  private forgedText(profile: Profile, uid: number, action: 'enhance' | 'fuse' | 'reroll'): string {
    const item = findItem(profile, uid)?.item; if (!item) return '';
    return `${({ enhance: 'ตีบวกสำเร็จ', fuse: 'หลอมรวมสำเร็จ', reroll: 'ปรับค่าแล้ว' })[action]} · ${itemName(item)} · ${itemLines(this.map.equipment, item).join(' · ')}`;
  }
  private npcCheer: NpcId | undefined;
  private depart(): void {
    if (!this.game || this.game.run) return;
    const out = depart(this.game.profile, this.map, this.lookup, this.freshSeed());
    this.game = { profile: { ...out.profile, last: null }, run: out.run };
    this.persist(); this.banner = undefined; this.locked = false; this.lobbyMessage = ''; this.lobbyCheer = '';
    this.message = 'แตะช่องที่ไฮไลต์หรือใช้ลูกศรเพื่อเดิน';
    this.renderWorld();
  }
  // Settles the run into the profile in the same write that clears it.
  private endRun(outcome: RunOutcome): void {
    const run = this.state; if (!this.game || !run) return;
    if (outcome === 'withdrawn' && !canWithdraw(run, this.map)) return;
    this.game = { profile: settle(this.game.profile, run, outcome, this.map), run: null };
    this.persist(); this.lobbyMessage = ''; this.lobbyCheer = ''; this.banner = undefined; this.locked = false;
    this.showLobby();
  }
  private resume(): void {
    this.locked = false;
    if (this.state?.battle) { this.openBattle(); return; }
    this.message = 'กลับมาเดินทางต่อจากจุดที่บันทึกไว้';
    this.banner = undefined;
    this.renderWorld();
  }
  private renderWorld(): void {
    this.show('world');
    this.world.render({ state: this.state!, message: this.message, locked: this.locked, saved: this.saved && !!this.storage, banner: this.banner, effect: this.effect });
    this.effect = undefined;
  }
  private move(dir: Direction): void {
    if (!this.state || this.locked) return;
    const result = move(this.state, this.map, dir);
    if (result.event.type === 'blocked') {
      this.message = result.event.reason === 'wall' ? 'ทางนี้ไปต่อไม่ได้' : result.event.reason === 'party' ? 'ทีมที่ลงสนามล้มหมด · สลับตัวสำรองหรือชุบที่แคมป์ก่อนออกเดินทาง' : this.message;
      this.renderWorld(); return;
    }
    this.state = result.state;
    if (result.event.type === 'goal') { this.endRun('complete'); return; }
    this.persist();
    this.message = this.describe(result.event);
    if (result.event.type === 'encounter') { this.startEncounter(result.event.kind, result.event.encounterId); return; }
    this.renderWorld();
    if (result.event.type === 'event') this.world.openEvent();
  }
  private startEncounter(battleKind: 'tutorial' | 'random' | 'boss' | 'elite' | 'event', encounterId: string): void {
    const data = this.lookup(encounterId)!;
    this.locked = true;
    const kind = battleKind === 'random' || battleKind === 'event' ? 'encounter' : battleKind;
    const eyebrow = kind === 'boss' ? 'บอส · รอยแยกกำลังตื่นขึ้น' : kind === 'elite' ? 'อีลิท · ผู้เฝ้าด่าน' : kind === 'tutorial' ? 'ศึกแรก' : 'พบศัตรู!';
    this.banner = { kind, eyebrow, title: data.name, detail: data.enemies.map(e => e.displayName ?? e.name).join(' · ') };
    this.renderWorld();
    // Veil-shatter presentation (720 ms, 100 ms crossfade under reduced motion); the battle is already saved.
    setTimeout(() => { this.banner = undefined; this.openBattle(); }, this.reducedMotion.matches ? 100 : 720);
  }
  // Event choices (3A) are saved at once; a fight starts like any encounter.
  private chooseEvent(choice: EventChoice): void {
    if (!this.state || this.locked) return;
    const result = chooseEvent(this.state, this.map, this.lookup, choice);
    if (result.event.type === 'blocked') return;
    this.state = result.state; this.persist();
    if (result.event.type === 'encounter') { this.message = 'เข้าสู่การต่อสู้!'; this.startEncounter(result.event.kind, result.event.encounterId); return; }
    const done = result.event; if (done.type !== 'eventDone') return;
    const ev = this.map.events.find(e => e.id === done.eventId)!;
    const healed = Object.entries(done.heal ?? {}).map(([id, n]) => `${heroText[id]?.name ?? id} +${n}`).join(' · ');
    const detail: Partial<Record<EventChoice, string>> = {
      sneak: 'ลอบผ่านไปได้ · ศัตรูในโซนตื่นตัวเต็มที่', pray: `ศาลประทานพร${healed ? ` · ${healed}` : ''} · เลือดสูงสุดลด ${this.map.eventRules.prayWound}%`,
      offer: `ถวายแร่ ${this.map.eventRules.offerOre} · ได้ตราสัญญา ${this.map.eventRules.offerSeal}`, help: `ช่วยนักเดินทาง · ได้แร่ดาว ${this.map.eventRules.traveller.ore} และตราสัญญา ${this.map.eventRules.traveller.seal}`,
    };
    this.message = `${eventText[ev.kind].name} · ${detail[choice] ?? `${choiceText(choice, this.map.eventRules).label} แล้ว`}`;
    if (choice === 'pray') this.effect = 'rest'; else if (choice !== 'sneak') this.effect = 'loot';
    this.renderWorld();
  }
  private rest(): void {
    if (!this.state) return;
    const result = rest(this.state, this.map, this.lookup);
    if (result.event.type !== 'rested') return;
    this.state = result.state; this.persist();
    this.message = `พักที่แคมป์แล้ว · คนที่ยืนอยู่ฟื้นเลือด ${this.map.camp.restHealPercent}% ไฟแคมป์จะจุดใหม่เมื่อชนะศึก`;
    this.effect = 'rest';
    this.renderWorld();
  }
  private revive(heroId: string): void {
    if (!this.state || this.locked) return;
    const result = revive(this.state, this.map, this.lookup, heroId);
    if (result.event.type !== 'revived') return;
    this.state = result.state; this.persist();
    this.message = `ชุบ${heroText[heroId]?.name ?? ''}แล้ว · ใช้ถ่านม่านเวล 1 เหลือ ${this.state.resources.ember}`;
    this.effect = 'rest';
    this.renderWorld();
  }
  private roster(result: { state: ExpeditionState; event: WorldEvent }): void {
    if (!this.state || this.locked || result.event.type !== 'roster') return;
    this.state = result.state; this.persist();
    this.message = 'จัดทีมแล้ว · ศัตรูเล็งตามหมายเลขช่อง';
    this.renderWorld();
  }
  // Map potions (2D-5): saved at once, like every other map action.
  private drink(potion: PotionId, heroId?: string): void {
    if (!this.state || this.locked) return;
    const result = usePotion(this.state, this.map, this.lookup, potion, heroId);
    if (result.event.type !== 'potion') return;
    this.state = result.state; this.persist();
    const healed = Object.entries(result.event.heal ?? {}).map(([id, n]) => `${heroText[id]?.name ?? id} +${n}`).join(' · ');
    this.message = `${potionText[potion].name} · ${potion === 'repel' ? `ไม่เจอศัตรูสุ่ม ${this.map.potions.repelSteps} ก้าว` : `ฟื้นเลือด ${healed}`}`;
    this.renderWorld();
  }
  private openChest(): void {
    if (!this.state || this.locked) return;
    const result = openChest(this.state, this.map);
    if (result.event.type !== 'chest') return;
    this.state = result.state; this.persist();
    this.message = `เปิดกล่องสมบัติ · ${lootThai(result.event.loot)}${result.event.potion ? ` · ${potionText[result.event.potion].name} +1` : ''}`;
    this.effect = 'loot';
    this.renderWorld();
  }
  private describe(event: WorldEvent): string {
    switch (event.type) {
      case 'moved': return event.chance ? `ก้าวต่อไป · ไม่พบศัตรู (โอกาส ${event.chance}%)` : 'พื้นที่ปลอดภัย';
      case 'encounter': return event.kind === 'boss' ? 'ผู้คุมรอยแยกขวางประตูไว้!' : event.kind === 'elite' ? 'อีลิทเฝ้าด่านขวางทางไว้ · ต้องชนะถึงจะผ่าน' : 'พบศัตรู!';
      case 'event': return eventText[this.map.events.find(e => e.id === event.eventId)!.kind].name;
      case 'goal': return 'ถึงประตูรอยแยกแล้ว';
      default: return this.message;
    }
  }

  private openBattle(): void {
    const s = this.state!; const b = s.battle!; const data = battleData(s, this.map, this.lookup)!;
    this.show('battle');
    this.battle.open({
      kind: b.kind, data, entry: { hp: b.entry }, commands: b.commands,
      commit: (state: BattleState) => this.commitBattle(state),
      leaveLabel: (outcome: Outcome) => outcome === 'victory' ? (b.kind === 'boss' ? 'ไปยังประตูรอยแยก →' : 'กลับสู่แผนที่ →') : b.kind === 'tutorial' ? 'ลองศึกสอนอีกครั้ง ↻' : !this.state ? 'ทีมล้มหมด · กลับค่าย →' : this.state.camp ? 'กลับแคมป์ →' : 'กลับทางเข้าด่าน →',
      leave: () => this.leaveBattle(),
    });
  }
  private commitBattle(battle: BattleState): boolean {
    if (!this.state?.battle) return false;
    const kind = this.state.battle.kind;
    let next = recordBattle(this.state, this.map, this.lookup, battle.commands);
    if (battle.outcome !== 'active') {
      const result = finishBattle(next, this.map, this.lookup); next = result.state;
      const fallen = Object.values(next.hp).filter(hp => hp <= 0).length;
      if (result.event.type === 'victory') {
        const loot = lootThai(result.event.loot) + (result.event.item ? ` · ได้${itemName(result.event.item)} Lv${result.event.item.level}` : ''); this.effect = 'loot'; const exp = expThai(result.event.exp, next);
        const dust = result.event.dust ? ` · ผงม่าน +${result.event.dust}` : '';
        this.message = kind === 'boss' ? `ผู้คุมรอยแยกล้มแล้ว · ${loot}${exp} · ทางไปประตูเปิดออก` : kind === 'elite' ? `อีลิทล้มแล้ว · ${loot}${exp} · ด่านเปิดออก` : kind === 'event' ? `ชนะศึก · ${loot}${dust}${exp}` : `ชนะศึก · ${loot}${exp}${fallen ? ` · ${fallen} คนล้มอยู่ ชุบที่แคมป์` : ''}`;
      } else if (result.event.type === 'defeat') {
        if (result.event.wiped) {
          // Every brought member is down: the expedition fails and settles home in this write.
          this.game = { profile: settle(this.game!.profile, next, 'wiped', this.map), run: null }; this.persist();
          return this.saved;
        }
        this.message = kind === 'tutorial' ? 'ลองศึกสอนอีกครั้งด้วยเลือดเต็ม' : 'ทีมถอยกลับ · คนที่ล้มยังล้มอยู่ ชุบหรือสลับตัวสำรองที่แคมป์';
      }
    }
    this.state = next; this.persist();
    return this.saved;
  }
  private leaveBattle(): void {
    if (!this.state) { this.lobbyMessage = ''; this.lobbyCheer = ''; this.locked = false; this.showLobby(); return; }
    if (this.state.battle) { this.openBattle(); return; }
    this.locked = false;
    this.banner = undefined;
    this.renderWorld();
    this.views.world.querySelector<HTMLElement>('#move-up')?.focus({ preventScroll: true });
  }
}
