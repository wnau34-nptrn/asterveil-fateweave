import type {BossPower} from '../battle/types';
import type {BossPlan,Item,MapDefinition,Profile,ProfileResult} from './types';
import {rollItem} from './equipment';
import {SET_IDS} from './types';

export const BOSS_POWERS:readonly BossPower[]=['aegis','focus','lantern'];
export const isBossPower=(value:unknown):value is BossPower=>BOSS_POWERS.includes(value as BossPower);
export function startBossPlan(p:Profile,map:MapDefinition):BossPlan {
  return {version:1,boss:map.bossEncounterId,...(p.bossLoot?.[map.bossEncounterId]??{target:'aegis',misses:0,rewarded:false})};
}
export function chooseBossTarget(p:Profile,map:MapDefinition,target:BossPower):ProfileResult {
  if(!isBossPower(target))return {profile:p,event:{type:'blocked',reason:'unknown'}};
  const before=startBossPlan(p,map);
  if(before.target===target)return {profile:p,event:{type:'blocked',reason:'unchanged'}};
  const profile=structuredClone(p);profile.bossLoot??={};
  profile.bossLoot[map.bossEncounterId]={target,misses:before.misses,rewarded:before.rewarded};
  return {profile,event:{type:'bossTarget'}};
}
// One independent, domain-separated stream supplied by the victory reducer. Never advances ordinary loot or weapon pity.
export function bossReward(map:MapDefinition,plan:BossPlan,roll:()=>number,level:number):Item|undefined {
  const rules=map.equipment.boss;
  if(plan.rewarded&&plan.misses+1<rules.pity&&roll()>=rules.chance){plan.misses++;return;}
  const item=rollItem(map.equipment,roll,level,[0,0,0,0,1],map.startingRoster,SET_IDS);
  item.slot='charm';delete item.hero;delete item.special;
  const pool=[...map.equipment.affixPools.charm],first=({aegis:'hp',focus:'attack',lantern:'support'} as const)[plan.target];
  item.affixes=[first];pool.splice(pool.indexOf(first),1);
  while(item.affixes.length<map.equipment.affixCount[4]!)item.affixes.push(pool.splice((roll()*7919+roll())%pool.length,1)[0]!);
  // rollItem may have chosen another slot. Rebuild exactly three independent affix qualities.
  const quality=()=>map.equipment.quality[0]+roll()%(map.equipment.quality[1]-map.equipment.quality[0]+1);
  item.q={main:quality(),affixes:item.affixes.map(quality)};item.boss=plan.target;
  plan.rewarded=true;plan.misses=0;return item;
}
export function bossPlanValid(value:unknown,map:MapDefinition):value is BossPlan {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const p=value as BossPlan;
  return Object.keys(p).length===5&&p.version===1&&p.boss===map.bossEncounterId&&isBossPower(p.target)
    &&Number.isInteger(p.misses)&&p.misses>=0&&p.misses<map.equipment.boss.pity&&typeof p.rewarded==='boolean'&&(p.rewarded||p.misses===0);
}
