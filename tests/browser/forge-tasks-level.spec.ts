import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { affixPool } from '../../src/core/world/equipment';
import { currentSave } from '../fixtures/current-save';
import { parseGame } from '../../src/core/save/expedition-save';
import { encounterById } from '../../src/content/encounters/catalog';
import { xpAt } from '../fixtures/camp-level';
import { chooseForgeTask } from './forge-navigation';

const key='asterveil.fateweave.expedition.v1';
async function seed(page:Page,withTrialHero=false){
  const p=newProfile(map,17);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;p.veteran=true;p.campXp=xpAt(6);p.forgeLevel=9;p.bank={ore:120,dust:48,gold:20,seal:3};
  p.members.guardian={stars:3,dupes:0,gear:{body:{uid:1,slot:'body',rarity:2,level:6,affixes:affixPool(map.equipment,'body').slice(0,2),plus:4,set:'dawn',levelInvestment:{ore:40,dust:2}}}};
  p.items=[{uid:2,slot:'body',rarity:0,level:9,affixes:[]},{uid:3,slot:'body',rarity:0,level:24,affixes:[]}];p.nextItem=4;
  if(withTrialHero){if(!p.company.includes('healer'))p.company.push('healer');p.members.healer={stars:1,dupes:0};p.items.push({...p.members.guardian.gear!.body!,uid:4});p.nextItem=5;}
  const raw=currentSave({profile:p,run:null});parseGame(raw,map,encounterById);
  await page.addInitScript(({key,raw})=>{
    localStorage.setItem(key,raw);const w=window as unknown as {forgeWrites:number};w.forgeWrites=0;const set=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){if(k===key)w.forgeWrites++;set.call(this,k,v);};
  },{key,raw});
  await page.goto('./');await expect(page).toHaveTitle(/Asterveil/);await page.locator('#continue').click();
}
async function bounds(page:Page){
  await expect.poll(()=>page.locator('#lobby-sheet').evaluate(sheet=>{
    const a=document.querySelector('#app')!.getBoundingClientRect(),r=sheet.getBoundingClientRect(),body=sheet.querySelector('#forge-body')!,dock=sheet.querySelector('.forge-enhancement-dock'),css=getComputedStyle(sheet);const top=parseFloat(css.getPropertyValue('--enhance-safe-top'))||0,bottom=parseFloat(css.getPropertyValue('--enhance-safe-bottom'))||0;
    const controls=[...sheet.querySelectorAll('.lobby-sheet-head > button'),...sheet.querySelectorAll('.forge-footer-buttons button')];
    return r.left>=a.left+7&&r.right<=a.right-7&&r.top>=a.top+Math.max(8,top)-1&&r.bottom<=a.bottom-Math.max(8,bottom)+1&&body.scrollWidth<=body.clientWidth+1&&body.clientHeight>=44&&controls.every(el=>{const c=el.getBoundingClientRect();return c.height>=44&&c.left>=r.left&&c.right<=r.right&&c.top>=r.top&&c.bottom<=r.bottom&&el.contains(document.elementFromPoint(c.x+c.width/2,c.y+c.height/2));})&&(!dock||dock.getBoundingClientRect().bottom<=r.bottom);
  })).toBe(true);
}
for(const [width,height,touch] of [[320,568,true],[390,650,true],[390,844,true],[1366,768,false]] as const){
  test(`forge task launcher and level receipt preserve the item ${width}x${height}`,async({browser},info)=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),page=await context.newPage(),errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await seed(page);
    if(width===390&&height===844)await page.addStyleTag({content:'.lobby-sheet:has(.forge-level,.forge-launcher){--enhance-safe-top:59px;--enhance-safe-bottom:34px}'});
    const saved=()=>page.evaluate(k=>localStorage.getItem(k),key),writes=()=>page.evaluate(()=>(window as unknown as {forgeWrites:number}).forgeWrites),initial=await saved();
    await page.locator('#lobby-tab-forge').click();await expect(page.locator('#lobby-sheet-title')).toHaveText('เลือกงานโรงตีเหล็ก');await expect(page.locator('.forge-task-card')).toHaveCount(8);await bounds(page);
    if(width===390&&height===844)await page.screenshot({path:info.outputPath('task-launcher-390.png')});
    await page.evaluate(()=>document.documentElement.style.fontSize='32px');await bounds(page);expect(await page.locator('#forge-mode-level b').evaluate(el=>getComputedStyle(el).fontSize)).toBe('32px');await page.evaluate(()=>document.documentElement.style.fontSize='16px');
    await chooseForgeTask(page,'level');await expect(page.locator('#lobby-sheet-title')).toBeFocused();await page.locator('#forge-item-1').click();await expect(page.locator('.forge-level')).toBeVisible();await expect(page.locator('.forge-step h3')).toHaveText('Lv6 → Lv7');
    await expect(page.locator('#forge-cost')).toContainText('แร่ · ใช้ 28');await expect(page.locator('#forge-cost')).toContainText('ฝุ่น · ใช้ 1');await expect(page.locator('.forge-level-cap')).toContainText('Lv9');await bounds(page);
    await chooseForgeTask(page,'enhance');await expect(page.locator('.forge-step h3')).toHaveText('+4 → +5');await chooseForgeTask(page,'level');await expect(page.locator('.forge-step h3')).toHaveText('Lv6 → Lv7');expect(await saved()).toBe(initial);
    if(width===390&&height===844)await page.screenshot({path:info.outputPath('item-level-ready-390.png')});
    await page.locator('#forge-level').click();await bounds(page);await page.locator('#forge-cancel').click();await expect(page.locator('#forge-level')).toBeFocused();expect(await saved()).toBe(initial);
    await page.evaluate(()=>document.documentElement.style.fontSize='32px');await expect(page.locator('.forge-level')).toHaveClass(/forge-text-large/);await bounds(page);await page.locator('#forge-level').click();await bounds(page);await page.keyboard.press('Escape');await expect(page.locator('#forge-level')).toBeFocused();
    await page.evaluate(()=>document.documentElement.style.fontSize='16px');await expect(page.locator('.forge-level')).not.toHaveClass(/forge-text-large/);
    if(touch){await page.setViewportSize({width:844,height:390});await expect(page.locator('#orientation-gate')).toBeVisible();await page.setViewportSize({width,height});await expect(page.locator('#orientation-gate')).not.toBeVisible();await bounds(page);}
    await page.locator('#forge-level').click();const beforeWrites=await writes();await page.locator('#forge-confirm').dblclick();await expect(page.locator('#forge-success')).toBeFocused();await expect(page.locator('.forge-step h3')).toHaveText('Lv6 → Lv7');await expect(page.locator('#forge-next-preview')).toBeVisible();
    expect(await writes()).toBe(beforeWrites+1);const committed=await saved(),game=JSON.parse(committed!);expect(game.profile.bank).toMatchObject({ore:92,dust:47});expect(game.profile.members.guardian.gear.body).toMatchObject({level:7,plus:4,rarity:2,set:'dawn',levelInvestment:{ore:68,dust:3}});
    await page.locator('#forge-next-preview').click();await expect(page.locator('.forge-step h3')).toHaveText('Lv7 → Lv8');expect(await saved()).toBe(committed);
    await page.locator('#forge-change-item').click();await page.locator('#forge-item-2').click();await expect(page.locator('#forge-level')).toHaveCount(0);await expect(page.locator('.forge-step h3')).toContainText('Lv9 · ถึงเพดาน');
    await page.locator('#forge-change-item').click();await page.locator('#forge-item-3').click();await expect(page.locator('.forge-step h3')).toContainText('Lv24 · ถึงเพดาน');await expect(page.locator('#forge-level')).toHaveCount(0);
    await page.locator('#forge-change-item').click();await page.keyboard.press('Escape');await expect(page.locator('#forge-change-item')).toBeFocused();expect(await saved()).toBe(committed);expect(errors).toEqual([]);await context.close();
  });
}
test('level review returns to the character equipment context without spending',async({page})=>{
  await page.setViewportSize({width:390,height:844});await seed(page);
  const initial=await page.evaluate(k=>localStorage.getItem(k),key);await page.locator('#lobby-tab-team').click();await page.locator('#lobby-member-guardian').click();await page.locator('#lobby-gear-open').click();await page.locator('#camp-bag-slot-body').click();
  const trigger=page.locator('#camp-character-forge-worn');await trigger.click();await chooseForgeTask(page,'level');await page.locator('#forge-level').click();await page.keyboard.press('Escape');await expect(page.locator('#forge-level')).toBeFocused();await page.keyboard.press('Escape');
  await expect(page.locator('#camp-character-dialog')).toBeVisible();await expect(page.locator('#camp-character-tab-gear')).toHaveAttribute('aria-selected','true');await expect(page.locator('#camp-bag-slot-body')).toHaveAttribute('aria-pressed','true');await expect(trigger).toBeFocused();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(initial);
});

