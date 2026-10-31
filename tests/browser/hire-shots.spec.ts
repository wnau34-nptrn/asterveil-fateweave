import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { legacyEnvelope } from '../fixtures/legacy-save';

// Review screenshots of the hire board for the owner (not a gameplay check).
// Run with HIRE_SHOTS=<dir> npx playwright test tests/browser/hire-shots.spec.ts
const dir = process.env.HIRE_SHOTS;
const key = 'asterveil.fateweave.expedition.v1';
test('hire shots 390x844', async ({ browser }) => {
  test.skip(!dir, 'set HIRE_SHOTS to a folder');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 }), page = await context.newPage();
  const profile = newProfile(map, 17); profile.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; profile.tutorialDone = true; profile.completes = 9; profile.veteran = true; profile.bank = { ore: 50, dust: 5, gold: 2480, seal: 1 };
  const raw = JSON.stringify(legacyEnvelope({ version: 23, profile, run: null }));
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('hire-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('hire-seeded', '1'); } }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-hire').click(); await expect(page.locator('.hire-board')).toBeVisible(); await page.waitForTimeout(200);
  await page.screenshot({ path: `${dir}/hire-390.png` });
  await context.close();
});
