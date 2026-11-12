import { expect, test, type Browser, type Page, type Route } from '@playwright/test';
import { contentVersion } from '../../scripts/content-version.mjs';
import { SESSION_HEADER } from '../../src/server/account-object';
import { CONTENT_HEADER, handle } from '../../src/server/api';
import { withGoogle } from '../fixtures/google-fake';
import { server, type Server } from '../fixtures/server-fakes';

// P09-02c server play in a real browser: the page talks to `https://api.test`, which Playwright routes to the real Worker
// and Durable Object code running in this process (SQLite in memory). Local play stays the default (other specs).
const API = 'https://api.test';
const SAVE_KEY = 'asterveil.fateweave.expedition.v1';

interface Wire { s: Server; commands: string[]; holdNext: number; dropNext: number }
async function serve(page: Page, shared?: Server): Promise<Wire> {
  const s = shared ?? server(undefined, contentVersion());
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

// P09-02d: Google Identity Services is replaced by a stub button that hands the page an ID token signed by the test
// key (tests/fixtures/google-fake.ts); the Worker code checks it against the matching JWKS as it would Google's.
const GIS_STUB = `window.google = { accounts: { id: {
  initialize(c) { window.__gis = c; },
  renderButton(el) { const b = document.createElement('button'); b.type = 'button'; b.id = 'fake-google'; b.textContent = 'Google (ทดสอบ)';
    b.style.minHeight = '44px'; b.onclick = () => window.__gis.callback({ credential: window.__googleToken }); el.replaceChildren(b); } } } };`;
async function device(browser: Browser, s: Server): Promise<{ page: Page; close(): Promise<void> }> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL: test.info().project.use.baseURL ?? 'http://127.0.0.1:5173/', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'text/javascript', body: GIS_STUB }));
  await serve(page, s);
  await page.goto(`./?server=${encodeURIComponent(API)}`);
  await expect(page.locator('#account-open')).toBeVisible();
  return { page, close: () => context.close() };
}

test('server play account: link Google, sign in on a second device, recover on a third with a one-time code', async ({ browser }, info) => {
  const s = server(undefined, contentVersion()); const google = await withGoogle(s);
  const tokenFor = async (page: Page, sub: string) => { const t = await google.token({ sub }); await page.evaluate(v => { (window as unknown as { __googleToken: string }).__googleToken = v; }, t); };

  // Phone: a guest makes a commander, then links Google and takes a recovery code.
  const phone = await device(browser, s);
  await phone.page.locator('#new-game').click(); await phone.page.locator('#commander-name').fill('ย้ายเครื่อง');
  await phone.page.locator('#commander-create').click();
  await phone.page.locator('[data-story=skip]').click();
  await expect(phone.page.locator('#save-status')).toHaveText('บันทึกบนเซิร์ฟเวอร์ทุกเทิร์น');
  await phone.page.reload();
  await phone.page.locator('#account-open').click();
  await expect(phone.page.locator('.account-status')).toHaveAttribute('data-status', 'guest');
  await phone.page.locator('[data-account="code"]').click();
  const code = (await phone.page.locator('#account-code').textContent())!.trim();
  expect(code).toMatch(/^([0-9A-Z]{4}-){4}[0-9A-Z]{4}$/);
  await tokenFor(phone.page, 'g-owner');
  await phone.page.locator('#fake-google').click();
  await expect(phone.page.locator('.account-status')).toHaveAttribute('data-status', 'linked');
  await phone.page.screenshot({ path: info.outputPath('account-linked-390.png') });
  expect(await phone.page.locator('#account-code').count()).toBe(1); // still shown until the panel closes
  await phone.page.locator('[data-account="close"]').click();
  await expect(phone.page.locator('#account-panel')).toBeHidden();

  // Laptop: its own guest first; Google is already on the phone's account, so it offers to switch (never merges).
  const laptop = await device(browser, s);
  await expect(laptop.page.locator('#continue')).toHaveCount(0);
  await laptop.page.locator('#account-open').click();
  await tokenFor(laptop.page, 'g-owner');
  await laptop.page.locator('#fake-google').click();
  await expect(laptop.page.locator('.account-conflict')).toBeVisible();
  await laptop.page.screenshot({ path: info.outputPath('account-switch-390.png') });
  await laptop.page.locator('[data-account="switch"]').click();
  await expect(laptop.page.locator('#continue')).toBeVisible();
  await expect(laptop.page.locator('.title-server-note')).toContainText('Google');
  await laptop.page.locator('#continue').click();
  await expect(laptop.page.locator('#encounter-title')).toContainText('กองหน้าของวาร์กอธ');

  // (The phone is now the other device: its next command gets 423, covered in tests/server-account.test.ts.)

  // Tablet: the recovery code reaches the same account once; the same code on another device is refused.
  const tablet = await device(browser, s);
  await tablet.page.locator('#account-open').click();
  await tablet.page.locator('#account-code-input').fill(code.toLowerCase());
  await tablet.page.locator('[data-account="recover"]').click();
  await expect(tablet.page.locator('#continue')).toBeVisible();
  const again = await device(browser, s);
  await again.page.locator('#account-open').click();
  await again.page.locator('#account-code-input').fill(code);
  await again.page.locator('[data-account="recover"]').click();
  await expect(again.page.locator('.account-note')).toHaveText('รหัสกู้คืนไม่ถูกต้อง หรือถูกใช้ไปแล้ว');
  for (const d of [phone, laptop, tablet, again]) await d.close();
});
