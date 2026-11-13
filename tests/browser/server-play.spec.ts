import { expect, test, type Browser, type Page, type Route } from '@playwright/test';
import { contentVersion } from '../../scripts/content-version.mjs';
import { SESSION_HEADER } from '../../src/server/account-object';
import { CONTENT_HEADER, handle } from '../../src/server/api';
import { currentSave } from '../fixtures/current-save';
import { withGoogle } from '../fixtures/google-fake';
import { battleTurns, grantAdmin, server, storedGame, type Server } from '../fixtures/server-fakes';

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
  grantAdmin(w.s, [...w.s.objects.keys()][0]!); // P09-02f: the audit is admin-only
  const state = await (await handle(new Request(`${API}/v1/verify`, { method: 'POST', headers: { Authorization: `Bearer ${await page.evaluate(k => localStorage.getItem(k), `fateweave-server-token:${API}`)}`, [CONTENT_HEADER]: contentVersion() } }), w.s.deps)).json();
  expect(state).toEqual({ ok: true, seq: 2, from: 0 });

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

  // P09-02f sign-out: the tablet signs the phone and laptop out, then itself (linked to Google: no warning) and starts
  // over as a new guest; Google brings it back.
  await tablet.page.locator('#account-open').click();
  await tablet.page.locator('[data-account="signout-others"]').click();
  await expect(tablet.page.locator('.account-note')).toHaveText('ออกจากระบบเครื่องอื่นแล้ว 2 เครื่อง');
  await tablet.page.screenshot({ path: info.outputPath('account-signout-390.png') });
  await tablet.page.locator('[data-account="signout"]').click();
  await expect(tablet.page.locator('#account-panel')).toBeHidden();
  await expect(tablet.page.locator('.title-server-note')).toContainText('ออกจากระบบแล้ว');
  await expect(tablet.page.locator('#continue')).toHaveCount(0);
  await tablet.page.locator('#account-open').click();
  await expect(tablet.page.locator('.account-status')).toHaveAttribute('data-status', 'guest');
  // The fresh guest has no Google or code: signing it out asks first.
  await tablet.page.locator('[data-account="signout"]').click();
  await expect(tablet.page.locator('[data-account="signout"]')).toHaveText('ยืนยัน: ออกจากระบบ (กลับมาไม่ได้)');
  await tokenFor(tablet.page, 'g-owner');
  await tablet.page.locator('#fake-google').click();
  await tablet.page.locator('[data-account="switch"]').click();
  await expect(tablet.page.locator('#continue')).toBeVisible();
  for (const d of [phone, laptop, tablet, again]) await d.close();
});

test('server play import (D11): the title offers the local save once and the server plays on from it', async ({ page }, info) => {
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const w = await serve(page);
  // A save this browser kept from local play: a company on the map after the prologue.
  await onTheMap(w);
  const raw = currentSave(storedGame(w.s, [...w.s.objects.keys()][0]!)!);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k!)) localStorage.setItem(k!, v!); }, [SAVE_KEY, raw]);
  await page.goto(`./?server=${encodeURIComponent(API)}`);
  await expect(page.locator('#import-save')).toBeVisible();
  await expect(page.locator('.title-import')).toContainText('พบเซฟเดิมในเครื่องนี้');
  await expect(page.locator('#new-game')).toHaveText('เริ่มเกมใหม่บนเซิร์ฟเวอร์');
  await page.screenshot({ path: info.outputPath('server-import-offer-390.png') });
  await page.locator('#import-save').click();
  await expect(page.locator('#continue')).toBeVisible();
  await expect(page.locator('.title-server-note')).toContainText('นำเข้าเซฟเดิม (v58) แล้ว');
  await expect(page.locator('#import-save')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('server-import-done-390.png') });
  // The local save stays as it was; the account now plays on the server.
  expect(await page.evaluate(k => localStorage.getItem(k), SAVE_KEY)).toBe(raw);
  await page.reload();
  await expect(page.locator('#continue')).toBeVisible();
  await expect(page.locator('#import-save')).toHaveCount(0);
  await page.locator('#continue').click();
  await expect(page.locator('#world-view')).toBeVisible();
  expect(issues).toEqual([]);
});

