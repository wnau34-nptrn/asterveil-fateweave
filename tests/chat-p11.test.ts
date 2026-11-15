import { describe, expect, it } from 'vitest';
import { CHAT_MAX, filterChat, normalizeChat } from '../src/core/chat/filter';
import { handle } from '../src/server/api';
import { CHAT_LIMITS, chatHandle, ChatHost } from '../src/server/chat';
import { purgeDue } from '../src/server/deletion';
import { fakeDurableState, grantAdmin, server, type Server } from './fixtures/server-fakes';

// P11 chat (docs/design/CHAT_P11_TH.md): the shared filter, the `Chat` object (real SQLite in Node) and the Worker routes.
const A = 'a'.repeat(32), B = 'b'.repeat(32), C = 'c'.repeat(32), D = 'd'.repeat(32);

describe('chat filter', () => {
  it('normalizes whitespace and strips control, zero-width and bidi characters', () => {
    expect(normalizeChat('  สวัสดี\n\tทุกคน​‮!  ')).toBe('สวัสดี ทุกคน !');
    expect(filterChat('<b>hi</b>')).toEqual({ ok: true, text: '<b>hi</b>', masked: false }); // shown as text, never HTML
  });
  it('refuses empty, too long, links, e-mail, long numbers and long repeats', () => {
    expect(filterChat('   ')).toEqual({ ok: false, error: 'empty' });
    expect(filterChat('กขคง'.repeat(CHAT_MAX / 4))).toMatchObject({ ok: true });
    expect(filterChat('a'.repeat(5) + ' ' + 'ข'.repeat(CHAT_MAX))).toEqual({ ok: false, error: 'too_long' });
    for (const t of ['ดู https://x.example', 'www.abc.com', 'เข้า freegems.gg สิ', 'cheap.xyz']) expect(filterChat(t)).toEqual({ ok: false, error: 'link' });
    expect(filterChat('mail me a@b.co')).toEqual({ ok: false, error: 'email' });
    for (const t of ['โทร 081-234-5678', '1234 5678', '1.2.3.4.5.6.7.8']) expect(filterChat(t)).toEqual({ ok: false, error: 'number' });
    expect(filterChat('ค่าย Lv10 ตีบอส 2500 ดาเมจ รอบ 8/8')).toMatchObject({ ok: true });
    expect(filterChat('5555555555555')).toEqual({ ok: false, error: 'number' });
    expect(filterChat('ฮ่า'.repeat(3) + 'ๆๆๆๆๆๆๆๆๆๆๆ')).toEqual({ ok: false, error: 'repeat' });
    expect(filterChat('555 ขำ')).toMatchObject({ ok: true });
  });
  it('masks blocked words without refusing, and leaves game words alone', () => {
    expect(filterChat('โคตร เหี้ย เลย')).toEqual({ ok: true, text: 'โคตร *** เลย', masked: true });
    expect(filterChat('What the FUCK, Shit')).toEqual({ ok: true, text: 'What the ***, ***', masked: true });
    expect(filterChat('เปิดหีบสมบัติได้ของดี')).toEqual({ ok: true, text: 'เปิดหีบสมบัติได้ของดี', masked: false });
  });
});

function host() {
  const clock = { t: 10_000_000 }; const state = fakeDurableState();
  return { clock, state, chat: new ChatHost(state, () => clock.t) };
}

