import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { MAPS } from '../../src/content/world/maps';
import { newProfile, reserveSlots } from '../../src/core/world/profile';
import { autoTeamPlan } from '../../src/core/world/auto-team';
import { currentSave } from '../fixtures/current-save';

// Auto team (owner 2026-11-28 “เพิ่มปุ่มจัดทีมอัตโนมัติ ที่หน้าจัดทีม กดปุ่มเดียวจัดทีมให้ทั้งตัวจริงและสำรอง”) at 390px.
const key = 'asterveil.fateweave.expedition.v1';
const COMPANY = ['guardian', 'tracer', 'weaver', 'healer', 'mira', 'toma', 'sefa', 'brann', 'lio', 'garran', 'metta', 'lalin'];
function camp() {
  const p = newProfile(map, 17, COMPANY); p.tutorialDone = true; p.cleared = MAPS.slice(0, 3).map(m => m.id);
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p.members.mira!.stars = 5; p.members.garran!.stars = 4; p.members.lalin!.stars = 3;
  p.party = { deployed: ['guardian', 'tracer'], reserve: ['lio'], lanes: { tracer: 'back' } };
  return p;
}
async function open(page: Page, width = 390, height = 844) {
  await page.setViewportSize({ width, height });
  const raw = currentSave({ profile: camp(), run: null });
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('auto-team')) { localStorage.setItem(key, raw); localStorage.setItem('asterveil.fateweave.lessons.v1', JSON.stringify({ seen: [], off: true })); sessionStorage.setItem('auto-team', '1'); } }, { key, raw });
  await page.goto('./?server=off'); await page.locator('#continue').click(); await page.locator('#lobby-tab-team').click();
}
const party = async (page: Page) => (JSON.parse(await page.evaluate(k => localStorage.getItem(k)!, key)) as { profile: { party: { deployed: string[]; reserve: string[]; lanes?: Record<string, string> } } }).profile.party;

for (const [width, height] of [[390, 844], [320, 568]] as const) test(`one tap fills the field and the reserve with the planned team, once, at ${width}px`, async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page, width, height);
  const button = page.locator('#team-auto');
  await expect(button).toBeVisible(); expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  if (width === 390) await page.screenshot({ path: info.outputPath('auto-team-before-390.png') });
  await button.click();
  const plan = autoTeamPlan(camp(), map, lookup)!.roster;
  await expect.poll(async () => (await party(page)).deployed).toEqual(plan.deployed);
  const after = await party(page);
  expect(after.reserve).toEqual(plan.reserve); expect(after.reserve).toHaveLength(reserveSlots(camp(), map)); expect(after.lanes?.tracer).toBeUndefined();
  await expect(page.locator('.formation-cell[data-hero]')).toHaveCount(5);
  await expect(page.locator('.team-auto-note')).toContainText('จัดทีมอัตโนมัติแล้ว');
  if (width === 390) await page.screenshot({ path: info.outputPath('auto-team-after-390.png') });
  // A second tap changes nothing and says so.
  const saved = await page.evaluate(k => localStorage.getItem(k), key);
  await button.click();
  await expect(page.locator('.team-auto-note')).toContainText('ตรงกับที่จัดอัตโนมัติอยู่แล้ว');
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(saved);
  expect(errors).toEqual([]);
});
