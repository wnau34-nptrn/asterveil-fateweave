import { expect, test } from '@playwright/test';

// A newer publish while the page is open (owner 2026-11-20): the page reads version.json, shows a slim bar at 390px with
// "refresh" and "later", "later" stays hidden for that build only, "refresh" reloads, and the page never reloads itself.
const build = (page: import('@playwright/test').Page, id: { v: string }) => page.route('**/version.json*', route => route.fulfill({ contentType: 'application/json', headers: { 'Cache-Control': 'no-store' }, body: JSON.stringify({ build: id.v, content: '0'.repeat(16) }) }));

test('a newer build shows the refresh bar once per build; later hides it; refresh reloads', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const live = { v: 'deadbeef0001' }; await build(page, live);
  await page.goto('./');
  const bar = page.locator('#update-banner'); await expect(bar).toBeVisible();
  await expect(bar).toContainText('มีเวอร์ชันใหม่พร้อมแล้ว');
  for (const id of ['#update-now', '#update-later']) { const b = (await page.locator(id).boundingBox())!; expect(b.height).toBeGreaterThanOrEqual(44); expect(b.x + b.width).toBeLessThanOrEqual(390); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/validation/content-grace-2026-11-20/update-banner-390.png' });
  // Later: hidden, and still hidden after a reload for the same build; a different build shows it again.
  await page.locator('#update-later').click(); await expect(bar).toBeHidden();
  await page.reload(); await page.waitForTimeout(800); await expect(page.locator('#update-banner')).toBeHidden();
  live.v = 'deadbeef0002'; await page.reload(); await expect(page.locator('#update-banner')).toBeVisible();
  // Refresh reloads the page (the shell's own navigation counter proves a new document).
  await page.evaluate(() => { (window as unknown as { marker: number }).marker = 1; });
  await Promise.all([page.waitForNavigation(), page.locator('#update-now').click()]);
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBeUndefined();
});

test('the same build or a missing file shows nothing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/version.json*', route => route.fulfill({ status: 404, body: 'no' }));
  await page.goto('./'); await page.waitForTimeout(1200); await expect(page.locator('#update-banner')).toBeHidden();
});
