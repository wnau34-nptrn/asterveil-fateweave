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
  // Record every HUD entrance as it starts: the reveal runs 320 ms, so reading running animations afterwards raced slow CI
  // runners (the camp could finish loading and the reveal end before the first check).
  await page.addInitScript(() => {
    const parts = ['.lobby-top', '.lobby-boards', '.lobby-trip', '.lobby-menu']; const seen: { part: string; delay: number }[] = [];
    (window as unknown as { hudReveals: typeof seen }).hudReveals = seen;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, frames, options) {
      const part = parts.find(p => this.matches(p)); if (part) seen.push({ part, delay: typeof options === 'object' ? Number(options.delay ?? 0) : 0 });
      return animate.call(this, frames, options);
    };
  });
  await page.goto('./');
  return page;
}
const hudAnims = (page: Awaited<ReturnType<typeof open>>) => page.evaluate(() => ['.lobby-top', '.lobby-boards', '.lobby-trip', '.lobby-menu'].map(s => document.querySelector(s)?.getAnimations().length ?? -1));
// How many times each HUD part has started its entrance, and the smallest delay used.
const reveals = (page: Awaited<ReturnType<typeof open>>) => page.evaluate(() => {
  const seen = (window as unknown as { hudReveals: { part: string; delay: number }[] }).hudReveals;
  return { counts: ['.lobby-top', '.lobby-boards', '.lobby-trip', '.lobby-menu'].map(p => seen.filter(s => s.part === p).length), delay: Math.min(...seen.map(s => s.delay)) };
});

test('the camp HUD settles in after the scene, stays usable and does not replay', async ({ browser }) => {
  const page = await open(browser, 'no-preference');
  await page.locator('#continue').click(); await expect(page.locator('#lobby-depart')).toBeAttached({ timeout: 15_000 });
  await expect.poll(async () => (await reveals(page)).counts).toEqual([1, 1, 1, 1]);
  expect((await reveals(page)).delay).toBeGreaterThanOrEqual(80);
  await page.locator('#lobby-tab-characters').click();   // live during the reveal
  await expect(page.locator('#camp-character-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(() => hudAnims(page), { timeout: 1000 }).toEqual([0, 0, 0, 0]);
  await page.locator('#lobby-gacha').click(); await page.keyboard.press('Escape');
  expect(await hudAnims(page)).toEqual([0, 0, 0, 0]);
  expect((await reveals(page)).counts).toEqual([1, 1, 1, 1]);   // later redraws never start it again
  expect(await page.locator('.lobby-menu').evaluate(e => getComputedStyle(e).opacity)).toBe('1');
});

test('reduced motion: the HUD appears at once', async ({ browser }) => {
  const page = await open(browser, 'reduce');
  await page.locator('#continue').click(); await expect(page.locator('#lobby-depart')).toBeVisible({ timeout: 15_000 });
  expect(await hudAnims(page)).toEqual([0, 0, 0, 0]); expect((await reveals(page)).counts).toEqual([0, 0, 0, 0]);
});
