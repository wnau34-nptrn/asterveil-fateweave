// Owner review captures for Map 5 at 390px (skipped unless CLIPS=1). Screens go to test-results; the battle is recorded
// as video while the advised commands are played through the real battle UI.
import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { encounterById } from '../../src/content/encounters/catalog';
import { mineMap, mineSites } from '../../src/content/world/chapter-mine';
import { MAPS } from '../../src/content/world/maps';
import { currentHeroId, resolveCommand, targetKind, targetOptions } from '../../src/core/battle/engine';
import type { Command } from '../../src/core/battle/types';
import { depart, newProfile } from '../../src/core/world/profile';
import { battleData, battleState, capXp, reveal } from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';
import { currentSave } from '../fixtures/current-save';
import { captured, hooks, setCapture, simulateCampaign } from '../sim/balance-sim';
import type { Profile } from '../../src/core/world/types';

const ids = ['guardian', 'tracer', 'weaver', 'healer', 'lio'];
const key = 'asterveil.fateweave.expedition.v1';
test.skip(process.env.CLIPS !== '1', 'owner review captures only');
test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });

function expedition() {
  const profile = { ...newProfile(MAPS[0]!, 19, ids), tutorialDone: true, campXp: capXp(mineMap, 4),
    commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }, cleared: MAPS.slice(0, 4).map(m => m.id) };
  return depart(profile, mineMap, encounterById, 11);
}
async function launch(page: Page, raw: string): Promise<void> {
  // Fixtures move the party by hand; reveal what it can see from there, as a real step would.
  const game = JSON.parse(raw) as { run?: Parameters<typeof reveal>[0] | null };
  if (game.run && !game.run.battle) { reveal(game.run, mineMap); raw = JSON.stringify(game); }
  await page.addInitScript(({ key, raw }) => {
    if (!sessionStorage.getItem('mine-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('mine-seeded', '1'); }
  }, { key, raw });
  await page.goto('./?server=off');
  await page.locator('#continue').click({ timeout: 15_000 });
}
const steps = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.steps as number, key);

test('world: darkness, lanterns, portable light, seal and puzzles', async ({ page }, info) => {
  const game = expedition();
  const lantern = mineSites.lanterns[2]!;
  game.run.position = { x: lantern.x - 1, y: lantern.y };
  game.run.repel = mineMap.potions.repelSteps;
  await launch(page, currentSave(game));
  await expect(page.locator('#world-view')).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: info.outputPath('01-dark.png') });
  await page.locator('#move-right').click(); await expect.poll(() => steps(page)).toBe(1);
  await page.locator('#rest').click();
  await expect(page.locator('#tide-chip')).toContainText('ตะเกียง 1/5');
  await page.waitForTimeout(900);
  await page.screenshot({ path: info.outputPath('02-lantern.png') });
  await page.locator('#objective-button').click();
  await expect(page.locator('#world-goals-content')).toContainText('ผนึกโพรงผลึก');
  await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath('03-seal-goals.png') });
});

test('world: portable light runs out while walking', async ({ page }, info) => {
  const game = expedition();
  const crystal = mineSites.glowCrystals[0]!;
  game.run.position = crystal;
  game.run.repel = mineMap.potions.repelSteps;
  await launch(page, currentSave(game));
  await expect(page.locator('#world-view')).toBeVisible();
  await page.locator('#rest').click();
  await expect(page.locator('#tide-chip')).toContainText('แสงพกพา 12 ก้าว');
  await page.waitForTimeout(700);
  await page.screenshot({ path: info.outputPath('04-portable-12.png') });
  const route = ['up', 'up', 'up', 'left', 'left', 'left', 'left', 'left', 'left', 'right', 'right', 'right', 'right'];
  for (let i = 0; i < route.length; i++) {
    const before = await steps(page);
    await page.locator(`#move-${route[i]}`).click();
    await expect.poll(() => steps(page)).toBeGreaterThan(before);
    await page.waitForTimeout(350);
    if (await page.locator('#battle-view').isVisible()) break;
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: info.outputPath('05-portable-out.png') });
});

