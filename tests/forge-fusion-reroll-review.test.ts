import { describe, expect, it, vi } from 'vitest';
import { ForgeWorkbench } from '../src/ui/forge-workbench';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById } from '../src/content/encounters/catalog';
import { newProfile } from '../src/core/world/profile';
import { findItem, fuse, reroll } from '../src/core/world/forge';
import { heroCatalog } from '../src/core/world/world';

const button=(action:string,extra:Record<string,string>={})=>({dataset:{forge:action,...extra},disabled:false}) as unknown as HTMLButtonElement;
function fixture(mode:'fuse'|'reroll'){
  const p=newProfile(map,17);p.bank={ore:500,dust:50,gold:20,seal:5};
  p.items=[{uid:1,slot:'body',rarity:mode==='fuse'?0:1,level:3,affixes:mode==='fuse'?[]:['hp'],plus:2,q:{main:113,affixes:mode==='fuse'?[]:[97]},levelInvestment:{ore:20,dust:2}},
    {uid:2,slot:'body',rarity:0,level:2,affixes:[],plus:2,investment:{ore:9,dust:2},levelInvestment:{ore:20,dust:2}},
    {uid:3,slot:'body',rarity:0,level:1,affixes:[]},{uid:4,slot:'body',rarity:0,level:1,affixes:[],locked:true}];p.nextItem=5;
  const host={enhance:vi.fn(),level:vi.fn(),fuse:vi.fn(),reroll:vi.fn(),transfer:vi.fn(),craft:vi.fn(),lock:vi.fn(),salvage:vi.fn(),smelt:vi.fn()};
  const ui=new ForgeWorkbench(map,heroCatalog(encounterById,map),encounterById(map.tutorialEncounterId)!,host);ui.open(1);ui.render(p);ui.click(button('tasks'),p);ui.click(button('task',{task:mode}),p);ui.render(p);
  if(mode==='fuse'){ui.click(button('donor',{uid:'2'}),p);ui.render(p);}
  return {p,host,ui};
}
describe('fusion and reroll review',()=>{
  it.each(['fuse','reroll'] as const)('%s preview, review, cancel and navigation never change a profile',mode=>{
    const {p,host,ui}=fixture(mode),before=structuredClone(p),html=ui.render(p);
    expect(html).toContain('forge-random-development');expect(html).toContain('ผลสุ่มแสดงหลังยืนยัน');expect(html).toContain('ชิ้นหลัก · คงอยู่');
    ui.click(button('review'),p);expect(ui.render(p)).toContain('data-review="true"');
    expect(ui.backFromEnhancement()).toBe(mode==='fuse'?'forge-fuse':'forge-reroll-0');ui.render(p);
    ui.click(button('review'),p);expect(ui.click(button('cancel'),p)).toBe(mode==='fuse'?'forge-fuse':'forge-reroll-0');
    ui.click(button('tasks'),p);expect(ui.backFromEnhancement()).toBe('forge-open-tasks');expect(ui.selected).toBe(1);
    expect(p).toEqual(before);expect(host.fuse).not.toHaveBeenCalled();expect(host.reroll).not.toHaveBeenCalled();
  });
  it('shows each consumed donor and its investment, without a fusion fee',()=>{
    const {p,ui}=fixture('fuse');ui.click(button('review'),p);const html=ui.render(p);
    expect(html).toContain('ชิ้นที่จะหายทั้งชิ้น 2/2');expect(html).toContain('#2');expect(html).toContain('#3');expect(html).toContain('ทุนตีบวก: แร่ 9 · ฝุ่น 2');
    expect(html).toContain('<td>500</td><td>0</td><td>29</td><td>529</td>');expect(html).toContain('<td>50</td><td>0</td><td>4</td><td>54</td>');
    expect(html).not.toContain('data-forge="donor"');
  });
  it.each(['fuse','reroll'] as const)('%s rejects stale profiles with the correct focus',mode=>{
    const {p,host,ui}=fixture(mode);ui.click(button('review'),p);
    expect(ui.click(button('confirm'),structuredClone(p))).toBe(mode==='fuse'?'forge-fuse':'forge-reroll-0');
    expect(ui.render(p)).toContain('ข้อมูลเปลี่ยนแล้ว');
    ui.click(button('review'),p);ui.render(structuredClone(p));ui.click(button('confirm'),p);
    expect(host.fuse).not.toHaveBeenCalled();expect(host.reroll).not.toHaveBeenCalled();
  });
  it.each(['fuse','reroll'] as const)('%s consumes a review once and waits for a committed event',mode=>{
    const {p,host,ui}=fixture(mode);ui.click(button('review'),p);ui.render(p);ui.click(button('confirm'),p);ui.click(button('confirm'),p);
    expect(host[mode]).toHaveBeenCalledTimes(1);expect(ui.render(p)).not.toContain('id="forge-success"');
    const result=mode==='fuse'?fuse(p,map,1,[3,2]):reroll(p,map,1,0);expect(result.event.type).toBe('forged');
    if(mode==='fuse')ui.fused(result.profile,1);else ui.rerolled(result.profile,1);
    const html=ui.render(result.profile);expect(html).toContain('data-receipt="true"');expect(html).toContain('ผลจริงก่อน → หลัง');expect(html).not.toContain('id="forge-confirm"');expect(html).not.toContain('ผลสุ่มแสดงหลังยืนยัน');
    if(mode==='fuse'){expect(result.profile.items.map(i=>i.uid)).toEqual([1,4]);expect(result.profile.bank).toMatchObject({ore:529,dust:54});}
    else {expect(findItem(result.profile,1)!.item.affixes[0]).not.toBe('hp');expect(result.profile.bank.seal).toBe(5-map.equipment.forge.rerollSeals);}
    const saved=structuredClone(result.profile);ui.click(button('next-preview'),result.profile);ui.render(result.profile);expect(host[mode]).toHaveBeenCalledTimes(1);expect(result.profile).toEqual(saved);
  });
  it('rechecks donor eligibility even if the profile object was mutated in place',()=>{
    const {p,ui,host}=fixture('fuse');ui.click(button('review'),p);p.items[1]!.locked=true;ui.click(button('confirm'),p);expect(host.fuse).not.toHaveBeenCalled();
  });
  it('rechecks reroll currency at confirmation and shows the shortage',()=>{
    const {p,ui,host}=fixture('reroll');ui.click(button('review'),p);p.bank.seal=0;ui.click(button('confirm'),p);expect(host.reroll).not.toHaveBeenCalled();expect(ui.render(p)).toContain('ตราสัญญาไม่พอ');
  });
  it('shows no-affix and maximum-rarity blockers without offering a command',()=>{
    const {p,ui,host}=fixture('fuse');p.items[0]!.rarity=4;
    expect(ui.render(p)).toContain('ความหายากสูงสุดแล้ว');ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.fuse).not.toHaveBeenCalled();
    ui.click(button('tasks'),p);ui.click(button('task',{task:'reroll'}),p);expect(ui.render(p)).toContain('ไม่มีช่องคุณสมบัติที่สุ่มได้');ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.reroll).not.toHaveBeenCalled();
  });
  it('lists only possible new affixes and the real legendary pool without changing RNG state',()=>{
    const {p,ui}=fixture('fuse');p.items[0]!.rarity=3;p.items[0]!.affixes=['hp','armour','speed'];const original=structuredClone(p);
    const html=ui.render(p);expect(html).toContain('พลังตำนานที่มีโอกาสออก');expect(html).toContain('เพิ่มคุณสมบัติใหม่ 0 ช่อง');expect(html).not.toContain('ดูคุณสมบัติที่มีโอกาสออก');expect(html).toContain('ผลสุ่มแสดงหลังยืนยัน');expect(p).toEqual(original);
  });
  it('rejects a fusion refund that would overflow the bank',()=>{
    const {p,ui,host}=fixture('fuse');p.bank.ore=9999999;expect(ui.render(p)).toContain('ยอดคืนเกินเพดานคลัง');ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.fuse).not.toHaveBeenCalled();
  });
  it.each(['fuse','reroll'] as const)('%s invalidates a review when the subject or operation changes',mode=>{
    const {p,ui,host}=fixture(mode);ui.click(button('review'),p);ui.click(button('pick',{uid:'3'}),p);ui.render(p);ui.click(button('confirm'),p);expect(host[mode]).not.toHaveBeenCalled();
    ui.click(button('pick',{uid:'1'}),p);ui.render(p);ui.click(button('review'),p);ui.click(button('tasks'),p);ui.click(button('task',{task:'level'}),p);ui.render(p);ui.click(button('confirm'),p);expect(host[mode]).not.toHaveBeenCalled();expect(host.level).not.toHaveBeenCalled();
  });
});
