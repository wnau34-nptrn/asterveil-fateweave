import { test, expect, type Page } from '@playwright/test';
import { chapterOne } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';

// P11-05 step 4 at 390px, offline: the camp banner, the four-tab World Boss page and the trio fight/craft views. The shipped
// rules leave `trio.from` unset (OD-51), so the dev server's `rules.ts` is rewritten in flight to set it (week 0 on).
const key = 'asterveil.fateweave.expedition.v1';
const shots = 'docs/validation/p11-05-2026-11-16';

async function openTrio(page: Page, shards = 0): Promise<void> {
  // Dev server: `rules.ts` is served as source; the CI build (PLAYWRIGHT_PAGES) bundles it into JS chunks. Both keep the `bosses: { kragmor:` key.
  const at = /bosses:\s*\{\s*kragmor:/;
  let patched = 0;
  await page.route(/\/(src\/content\/world\/rules\.ts|assets\/[^/]+\.js)(\?.*)?$/, async route => {
    const r = await route.fetch(); const body = await r.text();
    if (!at.test(body)) { await route.fulfill({ response: r, body }); return; }
    patched++; await route.fulfill({ response: r, body: body.replace(at, 'from:0,$&') });
  });
  page.on('close', () => { expect(patched).toBeGreaterThan(0); });
  const p = newProfile(chapterOne, 17, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(10); p.cleared = MAPS.map(m => m.id);
  p.bank = { ore: 100, gold: 100, shard: 0, dust: 20 };
  if (shards) p.bossShards = { kragmor: shards };
  const raw = JSON.stringify({ version: 65, profile: p, run: null }); parseGame(raw, chapterOne, encounterById, MAPS);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('p1105')) { localStorage.setItem(key, raw); sessionStorage.setItem('p1105', '1'); } }, { key, raw });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./'); await page.locator('#continue').click();
}

test('banner, three boss cards, craft sheet and boss notes at 390px', async ({ page }) => {
  test.setTimeout(120_000);
  await openTrio(page, 40);
  const banner = page.locator('#lobby-wboss'); await expect(banner).toBeVisible(); await expect(banner).toContainText('สิทธิ์ 0/5');
  expect((await banner.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `${shots}/trio-camp-390.png` });
  await banner.click();
  for (const t of ['fight', 'rewards', 'craft', 'bosses']) expect((await page.locator(`#wb-tab-${t}`).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  for (const b of ['kragmor', 'valdrakk', 'morvane']) await expect(page.locator(`#wb-pick-${b}`)).toBeVisible();
  await page.locator('#wb-pick-valdrakk').click(); await expect(page.locator('#wb-start')).toContainText('Valdrakk');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${shots}/trio-fight-390.png` });
  await page.locator('#wb-tab-craft').click(); await expect(page.locator('#wb-item-kragmor')).toContainText('40/40');
  await page.screenshot({ path: `${shots}/trio-craft-390.png` });
  await page.locator('#wb-craft-kragmor').click(); await expect(page.locator('#wb-craft-confirm')).toBeDisabled();
  const chips = page.locator('#wb-craft-sheet [data-lobby=wb-affix]'); expect(await chips.count()).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < 2; i++) { await chips.nth(i).click(); }
  await expect(page.locator('#wb-craft-confirm')).toBeEnabled();
  await page.locator('#wb-craft-confirm').click();
  await expect(page.locator('#wb-item-kragmor')).toContainText('0/40');
  await page.locator('#wb-tab-bosses').click(); await expect(page.locator('#wb-info-morvane')).toContainText('ลงดาเมจใส่บอสเพื่อให้ศึกนับสิทธิ์');
});

test('a Morvane attempt shows optional advice without committing a turn', async ({ page }) => {
  test.setTimeout(120_000);
  await openTrio(page);
  await page.locator('#lobby-wboss').click(); await page.locator('#wb-pick-morvane').click(); await page.locator('#wb-start').click();
  await expect(page.locator('#battle-view')).not.toHaveClass(/view-off/);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 20_000 }); await page.locator('#start').click();
  await expect(page.locator('#beat-status')).toContainText('รอบ 1/8');
  const coach = page.locator('#battle-coach');
  await expect(coach).toBeVisible();
  await expect(page.locator('#coach-title')).toContainText('Morvane');
  await expect(page.locator('#coach-copy')).toContainText('มอร์เวน');
  const opening = await coach.getAttribute('data-lesson');
  expect(opening).toBe('1');
  const dismiss = page.locator('#coach-dismiss');
  expect((await dismiss.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  await dismiss.click();
  await expect(coach).toBeHidden();
  await page.locator('#battle-info').click();
  await page.locator('#battle-tab-settings').click();
  await page.locator('#coach-toggle').click();
  await page.locator('[data-ui=info-close]').click();
  await expect(coach).toHaveAttribute('data-lesson', opening!);
  await expect(page.locator('#beat-status')).toContainText('รอบ 1/8');
});
