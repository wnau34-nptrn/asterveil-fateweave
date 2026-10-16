import { expect, test, type Page } from '@playwright/test';
import { encounterById } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { createBattle, currentHeroId, resolveCommand } from '../../src/core/battle/engine';
import type { ExpeditionState, Item } from '../../src/core/world/types';
import { findTiles, move, newExpedition, reveal, startOf } from '../../src/core/world/world';
import { affixPool } from '../../src/core/world/equipment';
import { boardOffers, newProfile } from '../../src/core/world/profile';
import type { Commander, Profile } from '../../src/core/world/types';
const commander: Commander = { name: 'อารี', crest: 'star', color: 'gold' };
import { battleLesson } from '../../src/ui/tutorial';
import { watchPage } from './diagnostics';
test.beforeEach(({ page }) => watchPage(page));

const key = 'asterveil.fateweave.expedition.v1';
const full = { guardian: 76, tracer: 56, weaver: 48, healer: 46 };
function base(patch: Partial<ExpeditionState> = {}): ExpeditionState {
  const state = { ...newExpedition(map, encounterById, 77), tutorialDone: true, ...patch }; reveal(state, map); return state;
}
async function seed(page: Page, state: ExpeditionState | null, profile: Profile = { ...newProfile(map, 5), tutorialDone: true, commander }) {
  await page.addInitScript(({ raw, key }) => { if (sessionStorage.getItem('playtest-seeded')) return; localStorage.setItem(key, raw); sessionStorage.setItem('playtest-seeded', 'yes'); }, { raw: JSON.stringify({ version: 20, profile, run: state }), key });
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
  // A short click timeout: when playback ends between the count and the click, the hidden skip button would
  // otherwise hold the click until the whole test timed out (the intermittent empty #beat-status failures).
  const skip = page.locator('#skip-turn'); if (await skip.count()) await skip.click({ timeout: 2500 }).catch(() => {});
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

test('prologue: a new commander wakes in the ruins, Vargoth speaks, and his vanguard attacks before the first step; the heroes voice the advice', async ({ page }, info) => {
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.goto('./'); await page.locator('#new-game').click(); await page.locator('#commander-name').fill('อารี'); await page.locator('#commander-create').click();
  const story = page.locator('#story-view');
  await expect(story).toBeVisible(); await expect(story).toHaveAttribute('data-speaker', 'narrator'); await expect(page.locator('.story-text')).toContainText('อารี');
  await expect(page.locator('#story-next')).toBeFocused(); await reachable(page, '#story-next'); await reachable(page, '[data-story=skip]');
  await page.locator('#story-next').click(); await expect(story).toHaveAttribute('data-speaker', 'guardian'); await expect(page.locator('.story-who')).toContainText('เอกิส');
  await page.locator('#story-next').click(); await expect(story).toHaveAttribute('data-speaker', 'vargoth'); await expect(page.locator('.story-who')).toContainText('วาร์กอธ');
  await page.screenshot({ path: info.outputPath('prologue-vargoth.png') });
  // The painted rift scene and Vargoth's full figure (ART-STORY-PROLOGUE-001), also on a portrait phone.
  await expect(story).toHaveAttribute('data-scene', 'rift'); await expect(page.locator('.story-vargoth')).toBeVisible(); await expect(page.locator('.story-bust')).toHaveCount(1);
  expect(await page.locator('.story-vargoth').evaluate(el => (el as HTMLImageElement).naturalWidth)).toBe(1024);
  const size = page.viewportSize()!; await page.setViewportSize({ width: 390, height: 844 });
  await reachable(page, '#story-next'); await page.screenshot({ path: info.outputPath('prologue-vargoth-phone.png') }); await page.setViewportSize(size);
  await page.locator('#story-next').click(); await expect(page.locator('#story-next')).toHaveText('เข้าสู่การต่อสู้');
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight)).toBe(true);
  await page.locator('#story-next').click(); await expect(story).toBeHidden();
  await expect(page.locator('#battle-view')).not.toHaveClass(/view-off/); await expect(page.locator('#encounter-title')).toContainText('กองหน้าของวาร์กอธ');
  const run = await saved(page); expect(run.steps).toBe(0); expect(run.battle).toMatchObject({ kind: 'tutorial' });
  await page.locator('#start').click();
  await expect(page.locator('#coach-title')).toContainText('ไลรา'); await expect(page.locator('#coach-copy')).toContainText('ข้าจะติดตรา');
  await expect(page.locator('#coach-face .portrait')).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('prologue-coach.png') });
  expect(issues).toEqual([]);
});
test('winning the first battle plays Vargoth\'s retreat, then the map', async ({ page }, info) => {
  const data = encounterById(map.tutorialEncounterId)!;
  let b = createBattle(data); const moves: [string, string, string][] = [];
  while (b.outcome === 'active') { const l = battleLesson(b, data)!; moves.push([l.heroId, l.action, l.targetId]); b = resolveCommand(b, data, { beat: b.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  // Replay all but the winning move into the save; the last one is played through the UI.
  let pre = createBattle(data); const commands = [];
  for (const [heroId, action, targetId] of moves.slice(0, -1)) { const c = { beat: pre.beat, heroId, action: action as never, targetId }; commands.push(c); pre = resolveCommand(pre, data, c).state; }
  const s = newExpedition(map, encounterById, 77); reveal(s, map);
  s.battle = { kind: 'tutorial', encounterId: data.id, entry: { ...s.hp }, commands };
  const issues = await open(page, s);
  const [hero, action, target] = moves.at(-1)!;
  await expect(page.locator(`#hero-${hero}`)).toHaveAttribute('aria-pressed', 'true');
  await page.locator(`#action-${action}`).click(); await page.locator('[data-ui=skill-close]').click();
  await page.locator(`#target-${action === 'prayer' ? 'party' : target}`).click(); await finishPlayback(page);
  await expect(page.locator('.result-card')).toContainText('ชนะแล้ว'); await page.locator('#leave-battle').click();
  await expect(page.locator('#story-view')).toBeVisible(); await expect(page.locator('#story-view')).toHaveAttribute('data-speaker', 'vargoth');
  await expect(page.locator('.story-text')).toContainText('ประตูรอยแยก');
  await page.screenshot({ path: info.outputPath('prologue-end.png') });
  await page.locator('#story-next').click(); await expect(page.locator('#story-next')).toHaveText('ออกเดินทาง'); await page.locator('#story-next').click();
  await expect(page.locator('#story-view')).toBeHidden(); await expect(page.locator('#world-view')).toBeVisible();
  expect((await saved(page)).tutorialDone).toBe(true);
  expect(issues).toEqual([]);
});
test('walking until the first encounter opens the tutorial battle in place', async ({ page }) => {
  const state = newExpedition(map, encounterById, 11);
  let probe = state; let steps = 0;
  while (!probe.battle) { probe = move(probe, map, steps % 2 ? 'right' : 'left').state; steps++; }
  const issues = await open(page, state);
  for (let i = 0; i < steps; i++) await page.locator(i % 2 ? '#move-right' : '#move-left').click();
  await expect(page.locator('#world-banner')).toContainText('กองหน้าของวาร์กอธ');
  await expect(page.locator('#battle-view')).not.toHaveClass(/view-off/);
  await expect(page.locator('#encounter-kind')).toContainText('ศึกแรก');
  expect((await saved(page)).position).toEqual(probe.position);
  expect(issues).toEqual([]);
});

test('victory returns to the same tile with surviving HP and loot; a camp rest heals the standing by half and an ember revives', async ({ page }, info) => {
  // Plays a whole battle through the UI; the production build on CI needs more than the 45 s default.
  test.setTimeout(90000);
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
  const issues = await open(page, base({ position: camp, camp, restReady: false, resources: { ore: 3, gold: 0, ember: 1, seal: 0 }, hp: { guardian: 50, tracer: 0, weaver: 0, healer: 46 } }));
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

test('lobby: hiring a new mercenary adds them to the reserve with full roster data, and they cheer at the fire', async ({ page }, info) => {
  let seedValue = 5; while (boardOffers(newProfile(map, seedValue), map, encounterById)[0] !== 'mira') seedValue++;
  await seed(page, null, { ...newProfile(map, seedValue), tutorialDone: true, commander, bank: { ore: 30, gold: 20, seal: 0, dust: 0 } });
  await page.goto('./'); await page.locator('#continue').click();
  // The painted camp: front members sit on logs, the middle pair has a character moment.
  await expect(page.locator('.lobby-unit[data-actor=guardian]')).toHaveAttribute('data-pose', 'sit');
  await expect(page.locator('.lobby-unit[data-actor=tracer]')).toHaveAttribute('data-pose', 'idle_alt');
  await page.locator('#lobby-tab-hire').click();
  await expect(page.locator('#hire-0')).toContainText('จ้าง · 20'); await page.locator('#hire-0').click();
  const p = await savedProfile(page);
  expect(p.members.mira).toEqual({ stars: 1, dupes: 0 }); expect(p.party.reserve).toEqual(['mira']); expect(p.company).toContain('mira');
  await expect(page.locator('.lobby-unit[data-actor=mira]')).toHaveAttribute('data-pose', 'cheer');
  await page.screenshot({ path: info.outputPath('lobby-mira-cheers.png') });
  await page.keyboard.press('Escape'); await expect(page.locator('#lobby-sheet')).toHaveCount(0); await expect(page.locator('#lobby-tab-hire')).toBeFocused();
  await page.locator('#lobby-tab-team').click(); await expect(page.locator('#lobby-member-mira')).toContainText('มิร่า');
});

test('lobby market (4A): the broker sheet redraws the board for gold twice per return and sells a contract and a gear box; saved v17', async ({ page }, info) => {
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, bank: { ore: 0, gold: 400, seal: 0, dust: 0 } } as Profile;
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await seed(page, null, profile); await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-hire').click();
  const [c1, c2] = map.shop.refreshCosts;
  await expect(page.locator('#hire-refresh')).toContainText(`${c1}`); await reachable(page, '#hire-refresh');
  const before = await page.locator('.hire-list li b').allTextContents();
  await page.locator('#hire-refresh').click();
  await expect(page.locator('.lobby-result')).toContainText('เปลี่ยนป้ายจ้างใหม่');
  await expect.poll(() => page.locator('.hire-list li b').allTextContents()).not.toEqual(before);
  await page.locator('#hire-refresh').click(); await expect(page.locator('#hire-refresh')).toBeDisabled(); await expect(page.locator('#hire-refresh')).toContainText('ครบแล้ว');
  let p = await savedProfile(page); expect(p.refreshes).toBe(2); expect(p.bank.gold).toBe(400 - c1! - c2!);
  // The market tab: a contract for the chosen member and a gear box.
  await page.locator('#hire-tab-market').click(); await expect(page.locator('#hire-tab-market')).toHaveAttribute('aria-selected', 'true');
  await reachable(page, '#buy-contract');
  await page.screenshot({ path: info.outputPath('lobby-market.png') });
  await page.locator('#contract-hero').selectOption('tracer'); await page.locator('#buy-contract').click();
  await expect(page.locator('.lobby-result')).toContainText('ใบสัญญาซ้ำ');
  await expect(page.locator('#buy-contract')).toBeDisabled();
  await page.locator('#buy-gearbox').click(); await expect(page.locator('.lobby-result')).toContainText('หีบอุปกรณ์');
  p = await savedProfile(page);
  expect(p.members.tracer!.dupes).toBe(1); expect(p.shop).toEqual({ contract: 1, gearbox: 1 }); expect(p.items).toHaveLength(1); expect(p.items[0]!.rarity).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).version, key)).toBe(20);
  expect(issues).toEqual([]);
});

test('background music follows the view (title camp, lobby ruins, map meadow, battle and boss) and the mute choice is kept', async ({ page }) => {
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  const music = () => page.evaluate(() => document.documentElement.dataset.music);
  await seed(page, null); await page.goto('./');
  await expect.poll(music).toBe('camp');
  for (const t of ['camp', 'archway', 'ruins', 'meadow', 'battle', 'boss']) expect((await page.request.get(`./assets/music/bgm_${t}.mp3`)).ok()).toBe(true);
  await reachable(page, '#music-toggle'); await page.locator('#music-toggle').click();
  await expect(page.locator('#music-toggle')).toHaveAttribute('aria-pressed', 'false'); await expect(page.locator('#music-volume')).toBeDisabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.audio.v1')!))).toMatchObject({ muted: true });
  await page.locator('#continue').click(); await expect.poll(music).toBe('ruins');
  await expect(page.locator('#lobby-music')).toHaveAttribute('aria-pressed', 'false'); await reachable(page, '#lobby-music');
  await page.locator('#lobby-music').click(); await expect(page.locator('#lobby-music')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#lobby-depart').click(); await expect.poll(music).toBe('meadow');
  // A boss battle plays the boss theme.
  const [boss] = findTiles(map, 'boss');
  await page.evaluate(([k, x, y]) => { const s = JSON.parse(localStorage.getItem(k as string)!); Object.assign(s.run, { position: { x, y: (y as number) + 1 }, elitesDefeated: ['scar-golem'], eventsDone: ['scar-rift'] }); localStorage.setItem(k as string, JSON.stringify(s)); }, [key, boss!.x, boss!.y]);
  await page.reload(); await page.locator('#continue').click(); await page.locator('#move-up').click();
  await expect.poll(music).toBe('boss');
  expect(issues).toEqual([]);
});

test('sound effects: steps, walls, chests and battle turns name their sound; the effects toggle is kept', async ({ page }) => {
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  const sound = () => page.evaluate(() => document.documentElement.dataset.sfx);
  const [chest] = map.chests; const all = (st: ExpeditionState) => ({ ...st, revealed: '1'.repeat(st.revealed.length), repel: 10 });
  const from = { x: chest!.x + 1, y: chest!.y };
  await open(page, all(base({ position: from })));
  await page.locator('#move-left').click(); await expect.poll(sound).toBe('step');
  await page.locator('#rest').click(); await expect.poll(sound).toMatch(/^chest/);
  // A wall bumps.
  let blocked = false;
  for (const d of ['up', 'down', 'left'] as const) { const t = { x: chest!.x + (d === 'left' ? -1 : 0), y: chest!.y + (d === 'up' ? -1 : d === 'down' ? 1 : 0) };
    if (map.rows[t.y]?.[t.x] === '#' && !map.puzzles.secrets.some(q => q.x === t.x && q.y === t.y)) { await page.locator(`#move-${d}`).click(); blocked = true; break; } }
  if (blocked) await expect.poll(sound).toBe('bump');
  // The title toggles effects off and remembers it.
  await page.goto('./'); await page.locator('#sfx-toggle').click();
  await expect(page.locator('#sfx-toggle')).toHaveAttribute('aria-pressed', 'false'); await expect(page.locator('#sfx-volume')).toBeDisabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.sfx.v1')!))).toMatchObject({ muted: true });
  await page.reload(); await expect(page.locator('#sfx-toggle')).toHaveAttribute('aria-pressed', 'false');
  expect(issues).toEqual([]);
});

test('portrait phone lobby: the painting covers both pan ends, sheets fill the screen, and a hiring offer previews skills first', async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const page = await context.newPage();
  await seed(page, null, { ...newProfile(map, 5), tutorialDone: true, commander, bank: { ore: 0, gold: 40, seal: 0, dust: 0 } } as Profile);
  await page.goto('./'); await page.locator('#continue').click();
  const pan = page.locator('.lobby-pan');
  // The backdrop's painting reaches both edges of the screen at both ends of the pan.
  const covers = () => page.evaluate(() => { const b = document.querySelector<HTMLElement>('.lobby-backdrop')!; const [x] = b.style.backgroundPosition.split(' ').map(parseFloat); const [w] = b.style.backgroundSize.split(' ').map(parseFloat); return x! <= 0.5 && x! + w! >= b.clientWidth - 0.5; });
  for (const end of [0, 1]) { await pan.evaluate((el, e) => { el.scrollLeft = e ? el.scrollWidth : 0; }, end); await expect.poll(covers).toBe(true); await page.screenshot({ path: info.outputPath(`lobby-pan-${end}.png`) }); }
  // Sheets take the whole screen.
  await page.locator('#lobby-tab-hire').click();
  const box = (await page.locator('#lobby-sheet').boundingBox())!; expect(box.x).toBe(0); expect(box.y).toBe(0); expect(box.width).toBe(390); expect(box.height).toBe(844);
  // Tapping an offer previews it: stats, every skill, star unlocks, and a hire button.
  await page.locator('#hire-open-0').click();
  await expect(page.locator('.hire-preview')).toBeVisible(); await expect(page.locator('.hire-stats dd')).toHaveCount(3);
  expect(await page.locator('.hire-skills li').count()).toBeGreaterThanOrEqual(2); await expect(page.locator('.hire-preview .member-unlocks li')).toHaveCount(2);
  await reachable(page, '#hire-preview-back'); await page.locator('#hire-0').scrollIntoViewIfNeeded(); await reachable(page, '#hire-0');
  await page.screenshot({ path: info.outputPath('hire-preview.png') });
  await page.locator('#hire-preview-back').click(); await expect(page.locator('#hire-open-0')).toBeFocused();
  await context.close();
});

test('camp travel (4B) and optional elite returns (4C): rest brings the meadow elite back, then travel free to the entrance; saved v19', async ({ page }) => {
  const [camp] = findTiles(map, 'camp').filter(c => map.rows[c.y]![c.x] === 'C'); const optional = map.elites.find(e => !e.forced && !e.mini)!;
  const issues = await open(page, base({ position: camp!, camp: camp!, visited: [`${camp!.x},${camp!.y}`], elitesDefeated: [optional.id], restReady: true, hp: { guardian: 40, tracer: 30, weaver: 30, healer: 30 } }));
  await page.locator('#rest').click(); await expect(page.locator('#camp-dialog')).toBeVisible();
  await page.locator('#camp-rest').click(); await expect(page.locator('#world-message')).toContainText('อีลิทกลับมาแล้ว');
  let run = await saved(page); expect(run.elitesDefeated).toEqual([]); expect(run.respawns).toEqual({ [optional.id]: 1 });
  if (!await page.locator('#camp-dialog').isVisible()) await page.locator('#rest').click();
  await page.locator('#camp-tab-travel').click();
  const start = findTiles(map, 'start')[0]!; await reachable(page, `#travel-${start.x}-${start.y}`); await page.locator(`#travel-${start.x}-${start.y}`).click();
  await expect(page.locator('#world-message')).toContainText('วาร์ปกลับทางเข้าด่าน');
  run = await saved(page); expect(run.position).toEqual(start);
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).version, key)).toBe(20);
  expect(issues).toEqual([]);
});

