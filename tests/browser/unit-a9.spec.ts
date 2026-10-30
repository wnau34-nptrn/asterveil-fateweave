import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';
import {bossArts,bossMoves,sheetOf,type BossArt} from '../fixtures/unit-a9';
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source fixture explicitly checked in CI');
const saved=(page:Page)=>page.evaluate(()=>localStorage.getItem('unit-a9-committed'));
// Contact = the first recover frame of the move (base + 2); each move owns four unique frames from 1 + 4 * (n - 1).
const moveNumber:Record<BossArt,Record<string,number>>={
 foe_matriarch:{'Thorn Tempest':1,'Briar Lash':2,'Gather Thorns':3,'Thorn Bloom':4,'Thorn Storm':4,'Thorn Rage':5},
 foe_juggernaut:{'Horn Charge':1,'Shard Burst':2},
 foe_sentinel:{'Rift Cataclysm':1,'Raking Slash':2,'Crushing Blow':3,'Rift Bolt':4,'Rift Wave':4,'Rift Gathering':5,'Rift Awakening':6,'Call the Rift':7},
 foe_captain:{'War Cry':1,'Crushing Blow':2,'Call the Hunt':3},
};
const contactOf=(art:BossArt,name:string)=>1+4*(moveNumber[art][name]!-1)+2;
const downed:Record<BossArt,number>={foe_matriarch:25,foe_juggernaut:13,foe_sentinel:33,foe_captain:17};
const hit:Record<BossArt,number>={foe_matriarch:21,foe_juggernaut:9,foe_sentinel:29,foe_captain:13};
async function ready(page:Page,art:BossArt,query:string){
 await page.goto(`tests/browser/fixtures/unit-a9.html?foe=${art}&${query}`);
 await expect(page.locator('canvas')).toBeVisible();
 // Wait for optional art before visual QA; this is not a Start/performance gate.
 await expect.poll(()=>page.evaluate(()=>window.unitA9QA.frames().sefa?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-sefa');
 await expect.poll(()=>page.evaluate(()=>window.unitA9QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe(`unit-pilot-${sheetOf[art]}`);
 if(await page.locator('#start').count())await page.locator('#start').click();
}
const cast=async(page:Page)=>{await page.locator('#action-attack').click();await page.locator(`#target-${await page.evaluate(()=>window.unitA9QA.target())}`).click();};
const frame=(page:Page,id:string)=>page.evaluate(i=>window.unitA9QA.frames()[i]![0]!.frame,id);
const exact=async(page:Page)=>expect(await page.evaluate(()=>window.unitA9QA.state())).toEqual(await page.evaluate(()=>window.unitA9QA.expected()));
for(const art of bossArts)for(const name of bossMoves[art])test(`A9 real ${name} uses the ${art} atlas once and returns to the seed`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await ready(page,art,`intent=${encodeURIComponent(name)}`);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page);const committed=await saved(page);
 const turns=await page.evaluate(()=>window.unitA9QA.turns()),hero=stageTiming(turns[0]!,false),enemy=stageTiming(turns[1]!,false);
 expect(turns[1]!.intent!.name).toBe(name);
 await page.clock.runFor(hero.end+Math.max(0,enemy.contact-120));
 expect(Number(await frame(page,'f1'))).toBeLessThan(contactOf(art,name));
 await page.clock.runFor(120);
 expect(await page.evaluate(()=>window.unitA9QA.frames().f1![0]!.texture)).toBe(`unit-pilot-${sheetOf[art]}`);
 expect(Number(await frame(page,'f1'))).toBe(contactOf(art,name));
 if(name===bossMoves[art][1]||name===bossMoves[art][0])await page.screenshot({path:info.outputPath(`${art}-${name.replace(/ /g,'-')}-contact-390.png`)});
 await page.clock.runFor(3000);
 expect(await frame(page,'f1')).toBe('0');
 expect(await saved(page)).toBe(committed);await exact(page);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
for(const art of bossArts)test(`A9 ${art} shows the hit pose from the actual hit and the collapsed pose on enemy-down`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await page.clock.install();await ready(page,art,`intent=${encodeURIComponent(bossMoves[art][0]!)}`);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page);const seen=new Set<string>();
 for(let t=0;t<1800;t+=16){await page.clock.runFor(16);seen.add(await frame(page,'f1'));}
 expect(seen.has(String(hit[art]))||seen.has(String(hit[art]+1))).toBe(true);
 await exact(page);
 }finally{await ctx.close();}
 const ctx2=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx2.newPage();await ready(page,art,`intent=${encodeURIComponent(bossMoves[art][0]!)}&scenario=enemy-down`);
 await cast(page);await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>frame(page,'f1')).toBe(String(downed[art]));
 await exact(page);await page.screenshot({path:info.outputPath(`${art}-down-390.png`)});
 }finally{await ctx2.close();}
});
test('A9 Matriarch atlas faces left without a second flip; the static seed is still mirrored',async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 let release!:()=>void;const held=new Promise<void>(r=>release=r);
 try{const page=await ctx.newPage();
 await page.route('**/assets/units/matriarch_a9.*.webp',async route=>{await held;await route.continue();});
 await page.goto('tests/browser/fixtures/unit-a9.html?foe=foe_matriarch');await expect(page.locator('canvas')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.unitA9QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe('battle-foes');
 expect((await page.evaluate(()=>window.unitA9QA.frames().f1![0]!)).flipX).toBe(true);
 release();await expect.poll(()=>page.evaluate(()=>window.unitA9QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-matriarch');
 expect((await page.evaluate(()=>window.unitA9QA.frames().f1![0]!)).flipX).toBe(false);
 if(await page.locator('#start').count())await page.locator('#start').click();
 await page.screenshot({path:info.outputPath('matriarch-facing-390.png')});
 }finally{release();await ctx.close();}
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`A9 ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
 try{const page=await ctx.newPage();await ready(page,'foe_sentinel',`intent=Rift%20Cataclysm&speed=${speed}&intensity=${intensity}`);
 await cast(page);const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);await exact(page);
 expect(await frame(page,'f1')).toBe('0');
 }finally{await ctx.close();}
});
for(const change of ['skip','resize','reload'] as const)test(`A9 ${change} preserves committed command`,async({browser})=>{
 test.slow();
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await ready(page,'foe_captain','intent=War%20Cry');await cast(page);const committed=await saved(page);
 if(change==='skip')await page.locator('#skip-turn').click();
 if(change==='resize')await page.setViewportSize({width:391,height:844});
 if(change==='reload'){await page.reload();await expect(page.locator('canvas')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.unitA9QA.frames().f1?.[0]?.texture),{timeout:20000}).toBe('unit-pilot-captain');}
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);await exact(page);
 }finally{await ctx.close();}
});
test('A9 encounter replacement releases the boss texture',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,'foe_juggernaut','intent=Horn%20Charge');
 expect((await page.evaluate(()=>window.unitA9QA.cached())).sort()).toEqual(['unit-pilot-aegis','unit-pilot-eira','unit-pilot-juggernaut','unit-pilot-sefa']);
 await page.evaluate(()=>window.unitA9QA.otherEncounter());
 await expect.poll(()=>page.evaluate(()=>window.unitA9QA.cached())).toEqual([]);
 await expect(page.locator('#start')).toBeEnabled();
});
