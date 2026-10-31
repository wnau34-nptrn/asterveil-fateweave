import { expect, test } from '@playwright/test';
import { chapterOne } from '../../src/content/world/chapter1';
import { forestMap } from '../../src/content/world/chapter-forest';
import { ruinsMap } from '../../src/content/world/chapter-ruins';
import { MAPS } from '../../src/content/world/maps';
import { encounterById } from '../../src/content/encounters/catalog';
import { createBattle } from '../../src/core/battle/engine';
import { newExpedition } from '../../src/core/world/world';
import { newProfile } from '../../src/core/world/profile';
import { legacyEnvelope } from '../fixtures/legacy-save';

// Review screenshots of the release-A art intake (battle backdrops per map, forest tiles, chapter-1 region map).
// Run with REGION_SHOTS=<dir> npx playwright test tests/browser/region-shots.spec.ts
const dir = process.env.REGION_SHOTS;
const key = 'asterveil.fateweave.expedition.v1';
const commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
const open = async (browser: import('@playwright/test').Browser, raw: string) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 }), page = await context.newPage();
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('seeded', '1'); } }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click(); return { context, page };
};
for (const [name, map, enc] of [['forest', forestMap, 'beetle-spore'], ['riftline', chapterOne, 'veil-siege']] as const) {
  test(`backdrop ${name} 390x844`, async ({ browser }) => {
    test.skip(!dir, 'set REGION_SHOTS to a folder');
    const data = encounterById(enc)!, hp = Object.fromEntries(data.heroes.map(h => [h.id, h.maxHp]));
    const run = newExpedition(MAPS.find(m => m.id === map.id)!, encounterById, 1234); run.tutorialDone = true;
    run.battle = { kind: 'random', encounterId: data.id, entry: hp, commands: createBattle(data, { hp }).commands };
    const profile = { ...newProfile(chapterOne, 5), tutorialDone: true, commander };
    const { context, page } = await open(browser, JSON.stringify(legacyEnvelope({ version: 21, profile, run })));
    const start = page.locator('[data-ui=start]'); if (await start.isVisible().catch(() => false)) await start.click();
    await expect(page.locator('#action-attack')).toBeEnabled(); await page.waitForTimeout(400);
    await page.screenshot({ path: `${dir}/backdrop-${name}-390.png` });
    await context.close();
  });
}
test('forest tiles 390x844', async ({ browser }) => {
  test.skip(!dir, 'set REGION_SHOTS to a folder');
  const run = newExpedition(forestMap, encounterById, 1234); run.tutorialDone = true;
  const profile = { ...newProfile(chapterOne, 5), tutorialDone: true, commander };
  const { context, page } = await open(browser, JSON.stringify(legacyEnvelope({ version: 21, profile, run })));
  await expect(page.locator('#map-grid')).toBeVisible(); await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/forest-tiles-390.png` });
  await context.close();
});
test('region map 390x844', async ({ browser }) => {
  test.skip(!dir, 'set REGION_SHOTS to a folder');
  const profile = { ...newProfile(chapterOne, 5), commander, tutorialDone: true, veteran: true as const, cleared: [ruinsMap.id] };
  const { context, page } = await open(browser, JSON.stringify(legacyEnvelope({ version: 33, profile, run: null })));
  await page.locator('#lobby-maps').click(); await expect(page.locator('.region-map')).toBeVisible(); await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/region-map-390.png` });
await page.locator('#map-node-veil-frontier').click(); await expect(page.locator('#map-node-veil-frontier')).toHaveAttribute('data-picked', 'true'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/region-map-locked-390.png` });
  await context.close();
});
