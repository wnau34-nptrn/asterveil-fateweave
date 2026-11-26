import { test, expect, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';
import { parseGame, SAVE_VERSION } from '../../src/core/save/expedition-save';
import type { Item } from '../../src/core/world/types';
import { xpAt } from '../fixtures/camp-level';
const key = 'asterveil.fateweave.expedition.v1';

// UX/game-feel audit sprint 1 (docs/UX_GAMEFEEL_AUDIT.md): S1 small-frame camp row and fate-weave pulls, S5 empty gear lists.
function veteran(items: Item[] = []) {
  const p = newProfile(map, 17); p.tutorialDone = true; p.veteran = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p.campXp = xpAt(6); p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  p.items = items; p.nextItem = items.length + 1;
  return p;
}
async function load(page: Page, game: { profile: ReturnType<typeof veteran>; run: unknown }) {
  const raw = JSON.stringify({ version: SAVE_VERSION, ...game }); parseGame(raw, map, lookup);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('ux-s1-s5')) { localStorage.setItem(key, raw); sessionStorage.setItem('ux-s1-s5', '1'); } }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click();
}

for (const [w, h] of [[320, 640], [360, 640], [393, 852], [480, 900]] as const) test(`camp top row and fate-weave pulls fit at ${w}x${h}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: h });
  await load(page, { profile: veteran(), run: null });
  await expect(page.locator('#lobby-depart')).toBeVisible();
  for (const sel of ['#lobby-board', '#lobby-wboss', '#lobby-gacha']) {
    const m = await page.locator(sel).evaluate(e => ({ sh: e.scrollHeight, ch: e.clientHeight, sw: e.scrollWidth, cw: e.clientWidth, h: e.getBoundingClientRect().height }));
    expect(m.sh, sel).toBeLessThanOrEqual(m.ch); expect(m.sw, sel).toBeLessThanOrEqual(m.cw); expect(m.h, sel).toBeGreaterThanOrEqual(44);
  }
  // The title is whole and on one line (a broken Thai word used to wrap to three lines at 360px).
  const title = await page.locator('#lobby-board .quest-title').evaluate(e => ({ sw: e.scrollWidth, cw: e.clientWidth, h: e.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(e).fontSize) * 1.8 }));
  expect(title.sw).toBeLessThanOrEqual(title.cw); expect(title.h).toBeLessThanOrEqual(title.lh);
  for (const sel of ['#lobby-wboss .wb-banner-text b', '#lobby-wboss .wb-banner-text small']) {
    const t = await page.locator(sel).evaluate(e => ({ sw: e.scrollWidth, cw: e.clientWidth })); expect(t.sw, sel).toBeLessThanOrEqual(t.cw);
  }
  await page.locator('#lobby-gacha').click();
  for (const id of ['#gacha-pull-1', '#gacha-pull-10']) {
    const b = (await page.locator(id).boundingBox())!;
    expect(b.y + b.height, id).toBeLessThanOrEqual(h); expect(b.height, id).toBeGreaterThanOrEqual(44);
    const clip = await page.locator(`${id} small`).evaluate(e => e.scrollWidth > e.clientWidth); expect(clip, id).toBe(false);
  }
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight)).toBeLessThanOrEqual(h);
});

test('an empty camp storage explains where gear comes from and opens the map list', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await load(page, { profile: veteran(), run: null });
  await page.locator('#lobby-tab-gear').click();
  const empty = page.locator('#lobby-sheet .gear-empty');
  await expect(empty).toHaveAttribute('data-empty', 'none'); await expect(empty).toContainText('ยังไม่มีอุปกรณ์');
  await page.locator('#camp-inventory-empty-maps').click();
  await expect(page.locator('#lobby-view')).toHaveAttribute('data-lobby-sheet', 'maps');
});

test('filters that hide every item offer one tap to clear them', async ({ page }) => {
  const items: Item[] = [{ uid: 1, slot: 'body', rarity: 0, level: 3, affixes: [], set: 'wind' }, { uid: 2, slot: 'head', rarity: 0, level: 3, affixes: [], set: 'wind' }];
  await page.setViewportSize({ width: 393, height: 852 });
  const saved = async () => page.evaluate(k => localStorage.getItem(k), key);
  await load(page, { profile: veteran(items), run: null });
  const before = await saved();
  await page.locator('#lobby-tab-gear').click();
  await page.locator('#camp-inventory-gear-filter-set').selectOption('dawn');
  const empty = page.locator('#lobby-sheet .gear-empty');
  await expect(empty).toHaveAttribute('data-empty', 'filter'); await expect(empty).toContainText('มีอุปกรณ์ 2 ชิ้น');
  await page.locator('#camp-inventory-gear-empty-reset').click();
  await expect(page.locator('#lobby-sheet .inventory-gear li')).toHaveCount(2);
  await expect(page.locator('#camp-inventory-gear-filter-set')).toHaveValue('all');
  expect(await saved()).toBe(before);
});

test('a character slot with nothing to wear says so and returns to every slot', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await load(page, { profile: veteran([{ uid: 1, slot: 'body', rarity: 0, level: 3, affixes: [] }]), run: null });
  await page.locator('#lobby-tab-characters').click();
  await page.locator('#camp-character-tab-gear').click();
  const panel = page.locator('#camp-character-dialog');
  await panel.locator('#camp-bag-slot-head').click();
  await expect(panel.locator('.gear-empty')).toHaveAttribute('data-empty', 'slot');
  await panel.locator('#camp-bag-empty-all').click();
  await expect(panel.locator('.gear-empty')).toHaveCount(0);
  await expect(panel.locator('.bag-grid li')).toHaveCount(1);
});

test('an empty map pack sends the player back to exploring', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await load(page, depart(veteran(), map, lookup, 1234) as never);
  await page.locator('#world-pack').click(); await page.locator('#bag-tab-gear').click();
  await expect(page.locator('#pack-dialog .gear-empty')).toHaveAttribute('data-empty', 'none');
  await page.locator('#pack-empty-explore').click();
  await expect(page.locator('#pack-dialog')).not.toBeVisible();
});