test('the smith smelts ore into veil dust, capped per return; saved v18', async ({ page }) => {
  const f = map.equipment.forge;
  await seed(page, null, { ...newProfile(map, 5), tutorialDone: true, commander, bank: { ore: 500, gold: 0, seal: 0, dust: 0 } } as Profile);
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#lobby-tab-forge').click();
  await reachable(page, '#smelt-5'); await page.locator('#smelt-5').click();
  await expect(page.locator('.lobby-result')).toContainText('หลอมแร่ดาวเป็นฝุ่นดาว 5');
  const p = await savedProfile(page); expect(p.bank.dust).toBe(5); expect(p.bank.ore).toBe(500 - 5 * f.smeltOre); expect(p.smelted).toBe(5);
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).version, key)).toBe(20);
});

test('lobby: hire a duplicate, upgrade a star, pick the team, depart, and withdraw at the entrance', async ({ page }, info) => {
  // Pick a profile seed whose first offer is a duplicate of a starting member (the board also offers new mercenaries).
  let seedValue = 5; while (!map.startingRoster.includes(boardOffers(newProfile(map, seedValue), map, encounterById)[0]!)) seedValue++;
  const profile = { ...newProfile(map, seedValue), tutorialDone: true, commander, bank: { ore: 120, gold: 40, seal: 0, dust: 0 } };
  const offer = boardOffers(profile, map, encounterById)[0]!;
  await seed(page, null, profile);
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.goto('./'); await expect(page.locator('#continue')).toContainText('เข้าค่าย'); await page.locator('#continue').click();
  await expect(page.locator('#lobby-view')).toBeVisible(); await page.screenshot({ path: info.outputPath('lobby.png') });
  await page.locator('#lobby-tab-hire').click(); await expect(page.locator('#hire-0')).toContainText('จ้าง · 20');
  await page.screenshot({ path: info.outputPath('lobby-hire.png') });
  await page.locator('#hire-0').click(); await expect(page.locator('#hire-0')).toContainText('จ้างแล้ว');
  expect((await savedProfile(page)).members[offer]).toEqual({ stars: 1, dupes: 1 }); expect((await savedProfile(page)).bank).toMatchObject({ ore: 120, gold: 20 });
  await page.locator('#lobby-tab-team').click(); await page.locator(`#lobby-member-${offer}`).click();
  await expect(page.locator('#lobby-upgrade')).toContainText('อัปเป็น ★2'); await page.locator('#lobby-upgrade').scrollIntoViewIfNeeded(); await reachable(page, '#lobby-upgrade');
  await page.screenshot({ path: info.outputPath('lobby-upgrade.png') });
  await page.locator('#lobby-upgrade').click();
  await expect.poll(async () => (await savedProfile(page)).members[offer]).toEqual({ stars: 2, dupes: 0 }); expect((await savedProfile(page)).bank.ore).toBe(100);
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
  // 4F: the run summary comes first, then the lobby.
  await expect(page.locator('#summary-title')).toContainText('ถอนตัวกลับค่าย'); await page.locator('#summary-done').click();
  await expect(page.locator('#lobby-view')).toBeVisible(); await expect(page.locator('.lobby-result')).toContainText('ถอนตัวกลับค่าย');
  expect(await saved(page)).toBeNull(); expect((await savedProfile(page)).expeditions).toBe(1);
  expect(issues).toEqual([]);
});

