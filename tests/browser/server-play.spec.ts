import { expect, test, type Page, type Route } from '@playwright/test';
import { contentVersion } from '../../scripts/content-version.mjs';
import { SESSION_HEADER } from '../../src/server/account-object';
import { CONTENT_HEADER, handle } from '../../src/server/api';
import { battleTurns, server, storedGame, type Server } from '../fixtures/server-fakes';

// P09-02c server play in a real browser: the page talks to `https://api.test`, which Playwright routes to the real Worker
// and Durable Object code running in this process (SQLite in memory). Local play stays the default (other specs).
const API = 'https://api.test';
const SAVE_KEY = 'asterveil.fateweave.expedition.v1';

interface Wire { s: Server; commands: string[]; holdNext: number; dropNext: number }
async function serve(page: Page): Promise<Wire> {
  const s = server(undefined, contentVersion());
  s.deps.allowedOrigins = [new URL(test.info().project.use.baseURL ?? 'http://127.0.0.1:5173/').origin];
  const w: Wire = { s, commands: [], holdNext: 0, dropNext: 0 };
  await page.route(`${API}/**`, async (route: Route) => {
    const req = route.request();
    const body = req.postData() ?? undefined;
    s.clock.t += 1000;
    const response = await handle(new Request(req.url(), { method: req.method(), headers: await req.allHeaders(), ...(body !== undefined && req.method() !== 'GET' ? { body } : {}) }), s.deps);
    if (new URL(req.url()).pathname === '/v1/command') {
      w.commands.push(body ?? '');
      if (w.holdNext > 0) { const ms = w.holdNext; w.holdNext = 0; await new Promise(r => setTimeout(r, ms)); }
      // The server ran it; the answer never arrives.
      if (w.dropNext > 0) { w.dropNext--; await route.abort('connectionreset'); return; }
    }
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
  });
  return w;
}
// Another device entering the same account (D12): the token is the page's, the session is new.
async function otherDeviceEnters(page: Page, w: Wire): Promise<void> {
  const token = await page.evaluate(k => localStorage.getItem(k), `fateweave-server-token:${API}`);
  const r = await handle(new Request(`${API}/v1/session`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, [CONTENT_HEADER]: contentVersion(), [SESSION_HEADER]: 'f'.repeat(32) } }), w.s.deps);
  expect(r.status).toBe(200);
}

test('server play: a guest account plays through the dev API with retries, input lock, the one-device lock and resume', async ({ page }, info) => {
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR_CONNECTION_RESET|Failed to load resource/.test(m.text())) issues.push(m.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  const w = await serve(page);
  await page.goto(`./?server=${encodeURIComponent(API)}`);
  await expect(page.locator('.title-server')).toBeVisible();
  await expect(page.locator('#continue')).toHaveCount(0);

  // Another device takes the account before the first command: the page says so and enters again on request.
  await page.locator('#new-game').click(); await page.locator('#commander-name').fill('เซิร์ฟ');
  await otherDeviceEnters(page, w);
  await page.locator('#commander-create').click();
  await expect(page.locator('.server-card h2')).toHaveText('กำลังเล่นบนอุปกรณ์อื่น');
  await page.screenshot({ path: info.outputPath('server-other-device-390.png') });
  await page.locator('[data-server="act"]').click();
  await expect(page.locator('.server-card')).toHaveCount(0);

  // The answer to createCommander is slow, then lost: input stays locked and the same request is sent again.
  await page.locator('#new-game').click(); await page.locator('#commander-name').fill('เซิร์ฟ');
  w.holdNext = 900; w.dropNext = 1; const before = w.commands.length;
  await page.locator('#commander-create').click();
  await expect(page.locator('#app')).toHaveAttribute('data-server', 'waiting');
  expect(await page.locator('#commander-view').evaluate(el => (el as HTMLElement).inert)).toBe(true);
  await expect(page.locator('.server-note')).toBeVisible();
  await page.screenshot({ path: info.outputPath('server-waiting-390.png') });
  await expect(page.locator('#story-view')).toBeVisible();
  await expect(page.locator('#app')).not.toHaveAttribute('data-server', 'waiting');
  const sent = w.commands.slice(before).map(b => JSON.parse(b) as { requestId: string; seq: number; command: { kind: string } });
  expect(sent.map(x => x.command.kind)).toEqual(['createCommander', 'createCommander', 'depart']);
  expect(sent[1]!.requestId).toBe(sent[0]!.requestId);
  expect(sent[2]!.seq).toBe(sent[0]!.seq + 1);

  // The prologue battle comes from the server's state; nothing is saved locally and no seed reached the page.
  await page.locator('[data-story=skip]').click();
  await expect(page.locator('#encounter-title')).toContainText('กองหน้าของวาร์กอธ');
  expect(await page.evaluate(k => localStorage.getItem(k), SAVE_KEY)).toBeNull();
  const state = await (await handle(new Request(`${API}/v1/verify`, { method: 'POST', headers: { Authorization: `Bearer ${await page.evaluate(k => localStorage.getItem(k), `fateweave-server-token:${API}`)}`, [CONTENT_HEADER]: contentVersion() } }), w.s.deps)).json();
  expect(state).toEqual({ ok: true, seq: 2 });

  // Reloading enters again and resumes where the server says the company is.
  await page.reload();
  await expect(page.locator('#continue')).toBeVisible();
  await page.locator('#continue').click();
  await expect(page.locator('#encounter-title')).toContainText('กองหน้าของวาร์กอธ');
  expect(issues).toEqual([]);
});

