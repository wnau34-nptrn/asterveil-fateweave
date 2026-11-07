import { expect, test } from '@playwright/test';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { ruinsMap as map } from '../../src/content/world/chapter-ruins';
import { MAPS } from '../../src/content/world/maps';
import { parseGame } from '../../src/core/save/expedition-save';
import { newProfile } from '../../src/core/world/profile';
import { currentSave } from '../fixtures/current-save';
import { watchPage } from './diagnostics';

const key = 'asterveil.fateweave.expedition.v1';
for (const milestone of [0, 1, 2]) test(`approved pacing after MAP ${milestone}, non-veteran at 390px`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); watchPage(page);
  const p = { ...newProfile(map, 21, ['guardian', 'tracer', 'weaver', 'healer']), tutorialDone: true,
    cleared: MAPS.filter(m => m.chapter <= milestone).map(m => m.id),
    commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } };
  p.bank.gold = 500;
  const ready = map.sideQuests.find(q => q.kind === 'wins')!;
  p.quests[ready.id] = { progress: ready.target, claimed: false };
  const raw = currentSave({ profile: p, run: null });
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('pacing')) { localStorage.setItem(key, raw); sessionStorage.setItem('pacing', '1'); } }, { key, raw });
  const saved = async () => parseGame((await page.evaluate(k => localStorage.getItem(k), key))!, map, lookup, MAPS).profile;
  await page.goto('./'); await page.locator('#continue').click();
  await expect(page.locator('.lobby-guide')).toHaveCount(milestone ? 1 : 0);
  if (!milestone) await expect(page.locator('#lobby-board')).toHaveCount(0);
  else {
    await page.locator('#lobby-board').click();
    await expect(page.locator('.quest-board .side-quest')).toHaveCount(map.sideQuests.length);
    await expect(page.locator(`#quest-claim-${map.sideQuests[0]!.id}`)).toBeDisabled();
    if (milestone === 1) await page.screenshot({ path: 'docs/validation/system-unlock-pacing/quests-map1-390.png' });
    await page.locator(`#quest-claim-${ready.id}`).click();
    expect((await saved()).bank.gold).toBe(500 + ready.reward.gold!);
    expect((await saved()).quests[ready.id]?.claimed).toBe(true);
    await page.reload(); await page.locator('#continue').click(); await page.locator('#lobby-board').click();
    await expect(page.locator(`#quest-claim-${ready.id}`)).toHaveCount(0);
    expect((await saved()).bank.gold).toBe(500 + ready.reward.gold!);
    await page.locator('[data-lobby=close]').click();
  }
  await page.locator('#lobby-tab-hire').click();
  if (milestone < 2) {
    await expect(page.locator('.lobby-locked')).toContainText('แผนที่ 2');
    await expect(page.locator('#hire-0')).toHaveCount(0);
    await page.locator('[data-lobby=close]').click();
    await page.locator('#lobby-tab-hunt').click();
    await expect(page.locator('.lobby-locked')).toContainText('แผนที่ 2');
    await expect(page.locator('#hunt-target')).toHaveCount(0);
  } else {
    const gold = (await saved()).bank.gold;
    await expect(page.locator('.lobby-locked')).toHaveCount(0);
    await page.locator('#hire-0').click();
    expect((await saved()).bank.gold).toBe(gold - map.company.hireCost);
    expect((await saved()).taken).toContain(0);
    await page.screenshot({ path: 'docs/validation/system-unlock-pacing/hiring-map2-390.png' });
    await page.locator('#hire-tab-market').click(); await page.locator('#buy-repel').click();
    expect((await saved()).shop.repel).toBe(1);
    expect((await saved()).bank.gold).toBe(gold - map.company.hireCost - map.shop.items.repel.price);
    await page.locator('[data-lobby=close]').click();
    await page.locator('#lobby-tab-hunt').click();
    await page.locator('#hunt-target').selectOption('guardian'); await page.locator('#hunt-apply').click();
    expect((await saved()).hunt?.target).toBe('guardian');
    await expect(page.locator('#boss-target')).toHaveCount(0);
    await page.screenshot({ path: 'docs/validation/system-unlock-pacing/hunt-map2-390.png' });
    await page.reload(); await page.locator('#continue').click(); await page.locator('#lobby-tab-hunt').click();
    await expect(page.locator('#hunt-target')).toHaveValue('guardian');
  }
  expect((await saved()).veteran).toBeUndefined(); expect((await saved()).cleared).toEqual(p.cleared);
});
