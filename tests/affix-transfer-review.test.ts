import { describe, expect, it, vi } from 'vitest';
import { ForgeWorkbench } from '../src/ui/forge-workbench';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById } from '../src/content/encounters/catalog';
import { newProfile } from '../src/core/world/profile';
import { findItem, transferAffix, transferCandidate } from '../src/core/world/forge';
import { heroCatalog } from '../src/core/world/world';
import type { Item } from '../src/core/world/types';
const button=(action:string,extra:Record<string,string>={})=>({dataset:{forge:action,...extra},disabled:false}) as unknown as HTMLButtonElement;
const select=(id:string,value:string)=>({id,value,dataset:{}}) as HTMLSelectElement;
function fixture(){
  const p=newProfile(map,17);p.bank={ore:100,dust:100,gold:20,shard:50};
  const main:Item={uid:1,slot:'body',rarity:3,level:6,affixes:['hp','armour','regen'],q:{main:109,affixes:[80,95,105]},set:'dawn',plus:5,investment:{ore:30,dust:9},levelInvestment:{ore:20,dust:2},locked:true};
  const donor:Item={uid:2,slot:'body',rarity:2,level:3,affixes:['support','resist'],q:{main:90,affixes:[120,88]},plus:2,investment:{ore:9,dust:2},levelInvestment:{ore:20,dust:2}};
  p.items=[main,donor,{...donor,uid:3,locked:true}];p.nextItem=4;
  const host={enhance:vi.fn(),level:vi.fn(),fuse:vi.fn(),reroll:vi.fn(),transfer:vi.fn(),craft:vi.fn(),lock:vi.fn(),salvage:vi.fn(),smelt:vi.fn()};
  const ui=new ForgeWorkbench(map,heroCatalog(encounterById,map),encounterById(map.tutorialEncounterId)!,host);ui.open(1);ui.render(p);ui.click(button('tasks'),p);ui.click(button('task',{task:'transfer'}),p);ui.render(p);ui.change(select('forge-transfer-donor','2'));ui.render(p);
  return {p,ui,host,main,donor};
}
describe('transfer review and committed receipt',()=>{
  it('keeps preview, selections, review, Escape and cancellation readonly',()=>{
    const {p,ui,host}=fixture(),before=structuredClone(p);const html=ui.render(p);
    expect(ui.heading).toBe('ถ่ายโอนคุณสมบัติ');expect(html).toContain('ชิ้นรับ · คงอยู่');expect(html).toContain('ครั้งแรกจะผูกช่อง 1 ถาวร');expect(html).toContain('2 · เลือกชิ้นต้นทาง');expect(html).toContain('3 · เลือกคุณสมบัติที่จะคัดลอก');
    ui.click(button('review'),p);const review=ui.render(p);expect(review).toContain('จะทำลาย #2 ทั้งชิ้น');expect(review).not.toContain('id="forge-transfer-donor"');expect(review).not.toContain('id="forge-affix"');expect(review).toContain('ชิ้นต้นทาง · หายทั้งชิ้น');
    expect(ui.backFromEnhancement()).toBe('forge-transfer');ui.render(p);ui.click(button('review'),p);expect(ui.click(button('cancel'),p)).toBe('forge-transfer');expect(ui.selected).toBe(1);expect(p).toEqual(before);expect(host.transfer).not.toHaveBeenCalled();
  });
  it('separates each upfront fee from donor refunds and remaining resources',()=>{
    const {p,ui}=fixture(),html=ui.render(p);
    expect(html).toContain('<td>100</td><td>12</td><td>29</td><td>117</td>');expect(html).toContain('<td>100</td><td>3</td><td>4</td><td>101</td>');expect(html).toContain('<td>50</td><td>10</td><td>0</td><td>40</td>');
    expect(html).toContain('ทุนตีบวก: แร่ 9 · ฝุ่น 2');expect(html).toContain('ทุน Lv: แร่ 20 · ฝุ่น 2');expect(html).toContain('ต้องมีค่าบริการครบก่อนรับทุนคืน');
  });
  it.each([{ore:11,dust:100,shard:50},{ore:100,dust:2,shard:50},{ore:100,dust:100,shard:0},{ore:0,dust:0,shard:0}])('requires all upfront resources before any refund: %j',bank=>{
    const {p,ui,host}=fixture();Object.assign(p.bank,bank);const html=ui.render(p);expect(html).toMatch(/id="forge-transfer"[^>]*disabled/);expect(html).toContain('สำหรับจ่ายล่วงหน้า');
    for(const [key,label] of [['ore','แร่'],['dust','ฝุ่น'],['shard','เศษกลาง']] as const)if(p.bank[key]<map.equipment.forge.transfer[key])expect(html).toContain(`${label}ขาด ${map.equipment.forge.transfer[key]-p.bank[key]}`);
    ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.transfer).not.toHaveBeenCalled();
  });
  it('rejects stale Profile identity and restores focus to this operation',()=>{
    const {p,ui,host}=fixture();ui.click(button('review'),p);expect(ui.click(button('confirm'),structuredClone(p))).toBe('forge-transfer');expect(ui.render(p)).toContain('ข้อมูลเปลี่ยนแล้ว');expect(host.transfer).not.toHaveBeenCalled();
    ui.click(button('review'),p);const fresh=structuredClone(p);ui.render(fresh);ui.click(button('confirm'),fresh);expect(host.transfer).not.toHaveBeenCalled();
  });
  it.each([['forge-affix','1'],['forge-transfer-donor','3'],['forge-transfer-source','1']])('invalidates review when %s changes',(id,value)=>{
    const {p,ui,host}=fixture();ui.click(button('review'),p);ui.change(select(id!,value!));ui.render(p);ui.click(button('confirm'),p);expect(host.transfer).not.toHaveBeenCalled();
  });
  it('consumes one review once, waits for an event, and shows the actual persisted Profile',()=>{
    const {p,ui,host,main,donor}=fixture(),original=structuredClone(p);ui.click(button('review'),p);ui.render(p);ui.click(button('confirm'),p);ui.click(button('confirm'),p);expect(host.transfer).toHaveBeenCalledExactlyOnceWith(1,0,2,0);expect(p).toEqual(original);expect(ui.render(p)).not.toContain('id="forge-success"');
    const result=transferAffix(p,map,1,0,2,0);expect(result.event).toEqual({type:'forged',uid:1,action:'transfer'});const canonical={...result.profile,last:null};ui.transferred(canonical,1);const html=ui.render(canonical);
    expect(html).toContain('data-receipt="true"');expect(html).toContain('ถ่ายโอนสำเร็จ');expect(html).toContain('ใช้ #2 แล้ว · หายจากคลังทั้งชิ้น');expect(html).toContain('เลือด 80% → พลังเวท 120%');expect(html).toContain('ยอดบันทึกจริง · แร่ 117 · ฝุ่น 101 · เศษกลาง 40');expect(html).not.toContain('id="forge-confirm"');
    expect(findItem(canonical,1)!.item).toEqual(transferCandidate(map,main,0,donor,0));expect(canonical.items.map(i=>i.uid)).toEqual([1,3]);expect(canonical.forge).toBe(original.forge);
    const saved=structuredClone(canonical);ui.click(button('confirm'),canonical);ui.click(button('next-preview'),canonical);const ready=ui.render(canonical);expect(ready).toContain('ผูกช่อง 1 แล้ว');expect(ready).toContain('id="forge-transfer"');expect(canonical).toEqual(saved);expect(host.transfer).toHaveBeenCalledTimes(1);
  });
  it('keeps a recorded receipt when inspecting another readonly trial hero',()=>{
    const {p,ui}=fixture();ui.click(button('review'),p);ui.click(button('confirm'),p);const result=transferAffix(p,map,1,0,2,0);ui.transferred(result.profile,1);ui.render(result.profile);ui.change(select('forge-preview-hero',p.company[0]!));expect(ui.render(result.profile)).toContain('data-receipt="true"');
  });
  it('honors a previously bound slot and refuses an attempt to move it',()=>{
    const {p,ui,host,main}=fixture();main.transferSlot=1;let html=ui.render(p);expect(html).toMatch(/option value="0"[^>]*disabled/);expect(html).toContain('ผูกช่อง 2 แล้ว');ui.change(select('forge-affix','0'));ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.transfer).not.toHaveBeenCalled();html=ui.render(p);expect(html).toMatch(/option value="1" selected/);
  });
  it.each([{locked:true},{slot:'head'},{affixes:['hp','resist'],q:{main:90,affixes:[80,88]}},{affixes:['armour','resist']}])('rechecks donor restrictions at confirm: %j',patch=>{
    const {p,ui,host,donor}=fixture();ui.click(button('review'),p);Object.assign(donor,patch);ui.click(button('confirm'),p);expect(host.transfer).not.toHaveBeenCalled();
  });
  it('rejects overflowing refunds and a receiver without an existing affix',()=>{
    const {p,ui,host,main}=fixture();p.bank.ore=9999999;expect(ui.render(p)).toContain('ยอดคืนเกินเพดานคลัง');ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.transfer).not.toHaveBeenCalled();main.affixes=[];expect(ui.render(p)).toContain('ไม่มีช่องคุณสมบัติรองให้ถ่ายโอน');
  });
  it('permits a different rarity and the same affix kind with a different quality',()=>{
    const {p,ui,host,donor}=fixture();donor.affixes=['hp','resist'];donor.q={main:90,affixes:[120,88]};expect(ui.render(p)).toContain('เลือด 80% → เลือด 120%');ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.transfer).toHaveBeenCalledExactlyOnceWith(1,0,2,0);
  });
  it('clears review when changing the selected receiver or task',()=>{
    const {p,ui,host}=fixture();ui.click(button('review'),p);ui.click(button('pick',{uid:'2'}),p);expect(ui.render(p)).not.toContain('class="forge-transfer-material"');ui.click(button('confirm'),p);expect(host.transfer).not.toHaveBeenCalled();ui.click(button('tasks'),p);ui.click(button('task',{task:'enhance'}),p);ui.render(p);ui.click(button('confirm'),p);expect(host.enhance).not.toHaveBeenCalled();
  });
});
