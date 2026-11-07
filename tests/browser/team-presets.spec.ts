import { expect, test, type Page } from '@playwright/test';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { parseGame } from '../../src/core/save/expedition-save';
import { newProfile } from '../../src/core/world/profile';
import type { Profile } from '../../src/core/world/types';
import { xpAt } from '../fixtures/camp-level';
import { currentSave } from '../fixtures/current-save';
import { watchPage } from './diagnostics';

// Team presets (owner 2026-11-06, save v56): save at the camp with one tap, switch the whole team with one tap, quick
// moves from the member panel, and switching on the map among the members brought (outside battle only).
const key = 'asterveil.fateweave.expedition.v1';
const ids = ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'sefa', 'brann', 'lio'];
function company(): Profile {
  const p = { ...newProfile(map, 21), tutorialDone: true, veteran: true as const, cleared: MAPS.map(m => m.id), commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } };
  return { ...p, company: [...ids], members: Object.fromEntries(ids.map(id => [id, { stars: 1, dupes: 0 }])), party: { deployed: ids.slice(0, 5), reserve: ids.slice(5, 7) }, campXp: xpAt(5) };
}
const game = async (page: Page) => parseGame(await page.evaluate(k => localStorage.getItem(k)!, key), map, lookup, MAPS);

test('camp presets: one tap saves, one tap switches back; quick moves; the map switches among the members brought', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); watchPage(page);
  const raw = currentSave({ profile: company(), run: null });
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('tp')) { localStorage.setItem(key, raw); sessionStorage.setItem('tp', '1'); } }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#lobby-tab-team').click();
  // An empty slot saves the team as it stands; it then shows as in use.
  await page.locator('#team-preset-0').click();
  await expect(page.locator('#team-preset-0')).toHaveAttribute('aria-pressed', 'true');
  let p = (await game(page)).profile; expect(p.presets).toEqual([expect.objectContaining({ name: 'ชุด 1', deployed: ids.slice(0, 5), reserve: ids.slice(5, 7) })]);
  // Quick moves: Lio to the reserve, Guardian to the camp; the preset no longer matches.
  await page.locator('#lobby-member-lio').click(); await page.locator('#lobby-quick-reserve').click();
  await page.locator('#lobby-member-guardian').click(); await page.locator('#lobby-quick-bench').click();
  p = (await game(page)).profile; expect(p.party.deployed).toEqual(ids.slice(1, 5)); expect(p.party.reserve).toEqual(['mira', 'toma', 'lio']);
  await expect(page.locator('#team-preset-0')).toHaveAttribute('aria-pressed', 'false');
  // Save this as a second, renamed preset; then one tap on the first restores everything.
  await page.locator('#team-preset-1').click(); await page.locator('#team-preset-manage summary').click();
  await page.locator('#team-preset-name').fill('สายรับ'); await page.locator('#team-preset-rename').click();
  await expect(page.locator('#team-preset-1')).toContainText('สายรับ');
  await page.locator('#team-preset-0').click();
  p = (await game(page)).profile; expect(p.party.deployed).toEqual(ids.slice(0, 5)); expect(p.party.reserve).toEqual(ids.slice(5, 7));
  for (const b of await page.locator('.preset-slot').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  // A too-long name is refused with a reason and nothing is saved.
  await page.locator('#team-preset-manage summary').click(); await page.locator('#team-preset-name').fill('ชื่อยาวเกินกว่าสิบสองตัวแน่นอน'); await page.locator('#team-preset-rename').click();
  await expect(page.locator('#team-preset-error')).toContainText('ชื่อยาวเกิน'); expect((await game(page)).profile.presets![0]!.name).toBe('ชุด 1');
  // On the map: the bag shows both presets. "สายรับ" names Lio, who stayed at the camp; Guardian (brought) keeps a seat.
  await page.locator('[data-lobby=close]').click(); await page.locator('#lobby-depart').click(); await expect(page.locator('#world-view')).toBeVisible();
  await page.keyboard.press('t');
  await expect(page.locator('#map-team-preset-0')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#map-team-preset-1')).toContainText('ขาด 1');
  await page.locator('#map-team-preset-1').click();
  const run = (await game(page)).run!; expect(run.roster.deployed).toEqual(['tracer', 'weaver', 'healer', 'garran']); expect(run.roster.reserve).toEqual(['mira', 'toma', 'guardian']);
  await expect(page.locator('#map-team-preset-1')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#map-team-preset-0').click();
  expect((await game(page)).run!.roster.deployed).toEqual(ids.slice(0, 5));
});
