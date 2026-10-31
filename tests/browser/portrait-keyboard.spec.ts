import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { newExpedition } from '../../src/core/world/world';
import { newProfile } from '../../src/core/world/profile';
import type { ExpeditionState } from '../../src/core/world/types';
import { legacyEnvelope } from '../fixtures/legacy-save';
const key = 'asterveil.fateweave.expedition.v1';
const commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
async function seed(page: Page, run: ExpeditionState | null, stars = 1) {
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander };
  if (stars > 1) for (const id of Object.keys(profile.members)) {
    profile.members[id]!.stars = stars;
    if (run?.members[id]) run.members[id]!.stars = stars;
  }
  await page.addInitScript(({ raw, key }) => {
    if (sessionStorage.getItem('portrait-seeded')) return;
    localStorage.setItem(key, raw); sessionStorage.setItem('portrait-seeded', 'yes');
  }, { key, raw: JSON.stringify(legacyEnvelope({ version: 21, profile, run })) });
  await page.goto('./');
}
function battleRun() {
  const run = newExpedition(map, encounterById, 35, undefined, true); run.tutorialDone = true;
  run.battle = { kind: 'random', encounterId: 'thicket-ambush', entry: { ...run.hp }, commands: [] };
  return run;
}
async function battle(page: Page, stars = 1) {
  await seed(page, battleRun(), stars); await page.locator('#continue').click(); await page.locator('#start').click();
  await expect(page.locator('#action-attack')).toBeEnabled();
}
async function commandCount(page: Page) { return page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.battle.commands.length as number, key); }
async function settle(page: Page) {
  const skip = page.locator('#skip-turn'); if (await skip.count()) await skip.click({ timeout: 2000 }).catch(() => {});
  await expect(page.locator('#action-attack')).toBeEnabled();
}
async function inFrame(page: Page, selector: string) {
  expect(await page.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect(), frame = document.querySelector('#app')!.getBoundingClientRect();
    return r.width >= 44 && r.height >= 44 && r.left >= frame.left - 1 && r.right <= frame.right + 1 && r.top >= frame.top - 1 && r.bottom <= frame.bottom + 1;
  })).toBe(true);
}
for (const [width, height, touch] of [[1366, 768, false], [1920, 1080, false], [390, 844, true], [320, 568, true], [768, 1024, true]] as const) {
  test(`one portrait frame fits title, camp, world and dialogs at ${width}x${height}`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, reducedMotion: 'reduce' });
    const page = await context.newPage(); const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
    await seed(page, null); await expect(page.locator('#orientation-gate')).not.toBeVisible();
    const frame = (await page.locator('#app').boundingBox())!;
    expect(frame.width).toBeLessThanOrEqual(480); expect(frame.width).toBeLessThan(frame.height);
    expect(Math.abs(frame.x + frame.width / 2 - width / 2)).toBeLessThanOrEqual(1);
    for (const id of ['#continue', '#new-game']) await inFrame(page, id);
    await page.screenshot({ path: info.outputPath('portrait-title.png') });
    await page.locator('#continue').click(); await expect(page.locator('#lobby-view')).toBeVisible();
    await inFrame(page, '#lobby-depart'); await page.locator('#lobby-tab-team').click();
    await expect(page.locator('#lobby-sheet')).toBeVisible();
    expect(await page.locator('#lobby-sheet').boundingBox()).toEqual(frame);
    await page.locator('[data-lobby=close]').click(); await page.locator('#lobby-depart').click();
    await expect(page.locator('#world-view')).toBeVisible();
    expect(await page.locator('#map-viewport').boundingBox()).toEqual(frame);
    await page.screenshot({ path: info.outputPath('portrait-world.png') });
    if (touch) await page.locator('#world-pack').click(); else await page.keyboard.press('b');
    await expect(page.locator('#pack-dialog')).toBeVisible();
    await inFrame(page, '#pack-dialog'); await page.screenshot({ path: info.outputPath('portrait-bag.png') });
    if (touch) await page.keyboard.press('Escape'); else await page.keyboard.press('b');
    await expect(page.locator('#pack-dialog')).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(issues).toEqual([]); await context.close();
  });
}

