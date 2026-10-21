import {bossGuide} from './boss-equipment';
import {lootGuide} from './loot-guide';
import { infoTabs } from './info-tabs';
import type { CharacterTab } from './character-view';
import { CharacterPanel, type CharacterModel } from './character-panel';
import { applyRunEquipment, runEquipment, type AutoEquipmentPlan } from '../core/world/auto-equipment';
import { newGearFilters, changeGearFilter, filteredEquipment, gearFilters as gearFilterControls } from './gear-inventory';
import { talentPoints, talentsSpent } from '../core/world/talents';
import type { TalentNode } from '../core/world/types';
import { shortcutBlocked } from '../platform/keyboard';
import type { ActionId, EncounterDefinition, HeroDefinition } from '../core/battle/types';

import type { Direction, EventChoice, ExpeditionState, GearSlot, MapDefinition, Point, PotionId } from '../core/world/types';
import { canManage, wear, type BagList, travelTargets, atCamp, atMuster, canOpenChest, canRest, canRevive, chestAt, eliteBlocks, questComplete, questDone, encounterChance, eventChoiceReason, isRevealed, monsterLevelAt, pendingEvent, rosterIds, starred, tileAt, wounded, zoneOf } from '../core/world/world';
import { PARTY_SLOTS, POTION_IDS, RESERVE_SLOTS } from '../core/world/types';
import { portrait, starRow } from './portraits';
import { SOURCE_TILE, openingFrame, chestFrame, decorAt, itemFrame, floorFrame, fogLayers, landmarkAt, tileSizeFor, tileset, worldArtUrl, type Landmark } from '../game/visuals/world-art';
import { questLine, choiceText, eventChoices, eventReasonText, eventText, heroText, itemLines, itemName, itemOwner, potionText, resourceOrder, resourceText } from './th';
import { icon, type IconName } from './icons';
import { gearArt, potionArt } from './equip-art';
import { boulderPosition, doorOpen, openPit, secretAt } from '../core/world/puzzles';

export interface WorldHost { travel(to: Point): void; move(dir: Direction): void; rest(): void; revive(heroId: string): void; swap(a: string, b: string): void; moveMember(id: string): void; withdraw(): void; openChest(): void;
  talent(heroId: string, node: TalentNode): void; loadout(heroId: string, actions: ActionId[]): void; autoEquip(plan: AutoEquipmentPlan): void;
  usePotion(potion: PotionId, heroId?: string): void; chooseEvent(choice: EventChoice): void;
  wear(heroId: string, from: BagList, index: number): void; takeOff(heroId: string, slot: GearSlot): void }
export interface WorldBanner { kind: 'encounter' | 'boss' | 'elite' | 'tutorial' | 'complete'; eyebrow: string; title: string; detail: string }
export interface WorldView { state: ExpeditionState; message: string; locked: boolean; saved: boolean; banner?: WorldBanner; effect?: 'rest' | 'loot' }

const keyDirections: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
const dirLabel: Record<Direction, string> = { up: 'เดินขึ้น', down: 'เดินลง', left: 'เดินซ้าย', right: 'เดินขวา' };
const offsets: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const shards: readonly [string, string, string, string, string][] = [
  ['8%', '14%', '-60px', '-35px', '-18deg'], ['30%', '10%', '-25px', '-55px', '24deg'], ['55%', '12%', '25px', '-55px', '-22deg'], ['78%', '18%', '60px', '-30px', '30deg'],
  ['10%', '66%', '-60px', '40px', '22deg'], ['32%', '70%', '-25px', '55px', '-26deg'], ['58%', '68%', '25px', '55px', '18deg'], ['80%', '60%', '60px', '40px', '-28deg'],
];

// Painted item frame (ART-WORLD-LOOT-001) for the pack and camp sheets.
export function itemArt(id: 'ore' | 'ember' | 'seal'): string {
  const f = itemFrame(id);
  return `<span class="item-art" data-item="${id}" style="--fx:${f.x / f.w}" aria-hidden="true"></span>`;
}
export { portrait, starRow } from './portraits';
// The rift seal (3B) sits between the camp and the boss: any `need` of its objectives break it.
const goals = (s: ExpeditionState, map: MapDefinition) => {
  const seal = questDone(s, map).length; const need = map.quest.need;
  return [
    { done: s.tutorialDone, label: 'ขับไล่กองหน้าของวาร์กอธ' }, { done: !!s.camp, label: 'ไปถึงแคมป์' },
    ...(need ? [{ done: seal >= need || s.bossDefeated, label: `ทำลายผนึกรอยแยก ${Math.min(seal, need)}/${need}` }] : []),
    { done: s.bossDefeated, label: `ชนะ${map.bossName}` }, { done: s.completed, label: `ไปถึง${map.goalName}` },
  ];
};

