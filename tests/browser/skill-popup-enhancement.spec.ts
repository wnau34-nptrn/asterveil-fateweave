import {test,expect,type Page} from '@playwright/test';
import {chapterOne as map} from '../../src/content/world/chapter1';
import {newProfile} from '../../src/core/world/profile';
import {currentSave} from '../fixtures/current-save';
import {xpAt} from '../fixtures/camp-level';
const key='asterveil.fateweave.expedition.v1';
async function open(page:Page){
  const p=newProfile(map,17);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;p.veteran=true;p.campXp=xpAt(6);p.bank={ore:21,dust:10,gold:0,shard:0};
  p.items=[{uid:1,slot:'body',rarity:0,level:1,affixes:[],plus:2}];p.nextItem=2;
  await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('popup-seeded')){localStorage.setItem(key,raw);sessionStorage.setItem('popup-seeded','1');}},{key,raw:currentSave({profile:p,run:null})});
  await page.goto('./');await expect(page).toHaveTitle(/Asterveil/);await page.locator('#continue').click();await expect(page.locator('vite-error-overlay')).toHaveCount(0);
}
const saved=(page:Page)=>page.evaluate(k=>localStorage.getItem(k)!,key);
for(const [width,height,touch] of [[320,568,true],[390,650,true],[390,844,true],[1366,768,false]] as const){
 test(`skill popup preserves tree and spends explicitly ${width}x${height}`,async({browser},info)=>{
  const c=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),page=await c.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await open(page);
  await page.locator('#lobby-tab-team').click();await page.locator('#lobby-member-guardian').click();await page.locator('#lobby-tree-open').click();
  const before=await saved(page),pane=page.locator('#camp-character-content'),popup=page.locator('#camp-talent-detail-dialog');
  await page.locator('#camp-character-talent-a1').click();const scroll=await pane.evaluate(e=>e.scrollTop);await expect(popup).toBeVisible();expect(await saved(page)).toBe(before);
  const learn=popup.locator('[data-world=character-talent]');await expect(learn).toContainText('อัพสกิล');
  expect(await learn.evaluate(e=>{const r=e.getBoundingClientRect(),a=document.querySelector('#app')!.getBoundingClientRect();return r.height>=44&&r.top>=a.top&&r.bottom<=a.bottom&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;})).toBe(true);
  await learn.dblclick();expect(JSON.parse(await saved(page)).profile.members.guardian.talents).toEqual({a1:1});await expect(popup).toContainText('1/2');
  if(width===390&&height===844)await page.screenshot({path:info.outputPath('skill-popup-390.png')});
  await page.keyboard.press('Escape');await expect(popup).not.toBeVisible();await expect(page.locator('#camp-character-dialog')).toBeVisible();await expect(page.locator('#camp-character-talent-a1')).toBeFocused();expect(await pane.evaluate(e=>e.scrollTop)).toBe(scroll);
  await page.locator('#camp-character-talent-a1').click();await learn.click();await expect(learn).toHaveAttribute('aria-disabled','true');const full=await saved(page);await learn.dispatchEvent('click');expect(await saved(page)).toBe(full);
  await popup.getByRole('button',{name:'ปิดรายละเอียดสกิล'}).click();await page.locator('#camp-character-talent-a4').click();await expect(popup).toContainText('เปิดที่ Lv15');await expect(learn).toHaveAttribute('aria-disabled','true');
  await page.mouse.click(2,2);await expect(popup).not.toBeVisible();expect(await saved(page)).toBe(full);
  expect(errors).toEqual([]);await c.close();
 });
 test(`enhancement continues in place and stops at cap ${width}x${height}`,async({browser},info)=>{
  const c=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),page=await c.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await page.locator('#lobby-tab-gear').click();await page.locator('#forge-open-1').click();
  await page.locator('#forge-enhance').dblclick();await expect(page.locator('#forge-success')).toContainText('+2 → +3');await expect(page.locator('.forge-step h3')).toHaveText('+3 → +4');expect(JSON.parse(await saved(page)).profile.items[0].plus).toBe(3);
  await expect(page.locator('#forge-enhance')).toContainText('ตีบวก +4');await expect(page.locator('#forge-next-preview,#forge-confirm')).toHaveCount(0);
  if(width===390&&height===844)await page.screenshot({path:info.outputPath('continuous-enhancement-390.png')});
  await page.locator('#forge-enhance').click();expect(JSON.parse(await saved(page)).profile.items[0].plus).toBe(4);await expect(page.locator('#forge-enhance')).toContainText('ตีบวก +5');
  await page.locator('#forge-enhance').click();const result=JSON.parse(await saved(page));expect(result.profile.items[0].plus).toBe(5);expect(result.profile.bank).toMatchObject({ore:0,dust:3});await expect(page.locator('.forge-step')).toContainText('ขั้นสูงสุด');await expect(page.locator('#forge-enhance')).toHaveCount(0);expect(errors).toEqual([]);await c.close();
 });
}
