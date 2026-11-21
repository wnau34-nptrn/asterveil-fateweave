import { test, expect, type Page } from '@playwright/test';
import { chapterOne } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
import { xpAt } from '../fixtures/camp-level';

// P11-05 go-live check (OD-52; docs/validation/p11-05-trio-check-2026-11-21/README_TH.md): the SHIPPED rules (no
// patched `from`), offline (`?server=off`), a Bangkok device clock pinned just before and after Monday 23 Nov 2026 06:00.
// The camp banner/page shows the warden at 05:59 and the trio at 06:00; a trio fight opens with its art drawn.
const key = 'asterveil.fateweave.expedition.v1';
const shots = 'docs/validation/p11-05-trio-check-2026-11-21';
test.use({ timezoneId: 'Asia/Bangkok' });

async function open(page: Page, at: string): Promise<void> {
  await page.clock.setFixedTime(new Date(at));
  const p = newProfile(chapterOne, 17, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(10); p.cleared = MAPS.map(m => m.id);
  p.bank = { ore: 100, gold: 100, shard: 0, dust: 20 };
  const raw = JSON.stringify({ version: 65, profile: p, run: null }); parseGame(raw, chapterOne, encounterById, MAPS);
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('p1105sw')) { localStorage.setItem(key, raw); sessionStorage.setItem('p1105sw', '1'); } }, { key, raw });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./?server=off'); await page.locator('#continue').click();
}

test('05:59 shows the warden; 06:00 shows the trio with its three guides; a trio fight opens with art', async ({ page }) => {
  test.setTimeout(150_000);
  await open(page, '2026-11-23T05:59:00+07:00');
  const banner = page.locator('#lobby-wboss'); await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute('data-trio', 'false'); await expect(banner).toContainText('ผู้คุมรอยแยก'); await expect(banner).toContainText('เหลือ 1 วัน');
  await banner.click();
  await expect(page.locator('#wb-pick-kragmor')).toHaveCount(0);
  await expect(page.locator('#wb-attempts')).toContainText('0/5');
  await page.screenshot({ path: `${shots}/before-0559-390.png` });

  // The clock crosses 06:00 with the page open; a reload (as the refresh bar or a new visit does) brings up the trio week.
  await page.clock.setFixedTime(new Date('2026-11-23T06:00:30+07:00'));
  await page.reload(); await page.locator('#continue').click();
  await expect(banner).toHaveAttribute('data-trio', 'true'); await expect(banner).toContainText('เหลือ 7 วัน');
  await banner.click();
  const guide = page.locator('.wb-prefight');
  for (const [id, name, cue] of [['kragmor', 'Kragmor', 'Mountain Fall'], ['valdrakk', 'Valdrakk', 'Wing Gathering'], ['morvane', 'Morvane', 'Call the Court']] as const) {
    await page.locator(`#wb-pick-${id}`).click();
    await expect(guide).toContainText(`แนวทางก่อนสู้ ${name}`); await expect(guide).toContainText(cue);
  }
  await page.locator('#wb-pick-kragmor').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${shots}/after-0600-390.png` });

  // The fight: the screen switch waits for its images (≤ 1.8 s cap, image-blank fix), then Start is offered.
  await page.locator('#wb-start').click();
  await expect(page.locator('#battle-view')).not.toHaveClass(/view-off/);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 }); await page.locator('#start').click();
  await expect(page.locator('#beat-status')).toContainText('รอบ 1/8');
  await expect(page.locator('#battle-view')).toContainText('คราก์มอร์');
  // The canvas is drawn (not one flat colour) once the battle runs.
  await expect.poll(() => page.evaluate(() => {
    const c = document.querySelector('#battle-view canvas, canvas') as HTMLCanvasElement | null; if (!c) return 0;
    const t = document.createElement('canvas'); t.width = 48; t.height = 48; const g = t.getContext('2d')!; g.drawImage(c, 0, 0, 48, 48);
    const d = g.getImageData(0, 0, 48, 48).data; const seen = new Set<number>();
    for (let i = 0; i < d.length; i += 4) seen.add((d[i]! >> 4) << 8 | (d[i + 1]! >> 4) << 4 | (d[i + 2]! >> 4));
    return seen.size;
  }), { timeout: 20_000 }).toBeGreaterThan(40);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/trio-battle-390.png` });
});
