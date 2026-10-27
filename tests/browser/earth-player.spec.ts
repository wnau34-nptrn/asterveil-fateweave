import { test, expect } from '@playwright/test';
test.skip(process.env.EARTH_PLAYER !== '1', 'local owner-clip player validation only');
test('earth player selects and decodes all33 actual390px clips', async ({ page }) => {
  test.setTimeout(180000); await page.setViewportSize({ width: 390, height: 1000 });
  const visited=new Set<string>();
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('docs/combat-presentation/earth-slice/index.html');
  await expect(page.locator('nav button')).toHaveCount(4);
  for (const skill of ['bash','slam','quake','tremor']) {
    await page.locator(`button[data-skill="${skill}"]`).click();
    for (const mode of ['normal', 'fast', 'reduced', 'osreduce']) {
      await page.selectOption('#mode', mode);
      const scenarios = await page.locator('#scenario option').evaluateAll(options => options.map(o => (o as HTMLOptionElement).value));
      for (const scenario of scenarios) {
        await page.selectOption('#scenario', scenario);visited.add(await page.locator('html').getAttribute('data-clip')??'');
        await page.waitForFunction(() => { const v = document.querySelector('video')!; return v.readyState >= 2 && v.videoWidth === 390 && v.videoHeight === 844; });
        await page.locator('video').evaluate(async (v: HTMLVideoElement) => { await v.play(); });
        await page.waitForFunction(() => document.querySelector('video')!.currentTime > .05);
        expect(await page.locator('video').evaluate((v: HTMLVideoElement) => v.error)).toBeNull();
      }
    }
  }
  expect(visited.size).toBe(33);expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390); expect(errors).toEqual([]);
});
