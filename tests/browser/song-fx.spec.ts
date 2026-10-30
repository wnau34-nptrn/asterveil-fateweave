import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';

test.skip(process.env.PLAYWRIGHT_PAGES==='true','source-only song/shadow VFX gate runs explicitly in CI/Pages');
test.use({reducedMotion:'no-preference'});
const skills=['valor','finale','dread','note','solo','evade','decoy'] as const;
// settle layers expected at the contact window (resolver-driven: allies for valor, three standing foes for finale/dread, one target otherwise)
const settleCount={valor:2,finale:3,dread:3,note:1,solo:1,evade:1,decoy:1} as const;
const open=async(page:Page,query:string)=>{
 await page.goto(`tests/browser/fixtures/song-fx.html?${query}`);const start=page.locator('#start');if(await start.isVisible())await start.click();
};
const cast=async(page:Page,skill:string)=>{await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.songQA.target())}`).click();};
const frames=(page:Page)=>page.evaluate(()=>window.songQA.painted()).then(p=>p.map(i=>i.frame));
for(const skill of skills)test(`song ${skill}: prepare on the caster, one peak layer, settle layers match the real events, skip preserves the result`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
  const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});
  await open(page,`skill=${skill}`);await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
  const sequence=await page.evaluate(()=>window.songQA.sequence()),turn=sequence.find(t=>t.action===skill)!,timing=stageTiming(turn,false);
  await cast(page,skill);const saved=await page.evaluate(()=>localStorage.getItem('song-committed'));
  await page.clock.runFor(timing.contact-1);
  const prep=await frames(page);expect(prep.filter(f=>f===`${skill}_prepare`)).toHaveLength(1);
  await page.clock.runFor(61);
  const at=await frames(page);
  expect(at.filter(f=>f===`${skill}_peak`)).toHaveLength(1);expect(at.some(f=>f.endsWith('_prepare'))).toBe(false);
  expect(await page.evaluate(()=>window.songQA.rings())).toBe(0);
  expect(at.filter(f=>f===`${skill}_settle`)).toHaveLength(settleCount[skill]);
  await page.locator('#skip-turn').click();await page.clock.runFor(700);
  expect(await frames(page)).toEqual([]);
  expect(await page.evaluate(()=>localStorage.getItem('song-committed'))).toBe(saved);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
test('finale of mending/dread only gathers: no wave and no fabricated foe contact',async({browser})=>{
 for(const song of ['mend','dread']){
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  try{const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});
   await open(page,`skill=finale&song=${song}`);await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
   const turn=(await page.evaluate(()=>window.songQA.sequence())).find(t=>t.action==='finale')!,timing=stageTiming(turn,false);
   await cast(page,'finale');await page.clock.runFor(timing.contact+120);
   const f=await frames(page);expect(f.filter(x=>x==='finale_peak'||x==='finale_settle')).toEqual([]);
  }finally{await ctx.close();}
 }
});
test('note: the blade starts at the caster hand and travels to the real target',async({page})=>{
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.setViewportSize({width:390,height:844});
 await open(page,'skill=note');await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
 const turn=(await page.evaluate(()=>window.songQA.sequence())).find(t=>t.action==='note')!,timing=stageTiming(turn,false);
 await cast(page,'note');await page.clock.runFor(timing.contact+8);
 const early=(await page.evaluate(()=>window.songQA.painted())).find(p=>p.frame==='note_peak')!;
 const hand=await page.evaluate(id=>window.songQA.point(id,'hand'),turn.actorId),target=await page.evaluate(id=>window.songQA.point(id,'waist'),turn.events.find(e=>e.type==='damage')!.targetId!);
 await page.clock.runFor(260);
 const late=(await page.evaluate(()=>window.songQA.painted())).find(p=>p.frame==='note_peak')!;
 expect(Math.hypot(early.x-hand.x,early.y-hand.y)).toBeLessThan(Math.hypot(early.x-target.x,early.y-target.y));
 expect(Math.hypot(late.x-target.x,late.y-target.y)).toBeLessThan(Math.hypot(early.x-target.x,early.y-target.y));
});
for(const [speed,intensity,motion] of [['fast','standard','no-preference'],['normal','reduced','no-preference'],['normal','standard','reduce']] as const)
 test(`song ${speed}/${intensity}/${motion} settles without extra commands`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:motion});
  try{const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await open(page,`skill=note&speed=${speed}&intensity=${intensity}`);await cast(page,'note');
   const saved=await page.evaluate(()=>localStorage.getItem('song-committed'));
   await expect(page.locator('#skip-turn')).toBeHidden();
   expect(await page.evaluate(()=>localStorage.getItem('song-committed'))).toBe(saved);
   expect(await page.evaluate(()=>window.songQA.state())).toEqual(await page.evaluate(()=>window.songQA.expectedCaptureState()));
   expect(await frames(page)).toEqual([]);expect(errors).toEqual([]);
  }finally{await ctx.close();}
 });
