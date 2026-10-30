import {test,expect,type Page} from '@playwright/test';
import {firstClash} from '../../src/content/encounters/catalog';
import {veilSiege} from '../../src/content/encounters/veil-siege';
import {chapterOne} from '../../src/content/world/chapter1';
import {encounterById} from '../../src/content/encounters/catalog';
import {newExpedition} from '../../src/core/world/world';
import manifest from '../../src/game/visuals/unit-atlases.json' with { type: 'json' };
const key='asterveil.fateweave.expedition.v1';
async function seed(page:Page,id:string){
 const world=newExpedition(chapterOne,encounterById,1234);world.tutorialDone=true;
 world.battle={kind:'random',encounterId:id,entry:{guardian:76,tracer:56,weaver:48,healer:46},commands:[]};
 await page.addInitScript(({key,raw})=>localStorage.setItem(key,raw),{key,raw:JSON.stringify({version:1,state:world})});
}
const count=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).run.battle.commands.length,key);
test('slow optional animation downloads do not gate Start or the first committed turn',async({page})=>{
 let release!:()=>void,requests=0;const held=new Promise<void>(r=>release=r),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/assets/units/*.webp',async route=>{requests++;await held;await route.continue();});
 try{
  await seed(page,firstClash.id);await page.goto('./',{waitUntil:'domcontentloaded'});await page.locator('#continue').click();
  await expect(page.locator('#start')).toBeEnabled();await expect.poll(()=>requests).toBe(6);
  await page.locator('#start').click();await page.locator('#action-attack').click();await page.locator('#target-f1').click();
  expect(await count(page)).toBe(1);
  await page.locator('#skip-turn').click();await expect(page.locator('#action-bolt')).toBeEnabled();
  // Even with all optional responses still held, the command and its enemy stage settle.
  expect(await count(page)).toBe(1);await expect(page.locator('[data-enemy=f1]')).toContainText('84 / 100');
  release();expect(errors).toEqual([]);
 }finally{release();}
});
test('optional animation failures retain playable original-art fallback without repeated requests',async({page})=>{
 let requests=0;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/assets/units/*.webp',async route=>{requests++;await route.fulfill({status:503,body:''});});
 await seed(page,firstClash.id);await page.goto('./');await page.locator('#continue').click();await expect(page.locator('#start')).toBeEnabled();
 await page.locator('#start').click();await page.locator('#target-f1').click();await page.locator('#skip-turn').click();
 await expect(page.locator('#action-bolt')).toBeEnabled();expect(await count(page)).toBe(1);
 await expect.poll(()=>requests).toBe(6);expect(errors).toEqual([]);
});
test('title loads no optional unit art and an encounter without Hunter never downloads Hunter',async({page})=>{
 const names:string[]=[];page.on('request',r=>{if(r.url().includes('/assets/units/'))names.push(r.url());});
 await seed(page,veilSiege.id);await page.goto('./');await expect(page.locator('#continue')).toBeVisible();
 // Wait for core readiness even though the battle view is hidden behind the title.
 await expect(page.locator('#start')).toBeEnabled();expect(names).toEqual([]);
 const loaded=page.waitForResponse(r=>r.url().endsWith(manifest.lyra.image)&&r.ok());
 await page.locator('#continue').click();await expect(page.locator('#start')).toBeEnabled();await (await loaded).finished();
 expect(names.some(n=>n.includes('lyra_pilot'))).toBe(true);expect(names.some(n=>n.includes('hunter_pilot'))).toBe(false);
});
