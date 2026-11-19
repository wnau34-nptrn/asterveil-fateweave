import { describe, expect, it } from 'vitest';
import { CHANNELS, dmChannel, mayRead } from '../src/core/chat/channels';
import {
  acceptOutcome, DM_LIMITS, FRIEND_CODE_ALPHABET, FRIEND_LIMITS, formatFriendCode, makeFriendCode, normalizeFriendCode, requestOutcome, type RequestFacts,
} from '../src/core/chat/friends';
import { handle } from '../src/server/api';
import { CHAT_LIMITS, chatHandle, ChatHost } from '../src/server/chat';
import { purgeDue } from '../src/server/deletion';
import { friendsOn } from '../src/server/worker';
import { fakeDurableState, grantAdmin, server, type Server } from './fixtures/server-fakes';

// OD-56 friends + private chat (docs/design/FRIENDS_TH.md): the pure rules, the `Chat` object's private channels and the
// Worker routes (auth, caps, rate limits, block, no enumeration, flag, purge on deletion).
const A = 'a'.repeat(32), B = 'b'.repeat(32), C = 'c'.repeat(32);

describe('friend rules (pure)', () => {
  it('friend codes: 8 unambiguous characters, typed in any case with dashes or spaces', () => {
    const code = makeFriendCode(new Uint8Array([0, 1, 2, 31, 32, 63, 200, 255]));
    expect(code).toBe('ABC9A9J9'); expect([...code].every(c => FRIEND_CODE_ALPHABET.includes(c))).toBe(true);
    expect(formatFriendCode(code)).toBe('ABC9-A9J9');
    expect(normalizeFriendCode(' abc9-a9j9 ')).toBe(code); expect(normalizeFriendCode('ABC9 A9J9')).toBe(code);
    for (const bad of ['ABC9AZJ', 'ABC9AZJ90', 'ABC0AZJ9', 'ABCIAZJ9', 42, null, 'x'.repeat(40)]) expect(normalizeFriendCode(bad)).toBeUndefined();
    expect(FRIEND_CODE_ALPHABET).not.toMatch(/[01IO]/);
  });
  const base: RequestFacts = { known: true, active: true, self: false, blockedByThem: false, blockedByMe: false, friends: false, outgoing: false, incoming: false, myFriends: 0, myOutgoing: 0, theirFriends: 0, theirIncoming: 0 };
  it('unknown, blocked-by-them, inactive and a full inbox all answer the same `unavailable`', () => {
    for (const f of [{ known: false }, { blockedByThem: true }, { active: false }, { theirIncoming: FRIEND_LIMITS.maxIncoming }, { blockedByThem: true, self: true }])
      expect(requestOutcome({ ...base, ...f })).toBe('unavailable');
    expect(requestOutcome(base)).toBe('sent');
  });
  it('self, own block, already friends, already sent, caps, and a crossing request accepts', () => {
    expect(requestOutcome({ ...base, self: true })).toBe('self');
    expect(requestOutcome({ ...base, blockedByMe: true })).toBe('blocked_by_you');
    expect(requestOutcome({ ...base, friends: true })).toBe('already_friends');
    expect(requestOutcome({ ...base, outgoing: true })).toBe('already_sent');
    expect(requestOutcome({ ...base, myFriends: FRIEND_LIMITS.maxFriends })).toBe('list_full');
    expect(requestOutcome({ ...base, myOutgoing: FRIEND_LIMITS.maxOutgoing })).toBe('too_many_requests');
    expect(requestOutcome({ ...base, incoming: true })).toBe('accepted');
    expect(requestOutcome({ ...base, incoming: true, myFriends: FRIEND_LIMITS.maxFriends })).toBe('list_full');
    expect(requestOutcome({ ...base, incoming: true, theirFriends: FRIEND_LIMITS.maxFriends })).toBe('unavailable');
    expect(acceptOutcome(0, 0)).toBe('accepted'); expect(acceptOutcome(50, 0)).toBe('list_full'); expect(acceptOutcome(3, 50)).toBe('their_list_full');
  });
  it('the private channel id is derived from the two accounts, the same for both, and only they may read it', () => {
    expect(CHANNELS.dm.open).toBe(true); expect(CHANNELS.guild.open).toBe(false);
    const ch = dmChannel(B, A)!; expect(ch).toBe(dmChannel(A, B)); expect(mayRead(ch, A)).toBe(true); expect(mayRead(ch, C)).toBe(false);
    expect(friendsOn(undefined)).toBe(true); expect(friendsOn('on')).toBe(true); expect(friendsOn(' off ')).toBe(false);
  });
});