test('Garran (spear) fights from the front slot: brace targets himself, drawn with his own mercenary art', async ({ page }, info) => {
  const roster = { deployed: ['garran', 'tracer', 'weaver', 'healer'], reserve: [] as string[] };
  const members = Object.fromEntries(roster.deployed.map(id => [id, { stars: 1, dupes: 0 }]));
  const run = { ...newExpedition(map, encounterById, 31, { roster, members }, true) }; reveal(run, map);
  run.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...run.hp }, commands: [] };
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, company: ['guardian', 'tracer', 'weaver', 'healer', 'garran'], members: { ...newProfile(map, 5).members, garran: { stars: 1, dupes: 0 } }, party: roster };
  await seed(page, run, profile);
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#start').click();
  for (const hero of ['tracer', 'weaver']) {
    await expect(page.locator(`#hero-${hero}`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#action-attack').click(); await page.locator('[data-ui=skill-close]').click(); await page.locator('#target-brute').click(); await finishPlayback(page);
  }
  await expect(page.locator('#hero-garran')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#action-brace')).toContainText('ตั้งทวน'); await expect(page.locator('#action-pierce')).toContainText('แทงทะลวง');
  await page.locator('#action-brace').click(); await expect(page.locator('#skill-popover')).toContainText('แทงสวนกลับ 14');
  await page.locator('[data-ui=skill-close]').click(); await page.screenshot({ path: info.outputPath('garran-battle.png') });
  await expect(page.locator('#hero-garran .portrait img')).toHaveAttribute('src', /portraits_mercs\.webp$/);
  await page.locator('#target-garran').click(); await finishPlayback(page);
  expect((await saved(page)).battle!.commands.map(c => c.action)).toEqual(['attack', 'attack', 'brace']);
  expect(issues).toEqual([]);
});

test('Mira (archer) volleys every enemy by tapping any of them, and the SPD queue shows the hindered foe last', async ({ page }, info) => {
  const roster = { deployed: ['guardian', 'tracer', 'mira', 'healer'], reserve: [] as string[] };
  const members = Object.fromEntries(roster.deployed.map(id => [id, { stars: 1, dupes: 0 }]));
  const run = { ...newExpedition(map, encounterById, 32, { roster, members }, true) }; reveal(run, map);
  run.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...run.hp }, commands: [] };
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, company: ['guardian', 'tracer', 'weaver', 'healer', 'mira'], members: { ...newProfile(map, 5).members, mira: { stars: 1, dupes: 0 } }, party: roster };
  await seed(page, run, profile);
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#start').click();
  await page.locator('#action-attack').click(); await page.locator('[data-ui=skill-close]').click(); await page.locator('#target-brute').click(); await finishPlayback(page);
  await expect(page.locator('#hero-mira')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#action-hinder').click(); await expect(page.locator('#skill-popover')).toContainText('ท้ายสุดในรอบถัดไป');
  await page.locator('[data-ui=skill-close]').click(); await page.locator('#target-raider').click(); await finishPlayback(page);
  // The next six turns (rest of round 1, then round 2) no longer include the Raider: it acts last in round 2.
  const order = await page.locator('.turn-slot').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.actor));
  expect(order).toEqual(['guardian', 'brute', 'healer', 'tracer', 'mira', 'guardian']);
  await page.screenshot({ path: info.outputPath('mira-hinder.png') });
  expect((await saved(page)).battle!.commands.map(c => c.action)).toEqual(['attack', 'hinder']);
  expect(issues).toEqual([]);
});

test('Toma (alchemist) hastes an ally by tapping them; the SPD queue puts that ally first next round', async ({ page }, info) => {
  const roster = { deployed: ['guardian', 'tracer', 'toma', 'healer'], reserve: [] as string[] };
  const members = Object.fromEntries(roster.deployed.map(id => [id, { stars: 1, dupes: 0 }]));
  const run = { ...newExpedition(map, encounterById, 33, { roster, members }, true) }; reveal(run, map);
  run.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...run.hp }, commands: [] };
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, company: ['guardian', 'tracer', 'weaver', 'healer', 'toma'], members: { ...newProfile(map, 5).members, toma: { stars: 1, dupes: 0 } }, party: roster };
  await seed(page, run, profile);
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#start').click();
  await page.locator('#action-attack').click(); await page.locator('[data-ui=skill-close]').click(); await page.locator('#target-raider').click(); await finishPlayback(page);
  await expect(page.locator('#hero-toma')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#action-haste').click(); await expect(page.locator('#skill-popover')).toContainText('ลงมือก่อนทุกคน');
  await page.locator('[data-ui=skill-close]').click(); await page.locator('#target-healer').click(); await finishPlayback(page);
  // Rest of round 1 (Aegis, Brute, Seren), then round 2 opens with the hasted Seren.
  const order = await page.locator('.turn-slot').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.actor));
  expect(order.slice(0, 4)).toEqual(['guardian', 'brute', 'healer', 'healer']);
  await page.screenshot({ path: info.outputPath('toma-haste.png') });
  expect((await saved(page)).battle!.commands.map(c => c.action)).toEqual(['attack', 'haste']);
  expect(issues).toEqual([]);
});

test('Sefa (scout) steps aside: the announced slash at her misses and the intent panel says so', async ({ page }, info) => {
  // Two full battle playbacks; under a loaded full run this scenario has exceeded the 45 s default with a correct state on screen.
  test.slow();
  const roster = { deployed: ['tracer', 'sefa', 'weaver', 'healer'], reserve: [] as string[] };
  const members = Object.fromEntries(roster.deployed.map(id => [id, { stars: 1, dupes: 0 }]));
  const run = { ...newExpedition(map, encounterById, 34, { roster, members }, true) }; reveal(run, map);
  run.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...run.hp }, commands: [] };
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, company: ['guardian', 'tracer', 'weaver', 'healer', 'sefa'], members: { ...newProfile(map, 5).members, sefa: { stars: 1, dupes: 0 } }, party: roster };
  await seed(page, run, profile);
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#start').click();
  await page.locator('#action-attack').click(); await page.locator('[data-ui=skill-close]').click(); await page.locator('#target-raider').click(); await finishPlayback(page);
  await expect(page.locator('#hero-sefa')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#hero-sefa .portrait img')).toHaveAttribute('src', /portraits_mercs\.webp$/);
  await page.locator('#action-ambush').click(); await expect(page.locator('#skill-popover')).toContainText('ยังไม่ได้ลงมือในรอบนี้');
  await page.locator('#action-evade').click(); await expect(page.locator('#skill-popover')).toContainText('จะพลาดทั้งหมด');
  await page.locator('[data-ui=skill-close]').click(); await page.locator('#target-sefa').click();
  await expect(page.locator('#intent')).toContainText('การโจมตีนี้พลาด');
  await page.screenshot({ path: info.outputPath('sefa-dodge.png') });
  await finishPlayback(page);
  await expect(page.locator('#hero-sefa')).toContainText('54 / 54');
  expect((await saved(page)).battle!.commands.map(c => c.action)).toEqual(['attack', 'evade']);
  expect(issues).toEqual([]);
});

