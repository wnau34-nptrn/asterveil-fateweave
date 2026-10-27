import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.skip(!process.env.HEALING_ART, 'source-only artwork capture/review');
const skills = ['heal', 'prayer', 'rouse', 'revive', 'bless', 'mend'];
test('capture truthful 390px artwork references', async ({ browser }) => {
  test.skip(process.env.HEALING_ART !== 'references'); test.setTimeout(180000);
  const out = 'incoming/ART-VFX-HEALING-001/reference'; mkdirSync(out, { recursive: true });
  const anchors: Record<string, unknown> = {};
  for (const skill of skills) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    try {
      const page = await ctx.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`tests/browser/fixtures/healing-art.html?skill=${skill}`);
      const start = page.locator('#start'); if (await start.isVisible()) await start.click();
      await expect(page.locator(`#action-${skill}`)).toBeVisible();
      await page.locator(`#action-${skill}`).click();
      await page.evaluate(() => document.fonts.ready.then(() => undefined)); await page.waitForTimeout(500);
      const a = await page.evaluate(() => window.healingArtQA.anchors()); anchors[skill] = a;
      if (skill === 'rouse') { expect(a.guard?.all).toBe(true); expect(a.events.some(e => e.type === 'heal')).toBe(false); }
      if (skill === 'bless' || skill === 'mend') { expect(a.events.some(e => e.type === 'heal')).toBe(false); expect(a.tickEvents.length).toBeGreaterThan(0); }
      if (skill === 'revive') { expect(a.before.heroes.find(h => h.id === a.targets[0]!.id)?.fell).toBe(true); expect(a.events.some(e => e.type === 'revive')).toBe(true); }
      expect(await page.evaluate(() => window.healingArtQA.committed())).toEqual(a.prelude);
      await page.screenshot({ path: `${out}/${skill}-390.png` }); expect(errors).toEqual([]);
    } finally { await ctx.close(); }
  }
  writeFileSync(`${out}/anchors.json`, JSON.stringify(anchors, null, 2) + '\n');
});

test('review all six three-phase boards and separate upkeep', async ({ page }) => {
  test.skip(process.env.HEALING_ART !== 'render');
  await page.setViewportSize({ width: 390, height: 1000 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('docs/combat-presentation/healing-storyboards/index.html');
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  for (const skill of skills) {
    await page.locator(`button[data-skill="${skill}"]`).click();
    await expect(page.locator('canvas')).toHaveCount(3);
    for (const mode of skill === 'bless' || skill === 'mend' ? ['cast', 'tick'] : ['cast']) {
      await page.selectOption('#mode', mode);
      const frames = await page.locator('canvas').evaluateAll(cs => cs.map(c => (c as HTMLCanvasElement).toDataURL()));
      for (let i = 0; i < frames.length; i++) writeFileSync(`docs/combat-presentation/healing-storyboards/${skill}-${mode}-${i}-390.png`, Buffer.from(frames[i]!.split(',')[1]!, 'base64'));
    }
  }
  const painted = await page.locator('canvas').nth(1).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.locator('#toggle').click();
  const bare = await page.locator('canvas').nth(1).evaluate((c: HTMLCanvasElement) => c.toDataURL()); expect(bare).not.toBe(painted);
  await page.locator('#weight').fill('60'); await page.locator('#reset').click();
  await expect(page.locator('#weight')).toHaveValue('100');
  await expect(page.locator('#mode')).toHaveValue('cast');
  await page.locator('[data-phase="2"]').click(); expect(await page.locator('.scroll').evaluate(e => e.scrollLeft)).toBe(780);
  await expect(page.locator('nav button')).toHaveCount(6); expect(errors).toEqual([]);
});
