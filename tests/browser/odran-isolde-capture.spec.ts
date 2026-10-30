import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame, saveGame } from '../../src/core/save/expedition-save';

test.skip(process.env.OI_CAPTURE !== '1', 'owner-review capture only');
const out = process.env.OI_OUT ?? 'test-results/odran-isolde';
const cases = [{ hero: 'thiran', skill: 'saintstrike' }, { hero: 'thiran', skill: 'communion' }, { hero: 'wila', skill: 'attack' }, { hero: 'metta', skill: 'attack' }, { hero: 'lalin', skill: 'attack' }];
for (const { hero, skill } of cases) test(`odran-isolde ${hero}-${skill}`, async ({ browser }) => {
  test.setTimeout(90000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  try {
    const page = await ctx.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`tests/browser/fixtures/odran-isolde.html?hero=${hero}&skill=${skill}`);
    const start = page.locator('#start'); await start.waitFor({ state: 'attached' }).catch(() => undefined);
    if (await start.isVisible()) await start.click();
    await page.locator(`#action-${skill}`).waitFor();
    await page.evaluate(() => document.fonts.ready.then(() => undefined)); await page.waitForTimeout(1200);
    const dir = `${out}/${hero}-${skill}`; mkdirSync(`${dir}/frames`, { recursive: true });
    await page.locator(`#action-${skill}`).click(); await page.waitForTimeout(250);
    await page.screenshot({ path: `${dir}/still-targeting.png` });
    const cdp = await ctx.newCDPSession(page), stamps: string[] = [];
    cdp.on('Page.screencastFrame', f => { const n = String(stamps.length).padStart(4, '0'); writeFileSync(`${dir}/frames/${n}.jpg`, Buffer.from(f.data, 'base64')); stamps.push(`${n} ${f.metadata.timestamp}`); void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 }); await page.waitForTimeout(250);
    await page.locator(`#target-${await page.evaluate(() => window.oiQA.target())}`).click();
    await page.waitForTimeout(500); await page.screenshot({ path: `${dir}/still-mid.png` });
    await expect(page.locator('#skip-turn')).toBeHidden({ timeout: 12000 }); await page.waitForTimeout(300);
    await cdp.send('Page.stopScreencast');
    writeFileSync(`${dir}/stamps.txt`, stamps.join('\n'));
    expect(stamps.length).toBeGreaterThan(12);
    expect(errors).toEqual([]);
  } finally { await ctx.close(); }
});

// Character pages (portrait + class sheet) of the redesigned pair in the real camp UI.
for (const id of ['thiran', 'wila']) test(`odran-isolde character page ${id}`, async ({ browser }) => {
  test.setTimeout(60000);
  const p = newProfile(map, 193); p.tutorialDone = true; p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  for (const m of ['metta', 'thiran', 'lalin', 'wila']) { p.company.push(m); p.members[m] = { stars: 1, dupes: 0, level: 10, exp: 0 }; }
  p.party = { deployed: ['thiran', 'metta', 'wila', 'lalin'], reserve: [] };
  let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, { profile: p, run: null }); parseGame(raw, map, lookup);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  try {
    const page = await ctx.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(({ raw }) => { if (!sessionStorage.getItem('oi')) { localStorage.setItem('asterveil.fateweave.expedition.v1', raw); sessionStorage.setItem('oi', '1'); } }, { raw });
    await page.goto('./'); await page.locator('#continue').click();
    await page.locator('#lobby-tab-team').click(); await page.waitForTimeout(600);
    mkdirSync(`${out}/pages`, { recursive: true });
    await page.screenshot({ path: `${out}/pages/team.png` });
    await page.locator(`#lobby-member-${id}`).click(); await page.locator('#lobby-character-open').click(); await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/pages/character-${id}.png` });
    expect(errors).toEqual([]);
  } finally { await ctx.close(); }
});
