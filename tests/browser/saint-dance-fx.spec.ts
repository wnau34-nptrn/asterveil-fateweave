import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';

test.skip(process.env.PLAYWRIGHT_PAGES==='true','source-only Saint/Dancer VFX gate runs explicitly in CI/Pages');
test.use({reducedMotion:'no-preference'});
const skills=['saintstrike','communion','saintarc','vowstrike','sharewound','lastlight','cadence','duet','rounddance','deepbeat','echofoot','closingstep'] as const;
// Painted layers expected at the contact window, derived from the real resolver events of each fixture (see tests/saint-dance-fx.test.ts).
const expected:Record<typeof skills[number],Record<string,number>>={
 saintstrike:{saintstrike_peak:1,saintstrike_settle:1},communion:{saintstrike_peak:1,communion_settle:1},saintarc:{saintarc_peak:2,saintstrike_settle:1},
 vowstrike:{vowstrike_peak:1,vowstrike_settle:1,saintstrike_settle:1},sharewound:{saintstrike_peak:1,communion_settle:2},lastlight:{lastlight_peak:1,saintstrike_settle:1},
 cadence:{cadence_peak:1,cadence_settle:1},duet:{duet_peak:1,duet_settle:1},rounddance:{rounddance_settle:1},
 deepbeat:{deepbeat_peak:1,deepbeat_settle:1},echofoot:{echofoot_peak:1,echofoot_settle:1},closingstep:{closingstep_peak:1,closingstep_settle:1}};
const open=async(page:Page,query:string)=>{
 await page.goto(`tests/browser/fixtures/saint-dance-fx.html?${query}`);await page.waitForFunction(()=>window.sdQA.atlasReady());await page.locator('#start:visible,[data-ui=action]:visible').first().waitFor();const start=page.locator('#start');if(await start.isVisible())await start.click();
};
const cast=async(page:Page,skill:string)=>{await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.sdQA.target())}`).click();};
const frames=(page:Page)=>page.evaluate(()=>window.sdQA.painted()).then(p=>p.map(i=>i.frame));
const tally=(list:string[])=>list.reduce<Record<string,number>>((m,f)=>({...m,[f]:(m[f]??0)+1}),{});
for(const skill of skills)test(`saint/dance ${skill}: prepare on the caster, painted layers match the real events, skip preserves the result`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
  const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});
  await open(page,`skill=${skill}`);await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
  const sequence=await page.evaluate(()=>window.sdQA.sequence()),turn=sequence.find(t=>t.action===skill)!,timing=stageTiming(turn,false);
  await cast(page,skill);const saved=await page.evaluate(()=>localStorage.getItem('sd-committed'));
  await page.clock.runFor(timing.contact-1);
  const prep=await frames(page);expect(prep.filter(f=>f===`${skill}_prepare`)).toHaveLength(1);
  await page.clock.runFor(61);
  const at=await frames(page);
  expect(at.some(f=>f.endsWith('_prepare'))).toBe(false);
  // Rounddance: one ring per ally the resolver really restored.
  const want=skill==='rounddance'?{rounddance_settle:new Set(turn.events.filter(e=>e.type==='cooldown').map(e=>e.targetId)).size}:expected[skill];
  expect(tally(at)).toEqual(want);
  // The generic ring/slash must not be drawn on events the painted layers cover.
  // (Echofoot's real ally cooldown event is not painted, so its one generic cue stays.)
  expect(await page.evaluate(()=>window.sdQA.rings())).toBe(skill==='echofoot'?1:0);
  await page.locator('#skip-turn').click();await page.clock.runFor(700);
  expect(await frames(page)).toEqual([]);
  expect(await page.evaluate(()=>localStorage.getItem('sd-committed'))).toBe(saved);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
test('saintstrike: the conversion thread starts at the struck foe and ends on the ally the resolver healed',async({page})=>{
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.setViewportSize({width:390,height:844});
 await open(page,'skill=saintstrike');await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
 const turn=(await page.evaluate(()=>window.sdQA.sequence())).find(t=>t.action==='saintstrike')!,timing=stageTiming(turn,false);
 const foe=turn.events.find(e=>e.type==='damage')!.targetId!,ally=turn.events.find(e=>e.type==='heal')!.targetId!;
 await cast(page,'saintstrike');await page.clock.runFor(timing.contact+420);
 const link=(await page.evaluate(()=>window.sdQA.painted())).find(p=>p.frame==='saintstrike_settle')!;
 const f=await page.evaluate(id=>window.sdQA.point(id,'waist'),foe),a=await page.evaluate(id=>window.sdQA.point(id,'waist'),ally);
 // The thread's midpoint lies between the two real bodies, not on either.
 const mid={x:(f.x+a.x)/2,y:(f.y+a.y)/2};
 expect(Math.hypot(link.x-mid.x,link.y-mid.y)).toBeLessThan(Math.hypot(f.x-a.x,f.y-a.y)*.45);
});
test('echofoot: a trail travels from the caster to the real foe',async({page})=>{
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.setViewportSize({width:390,height:844});
 await open(page,'skill=echofoot');await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
 const turn=(await page.evaluate(()=>window.sdQA.sequence())).find(t=>t.action==='echofoot')!,timing=stageTiming(turn,false);
 await cast(page,'echofoot');await page.clock.runFor(timing.contact+8);
 const early=(await page.evaluate(()=>window.sdQA.painted())).find(p=>p.frame==='echofoot_peak')!;
 await page.clock.runFor(260);
 const late=(await page.evaluate(()=>window.sdQA.painted())).find(p=>p.frame==='echofoot_peak')!;
 const caster=await page.evaluate(id=>window.sdQA.point(id,'feet'),turn.actorId),foe=await page.evaluate(id=>window.sdQA.point(id,'feet'),turn.events.find(e=>e.type==='damage')!.targetId!);
 expect(Math.abs(late.width)).toBeGreaterThan(Math.abs(early.width));
 expect(Math.hypot(late.x-foe.x,late.y-foe.y)).toBeLessThan(Math.hypot(early.x-foe.x,early.y-foe.y));
 expect(Math.hypot(early.x-caster.x,early.y-caster.y)).toBeLessThan(Math.hypot(late.x-caster.x,late.y-caster.y));
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 for(const skill of ['saintstrike','rounddance'] as const)
 test(`saint/dance ${skill} ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
  try{const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await open(page,`skill=${skill}&speed=${speed}&intensity=${intensity}`);await cast(page,skill);
   const saved=await page.evaluate(()=>localStorage.getItem('sd-committed'));
   await expect(page.locator('#skip-turn')).toBeHidden();
   expect(await page.evaluate(()=>localStorage.getItem('sd-committed'))).toBe(saved);
   expect(await page.evaluate(()=>window.sdQA.state())).toEqual(await page.evaluate(()=>window.sdQA.expectedCaptureState()));
   expect(await frames(page)).toEqual([]);expect(errors).toEqual([]);
  }finally{await ctx.close();}
 });
