import { expect, test } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { depart, newProfile } from '../../src/core/world/profile';
import { findTiles, reveal } from '../../src/core/world/world';
import { parseGame } from '../../src/core/save/expedition-save';

const key = 'asterveil.fateweave.expedition.v1';
for (const [width, height, touch] of [[320,568,true], [390,844,true], [1366,768,false]] as const) {
  test(`long expedition summary scrolls while return to camp stays reachable at ${width}x${height}`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const profile = newProfile(map, 123); profile.tutorialDone = true; profile.completes = 1;
    profile.commander = { name: 'อารี', crest: 'star', color: 'gold' };
    const game = depart(profile, map, encounterById, 1234), run = game.run;
    const [goal] = findTiles(map, 'goal'); run.position = { x: goal!.x, y: goal!.y + 1 };
    run.bossDefeated = true; run.elitesDefeated = ['scar-golem']; run.eventsDone = ['scar-rift'];
    run.resources = { ore: 20, gold: 20, ember: 2, seal: 4 };
    run.found = Array.from({ length: 12 }, () => ({ uid: 0, slot: 'body' as const, rarity: 0 as const, level: 3, affixes: [] }));
    for (const member of Object.values(run.members)) { member.level = 6; member.exp = 0; }
    reveal(run, map);
    const raw = JSON.stringify({ version: 21, ...game }); parseGame(raw, map, encounterById);
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
    await page.goto('./'); await page.locator('#continue').click(); await page.locator('#move-up').click();
    await expect(page.locator('#summary-title')).toContainText('สำเร็จการเดินทาง');
    const done = page.locator('#summary-done'), body = page.locator('.summary-body');
    const reachable = () => done.evaluate(el => {
      const r = el.getBoundingClientRect(), a = document.querySelector('#app')!.getBoundingClientRect();
      return r.width >= 44 && r.height >= 44 && r.top >= a.top && r.bottom <= a.bottom && el.contains(document.elementFromPoint(r.x+r.width/2, r.y+r.height/2));
    });
    await expect.poll(reachable).toBe(true);
    await expect.poll(() => body.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    const saved = await page.evaluate(k => localStorage.getItem(k), key);
    await page.screenshot({ path: info.outputPath('summary-top.png') });
    // Exercise browser touch/wheel scrolling, rather than assigning scrollTop.
    if (touch) {
      const bounds = (await body.boundingBox())!, cdp = await context.newCDPSession(page);
      const x = bounds.x+bounds.width/2, y = bounds.y+bounds.height*.8;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 12; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y-bounds.height*.6*step/12 }] });
        await page.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    } else { await body.hover(); await page.mouse.wheel(0, 2400); }
    await expect.poll(() => body.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await body.locator('.summary-levels').scrollIntoViewIfNeeded();
    await expect(body.locator('.summary-levels')).toBeInViewport();
    await body.locator('.summary-quests li').last().scrollIntoViewIfNeeded();
    // Fractional layout/scroll offsets can clip less than one CSS pixel at the end.
    await expect(body.locator('.summary-quests li').last()).toBeInViewport({ ratio: .99 });
    await expect.poll(reachable).toBe(true);
    expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(saved);
    await page.screenshot({ path: info.outputPath('summary-scrolled.png') });
    await done.click(); await expect(page.locator('#summary-view')).toBeHidden();
    await expect(page.locator('#lobby-depart')).toBeVisible(); await expect(page.locator('#lobby-depart')).toBeFocused();
    const settled = parseGame((await page.evaluate(k => localStorage.getItem(k), key))!, map, encounterById);
    expect(settled.run).toBeNull(); expect(settled.profile.completes).toBe(2); expect(settled.profile.items).toHaveLength(12);
    expect(errors).toEqual([]); await context.close();
  });
}
