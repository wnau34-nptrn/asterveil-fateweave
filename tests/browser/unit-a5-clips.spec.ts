import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test.skip(process.env.UNIT_A5_CLIPS!=='1','separate real-clock capture only');
const sheetOf={foe_tusker:'tusker',foe_stalker:'stalker',foe_thorn_beetle:'beetle'} as const;
type Foe=keyof typeof sheetOf;
interface Clip{hero:'garran'|'brann';skill:string;foe:Foe;scenario:string;mode:string;intent?:string}
const cases:Clip[]=[
 ...['normal','fast','reduced','osreduce'].map(mode=>({hero:'garran' as const,skill:'attack',foe:'foe_tusker' as Foe,scenario:'normal',mode})),
 {hero:'garran',skill:'pierce',foe:'foe_stalker',scenario:'normal',mode:'normal'},
 {hero:'garran',skill:'warcry',foe:'foe_thorn_beetle',scenario:'normal',mode:'normal'},
 {hero:'garran',skill:'spearwall',foe:'foe_stalker',scenario:'normal',mode:'normal'},
 {hero:'garran',skill:'attack',foe:'foe_tusker',scenario:'normal',mode:'normal',intent:'Stampede'},
 ...['normal','fast','reduced','osreduce'].map(mode=>({hero:'brann' as const,skill:'attack',foe:'foe_thorn_beetle' as Foe,scenario:'normal',mode})),
 {hero:'brann',skill:'slam',foe:'foe_stalker',scenario:'normal',mode:'normal'},
 {hero:'brann',skill:'taunt',foe:'foe_tusker',scenario:'normal',mode:'normal'},
 {hero:'brann',skill:'stonearmor',foe:'foe_thorn_beetle',scenario:'normal',mode:'normal'},
 {hero:'garran',skill:'attack',foe:'foe_stalker',scenario:'hurt',mode:'normal'},
 {hero:'brann',skill:'attack',foe:'foe_tusker',scenario:'down',mode:'normal'},
 {hero:'garran',skill:'attack',foe:'foe_tusker',scenario:'enemy-down',mode:'normal'},
 {hero:'brann',skill:'attack',foe:'foe_stalker',scenario:'enemy-down',mode:'normal'},
 {hero:'garran',skill:'attack',foe:'foe_thorn_beetle',scenario:'enemy-down',mode:'normal'},
];
for(const {hero,skill,foe,scenario,mode,preroll,intent} of cases as (Clip&{preroll?:number})[])test(`unit A5 clip ${hero}-${skill}-${foe}-${scenario}-${mode}${intent?'-stampede':''}`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode==='osreduce'?'reduce':'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`tests/browser/fixtures/unit-a5.html?hero=${hero}&foe=${foe}&skill=${skill}&scenario=${scenario}&speed=${mode==='fast'?'fast':'normal'}&intensity=${mode==='reduced'?'reduced':'standard'}${intent?'&intent='+intent:''}`);
 if(await page.locator('#start').count())await expect(page.locator('#start')).toBeEnabled();
 await expect.poll(()=>page.evaluate(h=>window.unitA5QA.frames()[h]?.[0]?.texture,hero),{timeout:15000}).toBe(`unit-pilot-${hero}`);
 await expect.poll(()=>page.evaluate(()=>window.unitA5QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe(`unit-pilot-${sheetOf[foe]}`);
 if(await page.locator('#start').count())await page.locator('#start').click();await page.locator(`#action-${skill}`).click();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await page.evaluate(()=>document.addEventListener('pointerdown',()=>{document.documentElement.dataset.unitA5Click=String(Date.now()/1000);},{capture:true,once:true}));
 const dir=info.outputPath('frames');mkdirSync(dir,{recursive:true});const cdp=await ctx.newCDPSession(page),stamps:string[]=[];
 cdp.on('Page.screencastFrame',f=>{const n=String(stamps.length).padStart(4,'0');writeFileSync(`${dir}/${n}.jpg`,Buffer.from(f.data,'base64'));stamps.push(`${n} ${f.metadata.timestamp}`);void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,everyNthFrame:1});await page.waitForTimeout(preroll??300);
 await page.locator(`#target-${await page.evaluate(()=>window.unitA5QA.target())}`).click();const committed=await page.evaluate(()=>localStorage.getItem('unit-a5-committed'));
 const click=Number(await page.locator('html').getAttribute('data-unit-a5-click'));expect(click).toBeGreaterThan(1e9);
 await expect(page.locator('#skip-turn')).toBeHidden();await page.waitForTimeout(300);await cdp.send('Page.stopScreencast');
 const actual=await page.evaluate(()=>window.unitA5QA.state());expect(actual).toEqual(await page.evaluate(()=>window.unitA5QA.expected()));
 expect(await page.evaluate(()=>localStorage.getItem('unit-a5-committed'))).toBe(committed);expect(actual.commands).toHaveLength(1);expect(stamps.length).toBeGreaterThan(6);
 writeFileSync(info.outputPath('name.txt'),`${hero}-${skill}-${foe}-${scenario}-${mode}${intent?'-stampede':''}`);writeFileSync(info.outputPath('stamps.txt'),`click ${click}\n${stamps.join('\n')}`);writeFileSync(info.outputPath('timing.json'),JSON.stringify(await page.evaluate(()=>window.unitA5QA.impacts),null,2));
 writeFileSync(info.outputPath('final-state.json'),JSON.stringify(actual,null,2));expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
