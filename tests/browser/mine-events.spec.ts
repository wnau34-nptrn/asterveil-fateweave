// Map 5 side events at 390px: the trapped worker, the ore cart, the fresh vein, the ore merchant, the crystal weapon
// recipe in the forge and Uncle Bork's camp job. Screens go to test-results (CLIPS=1 for owner captures).
import { expect, test, type Page } from '@playwright/test';
import { encounterById } from '../../src/content/encounters/catalog';
import { mineMap } from '../../src/content/world/chapter-mine';
import { MAPS } from '../../src/content/world/maps';
import { parseGame, type Game } from '../../src/core/save/expedition-save';
import { depart, newProfile } from '../../src/core/world/profile';
import type { MapEventKind, Profile } from '../../src/core/world/types';
import { capXp, reveal } from '../../src/core/world/world';
import { currentSave } from '../fixtures/current-save';
import { chooseForgeTask } from './forge-navigation';

const ids = ['guardian', 'tracer', 'weaver', 'healer', 'lio'];
const key = 'asterveil.fateweave.expedition.v1';
test.use({ viewport: { width: 390, height: 844 } });

function company(): Profile {
  return { ...newProfile(MAPS[0]!, 19, ids), tutorialDone: true, campXp: capXp(mineMap, 4),
    commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }, cleared: MAPS.slice(0, 4).map(m => m.id) };
}
async function launch(page: Page, game: Game): Promise<void> {
  if (game.run && !game.run.battle) reveal(game.run, mineMap);
  const raw = currentSave(game);
  await page.addInitScript(({ key, raw }) => {
    if (!sessionStorage.getItem('mine-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('mine-seeded', '1'); }
  }, { key, raw });
  await page.goto('./?server=off');
  await page.locator('#continue').click({ timeout: 15_000 });
}
const saved = async (page: Page) => parseGame(await page.evaluate(k => localStorage.getItem(k)!, key), MAPS[0]!, encounterById, MAPS);
const shot = async (page: Page, name: string) => { await page.waitForTimeout(400); await page.screenshot({ path: test.info().outputPath(`${name}.png`) }); };
// Stand west of the event (east for the cart, which sits by the yard's west wall) and step onto it.
async function stepOnto(page: Page, kind: MapEventKind, ore = 0): Promise<void> {
  const game = depart(company(), mineMap, encounterById, 11); const ev = mineMap.events.find(e => e.kind === kind)!;
  const fromEast = kind === 'cart';
  game.run.position = { x: ev.x + (fromEast ? 1 : -1), y: ev.y }; game.run.repel = mineMap.potions.repelSteps;
  game.run.resources.ore += ore;
  await launch(page, game);
  await page.locator(fromEast ? '#move-left' : '#move-right').click();
  await expect(page.locator('#event-dialog')).toBeVisible();
}

test('trapped worker: digging them out pays ore and shards and tires the team', async ({ page }) => {
  await stepOnto(page, 'trapped');
  await expect(page.locator('#event-title')).toContainText('คนงานติดอยู่');
  await expect(page.locator('#event-pass')).toBeVisible();
  await shot(page, 'mine-event-trapped');
  await page.locator('#event-free').click();
  await expect.poll(async () => (await saved(page)).run?.choices?.['mine-trapped-worker']).toBe('free');
  const run = (await saved(page)).run!;
  expect(Object.values(run.fatigue ?? {}).every(n => n === mineMap.eventRules.trapped.fatigue)).toBe(true);
});

test('ore cart: rummaging finds supplies', async ({ page }) => {
  await stepOnto(page, 'cart');
  await expect(page.locator('#event-title')).toContainText('รถแร่ทิ้งไว้');
  await page.locator('#event-rummage').click();
  await expect.poll(async () => (await saved(page)).run?.choices?.['mine-ore-cart']).toBe('rummage');
  await expect(page.locator('#world-message, .world-message').first()).toContainText('ค้นรถแร่');
});

test('fresh vein: the dialog states the trade', async ({ page }) => {
  await stepOnto(page, 'vein');
  await expect(page.locator('#event-title')).toContainText('สายแร่สด');
  await expect(page.locator('#event-dialog')).toContainText(`${mineMap.eventRules.vein.pressure}%`);
  await shot(page, 'mine-event-vein');
  const before = (await saved(page)).run!.pressure;
  await page.locator('#event-dig').click();
  await expect.poll(async () => (await saved(page)).run!.pressure).toBeGreaterThan(before);
});

test('ore merchant: sells ore for gold up to the limit and stays open', async ({ page }) => {
  const t = mineMap.eventRules.oreTrade;
  await stepOnto(page, 'ore-merchant', t.ore * t.limit);
  await expect(page.locator('#event-title')).toContainText('พ่อค้าแร่');
  // The merchant stays on the tile: the action button reopens it after each trade.
  for (let i = 1; i <= t.limit; i++) {
    if (!(await page.locator('#event-dialog').isVisible())) await page.locator('#rest').click();
    await page.locator('#event-sell-ore').click(); await expect.poll(async () => (await saved(page)).run?.sold).toBe(i);
  }
  if (!(await page.locator('#event-dialog').isVisible())) await page.locator('#rest').click();
  await expect(page.locator('#event-sell-ore')).toBeDisabled(); await expect(page.locator('#event-sell-ore')).toHaveText('ขายครบแล้ว');
  await shot(page, 'mine-event-merchant');
});

test('forge: the ledger story unlocks the crystal weapon recipe', async ({ page }) => {
  const p = { ...company(), storyQuests: [mineMap.id], bank: { ore: 300, dust: 80, gold: 20, shard: 3 } };
  await launch(page, { profile: p, run: null });
  await page.locator('#lobby-tab-forge').click(); await chooseForgeTask(page, 'craft');
  await page.locator('#forge-craft-recipe').selectOption('crystal');
  await expect(page.locator('.forge-service-page')).toContainText('อาวุธผลึก');
  await shot(page, 'mine-forge-crystal');
  await page.locator('#forge-craft').click(); await page.locator('#forge-confirm').click();
  await expect.poll(async () => (await saved(page)).profile.items.at(-1)?.rarity).toBe(mineMap.equipment.forge.crystal!.rarity);
});

test("camp: Uncle Bork's mine job shows its progress", async ({ page }) => {
  const p = { ...company(), quests: { 'smith-mine-crystals': { progress: 2, claimed: false } } };
  await launch(page, { profile: p, run: null });
  await page.locator('#lobby-board').click(); await page.locator('#quest-tab-camp').click();
  const job = page.getByText('ผลึกจากอีลิทเหมือง'); await job.scrollIntoViewIfNeeded(); await expect(job).toBeVisible();
  await shot(page, 'mine-bork-job');
});

// Dark tunnels hide events until the team is adjacent, so a pending event glows through the dark within three steps.
test('dark tunnels: a pending event shows a beacon within three steps and steps its hint aside when adjacent', async ({ page }) => {
  const ev = mineMap.events.find(e => e.kind === 'vein')!;
  const game = depart(company(), mineMap, encounterById, 11); game.run.position = { x: ev.x - 4, y: ev.y }; game.run.repel = mineMap.potions.repelSteps;
  await launch(page, game);
  await expect(page.locator('.event-beacon')).toHaveCount(0);
  await page.locator('#move-right').click();
  await expect(page.locator('.event-beacon[data-kind=vein]')).toHaveCount(1);
  const stepTo = async (x: number): Promise<void> => {
    await page.locator('#move-right').click();
    await expect.poll(async () => (await saved(page)).run?.position.x, { timeout: 8000 }).toBe(x);
  };
  await stepTo(ev.x - 2); await stepTo(ev.x - 1);
  await expect(page.locator('.step-hint.on-event')).toHaveCount(1);
  await page.locator('#move-right').click();
  await expect(page.locator('#event-dialog')).toBeVisible();
  await expect(page.locator('.event-beacon')).toHaveCount(0);
});
