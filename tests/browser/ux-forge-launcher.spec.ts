import { test, expect } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame, SAVE_VERSION } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';
const key = 'asterveil.fateweave.expedition.v1';

// UX audit P1-5: the forge launcher leads with the two everyday tasks and every card says whether it can be done now.
for (const [w, h, rich] of [[360, 640, true], [390, 844, false]] as const) test(`forge task cards show their state at ${w}x${h}${rich ? ' with materials' : ''}`, async ({ page }) => {
  const p = newProfile(map, 17); p.tutorialDone = true; p.veteran = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p.campXp = xpAt(6); p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  p.items = [{ uid: 1, slot: 'body', rarity: 0, level: 3, affixes: [] }, { uid: 2, slot: 'head', rarity: 0, level: 2, affixes: [] }]; p.nextItem = 3;
  p.bank.ore = rich ? 400 : 0; p.bank.dust = rich ? 80 : 0;
  const raw = JSON.stringify({ version: SAVE_VERSION, profile: p, run: null }); parseGame(raw, map, lookup);
  await page.addInitScript(({ key, raw }) => { localStorage.setItem(key, raw); }, { key, raw });
  await page.setViewportSize({ width: w, height: h }); await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-forge').click();
  const enhance = page.locator('#forge-mode-enhance'), level = page.locator('#forge-mode-level');
  await expect(enhance).toHaveAttribute('data-state', rich ? 'ready' : 'blocked');
  await expect(enhance.locator('.forge-task-state')).toHaveText(rich ? 'ทำได้ 2 ชิ้น' : 'แร่หรือฝุ่นไม่พอ');
  await expect(page.locator('#forge-tab-recycle .forge-task-state')).toHaveText('ในคลัง 2 ชิ้น');
  await expect(page.locator('#forge-tab-smelt')).toHaveAttribute('data-state', rich ? 'ready' : 'blocked');
  // Both everyday cards are wide and inside the first screen.
  const grid = (await page.locator('.forge-task-grid').boundingBox())!;
  for (const card of [enhance, level]) { const b = (await card.boundingBox())!; expect(b.width).toBeGreaterThan(grid.width - 2); expect(b.y + b.height).toBeLessThanOrEqual(h); }
  // Opening a task still works from the card.
  await enhance.click(); await expect(page.locator('.forge-task-grid')).toHaveCount(0);
});
