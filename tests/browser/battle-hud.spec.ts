import { expect, test } from '@playwright/test';

// The source fixture uses real UI/scene/playback; production save/resize coverage is in status/team-five.
test.use({ reducedMotion: 'no-preference' });
test.skip(process.env.PLAYWRIGHT_PAGES === 'true', 'source fixture');

test('five allies and a large front-middle boss: front arcs, safe inspection, original HP cards and responsive fit', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('tests/browser/fixtures/battle-hud.html');
  await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
  await expect(page.locator('#action-attack')).toBeEnabled();
  await expect(page.locator('.field-hp-arc')).toHaveCount(10);
  await expect(page.locator('[data-field-label], .field-unit-name')).toHaveCount(0);
  await expect(page.locator('[data-boss-crown=f1]')).toHaveCount(1);
  await expect(page.locator('[data-field-unit=tracer]')).toHaveAttribute('data-hp-tone', 'orange');
  await expect(page.locator('[data-field-unit=weaver]')).toHaveAttribute('data-hp-tone', 'red');
  await expect(page.locator('[data-field-unit=guardian]')).toHaveAttribute('data-hp-tone', 'green');
  const beforeInspect = await page.evaluate(() => localStorage.getItem('hud-committed'));
  const selected = await page.locator('#party [aria-pressed=true]').getAttribute('id');
  for (const id of ['guardian', 'f1']) {
    await page.locator(`#turn-order [data-value=${id}]`).first().click();
    await expect(page.locator('#unit-inspector')).toHaveAttribute('data-actor', id);
    expect(await page.evaluate(() => localStorage.getItem('hud-committed'))).toBe(beforeInspect);
    expect(await page.locator('#party [aria-pressed=true]').getAttribute('id')).toBe(selected);
    await expect(page.locator('#action-attack')).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.locator('#unit-inspector .boss-crown')).toHaveCount(1);
  await expect(page.locator('#unit-inspector')).toContainText('500 / 500');
  await page.locator('#unit-inspector').click();
  await expect(page.locator('#status-unit-f1')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  for (const [width, height] of [[390, 844], [390, 650], [320, 568], [390, 960]] as const) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.locator('#app').evaluate(el => [el.clientWidth, el.clientHeight])).toEqual([width, height]);
    await expect.poll(() => page.evaluate(() => Math.round(parseFloat((document.querySelector('#game canvas') as HTMLElement).style.height)) === document.querySelector('.arena')!.clientHeight)).toBe(true);
    expect(await page.locator('#party .hero-card').evaluateAll(els => els.length === 5 && els.every(el => {
      const hp = el.querySelector('.hero-hp')!, bar = el.querySelector('.hp-track')!, name = el.querySelector('strong')!;
      return el.getBoundingClientRect().height === 60 && [hp, bar, name].every(n => getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().height > 0);
    }))).toBe(true);
    const slots = await page.evaluate(() => window.battleHudQA.slots());
    const arena = await page.locator('.arena').evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }));
    for (const a of slots) {
      expect(a.body.y).toBeGreaterThanOrEqual(0); expect(a.panel.y + a.panel.height).toBeLessThanOrEqual(arena.height);
      for (const b of slots) if (a.id !== b.id) {
        const p = a.panel, body = b.body;
        expect(p.x < body.x + body.width && body.x < p.x + p.width && p.y < body.y + body.height && body.y < p.y + p.height, `HP ${a.id} / body ${b.id} at ${width}x${height}`).toBe(false);
      }
    }
    const boss = slots.find(s => s.id === 'f1')!, hero = slots.find(s => s.id === 'guardian')!;
    if (height >= 844) await expect.poll(async () => { const s = await page.evaluate(() => window.battleHudQA.slots()); return s.find(v => v.id === 'f1')!.size / s.find(v => v.id === 'guardian')!.size; }).toBe(1.5);
    if (width === 320) { expect(boss.size / hero.size).toBeLessThan(1.5); expect(hero.size).toBeGreaterThanOrEqual(44); }
    expect(await page.evaluate(() => localStorage.getItem('hud-committed'))).toBe(beforeInspect);
    if (width === 390 && [844, 650].includes(height)) await page.screenshot({ path: info.outputPath(`boss-${width}x${height}.png`) });
  }
  // The selected inspector follows real displayed HP stages, not final committed HP before contact.
  await page.clock.install({ time: new Date('2026-11-10T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-11-10T00:01:00Z'));
  await page.locator('#target-f1').click();
  await expect(page.locator('#unit-inspector')).toContainText('500 / 500');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('hud-committed') ?? '{}').commands?.length)).toBe(1);
  const committed = await page.evaluate(() => localStorage.getItem('hud-committed'));
  await page.clock.runFor(1200);
  await expect(page.locator('#unit-inspector')).not.toContainText('500 / 500');
  await expect(page.locator('[data-field-unit=f1] .field-health')).not.toHaveAttribute('aria-label', /500\/500/);
  expect(await page.evaluate(() => localStorage.getItem('hud-committed'))).toBe(committed);
  expect(errors).toEqual([]);
});
