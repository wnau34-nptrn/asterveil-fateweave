import { test, expect } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
import { encounterById } from '../../src/content/encounters/catalog';
import { xpAt } from '../fixtures/camp-level';
const key = 'asterveil.fateweave.expedition.v1';
// ART-UI-LOBBY-002: the five newer recruits sit and move around the camp fire with their own painted poses instead of the standing idle fallback.
test('Corin, Cerise, Kael, Wynne and Astrid use painted camp poses', async ({ page }) => {
  const p = newProfile(map, 17); p.tutorialDone = true; p.veteran = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(6); p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  const ids = ['metta', 'lalin', 'kael', 'wynne', 'astrid'];
  for (const id of ids) if (!p.company.includes(id)) { p.company.push(id); p.members[id] = { stars: 1, shards: 0 }; }
  p.party.deployed = ids; p.party.reserve = [];
  const raw = JSON.stringify({ version: 47, profile: p, run: null }); parseGame(raw, map, encounterById);
  await page.addInitScript(({ key, raw }) => { localStorage.setItem(key, raw); }, { key, raw });
  const requests: string[] = []; page.on('request', r => { if (r.url().includes('lobby_poses_')) requests.push(r.url()); });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./'); await page.locator('#continue').click();
  await expect(page.locator('.lobby-unit')).toHaveCount(5);
  for (const id of ids) await expect(page.locator(`.lobby-unit[data-actor="${id}"]`)).toHaveAttribute('data-pose', /^(sit|idle_alt|cheer)$/);
  await expect.poll(() => requests.some(u => u.includes('lobby_poses_p03.webp'))).toBe(true);
});
