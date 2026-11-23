import { expect, test, type Page } from '@playwright/test';
import { encounterById } from '../../src/content/encounters/catalog';
import { mineMap, mineSites } from '../../src/content/world/chapter-mine';
import { MAPS } from '../../src/content/world/maps';
import { depart, newProfile } from '../../src/core/world/profile';
import { capXp, move } from '../../src/core/world/world';
import { currentSave } from '../fixtures/current-save';
import { watchPage } from './diagnostics';

const ids = ['guardian', 'tracer', 'weaver', 'healer', 'lio'];
const key = 'asterveil.fateweave.expedition.v1';
const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});
test.afterEach(({ page }) => { expect(pageErrors.get(page)).toEqual([]); });

function expedition() {
  const profile = { ...newProfile(MAPS[0]!, 19, ids), tutorialDone: true, campXp: capXp(mineMap, 4),
    commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }, cleared: MAPS.slice(0, 4).map(m => m.id) };
  return depart(profile, mineMap, encounterById, 11);
}
async function launch(page: Page, raw: string): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  watchPage(page);
  await page.addInitScript(({ key, raw }) => {
    if (!sessionStorage.getItem('mine-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('mine-seeded', '1'); }
  }, { key, raw });
  await page.goto('./?server=off');
  await page.locator('#continue').click();
}

test('mine controls light a lantern, charge a crystal and preserve the run across reload', async ({ page }, info) => {
  const game = expedition();
  const { x, y } = mineSites.lanterns[1];
  game.run.position = { x, y };
  game.run.repel = mineMap.potions.repelSteps;
  await launch(page, currentSave(game));
  await expect(page.locator('#world-view')).toBeVisible();
  await expect(page.locator('#tide-chip')).toContainText('ตะเกียง 0/5');
  await page.locator('#rest').click();
  await expect(page.locator('#tide-chip')).toContainText('ตะเกียง 1/5');
  await expect(page.locator('#world-message')).toContainText('จุดตะเกียงแล้ว');
  await page.locator('#objective-button').click();
  await expect(page.locator('#world-goals-content')).toContainText('ผนึกโพรงผลึก');
  await expect(page.locator('#world-goals-content')).toContainText('พาคนงานกลับค่าย');
  if (process.env.SHOTS === '1') await page.screenshot({ path: info.outputPath('mine-seal-390.png') });
  await page.keyboard.press('Escape');
  for (let i = 0; i < 5; i++) {
    await page.locator('#move-right').click();
    await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).run.steps, key)).toBe(i + 1);
  }
  await expect(page.locator('#rest')).toHaveAccessibleName('เติมแสงจากผลึกเรืองแสง');
  await page.locator('#rest').click();
  await expect(page.locator('#tide-chip')).toContainText('แสงพกพา 12 ก้าว');
  await page.reload();
  await page.locator('#continue').click();
  await expect(page.locator('#tide-chip')).toContainText('แสงพกพา 12 ก้าว');
  for (const element of [page.locator('#tide-chip'), page.locator('#world-hero-lio'), page.locator('#world-pack')]) {
    await expect(element).toBeVisible();
    const box = (await element.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  if (process.env.SHOTS === '1') await page.screenshot({ path: info.outputPath('mine-light-390.png') });
});

test('the sealed mine opens its real Crystal Giant encounter', async ({ page }) => {
  const game = expedition();
  game.run.position = { x: mineSites.boss.x, y: mineSites.boss.y + 1 };
  game.run.lanterns = mineSites.lanterns.map(site => site.id);
  game.run.elitesDefeated = ['mine-overseer'];
  game.run = move(game.run, mineMap, 'up', encounterById).state;
  expect(game.run.battle?.encounterId).toBe('crystal-giant');
  await launch(page, currentSave(game));
  await expect(page.locator('#battle-view')).toBeVisible();
  await expect(page.locator('#battle-view')).toContainText('ยักษ์ผลึก');
});

test('clearing Moon Lake unlocks the mine in the campaign lobby', async ({ page }) => {
  const { profile } = expedition();
  await launch(page, currentSave({ profile, run: null }));
  await expect(page.locator('#lobby-view')).toBeVisible();
  await page.locator('#lobby-depart').click();
  await expect(page.locator('#world-view')).toBeVisible();
  await expect(page.locator('#map-name')).toHaveText('เหมืองผลึกร้าง');
});

test('the cart changes the blocked wall to an open passage', async ({ page }) => {
  const game = expedition();
  game.run.position = mineMap.mine!.cart.start;
  game.run.mine = { cart: ['main', 'main', 'main'], beam: ['up', 'up', 'up'], rescue: { following: [], rescued: [] }, stories: [] };
  await launch(page, currentSave(game));
  const wall = page.locator('[data-door="mine-cart"]');
  await expect(wall).not.toHaveClass(/open/);
  await expect(page.locator('#rest')).toHaveAccessibleName('ผลักรถแร่ไปตามรางที่ตั้งไว้');
  await page.locator('#rest').click();
  await expect(wall).toHaveClass(/open/);
  await expect(page.locator('#world-message')).toContainText('เปิดทางแล้ว');
});
