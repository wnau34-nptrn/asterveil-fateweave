import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.skip(!process.env.FX_CLIPS, 'owner clip capture only');
const cases = [
  ...['attack', 'finisher', 'lunge', 'sweep', 'backstab', 'ambush', 'disarm', 'parry', 'pierce', 'halt'].map(skill => ({ skill, outcome: 'hit', mode: 'normal' })),
  ...['blocked', 'partial', 'dodged', 'guarded', 'cancelled'].map(outcome => ({ skill: 'attack', outcome, mode: 'normal' })),
  ...['fast', 'reduced', 'osreduce'].map(mode => ({ skill: 'lunge', outcome: 'hit', mode })),
];
for (const { skill, outcome, mode } of cases) test(`blade clip ${skill}-${outcome}-${mode}`, async ({ browser }, info) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: mode === 'osreduce' ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  try {
    await page.goto(`tests/browser/fixtures/blade.html?skill=${skill}&speed=${mode === 'fast' ? 'fast' : 'normal'}&intensity=${mode === 'reduced' ? 'reduced' : 'standard'}`);
    await page.locator('#start').click(); await page.evaluate(o => window.bladeQA.prime(o), outcome);
    await page.locator(`#action-${skill}`).click(); await expect(page.locator(`#action-${skill}`)).toBeEnabled();
    // Canvas may commit on pointerdown and replace the target before a DOM click exists.
    await page.evaluate(() => document.addEventListener('pointerdown', () => {
      document.documentElement.dataset.bladeClick = String(Date.now() / 1000);
    }, { capture: true, once: true }));
    const dir = info.outputPath('frames'); mkdirSync(dir, { recursive: true });
    const cdp = await ctx.newCDPSession(page), stamps: string[] = [];
    cdp.on('Page.screencastFrame', f => { const n = String(stamps.length).padStart(4, '0'); writeFileSync(`${dir}/${n}.jpg`, Buffer.from(f.data, 'base64')); stamps.push(`${n} ${f.metadata.timestamp}`); void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
    await page.waitForTimeout(300);
    await page.locator(`#target-${skill === 'parry' ? 'tracer' : skill === 'sweep' ? 'enemies-f1' : 'f1'}`).click();
    const click = Number(await page.locator('html').getAttribute('data-blade-click'));
    expect(click).toBeGreaterThan(1_000_000_000);
    await page.waitForTimeout(2850);
    await cdp.send('Page.stopScreencast'); writeFileSync(info.outputPath('stamps.txt'), `click ${click}\n${stamps.join('\n')}`);
    expect(stamps.length).toBeGreaterThan(12);
  } finally { await ctx.close(); }
});
