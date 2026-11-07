import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test.skip(process.env.VFX_REWORK_CLIPS!=='1','separate real-clock owner motion capture');
const cases=[...['coat','stack','tick','burst','storm','early','shadow','arcane-gain','arcane-release','clash'].map(scenario=>({scenario,mode:'normal'})),...['fast','reduced','osreduce'].map(mode=>({scenario:'storm',mode}))];
for(const {scenario,mode} of cases)test(`rework clip ${scenario}-${mode}`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode==='osreduce'?'reduce':'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`tests/browser/fixtures/vfx-rework.html?scenario=${scenario}&speed=${mode==='fast'?'fast':'normal'}&intensity=${mode==='reduced'?'reduced':'standard'}`);
 await expect.poll(()=>page.evaluate(()=>window.vfxReworkQA.ready()),{timeout:15000}).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.vfxReworkQA.artReady()),{timeout:15000}).toBe(true);
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 const skill=await page.evaluate(()=>window.vfxReworkQA.skill);await page.locator(`#action-${skill}`).click();
 await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await page.waitForTimeout(3000);
 await page.evaluate(()=>document.addEventListener('pointerdown',()=>{document.documentElement.dataset.reworkClick=String(Date.now()/1000);},{capture:true,once:true}));
 const dir=info.outputPath('frames');mkdirSync(dir,{recursive:true});const cdp=await ctx.newCDPSession(page),stamps:string[]=[];
 cdp.on('Page.screencastFrame',f=>{const n=String(stamps.length).padStart(4,'0');writeFileSync(`${dir}/${n}.jpg`,Buffer.from(f.data,'base64'));stamps.push(`${n} ${f.metadata.timestamp}`);void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:80,everyNthFrame:1});await page.waitForTimeout(300);
 await page.locator(`#target-${await page.evaluate(()=>window.vfxReworkQA.target)}`).click();
 const committed=await page.evaluate(()=>localStorage.getItem('rework-committed'));
 const click=Number(await page.locator('html').getAttribute('data-rework-click'));expect(click).toBeGreaterThan(1e9);
 await expect(page.locator('#skip-turn')).toBeHidden();await page.waitForTimeout(350);await cdp.send('Page.stopScreencast');
 expect(await page.evaluate(()=>window.vfxReworkQA.state())).toEqual(await page.evaluate(()=>window.vfxReworkQA.expected()));
 expect(await page.evaluate(()=>localStorage.getItem('rework-committed'))).toBe(committed);expect(stamps.length).toBeGreaterThan(6);
 const turns=await page.evaluate(()=>window.vfxReworkQA.turns());
 if(scenario==='storm'||scenario==='early')expect(turns[0]!.events.filter(e=>e.type==='damage'&&e.text==='Blade storm.')).toHaveLength(scenario==='early'?1:4);
 writeFileSync(info.outputPath('name.txt'),`${scenario}-${mode}`);writeFileSync(info.outputPath('stamps.txt'),`click ${click}\n${stamps.join('\n')}`);writeFileSync(info.outputPath('timing.json'),JSON.stringify(await page.evaluate(()=>window.vfxReworkQA.impacts),null,2));writeFileSync(info.outputPath('final-state.json'),JSON.stringify(await page.evaluate(()=>window.vfxReworkQA.state()),null,2));expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