// Full-screen DOM renderer for the pure expedition state (Luminous Veil R2).
// It owns no rules: every input is forwarded to the host, which commits and
// saves before the view updates. Animations only decorate committed state.
export class WorldUI {
  private view: WorldView | undefined;
  private previous: { position: Point; chance: number; revealed: string; boss: boolean; done: boolean } | undefined;
  private lastKey = 0;
  private campTab: 'care' | 'team' | 'travel' = 'care';
  // Map bag (2026-10-17): items, gear and team tabs; the member and slot shown on the gear tab.
  private bagTab: 'items' | 'gear' | 'team' = 'items';
  private inventoryPick: string | undefined;
  private inventorySource: ExpeditionState | undefined;
  private readonly inventoryFilters = newGearFilters();
  private readonly characters: CharacterPanel | undefined;
  private picked: string | undefined;
  private confirmWithdraw = false;
  private tile = 48;
  private width: number;
  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  // `eliteArt` maps each elite id to the actor art of its leading foe (the token drawn on its gate).
  constructor(private readonly root: HTMLElement, private map: MapDefinition, private readonly heroes: readonly HeroDefinition[], private readonly host: WorldHost,
    private eliteArt: Readonly<Record<string, string>> = {}, skillData?: EncounterDefinition) {
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
        <div class="hud-location glass-capsule"><span class="location-mark">${icon('map')}</span><div><p class="eyebrow" id="map-name">${map.name}</p><h1 id="zone-name"></h1></div></div>
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
      <dialog id="pack-dialog" class="world-dialog" aria-labelledby="pack-title"><div class="info-header"><h2 id="pack-title">${icon('pack')} กระเป๋า</h2><button data-world="pack-close" class="quiet" aria-label="ปิดกระเป๋า">${icon('close')}</button></div><div class="info-content" id="pack-content"></div></dialog>
      <dialog id="event-dialog" class="world-dialog" aria-labelledby="event-title"><div class="info-header"><h2 id="event-title"></h2><button data-world="event-close" class="quiet" aria-label="ปิดและเดินต่อ">${icon('close')}</button></div><div class="info-content" id="event-content"></div></dialog>
      <dialog id="world-info" class="world-dialog" aria-labelledby="world-info-title"><div class="info-header"><h2 id="world-info-title">ข้อมูลการเดินทาง</h2><button data-world="info-close" class="quiet" aria-label="ปิดข้อมูล">${icon('close')}</button></div>${infoTabs('world',false,false,true)}<div class="info-content"><section id="world-panel-settings" role="tabpanel" aria-labelledby="world-tab-settings" hidden><section class="battle-sound"><h3>เพลงและเสียงเอฟเฟกต์</h3><div id="world-sfx-controls"></div></section></section><section id="world-panel-loot" role="tabpanel" aria-labelledby="world-tab-loot" hidden><div id="world-loot-content"></div></section><section id="world-panel-guide" role="tabpanel" aria-labelledby="world-tab-guide"><div id="world-info-content"></div></section></div></dialog>`;
    if(skillData) this.characters = new CharacterPanel(root,map,heroes,skillData,{
      model:()=>this.characterModel(),
      preview:(id,key)=>{const s=this.view?.state,match=/^(found|spare):(\d+)$/.exec(key);if(!s||!match)return;const out=wear(s,map,()=>({...skillData,heroes}),id,match[1] as BagList,Number(match[2]));return out.event.type==='equipped'?this.characterModel(out.state):undefined;},
      previewPlan:plan=>{if(!this.view)return;const out=applyRunEquipment(this.view.state,map,()=>({...skillData,heroes}),plan);return out.event.type==='equipped'?this.characterModel(out.state):undefined;},
      wear:(id,key)=>{const match=/^(found|spare):(\d+)$/.exec(key);if(match)this.host.wear(id,match[1] as BagList,Number(match[2]));},
      takeOff:(id,slot)=>this.host.takeOff(id,slot),talent:(id,node)=>this.host.talent(id,node),loadout:(id,a)=>this.host.loadout(id,a),applyPlan:plan=>this.host.autoEquip(plan),
      restore:id=>{if(id==='pack-dialog')this.renderPack();else if(id==='camp-dialog')this.renderCamp();},
    },'',this.inventoryFilters);
    root.addEventListener('change',event=>{const control=event.target as HTMLInputElement|HTMLSelectElement;if(control.closest('.character-dialog')||!control.dataset.gearFilter||root.hidden||root.closest('[inert]')||Array.from(root.querySelectorAll('dialog[open]')).some(d=>!d.contains(control)))return;changeGearFilter(this.inventoryFilters,control);this.renderPack();root.querySelector<HTMLElement>('#'+control.id)?.focus();});
    for (const [id, trigger] of [['world-info', 'world-info-button'], ['world-goals', 'objective-button'], ['pack-dialog', 'world-pack'], ['camp-dialog', 'rest'], ['event-dialog', 'rest']]) {
      root.querySelector(`#${id}`)!.addEventListener('close', () => {
        if (root.querySelector('dialog[open]')) return;
        if (!root.hidden && !root.closest('[inert]')) root.querySelector<HTMLElement>(`#${trigger}`)?.focus({ preventScroll: true });
      });
    }
    root.addEventListener('click', e => {
      if (root.hidden || root.closest('[inert]')) return;
      const el = e.target as HTMLElement;
      const activeDialog=root.querySelector('dialog[open]');if(activeDialog&&!activeDialog.contains(el))return;
      if(el.closest('[data-gear-reset]')){Object.assign(this.inventoryFilters,newGearFilters());this.renderPack();this.root.querySelector<HTMLElement>('#pack-gear-filter-set')?.focus();return;}
      const button = el.closest<HTMLButtonElement>('button[data-world]');
      if (button && !button.disabled) {
        const modal = root.querySelector('dialog[open]');
        if (modal && !modal.contains(button)) return;
        const dialog = (id: string) => root.querySelector<HTMLDialogElement>(id)!;
        switch (button.dataset.world) {
          case 'character-open': this.openCharacter(button.dataset.hero!, (button.dataset.tab as CharacterTab) ?? 'overview', button); break;
          case 'move': this.input(button.dataset.dir as Direction); break;
          case 'interact': this.interact(); break;
          case 'camp-rest': if (!this.view?.locked) this.host.rest(); break;
          case 'camp-revive': if (!this.view?.locked && button.dataset.hero) this.host.revive(button.dataset.hero); break;
          case 'camp-close': dialog('#camp-dialog').close(); break;
          case 'travel': this.host.travel({ x: Number(button.dataset.x), y: Number(button.dataset.y) }); break;
          case 'camp-tab': this.campTab = button.dataset.tab as WorldUI['campTab']; this.picked = undefined; this.confirmWithdraw = false; this.renderCamp(); this.root.querySelector<HTMLElement>(`#camp-tab-${this.campTab}`)?.focus(); break;
          case 'team-pick': this.pickMember(button.dataset.hero, button.dataset.side as 'deployed' | 'reserve'); break;
          case 'withdraw': if (this.view?.locked) break;
            if (!this.confirmWithdraw) { this.confirmWithdraw = true; this.renderCamp(); this.root.querySelector<HTMLElement>('#withdraw')?.focus(); break; }
            this.confirmWithdraw = false; dialog('#camp-dialog').close(); this.host.withdraw(); break;
          case 'pack': this.bagTab = 'items'; this.picked = undefined; this.salvePick = false; this.renderPack(); dialog('#pack-dialog').showModal(); break;
          case 'bag-tab': this.bagTab = button.dataset.tab as WorldUI['bagTab']; this.picked = undefined; this.salvePick = false; this.renderPack(); this.root.querySelector<HTMLElement>(`#bag-tab-${this.bagTab}`)?.focus(); break;
          case 'inventory-pick': this.inventoryPick=button.dataset.key;this.renderPack();this.root.querySelector<HTMLElement>('#inventory-hero-'+rosterIds(this.view!.state).find(id=>{const i=runEquipment(this.view!.state).find(e=>e.key===this.inventoryPick)?.item;return i&&(i.slot!=='weapon'||i.hero===id);}))?.focus();break;
          case 'inventory-character': this.openCharacter(button.dataset.hero!,'gear',button,button.dataset.key);break;
          case 'bag-member': this.openCharacter(button.dataset.hero!, 'gear', button); break;
          case 'bag-gear-of': this.openCharacter(button.dataset.hero!, 'gear', button); break;
          case 'pack-close': dialog('#pack-dialog').close(); break;
          case 'potion': if (!this.view?.locked) {
            const potion = button.dataset.potion as PotionId;
            // A salve first asks who drinks it.
            if (potion === 'salve' && !button.dataset.hero) { this.salvePick = !this.salvePick; this.renderPack(); this.root.querySelector<HTMLElement>('#potion-salve')?.focus(); break; }
            this.salvePick = false; this.host.usePotion(potion, button.dataset.hero); this.renderPack(); this.root.querySelector<HTMLElement>(`#potion-${potion}`)?.focus();
          } break;
          case 'event-close': dialog('#event-dialog').close(); break;
          case 'event-choice': if (!this.view?.locked) { const choice = button.dataset.choice as EventChoice; this.host.chooseEvent(choice); this.root.querySelector<HTMLElement>(`#event-${choice}`)?.focus(); } break;
          case 'info': this.renderInfo(); dialog('#world-info').showModal(); break;
          case 'info-close': dialog('#world-info').close(); break;
          case 'goals': this.renderGoals(); dialog('#world-goals').showModal(); break;
          case 'goals-close': dialog('#world-goals').close(); break;
        }
        return;
      }
      const hint = el.closest<HTMLElement>('.step-hint');
      if (hint?.dataset.dir) this.input(hint.dataset.dir as Direction);
    });
    document.addEventListener('keydown', e => {
      const codeDirections: Record<string, Direction> = { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right' };
      const dir = codeDirections[e.code] ?? keyDirections[e.key];
      if (!dir || shortcutBlocked(e, true) || root.hidden || document.querySelector('dialog[open], .story-view:not([hidden]), .summary-view:not([hidden])')) return;
      e.preventDefault();
      const now = performance.now(); if (now - this.lastKey < 120) return; this.lastKey = now;
      this.input(dir);
    });
    new ResizeObserver(() => this.layout()).observe(root.querySelector('#map-viewport')!);
  }

  // The lower-right action is contextual: a camp or the entrance opens the muster sheet,
  // an unopened chest opens.
  private interact(): void {
    const s = this.view?.state; if (!s || this.view!.locked) return;
    if (atMuster(s, this.map)) {
      // Open on the team tab when the deployed party cannot walk on (and always at the entrance).
      this.campTab = atCamp(s, this.map) && s.roster.deployed.some(id => s.hp[id]! > 0) ? 'care' : 'team'; this.picked = undefined; this.confirmWithdraw = false;
      this.renderCamp(); this.root.querySelector<HTMLDialogElement>('#camp-dialog')!.showModal();
    }
    else if (canOpenChest(s, this.map)) this.host.openChest();
    else if (pendingEvent(s, this.map)) this.openEvent();
  }
  // Map events (3A): the dialog opens when the team steps onto one and from the action button while standing on it.
  openEvent(): void {
    const dialog = this.root.querySelector<HTMLDialogElement>('#event-dialog')!;
    if (!this.view || !pendingEvent(this.view.state, this.map)) return;
    this.renderEvent(); if (!dialog.open) dialog.showModal();
  }
  private renderEvent(): void {
    const s = this.view!.state; const ev = pendingEvent(s, this.map)!; const text = eventText[ev.kind]; const r = this.map.eventRules;
    this.root.querySelector('#event-title')!.innerHTML = `${icon(text.icon)} ${text.name}`;
    const rows = eventChoices[ev.kind].map(choice => {
      const reason = this.view!.locked ? 'busy' : eventChoiceReason(s, this.map, choice); const t = choiceText(choice, r);
      const help = choice === 'fight' ? (ev.kind === 'bandits' ? `สู้กับโจรที่แข็งกว่าโซนนี้ ${r.banditLevelBonus} เลเวล · ชนะแล้วได้อุปกรณ์แน่นอน` : `ชนะแล้วได้ฝุ่นดาว ${r.riftDust}`) : t.help;
      return `<li><div><b>${t.label}</b>${help ? `<small>${help}</small>` : ''}</div><button id="event-${choice}" data-world="event-choice" data-choice="${choice}" class="${choice === 'fight' ? 'primary' : 'secondary'}"${reason ? ' disabled' : ''}>${reason ? eventReasonText[reason] ?? '' : t.label}</button></li>`;
    }).join('');
    this.root.querySelector('#event-content')!.innerHTML = `<p class="event-scene">${text.scene}</p><ul class="event-choices">${rows}</ul>
      <p class="world-stats">${ev.kind === 'merchant' ? `มีแร่ดาว ${s.resources.ore} · พ่อค้ารอตรงนี้ตลอดรอบ` : 'ปิดหน้าต่างเพื่อเดินต่อ กลับมาตัดสินใจทีหลังได้'}</p>`;
  }
  // Tap a member, then a member or an empty slot on the other side to swap or move.
  private pickMember(id: string | undefined, side: 'deployed' | 'reserve'): void {
    const s = this.view?.state; if (!s || this.view!.locked) return;
    const pickedSide = this.picked && (s.roster.deployed.includes(this.picked) ? 'deployed' : 'reserve');
    if (!this.picked || pickedSide === side) { this.picked = id && id !== this.picked ? id : undefined; if (this.bagOpen()) this.renderPack(); else this.renderCamp(); this.focusTeam(this.picked ?? id); return; }
    const from = this.picked; this.picked = undefined;
    if (id) this.host.swap(from, id); else this.host.moveMember(from);
    this.focusTeam(from);
  }
  private focusTeam(id: string | undefined): void { if (id) this.root.querySelector<HTMLElement>(`#${this.bagOpen() ? 'bag-team' : 'team'}-${id}`)?.focus(); }
  private bagOpen(): boolean { return this.root.querySelector<HTMLDialogElement>('#pack-dialog')!.open; }
  private openCharacter(id: string, tab: CharacterTab, trigger: HTMLButtonElement, key?: string): void { this.characters?.openFor(id,tab,trigger,key); }
  private characterModel(state = this.view?.state): CharacterModel | undefined {
    return state ? { state, source:state, ids:rosterIds(state), entries:runEquipment(state), available:!this.view?.locked&&canManage(state), camp:false } : undefined;
  }
  private input(dir: Direction): void { if (this.view && !this.view.locked && !this.view.state.completed && !this.root.hidden && !this.root.querySelector('dialog[open]')) this.host.move(dir); }

  // Chapters: the shell shows the run's map. A new board redraws the floor, props and gates; fog and hints follow on render.
  setMap(map: MapDefinition, eliteArt: Readonly<Record<string, string>> = {}): void {
    if (map.id === this.map.id) return;
    this.map = map; this.eliteArt = eliteArt; this.width = map.rows[0]!.length; this.previous = undefined;
    const grid = this.root.querySelector<HTMLElement>('#map-grid')!;
    grid.style.setProperty('--cols', String(this.width)); grid.style.setProperty('--rows', String(map.rows.length));
    grid.querySelector('.floor-layer')!.innerHTML = this.floorCells();
    const token = this.root.querySelector('#party-token')!;
    const sprites = this.root.querySelector('#sprite-layer')!; sprites.innerHTML = this.staticSprites(); sprites.append(token);
    this.root.querySelector('#fog-layer')!.innerHTML = ''; this.root.querySelector('#hint-layer')!.innerHTML = '';
    this.root.querySelector('#map-name')!.textContent = map.name;
  }
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
      const elite = this.map.elites.find(e => e.x === x && e.y === y);
      if (elite) html += `<span class="elite-unit sprite" data-cell="${x},${y}" data-elite="${elite.id}" data-forced="${elite.forced}"${elite.mini ? ' data-mini="true"' : ''} style="--x:${x};--y:${y};z-index:${y * 3 + 1}">${this.eliteArt[elite.id] ? portrait(this.eliteArt[elite.id]!) : ''}${elite.forced ? '' : `<em class="elite-reward">${icon(elite.mini ? 'boss' : 'chest')}</em>`}</span>`;
      const event = this.map.events.find(e => e.x === x && e.y === y);
      if (event) html += `<span class="event-mark sprite" data-cell="${x},${y}" data-event="${event.id}" data-kind="${event.kind}" style="--x:${x};--y:${y};z-index:${y * 3 + 1}"><b class="map-prop"></b><i>!</i></span>`;
      html += this.puzzleSprites(x, y);
      if (['camp', 'start', 'goal', 'boss'].includes(kind)) html += `<span class="landmark sprite" data-cell="${x},${y}" data-kind="${kind}" style="--x:${x};--y:${y};z-index:${y * 3 + 1}">${kind === 'boss' ? '<span class="boss-unit"></span>' : ''}</span>`;
    }
    return html;
  }

  // 3C puzzle pieces, built once; renderPuzzles() updates them from the committed state.
  private puzzleSprites(x: number, y: number): string {
    const P = this.map.puzzles; const at = (q: Point) => q.x === x && q.y === y; const pos = `style="--x:${x};--y:${y};z-index:${y * 3 + 1}"`;
    const opening = () => { const f = tileset[openingFrame(this.map, { x, y })]!; return `--fx:${f.x / SOURCE_TILE};--fy:${f.y / SOURCE_TILE}`; };
    let html = '';
    for (const r of P.runes) {
      const i = r.stones.findIndex(at);
      if (i >= 0) html += `<span class="rune-stone sprite" data-cell="${x},${y}" data-rune="${r.id}" data-index="${i}" data-glyph="${r.stones[i]!.glyph}" aria-hidden="true" ${pos}></span>`;
      if (at(r.door)) html += `<span class="puzzle-door sprite" data-cell="${x},${y}" data-door="${r.id}" data-kind="runes" style="--x:${x};--y:${y};z-index:${y * 3 + 1};${opening()}">${r.stones.map((s, n) => `<i class="door-glyph" data-glyph="${s.glyph}" style="--n:${n}"></i>`).join('')}</span>`;
    }
    for (const l of P.levers) {
      const i = l.levers.findIndex(at);
      if (i >= 0) html += `<span class="lever sprite" data-cell="${x},${y}" data-lever="${l.id}:${i}" ${pos}><i></i></span>`;
      if (at(l.door)) html += `<span class="puzzle-door sprite" data-cell="${x},${y}" data-door="${l.id}" data-kind="levers" style="--x:${x};--y:${y};z-index:${y * 3 + 1};${opening()}"></span>`;
    }
    for (const b of P.boulders) {
      if (at(b.pit)) html += `<span class="pit sprite" data-cell="${x},${y}" data-pit="${b.id}" ${pos}></span>`;
      if (at(b.at)) html += `<span class="boulder sprite" data-cell="${x},${y}" data-boulder="${b.id}" ${pos}></span>`;
    }
    const sec = P.secrets.find(at);
    if (sec) html += `<span class="secret-wall sprite" data-cell="${x},${y}" data-secret="${sec.id}" style="--x:${x};--y:${y};z-index:${y * 3 + 1};${opening()}"></span>`;
    // 3D: a glowing herb for the herbalist's side quest (picked once per run).
    const herb = this.map.herbs.find(at);
    if (herb) html += `<span class="herb sprite" data-cell="${x},${y}" data-herb="${herb.id}" ${pos}><i class="map-prop herb-glow"></i><b class="map-prop"></b></span>`;
    return html;
  }
  private renderPuzzles(s: ExpeditionState): void {
    this.root.querySelectorAll<HTMLElement>('.rune-stone').forEach(el => {
      const id = el.dataset.rune!; el.classList.toggle('lit', s.solved.includes(id) || Number(el.dataset.index) < (s.runes[id] ?? 0));
    });
    this.root.querySelectorAll<HTMLElement>('.puzzle-door').forEach(el => el.classList.toggle('open', s.solved.includes(el.dataset.door!)));
    this.root.querySelectorAll<HTMLElement>('.lever').forEach(el => el.classList.toggle('pulled', s.levers.includes(el.dataset.lever!) || s.solved.includes(el.dataset.lever!.split(':')[0]!)));
    this.root.querySelectorAll<HTMLElement>('.pit').forEach(el => { el.classList.toggle('filled', s.solved.includes(el.dataset.pit!)); });
    this.root.querySelectorAll<HTMLElement>('.boulder').forEach(el => {
      const at = boulderPosition(s, this.map, el.dataset.boulder!); el.classList.toggle('gone', !at); if (!at) return;
      el.style.setProperty('--x', String(at.x)); el.style.setProperty('--y', String(at.y)); el.style.zIndex = String(at.y * 3 + 1); el.dataset.cell = `${at.x},${at.y}`;
      el.hidden = !isRevealed(s, this.map, at);
    });
    this.root.querySelectorAll<HTMLElement>('.secret-wall').forEach(el => el.classList.toggle('found', s.secrets.includes(el.dataset.secret!)));
    this.root.querySelectorAll<HTMLElement>('.herb').forEach(el => el.classList.toggle('picked', s.herbs.includes(el.dataset.herb!)));
  }

  render(view: WorldView): void {
    const s = view.state; const prev = this.previous;
    this.view = view;
    const tile = tileAt(this.map, s.position)!; const zone = zoneOf(this.map, tile.zoneId);
    // Monster level here (2D-1): shown with the zone, red when the deployed team is 2+ levels below it.
    const base = tile.kind === 'camp' ? undefined : monsterLevelAt(this.map, s.position);
    // Hard mode (A9): monsters fight `hardLevels` higher; the map name carries the mode.
    const level = base === undefined ? undefined : base + (s.hard ? this.map.progression.hardLevels : 0);
    this.root.querySelector('#map-name')!.textContent = `${this.map.name}${s.hard ? ' · ยาก' : ''}`;
    const living = s.roster.deployed.filter(id => s.hp[id]! > 0); const team = living.length ? Math.round(living.reduce((sum, id) => sum + (s.members[id]?.level ?? 1), 0) / living.length) : 1;
    const danger = level !== undefined && team <= level - 2;
    this.root.querySelector('#zone-name')!.innerHTML = `${tile.kind === 'camp' ? 'แคมป์พักแรม' : zone?.name ?? ''}${level !== undefined ? ` <span class="zone-level${danger ? ' danger' : ''}">Lv${level}${danger ? ' · อันตราย' : ''}</span>` : ''}`;
    this.root.dataset.zone = tile.kind === 'camp' ? 'camp' : tile.zoneId;
    this.renderDanger(encounterChance(s, this.map), prev?.chance);
    this.renderParty(s);
    const all = goals(s, this.map); const done = all.filter(g => g.done).length; const next = all.find(g => !g.done);
    this.root.querySelector('#objective-button')!.innerHTML = `<span class="objective-symbol">${icon('goal')}</span><span class="objective-text">${next ? next.label : 'สำเร็จการเดินทาง'}</span><span class="objective-count">${done}/${all.length}</span>${icon('right')}`;
    this.root.querySelector('#objective-button')!.setAttribute('aria-label', `เป้าหมาย ${done} จาก ${all.length} · ${next ? `ถัดไป ${next.label}` : 'สำเร็จแล้ว'} · เปิดรายการ`);
    const message = this.root.querySelector<HTMLElement>('#world-message')!;
    // A new notice pops in as a toast and fades by itself; the text stays for assistive tech.
    if (message.textContent !== view.message) { message.textContent = view.message; message.classList.remove('toast-live'); void message.offsetWidth; message.classList.add('toast-live'); }
    message.hidden = !view.message;
    message.classList.toggle('rest-feedback', view.effect === 'rest');
    message.classList.toggle('loot-feedback', view.effect === 'loot');
    for (const d of ['up', 'down', 'left', 'right'] as Direction[]) this.root.querySelector<HTMLButtonElement>(`#move-${d}`)!.disabled = view.locked || s.completed;
    this.renderAction(s, view.locked);
    this.renderPackButton(s, view.effect === 'loot');
    const eventDialog = this.root.querySelector<HTMLDialogElement>('#event-dialog')!;
    if (eventDialog.open) { if (pendingEvent(s, this.map) && !view.locked) this.renderEvent(); else eventDialog.close(); }
    if (this.bagOpen()) this.renderPack();
    this.characters?.refresh();
    if (this.root.querySelector<HTMLDialogElement>('#camp-dialog')!.open) { if (atMuster(s, this.map) && !view.locked) this.renderCamp(); else this.root.querySelector<HTMLDialogElement>('#camp-dialog')!.close(); }
    if (!prev || prev.revealed !== s.revealed) this.renderFog(s);
    this.renderSprites(s, prev);
    this.renderPuzzles(s);
    this.renderHints(s, view.locked);
    this.renderBanner(view);
    if (view.effect === 'rest' && !this.reduced.matches) this.sparkle();
    this.previous = { position: { ...s.position }, chance: encounterChance(s, this.map), revealed: s.revealed, boss: s.bossDefeated, done: s.completed };
    this.layout();
  }

  private renderAction(s: ExpeditionState, locked: boolean): void {
    const camp = atCamp(s, this.map); const entrance = !camp && atMuster(s, this.map); const chest = !camp && !entrance && canOpenChest(s, this.map);
    const ev = !camp && !entrance && !chest ? pendingEvent(s, this.map) : undefined;
    const available = !locked && (camp || entrance || chest || !!ev);
    const fallen = rosterIds(s).filter(id => s.hp[id] === 0).length;
    const action = this.root.querySelector<HTMLButtonElement>('#rest')!;
    action.disabled = !available; action.classList.toggle('available', available);
    action.dataset.context = camp ? 'camp' : entrance ? 'entrance' : chest ? 'chest' : ev ? 'event' : 'none';
    const label = camp ? 'พัก' : entrance ? 'ทางออก' : chest ? 'เปิด' : ev ? 'ดู' : 'โต้ตอบ';
    action.innerHTML = `${icon(camp ? 'rest' : entrance ? 'flag' : chest ? 'chest' : 'talk')}<span>${label}</span>${available ? '<i class="context-dot"></i>' : ''}`;
    const caption = camp ? (canRest(s, this.map) ? 'พักฟื้นหรือชุบคนที่ล้ม' : fallen ? 'ชุบคนที่ล้มด้วยถ่าน' : 'ไฟแคมป์รอศึกถัดไป') : entrance ? 'จัดทีมหรือถอนตัวกลับค่าย' : chest ? 'เปิดกล่องสมบัติ' : ev ? eventText[ev.kind].name : 'ยืนบนแคมป์หรือกล่องสมบัติ';
    action.setAttribute('aria-label', camp ? `แคมป์ · เปิดหน้าต่างพักและชุบ · ${caption}` : entrance ? `ทางเข้าด่าน · ${caption}` : chest ? 'เปิดกล่องสมบัติ' : ev ? `${eventText[ev.kind].name} · เปิดหน้าต่างตัวเลือก` : 'โต้ตอบ · ยังไม่มีจุดให้โต้ตอบ ยืนบนแคมป์หรือกล่องสมบัติ');
    this.root.querySelector('#action-caption')!.textContent = caption;
  }

  private renderPackButton(s: ExpeditionState, gained: boolean): void {
    const pack = this.root.querySelector<HTMLElement>('#world-pack')!;
    const potions = POTION_IDS.reduce((n, id) => n + s.potions[id], 0);
    pack.innerHTML = `<span class="pack-bag">${icon('pack')}</span>` + resourceOrder.map(id => `<span class="pack-item" data-resource="${id}">${icon(id as IconName)}<b>${s.resources[id]}</b></span>`).join('')
      + (potions ? `<span class="pack-item" data-resource="potion">${icon('potionSalve')}<b>${potions}</b></span>` : '')
      + (s.found.length ? `<span class="pack-item" data-resource="gear">${icon('gearBody')}<b>${s.found.length}</b></span>` : '');
    pack.setAttribute('aria-label', `กระเป๋า · ${resourceOrder.map(id => `${resourceText[id].name} ${s.resources[id]}`).join(' · ')}${s.found.length ? ` · อุปกรณ์ ${s.found.length} ชิ้น` : ''} · เปิดดูของ อุปกรณ์ และทีม`);
    if (gained && !this.reduced.matches) { pack.classList.remove('gain'); void pack.offsetWidth; pack.classList.add('gain'); }
  }

  private salvePick = false;
  // Map potions (2D-5): use buttons with live reasons; a salve lists who can drink it.
  private potionSection(s: ExpeditionState): string {
    const reasons: Record<string, string> = { none: 'ไม่มีแล้ว', full: 'เลือดเต็มทุกคน', active: 'ยังออกฤทธิ์อยู่', busy: 'ใช้ตอนนี้ไม่ได้' };
    const why = (potion: PotionId) => {
      if (s.battle || s.completed) return reasons.busy!;
      if (s.potions[potion] <= 0) return reasons.none!;
      const hurt = rosterIds(s).some(id => s.hp[id]! > 0 && s.hp[id]! < this.hero(id, s).maxHp);
      if (potion !== 'repel' && !hurt) return reasons.full!;
      return potion === 'repel' && s.repel > 0 ? reasons.active! : '';
    };
    const rows = POTION_IDS.map(id => { const reason = why(id);
      return `<li data-potion="${id}">${potionArt(id)}<div><b>${potionText[id].name}</b><small>${potionText[id].help(this.map.potions)}</small></div><strong>${s.potions[id]}</strong>
        <button id="potion-${id}" data-world="potion" data-potion="${id}" class="secondary"${reason ? ' disabled' : ''} aria-expanded="${id === 'salve' ? this.salvePick : false}">${reason || (id === 'salve' && this.salvePick ? 'เลือกคน' : 'ใช้')}</button></li>`; }).join('');
    const targets = this.salvePick ? rosterIds(s).filter(id => s.hp[id]! > 0 && s.hp[id]! < this.hero(id, s).maxHp)
      .map(id => `<button id="salve-${id}" data-world="potion" data-potion="salve" data-hero="${id}" class="secondary salve-target">${portrait(id)}<span>${heroText[id]!.name}<small>${s.hp[id]}/${this.hero(id, s).maxHp}</small></span></button>`).join('') : '';
    return `<h3 class="pack-gear-title">${icon('potionSalve')} ยา <small>พกได้อย่างละ ${this.map.potions.carry} · ใช้บนแผนที่เท่านั้น</small></h3><ul class="pack-potions">${rows}</ul>
      ${targets ? `<div class="salve-targets" role="group" aria-label="เลือกคนดื่มยาฟื้นแผล">${targets}</div>` : ''}${s.repel > 0 ? `<p class="world-stats">ยาไล่อสูรเหลือ ${s.repel} ก้าว</p>` : ''}`;
  }
  // Map bag (2026-10-17): items (potions and resources), gear (wear finds and own items) and team (party and details).
  private renderPack(): void {
    const s = this.view?.state; if (!s) return;
    if(this.inventorySource&&this.inventorySource!==s)this.inventoryPick=undefined;this.inventorySource=s;
    const tab = (id: WorldUI['bagTab'], label: string) => `<button id="bag-tab-${id}" data-world="bag-tab" data-tab="${id}" role="tab" aria-selected="${this.bagTab === id}" class="${this.bagTab === id ? 'active' : ''}">${label}</button>`;
    const tabs = `<div class="camp-tabs three" role="tablist" aria-label="กระเป๋า">${tab('items', 'ของ')}${tab('gear', `อุปกรณ์${s.found.length ? ` <small>ใหม่ ${s.found.length}</small>` : ''}`)}${tab('team', `ทีม <small>${s.roster.deployed.length}+${s.roster.reserve.length}</small>`)}</div>`;
    this.root.querySelector('#pack-content')!.innerHTML = tabs + (this.bagTab === 'gear' ? this.bagInventory(s) : this.bagTab === 'team' ? this.bagTeam(s) : this.bagItems(s));
  }
  private bagItems(s: ExpeditionState): string {
    const opened = s.openedChests.length;
    return `<div role="tabpanel">${this.potionSection(s)}<ul class="pack-list">${resourceOrder.map(id => `<li data-resource="${id}">${id === 'gold' ? potionArt('gold') : itemArt(id)}<div><b>${resourceText[id].name}</b><small>${resourceText[id].use}</small></div><strong>${s.resources[id]}</strong></li>`).join('')}${s.dust ? `<li data-resource="dust">${potionArt('dust')}<div><b>ฝุ่นดาว</b><small>วัตถุดิบตีอุปกรณ์ · นำกลับค่ายเมื่อจบการเดินทาง</small></div><strong>${s.dust}</strong></li>` : ''}</ul>
      ${s.found.length ? `<h3 class="pack-gear-title">${icon('gearBody')} อุปกรณ์ที่เจอ ${s.found.length} ชิ้น</h3><ul class="pack-gear">${s.found.map(i => `<li data-rarity="${i.rarity}">${gearArt(i)}<div><b>${itemName(i)} Lv${i.level}</b><small>${itemLines(this.map.equipment, i).join(' · ')}</small></div></li>`).join('')}</ul><p class="world-stats">เลือกผู้สวมใส่ได้ที่แท็บอุปกรณ์ · ถ้าทีมล้มหมดจะเก็บกลับได้แค่ชิ้นที่ดีที่สุด 1 ชิ้น</p>` : ''}
      <p class="world-stats">เปิดกล่องสมบัติแล้ว ${opened}/${this.map.chests.length} กล่อง · ของตกจากศึกที่ชนะและกล่องสมบัติ</p></div>`;
  }
  private bagInventory(s: ExpeditionState): string {
    const all=runEquipment(s),entries=filteredEquipment(all,this.inventoryFilters),pick=all.find(e=>e.key===this.inventoryPick);
    const picker=pick?'<section class="inventory-pick"><h3>เลือกผู้สวมใส่: '+itemName(pick.item)+'</h3><div class="tree-members">'+rosterIds(s).map(id=>'<button id="inventory-hero-'+id+'" data-world="inventory-character" data-hero="'+id+'" data-key="'+pick.key+'" class="tree-member"'+(pick.item.slot==='weapon'&&pick.item.hero!==id?' disabled':'')+'>'+portrait(id)+'<small>'+heroText[id]!.name+'</small></button>').join('')+'</div></section>':'';
    const rows=entries.map(e=>'<li data-rarity="'+e.item.rarity+'" data-item-key="'+e.key+'">'+gearArt(e.item)+'<div><b>'+itemName(e.item)+' Lv'+e.item.level+'</b><small>'+itemLines(this.map.equipment,e.item).join(' · ')+'</small><small>'+e.label+' · '+itemOwner(e.item)+'</small></div><button id="inventory-'+e.key.replace(':','-')+'" data-world="inventory-pick" data-key="'+e.key+'" class="secondary">ดู/เปรียบเทียบ</button></li>').join('');
    return '<div role="tabpanel"><h3>เปิดหน้าตัวละคร</h3><div class="tree-members">'+rosterIds(s).map(id=>'<button id="bag-member-'+id+'" data-world="character-open" data-hero="'+id+'" data-tab="gear" class="tree-member">'+portrait(id)+'<small>'+heroText[id]!.name+'</small></button>').join('')+'</div>'+picker+'<h3>อุปกรณ์ในกระเป๋า · '+entries.length+'/'+all.length+' ชิ้น</h3>'+gearFilterControls(this.inventoryFilters,'pack-')+(rows?'<ul class="pack-gear inventory-gear">'+rows+'</ul>':'<p class="camp-note">ไม่พบอุปกรณ์ตามตัวกรอง</p>')+'<p class="camp-note">เลือกชิ้นแล้วเลือกตัวละคร เพื่อเปรียบเทียบในหน้าตัวละครเดียวกัน</p></div>';
  }
  // Team tab: the same 4 + 4 swap grid as the camp; the picked member's details show underneath.
  private bagTeam(s: ExpeditionState): string {
    return this.campTeam(s, 'bag-team');
  }
  private heroDetail(_s: ExpeditionState, id: string, prefix = 'bag'): string {
    return '<div class="bag-detail character-links"><h3>'+heroText[id]!.name+'</h3>'+Object.entries({overview:'ดูตัวละคร',gear:'อุปกรณ์',skills:'สกิล',talents:'ความถนัด'}).map(([tab,label])=>'<button id="'+(tab==='gear'?prefix+'-gear-of':prefix+'-character-'+tab)+'" data-world="character-open" data-hero="'+id+'" data-tab="'+tab+'" class="secondary">'+label+'</button>').join('')+'</div>';
  }
  private stars(s: ExpeditionState, id: string): number { return s.members[id]?.stars ?? 1; }
  // Member stats as they fight: the catalog entry scaled by the member's stars.
  private hero(id: string, s = this.view?.state): HeroDefinition { const base = this.heroes.find(h => h.id === id)!; return s ? wounded(starred(base, this.stars(s, id), this.map, s.members[id]?.level ?? 1, s.members[id]?.talents, s.members[id]?.gear, s.members[id]), s.members[id]?.wound) : base; }
  private starRow(n: number): string { return starRow(n, this.map.company.maxStars); }
  private renderCamp(): void {
    const s = this.view?.state; if (!s) return;
    const tab = (id: WorldUI['campTab'], label: string) => `<button id="camp-tab-${id}" data-world="camp-tab" data-tab="${id}" role="tab" aria-selected="${this.campTab === id}" class="${this.campTab === id ? 'active' : ''}">${label}</button>`;
    const camp = atCamp(s, this.map); if (!camp) this.campTab = 'team';
    this.root.querySelector('#camp-title')!.innerHTML = `${icon(camp ? 'camp' : 'flag')} ${camp ? 'แคมป์พักแรม' : 'ทางเข้าด่าน'}`;
    const targets = travelTargets(s, this.map); if (!targets.length && this.campTab === 'travel') this.campTab = camp ? 'care' : 'team';
    const tabs = `<div class="camp-tabs ${camp && targets.length ? 'three' : 'two'}" role="tablist" aria-label="แคมป์">${camp ? tab('care', 'พัก/ชุบ') : ''}${tab('team', `ทีม <small>${s.roster.deployed.length}+${s.roster.reserve.length}</small>`)}${targets.length ? tab('travel', 'วาร์ป') : ''}</div>`;
    const leave = `<section class="camp-section withdraw-section"><button id="withdraw" data-world="withdraw" class="danger-button">${this.confirmWithdraw ? 'ยืนยันถอนตัว · กลับค่ายพร้อมของที่เก็บได้' : `${icon('flag')} ถอนตัวกลับค่าย`}</button><p class="camp-note">ของที่เก็บได้ (แร่ดาว ${s.resources.ore} ตรา ${s.resources.seal}) กลับค่ายครบ ถ่านคืนชีพใช้ได้เฉพาะในด่าน</p></section>`;
    const showTabs = camp || targets.length > 0;
    this.root.querySelector('#camp-content')!.innerHTML = (showTabs ? tabs : '') + (this.campTab === 'care' ? this.campCare(s) : this.campTab === 'travel' ? this.campTravel(targets) : this.campTeam(s)) + leave;
  }
  // 4B: free travel to camps reached this run and the entrance (no encounter on the way).
  private campTravel(targets: Point[]): string {
    const name = (p: Point) => tileAt(this.map, p)?.kind === 'start' ? 'ทางเข้าด่าน' : `แคมป์${zoneOf(this.map, tileAt(this.map, p)?.zoneId ?? '')?.name ?? ''}`;
    return `<section class="camp-section"><p class="camp-note">วาร์ปฟรีไปยังแคมป์ที่เคยไปถึงในรอบนี้ ไม่เจอศัตรูระหว่างทาง</p><ul class="travel-list">${targets.map(p => `<li><button id="travel-${p.x}-${p.y}" data-world="travel" data-x="${p.x}" data-y="${p.y}" class="secondary">${icon(tileAt(this.map, p)?.kind === 'start' ? 'flag' : 'camp')}<span>${name(p)}</span></button></li>`).join('')}</ul></section>`;
  }
  private campCare(s: ExpeditionState): string {
    const ready = canRest(s, this.map); const embers = s.resources.ember;
    const fallen = rosterIds(s).filter(id => s.hp[id] === 0).map(id => this.hero(id));
    const reviveHp = (max: number) => Math.max(1, Math.ceil(max * this.map.camp.reviveHpPercent / 100));
    return `
      <section class="camp-section" role="tabpanel"><h3>${icon('rest')} พักฟื้น</h3>
        <p>ทุกคนในทีมและตัวสำรองที่ยังยืนอยู่ฟื้นเลือด ${this.map.camp.restHealPercent}% ของเลือดสูงสุด ไฟแคมป์ใช้ได้ 1 ครั้ง แล้วต้องชนะศึกอีกครั้งจึงจุดใหม่ได้</p>
        <button id="camp-rest" data-world="camp-rest" class="primary"${ready ? '' : ' disabled'}>${ready ? `พักฟื้น +${this.map.camp.restHealPercent}%` : 'ไฟแคมป์มอด · ชนะศึกก่อน'}</button></section>
      <section class="camp-section"><h3>${icon('ember')} ชุบชีวิต <span class="camp-embers">ถ่านคืนชีพ ${embers}</span></h3>
        ${fallen.length ? `<ul class="revive-list">${fallen.map(h => { const ok = canRevive(s, this.map, h.id); return `<li>${portrait(h.id)}<span><b>${heroText[h.id]!.name}</b><small>ฟื้นด้วยเลือด ${reviveHp(h.maxHp)}/${h.maxHp}</small></span><button id="camp-revive-${h.id}" data-world="camp-revive" data-hero="${h.id}" class="secondary"${ok ? '' : ' disabled'} aria-label="ชุบ${heroText[h.id]!.name} ใช้ถ่านคืนชีพ 1">${ok ? 'ชุบ · ใช้ 1' : 'ไม่มีถ่าน'}</button></li>`; }).join('')}</ul>`
          : '<p>ไม่มีใครล้ม</p>'}
        <p class="camp-note">ชุบได้ครั้งละ 1 คน ต่อถ่านคืนชีพ 1 ก้อน หาได้จากศึกและกล่องสมบัติ</p></section>`;
  }
  private campTeam(s: ExpeditionState, prefix = 'team'): string {
    const card = (id: string | undefined, side: 'deployed' | 'reserve', slot: number) => {
      if (!id) return `<button class="team-card empty${this.picked ? ' target' : ''}" data-world="team-pick" data-side="${side}" aria-label="${side === 'deployed' ? `ช่อง ${slot + 1} ว่าง` : 'ช่องสำรองว่าง'}"${this.picked ? '' : ' disabled'}><span>ว่าง</span></button>`;
      const h = this.hero(id); const hp = s.hp[id] ?? 0; const text = heroText[id]!;
      const lane = h.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง';
      return `<button id="${prefix}-${id}" class="team-card${hp <= 0 ? ' fallen' : ''}" data-world="team-pick" data-hero="${id}" data-side="${side}" aria-pressed="${this.picked === id}" aria-label="${side === 'deployed' ? `ช่อง ${slot + 1} · ` : 'สำรอง · '}${text.name} ${this.stars(s, id)} ดาว ${text.role} ${lane} ${hp <= 0 ? 'ล้มแล้ว' : `เลือด ${hp} จาก ${h.maxHp}`}">${side === 'deployed' ? `<i class="slot-no">${slot + 1}</i>` : ''}${portrait(id)}<b>${text.name}</b>${this.starRow(this.stars(s, id))}<small>Lv${s.members[h.id]?.level ?? 1} · ${hp <= 0 ? 'ล้มแล้ว' : `${hp}/${h.maxHp}`}</small><small class="lane">${text.role} · ${lane}</small></button>`;
    };
    const row = (ids: string[], side: 'deployed' | 'reserve', size: number) => Array.from({ length: size }, (_, i) => card(ids[i], side, i)).join('');
    const deployedUp = s.roster.deployed.some(id => s.hp[id]! > 0);
    return `<section class="camp-section team-section" role="tabpanel">
        <h3>${icon('flag')} ลงสนาม <span class="camp-embers">ศัตรูเล็งตามหมายเลขช่อง</span></h3>
        <div class="team-grid">${row(s.roster.deployed, 'deployed', PARTY_SLOTS)}</div>
        <h3>${icon('camp')} สำรอง</h3>
        <div class="team-grid">${row(s.roster.reserve, 'reserve', RESERVE_SLOTS)}</div>
        <p class="camp-note" id="${prefix}-hint">${this.picked ? `เลือก${heroText[this.picked]!.name}แล้ว · แตะคนหรือช่องว่างอีกฝั่งเพื่อสลับ แตะซ้ำเพื่อยกเลิก` : !deployedUp ? 'ทีมที่ลงสนามล้มหมด · สลับตัวสำรองที่ยังยืนอยู่หรือชุบก่อนออกเดินทาง' : s.roster.reserve.length ? 'แตะสมาชิก แล้วแตะคนหรือช่องว่างอีกฝั่งเพื่อสลับ' : 'ไม่ได้พาตัวสำรองมา · เลือกตัวสำรองได้ที่ค่ายก่อนออกเดินทาง'}</p>${this.picked&&rosterIds(s).includes(this.picked)?this.heroDetail(s,this.picked,prefix==='bag-team'?'bag':'camp'):''}</section>`;
  }

  private renderDanger(chance: number, before: number | undefined): void {
    const chip = this.root.querySelector<HTMLElement>('#danger-chip')!;
    const level = chance === 0 ? 'safe' : chance < 15 ? 'low' : chance < 30 ? 'mid' : 'high';
    chip.dataset.level = level;
    const fill = level === 'safe' ? 1 : Math.min(1, chance / 40);
    const repel = this.view?.state.repel ?? 0;
    chip.innerHTML = `<span class="danger-label">${icon(level === 'safe' ? (repel ? 'potionRepel' : 'safe') : 'danger')}<span>${repel ? `ไล่อสูร ${repel} ก้าว` : level === 'safe' ? 'ปลอดภัย' : 'ก้าวถัดไป'}</span><strong>${chance}%</strong></span><span class="gauge"><span style="width:${fill * 100}%"></span></span>`;
    chip.setAttribute('aria-label', level === 'safe' ? 'พื้นที่ปลอดภัย โอกาสพบศัตรู 0 เปอร์เซ็นต์' : `โอกาสพบศัตรูในก้าวถัดไป ${chance} เปอร์เซ็นต์`);
    if (before !== undefined && chance > before && !this.reduced.matches) { chip.classList.remove('rise'); void chip.offsetWidth; chip.classList.add('rise'); }
  }

  private renderParty(s: ExpeditionState): void {
    this.root.querySelector('#world-party')!.innerHTML = s.roster.deployed.map(id => this.hero(id, s)).map(h => {
      const hp = s.hp[h.id] ?? 0; const ratio = hp / h.maxHp; const text = heroText[h.id]!;
      const state = hp <= 0 ? 'fallen' : ratio < .25 ? 'critical' : ratio < .6 ? 'hurt' : 'healthy';
      return `<button data-world="character-open" data-hero="${h.id}" aria-haspopup="dialog" aria-controls="character-dialog" class="world-hero ${state}${s.guests?.includes(h.id) ? ' guest' : ''}" id="world-hero-${h.id}" aria-label="${text.name}${s.guests?.includes(h.id) ? ' ผู้ร่วมทางชั่วคราว' : ''} ${this.stars(s, h.id)} ดาว เลเวล ${s.members[h.id]?.level ?? 1} ${hp <= 0 ? 'ล้มแล้ว' : `เลือด ${hp} จาก ${h.maxHp}`}">${portrait(h.id)}<span class="hero-copy"><b>${text.name}${this.stars(s, h.id) > 1 ? `<i class="hero-stars">★${this.stars(s, h.id)}</i>` : ''}<i class="hero-level">Lv${s.members[h.id]?.level ?? 1}</i></b><small>${hp <= 0 ? 'ล้มแล้ว' : `${hp}/${h.maxHp}`}</small><span class="hp"><span style="width:${ratio * 100}%"></span></span>${talentPoints(this.map, s.members[h.id]) - talentsSpent(s.members[h.id]?.talents) > 0 ? '<span class="world-talent-badge">+แต้ม</span>' : ''}</span></button>`;
    }).join('');
  }

  private renderFog(s: ExpeditionState): void {
    let html = '';
    for (let y = 0; y < this.map.rows.length; y++) for (let x = 0; x < this.width; x++) {
      const layers = fogLayers(this.map, s, { x, y });
      if (layers.length) html += `<div class="fog-cell${layers[0]!.startsWith('fog_tile') ? ' opaque' : ''}" style="--x:${x};--y:${y};background-image:${layers.map(l => `url(${worldArtUrl(l)})`).join(',')}"></div>`;
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
    // Beaten elites leave their gate; finished events lose their marker (the merchant stays).
    this.root.querySelectorAll<HTMLElement>('.elite-unit').forEach(el => { el.classList.toggle('beaten', s.elitesDefeated.includes(el.dataset.elite!)); });
    this.root.querySelectorAll<HTMLElement>('.event-mark').forEach(el => { el.classList.toggle('done', s.eventsDone.includes(el.dataset.event!)); });
    this.root.querySelectorAll<HTMLElement>('.chest').forEach(el => {
      const open = s.openedChests.includes(el.dataset.chest!);
      if (el.dataset.open === String(open)) return;
      const changed = el.dataset.open !== undefined; el.dataset.open = String(open);
      const f = chestFrame(el.dataset.tier as 'common' | 'rare', open);
      el.style.setProperty('--fx', String(f.x / f.w)); el.innerHTML = '';
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
      // Opened doors and found secret passages get a hint; an open pit does not, and unfound secrets stay secret.
      if (!t || (t.kind === 'wall' && !doorOpen(s, this.map, p) && !(secretAt(this.map, p) && s.secrets.some(id => id === secretAt(this.map, p)!.id))) || openPit(s, this.map, p)) return '';
      const sealed = t.kind === 'boss' && !s.bossDefeated && !questComplete(s, this.map);
      return `<span class="step-hint${sealed ? ' sealed' : (t.kind === 'boss' && !s.bossDefeated) || eliteBlocks(s, this.map, p) ? ' boss' : ''}" data-dir="${dir}" style="--x:${p.x};--y:${p.y}"><i>${icon(dir)}</i></span>`;
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
    const headIcon = b.kind === 'boss' || b.kind === 'elite' ? 'boss' : b.kind === 'complete' ? 'star' : 'danger';
    banner.innerHTML = `${transition ? `<div class="lv-encounter-flash"></div><div class="lv-veil-shatter">${shards.map(([l, t, x, y, a]) => `<i style="--shard-left:${l};--shard-top:${t};--shard-x:${x};--shard-y:${y};--shard-angle:${a}"></i>`).join('')}</div>` : ''}<div class="banner-card ${b.kind === 'boss' || b.kind === 'elite' ? 'lv-boss-reveal' : 'lv-sheet'}"><p class="eyebrow">${icon(headIcon)}<span>${b.eyebrow}</span></p><h2>${b.title}</h2><p>${b.detail}</p></div>`;
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
    const bounds = viewport.getBoundingClientRect();
    const rect = (sel: string) => {
      const r = this.root.querySelector<HTMLElement>(sel)?.getBoundingClientRect();
      return r ? new DOMRect(r.x - bounds.x, r.y - bounds.y, r.width, r.height) : undefined;
    };
    let top = 0, bottom = h;
    for (const sel of ['.hud-location', '.hud-top-right', '.hud-party', '.hud-objective', '.hud-pack']) { const r = rect(sel); if (r && band(r)) top = Math.max(top, r.bottom); }
    for (const sel of ['.hud-movement', '.hud-action', '#world-message']) { const r = rect(sel); if (r && band(r) && !(sel === '#world-message' && this.root.querySelector<HTMLElement>(sel)!.hidden)) bottom = Math.min(bottom, r.top); }
    const focusY = bottom - top >= 3 * t ? (top + bottom) / 2 : h / 2;
    const p = this.view.state.position;
    let ox = Math.round(w / 2 - (p.x + .5) * t), oy = Math.round(focusY - (p.y + .5) * t);
    // Near the board's edges the camera stops at the edge (within the open area) instead of showing empty void.
    const gw = this.map.rows[0]!.length * t, gh = this.map.rows.length * t;
    if (gw > w) ox = Math.min(0, Math.max(w - gw, ox));
    if (gh > bottom - top) oy = Math.min(top, Math.max(Math.round(bottom - gh), oy));
    grid.style.transform = `translate(${ox}px, ${oy}px)`;
    viewport.style.setProperty('--ox', `${ox}px`); viewport.style.setProperty('--oy', `${oy}px`);
  }

  private renderGoals(): void {
    const s = this.view?.state; if (!s) return;
    const sealed = questDone(s, this.map);
    const seal = !this.map.quest.need ? '' : `<h3 class="seal-title">${icon('boss')} ผนึกรอยแยก · ทำให้ครบ ${this.map.quest.need} จาก ${this.map.quest.objectives.length} ก่อนท้าผู้คุม</h3><ul class="goal-list seal-list">${this.map.quest.objectives.map(o => `<li id="quest-${o.id}" class="${sealed.includes(o.id) ? 'done' : ''}">${icon(sealed.includes(o.id) ? 'check' : 'circle')}<span>${questLine(o, s)}</span></li>`).join('')}</ul>`;
    this.root.querySelector('#world-goals-content')!.innerHTML = `<ul class="goal-list">${goals(s, this.map).map(g => `<li class="${g.done ? 'done' : ''}">${icon(g.done ? 'check' : 'circle')}<span>${g.label}</span></li>`).join('')}</ul>${seal}<p class="world-stats">เดินแล้ว ${s.steps} ก้าว · ชนะ ${s.wins} ศึก · แพ้ ${s.defeats} ครั้ง</p>`;
  }

  private renderInfo(): void {
    const s = this.view?.state;
    this.root.querySelector('#world-loot-content')!.innerHTML=lootGuide(this.map,s?.hunt,!s?.hunt)+(this.map.bossCharm?bossGuide(this.map,s?.bossLoot):'');
    this.root.querySelector('#world-info-content')!.innerHTML = `
      <section class="world-rules"><h3>เดินทีละช่อง</h3><p>แตะช่องที่ไฮไลต์ ใช้ปุ่มลูกศรมุมซ้ายล่าง หรือแป้น ←↑↓→ / WASD ทุกก้าวในพื้นที่อันตรายมีโอกาสพบศัตรู ตัวเลขมุมขวาบนคือโอกาสของก้าวถัดไป ยิ่งเดินโดยไม่เจอ โอกาสยิ่งเพิ่ม และกลับไปต่ำสุดเมื่อพบศัตรูหรือพักที่แคมป์</p>
      <h3>เลือดติดตัว</h3><p>จบศึกแล้วเลือดไม่ฟื้นเอง สมาชิกที่ล้มยังล้มอยู่จนกว่าจะชุบที่แคมป์ ศึกถัดไปเริ่มด้วยเลือดที่เหลือ</p>
      <h3>${icon('camp')} แคมป์</h3><p>ยืนบนแคมป์แล้วกด “พัก” มุมขวาล่าง พักฟื้นได้ ${this.map.camp.restHealPercent}% ครั้งเดียวจนกว่าจะชนะศึกถัดไป คนที่ล้มต้องใช้ถ่านคืนชีพชุบทีละคน แคมป์ล่าสุดที่ไปถึงคือจุดกลับเมื่อแพ้</p>
      <h3>${icon('chest')} ของตกและกล่องสมบัติ</h3><p>ชนะศึกได้แร่ดาวและบางครั้งได้ถ่านคืนชีพ ยืนบนกล่องแล้วกด “เปิด” กล่องหายากมีตราสัญญา ดูของที่มีได้จากช่องสัมภาระ</p>
      <h3>${icon('flag')} ทีมและตัวสำรอง</h3><p>พาเข้าด่านได้ 4 + 4 คนจากค่าย สลับตัวและเปลี่ยนอุปกรณ์ได้ในกระเป๋าทุกที่นอกการต่อสู้ ศัตรูเล็งตามหมายเลขช่อง ใครยืนช่องนั้นคือเป้า (กายภาพยังโดนแนวหน้าก่อน)</p>
      <h3>เมื่อแพ้</h3><p>ทีมถอยกลับแคมป์ล่าสุดที่ไปถึง (หรือทางเข้า) คนที่ล้มยังล้มอยู่ ต้องชุบหรือสลับตัวสำรอง ถ้าทุกคนที่พามาล้มหมด การเดินทางล้มเหลว กลับค่ายพร้อมแร่ดาวและตราครึ่งเดียว</p>
      <h3>${icon('camp')} กลับค่าย</h3><p>ถอนตัวได้ที่แคมป์หรือทางเข้าด่าน ของที่เก็บได้กลับค่ายครบ ไปถึง${this.map.goalName}คือสำเร็จการเดินทาง</p>
      ${this.map.elites.length ? `<h3>${icon('boss')} อีลิท</h3><p>อีลิทขอบแดงเฝ้าด่านทางเดียว ต้องชนะถึงจะผ่าน · อีลิทขอบทองที่มีหีบเหนือหัวเดินอ้อมได้ แต่ถ้าท้าสู้แล้วชนะจะได้ EXP ×${this.map.eventRules.optionalElite.exp} อุปกรณ์ชั้นดีกว่า เหรียญทอง +${this.map.eventRules.optionalElite.gold} และตราสัญญา +${this.map.eventRules.optionalElite.seal}</p>` : ''}
      ${this.map.quest.need ? `<h3>${icon('boss')} ผนึกรอยแยก</h3><p>ผู้คุมรอยแยกถูกผนึกไว้ ต้องทำเป้าหมายให้ครบ ${this.map.quest.need} จาก ${this.map.quest.objectives.length} ก่อนจึงท้าสู้ได้: ชนะมินิบอสยักษ์หินในรอยแผล, เปิดกล่องสมบัติ 6 กล่อง หรือชำระรอยแยกเล็ก ดูความคืบหน้าได้จากช่องเป้าหมายมุมซ้ายบน</p>` : ''}
      ${this.map.puzzles.runes.length + this.map.puzzles.secrets.length ? `<h3>${icon('star')} ปริศนาและทางลับ</h3><p>แต่ละโซนมีปริศนาเฝ้ากล่องหายาก: ทุ่งมีหินรูน 3 ก้อน เหยียบตามลำดับสัญลักษณ์บนประตูหิน · พงหนามมีก้อนหิน เดินชนเพื่อผลักลงหลุม · รอยแผลมีคันโยก 2 อันคนละฝั่ง ดึงให้ครบ · กำแพงที่มีรอยร้าวเรืองแสงจาง ๆ บางช่องเดินทะลุได้</p>` : ''}
      <h3>${icon('boss')} ${this.map.bossName}</h3><p>บอสเฝ้าทางเดียวไป${this.map.goalName} เดินชนบอสเพื่อเริ่มศึก ชนะแล้วเดินไปที่ประตูเพื่อจบการเดินทาง</p></section>
      ${s ? `<p class="world-stats">เดินแล้ว ${s.steps} ก้าว · ชนะ ${s.wins} ศึก · แพ้ ${s.defeats} ครั้ง</p>` : ''}
      <p id="world-save" class="world-save">${this.view?.saved ? 'บันทึกอัตโนมัติบนเครื่องนี้ทุกก้าว' : 'เล่นได้ แต่บันทึกบนเครื่องนี้ไม่ได้'}</p>`;
  }
}
