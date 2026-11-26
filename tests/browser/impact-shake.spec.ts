import { test, expect, type Browser } from '@playwright/test';
import { SHAKE } from '../../src/game/visuals/impact-shake';

// UX audit P2-2 part 1: the impact shake on a real hit is smooth, stays within the cap and settles at exactly 0.
// "Effects: reduced" and OS reduced motion keep the field still, as before.
test.skip(process.env.PLAYWRIGHT_PAGES === 'true', 'source-only fixture');
async function sample(browser: Browser, reducedMotion: 'reduce' | 'no-preference', intensity = 'standard') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-10-27T00:00:00Z') });
  await page.goto(`tests/browser/fixtures/earth.html?skill=bash&intensity=${intensity}`); await page.locator('#start').click();
  await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
  await page.evaluate(() => window.earthQA.preview(0));
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 40; i++) { await page.clock.runFor(16); points.push((await page.evaluate(() => window.earthQA.field()))!); }
  await ctx.close();
  return points;
}
test('a landed hit shakes the field smoothly within the cap and settles at 0', async ({ browser }) => {
  const p = await sample(browser, 'no-preference');
  const mag = p.map(o => Math.hypot(o.x, o.y));
  expect(Math.max(...mag)).toBeGreaterThan(.3);
  expect(Math.max(...p.map(o => Math.max(Math.abs(o.x), Math.abs(o.y))))).toBeLessThanOrEqual(SHAKE.maxPx + 1e-6);
  for (let i = 1; i < p.length; i++) expect(Math.hypot(p[i]!.x - p[i - 1]!.x, p[i]!.y - p[i - 1]!.y)).toBeLessThan(SHAKE.maxPx * 1.6);
  expect(p.at(-1)).toEqual({ x: 0, y: 0 });
});
for (const [label, rm, intensity] of [['effects reduced', 'no-preference', 'reduced'], ['OS reduced motion', 'reduce', 'standard']] as const)
  test(`${label}: the field never moves`, async ({ browser }) => {
    expect((await sample(browser, rm, intensity)).every(o => o.x === 0 && o.y === 0)).toBe(true);
  });
