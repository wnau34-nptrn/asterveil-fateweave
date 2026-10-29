import atlasManifest from '../../src/game/visuals/unit-atlases.json' with { type: 'json' };
import { test, expect, type Page } from '@playwright/test';
import { firstClash, encounterById } from '../../src/content/encounters/catalog';
import { chapterOne } from '../../src/content/world/chapter1';
import { newExpedition } from '../../src/core/world/world';
import { createBattle, currentHeroId, resolveCommand, targetOptions, actionReason } from '../../src/core/battle/engine';
import type { ActionId } from '../../src/core/battle/types';
const key='asterveil.fateweave.expedition.v1';
function seed(skill:boolean) {
 const world=newExpedition(chapterOne,encounterById,1234);world.tutorialDone=true;
 const hp=Object.fromEntries(firstClash.heroes.map(h=>[h.id,h.maxHp]));let state=createBattle(firstClash,{hp});
 // Real commands keep both opponents alive until Hunter's round-three Shadow Knife.
 while(skill&&state.round<3){
  const hero=currentHeroId(state,firstClash)!;
  const wishes:Record<string,ActionId[]>={tracer:['mark','attack'],weaver:['ward','attack'],guardian:['guard','attack'],healer:['heal','attack']};
  const action=wishes[hero]!.find(a=>!actionReason(state,firstClash,hero,a)&&targetOptions(state,firstClash,hero,a).some(t=>t.valid))!;
  const targets=targetOptions(state,firstClash,hero,action).filter(t=>t.valid);const target=(targets.find(t=>t.id==='f1')??targets[0])!;
  state=resolveCommand(state,firstClash,{beat:state.beat,heroId:hero,action,targetId:target.id}).state;
 }
 world.battle={kind:'random',encounterId:firstClash.id,entry:hp,commands:state.commands};return JSON.stringify({version:1,state:world});
}
async function open(page:Page,skill:boolean){
 const assets=Promise.all([atlasManifest.lyra,atlasManifest.hunter,atlasManifest.eira,atlasManifest.vargoth].flatMap(m=>[m.image,m.atlas]).map(name=>page.waitForResponse(r=>r.url().endsWith(name)&&r.ok()).then(r=>r.finished())));
 await page.addInitScript(({raw,key})=>{localStorage.setItem(key,raw);},{raw:seed(skill),key});
 await page.clock.install({time:new Date('2026-10-26T00:00:00Z')});await page.goto('./');await page.locator('#continue').click();await assets;await page.clock.runFor(100);if(await page.locator('#start').count()){await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();}else await expect(page.locator('#action-execute')).toBeEnabled();await page.clock.pauseAt(new Date('2026-10-26T01:00:00Z'));
}
for(const skill of [false,true])test(`pilot sprites 390: ${skill?'Execute and Hunter Shadow Knife':'basic slash on both sides'}`,async({browser},info)=>{
 test.setTimeout(process.env.CAPTURE_UNIT_PILOT==='true'?120_000:45_000);
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'}),page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try {
  await open(page,skill);await page.locator(`#action-${skill?'execute':'attack'}`).click();await page.locator('#target-f1').click();
  const committed=await page.evaluate(k=>localStorage.getItem(k),key);
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-actor','tracer');
  let frameIndex=0;
  const advance=async(ms:number)=>{
   while(ms>0){const step=Math.min(ms,25);await page.clock.runFor(step);ms-=step;if(process.env.CAPTURE_UNIT_PILOT==='true'&&frameIndex<80)await page.screenshot({path:info.outputPath(`frames/${String(frameIndex++).padStart(3,'0')}.png`)});}
  };
  await advance(150);await page.screenshot({path:info.outputPath('hero-windup-390.png')});
  const heroEnd=skill?850:600;await advance(heroEnd-150);
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-actor','b1');
  await advance(150);await page.screenshot({path:info.outputPath('hunter-windup-390.png')});
  await advance(2000);await expect(page.locator('#action-bolt')).toBeEnabled();
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(committed);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
