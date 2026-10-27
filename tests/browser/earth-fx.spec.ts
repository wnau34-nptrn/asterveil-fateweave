import {test,expect} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';

test.skip(process.env.PLAYWRIGHT_PAGES==='true','source-only earth gate runs explicitly in CI/Pages');
const skills=['bash','slam','quake','tremor'];
for(const skill of skills)test(`earth ${skill} real flight/contact, rear layer and skip preserve result`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  try{
    const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});
    await page.goto(`tests/browser/fixtures/earth.html?skill=${skill}`);await page.locator('#start').click();
    await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
    const turn=(await page.evaluate(()=>window.earthQA.sequence()))[0]!,timing=stageTiming(turn,false);
    await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.earthQA.target())}`).click();
    const saved=await page.evaluate(()=>localStorage.getItem('earth-committed'));
    await page.clock.runFor(timing.contact-1);
    const prep=await page.evaluate(()=>window.earthQA.painted());expect(prep).toHaveLength(1);expect(prep[0]!.frame.endsWith('_prepare')).toBe(true);
    await page.clock.runFor(61);
    const peaks=(await page.evaluate(()=>window.earthQA.painted())).filter(p=>p.frame.endsWith('_peak'));
    const cues=await page.evaluate(()=>window.earthQA.cues());expect(peaks).toHaveLength(cues.length);
    for(const cue of cues){const point=await page.evaluate(id=>window.earthQA.point(id),cue.targetId);
      expect(peaks.some(p=>Math.abs(p.x-point.x)<.3&&Math.abs(p.y-point.y)<.3)).toBe(true);}
    expect(await page.evaluate(()=>window.earthQA.rings())).toBe(0);expect(await page.evaluate(()=>window.earthQA.behindUnits())).toBe(true);
    await page.clock.runFor(160);expect((await page.evaluate(()=>window.earthQA.painted())).some(p=>p.frame.endsWith('_tail')&&p.alpha>.2)).toBe(true);
    await page.locator('#skip-turn').click();await page.clock.runFor(32);
    expect(await page.evaluate(()=>window.earthQA.painted())).toEqual([]);
    expect(await page.evaluate(()=>localStorage.getItem('earth-committed'))).toBe(saved);expect(errors).toEqual([]);
  }finally{await ctx.close();}
});
for(const skill of skills)test(`earth ${skill} OS reduced motion is immediate and static`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  try{
    const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});
    await page.goto(`tests/browser/fixtures/earth.html?skill=${skill}`);await page.locator('#start').click();
    await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
    await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.earthQA.target())}`).click();
    const still=await page.evaluate(()=>window.earthQA.painted());expect(still.length).toBeGreaterThan(0);
    expect(await page.evaluate(()=>window.earthQA.rings())).toBe(0);
    await page.clock.runFor(90);expect(await page.evaluate(()=>window.earthQA.painted())).toEqual(still);
  }finally{await ctx.close();}
});
for(const [skill,scenario,count] of [
 ['bash','energy',1],['bash','reflect',1],['bash','unstoppable',1],['bash','steadfast',1],['bash','retribution',1],['bash','down',1],
 ['slam','incoming',1],['slam','runequake',2],['quake','backonly',2],['quake','skyhammer',2],['quake','skyfull',2],['quake','skyone',2],['quake','frontdown',2],
 ['tremor','backonly',2],['tremor','redirect',2],['tremor','sourcedown',2],['tremor','targetdown',2],
] as const)test(`earth ${skill}/${scenario} paints only actual contact and healing`,async({page})=>{
 await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});await page.setViewportSize({width:390,height:844});
 await page.goto(`tests/browser/fixtures/earth.html?skill=${skill}&scenario=${scenario}`);
 const start=page.locator('#start');if(await start.isVisible())await start.click();await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
 const cues=await page.evaluate(()=>window.earthQA.preview(0));expect(cues).toHaveLength(count);await page.clock.runFor(70);
 expect((await page.evaluate(()=>window.earthQA.painted())).filter(p=>p.frame.endsWith('_peak'))).toHaveLength(count);
 // Down captions keep the existing death ring; earth contact itself adds no ring.
 const deaths=await page.evaluate(()=>window.earthQA.sequence()[0]!.events.filter(e=>e.type==='down').length);
 expect(await page.evaluate(()=>window.earthQA.rings())).toBe(deaths);
 const heals=await page.evaluate(()=>window.earthQA.heals()),paint=await page.evaluate(()=>window.earthQA.painted('healing-fx'));
 expect(paint.filter(p=>p.frame==='heal_peak'&&!p.rim)).toHaveLength(heals.length?1:0);
 if(scenario==='skyhammer')expect(heals).toHaveLength(2);if(scenario==='skyfull')expect(heals).toHaveLength(0);if(scenario==='skyone')expect(heals.map(e=>e.amount)).toEqual([1]);
 await page.evaluate(()=>window.earthQA.stop());expect(await page.evaluate(()=>window.earthQA.painted())).toEqual([]);
});
for(const action of ['load','resize','hidden','osreduce'])test(`earth flight ${action} cleanup cannot replay a committed command`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  try{
    const page=await ctx.newPage();await page.goto('tests/browser/fixtures/earth.html?skill=quake&speed=fast&intensity=reduced');
    await page.locator('#start').click();await page.locator('#action-quake').click();await page.locator('#target-enemies-f1').click();
    const saved=await page.evaluate(()=>localStorage.getItem('earth-committed'));
    if(action==='load')await page.evaluate(()=>window.earthQA.load());
    if(action==='resize')await page.setViewportSize({width:391,height:844});
    if(action==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    if(action==='osreduce')await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForTimeout(600);expect(await page.evaluate(()=>window.earthQA.painted())).toEqual([]);
    expect(await page.evaluate(()=>localStorage.getItem('earth-committed'))).toBe(saved);
    expect((await page.evaluate(()=>window.earthQA.state())).commands).toEqual(JSON.parse(saved!).commands);
  }finally{await ctx.close();}
});
for(const dpr of [2,3])for(const skill of ['bash','slam','quake','tremor'])test(`earth ${skill} actual pose/shake anchor at ${dpr}x DPR`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:dpr,reducedMotion:'no-preference'});
 try{
  const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});await page.goto(`tests/browser/fixtures/earth.html?skill=${skill}`);
  await page.locator('#start').click();await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
  const turn=(await page.evaluate(()=>window.earthQA.sequence()))[0]!,id=turn.events.find(e=>e.type==='damage'&&e.sourceId===turn.actorId)!.targetId!;
  await page.evaluate(()=>window.earthQA.preview(0));await page.evaluate(id=>window.earthQA.nudge(id),id);await page.clock.runFor(60);
  const a=await page.evaluate(id=>({expected:window.earthQA.independent(id),paint:window.earthQA.painted().filter(p=>p.frame.endsWith('_peak'))}),id);
  expect(a.paint.some(p=>Math.abs(p.x-a.expected.x)<.3&&Math.abs(p.y-a.expected.y)<.3)).toBe(true);
 }finally{await ctx.close();}
});
test('earth missing atlas retains Start, fallback and a single committed command',async({page})=>{
 await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/assets/fx/earth_fx.*',route=>route.abort());await page.goto('tests/browser/fixtures/earth.html?skill=bash');await page.locator('#start').click();
 await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));await page.locator('#action-bash').click();await page.locator('#target-f1').click();
 const saved=await page.evaluate(()=>localStorage.getItem('earth-committed'));expect(JSON.parse(saved!).commands).toHaveLength(1);
 await page.locator('#skip-turn').click();await page.clock.runFor(32);expect(await page.evaluate(()=>window.earthQA.painted())).toEqual([]);
 expect(await page.evaluate(()=>localStorage.getItem('earth-committed'))).toBe(saved);expect(errors).toEqual([]);
});
