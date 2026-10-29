import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';
import {serenActions} from '../fixtures/unit-a3';
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source fixture explicitly checked in CI');
const saved=(page:Page)=>page.evaluate(()=>localStorage.getItem('unit-a3-committed'));
const contact={attack:5,heal:13,revive:13,bless:13,prayer:26,halo:26,sanctuary:34} as const;
async function ready(page:Page,query:string){
 await page.goto(`tests/browser/fixtures/unit-a3.html?${query}`);
 await expect(page.locator('canvas')).toBeVisible();
 // Wait for optional art before visual QA; this is not a Start/performance gate.
 await expect.poll(()=>page.evaluate(()=>window.unitA3QA.frames().healer?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-seren');
 await expect.poll(()=>page.evaluate(()=>window.unitA3QA.frames().b1?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-mycon');
 if(await page.locator('#start').count())await page.locator('#start').click();
}
const scenarioOf=(action:string)=>action==='revive'?'revive':'normal';
const cast=async(page:Page,action:string)=>{await page.locator(`#action-${action}`).click();await page.locator(`#target-${await page.evaluate(()=>window.unitA3QA.target())}`).click();};
for(const action of serenActions)test(`A3 ${action}: windup, release and exact committed result at 390px`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await ready(page,`skill=${action}&scenario=${scenarioOf(action)}`);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page,action);
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA3QA.state())).toEqual(await page.evaluate(()=>window.unitA3QA.expected()));
 const expected=contact[action];
 await page.clock.runFor(80);const before=await page.evaluate(()=>window.unitA3QA.frames().healer!);
 expect(Number(before[0]!.frame)).toBeLessThan(expected);expect(before[0]!.texture).toBe('unit-pilot-seren');
 await page.screenshot({path:info.outputPath('seren-prepare-390.png')});
 const timing=stageTiming((await page.evaluate(()=>window.unitA3QA.turns()))[0]!,false);
 await page.clock.runFor(timing.contact-80);
 expect(Number(await page.evaluate(()=>window.unitA3QA.frames().healer![0]!.frame))).toBe(expected);
 await page.clock.runFor(450-timing.contact+80);const impacts=await page.evaluate(()=>window.unitA3QA.impacts);
 expect(impacts[0]!.turn.action).toBe(action);
 await page.clock.runFor(500);await page.screenshot({path:info.outputPath('seren-release-390.png')});
 await page.clock.runFor(1500);await expect(page.locator('#skip-turn')).toBeHidden();
 expect(await saved(page)).toBe(committed);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`A3 ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
 try{const page=await ctx.newPage();await ready(page,`skill=prayer&speed=${speed}&intensity=${intensity}`);
 await cast(page,'prayer');const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA3QA.state())).toEqual(await page.evaluate(()=>window.unitA3QA.expected()));
 expect(await page.evaluate(()=>window.unitA3QA.frames().healer![0]!.frame)).toBe('0');
 }finally{await ctx.close();}
});
for(const change of ['skip','resize','reload','hidden'] as const)test(`A3 ${change} preserves committed command`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'skill=heal');await cast(page,'heal');const committed=await saved(page);
 if(change==='skip')await page.locator('#skip-turn').click();
 if(change==='resize')await page.setViewportSize({width:391,height:844});
 if(change==='reload'){await page.reload();await expect(page.locator('canvas')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.unitA3QA.frames().healer?.[0]?.texture)).toBe('unit-pilot-seren');}
 if(change==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA3QA.state())).toEqual(await page.evaluate(()=>window.unitA3QA.expected()));
 }finally{await ctx.close();}
});
test('A3 real Spore Hex uses the Mycon release and returns to seed',async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await page.clock.install();await ready(page,'skill=attack');await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page,'attack');const committed=await saved(page);
 const turns=await page.evaluate(()=>window.unitA3QA.turns()),hero=stageTiming(turns[0]!,false),enemy=stageTiming(turns[1]!,false);
 await page.clock.runFor(hero.end+enemy.contact);
 expect(await page.evaluate(()=>window.unitA3QA.frames().b1![0]!.texture)).toBe('unit-pilot-mycon');
 expect(Number(await page.evaluate(()=>window.unitA3QA.frames().b1![0]!.frame))).toBe(13);
 await page.screenshot({path:info.outputPath('mycon-contact-390.png')});await page.clock.runFor(3000);
 expect(await page.evaluate(()=>window.unitA3QA.frames().b1![0]!.frame)).toBe('0');expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA3QA.state())).toEqual(await page.evaluate(()=>window.unitA3QA.expected()));
 }finally{await ctx.close();}
});
for(const scenario of ['hurt','down','enemy-down','revive'])test(`A3 resolver-owned ${scenario} reaction and lifecycle`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,`skill=attack&scenario=${scenario}`);
 // Aegis is on anatomy hold: the downed knight is the static seed, not an A2 collapsed frame.
 if(scenario==='revive')expect(await page.evaluate(()=>window.unitA3QA.frames().guardian!.map(f=>`${f.texture}:${f.frame}`))).toEqual(['battle-units:0']);
 await cast(page,scenario==='revive'?'revive':'attack');
 await expect(page.locator('#skip-turn')).toBeHidden();
 // Down keeps the collapsed last frame; revive/hurt return to the seed pose.
 const id=scenario==='down'?'healer':scenario==='enemy-down'?'b1':scenario==='revive'?'guardian':'healer';
 await expect.poll(()=>page.evaluate(i=>String(window.unitA3QA.frames()[i]![0]!.frame),id)).toBe(scenario==='down'||scenario==='enemy-down'?'21':'0');
 expect(await page.evaluate(()=>window.unitA3QA.state())).toEqual(await page.evaluate(()=>window.unitA3QA.expected()));
 await page.screenshot({path:info.outputPath(`${scenario}-390.png`)});
 }finally{await ctx.close();}
});
test('A3 late optional textures cannot replace artwork during a committed cast',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 let release!:()=>void;const held=new Promise<void>(r=>release=r);
 try{const page=await ctx.newPage();await page.clock.install();
 await page.route('**/assets/units/*.webp',async route=>{await held;await route.continue();});
 await page.goto('tests/browser/fixtures/unit-a3.html?skill=attack');await page.locator('#start').click();
 await page.clock.pauseAt(new Date(Date.now()+100000));await cast(page,'attack');
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA3QA.frames().healer![0]!.texture)).toBe('battle-units');
 release();await expect.poll(()=>page.evaluate(()=>window.unitA3QA.cached().length)).toBe(3); // Aegis is on anatomy hold
 expect(await page.evaluate(()=>window.unitA3QA.frames().healer![0]!.texture)).toBe('battle-units');
 await page.clock.runFor(100);expect(await page.evaluate(()=>window.unitA3QA.frames().healer![0]!.texture)).toBe('battle-units');
 await page.clock.runFor(3000);expect(await page.evaluate(()=>window.unitA3QA.frames().healer![0]!.texture)).toBe('unit-pilot-seren');expect(await saved(page)).toBe(committed);
 }finally{release();await ctx.close();}
});
test('A3 encounter replacement releases Seren, Aegis, Eira and Mycon textures',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,'skill=attack');
 expect((await page.evaluate(()=>window.unitA3QA.cached())).sort()).toEqual(['unit-pilot-eira','unit-pilot-mycon','unit-pilot-seren']);
 await page.evaluate(()=>window.unitA3QA.otherEncounter());
 await expect.poll(()=>page.evaluate(()=>window.unitA3QA.cached())).toEqual([]);
 await expect(page.locator('#start')).toBeEnabled();
});
