import { test, expect } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame, SAVE_VERSION } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';
const key = 'asterveil.fateweave.expedition.v1';

// Owner 2026-11-26 (UX audit §9): the full-body figure on every character tab, lit in the class colour.
for (const [w, h] of [[390, 844], [320, 640]] as const) test(`every character tab shows the full-body figure in the class colour at ${w}x${h}`, async ({ page }) => {
  const p = newProfile(map, 17); p.tutorialDone = true; p.veteran = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p.campXp = xpAt(6); p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  for (const id of ['mira', 'toma']) if (!p.company.includes(id)) { p.company.push(id); p.members[id] = { stars: 1, shards: 0 }; }
  const raw = JSON.stringify({ version: SAVE_VERSION, profile: p, run: null }); parseGame(raw, map, lookup);
  await page.addInitScript(({ key, raw }) => { localStorage.setItem(key, raw); }, { key, raw });
  await page.setViewportSize({ width: w, height: h }); await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-characters').click();
  const dialog = page.locator('#camp-character-dialog');
  const tone = () => dialog.evaluate(d => getComputedStyle(d).getPropertyValue('--class-tone').trim());
  expect(await tone()).toBe('#61c9ff');   // Knight
  for (const tab of ['overview', 'gear', 'skills', 'talents', 'develop']) {
    await page.locator(`#camp-character-tab-${tab}`).click();
    const figure = dialog.locator(tab === 'gear' ? '.doll-hero .hero-art' : '.hero-stage .hero-art');
    await expect(figure, tab).toHaveCount(1); await expect(figure, tab).toBeVisible();
    const b = (await figure.boundingBox())!; expect(b.height, tab).toBeGreaterThanOrEqual(120); expect(b.x + b.width, tab).toBeLessThanOrEqual(w);
  }
  await page.locator('#camp-character-member-mira').click(); expect(await tone()).toBe('#6fbf73');   // Archer
  await expect(dialog.locator('.hero-ring')).toHaveCount(0);
  expect(await page.evaluate(() => document.scrollingElement!.scrollWidth)).toBeLessThanOrEqual(w);
});
