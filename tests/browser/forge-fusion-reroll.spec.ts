import { expect, test, type Page } from '@playwright/test';
import { chooseForgeTask } from './forge-navigation';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { affixPool } from '../../src/core/world/equipment';
import { xpAt } from '../fixtures/camp-level';
import { legacyEnvelope } from '../fixtures/legacy-save';
const key='asterveil.fateweave.expedition.v1';
async function seed(page:Page){
  const profile=newProfile(map,17);profile.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};profile.tutorialDone=true;profile.campXp=Math.max(profile.campXp,xpAt(6));profile.bank={ore:500,dust:50,gold:20,shard:5};
  profile.members.guardian={stars:3,shards:0,gear:{weapon:{uid:1,slot:'weapon',hero:'guardian',rarity:2,level:3,affixes:['hp','armour'],plus:2,q:{main:113,affixes:[97,105]},set:'dawn',investment:{ore:9,dust:2},levelInvestment:{ore:20,dust:2}}}};profile.nextItem=2;
  const raw=JSON.stringify(legacyEnvelope({version:23,profile,run:null}));
  await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('uxd03-seeded')){localStorage.setItem(key,raw);sessionStorage.setItem('uxd03-seeded','1');}const w=window as unknown as {forgeWrites:number};w.forgeWrites=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)w.forgeWrites++;set.call(this,k,v);};},{key,raw});
  await page.goto('./');await page.locator('#continue').click();await page.locator('#lobby-tab-team').click();await page.locator('#lobby-member-guardian').click();await page.locator('#lobby-gear-open').click();await page.locator('#camp-bag-slot-weapon').click();await page.locator('#camp-character-forge-worn').click();await chooseForgeTask(page,'reroll');
}
async function reachable(page:Page,selector:string){
  const b=page.locator(selector);await b.scrollIntoViewIfNeeded();expect(await b.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;})).toBe(true);
  expect(await page.locator('.forge-workbench').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
}
for(const [width,height,touch] of [[320,568,true],[390,650,true],[390,844,true],[1366,768,false]] as const){
  test(`reroll review and committed result at ${width}x${height}`,async({browser},info)=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),page=await context.newPage(),errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));await seed(page);
    const saved=()=>page.evaluate(k=>localStorage.getItem(k)!,key),writes=()=>page.evaluate(()=>(window as unknown as {forgeWrites:number}).forgeWrites);
    const original=await saved(),before=JSON.parse(original).profile,old=before.members.guardian.gear.weapon;
    await expect(page.locator('#lobby-sheet-title')).toContainText('สุ่มคุณสมบัติ');await expect(page.locator('.forge-random-info')).toContainText('ผลสุ่มแสดงหลังยืนยัน');
    await page.locator('#forge-affix').selectOption('1');await expect(page.locator('.forge-affix-choice')).toContainText('ช่อง 1: เลือด 97% · คงเดิม');
    const pool=affixPool(map.equipment,old.slot,old.hero).filter(a=>!old.affixes.includes(a));
    await page.locator('.forge-random-info summary').click();expect(await saved()).toBe(original);
    await page.locator('#forge-reroll-1').click();await expect(page.locator('.forge-affix-choice')).toContainText('ช่อง 2: เกราะ');await reachable(page,'#forge-confirm');
    if(width===390)await page.screenshot({path:info.outputPath(`reroll-review-${height}.png`)});
    await page.keyboard.press('Escape');await expect(page.locator('#forge-reroll-1')).toBeFocused();await expect(page.locator('.forge-workbench')).toHaveAttribute('data-review','false');expect(await saved()).toBe(original);
    // Changing tasks invalidates the old review and keeps the same subject.
    await page.locator('#forge-reroll-1').click();await chooseForgeTask(page,'level');await chooseForgeTask(page,'reroll');await expect(page.locator('#forge-confirm')).toHaveCount(0);await expect(page.locator('.forge-item-head')).toContainText('#1');expect(await saved()).toBe(original);
    await page.locator('#forge-affix').selectOption('1');await page.locator('#forge-reroll-1').focus();await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');await expect(page.locator('#forge-confirm')).toBeVisible();expect(await saved()).toBe(original);
    if(touch){await page.setViewportSize({width:844,height:390});await expect(page.locator('#orientation-gate')).toBeVisible();await page.locator('#forge-confirm').dispatchEvent('click');expect(await saved()).toBe(original);await page.setViewportSize({width,height});}
    const count=await writes();await page.locator('#forge-confirm').dblclick();await expect(page.locator('#forge-success')).toContainText('สุ่มคุณสมบัติสำเร็จ');expect(await writes()).toBe(count+1);
    const committed=await saved(),actual=JSON.parse(committed).profile,item=actual.members.guardian.gear.weapon;
    expect(item).toMatchObject({uid:1,level:3,plus:2,rarity:2,set:'dawn',q:{main:113},investment:old.investment,levelInvestment:old.levelInvestment});expect(item.affixes[0]).toBe(old.affixes[0]);expect(item.q.affixes[0]).toBe(old.q.affixes[0]);expect(pool).toContain(item.affixes[1]);expect(item.q.affixes[1]).toBeGreaterThanOrEqual(map.equipment.quality[0]);expect(item.q.affixes[1]).toBeLessThanOrEqual(map.equipment.quality[1]);expect(actual.forge).toBeGreaterThan(before.forge);expect(actual.bank).toEqual({...before.bank,shard:before.bank.shard-map.equipment.forge.rerollShards});
    await expect(page.locator('.forge-actual-result')).toContainText('เกราะ 105% →');await expect(page.locator('#forge-confirm')).toHaveCount(0);await reachable(page,'#forge-next-preview');
    if(width===390)await page.screenshot({path:info.outputPath(`reroll-result-${height}.png`)});
    await page.locator('#forge-next-preview').click();expect(await saved()).toBe(committed);expect(await writes()).toBe(count+1);await expect(page.locator('#forge-reroll-1')).toBeEnabled();
    await page.locator('[data-lobby=close]').click();await expect(page.locator('#camp-character-dialog')).toBeVisible();await expect(page.locator('#camp-bag-slot-weapon')).toHaveAttribute('aria-pressed','true');
    await page.reload();await page.locator('#continue').click();expect(JSON.parse(await saved()).profile.members.guardian.gear.weapon).toEqual(item);expect(errors).toEqual([]);await context.close();
  });
}
test('reroll at 200% text on a short phone keeps confirmation reachable',async({browser},info)=>{
  const context=await browser.newContext({viewport:{width:390,height:650},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();await seed(page);
  const original=await page.evaluate(k=>localStorage.getItem(k),key);await page.addStyleTag({content:'.lobby-sheet:has(.forge-random-development){--enhance-safe-top:59px;--enhance-safe-bottom:34px}'});const frame=await page.locator('.lobby-sheet').boundingBox();expect(frame!.y).toBeGreaterThanOrEqual(59);expect(frame!.y+frame!.height).toBeLessThanOrEqual(650-34);await page.addStyleTag({content:':root { font-size: 200% !important; }'});await page.locator('#forge-reroll-0').click();await reachable(page,'#forge-confirm');await page.screenshot({path:info.outputPath('reroll-large-text.png')});
  await page.locator('#forge-cancel').click();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(original);await context.close();
});
