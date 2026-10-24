import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';

// Review screenshots of the camp lobby for the owner (not a gameplay check).
// Run with LOBBY_SHOTS=<dir> npx playwright test tests/browser/lobby-shots.spec.ts
const dir = process.env.LOBBY_SHOTS;
const key = 'asterveil.fateweave.expedition.v1';
test('lobby shots 390x844', async ({ browser }) => {
  test.skip(!dir, 'set LOBBY_SHOTS to a folder');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 }), page = await context.newPage();
  const profile = newProfile(map, 17); profile.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; profile.tutorialDone = true; profile.completes = 9; profile.veteran = true; profile.bank = { ore: 50, dust: 5, gold: 2480, seal: 1 };
  const raw = JSON.stringify({ version: 23, profile, run: null });
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('lobby-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('lobby-seeded', '1'); } }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click();
  await expect(page.locator('#lobby-depart')).toBeVisible(); await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/lobby-390.png` });
  await context.close();
});
