import type {EquipmentRules,HuntPlan,Item,MapDefinition,Profile,ProfileResult,SetId} from './types';
import {rollItem} from './equipment';
export function chooseHuntTarget(initial:Profile,target?:string):ProfileResult {
  if(target!==undefined&&!initial.company.includes(target))return {profile:initial,event:{type:'blocked',reason:'unknown'}};
  if(initial.hunt?.target===target)return {profile:initial,event:{type:'blocked',reason:'unchanged'}};
  const profile=structuredClone(initial);profile.hunt={pity:{...profile.hunt?.pity},...(target?{target}:{})};
  return {profile,event:{type:'huntTarget'}};
}
export function startHunt(p:Profile):HuntPlan {
  const target=p.hunt?.target;return {misses:target?(p.hunt?.pity[target]??0):0,...(target?{target}:{})};
}
// A target changes class selection, not the chance/quantity/rarity/quality/set of ordinary loot.
// The hard guarantee may replace a non-weapon slot on the threshold drop.
export function huntedReward(rules:EquipmentRules,roll:()=>number,level:number,weights:readonly number[],heroes:readonly string[],sets:readonly SetId[],plan?:HuntPlan):Item {
  const target=plan?.target;
  const item=rollItem(rules,roll,level,weights,heroes,sets,target?{hero:target,bias:rules.hunt.weaponBiasPercent,force:plan.misses+1>=rules.hunt.pityDrops}:undefined);
  if(target)plan!.misses=item.slot==='weapon'&&item.hero===target?0:plan!.misses+1;
  return item;
}
export const huntRemaining=(plan:HuntPlan,map:MapDefinition):number=>Math.max(0,map.equipment.hunt.pityDrops-plan.misses);
