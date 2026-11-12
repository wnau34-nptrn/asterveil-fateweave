import type { SeedSource } from '../core/command/seed-source';

// The local seed generator the game has always used (clock XOR Math.random). Seeds only choose future rolls; rules
// never read the clock. A server-backed game (P09-02b) replaces this with seeds made and kept on the server.
export function localSeedSource(): SeedSource {
  return { next: () => (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 };
}
