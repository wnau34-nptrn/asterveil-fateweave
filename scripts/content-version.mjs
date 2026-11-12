/* global URL, process */
// P09-02b: prints the content version the server and the game must share: the first 16 hex digits of a SHA-256 over
// every rule and content source file (src/core, src/content), their paths and the bytes, in sorted order. Any change to
// rules, numbers or the save format changes it, so a device built from other sources is refused (409 content_version).
// Usage: node scripts/content-version.mjs  → e.g. c0ffee0123456789
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const files = [];
const walk = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(ts|json)$/.test(entry.name)) files.push(relative(root, path).split('\\').join('/'));
  }
};
for (const dir of ['src/core', 'src/content']) walk(join(root, dir));
const hash = createHash('sha256');
for (const file of files.sort()) hash.update(`${file}\0`).update(readFileSync(join(root, file))).update('\0');
process.stdout.write(`${hash.digest('hex').slice(0, 16)}\n`);