// A company already on the map: guest → commander → depart → prologue won → starter picks, all through the API.
async function onTheMap(w: Wire): Promise<string> {
  const version = contentVersion(); const session = 'e'.repeat(32);
  const guest = await (await handle(new Request(`${API}/v1/guest`, { method: 'POST' }), w.s.deps)).json() as { accountId: string; token: string };
  const headers = { Authorization: `Bearer ${guest.token}`, [CONTENT_HEADER]: version, [SESSION_HEADER]: session, 'Content-Type': 'application/json' };
  let seq = 0;
  const send = async (command: unknown) => {
    w.s.clock.t += 1000;
    const r = await handle(new Request(`${API}/v1/command`, { method: 'POST', headers, body: JSON.stringify({ requestId: `setup-request-${String(++seq).padStart(6, '0')}`, seq, command }) }), w.s.deps);
    expect(r.status).toBe(200);
  };
  await send({ kind: 'createCommander', commander: { name: 'เดิน', crest: 'star', color: 'gold', camp: 'ค่ายเดิน' }, replace: false });
  await send({ kind: 'depart', hard: false });
  await send({ kind: 'battle', commands: battleTurns(storedGame(w.s, guest.accountId)!) });
  for (let i = 0; i < 6 && storedGame(w.s, guest.accountId)!.run?.draft; i++) await send({ kind: 'draftPick', index: 0 });
  expect(storedGame(w.s, guest.accountId)!.run?.battle).toBeFalsy();
  return guest.token;
}

test('server play: a step moves the token before the answer, keeps the map live and buffers the next tap', async ({ page }) => {
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const w = await serve(page);
  const token = await onTheMap(w);
  await page.addInitScript(([k, v]) => { localStorage.setItem(k!, v!); }, [`fateweave-server-token:${API}`, token]);
  await page.goto(`./?server=${encodeURIComponent(API)}`);
  await page.locator('#continue').click();
  await expect(page.locator('#world-view')).toBeVisible();
  const tokenAt = () => page.locator('#party-token').evaluate(el => `${(el as HTMLElement).style.getPropertyValue('--x')},${(el as HTMLElement).style.getPropertyValue('--y')}`);
  const start = await tokenAt();
  const before = w.commands.length;
  w.holdNext = 1500;
  const hint = page.locator('.step-hint').first(); const dir = await hint.getAttribute('data-dir');
  await hint.click();
  // The token is already on the new tile while the server still holds the answer, and the map stays live.
  await expect.poll(tokenAt, { timeout: 1000 }).not.toBe(start);
  await expect(page.locator('#app')).toHaveAttribute('data-server', 'sending');
  expect(await page.locator('#world-view').evaluate(el => (el as HTMLElement).inert)).toBe(false);
  // A second step tapped meanwhile waits and goes out after the first answer, with the next sequence number.
  const back = ({ up: 'down', down: 'up', left: 'right', right: 'left' } as Record<string, string>)[dir!]!;
  await page.locator(`.step-hint[data-dir="${back}"]`).click();
  await expect(page.locator('#app')).not.toHaveAttribute('data-server', /./, { timeout: 5000 });
  const sent = w.commands.slice(before).map(b => JSON.parse(b) as { seq: number; command: { kind: string; dir?: string } });
  expect(sent[0]).toMatchObject({ command: { kind: 'move', dir } });
  await expect.poll(() => w.commands.length - before).toBe(2);
  const second = JSON.parse(w.commands[before + 1]!) as { seq: number; command: { dir: string } };
  expect(second.command.dir).toBe(back); expect(second.seq).toBe(sent[0]!.seq + 1);
  await expect(page.locator('#app')).not.toHaveAttribute('data-server', /./, { timeout: 5000 });
  await expect.poll(tokenAt).toBe(start);
  // A step into a wall is refused on the device with the usual message; nothing goes to the server.
  const open = await page.locator('.step-hint').evaluateAll(els => els.map(el => (el as HTMLElement).dataset.dir));
  const wall = (['up', 'down', 'left', 'right'] as const).find(d => !open.includes(d));
  if (wall) {
    const count = w.commands.length;
    await page.keyboard.press({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[wall]);
    await expect(page.locator('#world-message')).toContainText('ไปต่อไม่ได้');
    expect(w.commands.length).toBe(count);
  }
  expect(issues).toEqual([]);
});
