import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.skip(process.env.HEALING_CLIPS !== '1', 'separate actual-runtime capture only');
const cases = [
  ...['heal', 'prayer', 'rouse', 'revive', 'bless', 'mend'].flatMap(skill => ['normal', 'fast', 'reduced', 'osreduce'].map(mode => ({ skill, scenario: 'normal', mode }))),
  ...[['heal', 'overflow'], ['heal', 'twin'], ['prayer', 'echo'], ['mend', 'barrier'], ['mend', 'solo']].map(([skill, scenario]) => ({ skill: skill!, scenario: scenario!, mode: 'normal' })),
];
for (const { skill, scenario, mode } of cases) test(`healing clip ${skill}-${scenario}-${mode}`, async ({ browser }, info) => {
  test.setTimeout(60000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: mode === 'osreduce' ? 'reduce' : 'no-preference' });
  try {
    const page = await ctx.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`tests/browser/fixtures/healing.html?skill=${skill}&scenario=${scenario}&speed=${mode === 'fast' ? 'fast' : 'normal'}&intensity=${mode === 'reduced' ? 'reduced' : 'standard'}`);
    if (skill !== 'revive') await page.locator('#start').click();
    await page.locator(`#action-${skill}`).click();
    await page.evaluate(() => document.fonts.ready.then(() => undefined)); await page.waitForTimeout(350);
    const commands = ['bless', 'mend'].includes(skill) || scenario === 'echo' ? await page.evaluate(() => window.healingQA.commands()) : [];
    await page.evaluate(() => document.addEventListener('pointerdown', () => { document.documentElement.dataset.healingClick = String(Date.now()/1000); }, { capture: true, once: true }));
    const dir = info.outputPath('frames'); mkdirSync(dir, { recursive: true });
    const cdp = await ctx.newCDPSession(page), stamps: string[] = [];
    cdp.on('Page.screencastFrame', f => { const n = String(stamps.length).padStart(4, '0'); writeFileSync(`${dir}/${n}.jpg`, Buffer.from(f.data, 'base64')); stamps.push(`${n} ${f.metadata.timestamp}`); void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 }); await page.waitForTimeout(300);
    await page.locator(`#target-${await page.evaluate(() => window.healingQA.target())}`).click();
    const click = Number(await page.locator('html').getAttribute('data-healing-click')); expect(click).toBeGreaterThan(1_000_000_000);
    for (const cmd of commands) {
      await page.locator(`#action-${cmd.action}`).click();
      expect(await page.evaluate(() => window.healingQA.state().beat)).toBe(cmd.beat);
      await page.locator(`#target-${cmd.targetId}`).click();
    }
    await expect(page.locator('#skip-turn')).toBeHidden({ timeout: 12000 }); await page.waitForTimeout(300);
    await cdp.send('Page.stopScreencast');
    const impacts = await page.evaluate(() => window.healingQA.impacts);
    expect(impacts.some(i => i.action === skill && i.side === 'hero')).toBe(true);
    if (skill === 'rouse') expect(impacts.filter(i => i.cues.some(c => c.kind === 'redirect'))).toHaveLength(2);
    if (skill === 'bless' || skill === 'mend' || scenario === 'echo') expect(impacts.some(i => i.cues.some(c => c.kind === 'tick'))).toBe(true);
    expect(await page.evaluate(() => window.healingQA.state().commands.length)).toBe((await page.evaluate(() => window.healingQA.prelude())).length+1+commands.length);
    writeFileSync(info.outputPath('stamps.txt'), `click ${click}\n${stamps.join('\n')}`);
    writeFileSync(info.outputPath('timing.json'), JSON.stringify(impacts, null, 2));
    expect(stamps.length).toBeGreaterThan(12); expect(errors).toEqual([]);
  } finally { await ctx.close(); }
});
