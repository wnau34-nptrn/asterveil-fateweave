import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test.skip(process.env.UNIT_A6_CLIPS!=='1','separate real-clock capture only');
const sheetOf={foe_riftweaver:'riftweaver',foe_spore_puff:'sporepuff'} as const;
type Foe=keyof typeof sheetOf;
interface Clip{hero:'sefa'|'lio';skill:string;foe:Foe;scenario:string;mode:string;intent?:string}
const cases:Clip[]=[
 ...['normal','fast','reduced','osreduce'].map(mode=>({hero:'sefa' as const,skill:'attack',foe:'foe_riftweaver' as Foe,scenario:'normal',mode})),
 {hero:'sefa',skill:'backstab',foe:'foe_spore_puff',scenario:'normal',mode:'normal'},
 {hero:'sefa',skill:'knives',foe:'foe_riftweaver',scenario:'normal',mode:'normal'},
 {hero:'sefa',skill:'evade',foe:'foe_spore_puff',scenario:'normal',mode:'normal'},
 {hero:'sefa',skill:'decoy',foe:'foe_riftweaver',scenario:'normal',mode:'normal'},
 ...['normal','fast','reduced','osreduce'].map(mode=>({hero:'lio' as const,skill:'attack',foe:'foe_spore_puff' as Foe,scenario:'normal',mode})),
 {hero:'lio',skill:'valor',foe:'foe_riftweaver',scenario:'normal',mode:'normal'},
 {hero:'lio',skill:'dread',foe:'foe_spore_puff',scenario:'normal',mode:'normal'},
 {hero:'lio',skill:'finale',foe:'foe_riftweaver',scenario:'normal',mode:'normal'},
 {hero:'lio',skill:'note',foe:'foe_riftweaver',scenario:'normal',mode:'normal'},
 {hero:'lio',skill:'solo',foe:'foe_spore_puff',scenario:'normal',mode:'normal'},
 {hero:'sefa',skill:'attack',foe:'foe_riftweaver',scenario:'normal',mode:'normal',intent:'Rift Needle'},
 {hero:'sefa',skill:'attack',foe:'foe_riftweaver',scenario:'normal',mode:'normal',intent:'Ribbon Snare'},
 {hero:'sefa',skill:'attack',foe:'foe_spore_puff',scenario:'hurt',mode:'normal'},
 {hero:'lio',skill:'attack',foe:'foe_riftweaver',scenario:'down',mode:'normal'},
 {hero:'sefa',skill:'attack',foe:'foe_riftweaver',scenario:'enemy-down',mode:'normal'},
 {hero:'lio',skill:'attack',foe:'foe_spore_puff',scenario:'enemy-down',mode:'normal'},
];
for(const {hero,skill,foe,scenario,mode,preroll,intent} of cases as (Clip&{preroll?:number})[])test(`unit A6 clip ${hero}-${skill}-${foe}-${scenario}-${mode}${intent?'-'+intent.toLowerCase().replace(/ /g,'-'):''}`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode==='osreduce'?'reduce':'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`tests/browser/fixtures/unit-a6.html?hero=${hero}&foe=${foe}&skill=${skill}&scenario=${scenario}&speed=${mode==='fast'?'fast':'normal'}&intensity=${mode==='reduced'?'reduced':'standard'}${intent?'&intent='+intent:''}`);
 if(await page.locator('#start').count())await expect(page.locator('#start')).toBeEnabled();
 await expect.poll(()=>page.evaluate(h=>window.unitA6QA.frames()[h]?.[0]?.texture,hero),{timeout:15000}).toBe(`unit-pilot-${hero}`);
 await expect.poll(()=>page.evaluate(()=>window.unitA6QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe(`unit-pilot-${sheetOf[foe]}`);
 if(await page.locator('#start').count())await page.locator('#start').click();await page.locator(`#action-${skill}`).click();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await page.evaluate(()=>document.addEventListener('pointerdown',()=>{document.documentElement.dataset.unitA6Click=String(Date.now()/1000);},{capture:true,once:true}));
 const dir=info.outputPath('frames');mkdirSync(dir,{recursive:true});const cdp=await ctx.newCDPSession(page),stamps:string[]=[];
 cdp.on('Page.screencastFrame',f=>{const n=String(stamps.length).padStart(4,'0');writeFileSync(`${dir}/${n}.jpg`,Buffer.from(f.data,'base64'));stamps.push(`${n} ${f.metadata.timestamp}`);void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,everyNthFrame:1});await page.waitForTimeout(preroll??300);
 await page.locator(`#target-${await page.evaluate(()=>window.unitA6QA.target())}`).click();const committed=await page.evaluate(()=>localStorage.getItem('unit-a6-committed'));
 const click=Number(await page.locator('html').getAttribute('data-unit-a6-click'));expect(click).toBeGreaterThan(1e9);
 await expect(page.locator('#skip-turn')).toBeHidden();await page.waitForTimeout(300);await cdp.send('Page.stopScreencast');
 const actual=await page.evaluate(()=>window.unitA6QA.state());expect(actual).toEqual(await page.evaluate(()=>window.unitA6QA.expected()));
 expect(await page.evaluate(()=>localStorage.getItem('unit-a6-committed'))).toBe(committed);expect(actual.commands).toHaveLength(1+await page.evaluate(()=>window.unitA6QA.prelude().length));expect(stamps.length).toBeGreaterThan(6);
 writeFileSync(info.outputPath('name.txt'),`${hero}-${skill}-${foe}-${scenario}-${mode}${intent?'-'+intent.toLowerCase().replace(/ /g,'-'):''}`);writeFileSync(info.outputPath('stamps.txt'),`click ${click}\n${stamps.join('\n')}`);writeFileSync(info.outputPath('timing.json'),JSON.stringify(await page.evaluate(()=>window.unitA6QA.impacts),null,2));
 writeFileSync(info.outputPath('final-state.json'),JSON.stringify(actual,null,2));expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
