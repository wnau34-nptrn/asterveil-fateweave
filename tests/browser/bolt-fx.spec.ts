import { test, expect, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile, depart } from '../../src/core/world/profile';

// A8 Bolt vertical slice: the Astral Thread plays on real canvas and never changes the committed result.
const key = 'asterveil.fateweave.expedition.v1';
const saved = (page: Page) => page.evaluate(k => localStorage.getItem(k)!, key);
async function toWeaver(page: Page, speed: 'normal' | 'fast', intensity: 'standard' | 'reduced') {
  const p = newProfile(map, 17); p.commander = { name: 'จังหวะ', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.tutorialDone = true;
  const game = depart(p, map, encounterById, 1234); game.run.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...game.run.hp }, commands: [] };
  await page.addInitScript(({ key, raw, prefs }) => { if (!sessionStorage.getItem('bolt-seeded')) { localStorage.setItem(key, raw); localStorage.setItem('asterveil.fateweave.presentation.v1', prefs); sessionStorage.setItem('bolt-seeded', '1'); } },
    { key, raw: JSON.stringify({ version: 34, ...game }), prefs: JSON.stringify({ speed, intensity }) });
  await page.clock.install({ time: new Date('2026-10-22T00:00:00Z') }); await page.goto('./'); await page.locator('#continue').click();
  await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click(); await page.clock.pauseAt(new Date('2026-10-22T01:00:00Z'));
  for (let i = 0; i < 6 && !(await page.locator('#action-bolt').isVisible()); i++) { await page.locator('#target-brute').click(); await page.clock.runFor(4000); }
  await expect(page.locator('#action-bolt')).toBeEnabled();
}
for (const [width, height, touch] of [[390, 844, true], [320, 568, true], [1366, 768, false]] as const) {
  for (const [speed, intensity, motion] of [['normal', 'standard', 'no-preference'], ['fast', 'standard', 'no-preference'], ['normal', 'reduced', 'no-preference'], ['normal', 'standard', 'reduce']] as const) {
    test(`bolt astral thread ${speed}/${intensity}/${motion} at ${width}x${height}`, async ({ browser }, info) => {
      const ctx = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: motion }), page = await ctx.newPage(), errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      try {
        await toWeaver(page, speed, intensity);
        const hp = await page.locator('[data-enemy=brute]').innerText();
        await page.locator('#action-bolt').click(); await page.locator('#target-brute').click(); const committed = await saved(page);
        const contact = motion === 'reduce' ? 0 : speed === 'fast' ? 194 : 298, end = speed === 'fast' ? 553 : 850;
        const shots = motion === 'reduce' ? [0] : [0, 20, 50, Math.round(contact * .5), Math.round(contact * .8), contact, contact + 40, contact + 140, end - 120];
        let at = 0;
        for (const [i, t] of shots.entries()) {
          await page.clock.runFor(t - at); at = t;
          if (contact && t < contact) await expect(page.locator('[data-enemy=brute]')).toHaveText(hp);
          await page.locator('#battle-canvas, canvas').first().screenshot({ path: info.outputPath(`frame-${String(i).padStart(2, '0')}-${t}ms.png`) });
        }
        await expect(page.locator('[data-enemy=brute]')).not.toHaveText(hp);
        await page.clock.runFor(4000); expect(await saved(page)).toBe(committed); expect(errors).toEqual([]);
      } finally { await ctx.close(); }
    });
  }
}
