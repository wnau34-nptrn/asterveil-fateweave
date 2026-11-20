// Perf audit 2026-11-20 — measurement only (no game code changes). Run from this folder:
//   npx playwright test -c playwright.perf.config.ts            (local `vite preview` of a Pages-base build)
//   PERF_URL=https://wnau34-nptrn.github.io/asterveil-fateweave/ npx playwright test -c playwright.perf.config.ts -g load
// Env: PERF_CPU (CPU throttle, default 4), PERF_NET=4g|off (default 4g for load), PERF_OUT (results dir), PERF_PROFILE=1 (CPU profiles).
// Chromium emulation only (390x844, isMobile, touch, DPR 3) — not a real iPhone/Android.
import { test, type Page, type CDPSession, type BrowserContext } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chapterOne as map } from '../../../../src/content/world/chapter1';
import { encounterById as lookup } from '../../../../src/content/encounters/catalog';
import { newProfile, depart } from '../../../../src/core/world/profile';
import { tileAt } from '../../../../src/core/world/world';

const KEY = 'asterveil.fateweave.expedition.v1';
const OUT = process.env.PERF_OUT ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'results');
const CPU = Number(process.env.PERF_CPU ?? 4);
const NET = process.env.PERF_NET ?? '4g';
const PROFILE = process.env.PERF_PROFILE === '1';
mkdirSync(OUT, { recursive: true });
const tag = (name: string) => `${name}-cpu${CPU}-${NET}${process.env.PERF_URL ? '-pages' : ''}`;
const save = (name: string, data: unknown) => writeFileSync(join(OUT, `${tag(name)}.json`), JSON.stringify(data, null, 1));

const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36' };
// DevTools "Fast 4G"-like: 9 Mbps down, 1.5 Mbps up, 150 ms RTT.
const FOUR_G = { offline: false, latency: 150, downloadThroughput: 9_000_000 / 8, uploadThroughput: 1_500_000 / 8 };

