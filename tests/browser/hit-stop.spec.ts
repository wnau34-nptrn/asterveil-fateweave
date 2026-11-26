import { test, expect } from '@playwright/test';
import { HIT_STOP_MS } from '../../src/ui/battle-playback';

// UX audit P2-2 part 2: the scene holds the contact frame for the hit-stop, then resumes; clearing the stage always resumes.
test.skip(process.env.PLAYWRIGHT_PAGES === 'true', 'source-only fixture');
test('hit-stop pauses the battle scene for its length and stopEffects never leaves it paused', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-10-27T00:00:00Z') });
  await page.goto('tests/browser/fixtures/earth.html?skill=bash'); await page.locator('#start').click();
  await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
  await page.evaluate(ms => window.earthQA.hitStop(0, ms), HIT_STOP_MS);
  // Sample every 4 ms: held for HIT_STOP_MS plus at most one frame, then released.
  const held: number[] = []; let frozen: unknown, moved = false;
  for (let t = 4; t <= 160; t += 4) {
    await page.clock.runFor(4);
    if (await page.evaluate(() => window.earthQA.paused())) { const f = await page.evaluate(() => window.earthQA.field()); if (held.length && JSON.stringify(f) !== JSON.stringify(frozen)) moved = true; frozen = f; held.push(t); }
  }
  expect(held.length * 4).toBeGreaterThanOrEqual(HIT_STOP_MS - 4); expect(held.length * 4).toBeLessThanOrEqual(HIT_STOP_MS + 20);   // + up to one frame for the resume to apply
  expect(held.at(-1)! - held[0]!).toBe((held.length - 1) * 4);   // one continuous hold
  expect(moved).toBe(false);   // nothing moves while held
  await page.clock.runFor(400); expect(await page.evaluate(() => window.earthQA.field())).toEqual({ x: 0, y: 0 });
  // A stage cleared mid-hold resumes at once and a late timer cannot pause again.
  await page.evaluate(ms => window.earthQA.hitStop(0, ms), HIT_STOP_MS);
  let paused = false; for (let i = 0; i < 20 && !paused; i++) { await page.clock.runFor(4); paused = await page.evaluate(() => window.earthQA.paused()); }
  expect(paused).toBe(true);
  await page.evaluate(() => window.earthQA.stop()); await page.clock.runFor(16);
  expect(await page.evaluate(() => window.earthQA.paused())).toBe(false);
  await page.clock.runFor(200); expect(await page.evaluate(() => window.earthQA.paused())).toBe(false);
  // Zero means no hold.
  await page.evaluate(() => window.earthQA.hitStop(0, 0)); await page.clock.runFor(40);
  expect(await page.evaluate(() => window.earthQA.paused())).toBe(false);
  await ctx.close();
});
