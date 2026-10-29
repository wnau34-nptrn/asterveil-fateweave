import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test.skip(process.env.UNIT_A10_CLIPS!=='1','separate real-clock capture only');
type Foe='raider'|'brute';
interface Clip{foe:Foe;scenario:string;mode:string;intent?:string;block?:boolean}
const cases:Clip[]=[
 {foe:'raider',scenario:'normal',mode:'normal',intent:'Raking Slash'},
 {foe:'raider',scenario:'normal',mode:'normal',intent:'Shadow Knife'},
 {foe:'brute',scenario:'normal',mode:'normal',intent:'Crushing Blow'},
 {foe:'brute',scenario:'normal',mode:'normal',intent:'Rift Bolt'},
 {foe:'raider',scenario:'enemy-down',mode:'normal'},
 {foe:'brute',scenario:'enemy-down',mode:'normal'},
 {foe:'raider',scenario:'normal',mode:'block',block:true},
 {foe:'brute',scenario:'normal',mode:'block',block:true},
 {foe:'raider',scenario:'normal',mode:'osreduce',intent:'Raking Slash'},
];
const label=(c:Clip)=>`${c.foe}-${c.block?'block':c.scenario==='enemy-down'?'down':(c.intent??'').toLowerCase().replace(/ /g,'-')}-${c.scenario}-${c.mode}`;
for(const c of cases)test(`unit A10 clip ${label(c)}`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:c.mode==='osreduce'?'reduce':'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`tests/browser/fixtures/unit-a10.html?foe=${c.foe}&scenario=${c.scenario}${c.intent?'&intent='+encodeURIComponent(c.intent):''}`);
 if(await page.locator('#start').count())await expect(page.locator('#start')).toBeEnabled();
 await expect.poll(()=>page.evaluate(()=>window.unitA10QA.frames().tracer?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-lyra');
 await expect.poll(()=>page.evaluate(()=>window.unitA10QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe(`unit-pilot-${c.foe}`);
 if(await page.locator('#start').count())await page.locator('#start').click();await page.locator('#action-attack').click();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await page.evaluate(()=>document.addEventListener('pointerdown',()=>{document.documentElement.dataset.unitA10Click=String(Date.now()/1000);},{capture:true,once:true}));
 const dir=info.outputPath('frames');mkdirSync(dir,{recursive:true});const cdp=await ctx.newCDPSession(page),stamps:string[]=[];
 cdp.on('Page.screencastFrame',f=>{const n=String(stamps.length).padStart(4,'0');writeFileSync(`${dir}/${n}.jpg`,Buffer.from(f.data,'base64'));stamps.push(`${n} ${f.metadata.timestamp}`);void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,everyNthFrame:1});await page.waitForTimeout(300);
 let committed:string|null=null;
 if(c.block){
  // Presentation-only QA stage: the hero turn with its damage to the foe forced to 0; nothing is committed.
  await page.evaluate(()=>{document.dispatchEvent(new PointerEvent('pointerdown'));});await page.evaluate(()=>window.unitA10QA.block(900));await page.waitForTimeout(2200);
 }else{
  await page.locator(`#target-${await page.evaluate(()=>window.unitA10QA.target())}`).click();committed=await page.evaluate(()=>localStorage.getItem('unit-a10-committed'));
  await expect(page.locator('#skip-turn')).toBeHidden();await page.waitForTimeout(300);
 }
 await cdp.send('Page.stopScreencast');
 const click=Number(await page.locator('html').getAttribute('data-unit-a10-click'));expect(click).toBeGreaterThan(1e9);
 if(!c.block){const actual=await page.evaluate(()=>window.unitA10QA.state());expect(actual).toEqual(await page.evaluate(()=>window.unitA10QA.expected()));
  expect(await page.evaluate(()=>localStorage.getItem('unit-a10-committed'))).toBe(committed);expect(actual.commands).toHaveLength(1);writeFileSync(info.outputPath('final-state.json'),JSON.stringify(actual,null,2));}
 expect(stamps.length).toBeGreaterThan(6);
 writeFileSync(info.outputPath('name.txt'),label(c));writeFileSync(info.outputPath('stamps.txt'),`click ${click}\n${stamps.join('\n')}`);writeFileSync(info.outputPath('timing.json'),JSON.stringify(await page.evaluate(()=>window.unitA10QA.impacts),null,2));
 expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