// P09-02g: deletion asks for a typed phrase, the account then waits (the game refuses and says how to cancel), and
// cancelling brings the camp back. The privacy page is linked from the title.
test('server play account: delete with a typed confirm, the waiting state, cancel, and the privacy page', async ({ browser }, info) => {
  const s = server(undefined, contentVersion());
  const d = await device(browser, s); const page = d.page;
  await expect(page.locator('.title-privacy')).toHaveAttribute('href', /privacy\.html$/);
  await page.locator('#new-game').click(); await page.locator('#commander-name').fill('ลบแล้วกลับ');
  await page.locator('#commander-create').click();
  await page.locator('[data-story=skip]').click();
  await expect(page.locator('#save-status')).toHaveText('บันทึกบนเซิร์ฟเวอร์ทุกเทิร์น');
  await page.reload();
  await page.locator('#account-open').click();
  await page.locator('[data-account="delete"]').click();
  await expect(page.locator('.account-delete .account-warn')).toContainText('14 วัน');
  await page.locator('#account-delete-input').fill('ลบ');
  await page.locator('[data-account="delete-confirm"]').click();
  await expect(page.locator('.account-note')).toContainText('พิมพ์ “ลบบัญชี”');
  await page.locator('#account-delete-input').fill('ลบบัญชี');
  await page.locator('.account-delete').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('account-delete-confirm-390.png') });
  await page.locator('[data-account="delete-confirm"]').click();
  await expect(page.locator('.account-status')).toHaveAttribute('data-status', 'deleting');
  await page.screenshot({ path: info.outputPath('account-deleting-390.png') });
  // Entering again: the game refuses and points to the account page, where the deletion is cancelled.
  await page.reload();
  await expect(page.locator('#server-problem-title')).toHaveText('บัญชีนี้รอการลบ');
  await page.locator('[data-server="act"]').click();
  await page.locator('[data-account="undelete"]').click();
  await expect(page.locator('.title-server-note')).toContainText('ยกเลิกการลบบัญชีแล้ว');
  await expect(page.locator('#continue')).toBeVisible();
  // The privacy page.
  await page.goto('./privacy.html');
  await expect(page.locator('h1')).toHaveText('นโยบายความเป็นส่วนตัว');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('privacy-390.png') });
  await d.close();
});

// P09-03: the feedback form from the title and from the battle settings tab (a dialog above the info dialog); an admin
// also sees the latest feedback and the telemetry totals.
test('server play feedback: send from the title and from battle settings; admin views', async ({ browser }, info) => {
  const s = server(undefined, contentVersion());
  const d = await device(browser, s); const page = d.page;
  await page.locator('#feedback-open').click();
  await expect(page.locator('#feedback-dialog')).toBeVisible();
  await page.locator('[data-feedback="send"]').click();
  await expect(page.locator('#feedback-status')).toHaveText('เขียนรายละเอียดก่อนกดส่ง');
  await page.locator('input[name="category"][value="idea"]').check();
  await page.locator('#feedback-text').fill('อยากให้มีปุ่มเร่งความเร็วการต่อสู้');
  await expect(page.locator('#feedback-count')).toHaveText('34 / 1000');
  await page.screenshot({ path: info.outputPath('feedback-form-390.png') });
  await page.locator('[data-feedback="send"]').click();
  await expect(page.locator('#feedback-status')).toHaveText('ส่งแล้ว ขอบคุณที่ช่วยบอก');
  await page.locator('[data-feedback="close"]').click();
  // In battle: info → settings → feedback opens above the info dialog.
  await page.locator('#new-game').click(); await page.locator('#commander-name').fill('ส่งความเห็น');
  await page.locator('#commander-create').click();
  await page.locator('[data-story=skip]').click();
  await page.locator('#battle-info').click(); await page.locator('#battle-tab-settings').click();
  await page.locator('#battle-panel-settings [data-feedback-open]').click();
  await page.locator('input[name="category"][value="bug"]').check();
  await page.locator('#feedback-text').fill('ทดสอบจากหน้าต่อสู้');
  await page.locator('[data-feedback="send"]').click();
  await expect(page.locator('#feedback-status')).toHaveText('ส่งแล้ว ขอบคุณที่ช่วยบอก');
  expect(s.d1.db.prepare('SELECT category, place FROM feedback ORDER BY id').all()).toEqual([{ category: 'idea', place: 'title' }, { category: 'bug', place: 'battle' }]);
  await page.locator('[data-feedback="close"]').click();
  await expect(page.locator('#game-info')).toBeVisible();
  // Admin: the same account made admin sees both views after a reload.
  const accountId = (s.d1.db.prepare('SELECT id FROM accounts').get() as { id: string }).id;
  grantAdmin(s, accountId);
  await page.reload();
  await page.locator('#feedback-open').click();
  await page.locator('[data-feedback="admin-telemetry"]').click();
  await expect(page.locator('.feedback-table')).toContainText('feedback · idea');
  await page.locator('[data-feedback="admin-feedback"]').click();
  await expect(page.locator('.feedback-list li')).toHaveCount(2);
  await page.locator('.feedback-admin').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('feedback-admin-390.png') });
  await d.close();
});
