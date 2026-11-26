import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { newProfile, depart } from '../../src/core/world/profile';
import type { BattleKind } from '../../src/core/world/types';
import { MAPS } from '../../src/content/world/maps';
import { parseGame } from '../../src/core/save/expedition-save';
import { currentSave } from '../fixtures/current-save';
import { xpAt } from '../fixtures/camp-level';

// Auto battle (owner 2026-11-26): the AUTO toggle shows only in random battles, plays the battle through the normal commit
// (every turn saved), and its device settings (stop HP, skills switched off) live in ⓘ → settings.
const key = 'asterveil.fateweave.expedition.v1', autoKey = 'asterveil.fateweave.auto-battle.v1';
function battleSave(kind: BattleKind, share = 100): string {
  const p = newProfile(map, 17); p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.tutorialDone = true;
  for (const m of Object.values(p.members)) m.stars = 5;
  const game = depart(p, map, lookup, 77), run = game.run;
  run.battle = { kind, encounterId: map.tutorialEncounterId, entry: Object.fromEntries(Object.entries(run.hp).map(([id, hp]) => [id, Math.ceil(hp * share / 100)])), commands: [] };
  return currentSave(game);
}
async function openBattle(page: Page, kind: BattleKind, auto?: object, share = 100): Promise<string[]> {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(({ key, raw, autoKey, auto }) => {
    if (sessionStorage.getItem('auto-seed')) return;
    localStorage.setItem(key, raw); if (auto) localStorage.setItem(autoKey, JSON.stringify(auto)); else localStorage.removeItem(autoKey);
    sessionStorage.setItem('auto-seed', '1');
  }, { key, raw: battleSave(kind, share), autoKey, auto });
  await page.goto('./?server=off'); await page.locator('#continue').click({ timeout: 15_000 });
  await page.locator('#battle-view').waitFor({ state: 'visible', timeout: 8000 });
  return errors;
}
const saved = async (page: Page) => parseGame(await page.evaluate(k => localStorage.getItem(k)!, key), map, lookup, MAPS);

test('AUTO plays a random battle to the end through the saved commit, at 390px', async ({ page }, info) => {
  const errors = await openBattle(page, 'random');
  const auto = page.locator('#battle-auto');
  await expect(auto).toBeVisible(); await expect(auto).toHaveAttribute('aria-pressed', 'false');
  const box = (await auto.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
  if (await page.locator('#start').isVisible()) await page.locator('#start').click();
  await auto.click(); await expect(auto).toHaveAttribute('aria-pressed', 'true');
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), autoKey))!)).toMatchObject({ on: true });
  await expect.poll(async () => (await saved(page)).run?.battle?.commands.length ?? 0, { timeout: 20000 }).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath('auto-running-390.png') });
  await expect(page.locator('#leave-battle')).toBeVisible({ timeout: 90000 });
  expect(errors).toEqual([]);
});

test('AUTO settings: stop HP and skills switched off are kept on the device', async ({ page }, info) => {
  await openBattle(page, 'random', { on: false, stopHp: 50, off: [] });
  await page.locator('#battle-info').click(); await page.locator('#battle-tab-settings').click();
  const panel = page.locator('#auto-settings'); await expect(panel).toBeVisible();
  await panel.locator('#auto-stop-30').click(); await expect(panel.locator('#auto-stop-30')).toHaveAttribute('aria-pressed', 'true');
  const skill = panel.locator('[data-ui=auto-skill]').first(); const action = await skill.getAttribute('data-value');
  await skill.click(); await expect(panel.locator(`#auto-skill-${action}`)).toHaveAttribute('aria-pressed', 'false');
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), autoKey))!)).toEqual({ on: false, stopHp: 30, off: [action] });
  for (const b of await panel.locator('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: info.outputPath('auto-settings-390.png') });
});

test('AUTO is not offered in other battles (here the first battle)', async ({ page }) => {
  await openBattle(page, 'tutorial', { on: true, stopHp: 50, off: [] });
  if (await page.locator('#start').isVisible()) await page.locator('#start').click();
  await expect(page.locator('#battle-auto')).toBeHidden();
  await page.waitForTimeout(1500);
  expect((await saved(page)).run?.battle?.commands.length ?? 0).toBe(0);
});

test('AUTO hands the battle back when a hero drops under the chosen HP, and resumes on a tap', async ({ page }, info) => {
  const errors = await openBattle(page, 'random', { on: true, stopHp: 70, off: [] }, 72);
  if (await page.locator('#start').isVisible()) await page.locator('#start').click();
  const status = page.locator('#auto-status'), auto = page.locator('#battle-auto');
  await expect(status).toBeVisible({ timeout: 30000 }); await expect(status).toContainText('เลือดต่ำกว่า 70%');
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
  const held = (await saved(page)).run?.battle?.commands.length ?? 0;
  await page.waitForTimeout(1500); expect((await saved(page)).run?.battle?.commands.length ?? 0).toBe(held);
  await page.screenshot({ path: info.outputPath('auto-stopped-390.png') });
  await auto.click(); await expect(status).toBeHidden(); await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await saved(page)).run?.battle?.commands.length ?? 0, { timeout: 20000 }).toBeGreaterThan(held);
  expect(errors).toEqual([]);
});

test('AUTO plays a World Boss attempt to its end and the attempt is recorded once', async ({ page }) => {
  test.setTimeout(240_000);
  await page.clock.setFixedTime(new Date('2026-11-23T05:59:59+07:00'));
  const p = newProfile(map, 17, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(10); p.cleared = MAPS.map(m => m.id);
  p.bank = { ore: 100, gold: 100, shard: 0, dust: 0 };
  const raw = JSON.stringify({ version: 64, profile: p, run: null });
  await page.addInitScript(({ key, raw, autoKey }) => {
    if (sessionStorage.getItem('auto-wb')) return;
    localStorage.setItem(key, raw); localStorage.setItem(autoKey, JSON.stringify({ on: false, stopHp: 0, off: [] })); sessionStorage.setItem('auto-wb', '1');
  }, { key, raw, autoKey });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-wboss').click(); await page.locator('#wb-start').click();
  await expect(page.locator('#start')).toBeEnabled({ timeout: 20_000 }); await page.locator('#start').click();
  const auto = page.locator('#battle-auto'); await expect(auto).toBeVisible(); await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#leave-battle')).toBeVisible({ timeout: 180_000 });
  await expect(page.locator('.wb-damage')).toContainText('ดาเมจที่ลงกับบอส');
  const profile = parseGame(await page.evaluate(k => localStorage.getItem(k)!, key), map, lookup, MAPS).profile;
  expect(profile.worldBoss!.weeks.at(-1)!.attempts).toBe(1);
  expect(errors).toEqual([]);
});
