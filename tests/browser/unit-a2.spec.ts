import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';
import {aegisActions} from '../fixtures/unit-a2';
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source fixture explicitly checked in CI');
const saved=(page:Page)=>page.evaluate(()=>localStorage.getItem('unit-a2-committed'));
async function ready(page:Page,query:string){
 await page.goto(`tests/browser/fixtures/unit-a2.html?${query}`);
 await expect(page.locator('canvas')).toBeVisible();
 // Wait for optional art before visual QA; this is not a Start/performance gate.
 await expect.poll(()=>page.evaluate(()=>window.unitA2QA.frames().guardian?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-aegis');
 if(await page.locator('#start').count())await page.locator('#start').click();
}
for(const action of aegisActions)test(`A2 ${action}: windup, release, guard intent and exact committed result at 390px`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await ready(page,`skill=${action}`);await page.clock.pauseAt(new Date(Date.now()+100000));
 await page.locator(`#action-${action}`).click();await page.locator(`#target-${await page.evaluate(()=>window.unitA2QA.target())}`).click();
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA2QA.state())).toEqual(await page.evaluate(()=>window.unitA2QA.expected()));
 const expected=action==='attack'?5:action==='bash'?26:13;
 // Windup must never expose the release frame.
 await page.clock.runFor(80);const before=await page.evaluate(()=>window.unitA2QA.frames().guardian!);
 expect(Number(before[0]!.frame)).toBeLessThan(expected);expect(before[0]!.texture).toBe('unit-pilot-aegis');
 await page.screenshot({path:info.outputPath('aegis-prepare-390.png')});
 const timing=stageTiming((await page.evaluate(()=>window.unitA2QA.turns()))[0]!,false);
 await page.clock.runFor(timing.contact-80);
 expect(Number(await page.evaluate(()=>window.unitA2QA.frames().guardian![0]!.frame))).toBe(expected);
 await page.clock.runFor(450-timing.contact+80);const impacts=await page.evaluate(()=>window.unitA2QA.impacts);
 expect(impacts[0]!.turn.action).toBe(action);
 await page.clock.runFor(500);await page.screenshot({path:info.outputPath('guard-release-390.png')});
 await page.clock.runFor(1500);await expect(page.locator('#skip-turn')).toBeHidden();
 expect(await saved(page)).toBe(committed);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`A2 ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
 try{const page=await ctx.newPage();await ready(page,`skill=attack&speed=${speed}&intensity=${intensity}`);
 await page.locator('#action-attack').click();await page.locator('#target-f1').click();const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA2QA.state())).toEqual(await page.evaluate(()=>window.unitA2QA.expected()));
 expect(await page.evaluate(()=>window.unitA2QA.frames().guardian![0]!.frame)).toBe('0');
 }finally{await ctx.close();}
});
for(const change of ['skip','resize','reload','hidden'] as const)test(`A2 ${change} preserves committed command`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'skill=attack');await page.locator('#action-attack').click();await page.locator('#target-f1').click();const committed=await saved(page);
 if(change==='skip')await page.locator('#skip-turn').click();
 if(change==='resize')await page.setViewportSize({width:391,height:844});
 if(change==='reload'){await page.reload();await expect(page.locator('canvas')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.unitA2QA.frames().guardian?.[0]?.texture)).toBe('unit-pilot-aegis');}
 if(change==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA2QA.state())).toEqual(await page.evaluate(()=>window.unitA2QA.expected()));
 }finally{await ctx.close();}
});
for(const scenario of ['revive','enemy-down'])test(`A2 resolver-owned ${scenario} resets vargoth lifecycle`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,`skill=attack&scenario=${scenario}`);
 if(scenario==='revive')expect(await page.evaluate(()=>window.unitA2QA.frames().guardian![0]!.frame)).toBe('21');
 await page.locator(`#action-${scenario==='revive'?'revive':'attack'}`).click();await page.locator(`#target-${await page.evaluate(()=>window.unitA2QA.target())}`).click();
 await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>page.evaluate(s=>window.unitA2QA.frames()[s==='revive'?'guardian':'f1']![0]!.frame,scenario)).toBe(scenario==='revive'?'0':'21');
 expect(await page.evaluate(()=>window.unitA2QA.state())).toEqual(await page.evaluate(()=>window.unitA2QA.expected()));
 await page.screenshot({path:info.outputPath(`${scenario}-390.png`)});
 }finally{await ctx.close();}
});
test('A2 late optional textures cannot replace artwork during a committed cast',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 let release!:()=>void;const held=new Promise<void>(r=>release=r);
 try{const page=await ctx.newPage();await page.clock.install();
 await page.route('**/assets/units/*.webp',async route=>{await held;await route.continue();});
 await page.goto('tests/browser/fixtures/unit-a2.html?skill=attack');await page.locator('#start').click();
 await page.clock.pauseAt(new Date(Date.now()+100000));await page.locator('#action-attack').click();await page.locator('#target-f1').click();
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA2QA.frames().guardian![0]!.texture)).toBe('battle-units');
 release();await expect.poll(()=>page.evaluate(()=>window.unitA2QA.cached().length)).toBe(3);
 // No renderer frame elapsed: textures have arrived while this committed stage is active.
 expect(await page.evaluate(()=>window.unitA2QA.frames().guardian![0]!.texture)).toBe('battle-units');
 await page.clock.runFor(100);expect(await page.evaluate(()=>window.unitA2QA.frames().guardian![0]!.texture)).toBe('battle-units');
 await page.clock.runFor(3000);expect(await page.evaluate(()=>window.unitA2QA.frames().guardian![0]!.texture)).toBe('unit-pilot-aegis');expect(await saved(page)).toBe(committed);
 }finally{release();await ctx.close();}
});

