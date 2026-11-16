import { test, expect, type Page } from '@playwright/test';
import { chapterOne } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
import { weekOf } from '../../src/core/world/board';
import { xpAt } from '../fixtures/camp-level';

// P11-04 part 2: the World Boss tab of the camp quest board at 390px, offline: attempts and personal milestones, the
// battle with its round counter (8 rounds), one `worldBoss` command at the end, the reward and the attempt count
// surviving a reload. The shared bar belongs to server play (no bar offline).
const key = 'asterveil.fateweave.expedition.v1';
// The game day turns at 06:00 local time (owner 2026-11-16).
const today = (): number => { const d = new Date(Date.now() - 6 * 3_600_000); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000); };
const saved = async (page: Page) => parseGame(await page.evaluate(k => localStorage.getItem(k)!, key), chapterOne, encounterById, MAPS).profile;

async function playOut(page: Page): Promise<void> {
  for (let i = 0; i < 80; i++) {
    if (await page.locator('#leave-battle').count()) return;
    const skip = page.locator('#skip-turn');
    if (await skip.count()) { await skip.click({ timeout: 2000 }).catch(() => undefined); continue; }
    const attack = page.locator('#action-attack');
    if (await attack.isEnabled().catch(() => false)) { await attack.click(); await page.locator('#target-f1').click({ timeout: 3000 }).catch(() => undefined); }
    await page.waitForTimeout(60);
  }
}

test('the World Boss tab shows the week, plays one attempt and pays once', async ({ page }) => {
  test.setTimeout(240_000);
  const day = today(); const week = weekOf(day);
  const p = newProfile(chapterOne, 17, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(10); p.cleared = MAPS.map(m => m.id);
  p.bank = { ore: 100, gold: 100, shard: 0, dust: 0 };
  const raw = JSON.stringify({ version: 64, profile: p, run: null }); parseGame(raw, chapterOne, encounterById, MAPS);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('p1104')) { localStorage.setItem(key, raw); sessionStorage.setItem('p1104', '1'); } }, { key, raw });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-board').click(); await page.locator('#quest-tab-boss').click();
  for (const t of ['daily', 'weekly', 'contract', 'boss', 'camp']) expect((await page.locator(`#quest-tab-${t}`).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('#wb-attempts')).toContainText('0/5'); await expect(page.locator('#wb-offline')).toBeVisible();
  await expect(page.locator('#wb-p-2')).toHaveAttribute('data-state', 'open');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/validation/p11-04-2026-11-15/boss-tab-390.png' });
  await page.locator('#wb-start').click();
  await expect(page.locator('#battle-view')).not.toHaveClass(/view-off/);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 20_000 }); await page.locator('#start').click();
  await expect(page.locator('#beat-status')).toContainText('รอบ 1/8');
  await playOut(page);
  await expect(page.locator('#leave-battle')).toBeVisible(); await expect(page.locator('.wb-damage')).toContainText('ดาเมจที่ลงกับบอส');
  await page.screenshot({ path: 'docs/validation/p11-04-2026-11-15/boss-result-390.png' });
  const after = await saved(page);
  expect(after.worldBoss!.weeks.at(-1)).toMatchObject({ week, attempts: 1 }); expect(after.worldBoss!.weeks.at(-1)!.damage).toBeGreaterThan(0);
  expect(after.bank.ore).toBe(106); expect(after.bank.gold).toBe(103);
  await page.locator('#leave-battle').click();
  await expect(page.locator('.lobby-result')).toContainText('บอสโลกครั้งที่ 1/5');
  await expect(page.locator('#wb-attempts')).toContainText('1/5');
  await page.reload(); await page.locator('#continue').click(); await page.locator('#lobby-board').click(); await page.locator('#quest-tab-boss').click();
  await expect(page.locator('#wb-attempts')).toContainText('1/5'); await expect(page.locator('#wb-start')).toContainText('ครั้งที่ 2/5');
});
