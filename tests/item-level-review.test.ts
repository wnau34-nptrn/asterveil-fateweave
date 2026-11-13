import { describe, it, expect, vi } from 'vitest';
import { ForgeWorkbench } from '../src/ui/forge-workbench';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById } from '../src/content/encounters/catalog';
import { newProfile } from '../src/core/world/profile';
import { raiseItemLevel } from '../src/core/world/forge';
import { heroCatalog } from '../src/core/world/world';

const button=(action:string,extra:Record<string,string>={})=>({dataset:{forge:action,...extra},disabled:false}) as unknown as HTMLButtonElement;
function fixture(){
  const p=newProfile(map,17);p.forgeLevel=6;p.bank.ore=100;p.bank.dust=50;p.items=[{uid:1,slot:'body',rarity:0,level:1,affixes:[],plus:2},{uid:2,slot:'body',rarity:0,level:2,affixes:[]}];p.nextItem=3;
  const host={enhance:vi.fn(),transfer:vi.fn(),craft:vi.fn(),fuse:vi.fn(),level:vi.fn(),reroll:vi.fn(),salvage:vi.fn(),lock:vi.fn(),smelt:vi.fn()};
  const ui=new ForgeWorkbench(map,heroCatalog(encounterById,map),encounterById(map.tutorialEncounterId)!,host);ui.open(1);ui.render(p);
  const level=()=>{ui.click(button('tasks'),p);ui.click(button('task',{task:'level'}),p);return ui.render(p);};
  return {p,ui,host,level};
}
describe('task launcher and item level review',()=>{
  it('offers named tasks with the real unlock gate and no profile mutation',()=>{
    const {p,ui}=fixture(),before=structuredClone(p);ui.open();const html=ui.render(p,()=>false);
    expect(html).toContain('data-task-launcher="true"');expect(html.match(/data-forge="task"/g)).toHaveLength(8);
    expect(html).toMatch(/id="forge-mode-level"[^>]*disabled/);expect(html).toContain('ยังไม่ปลดล็อก');expect(p).toEqual(before);
  });
  it('switches to level with the same item and can return from the task launcher',()=>{
    const {p,ui,level}=fixture(),before=structuredClone(p);expect(level()).toContain('<h3>Lv1 → Lv2</h3>');expect(ui.selected).toBe(1);
    ui.click(button('tasks'),p);expect(ui.backFromEnhancement()).toBe('forge-open-tasks');expect(ui.render(p)).toContain('id="forge-level"');expect(p).toEqual(before);
  });
  it('opens non-item tasks without asking for equipment when no item is selected',()=>{
    const {p,ui}=fixture();ui.open();ui.render(p);
    ui.click(button('task',{task:'craft'}),p);expect(ui.render(p)).toContain('forge-craft-hero');expect(ui.heading).toBe('สร้างอาวุธ');ui.click(button('review'),p);expect(ui.backFromEnhancement()).toBe('forge-craft');
    ui.openTasks();ui.click(button('task',{task:'smelt'}),p);expect(ui.render(p)).toContain('forge-smelt');expect(ui.heading).toBe('หลอมแร่เป็นฝุ่น');ui.click(button('review'),p);expect(ui.backFromEnhancement()).toBe('forge-smelt');
  });
  it('requires the same profile and a fresh review before committing',()=>{
    const {p,ui,host,level}=fixture();level();ui.click(button('review'),p);ui.click(button('confirm'),structuredClone(p));expect(host.level).not.toHaveBeenCalled();
    ui.click(button('review'),p);const next=structuredClone(p);next.bank.ore=0;expect(ui.render(next)).toContain('ข้อมูลเปลี่ยนแล้ว');ui.click(button('confirm'),next);expect(host.level).not.toHaveBeenCalled();
  });
  it('invalidates review when changing the operation or selected item',()=>{
    const {p,ui,host,level}=fixture();level();ui.click(button('review'),p);ui.click(button('tasks'),p);ui.click(button('task',{task:'enhance'}),p);ui.render(p);ui.click(button('confirm'),p);
    expect(host.level).not.toHaveBeenCalled();expect(host.enhance).not.toHaveBeenCalled();level();ui.click(button('review'),p);ui.click(button('pick',{uid:'2'}),p);ui.render(p);ui.click(button('confirm'),p);expect(host.level).not.toHaveBeenCalled();
  });
  it('consumes one review once and shows the actual level receipt until explicit next',()=>{
    const {p,ui,host,level}=fixture();level();const before=structuredClone(p);ui.click(button('review'),p);ui.render(p);ui.click(button('confirm'),p);ui.click(button('confirm'),p);
    expect(host.level).toHaveBeenCalledExactlyOnceWith(1,2);expect(p).toEqual(before);
    const result=raiseItemLevel(p,map,1,2);ui.leveled(result.profile,1);const receipt=ui.render(result.profile);
    expect(receipt).toContain('<h3>Lv1 → Lv2</h3>');expect(receipt).toContain('เพิ่มเลเวลสำเร็จ');expect(receipt).not.toContain('id="forge-level"');expect(result.profile.items[0]).toMatchObject({level:2,plus:2,levelInvestment:{ore:8,dust:1}});
    ui.click(button('next-preview'),result.profile);expect(ui.render(result.profile)).toContain('<h3>Lv2 → Lv3</h3>');expect(host.level).toHaveBeenCalledTimes(1);expect(result.profile.bank).toMatchObject({ore:92,dust:49});
  });
  it('shows both shortages and refuses a command if resources change before confirmation',()=>{
    const {p,ui,host,level}=fixture();p.bank.ore=0;p.bank.dust=0;const html=level();expect(html).toContain('แร่ดาวขาด 8');expect(html).toContain('ฝุ่นดาวขาด 1');expect(html).toMatch(/id="forge-level"[^>]*disabled/);
    ui.click(button('review'),p);ui.click(button('confirm'),p);expect(host.level).not.toHaveBeenCalled();
  });
  it('keeps the committed receipt while inspecting another trial hero',()=>{
    const {p,ui,host,level}=fixture();if(!p.company.includes('healer'))p.company.push('healer');p.members.healer={stars:1,shards:0};level();ui.click(button('review'),p);ui.render(p);ui.click(button('confirm'),p);
    const result=raiseItemLevel(p,map,1,2);ui.leveled(result.profile,1);ui.render(result.profile);
    ui.change({id:'forge-preview-hero',value:'healer',dataset:{}} as HTMLSelectElement);
    const html=ui.render(result.profile);expect(html).toContain('data-receipt="true"');expect(html).toContain('<h3>Lv1 → Lv2</h3>');expect(host.level).toHaveBeenCalledTimes(1);
  });
  it('does not offer to lower or level an item already above the unlocked cap',()=>{
    const {p,ui,level}=fixture();p.items[0]!.level=24;const html=level();expect(html).toContain('Lv24 · ถึงเพดาน');expect(html).toContain('เพดานที่ปลดล็อก Lv6');expect(html).not.toContain('id="forge-level"');expect(ui.selected).toBe(1);
  });
});
