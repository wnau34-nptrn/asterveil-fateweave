import { expect, test, type Page, type Route } from '@playwright/test';
import { contentVersion } from '../../scripts/content-version.mjs';
import { handle } from '../../src/server/api';
import { chapterOne } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import { newProfile } from '../../src/core/world/profile';
import { currentSave } from '../fixtures/current-save';
import { xpAt } from '../fixtures/camp-level';
import { server, type Server } from '../fixtures/server-fakes';

// World Boss leaderboard (owner 2026-11-28 “บอสโลกเปิดหลัง Map 3 และเพิ่ม Leader board”) in server play at 390px: the page
// talks to `https://api.test`, routed to the real Worker and Durable Objects running in this process.
const API = 'https://api.test', SAVE_KEY = 'asterveil.fateweave.expedition.v1';

async function serve(page: Page): Promise<Server> {
  const s = server(undefined, contentVersion());
  s.deps.allowedOrigins = [new URL(test.info().project.use.baseURL ?? 'http://127.0.0.1:5173/').origin];
  await page.route(`${API}/**`, async (route: Route) => {
    const req = route.request(), body = req.postData() ?? undefined; s.clock.t += 1000;
    const response = await handle(new Request(req.url(), { method: req.method(), headers: await req.allHeaders(), ...(body !== undefined && req.method() !== 'GET' ? { body } : {}) }), s.deps);
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
  });
  return s;
}
// A camp save; `cleared` maps from the first.
function campSave(cleared: number): string {
  const p = newProfile(chapterOne, 17, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.campXp = xpAt(10); p.cleared = MAPS.slice(0, cleared).map(m => m.id);
  return currentSave({ profile: p, run: null });
}
async function enter(page: Page, raw: string): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k!)) localStorage.setItem(k!, v!); localStorage.setItem('asterveil.fateweave.lessons.v1', JSON.stringify({ seen: [], off: true })); }, [SAVE_KEY, raw]);
  await page.goto(`./?server=${encodeURIComponent(API)}`);
  await page.locator('#import-save').click();
  await page.locator('#continue').click();
  await expect(page.locator('#lobby-view')).toBeVisible();
}

test('the World Boss waits for map 3: no banner after map 2', async ({ page }) => {
  await serve(page); await enter(page, campSave(2));
  await expect(page.locator('#lobby-board')).toBeVisible();
  await expect(page.locator('#lobby-wboss')).toHaveCount(0);
});

test('rank tab: top camps by damage, the player marked, their rank past the list, and last week', async ({ page }, info) => {
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  const s = await serve(page); await enter(page, campSave(3));
  const me = [...s.objects.keys()][0]!, week = s.boss.host.week();
  // 24 other camps hit this week; the player sits 22nd (past the top 20).
  const others = Array.from({ length: 24 }, (_, i) => (i + 1).toString(16).padStart(32, '0'));
  const squads: [string, number][][] = [[['guardian', 5], ['tracer', 4], ['weaver', 4], ['healer', 3], ['mira', 3]], [['tracer', 3], ['healer', 2], ['guardian', 2]]];
  s.boss.host.contribute(others.map((acc, i) => ({ id: `${acc}:w${week}:a1`, week, account: acc, damage: 2400 - i * 90, ...(i < 23 ? { team: { level: 30 - (i >> 2), heroes: squads[i % 2]! } } : {}) })));
  s.boss.host.contribute([{ id: `${me}:w${week}:a1`, week, account: me, damage: 2400 - 21 * 90 + 45, team: { level: 10, heroes: [['guardian', 1], ['tracer', 1], ['weaver', 1], ['healer', 1]] } }]);
  await page.locator('#lobby-wboss').click();
  await page.locator('#wb-tab-rank').click();
  const rows = page.locator('.wb-rank-row');
  await expect(rows).toHaveCount(20);
  await expect(rows.first()).toContainText('ค่าย-'); await expect(rows.first()).toContainText('2,400');
  // Each row shows the team of the camp's best attempt: camp level and the fielded heroes' faces with stars.
  await expect(rows.first().locator('.wb-rank-level')).toHaveText('Lv30'); await expect(rows.first().locator('.wb-rank-hero')).toHaveCount(5);
  await expect(rows.first().locator('.wb-rank-hero').first()).toContainText('★5'); await expect(rows.first().locator('.sr-only')).toContainText('ทีม:');
  await expect(page.locator('.wb-rank-you')).toContainText('อันดับของคุณ 22 / 25');
  for (const id of ['wb-tab-rank', 'wb-rank-week', 'wb-rank-last']) expect((await page.locator(`#${id}`).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.locator('#lobby-view').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('wb-rank-390.png') });
  // A top-20 camp sees its own row marked instead.
  s.boss.host.contribute([{ id: `${me}:w${week}:a2`, week, account: me, damage: 2000 }]);
  await page.locator('#wb-tab-fight').click(); await page.locator('#wb-tab-rank').click();
  await expect(page.locator('.wb-rank-row.you')).toContainText('(คุณ)'); await expect(page.locator('.wb-rank-you')).toHaveCount(0);
  await page.locator('.wb-rank-row.you').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('wb-rank-you-390.png') });
  // Last week had no attempts.
  await page.locator('#wb-rank-last').click();
  await expect(page.locator('#wb-rank-last')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.wb-board')).toContainText('ยังไม่มีใครลงบอสนี้');
  expect(issues).toEqual([]);
});
