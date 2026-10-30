import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';
import {foeArts,foeIntents,sheetOf,type FoeArt} from '../fixtures/unit-a8';
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source fixture explicitly checked in CI');
const saved=(page:Page)=>page.evaluate(()=>localStorage.getItem('unit-a8-committed'));
const clipOf={'Crystal Fist':'attack','Stone Fist':'attack','Veil Quake':'skill','Rift Beam':'attack','Rift Bolt':'attack','Star Flame':'attack','Crystal Stab':'attack'} as const;
const foeContact=(intent:string)=>({attack:5,skill:13})[clipOf[intent as keyof typeof clipOf]];
// The wisp returns to its hover loop (22..24) instead of the static seed; everyone else to frame 0.
const resting=(art:FoeArt)=>art==='foe_rift_wisp'?['0','22','23','24']:['0'];
async function ready(page:Page,query:string,foe:FoeArt='foe_golem'){
 await page.goto(`tests/browser/fixtures/unit-a8.html?foe=${foe}&${query}`);
 await expect(page.locator('canvas')).toBeVisible();
 // Wait for optional art before visual QA; this is not a Start/performance gate.
 await expect.poll(()=>page.evaluate(()=>window.unitA8QA.frames().tracer?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-lyra');
 await expect.poll(()=>page.evaluate(()=>window.unitA8QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe(`unit-pilot-${sheetOf[foe]}`);
 if(await page.locator('#start').count())await page.locator('#start').click();
}
const cast=async(page:Page)=>{await page.locator('#action-attack').click();await page.locator(`#target-${await page.evaluate(()=>window.unitA8QA.target())}`).click();};
const frame=(page:Page,id:string)=>page.evaluate(i=>window.unitA8QA.frames()[i]![0]!.frame,id);
for(const art of foeArts)for(const intent of foeIntents[art])test(`A8 real ${intent} uses the ${art} contact frame and returns to rest`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await ready(page,`intent=${encodeURIComponent(intent)}`,art);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page);const committed=await saved(page);
 const turns=await page.evaluate(()=>window.unitA8QA.turns()),hero=stageTiming(turns[0]!,false),enemy=stageTiming(turns[1]!,false);
 expect(turns[1]!.intent!.name).toBe(intent);
 // Windup stays before contact.
 await page.clock.runFor(hero.end+Math.max(40,enemy.contact/2));expect(Number(await frame(page,'f1'))).toBeLessThan(foeContact(intent)!);
 await page.clock.runFor(enemy.contact-Math.max(40,enemy.contact/2));
 expect(await page.evaluate(()=>window.unitA8QA.frames().f1![0]!.texture)).toBe(`unit-pilot-${sheetOf[art]}`);
 expect(Number(await frame(page,'f1'))).toBe(foeContact(intent));
 await page.screenshot({path:info.outputPath(`${art}-${intent.replace(/ /g,'-')}-contact-390.png`)});await page.clock.runFor(3000);
 expect(resting(art)).toContain(await frame(page,'f1'));
 expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA8QA.state())).toEqual(await page.evaluate(()=>window.unitA8QA.expected()));
 expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
for(const art of foeArts)test(`A8 ${art} resolver-owned hit reaction uses the hit frames`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await page.clock.install();await ready(page,'',art);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page);const turns=await page.evaluate(()=>window.unitA8QA.turns()),hero=stageTiming(turns[0]!,false);
 await page.clock.runFor(hero.contact+60);expect(['17','18']).toContain(await frame(page,'f1'));
 await page.clock.runFor(4000);expect(resting(art)).toContain(await frame(page,'f1'));
 }finally{await ctx.close();}
});
for(const art of foeArts)test(`A8 ${art} enemy-down keeps the collapsed last frame`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'scenario=enemy-down',art);
 await cast(page);await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>frame(page,'f1')).toBe('21');
 expect(await page.evaluate(()=>window.unitA8QA.state())).toEqual(await page.evaluate(()=>window.unitA8QA.expected()));
 await page.screenshot({path:info.outputPath(`${art}-down-390.png`)});
 }finally{await ctx.close();}
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`A8 ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
 try{const page=await ctx.newPage();await ready(page,`speed=${speed}&intensity=${intensity}`);
 await cast(page);const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA8QA.state())).toEqual(await page.evaluate(()=>window.unitA8QA.expected()));
 expect(await frame(page,'tracer')).toBe('0');expect(await frame(page,'f1')).toBe('0');
 }finally{await ctx.close();}
});
for(const change of ['skip','resize','reload','hidden'] as const)test(`A8 ${change} preserves committed command`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'');await cast(page);const committed=await saved(page);
 if(change==='skip')await page.locator('#skip-turn').click();
 if(change==='resize')await page.setViewportSize({width:391,height:844});
 if(change==='reload'){await page.reload();await expect(page.locator('canvas')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.unitA8QA.frames().f1?.[0]?.texture)).toBe('unit-pilot-golem');}
 if(change==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA8QA.state())).toEqual(await page.evaluate(()=>window.unitA8QA.expected()));
 }finally{await ctx.close();}
});
test('A8 the Rift Wisp hovers while idle and holds seed art under reduced motion',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'',foeArts[2]);
 const seen=new Set<string>();for(let i=0;i<12;i++){seen.add(String(await frame(page,'f1')));await page.waitForTimeout(100);}
 expect([...seen].every(f=>['0','22','23','24'].includes(f))).toBe(true);expect(seen.size).toBeGreaterThan(1);
 }finally{await ctx.close();}
 const still=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{const page=await still.newPage();await ready(page,'',foeArts[2]);await page.waitForTimeout(600);expect(await frame(page,'f1')).toBe('0');
 }finally{await still.close();}
});
test('A8 late optional textures cannot replace artwork during a committed cast',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 let release!:()=>void;const held=new Promise<void>(r=>release=r);
 try{const page=await ctx.newPage();await page.clock.install();
 await page.route('**/assets/units/*.webp',async route=>{await held;await route.continue();});
 await page.goto('tests/browser/fixtures/unit-a8.html?foe=foe_golem');await page.locator('#start').click();
 await page.clock.pauseAt(new Date(Date.now()+100000));await cast(page);
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA8QA.frames().f1![0]!.texture)).not.toBe('unit-pilot-golem');
 release();await expect.poll(()=>page.evaluate(()=>window.unitA8QA.cached().length)).toBe(4);
 expect(await page.evaluate(()=>window.unitA8QA.frames().f1![0]!.texture)).not.toBe('unit-pilot-golem');
 await page.clock.runFor(4000);expect(await page.evaluate(()=>window.unitA8QA.frames().f1![0]!.texture)).toBe('unit-pilot-golem');expect(await saved(page)).toBe(committed);
 }finally{release();await ctx.close();}
});
test('A8 encounter replacement releases the A8 textures',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,'',foeArts[1]);
 expect((await page.evaluate(()=>window.unitA8QA.cached())).sort()).toEqual(['unit-pilot-aegis','unit-pilot-channeler','unit-pilot-eira','unit-pilot-lyra']);
 await page.evaluate(()=>window.unitA8QA.otherEncounter());
 await expect.poll(()=>page.evaluate(()=>window.unitA8QA.cached())).toEqual([]);
 await expect(page.locator('#start')).toBeEnabled();
});