function host() { const clock = { t: 50_000_000 }; const state = fakeDurableState(); return { clock, state, chat: new ChatHost(state, () => clock.t) }; }

describe('Chat object: private channels', () => {
  const AB = dmChannel(A, B)!, AC = dmChannel(A, C)!;
  it('keeps conversations apart from the world and from each other; stricter pace, counted over all private ones', () => {
    const { chat, clock } = host();
    expect(chat.post(A, 'ค่าย-A', 'โลก')).toMatchObject({ ok: true });
    expect(chat.post(A, 'ค่าย-A', 'ถึง B', AB)).toMatchObject({ ok: true }); // the world pace does not hold the private one
    expect(chat.post(A, 'ค่าย-A', 'ถึง C', AC)).toEqual({ ok: false, error: 'too_fast', retryAfter: 2 });
    clock.t += DM_LIMITS.gapMs; expect(chat.post(A, 'ค่าย-A', 'ถึง C', AC)).toMatchObject({ ok: true });
    expect(chat.read(B, 0).messages.map(m => m.text)).toEqual(['โลก']);
    expect(chat.read(B, 0, AB).messages.map(m => m.text)).toEqual(['ถึง B']);
    expect(chat.read(C, 0, AC).messages.map(m => m.text)).toEqual(['ถึง C']);
    // 20 a minute over all private conversations.
    for (let i = 2; i < DM_LIMITS.perMinute; i++) { clock.t += DM_LIMITS.gapMs; expect(chat.post(A, 'ค่าย-A', `ข้อ ${i}`, i % 2 ? AB : AC)).toMatchObject({ ok: true }); }
    clock.t += DM_LIMITS.gapMs; expect(chat.post(A, 'ค่าย-A', 'เกิน', AB)).toMatchObject({ ok: false, error: 'too_fast', retryAfter: 60 });
    expect(chat.post(A, 'ค่าย-A', 'xyz', 'dm:bad')).toEqual({ ok: false, error: 'channel_closed' });
    expect(chat.post(A, 'ค่าย-A', 'กิลด์', `guild:${'1'.repeat(16)}`)).toEqual({ ok: false, error: 'channel_closed' });
  });
  it('unread counts the other side\'s messages after the read marker; reading clears it; own sends never count', () => {
    const { chat, clock } = host();
    chat.post(A, 'ค่าย-A', 'หนึ่ง', AB); clock.t += 3000; chat.post(A, 'ค่าย-A', 'สอง', AB);
    expect(chat.unread(B, [AB, AC])).toEqual({ [AB]: 2, [AC]: 0 }); expect(chat.unread(A, [AB])).toEqual({ [AB]: 0 });
    chat.read(B, 0, AB); expect(chat.unread(B, [AB])).toEqual({ [AB]: 0 });
    clock.t += 3000; chat.post(A, 'ค่าย-A', 'อีก', AB); clock.t += 3000; chat.post(B, 'ค่าย-B', 'ตอบ', AB); // replying counts as read
    expect(chat.unread(B, [AB])).toEqual({ [AB]: 0 }); expect(chat.unread(A, [AB])).toEqual({ [AB]: 1 });
    chat.read(A, 0, AB);
    clock.t += 3000; chat.post(A, 'ค่าย-A', 'สาม', AB); expect(chat.unread(B, [AB])).toEqual({ [AB]: 1 });
    expect(chat.unread(B, ['world', 'dm:x'])).toEqual({});
  });
  it('keeps 200 per conversation without touching the world; a world report cannot reach a private message', () => {
    const { chat, clock, state } = host();
    chat.post(C, 'ค่าย-C', 'โลกเก่า');
    for (let i = 0; i < 230; i++) { clock.t += 4000; chat.post(i % 2 ? A : B, 'x', `ส่วนตัว ${i}`, AB); }
    expect(state.db.prepare('SELECT COUNT(*) AS n FROM messages WHERE channel = ?').get(AB)).toEqual({ n: DM_LIMITS.keepMessages });
    expect(chat.read(A, 0).messages.map(m => m.text)).toEqual(['โลกเก่า']);
    const last = chat.read(A, 0, AB).messages.at(-1)!;
    expect(chat.report(A, last.id, 'abuse')).toBe('no_message');
    expect(chat.report(C, 1, 'abuse', AB)).toBe('no_message');
    clock.t += DM_LIMITS.keepMs + 1; chat.post(C, 'ค่าย-C', 'ใหม่');
    expect(state.db.prepare('SELECT COUNT(*) AS n FROM messages WHERE channel = ?').get(AB)).toEqual({ n: 0 });
    expect(CHAT_LIMITS.keepMessages).toBe(500);
  });
  it('a private report keeps a few messages of context for the admin; never the whole conversation', () => {
    const { chat, clock } = host();
    for (let i = 0; i < 8; i++) { clock.t += 3000; chat.post(i % 2 ? A : B, i % 2 ? 'ค่าย-A' : 'ค่าย-B', `บท ${i}`, AB); }
    const bad = chat.read(B, 0, AB).messages.at(-1)!; // A's last line
    expect(chat.report(A, bad.id, 'abuse', AB)).toBe('own');
    expect(chat.report(B, bad.id, 'abuse', AB)).toBe('reported');
    const rows = chat.admin().rows; expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: bad.id, channel: 'dm', text: 'บท 7', reports: 1 });
    expect(rows[0]!.context!.map(c => c.text)).toEqual(['บท 2', 'บท 3', 'บท 4', 'บท 5', 'บท 6']);
    expect(chat.read(A, 0, AB).messages).toHaveLength(8); // one report does not hide it in a two-person room
  });
  it('purge removes every private conversation of the account (both sides), its markers and report context', () => {
    const { chat, clock, state } = host();
    chat.post(A, 'ค่าย-A', 'ถึง B', AB); clock.t += 3000; chat.post(B, 'ค่าย-B', 'ถึง A', AB);
    clock.t += 3000; chat.post(B, 'ค่าย-B', 'ถึง C', dmChannel(B, C)); chat.read(B, 0, AB);
    clock.t += 3000; chat.post(A, 'ค่าย-A', 'ร้าย', AB); chat.report(B, 4, 'abuse', AB);
    chat.purge(A);
    expect(state.db.prepare('SELECT channel, text FROM messages').all()).toEqual([{ channel: dmChannel(B, C), text: 'ถึง C' }]);
    expect(state.db.prepare('SELECT COUNT(*) AS n FROM reads WHERE channel = ?').get(AB)).toEqual({ n: 0 });
    expect(state.db.prepare('SELECT COUNT(*) AS n FROM report_context').get()).toEqual({ n: 0 });
  });
});

