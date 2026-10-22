import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { createBattle, currentHeroId, pendingPhase, resolveCommand, targetOptions } from '../../src/core/battle/engine';
import { battleData, newExpedition } from '../../src/core/world/world';
import { newProfile } from '../../src/core/world/profile';

// Review screenshots of the 8-actor battle field for the owner (not a gameplay check).
// Run with BATTLE_SHOTS=<dir> npx playwright test tests/browser/battle-shots.spec.ts
const dir = process.env.BATTLE_SHOTS;
const key = 'asterveil.fateweave.expedition.v1';
for (const id of ['slime-nest', 'rift-warden', 'veil-siege']) {
  test(`battle shot ${id} 390x844`, async ({ browser }) => {
    test.skip(!dir, 'set BATTLE_SHOTS to a folder');
    const data = encounterById(id)!;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 }), page = await context.newPage();
    const hp = Object.fromEntries(data.heroes.map(h => [h.id, h.maxHp]));
    const s = createBattle(data, { hp });
    const run = newExpedition(map, encounterById, 1234); run.tutorialDone = true;
    run.battle = { kind: id === 'rift-warden' ? 'boss' : 'random', encounterId: data.id, entry: hp, commands: s.commands };
    const profile = { ...newProfile(map, 5), tutorialDone: true, commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } };
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: JSON.stringify({ version: 21, profile, run }) });
    await page.goto('./'); await page.locator('#continue').click();
    const start = page.locator('[data-ui=start]'); if (await start.isVisible().catch(() => false)) await start.click();
    await expect(page.locator('#action-attack')).toBeEnabled(); await page.waitForTimeout(400);
    await page.screenshot({ path: `${dir}/battle-${id}-390.png` });
    if (process.env.RECTS) console.log(JSON.stringify(await page.evaluate(() => Object.fromEntries(["#turn-phase", ".arena", "#intent", "#party", ".command-dock", ".masthead", "#selected-hero", "#commands", ".actions", ".target-hint", ".action-help", ".decision-panel", "#commands .step-heading", "#help-home", "footer"].map(s => { const r = document.querySelector(s)?.getBoundingClientRect(); return [s, r && [r.x, r.y, r.width, r.height].map(Math.round)]; })))));
    await context.close();
  });
}

// The boss phase banner: attack until the warden's next turn is its phase change, then show that turn.
test('battle shot boss phase 390x844', async ({ browser }) => {
  test.skip(!dir, 'set BATTLE_SHOTS to a folder');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }), page = await context.newPage();
  const run = newExpedition(map, encounterById, 1234); run.tutorialDone = true;
  const base = encounterById('rift-warden')!, hp = Object.fromEntries(base.heroes.map(h => [h.id, h.maxHp]));
  run.battle = { kind: 'boss', encounterId: 'rift-warden', entry: hp, commands: [] };
  const data = battleData(run, map, encounterById)!;
  let s = createBattle(data, { hp: Object.fromEntries(data.heroes.map(h => [h.id, h.maxHp])) });
  run.battle.entry = Object.fromEntries(data.heroes.map(h => [h.id, h.maxHp]));
  for (let i = 0; i < 40 && !pendingPhase(s, data, 'f1'); i++) {
    const heroId = currentHeroId(s, data)!; const t = targetOptions(s, data, heroId, 'attack').find(o => o.valid)!;
    s = resolveCommand(s, data, { beat: s.beat, heroId, action: 'attack', targetId: t.id }).state;
  }
  run.battle.commands = s.commands;
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } };
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: JSON.stringify({ version: 21, profile, run }) });
  await page.goto('./'); await page.locator('#continue').click();
  await expect(page.locator('#action-attack')).toBeEnabled(); await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/battle-boss-pending-390.png` });
  // Heroes act until the warden's phase turn is presented (its banner shows while the stage plays).
  for (let i = 0; i < 4 && !await page.locator('#field-banner').isVisible(); i++) {
    await expect(page.locator('#action-attack')).toBeEnabled({ timeout: 15000 });
    await page.locator('#action-attack').click(); await page.locator('.field-target.valid-target').first().click();
    await page.locator('#field-banner').waitFor({ state: 'visible', timeout: 4000 }).catch(() => undefined);
  }
  await expect(page.locator('#field-banner')).toBeVisible(); await page.waitForTimeout(150);
  await page.screenshot({ path: `${dir}/battle-boss-phase-390.png` });
  await context.close();
});
