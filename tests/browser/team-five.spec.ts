import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { move, newExpedition } from '../../src/core/world/world';
import type { Direction, Profile } from '../../src/core/world/types';

// Native desktop rails must be visible in the test browser, just as in a normal desktop window.
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ignoreDefaultArgs: ['--hide-scrollbars'] } });

// P02 (OD-05): the five-hero field against five foes on a 390px phone (Chromium emulation, not iOS). Owner review shots:
// TEAM_FIVE_SHOTS=<dir> npx playwright test tests/browser/team-five.spec.ts
const dir = process.env.TEAM_FIVE_SHOTS;
const key = 'asterveil.fateweave.expedition.v1';
const ids = ['guardian', 'tracer', 'metta', 'weaver', 'healer'];
const reserve = ['mira', 'toma', 'garran'];
const members = Object.fromEntries([...ids, ...reserve].map(id => [id, { stars: 1, dupes: 0 }]));
const profile = (): Profile => ({ ...newProfile(map, 5), tutorialDone: true, commander: { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' },
  company: [...ids, ...reserve], members, party: { deployed: [...ids], reserve: [...reserve] } });
async function open(page: Page, encounterId: string | null) {
  const run = newExpedition(map, encounterById, 1234, { roster: { deployed: [...ids], reserve: [...reserve] }, members, reserveSlots: 3 }, true);
  run.fatigue = { guardian: 7, tracer: 11, mira: 1 }; run.potions.calm = 1;
  if (encounterId) run.battle = { kind: 'random', encounterId, entry: Object.fromEntries(ids.map(id => [id, run.hp[id]!])), commands: [] };
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: JSON.stringify({ version: 45, profile: profile(), run }) });
  await page.goto('./'); await page.locator('#continue').click();
  const start = page.locator('[data-ui=start]'); if (encounterId && await start.isVisible({ timeout: 3000 }).catch(() => false)) await start.click();
  return run;
}
for (const id of ['rift-legion', 'thorn-host']) test(`5v5 field ${id} at 390px: ten actors, readable intents, 44px controls, keyboard`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page, id);
  await expect(page.locator('#action-attack')).toBeEnabled({ timeout: 20000 }); await page.waitForTimeout(500);
  if (dir) await page.screenshot({ path: `${dir}/team-five-${id}-390.png` });
  // Every standing actor has a field target; the intent line names its real target.
  // Five foes take the field (targets for Attack); five heroes stand in the party strip on one row.
  await expect(page.locator('[data-field-unit]')).toHaveCount(10);
  const cards = await page.locator('#party .hero-card').evaluateAll(els => els.map(e => e.getBoundingClientRect().top));
  expect(cards).toHaveLength(5); expect(new Set(cards.map(Math.round)).size).toBe(1);
  await expect(page.locator('#intent')).not.toBeEmpty();
  // Owner: identical foes keep the same name; no ก/ข/ค suffix on the field or queue.
  const spiritNames = page.locator('[data-field-label^=b] .field-unit-name');
  if (id === 'rift-legion') expect(await spiritNames.allTextContents()).toEqual(Array(3).fill('Lv8 วิญญาณรอยแยก'));
  expect(await page.locator('#turn-order .turn-icon').evaluateAll(els => els.map(e => e.getAttribute('aria-label')).filter(t => / [กขค] · SPD/.test(t ?? '')))).toEqual([]);
  // All ten turns remain available at native touch size. Keyboard focus scrolls the last one into view;
  // inspection must not issue a command or change the save.
  await expect(page.locator('#turn-order .turn-slot')).toHaveCount(10);
  await expect(page.locator('.queue-hint')).toHaveText('คิว 10 · เลื่อนดู →');
  const beforeInspect = await page.evaluate(k => localStorage.getItem(k), key);
  const lastTurn = page.locator('#turn-order .turn-icon').last();
  await lastTurn.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#turn-detail')).toBeVisible();
  expect(await lastTurn.evaluate(el => { const a = el.getBoundingClientRect(), b = el.closest('ol')!.getBoundingClientRect(); return a.left >= b.left && a.right <= b.right; })).toBe(true);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(beforeInspect);
  for (const [id, w, h] of await page.locator('.field-target:not([disabled]), .command-dock button:visible, #turn-order .turn-icon').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [e.id || e.className, r.width, r.height] as const; })))
    expect(Math.min(w as number, h as number), String(id)).toBeGreaterThanOrEqual(44);
  // Keyboard: slot keys select, Escape cancels, a valid target click commits once.
  await page.keyboard.press('1'); await expect(page.locator('#action-attack')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.field-target.valid-target').first().click();
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.battle.commands.length, key)).toBe(1);
  // Owner 2026-10-31: fatigue is a coloured dot on each card (green fresh, yellow −10%, red −20%); the words live in ⓘ.
  await expect(page.locator('#party #hero-guardian .fatigue-dot.tired')).toBeVisible();
  await expect(page.locator('#party #hero-tracer .fatigue-dot.worn')).toBeVisible();
  await expect(page.locator('#party #hero-metta .fatigue-dot.fresh')).toBeVisible();
  await expect(page.locator('#party .fatigue-info')).toHaveCount(0);
  if (id === 'rift-legion') {
    await page.locator('#battle-info').click(); await page.locator('#status-unit-tracer').click();
    await expect(page.locator('#status-details .status-group.fatigue')).toContainText('ลด 20%');
    if (dir) await page.screenshot({ path: `${dir}/team-five-fatigue-info-390.png` });
    await page.keyboard.press('Escape'); await expect(page.locator('#game-info')).not.toBeVisible();
  }
  // Owner 2026-10-31: the mage's ward (a move for our side) is cast by tapping Seren's card in the HUD, once.
  await expect(page.locator('#action-ward')).toBeEnabled({ timeout: 20000 }); await page.locator('#action-ward').click();
  await expect(page.locator('#party #hero-healer.hud-target.valid-target')).toBeEnabled();
  await expect(page.locator('#party #hero-healer .hud-cast-cue')).toHaveText('ร่าย');
  if (dir) { await page.waitForTimeout(400); await page.screenshot({ path: `${dir}/team-five-${id}-turn2-390.png` }); }
  const box = await page.locator('#party #hero-healer').boundingBox(); expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(44);
  await page.locator('#party #hero-healer').click();
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.battle.commands.at(-1), key)).toMatchObject({ heroId: 'weaver', action: 'ward', targetId: 'healer' });
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.battle.commands.length, key)).toBe(2);
  expect(errors).toEqual([]); await context.close();
});
test('map team dialog: five on the field, the reserve and fatigue at 390px', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page, null);
  // The calming draught asks who drinks it, then eases that member's fatigue (7 → 3).
  await page.keyboard.press('b');
  if (dir) await page.screenshot({ path: `${dir}/team-five-bag-items-390.png` });
  await page.locator('#potion-calm').click(); await page.locator('#calm-guardian').click();
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.fatigue.guardian, key)).toBe(3);
  await page.locator('[data-world=pack-close]').click(); await page.locator('#world-team').click();
  await expect(page.locator('.team-fatigue[data-fatigue]').first()).toBeVisible();
  expect(await page.locator('.team-grid').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(3);
  expect(await page.locator('.team-card b, .team-card small').evaluateAll(els => els.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent))).toEqual([]);
  if (dir) await page.screenshot({ path: `${dir}/team-five-bag-390.png`, fullPage: false });
  expect(errors).toEqual([]); await context.close();
});
test('camp team page: five deployed, reserve slots by chapter at 390px', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  // The camp team page opens after map 1 (owner 2026-11-07); two chapters cleared open five reserve slots.
  const p = { ...profile(), cleared: ['ruined-border', 'deep-forest', 'veil-frontier'] };
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: JSON.stringify({ version: 45, profile: p, run: null }) });
  await page.goto('./'); await page.locator('#continue').click(); await expect(page.locator('#lobby-view')).toBeVisible();
  await page.locator('#lobby-tab-team').click();
  // Five reserve slots (three filled, two free).
  await expect(page.locator('#lobby-sheet .team-grid:not(.bench)').first().locator('.team-card')).toHaveCount(5);
  await expect(page.locator('#lobby-sheet .formation-cell[data-hero]')).toHaveCount(5);
  if (dir) await page.screenshot({ path: `${dir}/team-five-camp-390.png` });
  expect(errors).toEqual([]); await context.close();
});

