import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';
import { affixPool } from '../../src/core/world/equipment';
import { findTiles, reveal } from '../../src/core/world/world';
import { parseGame } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';

// Review screenshots of the expedition summary for the owner (not a gameplay check).
// Run with SUMMARY_SHOTS=<dir> npx playwright test tests/browser/summary-shots.spec.ts
const dir = process.env.SUMMARY_SHOTS;
const key = 'asterveil.fateweave.expedition.v1';
test('summary shots 390x844', async ({ browser }) => {
  test.skip(!dir, 'set SUMMARY_SHOTS to a folder');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 }), page = await context.newPage();
  const profile = newProfile(map, 123); profile.tutorialDone = true; profile.completes = 1; profile.cleared = [map.id];
  profile.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  const game = depart(profile, map, encounterById, 1234), run = game.run;
  delete run.bossLoot;
  const [goal] = findTiles(map, 'goal'); run.position = { x: goal!.x, y: goal!.y + 1 };
  run.bossDefeated = true; run.elitesDefeated = ['scar-golem']; run.eventsDone = ['scar-rift'];
  run.steps = 48; run.wins = 8;
  run.resources = { ore: 18, gold: 240, ember: 2, seal: 6 };
  const pool = (slot: 'weapon' | 'body' | 'charm') => affixPool(map.equipment, slot, slot === 'weapon' ? 'guardian' : undefined);
  run.found = [
    { uid: 0, slot: 'weapon', hero: 'guardian', rarity: 3, level: 6, plus: 2, affixes: pool('weapon').slice(0, 3) },
    { uid: 0, slot: 'charm', rarity: 2, level: 6, affixes: pool('charm').slice(0, 2) },
    { uid: 0, slot: 'body', rarity: 1, level: 6, affixes: pool('body').slice(0, 1) },
    { uid: 0, slot: 'body', rarity: 0, level: 3, affixes: [] },
  ];
  run.campXp = xpAt(6);
  reveal(run, map);
  const raw = JSON.stringify({ version: 45, ...game }); parseGame(raw, map, encounterById);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#move-up').click();
  await expect(page.locator('#summary-title')).toBeVisible(); await page.waitForTimeout(200);
  await page.screenshot({ path: `${dir}/summary-390.png` });
  await context.close();
});