test('A2 encounter replacement releases Aegis and Guard textures',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,'skill=attack');
 expect((await page.evaluate(()=>window.unitA2QA.cached())).sort()).toEqual(['unit-pilot-aegis','unit-pilot-eira','unit-pilot-vargoth']);
 await page.evaluate(()=>window.unitA2QA.otherEncounter());
 await expect.poll(()=>page.evaluate(()=>window.unitA2QA.cached())).toEqual([]);
 await expect(page.locator('#start')).toBeEnabled();
});

for(const dpr of [2,3])test(`A2 inherited alchemy recipient anchor follows Aegis normalization at ${dpr}x DPR`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:dpr,reducedMotion:'no-preference'});
 try{
 const page=await ctx.newPage();await page.clock.install();await ready(page,'skill=attack');await page.clock.pauseAt(new Date(Date.now()+100000));
 await page.locator('#action-attack').click();await page.locator('#target-f1').click();await page.clock.runFor(80);
 const p=await page.evaluate(()=>window.unitA2QA.alchemyPoint());
 expect(p.actual.x).toBeCloseTo(p.expected.x,2);expect(p.actual.y).toBeCloseTo(p.expected.y,2);
 expect(p.earthActual.x).toBeCloseTo(p.earthExpected.x,2);expect(p.earthActual.y).toBeCloseTo(p.earthExpected.y,2);
 expect(p.projectileActual.releaseX).toBeCloseTo(p.projectileExpected.x,2);expect(p.projectileActual.releaseY).toBeCloseTo(p.projectileExpected.y,2);
 }finally{await ctx.close();}
});

