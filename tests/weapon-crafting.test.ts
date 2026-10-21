import {expect,it} from 'vitest';
import {chapterOne as map} from '../src/content/world/chapter1';
import {encounterById as lookup} from '../src/content/encounters/catalog';
import {newProfile,equip,depart,salvage} from '../src/core/world/profile';
import {heroCatalog} from '../src/core/world/world';
import {craftWeapon,weaponBlueprint,weaponCraftCost,weaponCraftReason,enhanceTo,raiseItemLevel,fuse,fusionRefund} from '../src/core/world/forge';
import {itemValid} from '../src/core/world/equipment';
import {parseGame,saveGame} from '../src/core/save/expedition-save';
const setup=()=>({...newProfile(map,17),tutorialDone:true,forgeLevel:10,bank:{ore:1000,dust:1000,gold:30,seal:2}});
it('crafts a valid fixed starter for every owned class, including bench/support classes, without touching loot or RNG',()=>{
  const p=setup(),ids=heroCatalog(lookup,map).map(h=>h.id);p.company=ids;p.members=Object.fromEntries(ids.map(id=>[id,{stars:1,dupes:0}]));p.hunt={target:'guardian',pity:{guardian:11,healer:4}};const before=structuredClone(p);
  for(const id of ids){const out=craftWeapon(p,map,id,10);expect(out.event).toEqual({type:'forged',uid:1,action:'craft'});expect(out.profile.items).toEqual([weaponBlueprint(map,id,10,1)]);expect(itemValid(map,out.profile.items[0]!,ids)).toBe(true);expect(out.profile.items[0]).toMatchObject({rarity:1,q:{main:100,affixes:[100]},affixes:[map.equipment.supportHeroes.includes(id)?'support':'attack']});expect(out.profile.items[0]!.set).toBeUndefined();expect(out.profile.forge).toBe(p.forge);expect(out.profile.seed).toBe(p.seed);expect(out.profile.hunt).toEqual(p.hunt);expect(out.profile.party).toEqual(p.party);}
  expect(p).toEqual(before);
});
it('pays the displayed cost atomically, allocates one UID, and roundtrips v25 including equipped active-run provenance',()=>{
  const p=setup();expect(weaponCraftCost(map,1)).toEqual({ore:18,dust:4});expect(weaponCraftCost(map,6)).toEqual({ore:48,dust:9});
  let out=craftWeapon(p,map,'guardian',6).profile;expect(out.bank).toEqual({...p.bank,ore:952,dust:991});expect(out.nextItem).toBe(2);expect(out.items[0]!.investment).toBeUndefined();expect(out.items[0]!.levelInvestment).toBeUndefined();expect(out).toEqual(craftWeapon(p,map,'guardian',6).profile);
  out=equip(out,'guardian',1).profile;const game=depart(out,map,lookup,77);let raw='';saveGame({getItem:()=>null,setItem:(_k,v)=>{raw=v;}},game);expect(JSON.parse(raw).version).toBe(28);expect(parseGame(raw,map,lookup)).toEqual(game);
});
it('blocks invalid choices, insufficient funds, full or pending storage and exhausted UIDs before any mutation',()=>{
  const p=setup();for(const level of [0,-1,1.5,11,NaN,Infinity])expect(craftWeapon(p,map,'guardian',level).profile).toBe(p);
  expect(craftWeapon(p,map,'unowned',1).profile).toBe(p);const cap={...p,forgeLevel:3};expect(craftWeapon(cap,map,'guardian',4).profile).toBe(cap);
  for(const [ore,dust] of [[17,4],[18,3]]){const poor={...p,bank:{...p.bank,ore:ore!,dust:dust!}};expect(craftWeapon(poor,map,'guardian',1).profile).toBe(poor);}
  const pending={...p,overflow:[weaponBlueprint(map,'guardian',1,1)],nextItem:2};expect(weaponCraftReason(pending,map,'guardian',1)).toBe('pending');expect(craftWeapon(pending,map,'guardian',1).profile).toBe(pending);
  const full={...p,items:Array.from({length:60},(_,n)=>weaponBlueprint(map,'guardian',1,n+1)),nextItem:61};expect(weaponCraftReason(full,map,'guardian',1)).toBe('bag');expect(craftWeapon(full,map,'guardian',1).profile).toBe(full);full.storageTier=1;expect(craftWeapon(full,map,'guardian',1).profile.items).toHaveLength(61);
  const exhausted={...p,nextItem:Number.MAX_SAFE_INTEGER};expect(craftWeapon(exhausted,map,'guardian',1).profile).toBe(exhausted);
});
it('returns only base salvage for manufacture, refunds subsequent development once, and cannot generate resources through recycling or fusion',()=>{
  for(let level=1;level<=10;level++){const p=setup(),made=craftWeapon(p,map,'guardian',level).profile,back=salvage(made,map,[1]).profile;expect(back.bank.ore).toBeLessThan(p.bank.ore);expect(back.bank.dust).toBeLessThan(p.bank.dust);expect(salvage(back,map,[1]).profile).toBe(back);}
  const p=setup();let made=craftWeapon(p,map,'guardian',1).profile;made=raiseItemLevel(enhanceTo(made,map,1,2).profile,map,1,3).profile;const back=salvage(made,map,[1]).profile;expect(back.bank).toEqual({...p.bank,ore:p.bank.ore-18+3,dust:p.bank.dust-4+2});
  made=craftWeapon(craftWeapon(craftWeapon(p,map,'guardian',1).profile,map,'guardian',1).profile,map,'guardian',1).profile;expect(fusionRefund(made,map,[2,3])).toEqual({ore:0,dust:0});const fused=fuse(made,map,1,[2,3]).profile;expect(fused.items).toHaveLength(1);expect(fused.items[0]!.rarity).toBe(2);expect(fused.bank).toEqual(made.bank);
});
