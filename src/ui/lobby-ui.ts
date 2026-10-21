import {HuntPanel} from './loot-guide';
import {StorageManager} from './storage-manager';
import {storageCap,departureBlocked,type StorageSource} from '../core/world/storage';
import { ForgeWorkbench } from './forge-workbench';
import { CharacterPanel, type CharacterModel } from './character-panel';
import type { CharacterTab } from './character-view';
import { applyCampEquipment, campEquipment, type AutoEquipmentPlan } from '../core/world/auto-equipment';
import { newGearFilters, changeGearFilter, filteredEquipment, gearFilters as gearFilterControls } from './gear-inventory';
import { shortcutBlocked } from '../platform/keyboard';
import type { BossPower, ActionId, HeroDefinition } from '../core/battle/types';
import { withParty } from '../core/battle/engine';
import { hardReason, activeGuides, guideDone, featureMap, featureOpen, NAME_MAX, mapUnlocked, boardOffers, brewReason, buyReason, claimReason, sealLimit, refreshReason, shopLeft, dismissReason, equip, groupOf, hireReason, talentPoints, talentsSpent, upgradeCost, upgradeReason, type Group } from '../core/world/profile';
import { salvageValue } from '../core/world/equipment';
import { COMPANY_CAP, PARTY_SLOTS, POTION_IDS, RESERVE_SLOTS, SHOP_ITEMS, type GearSlot, type GuideKind, type LobbyFeature, type ShopItemId, type MapDefinition, type PotionId, type Profile, type TalentNode } from '../core/world/types';
import { expToNext, starred, type EncounterLookup } from '../core/world/world';
import { actorArt, actorFootOrigins, lobbyArt, lobbyPose, NPC_IDS, npcAtlasUrl, npcBustsUrl, npcStationsUrl, unitsUrl, type LobbyPose, type NpcId } from '../game/visuals/assets';
import { icon } from './icons';
import { commanderBadge } from './commander-ui';
import { gearArt, potionArt } from './equip-art';
import { skillDescription, heroText, npcText, rewardText, shopText, sideQuestText, itemLines, itemName, itemOwner, passiveText, potionText } from './th';

import { portrait, starRow } from './portraits';

export interface LobbyHost { autoEquip(plan: AutoEquipmentPlan): void; hire(index: number): void; refresh(): void; buy(item: ShopItemId, heroId?: string): void; smelt(dust: number): void; upgrade(id: string): void; dismiss(id: string): void; place(id: string, group: Group, other?: string): void; talent(id: string, node: TalentNode): void; resetTalents(id: string): void;
  transfer(uid:number,index:number,donor:number,sourceIndex:number):void; huntTarget(target?:string):void; bossTarget(target:BossPower):void; craft(hero:string,level:number):void;
  collect(ids:number[]):void; recycleStored(source:StorageSource,ids:number[]):void; expandStorage():void;
  equip(id: string, uid: number): void; unequip(id: string, slot: GearSlot): void; salvage(uids: number[]): void; renameCamp(name: string): void; guide(id: string, skip: boolean): void;
  enhance(uid: number, target: number): void; lock(uid:number):void; fuse(uid: number, donors:number[]): void; level(uid:number,target:number):void; reroll(uid: number, index: number): void; brew(potion: PotionId): void; claim(questId: string): void; depart(mapId?: string, hard?: boolean): void; home(): void }
// `npcCheer`: the camp NPC whose service just succeeded (plays its cheer once).
export interface LobbyView { profile: Profile; message: string; saved: boolean; cheer?: string; npcCheer?: NpcId }
type Sheet = 'team' | 'hire' | 'tree' | 'gear' | 'forge' | 'brew' | 'hunt' | 'maps' | 'camp';
// Each camp NPC stands at a fixed spot along the back of the camp (x %, left half faces right) and runs one service.
// `px`: the spot on portrait phones, where the camp is wider than the screen (3×) and pans sideways: the staff
// stand in the side areas and the team stays around the fire in the middle.
const npcSpots: Readonly<Record<NpcId, { x: number; px: number; sheet: Sheet }>> = {
  smith: { x: 7, px: 4.5, sheet: 'forge' }, keeper: { x: 21, px: 15.5, sheet: 'gear' }, trainer: { x: 35, px: 26.5, sheet: 'tree' },
  broker: { x: 65, px: 73.5, sheet: 'hire' }, herbalist: { x: 79, px: 84.5, sheet: 'brew' }, scout: { x: 93, px: 95.5, sheet: 'team' },
};
const npcOfSheet = (sheet: Sheet | null): NpcId | undefined => NPC_IDS.find(id => npcSpots[id].sheet === sheet);
const outcomeText = { complete: 'สำเร็จการเดินทาง', withdrawn: 'ถอนตัวกลับค่าย', wiped: 'ทีมล้มหมด · การเดินทางล้มเหลว' } as const;
const groupName: Record<Group, string> = { deployed: 'ลงสนาม', reserve: 'สำรอง', bench: 'ในค่าย' };

