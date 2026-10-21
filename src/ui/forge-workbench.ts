import { icon } from './icons';
import { equipmentEffects } from './character-view';
import { salvageReason } from '../core/world/profile';
import type { EncounterDefinition, HeroDefinition } from '../core/battle/types';
import { enhancementInvestment, itemStats, salvageValue, affixPool } from '../core/world/equipment';
import { transferCandidate, transferReason, weaponBlueprint, weaponCraftCost, weaponCraftReason, enhanceTo, enhancementCostTo, findItem, fuseMaterials, fuseReason, fusionRefund, itemLevelCap, itemLevelCost, raiseItemLevel, rerollReason, smeltLeft, smeltReason } from '../core/world/forge';
import type { LobbyFeature, Gear, Item, MapDefinition, Profile } from '../core/world/types';
import { starred } from '../core/world/world';
import { filteredEquipment, gearFilters, newGearFilters, changeGearFilter } from './gear-inventory';
import { characterStats, characterSkillMetric } from './character-metrics';
import { gearArt } from './equip-art';
import { heroText, itemLines, itemName, rarityText, slotText, statName } from './th';

interface ForgeHost {
  transfer(uid:number,index:number,donor:number,sourceIndex:number):void; craft(hero:string,level:number):void; quest?():string; enhance(uid:number,target:number):void; fuse(uid:number,donors:number[]):void; level(uid:number,target:number):void; reroll(uid:number,index:number):void;
  salvage(uids:number[]):void; lock(uid:number):void; smelt(dust:number):void;
}
type Tab='develop'|'craft'|'recycle'|'smelt';
type Mode='enhance'|'level'|'fuse'|'reroll'|'transfer';
const tabs:Record<Tab,string>={develop:'พัฒนา',craft:'สร้างอาวุธ',recycle:'รีไซเคิล',smelt:'หลอมแร่'};
const modes:Record<Mode,string>={enhance:'ตีบวก',level:'เพิ่ม Lv',fuse:'หลอมสี',reroll:'ปรับค่า',transfer:'ถ่ายโอน'};
// Presentation state only. Every destructive action needs a review against the same profile object.
// Random crafts expose possible outcomes, never invoke the RNG to produce a readonly forecast.
export class ForgeWorkbench {
  private tab:Tab='develop'; private mode:Mode='enhance'; private uid:number|undefined;
  private donors:number[]|undefined; private craftHero='';private craftLevel=1;private donorUid=0;private sourceIndex=0;
  private picker=true; private target=0; private index=0; private owner='all'; private hero='';
  private impactOpen=false; private filtersOpen=false;
  private filters=newGearFilters(); private source:Profile|undefined; private review=false;
  constructor(private readonly map:MapDefinition,private readonly heroes:readonly HeroDefinition[],private readonly data:EncounterDefinition,private readonly host:ForgeHost){}
  remember(root:HTMLElement):void {const impact=root.querySelector<HTMLDetailsElement>('.forge-impact'),filters=root.querySelector<HTMLDetailsElement>('.gear-extra-filters');if(impact)this.impactOpen=impact.open;if(filters)this.filtersOpen=filters.open;}
  open(uid?:number):void {this.donors=undefined;this.donorUid=0;this.uid=uid;this.picker=uid===undefined;this.tab='develop';this.mode='enhance';this.target=0;this.review=false;}
  cancelReview():void{this.review=false;}
  get selected():number|undefined{return this.uid;}
  click(b:HTMLButtonElement,p:Profile):string|undefined {
    const action=b.dataset.forge;if(!action||b.disabled)return;
    if(action!=='confirm')this.review=false;
    if(action==='tab'&&Object.hasOwn(tabs,b.dataset.tab!)){this.target=0;this.tab=b.dataset.tab as Tab;this.picker=this.picker||this.uid===undefined;return 'forge-tab-'+this.tab;}
    if(action==='pick'){this.donors=undefined;this.uid=Number(b.dataset.uid);this.impactOpen=false;this.picker=false;this.target=0;this.index=0;this.hero=findItem(p,this.uid)?.owner??'';return 'forge-change-item';}
    if(action==='picker'){this.picker=true;return 'forge-owner-filter';}
    if(action==='resume'&&this.uid&&findItem(p,this.uid)){this.picker=false;return 'forge-change-item';}
    if(action==='mode'&&Object.hasOwn(modes,b.dataset.mode!)){this.mode=b.dataset.mode as Mode;this.target=0;return 'forge-mode-'+this.mode;}
    if(action==='donor'){const id=Number(b.dataset.uid);this.donors??=[];this.donors=this.donors.includes(id)?this.donors.filter(i=>i!==id):[...this.donors,id];return 'forge-donor-'+id;}
    if(action==='recommend'){this.donors=fuseMaterials(p,this.map,this.uid!).map(i=>i.uid);return 'forge-recommend';}
    if(action==='lock'&&this.uid){this.host.lock(this.uid);return 'forge-lock';}
    if(action==='reset'){this.filters=newGearFilters();this.owner='all';return 'forge-gear-filter-set';}
    if(action==='cancel'){return this.tab==='craft'?'forge-craft-hero':'forge-change-item';}
    if(action==='review'){this.review=true;return 'forge-confirm';}
    if(action==='confirm'&&this.review&&this.source===p){
      this.review=false;
      if(this.tab==='craft'){if(weaponCraftReason(p,this.map,this.craftHero,this.craftLevel))return 'forge-craft-hero';const uid=p.nextItem;this.host.craft(this.craftHero,this.craftLevel);this.uid=uid;this.tab='develop';this.mode='enhance';this.picker=false;this.target=0;}
      else if(this.tab==='smelt')this.host.smelt(this.target===5?5:1);
      else if(this.uid&&findItem(p,this.uid)){
        if(this.tab==='recycle')this.host.salvage([this.uid]);
        else if(this.mode==='enhance')this.host.enhance(this.uid,this.target);
        else if(this.mode==='level')this.host.level(this.uid,this.target);
        else if(this.mode==='fuse')this.host.fuse(this.uid,this.donors??[]);
        else if(this.mode==='transfer')this.host.transfer(this.uid,this.index,this.donorUid,this.sourceIndex);
        else this.host.reroll(this.uid,this.index);
      }
      return this.tab==='recycle'?'forge-owner-filter':'forge-change-item';
    }
    return 'forge-change-item';
  }
  change(c:HTMLSelectElement|HTMLInputElement):string {
    this.review=false;
    if(c.dataset.gearFilter)changeGearFilter(this.filters,c);
    else if(c.id==='forge-owner-filter')this.owner=c.value;
    else if(c.id==='forge-target')this.target=Number(c.value);
    else if(c.id==='forge-affix')this.index=Number(c.value);
    else if(c.id==='forge-transfer-donor'){this.donorUid=Number(c.value);this.sourceIndex=0;}
    else if(c.id==='forge-transfer-source')this.sourceIndex=Number(c.value);
    else if(c.id==='forge-preview-hero')this.hero=c.value;
    else if(c.id==='forge-craft-hero')this.craftHero=c.value;
    else if(c.id==='forge-craft-level')this.craftLevel=Number(c.value);
    return c.id;
  }
  // Lobby systems by chapter (A3): `open` says which forge modes and tabs are open yet.
  render(p:Profile,open:(f:LobbyFeature)=>boolean=()=>true):string {
    const modeFeature:Partial<Record<Mode,LobbyFeature>>={level:'level',fuse:'fuse',reroll:'fuse',transfer:'transfer'};
    const modeOpen=(m:Mode)=>{const f=modeFeature[m];return !f||open(f);};
    if(!modeOpen(this.mode))this.mode='enhance';if(this.tab==='craft'&&!open('craft'))this.tab='develop';
    if(this.source!==p){this.review=false;this.donors=undefined;this.donorUid=0;this.source=p;}
    if(this.uid&&!findItem(p,this.uid)){this.uid=undefined;this.picker=true;}
    const header=`<div class="forge-tabs" role="tablist" aria-label="โรงตีเหล็ก">${Object.entries(tabs).map(([id,text])=>`<button id="forge-tab-${id}" data-forge="tab" data-tab="${id}" role="tab"${id==='craft'&&!open('craft')?' disabled':''} aria-selected="${id===this.tab}" aria-controls="forge-body" tabindex="${id===this.tab?0:-1}">${text}</button>`).join('')}</div>`;
    let body:string;
    if(this.tab==='craft')body=this.crafting(p);
    else if(this.tab==='smelt')body=this.smelt(p);
    else if(this.picker||!this.uid)body=this.items(p);
    else {
      const {item,owner}=findItem(p,this.uid)!;
      body=`<div class="forge-item-head">${gearArt(item)}<div><b>${itemName(item)}</b><small>${slotText[item.slot]} · Lv${item.level} · ${rarityText[item.rarity]} · +${item.plus??0}</small><small>${owner?`สวมอยู่: ${heroText[owner]!.name}`:'ในคลัง'}${item.locked?' · ล็อกแล้ว':''}</small></div></div><div class="forge-item-tools"><button id="forge-change-item" data-forge="picker" class="secondary">เปลี่ยนอุปกรณ์</button><button id="forge-lock" data-forge="lock" class="secondary" aria-pressed="${!!item.locked}">${icon(item.locked?'act-unlock':'act-lock')}${item.locked?'ปลดล็อก':'ล็อกอุปกรณ์'}</button></div>`;
      body+=this.tab==='recycle'?this.recycle(p,item,owner):`<div class="forge-modes" role="group" aria-label="วิธีพัฒนา">${Object.entries(modes).map(([id,text])=>`<button id="forge-mode-${id}" data-forge="mode" data-mode="${id}" aria-pressed="${id===this.mode}" class="secondary"${modeOpen(id as Mode)?'':' disabled'}>${modeOpen(id as Mode)?'':'🔒 '}${text}</button>`).join('')}</div><div class="forge-detail" data-rarity="${item.rarity}">${this.mode==='enhance'?this.enhancement(p,item,owner):this.mode==='level'?this.level(p,item,owner):this.mode==='fuse'?this.fusion(p,item):this.mode==='transfer'?this.transfer(p,item,owner):this.reroll(p,item)}</div>`;
    }
    return `<section class="forge-workbench" data-review="${this.review}" data-tab="${this.tab}" data-mode="${this.mode}">${header}<div id="forge-body" role="tabpanel" aria-labelledby="forge-tab-${this.tab}">${body}</div></section>`;
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
    return `${this.uid&&findItem(p,this.uid)?'<button id="forge-resume" data-forge="resume" class="secondary">← กลับชิ้นที่เลือก</button>':''}${this.tab==='develop'&&this.host.quest?`<details class="forge-quests"><summary>งานของช่างตีเหล็ก</summary>${this.host.quest()}</details>`:''}<h3>${this.tab==='recycle'?'เลือกชิ้นที่จะรีไซเคิล':'เลือกอุปกรณ์ที่จะพัฒนา'}</h3><p class="camp-note">${this.tab==='recycle'?'ชิ้นที่เลือกจะหายไป รวมพลังบอสถ้ามี · ตรวจยอดคืนก่อนยืนยัน · ของสวมอยู่ต้องถอดก่อน':'แตะชิ้นที่ต้องการ แล้วเลือกวิธีพัฒนา · ยังไม่เสียทรัพยากร · ของบอสใช้เป็นวัตถุดิบไม่ได้'}</p><label class="forge-label">ตำแหน่งอุปกรณ์<select id="forge-owner-filter"><option value="all"${this.owner==='all'?' selected':''}>ทั้งหมด</option><option value="bag"${this.owner==='bag'?' selected':''}>ในคลัง</option>${p.company.map(id=>`<option value="${id}"${this.owner===id?' selected':''}>สวมอยู่: ${heroText[id]!.name}</option>`).join('')}</select></label>${gearFilters(this.filters,'forge-').replace('<details class="gear-extra-filters">',`<details class="gear-extra-filters"${this.filtersOpen?' open':''}>`)}<p class="camp-note">${entries.length}/${all.length} ชิ้น · รูปกุญแจระบุของที่ล็อก</p><ul class="forge-list">${entries.map(e=>`<li data-rarity="${e.item.rarity}"><button id="forge-item-${e.item.uid}" data-forge="pick" data-uid="${e.item.uid}" class="forge-pick" aria-pressed="${this.uid===e.item.uid}">${gearArt(e.item)}<b>${itemName(e.item)} Lv${e.item.level} +${e.item.plus??0}${e.item.locked?' · 🔒':''}</b><small>${e.label} · ${itemLines(this.map.equipment,e.item).join(' · ')}</small></button></li>`).join('')}</ul>${entries.length?'':'<p class="camp-note">ไม่พบของตามตัวกรอง</p>'}`;
  }
  private footer(id:string,label:string,reason:string,cost:string,after:string,extra=''):string {
    return `<div class="forge-footer"><p id="forge-cost">${cost}</p>${after?`<small>${after}</small>`:''}${reason?`<p class="forge-reason" role="status">${reason}</p>`:''}${this.review?`<p class="forge-review" role="status">ตรวจรายการแล้วกดยืนยัน</p><div class="forge-footer-buttons"><button id="forge-confirm" data-forge="confirm" ${extra} class="primary"${reason?' disabled':''}>ยืนยัน${label}</button><button id="forge-cancel" data-forge="cancel" class="secondary">ยกเลิก</button></div>`:`<button id="${id}" data-forge="review" ${extra} class="primary"${reason?' disabled':''}>${label}</button>`}</div>`;
  }
  private enhancement(p:Profile,item:Item,owner?:string):string {
    const current=item.plus??0,cap=this.map.equipment.forge.plusCap[item.rarity]!;
    if(this.target<=current||this.target>cap)this.target=Math.min(cap,current+1);
    const cost=enhancementCostTo(this.map,item,this.target),paid=enhancementInvestment(this.map,item),trial=cost?enhanceTo(p,this.map,item.uid,this.target):undefined;
    const projected={...item,plus:this.target};
    const reason=!cost?'ตีบวกเต็มแล้ว':p.bank.ore<cost.ore?`แร่ดาวขาด ${cost.ore-p.bank.ore}`:p.bank.dust<cost.dust?`ฝุ่นดาวขาด ${cost.dust-p.bank.dust}`:'';
    return `<h3>ตีบวก +${current} → +${this.target}</h3><p class="camp-note">สำเร็จทุกครั้ง · เพิ่มค่าพื้นฐาน ${this.map.equipment.forge.plusPercent}% ต่อขั้น · คุณสมบัติรองคงเดิม</p>${cost?`<label class="forge-label">ระดับเป้าหมาย<select id="forge-target">${Array.from({length:cap-current},(_,i)=>current+i+1).map(n=>`<option value="${n}"${n===this.target?' selected':''}>+${n}${n===current+1?' · ครั้งถัดไป':''}</option>`).join('')}</select></label>`:''}${this.statPreview(p,item,projected,owner)}<p class="camp-note">ทุนตีบวกที่คืนได้ตอนรีไซเคิล: แร่ ${paid.ore} · ฝุ่น ${paid.dust}${!item.investment&&current?' · เครดิตของเดิมจาก + ปัจจุบัน':''}</p>${this.footer('forge-enhance',`ตีบวก +${this.target}`,reason,cost?`รวม ${this.target-current} ขั้น · แร่ ${cost.ore} · ฝุ่น ${cost.dust}`:'ไม่มีค่าใช้จ่าย',cost?`คงเหลือ แร่ ${p.bank.ore-cost.ore} · ฝุ่น ${p.bank.dust-cost.dust}`:'')}${trial?.event.type==='blocked'&&!reason?'<p class="camp-note">ไม่สามารถทำรายการนี้ได้</p>':''}`;
  }
  private statPreview(p:Profile,item:Item,next:Item,owner?:string):string {
    const before=itemStats(this.map.equipment,item),after=itemStats(this.map.equipment,next);
    let html=`<table class="comparison-table forge-stat-preview"><caption>ค่าอุปกรณ์ก่อน–หลัง</caption><thead><tr><th>ค่า</th><th>ปัจจุบัน</th><th>หลังพัฒนา</th></tr></thead><tbody>${[...new Set([...Object.keys(before),...Object.keys(after)])].map(k=>{const stat=k as keyof typeof before;return `<tr><th>${statName[stat]}</th><td>${before[stat]??0}</td><td>${after[stat]??0}</td></tr>`;}).join('')}</tbody></table>`;
    const ids=p.company.filter(id=>item.slot!=='weapon'||item.hero===id),id=owner??(ids.includes(this.hero)?this.hero:ids[0]);if(!id)return html;
    if(!owner)html+=`<label class="forge-label">ทดลองผลกับ<select id="forge-preview-hero">${ids.map(c=>`<option value="${c}"${c===id?' selected':''}>${heroText[c]!.name}</option>`).join('')}</select></label>`;
    return html+this.heroImpact(p,id,{...p.members[id]!.gear,[item.slot]:item},{...p.members[id]!.gear,[item.slot]:next},'เทียบเมื่อใช้ชิ้นนี้ก่อน–หลังพัฒนา');
  }
  private heroImpact(p:Profile,id:string,gear:Gear,newGear:Gear,caption:string):string {
    const m=p.members[id]!;const base=this.heroes.find(h=>h.id===id)!;
    const h=starred(base,m.stars,this.map,m.level??1,m.talents,gear,m),n=starred(base,m.stars,this.map,m.level??1,m.talents,newGear,m);
    const state={members:{...p.members,[id]:{...m,gear}},roster:p.party,hp:{[id]:h.maxHp}},newState={...state,members:{...p.members,[id]:{...m,gear:newGear}},hp:{[id]:n.maxHp}};
    const old=characterStats(state,this.map,h,this.data),proposed=characterStats(newState,this.map,n,this.data);
    const effects=this.tab==='craft'?`<h4>เซ็ตและพลังพิเศษก่อน–หลัง</h4><p class="camp-note">ผลตามเงื่อนไขไม่รวมในพลังพื้นฐานด้านบน</p><div class="comparison-effects"><section><h4>สวมอยู่</h4><ul>${equipmentEffects(state,this.map,h)}</ul></section><section><h4>ถ้าใส่อาวุธนี้</h4><ul>${equipmentEffects(newState,this.map,n)}</ul></section></div>`:'';
    return `<details class="forge-impact"${this.impactOpen?' open':''}><summary>ผลต่อ${heroText[id]!.name}และสกิล</summary><p class="camp-note">${caption} · ค่ายแสดงเลือดพร้อมออกเดินทาง · พลังพื้นฐานก่อนเงื่อนไขต่อสู้</p><table class="comparison-table"><thead><tr><th>ค่า</th><th>ก่อน</th><th>หลัง</th></tr></thead><tbody>${old.map((v,i)=>`<tr><th>${v.name}</th><td>${v.value}${v.unit}</td><td>${proposed[i]!.value}${v.unit}</td></tr>`).join('')}</tbody></table><ul class="forge-skills">${h.actions.map(a=>{const v=characterSkillMetric(a,h,this.data),w=characterSkillMetric(a,n,this.data);return `<li>${this.data.skills[a].name}: ${v.value===undefined?'ผลพิเศษ · ค่าพลังคงเดิม':`${v.label} ${v.value} → ${w.value}`}${v.secondary?` · ${v.secondary.label} ${v.secondary.value} → ${w.secondary!.value}`:''}</li>`;}).join('')}</ul>${effects}</details>`;
  }
  private level(p:Profile,item:Item,owner?:string):string {
    const cap=itemLevelCap(p,this.map);if(this.target<=item.level||this.target>cap)this.target=Math.max(item.level,Math.min(cap,item.level+1));
    const cost=itemLevelCost(this.map,item,this.target),trial=raiseItemLevel(p,this.map,item.uid,this.target);
    const reason=item.level>=cap?'ถึงหรือสูงกว่าเพดานที่ปลดล็อกแล้ว':trial.event.type==='blocked'?(trial.event.reason==='ore'?'แร่ดาวไม่พอ':trial.event.reason==='dust'?'ฝุ่นดาวไม่พอ':'ไม่สามารถเพิ่ม Lv ได้'):'';
    const unlocks=this.map.equipment.forge.itemLevel.unlocks;
    return `<h3>เพิ่ม Lv อุปกรณ์</h3><p class="camp-note">เพดานถาวร Lv${cap} · ชนะหัวหน้าทุ่ง → Lv${unlocks[0]!.cap} · หัวหน้าพงหนาม → Lv${unlocks[1]!.cap} · โกเลมหรือจบแนวรอยแยก → Lv${unlocks[2]!.cap} · บันทึกเมื่อกลับค่าย</p><p class="camp-note">สำเร็จทุกครั้ง · เซ็ต สี คุณภาพ คุณสมบัติ และ + คงเดิม · คืนทุนเพิ่ม Lv 100% เมื่อรีไซเคิลหรือใช้เป็นวัตถุดิบหลอม</p>${item.level<cap?`<label class="forge-label">Lv เป้าหมาย<select id="forge-target">${Array.from({length:cap-item.level},(_,i)=>item.level+i+1).map(n=>`<option value="${n}"${n===this.target?' selected':''}>Lv${n}</option>`).join('')}</select></label>`:''}${cost?this.statPreview(p,item,{...item,level:this.target},owner):''}${this.footer('forge-level',`เพิ่มเป็น Lv${this.target}`,reason,cost?`แร่ ${cost.ore} · ฝุ่น ${cost.dust}`:'',cost?`คงเหลือ แร่ ${p.bank.ore-cost.ore} · ฝุ่น ${p.bank.dust-cost.dust}`:'')}`;
  }
  private fusion(p:Profile,item:Item):string {
    this.donors??=fuseMaterials(p,this.map,item.uid).map(i=>i.uid);
    const ids=this.donors,mats=ids.flatMap(id=>p.items.filter(i=>i.uid===id)),reason=fuseReason(p,this.map,item.uid,ids),refund=fusionRefund(p,this.map,ids);
    const candidates=p.items.filter(i=>!i.boss&&i.uid!==item.uid&&i.slot===item.slot&&i.rarity===item.rarity);
    return `<h3>หลอมเลื่อนความหายาก</h3><p>${rarityText[item.rarity]} → ${rarityText[item.rarity+1]??'ขั้นสูงสุด'} · Lv${item.level} · +${item.plus??0} คงเดิม</p><p class="camp-note">ชิ้นหลักรักษาอาชีพ เซ็ต คุณภาพ คุณสมบัติเดิม และทุนพัฒนาทั้งหมด · คุณสมบัติใหม่${item.rarity===3?'และพลังตำนาน':''}เป็นผลสุ่ม แสดงหลังยืนยัน</p><p class="forge-mats">จะทำลาย: ${mats.map(i=>`#${i.uid} ${itemName(i)} Lv${i.level} +${i.plus??0}`).join(', ')||'ยังไม่เลือกวัตถุดิบ'}</p><p class="camp-note">เลือกช่องและสีเดียวกัน ${this.map.equipment.forge.fuseCount-1} ชิ้น · ของสวมอยู่ใช้ไม่ได้ · แนะนำเฉพาะของที่ยังไม่ลงทุน · ไม่คืนมูลค่าตัวอุปกรณ์</p><button id="forge-recommend" data-forge="recommend" class="secondary">เลือกวัตถุดิบแนะนำ</button><ul class="forge-list forge-donors">${candidates.map(i=>`<li><button id="forge-donor-${i.uid}" data-forge="donor" data-uid="${i.uid}" aria-pressed="${ids.includes(i.uid)}"${i.locked||(!ids.includes(i.uid)&&ids.length>=this.map.equipment.forge.fuseCount-1)?' disabled':''}>${ids.includes(i.uid)?'✓ ':''}#${i.uid} ${itemName(i)} Lv${i.level} +${i.plus??0}${i.locked?' · ล็อกแล้ว':''}<small>${itemLines(this.map.equipment,i).join(' · ')}</small></button></li>`).join('')}</ul>${this.footer('forge-fuse','หลอมสี',reason==='maxed'?'ขั้นสูงสุดแล้ว':reason==='full'?'ยอดคืนเกินเพดานคลัง':reason?'เลือกวัตถุดิบให้ครบตามจำนวน':'',`ทำลาย ${mats.length}/${this.map.equipment.forge.fuseCount-1} ชิ้น · คืนทุนพัฒนา แร่ ${refund.ore} · ฝุ่น ${refund.dust}`,`หลังรับ แร่ ${p.bank.ore+refund.ore} · ฝุ่น ${p.bank.dust+refund.dust} · ชิ้นหลักคงอยู่`)}`;
  }
  private transfer(p:Profile,item:Item,owner?:string):string {
    if(item.transferSlot!==undefined)this.index=item.transferSlot;else if(this.index>=item.affixes.length)this.index=0;
    const donor=p.items.find(i=>i.uid===this.donorUid),next=donor?transferCandidate(this.map,item,this.index,donor,this.sourceIndex):undefined,reason=transferReason(p,this.map,item.uid,this.index,this.donorUid,this.sourceIndex),fee=this.map.equipment.forge.transfer;
    const refund=donor?fusionRefund(p,this.map,[donor.uid]):{ore:0,dust:0},pool=p.items.filter(i=>!i.boss&&i.uid!==item.uid&&i.slot===item.slot&&(item.slot!=='weapon'||i.hero===item.hero)&&i.affixes.length);
    const reasons:Record<string,string>={materials:'เลือกวัตถุดิบและคุณสมบัติที่ใช้ได้ · ห้ามซ้ำช่องอื่นหรือค่าเดิม',ore:'แร่ดาวไม่พอจ่ายล่วงหน้า',dust:'ฝุ่นดาวไม่พอจ่ายล่วงหน้า',seal:'ตราสัญญาไม่พอ',full:'ยอดคืนเกินเพดานคลัง'};
    return `<h3>ถ่ายโอนคุณสมบัติรองหนึ่งช่อง</h3><p class="camp-note">${item.transferSlot===undefined?'ครั้งแรกจะผูกช่องที่เลือกถาวร · ครั้งต่อไปเปลี่ยนได้เฉพาะช่องนี้':`ผูกช่อง ${item.transferSlot+1} แล้ว · ช่องอื่นยังถ่ายโอนไม่ได้`} · สำเร็จแน่นอน · คัดลอกชนิดและคุณภาพ % ไม่คัดลอก Lv หรือค่าตัวเลขจากของต้นทาง · ไม่เปลี่ยนเซ็ต สี + และพลังตำนาน</p><div class="forge-transfer-selectors"><label class="forge-label">ช่องที่จะเปลี่ยน<select id="forge-affix">${item.affixes.map((a,i)=>`<option value="${i}"${i===this.index?' selected':''}${item.transferSlot!==undefined&&item.transferSlot!==i?' disabled':''}>ช่อง ${i+1} · ${statName[a]} · ${item.q?.affixes[i]??100}%</option>`).join('')}</select></label><label class="forge-label">วัตถุดิบในคลัง · ช่องเดียวกัน อาวุธต้องอาชีพเดียวกัน<select id="forge-transfer-donor"><option value="0">เลือกชิ้นที่จะใช้หมด</option>${pool.map(i=>`<option value="${i.uid}"${i.uid===this.donorUid?' selected':''}${i.locked?' disabled':''}>#${i.uid} ${itemName(i)} Lv${i.level} +${i.plus??0}${i.locked?' · ล็อกแล้ว':''}</option>`).join('')}</select></label>${donor?`<label class="forge-label">คุณสมบัติจากวัตถุดิบ<select id="forge-transfer-source">${donor.affixes.map((a,i)=>`<option value="${i}"${i===this.sourceIndex?' selected':''}>${statName[a]} · ${donor.q?.affixes[i]??100}%</option>`).join('')}</select></label>`:''}</div>${next?`<p class="forge-transfer-change">ช่อง ${this.index+1}: ${statName[item.affixes[this.index]!]} ${item.q?.affixes[this.index]??100}% → ${statName[next.affixes[this.index]!]} ${next.q!.affixes[this.index]}%</p>`:''}${donor?`<p class="forge-transfer-material">จะทำลาย #${donor.uid} ${itemName(donor)} Lv${donor.level} +${donor.plus??0} · ใช้ ${statName[donor.affixes[this.sourceIndex]!]} ${donor.q?.affixes[this.sourceIndex]??100}%</p>`:''}${next?this.statPreview(p,item,next,owner):''}<p class="camp-note">ชิ้นวัตถุดิบหายไปทั้งชิ้น · คืนเฉพาะทุนตีบวก/เพิ่ม Lv 100% ไม่คืนมูลค่าตัวอุปกรณ์ · ค่าบริการถ่ายโอนไม่คืนตอนรีไซเคิล · การสุ่มปรับค่าเดิมยังใช้ได้และไม่ย้ายช่องที่ผูก</p>${this.footer('forge-transfer','ถ่ายโอนและใช้วัตถุดิบ',reasons[reason]??'',`จ่ายล่วงหน้า แร่ ${fee.ore} · ฝุ่น ${fee.dust} · ตรา ${fee.seal} · คืนทุน แร่ ${refund.ore} · ฝุ่น ${refund.dust}`,`หลังทำ แร่ ${p.bank.ore-fee.ore+refund.ore} · ฝุ่น ${p.bank.dust-fee.dust+refund.dust} · ตรา ${p.bank.seal-fee.seal}`) }`;
  }
  private reroll(p:Profile,item:Item):string {
    if(this.index>=item.affixes.length)this.index=0;
    const reason=rerollReason(p,this.map,item.uid,this.index),pool=affixPool(this.map.equipment,item.slot,item.hero).filter(a=>!item.affixes.includes(a));
    return `<h3>สุ่มเปลี่ยนคุณสมบัติหนึ่งช่อง</h3>${item.affixes.length?`<label class="forge-label">คุณสมบัติที่จะเปลี่ยน<select id="forge-affix">${item.affixes.map((a,i)=>`<option value="${i}"${i===this.index?' selected':''}>${statName[a]} · ช่อง ${i+1}</option>`).join('')}</select></label>`:''}<p>มีโอกาสเป็น: ${pool.map(a=>statName[a]).join(' · ')}</p><p class="camp-note">สุ่มชนิดใหม่และคุณภาพ ${this.map.equipment.quality.join('–')}% · ช่องอื่นคงเดิม · ผลสุ่มแสดงหลังยืนยัน · ค่าใช้จ่ายนี้ไม่คืนตอนรีไซเคิล</p>${this.footer('forge-reroll-'+this.index,'สุ่มปรับค่า',reason==='seal'?'ตราสัญญาไม่พอ':reason?'ไม่มีช่องที่ปรับได้':'',`ตราสัญญา ${this.map.equipment.forge.rerollSeals}`,`คงเหลือ ${p.bank.seal-this.map.equipment.forge.rerollSeals}`)}`;
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
