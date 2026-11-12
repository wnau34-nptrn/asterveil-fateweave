/* global Response, URL */
// Permission probe only (P09-02b step 1): proves the deploy token can publish a
// Worker with a SQLite-backed Durable Object. Deployed and deleted by the probe workflow.
import { DurableObject } from 'cloudflare:workers';

export class ProbeObject extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS hits (id INTEGER PRIMARY KEY, n INTEGER NOT NULL)');
  }

  hit() {
    const sql = this.ctx.storage.sql;
    sql.exec('INSERT INTO hits (id, n) VALUES (1, 1) ON CONFLICT(id) DO UPDATE SET n = n + 1');
    return sql.exec('SELECT n FROM hits WHERE id = 1').one().n;
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const headers = { 'Cache-Control': 'no-store' };
    if (path === '/health') return Response.json({ status: 'ok', service: 'asterveil-probe' }, { headers });
    if (path === '/do') {
      const stub = env.PROBE.get(env.PROBE.idFromName('probe'));
      return Response.json({ status: 'ok', hits: await stub.hit() }, { headers });
    }
    return Response.json({ error: 'not_found' }, { status: 404, headers });
  },
};
