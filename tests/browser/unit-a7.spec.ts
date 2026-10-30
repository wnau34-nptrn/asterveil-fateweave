import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';
import {unitA7Heroes,a7Actions,type A7Hero} from '../fixtures/unit-a7';
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source fixture explicitly checked in CI');
const saved=(page:Page)=>page.evaluate(()=>localStorage.getItem('unit-a7-committed'));
const saintClips={attack:'attack',saintstrike:'attack',vowstrike:'attack',saintarc:'arc',communion:'communion',sharewound:'communion',lastlight:'lastlight'} as Record<string,string>;
// Anatomy-gated strips are absent (undefined): the body stays on the seed frame with the procedural motion.
const clipOf:Record<A7Hero,Record<string,string|undefined>>={metta:saintClips,thiran:saintClips,
 lalin:{cadence:'partner',duet:'partner',deepbeat:'partner',closingstep:'closing'},
 wila:{attack:'attack',cadence:'partner',duet:'partner',deepbeat:'partner',rounddance:'circle',closingstep:'closing'}};
const contactOf:Record<A7Hero,Record<string,number>>={metta:{attack:3,arc:9,communion:15,lastlight:22},thiran:{attack:3,arc:9,communion:15,lastlight:22},lalin:{partner:4,closing:10},wila:{attack:3,partner:10,circle:15,closing:22}};
const downFrame:Record<A7Hero,string>={metta:'34',thiran:'34',lalin:'0',wila:'0'};
async function ready(page:Page,query:string,hero:A7Hero='metta'){
 await page.goto(`tests/browser/fixtures/unit-a7.html?hero=${hero}&${query}`);
 await expect(page.locator('canvas')).toBeVisible();
 // Wait for optional art before visual QA; this is not a Start/performance gate.
 await expect.poll(()=>page.evaluate(h=>window.unitA7QA.frames()[h]?.[0]?.texture,hero),{timeout:15000}).toBe(`unit-pilot-${hero}`);
 await expect.poll(()=>page.evaluate(()=>window.unitA7QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-sporepuff');
 if(await page.locator('#start').count())await page.locator('#start').click();
}
const cast=async(page:Page,action:string)=>{await page.locator(`#action-${action}`).click();await page.locator(`#target-${await page.evaluate(()=>window.unitA7QA.target())}`).click();};
const frame=(page:Page,id:string)=>page.evaluate(i=>window.unitA7QA.frames()[i]![0]!.frame,id);
for(const hero of unitA7Heroes)for(const action of a7Actions(hero))test(`A7 ${hero} ${action}: windup, contact and exact committed result at 390px`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await ready(page,`skill=${action}`,hero);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page,action);
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA7QA.state())).toEqual(await page.evaluate(()=>window.unitA7QA.expected()));
 const clip=clipOf[hero][action],expected=clip?contactOf[hero][clip]!:0;
 await page.clock.runFor(80);const before=await page.evaluate(h=>window.unitA7QA.frames()[h]!,hero);
 if(clip)expect(Number(before[0]!.frame)).toBeLessThan(expected);else expect(before[0]!.frame).toBe('0');
 expect(before[0]!.texture).toBe(`unit-pilot-${hero}`);
 await page.screenshot({path:info.outputPath(`${hero}-${action}-prepare-390.png`)});
 const timing=stageTiming((await page.evaluate(()=>window.unitA7QA.turns()))[0]!,false);
 await page.clock.runFor(timing.contact-80);
 expect(Number(await frame(page,hero))).toBe(expected);
 await page.clock.runFor(450-timing.contact+80);const impacts=await page.evaluate(()=>window.unitA7QA.impacts);
 expect(impacts[0]!.turn.action).toBe(action);
 await page.clock.runFor(500);await page.screenshot({path:info.outputPath(`${hero}-${action}-release-390.png`)});
 await page.clock.runFor(1500);await expect(page.locator('#skip-turn')).toBeHidden();
 expect(await frame(page,hero)).toBe('0');
 expect(await saved(page)).toBe(committed);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`A7 ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
 try{const page=await ctx.newPage();await ready(page,`skill=saintarc&speed=${speed}&intensity=${intensity}`);
 await cast(page,'saintarc');const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA7QA.state())).toEqual(await page.evaluate(()=>window.unitA7QA.expected()));
 expect(await frame(page,'metta')).toBe('0');
 }finally{await ctx.close();}
});
for(const change of ['skip','resize','reload','hidden'] as const)test(`A7 ${change} preserves committed command`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'skill=lastlight','thiran');await cast(page,'lastlight');const committed=await saved(page);
 if(change==='skip')await page.locator('#skip-turn').click();
 if(change==='resize')await page.setViewportSize({width:391,height:844});
 if(change==='reload'){await page.reload();await expect(page.locator('canvas')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.unitA7QA.frames().thiran?.[0]?.texture)).toBe('unit-pilot-thiran');}
 if(change==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA7QA.state())).toEqual(await page.evaluate(()=>window.unitA7QA.expected()));
 }finally{await ctx.close();}
});
for(const hero of unitA7Heroes)for(const scenario of ['hurt','down'])test(`A7 resolver-owned ${hero} ${scenario} reaction`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,`skill=attack&scenario=${scenario}`,hero);
 await cast(page,'attack');await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>frame(page,hero)).toBe(scenario==='down'?downFrame[hero]:'0');
 expect(await page.evaluate(()=>window.unitA7QA.state())).toEqual(await page.evaluate(()=>window.unitA7QA.expected()));
 await page.screenshot({path:info.outputPath(`${hero}-${scenario}-390.png`)});
 }finally{await ctx.close();}
});
test('A7 late optional textures cannot replace artwork during a committed cast',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 let release!:()=>void;const held=new Promise<void>(r=>release=r);
 try{const page=await ctx.newPage();await page.clock.install();
 await page.route('**/assets/units/*.webp',async route=>{await held;await route.continue();});
 await page.goto('tests/browser/fixtures/unit-a7.html?hero=metta&skill=attack');await page.locator('#start').click();
 await page.clock.pauseAt(new Date(Date.now()+100000));await cast(page,'attack');
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA7QA.frames().metta![0]!.texture)).toBe('battle-mercs');
 release();await expect.poll(()=>page.evaluate(()=>window.unitA7QA.cached().length)).toBe(4);
 expect(await page.evaluate(()=>window.unitA7QA.frames().metta![0]!.texture)).toBe('battle-mercs');
 await page.clock.runFor(100);expect(await page.evaluate(()=>window.unitA7QA.frames().metta![0]!.texture)).toBe('battle-mercs');
 await page.clock.runFor(3000);expect(await page.evaluate(()=>window.unitA7QA.frames().metta![0]!.texture)).toBe('unit-pilot-metta');expect(await saved(page)).toBe(committed);
 }finally{release();await ctx.close();}
});
test('A7 encounter replacement releases the A7 textures',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,'skill=attack','wila');
 expect((await page.evaluate(()=>window.unitA7QA.cached())).sort()).toEqual(['unit-pilot-aegis','unit-pilot-eira','unit-pilot-sporepuff','unit-pilot-wila']);
 await page.evaluate(()=>window.unitA7QA.otherEncounter());
 // The replacement encounter fields Aegis (guardian) and a brute: only those stay cached, the A7 sheets are released.
 await expect.poll(()=>page.evaluate(()=>window.unitA7QA.cached().sort())).toEqual(['unit-pilot-aegis','unit-pilot-brute']);
 await expect(page.locator('#start')).toBeEnabled();
});
