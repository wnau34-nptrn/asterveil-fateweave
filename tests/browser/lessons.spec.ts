import { expect, test, type Page } from '@playwright/test';
import { encounterById } from '../../src/content/encounters/catalog';
import { ruinsMap } from '../../src/content/world/chapter-ruins';
import { MAPS } from '../../src/content/world/maps';
import { resolveCommand } from '../../src/core/battle/engine';
import { parseGame } from '../../src/core/save/expedition-save';
import { depart, newProfile } from '../../src/core/world/profile';
import type { ExpeditionState, Profile } from '../../src/core/world/types';
import { battleData, battleState, draftPick, finishBattle, recordBattle, startPrologue } from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';

// OD-54 lessons after the prologue at 390px (Chromium emulation): the order on the map, the ring on the real control,
// "turn all off", the one-time calming draught and the first-battle tip. The saves are built with the real rules.
const key = 'asterveil.fateweave.expedition.v1', lessonKey = 'asterveil.fateweave.lessons.v1';
const commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
const profile = (): Profile => ({ ...newProfile(ruinsMap, 5, ruinsMap.firstCompany), commander, tutorialDone: true });
function afterPrologue(): ExpeditionState {
  let s = startPrologue(depart({ ...profile(), tutorialDone: false }, ruinsMap, encounterById, 77).run, ruinsMap).state;
  const data = battleData(s, ruinsMap, encounterById)!; let b = battleState(s, ruinsMap, encounterById)!;
  while (b.outcome === 'active') { const l = battleLesson(b, data)!; b = resolveCommand(b, data, { beat: b.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  s = finishBattle(recordBattle(s, ruinsMap, encounterById, b.commands), ruinsMap, encounterById).state;
  return draftPick(draftPick(s, ruinsMap, 0, encounterById).state, ruinsMap, 0, encounterById).state;
}
async function open(page: Page, run: ExpeditionState, seen: string[] = [], view = '#world-view') {
  const raw = JSON.stringify({ version: 65, profile: profile(), run }); parseGame(raw, ruinsMap, encounterById, MAPS);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ key, raw, lessonKey, seen }) => {
    if (sessionStorage.getItem('lessons-seeded')) return;
    localStorage.setItem(key, raw); localStorage.setItem(lessonKey, JSON.stringify({ seen, off: false })); sessionStorage.setItem('lessons-seeded', '1');
  }, { key, raw, lessonKey, seen });
  await page.goto('./'); await page.locator('#continue').click(); if (view) await expect(page.locator(view)).toBeVisible();
}
const bubble = (page: Page) => page.locator('.lesson-bubble');
const ringOver = (page: Page, selector: string) => page.evaluate(sel => {
  const ring = document.querySelector('.lesson-ring')!.getBoundingClientRect(), t = document.querySelector(sel)!.getBoundingClientRect();
  return ring.left <= t.left && ring.right >= t.right && ring.top <= t.top && ring.bottom >= t.bottom;
}, selector);

test('after the prologue the map teaches level-up, gear, the tree, lanes and walking in order; all can be turned off', async ({ page }, info) => {
  await open(page, afterPrologue());
  for (const [id, target] of [['levelup', '#world-party'], ['wear', '#world-pack'], ['tree', '#world-party'], ['lanes', '#world-team'], ['walk', '.ghost-dpad']] as const) {
    await expect(bubble(page)).toHaveAttribute('data-lesson-id', id); expect(await ringOver(page, target)).toBe(true);
    if (id === 'wear') await page.screenshot({ path: info.outputPath('lesson-wear-390.png') });
    // Never wider than the frame, the buttons reachable at 44px.
    expect(await page.locator('#lesson-ok').evaluate(el => { const r = el.getBoundingClientRect(); return r.height >= 44 && r.right <= innerWidth; })).toBe(true);
    if (id === 'lanes') { await page.locator('#lesson-off').click(); break; }
    await page.locator('#lesson-ok').click();
  }
  await expect(page.locator('#lesson-layer')).toBeHidden();
  await page.reload(); await page.locator('#continue').click(); await expect(page.locator('#world-view')).toBeVisible();
  await expect(page.locator('#lesson-layer')).toBeHidden();
  // The highlighted controls still work under the layer.
  await page.locator('#world-pack').click(); await expect(page.locator('#pack-dialog')).toBeVisible();
});

