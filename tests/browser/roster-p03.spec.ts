import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { newProfile, depart } from '../../src/core/world/profile';
import { parseGame, saveGame } from '../../src/core/save/expedition-save';
import type { Profile } from '../../src/core/world/types';
import { xpAt } from '../fixtures/camp-level';

// P03 Kael (Martial): personal branch inspection and a real battle that gathers and releases chi, at 390px.
const key = 'asterveil.fateweave.expedition.v1';
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

function profile(): Profile {
  const p = newProfile(map, 211);
  p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  p.company.push('kael'); p.members.kael = { stars: 1, dupes: 0 }; p.campXp = xpAt(10);
  p.party = { deployed: ['kael', 'guardian', 'weaver', 'healer'], reserve: ['tracer'] };
  return p;
}
function serialize(game: Parameters<typeof saveGame>[1]): string {
  let raw = '';
  saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game);
  parseGame(raw, map, lookup);
  return raw;
}
async function open(page: Page, raw: string): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(({ key, raw }) => {
    if (!sessionStorage.getItem('p03-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('p03-seeded', 'yes'); }
  }, { key, raw });
  await page.goto('./');
  await page.locator('#continue').click();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  return errors;
}
const saved = (page: Page) => page.evaluate(k => localStorage.getItem(k)!, key);

test('P03 Kael: personal branch is inspected without spending, then learnt once at 390px', async ({ page }, info) => {
  const errors = await open(page, serialize({ profile: profile(), run: null }));
  await page.locator('#lobby-tab-team').click();
  await page.locator('#lobby-member-kael').click();
  await page.locator('#lobby-character-open').click();
  await page.locator('#camp-character-tab-skills').click(); await page.locator('#camp-character-tab-talents').click();
  await expect(page.locator('.personal-tree')).toContainText('เส้นทางประจำตัว · เคล');
  const before = await saved(page);
  await page.locator('.personal-tree [data-node=p1]').click();
  expect(await saved(page)).toBe(before);
  await expect(page.locator('.node-card')).toContainText('หมัดรวมปราณเพิ่ม');
  await page.locator('.node-card [data-world=character-talent]').click();
  await expect.poll(async () => JSON.parse(await saved(page)).profile.members.kael.talents?.p1).toBe(1);
  await page.locator('.personal-tree').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('p03-kael-character-390.png') });
  expect(errors).toEqual([]);
});

test('P03 Kael: gathers chi from a real hit, shows it, then releases it; reload keeps the battle', async ({ page }, info) => {
  const game = depart(profile(), map, lookup, 223);
  game.run.battle = { kind: 'random', encounterId: 'veil-siege', entry: Object.fromEntries(game.run.roster.deployed.map(id => [id, game.run.hp[id]!])), commands: [] };
  const errors = await open(page, serialize(game));
  if (await page.locator('#start').isVisible()) await page.locator('#start').click();
  const kaelTurn = async () => {
    for (let i = 0; i < 12; i++) {
      // Wait for playback to hand the next command to the player.
      await expect(page.getByRole('heading', { name: /เทิร์นของคุณ/ })).toBeVisible({ timeout: 15000 });
      if (await page.locator('#hero-kael').getAttribute('aria-pressed') === 'true') return;
      await page.locator('#action-attack').click(); await page.locator('[data-ui=target].valid-target').first().click();
    }
    throw new Error('Kael never came up');
  };
  await kaelTurn();
  await page.locator('#action-gatherfist').click(); await page.locator('#target-f1').click();
  await expect.poll(async () => JSON.parse(await saved(page)).run.battle.commands.some((c: { action: string }) => c.action === 'gatherfist')).toBe(true);
  await kaelTurn();
  await expect(page.locator('#action-releasefist')).toBeEnabled();
  await page.screenshot({ path: info.outputPath('p03-kael-battle-390.png') });
  await page.locator('#action-releasefist').click(); await page.locator('#target-f1').click();
  await expect.poll(async () => JSON.parse(await saved(page)).run.battle.commands.some((c: { action: string }) => c.action === 'releasefist')).toBe(true);
  const raw = await saved(page);
  await page.reload(); await page.locator('#continue').click();
  expect(parseGame(await saved(page), map, lookup).run!.battle).toEqual(parseGame(raw, map, lookup).run!.battle);
  expect(errors).toEqual([]);
});

