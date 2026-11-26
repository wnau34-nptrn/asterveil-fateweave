import { test, expect, type Browser, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame, SAVE_VERSION } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';
const key = 'asterveil.fateweave.expedition.v1';

// UX/game-feel audit S2–S4 (docs/UX_GAMEFEEL_AUDIT.md P1-1..P1-3): member swap and tab entrances, and sheets/dialogs that fade out.
// The project runs browsers with reduced motion; these tests opt back in, and one checks the reduced path.
async function camp(browser: Browser, reducedMotion: 'reduce' | 'no-preference'): Promise<Page> {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion })).newPage();
  const p = newProfile(map, 17); p.tutorialDone = true; p.veteran = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p.campXp = xpAt(6); p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  for (const id of ['mira', 'toma', 'sefa']) if (!p.company.includes(id)) { p.company.push(id); p.members[id] = { stars: 1, shards: 0 }; }
  const raw = JSON.stringify({ version: SAVE_VERSION, profile: p, run: null }); parseGame(raw, map, lookup);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('ux-s2-s4')) { localStorage.setItem(key, raw); sessionStorage.setItem('ux-s2-s4', '1'); } }, { key, raw });
  // The camp waits up to 1.8 s for its images; slow CI runners need more than the default 5 s to arrive.
  await page.goto('./'); await page.locator('#continue').click({ timeout: 15_000 }); await expect(page.locator('#lobby-depart')).toBeVisible({ timeout: 15_000 });
  return page;
}
const running = (page: Page, sel: string) => page.locator(sel).evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').map(a => (a as CSSAnimation).animationName));
const content = '#camp-character-content';

test('member swaps and tab changes slide in from the side they came from, settle and never stack', async ({ browser }) => {
  const page = await camp(browser, 'no-preference');
  await page.locator('#lobby-tab-characters').click(); await expect(page.locator('#camp-character-dialog')).toBeVisible();
  const box = async () => page.locator(content).boundingBox();
  await page.waitForTimeout(400);   // let the dialog's own opening slide finish before measuring
  const before = await box();
  await page.locator('#camp-character-member-tracer').click();
  await expect(page.locator(content)).toHaveAttribute('data-enter', 'swap-next');
  expect(await running(page, content)).toContain('content-from-right');
  await page.locator('#camp-character-member-guardian').click();
  await expect(page.locator(content)).toHaveAttribute('data-enter', 'swap-prev');
  // Five quick taps end on the last one, with nothing left running after the entrance time.
  for (const id of ['tracer', 'weaver', 'healer', 'mira', 'toma']) { await page.locator(`#camp-character-member-${id}`).click(); await page.waitForTimeout(60); }
  await expect(page.locator('#camp-character-title')).toContainText('โทมะ');
  await page.waitForTimeout(350); expect(await running(page, '#camp-character-dialog')).toEqual([]);
  expect(await box()).toEqual(before);   // the content box never moves; only its paint slides
  await page.locator('#camp-character-tab-gear').click();
  await expect(page.locator(content)).toHaveAttribute('data-enter', 'tab-next');
  // A tab tap during the entrance takes effect at once.
  await page.locator('#camp-character-tab-skills').click(); await expect(page.locator('#camp-character-tab-skills')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#camp-character-tab-skills').focus(); await page.keyboard.press('ArrowLeft');
  await expect(page.locator(content)).toHaveAttribute('data-enter', 'tab-prev'); await expect(page.locator('#camp-character-tab-gear')).toBeFocused();
  // A plain re-render (no swap, no tab) does not replay anything.
  await page.waitForTimeout(350); await page.locator('#camp-gear-chip-compatible').click();
  await expect(page.locator(content)).not.toHaveAttribute('data-enter', /.+/);
});

test('closing the character dialog and a camp sheet leaves a short inert fade, focus returns at once', async ({ browser }) => {
  const page = await camp(browser, 'no-preference');
  await page.locator('#lobby-tab-characters').click(); await expect(page.locator('#camp-character-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.locator('#camp-character-dialog').evaluate(d => (d as HTMLDialogElement).open)).toBe(false);
  await expect(page.locator('#lobby-tab-characters')).toBeFocused();
  const copy = page.locator('.dialog-leaving');
  await expect(copy).toHaveCount(1);
  expect(await copy.evaluate(e => ({ ids: e.querySelectorAll('[id]').length + (e.id ? 1 : 0), inert: (e as HTMLElement).inert, hidden: e.getAttribute('aria-hidden') }))).toEqual({ ids: 0, inert: true, hidden: 'true' });
  await expect(copy).toHaveCount(0, { timeout: 1000 });
  await page.locator('#lobby-gacha').click(); await expect(page.locator('#lobby-sheet')).toBeVisible();
  await page.locator('#lobby-sheet [data-lobby=close]').click();
  await expect(page.locator('#lobby-gacha')).toBeFocused();
  await expect(page.locator('.lobby-sheet-leaving')).toHaveCount(1);
  // The next tap opens a sheet straight away, through the fading copy.
  await page.locator('#lobby-tab-gear').click(); await expect(page.locator('#lobby-sheet')).toHaveCount(1);
  await expect(page.locator('.lobby-sheet-leaving')).toHaveCount(0, { timeout: 1000 });
  for (let i = 0; i < 10; i++) { await page.keyboard.press('Escape'); await page.locator('#lobby-tab-gear').click(); }
  await expect(page.locator('#lobby-sheet')).toHaveCount(1); await expect(page.locator('.lobby-sheet-leaving')).toHaveCount(0, { timeout: 1000 });
});

test('reduced motion: no entrances and no fading copies', async ({ browser }) => {
  const page = await camp(browser, 'reduce');
  await page.locator('#lobby-tab-characters').click();
  await page.locator('#camp-character-member-tracer').click(); await page.locator('#camp-character-tab-gear').click();
  expect(await running(page, '#camp-character-dialog')).toEqual([]);
  await page.keyboard.press('Escape'); await expect(page.locator('.dialog-leaving')).toHaveCount(0);
  await page.locator('#lobby-gacha').click(); await page.locator('#lobby-sheet [data-lobby=close]').click();
  await expect(page.locator('.lobby-sheet-leaving')).toHaveCount(0);
});