describe('Chat object', () => {
  it('a pseudonymous handle per account, never the account id', async () => {
    const h = await chatHandle(A);
    expect(h).toMatch(/^ค่าย-[A-Z2-9]{5}$/); expect(await chatHandle(A)).toBe(h); expect(await chatHandle(B)).not.toBe(h); expect(h).not.toContain('aaaa');
  });
  it('posts, reads after an id with mine flags, and paces each account', () => {
    const { chat, clock } = host();
    const m1 = chat.post(A, 'ค่าย-A', 'สวัสดี'); expect(m1).toMatchObject({ ok: true, message: { id: 1, text: 'สวัสดี', mine: true } });
    expect(chat.post(A, 'ค่าย-A', 'อีกอัน')).toEqual({ ok: false, error: 'too_fast', retryAfter: 4 });
    clock.t += 1000; expect(chat.post(B, 'ค่าย-B', 'หวัดดี')).toMatchObject({ ok: true });
    clock.t += CHAT_LIMITS.gapMs; expect(chat.post(A, 'ค่าย-A', 'สวัสดี')).toEqual({ ok: false, error: 'duplicate' });
    const r = chat.read(B, 0); expect(r.messages.map(m => [m.id, m.handle, m.mine])).toEqual([[1, 'ค่าย-A', false], [2, 'ค่าย-B', true]]);
    expect(r.last).toBe(2); expect(chat.read(B, 1).messages.map(m => m.id)).toEqual([2]); expect(JSON.stringify(r)).not.toContain(A);
    // 8 a minute, 60 an hour.
    for (let i = 0; i < 7; i++) { clock.t += CHAT_LIMITS.gapMs; expect(chat.post(A, 'ค่าย-A', `ข้อความ ${i}`)).toMatchObject({ ok: true }); }
    clock.t += CHAT_LIMITS.gapMs; expect(chat.post(A, 'ค่าย-A', 'เก้า')).toMatchObject({ ok: false, error: 'too_fast' });
    let sent = 8;
    for (let i = 0; sent < CHAT_LIMITS.perHour; i++) { clock.t += 8000; if (chat.post(A, 'ค่าย-A', `ชั่วโมง ${i}`).ok) sent++; }
    clock.t += 8000; expect(chat.post(A, 'ค่าย-A', 'เกินชั่วโมง')).toEqual({ ok: false, error: 'too_fast', retryAfter: 600 });
  });
  it('three different reporters hide a message; own and repeated reports do not count; admin can restore', () => {
    const { chat } = host();
    const id = (chat.post(A, 'ค่าย-A', 'ข้อความแย่ ๆ') as { message: { id: number } }).message.id;
    expect(chat.report(A, id, 'abuse')).toBe('own'); expect(chat.report(B, 99, 'abuse')).toBe('no_message');
    expect(chat.report(B, id, 'abuse')).toBe('reported'); expect(chat.report(B, id, 'spam')).toBe('already');
    expect(chat.report(C, id, 'spam')).toBe('reported'); expect(chat.read(D, 0).messages).toHaveLength(1);
    expect(chat.report(D, id, 'personal')).toBe('reported');
    expect(chat.read(D, 0).messages).toHaveLength(0); expect(chat.read(D, id).hidden).toEqual([id]);
    expect(chat.admin().rows[0]).toMatchObject({ id, account: A, hidden: 'reports', reports: 3, reasons: ['abuse', 'spam', 'personal'] });
    expect(chat.hide(id, false)).toBe(true); expect(chat.read(D, 0).messages).toHaveLength(1);
  });
  it('a mute stops posting until it ends; zero lifts it', () => {
    const { chat, clock } = host();
    const until = chat.mute(A, 10, D)!; expect(until).toBe(clock.t + 600_000);
    expect(chat.post(A, 'ค่าย-A', 'ฮัลโหล')).toEqual({ ok: false, error: 'muted', until }); expect(chat.read(A, 0).muted).toBe(until);
    clock.t += 600_001; expect(chat.post(A, 'ค่าย-A', 'กลับมาแล้ว')).toMatchObject({ ok: true });
    chat.mute(A, 60, D); chat.mute(A, 0, D); clock.t += 5000; expect(chat.post(A, 'ค่าย-A', 'ปลดแล้ว')).toMatchObject({ ok: true });
  });
  it('keeps 7 days or the newest 500, reported messages up to 30 days', () => {
    const { chat, clock, state } = host();
    chat.post(A, 'ค่าย-A', 'เก่ามาก'); chat.post(B, 'ค่าย-B', 'ถูกแจ้ง'); chat.report(C, 2, 'abuse');
    clock.t += CHAT_LIMITS.keepMs + 1; chat.post(C, 'ค่าย-C', 'ใหม่');
    expect(state.db.prepare('SELECT id FROM messages ORDER BY id').all().map(r => (r as { id: number }).id)).toEqual([2, 3]);
    clock.t += CHAT_LIMITS.keepReportedMs; chat.post(C, 'ค่าย-C', 'ใหม่กว่า');
    expect(state.db.prepare('SELECT COUNT(*) AS n FROM reports').get()).toEqual({ n: 0 });
    for (let i = 0; i < 520; i++) { clock.t += CHAT_LIMITS.gapMs * 20; chat.post(i % 2 ? A : B, 'x', `ข้อความที่ ${i}`); }
    expect(state.db.prepare('SELECT COUNT(*) AS n FROM messages').get()).toEqual({ n: CHAT_LIMITS.keepMessages });
  });
  it('purge removes what an account wrote, its reports and its mute', () => {
    const { chat } = host();
    chat.post(A, 'ค่าย-A', 'ของ A'); chat.post(B, 'ค่าย-B', 'ของ B'); chat.report(A, 2, 'spam'); chat.report(B, 1, 'spam'); chat.mute(A, 60, D);
    expect(chat.purge(A)).toBe(1);
    expect(chat.read(B, 0).messages.map(m => m.text)).toEqual(['ของ B']); expect(chat.admin()).toEqual({ rows: [], mutes: [] });
  });
});