test('PC: number selects a skill, mouse commits once, Escape cancels targeting, and info is optional', async ({ page }, info) => {
  await page.setViewportSize({ width: 1366, height: 768 }); await battle(page);
  await page.keyboard.press('2'); await expect(page.locator('#action-mark')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#skill-popover')).not.toBeVisible(); expect(await commandCount(page)).toBe(0);
  await page.screenshot({ path: info.outputPath('pc-keyboard-mark.png') });
  await page.keyboard.press('Escape'); await expect(page.locator('#action-mark')).toHaveAttribute('aria-pressed', 'false');
  // Native canvas input and forged DOM events must also respect cancellation.
  const target = (await page.locator('#target-f1').boundingBox())!;
  await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2);
  await page.locator('#target-f1').evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(await commandCount(page)).toBe(0);
  await page.keyboard.press('2'); await page.locator('#target-f1').click(); await settle(page);
  expect(await commandCount(page)).toBe(1); await expect(page.locator('#hero-weaver')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('3'); await expect(page.locator('#action-ward')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#skill-details').click(); await expect(page.locator('#skill-popover')).toBeVisible();
  await inFrame(page, '#skill-popover'); await page.keyboard.press('Escape');
  await expect(page.locator('#action-ward')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#target-weaver').click(); await settle(page); expect(await commandCount(page)).toBe(2);
});

test('PC: held, modified and enemy-stage number keys never queue a command for the next hero', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 }); await battle(page);
  await page.keyboard.press('Control+3'); await expect(page.locator('#action-attack')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '3', code: 'Digit3', repeat: true, bubbles: true })));
  await expect(page.locator('#action-attack')).toHaveAttribute('aria-pressed', 'true');
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.keyboard.press('2'); await page.locator('#target-f1').click();
  await expect(page.locator('#action-attack')).toBeDisabled();
  await page.keyboard.press('3'); await page.keyboard.press('Escape'); expect(await commandCount(page)).toBe(1);
  await page.clock.runFor(2500); await expect(page.locator('#action-attack')).toBeEnabled();
  await expect(page.locator('#action-attack')).toHaveAttribute('aria-pressed', 'true'); expect(await commandCount(page)).toBe(1);
  // A missing fourth slot cannot select or cast another skill.
  await page.keyboard.press('4'); await expect(page.locator('#action-attack')).toHaveAttribute('aria-pressed', 'true');
});

test('PC: fourth unlocked skill uses slot 4 and a later cooldown has no valid targets', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 }); await battle(page, 3);
  await expect(page.locator('.actions .action')).toHaveCount(4);
  const fourth = page.locator('.actions .action').nth(3); const id = await fourth.getAttribute('id');
  await page.keyboard.press('4'); await expect(fourth).toHaveAttribute('aria-pressed', 'true');
  expect(await commandCount(page)).toBe(0); await page.keyboard.press('Escape'); expect(await commandCount(page)).toBe(0);
  await page.keyboard.press('3'); await page.locator('#target-f1').click(); await settle(page);
  // Move to the next round without spending another skill on the first hero.
  for (const id of ['b1', 'f1', 'b1']) { await page.keyboard.press('1'); await page.locator(`#target-${id}`).click(); await settle(page); }
  await expect(page.locator('#action-execute')).toBeVisible(); await page.keyboard.press('3');
  await expect(page.locator('#action-execute')).toHaveAttribute('data-unavailable', 'true');
  await expect(page.locator('#commands')).toContainText('คูลดาวน์');
  expect(await page.locator('.field-target:not(:disabled)').count()).toBe(0);
  expect(id).toBe('action-finisher'); expect(await commandCount(page)).toBe(4);
});

