import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { veilSiege as data } from '../../src/content/encounters/veil-siege';
import { createBattle, resolveCommand } from '../../src/core/battle/engine';
import { newExpedition } from '../../src/core/world/world';
import { newProfile } from '../../src/core/world/profile';
import { fieldSlots } from '../../src/game/visuals/field-layout';

const key = 'asterveil.fateweave.expedition.v1';
async function openBattle(page: Page) {
  const hp = Object.fromEntries(data.heroes.map(h => [h.id, h.maxHp]));
  let s = createBattle(data, { hp });
  s = resolveCommand(s, data, { beat: s.beat, heroId: 'tracer', action: 'mark', targetId: 'brute' }).state;
  s = resolveCommand(s, data, { beat: s.beat, heroId: 'weaver', action: 'ward', targetId: 'weaver' }).state;
  const run = newExpedition(map, encounterById, 1234); run.tutorialDone = true;
  run.battle = { kind: 'random', encounterId: data.id, entry: hp, commands: s.commands };
  const profile = { ...newProfile(map, 5), tutorialDone: true, commander: { name: 'อารี', crest: 'star', color: 'gold' } };
  await page.addInitScript(({ key, raw }) => { if (!sessionStorage.getItem('status-seeded')) { localStorage.setItem(key, raw); sessionStorage.setItem('status-seeded', 'yes'); } }, { key, raw: JSON.stringify({ version: 21, profile, run }) });
  await page.goto('./'); await page.locator('#continue').click(); await expect(page.locator('#action-attack')).toBeEnabled();
}

test('all six reserved HP/status panels avoid every sprite and each other through short-field and viewport resize', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 }); await openBattle(page);
  await page.locator('#action-bash').click();
  const before = await page.evaluate(k => localStorage.getItem(k), key);
  for (const [width, height, forceShort] of [[320, 568, true], [320, 568, false], [390, 844, false], [1366, 768, false]] as const) {
    await page.setViewportSize({ width, height });
    await page.locator('.arena').evaluate((el, short) => {
      (el as HTMLElement).style.cssText = short ? 'height:128px!important;min-height:128px!important;max-height:128px!important;flex:none!important' : '';
    }, forceShort);
    const arena = await page.locator('.arena').evaluate(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y, width: el.clientWidth, height: el.clientHeight }));
    await expect.poll(() => page.locator('#game canvas').evaluate(el => parseFloat((el as HTMLElement).style.height))).toBe(arena.height);
    const slots = fieldSlots(arena.width, arena.height);
    // Layout stress only: fill every reserved row, including currently unaffected units.
    // This intentionally changes DOM decorations, never combat state or saved commands.
    await page.locator('.field-unit-info').evaluateAll(els => {
      const sample = document.querySelector('.field-status')!.outerHTML;
      for (const el of els) {
        el.querySelector('.field-statuses')?.remove();
        const icons = el.classList.contains('compact') ? 1 : Math.min(3, Math.floor((el.clientWidth - 18) / 20));
        const row = document.createElement('span'); row.className = 'field-statuses';
        row.innerHTML = sample.repeat(icons) + '<span class="field-status-more">+9</span>'; el.append(row);
      }
    });
    expect(await page.locator('.field-unit-info').evaluateAll((els, { arena, slots }) => {
      const boxes = els.map(el => el.getBoundingClientRect());
      const overlap = (a: {x:number;y:number;width:number;height:number}, b: {x:number;y:number;width:number;height:number}) => a.x < b.x+b.width-.5 && b.x < a.x+a.width-.5 && a.y < b.y+b.height-.5 && b.y < a.y+a.height-.5;
      return els.length === 6 && els.every((el, i) => {
        const r = boxes[i]!;
        const local = { x:r.x-arena.x, y:r.y-arena.y, width:r.width, height:r.height };
        return !slots.some(s => overlap(local, s.body)) && !boxes.some((b,j) => i!==j && overlap(r,b)) &&
          [...el.querySelectorAll('.field-status, .field-status-more, .field-health, .field-unit-name')].every(c => {
            const b = c.getBoundingClientRect(); return !b.width || b.left>=r.left-.5 && b.right<=r.right+.5 && b.top>=r.top-.5 && b.bottom<=r.bottom+.5;
          });
      });
    }, { arena, slots })).toBe(true);
    await expect(page.locator('#action-bash')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before);
    await page.screenshot({ path: info.outputPath(`reserved-status-${width}-${forceShort ? 'short' : 'normal'}.png`) });
  }
});

