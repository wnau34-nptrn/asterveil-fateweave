// P09-02a: where new random seeds come from. Rules never make seeds; a command that needs one (a new profile, a
// departure) takes the next value from the injected source. Locally the browser source keeps today's generator
// (`platform/seed-source.ts`); a server (P09-02b) will supply its own and never send the seed to the device.
export interface SeedSource { next(): number }

// Deterministic source for tests and replays: hands out the given seeds in order, then fails loudly.
export function sequenceSeeds(seeds: readonly number[]): SeedSource {
  let i = 0;
  return { next: () => { if (i >= seeds.length) throw new Error('Seed sequence exhausted.'); return seeds[i++]! >>> 0; } };
}
