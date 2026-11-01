import {expect,test} from '@playwright/test';
import {chapterOne as map} from '../../src/content/world/chapter1';
import {encounterById as lookup} from '../../src/content/encounters/catalog';
import {newProfile,depart} from '../../src/core/world/profile';
import {battleData,battleState} from '../../src/core/world/world';
import {currentHeroId,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {Profile} from '../../src/core/world/types';
import { xpAt } from '../fixtures/camp-level';
const key='asterveil.fateweave.expedition.v1';
function winningSave(p:Profile, campXp = xpAt(3)-1){
  p=structuredClone(p);for(const m of Object.values(p.members))m.stars=5;p.campXp=campXp;
  const game=depart(p,map,lookup,77),run=game.run;run.dry=5;run.hunt!.misses=11;run.battle={kind:'random',encounterId:map.tutorialEncounterId,entry:{...run.hp},commands:[]};
  const data=battleData(run,map,lookup)!;let battle=battleState(run,map,lookup)!;for(let n=0;battle.outcome==='active'&&n<200;n++)battle=resolveCommand(battle,data,{beat:battle.beat,heroId:currentHeroId(battle,data)!,action:'attack',targetId:targetOptions(battle,data,currentHeroId(battle,data)!,'attack').find(t=>t.valid)!.id}).state;
  if(battle.outcome!=='victory')throw Error('fixture did not win');const last=battle.commands.at(-1)!;run.battle.commands=battle.commands.slice(0,-1);return {raw:JSON.stringify({version:44,...game}),last};
}

for (const mode of ['item', 'level-up', 'cap'] as const) test(`victory rewards ${mode} at 390px`, async ({page}, info) => {
 const levelUp = mode === 'level-up', capped = mode === 'cap';
 await page.setViewportSize({width:390,height:844});
 const p=newProfile(map,17);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;p.hunt={target:'guardian',pity:{guardian:11}};
 const fixture=winningSave(p,capped ? xpAt(map.progression.levelCap) : levelUp ? xpAt(3)-1 : xpAt(2));
 await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('reward-seed')){localStorage.setItem(key,raw);sessionStorage.setItem('reward-seed','1');}},{key,raw:fixture.raw});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('./');await page.locator('#continue').click();if(await page.locator('#start').isVisible())await page.locator('#start').click();await page.locator('#action-attack').click();await page.locator('#target-'+fixture.last.targetId).click();await expect(page.locator('#leave-battle')).toBeVisible({timeout:30000});
 const saved=()=>page.evaluate(k=>localStorage.getItem(k),key);const won=await saved();await page.locator('#leave-battle').click();
 const dialog=page.locator('.battle-rewards');await expect(dialog).toBeVisible();
 await expect(dialog.locator('[data-member="camp"]')).toContainText('เลเวลค่าย');
 await expect(dialog.locator('.portrait, [data-actor]')).toHaveCount(0);
 await expect(dialog.locator('.commander-crest[data-color=gold]')).toBeVisible();
 if(capped){await expect(dialog.locator('.reward-cap')).toContainText('ถึงเลเวลสูงสุด');await expect(dialog).not.toContainText('+0 EXP');await expect(dialog.locator('.reward-exp-meta')).toHaveCount(0);}
 else {await expect(dialog.locator('.reward-gain')).toContainText(/\+\d+ EXP ค่าย/);await expect(dialog.locator('.reward-exp-meta')).toContainText(/อีก \d+ EXP ถึง Lv/);}
 if(levelUp)await expect(dialog.locator('.reward-level').first()).toBeVisible();await expect(dialog.locator('.reward-items li')).toHaveCount(1);await expect(dialog.locator('.reward-resources')).toContainText('เหรียญทอง');
 expect(await dialog.locator('.rewards-scroll').evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);expect(await dialog.locator('.reward-camp').evaluateAll(es=>new Set(es.map(el=>Math.round(el.getBoundingClientRect().top))).size)).toBe(1);await expect(dialog.locator('button')).toBeFocused();await dialog.locator('.reward-items summary').focus();await page.keyboard.press('Enter');await expect(dialog.locator('.reward-items details')).toHaveAttribute('open','');expect(await saved()).toBe(won);await page.keyboard.press('Enter');await expect(dialog.locator('.reward-items details')).not.toHaveAttribute('open','');await dialog.locator('button').focus();expect(errors).toEqual([]);
 await expect(page).toHaveTitle('Asterveil · Fateweave');await expect(page.locator('vite-error-overlay')).toHaveCount(0);
 if(levelUp){await page.emulateMedia({reducedMotion:'no-preference'});expect(await dialog.locator('.reward-camp-crest').evaluate(el=>getComputedStyle(el).animationName)).toBe('camp-level-glow');await page.waitForTimeout(1200);await page.emulateMedia({reducedMotion:'reduce'});expect(await dialog.locator('.reward-exp i').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');}
 await page.screenshot({path:process.env.REWARD_SHOTS ? `${process.env.REWARD_SHOTS}/rewards-${mode}-390.png` : info.outputPath(`rewards-${mode}.png`)});await page.setViewportSize({width:320,height:568});await expect.poll(()=>dialog.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;})).toBe(true);const go=await dialog.locator('button').boundingBox();expect(Math.min(go!.width,go!.height)).toBeGreaterThanOrEqual(44);await page.setViewportSize({width:390,height:844});await page.keyboard.press(levelUp?'Escape':'Enter');await expect(page.locator('#world-view')).toBeVisible();expect(await saved()).toBe(won);
 await page.reload();await page.locator('#continue').click();await expect(dialog).toHaveCount(0);expect(await saved()).toBe(won);
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key,raw:fixture.raw});await page.reload();await page.locator('#continue').click();if(await page.locator('#start').isVisible())await page.locator('#start').click();await page.locator('#action-attack').click();await page.locator('#target-'+fixture.last.targetId).click();await expect(page.locator('#leave-battle')).toBeVisible({timeout:30000});await page.locator('#leave-battle').click();await expect(dialog).toBeVisible();const openSave=await saved();await page.reload();await page.locator('#continue').click();await expect(dialog).toHaveCount(0);expect(await saved()).toBe(openSave);
});