test('a tired team learns about fatigue and takes the one-time calming draught', async ({ page }, info) => {
  const run = afterPrologue(); run.fatigue = { [run.roster.deployed[0]!]: 6 };
  await open(page, run, ['levelup', 'wear', 'tree', 'lanes', 'walk']);
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'fatigue'); await page.locator('#lesson-ok').click();
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'calm'); await page.screenshot({ path: info.outputPath('lesson-calm-390.png') });
  await page.locator('#lesson-action').click();
  await expect(page.locator('#world-message')).toContainText('ยาฟื้นความเหนื่อย');
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key);
  expect(saved.run.potions.calm).toBe(1); expect(saved.profile.guides['guide-calm']).toBe('claimed');
  await expect(page.locator('#lesson-layer')).toBeHidden();
});

test('the first battle after the prologue points at the enemy plan once', async ({ page }) => {
  const run = afterPrologue(); run.battle = { kind: 'random', encounterId: 'slime-pair', entry: Object.fromEntries(run.roster.deployed.map(id => [id, run.hp[id]!])), commands: [] };
  await open(page, run, ['levelup', 'wear', 'tree', 'lanes', 'walk'], '#battle-view:not(.view-off)');
  const start = page.locator('[data-ui=start]'); if (await start.isVisible({ timeout: 3000 }).catch(() => false)) await start.click();
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'battle');
  await page.locator('#lesson-ok').click(); await expect(page.locator('#lesson-layer')).toBeHidden();
  await expect(page.locator('#action-attack')).toBeEnabled();
});

test('camp: the first visit, then the card points at gear; tapping it completes the lesson; Setup turns lessons off and on', async ({ page }, info) => {
  const raw = JSON.stringify({ version: 65, profile: profile(), run: null }); parseGame(raw, ruinsMap, encounterById, MAPS);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ key, raw, lessonKey }) => {
    if (sessionStorage.getItem('camp-seeded')) return;
    localStorage.setItem(key, raw); localStorage.setItem(lessonKey, JSON.stringify({ seen: [], off: false })); sessionStorage.setItem('camp-seeded', '1');
  }, { key, raw, lessonKey });
  await page.goto('./'); await page.locator('#continue').click();
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'home'); await page.locator('#lesson-ok').click();
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'card:guide-wear'); expect(await ringOver(page, '#lobby-tab-gear')).toBe(true);
  await page.screenshot({ path: info.outputPath('lesson-camp-card-390.png') });
  await page.locator('#lobby-tab-gear').click(); await expect(page.locator('#lesson-layer')).toBeHidden();
  const prefs = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)!), lessonKey);
  expect((await prefs()).seen).toEqual(['home', 'card:guide-wear']);
  // Setup on the title: off hides every lesson; on again starts them over.
  await page.reload(); await page.locator('#title-setup-toggle').click();
  const toggle = page.locator('#lessons-toggle'); await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click(); await expect(page.locator('#lessons-toggle')).toHaveAttribute('aria-pressed', 'false'); expect((await prefs()).off).toBe(true);
  await page.locator('#lessons-toggle').click(); await expect(page.locator('#lessons-toggle')).toHaveAttribute('aria-pressed', 'true');
  expect(await prefs()).toEqual({ seen: [], off: false });
  await page.keyboard.press('Escape'); await page.locator('#continue').click();
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'home');
});

