// Types for scripts/content-grace.mjs (tested by tests/content-grace.test.ts).
export const GRACE_HOURS: number;
export const GRACE_MAX: number;
export interface LiveAnswer { server: string; previous?: string[]; until?: number }
export function graceList(input: { live: LiveAnswer | undefined; next: string; now: number; hours?: number; off?: boolean }): { previous: string[]; until: string };
export function readLive(base: string, get?: typeof fetch): Promise<LiveAnswer | undefined>;