test('world: cart opens the cracked wall', async ({ page }, info) => {
  const game = expedition();
  game.run.position = mineMap.mine!.cart.start;
  game.run.repel = mineMap.potions.repelSteps;
  game.run.mine = { cart: ['main', 'main', 'main'], beam: ['up', 'up', 'up'], rescue: { following: [], rescued: [] }, stories: [] };
  await launch(page, currentSave(game));
  await expect(page.locator('#world-view')).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: info.outputPath('06-cart-before.png') });
  await page.locator('#rest').click();
  await expect(page.locator('[data-door="mine-cart"]')).toHaveClass(/open/);
  await page.waitForTimeout(900);
  await page.screenshot({ path: info.outputPath('07-cart-open.png') });
});

// CDP screencast frames with their timestamps; scripts stitch them into a clip at real speed.
async function screencast(page: Page, dir: string): Promise<() => Promise<void>> {
  mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page); let n = 0; const times: number[] = [];
  cdp.on('Page.screencastFrame', frame => {
    writeFileSync(`${dir}/${String(n++).padStart(5, '0')}.jpg`, Buffer.from(frame.data, 'base64')); times.push(frame.metadata.timestamp ?? 0);
    void cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => undefined);
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
  return async () => { await cdp.send('Page.stopScreencast'); writeFileSync(`${dir}/times.json`, JSON.stringify(times)); };
}

test('battle: the Crystal Giant with five heroes, played by the advice', async ({ page }, info) => {
  test.setTimeout(600_000);
  // A real campaign party at the giant's door (advisor rush, Lio + Brann, seed 1001), as the balance sample sees it.
  let profile: Profile | undefined; hooks.depart = (p, mapId) => { if (mapId === mineMap.id && !profile) profile = structuredClone(p); };
  setCapture(true); simulateCampaign(1001, 'rush', 'advisor', 0, 0, 16, ['lio', 'brann'], MAPS); delete hooks.depart;
  const entry = captured.find(c => c.mapId === mineMap.id && c.label === 'boss')!.state; setCapture(false);
  const game = { profile: profile!, run: entry };
  // The advised line, with any choice that needs a second pick replaced by a plain attack.
  const data = battleData(game.run, mineMap, encounterById)!; let bs = battleState(game.run, mineMap, encounterById)!;
  const plan: Command[] = [];
  while (bs.outcome === 'active' && plan.length < 80) {
    const l = battleLesson(bs, data); const hero = currentHeroId(bs, data)!;
    const c: Command = l && !l.recipientId && !l.cooldownAction ? { beat: bs.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }
      : { beat: bs.beat, heroId: hero, action: 'attack', targetId: targetOptions(bs, data, hero, 'attack').find(o => o.valid)!.id };
    plan.push(c); bs = resolveCommand(bs, data, c).state;
  }
  console.log('PLAN', bs.outcome, bs.round, plan.length);
  await launch(page, currentSave(game));
  await expect(page.locator('#battle-view')).toBeVisible();
  const stop = await screencast(page, info.outputPath('frames'));
  await page.waitForTimeout(1200);
  await page.locator('#start').click();
  await page.waitForTimeout(800);
  for (let i = 0; i < plan.length; i++) {
    const c = plan[i]!;
    await expect(page.locator(`#hero-${c.heroId}`)).toHaveAttribute('aria-pressed', 'true', { timeout: 30_000 });
    await expect(page.locator(`#action-${c.action}`)).toBeEnabled({ timeout: 30_000 });
    await page.locator(`#action-${c.action}`).click();
    const kind = targetKind(c.action);
    // Area moves accept a tap on any member of the side they hit.
    const button = kind === 'enemies' ? page.locator('[id^="target-enemies-"]').first()
      : kind === 'party' ? page.locator('#target-party, [id^="target-party-"]').first() : page.locator(`#target-${c.targetId}`);
    await button.click({ timeout: 30_000 });
    await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.battle?.commands.length ?? -1, key), { timeout: 30_000 })
      .not.toBe(i);
  }
  await page.waitForTimeout(4000);
  await stop();
});
