import {test,expect,type Page} from '@playwright/test';

test.skip(process.env.PLAYWRIGHT_PAGES==='true','source-only World Boss VFX gate runs explicitly in CI/Pages');
// ART-VFX-WB-TRIO-001: the World Boss trio's painted moves in the real scene at 390px. Mirrors the module's route table
// (importing it would need a JSON import attribute under the Playwright node loader).
const routes:Record<string,'charge'|'single'|'all'|'caster'|'summon'>={'Titan Gathering':'charge','Mountain Fall':'single','Rift Quake':'all','Fault Awakening':'caster',
 'Wing Gust':'single','Wing Gathering':'charge','Worldshard Dive':'all','Sky Rend':'caster','Severing Bolt':'single','Fate Lash':'single','Call the Court':'summon',
 'Shadow Tide':'all','Severed Crown':'caster'};
const slug=(m:string)=>m.toLowerCase().replace(/ /g,'-');
type Item={frame:string;x:number;y:number;left:number;top:number;right:number;bottom:number;alpha:number;hold:string;prepare:boolean};
type Shot={t:number;items:Item[];at:Record<string,{x:number;y:number}|null>;top:Record<string,boolean|string>};
const painted=(page:Page):Promise<Item[]>=>page.evaluate(()=>window.wbVfxQA.painted().filter(p=>p.visible&&p.alpha>.05));
async function open(page:Page,query:string){
 await page.clock.install({time:new Date('2026-10-29T00:00:00Z')});
 await page.goto(`tests/browser/fixtures/wb-vfx.html?${query}`);await page.waitForFunction(()=>window.wbVfxQA.atlasReady(),undefined,{timeout:30000});
 const start=page.locator('#start');if(await start.isVisible())await start.click();
 await page.clock.runFor(1500);await page.clock.pauseAt(new Date('2026-10-29T01:00:00Z'));
}
async function cast(page:Page){
 await page.locator(`#action-${await page.evaluate(()=>window.wbVfxQA.action())}`).click();await page.locator(`#target-${await page.evaluate(()=>window.wbVfxQA.target())}`).click();
}
// Steps the clock through the whole hero+boss playback, keeping what was painted at every step.
// `at`: where each listed actor's anchor for `frame` is in that same frame (sprites move while they react).
async function film(page:Page,ms=4200,step=40,ids:string[]=[],frame=''){const shots:Shot[]=[];for(let t=0;t<ms;t+=step){await page.clock.runFor(step);
 shots.push({t,...await page.evaluate(([ids,frame])=>{const items=window.wbVfxQA.painted().filter(p=>p.visible&&p.alpha>.05);return {items,top:items.length?window.wbVfxQA.platesOnTop():{},at:Object.fromEntries(ids.map(id=>[id,window.wbVfxQA.expectedPoint(id,frame)]))};},[ids,frame] as const)});}return shots;}
const overlap=(a:{left:number;top:number;right:number;bottom:number},b:{left:number;top:number;right:number;bottom:number})=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));

for(const move of Object.keys(routes))test(`${move}: prepare, peak on the real recipients, clear of HP plates, skip keeps the result`,async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 try{
  const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page,`move=${encodeURIComponent(move)}`);
  const cues=await page.evaluate(()=>window.wbVfxQA.cues()),route=routes[move]!;
  await cast(page);const shots=await film(page,4200,10,cues.map(c=>c.id),`${slug(move)}_peak`);
  const prepare=shots.flatMap(s=>s.items.filter(p=>p.prepare)),peaks=shots.map(s=>s.items.filter(p=>p.frame===`${slug(move)}_peak`&&p.alpha>.5));
  // Anticipation first, then the contact: the prepare painting is gone before any peak shows at full strength.
  expect(new Set(prepare.map(p=>p.frame))).toEqual(new Set([`${slug(move)}_prepare`]));
  const firstPeak=shots.findIndex(s=>s.items.some(p=>p.frame===`${slug(move)}_peak`&&p.alpha>.9)),lastPrep=shots.map(s=>s.items.some(p=>p.prepare)).lastIndexOf(true);
  expect(firstPeak).toBeGreaterThan(0);expect(lastPrep).toBeLessThan(firstPeak+2);
  // One peak per real cue, each on its own landmark as it stood when the peak appeared (read in the same frame).
  const most=peaks.reduce((a,b)=>b.length>a.length?b:a);expect(most).toHaveLength(cues.length);
  const first=shots.find(s=>s.items.filter(p=>p.frame===`${slug(move)}_peak`).length===cues.length)!;
  for(const p of Object.values(first.at).filter(q=>!!q))expect(first.items.some(q=>q.frame===`${slug(move)}_peak`&&Math.abs(q.x-p!.x)<3&&Math.abs(q.y-p!.y)<3),JSON.stringify({p,items:first.items.map(q=>[q.frame,q.x,q.y])})).toBe(true);
  if(route==='summon')expect(cues.map(c=>c.id)).toEqual(['f2']);
  if(route==='charge'||route==='caster')expect(cues.map(c=>c.id)).toEqual(['f1']);
  // The HP/name plates are DOM over the canvas: whatever is painted under them, each stays the topmost element. Ground layers
  // (under a hero's or the boss's feet) pass behind the plate below them; chest/caster paintings never reach the boss's plate.
  const plates=await page.evaluate(()=>window.wbVfxQA.plates());
  for(const s of shots)for(const p of s.items.filter(i=>i.alpha>.5&&i.frame.startsWith(slug(move))&&(route==='charge'||route==='caster'||i.prepare)&&!['rift-quake_prepare','shadow-tide_prepare'].includes(i.frame)))expect(overlap(p,plates.f1!),`${p.frame} over the boss plate`).toBe(0);
  for(const s of shots)for(const [id,top] of Object.entries(s.top))expect(top,`${id} plate under a painting at ${s.t}ms`).toBe(true);
  expect(shots.at(-1)!.items.filter(p=>!p.hold)).toEqual([]);
  expect(await page.evaluate(()=>window.wbVfxQA.state())).toEqual(await page.evaluate(()=>window.wbVfxQA.expected()));expect(errors).toEqual([]);
 }finally{await ctx.close();}
});

