// A page that stays open after a new publish (owner 2026-11-20, docs/design/p09/CONTENT_GRACE_TH.md): `version.json`
// next to index.html names the build that is live. The check compares it with the build this page runs and, when they
// differ, tells the page once (per live build) so it can ask the player to refresh. It reads nothing from the game and
// never reloads by itself. Injected fetch and clock keep it testable; a missing or malformed file means "no news".
export const UPDATE_CHECK_MS = 5 * 60_000;
export interface LiveBuild { build: string }
export async function readLiveBuild(base: string, get: typeof fetch = fetch, now = Date.now()): Promise<LiveBuild | undefined> {
  try {
    const r = await get(`${base}version.json?t=${now}`, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return undefined;
    const v: unknown = await r.json();
    const build = typeof v === 'object' && v !== null ? (v as { build?: unknown }).build : undefined;
    return typeof build === 'string' && /^[0-9a-f]{8,40}$/.test(build) ? { build } : undefined;
  } catch { return undefined; }
}
// Runs `check` now, every `intervalMs` while the page is visible, and when it becomes visible again.
export function watchForUpdate(opts: { running: string; base: string; onNew: (build: string) => void; get?: typeof fetch; intervalMs?: number; doc?: Document }): () => void {
  const doc = opts.doc ?? document; let stopped = false, told: string | undefined;
  const check = async (): Promise<void> => {
    if (stopped || doc.visibilityState === 'hidden') return;
    const live = await readLiveBuild(opts.base, opts.get);
    if (live && !stopped && live.build !== opts.running && live.build !== told) { told = live.build; opts.onNew(live.build); }
  };
  const timer = setInterval(() => { void check(); }, opts.intervalMs ?? UPDATE_CHECK_MS);
  const visible = () => { void check(); }; doc.addEventListener('visibilitychange', visible);
  void check();
  return () => { stopped = true; clearInterval(timer); doc.removeEventListener('visibilitychange', visible); };
}
