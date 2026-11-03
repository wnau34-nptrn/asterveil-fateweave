import { expect, test, type Page } from '@playwright/test';
import { chooseForgeTask } from './forge-navigation';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
import { encounterById } from '../../src/content/encounters/catalog';
import { currentSave } from '../fixtures/current-save';
import { xpAt } from '../fixtures/camp-level';
const key='asterveil.fateweave.expedition.v1';
async function open(page:Page,poor=false){
  const p=newProfile(map,17);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;p.veteran=true;p.campXp=xpAt(6);p.bank={ore:poor?11:100,dust:poor?2:100,seal:poor?0:5,gold:20};
  p.items=[{uid:1,slot:'body',rarity:3,level:6,affixes:['hp','armour','regen'],q:{main:109,affixes:[80,95,105]},set:'dawn',plus:5,investment:{ore:30,dust:9},levelInvestment:{ore:20,dust:2},locked:true},
    {uid:2,slot:'body',rarity:4,level:3,affixes:['support','resist','barrier'],q:{main:90,affixes:[120,88,100]},special:'renewal',set:'wind',plus:2,investment:{ore:9,dust:2},levelInvestment:{ore:20,dust:2}}];p.nextItem=3;
  const raw=currentSave({profile:p,run:null});parseGame(raw,map,encounterById);
  await page.addInitScript(({key,raw})=>localStorage.setItem(key,raw),{key,raw});await page.goto('./');await page.locator('#continue').click();await page.locator('#lobby-tab-gear').click();await page.locator('#forge-open-1').click();await chooseForgeTask(page,'transfer');await page.locator('#forge-transfer-donor').selectOption('2');
}
async function reachable(page:Page,selector:string){
  const b=page.locator(selector);await b.scrollIntoViewIfNeeded();expect(await b.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;})).toBe(true);
  expect(await page.locator('.forge-workbench').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
}
test('transfer refuses net-affordable refunds until all upfront fees are owned',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:650},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await context.newPage();await open(page,true);const original=await page.evaluate(k=>localStorage.getItem(k),key);
  expect(await page.locator('#forge-cost tbody tr').first().locator('td').allTextContents()).toEqual(['11','12','29','28']);expect(await page.locator('#forge-cost tbody tr').nth(1).locator('td').allTextContents()).toEqual(['2','3','4','3']);
  for(const text of ['แร่ขาด 1','ฝุ่นขาด 1','ตราขาด 1'])await expect(page.locator('.forge-cost-status')).toContainText(text);await expect(page.locator('#forge-transfer')).toBeDisabled();
  await page.locator('#forge-transfer').dispatchEvent('click');await expect(page.locator('#forge-confirm')).toHaveCount(0);expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(original);await context.close();
});
test('transfer keeps the receiver, clears changed reviews, and returns inventory focus',async({browser},info)=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await context.newPage();await open(page);const original=await page.evaluate(k=>localStorage.getItem(k),key);
  await expect(page.locator('.forge-transfer-donor-card')).toContainText('เซ็ตสายลมเร็ว');await expect(page.locator('.forge-transfer-donor-card')).toContainText('พลังตำนาน');await expect(page.locator('.forge-transfer-change')).toContainText('เลือด 80% → พลังเวท 120%');
  await page.locator('.forge-transfer-donor-card').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('transfer-selection-390.png')});await page.locator('#forge-transfer').click();
  await chooseForgeTask(page,'level');await chooseForgeTask(page,'transfer');await expect(page.locator('#forge-confirm')).toHaveCount(0);await expect(page.locator('.forge-item-head')).toContainText('#1');await page.locator('#forge-change-item').click();await page.locator('#forge-item-2').click();await expect(page.locator('.forge-item-head')).toContainText('#2');await expect(page.locator('.forge-transfer-material')).toHaveCount(0);await expect(page.locator('#forge-transfer')).toBeDisabled();await page.locator('#forge-change-item').click();await page.locator('#forge-item-1').click();await page.locator('#forge-transfer-donor').selectOption('2');await page.locator('#forge-transfer').click();
  await page.keyboard.press('Escape');await expect(page.locator('#forge-transfer')).toBeFocused();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(original);await page.locator('[data-lobby=close]').click();await expect(page.locator('#forge-open-1')).toBeFocused();await context.close();
});
test('transfer review remains reachable with 200% text and iPhone-like insets on a short phone',async({browser},info)=>{
  const context=await browser.newContext({viewport:{width:390,height:650},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await context.newPage();await open(page);const original=await page.evaluate(k=>localStorage.getItem(k),key);
  await page.locator('#forge-transfer').click();await page.addStyleTag({content:':root {font-size:32px !important}.lobby-sheet:has(.forge-transfer-page){--enhance-safe-top:59px;--enhance-safe-bottom:34px}'});
  await reachable(page,'#forge-confirm');const frame=await page.locator('.lobby-sheet').boundingBox();expect(frame!.y).toBeGreaterThanOrEqual(59);expect(frame!.y+frame!.height).toBeLessThanOrEqual(650-34);await expect(page.locator('.forge-workbench')).toHaveClass(/forge-compact-cost/);
  await page.screenshot({path:info.outputPath('transfer-review-text200-insets.png')});await page.keyboard.press('Escape');await expect(page.locator('#forge-transfer')).toBeFocused();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(original);await context.close();
});
