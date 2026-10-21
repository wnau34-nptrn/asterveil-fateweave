import {chooseBossTarget} from '../core/world/boss-equipment';
import {chooseHuntTarget} from '../core/world/targeted-loot';
import {departureBlocked,collectOverflow,recycleSelection,expandStorage} from '../core/world/storage';
import { bindInfoTabs } from './info-tabs';
import { learnRunTalent } from '../core/world/world';
import { applyCampEquipment, applyRunEquipment } from '../core/world/auto-equipment';
import { shortcutBlocked } from '../platform/keyboard';
import type { BattleState, Outcome } from '../core/battle/types';
import { clearLegacySaves, loadGame, saveGame, type Game } from '../core/save/expedition-save';
import { hardReason, claimGuide, renameCamp, createCommander, depart, mapUnlocked, brew, buy, claimQuest, refreshBoard, dismiss, equip, hire, learnTalent, newProfile, placeMember, resetTalents, salvage, settle, unequip, upgrade, canWithdraw } from '../core/world/profile';
import type { Point, Direction, EventChoice, ExpeditionState, MapDefinition, PotionId, Profile, ProfileResult, RunOutcome, ShopItemId, WorldEvent } from '../core/world/types';
import { travel, tileAt, startPrologue, questDone, battleData, chooseEvent, finishBattle, heroCatalog, move, moveMember, openChest, recordBattle, usePotion, rest, revive, swapMembers, takeOff, wear, type EncounterLookup } from '../core/world/world';
import { Music, type Track } from '../platform/music';
import { firstClearStory, runSummary, SummaryUI, type RunSummary } from './summary-ui';
import { sfx, type SfxName } from '../platform/sfx';
import { browserStorage } from '../platform/browser-storage';
import type { BattleUI } from './battle-ui';
import type { NpcId } from '../game/visuals/assets';
import { choiceText, eventText, expThai, heroText, itemLines, itemName, lootThai, potionText, rewardText, shopText } from './th';
import { transferAffix, craftWeapon, raiseItemLevel, enhanceTo, lockEquipment, findItem, fuse, reroll, smelt } from '../core/world/forge';
import { CommanderUI } from './commander-ui';
import { LobbyUI } from './lobby-ui';
import { prologue, prologueEnd, recruitStory, StoryUI } from './story-ui';
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
  // Background music per view (owner-supplied tracks); see platform/music.ts.
  private readonly music = new Music(this.storage);
  private saved = true;
  private message = '';
  private locked = false;
  private banner: WorldBanner | undefined;
  private effect: 'rest' | 'loot' | undefined;
  private world: WorldUI;
  private onBattleVisibility: (visible: boolean) => void = () => {};
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Chapters (2026-10-17): `home` is the frontier map (its rules are every map's rules); `maps` is the campaign in
  // order. The current map is the run's, or the one chosen at departure.
  private chosenMap: string | undefined;
  private get map(): MapDefinition {
    // A running expedition pins its map, so the summary after it ends still names that map.
    if (this.game?.run) this.chosenMap = this.game.run.mapId;
    return this.maps.find(m => m.id === this.chosenMap) ?? this.home;
  }
  private eliteArtOf(map: MapDefinition): Record<string, string> {
    return Object.fromEntries(map.elites.map(e => [e.id, this.lookup(e.encounterId)?.enemies.find(f => f.id === 'brute')?.art ?? 'brute']));
  }
  constructor(private readonly root: HTMLElement, private readonly home: MapDefinition, private readonly lookup: EncounterLookup, private readonly battle: BattleUI,
    private readonly views: { title: HTMLElement; commander: HTMLElement; lobby: HTMLElement; world: HTMLElement; battle: HTMLElement },
    private readonly maps: readonly MapDefinition[] = [home]) {
    const map = home;
    clearLegacySaves(this.storage); sfx.init(this.storage);
    this.game = loadGame(this.storage, map, lookup, maps);
    for (const id of this.game?.run?.recruited ?? []) this.recruitSeen.add(`${this.game!.run!.mapId}:${id}`);
    this.world = new WorldUI(views.world, this.map, heroCatalog(lookup, map), {
      travel: to => this.travelTo(to), move: dir => this.move(dir), rest: () => this.rest(), revive: id => this.revive(id), swap: (a, b) => this.roster(swapMembers(this.state!, a, b)), moveMember: id => this.roster(moveMember(this.state!, id)),
      withdraw: () => this.endRun('withdrawn'), openChest: () => this.openChest(), usePotion: (potion, id) => this.drink(potion, id),
      chooseEvent: choice => this.chooseEvent(choice),
      talent: (id, node) => {
        if (!this.state || this.locked) return;
        const result = learnRunTalent(this.state, map, lookup, id, node);
        if (result.event.type !== 'talent') return;
        this.state = result.state; this.persist(); sfx.play('buff');
        this.message = `ลงแต้มความถนัด${heroText[id]?.name ?? ''}แล้ว`;
        this.renderWorld();
      },
      wear: (id, from, index) => this.gear(wear(this.state!, map, lookup, id, from, index)), takeOff: (id, slot) => this.gear(takeOff(this.state!, map, lookup, id, slot)),
      autoEquip: plan => { if(this.state&&!this.locked)this.gear(applyRunEquipment(this.state,map,lookup,plan)); },
    }, this.eliteArtOf(this.map), lookup(map.tutorialEncounterId));
    this.lobby = new LobbyUI(views.lobby, map, lookup, heroCatalog(lookup, map), {
      hire: i => this.profileChange(hire(this.game!.profile, map, lookup, i)), refresh: () => this.profileChange(refreshBoard(this.game!.profile, map)),
      buy: (item, hero) => this.profileChange(buy(this.game!.profile, map, item, hero)), smelt: dust => this.profileChange(smelt(this.game!.profile, map, dust)), upgrade: id => this.profileChange(upgrade(this.game!.profile, map, id)),
      dismiss: id => this.profileChange(dismiss(this.game!.profile, map, id)), place: (id, group, other) => this.profileChange(placeMember(this.game!.profile, id, group, other)),
      talent: (id, node) => this.profileChange(learnTalent(this.game!.profile, map, id, node)), resetTalents: id => this.profileChange(resetTalents(this.game!.profile, id)),
      renameCamp: name => this.renameCamp(name), guide: (id, skip) => this.guide(id, skip),
      equip: (id, uid) => this.profileChange(equip(this.game!.profile, id, uid)), unequip: (id, slot) => this.profileChange(unequip(this.game!.profile, map, id, slot)),
      autoEquip: plan => this.profileChange(applyCampEquipment(this.game!.profile,plan)),
      transfer:(uid,index,donor,sourceIndex)=>this.profileChange(transferAffix(this.game!.profile,map,uid,index,donor,sourceIndex)),
      craft:(hero,level)=>this.profileChange(craftWeapon(this.game!.profile,map,hero,level)),
      bossTarget:target=>this.profileChange(chooseBossTarget(this.game!.profile,map,target)),
      huntTarget:target=>this.profileChange(chooseHuntTarget(this.game!.profile,target)),
      collect:ids=>this.profileChange(collectOverflow(this.game!.profile,map,ids)), recycleStored:(source,ids)=>this.profileChange(recycleSelection(this.game!.profile,map,source,ids)),expandStorage:()=>this.profileChange(expandStorage(this.game!.profile,map)),
      salvage: uids => this.profileChange(salvage(this.game!.profile, map, uids)),
      enhance: (uid,target) => this.profileChange(enhanceTo(this.game!.profile, map, uid,target)), lock: uid=>this.profileChange(lockEquipment(this.game!.profile,uid)), fuse: (uid,donors) => this.profileChange(fuse(this.game!.profile, map, uid,donors)), level:(uid,target)=>this.profileChange(raiseItemLevel(this.game!.profile,map,uid,target)),
      reroll: (uid, i) => this.profileChange(reroll(this.game!.profile, map, uid, i)), brew: potion => this.profileChange(brew(this.game!.profile, map, potion)), claim: id => this.profileChange(claimQuest(this.game!.profile, map, id)),
      depart: (id, hard) => this.depart(id, hard), home: () => this.showTitle(),
    }, maps);
    const story = document.createElement('section'); root.append(story); this.story = new StoryUI(story);
    const summary = document.createElement('section'); root.append(summary); this.summary = new SummaryUI(summary, map);
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
    // Shared audio preferences in the in-game settings tabs.
    root.addEventListener('click', e => { if ((e.target as HTMLElement).closest('[data-music-toggle]')) { this.music.setMuted(!this.music.settings.muted); this.refreshMusicControls(); } });
    // Every enabled button press clicks (the D-pad steps instead; game results add their own sound).
    root.addEventListener('click', e => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button'); if (b && !b.disabled && !b.id.startsWith('move-')) sfx.play('click'); }, { capture: true });
    root.addEventListener('click', e => { if ((e.target as HTMLElement).closest('[data-sfx-toggle]')) { sfx.setMuted(!sfx.settings.muted); this.refreshMusicControls(); } });
    root.addEventListener('input', e => { const t = e.target as HTMLInputElement; if (t.matches('[data-music-volume]')) this.music.setVolume(Number(t.value) / 100); if (t.matches('[data-sfx-volume]')) { sfx.setVolume(Number(t.value) / 100); sfx.play('click'); } if (t.matches('[data-music-volume]') || t.matches('[data-sfx-volume]')) this.refreshMusicControls(); });
    this.root.querySelector('#battle-sfx-controls')!.innerHTML = this.musicControls('battle-');
    this.root.querySelector('#world-sfx-controls')!.innerHTML = this.musicControls('world-');
    bindInfoTabs(root);
    this.showTitle();
    document.addEventListener('keydown', e => {
      if (shortcutBlocked(e) || this.story.open || root.querySelector('.summary-view:not([hidden])')) return;
      const view = root.dataset.view;
      const bag = e.code === 'KeyB' || e.key.toLowerCase() === 'b';
      const info = e.code === 'KeyI' || e.key.toLowerCase() === 'i';
      const buttonId = bag && view === 'world' ? 'world-pack' : info && view === 'world' ? 'world-info-button' : info && view === 'battle' ? 'battle-info' : undefined;
      const dialogId = bag && view === 'world' ? 'pack-dialog' : info && view === 'world' ? 'world-info' : info && view === 'battle' ? 'game-info' : undefined;
      if (!buttonId || !dialogId) return;
      const modal = document.querySelector<HTMLDialogElement>('dialog[open]');
      if (modal && modal.id !== dialogId) return;
      e.preventDefault();
      if (modal) modal.close(); else root.querySelector<HTMLButtonElement>(`#${buttonId}`)?.click();
    });
    for (const [id, key] of [['world-pack', 'B'], ['world-info-button', 'I'], ['battle-info', 'I']]) root.querySelector(`#${id}`)?.setAttribute('aria-keyshortcuts', key!);
  }
  private refreshMusicControls(): void {
    const p = this.music.settings;
    this.root.querySelectorAll<HTMLButtonElement>('[data-music-toggle]').forEach(b => { b.setAttribute('aria-pressed', String(!p.muted)); b.setAttribute('aria-label', p.muted ? 'เปิดเพลง' : 'ปิดเพลง'); b.innerHTML = icon(p.muted ? 'musicOff' : 'music') + (b.classList.contains('audio-toggle') ? `<span>เพลง: ${p.muted ? 'ปิด' : 'เปิด'}</span>` : ''); });
    this.root.querySelectorAll<HTMLInputElement>('[data-music-volume]').forEach(v => { v.disabled = p.muted; v.value = String(Math.round(p.volume * 100)); });
    this.root.querySelectorAll<HTMLOutputElement>('[data-music-level]').forEach(ml => { ml.value = `${Math.round(p.volume * 100)}%`; });
    const s = sfx.settings;
    this.root.querySelectorAll<HTMLButtonElement>('[data-sfx-toggle]').forEach(st => { st.setAttribute('aria-pressed', String(!s.muted)); st.setAttribute('aria-label', s.muted ? 'เปิดเสียงเอฟเฟกต์' : 'ปิดเสียงเอฟเฟกต์'); st.innerHTML = icon(s.muted ? 'soundOff' : 'sound') + `<span>เอฟเฟกต์: ${s.muted ? 'ปิด' : 'เปิด'}</span>`; });
    this.root.querySelectorAll<HTMLInputElement>('[data-sfx-volume]').forEach(sv => { sv.disabled = s.muted; sv.value = String(Math.round(s.volume * 100)); });
    this.root.querySelectorAll<HTMLOutputElement>('[data-sfx-level]').forEach(sl => { sl.value = `${Math.round(s.volume * 100)}%`; });
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
    this.music.play(this.trackFor(view));
    this.onBattleVisibility(view === 'battle');
  }
  // Title and prologue: camp; commander creation and Vargoth's retreat: archway; lobby: ruins; map: meadow;
  // battles: the battle theme, or the boss theme for the boss and the mini-boss.
  private trackFor(view: 'title' | 'commander' | 'lobby' | 'world' | 'battle'): Track {
    if (view === 'battle') { const b = this.state?.battle; return b?.kind === 'boss' || (b?.kind === 'elite' && this.map.elites.find(e => e.id === b.source)?.mini) ? 'boss' : 'battle'; }
    return ({ title: 'camp', commander: 'archway', lobby: 'ruins', world: 'meadow' } as const)[view];
  }
  private musicControls(prefix = ''): string {
    const p = this.music.settings;
    return `<div class="music-controls audio-settings"><button id="${prefix}music-toggle" data-music-toggle class="round-glass audio-toggle" aria-pressed="${!p.muted}" aria-label="${p.muted ? 'เปิดเพลง' : 'ปิดเพลง'}">${icon(p.muted ? 'musicOff' : 'music')}<span>เพลง: ${p.muted ? 'ปิด' : 'เปิด'}</span></button>`
      + `<label class="music-volume"><input id="${prefix}music-volume" data-music-volume type="range" min="0" max="100" step="5" value="${Math.round(p.volume * 100)}" aria-label="ระดับเสียงเพลง"${p.muted ? ' disabled' : ''}></label><output id="${prefix}music-level" data-music-level for="${prefix}music-volume">${Math.round(p.volume * 100)}%</output></div>`
      + this.effectsControls(prefix);
  }
  private effectsControls(prefix: string): string {
    const s = sfx.settings;
    return `<div class="music-controls audio-settings"><button id="${prefix}sfx-toggle" data-sfx-toggle class="round-glass audio-toggle" aria-pressed="${!s.muted}" aria-label="${s.muted ? 'เปิดเสียงเอฟเฟกต์' : 'ปิดเสียงเอฟเฟกต์'}">${icon(s.muted ? 'soundOff' : 'sound')}<span>เอฟเฟกต์: ${s.muted ? 'ปิด' : 'เปิด'}</span></button>`
      + `<label class="music-volume"><input id="${prefix}sfx-volume" data-sfx-volume type="range" min="0" max="100" step="5" value="${Math.round(s.volume * 100)}" aria-label="ระดับเสียงเอฟเฟกต์"${s.muted ? ' disabled' : ''}></label><output id="${prefix}sfx-level" data-sfx-level for="${prefix}sfx-volume">${Math.round(s.volume * 100)}%</output></div>`;
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
      <div class="title-card"><h1 class="title-logo"><img src="${import.meta.env.BASE_URL}assets/title/logo.svg" alt="Asterveil · Fateweave" width="700" height="224"></h1><p class="title-copy">ข้ามรอยแยก · ถักทอโชคชะตา</p>
      <div class="title-actions">${g ? `<p class="title-save">${s ? 'การเดินทางที่บันทึกไว้' : 'ค่ายของคุณ'}<span class="title-chips">${summary}</span></p><button id="continue" data-title="continue" class="primary">${s ? 'เดินทางต่อ →' : 'เข้าค่าย →'}</button>` : ''}
      <button id="new-game" data-title="new" class="${g ? 'secondary' : 'primary'}">${g ? 'เริ่มเกมใหม่' : 'เริ่มเกม'}</button>

      ${this.storage ? '' : '<p class="title-warning">เบราว์เซอร์นี้ไม่อนุญาตให้บันทึก เล่นได้แต่จะไม่จำความคืบหน้า</p>'}</div><p class="title-footer">ชายแดนแอสเตอร์เวล</p></div>`;
    this.show('title');
    this.views.title.querySelector<HTMLElement>(g ? '#continue' : '#new-game')?.focus({ preventScroll: true });
  }
  private persist(): void { if (this.game) this.saved = saveGame(this.storage, this.game); }
  // Seeds only choose future rolls; rules never read the clock.
  private freshSeed(): number { return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0; }
  // Home → create commander → Lobby. A new game replaces the save only on confirmation.
  private showCommander(replacing: boolean): void { this.replacing = replacing; this.show('commander'); this.commander.open(); }
  private createCommander(c: Parameters<typeof createCommander>[1]): void {
    // Close the on-screen keyboard first: the prologue and the first battle follow at once, and a keyboard still
    // open on iOS leaves the page scrolled and laid out for a short, wide (landscape) viewport.
    (document.activeElement as HTMLElement | null)?.blur?.();
    const base = this.replacing || !this.game ? newProfile(this.map, this.freshSeed(), this.map.firstCompany) : this.game.profile;
    const result = createCommander(base, c); if (result.event.type !== 'commander') return;
    this.game = { profile: result.profile, run: this.replacing ? null : this.game?.run ?? null }; this.replacing = false;
    this.lobbyMessage = `ยินดีต้อนรับ ผู้บัญชาการ${result.profile.commander!.name} · เลือกทีมแล้วออกเดินทางได้เลย`;
    this.persist();
    // A company that has never fought starts with the prologue: depart at once and meet Vargoth's vanguard.
    if (!result.profile.tutorialDone && !this.game.run) { this.lobbyMessage = ''; this.depart(); return; }
    this.showLobby();
  }
  private showLobby(): void {
    const entering = this.root.dataset.view !== 'lobby';
    this.show('lobby');
    this.lobby.render({ profile: this.game!.profile, message: this.lobbyMessage, cheer: this.lobbyCheer, saved: this.saved && !!this.storage, ...(this.npcCheer ? { npcCheer: this.npcCheer } : {}) });
    this.npcCheer = undefined;
    // Arriving in the camp opens on the fire; later redraws keep where the player panned to.
    if (entering) this.lobby.centreScene();
  }
  private guide(id: string, skip: boolean): void {
    if (!this.game || this.game.run) return;
    const result = claimGuide(this.game.profile, this.maps, id, skip); if (result.event.type !== 'guide') return;
    this.game = { ...this.game, profile: { ...result.profile, last: null } }; this.persist();
    this.lobbyMessage = skip ? 'ข้ามงานแนะนำแล้ว' : 'รับรางวัลงานแนะนำแล้ว'; this.showLobby();
  }
  private renameCamp(name: string): void {
    if (!this.game || this.game.run) return;
    const result = renameCamp(this.game.profile, name);
    if (result.event.type === 'blocked') { if (result.event.reason === 'camp') { this.lobbyMessage = 'ชื่อค่ายต้องยาว 1–20 ตัวอักษร และไม่ใช้ < >'; this.showLobby(); } return; }
    this.game = { ...this.game, profile: { ...result.profile, last: null } }; this.persist();
    this.lobbyMessage = `เปลี่ยนชื่อค่ายเป็น ${result.profile.commander!.camp} แล้ว`; this.showLobby();
  }
  private profileChange(result: ProfileResult): void {
    if (!this.game || this.game.run) return;
    const e = result.event; const name = (id: string) => heroText[id]?.name ?? '';
    if (e.type === 'blocked') return;
    this.game = { ...this.game, profile: { ...result.profile, last: null } }; this.persist();
    this.lobbyMessage = e.type === 'hired' ? (e.duplicate ? `ได้ตัวซ้ำของ${name(e.heroId)} · ใช้อัปดาวในแท็บทีม` : `จ้าง${name(e.heroId)}แล้ว`)
      : e.type==='bossTarget'?'บันทึกเป้าหมายบอสแล้ว':e.type==='huntTarget'?'บันทึกเป้าหมายฟาร์มแล้ว':e.type==='storageCollected'?`เก็บเข้าคลัง ${e.count} ชิ้นแล้ว`:e.type==='storageExpanded'?'ขยายคลังแล้ว': e.type === 'upgraded' ? `${name(e.heroId)}ขึ้นเป็น ★${e.stars} แล้ว` : e.type === 'dismissed' ? `เลิกจ้าง${name(e.heroId)}แล้ว · ได้เหรียญทองคืน ${this.map.company.dismissRefund}` : e.type === 'talent' || e.type === 'equipped' ? '' : e.type === 'salvaged' ? `แยกชิ้น ${e.count} ชิ้น · ได้แร่ดาว ${e.ore} ฝุ่นดาว ${e.dust}`
      : e.type === 'equipmentLocked' ? `${e.locked?'ล็อก':'ปลดล็อก'}${itemName(findItem(result.profile,e.uid)!.item)}แล้ว` : e.type === 'forged' ? this.forgedText(result.profile, e.uid, e.action) : e.type === 'brewed' ? `ปรุง${potionText[e.potion].name}แล้ว · มีอยู่ ${result.profile.potions[e.potion]} ขวด`
      : e.type === 'smelted' ? `ลุงบอร์กหลอมแร่ดาวเป็นฝุ่นดาว ${e.dust} · มีฝุ่นดาว ${result.profile.bank.dust}`
      : e.type === 'refreshed' ? `พีโน่เปลี่ยนป้ายจ้างใหม่แล้ว · สุ่มได้อีก ${this.map.shop.refreshCosts.length - result.profile.refreshes} ครั้ง`
      : e.type === 'bought' ? this.boughtText(result.profile, e)
      : e.type === 'claimed' ? `ได้รับรางวัลเควสต์ · ${rewardText(this.map.sideQuests.find(q => q.id === e.questId)!.reward)}` : 'จัดทีมแล้ว';
    this.lobbyCheer = e.type === 'hired' || e.type === 'upgraded' ? e.heroId : '';
    // The camp NPC whose service just succeeded cheers once.
    sfx.play(({ hired: 'coin', upgraded: 'upgrade', dismissed: 'close', talent: 'buff', equipped: 'guard', salvaged: 'anvil', forged: 'anvil', smelted: 'anvil', brewed: 'potion', claimed: 'claim', bought: 'coin', refreshed: 'coin' } as Partial<Record<string, SfxName>>)[e.type] ?? 'click');
    this.npcCheer = e.type === 'bought' || e.type === 'refreshed' ? 'broker' : e.type === 'claimed' ? this.map.sideQuests.find(q => q.id === e.questId)!.npc as NpcId
      : ({ hired: 'broker', talent: 'trainer', equipped: 'keeper', salvaged: 'keeper', forged: 'smith', smelted: 'smith', brewed: 'herbalist' } as Partial<Record<string, NpcId>>)[e.type];
    this.showLobby();
  }
  // Market purchase (4A): what was bought and where it went.
  private boughtText(profile: Profile, e: { item: ShopItemId; heroId?: string; uid?: number }): string {
    const item = e.uid ? profile.items.find(i => i.uid === e.uid) : undefined;
    if (e.item === 'contract') return `ซื้อใบสัญญาซ้ำ · ${heroText[e.heroId!]?.name ?? ''} มีตัวซ้ำ ${profile.members[e.heroId!]?.dupes ?? 0} ตัว`;
    if (item) return `เปิดหีบอุปกรณ์ · ได้${itemName(item)} Lv${item.level}`;
    return `ซื้อ${shopText[e.item].name}แล้ว`;
  }
  // Forge result: the piece as it is now (fuse and reroll show what was rolled).
  private forgedText(profile: Profile, uid: number, action: 'enhance' | 'fuse' | 'reroll' | 'level' | 'craft' | 'transfer'): string {
    const item = findItem(profile, uid)?.item; if (!item) return '';
    return `${({ transfer:'ถ่ายโอนคุณสมบัติแล้ว', craft:'สร้างอาวุธเข้าคลังแล้ว', level:'เพิ่ม Lv สำเร็จ', enhance: 'ตีบวกสำเร็จ', fuse: 'หลอมรวมสำเร็จ', reroll: 'ปรับค่าแล้ว' })[action]} · ${itemName(item)} · ${itemLines(this.map.equipment, item).join(' · ')}`;
  }
  private npcCheer: NpcId | undefined;
  private readonly story: StoryUI;
  // 4F: the summary of a run that just ended, shown once before the lobby.
  private readonly summary: SummaryUI;
  private pendingSummary: RunSummary | undefined;
  // Set when the prologue (tutorial) battle is won; its closing scene plays on leaving the battle.
  private prologueWon = false;
  // The prologue always starts on the first map; otherwise the Lobby names an open map (default: the furthest open one).
  private depart(mapId?: string, hard = false): void {
    if (!this.game || this.game.run) return;
    if(departureBlocked(this.game.profile)){this.lobbyMessage='จัดถาดรอเก็บในกระเป๋าก่อนออกเดินทาง';this.showLobby();return;}
    const open = this.maps.filter(m => mapUnlocked(this.game!.profile, this.maps, m.id));
    const chosen = !this.game.profile.tutorialDone ? this.maps[0]! : open.find(m => m.id === mapId) ?? open.at(-1)!;
    if (mapId && chosen.id !== mapId) return;
    this.chosenMap = chosen.id;
    if (hard && hardReason(this.game.profile, this.maps, chosen.id)) return;
    const out = depart(this.game.profile, chosen, this.lookup, this.freshSeed(), hard ? { maps: this.maps } : undefined);
    this.game = { profile: { ...out.profile, last: null }, run: out.run };
    this.persist(); this.banner = undefined; this.locked = false; this.lobbyMessage = ''; this.lobbyCheer = '';
    this.message = 'แตะช่องที่ไฮไลต์หรือใช้ลูกศรเพื่อเดิน';
    // First expedition (lore): the prologue plays, then Vargoth's vanguard attacks before the first step.
    const prologueStart = startPrologue(this.state!, this.map);
    if (prologueStart.event.type === 'encounter') {
      this.state = prologueStart.state; this.persist(); this.locked = true; this.renderWorld();
      this.music.play('camp'); this.story.play(prologue(this.game.profile.commander?.name ?? 'ผู้บัญชาการ'), 'เข้าสู่การต่อสู้', () => { this.locked = false; this.openBattle(); });
      return;
    }
    this.renderWorld();
  }
  // Settles the run into the profile in the same write that clears it.
  private endRun(outcome: RunOutcome): void {
    const run = this.state; if (!this.game || !run) return;
    if (outcome === 'withdrawn' && !canWithdraw(run, this.map)) return;
    const before = this.game.profile; const after = settle(before, run, outcome, this.map);
    this.game = { profile: after, run: null }; this.pendingSummary = runSummary(before, run, after, outcome, this.map);
    this.persist(); this.lobbyMessage = ''; this.lobbyCheer = ''; this.banner = undefined; this.locked = false;
    this.showSummary();
  }
  // The lobby comes up behind the summary (and, after the first clear, Vargoth's answer), so closing it lands there.
  private showSummary(): void {
    const s = this.pendingSummary; this.pendingSummary = undefined;
    this.showLobby(); if (!s) return;
    this.music.play('archway'); sfx.play(s.outcome === 'wiped' ? 'defeat' : s.outcome === 'complete' ? 'victory' : 'claim');
    const open = () => this.summary.show(s, () => { this.music.play('ruins'); this.views.lobby.querySelector<HTMLElement>('#lobby-depart')?.focus({ preventScroll: true }); });
    if (s.firstClear && this.maps.find(m => m.id === s.mapId)?.clearStory === 'warden') this.story.play(firstClearStory, 'ดูสรุปการเดินทาง', open); else open();
  }
  private resume(): void {
    this.locked = false;
    if (this.state?.battle) { this.openBattle(); return; }
    this.message = 'กลับมาเดินทางต่อจากจุดที่บันทึกไว้';
    this.banner = undefined;
    this.renderWorld();
  }
  private renderWorld(): void {
    this.world.setMap(this.map, this.eliteArtOf(this.map));
    this.show('world');
    this.world.render({ state: this.state!, message: this.message, locked: this.locked, saved: this.saved && !!this.storage, banner: this.banner, effect: this.effect });
    this.effect = undefined;
  }
  // Story recruits: play each newly joined guest once per session (a reload shows the ones already joined as seen).
  private recruitSeen = new Set<string>();
  private markRecruits(): void { for (const id of this.state?.recruited ?? []) this.recruitSeen.add(`${this.state!.mapId}:${id}`); }
  private playRecruits(then: () => void): void {
    const fresh = (this.state?.recruited ?? []).filter(id => !this.recruitSeen.has(`${this.state!.mapId}:${id}`));
    if (!fresh.length) { then(); return; }
    this.markRecruits();
    this.story.play(recruitStory(fresh, this.game?.profile.commander?.camp || 'ค่ายทหารรับจ้าง'), 'ไปต่อ', then);
  }
  private move(dir: Direction): void {
    if (!this.state || this.locked) return;
    const result = move(this.state, this.map, dir, this.lookup);
    if (result.event.type === 'blocked') {
      this.message = result.event.reason === 'wall' ? 'ทางนี้ไปต่อไม่ได้' : result.event.reason === 'party' ? 'ทีมที่ลงสนามล้มหมด · สลับตัวสำรองในกระเป๋า หรือชุบที่แคมป์ก่อนออกเดินทาง'
        : result.event.reason === 'stone' ? 'หินขยับไปทางนั้นไม่ได้' : result.event.reason === 'pit' ? 'หลุมลึกขวางทาง · ต้องหาอะไรมาถม'
        : result.event.reason === 'sealed' ? `${this.map.bossName}ยังถูกผนึก · ทำเป้าหมายให้ครบ ${this.map.quest.need} จาก ${this.map.quest.objectives.length} ก่อน (ตอนนี้ ${questDone(this.state, this.map).length}/${this.map.quest.need}) ดูได้ที่ช่องเป้าหมาย` : this.message;
      sfx.play('bump'); this.renderWorld(); return;
    }
    this.state = result.state; this.worldSound(result.event);
    if (result.event.type === 'goal') { this.endRun('complete'); return; }
    this.persist();
    this.message = this.describe(result.event);
    if (result.event.type === 'encounter') { this.startEncounter(result.event.kind, result.event.encounterId); return; }
    this.renderWorld();
    if (result.event.type === 'event') this.world.openEvent();
    else this.playRecruits(() => this.views.world.querySelector<HTMLElement>('#move-up')?.focus({ preventScroll: true }));
  }
  // Map sounds by world event (placeholder synth, platform/sfx.ts).
  private worldSound(e: WorldEvent): void {
    const map: Partial<Record<WorldEvent['type'], SfxName>> = { moved: 'step', encounter: 'encounter', event: 'open', pushed: 'push', secret: 'secret', herb: 'herb', goal: 'victory' };
    if (e.type === 'rune') sfx.play(e.reset ? 'runeReset' : e.solved ? 'door' : 'rune');
    else if (e.type === 'lever') { sfx.play('lever'); if (e.solved) setTimeout(() => sfx.play('door'), 250); }
    else { const name = map[e.type]; if (name) sfx.play(name); }
  }
  private eliteMini(): boolean { return !!this.map.elites.find(e => e.id === this.state?.battle?.source)?.mini; }
  // Seal progress (3B) after an action that may finish an objective: a note only when the count moved.
  private sealNote(before: ExpeditionState, after: ExpeditionState): string {
    const was = questDone(before, this.map).length; const now = questDone(after, this.map).length; const need = this.map.quest.need;
    if (now <= was || was >= need) return '';
    return now >= need ? ' · ผนึกรอยแยกแตกแล้ว! ท้าผู้คุมได้' : ` · ผนึกรอยแยก ${now}/${need}`;
  }
  private eliteForced(): boolean { return !!this.map.elites.find(e => e.id === this.state?.battle?.source)?.forced; }
  private startEncounter(battleKind: 'tutorial' | 'random' | 'boss' | 'elite' | 'event', encounterId: string): void {
    const data = this.lookup(encounterId)!;
    this.locked = true;
    const kind = battleKind === 'random' || battleKind === 'event' ? 'encounter' : battleKind;
    const eyebrow = kind === 'boss' ? 'บอส · รอยแยกกำลังตื่นขึ้น' : kind === 'elite' ? (this.eliteMini() ? 'มินิบอส · ยักษ์หินแห่งรอยแผล' : this.eliteForced() ? 'อีลิท · ผู้เฝ้าด่าน' : 'อีลิท · ท้าสู้ · รางวัลพิเศษ') : kind === 'tutorial' ? 'ศึกแรก' : 'พบศัตรู!';
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
    this.state = result.state; this.persist(); sfx.play('rest');
    this.message = `พักที่แคมป์แล้ว · คนที่ยืนอยู่ฟื้นเลือด ${this.map.camp.restHealPercent}% ไฟแคมป์จะจุดใหม่เมื่อชนะศึก`;
    if (result.event.respawned?.length) this.message += ` · อีลิทกลับมาแล้ว: ${result.event.respawned.map(id => this.lookup(this.map.elites.find(e => e.id === id)!.encounterId)?.name ?? id).join(', ')} (แรงขึ้น ไม่มีโบนัสเหรียญ/ตรา)`;
    this.effect = 'rest';
    this.renderWorld();
  }
  // 4B: free travel between reached camps and the entrance.
  private travelTo(to: Point): void {
    if (!this.state || this.locked) return;
    const result = travel(this.state, this.map, to); if (result.event.type !== 'travelled') return;
    this.state = result.state; this.persist(); sfx.play('door');
    this.message = tileAt(this.map, to)?.kind === 'start' ? 'วาร์ปกลับทางเข้าด่านแล้ว' : 'วาร์ปถึงแคมป์แล้ว';
    this.renderWorld();
  }
  private revive(heroId: string): void {
    if (!this.state || this.locked) return;
    const result = revive(this.state, this.map, this.lookup, heroId);
    if (result.event.type !== 'revived') return;
    this.state = result.state; this.persist(); sfx.play('heal');
    this.message = `ชุบ${heroText[heroId]?.name ?? ''}แล้ว · ใช้ถ่านคืนชีพ 1 เหลือ ${this.state.resources.ember}`;
    this.effect = 'rest';
    this.renderWorld();
  }
  private roster(result: { state: ExpeditionState; event: WorldEvent }): void {
    if (!this.state || this.locked || result.event.type !== 'roster') return;
    this.state = result.state; this.persist();
    this.message = 'จัดทีมแล้ว · ศัตรูเล็งตามหมายเลขช่อง';
    this.renderWorld();
  }
  // Map bag gear (2026-10-17): saved at once, like every other map action.
  private gear(result: { state: ExpeditionState; event: WorldEvent }): void {
    if (!this.state || this.locked || result.event.type !== 'equipped') return;
    this.state = result.state; this.persist(); sfx.play('guard');
    this.message = `เปลี่ยนอุปกรณ์${heroText[result.event.heroId]?.name ?? ''}แล้ว`;
    this.renderWorld();
  }
  // Map potions (2D-5): saved at once, like every other map action.
  private drink(potion: PotionId, heroId?: string): void {
    if (!this.state || this.locked) return;
    const result = usePotion(this.state, this.map, this.lookup, potion, heroId);
    if (result.event.type !== 'potion') return;
    this.state = result.state; this.persist(); sfx.play('potion');
    const healed = Object.entries(result.event.heal ?? {}).map(([id, n]) => `${heroText[id]?.name ?? id} +${n}`).join(' · ');
    this.message = `${potionText[potion].name} · ${potion === 'repel' ? `ไม่เจอศัตรูสุ่ม ${this.map.potions.repelSteps} ก้าว` : `ฟื้นเลือด ${healed}`}`;
    this.renderWorld();
  }
  private openChest(): void {
    if (!this.state || this.locked) return;
    const result = openChest(this.state, this.map);
    if (result.event.type !== 'chest') return;
    const before = this.state;
    this.state = result.state; this.persist(); sfx.play(this.map.chests.find(c => c.id === (result.event.type === 'chest' ? result.event.chestId : ''))?.tier === 'rare' ? 'chestRare' : 'chest');
    this.message = `เปิดกล่องสมบัติ · ${lootThai(result.event.loot)}${result.event.potion ? ` · ${potionText[result.event.potion].name} +1` : ''}`;
    this.message += this.sealNote(before, result.state);
    this.effect = 'loot';
    this.renderWorld();
  }
  private describe(event: WorldEvent): string {
    switch (event.type) {
      case 'moved': return event.chance ? `ก้าวต่อไป · ไม่พบศัตรู (โอกาส ${event.chance}%)` : 'พื้นที่ปลอดภัย';
      case 'encounter': return event.kind === 'boss' ? `${this.map.bossName}ขวาง${this.map.goalName}ไว้!` : event.kind === 'elite' ? (this.eliteMini() ? 'มินิบอสยักษ์หินลุกขึ้นขวาง · ชนะแล้วนับเป็นเป้าหมายผนึกรอยแยก' : this.eliteForced() ? 'อีลิทเฝ้าด่านขวางทางไว้ · ต้องชนะถึงจะผ่าน' : `ท้าสู้อีลิท · ชนะได้ EXP ×${this.map.eventRules.optionalElite.exp} เหรียญทอง +${this.map.eventRules.optionalElite.gold} ตราสัญญา +${this.map.eventRules.optionalElite.seal} และอุปกรณ์ชั้นดี`) : 'พบศัตรู!';
      case 'event': return eventText[this.map.events.find(e => e.id === event.eventId)!.kind].name;
      // 3C puzzles and secrets.
      case 'rune': return event.solved ? 'หินรูนเรืองแสงครบ · ประตูหินเปิดออกแล้ว' : event.reset ? 'หินรูนดับลง · ลำดับผิด ดูสัญลักษณ์บนประตูหิน' : `หินรูนเรืองแสง ${event.step}/3`;
      case 'lever': return event.solved ? 'ดึงคันโยกครบ · ประตูคลังเปิดออกแล้ว' : `ดึงคันโยกแล้ว ${event.pulled}/2 · อีกอันอยู่อีกฝั่ง`;
      case 'pushed': return event.filled ? 'ผลักหินลงหลุมแล้ว · ทางข้างหน้าเปิด' : 'ผลักหินไปหนึ่งช่อง';
      case 'secret': return 'กำแพงร้าวนี้เดินทะลุได้ · พบทางลับ!';
      case 'herb': return `เก็บสมุนไพรเรืองแสงแล้ว (${this.game?.run?.herbs.length ?? 0}/${this.map.herbs.length}) · กลับถึงแคมป์แล้วไปส่งเฟิร์นนะ`;
      case 'goal': return `ถึง${this.map.goalName}แล้ว`;
      default: return this.message;
    }
  }

  private openBattle(): void {
    const s = this.state!; const b = s.battle!; const data = battleData(s, this.map, this.lookup)!;
    this.show('battle');
    this.battle.open({
      kind: b.kind, data, entry: { hp: b.entry }, commands: b.commands,
      commit: (state: BattleState) => this.commitBattle(state),
      leaveLabel: (outcome: Outcome) => outcome === 'victory' ? (b.kind === 'boss' ? `ไปยัง${this.map.goalName} →` : 'กลับสู่แผนที่ →') : b.kind === 'tutorial' ? 'ลองศึกแรกอีกครั้ง ↻' : !this.state ? 'ทีมล้มหมด · กลับค่าย →' : this.state.camp ? 'กลับแคมป์ →' : 'กลับทางเข้าด่าน →',
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
        if (kind === 'tutorial') this.prologueWon = true;
        const loot = lootThai(result.event.loot) + (result.event.item ? ` · ได้${(result.event.items ?? [result.event.item]).map(i => `${itemName(i)} Lv${i.level}`).join(', ')}` : ''); this.effect = 'loot'; const exp = expThai(result.event.exp, next);
        const dust = result.event.dust ? ` · ฝุ่นดาว +${result.event.dust}` : '';
        this.message = kind === 'boss' ? `${this.map.bossName}ล้มแล้ว · ${loot}${exp} · ทางไปประตูเปิดออก` : kind === 'elite' ? this.map.elites.find(e => e.id === next.elitesDefeated.at(-1))?.mini ? `มินิบอสล้มแล้ว · ${loot}${exp}` : (this.map.elites.find(e => e.id === next.elitesDefeated.at(-1))?.forced ? `อีลิทล้มแล้ว · ${loot}${exp} · ด่านเปิดออก` : `ท้าสู้สำเร็จ · รางวัลพิเศษ · ${loot}${exp}`) : kind === 'event' ? `ชนะศึก · ${loot}${dust}${exp}` : `ชนะศึก · ${loot}${exp}${fallen ? ` · ${fallen} คนล้มอยู่ ชุบที่แคมป์` : ''}`;
        this.message += this.sealNote(this.state, next);
      } else if (result.event.type === 'defeat') {
        if (result.event.wiped) {
          // Every brought member is down: the expedition fails and settles home in this write.
          const before = this.game!.profile; const after = settle(before, next, 'wiped', this.map);
          this.game = { profile: after, run: null }; this.pendingSummary = runSummary(before, next, after, 'wiped', this.map); this.persist();
          return this.saved;
        }
        this.message = kind === 'tutorial' ? 'ลองศึกแรกอีกครั้งด้วยเลือดเต็ม' : 'ทีมถอยกลับ · คนที่ล้มยังล้มอยู่ ชุบที่แคมป์ หรือสลับตัวสำรองในกระเป๋า';
      }
    }
    this.state = next; this.persist();
    return this.saved;
  }
  private leaveBattle(): void {
    if (!this.state) { this.lobbyMessage = ''; this.lobbyCheer = ''; this.locked = false; this.showSummary(); return; }
    if (this.state.battle) { this.openBattle(); return; }
    this.locked = false;
    this.banner = undefined;
    this.renderWorld();
    // After the prologue fight, Vargoth withdraws into the rift and the journey's goal is set.
    const focus = () => this.views.world.querySelector<HTMLElement>('#move-up')?.focus({ preventScroll: true });
    if (this.prologueWon) { this.prologueWon = false; this.music.play('archway'); this.story.play(prologueEnd, 'ออกเดินทาง', () => { this.music.play('meadow'); this.playRecruits(focus); }); return; }
    this.playRecruits(focus);
  }
}
