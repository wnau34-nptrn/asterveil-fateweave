import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {foeIntents,sheetOf,type FoeArt} from '../fixtures/unit-a8';
test.skip(process.env.UNIT_A8_CLIPS!=='1','separate real-clock capture only');
interface Clip{foe:FoeArt;intent:string;scenario:string;mode:string;preroll?:number;tag?:string}
const cases:Clip[]=[
 ...(Object.keys(foeIntents) as FoeArt[]).flatMap(foe=>foeIntents[foe].map(intent=>({foe,intent,scenario:'normal',mode:'normal'}))),
 // The wisp's hover loop is recorded for two seconds before the Knight commits.
 {foe:'foe_rift_wisp',intent:'Star Flame',scenario:'normal',mode:'normal',preroll:2200,tag:'hover'},
 ...(Object.keys(foeIntents) as FoeArt[]).map(foe=>({foe,intent:foeIntents[foe][0]!,scenario:'enemy-down',mode:'normal'})),
 {foe:'foe_golem',intent:'Veil Quake',scenario:'normal',mode:'osreduce'},
];
const slug=(c:Clip)=>`${c.foe}-${c.intent.toLowerCase().replace(/ /g,'-')}-${c.scenario}-${c.mode}${c.tag?'-'+c.tag:''}`;
for(const c of cases)test(`unit A8 clip ${slug(c)}`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:c.mode==='osreduce'?'reduce':'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`tests/browser/fixtures/unit-a8.html?foe=${c.foe}&scenario=${c.scenario}&intent=${encodeURIComponent(c.intent)}`);
 if(await page.locator('#start').count())await expect(page.locator('#start')).toBeEnabled();
 await expect.poll(()=>page.evaluate(()=>window.unitA8QA.frames().tracer?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-lyra');
 await expect.poll(()=>page.evaluate(()=>window.unitA8QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe(`unit-pilot-${sheetOf[c.foe]}`);
 if(await page.locator('#start').count())await page.locator('#start').click();await page.locator('#action-attack').click();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await page.evaluate(()=>document.addEventListener('pointerdown',()=>{document.documentElement.dataset.unitA8Click=String(Date.now()/1000);},{capture:true,once:true}));
 const dir=info.outputPath('frames');mkdirSync(dir,{recursive:true});const cdp=await ctx.newCDPSession(page),stamps:string[]=[];
 cdp.on('Page.screencastFrame',f=>{const n=String(stamps.length).padStart(4,'0');writeFileSync(`${dir}/${n}.jpg`,Buffer.from(f.data,'base64'));stamps.push(`${n} ${f.metadata.timestamp}`);void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,everyNthFrame:1});await page.waitForTimeout(c.preroll??300);
 await page.locator(`#target-${await page.evaluate(()=>window.unitA8QA.target())}`).click();const committed=await page.evaluate(()=>localStorage.getItem('unit-a8-committed'));
 const click=Number(await page.locator('html').getAttribute('data-unit-a8-click'));expect(click).toBeGreaterThan(1e9);
 await expect(page.locator('#skip-turn')).toBeHidden();await page.waitForTimeout(c.scenario==='enemy-down'?900:300);await cdp.send('Page.stopScreencast');
 const actual=await page.evaluate(()=>window.unitA8QA.state());expect(actual).toEqual(await page.evaluate(()=>window.unitA8QA.expected()));
 expect(await page.evaluate(()=>localStorage.getItem('unit-a8-committed'))).toBe(committed);expect(actual.commands).toHaveLength(1+await page.evaluate(()=>window.unitA8QA.prelude().length));expect(stamps.length).toBeGreaterThan(6);
 writeFileSync(info.outputPath('name.txt'),slug(c));writeFileSync(info.outputPath('stamps.txt'),`click ${click}\n${stamps.join('\n')}`);writeFileSync(info.outputPath('timing.json'),JSON.stringify(await page.evaluate(()=>window.unitA8QA.impacts),null,2));
 writeFileSync(info.outputPath('final-state.json'),JSON.stringify(actual,null,2));expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
