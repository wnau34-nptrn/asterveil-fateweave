import {test,expect} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';

test.skip(process.env.PLAYWRIGHT_PAGES==='true','source-only projectile gate runs explicitly in CI/Pages');
const skills=['hinder','volley','weakshot','pin','track','disengage','knives'];
for(const skill of skills)test(`projectile ${skill} real flight/contact, rear layer and skip preserve result`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  try{
    const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});
    await page.goto(`tests/browser/fixtures/projectile.html?skill=${skill}`);await page.locator('#start').click();
    await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
    const turn=(await page.evaluate(()=>window.projectileQA.sequence()))[0]!,timing=stageTiming(turn,false);
    await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.projectileQA.target())}`).click();
    const saved=await page.evaluate(()=>localStorage.getItem('projectile-committed'));
    await page.clock.runFor(Math.round(timing.contact*.65));
    const arrows=(await page.evaluate(()=>window.projectileQA.flight())).filter(p=>p.visible);
    const cues=await page.evaluate(()=>window.projectileQA.cues());
    expect(arrows.map(p=>p.targetId).sort()).toEqual(cues.filter(c=>c.kind==='cast').map(c=>c.targetId).sort());
    expect(arrows.every(a=>a.progress>0&&a.progress<1)).toBe(true);expect(await page.evaluate(()=>window.projectileQA.behindUnits())).toBe(true);
    await page.clock.runFor(timing.contact-Math.round(timing.contact*.65)+50);
    expect(await page.evaluate(()=>window.projectileQA.flight())).toEqual([]);
    expect((await page.evaluate(()=>window.projectileQA.painted())).some(p=>p.frame.endsWith('_tail')&&p.alpha>.4)).toBe(true);
    await page.locator('#skip-turn').click();await page.clock.runFor(32);
    expect(await page.evaluate(()=>window.projectileQA.painted())).toEqual([]);
    expect(await page.evaluate(()=>localStorage.getItem('projectile-committed'))).toBe(saved);expect(errors).toEqual([]);
  }finally{await ctx.close();}
});
for(const skill of skills)test(`projectile ${skill} OS reduced motion is immediate and static`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  try{
    const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});
    await page.goto(`tests/browser/fixtures/projectile.html?skill=${skill}`);await page.locator('#start').click();
    await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
    await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.projectileQA.target())}`).click();
    const still=await page.evaluate(()=>window.projectileQA.painted());expect(still.length).toBeGreaterThan(0);
    await page.clock.runFor(90);expect(await page.evaluate(()=>window.projectileQA.painted())).toEqual(still);
  }finally{await ctx.close();}
});
for(const [skill,scenario,count] of [['pin','normal',2],['volley','volleyhinder',4],['knives','frontonly',2],['knives','twin',4],['track','delayed',1]] as const)
 test(`projectile ${skill}/${scenario} contact follows actual multirow or round-end events`,async({page})=>{
  await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});await page.setViewportSize({width:390,height:844});
  await page.goto(`tests/browser/fixtures/projectile.html?skill=${skill}&scenario=${scenario}`);
  const start=page.locator('#start');if(await start.isVisible())await start.click();
  await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
  const turns=await page.evaluate(()=>window.projectileQA.sequence());
  const i=skill==='track'?turns.findIndex(t=>t.events.some(e=>e.type==='counter'&&e.text==='Tracking shot.')):0;
  expect(i).toBeGreaterThanOrEqual(0);
  const cues=await page.evaluate(i=>window.projectileQA.preview(i),i);expect(cues).toHaveLength(count);
  await page.clock.runFor(70);expect(await page.evaluate(()=>window.projectileQA.painted())).not.toEqual([]);
  for(const cue of cues)expect(turns[i]!.events).toContainEqual(cue.event);
  await page.evaluate(()=>window.projectileQA.stop());expect(await page.evaluate(()=>window.projectileQA.painted())).toEqual([]);
 });
for(const action of ['load','resize','hidden','osreduce'])test(`projectile flight ${action} cleanup cannot replay a committed command`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  try{
    const page=await ctx.newPage();await page.goto('tests/browser/fixtures/projectile.html?skill=volley&speed=fast&intensity=reduced');
    await page.locator('#start').click();await page.locator('#action-volley').click();await page.locator('#target-enemies-f1').click();
    const saved=await page.evaluate(()=>localStorage.getItem('projectile-committed'));
    if(action==='load')await page.evaluate(()=>window.projectileQA.load());
    if(action==='resize')await page.setViewportSize({width:391,height:844});
    if(action==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    if(action==='osreduce')await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForTimeout(600);expect(await page.evaluate(()=>window.projectileQA.painted())).toEqual([]);
    expect(await page.evaluate(()=>localStorage.getItem('projectile-committed'))).toBe(saved);
    expect((await page.evaluate(()=>window.projectileQA.state())).commands).toEqual(JSON.parse(saved!).commands);
  }finally{await ctx.close();}
});
for(const dpr of [2,3])test(`projectile follows independent rendered bow transform at ${dpr}x DPR`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:dpr,reducedMotion:'no-preference'});
 try{
  const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});
  await page.goto('tests/browser/fixtures/projectile.html?skill=hinder');await page.locator('#start').click();
  await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
  await page.locator('#action-hinder').click();await page.locator('#target-f1').click();
  await page.clock.runFor(35);await page.evaluate(()=>window.projectileQA.nudge());await page.clock.runFor(16);
  const a=await page.evaluate(()=>({expected:window.projectileQA.independentSource(),items:window.projectileQA.painted().filter(p=>p.frame.endsWith('_prepare'))}));
  expect(a.items).toHaveLength(1);expect(a.items[0]!.x).toBeCloseTo(a.expected.x,1);expect(a.items[0]!.y).toBeCloseTo(a.expected.y,1);
 }finally{await ctx.close();}
});
test('projectile missing atlas retains Start, fallback and a single committed command',async({page})=>{
 await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/assets/fx/projectile_fx.*',route=>route.abort());await page.goto('tests/browser/fixtures/projectile.html?skill=hinder');await page.locator('#start').click();
 await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));await page.locator('#action-hinder').click();await page.locator('#target-f1').click();
 const saved=await page.evaluate(()=>localStorage.getItem('projectile-committed'));expect(JSON.parse(saved!).commands).toHaveLength(1);
 await page.locator('#skip-turn').click();await page.clock.runFor(32);expect(await page.evaluate(()=>window.projectileQA.painted())).toEqual([]);
 expect(await page.evaluate(()=>localStorage.getItem('projectile-committed'))).toBe(saved);expect(errors).toEqual([]);
});