function commander() { return { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; }
function profile(stars = 5) {
  const p = newProfile(map, 17); p.commander = commander() as never; p.tutorialDone = true;
  for (const m of Object.values(p.members)) m.stars = stars;
  return p;
}
function runSave(opts: { battle?: boolean; repel?: number } = {}) {
  const game = depart(profile(), map, lookup, 77); const run = game.run; run.tutorialDone = true;
  run.repel = opts.repel ?? 0;
  if (opts.battle) run.battle = { kind: 'random', encounterId: 'thicket-ambush', entry: { ...run.hp }, commands: [] };
  return { raw: JSON.stringify({ version: 44, ...game }), start: { ...run.position } };
}
function campSave() { return JSON.stringify({ version: 44, profile: profile(), run: null }); }
// A two-tile shuttle next to the start: the first direction that leads onto a floor tile, and back.
function shuttle(start: { x: number; y: number }): ['ArrowRight' | 'ArrowLeft' | 'ArrowUp' | 'ArrowDown', 'ArrowRight' | 'ArrowLeft' | 'ArrowUp' | 'ArrowDown'] {
  const dirs = [['ArrowRight', 1, 0, 'ArrowLeft'], ['ArrowLeft', -1, 0, 'ArrowRight'], ['ArrowUp', 0, -1, 'ArrowDown'], ['ArrowDown', 0, 1, 'ArrowUp']] as const;
  for (const [k, dx, dy, back] of dirs) { const t = tileAt(map, { x: start.x + dx, y: start.y + dy }); if (t && t.kind === 'floor') return [k, back]; }
  throw new Error('no floor next to start');
}

async function newPage(context: BrowserContext, seedRaw?: string): Promise<{ page: Page; cdp: CDPSession }> {
  const page = await context.newPage();
  if (seedRaw) await page.addInitScript(({ k, raw }) => { if (!sessionStorage.getItem('perf-seed')) { localStorage.setItem(k, raw); sessionStorage.setItem('perf-seed', '1'); } }, { k: KEY, raw: seedRaw });
  await page.addInitScript(() => {
    const w = window as unknown as { __long: { start: number; dur: number; name: string }[] };
    w.__long = [];
    const ww = window as unknown as { __readyAt?: number; __lcp?: number; __fr?: boolean };
    Object.defineProperty(window, '__fateweaveReady', { configurable: true, get: () => ww.__fr, set: v => { ww.__fr = v; ww.__readyAt ??= Math.round(performance.now()); } });
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) ww.__lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch { /* none */ }
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) w.__long.push({ start: Math.round(e.startTime), dur: Math.round(e.duration), name: e.name }); }).observe({ type: 'longtask', buffered: true }); } catch { /* no longtask */ }
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  return { page, cdp };
}
async function net(cdp: CDPSession, on: boolean) {
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', on ? FOUR_G : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
}
async function metrics(cdp: CDPSession) {
  const { metrics: m } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(m.filter(x => ['JSHeapUsedSize', 'Nodes', 'JSEventListeners', 'LayoutDuration', 'RecalcStyleDuration', 'ScriptDuration', 'TaskDuration', 'Documents', 'Frames', 'LayoutCount', 'RecalcStyleCount'].includes(x.name)).map(x => [x.name, Math.round(x.value * 1000) / 1000]));
}
async function heapAfterGc(cdp: CDPSession) { await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage'); return (await metrics(cdp)).JSHeapUsedSize; }
async function longTasks(page: Page, since = 0) { return page.evaluate(s => (window as unknown as { __long: { start: number; dur: number }[] }).__long.filter(l => l.start >= s), since); }
// Self time per function from a CDP CPU profile (top 25), with url:line of the function start.
async function startProfile(cdp: CDPSession) { if (!PROFILE) return; await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
async function stopProfile(cdp: CDPSession, name: string) {
  if (!PROFILE) return undefined;
  const { profile: prof } = await cdp.send('Profiler.stop') as { profile: { nodes: { id: number; callFrame: { functionName: string; url: string; lineNumber: number }; children?: number[] }[]; samples: number[]; timeDeltas: number[] } };
  writeFileSync(join(OUT, `${tag(name)}.cpuprofile`), JSON.stringify(prof));
  const self = new Map<number, number>();
  prof.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (prof.timeDeltas[i] ?? 0)));
  const byFn = new Map<string, number>(); const parent = new Map<number, number>();
  for (const n of prof.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const nodes = new Map(prof.nodes.map(n => [n.id, n]));
  const label = (n: { callFrame: { functionName: string; url: string; lineNumber: number } }) => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.replace(/^.*?\/(src|node_modules|assets)\//, '$1/').replace(/\?.*$/, '')}:${n.callFrame.lineNumber + 1}`;
  for (const n of prof.nodes) byFn.set(label(n), (byFn.get(label(n)) ?? 0) + (self.get(n.id) ?? 0) / 1000);
  // Inclusive time per src/ function (sum of samples whose stack contains it once).
  const incl = new Map<string, number>();
  prof.samples.forEach((id, i) => {
    const seen = new Set<string>(); let cur: number | undefined = id;
    while (cur !== undefined) { const n = nodes.get(cur)!; const l = label(n); if (/src\//.test(l) && !seen.has(l)) { seen.add(l); incl.set(l, (incl.get(l) ?? 0) + (prof.timeDeltas[i] ?? 0) / 1000); } cur = parent.get(cur); }
  });
  const top = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => [k, Math.round(v * 10) / 10]);
  return { self: top(byFn), inclusiveSrc: top(incl) };
}
// rAF frame intervals for `ms` milliseconds (page clock).
async function frames(page: Page, ms: number) {
  return page.evaluate(ms => new Promise<{ n: number; fps: number; p50: number; p95: number; worst: number; over50: number; over100: number }>(res => {
    const d: number[] = []; let last = 0; const end = performance.now() + ms;
    const tick = (t: number) => { if (last) d.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); else {
      const s = [...d].sort((a, b) => a - b), q = (p: number) => Math.round((s[Math.floor(p * (s.length - 1))] ?? 0) * 10) / 10, total = d.reduce((a, b) => a + b, 0);
      res({ n: d.length, fps: Math.round(d.length / total * 10000) / 10, p50: q(.5), p95: q(.95), worst: Math.round(s.at(-1) ?? 0), over50: d.filter(x => x > 50).length, over100: d.filter(x => x > 100).length });
    } };
    requestAnimationFrame(tick);
  }), ms);
}
const stat = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b), q = (p: number) => Math.round((s[Math.floor(p * (s.length - 1))] ?? 0) * 10) / 10; return { n: xs.length, p50: q(.5), p95: q(.95), max: Math.round(s.at(-1) ?? 0), mean: Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length) * 10) / 10 }; };

