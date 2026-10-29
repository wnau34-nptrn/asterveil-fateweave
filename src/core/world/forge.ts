import type { Item, MapDefinition, Profile, ProfileResult } from './types';
import { affixPool, enhancementInvestment, GEAR_SPECIALS, RARITIES, rollQuality } from './equipment';
import { storageCap } from './storage';
import { rollPercent } from './world';

// Forge (2D-4): enhance, fuse and reroll in the lobby. Pure rules on the profile. Fuse and reroll draw from
// (seed, forge), so a reload cannot change a result once it is saved. Items may sit in the bag or be worn.
const blocked = (profile: Profile, reason: string): ProfileResult => ({ profile, event: { type: 'blocked', reason } });
// Finds a bag or worn item by uid (in the given profile, so a clone can be edited in place).
export function findItem(profile: Profile, uid: number): { item: Item; owner?: string } | undefined {
  const bag = profile.items.find(i => i.uid === uid); if (bag) return { item: bag };
  for (const [owner, m] of Object.entries(profile.members)) for (const item of Object.values(m.gear ?? {})) if (item?.uid === uid) return { item, owner };
  return undefined;
}
// ---- Enhance: always succeeds ----
export function enhanceCost(map: MapDefinition, item: Item): { ore: number; dust: number } | undefined {
  const f = map.equipment.forge; const next = (item.plus ?? 0) + 1;
  return next > f.plusCap[item.rarity]! ? undefined : { ore: f.ore + f.orePerPlus * next, dust: Math.ceil(next * f.dustPerPlus) };
}
export function enhanceReason(profile: Profile, map: MapDefinition, uid: number): string {
  const found = findItem(profile, uid); if (!found) return 'unknown';
  const cost = enhanceCost(map, found.item); if (!cost) return 'maxed';
  return profile.bank.ore < cost.ore ? 'ore' : profile.bank.dust < cost.dust ? 'dust' : '';
}
export function enhancementCostTo(map:MapDefinition,item:Item,target:number):{ore:number;dust:number}|undefined {
  if(!Number.isInteger(target)||target<=(item.plus??0)||target>map.equipment.forge.plusCap[item.rarity]!)return;
  let ore=0,dust=0;for(let n=(item.plus??0)+1;n<=target;n++){const f=map.equipment.forge;ore+=f.ore+f.orePerPlus*n;dust+=Math.ceil(n*f.dustPerPlus);}
  return {ore,dust};
}
export function enhanceTo(initial:Profile,map:MapDefinition,uid:number,target:number):ProfileResult {
  const found=findItem(initial,uid);if(!found)return blocked(initial,'unknown');
  const cost=enhancementCostTo(map,found.item,target);if(!cost)return blocked(initial,'maxed');
  if(initial.bank.ore<cost.ore||initial.bank.dust<cost.dust)return blocked(initial,initial.bank.ore<cost.ore?'ore':'dust');
  const paid=enhancementInvestment(map,found.item);if(!Number.isSafeInteger(paid.ore+cost.ore)||!Number.isSafeInteger(paid.dust+cost.dust))return blocked(initial,'unknown');
  const profile=structuredClone(initial),item=findItem(profile,uid)!.item;
  profile.bank.ore-=cost.ore;profile.bank.dust-=cost.dust;item.plus=target;item.investment={ore:paid.ore+cost.ore,dust:paid.dust+cost.dust};
  return {profile,event:{type:'forged',uid,action:'enhance'}};
}
export function enhance(initial: Profile, map: MapDefinition, uid: number): ProfileResult {
  return enhanceTo(initial,map,uid,(findItem(initial,uid)?.item.plus??0)+1);
}
export function lockEquipment(initial:Profile,uid:number):ProfileResult {
  if(!findItem(initial,uid))return blocked(initial,'unknown');
  const profile=structuredClone(initial),item=findItem(profile,uid)!.item;
  if(item.locked)delete item.locked;else item.locked=true;
  return {profile,event:{type:'equipmentLocked',uid,locked:!!item.locked}};
}
// ---- Fuse: the main piece (bag or worn) plus bag pieces of the same slot and rarity → one rarity up ----
// The main piece keeps its class, level, set and affixes, gains affixes up to the new rarity's count (a legendary
// also gains a special) and keeps its full enhance level. The other pieces are used up.
export function fuseMaterials(profile: Profile, map: MapDefinition, uid: number): Item[] {
  const main = findItem(profile, uid)?.item; if (!main) return [];
  // The cheapest matching bag pieces go first: lowest enhance, then lowest level.
  return profile.items.filter(i => i.uid !== uid && !i.boss && i.transferSlot===undefined && !i.locked && !(i.plus??0) && !i.investment?.ore && !i.investment?.dust && !i.levelInvestment?.ore && !i.levelInvestment?.dust && i.slot === main.slot && i.rarity === main.rarity)
    .sort((a, b) => (a.plus ?? 0) - (b.plus ?? 0) || a.level - b.level || a.uid - b.uid).slice(0, map.equipment.forge.fuseCount - 1);
}
export function fuseReason(profile: Profile, map: MapDefinition, uid: number, donors?:readonly number[]): string {
  const main = findItem(profile, uid)?.item; if (!main) return 'unknown';
  if (main.rarity >= RARITIES - 1) return 'maxed';
  const ids=donors??fuseMaterials(profile,map,uid).map(i=>i.uid);
  if(ids.length!==map.equipment.forge.fuseCount-1||new Set(ids).size!==ids.length)return 'materials';
  const used=ids.map(id=>profile.items.find(i=>i.uid===id));
  if(used.some(i=>!i||i.uid===uid||i.boss||i.locked||i.slot!==main.slot||i.rarity!==main.rarity))return 'materials';
  const refund=fusionRefund(profile,map,ids);
  return profile.bank.ore+refund.ore>9999999||profile.bank.dust+refund.dust>9999999?'full':'';
}
export function fuse(initial: Profile, map: MapDefinition, uid: number, donors?:readonly number[]): ProfileResult {
  const reason = fuseReason(initial, map, uid,donors); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const used = donors?[...donors]:fuseMaterials(profile, map, uid).map(i => i.uid);
  const refund=fusionRefund(profile,map,used);profile.bank.ore+=refund.ore;profile.bank.dust+=refund.dust;
  const { item } = findItem(profile, uid)!; const roll = () => rollPercent(profile.seed ^ 0x6f726765, profile.forge++);
  item.investment=enhancementInvestment(map,item);
  item.rarity++;
  const pool = affixPool(map.equipment, item.slot, item.hero).filter(a => !item.affixes.includes(a));
  const q = item.q ?? { main: 100, affixes: item.affixes.map(() => 100) };
  while (item.affixes.length < map.equipment.affixCount[item.rarity]! && pool.length) { item.affixes.push(pool.splice((roll() * 7919 + roll()) % pool.length, 1)[0]!); q.affixes.push(rollQuality(map.equipment, roll)); }
  item.q = q;
  if (item.rarity === RARITIES - 1) item.special = GEAR_SPECIALS[(roll() * 7919 + roll()) % GEAR_SPECIALS.length]!;

  profile.items = profile.items.filter(i => !used.includes(i.uid));
  return { profile, event: { type: 'forged', uid, action: 'fuse' } };
}
// ---- Reroll: one chosen affix becomes a different one the piece does not have yet, with a fresh roll quality ----
export function rerollReason(profile: Profile, map: MapDefinition, uid: number, index: number): string {
  const item = findItem(profile, uid)?.item; if (!item || !Number.isInteger(index) || !item.affixes[index]) return 'unknown';
  if (!affixPool(map.equipment, item.slot, item.hero).some(a => !item.affixes.includes(a))) return 'maxed';
  return profile.bank.seal < map.equipment.forge.rerollSeals ? 'seal' : '';
}
export function reroll(initial: Profile, map: MapDefinition, uid: number, index: number): ProfileResult {
  const reason = rerollReason(initial, map, uid, index); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const { item } = findItem(profile, uid)!;
  const pool = affixPool(map.equipment, item.slot, item.hero).filter(a => !item.affixes.includes(a)); const roll = () => rollPercent(profile.seed ^ 0x6f726765, profile.forge++);
  item.affixes[index] = pool[(roll() * 7919 + roll()) % pool.length]!;
  const q = item.q ?? { main: 100, affixes: item.affixes.map(() => 100) }; q.affixes[index] = rollQuality(map.equipment, roll); item.q = q;
  profile.bank.seal -= map.equipment.forge.rerollSeals;
  return { profile, event: { type: 'forged', uid, action: 'reroll' } };
}

