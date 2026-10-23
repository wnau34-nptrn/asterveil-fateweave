import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
import { MAPS } from '../../src/content/world/maps';
import atlas from '../../src/game/visuals/skill_icons.json' with { type: 'json' };

const key = 'asterveil.fateweave.expedition.v1';
const members = {
  toma: ['smoke', 'fury', 'catalyst'], sefa: ['knives', 'decoy', 'disarm'],
  brann: ['stonearmor', 'guardstone', 'tremor'], lio: ['dread', 'note', 'solo'],
  tracer: ['parry', 'lunge', 'sweep'], weaver: ['storm', 'aegis', 'dispel'],
};
const profile = () => {
  const p = newProfile(map, 123, ['tracer', 'weaver', 'toma', 'sefa', 'brann', 'lio']);
  p.party = { deployed: ['tracer', 'weaver', 'toma', 'sefa'], reserve: ['brann', 'lio'] };
  p.tutorialDone = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p.cleared = ['ruined-border', 'deep-forest']; p.veteran = true;
  for (const id of p.company) p.members[id] = { stars: 3, dupes: 0, level: 10, exp: 0 };
  p.members.tracer!.talents = { a1: 2, a2d: 1, a3s: 1, c1s: 1 };
  p.members.tracer!.loadout = ['mark', 'execute', 'lunge'];
  return p;
};
async function seed(page: Page, raw: string) {
  expect(parseGame(raw, map, encounterById, MAPS).profile.company).toHaveLength(6);
  await page.addInitScript(({ key, raw }) => {
    if (!sessionStorage.getItem('painted-seed')) {
      localStorage.setItem(key, raw); sessionStorage.setItem('painted-seed', '1');
    }
  }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click();
}
const dimensions = { viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' as const, deviceScaleFactor: 1 };

test('C1 painted skills appear in all six camp sheets and their trees at 390px', async ({ browser }, info) => {
  const context = await browser.newContext(dimensions), page = await context.newPage();
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await seed(page, JSON.stringify({ version: 39, profile: profile(), run: null }));
  await page.locator('#lobby-tab-team').click(); await page.locator('#lobby-member-tracer').click(); await page.locator('#lobby-tree-open').click();
  const before = await page.evaluate(k => localStorage.getItem(k), key);
  for (const [id, skills] of Object.entries(members)) {
    await page.locator(`#camp-character-member-${id}`).click();
    await page.locator('#camp-character-tab-skills').click();
    for (const skill of skills) {
      const art = page.locator(`.character-skills [data-skill=${skill}] > .skill-art`);
      await expect(art).toHaveCount(1);
      await expect(art).toHaveCSS('background-size', '600% 1100%');
      const index = atlas.order.indexOf(skill); expect(index).toBeGreaterThanOrEqual(34);
      await expect(art).toHaveCSS('--sx', `${index % atlas.cols / (atlas.cols - 1) * 100}%`);
      await expect(art).toHaveCSS('--sy', `${Math.floor(index / atlas.cols) / (atlas.rows - 1) * 100}%`);
      await art.scrollIntoViewIfNeeded(); await expect(art).toBeVisible();
    }
    await page.locator('#camp-character-tab-talents').click();
    await expect(page.locator('.talent-node.skill .skill-art')).toHaveCount(4);
    // Modifier nodes deliberately retain the line-icon aliases.
    expect(await page.locator('.talent-node:not(.skill) svg').count()).toBeGreaterThan(0);
    await expect(page.locator('#camp-character-dialog')).toBeVisible();
  }
  await page.locator('#camp-character-member-tracer').click();
  await page.locator('#camp-character-talent-c1s').click();
  await page.locator('#camp-character-content').evaluate(el => el.scrollTo(0, 0));
  await page.screenshot({ path: process.env.ICON_SHOTS ? `${process.env.ICON_SHOTS}/tree-390.png` : info.outputPath('tree-390.png') });
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]); await context.close();
});

test('C1 equipped tree skill uses painted art in the live battle dock', async ({ browser }, info) => {
  const context = await browser.newContext(dimensions), page = await context.newPage();
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const p = profile(); p.party = { deployed: ['tracer', 'weaver', 'toma', 'brann'], reserve: ['sefa', 'lio'] };
  const game = depart(p, map, encounterById, 1234);
  game.run.battle = { kind: 'random', encounterId: 'veil-siege', entry: Object.fromEntries(game.run.roster.deployed.map(id => [id, game.run.hp[id]!])), commands: [] };
  await seed(page, JSON.stringify({ version: 39, ...game }));
  await page.locator('#start').click();
  await expect(page.locator('#action-lunge')).toBeEnabled();
  await expect(page.locator('#action-lunge .skill-art')).toHaveCount(1);
  await expect(page.locator('#action-lunge .skill-art')).toHaveCSS('background-size', '600% 1100%');
  await page.locator('#action-lunge').click();
  await expect(page.locator('#action-lunge')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.battle.commands.length, key)).toBe(0);
  await page.screenshot({ path: process.env.ICON_SHOTS ? `${process.env.ICON_SHOTS}/battle-dock-390.png` : info.outputPath('battle-dock-390.png') });
  await page.reload(); await page.locator('#continue').click(); await page.locator('#start').click();
  await expect(page.locator('#action-lunge .skill-art')).toBeVisible();
  expect(errors).toEqual([]); await context.close();
});