// ---- through the Worker ----
const IP = '198.51.100.9';
const headers = (token: string, json = false, ip = IP) => ({ Authorization: `Bearer ${token}`, 'CF-Connecting-IP': ip, ...(json ? { 'Content-Type': 'application/json' } : {}) });
const call = (s: Server, path: string, init: RequestInit = {}) => { s.clock.t += 3000; return handle(new Request(`https://api.test${path}`, init), s.deps); };
let ipn = 0;
async function guest(s: Server) { return await (await call(s, '/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': `203.0.113.${++ipn % 250}` } })).json() as { accountId: string; token: string }; }
const post = (s: Server, token: string, path: string, body: unknown, ip = IP) => call(s, path, { method: 'POST', headers: headers(token, true, ip), body: JSON.stringify(body) });
interface Entry { ref: string; handle: string; at: number }
interface Overview { code: string; friends: (Omit<Entry, 'at'> & { since: number; unread: number })[]; incoming: Entry[]; outgoing: Entry[]; blocked: Entry[]; unread: number }
const list = async (s: Server, token: string) => { const r = await call(s, '/v1/friends', { headers: headers(token) }); expect(r.status).toBe(200); return await r.json() as Overview; };
async function befriend(s: Server, a: { token: string }, b: { token: string }) {
  const code = (await list(s, b.token)).code;
  expect((await post(s, a.token, '/v1/friends/request', { code })).status).toBe(201);
  const ref = (await list(s, b.token)).incoming[0]!.ref;
  expect(await (await post(s, b.token, '/v1/friends/respond', { ref, accept: true })).json()).toEqual({ status: 'friends' });
  return { aRef: (await list(s, a.token)).friends.at(-1)!.ref, bRef: (await list(s, b.token)).friends.at(-1)!.ref };
}
const dmSend = (s: Server, token: string, friend: string, text: string) => { s.clock.t += 2500; return post(s, token, '/v1/chat/send', { channel: 'dm', friend, text }); };
const dmRead = async (s: Server, token: string, friend: string) => call(s, `/v1/chat?channel=dm&friend=${friend}`, { headers: headers(token) });

