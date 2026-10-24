import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';
import { saveGame } from '../../src/core/save/expedition-save';
import { memberDef } from '../../src/core/world/world';
import { characterSkillMetric } from '../../src/ui/character-metrics';
const key='asterveil.fateweave.expedition.v1';
test('390px mage spells and shields display Magic Power and remain readonly on inspection/reload',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});
 const p=newProfile(map,17);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;
 p.members.weaver={stars:1,dupes:0,level:4,exp:0,talents:{a1:1,c1:1},gear:{weapon:{uid:1,slot:'weapon',hero:'weaver',level:3,rarity:1,affixes:['support']}}};p.nextItem=2;
 const game=depart(p,map,lookup,77);let raw='';saveGame({getItem:()=>null,setItem:(_k,v)=>raw=v},game);
 await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('magic-seed')){localStorage.setItem(key,raw);sessionStorage.setItem('magic-seed','1');}},{key,raw});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');await page.locator('#continue').click();await page.locator('#world-hero-weaver').click();
 const saved=()=>page.evaluate(k=>localStorage.getItem(k),key),before=await saved();
 await page.locator('#character-stat-support summary').click();await expect(page.locator('#character-stat-support')).toContainText('พลังเวท');await expect(page.locator('#character-stat-support')).toContainText('เพิ่มดาเมจเวท');
 await page.locator('#character-tab-skills').click();const h=memberDef(lookup,map,game.run.members,'weaver')!,data=lookup(map.tutorialEncounterId)!;
 for(const action of ['bolt','ward'] as const){const card=page.locator(`.character-skills [data-skill=${action}]`);await expect(card).toContainText('อิงพลังเวท');await expect(card).toContainText(String(characterSkillMetric(action,h,data).value));}
 await page.screenshot({path:info.outputPath('mage-magic-power-390.png')});
 expect(await saved()).toBe(before);await page.keyboard.press('Escape');await page.reload();await page.locator('#continue').click();expect(await saved()).toBe(before);expect(errors).toEqual([]);
});
