import { test, expect } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
import { encounterById } from '../../src/content/encounters/catalog';
import { xpAt } from '../fixtures/camp-level';
const key = 'asterveil.fateweave.expedition.v1';
// Side quests moved from the NPC sheets to one camp quest board (UX audit #2, owner 2026-11-05).
for (const [w, h] of [[390, 844], [390, 650], [320, 568]] as const) test(`quest board lists every side quest, claims once and NPC sheets stay light at ${w}x${h}`, async ({ page }, info) => {
  const p = newProfile(map, 17); p.tutorialDone = true; p.veteran = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(6); p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  const ready = map.sideQuests[1]!; p.quests = { [ready.id]: { progress: ready.target, claimed: false } };
  const raw = JSON.stringify({ version: 47, profile: p, run: null }); parseGame(raw, map, encounterById);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('qb')) { localStorage.setItem(key, raw); sessionStorage.setItem('qb', '1'); } }, { key, raw });
  await page.setViewportSize({ width: w, height: h }); await page.goto('./'); await page.locator('#continue').click();
  await expect(page.locator('#lobby-board .trip-badge')).toHaveText('1');
  await page.locator('#lobby-board').click();
  await expect(page.locator('.quest-board .side-quest')).toHaveCount(map.sideQuests.length);
  await expect(page.locator('.quest-board .side-quest').first()).toHaveAttribute('data-state', 'ready');   // claimable first
  await page.screenshot({ path: info.outputPath('board.png') });
  await page.locator(`#quest-claim-${ready.id}`).click();
  await expect(page.locator(`#quest-${ready.id}`)).toHaveAttribute('data-state', 'claimed');
  await expect(page.locator('#lobby-board .trip-badge')).toHaveCount(0);
  const saved = parseGame(await page.evaluate(k => localStorage.getItem(k)!, key), map, encounterById).profile;
  expect(saved.quests[ready.id]).toEqual({ progress: ready.target, claimed: true });
  // No NPC sheet carries a quest card any more.
  await page.locator('[data-lobby="close"]').click(); await page.locator('#npc-smith').click();
  await expect(page.locator('.side-quest')).toHaveCount(0);
});
