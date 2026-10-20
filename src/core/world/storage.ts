import type {Item, MapDefinition, Profile, ProfileResult} from './types';
import {salvageValue} from './equipment';
export type StorageSource='bag'|'overflow';
export const storageCap=(p:Pick<Profile,'storageTier'>,map:MapDefinition):number=>map.equipment.bagCap+(p.storageTier??0)*map.equipment.storage.step;
export const storageItems=(p:Profile,source:StorageSource):readonly Item[]=>source==='bag'?p.items:p.overflow??[];
export const protectedItem=(i:Item):boolean=>!!(i.locked||i.plus||i.investment?.ore||i.investment?.dust||i.levelInvestment?.ore||i.levelInvestment?.dust);
export const departureBlocked=(p:Profile):boolean=>!!p.overflow?.length;
const blocked=(p:Profile,reason:string):ProfileResult=>({profile:p,event:{type:'blocked',reason}});
function selected(p:Profile,source:StorageSource,ids:readonly number[]):Item[]|undefined {
  if(!ids.length||new Set(ids).size!==ids.length)return;
  const list=storageItems(p,source).filter(i=>ids.includes(i.uid));return list.length===ids.length?list:undefined;
}
export function collectOverflow(p:Profile,map:MapDefinition,ids:readonly number[]):ProfileResult {
  const list=selected(p,'overflow',ids);if(!list)return blocked(p,'unknown');
  if(p.items.length+list.length>storageCap(p,map))return blocked(p,'full');
  const profile=structuredClone(p);profile.items.push(...profile.overflow!.filter(i=>ids.includes(i.uid)));profile.overflow=profile.overflow!.filter(i=>!ids.includes(i.uid));
  return {profile,event:{type:'storageCollected',count:list.length}};
}
export function recycleSelection(p:Profile,map:MapDefinition,source:StorageSource,ids:readonly number[]):ProfileResult {
  const list=selected(p,source,ids);if(!list)return blocked(p,'unknown');
  if(list.some(protectedItem))return blocked(p,'protected');
  const total=list.reduce((v,i)=>{const n=salvageValue(map,i);return {ore:v.ore+n.ore,dust:v.dust+n.dust};},{ore:0,dust:0});
  if(p.bank.ore+total.ore>9999999||p.bank.dust+total.dust>9999999)return blocked(p,'full');
  const profile=structuredClone(p);if(source==='bag')profile.items=profile.items.filter(i=>!ids.includes(i.uid));else profile.overflow=(profile.overflow??[]).filter(i=>!ids.includes(i.uid));
  profile.bank.ore+=total.ore;profile.bank.dust+=total.dust;
  return {profile,event:{type:'salvaged',count:list.length,...total}};
}
export function expandStorage(p:Profile,map:MapDefinition):ProfileResult {
  const cost=map.equipment.storage.costs[p.storageTier??0];if(cost===undefined)return blocked(p,'maxed');
  if(p.bank.gold<cost)return blocked(p,'gold');const profile=structuredClone(p);profile.bank.gold-=cost;profile.storageTier=(profile.storageTier??0)+1;
  return {profile,event:{type:'storageExpanded'}};
}