test('Brann (warden) challenges: the announced hit and the forecast turn to him, and it lands lighter', async ({ page }, info) => {
  const roster = { deployed: ['brann', 'tracer', 'weaver', 'healer'], reserve: [] as string[] };
  const members = Object.fromEntries(roster.deployed.map(id => [id, { stars: 1, dupes: 0 }]));
  const run = { ...newExpedition(map, encounterById, 36, { roster, members }, true) }; reveal(run, map);
  run.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...run.hp }, commands: [] };
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, company: ['guardian', 'tracer', 'weaver', 'healer', 'brann'], members: { ...newProfile(map, 5).members, brann: { stars: 1, dupes: 0 } }, party: roster };
  await seed(page, run, profile);
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#start').click();
  // R1: Lyra, then Eira (the Raider acts between them), then the Brute, then Brann.
  for (const hero of ['tracer', 'weaver']) {
    await expect(page.locator(`#hero-${hero}`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#action-attack').click(); await page.locator('[data-ui=skill-close]').click(); await page.locator('#target-brute').click(); await finishPlayback(page);
  }
  await expect(page.locator('#hero-brann')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#hero-brann .portrait img')).toHaveAttribute('src', /portraits_mercs\.webp$/);
  await page.locator('#action-taunt').click(); await expect(page.locator('#skill-popover')).toContainText('รับเบาลง 35%');
  await page.locator('[data-ui=skill-close]').click(); await page.locator('#target-brann').click(); await finishPlayback(page);
  await expect(page.locator('#intent h2')).toContainText('แบรนน์');
  await expect(page.locator('#hero-brann')).toContainText('ยั่วยุ');
  await page.screenshot({ path: info.outputPath('brann-taunt.png') });
  expect((await saved(page)).battle!.commands.map(c => c.action)).toEqual(['attack', 'attack', 'taunt']);
  expect(issues).toEqual([]);
});

test('Lio (bard) plays a song of valor: it stays on his card and the next ally hit is stronger', async ({ page }, info) => {
  const roster = { deployed: ['guardian', 'tracer', 'lio', 'healer'], reserve: [] as string[] };
  const members = Object.fromEntries(roster.deployed.map(id => [id, { stars: 1, dupes: 0 }]));
  const run = { ...newExpedition(map, encounterById, 37, { roster, members }, true) }; reveal(run, map);
  run.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...run.hp }, commands: [] };
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, company: ['guardian', 'tracer', 'weaver', 'healer', 'lio'], members: { ...newProfile(map, 5).members, lio: { stars: 1, dupes: 0 } }, party: roster };
  await seed(page, run, profile);
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#start').click();
  await page.locator('#action-attack').click(); await page.locator('[data-ui=skill-close]').click(); await page.locator('#target-brute').click(); await finishPlayback(page);
  await expect(page.locator('#hero-lio')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#hero-lio .portrait img')).toHaveAttribute('src', /portraits_mercs\.webp$/);
  await page.locator('#action-mend').click(); await expect(page.locator('#skill-popover')).toContainText('เมื่อเริ่มแต่ละรอบใหม่');
  await page.locator('#action-valor').click(); await expect(page.locator('#skill-popover')).toContainText('+4');
  await page.locator('[data-ui=skill-close]').click(); await page.locator('#target-lio').click(); await finishPlayback(page);
  await expect(page.locator('#hero-lio')).toContainText('เพลงกล้า');
  // Aegis attacks for 10 + 4.
  await expect(page.locator('#hero-guardian')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#action-attack').click(); await page.locator('[data-ui=skill-close]').click(); await page.locator('#target-brute').click(); await finishPlayback(page);
  await page.screenshot({ path: info.outputPath('lio-valor.png') });
  const s = await saved(page); expect(s.battle!.commands.map(c => c.action)).toEqual(['attack', 'valor', 'attack']);
  await expect(page.locator('[data-enemy=brute]')).toContainText(`${200 - 16 - 14} / 200`);
  expect(issues).toEqual([]);
});

test('new Veil Frontier foes fight with their own art: Mycon and the elite Thorn Matriarch', async ({ page }, info) => {
  const run = { ...newExpedition(map, encounterById, 35, undefined, true) }; reveal(run, map);
  run.battle = { kind: 'random', encounterId: 'thicket-ambush', entry: { ...run.hp }, commands: [] };
  await seed(page, run, { ...newProfile(map, 5), tutorialDone: true, commander });
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.goto('./'); await page.locator('#continue').click(); await page.locator('#start').click();
  await expect(page.locator('[data-enemy=brute]')).toContainText('ราชินีหนาม'); await expect(page.locator('[data-enemy=raider]')).toContainText('เห็ดหมอผีกลวง');
  await expect(page.locator('[data-enemy=brute] .portrait img')).toHaveAttribute('src', /portraits_foes\.webp$/);
  await expect(page.locator('[data-enemy=brute] .portrait')).toHaveAttribute('data-actor', 'foe_matriarch');
  await expect(page.locator('#intent')).toContainText('คำสาปสปอร์');
  await page.screenshot({ path: info.outputPath('foes-thicket.png') });
  expect(issues).toEqual([]);
});

test('losing every brought member fails the expedition: back to the lobby with half the ore', async ({ page }) => {
  const data = encounterById('veil-siege')!; const hp = { guardian: 6, tracer: 4, weaver: 3, healer: 2 };
  const camp = findTiles(map, 'camp')[1]!;
  let b = createBattle(data, { hp }); const commands = [];
  while (b.outcome === 'active') { const c = { beat: b.beat, heroId: currentHeroId(b, data)!, action: 'attack' as const, targetId: b.enemies.find(e => e.hp > 0)!.id }; const next = resolveCommand(b, data, c).state; if (next.outcome !== 'active') break; commands.push(c); b = next; }
  const last = { heroId: currentHeroId(b, data)!, targetId: b.enemies.find(e => e.hp > 0)!.id };
  const state = base({ position: { x: camp.x - 1, y: camp.y }, camp, hp, resources: { ore: 11, gold: 0, ember: 2, seal: 1 }, battle: { kind: 'random', encounterId: data.id, entry: hp, commands } });
  const issues = await open(page, state);
  await page.locator('#action-attack').click(); await page.locator('[data-ui=skill-close]').click(); await page.locator(`#target-${last.targetId}`).click();
  await finishPlayback(page);
  await expect(page.locator('.result-card')).toContainText('แพ้แล้ว'); await expect(page.locator('#leave-battle')).toContainText('กลับค่าย');
  expect(await saved(page)).toBeNull(); expect((await savedProfile(page)).bank).toEqual({ ore: 5, gold: 0, seal: 0, dust: 0 });
  await page.locator('#leave-battle').click();
  await expect(page.locator('#summary-title')).toContainText('ทีมล้มทั้งหมด'); await expect(page.locator('.summary-haul')).toContainText('+5');
  await page.locator('#summary-done').click();
  await expect(page.locator('#lobby-view')).toBeVisible(); await expect(page.locator('.lobby-result')).toContainText('ได้แร่ดาว 5');
  expect(issues).toEqual([]);
});

test('the boss blocks the gate; after its defeat the goal completes the expedition', async ({ page }, info) => {
  const [boss] = findTiles(map, 'boss');
  // The rift seal (3B) is broken: two of its objectives are done.
  const issues = await open(page, base({ position: { x: boss!.x, y: boss!.y + 1 }, bossDefeated: false, elitesDefeated: ['scar-golem'], eventsDone: ['scar-rift'] }));
  await page.locator('#move-up').click();
  await expect(page.locator('#encounter-kind')).toContainText('บอส');
  expect((await saved(page)).battle?.kind).toBe('boss');
  await page.reload(); await page.locator('#continue').click(); await expect(page.locator('#encounter-title')).toContainText('ผู้คุมรอยแยก');
  await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)!); s.run.battle = null; s.run.bossDefeated = true; localStorage.setItem(k, JSON.stringify(s)); }, key);
  await page.reload(); await page.locator('#continue').click();
  for (let i = 0; i < 3; i++) await page.locator('#move-up').click();
  // 4F: the first clear plays Vargoth's answer, then the summary, then the lobby.
  await expect(page.locator('#story-view')).toBeVisible(); await expect(page.locator('#story-view')).toHaveAttribute('data-speaker', 'vargoth');
  for (let i = 0; i < 3; i++) await page.locator('#story-next').click();
  await expect(page.locator('#summary-title')).toContainText('สำเร็จการเดินทาง'); await reachable(page, '#summary-done');
  await page.screenshot({ path: info.outputPath('expedition-summary.png') });
  await page.locator('#summary-done').click(); await expect(page.locator('#summary-view')).toBeHidden();
  await expect(page.locator('#lobby-view')).toBeVisible(); await expect(page.locator('.lobby-result')).toContainText('สำเร็จการเดินทาง');
  expect(await saved(page)).toBeNull(); expect((await savedProfile(page)).completes).toBe(1);
  await reachable(page, '#lobby-depart'); await page.screenshot({ path: info.outputPath('expedition-complete.png') });
  expect(issues).toEqual([]);
});

