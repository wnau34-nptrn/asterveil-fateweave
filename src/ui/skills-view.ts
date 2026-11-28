import type { ActionId, EncounterDefinition, HeroDefinition } from '../core/battle/types';
import type { MapDefinition } from '../core/world/types';
import { skillChoices } from '../core/world/world';
import { isBigTree, talentsSpent } from '../core/world/talents';
import { characterTalents, skillCard, skillExtras, tomeSection } from './character-view';
import type { CharacterModel } from './character-panel';
import { icon } from './icons';
export type SkillSection='details'|'tomes';
export function skillCatalogue(map:MapDefinition,base:HeroDefinition,h:HeroDefinition):ActionId[]{return [...new Set<ActionId>(['attack',...base.actions,...h.actions,...(base.unlocks?[base.unlocks.skill]:[]),...(map.talents[h.id]??[]).flatMap(n=>'unlock'in n.effect?[n.effect.unlock]:[])])];}
export function skillsView(model:CharacterModel,map:MapDefinition,template:EncounterDefinition,h:HeroDefinition,base:HeroDefinition,selected:ActionId,section:SkillSection,replacing?:ActionId,lockedOpen=false,levelOpen:ReadonlySet<ActionId>=new Set()):string{
  // Owner 2026-11-28 (“ตามแนะนำ”): every skill is a card with its details and an install button on the right;
  // locked skills fold at the end with a link to their node; installing into a full loadout picks the slot to replace.
  const m=model.state.members[h.id]!,now:ActionId[]=h.actions.filter(a=>a!=='attack'),size=map.progression.loadoutSize,big=isBigTree(map.talents[h.id]);
  const choices=skillChoices(base,map,m.talents,m.grants),canUse=(a:ActionId)=>choices.includes(a)||(base.unlocks?.skill===a&&h.actions.includes(a));
  const nodes=map.talents[h.id]??[],nodeOf=(a:ActionId)=>nodes.find(n=>'unlock'in n.effect&&n.effect.unlock===a)??nodes.find(n=>n.choice===a);
  const all=skillCatalogue(map,base,h).filter(a=>a!=='attack'),ready=[...now,...all.filter(a=>!now.includes(a)&&canUse(a))],locked=all.filter(a=>!ready.includes(a));
  const swap=replacing&&big&&!now.includes(replacing)&&canUse(replacing)&&now.length>=size?replacing:undefined;
  const slots=now.map(a=>swap?`<button id="skill-select-${a}" data-world="skill-replace" data-skill="${a}" class="secondary replace-target">${icon(a)}<span>${template.skills[a].name}</span><small>แทนที่</small></button>`:`<button id="skill-select-${a}" data-world="skill-select" data-skill="${a}" class="secondary" aria-pressed="${a===selected}">${icon(a)}<span>${template.skills[a].name}</span></button>`).join('');
  const hint=swap?`<p class="camp-note skills-replace-note" role="status">เลือกช่องที่จะให้ <b>${template.skills[swap].name}</b> แทน</p><button id="skill-replace-cancel" data-world="skill-replace-cancel" class="secondary">ยกเลิก</button>`:`<p class="camp-note">แตะช่องเพื่อไปที่การ์ดสกิล · ลากเพื่อสลับตำแหน่ง (Alt+←/→ บนคีย์บอร์ด) · เปลี่ยนชุดฟรี ไม่ใช้ตำราหรือแต้ม</p>`;
  const loadout=`<section class="skills-equipped${swap?' replacing':''}" aria-label="ชุดสกิลต่อสู้"><div class="loadout-head"><h3>สกิลที่ติดตั้ง</h3><span>${now.length}/${size} ช่อง</span></div><div class="skills-slots">${slots}${Array.from({length:Math.max(0,size-now.length)},()=>'<div class="skills-slot-empty" aria-hidden="true">ช่องว่าง</div>').join('')}</div>${hint}</section>`;
  const off=!model.available?' aria-disabled="true"':'';
  const action=(a:ActionId):string=>{
    if(!big)return '';
    const name=template.skills[a].name;
    if(now.includes(a)){const why=now.length<=1?'ต้องติดอย่างน้อย 1 สกิล':'';return `<button id="character-loadout-${a}" data-world="character-loadout" data-skill="${a}" class="secondary" aria-pressed="true" aria-label="ถอด ${name}"${why?' aria-disabled="true"':off}>ถอด</button>${why?`<small>${why}</small>`:''}`;}
    if(canUse(a))return `<button id="character-loadout-${a}" data-world="${now.length>=size?'skill-replace-start':'character-loadout'}" data-skill="${a}" class="primary" aria-pressed="false" aria-label="ติดตั้ง ${name}"${off}>ติดตั้ง</button>`;
    const node=nodeOf(a);return node?`<button id="skill-to-node-${a}" data-world="skill-to-node" data-node="${node.id}" data-skill="${a}" class="secondary" aria-label="ไปโหนด ${node.name}">${icon('tab-tree')}ไปโหนด</button>`:'';
  };
  const link=(a:ActionId)=>{const node=nodeOf(a);return node&&!(locked as ActionId[]).includes(a)?`<button id="skill-to-node-${a}" data-world="skill-to-node" data-node="${node.id}" data-skill="${a}" class="quiet skill-node-link">${icon('tab-tree')}ไปโหนด ${node.name}</button>`:'';};
  const card=(a:ActionId)=>skillCard(h,base,a,template,map,m,model.tomes,action(a),a===selected,levelOpen.has(a),link(a));
  const nav=model.camp?`<div class="skills-sections" role="group" aria-label="ส่วนของสกิล">${Object.entries({details:'ติดตั้ง / เพิ่ม Lv',tomes:'ตำรา'}).map(([key,label])=>`<button id="skills-${key}" data-world="skill-section" data-section="${key}" class="secondary" aria-pressed="${section===key}">${label}</button>`).join('')}</div>`:'';
  const list=`${big?'':'<p class="camp-note">อาชีพนี้ใช้ชุดสกิลตามดาว ไม่รองรับเปลี่ยนชุด</p>'}<h3 class="skill-list-head">พร้อมใช้ <small>${ready.length}</small></h3><ul class="hire-skills character-skills skill-cards">${ready.map(card).join('')}</ul>${locked.length?`<details class="skills-locked"${lockedOpen?' open':''}><summary>ยังล็อก (${locked.length})</summary><ul class="hire-skills character-skills skill-cards">${locked.map(card).join('')}</ul><p class="camp-note">${big?'ปลดสกิลจากผังสกิล · แต้มตามระบบปัจจุบัน':'ปลดตามดาวของตัวละคร'}</p></details>`:''}<ul class="hire-skills character-skills skill-cards">${card('attack')}</ul>${skillExtras(h,base,m.stars,template,map,m)}`;
  const tomes=model.tomes?.open?tomeSection(map,h.id,model.tomes):`<p class="camp-note">${model.camp?'ตำราศึกเปิดหลังจบแมพ 2 (เส้นทางป่าทึบ)':'เพิ่ม Lv และแลกตำราได้ที่ค่ายเมื่อระบบเปิดแล้ว'}</p>`;
  return `<section class="skills-page">${loadout}${nav}<div class="skills-section" id="skill-description" data-section="${section}">${!model.camp||section==='details'?list:tomes}</div></section>`;
}