test('committed level receipt stays while inspecting an unowned item on another trial hero',async({page})=>{
  await page.setViewportSize({width:390,height:844});await seed(page,true);await page.locator('#lobby-tab-forge').click();await chooseForgeTask(page,'level');await page.locator('#forge-item-4').click();await expect(page.locator('.forge-hero-preview h4')).toHaveText('ผลต่ออุปกรณ์');
  await page.locator('.forge-secondary-details > summary').click();const initial=await page.evaluate(k=>localStorage.getItem(k),key);await page.locator('#forge-preview-hero').selectOption('healer');expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(initial);
  await page.locator('#forge-level').click();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(initial);await page.locator('#forge-confirm').click();await expect(page.locator('#forge-success')).toContainText('Lv6 → Lv7');
  const committed=await page.evaluate(k=>localStorage.getItem(k),key);await page.locator('#forge-preview-hero').selectOption('guardian');await expect(page.locator('.forge-level')).toHaveAttribute('data-receipt','true');await expect(page.locator('.forge-step h3')).toHaveText('Lv6 → Lv7');expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(committed);
  const game=JSON.parse(committed!);expect(game.profile.members.guardian.gear.body.level).toBe(6);expect(game.profile.items.find((item:{uid:number})=>item.uid===4).level).toBe(7);expect(game.profile.bank).toMatchObject({ore:92,dust:47});
});
