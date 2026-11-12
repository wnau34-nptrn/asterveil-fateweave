import { showBattleRewards, type BattleRewards } from './battle-rewards';
import { bindInfoTabs } from './info-tabs';
import { rosterIds } from '../core/world/world';
import { applyCommand, isRejected, type CampCommand, type CommandEvent, type CommandResult, type GameCommand, type RunCommand } from '../core/command/game-command';
import { clientView, type HireSlot } from '../core/command/client-view';
import type { ServerClient, ServerFailure, ServerOutcome, ServerState } from '../platform/server-client';
import { AccountPanel } from './account-panel';
import { setSavePlace } from './save-place';
import { gameFromView, resultFromReply } from './server-game';
import { localSeedSource } from '../platform/seed-source';
import { shortcutBlocked } from '../platform/keyboard';
import type { BattleState, Outcome } from '../core/battle/types';
import { clearLegacySaves, loadGame, saveGame, type Game } from '../core/save/expedition-save';
import { type createCommander, featureOpen } from '../core/world/profile';
import type { Point, Direction, EventChoice, ExpeditionState, MapDefinition, PotionId, Profile, ProfileEvent, ProfileResult, ShopItemId, WorldEvent, WorldResult } from '../core/world/types';
import { tileAt, questDone, battleData, heroCatalog, type EncounterLookup } from '../core/world/world';
import { Music, type Track } from '../platform/music';
import { firstClearStory, runSummary, SummaryUI, type RunSummary } from './summary-ui';
import { sfx, type SfxName } from '../platform/sfx';
import { browserStorage } from '../platform/browser-storage';
import type { BattleUI } from './battle-ui';
import { leaderArt, type NpcId } from '../game/visuals/assets';
import { choiceText, eventText, heroText, itemLines, itemName, lootThai, potionText, rewardText, shopText, tomeLineText, tomeSizeText, tomeThai } from './th';
import { laneName } from './formation-grid';
import { findItem } from '../core/world/forge';
import { CommanderUI } from './commander-ui';
import { LobbyUI } from './lobby-ui';
import { forgeStrike } from './forge-strike';
import { prologue, prologueEnd, recruitStory, StoryUI } from './story-ui';
import { WorldUI, type WorldBanner } from './world-ui';
import { icon, type IconName } from './icons';

