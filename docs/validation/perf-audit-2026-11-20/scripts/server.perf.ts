// Perf audit 2026-11-20 — server play walking with the real Worker/Durable Object code in this process (as
// tests/browser/server-play.spec.ts) plus an added network delay per request (PERF_RTT ms, default 150 and 300).
// The real dev API was not reachable from the audit container; the delay stands in for the round trip.
import { test, type Route } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentVersion } from '../../../../scripts/content-version.mjs';
import { handle } from '../../../../src/server/api';
import { server } from '../../../../tests/fixtures/server-fakes';
import { chapterOne as map } from '../../../../src/content/world/chapter1';
import { encounterById as lookup } from '../../../../src/content/encounters/catalog';
import { newProfile, depart } from '../../../../src/core/world/profile';
import { tileAt } from '../../../../src/core/world/world';

const OUT = process.env.PERF_OUT ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'results');
const CPU = Number(process.env.PERF_CPU ?? 4);
mkdirSync(OUT, { recursive: true });
const API = 'https://api.test';
const KEY = 'asterveil.fateweave.expedition.v1';
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

for (const rtt of (process.env.PERF_RTT ?? '150,300').split(',').map(Number)) test(`server walk rtt ${rtt}`, async ({ browser }) => {
  const context = await browser.newContext(mobile);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const s = server(undefined, contentVersion());
  s.deps.allowedOrigins = [new URL(test.info().project.use.baseURL!).origin];
  const calls: { path: string; ms: number }[] = [];
  await page.route(`${API}/**`, async (route: Route) => {
    const t = Date.now(); const req = route.request(); const body = req.postData() ?? undefined;
    s.clock.t += 1000;
    const r = await handle(new Request(req.url(), { method: req.method(), headers: await req.allHeaders(), ...(body !== undefined && req.method() !== 'GET' ? { body } : {}) }), s.deps);
    const buf = Buffer.from(await r.arrayBuffer());
    await new Promise(res => setTimeout(res, rtt));
    calls.push({ path: new URL(req.url()).pathname, ms: Date.now() - t });
    await route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: buf });
  });
  const p = newProfile(map, 17); p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } as never; p.tutorialDone = true;
  const game = depart(p, map, lookup, 77); game.run.tutorialDone = true; game.run.repel = 10;
  const start = game.run.position;
  const dirs = [['ArrowRight', 1, 0, 'ArrowLeft'], ['ArrowLeft', -1, 0, 'ArrowRight'], ['ArrowUp', 0, -1, 'ArrowDown'], ['ArrowDown', 0, 1, 'ArrowUp']] as const;
  const [go, , , back] = dirs.find(([, dx, dy]) => tileAt(map, { x: start.x + dx, y: start.y + dy })?.kind === 'floor')!;
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k!)) localStorage.setItem(k!, v!); }, [KEY, JSON.stringify({ version: 44, ...game })]);
  await page.goto(`./?server=${encodeURIComponent(API)}`);
  await page.locator('#import-save').click({ timeout: 60000 });
  await page.locator('#continue').click({ timeout: 60000 });
  await page.locator('#world-view').waitFor({ state: 'visible' });
  await page.waitForTimeout(2000);
  const arm = () => page.evaluate(() => {
    const w = window as unknown as { __steps: { input: number; token?: number }[] };
    w.__steps = [];
    addEventListener('keydown', e => { if (e.key.startsWith('Arrow')) w.__steps.push({ input: e.timeStamp }); }, { capture: true });
    new MutationObserver(() => { const s = w.__steps.findLast(x => x.token === undefined); if (s) s.token = performance.now(); })
      .observe(document.querySelector('#party-token')!, { attributes: true, attributeFilter: ['style'] });
  });
  const read = () => page.evaluate(() => (window as unknown as { __steps: { input: number; token?: number }[] }).__steps);
  const pos = () => page.evaluate(() => { const t = document.querySelector<HTMLElement>('#party-token')!; return `${t.style.getPropertyValue('--x')},${t.style.getPropertyValue('--y')}`; });
  const result: Record<string, unknown> = { rtt, cpu: CPU };
  for (const [name, gap] of [['steady-600ms', 600], ['taps-200ms', 200], ['burst-60ms', 60]] as const) {
    await arm(); const c0 = calls.length; let moves = 0, last = await pos();
    for (let i = 0; i < 8; i++) { await page.keyboard.press(i % 2 ? back : go); await page.waitForTimeout(gap); const now = await pos(); if (now !== last) moves++; last = now; }
    await page.waitForTimeout(rtt * 3 + 1500);
    const steps = await read();
    const cmd = calls.slice(c0).filter(c => c.path === '/v1/command');
    result[name] = { pressed: steps.length, tokenChanges: steps.filter(x => x.token !== undefined).length, commandsSent: cmd.length,
      firstTokenMs: steps.filter(x => x.token !== undefined).map(x => Math.round(x.token! - x.input)), commandMs: cmd.map(c => c.ms) };
  }
  result.waitingUi = await page.evaluate(() => document.querySelector('#app')?.getAttribute('data-server') ?? document.body.dataset.server ?? null);
  writeFileSync(join(OUT, `server-walk-rtt${rtt}-cpu${CPU}.json`), JSON.stringify(result, null, 1));
  console.log(JSON.stringify(result));
  await context.close();
});
