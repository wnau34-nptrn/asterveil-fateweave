import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';
import { savePreset } from '../../src/core/world/presets';
import { parseGame } from '../../src/core/save/expedition-save';
import { currentSave } from '../fixtures/current-save';
import { xpAt } from '../fixtures/camp-level';
import { watchPage } from './diagnostics';
const key = 'asterveil.fateweave.expedition.v1';
function fixture(camp = false) {
  let p = newProfile(map, 21, ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'metta']);
  p.party = { deployed: ['guardian', 'tracer', 'weaver', 'healer', 'garran'], reserve: ['mira'] };
  p.tutorialDone = true; p.cleared = MAPS.slice(0, 2).map(m => m.id); p.campXp = xpAt(5);
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p = savePreset(p, map, lookup, 0, 'หลัก').profile;
  p.presets!.push({ name: 'สลับ', deployed: ['mira', 'guardian', 'metta'], reserve: ['tracer', 'weaver', 'healer', 'garran'], lanes: { guardian: 'front', mira: 'back', metta: 'front' } });
  const game = camp ? { profile: p, run: null } : depart(p, map, lookup, 11);
  if (game.run) { game.run.hp.guardian = 11; game.run.fatigue = { guardian: 4, mira: 2 }; }
  const raw = currentSave(game); parseGame(raw, map, lookup, MAPS); return raw;
}
async function open(page: Page, camp = false) {
  watchPage(page); const raw = fixture(camp);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('team-tabs')) { localStorage.setItem(key, raw); sessionStorage.setItem('team-tabs', '1'); } }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click();
}
const saved = (page: Page) => page.evaluate(k => localStorage.getItem(k)!, key);
const game = async (page: Page) => parseGame(await saved(page), map, lookup, MAPS);
for (const height of [844, 650]) test(`map team has a separate HUD and one-tap carried-only presets at 390x${height}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height }); await open(page);
  const before = (await game(page)).run!;
  for (const id of ['world-team', 'world-pack']) {
    const r = (await page.locator('#' + id).boundingBox())!; expect(r.height).toBeGreaterThanOrEqual(44); expect(r.width).toBeGreaterThanOrEqual(44);
  }
  expect((await page.locator('.hud-tools').boundingBox())!.height).toBe(44);
  if (height === 844) await page.screenshot({ path: 'docs/validation/map-team-character-tabs/map-390.png' });
  await page.keyboard.press('t'); await expect(page.locator('#team-dialog')).toBeVisible();
  await expect(page.locator('#pack-dialog')).not.toBeVisible();
  await expect(page.locator('#team-dialog .preset-slot')).toHaveCount(4);
  await expect(page.locator('#map-team-preset-2')).toBeDisabled();
  await expect(page.locator('.preset-missing')).toContainText('คอริน');
  if (height === 844) await page.screenshot({ path: 'docs/validation/map-team-character-tabs/team-390.png' });
  await page.locator('#map-team-preset-1').click();
  await expect(page.locator('#map-team-preset-1')).toHaveAttribute('aria-pressed', 'true');
  const after = (await game(page)).run!;
  expect(after.roster.deployed).toEqual(['mira', 'guardian']);
  expect(after.roster.reserve).toEqual(['tracer', 'weaver', 'healer', 'garran']);
  expect({ ...after, roster: before.roster }).toEqual(before);
  await page.locator('#map-team-preset-0').click();
  expect((await game(page)).run!.roster.deployed).toEqual(before.roster.deployed);
  const unchanged = await saved(page);
  await page.keyboard.press('b'); await expect(page.locator('#team-dialog')).toBeVisible();
  await page.locator('#map-team-guardian').click(); await page.locator('#map-team-character-overview').click();
  await expect(page.locator('#character-tabs [role=tab]')).toHaveText(['ภาพรวม', 'อุปกรณ์', 'สกิล', 'ผังสกิล']);
  await expect(page.locator('#character-tab-develop')).toHaveCount(0);
  await page.locator('#character-tab-skills').click();
  await expect(page.locator('#skills-tomes, #skills-details, #skills-tree, #character-star-open, [data-world=skill-level], [data-world=tome-trade]')).toHaveCount(0);
  await page.locator('#character-tab-talents').click(); await expect(page.locator('.talent-tree')).toBeVisible();
  await page.keyboard.press('Home'); await expect(page.locator('#character-tab-overview')).toBeFocused();
  await page.keyboard.press('End'); await expect(page.locator('#character-tab-talents')).toBeFocused();
  if (height === 844) await page.screenshot({ path: 'docs/validation/map-team-character-tabs/tree-map-390.png' });
  await page.keyboard.press('Escape'); await expect(page.locator('#team-dialog')).toBeVisible();
  await expect(page.locator('#map-team-character-overview')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#world-team')).toBeFocused();
  await page.keyboard.press('b'); await expect(page.locator('#pack-dialog')).toBeVisible();
  await expect(page.locator('#pack-content [role=tab]')).toHaveCount(2);
  await expect(page.locator('#bag-tab-team')).toHaveCount(0);
  expect(await saved(page)).toBe(unchanged);
  await page.keyboard.press('Escape'); await page.reload(); await page.locator('#continue').click();
  expect((await game(page)).run!.hp.guardian).toBe(11); expect((await game(page)).run!.fatigue).toEqual(before.fatigue);
});
test('camp has a direct tree tab plus camp-only development, with no duplicate navigation tiles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page, true);
  await page.locator('#lobby-tab-team').click(); await page.locator('#team-character-guardian').click();
  const before = await saved(page);
  await expect(page.locator('#camp-character-tabs [role=tab]')).toHaveText(['ภาพรวม', 'อุปกรณ์', 'สกิล', 'ผังสกิล', 'พัฒนา']);
  await page.locator('#camp-character-tab-talents').click(); await expect(page.locator('.talent-tree')).toBeVisible();
  await page.locator('#camp-character-tab-skills').click(); await expect(page.locator('#camp-skills-tree')).toHaveCount(0);
  await expect(page.locator('#camp-skills-tomes')).toBeVisible();
  await page.locator('#camp-character-tab-develop').click(); await expect(page.locator('#camp-character-star-open')).toBeVisible();
  await expect(page.locator('.develop-links')).toHaveCount(0);
  await page.screenshot({ path: 'docs/validation/map-team-character-tabs/develop-camp-390.png' });
  expect(await saved(page)).toBe(before);
});