// OD-54 farming lessons (owner 2026-11-19 "ทำทั้ง 4 ข้อเลย"): the replay pointer, then the sweep row inside the maps sheet.
async function openCamp(page: Page, p: Profile, seen: string[]) {
  const raw = JSON.stringify({ version: 65, profile: p, run: null }); parseGame(raw, ruinsMap, encounterById, MAPS);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ key, raw, lessonKey, seen }) => {
    if (sessionStorage.getItem('farm-seeded')) return;
    localStorage.setItem(key, raw); localStorage.setItem(lessonKey, JSON.stringify({ seen, off: false })); sessionStorage.setItem('farm-seeded', '1');
  }, { key, raw, lessonKey, seen });
  await page.goto('./'); await page.locator('#continue').click();
}
const clearedCamp = (n: number): Profile => {
  const p = profile(); p.cleared = MAPS.slice(0, n).map(m => m.id);
  p.guides = Object.fromEntries(MAPS[0]!.guides.map(g => [g.id, 'claimed' as const])); return p;
};
test('camp after the first clear: replay pointer at the maps button, then the sweep row in the maps sheet', async ({ page }, info) => {
  await openCamp(page, clearedCamp(1), ['home', 'open:quests', 'open:wboss', 'open:gacha', 'open:team']);
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'farm'); expect(await ringOver(page, '#lobby-maps')).toBe(true);
  await page.locator('#lobby-maps').click();
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'sweeppick'); expect(await ringOver(page, `#map-node-${ruinsMap.id}`)).toBe(true);
  await page.locator(`#map-node-${ruinsMap.id}`).click();
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'sweep');
  const row = `#map-sweep-row-${ruinsMap.id}`; await expect(page.locator(row)).toBeVisible();
  expect(await ringOver(page, row)).toBe(true);
  await expect(bubble(page)).toContainText(`เสบียง ${ruinsMap.sweep.cost}`);
  await page.screenshot({ path: info.outputPath('lesson-sweep-390.png') });
  await page.locator('#lesson-ok').click(); await expect(page.locator('#lesson-layer')).toBeHidden();
  const seen = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).seen, lessonKey);
  expect(seen).toEqual(expect.arrayContaining(['farm', 'sweeppick', 'sweep']));
});

test('camp after map 3: the hunt target, then the boss target, point inside the hunt sheet', async ({ page }, info) => {
  await openCamp(page, clearedCamp(3), ['home', 'farm', 'sweep', 'open:fuse', 'open:bossCharm', 'open:hard']);
  await page.locator('#lobby-tab-hunt').click();
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'hunt'); expect(await ringOver(page, '#hunt-target')).toBe(true);
  await page.locator('#lesson-ok').click();
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'bosstarget'); await expect(page.locator('#boss-target')).toBeVisible();
  expect(await ringOver(page, '#boss-target')).toBe(true);
  await page.screenshot({ path: info.outputPath('lesson-boss-target-390.png') });
  await page.locator('#lesson-ok').click(); await expect(page.locator('#lesson-layer')).toBeHidden();
});

// OD-59: after map 1 the camp points at the World Boss banner, then at the new fate-weave banner (10 tickets waiting).
test('camp after map 1 introduces the World Boss and the fate-weave cabinet on their banners', async ({ page }, info) => {
  const p = clearedCamp(1); p.gacha = { tickets: 10, points: 0, serial: 0, history: [] };
  await openCamp(page, p, ['home', 'open:quests']);
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'open:wboss'); expect(await ringOver(page, '#lobby-wboss')).toBe(true);
  await page.locator('#lesson-ok').click();
  await expect(bubble(page)).toHaveAttribute('data-lesson-id', 'open:gacha'); expect(await ringOver(page, '#lobby-gacha')).toBe(true);
  await expect(page.locator('#lobby-gacha')).toContainText('ตั๋ว 10');
  await page.screenshot({ path: info.outputPath('lesson-gacha-390.png') });
  await page.locator('#lobby-gacha').click(); await expect(page.locator('#gacha-title')).toBeVisible();
});
