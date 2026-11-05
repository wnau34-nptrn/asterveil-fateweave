import { expect, test } from '@playwright/test';

// The measurements overlay must be reachable in the home-screen web app (no URL bar): five quick taps in the top-left corner.
test('five corner taps toggle the viewport measurements, `?vp` shows them at once', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  const overlay = page.locator('pre', { hasText: 'inner' });
  await expect(page.locator('pre[hidden]')).toHaveCount(1);
  for (let i = 0; i < 5; i++) await page.mouse.click(20, 20);
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('data-standalone');
  for (let i = 0; i < 5; i++) await page.mouse.click(20, 20);
  await expect(page.locator('pre[hidden]')).toHaveCount(1);
  await page.goto('./?vp');
  await expect(page.locator('pre', { hasText: 'env top' })).toBeVisible();
});
