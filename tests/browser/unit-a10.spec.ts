import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';
import {foeArts,foeIntents} from '../fixtures/unit-a10';
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source fixture explicitly checked in CI');
const saved=(page:Page)=>page.evaluate(()=>localStorage.getItem('unit-a10-committed'));
const foeContact=(intent:string)=>({'Raking Slash':5,'Shadow Knife':13,'Crushing Blow':5,'Rift Bolt':13} as Record<string,number>)[intent]!;
async function ready(page:Page,query:string,foe='raider'){
 await page.goto(`tests/browser/fixtures/unit-a10.html?foe=${foe}&${query}`);
 await expect(page.locator('canvas')).toBeVisible();
 // Wait for optional art before visual QA; this is not a Start/performance gate.
 await expect.poll(()=>page.evaluate(()=>window.unitA10QA.frames().tracer?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-lyra');
 await expect.poll(()=>page.evaluate(()=>window.unitA10QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe(`unit-pilot-${foe}`);
 if(await page.locator('#start').count())await page.locator('#start').click();
}
const cast=async(page:Page)=>{await page.locator('#action-attack').click();await page.locator(`#target-${await page.evaluate(()=>window.unitA10QA.target())}`).click();};
const frame=(page:Page,id:string)=>page.evaluate(i=>window.unitA10QA.frames()[i]![0]!.frame,id);
for(const art of foeArts)for(const intent of foeIntents[art])test(`A10 real ${intent} uses the ${art} atlas, contact frame and returns to seed`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await ready(page,`intent=${encodeURIComponent(intent)}`,art);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page);const committed=await saved(page);
 const turns=await page.evaluate(()=>window.unitA10QA.turns()),hero=stageTiming(turns[0]!,false),enemy=stageTiming(turns[1]!,false);
 await page.clock.runFor(hero.end+enemy.contact-80);
 expect(Number(await frame(page,'f1'))).toBeLessThan(foeContact(intent));
 await page.clock.runFor(80);
 const body=await page.evaluate(()=>window.unitA10QA.frames().f1![0]!);
 expect(body.texture).toBe(`unit-pilot-${art}`);expect(Number(body.frame)).toBe(foeContact(intent));
 // A packed atlas is never flipped again (the Raider atlas already faces left).
 expect(body.flipX).toBe(false);
 await page.screenshot({path:info.outputPath(`${art}-${intent.replace(/ /g,'-')}-contact-390.png`)});await page.clock.runFor(3000);
 expect(await frame(page,'f1')).toBe('0');
 expect(await saved(page)).toBe(committed);expect(errors).toEqual([]);
 expect(await page.evaluate(()=>window.unitA10QA.state())).toEqual(await page.evaluate(()=>window.unitA10QA.expected()));
 }finally{await ctx.close();}
});
for(const art of foeArts)test(`A10 resolver-owned ${art} hit reaction returns to idle`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await page.clock.install();await ready(page,'',art);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page);const seen=new Set<string>();
 for(let i=0;i<40;i++){await page.clock.runFor(40);seen.add(String(await frame(page,'f1')));}
 expect(seen.has('17')||seen.has('18')).toBe(true);
 await page.clock.runFor(3000);expect(await frame(page,'f1')).toBe('0');
 await page.screenshot({path:info.outputPath(`${art}-hit-390.png`)});
 expect(await page.evaluate(()=>window.unitA10QA.state())).toEqual(await page.evaluate(()=>window.unitA10QA.expected()));
 }finally{await ctx.close();}
});
for(const art of foeArts)test(`A10 ${art} enemy-down keeps the collapsed last frame`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'scenario=enemy-down',art);
 await cast(page);await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>frame(page,'f1')).toBe('21');
 expect(await page.evaluate(()=>window.unitA10QA.state())).toEqual(await page.evaluate(()=>window.unitA10QA.expected()));
 await page.screenshot({path:info.outputPath(`${art}-down-390.png`)});
 }finally{await ctx.close();}
});
for(const art of foeArts)test(`A10 ${art} shows its block frames for a fully absorbed hit (QA-synthesised stage)`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await page.clock.install();await ready(page,'',art);await page.clock.pauseAt(new Date(Date.now()+100000));
 const before=await page.evaluate(()=>JSON.stringify(window.unitA10QA.state())),savedBefore=await saved(page);
 await page.evaluate(()=>window.unitA10QA.block(2000));const seen=new Set<string>();
 for(let i=0;i<50;i++){await page.clock.runFor(30);seen.add(String(await frame(page,'f1')));}
 expect(seen.has('22')||seen.has('23')).toBe(true);expect(seen.has('17')||seen.has('18')).toBe(false);
 await page.clock.runFor(3000);expect(await frame(page,'f1')).toBe('0');
 expect(await page.evaluate(()=>JSON.stringify(window.unitA10QA.state()))).toBe(before);expect(await saved(page)).toBe(savedBefore);
 }finally{await ctx.close();}
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`A10 ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
 try{const page=await ctx.newPage();await ready(page,`speed=${speed}&intensity=${intensity}`);
 await cast(page);const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA10QA.state())).toEqual(await page.evaluate(()=>window.unitA10QA.expected()));
 expect(await frame(page,'f1')).toBe('0');
 }finally{await ctx.close();}
});
for(const change of ['skip','resize','reload','hidden'] as const)test(`A10 ${change} preserves committed command`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'foe=brute','brute');await cast(page);const committed=await saved(page);
 if(change==='skip')await page.locator('#skip-turn').click();
 if(change==='resize')await page.setViewportSize({width:391,height:844});
 if(change==='reload'){await page.reload();await expect(page.locator('canvas')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.unitA10QA.frames().f1?.[0]?.texture)).toBe('unit-pilot-brute');}
 if(change==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA10QA.state())).toEqual(await page.evaluate(()=>window.unitA10QA.expected()));
 }finally{await ctx.close();}
});
test('A10 late optional textures cannot replace artwork during a committed cast',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 let release!:()=>void;const held=new Promise<void>(r=>release=r);
 try{const page=await ctx.newPage();await page.clock.install();
 await page.route('**/assets/units/*.webp',async route=>{await held;await route.continue();});
 await page.goto('tests/browser/fixtures/unit-a10.html');await page.locator('#start').click();
 await page.clock.pauseAt(new Date(Date.now()+100000));await cast(page);
 const committed=await saved(page);const before=await page.evaluate(()=>window.unitA10QA.frames().f1![0]!);
 expect(before.texture).not.toBe('unit-pilot-raider');
 release();await expect.poll(()=>page.evaluate(()=>window.unitA10QA.cached().length)).toBe(3);
 expect((await page.evaluate(()=>window.unitA10QA.frames().f1![0]!)).texture).toBe(before.texture);
 await page.clock.runFor(100);expect((await page.evaluate(()=>window.unitA10QA.frames().f1![0]!)).texture).toBe(before.texture);
 await page.clock.runFor(4000);expect((await page.evaluate(()=>window.unitA10QA.frames().f1![0]!)).texture).toBe('unit-pilot-raider');expect(await saved(page)).toBe(committed);
 }finally{release();await ctx.close();}
});
test('A10 loads only the sheets the encounter needs',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,'foe=brute','brute');
 expect((await page.evaluate(()=>window.unitA10QA.cached())).sort()).toEqual(['unit-pilot-brute','unit-pilot-eira','unit-pilot-lyra']);
});
