import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';
import { affixPool } from '../../src/core/world/equipment';
import { parseGame } from '../../src/core/save/expedition-save';

const key = 'asterveil.fateweave.expedition.v1';
async function open(page: Page) {
  const profile = newProfile(map, 123); profile.tutorialDone = true; profile.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  profile.members.guardian = { stars: 1, dupes: 0, level: 6, exp: 0, gear: { body: { uid: 1, slot: 'body', rarity: 0, level: 1, affixes: [] } } }; profile.nextItem = 2;
  profile.members.weaver!.level = 3; profile.members.weaver!.exp = 0;
  profile.company.push('mira'); profile.members.mira = { stars: 1, dupes: 0, level: 2, exp: 0 }; profile.party.reserve = ['mira'];
  const game = depart(profile, map, encounterById, 1234); game.run.hp.guardian = 11; game.run.hp.healer = 0;
  game.run.found = [{ uid: 0, slot: 'body', rarity: 3, level: 4, affixes: affixPool(map.equipment, 'body').slice(0, 3) }, { uid: 0, slot: 'weapon', hero: 'tracer', rarity: 0, level: 2, affixes: [] }];
  const raw = JSON.stringify({ version: 21, ...game }); parseGame(raw, map, encounterById);
  await page.addInitScript(({key,raw}) => { if (!sessionStorage.getItem('character-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('character-seeded', 'yes'); } }, {key,raw});
  await page.goto('./'); await page.locator('#continue').click(); await expect(page.locator('#world-view')).toBeVisible();
}
const saved = (page: Page) => page.evaluate(k => localStorage.getItem(k)!, key);

for (const [width,height,touch] of [[320,568,true], [390,844,true], [1366,768,false]] as const) {
  test(`map character: spend, equip, inspect and resume safely at ${width}x${height}`, async ({browser}, info) => {
    const context = await browser.newContext({viewport:{width,height},hasTouch:touch,reducedMotion:'reduce'}), page = await context.newPage(), errors:string[]=[];
    page.on('pageerror', e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
    await open(page);
    await expect(page.locator('#world-hero-guardian .portrait')).toBeVisible();
    await expect(page.locator('#world-hero-guardian .world-talent-badge')).toBeVisible();
    const before = parseGame(await saved(page), map, encounterById).run!;
    await page.locator('#world-hero-guardian').click(); await expect(page.locator('#character-dialog')).toBeVisible();
    await expect(page.locator('#character-tab-overview')).toHaveAttribute('aria-selected','true');
    await page.screenshot({path:info.outputPath('character-overview.png')});
    await page.keyboard.press('End'); await expect(page.locator('#character-tab-talents')).toBeFocused();
    // The Knight's big tree (A6): tier 2 needs a rank in the branch's tier 1. A node tap only selects; its card spends.
    await expect(page.locator('#character-talent-a2i')).toHaveAttribute('data-state','locked');
    await page.locator('#character-talent-a2i').click(); await expect(page.locator('#character-talent-learn')).toHaveAttribute('aria-disabled','true');
    await page.locator('#character-talent-c1s').click(); expect(parseGame(await saved(page),map,encounterById).run!.members.guardian!.talents).toBeUndefined();
    await page.locator('#character-talent-learn').click();
    await expect(page.locator('#character-talent-c1s')).toHaveAttribute('data-state','full'); await expect(page.locator('#character-talent-learn')).toHaveAttribute('aria-disabled','true');
    await page.locator('#character-talent-b1').click(); await page.locator('#character-talent-learn').focus(); await page.keyboard.down('Enter'); await page.keyboard.down('Enter'); await page.keyboard.up('Enter');
    expect(parseGame(await saved(page),map,encounterById).run!.members.guardian!.talents).toEqual({c1s:1,b1:1});
    await expect(page.locator('#character-loadout-rally')).toHaveAttribute('aria-pressed','true');
    await page.locator('#character-loadout-bash').click();
    expect(parseGame(await saved(page),map,encounterById).run!.members.guardian!.loadout).toEqual(['guard','rally']);
    await page.locator('#move-left').dispatchEvent('click'); await page.keyboard.press('w'); await page.keyboard.press('b'); await page.keyboard.press('i');
    const after = parseGame(await saved(page),map,encounterById).run!;
    expect(after.hp.guardian).toBe(11); expect(after.steps).toBe(before.steps); expect(after.rolls).toBe(before.rolls); expect(after.position).toEqual(before.position);
    await page.locator('#character-member-mira').click(); await page.locator('#character-talent-root').click();
    expect(parseGame(await saved(page),map,encounterById).run!.members.mira!.talents).toEqual({root:1});
    await page.locator('#character-member-healer').click(); await expect(page.locator('#character-talent-root')).toHaveAttribute('aria-disabled','true');
    await page.locator('#character-member-guardian').click(); await page.screenshot({path:info.outputPath('character-talents.png')});
    await page.locator('#character-tab-skills').click(); await expect(page.locator('#character-content')).toContainText('ปลดที่โหนด ท้าดวล'); await expect(page.locator('#character-content')).toContainText('ปลดที่โหนด ยืนหยัด');
    await page.screenshot({path:info.outputPath('character-skills.png')});
    await page.locator('#character-tab-gear').click(); await page.locator('#pick-found-1').click(); await expect(page.locator('#wear-found-1')).toBeDisabled();
    await page.locator('#pick-found-0').click(); await page.locator('#wear-found-0').click();
    let current = parseGame(await saved(page),map,encounterById).run!;
    expect(current.members.guardian!.gear!.body!.rarity).toBe(3); expect(current.spare[0]!.uid).toBe(1); expect(current.hp.guardian).toBe(11);
    await page.locator('#bag-slot-body').click(); await page.locator('#bag-takeoff').click();
    await page.locator('#pick-spare-0').click(); await page.locator('#wear-spare-0').click(); current = parseGame(await saved(page),map,encounterById).run!;
    expect(current.members.guardian!.gear!.body!.uid).toBe(1); expect(current.spare).toEqual([]);
    await page.screenshot({path:info.outputPath('character-gear.png')});
    expect(await page.locator('#character-dialog').evaluate(el => { const r=el.getBoundingClientRect(),a=document.querySelector('#app')!.getBoundingClientRect(); return r.left>=a.left-1&&r.right<=a.right+1&&r.top>=a.top-1&&r.bottom<=a.bottom+1&&el.scrollWidth<=el.clientWidth; })).toBe(true);
    for(const selector of ['#character-tab-overview','#character-tab-gear','#character-tab-skills','#character-tab-talents','#character-member-mira']) expect(await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44;})).toBe(true);
    await page.keyboard.press('Escape'); await expect(page.locator('#world-hero-guardian')).toBeFocused();
    await page.screenshot({path:info.outputPath('character-map-entry.png')});
    await page.reload(); await page.locator('#continue').click(); await page.locator('#world-hero-guardian').click(); await page.locator('#character-tab-talents').click();
    await expect(page.locator('#character-talent-b1 i')).toHaveText('1/2');
    await page.keyboard.press('Escape'); await page.locator('#world-pack').click(); await page.locator('#bag-tab-gear').click(); await page.locator('#bag-member-guardian').click();
    await expect(page.locator('#pack-dialog')).not.toBeVisible(); await page.keyboard.press('Escape');
    await expect(page.locator('#pack-dialog')).toBeVisible(); await expect(page.locator('#bag-member-guardian')).toBeFocused(); await expect(page.locator('#bag-tab-gear')).toHaveAttribute('aria-selected','true');
    await page.keyboard.press('Escape'); await expect(page.locator('#world-pack')).toBeFocused();
    expect(JSON.parse(await saved(page)).version).toBe(36); expect(errors).toEqual([]); await context.close();
  });
}

test('touch: portrait resize and rotation preserve character tabs and block passive spending behind the rotation gate', async ({browser}) => {
  const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}), page = await context.newPage();
  await open(page); await page.locator('#world-hero-guardian').tap(); await page.locator('#character-tab-talents').tap();
  const before = await saved(page);
  await page.setViewportSize({width:320,height:568}); await expect(page.locator('#character-tab-talents')).toHaveAttribute('aria-selected','true');
  await page.setViewportSize({width:844,height:390}); await expect(page.locator('#orientation-gate')).toBeVisible();
  await page.locator('#character-talent-c1s').dispatchEvent('click'); await page.locator('#character-talent-learn').dispatchEvent('click'); await page.locator('#character-dialog [data-world=character-close]').dispatchEvent('click'); await page.keyboard.press('Escape');
  expect(await saved(page)).toBe(before);
  await page.setViewportSize({width:390,height:844}); await expect(page.locator('#character-dialog')).toBeVisible();
  await expect(page.locator('#character-tab-talents')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#character-talent-c1s i')).toHaveText('0/1'); await context.close();
});
