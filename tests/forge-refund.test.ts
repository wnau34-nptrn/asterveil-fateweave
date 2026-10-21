import { expect, it } from 'vitest';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { newProfile, equip, salvage, depart, dismiss } from '../src/core/world/profile';
import { enhance, enhanceTo, enhancementCostTo, lockEquipment, fuse, fuseMaterials, findItem } from '../src/core/world/forge';
import { enhancementInvestment, salvageValue, itemValid } from '../src/core/world/equipment';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import type { Item } from '../src/core/world/types';
const item=(uid:number,patch:Partial<Item>={}):Item=>({uid,slot:'body',rarity:0,level:1,affixes:[],...patch});
const setup=()=>({...newProfile(map,17),tutorialDone:true,items:[item(1),item(2),item(3)],nextItem:4,bank:{ore:1000,dust:1000,gold:50,seal:3}});
it('credits legacy remaining + and returns paid ore/dust exactly once with base salvage',()=>{
  const p=setup();p.items=[item(1,{plus:5})];const credit=enhancementInvestment(map,p.items[0]!);
  expect(credit).toEqual({ore:30,dust:9});expect(salvageValue(map,p.items[0]!)).toEqual({ore:32,dust:10});
  const raw=JSON.stringify({version:21,profile:p,run:null}),old=parseGame(raw,map,lookup);expect(old.profile.items).toEqual(p.items);
  const out=salvage(old.profile,map,[1]);expect(out.profile.bank.ore).toBe(p.bank.ore+32);expect(out.profile.items).toEqual([]);
  expect(salvage(out.profile,map,[1]).profile).toBe(out.profile);expect(p.items).toHaveLength(1);
});
it('batch enhancement equals sequential payment and is atomic on insufficient funds or invalid targets',()=>{
  const p=setup(),copy=structuredClone(p),cost=enhancementCostTo(map,p.items[0]!,5)!;
  let sequential=p;for(let i=0;i<5;i++)sequential=enhance(sequential,map,1).profile;
  const out=enhanceTo(p,map,1,5).profile;expect(out).toEqual(sequential);expect(out.items[0]!.investment).toEqual(cost);expect(p).toEqual(copy);expect(out.forge).toBe(p.forge);
  for(const target of [0,6,-1,1.5,Infinity])expect(enhanceTo(p,map,1,target).profile).toBe(p);
  const poor={...p,bank:{...p.bank,dust:cost.dust-1}};expect(enhanceTo(poor,map,1,5).profile).toBe(poor);
  const retired=salvage(out,map,[1]).profile;expect(retired.bank.ore).toBe(p.bank.ore+2);expect(retired.bank.dust).toBe(p.bank.dust+1);
});
it('locks block mixed salvage and automatic fusion, but permit safe enhancement and equipment swaps',()=>{
  const p=lockEquipment(setup(),2).profile;expect(p.items[1]!.locked).toBe(true);expect(salvage(p,map,[1,2]).profile).toBe(p);
  expect(fuseMaterials(p,map,1)).toHaveLength(1);expect(fuse(p,map,1).profile).toBe(p);
  const q=enhanceTo(p,map,2,1).profile;expect(q.items[1]!.locked).toBe(true);expect(q.items[1]!.investment).toEqual({ore:4,dust:1});
  const worn=equip(q,'guardian',2).profile;expect(worn.members.guardian!.gear!.body!.locked).toBe(true);
  const unlock=lockEquipment(worn,2).profile;expect(findItem(unlock,2)!.item.locked).toBeUndefined();expect(p.items[1]!.investment).toBeUndefined();
});
it('preserves the paid ledger through full-plus fusion and excludes zero-plus invested donors',()=>{
  const p=enhanceTo(setup(),map,1,1).profile,credit=p.items[0]!.investment;
  const out=fuse(p,map,1).profile;expect(out.items[0]!.plus).toBe(1);expect(out.items[0]!.investment).toEqual(credit);
  const fresh={...out,items:[item(4,{rarity:1,affixes:['hp']}),item(5,{rarity:1,affixes:['armour']}),out.items[0]!],nextItem:6};
  expect(fuseMaterials(fresh,map,4).map(i=>i.uid)).toEqual([5]);
  const again=enhanceTo(out,map,1,2).profile;expect(again.items[0]!.investment).toEqual({ore:9,dust:2});
  const recycled=salvage(again,map,[1]).profile;expect(recycled.bank.ore).toBe(p.bank.ore+4+map.equipment.salvage[1]!.ore);
});
it('round-trips locks and exact credits through departure, run item ownership and v23 persistence',()=>{
  let p=lockEquipment(enhanceTo(setup(),map,1,3).profile,1).profile;p=equip(p,'guardian',1).profile;
  const game=depart(p,map,lookup,23);let raw='';saveGame({getItem:()=>null,setItem:(_k,s)=>{raw=s;}},game);
  expect(JSON.parse(raw).version).toBe(31);const back=parseGame(raw,map,lookup);expect(back).toEqual(game);
  const changed=JSON.parse(raw);changed.run.members.guardian.gear.body.investment.ore++;expect(()=>parseGame(JSON.stringify(changed),map,lookup)).toThrow();
  const legacy=JSON.parse(raw);legacy.version=21;delete legacy.profile.members.guardian.gear.body.investment;delete legacy.run.members.guardian.gear.body.investment;
  const migrated=parseGame(JSON.stringify(legacy),map,lookup);expect(migrated.run!.members.guardian!.gear).toEqual(migrated.profile.members.guardian!.gear);
});
it('rejects malformed ledgers/locks and preserves locked equipment when dismissing into a full bag',()=>{
  const ids=Object.keys(setup().members);
  for(const patch of [{locked:false},{investment:{ore:-1,dust:0}},{investment:{ore:1.5,dust:0}},{investment:{ore:0,dust:0,extra:1}},{investment:null}])expect(itemValid(map,{...item(1),...patch} as Item,ids)).toBe(false);
  let p=setup();p=equip(lockEquipment(p,1).profile,'tracer',1).profile;p.items=Array.from({length:map.equipment.bagCap},(_,i)=>item(i+5));p.nextItem=100;
  expect(dismiss(p,map,'tracer').profile.overflow).toEqual([expect.objectContaining({uid:1,locked:true})]);
  p.items.pop();const out=dismiss(p,map,'tracer').profile;expect(out.items.some(i=>i.uid===1&&i.locked)).toBe(true);expect(out.items).toHaveLength(map.equipment.bagCap);
});

it('rejects duplicate, missing and wallet-overflow recycling atomically',()=>{
  const p=setup();expect(salvage(p,map,[1,1]).profile).toBe(p);expect(salvage(p,map,[1,99]).profile).toBe(p);
  const full={...p,bank:{...p.bank,ore:9999999}};expect(salvage(full,map,[1]).profile).toBe(full);expect(full.items).toHaveLength(3);
});