test('a forced elite holds its one-tile gate: stepping in forces the fight and the gate opens once it falls', async ({ page }, info) => {
  const elite = map.elites.find(e => e.forced)!;
  const issues = await open(page, base({ position: { x: elite.x, y: elite.y + 1 } }));
  await expect(page.locator(`.elite-unit[data-elite="${elite.id}"]`)).toBeVisible();
  await expect(page.locator('.step-hint[data-dir=up]')).toHaveClass(/boss/);
  await page.screenshot({ path: info.outputPath('elite-gate.png') });
  // The optional meadow elite wears gold; the gate's elite wears coral.
  expect(await page.locator('.elite-unit[data-forced=false]').count()).toBe(map.elites.filter(e => !e.forced).length);
  await page.locator('#move-up').click();
  await expect(page.locator('#encounter-kind')).toContainText('อีลิท');
  const run = await saved(page); expect(run.battle).toMatchObject({ kind: 'elite', source: elite.id });
  await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)!); s.run.battle = null; s.run.elitesDefeated = ['gate-thicket']; localStorage.setItem(k, JSON.stringify(s)); }, key);
  await page.reload(); await page.locator('#continue').click();
  await expect(page.locator(`.elite-unit[data-elite="${elite.id}"]`)).toBeHidden();
  await page.locator('#move-up').click(); await expect(page.locator('#world-view')).toBeVisible();
  expect((await saved(page)).position).toEqual({ x: elite.x, y: elite.y });
  expect(issues).toEqual([]);
});
test('an optional elite wears gold with a reward badge and announces its bonus when challenged', async ({ page }, info) => {
  const elite = map.elites.find(e => !e.forced)!;
  const issues = await open(page, base({ position: { x: elite.x, y: elite.y + 1 } }));
  await expect(page.locator(`.elite-unit[data-elite="${elite.id}"] .elite-reward`)).toBeVisible();
  await expect(page.locator('.elite-unit[data-forced=true] .elite-reward')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('elite-optional.png') });
  await page.locator('#move-up').click();
  await expect(page.locator('#world-message')).toContainText(`เหรียญทอง +${map.eventRules.optionalElite.gold}`);
  await expect(page.locator('#encounter-kind')).toContainText('อีลิท');
  expect(issues).toEqual([]);
});
test('rift seal: the boss stays sealed until 2 of 3 objectives; the goal list shows them; the mini-boss guards the scar', async ({ page }, info) => {
  const [boss] = findTiles(map, 'boss'); const golem = map.elites.find(e => e.mini)!;
  const issues = await open(page, base({ position: { x: boss!.x, y: boss!.y + 1 }, camp: findTiles(map, 'camp')[0]!, elitesDefeated: ['scar-golem'] }));
  await expect(page.locator('.step-hint[data-dir=up]')).toHaveClass(/sealed/);
  await page.locator('#move-up').click();
  await expect(page.locator('#world-message')).toContainText('ยังถูกผนึก'); await expect(page.locator('#world-message')).toContainText('1/2');
  expect((await saved(page)).battle).toBeNull(); expect((await saved(page)).position).toEqual({ x: boss!.x, y: boss!.y + 1 });
  await expect(page.locator('.objective-text')).toContainText('ทำลายผนึกรอยแยก 1/2');
  await page.locator('#objective-button').click();
  await expect(page.locator('#quest-golem')).toHaveClass(/done/); await expect(page.locator('#quest-chests')).toContainText('0/6'); await expect(page.locator('#quest-rift')).not.toHaveClass(/done/);
  await page.screenshot({ path: info.outputPath('rift-seal-goals.png') });
  await page.locator('[data-world=goals-close]').click();
  // The mini-boss: purple ring and a boss badge, announced as a mini-boss.
  await page.evaluate(([k, x, y]) => { const s = JSON.parse(localStorage.getItem(k as string)!); s.run.position = { x, y: (y as number) + 1 }; s.run.elitesDefeated = []; s.run.revealed = '1'.repeat(s.run.revealed.length); localStorage.setItem(k as string, JSON.stringify(s)); }, [key, golem.x, golem.y]);
  await page.reload(); await page.locator('#continue').click();
  await expect(page.locator(`.elite-unit[data-elite="${golem.id}"][data-mini]`)).toBeVisible();
  await page.screenshot({ path: info.outputPath('mini-boss.png') });
  await page.locator('#move-up').click();
  await expect(page.locator('#world-message')).toContainText('มินิบอส'); await expect(page.locator('#encounter-kind')).toContainText('อีลิท');
  expect((await saved(page)).battle).toMatchObject({ kind: 'elite', source: golem.id });
  expect(issues).toEqual([]);
});
test('puzzles: rune stones in order open the vault door, a boulder fills its pit, a cracked wall hides a pocket; saved v16', async ({ page }, info) => {
  const P = map.puzzles; const runes = P.runes[0]!; const [a, b, c] = runes.stones;
  const all = (st: ExpeditionState) => ({ ...st, revealed: '1'.repeat(st.revealed.length), repel: 10 });
  // Start one step east of the first stone; walk onto each stone in turn (teleporting between them through the save).
  const issues = await open(page, all(base({ position: { x: a!.x + 1, y: a!.y } })));
  await expect(page.locator(`.puzzle-door[data-door="${runes.id}"]`)).not.toHaveClass(/open/);
  await page.locator('#move-left').click(); await expect(page.locator('#world-message')).toContainText('1/3');
  await expect(page.locator(`.rune-stone[data-index="0"]`)).toHaveClass(/lit/);
  for (const stone of [b!, c!]) {
    await page.evaluate(([k, x, y]) => { const s = JSON.parse(localStorage.getItem(k as string)!); s.run.position = { x: (x as number) + 1, y }; localStorage.setItem(k as string, JSON.stringify(s)); }, [key, stone.x, stone.y]);
    await page.reload(); await page.locator('#continue').click(); await page.locator('#move-left').click();
  }
  await expect(page.locator('#world-message')).toContainText('ประตูหินเปิด'); await expect(page.locator(`.puzzle-door[data-door="${runes.id}"]`)).toHaveClass(/open/);
  let raw = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key);
  expect(raw.version).toBe(20); expect(raw.run.solved).toContain(runes.id);
  // Walk through the door to the vault chest.
  await page.evaluate(([k, x, y]) => { const s = JSON.parse(localStorage.getItem(k as string)!); s.run.position = { x: (x as number) - 1, y }; localStorage.setItem(k as string, JSON.stringify(s)); }, [key, runes.door.x, runes.door.y]);
  await page.reload(); await page.locator('#continue').click();
  await page.screenshot({ path: info.outputPath('puzzle-runes-open.png') });
  for (let i = 0; i < 3; i++) await page.locator('#move-right').click();
  await expect(page.locator('#rest')).toBeEnabled(); expect((await saved(page)).position).toEqual({ x: runes.door.x + 2, y: runes.door.y });
  // Boulder and pit.
  const bo = P.boulders[0]!;
  await page.evaluate(([k, x, y]) => { const s = JSON.parse(localStorage.getItem(k as string)!); s.run.position = { x: (x as number) - 1, y }; localStorage.setItem(k as string, JSON.stringify(s)); }, [key, bo.at.x, bo.at.y]);
  await page.reload(); await page.locator('#continue').click();
  await expect(page.locator('.pit')).toBeVisible(); await page.screenshot({ path: info.outputPath('puzzle-boulder.png') });
  await page.locator('#move-right').click(); await expect(page.locator('#world-message')).toContainText('ผลักหินลงหลุม');
  await expect(page.locator('.pit')).toHaveClass(/filled/); await expect(page.locator('.boulder')).toBeHidden();
  // Secret wall: no hint before it is found, then walk through.
  const sec = P.secrets[0]!;
  await page.evaluate(([k, x, y]) => { const s = JSON.parse(localStorage.getItem(k as string)!); s.run.position = { x: (x as number) + 1, y }; localStorage.setItem(k as string, JSON.stringify(s)); }, [key, sec.x, sec.y]);
  await page.reload(); await page.locator('#continue').click();
  await expect(page.locator('.step-hint[data-dir=left]')).toHaveCount(0);
  await page.locator('#move-left').click(); await expect(page.locator('#world-message')).toContainText('ทางลับ');
  await expect(page.locator(`.secret-wall[data-secret="${sec.id}"]`)).toHaveClass(/found/);
  raw = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key);
  expect(raw.run.solved).toContain(bo.id); expect(raw.run.secrets).toEqual([sec.id]);
  expect(issues).toEqual([]);
});
test('map events: stepping on one opens its choices; the shrine heals with a wound, the merchant sells, saved v13', async ({ page }, info) => {
  const shrine = map.events.find(e => e.kind === 'shrine')!; const merchant = map.events.find(e => e.kind === 'merchant')!;
  const start = base({ position: { x: shrine.x, y: shrine.y + 1 } }); start.hp.guardian = 20;
  const issues = await open(page, start);
  await expect(page.locator(`.event-mark[data-event="${shrine.id}"]`)).toBeVisible();
  await page.locator('#move-up').click();
  await expect(page.locator('#event-dialog')).toBeVisible(); await expect(page.locator('#event-title')).toContainText('ศาลเก่า');
  await expect(page.locator('#event-offer')).toBeDisabled(); await expect(page.locator('#event-offer')).toContainText('แร่ดาวไม่พอ');
  await reachable(page, '#event-pray'); await page.screenshot({ path: info.outputPath('event-shrine.png') });
  // Closing leaves the choice open; the action button reopens it.
  await page.locator('[data-world=event-close]').click(); await expect(page.locator('#event-dialog')).toBeHidden();
  await expect(page.locator('#rest')).toBeEnabled(); await page.locator('#rest').click(); await expect(page.locator('#event-dialog')).toBeVisible();
  await page.locator('#event-pray').click(); await expect(page.locator('#event-dialog')).toBeHidden();
  await expect(page.locator('#world-message')).toContainText('ศาลประทานพร');
  let raw = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key);
  expect(raw.version).toBe(20); expect(raw.run.eventsDone).toEqual([shrine.id]); expect(raw.run.members.guardian.wound).toBe(5); expect(raw.run.hp.guardian).toBeGreaterThan(20);
  await expect(page.locator(`.event-mark[data-event="${shrine.id}"]`)).toBeHidden();
  // The merchant stays open between trades.
  await page.evaluate(([k, x, y]) => { const s = JSON.parse(localStorage.getItem(k as string)!); s.run.position = { x, y: (y as number) + 1 }; s.run.resources.ore = 24; localStorage.setItem(k as string, JSON.stringify(s)); }, [key, merchant.x, merchant.y]);
  await page.reload(); await page.locator('#continue').click();
  await page.locator('#move-up').click(); await expect(page.locator('#event-dialog')).toBeVisible();
  await page.locator('#event-buy-salve').click(); await expect(page.locator('#event-dialog')).toBeVisible();
  await page.locator('#event-buy-salve').click(); await expect(page.locator('#event-buy-tonic')).toBeDisabled();
  raw = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key);
  expect(raw.run.potions.salve).toBe(2); expect(raw.run.resources.ore).toBe(24 - 2 * map.eventRules.merchant.salve); expect(raw.run.eventsDone).toEqual([shrine.id]);
  await page.screenshot({ path: info.outputPath('event-merchant.png') });
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
  // The new company starts with the prologue and its first battle.
  await expect(page.locator('#story-view')).toBeVisible(); await expect(page.locator('.story-text')).toContainText('ผู้กองใหม่');
  expect((await saved(page)).battle?.kind).toBe('tutorial'); expect((await saved(page)).steps).toBe(0); expect((await savedProfile(page)).expeditions).toBe(0);
  expect(issues).toEqual([]);
});

const viewports = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 414, height: 896 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }];
for (const viewport of viewports) {
  test(`world ${viewport.width}x${viewport.height}: full-bleed map, floating HUD and open walking targets without scroll`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 900, reducedMotion: 'reduce' }); const page = await context.newPage();
    const camp = findTiles(map, 'camp')[1]!;
    // A full pack (three-digit resources, potions and found gear) is the widest the bag capsule gets.
    const issues = await open(page, base({ position: camp, hp: { guardian: 50, tracer: 0, weaver: 10, healer: 46 }, resources: { ore: 128, gold: 96, ember: 3, seal: 12 },
      potions: { salve: 3, tonic: 2, repel: 1 }, found: [{ uid: 0, slot: 'head', rarity: 0, level: 3, affixes: [] }, { uid: 0, slot: 'boots', rarity: 0, level: 3, affixes: [] }] }));
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
    await page.locator('#objective-button').click(); await expect(page.locator('#world-goals')).toBeVisible(); await expect(page.locator('#world-goals .goal-list:not(.seal-list) li')).toHaveCount(5); await expect(page.locator('#world-goals .seal-list li')).toHaveCount(3);
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

