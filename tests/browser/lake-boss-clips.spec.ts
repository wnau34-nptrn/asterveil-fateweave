import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { lakeBossMoves, type LakeBossMove, type LakeBossScenario } from '../fixtures/lake-boss';

test.skip(process.env.PLAYWRIGHT_PAGES === 'true', 'source-only Moon Lake presentation fixture');
const capture = process.env.LAKE_BOSS_CLIPS === '1';
const cases: { move: LakeBossMove; scenario: LakeBossScenario; bodyFrame?: string; peaks: number }[] = [
  ...lakeBossMoves.map((move, i) => ({ move, scenario: 'normal' as const, bodyFrame: String(i * 4 + 3),
    peaks: move === 'Great Wave' ? 5 : ['Water Veil', 'Surging Wave', 'Reflection'].includes(move) ? 1 : 0 })),
  { move: 'Water Veil', scenario: 'sealed', peaks: 0 },
  { move: 'Tide Lash', scenario: 'down', bodyFrame: '29', peaks: 0 },
];

for (const { move, scenario, bodyFrame, peaks } of cases) {
  const slug = move.toLowerCase().replaceAll(' ', '-');
  const name = scenario === 'down' ? 'down' : scenario === 'sealed' ? 'water-veil-sealed' : slug;
  test(`lake boss ${name} at 390px`, async ({ browser }, info) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
    try {
      const page = await ctx.newPage(), errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`tests/browser/fixtures/wb-vfx.html?lake=${encodeURIComponent(move)}&scenario=${scenario}`);
      await page.waitForFunction(needsFx => window.wbVfxQA?.lakeBodyReady() && (!needsFx || window.wbVfxQA.atlasReady()), peaks > 0 || scenario === 'sealed');
      await expect(page.locator('#battle-view')).toHaveAttribute('data-scene', 'lake');
      const bounds = await page.evaluate(() => window.wbVfxQA.lakeBossBox());
      expect(bounds?.left).toBeGreaterThanOrEqual(0);
      expect(bounds?.right).toBeLessThanOrEqual(390);
      if (await page.locator('#start').isVisible()) await page.locator('#start').click();
      await page.locator(`#action-${await page.evaluate(() => window.wbVfxQA.action())}`).click();
      await page.evaluate(() => document.fonts.ready.then(() => {
        window.wbVfxQA.record();
        document.addEventListener('pointerdown', () => {
          document.documentElement.dataset.lakeClick = String(Date.now() / 1000);
        }, { capture: true, once: true });
      }));

      const cdp = capture ? await ctx.newCDPSession(page) : undefined;
      const stamps: string[] = [];
      if (cdp) {
        const dir = info.outputPath('frames');
        mkdirSync(dir, { recursive: true });
        cdp.on('Page.screencastFrame', frame => {
          const i = String(stamps.length).padStart(4, '0');
          writeFileSync(`${dir}/${i}.jpg`, Buffer.from(frame.data, 'base64'));
          stamps.push(`${i} ${frame.metadata.timestamp}`);
          void cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId });
        });
        await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
        await page.waitForTimeout(300);
      }

      await page.locator(`#target-${await page.evaluate(() => window.wbVfxQA.target())}`).click();
      await expect(page.locator('#skip-turn')).toBeHidden();
      await page.waitForTimeout(350);
      if (cdp) await cdp.send('Page.stopScreencast');
      const samples = await page.evaluate(() => window.wbVfxQA.samples());
      expect(Math.max(...samples.map(s => s.frames.filter(f => f === `${slug}_peak`).length))).toBe(peaks);
      if (peaks || scenario === 'sealed') expect(samples.some(s => s.frames.includes(`${slug}_prepare`))).toBe(true);
      if (peaks) expect(samples.some(s => s.frames.includes(`${slug}_settle`))).toBe(true);
      if (bodyFrame) expect(samples.some(s => s.bodyFrames?.includes(bodyFrame))).toBe(true);
      if (scenario !== 'down') {
        expect(await page.evaluate(() => window.wbVfxQA.impacts.find(t => t.actorId === 'f1')?.intent)).toBe(move);
      }
      expect(await page.evaluate(() => window.wbVfxQA.state())).toEqual(await page.evaluate(() => window.wbVfxQA.expected()));
      if (capture) {
        expect(stamps.length).toBeGreaterThan(6);
        const click = await page.locator('html').getAttribute('data-lake-click');
        writeFileSync(info.outputPath('lake-name.txt'), name);
        writeFileSync(info.outputPath('stamps.txt'), `click ${click}\n${stamps.join('\n')}`);
        writeFileSync(info.outputPath('impacts.json'), JSON.stringify(await page.evaluate(() => window.wbVfxQA.impacts), null, 2));
      }
      expect(errors).toEqual([]);
    } finally { await ctx.close(); }
  });
}
