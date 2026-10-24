import {expect,test} from '@playwright/test';
import {chapterOne as map} from '../../src/content/world/chapter1';
import {encounterById as lookup} from '../../src/content/encounters/catalog';
import {newProfile,depart} from '../../src/core/world/profile';
import {battleData,battleState,expToNext} from '../../src/core/world/world';
import {currentHeroId,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {Profile} from '../../src/core/world/types';
const key='asterveil.fateweave.expedition.v1';
function winningSave(p:Profile){
  p=structuredClone(p);for(const m of Object.values(p.members)){m.stars=5;m.level=2;m.exp=expToNext(map,2)-1;}
  const game=depart(p,map,lookup,77),run=game.run;run.dry=5;run.hunt!.misses=11;run.battle={kind:'random',encounterId:map.tutorialEncounterId,entry:{...run.hp},commands:[]};
  const data=battleData(run,map,lookup)!;let battle=battleState(run,map,lookup)!;for(let n=0;battle.outcome==='active'&&n<200;n++)battle=resolveCommand(battle,data,{beat:battle.beat,heroId:currentHeroId(battle,data)!,action:'attack',targetId:targetOptions(battle,data,currentHeroId(battle,data)!,'attack').find(t=>t.valid)!.id}).state;
  if(battle.outcome!=='victory')throw Error('fixture did not win');const last=battle.commands.at(-1)!;run.battle.commands=battle.commands.slice(0,-1);return {raw:JSON.stringify({version:25,...game}),last};
}

for (const levelUp of [false, true]) test(`victory rewards ${levelUp ? 'level-up' : 'item'} at 390px`, async ({page}, info) => {
 await page.setViewportSize({width:390,height:844});
 const p=newProfile(map,17);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;p.hunt={target:'guardian',pity:{guardian:11}};
 const fixture=winningSave(p);if(!levelUp){const parsed=JSON.parse(fixture.raw);for(const m of Object.values(parsed.run.members) as {exp:number}[])m.exp=0;fixture.raw=JSON.stringify(parsed);}
 await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('reward-seed')){localStorage.setItem(key,raw);sessionStorage.setItem('reward-seed','1');}},{key,raw:fixture.raw});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');await page.locator('#continue').click();if(await page.locator('#start').isVisible())await page.locator('#start').click();await page.locator('#action-attack').click();await page.locator('#target-'+fixture.last.targetId).click();await expect(page.locator('#leave-battle')).toBeVisible({timeout:30000});
 const saved=()=>page.evaluate(k=>localStorage.getItem(k),key);const won=await saved();await page.locator('#leave-battle').click();
 const dialog=page.locator('.battle-rewards');await expect(dialog).toBeVisible();
 const before=JSON.parse(fixture.raw);for(const id of Object.keys(before.run.members))await expect(dialog.locator(`[data-member="${id}"]`)).toContainText(/\+\d+ EXP/);
 if(levelUp)await expect(dialog.locator('.reward-level').first()).toBeVisible();await expect(dialog.locator('.reward-items li')).toHaveCount(1);await expect(dialog.locator('.reward-resources')).toContainText('เหรียญทอง');
 await expect(dialog.locator('button')).toBeFocused();await dialog.locator('.reward-items summary').click();await expect(dialog.locator('.reward-items details')).toHaveAttribute('open','');await dialog.locator('.reward-items summary').click();expect(errors).toEqual([]);await page.screenshot({path:info.outputPath(levelUp?'rewards-level-up.png':'rewards-item.png')});await page.keyboard.press(levelUp?'Escape':'Enter');await expect(page.locator('#world-view')).toBeVisible();expect(await saved()).toBe(won);
 await page.reload();await page.locator('#continue').click();await expect(dialog).toHaveCount(0);expect(await saved()).toBe(won);
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key,raw:fixture.raw});await page.reload();await page.locator('#continue').click();if(await page.locator('#start').isVisible())await page.locator('#start').click();await page.locator('#action-attack').click();await page.locator('#target-'+fixture.last.targetId).click();await expect(page.locator('#leave-battle')).toBeVisible({timeout:30000});await page.locator('#leave-battle').click();await expect(dialog).toBeVisible();const openSave=await saved();await page.reload();await page.locator('#continue').click();await expect(dialog).toHaveCount(0);expect(await saved()).toBe(openSave);
});