test('the rift warden stands with two guards from round 1 (owner 2026-10-31) at 390px', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const run = newExpedition(map, encounterById, 1234, { roster: { deployed: [...ids], reserve: [...reserve] }, members, reserveSlots: 3 }, true);
  run.battle = { kind: 'boss', encounterId: 'rift-warden', entry: Object.fromEntries(ids.map(id => [id, run.hp[id]!])), commands: [] };
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: JSON.stringify({ version: 45, profile: profile(), run }) });
  await page.goto('./'); await page.locator('#continue').click();
  const start = page.locator('[data-ui=start]'); if (await start.isVisible({ timeout: 3000 }).catch(() => false)) await start.click();
  await expect(page.locator('#action-attack')).toBeEnabled({ timeout: 20000 }); await page.waitForTimeout(500);
  for (const foe of ['f1', 'f2', 'b3']) await expect(page.locator(`[data-field-unit=${foe}]`)).toBeVisible();
  await page.locator('#battle-info').click();
  await page.locator('#status-unit-b3').click();
  await expect(page.locator('#status-details h3')).toHaveText('Lv10 วิญญาณรอยแยก');
  if (dir) await page.screenshot({ path: `${dir}/team-five-warden-390.png` });
  expect(errors).toEqual([]); await context.close();
});


