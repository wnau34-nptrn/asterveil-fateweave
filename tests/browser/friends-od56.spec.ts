import { expect, test, type Browser, type Page, type Route } from '@playwright/test';
import { contentVersion } from '../../scripts/content-version.mjs';
import { SESSION_HEADER } from '../../src/server/account-object';
import { CONTENT_HEADER, handle } from '../../src/server/api';
import { server, type Server } from '../fixtures/server-fakes';

// OD-56 friends + private chat at 390px: two players, each in their own browser context, routed through one real Worker
// + `Chat` object in this process (like chat-p11.spec.ts). B adds A by code, A accepts, they message both ways, the
// unread dot and the camp badge show, A reports B's message and blocks B; B's conversation closes.
const API = 'https://api.test';
const SHOTS = 'docs/validation/friends-od56-2026-11-19';

async function route(page: Page, s: Server): Promise<void> {
  await page.route(`${API}/**`, async (r: Route) => {
    const req = r.request(); const body = req.postData() ?? undefined; s.clock.t += 1000;
    const response = await handle(new Request(req.url(), { method: req.method(), headers: await req.allHeaders(), ...(body !== undefined && req.method() !== 'GET' ? { body } : {}) }), s.deps);
    await r.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
  });
}
async function player(s: Server, name: string, n: number) {
  const g = await (await handle(new Request(`${API}/v1/guest`, { method: 'POST', headers: { 'CF-Connecting-IP': `203.0.113.${n}` } }), s.deps)).json() as { accountId: string; token: string };
  const headers = { Authorization: `Bearer ${g.token}`, [CONTENT_HEADER]: contentVersion(), [SESSION_HEADER]: String(n).repeat(32).slice(0, 32), 'Content-Type': 'application/json' };
  const r = await handle(new Request(`${API}/v1/command`, { method: 'POST', headers, body: JSON.stringify({ requestId: `setup-request-00000${n}`, seq: 1, command: { kind: 'createCommander', commander: { name, crest: 'star', color: 'gold', camp: `ค่าย${name}` }, replace: false } }) }), s.deps);
  expect(r.status).toBe(200);
  return g;
}
async function camp(browser: Browser, s: Server, token: string, base: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL: base });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
  const page = await ctx.newPage(); await route(page, s);
  await page.addInitScript(([k, v]) => { localStorage.setItem(k!, v!); }, [`fateweave-server-token:${API}`, token]);
  await page.goto(`./?server=${encodeURIComponent(API)}`);
  await page.locator('#continue').click();
  await expect(page.locator('#lobby-chat')).toBeEnabled();
  return page;
}
async function friendsTab(page: Page): Promise<void> {
  if (!await page.locator('#chat-dialog').isVisible()) await page.locator('#lobby-chat').click();
  await page.locator('[data-chat-tab="dm"]').click();
  await expect(page.locator('#friends-view')).toBeVisible();
}
async function targets(page: Page): Promise<void> {
  for (const b of await page.locator('#chat-dialog button, #chat-dialog input').all()) if (await b.isVisible()) expect((await b.boundingBox())!.height, await b.textContent() ?? '').toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('friends: add by code, accept, message both ways, unread dot and badge, report, block', async ({ browser }, info) => {
  test.setTimeout(180_000);
  const s = server(undefined, contentVersion());
  const base = info.project.use.baseURL ?? 'http://127.0.0.1:5173/';
  s.deps.allowedOrigins = [new URL(base).origin];
  const a = await player(s, 'อารี', 1), b = await player(s, 'บุญ', 2);
  const pa = await camp(browser, s, a.token, base), pb = await camp(browser, s, b.token, base);

  // A's code, shown in the friends tab and copied.
  await friendsTab(pa);
  const code = pa.locator('#friend-code'); await expect(code).toHaveText(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const aCode = (await code.textContent())!;
  await pa.locator('#friend-copy').click(); await expect(pa.locator('#friends-status')).toContainText(aCode);

  // B adds A by code (typed in lower case without the dash), a wrong code first.
  await friendsTab(pb);
  await pb.locator('#friend-code-input').fill('abc'); await pb.locator('#friend-add-send').click();
  await expect(pb.locator('#friends-status')).toContainText('8 ตัว');
  await pb.locator('#friend-code-input').fill(aCode.replace('-', '').toLowerCase()); await pb.keyboard.press('Enter');
  await expect(pb.locator('#friends-status')).toContainText('ส่งคำขอแล้ว');
  await expect(pb.locator('#friends-out-title')).toContainText('(1/');

  // A accepts on the next poll.
  const accept = pa.locator('[data-friend="accept"]'); await expect(accept).toBeVisible({ timeout: 20_000 });
  await accept.click(); await expect(pa.locator('#friends-status')).toContainText('เป็นเพื่อนกันแล้ว');
  await expect(pa.locator('.friends-open')).toHaveCount(1);
  await targets(pa);
  await pa.screenshot({ path: `${SHOTS}/friends-tab-390.png` });

  // A writes; B sees an unread dot on the next list poll, and the camp badge after closing the window.
  await pa.locator('.friends-open').click(); await expect(pa.locator('#dm-view')).toBeVisible();
  await pa.locator('#dm-text').fill('สวัสดีบุญ ไปตีบอสโลกด้วยกันไหม'); await pa.locator('#dm-send').click();
  await expect(pa.locator('#dm-log .chat-msg.mine .chat-text')).toHaveText('สวัสดีบุญ ไปตีบอสโลกด้วยกันไหม');
  const dot = pb.locator('.friends-open .friends-unread'); await expect(dot).toHaveText('1', { timeout: 20_000 });
  await expect(pb.locator('[data-chat-tab="dm"] [data-chat-unread]')).toContainText('1');
  await pb.locator('[data-chat="close"]').click();
  await expect(pb.locator('#chat-unread-badge')).toHaveText('1');
  const badge = (await pb.locator('#lobby-chat').boundingBox())!; expect(badge.height).toBeGreaterThanOrEqual(44);
  // B opens the conversation (the dot and badge clear) and answers.
  await friendsTab(pb); await pb.locator('.friends-open').click();
  await expect(pb.locator('#dm-log .chat-text')).toHaveText(['สวัสดีบุญ ไปตีบอสโลกด้วยกันไหม']);
  await expect(pb.locator('[data-chat-tab="dm"] [data-chat-unread]')).toBeHidden();
  await pb.locator('#dm-text').fill('ไปสิ เจอกันที่ค่าย'); await pb.keyboard.press('Enter');
  await expect(pb.locator('#dm-log .chat-msg.mine')).toHaveCount(1);
  // A link is refused on the device.
  await pb.locator('#dm-text').fill('ดู www.freegems.com'); await pb.keyboard.press('Enter');
  await expect(pb.locator('#dm-status')).toContainText('ลิงก์');
  await expect(pa.locator('#dm-log .chat-msg:not(.mine) .chat-text')).toHaveText('ไปสิ เจอกันที่ค่าย', { timeout: 15_000 });
  await targets(pa);
  await pa.screenshot({ path: `${SHOTS}/friends-dm-390.png` });
  // The world channel is not touched.
  expect(s.chat.host.read(a.accountId, 0).messages).toEqual([]);

  // A reports B's message: the admin view has it with its context, nothing else of the conversation.
  await pa.locator('#dm-log .chat-msg:not(.mine) .chat-more').click();
  await pa.locator('#dm-log [data-friend="report"][data-reason="spam"]').click();
  await expect(pa.locator('#dm-status')).toContainText('แจ้งแล้ว');
  expect(s.chat.host.admin().rows).toEqual([expect.objectContaining({ channel: 'dm', text: 'ไปสิ เจอกันที่ค่าย', context: [expect.objectContaining({ text: 'สวัสดีบุญ ไปตีบอสโลกด้วยกันไหม' })] })]);

  // A blocks B from the conversation (tap twice): back to the list, B in the blocked list; B's conversation closes.
  await pa.locator('#dm-block').click(); await expect(pa.locator('#dm-block')).toHaveText('ยืนยันบล็อก');
  await pa.locator('#dm-block').click();
  await expect(pa.locator('#friends-home')).toBeVisible(); await expect(pa.locator('#friends-status')).toContainText('บล็อกแล้ว');
  await expect(pa.locator('.friends-open')).toHaveCount(0);
  await pa.locator('#friends-blocked summary').click(); await expect(pa.locator('[data-friend="unblock"]')).toHaveCount(1);
  await pb.locator('#dm-text').fill('ยังอยู่ไหม'); await pb.locator('#dm-send').click();
  await expect(pb.locator('#friends-home')).toBeVisible({ timeout: 10_000 });
  await expect(pb.locator('#friends-status')).toContainText('เฉพาะเพื่อน');
  // B cannot ask again: the answer is the same as for an unknown code.
  await pb.locator('#friend-code-input').fill(aCode); await pb.locator('#friend-add-send').click();
  await expect(pb.locator('#friends-status')).toContainText('ส่งคำขอด้วยรหัสนี้ไม่ได้');
  // Keyboard: the tabs and the add field are reachable and the dialog closes with Escape.
  await pa.locator('[data-chat-tab="world"]').focus(); await pa.keyboard.press('Tab'); await expect(pa.locator('[data-chat-tab="dm"]')).toBeFocused();
  await pa.keyboard.press('Escape'); await expect(pa.locator('#chat-dialog')).toBeHidden();
  await pa.context().close(); await pb.context().close();
});

test('friends off (FRIENDS=off): the tab shows the reason and the world chat still works', async ({ browser }, info) => {
  const s = server(undefined, contentVersion());
  const base = info.project.use.baseURL ?? 'http://127.0.0.1:5173/';
  s.deps.allowedOrigins = [new URL(base).origin]; s.deps.friends = false;
  const a = await player(s, 'อารี', 3);
  const pa = await camp(browser, s, a.token, base);
  await friendsTab(pa);
  await expect(pa.locator('#friends-status')).toContainText('ระบบเพื่อนปิดชั่วคราว');
  await pa.locator('[data-chat-tab="world"]').click();
  await pa.locator('#chat-text').fill('แชทโลกยังใช้ได้'); await pa.locator('#chat-send').click();
  await expect(pa.locator('#chat-log .chat-msg.mine .chat-text')).toHaveText('แชทโลกยังใช้ได้');
  await pa.context().close();
});
