import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source fixture explicitly checked in CI');
// Staggered (engine-generated after a cancelled breakable charge) is covered by tests/unit-wbb.test.ts; the fixture needs a real intent name.
// WB-B Valdrakk (P11-05 step 5): same fixture page as A9 (real UI, scene, playback and resolver commands), foe_valdrakk.
const ART='foe_valdrakk',SHEET='valdrakk',HIT=25,DOWN_HOLD=29;
const moveNumber:Record<string,number>={'Shard Talon':1,'Wing Gust':2,'Wing Gathering':3,'Worldshard Dive':4,'Sky Rend':6};
const contactOf=(name:string)=>1+4*(moveNumber[name]!-1)+2;
const saved=(page:Page)=>page.evaluate(()=>localStorage.getItem('unit-a9-committed'));
async function ready(page:Page,query:string){
 await page.goto(`tests/browser/fixtures/unit-a9.html?foe=${ART}&${query}`);
 await expect(page.locator('canvas')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.unitA9QA.frames().sefa?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-sefa');
 await expect.poll(()=>page.evaluate(()=>window.unitA9QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe(`unit-pilot-${SHEET}`);
 if(await page.locator('#start').count())await page.locator('#start').click();
}
const cast=async(page:Page)=>{await page.locator('#action-attack').click();await page.locator(`#target-${await page.evaluate(()=>window.unitA9QA.target())}`).click();};
const frame=(page:Page,id:string)=>page.evaluate(i=>window.unitA9QA.frames()[i]![0]!.frame,id);
const exact=async(page:Page)=>expect(await page.evaluate(()=>window.unitA9QA.state())).toEqual(await page.evaluate(()=>window.unitA9QA.expected()));
for(const name of Object.keys(moveNumber))test(`WB-B real ${name} uses the Valdrakk atlas once and returns to the seed`,async({browser,},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await ready(page,`intent=${encodeURIComponent(name)}`);await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page);const committed=await saved(page);
 const turns=await page.evaluate(()=>window.unitA9QA.turns()),hero=stageTiming(turns[0]!,false),enemy=stageTiming(turns[1]!,false);
 expect(turns[1]!.intent!.name).toBe(name);
 await page.clock.runFor(hero.end+Math.max(0,enemy.contact-120));
 expect(Number(await frame(page,'f1'))).toBeLessThan(contactOf(name));
 await page.clock.runFor(120);
 expect(await page.evaluate(()=>window.unitA9QA.frames().f1![0]!.texture)).toBe(`unit-pilot-${SHEET}`);
 expect(Number(await frame(page,'f1'))).toBe(contactOf(name));
 await page.screenshot({path:info.outputPath(`${ART}-${name.replace(/ /g,'-')}-contact-390.png`)});
 await page.clock.runFor(3000);
 expect(await frame(page,'f1')).toBe('0');
 expect(await saved(page)).toBe(committed);await exact(page);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
test('WB-B Valdrakk shows the hit pose from the actual hit and the collapsed pose on enemy-down',async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx.newPage();await page.clock.install();await ready(page,'intent=Shard%20Talon');await page.clock.pauseAt(new Date(Date.now()+100000));
 await cast(page);const seen=new Set<string>();
 for(let t=0;t<1800;t+=16){await page.clock.runFor(16);seen.add(await frame(page,'f1'));}
 expect(seen.has(String(HIT))||seen.has(String(HIT+1))).toBe(true);
 await exact(page);
 }finally{await ctx.close();}
 const ctx2=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{const page=await ctx2.newPage();await ready(page,'intent=Shard%20Talon&scenario=enemy-down');
 await cast(page);await expect(page.locator('#skip-turn')).toBeHidden();
 await expect.poll(()=>frame(page,'f1')).toBe(String(DOWN_HOLD));
 await exact(page);await page.screenshot({path:info.outputPath(`${ART}-down-390.png`)});
 }finally{await ctx2.close();}
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`WB-B ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
 try{const page=await ctx.newPage();await ready(page,`intent=Worldshard%20Dive&speed=${speed}&intensity=${intensity}`);
 await cast(page);const committed=await saved(page);
 await expect(page.locator('#skip-turn')).toBeHidden();expect(await saved(page)).toBe(committed);await exact(page);
 expect(await frame(page,'f1')).toBe('0');
 }finally{await ctx.close();}
});
test('WB-B encounter replacement releases the Valdrakk texture',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page,'intent=Shard%20Talon');
 expect(await page.evaluate(()=>window.unitA9QA.cached())).toContain(`unit-pilot-${SHEET}`);
 await page.evaluate(()=>window.unitA9QA.otherEncounter());
 await expect.poll(()=>page.evaluate(()=>window.unitA9QA.cached())).toEqual([]);
 await expect(page.locator('#start')).toBeEnabled();
});