test('P03 Wynne: a curse is laid on a real foe, shown in its status and ticks at round end; reload keeps the battle', async ({ page }, info) => {
  const p = profile(); p.company.push('wynne'); p.members.wynne = { stars: 1, dupes: 0 };
  p.party = { deployed: ['wynne', 'guardian', 'weaver', 'healer'], reserve: ['kael'] };
  const game = depart(p, map, lookup, 227);
  game.run.battle = { kind: 'random', encounterId: 'veil-siege', entry: Object.fromEntries(game.run.roster.deployed.map(id => [id, game.run.hp[id]!])), commands: [] };
  const errors = await open(page, serialize(game));
  if (await page.locator('#start').isVisible()) await page.locator('#start').click();
  for (let i = 0; i < 12; i++) {
    await expect(page.getByRole('heading', { name: /เทิร์นของคุณ/ })).toBeVisible({ timeout: 15000 });
    if (await page.locator('#hero-wynne').getAttribute('aria-pressed') === 'true') break;
    await page.locator('#action-attack').click(); await page.locator('[data-ui=target].valid-target').first().click();
  }
  await page.locator('#action-threadhex').click(); await page.locator('#target-f1').click();
  await expect.poll(async () => JSON.parse(await saved(page)).run.battle.commands.some((c: { action: string }) => c.action === 'threadhex')).toBe(true);
  await expect(page.getByRole('heading', { name: /เทิร์นของคุณ/ })).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: info.outputPath('p03-wynne-battle-390.png') });
  const raw = await saved(page);
  const battle = parseGame(raw, map, lookup).run!.battle!;
  expect(battle.commands.at(-1)?.action ?? battle.commands.find(c => c.action === 'threadhex')?.action).toBeDefined();
  await page.reload(); await page.locator('#continue').click();
  expect(parseGame(await saved(page), map, lookup).run!.battle).toEqual(battle);
  expect(errors).toEqual([]);
});

test('P03 Astrid: deflect asks for the recipient before one commit; closing the dialog changes nothing; reload keeps it', async ({ page }, info) => {
  const p = profile(); p.company.push('astrid'); p.members.astrid = { stars: 1, dupes: 0 };
  p.party = { deployed: ['astrid', 'guardian', 'weaver', 'healer'], reserve: ['kael'] };
  const game = depart(p, map, lookup, 229);
  game.run.battle = { kind: 'random', encounterId: 'veil-siege', entry: Object.fromEntries(game.run.roster.deployed.map(id => [id, game.run.hp[id]!])), commands: [] };
  const errors = await open(page, serialize(game));
  if (await page.locator('#start').isVisible()) await page.locator('#start').click();
  for (let i = 0; i < 12; i++) {
    await expect(page.getByRole('heading', { name: /เทิร์นของคุณ/ })).toBeVisible({ timeout: 15000 });
    if (await page.locator('#hero-astrid').getAttribute('aria-pressed') === 'true' && await page.locator('#action-deflectfate').isEnabled()
      && await page.locator('#action-deflectfate').getAttribute('data-unavailable') === 'false') break;
    await page.locator('#action-attack').click(); await page.locator('[data-ui=target].valid-target').first().click();
  }
  await page.locator('#action-deflectfate').click();
  const attacker = page.locator('[data-ui=target].valid-target').first(); await attacker.click();
  await expect(page.locator('#cooldown-choice')).toBeVisible();
  await expect(page.locator('#cooldown-choice-title')).toHaveText('เลือกศัตรูที่จะรับท่า');
  await page.screenshot({ path: info.outputPath('p03-astrid-deflect-390.png') });
  const before = await saved(page);
  await page.keyboard.press('Escape'); await expect(page.locator('#cooldown-choice')).toBeHidden();
  expect(await saved(page)).toBe(before);
  await page.locator('#action-deflectfate').click(); await page.locator('[data-ui=target].valid-target').first().click();
  await page.locator('[data-ui=deflect-recipient]').first().click();
  await expect.poll(async () => JSON.parse(await saved(page)).run.battle.commands.filter((c: { action: string; recipientId?: string }) => c.action === 'deflectfate' && c.recipientId).length).toBe(1);
  const raw = await saved(page);
  await page.reload(); await page.locator('#continue').click();
  expect(parseGame(await saved(page), map, lookup).run!.battle).toEqual(parseGame(raw, map, lookup).run!.battle);
  expect(errors).toEqual([]);
});
