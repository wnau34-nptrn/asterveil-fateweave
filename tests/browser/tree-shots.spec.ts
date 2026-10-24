import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { emptyTomes } from '../../src/core/world/tomes';
import { parseGame } from '../../src/core/save/expedition-save';
import { MAPS } from '../../src/content/world/maps';

// Review screenshots of the release A trees and the skill-tome tab at the camp for the owner (not a gameplay check).
// Run with TREE_SHOTS=<dir> npx playwright test tests/browser/tree-shots.spec.ts
const dir = process.env.TREE_SHOTS;
const key = 'asterveil.fateweave.expedition.v1';
test('tree and skill-level shots 390x844', async ({ browser }) => {
  test.skip(!dir, 'set TREE_SHOTS to a folder');
  const profile = newProfile(map, 123); profile.tutorialDone = true; profile.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  profile.cleared = ['ruined-border', 'deep-forest']; profile.veteran = true; profile.bank.gold = 140;
  profile.tomes = emptyTomes(); profile.tomes.blade = { small: 7, medium: 1, large: 0 }; profile.tomes.bulwark.small = 4; profile.riftCore = 0;
  profile.members.tracer = { stars: 3, dupes: 0, level: 10, exp: 0, talents: { a1: 2, a2d: 1, a3: 1, a3s: 1, b1: 1, b2: 1, b3r: 1, c1: 2 }, loadout: ['mark', 'execute', 'lunge'], skillLevels: { execute: 3, mark: 2 } };
  const raw = JSON.stringify({ version: 37, profile, run: null }); parseGame(raw, map, encounterById, MAPS);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce', deviceScaleFactor: 2 }), page = await context.newPage();
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('shots-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('shots-seeded', 'yes'); } }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-team').click(); await page.locator('#lobby-member-tracer').click(); await page.locator('#lobby-tree-open').click();
  await expect(page.locator('#camp-character-dialog')).toBeVisible();
  const shot = async (name: string) => { await page.waitForTimeout(150); await page.screenshot({ path: `${dir}/${name}.png` }); };
  const to = (sel: string) => page.locator(sel).first().evaluate(el => { const c = document.querySelector('#camp-character-content')!; c.scrollTop += el.getBoundingClientRect().top - c.getBoundingClientRect().top - 8; });
  await page.locator('#camp-character-talent-c1s').click(); await shot('tree-duelist');
  await page.locator('#camp-character-tab-skills').click(); await to('[data-skill=execute]'); await shot('skills-duelist');
  await page.locator('#camp-skill-up-lunge').click(); await to('.tome-bag'); await page.locator('.tome-trade summary').click(); await shot('skills-tomes');
  await context.close();
});