// ---- through the Worker ----
const bearer = (token: string, json = false) => ({ Authorization: `Bearer ${token}`, 'CF-Connecting-IP': '198.51.100.9', ...(json ? { 'Content-Type': 'application/json' } : {}) });
const call = (s: Server, path: string, init: RequestInit = {}) => { s.clock.t += 5000; return handle(new Request(`https://api.test${path}`, init), s.deps); };
async function guest(s: Server, ip = '198.51.100.9') { return await (await call(s, '/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': ip } })).json() as { accountId: string; token: string }; }
const send = (s: Server, token: string, text: string) => call(s, '/v1/chat/send', { method: 'POST', headers: bearer(token, true), body: JSON.stringify({ text }) });
const read = async (s: Server, token: string, after = 0) => (await (await call(s, `/v1/chat?after=${after}`, { headers: bearer(token) })).json()) as { messages: { id: number; handle: string; text: string; mine: boolean }[]; write: string | null; muted: number | null };

describe('chat through the Worker', () => {
  it('a guest sends and reads; the answer never carries account ids; no content version or session is needed', async () => {
    const s = server(); const a = await guest(s); const b = await guest(s);
    const r = await send(s, a.token, 'สวัสดีค่ายทั้งหลาย'); expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ ok: true, message: { text: 'สวัสดีค่ายทั้งหลาย', mine: true } });
    const seen = await read(s, b.token); expect(seen.write).toBeNull();
    expect(seen.messages).toEqual([expect.objectContaining({ text: 'สวัสดีค่ายทั้งหลาย', mine: false, handle: await chatHandle(a.accountId) })]);
    expect(JSON.stringify(seen)).not.toContain(a.accountId);
    expect((await call(s, '/v1/chat')).status).toBe(401);
    expect((await send(s, a.token, 'ไปที่ www.scam.com')).status).toBe(422);
    s.clock.t += 5000; const fast = await send(s, a.token, 'หนึ่ง'); expect(fast.status).toBe(201);
    const again = await handle(new Request('https://api.test/v1/chat/send', { method: 'POST', headers: bearer(a.token, true), body: JSON.stringify({ text: 'สอง' }) }), s.deps);
    expect(again.status).toBe(429); expect(Number(again.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await call(s, '/v1/chat/send', { method: 'POST', headers: bearer(a.token, true), body: JSON.stringify({ text: 'x'.repeat(3000) }) })).status).toBe(413);
  });
  it('CHAT_WRITE linked/off and a deleting account block writing but still read', async () => {
    const s = server(); const a = await guest(s);
    s.deps.chatWrite = 'linked'; expect(await (await send(s, a.token, 'ทดสอบ')).json()).toEqual({ error: 'chat_linked_only' }); expect((await read(s, a.token)).write).toBe('chat_linked_only');
    s.deps.chatWrite = 'off'; expect((await send(s, a.token, 'ทดสอบ')).status).toBe(403);
    s.deps.chatWrite = 'all'; s.d1.db.prepare("UPDATE accounts SET status = 'deleting' WHERE id = ?").run(a.accountId);
    expect(await (await send(s, a.token, 'ทดสอบ')).json()).toEqual({ error: 'account_deleting' }); expect((await read(s, a.token)).write).toBe('account_deleting');
  });
  it('reports, admin review, hide and mute are admin-only and audited', async () => {
    const s = server(); const a = await guest(s); const b = await guest(s); const admin = await guest(s);
    await send(s, a.token, 'ข้อความที่ถูกแจ้ง'); const id = (await read(s, b.token)).messages[0]!.id;
    const rep = (t: string, body: unknown) => call(s, '/v1/chat/report', { method: 'POST', headers: bearer(t, true), body: JSON.stringify(body) });
    expect((await rep(b.token, { id, reason: 'abuse' })).status).toBe(200); expect((await rep(a.token, { id, reason: 'abuse' })).status).toBe(409);
    expect((await rep(b.token, { id, reason: 'bogus' })).status).toBe(400);
    expect((await call(s, '/v1/admin/chat', { headers: bearer(b.token) })).status).toBe(403);
    grantAdmin(s, admin.accountId);
    const list = await (await call(s, '/v1/admin/chat', { headers: bearer(admin.token) })).json() as { rows: { id: number; account: string; reports: number }[] };
    expect(list.rows).toEqual([expect.objectContaining({ id, account: a.accountId, reports: 1 })]);
    expect((await call(s, '/v1/admin/chat/hide', { method: 'POST', headers: bearer(admin.token, true), body: JSON.stringify({ id, hidden: true }) })).status).toBe(200);
    expect((await read(s, b.token)).messages).toHaveLength(0);
    const mute = await call(s, '/v1/admin/chat/mute', { method: 'POST', headers: bearer(admin.token, true), body: JSON.stringify({ accountId: a.accountId, minutes: 30 }) });
    expect(mute.status).toBe(200);
    const refused = await send(s, a.token, 'ยังพิมพ์ได้ไหม'); expect(refused.status).toBe(403); expect(await refused.json()).toMatchObject({ error: 'muted' });
    expect((await read(s, a.token)).muted).toBeGreaterThan(s.clock.t);
    const audit = s.d1.db.prepare('SELECT action, target FROM admin_audit ORDER BY rowid').all() as { action: string; target: string }[];
    expect(audit.map(r => r.action)).toEqual(['chat_read', 'chat_hide', 'chat_mute']); expect(audit[2]!.target).toBe(a.accountId);
  });
  it('the IP network send limit holds across accounts', async () => {
    const s = server(); const tokens: string[] = [];
    for (let i = 0; i < 8; i++) tokens.push((await guest(s, `203.0.113.${i}`)).token);
    let ok = 0, limited = 0;
    for (let i = 0; i < 40; i++) {
      const r = await handle(new Request('https://api.test/v1/chat/send', { method: 'POST', headers: { ...bearer(tokens[i % 8]!, true), 'CF-Connecting-IP': '192.0.2.50' }, body: JSON.stringify({ text: `ข้อความ ${i}` }) }), s.deps);
      s.clock.t += 600; if (r.status === 201) ok++; else if (r.status === 429) limited++;
    }
    expect(ok).toBeLessThanOrEqual(30); expect(limited).toBeGreaterThan(0);
  });
  it('a chat outage answers 503 chat_unavailable; account deletion purges chat first', async () => {
    const s = server(); const a = await guest(s);
    await send(s, a.token, 'ก่อนลบบัญชี');
    s.chat.up = false; expect(await (await call(s, '/v1/chat', { headers: bearer(a.token) })).json()).toEqual({ error: 'chat_unavailable' }); s.chat.up = true;
    // The Worker's purge hands the account to the chat object first (worker.ts purgeGame); the same order here.
    s.d1.db.prepare("UPDATE accounts SET status = 'deleting', delete_after = 0 WHERE id = ?").run(a.accountId);
    const report = await purgeDue(s.d1, async id => { const r = await s.deps.chat!.fetch(new Request('https://chat/purge', { method: 'POST', body: JSON.stringify({ account: id }) })); return r.status === 200; }, s.clock.t + 10 * 86_400_000);
    expect(report.purged).toBe(1); expect(s.chat.state.db.prepare('SELECT COUNT(*) AS n FROM messages').get()).toEqual({ n: 0 });
  });
});
