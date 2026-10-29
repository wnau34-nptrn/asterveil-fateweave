import {test,expect,type Page} from '@playwright/test';
import {stageTiming} from '../../src/ui/battle-playback';

test.skip(process.env.PLAYWRIGHT_PAGES==='true','source-only foe signature VFX gate runs explicitly in CI/Pages');
test.use({reducedMotion:'no-preference'});
// Mirrors the module table (importing it would need a JSON import attribute under the Playwright node loader).
const foeSignatureMoves={'Seed Spark':'seed-spark','Ember Spark':'ember-spark','Spore Hex':'spore-hex','Spore Dust':'spore-dust','Star Flame':'star-flame',
 'Rune Lash':'rune-lash','Rift Needle':'rift-needle','Shard Burst':'shard-burst','Rift Bolt':'rift-bolt-foe','Veil Quake':'veil-quake'} as const;
type FoeSignatureMove=keyof typeof foeSignatureMoves;
const moves=Object.keys(foeSignatureMoves) as FoeSignatureMove[];
const slug=(m:FoeSignatureMove)=>foeSignatureMoves[m];
const spotOf=(m:FoeSignatureMove)=>m==='Veil Quake'?'feet':'chest';
const open=async(page:Page,query:string)=>{
 await page.goto(`tests/browser/fixtures/foe-signature-fx.html?${query}`);const start=page.locator('#start');if(await start.isVisible())await start.click();
};
const cast=async(page:Page)=>{await page.locator(`#action-${await page.evaluate(()=>window.foeQA.action())}`).click();await page.locator(`#target-${await page.evaluate(()=>window.foeQA.target())}`).click();};
// Runs the hero turn to its end, then up to `into` ms inside the foe's turn.
async function toFoe(page:Page,into:number){
 const turns=await page.evaluate(()=>window.foeQA.sequence()),heroTurn=turns.find(t=>t.side==='hero')!,foe=turns.find(t=>t.side==='enemy')!;
 const a=stageTiming(heroTurn,false),b=stageTiming(foe,false);
 await cast(page);await page.clock.runFor(a.end+into);return {foe,b};
}
const prep=async(page:Page,query:string)=>{
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});await page.setViewportSize({width:390,height:844});
 await open(page,query);await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
};

for(const move of moves)test(`foe ${move}: prepare at the foe, travel to the real recipient, impact + settle, skip keeps the result`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
  const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await prep(page,`move=${encodeURIComponent(move)}`);
  const turns=await page.evaluate(()=>window.foeQA.sequence()),foe=turns.find(t=>t.side==='enemy')!,timing=stageTiming(foe,false);
  const hero=stageTiming(turns.find(t=>t.side==='hero')!,false);
  await cast(page);const saved=await page.evaluate(()=>localStorage.getItem('foe-committed'));
  // Anticipation: only the prepare painting, on the foe's hand/feet.
  await page.clock.runFor(hero.end+Math.round(timing.contact*.12));
  const gather=(await page.evaluate(()=>window.foeQA.painted())).filter(p=>p.visible);
  expect(gather.map(p=>p.frame)).toEqual([`${slug(move)}_prepare`]);
  const cue=(await page.evaluate(()=>window.foeQA.cues()))[0]!;
  const from=await page.evaluate(([id,s])=>window.foeQA.point(id,s as 'hand'|'feet'),[cue.sourceId,move==='Veil Quake'?'feet':'hand'] as const);
  expect(Math.abs(gather[0]!.y-from.y)).toBeLessThan(2);expect(gather[0]!.x).toBeGreaterThan(from.x-40);
  // Flight: travel painting is visible, between the foe and the hero, nothing generic drawn.
  await page.clock.runFor(Math.round(timing.contact*.6));
  const fly=await page.evaluate(()=>window.foeQA.painted()),travel=fly.find(p=>p.frame===`${slug(move)}_travel`)!;
  expect(travel).toBeTruthy();expect(travel.visible).toBe(true);expect(travel.alpha).toBeGreaterThan(.2);
  const to=await page.evaluate(([id,s])=>window.foeQA.point(id,s as 'chest'|'feet'),[cue.targetId,spotOf(move)] as const);
  // The painting's head leads leftwards: its centre lies between the recipient and the foe plus its own half length.
  expect(travel.x).toBeLessThan(from.x+travel.width);expect(travel.x).toBeGreaterThan(to.x-travel.width/2);expect(travel.scaleX).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.foeQA.rings())).toBe(0);
  // Contact: impact exactly on the recipient's landmark; settle follows.
  await page.clock.runFor(timing.contact-Math.round(timing.contact*.72)+60);
  // Painted and landmark are read in the same frame: the recipient's sprite is already reacting, and the impact follows it.
  const now=await page.evaluate(([id,s])=>({paint:window.foeQA.painted(),at:window.foeQA.point(id,s as 'chest'|'feet')}),[cue.targetId,spotOf(move)] as const);
  const peak=now.paint,impact=peak.filter(p=>p.frame===`${slug(move)}_impact`);
  expect(impact).toHaveLength(1);expect(Math.abs(impact[0]!.x-now.at.x)).toBeLessThan(1.5);expect(Math.abs(impact[0]!.y-now.at.y)).toBeLessThan(1.5);
  expect(peak.some(p=>p.frame.endsWith('_prepare'))).toBe(false);
  expect(impact[0]!.tint).not.toBe(0x8addf5);
  await page.clock.runFor(200);
  expect((await page.evaluate(()=>window.foeQA.painted())).map(p=>p.frame)).toContain(`${slug(move)}_settle`);
  await page.locator('#skip-turn').click();await page.clock.runFor(700);
  expect(await page.evaluate(()=>window.foeQA.painted())).toEqual([]);
  expect(await page.evaluate(()=>localStorage.getItem('foe-committed'))).toBe(saved);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
