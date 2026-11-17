/* global window */
// Supplemental 390px QA for the three revised moves; run against the local Vite server.
import { chromium } from '@playwright/test';
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('..',import.meta.url));
const out=resolve(root,'docs/validation/wb-vfx-revision');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const rows=[];
try{for(const mode of ['fast','reduce'])for(const move of ['Severing Bolt','Shadow Tide','Wing Gathering']){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode==='reduce'?'reduce':'no-preference'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text()+' '+m.location().url);});page.on('response',r=>{if(r.status()>=400)process.stdout.write('HTTP '+r.status()+' '+r.url()+'\n');});
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});
 const url=new URL('tests/browser/fixtures/wb-vfx.html?move='+encodeURIComponent(move)+'&speed='+(mode==='fast'?'fast':'normal'),process.env.WB_VFX_QA_URL??'http://127.0.0.1:5173/').href;await page.goto(url);await page.waitForFunction(()=>window.wbVfxQA.atlasReady());
 if(await page.locator('#start').isVisible())await page.locator('#start').click();await page.clock.runFor(1500);await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
 const title=await page.title();assert(page.url().includes('/fixtures/wb-vfx.html'));assert((await page.locator('body').innerText()).length>100);assert.equal(await page.locator('vite-error-overlay').count(),0);
 await page.locator('#action-'+await page.evaluate(()=>window.wbVfxQA.action())).click();await page.locator('#target-'+await page.evaluate(()=>window.wbVfxQA.target())).click();
 const samples=[];for(let t=0;t<4200;t+=40){await page.clock.runFor(40);samples.push(await page.evaluate(()=>({items:window.wbVfxQA.painted().filter(p=>p.visible&&p.alpha>.05),plates:window.wbVfxQA.platesOnTop()})));}
 const slug=move.toLowerCase().replaceAll(' ','-'),cues=await page.evaluate(()=>window.wbVfxQA.cues());
 const most=samples.map(s=>s.items.filter(p=>p.frame===slug+'_peak')).reduce((a,b)=>b.length>a.length?b:a);assert.equal(most.length,cues.length);
 if(mode==='reduce')assert(!samples.some(s=>s.items.some(p=>p.prepare)));
 for(const sample of samples)for(const top of Object.values(sample.plates))assert.equal(top,true);
 assert.deepEqual(await page.evaluate(()=>window.wbVfxQA.state()),await page.evaluate(()=>window.wbVfxQA.expected()));assert.deepEqual(errors,[]);
 if(move==='Wing Gathering'){const hold=(await page.evaluate(()=>window.wbVfxQA.painted())).filter(p=>p.hold);assert.deepEqual(hold.map(p=>p.hold),['breakable']);}
 rows.push({move,mode,url,title,viewport:[390,844],meaningfulPage:true,frameworkOverlay:false,consoleErrors:errors,ignoredConsoleError:'Only /favicon.ico 404 (fixture has no icon) is excluded; no game asset errors allowed',peakInstances:most.length,platesOnTop:true,resolverStateMatches:true});
 process.stdout.write('PASS '+move+' '+mode+'\n');await context.close();
}}finally{await browser.close();}
writeFileSync(out+'/modes.json',JSON.stringify({browser:'system Chromium, touch emulation; not a physical phone',browserPlugin:'skill listed but no callable Browser JS tool; project Playwright fallback',cases:rows},null,2)+'\n');
