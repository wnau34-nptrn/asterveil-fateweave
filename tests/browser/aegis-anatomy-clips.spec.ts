import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {stageTiming} from '../../src/ui/battle-playback';
// Visual QA capture for the Aegis anatomy fix (docs/validation/aegis-anatomy-2026-10-29). Runs unchanged against the
// code before and after the fix: fixed-clock samples of the knight at play size, plus a real-clock video of the stage.
test.skip(process.env.AEGIS_ANATOMY_CLIPS!=='1','separate visual QA capture only');
const out=process.env.AEGIS_ANATOMY_OUT??'test-results/aegis-anatomy';
type Case={skill:string;scenario:string;intent:string;mode:'normal'|'fast'|'reduced'|'osreduce';w:number;h:number;focus:'hero'|'enemy'};
const c=(skill:string,scenario:string,intent:string,mode:Case['mode']='normal',w=390,h=844,focus:Case['focus']='hero'):Case=>({skill,scenario,intent,mode,w,h,focus});
const cases:Case[]=[
 ...(['normal','fast','reduced','osreduce'] as const).map(m=>c('attack','normal','Rift Bolt',m)),
 c('attack','normal','Rift Bolt','normal',320,568),c('attack','normal','Rift Bolt','normal',1366,1000),
 c('bash','normal','Rift Bolt'),c('guard','normal','Crushing Blow'),
 c('attack','normal','Crushing Blow','normal',390,844,'enemy'),c('guard','normal','Crushing Blow','normal',390,844,'enemy'),
 c('guard','counter','Crushing Blow','normal',390,844,'enemy'),c('attack','down','Crushing Blow','normal',390,844,'enemy'),
];
const name=(k:Case)=>`${k.skill}-${k.scenario}-${k.intent.replaceAll(' ','')}-${k.focus}-${k.mode}-${k.w}`;
const query=(k:Case)=>`skill=${k.skill}&scenario=${k.scenario}&intent=${encodeURIComponent(k.intent)}&speed=${k.mode==='fast'?'fast':'normal'}&intensity=${k.mode==='reduced'?'reduced':'standard'}`;
async function ready(page:Page,k:Case){
 await page.goto(`tests/browser/fixtures/unit-a2.html?${query(k)}`);
 await expect.poll(()=>page.evaluate(()=>window.unitA2QA.cached()),{timeout:15000}).toContain('unit-pilot-vargoth');
 // Before the fix the knight also loads its A2 atlas; after it, it is held on the static seed.
 await expect.poll(()=>page.evaluate(()=>window.unitA2QA.cached()),{timeout:4000}).toContain('unit-pilot-aegis').catch(()=>undefined);
 await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 if(await page.locator('#start').count())await page.locator('#start').click();
}
for(const k of cases)test(`aegis anatomy capture ${name(k)}`,async({browser})=>{
 const dir=`${out}/${name(k)}`;mkdirSync(dir,{recursive:true});
 const motion=k.mode==='osreduce'?'reduce':'no-preference';
 // 1. Fixed clock: the same instants before and after, cropped around the knight at its rendered size.
 const ctx=await browser.newContext({viewport:{width:k.w,height:k.h},reducedMotion:motion});
 try{
  const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();await ready(page,k);await page.clock.pauseAt(new Date(Date.now()+100000));
  await page.locator(`#action-${k.skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.unitA2QA.target())}`).click();
  const committed=await page.evaluate(()=>localStorage.getItem('unit-a2-committed'));
  const turns=await page.evaluate(()=>window.unitA2QA.turns());
  const ends=turns.map(t=>stageTiming(t,k.mode==='fast').end);
  const start=k.focus==='enemy'?ends[0]!:0,span=k.focus==='enemy'?ends[1]??600:ends[0]!;
  // Full-viewport stills; the montage crops before/after with one shared box around the knight's slot.
  const anchor=(await page.evaluate(()=>window.unitA2QA.alchemyPoint())).projectileActual;
  const samples:{ms:number;frames:unknown}[]=[];let t=0;
  if(start)await page.clock.runFor(start);
  for(let ms=0;ms<=span+120;ms+=40){
   if(ms)await page.clock.runFor(40);t=ms;
   await page.screenshot({path:`${dir}/t${String(ms).padStart(4,'0')}.png`});
   samples.push({ms,frames:await page.evaluate(()=>window.unitA2QA.frames().guardian)});
  }
  await page.clock.runFor(4000);
  const state=await page.evaluate(()=>window.unitA2QA.state());expect(state).toEqual(await page.evaluate(()=>window.unitA2QA.expected()));
  expect(await page.evaluate(()=>localStorage.getItem('unit-a2-committed'))).toBe(committed);
  writeFileSync(`${dir}/samples.json`,JSON.stringify({case:k,anchor,start,span,last:t,samples,commands:state.commands.length,errors},null,1));
  expect(errors).toEqual([]);
 }finally{await ctx.close();}
 // 2. Real clock CDP screencast of the whole committed stage (frames + host timestamps, encoded later as VFR).
 const vctx=await browser.newContext({viewport:{width:k.w,height:k.h},reducedMotion:motion});
 try{
  const page=await vctx.newPage();await ready(page,k);await page.waitForTimeout(300);
  await page.locator(`#action-${k.skill}`).click();
  const cdp=await vctx.newCDPSession(page),stamps:string[]=[];mkdirSync(`${dir}/screencast`,{recursive:true});
  cdp.on('Page.screencastFrame',f=>{const n=String(stamps.length).padStart(4,'0');writeFileSync(`${dir}/screencast/${n}.jpg`,Buffer.from(f.data,'base64'));stamps.push(`${n} ${f.metadata.timestamp}`);void cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});});
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,everyNthFrame:1});await page.waitForTimeout(300);
  await page.locator(`#target-${await page.evaluate(()=>window.unitA2QA.target())}`).click();
  await expect(page.locator('#skip-turn')).toBeHidden({timeout:15000});await page.waitForTimeout(400);await cdp.send('Page.stopScreencast');
  writeFileSync(`${dir}/screencast/stamps.txt`,stamps.join('\n'));
  expect(await page.evaluate(()=>window.unitA2QA.state())).toEqual(await page.evaluate(()=>window.unitA2QA.expected()));
 }finally{await vctx.close();}
});