test('Veil Quake stays on the ground at the recipient\'s feet (below the chest landmark), not at chest height',async({page})=>{
 await prep(page,'move=Veil+Quake');
 const {b}=await toFoe(page,0);await page.clock.runFor(b.contact+60);
 const impact=(await page.evaluate(()=>window.foeQA.painted())).find(p=>p.frame==='veil-quake_impact')!;
 const feet=await page.evaluate(()=>window.foeQA.point('healer','feet')),chest=await page.evaluate(()=>window.foeQA.point('healer','chest'));
 expect(Math.abs(impact.y-feet.y)).toBeLessThan(1.5);expect(feet.y-chest.y).toBeGreaterThan(20);
});
test('Guard redirect: impact lands on the hero who really took the damage',async({page})=>{
 await prep(page,'move=Rift+Bolt&scenario=guard');
 const {foe,b}=await toFoe(page,0);expect(foe.intent!.targetId).toBe('weaver');
 await page.clock.runFor(b.contact+60);
 const painted=await page.evaluate(()=>window.foeQA.painted()),impacts=painted.filter(p=>p.frame==='rift-bolt-foe_impact');
 expect(impacts).toHaveLength(1);expect(impacts[0]!.target).toBe('guardian');
 const at=await page.evaluate(()=>window.foeQA.point('guardian','chest'));expect(Math.abs(impacts[0]!.x-at.x)).toBeLessThan(1.5);
});
test('dodge: travel passes the hero, no impact or settle is ever painted',async({page})=>{
 await prep(page,'move=Seed+Spark&scenario=dodge');
 const {b}=await toFoe(page,0);let sawTravel=false;
 const to=await page.evaluate(()=>window.foeQA.point('sefa','chest'));
 for(let t=0;t<b.contact+500;t+=40){
  await page.clock.runFor(40);
  const paint=await page.evaluate(()=>window.foeQA.painted());
  sawTravel=sawTravel||paint.some(p=>p.frame==='seed-spark_travel'&&p.visible&&p.x<to.x+60);
  expect(paint.some(p=>p.frame.endsWith('_impact')||p.frame.endsWith('_settle'))).toBe(false);
 }
 expect(sawTravel).toBe(true);
});
test('a fully absorbed hit reads blocked: small cyan impact, no settle',async({page})=>{
 await prep(page,'move=Spore+Hex&scenario=blocked');
 const {b}=await toFoe(page,0);await page.clock.runFor(b.contact+60);
 const peak=await page.evaluate(()=>window.foeQA.painted()),impact=peak.find(p=>p.frame==='spore-hex_impact')!;
 expect(impact.tint).toBe(0x8addf5);
 await page.clock.runFor(300);expect((await page.evaluate(()=>window.foeQA.painted())).some(p=>p.frame.endsWith('_settle'))).toBe(false);
});
test('an all-hero intent draws one smaller impact per real recipient',async({page})=>{
 await prep(page,'move=Star+Flame&scenario=all');
 const {b}=await toFoe(page,0);await page.clock.runFor(b.contact+60);
 const impacts=(await page.evaluate(()=>window.foeQA.painted())).filter(p=>p.frame==='star-flame_impact');
 expect(impacts.map(i=>i.target).sort()).toEqual(['guardian','healer','weaver']);
 expect(Math.max(...impacts.map(i=>i.width))).toBeLessThan(60);
});
for(const move of ['Rift Bolt','Veil Quake'] as const)test(`foe ${move}: OS reduced motion is a short static peak at the truthful recipient`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});
  await open(page,`move=${encodeURIComponent(move)}`);await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
  await cast(page);
  const turns=await page.evaluate(()=>window.foeQA.sequence()),foe=turns.find(t=>t.side==='enemy')!;
  let still:Awaited<ReturnType<typeof snapshot>>=[];
  for(let t=0;t<4000&&!still.length;t+=50){await page.clock.runFor(50);still=(await snapshot(page)).filter(p=>p.frame.startsWith(slug(move)));}
  expect(still.length).toBeGreaterThan(0);expect(still.map(p=>p.frame).sort()).toEqual([`${slug(move)}_impact`,`${slug(move)}_travel`]);
  const to=await page.evaluate(([id,s])=>window.foeQA.point(id,s as 'chest'|'feet'),[foe.intent!.targetId,spotOf(move)] as const);
  const impact=still.find(p=>p.frame.endsWith('_impact'))!;expect(Math.abs(impact.x-to.x)).toBeLessThan(1.5);
  expect(still.every(p=>p.visible)).toBe(true);
  await page.clock.runFor(40);
  const later=(await snapshot(page)).filter(p=>p.frame.startsWith(slug(move)));
  expect(later.map(p=>[p.frame,p.x,p.y])).toEqual(still.map(p=>[p.frame,p.x,p.y]));
 }finally{await ctx.close();}
});
const snapshot=(page:Page)=>page.evaluate(()=>window.foeQA.painted());