// In-page step latency: keydown (capture) → the party token's style changes → the next animation frame.
async function armStepProbe(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __steps: { input: number; token?: number; frame?: number; handler?: number }[] };
    w.__steps = [];
    const token = document.querySelector('#party-token')!;
    addEventListener('keydown', e => { if (e.key.startsWith('Arrow')) w.__steps.push({ input: e.timeStamp }); }, { capture: true });
    addEventListener('keydown', e => { if (e.key.startsWith('Arrow')) { const s = w.__steps.at(-1); if (s) s.handler = performance.now(); } });
    new MutationObserver(() => { const s = w.__steps.findLast(x => x.token === undefined); if (!s) return; s.token = performance.now(); requestAnimationFrame(() => requestAnimationFrame(t => { s.frame = t; })); })
      .observe(token, { attributes: true, attributeFilter: ['style'] });
  });
}
async function stepResults(page: Page) {
  const s = await page.evaluate(() => (window as unknown as { __steps: { input: number; token?: number; frame?: number; handler?: number }[] }).__steps);
  const done = s.filter(x => x.frame !== undefined);
  return { pressed: s.length, moved: done.length, handlerMs: stat(s.filter(x => x.handler).map(x => x.handler! - x.input)), tokenMs: stat(done.map(x => x.token! - x.input)), frameMs: stat(done.map(x => x.frame! - x.input)) };
}

// ---------- 1. Load ----------
test('load: title, camp and map first use (cold cache)', async ({ browser }) => {
  const out: Record<string, unknown> = {};
  for (const scenario of ['title', 'camp', 'map'] as const) {
    const context = await browser.newContext(mobile);
    const seed = scenario === 'camp' ? campSave() : scenario === 'map' ? runSave({ repel: 10 }).raw : undefined;
    const { page, cdp } = await newPage(context, seed);
    await net(cdp, NET === '4g');
    const reqs: { url: string; type: string; bytes: number; ms: number; status: number; cache?: string }[] = [];
    const started = new Map<string, { url: string; type: string; t: number; status?: number; cache?: string }>();
    cdp.on('Network.requestWillBeSent', e => started.set(e.requestId, { url: e.request.url, type: e.type ?? '', t: e.timestamp }));
    cdp.on('Network.responseReceived', e => { const s = started.get(e.requestId); if (s) { s.status = e.response.status; s.cache = e.response.headers['cache-control'] ?? e.response.headers['Cache-Control']; } });
    cdp.on('Network.loadingFinished', e => { const s = started.get(e.requestId); if (s) reqs.push({ url: s.url.replace(/^.*?asterveil-fateweave\//, ''), type: s.type, bytes: e.encodedDataLength, ms: Math.round((e.timestamp - s.t) * 1000), status: s.status ?? 0, cache: s.cache }); });
    const t0 = Date.now();
    await page.goto('./', { waitUntil: 'commit' });
    await page.waitForFunction(() => (window as unknown as { __fateweaveReady?: boolean }).__fateweaveReady, undefined, { timeout: 120000 });
    const ready = Date.now() - t0;
    await page.locator('#title-view button.primary').first().waitFor({ state: 'visible', timeout: 120000 });
    const titleButtons = Date.now() - t0;
    await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => undefined);
    const titleIdle = Date.now() - t0;
    const nav = await page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming; const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const end = (re: RegExp) => Math.round(Math.max(0, ...res.filter(r => re.test(r.name)).map(r => r.responseEnd)));
      const w = window as unknown as { __readyAt?: number; __lcp?: number };
      return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: Math.round(fcp?.startTime ?? 0), lcp: w.__lcp, gameReady: w.__readyAt,
        jsEnd: end(/\.js$/), cssEnd: end(/\.css$/), titleBgEnd: end(/title_bg/), skillIconsEnd: end(/skill_icons/), battlePreloadEnd: end(/assets\/(fx|art)\/[a-z_]+(_fx|units[a-z_0-9]*)\.(webp|json)/), musicEnd: end(/music/) };
    });
    const r: Record<string, unknown> = { readyMs: ready, titleButtonsMs: titleButtons, titleNetworkIdleMs: titleIdle, nav };
    if (scenario !== 'title') {
      const before = reqs.length; const t1 = Date.now();
      await page.locator('#continue').click();
      const target = scenario === 'camp' ? '#lobby-view' : '#world-view';
      await page.locator(target).waitFor({ state: 'visible', timeout: 120000 });
      const shown = Date.now() - t1;
      await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => undefined);
      await page.waitForTimeout(1500);
      // Images on screen that have not finished decoding/loading yet (data: and CSS backgrounds counted by requests).
      r.afterContinue = { shownMs: shown, idleMs: Date.now() - t1, requests: reqs.length - before, bytes: reqs.slice(before).reduce((a, b) => a + b.bytes, 0) };
    }
    r.long = await longTasks(page);
    r.metrics = await metrics(cdp);
    r.requests = reqs.length; r.bytes = reqs.reduce((a, b) => a + b.bytes, 0);
    const byType: Record<string, { n: number; bytes: number }> = {};
    for (const q of reqs) { const k = q.type; byType[k] ??= { n: 0, bytes: 0 }; byType[k].n++; byType[k].bytes += q.bytes; }
    r.byType = byType;
    r.slowest = [...reqs].sort((a, b) => b.ms - a.ms).slice(0, 12);
    r.largest = [...reqs].sort((a, b) => b.bytes - a.bytes).slice(0, 15);
    r.cacheHeaders = [...new Set(reqs.map(q => `${q.type}:${q.cache ?? '-'}`))];
    out[scenario] = r; save('load', out); console.log('load', scenario, r.readyMs, r.afterContinue);
    await context.close();
  }
  save('load', out);
});

