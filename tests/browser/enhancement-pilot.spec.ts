import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { currentSave } from '../fixtures/current-save';
import { xpAt } from '../fixtures/camp-level';

const key='asterveil.fateweave.expedition.v1';
for(const [width,height,touch] of [[320,568,true],[390,650,true],[390,844,true],[1366,768,false]] as const){
  test(`enhancement pilot preserves context and commits once ${width}x${height}`,async({browser})=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),page=await context.newPage();
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const p=newProfile(map,17);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;p.veteran=true;p.campXp=xpAt(6);p.bank={ore:100,dust:50,gold:0,seal:0};
    p.members.guardian!.gear={body:{uid:1,slot:'body',rarity:1,level:1,affixes:['hp'],plus:2,set:'dawn'}};p.nextItem=2;
    const raw=currentSave({profile:p,run:null});
    await page.addInitScript(({key,raw})=>{
      localStorage.setItem(key,raw);
      const w=window as unknown as {pilotWrites:number};w.pilotWrites=0;const set=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){if(k===key)w.pilotWrites++;set.call(this,k,v);};
    },{key,raw});
    await page.goto('./');await expect(page).toHaveTitle(/Asterveil/);await page.locator('#continue').click();
    await page.locator('#lobby-tab-team').click();await page.locator('#lobby-member-guardian').click();await page.locator('#lobby-gear-open').click();
    await page.locator('#camp-bag-slot-body').click();await page.locator('#camp-character-dialog .gear-extra-filters summary').click();await page.locator('#camp-gear-filter-set').selectOption('dawn');
    const trigger=page.locator('#camp-character-forge-worn');await trigger.scrollIntoViewIfNeeded();
    const scroll=await page.locator('#camp-character-content').evaluate(el=>el.scrollTop);
    const saved=()=>page.evaluate(k=>localStorage.getItem(k),key),initial=await saved();
    await trigger.click();await expect(page.locator('#lobby-sheet-title')).toContainText('ตีบวกอุปกรณ์');
    await expect(page.locator('.forge-hero-preview')).toBeVisible();await expect(page.locator('#forge-cost')).toContainText('แร่ · ใช้ 6');await expect(page.locator('#forge-cost')).toContainText('มี 100');
    await expect(page.locator('#forge-open-tasks')).toBeVisible();
    await page.locator('#forge-enhance').click();await expect(page.locator('#lobby-sheet-title')).toContainText('ตรวจรายการ');expect(await saved()).toBe(initial);
    await page.keyboard.press('Escape');await expect(page.locator('#forge-enhance')).toBeFocused();expect(await saved()).toBe(initial);
    await page.locator('#forge-enhance').click();
    expect(await page.locator('#forge-confirm').evaluate(el=>{const r=el.getBoundingClientRect();const app=document.querySelector('#app')!.getBoundingClientRect();return r.height>=44&&r.top>=app.top&&r.bottom<=app.bottom&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;})).toBe(true);
    expect(await page.locator('.forge-enhancement-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    if(width===390&&height===844)await page.screenshot({path:'/tmp/uxd-01/after/review-390.png'});
    const writes=await page.evaluate(()=>(window as unknown as {pilotWrites:number}).pilotWrites);
    await page.locator('#forge-confirm').evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click();});
    expect(await page.evaluate(()=>(window as unknown as {pilotWrites:number}).pilotWrites)).toBe(writes+1);
    const committed=JSON.parse((await saved())!);expect(committed.profile.bank).toMatchObject({ore:94,dust:48});expect(committed.profile.members.guardian.gear.body.plus).toBe(3);
    await expect(page.locator('#forge-success')).toBeFocused();await expect(page.locator('#forge-success')).toContainText('+2 → +3');await expect(page.locator('.forge-step h3')).toHaveText('+2 → +3');await expect(page.locator('#forge-next-preview')).toBeVisible();
    if(width===390&&height===844){await expect(page.locator('.forge-strike')).toHaveCount(0);await page.screenshot({path:'/tmp/uxd-01/after/success-390.png'});}
    await page.locator('#forge-next-preview').click();await expect(page.locator('.forge-step h3')).toHaveText('+3 → +4');expect(JSON.parse((await saved())!)).toEqual(committed);
    await page.keyboard.press('Escape');await expect(page.locator('#camp-character-dialog')).toBeVisible();
    await expect(page.locator('#camp-character-tab-gear')).toHaveAttribute('aria-selected','true');await expect(page.locator('#camp-bag-slot-body')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#camp-gear-filter-set')).toHaveValue('dawn');await expect(trigger).toBeFocused();
    expect(await page.locator('#camp-character-content').evaluate(el=>el.scrollTop)).toBeCloseTo(scroll,0);
    expect(JSON.parse((await saved())!)).toEqual(committed);
    await page.keyboard.press('Escape');await expect(page.locator('#lobby-member-guardian')).toHaveAttribute('aria-pressed','true');
    expect(errors).toEqual([]);await context.close();
  });
}

test('enhancement shows all shortages, cap, and returns to the inventory item',async({page})=>{
  const p=newProfile(map,22);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;p.veteran=true;p.campXp=xpAt(6);
  p.items=[{uid:1,slot:'body',rarity:0,level:1,affixes:[],plus:2},{uid:2,slot:'head',rarity:0,level:1,affixes:[],plus:5}];p.nextItem=3;
  await page.addInitScript(({key,raw})=>localStorage.setItem(key,raw),{key,raw:currentSave({profile:p,run:null})});
  await page.goto('./');await page.locator('#continue').click();await page.locator('#lobby-tab-gear').click();await page.locator('#forge-open-1').click();
  await expect(page.locator('.forge-reason')).toContainText('แร่ดาวขาด 6');await expect(page.locator('.forge-reason')).toContainText('ฝุ่นดาวขาด 2');await expect(page.locator('#forge-enhance')).toBeDisabled();
  await page.keyboard.press('Escape');await expect(page.locator('#forge-open-1')).toBeFocused();
  await page.locator('#forge-open-2').click();await expect(page.locator('.forge-step')).toContainText('ขั้นสูงสุด');await expect(page.locator('#forge-enhance')).toHaveCount(0);await expect(page.locator('#forge-change-item-cap')).toBeVisible();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(currentSave({profile:p,run:null}));
});

test('baseline star and skill routes remain readonly before selecting a command',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
  const p=newProfile(map,31);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;p.veteran=true;p.campXp=xpAt(6);p.bank.ore=100;p.members.guardian!.stars=3;p.members.guardian!.dupes=3;
  await page.addInitScript(({key,raw})=>localStorage.setItem(key,raw),{key,raw:currentSave({profile:p,run:null})});
  await page.goto('./');await page.locator('#continue').click();const initial=await page.evaluate(k=>localStorage.getItem(k),key);
  await page.locator('#lobby-tab-team').click();await page.locator('#lobby-member-guardian').click();await expect(page.locator('#lobby-upgrade')).toBeEnabled();
  await page.screenshot({path:'/tmp/uxd-01/baseline/star-route-390.png'});
  await page.locator('#lobby-character-open').click();await page.locator('#camp-character-tab-skills').click();await expect(page.locator('.character-skills')).toBeVisible();
  await page.screenshot({path:'/tmp/uxd-01/baseline/skill-route-390.png'});
  await page.locator('#camp-character-tab-skills').click(); await page.locator('#camp-character-tab-talents').click();await expect(page.locator('.talent-tree')).toBeVisible();await expect(page.locator('.skills-slots')).toHaveCount(0);
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(initial);await context.close();
});
