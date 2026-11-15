import { test, expect } from '@playwright/test';
import { chapterOne } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';

// P05-05: sweeping a cleared map from the map sheet at 390px — the reward is shown first, one tap pays once, the day's
// limit closes the buttons and the result survives a reload.
const key = 'asterveil.fateweave.expedition.v1';
const camp = () => {
  const p = newProfile(chapterOne, 17, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(10);
  p.cleared = MAPS.map(m => m.id); p.clearedHard = ['veil-frontier']; p.bank = { ore: 100, gold: 100, shard: 0, dust: 0 };
  // P04-06: two supplies a day, kept up to six; this camp has saved a full store (an old day tops it up to the cap).
  p.sweep = { day: 0, supply: 6, used: {}, count: 0 };
  return p;
};
const saved = async (page: import('@playwright/test').Page) => parseGame(await page.evaluate(k => localStorage.getItem(k)!, key), chapterOne, encounterById, MAPS).profile;

test('a cleared map is swept three times a day, normal and hard together, and the result is saved', async ({ page }, info) => {
  const raw = JSON.stringify({ version: 62, profile: camp(), run: null }); parseGame(raw, chapterOne, encounterById, MAPS);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('p05')) { localStorage.setItem(key, raw); sessionStorage.setItem('p05', '1'); } }, { key, raw });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./'); await page.locator('#continue').click();
  await page.locator('[data-lobby=maps]').first().click();
  const row = page.locator('#map-sweep-row-veil-frontier'), go = page.locator('#map-sweep-veil-frontier'), hard = page.locator('#map-sweep-hard-veil-frontier');
  await expect(row).toContainText('เสบียง 6/6'); await expect(row).toContainText('วันนี้เหลือ 3/3'); await expect(row).toContainText('แร่ดาว 30');
  for (const b of [go, hard]) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: info.outputPath('sweep-before.png') });
  await go.click();
  await expect(row).toContainText('เสบียง 5/6'); await expect(row).toContainText('วันนี้เหลือ 2/3'); await expect(go).toBeFocused();
  let p = await saved(page); expect(p.bank).toMatchObject({ ore: 130, gold: 115, dust: 2 }); expect(p.sweep).toMatchObject({ supply: 5, used: { 'veil-frontier': 1 }, count: 1 });
  expect(p.returns).toBe(0); expect(p.expeditions).toBe(0);
  await hard.click(); await go.click();
  await expect(row).toContainText('วันนี้เหลือ 0/3'); await expect(go).toBeDisabled(); await expect(hard).toBeDisabled(); await expect(row).toContainText('ครบแล้ว');
  await page.screenshot({ path: info.outputPath('sweep-done.png') });
  p = await saved(page); expect(p.bank.ore).toBe(100 + 30 * 3); expect(p.sweep).toMatchObject({ supply: 3, used: { 'veil-frontier': 3 }, count: 3 });
  // Another map keeps its own three; a reload keeps the day's count.
  await page.locator('#map-node-deep-forest').click(); await expect(page.locator('#map-sweep-deep-forest')).toBeEnabled();
  await expect(page.locator('#map-sweep-hard-deep-forest')).toHaveCount(0);
  await page.reload(); await page.locator('#continue').click(); await page.locator('[data-lobby=maps]').first().click();
  await expect(page.locator('#map-sweep-veil-frontier')).toBeDisabled(); await expect(page.locator('#map-sweep-row-veil-frontier')).toContainText('เสบียง 3/6');
});