test('PC: movement keys, B and I act only in the world and pause behind dialogs', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const run = newExpedition(map, encounterById, 35, undefined, true); run.repel = map.potions.repelSteps; run.tutorialDone = true;
  await seed(page, run); await page.locator('#continue').click();
  const steps = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.steps as number, key);
  await page.keyboard.press('a'); expect(await steps()).toBe(1); await page.waitForTimeout(130);
  await page.keyboard.press('ArrowRight'); expect(await steps()).toBe(2);
  await page.keyboard.press('b'); await expect(page.locator('#pack-dialog')).toBeVisible();
  await page.keyboard.press('a'); await page.keyboard.press('i'); expect(await steps()).toBe(2);
  await expect(page.locator('#world-info')).not.toBeVisible();
  await page.keyboard.press('b'); await expect(page.locator('#pack-dialog')).not.toBeVisible();
  await page.keyboard.press('i'); await expect(page.locator('#world-info')).toBeVisible();
  await page.keyboard.press('i'); await expect(page.locator('#world-info')).not.toBeVisible();
});

test('PC: I opens battle info; number keys leave selection and save untouched while a native setting has focus', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 }); await battle(page);
  await page.keyboard.press('2'); await page.keyboard.press('i'); await expect(page.locator('#game-info')).toBeVisible();
  const before = await page.evaluate(k => localStorage.getItem(k), key);
  await page.locator('#battle-tab-settings').click(); await page.locator('#battle-sfx-volume').focus(); await page.keyboard.press('3');
  await expect(page.locator('#action-mark')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before);
  await page.keyboard.press('Escape'); await expect(page.locator('#game-info')).not.toBeVisible();
  await expect(page.locator('#battle-info')).toBeFocused();
  await page.keyboard.press('3'); await expect(page.locator('#action-execute')).toHaveAttribute('aria-pressed', 'true');
});

for (const [width, height] of [[844, 390], [667, 375]] as const) {
  test(`touch landscape ${width}x${height}: rotation guidance blocks input without changing the save`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true }); const page = await context.newPage();
    await seed(page, battleRun()); await expect(page.locator('#orientation-gate')).toBeVisible();
    const before = await page.evaluate(k => localStorage.getItem(k), key);
    await page.keyboard.press('1'); await page.keyboard.press('b'); await page.keyboard.press('Escape');
    await expect(page.locator('#orientation-gate')).toBeVisible(); expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before);
    await page.screenshot({ path: info.outputPath('rotate-to-portrait.png') });
    await page.setViewportSize({ width: height, height: width }); await expect(page.locator('#orientation-gate')).not.toBeVisible();
    await page.locator('#continue').click(); await page.locator('#start').click(); await expect(page.locator('#action-attack')).toBeEnabled();
    expect(await commandCount(page)).toBe(0); await context.close();
  });
}

test('touch: rotating with a dialog open keeps the rotation gate above it and preserves the pending skill', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const page = await context.newPage();
  await battle(page); await page.locator('#action-mark').tap(); await page.locator('#battle-info').tap();
  await page.setViewportSize({ width: 844, height: 390 }); await expect(page.locator('#orientation-gate')).toBeVisible();
  expect(await page.locator('#orientation-gate').evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
  await page.keyboard.press('Escape'); await expect(page.locator('#orientation-gate')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 }); await expect(page.locator('#game-info')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#action-mark')).toHaveAttribute('aria-pressed', 'true');
  expect(await commandCount(page)).toBe(0); await context.close();
});

test('touch: typing a commander name is not mistaken for game shortcuts or a physical rotation', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const page = await context.newPage();
  await page.goto('./'); await page.locator('#new-game').click(); await page.locator('#commander-name').focus();
  await page.keyboard.type('wasd1234bi'); await expect(page.locator('#commander-name')).toHaveValue('wasd1234bi');
  await page.setViewportSize({ width: 390, height: 340 }); await expect(page.locator('#orientation-gate')).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 }); await expect(page.locator('#commander-name')).toHaveValue('wasd1234bi');
  await context.close();
});

test('short PC window requests more height without scaling buttons below their touch size', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 }); await page.goto('./');
  await expect(page.locator('#orientation-gate')).toContainText('ขยายหน้าต่าง');
  await page.setViewportSize({ width: 844, height: 600 }); await expect(page.locator('#orientation-gate')).not.toBeVisible();
  const frame = (await page.locator('#app').boundingBox())!; expect(frame.height).toBe(600); expect(frame.width).toBeLessThan(frame.height);
  await inFrame(page, '#new-game');
});
