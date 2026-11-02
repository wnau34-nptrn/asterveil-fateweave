import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { affixPool } from '../../src/core/world/equipment';
import { currentSave } from '../fixtures/current-save';
import { xpAt } from '../fixtures/camp-level';
const key='asterveil.fateweave.expedition.v1';
async function open(page:Page) {
  const p=newProfile(map,17);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;p.veteran=true;p.campXp=xpAt(6);p.forgeLevel=9;p.bank={ore:120,dust:48,gold:20,seal:3};
  const weapon={uid:1,slot:'weapon' as const,hero:'guardian',rarity:3,level:6,affixes:affixPool(map.equipment,'weapon','guardian').slice(0,3),plus:4,set:'dawn' as const};
  p.members.guardian={stars:3,dupes:0,gear:{weapon}};p.items=[{...weapon,uid:2,plus:20},{...weapon,uid:3}];p.nextItem=4;
  await page.addInitScript(({key,raw})=>localStorage.setItem(key,raw),{key,raw:currentSave({profile:p,run:null})});
  await page.goto('./');await page.locator('#continue').click();await page.locator('#lobby-tab-forge').click();await page.locator('#forge-item-1').click();await page.evaluate(()=>document.fonts.ready);
}
async function bounds(page:Page) {
  await expect.poll(()=>page.locator('.forge-enhancement').evaluate(e=>{
    const body=e.querySelector('.forge-enhancement-content')!,dock=e.querySelector('.forge-enhancement-dock')!,app=document.querySelector('#app')!,header=document.querySelector('.lobby-sheet-head')!;
    const r=app.getBoundingClientRect(),d=dock.getBoundingClientRect(),b=body.getBoundingClientRect(),h=header.getBoundingClientRect();
    return b.height>=44&&d.bottom<=r.bottom+1&&h.top>=r.top-1&&h.bottom<=r.bottom&&body.scrollWidth<=body.clientWidth+1&&[...e.querySelectorAll('button,summary')].every(c=>c.getBoundingClientRect().height>=44);
  })).toBe(true);
}
for(const [width,height,touch] of [[320,568,true],[390,650,true],[390,844,true],[480,844,true],[1366,768,false]] as const){
  test(`enhancement visual reflow, neutral preview and explicit receipt ${width}x${height}`,async({browser})=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await open(page);const saved=()=>page.evaluate(k=>localStorage.getItem(k),key),initial=await saved();
    await expect(page.locator('.forge-hero-preview')).toContainText('ค่าสถานะรวมเท่าเดิม');await expect(page.locator('.forge-hero-preview table')).toHaveCount(0);
    expect(await page.locator('.forge-item-head .gear-art').evaluate(e=>e.getBoundingClientRect().width)).toBe(96);await bounds(page);
    if(width===390)await page.screenshot({path:`docs/validation/enhancement-visual/ready-390x${height}.png`});
    await page.locator('#forge-enhance').click();await bounds(page);expect(await saved()).toBe(initial);
    if(width===390&&height===844)await page.screenshot({path:'docs/validation/enhancement-visual/review-390.png'});
    await page.locator('#forge-cancel').click();await expect(page.locator('#forge-enhance')).toBeFocused();
    await page.evaluate(()=>document.documentElement.style.fontSize='32px');
    await expect(page.locator('.forge-enhancement')).toHaveClass(/forge-text-large/);await bounds(page);
    if(width===390&&height===650)await page.screenshot({path:'docs/validation/enhancement-visual/text200-390.png'});
    await page.locator('#forge-enhance').click();await bounds(page);await page.keyboard.press('Escape');expect(await saved()).toBe(initial);
    await page.evaluate(()=>document.documentElement.style.fontSize='16px');await expect(page.locator('.forge-enhancement')).not.toHaveClass(/forge-text-large/);
    await page.locator('#forge-enhance').click();await page.locator('#forge-confirm').dblclick();await expect(page.locator('#forge-success')).toBeFocused();
    expect(JSON.parse((await saved())!).profile.bank).toMatchObject({ore:112,dust:45});await expect(page.locator('.forge-step h3')).toHaveText('+4 → +5');
    if(width===390&&height===844){await expect(page.locator('.forge-strike')).toHaveCount(0);await page.screenshot({path:'docs/validation/enhancement-visual/success-390.png'});}
    const committed=await saved();await page.locator('#forge-next-preview').click();await expect(page.locator('.forge-step h3')).toHaveText('+5 → +6');expect(await saved()).toBe(committed);
    await page.locator('#forge-change-item').click();await page.keyboard.press('Escape');await expect(page.locator('#forge-change-item')).toBeFocused();expect(await saved()).toBe(committed);
    expect(errors).toEqual([]);await context.close();
  });
}
test('enhancement keyboard, bag item identity and decorative URLs use the actual surface',async({page,baseURL})=>{
  await page.setViewportSize({width:390,height:650});await open(page);const initial=await page.evaluate(k=>localStorage.getItem(k),key);
  await page.locator('#forge-change-item').focus();await page.keyboard.press('Tab');await expect(page.locator('#forge-lock')).toBeFocused();await page.keyboard.press('Tab');
  expect(await page.evaluate(()=>document.activeElement?.tagName)).toBe('SUMMARY');await page.keyboard.press('Space');await expect(page.locator('.forge-secondary-details')).toHaveAttribute('open','');
  for(const file of ['frame-corner.svg','frame-edge-horizontal.svg','frame-edge-vertical.svg','divider-wing.svg']){
    const response=await page.request.get(new URL(`assets/ui/forge-enhancement/${file}`,baseURL!).href);expect(response.ok()).toBe(true);expect(await response.text()).toContain('<svg');
  }
  expect(await page.locator('.forge-frame-trim').evaluate(e=>getComputedStyle(e).pointerEvents)).toBe('none');
  await page.locator('#forge-change-item').click();await page.locator('#forge-item-3').click();await expect(page.locator('.forge-hero-preview h4')).toHaveText('ผลต่ออุปกรณ์');await expect(page.locator('.forge-item-head')).toContainText('ไม่มีผู้สวม');
  const ids=await page.locator('.forge-workbench [id]').evaluateAll(nodes=>nodes.map(e=>e.id));expect(new Set(ids).size).toBe(ids.length);expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(initial);
});
