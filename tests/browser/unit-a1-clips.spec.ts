import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test.skip(process.env.UNIT_A1_CLIPS!=='1','separate real-clock capture only');
const cases=[...['attack','bolt','ward'].flatMap(skill=>['normal','fast','reduced','osreduce'].map(mode=>({skill,mode}))),...['sigil','storm','aegis','dispel'].map(skill=>({skill,mode:'normal'}))];
for(const {skill,mode} of cases)test(`unit A1 clip ${skill}-${mode}`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode==='osreduce'?'reduce':'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`tests/browser/fixtures/unit-a1.html?skill=${skill}&speed=${mode==='fast'?'fast':'normal'}&intensity=${mode==='reduced'?'reduced':'standard'}`);
 await expect(page.locator('#start')).toBeEnabled();await expect.poll(()=>page.evaluate(()=>window.unitA1QA.frames().weaver?.[0]?.texture)).toBe('unit-pilot-eira');
 await expect.poll(()=>page.evaluate(()=>window.unitA1QA.frames().b1?.[0]?.texture)).toBe('unit-pilot-sprite');
 await page.locator('#start').click();await page.locator(`#action-${skill}`).click();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await page.evaluate(()=>document.addEventListener('pointerdown',()=>{document.documentElement.dataset.unitA1Click=String(Date.now()/1000);},{capture:true,once:true}));
 const dir=info.outputPath('frames');mkdirSync(dir,{recursive:true});const cdp=await ctx.newCDPSession(page),stamps:string[]=[];
 cdp.on('Page.screencastFrame',f=>{const n=String(stamps.length).padStart(4,'0');writeFileSync(`${dir}/${n}.jpg`,Buffer.from(f.data,'base64'));stamps.push(`${n} ${f.metadata.timestamp}`);void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,everyNthFrame:1});await page.waitForTimeout(300);
 await page.locator(`#target-${await page.evaluate(()=>window.unitA1QA.target())}`).click();const committed=await page.evaluate(()=>localStorage.getItem('unit-a1-committed'));
 const click=Number(await page.locator('html').getAttribute('data-unit-a1-click'));expect(click).toBeGreaterThan(1e9);
 await expect(page.locator('#skip-turn')).toBeHidden();await page.waitForTimeout(300);await cdp.send('Page.stopScreencast');
 const actual=await page.evaluate(()=>window.unitA1QA.state());expect(actual).toEqual(await page.evaluate(()=>window.unitA1QA.expected()));
 expect(await page.evaluate(()=>localStorage.getItem('unit-a1-committed'))).toBe(committed);expect(actual.commands).toHaveLength(1);expect(stamps.length).toBeGreaterThan(6);
 writeFileSync(info.outputPath('stamps.txt'),`click ${click}\n${stamps.join('\n')}`);writeFileSync(info.outputPath('timing.json'),JSON.stringify(await page.evaluate(()=>window.unitA1QA.impacts),null,2));
 writeFileSync(info.outputPath('final-state.json'),JSON.stringify(actual,null,2));expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
