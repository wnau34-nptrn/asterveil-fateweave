import { test, expect, type Page } from '@playwright/test';

// Owner 2026-11-27 items 1–3 and 6: hero life follows the shown state and the real outcome, and is fully off under
// reduced motion and the quiet effect setting.
test.skip(process.env.PLAYWRIGHT_PAGES === 'true', 'source-only fixture');
const life = (page: Page) => page.evaluate(() => window.heroLifeQA.life());
const open = async (page: Page, query = '') => {
  await page.goto(`tests/browser/fixtures/hero-life.html${query}`);
  await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
};

test('turn owner, low HP, barrier glow and skill lean follow the shown state', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  try {
    await open(page);
    await expect.poll(async () => (await life(page)).heroes.guardian?.ready ?? 0).toBeGreaterThan(.9);
    const ready = await life(page);
    expect(ready.enabled).toBe(true);
    expect(ready.heroes.weaver!.low).toBeGreaterThan(.9);   // 25 / 100 HP
    expect(ready.heroes.guardian!.low).toBe(0);
    for (const id of ['weaver', 'lalin', 'mira', 'lio']) expect(ready.heroes[id]!.relaxed, id).toBeGreaterThan(.9);
    expect(ready.heroes.lalin!.glow).toBe(true);             // gear barrier 20
    expect(ready.heroes.guardian!.glow).toBe(false);
    // A foe-target skill leans forward; an ally skill leans back toward the team.
    await page.locator('#action-bash').click();
    await expect.poll(async () => (await life(page)).heroes.guardian!.foe).toBeGreaterThan(.9);
    expect((await life(page)).heroes.guardian!.rotation).toBeGreaterThan(0);
    await page.locator('#action-guard').click();
    await expect.poll(async () => (await life(page)).heroes.guardian!.ally).toBeGreaterThan(.9);
    // The shared foe breath stays; heroes no longer carry a looping scale tween (no pile-up across repaints).
    const sizes = new Set<number>();
    for (let i = 0; i < 6; i++) { sizes.add((await life(page)).heroes.mira!.sy); await page.waitForTimeout(120); }
    expect(sizes.size).toBeGreaterThan(1);                    // the archer shifts and breathes
    // Quiet effects (the device setting, read when the battle opens) turn it all off.
    await page.evaluate(() => localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: 'normal', intensity: 'reduced' })));
    await open(page);
    await expect.poll(async () => (await life(page)).enabled).toBe(false);
    const quiet = await life(page);
    for (const [id, hero] of Object.entries(quiet.heroes)) { expect([hero.rotation, hero.y, hero.glow], id).toEqual([0, 0, false]); }
  } finally { await ctx.close(); }
});

test('reduced motion keeps every hero still and plays no finale motion', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  try {
    await open(page, '?end=victory');
    const still = await life(page);
    expect(still.enabled).toBe(false);
    for (const [id, hero] of Object.entries(still.heroes)) { expect([hero.rotation, hero.y, hero.glow], id).toEqual([0, 0, false]); }
    await page.locator('#target-f1').click();
    await expect(page.locator('#leave-battle')).toBeVisible();
    expect((await life(page)).finale).toBe('victory');
    expect((await life(page)).sparkles).toEqual([]);
    for (const hero of Object.values((await life(page)).heroes)) expect([hero.rotation, hero.y]).toEqual([0, 0]);
  } finally { await ctx.close(); }
});

test('victory cheers and defeat slumps from the real battle outcome', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  try {
    await open(page, '?end=victory');
    expect((await life(page)).finale).toBeUndefined();
    await page.locator('#target-f1').click();
    await expect.poll(async () => (await life(page)).finale, { timeout: 8000 }).toBe('victory');
    await expect.poll(async () => (await life(page)).sparkles.some(s => s.alpha > .3)).toBe(true);
    await open(page, '?end=defeat');
    await expect.poll(async () => (await life(page)).finale, { timeout: 8000 }).toBe('defeat');
  } finally { await ctx.close(); }
});
