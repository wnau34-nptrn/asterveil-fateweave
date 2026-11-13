import './team-navigation.css';
import './skills.css';
import { SkillReview, type SkillCommand } from './skill-review';
import { skillsView, talentsView, skillCatalogue, type SkillSection } from './skills-view';
import './star-upgrade.css';
import { StarUpgrade, type StarSources } from './star-upgrade';
import { formation } from '../core/world/formation';
import type { ActionId, EncounterDefinition, HeroDefinition } from '../core/battle/types';
import { AUTO_GOALS, planEquipment, type AutoEquipmentPlan, type AutoGoal, type EquipmentEntry } from '../core/world/auto-equipment';
import { SET_IDS, type GearSlot, type MapDefinition, type SetId, type TalentNode, type TomeLine, type TomeSize, type Profile, type ProfileEvent, type ProfileResult } from '../core/world/types';
import { talentPoints, talentsSpent } from '../core/world/talents';
import { levelOf, starred, wounded } from '../core/world/world';
import { characterEquipmentComparison, characterOverview, characterTabs, characterTabIcons, type CharacterTab, type SkillTomeView } from './character-view';
import type { CharacterState } from './character-metrics';
import { changeGearFilter, filteredEquipment, gearFilters, newGearFilters, type GearFilters } from './gear-inventory';
import { gearArt } from './equip-art';
import { icon } from './icons';
import { heroArt, portrait } from './portraits';
import { heroStatLine, heroText, itemLines, itemName, itemOwner, rarityText, setText, slotIcon, slotText, wornSets } from './th';

// Stats an item card compares, in display order: hero field, Thai name, unit.
const statDeltas:readonly ['maxHp'|'attack'|'skillBonus'|'speed'|'armour'|'resist'|'leech',string,string][]=[['maxHp','เลือด',''],['attack','พลังโจมตี',''],['skillBonus','พลังเวท','%'],['speed','SPD',''],['armour','เกราะ','%'],['resist','ต้านพลังงาน','%'],['leech','ดูดเลือด','%']];

export interface CharacterModel { state: CharacterState; source: object; ids: readonly string[]; entries: EquipmentEntry[]; available: boolean; camp: boolean; capacity?:number; starProfile?:Profile; skillProfile?:Profile; starSources?:StarSources; tomes?: SkillTomeView }
export interface CharacterHost {
  navigationVisible?(open:boolean):void;
  model(): CharacterModel|undefined;
  preview(id:string,key:string): CharacterModel|undefined;
  previewPlan(plan:AutoEquipmentPlan): CharacterModel|undefined;
  wear(id:string,key:string): void; takeOff(id:string,slot:GearSlot): void;
  talent(id:string,node:TalentNode): void; reset?(id:string): void; loadout?(id:string,actions:ActionId[]): void;
  skillLevel?(id:string,action:ActionId): void; tomeTrade?(line:TomeLine,size:TomeSize,to?:TomeLine): void;
  applyPlan(plan:AutoEquipmentPlan): void;
  skillPreview?(p:Profile,command:SkillCommand):ProfileResult;
  upgrade?(id:string):void;
  restore?(dialogId:string): void; forge?(id:string,uid:number):void;
}
export const autoGoalText: Record<AutoGoal,string> = {recommended:'แนะนำตามอาชีพ',attack:'เน้นโจมตี',support:'เน้นพลังเวท',survival:'เน้นทนทาน',speed:'เน้นความเร็ว'};