// ---------- 2. Map walking (local play) ----------
test('walk: step latency at a steady pace and in bursts (local play)', async ({ browser }) => {
  const context = await browser.newContext(mobile);
  const seed = runSave({ repel: 10 });
  let { page, cdp } = await newPage(context, seed.raw);
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#world-view').waitFor({ state: 'visible' });
  await page.waitForTimeout(2000);
  const [go, back] = shuttle(seed.start);
  await armStepProbe(page);
  const m0 = await metrics(cdp); const l0 = await page.evaluate(() => performance.now());
  await startProfile(cdp);
  for (let i = 0; i < 10; i++) { await page.keyboard.press(i % 2 ? back : go); await page.waitForTimeout(350); }
  const prof = await stopProfile(cdp, 'walk-steady');
  const steady = await stepResults(page); const m1 = await metrics(cdp); const long1 = await longTasks(page, l0);
  // Burst: ten presses 60 ms apart (a held key / fast taps), on a fresh page with a fresh repel.
  await page.close();
  ({ page } = await newPage(context, seed.raw));
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#world-view').waitFor({ state: 'visible' }); await page.waitForTimeout(2000);
  await armStepProbe(page);
  for (let i = 0; i < 10; i++) { await page.keyboard.press(i % 2 ? back : go); await page.waitForTimeout(60); }
  await page.waitForTimeout(1500);
  const burst = await stepResults(page);
  // Tap on the hint tile (touch path).
  const saves = await page.evaluate(k => (localStorage.getItem(k) ?? '').length, KEY);
  save('walk', { steady, burst, saveBytes: saves, metricsDelta: Object.fromEntries(Object.keys(m1).map(k => [k, Math.round(((m1[k] ?? 0) - (m0[k] ?? 0)) * 1000) / 1000])), long: long1, profile: prof });
  await context.close();
});

