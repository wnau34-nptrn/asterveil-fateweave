import { test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chapterOne } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame, SAVE_VERSION } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';
import type { PetBook } from '../../src/core/world/types';

// PET-3 real-time 390px clips for the owner's motion review (Chromium emulation, not a phone). Runs only with PET_CLIPS=1.
const key = 'asterveil.fateweave.expedition.v1';
test.skip(!process.env.PET_CLIPS, 'owner clips only');
test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });

async function open(page: Page, pets: PetBook): Promise<void> {
  const p = newProfile(chapterOne, 17, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(10); p.cleared = MAPS.map(m => m.id);
  p.bank = { ore: 100, gold: 100, shard: 0, dust: 20 }; p.pets = pets; p.guides = Object.fromEntries(chapterOne.guides.map(g => [g.id, 'skipped' as const])); // the camp guide card would cover the den
  const raw = JSON.stringify({ version: SAVE_VERSION, profile: p, run: null }); parseGame(raw, chapterOne, encounterById, MAPS);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('pet3c')) { localStorage.setItem(key, raw); sessionStorage.setItem('pet3c', '1'); } }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click();
}
// This container's Playwright cannot encode video, so frames are screenshots with their real timestamps; the concat
// list below gives each frame its true duration and ffmpeg (system) encodes the clip.
const frames: { file: string; at: number }[] = []; let dir = '';
async function rec(page: Page, ms: number): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) { const file = `${dir}/f${String(frames.length).padStart(4, '0')}.png`; await page.screenshot({ path: file }); frames.push({ file, at: Date.now() }); }
}
function begin(name: string): void { dir = `${process.env.PET_FRAMES ?? '/tmp'}/${name}`; mkdirSync(dir, { recursive: true }); frames.length = 0; }
function finish(name: string): void {
  const list = frames.map((f, i) => `file '${f.file}'\nduration ${(((frames[i + 1]?.at ?? f.at + 100) - f.at) / 1000).toFixed(3)}`).join('\n') + `\nfile '${frames.at(-1)!.file}'\n`;
  writeFileSync(`${dir}/list.txt`, list);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', 'fps=15,scale=390:-2', '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', `docs/validation/pets/pet3/${name}.webm`]);
}

test('clip: camp den and hatching', async ({ page }) => {
  test.setTimeout(120_000); begin('camp-den-hatch');
  await open(page, { eggs: 1, shards: 0, owned: [], from: ['moon-lake'] });
  await rec(page, 1500); await page.locator('#pet-den').click(); await rec(page, 1500);
  await page.locator('[data-lobby="pet-hatch"][data-pet="gate_starveil_slime"]').click(); await rec(page, 3800);
  await page.locator('#pet-hatch-ok').click(); await rec(page, 800);
  await page.locator('[data-lobby="close"]').click(); await rec(page, 2500);
  finish('camp-den-hatch');
});

test('clip: the owl follows the leader on the map', async ({ page }) => {
  test.setTimeout(120_000); begin('map-follow-owl');
  await open(page, { eggs: 0, shards: 0, owned: [{ kind: 'forest_lantern_owl', level: 6, exp: 0 }], chosen: 'forest_lantern_owl', from: ['moon-lake'] });
  await page.locator('#lobby-depart').click(); await rec(page, 1200);
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowUp']) { await page.keyboard.press(k); await rec(page, 700); }
  await rec(page, 1000);
  finish('map-follow-owl');
});
