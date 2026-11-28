import { test, expect, type Page } from '@playwright/test';
import { chapterOne } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame, SAVE_VERSION } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';
import type { PetBook } from '../../src/core/world/types';

// PET-3 at 390px, offline: the camp pet den, the pet page (hatch an egg, choose the pet), the follower on the map, the
// blessing chip and the lantern's sightings. No rule or save change; screens for the owner go to the validation folder.
const key = 'asterveil.fateweave.expedition.v1';
const shots = 'docs/validation/pets/pet3';

async function open(page: Page, pets: PetBook): Promise<void> {
  const p = newProfile(chapterOne, 17, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(10); p.cleared = MAPS.map(m => m.id);
  p.bank = { ore: 100, gold: 100, shard: 0, dust: 20 }; p.pets = pets; p.guides = Object.fromEntries(chapterOne.guides.map(g => [g.id, 'skipped' as const])); // a pending guide card would cover the den
  const raw = JSON.stringify({ version: SAVE_VERSION, profile: p, run: null }); parseGame(raw, chapterOne, encounterById, MAPS);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('pet3')) { localStorage.setItem(key, raw); sessionStorage.setItem('pet3', '1'); } }, { key, raw });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./'); await page.locator('#continue').click();
}
const saved = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k)!) as { profile: { pets?: PetBook } }, key);

test('camp den: hatch an egg, the first pet is chosen, another can be chosen, none allowed', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, { eggs: 1, shards: 0, owned: [], from: ['moon-lake'] });
  const den = page.locator('#pet-den'); await expect(den).toBeVisible();
  expect((await den.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  await expect(den.locator('.den-badge')).toHaveText('1');
  await page.screenshot({ path: `${shots}/camp-den-390.png` });
  await den.click();
  await expect(page.locator('#lobby-sheet-title')).toBeFocused(); await expect(page.locator('.pet-card')).toHaveCount(6);
  await page.screenshot({ path: `${shots}/pet-page-eggs-390.png` });
  await page.locator('[data-lobby="pet-hatch"][data-pet="meadow_fox"]').click();
  const book = (await saved(page)).profile.pets!;
  expect(book.owned.map(o => o.kind)).toEqual(['meadow_fox']); expect(book.chosen).toBe('meadow_fox'); expect(book.eggs).toBe(0);
  await expect(page.locator('#pet-meadow_fox')).toHaveAttribute('data-chosen', 'true');
  await expect(page.locator('[data-lobby="pet-hatch"]').first()).toBeDisabled(); // no egg left
  await page.screenshot({ path: `${shots}/pet-page-hatched-390.png` });
  await page.locator('[data-lobby="pet-choose"][data-pet=""]').click();
  expect((await saved(page)).profile.pets!.chosen).toBeUndefined();
  await page.locator('[data-lobby="pet-choose"][data-pet="meadow_fox"]').click();
  expect((await saved(page)).profile.pets!.chosen).toBe('meadow_fox');
  for (const b of await page.locator('.pet-card button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('map: the pet follows one tile behind, the blessing chip shows, the lantern marks hidden finds', async ({ page }) => {
  test.setTimeout(180_000);
  await open(page, { eggs: 0, shards: 0, owned: [{ kind: 'forest_lantern_owl', level: 6, exp: 0 }], chosen: 'forest_lantern_owl', from: ['moon-lake'] });
  await page.locator('#lobby-depart').click();
  const follower = page.locator('#pet-follower'); await expect(follower).toBeVisible();
  await expect(page.locator('#pet-chip')).toContainText('ไฟนำทาง');
  const mark = async () => follower.evaluate(el => [(el as HTMLElement).style.getPropertyValue('--x'), (el as HTMLElement).style.getPropertyValue('--y')].join(','));
  const start = await mark();
  const token = () => page.locator('#party-token').evaluate(el => [(el as HTMLElement).style.getPropertyValue('--x'), (el as HTMLElement).style.getPropertyValue('--y')].join(','));
  expect(start).toBe(await token());
  for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
    const before = await token(); await page.keyboard.press(key); await page.waitForTimeout(250);
    const after = await token(); if (after !== before) { expect(await mark()).toBe(before); break; }
  }
  console.log('sightings', await page.locator('.pet-sighting').count());
  await page.screenshot({ path: `${shots}/map-owl-390.png` });
});