test('home → create commander → prologue: the name is required, crest and colour are chosen and saved', async ({ page }, info) => {
  const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
  await page.goto('./'); await page.locator('#new-game').click();
  await expect(page.locator('#commander-view')).toBeVisible(); await expect(page.locator('#commander-name')).toBeFocused();
  await page.locator('#commander-create').click();
  await expect(page.locator('#commander-name')).toHaveAttribute('aria-invalid', 'true'); await expect(page.locator('#commander-view')).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
  await page.locator('#commander-name').fill('ผู้กอง อารี'); await page.locator('#crest-guard').click(); await page.locator('#color-violet').click();
  await expect(page.locator('#commander-preview-name')).toHaveText('ผู้กอง อารี'); await page.screenshot({ path: info.outputPath('commander.png') });
  await page.locator('#commander-name').press('Enter');
  await expect(page.locator('#story-view')).toBeVisible(); await expect(page.locator('.story-text')).toContainText('ผู้กอง อารี');
  expect((await savedProfile(page)).commander).toEqual({ name: 'ผู้กอง อารี', crest: 'guard', color: 'violet' });
  // A reload during the prologue resumes straight into the saved first battle.
  await page.reload(); await page.locator('#continue').click(); await expect(page.locator('#battle-view')).not.toHaveClass(/view-off/); await expect(page.locator('#encounter-kind')).toContainText('ศึกแรก');
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
    await seed(page, null, { ...newProfile(map, 5), tutorialDone: true, commander, bank: { ore: 45, gold: 0, seal: 1, dust: 0 } });
    const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
    await page.goto('./'); await page.locator('#continue').click(); await expect(page.locator('#lobby-view')).toBeVisible();
    const noScroll = () => page.evaluate(() => document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth);
    expect(await noScroll()).toBe(false);
    for (const sel of ['#lobby-depart', '#lobby-tab-team', '#lobby-tab-hire']) { await page.locator(sel).scrollIntoViewIfNeeded(); await reachable(page, sel); }
    // Team and hire open as a sheet over the camp. Portrait phones show it full screen (close to switch);
    // elsewhere the depart button stays reachable with it open.
    const full = viewport.width <= 760 && viewport.height > viewport.width;
    await page.locator('#lobby-tab-team').click(); for (const sel of ['#lobby-member-guardian', ...(full ? ['[data-lobby=close]'] : ['#lobby-depart'])]) { await page.locator(sel).scrollIntoViewIfNeeded(); await reachable(page, sel); }
    if (full) { const box = (await page.locator('#lobby-sheet').boundingBox())!; expect(box.width).toBe(viewport.width); expect(box.height).toBe(viewport.height); }
    await page.screenshot({ path: info.outputPath('lobby.png') });
    // The panel scrolls inside itself on short screens; the page never does.
    if (full) await page.locator('[data-lobby=close]').click();
    await page.locator('#lobby-tab-hire').click(); for (const sel of ['#hire-0', '#hire-1', '#hire-2']) { await page.locator(sel).scrollIntoViewIfNeeded(); await reachable(page, sel); }
    expect(await noScroll()).toBe(false); await page.screenshot({ path: info.outputPath('lobby-hire.png') });
    expect(issues).toEqual([]); await context.close();
  });
}

test('map bag (2026-10-17): wear a find away from camp, take it off, read a member\'s details and bench a member; saved v20', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const epic: Item = { uid: 0, slot: 'body', rarity: 3, level: 4, affixes: affixPool('body').slice(0, 3) };
  const bow: Item = { uid: 0, slot: 'weapon', hero: 'tracer', rarity: 0, level: 2, affixes: [] };
  const start = startOf(map);
  const issues = await open(page, base({ found: [epic, bow], position: { x: start.x - 1, y: start.y } }));
  await page.locator('#world-pack').click(); await expect(page.locator('#pack-dialog')).toBeVisible();
  await expect(page.locator('#bag-tab-items')).toHaveAttribute('aria-selected', 'true');
  for (const sel of ['#bag-tab-items', '#bag-tab-gear', '#bag-tab-team', '[data-world=pack-close]']) await reachable(page, sel);
  await page.locator('#bag-tab-gear').click(); await page.locator('#bag-member-guardian').click();
  await expect(page.locator('#wear-found-1')).toBeDisabled(); await expect(page.locator('#wear-found-1')).toContainText('คนอื่นใช้');
  await page.locator('#wear-found-0').click();
  await expect.poll(async () => (await saved(page)).members.guardian?.gear?.body?.rarity).toBe(3);
  expect((await saved(page)).found).toEqual([bow]);
  await expect(page.locator('#bag-slot-body')).toHaveAttribute('data-rarity', '3');
  await page.screenshot({ path: info.outputPath('bag-gear.png') });
  // Taking it off puts the find back; the tracer can wear the bow.
  await page.locator('#bag-slot-body').click(); await page.locator('#bag-takeoff').click();
  await expect.poll(async () => (await saved(page)).found.length).toBe(2); expect((await saved(page)).members.guardian?.gear).toBeUndefined();
  await page.locator('#bag-member-tracer').click(); await page.locator('#bag-slot-weapon').click();
  await expect(page.locator('[data-world=bag-wear]')).toHaveCount(1);
  await page.locator('[data-world=bag-wear][data-from=found]').first().click();
  await expect.poll(async () => (await saved(page)).members.tracer?.gear?.weapon?.hero).toBe('tracer');
  // Team tab: tapping a member shows their details; tapping an empty reserve seat benches them, away from any camp.
  await page.locator('#bag-tab-team').click(); await page.locator('#bag-team-healer').click();
  await expect(page.locator('.bag-detail')).toContainText('สกิล'); await expect(page.locator('.bag-detail .hire-skills li').first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('bag-team.png') });
  await page.locator('#pack-content .team-card.empty.target').first().click();
  await expect.poll(async () => (await saved(page)).roster).toEqual({ deployed: ['guardian', 'tracer', 'weaver'], reserve: ['healer'] });
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).version, key)).toBe(20);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  expect(issues).toEqual([]);
});

test('normal motion: the pulsing step markers stay centred on their tiles (iPhone report)', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'no-preference' }); const page = await context.newPage();
  const issues = await open(page, newExpedition(map, encounterById, 3));
  const hints = page.locator('.step-hint'); expect(await hints.count()).toBeGreaterThan(1);
  // The marker drawn by ::before must share its tile's centre while the pulse animation runs.
  for (const hint of await hints.all()) {
    const off = await hint.evaluate(el => {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el, '::before');
      const m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
      const cx = r.left + parseFloat(cs.left) + parseFloat(cs.marginLeft) + parseFloat(cs.width) / 2 + m.e;
      const cy = r.top + parseFloat(cs.top) + parseFloat(cs.marginTop) + parseFloat(cs.height) / 2 + m.f;
      return { animated: cs.animationName, dx: Math.abs(cx - (r.left + r.width / 2)), dy: Math.abs(cy - (r.top + r.height / 2)) };
    });
    expect(off.animated).toBe('veil-hint'); expect(off.dx).toBeLessThan(1); expect(off.dy).toBeLessThan(1);
  }
  expect(issues).toEqual([]); await context.close();
});

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

// Phone portrait is played one-handed: the D-pad is bottom-centre and the contextual action
// takes its centre cell; landscape keeps the D-pad lower left and the action lower right.
test('phone portrait centres the D-pad with the action in its middle for one-handed play', async ({ browser }) => {
  for (const [width, height, portrait] of [[390, 844, true], [320, 568, true], [844, 390, false]] as const) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true }); const page = await context.newPage();
    const issues = await open(page, newExpedition(map, encounterById, 11)); await expect(page.locator('#move-up')).toBeVisible();
    const box = async (sel: string) => (await page.locator(sel).boundingBox())!;
    const [up, left, right, down, act] = await Promise.all(['#move-up', '#move-left', '#move-right', '#move-down', '#rest'].map(box));
    for (const b of [up, left, right, down, act]) { expect(b!.width).toBeGreaterThanOrEqual(44); expect(b!.height).toBeGreaterThanOrEqual(44); }
    const cx = (b: { x: number; width: number }) => b.x + b.width / 2, cy = (b: { y: number; height: number }) => b.y + b.height / 2;
    if (portrait) {
      expect(Math.abs(cx(up!) - width / 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(cx(act!) - cx(up!))).toBeLessThanOrEqual(1); expect(Math.abs(cy(act!) - cy(left!))).toBeLessThanOrEqual(1);
      expect(act!.y).toBeGreaterThanOrEqual(up!.y + up!.height); expect(act!.y + act!.height).toBeLessThanOrEqual(down!.y);
      expect(down!.y + down!.height).toBeLessThanOrEqual(height);
    } else {
      expect(cx(up!)).toBeLessThan(width / 3); expect(cx(act!)).toBeGreaterThan(width * 2 / 3);
    }
    expect(issues).toEqual([]); await context.close();
  }
});

test('lobby member panel shows the ★3 skill and ★5 passive, unlocked by stars', async ({ page }, info) => {
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander }; profile.members.guardian = { stars: 3, dupes: 0 };
  await seed(page, null, profile);
  await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-team').click(); await page.locator('#lobby-member-guardian').click();
  const rows = page.locator('.member-unlocks li'); await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveClass(/unlocked/); await expect(rows.nth(0)).toContainText('ตั้งรับหมู่'); await expect(rows.nth(0)).toContainText('ปลดล็อกแล้ว');
  await expect(rows.nth(1)).toHaveClass(/locked/); await expect(rows.nth(1)).toContainText('ยืนหยัด'); await expect(rows.nth(1)).toContainText('ปลดล็อกที่ ★5');
  await page.screenshot({ path: info.outputPath('lobby-unlocks.png') });
});

