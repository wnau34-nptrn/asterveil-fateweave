import { test, expect, type Page } from '@playwright/test';

// Owner 2026-11-27 (“เก็บข้อ 3 ไว้ เอาเข้าเกมได้”): a gentle breath (slower at low HP), a barrier glow, a still light at
// the turn owner's feet, sparkles on victory and a slump on defeat. No sway, float, tilt, step, lean or hop. All of it
// follows the shown state and the real outcome, and is off under reduced motion and the quiet effect setting.
test.skip(process.env.PLAYWRIGHT_PAGES === 'true', 'source-only fixture');
const life = (page: Page) => page.evaluate(() => window.heroLifeQA.life());
const open = async (page: Page, query = '') => {
  await page.goto(`tests/browser/fixtures/hero-life.html${query}`);
  await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
};

test('breath, low HP, barrier glow and the turn owner light follow the shown state', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  try {
    await open(page);
    await expect.poll(async () => (await life(page)).heroes.guardian?.ring).toBe(true);
    const ready = await life(page);
    expect(ready.enabled).toBe(true);
    for (const id of ['weaver', 'lalin', 'mira', 'lio']) expect(ready.heroes[id]!.ring, id).toBe(false);
    await expect.poll(async () => (await life(page)).heroes.weaver!.low).toBeGreaterThan(.9);   // 25 / 100 HP
    expect(ready.heroes.guardian!.low).toBe(0);
    expect(ready.heroes.lalin!.glow).toBe(true);             // gear barrier 20
    expect(ready.heroes.guardian!.glow).toBe(false);
    // Choosing skills moves nobody: only the breath scales the sprite.
    const scales = new Set<number>();
    for (const action of ['bash', 'guard', 'attack']) {
      await page.locator(`#action-${action}`).click();
      for (let i = 0; i < 3; i++) {
        const now = await life(page);
        for (const [id, hero] of Object.entries(now.heroes)) expect([hero.x, hero.y, hero.rotation, hero.bodyY], id).toEqual([0, 0, 0, 0]);
        scales.add(now.heroes.mira!.sy); await page.waitForTimeout(150);
      }
    }
    expect(scales.size).toBeGreaterThan(1);
    // The turn passes on: the light follows the next owner.
    await page.locator('#target-f1').click();
    await expect.poll(async () => (await life(page)).heroes.weaver!.ring, { timeout: 8000 }).toBe(true);
    expect((await life(page)).heroes.guardian!.ring).toBe(false);
    // Quiet effects (the device setting, read when the battle opens) turn it all off.
    await page.evaluate(() => localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: 'normal', intensity: 'reduced' })));
    await open(page);
    await expect.poll(async () => (await life(page)).enabled).toBe(false);
    for (const [id, hero] of Object.entries((await life(page)).heroes)) expect([hero.glow, hero.ring], id).toEqual([false, false]);
  } finally { await ctx.close(); }
});

test('reduced motion keeps every hero still and plays no finale motion', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  try {
    await open(page, '?end=victory');
    const still = await life(page);
    expect(still.enabled).toBe(false);
    for (const [id, hero] of Object.entries(still.heroes)) expect([hero.glow, hero.ring], id).toEqual([false, false]);
    const first = Object.values(still.heroes).map(h => h.sy);
    await page.waitForTimeout(500);
    expect(Object.values((await life(page)).heroes).map(h => h.sy)).toEqual(first);
    await page.locator('#target-f1').click();
    await expect(page.locator('#leave-battle')).toBeVisible();
    expect((await life(page)).finale).toBe('victory');
    expect((await life(page)).sparkles).toEqual([]);
  } finally { await ctx.close(); }
});

test('victory sparkles without a hop and defeat slumps, from the real battle outcome', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  try {
    await open(page, '?end=victory');
    expect((await life(page)).finale).toBeUndefined();
    await page.locator('#target-f1').click();
    await expect.poll(async () => (await life(page)).finale, { timeout: 8000 }).toBe('victory');
    for (let i = 0; i < 8; i++) {
      for (const [id, hero] of Object.entries((await life(page)).heroes)) expect(hero.bodyY, id).toBe(0);
      await page.waitForTimeout(100);
    }
    await expect.poll(async () => (await life(page)).sparkles.length).toBeGreaterThan(0);
    await open(page, '?end=defeat');
    await expect.poll(async () => (await life(page)).finale, { timeout: 8000 }).toBe('defeat');
  } finally { await ctx.close(); }
});

test('Lio plays the LIFE-002 cheer once and holds it; heroes without one keep the idle', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  try {
    await open(page, '?end=victory&cast=lio');
    await page.locator('#target-f1').click();
    await expect.poll(async () => (await life(page)).finale, { timeout: 8000 }).toBe('victory');
    await expect.poll(async () => { const h = (await life(page)).heroes.lio!; return `${h.texture}#${h.frame}`; }, { timeout: 5000 }).toBe('unit-victory-lio#5');
    await page.waitForTimeout(800);
    expect((await life(page)).heroes.lio!.frame).toBe('5');
    expect((await life(page)).heroes.mira!.texture).toMatch(/^unit-pilot-/);
  } finally { await ctx.close(); }
});

test('drawn cheers play once from the real victory and hold their last frame; reduced motion keeps the idle', async ({ browser }) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
    const page = await ctx.newPage();
    try {
      await open(page, '?end=victory&cast=cheer');
      await page.locator('#target-f1').click();
      await expect.poll(async () => (await life(page)).finale, { timeout: 8000 }).toBe('victory');
      if (reducedMotion === 'reduce') {
        await page.waitForTimeout(1500);
        for (const id of ['guardian', 'weaver', 'healer', 'tracer']) expect((await life(page)).heroes[id]!.texture, id).toMatch(/^unit-pilot-/);
        continue;
      }
      for (const [id, sheet] of [['guardian', 'aegis'], ['weaver', 'eira'], ['healer', 'seren'], ['tracer', 'lyra']] as const)
        await expect.poll(async () => { const h = (await life(page)).heroes[id]!; return `${h.texture}#${h.frame}`; }, { timeout: 5000 }).toBe(`unit-victory-${sheet}#5`);
      await page.waitForTimeout(800);
      expect((await life(page)).heroes.guardian!.frame).toBe('5');          // held, not reset to the idle
      expect((await life(page)).heroes.lalin!.texture).toMatch(/^unit-pilot-/);   // no drawn cheer: idle + sparkles
    } finally { await ctx.close(); }
  }
});