// ---- Smelt: ore into veil dust at a poor rate, capped per return home (owner-approved 2026-10-16). ----
export const smeltLeft = (profile: Profile, map: MapDefinition): number => Math.max(0, map.equipment.forge.smeltCap - profile.smelted);
export function smeltReason(profile: Profile, map: MapDefinition, dust: number): string {
  if (!Number.isInteger(dust) || dust < 1) return 'unknown';
  if (dust > smeltLeft(profile, map)) return 'limit';
  return profile.bank.ore < dust * map.equipment.forge.smeltOre ? 'ore' : '';
}
export function smelt(initial: Profile, map: MapDefinition, dust: number): ProfileResult {
  const reason = smeltReason(initial, map, dust); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial);
  profile.bank.ore -= dust * map.equipment.forge.smeltOre; profile.bank.dust += dust; profile.smelted += dust;
  return { profile, event: { type: 'smelted', dust } };
}

// Only actual paid development is returned for consumed donors; their base salvage is not paid.
export function fusionRefund(profile:Profile,map:MapDefinition,ids:readonly number[]):{ore:number;dust:number} {
  return ids.reduce((total,id)=>{const i=profile.items.find(i=>i.uid===id);if(!i)return total;const paid=enhancementInvestment(map,i);return {ore:total.ore+paid.ore+(i.levelInvestment?.ore??0),dust:total.dust+paid.dust+(i.levelInvestment?.dust??0)};},{ore:0,dust:0});
}
export const itemLevelCap=(p:Profile,map:MapDefinition):number=>p.forgeLevel??map.equipment.forge.itemLevel.baseCap;
export function itemLevelCost(map:MapDefinition,item:Item,target:number):{ore:number;dust:number}|undefined {
  if(!Number.isInteger(target)||target<=item.level||target>99)return;
  const rules=map.equipment.forge.itemLevel;let ore=0,dust=0;
  for(let n=item.level+1;n<=target;n++){ore+=rules.orePerLevel*n;dust+=rules.dustPerLevel;}
  return {ore,dust};
}
export function raiseItemLevel(initial:Profile,map:MapDefinition,uid:number,target:number):ProfileResult {
  const found=findItem(initial,uid);if(!found)return blocked(initial,'unknown');
  const cost=itemLevelCost(map,found.item,target);if(!cost||target>itemLevelCap(initial,map))return blocked(initial,'level');
  if(initial.bank.ore<cost.ore||initial.bank.dust<cost.dust)return blocked(initial,initial.bank.ore<cost.ore?'ore':'dust');
  const paid=found.item.levelInvestment??{ore:0,dust:0};
  if(!Number.isSafeInteger(paid.ore+cost.ore)||!Number.isSafeInteger(paid.dust+cost.dust))return blocked(initial,'unknown');
  const profile=structuredClone(initial),item=findItem(profile,uid)!.item;
  profile.bank.ore-=cost.ore;profile.bank.dust-=cost.dust;item.level=target;
  item.levelInvestment={ore:paid.ore+cost.ore,dust:paid.dust+cost.dust};
  return {profile,event:{type:'forged',uid,action:'level'}};
}

