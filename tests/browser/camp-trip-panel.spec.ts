import { test, expect } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
import { encounterById } from '../../src/content/encounters/catalog';
import { xpAt } from '../fixtures/camp-level';
const key = 'asterveil.fateweave.expedition.v1';
// UX audit 2026-11-04 #3/#4: the whole five-person team sits at the fire and the trip summary is a readable panel above Depart.
for (const [w, h] of [[390, 844], [390, 650]] as const) test(`camp shows all five deployed members and a readable trip panel at ${w}x${h}`, async ({ page }) => {
  const p = newProfile(map, 17); p.tutorialDone = true; p.veteran = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(6); p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  for (const id of ['mira', 'toma', 'sefa', 'brann', 'lio', 'garran']) if (!p.company.includes(id)) { p.company.push(id); p.members[id] = { stars: 1, shards: 0 }; }
  p.party.deployed = p.company.slice(0, 5); p.party.reserve = p.company.slice(5, 8);
  const raw = JSON.stringify({ version: 47, profile: p, run: null }); parseGame(raw, map, encounterById);
  await page.addInitScript(({ key, raw }) => { localStorage.setItem(key, raw); }, { key, raw });
  await page.setViewportSize({ width: w, height: h }); await page.goto('./'); await page.locator('#continue').click();
  await expect(page.locator('.lobby-unit')).toHaveCount(5);
  const head = page.locator('.trip-head'); await expect(head).toContainText('ลงสนาม 5 · สำรอง 3');
  const [hb, db] = [await head.boundingBox(), await page.locator('#lobby-depart').boundingBox()];
  expect(hb!.y + hb!.height).toBeLessThanOrEqual(db!.y + 1);   // sits above Depart
  const bg = await head.evaluate(e => getComputedStyle(e).backgroundColor); expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  for (const u of await page.locator('.lobby-unit').all()) { const ub = await u.boundingBox(); expect(ub!.y + ub!.height * .75).toBeLessThanOrEqual(hb!.y + 8); }   // members stand above the panel, not behind it
  await expect(page.locator('#lobby-maps')).toBeVisible();
});
