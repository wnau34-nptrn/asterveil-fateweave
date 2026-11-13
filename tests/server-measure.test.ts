import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { encounterById } from '../src/content/encounters/catalog';
import { handle } from '../src/server/api';
import { GAME_CONTEXT } from '../src/server/worker';
import { currentSave } from './fixtures/current-save';
import { grantAdmin, server, storedGame } from './fixtures/server-fakes';
import { measure, measureImport, summary, type Transport } from './fixtures/server-measure';

// P09-02d/02f: long battles, the replay audit on a long log and a one-time import (owner D8 inputs). In process with
// SERVER_MEASURE=1 (Node timings, SQLite in memory); against the deployed dev Worker with MEASURE_URL + MEASURE_CONTENT
// (the deploy workflow runs it while Workers Tail records CPU per request). Off in the normal test run.
// `/v1/verify` is admin-only (P09-02f): remotely the measured account is made an admin with `wrangler d1 execute`
// (ADMIN_D1_CONFIG = the deploy config) and the row is removed afterwards; Wrangler's output is never shown.
const remote = process.env.MEASURE_URL;
const ACCOUNT = /^[0-9a-f]{32}$/;
function d1(sql: string) {
  const config = process.env.ADMIN_D1_CONFIG;
  if (!config) throw new Error('ADMIN_D1_CONFIG unset');
  try { execFileSync('npx', ['--yes', 'wrangler@4.153.0', 'd1', 'execute', 'DB', '--remote', '--config', config, '--command', sql], { stdio: 'ignore', timeout: 120_000 }); }
  catch { throw new Error('wrangler d1 execute failed (output hidden)'); }
}
const remoteAdmin = {
  grant: (id: string) => { if (!ACCOUNT.test(id)) throw new Error('bad account id'); d1(`INSERT OR IGNORE INTO admins (account_id, granted_at, note) VALUES ('${id}', ${Date.now()}, 'ci measure')`); },
  done: (id: string) => { if (ACCOUNT.test(id)) d1(`DELETE FROM admins WHERE account_id = '${id}'`); },
};
const lines = (rows: readonly { label: string; status: unknown; bytes: number; ms: number }[]) => rows.filter(r => r.label !== 'guest' && r.label !== 'session').map(r => `${r.label}\t${String(r.status)}\t${r.bytes} B\t${r.ms} ms`).join('\n');
const randomSeeds = (n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)));

// A realistic late local save: a fresh account played in process to a long log (random seeds, so every run's save has a
// new fingerprint), written the way the browser writes its save.
async function lateSave(commands: number): Promise<string> {
  const s = server(randomSeeds(4000));
  await measure((path, init) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); }, 'test-content-1', { logTarget: commands, verifyAt: [] });
  return currentSave(storedGame(s, [...s.objects.keys()][0]!)!);
}

describe.runIf(process.env.SERVER_MEASURE === '1' || !!remote)('P09-02d long battle / long log measurement', () => {
  it('plays a fresh account to a long log and audits it', async () => {
    const logTarget = Number(process.env.MEASURE_LOG ?? 300);
    if (remote) {
      const version = process.env.MEASURE_CONTENT ?? '';
      const send: Transport = (path, init) => fetch(new URL(path, remote), { ...init, signal: AbortSignal.timeout(30_000) });
      const admin = process.env.ADMIN_D1_CONFIG ? remoteAdmin : {};
      // Stay under the per-account limit of 10 commands a second.
      const rows = await measure(send, version,
        { logTarget, verifyAt: [50, 150], stallRounds: Number(process.env.MEASURE_STALL ?? 40), pause: () => new Promise(r => setTimeout(r, 120)), ...admin });
      process.stdout.write(`${summary(rows)}\n`);
      process.stdout.write(`${lines(await measureImport(send, version, await lateSave(logTarget), admin))}\n`);
      return;
    }
    const s = server(Array.from({ length: 4000 }, (_, i) => 7000 + i * 13));
    const send: Transport = (path, init) => { s.clock.t += 12_000; return handle(new Request(`https://api.test${path}`, init), s.deps); };
    const rows = await measure(send, 'test-content-1', { logTarget, verifyAt: [50, 150], stallRounds: Number(process.env.MEASURE_STALL ?? 40), grant: id => grantAdmin(s, id) });
    const imported = await measureImport(send, 'test-content-1', await lateSave(logTarget), { grant: id => grantAdmin(s, id) });
    process.stderr.write(`${summary(rows)}\n${lines(imported)}\n`);
    expect(rows.filter(r => r.label.startsWith('verify')).every(r => String(r.status).includes('ok=true'))).toBe(true);
    expect(imported.find(r => r.label.startsWith('import'))!.status).toBe(201);
  }, 600_000);

  // A synthetic long battle: the same content with every foe's HP ×12 (in process only), so one battle runs to well over
  // a hundred turns and each turn's command carries all turns before it.
  it.runIf(!remote)('a long battle: one command per turn carrying every earlier turn', async () => {
    const tough: typeof encounterById = id => { const e = encounterById(id); return e && { ...e, enemies: e.enemies.map(x => ({ ...x, maxHp: x.maxHp * 12 })) }; };
    const s = server(Array.from({ length: 4000 }, (_, i) => 9000 + i * 7), 'test-content-1', { ...GAME_CONTEXT, lookup: tough });
    const rows = await measure((path, init) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); }, 'test-content-1',
      { logTarget: Number(process.env.MEASURE_LOG_LONG ?? 260), verifyAt: [], stallRounds: 0, lookup: tough, grant: id => grantAdmin(s, id) });
    process.stderr.write(`[long battle]\n${summary(rows)}\n`);
  }, 600_000);
});
