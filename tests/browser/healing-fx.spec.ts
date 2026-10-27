import { test, expect } from '@playwright/test';
import { stageTiming } from '../../src/ui/battle-playback';

test.skip(process.env.PLAYWRIGHT_PAGES === 'true', 'source-only healing fixture has its own CI/Pages gate');
const skills = ['heal', 'prayer', 'rouse', 'revive', 'bless', 'mend'];
for (const skill of skills) test(`healing ${skill} contact, foreground labels and skip cleanup at390px`, async ({ browser }, info) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  try {
    await page.clock.install({ time: new Date('2026-10-27T00:00:00Z') });
    await page.goto(`tests/browser/fixtures/healing.html?skill=${skill}`);
    if (skill !== 'revive') await page.locator('#start').click();
    await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
    const turn = (await page.evaluate(() => window.healingQA.sequence()))[0]!;
    await page.locator(`#action-${skill}`).click(); await page.locator(`#target-${await page.evaluate(() => window.healingQA.target())}`).click();
    const committed = await page.evaluate(() => localStorage.getItem('healing-committed'));
    const timing = stageTiming(turn, false); await page.clock.runFor(timing.contact-1);
    const before = await page.evaluate(() => window.healingQA.painted());
    expect(before.length).toBeGreaterThan(0); expect(before.every(p => p.frame.endsWith('_prepare'))).toBe(true);
    const caster = await page.evaluate(id => window.healingQA.visualPoint(id), turn.actorId);
    expect(before.find(p => !p.rim)!.x).toBeCloseTo(caster.x, 1); expect(before.find(p => !p.rim)!.y).toBeCloseTo(caster.footY, 1);
    await page.clock.runFor(61);
    const peaks = (await page.evaluate(() => window.healingQA.painted())).filter(p => p.frame.endsWith('_peak') && !p.rim);
    expect(peaks).toHaveLength(skill === 'prayer' ? 4 : skill === 'rouse' ? 2 : 1);
    expect(peaks.every(p => p.alpha > .7)).toBe(true);
    const cues = await page.evaluate(() => window.healingQA.cues());
    for (const cue of cues.filter(c => c.kind === 'cast')) {
      const at = await page.evaluate(id => window.healingQA.visualPoint(id), cue.targetId);
      expect(peaks.some(p => Math.abs(p.x-at.x)<.3 && Math.abs(p.y-at.footY)<.3)).toBe(true);
    }
    if (skill === 'bless' || skill === 'mend') expect(peaks.every(p => !p.frame.includes('_tick_'))).toBe(true);
    expect(await page.evaluate(() => window.healingQA.behindUnits())).toBe(true);
    if (skill === 'heal') {
      await page.screenshot({ path: info.outputPath('peak-390.png') });
      await page.clock.runFor((timing.end-timing.contact)*.5);
      const afterglow = await page.evaluate(() => window.healingQA.painted());
      expect(afterglow.filter(p => p.frame.endsWith('_tail') && p.alpha > .2).length).toBeGreaterThanOrEqual(2);
      expect(afterglow.some(p => p.frame.endsWith('_tail') && p.width > 192)).toBe(true);
    }
    expect(await page.evaluate(() => window.healingQA.labelsAbovePaint())).toBe(true);
    await page.screenshot({ path: info.outputPath('contact-390.png') });
    await page.locator('#skip-turn').click(); await page.clock.runFor(6000);
    expect(await page.evaluate(() => window.healingQA.painted())).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('healing-committed'))).toBe(committed); expect(errors).toEqual([]);
  } finally { await ctx.close(); }
});
for (const skill of skills) test(`healing ${skill} OS reduced motion stays static`, async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    const page = await ctx.newPage(); await page.goto(`tests/browser/fixtures/healing.html?skill=${skill}`);
    if (skill !== 'revive') await page.locator('#start').click();
    await page.locator(`#action-${skill}`).click(); await page.locator(`#target-${await page.evaluate(() => window.healingQA.target())}`).click();
    const still = await page.evaluate(() => window.healingQA.painted()); expect(still.some(p => p.frame.endsWith('_peak'))).toBe(true);
    await page.waitForTimeout(90); expect(await page.evaluate(() => window.healingQA.painted())).toEqual(still);
  } finally { await ctx.close(); }
});
for (const [skill, scenario, kind] of [
  ['heal', 'overflow', 'barrier'], ['heal', 'twin', 'cast'], ['prayer', 'echo', 'tick'],
  ['rouse', 'normal', 'redirect'], ['bless', 'normal', 'tick'], ['mend', 'normal', 'tick'], ['mend', 'barrier', 'barrier'], ['mend', 'solo', 'tick'],
] as const) test(`healing ${skill}/${scenario} shows actual ${kind} events`, async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-27T00:00:00Z') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`tests/browser/fixtures/healing.html?skill=${skill}&scenario=${scenario}`); await page.locator('#start').click();
  await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
  const turns = await page.evaluate(() => window.healingQA.sequence());
  const cues = await page.evaluate(() => window.healingQA.cues()); expect(cues.some(c => c.kind === kind)).toBe(true);
  const indices = turns.flatMap((t, i) => t.events.some(e => kind === 'redirect' ? e.type === 'damage' && t.side === 'enemy' : kind === 'tick' ? e.type === 'heal' && e.text !== 'Restored HP.' : kind === 'barrier' ? e.type === 'barrier' : e.type === 'heal') ? [i] : []);
  expect(indices.length).toBeGreaterThan(0);
  for (const i of indices) {
    const response = await page.evaluate(i => window.healingQA.preview(i), i);
    await page.clock.runFor(80);
    const observation = await page.evaluate(ids => ({ frames: window.healingQA.painted(), points: Object.fromEntries(ids.map(id => [id, window.healingQA.visualPoint(id)])) }), response.map(c => c.targetId));
    const frames = observation.frames; expect(frames.length).toBeGreaterThan(0);
    for (const cue of response.filter(c => c.kind === kind)) {
      expect(turns[i]!.events).toContainEqual(cue.event);
      const at = observation.points[cue.targetId]!;
      expect(frames.some(p => Math.abs(p.x-at.x)<.3 && Math.abs(p.y-at.footY)<.3)).toBe(true);
    }
    if (kind === 'redirect') expect((await page.evaluate(() => window.healingQA.painted('defense-fx'))).some(p => p.frame === 'guard_peak')).toBe(false);
    await page.evaluate(() => window.healingQA.stop()); expect(await page.evaluate(() => window.healingQA.painted())).toEqual([]);
  }
});
test('healing missing atlas remains actionable with fallback and one committed command', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-10-27T00:00:00Z') });
  await page.route('**/assets/fx/healing_fx.*', route => route.abort());
  await page.goto('tests/browser/fixtures/healing.html?skill=heal'); await page.locator('#start').click();
  await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
  await page.locator('#action-heal').click(); await page.locator(`#target-${await page.evaluate(() => window.healingQA.target())}`).click();
  const committed = await page.evaluate(() => localStorage.getItem('healing-committed'));
  expect(JSON.parse(committed!).commands).toHaveLength(1); expect(await page.evaluate(() => window.healingQA.painted())).toEqual([]);
  await page.locator('#skip-turn').click(); expect(await page.evaluate(() => localStorage.getItem('healing-committed'))).toBe(committed); expect(errors).toEqual([]);
});
for (const mode of ['fast', 'reduced', 'osreduce']) test(`healing ${mode} resize and hidden cleanup preserve results`, async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: mode === 'osreduce' ? 'reduce' : 'no-preference' });
  try {
    const page = await ctx.newPage(); await page.goto(`tests/browser/fixtures/healing.html?skill=mend&speed=${mode === 'fast' ? 'fast' : 'normal'}&intensity=${mode === 'reduced' ? 'reduced' : 'standard'}`);
    await page.locator('#start').click(); await page.locator('#action-mend').click(); await page.locator('#target-lio').click();
    const committed = await page.evaluate(() => localStorage.getItem('healing-committed'));
    await page.setViewportSize({ width: 391, height: 844 }); await page.waitForTimeout(200);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(800); expect(await page.evaluate(() => window.healingQA.painted())).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('healing-committed'))).toBe(committed);
  } finally { await ctx.close(); }
});

for (const dpr of [2, 3]) test(`healing follows rendered unit and field shake at${dpr}x DPR`, async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, reducedMotion: 'no-preference' });
  try {
    const page = await ctx.newPage(); await page.clock.install({ time: new Date('2026-10-27T00:00:00Z') });
    await page.goto('tests/browser/fixtures/healing.html?skill=rouse'); await page.locator('#start').click();
    await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
    const turns = await page.evaluate(() => window.healingQA.sequence());
    const i = turns.findIndex(t => t.side === 'enemy');
    const cues = await page.evaluate(i => window.healingQA.preview(i), i); const hit = cues.find(c => c.kind === 'redirect')!;
    for (const step of [40, 60]) {
      await page.clock.runFor(step);
      const rendered = await page.evaluate(id => window.healingQA.worldAlignment(id), hit.targetId);
      expect(rendered.buffer).toBe(Math.round(rendered.css*dpr));
      expect(rendered.lights.some(p => Math.abs(p.x-rendered.foot.x)<.5 && Math.abs(p.y-rendered.foot.y)<.5)).toBe(true);
    }
  } finally { await ctx.close(); }
});
