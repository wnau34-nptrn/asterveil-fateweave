import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { encounterById } from '../../src/content/encounters/catalog';
import { parseGame } from '../../src/core/save/expedition-save';
import { affixPool } from '../../src/core/world/equipment';

// Review screenshots of the A7 forge for the owner (not a gameplay check).
// Run with FORGE_SHOTS=<dir> npx playwright test tests/browser/forge-shots.spec.ts
const dir = process.env.FORGE_SHOTS;
const key = 'asterveil.fateweave.expedition.v1';
for (const [width, height] of [[390, 844], [320, 568]] as const) {
  test(`forge shots ${width}x${height}`, async ({ browser }) => {
    const strike = width === 390;
    test.skip(!dir, 'set FORGE_SHOTS to a folder');
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, reducedMotion: 'no-preference', deviceScaleFactor: 2 }), page = await context.newPage();
    const profile = newProfile(map, 17); profile.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; profile.tutorialDone = true; profile.forgeLevel = 6; profile.completes = 9; profile.veteran = true; profile.bank = { ore: 500, dust: 50, gold: 20, seal: 3 };
    const pool = affixPool(map.equipment, 'weapon', 'guardian');
    profile.members.guardian = { stars: 3, dupes: 0, level: 6, exp: 0, gear: { weapon: { uid: 1, slot: 'weapon', hero: 'guardian', rarity: 3, level: 6, affixes: pool.slice(0, 3), plus: 4, set: 'dawn' } } };
    profile.items = [{ uid: 2, slot: 'weapon', hero: 'guardian', rarity: 0, level: 3, affixes: [], plus: 2, investment: { ore: 9, dust: 2 }, levelInvestment: { ore: 20, dust: 2 } }, { uid: 3, slot: 'weapon', hero: 'guardian', rarity: 0, level: 1, affixes: [] }, { uid: 4, slot: 'body', rarity: 0, level: 4, affixes: [] }, { uid: 5, slot: 'weapon', hero: 'guardian', rarity: 0, level: 1, affixes: [] }]; profile.nextItem = 6;
    const raw = JSON.stringify({ version: 35, profile, run: null });
    parseGame(raw, map, encounterById);
    await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('forge-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('forge-seeded', '1'); } }, { key, raw });
    await page.goto('./'); await page.locator('#continue').click();
    const shot = async (name: string) => { await page.waitForTimeout(150); await page.screenshot({ path: `${dir}/${name}-${width}.png` }); };
    await page.locator('#lobby-tab-forge').click(); await expect(page.locator('.forge-workbench')).toBeVisible(); await shot('forge-pick');
    await page.locator('#forge-item-1').click(); await shot('forge-enhance');
    await page.locator('#forge-enhance').click(); await shot('forge-review');
    if (strike) {
      // Deterministic frames: fake timers drive the flipbooks, the Web Animations are paused and seeked to the same time.
      await page.clock.install(); await page.clock.pauseAt(Date.now() + 5000); await page.locator('#forge-confirm').click(); let at = 0;
      for (const [name, t] of [['a', 280], ['b', 345], ['c', 520], ['d', 705], ['e', 800], ['f', 1000]] as const) {
        await page.clock.runFor(t - at); at = t;
        await page.evaluate(ms => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; } }, t); await page.screenshot({ path: `${dir}/forge-strike-${name}-${width}.png` });
      }
    }
    else await page.locator('#forge-cancel').click();
    await page.locator('#forge-mode-level').click(); await shot('forge-level');
    await page.locator('#forge-tab-recycle').click(); await shot('forge-recycle');
    await context.close();
  });
}
