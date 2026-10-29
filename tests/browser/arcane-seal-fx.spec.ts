import {test,expect} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';

test.skip(process.env.PLAYWRIGHT_PAGES==='true','source-only arcane seal gate runs explicitly in CI/Pages');
test.use({reducedMotion:'no-preference'});
const skills=['mark','sigil','storm','dispel'];
const open=async(page:import('@playwright/test').Page,query:string)=>{
 await page.goto(`tests/browser/fixtures/arcane-seal.html?${query}`);const start=page.locator('#start');if(await start.isVisible())await start.click();
};
for(const skill of skills)test(`arcane seal ${skill}: prepare at the hand, contact on real recipients, skip preserves the result`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
  const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-28T00:00:00Z')});
  await open(page,`skill=${skill}&scenario=energy`);
  await page.clock.pauseAt(new Date('2026-10-28T01:00:00Z'));
  const turn=(await page.evaluate(()=>window.sealQA.sequence()))[0]!,timing=stageTiming(turn,false);
  await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.sealQA.target())}`).click();
  const saved=await page.evaluate(()=>localStorage.getItem('seal-committed'));
  await page.clock.runFor(timing.contact-1);
  const prep=await page.evaluate(()=>window.sealQA.painted());expect(prep).toHaveLength(1);expect(prep[0]!.frame).toBe(`${skill}_prepare`);
  await page.clock.runFor(61);
  const cues=await page.evaluate(()=>window.sealQA.cues()),peaks=(await page.evaluate(()=>window.sealQA.painted())).filter(p=>p.frame.endsWith('_peak'));
  expect(peaks).toHaveLength(cues.length);expect(await page.evaluate(()=>window.sealQA.rings())).toBe(0);
  expect((await page.evaluate(()=>window.sealQA.painted())).some(p=>p.frame.endsWith('_prepare'))).toBe(false);
  await page.clock.runFor(120);
  const settles=(await page.evaluate(()=>window.sealQA.painted())).filter(p=>p.frame.endsWith('_settle'));
  expect(settles.length).toBe(cues.filter(c=>c.applied&&c.outcome!=='dodged').length);
  await page.locator('#skip-turn').click();await page.clock.runFor(32);
  expect(await page.evaluate(()=>window.sealQA.painted())).toEqual([]);
  expect(await page.evaluate(()=>localStorage.getItem('seal-committed'))).toBe(saved);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
test('sigil settles (taut links) only when the bind really applied',async({page})=>{
 await page.clock.install({time:new Date('2026-10-28T00:00:00Z')});await page.setViewportSize({width:390,height:844});
 await open(page,'skill=sigil');await page.clock.pauseAt(new Date('2026-10-28T01:00:00Z'));
 await page.evaluate(()=>window.sealQA.stop());
 await page.locator('#action-sigil').click();await page.locator(`#target-${await page.evaluate(()=>window.sealQA.target())}`).click();
 await page.clock.runFor(1500);
 expect(await page.evaluate(()=>window.sealQA.cues().every(c=>!c.applied))).toBe(true);
});
for(const skill of skills)test(`arcane seal ${skill}: OS reduced motion is immediate and static`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-28T00:00:00Z')});
  await open(page,`skill=${skill}`);await page.clock.pauseAt(new Date('2026-10-28T01:00:00Z'));
  await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.sealQA.target())}`).click();
  const still=await page.evaluate(()=>window.sealQA.painted());expect(still.length).toBeGreaterThan(0);
  expect(still.every(p=>p.frame.endsWith('_peak'))).toBe(true);
  await page.clock.runFor(90);expect(await page.evaluate(()=>window.sealQA.painted())).toEqual(still);
 }finally{await ctx.close();}
});
test('storm paints a local copy on every foe and settles once per foe',async({page})=>{
 await page.clock.install({time:new Date('2026-10-28T00:00:00Z')});await page.setViewportSize({width:390,height:844});
 await open(page,'skill=storm');await page.clock.pauseAt(new Date('2026-10-28T01:00:00Z'));
 const turn=(await page.evaluate(()=>window.sealQA.sequence()))[0]!,timing=stageTiming(turn,false);
 await page.locator('#action-storm').click();await page.locator(`#target-${await page.evaluate(()=>window.sealQA.target())}`).click();
 await page.clock.runFor(timing.contact+80);
 const paint=await page.evaluate(()=>window.sealQA.painted());
 expect(paint.filter(p=>p.frame==='storm_peak').length).toBe(4);expect(paint.filter(p=>p.frame==='storm_settle').length).toBe(4);
});
