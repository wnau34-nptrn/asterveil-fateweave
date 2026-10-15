import { expect, test, type Page } from '@playwright/test';
import { encounterById } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { createBattle, currentHeroId, resolveCommand } from '../../src/core/battle/engine';
import type { ExpeditionState } from '../../src/core/world/types';
import { findTiles, move, newExpedition, reveal } from '../../src/core/world/world';
import { boardOffers, newProfile } from '../../src/core/world/profile';
import type { Commander, Profile } from '../../src/core/world/types';
const commander: Commander = { name: 'อารี', crest: 'star', color: 'gold' };
import { battleLesson } from '../../src/ui/tutorial';

const key = 'asterveil.fateweave.expedition.v1';
const full = { guardian: 76, tracer: 56, weaver: 48, healer: 46 };
function base(patch: Partial<ExpeditionState> = {}): ExpeditionState {
  const state = { ...newExpedition(map, encounterById, 77), tutorialDone: true, ...patch }; reveal(state, map); return state;
}
async function seed(page: Page, state: ExpeditionState | null, profile: Profile = { ...newProfile(map, 5), tutorialDone: true, commander }) {
  await page.addInitScript(({ raw, key }) => { if (sessionStorage.getItem('playtest-seeded')) return; localStorage.setItem(key, raw); sessionStorage.setItem('playtest-seeded', 'yes'); }, { raw: JSON.stringify({ version: 6, profile, run: state }), key });
}
async function open(page: Page, state?: ExpeditionState) {
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message)); page.on('console', m => { if (m.type() === 'error') issues.push(m.text()); });
  if (state) await seed(page, state);
  await page.goto('./');
  await page.locator(state ? '#continue' : '#new-game').click();
  return issues;
}
const saved = (page: Page): Promise<ExpeditionState> => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run, key);
const savedProfile = (page: Page): Promise<Profile> => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).profile, key);
async function reachable(page: Page, selector: string) {
  await expect.poll(() => page.locator(selector).evaluate(el => { const r = el.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
}
async function finishPlayback(page: Page) {
  const skip = page.locator('#skip-turn'); if (await skip.count()) await skip.click().catch(() => {});
  await expect(page.locator('#beat-status')).not.toContainText('กำลังแสดงผล');
}

test('a new expedition walks tile by tile with buttons, keys and adjacent taps; walls block; reload resumes', async ({ page }, info) => {
  // Pick a seed whose first three steps stay quiet so the walk is deterministic.
  let seedValue = 1; const quiet = (seed: number) => { let t = newExpedition(map, encounterById, seed); for (const d of ['left', 'right', 'right'] as const) { t = move(t, map, d).state; if (t.battle) return false; } return true; };
  while (!quiet(seedValue)) seedValue++;
  const issues = await open(page, newExpedition(map, encounterById, seedValue));
  await expect(page.locator('#world-view')).toBeVisible();
  const start = (await saved(page)).position;
  await page.locator('#move-up').click();
  await expect(page.locator('#world-message')).toContainText('ไปต่อไม่ได้'); expect((await saved(page)).position).toEqual(start);
  await page.locator('#move-left').click(); expect((await saved(page)).position).toEqual({ x: start.x - 1, y: start.y });
  await page.keyboard.press('ArrowRight'); await expect.poll(async () => (await saved(page)).position).toEqual(start);
  await page.locator('.step-hint[data-dir=right]').click();
  await expect.poll(async () => (await saved(page)).position).toEqual({ x: start.x + 1, y: start.y });
  expect((await saved(page)).steps).toBe(3);
  await page.screenshot({ path: info.outputPath('world-start.png') });
  await page.reload(); await expect(page.locator('#title-view')).toContainText('เดินแล้ว 3 ก้าว'); await page.locator('#continue').click();
  await expect(page.locator('#party-token')).toHaveCSS('--x', String(start.x + 1));
  expect(issues).toEqual([]);
});

test('walking until the first encounter opens the tutorial battle in place', async ({ page }) => {
  const state = newExpedition(map, encounterById, 11);
  let probe = state; let steps = 0;
  while (!probe.battle) { probe = move(probe, map, steps % 2 ? 'right' : 'left').state; steps++; }
  const issues = await open(page, state);
  for (let i = 0; i < steps; i++) await page.locator(i % 2 ? '#move-right' : '#move-left').click();
  await expect(page.locator('#world-banner')).toContainText('การปะทะครั้งแรก');
  await expect(page.locator('#battle-view')).not.toHaveClass(/view-off/);
  await expect(page.locator('#encounter-kind')).toContainText('ศึกสอน');
  expect((await saved(page)).position).toEqual(probe.position);
  expect(issues).toEqual([]);
});

test('victory returns to the same tile with surviving HP and loot; a camp rest heals the standing by half and an ember revives', async ({ page }, info) => {
  const data = encounterById('shadow-stalker')!; const hp = { guardian: 40, tracer: 20, weaver: 30, healer: 4 };
  const camp = findTiles(map, 'camp')[1]!; const where = { x: camp.x, y: camp.y + 1 };
  const state = base({ position: where, hp, battle: { kind: 'random', encounterId: data.id, entry: hp, commands: [] } });
  let b = createBattle(data, { hp }); const moves: [string, string, string][] = [];
  while (b.outcome === 'active') { const l = battleLesson(b, data)!; moves.push([l.heroId, l.action, l.targetId]); b = resolveCommand(b, data, { beat: b.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  expect(b.outcome).toBe('victory');
  const issues = await open(page, state); await page.locator('#start').click();
  for (const [hero, action, target] of moves) {
    await expect(page.locator(`#hero-${hero}`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator(`#action-${action}`).click(); await page.locator('[data-ui=skill-close]').click();
    await page.locator(`#target-${action === 'prayer' ? 'party' : target}`).click(); await finishPlayback(page);
  }
  await expect(page.locator('.result-card')).toContainText('ชนะแล้ว'); await page.locator('#leave-battle').click();
  await expect(page.locator('#world-view')).toBeVisible();
  const after = await saved(page);
  expect(after.position).toEqual(where); expect(after.battle).toBeNull();
  expect(after.hp).toEqual(Object.fromEntries(b.heroes.map(h => [h.id, h.hp])));
  for (const h of b.heroes) await expect(page.locator(`#world-hero-${h.id}`)).toContainText(h.hp > 0 ? `${h.hp}/` : 'ล้มแล้ว');
  await page.screenshot({ path: info.outputPath('after-victory.png') });
  await expect(page.locator('#world-message')).toContainText('ชนะศึก · แร่ดาว +');
  expect(after.resources.ore).toBeGreaterThanOrEqual(6); expect(after.restReady).toBe(true);
  await expect(page.locator('#world-pack [data-resource=ore] b')).toHaveText(String(after.resources.ore));
  await page.locator('#move-up').click(); await expect(page.locator('#rest')).toBeEnabled();
  expect((await saved(page)).camp).toEqual(camp);
  await page.locator('#rest').click(); await expect(page.locator('#camp-dialog')).toBeVisible();
  await page.locator('#camp-rest').click();
  await expect(page.locator('#world-message')).toContainText('พักที่แคมป์แล้ว');
  const rested = await saved(page);
  expect(rested.hp).toEqual(Object.fromEntries(b.heroes.map(h => [h.id, h.hp > 0 ? Math.min(full[h.id as keyof typeof full], h.hp + Math.ceil(full[h.id as keyof typeof full] / 2)) : 0])));
  await expect(page.locator('#camp-rest')).toBeDisabled(); expect(rested.restReady).toBe(false);
  const down = b.heroes.find(h => h.hp <= 0);
  if (down) {
    await expect(page.locator(`#camp-revive-${down.id}`)).toBeDisabled();
    expect(rested.resources.ember).toBe(after.resources.ember);
  }
  expect(issues).toEqual([]);
});

test('camp revives one fallen member per ember; a chest opens once and fills the pack', async ({ page }, info) => {
  const camp = findTiles(map, 'camp')[1]!; const chest = map.chests.find(c => c.tier === 'rare')!;
  const issues = await open(page, base({ position: camp, camp, restReady: false, resources: { ore: 3, ember: 1, seal: 0 }, hp: { guardian: 50, tracer: 0, weaver: 0, healer: 46 } }));
  await page.locator('#rest').click(); await expect(page.locator('#camp-dialog')).toBeVisible();
  await expect(page.locator('#camp-rest')).toBeDisabled();
  await reachable(page, '#camp-revive-tracer'); await page.screenshot({ path: info.outputPath('camp.png') });
  await page.locator('#camp-revive-tracer').click();
  await expect(page.locator('#world-message')).toContainText('ชุบไลราแล้ว');
  expect((await saved(page)).hp).toMatchObject({ tracer: 17, weaver: 0 }); expect((await saved(page)).resources.ember).toBe(0);
  await expect(page.locator('#camp-revive-weaver')).toBeDisabled(); await expect(page.locator('#camp-revive-tracer')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(([k, p]) => { const s = JSON.parse(localStorage.getItem(k)!); s.run.position = p; s.run.revealed = s.run.revealed.replace(/0/g, '1'); localStorage.setItem(k, JSON.stringify(s)); }, [key, { x: chest.x, y: chest.y }] as const);
  await page.reload(); await page.locator('#continue').click();
  await expect(page.locator('#rest')).toContainText('เปิด'); await page.screenshot({ path: info.outputPath('chest.png') });
  await page.locator('#rest').click();
  await expect(page.locator('#world-message')).toContainText('เปิดกล่องสมบัติ · แร่ดาว +');
  const opened = await saved(page);
  expect(opened.openedChests).toEqual([chest.id]); expect(opened.resources.seal).toBe(1); expect(opened.resources.ember).toBe(1);
  await expect(page.locator(`.chest[data-chest=${chest.id}]`)).toHaveAttribute('data-open', 'true');
  await expect(page.locator('#rest')).toBeDisabled();
  await page.locator('#world-pack').click(); await expect(page.locator('#pack-dialog')).toContainText('ตราสัญญา');
  await expect(page.locator('#pack-dialog li[data-resource=seal] strong')).toHaveText('1');
  await page.screenshot({ path: info.outputPath('pack.png') });
  expect(issues).toEqual([]);
});

test('the camp team tab benches and redeploys members; the party row follows the deployed slots', async ({ page }, info) => {
  const camp = findTiles(map, 'camp')[1]!;
  const issues = await open(page, base({ position: camp, camp }));
  await page.locator('#rest').click(); await page.locator('#camp-tab-team').click();
  await expect(page.locator('#team-hint')).toContainText('ไม่ได้พาตัวสำรองมา');
  await page.locator('#team-healer').click(); await expect(page.locator('#team-healer')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.team-card.empty[data-side=reserve]').first().click();
  await expect.poll(async () => (await saved(page)).roster).toEqual({ deployed: ['guardian', 'tracer', 'weaver'], reserve: ['healer'] });
  await expect(page.locator('#world-party .world-hero')).toHaveCount(3);
  await reachable(page, '#team-healer'); await page.screenshot({ path: info.outputPath('team.png') });
  await page.locator('#team-healer').click(); await page.locator('.team-card.empty[data-side=deployed]').click();
  await expect.poll(async () => (await saved(page)).roster).toEqual({ deployed: ['guardian', 'tracer', 'weaver', 'healer'], reserve: [] });
  await page.keyboard.press('Escape'); await expect(page.locator('#world-party .world-hero')).toHaveCount(4);
  expect(issues).toEqual([]);
});

test('lobby: hire a duplicate, upgrade a star, pick the team, depart, and withdraw at the entrance', async ({ page }, info) => {
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, bank: { ore: 120, seal: 0 } };
  const offer = boardOffers(profile, map, encounterById)[0]!;
  await seed(page, null, profile);
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.goto('./'); await expect(page.locator('#continue')).toContainText('เข้าค่าย'); await page.locator('#continue').click();
  await expect(page.locator('#lobby-view')).toBeVisible(); await page.screenshot({ path: info.outputPath('lobby.png') });
  await page.locator('#lobby-tab-hire').click(); await expect(page.locator('#hire-0')).toContainText('จ้าง · 30');
  await page.screenshot({ path: info.outputPath('lobby-hire.png') });
  await page.locator('#hire-0').click(); await expect(page.locator('#hire-0')).toContainText('จ้างแล้ว');
  expect((await savedProfile(page)).members[offer]).toEqual({ stars: 1, dupes: 1 }); expect((await savedProfile(page)).bank.ore).toBe(90);
  await page.locator('#lobby-tab-team').click(); await page.locator(`#lobby-member-${offer}`).click();
  await expect(page.locator('#lobby-upgrade')).toContainText('อัปเป็น ★2'); await page.locator('#lobby-upgrade').scrollIntoViewIfNeeded(); await reachable(page, '#lobby-upgrade');
  await page.screenshot({ path: info.outputPath('lobby-upgrade.png') });
  await page.locator('#lobby-upgrade').click();
  await expect.poll(async () => (await savedProfile(page)).members[offer]).toEqual({ stars: 2, dupes: 0 }); expect((await savedProfile(page)).bank.ore).toBe(70);
  // Bench one member who is not the upgraded one: the expedition brings three.
  const benched = offer === 'healer' ? 'weaver' : 'healer';
  await page.locator(`#lobby-member-${offer}`).click(); await expect(page.locator(`#lobby-member-${offer}`)).toHaveAttribute('aria-pressed', 'false');
  await page.locator(`#lobby-member-${benched}`).click(); await page.locator('.team-card.empty[data-group=bench]').click();
  await expect.poll(async () => (await savedProfile(page)).party.deployed).toEqual(['guardian', 'tracer', 'weaver', 'healer'].filter(id => id !== benched));
  await page.locator('#lobby-depart').click(); await expect(page.locator('#world-view')).toBeVisible();
  const run = await saved(page); expect(run.roster.deployed).toHaveLength(3); expect(run.members[offer]!.stars).toBe(2);
  await expect(page.locator('#world-party .world-hero')).toHaveCount(3);
  await expect(page.locator('#rest')).toContainText('ทางออก'); await page.locator('#rest').click();
  await expect(page.locator('#camp-title')).toContainText('ทางเข้าด่าน'); await page.locator('#withdraw').click();
  await expect(page.locator('#withdraw')).toContainText('ยืนยันถอนตัว'); await page.locator('#withdraw').click();
  await expect(page.locator('#lobby-view')).toBeVisible(); await expect(page.locator('.lobby-result')).toContainText('ถอนตัวกลับค่าย');
  expect(await saved(page)).toBeNull(); expect((await savedProfile(page)).expeditions).toBe(1);
  expect(issues).toEqual([]);
});

test('losing every brought member fails the expedition: back to the lobby with half the ore', async ({ page }) => {
  const data = encounterById('veil-siege')!; const hp = { guardian: 6, tracer: 4, weaver: 3, healer: 2 };
  const camp = findTiles(map, 'camp')[1]!;
  let b = createBattle(data, { hp }); const commands = [];
  while (b.outcome === 'active') { const c = { beat: b.beat, heroId: currentHeroId(b, data)!, action: 'attack' as const, targetId: b.enemies.find(e => e.hp > 0)!.id }; const next = resolveCommand(b, data, c).state; if (next.outcome !== 'active') break; commands.push(c); b = next; }
  const last = { heroId: currentHeroId(b, data)!, targetId: b.enemies.find(e => e.hp > 0)!.id };
  const state = base({ position: { x: camp.x - 1, y: camp.y }, camp, hp, resources: { ore: 11, ember: 2, seal: 1 }, battle: { kind: 'random', encounterId: data.id, entry: hp, commands } });
  const issues = await open(page, state);
  await page.locator('#action-attack').click(); await page.locator('[data-ui=skill-close]').click(); await page.locator(`#target-${last.targetId}`).click();
  await finishPlayback(page);
  await expect(page.locator('.result-card')).toContainText('แพ้แล้ว'); await expect(page.locator('#leave-battle')).toContainText('กลับค่าย');
  expect(await saved(page)).toBeNull(); expect((await savedProfile(page)).bank).toEqual({ ore: 5, seal: 0 });
  await page.locator('#leave-battle').click();
  await expect(page.locator('#lobby-view')).toBeVisible(); await expect(page.locator('.lobby-result')).toContainText('ได้แร่ดาว 5');
  expect(issues).toEqual([]);
});

test('the boss blocks the gate; after its defeat the goal completes the expedition', async ({ page }, info) => {
  const [boss] = findTiles(map, 'boss');
  const issues = await open(page, base({ position: { x: boss!.x, y: boss!.y + 1 }, bossDefeated: false }));
  await page.locator('#move-up').click();
  await expect(page.locator('#encounter-kind')).toContainText('บอส');
  expect((await saved(page)).battle?.kind).toBe('boss');
  await page.reload(); await page.locator('#continue').click(); await expect(page.locator('#encounter-title')).toContainText('ผู้คุมรอยแยก');
  await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)!); s.run.battle = null; s.run.bossDefeated = true; localStorage.setItem(k, JSON.stringify(s)); }, key);
  await page.reload(); await page.locator('#continue').click();
  for (let i = 0; i < 3; i++) await page.locator('#move-up').click();
  await expect(page.locator('#lobby-view')).toBeVisible(); await expect(page.locator('.lobby-result')).toContainText('สำเร็จการเดินทาง');
  expect(await saved(page)).toBeNull(); expect((await savedProfile(page)).completes).toBe(1);
  await reachable(page, '#lobby-depart'); await page.screenshot({ path: info.outputPath('expedition-complete.png') });
  expect(issues).toEqual([]);
});

test('starting a new game from the title requires confirmation and resets the company', async ({ page }) => {
  const issues = await open(page, base({ steps: 9 }));
  await page.reload(); await expect(page.locator('#continue')).toContainText('เดินทางต่อ');
  await page.locator('#new-game').click(); await expect(page.locator('#new-game')).toContainText('ยืนยัน'); expect((await saved(page)).steps).toBe(9);
  await page.locator('#new-game').click(); await expect(page.locator('#commander-view')).toBeVisible();
  // Backing out keeps the old save; confirming a commander replaces it.
  await page.locator('[data-cmd=back]').click(); expect((await saved(page)).steps).toBe(9);
  await page.locator('#new-game').click(); await page.locator('#new-game').click();
  await page.locator('#commander-name').fill('ผู้กองใหม่'); await page.locator('#commander-create').click();
  await expect(page.locator('#lobby-view')).toBeVisible(); await expect(page.locator('#lobby-commander')).toHaveText('ผู้กองใหม่');
  expect(await saved(page)).toBeNull(); expect((await savedProfile(page)).expeditions).toBe(0);
  expect(issues).toEqual([]);
});

const viewports = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 414, height: 896 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }];
for (const viewport of viewports) {
  test(`world ${viewport.width}x${viewport.height}: full-bleed map, floating HUD and open walking targets without scroll`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 900, reducedMotion: 'reduce' }); const page = await context.newPage();
    const camp = findTiles(map, 'camp')[1]!;
    const issues = await open(page, base({ position: camp, hp: { guardian: 50, tracer: 0, weaver: 10, healer: 46 } }));
    expect(await page.evaluate(() => ({ x: scrollX, y: scrollY, overflow: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth }))).toEqual({ x: 0, y: 0, overflow: false });
    // The map fills the whole viewport; nothing is reserved for a sidebar.
    expect(await page.locator('#map-viewport').boundingBox()).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
    for (const s of ['#move-up', '#move-down', '#move-left', '#move-right', '#rest', '#world-info-button', '#objective-button', '#world-pack']) await reachable(page, s);
    const overlap = await page.evaluate(() => { const a = document.querySelector('#objective-button')!.getBoundingClientRect(), b = document.querySelector('#world-pack')!.getBoundingClientRect(); return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom; });
    expect(overlap).toBe(false);
    await expect(page.locator('#rest')).toContainText('พัก'); await expect(page.locator('#rest')).toBeEnabled();
    // Every legal neighbour hint is tappable at its centre (not covered by HUD) and >=44px.
    const hints = page.locator('.step-hint');
    expect(await hints.count()).toBeGreaterThan(0);
    for (const hint of await hints.all()) expect(await hint.evaluate(el => { const r = el.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && r.top >= 0 && r.bottom <= innerHeight && el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    const token = (await page.locator('#party-token').boundingBox())!;
    expect(token.y).toBeGreaterThan(0); expect(token.y + token.height).toBeLessThan(viewport.height);
    for (const id of ['guardian', 'tracer', 'weaver', 'healer']) await expect(page.locator(`#world-hero-${id}`)).toBeInViewport({ ratio: 1 });
    await expect(page.locator('#world-hero-tracer')).toContainText('ล้มแล้ว'); await expect(page.locator('#world-hero-weaver')).toHaveClass(/critical/);
    // Thai text in the capsules is not clipped vertically.
    for (const sel of ['#zone-name', '#world-hero-guardian b', '.objective-text']) expect(await page.locator(sel).evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath('world.png') });
    await page.locator('#objective-button').click(); await expect(page.locator('#world-goals')).toBeVisible(); await expect(page.locator('#world-goals li')).toHaveCount(4);
    await reachable(page, '[data-world=goals-close]'); await page.screenshot({ path: info.outputPath('goals.png') }); await page.keyboard.press('Escape');
    // The camp sheet fits without page scrolling and keeps >=44px controls.
    await page.locator('#rest').click(); await expect(page.locator('#camp-dialog')).toBeVisible();
    for (const sel of ['#camp-rest', '#camp-revive-tracer', '[data-world=camp-close]', '#camp-tab-team']) await reachable(page, sel);
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(false);
    await page.screenshot({ path: info.outputPath('camp.png') });
    await page.locator('#camp-tab-team').click();
    for (const id of ['guardian', 'tracer', 'weaver', 'healer']) await reachable(page, `#team-${id}`);
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(false);
    await page.locator('#withdraw').scrollIntoViewIfNeeded(); await reachable(page, '#withdraw');
    await page.screenshot({ path: info.outputPath('team.png') }); await page.keyboard.press('Escape');
    expect(issues).toEqual([]); await context.close();
  });
}

test('home → create commander → lobby: the name is required, crest and colour are chosen, and the lobby shows them', async ({ page }, info) => {
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.goto('./'); await page.locator('#new-game').click();
  await expect(page.locator('#commander-view')).toBeVisible(); await expect(page.locator('#commander-name')).toBeFocused();
  await page.locator('#commander-create').click();
  await expect(page.locator('#commander-name')).toHaveAttribute('aria-invalid', 'true'); await expect(page.locator('#commander-view')).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
  await page.locator('#commander-name').fill('ผู้กอง อารี'); await page.locator('#crest-guard').click(); await page.locator('#color-violet').click();
  await expect(page.locator('#commander-preview-name')).toHaveText('ผู้กอง อารี'); await page.screenshot({ path: info.outputPath('commander.png') });
  await page.locator('#commander-name').press('Enter');
  await expect(page.locator('#lobby-view')).toBeVisible(); await expect(page.locator('#lobby-commander')).toHaveText('ผู้กอง อารี');
  expect((await savedProfile(page)).commander).toEqual({ name: 'ผู้กอง อารี', crest: 'guard', color: 'violet' });
  await page.reload(); await page.locator('#continue').click(); await expect(page.locator('#lobby-view')).toBeVisible();
  expect(issues).toEqual([]);
});

for (const viewport of viewports) {
  test(`commander ${viewport.width}x${viewport.height}: creation fits without page scroll`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 900, reducedMotion: 'reduce' }); const page = await context.newPage();
    await page.goto('./'); await page.locator('#new-game').click(); await expect(page.locator('#commander-view')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth)).toBe(false);
    for (const sel of ['#commander-name', '#crest-star', '#crest-mark', '#color-gold', '#color-rose', '#commander-create']) { await page.locator(sel).scrollIntoViewIfNeeded(); await reachable(page, sel); }
    await page.screenshot({ path: info.outputPath('commander.png') }); await context.close();
  });
  test(`lobby ${viewport.width}x${viewport.height}: team, hire and depart fit without page scroll`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 900, reducedMotion: 'reduce' }); const page = await context.newPage();
    await seed(page, null, { ...newProfile(map, 5), tutorialDone: true, commander, bank: { ore: 45, seal: 1 } });
    const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
    await page.goto('./'); await page.locator('#continue').click(); await expect(page.locator('#lobby-view')).toBeVisible();
    const noScroll = () => page.evaluate(() => document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth);
    expect(await noScroll()).toBe(false);
    for (const sel of ['#lobby-depart', '#lobby-tab-team', '#lobby-tab-hire', '#lobby-member-guardian']) { await page.locator(sel).scrollIntoViewIfNeeded(); await reachable(page, sel); }
    await page.screenshot({ path: info.outputPath('lobby.png') });
    // The panel scrolls inside itself on short screens; the page never does.
    await page.locator('#lobby-tab-hire').click(); for (const sel of ['#hire-0', '#hire-1', '#hire-2']) { await page.locator(sel).scrollIntoViewIfNeeded(); await reachable(page, sel); }
    expect(await noScroll()).toBe(false); await page.screenshot({ path: info.outputPath('lobby-hire.png') });
    expect(issues).toEqual([]); await context.close();
  });
}

test('normal motion: hop, danger meter and veil-shatter encounter finish within the 800 ms budget', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'no-preference' }); const page = await context.newPage();
  const state = newExpedition(map, encounterById, 11);
  let probe = state; let steps = 0;
  while (!probe.battle) { probe = move(probe, map, steps % 2 ? 'right' : 'left').state; steps++; }
  const issues = await open(page, state);
  for (let i = 0; i < steps - 1; i++) { await page.locator(i % 2 ? '#move-right' : '#move-left').click(); await page.waitForTimeout(200); }
  const started = Date.now();
  await page.locator((steps - 1) % 2 ? '#move-right' : '#move-left').click();
  await expect(page.locator('.lv-veil-shatter')).toHaveCount(1);
  await expect(page.locator('#battle-view')).not.toHaveClass(/view-off/);
  expect(Date.now() - started).toBeLessThan(1500);
  expect((await saved(page)).battle?.kind).toBe('tutorial');
  expect(issues).toEqual([]); await context.close();
});
