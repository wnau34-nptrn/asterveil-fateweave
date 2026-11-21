// Image-blank audit 2026-11-21: for each screen change, which on-screen images are still missing when the screen
// appears, and how long until every visible image is there. Chromium 390x844 DPR 3 emulation, 4G + CPU 4x.
// Run: PERF_OUT=<dir> npx playwright test -c playwright.perf.config.ts blank.perf.ts   (BLANK_WARM=1: second visit, SW on)
import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chapterOne as map } from '../../../../src/content/world/chapter1';
import { encounterById as lookup } from '../../../../src/content/encounters/catalog';
import { newProfile, depart } from '../../../../src/core/world/profile';

const KEY = 'asterveil.fateweave.expedition.v1';
const OUT = process.env.PERF_OUT ?? 'blank-out';
const WARM = process.env.BLANK_WARM === '1';
mkdirSync(OUT, { recursive: true });
const FOUR_G = { offline: false, latency: 150, downloadThroughput: 9_000_000 / 8, uploadThroughput: 1_500_000 / 8 };

// Visible images not yet loaded: <img> not complete, or CSS background url() with no finished resource entry.
async function pending(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const done = new Set(performance.getEntriesByType('resource').map(r => r.name));
    const out = new Set<string>(); const vw = innerWidth, vh = innerHeight;
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (!el.checkVisibility?.({ visibilityProperty: true } as CheckVisibilityOptions)) continue;
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) continue;
      if (el instanceof HTMLImageElement) { if (!el.complete || !el.naturalWidth) out.add(el.currentSrc || el.src); continue; }
      for (const pseudo of [null, '::before', '::after']) {
        const bg = getComputedStyle(el, pseudo).backgroundImage; if (!bg || bg === 'none') continue;
        for (const m of bg.matchAll(/url\("?([^")]+)"?\)/g)) { const u = new URL(m[1]!, location.href).href; if (!u.startsWith('data:') && !done.has(u)) out.add(u); }
      }
    }
    return [...out].map(u => u.replace(/^.*\/assets\//, '').replace(/\?.*$/, ''));
  });
}
// Poll after a screen change: time until no visible image is missing (cap 20 s), the worst set, and a filmstrip.
async function watch(page: Page, name: string, t0: number) {
  const seen = new Map<string, number>(); let clearAt: number | undefined; let first: string[] = [];
  const shots: number[] = [150, 1000, 3000];
  for (let i = 0; Date.now() - t0 < 20000; i++) {
    const p = await pending(page); const now = Date.now() - t0;
    if (i === 0) first = p;
    for (const u of p) seen.set(u, now);
    if (shots.length && now >= shots[0]!) { await page.screenshot({ path: join(OUT, `${name}-${shots[0]}ms.png`) }); shots.shift(); }
    if (!p.length && !shots.length) { clearAt ??= now; break; }
    if (!p.length) clearAt ??= now; else clearAt = undefined;
    await page.waitForTimeout(100);
  }
  return { name, missingAtStart: first, lastSeenMissingMs: Object.fromEntries([...seen].sort((a, b) => b[1] - a[1])), allVisibleMs: clearAt ?? -1 };
}

test('blank images per screen change', async ({ browser }) => {
  test.setTimeout(600000);
  const p = newProfile(map, 17); p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } as never; p.tutorialDone = true;
  const camp = JSON.stringify({ version: 44, profile: p, run: null });
  const game = depart(p, map, lookup, 77); game.run.tutorialDone = true; game.run.repel = 10;
  const battle = structuredClone(game); battle.run.battle = { kind: 'random', encounterId: 'thicket-ambush', entry: { ...battle.run.hp }, commands: [] };
  const results: unknown[] = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => performance.setResourceTimingBufferSize(2000));
  const q = WARM ? '?sw=1' : '';
  if (WARM) { // first visit fills the caches (title, camp, map, a battle), then the measured visit starts fresh
    const w = await ctx.newPage(); await w.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify({ version: 44, ...battle })]);
    await w.goto(`./${q}`); await w.locator('#continue').click(); await w.waitForTimeout(8000); await w.close();
  }
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', FOUR_G); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const seed = async (raw: string) => page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [KEY, raw]);
  // 1. Title (cold page load).
  let t0 = Date.now(); await page.goto(`./${q}`, { waitUntil: 'commit' });
  await page.locator('#title-view').waitFor({ timeout: 60000 }); results.push(await watch(page, '1-title', t0));
  // 2. Title → camp.
  await seed(camp); await page.reload({ waitUntil: 'commit' }); await page.locator('#continue').waitFor({ timeout: 60000 });
  t0 = Date.now(); await page.locator('#continue').click(); await page.locator('#lobby-view').waitFor(); results.push(await watch(page, '2-camp', t0));
  // 3. Camp sheets.
  for (const tab of ['characters', 'team', 'hire', 'gear', 'forge', 'brew']) {
    const b = page.locator(`#lobby-tab-${tab}`); if (!(await b.isVisible().catch(() => false)) || await b.isDisabled()) continue;
    t0 = Date.now(); await b.click(); await page.waitForTimeout(50); results.push(await watch(page, `3-sheet-${tab}`, t0));
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  }
  // 4. Camp → map (depart).
  await seed(JSON.stringify({ version: 44, ...game })); await page.reload({ waitUntil: 'commit' }); await page.locator('#continue').waitFor({ timeout: 60000 });
  t0 = Date.now(); await page.locator('#continue').click(); await page.locator('#world-view').waitFor(); results.push(await watch(page, '4-map', t0));
  // 5. Into a battle (saved mid-battle): Start readiness + visible images.
  await seed(JSON.stringify({ version: 44, ...battle })); await page.reload({ waitUntil: 'commit' }); await page.locator('#continue').waitFor({ timeout: 60000 });
  t0 = Date.now(); await page.locator('#continue').click(); await page.locator('#battle-view:not(.view-off)').waitFor({ timeout: 60000 });
  const b = await watch(page, '5-battle', t0);
  await page.waitForFunction(() => { const s = document.querySelector<HTMLButtonElement>('#start'); return !s || !s.disabled; }, undefined, { timeout: 60000 }).catch(() => undefined);
  results.push({ ...b, startEnabledMs: Date.now() - t0 });
  writeFileSync(join(OUT, `blank-${WARM ? 'warm' : 'cold'}.json`), JSON.stringify(results, null, 1));
  for (const r of results as { name: string; allVisibleMs: number; missingAtStart: string[]; startEnabledMs?: number }[]) console.log(JSON.stringify({ name: r.name, allVisibleMs: r.allVisibleMs, startEnabledMs: r.startEnabledMs, missingAtStart: r.missingAtStart }));
  await ctx.close();
});