test('status inspection follows each displayed actor stage instead of leaking the final committed state', async ({ page }) => {
  await openBattle(page);
  const now = new Date('2026-10-19T00:00:00Z');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date('2026-10-19T00:01:00Z'));
  await page.locator('#action-bash').click(); await page.locator('#target-raider').click();
  const committed = await page.evaluate(k => localStorage.getItem(k), key);
  await page.locator('#battle-info').click(); await page.locator('#status-unit-weaver').click();
  await expect(page.locator('#status-frame')).toContainText('จังหวะที่กำลังแสดง');
  await expect(page.locator('#status-details [data-status=barrier]')).toBeVisible();
  await expect(page.locator('[data-status-actor=weaver] [data-status=barrier]')).toHaveCount(1);
  await page.clock.runFor(1000);
  await expect(page.locator('#status-details [data-status=barrier]')).toHaveCount(0);
  await expect(page.locator('[data-status-actor=weaver]')).toHaveCount(0);
  await expect(page.locator('#battle-tab-status')).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(committed);
  await page.keyboard.press('Escape'); await page.clock.runFor(1000);
  await expect(page.locator('#action-attack')).toBeEnabled();
});

for (const [width, height, touch] of [[320, 568, true], [390, 844, true], [1366, 768, false]] as const) {
  test(`status tab defaults on every battle-info open and inspects both sides safely at ${width}x${height}`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, reducedMotion: 'reduce' });
    const page = await context.newPage(), issues: string[] = []; page.on('pageerror', e => issues.push(e.message));
    await openBattle(page); await page.locator('#action-bash').click();
    await expect(page.locator('[data-status-actor=brute] .debuff[data-status=mark]')).toBeVisible();
    await expect(page.locator('[data-status-actor=weaver] .buff[data-status=barrier]')).toBeVisible();
    await expect(page.locator('[data-status-actor=healer]')).toHaveCount(0);
    // Badges remain visible without a selected skill and do not consume target input.
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-status-actor=brute]')).toBeVisible();
    await page.locator('#action-bash').click();
    expect(await page.locator('.field-statuses').evaluateAll(els => els.every(el => {
      const r = el.getBoundingClientRect(), arena = document.querySelector('.arena')!.getBoundingClientRect();
      return r.left >= arena.left && r.right <= arena.right && r.top >= arena.top && r.bottom <= arena.bottom && getComputedStyle(el).pointerEvents === 'none';
    }))).toBe(true);
    await page.screenshot({ path: info.outputPath('battle-field-statuses.png') });
    const before = await page.evaluate(k => localStorage.getItem(k), key);
    await page.locator('#battle-info').click();
    await expect(page.locator('#battle-tab-status')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#battle-panel-status')).toBeVisible();
    await expect(page.locator('[data-ui=status-unit]')).toHaveCount(6);
    await page.locator('#status-unit-brute').click();
    await expect(page.locator('#status-details [data-status=mark]')).toContainText('เหลือ 2 รอบ');
    await page.locator('#status-unit-weaver').click();
    await expect(page.locator('#status-details [data-status=barrier]')).toContainText('ดูดซับความเสียหาย');
    await page.locator('#status-unit-healer').click();
    await expect(page.locator('#status-details')).toContainText('ไม่มีบัฟหรือดีบัฟชั่วคราว');
    await page.locator('#status-unit-brute').click();
    await page.screenshot({ path: info.outputPath('battle-status-tab.png') });
    expect(await page.locator('#game-info').evaluate(el => {
      const r = el.getBoundingClientRect(), frame = document.querySelector('#app')!.getBoundingClientRect();
      return r.left >= frame.left - 1 && r.right <= frame.right + 1 && r.bottom <= innerHeight && el.scrollWidth <= el.clientWidth;
    })).toBe(true);
    for (const id of ['#battle-tab-status', '#battle-tab-guide', '#battle-tab-settings', '#battle-tab-history', '#status-unit-brute']) {
      expect(await page.locator(id).evaluate(el => { const r = el.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })).toBe(true);
    }
    // Forged background clicks still cannot cast while inspecting.
    await page.locator('#target-brute').dispatchEvent('click');
    expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before);
    await page.locator('#battle-tab-settings').click(); await page.locator('[data-ui=info-close]').click();
    await expect(page.locator('#battle-info')).toBeFocused();
    await page.locator('#battle-info').click(); await expect(page.locator('#battle-tab-status')).toHaveAttribute('aria-selected', 'true');
    await page.locator('#battle-tab-history').click(); await page.keyboard.press('Escape');
    await expect(page.locator('#battle-info')).toBeFocused();
    if (touch) await page.locator('#battle-info').click(); else await page.keyboard.press('i');
    await expect(page.locator('#battle-panel-status')).toBeVisible();
    expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before);
    await page.keyboard.press('Escape'); await expect(page.locator('#action-bash')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#target-raider').click();
    const skip = page.locator('#skip-turn'); if (await skip.count()) await skip.click({ timeout: 2500 }).catch(() => {});
    await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).run.battle.commands.length, key)).toBe(3);
    await page.locator('#battle-info').click(); await page.locator('#status-unit-weaver').click();
    await expect(page.locator('#status-details [data-status=barrier]')).toHaveCount(0);
    expect(issues).toEqual([]); await context.close();
  });
}
