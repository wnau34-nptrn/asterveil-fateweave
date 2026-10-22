import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';
import { affixPool, GEAR_SPECIALS } from '../../src/core/world/equipment';
import { parseGame } from '../../src/core/save/expedition-save';

// Review screenshots of the A7 character sheet for the owner (not a gameplay check).
// Run with UI_SHOTS=<dir> npx playwright test tests/browser/ui-shots.spec.ts
const dir = process.env.UI_SHOTS;
const key = 'asterveil.fateweave.expedition.v1';
async function open(page: Page) {
  const profile = newProfile(map, 123); profile.tutorialDone = true; profile.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  const pool = (slot: 'weapon'|'body'|'head'|'gloves'|'boots'|'charm', hero = 'guardian') => affixPool(map.equipment, slot, slot === 'weapon' ? hero : undefined);
  profile.members.guardian = { stars: 2, dupes: 0, level: 6, exp: 0, talents: { a1: 1, b1: 1 }, gear: {
    weapon: { uid: 1, slot: 'weapon', hero: 'guardian', rarity: 2, level: 5, plus: 2, affixes: pool('weapon').slice(0, 2), set: 'dawn' },
    body: { uid: 2, slot: 'body', rarity: 1, level: 4, affixes: pool('body').slice(0, 1) },
    head: { uid: 3, slot: 'head', rarity: 2, level: 5, affixes: pool('head').slice(0, 2), set: 'dawn' },
    charm: { uid: 4, slot: 'charm', rarity: 3, level: 6, affixes: pool('charm').slice(0, 3) } } };
  profile.nextItem = 5;
  const game = depart(profile, map, encounterById, 1234);
  game.run.found = [
    { uid: 0, slot: 'weapon', hero: 'guardian', rarity: 3, level: 6, plus: 4, affixes: pool('weapon').slice(0, 3), set: 'dawn' },
    { uid: 0, slot: 'body', rarity: 3, level: 4, affixes: pool('body').slice(0, 3), set: 'wind' },
    { uid: 0, slot: 'head', rarity: 1, level: 6, affixes: pool('head').slice(0, 1) },
    { uid: 0, slot: 'gloves', rarity: 2, level: 6, affixes: pool('gloves').slice(0, 2) },
    { uid: 0, slot: 'charm', rarity: 4, level: 6, affixes: pool('charm').slice(0, 3), special: GEAR_SPECIALS[0] },
    { uid: 0, slot: 'boots', rarity: 0, level: 3, affixes: [] },
    { uid: 0, slot: 'weapon', hero: 'tracer', rarity: 1, level: 2, affixes: pool('weapon', 'tracer').slice(0, 1) },
  ];
  const raw = JSON.stringify({ version: 35, ...game }); parseGame(raw, map, encounterById);
  await page.addInitScript(({key,raw}) => { if (!sessionStorage.getItem('shots-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('shots-seeded', 'yes'); } }, {key,raw});
  await page.goto('./'); await page.locator('#continue').click(); await expect(page.locator('#world-view')).toBeVisible();
}

for (const [width,height] of [[390,844],[320,568]] as const) {
  test(`ui shots ${width}x${height}`, async ({browser}) => {
    test.skip(!dir, 'set UI_SHOTS to a folder');
    const context = await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce',deviceScaleFactor:2}), page = await context.newPage();
    await open(page);
    const shot = async (name: string, full = false) => {
      await page.waitForTimeout(150); await page.screenshot({path:`${dir}/${name}-${width}.png`});
      if (!full) return;
      await page.locator('#character-content').evaluate(el => el.scrollTo(0, el.scrollHeight)); await page.waitForTimeout(100);
      await page.screenshot({path:`${dir}/${name}-${width}-end.png`});
    };
    // Scroll the sheet so an element sits `off` px below the content top (never scrolls the dialog itself).
    const to = (sel: string, off: number) => page.locator(sel).first().evaluate((el, off) => { const c = document.querySelector('#character-content')!; c.scrollTop += el.getBoundingClientRect().top - c.getBoundingClientRect().top - off; }, off);
    await page.locator('#world-hero-guardian').click(); await expect(page.locator('#character-dialog')).toBeVisible();
    await page.locator('#character-tab-gear').click(); await shot('gear', true);
    await page.locator('#character-content').evaluate(el => el.scrollTo(0, 0));
    const pick = page.locator('#pick-found-0');
    if (await pick.count()) { await pick.click(); await to('.item-card:not(.worn-card)', 120); await shot('gear-picked'); await page.locator('#bag-slot-weapon').click(); await to('.worn-card', 120); await shot('gear-worn'); await page.locator('#bag-slot-weapon').click(); await page.locator('#gear-chips, .gear-extra-filters summary').first().click(); await to('.gear-chips', 8); await shot('gear-filters'); await page.locator('.gear-extra-filters summary').click(); }
    await page.locator('#compare-found-0').click(); await page.locator('#character-content').evaluate(el => el.scrollTo(0, 0)); await shot('compare', true);
    await to('.compare-card', 8); await shot('compare-mid');
    await page.locator('#comparison-back').click();
    await page.locator('.auto-settings summary').click(); await page.locator('#auto-preview').click(); await page.locator('#character-content').evaluate(el => el.scrollTo(0, 0)); await shot('auto');
    await page.locator('#comparison-back').click();
    await page.locator('#character-tab-talents').click(); await page.locator('#character-content').evaluate(el => el.scrollTo(0, 0)); await shot('tree', true);
    await page.locator('#character-talent-a2i').click(); await page.locator('#character-talent-learn').click(); await page.locator('#character-talent-b2').click(); await page.locator('#character-content').evaluate(el => el.scrollTo(0, 0)); await shot('tree-learned');
    await page.locator('#character-tab-skills').click(); await page.locator('#character-content').evaluate(el => el.scrollTo(0, 0)); await shot('skills');
    await context.close();
  });
}
