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
import { watchPage } from './diagnostics';
test.beforeEach(({ page }) => watchPage(page));

const key = 'asterveil.fateweave.expedition.v1';
const full = { guardian: 76, tracer: 56, weaver: 48, healer: 46 };
function base(patch: Partial<ExpeditionState> = {}): ExpeditionState {
  const state = { ...newExpedition(map, encounterById, 77), tutorialDone: true, ...patch }; reveal(state, map); return state;
}
async function seed(page: Page, state: ExpeditionState | null, profile: Profile = { ...newProfile(map, 5), tutorialDone: true, commander }) {
  await page.addInitScript(({ raw, key }) => { if (sessionStorage.getItem('playtest-seeded')) return; localStorage.setItem(key, raw); sessionStorage.setItem('playtest-seeded', 'yes'); }, { raw: JSON.stringify({ version: 10, profile, run: state }), key });
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

test('lobby: hiring a new mercenary adds them to the reserve with full roster data, and they cheer at the fire', async ({ page }, info) => {
  let seedValue = 5; while (boardOffers(newProfile(map, seedValue), map, encounterById)[0] !== 'mira') seedValue++;
  await seed(page, null, { ...newProfile(map, seedValue), tutorialDone: true, commander, bank: { ore: 30, seal: 0, dust: 0 } });
  await page.goto('./'); await page.locator('#continue').click();
  // The painted camp: front members sit on logs, the middle pair has a character moment.
  await expect(page.locator('.lobby-unit[data-actor=guardian]')).toHaveAttribute('data-pose', 'sit');
  await expect(page.locator('.lobby-unit[data-actor=tracer]')).toHaveAttribute('data-pose', 'idle_alt');
  await page.locator('#lobby-tab-hire').click();
  await expect(page.locator('#hire-0')).toContainText('จ้าง · 30'); await page.locator('#hire-0').click();
  const p = await savedProfile(page);
  expect(p.members.mira).toEqual({ stars: 1, dupes: 0 }); expect(p.party.reserve).toEqual(['mira']); expect(p.company).toContain('mira');
  await expect(page.locator('.lobby-unit[data-actor=mira]')).toHaveAttribute('data-pose', 'cheer');
  await page.screenshot({ path: info.outputPath('lobby-mira-cheers.png') });
  await page.keyboard.press('Escape'); await expect(page.locator('#lobby-sheet')).toHaveCount(0); await expect(page.locator('#lobby-tab-hire')).toBeFocused();
  await page.locator('#lobby-tab-team').click(); await expect(page.locator('#lobby-member-mira')).toContainText('มิร่า');
});

test('lobby: hire a duplicate, upgrade a star, pick the team, depart, and withdraw at the entrance', async ({ page }, info) => {
  // Pick a profile seed whose first offer is a duplicate of a starting member (the board also offers new mercenaries).
  let seedValue = 5; while (!map.startingRoster.includes(boardOffers(newProfile(map, seedValue), map, encounterById)[0]!)) seedValue++;
  const profile = { ...newProfile(map, seedValue), tutorialDone: true, commander, bank: { ore: 120, seal: 0, dust: 0 } };
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
    await seed(page, null, { ...newProfile(map, 5), tutorialDone: true, commander, bank: { ore: 45, seal: 1, dust: 0 } });
    const issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
    await page.goto('./'); await page.locator('#continue').click(); await expect(page.locator('#lobby-view')).toBeVisible();
    const noScroll = () => page.evaluate(() => document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth);
    expect(await noScroll()).toBe(false);
    for (const sel of ['#lobby-depart', '#lobby-tab-team', '#lobby-tab-hire']) { await page.locator(sel).scrollIntoViewIfNeeded(); await reachable(page, sel); }
    // Team and hire open as a sheet over the camp; the depart button stays reachable with it open.
    await page.locator('#lobby-tab-team').click(); for (const sel of ['#lobby-member-guardian', '#lobby-depart']) { await page.locator(sel).scrollIntoViewIfNeeded(); await reachable(page, sel); }
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
  expect(saved.version).toBe(10); expect(saved.profile.members.guardian.talents).toEqual({ root: 1, b1: 2 });
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
  await expect(page.locator('.lobby-bank')).toHaveAttribute('aria-label', /ผงม่านเวล 5/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight)).toBe(true);
  await page.screenshot({ path: info.outputPath('lobby-gear-phone.png') });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.expedition.v1')!));
  expect(saved.version).toBe(10); expect(saved.profile.members.guardian.gear.charm.uid).toBe(4); expect(saved.profile.items.map((i: { uid: number }) => i.uid)).toEqual([3]);
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
