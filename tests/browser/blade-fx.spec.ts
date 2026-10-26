import { test, expect } from '@playwright/test';
import { stageTiming } from '../../src/ui/battle-playback';

const skills = ['attack', 'finisher', 'lunge', 'sweep', 'backstab', 'ambush', 'disarm', 'parry', 'pierce', 'halt'];
for (const skill of skills) test(`blade ${skill} resolved contact and cleanup at 390px`, async ({ browser }, info) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await ctx.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (/Texture .* has no frame/.test(m.text())) errors.push(m.text()); });
  try {
    await page.clock.install({ time: new Date('2026-10-24T00:00:00Z') });
    await page.goto(`tests/browser/fixtures/blade.html?skill=${skill}`);
    await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
    await page.clock.pauseAt(new Date('2026-10-24T01:00:00Z'));
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
      const early = (await page.evaluate(() => window.bladeQA.painted())).find(i => i.frame === `${skill}_peak`);
      expect(early, 'each skill uses its selected painted silhouette').toBeDefined();
      await page.clock.runFor(45);
      const peak = (await page.evaluate(() => window.bladeQA.painted())).find(i => i.frame === `${skill}_peak`);
      expect(peak, 'painted peak remains readable 80ms after truthful contact').toBeDefined();
      expect(peak!.alpha).toBeGreaterThan(.7);
      expect(peak!.alpha).toBeLessThan(.9);
      // Check the rendered paint: flat sweep, owner-thickened spear, compact planted halt.
      const aspect = peak!.width / peak!.height;
      if (skill === 'sweep') expect(aspect).toBeGreaterThan(3);
      if (skill === 'pierce') { expect(aspect).toBeLessThan(4.5); expect(peak!.height).toBeGreaterThan(30); }
      if (skill === 'halt') expect(aspect).toBeLessThan(1.5);
      if (skill === 'backstab') {
        const backwardTravel = (peak!.x-early!.x)*Math.cos(peak!.rotation) + (peak!.y-early!.y)*Math.sin(peak!.rotation);
        expect(backwardTravel).toBeLessThan(0);
      }
      expect(await page.evaluate(() => window.bladeQA.labelsAbovePaint())).toBe(true);
      if (['lunge', 'sweep'].includes(skill)) await page.screenshot({ path: info.outputPath('contact-390.png') });
      await page.clock.runFor(110);
      const tail = (await page.evaluate(() => window.bladeQA.painted())).find(i => i.frame === `${skill}_tail`);
      expect(tail, 'selected dissolve paint follows the same contact').toBeDefined();
      expect(tail!.alpha).toBeGreaterThan(.05);
    } else await page.clock.runFor(340);
    await page.locator('#skip-turn').click(); await page.clock.runFor(3000);
    expect(await page.evaluate(() => window.bladeQA.frames())).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('blade-committed'))).toBe(committed);
    expect(errors).toEqual([]);
  } finally { await ctx.close(); }
});
for (const outcome of ['blocked', 'partial', 'dodged', 'guarded', 'cancelled']) test(`blade ${outcome} routes resolved events only`, async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-25T00:00:00Z') });
  await page.goto('tests/browser/fixtures/blade.html?skill=attack'); await page.locator('#start').click();
  await page.clock.pauseAt(new Date('2026-10-25T01:00:00Z'));
  const result = await page.evaluate(o => { const qa = window.bladeQA; return { turn: qa.stage(o), cues: qa.cues(o) }; }, outcome);
  if (outcome === 'cancelled') { expect(result.turn.events.some((e) => e.type === 'cancel')).toBe(true); expect(result.cues).toEqual([]); }
  else {
    expect(result.cues[0]!.outcome).toBe(outcome === 'blocked' ? 'blocked' : outcome === 'dodged' ? 'dodged' : 'hit');
    if (outcome === 'guarded') expect(result.cues[0]!.event.targetId).not.toBe('tracer');
    if (outcome === 'partial') expect(result.cues[0]!.event.absorbed).toBe(5);
  }
  // Render real resolved stages in isolation; the normal-contact tests above cover UI playback.
  const body = await page.evaluate(o => window.bladeQA.renderOutcome(o), outcome);
  const paint = await page.evaluate(() => window.bladeQA.painted());
  const peak = paint.find(i => i.frame === 'attack_peak');
  const core = paint.find(i => i.frame === 'contact_00');
  if (['blocked', 'dodged', 'cancelled'].includes(outcome)) { expect(peak).toBeUndefined(); expect(core).toBeUndefined(); }
  if (['blocked', 'partial'].includes(outcome)) expect(paint.some(i => i.frame === 'deflect')).toBe(true);
  if (outcome === 'dodged') {
    const miss = paint.find(i => i.frame === 'attack_tail')!;
    expect(Math.hypot(miss.x-body!.x, miss.y-body!.y)).toBeGreaterThan(35);
  }
  if (['partial', 'guarded'].includes(outcome)) { expect(peak!.x).toBeCloseTo(body!.x); expect(peak!.y).toBeCloseTo(body!.y); }
  if (outcome === 'cancelled') expect(paint).toEqual([]);
});
for (const skill of skills) test(`blade ${skill} OS reduced keeps selected still`, async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width:390, height:844 }, reducedMotion:'reduce' });
  const page = await ctx.newPage();
  try {
    await page.goto(`tests/browser/fixtures/blade.html?skill=${skill}`);
    await page.locator('#start').click(); await page.locator(`#action-${skill}`).click();
    await page.locator(`#target-${skill === 'parry' ? 'tracer' : skill === 'sweep' ? 'enemies-f1' : 'f1'}`).click();
    const before = await page.evaluate(() => window.bladeQA.painted());
    const still = before.find(i => i.frame === `${skill}_${skill === 'parry' ? 'prepare' : 'peak'}`);
    expect(still).toBeDefined();
    await page.waitForTimeout(80);
    const after = (await page.evaluate(() => window.bladeQA.painted())).find(i => i.frame === still!.frame);
    expect(after).toEqual(still);
  } finally { await ctx.close(); }
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
