import { test, expect, type Browser } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame, SAVE_VERSION } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';
const key = 'asterveil.fateweave.expedition.v1';

// UX audit P2-1: arriving in the camp, the scene comes first and the HUD settles in after it; it never blocks input
// and does not replay on later redraws. The project runs with reduced motion; these tests opt back in for one case.
async function open(browser: Browser, reducedMotion: 'reduce' | 'no-preference') {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion })).newPage();
  const p = newProfile(map, 17); p.tutorialDone = true; p.veteran = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p.campXp = xpAt(6); p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  const raw = JSON.stringify({ version: SAVE_VERSION, profile: p, run: null }); parseGame(raw, map, lookup);
  await page.addInitScript(({ key, raw }) => { localStorage.setItem(key, raw); }, { key, raw });
  await page.goto('./');
  return page;
}
const hudAnims = (page: Awaited<ReturnType<typeof open>>) => page.evaluate(() => ['.lobby-top', '.lobby-boards', '.lobby-trip', '.lobby-menu'].map(s => document.querySelector(s)?.getAnimations().length ?? -1));

test('the camp HUD settles in after the scene, stays usable and does not replay', async ({ browser }) => {
  const page = await open(browser, 'no-preference');
  await page.locator('#continue').click(); await expect(page.locator('#lobby-depart')).toBeAttached();
  expect(await hudAnims(page)).toEqual([1, 1, 1, 1]);
  const delay = await page.locator('.lobby-top').evaluate(e => e.getAnimations()[0]!.effect!.getTiming().delay);
  expect(delay).toBeGreaterThanOrEqual(80);
  await page.locator('#lobby-tab-characters').click();   // live during the reveal
  await expect(page.locator('#camp-character-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(() => hudAnims(page), { timeout: 1000 }).toEqual([0, 0, 0, 0]);
  await page.locator('#lobby-gacha').click(); await page.keyboard.press('Escape');
  expect(await hudAnims(page)).toEqual([0, 0, 0, 0]);
  expect(await page.locator('.lobby-menu').evaluate(e => getComputedStyle(e).opacity)).toBe('1');
});

test('reduced motion: the HUD appears at once', async ({ browser }) => {
  const page = await open(browser, 'reduce');
  await page.locator('#continue').click(); await expect(page.locator('#lobby-depart')).toBeVisible();
  expect(await hudAnims(page)).toEqual([0, 0, 0, 0]);
});
