import {test,expect,type Page} from '@playwright/test';
import {chapterOne as map} from '../../src/content/world/chapter1';
import {encounterById} from '../../src/content/encounters/catalog';
import {newProfile,depart} from '../../src/core/world/profile';
import { legacyEnvelope } from '../fixtures/legacy-save';

const key='asterveil.fateweave.expedition.v1';
async function open(page:Page){
 const p=newProfile(map,17);p.commander={name:'จังหวะ',crest:'star',color:'gold', camp: 'ค่ายอารี'};p.tutorialDone=true;
 const game=depart(p,map,encounterById,1234);game.run.battle={kind:'random',encounterId:'veil-siege',entry:{...game.run.hp},commands:[]};
 await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('presentation-seeded')){localStorage.setItem(key,raw);sessionStorage.setItem('presentation-seeded','1')}},{key,raw:JSON.stringify(legacyEnvelope({version:27,...game}))});
 await page.clock.install({time:new Date('2026-10-21T00:00:00Z')});await page.goto('./');await page.locator('#continue').click();await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 await page.clock.pauseAt(new Date('2026-10-21T01:00:00Z'));
}
const saved=(page:Page)=>page.evaluate(k=>localStorage.getItem(k)!,key);
for (const [speed,intensity,motion] of [
 ['fast','standard','no-preference'],['normal','reduced','no-preference'],
 ['fast','standard','reduce'],['normal','reduced','reduce'],
] as const) {
 test(`presentation mode ${speed}/${intensity}/${motion} keeps authoritative impact and honors motion changes`,async({browser},info)=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:motion}),page=await ctx.newPage();
  try {
   await page.addInitScript(p=>localStorage.setItem('asterveil.fateweave.presentation.v1',JSON.stringify(p)),{speed,intensity});
   await open(page);await page.locator('#action-execute').click();await page.locator('#target-f1').click();const committed=await saved(page);
   const contact=motion==='reduce'?0:speed==='fast'?194:298;
   if (contact) {await page.clock.runFor(contact-1);await expect(page.locator('[data-enemy=f1]')).toContainText('200 / 200');await page.clock.runFor(1);}
   await expect(page.locator('[data-enemy=f1]')).toContainText('172 / 200');
   await page.clock.runFor(20);await page.screenshot({path:info.outputPath('mode-impact.png')});
   await page.emulateMedia({reducedMotion:motion==='reduce'?'no-preference':'reduce'});await page.clock.runFor(3000);
   await expect(page.locator('#action-bolt')).toBeEnabled();await expect(page.locator('#hero-tracer')).toContainText('44 / 56');expect(await saved(page)).toBe(committed);
  } finally {await ctx.close();}
 });
}
for(const [width,height,touch]of [[320,568,true],[390,844,true],[1366,768,false]]as const){
 test(`presentation fast/reduced preferences persist without changing commands at ${width}x${height}`,async({browser},info)=>{
  test.setTimeout(90000);
  const ctx=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:'no-preference'}),page=await ctx.newPage();
  try {
   await open(page);const before=await saved(page);
   await page.locator('#battle-info').click();await page.locator('#battle-tab-settings').click();
   await page.locator('#combat-speed').click();await page.locator('#combat-intensity').click();
   await expect(page.locator('#combat-speed')).toHaveAttribute('aria-pressed','true');
   expect(await saved(page)).toBe(before);
   await page.locator('[data-ui=info-close]').click();await page.locator('#action-execute').click();await page.locator('#target-f1').click();
   const committed=await saved(page);await page.clock.runFor(193);await expect(page.locator('[data-enemy=f1]')).toContainText('200 / 200');
   await page.clock.runFor(21);await expect(page.locator('[data-enemy=f1]')).toContainText('172 / 200');
   await page.screenshot({path:info.outputPath('reduced-fast-impact.png')});
   await page.clock.runFor(900);await expect(page.locator('#action-bolt')).toBeEnabled();expect(await saved(page)).toBe(committed);
   await page.reload();await page.locator('#continue').click();await page.clock.runFor(600);await page.locator('#battle-info').click();await page.locator('#battle-tab-settings').click();
   await expect(page.locator('#combat-speed')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#combat-intensity')).toHaveAttribute('aria-pressed','true');
   expect(await saved(page)).toBe(committed);
  } finally {await ctx.close();}
 });
 test(`presentation impact reveals only the current actor group at ${width}x${height}`,async({browser},info)=>{
  test.setTimeout(90000);
  const ctx=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:'no-preference'}),page=await ctx.newPage(),errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await open(page);await page.locator('#action-execute').click();await page.locator('#target-f1').click();
   await expect(page.locator('#turn-phase')).toHaveAttribute('data-cue','prepare');await expect(page.locator('[data-enemy=f1]')).toContainText('200 / 200');
   const committed=JSON.parse(await saved(page));expect(committed.run.battle.commands).toHaveLength(1);
   await page.locator('#battle-info').click();await page.locator('#status-unit-f1').click();await expect(page.locator('#status-details')).toContainText('200 / 200');
   await page.screenshot({path:info.outputPath('before-impact.png')});
   await page.clock.runFor(297);await expect(page.locator('#status-details')).toContainText('200 / 200');
   await page.clock.runFor(1);await expect(page.locator('#status-details')).toContainText('172 / 200');await expect(page.locator('html')).toHaveAttribute('data-sfx','crit');
   await page.locator('[data-ui=info-close]').click();await expect(page.locator('#turn-phase')).toHaveAttribute('data-cue','impact');
   await expect(page.locator('#hero-tracer')).toContainText('56 / 56');await page.clock.runFor(20);await page.screenshot({path:info.outputPath('hero-impact.png')});
   await page.clock.runFor(532);await expect(page.locator('#turn-phase')).toHaveAttribute('data-actor','b1');await expect(page.locator('#hero-tracer')).toContainText('56 / 56');
   await page.clock.runFor(279);await expect(page.locator('#hero-tracer')).toContainText('56 / 56');await page.clock.runFor(1);await expect(page.locator('#hero-tracer')).toContainText('44 / 56');
   await page.clock.runFor(20);await page.screenshot({path:info.outputPath('enemy-impact.png')});await page.clock.runFor(500);await expect(page.locator('#action-bolt')).toBeEnabled();expect(await saved(page)).toBe(JSON.stringify(committed));expect(errors).toEqual([]);
  }finally{await ctx.close()}
 });
 test(`presentation skip resize and reload keep exactly one committed command at ${width}x${height}`,async({browser})=>{
  // Multiple reloads and software WebGL cleanup need wall-clock headroom; fake-clock timing assertions stay exact.
  if(width===1366)test.setTimeout(75_000);
  const ctx=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:'no-preference'}),page=await ctx.newPage();
  try{
   await open(page);await page.locator('#target-f1').click();const committed=await saved(page);await page.locator('#skip-turn').click();await page.clock.runFor(3000);
   await expect(page.locator('#action-bolt')).toBeEnabled();await expect(page.locator('#hero-tracer')).toContainText('44 / 56');expect(await saved(page)).toBe(committed);
   await page.locator('#action-bolt').click();await page.locator('#target-f1').click();const second=await saved(page);
   await page.setViewportSize({width:width+1,height});await page.clock.runFor(1500);expect(await saved(page)).toBe(second);
   await expect(page.locator('#action-bash')).toBeEnabled();await page.reload();await page.locator('#continue').click();await expect(page.locator('#action-bash')).toBeEnabled();expect(await saved(page)).toBe(second);
   await page.locator('#action-bash').click();await page.locator('#target-f1').click();const third=await saved(page);
   const lastSound=await page.locator('html').getAttribute('data-sfx');
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
   await page.clock.runFor(2500);expect(await saved(page)).toBe(third);await expect(page.locator('html')).toHaveAttribute('data-sfx',lastSound!);
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
   await expect(page.locator('#action-heal')).toBeEnabled();
  }finally{await ctx.close()}
 });
}
