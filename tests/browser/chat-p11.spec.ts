import { expect, test, type Page, type Route } from '@playwright/test';
import { contentVersion } from '../../scripts/content-version.mjs';
import { SESSION_HEADER } from '../../src/server/account-object';
import { CONTENT_HEADER, handle } from '../../src/server/api';
import { chapterOne } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { grantAdmin, server, type Server } from '../fixtures/server-fakes';

// P11 chat at 390px: the camp button opens the world channel through the real Worker + `Chat` object (routed in this
// process like server-play.spec.ts); another camp's message arrives by polling, a send shows at once, a link is refused
// on the device, report/hide-camp work, a mute disables the input with its reason. Offline the button is disabled.
const API = 'https://api.test';
const SHOTS = 'docs/validation/p11-chat-2026-11-15';

async function serve(page: Page): Promise<Server> {
  const s = server(undefined, contentVersion());
  s.deps.allowedOrigins = [new URL(test.info().project.use.baseURL ?? 'http://127.0.0.1:5173/').origin];
  await page.route(`${API}/**`, async (route: Route) => {
    const req = route.request(); const body = req.postData() ?? undefined; s.clock.t += 1000;
    const response = await handle(new Request(req.url(), { method: req.method(), headers: await req.allHeaders(), ...(body !== undefined && req.method() !== 'GET' ? { body } : {}) }), s.deps);
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
  });
  return s;
}
async function guest(s: Server, commander?: string) {
  const g = await (await handle(new Request(`${API}/v1/guest`, { method: 'POST' }), s.deps)).json() as { accountId: string; token: string };
  if (commander) {
    const headers = { Authorization: `Bearer ${g.token}`, [CONTENT_HEADER]: contentVersion(), [SESSION_HEADER]: 'e'.repeat(32), 'Content-Type': 'application/json' };
    const r = await handle(new Request(`${API}/v1/command`, { method: 'POST', headers, body: JSON.stringify({ requestId: 'setup-request-000001', seq: 1, command: { kind: 'createCommander', commander: { name: commander, crest: 'star', color: 'gold', camp: `ค่าย${commander}` }, replace: false } }) }), s.deps);
    expect(r.status).toBe(200);
  }
  return g;
}
const say = async (s: Server, token: string, text: string) => {
  s.clock.t += 5000;
  const r = await handle(new Request(`${API}/v1/chat/send`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }), s.deps);
  expect(r.status).toBe(201);
};

test('server play: the camp chat sends, receives by polling, refuses links, reports and honours a mute', async ({ page }) => {
  test.setTimeout(90_000);
  const s = await serve(page);
  const me = await guest(s, 'อารี'); const other = await guest(s); const third = await guest(s);
  await say(s, other.token, 'สวัสดีค่ายใหม่ ตีบอสโลกกันไหม');
  await page.addInitScript(([k, v]) => { localStorage.setItem(k!, v!); }, [`fateweave-server-token:${API}`, me.token]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`./?server=${encodeURIComponent(API)}`);
  await page.locator('#continue').click();
  const button = page.locator('#lobby-chat');
  await expect(button).toBeEnabled();
  const box = (await button.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
  await button.click();
  const dialog = page.locator('#chat-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.chat-msg')).toHaveCount(1);
  await expect(dialog.locator('.chat-text').first()).toHaveText('สวัสดีค่ายใหม่ ตีบอสโลกกันไหม');
  // A send shows at once, marked as mine.
  await page.locator('#chat-text').fill('สวัสดีครับ <b>ใหม่</b>');
  await page.locator('#chat-send').click();
  await expect(dialog.locator('.chat-msg.mine .chat-text')).toHaveText('สวัสดีครับ <b>ใหม่</b>');
  // A link is refused on the device (the server would refuse it too).
  await page.locator('#chat-text').fill('ไปที่ www.freegems.com');
  await page.keyboard.press('Enter');
  await expect(page.locator('#chat-status')).toContainText('ลิงก์');
  // Another camp's message arrives on the next poll.
  await say(s, third.token, 'ผมเพิ่งชนะบอสด่าน 3');
  await expect(dialog.locator('.chat-msg')).toHaveCount(3, { timeout: 15_000 });
  for (const b of await dialog.locator('button').all()) if (await b.isVisible()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${SHOTS}/chat-390.png` });
  // Report a message, then hide that camp on this device.
  await dialog.locator('.chat-msg').nth(2).locator('.chat-more').click();
  await dialog.locator('[data-chat="report"][data-reason="spam"]').click();
  await expect(page.locator('#chat-status')).toContainText('แจ้งแล้ว');
  expect(s.chat.host.admin().rows[0]).toMatchObject({ reports: 1, reasons: ['spam'] });
  await dialog.locator('.chat-msg').first().locator('.chat-more').click();
  await dialog.locator('[data-chat="block"]').click();
  await expect(dialog.locator('.chat-msg')).toHaveCount(2);
  // An admin mutes this account: the next poll disables the input with the reason.
  const admin = await guest(s); grantAdmin(s, admin.accountId);
  const mute = await handle(new Request(`${API}/v1/admin/chat/mute`, { method: 'POST', headers: { Authorization: `Bearer ${admin.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: me.accountId, minutes: 60 }) }), s.deps);
  expect(mute.status).toBe(200);
  await expect(page.locator('#chat-text')).toBeDisabled({ timeout: 15_000 });
  await expect(page.locator('#chat-text')).toHaveAttribute('placeholder', /ถูกระงับการพิมพ์/);
  await page.locator('[data-chat="close"]').click();
  await expect(dialog).toBeHidden();
});

