import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { newProfile, depart } from '../../src/core/world/profile';
import { replay, resolveCommand } from '../../src/core/battle/engine';
import { battleData } from '../../src/core/world/world';
import { parseGame, saveGame } from '../../src/core/save/expedition-save';
import type { Profile } from '../../src/core/world/types';
import { xpAt } from '../fixtures/camp-level';

const key = 'asterveil.fateweave.expedition.v1';
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

function profile(): Profile {
  const p = newProfile(map, 193);
  p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  for (const id of ['metta', 'thiran', 'lalin', 'wila']) {
    p.company.push(id);
    p.members[id] = { stars: 1, dupes: 0}; p.campXp = Math.max(p.campXp, xpAt(10));
  }
  p.members.weaver = { stars: 1, dupes: 0}; p.campXp = Math.max(p.campXp, xpAt(10));
  p.members.lalin!.talents = { p1: 1, p2: 1 };
  p.party = { deployed: ['weaver', 'lalin', 'metta', 'thiran'], reserve: ['guardian', 'tracer', 'healer', 'wila'] };
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
    if (!sessionStorage.getItem('c12-seeded')) {
      localStorage.setItem(key, raw); sessionStorage.setItem('c12-seeded', 'yes');
    }
  }, { key, raw });
  await page.goto('./');
  await expect(page).toHaveTitle(/Asterveil/);
  await page.locator('#continue').click();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  return errors;
}
const saved = (page: Page) => page.evaluate(k => localStorage.getItem(k)!, key);

test('C12: personal branch inspection spends only on the explicit learn action at 390px', async ({ page }, info) => {
  const errors = await open(page, serialize({ profile: profile(), run: null }));
  await page.locator('#lobby-tab-team').click();
  await page.locator('#lobby-member-metta').click();
  await page.locator('#lobby-character-open').click();
  await page.locator('#camp-character-tab-talents').click();
  await expect(page.locator('.personal-tree')).toContainText('เส้นทางประจำตัว · คอริน');
  const before = await saved(page);
  await page.locator('.personal-tree [data-node=p1]').click();
  expect(await saved(page)).toBe(before);
  await expect(page.locator('.node-card')).toContainText('แบ่งแรงใจแปลงเพิ่ม');
  await page.locator('.node-card [data-world=character-talent]').click();
  await expect.poll(async () => JSON.parse(await saved(page)).profile.members.metta.talents.p1).toBe(1);
  await page.locator('.personal-tree').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('c12-character-390.png') });
  await page.locator('#camp-character-tab-skills').click();
  await expect(page.locator('[data-skill=communion]')).toContainText('เลือด');
  expect(errors).toEqual([]);
});

test('C12: Duet selects a cooling skill once, cancellation preserves the save and Saint heals from damage', async ({ page }, info) => {
  const game = depart(profile(), map, lookup, 197);
  game.run.hp.thiran = Math.floor(game.run.hp.thiran! / 2);
  game.run.battle = { kind: 'random', encounterId: 'veil-siege', entry: Object.fromEntries(game.run.roster.deployed.map(id => [id, game.run.hp[id]!])), commands: [] };
  const errors = await open(page, serialize(game));
  if (await page.locator('#start').isVisible()) await page.locator('#start').click();
  await expect(page.locator('#hero-weaver')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#action-bolt').click();
  await page.locator('#target-f1').click();
  await expect(page.locator('#hero-lalin')).toHaveAttribute('aria-pressed', 'true');
  const before = await saved(page);
  await page.locator('#action-duet').click();
  await expect(page.locator('#action-duet .skill-value')).toHaveText('คืนคูลดาวน์');
  await page.locator('#target-weaver').click();
  await expect(page.locator('#cooldown-choice')).toBeVisible();
  expect(await saved(page)).toBe(before);
  await page.locator('[data-ui=cooldown-cancel]').click();
  expect(await saved(page)).toBe(before);
  await page.locator('#target-weaver').click();
  await page.locator('[data-ui=cooldown-action][data-value=bolt]').click();
  await expect.poll(async () => JSON.parse(await saved(page)).run.battle.commands.length).toBe(2);
  const command = JSON.parse(await saved(page)).run.battle.commands[1];
  expect(command).toMatchObject({ heroId: 'lalin', action: 'duet', targetId: 'weaver', cooldownAction: 'bolt' });
  await expect(page.locator('#hero-metta')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#action-saintstrike').click();
  await page.locator('#skill-details').click();
  await expect(page.locator('#skill-copy')).toContainText('ดาเมจที่ศัตรูเสียจริง');
  await page.locator('[data-ui=skill-close]').click();
  await page.locator('#target-f1:not([disabled]), #target-b1:not([disabled])').first().click();
  await expect.poll(async () => JSON.parse(await saved(page)).run.battle.commands.length).toBe(3);
  const raw = await saved(page), parsed = parseGame(raw, map, lookup);
  const battle = parsed.run!.battle!, data = battleData(parsed.run!, map, lookup)!;
  expect(battle.commands[2]!.action).toBe('saintstrike');
  const beforeSaint = replay(data, battle.commands.slice(0, 2), { hp: battle.entry });
  const saintTurn = resolveCommand(beforeSaint, data, battle.commands[2]!).turns[0]!;
  expect(saintTurn.events.some(e => e.type === 'heal' && e.sourceId === 'metta' && (e.amount ?? 0) > 0)).toBe(true);
  await expect(page.locator('#hero-thiran')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: info.outputPath('c12-battle-390.png') });
  await page.reload(); await page.locator('#continue').click();
  expect(await saved(page)).toBe(raw);
  expect(errors).toEqual([]);
});
