import { describe, it, expect, vi } from 'vitest';
import { ForgeWorkbench } from '../src/ui/forge-workbench';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById } from '../src/content/encounters/catalog';
import { newProfile } from '../src/core/world/profile';
import { enhanceTo } from '../src/core/world/forge';
import { heroCatalog } from '../src/core/world/world';

const button=(action:string)=>({dataset:{forge:action},disabled:false}) as unknown as HTMLButtonElement;
function fixture(){
  const p=newProfile(map,17);p.bank.ore=100;p.bank.dust=50;p.items=[{uid:1,slot:'body',rarity:0,level:1,affixes:[],plus:2}];p.nextItem=2;
  const host={enhance:vi.fn(),transfer:vi.fn(),craft:vi.fn(),fuse:vi.fn(),level:vi.fn(),reroll:vi.fn(),salvage:vi.fn(),lock:vi.fn(),smelt:vi.fn()};
  const ui=new ForgeWorkbench(map,heroCatalog(encounterById,map),encounterById(map.tutorialEncounterId)!,host);ui.open(1);ui.render(p);
  return {p,ui,host};
}
describe('enhancement review command boundary',()=>{
  it('does not confirm an old review against a newer profile',()=>{
    const {p,ui,host}=fixture();ui.click(button('review'),p);
    ui.click(button('confirm'),structuredClone(p));expect(host.enhance).not.toHaveBeenCalled();
  });
  it('invalidates review when a profile update is rendered and checks it again',()=>{
    const {p,ui,host}=fixture();ui.click(button('review'),p);const next=structuredClone(p);next.bank.ore=0;
    expect(ui.render(next)).toContain('ข้อมูลเปลี่ยนแล้ว');ui.click(button('confirm'),next);expect(host.enhance).not.toHaveBeenCalled();
  });
  it('consumes one review once without changing the supplied profile',()=>{
    const {p,ui,host}=fixture(),before=structuredClone(p);ui.click(button('review'),p);ui.render(p);
    ui.click(button('confirm'),p);ui.click(button('confirm'),p);expect(host.enhance).toHaveBeenCalledExactlyOnceWith(1,3);expect(p).toEqual(before);
  });
  it('requires new review after changing the previewed character',()=>{
    const {p,ui,host}=fixture();ui.click(button('review'),p);ui.change({id:'forge-preview-hero',value:'healer',dataset:{}} as HTMLSelectElement);
    ui.click(button('confirm'),p);expect(host.enhance).not.toHaveBeenCalled();
  });
  it('prepares the next step automatically, with fresh costs and a one-use button',()=>{
    const {p,ui,host}=fixture();
    const strike=(target:number)=>({dataset:{forge:'strike',uid:'1',target:String(target)},disabled:false}) as unknown as HTMLButtonElement;
    const first=strike(3);ui.click(first,p);ui.click(first,p);expect(host.enhance).toHaveBeenCalledExactlyOnceWith(1,3);
    const result=enhanceTo(p,map,1,3);ui.enhanced(result.profile,1);
    const html=ui.render(result.profile);expect(html).toContain('ตีบวกสำเร็จ +2 → +3');expect(html).toContain('<h3>+3 → +4</h3>');expect(html).toContain('data-target="4"');expect(html).not.toContain('forge-next-preview');
    ui.click(strike(3),result.profile);expect(host.enhance).toHaveBeenCalledTimes(1);
    ui.click(strike(4),result.profile);expect(host.enhance).toHaveBeenLastCalledWith(1,4);
    expect(result.profile.bank).toMatchObject({ore:94,dust:48});
  });
  it('keeps the next cost visible but blocks continuation when the previous step exhausts resources',()=>{
    const {p,ui,host}=fixture();p.bank={...p.bank,ore:6,dust:2};ui.render(p);
    ui.click({dataset:{forge:'strike',uid:'1',target:'3'},disabled:false} as unknown as HTMLButtonElement,p);
    const result=enhanceTo(p,map,1,3);ui.enhanced(result.profile,1);const html=ui.render(result.profile);
    expect(html).toContain('<h3>+3 → +4</h3>');expect(html).toContain('แร่ดาวขาด 7');expect(html).toContain('ฝุ่นดาวขาด 2');expect(html).toContain('data-target="4" class="primary" disabled');
    ui.click({dataset:{forge:'strike',uid:'1',target:'4'},disabled:false} as unknown as HTMLButtonElement,result.profile);expect(host.enhance).toHaveBeenCalledTimes(1);
  });
  it('refuses stale, unaffordable, skipped and capped direct strikes',()=>{
    for(const change of ['stale','ore','dust','skip','cap'] as const){
      const {p,ui,host}=fixture();let source=p,target=3;
      if(change==='stale')source=structuredClone(p);
      if(change==='ore')p.bank.ore=0;if(change==='dust')p.bank.dust=0;
      if(change==='skip')target=4;if(change==='cap'){p.items[0]!.plus=5;target=6;}
      ui.click({dataset:{forge:'strike',uid:'1',target:String(target)},disabled:false} as unknown as HTMLButtonElement,source);
      expect(host.enhance).not.toHaveBeenCalled();
    }
  });
  it('groups real preview details and never calls a bag item worn',()=>{
    const {p,ui}=fixture();const html=ui.render(p);expect(html).toContain('ผลต่ออุปกรณ์');expect(html).toContain('ในคลัง · ไม่มีผู้สวม');
    expect(html).toContain('ทดลองผลเมื่อสวมชิ้นนี้');expect(html).toContain('forge-secondary-details');
  });

});
