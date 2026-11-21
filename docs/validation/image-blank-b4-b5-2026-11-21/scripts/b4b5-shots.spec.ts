import { test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';

// Owner-review captures for B4/B5 (390px, DPR 3). Output: SHOTS_DIR (default test-results/b4b5).
const out = process.env.SHOTS_DIR ?? 'test-results/b4b5';
const key = 'asterveil.fateweave.expedition.v1';
const profile = () => { const p = newProfile(map, 17); p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } as never; p.tutorialDone = true; return p; };
const campSave = () => JSON.stringify({ version: 44, profile: profile(), run: null });
const mapSave = () => { const g = depart(profile(), map, lookup, 77); g.run.tutorialDone = true; g.run.repel = 10; return JSON.stringify({ version: 44, ...g }); };
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, reducedMotion: 'no-preference' });
const seed = (page: Page, raw: string) => page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });

for (const mode of ['lossless', 'lossy']) {
  test(`map ${mode}`, async ({ page }) => {
    if (mode === 'lossless') for (const n of ['tileset', 'decor']) await page.route(`**/assets/world/${n}.webp*`, r => r.fulfill({ body: readFileSync(`assets-master/world/${n}.webp`), contentType: 'image/webp' }));
    await seed(page, mapSave()); await page.goto('./'); await page.locator('#continue').click();
    await page.locator('#world-view').waitFor({ state: 'visible' }); await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/map-${mode}.png` });
  });
}
test('placeholders', async ({ page }) => {
  let release = () => {}; const open = new Promise<void>(r => { release = r; });
  await page.route('**/assets/title/title_party.webp', async r => { await open; await r.continue(); });
  await page.route('**/assets/lobby/lobby_bg.webp', async r => { await open; await r.continue(); });
  await seed(page, campSave()); await page.goto('./', { waitUntil: 'commit' });
  await page.locator('.title-stage.lqip-on').waitFor(); await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/title-placeholder.png` });
  await page.locator('#continue').click();
  await page.locator('#lobby-depart').waitFor({ timeout: 8000 }); await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/camp-placeholder.png` });
  release(); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/camp-loaded.png` });
});
