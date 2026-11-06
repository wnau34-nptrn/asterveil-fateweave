import { test, expect } from '@playwright/test';

// Seer rework (save v51): Delay Fate changes the announced card at once and marks only the foe whose big move really moved;
// Falling Star marks Astrid as she sets it and paints a storm on each foe it strikes as the round ends.
test.skip(process.env.PLAYWRIGHT_PAGES === 'true', 'source-only Seer fixture runs explicitly in CI');
test.use({ reducedMotion: 'no-preference', viewport: { width: 390, height: 844 } });
const open = async (page: import('@playwright/test').Page, scenario: string) => {
  await page.goto(`tests/browser/fixtures/seer.html?scenario=${scenario}`); const start = page.locator('#start'); await start.click();
};
test('Delay Fate: the card names the delayed move, the mark lands on the delayed foe, one command is saved', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page, 'delay');
  await expect(page.locator('#intent')).toContainText('QA Big');
  await page.locator('#action-turncycle').click(); await page.locator('#target-f1').click();
  const saved = JSON.parse((await page.evaluate(() => localStorage.getItem('seer-committed')))!);
  expect(saved.commands).toHaveLength(1); expect(saved.commands[0]).toMatchObject({ heroId: 'astrid', action: 'turncycle', targetId: 'f1' });
  await expect.poll(async () => (await page.evaluate(() => window.seerQA.sample())).map(s => `${s.frame}@${s.target}`), { timeout: 8000 }).toEqual(expect.arrayContaining(['mark_peak@f1', 'dispel_peak@f1']));
  expect(await page.evaluate(() => window.seerQA.cues())).toEqual([{ skill: 'mark', targetId: 'f1' }, { skill: 'dispel', targetId: 'f1' }]);
  // Before f1 acts, its card already shows the stand-in move and the delay label.
  await expect(page.locator('#intent .intent-delay')).toBeVisible({ timeout: 8000 }); await expect(page.locator('#intent .intent-delay')).toHaveText('QA Big เลื่อนไปรอบหน้า');
  await expect(page.locator('#intent')).toContainText('QA Jab');
  await page.screenshot({ path: info.outputPath('seer-delay-390.png') });
  expect(errors).toEqual([]);
});
test('Falling Star: set on Astrid, then a storm on every foe as the round ends', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page, 'star');
  await page.locator('#action-doubledial').click(); await page.locator('#target-f1').click();
  await expect.poll(async () => (await page.evaluate(() => window.seerQA.sample())).map(s => `${s.frame}@${s.target}`), { timeout: 8000 }).toContain('mark_peak@astrid');
  // Knight and priest act next (plain attacks); the foes follow and the round ends.
  for (let i = 0; i < 2; i++) { await expect(page.locator('#action-attack')).toBeEnabled({ timeout: 15000 }); await page.locator('#action-attack').click(); await page.locator('#target-f1').click(); }
  await expect.poll(async () => (await page.evaluate(() => window.seerQA.sample())).map(s => `${s.frame}@${s.target}`), { timeout: 20000 })
    .toEqual(expect.arrayContaining(['mark_peak@astrid', 'storm_peak@f1', 'storm_peak@f2', 'storm_peak@b1']));
  expect(errors).toEqual([]);
});
