import { expect, test, type Page } from '@playwright/test';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { lakeMap } from '../../src/content/world/chapter-lake';
import { depart, newProfile } from '../../src/core/world/profile';
import type { ExpeditionState, Point, Profile } from '../../src/core/world/types';
import { capXp } from '../../src/core/world/world';
import { currentSave } from '../fixtures/current-save';
import { watchPage } from './diagnostics';

// Map 4 ทะเลสาบเงาจันทร์ screens (OD-60): the tide chip, water tiles, being washed back, waiting at camp, the side story in
// the goals, a reflection event and the camp journal. `SHOTS=1` also writes 390px review images for the owner.
const key = 'asterveil.fateweave.expedition.v1';
const shots = process.env.SHOTS === '1';
const dir = 'docs/validation/map4-lake';
const ids = ['guardian', 'tracer', 'weaver', 'healer', 'lio'];
function company(extra: Partial<Profile> = {}): Profile {
  const p = { ...newProfile(map, 21), tutorialDone: true, cleared: ['ruined-border', 'deep-forest', 'veil-frontier'], commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' } };
  return { ...p, company: [...ids], members: Object.fromEntries(ids.map(id => [id, { stars: 2, shards: 0 }])), party: { deployed: ids, reserve: [] }, campXp: capXp(map, 3), ...extra };
}
function lakeRun(p: Profile, at: Point, steps: number, extra: Partial<ExpeditionState> = {}): ExpeditionState {
  const run = depart(p, lakeMap, lookup, 77).run;
  return { ...run, revealed: '1'.repeat(lakeMap.rows.length * lakeMap.rows[0]!.length), position: at, steps, repel: 0, visited: ['10,19', '4,10'], camp: { x: 4, y: 10 }, ...extra, ...(run.arrivals ? {} : {}) };
}
async function open(page: Page, raw: string, toMap = true): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 }); watchPage(page);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('lake-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('lake-seeded', '1'); } }, { key, raw });
  await page.goto('./'); await page.locator('#continue').click();
  await expect(page.locator(toMap ? '#world-view' : '#lobby-view')).toBeVisible();
}
// Clip frames (assembled into an animated WebP by scripts outside the suite; no ffmpeg in CI images).
let frame = 0;
const film = async (page: Page, n: number) => { if (!shots) return; for (let i = 0; i < n; i++) { await page.screenshot({ path: `test-results/clip/${String(frame++).padStart(3, '0')}.png` }); await page.waitForTimeout(120); } };
const shot = async (page: Page, name: string) => { if (!shots) return; await page.waitForTimeout(1200); await page.screenshot({ path: `${dir}/${name}.png` }); };

test('tide chip and water tiles follow the step count; the incoming tide washes the party back', async ({ page }) => {
  const p = company(); const run = lakeRun(p, { x: 5, y: 13 }, 6);
  await open(page, currentSave({ profile: p, run }));
  const world = page.locator('#world-view');
  await expect(world).toHaveAttribute('data-tide', 'low'); await expect(page.locator('#tide-chip')).toContainText('น้ำลง');
  await expect(page.locator('#tide-chip')).toContainText('ขึ้นใน 2 ก้าว');
  await expect(page.locator('.tile.water.shallow').first()).toBeVisible();
  await shot(page, 'lake-low-tide'); await film(page, 6);
  await page.keyboard.press('ArrowRight'); await film(page, 6); await expect(page.locator('#tide-chip')).toContainText('ขึ้นใน 1 ก้าว');
  await page.waitForTimeout(600); await page.keyboard.press('ArrowRight'); await film(page, 10);
  await expect(page.locator('#world-message')).toContainText('พัดทีมกลับขึ้นฝั่ง');
  await expect(world).toHaveAttribute('data-tide', 'high'); await expect(page.locator('#tide-chip')).toContainText('น้ำขึ้น');
  await shot(page, 'lake-washed-high-tide');
  await page.waitForTimeout(600); await page.keyboard.press('ArrowRight'); await expect(page.locator('#world-message')).toContainText('น้ำขึ้นอยู่');
  await film(page, 10);
});

test('a camp waits for the water; the goals show the pavilion seal and the ferryman story', async ({ page }) => {
  const p = company(); const run = lakeRun(p, { x: 4, y: 10 }, 3);
  await open(page, currentSave({ profile: p, run }));
  await page.locator('#rest').click(); await page.locator('#camp-tab-care').click();
  await expect(page.locator('#wait-tide')).toContainText('รอให้น้ำขึ้น');
  await shot(page, 'lake-camp-wait');
  await page.locator('#wait-tide').click();
  await expect(page.locator('#world-view')).toHaveAttribute('data-tide', 'high');
  await page.keyboard.press('Escape');
  await page.locator('#objective-button').click();
  await expect(page.locator('#world-goals-content')).toContainText('ผนึกศาลาจันทร์');
  await expect(page.locator('#world-goals-content')).toContainText('เรือของคนพายเรือ');
  await shot(page, 'lake-goals');
});

test('a reflection asks to gaze or look away; the journal keeps what was found', async ({ page }) => {
  const p = company({ notes: ['note-keeper-letter', 'memory:shore-reflection'] }); const run = lakeRun(p, { x: 17, y: 19 }, 0);
  await open(page, currentSave({ profile: p, run }));
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#event-dialog')).toBeVisible(); await expect(page.locator('#event-dialog')).toContainText('ภาพสะท้อน');
  await expect(page.locator('#event-dialog')).toContainText('มองต่อ');
  await shot(page, 'lake-reflection');
});

test('the camp journal lists found pages', async ({ page }) => {
  const p = company({ notes: ['note-keeper-letter', 'memory:shore-reflection'] });
  await open(page, currentSave({ profile: p, run: null }), false);
  await page.locator('#lobby-board').click(); await page.locator('#quest-tab-camp').click();
  await expect(page.locator('#journal-title')).toContainText('2/4');
  await page.locator('#journal-note-keeper-letter summary').click();
  await expect(page.locator('#journal-note-keeper-letter')).toContainText('ผู้ดูแล');
  await shot(page, 'lake-journal');
});
