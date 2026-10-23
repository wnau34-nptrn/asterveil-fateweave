import { expect, test, type Page } from '@playwright/test';
import { encounterById } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newExpedition, reveal } from '../../src/core/world/world';
import { newProfile } from '../../src/core/world/profile';
import type { Commander, ExpeditionState, Profile } from '../../src/core/world/types';
import { watchPage } from './diagnostics';
test.beforeEach(({ page }) => watchPage(page));

// Formation (owner 2026-10-22): set front/back at the camp team page and the map bag; ≤3 per column.
// FORMATION_SHOTS=<dir> also writes the 390px review shots for the owner.
const dir = process.env.FORMATION_SHOTS;
const key = 'asterveil.fateweave.expedition.v1';
const commander: Commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
const phone = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' as const, deviceScaleFactor: 2 };
async function seed(page: Page, profile: Profile, run: ExpeditionState | null) {
  await page.addInitScript(({ raw, key }) => { if (sessionStorage.getItem('seeded')) return; localStorage.setItem(key, raw); sessionStorage.setItem('seeded', '1'); }, { raw: JSON.stringify({ version: 35, profile, run }), key });
  await page.goto('./'); await page.locator('#continue').click();
}
const saved = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key);
const camp = (): Profile => ({ ...newProfile(map, 5), tutorialDone: true, veteran: true, completes: 3, commander });

test('camp team page moves a member to the front by tap and keyboard, at most three per column', async ({ browser }) => {
  const context = await browser.newContext(phone), page = await context.newPage();
  await seed(page, camp(), null);
  await page.locator('#lobby-tab-team').click();
  const grid = page.locator('.formation');
  await expect(grid.locator('.formation-column[data-lane=back] .formation-cell[data-hero]')).toHaveCount(2);
  await page.locator('#lobby-lane-weaver').click();
  await expect(page.locator('#lobby-lane-weaver')).toHaveAttribute('aria-pressed', 'true');
  await grid.locator('.formation-column[data-lane=front] .formation-cell.empty.target').first().click();
  await expect.poll(async () => (await saved(page)).profile.party.lanes?.weaver).toBe('front');
  expect((await saved(page)).version).toBe(38);
  await expect(grid.locator('.formation-column[data-lane=front] .formation-cell[data-hero]')).toHaveCount(3);
  await expect(grid.locator('.formation-column[data-lane=front] .formation-cell.empty')).toHaveCount(0);
  await expect(page.locator('#lobby-lane-weaver .lane-warn')).toBeVisible();
  // A fourth front member can only trade places: healer ↔ tracer, by keyboard.
  await page.locator('#lobby-lane-healer').focus(); await page.keyboard.press('Enter');
  await page.locator('#lobby-lane-tracer').focus(); await page.keyboard.press('Enter');
  await expect.poll(async () => (await saved(page)).profile.party.lanes).toEqual({ guardian: 'front', tracer: 'back', weaver: 'front', healer: 'front' });
  for (const cell of await page.locator('.formation-cell').all()) expect((await cell.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  if (dir) { await page.locator('#lobby-lane-weaver').scrollIntoViewIfNeeded(); await page.waitForTimeout(200); await page.screenshot({ path: `${dir}/formation-camp-390.png` }); }
  await context.close();
});

test('map bag changes the formation outside battle and the next battle stands in it', async ({ browser }) => {
  const context = await browser.newContext(phone), page = await context.newPage();
  const run = { ...newExpedition(map, encounterById, 77), tutorialDone: true }; reveal(run, map);
  await seed(page, camp(), run);
  await page.locator('#world-pack').click(); await page.locator('#bag-tab-team').click();
  await page.locator('#bag-team-lane-guardian').click(); await page.locator('#bag-team-lane-weaver').click();
  await expect.poll(async () => (await saved(page)).run.roster.lanes).toEqual({ guardian: 'back', tracer: 'front', weaver: 'front', healer: 'back' });
  await expect(page.locator('#bag-team-lane-guardian')).toBeVisible();
  if (dir) { await page.locator('#bag-team-lane-guardian').scrollIntoViewIfNeeded(); await page.waitForTimeout(200); await page.screenshot({ path: `${dir}/formation-bag-390.png` }); }
  await context.close();
});

for (const [name, lanes, chip] of [['3-1', { weaver: 'front' }, 'หน้า 3 · หลัง 1'], ['1-3', { tracer: 'back' }, 'หน้า 1 · หลัง 3']] as const) test(`a ${name} formation stands three full-size heroes in one column`, async ({ browser }) => {
  const context = await browser.newContext(phone), page = await context.newPage();
  const run = { ...newExpedition(map, encounterById, 1234), tutorialDone: true };
  run.roster.lanes = { ...lanes };
  const data = encounterById('slime-nest')!; const hp = Object.fromEntries(run.roster.deployed.map(id => [id, run.hp[id]!]));
  run.battle = { kind: 'random', encounterId: data.id, entry: hp, commands: [], lanes: { ...lanes } };
  await seed(page, camp(), run);
  const start = page.locator('[data-ui=start]'); if (await start.isVisible().catch(() => false)) await start.click();
  await expect(page.locator('#action-attack')).toBeEnabled();
  await expect(page.locator('.formation-chip')).toContainText(chip);
  if (dir) { await page.waitForTimeout(400); await page.screenshot({ path: `${dir}/formation-battle-${name}-390.png` }); }
  await context.close();
});
