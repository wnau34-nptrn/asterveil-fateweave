import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test.skip(process.env.UNIT_A4_CLIPS!=='1','separate real-clock capture only');
const sheetOf={foe_dew_slime:'dew',foe_ember_slime:'ember',foe_ruin_bat:'bat'} as const;
type Foe=keyof typeof sheetOf;
interface Clip{hero:'mira'|'toma';skill:string;foe:Foe;scenario:string;mode:string;preroll?:number}
const cases:Clip[]=[
 ...['normal','fast','reduced','osreduce'].map(mode=>({hero:'mira' as const,skill:'attack',foe:'foe_dew_slime' as Foe,scenario:'normal',mode})),
 {hero:'mira',skill:'volley',foe:'foe_ember_slime',scenario:'normal',mode:'normal'},
 {hero:'mira',skill:'disengage',foe:'foe_dew_slime',scenario:'normal',mode:'normal'},
 {hero:'mira',skill:'attack',foe:'foe_ruin_bat',scenario:'normal',mode:'normal'},
 {hero:'mira',skill:'attack',foe:'foe_ruin_bat',scenario:'normal',mode:'normal',preroll:1800},
 {hero:'mira',skill:'attack',foe:'foe_ruin_bat',scenario:'normal',mode:'osreduce',preroll:1000},
 ...['normal','fast','reduced','osreduce'].map(mode=>({hero:'toma' as const,skill:'attack',foe:'foe_ember_slime' as Foe,scenario:'normal',mode})),
 {hero:'toma',skill:'haste',foe:'foe_ruin_bat',scenario:'normal',mode:'normal'},
 {hero:'toma',skill:'bomb',foe:'foe_dew_slime',scenario:'normal',mode:'normal'},
 {hero:'mira',skill:'attack',foe:'foe_dew_slime',scenario:'hurt',mode:'normal'},
 {hero:'toma',skill:'attack',foe:'foe_ember_slime',scenario:'down',mode:'normal'},
 {hero:'mira',skill:'attack',foe:'foe_ruin_bat',scenario:'enemy-down',mode:'normal'},
 {hero:'toma',skill:'attack',foe:'foe_dew_slime',scenario:'enemy-down',mode:'normal'},
 {hero:'toma',skill:'attack',foe:'foe_ember_slime',scenario:'enemy-down',mode:'normal'},
];
for(const {hero,skill,foe,scenario,mode,preroll} of cases)test(`unit A4 clip ${hero}-${skill}-${foe}-${scenario}-${mode}${preroll?'-hover':''}`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode==='osreduce'?'reduce':'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`tests/browser/fixtures/unit-a4.html?hero=${hero}&foe=${foe}&skill=${skill}&scenario=${scenario}&speed=${mode==='fast'?'fast':'normal'}&intensity=${mode==='reduced'?'reduced':'standard'}`);
 if(await page.locator('#start').count())await expect(page.locator('#start')).toBeEnabled();
 await expect.poll(()=>page.evaluate(h=>window.unitA4QA.frames()[h]?.[0]?.texture,hero),{timeout:15000}).toBe(`unit-pilot-${hero}`);
 await expect.poll(()=>page.evaluate(()=>window.unitA4QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe(`unit-pilot-${sheetOf[foe]}`);
 if(await page.locator('#start').count())await page.locator('#start').click();await page.locator(`#action-${skill}`).click();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await page.evaluate(()=>document.addEventListener('pointerdown',()=>{document.documentElement.dataset.unitA4Click=String(Date.now()/1000);},{capture:true,once:true}));
 const dir=info.outputPath('frames');mkdirSync(dir,{recursive:true});const cdp=await ctx.newCDPSession(page),stamps:string[]=[];
 cdp.on('Page.screencastFrame',f=>{const n=String(stamps.length).padStart(4,'0');writeFileSync(`${dir}/${n}.jpg`,Buffer.from(f.data,'base64'));stamps.push(`${n} ${f.metadata.timestamp}`);void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,everyNthFrame:1});await page.waitForTimeout(preroll??300);
 await page.locator(`#target-${await page.evaluate(()=>window.unitA4QA.target())}`).click();const committed=await page.evaluate(()=>localStorage.getItem('unit-a4-committed'));
 const click=Number(await page.locator('html').getAttribute('data-unit-a4-click'));expect(click).toBeGreaterThan(1e9);
 await expect(page.locator('#skip-turn')).toBeHidden();await page.waitForTimeout(300);await cdp.send('Page.stopScreencast');
 const actual=await page.evaluate(()=>window.unitA4QA.state());expect(actual).toEqual(await page.evaluate(()=>window.unitA4QA.expected()));
 expect(await page.evaluate(()=>localStorage.getItem('unit-a4-committed'))).toBe(committed);expect(actual.commands).toHaveLength(1);expect(stamps.length).toBeGreaterThan(6);
 writeFileSync(info.outputPath('name.txt'),`${hero}-${skill}-${foe}-${scenario}-${mode}${preroll?'-hover':''}`);writeFileSync(info.outputPath('stamps.txt'),`click ${click}\n${stamps.join('\n')}`);writeFileSync(info.outputPath('timing.json'),JSON.stringify(await page.evaluate(()=>window.unitA4QA.impacts),null,2));
 writeFileSync(info.outputPath('final-state.json'),JSON.stringify(actual,null,2));expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
