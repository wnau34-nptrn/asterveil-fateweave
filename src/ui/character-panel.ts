import type { ActionId, EncounterDefinition, HeroDefinition } from '../core/battle/types';
import { AUTO_GOALS, planEquipment, type AutoEquipmentPlan, type AutoGoal, type EquipmentEntry } from '../core/world/auto-equipment';
import { SET_IDS, type GearSlot, type MapDefinition, type SetId, type TalentNode } from '../core/world/types';
import { talentPoints, talentsSpent } from '../core/world/talents';
import { starred, wounded } from '../core/world/world';
import { characterEquipmentComparison, characterOverview, characterSkills, characterTabs, characterTalents, characterTabIcons, type CharacterTab } from './character-view';
import type { CharacterState } from './character-metrics';
import { changeGearFilter, filteredEquipment, gearFilters, newGearFilters, type GearFilters } from './gear-inventory';
import { gearArt } from './equip-art';
import { icon } from './icons';
import { heroArt, portrait } from './portraits';
import { heroStatLine, heroText, itemLines, itemName, itemOwner, setText, slotIcon, slotText, wornSets } from './th';

export interface CharacterModel { state: CharacterState; source: object; ids: readonly string[]; entries: EquipmentEntry[]; available: boolean; camp: boolean; capacity?:number }
export interface CharacterHost {
  model(): CharacterModel|undefined;
  preview(id:string,key:string): CharacterModel|undefined;
  previewPlan(plan:AutoEquipmentPlan): CharacterModel|undefined;
  wear(id:string,key:string): void; takeOff(id:string,slot:GearSlot): void;
  talent(id:string,node:TalentNode): void; reset?(id:string): void; loadout?(id:string,actions:ActionId[]): void;
  applyPlan(plan:AutoEquipmentPlan): void;
  restore?(dialogId:string): void; forge?(id:string,uid:number):void;
}
export const autoGoalText: Record<AutoGoal,string> = {recommended:'แนะนำตามอาชีพ',attack:'เน้นโจมตี',support:'เน้นพลังเสริม',survival:'เน้นทนทาน',speed:'เน้นความเร็ว'};

