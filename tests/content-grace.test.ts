import { describe, expect, it } from 'vitest';
import { graceList, readLive, GRACE_HOURS } from '../scripts/content-grace.mjs';
import { SESSION_HEADER } from '../src/server/account-object';
import { CONTENT_HEADER, contentAccepted, handle } from '../src/server/api';
import { contentGrace } from '../src/server/worker';
import { readLiveBuild, watchForUpdate } from '../src/platform/update-check';
import { server, type Server } from './fixtures/server-fakes';

// Deploy grace (owner 2026-11-20, docs/design/p09/CONTENT_GRACE_TH.md): the API takes the versions it replaced for a few
// hours, the deploy chains them from the live API's own answer, and an open page learns that a newer build is live.
const V1 = '1111111111111111', V2 = '2222222222222222', V3 = '3333333333333333', V4 = '4444444444444444', V5 = '5555555555555555';
const NOW = Date.UTC(2026, 10, 20, 12);
async function guestToken(s: Server) { return await (await handle(new Request('https://api.test/v1/guest', { method: 'POST' }), s.deps)).json() as { accountId: string; token: string }; }

describe('graceList (the deploy step)', () => {
  it('the version the API runs now is accepted after the deploy, for 3 hours', () => {
    expect(graceList({ live: { server: V1 }, next: V2, now: NOW })).toEqual({ previous: [V1], until: new Date(NOW + GRACE_HOURS * 3_600_000).toISOString() });
  });
  it('chains the versions the live API still accepts, without the new one, at most 3', () => {
    const live = { server: V2, previous: [V1, V3], until: NOW + 1000 };
    expect(graceList({ live, next: V4, now: NOW }).previous).toEqual([V2, V1, V3]);
    expect(graceList({ live: { server: V3, previous: [V2, V1, V4], until: NOW + 1000 }, next: V5, now: NOW }).previous).toEqual([V3, V2, V1]);
    // A redeploy of the same content keeps the chain and never lists the new version.
    expect(graceList({ live, next: V2, now: NOW }).previous).toEqual([V1, V3]);
  });
  it('an ended chain, an unreadable API, a malformed answer or `off` give no grace', () => {
    expect(graceList({ live: { server: V2, previous: [V1], until: NOW - 1 }, next: V3, now: NOW }).previous).toEqual([V2]);
    expect(graceList({ live: undefined, next: V2, now: NOW })).toEqual({ previous: [], until: '' });
    expect(graceList({ live: { server: 'zzz' }, next: V2, now: NOW }).previous).toEqual([]);
    expect(graceList({ live: { server: V1 }, next: V2, now: NOW, off: true })).toEqual({ previous: [], until: '' });
    expect(graceList({ live: { server: V2 }, next: V2, now: NOW }).previous).toEqual([]);
  });
  it('reads the live API from its 409 answer and treats anything else as unreadable', async () => {
    const answer = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
    expect(await readLive('https://api', answer(409, { error: 'content_version', server: V1, previous: [V2], until: 5 }))).toEqual({ server: V1, previous: [V2], until: 5 });
    expect(await readLive('https://api', answer(200, {}))).toBeUndefined();
    expect(await readLive('https://api', (async () => { throw new Error('down'); }) as unknown as typeof fetch)).toBeUndefined();
  });
});

describe('the API accepts earlier versions only during the grace', () => {
  it('contentAccepted: the current version always, a previous one until the end, nothing else', () => {
    const deps = { contentVersion: V2, previousVersions: [V1], previousUntil: NOW + 1000 };
    expect(contentAccepted(deps, V2, NOW)).toBe(true); expect(contentAccepted(deps, V1, NOW)).toBe(true);
    expect(contentAccepted(deps, V1, NOW + 1000)).toBe(false); expect(contentAccepted(deps, V3, NOW)).toBe(false); expect(contentAccepted(deps, null, NOW)).toBe(false);
    expect(contentAccepted({ contentVersion: V2 }, V1, NOW)).toBe(false);
  });
  it('contentGrace reads the Worker variables and ignores anything malformed', () => {
    const until = new Date(NOW).toISOString();
    expect(contentGrace({ CONTENT_PREVIOUS: `${V1}, ${V2}`, CONTENT_PREVIOUS_UNTIL: until })).toEqual({ previousVersions: [V1, V2], previousUntil: NOW });
    for (const bad of [{}, { CONTENT_PREVIOUS: V1 }, { CONTENT_PREVIOUS: 'nope', CONTENT_PREVIOUS_UNTIL: until }, { CONTENT_PREVIOUS: V1, CONTENT_PREVIOUS_UNTIL: 'never' }, { CONTENT_PREVIOUS: [V1, V2, V3, V4].join(','), CONTENT_PREVIOUS_UNTIL: until }])
      expect(contentGrace(bad)).toBeUndefined();
  });
  it('through the Worker: a page on the previous version plays during the grace, is refused after, and the 409 names the chain', async () => {
    const s = server(undefined, V2); const { token } = await guestToken(s);
    const state = (version: string) => handle(new Request('https://api.test/v1/state', { headers: { Authorization: `Bearer ${token}`, [CONTENT_HEADER]: version, [SESSION_HEADER]: 'a'.repeat(32) } }), s.deps);
    expect((await state(V1)).status).toBe(409); expect(await (await state(V1)).json()).toEqual({ error: 'content_version', server: V2 });
    s.deps.previousVersions = [V1]; s.deps.previousUntil = s.clock.t + 60_000;
    expect((await state(V1)).status).toBe(200); expect((await state(V2)).status).toBe(200);
    const other = await state(V3); expect(other.status).toBe(409);
    expect(await other.json()).toEqual({ error: 'content_version', server: V2, previous: [V1], until: s.deps.previousUntil });
    s.clock.t += 120_000; expect((await state(V1)).status).toBe(409);
  });
});

describe('the open page learns that a newer build is live', () => {
  const live = (body: unknown, ok = true) => (async () => new Response(JSON.stringify(body), { status: ok ? 200 : 404 })) as unknown as typeof fetch;
  it('reads version.json, ignoring anything that is not a build id', async () => {
    expect(await readLiveBuild('/', live({ build: 'abcdef012345', content: V1 }))).toEqual({ build: 'abcdef012345' });
    expect(await readLiveBuild('/', live({ build: 'not a build' }))).toBeUndefined(); expect(await readLiveBuild('/', live({}, false))).toBeUndefined();
  });
  it('tells once per newer build, never for the running one, and stays quiet while hidden', async () => {
    const doc = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} } as unknown as Document;
    const seen: string[] = []; let build = 'aaaaaaaaaaaa';
    const get = (async () => new Response(JSON.stringify({ build }))) as unknown as typeof fetch;
    const stop = watchForUpdate({ running: 'aaaaaaaaaaaa', base: '/', onNew: b => seen.push(b), get, intervalMs: 10, doc });
    await new Promise(r => setTimeout(r, 30)); expect(seen).toEqual([]);
    build = 'bbbbbbbbbbbb'; await new Promise(r => setTimeout(r, 40)); expect(seen).toEqual(['bbbbbbbbbbbb']);
    build = 'cccccccccccc'; await new Promise(r => setTimeout(r, 40)); expect(seen).toEqual(['bbbbbbbbbbbb', 'cccccccccccc']);
    stop();
  });
});
