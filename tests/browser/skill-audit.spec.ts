import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { newProfile, depart } from '../../src/core/world/profile';
import { saveGame, parseGame } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';
const key='asterveil.fateweave.expedition.v1';
test.use({viewport:{width:390,height:844},hasTouch:true});
test('C11: changed skill descriptions, targeting and saved outcome agree at 390px',async({page},info)=>{
 const p=newProfile(map,71);p.tutorialDone=true;p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};
 p.company.push('sefa');p.members.sefa={stars:1,dupes:0,talents:{b1:1,b2d:1,b3:1,c1:1,c1s:1,c2t:1,c3:1},loadout:['ambush','decoy','disarm']}; p.campXp = Math.max(p.campXp, xpAt(10));
 p.party={deployed:['guardian','sefa','weaver','healer'],reserve:['tracer']};
 p.members.guardian={stars:1,dupes:0,talents:{a1:1,a2i:1,a3s:1,c1s:1,c1:1,c2v:1},loadout:['guard','bulwark','rally'],skillLevels:{bulwark:3}}; p.campXp = Math.max(p.campXp, xpAt(10));
 const game=depart(p,map,lookup,82);game.run.battle={kind:'random',encounterId:'veil-siege',entry:Object.fromEntries(game.run.roster.deployed.map(id=>[id,game.run.hp[id]!])),commands:[]};
 let raw='';saveGame({getItem:()=>null,setItem:(_k,v)=>{raw=v;}},game);parseGame(raw,map,lookup);
 await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('audit-seed')){localStorage.setItem(key,raw);sessionStorage.setItem('audit-seed','1');}},{key,raw});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');await expect(page).toHaveTitle(/Asterveil/);await page.locator('#continue').click();
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await expect(page.locator('#hero-sefa')).toHaveAttribute('aria-pressed','true');
 await page.locator('#action-disarm').click();await page.locator('#skill-details').click();
 await expect(page.locator('#skill-popover')).toContainText('ปาดตัดหน้า');await expect(page.locator('#skill-popover')).toContainText('ยังไม่ได้ลงมือ');
 await page.locator('[data-ui=skill-close]').click();await page.locator('#target-f1').click();
 await expect.poll(()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).run.battle.commands.length,key)).toBe(1);
 const saved=await page.evaluate(k=>localStorage.getItem(k)!,key);expect(JSON.parse(saved).version).toBe(45);
 await page.screenshot({path:info.outputPath('c11-battle-390.png')});
 await page.reload();await page.locator('#continue').click();expect(await page.evaluate(k=>localStorage.getItem(k)!,key)).toBe(saved);
 expect(errors).toEqual([]);
});

test('C11: character sheet shows levelled row protection as a percent, inspection keeps the save',async({page},info)=>{
 const p=newProfile(map,73);p.tutorialDone=true;p.cleared=['ruined-border','deep-forest','veil-frontier'];p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};
 p.members.guardian={stars:1,dupes:0,talents:{a1:1,a2i:1,a3s:1},loadout:['guard','bash','bulwark'],skillLevels:{bulwark:3}}; p.campXp = Math.max(p.campXp, xpAt(10));
 let raw='';saveGame({getItem:()=>null,setItem:(_k,v)=>{raw=v;}},{profile:p,run:null});
 await page.addInitScript(({key,raw})=>localStorage.setItem(key,raw),{key,raw});await page.goto('./');await page.locator('#continue').click();
 await page.locator('#lobby-tab-team').click();await page.locator('#lobby-member-guardian').click();await page.locator('#lobby-gear-open').click();await page.locator('#camp-character-tab-skills').click();
 await expect(page.locator('#camp-character-content')).toContainText('กำแพงโล่');await expect(page.locator('#camp-character-content')).toContainText('34');
 await page.locator('#camp-character-content [data-skill=bulwark]').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('c11-character-390.png')});expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).profile.members.guardian.skillLevels.bulwark,key)).toBe(3);
});
