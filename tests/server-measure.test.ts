import { describe, expect, it } from 'vitest';
import { encounterById } from '../src/content/encounters/catalog';
import { handle } from '../src/server/api';
import { GAME_CONTEXT } from '../src/server/worker';
import { server } from './fixtures/server-fakes';
import { measure, summary } from './fixtures/server-measure';

// P09-02d: long battles and the replay audit on a long log (owner D8 inputs). In process with SERVER_MEASURE=1 (Node
// timings, SQLite in memory); against the deployed dev Worker with MEASURE_URL + MEASURE_CONTENT (the deploy workflow
// runs it while Workers Tail records CPU per request). Off in the normal test run.
const remote = process.env.MEASURE_URL;
describe.runIf(process.env.SERVER_MEASURE === '1' || !!remote)('P09-02d long battle / long log measurement', () => {
  it('plays a fresh account to a long log and audits it', async () => {
    const logTarget = Number(process.env.MEASURE_LOG ?? 300);
    if (remote) {
      const version = process.env.MEASURE_CONTENT ?? '';
      // Stay under the per-account limit of 10 commands a second.
      const rows = await measure((path, init) => fetch(new URL(path, remote), { ...init, signal: AbortSignal.timeout(30_000) }), version,
        { logTarget, verifyAt: [50, 150], stallRounds: Number(process.env.MEASURE_STALL ?? 40), pause: () => new Promise(r => setTimeout(r, 120)) });
      process.stdout.write(`${summary(rows)}\n`);
      return;
    }
    const s = server(Array.from({ length: 4000 }, (_, i) => 7000 + i * 13));
    const rows = await measure((path, init) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); }, 'test-content-1',
      { logTarget, verifyAt: [50, 150], stallRounds: Number(process.env.MEASURE_STALL ?? 40) });
    process.stderr.write(`${summary(rows)}\n`);
    expect(rows.some(r => r.label.startsWith('verify'))).toBe(true);
  }, 600_000);

  // A synthetic long battle: the same content with every foe's HP ×12 (in process only), so one battle runs to well over
  // a hundred turns and each turn's command replays all turns before it.
  it.runIf(!remote)('a long battle: one command per turn replaying every earlier turn', async () => {
    const tough: typeof encounterById = id => { const e = encounterById(id); return e && { ...e, enemies: e.enemies.map(x => ({ ...x, maxHp: x.maxHp * 12 })) }; };
    const s = server(Array.from({ length: 4000 }, (_, i) => 9000 + i * 7), 'test-content-1', { ...GAME_CONTEXT, lookup: tough });
    const rows = await measure((path, init) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); }, 'test-content-1',
      { logTarget: Number(process.env.MEASURE_LOG_LONG ?? 260), verifyAt: [], stallRounds: 0, lookup: tough });
    process.stderr.write(`[long battle]\n${summary(rows)}\n`);
  }, 600_000);
});
