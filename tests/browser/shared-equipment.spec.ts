import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';
import { GEAR_SLOTS, type Item } from '../../src/core/world/types';
import { parseGame } from '../../src/core/save/expedition-save';
import { setCounts } from '../../src/core/world/equipment';
import { xpAt } from '../fixtures/camp-level';
import { legacyEnvelope } from '../fixtures/legacy-save';
const key='asterveil.fateweave.expedition.v1';

for(const [width,height,touch] of [[320,568,true],[390,844,true],[1366,768,false]] as const)for(const camp of [false,true]){
  test(`shared character and auto equipment ${camp?'camp':'map'} at ${width}x${height}`,async({browser},info)=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),page=await context.newPage(),errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const profile=newProfile(map,77);profile.tutorialDone=true;profile.commander={name:'อารี',crest:'star',color:'gold', camp: 'ค่ายอารี'};
    profile.members.guardian={stars:3,dupes:0,gear:{body:{uid:1,slot:'body',rarity:0,level:1,affixes:[],set:'dawn'}}}; profile.campXp = Math.max(profile.campXp, xpAt(6));
    profile.company.push('lio','mira');profile.members.lio={stars:3,dupes:0}; profile.campXp = Math.max(profile.campXp, xpAt(6));profile.members.mira={stars:1,dupes:0};profile.party.reserve=['lio'];
    profile.items=GEAR_SLOTS.map((slot,n):Item=>({uid:n+2,slot,rarity:0,level:3,affixes:[],set:'wind',...(slot==='weapon'?{hero:'guardian'}:{})}));
    profile.items.push({uid:8,slot:'weapon',hero:'tracer',rarity:0,level:9,affixes:[]},{uid:9,slot:'body',rarity:0,level:8,affixes:[]});profile.nextItem=10;
    const game=camp?{profile,run:null}:depart(profile,map,lookup,1234);if(game.run){game.run.found=profile.items.map(i=>({...structuredClone(i),uid:0}));game.run.hp.guardian=11;}
    const raw=JSON.stringify(legacyEnvelope({version:21,...game}));parseGame(raw,map,lookup);
    await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('shared-equipment')){localStorage.setItem(key,raw);sessionStorage.setItem('shared-equipment','yes');}},{key,raw});
    await page.goto('./');await page.locator('#continue').click();
    const prefix=camp?'camp-':'',id=(name:string)=>page.locator('#'+prefix+name),panel=id('character-dialog'),saved=()=>page.evaluate(k=>localStorage.getItem(k)!,key);
    const original=await saved();
    if(camp)await page.locator('#lobby-tab-gear').click();else{await page.locator('#world-pack').click();await page.locator('#bag-tab-gear').click();}
    const inventory=page.locator(camp?'#lobby-sheet':'#pack-dialog'),filter=inventory.locator(camp?'#camp-inventory-gear-filter-set':'#pack-gear-filter-set');
    await filter.selectOption('wind');await expect(inventory.locator('.inventory-gear li')).toHaveCount(6);
    await inventory.locator(camp?'#equip-2':'#inventory-found-0').click();await inventory.locator(camp?'#camp-inventory-hero-guardian':'#inventory-hero-guardian').click();
    await expect(panel).toBeVisible();await expect(id('comparison-title')).toBeVisible();expect(await saved()).toBe(original);
    await page.keyboard.press('Escape');await expect(panel).toBeVisible();await page.keyboard.press('Escape');await expect(panel).not.toBeVisible();
    if(camp){await page.keyboard.press('Escape');await page.locator('#lobby-tab-team').click();await page.locator('#lobby-member-guardian').click();await page.locator('#lobby-character-open').click();}
    else{await page.locator('#bag-tab-team').click();await page.locator('#bag-team-guardian').click();await page.locator('#bag-character-overview').click();}
    await expect(id('character-tab-overview')).toHaveAttribute('aria-selected','true');
    if(camp){await id('character-member-mira').click();await expect(id('character-title')).toContainText('มิร่า');await expect(panel.locator('.character-summary')).toContainText('ในค่าย');await id('character-member-guardian').click();expect(await saved()).toBe(original);}
    await id('character-tab-gear').click();await panel.locator('.gear-extra-filters summary').click();await id('gear-filter-set').selectOption('none');await expect(panel.locator('.gear-bag li')).toHaveCount(2);
    await id('gear-filter-set').selectOption('wind');await expect(panel.locator('.gear-bag li')).toHaveCount(6);
    await panel.locator('.auto-settings summary').click();await id('auto-goal').selectOption('attack');await id('auto-set').selectOption('wind');
    await id('auto-preview').click();await expect(id('comparison-title')).toBeVisible();await expect(panel.locator('.auto-summary')).toContainText('สายลมเร็ว');expect(await saved()).toBe(original);
    expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    expect(await id('comparison-equip').evaluate(el=>{const b=el.getBoundingClientRect();return b.height>=44&&document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)===el;})).toBe(true);
    await page.screenshot({path:info.outputPath('auto-preview.png')});
    if(touch){await page.setViewportSize({width:844,height:390});await expect(page.locator('#orientation-gate')).toBeVisible();await id('comparison-equip').dispatchEvent('click');expect(await saved()).toBe(original);await page.setViewportSize({width,height});await expect(page.locator('#orientation-gate')).not.toBeVisible();await expect(id('comparison-title')).toBeVisible();}
    await page.keyboard.press('Escape');await expect(id('auto-preview')).toBeFocused();expect(await saved()).toBe(original);
    await id('auto-preview').click();await id('comparison-equip').click();
    const applied=parseGame(await saved(),map,lookup),member=(camp?applied.profile.members:applied.run!.members).guardian!;
    expect(setCounts(member.gear).wind).toBeGreaterThanOrEqual(4);expect(member.gear!.weapon!.hero).toBe('guardian');
    if(!camp){expect(applied.run!.hp.guardian).toBe(11);expect(applied.run!.steps).toBe(game.run!.steps);expect(applied.run!.rolls).toBe(game.run!.rolls);}
    const after=await saved();await id('auto-preview').click();await expect(panel.locator('.auto-empty')).toBeVisible();expect(await saved()).toBe(after);
    await page.screenshot({path:info.outputPath('auto-equipped.png')});
    await panel.locator('[data-world=character-close]').click();
    if(!camp){await expect(panel).not.toBeVisible();await expect(page.locator('#pack-dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#pack-dialog')).not.toBeVisible();await page.locator('#rest').click();await page.locator('#team-guardian').click();await page.locator('#camp-character-overview').click();await expect(panel).toBeVisible();await panel.locator('[data-world=character-close]').click();await expect(page.locator('#camp-dialog')).toBeVisible();}
    await page.reload();await page.locator('#continue').click();const resumed=parseGame(await saved(),map,lookup);expect((camp?resumed.profile.members:resumed.run!.members).guardian!.gear).toEqual(member.gear);
    expect(errors).toEqual([]);await context.close();
  });
}