test('offline the camp chat button is disabled with its reason', async ({ page }) => {
  const p = newProfile(chapterOne, 17, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  const raw = JSON.stringify({ version: 64, profile: p, run: null });
  await page.addInitScript(({ raw }) => { localStorage.setItem('asterveil.fateweave.expedition.v1', raw); }, { raw });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./'); await page.locator('#continue').click();
  const button = page.locator('#lobby-chat');
  await expect(button).toBeDisabled(); await expect(button).toContainText('เฉพาะเล่นออนไลน์');
  await expect(page.locator('#chat-dialog')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/camp-offline-390.png` });
});

// Camp chat feed, hidden camps and closed channels (owner 2026-11-19): off by default, no reading while off, a toggle on
// the camp, in the chat window and in Setup, lines from the last 45 s, a hidden camp leaves the feed and can be shown again.
test('camp feed: off by default and silent, on shows new lines, a hidden camp can be shown again, private and guild tabs are closed', async ({ page }) => {
  test.setTimeout(90_000);
  const s = await serve(page);
  const me = await guest(s, 'อารี'); const other = await guest(s);
  const reads: string[] = []; page.on('request', r => { if (r.url().startsWith(`${API}/v1/chat?`)) reads.push(r.url()); });
  await page.addInitScript(([k, v]) => { localStorage.setItem(k!, v!); }, [`fateweave-server-token:${API}`, me.token]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`./?server=${encodeURIComponent(API)}`);
  await page.locator('#continue').click(); await expect(page.locator('#lobby-chat')).toBeEnabled();
  const toggle = page.locator('#chat-feed-camp'); await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const tb = (await toggle.boundingBox())!; expect(tb.height).toBeGreaterThanOrEqual(44); expect(tb.width).toBeGreaterThanOrEqual(44);
  await say(s, other.token, 'ข้อความก่อนเปิดแถบ'); await page.waitForTimeout(1500);
  await expect(page.locator('#chat-feed')).toBeHidden(); expect(reads).toEqual([]);
  // On: only what arrives afterwards (the first read hides old history), and it survives a reload.
  await toggle.click(); await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await say(s, other.token, 'ใครไปด่านสองบ้าง');
  const feed = page.locator('#chat-feed'); await expect(feed).toBeVisible({ timeout: 15_000 });
  await expect(feed).toContainText('ใครไปด่านสองบ้าง'); await expect(feed).not.toContainText('ข้อความก่อนเปิดแถบ');
  await page.screenshot({ path: `${SHOTS}/camp-feed-390.png` });
  const fb = (await feed.boundingBox())!; expect(fb.x + fb.width).toBeLessThanOrEqual(390 - 60);
  // The feed opens the full chat; there the camp can be hidden and shown again, and the other channels show why they are closed.
  await feed.click(); const dialog = page.locator('#chat-dialog'); await expect(dialog).toBeVisible(); await expect(feed).toBeHidden();
  await expect(dialog.locator('[data-chat-tab="dm"]')).toBeDisabled(); await expect(dialog.locator('[data-chat-tab="guild"]')).toBeDisabled();
  await expect(dialog.locator('[data-chat-tab="world"]')).toHaveAttribute('aria-current', 'true');
  await dialog.locator('.chat-msg').last().locator('.chat-more').click(); await dialog.locator('[data-chat="block"]').click();
  await dialog.locator('#chat-blocked summary').click(); await expect(dialog.locator('.chat-blocked-row')).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/chat-blocked-390.png` });
  for (const b of await dialog.locator('button').all()) if (await b.isVisible()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await dialog.locator('[data-chat="unblock"]').click();
  await expect(dialog.locator('.chat-msg')).toHaveCount(2); await expect(dialog.locator('#chat-blocked-summary')).toContainText('(0)');
  await page.locator('[data-chat="close"]').click();
  // Reload: the preference is kept; turning it off hides the feed again.
  await page.reload(); await page.locator('#continue').click(); await expect(page.locator('#chat-feed-camp')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#chat-feed-camp').click(); await expect(page.locator('#chat-feed-camp')).toHaveAttribute('aria-pressed', 'false'); await expect(feed).toBeHidden();
});
