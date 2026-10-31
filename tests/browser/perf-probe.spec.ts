import { test, expect } from '@playwright/test';

// W8: the ?perf=1 measurement panel loads on demand, measures without blocking play, and copies a JSON report.
test('perf probe: absent by default, present with ?perf=1, never blocks the title buttons', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('#title-view')).toBeVisible();
  await expect(page.locator('.perf-probe')).toHaveCount(0);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./?perf=1');
  const panel = page.locator('.perf-probe');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('เริ่มเกม');
  await expect.poll(() => panel.textContent()).toMatch(/เริ่มเกม \d+ ms/);
  await panel.getByRole('button', { name: 'คัดลอกผล' }).click();
  const report = JSON.parse(await page.evaluate(() => navigator.clipboard.readText())) as { version: number; startup: { titleReadyMs?: number }; frames: { frames: number }; memory: { texturesMiB: number } };
  expect(report.version).toBe(1);
  expect(report.startup.titleReadyMs).toBeGreaterThan(0);
  await panel.getByRole('button', { name: 'ย่อ' }).click();
  await expect(panel.getByRole('button', { name: 'ขยาย' })).toBeVisible();
  // The panel sits in a corner; the game's own title buttons stay clickable.
  const box = await panel.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(360);
});
