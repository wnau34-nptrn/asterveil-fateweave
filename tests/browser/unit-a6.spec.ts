import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';
import {sefaActions,lioActions,foeArts,foeIntents} from '../fixtures/unit-a6';
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source fixture explicitly checked in CI');
const saved=(page:Page)=>page.evaluate(()=>localStorage.getItem('unit-a6-committed'));
const sheetOf={foe_riftweaver:'riftweaver',foe_spore_puff:'sporepuff'} as const;
const contactOf=(clip:string)=>({attack:5,skill:13,knives:26,dread:26,evade:34,finale:34,snare:26} as Record<string,number>)[clip]!;
const foeContact=(intent:string)=>({'Rune Lash':5,'Rift Needle':13,'Ribbon Snare':26,'Spore Dust':5} as Record<string,number>)[intent]!;
const clipOf={sefa:{attack:'attack',ambush:'attack',backstab:'skill',disarm:'skill',knives:'knives',evade:'evade',decoy:'evade'},lio:{attack:'attack',note:'attack',valor:'skill',mend:'skill',solo:'skill',dread:'dread',finale:'finale'}} as const;
async function ready(page:Page,query:string,hero='sefa',foe='foe_riftweaver'){
 await page.goto(`tests/browser/fixtures/unit-a6.html?hero=${hero}&foe=${foe}&${query}`);
 await expect(page.locator('canvas')).toBeVisible();
 // Wait for optional art before visual QA; this is not a Start/performance gate.
 await expect.poll(()=>page.evaluate(h=>window.unitA6QA.frames()[h]?.[0]?.texture,hero),{timeout:15000}).toBe(`unit-pilot-${hero}`);
 await expect.poll(()=>page.evaluate(()=>window.unitA6QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe(`unit-pilot-${sheetOf[foe as keyof typeof sheetOf]}`);
 if(await page.locator('#start').count())await page.locator('#start').click();
}
const cast=async(page:Page,action:string)=>{await page.locator(`#action-${action}`).click();await page.locator(`#target-${await page.evaluate(()=>window.unitA6QA.target())}`).click();};
const frame=(page:Page,id:string)=>page.evaluate(i=>window.unitA6QA.frames()[i]![0]!.frame,id);
for(const [hero,actions] of [['sefa',sefaActions],['lio',lioActions]] as const)for(const action of actions)test(`A6 ${hero} ${action}: windup, release and exact committed result at 390px`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await ready(page,`skill=${action}`,hero);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page,action);
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA6QA.state())).toEqual(await page.evaluate(()=>window.unitA6QA.expected()));
 const expected=contactOf((clipOf[hero] as Record<string,string>)[action]!);
 await page.clock.runFor(80);const before=await page.evaluate(h=>window.unitA6QA.frames()[h]!,hero);
 expect(Number(before[0]!.frame)).toBeLessThan(expected);expect(before[0]!.texture).toBe(`unit-pilot-${hero}`);
 await page.screenshot({path:info.outputPath(`${hero}-${action}-prepare-390.png`)});
 const timing=stageTiming((await page.evaluate(()=>window.unitA6QA.turns()))[0]!,false);
 await page.clock.runFor(timing.contact-80);
 expect(Number(await frame(page,hero))).toBe(expected);
 await page.clock.runFor(450-timing.contact+80);const impacts=await page.evaluate(()=>window.unitA6QA.impacts);
 expect(impacts[0]!.turn.action).toBe(action);
 await page.clock.runFor(500);await page.screenshot({path:info.outputPath(`${hero}-${action}-release-390.png`)});
 await page.clock.runFor(1500);await expect(page.locator('#skip-turn')).toBeHidden();
 expect(await saved(page)).toBe(committed);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`A6 ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
 try{const page=await ctx.newPage();await ready(page,`skill=ambush&speed=${speed}&intensity=${intensity}`);
 await cast(page,'ambush');const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA6QA.state())).toEqual(await page.evaluate(()=>window.unitA6QA.expected()));
 expect(await frame(page,'sefa')).toBe('0');
 }finally{await ctx.close();}
});
for(const change of ['skip','resize','reload','hidden'] as const)test(`A6 ${change} preserves committed command`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'skill=evade');await cast(page,'evade');const committed=await saved(page);
 if(change==='skip')await page.locator('#skip-turn').click();
 if(change==='resize')await page.setViewportSize({width:391,height:844});
 if(change==='reload'){await page.reload();await expect(page.locator('canvas')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.unitA6QA.frames().sefa?.[0]?.texture)).toBe('unit-pilot-sefa');}
 if(change==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA6QA.state())).toEqual(await page.evaluate(()=>window.unitA6QA.expected()));
 }finally{await ctx.close();}
});
for(const art of foeArts)for(const intent of foeIntents[art])test(`A6 real ${intent} uses the ${art} release and returns to seed`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await page.clock.install();await ready(page,`skill=attack&intent=${encodeURIComponent(intent)}`,'sefa',art);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page,'attack');const committed=await saved(page);
 const turns=await page.evaluate(()=>window.unitA6QA.turns()),hero=stageTiming(turns[0]!,false),enemy=stageTiming(turns[1]!,false);
 await page.clock.runFor(hero.end+enemy.contact);
 expect(await page.evaluate(()=>window.unitA6QA.frames().f1![0]!.texture)).toBe(`unit-pilot-${sheetOf[art]}`);
 expect(Number(await frame(page,'f1'))).toBe(foeContact(intent));
 await page.screenshot({path:info.outputPath(`${art}-${intent.replace(/ /g,'-')}-contact-390.png`)});await page.clock.runFor(3000);
 expect(await frame(page,'f1')).toBe('0');
 expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA6QA.state())).toEqual(await page.evaluate(()=>window.unitA6QA.expected()));
 }finally{await ctx.close();}
});
for(const hero of ['sefa','lio'] as const)for(const scenario of ['hurt','down'])test(`A6 resolver-owned ${hero} ${scenario} reaction`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,`skill=attack&scenario=${scenario}`,hero);
 await cast(page,'attack');await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>frame(page,hero)).toBe(scenario==='down'?'21':'0');
 expect(await page.evaluate(()=>window.unitA6QA.state())).toEqual(await page.evaluate(()=>window.unitA6QA.expected()));
 await page.screenshot({path:info.outputPath(`${hero}-${scenario}-390.png`)});
 }finally{await ctx.close();}
});
for(const art of foeArts)test(`A6 ${art} enemy-down keeps the collapsed last frame`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'skill=attack&scenario=enemy-down','sefa',art);
 await cast(page,'attack');await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>frame(page,'f1')).toBe('21');
 expect(await page.evaluate(()=>window.unitA6QA.state())).toEqual(await page.evaluate(()=>window.unitA6QA.expected()));
 await page.screenshot({path:info.outputPath(`${art}-down-390.png`)});
 }finally{await ctx.close();}
});
test('A6 late optional textures cannot replace artwork during a committed cast',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 let release!:()=>void;const held=new Promise<void>(r=>release=r);
 try{const page=await ctx.newPage();await page.clock.install();
 await page.route('**/assets/units/*.webp',async route=>{await held;await route.continue();});
 await page.goto('tests/browser/fixtures/unit-a6.html?skill=attack');await page.locator('#start').click();
 await page.clock.pauseAt(new Date(Date.now()+100000));await cast(page,'attack');
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA6QA.frames().sefa![0]!.texture)).toBe('battle-mercs');
 release();await expect.poll(()=>page.evaluate(()=>window.unitA6QA.cached().length)).toBe(4);
 expect(await page.evaluate(()=>window.unitA6QA.frames().sefa![0]!.texture)).toBe('battle-mercs');
 await page.clock.runFor(100);expect(await page.evaluate(()=>window.unitA6QA.frames().sefa![0]!.texture)).toBe('battle-mercs');
 await page.clock.runFor(3000);expect(await page.evaluate(()=>window.unitA6QA.frames().sefa![0]!.texture)).toBe('unit-pilot-sefa');expect(await saved(page)).toBe(committed);
 }finally{release();await ctx.close();}
});
test('A6 encounter replacement releases the A6 textures',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,'skill=attack');
 expect((await page.evaluate(()=>window.unitA6QA.cached())).sort()).toEqual(['unit-pilot-eira','unit-pilot-riftweaver','unit-pilot-sefa']);
 await page.evaluate(()=>window.unitA6QA.otherEncounter());
 await expect.poll(()=>page.evaluate(()=>window.unitA6QA.cached())).toEqual([]);
 await expect(page.locator('#start')).toBeEnabled();
});