// Fixed starter weapon: no RNG, set or paid-development credit. Higher-tier/set rewards remain farmed.
export function weaponBlueprint(map:MapDefinition,hero:string,level:number,uid=0):Item {
  return {uid,slot:'weapon',hero,rarity:1,level,affixes:[map.equipment.supportHeroes.includes(hero)?'support':'attack'],q:{main:100,affixes:[100]}};
}
export function weaponCraftCost(map:MapDefinition,level:number):{ore:number;dust:number}|undefined {
  if(!Number.isInteger(level)||level<1||level>99)return;const c=map.equipment.forge.craft;
  return {ore:c.ore+c.orePerLevel*(level-1),dust:c.dust+c.dustPerLevel*(level-1)};
}
export function weaponCraftReason(p:Profile,map:MapDefinition,hero:string,level:number):string {
  if(!p.company.includes(hero))return 'unknown';
  const cost=weaponCraftCost(map,level);if(!cost||level>itemLevelCap(p,map))return 'level';
  if(p.overflow?.length)return 'pending';
  if(p.items.length>=storageCap(p,map))return 'bag';
  if(p.bank.ore<cost.ore)return 'ore';if(p.bank.dust<cost.dust)return 'dust';
  if(!Number.isSafeInteger(p.nextItem+1))return 'full';return '';
}
export function craftWeapon(initial:Profile,map:MapDefinition,hero:string,level:number):ProfileResult {
  const reason=weaponCraftReason(initial,map,hero,level);if(reason)return blocked(initial,reason);
  const profile=structuredClone(initial),cost=weaponCraftCost(map,level)!,uid=profile.nextItem++;
  profile.items.push(weaponBlueprint(map,hero,level,uid));profile.bank.ore-=cost.ore;profile.bank.dust-=cost.dust;
  return {profile,event:{type:'forged',uid,action:'craft'}};
}