// ---------- 3. Battle ----------
async function playBattle(page: Page, maxMs = 180000) {
  const t0 = Date.now();
  const fr: number[] = [];
  const start = page.locator('#start');
  const readyT0 = Date.now();
  await page.locator('#battle-view:not(.view-off)').waitFor({ timeout: 60000 }).catch(() => undefined);
  if (await start.count()) await page.waitForFunction(() => { const b = document.querySelector<HTMLButtonElement>('#start'); return !b || !b.disabled; }, undefined, { timeout: 60000 });
  const fieldReady = Date.now() - readyT0;
  if (await start.isVisible().catch(() => false)) await start.click();
  await page.evaluate(() => { const w = window as unknown as { __bf: number[]; __bfOn: boolean }; w.__bf = []; w.__bfOn = true; let last = 0; const tick = (t: number) => { if (last) w.__bf.push(t - last); last = t; if (w.__bfOn) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  let turns = 0; const clickMs: number[] = [];
  while (Date.now() - t0 < maxMs) {
    if (await page.locator('#leave-battle').isVisible().catch(() => false)) break;
    const attack = page.locator('#action-attack');
    if (await attack.isEnabled().catch(() => false)) {
      const c0 = Date.now(); await attack.click({ timeout: 2000 }).catch(() => undefined);
      const target = page.locator('[id^="target-f"]:enabled, [id^="target-b"]:enabled').first();
      if (await target.count()) { await target.click({ timeout: 2000 }).catch(() => undefined); turns++; clickMs.push(Date.now() - c0); }
    } else {
      const skip = page.locator('#skip-turn'); if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 1000 }).catch(() => undefined);
      await page.waitForTimeout(100);
    }
  }
  const f = await page.evaluate(() => { const w = window as unknown as { __bf: number[]; __bfOn: boolean }; w.__bfOn = false; return w.__bf; });
  fr.push(...f);
  const won = await page.locator('#leave-battle').isVisible().catch(() => false);
  return { fieldReadyMs: fieldReady, turns, won, battleMs: Date.now() - t0, commandClickMs: stat(clickMs), frames: { ...stat(fr), fps: Math.round(fr.length / (fr.reduce((a, b) => a + b, 0) / 1000) * 10) / 10, over50: fr.filter(x => x > 50).length, over100: fr.filter(x => x > 100).length } };
}
async function textureReport(page: Page) {
  // The ?perf=1 probe's own report (decoded RGBA of every Phaser texture).
  return page.evaluate(async () => { const b = [...document.querySelectorAll<HTMLButtonElement>('.perf-probe button')].find(x => x.textContent?.includes('คัดลอก')); b?.click(); await new Promise(r => setTimeout(r, 300)); try { const r = JSON.parse(await navigator.clipboard.readText()); return r.memory; } catch { return undefined; } });
}

test('battle + memory: several fights in a row on one page', async ({ browser }) => {
  const context = await browser.newContext({ ...mobile, permissions: ['clipboard-read', 'clipboard-write'] });
  const seed = runSave({ battle: true });
  const { page, cdp } = await newPage(context, seed.raw);
  await page.goto('./?perf=1'); await page.locator('#continue').click();
  const fights: unknown[] = [];
  const heap0 = await heapAfterGc(cdp); const m0 = await metrics(cdp);
  await startProfile(cdp);
  for (let n = 0; n < Number(process.env.PERF_FIGHTS ?? 6); n++) {
    const l0 = await page.evaluate(() => performance.now());
    const b = await playBattle(page);
    const idleFrames = await frames(page, 3000); // victory screen idle
    const long = await longTasks(page, l0);
    if (n === 0) { const prof = await stopProfile(cdp, 'battle-first'); fights.push({ profile: prof }); }
    // Back to the map, then walk until the next random fight.
    if (b.won) {
      await page.locator('#leave-battle').click();
      for (let k = 0; k < 6; k++) { const btn = page.locator('.battle-rewards button, dialog[open] button').first(); if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => undefined); else break; await page.waitForTimeout(300); }
    }
    await page.locator('#world-view').waitFor({ state: 'visible', timeout: 30000 }).catch(() => undefined);
    const heap = await heapAfterGc(cdp); const m = await metrics(cdp); const tex = await textureReport(page);
    fights.push({ n, ...b, victoryIdle: idleFrames, longTasks: { count: long.length, total: long.reduce((a, x) => a + x.dur, 0), worst: Math.max(0, ...long.map(x => x.dur)) }, heapMiB: Math.round(heap / 1048576 * 10) / 10, nodes: m.Nodes, listeners: m.JSEventListeners, textures: tex });
    if (n === Number(process.env.PERF_FIGHTS ?? 6) - 1) break;
    const [go, back] = ['ArrowRight', 'ArrowLeft'] as const;
    let stepped = 0;
    while (stepped < 200 && !(await page.locator('#battle-view:not(.view-off)').isVisible().catch(() => false))) {
      const dialog = page.locator('dialog[open] button').first(); if (await dialog.isVisible().catch(() => false)) { await page.keyboard.press('Escape'); }
      await page.keyboard.press(stepped % 2 ? back : go); stepped++; await page.waitForTimeout(250);
      if (stepped % 4 === 0) { await page.keyboard.press('ArrowUp'); await page.waitForTimeout(250); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(250); }
    }
  }
  save('battles', { heap0MiB: Math.round(heap0 / 1048576 * 10) / 10, nodes0: m0.Nodes, listeners0: m0.JSEventListeners, fights });
  await context.close();
});

