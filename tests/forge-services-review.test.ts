import { describe, expect, it, vi } from 'vitest';
import { ForgeWorkbench } from '../src/ui/forge-workbench';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById } from '../src/content/encounters/catalog';
import { newProfile, salvage } from '../src/core/world/profile';
import { craftWeapon, smelt, weaponBlueprint } from '../src/core/world/forge';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import { heroCatalog } from '../src/core/world/world';
const button=(action:string,extra:Record<string,string>={})=>({dataset:{forge:action,...extra},disabled:false}) as unknown as HTMLButtonElement;
const select=(id:string,value:string)=>({id,value,dataset:{}}) as HTMLSelectElement;
type Service='craft'|'recycle'|'smelt';
function fixture(tab:Service){
 const p=newProfile(map,17);p.bank={ore:120,dust:48,gold:20,seal:3};p.forgeLevel=6;
 p.items=[{uid:1,slot:'body',rarity:1,level:3,affixes:['hp'],plus:2,investment:{ore:9,dust:2},levelInvestment:{ore:20,dust:2},set:'dawn'}];p.nextItem=2;
 const host={enhance:vi.fn(),level:vi.fn(),fuse:vi.fn(),reroll:vi.fn(),transfer:vi.fn(),craft:vi.fn(),lock:vi.fn(),salvage:vi.fn(),smelt:vi.fn()};
 const ui=new ForgeWorkbench(map,heroCatalog(encounterById,map),encounterById(map.tutorialEncounterId)!,host);ui.open(1);ui.render(p);ui.click(button('tasks'),p);ui.click(button('task',{task:tab}),p);ui.render(p);
 return {p,ui,host};
}
describe('craft, recycle and smelt reviews',()=>{
 it.each(['craft','recycle','smelt'] as const)('%s preview/review/cancel/Escape are readonly and return to the same operation',tab=>{
  const {p,ui,host}=fixture(tab),before=structuredClone(p);ui.click(button('review'),p);const html=ui.render(p);
  expect(html).toContain('data-review="true"');expect(html).not.toMatch(/id="forge-(craft-hero|craft-level|target|lock)"/);
  expect(ui.backFromEnhancement()).toBe('forge-'+tab);ui.render(p);ui.click(button('review'),p);expect(ui.click(button('cancel'),p)).toBe('forge-'+tab);expect(p).toEqual(before);expect(host.craft).not.toHaveBeenCalled();expect(host.salvage).not.toHaveBeenCalled();expect(host.smelt).not.toHaveBeenCalled();
 });
 it.each(['craft','recycle','smelt'] as const)('%s rejects a replaced or mutated Profile',tab=>{
  const {p,ui,host}=fixture(tab);ui.click(button('review'),p);ui.click(button('confirm'),structuredClone(p));expect(ui.render(p)).toContain('ข้อมูลเปลี่ยนแล้ว');
  ui.click(button('review'),p);p.bank.ore--;ui.click(button('confirm'),p);expect(ui.render(p)).toContain('ข้อมูลเปลี่ยนแล้ว');expect(host.craft).not.toHaveBeenCalled();expect(host.salvage).not.toHaveBeenCalled();expect(host.smelt).not.toHaveBeenCalled();
 });
 it.each(['craft','recycle','smelt'] as const)('%s dispatches exactly once and waits for a matching persisted event',tab=>{
  const {p,ui,host}=fixture(tab),before=structuredClone(p);ui.click(button('review'),p);ui.render(p);ui.click(button('confirm'),p);ui.click(button('confirm'),p);
  const method=tab==='recycle'?'salvage':tab;expect(host[method]).toHaveBeenCalledTimes(1);expect(p).toEqual(before);expect(ui.render(p)).not.toContain('id="forge-success"');
  const result=tab==='craft'?craftWeapon(p,map,p.company[0]!,1):tab==='recycle'?salvage(p,map,[1]):smelt(p,map,1),after={...result.profile,last:null};
  ui.serviced(after,tab,tab==='craft'?p.nextItem:1);const html=ui.render(after);expect(html).toContain('data-receipt="true"');expect(html).toContain('ยอดบันทึกจริง');expect(html).not.toContain('id="forge-confirm"');
  ui.click(button('confirm'),after);ui.click(button('next-preview'),after);ui.render(after);expect(host[method]).toHaveBeenCalledTimes(1);expect(after.forge).toBe(p.forge);if(tab==='recycle')expect(ui.selected).toBeUndefined();else expect(ui.selected).toBe(1);
 });
 it('craft exposes the real fixed blueprint, costs, cap and simultaneous shortages',()=>{
  const {p,ui,host}=fixture('craft');ui.change(select('forge-craft-level','6'));let html=ui.render(p);expect(html).toContain('Lv6');expect(html).toContain('คุณภาพ 100%');expect(html).toContain('ไม่สุ่ม');expect(html).toContain('ไม่สวมให้อัตโนมัติ');
  p.bank.ore=0;p.bank.dust=0;html=ui.render(p);expect(html).toContain('แร่ดาวขาด 48');expect(html).toContain('ฝุ่นดาวขาด 9');ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.craft).not.toHaveBeenCalled();
 });
 it.each(['bag','pending'] as const)('craft refuses %s and provides storage navigation',reason=>{
  const {p,ui,host}=fixture('craft');if(reason==='bag')p.items=Array.from({length:60},(_,i)=>weaponBlueprint(map,p.company[0]!,1,i+1));else p.overflow=[weaponBlueprint(map,p.company[0]!,1,10)];
  expect(ui.render(p)).toContain('id="forge-manage-storage"');ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.craft).not.toHaveBeenCalled();
 });
 it('recipe changes invalidate a review and next preview preserves the recipe without equipping',()=>{
  const {p,ui,host}=fixture('craft');ui.click(button('review'),p);ui.change(select('forge-craft-level','3'));ui.render(p);ui.click(button('confirm'),p);expect(host.craft).not.toHaveBeenCalled();ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.craft).toHaveBeenCalledExactlyOnceWith(p.company[0],3);
  const result=craftWeapon(p,map,p.company[0]!,3);ui.serviced(result.profile,'craft',2);expect(ui.render(result.profile)).toContain('#2');expect(result.profile.members).toEqual(p.members);expect(result.profile.hunt).toEqual(p.hunt);ui.click(button('next-preview'),result.profile);expect(ui.render(result.profile)).toContain('value="3" selected');
 });
 it('recycle identifies the whole lost item, all investment and legacy credit without forbidding bosses',()=>{
  const {p,ui}=fixture('recycle');p.items[0]!.boss='aegis';delete p.items[0]!.investment;const html=ui.render(p);expect(html).toContain('#1');expect(html).toContain('Lv3');expect(html).toContain('+2');expect(html).toContain('ไม่ล็อก');expect(html).toContain('คืนทุนเพิ่ม Lv 100%');expect(html).toContain('ของเดิม: เครดิต');expect(html).toContain('พลังบอสจะหายไป');expect(html).not.toMatch(/id="forge-recycle"[^>]*disabled/);
 });
 it.each(['locked','worn','full'] as const)('recycle blocks %s and never unlocks or unequips automatically',reason=>{
  const {p,ui,host}=fixture('recycle');if(reason==='locked')p.items[0]!.locked=true;else if(reason==='full')p.bank.ore=9999999;else {p.members[p.company[0]!]!.gear={body:p.items[0]!};p.items=[];}
  expect(ui.render(p)).toMatch(/id="forge-recycle"[^>]*disabled/);ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.salvage).not.toHaveBeenCalled();expect(host.lock).not.toHaveBeenCalled();
 });
 it.each([0,1,4,5])('smelt quota %i exposes only eligible quantities and checks exactly the reviewed amount',left=>{
  const {p,ui,host}=fixture('smelt');p.smelted=map.equipment.forge.smeltCap-left;ui.change(select('forge-target','5'));const html=ui.render(p);expect(html).toContain(`แร่ ${map.equipment.forge.smeltOre}`);expect(html).not.toContain('รายวัน');if(left<5)expect(html).toMatch(/option value="5"[^>]*disabled/);
  ui.click(button('review'),p);ui.click(button('confirm'),p);if(left<5)expect(host.smelt).not.toHaveBeenCalled();else expect(host.smelt).toHaveBeenCalledExactlyOnceWith(5);
 });
 it('smelt quantity changes invalidate review and never turn a next preview into a command',()=>{
  const {p,ui,host}=fixture('smelt');ui.click(button('review'),p);ui.change(select('forge-target','5'));ui.render(p);ui.click(button('confirm'),p);expect(host.smelt).not.toHaveBeenCalled();ui.click(button('review'),p);ui.click(button('confirm'),p);const result=smelt(p,map,5);ui.serviced(result.profile,'smelt',5);expect(ui.render(result.profile)).toContain('ได้รับฝุ่น 5 หน่วย');ui.click(button('next-preview'),result.profile);expect(ui.render(result.profile)).toContain('value="5" selected');expect(host.smelt).toHaveBeenCalledExactlyOnceWith(5);
 });
 it('ignores unrelated or mismatched events and accepts only the reviewed smelt count',()=>{
  const {p,ui}=fixture('smelt');ui.serviced(p,'smelt',5);expect(ui.render(p)).not.toContain('data-receipt="true"');ui.change(select('forge-target','5'));ui.render(p);ui.click(button('review'),p);ui.click(button('confirm'),p);const result=smelt(p,map,5);ui.serviced(result.profile,'smelt',1);expect(ui.render(p)).not.toContain('data-receipt="true"');ui.serviced(result.profile,'smelt',5);expect(ui.render(result.profile)).toContain('data-receipt="true"');
 });
 it.each(['craft','recycle','smelt'] as const)('%s changing tasks discards review without dispatching an old order',tab=>{
  const {p,ui,host}=fixture(tab);ui.click(button('review'),p);ui.click(button('tasks'),p);ui.click(button('task',{task:'level'}),p);ui.render(p);ui.click(button('confirm'),p);expect(host.craft).not.toHaveBeenCalled();expect(host.salvage).not.toHaveBeenCalled();expect(host.smelt).not.toHaveBeenCalled();expect(host.level).not.toHaveBeenCalled();
 });

 it.each([1,5])('blocks smelting %i above the existing persisted bank ceiling',amount=>{
  const {p,ui,host}=fixture('smelt');p.bank.dust=9999999;ui.change(select('forge-target',String(amount)));const html=ui.render(p);expect(html).toContain('ฝุ่นดาวหลังหลอมเกินเพดานคลัง');expect(html).toMatch(/id="forge-smelt"[^>]*disabled/);ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.smelt).not.toHaveBeenCalled();
 });
 it('allows exactly the remaining dust capacity and round-trips the resulting Profile',()=>{
  const {p,ui,host}=fixture('smelt');p.bank.dust=9999998;const html=ui.render(p);expect(html).not.toMatch(/id="forge-smelt"[^>]*disabled/);expect(html).toMatch(/option value="5"[^>]*disabled/);ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.smelt).toHaveBeenCalledExactlyOnceWith(1);const result=smelt(p,map,1);let raw='';expect(saveGame({getItem:()=>raw,setItem:(_k:string,v:string)=>{raw=v;}},{profile:result.profile,run:null})).toBe(true);expect(parseGame(raw,map,encounterById).profile.bank.dust).toBe(9999999);
 });

});
