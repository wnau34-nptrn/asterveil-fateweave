import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
const key='asterveil.fateweave.expedition.v1';
for(const [width,height,touch] of [[320,568,true],[390,844,true],[1366,768,false]] as const){
  test(`forge review, exact refund and locks at ${width}x${height}`,async({browser},info)=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),page=await context.newPage(),errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const profile=newProfile(map,17);profile.commander={name:'อารี',crest:'star',color:'gold', camp: 'ค่ายอารี'};profile.tutorialDone=true;profile.bank={ore:100,dust:50,gold:20,seal:1};
    profile.members.guardian={stars:3,dupes:0,level:6,exp:0,gear:{body:{uid:1,slot:'body',rarity:1,level:1,affixes:['hp'],plus:2}}};
    profile.items=[{uid:2,slot:'body',rarity:0,level:1,affixes:[],plus:3},{uid:3,slot:'head',rarity:0,level:1,affixes:[],locked:true}];profile.nextItem=4;
    const raw=JSON.stringify({version:21,profile,run:null});
    await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('forge-seed')){localStorage.setItem(key,raw);sessionStorage.setItem('forge-seed','yes');}const w=window as unknown as {forgeWrites:number};w.forgeWrites=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)w.forgeWrites++;set.call(this,k,v);};},{key,raw});
    await page.goto('./');await page.locator('#continue').click();
    const saved=()=>page.evaluate(k=>localStorage.getItem(k)!,key),writes=()=>page.evaluate(()=>(window as unknown as {forgeWrites:number}).forgeWrites),original=await saved();
    await page.locator('#lobby-tab-team').click();await page.locator('#lobby-member-guardian').click();await page.locator('#lobby-gear-open').click();await page.locator('#camp-bag-slot-body').click();await page.locator('#camp-character-forge-worn').click();
    await expect(page.locator('#camp-character-dialog')).not.toBeVisible();await expect(page.locator('.forge-item-head')).toContainText('Lv1');await expect(page.locator('.forge-item-head')).toContainText('+2');
    await expect(page.locator('#forge-target')).toHaveCount(0);await expect(page.locator('#forge-cost')).toContainText('แร่ 6');await expect(page.locator('#forge-cost')).toContainText('ฝุ่น 2');
    await page.locator('#forge-change-item').click();await expect(page.locator('.forge-pick')).toHaveCount(3);await page.locator('#forge-resume').click();await expect(page.locator('#forge-cost')).toContainText('แร่ 6');await page.locator('.forge-impact summary').click();await expect(page.locator('.forge-skills')).toContainText('โจมตี');expect(await saved()).toBe(original);
    await page.locator('#forge-enhance').click();expect(await saved()).toBe(original);await expect(page.locator('#forge-confirm')).toBeVisible();
    expect(await page.locator('#forge-confirm').evaluate(el=>{const r=el.getBoundingClientRect();return r.height>=44&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;})).toBe(true);
    expect(await page.locator('.forge-workbench').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await page.screenshot({path:info.outputPath('forge-review.png')});
    if(touch){await page.setViewportSize({width:844,height:390});await expect(page.locator('#orientation-gate')).toBeVisible();await page.locator('#forge-confirm').dispatchEvent('click');expect(await saved()).toBe(original);await page.setViewportSize({width,height});await expect(page.locator('#orientation-gate')).not.toBeVisible();}
    await page.locator('#forge-cancel').click();expect(await saved()).toBe(original);await page.locator('#forge-enhance').focus();await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');await expect(page.locator('#forge-confirm')).toBeVisible();expect(await saved()).toBe(original);
    const before=await writes();await page.locator('#forge-confirm').click();expect(await writes()).toBe(before+1);
    let game=parseGame(await saved(),map,lookup);expect(game.profile.bank).toMatchObject({ore:94,dust:48});expect(game.profile.members.guardian!.gear!.body).toMatchObject({plus:3,investment:{ore:15,dust:4}});expect(game.profile.forge).toBe(profile.forge);expect(JSON.parse(await saved()).version).toBe(38);
    await page.locator('#forge-lock').click();await expect(page.locator('#forge-lock')).toHaveAttribute('aria-pressed','true');
    await page.keyboard.press('Escape');await expect(page.locator('#camp-character-dialog')).toBeVisible();await page.locator('#camp-character-dialog [data-world=character-close]').click();await expect(page.locator('#camp-character-dialog')).not.toBeVisible();
    await page.locator('#lobby-tab-gear').click();await page.locator('#forge-open-2').click();await page.locator('#forge-tab-recycle').click();await expect(page.locator('.forge-item-head')).toContainText('+3');
    await expect(page.locator('.forge-refund')).toContainText('แร่ 15');await expect(page.locator('.forge-refund')).toContainText('แร่ 17');
    await page.locator('#forge-lock').click();await expect(page.locator('#forge-recycle')).toBeDisabled();await page.locator('#forge-lock').click();
    const recycleBefore=await saved();await page.locator('#forge-recycle').click();expect(await saved()).toBe(recycleBefore);await page.locator('#forge-cancel').click();expect(await saved()).toBe(recycleBefore);
    await page.locator('#forge-recycle').click();await page.screenshot({path:info.outputPath('forge-refund.png')});await page.locator('#forge-confirm').click();
    game=parseGame(await saved(),map,lookup);expect(game.profile.items.map(i=>i.uid)).toEqual([3]);expect(game.profile.bank).toMatchObject({ore:111,dust:53});await page.locator('#forge-tab-recycle').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#forge-tab-smelt')).toHaveAttribute('aria-selected','true');await page.keyboard.press('Home');await expect(page.locator('#forge-tab-develop')).toHaveAttribute('aria-selected','true');
    await page.locator('[data-lobby=close]').click();await page.locator('#lobby-tab-gear').click();await page.locator('#lobby-sheet .gear-extra-filters summary').click();await page.locator('#camp-inventory-gear-filter-reset').click();await expect(page.locator('#salvage-3')).toBeDisabled();
    await page.reload();await page.locator('#continue').click();game=parseGame(await saved(),map,lookup);expect(game.profile.members.guardian!.gear!.body).toMatchObject({plus:3,locked:true,investment:{ore:15,dust:4}});expect(game.profile.items[0]!.locked).toBe(true);
    expect(errors).toEqual([]);await context.close();
  });
}
