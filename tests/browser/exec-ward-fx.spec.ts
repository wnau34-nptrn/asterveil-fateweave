import { test, expect, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile, depart } from '../../src/core/world/profile';

// A8 Execute / Ward: the painted layers play on real canvas and never changes the committed result.
const key = 'asterveil.fateweave.expedition.v1';
const saved = (page: Page) => page.evaluate(k => localStorage.getItem(k)!, key);
async function toSkill(page: Page, skill: string, speed: 'normal' | 'fast', intensity: 'standard' | 'reduced') {
  const p = newProfile(map, 17); p.commander = { name: 'จังหวะ', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.tutorialDone = true;
  const game = depart(p, map, encounterById, 1234); game.run.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...game.run.hp }, commands: [] };
  await page.addInitScript(({ key, raw, prefs }) => { if (!sessionStorage.getItem('fx-seeded')) { localStorage.setItem(key, raw); localStorage.setItem('asterveil.fateweave.presentation.v1', prefs); sessionStorage.setItem('fx-seeded', '1'); } },
    { key, raw: JSON.stringify({ version: 34, ...game }), prefs: JSON.stringify({ speed, intensity }) });
  await page.clock.install({ time: new Date('2026-10-22T00:00:00Z') }); await page.goto('./'); await page.locator('#continue').click();
  await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click(); await page.clock.pauseAt(new Date('2026-10-22T01:00:00Z'));
  for (let i = 0; i < 6 && !(await page.locator(`#action-${skill}`).isVisible()); i++) { await page.locator('#target-brute').click(); await page.clock.runFor(4000); }
  await expect(page.locator(`#action-${skill}`)).toBeEnabled();
}
for (const [skill, target] of [['execute', 'brute'], ['ward', 'weaver']] as const) {
  for (const [speed, intensity, motion] of [['normal', 'standard', 'no-preference'], ['fast', 'standard', 'no-preference'], ['normal', 'reduced', 'no-preference'], ['normal', 'standard', 'reduce']] as const) {
    test(`${skill} fx ${speed}/${intensity}/${motion} at 390x844`, async ({ browser }, info) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: motion }), page = await ctx.newPage(), errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      try {
        await toSkill(page, skill, speed, intensity);
        const watch = page.locator(skill === 'execute' ? '[data-enemy=brute]' : '#battle-view'); const before = await watch.innerText();
        await page.locator(`#action-${skill}`).click(); await page.locator(`#target-${target}`).click(); const committed = await saved(page);
        const contact = motion === 'reduce' ? 0 : speed === 'fast' ? 194 : 298, end = speed === 'fast' ? 553 : 850;
        let at = 0;
        for (const [i, t] of (motion === 'reduce' ? [0] : [0, 60, Math.round(contact * .5), contact - 20, contact + 40, contact + 140, end - 120]).entries()) {
          await page.clock.runFor(t - at); at = t;
          if (skill === 'execute' && contact && t < contact) await expect(watch).toHaveText(before);
          await page.locator('#battle-canvas, canvas').first().screenshot({ path: info.outputPath(`frame-${String(i).padStart(2, '0')}-${t}ms.png`) });
        }
        if (skill === 'execute') await expect(watch).not.toHaveText(before);
        await page.clock.runFor(4000); expect(await saved(page)).toBe(committed); expect(errors).toEqual([]);
      } finally { await ctx.close(); }
    });
  }
}