export function talentsView(model:CharacterModel,map:MapDefinition,template:EncounterDefinition,h:HeroDefinition,base:HeroDefinition,node:string):string {
  const m=model.state.members[h.id]!,nodes=map.talents[h.id]??[];
  const chosen=nodes.find(n=>n.id===node),related=chosen&&'unlock'in chosen.effect?chosen.effect.unlock:chosen?.choice&&skillCatalogue(map,base,h).includes(chosen.choice as ActionId)?chosen.choice as ActionId:undefined;
  const tree=`${characterTalents(model.state,map,h.id,template,h,base,node,true)}${related?`<button id="skill-from-node" data-world="skill-from-node" data-skill="${related}" class="secondary">ดู ${template.skills[related].name} / ${model.camp?'กลับไปติดตั้งและเพิ่ม Lv':'กลับไปติดตั้งสกิล'}</button>`:'<button id="skill-from-node" data-world="skill-from-node" class="secondary">กลับไปสกิลที่เลือก</button>'}${model.camp?`<button id="character-reset" data-world="character-reset" class="secondary"${talentsSpent(m.talents)?'':' disabled'}>รีเซ็ตแต้มฟรีที่ครูฝึก · คืนชุดสกิลเริ่มต้น</button>`:''}`;
  return `<section class="talents-page">${tree}</section>`;
}
