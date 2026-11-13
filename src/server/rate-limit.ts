// P09-02b/02g rate limits (docs/design/p09/SAFETY_P09_02G_TH.md §3).
// - `RateLimiter`: fixed one-second/one-minute windows in one isolate's memory. In the Worker it is only a cheap first
//   filter (Cloudflare runs many isolates). Inside a Durable Object it is exact, because one object runs in one place.
// - Per-account game limits (commands, reads) are counted in the account's own Durable Object (`account-object.ts`).
// - Every other limit (guest creation, sign-in and recovery per IP; account routes, import and audit per account) asks
//   a `RateLimit` Durable Object named after the limit key (`durableGate`), so the count holds across isolates.

export class RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();
  constructor(private readonly max = 50_000) {}
  allow(key: string, limit: number, windowMs: number, now: number): boolean {
    const w = this.windows.get(key);
    if (!w || now - w.start >= windowMs) {
      if (this.windows.size >= this.max) this.windows.clear();
      this.windows.set(key, { start: now, count: 1 });
      return true;
    }
    return ++w.count <= limit;
  }
}

export interface RateGate { allow(key: string, limit: number, windowMs: number): Promise<boolean> }

interface LimitNamespace { idFromName(name: string): unknown; get(id: unknown): { fetch(request: Request): Promise<Response> } }

// One `RateLimit` object per key. When the object cannot be reached the request is let through (the in-isolate filter
// still applies): an outage of the limiter must not lock players out.
export function durableGate(ns: LimitNamespace): RateGate {
  return {
    async allow(key, limit, windowMs) {
      try {
        const r = await ns.get(ns.idFromName(key)).fetch(new Request('https://limit/allow', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, limit, windowMs }),
        }));
        return r.status !== 429;
      } catch { return true; }
    },
  };
}

// The `RateLimit` object's request handler (shared by the real object and tests).
export async function handleLimitRequest(limiter: RateLimiter, request: Request, now: number): Promise<Response> {
  if (request.method !== 'POST' || new URL(request.url).pathname !== '/allow') return Response.json({ error: 'not_found' }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }); }
  const { key, limit, windowMs } = (typeof body === 'object' && body !== null ? body : {}) as { key?: unknown; limit?: unknown; windowMs?: unknown };
  if (typeof key !== 'string' || typeof limit !== 'number' || typeof windowMs !== 'number' || limit < 1 || windowMs < 1 || windowMs > 3_600_000) {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }
  return limiter.allow(key, limit, windowMs, now) ? new Response(null, { status: 204 }) : Response.json({ error: 'rate_limited' }, { status: 429 });
}

// The limit key for a client address: IPv4 as is, IPv6 by its /64 network (one home or phone usually holds a whole
// /64, so counting single addresses would let one client rotate through billions).
export function ipKey(raw: string | null): string {
  const ip = (raw ?? '').trim().toLowerCase();
  if (!ip.includes(':')) return ip || 'unknown';
  const [head = '', tail = ''] = ip.split('::');
  const left = head ? head.split(':') : [], right = ip.includes('::') && tail ? tail.split(':') : [];
  const groups = ip.includes('::') ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right] : left;
  return `${groups.slice(0, 4).map(g => (g || '0').replace(/^0+(?=.)/, '')).join(':')}::/64`;
}