// One controller and DOM surface for both expedition and base-camp characters. Adapters own all
// commands/persistence; a trial is only a projection and can never save by opening or resizing.
export class CharacterPanel {
  private readonly dialog: HTMLDialogElement;
  private heroId=''; private tab:CharacterTab='overview'; private source:object|undefined;
  private single:{key:string;item:EquipmentEntry['item']}|undefined; private plan:AutoEquipmentPlan|undefined;
  private goal:AutoGoal='recommended'; private preferred:SetId|undefined;
  private autoExpanded=false; private filtersExpanded=false;
  private back:{dialog?:string;focus:string;scroll:number;lobby:boolean}={focus:'',scroll:0,lobby:false};
  constructor(private readonly root:HTMLElement,private readonly map:MapDefinition,private readonly heroes:readonly HeroDefinition[],private readonly template:EncounterDefinition,private readonly host:CharacterHost,private readonly prefix='',readonly filters:GearFilters=newGearFilters()) {
    this.dialog=document.createElement('dialog');this.dialog.id=this.id('character-dialog');this.dialog.className='world-dialog character-dialog';this.dialog.setAttribute('aria-labelledby',this.id('character-title'));
    this.dialog.innerHTML=this.ids(`<div class="info-header"><h2 id="character-title">ตัวละคร</h2><button data-world="character-close" class="quiet" aria-label="ปิดข้อมูลตัวละคร">${icon('close')}</button></div><div id="character-members" class="tree-members character-member-list"></div><div id="character-tabs" class="character-tabs" role="tablist" aria-label="ข้อมูลตัวละคร"></div><div id="character-content" class="info-content character-content" role="tabpanel"></div>`);root.append(this.dialog);
    this.dialog.addEventListener('click',e=>{e.stopPropagation();const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b||b.disabled||!this.usable())return;this.click(b);});
    this.dialog.addEventListener('change',e=>{e.stopPropagation();if(!this.usable())return;const c=e.target as HTMLSelectElement|HTMLInputElement;
      if(c.dataset.gearFilter){changeGearFilter(this.filters,c);this.render();this.focus(c.id);}
      else if(c.id===this.id('auto-goal')&&AUTO_GOALS.includes(c.value as AutoGoal)){this.goal=c.value as AutoGoal;}
      else if(c.id===this.id('auto-set'))this.preferred=SET_IDS.includes(c.value as SetId)?c.value as SetId:undefined;
    });
    this.dialog.addEventListener('toggle',e=>{const details=e.target as HTMLDetailsElement;if(details.matches('.auto-settings'))this.autoExpanded=details.open;if(details.matches('.gear-extra-filters'))this.filtersExpanded=details.open;},true);
    this.dialog.addEventListener('keydown',e=>{
      if(!this.usable())return;
      if(e.repeat&&(e.target as HTMLElement).closest('[data-world=character-talent], [data-world=comparison-equip], [data-world=auto-preview]')){e.preventDefault();return;}
      const tab=(e.target as HTMLElement).closest('.character-tabs [role=tab]');
      if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();const keys=Object.keys(characterTabs) as CharacterTab[],i=keys.indexOf(this.tab);
      this.tab=keys[e.key==='Home'?0:e.key==='End'?keys.length-1:(i+(e.key==='ArrowRight'?1:-1)+keys.length)%keys.length]!;this.discard();this.render();this.content().scrollTop=0;this.focus(this.id(`character-tab-${this.tab}`));
    });
    this.dialog.addEventListener('cancel',e=>{if(this.usable()&&(this.single||this.plan)){e.preventDefault();this.cancelTrial();}});
    this.dialog.addEventListener('close',()=>{
      this.discard();this.content().innerHTML='';if(this.root.hidden||this.root.closest('[inert]'))return;
      if(this.back.dialog){this.host.restore?.(this.back.dialog);const from=this.root.querySelector<HTMLDialogElement>(`#${this.back.dialog}`);if(from&&!from.open)from.showModal();from?.querySelector('.info-content')?.scrollTo(0,this.back.scroll);}
      else if(this.back.lobby)this.root.querySelector('.lobby-content')?.scrollTo(0,this.back.scroll);
      (this.root.querySelector<HTMLElement>(`#${this.back.focus}`)??this.root.querySelector<HTMLElement>('#lobby-sub-back'))?.focus({preventScroll:true});
    });
  }
  get open():boolean{return this.dialog.open;}
  private id(id:string):string{return `${this.prefix}${id}`;}
  private ids(html:string):string{return this.prefix?html.replace(/\bid="([^"]+)"/g,(_s,id:string)=>`id="${this.id(id)}"`).replace(/\b(aria-controls|aria-labelledby)="([^"]+)"/g,(_s,k:string,ids:string)=>`${k}="${ids.split(' ').map(id=>this.id(id)).join(' ')}"`):html;}
  private content():HTMLElement{return this.dialog.querySelector<HTMLElement>(`#${this.id('character-content')}`)!;}
  private focus(id:string):void{this.dialog.querySelector<HTMLElement>(`#${id}`)?.focus({preventScroll:false});}
  private usable():boolean{return this.dialog.open&&!this.root.hidden&&!this.root.closest('[inert]')&&!!this.host.model();}
  private hero(model:CharacterModel,id=this.heroId):HeroDefinition {const m=model.state.members[id]!,base=this.heroes.find(h=>h.id===id)!;return wounded(starred(base,m.stars,this.map,m.level??1,m.talents,m.gear,m),m.wound);}
  private discard():void{this.single=undefined;this.plan=undefined;}
  openFor(id:string,tab:CharacterTab,trigger:HTMLButtonElement,key?:string):void{
    const model=this.host.model();if(!model?.available||!model.ids.includes(id)||this.root.hidden||this.root.closest('[inert]'))return;
    const from=trigger.closest<HTMLDialogElement>('dialog'),lobby=trigger.closest('.lobby-content');this.back={dialog:from?.id,focus:trigger.id,scroll:from?.querySelector('.info-content')?.scrollTop??lobby?.scrollTop??0,lobby:!!lobby};
    this.heroId=id;this.tab=Object.hasOwn(characterTabs,tab)?tab:'overview';this.source=model.source;this.discard();
    const entry=model.entries.find(e=>e.key===key);if(entry&&(entry.item.slot!=='weapon'||entry.item.hero===id))this.single={key:entry.key,item:entry.item};
    from?.close();this.render();this.content().scrollTop=0;this.dialog.showModal();this.focus(this.id(`character-tab-${this.tab}`));
  }
  refresh():void{if(this.open)this.render();}
  private click(b:HTMLButtonElement):void{
    const model=this.host.model();if(!model)return;const action=b.dataset.world;
    if(b.hasAttribute('data-gear-reset')){Object.assign(this.filters,newGearFilters());this.render();this.focus(this.id('gear-filter-set'));return;}
    if(action==='character-forge'&&model.camp&&this.host.forge){this.back={focus:'lobby-tab-forge',scroll:0,lobby:false};this.dialog.close();this.host.forge(this.heroId,Number(b.dataset.uid));return;}
    if(action==='character-close'){this.dialog.close();return;}
    if(action==='character-tab'){this.tab=b.dataset.tab as CharacterTab;this.discard();this.render();this.content().scrollTop=0;this.focus(this.id(`character-tab-${this.tab}`));return;}
    if(action==='character-member'){this.heroId=b.dataset.hero!;this.filters.slot='all';this.discard();this.render();this.content().scrollTop=0;this.focus(this.id(`character-member-${this.heroId}`));return;}
    if(action==='comparison-back'){this.cancelTrial();return;}
    if(!model.available||this.source!==model.source)return;
    if(action==='character-talent'&&b.getAttribute('aria-disabled')!=='true'){this.host.talent(this.heroId,b.dataset.node as TalentNode);this.focus(this.id(`character-talent-${b.dataset.node}`));}
    else if(action==='character-loadout'&&b.getAttribute('aria-disabled')!=='true'){
      // Big skill trees (A6): toggle one unlocked skill in or out of the battle loadout (at least one stays).
      const skill=b.dataset.skill as ActionId,now:ActionId[]=this.hero(model).actions.filter(a=>a!=='attack');
      const next=now.includes(skill)?now.filter(a=>a!==skill):[...now,skill];
      if(next.length&&next.length<=this.map.progression.loadoutSize)this.host.loadout?.(this.heroId,next);this.focus(this.id(`character-loadout-${skill}`));}
    else if(action==='character-reset'){this.host.reset?.(this.heroId);this.focus(this.id('character-reset'));}
    else if(action==='bag-slot'){const slot=b.dataset.slot as GearSlot;this.filters.slot=this.filters.slot===slot?'all':slot;this.render();this.focus(this.id(`bag-slot-${slot}`));}
    else if(action==='bag-wear'){const slot=model.entries.find(e=>e.key===b.dataset.key)?.item.slot;this.host.wear(this.heroId,b.dataset.key!);if(slot)this.focus(this.id(`bag-slot-${slot}`));}
    else if(action==='bag-takeoff'&&this.filters.slot!=='all'){this.host.takeOff(this.heroId,this.filters.slot);this.focus(this.id(`bag-slot-${this.filters.slot}`));}
    else if(action==='bag-compare'){const entry=model.entries.find(e=>e.key===b.dataset.key);if(entry&&(entry.item.slot!=='weapon'||entry.item.hero===this.heroId)){this.single={key:entry.key,item:entry.item};this.plan=undefined;this.render();this.content().scrollTop=0;this.focus(this.id('comparison-back'));}}
    else if(action==='auto-preview'){
      this.autoExpanded=true;
      this.single=undefined;this.plan=planEquipment(this.map,this.template,this.heroes.find(h=>h.id===this.heroId)!,model.state.members[this.heroId]!,model.entries,this.goal,this.preferred);
      this.render();this.content().scrollTop=0;this.focus(this.id(this.plan.choices.length?'comparison-back':'auto-preview'));
    }else if(action==='comparison-equip'){
      const plan=this.plan,single=this.single;this.discard();
      if(plan)this.host.applyPlan(plan);else if(single&&model.entries.some(e=>e.key===single.key&&e.item===single.item))this.host.wear(this.heroId,single.key);
      this.render();this.focus(this.id(`bag-slot-${plan?.choices[0]?.slot??single?.item.slot??'weapon'}`));
    }
  }
  private cancelTrial():void{
    const key=this.single?.key,wasAuto=!!this.plan;this.discard();this.render();
    this.focus(this.id(wasAuto?'auto-preview':key?`compare-${key.replace(':','-')}`:'character-tab-gear'));
  }
  private render():void{
    const model=this.host.model();if(!model||!model.ids.includes(this.heroId))return;
    if(this.source!==model.source){this.discard();this.source=model.source;}
    const id=this.heroId,h=this.hero(model),m=model.state.members[id]!,base=this.heroes.find(v=>v.id===id)!,focus=this.dialog.contains(document.activeElement)?(document.activeElement as HTMLElement).id:'',scroll=this.content().scrollTop;
    this.dialog.querySelector(`#${this.id('character-title')}`)!.textContent=`${heroText[id]!.name} · Lv${m.level??1} · ★${m.stars}`;
    const picker=this.dialog.querySelector<HTMLElement>(`#${this.id('character-members')}`)!,left=picker.scrollLeft;
    picker.innerHTML=this.ids(model.ids.map(c=>{const member=model.state.members[c]!,free=talentPoints(this.map,member,c)-talentsSpent(member.talents);return `<button id="character-member-${c}" data-world="character-member" data-hero="${c}" class="tree-member" aria-pressed="${c===id}" aria-label="${heroText[c]!.name} · แต้มเหลือ ${free}">${portrait(c)}<small>${heroText[c]!.name}</small>${free?`<i>+${free}</i>`:''}</button>`;}).join(''));picker.scrollLeft=left;
    this.dialog.querySelector(`#${this.id('character-tabs')}`)!.innerHTML=this.ids(Object.entries(characterTabs).map(([tab,label])=>`<button id="character-tab-${tab}" data-world="character-tab" data-tab="${tab}" role="tab" aria-controls="character-content" aria-selected="${tab===this.tab}" tabindex="${tab===this.tab?0:-1}">${icon(characterTabIcons[tab as CharacterTab])}<span>${label}</span></button>`).join(''));
    const position=model.state.roster.deployed.includes(id)?`ตัวหลักช่อง ${model.state.roster.deployed.indexOf(id)+1}`:model.state.roster.reserve.includes(id)?'สำรอง':'ในค่าย';
    let html=`<p class="character-summary">${heroText[id]!.role} · ${h.lane==='front'?'แนวหน้า':'แนวหลัง'} · ${position} · ${model.camp?'ค่ายหลัก · เลือดพร้อมออกเดินทาง':'HP'} ${model.state.hp[id]??0}/${h.maxHp}</p>`;
    html+=this.tab==='overview'?characterOverview(model.state,this.map,h,this.template):this.tab==='skills'?characterSkills(h,base,m.stars,this.template,this.map,m):this.tab==='talents'?characterTalents(model.state,this.map,id,this.template,h,base)+(model.camp?`<button id="character-reset" data-world="character-reset" class="secondary"${talentsSpent(m.talents)?'':' disabled'}>${icon('act-reset')}รีเซ็ตแต้มฟรีที่ครูฝึก</button>`:''):this.gear(model,h);
    this.content().setAttribute('aria-labelledby',this.id(`character-tab-${this.tab}`));this.content().innerHTML=this.ids(html);
    const auto=this.content().querySelector<HTMLDetailsElement>('.auto-settings'),extra=this.content().querySelector<HTMLDetailsElement>('.gear-extra-filters');if(auto)auto.open=this.autoExpanded;if(extra)extra.open=this.filtersExpanded;
    this.content().scrollTop=scroll;if(this.open&&focus)this.focus(focus);
  }
  private gear(model:CharacterModel,h:HeroDefinition):string{
    const trial=this.plan?.choices.length?this.host.previewPlan(this.plan):this.single?this.host.preview(this.heroId,this.single.key):undefined;
    if(trial){const items=this.plan?this.plan.choices.map(c=>c.item):this.single!.item;return (this.plan?`<p class="auto-summary">ชุดแนะนำ: ${autoGoalText[this.goal]}${this.preferred?` · เน้นชุด${setText[this.preferred]}`:''} · เปลี่ยน ${this.plan.choices.length} ช่อง</p>`:'')+characterEquipmentComparison(model.state,trial.state,this.map,h,this.hero(trial),items,this.template,model.camp);}
    const m=model.state.members[this.heroId]!,slot=this.filters.slot,worn=slot==='all'?undefined:m.gear?.[slot],entries=filteredEquipment(model.entries,this.filters,this.heroId),sets=wornSets(this.map.equipment,m.gear),full=model.camp&&model.entries.length>=(model.capacity??this.map.equipment.bagCap);
    // Paper doll (ART-UI-MODERN-001): weapon/body/boots left, head/gloves/charm right, the hero between them.
    const slotButton=(sl:GearSlot)=>{const it=m.gear?.[sl];return `<button id="bag-slot-${sl}" data-world="bag-slot" data-slot="${sl}" class="gear-slot doll-slot" ${it?`data-rarity="${it.rarity}"`:''} aria-pressed="${slot===sl}" aria-label="${slotText[sl]}: ${it?`${itemName(it)} Lv${it.level}`:'ว่าง'}">${it?gearArt(it):icon(slotIcon[sl])}<b>${slotText[sl]}</b><small class="sr-only">${it?`${itemName(it)} Lv${it.level}`:'ว่าง'}</small></button>`;};
    const slots=`<div class="doll-col">${(['weapon','body','boots'] as const).map(slotButton).join('')}</div><div class="doll-hero">${heroArt(this.heroId)}</div><div class="doll-col">${(['head','gloves','charm'] as const).map(slotButton).join('')}</div>`;
    const chips=`<div class="doll-stats"><span class="ui-pill">${icon('stat-hp')}${model.state.hp[this.heroId]??0}/${h.maxHp}</span><span class="ui-pill">${icon('stat-attack')}${h.attack}</span><span class="ui-pill">${icon('stat-support')}${h.skillBonus??0}%</span><span class="ui-pill">${icon('stat-speed')}${h.speed}</span></div>`;
    const rows=entries.map(e=>{const locked=e.item.slot==='weapon'&&e.item.hero!==this.heroId,key=e.key.replace(':','-');return `<li data-rarity="${e.item.rarity}" data-item-key="${e.key}">${gearArt(e.item)}<div><b>${itemName(e.item)} Lv${e.item.level}</b><small>${itemLines(this.map.equipment,e.item).join(' · ')}</small><small>${e.label} · ${itemOwner(e.item)}</small></div><span class="gear-actions"><button id="compare-${key}" data-world="bag-compare" data-key="${e.key}" class="secondary"${locked?' disabled':''}>${icon('act-compare')}เปรียบเทียบ</button><button id="wear-${key}" data-world="bag-wear" data-key="${e.key}" class="primary"${locked||!model.available?' disabled':''}>${locked?'คนอื่นใช้':`${icon('act-wear')}ใส่`}</button>${model.camp?`<button data-world="character-forge" data-uid="${e.item.uid}" class="secondary">พัฒนา</button>`:''}</span></li>`;}).join('');
    return `<div class="character-gear"><p class="gear-stats sr-only">${heroStatLine(h,model.state.hp[this.heroId])}</p><div class="gear-slots paperdoll">${slots}</div>${chips}${worn?`<div class="gear-detail">${gearArt(worn)}<p>${itemName(worn)} · ${itemLines(this.map.equipment,worn).join(' · ')}</p><button id="bag-takeoff" data-world="bag-takeoff" class="secondary"${model.available&&!full?'':' disabled'}>${icon('act-remove')}ถอดเก็บเข้ากระเป๋า</button>${model.camp?`<button id="character-forge-worn" data-world="character-forge" data-uid="${worn.uid}" class="primary">พัฒนาที่โรงตีเหล็ก</button>`:''}${full?'<small>คลังเต็ม · ใส่ชิ้นใหม่แทนได้ หรือแยกชิ้นที่ไม่ใช้ในกระเป๋าก่อนถอด</small>':''}</div>`:''}${sets.length?`<ul class="gear-sets">${sets.map(v=>`<li><b>ชุด${v.name} ${v.pieces}/4</b><small class="${v.pieces>=2?'on':''}">2 ชิ้น: ${v.two}</small><small class="${v.pieces>=4?'on':''}">4 ชิ้น: ${v.four}</small></li>`).join('')}</ul>`:''}
      <details class="auto-settings"><summary>สวมใส่อัตโนมัติ · จัดชุดแนะนำ</summary><div class="gear-filter-grid"><label>แนวทาง<select id="auto-goal">${AUTO_GOALS.map(g=>`<option value="${g}"${g===this.goal?' selected':''}>${autoGoalText[g]}</option>`).join('')}</select></label><label>เซ็ตที่ต้องการ<select id="auto-set"><option value="">ไม่เจาะจง</option>${SET_IDS.map(s=>`<option value="${s}"${s===this.preferred?' selected':''}>ชุด${setText[s]}</option>`).join('')}</select></label></div><p class="camp-note">ใช้ของที่ใส่อยู่และของในกระเป๋าทั้งหมด ไม่ขึ้นกับตัวกรอง ไม่ถอดของคนอื่น เลือกเซ็ตจะเน้นให้ครบสูงสุด 4 ชิ้นก่อน แล้วจัดค่าสถานะตามแนวทาง เป็นชุดแนะนำ ไม่ใช่ดาเมจรับประกัน</p><button id="auto-preview" data-world="auto-preview" class="primary"${model.available?'':' disabled'}>จัดชุดและดูผลก่อนใส่</button>${this.plan&&!this.plan.choices.length?'<p class="auto-empty" role="status">ชุดปัจจุบันเหมาะกับแนวทางนี้แล้ว ไม่มีรายการที่แนะนำให้เปลี่ยน</p>':''}</details>
      <h3>อุปกรณ์ · ${entries.length}/${model.entries.length} ชิ้น</h3>${gearFilters(this.filters,'',this.heroId)}${rows?`<ul class="gear-bag">${rows}</ul>`:'<p class="camp-note">ไม่พบอุปกรณ์ตามตัวกรอง · ล้างตัวกรองเพื่อดูทั้งหมด</p>'}<p class="camp-note">${model.camp?'จัดของในค่ายสำหรับการเดินทางครั้งถัดไป':'ใส่ได้ทุกที่นอกการต่อสู้ · ถ้าทีมล้มหมด ของที่เจอรอบนี้เก็บกลับได้เฉพาะชิ้นที่ดีที่สุด'}</p></div>`;
  }
}
