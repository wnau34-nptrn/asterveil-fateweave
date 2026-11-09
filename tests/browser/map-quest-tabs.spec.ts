import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';
import { currentSave } from '../fixtures/current-save';
import { xpAt } from '../fixtures/camp-level';

const key = 'asterveil.fateweave.expedition.v1';
async function openMap(page: Page, unlocked = true) {
  const profile = newProfile(map, 21, ['guardian', 'tracer', 'weaver', 'healer', 'garran']);
  profile.tutorialDone = true;
  profile.campXp = xpAt(5);
  profile.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  profile.cleared = unlocked ? MAPS.map(m => m.id) : [];
  for (const q of map.sideQuests) {
    profile.quests[q.id] = { progress: q.kind === 'wins' ? 12 : q.kind === 'herbs' ? 2 : q.kind === 'rareChests' || q.kind === 'elites' ? q.target : 0, claimed: q.kind === 'elites' };
  }
  const game = depart(profile, map, lookup, 11);
  // Current-run wins must not be added to the already settled camp-board tally.
  game.run!.wins = 5;
  const raw = currentSave(game);
  await page.addInitScript(({ key, raw }) => { localStorage.setItem(key, raw); }, { key, raw });
  await page.goto('./');
  await page.locator('#continue').click();
  await expect(page.locator('.map-view')).toBeVisible();
}
const saved = (page: Page) => page.evaluate(k => localStorage.getItem(k), key);

for (const [width, height] of [[390, 844], [390, 650], [320, 568], [1366, 1000]]) {
  test(`map goals and settled quests share a read-only tabbed dialog at ${width}x${height}`, async ({ page }, info) => {
    await page.setViewportSize({ width: width!, height: height! });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await openMap(page);
    const before = await saved(page);
    await expect(page.locator('.hud-tools > button')).toHaveCount(3);
    expect((await page.locator('.hud-tools').boundingBox())!.height).toBe(44);
    if (width === 390 && height === 844) await page.screenshot({ path: info.outputPath('map-390.png') });
    await page.locator('#objective-button').click();
    const dialog = page.locator('#world-goals');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('tab')).toHaveText(['เป้าหมาย', 'เควสต์']);
    await expect(page.locator('#goals-panel-travel')).toBeVisible();
    await expect(page.locator('#world-goals-content')).toContainText('ไปถึงแคมป์');
    await page.getByRole('tab', { name: 'เควสต์', exact: true }).click();
    await expect(page.locator('#goals-panel-travel')).toBeHidden();
    await expect(page.locator('#goals-panel-quests')).toBeVisible();
    await expect(dialog.locator('.map-quest')).toHaveCount(map.sideQuests.length);
    await expect(dialog.locator('.map-quest').first()).toHaveAttribute('data-state', 'complete');
    await expect(dialog.locator('.map-quest').last()).toHaveAttribute('data-state', 'claimed');
    const wins = dialog.locator('.map-quest').filter({ hasText: 'ผลงานให้ลูกค้าดู' });
    await expect(wins.locator('.map-quest-heading span')).toHaveText('12/30');
    await expect(wins.getByRole('progressbar')).toHaveAttribute('value', '12');
    await expect(wins.getByRole('progressbar')).toHaveAttribute('max', '30');
    await expect(dialog).toContainText('ความคืบหน้าจากรอบเดินทางที่จบแล้ว');
    await expect(dialog.locator('[data-lobby=claim], [data-world=claim]')).toHaveCount(0);
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height!);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await dialog.locator('.info-content').evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    if (width === 390 && height === 844) await page.screenshot({ path: info.outputPath('quests-390.png') });
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#goals-tab-travel')).toBeFocused();
    await expect(page.locator('#goals-panel-travel')).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.locator('#goals-tab-quests')).toBeFocused();
    await expect(page.locator('#goals-panel-quests')).toBeVisible();
    await page.keyboard.press('Home');
    await expect(page.locator('#goals-tab-travel')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator('#objective-button')).toBeFocused();
    await page.locator('#objective-button').click();
    await page.locator('[data-world=goals-close]').click();
    await expect(page.locator('#objective-button')).toBeFocused();
    expect(await saved(page)).toBe(before);
    expect(errors).toEqual([]);
  });
}

test('map quest tab explains the existing MAP1 unlock without exposing quest progress', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openMap(page, false);
  const before = await saved(page);
  await page.locator('#objective-button').click();
  await page.getByRole('tab', { name: 'เควสต์', exact: true }).click();
  await expect(page.locator('#world-quests-content')).toContainText('เควสต์จะปลดล็อกหลังผ่าน MAP1');
  await expect(page.locator('#world-quests-content .map-quest')).toHaveCount(0);
  await page.getByRole('tab', { name: 'เป้าหมาย', exact: true }).click();
  await expect(page.locator('#world-goals-content')).toContainText('ไปถึงแคมป์');
  expect(await saved(page)).toBe(before);
});
