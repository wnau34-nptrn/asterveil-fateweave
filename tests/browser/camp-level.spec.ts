import { expect, test, type Page } from '@playwright/test';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { legacyBackupKey, parseGame } from '../../src/core/save/expedition-save';
import { newProfile } from '../../src/core/world/profile';
import type { Profile } from '../../src/core/world/types';
import { xpAt } from '../fixtures/camp-level';
import { currentSave } from '../fixtures/current-save';
import { legacyEnvelope } from '../fixtures/legacy-save';
import { watchPage } from './diagnostics';

// P01 (save v44): the camp level in the team sheet, the bench search/filters/archive, and the one-time migration note.
const key = 'asterveil.fateweave.expedition.v1';
const ids = ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'sefa', 'brann', 'lio', 'metta'];
function company(): Profile {
  const p = { ...newProfile(map, 21), tutorialDone: true, veteran: true as const, cleared: MAPS.map(m => m.id), commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } };
  return { ...p, company: [...ids], members: Object.fromEntries(ids.map(id => [id, { stars: id === 'mira' ? 3 : 1, dupes: id === 'mira' ? 2 : 0 }])),
    party: { deployed: ids.slice(0, 4), reserve: ids.slice(4, 8) }, campXp: xpAt(5) + 12 };
}
async function seed(page: Page, raw: string): Promise<void> {
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('camp-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('camp-seeded', '1'); } }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click(); await expect(page.locator('#lobby-view')).toBeVisible();
}
const saved = (page: Page) => page.evaluate(k => localStorage.getItem(k)!, key);

test('team sheet: one camp level, catalog count, search, filters and a non-destructive archive at 390px', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); watchPage(page);
  await seed(page, currentSave({ profile: company(), run: null }));
  await page.locator('#lobby-tab-team').click();
  await expect(page.locator('#lobby-camp-level')).toContainText('เลเวลค่าย Lv5'); await expect(page.locator('#lobby-camp-level')).toContainText('EXP 12/245');
  // Fourteen in the catalog, Odran and Isolde parked (OD-14): this company can hold twelve.
  await expect(page.locator('#lobby-sheet-title')).toContainText('ถือครอง 11/12');
  for (const id of ids) await expect(page.locator(`#lobby-member-${id}`)).toContainText('Lv5');
  const bench = page.locator('.team-grid.bench .team-card[data-hero]');
  await expect(bench).toHaveCount(3);
  // Searching hides cards in place; the caret stays in the box.
  await page.locator('#bench-search').fill('คอริน'); await expect(page.locator('#bench-search')).toBeFocused();
  await expect(page.locator('#lobby-member-metta')).toBeVisible(); await expect(page.locator('#lobby-member-brann')).toBeHidden();
  await page.locator('#bench-search').fill('');
  await page.locator('#bench-filter-back').click(); await expect(page.locator('#lobby-member-lio')).toBeVisible(); await expect(page.locator('#lobby-member-brann')).toHaveCount(0);
  await page.locator('#bench-filter-all').click();
  // Archive Brann: he leaves the list, keeps everything, and comes back from the archive filter.
  const before = parseGame(await saved(page), map, lookup, MAPS).profile.members.brann;
  await page.locator('#lobby-member-brann').click(); await page.locator('#lobby-archive').click();
  await expect(page.locator('#lobby-member-brann')).toHaveCount(0); await expect(page.locator('#bench-filter-archived')).toContainText('1');
  let p = parseGame(await saved(page), map, lookup, MAPS).profile; expect(p.archived).toEqual(['brann']); expect(p.members.brann).toEqual(before); expect(p.company).toContain('brann');
  await page.locator('#bench-filter-archived').click(); await expect(page.locator('#lobby-member-brann')).toBeVisible();
  await page.locator('.bench-tools').scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath('camp-team-archive-390.png') });
  await page.locator('#lobby-member-brann').click(); await expect(page.locator('#lobby-archive')).toContainText('นำออกจากคลังสมาชิก'); await page.locator('#lobby-archive').click();
  p = parseGame(await saved(page), map, lookup, MAPS).profile; expect(p.archived).toBeUndefined();
  for (const box of await page.locator('.team-card, .ui-chip, #bench-search').all()) if (await box.isVisible()) expect((await box.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.locator('#bench-filter-all').click(); await page.locator('#lobby-sheet-title').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('camp-team-level-390.png') });
});

test('an old save moves to the camp level once, says so, and keeps a backup', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); watchPage(page);
  const legacy = legacyEnvelope({ version: 43, profile: company(), run: null }) as unknown as { profile: { members: Record<string, Record<string, unknown>> } };
  for (const [id, m] of Object.entries(legacy.profile.members)) Object.assign(m, id === 'sefa' ? { level: 7, exp: 30 } : id === 'guardian' ? { level: 5, exp: 0 } : { level: 2, exp: 0 });
  const raw = JSON.stringify(legacy); await seed(page, raw);
  await expect(page.locator('#lobby-view [role=status]').first()).toContainText('ย้ายเซฟเป็นเลเวลค่ายแล้ว · ค่าย Lv7 ตามเซฟาที่ก้าวหน้าที่สุด');
  await page.screenshot({ path: info.outputPath('camp-migration-390.png') });
  const now = JSON.parse(await saved(page)); expect(now.version).toBe(45); expect(now.profile.campXp).toBe(xpAt(7) + 30);
  expect(await page.evaluate(k => localStorage.getItem(k), legacyBackupKey(43))).toBe(raw);
  await page.reload(); await page.locator('#continue').click();
  await expect(page.locator('#lobby-view')).toBeVisible(); await expect(page.locator('#lobby-view')).not.toContainText('ย้ายเซฟ');
});
