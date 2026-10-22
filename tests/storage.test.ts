import {expect,it} from 'vitest';
import {chapterOne as map} from '../src/content/world/chapter1';
import {encounterById as lookup} from '../src/content/encounters/catalog';
import {newProfile,depart,settle,dismiss,unequip} from '../src/core/world/profile';
import {collectOverflow,departureBlocked,expandStorage,protectedItem,recycleSelection,storageCap} from '../src/core/world/storage';
import {parseGame,saveGame} from '../src/core/save/expedition-save';
import type {Item} from '../src/core/world/types';
const item=(uid:number,patch:Partial<Item>={}):Item=>({uid,slot:'body',rarity:0,level:1,affixes:[],...patch});
const full=()=>({...newProfile(map,4),tutorialDone:true,items:Array.from({length:60},(_,n)=>item(n+1)),nextItem:61});
it('stores excess found and returned owned gear without automatic destruction or currency grants',()=>{
  const p=full();p.members.tracer!.gear={head:item(61,{slot:'head',locked:true,plus:2,investment:{ore:9,dust:2},levelInvestment:{ore:20,dust:2}})};p.nextItem=62;
  const game=depart(p,map,lookup,8),run=game.run;run.spare=[run.members.tracer!.gear!.head!];delete run.members.tracer!.gear!.head;run.members.tracer!.gear!.head=item(0,{slot:'head'});run.found=[item(0)];
  const out=settle(p,run,'withdrawn',map);expect(out.items).toHaveLength(60);expect(out.overflow).toEqual([p.members.tracer!.gear!.head,item(63)]);expect(out.members.tracer!.gear!.head!.uid).toBe(62);expect(out.bank).toEqual(p.bank);expect(out.last).toMatchObject({items:2,salvaged:0});expect(p.overflow).toEqual([]);
});
it('dismissal preserves locked invested items in the pending tray when the bag is full',()=>{
  const p=full(),gear=item(61,{locked:true,investment:{ore:9,dust:2}});p.members.tracer!.gear={body:gear};p.nextItem=62;
  const out=dismiss(p,map,'tracer').profile;expect(out.overflow).toEqual([gear]);expect(out.items).toHaveLength(60);expect(out.bank.ore).toBe(0);expect(departureBlocked(out)).toBe(true);expect(()=>depart(out,map,lookup,8)).toThrow('overflow');
});
it('collects chosen overflow atomically with duplicate, stale and capacity validation',()=>{
  const p={...newProfile(map,4),overflow:[item(1,{locked:true}),item(2,{plus:1,investment:{ore:4,dust:1}})],nextItem:3};
  const out=collectOverflow(p,map,[2]).profile;expect(out.items).toEqual([p.overflow[1]]);expect(out.overflow).toEqual([p.overflow[0]]);expect(out.bank).toEqual(p.bank);
  for(const ids of [[],[1,1],[999],[1,999]])expect(collectOverflow(p,map,ids).profile).toBe(p);
  const packed={...full(),overflow:[item(61)],nextItem:62};expect(collectOverflow(packed,map,[61]).profile).toBe(packed);
});
it('bulk recycle protects locks and investment and pays selected source exactly once',()=>{
  const p={...newProfile(map,4),items:[item(1)],overflow:[item(2),item(3,{locked:true}),item(4,{levelInvestment:{ore:20,dust:2}}),item(5,{investment:{ore:4,dust:1}}),item(6,{plus:1})],nextItem:7};
  for(const id of [3,4,5,6]){expect(protectedItem(p.overflow.find(i=>i.uid===id)!)).toBe(true);expect(recycleSelection(p,map,'overflow',[2,id]).profile).toBe(p);}
  const out=recycleSelection(p,map,'overflow',[2]).profile;expect(out.items).toEqual(p.items);expect(out.overflow!.map(i=>i.uid)).toEqual([3,4,5,6]);expect(out.bank).toMatchObject({ore:2,dust:1});expect(recycleSelection(out,map,'overflow',[2]).profile).toBe(out);
  const cap={...p,bank:{...p.bank,dust:9999999}};expect(recycleSelection(cap,map,'overflow',[2]).profile).toBe(cap);expect(recycleSelection(p,map,'bag',[2]).profile).toBe(p);
});
it('expansion is permanent, bounded and changes actual unequip capacity without auto-collecting',()=>{
  const p=full();p.bank.gold=1400;p.members.tracer!.gear={body:item(61)};p.nextItem=62;expect(unequip(p,map,'tracer','body').profile).toBe(p);
  let out=expandStorage(p,map).profile;expect(storageCap(out,map)).toBe(90);expect(out.bank.gold).toBe(1200);out=unequip(out,map,'tracer','body').profile;expect(out.items).toHaveLength(61);
  out=expandStorage(expandStorage(out,map).profile,map).profile;expect(storageCap(out,map)).toBe(150);expect(out.bank.gold).toBe(0);expect(expandStorage(out,map).profile).toBe(out);
  const poor=newProfile(map,4);expect(expandStorage(poor,map).profile).toBe(poor);
});
it('v24 roundtrips pending locks/ledgers and expanded capacity; v23 migrates without item changes',()=>{
  const p=full();p.bank.gold=200;const out=expandStorage(p,map).profile;out.items.push(item(61));out.overflow=[item(62,{locked:true,levelInvestment:{ore:20,dust:2}})];out.nextItem=63;
  let raw='';saveGame({getItem:()=>null,setItem:(_k,s)=>{raw=s;}},{profile:out,run:null});expect(JSON.parse(raw).version).toBe(36);expect(parseGame(raw,map,lookup).profile).toEqual(out);
  for(const mutate of [(s:typeof out)=>{s.storageTier=4;},(s:typeof out)=>{s.overflow![0]!.uid=1;},(s:typeof out)=>{s.overflow![0]!.levelInvestment!.ore=-1;},(s:typeof out)=>{s.storageTier=0;}]){const bad=structuredClone(out);mutate(bad);expect(()=>parseGame(JSON.stringify({version:24,profile:bad,run:null}),map,lookup)).toThrow();}
  const old=full(),migrated=parseGame(JSON.stringify({version:23,profile:old,run:null}),map,lookup).profile;expect(migrated.items).toEqual(old.items);expect(migrated.storageTier).toBe(0);expect(migrated.overflow).toEqual([]);
});
it('active expedition provenance and wipe retention remain unchanged with an expanded store',()=>{
  const p=full();p.bank.gold=200;const expanded=expandStorage(p,map).profile,game=depart(expanded,map,lookup,9);let raw='';saveGame({getItem:()=>null,setItem:(_k,s)=>{raw=s;}},game);expect(parseGame(raw,map,lookup)).toEqual(game);
  game.run.found=[item(0),item(0,{level:3})];const out=settle(expanded,game.run,'wiped',map);expect(out.items).toHaveLength(61);expect(out.items.at(-1)!.level).toBe(3);expect(out.overflow).toEqual([]);
});
