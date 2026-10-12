import { expect, test, type Page } from '@playwright/test';

async function start(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./');
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.getByRole('button', { name: 'เริ่มต่อสู้ →' }).click();
  return errors;
}
async function commit(page: Page): Promise<void> {
  await page.locator('#confirm').click();
  await expect(page.locator('#beat-status')).not.toContainText('กำลังแสดงผล');
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
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  await expect(page.locator('#preview')).toContainText('เอกิส เสียเลือด 4');
  await page.locator('#cancel').click();
  await expect(page.locator('#confirm')).toHaveCount(0);
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  await page.locator('#target-tracer').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#confirm')).toHaveCount(0);
  await page.locator('#target-tracer').click(); await commit(page);
  await expect(page.locator('#hero-guardian')).toContainText('60 / 64');
  await expect(page.locator('#hero-tracer')).toContainText('44 / 44');
  await choose(page, 'weaver', 'redirect', 'energy-crystal');
  await expect(page.locator('#target-brute')).toBeDisabled();
  await expect(page.locator('#preview')).toContainText('ผลึกรับการโจมตี 30 ทั้งหมด');
  await page.screenshot({ path: info.outputPath('desktop-preview.png'), fullPage: true });
  await commit(page);
  await expect(page.locator('#hero-weaver')).toContainText('โล่ 8');
  await expect(page.locator('#crystal-info')).toContainText('ใช้ไปแล้ว');
  await page.reload();
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 3');
  await expect(page.locator('#hero-weaver')).toContainText('โล่ 8');
  await expect(page.locator('#start')).toHaveCount(0);
  await page.locator('#restart').click();
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  await expect(page.locator('#hero-guardian')).toContainText('64 / 64');
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
  await expect(page.locator('#reason-redirect')).toContainText('พลังงาน');
  await choose(page, 'tracer', 'mark', 'brute'); await commit(page);
  await choose(page, 'guardian', 'attack', 'brute'); await commit(page);
  await choose(page, 'weaver', 'redirect', 'brute');
  await expect(page.locator('#preview')).toContainText('เสียเลือด 30');
  await commit(page);
  await expect(page.locator('#target-brute')).toContainText('50 / 90');
  await expect(page.locator('#target-brute')).toContainText('เปิดช่องให้ไลรา');
  expect(errors).toEqual([]);
});

test('attack-only Brute priority earns a costly Victory and warns of a lethal choice', async ({ page }, info) => {
  const errors = await start(page);
  for (let beat = 0; beat < 25; beat++) {
    if (await page.getByRole('heading', { name: 'ชนะแล้ว', exact: true }).count()) break;
    let hero = 'guardian';
    for (const id of ['tracer', 'weaver', 'guardian']) if (await page.locator(`#hero-${id}`).isEnabled()) { hero = id; break; }
    await page.locator(`#hero-${hero}`).click();
    await page.locator('#action-attack').click();
    const target = await page.locator('#target-brute').isEnabled() ? 'brute' : 'raider';
    await page.locator(`#target-${target}`).click();
    if (beat === 7) {
      await expect(page.locator('#intent')).toContainText('ไลรา จะล้ม');
      await expect(page.locator('#preview')).toContainText('ไลรา จะล้มถ้าใช้คำสั่งนี้');
      await page.screenshot({ path: info.outputPath('lethal-attack-preview.png'), fullPage: true });
    }
    await commit(page);
  }
  await expect(page.getByRole('heading', { name: 'ชนะแล้ว', exact: true })).toBeVisible();
  await expect(page.locator('#start-screen')).toContainText('ยืนอยู่ 2 / 3 คน');
  await expect(page.locator('#start-screen')).toContainText('ชนะ แต่เสียสมาชิกในทีม');
  await page.screenshot({ path: info.outputPath('victory.png'), fullPage: true });
  await page.getByRole('button', { name: 'เล่นอีกครั้ง ↻' }).click();
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  expect(errors).toEqual([]);
});

