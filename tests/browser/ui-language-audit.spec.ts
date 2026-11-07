import { expect, test, type Browser, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile, depart } from '../../src/core/world/profile';
import { battleData, battleState } from '../../src/core/world/world';
import { currentHeroId, resolveCommand, targetOptions } from '../../src/core/battle/engine';
import { weaponBlueprint } from '../../src/core/world/forge';
import { parseGame } from '../../src/core/save/expedition-save';
import type { Profile } from '../../src/core/world/types';
import { currentSave } from '../fixtures/current-save';
import { xpAt } from '../fixtures/camp-level';

// UI-language audit (2026-11-05): screenshots and computed-style samples of every UI surface for a cross-screen
// comparison. Evidence only, not a gameplay check. Run with
//   UI_AUDIT=<dir> npx playwright test tests/browser/ui-language-audit.spec.ts
// Output: <dir>/<w>x<h>/<surface>.png and <dir>/<w>x<h>/metrics.json (see docs/validation/ui-language-audit-2026-11-05).
const dir = process.env.UI_AUDIT;
const key = 'asterveil.fateweave.expedition.v1';
// Optional: UI_AUDIT_SIZES=390x844,320x568 limits the sizes; UI_AUDIT_CSS=<file> injects extra CSS (owner option boards).
const sizes = ([[390, 844], [390, 650], [320, 568]] as const).filter(([w, h]) => !process.env.UI_AUDIT_SIZES || process.env.UI_AUDIT_SIZES.split(',').includes(`${w}x${h}`));
const extraCss = process.env.UI_AUDIT_CSS ? readFileSync(process.env.UI_AUDIT_CSS, 'utf8') : '';
test.describe.configure({ timeout: 240_000 });

function richProfile(): Profile {
  const p = newProfile(map, 17);
  p.tutorialDone = true; p.veteran = true;
  p.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  p.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  p.campXp = xpAt(10); p.forgeLevel = 6; p.storageTier = 1;
  for (const id of ['guardian', 'tracer', 'weaver', 'healer', 'kael', 'wynne', 'astrid', 'metta', 'lalin']) if (!p.company.includes(id)) p.company.push(id);
  for (const id of p.company) p.members[id] ??= { stars: 1, dupes: 0 };
  p.members.guardian = { stars: 3, dupes: 4 };
  p.party = { deployed: ['guardian', 'tracer', 'weaver', 'healer', 'kael'], reserve: ['wynne', 'astrid', 'metta'] };
  p.bank = { ore: 640, dust: 120, gold: 2480, seal: 3 };
  p.tomes = { bulwark: { small: 6, medium: 2, large: 0 }, blade: { small: 4, medium: 1, large: 1 }, accord: { small: 3, medium: 0, large: 0 } };
  p.riftCore = 2;
  p.potions = { salve: 3, tonic: 2, repel: 1, calm: 1 };
  p.items = [
    { uid: 1, slot: 'body', rarity: 1, level: 3, affixes: ['hp'], plus: 2, investment: { ore: 9, dust: 2 }, levelInvestment: { ore: 20, dust: 2 }, set: 'dawn' },
    { ...weaponBlueprint(map, 'guardian', 4, 2) }, { ...weaponBlueprint(map, 'tracer', 3, 3) }, { ...weaponBlueprint(map, 'weaver', 2, 4) },
    { ...weaponBlueprint(map, 'healer', 2, 5) }, { ...weaponBlueprint(map, 'kael', 3, 6) },
  ] as Profile['items'];
  p.nextItem = 7;
  const ready = map.sideQuests[1]; if (ready) p.quests = { [ready.id]: { progress: ready.target, claimed: false } };
  return p;
}

