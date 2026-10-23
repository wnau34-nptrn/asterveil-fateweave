import { test, expect } from '@playwright/test';
import { stageTiming } from '../../src/ui/battle-playback';

const skills = ['attack', 'finisher', 'lunge', 'sweep', 'backstab', 'ambush', 'disarm', 'parry', 'pierce', 'halt'];
for (const skill of skills) test(`blade ${skill} resolved contact and cleanup at 390px`, async ({ browser }, info) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await ctx.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (/Texture .* has no frame/.test(m.text())) errors.push(m.text()); });
  try {
    await page.goto(`tests/browser/fixtures/blade.html?skill=${skill}`);
    await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
    await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 100000));
    const cues = await page.evaluate(() => window.bladeQA.cues('hit'));
    const turn = await page.evaluate(() => window.bladeQA.stage('hit'));
    expect(cues.length).toBeGreaterThan(0); expect(cues.some(c => c.skill === skill && c.outcome === 'hit')).toBe(true);
    await page.locator(`#action-${skill}`).click();
    await page.locator(`#target-${skill === 'parry' ? 'tracer' : skill === 'sweep' ? 'enemies-f1' : 'f1'}`).click();
    const committed = await page.evaluate(() => localStorage.getItem('blade-committed')); expect(committed).toBeTruthy();
    if (skill !== 'parry') {
      const timing = stageTiming(turn, false);
      await page.clock.runFor(timing.contact - 1);
      await expect(page.locator('[data-field-unit=f1] .field-hp-value')).toHaveText('500/500');
      await page.clock.runFor(1);
      await expect(page.locator('[data-field-unit=f1] .field-hp-value')).toHaveText(`${turn.after!.enemies.find(e => e.id === 'f1')!.hp}/500`);
      await page.clock.runFor(35);
      expect((await page.evaluate(() => window.bladeQA.frames())).some(f => /slash_|thrust_/.test(f))).toBe(true);
    } else await page.clock.runFor(340);
    if (['lunge', 'sweep'].includes(skill)) await page.screenshot({ path: info.outputPath('contact-390.png') });
    await page.locator('#skip-turn').click(); await page.clock.runFor(3000);
    expect(await page.evaluate(() => window.bladeQA.frames())).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('blade-committed'))).toBe(committed);
    expect(errors).toEqual([]);
  } finally { await ctx.close(); }
});
for (const outcome of ['blocked', 'partial', 'dodged', 'guarded', 'cancelled']) test(`blade ${outcome} routes resolved events only`, async ({ page }) => {
  await page.goto('tests/browser/fixtures/blade.html?skill=attack'); await page.locator('#start').click();
  const result = await page.evaluate(o => { const qa = window.bladeQA; return { turn: qa.stage(o), cues: qa.cues(o) }; }, outcome);
  if (outcome === 'cancelled') { expect(result.turn.events.some((e) => e.type === 'cancel')).toBe(true); expect(result.cues).toEqual([]); }
  else {
    expect(result.cues[0]!.outcome).toBe(outcome === 'blocked' ? 'blocked' : outcome === 'dodged' ? 'dodged' : 'hit');
    if (outcome === 'guarded') expect(result.cues[0]!.event.targetId).not.toBe('tracer');
    if (outcome === 'partial') expect(result.cues[0]!.event.absorbed).toBe(5);
  }
});
for (const mode of ['fast', 'reduced', 'osreduce']) test(`blade ${mode} keeps result through resize`, async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: mode === 'osreduce' ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  try {
    await page.goto(`tests/browser/fixtures/blade.html?skill=lunge&speed=${mode === 'fast' ? 'fast' : 'normal'}&intensity=${mode === 'reduced' ? 'reduced' : 'standard'}`);
    await page.locator('#start').click(); await page.locator('#action-lunge').click(); await page.locator('#target-f1').click();
    const committed = await page.evaluate(() => localStorage.getItem('blade-committed'));
    await page.setViewportSize({ width: 391, height: 844 }); await page.waitForTimeout(1300);
    expect(await page.evaluate(() => localStorage.getItem('blade-committed'))).toBe(committed);
  } finally { await ctx.close(); }
});
