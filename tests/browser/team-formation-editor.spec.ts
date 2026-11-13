import {expect,test,type Page} from '@playwright/test';
import {chapterOne as map} from '../../src/content/world/chapter1';
import {newProfile} from '../../src/core/world/profile';
import {currentSave} from '../fixtures/current-save';
const key='asterveil.fateweave.expedition.v1';
async function open(page:Page){
  const p=newProfile(map,17);p.tutorialDone=true;p.veteran=true;p.cleared=['ruined-border','deep-forest','veil-frontier'];p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};
  for(const id of ['lio','toma'])if(!p.company.includes(id)){p.company.push(id);p.members[id]={stars:1,shards:0};}
  p.party={deployed:['guardian','tracer','weaver','healer'],reserve:['lio'],lanes:{guardian:'front',tracer:'front',weaver:'back',healer:'back'}};
  const raw=currentSave({profile:p,run:null});
  await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('formation-seed')){localStorage.setItem(key,raw);sessionStorage.setItem('formation-seed','1');}const original=Storage.prototype.setItem;const probe={writes:0};(window as unknown as {teamProbe:typeof probe}).teamProbe=probe;Storage.prototype.setItem=function(k,v){if(this===localStorage&&k===key)probe.writes++;original.call(this,k,v);};},{key,raw});
  await page.goto('./');await page.locator('#continue').click();await page.locator('#lobby-tab-team').click();
}
const saved=(p:Page)=>p.evaluate(k=>localStorage.getItem(k)!,key);
const profile=async(p:Page)=>JSON.parse(await saved(p)).profile;
const writes=(p:Page)=>p.evaluate(()=>(window as unknown as {teamProbe:{writes:number}}).teamProbe.writes);
test('preset dialog stays inside the portrait game frame on desktop',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await open(page);const before=await saved(page);await page.locator('#team-preset-open').click();
  const frame=await page.locator('#app').boundingBox(),dialog=await page.locator('#team-preset-dialog').boundingBox();
  expect(dialog!.x).toBeGreaterThanOrEqual(frame!.x-1);expect(dialog!.x+dialog!.width).toBeLessThanOrEqual(frame!.x+frame!.width+1);expect(dialog!.y+dialog!.height).toBeLessThanOrEqual(frame!.y+frame!.height+1);
  await page.keyboard.press('Escape');expect(await saved(page)).toBe(before);
});
for(const height of [844,568])test(`formation is the only field list; reserves and camp members place in the requested lane with one save ${height}`,async({page})=>{
  await page.setViewportSize({width:height===568?320:390,height});await open(page);
  await expect(page.locator('.lobby-content > .formation')).toBeVisible();await expect(page.locator('.formation-cell[data-hero]')).toHaveCount(4);
  await expect(page.locator('.team-grid [data-group=deployed]')).toHaveCount(0);
  const before=await saved(page),count=await writes(page);await page.locator('#lobby-member-lio').click();expect(await saved(page)).toBe(before);
  await page.locator('.formation-column[data-lane=front] .empty.target').click();
  let p=await profile(page);expect(p.party.deployed).toEqual(['guardian','tracer','weaver','healer','lio']);expect(p.party.reserve).toEqual([]);expect(p.party.lanes).toMatchObject({guardian:'front',tracer:'front',weaver:'back',healer:'back',lio:'front'});expect(await writes(page)).toBe(count+1);
  // Full team still allows replacing a member, but every free visual cell is disabled.
  await page.locator('#lobby-member-toma').click();for(const cell of await page.locator('.formation-cell.empty').all())await expect(cell).toBeDisabled();
  await page.locator('#lobby-member-guardian').click();p=await profile(page);expect(p.party.deployed).toEqual(['toma','tracer','weaver','healer','lio']);expect(p.party.lanes.toma).toBe('front');expect(await writes(page)).toBe(count+2);
  await expect(page.locator('.team-grid.bench #lobby-member-guardian')).toBeVisible();
  await page.locator('#lobby-member-toma').click();await page.locator('#lobby-member-guardian').click();p=await profile(page);expect(p.party.deployed[0]).toBe('guardian');expect(p.party.lanes.guardian).toBe('front');expect(await writes(page)).toBe(count+3);
});
test('preset dialog is read-only until explicit save, stores the exact plan, and can be cancelled or overwritten',async({page})=>{
  await page.setViewportSize({width:390,height:844});await open(page);const before=await saved(page);
  await page.locator('#team-preset-0').click();await expect(page.locator('#team-preset-dialog')).toBeVisible();expect(await saved(page)).toBe(before);
  await page.locator('#team-preset-name').fill('ทีมป้องกัน');await page.keyboard.press('Escape');await expect(page.locator('#team-preset-dialog')).toBeHidden();expect(await saved(page)).toBe(before);await expect(page.locator('#team-preset-0')).toBeFocused();
  await page.locator('#team-preset-open').click();await page.locator('#team-preset-name').fill('ทีมป้องกัน');await page.locator('#team-preset-save').click();
  let p=await profile(page);expect(p.presets[0]).toEqual({name:'ทีมป้องกัน',deployed:p.party.deployed,reserve:p.party.reserve,lanes:p.party.lanes});await expect(page.locator('#team-preset-open')).toBeFocused();
  await page.locator('#lobby-member-weaver').click();await page.locator('.formation-column[data-lane=front] .empty.target').click();p=await profile(page);const changed=p.party;
  await expect(page.locator('#team-preset-0')).toHaveAttribute('aria-pressed','false');await page.locator('#team-preset-open').click();await page.locator('#preset-destination-0').click();await expect(page.locator('#team-preset-save')).toContainText('บันทึกทับ ทีมป้องกัน');await page.locator('#team-preset-save').click();
  p=await profile(page);expect(p.presets[0].lanes).toEqual(changed.lanes);await page.reload();await page.locator('#continue').click();await page.locator('#lobby-tab-team').click();await expect(page.locator('#team-preset-0')).toHaveAttribute('aria-pressed','true');
});
test('preset modal survives short viewport and blocks background mutation during rotation',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:650},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();await open(page);
  await page.locator('#team-preset-open').click();await page.locator('#team-preset-name').fill('ชุดทดลอง');const before=await saved(page);
  const box=await page.locator('#team-preset-save').boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(650);
  await page.locator('#preset-dialog-close').focus();await page.setViewportSize({width:844,height:390});await expect(page.locator('#orientation-gate')).toBeVisible();await page.locator('#team-preset-save').dispatchEvent('click');expect(await saved(page)).toBe(before);
  await page.setViewportSize({width:390,height:650});await expect(page.locator('#team-preset-name')).toHaveValue('ชุดทดลอง');await page.locator('#preset-dialog-close').click();expect(await saved(page)).toBe(before);await context.close();
});
