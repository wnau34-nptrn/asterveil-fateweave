import {test,expect} from '@playwright/test';
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source fixture gate');
for(const scenario of ['coat','stack','tick','burst','storm','early','shadow','arcane-gain','arcane-release','clash'])test(`rework ${scenario} preserves the real command result`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`tests/browser/fixtures/vfx-rework.html?scenario=${scenario}`);
 await expect.poll(()=>page.evaluate(()=>window.vfxReworkQA.ready()),{timeout:15000}).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.vfxReworkQA.artReady()),{timeout:15000}).toBe(true);
 await page.waitForTimeout(1000);
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 const skill=await page.evaluate(()=>window.vfxReworkQA.skill);await page.locator(`#action-${skill}`).click();
 await page.evaluate(()=>{const seen=new Set<string>();(window as unknown as {reworkSeen:Set<string>}).reworkSeen=seen;setInterval(()=>window.vfxReworkQA.painted().forEach(i=>seen.add(i.frame)),16);});
 await page.locator(`#target-${await page.evaluate(()=>window.vfxReworkQA.target)}`).click();
 const committed=await page.evaluate(()=>localStorage.getItem('rework-committed'));
 await expect(page.locator('#skip-turn')).toBeHidden();
 expect(await page.evaluate(()=>window.vfxReworkQA.state())).toEqual(await page.evaluate(()=>window.vfxReworkQA.expected()));
 expect(await page.evaluate(()=>localStorage.getItem('rework-committed'))).toBe(committed);
 const seen=await page.evaluate(()=>[...(window as unknown as {reworkSeen:Set<string>}).reworkSeen]);
 const prefix=({coat:'venom_coat',stack:'venom_stack',tick:'venom_tick',burst:'venom_burst',storm:'blade_storm',early:'blade_storm',shadow:'shadow_cut','arcane-gain':'arcane_gain','arcane-release':'arcane_release',clash:'clash'} as Record<string,string>)[scenario]!;
 expect(seen.some(f=>f.startsWith(prefix)),`painted ${prefix} observed in real scene`).toBe(true);
 if(scenario==='storm')for(let i=1;i<=4;i++)expect(seen).toContain(`blade_storm_${i}`);
 if(scenario==='early')expect(seen.filter(f=>/^blade_storm_[1-4]$/.test(f))).toEqual(['blade_storm_1']);
 expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
for(const mode of ['fast','reduced','osreduce'])test(`rework storm ${mode} preserves committed result through resize`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:mode==='osreduce'?'reduce':'no-preference'});
 try{
 const page=await ctx.newPage();await page.goto(`tests/browser/fixtures/vfx-rework.html?scenario=storm&speed=${mode==='fast'?'fast':'normal'}&intensity=${mode==='reduced'?'reduced':'standard'}`);
 await expect.poll(()=>page.evaluate(()=>window.vfxReworkQA.ready()),{timeout:15000}).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.vfxReworkQA.artReady()),{timeout:15000}).toBe(true);
 await page.waitForTimeout(1000);
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.locator('#action-backstab').click();await page.locator('#target-f1').click();
 const saved=await page.evaluate(()=>localStorage.getItem('rework-committed'));
 await page.setViewportSize({width:391,height:844});await expect(page.locator('#skip-turn')).toBeHidden();
 expect(await page.evaluate(()=>window.vfxReworkQA.state())).toEqual(await page.evaluate(()=>window.vfxReworkQA.expected()));
 expect(await page.evaluate(()=>localStorage.getItem('rework-committed'))).toBe(saved);
 }finally{await ctx.close();}
});