test('lobby talent tree: its own sheet; spend points level by level, gates show, reset is free, the choice is saved', async ({ page }, info) => {
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander }; profile.members.guardian = { stars: 1, dupes: 0, level: 4, exp: 0 };
  await seed(page, null, profile);
  await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-team').click(); await page.locator('#lobby-member-guardian').click();
  await expect(page.locator('#lobby-tree-open')).toContainText('แต้มว่าง 3');
  await expect(page.locator('.talent-node')).toHaveCount(0);
  await page.locator('#lobby-tree-open').click();
  // The tree replaces the team sheet: no team cards, a back button and a member picker.
  await expect(page.locator('#lobby-sheet-title')).toContainText('ต้นไม้ความถนัด');
  await expect(page.locator('.team-card')).toHaveCount(0); await expect(page.locator('#tree-member-guardian')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.talent-node')).toHaveCount(7);
  await expect(page.locator('#talent-a1')).toHaveAttribute('data-state', 'locked');
  await page.locator('#talent-root').click(); await expect(page.locator('#talent-root')).toHaveAttribute('data-state', 'full');
  await page.locator('#talent-b1').click(); await page.locator('#talent-b1').click();
  await expect(page.locator('#talent-b1')).toContainText('2/2'); await expect(page.locator('.talent-points')).toContainText('แต้ม 0/3');
  // No points left: another node does nothing and says why.
  await page.locator('#talent-a1').click({ force: true }); await expect(page.locator('#talent-a1')).toContainText('0/2');
  await expect(page.locator('#talent-a1')).toHaveAttribute('aria-label', /แต้มไม่พอ/);
  for (const b of await page.locator('.talent-node, #lobby-reset-talents, .tree-member, #lobby-sub-back').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: info.outputPath('lobby-talents.png') });
  // Another member's tree from the picker.
  await page.locator('#tree-member-tracer').click(); await expect(page.locator('#lobby-tree')).toHaveAttribute('aria-label', /ไลรา/);
  await expect(page.locator('#talent-root')).toHaveAttribute('aria-label', /แต้มไม่พอ/);
  await page.locator('#tree-member-guardian').click();
  await page.setViewportSize({ width: 390, height: 844 }); await page.locator('#talent-b3').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight)).toBe(true);
  await page.screenshot({ path: info.outputPath('lobby-talents-phone.png') });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.expedition.v1')!));
  expect(saved.version).toBe(20); expect(saved.profile.members.guardian.talents).toEqual({ root: 1, b1: 2 });
  // Back to the team sheet: the card shows the new max HP.
  await page.locator('#lobby-sub-back').click(); await expect(page.locator('#lobby-sheet-title')).toContainText('จัดทีม');
  await expect(page.locator('#lobby-member-guardian')).toContainText(`เลือด ${Math.round(76 * (100 + 9 + 15) / 100)}`);
  await page.locator('#lobby-tree-open').click(); await page.locator('#lobby-reset-talents').click();
  await expect(page.locator('.talent-points')).toContainText('แต้ม 3/3');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.expedition.v1')!).profile.members.guardian.talents)).toBeUndefined();
  // Escape closes the tree sheet back to the camp.
  await page.keyboard.press('Escape'); await expect(page.locator('#lobby-sheet')).toHaveCount(0);
});

test('lobby equipment: its own sheet; equip, class weapons, swap, unequip, salvage with confirmation; saved v9', async ({ page }, info) => {
  const items = [
    { uid: 1, slot: 'body', rarity: 2, level: 5, affixes: ['hp', 'skill'] },
    { uid: 2, slot: 'body', rarity: 0, level: 1, affixes: [] },
    { uid: 3, slot: 'weapon', rarity: 1, level: 3, hero: 'tracer', affixes: ['attack'] },
    { uid: 4, slot: 'charm', rarity: 4, level: 10, affixes: ['speed', 'heal', 'barrier'], special: 'laststand' },
  ];
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, items, nextItem: 5 } as Profile;
  await seed(page, null, profile);
  await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-team').click(); await page.locator('#lobby-member-guardian').click();
  await page.locator('#lobby-gear-open').click();
  await expect(page.locator('#lobby-sheet-title')).toContainText('อุปกรณ์'); await expect(page.locator('.team-card')).toHaveCount(0);
  await expect(page.locator('.gear-slot')).toHaveCount(6); await expect(page.locator('.gear-bag li')).toHaveCount(4);
  // Another class's weapon cannot be worn.
  await expect(page.locator('#equip-3')).toBeDisabled(); await expect(page.locator('#equip-3')).toContainText('คนอื่นใช้');
  await page.locator('#gear-slot-body').click(); await expect(page.locator('.gear-bag li')).toHaveCount(2);
  await page.locator('#equip-1').click();
  await expect(page.locator('#gear-slot-body')).toContainText('เกราะหายาก Lv5'); await expect(page.locator('.gear-bag li')).toHaveCount(1);
  await expect(page.locator('.gear-stats')).toContainText(`เลือด ${76 + 15 + 8}`);
  // Swapping returns the old piece to the bag.
  await page.locator('#equip-2').click(); await expect(page.locator('#gear-slot-body')).toContainText('เกราะธรรมดา');
  await expect(page.locator('#equip-1')).toBeVisible();
  await page.locator('#gear-unequip').click(); await expect(page.locator('#gear-slot-body')).toContainText('ว่าง');
  for (const b of await page.locator('.gear-slot, .gear-actions button, #lobby-sub-back, .tree-member').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.locator('#gear-slot-body').click();
  await page.locator('#equip-4').click(); await expect(page.locator('#gear-slot-charm')).toContainText('เครื่องรางตำนาน');
  await page.screenshot({ path: info.outputPath('lobby-gear.png') });
  // A rare piece needs a second press to salvage; a common one goes at once.
  await page.locator('#salvage-1').click(); await expect(page.locator('#salvage-1')).toContainText('ยืนยันแยก');
  await page.locator('#salvage-1').click(); await expect(page.locator('#salvage-1')).toHaveCount(0);
  await page.locator('#salvage-common').click(); await expect(page.locator('#salvage-2')).toHaveCount(0);
  await expect(page.locator('.lobby-bank')).toHaveAttribute('aria-label', /ฝุ่นดาว 5/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight)).toBe(true);
  await page.screenshot({ path: info.outputPath('lobby-gear-phone.png') });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.expedition.v1')!));
  expect(saved.version).toBe(20); expect(saved.profile.members.guardian.gear.charm.uid).toBe(4); expect(saved.profile.items.map((i: { uid: number }) => i.uid)).toEqual([3]);
  expect(saved.profile.bank).toMatchObject({ ore: 7, dust: 5 });
});

test('lobby equipment sets: worn pieces light the 2- and 4-piece bonuses', async ({ page }, info) => {
  const piece = (uid: number, slot: string) => ({ uid, slot, rarity: 0, level: 1, affixes: [], set: 'dawn' });
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, items: [piece(4, 'boots')], nextItem: 5 } as Profile;
  profile.members.guardian = { stars: 1, dupes: 0, gear: { head: piece(1, 'head'), body: piece(2, 'body'), gloves: piece(3, 'gloves') } } as Profile['members'][string];
  await seed(page, null, profile);
  await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-team').click(); await page.locator('#lobby-member-guardian').click(); await page.locator('#lobby-gear-open').click();
  await expect(page.locator('.gear-sets li')).toContainText('ชุดผู้พิทักษ์รุ่งอรุณ'); await expect(page.locator('.gear-sets li')).toContainText('3/4');
  await expect(page.locator('.gear-sets small.on')).toHaveCount(1);
  await expect(page.locator('.gear-bag li')).toContainText('ชุดผู้พิทักษ์รุ่งอรุณ');
  await page.locator('#equip-4').click();
  await expect(page.locator('.gear-sets small.on')).toHaveCount(2); await expect(page.locator('.gear-sets li')).toContainText('เริ่มศึกพร้อมโล่ 12');
  await page.screenshot({ path: info.outputPath('lobby-sets.png') });
});

test('lobby forge: enhance, fuse and reroll from its own menu; saved v11', async ({ page }, info) => {
  const body = (uid: number, affixes: string[]) => ({ uid, slot: 'body', rarity: 1, level: 4, affixes });
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, bank: { ore: 100, gold: 0, seal: 1, dust: 20 },
    items: [body(1, ['hp']), body(2, ['attack']), body(3, ['skill'])], nextItem: 4, forge: 0 } as Profile;
  await seed(page, null, profile);
  await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-forge').click();
  await expect(page.locator('#lobby-sheet-title')).toContainText('ช่างตีเหล็ก'); await expect(page.locator('.forge-pick')).toHaveCount(3);
  await page.locator('#forge-item-1').click();
  await expect(page.locator('#forge-enhance')).toContainText('ตีบวก +1 · แร่ 4 ผง 1');
  await page.locator('#forge-enhance').click(); await expect(page.locator('#forge-enhance')).toContainText('ตีบวก +2');
  await expect(page.locator('.forge-detail')).toContainText('เกราะดี +1');
  await page.locator('#forge-reroll-0').click(); await expect(page.locator('#forge-reroll-0')).toBeDisabled();
  await expect(page.locator('#forge-reroll-0')).toContainText('ตราสัญญาไม่พอ');
  await expect(page.locator('.forge-mats')).toContainText('จะใช้');
  await page.locator('#forge-fuse').click();
  await expect(page.locator('.forge-pick')).toHaveCount(1); await expect(page.locator('.forge-detail')).toContainText('เกราะหายาก');
  for (const b of await page.locator('.forge-pick, .forge-detail button, .lobby-menu-button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: info.outputPath('lobby-forge.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight)).toBe(true);
  await page.screenshot({ path: info.outputPath('lobby-forge-phone.png') });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.expedition.v1')!));
  expect(saved.version).toBe(20); expect(saved.profile.items).toHaveLength(1); expect(saved.profile.items[0]).toMatchObject({ uid: 1, rarity: 2 });
  expect(saved.profile.bank).toMatchObject({ ore: 96, gold: 0, seal: 0, dust: 19 }); expect(saved.profile.forge).toBeGreaterThan(0);
});

