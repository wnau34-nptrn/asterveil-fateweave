import {test,expect} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';

test.skip(process.env.PLAYWRIGHT_PAGES==='true','source-only alchemy gate runs explicitly in CI/Pages');
const skills=['acid','bomb','smoke','catalyst','haste','fury'];
for(const skill of skills)test(`alchemy ${skill} real flight/contact, rear layer and skip preserve result`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  try{
    const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});
    await page.goto(`tests/browser/fixtures/alchemy.html?skill=${skill}`);await page.locator('#start').click();
    await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
    const turn=(await page.evaluate(()=>window.alchemyQA.sequence()))[0]!,timing=stageTiming(turn,false);
    await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.alchemyQA.target())}`).click();
    const saved=await page.evaluate(()=>localStorage.getItem('alchemy-committed'));
    await page.clock.runFor(timing.contact-1);
    const prep=await page.evaluate(()=>window.alchemyQA.painted());expect(prep).toHaveLength(1);expect(prep[0]!.frame.endsWith('_prepare')).toBe(true);
    await page.clock.runFor(61);
    const peaks=(await page.evaluate(()=>window.alchemyQA.painted())).filter(p=>p.frame.endsWith('_peak'));
    const cues=await page.evaluate(()=>window.alchemyQA.cues());expect(peaks).toHaveLength(cues.length);
    for(const cue of cues){const point=await page.evaluate(id=>window.alchemyQA.point(id),cue.targetId);
      expect(peaks.some(p=>Math.abs(p.x-point.x)<.3&&Math.abs(p.y-point.y)<.3)).toBe(true);}
    expect(await page.evaluate(()=>window.alchemyQA.rings())).toBe(0);expect(await page.evaluate(()=>window.alchemyQA.behindUnits())).toBe(true);
    await page.clock.runFor(160);expect((await page.evaluate(()=>window.alchemyQA.painted())).some(p=>p.frame.endsWith('_tail')&&p.alpha>.2)).toBe(true);
    await page.locator('#skip-turn').click();await page.clock.runFor(32);
    expect(await page.evaluate(()=>window.alchemyQA.painted())).toEqual([]);
    expect(await page.evaluate(()=>localStorage.getItem('alchemy-committed'))).toBe(saved);expect(errors).toEqual([]);
  }finally{await ctx.close();}
});
for(const skill of skills)test(`alchemy ${skill} OS reduced motion is immediate and static`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  try{
    const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});
    await page.goto(`tests/browser/fixtures/alchemy.html?skill=${skill}`);await page.locator('#start').click();
    await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
    await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.alchemyQA.target())}`).click();
    const still=await page.evaluate(()=>window.alchemyQA.painted());expect(still.length).toBeGreaterThan(0);
    expect(await page.evaluate(()=>window.alchemyQA.rings())).toBe(0);
    await page.clock.runFor(90);expect(await page.evaluate(()=>window.alchemyQA.painted())).toEqual(still);
  }finally{await ctx.close();}
});
for(const [skill,scenario] of [
 ['acid','spread'],['acid','potent'],['acid','deeper'],['acid','down'],['acid','chainother'],
 ['bomb','backonly'],['bomb','corroded'],['bomb','down'],
 ['smoke','wide'],['smoke','poison'],['smoke','boss'],['smoke','physical'],['smoke','energy'],
 ['catalyst','corroded'],['catalyst','expired'],['catalyst','kill'],['catalyst','chain'],['catalyst','chainfallback'],
 ['haste','nextalready'],['haste','acted'],['haste','self'],['haste','heal'],['haste','fullhp'],['haste','overflow'],['haste','quickbrew'],
 ['fury','self'],['fury','refresh'],['fury','outgoing'],
] as const)test(`alchemy ${skill}/${scenario} uses actual hit, residue, control and healing`,async({page})=>{
 await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});await page.setViewportSize({width:390,height:844});
 await page.goto(`tests/browser/fixtures/alchemy.html?skill=${skill}&scenario=${scenario}`);
 const start=page.locator('#start');if(await start.isVisible())await start.click();await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
 const cues=await page.evaluate(()=>window.alchemyQA.preview(0));expect(cues.length).toBeGreaterThan(0);await page.clock.runFor(70);
 const paint=await page.evaluate(()=>window.alchemyQA.painted());
 expect(paint.filter(p=>p.frame.endsWith('_peak'))).toHaveLength(cues.filter(c=>c.kind==='hit'||c.skill!=='acid').length);
 if(cues.some(c=>c.skill==='acid'&&c.kind!=='hit'))expect(paint.some(p=>p.frame==='acid_tail'&&p.alpha>0)).toBe(true);
 const heals=await page.evaluate(()=>window.alchemyQA.heals()),healing=await page.evaluate(()=>window.alchemyQA.painted('healing-fx'));
 if(scenario==='heal')expect(heals.map(c=>c.event.amount)).toEqual([8]);
 if(scenario==='fullhp')expect(heals).toEqual([]);
 if(scenario==='overflow')expect(heals.map(c=>c.kind)).toEqual(['barrier']);
 if(heals.length)expect(healing.length).toBeGreaterThan(0);
 if(scenario==='chainother')expect(await page.evaluate(()=>window.alchemyQA.painted('blade-fx'))).not.toHaveLength(0);
 await page.evaluate(()=>window.alchemyQA.stop());expect(await page.evaluate(()=>window.alchemyQA.painted())).toEqual([]);
});
for(const action of ['load','resize','hidden','osreduce'])test(`alchemy flight ${action} cleanup cannot replay a committed command`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  try{
    const page=await ctx.newPage();await page.goto('tests/browser/fixtures/alchemy.html?skill=bomb&speed=fast&intensity=reduced');
    await page.locator('#start').click();await page.locator('#action-bomb').click();await page.locator('#target-enemies-f1').click();
    const saved=await page.evaluate(()=>localStorage.getItem('alchemy-committed'));
    if(action==='load')await page.evaluate(()=>window.alchemyQA.load());
    if(action==='resize')await page.setViewportSize({width:391,height:844});
    if(action==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    if(action==='osreduce')await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForTimeout(600);expect(await page.evaluate(()=>window.alchemyQA.painted())).toEqual([]);
    expect(await page.evaluate(()=>localStorage.getItem('alchemy-committed'))).toBe(saved);
    expect((await page.evaluate(()=>window.alchemyQA.state())).commands).toEqual(JSON.parse(saved!).commands);
  }finally{await ctx.close();}
});
for(const dpr of [2,3])for(const skill of ['acid','bomb','smoke','catalyst','haste','fury'])test(`alchemy ${skill} actual pose/shake anchor at ${dpr}x DPR`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:dpr,reducedMotion:'no-preference'});
 try{
  const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});await page.goto(`tests/browser/fixtures/alchemy.html?skill=${skill}`);
  await page.locator('#start').click();await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
  const id=(await page.evaluate(()=>window.alchemyQA.cues()))[0]!.targetId;
  await page.evaluate(()=>window.alchemyQA.preview(0));await page.evaluate(id=>window.alchemyQA.nudge(id),id);await page.clock.runFor(60);
  const a=await page.evaluate(id=>({expected:window.alchemyQA.independent(id),paint:window.alchemyQA.painted().filter(p=>p.frame.endsWith('_peak'))}),id);
  expect(a.paint.some(p=>Math.abs(p.x-a.expected.x)<.3&&Math.abs(p.y-a.expected.y)<.3)).toBe(true);
 }finally{await ctx.close();}
});
test('alchemy missing atlas retains Start, fallback and a single committed command',async({page})=>{
 await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/assets/fx/alchemy_fx.*',route=>route.abort());await page.goto('tests/browser/fixtures/alchemy.html?skill=acid');await page.locator('#start').click();
 await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));await page.locator('#action-acid').click();await page.locator('#target-f1').click();
 const saved=await page.evaluate(()=>localStorage.getItem('alchemy-committed'));expect(JSON.parse(saved!).commands).toHaveLength(1);
 await page.locator('#skip-turn').click();await page.clock.runFor(32);expect(await page.evaluate(()=>window.alchemyQA.painted())).toEqual([]);
 expect(await page.evaluate(()=>localStorage.getItem('alchemy-committed'))).toBe(saved);expect(errors).toEqual([]);
});
