import { describe, it, expect, vi } from 'vitest';
import { ForgeWorkbench } from '../src/ui/forge-workbench';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById } from '../src/content/encounters/catalog';
import { newProfile } from '../src/core/world/profile';
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
});