// Owns the authoritative game (lobby profile + current run) and switches between the
// title, lobby, world and battle views. Every commit is saved before anything animates.
export class GameShell {
  private pendingRewards: BattleRewards | undefined;
  private game: Game | undefined;
  private get state(): ExpeditionState | undefined { return this.game?.run ?? undefined; }
  private set state(run: ExpeditionState | undefined) { if (this.game) this.game = { ...this.game, run: run ?? null }; }
  private lobby: LobbyUI;
  private commander: CommanderUI;
  private replacing = false;
  private lobbyMessage = '';
  // P01: what the move to camp levels did, said once on the map or in the lobby, whichever comes first.
  private migrationNote = '';
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
  // The map marker shows the encounter's leader: its boss, else its large foe, else its first foe.
  private eliteArtOf(map: MapDefinition): Record<string, string> {
    return Object.fromEntries(map.elites.map(e => [e.id, leaderArt(this.lookup(e.encounterId))]));
  }
  constructor(private readonly root: HTMLElement, private readonly home: MapDefinition, private readonly lookup: EncounterLookup, private readonly battle: BattleUI,
    private readonly views: { title: HTMLElement; commander: HTMLElement; lobby: HTMLElement; world: HTMLElement; battle: HTMLElement },
    private readonly maps: readonly MapDefinition[] = [home], private readonly server?: ServerClient) {
    const map = home;
    // P09-02c server play never reads or writes the local save: the account lives on the server.
    if (!server) clearLegacySaves(this.storage); sfx.init(this.storage);
    setSavePlace(server ? 'server' : 'device');
    this.game = server ? undefined : loadGame(this.storage, map, lookup, maps);
    // P01: a save moved to camp levels says once what happened, then the new save replaces it (the old one is backed up).
    const moved = this.game?.migrated;
    if (moved && this.game) {
      this.game = { profile: this.game.profile, run: this.game.run };
      this.migrationNote = `ย้ายเซฟเป็นเลเวลค่ายแล้ว · ค่าย Lv${moved.level}${moved.best ? ` ตาม${heroText[moved.best]?.name ?? ''}ที่ก้าวหน้าที่สุด (ไม่รวม EXP ทุกคน)` : ''} · ทุกคนในค่ายใช้เลเวลนี้`
        + (moved.battle ? ' · ศึกที่ค้างอยู่เริ่มใหม่จากเลือดตอนเริ่มศึก' : '')
        + ' · สำเนาเซฟเดิมเก็บไว้ในเบราว์เซอร์นี้';
      this.lobbyMessage = this.migrationNote;
      this.persist();
    }
    for (const id of this.game?.run?.recruited ?? []) this.recruitSeen.add(`${this.game!.run!.mapId}:${id}`);
    this.world = new WorldUI(views.world, this.map, heroCatalog(lookup, map), {
      travel: to => this.travelTo(to), move: dir => this.move(dir), rest: () => this.rest(), revive: id => this.revive(id), swap: (a, b) => this.step({ kind: 'swapMembers', a, b }, r => this.roster(r)), lane: (id, lane, other) => this.step({ kind: 'setLane', heroId: id, lane, ...(other !== undefined ? { other } : {}) }, r => this.roster(r)), moveMember: id => this.step({ kind: 'moveMember', heroId: id }, r => this.roster(r)), preset: slot => this.step({ kind: 'runPreset', slot }, r => this.roster(r)),
      withdraw: () => this.withdraw(), openChest: () => this.openChest(), usePotion: (potion, id) => this.drink(potion, id),
      chooseEvent: choice => this.chooseEvent(choice), draft: index => this.draft(index),
      talent: (id, node) => {
        if (!this.state || this.locked) return;
        this.step({ kind: 'learnRunTalent', heroId: id, node }, result => {
          if (result.event.type !== 'talent') return;
          this.state = result.state; this.persist(); sfx.play('buff');
          this.message = `ลงแต้มความถนัด${heroText[id]?.name ?? ''}แล้ว`;
          this.renderWorld();
        });
      },
      loadout: (id, actions) => {
        if (!this.state || this.locked) return;
        this.step({ kind: 'chooseRunLoadout', heroId: id, actions: [...actions] }, result => {
          if (result.event.type !== 'talent') return;
          this.state = result.state; this.persist(); sfx.play('buff');
          this.message = `เปลี่ยนสกิลติดตัว${heroText[id]?.name ?? ''}แล้ว`;
          this.renderWorld();
        });
      },
      wear: (id, from, index) => this.step({ kind: 'wear', heroId: id, from, index }, r => this.gear(r)), takeOff: (id, slot) => this.step({ kind: 'takeOff', heroId: id, slot }, r => this.gear(r)),
      autoEquip: plan => { if(this.state&&!this.locked)this.step({ kind: 'autoEquipRun', plan }, r => this.gear(r)); },
    }, this.eliteArtOf(this.map), lookup(map.tutorialEncounterId));
    const has = <K extends string, V>(k: K, v: V | undefined) => (v !== undefined ? { [k]: v } : {}) as Partial<Record<K, V>>;
    const camp = (cmd: CampCommand) => this.campCommand(cmd);
    this.lobby = new LobbyUI(views.lobby, map, lookup, heroCatalog(lookup, map), {
      hire: i => camp({ kind: 'hire', index: i }), refresh: () => camp({ kind: 'refreshBoard' }),
      buy: (item, hero) => camp({ kind: 'buy', item, ...has('heroId', hero) }), smelt: dust => camp({ kind: 'smelt', dust }), upgrade: id => camp({ kind: 'upgrade', heroId: id }),
      archive: (id, archived) => camp({ kind: 'setArchived', heroId: id, archived }),
      dismiss: id => camp({ kind: 'dismiss', heroId: id }), place: (id, group, other, lane) => camp({ kind: 'placeMember', heroId: id, group, ...has('other', other), ...has('lane', lane) }),
      lane: (id, lane, other) => camp({ kind: 'setPartyLane', heroId: id, lane, ...has('other', other) }),
      preset: (action, slot, name) => camp({ kind: 'preset', action, slot, ...has('name', name) }),
      skillLevel: (id, action) => camp({ kind: 'raiseSkill', heroId: id, action }),
      tomeTrade: (line, size, to) => camp({ kind: 'tradeTomes', line, size, ...has('to', to) }),
      talent: (id, node) => camp({ kind: 'learnTalent', heroId: id, node }), loadout: (id, actions) => camp({ kind: 'chooseLoadout', heroId: id, actions: [...actions] }), resetTalents: id => camp({ kind: 'resetTalents', heroId: id }),
      guide: (id, skip) => this.guide(id, skip),
      equip: (id, uid) => camp({ kind: 'equip', heroId: id, uid }), unequip: (id, slot) => camp({ kind: 'unequip', heroId: id, slot }),
      autoEquip: plan => camp({ kind: 'autoEquipCamp', plan }),
      transfer:(uid,index,donor,sourceIndex)=>camp({ kind: 'transferAffix', uid, index, donor, sourceIndex }),
      craft:(hero,level)=>camp({ kind: 'craftWeapon', heroId: hero, level }),
      bossTarget:target=>camp({ kind: 'bossTarget', target }),
      huntTarget:target=>camp({ kind: 'huntTarget', ...has('target', target) }),
      collect:ids=>camp({ kind: 'collectOverflow', ids: [...ids] }), recycleStored:(source,ids)=>camp({ kind: 'recycleStored', source, ids: [...ids] }),expandStorage:()=>camp({ kind: 'expandStorage' }),
      salvage: uids => camp({ kind: 'salvage', uids: [...uids] }),
      enhance: (uid,target) => camp({ kind: 'enhance', uid, target }), lock: uid=>camp({ kind: 'lockEquipment', uid }), fuse: (uid,donors) => camp({ kind: 'fuse', uid, ...has('donors', donors ? [...donors] : undefined) }), level:(uid,target)=>camp({ kind: 'raiseItemLevel', uid, target }),
      reroll: (uid, i) => camp({ kind: 'reroll', uid, index: i }), brew: potion => camp({ kind: 'brew', potion }), claim: id => camp({ kind: 'claimQuest', questId: id }),
      depart: (id, hard) => this.depart(id, hard), home: () => this.showTitle(),
    }, maps);
    const story = document.createElement('section'); root.append(story); this.story = new StoryUI(story);
    const summary = document.createElement('section'); root.append(summary); this.summary = new SummaryUI(summary, map);
    this.commander = new CommanderUI(views.commander, { create: c => this.createCommander(c), back: () => { this.replacing = false; this.showTitle(); } });
    views.title.addEventListener('click', e => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-title]');
      if (!button) return;
      if (button.dataset.title === 'account') { void this.account?.open(); return; }
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
    this.serverPanel = document.createElement('div'); this.serverPanel.className = 'server-wait'; this.serverPanel.hidden = true;
    if (server) this.account = new AccountPanel(root, { client: server, busy: note => this.lockForServer(note), idle: () => this.unlockForServer(),
      switched: note => { this.titleNote = note; this.connect('title'); } });
    this.serverPanel.setAttribute('role', 'status'); this.serverPanel.setAttribute('aria-live', 'polite'); root.append(this.serverPanel);
    this.showTitle();
    if (server) this.connect();
    document.addEventListener('keydown', e => {
      if (this.waiting || shortcutBlocked(e) || this.story.open || root.querySelector('.summary-view:not([hidden])')) return;
      const view = root.dataset.view;
      const bag = e.code === 'KeyB' || e.key.toLowerCase() === 'b';
      const team = e.code === 'KeyT' || e.key.toLowerCase() === 't';
      const info = e.code === 'KeyI' || e.key.toLowerCase() === 'i';
      const buttonId = team && view === 'world' ? 'world-team' : bag && view === 'world' ? 'world-pack' : info && view === 'world' ? 'world-info-button' : info && view === 'battle' ? 'battle-info' : undefined;
      const dialogId = team && view === 'world' ? 'team-dialog' : bag && view === 'world' ? 'pack-dialog' : info && view === 'world' ? 'world-info' : info && view === 'battle' ? 'game-info' : undefined;
      if (!buttonId || !dialogId) return;
      const modal = document.querySelector<HTMLDialogElement>('dialog[open]');
      if (modal && modal.id !== dialogId) return;
      e.preventDefault();
      if (modal) modal.close(); else root.querySelector<HTMLButtonElement>(`#${buttonId}`)?.click();
    });
    for (const [id, key] of [['world-team', 'T'], ['world-pack', 'B'], ['world-info-button', 'I'], ['battle-info', 'I']]) root.querySelector(`#${id}`)?.setAttribute('aria-keyshortcuts', key!);
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

      ${this.server ? `<button id="account-open" data-title="account" class="secondary">บัญชี · Google · รหัสกู้คืน</button><p class="title-server">เล่นผ่านเซิร์ฟเวอร์ทดลอง · ความคืบหน้าบันทึกบนเซิร์ฟเวอร์</p>${this.titleNote ? `<p class="title-server-note" role="status">${this.titleNote}</p>` : ''}` : this.storage ? '' : '<p class="title-warning">เบราว์เซอร์นี้ไม่อนุญาตให้บันทึก เล่นได้แต่จะไม่จำความคืบหน้า</p>'}</div><p class="title-footer">ชายแดนแอสเตอร์เวล</p></div>`;
    this.show('title');
    this.views.title.querySelector<HTMLElement>(g ? '#continue' : '#new-game')?.focus({ preventScroll: true });
  }
  // Server play keeps no local save: the server stored the state before it answered.
  private persist(): void { if (this.server) { this.saved = true; return; } if (this.game) this.saved = saveGame(this.storage, this.game); }
  // P09-02a: every camp and map action is a serializable command run by the pure `applyCommand`; new seeds come from
  // the injected source (locally the clock+Math.random generator the game always used). Seeds only choose future rolls.
  private readonly seeds = localSeedSource();
  // P09-02c: `then` gets the result at once in local play; in server play after the server answered, with input
  // locked meanwhile (one command at a time). `queue` keeps the latest command sent while waiting (battle turns).
  private exec(cmd: GameCommand, then: (result: CommandResult) => void, queue = false): void {
    if (!this.server) { then(applyCommand(this.game ?? null, cmd, { home: this.home, maps: this.maps, lookup: this.lookup, seeds: this.seeds })); return; }
    if (this.waiting) { if (queue) this.queued = { cmd, then }; return; }
    this.lockForServer('กำลังส่งไปเซิร์ฟเวอร์…');
    void this.server.send(cmd).then(out => this.answer(out, then));
  }
  // A map action as the world result the shell's handlers already read (a refusal reads as `blocked`, changing nothing).
  private step(cmd: RunCommand, then: (result: WorldResult) => void): void {
    this.exec(cmd, r => {
      if (!this.state) return;
      then(isRejected(r) ? { state: this.state, event: { type: 'blocked', reason: r.rejected } as WorldEvent } : { state: r.game.run!, event: r.events[0] as WorldEvent });
    });
  }
  // A camp service: refusals change nothing, as before; a result goes through the lobby's usual messages and effects.
  private campCommand(cmd: CampCommand): void {
    if (!this.game || this.game.run) return;
    this.exec(cmd, r => { if (isRejected(r)) return; this.profileChange({ profile: r.game.profile, event: r.events[0] as ProfileEvent }); });
  }
  // ---- P09-02c server play (off unless switched on; see platform/server-client.ts) ----
  private waiting = false;
  private queued: { cmd: GameCommand; then: (result: CommandResult) => void } | undefined;
  private afterWait: (() => void) | undefined;
  // The hiring board as the server computed it (it needs the seed the device does not have).
  private board: HireSlot[] = [];
  private serverPanel!: HTMLElement;
  // P09-02d: Google link/sign-in and recovery codes (server play only); a note after switching accounts.
  private account: AccountPanel | undefined;
  private titleNote = '';
  private inertBefore = new Map<Element, boolean>();
  private waitTimer: ReturnType<typeof setTimeout> | undefined;
  // Locks every view (pointer and keyboard) while the server works; the note shows only if the answer is slow.
  private lockForServer(note: string): void {
    this.waiting = true; this.root.dataset.server = 'waiting'; this.root.setAttribute('aria-busy', 'true');
    for (const el of Array.from(this.root.children)) if (el !== this.serverPanel && !this.inertBefore.has(el)) { this.inertBefore.set(el, (el as HTMLElement).inert); (el as HTMLElement).inert = true; }
    clearTimeout(this.waitTimer);
    this.waitTimer = setTimeout(() => { if (this.waiting && !this.serverPanel.dataset.problem) { this.serverPanel.innerHTML = `<p class="server-note">${note}</p>`; this.serverPanel.hidden = false; } }, 300);
  }
  private unlockForServer(): void {
    this.waiting = false; delete this.root.dataset.server; this.root.removeAttribute('aria-busy'); clearTimeout(this.waitTimer);
    for (const [el, was] of this.inertBefore) (el as HTMLElement).inert = was;
    this.inertBefore.clear();
    this.serverPanel.hidden = true; this.serverPanel.innerHTML = ''; delete this.serverPanel.dataset.problem;
  }
  private answer(out: ServerOutcome, then: (result: CommandResult) => void): void {
    if (out.kind === 'otherDevice' || out.kind === 'failed') { this.serverProblem(out.kind === 'otherDevice' ? 'other_device' : out.reason, then); return; }
    this.unlockForServer();
    if (out.kind === 'resynced') this.adopt(out.state, 'current', 'ข้อมูลบนเครื่องตามไม่ทัน · โหลดสถานะล่าสุดจากเซิร์ฟเวอร์แล้ว');
    else { if (out.reply.status === 'applied') this.board = out.reply.view.hireBoard; then(resultFromReply(out.reply)); }
    this.drain();
  }
  private drain(): void {
    if (this.waiting) return;
    const next = this.queued; this.queued = undefined;
    if (next) { this.exec(next.cmd, next.then); return; }
    const after = this.afterWait; this.afterWait = undefined; after?.();
  }
  // Takes the server's state as the game and shows it: on the title (entering) or where the player is (catching up).
  private adopt(state: ServerState, screen: 'title' | 'current', note = ''): void {
    this.game = state.view ? gameFromView(state.view) : undefined; this.board = state.view?.hireBoard ?? [];
    this.queued = undefined; this.pendingRewards = undefined; this.banner = undefined; this.locked = false; this.saved = true;
    if (screen === 'title' || !this.game) { this.showTitle(); return; }
    if (this.game.run) { this.migrationNote = note; this.resume(); } else { this.lobbyMessage = note; this.showLobby(); }
  }
  // Entering the game on this page (also after another device took over): guest account, take over, read the state.
  private connect(screen: 'title' | 'current' = 'title'): void {
    if (!this.server) return;
    this.lockForServer('กำลังเชื่อมต่อเซิร์ฟเวอร์…');
    void this.server.enter().then(out => {
      if (out.kind !== 'state') { this.serverProblem(out.kind === 'otherDevice' ? 'other_device' : out.reason); return; }
      this.unlockForServer(); this.adopt(out.state, screen); this.drain();
    });
  }
  // What went wrong, with the way out; input stays locked until the player picks one.
  private serverProblem(problem: ServerFailure | 'other_device', then?: (result: CommandResult) => void): void {
    const text: Record<ServerFailure | 'other_device', [string, string]> = {
      other_device: ['กำลังเล่นบนอุปกรณ์อื่น', 'บัญชีนี้เปิดเล่นอยู่บนอุปกรณ์หรือแท็บอื่น · เล่นต่อที่นี่ได้ แต่ที่นั่นจะหยุดแทน'],
      network: ['เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'คำสั่งล่าสุดยังไม่ได้รับคำตอบ · ส่งซ้ำได้ เซิร์ฟเวอร์จะไม่ทำซ้ำสองครั้ง'],
      server: ['เซิร์ฟเวอร์ยังไม่ตอบ', 'คำสั่งล่าสุดยังไม่ได้รับคำตอบ · ส่งซ้ำได้ เซิร์ฟเวอร์จะไม่ทำซ้ำสองครั้ง'],
      content_version: ['เวอร์ชันเกมไม่ตรงกับเซิร์ฟเวอร์', 'โหลดหน้าใหม่เพื่อรับเกมเวอร์ชันล่าสุด'],
      unauthorized: ['บัญชีทดลองใช้ไม่ได้แล้ว', 'เชื่อมต่อใหม่เพื่อเริ่มบัญชีทดลองใหม่'],
    };
    const retrying = (problem === 'network' || problem === 'server') && this.server?.waitingRetry && then;
    const action = problem === 'other_device' ? 'เล่นบนเครื่องนี้ต่อ' : problem === 'content_version' ? 'โหลดหน้าใหม่' : retrying ? 'ส่งอีกครั้ง' : 'เชื่อมต่อใหม่';
    const [title, detail] = text[problem];
    this.serverPanel.dataset.problem = problem; this.serverPanel.hidden = false;
    this.serverPanel.innerHTML = `<div class="server-card" role="alertdialog" aria-labelledby="server-problem-title"><h2 id="server-problem-title">${title}</h2><p>${detail}</p>`
      + `<button type="button" class="primary" data-server="act">${action}</button><button type="button" class="secondary" data-server="local">เล่นในเครื่องแทน</button></div>`;
    const button = this.serverPanel.querySelector<HTMLButtonElement>('[data-server="act"]')!;
    button.addEventListener('click', () => {
      delete this.serverPanel.dataset.problem; this.serverPanel.innerHTML = `<p class="server-note">กำลังเชื่อมต่อเซิร์ฟเวอร์…</p>`;
      if (problem === 'content_version') { location.reload(); return; }
      if (retrying && this.server) { void this.server.retry().then(out => this.answer(out, then)); return; }
      this.unlockForServer(); this.connect('current');
    }, { once: true });
    this.serverPanel.querySelector('[data-server="local"]')!.addEventListener('click', () => { const u = new URL(location.href); u.searchParams.set('server', 'off'); location.assign(u); }, { once: true });
    button.focus({ preventScroll: true });
  }
  private settledRun(events: readonly CommandEvent[]): ExpeditionState | undefined { const e = events.find(x => x.type === 'settled'); return e?.type === 'settled' ? e.run : undefined; }
  // Home → create commander → Lobby. A new game replaces the save only on confirmation.
  private showCommander(replacing: boolean): void { this.replacing = replacing; this.show('commander'); this.commander.open(); }
  private createCommander(c: Parameters<typeof createCommander>[1]): void {
    // Close the on-screen keyboard first: the prologue and the first battle follow at once, and a keyboard still
    // open on iOS leaves the page scrolled and laid out for a short, wide (landscape) viewport.
    (document.activeElement as HTMLElement | null)?.blur?.();
    this.exec({ kind: 'createCommander', commander: c, replace: this.replacing }, result => {
      if (isRejected(result)) return;
      this.game = result.game; this.replacing = false;
      this.lobbyMessage = `ยินดีต้อนรับ ผู้บัญชาการ${result.game.profile.commander!.name} · เลือกทีมแล้วออกเดินทางได้เลย`;
      this.persist();
      // A company that has never fought starts with the prologue: depart at once and meet Vargoth's vanguard.
      if (!result.game.profile.tutorialDone && !this.game.run) { this.lobbyMessage = ''; this.depart(); return; }
      this.showLobby();
    });
  }
  private showLobby(): void {
    this.migrationNote = '';
    const entering = this.root.dataset.view !== 'lobby';
    this.show('lobby');
    this.lobby.render({ profile: this.game!.profile, board: this.server ? this.board : clientView(this.game!, { home: this.home, lookup: this.lookup }).hireBoard, message: this.lobbyMessage, cheer: this.lobbyCheer, saved: this.saved && (!!this.storage || !!this.server), ...(this.npcCheer ? { npcCheer: this.npcCheer } : {}) });
    this.npcCheer = undefined;
    // Arriving in the camp opens on the fire; later redraws keep where the player panned to.
    if (entering) this.lobby.centreScene();
  }
  private guide(id: string, skip: boolean): void {
    if (!this.game || this.game.run) return;
    this.exec({ kind: 'claimGuide', id, skip }, result => {
      if (isRejected(result)) return;
      this.game = result.game; this.persist();
      this.lobbyMessage = skip ? 'ข้ามงานแนะนำแล้ว' : 'รับรางวัลงานแนะนำแล้ว'; this.showLobby();
    });
  }
  private presetText(p: Profile, slot: number, action: 'apply' | 'save' | 'rename' | 'clear', left?: string[]): string {
    const name = p.presets?.[slot]?.name ?? `ชุด ${slot + 1}`;
    return action === 'apply' ? `ใช้ชุดทีม “${name}” แล้ว${left?.length ? ` · สำรองเต็ม ${left.map(id => heroText[id]?.name ?? id).join(' ')} รออยู่ในค่าย` : ''}`
      : action === 'save' ? `บันทึกทีมตอนนี้ลงชุด “${name}” แล้ว` : action === 'rename' ? `เปลี่ยนชื่อชุดเป็น “${name}” แล้ว` : `ล้างชุดทีมช่อง ${slot + 1} แล้ว`;
  }
  private profileChange(result: ProfileResult): void {
    if (!this.game || this.game.run) return;
    const e = result.event; const name = (id: string) => heroText[id]?.name ?? '';
    if (e.type === 'blocked') return;
    this.game = { ...this.game, profile: { ...result.profile, last: null } }; this.persist();
    this.lobbyMessage = e.type === 'hired' ? (e.duplicate ? `ได้ตัวซ้ำของ${name(e.heroId)} · ใช้อัปดาวที่ตัวละคร → พัฒนา` : `จ้าง${name(e.heroId)}แล้ว`)
      : e.type==='bossTarget'?'บันทึกเป้าหมายบอสแล้ว':e.type==='huntTarget'?'บันทึกเป้าหมายฟาร์มแล้ว':e.type==='storageCollected'?`เก็บเข้าคลัง ${e.count} ชิ้นแล้ว`:e.type==='storageExpanded'?'ขยายคลังแล้ว': e.type === 'upgraded' ? `${name(e.heroId)}ขึ้นเป็น ★${e.stars} แล้ว` : e.type === 'archived' ? (e.archived ? `เก็บ${name(e.heroId)}เข้าคลังสมาชิกแล้ว · ดาว ของ และความถนัดอยู่ครบ` : `นำ${name(e.heroId)}ออกจากคลังสมาชิกแล้ว`) : e.type === 'dismissed' ? `เลิกจ้าง${name(e.heroId)}แล้ว · ได้เหรียญทองคืน ${this.map.company.dismissRefund}` : e.type === 'talent' || e.type === 'equipped' ? '' : e.type === 'skillLevel' ? `${name(e.heroId)} · ${this.lookup(this.map.tutorialEncounterId)!.skills[e.action].name} ขึ้นเป็น Lv${e.level}` : e.type === 'tomeTrade' ? `แลกได้ตำรา${tomeLineText[e.line]}${tomeSizeText[e.size]} 1 เล่ม` : e.type === 'salvaged' ? `แยกชิ้น ${e.count} ชิ้น · ได้แร่ดาว ${e.ore} ฝุ่นดาว ${e.dust}`
      : e.type === 'equipmentLocked' ? `${e.locked?'ล็อก':'ปลดล็อก'}${itemName(findItem(result.profile,e.uid)!.item)}แล้ว` : e.type === 'forged' ? this.forgedText(result.profile, e.uid, e.action) : e.type === 'brewed' ? `ปรุง${potionText[e.potion].name}แล้ว · มีอยู่ ${result.profile.potions[e.potion]} ขวด`
      : e.type === 'smelted' ? `ลุงบอร์กหลอมแร่ดาวเป็นฝุ่นดาว ${e.dust} · มีฝุ่นดาว ${result.profile.bank.dust}`
      : e.type === 'refreshed' ? `พีโน่เปลี่ยนป้ายจ้างใหม่แล้ว · สุ่มได้อีก ${this.map.shop.refreshCosts.length - result.profile.refreshes} ครั้ง`
      : e.type === 'bought' ? this.boughtText(result.profile, e)
      : e.type === 'claimed' ? `ได้รับรางวัลเควสต์ · ${rewardText(this.map.sideQuests.find(q => q.id === e.questId)!.reward)}` : e.type === 'party' && e.heroId && e.lane ? `จัดแผนแล้ว · ${name(e.heroId)}ยืน${laneName(e.lane)}` : e.type === 'party' && e.presetAction ? this.presetText(result.profile, e.preset!, e.presetAction, e.left) : 'จัดทีมแล้ว';
    this.lobbyCheer = e.type === 'hired' || e.type === 'upgraded' ? e.heroId : '';
    // The camp NPC whose service just succeeded cheers once.
    sfx.play(({ hired: 'coin', upgraded: 'upgrade', dismissed: 'close', talent: 'buff', equipped: 'guard', salvaged: 'anvil', forged: 'anvil', smelted: 'anvil', brewed: 'potion', claimed: 'claim', bought: 'coin', refreshed: 'coin' } as Partial<Record<string, SfxName>>)[e.type] ?? 'click');
    this.npcCheer = e.type === 'bought' || e.type === 'refreshed' ? 'broker' : e.type === 'claimed' ? this.map.sideQuests.find(q => q.id === e.questId)!.npc as NpcId
      : ({ hired: 'broker', talent: 'trainer', equipped: 'keeper', salvaged: 'keeper', forged: 'smith', smelted: 'smith', brewed: 'herbalist' } as Partial<Record<string, NpcId>>)[e.type];
    if(e.type==='forged'&&e.action==='enhance')this.lobby.forgeEnhanced(this.game.profile,e.uid);
    if(e.type==='forged'&&e.action==='level')this.lobby.forgeLeveled(this.game.profile,e.uid);
    if(e.type==='forged'&&e.action==='fuse')this.lobby.forgeFused(this.game.profile,e.uid);
    if(e.type==='forged'&&e.action==='reroll')this.lobby.forgeRerolled(this.game.profile,e.uid);
    if(e.type==='forged'&&e.action==='transfer')this.lobby.forgeTransferred(this.game.profile,e.uid);
    if(e.type==='forged'&&e.action==='craft')this.lobby.forgeServiced(this.game.profile,'craft',e.uid,this.saved);
    if(e.type==='salvaged')this.lobby.forgeServiced(this.game.profile,'recycle',e.count,this.saved);
    if(e.type==='smelted')this.lobby.forgeServiced(this.game.profile,'smelt',e.dust,this.saved);
    if(e.type==='skillLevel'||e.type==='tomeTrade')this.lobby.skillCommitted(this.game.profile,e,this.saved&&(!!this.storage||!!this.server));
    if(e.type==='upgraded')this.lobby.starUpgraded(this.game.profile,e,this.saved&&(!!this.storage||!!this.server));
    this.showLobby();
    if (e.type === 'forged' && (e.action === 'enhance' || e.action === 'level')) { const item = findItem(result.profile, e.uid)?.item; if (item) forgeStrike(this.root, item, e.action, this.reducedMotion.matches); }
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
    this.exec({ kind: 'depart', ...(mapId !== undefined ? { mapId } : {}), hard }, out => this.departed(out));
  }
  private departed(out: CommandResult): void {
    if (isRejected(out)) { if (out.rejected === 'storage') { this.lobbyMessage = 'จัดถาดรอเก็บในกระเป๋าก่อนออกเดินทาง'; this.showLobby(); } return; }
    this.chosenMap = out.game.run!.mapId;
    this.game = out.game;
    this.persist(); this.banner = undefined; this.locked = false; this.lobbyMessage = ''; this.lobbyCheer = '';
    this.message = 'แตะช่องที่ไฮไลต์หรือใช้ลูกศรเพื่อเดิน';
    // First expedition (lore): the prologue plays, then Vargoth's vanguard attacks before the first step (same command).
    if (out.events.some(e => e.type === 'encounter')) {
      this.locked = true; this.renderWorld();
      this.music.play('camp'); this.story.play(prologue(this.game.profile.commander?.name ?? 'ผู้บัญชาการ'), 'เข้าสู่การต่อสู้', () => { this.locked = false; this.openBattle(); });
      return;
    }
    this.renderWorld();
  }
  // Settles the run into the profile in the same write that clears it.
  private withdraw(): void {
    if (!this.game || !this.state) return;
    this.exec({ kind: 'withdraw' }, r => { if (!isRejected(r)) this.endRun(r.game, r.events, 'withdrawn'); });
  }
  private endRun(game: Game, events: readonly CommandEvent[], outcome: 'withdrawn' | 'complete'): void {
    const map = this.map; const before = this.game!.profile; const run = this.settledRun(events)!;
    this.game = game; this.pendingSummary = runSummary(before, run, game.profile, outcome, map);
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
    this.message = this.migrationNote || 'กลับมาเดินทางต่อจากจุดที่บันทึกไว้'; this.migrationNote = ''; this.lobbyMessage = '';
    this.banner = undefined;
    this.renderWorld();
    if (this.state?.draft) this.world.openDraft();
  }
  // Starter recruitment (owner 2026-10-23): each pick is saved at once, its recruit scene plays, then the next offers.
  private draft(index: number): void {
    if (!this.state || this.locked) return;
    this.step({ kind: 'draftPick', index }, result => {
      if (result.event.type !== 'drafted') return;
      this.state = result.state; this.persist(); this.world.closeDraft();
      this.message = `${heroText[result.event.heroId]?.name ?? ''} เข้าร่วมทีมแล้ว`; this.renderWorld();
      this.playRecruits(() => this.afterRecruits());
    });
  }
  private afterRecruits(): void {
    if (this.state?.draft) this.world.openDraft(); else this.views.world.querySelector<HTMLElement>('#move-up')?.focus({ preventScroll: true });
  }
  private renderWorld(): void {
    this.world.setMap(this.map, this.eliteArtOf(this.map));
    this.show('world');
    const profile = this.game!.profile;
    this.world.render({ presets: profile.presets, questBoard: { definitions: this.home.sideQuests, progress: profile.quests, unlocked: featureOpen(profile, this.maps, 'quests') }, state: this.state!, message: this.message, locked: this.locked, saved: this.saved && (!!this.storage || !!this.server), banner: this.banner, effect: this.effect });
    this.effect = undefined;
  }
  // Story recruits: play each newly joined guest once per session (a reload shows the ones already joined as seen).
  private recruitSeen = new Set<string>();
  private markRecruits(): void { for (const id of this.state?.recruited ?? []) this.recruitSeen.add(`${this.state!.mapId}:${id}`); }
  private playRecruits(then: () => void): void {
    const fresh = (this.state?.recruited ?? []).filter(id => !this.recruitSeen.has(`${this.state!.mapId}:${id}`));
    if (!fresh.length) { then(); return; }
    this.markRecruits();
    this.story.play(recruitStory(fresh, this.game?.profile.commander?.name || 'ผู้บัญชาการ'), 'ไปต่อ', then);
  }
  private move(dir: Direction): void {
    if (!this.state || this.locked) return;
    this.exec({ kind: 'move', dir }, out => this.moved(out));
  }
  private moved(out: CommandResult): void {
    if (!this.state) return;
    // Reaching the goal settles the run home in the same command.
    if (!isRejected(out) && !out.game.run) { this.worldSound(out.events[0] as WorldEvent); this.endRun(out.game, out.events, 'complete'); return; }
    const result: WorldResult = isRejected(out) ? { state: this.state, event: { type: 'blocked', reason: out.rejected } as WorldEvent } : { state: out.game.run!, event: out.events[0] as WorldEvent };
    if (result.event.type === 'blocked' && this.state.draft) { this.world.openDraft(); return; }
    if (result.event.type === 'blocked') {
      this.message = result.event.reason === 'wall' ? 'ทางนี้ไปต่อไม่ได้' : result.event.reason === 'party' ? 'ทีมที่ลงสนามล้มหมด · สลับตัวสำรองในกระเป๋า หรือชุบที่แคมป์ก่อนออกเดินทาง'
        : result.event.reason === 'stone' ? 'หินขยับไปทางนั้นไม่ได้' : result.event.reason === 'pit' ? 'หลุมลึกขวางทาง · ต้องหาอะไรมาถม'
        : result.event.reason === 'sealed' ? `${this.map.bossName}ยังถูกผนึก · ทำเป้าหมายให้ครบ ${this.map.quest.need} จาก ${this.map.quest.objectives.length} ก่อน (ตอนนี้ ${questDone(this.state, this.map).length}/${this.map.quest.need}) ดูได้ที่ช่องเป้าหมาย` : this.message;
      sfx.play('bump'); this.renderWorld(); return;
    }
    this.state = result.state; this.worldSound(result.event);
    this.persist();
    this.message = this.describe(result.event);
    // A recruit who steps in as the boss fight starts gets their scene first (owner 2026-10-23).
    if (result.event.type === 'encounter') { const { kind, encounterId } = result.event; this.locked = true; this.playRecruits(() => this.startEncounter(kind, encounterId)); return; }
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
    this.step({ kind: 'chooseEvent', choice }, result => {
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
    });
  }
  private rest(): void {
    if (!this.state) return;
    this.step({ kind: 'rest' }, result => {
      if (result.event.type !== 'rested') return;
      this.state = result.state; this.persist(); sfx.play('rest');
      this.message = `พักที่แคมป์แล้ว · คนที่ยืนอยู่ฟื้นเลือด ${this.map.camp.restHealPercent}% ไฟแคมป์จะจุดใหม่เมื่อชนะศึก`;
      if (result.event.respawned?.length) this.message += ` · อีลิทกลับมาแล้ว: ${result.event.respawned.map(id => this.lookup(this.map.elites.find(e => e.id === id)!.encounterId)?.name ?? id).join(', ')} (แรงขึ้น ไม่มีโบนัสเหรียญ/ตรา)`;
      this.effect = 'rest';
      this.renderWorld();
    });
  }
  // 4B: free travel between reached camps and the entrance.
  private travelTo(to: Point): void {
    if (!this.state || this.locked) return;
    this.step({ kind: 'travel', to }, result => {
      if (result.event.type !== 'travelled') return;
      this.state = result.state; this.persist(); sfx.play('door');
      this.message = tileAt(this.map, to)?.kind === 'start' ? 'วาร์ปกลับทางเข้าด่านแล้ว' : 'วาร์ปถึงแคมป์แล้ว';
      this.renderWorld();
    });
  }
  private revive(heroId: string): void {
    if (!this.state || this.locked) return;
    this.step({ kind: 'revive', heroId }, result => {
      if (result.event.type !== 'revived') return;
      this.state = result.state; this.persist(); sfx.play('heal');
      this.message = `ชุบ${heroText[heroId]?.name ?? ''}แล้ว · ใช้ถ่านคืนชีพ 1 เหลือ ${this.state.resources.ember}`;
      this.effect = 'rest';
      this.renderWorld();
    });
  }
  private roster(result: { state: ExpeditionState; event: WorldEvent }): void {
    if (!this.state || this.locked || result.event.type !== 'roster') return;
    this.state = result.state; this.persist();
    const e = result.event, preset = e.preset !== undefined ? this.game?.profile.presets?.[e.preset] : undefined;
    this.message = preset ? `ใช้ชุดทีม “${preset.name}” แล้ว${e.absent?.length ? ` · ไม่ได้พามา: ${e.absent.map(id => heroText[id]?.name ?? id).join(' ')}` : ''} · ใช้ในศึกถัดไป` : result.event.heroId && result.event.lane ? `จัดแผนแล้ว · ${heroText[result.event.heroId]?.name ?? ''}ยืน${laneName(result.event.lane)} ใช้ในศึกถัดไป` : 'จัดทีมแล้ว · ศัตรูเล็งตามหมายเลขช่อง';
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
    this.step({ kind: 'usePotion', potion, ...(heroId !== undefined ? { heroId } : {}) }, result => {
      if (result.event.type !== 'potion') return;
      this.state = result.state; this.persist(); sfx.play('potion');
      const healed = Object.entries(result.event.heal ?? {}).map(([id, n]) => `${heroText[id]?.name ?? id} +${n}`).join(' · ');
      this.message = `${potionText[potion].name} · ${potion === 'repel' ? `ไม่เจอศัตรูสุ่ม ${this.map.potions.repelSteps} ก้าว` : `ฟื้นเลือด ${healed}`}`;
      this.renderWorld();
    });
  }
  private openChest(): void {
    if (!this.state || this.locked) return;
    this.step({ kind: 'openChest' }, result => {
      if (result.event.type !== 'chest') return;
      const before = this.state!;
      this.state = result.state; this.persist(); sfx.play(this.map.chests.find(c => c.id === (result.event.type === 'chest' ? result.event.chestId : ''))?.tier === 'rare' ? 'chestRare' : 'chest');
      this.message = `เปิดกล่องสมบัติ · ${lootThai(result.event.loot)}${result.event.potion ? ` · ${potionText[result.event.potion].name} +1` : ''}${result.event.tomes ? ` · ${tomeThai(result.event.tomes)}` : ''}`;
      this.message += this.sealNote(before, result.state);
      this.effect = 'loot';
      this.renderWorld();
    });
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
      kind: b.kind, scene: this.map.id === 'deep-forest' ? 'forest' : this.map.id === 'veil-frontier' ? 'riftline' : 'ruins', data, entry: { hp: b.entry }, commands: b.commands,
      commit: (state: BattleState) => this.commitBattle(state),
      leaveLabel: (outcome: Outcome) => outcome === 'victory' ? (b.kind === 'boss' ? `ไปยัง${this.map.goalName} →` : 'กลับสู่แผนที่ →') : b.kind === 'tutorial' ? 'ลองศึกแรกอีกครั้ง ↻' : !this.state ? 'ทีมล้มหมด · กลับค่าย →' : this.state.camp ? 'กลับแคมป์ →' : 'กลับทางเข้าด่าน →',
      leave: () => this.leaveBattle(),
    });
  }
  private commitBattle(battle: BattleState): boolean {
    if (!this.state?.battle) return false;
    const kind = this.state.battle.kind; const before = this.state;
    // The command replays every turn with the resolver and finishes the battle when the replay has ended. In server play
    // the turns are already decided on the device (the resolver is deterministic); the answer arrives later and the
    // battle cannot be left before it has (`leaveBattle`).
    let saved = false;
    this.exec({ kind: 'battle', commands: battle.commands }, out => { saved = this.battleCommitted(out, kind, before); }, true);
    return this.server ? true : saved;
  }
  private battleCommitted(out: CommandResult, kind: NonNullable<ExpeditionState['battle']>['kind'], before: ExpeditionState): boolean {
    // The server refused what the device resolved: the two disagree, so take the server's state.
    if (isRejected(out)) { if (this.server) this.connect('current'); return false; }
    const event = out.events[0];
    if (event?.type === 'victory') {
      const next = out.game.run!;
      if (kind === 'tutorial') this.prologueWon = true;
      else this.pendingRewards = { event, before, after: next, commander: this.game?.profile.commander,
        title: kind === 'boss' ? `${this.map.bossName}ล้มแล้ว` : kind === 'elite' ? this.map.elites.find(e => e.id === next.elitesDefeated.at(-1))?.mini ? 'มินิบอสล้มแล้ว' : 'ท้าสู้อีลิทสำเร็จ' : 'ชนะศึก' };
      this.effect = 'loot'; this.message = 'ชนะศึก';
    } else if (event?.type === 'defeat') {
      if (!out.game.run) {
        // Every brought member is down: the expedition fails and settles home in this write.
        const map = this.map; const prior = this.game!.profile;
        this.game = out.game; this.pendingSummary = runSummary(prior, this.settledRun(out.events)!, out.game.profile, 'wiped', map); this.persist();
        return this.saved;
      }
        this.message = kind === 'tutorial' ? 'ลองศึกแรกอีกครั้งด้วยเลือดเต็ม' : 'ทีมถอยกลับ · คนที่ล้มยังล้มอยู่ ชุบที่แคมป์ หรือสลับตัวสำรองในกระเป๋า';
    }
    this.game = out.game; this.persist();
    return this.saved;
  }
  private leaveBattle(): void {
    // Server play: the last turn's answer decides where the battle leads (loot, settlement); wait for it.
    if (this.waiting) { this.afterWait = () => this.leaveBattle(); return; }
    if (!this.state) { this.lobbyMessage = ''; this.lobbyCheer = ''; this.locked = false; this.showSummary(); return; }
    if (this.state.battle) { this.openBattle(); return; }
    if (this.pendingRewards) {
      const rewards = this.pendingRewards; this.pendingRewards = undefined;
      showBattleRewards(this.root, this.map, rewards, () => this.leaveBattle()); return;
    }
    this.locked = false;
    this.banner = undefined;
    this.renderWorld();
    // After the prologue fight, Vargoth withdraws into the rift and the journey's goal is set.
    const focus = () => this.views.world.querySelector<HTMLElement>('#move-up')?.focus({ preventScroll: true });
    // The guests who part ways after it: this map's later recruits and prologue-only guests no longer on the roster.
    const parted = [...(this.map.recruits ?? []).filter(r => r.at !== 'prologue').map(r => r.hero), ...this.map.prologueGuests ?? []].filter(id => this.state && !rosterIds(this.state).includes(id) && !this.game?.profile.company.includes(id));
    if (this.prologueWon) { this.prologueWon = false; this.music.play('archway'); this.story.play(prologueEnd(parted), 'ออกเดินทาง', () => { this.music.play('meadow'); this.playRecruits(() => this.afterRecruits()); }); return; }
    this.playRecruits(this.state.draft ? () => this.afterRecruits() : focus);
  }
}
