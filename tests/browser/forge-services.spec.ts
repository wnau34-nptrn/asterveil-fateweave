import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile, salvage } from '../../src/core/world/profile';
import { craftWeapon, smelt, weaponBlueprint } from '../../src/core/world/forge';
import { parseGame } from '../../src/core/save/expedition-save';
import { encounterById } from '../../src/content/encounters/catalog';
import { legacyEnvelope } from '../fixtures/legacy-save';
import { chooseForgeTask } from './forge-navigation';
const key='asterveil.fateweave.expedition.v1';
function fixture(){
 const p=newProfile(map,17);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;p.forgeLevel=6;p.bank={ore:120,dust:48,gold:20,seal:3};p.items=[{uid:1,slot:'body',rarity:1,level:3,affixes:['hp'],plus:2,investment:{ore:9,dust:2},levelInvestment:{ore:20,dust:2},set:'dawn'}];p.nextItem=2;return p;
}
async function seed(page:Page,p=fixture()){
 const raw=JSON.stringify(legacyEnvelope({version:25,profile:p,run:null}));expect(parseGame(raw,map,encounterById).profile.commander?.name).toBe('อารี');
 await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('service-seed')){localStorage.setItem(key,raw);sessionStorage.setItem('service-seed','1');}const w=window as unknown as {forgeWrites:number};w.forgeWrites=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)w.forgeWrites++;set.call(this,k,v);};},{key,raw});
 await page.goto('./');await page.locator('#continue').click();await page.locator('#lobby-tab-forge').click();
}
const saved=(page:Page)=>page.evaluate(k=>localStorage.getItem(k)!,key);
const profile=async(page:Page)=>parseGame(await saved(page),map,encounterById).profile;
async function reachable(page:Page){
 const b=page.locator('#forge-confirm');expect(await b.evaluate(el=>{const r=el.getBoundingClientRect(),a=document.querySelector('#app')!.getBoundingClientRect();return r.height>=44&&r.top>=a.top&&r.bottom<=a.bottom+1&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;})).toBe(true);
 expect(await page.locator('.forge-service-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
}
for(const [width,height,touch] of [[320,568,true],[390,650,true],[390,844,true],[1366,768,false]] as const)for(const task of ['craft','recycle','smelt'] as const)test(`${task}: reviewed totals, receipt and readonly next at ${width}x${height}`,async({browser},info)=>{
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await seed(page);
  await chooseForgeTask(page,task);if(task==='craft')await page.locator('#forge-craft-level').selectOption('3');if(task==='recycle')await page.locator('[data-forge=pick][data-uid="1"]').click();if(task==='smelt')await page.locator('#forge-target').selectOption('5');
  const original=await saved(page),before=await profile(page);
  await page.locator('#forge-'+task).focus();await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');await expect(page.locator('#forge-confirm')).toBeVisible();await reachable(page);expect(await saved(page)).toBe(original);await expect(page.locator('#forge-craft-hero,#forge-craft-level,#forge-target,#forge-lock')).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(page.locator('#forge-'+task)).toBeFocused();expect(await saved(page)).toBe(original);
  await page.locator('#forge-'+task).click();await page.locator('#forge-cancel').click();expect(await saved(page)).toBe(original);await page.locator('#forge-'+task).click();await reachable(page);
  if(width===390)await page.screenshot({path:`/tmp/uxd-05/${task}-review-${height}.png`});await page.screenshot({path:info.outputPath(`${task}-review.png`)});
  const writes=await page.evaluate(()=>(window as unknown as {forgeWrites:number}).forgeWrites);
  await page.locator('#forge-confirm').dblclick();await expect(page.locator('#forge-success')).toBeFocused();await expect(page.locator('.forge-service-page')).toHaveAttribute('data-receipt','true');await expect(page.locator('.forge-service-page')).toHaveAttribute('data-persisted','true');expect(await page.evaluate(()=>(window as unknown as {forgeWrites:number}).forgeWrites)).toBe(writes+1);
  const expected=task==='craft'?craftWeapon(before,map,before.company[0]!,3):task==='recycle'?salvage(before,map,[1]):smelt(before,map,5),after=await profile(page);expect(after).toEqual({...expected.profile,last:null});expect(after.forge).toBe(before.forge);expect(after.members).toEqual(before.members);
  await expect(page.locator('.forge-cost-status')).toContainText(`ยอดบันทึกจริง · แร่ ${after.bank.ore} · ฝุ่น ${after.bank.dust}`);
  if(task==='recycle'){expect(after.items.some(i=>i.uid===1)).toBe(false);await expect(page.locator('.forge-item-head')).toContainText('#1');}
  if(task==='craft'){expect(after.items.at(-1)).toEqual(weaponBlueprint(map,before.company[0]!,3,before.nextItem));expect(after.hunt).toEqual(before.hunt);}
  if(task==='smelt')expect(after.smelted).toBe(before.smelted+5);
  if(width===390)await page.screenshot({path:`/tmp/uxd-05/${task}-result-${height}.png`});await page.screenshot({path:info.outputPath(`${task}-result.png`)});
  const receipt=await saved(page);await page.locator('#forge-next-preview').dblclick();expect(await saved(page)).toBe(receipt);if(task==='craft')await expect(page.locator('#forge-craft-level')).toHaveValue('3');if(task==='smelt')await expect(page.locator('#forge-target')).toHaveValue('5');
 const final=await profile(page);await page.reload();await page.locator('#continue').click();expect(await profile(page)).toEqual(final);expect(errors).toEqual([]);await context.close();
});
test('craft storage detour keeps recipe, selected item and return context',async({page})=>{
 await page.setViewportSize({width:390,height:650});const p=fixture();p.items=Array.from({length:60},(_,i)=>weaponBlueprint(map,'guardian',1,i+1));p.nextItem=61;await seed(page,p);await chooseForgeTask(page,'craft');await page.locator('#forge-craft-level').selectOption('3');await expect(page.locator('#forge-craft')).toBeDisabled();const raw=await saved(page);
 await page.locator('#forge-manage-storage').click();await expect(page.locator('#lobby-sheet-title')).toContainText('อุปกรณ์');await page.keyboard.press('Escape');await expect(page.locator('#forge-craft-level')).toHaveValue('3');await expect(page.locator('#forge-craft')).toBeDisabled();await expect(page.locator('#forge-manage-storage')).toBeFocused();expect(await saved(page)).toBe(raw);
});
test('smelt quota, shortage and 200% text with safe insets keep review reachable',async({page})=>{
 await page.setViewportSize({width:390,height:650});const p=fixture();p.smelted=map.equipment.forge.smeltCap-4;p.bank.ore=8;await seed(page,p);await chooseForgeTask(page,'smelt');await expect(page.locator('#forge-target option[value="5"]')).toBeDisabled();await expect(page.locator('#forge-smelt')).toBeEnabled();
 await page.addStyleTag({content:':root{font-size:200% !important} .lobby-sheet:has(.forge-service-page){--enhance-safe-top:59px;--enhance-safe-bottom:34px}'});await page.locator('#forge-smelt').click();await reachable(page);await page.screenshot({path:'/tmp/uxd-05/smelt-review-text200-insets.png'});const before=await profile(page);await page.locator('#forge-confirm').click();expect((await profile(page)).bank).toEqual({...before.bank,ore:0,dust:before.bank.dust+1});await page.locator('#forge-next-preview').click();await expect(page.locator('#forge-smelt')).toBeDisabled();await expect(page.locator('.forge-reason')).toContainText('แร่ดาวขาด 8');
});

for(const task of ['craft','recycle'] as const)test(`${task} review at 200% text and safe insets stays readable and readonly`,async({page})=>{
 await page.setViewportSize({width:390,height:650});await seed(page);await chooseForgeTask(page,task);if(task==='recycle')await page.locator('[data-forge=pick][data-uid="1"]').click();
 const raw=await saved(page);await page.addStyleTag({content:':root{font-size:200% !important} .lobby-sheet:has(.forge-service-page){--enhance-safe-top:59px;--enhance-safe-bottom:34px}'});await page.locator('#forge-'+task).click();await reachable(page);const frame=await page.locator('.lobby-sheet').boundingBox();expect(frame!.y).toBeGreaterThanOrEqual(59);expect(frame!.y+frame!.height).toBeLessThanOrEqual(650-34);await page.screenshot({path:`/tmp/uxd-05/${task}-review-text200-insets.png`});await page.keyboard.press('Escape');await expect(page.locator('#forge-'+task)).toBeFocused();expect(await saved(page)).toBe(raw);
});

test('a failed storage write never claims a persisted success or offers a repeat confirm',async({page})=>{
 await page.setViewportSize({width:390,height:650});await seed(page);await chooseForgeTask(page,'smelt');const raw=await saved(page);await page.locator('#forge-smelt').click();
 await page.evaluate(key=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Test storage failure','QuotaExceededError');set.call(this,k,v);};},key);
 await page.locator('#forge-confirm').click();await expect(page.locator('.forge-service-page')).toHaveAttribute('data-persisted','false');await expect(page.locator('#forge-success')).toContainText('ทำรายการแล้ว แต่บันทึกบนเครื่องไม่สำเร็จ');await expect(page.locator('#forge-success')).not.toContainText('บันทึกผลแล้ว');await expect(page.locator('#forge-confirm')).toHaveCount(0);expect(await saved(page)).toBe(raw);await page.locator('#forge-next-preview').click();expect(await saved(page)).toBe(raw);
});

test('changing a reviewed task discards the old confirmation and keeps the chosen recipe',async({page})=>{
 await page.setViewportSize({width:390,height:650});await seed(page);await chooseForgeTask(page,'craft');await page.locator('#forge-craft-level').selectOption('3');const raw=await saved(page);await page.locator('#forge-craft').click();await chooseForgeTask(page,'smelt');await expect(page.locator('#forge-confirm')).toHaveCount(0);await chooseForgeTask(page,'craft');await expect(page.locator('#forge-craft-level')).toHaveValue('3');await expect(page.locator('#forge-confirm')).toHaveCount(0);expect(await saved(page)).toBe(raw);
});
