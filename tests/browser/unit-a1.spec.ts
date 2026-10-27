import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';
import {eiraActions} from '../fixtures/unit-a1';
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source fixture explicitly checked in CI');
const saved=(page:Page)=>page.evaluate(()=>localStorage.getItem('unit-a1-committed'));
async function ready(page:Page,query:string){
 await page.goto(`tests/browser/fixtures/unit-a1.html?${query}`);
 await expect(page.locator('canvas')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.unitA1QA.frames().weaver?.[0]?.texture)).toBe('unit-pilot-eira');
 if(await page.locator('#start').count())await page.locator('#start').click();
}
for(const action of eiraActions)test(`A1 ${action}: windup, release, Seed Spark and exact committed result at 390px`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await ready(page,`skill=${action}`);await page.clock.pauseAt(new Date(Date.now()+100000));
 await page.locator(`#action-${action}`).click();await page.locator(`#target-${await page.evaluate(()=>window.unitA1QA.target())}`).click();
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA1QA.state())).toEqual(await page.evaluate(()=>window.unitA1QA.expected()));
 const expected=action==='ward'||action==='sigil'||action==='aegis'?13:5;
 // Windup must never expose the release frame.
 await page.clock.runFor(80);const before=await page.evaluate(()=>window.unitA1QA.frames().weaver!);
 expect(Number(before[0]!.frame)).toBeLessThan(expected);expect(before[0]!.texture).toBe('unit-pilot-eira');
 await page.screenshot({path:info.outputPath('eira-prepare-390.png')});
 const timing=stageTiming((await page.evaluate(()=>window.unitA1QA.turns()))[0]!,false);
 await page.clock.runFor(timing.contact-80);
 expect(Number(await page.evaluate(()=>window.unitA1QA.frames().weaver![0]!.frame))).toBe(expected);
 await page.clock.runFor(450-timing.contact+80);const impacts=await page.evaluate(()=>window.unitA1QA.impacts);
 expect(impacts[0]!.turn.action).toBe(action);
 await page.clock.runFor(500);await page.screenshot({path:info.outputPath('sprite-release-390.png')});
 await page.clock.runFor(1500);await expect(page.locator('#skip-turn')).toBeHidden();
 expect(await saved(page)).toBe(committed);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`A1 ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
 try{const page=await ctx.newPage();await ready(page,`skill=bolt&speed=${speed}&intensity=${intensity}`);
 await page.locator('#action-bolt').click();await page.locator('#target-b1').click();const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA1QA.state())).toEqual(await page.evaluate(()=>window.unitA1QA.expected()));
 expect(await page.evaluate(()=>window.unitA1QA.frames().weaver![0]!.frame)).toBe('0');
 }finally{await ctx.close();}
});
for(const change of ['skip','resize','reload','hidden'] as const)test(`A1 ${change} preserves committed command`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'skill=bolt');await page.locator('#action-bolt').click();await page.locator('#target-b1').click();const committed=await saved(page);
 if(change==='skip')await page.locator('#skip-turn').click();
 if(change==='resize')await page.setViewportSize({width:391,height:844});
 if(change==='reload')await page.evaluate(()=>window.unitA1QA.load());
 if(change==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA1QA.state())).toEqual(await page.evaluate(()=>window.unitA1QA.expected()));
 }finally{await ctx.close();}
});
for(const scenario of ['revive','enemy-down'])test(`A1 resolver-owned ${scenario} resets sprite lifecycle`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,`skill=attack&scenario=${scenario}`);
 if(scenario==='revive')expect(await page.evaluate(()=>window.unitA1QA.frames().weaver![0]!.frame)).toBe('21');
 await page.locator(`#action-${scenario==='revive'?'revive':'attack'}`).click();await page.locator(`#target-${await page.evaluate(()=>window.unitA1QA.target())}`).click();
 await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>page.evaluate(s=>window.unitA1QA.frames()[s==='revive'?'weaver':'b1']![0]!.frame,scenario)).toBe(scenario==='revive'?'0':'21');
 expect(await page.evaluate(()=>window.unitA1QA.state())).toEqual(await page.evaluate(()=>window.unitA1QA.expected()));
 await page.screenshot({path:info.outputPath(`${scenario}-390.png`)});
 }finally{await ctx.close();}
});
test('A1 late optional textures cannot replace artwork during a committed cast',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 let release!:()=>void;const held=new Promise<void>(r=>release=r);
 try{const page=await ctx.newPage();await page.clock.install();
 await page.route('**/assets/units/*.webp',async route=>{await held;await route.continue();});
 await page.goto('tests/browser/fixtures/unit-a1.html?skill=bolt');await page.locator('#start').click();
 await page.clock.pauseAt(new Date(Date.now()+100000));await page.locator('#action-bolt').click();await page.locator('#target-b1').click();
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA1QA.frames().weaver![0]!.texture)).toBe('battle-units');
 release();await expect.poll(()=>page.evaluate(()=>window.unitA1QA.cached().length)).toBe(2);
 // No renderer frame elapsed: textures have arrived while this committed stage is active.
 expect(await page.evaluate(()=>window.unitA1QA.frames().weaver![0]!.texture)).toBe('battle-units');
 await page.clock.runFor(100);expect(await page.evaluate(()=>window.unitA1QA.frames().weaver![0]!.texture)).toBe('battle-units');
 await page.clock.runFor(3000);expect(await page.evaluate(()=>window.unitA1QA.frames().weaver![0]!.texture)).toBe('unit-pilot-eira');expect(await saved(page)).toBe(committed);
 }finally{release();await ctx.close();}
});

test('A1 encounter replacement releases Eira and Sprite textures',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,'skill=bolt');
 expect((await page.evaluate(()=>window.unitA1QA.cached())).sort()).toEqual(['unit-pilot-eira','unit-pilot-sprite']);
 await page.evaluate(()=>window.unitA1QA.otherEncounter());
 await expect.poll(()=>page.evaluate(()=>window.unitA1QA.cached())).toEqual([]);
 await expect(page.locator('#start')).toBeEnabled();
});

for(const dpr of [2,3])test(`A1 inherited alchemy recipient anchor follows Eira normalization at ${dpr}x DPR`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:dpr,reducedMotion:'no-preference'});
 try{
 const page=await ctx.newPage();await page.clock.install();await ready(page,'skill=bolt');await page.clock.pauseAt(new Date(Date.now()+100000));
 await page.locator('#action-bolt').click();await page.locator('#target-b1').click();await page.clock.runFor(80);
 const p=await page.evaluate(()=>window.unitA1QA.alchemyPoint());
 expect(p.actual.x).toBeCloseTo(p.expected.x,2);expect(p.actual.y).toBeCloseTo(p.expected.y,2);
 }finally{await ctx.close();}
});
