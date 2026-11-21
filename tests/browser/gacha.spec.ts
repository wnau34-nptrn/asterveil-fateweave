import { test, expect, type Page } from '@playwright/test';
import { chapterOne } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame, SAVE_VERSION } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';

// P10 free-ticket cabinet at 390px, offline (`?server=off` default for the dev server): the third hiring tab, the
// confirmation step (nothing spent before it), a committed 10-pull with its result cards, reload keeping the result
// and the wallet, the rates table, the exchange and the history. Screens for the owner go to the validation folder.
const key = 'asterveil.fateweave.expedition.v1';
const shots = 'docs/validation/p10-gacha-2026-11-21';

async function open(page: Page, tickets: number, points = 0): Promise<void> {
  const p = newProfile(chapterOne, 17, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(10); p.cleared = MAPS.map(m => m.id);
  p.bank = { ore: 100, gold: 100, shard: 0, dust: 20 }; p.gacha = { tickets, points, serial: 0, history: [] };
  const raw = JSON.stringify({ version: SAVE_VERSION, profile: p, run: null }); parseGame(raw, chapterOne, encounterById, MAPS);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('p10')) { localStorage.setItem(key, raw); sessionStorage.setItem('p10', '1'); } }, { key, raw });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-hire').click(); await page.locator('#hire-tab-gacha').click();
}
const saved = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k)!) as { version: number; profile: { gacha?: { tickets: number; points: number; serial: number; history: { results: unknown[] }[] }; company: string[] } }, key);

test.describe('with motion', () => {
test.use({ reducedMotion: 'no-preference' });
test('pull ten: confirm first, results from the committed entry, survives a reload', async ({ page }) => {
  test.setTimeout(240_000);
  await open(page, 12, 3);
  await expect(page.locator('#gacha-tickets')).toContainText('12'); await expect(page.locator('#gacha-points')).toContainText('3');
  await expect(page.locator('.gacha-lede')).toContainText('7.5%');
  for (const id of ['#hire-tab-gacha', '#gacha-pull-1', '#gacha-pull-10', '#gacha-open-exchange', '#gacha-open-rates', '#gacha-open-history'])
    expect(Math.round((await page.locator(id).boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `${shots}/cabinet-390.png` });
  await page.locator('#gacha-pull-10').click();
  await expect(page.locator('#gacha-confirm-title')).toBeFocused(); await expect(page.locator('.gacha-cost')).toContainText('12 → 2');
  expect((await saved(page)).profile.gacha!.tickets).toBe(12); // nothing spent before confirming
  await page.locator('#gacha-back').click(); await expect(page.locator('#gacha-title')).toBeVisible();
  expect((await saved(page)).profile.gacha!.serial).toBe(0);
  await page.locator('#gacha-pull-10').click(); await page.locator('#gacha-confirm').click();
  await expect(page.locator('.gacha-result')).toBeVisible(); await expect(page.locator('.gacha-card')).toHaveCount(10);
  const after = await saved(page);
  expect(after.version).toBe(SAVE_VERSION); expect(after.profile.gacha).toMatchObject({ tickets: 2, points: 13, serial: 1 }); expect(after.profile.gacha!.history[0]!.results).toHaveLength(10);
  await page.waitForTimeout(3600); await page.screenshot({ path: `${shots}/result-390.png` });
  // Skip, then a reload: same wallet, no second draw.
  await page.locator('#gacha-skip').click(); await expect(page.locator('#gacha-back')).toBeFocused();
  await page.reload(); await page.locator('#continue').click();
  expect((await saved(page)).profile.gacha).toEqual(after.profile.gacha);
  await page.locator('#lobby-tab-hire').click(); await page.locator('#hire-tab-gacha').click();
  await expect(page.locator('#gacha-tickets')).toContainText('2');
  await expect(page.locator('#gacha-pull-10')).toHaveAttribute('data-blocked', 'true');
  await page.locator('#gacha-pull-10').click(); await expect(page.locator('#gacha-confirm')).toBeDisabled();
  await page.locator('#gacha-back').click(); await page.locator('#gacha-open-history').click();
  await expect(page.locator('.gacha-history-list li')).toHaveCount(1);
});
});

test('rates table adds up and the exchange takes 80 points once', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, 0, 85);
  await page.locator('#gacha-open-rates').click(); await expect(page.locator('.gacha-rate-table tbody tr')).toHaveCount(15);
  await expect(page.locator('.gacha-rates')).not.toContainText('Odran');
  await page.keyboard.press('Tab');
  await page.locator('#gacha-back').click(); await page.locator('#gacha-open-exchange').click();
  await expect(page.locator('#gacha-exchange-confirm')).toBeDisabled();
  await page.locator('#gacha-pick-astrid').click(); await expect(page.locator('#gacha-pick-astrid')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: `${shots}/exchange-390.png` });
  await page.locator('#gacha-exchange-confirm').click();
  await expect(page.locator('.gacha-card')).toHaveCount(1); await expect(page.locator('.gacha-card')).toHaveAttribute('data-kind', 'full');
  const s = await saved(page); expect(s.profile.gacha!.points).toBe(5); expect(s.profile.company).toContain('astrid');
});

test('reduced motion shows results without the reveal animation', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' }); const page = await context.newPage();
  await open(page, 1);
  await page.locator('#gacha-pull-1').click(); await page.locator('#gacha-confirm').click();
  await expect(page.locator('.gacha-result')).toHaveAttribute('data-skip', 'true');
  expect(await page.locator('.gacha-card').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await context.close();
});