// ---------- 4. Camp ----------
test('camp: open every bottom tab, frame time while idle', async ({ browser }) => {
  const context = await browser.newContext(mobile);
  const { page, cdp } = await newPage(context, campSave());
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#lobby-view').waitFor({ state: 'visible' });
  await page.waitForTimeout(2500);
  const idle = await frames(page, 4000);
  const heavy = await page.evaluate(() => {
    let backdrop = 0, filter = 0, anim = 0, imgs = 0, bigImg: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('#lobby-view *')) {
      if (!el.checkVisibility?.()) continue;
      const s = getComputedStyle(el);
      if ((s.backdropFilter && s.backdropFilter !== 'none') || (s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none')) backdrop++;
      if (s.filter && s.filter !== 'none') filter++;
      if (s.animationName && s.animationName !== 'none' && s.animationPlayState === 'running') anim++;
    }
    for (const i of document.querySelectorAll('img')) { imgs++; if (i.naturalWidth * i.naturalHeight > 1_000_000) bigImg.push(`${i.currentSrc.split('/').pop()} ${i.naturalWidth}x${i.naturalHeight}`); }
    return { backdrop, filter, anim, imgs, bigImg, nodes: document.querySelectorAll('*').length };
  });
  const tabs = await page.locator('.lobby-menu button').evaluateAll(b => b.map(x => x.id).filter(Boolean));
  const opens: { tab: string; clickToFrameMs: number; long: number }[] = [];
  await startProfile(cdp);
  for (const id of tabs) {
    const l0 = await page.evaluate(() => performance.now());
    const ms = await page.evaluate(id => new Promise<number>(res => { const t = performance.now(); document.getElementById(id)!.click(); requestAnimationFrame(() => requestAnimationFrame(f => res(f - t))); }), id);
    await page.waitForTimeout(600);
    const long = await longTasks(page, l0);
    opens.push({ tab: id, clickToFrameMs: Math.round(ms), long: long.reduce((a, x) => a + x.dur, 0) });
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  }
  const prof = await stopProfile(cdp, 'camp-tabs');
  save('camp', { idle, heavy, opens, metrics: await metrics(cdp), profile: prof });
  await context.close();
});

// ---------- 5. Trace of five steps (style/layout attribution) ----------
test('walk-trace: Chromium timeline of five local steps', async ({ browser }) => {
  const context = await browser.newContext(mobile);
  const seed = runSave({ repel: 10 });
  const { page, cdp } = await newPage(context, seed.raw);
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#world-view').waitFor({ state: 'visible' });
  await page.waitForTimeout(2500);
  const [go, back] = shuttle(seed.start);
  const file = join(OUT, `${tag('walk-trace')}.trace.json`);
  await startProfile(cdp);
  await browser.startTracing(page, { path: file, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.invalidationTracking', 'blink.user_timing', 'v8.execute'] });
  for (let i = 0; i < 5; i++) { await page.keyboard.press(i % 2 ? back : go); await page.waitForTimeout(500); }
  await browser.stopTracing();
  const prof = await stopProfile(cdp, 'walk-trace');
  const trace = JSON.parse((await import('node:fs')).readFileSync(file, 'utf8')) as { traceEvents: { name: string; ph: string; dur?: number; args?: { elementCount?: number; data?: Record<string, unknown>; beginData?: Record<string, unknown> } }[] };
  const sum: Record<string, { n: number; ms: number }> = {}; const recalc: number[] = []; const reasons: Record<string, number> = {};
  for (const e of trace.traceEvents) {
    if (e.ph === 'X' && e.dur) { sum[e.name] ??= { n: 0, ms: 0 }; sum[e.name].n++; sum[e.name].ms += e.dur / 1000; }
    if (e.name === 'UpdateLayoutTree' && e.args?.elementCount) recalc.push(e.args.elementCount);
    if (e.name === 'StyleRecalcInvalidationTracking' || e.name === 'StyleInvalidatorInvalidationTracking' || e.name === 'ScheduleStyleInvalidationTracking') {
      const d = e.args?.data as { reason?: string; nodeName?: string; changedAttribute?: string; changedClass?: string; changedId?: string } | undefined;
      const k = `${e.name.replace('InvalidationTracking', '')}:${d?.reason ?? ''}:${d?.nodeName ?? ''}${d?.changedClass ? '.' + d.changedClass : ''}${d?.changedAttribute ? '[' + d.changedAttribute + ']' : ''}`;
      reasons[k] = (reasons[k] ?? 0) + 1;
    }
  }
  const top = Object.entries(sum).sort((a, b) => b[1].ms - a[1].ms).slice(0, 25).map(([k, v]) => [k, v.n, Math.round(v.ms)]);
  save('walk-trace', { top, recalcElements: recalc, reasons: Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 40), profile: prof });
  await context.close();
});
