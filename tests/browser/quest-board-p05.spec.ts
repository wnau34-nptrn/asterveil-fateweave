import { test, expect } from '@playwright/test';
import { chapterOne } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
import { weekOf } from '../../src/core/world/board';
import { xpAt } from '../fixtures/camp-level';

// P05-06: the quest board at 390px — daily/weekly/contract tabs beside the camp quests, progress already counted
// (yesterday's catch-up set and a sweep), one claim pays once and the result survives a reload.
const key = 'asterveil.fateweave.expedition.v1';
// The game day turns at 06:00 local time (owner 2026-11-16).
const today = (): number => { const d = new Date(Date.now() - 6 * 3_600_000); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000); };
const saved = async (page: import('@playwright/test').Page) => parseGame(await page.evaluate(k => localStorage.getItem(k)!, key), chapterOne, encounterById, MAPS).profile;

test('the quest board counts by itself, keeps a catch-up day and pays each task once', async ({ page }, info) => {
  const day = today(); const p = newProfile(chapterOne, 17, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(10); p.cleared = MAPS.map(m => m.id);
  p.bank = { ore: 100, gold: 100, shard: 0, dust: 0 };
  // Yesterday's set was done but not claimed; this week has a contract done on map 3.
  const yesterday = { day: day - 1, n: { wins: 3, chests: 2 }, claimed: [] };
  // The contract sits on yesterday's week: this week, or last week (still claimable) when today is a Monday.
  const week = weekOf(day - 1);
  p.board = { day: day - 1, days: [yesterday], weeks: [{ week, n: { wins: 3, chests: 2, contracts: 1, elites: 3 }, claimed: [], jobs: { 'job-unharmed': ['veil-frontier'] } }] };
  const raw = JSON.stringify({ version: 63, profile: p, run: null }); parseGame(raw, chapterOne, encounterById, MAPS);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('p0506')) { localStorage.setItem(key, raw); sessionStorage.setItem('p0506', '1'); } }, { key, raw });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./'); await page.locator('#continue').click();
  // Two sweeps finish today's patrol (its sweep option); nothing else on the board moves.
  await page.locator('[data-lobby=maps]').first().click();
  await page.locator('#map-sweep-veil-frontier').click(); await page.locator('#map-sweep-veil-frontier').click();
  await page.locator('[data-lobby="close"]').click();
  await page.locator('#lobby-board').click();
  for (const t of ['daily', 'weekly', 'contract', 'camp']) expect((await page.locator(`#quest-tab-${t}`).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('#quest-tab-daily')).toHaveAttribute('aria-selected', 'true');
  const todayPatrol = page.locator(`#board-claim-daily-d-patrol-${day}`), oldPatrol = page.locator(`#board-claim-daily-d-patrol-${day - 1}`);
  await expect(todayPatrol).toBeVisible(); await expect(oldPatrol).toBeVisible(); await expect(page.locator(`#board-claim-daily-d-gather-${day - 1}`)).toBeVisible();
  await expect(page.locator('.quest-board')).toContainText('งานค้างวันที่'); await expect(page.locator('.quest-board')).toContainText('เวลาของเครื่อง');
  await expect(page.locator(`#board-d-job-${day}`)).toHaveAttribute('data-state', 'open');
  await page.screenshot({ path: 'docs/validation/p05-06-2026-11-15/board-daily-390.png' });
  await todayPatrol.click();
  await expect(page.locator('.lobby-result')).toContainText('ลาดตระเวนประจำวัน');
  await expect(page.locator(`#board-d-patrol-${day}`)).toHaveAttribute('data-state', 'claimed');
  let s = await saved(page); expect(s.bank.ore).toBe(100 + 24 * 2 + 10); expect(s.board!.days.at(-1)!.claimed).toEqual(['d-patrol']);
  // P09 part 2: the weekly elite hunt pays universal star shards (shown with the reward) once.
  await page.locator('#quest-tab-weekly').click();
  const hunt = page.locator(`#board-claim-weekly-w-elites-${week}`); await expect(hunt).toBeVisible();
  await expect(page.locator(`#board-w-elites-${week}`)).toContainText('เศษกลาง 4');
  await page.screenshot({ path: 'docs/validation/p09-shards-2026-11-15/board-weekly-390.png' });
  await hunt.click(); await expect(page.locator(`#board-w-elites-${week}`)).toHaveAttribute('data-state', 'claimed');
  s = await saved(page); expect(s.bank).toMatchObject({ ore: 100 + 24 * 2 + 10 + 20, shard: 4 });
  // The contract tab pays the map-3 reward once.
  await page.locator('#quest-tab-contract').click();
  const job = page.locator(`#board-claim-contract-job-unharmed-${week}`); await expect(job).toBeVisible();
  await expect(page.locator('.quest-board')).toContainText('ไม่มีโทษ');
  await page.screenshot({ path: info.outputPath('board-contracts.png') });
  await job.click(); await expect(page.locator(`#board-job-unharmed-${week}`)).toHaveAttribute('data-state', 'claimed');
  s = await saved(page); expect(s.bank.ore).toBe(100 + 24 * 2 + 10 + 20 + 25);
  // The camp tab keeps the six one-time side quests.
  await page.locator('#quest-tab-camp').click(); await expect(page.locator('.quest-board .side-quest')).toHaveCount(chapterOne.sideQuests.length);
  // A reload keeps what was paid; the catch-up day is still open to claim.
  await page.reload(); await page.locator('#continue').click(); await page.locator('#lobby-board').click(); await page.locator('#quest-tab-daily').click();
  await expect(page.locator(`#board-d-patrol-${day}`)).toHaveAttribute('data-state', 'claimed'); await expect(oldPatrol).toBeVisible();
});
