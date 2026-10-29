import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';
import {miraActions,tomaActions,foeArts,foeIntents} from '../fixtures/unit-a4';
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source fixture explicitly checked in CI');
const saved=(page:Page)=>page.evaluate(()=>localStorage.getItem('unit-a4-committed'));
const sheetOf={foe_dew_slime:'dew',foe_ember_slime:'ember',foe_ruin_bat:'bat'} as const;
const contactOf=(clip:string)=>clip==='disengage'?26:clip==='skill'?13:5;
const clipOf={mira:{attack:'attack',hinder:'attack',weakshot:'attack',pin:'attack',track:'attack',volley:'skill',disengage:'disengage'},toma:{attack:'attack',acid:'attack',bomb:'attack',smoke:'attack',haste:'skill',fury:'skill',catalyst:'skill'}} as const;
async function ready(page:Page,query:string,hero='mira',foe='foe_dew_slime'){
 await page.goto(`tests/browser/fixtures/unit-a4.html?hero=${hero}&foe=${foe}&${query}`);
 await expect(page.locator('canvas')).toBeVisible();
 // Wait for optional art before visual QA; this is not a Start/performance gate.
 await expect.poll(()=>page.evaluate(h=>window.unitA4QA.frames()[h]?.[0]?.texture,hero),{timeout:15000}).toBe(`unit-pilot-${hero}`);
 await expect.poll(()=>page.evaluate(()=>window.unitA4QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe(`unit-pilot-${sheetOf[foe as keyof typeof sheetOf]}`);
 if(await page.locator('#start').count())await page.locator('#start').click();
}
const cast=async(page:Page,action:string)=>{await page.locator(`#action-${action}`).click();await page.locator(`#target-${await page.evaluate(()=>window.unitA4QA.target())}`).click();};
const frame=(page:Page,id:string)=>page.evaluate(i=>window.unitA4QA.frames()[i]![0]!.frame,id);
for(const [hero,actions] of [['mira',miraActions],['toma',tomaActions]] as const)for(const action of actions)test(`A4 ${hero} ${action}: windup, release and exact committed result at 390px`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await ready(page,`skill=${action}`,hero);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page,action);
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA4QA.state())).toEqual(await page.evaluate(()=>window.unitA4QA.expected()));
 const expected=contactOf((clipOf[hero] as Record<string,string>)[action]!);
 await page.clock.runFor(80);const before=await page.evaluate(h=>window.unitA4QA.frames()[h]!,hero);
 expect(Number(before[0]!.frame)).toBeLessThan(expected);expect(before[0]!.texture).toBe(`unit-pilot-${hero}`);
 await page.screenshot({path:info.outputPath(`${hero}-${action}-prepare-390.png`)});
 const timing=stageTiming((await page.evaluate(()=>window.unitA4QA.turns()))[0]!,false);
 await page.clock.runFor(timing.contact-80);
 expect(Number(await frame(page,hero))).toBe(expected);
 await page.clock.runFor(450-timing.contact+80);const impacts=await page.evaluate(()=>window.unitA4QA.impacts);
 expect(impacts[0]!.turn.action).toBe(action);
 await page.clock.runFor(500);await page.screenshot({path:info.outputPath(`${hero}-${action}-release-390.png`)});
 await page.clock.runFor(1500);await expect(page.locator('#skip-turn')).toBeHidden();
 expect(await saved(page)).toBe(committed);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`A4 ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
 try{const page=await ctx.newPage();await ready(page,`skill=volley&speed=${speed}&intensity=${intensity}`);
 await cast(page,'volley');const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA4QA.state())).toEqual(await page.evaluate(()=>window.unitA4QA.expected()));
 expect(await frame(page,'mira')).toBe('0');
 }finally{await ctx.close();}
});
for(const change of ['skip','resize','reload','hidden'] as const)test(`A4 ${change} preserves committed command`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'skill=disengage');await cast(page,'disengage');const committed=await saved(page);
 if(change==='skip')await page.locator('#skip-turn').click();
 if(change==='resize')await page.setViewportSize({width:391,height:844});
 if(change==='reload'){await page.reload();await expect(page.locator('canvas')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.unitA4QA.frames().mira?.[0]?.texture)).toBe('unit-pilot-mira');}
 if(change==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA4QA.state())).toEqual(await page.evaluate(()=>window.unitA4QA.expected()));
 }finally{await ctx.close();}
});
for(const art of foeArts)test(`A4 real ${foeIntents[art]} uses the ${art} release and returns to seed`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await page.clock.install();await ready(page,'skill=attack','mira',art);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page,'attack');const committed=await saved(page);
 const turns=await page.evaluate(()=>window.unitA4QA.turns()),hero=stageTiming(turns[0]!,false),enemy=stageTiming(turns[1]!,false);
 await page.clock.runFor(hero.end+enemy.contact);
 expect(await page.evaluate(()=>window.unitA4QA.frames().f1![0]!.texture)).toBe(`unit-pilot-${sheetOf[art]}`);
 expect(Number(await frame(page,'f1'))).toBe(art==='foe_ember_slime'?13:5);
 await page.screenshot({path:info.outputPath(`${art}-contact-390.png`)});await page.clock.runFor(3000);
 // The bat returns to its hover loop, everyone else to the seed pose.
 expect(art==='foe_ruin_bat'?['22','23','24','25'].includes(await frame(page,'f1')):await frame(page,'f1')==='0').toBe(true);
 expect(await saved(page)).toBe(committed);
 expect(await page.evaluate(()=>window.unitA4QA.state())).toEqual(await page.evaluate(()=>window.unitA4QA.expected()));
 }finally{await ctx.close();}
});
for(const hero of ['mira','toma'] as const)for(const scenario of ['hurt','down'])test(`A4 resolver-owned ${hero} ${scenario} reaction`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,`skill=attack&scenario=${scenario}`,hero);
 await cast(page,'attack');await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>frame(page,hero)).toBe(scenario==='down'?'21':'0');
 expect(await page.evaluate(()=>window.unitA4QA.state())).toEqual(await page.evaluate(()=>window.unitA4QA.expected()));
 await page.screenshot({path:info.outputPath(`${hero}-${scenario}-390.png`)});
 }finally{await ctx.close();}
});
for(const art of foeArts)test(`A4 ${art} enemy-down keeps the collapsed last frame`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'skill=attack&scenario=enemy-down','mira',art);
 await cast(page,'attack');await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>frame(page,'f1')).toBe('21');
 expect(await page.evaluate(()=>window.unitA4QA.state())).toEqual(await page.evaluate(()=>window.unitA4QA.expected()));
 await page.screenshot({path:info.outputPath(`${art}-down-390.png`)});
 }finally{await ctx.close();}
});
test('A4 bat hover loops in normal motion and stays on the seed under reduced motion',async({browser})=>{
 for(const [motion,intensity] of [['no-preference','standard'],['reduce','standard'],['no-preference','reduced']] as const){
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
  try{const page=await ctx.newPage();await ready(page,`skill=attack&intensity=${intensity}`,'mira','foe_ruin_bat');
  // Every optional sheet must be adopted first: a late sheet repaints the field, which rebinds the bat at its seed frame for one tick.
  await expect.poll(()=>page.evaluate(()=>window.unitA4QA.cached().length),{timeout:15000}).toBe(3); // Aegis is on anatomy hold
  if(motion==='no-preference'&&intensity==='standard')await expect.poll(()=>frame(page,'f1')).toMatch(/^2[2-5]$/);else await page.waitForTimeout(300);
  const seen=new Set<string>();const end=Date.now()+1500;
  while(Date.now()<end){seen.add(await frame(page,'f1'));await page.waitForTimeout(40);}
  if(motion==='no-preference'&&intensity==='standard'){expect([...seen].every(f=>['22','23','24','25'].includes(f))).toBe(true);expect(seen.size).toBeGreaterThanOrEqual(3);}
  else expect([...seen]).toEqual(['0']);
  }finally{await ctx.close();}
 }
});
test('A4 late optional textures cannot replace artwork during a committed cast',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 let release!:()=>void;const held=new Promise<void>(r=>release=r);
 try{const page=await ctx.newPage();await page.clock.install();
 await page.route('**/assets/units/*.webp',async route=>{await held;await route.continue();});
 await page.goto('tests/browser/fixtures/unit-a4.html?skill=attack');await page.locator('#start').click();
 await page.clock.pauseAt(new Date(Date.now()+100000));await cast(page,'attack');
 const committed=await saved(page);expect(await page.evaluate(()=>window.unitA4QA.frames().mira![0]!.texture)).toBe('battle-mercs');
 release();await expect.poll(()=>page.evaluate(()=>window.unitA4QA.cached().length)).toBe(3); // Aegis is on anatomy hold
 expect(await page.evaluate(()=>window.unitA4QA.frames().mira![0]!.texture)).toBe('battle-mercs');
 await page.clock.runFor(100);expect(await page.evaluate(()=>window.unitA4QA.frames().mira![0]!.texture)).toBe('battle-mercs');
 await page.clock.runFor(3000);expect(await page.evaluate(()=>window.unitA4QA.frames().mira![0]!.texture)).toBe('unit-pilot-mira');expect(await saved(page)).toBe(committed);
 }finally{release();await ctx.close();}
});
test('A4 encounter replacement releases the A4 textures',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,'skill=attack');
 expect((await page.evaluate(()=>window.unitA4QA.cached())).sort()).toEqual(['unit-pilot-dew','unit-pilot-eira','unit-pilot-mira']);
 await page.evaluate(()=>window.unitA4QA.otherEncounter());
 await expect.poll(()=>page.evaluate(()=>window.unitA4QA.cached())).toEqual([]);
 await expect(page.locator('#start')).toBeEnabled();
});
