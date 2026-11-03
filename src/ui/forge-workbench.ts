import { icon } from './icons';
import { preloadForgeStrike } from './forge-strike';
import { equipmentEffects } from './character-view';
import { salvageReason } from '../core/world/profile';
import type { EncounterDefinition, HeroDefinition } from '../core/battle/types';
import { enhancementInvestment, itemStats, salvageValue, affixPool, GEAR_SPECIALS, RARITIES } from '../core/world/equipment';
import { transferCandidate, transferReason, weaponBlueprint, weaponCraftCost, weaponCraftReason, enhancementCostTo, findItem, fuseMaterials, fuseReason, fusionRefund, itemLevelCap, itemLevelCost, raiseItemLevel, rerollReason, smeltLeft, smeltReason } from '../core/world/forge';
import type { LobbyFeature, Gear, Item, MapDefinition, Profile } from '../core/world/types';
import { levelOf, starred } from '../core/world/world';
import { filteredEquipment, gearFilters, newGearFilters, changeGearFilter } from './gear-inventory';
import { characterStats, characterSkillMetric } from './character-metrics';
import { gearArt } from './equip-art';
import { heroText, itemLines, itemName, rarityText, slotText, statName, specialText } from './th';

interface ForgeHost {
  transfer(uid:number,index:number,donor:number,sourceIndex:number):void; craft(hero:string,level:number):void; quest?():string; enhance(uid:number,target:number):void; fuse(uid:number,donors:number[]):void; level(uid:number,target:number):void; reroll(uid:number,index:number):void;
  salvage(uids:number[]):void; lock(uid:number):void; smelt(dust:number):void;
}
type Tab='develop'|'craft'|'recycle'|'smelt';
type Mode='enhance'|'level'|'fuse'|'reroll'|'transfer';
type DevelopmentMode=Exclude<Mode,'transfer'>;
const tabs:Record<Tab,string>={develop:'พัฒนา',craft:'สร้างอาวุธ',recycle:'รีไซเคิล',smelt:'หลอมแร่'};
const tabIcons:Record<Tab,Parameters<typeof icon>[0]>={develop:'tab-forge',craft:'attack',recycle:'act-reset',smelt:'dust'};
const modes:Record<Mode,string>={enhance:'ตีบวก',level:'เพิ่ม Lv',fuse:'หลอมสี',reroll:'ปรับค่า',transfer:'ถ่ายโอน'};
const forgeTasks:readonly {id:Mode|'craft'|'recycle'|'smelt';tab:Tab;mode?:Mode;label:string;description:string;glyph:Parameters<typeof icon>[0];feature?:LobbyFeature}[]=[
  {id:'enhance',tab:'develop',mode:'enhance',label:'ตีบวกอุปกรณ์',description:'เพิ่มขั้น + เพื่อเสริมพลังของชิ้นเดิม',glyph:'enhance'},
  {id:'level',tab:'develop',mode:'level',label:'เพิ่มเลเวลอุปกรณ์',description:'เพิ่ม Lv ทีละ 1 ภายในเพดานที่ปลดล็อก',glyph:'up',feature:'level'},
  {id:'fuse',tab:'develop',mode:'fuse',label:'เลื่อนความหายาก',description:'ใช้ของสีเดียวกันเป็นวัตถุดิบ · วัตถุดิบหายไป',glyph:'fuse',feature:'fuse'},
  {id:'reroll',tab:'develop',mode:'reroll',label:'สุ่มคุณสมบัติ',description:'สุ่มเปลี่ยนคุณสมบัติรอง 1 ช่อง',glyph:'reroll',feature:'fuse'},
  {id:'transfer',tab:'develop',mode:'transfer',label:'ถ่ายโอนคุณสมบัติ',description:'คัดลอกจากของต้นทาง · ของต้นทางหายไป',glyph:'forge',feature:'transfer'},
  {id:'craft',tab:'craft',label:'สร้างอาวุธ',description:'เลือกอาชีพและ Lv เพื่อสร้างอาวุธพร้อมใช้',glyph:'attack',feature:'craft'},
  {id:'recycle',tab:'recycle',label:'รีไซเคิลอุปกรณ์',description:'ทำลายชิ้นในคลังและรับวัตถุดิบคืน',glyph:'act-reset'},
  {id:'smelt',tab:'smelt',label:'แปรรูปแร่เป็นฝุ่น',description:'แลกแร่เป็นฝุ่นดาวตามอัตราของช่าง',glyph:'dust'},
];
// Presentation state only. Every destructive action needs a review against the same profile object.
// Random crafts expose possible outcomes, never invoke the RNG to produce a readonly forecast.
export class ForgeWorkbench {
  private tab:Tab='develop'; private mode:Mode='enhance'; private uid:number|undefined;
  private donors:number[]|undefined; private craftHero='';private craftLevel=1;private donorUid=0;private sourceIndex=0;
  private picker=true; private target=0; private index=0; private owner='all'; private hero='';
  private impactOpen=false; private filtersOpen=false;
  private filters=newGearFilters(); private source:Profile|undefined; private review=false;
  private staleReview=false; private detailsOpen=false; private readyScroll=0;
  private choosingTask=true;private taskReturn:{tab:Tab;mode:Mode;picker:boolean}|undefined;
  private success:{mode:DevelopmentMode;uid:number;from:number;to:number;ore:number;dust:number;before:Profile;after:Profile;index:number;donors:number[]}|undefined;
  constructor(private readonly map:MapDefinition,private readonly heroes:readonly HeroDefinition[],private readonly data:EncounterDefinition,private readonly host:ForgeHost){}
  remember(root:HTMLElement):void {const impact=root.querySelector<HTMLDetailsElement>('details.forge-impact'),filters=root.querySelector<HTMLDetailsElement>('.gear-extra-filters');if(impact)this.impactOpen=impact.open;if(filters)this.filtersOpen=filters.open;const details=root.querySelector<HTMLDetailsElement>('.forge-secondary-details');if(details)this.detailsOpen=details.open;const body=root.querySelector('.forge-enhancement-content');if(body&&!this.review)this.readyScroll=body.scrollTop;}
  open(uid?:number):void {this.donors=undefined;this.donorUid=0;this.uid=uid;this.picker=uid===undefined;this.tab='develop';this.mode='enhance';this.target=0;this.review=false;this.success=undefined;this.staleReview=false;this.detailsOpen=false;this.readyScroll=0;this.choosingTask=uid===undefined;this.taskReturn=undefined;}
  openTasks():void{this.choosingTask=true;this.taskReturn=undefined;this.review=false;this.success=undefined;}
  cancelReview():boolean{const was=this.review;this.review=false;return was;}
  get enhancementView():boolean{return this.developmentView&&this.mode==='enhance';}
  private get itemPicker():boolean{return (this.tab==='develop'||this.tab==='recycle')&&(this.picker||!this.uid);}
  private get developmentView():boolean{return !this.choosingTask&&this.tab==='develop'&&this.mode!=='transfer'&&!this.itemPicker&&this.uid!==undefined;}
  private get reviewFocus():string{return this.mode==='reroll'?'forge-reroll-'+this.index:'forge-'+this.mode;}
  get taskNavigation():boolean{return !this.choosingTask;}
  get scroll():number{return this.review?0:this.readyScroll;}
  backFromEnhancement():string|undefined{
    if(this.choosingTask&&this.taskReturn){const previous=this.taskReturn;this.tab=previous.tab;this.mode=previous.mode;this.picker=previous.picker;this.choosingTask=false;this.taskReturn=undefined;return 'forge-open-tasks';}
    if(this.developmentView&&this.cancelReview())return this.reviewFocus;
    if(!this.choosingTask&&this.itemPicker){if(this.uid){this.picker=false;return 'forge-change-item';}this.choosingTask=true;return this.tab==='develop'?'forge-mode-'+this.mode:'forge-tab-'+this.tab;}
    return;
  }
  get heading():string{
    if(this.choosingTask)return 'เลือกงานโรงตีเหล็ก';
    if(this.itemPicker)return this.tab==='recycle'?'เลือกอุปกรณ์รีไซเคิล':'เลือกอุปกรณ์ · '+(this.mode==='level'?'เพิ่มเลเวล':modes[this.mode]);
    if(!this.developmentView)return 'ช่างตีเหล็ก';
    if(this.mode==='fuse')return this.success?'ผลเลื่อนความหายาก':this.review?'ตรวจรายการเลื่อนสี':'เลื่อนความหายาก';
    if(this.mode==='reroll')return (this.success?'ผลการ':this.review?'ตรวจรายการ':'')+'สุ่มคุณสมบัติ';
    return this.mode==='level'?(this.success?'ผลการเพิ่มเลเวล':this.review?'ตรวจรายการเพิ่มเลเวล':'เพิ่มเลเวลอุปกรณ์'):(this.success?'ผลการตีบวก':this.review?'ตรวจรายการตีบวก':'ตีบวกอุปกรณ์');
  }
  // Only committed forged events from the shell produce success feedback.
  enhanced(p:Profile,uid:number):void {
    this.developed(p,uid,'enhance');
  }
  leveled(p:Profile,uid:number):void{this.developed(p,uid,'level');}
  fused(p:Profile,uid:number):void{this.developed(p,uid,'fuse');}
  rerolled(p:Profile,uid:number):void{this.developed(p,uid,'reroll');}
  private developed(p:Profile,uid:number,mode:DevelopmentMode):void{
    const before=this.source&&findItem(this.source,uid)?.item,after=findItem(p,uid)?.item;
    if(!this.developmentView||this.mode!==mode||this.uid!==uid||!before||!after||!this.source)return;
    this.success={mode,uid,from:mode==='level'?before.level:before.plus??0,to:mode==='level'?after.level:after.plus??0,ore:this.source.bank.ore-p.bank.ore,dust:this.source.bank.dust-p.bank.dust,before:this.source,after:p,index:this.index,donors:[...this.donors??[]]};this.readyScroll=0;this.staleReview=false;
  }
  get selected():number|undefined{return this.uid;}
  click(b:HTMLButtonElement,p:Profile):string|undefined {
    const action=b.dataset.forge;if(!action||b.disabled)return;
    if(action==='confirm'&&!this.review&&this.success)return;
    if(action==='next-preview'){this.success=undefined;this.review=false;this.readyScroll=0;return 'lobby-sheet-title';}
    if(action!=='confirm'){this.review=false;this.staleReview=false;this.success=undefined;}
    if(action==='tasks'){this.taskReturn={tab:this.tab,mode:this.mode,picker:this.picker};this.choosingTask=true;return 'lobby-sheet-title';}
    if(action==='task'){
      const task=forgeTasks.find(t=>t.id===b.dataset.task);if(!task)return;
      this.tab=task.tab;if(task.mode)this.mode=task.mode;this.choosingTask=false;this.taskReturn=undefined;this.picker=this.uid===undefined;this.target=0;this.detailsOpen=false;this.readyScroll=0;this.donors=undefined;this.donorUid=0;
      return task.tab==='craft'?'forge-craft-hero':task.tab==='smelt'?'forge-target':this.picker?'lobby-sheet-title':'forge-change-item';
    }
    if(action==='tab'&&Object.hasOwn(tabs,b.dataset.tab!)){this.target=0;this.tab=b.dataset.tab as Tab;this.picker=this.picker||this.uid===undefined;return 'forge-tab-'+this.tab;}
    if(action==='pick'){this.donors=undefined;this.uid=Number(b.dataset.uid);this.impactOpen=false;this.detailsOpen=false;this.readyScroll=0;this.picker=false;this.target=0;this.index=0;this.hero=findItem(p,this.uid)?.owner??'';return 'forge-change-item';}
    if(action==='picker'){this.picker=true;return this.tab==='develop'&&this.mode!=='transfer'?'lobby-sheet-title':'forge-owner-filter';}
    if(action==='resume'&&this.uid&&findItem(p,this.uid)){this.picker=false;return 'forge-change-item';}
    if(action==='mode'&&Object.hasOwn(modes,b.dataset.mode!)){this.mode=b.dataset.mode as Mode;this.target=0;return 'forge-mode-'+this.mode;}
    if(action==='donor'){const id=Number(b.dataset.uid);this.donors??=[];this.donors=this.donors.includes(id)?this.donors.filter(i=>i!==id):[...this.donors,id];return 'forge-donor-'+id;}
    if(action==='recommend'){this.donors=fuseMaterials(p,this.map,this.uid!).map(i=>i.uid);return 'forge-recommend';}
    if(action==='lock'&&this.uid){this.host.lock(this.uid);return 'forge-lock';}
    if(action==='reset'){this.filters=newGearFilters();this.owner='all';return 'forge-gear-filter-set';}
    if(action==='cancel'){if(this.developmentView)return this.reviewFocus;return this.tab==='craft'?'forge-craft-hero':'forge-change-item';}
    if(action==='review'){this.review=true;return 'forge-confirm';}
    if(action==='confirm'&&(!this.review||this.source!==p)){this.review=false;this.staleReview=true;return this.reviewFocus;}
    if(action==='confirm'&&this.review&&this.source===p){
      this.review=false;
      if(this.tab==='craft'){if(weaponCraftReason(p,this.map,this.craftHero,this.craftLevel))return 'forge-craft-hero';const uid=p.nextItem;this.host.craft(this.craftHero,this.craftLevel);this.uid=uid;this.tab='develop';this.mode='enhance';this.picker=false;this.target=0;}
      else if(this.tab==='smelt')this.host.smelt(this.target===5?5:1);
      else if(this.uid&&findItem(p,this.uid)){
        if(this.tab==='recycle')this.host.salvage([this.uid]);
        else if(this.mode==='enhance'){
          const item=findItem(p,this.uid)!.item,cost=enhancementCostTo(this.map,item,this.target);
          if(!cost||this.target!==(item.plus??0)+1||p.bank.ore<cost.ore||p.bank.dust<cost.dust)return 'forge-enhance';
          this.host.enhance(this.uid,this.target);return 'forge-success';
        }
        else if(this.mode==='level'){
          const item=findItem(p,this.uid)!.item,cost=itemLevelCost(this.map,item,this.target);
          if(!cost||this.target!==item.level+1||this.target>itemLevelCap(p,this.map)||p.bank.ore<cost.ore||p.bank.dust<cost.dust)return 'forge-level';
          this.host.level(this.uid,this.target);return 'forge-success';
        }
        else if(this.mode==='fuse'){
          if(fuseReason(p,this.map,this.uid,this.donors??[]))return this.reviewFocus;
          this.host.fuse(this.uid,[...this.donors??[]]);return 'forge-success';
        }
        else if(this.mode==='transfer')this.host.transfer(this.uid,this.index,this.donorUid,this.sourceIndex);
        else {
          if(rerollReason(p,this.map,this.uid,this.index))return this.reviewFocus;
          this.host.reroll(this.uid,this.index);return 'forge-success';
        }
      }
      return this.tab==='recycle'?'forge-owner-filter':'forge-change-item';
    }
    return 'forge-change-item';
  }
  change(c:HTMLSelectElement|HTMLInputElement):string {
    this.review=false;this.staleReview=false;
    if(c.id==='forge-preview-hero'){this.hero=c.value;return c.id;}
    this.success=undefined;
    if(c.dataset.gearFilter)changeGearFilter(this.filters,c);
    else if(c.id==='forge-owner-filter')this.owner=c.value;
    else if(c.id==='forge-target')this.target=Number(c.value);
    else if(c.id==='forge-affix')this.index=Number(c.value);
    else if(c.id==='forge-transfer-donor'){this.donorUid=Number(c.value);this.sourceIndex=0;}
    else if(c.id==='forge-transfer-source')this.sourceIndex=Number(c.value);
    else if(c.id==='forge-craft-hero')this.craftHero=c.value;
    else if(c.id==='forge-craft-level')this.craftLevel=Number(c.value);
    return c.id;
  }
  // Lobby systems by chapter (A3): `open` says which forge modes and tabs are open yet.
  render(p:Profile,open:(f:LobbyFeature)=>boolean=()=>true):string {
    preloadForgeStrike();
    if(this.success&&this.success.after!==p)this.success=undefined;
    const modeFeature:Partial<Record<Mode,LobbyFeature>>={level:'level',fuse:'fuse',reroll:'fuse',transfer:'transfer'};
    const modeOpen=(m:Mode)=>{const f=modeFeature[m];return !f||open(f);};
    if(!modeOpen(this.mode))this.mode='enhance';if(this.tab==='craft'&&!open('craft'))this.tab='develop';
    if(this.source!==p){if(this.review)this.staleReview=true;this.review=false;this.donors=undefined;this.donorUid=0;this.source=p;}
    if(this.uid&&!findItem(p,this.uid)){this.uid=undefined;this.picker=true;}
    const header=`<div class="forge-tabs" role="tablist" aria-label="โรงตีเหล็ก">${Object.entries(tabs).map(([id,text])=>`<button id="forge-tab-${id}" data-forge="tab" data-tab="${id}" role="tab"${id==='craft'&&!open('craft')?' disabled':''} aria-selected="${id===this.tab}" aria-controls="forge-body" tabindex="${id===this.tab?0:-1}">${icon(tabIcons[id as Tab])}<span>${text}</span></button>`).join('')}</div>`;
    const bank=`<div class="forge-bank" aria-label="ทรัพยากร แร่ดาว ${p.bank.ore} ฝุ่นดาว ${p.bank.dust} ตราสัญญา ${p.bank.seal}"><span class="ui-pill">${icon('ore')}แร่ ${p.bank.ore}</span><span class="ui-pill">${icon('dust')}ฝุ่น ${p.bank.dust}</span><span class="ui-pill">${icon('seal')}ตรา ${p.bank.seal}</span></div>`;
    if(this.choosingTask)return this.launcher(p,open,bank);
    if(this.itemPicker)return `<section class="forge-workbench forge-launcher forge-picker" data-tab="${this.tab}" data-mode="${this.mode}"><div id="forge-body" role="region" aria-label="เลือกอุปกรณ์">${bank}${this.items(p)}</div>${this.frameTrim()}</section>`;
    if(this.developmentView){
      const {item,owner}=findItem(p,this.uid!)!;
      return this.mode==='fuse'||this.mode==='reroll'?this.randomDevelopmentPage(p,item,owner):this.enhancementPage(p,item,owner);
    }
    let body:string;
    if(this.tab==='craft')body=this.crafting(p);
    else if(this.tab==='smelt')body=this.smelt(p);
    else if(this.picker||!this.uid)body=this.items(p);
    else {
      const {item,owner}=findItem(p,this.uid)!;
      body=`<div class="forge-item-head forge-showcase" data-rarity="${item.rarity}">${gearArt(item)}<div><b>${itemName(item)}</b><small>${slotText[item.slot]} · Lv${item.level} · ${rarityText[item.rarity]} · +${item.plus??0}</small><small>${owner?`สวมอยู่: ${heroText[owner]!.name}`:'ในคลัง'}${item.locked?' · ล็อกแล้ว':''}</small></div></div><div class="forge-item-tools"><button id="forge-change-item" data-forge="picker" class="secondary">เปลี่ยนอุปกรณ์</button><button id="forge-lock" data-forge="lock" class="secondary" aria-pressed="${!!item.locked}">${icon(item.locked?'act-unlock':'act-lock')}${item.locked?'ปลดล็อก':'ล็อกอุปกรณ์'}</button></div>`;
      body+=this.tab==='recycle'?this.recycle(p,item,owner):`<div class="forge-modes" role="group" aria-label="วิธีพัฒนา">${Object.entries(modes).map(([id,text])=>`<button id="forge-mode-${id}" data-forge="mode" data-mode="${id}" aria-pressed="${id===this.mode}" class="secondary"${modeOpen(id as Mode)?'':' disabled'}>${modeOpen(id as Mode)?'':'🔒 '}${text}</button>`).join('')}</div><div class="forge-detail" data-rarity="${item.rarity}">${this.transfer(p,item,owner)}</div>`;
    }
    return `<section class="forge-workbench" data-review="${this.review}" data-tab="${this.tab}" data-mode="${this.mode}">${bank}${header}<div id="forge-body" role="tabpanel" aria-labelledby="forge-tab-${this.tab}">${body}</div></section>`;
  }
  private frameTrim():string{return `<div class="forge-frame-trim" aria-hidden="true">${['tl','tr','bl','br'].map(c=>`<i class="corner ${c}"></i>`).join('')}<i class="edge-h top"></i><i class="edge-h bottom"></i><i class="edge-v left"></i><i class="edge-v right"></i></div>`;}
  private launcher(p:Profile,open:(f:LobbyFeature)=>boolean,bank:string):string {
    const chosen=this.uid?findItem(p,this.uid):undefined;
    const selected=chosen?`<section class="forge-launcher-item" aria-label="อุปกรณ์ที่เลือก">${gearArt(chosen.item)}<div><small>ชิ้นที่เลือกไว้สำหรับงานพัฒนา</small><b>${itemName(chosen.item)}</b><small>Lv${chosen.item.level} · +${chosen.item.plus??0} · ${chosen.owner?`สวมอยู่: ${heroText[chosen.owner]!.name}`:'ในคลัง'}</small></div></section>`:'';
    return `<section class="forge-workbench forge-launcher" data-task-launcher="true"><div id="forge-body" role="region" aria-label="งานโรงตีเหล็ก"><p class="forge-launcher-copy">เลือกสิ่งที่ต้องการทำ · การเปิดดูยังไม่ใช้ทรัพยากร</p>${selected}${bank}<div class="forge-task-grid">${forgeTasks.map(task=>{
      const enabled=!task.feature||open(task.feature),id=task.mode?'forge-mode-'+task.mode:'forge-tab-'+task.tab;
      return `<button id="${id}" data-forge="task" data-task="${task.id}" class="forge-task-card" data-primary="${task.id==='enhance'||task.id==='level'}"${enabled?'':' disabled'}>${icon(task.glyph)}<span><b>${task.label}</b><small>${task.description}</small>${enabled?'':'<small>ยังไม่ปลดล็อก</small>'}</span></button>`;
    }).join('')}</div>${this.host.quest?`<details class="forge-quests"><summary>งานของช่างตีเหล็ก</summary>${this.host.quest()}</details>`:''}</div>${this.frameTrim()}</section>`;
  }
  private crafting(p:Profile):string {
    if(!p.company.includes(this.craftHero))this.craftHero=p.company[0]!;
    const cap=itemLevelCap(p,this.map);if(this.craftLevel>cap||this.craftLevel<1)this.craftLevel=1;
    const item=weaponBlueprint(this.map,this.craftHero,this.craftLevel),cost=weaponCraftCost(this.map,this.craftLevel)!,reason=weaponCraftReason(p,this.map,this.craftHero,this.craftLevel);
    const reasons:Record<string,string>={unknown:'ไม่พบอาชีพนี้',level:'Lv เกินเพดานที่ปลดล็อก',pending:'จัดการของรอรับในกระเป๋าก่อน',bag:'คลังเต็ม · จัดของหรือขยายคลังก่อน',ore:'แร่ดาวไม่พอ',dust:'ฝุ่นดาวไม่พอ',full:'ไม่สามารถเพิ่มอุปกรณ์ได้'};
    return `<div class="forge-craft"><h3>สร้างอาวุธพร้อมใช้</h3><p class="camp-note">สีดี · คุณภาพ 100% · ไม่มีเซ็ต · ไม่สุ่ม · เลือกอาชีพที่มีอยู่ รวมสมาชิกที่ไม่ได้พามา · ใช้เพดาน Lv เดียวกับช่าง</p><div class="forge-craft-selectors"><label class="forge-label">อาชีพ<select id="forge-craft-hero">${p.company.map(id=>`<option value="${id}"${id===this.craftHero?' selected':''}>${heroText[id]!.role} · ${heroText[id]!.name}</option>`).join('')}</select></label><label class="forge-label">Lv อาวุธ · ปลดล็อกถึง ${cap}<select id="forge-craft-level">${Array.from({length:cap},(_,n)=>n+1).map(n=>`<option value="${n}"${n===this.craftLevel?' selected':''}>Lv${n}</option>`).join('')}</select></label></div><div class="forge-item-head" data-rarity="1">${gearArt(item)}<div><b>${itemName(item)} · Lv${item.level}</b><small>${itemLines(this.map.equipment,item).join(' · ')}</small><small>ได้รับ 1 ชิ้นเข้าคลัง · ไม่สวมให้อัตโนมัติ</small></div></div>${this.heroImpact(p,this.craftHero,p.members[this.craftHero]!.gear??{},{...p.members[this.craftHero]!.gear,weapon:item},'เทียบกับอาวุธที่สวมอยู่ตอนนี้')}<p class="camp-note">ค่าผลิตไม่ใช่ทุนพัฒนา: รีไซเคิลคืนเฉพาะมูลค่าพื้นฐาน แร่ ${this.map.equipment.salvage[1]!.ore} · ฝุ่น ${this.map.equipment.salvage[1]!.dust} · ตีบวก/เพิ่ม Lv ภายหลังยังคืนทุน 100% · การสร้างไม่นับความคืบหน้ารับประกันฟาร์ม</p>${this.footer('forge-craft','สร้างอาวุธ 1 ชิ้น',reasons[reason]??'',`แร่ ${cost.ore} · ฝุ่น ${cost.dust}`,`คงเหลือ แร่ ${p.bank.ore-cost.ore} · ฝุ่น ${p.bank.dust-cost.dust}`)}</div>`;
  }
  private items(p:Profile):string {
    const all=[...p.items.map(item=>({key:'owned:'+item.uid,item,label:'ในคลัง',owner:''})),...Object.entries(p.members).flatMap(([owner,m])=>Object.values(m.gear??{}).map(item=>({key:'owned:'+item!.uid,item:item!,label:'สวมอยู่: '+heroText[owner]!.name,owner})))];
    const entries=filteredEquipment(all,this.filters).filter(e=>{const owner=all.find(v=>v.key===e.key)!.owner;return (this.owner==='all'||(this.owner==='bag'?!owner:owner===this.owner))&&(this.tab!=='recycle'||!owner);});
    return `${this.uid&&findItem(p,this.uid)?'<button id="forge-resume" data-forge="resume" class="secondary">← กลับชิ้นที่เลือก</button>':''}${this.tab==='develop'&&this.host.quest?`<details class="forge-quests"><summary>งานของช่างตีเหล็ก</summary>${this.host.quest()}</details>`:''}<h3>${this.tab==='recycle'?'เลือกชิ้นที่จะรีไซเคิล':this.mode==='level'?'เลือกอุปกรณ์เพื่อเพิ่มเลเวล':'เลือกอุปกรณ์ที่จะพัฒนา'}</h3><p class="camp-note">${this.tab==='recycle'?'ชิ้นที่เลือกจะหายไป รวมพลังบอสถ้ามี · ตรวจยอดคืนก่อนยืนยัน · ของสวมอยู่ต้องถอดก่อน':'แตะชิ้นที่ต้องการสำหรับงานนี้ · ยังไม่ใช้ทรัพยากร · เปลี่ยนงานได้โดยคงชิ้นที่เลือก'}</p><label class="forge-label">ตำแหน่งอุปกรณ์<select id="forge-owner-filter"><option value="all"${this.owner==='all'?' selected':''}>ทั้งหมด</option><option value="bag"${this.owner==='bag'?' selected':''}>ในคลัง</option>${p.company.map(id=>`<option value="${id}"${this.owner===id?' selected':''}>สวมอยู่: ${heroText[id]!.name}</option>`).join('')}</select></label>${gearFilters(this.filters,'forge-').replace('<details class="gear-extra-filters">',`<details class="gear-extra-filters"${this.filtersOpen?' open':''}>`)}<p class="camp-note">${entries.length}/${all.length} ชิ้น · รูปกุญแจระบุของที่ล็อก</p><ul class="forge-list">${entries.map(e=>`<li data-rarity="${e.item.rarity}"><button id="forge-item-${e.item.uid}" data-forge="pick" data-uid="${e.item.uid}" class="forge-pick" aria-pressed="${this.uid===e.item.uid}">${gearArt(e.item)}<b>${itemName(e.item)} Lv${e.item.level} +${e.item.plus??0}${e.item.locked?' · 🔒':''}</b><small>${e.label} · ${itemLines(this.map.equipment,e.item).join(' · ')}</small></button></li>`).join('')}</ul>${entries.length?'':'<p class="camp-note">ไม่พบของตามตัวกรอง</p>'}`;
  }
  private footer(id:string,label:string,reason:string,cost:string,after:string,extra=''):string {
    return `<div class="forge-footer"><p id="forge-cost">${cost}</p>${after?`<small>${after}</small>`:''}${reason?`<p class="forge-reason" role="status">${reason}</p>`:''}${this.review?`<p class="forge-review" role="status">ตรวจรายการแล้วกดยืนยัน</p><div class="forge-footer-buttons"><button id="forge-confirm" data-forge="confirm" ${extra} class="primary"${reason?' disabled':''}>ยืนยัน${label}</button><button id="forge-cancel" data-forge="cancel" class="secondary">ยกเลิก</button></div>`:`<button id="${id}" data-forge="review" ${extra} class="primary"${reason?' disabled':''}>${icon('tab-forge')}${label}</button>`}</div>`;
  }
  private enhancementPage(p:Profile,item:Item,owner:string|undefined):string {
    const leveling=this.mode==='level',operation=leveling?'เพิ่มเลเวล':'ตีบวก';
    const step=(value:number)=>leveling?`Lv${value}`:`+${value}`;
    const current=leveling?item.level:item.plus??0,cap=leveling?itemLevelCap(p,this.map):this.map.equipment.forge.plusCap[item.rarity]!;
    this.target=Math.min(cap,current+1);
    const receipt=this.success?.uid===item.uid&&this.success.mode===this.mode?this.success:undefined;
    const before=receipt?findItem(receipt.before,item.uid)!.item:item;
    const cost=current>=cap?undefined:leveling?itemLevelCost(this.map,item,this.target):enhancementCostTo(this.map,item,this.target);
    const next=receipt?item:!cost?item:leveling?{...item,level:this.target}:{...item,plus:this.target};
    const previewProfile=receipt?.before??p,paid=enhancementInvestment(this.map,item),levelPaid=item.levelInvestment??{ore:0,dust:0};
    const reasons=cost?[p.bank.ore<cost.ore?`แร่ดาวขาด ${cost.ore-p.bank.ore}`:'',p.bank.dust<cost.dust?`ฝุ่นดาวขาด ${cost.dust-p.bank.dust}`:''].filter(Boolean):[];
    if(leveling&&cost&&!reasons.length&&raiseItemLevel(p,this.map,item.uid,this.target).event.type==='blocked')reasons.push('ไม่สามารถเพิ่มเลเวลได้ · ตรวจข้อมูลอุปกรณ์ใหม่');
    const result=receipt?`<p id="forge-success" class="forge-success" role="status" tabindex="-1">${icon('check')}${operation}สำเร็จ ${step(receipt.from)} → ${step(receipt.to)}<small>ใช้แร่ ${receipt.ore} · ฝุ่น ${receipt.dust} · คงเหลือ แร่ ${p.bank.ore} · ฝุ่น ${p.bank.dust}</small></p>`:'';
    const resource=(label:string,glyph:'ore'|'dust',used:number,available:number,committed=false)=>`<div class="forge-resource${!committed&&available<used?' shortage':''}"><b>${icon(glyph)}${label} · ${committed?'ใช้แล้ว':'ใช้'} ${used}</b><span>${committed?'เหลือ':'มี'} ${available}${!committed&&available<used?` · ขาด ${used-available}`:''}</span></div>`;
    const resources=receipt?resource('แร่','ore',receipt.ore,p.bank.ore,true)+resource('ฝุ่น','dust',receipt.dust,p.bank.dust,true):cost?resource('แร่','ore',cost.ore,p.bank.ore)+resource('ฝุ่น','dust',cost.dust,p.bank.dust):'<div class="forge-resource"><b>ถึงเพดาน</b><span>ไม่มีขั้นถัดไป</span></div><div class="forge-resource"><b>ไม่ใช้วัสดุ</b><span>ในสถานะนี้</span></div>';
    const status=receipt?'ยอดคงเหลือหลังยืนยัน':!cost?'เลือกอุปกรณ์ชิ้นอื่นเพื่อพัฒนาต่อ':reasons.length?reasons.join(' · '):this.review?'ยังไม่ใช้ทรัพยากร · ตรวจรายการก่อนยืนยัน':`คงเหลือ แร่ ${p.bank.ore-cost.ore} · ฝุ่น ${p.bank.dust-cost.dust}`;
    const actions=receipt?'<button id="forge-next-preview" data-forge="next-preview" class="primary">ดูขั้นถัดไป</button>':!cost?'<button id="forge-change-item-cap" data-forge="picker" class="primary">เลือกอุปกรณ์อื่น</button>':this.review?`<button id="forge-cancel" data-forge="cancel" class="secondary">กลับไปแก้ไข</button><button id="forge-confirm" data-forge="confirm" class="primary"${reasons.length?' disabled':''}>${icon(leveling?'up':'enhance')}ยืนยัน${operation} ${step(this.target)}</button>`:`<button id="${leveling?'forge-level':'forge-enhance'}" data-forge="review" class="primary"${reasons.length?' disabled':''}>${icon(leveling?'up':'enhance')}ตรวจรายการ${operation} ${step(this.target)}</button>`;
    const footer=`<div class="forge-footer forge-enhancement-dock"><div class="forge-cost-summary"><div id="forge-cost" class="forge-resources">${resources}</div><p class="forge-cost-status${reasons.length&&!receipt?' forge-reason':''}" role="status">${status}</p></div><div class="forge-footer-buttons">${actions}</div></div>`;
    const tools=this.review||receipt?`<small>${this.review?'ตรวจชิ้นที่เลือก':'ผลที่ยืนยันแล้ว'}</small>`:`<div class="forge-item-tools"><button id="forge-change-item" data-forge="picker" class="secondary">เปลี่ยนอุปกรณ์</button><button id="forge-lock" data-forge="lock" class="secondary" aria-label="${item.locked?'ปลดล็อก':'ล็อก'}อุปกรณ์" aria-pressed="${!!item.locked}">${icon(item.locked?'act-unlock':'act-lock')}</button></div>`;
    const itemDetails=this.itemComparison(before,next);
    const eligible=p.company.filter(id=>item.slot!=='weapon'||item.hero===id),trial=owner??(eligible.includes(this.hero)?this.hero:eligible[0]);
    const heroDetails=trial?`${owner?'':`<label class="forge-label">ทดลองผลกับ<select id="forge-preview-hero">${eligible.map(id=>`<option value="${id}"${id===trial?' selected':''}>${heroText[id]!.name}</option>`).join('')}</select></label>`}${this.heroImpact(previewProfile,trial,{...previewProfile.members[trial]!.gear,[item.slot]:before},{...previewProfile.members[trial]!.gear,[item.slot]:next},owner?'เทียบเมื่อใช้ชิ้นนี้ก่อน–หลังพัฒนา':'ทดลองผลเมื่อสวมชิ้นนี้ · ยังไม่ได้สวมใส่',false,true)}`:'';
    const summary=owner?this.heroSummary(previewProfile,owner,before,next):this.comparisonSummary('ผลต่ออุปกรณ์',Object.entries(itemStats(this.map.equipment,before)).map(([id,value])=>({name:statName[id as keyof ReturnType<typeof itemStats>],value,unit:''})),Object.entries(itemStats(this.map.equipment,next)).map(([id,value])=>({name:statName[id as keyof ReturnType<typeof itemStats>],value,unit:''})));
    const unlocks=this.map.equipment.forge.itemLevel.unlocks;
    const levelRules=leveling?`<section class="forge-level-rules"><h4>เพดานและสิ่งที่คงเดิม</h4><p>เพดานถาวร Lv${cap} · ชนะหัวหน้าทุ่ง → Lv${unlocks[0]!.cap} · หัวหน้าพงหนาม → Lv${unlocks[1]!.cap} · โกเลมหรือจบแนวรอยแยก → Lv${unlocks[2]!.cap} · บันทึกเมื่อกลับค่าย</p><p>เพิ่มทีละ 1 Lv · เซ็ต สี คุณภาพ คุณสมบัติ และ + คงเดิม · คืนทุนเพิ่มเลเวล 100% เมื่อรีไซเคิลหรือใช้เป็นวัตถุดิบหลอม</p></section>`:'';

    return `<section class="forge-workbench forge-enhancement${leveling?' forge-level':''}" data-review="${this.review}" data-receipt="${!!receipt}" data-tab="develop" data-mode="${this.mode}"><div id="forge-body" role="region" aria-label="${operation}อุปกรณ์"><div class="forge-enhancement-content">${result}${this.staleReview?'<p class="forge-reason forge-stale" role="status">ข้อมูลเปลี่ยนแล้ว · ตรวจรายการใหม่ก่อนยืนยัน</p>':''}<div class="forge-item-head" data-rarity="${item.rarity}"><div class="forge-art-tile">${gearArt(item)}<span>${step(current)}</span></div><div><b>${itemName(item)}</b><small>${slotText[item.slot]} · Lv${item.level} · ${rarityText[item.rarity]} · +${item.plus??0}</small><small>${owner?`สวมอยู่: ${heroText[owner]!.name}`:'ในคลัง · ไม่มีผู้สวม'}</small>${tools}</div></div><section class="forge-step"><h3>${receipt?`${step(receipt.from)} → ${step(receipt.to)}`:current>=cap?`${step(current)} · ${leveling?'ถึงเพดาน':'ขั้นสูงสุด'}`:`${step(current)} → ${step(this.target)}`}</h3>${leveling?`<small class="forge-level-cap">เพดานที่ปลดล็อก Lv${cap}</small>`:''}<p><span class="forge-step-caption">${receipt?'สำเร็จแล้ว · ตรวจผลก่อนทำขั้นต่อไป':cost?`สำเร็จแน่นอน · ครั้งละ 1 ${leveling?'Lv':'ขั้น'}`:leveling?'ถึงหรือสูงกว่าเพดานที่ปลดล็อกแล้ว':'ถึงเพดานของอุปกรณ์ชิ้นนี้'}</span></p></section>${!cost&&!receipt?`<section class="forge-hero-preview"><h4>${leveling?'ถึงเพดานที่ปลดล็อกแล้ว':'ขั้นสูงสุดแล้ว'}</h4><p>เลือกอุปกรณ์ชิ้นอื่นเพื่อพัฒนาต่อ</p></section>`:summary}<details class="forge-secondary-details"${this.detailsOpen?' open':''}><summary>รายละเอียดและการคืนทุน</summary>${levelRules}${itemDetails}${heroDetails}<section class="forge-investment"><h4>การคืนทุน</h4><p>คุณสมบัติรองคงเดิม · ทุนตีบวกที่คืนได้ตอนรีไซเคิล: แร่ ${paid.ore} · ฝุ่น ${paid.dust}</p><p>ทุนเพิ่มเลเวลที่คืนได้: แร่ ${levelPaid.ore} · ฝุ่น ${levelPaid.dust}</p></section></details></div>${footer}</div>${this.frameTrim()}</section>`;
  }
  private comparisonSummary(title:string,before:readonly {name:string;value:number;unit:string}[],after:readonly {name:string;value:number;unit:string}[]):string {
    const changed=before.flatMap(v=>{const n=after.find(a=>a.name===v.name);return n&&n.value!==v.value?[{v,n}]:[];});
    return `<section class="forge-hero-preview"><h4>${title}</h4>${changed.length?`<table class="comparison-table"><caption class="sr-only">ค่าก่อนและหลังพัฒนา</caption><thead><tr><th>ค่า</th><th>ก่อน</th><th>หลัง</th><th>ต่าง</th></tr></thead><tbody>${changed.map(({v,n})=>`<tr><th>${v.name}</th><td data-label="ก่อน">${v.value}${v.unit}</td><td data-label="หลัง">${n.value}${n.unit}</td><td data-label="ต่าง" class="${n.value>v.value?'gain':'loss'}">${n.value>v.value?'+':''}${n.value-v.value}${v.unit}</td></tr>`).join('')}</tbody></table>`:'<p>ค่าสถานะรวมเท่าเดิมในขั้นนี้</p>'}<small>ค่าพื้นฐานก่อนเงื่อนไขต่อสู้</small></section>`;
  }
  private heroProjection(p:Profile,id:string,gear:Gear,newGear:Gear) {
    const m=p.members[id]!,base=this.heroes.find(h=>h.id===id)!,lv=levelOf(this.map,p);
    const h=starred(base,m.stars,this.map,lv,m.talents,gear,m),n=starred(base,m.stars,this.map,lv,m.talents,newGear,m);
    const state={members:{...p.members,[id]:{...m,gear}},roster:p.party,hp:{[id]:h.maxHp},campXp:p.campXp},newState={...state,members:{...p.members,[id]:{...m,gear:newGear}},hp:{[id]:n.maxHp}};
    return {h,n,state,newState,old:characterStats(state,this.map,h,this.data),proposed:characterStats(newState,this.map,n,this.data)};
  }
  private heroSummary(p:Profile,id:string,before:Item,next:Item):string {
    const {old,proposed}=this.heroProjection(p,id,{...p.members[id]!.gear,[before.slot]:before},{...p.members[id]!.gear,[next.slot]:next});
    return this.comparisonSummary(`ผลต่อ${heroText[id]!.name}`,old,proposed);
  }
  private itemComparison(item:Item,next:Item):string {
    const before=itemStats(this.map.equipment,item),after=itemStats(this.map.equipment,next);
    return `<section class="forge-result compare-card"><h4>ค่าอุปกรณ์ก่อน–หลัง</h4><table class="comparison-table forge-stat-preview"><thead><tr><th>ค่า</th><th>ก่อน</th><th>หลัง</th><th>ต่าง</th></tr></thead><tbody>${[...new Set([...Object.keys(before),...Object.keys(after)])].map(key=>{const id=key as keyof typeof before,v=before[id]??0,n=after[id]??0;return `<tr><th>${statName[id]}</th><td data-label="ก่อน">${v}</td><td data-label="หลัง">${n}</td><td data-label="ต่าง" class="${n>v?'gain':n<v?'loss':''}">${n>v?'+':''}${n-v||'–'}</td></tr>`;}).join('')}</tbody></table></section>`;
  }
  private statPreview(p:Profile,item:Item,next:Item,owner?:string,compact=false):string {
    const before=itemStats(this.map.equipment,item),after=itemStats(this.map.equipment,next);
    const diff=(k:keyof typeof before)=>(after[k]??0)-(before[k]??0);
    let html=`<section class="forge-result compare-card"><h4>ผลลัพธ์</h4><table class="comparison-table forge-stat-preview"><caption>ค่าอุปกรณ์ก่อน–หลัง</caption><thead><tr><th>ค่า</th><th>ปัจจุบัน</th><th>หลังพัฒนา</th><th>ต่าง</th></tr></thead><tbody>${[...new Set([...Object.keys(before),...Object.keys(after)])].map(k=>{const stat=k as keyof typeof before,d=diff(stat);return `<tr${d?'':' class="same"'}><th>${statName[stat]}</th><td>${before[stat]??0}</td><td>${after[stat]??0}</td><td class="${d>0?'gain':d<0?'loss':''}">${d>0?'▲ '+d:d<0?'▼ '+-d:'–'}</td></tr>`;}).join('')}</tbody></table></section>`;
    const ids=p.company.filter(id=>item.slot!=='weapon'||item.hero===id),id=owner??(ids.includes(this.hero)?this.hero:ids[0]);if(!id)return html;
    if(!owner)html+=`<label class="forge-label">ทดลองผลกับ<select id="forge-preview-hero">${ids.map(c=>`<option value="${c}"${c===id?' selected':''}>${heroText[c]!.name}</option>`).join('')}</select></label>`;
    const impact=this.heroImpact(p,id,{...p.members[id]!.gear,[item.slot]:item},{...p.members[id]!.gear,[item.slot]:next},'เทียบเมื่อใช้ชิ้นนี้ก่อน–หลังพัฒนา',compact);
    return compact?impact+`<details class="forge-item-stats"><summary>ค่าอุปกรณ์ก่อน–หลัง</summary>${html}</details>`:html+impact;
  }
  private heroImpact(p:Profile,id:string,gear:Gear,newGear:Gear,caption:string,compact=false,expanded=false):string {
    const {h,n,state,newState,old,proposed}=this.heroProjection(p,id,gear,newGear);
    const summary=compact?`<section class="forge-hero-preview"><h4>ผลต่อ${heroText[id]!.name}</h4><table class="comparison-table"><caption class="sr-only">ค่าสถานะก่อนและหลังตีบวก</caption><thead><tr><th>ค่า</th><th>ก่อน</th><th>หลัง</th><th>ต่าง</th></tr></thead><tbody>${old.filter((v,i)=>v.value!==proposed[i]!.value).map(v=>{const next=proposed.find(n=>n.id===v.id)!;return `<tr><th>${v.name}</th><td>${v.value}${v.unit}</td><td>${next.value}${v.unit}</td><td class="${next.value>v.value?'gain':'loss'}">${next.value>v.value?'▲ +':'▼ '}${next.value-v.value}${v.unit}</td></tr>`;}).join('')||'<tr><td colspan="4">ค่าสถานะรวมเท่าเดิมในขั้นนี้</td></tr>'}</tbody></table><small>ค่าพื้นฐานก่อนเงื่อนไขต่อสู้ · เทียบเมื่อใช้ชิ้นนี้</small></section>`:'';
    const effects=this.tab==='craft'?`<h4>เซ็ตและพลังพิเศษก่อน–หลัง</h4><p class="camp-note">ผลตามเงื่อนไขไม่รวมในพลังพื้นฐานด้านบน</p><div class="comparison-effects"><section><h4>สวมอยู่</h4><ul>${equipmentEffects(state,this.map,h)}</ul></section><section><h4>ถ้าใส่อาวุธนี้</h4><ul>${equipmentEffects(newState,this.map,n)}</ul></section></div>`:'';
    return summary+`${expanded?'<section class="forge-impact"><h4>ผลต่อ'+heroText[id]!.name+'และสกิล</h4>':`<details class="forge-impact"${this.impactOpen?' open':''}><summary>ผลต่อ${heroText[id]!.name}และสกิล</summary>`}<p class="camp-note">${caption} · ค่ายแสดงเลือดพร้อมออกเดินทาง · พลังพื้นฐานก่อนเงื่อนไขต่อสู้</p><table class="comparison-table"><thead><tr><th>ค่า</th><th>ก่อน</th><th>หลัง</th></tr></thead><tbody>${old.map((v,i)=>`<tr><th>${v.name}</th><td>${v.value}${v.unit}</td><td>${proposed[i]!.value}${v.unit}</td></tr>`).join('')}</tbody></table><ul class="forge-skills">${h.actions.map(a=>{const v=characterSkillMetric(a,h,this.data),w=characterSkillMetric(a,n,this.data);return `<li>${this.data.skills[a].name}: ${v.value===undefined?'ผลพิเศษ · ค่าพลังคงเดิม':`${v.label} ${v.value} → ${w.value}`}${v.secondary?` · ${v.secondary.label} ${v.secondary.value} → ${w.secondary!.value}`:''}</li>`;}).join('')}</ul>${effects}${expanded?'</section>':'</details>'}`;
  }
  // Describe candidates and committed results only; never run fuse/reroll to forecast RNG.
  private randomDevelopmentPage(p:Profile,item:Item,owner?:string):string {
    const fusing=this.mode==='fuse',operation=fusing?'เลื่อนความหายาก':'สุ่มคุณสมบัติ';
    const receipt=this.success?.uid===item.uid&&this.success.mode===this.mode?this.success:undefined;
    const before=receipt?findItem(receipt.before,item.uid)!.item:item,source=receipt?.before??p;
    if(!receipt&&fusing)this.donors??=fuseMaterials(p,this.map,item.uid).map(i=>i.uid);
    if(this.index>=item.affixes.length)this.index=0;
    const index=receipt?.index??this.index,ids=receipt?.donors??this.donors??[],mats=source.items.filter(i=>ids.includes(i.uid));
    const refund=fusing?(receipt?{ore:p.bank.ore-source.bank.ore,dust:p.bank.dust-source.bank.dust}:fusionRefund(source,this.map,ids)):{ore:0,dust:0};
    const fee=fusing?0:receipt?source.bank.seal-p.bank.seal:this.map.equipment.forge.rerollSeals;
    const reason=fusing?fuseReason(p,this.map,item.uid,ids):rerollReason(p,this.map,item.uid,index);
    const blocker=reason==='maxed'?(fusing?'ความหายากสูงสุดแล้ว':'ไม่มีคุณสมบัติใหม่ใน pool'):reason==='full'?'ยอดคืนเกินเพดานคลัง':reason==='seal'?'ตราสัญญาไม่พอ':reason?(fusing?'เลือกวัตถุดิบที่ใช้ได้ให้ครบ':'ไม่มีช่องคุณสมบัติที่สุ่มได้'):'';
    const pool=affixPool(this.map.equipment,before.slot,before.hero).filter(a=>!before.affixes.includes(a));
    const added=fusing?Math.max(0,Math.min(pool.length,(this.map.equipment.affixCount[before.rarity+1]??before.affixes.length)-before.affixes.length)):1;
    const legendary=fusing&&before.rarity+1===RARITIES-1;
    const step=fusing?`${rarityText[before.rarity]} → ${rarityText[receipt?item.rarity:before.rarity+1]??'ขั้นสูงสุด'}`:`ช่อง ${index+1} · ${before.affixes[index]?statName[before.affixes[index]!]:'ไม่มีคุณสมบัติรอง'}`;
    const result=receipt?`<p id="forge-success" class="forge-success" role="status" tabindex="-1">${icon('check')}${operation}สำเร็จ<small>บันทึกผลแล้ว · ชิ้นหลัก #${item.uid} คงอยู่</small></p><section class="forge-hero-preview forge-actual-result"><h4>ผลจริงก่อน → หลัง</h4><p>${step}</p><ul>${item.affixes.map((a,i)=>`<li>ช่อง ${i+1}: ${before.affixes[i]?`${statName[before.affixes[i]!]} ${before.q?.affixes[i]??100}%`:'ไม่มี'} → ${statName[a]} ${item.q?.affixes[i]??100}%</li>`).join('')}</ul>${item.special?`<p>พลังตำนาน: ${specialText[item.special]}</p>`:''}${this.itemComparison(before,item)}</section>`:'';
    const tools=this.review||receipt?'':`<div class="forge-item-tools"><button id="forge-change-item" data-forge="picker" class="secondary">เปลี่ยนอุปกรณ์</button><button id="forge-lock" data-forge="lock" class="secondary" aria-pressed="${!!item.locked}">${icon(item.locked?'act-unlock':'act-lock')}${item.locked?'ปลดล็อก':'ล็อก'}</button></div>`;
    const main=`<div class="forge-item-head" data-rarity="${item.rarity}"><div class="forge-art-tile">${gearArt(item)}<span>Lv${item.level}</span></div><div><small class="forge-main-label">ชิ้นหลัก · คงอยู่</small><b>#${item.uid} ${itemName(item)}</b><small>${slotText[item.slot]} · Lv${item.level} · ${rarityText[item.rarity]} · +${item.plus??0}</small><small>${owner?`สวมอยู่: ${heroText[owner]!.name}`:'ในคลัง · ไม่มีผู้สวม'} · ${item.locked?'ล็อกแล้ว':'ไม่ล็อก'}</small>${tools}</div></div>`;
    const candidates=p.items.filter(i=>!i.boss&&i.uid!==item.uid&&i.slot===item.slot&&i.rarity===item.rarity);
    const materials=fusing?`<section class="forge-materials"><h4>${receipt?'ใช้วัตถุดิบแล้ว':this.review?'ชิ้นที่จะหายทั้งชิ้น':'เลือกวัตถุดิบ'} ${mats.length}/${this.map.equipment.forge.fuseCount-1}</h4><p class="forge-mats">${receipt?'หายจากคลังแล้ว':'จะทำลาย'}: ${mats.map(i=>'#'+i.uid).join(' · ')||'ยังไม่เลือกวัตถุดิบ'}</p>${this.review||receipt?`<ul class="forge-donor-cards">${mats.map(i=>`<li>${this.donorCard(i)}</li>`).join('')}</ul>`:`<p class="camp-note">ช่องและสีเดียวกัน · อยู่ในคลัง · ของล็อกใช้ไม่ได้</p><button id="forge-recommend" data-forge="recommend" class="secondary">เลือกวัตถุดิบแนะนำ · ไม่ลงทุน</button><ul class="forge-donor-cards forge-donors">${candidates.map(i=>`<li><button id="forge-donor-${i.uid}" data-forge="donor" data-uid="${i.uid}" aria-pressed="${ids.includes(i.uid)}"${i.locked||(!ids.includes(i.uid)&&ids.length>=this.map.equipment.forge.fuseCount-1)?' disabled':''}>${this.donorCard(i,ids.includes(i.uid))}</button></li>`).join('')}</ul>${candidates.length?'':'<p class="forge-reason">ไม่มีวัตถุดิบที่ตรงช่องและสีในคลัง</p>'}`}</section>`:'';
    const affixChoice=!fusing&&before.affixes.length?`<section class="forge-affix-choice"><h4>${this.review||receipt?'ช่องที่เลือก':'เลือกช่องที่จะสุ่ม'}</h4>${this.review||receipt?`<p>ช่อง ${index+1}: ${statName[before.affixes[index]!]} · ${before.q?.affixes[index]??100}%</p>`:`<label class="forge-label" for="forge-affix">คุณสมบัติที่จะเปลี่ยน</label><select id="forge-affix">${item.affixes.map((a,i)=>`<option value="${i}"${i===index?' selected':''}>ช่อง ${i+1}: ${statName[a]} · ${item.q?.affixes[i]??100}%</option>`).join('')}</select><ul>${item.affixes.map((a,i)=>`<li>ช่อง ${i+1}: ${statName[a]} ${item.q?.affixes[i]??100}% · ${i===index?'จะสุ่มใหม่':'คงเดิม'}</li>`).join('')}</ul>`}</section>`:'';
    const randomInfo=receipt?'':`<section class="forge-random-info"><h4>ผลสุ่มแสดงหลังยืนยัน</h4><p>${fusing?`เพิ่มคุณสมบัติใหม่ ${added} ช่อง`:'สุ่มชนิดใหม่ 1 ช่อง · ช่องอื่นคงเดิม'}${added&&pool.length?` · คุณภาพ ${this.map.equipment.quality.join('–')}%`:''}</p>${added&&pool.length?`<details><summary>ดูคุณสมบัติที่มีโอกาสออก</summary><p>${pool.map(a=>statName[a]).join(' · ')}</p></details>`:''}${legendary?`<details><summary>พลังตำนานที่มีโอกาสออก</summary><ul>${GEAR_SPECIALS.map(s=>`<li>${specialText[s]}</li>`).join('')}</ul></details>`:''}<p class="camp-note">${fusing?'Lv, +, อาชีพ, เซ็ต, คุณภาพและคุณสมบัติเดิม รวมทุนชิ้นหลักคงเดิม':'ผลใหม่แทนช่องที่เลือกทันที · ไม่มีเก็บผลเดิมหรือย้อนคืน'}</p></section>`;
    const paid=enhancementInvestment(this.map,item),levelPaid=item.levelInvestment??{ore:0,dust:0};
    const details=`<details class="forge-secondary-details"${this.detailsOpen?' open':''}><summary>รายละเอียดและการคืนทุน</summary><p>ทุนชิ้นหลักคงเดิม · ตีบวก แร่ ${paid.ore} · ฝุ่น ${paid.dust} · เพิ่ม Lv แร่ ${levelPaid.ore} · ฝุ่น ${levelPaid.dust}</p><p>${fusing?'ไม่มีค่าบริการ · คืนเฉพาะทุนตีบวกและเพิ่ม Lv ของ donor จากระบบจริง ไม่คืนมูลค่าตัวอุปกรณ์':'ค่าบริการสุ่มไม่คืนตอนรีไซเคิล · ไม่มีทุนคืนจากการสุ่ม'}</p><ul>${itemLines(this.map.equipment,item).map(s=>`<li>${s}</li>`).join('')}</ul></details>`;
    const resources=([['แร่',source.bank.ore,0,refund.ore,p.bank.ore],['ฝุ่น',source.bank.dust,0,refund.dust,p.bank.dust],['ตรา',source.bank.seal,fee,0,p.bank.seal]] as const).filter((_,i)=>fusing?i<2:i===2);
    const ledger=`<table id="forge-cost" class="forge-ledger"><caption>${receipt?'ยอดที่บันทึกแล้ว':'ทรัพยากรก่อนยืนยัน'}</caption><thead><tr><th>หน่วย</th><th>มี</th><th>ใช้</th><th>คืนทุน</th><th>หลังทำ</th></tr></thead><tbody>${resources.map(([label,bank,cost,back,actual])=>`<tr><th>${label}</th><td>${bank}</td><td>${cost}</td><td>${back}</td><td>${receipt?actual:bank-cost+back}</td></tr>`).join('')}</tbody></table>`;
    const actions=receipt?'<button id="forge-next-preview" data-forge="next-preview" class="primary">ดูขั้นถัดไป</button>':this.review?`<button id="forge-cancel" data-forge="cancel" class="secondary">กลับไปแก้ไข</button><button id="forge-confirm" data-forge="confirm" class="primary"${blocker?' disabled':''}>ยืนยัน${operation}${fusing?` · ใช้ ${mats.length} ชิ้น`:''}</button>`:`<button id="${this.reviewFocus}" data-forge="review" class="primary"${blocker?' disabled':''}>${icon(fusing?'fuse':'reroll')}ตรวจรายการ${operation}</button>`;
    const footer=`<div class="forge-footer forge-enhancement-dock"><div class="forge-cost-summary">${ledger}<p class="forge-cost-status${blocker&&!receipt?' forge-reason':''}" role="status">${receipt?(fusing?`คืนทุนพัฒนา แร่ ${refund.ore} · ฝุ่น ${refund.dust}`:`ใช้ตราสัญญา ${fee} · คงเหลือ ${p.bank.seal}`):blocker||(this.review?'ยังไม่ใช้วัสดุ · ตรวจรายการก่อนยืนยัน':fusing?'ชิ้นหลักคงอยู่ · วัตถุดิบที่เลือกจะหายไป':'ยังไม่สุ่ม · ยังไม่ใช้ตราสัญญา')}</p></div><div class="forge-footer-buttons">${actions}</div></div>`;
    return `<section class="forge-workbench forge-enhancement forge-random-development" data-review="${this.review}" data-receipt="${!!receipt}" data-tab="develop" data-mode="${this.mode}"><div id="forge-body" role="region" aria-label="${operation}"><div class="forge-enhancement-content">${result}${this.staleReview?'<p class="forge-reason forge-stale" role="status">ข้อมูลเปลี่ยนแล้ว · ตรวจรายการใหม่ก่อนยืนยัน</p>':''}${main}<section class="forge-step"><h3>${step}</h3><p><span class="forge-step-caption">${receipt?'สำเร็จแล้ว · ตรวจผลก่อนทำขั้นต่อไป':fusing?'เลื่อนความหายากแน่นอน · ชิ้นหลักคงอยู่':'เปลี่ยนเฉพาะช่องที่เลือก'}</span></p></section>${affixChoice}${materials}${randomInfo}${details}</div>${footer}</div>${this.frameTrim()}</section>`;
  }
  private donorCard(item:Item,selected?:boolean):string {
    const paid=enhancementInvestment(this.map,item),level=item.levelInvestment??{ore:0,dust:0};
    return `${gearArt(item)}<span><b>${selected===undefined?'':selected?'✓ ':''}#${item.uid} ${itemName(item)}</b><small>Lv${item.level} · +${item.plus??0} · ${rarityText[item.rarity]} · ในคลัง · ${item.locked?'ล็อกแล้ว':'ไม่ล็อก'}</small><small>ทุนตีบวก: แร่ ${paid.ore} · ฝุ่น ${paid.dust}</small><small>ทุน Lv: แร่ ${level.ore} · ฝุ่น ${level.dust}</small>${item.transferSlot!==undefined?`<small>ผูกถ่ายโอนช่อง ${item.transferSlot+1}</small>`:''}</span>`;
  }
  private transfer(p:Profile,item:Item,owner?:string):string {
    if(item.transferSlot!==undefined)this.index=item.transferSlot;else if(this.index>=item.affixes.length)this.index=0;
    const donor=p.items.find(i=>i.uid===this.donorUid),next=donor?transferCandidate(this.map,item,this.index,donor,this.sourceIndex):undefined,reason=transferReason(p,this.map,item.uid,this.index,this.donorUid,this.sourceIndex),fee=this.map.equipment.forge.transfer;
    const refund=donor?fusionRefund(p,this.map,[donor.uid]):{ore:0,dust:0},pool=p.items.filter(i=>!i.boss&&i.uid!==item.uid&&i.slot===item.slot&&(item.slot!=='weapon'||i.hero===item.hero)&&i.affixes.length);
    const reasons:Record<string,string>={materials:'เลือกวัตถุดิบและคุณสมบัติที่ใช้ได้ · ห้ามซ้ำช่องอื่นหรือค่าเดิม',ore:'แร่ดาวไม่พอจ่ายล่วงหน้า',dust:'ฝุ่นดาวไม่พอจ่ายล่วงหน้า',seal:'ตราสัญญาไม่พอ',full:'ยอดคืนเกินเพดานคลัง'};
    return `<h3>ถ่ายโอนคุณสมบัติรองหนึ่งช่อง</h3><p class="camp-note">${item.transferSlot===undefined?'ครั้งแรกจะผูกช่องที่เลือกถาวร · ครั้งต่อไปเปลี่ยนได้เฉพาะช่องนี้':`ผูกช่อง ${item.transferSlot+1} แล้ว · ช่องอื่นยังถ่ายโอนไม่ได้`} · สำเร็จแน่นอน · คัดลอกชนิดและคุณภาพ % ไม่คัดลอก Lv หรือค่าตัวเลขจากของต้นทาง · ไม่เปลี่ยนเซ็ต สี + และพลังตำนาน</p><div class="forge-transfer-selectors"><label class="forge-label">ช่องที่จะเปลี่ยน<select id="forge-affix">${item.affixes.map((a,i)=>`<option value="${i}"${i===this.index?' selected':''}${item.transferSlot!==undefined&&item.transferSlot!==i?' disabled':''}>ช่อง ${i+1} · ${statName[a]} · ${item.q?.affixes[i]??100}%</option>`).join('')}</select></label><label class="forge-label">วัตถุดิบในคลัง · ช่องเดียวกัน อาวุธต้องอาชีพเดียวกัน<select id="forge-transfer-donor"><option value="0">เลือกชิ้นที่จะใช้หมด</option>${pool.map(i=>`<option value="${i.uid}"${i.uid===this.donorUid?' selected':''}${i.locked?' disabled':''}>#${i.uid} ${itemName(i)} Lv${i.level} +${i.plus??0}${i.locked?' · ล็อกแล้ว':''}</option>`).join('')}</select></label>${donor?`<label class="forge-label">คุณสมบัติจากวัตถุดิบ<select id="forge-transfer-source">${donor.affixes.map((a,i)=>`<option value="${i}"${i===this.sourceIndex?' selected':''}>${statName[a]} · ${donor.q?.affixes[i]??100}%</option>`).join('')}</select></label>`:''}</div>${next?`<p class="forge-transfer-change">ช่อง ${this.index+1}: ${statName[item.affixes[this.index]!]} ${item.q?.affixes[this.index]??100}% → ${statName[next.affixes[this.index]!]} ${next.q!.affixes[this.index]}%</p>`:''}${donor?`<p class="forge-transfer-material">จะทำลาย #${donor.uid} ${itemName(donor)} Lv${donor.level} +${donor.plus??0} · ใช้ ${statName[donor.affixes[this.sourceIndex]!]} ${donor.q?.affixes[this.sourceIndex]??100}%</p>`:''}${next?this.statPreview(p,item,next,owner):''}<p class="camp-note">ชิ้นวัตถุดิบหายไปทั้งชิ้น · คืนเฉพาะทุนตีบวก/เพิ่ม Lv 100% ไม่คืนมูลค่าตัวอุปกรณ์ · ค่าบริการถ่ายโอนไม่คืนตอนรีไซเคิล · การสุ่มปรับค่าเดิมยังใช้ได้และไม่ย้ายช่องที่ผูก</p>${this.footer('forge-transfer','ถ่ายโอนและใช้วัตถุดิบ',reasons[reason]??'',`จ่ายล่วงหน้า แร่ ${fee.ore} · ฝุ่น ${fee.dust} · ตรา ${fee.seal} · คืนทุน แร่ ${refund.ore} · ฝุ่น ${refund.dust}`,`หลังทำ แร่ ${p.bank.ore-fee.ore+refund.ore} · ฝุ่น ${p.bank.dust-fee.dust+refund.dust} · ตรา ${p.bank.seal-fee.seal}`) }`;
  }
  private recycle(p:Profile,item:Item,owner?:string):string {
    const base=this.map.equipment.salvage[item.rarity]!,paid=enhancementInvestment(this.map,item),total=salvageValue(this.map,item),reason=salvageReason(p,this.map,[item.uid]);
    return `<h3>รีไซเคิลคืนค่าพัฒนา</h3><p class="forge-reason">${itemName(item)} Lv${item.level} +${item.plus??0} จะถูกทำลาย</p><dl class="forge-refund"><dt>วัตถุดิบจากตัวอุปกรณ์</dt><dd>แร่ ${base.ore} · ฝุ่น ${base.dust}</dd><dt>คืนทุนตีบวก 100%</dt><dd>แร่ ${paid.ore} · ฝุ่น ${paid.dust}</dd><dt>คืนทุนเพิ่ม Lv 100%</dt><dd>แร่ ${item.levelInvestment?.ore??0} · ฝุ่น ${item.levelInvestment?.dust??0}</dd><dt>รวมที่จะได้รับ</dt><dd>แร่ ${total.ore} · ฝุ่น ${total.dust}</dd></dl><p class="camp-note">${!item.investment&&(item.plus??0)>0?'ของเดิม: เครดิตจากระดับ + ที่ยังอยู่ · ':''}ไม่คืนอุปกรณ์ที่เคยใช้หลอมและค่าใช้จ่ายสุ่มคุณสมบัติ</p>${this.footer('forge-recycle','รีไซเคิล',item.locked?'ปลดล็อกอุปกรณ์ก่อนรีไซเคิล':owner?'ถอดอุปกรณ์ในหน้าตัวละครก่อนรีไซเคิล':reason==='full'?'ใช้ทรัพยากรในคลังก่อน ยอดคืนเกินเพดานที่เก็บได้':reason?'ไม่พบอุปกรณ์':'',`ได้รับ แร่ ${total.ore} · ฝุ่น ${total.dust}`,`หลังรับ แร่ ${p.bank.ore+total.ore} · ฝุ่น ${p.bank.dust+total.dust}`)}`;
  }
  private smelt(p:Profile):string {
    // One fixed quantity per review, chosen by the button; the displayed total is the committed amount.
    const amount=this.target===5?5:1,reason=smeltReason(p,this.map,amount),cost=amount*this.map.equipment.forge.smeltOre;
    return `<h3>แปรรูปแร่เป็นฝุ่นดาว</h3><p class="camp-note">แร่ ${this.map.equipment.forge.smeltOre} ต่อฝุ่น 1 · รอบนี้ทำได้อีก ${smeltLeft(p,this.map)}</p><label class="forge-label">จำนวนฝุ่น<select id="forge-target"><option value="1"${amount===1?' selected':''}>1</option><option value="5"${amount===5?' selected':''}>5</option></select></label>${this.footer('forge-smelt','หลอมแร่',reason==='ore'?'แร่ดาวไม่พอ':reason?'เกินจำนวนที่หลอมได้ในรอบนี้':'',`แร่ ${cost} → ฝุ่น ${amount}`,`คงเหลือแร่ ${p.bank.ore-cost} · ฝุ่น ${p.bank.dust+amount}`,`data-amount="${amount}"`)}`;
  }
}