// One controller and DOM surface for both expedition and base-camp characters. Adapters own all
// commands/persistence; a trial is only a projection and can never save by opening or resizing.
export class CharacterPanel {
  private readonly dialog: HTMLDialogElement;
  private readonly talentDialog:HTMLDialogElement; private talentReturn={focus:'',scroll:0};
  private readonly stars:StarUpgrade; private starOpen=false; private starReturn:{focus:string;scroll:number;tab:CharacterTab}={focus:'',scroll:0,tab:'develop'};
  private readonly skillReview:SkillReview; private selectedSkill:ActionId='guard'; private skillSection:SkillSection='details'; private skillReturn={focus:'',scroll:0}; private skillNodeReturn:{skill:ActionId;scroll:number;focus:string}|undefined; private tomeExpanded=false; private skillScroll:Partial<Record<SkillSection,number>>={};
  private navigationClose=false;
  private readonly visits=new Map<string,{tab:CharacterTab;section:SkillSection;skill:ActionId;scroll:number;node:string}>();
  private heroId=''; private tab:CharacterTab='overview'; private source:object|undefined;
  private single:{key:string;item:EquipmentEntry['item']}|undefined; private plan:AutoEquipmentPlan|undefined;
  private goal:AutoGoal='recommended'; private preferred:SetId|undefined;
  private autoExpanded=false; private filtersExpanded=false; private picked=''; private node='';
  private back:{dialog?:string;focus:string;scroll:number;lobby:boolean}={focus:'',scroll:0,lobby:false};
  private forgeReturn:{focus:string;scroll:number}|undefined;
  constructor(private readonly root:HTMLElement,private readonly map:MapDefinition,private readonly heroes:readonly HeroDefinition[],private readonly template:EncounterDefinition,private readonly host:CharacterHost,private readonly prefix='',readonly filters:GearFilters=newGearFilters()) {
    this.skillReview=new SkillReview(map,template,(p,c)=>this.host.skillPreview?.(p,c));
    this.stars=new StarUpgrade(map,heroes,template);
    this.dialog=document.createElement('dialog');this.dialog.id=this.id('character-dialog');this.dialog.className='world-dialog character-dialog';this.dialog.setAttribute('aria-labelledby',this.id('character-title'));
    this.dialog.innerHTML=this.ids(`<div class="info-header"><h2 id="character-title">ตัวละคร</h2><button data-world="character-close" class="quiet" aria-label="ปิดข้อมูลตัวละคร">${icon('close')}</button></div><div id="character-members" class="tree-members character-member-list"></div><div id="character-tabs" class="character-tabs" role="tablist" aria-label="ข้อมูลตัวละคร"></div><div id="character-content" class="info-content character-content" role="tabpanel"></div><div id="character-dock" class="star-dock" hidden></div>`);root.append(this.dialog);
    this.talentDialog=document.createElement('dialog');this.talentDialog.id=this.id('talent-detail-dialog');this.talentDialog.className='world-dialog talent-detail-dialog';this.talentDialog.setAttribute('aria-labelledby',this.id('talent-detail-title'));
    this.talentDialog.innerHTML=this.ids(`<div class="info-header"><h2 id="talent-detail-title">รายละเอียดสกิล</h2><button data-world="talent-detail-close" class="quiet" aria-label="ปิดรายละเอียดสกิล">${icon('close')}</button></div><div class="info-content talent-detail-content"></div>`);this.dialog.append(this.talentDialog);
    this.talentDialog.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();this.closeTalentDetail();});
    this.talentDialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.closeTalentDetail();}});
    this.talentDialog.addEventListener('click',e=>{if(e.target!==this.talentDialog)return;const r=this.talentDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.closeTalentDetail();});
    this.dialog.addEventListener('click',e=>{e.stopPropagation();const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b||b.disabled||!this.usable())return;if(e.detail>1&&(b.dataset.world?.startsWith('star-')||b.dataset.world?.startsWith('skill-review-')||b.dataset.world==='character-loadout'||b.dataset.world==='character-reset'||b.dataset.world==='character-talent')){e.preventDefault();this.focus(this.id(b.dataset.world?.startsWith('star-')?'star-status':'skill-review-status'));return;}this.click(b);});
    this.dialog.addEventListener('pointerdown',e=>this.slotDragStart(e));
    this.dialog.addEventListener('mousedown',e=>{if(e.detail>1&&(e.target as HTMLElement).closest<HTMLButtonElement>('button')?.matches('[data-world^=star-],[data-world=skill-level],[data-world=tome-trade],[data-world=skill-review-confirm],[data-world=character-loadout],[data-world=character-reset],[data-world=character-talent]'))e.preventDefault();});
    this.dialog.addEventListener('change',e=>{e.stopPropagation();if(!this.usable())return;const c=e.target as HTMLSelectElement|HTMLInputElement;
      if(c.hasAttribute('data-skill-selection')){const model=this.host.model();if(model&&skillCatalogue(this.map,this.heroes.find(h=>h.id===this.heroId)!,this.hero(model)).includes(c.value as ActionId)){this.selectedSkill=c.value as ActionId;this.node='';this.skillReview.clear();this.render();this.focus(c.id);}return;}
      if(c.dataset.gearFilter){changeGearFilter(this.filters,c);this.render();this.focus(c.id);}
      else if(c.id===this.id('auto-goal')&&AUTO_GOALS.includes(c.value as AutoGoal)){this.goal=c.value as AutoGoal;}
      else if(c.id===this.id('auto-set'))this.preferred=SET_IDS.includes(c.value as SetId)?c.value as SetId:undefined;
    });
    this.dialog.addEventListener('toggle',e=>{const details=e.target as HTMLDetailsElement;if(details.matches('.tome-trade'))this.tomeExpanded=details.open;if(details.matches('.auto-settings'))this.autoExpanded=details.open;if(details.matches('.gear-extra-filters'))this.filtersExpanded=details.open;},true);
    this.dialog.addEventListener('keydown',e=>{
      if(!this.usable())return;
      if(this.host.navigationVisible&&e.key==='Escape'){e.preventDefault();e.stopPropagation();if(this.dialog.dispatchEvent(new Event('cancel',{cancelable:true})))this.dialog.close();return;}
      if(e.repeat&&(e.target as HTMLElement).closest('[data-world=skill-level], [data-world=tome-trade], [data-world=skill-review-confirm], [data-world=character-loadout], [data-world=character-reset], [data-world=character-talent], [data-world=comparison-equip], [data-world=auto-preview], [data-world=star-review], [data-world=star-confirm], [data-world=star-next], [data-world=character-star-open]')){e.preventDefault();return;}
      const slot=(e.target as HTMLElement).closest<HTMLButtonElement>('.skills-slots button');
      if(slot&&e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();e.stopPropagation();const all=[...this.dialog.querySelectorAll('.skills-slots button')],i=all.indexOf(slot);this.moveSlot(i,i+(e.key==='ArrowRight'?1:-1));return;}
      const tab=(e.target as HTMLElement).closest('.character-tabs [role=tab]');
      if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();const keys=this.visibleTabs(),i=keys.indexOf(this.tab);
      this.tab=keys[e.key==='Home'?0:e.key==='End'?keys.length-1:(i+(e.key==='ArrowRight'?1:-1)+keys.length)%keys.length]!;if(this.tab==='skills')this.skillSection='details';this.discard();this.render();this.content().scrollTop=0;this.focus(this.id(`character-tab-${this.tab}`));
    });
    this.dialog.addEventListener('cancel',e=>{if(this.usable()&&this.skillReview.active){e.preventDefault();this.backSkillReview();return;}if(this.usable()&&this.starOpen){e.preventDefault();this.backStar();return;}if(this.usable()&&(this.single||this.plan)){e.preventDefault();this.cancelTrial();}});
    root.ownerDocument.addEventListener('keydown',e=>{if(this.host.navigationVisible&&e.key==='Escape'&&!e.defaultPrevented&&!e.repeat&&this.usable()&&!this.dialog.contains(e.target as Node)){e.preventDefault();if(this.dialog.dispatchEvent(new Event('cancel',{cancelable:true})))this.dialog.close();}});
    this.dialog.addEventListener('close',()=>{
      if(this.dialog.open)return;this.talentDialog.close();
      if(!this.navigationClose)this.rememberVisit();this.host.navigationVisible?.(false);this.discard();this.content().innerHTML='';if(this.navigationClose)return;if(this.root.hidden||this.root.closest('[inert]'))return;
      if(this.forgeReturn)return;
      if(this.back.dialog){this.host.restore?.(this.back.dialog);const from=this.root.querySelector<HTMLDialogElement>(`#${this.back.dialog}`);if(from&&!from.open)from.showModal();from?.querySelector('.info-content')?.scrollTo(0,this.back.scroll);}
      else if(this.back.lobby)this.root.querySelector('.lobby-content')?.scrollTo(0,this.back.scroll);
      (this.root.querySelector<HTMLElement>(`#${this.back.focus}`)??this.root.querySelector<HTMLElement>('#lobby-sub-back'))?.focus({preventScroll:true});
    });
  }
  get open():boolean{return this.dialog.open;}
  get lastViewed():{id:string;tab:CharacterTab}|undefined{return this.heroId?{id:this.heroId,tab:this.tab}:undefined;}
  private visibleTabs():CharacterTab[]{const camp=this.host.model()?.camp;return (Object.keys(characterTabs) as CharacterTab[]).filter(tab=>tab!=='develop'||camp);}
  private rememberVisit():void{if(this.heroId&&this.content().childElementCount)this.visits.set(this.heroId,{tab:this.tab,section:this.skillSection,skill:this.selectedSkill,scroll:this.skillReview.active?this.skillReturn.scroll:this.starOpen?this.starReturn.scroll:this.content().scrollTop,node:this.node});}
  openRemembered(id:string,trigger:HTMLButtonElement):void{
    const visit=this.visits.get(id);this.openFor(id,visit?.tab??'overview',trigger);
    if(!this.open||!visit)return;
    this.skillSection=visit.section;this.selectedSkill=visit.skill;this.node=visit.node;this.render();this.content().scrollTop=visit.scroll;this.focus(this.id(`character-tab-${this.tab}`));
  }
  closeForNavigation():void{this.talentDialog.close();this.rememberVisit();this.navigationClose=true;this.discard();this.dialog.close();this.host.navigationVisible?.(false);}
  private closeTalentDetail():void {this.talentDialog.close();this.content().scrollTop=this.talentReturn.scroll;this.dialog.querySelector<HTMLElement>('#'+this.talentReturn.focus)?.focus({preventScroll:true});}
  private showTalentDetail(focus:string):void {this.talentReturn={focus,scroll:this.content().scrollTop};this.render();this.talentDialog.showModal();this.talentDialog.querySelector<HTMLElement>('[data-world=talent-detail-close]')?.focus({preventScroll:true});}
  private show():void{if(this.host.navigationVisible){this.host.navigationVisible(true);this.dialog.show();}else this.dialog.showModal();}

  private id(id:string):string{return `${this.prefix}${id}`;}
  private ids(html:string):string{return this.prefix?html.replace(/\bid="([^"]+)"/g,(_s,id:string)=>`id="${this.id(id)}"`).replace(/\b(aria-controls|aria-labelledby)="([^"]+)"/g,(_s,k:string,ids:string)=>`${k}="${ids.split(' ').map(id=>this.id(id)).join(' ')}"`):html;}
  private content():HTMLElement{return this.dialog.querySelector<HTMLElement>(`#${this.id('character-content')}`)!;}
  private focus(id:string):void{this.dialog.querySelector<HTMLElement>(`#${id}`)?.focus({preventScroll:false});}
  // Equipped skills: drag a slot onto another to reorder (battle button order); Alt+Arrow does the same from the keyboard.
  private moveSlot(from:number,to:number):void{
    const model=this.host.model();if(!model?.available||from===to)return;
    const now:ActionId[]=this.hero(model).actions.filter(a=>a!=='attack');if(from<0||to<0||from>=now.length||to>=now.length)return;
    const [skill]=now.splice(from,1);now.splice(to,0,skill!);this.host.loadout?.(this.heroId,now);this.focus(this.id(`skill-select-${skill}`));
  }
  private slotDragStart(e:PointerEvent):void{
    const b=(e.target as HTMLElement).closest<HTMLButtonElement>('.skills-slots button');
    if(!b||!e.isPrimary||e.button>0||!this.usable()||!this.host.model()?.available)return;
    const slots=[...this.dialog.querySelectorAll<HTMLButtonElement>('.skills-slots button')],from=slots.indexOf(b);if(slots.length<2)return;
    const rects=slots.map(x=>x.getBoundingClientRect()),sx=e.clientX,sy=e.clientY,doc=this.dialog.ownerDocument;let active=false,over=from;
    const move=(ev:PointerEvent):void=>{
      if(!active){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<8)return;active=true;b.dataset.dragging='';}
      ev.preventDefault();b.style.transform=`translate(${ev.clientX-sx}px,${ev.clientY-sy}px)`;
      const t=rects.findIndex(r=>ev.clientX>=r.left&&ev.clientX<=r.right);if(t>=0)over=t;
      slots.forEach((x,i)=>x.toggleAttribute('data-drop',i===over&&i!==from));
    };
    const end=(ev:PointerEvent):void=>{
      doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerup',end);doc.removeEventListener('pointercancel',end);
      b.style.transform='';delete b.dataset.dragging;slots.forEach(x=>x.removeAttribute('data-drop'));
      if(!active)return;
      const stop=(c:Event):void=>{c.stopPropagation();c.preventDefault();};doc.addEventListener('click',stop,{capture:true,once:true});setTimeout(()=>doc.removeEventListener('click',stop,true),80);
      if(ev.type==='pointerup')this.moveSlot(from,over);
    };
    doc.addEventListener('pointermove',move);doc.addEventListener('pointerup',end);doc.addEventListener('pointercancel',end);
  }
  private usable():boolean{return this.dialog.open&&!this.root.hidden&&!this.root.closest('[inert]')&&!!this.host.model();}
  private hero(model:CharacterModel,id=this.heroId):HeroDefinition {const m=model.state.members[id]!,base=this.heroes.find(h=>h.id===id)!;return wounded(starred(base,m.stars,this.map,levelOf(this.map,model.state),m.talents,m.gear,m),m.wound);}
  private discard():void{this.skillReview.clear();this.single=undefined;this.plan=undefined;this.starOpen=false;this.stars.open(this.heroId);}
  openFor(id:string,tab:CharacterTab,trigger:HTMLButtonElement,key?:string):void{
    const model=this.host.model();if(!model?.available||!model.ids.includes(id)||this.root.hidden||this.root.closest('[inert]'))return;
    this.rememberVisit();this.navigationClose=false;this.forgeReturn=undefined;
    const from=trigger.closest<HTMLDialogElement>('dialog'),lobby=trigger.closest('.lobby-content');this.back={dialog:from?.id,focus:trigger.id,scroll:from?.querySelector('.info-content')?.scrollTop??lobby?.scrollTop??0,lobby:!!lobby};
    this.heroId=id;this.skillNodeReturn=undefined;this.skillScroll={};this.skillSection='details';this.tab=this.visibleTabs().includes(tab)?tab:'overview';this.source=model.source;this.discard();
    const entry=model.entries.find(e=>e.key===key);this.picked=entry?.key??'';if(entry&&(entry.item.slot!=='weapon'||entry.item.hero===id))this.single={key:entry.key,item:entry.item};
    from?.close();this.render();this.content().scrollTop=0;this.show();this.focus(this.id(`character-tab-${this.tab}`));
  }
  refresh():void{if(this.open)this.render();}
  openStarFor(id:string,trigger:HTMLButtonElement):void {if(!this.host.model()?.camp)return;this.openFor(id,'develop',trigger);if(this.open){this.starReturn={focus:this.id('character-star-open'),scroll:0,tab:'develop'};this.starOpen=true;this.render();this.content().scrollTop=0;this.focus(this.id('star-status'));}}
  upgraded(p:Profile,event:ProfileEvent,saved:boolean):void {if(this.starOpen&&this.stars.upgraded(p,event,saved))this.focusAfterStar='star-status';}
  skillCommitted(p:Profile,event:ProfileEvent,saved:boolean):void{this.skillReview.committed(p,event,saved);}
  private backSkillReview():void{this.skillReview.clear();this.render();this.content().scrollTop=this.skillReturn.scroll;this.focus(this.dialog.querySelector('#'+this.skillReturn.focus)?this.skillReturn.focus:this.id('skills-'+this.skillSection));}
  private focusAfterStar='';
  private backStar():void {
    if(this.stars.reviewing){this.stars.cancel();this.render();this.content().scrollTop=0;this.focus(this.id('star-review'));return;}
    this.starOpen=false;this.stars.open(this.heroId);this.tab=this.starReturn.tab;this.render();this.content().scrollTop=this.starReturn.scroll;this.focus(this.starReturn.focus||this.id('character-star-open'));
  }
  resumeFromForge():boolean {
    const model=this.host.model(),back=this.forgeReturn;this.forgeReturn=undefined;
    if(!back||!model?.available||!model.ids.includes(this.heroId))return false;
    this.source=model.source;this.discard();this.render();this.show();
    this.content().scrollTop=back.scroll;
    (this.dialog.querySelector<HTMLElement>(`#${back.focus}`)??this.dialog.querySelector<HTMLElement>(`#${this.id(`character-tab-${this.tab}`)}`))?.focus({preventScroll:true});
    return true;
  }
  private click(b:HTMLButtonElement):void{
    const model=this.host.model();if(!model)return;const action=b.dataset.world;
    if(this.talentDialog.open&&!this.talentDialog.contains(b))return;
    if(this.skillReview.active&&!['skill-review-confirm','skill-review-back','character-close'].includes(action??''))return;
    if(b.hasAttribute('data-gear-reset')){Object.assign(this.filters,newGearFilters());this.render();this.focus(this.id('gear-filter-set'));return;}
    if(action==='character-forge'&&model.camp&&this.host.forge){this.forgeReturn={focus:b.id||this.id('character-tab-gear'),scroll:this.content().scrollTop};this.dialog.close();this.host.forge(this.heroId,Number(b.dataset.uid));return;}
    if(action==='character-star-open'&&model.camp){this.starReturn={focus:b.id,scroll:this.content().scrollTop,tab:this.tab};this.tab='develop';this.starOpen=true;this.stars.open(this.heroId);this.render();this.content().scrollTop=0;this.focus(this.id('star-status'));return;}
    if(action==='star-back'){this.backStar();return;}
    if(action==='star-cancel'){this.stars.cancel();this.render();this.content().scrollTop=0;this.focus(this.id('star-review'));return;}
    if(action==='star-next'){this.stars.open(this.heroId);this.render();this.content().scrollTop=0;this.focus(this.id('star-status'));return;}
    if(action==='star-review'||action==='star-confirm'){
      if(!this.starOpen||!model.available||!model.camp||!model.starProfile||!this.host.upgrade)return;
      if(action==='star-review')this.stars.reviewFor(model.starProfile);else this.stars.confirm(model.starProfile,id=>this.host.upgrade!(id));
      this.render();this.content().scrollTop=0;this.focus(this.id('star-status'));return;
    }
    if(action==='skill-review-back'){this.backSkillReview();return;}
    if(action==='skill-review-confirm'){if(model.available&&model.camp&&model.skillProfile)this.skillReview.confirm(model.skillProfile,c=>{if(c.kind==='level')this.host.skillLevel?.(c.id,c.action);else this.host.tomeTrade?.(c.line,c.size,c.to);});this.render();this.content().scrollTop=0;this.focus(this.id('skill-review-status'));return;}
    if(action==='talent-detail-close'){this.closeTalentDetail();return;}
    if(action==='skill-select'||action==='skill-from-node'){this.talentDialog.close();if(b.dataset.skill)this.selectedSkill=b.dataset.skill as ActionId;this.tab='skills';const back=action==='skill-from-node'&&this.skillNodeReturn?.skill===this.selectedSkill?this.skillNodeReturn:undefined;this.skillNodeReturn=undefined;this.skillSection='details';this.skillReview.clear();const keep=this.content().scrollTop;this.render();this.content().scrollTop=action==='skill-select'?keep:back?.scroll??0;if(action==='skill-select'){this.dialog.querySelector<HTMLElement>('#'+b.id)?.focus({preventScroll:true});}else this.focus(back?.focus??this.id('skill-selection'));return;}
    if(action==='skill-section'&&model.camp){this.skillScroll[this.skillSection]=this.content().scrollTop;this.skillSection=b.dataset.section as SkillSection;this.skillReview.clear();this.render();this.content().scrollTop=this.skillScroll[this.skillSection]??0;this.focus(this.id('skills-'+this.skillSection));return;}
    if(action==='skill-to-node'){this.skillNodeReturn={skill:this.selectedSkill,scroll:this.content().scrollTop,focus:b.id};this.tab='talents';this.node=b.dataset.node!;this.skillReview.clear();this.render();this.dialog.querySelector(`#${this.id('character-talent-'+this.node)}`)?.scrollIntoView({block:'center'});this.focus(this.id('character-talent-'+this.node));this.showTalentDetail(this.id('character-talent-'+this.node));return;}
    if(action==='character-close'){this.dialog.close();return;}
    if(action==='character-tab'){const tab=b.dataset.tab as CharacterTab;if(!this.visibleTabs().includes(tab))return;this.tab=tab;if(tab==='skills')this.skillSection='details';this.discard();this.render();this.content().scrollTop=0;this.focus(this.id(`character-tab-${this.tab}`));return;}
    if(action==='character-member'){this.rememberVisit();this.heroId=b.dataset.hero!;this.filters.slot='all';this.picked='';this.node='';this.skillNodeReturn=undefined;this.skillScroll={};this.discard();this.render();this.content().scrollTop=0;this.focus(this.id(`character-member-${this.heroId}`));return;}
    if(action==='comparison-back'){this.cancelTrial();return;}
    if(!model.available||this.source!==model.source)return;
    if(action==='talent-pick'){this.node=b.dataset.node!;const def=this.map.talents[this.heroId]?.find(n=>n.id===this.node);if(def&&'unlock'in def.effect)this.selectedSkill=def.effect.unlock;else if(def?.choice&&skillCatalogue(this.map,this.heroes.find(h=>h.id===this.heroId)!,this.hero(model)).includes(def.choice as ActionId))this.selectedSkill=def.choice as ActionId;this.showTalentDetail(b.id);}
    else if(action==='character-talent'&&b.getAttribute('aria-disabled')!=='true'){this.host.talent(this.heroId,b.dataset.node as TalentNode);this.focus(b.id);}
    else if(action==='character-loadout'&&b.getAttribute('aria-disabled')!=='true'){
      // Big skill trees (A6): toggle one unlocked skill in or out of the battle loadout (at least one stays).
      const skill=b.dataset.skill as ActionId,now:ActionId[]=this.hero(model).actions.filter(a=>a!=='attack');
      const next=now.includes(skill)?now.filter(a=>a!==skill):[...now,skill];
      if(next.length&&next.length<=this.map.progression.loadoutSize)this.host.loadout?.(this.heroId,next);this.focus(this.id(`character-loadout-${skill}`));}
    else if((action==='skill-level'||action==='tome-trade')&&b.getAttribute('aria-disabled')!=='true'&&model.skillProfile){this.skillReturn={focus:b.id,scroll:this.content().scrollTop};this.skillReview.start(model.skillProfile,action==='skill-level'?{kind:'level',id:this.heroId,action:b.dataset.level as ActionId}:{kind:'trade',line:b.dataset.line as TomeLine,size:b.dataset.size as TomeSize,...b.dataset.to?{to:b.dataset.to as TomeLine}:{}});this.render();this.content().scrollTop=0;this.focus(this.id('skill-review-status'));}
    else if(action==='character-reset'){if(b.dataset.confirm!=='true'){b.dataset.confirm='true';b.textContent='ยืนยันคืนแต้มทั้งหมดและคืนชุดสกิลเริ่มต้น';return;}this.host.reset?.(this.heroId);this.focus(this.id('character-tab-talents'));}
    else if(action==='bag-slot'){const slot=b.dataset.slot as GearSlot;this.filters.slot=this.filters.slot===slot?'all':slot;this.render();this.focus(this.id(`bag-slot-${slot}`));}
    else if(action==='bag-pick'){this.picked=b.dataset.key!;this.render();this.focus(b.id);}
    else if(action==='gear-chip'){const chip=b.dataset.chip;if(chip==='all')Object.assign(this.filters,{...newGearFilters(),slot:this.filters.slot});else if(chip==='compatible')this.filters.compatible=!this.filters.compatible;else if(chip==='found')this.filters.source=this.filters.source==='found'?'all':'found';else if(chip==='boss')this.filters.kind=this.filters.kind==='boss'?'all':'boss';this.render();this.focus(b.id);}
    else if(action==='bag-wear'){const slot=model.entries.find(e=>e.key===b.dataset.key)?.item.slot;this.host.wear(this.heroId,b.dataset.key!);if(slot)this.focus(this.id(`bag-slot-${slot}`));}
    else if(action==='bag-takeoff'&&this.filters.slot!=='all'){this.host.takeOff(this.heroId,this.filters.slot);this.focus(this.id(`bag-slot-${this.filters.slot}`));}
    else if(action==='bag-compare'){const entry=model.entries.find(e=>e.key===b.dataset.key);if(entry&&(entry.item.slot!=='weapon'||entry.item.hero===this.heroId)){this.single={key:entry.key,item:entry.item};this.plan=undefined;this.render();this.content().scrollTop=0;this.focus(this.id('comparison-back'));}}
    else if(action==='auto-preview'){
      this.autoExpanded=true;
      this.single=undefined;this.plan=planEquipment(this.map,this.template,this.heroes.find(h=>h.id===this.heroId)!,model.state.members[this.heroId]!,model.entries,this.goal,this.preferred,levelOf(this.map,model.state));
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
    if(this.source!==model.source){this.single=undefined;this.plan=undefined;this.source=model.source;}
    const id=this.heroId,h=this.hero(model),m=model.state.members[id]!,base=this.heroes.find(v=>v.id===id)!,focus=this.dialog.contains(document.activeElement)?(document.activeElement as HTMLElement).id:'',scroll=this.content().scrollTop;
    this.dialog.querySelector(`#${this.id('character-title')}`)!.textContent=`${heroText[id]!.name} · Lv${levelOf(this.map,model.state)} · ★${m.stars}`;
    const picker=this.dialog.querySelector<HTMLElement>(`#${this.id('character-members')}`)!,left=picker.scrollLeft;
    picker.innerHTML=this.ids(model.ids.map(c=>{const member=model.state.members[c]!,free=talentPoints(this.map,member,c,levelOf(this.map,model.state))-talentsSpent(member.talents);return `<button id="character-member-${c}" data-world="character-member" data-hero="${c}" class="tree-member" aria-pressed="${c===id}" aria-label="${heroText[c]!.name} · แต้มเหลือ ${free}">${portrait(c)}<small>${heroText[c]!.name}</small>${free?`<i>+${free}</i>`:''}</button>`;}).join(''));picker.scrollLeft=left;
    this.dialog.style.setProperty('--character-tab-count',String(this.visibleTabs().length));
    this.dialog.querySelector(`#${this.id('character-tabs')}`)!.innerHTML=this.ids(this.visibleTabs().map(tab=>`<button id="character-tab-${tab}" data-world="character-tab" data-tab="${tab}" role="tab" aria-controls="character-content" aria-selected="${tab===this.tab}" tabindex="${tab===this.tab?0:-1}">${icon(characterTabIcons[tab as CharacterTab])}<span>${characterTabs[tab]}</span></button>`).join(''));
    const position=model.state.roster.deployed.includes(id)?`ตัวหลักช่อง ${model.state.roster.deployed.indexOf(id)+1}`:model.state.roster.reserve.includes(id)?'สำรอง':'ในค่าย';
    // A deployed member shows the lane it stands in (formation); others their class lane.
    const lane=formation(model.state.roster,c=>this.heroes.find(v=>v.id===c)?.lane??'front')[id]??h.lane;
    if(!skillCatalogue(this.map,base,h).includes(this.selectedSkill))this.selectedSkill=h.actions.find(a=>a!=='attack')??'attack';
    let html=this.tab==='skills'?'':`<p class="character-summary">${heroText[id]!.role} · ${lane==='front'?'แนวหน้า':'แนวหลัง'} · ${position} · ${model.camp?'ค่ายหลัก · เลือดพร้อมออกเดินทาง':'HP'} ${model.state.hp[id]??0}/${h.maxHp}</p>`;
    html+=this.tab==='overview'?characterOverview(model.state,this.map,h,this.template,!!model.starProfile):this.tab==='develop'?this.develop(model):this.tab==='talents'?talentsView(model,this.map,this.template,h,base,this.node):this.tab==='skills'?skillsView(model,this.map,this.template,h,base,this.selectedSkill,this.skillSection):this.gear(model,h);
    let dock='';if(this.skillReview.active&&model.skillProfile){const page=this.skillReview.render(model.skillProfile);html=page.body;dock=page.dock;}
    this.dialog.toggleAttribute('data-skill-review',this.skillReview.active);
    if(this.starOpen&&this.tab==='develop'){
      const page=model.starProfile?this.stars.render(model.starProfile,model.starSources):{body:'<p class="star-warning">อัปดาวได้ที่ค่ายเมื่อระบบจัดทีมเปิดแล้ว</p>',dock:'<button id="star-back" data-world="star-back" class="secondary">กลับหน้าพัฒนา</button>'};html=page.body;dock=page.dock;
    }
    const dockElement=this.dialog.querySelector<HTMLElement>(`#${this.id('character-dock')}`)!;dockElement.hidden=!dock;dockElement.innerHTML=this.ids(dock);
    this.dialog.classList.toggle('has-star-page',this.starOpen&&this.tab==='develop');
    this.dialog.toggleAttribute('data-star-review',this.starOpen&&this.stars.reviewing);
    // Read folded panels before replacing them: a camp re-render can land before their async toggle event.
    const tome=this.content().querySelector<HTMLDetailsElement>('.tome-trade');if(tome)this.tomeExpanded=tome.open;
    const was=this.content().querySelector<HTMLDetailsElement>('.gear-extra-filters'),wasAuto=this.content().querySelector<HTMLDetailsElement>('.auto-settings');if(was)this.filtersExpanded=was.open;if(wasAuto)this.autoExpanded=wasAuto.open;
    this.content().setAttribute('aria-labelledby',this.id(`character-tab-${this.tab}`));this.content().innerHTML=this.ids(html);
    const detail=this.talentDialog.querySelector<HTMLElement>('.talent-detail-content')!;detail.replaceChildren();
    if(this.tab==='talents'){
      const card=this.content().querySelector<HTMLElement>('.node-card'),link=this.content().querySelector<HTMLElement>('[data-world=skill-from-node]');
      if(card){const points=this.content().querySelector('.talent-points')?.cloneNode(true) as HTMLElement|undefined;if(points){points.classList.remove('talent-points');points.classList.add('talent-detail-points');detail.append(points);}detail.append(card);if(link)detail.append(link);}
    }else this.talentDialog.close();
    const auto=this.content().querySelector<HTMLDetailsElement>('.auto-settings'),extra=this.content().querySelector<HTMLDetailsElement>('.gear-extra-filters');if(auto)auto.open=this.autoExpanded;if(extra)extra.open=this.filtersExpanded;
    const trade=this.content().querySelector<HTMLDetailsElement>('.tome-trade');if(trade)trade.open=this.tomeExpanded;
    this.content().scrollTop=scroll;if(this.open&&focus&&(!this.talentDialog.open||this.talentDialog.querySelector('#'+focus)))this.focus(focus);if(this.open&&this.focusAfterStar){this.focus(this.id(this.focusAfterStar));this.focusAfterStar='';}
  }
  private develop(model:CharacterModel):string {
    const m=model.state.members[this.heroId]!,level=levelOf(this.map,model.state);
    return `<section class="character-develop"><h3>พัฒนา${heroText[this.heroId]!.name}</h3><p>Lv${level} · ใช้เลเวลค่ายร่วม ทุกคนเติบโตพร้อมกัน</p><button id="character-star-open" data-world="character-star-open" class="primary">${icon('starBadge')}อัปดาว · ★${m.stars} / ${this.map.company.maxStars}</button><p>ดาวของคนนี้ · เศษที่สะสม ${m.shards}</p></section>`;
  }
  private gear(model:CharacterModel,h:HeroDefinition):string{
    const trial=this.plan?.choices.length?this.host.previewPlan(this.plan):this.single?this.host.preview(this.heroId,this.single.key):undefined;
    if(trial){const items=this.plan?this.plan.choices.map(c=>c.item):this.single!.item;return (this.plan?`<p class="auto-summary">ชุดแนะนำ: ${autoGoalText[this.goal]}${this.preferred?` · เน้นชุด${setText[this.preferred]}`:''} · เปลี่ยน ${this.plan.choices.length} ช่อง</p>`:'')+characterEquipmentComparison(model.state,trial.state,this.map,h,this.hero(trial),items,this.template,model.camp);}
    const m=model.state.members[this.heroId]!,slot=this.filters.slot,worn=slot==='all'?undefined:m.gear?.[slot],entries=filteredEquipment(model.entries,this.filters,this.heroId),sets=wornSets(this.map.equipment,m.gear),full=model.camp&&model.entries.length>=(model.capacity??this.map.equipment.bagCap);
    // Paper doll (ART-UI-MODERN-001): weapon/body/boots left, head/gloves/charm right, the hero between them.
    const slotButton=(sl:GearSlot)=>{const it=m.gear?.[sl];return `<button id="bag-slot-${sl}" data-world="bag-slot" data-slot="${sl}" class="gear-slot doll-slot" ${it?`data-rarity="${it.rarity}"`:''} aria-pressed="${slot===sl}" aria-label="${slotText[sl]}: ${it?`${itemName(it)} Lv${it.level}`:'ว่าง'}">${it?gearArt(it):icon(slotIcon[sl])}<b>${slotText[sl]}</b><small class="sr-only">${it?`${itemName(it)} Lv${it.level}`:'ว่าง'}</small></button>`;};
    const slots=`<div class="doll-col">${(['weapon','body','boots'] as const).map(slotButton).join('')}</div><div class="doll-hero">${heroArt(this.heroId)}</div><div class="doll-col">${(['head','gloves','charm'] as const).map(slotButton).join('')}</div>`;
    const dollStats=`<div class="doll-stats"><span class="ui-pill">${icon('stat-hp')}${model.state.hp[this.heroId]??0}/${h.maxHp}</span><span class="ui-pill">${icon('stat-attack')}${h.attack}</span><span class="ui-pill">${icon('stat-support')}${h.skillBonus??0}%</span><span class="ui-pill">${icon('stat-speed')}${h.speed}</span></div>`;
    // Bag (ART-UI-MODERN-001 board 01): a five-column grid of tiles; the picked tile opens one item card with ▲▼ against what is worn.
    const pick=entries.find(e=>e.key===this.picked)??entries[0],own=(e:EquipmentEntry)=>e.item.slot!=='weapon'||e.item.hero===this.heroId;
    const tiles=entries.map(e=>`<li data-rarity="${e.item.rarity}" data-item-key="${e.key}"><button id="pick-${e.key.replace(':','-')}" data-world="bag-pick" data-key="${e.key}" class="bag-tile${own(e)?'':' foreign'}" aria-pressed="${e===pick}">${gearArt(e.item)}<b class="tile-lv">Lv${e.item.level}</b>${e.item.plus?`<i class="tile-plus">+${e.item.plus}</i>`:''}${own(e)?'':icon('act-lock')}<span class="sr-only">${itemName(e.item)} · ${itemLines(this.map.equipment,e.item).join(' · ')} · ${e.label} · ${itemOwner(e.item)}</span></button></li>`).join('');
    const chip=(id:string,label:string,on:boolean)=>`<button id="gear-chip-${id}" data-world="gear-chip" data-chip="${id}" class="ui-chip" aria-pressed="${on}">${label}</button>`;
    const plain=this.filters.set==='all'&&this.filters.rarity==='all'&&this.filters.source==='all'&&!this.filters.compatible&&(this.filters.kind??'all')==='all';
    const chips=`<div class="gear-chips">${chip('all','ทั้งหมด',plain)}${chip('compatible','ใช้ได้',this.filters.compatible)}${model.camp?'':chip('found','เจอรอบนี้',this.filters.source==='found')}${chip('boss','ของบอส',this.filters.kind==='boss')}</div>`;
    return `<div class="character-gear"><p class="gear-stats sr-only">${heroStatLine(h,model.state.hp[this.heroId])}</p><div class="gear-slots paperdoll">${slots}</div>${dollStats}${sets.length?`<ul class="gear-sets">${sets.map(v=>`<li><b>ชุด${v.name} ${v.pieces}/4</b><small class="${v.pieces>=2?'on':''}">2 ชิ้น: ${v.two}</small><small class="${v.pieces>=4?'on':''}">4 ชิ้น: ${v.four}</small></li>`).join('')}</ul>`:''}${worn?`<section class="item-card gear-detail worn-card" aria-label="${slotText[slot as GearSlot]}ที่สวมอยู่"><div class="item-card-head">${gearArt(worn)}<div><small data-rarity="${worn.rarity}">${rarityText[worn.rarity]} · ${slotText[worn.slot]} · สวมอยู่</small><b>${itemName(worn)}</b><small>Lv${worn.level}${worn.plus?` +${worn.plus}`:''} · ${itemLines(this.map.equipment,worn).join(' · ')}</small></div></div><div class="item-card-actions"><button id="bag-takeoff" data-world="bag-takeoff" class="secondary"${model.available&&!full?'':' disabled'}>${icon('act-remove')}ถอด</button>${model.camp?`<button id="character-forge-worn" data-world="character-forge" data-uid="${worn.uid}" class="secondary">${icon('tab-forge')}พัฒนา</button>`:''}</div>${full?'<small>คลังเต็ม · ใส่ชิ้นใหม่แทนได้ หรือแยกชิ้นที่ไม่ใช้ในกระเป๋าก่อนถอด</small>':''}</section>`:''}
      <div class="bag-head"><h3>กระเป๋า <small>${entries.length}/${model.entries.length}</small></h3>${slot==='all'?'':`<span class="ui-pill">${icon(slotIcon[slot])}${slotText[slot]}</span>`}</div>${chips.replace('</div>',`${gearFilters(this.filters,'',this.heroId,true)}</div>`)}${tiles?`<ul class="gear-bag bag-grid">${tiles}</ul>${pick?this.itemCard(model,h,pick):''}`:'<p class="camp-note">ไม่พบอุปกรณ์ตามตัวกรอง · ล้างตัวกรองเพื่อดูทั้งหมด</p>'}
      <details class="auto-settings"><summary>สวมใส่อัตโนมัติ · จัดชุดแนะนำ</summary><div class="gear-filter-grid"><label>แนวทาง<select id="auto-goal">${AUTO_GOALS.map(g=>`<option value="${g}"${g===this.goal?' selected':''}>${autoGoalText[g]}</option>`).join('')}</select></label><label>เซ็ตที่ต้องการ<select id="auto-set"><option value="">ไม่เจาะจง</option>${SET_IDS.map(s=>`<option value="${s}"${s===this.preferred?' selected':''}>ชุด${setText[s]}</option>`).join('')}</select></label></div><p class="camp-note">ใช้ของที่ใส่อยู่และของในกระเป๋าทั้งหมด ไม่ขึ้นกับตัวกรอง ไม่ถอดของคนอื่น เลือกเซ็ตจะเน้นให้ครบสูงสุด 4 ชิ้นก่อน แล้วจัดค่าสถานะตามแนวทาง เป็นชุดแนะนำ ไม่ใช่ดาเมจรับประกัน</p><button id="auto-preview" data-world="auto-preview" class="primary"${model.available?'':' disabled'}>จัดชุดและดูผลก่อนใส่</button>${this.plan&&!this.plan.choices.length?'<p class="auto-empty" role="status">ชุดปัจจุบันเหมาะกับแนวทางนี้แล้ว ไม่มีรายการที่แนะนำให้เปลี่ยน</p>':''}</details>
      <p class="camp-note">${model.camp?'จัดของในค่ายสำหรับการเดินทางครั้งถัดไป':'ใส่ได้ทุกที่นอกการต่อสู้ · ถ้าทีมล้มหมด ของที่เจอรอบนี้เก็บกลับได้เฉพาะชิ้นที่ดีที่สุด'}</p></div>`;
  }
  // The picked bag item: name, level/+/owner and the stat changes wearing it would make (the same trial
  // projection as the comparison page, so nothing is saved), then Wear / Details / Develop.
  private itemCard(model:CharacterModel,h:HeroDefinition,e:EquipmentEntry):string{
    const it=e.item,locked=it.slot==='weapon'&&it.hero!==this.heroId,key=e.key.replace(':','-'),worn=model.state.members[this.heroId]!.gear?.[it.slot];
    const trial=locked?undefined:this.host.preview(this.heroId,e.key),after=trial&&this.hero(trial);
    const deltas=after?statDeltas.map(([k,name,unit])=>{const a=h[k]??0,b=after[k]??0;return b===a?'':`<span class="item-delta">${icon(`stat-${k==='maxHp'?'hp':k==='skillBonus'?'support':k==='speed'?'speed':k}` as Parameters<typeof icon>[0])}<b>${b}${unit}</b><em class="${b>a?'up':'down'}" aria-label="${name} ${b>a?'เพิ่ม':'ลด'} ${Math.abs(b-a)}${unit}">${b>a?'▲':'▼'} ${Math.abs(b-a)}${unit}</em></span>`;}).join(''):'';
    return `<section class="item-card" data-rarity="${it.rarity}" aria-label="ไอเท็มที่เลือก"><div class="item-card-head">${gearArt(it)}<div><small data-rarity="${it.rarity}">${rarityText[it.rarity]} · ${slotText[it.slot]}${it.set?` · ชุด${setText[it.set]}`:''}</small><b>${itemName(it)}</b><small>Lv${it.level}${it.plus?` +${it.plus}`:''} · ${itemOwner(it)} · ${e.label}</small></div>${it.locked?`<span class="item-lock" aria-label="ล็อกอยู่">${icon('act-lock')}</span>`:''}</div>
      ${locked?'':`<div class="item-deltas">${deltas||'<span class="item-delta same">ค่าต่อสู้เท่าเดิม</span>'}<small>${worn?'เทียบที่สวม':'ช่องว่าง'}</small></div>`}<small class="item-lines">${itemLines(this.map.equipment,it).join(' · ')}</small>
      <div class="item-card-actions"><button id="wear-${key}" data-world="bag-wear" data-key="${e.key}" class="primary"${locked||!model.available?' disabled':''}>${locked?'คนอื่นใช้':`${icon('act-confirm')}สวมใส่`}</button><button id="compare-${key}" data-world="bag-compare" data-key="${e.key}" class="secondary"${locked?' disabled':''}>${icon('act-compare')}รายละเอียด</button>${model.camp?`<button data-world="character-forge" data-uid="${it.uid}" class="secondary">${icon('tab-forge')}พัฒนา</button>`:''}</div></section>`;
  }
}
