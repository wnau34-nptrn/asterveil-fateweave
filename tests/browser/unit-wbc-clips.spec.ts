import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test.skip(process.env.UNIT_WBC_CLIPS!=='1','separate real-clock capture only');
const sheetOf={foe_morvane:'morvane'} as const;
type Foe=keyof typeof sheetOf;
interface Clip{foe:Foe;intent:string;scenario:string}
// WB-C: every Morvane move on its real resolver turn (the hero's hit lands on the boss in every normal run, so hit is in each clip)
// and the enemy-down collapse. Real clock, 390x844 touch emulation in Chromium: not a physical phone.
const cases:Clip[]=[...['Six-Hand Rend','Severing Bolt','Fate Lash','Call the Court','Shadow Tide','Severed Crown'].map(intent=>({foe:'foe_morvane' as const,intent,scenario:'normal'})),{foe:'foe_morvane',intent:'Six-Hand Rend',scenario:'enemy-down'}];
const slug=(c:Clip)=>`${c.foe}-${c.intent.toLowerCase().replace(/ /g,'-')}-${c.scenario}-normal`;
for(const c of cases)test(`unit WB-C clip ${slug(c)}`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`tests/browser/fixtures/unit-a9.html?foe=${c.foe}&intent=${encodeURIComponent(c.intent)}&scenario=${c.scenario}`);
 if(await page.locator('#start').count())await expect(page.locator('#start')).toBeEnabled({timeout:20000});
 await expect.poll(()=>page.evaluate(()=>window.unitA9QA.frames().sefa?.[0]?.texture),{timeout:20000}).toBe('unit-pilot-sefa');
 await expect.poll(()=>page.evaluate(()=>window.unitA9QA.frames().f1?.[0]?.texture),{timeout:20000}).toBe(`unit-pilot-${sheetOf[c.foe]}`);
 if(await page.locator('#start').count())await page.locator('#start').click();await page.locator('#action-attack').click();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await page.evaluate(()=>document.addEventListener('pointerdown',()=>{document.documentElement.dataset.unitA9Click=String(Date.now()/1000);},{capture:true,once:true}));
 const dir=info.outputPath('frames');mkdirSync(dir,{recursive:true});const cdp=await ctx.newCDPSession(page),stamps:string[]=[];
 cdp.on('Page.screencastFrame',f=>{const n=String(stamps.length).padStart(4,'0');writeFileSync(`${dir}/${n}.jpg`,Buffer.from(f.data,'base64'));stamps.push(`${n} ${f.metadata.timestamp}`);void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,everyNthFrame:1});await page.waitForTimeout(300);
 await page.locator(`#target-${await page.evaluate(()=>window.unitA9QA.target())}`).click();const committed=await page.evaluate(()=>localStorage.getItem('unit-a9-committed'));
 const click=Number(await page.locator('html').getAttribute('data-unit-a9-click'));expect(click).toBeGreaterThan(1e9);
 await expect(page.locator('#skip-turn')).toBeHidden();await page.waitForTimeout(300);await cdp.send('Page.stopScreencast');
 const actual=await page.evaluate(()=>window.unitA9QA.state());expect(actual).toEqual(await page.evaluate(()=>window.unitA9QA.expected()));
 expect(await page.evaluate(()=>localStorage.getItem('unit-a9-committed'))).toBe(committed);expect(actual.commands).toHaveLength(1+await page.evaluate(()=>window.unitA9QA.prelude().length));expect(stamps.length).toBeGreaterThan(6);
 writeFileSync(info.outputPath('name.txt'),slug(c));writeFileSync(info.outputPath('stamps.txt'),`click ${click}\n${stamps.join('\n')}`);writeFileSync(info.outputPath('timing.json'),JSON.stringify(await page.evaluate(()=>window.unitA9QA.impacts),null,2));
 writeFileSync(info.outputPath('final-state.json'),JSON.stringify(actual,null,2));expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
