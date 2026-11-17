import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test.skip(process.env.WB_VFX_CLIPS!=='1','separate real-clock capture only');
// ART-VFX-WB-TRIO-001: every World Boss trio VFX move on its real resolver turn, plus the two charges' waiting holds and
// release, and Bash breaking Wing Gathering. Real clock, 390x844 touch emulation in Chromium: not a physical phone.
interface Clip{move:string;scenario:'normal'|'release'|'break'}
const cases:Clip[]=[...['Titan Gathering','Mountain Fall','Rift Quake','Fault Awakening','Wing Gust','Wing Gathering','Worldshard Dive','Sky Rend',
 'Severing Bolt','Fate Lash','Call the Court','Shadow Tide','Severed Crown'].map(move=>({move,scenario:'normal' as const})),
 {move:'Titan Gathering',scenario:'release'},{move:'Wing Gathering',scenario:'release'},{move:'Wing Gathering',scenario:'break'}];
const slug=(c:Clip)=>`${c.move.toLowerCase().replace(/ /g,'-')}-${c.scenario}`;
for(const c of cases)test(`WB VFX clip ${slug(c)}`,async({browser},info)=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 try{
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`tests/browser/fixtures/wb-vfx.html?move=${encodeURIComponent(c.move)}&scenario=${c.scenario}`);
 await page.waitForFunction(()=>window.wbVfxQA.atlasReady(),undefined,{timeout:30000});
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.locator(`#action-${await page.evaluate(()=>window.wbVfxQA.action())}`).click();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await page.waitForTimeout(1200);
 await page.evaluate(()=>document.addEventListener('pointerdown',()=>{document.documentElement.dataset.wbClick=String(Date.now()/1000);},{capture:true,once:true}));
 const dir=info.outputPath('frames');mkdirSync(dir,{recursive:true});const cdp=await ctx.newCDPSession(page),stamps:string[]=[];
 cdp.on('Page.screencastFrame',f=>{const n=String(stamps.length).padStart(4,'0');writeFileSync(`${dir}/${n}.jpg`,Buffer.from(f.data,'base64'));stamps.push(`${n} ${f.metadata.timestamp}`);void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,everyNthFrame:1});await page.evaluate(()=>window.wbVfxQA.record());await page.waitForTimeout(c.scenario==='release'?900:300);
 await page.locator(`#target-${await page.evaluate(()=>window.wbVfxQA.target())}`).click();
 const click=Number(await page.locator('html').getAttribute('data-wb-click'));expect(click).toBeGreaterThan(1e9);
 await expect(page.locator('#skip-turn')).toBeHidden({timeout:15000});
 // A performed charge leaves its waiting hold on screen: keep filming it.
 await page.waitForTimeout(c.scenario==='normal'&&/Gathering/.test(c.move)?1800:400);await cdp.send('Page.stopScreencast');
 expect(await page.evaluate(()=>window.wbVfxQA.state())).toEqual(await page.evaluate(()=>window.wbVfxQA.expected()));
 expect(stamps.length).toBeGreaterThan(6);
 const holds=(await page.evaluate(()=>window.wbVfxQA.painted())).filter(p=>p.hold);
 writeFileSync(info.outputPath('name.txt'),slug(c));writeFileSync(info.outputPath('stamps.txt'),`click ${click}\n${stamps.join('\n')}`);
 writeFileSync(info.outputPath('timing.json'),JSON.stringify(await page.evaluate(()=>window.wbVfxQA.impacts),null,2));
 writeFileSync(info.outputPath('holds.json'),JSON.stringify(holds,null,2));writeFileSync(info.outputPath('samples.json'),JSON.stringify(await page.evaluate(()=>window.wbVfxQA.samples())));expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
