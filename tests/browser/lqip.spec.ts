import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';

// B4 (2026-11-21): a blurred placeholder stands in while a big painting is still arriving, then goes away.
const key = 'asterveil.fateweave.expedition.v1';
const profile = () => { const p = newProfile(map, 17); p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } as never; p.tutorialDone = true; return p; };
// Holds the matching file until `release()` (so the assertions are not racing a timer).
function gate(page: Page, pattern: string) {
  let release = () => {}; const open = new Promise<void>(r => { release = r; });
  void page.route(pattern, async route => { await open; await route.continue(); });
  return release;
}

test('title: placeholder while the party painting loads, gone after', async ({ page }) => {
  const release = gate(page, '**/assets/title/title_party.webp');
  await page.goto('./', { waitUntil: 'commit' });
  const stage = page.locator('.title-stage');
  await expect(stage).toHaveClass(/lqip-on/);
  expect(await stage.evaluate(el => getComputedStyle(el, '::after').backgroundImage)).toContain('data:image/webp');
  release();
  await expect(stage).not.toHaveClass(/lqip-on/, { timeout: 9000 });
  expect(await stage.evaluate(el => el.style.getPropertyValue('--lqip'))).toBe('');
});

test('camp: placeholder under a slow backdrop (screen switch hits its cap), gone after', async ({ page }) => {
  const release = gate(page, '**/assets/lobby/lobby_bg.webp');
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: JSON.stringify({ version: 44, profile: profile(), run: null }) });
  await page.goto('./', { waitUntil: 'commit' });
  await page.locator('#continue').click();
  await expect(page.locator('#lobby-depart')).toBeVisible({ timeout: 8000 });
  const bd = page.locator('.lobby-backdrop');
  await expect(bd).toHaveClass(/lqip-on/);
  expect(await bd.evaluate(el => getComputedStyle(el, '::after').backgroundImage)).toContain('data:image/webp');
  release();
  await expect(bd).not.toHaveClass(/lqip-on/, { timeout: 9000 });
});
