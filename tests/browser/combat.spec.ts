import { expect, test, type Page } from '@playwright/test';

async function start(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Start encounter' }).click();
  return errors;
}
async function commit(page: Page): Promise<void> {
  await page.locator('#confirm').click();
  await expect(page.locator('#beat-status')).not.toContainText('RESOLVING');
}
async function choose(page: Page, hero: string, action: string, target: string): Promise<void> {
  await page.locator(`#hero-${hero}`).click();
  await page.locator(`#action-${action}`).click();
  await page.locator(`#target-${target}`).click();
}

test('real canvas, cancel, Guard, crystal Redirect, reload, restart and keyboard', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors = await start(page);
  const arena = await page.locator('#game canvas').boundingBox();
  expect(arena).not.toBeNull();
  await page.locator('#game canvas').click({ position: { x: arena!.width * 0.23, y: 98 } });
  await expect(page.locator('#hero-guardian')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#action-guard').click();
  await page.locator('#game canvas').click({ position: { x: arena!.width * 0.23, y: 198 } });
  await expect(page.locator('#beat-status')).toContainText('BEAT 01');
  await expect(page.locator('#preview')).toContainText('Aegis takes 4 damage');
  await page.locator('#cancel').click();
  await expect(page.locator('#confirm')).toHaveCount(0);
  await expect(page.locator('#beat-status')).toContainText('BEAT 01');
  await page.locator('#target-tracer').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#confirm')).toHaveCount(0);
  await page.locator('#target-tracer').click(); await commit(page);
  await expect(page.locator('#hero-guardian')).toContainText('60 / 64 HP');
  await expect(page.locator('#hero-tracer')).toContainText('44 / 44 HP');
  await choose(page, 'weaver', 'redirect', 'energy-crystal');
  await expect(page.locator('#target-brute')).toBeDisabled();
  await expect(page.locator('#preview')).toContainText('entire 18-damage attack');
  await page.screenshot({ path: info.outputPath('desktop-preview.png'), fullPage: true });
  await commit(page);
  await expect(page.locator('#hero-weaver')).toContainText('8 barrier');
  await expect(page.locator('#commands')).toContainText('0/1 charge remaining');
  await page.reload();
  await expect(page.locator('#beat-status')).toContainText('BEAT 03');
  await expect(page.locator('#hero-weaver')).toContainText('8 barrier');
  await expect(page.locator('#start')).toHaveCount(0);
  await page.locator('#restart').click();
  await expect(page.locator('#beat-status')).toContainText('BEAT 01');
  await expect(page.locator('#hero-guardian')).toContainText('64 / 64 HP');
  await page.screenshot({ path: info.outputPath('desktop-battle.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('Mark and Redirect to a marked enemy are playable through actual controls', async ({ page }) => {
  const errors = await start(page);
  await choose(page, 'guardian', 'guard', 'tracer'); await commit(page);
  await choose(page, 'tracer', 'mark', 'brute'); await commit(page);
  await choose(page, 'guardian', 'guard', 'weaver'); await commit(page);
  // Beat 4 is physical: transparent restriction, no universal Redirect.
  await page.locator('#hero-weaver').click();
  await expect(page.locator('#action-redirect')).toBeDisabled();
  await expect(page.locator('#reason-redirect')).toContainText('energy');
  await choose(page, 'tracer', 'mark', 'brute'); await commit(page);
  await choose(page, 'guardian', 'attack', 'brute'); await commit(page);
  await choose(page, 'weaver', 'redirect', 'brute');
  await expect(page.locator('#preview')).toContainText('takes 18 damage');
  await commit(page);
  await expect(page.locator('#target-brute')).toContainText('62/90 HP');
  await expect(page.locator('#target-brute')).toContainText('EXPOSED');
  expect(errors).toEqual([]);
});

test('attack-only play earns a genuine Victory and can restart', async ({ page }, info) => {
  const errors = await start(page);
  for (let beat = 0; beat < 25; beat++) {
    if (await page.getByRole('heading', { name: 'Victory', exact: true }).count()) break;
    let hero = 'guardian';
    for (const id of ['tracer', 'weaver', 'guardian']) if (await page.locator(`#hero-${id}`).isEnabled()) { hero = id; break; }
    await page.locator(`#hero-${hero}`).click();
    await page.locator('#action-attack').click();
    const target = await page.locator('#target-raider').isEnabled() ? 'raider' : 'brute';
    await page.locator(`#target-${target}`).click(); await commit(page);
  }
  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('victory.png'), fullPage: true });
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(page.locator('#beat-status')).toContainText('BEAT 01');
  expect(errors).toEqual([]);
});

test('poor decisions produce genuine Defeat without a scripted outcome', async ({ page }, info) => {
  test.setTimeout(90000);
  const errors = await start(page);
  for (let beat = 0; beat < 35; beat++) {
    if (await page.getByRole('heading', { name: 'Defeat', exact: true }).count()) break;
    if (await page.locator('#hero-tracer').isEnabled()) await choose(page, 'tracer', 'mark', 'brute');
    else if (await page.locator('#hero-guardian').isEnabled()) {
      await page.locator('#hero-guardian').click(); await page.locator('#action-guard').click();
      await page.locator('.target:not([disabled])').first().click();
    } else await choose(page, 'weaver', 'attack', 'brute');
    await commit(page);
  }
  await expect(page.getByRole('heading', { name: 'Defeat', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('defeat.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile touch controls, responsive layout and reduced motion', async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage(); const errors = await start(page);
  await page.locator('#hero-guardian').tap(); await page.locator('#action-guard').tap(); await page.locator('#target-tracer').tap();
  await page.screenshot({ path: info.outputPath('mobile-preview.png'), fullPage: true });
  await page.locator('#confirm').tap();
  await expect(page.locator('#beat-status')).not.toContainText('RESOLVING');
  await expect(page.locator('#hero-guardian')).toContainText('60 / 64 HP');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#game canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]); await context.close();
});

test('unavailable browser storage leaves a playable session', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Storage unavailable'); } });
  });
  const errors = await start(page);
  await choose(page, 'guardian', 'guard', 'tracer'); await commit(page);
  await expect(page.locator('#save-status')).toContainText('SESSION ONLY');
  await expect(page.locator('#beat-status')).toContainText('BEAT 02');
  expect(errors).toEqual([]);
});
