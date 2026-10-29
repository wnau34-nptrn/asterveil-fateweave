import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';
import {garranActions,brannActions,foeArts,foeIntents} from '../fixtures/unit-a5';
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source fixture explicitly checked in CI');
const saved=(page:Page)=>page.evaluate(()=>localStorage.getItem('unit-a5-committed'));
const sheetOf={foe_tusker:'tusker',foe_stalker:'stalker',foe_thorn_beetle:'beetle'} as const;
const contactOf=(clip:string)=>({attack:5,skill:13,stance:26,taunt:26,brace:34} as Record<string,number>)[clip]!;
const foeContact=(intent:string)=>intent==='Stampede'?13:5;
const clipOf={garran:{attack:'attack',pierce:'attack',halt:'attack',brace:'stance',spearwall:'stance',hold:'stance',warcry:'skill'},brann:{attack:'attack',slam:'skill',quake:'skill',tremor:'skill',taunt:'taunt',stonearmor:'brace',guardstone:'brace'}} as const;
async function ready(page:Page,query:string,hero='garran',foe='foe_tusker'){
 await page.goto(`tests/browser/fixtures/unit-a5.html?hero=${hero}&foe=${foe}&${query}`);
 await expect(page.locator('canvas')).toBeVisible();
 // Wait for optional art before visual QA; this is not a Start/performance gate.
 await expect.poll(()=>page.evaluate(h=>window.unitA5QA.frames()[h]?.[0]?.texture,hero),{timeout:15000}).toBe(`unit-pilot-${hero}`);
 await expect.poll(()=>page.evaluate(()=>window.unitA5QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe(`unit-pilot-${sheetOf[foe as keyof typeof sheetOf]}`);
 if(await page.locator('#start').count())await page.locator('#start').click();
}
const cast=async(page:Page,action:string)=>{await page.locator(`#action-${action}`).click();await page.locator(`#target-${await page.evaluate(()=>window.unitA5QA.target())}`).click();};
const frame=(page:Page,id:string)=>page.evaluate(i=>window.unitA5QA.frames()[i]![0]!.frame,id);
for(const [hero,actions] of [['garran',garranActions],['brann',brannActions]] as const)for(const action of actions)test(`A5 ${hero} ${action}: windup, release and exact committed result at 390px`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await ready(page,`skill=${action}`,hero);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page,action);
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA5QA.state())).toEqual(await page.evaluate(()=>window.unitA5QA.expected()));
 const expected=contactOf((clipOf[hero] as Record<string,string>)[action]!);
 await page.clock.runFor(80);const before=await page.evaluate(h=>window.unitA5QA.frames()[h]!,hero);
 expect(Number(before[0]!.frame)).toBeLessThan(expected);expect(before[0]!.texture).toBe(`unit-pilot-${hero}`);
 await page.screenshot({path:info.outputPath(`${hero}-${action}-prepare-390.png`)});
 const timing=stageTiming((await page.evaluate(()=>window.unitA5QA.turns()))[0]!,false);
 await page.clock.runFor(timing.contact-80);
 expect(Number(await frame(page,hero))).toBe(expected);
 await page.clock.runFor(450-timing.contact+80);const impacts=await page.evaluate(()=>window.unitA5QA.impacts);
 expect(impacts[0]!.turn.action).toBe(action);
 await page.clock.runFor(500);await page.screenshot({path:info.outputPath(`${hero}-${action}-release-390.png`)});
 await page.clock.runFor(1500);await expect(page.locator('#skip-turn')).toBeHidden();
 expect(await saved(page)).toBe(committed);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`A5 ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
 try{const page=await ctx.newPage();await ready(page,`skill=volley&speed=${speed}&intensity=${intensity}`);
 await cast(page,'warcry');const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA5QA.state())).toEqual(await page.evaluate(()=>window.unitA5QA.expected()));
 expect(await frame(page,'garran')).toBe('0');
 }finally{await ctx.close();}
});
for(const change of ['skip','resize','reload','hidden'] as const)test(`A5 ${change} preserves committed command`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'skill=spearwall');await cast(page,'spearwall');const committed=await saved(page);
 if(change==='skip')await page.locator('#skip-turn').click();
 if(change==='resize')await page.setViewportSize({width:391,height:844});
 if(change==='reload'){await page.reload();await expect(page.locator('canvas')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.unitA5QA.frames().garran?.[0]?.texture)).toBe('unit-pilot-garran');}
 if(change==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA5QA.state())).toEqual(await page.evaluate(()=>window.unitA5QA.expected()));
 }finally{await ctx.close();}
});
for(const art of foeArts)for(const intent of foeIntents[art])test(`A5 real ${intent} uses the ${art} release and returns to seed`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await page.clock.install();await ready(page,`skill=attack&intent=${encodeURIComponent(intent)}`,'garran',art);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page,'attack');const committed=await saved(page);
 const turns=await page.evaluate(()=>window.unitA5QA.turns()),hero=stageTiming(turns[0]!,false),enemy=stageTiming(turns[1]!,false);
 await page.clock.runFor(hero.end+enemy.contact);
 expect(await page.evaluate(()=>window.unitA5QA.frames().f1![0]!.texture)).toBe(`unit-pilot-${sheetOf[art]}`);
 expect(Number(await frame(page,'f1'))).toBe(foeContact(intent));
 await page.screenshot({path:info.outputPath(`${art}-${intent.replace(/ /g,'-')}-contact-390.png`)});await page.clock.runFor(3000);
 expect(await frame(page,'f1')).toBe('0');
 expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA5QA.state())).toEqual(await page.evaluate(()=>window.unitA5QA.expected()));
 }finally{await ctx.close();}
});
for(const hero of ['garran','brann'] as const)for(const scenario of ['hurt','down'])test(`A5 resolver-owned ${hero} ${scenario} reaction`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,`skill=attack&scenario=${scenario}`,hero);
 await cast(page,'attack');await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>frame(page,hero)).toBe(scenario==='down'?'21':'0');
 expect(await page.evaluate(()=>window.unitA5QA.state())).toEqual(await page.evaluate(()=>window.unitA5QA.expected()));
 await page.screenshot({path:info.outputPath(`${hero}-${scenario}-390.png`)});
 }finally{await ctx.close();}
});
for(const art of foeArts)test(`A5 ${art} enemy-down keeps the collapsed last frame`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'skill=attack&scenario=enemy-down','garran',art);
 await cast(page,'attack');await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>frame(page,'f1')).toBe('21');
 expect(await page.evaluate(()=>window.unitA5QA.state())).toEqual(await page.evaluate(()=>window.unitA5QA.expected()));
 await page.screenshot({path:info.outputPath(`${art}-down-390.png`)});
 }finally{await ctx.close();}
});
test('A5 late optional textures cannot replace artwork during a committed cast',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 let release!:()=>void;const held=new Promise<void>(r=>release=r);
 try{const page=await ctx.newPage();await page.clock.install();
 await page.route('**/assets/units/*.webp',async route=>{await held;await route.continue();});
 await page.goto('tests/browser/fixtures/unit-a5.html?skill=attack');await page.locator('#start').click();
 await page.clock.pauseAt(new Date(Date.now()+100000));await cast(page,'attack');
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA5QA.frames().garran![0]!.texture)).toBe('battle-mercs');
 release();await expect.poll(()=>page.evaluate(()=>window.unitA5QA.cached().length)).toBe(4);
 expect(await page.evaluate(()=>window.unitA5QA.frames().garran![0]!.texture)).toBe('battle-mercs');
 await page.clock.runFor(100);expect(await page.evaluate(()=>window.unitA5QA.frames().garran![0]!.texture)).toBe('battle-mercs');
 await page.clock.runFor(3000);expect(await page.evaluate(()=>window.unitA5QA.frames().garran![0]!.texture)).toBe('unit-pilot-garran');expect(await saved(page)).toBe(committed);
 }finally{release();await ctx.close();}
});
test('A5 encounter replacement releases the A5 textures',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,'skill=attack');
 expect((await page.evaluate(()=>window.unitA5QA.cached())).sort()).toEqual(['unit-pilot-aegis','unit-pilot-eira','unit-pilot-garran','unit-pilot-tusker']);
 await page.evaluate(()=>window.unitA5QA.otherEncounter());
 await expect.poll(()=>page.evaluate(()=>window.unitA5QA.cached())).toEqual([]);
 await expect(page.locator('#start')).toBeEnabled();
});
