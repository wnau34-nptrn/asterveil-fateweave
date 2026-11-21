import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';

// Image-blank fix 2026-11-21 (B1): a screen comes up only once its main images have arrived (capped), the old screen
// stays up meanwhile with the pressed button showing that it is loading, and a broken or very slow file never holds it.
const key = 'asterveil.fateweave.expedition.v1';
const profile = () => { const p = newProfile(map, 17); p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } as never; p.tutorialDone = true; return p; };
const campSave = () => JSON.stringify({ version: 44, profile: profile(), run: null });
const mapSave = () => { const g = depart(profile(), map, lookup, 77); g.run.tutorialDone = true; g.run.repel = 10; return JSON.stringify({ version: 44, ...g }); };
async function seed(page: Page, raw: string) {
  // The dev server's many module files would otherwise fill the default 250-entry resource timing buffer.
  await page.addInitScript(({ key, raw }) => { localStorage.setItem(key, raw); performance.setResourceTimingBufferSize(10000); }, { key, raw });
}
// Records, when the view first becomes visible, which of the named images had already finished downloading.
async function watchView(page: Page, view: string, names: string[]) {
  await page.evaluate(({ view, names }) => {
    const el = document.querySelector<HTMLElement>(view)!; const w = window as unknown as { __shown?: { at: number; loaded: string[] } };
    const check = () => { if (w.__shown || el.hidden || el.classList.contains('view-off')) return;
      const done = performance.getEntriesByType('resource').map(r => r.name);
      w.__shown = { at: performance.now(), loaded: names.filter(n => done.some(d => d.includes(n))) }; };
    new MutationObserver(check).observe(el, { attributes: true });
  }, { view, names });
}
const shown = (page: Page) => page.waitForFunction(() => (window as unknown as { __shown?: { at: number; loaded: string[] } }).__shown).then(h => h.jsonValue());
const hold = (page: Page, pattern: string, ms: number, status = 200) => page.route(pattern, async route => {
  await new Promise(r => setTimeout(r, ms)); if (status === 200) await route.continue(); else await route.fulfill({ status, body: '' });
});

test('the camp waits for its backdrop and NPCs; the Continue button shows loading meanwhile', async ({ page }) => {
  await hold(page, '**/assets/lobby/lobby_bg.webp', 900); await hold(page, '**/assets/lobby/npc/npc_smith.webp', 900);
  await seed(page, campSave()); await page.goto('./');
  await expect(page.locator('#continue')).toBeVisible();
  await watchView(page, '#lobby-view', ['lobby_bg.webp', 'npc_smith.webp']);
  const t0 = Date.now(); await page.locator('#continue').click();
  await expect(page.locator('#continue')).toHaveClass(/is-loading/); await expect(page.locator('#continue')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#title-view')).toBeVisible();
  const at = await shown(page);
  expect(at.loaded).toEqual(['lobby_bg.webp', 'npc_smith.webp']);
  expect(Date.now() - t0).toBeLessThan(4000);
  await expect(page.locator('#lobby-depart')).toBeVisible();
  await expect(page.locator('#app')).not.toHaveAttribute('data-switching', 'true');
});

test('the map waits for its tiles, and a tap during the wait does nothing', async ({ page }) => {
  await hold(page, '**/assets/world/tileset.webp', 900); await hold(page, '**/assets/world/decor.webp', 900);
  await seed(page, mapSave()); await page.goto('./');
  await expect(page.locator('#continue')).toBeVisible();
  await watchView(page, '#world-view', ['tileset.webp', 'decor.webp']);
  await page.locator('#continue').click();
  await page.locator('#title-setup-toggle').click({ force: true });
  await expect(page.locator('#title-setup')).not.toHaveAttribute('open', '');
  const at = await shown(page);
  expect(at.loaded).toEqual(['tileset.webp', 'decor.webp']);
  await expect(page.locator('#move-up')).toBeVisible();
});

test('a very slow or broken image never holds a screen past the cap', async ({ page }) => {
  await hold(page, '**/assets/lobby/lobby_bg.webp', 15000); await hold(page, '**/assets/lobby/npc/*.webp', 0, 503);
  await seed(page, campSave()); await page.goto('./');
  await expect(page.locator('#continue')).toBeVisible();
  const t0 = Date.now(); await page.locator('#continue').click();
  await expect(page.locator('#lobby-depart')).toBeVisible({ timeout: 6000 });
  expect(Date.now() - t0).toBeLessThan(5000);
  await expect(page.locator('#continue')).not.toHaveClass(/is-loading/);
});