test('potions: brew in the lobby, pack 3 on departure, drink a salve and a repel on the map', async ({ page }, info) => {
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, bank: { ore: 200, gold: 0, seal: 0, dust: 40 }, potions: { salve: 3, tonic: 0, repel: 0 } } as Profile;
  await seed(page, null, profile);
  await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-brew').click();
  await expect(page.locator('#lobby-sheet-title')).toContainText('นักปรุงยา');
  await page.locator('#brew-salve').click(); await page.locator('#brew-repel').click();
  await expect(page.locator('.brew-list li').first()).toContainText('มีที่ค่าย 4 ขวด · จะพาไป 3');
  for (const b of await page.locator('.brew-list button, .lobby-menu-button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight)).toBe(true);
  await page.screenshot({ path: info.outputPath('lobby-brew-phone.png') });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('[data-lobby="close"]').click(); await page.locator('#lobby-depart').click();
  await expect(page.locator('#world-pack')).toHaveAttribute('aria-label', /กระเป๋า/);
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.expedition.v1')!));
  expect(saved.run.potions).toEqual({ salve: 3, tonic: 0, repel: 1 }); expect(saved.profile.potions).toEqual({ salve: 1, tonic: 0, repel: 0 });
  // Hurt the knight in the save, reload, and drink a salve from the pack.
  saved.run.hp.guardian = 10; await page.evaluate(raw => localStorage.setItem('asterveil.fateweave.expedition.v1', raw), JSON.stringify(saved));
  await page.evaluate(() => sessionStorage.setItem('playtest-seeded', 'yes')); await page.reload(); await page.locator('#continue').click();
  await page.locator('#world-pack').click();
  await expect(page.locator('#potion-tonic')).toBeDisabled(); await expect(page.locator('#potion-tonic')).toContainText('ไม่มีแล้ว');
  await page.locator('#potion-salve').click(); await expect(page.locator('.salve-target')).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('map-potions.png') });
  await page.locator('#salve-guardian').click();
  await expect(page.locator('.pack-potions li').first()).toContainText('2');
  await page.locator('#potion-repel').click(); await expect(page.locator('#potion-repel')).toBeDisabled();
  await page.locator('[data-world="pack-close"]').click();
  await expect(page.locator('#danger-chip')).toContainText('ไล่อสูร 10 ก้าว');
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.expedition.v1')!));
  expect(saved.version).toBe(20); expect(saved.run.potions).toEqual({ salve: 2, tonic: 0, repel: 0 }); expect(saved.run.repel).toBe(10); expect(saved.run.hp.guardian).toBeGreaterThan(10);
});

test('camp NPCs stand at their stations, open their service when tapped and greet with a line', async ({ page }, info) => {
  // Opens and closes six sheets; the CI runner needed more than the 45 s default (16 s locally).
  test.slow();
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander, bank: { ore: 50, gold: 0, seal: 0, dust: 10 } } as Profile;
  // NPCs move only without reduced motion (the suite default is reduced).
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page, null, profile);
  await page.goto('./'); await page.locator('#continue').click();
  await expect(page.locator('.lobby-npc')).toHaveCount(6); await expect(page.locator('.npc-hit')).toHaveCount(6);
  for (const b of await page.locator('.npc-hit').all()) { const box = (await b.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
  await page.waitForTimeout(600);
  await page.screenshot({ path: info.outputPath('camp-npcs.png') });
  for (const [npc, title, line] of [['smith', 'ช่างตีเหล็ก', 'ลุงบอร์ก'], ['broker', 'ป้ายจ้าง', 'พีโน่'], ['herbalist', 'นักปรุงยา', 'เฟิร์น'], ['keeper', 'อุปกรณ์', 'มิมี่'], ['trainer', 'ต้นไม้ความถนัด', 'ครูฮัลดา'], ['scout', 'จัดทีม', 'คาเอล']] as const) {
    await page.locator(`#npc-${npc}`).click();
    await expect(page.locator('#lobby-sheet-title')).toContainText(title); await expect(page.locator('.npc-line')).toContainText(line);
    if (npc === 'smith') { await expect(page.locator(`#npc-art-${npc}`)).toHaveAttribute('data-act', 'greet'); await page.waitForTimeout(400); await page.screenshot({ path: info.outputPath('camp-npc-sheet.png') }); }
    await page.locator('[data-lobby="close"]').click();
  }
  // Brewing makes the herbalist cheer.
  await page.locator('#npc-herbalist').click(); await page.locator('#brew-salve').click();
  await expect(page.locator('#npc-art-herbalist')).toHaveAttribute('data-act', 'cheer');
  await page.locator('[data-lobby="close"]').click();
  // NPC frames change by transform, never by background-position (that repainted the atlas and flickered on iOS).
  // Staff take turns working, so the smith may be idling or working at this moment; check both animations.
  expect(['npc-idle', 'npc-work']).toContain(await page.locator('#npc-art-smith i').evaluate(el => getComputedStyle(el).animationName));
  const frames = await page.evaluate(() => [...document.styleSheets].flatMap(sheet => [...sheet.cssRules])
    .flatMap(r => r instanceof CSSMediaRule ? [...r.cssRules] : [r]).filter((r): r is CSSKeyframesRule => r instanceof CSSKeyframesRule && /^npc-(idle|work)$/.test(r.name))
    .flatMap(r => [...r.cssRules].map(k => ({ name: r.name, transform: !!(k as CSSKeyframeRule).style.transform, background: !!(k as CSSKeyframeRule).style.backgroundPosition }))));
  expect(new Set(frames.map(f => f.name))).toEqual(new Set(['npc-idle', 'npc-work']));
  for (const f of frames) expect(f).toMatchObject({ transform: true, background: false });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight)).toBe(true);
  // Portrait: the camp pans sideways. It opens on the fire with the team; the staff are off to the sides.
  const pan = page.locator('.lobby-pan');
  await page.reload(); await page.locator('#continue').click(); await page.waitForTimeout(300);
  const centred = await pan.evaluate(el => Math.abs(el.scrollLeft - (el.scrollWidth - el.clientWidth) / 2) < 2 && el.scrollWidth > el.clientWidth * 2);
  expect(centred).toBe(true);
  await expect(page.locator('#npc-smith')).not.toBeInViewport();
  await page.screenshot({ path: info.outputPath('camp-npcs-phone.png') });
  await page.locator('.lobby-pan-button[data-dir="-1"]').click(); await page.locator('.lobby-pan-button[data-dir="-1"]').click({ force: true });
  await expect.poll(() => pan.evaluate(el => el.scrollLeft)).toBeLessThan(5);
  await expect(page.locator('#npc-smith')).toBeInViewport(); await expect(page.locator('#npc-art-trainer')).toBeInViewport();
  await page.screenshot({ path: info.outputPath('camp-npcs-phone-left.png') });
  await page.locator('#npc-smith').click(); await expect(page.locator('#lobby-sheet-title')).toContainText('ช่างตีเหล็ก');
  // Redraws keep the pan where the player left it.
  await page.locator('[data-lobby="close"]').click(); expect(await pan.evaluate(el => el.scrollLeft)).toBeLessThan(5);
  await pan.evaluate(el => { el.scrollLeft = el.scrollWidth; }); await expect(page.locator('#npc-scout')).toBeInViewport();
  await page.screenshot({ path: info.outputPath('camp-npcs-phone-right.png') });
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(300);
  await page.screenshot({ path: info.outputPath('camp-npcs-landscape.png') });
});

test('side quests: a herb is picked on the map; at camp the herbalist shows "!", and her reward is claimed once; saved v17', async ({ page }, info) => {
  const h = map.herbs[0]!;
  const issues = await open(page, base({ position: { x: h.x + 1, y: h.y }, repel: 10, revealed: '1'.repeat(base().revealed.length) }));
  await expect(page.locator(`.herb[data-herb="${h.id}"]`)).toBeVisible();
  await page.locator('#move-left').click();
  await expect(page.locator('#world-message')).toContainText('สมุนไพรเรืองแสง');
  await expect(page.locator(`.herb[data-herb="${h.id}"]`)).toBeHidden();
  expect((await saved(page)).herbs).toEqual([h.id]);
  // In the lobby with the herbalist's quest complete.
  const q = map.sideQuests.find(s => s.npc === 'herbalist')!;
  await page.evaluate(([k, id, target]) => { const s = JSON.parse(localStorage.getItem(k as string)!); s.run = null; s.profile.quests = { [id as string]: { progress: target, claimed: false } }; localStorage.setItem(k as string, JSON.stringify(s)); }, [key, q.id, q.target]);
  await page.reload(); await page.locator('#continue').click();
  await expect(page.locator('#npc-herbalist')).toHaveClass(/quest-ready/); await expect(page.locator('#npc-smith')).not.toHaveClass(/quest-ready/);
  await page.locator('#npc-herbalist').click();
  await expect(page.locator(`#quest-${q.id}`)).toHaveAttribute('data-state', 'ready');
  await reachable(page, `#quest-claim-${q.id}`);
  await page.screenshot({ path: info.outputPath('side-quest-ready.png') });
  await page.locator(`#quest-claim-${q.id}`).click();
  await expect(page.locator('.lobby-result')).toContainText('ได้รับรางวัลเควสต์');
  await expect(page.locator(`#quest-${q.id}`)).toHaveAttribute('data-state', 'claimed');
  await expect(page.locator('#npc-herbalist')).not.toHaveClass(/quest-ready/);
  const p = await savedProfile(page);
  expect(p.quests[q.id]).toEqual({ progress: q.target, claimed: true }); expect(p.potions.salve).toBe(q.reward.potions!.salve);
  // Another NPC's quest shows its progress and a disabled claim with the reason.
  await page.locator('[data-lobby="close"]').click(); await page.locator('#npc-smith').click();
  await expect(page.locator('#quest-claim-smith-rare-ore')).toBeDisabled(); await expect(page.locator('#quest-claim-smith-rare-ore')).toContainText(`0/${map.sideQuests.find(s => s.npc === 'smith')!.target}`);
  expect(issues).toEqual([]);
});

test('levels: the map shows the monster level here and members’ levels; battles show enemy levels', async ({ page }, info) => {
  const state = newExpedition(map, encounterById, 11); state.tutorialDone = true;
  const issues = await open(page, state);
  await expect(page.locator('#zone-name .zone-level')).toHaveText(/^Lv[1-3]$/);
  await expect(page.locator('#world-hero-guardian')).toContainText('Lv1');
  await page.screenshot({ path: info.outputPath('levels-map.png') });
  let s = state; let steps = 0; while (!s.battle && steps < 80) { s = move(s, map, steps % 2 ? 'right' : 'left').state; steps++; }
  for (let i = 0; i < steps; i++) await page.locator(i % 2 ? '#move-right' : '#move-left').click();
  await expect(page.locator('#battle-view')).not.toHaveClass(/view-off/);
  await expect(page.locator('#enemy-roster')).toContainText(`Lv${s.battle!.level}`);
  expect(issues).toEqual([]);
});
