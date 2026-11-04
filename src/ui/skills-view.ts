import type { ActionId, EncounterDefinition, HeroDefinition } from '../core/battle/types';
import type { MapDefinition } from '../core/world/types';
import { skillChoices } from '../core/world/world';
import { skillLevelOf } from '../core/world/tomes';
import { isBigTree, talentsSpent } from '../core/world/talents';
import { characterSkills, characterTalents, tomeSection } from './character-view';
import type { CharacterModel } from './character-panel';
import { icon } from './icons';
export type SkillSection='details'|'tree'|'tomes';
export function skillCatalogue(map:MapDefinition,base:HeroDefinition,h:HeroDefinition):ActionId[]{return [...new Set<ActionId>(['attack',...base.actions,...h.actions,...(base.unlocks?[base.unlocks.skill]:[]),...(map.talents[h.id]??[]).flatMap(n=>'unlock'in n.effect?[n.effect.unlock]:[])])];}
export function skillsView(model:CharacterModel,map:MapDefinition,template:EncounterDefinition,h:HeroDefinition,base:HeroDefinition,selected:ActionId,section:SkillSection,node:string):string{
  const m=model.state.members[h.id]!,now:ActionId[]=h.actions.filter(a=>a!=='attack'),size=map.progression.loadoutSize;
  const choices=skillChoices(base,map,m.talents,m.grants),canUse=choices.includes(selected)||(base.unlocks?.skill===selected&&h.actions.includes(selected)),on=now.includes(selected);
  const why=!isBigTree(map.talents[h.id])?'อาชีพนี้ใช้ชุดสกิลตามดาว ไม่รองรับเปลี่ยนชุด':selected==='attack'?'โจมตีปกติใช้ได้เสมอ ไม่กินช่อง':!canUse?'ยังไม่ปลดสกิลนี้':on&&now.length<=1?'ต้องติดอย่างน้อย 1 สกิล':!on&&now.length>=size?`ติดครบ ${size} ช่องแล้ว ถอดสกิลอื่นก่อน`:'';
  const nodes=map.talents[h.id]??[],unlock=nodes.find(n=>'unlock'in n.effect&&n.effect.unlock===selected);
  const loadout=`<section class="skills-equipped" aria-label="ชุดสกิลต่อสู้"><div class="loadout-head"><h3>สกิลที่ติดตั้ง</h3><span>${now.length}/${size} ช่อง</span></div><div class="skills-slots">${now.map(a=>`<button id="skill-select-${a}" data-world="skill-select" data-skill="${a}" class="secondary" aria-pressed="${a===selected}">${icon(a)}<span>${template.skills[a].name}</span></button>`).join('')}</div><p class="camp-note">โจมตีปกติ + สกิลที่ติดตั้ง · เปลี่ยนได้เมื่ออยู่นอกการต่อสู้</p></section>`;
  const picker=`<label class="skills-picker">เลือกสกิล<select id="skill-selection" data-skill-selection>${skillCatalogue(map,base,h).map(a=>`<option value="${a}"${a===selected?' selected':''}>${template.skills[a].name}${a==='attack'?' · พื้นฐาน':` · Lv${skillLevelOf(m,a)}${now.includes(a)?' · ติดตั้ง':choices.includes(a)?' · พร้อมใช้':' · ยังล็อก'}`}</option>`).join('')}</select></label>`;
  const nav=`<div class="skills-sections" role="group" aria-label="ส่วนของสกิล">${Object.entries({details:'ติดตั้ง / เพิ่ม Lv',tree:'ผังสกิล',tomes:'ตำรา'}).map(([key,label])=>`<button id="skills-${key}" data-world="skill-section" data-section="${key}" class="secondary" aria-pressed="${section===key}">${label}</button>`).join('')}</div>`;
  const details=`${characterSkills(h,base,m.stars,template,map,m,model.tomes,selected)}<div class="skill-install"><button id="character-loadout-${selected}" data-world="character-loadout" data-skill="${selected}" class="secondary" aria-pressed="${on}" aria-disabled="${!!why||!model.available}">${on?'ถอดจากชุด':'ติดตั้งสกิลนี้'}</button><p class="camp-note">${why||'เปลี่ยนชุดฟรี ไม่ใช้ตำราหรือแต้ม'}</p>${unlock?`<button id="skill-to-node" data-world="skill-to-node" data-node="${unlock.id}" class="secondary">${icon('tab-tree')}ไปโหนด ${unlock.name}</button>`:''}</div>`;
  const chosen=nodes.find(n=>n.id===node),related=chosen&&'unlock'in chosen.effect?chosen.effect.unlock:undefined;
  const tree=`${characterTalents(model.state,map,h.id,template,h,base,node,true)}${related?`<button id="skill-from-node" data-world="skill-from-node" data-skill="${related}" class="secondary">ดู ${template.skills[related].name} / กลับไปติดตั้งและเพิ่ม Lv</button>`:'<button id="skill-from-node" data-world="skill-section" data-section="details" class="secondary">กลับไปสกิลที่เลือก</button>'}${model.camp?`<button id="character-reset" data-world="character-reset" class="secondary"${talentsSpent(m.talents)?'':' disabled'}>รีเซ็ตแต้มฟรีที่ครูฝึก · คืนชุดสกิลเริ่มต้น</button>`:''}`;
  const tomes=model.tomes?.open?tomeSection(map,h.id,model.tomes):`<p class="camp-note">${model.camp?'ตำราศึกเปิดหลังจบแมพ 2 (เส้นทางป่าทึบ)':'เพิ่ม Lv และแลกตำราได้ที่ค่ายเมื่อระบบเปิดแล้ว'}</p>`;
  return `<section class="skills-page">${loadout}${picker}${nav}<div class="skills-section" data-section="${section}">${section==='details'?details:section==='tree'?tree:tomes}</div></section>`;
}