// Style sample of every visible element of a kind, inside the open surface. Values are computed CSS, not guesses.
const sample = (page: Page) => page.evaluate(() => {
  const app = document.querySelector('#app')?.getBoundingClientRect() ?? document.body.getBoundingClientRect();
  const vis = (el: Element) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05 && r.bottom > 0 && r.top < innerHeight && top(el); };
  // Topmost only: an element covered by an open sheet or dialog is not part of what the player sees.
  const top = (el: Element) => { const r = el.getBoundingClientRect(); const pts = [[r.x + r.width / 2, r.y + r.height / 2], [r.x + 4, r.y + 4], [r.right - 4, r.bottom - 4]]; return pts.some(([x, y]) => { if (x! < 0 || y! < 0 || x! >= innerWidth || y! >= innerHeight) return false; const e = document.elementFromPoint(x!, y!); return !!e && (e === el || el.contains(e) || e.contains(el)); }); };
  const cls = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList.length ? '.' + [...el.classList].join('.') : ''}`;
  const box = (el: Element) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x - app.x), y: Math.round(r.y - app.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const st = (el: Element) => { const s = getComputedStyle(el); return { font: `${s.fontSize}/${s.fontWeight}`, family: s.fontFamily.split(',')[0]!.replace(/"/g, ''), color: s.color, bg: s.backgroundColor, bgImage: s.backgroundImage === 'none' ? '' : s.backgroundImage.slice(0, 60), border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, borderLeft: `${s.borderLeftWidth} ${s.borderLeftColor}`, radius: s.borderTopLeftRadius, shadow: s.boxShadow === 'none' ? '' : s.boxShadow.slice(0, 80), pad: s.padding, gap: s.gap, backdrop: s.backdropFilter === 'none' ? '' : s.backdropFilter }; };
  const buttons = [...document.querySelectorAll('button, [role=tab], summary, select, a.button')].filter(vis).map(el => ({ sel: cls(el), text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40), aria: el.getAttribute('aria-label') ?? '', disabled: (el as HTMLButtonElement).disabled ?? false, ...box(el), ...st(el) }));
  const heads = [...document.querySelectorAll('h1, h2, h3, h4, .lobby-sheet-head, .info-header, .forge-service-head, [class*="-head"]')].filter(vis).map(el => ({ sel: cls(el), text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40), ...box(el), ...st(el) }));
  const panels = [...document.querySelectorAll('section, article, li, details, dialog, .card, [class*="card"], [class*="panel"], [class*="row"], [class*="capsule"], [class*="chip"], [class*="badge"], [class*="tag"]')].filter(vis).filter(el => { const s = getComputedStyle(el); return s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.borderTopWidth !== '0px' || s.backgroundImage !== 'none' || s.boxShadow !== 'none'; }).map(el => ({ sel: cls(el), ...box(el), ...st(el) }));
  // Smallest visible text: elements with their own text node.
  const texts: { sel: string; px: number; text: string }[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) { const t = (n.textContent ?? '').trim(); const el = n.parentElement; if (!t || !el || !vis(el)) continue; const px = parseFloat(getComputedStyle(el).fontSize); if (px > 0) texts.push({ sel: cls(el), px, text: t.slice(0, 30) }); }
  const sizes: Record<string, number> = {}; for (const t of texts) sizes[t.px] = (sizes[t.px] ?? 0) + 1;
  const small = texts.filter(t => t.px < 12);
  const hscroll = document.documentElement.scrollWidth > innerWidth + 1;
  return { app: { w: Math.round(app.width), h: Math.round(app.height) }, buttons, heads, panels, fontSizes: sizes, small: small.slice(0, 30), smallCount: small.length, hscroll };
});

async function open(browser: Browser, w: number, h: number, raw: string | null): Promise<{ page: Page; close: () => Promise<void>; errors: string[] }> {
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await context.newPage(), errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('ula')) { if (raw) localStorage.setItem(key, raw); else localStorage.removeItem(key); sessionStorage.setItem('ula', '1'); } }, { key, raw });
  if (extraCss) await page.addInitScript(css => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = css; document.head.append(st); }), extraCss);
  await page.goto('./');
  return { page, close: () => context.close(), errors };
}

for (const [w, h] of sizes) test(`ui language audit ${w}x${h}`, async ({ browser }) => {
  test.skip(!dir, 'set UI_AUDIT to a folder');
  const out = `${dir}/${w}x${h}`; mkdirSync(out, { recursive: true });
  const metrics: Record<string, unknown> = {}; const missed: Record<string, string> = {};
  const shot = async (page: Page, name: string, act?: () => Promise<unknown>) => {
    try { if (act) await act(); await page.waitForTimeout(350); await page.screenshot({ path: `${out}/${name}.png` }); metrics[name] = await sample(page); }
    catch (e) { missed[name] = String(e).split('\n')[0]!.slice(0, 200); }
  };
  const click = (page: Page, sel: string) => page.locator(sel).first().click({ timeout: 4000 });
  const closeSheet = async (page: Page) => { const c = page.locator('[data-lobby="close"]'); if (await c.count()) await c.first().click(); await page.waitForTimeout(150); };

  // 1) Title, commander naming and intro story from an empty save.
  { const s = await open(browser, w, h, null);
    await shot(s.page, '01-title');
    await shot(s.page, '02-new-game', async () => { const b = s.page.locator('#new-game, [data-ui="new"], button:has-text("เริ่ม")').first(); await b.click({ timeout: 4000 }); });
    await shot(s.page, '03-story', async () => { await s.page.locator('input').first().fill('อารี'); await s.page.locator('#commander-create').click({ timeout: 4000 }); await expect(s.page.locator('#story-next')).toBeVisible({ timeout: 6000 }); });
    await shot(s.page, '04-story-next', () => s.page.locator('#story-next').click({ timeout: 4000 }));
    await s.close(); }

  // 2) Camp services from a progressed company (12-member style save, every system open).
  const p = richProfile(); const raw = currentSave({ profile: p, run: null } as never); parseGame(raw, map, encounterById);
  { const s = await open(browser, w, h, raw), page = s.page;
    await shot(page, '10-title-continue');
    await shot(page, '11-camp', async () => { await click(page, '#continue'); await expect(page.locator('#lobby-depart')).toBeVisible(); });
    await shot(page, '12-camp-bank-legend', () => click(page, '#lobby-bank'));
    await click(page, '#lobby-bank').catch(() => undefined);
    await shot(page, '13-team', () => click(page, '#lobby-tab-team'));
    await shot(page, '14-team-member-picked', () => click(page, '.lobby-sheet [data-lobby="pick"]'));
    await shot(page, '15-team-member-scrolled', () => page.locator('.member-panel').first().scrollIntoViewIfNeeded({ timeout: 3000 }));
    const ctab = (tab: string) => page.locator(`[data-world="character-tab"][data-tab="${tab}"]`).first().click({ timeout: 4000 });
    const cclose = async () => { for (let i = 0; i < 3 && await page.locator('[data-world="character-close"]').first().isVisible().catch(() => false); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); const c = page.locator('[data-world="character-close"]').first(); if (await c.isVisible().catch(() => false)) await c.click({ timeout: 2000 }).catch(() => undefined); } };
    await shot(page, '16-character-overview', () => click(page, '#lobby-tab-characters'));
    for (const tab of ['gear', 'skills', 'develop'] as const) await shot(page, `16-character-${tab}`, () => ctab(tab));
    await shot(page, '17-character-skills-tree', async () => { await ctab('talents'); });
    await shot(page, '17b-character-tome-trade', async () => { await page.locator('[data-world="skill-section"]').last().click({ timeout: 3000 }); });
    await shot(page, '18-star-page', async () => { await ctab('develop'); await page.locator('[data-world="character-star-open"]').first().click({ timeout: 3000 }); });
    await shot(page, '18b-star-review', () => page.locator('[data-world="star-review"]').first().click({ timeout: 3000 }));
    await cclose();
    await closeSheet(page);
    await shot(page, '20-hire-board', () => click(page, '#lobby-tab-hire'));
    await shot(page, '21-hire-preview', () => click(page, '[data-lobby="hire-preview"]'));
    await click(page, '[data-lobby="hire-preview-back"]').catch(() => undefined);
    await shot(page, '22-market', () => click(page, '#hire-tab-market'));
    await closeSheet(page);
    await shot(page, '23-bag', () => click(page, '#lobby-tab-gear'));
    await shot(page, '24-bag-storage-open', () => click(page, '.lobby-sheet details:not([open]) > summary'));
    await closeSheet(page);
    await shot(page, '25-farm-plan', () => click(page, '#lobby-tab-hunt'));
    await closeSheet(page);
    await shot(page, '26-brew', () => click(page, '#lobby-tab-brew'));
    await closeSheet(page);
    await shot(page, '27-forge-tasks', () => click(page, '#lobby-tab-forge'));
    for (const task of ['enhance', 'level', 'fuse', 'reroll', 'transfer', 'craft', 'recycle', 'smelt']) {
      await shot(page, `28-forge-${task}`, async () => { const b = page.locator('#forge-open-tasks'); if (await b.count()) await b.click(); await click(page, `[data-forge=task][data-task="${task}"]`); });
    }
    await shot(page, '29-forge-craft-review', async () => { const b = page.locator('#forge-open-tasks'); if (await b.count()) await b.click(); await click(page, '[data-forge=task][data-task="craft"]'); await page.locator('#forge-craft-level').selectOption('3'); await click(page, '#forge-craft'); await expect(page.locator('#forge-confirm')).toBeVisible(); });
    await page.locator('#forge-cancel').click({ timeout: 2000 }).catch(() => undefined);
    await shot(page, '30-forge-enhance-picked', async () => { const b = page.locator('#forge-open-tasks'); if (await b.count()) await b.click(); await click(page, '[data-forge=task][data-task="enhance"]'); await click(page, '[data-forge=pick]'); });
    await closeSheet(page);
    await shot(page, '31-maps', () => click(page, '#lobby-maps'));
    await closeSheet(page);
    await shot(page, '32-quest-board', () => click(page, '#lobby-board'));
    await closeSheet(page);
    await shot(page, '33-npc-trainer-tree', () => click(page, '#npc-trainer'));
    await cclose(); await closeSheet(page);
    // 3) Expedition map: real departure from the camp.
    await shot(page, '40-map-hud', async () => { await click(page, '#lobby-depart'); await expect(page.locator('#world-pack')).toBeVisible({ timeout: 8000 }); const go = page.locator('[data-ui=start]'); if (await go.isVisible().catch(() => false)) await go.click(); });
    await shot(page, '41-map-goals', () => click(page, '#objective-button'));
    await click(page, '[data-world="goals-close"]').catch(() => undefined);
    await shot(page, '42-map-pack', () => click(page, '#world-pack'));
    await shot(page, '43-map-pack-tab2', () => page.locator('[data-world="bag-tab"]').nth(1).click({ timeout: 3000 }));
    await click(page, '[data-world="pack-close"]').catch(() => undefined);
    await shot(page, '44-map-info', () => click(page, '#world-info-button'));
    await click(page, '[data-world="info-close"]').catch(() => undefined);
    await shot(page, '45-map-camp', async () => { const r = page.locator('#rest'); await r.click({ timeout: 3000 }); await expect(page.locator('#camp-dialog')).toBeVisible({ timeout: 3000 }); });
    await shot(page, '46-map-withdraw-confirm', async () => { const t = page.locator('[data-world="camp-tab"]').last(); if (await t.count()) await t.click(); await click(page, '#withdraw'); });
    await shot(page, '47-run-summary', async () => { await click(page, '#withdraw'); await expect(page.locator('.summary-view:not([hidden])')).toBeVisible({ timeout: 6000 }); });
    await shot(page, '48-summary-scrolled', () => page.locator('.summary-view button.primary, .summary-view button').last().scrollIntoViewIfNeeded({ timeout: 3000 }));
    await shot(page, '49-camp-after-run', async () => { await page.locator('.summary-view button.primary, .summary-view button').last().click({ timeout: 3000 }); await expect(page.locator('#lobby-depart')).toBeVisible({ timeout: 6000 }); });
    if (s.errors.length) missed['page-errors-camp'] = s.errors.join(' | ').slice(0, 400);
    await s.close(); }

  // 4) Battle: the same company departs, then a five-a-side random battle is staged on the run.
  { const pre = richProfile(); const { profile, run } = depart(pre, map, encounterById, 4242);
    run.tutorialDone = true; run.battle = { kind: 'boss', encounterId: map.bossEncounterId, entry: Object.fromEntries(run.roster.deployed.map(id => [id, run.hp[id]!])), commands: [] } as never;
    let battleRaw = ''; try { const r = currentSave({ profile, run } as never); parseGame(r, map, encounterById); battleRaw = r; } catch (e) { missed['battle-save'] = String(e).slice(0, 200); }
    if (battleRaw) { const s = await open(browser, w, h, battleRaw), page = s.page;
      await shot(page, '50-battle', async () => { await click(page, '#continue'); const go = page.locator('[data-ui=start]'); if (await go.isVisible({ timeout: 3000 }).catch(() => false)) await go.click(); await expect(page.locator('#action-attack')).toBeEnabled({ timeout: 10000 }); });
      await shot(page, '51-battle-skill-help', () => page.locator('#commands button[aria-haspopup], .skill-info, [data-help], .action-help button').first().click({ timeout: 3000 }));
      await page.keyboard.press('Escape').catch(() => undefined);
      await shot(page, '52-battle-target', () => click(page, '#action-attack'));
      await shot(page, '53a-battle-info-dialog', async () => { await page.keyboard.press('Escape').catch(() => undefined); await click(page, '#battle-info'); await expect(page.locator('#game-info')).toBeVisible({ timeout: 3000 }); });
      await shot(page, '53b-battle-info-guide', () => click(page, '#battle-tab-guide'));
      await page.keyboard.press('Escape').catch(() => undefined);
      await shot(page, '53-battle-menu', () => page.locator('#help-home, .masthead button').first().click({ timeout: 3000 }));
      if (s.errors.length) missed['page-errors-battle'] = s.errors.join(' | ').slice(0, 400);
      await s.close(); } }

  // 5) Victory: a won battle one command before the end (as battle-rewards.spec), then the rewards dialog.
  { const p0 = newProfile(map, 17); p0.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p0.tutorialDone = true; for (const m of Object.values(p0.members)) m.stars = 5; p0.campXp = xpAt(2);
    const game = depart(p0, map, encounterById, 77), run = game.run; run.battle = { kind: 'random', encounterId: map.tutorialEncounterId, entry: { ...run.hp }, commands: [] };
    const data = battleData(run, map, encounterById)!; let b = battleState(run, map, encounterById)!;
    for (let n = 0; b.outcome === 'active' && n < 200; n++) { const hero = currentHeroId(b, data)!; b = resolveCommand(b, data, { beat: b.beat, heroId: hero, action: 'attack', targetId: targetOptions(b, data, hero, 'attack').find(t => t.valid)!.id }).state; }
    const last = b.commands.at(-1)!; run.battle.commands = b.commands.slice(0, -1);
    const s = await open(browser, w, h, currentSave(game as never)), page = s.page;
    await shot(page, '54-battle-victory', async () => { await click(page, '#continue'); if (await page.locator('#start').isVisible().catch(() => false)) await page.locator('#start').click(); await click(page, '#action-attack'); await click(page, `#target-${last.targetId}`); await expect(page.locator('#leave-battle')).toBeVisible({ timeout: 30000 }); });
    await shot(page, '55-battle-rewards', async () => { await click(page, '#leave-battle'); await expect(page.locator('.battle-rewards')).toBeVisible({ timeout: 6000 }); });
    await s.close(); }

  writeFileSync(`${out}/metrics.json`, JSON.stringify({ viewport: { w, h }, missed, surfaces: metrics }, null, 1));
});
