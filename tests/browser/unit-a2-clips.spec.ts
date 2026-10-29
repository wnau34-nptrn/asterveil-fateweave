import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test.skip(process.env.UNIT_A2_CLIPS!=='1','separate real-clock capture only');
const cases=[...['attack','bash','guard'].flatMap(skill=>['normal','fast','reduced','osreduce'].map(mode=>({skill,mode,intent:'Rift Bolt',scenario:'normal'}))),
 ...['normal','fast','reduced','osreduce'].map(mode=>({skill:'attack',mode,intent:'Crushing Blow',scenario:'normal'})),
 ...['rally','challenge','bulwark','rouse'].map(skill=>({skill,mode:'normal',intent:'Rift Bolt',scenario:skill==='rouse'?'wounded':'normal'})),
 ...['Shield Smash','Mace Swing'].map(intent=>({skill:'attack',mode:'normal',intent,scenario:'normal'})),
 ...[{skill:'guard',scenario:'counter',intent:'Crushing Blow'},{skill:'bash',scenario:'reflect',intent:'Rift Bolt'},{skill:'attack',scenario:'enemy-down',intent:'Rift Bolt'},{skill:'revive',scenario:'revive',intent:'Rift Bolt'}].map(c=>({...c,mode:'normal'}))];
for(const {skill,mode,intent,scenario} of cases)test(`unit A2 clip ${skill}-${intent.replaceAll(' ','')}-${scenario}-${mode}`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode==='osreduce'?'reduce':'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`tests/browser/fixtures/unit-a2.html?skill=${skill}&intent=${encodeURIComponent(intent)}&scenario=${scenario}&speed=${mode==='fast'?'fast':'normal'}&intensity=${mode==='reduced'?'reduced':'standard'}`);
 if(await page.locator('#start').count())await expect(page.locator('#start')).toBeEnabled();
 // Aegis is on anatomy hold (static seed); only the guard atlas loads.
 await expect.poll(()=>page.evaluate(()=>window.unitA2QA.frames().f1?.[0]?.texture),{timeout:15000}).toBe('unit-pilot-vargoth');
 if(await page.locator('#start').count())await page.locator('#start').click();await page.locator(`#action-${skill}`).click();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await page.evaluate(()=>document.addEventListener('pointerdown',()=>{document.documentElement.dataset.unitA2Click=String(Date.now()/1000);},{capture:true,once:true}));
 const dir=info.outputPath('frames');mkdirSync(dir,{recursive:true});const cdp=await ctx.newCDPSession(page),stamps:string[]=[];
 cdp.on('Page.screencastFrame',f=>{const n=String(stamps.length).padStart(4,'0');writeFileSync(`${dir}/${n}.jpg`,Buffer.from(f.data,'base64'));stamps.push(`${n} ${f.metadata.timestamp}`);void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,everyNthFrame:1});await page.waitForTimeout(300);
 await page.locator(`#target-${await page.evaluate(()=>window.unitA2QA.target())}`).click();const committed=await page.evaluate(()=>localStorage.getItem('unit-a2-committed'));
 const click=Number(await page.locator('html').getAttribute('data-unit-a2-click'));expect(click).toBeGreaterThan(1e9);
 await expect(page.locator('#skip-turn')).toBeHidden();await page.waitForTimeout(300);await cdp.send('Page.stopScreencast');
 const actual=await page.evaluate(()=>window.unitA2QA.state());expect(actual).toEqual(await page.evaluate(()=>window.unitA2QA.expected()));
 expect(await page.evaluate(()=>localStorage.getItem('unit-a2-committed'))).toBe(committed);expect(actual.commands).toHaveLength(scenario==='revive'?3:1);expect(stamps.length).toBeGreaterThan(6);
 writeFileSync(info.outputPath('stamps.txt'),`click ${click}\n${stamps.join('\n')}`);writeFileSync(info.outputPath('timing.json'),JSON.stringify(await page.evaluate(()=>window.unitA2QA.impacts),null,2));
 writeFileSync(info.outputPath('final-state.json'),JSON.stringify(actual,null,2));expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