test('blind Raider-first attacks lose instead of rewarding target-independent spam', async ({ page }) => {
  const errors = await start(page);
  for (let beat = 0; beat < 20; beat++) {
    if (await page.getByRole('heading', { name: 'แพ้แล้ว', exact: true }).count()) break;
    const hero = await page.locator('#hero-tracer').isEnabled() ? 'tracer' : await page.locator('#hero-weaver').isEnabled() ? 'weaver' : 'guardian';
    await page.locator(`#hero-${hero}`).click();
    await page.locator('#action-attack').click();
    const target = await page.locator('#target-raider').isEnabled() ? 'raider' : 'brute';
    await page.locator(`#target-${target}`).click(); await commit(page);
  }
  await expect(page.getByRole('heading', { name: 'แพ้แล้ว', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Mark, Guard and Crystal keep the party intact through a genuine full battle', async ({ page }, info) => {
  test.setTimeout(90000);
  const errors = await start(page);
  await page.locator('#forecast-details summary').click();
  await expect(page.locator('#forecast')).toBeVisible();
  await expect(page.locator('#forecast')).toContainText('พลังโจมตี 30');
  await page.locator('#forecast-details summary').click();
  await expect(page.locator('#reason-mark')).toContainText('38');
  const moves = [
    ['tracer', 'mark', 'brute'], ['guardian', 'guard', 'guardian'], ['tracer', 'attack', 'brute'],
    ['tracer', 'mark', 'brute'], ['tracer', 'attack', 'brute'], ['weaver', 'redirect', 'energy-crystal'],
    ['tracer', 'attack', 'brute'], ['tracer', 'mark', 'raider'], ['tracer', 'attack', 'raider'],
  ];
  for (const [hero, action, target] of moves) {
    await choose(page, hero!, action!, target!);
    if (action === 'redirect') {
      await expect(page.locator('#preview')).toContainText('ผลึกรับการโจมตี 30 ทั้งหมด');
      await page.screenshot({ path: info.outputPath('tactical-crystal-choice.png'), fullPage: true });
    }
    await commit(page);
  }
  await expect(page.getByRole('heading', { name: 'ชนะแล้ว', exact: true })).toBeVisible();
  await expect(page.locator('#start-screen')).toContainText('ยืนอยู่ 3 / 3 คน');
  await expect(page.locator('#start-screen')).toContainText('เลือดทีม 88');
  await expect(page.locator('#start-screen')).toContainText('รักษาทีมครบทุกคน');
  await page.screenshot({ path: info.outputPath('party-intact-victory.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('poor decisions produce genuine Defeat without a scripted outcome', async ({ page }, info) => {
  test.setTimeout(90000);
  const errors = await start(page);
  for (let beat = 0; beat < 35; beat++) {
    if (await page.getByRole('heading', { name: 'แพ้แล้ว', exact: true }).count()) break;
    if (await page.locator('#hero-tracer').isEnabled()) await choose(page, 'tracer', 'mark', 'brute');
    else if (await page.locator('#hero-guardian').isEnabled()) {
      await page.locator('#hero-guardian').click(); await page.locator('#action-guard').click();
      await page.locator('.target:not([disabled])').first().click();
    } else await choose(page, 'weaver', 'attack', 'brute');
    await commit(page);
  }
  await expect(page.getByRole('heading', { name: 'แพ้แล้ว', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('defeat.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile touch controls, responsive layout and reduced motion', async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage(); const errors = await start(page);
  await page.locator('#hero-guardian').tap(); await page.locator('#action-guard').tap(); await page.locator('#target-tracer').tap();
  await page.screenshot({ path: info.outputPath('mobile-preview.png'), fullPage: true });
  await page.locator('#confirm').tap();
  await expect(page.locator('#beat-status')).not.toContainText('กำลังแสดงผล');
  await expect(page.locator('#hero-guardian')).toContainText('60 / 64');
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
  await expect(page.locator('#save-status')).toContainText('เล่นได้ แต่บันทึกบนเครื่องนี้ไม่ได้');
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 2');
  expect(errors).toEqual([]);
});


test('Thai steps show only each hero’s actions and readable restrictions at narrow and tablet widths', async ({ page }, info) => {
  const errors = await start(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'th');
  await expect(page.locator('.step-heading')).toHaveCount(4);
  await expect(page.locator('.actions button')).toHaveCount(2);
  await expect(page.locator('#action-mark')).toBeVisible();
  await page.locator('#hero-weaver').click();
  await expect(page.locator('.actions button')).toHaveCount(2);
  await expect(page.locator('#action-redirect')).toBeDisabled();
  await expect(page.locator('#reason-redirect')).toContainText('พลังงาน');
  await page.locator('.field-notes summary').click();
  await expect(page.locator('#rules')).toBeVisible();
  await expect(page.locator('#rules')).toContainText('ติดตรา (Mark)');
  await page.locator('.field-notes summary').click();
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await choose(page, 'guardian', 'guard', 'tracer');
    await expect(page.locator('.player-outcome')).toContainText('รับการโจมตีแทนไลรา');
    await expect(page.locator('.enemy-outcome')).toContainText('เอกิส เสียเลือด 4');
    await expect(page.locator('.predictions')).toContainText('64 → 60');
    await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const selector of ['#hero-guardian', '#action-guard', '#target-tracer', '#confirm']) {
      const box = await page.locator(selector).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: info.outputPath(`thai-layout-${width}.png`), fullPage: true });
    await page.locator('#cancel').click();
  }
  expect(errors).toEqual([]);
});