// Transfer names + roll quality, never a donor's level, set, main quality or legendary effect.
export function transferCandidate(map:MapDefinition,main:Item,index:number,donor:Item,sourceIndex:number):Item|undefined {
  if(donor.boss||main.uid===donor.uid||main.slot!==donor.slot||(main.slot==='weapon'&&main.hero!==donor.hero))return;
  if(!Number.isInteger(index)||!main.affixes[index]||(main.transferSlot!==undefined&&main.transferSlot!==index)||!Number.isInteger(sourceIndex)||!donor.affixes[sourceIndex])return;
  const stat=donor.affixes[sourceIndex]!,quality=donor.q?.affixes[sourceIndex]??100;
  if(!affixPool(map.equipment,main.slot,main.hero).includes(stat)||main.affixes.some((v,i)=>i!==index&&v===stat))return;
  if(main.affixes[index]===stat&&(main.q?.affixes[index]??100)===quality)return;
  const out=structuredClone(main);out.q??={main:100,affixes:out.affixes.map(()=>100)};out.affixes[index]=stat;out.q.affixes[index]=quality;out.transferSlot=index;return out;
}
export function transferReason(p:Profile,map:MapDefinition,uid:number,index:number,donorUid:number,sourceIndex:number):string {
  const main=findItem(p,uid)?.item,donor=p.items.find(i=>i.uid===donorUid);
  if(!main||!donor||donor.locked||!transferCandidate(map,main,index,donor,sourceIndex))return 'materials';
  const c=map.equipment.forge.transfer;if(p.bank.ore<c.ore)return 'ore';if(p.bank.dust<c.dust)return 'dust';if(p.bank.seal<c.seal)return 'seal';
  const refund=fusionRefund(p,map,[donorUid]);return p.bank.ore-c.ore+refund.ore>9999999||p.bank.dust-c.dust+refund.dust>9999999?'full':'';
}
export function transferAffix(initial:Profile,map:MapDefinition,uid:number,index:number,donorUid:number,sourceIndex:number):ProfileResult {
  const reason=transferReason(initial,map,uid,index,donorUid,sourceIndex);if(reason)return blocked(initial,reason);
  const candidate=transferCandidate(map,findItem(initial,uid)!.item,index,initial.items.find(i=>i.uid===donorUid)!,sourceIndex)!;
  const profile=structuredClone(initial),c=map.equipment.forge.transfer,refund=fusionRefund(initial,map,[donorUid]);
  Object.assign(findItem(profile,uid)!.item,candidate);profile.items=profile.items.filter(i=>i.uid!==donorUid);
  profile.bank.ore+=refund.ore-c.ore;profile.bank.dust+=refund.dust-c.dust;profile.bank.seal-=c.seal;
  return {profile,event:{type:'forged',uid,action:'transfer'}};
}