for(const [move,kind,frame] of [['Titan Gathering','unstoppable','mountain-fall_prepare'],['Wing Gathering','breakable','wing-gathering_prepare']] as const)
 test(`${move}: the waiting hold is the ${kind} key, clear of the boss plate; the release clears it`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  try{
   const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await open(page,`move=${encodeURIComponent(move)}`);await cast(page);await film(page);
   const hold=(await painted(page)).filter(p=>p.hold);
   expect(hold.map(h=>[h.frame,h.hold])).toEqual([[frame,kind]]);
   const at=await page.evaluate(f=>window.wbVfxQA.expectedPoint('f1',f),frame);
   expect(Math.abs(hold[0]!.x-at!.x)).toBeLessThan(2.5);expect(Math.abs(hold[0]!.y-at!.y)).toBeLessThan(2.5);
   const plate=(await page.evaluate(()=>window.wbVfxQA.plates())).f1!;expect(overlap(hold[0]!,plate)).toBe(0);
   // Rigid brackets never breathe; the breakable shell breathes gently (normal motion only).
   const alphas=new Set<number>();for(let i=0;i<12;i++){await page.clock.runFor(100);alphas.add(Math.round((await painted(page)).find(p=>p.hold)!.alpha*100));}
   expect(alphas.size>1).toBe(kind==='breakable');expect(errors).toEqual([]);
  }finally{await ctx.close();}
  const ctx2=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  try{
   const page=await ctx2.newPage();await open(page,`move=${encodeURIComponent(move)}&scenario=release`);
   expect((await painted(page)).filter(p=>p.hold).map(h=>h.frame)).toEqual([frame]);
   await cast(page);const shots=await film(page);
   expect(shots.at(-1)!.items).toEqual([]);
   expect(await page.evaluate(()=>window.wbVfxQA.state())).toEqual(await page.evaluate(()=>window.wbVfxQA.expected()));
  }finally{await ctx2.close();}
 });

test('Bash breaks Wing Gathering: no charge cue, no hold, the dive is staggered',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page,'move=Wing+Gathering&scenario=break');
 expect(await page.evaluate(()=>window.wbVfxQA.action())).toBe('bash');
 await cast(page);const shots=await film(page);
 expect(shots.flatMap(s=>s.items)).toEqual([]);
 expect(await page.evaluate(()=>window.wbVfxQA.state())).toEqual(await page.evaluate(()=>window.wbVfxQA.expected()));
});

test('reduced motion: no anticipation, peaks still on the real recipients, holds stay still',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  const page=await ctx.newPage();await open(page,'move=Wing+Gathering');await cast(page);const shots=await film(page);
  expect(shots.some(s=>s.items.some(p=>p.prepare))).toBe(false);
  const hold=(await painted(page)).filter(p=>p.hold);expect(hold.map(h=>h.frame)).toEqual(['wing-gathering_prepare']);
  const a=hold[0]!.alpha;await page.clock.runFor(900);expect((await painted(page)).find(p=>p.hold)!.alpha).toBe(a);
  await ctx.close();
  const ctx2=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page2=await ctx2.newPage();await open(page2,'move=Rift+Quake');const cues=await page2.evaluate(()=>window.wbVfxQA.cues());await cast(page2);
  const seen=(await film(page2)).flatMap(s=>s.items.filter(p=>p.frame==='rift-quake_peak'));
  expect(new Set(seen.map(p=>`${Math.round(p.x)},${Math.round(p.y)}`)).size).toBe(cues.length);
 }finally{await ctx.close();}
});

test('fast speed: the same cues land on the same landmarks',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page,'move=Shadow+Tide&speed=fast');
 const cues=await page.evaluate(()=>window.wbVfxQA.cues());await cast(page);const shots=await film(page,3000);
 const most=shots.map(s=>s.items.filter(p=>p.frame==='shadow-tide_peak')).reduce((a,b)=>b.length>a.length?b:a);expect(most).toHaveLength(cues.length);
 const at=await page.evaluate(ids=>ids.map(id=>window.wbVfxQA.expectedPoint(id,'shadow-tide_peak')),cues.map(c=>c.id));
 for(const p of at)expect(most.some(q=>Math.abs(q.x-p!.x)<2.5&&Math.abs(q.y-p!.y)<2.5)).toBe(true);
});
