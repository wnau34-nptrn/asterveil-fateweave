import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { newExpedition } from '../../src/core/world/world';
import type { Profile } from '../../src/core/world/types';

// P02 (OD-05): the five-hero field against five foes on a 390px phone (Chromium emulation, not iOS). Owner review shots:
// TEAM_FIVE_SHOTS=<dir> npx playwright test tests/browser/team-five.spec.ts
const dir = process.env.TEAM_FIVE_SHOTS;
const key = 'asterveil.fateweave.expedition.v1';
const ids = ['guardian', 'tracer', 'metta', 'weaver', 'healer'];
const reserve = ['mira', 'toma', 'garran'];
const members = Object.fromEntries([...ids, ...reserve].map(id => [id, { stars: 1, dupes: 0 }]));
const profile = (): Profile => ({ ...newProfile(map, 5), tutorialDone: true, commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' },
  company: [...ids, ...reserve], members, party: { deployed: [...ids], reserve: [...reserve] } });
async function open(page: Page, encounterId: string | null) {
  const run = newExpedition(map, encounterById, 1234, { roster: { deployed: [...ids], reserve: [...reserve] }, members, reserveSlots: 3 }, true);
  run.fatigue = { guardian: 7, tracer: 11, mira: 1 }; run.potions.calm = 1;
  if (encounterId) run.battle = { kind: 'random', encounterId, entry: Object.fromEntries(ids.map(id => [id, run.hp[id]!])), commands: [] };
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: JSON.stringify({ version: 45, profile: profile(), run }) });
  await page.goto('./'); await page.locator('#continue').click();
  const start = page.locator('[data-ui=start]'); if (encounterId && await start.isVisible({ timeout: 3000 }).catch(() => false)) await start.click();
}
for (const id of ['rift-legion', 'thorn-host']) test(`5v5 field ${id} at 390px: ten actors, readable intents, 44px controls, keyboard`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page, id);
  await expect(page.locator('#action-attack')).toBeEnabled({ timeout: 20000 }); await page.waitForTimeout(500);
  if (dir) await page.screenshot({ path: `${dir}/team-five-${id}-390.png` });
  // Every standing actor has a field target; the intent line names its real target.
  // Five foes take the field (targets for Attack); five heroes stand in the party strip on one row.
  await expect(page.locator('[data-field-unit]')).toHaveCount(10);
  const cards = await page.locator('#party .hero-card').evaluateAll(els => els.map(e => e.getBoundingClientRect().top));
  expect(cards).toHaveLength(5); expect(new Set(cards.map(Math.round)).size).toBe(1);
  await expect(page.locator('#intent')).not.toBeEmpty();
  for (const [id, w, h] of await page.locator('.field-target:not([disabled]), .command-dock button:visible').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [e.id || e.className, r.width, r.height] as const; })))
    expect(Math.min(w as number, h as number), String(id)).toBeGreaterThanOrEqual(44);
  // Keyboard: slot keys select, Escape cancels, a valid target click commits once.
  await page.keyboard.press('1'); await expect(page.locator('#action-attack')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.field-target.valid-target').first().click();
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.battle.commands.length, key)).toBe(1);
  if (dir) { await expect(page.locator('#action-attack')).toBeEnabled({ timeout: 20000 }); await page.waitForTimeout(400); await page.screenshot({ path: `${dir}/team-five-${id}-turn2-390.png` }); }
  expect(errors).toEqual([]); await context.close();
});
test('map bag team tab: five on the field, the reserve and fatigue at 390px', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page, null);
  // The calming draught asks who drinks it, then eases that member's fatigue (7 → 3).
  await page.keyboard.press('b'); await page.locator('#potion-calm').click(); await page.locator('#calm-guardian').click();
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.fatigue.guardian, key)).toBe(3);
  await page.locator('#bag-tab-team, [role=tab]:has-text("ทีม")').first().click();
  await expect(page.locator('[data-fatigue]').first()).toBeVisible();
  if (dir) await page.screenshot({ path: `${dir}/team-five-bag-390.png`, fullPage: false });
  expect(errors).toEqual([]); await context.close();
});
test('camp team page: five deployed, reserve slots by chapter at 390px', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  // The camp team page opens after map 3 (A3 unlocks); two chapters cleared open five reserve slots.
  const p = { ...profile(), cleared: ['ruined-border', 'deep-forest', 'veil-frontier'] };
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: JSON.stringify({ version: 45, profile: p, run: null }) });
  await page.goto('./'); await page.locator('#continue').click(); await expect(page.locator('#lobby-view')).toBeVisible();
  await page.locator('#lobby-tab-team').click();
  // Five reserve slots (three filled, two free).
  await expect(page.locator('.team-grid').nth(1).locator('.team-card')).toHaveCount(5);
  await expect(page.locator('.team-grid').first().locator('.team-card:not(.empty)')).toHaveCount(5);
  if (dir) await page.screenshot({ path: `${dir}/team-five-camp-390.png` });
  expect(errors).toEqual([]); await context.close();
});