describe('friends through the Worker', () => {
  it('a code, a request, accept: both lists show the other by handle only; no account id ever reaches a device', async () => {
    const s = server(); const a = await guest(s); const b = await guest(s);
    expect((await call(s, '/v1/friends')).status).toBe(401);
    const mine = await list(s, b.token); expect(mine.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/); expect((await list(s, b.token)).code).toBe(mine.code);
    const r = await post(s, a.token, '/v1/friends/request', { code: mine.code.toLowerCase() }); expect(r.status).toBe(201);
    expect((await post(s, a.token, '/v1/friends/request', { code: mine.code })).status).toBe(201); // repeat: same answer, one row
    const la = await list(s, a.token), lb = await list(s, b.token);
    expect(la.outgoing).toEqual([expect.objectContaining({ handle: await chatHandle(b.accountId) })]);
    expect(lb.incoming).toEqual([expect.objectContaining({ handle: await chatHandle(a.accountId) })]);
    for (const v of [la, lb]) { const t = JSON.stringify(v); expect(t).not.toContain(a.accountId); expect(t).not.toContain(b.accountId); }
    expect(lb.incoming[0]!.ref).toMatch(/^[0-9a-f]{16}$/);
    // Someone else's ref names nothing for this account.
    expect((await post(s, a.token, '/v1/friends/respond', { ref: lb.incoming[0]!.ref, accept: true })).status).toBe(404);
    expect(await (await post(s, b.token, '/v1/friends/respond', { ref: lb.incoming[0]!.ref, accept: true })).json()).toEqual({ status: 'friends' });
    expect((await list(s, a.token)).friends.map(f => f.handle)).toEqual([await chatHandle(b.accountId)]);
    expect((await post(s, a.token, '/v1/friends/request', { code: mine.code })).status).toBe(409);
    expect(await (await post(s, a.token, '/v1/friends/request', { code: (await list(s, a.token)).code })).json()).toEqual({ error: 'friend_self' });
    expect((await post(s, a.token, '/v1/friends/request', { code: 'nope' })).status).toBe(400);
  });
  it('unknown codes and codes of a camp that blocked you answer exactly the same; crossing requests become friends', async () => {
    const s = server(); const a = await guest(s); const b = await guest(s); const c = await guest(s);
    const unknown = await post(s, a.token, '/v1/friends/request', { code: 'ZZZZ-ZZZZ' });
    // C asks A, A blocks C from the request; then C's request by A's code looks like an unknown code.
    expect((await post(s, c.token, '/v1/friends/request', { code: (await list(s, a.token)).code })).status).toBe(201);
    const inc = (await list(s, a.token)).incoming[0]!.ref;
    expect((await post(s, a.token, '/v1/friends/block', { ref: inc })).status).toBe(200);
    const blocked = await post(s, c.token, '/v1/friends/request', { code: (await list(s, a.token)).code });
    expect([unknown.status, await unknown.json()]).toEqual([blocked.status, await blocked.json()]);
    expect(blocked.status).toBe(404);
    expect((await list(s, c.token)).outgoing).toEqual([]);
    expect((await list(s, a.token)).blocked).toEqual([expect.objectContaining({ handle: await chatHandle(c.accountId) })]);
    // A sees its own block clearly; unblock lets C ask again.
    expect(await (await post(s, a.token, '/v1/friends/request', { code: (await list(s, c.token)).code })).json()).toEqual({ error: 'blocked_by_you' });
    expect((await post(s, a.token, '/v1/friends/unblock', { ref: (await list(s, a.token)).blocked[0]!.ref })).status).toBe(200);
    expect((await post(s, c.token, '/v1/friends/request', { code: (await list(s, a.token)).code })).status).toBe(201);
    // Crossing: B asks A, then A asks B by code: friends at once.
    expect((await post(s, b.token, '/v1/friends/request', { code: (await list(s, a.token)).code })).status).toBe(201);
    expect(await (await post(s, a.token, '/v1/friends/request', { code: (await list(s, b.token)).code })).json()).toEqual({ status: 'friends' });
  });
  it('decline, cancel, remove: both sides\' lists follow', async () => {
    const s = server(); const a = await guest(s); const b = await guest(s);
    await post(s, a.token, '/v1/friends/request', { code: (await list(s, b.token)).code });
    expect(await (await post(s, b.token, '/v1/friends/respond', { ref: (await list(s, b.token)).incoming[0]!.ref, accept: false })).json()).toEqual({ status: 'declined' });
    expect((await list(s, a.token)).outgoing).toEqual([]);
    await post(s, a.token, '/v1/friends/request', { code: (await list(s, b.token)).code });
    expect((await post(s, a.token, '/v1/friends/cancel', { ref: (await list(s, a.token)).outgoing[0]!.ref })).status).toBe(200);
    expect((await list(s, b.token)).incoming).toEqual([]);
    const { aRef } = await befriend(s, a, b);
    expect((await post(s, a.token, '/v1/friends/remove', { ref: aRef })).status).toBe(200);
    expect((await list(s, b.token)).friends).toEqual([]);
    expect((await post(s, a.token, '/v1/friends/remove', { ref: aRef })).status).toBe(404);
    expect((await post(s, a.token, '/v1/friends/remove', { ref: 'not-a-ref' })).status).toBe(400);
  });
  it('caps: friend list, pending requests, and the rate limits on code lookups (account and IP network)', async () => {
    const s = server(); const a = await guest(s);
    // Outgoing cap: fill A's pending list straight in D1 (draft 20).
    for (let i = 0; i < FRIEND_LIMITS.maxOutgoing; i++) s.d1.db.prepare('INSERT INTO friend_requests (from_id, to_id, ref, at) VALUES (?, ?, ?, ?)').run(a.accountId, `${i}`.padStart(32, 'e'), `${i}`.padStart(16, 'f'), 1);
    const b = await guest(s);
    expect(await (await post(s, a.token, '/v1/friends/request', { code: (await list(s, b.token)).code })).json()).toEqual({ error: 'too_many_requests' });
    s.d1.db.prepare('DELETE FROM friend_requests').run();
    for (let i = 0; i < FRIEND_LIMITS.maxFriends; i++) s.d1.db.prepare('INSERT INTO friends (account_id, friend_id, ref, since) VALUES (?, ?, ?, ?)').run(a.accountId, `${i}`.padStart(32, 'e'), `${i}`.padStart(16, 'f'), 1);
    expect(await (await post(s, a.token, '/v1/friends/request', { code: (await list(s, b.token)).code })).json()).toEqual({ error: 'friend_list_full' });
    // B's request to a full A can be sent, but accepting it is refused for the full side.
    await post(s, b.token, '/v1/friends/request', { code: (await list(s, a.token)).code });
    expect(await (await post(s, a.token, '/v1/friends/respond', { ref: (await list(s, a.token)).incoming[0]!.ref, accept: true })).json()).toEqual({ error: 'friend_list_full' });
    // Lookups: 10 per account in 10 minutes (counted before the answer, so wrong codes count too).
    const c = await guest(s); let ok = 0, limited = 0;
    for (let i = 0; i < 14; i++) { const r = await post(s, c.token, '/v1/friends/request', { code: `ZZZZ-ZZ${'ABCDEFGHJKLMNP'[i]}Z` }); if (r.status === 404) ok++; else if (r.status === 429) limited++; }
    expect([ok, limited]).toEqual([FRIEND_LIMITS.codePer10Minutes, 4]);
    // 30 an hour per IP network across accounts.
    const many = []; for (let i = 0; i < 4; i++) many.push(await guest(s));
    let ipOk = 0;
    for (let i = 0; i < 40; i++) { const r = await post(s, many[i % 4]!.token, '/v1/friends/request', { code: 'YYYY-YYYY' }, '192.0.2.77'); if (r.status === 404) ipOk++; }
    expect(ipOk).toBe(FRIEND_LIMITS.codePerIpHour);
  });
  it('private chat: mutual friends only, both ways, unread per friend; a block stops it and is account-wide', async () => {
    const s = server(); const a = await guest(s); const b = await guest(s); const c = await guest(s);
    const { aRef, bRef } = await befriend(s, a, b);
    expect((await dmSend(s, a.token, aRef, 'สวัสดี B')).status).toBe(201);
    expect((await list(s, b.token)).friends[0]).toMatchObject({ unread: 1 }); expect((await list(s, b.token)).unread).toBe(1);
    const rb = await dmRead(s, b.token, bRef); expect(rb.status).toBe(200);
    const seen = await rb.json() as { messages: { text: string; mine: boolean; handle: string }[] };
    expect(seen.messages).toEqual([expect.objectContaining({ text: 'สวัสดี B', mine: false, handle: await chatHandle(a.accountId) })]);
    expect(JSON.stringify(seen)).not.toContain(a.accountId);
    expect((await list(s, b.token)).unread).toBe(0);
    expect((await dmSend(s, b.token, bRef, 'หวัดดี A')).status).toBe(201);
    // World stays separate.
    expect((await (await call(s, '/v1/chat', { headers: headers(c.token) })).json() as { messages: unknown[] }).messages).toEqual([]);
    // A stranger cannot use a friend's ref; a missing ref is a bad request; filter and 160 characters hold.
    expect(await (await dmSend(s, c.token, aRef, 'แอบ')).json()).toEqual({ error: 'not_friends' });
    expect((await post(s, a.token, '/v1/chat/send', { channel: 'dm', text: 'ไม่มีเพื่อน' })).status).toBe(400);
    expect((await dmSend(s, a.token, aRef, 'ไป www.scam.com')).status).toBe(422);
    expect((await dmSend(s, a.token, aRef, 'ก'.repeat(161))).status).toBe(422);
    // Report with context.
    const id = (await (await dmRead(s, b.token, bRef)).json() as { messages: { id: number; mine: boolean }[] }).messages.find(m => !m.mine)!.id;
    expect((await post(s, b.token, '/v1/chat/report', { channel: 'dm', friend: bRef, id, reason: 'abuse' })).status).toBe(200);
    expect((await post(s, b.token, '/v1/chat/report', { id, reason: 'abuse' })).status).toBe(404); // not through the world
    // B blocks A: no more messages either way, A's list loses B, B's code is unavailable to A.
    expect((await post(s, b.token, '/v1/friends/block', { ref: bRef })).status).toBe(200);
    expect(await (await dmSend(s, a.token, aRef, 'ยังอยู่ไหม')).json()).toEqual({ error: 'not_friends' });
    expect((await dmRead(s, a.token, aRef)).status).toBe(403);
    expect((await list(s, a.token)).friends).toEqual([]);
    expect((await post(s, a.token, '/v1/friends/request', { code: (await list(s, b.token)).code })).status).toBe(404);
    // A second device of B (a new token for the same account) sees the same block.
    const second = await (await call(s, '/v1/recovery-code', { method: 'POST', headers: headers(b.token) })).json() as { code: string };
    const t2 = `${'9'.repeat(32)}.${'8'.repeat(64)}`;
    expect((await call(s, '/v1/recover', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.200' }, body: JSON.stringify({ code: second.code, token: t2 }) })).status).toBe(200);
    expect((await list(s, t2)).blocked).toHaveLength(1);
  });
  it('admin reads only reported private messages (with context), audited', async () => {
    const s = server(); const a = await guest(s); const b = await guest(s); const admin = await guest(s);
    const { aRef, bRef } = await befriend(s, a, b);
    await dmSend(s, a.token, aRef, 'ข้อความปกติ'); await dmSend(s, b.token, bRef, 'คุยกัน'); await dmSend(s, a.token, aRef, 'ข้อความแย่');
    grantAdmin(s, admin.accountId);
    const before = await (await call(s, '/v1/admin/chat', { headers: headers(admin.token) })).json() as { rows: unknown[] };
    expect(before.rows).toEqual([]);
    const msgs = (await (await dmRead(s, b.token, bRef)).json() as { messages: { id: number; text: string }[] }).messages;
    await post(s, b.token, '/v1/chat/report', { channel: 'dm', friend: bRef, id: msgs.at(-1)!.id, reason: 'abuse' });
    const after = await (await call(s, '/v1/admin/chat', { headers: headers(admin.token) })).json() as { rows: { text: string; channel: string; context: { text: string }[] }[] };
    expect(after.rows).toEqual([expect.objectContaining({ text: 'ข้อความแย่', channel: 'dm', context: [expect.objectContaining({ text: 'ข้อความปกติ' }), expect.objectContaining({ text: 'คุยกัน' })] })]);
    expect((s.d1.db.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE action = 'chat_read'").get() as { n: number }).n).toBe(2);
  });
  it('FRIENDS=off closes the friend routes and private chat, the world chat stays; a deleting account cannot use them', async () => {
    const s = server(); const a = await guest(s); const b = await guest(s);
    const { aRef } = await befriend(s, a, b);
    s.deps.friends = false;
    expect(await (await call(s, '/v1/friends', { headers: headers(a.token) })).json()).toEqual({ error: 'friends_off' });
    expect(await (await dmSend(s, a.token, aRef, 'ปิดอยู่')).json()).toEqual({ error: 'friends_off' });
    expect((await post(s, a.token, '/v1/chat/send', { text: 'โลกยังเปิด' })).status).toBe(201);
    s.deps.friends = true;
    s.d1.db.prepare("UPDATE accounts SET status = 'deleting', delete_after = ? WHERE id = ?").run(s.clock.t + 1e9, a.accountId);
    expect(await (await call(s, '/v1/friends', { headers: headers(a.token) })).json()).toEqual({ error: 'account_deleting' });
    // While A waits for deletion B's list leaves A out and messages to A are refused.
    expect((await list(s, b.token)).friends).toEqual([]);
  });
  it('account deletion purges the friend code, edges on both sides, requests, blocks and private messages', async () => {
    const s = server(); const a = await guest(s); const b = await guest(s); const c = await guest(s);
    const { aRef } = await befriend(s, a, b);
    await dmSend(s, a.token, aRef, 'ก่อนลบ');
    await post(s, a.token, '/v1/friends/request', { code: (await list(s, c.token)).code });
    await post(s, c.token, '/v1/friends/block', { ref: (await list(s, c.token)).incoming[0]!.ref });
    s.d1.db.prepare("UPDATE accounts SET status = 'deleting', delete_after = 0 WHERE id = ?").run(a.accountId);
    const report = await purgeDue(s.d1, async id => (await s.deps.chat!.fetch(new Request('https://chat/purge', { method: 'POST', body: JSON.stringify({ account: id }) }))).status === 200, s.clock.t + 10 * 86_400_000);
    expect(report.purged).toBe(1);
    for (const t of ['friend_codes', 'friends', 'friend_requests', 'friend_blocks'])
      expect(s.d1.db.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE ${t === 'friend_codes' ? 'account_id' : t === 'friends' ? 'account_id = ?1 OR friend_id' : t === 'friend_requests' ? 'from_id = ?1 OR to_id' : 'account_id = ?1 OR blocked_id'} = ?1`).get(a.accountId)).toEqual({ n: 0 });
    expect((await list(s, b.token)).friends).toEqual([]); expect((await list(s, c.token)).blocked).toEqual([]);
    expect(s.chat.state.db.prepare("SELECT COUNT(*) AS n FROM messages WHERE channel LIKE 'dm:%'").get()).toEqual({ n: 0 });
  });
  it('a new code replaces the old one (the old one stops working), limited a day', async () => {
    const s = server(); const a = await guest(s); const b = await guest(s);
    const old = (await list(s, b.token)).code;
    const r = await post(s, b.token, '/v1/friends/code', {}); expect(r.status).toBe(200);
    const fresh = (await r.json() as { code: string }).code; expect(fresh).not.toBe(old); expect((await list(s, b.token)).code).toBe(fresh);
    expect((await post(s, a.token, '/v1/friends/request', { code: old })).status).toBe(404);
    expect((await post(s, a.token, '/v1/friends/request', { code: fresh })).status).toBe(201);
    for (let i = 0; i < FRIEND_LIMITS.rotatePerDay - 1; i++) expect((await post(s, b.token, '/v1/friends/code', {})).status).toBe(200);
    expect((await post(s, b.token, '/v1/friends/code', {})).status).toBe(429);
  });
});
