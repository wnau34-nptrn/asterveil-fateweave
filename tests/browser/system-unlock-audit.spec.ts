import { expect, test } from '@playwright/test';
import { ruinsMap as map } from '../../src/content/world/chapter-ruins';
import { newProfile } from '../../src/core/world/profile';
import { currentSave } from '../fixtures/current-save';
import { watchPage } from './diagnostics';

const key = 'asterveil.fateweave.expedition.v1';
for (const cleared of [false, true]) test(`camp team after MAP 1: cleared=${cleared}, no veteran`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); watchPage(page);
  const profile = { ...newProfile(map, 21, ['guardian', 'tracer', 'weaver', 'healer']), tutorialDone: true,
    cleared: cleared ? [map.id] : [], commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } };
  const raw = currentSave({ profile, run: null });
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('audit')) { localStorage.setItem(key, raw); sessionStorage.setItem('audit', '1'); } }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#lobby-tab-team').click();
  if (!cleared) {
    await expect(page.locator('.lobby-locked')).toContainText('แผนที่ 1');
    await expect(page.locator('#team-preset-0')).toHaveCount(0);
  } else {
    await expect(page.locator('.lobby-locked')).toHaveCount(0);
    await page.locator('#team-preset-0').click();
    await page.locator('#lobby-member-tracer').click(); await page.locator('#lobby-quick-reserve').click();
    await expect(page.locator('#team-preset-0')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#team-preset-0').click();
    await expect(page.locator('#team-preset-0')).toHaveAttribute('aria-pressed', 'true');
    await page.reload(); await page.locator('#continue').click(); await page.locator('#lobby-tab-team').click();
    await expect(page.locator('#team-preset-0')).toHaveAttribute('aria-pressed', 'true');
    const saved = JSON.parse((await page.evaluate(k => localStorage.getItem(k), key))!);
    expect(saved.profile.veteran).toBeUndefined(); expect(saved.profile.cleared).toEqual([map.id]);
  }
  await page.screenshot({ path: `docs/validation/system-unlock-audit/team-${cleared ? 'open' : 'locked'}-390.png` });
});
