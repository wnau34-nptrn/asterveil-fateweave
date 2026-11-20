/* global URL, process, fetch, AbortSignal */
// Deploy grace (owner 2026-11-20, docs/design/p09/CONTENT_GRACE_TH.md): the dev API is deployed minutes after a push but
// the game page only after the Chromium suite (about 40 minutes), so a device on the page from before the push would be
// refused with 409 content_version. The deploy asks the live API which versions it takes now and writes the next list:
// the version it runs now plus the ones it still accepts, without the new one, at most 3, for `hours` hours.
export const GRACE_HOURS = 3;
export const GRACE_MAX = 3;
const VERSION = /^[0-9a-f]{16}$/;

// `live`: the 409 answer of the running API ({ server, previous?, until? }) or undefined when it could not be read.
export function graceList({ live, next, now, hours = GRACE_HOURS, off = false }) {
  if (off || !live || !VERSION.test(live.server ?? '')) return { previous: [], until: '' };
  const chained = Array.isArray(live.previous) && Number.isFinite(live.until) && now < live.until ? live.previous : [];
  const previous = [...new Set([live.server, ...chained])].filter(v => VERSION.test(v) && v !== next).slice(0, GRACE_MAX);
  return previous.length ? { previous, until: new Date(now + hours * 3_600_000).toISOString() } : { previous: [], until: '' };
}

// The running API's answer to a request with a version nobody has (never accepted, so it always answers 409 with its own).
export async function readLive(base, get = fetch) {
  try {
    const r = await get(`${base}/v1/session`, { method: 'POST', headers: { 'X-Fateweave-Content': '0000000000000000' }, signal: AbortSignal.timeout(15_000) });
    if (r.status !== 409) return undefined;
    const b = await r.json();
    return typeof b?.server === 'string' ? { server: b.server, previous: b.previous, until: b.until } : undefined;
  } catch { return undefined; }
}

// CLI (the workflow): node scripts/content-grace.mjs <api base> <new content version> [off]
// prints `CONTENT_PREVIOUS=...` and `CONTENT_PREVIOUS_UNTIL=...` lines (empty values when there is no grace).
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const [base, next, off] = process.argv.slice(2);
  const out = graceList({ live: await readLive(base), next, now: Date.now(), off: off === 'off' });
  process.stdout.write(`CONTENT_PREVIOUS=${out.previous.join(',')}\nCONTENT_PREVIOUS_UNTIL=${out.until}\n`);
}
