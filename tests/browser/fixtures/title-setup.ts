import { expect, type Page } from '@playwright/test';

export async function openTitleSetup(page: Page): Promise<void> {
  const toggle = page.locator('#title-setup-toggle');
  const panel = page.locator('#title-setup-panel');
  await expect(toggle).toBeVisible();
  if (!await panel.isVisible()) await toggle.click();
  await expect(panel).toBeVisible();
}
