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
import { currentSave } from '../../tests/fixtures/current-save';
import { xpAt } from '../../tests/fixtures/camp-level';

// UI-language audit (2026-11-05): screenshots and computed-style samples of every UI surface for a cross-screen
// comparison. Evidence only, not a gameplay check. Run with
//   UI_AUDIT=<dir> npx playwright test tests/browser/ui-language-audit.spec.ts
// Output: <dir>/<w>x<h>/<surface>.png and <dir>/<w>x<h>/metrics.json (see docs/validation/ui-language-audit-2026-11-05).
const dir = process.env.UI_AUDIT;
const key = 'asterveil.fateweave.expedition.v1';
const sizes = [[390, 844], [390, 650], [320, 568]] as const;
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
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const page = await context.newPage(), errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('ula')) { if (raw) localStorage.setItem(key, raw); else localStorage.removeItem(key); sessionStorage.setItem('ula', '1'); } }, { key, raw });
  await page.goto('./');
  return { page, close: () => context.close(), errors };
}


for(const [w,h] of sizes)test(`tomes source ${w}x${h}`,async({browser})=>{
 const raw=currentSave({profile:richProfile(),run:null} as never),s=await open(browser,w,h,raw),page=s.page;
 await page.locator('#continue').click();await page.locator('#lobby-tab-team').click();await page.locator('#team-character-guardian').click();await page.locator('[data-world="character-tab"][data-tab="skills"]').first().click();await page.locator('[data-world="skill-section"][data-section="tomes"]').first().click();await expect(page.locator('.skills-section[data-section="tomes"]')).toBeVisible();
 const out=`${dir}/${w}x${h}`;await page.screenshot({path:`${out}/17b-character-tome-trade.png`});writeFileSync(`${out}/17b-character-tome-trade.json`,JSON.stringify(await page.evaluate(()=>({html:document.body.innerHTML,texts:[]})),null,2));
 const old=JSON.parse(readFileSync(`${out}/metrics.json`,'utf8'));old.surfaces['17b-character-tome-trade']=await sample(page);writeFileSync(`${out}/metrics.json`,JSON.stringify(old,null,2));await s.close();
});
