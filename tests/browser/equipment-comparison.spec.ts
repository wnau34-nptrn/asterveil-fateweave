import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';
import { memberDef, wear } from '../../src/core/world/world';
import { parseGame } from '../../src/core/save/expedition-save';
import { characterSkillMetric } from '../../src/ui/character-metrics';

const key='asterveil.fateweave.expedition.v1', template=lookup(map.tutorialEncounterId)!;
for(const [width,height,touch] of [[320,568,true],[390,844,true],[1366,768,false]] as const) {
  test(`character stat help and equipment/skill comparison remain readonly until equip at ${width}x${height}`,async({browser},info)=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),page=await context.newPage(),errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const profile=newProfile(map,77);profile.tutorialDone=true;profile.commander={name:'อารี',crest:'star',color:'gold', camp: 'ค่ายอารี'};
    profile.members.guardian={stars:3,dupes:0,level:6,exp:0,talents:{a1:2},gear:{body:{uid:1,slot:'body',rarity:0,level:2,affixes:[],set:'shadow'},weapon:{uid:2,slot:'weapon',hero:'guardian',rarity:0,level:1,affixes:[],set:'dawn'},boots:{uid:3,slot:'boots',rarity:0,level:1,affixes:[],set:'dawn'}}};profile.nextItem=4;
    profile.company.push('lio');profile.members.lio={stars:3,dupes:0,level:6,exp:0};profile.party.reserve=['lio'];
    const game=depart(profile,map,lookup,1234);game.run.hp.guardian=11;
    game.run.found=[{uid:0,slot:'weapon',hero:'guardian',rarity:1,level:8,affixes:['leech'],set:'shadow',plus:3},{uid:0,slot:'weapon',hero:'tracer',rarity:0,level:1,affixes:[]},{uid:0,slot:'charm',rarity:1,level:6,affixes:['support']}];
    const raw=JSON.stringify({version:34,...game});parseGame(raw,map,lookup);
    await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('compare-seeded')){localStorage.setItem(key,raw);sessionStorage.setItem('compare-seeded','yes');}},{key,raw});
    const saved=()=>page.evaluate(k=>localStorage.getItem(k)!,key);
    await page.goto('./');await page.locator('#continue').click();await page.locator('#world-hero-guardian').click();
    const initial=await saved();
    await page.locator('#character-stat-support summary').click();await expect(page.locator('#character-stat-support p')).toContainText('ไม่เพิ่มดาเมจ');
    await page.locator('#character-stat-armour summary').click();await expect(page.locator('#character-stat-armour p')).toContainText('ไม่เกิน 30%');
    await page.screenshot({path:info.outputPath('stat-help.png')});
    await page.locator('#character-tab-skills').click();await expect(page.locator('.character-skills [data-skill=bash]')).toContainText('อิงพลังโจมตี');
    await expect(page.locator('.character-skills [data-skill=rally]')).toContainText('ผลพิเศษ');
    await page.locator('#character-tab-gear').click();await page.locator('#pick-found-1').click();await expect(page.locator('#compare-found-1')).toBeDisabled();
    await page.locator('#pick-found-0').click();await page.locator('#compare-found-0').click();await expect(page.locator('#comparison-title')).toBeVisible();
    const expected=wear(game.run,map,lookup,'guardian','found',0).state,h=memberDef(lookup,map,expected.members,'guardian')!;
    await expect(page.locator('[data-stat=attack] td').nth(1)).toHaveText(String(h.attack));
    await page.locator('[data-stat=attack]').scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('stat-comparison.png')});
    const afterPower=characterSkillMetric('bash',h,template).value;
    await expect(page.locator('.comparison-skills [data-skill=bash] summary')).toContainText(`→ ${afterPower}`);
    await page.locator('.comparison-skills [data-skill=bash] summary').click();await expect(page.locator('.comparison-skills [data-skill=bash]')).toContainText('ทดลอง:');
    await expect(page.locator('.comparison-effects')).toContainText('2 ชิ้น ทำงาน');await expect(page.locator('.comparison-effects')).toContainText('2 ชิ้น ยังไม่ครบ');
    await page.screenshot({path:info.outputPath('gear-comparison.png')});
    if(touch){
      await page.setViewportSize({width:844,height:390});await expect(page.locator('#orientation-gate')).toBeVisible();
      await page.locator('#comparison-equip').dispatchEvent('click');expect(await saved()).toBe(initial);
      await page.setViewportSize({width,height});await expect(page.locator('#orientation-gate')).not.toBeVisible();await expect(page.locator('#comparison-title')).toBeVisible();
    }
    await page.keyboard.press('w');await page.keyboard.press('b');expect(await saved()).toBe(initial);
    await page.keyboard.press('Escape');await expect(page.locator('#comparison-title')).toHaveCount(0);await expect(page.locator('#compare-found-0')).toBeFocused();
    await page.locator('#compare-found-0').click();await page.locator('#comparison-equip').click();
    const equipped=parseGame(await saved(),map,lookup).run!;expect(equipped.hp.guardian).toBe(11);expect(equipped.members.guardian!.gear!.weapon!.level).toBe(8);
    expect(equipped.steps).toBe(game.run.steps);expect(equipped.rolls).toBe(game.run.rolls);
    await page.locator('#character-tab-overview').click();await expect(page.locator('#character-stat-attack strong')).toHaveText(String(h.attack));
    await page.locator('#character-tab-skills').click();await expect(page.locator('.character-skills [data-skill=bash] .skill-metric strong')).toHaveText(String(afterPower));
    // Support equipment changes both song healing and the healing branch of Finale.
    await page.locator('#character-member-lio').click();await page.locator('#character-tab-gear').click();
    const supportIndex=equipped.found.findIndex(i=>i.slot==='charm'),beforeSupport=await saved();
    await page.locator(`#pick-found-${supportIndex}`).click();await page.locator(`#compare-found-${supportIndex}`).click();
    const proposed=wear(equipped,map,lookup,'lio','found',supportIndex).state,nextLio=memberDef(lookup,map,proposed.members,'lio')!;
    const finale=characterSkillMetric('finale',nextLio,template);
    await expect(page.locator('.comparison-skills [data-skill=finale] summary')).toContainText(`→ ${finale.secondary!.value}`);
    await page.locator('.comparison-skills [data-skill=finale] summary').scrollIntoViewIfNeeded();
    await expect.poll(()=>page.locator('#character-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await expect.poll(()=>page.locator('#comparison-equip').evaluate(el=>{const r=el.getBoundingClientRect(),a=document.querySelector('#app')!.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=a.left&&r.right<=a.right&&r.bottom<=a.bottom&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
    await page.screenshot({path:info.outputPath('support-skill-comparison.png')});
    await page.locator('#comparison-back').click();expect(await saved()).toBe(beforeSupport);
    await page.reload();await page.locator('#continue').click();await page.locator('#world-hero-guardian').click();
    await expect(page.locator('#character-stat-attack strong')).toHaveText(String(h.attack));
    expect(errors).toEqual([]);await context.close();
  });
}
