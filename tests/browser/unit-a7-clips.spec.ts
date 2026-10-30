import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {unitA7Heroes,type A7Hero} from '../fixtures/unit-a7';
test.skip(process.env.UNIT_A7_CLIPS!=='1','separate real-clock capture only');
interface Clip{hero:A7Hero;skill:string;scenario:string;mode:string}
const cases:Clip[]=[
 ...unitA7Heroes.flatMap(hero=>[{hero,skill:'attack',scenario:'normal',mode:'normal'},{hero,skill:'attack',scenario:'hurt',mode:'normal'},{hero,skill:'attack',scenario:'down',mode:'normal'}]),
 {hero:'metta',skill:'saintarc',scenario:'normal',mode:'normal'},{hero:'metta',skill:'lastlight',scenario:'normal',mode:'normal'},{hero:'metta',skill:'communion',scenario:'normal',mode:'normal'},
 {hero:'thiran',skill:'communion',scenario:'normal',mode:'normal'},{hero:'thiran',skill:'lastlight',scenario:'normal',mode:'normal'},{hero:'thiran',skill:'saintarc',scenario:'normal',mode:'normal'},
 {hero:'lalin',skill:'cadence',scenario:'normal',mode:'normal'},{hero:'lalin',skill:'closingstep',scenario:'normal',mode:'normal'},{hero:'lalin',skill:'rounddance',scenario:'normal',mode:'normal'},{hero:'lalin',skill:'attack',scenario:'block',mode:'normal'},{hero:'lalin',skill:'echofoot',scenario:'normal',mode:'normal'},{hero:'lalin',skill:'attack',scenario:'normal',mode:'fast'},{hero:'lalin',skill:'attack',scenario:'normal',mode:'osreduce'},
 {hero:'wila',skill:'rounddance',scenario:'normal',mode:'normal'},{hero:'wila',skill:'closingstep',scenario:'normal',mode:'normal'},{hero:'wila',skill:'duet',scenario:'normal',mode:'normal'},
 {hero:'metta',skill:'attack',scenario:'normal',mode:'osreduce'},{hero:'wila',skill:'attack',scenario:'normal',mode:'fast'},
];
for(const {hero,skill,scenario,mode} of cases)test(`unit A7 clip ${hero}-${skill}-${scenario}-${mode}`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode==='osreduce'?'reduce':'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`tests/browser/fixtures/unit-a7.html?hero=${hero}&skill=${skill}&scenario=${scenario}&speed=${mode==='fast'?'fast':'normal'}&intensity=${mode==='reduced'?'reduced':'standard'}`);
 if(await page.locator('#start').count())await expect(page.locator('#start')).toBeEnabled();
 await expect.poll(()=>page.evaluate(h=>window.unitA7QA.frames()[h]?.[0]?.texture,hero),{timeout:15000}).toBe(`unit-pilot-${hero}`);
 await expect.poll(()=>page.evaluate(()=>window.unitA7QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-sporepuff');
 if(await page.locator('#start').count())await page.locator('#start').click();await page.locator(`#action-${skill}`).click();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await page.evaluate(()=>document.addEventListener('pointerdown',()=>{document.documentElement.dataset.unitA7Click=String(Date.now()/1000);},{capture:true,once:true}));
 const dir=info.outputPath('frames');mkdirSync(dir,{recursive:true});const cdp=await ctx.newCDPSession(page),stamps:string[]=[];
 cdp.on('Page.screencastFrame',f=>{const n=String(stamps.length).padStart(4,'0');writeFileSync(`${dir}/${n}.jpg`,Buffer.from(f.data,'base64'));stamps.push(`${n} ${f.metadata.timestamp}`);void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,everyNthFrame:1});await page.waitForTimeout(300);
 await page.locator(`#target-${await page.evaluate(()=>window.unitA7QA.target())}`).click();const committed=await page.evaluate(()=>localStorage.getItem('unit-a7-committed'));
 const click=Number(await page.locator('html').getAttribute('data-unit-a7-click'));expect(click).toBeGreaterThan(1e9);
 await expect(page.locator('#skip-turn')).toBeHidden();await page.waitForTimeout(300);await cdp.send('Page.stopScreencast');
 const actual=await page.evaluate(()=>window.unitA7QA.state());expect(actual).toEqual(await page.evaluate(()=>window.unitA7QA.expected()));
 expect(await page.evaluate(()=>localStorage.getItem('unit-a7-committed'))).toBe(committed);expect(actual.commands).toHaveLength(1+await page.evaluate(()=>window.unitA7QA.prelude().length));expect(stamps.length).toBeGreaterThan(6);
 writeFileSync(info.outputPath('name.txt'),`${hero}-${skill}-${scenario}-${mode}`);writeFileSync(info.outputPath('stamps.txt'),`click ${click}\n${stamps.join('\n')}`);writeFileSync(info.outputPath('timing.json'),JSON.stringify(await page.evaluate(()=>window.unitA7QA.impacts),null,2));
 writeFileSync(info.outputPath('final-state.json'),JSON.stringify(actual,null,2));expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
