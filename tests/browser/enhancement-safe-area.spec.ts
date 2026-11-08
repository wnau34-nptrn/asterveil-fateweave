import { chooseForgeTask } from './forge-navigation';
import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { affixPool } from '../../src/core/world/equipment';
import { currentSave } from '../fixtures/current-save';
import { xpAt } from '../fixtures/camp-level';

const key='asterveil.fateweave.expedition.v1';
async function open(page:Page) {
  const p=newProfile(map,17);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;p.veteran=true;p.campXp=xpAt(6);p.forgeLevel=9;p.bank={ore:1277,dust:84,gold:20,seal:3};
  p.members.guardian!.gear={body:{uid:1,slot:'body',rarity:4,level:24,affixes:affixPool(map.equipment,'body').slice(0,map.equipment.affixCount[4]),special:'renewal',set:'dawn'}};p.nextItem=2;
  await page.addInitScript(({key,raw})=>localStorage.setItem(key,raw),{key,raw:currentSave({profile:p,run:null})});
  await page.goto('./');await expect(page).toHaveTitle(/Asterveil/);await page.locator('#continue').click();await page.locator('#lobby-tab-forge').click();await chooseForgeTask(page,'enhance');await page.locator('#forge-item-1').click();await page.evaluate(()=>document.fonts.ready);
}
async function bounds(page:Page,top:number,bottom:number,left=0,right=0) {
  await expect.poll(()=>page.locator('#lobby-sheet').evaluate((sheet,insets)=>{
    const app=document.querySelector('#app')!.getBoundingClientRect(),r=sheet.getBoundingClientRect();
    const body=sheet.querySelector('.forge-enhancement-content')!,b=body.getBoundingClientRect(),dock=sheet.querySelector('.forge-enhancement-dock')!.getBoundingClientRect();
    const controls=[...sheet.querySelectorAll('.lobby-sheet-head > button'),...sheet.querySelectorAll('.forge-footer-buttons button')];
    return r.top>=app.top+Math.max(8,insets.top)-1&&r.bottom<=app.bottom-Math.max(8,insets.bottom)+1&&r.left>=app.left+Math.max(8,insets.left)-1&&r.right<=app.right-Math.max(8,insets.right)+1
      &&b.height>=44&&dock.bottom<=r.bottom&&body.scrollWidth<=body.clientWidth+1
      &&[...sheet.querySelectorAll('.forge-frame-trim i')].every(el=>{const a=el.getBoundingClientRect();return a.left>=r.left&&a.right<=r.right&&a.top>=r.top&&a.bottom<=r.bottom;})
      &&controls.every(el=>{const c=el.getBoundingClientRect();return c.height>=44&&c.left>=r.left&&c.right<=r.right&&c.top>=r.top&&c.bottom<=r.bottom&&el.contains(document.elementFromPoint(c.x+c.width/2,c.y+c.height/2));});
  },{top,bottom,left,right})).toBe(true);
}
for(const scenario of [
  {name:'iPhone edge-to-edge',width:390,height:844,top:59,bottom:34,left:0,right:0},
  {name:'Safari toolbar visible',width:390,height:650,top:0,bottom:0,left:0,right:0},
  {name:'short phone with side insets',width:320,height:568,top:20,bottom:20,left:8,right:12},
]) {
  test(`enhancement frame stays inside safe area: ${scenario.name}`,async({browser},testInfo)=>{
    const s=scenario,context=await browser.newContext({viewport:{width:s.width,height:s.height},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await context.newPage(),errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await open(page);
    // Device emulation does not expose real iOS env() insets. Override only the
    // enhancement's CSS inputs, keeping its actual container and DOM layout.
    await page.addStyleTag({content:`.lobby-sheet:has(.forge-enhancement){--enhance-safe-top:${s.top}px;--enhance-safe-bottom:${s.bottom}px;--enhance-safe-left:${s.left}px;--enhance-safe-right:${s.right}px}`});
    const saved=()=>page.evaluate(k=>localStorage.getItem(k),key),initial=await saved();
    await bounds(page,s.top,s.bottom,s.left,s.right);
    if(s.height===844)await page.screenshot({path:testInfo.outputPath('iphone-safe-frame.png')});
    await page.locator('#forge-enhance').focus();await bounds(page,s.top,s.bottom,s.left,s.right);await expect(page.locator('#forge-enhance')).toBeFocused();
    await page.evaluate(()=>document.documentElement.style.fontSize='32px');await bounds(page,s.top,s.bottom,s.left,s.right);await bounds(page,s.top,s.bottom,s.left,s.right);
    await page.evaluate(()=>document.documentElement.style.fontSize='16px');
    if(s.height===844){await page.setViewportSize({width:844,height:390});await expect(page.locator('#orientation-gate')).toBeVisible();await page.setViewportSize({width:390,height:650});await expect(page.locator('#orientation-gate')).not.toBeVisible();await bounds(page,s.top,s.bottom);}
    expect(await saved()).toBe(initial);expect(errors).toEqual([]);await context.close();
  });
}
