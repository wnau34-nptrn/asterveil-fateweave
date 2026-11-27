import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Owner clip capture (390px, real time):
// FX_CLIPS=1 npx playwright test tests/browser/hero-life-clips.spec.ts --output=test-results/hero-life-clips
// then python3 tests/browser/fixtures/encode-hero-life-clips.py
test.skip(!process.env.FX_CLIPS, 'owner clip capture only');
const cases = [
  { name: 'idle-turn-owner', query: '' },
  { name: 'victory', query: '?end=victory&cast=cheer' },
  { name: 'defeat', query: '?end=defeat' },
];
for (const { name, query } of cases) test(`hero life clip ${name}`, async ({ browser }, info) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  try {
    await page.goto(`tests/browser/fixtures/hero-life.html${query}`);
    await expect(page.locator('#start')).toBeEnabled();
    // CDP frames with their real timestamps (encode with tests/browser/fixtures/encode-hero-life-clips.py).
    const dir = info.outputPath('frames'); mkdirSync(dir, { recursive: true });
    const cdp = await ctx.newCDPSession(page), stamps: string[] = [];
    cdp.on('Page.screencastFrame', f => { const n = String(stamps.length).padStart(4, '0'); writeFileSync(`${dir}/${n}.jpg`, Buffer.from(f.data, 'base64')); stamps.push(`${n} ${f.metadata.timestamp}`); void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
    await page.locator('#start').click();
    await page.waitForTimeout(1200);
    if (name === 'idle-turn-owner') {
      await page.waitForTimeout(4500);
      // Aegis acts; the light at the feet passes to the next hero.
      await page.locator('#target-f1').click(); await page.waitForTimeout(4500);
    } else if (name === 'victory') {
      await page.locator('#target-f1').click(); await page.waitForTimeout(4500);
    } else await page.waitForTimeout(5000);
    await cdp.send('Page.stopScreencast'); writeFileSync(info.outputPath('stamps.txt'), stamps.join('\n'));
    expect(stamps.length).toBeGreaterThan(30);
  } finally { await ctx.close(); }
});