for(const intent of ['Rift Bolt','Crushing Blow','Shield Smash','Mace Swing'])test(`A2 real guard ${intent} uses its own release and returns to seed`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await page.clock.install();await ready(page,`skill=attack&intent=${encodeURIComponent(intent)}`);await page.clock.pauseAt(new Date(Date.now()+100000));
 await page.locator('#action-attack').click();await page.locator('#target-f1').click();const committed=await saved(page);
 const turns=await page.evaluate(()=>window.unitA2QA.turns()),hero=stageTiming(turns[0]!,false),enemy=stageTiming(turns[1]!,false);
 await page.clock.runFor(hero.end+enemy.contact);
 expect(await page.evaluate(()=>window.unitA2QA.frames().f1![0]!.texture)).toBe('unit-pilot-vargoth');
 expect(Number(await page.evaluate(()=>window.unitA2QA.frames().f1![0]!.frame))).toBe(intent==='Rift Bolt'?13:intent==='Shield Smash'?28:5);
 await page.screenshot({path:info.outputPath('guard-contact-390.png')});await page.clock.runFor(3000);
 expect(await page.evaluate(()=>window.unitA2QA.frames().f1![0]!.frame)).toBe('0');expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA2QA.state())).toEqual(await page.evaluate(()=>window.unitA2QA.expected()));
 }finally{await ctx.close();}
});
for(const skill of ['bash','guard'])for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`A2 ${skill} ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
 try{const page=await ctx.newPage();await ready(page,`skill=${skill}&speed=${speed}&intensity=${intensity}`);await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.unitA2QA.target())}`).click();const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);expect(await page.evaluate(()=>window.unitA2QA.state())).toEqual(await page.evaluate(()=>window.unitA2QA.expected()));
 }finally{await ctx.close();}
});
for(const [skill,scenario,intent] of [['guard','counter','Crushing Blow'],['bash','reflect','Rift Bolt'],['bash','retribution','Crushing Blow'],['rally','banner','Rift Bolt'],['rouse','wounded','Rift Bolt']])
 test(`A2 ${scenario} follows real talent/outcome events`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,`skill=${skill}&scenario=${scenario}&intent=${encodeURIComponent(intent!)}`);
 await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.unitA2QA.target())}`).click();const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);expect(await page.evaluate(()=>window.unitA2QA.state())).toEqual(await page.evaluate(()=>window.unitA2QA.expected()));
});

test('A2 repeated guard art shares one texture and preserves independent actor poses',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await page.clock.install();await ready(page,'skill=attack&scenario=duplicate&intent=Crushing%20Blow');await page.clock.pauseAt(new Date(Date.now()+100000));
 await expect.poll(()=>page.evaluate(()=>window.unitA2QA.frames().f2?.[0]?.texture)).toBe('unit-pilot-vargoth');
 expect((await page.evaluate(()=>window.unitA2QA.cached())).filter(k=>k==='unit-pilot-vargoth')).toHaveLength(1);
 await page.locator('#action-attack').click();await page.locator('#target-f1').click();const committed=await saved(page);
 const turns=await page.evaluate(()=>window.unitA2QA.turns());await page.clock.runFor(stageTiming(turns[0]!,false).end+100);
 expect(await page.evaluate(()=>window.unitA2QA.frames().f1![0]!.frame)).not.toBe('0');expect(await page.evaluate(()=>window.unitA2QA.frames().f2![0]!.frame)).toBe('0');
 await page.clock.runFor(5000);expect(await saved(page)).toBe(committed);expect(await page.evaluate(()=>window.unitA2QA.state())).toEqual(await page.evaluate(()=>window.unitA2QA.expected()));
 }finally{await ctx.close();}
});

test('A2 actual guardcounter braces then ripostes inside the existing reaction window',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await page.clock.install();await ready(page,'skill=guard&scenario=counter&intent=Crushing%20Blow');await page.clock.pauseAt(new Date(Date.now()+100000));
 await page.locator('#action-guard').click();await page.locator(`#target-${await page.evaluate(()=>window.unitA2QA.target())}`).click();const committed=await saved(page);
 const turns=await page.evaluate(()=>window.unitA2QA.turns());await page.clock.runFor(stageTiming(turns[0]!,false).end+stageTiming(turns[1]!,false).contact);
 expect(await page.evaluate(()=>window.unitA2QA.frames().guardian![0]!.frame)).toBe('30');
 const reaction=await page.evaluate(()=>window.unitA2QA.reactionTiming());
 expect(reaction?.duration).toBe(200);expect(reaction?.phase).toBe('reaction');
 await page.clock.runFor(80);expect(await page.evaluate(()=>window.unitA2QA.frames().guardian![0]!.frame)).toBe('5');
 await page.clock.runFor(120);
 // UI contact timers can fall between RAF ticks. The controller still owns a
 // 200ms reaction; permit only its remaining render delta plus one final RAF.
 const tail=await page.evaluate(()=>window.unitA2QA.reactionTiming());
 if(tail){
  expect(tail.duration).toBe(200);expect(tail.phase).toBe('reaction');
  expect(tail.remaining).toBeGreaterThanOrEqual(0);expect(tail.remaining).toBeLessThanOrEqual(1000/60+1);
  await page.clock.runFor(Math.ceil(tail.remaining)+17);
 }
 expect(await page.evaluate(()=>window.unitA2QA.frames().guardian![0]!.frame)).toBe('0');
 await page.clock.runFor(3000);expect(await saved(page)).toBe(committed);expect(await page.evaluate(()=>window.unitA2QA.state())).toEqual(await page.evaluate(()=>window.unitA2QA.expected()));
 }finally{await ctx.close();}
});
