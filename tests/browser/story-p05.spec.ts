import { test, expect } from '@playwright/test';
import { ruinsMap } from '../../src/content/world/chapter-ruins';
import { forestMap } from '../../src/content/world/chapter-forest';
import { MAPS } from '../../src/content/world/maps';
import { encounterById } from '../../src/content/encounters/catalog';
import { depart, newProfile, settle } from '../../src/core/world/profile';
import { newExpedition } from '../../src/core/world/world';
import { parseGame } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';

// P05-02 (owner OD-36–38): camp lines after a return and the abandoned camp's three choices, at 390px.
const key = 'asterveil.fateweave.expedition.v1';
const camp = () => {
  const p = newProfile(ruinsMap, 17, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(5); p.cleared = ['ruined-border'];
  return p;
};
const seed = async (page: import('@playwright/test').Page, raw: string) => {
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('p05')) { localStorage.setItem(key, raw); sessionStorage.setItem('p05', '1'); } }, { key, raw });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./'); await page.locator('#continue').click();
};

test('the camp tells what the last return chose and the story quest it finished', async ({ page }, info) => {
  const run = { ...newExpedition(ruinsMap, encounterById, 4, undefined, true), openedChests: ruinsMap.chests.map(c => c.id), eventsDone: ['ruins-traveller'], choices: { 'ruins-traveller': 'guide' as const } };
  const p = settle(camp(), run, 'withdrawn', ruinsMap);
  const raw = JSON.stringify({ version: 61, profile: p, run: null }); parseGame(raw, ruinsMap, encounterById, MAPS);
  await seed(page, raw);
  const result = page.locator('.lobby-result');
  await expect(result.locator('.camp-line')).toHaveCount(2);
  await expect(result.locator('.camp-line').first()).toContainText('ธงของคนที่หนี');
  await expect(result.locator('.camp-line').nth(1)).toContainText('ชี้ทาง');
  await page.screenshot({ path: info.outputPath('camp-lines.png') });
});

test('the abandoned camp offers rest, search and walk past; walking past saves the choice', async ({ page }, info) => {
  const p = camp(); p.cleared = ['ruined-border'];
  const game = depart(p, forestMap, encounterById, 23); const ev = forestMap.events.find(e => e.kind === 'abandoned')!;
  game.run.position = { x: ev.x, y: ev.y - 1 };
  const raw = JSON.stringify({ version: 61, profile: game.profile, run: game.run }); parseGame(raw, forestMap, encounterById, MAPS);
  await seed(page, raw);
  await page.locator('#move-down').click();
  await expect(page.locator('#event-dialog')).toBeVisible(); await expect(page.locator('#event-title')).toContainText('ค่ายร้าง');
  for (const c of ['shelter', 'search', 'pass']) await expect(page.locator(`#event-${c}`)).toBeVisible();
  await page.screenshot({ path: info.outputPath('abandoned-camp.png') });
  await page.locator('#event-pass').click();
  await expect.poll(async () => parseGame(await page.evaluate(k => localStorage.getItem(k)!, key), forestMap, encounterById, MAPS).run?.choices).toEqual({ 'forest-camp': 'pass' });
});
