import {test,expect} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';

test.skip(process.env.PLAYWRIGHT_PAGES==='true','source-only command VFX gate runs explicitly in CI/Pages');
test.use({reducedMotion:'no-preference'});
const skills=['taunt','challenge','warcry'] as const;
const peaks={taunt:['taunt_pulse','taunt_motes'],challenge:['challenge_crest','challenge_thread'],warcry:['warcry_cone']} as const;
const settle={taunt:'taunt_settle',challenge:'challenge_settle',warcry:'warcry_wisps'} as const;
const open=async(page:import('@playwright/test').Page,query:string)=>{
 await page.goto(`tests/browser/fixtures/command-fx.html?${query}`);const start=page.locator('#start');if(await start.isVisible())await start.click();
};
const cast=async(page:import('@playwright/test').Page,skill:string)=>{await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.commandQA.target())}`).click();};
for(const skill of skills)test(`command ${skill}: prepare on the caster, peak layers on real anchors, settle, skip preserves the result`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
  const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});
  await open(page,`skill=${skill}`);await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
  const turn=(await page.evaluate(()=>window.commandQA.sequence()))[0]!,timing=stageTiming(turn,false);
  await cast(page,skill);const saved=await page.evaluate(()=>localStorage.getItem('command-committed'));
  await page.clock.runFor(timing.contact-1);
  const prep=await page.evaluate(()=>window.commandQA.painted());expect(prep).toHaveLength(1);expect(prep[0]!.frame).toBe(`${skill}_prepare`);
  await page.clock.runFor(61);
  const paint=await page.evaluate(()=>window.commandQA.painted()).then(p=>p.map(i=>i.frame));
  for(const frame of peaks[skill])expect(paint.filter(f=>f===frame)).toHaveLength(1);
  expect(paint.some(f=>f.endsWith('_prepare'))).toBe(false);expect(paint).not.toContain('warcry_impact');
  expect(await page.evaluate(()=>window.commandQA.rings())).toBe(0);
  await page.clock.runFor(200);
  expect((await page.evaluate(()=>window.commandQA.painted())).map(p=>p.frame)).toContain(settle[skill]);
  await page.locator('#skip-turn').click();await page.clock.runFor(600);
  expect((await page.evaluate(()=>window.commandQA.painted())).filter(p=>p.frame!=='warcry_impact')).toEqual([]);
  expect(await page.evaluate(()=>localStorage.getItem('command-committed'))).toBe(saved);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
test('challenge draws one thread, to the actual selected foe only',async({page})=>{
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.setViewportSize({width:390,height:844});
 await open(page,'skill=challenge');await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
 const turn=(await page.evaluate(()=>window.commandQA.sequence()))[0]!,timing=stageTiming(turn,false);
 await cast(page,'challenge');await page.clock.runFor(timing.contact+90);
 const cue=(await page.evaluate(()=>window.commandQA.cues()))[0]!;expect(cue.kind).toBe('cast');
 const paint=await page.evaluate(()=>window.commandQA.painted()),threads=paint.filter(p=>p.frame==='challenge_thread');expect(threads).toHaveLength(1);
 const start=await page.evaluate(id=>window.commandQA.point(id,'shield'),cue.sourceId),end=await page.evaluate(id=>window.commandQA.point(id,'foe'),cue.targetId);
 expect(Math.abs(threads[0]!.x-start.x)).toBeLessThan(1.5);expect(Math.abs(threads[0]!.y-start.y)).toBeLessThan(1.5);
 expect(end.x).toBeGreaterThan(start.x);expect(threads[0]!.width).toBeGreaterThan(40);
});
test('war cry draws impacts only for real counters, on the struck-back foe',async({page})=>{
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.setViewportSize({width:390,height:844});
 await open(page,'skill=warcry');await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
 const turns=await page.evaluate(()=>window.commandQA.sequence()),counters=await page.evaluate(()=>window.commandQA.cues().filter(c=>c.kind==='counter'));
 expect(counters.length).toBeGreaterThan(0);
 await cast(page,'warcry');
 let seen=0,elapsed=0,soFar=0;
 for(const t of turns){const timing=stageTiming(t,false);
  const has=t.events.some(e=>e.type==='counter'&&e.text==='War cry counter.');
  await page.clock.runFor(Math.max(1,timing.contact+70-elapsed));elapsed=0;
  const impacts=(await page.evaluate(()=>window.commandQA.painted())).filter(p=>p.frame==='warcry_impact');
  if(has){soFar++;expect(impacts.length).toBeGreaterThan(0);seen+=impacts.length;}else if(!soFar)expect(impacts).toHaveLength(0);
  await page.clock.runFor(Math.max(0,timing.end-timing.contact-70));
 }
 expect(seen).toBeGreaterThanOrEqual(counters.length);
});
for(const skill of skills)test(`command ${skill}: OS reduced motion is immediate and static`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});
  await open(page,`skill=${skill}`);await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
  await cast(page,skill);
  const still=await page.evaluate(()=>window.commandQA.painted());expect(still.length).toBeGreaterThan(0);
  expect(still.every(p=>(peaks[skill] as readonly string[]).includes(p.frame)||p.frame==='warcry_impact')).toBe(true);
  await page.clock.runFor(90);expect(await page.evaluate(()=>window.commandQA.painted())).toEqual(still);
 }finally{await ctx.close();}
});