// Lobby (ค่ายทหารรับจ้าง) between expeditions: hire, upgrade, dismiss, choose the 4 + 4 to
// bring, and depart. It owns no rules; every action goes to the host, which saves first.
const guideText: Record<GuideKind, string> = {
  wear: 'สวมอุปกรณ์ 1 ชิ้นให้สมาชิก', enhance: 'ตีบวกอุปกรณ์ 1 ชิ้นที่ช่าง', talent: 'ลงแต้มต้นไม้ 1 แต้ม (ครูฝึก)', brew: 'ปรุงยา 1 ขวด',
  itemLevel: 'เพิ่ม Lv อุปกรณ์ 1 ชิ้นที่ช่าง', hire: 'จ้างทหารรับจ้างคนใหม่', reserve: 'จัดตัวสำรองอย่างน้อย 1 คน',
};
export class LobbyUI {
  private view: LobbyView | undefined;
  // The team, hire or talent-tree sheet floats over the camp; the scene alone shows when it is closed.
  // The tree sheet is its own window, opened from a member in the team sheet (`picked`).
  // The equipment sheet (2D-2) works the same way.
  // The forge (2D-4) is a third menu sheet.
  private sheet: Sheet | null = null;
  private readonly huntUI=new HuntPanel();
  private readonly storageUI:StorageManager;
  private readonly forgeUI:ForgeWorkbench;
  private forgeReturn:string|undefined;
  private readonly inventoryFilters = newGearFilters();
  private inventoryPick: string | undefined;
  private readonly characters: CharacterPanel;
  private confirmSalvage: number | undefined;
  private sceneDrawn = '';
  private picked: string | undefined;
  private confirmDismiss = false;
  // The broker's sheet shows the hiring board or the market (4A).
  private market = false;
  // The hiring offer being previewed (stats, skills and star unlocks) before hiring.
  private preview: number | undefined;
  constructor(private readonly root: HTMLElement, private readonly map: MapDefinition, private readonly lookup: EncounterLookup, private readonly heroes: readonly HeroDefinition[], private readonly host: LobbyHost,
    private readonly maps: readonly MapDefinition[] = [map]) {
    this.build();this.storageUI=new StorageManager(map,host);
    this.forgeUI=new ForgeWorkbench(map,heroes,lookup(map.tutorialEncounterId)!,{...host,quest:()=>this.questCard('smith')});
    this.characters=new CharacterPanel(root,map,heroes,lookup(map.tutorialEncounterId)!,{
      model:()=>this.characterModel(),
      preview:(id,key)=>{const p=this.view?.profile,entry=p&&campEquipment(p).find(e=>e.key===key);if(!p||!entry)return;const out=equip(p,id,entry.item.uid);return out.event.type==='equipped'?this.characterModel(out.profile):undefined;},
      previewPlan:plan=>{if(!this.view)return;const out=applyCampEquipment(this.view.profile,plan);return out.event.type==='equipped'?this.characterModel(out.profile):undefined;},
      wear:(id,key)=>{const entry=this.view&&campEquipment(this.view.profile).find(e=>e.key===key);if(entry)this.host.equip(id,entry.item.uid);},
      takeOff:(id,slot)=>this.host.unequip(id,slot),talent:(id,node)=>this.host.talent(id,node),reset:id=>this.host.resetTalents(id),applyPlan:plan=>this.host.autoEquip(plan),forge:(id,uid)=>{this.forgeReturn=id;this.sheet='forge';this.forgeUI.open(uid);this.draw();this.focus('#forge-change-item');},
    },'camp-',this.inventoryFilters);
    root.addEventListener('change',event=>{const c=event.target as HTMLInputElement|HTMLSelectElement;if(c.id==='boss-target'&&!root.hidden&&!root.closest('[inert]')&&!this.characters.open){this.huntUI.changeBoss(c.value);this.draw();this.focus('#boss-target');return;}if(c.id==='hunt-target'&&!root.hidden&&!root.closest('[inert]')&&!this.characters.open){this.huntUI.change(c.value);this.draw();this.focus('#hunt-target');return;}if(c.closest('.forge-workbench')&&!root.hidden&&!root.closest('[inert]')&&!this.characters.open){this.forgeUI.remember(c.closest<HTMLElement>('.forge-workbench')!);const focus=this.forgeUI.change(c);this.draw();this.focus('#'+focus);return;}if(c.dataset.gearFilter)this.storageUI.reset();if(c.closest('.character-dialog')||!c.dataset.gearFilter||root.hidden||root.closest('[inert]')||this.characters.open)return;changeGearFilter(this.inventoryFilters,c);this.draw();this.focus('#'+c.id);});
    root.addEventListener('keydown',e=>{if(root.hidden||root.closest('[inert]'))return;const tab=(e.target as HTMLElement).closest<HTMLButtonElement>('.forge-tabs [role=tab]');if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const buttons=[...root.querySelectorAll<HTMLButtonElement>('.forge-tabs [role=tab]')],i=buttons.indexOf(tab),n=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[n]!.click();this.focus('#'+buttons[n]!.id);return;}if(e.repeat&&(e.target as HTMLElement).closest('[data-forge=review],[data-forge=confirm],[data-lobby=salvage],[data-storage=confirm],[data-storage=collect],[data-storage=recycle],[data-storage=expand],[data-storage=common]'))e.preventDefault();});
    this.startWork();
    // Escape closes the sheet even after a redraw moved focus out of it (only while the lobby shows).
    root.ownerDocument.addEventListener('keydown', e => { if (!shortcutBlocked(e) && e.key === 'Escape' && this.sheet && !root.hidden && !this.characters.open) { e.preventDefault(); this.closeSheet(); } });
    root.addEventListener('click', e => {
      if(root.hidden||root.closest('[inert]')||this.characters.open)return;
      const el=e.target as HTMLElement;const storageButton=el.closest<HTMLButtonElement>('button[data-storage]');if(storageButton){const focus=this.storageUI.click(storageButton,this.view!.profile);this.draw();this.focus('#'+focus);return;}const forgeButton=el.closest<HTMLButtonElement>('button');if(forgeButton?.closest('.forge-workbench')&&(forgeButton.dataset.forge||forgeButton.hasAttribute('data-gear-reset'))){if(forgeButton.hasAttribute('data-gear-reset'))forgeButton.dataset.forge='reset';this.forgeUI.remember(forgeButton.closest<HTMLElement>('.forge-workbench')!);const focus=this.forgeUI.click(forgeButton,this.view!.profile);if(focus){this.draw();this.focus('#'+focus);}return;}if(el.closest('[data-gear-reset]')){this.storageUI.reset();Object.assign(this.inventoryFilters,newGearFilters());this.draw();this.focus('#camp-inventory-gear-filter-set');return;}
      const b = el.closest<HTMLButtonElement>('button[data-lobby]');
      if (!b || b.disabled) return;
      const id = b.dataset.hero;
      switch (b.dataset.lobby) {
        case 'npc': { const npc = b.dataset.npc as NpcId; const sheet = npcSpots[npc].sheet;
          if(sheet==='tree'&&!this.open('tree')){this.sheet='tree';this.draw();this.act(npc,'greet',1400);this.focus(`#npc-${npc}`);break;}
          if(sheet==='tree'){const id=this.view!.profile.party.deployed[0]??this.view!.profile.company[0];if(id){this.act(npc,'greet',1400);this.characters.openFor(id,'talents',b);}break;}
          // The trainer and keeper open for the first deployed member; the others open their own sheet.
          if (sheet === 'gear') this.picked = this.view!.profile.party.deployed[0];
          else this.picked = undefined;
          this.sheet = sheet; this.preview = undefined; this.confirmDismiss = false; this.openedLine(sheet); this.draw(); this.act(npc, 'greet', 1400); this.focus(`#npc-${npc}`); break; }
        case 'tab': this.huntUI.cancel();this.preview = undefined; this.sheet = b.dataset.tab as 'team' | 'hire' | 'gear' | 'forge' | 'brew' | 'hunt'; this.openedLine(this.sheet); { const n = npcOfSheet(this.sheet); if (n) this.act(n, 'greet', 1400); } this.picked = this.sheet==='gear'?(this.view!.profile.party.deployed[0]??this.view!.profile.company[0]):undefined; this.confirmDismiss = false; this.draw(); this.focus(`#lobby-tab-${this.sheet}`); break;
        case 'close': this.closeSheet(); break;
        case 'pick': this.pick(id, b.dataset.group as Group); break;
        case 'hire': this.host.hire(Number(b.dataset.index)); break;
        case 'hire-preview': this.preview = Number(b.dataset.index); this.draw(); this.root.querySelector('.lobby-content')?.scrollTo(0, 0); this.focus('#hire-preview-back'); break;
        case 'hire-preview-back': { const i = this.preview; this.preview = undefined; this.draw(); this.focus(`#hire-open-${i}`); break; }
        case 'hire-tab': this.market = b.dataset.tab === 'market'; this.preview = undefined; this.draw(); this.focus(`#hire-tab-${b.dataset.tab}`); break;
        case 'smelt': this.host.smelt(Number(b.dataset.dust)); this.focus(`#smelt-${b.dataset.dust}`); break;
        case 'refresh': this.host.refresh(); this.focus('#hire-refresh'); break;
        case 'buy': { const item = b.dataset.item as ShopItemId; const hero = item === 'contract' ? this.root.querySelector<HTMLSelectElement>('#contract-hero')?.value : undefined;
          this.host.buy(item, hero || undefined); this.focus(`#buy-${item}`); break; }
        case 'upgrade': if (this.picked) this.host.upgrade(this.picked); break;
        case 'dismiss':
          if (!this.picked) break;
          if (!this.confirmDismiss) { this.confirmDismiss = true; this.draw(); this.focus('#lobby-dismiss'); break; }
          this.confirmDismiss = false; { const target = this.picked; this.picked = undefined; this.host.dismiss(target); } break;
        case 'tree': case 'gear': case 'character': { const target=id??this.picked;if(target)this.characters.openFor(target,b.dataset.lobby==='tree'?'talents':b.dataset.lobby==='gear'?'gear':(b.dataset.tab as CharacterTab)??'overview',b);break; }
        case 'inventory-pick': this.inventoryPick=b.dataset.key;this.draw();this.focus('#camp-inventory-hero-'+this.view!.profile.company.find(id=>{const it=campEquipment(this.view!.profile).find(e=>e.key===this.inventoryPick)?.item;return it&&(it.slot!=='weapon'||it.hero===id);}));break;
        case 'inventory-character': if(id)this.characters.openFor(id,'gear',b,b.dataset.key);break;
        case 'sub-back': { const was = this.sheet; this.sheet = 'team'; this.draw(); this.focus(was === 'gear' ? '#lobby-gear-open' : '#lobby-tree-open'); break; }
        case 'salvage': {
          const uid = Number(b.dataset.uid); const item = this.view!.profile.items.find(i => i.uid === uid);
          // Rare and better items need a second press.
          if (item && (item.rarity >= 2 || !!item.plus || !!item.investment || !!item.levelInvestment) && this.confirmSalvage !== uid) { this.confirmSalvage = uid; this.draw(); this.focus(`#salvage-${uid}`); break; }
          this.confirmSalvage = undefined; this.host.salvage([uid]); this.focus('#lobby-sub-back'); break;
        }
        case 'claim': { const q = b.dataset.quest!; this.host.claim(q); this.focus(`#quest-claim-${q}`); break; }
        case 'brew': { const potion = b.dataset.potion as PotionId; this.host.brew(potion); this.focus(`#brew-${potion}`); break; }
        case 'forge-open': this.sheet='forge';this.forgeReturn=undefined;this.forgeUI.open(Number(b.dataset.uid));this.draw();this.focus('#forge-change-item');break;
        case 'lock': this.host.lock(Number(b.dataset.uid));this.focus('#lock-'+b.dataset.uid);break;




        case 'boss-apply': this.host.bossTarget(this.huntUI.bossTarget);this.focus('#boss-apply');break;
        case 'hunt-apply': this.host.huntTarget(this.huntUI.target);this.focus('#hunt-apply');break;
        case 'overflow': Object.assign(this.inventoryFilters,newGearFilters());this.storageUI.openOverflow();this.sheet='gear';this.picked=this.view!.profile.party.deployed[0];this.draw();this.focus('#storage-source-overflow');break;
        // Chapters: with more than one open map, departing first asks where to go.
        // Chapters: departing goes to the furthest open map; with more than one open, the map button picks another.
        case 'depart': this.host.depart(this.openMaps().at(-1)?.id); break;
        case 'maps': this.sheet = 'maps'; this.draw(); this.focus(`#map-go-${this.openMaps().at(-1)!.id}`); break;
        case 'go': this.sheet = null; this.host.depart(b.dataset.map, b.dataset.hard === 'true'); break;
        case 'home': this.host.home(); break;
        case 'guide': this.host.guide(b.dataset.guide!, b.dataset.skip === 'true'); this.focus('#lobby-depart'); break;
        case 'camp': this.sheet = 'camp'; this.draw(); this.focus('#camp-name'); break;
        case 'camp-save': { const input = this.root.querySelector<HTMLInputElement>('#camp-name'); if (input) this.host.renameCamp(input.value); this.focus('#camp-name'); break; }
        case 'pan': { const pan = this.root.querySelector<HTMLElement>('.lobby-pan')!; pan.scrollBy({ left: Number(b.dataset.dir) * pan.clientWidth * .8, behavior: this.reduced() ? 'auto' : 'smooth' }); break; }
      }
    });
  }
  // ---- Camp NPC life (ART-CHAR-NPC-001): idle by CSS; now and then one works; greet on open, cheer on success. ----
  private lineTurn = 0;
  private line: { sheet: Sheet; index: number } | undefined;
  private openedLine(sheet: Sheet): void { this.line = { sheet, index: this.lineTurn++ }; }
  private actTimers = new Map<NpcId, number>();
  private act(id: NpcId, act: 'work' | 'greet' | 'cheer', ms: number): void {
    const el = this.root.querySelector<HTMLElement>(`#npc-art-${id}`); if (!el || this.reduced()) return;
    el.dataset.act = act; clearTimeout(this.actTimers.get(id));
    this.actTimers.set(id, window.setTimeout(() => { if (el.dataset.act === act) delete el.dataset.act; }, ms));
  }
  private reduced(): boolean { return this.root.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false; }
  private workTurn = 0;
  private startWork(): void {
    // One NPC at a time works for a couple of loops, in turn, while the lobby shows.
    window.setInterval(() => {
      if (this.root.hidden || this.reduced()) return;
      const id = NPC_IDS[this.workTurn++ % NPC_IDS.length]!; const el = this.root.querySelector<HTMLElement>(`#npc-art-${id}`);
      if (el && !el.dataset.act) this.act(id, 'work', 2000);
    }, 2600);
  }
  // The bust and one line of the NPC who runs this sheet.
  private npcLine(sheet: Sheet | null): string {
    const id = npcOfSheet(sheet); if (!id || !sheet || (sheet === 'hire' && this.preview !== undefined && !this.market)) return '';
    const text = npcText[id]; const i = NPC_IDS.indexOf(id); const index = this.line?.sheet === sheet ? this.line.index : 0;
    return `<div class="npc-line" style="--busts:url(${npcBustsUrl()});--sx:${(i % 3) * 50}%;--sy:${Math.floor(i / 3) * 100}%"><span class="npc-bust" aria-hidden="true"></span><p><b>${text.name} · ${text.role}</b>${text.lines[index % text.lines.length]}</p></div>${this.questCard(id)}`;
  }
  // 3D: this NPC's side quest, with progress gathered from finished expeditions and a one-time claim.
  private questCard(npc: NpcId): string {
    const q = this.map.sideQuests.find(s => s.npc === npc); if (!q || !this.open('quests')) return '';
    const p = this.view!.profile; const st = p.quests[q.id] ?? { progress: 0, claimed: false }; const reason = claimReason(p, this.map, q.id); const t = sideQuestText[q.kind];
    return `<section class="side-quest" id="quest-${q.id}" data-state="${st.claimed ? 'claimed' : reason ? 'open' : 'ready'}" aria-label="เควสต์ ${t.name}">
      <p class="side-quest-head">${icon('flag')}<b>${t.name}</b><small>${st.progress}/${q.target}</small></p>
      <p class="side-quest-ask">${t.ask(q.target)}</p><div class="side-quest-bar" aria-hidden="true"><i style="width:${Math.round(st.progress / q.target * 100)}%"></i></div>
      <p class="side-quest-reward">รางวัล: ${rewardText(q.reward)}</p>
      ${st.claimed ? '<p class="side-quest-done">รับรางวัลแล้ว</p>' : `<button id="quest-claim-${q.id}" data-lobby="claim" data-quest="${q.id}" class="primary"${reason ? ' disabled' : ''}>${reason ? `สะสมจากการเดินทาง (${st.progress}/${q.target})` : 'รับรางวัล'}</button>`}</section>`;
  }
  // The scene and the NPC tap targets pan together (portrait phones); the HUD stays put above them.
  private build(): void {
    this.root.innerHTML = `<div class="lobby-shell"><div class="lobby-backdrop" aria-hidden="true" style="background-image:url(${lobbyArt('lobby_bg')})"></div><div class="lobby-pan"><div class="lobby-world"><div class="lobby-scene-host"></div>
      <div class="lobby-npcs">${NPC_IDS.map(id => `<button id="npc-${id}" data-lobby="npc" data-npc="${id}" class="npc-hit" style="--nx:${npcSpots[id].x}%;--npx:${npcSpots[id].px}%" aria-label="${npcText[id].name} ${npcText[id].role}"></button>`).join('')}</div></div></div><div class="lobby-hud"></div></div>`;
    const pan = this.root.querySelector<HTMLElement>('.lobby-pan')!; const shell = this.root.querySelector<HTMLElement>('.lobby-shell')!;
    const edges = () => { const max = pan.scrollWidth - pan.clientWidth; shell.classList.toggle('pan-start', pan.scrollLeft <= 4); shell.classList.toggle('pan-end', pan.scrollLeft >= max - 4); };
    // The camp painting is drawn on a screen-sized backdrop that follows the pan, not on the 3-screen-wide world:
    // one huge painted layer left black bands at the ends on iOS. Same placement as `cover` on the world.
    const backdrop = this.root.querySelector<HTMLElement>('.lobby-backdrop')!;
    const place = () => {
      const worldW = pan.scrollWidth, h = pan.clientHeight; const scale = Math.max(worldW / 2400, h / 1000); const iw = 2400 * scale, ih = 1000 * scale;
      backdrop.style.backgroundSize = `${iw}px ${ih}px`; backdrop.style.backgroundPosition = `${(worldW - iw) / 2 - pan.scrollLeft}px ${(h - ih) * .72}px`;
    };
    pan.addEventListener('scroll', () => { edges(); place(); }, { passive: true });
    let width = 0; new ResizeObserver(() => { if (pan.clientWidth !== width) { width = pan.clientWidth; this.centreScene(); } edges(); place(); }).observe(pan);
  }
  // Opens on the fire and the team; the staff are a swipe (or an arrow) away on each side.
  centreScene(): void {
    const pan = this.root.querySelector<HTMLElement>('.lobby-pan'); if (!pan) return;
    pan.scrollLeft = (pan.scrollWidth - pan.clientWidth) / 2;
  }
  private closeSheet(): void { this.preview = undefined; const was = this.sheet; this.huntUI.cancel();this.forgeUI.cancelReview();this.storageUI.reset(); this.sheet = null; this.picked = undefined; this.confirmDismiss = false; this.draw(); if(was==='forge'&&this.forgeReturn){const id=this.forgeReturn;this.forgeReturn=undefined;this.characters.openFor(id,'gear',this.root.querySelector<HTMLButtonElement>('#lobby-tab-forge')!);return;} if (was) this.focus(`#lobby-tab-${was}`); }
  render(view: LobbyView): void {
    const cheer = view.npcCheer && view !== this.view ? view.npcCheer : undefined;
    this.view = view;
    if (this.picked && !view.profile.company.includes(this.picked)) this.picked = undefined;
    if ((this.sheet === 'tree' || this.sheet === 'gear') && !this.picked) this.sheet = 'team';
    this.draw(); this.characters.refresh();
    if (cheer) this.act(cheer, 'cheer', 1600);
  }
  private characterModel(p=this.view?.profile):CharacterModel|undefined {
    if(!p)return;const hp=Object.fromEntries(p.company.map(id=>{const m=p.members[id]!,base=this.heroes.find(h=>h.id===id)!;return [id,starred(base,m.stars,this.map,m.level??1,m.talents,m.gear).maxHp];}));
    return {source:p,state:{members:p.members,roster:p.party,hp},ids:p.company,entries:campEquipment(p),available:true,camp:true,capacity:storageCap(p,this.map)};
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

  // The music toggle is handled by the shell; the lobby only draws it from the current preference.
  private musicButton(): string {
    const muted = document.documentElement.dataset.musicMuted === 'true';
    return `<button id="lobby-music" data-music-toggle class="round-glass" aria-pressed="${!muted}" aria-label="${muted ? 'เปิดเพลง' : 'ปิดเพลง'}">${icon(muted ? 'musicOff' : 'music')}</button>`;
  }
  private toastShown = '';
  private draw(): void {
    const huntScroll=this.sheet==='hunt'&&this.root.querySelector('#boss-target')?this.root.querySelector('.lobby-content')?.scrollTop:undefined;
    const p = this.view!.profile; const last = p.last;
    const ready = p.party.deployed.length > 0&&!departureBlocked(p);
    // A notice toasts once; redraws (tab switches, picks) keep it settled instead of replaying it.
    const notice = last ? `${last.outcome}:${last.steps}:${last.ore}:${p.expeditions}` : this.view!.message;
    const toast = notice && notice !== this.toastShown ? 'toast-new' : 'toast-seen'; this.toastShown = notice;
    // The camp scene fills the screen and is rebuilt only when who stands there (or how) changes.
    if (!this.root.querySelector('.lobby-scene-host')) this.build();
    const scene = this.scene(p);
    // A ready side quest puts a "!" over its NPC.
    for (const q of this.map.sideQuests) this.root.querySelector(`#npc-${q.npc}`)?.classList.toggle('quest-ready', !claimReason(p, this.map, q.id));
    if (scene !== this.sceneDrawn) { this.root.querySelector('.lobby-scene-host')!.innerHTML = scene; this.sceneDrawn = scene; }
    const menu = (id: Exclude<Sheet,'tree'>, glyph: Parameters<typeof icon>[0], label: string, shown: string, badge = this.locked(id) ? '🔒' : shown) =>
      `<button id="lobby-tab-${id}" data-lobby="tab" data-tab="${id}" class="lobby-menu-button${this.sheet === id || id === 'team' && this.sheet === 'tree' ? ' active' : ''}" aria-expanded="${this.sheet === id || id === 'team' && this.sheet === 'tree'}" aria-controls="lobby-sheet">${icon(glyph)}<span>${label}</span>${badge ? `<small>${badge}</small>` : ''}</button>`;
    const openOffers = boardOffers(p, this.map, this.lookup).filter((_, i) => !hireReason(p, this.map, this.lookup, i)).length;
    this.root.querySelector('.lobby-hud')!.innerHTML = `
      <button class="lobby-pan-button" data-lobby="pan" data-dir="-1" aria-label="เลื่อนดูค่ายทางซ้าย" tabindex="-1">${icon('left')}</button><button class="lobby-pan-button" data-lobby="pan" data-dir="1" aria-label="เลื่อนดูค่ายทางขวา" tabindex="-1">${icon('right')}</button>
      <header class="lobby-top"><button data-lobby="home" class="round-glass" aria-label="กลับหน้าแรก">${icon('left')}</button>${this.musicButton()}
        ${p.commander ? `<button id="lobby-camp" data-lobby="camp" class="lobby-camp-button" aria-label="เปลี่ยนชื่อค่าย ${this.escape(p.commander.camp)}">${commanderBadge(p.commander)}</button>` : ''}<div class="lobby-who"><p class="eyebrow">${p.commander ? this.escape(p.commander.camp) : 'ค่ายทหารรับจ้าง'} · ${this.view!.saved ? 'บันทึกอัตโนมัติ' : 'บันทึกบนเครื่องนี้ไม่ได้'}</p><h1 id="lobby-commander">${p.commander ? this.escape(p.commander.name) : 'เตรียมทีมก่อนออกเดินทาง'}</h1></div>
        <div class="lobby-bank" aria-label="คลัง เหรียญทอง ${p.bank.gold} แร่ดาว ${p.bank.ore} ตราสัญญา ${p.bank.seal} ฝุ่นดาว ${p.bank.dust}"><span class="glass-capsule" data-bank="gold">${icon('gold')}<b>${p.bank.gold}</b></span><span class="glass-capsule" data-bank="ore">${icon('ore')}<b>${p.bank.ore}</b></span><span class="glass-capsule">${icon('seal')}<b>${p.bank.seal}</b></span><span class="glass-capsule">${icon('dust')}<b>${p.bank.dust}</b></span></div></header>
      ${p.overflow?.length?`<button id="lobby-overflow" data-lobby="overflow" class="secondary storage-notice">ของรอจัด ${p.overflow.length} ชิ้น · เปิดถาดก่อนออกเดินทาง</button>`:""}
      ${last ? `<p class="lobby-result glass-capsule ${toast}" data-outcome="${last.outcome}" role="status">${icon(last.outcome === 'wiped' ? 'danger' : last.outcome === 'complete' ? 'star' : 'camp')}<span><b>${outcomeText[last.outcome]}</b> · เดิน ${last.steps} ก้าว ชนะ ${last.wins} ศึก · ได้แร่ดาว ${last.ore}${last.gold ? ` เหรียญทอง ${last.gold}` : ''}${last.seal ? ` ตราสัญญา ${last.seal}` : ''}${last.outcome === 'wiped' ? ' (เก็บได้ครึ่งเดียว)' : ''}${last.items ? ` · อุปกรณ์ ${last.items} ชิ้น` : ''}${last.salvaged ? ` (คลังเต็ม แยกชิ้นอัตโนมัติ ${last.salvaged})` : ''}</span></p>`
        : this.view!.message ? `<p class="lobby-result glass-capsule ${toast}" role="status"><span>${this.view!.message}</span></p>` : ''}
      ${this.sheet ? `<section id="lobby-sheet" class="lobby-sheet" role="dialog" aria-modal="false" aria-labelledby="lobby-sheet-title">
        <div class="lobby-sheet-head">${this.sheet === 'tree' || this.sheet === 'gear' ? `<button id="lobby-sub-back" data-lobby="sub-back" class="round-glass" aria-label="กลับไปจัดทีม">${icon('left')}</button>` : ''}<h2 id="lobby-sheet-title">${this.sheet === 'team' ? `${icon('flag')} จัดทีม <small>${p.company.length}/${COMPANY_CAP}</small>` : this.sheet === 'tree' ? `${icon('starFilled')} ต้นไม้ความถนัด` : this.sheet === 'gear' ? `${icon('gearBody')} อุปกรณ์ <small>คลัง ${p.items.length}/${storageCap(p,this.map)}</small>` : this.sheet === 'forge' ? `${icon('forge')} ช่างตีเหล็ก` : this.sheet === 'hunt'?`${icon('goal')} แผนฟาร์ม`:this.sheet === 'brew' ? `${icon('brew')} นักปรุงยา` : this.sheet === 'camp' ? `${icon('camp')} ชื่อค่ายทหารรับจ้าง` : this.sheet === 'maps' ? `${icon('map')} เลือกแผนที่` : `${icon('gold')} ป้ายจ้างทหารรับจ้าง`}</h2>
          <button data-lobby="close" class="round-glass" aria-label="ปิด">${icon('close')}</button></div>
        <div class="lobby-content">${this.sheet==='forge'?'':this.sheet==='gear'?`<details class="storage-keeper"><summary>มิมี่ · งานผู้ดูแลคลัง</summary>${this.npcLine(this.sheet)}</details>`:this.npcLine(this.sheet as Sheet | null)}${this.locked(this.sheet) ? this.lockedPanel(this.locked(this.sheet)!) : this.sheet==='hunt'?this.huntUI.render(p,this.map,this.open('bossCharm')):this.sheet === 'team' ? this.team(p) : this.sheet === 'gear' && this.picked ? this.gear(p, this.picked) : this.sheet === 'forge' ? this.forge(p) : this.sheet === 'brew' ? this.brewing(p) : this.sheet === 'maps' ? this.mapList(p) : this.sheet === 'camp' ? this.campForm(p) : this.board(p)}</div></section>` : ''}
      <footer class="lobby-bottom">
        ${this.guideCard(p)}
        <nav class="lobby-menu" aria-label="ค่าย">${menu('team', 'flag', 'ทีม', `${p.party.deployed.length}+${p.party.reserve.length}`)}${menu('hire', 'gold', 'จ้าง', openOffers ? String(openOffers) : '')}${menu('gear', 'pack', 'กระเป๋า', p.items.length ? String(p.items.length) : '')}${menu('hunt', 'goal', 'ฟาร์ม', '')}${menu('forge', 'forge', 'ช่าง', '')}${menu('brew', 'brew', 'ยา', '')}</nav>
        ${this.openMaps().length > 1 ? `<button id="lobby-maps" data-lobby="maps" class="secondary">${icon('map')}<span>เลือกแผนที่</span></button>` : ''}
        <button id="lobby-depart" data-lobby="depart" class="primary"${ready ? '' : ' disabled'}>${icon('map')}<span>ออกเดินทาง<small>${this.openMaps().at(-1)?.name ?? this.map.name} · ${p.party.deployed.length}+${p.party.reserve.length} คน</small></span></button>
      </footer>`;
    if(huntScroll!==undefined&&this.sheet==='hunt')this.root.querySelector('.lobby-content')!.scrollTop=huntScroll;
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
    // Camp NPCs stand behind the members at their stations; staff right of the fire are mirrored to face it.
    const staff = NPC_IDS.map((id, i) => { const flip = npcSpots[id].x > 50 ? -1 : 1;
      return `<span class="lobby-station" style="--nx:${npcSpots[id].x}%;--npx:${npcSpots[id].px}%;--flip:${flip};--stations:url(${npcStationsUrl()});--sx:${(i % 3) * 50}%;--sy:${Math.floor(i / 3) * 100}%"><i></i></span>`
        + `<span id="npc-art-${id}" class="lobby-npc" data-npc="${id}" style="--nx:${npcSpots[id].x}%;--npx:${npcSpots[id].px}%;--flip:${flip};--atlas:url(${npcAtlasUrl(id)});--nd:${i * -0.37}s"><b><i></i></b></span>`; }).join('');
    return `<div class="lobby-scene" aria-hidden="true" style="--lobby-bg:url(${lobbyArt('lobby_bg')});--lobby-fg:url(${lobbyArt('lobby_fg')});--lobby-pit:url(${lobbyArt('lobby_firepit')})"><div class="lobby-fire"><b></b><span class="lobby-flame"><i></i></span></div>${staff}${units}<div class="lobby-fg"></div><div class="lobby-embers">${'<i></i>'.repeat(7)}</div></div>`;
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
      <h3>${icon('camp')} สำรอง <span class="camp-embers">พาเข้าด่าน สลับได้ในกระเป๋านอกการต่อสู้</span></h3><div class="team-grid">${row(p.party.reserve, 'reserve', RESERVE_SLOTS)}</div>
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
    const label = !cost ? 'ดาวเต็มแล้ว' : reason ? `${why[reason]} · ★${m.stars + 1} ใช้ตัวซ้ำ ${need}${cost.seals ? ` (ตราแทนได้ ${sealLimit(this.map, m.stars)})` : ''} แร่ ${cost.ore}`
      : `อัปเป็น ★${m.stars + 1} · ตัวซ้ำ ${cost.dupes}${cost.seals ? ` + ตรา ${cost.seals}` : ''} · แร่ ${cost.ore}`;
    const last = dismissReason(p, id) === 'last';
    return `<div class="member-panel" aria-live="polite"><p><b>${heroText[id]!.name}</b> ${this.stars(m.stars)} <span>Lv${m.level ?? 1}${(m.level ?? 1) < this.map.progression.levelCap ? ` · EXP ${m.exp ?? 0}/${expToNext(this.map, m.level ?? 1)}` : ' · เลเวลสูงสุด'} · ตัวซ้ำที่เก็บไว้ ${m.dupes}</span></p><div class="member-subs character-links"><button id="lobby-character-open" data-lobby="character" data-tab="overview" class="secondary">ดูตัวละคร</button><button id="lobby-skills-open" data-lobby="character" data-tab="skills" class="secondary">สกิล</button>${this.treeButton(p, id)}${this.gearButton(p, id)}</div>
      <div class="member-actions"><button id="lobby-upgrade" data-lobby="upgrade" class="primary"${reason ? ' disabled' : ''}>${label}</button>
      <button id="lobby-dismiss" data-lobby="dismiss" class="danger-button"${last ? ' disabled' : ''}>${last ? 'ต้องมีคนลงสนาม 1 คน' : this.confirmDismiss ? `ยืนยันเลิกจ้าง · ดาวหาย +${this.map.company.dismissRefund} เหรียญทอง` : 'เลิกจ้าง'}</button></div></div>`;
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
    const all=this.storageUI.source==='bag'?campEquipment(p):(p.overflow??[]).map(item=>({key:'pending:'+item.uid,item,label:'รอจัดเข้าคลัง'})),entries=filteredEquipment(all,this.inventoryFilters),pick=all.find(e=>e.key===this.inventoryPick);
    const picker=pick?'<section class="inventory-pick"><h3>เลือกผู้สวมใส่: '+itemName(pick.item)+'</h3><div class="tree-members">'+p.company.map(c=>'<button id="camp-inventory-hero-'+c+'" data-lobby="inventory-character" data-hero="'+c+'" data-key="'+pick.key+'" class="tree-member"'+(pick.item.slot==='weapon'&&pick.item.hero!==c?' disabled':'')+'>'+portrait(c)+'<small>'+heroText[c]!.name+'</small></button>').join('')+'</div></section>':'';
    const manage=this.storageUI.render(p,entries.map(e=>e.item));if(manage.review)return manage.head;
    const pending=this.storageUI.source==='overflow';
    const rows=entries.map(e=>{const i=e.item,v=salvageValue(this.map,i),confirm=this.confirmSalvage===i.uid;return `<li data-rarity="${i.rarity}" data-item-key="${e.key}">${gearArt(i)}<div><b>${itemName(i)} Lv${i.level}${i.locked?' · 🔒':''}</b><small>${itemLines(this.map.equipment,i).join(' · ')}</small><small>${itemOwner(i)}</small></div><span class="gear-actions">${this.storageUI.row(i)}${pending?`<small>เก็บเข้าคลังก่อนสวมใส่/พัฒนา</small>`:`<button id="equip-${i.uid}" data-lobby="inventory-pick" data-key="${e.key}" class="secondary">ดู/เปรียบเทียบ</button><button id="forge-open-${i.uid}" data-lobby="forge-open" data-uid="${i.uid}" class="secondary">พัฒนา</button><button id="lock-${i.uid}" data-lobby="lock" data-uid="${i.uid}" class="secondary" aria-pressed="${!!i.locked}">${i.locked?'ปลดล็อก':'ล็อก'}</button><button id="salvage-${i.uid}" data-lobby="salvage" data-uid="${i.uid}" class="${confirm?'danger-button':'secondary'}"${i.locked?' disabled':''} aria-label="แยกชิ้น ได้แร่ ${v.ore} ผง ${v.dust}">${confirm?'ยืนยันแยก':'แยก'}</button>`}${confirm?`<small>รวมคืน แร่ ${v.ore} · ฝุ่น ${v.dust} · ชิ้นนี้จะหายไป</small>`:''}</span></li>`;}).join('');
    const commons=entries.filter(e=>e.item.rarity===0&&!e.item.locked&&!e.item.plus&&!e.item.investment&&!e.item.levelInvestment).length;
    return manage.head+'<details class="storage-characters"><summary>เปิดหน้าตัวละคร</summary>'+this.memberPicker(p,id,'gear',()=> '')+'</details>'+picker+'<h3>คลัง '+entries.length+'/'+(pending?(p.overflow?.length??0):p.items.length)+' ชิ้น</h3>'+gearFilterControls(this.inventoryFilters,'camp-inventory-')+(rows?'<ul class="gear-bag inventory-gear">'+rows+'</ul>':'<p class="camp-note">ไม่พบอุปกรณ์ตามตัวกรอง</p>')+(!pending&&commons?'<button id="salvage-common" data-storage="common" class="secondary">ตรวจแยกธรรมดาที่แสดง ('+commons+' ชิ้น)</button>':'');
  }
  // Map potions (2D-5): brew for ore and veil dust; each departure packs up to `carry` of each.
  private brewing(p: Profile): string {
    const rules = this.map.potions; const why: Record<string, string> = { ore: 'แร่ดาวไม่พอ', dust: 'ฝุ่นดาวไม่พอ' };
    return `<p class="hire-cost">${icon('ore')} ${p.bank.ore} · ${icon('dust')} ${p.bank.dust} · ออกเดินทางแล้วพายาไปอย่างละไม่เกิน ${rules.carry} ขวด ที่เหลือเก็บไว้ที่ค่าย</p>
      <ul class="hire-list brew-list">${POTION_IDS.map(id => { const cost = rules.brew[id]; const reason = brewReason(p, this.map, id);
        return `<li>${potionArt(id)}<span><b>${potionText[id].name}</b><small>${potionText[id].help(rules)}</small><small class="hire-status">มีที่ค่าย ${p.potions[id]} ขวด · จะพาไป ${Math.min(rules.carry, p.potions[id])}</small></span>
          <button id="brew-${id}" data-lobby="brew" data-potion="${id}" class="secondary"${reason ? ' disabled' : ''}>${reason ? why[reason] : `ปรุง · แร่ ${cost.ore} ผง ${cost.dust}`}</button></li>`; }).join('')}</ul>
      <details class="lobby-help"><summary>${icon('info')} ยาใช้อย่างไร</summary><p>ใช้บนแผนที่จากปุ่มสัมภาระ ใช้ระหว่างต่อสู้ไม่ได้ · ยาที่เหลือกลับค่ายเมื่อจบด่านหรือถอนตัว ถ้าทีมล้มหมดยาที่พาไปจะหาย · กล่องสมบัติมีโอกาสได้ยา</p></details>`;
  }
  private forge(p:Profile):string {return this.forgeUI.render(p,f=>this.open(f));}
  // Opens the member's talent tree in its own sheet.
  private treeButton(p: Profile, id: string): string {
    if (!this.map.talents[id]) return '';
    const m = p.members[id]!; const points = talentPoints(this.map, m); const spent = talentsSpent(m.talents); const free = points - spent;
    return `<button id="lobby-tree-open" data-lobby="tree" class="secondary tree-toggle">${icon('starFilled')}<span>ต้นไม้ความถนัด</span><small>${free > 0 ? `แต้มว่าง ${free}` : `ใช้ ${spent}/${points} แต้ม`}</small></button>`;
  }
  private board(p: Profile): string {
    const tabs = `<div class="hire-tabs" role="tablist">${(['board', 'market'] as const).map(t => `<button id="hire-tab-${t}" role="tab" data-lobby="hire-tab" data-tab="${t}" aria-selected="${(t === 'market') === this.market}" class="${(t === 'market') === this.market ? 'active' : ''}">${icon(t === 'market' ? 'pack' : 'gold')}<span>${t === 'market' ? 'ตลาด' : 'ป้ายจ้าง'}</span></button>`).join('')}</div>`;
    if (this.market) return tabs + this.marketList(p);
    if (this.preview !== undefined && boardOffers(p, this.map, this.lookup)[this.preview]) return this.hirePreview(p, this.preview);
    const why: Record<string, string> = { taken: 'จ้างแล้ว', gold: 'เหรียญทองไม่พอ', full: `ค่ายเต็ม ${COMPANY_CAP} คน`, maxed: 'ดาวเต็มแล้ว' };
    const costs = this.map.shop.refreshCosts; const left = costs.length - p.refreshes; const rr = refreshReason(p, this.map);
    const refresh = `<button id="hire-refresh" data-lobby="refresh" class="secondary hire-refresh"${rr ? ' disabled' : ''}>${icon('reroll')}<span>${rr === 'limit' ? 'สุ่มป้ายครบแล้วรอบนี้' : `สุ่มป้ายใหม่ · ${costs[p.refreshes]} เหรียญทอง`}<small>เหลือ ${left}/${costs.length} ครั้ง${rr === 'gold' ? ' · เหรียญทองไม่พอ' : ''}</small></span></button>`;
    return `${tabs}<p class="hire-cost">จ้างคนละ <span class="icon-gold">${icon('gold')}</span> ${this.map.company.hireCost} เหรียญทอง (มี ${p.bank.gold}) · ป้ายเปลี่ยนใหม่เมื่อกลับจากการเดินทาง</p>
      <ul class="hire-list">${boardOffers(p, this.map, this.lookup).map((id, i) => {
        const reason = hireReason(p, this.map, this.lookup, i); const h = this.hero(id); const text = heroText[id]!; const m = p.members[id];
        const status = m ? `${this.stars(m.stars)} ตัวซ้ำ ${m.dupes} · มีในค่าย` : 'ใหม่ · ★1';
        return `<li class="${reason === 'taken' ? 'taken' : ''}"><button id="hire-open-${i}" data-lobby="hire-preview" data-index="${i}" class="hire-open" aria-label="ดูข้อมูล${text.name}ก่อนจ้าง">${portrait(id)}<span><b>${text.name}</b><small>${text.role} · ${h.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'} · ${text.help}</small><small class="hire-status">${status} · แตะเพื่อดูสกิล</small></span></button>
          <button id="hire-${i}" data-lobby="hire" data-index="${i}" class="secondary"${reason ? ' disabled' : ''} aria-label="จ้าง${text.name} ใช้เหรียญทอง ${this.map.company.hireCost}">${reason ? why[reason] ?? 'จ้างไม่ได้' : `จ้าง · ${this.map.company.hireCost}`}</button></li>`;
      }).join('')}</ul>${refresh}
      <details class="lobby-help"><summary>${icon('info')} วิธีจ้างและอัปดาว</summary><p>ทุกคนเริ่ม ★1 · จ้างคนที่มีอยู่แล้วจะได้ตัวซ้ำไว้อัปดาวในแท็บทีม · ป้ายเปลี่ยนใหม่ทุกครั้งที่กลับจากการเดินทาง และสุ่มใหม่ได้ ${costs.length} ครั้งต่อรอบโดยจ่ายเหรียญทอง</p></details>`;
  }
  // Preview of a hiring offer: the mercenary as they would join (or as owned), stats, every skill and the star unlocks.
  private hirePreview(p: Profile, index: number): string {
    const id = boardOffers(p, this.map, this.lookup)[index]!; const text = heroText[id]!; const m = p.members[id]; const h = this.hero(id);
    const reason = hireReason(p, this.map, this.lookup, index);
    const why: Record<string, string> = { taken: 'จ้างแล้ว', gold: 'เหรียญทองไม่พอ', full: `ค่ายเต็ม ${COMPANY_CAP} คน`, maxed: 'ดาวเต็มแล้ว' };
    const data = withParty(this.lookup(this.map.tutorialEncounterId)!, [h]);
    const skills = h.actions.map((a: ActionId) => `<li>${icon(a)}<div><b>${data.skills[a].name}</b><small>${data.skills[a].cooldown ? `คูลดาวน์ ${data.skills[a].cooldown} รอบ` : 'ใช้ได้ทุกเทิร์น'}</small><p>${skillDescription(a, id, data)}</p></div></li>`).join('');
    return `<div class="hire-preview" aria-label="ข้อมูล${text.name}">
      <button id="hire-preview-back" data-lobby="hire-preview-back" class="secondary hire-preview-back">${icon('left')}<span>กลับไปป้ายจ้าง</span></button>
      <div class="hire-preview-head">${portrait(id)}<div><h3>${text.name}</h3><p>${text.role} · ${h.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'} · ${m ? `${this.stars(m.stars)} มีในค่าย (ตัวซ้ำ ${m.dupes})` : 'ใหม่ · ★1 Lv1'}</p><p class="hire-preview-help">${text.help}</p></div></div>
      <dl class="hire-stats"><div><dt>เลือด</dt><dd>${h.maxHp}</dd></div><div><dt>พลังโจมตี</dt><dd>${h.attack}</dd></div><div><dt>ความเร็ว</dt><dd>${h.speed}</dd></div></dl>
      <h4>สกิล</h4><ul class="hire-skills">${skills}</ul>
      <h4>ปลดล็อกด้วยดาว</h4>${this.unlocks(id, m?.stars ?? 1)}
      <button id="hire-${index}" data-lobby="hire" data-index="${index}" class="primary hire-preview-hire"${reason ? ' disabled' : ''}>${reason ? why[reason] ?? 'จ้างไม่ได้' : `${m ? 'จ้างเป็นตัวซ้ำ' : 'จ้าง'} · ${this.map.company.hireCost} เหรียญทอง`}</button></div>`;
  }
  // Chapters (2026-10-17): the campaign in order; a map opens once the one before it is cleared.
  // The camp's name (owner 2026-10-21): same rules as the commander's name; saved on confirm only.
  private campForm(p: Profile): string {
    const name = p.commander?.camp ?? '';
    return `<div class="camp-rename"><label class="commander-field" for="camp-name"><span>ชื่อค่าย</span>
      <input id="camp-name" type="text" autocomplete="off" enterkeyhint="done" maxlength="${NAME_MAX * 2}" value="${this.escape(name)}" aria-describedby="camp-name-hint">
      <small id="camp-name-hint" class="commander-hint">1–${NAME_MAX} ตัวอักษร (ไม่ใช้ &lt; &gt;) · แสดงในค่ายและหน้าสรุปการเดินทาง</small></label>
      <button id="camp-save" data-lobby="camp-save" class="primary">${icon('check')} บันทึกชื่อ</button></div>`;
  }
  // Guided tasks (A4): the first open task, with its NPC, what to do and the reward; claim once done, or skip.
  private guideCard(p: Profile): string {
    const g = activeGuides(p, this.maps)[0]; if (!g || this.sheet) return '';
    const npc = npcText[g.npc as NpcId]; const done = guideDone(p, g.kind);
    return `<section class="lobby-guide glass-capsule" id="guide-${g.id}" data-done="${done}" aria-label="งานแนะนำ"><p>${icon('flag')}<span><b>${npc?.name ?? ''} · งานแนะนำ</b>${guideText[g.kind]} · รางวัล ${rewardText(g.reward)}</span></p>
      <div><button id="guide-claim" data-lobby="guide" data-guide="${g.id}" class="primary"${done ? '' : ' disabled'}>${done ? 'รับรางวัล' : 'ยังไม่เสร็จ'}</button><button id="guide-skip" data-lobby="guide" data-guide="${g.id}" data-skip="true" class="secondary">ข้าม</button></div></section>`;
  }
  // Lobby systems by chapter (A3). A locked sheet still opens, showing which map opens it.
  private open(feature: LobbyFeature): boolean { const p = this.view?.profile; return !p || featureOpen(p, this.maps, feature); }
  private locked(sheet: Sheet | null): LobbyFeature | undefined {
    const feature: Partial<Record<Sheet, LobbyFeature>> = { team: 'team', hire: 'hire', gear: 'gear', forge: 'forge', brew: 'brew', hunt: 'hunt', tree: 'tree' };
    const f = sheet ? feature[sheet] : undefined; return f && !this.open(f) ? f : undefined;
  }
  private lockedPanel(feature: LobbyFeature): string {
    const m = featureMap(this.maps, feature);
    return `<div class="lobby-locked" role="status">${icon('seal')}<p><b>ยังไม่เปิด</b><span>ผ่านแผนที่ ${m?.chapter ?? ''} · ${m?.name ?? ''} ก่อน แล้วระบบนี้จะพร้อมใช้</span></p></div>`;
  }
  private openMaps(): MapDefinition[] { const p = this.view?.profile; return p ? this.maps.filter(m => mapUnlocked(p, this.maps, m.id)) : [this.map]; }
  private mapList(p: Profile): string {
    return `<ul class="hire-list map-list">${this.maps.map((m, i) => { const open = mapUnlocked(p, this.maps, m.id); const done = p.cleared.includes(m.id);
      return `<li class="map-choice${open ? '' : ' locked'}" data-map="${m.id}"><span class="market-icon" aria-hidden="true">${icon(open ? 'map' : 'seal')}</span>
        <span><b>แผนที่ ${m.chapter} · ${m.name}</b>${done ? ' <em class="map-cleared">ผ่านแล้ว</em>' : ''}<small>${m.summary}</small>${open ? '' : `<small class="hire-status">ผ่าน${this.maps[i - 1]!.name}ก่อน</small>`}</span>
        <span class="map-actions"><button id="map-go-${m.id}" data-lobby="go" data-map="${m.id}" class="${open ? 'primary' : 'secondary'}"${open ? '' : ' disabled'}>${open ? 'ออกเดินทาง' : 'ยังล็อก'}</button>${open && this.open('hard') ? `<button id="map-hard-${m.id}" data-lobby="go" data-map="${m.id}" data-hard="true" class="secondary map-hard"${hardReason(p, this.maps, m.id) ? ' disabled' : ''}>ยาก${p.clearedHard?.includes(m.id) ? ' ✓' : ''}</button>` : ''}</span></li>`; }).join('')}</ul>${this.open('hard') ? `<p class="camp-note">โหมดยาก: มอนสเตอร์ +${this.map.progression.hardLevels} เลเวล ของดีขึ้น · เปิดเมื่อจบแผนที่นั้นแบบปกติ · จบครั้งแรกได้ทอง ${this.map.progression.hardFirstClear.gold} ตราสัญญา ${this.map.progression.hardFirstClear.seal}</p>` : ''}`;
  }
  // 4A market: gold-coin goods, each with a limit per return home.
  private marketList(p: Profile): string {
    const why: Record<string, string> = { limit: 'หมดแล้วรอบนี้', gold: 'เหรียญทองไม่พอ', bag: 'คลังเต็ม', maxed: 'ดาวเต็มแล้ว', hero: 'เลือกคน' };
    const glyph: Record<ShopItemId, Parameters<typeof icon>[0]> = { seal: 'seal', contract: 'starBadge', gearbox: 'chest', repel: 'potionRepel' };
    const pickable = p.company.filter(id => (p.members[id]?.stars ?? 1) < this.map.company.maxStars);
    return `<p class="hire-cost"><span class="icon-gold">${icon('gold')}</span> มี ${p.bank.gold} เหรียญทอง · ของในตลาดเติมใหม่ทุกครั้งที่กลับจากการเดินทาง</p>
      <ul class="hire-list market-list">${SHOP_ITEMS.map(item => {
        const def = this.map.shop.items[item]; const left = shopLeft(p, this.map, item); const t = shopText[item];
        const reason = item === 'contract' ? buyReason(p, this.map, item, pickable[0]) : buyReason(p, this.map, item);
        const pick = item === 'contract' ? `<label class="contract-pick"><span>ให้</span><select id="contract-hero" aria-label="เลือกสมาชิกที่จะรับตัวซ้ำ">${pickable.map(id => `<option value="${id}">${heroText[id]?.name ?? id} ${'★'.repeat(p.members[id]!.stars)} · ตัวซ้ำ ${p.members[id]!.dupes}</option>`).join('')}</select></label>` : '';
        // ART-WORLD-PROPS-002: the contract and gear box are painted (2-cell atlas); seals and repel keep their icons.
        const art = item === 'contract' || item === 'gearbox' ? `<i class="market-art" data-item="${item}"></i>` : icon(glyph[item]);
        return `<li class="market-item" data-item="${item}"><span class="market-icon" aria-hidden="true">${art}</span><span><b>${t.name}</b><small>${t.help}</small><small class="hire-status">เหลือ ${left}/${def.limit} ในรอบนี้</small>${pick}</span>
          <button id="buy-${item}" data-lobby="buy" data-item="${item}" class="secondary"${reason ? ' disabled' : ''} aria-label="ซื้อ${t.name} ใช้เหรียญทอง ${def.price}">${reason ? why[reason] ?? 'ซื้อไม่ได้' : `ซื้อ · ${def.price}`}</button></li>`;
      }).join('')}</ul>`;
  }
}
