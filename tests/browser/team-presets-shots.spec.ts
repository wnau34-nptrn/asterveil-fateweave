import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
import type { Profile } from '../../src/core/world/types';
import { currentSave } from '../fixtures/current-save';
import { xpAt } from '../fixtures/camp-level';

// Team page evidence (owner 2026-11-06, team presets): the camp team sheet and the separate map team dialog at the owner's
// three sizes. Evidence only. Run with TEAM_SHOTS=<dir> npx playwright test tests/browser/team-presets-shots.spec.ts
const dir = process.env.TEAM_SHOTS;
const key = 'asterveil.fateweave.expedition.v1';
const sizes = [[390, 844], [390, 650], [320, 568]] as const;

function profile(): Profile {
  const p = newProfile(map, 17);
  p.tutorialDone = true; p.veteran = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier']; p.campXp = xpAt(10);
  for (const id of ['guardian', 'tracer', 'weaver', 'healer', 'kael', 'wynne', 'astrid', 'metta', 'lalin', 'garran', 'lio']) if (!p.company.includes(id)) p.company.push(id);
  for (const id of p.company) p.members[id] ??= { stars: 1, dupes: 0 };
  p.party = { deployed: ['guardian', 'tracer', 'weaver', 'healer', 'kael'], reserve: ['wynne', 'astrid', 'metta'] };
  const withPresets = p as Profile & { presets?: unknown };
  if (process.env.TEAM_SHOTS_PRESETS) withPresets.presets = [
    { name: 'บุกบอส', deployed: ['guardian', 'tracer', 'weaver', 'healer', 'kael'], reserve: ['wynne', 'astrid', 'metta'], lanes: {} },
    { name: 'สายรับ', deployed: ['garran', 'guardian', 'healer', 'metta', 'lalin'], reserve: ['tracer', 'weaver'], lanes: {} },
  ];
  return p;
}

for (const [w, h] of sizes) test(`team page ${w}x${h}`, async ({ browser }) => {
  test.skip(!dir, 'set TEAM_SHOTS to a folder');
  const out = `${dir}/${w}x${h}`; mkdirSync(out, { recursive: true });
  const p = profile(); const raw = currentSave({ profile: p, run: null } as never); parseGame(raw, map, encounterById);
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('tps')) { localStorage.setItem(key, raw); sessionStorage.setItem('tps', '1'); } }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click(); await expect(page.locator('#lobby-depart')).toBeVisible();
  const shot = async (name: string) => { await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${name}.png` }); };
  await page.locator('#lobby-tab-team').click(); await shot('camp-team-top');
  await page.locator('.team-grid.bench').scrollIntoViewIfNeeded(); await shot('camp-team-roster');
  if (process.env.TEAM_SHOTS_PRESETS) {
    await page.locator('#lobby-member-lio').click(); await page.locator('.quick-moves').scrollIntoViewIfNeeded(); await shot('camp-team-picked');
    await page.locator('#lobby-member-lio').click();
    await page.locator('#team-preset-1').click(); await page.locator('#lobby-sheet-title').scrollIntoViewIfNeeded(); await shot('camp-team-preset-applied');
    await page.locator('#team-preset-manage summary').click(); await shot('camp-team-preset-manage');
    await page.locator('#team-preset-0').click();
  }
  await page.locator('[data-lobby=close]').click(); await page.locator('#lobby-depart').click(); await expect(page.locator('#world-view')).toBeVisible();
  await page.keyboard.press('t');
  await shot('map-team');
  expect(errors).toEqual([]); await context.close();
});