for (const width of [390, 320]) test(`map fatigue HUD at ${width}px: five values stay readable while walking and refresh after recovery`, async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 568 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const run = await open(page, null);
  await expect(page).toHaveTitle('Asterveil · Fateweave'); await expect(page.locator('#world-view')).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  const raw = () => page.evaluate(k => localStorage.getItem(k), key);
  const before = await raw();
  await expect(page.locator('#world-party .world-fatigue')).toHaveCount(5);
  for (const [id, value, tone] of [['guardian', 7, 'tired'], ['tracer', 11, 'worn'], ['metta', 0, 'fresh'], ['weaver', 0, 'fresh'], ['healer', 0, 'fresh']] as const) {
    const card = page.locator(`#world-hero-${id}`), badge = card.locator('.world-fatigue');
    await expect(badge).toHaveText(`ล้า ${value}`); await expect(badge.locator(`.fatigue-dot.${tone}`)).toBeVisible();
    await expect(card).toHaveAccessibleName(new RegExp(`ความล้า ${value} แต้ม`));
    expect(await card.evaluate(el => { const r = el.getBoundingClientRect(), label = el.querySelector('.world-fatigue')!, b = label.getBoundingClientRect();
      return r.width >= 44 && r.height >= 44 && b.left >= r.left && b.right <= r.right && b.top >= el.querySelector('.hero-copy')!.getBoundingClientRect().bottom && label.scrollWidth <= label.clientWidth && b.bottom <= r.bottom;
    })).toBe(true);
  }
  expect(await raw()).toBe(before);
  if (width === 390) await page.screenshot({ path: process.env.MAP_FATIGUE_SHOTS ? `${process.env.MAP_FATIGUE_SHOTS}/map-fatigue-390.png` : info.outputPath('map-fatigue.png') });
  // Read existing movement rules to choose one legal step that does not start a battle.
  const direction = (['up', 'right', 'down', 'left'] as Direction[]).find(d => {
    const next = move(run, map, d, encounterById).state;
    return !next.battle && (next.position.x !== run.position.x || next.position.y !== run.position.y);
  })!;
  expect(direction).toBeTruthy();
  const position = move(run, map, direction, encounterById).state.position;
  await page.locator(`#move-${direction}`).click();
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.position, key)).toEqual(position);
  await expect(page.locator('#world-view')).toBeVisible(); await expect(page.locator('#world-hero-guardian .world-fatigue')).toHaveText('ล้า 7');
  await page.keyboard.press('b'); await page.locator('#potion-calm').click(); await page.locator('#calm-guardian').click(); await page.keyboard.press('Escape');
  await expect(page.locator('#world-hero-guardian .world-fatigue')).toHaveText('ล้า 3');
  await expect(page.locator('#world-hero-guardian .fatigue-dot.fresh')).toBeVisible();
  await expect(page.locator('#world-hero-tracer .world-fatigue')).toHaveText('ล้า 11');
  const after = await raw();
  // Each card still opens the character sheet using the keyboard; reading it never changes the save.
  await page.locator('#world-hero-guardian').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#character-dialog')).toBeVisible(); await page.keyboard.press('Escape');
  expect(await raw()).toBe(after);
  expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]); await context.close();
});


test('desktop turn queue: native horizontal rail leaves all ten 44px portraits reachable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 768 }, reducedMotion: 'reduce' }), page = await context.newPage();
  await open(page, 'rift-legion'); await expect(page.locator('#action-attack')).toBeEnabled();
  const before = await page.evaluate(k => localStorage.getItem(k), key);
  const buttons = page.locator('#turn-order .turn-icon'); await expect(buttons).toHaveCount(10);
  await expect(buttons.first()).toBeInViewport({ ratio: 1 });
  for (const button of await buttons.all()) {
    expect(await button.evaluate(el => {
      const r = el.getBoundingClientRect(), phase = el.closest('#turn-phase')!.getBoundingClientRect();
      return r.width >= 44 && r.height >= 44 && r.top >= phase.top && r.bottom <= phase.bottom + 1;
    })).toBe(true);
  }
  const strip = page.locator('#turn-order ol');
  await strip.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => strip.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await expect(buttons.last()).toBeInViewport({ ratio: 1 });
  expect(await buttons.last().evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
  await strip.hover(); await page.mouse.wheel(-400, 0);
  await expect.poll(() => strip.evaluate(el => el.scrollLeft)).toBe(0);
  await expect(buttons.first()).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before);
  await context.close();
});
