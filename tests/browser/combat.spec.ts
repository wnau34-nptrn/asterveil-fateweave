import { errors, expect, test, type Page } from '@playwright/test';
import { offensive, defensive, guided } from '../fixtures/party-routes';
async function start(page: Page, beforeStart?: () => Promise<void>): Promise<string[]> {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./'); await expect(page.locator('#game canvas')).toBeVisible();
  if (beforeStart) { await expect(page.locator('#start')).toBeEnabled(); await beforeStart(); }
  await page.locator('#start').click(); return errors;
}
async function choose(page: Page, hero: string, action: string, target: string): Promise<void> {
  await page.locator(`#hero-${hero}`).click(); await page.locator(`#action-${action}`).click(); await page.locator(`#target-${target}`).click();
}
// Target selection already commits. This helper only skips the presentation.
async function finishTurn(page: Page): Promise<void> {
  const skip = page.locator('#skip-turn');
  try { await skip.click({ timeout: 2500 }); }
  catch (error) {
    // Cold rendering/scrolling can outlast the click budget. Retry the actual
    // completion assertion; a still-running turn must fail, not be dismissed.
    if (!(error instanceof errors.TimeoutError)) throw error;
    await expect(skip).toHaveCount(0);
  }
  await expect(page.locator('#beat-status')).not.toContainText('กำลังแสดงผล');
}
async function reachable(page: Page, selector: string): Promise<void> {
  // Rotation dispatches layout/media events after setViewportSize resolves.
  // Measure size, viewport bounds and hit testing together after layout settles.
  const viewport = page.viewportSize()!;
  await expect.poll(() => page.locator(selector).evaluate((el, v) => {
    const r = el.getBoundingClientRect();
    return {
      touchSize: r.width >= 44 && r.height >= 44,
      inViewport: r.x >= 0 && r.y >= 0 && r.right <= v.width && r.bottom <= v.height,
      hit: el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)),
    };
  }, viewport)).toEqual({ touchSize: true, inViewport: true, hit: true });
}

// Center targets as a player scrolling the dock would. Playwright's minimal
// scroll can leave a fractional bottom edge clipped on the smallest viewport.
// Read the current element after media-query rerenders, not a detached old node.
async function targetReachable(page: Page, selector: string): Promise<void> {
  const viewport = page.viewportSize()!;
  await expect.poll(() => page.locator(selector).evaluate((el, v) => {
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    return {
      touchSize: r.width >= 44 && r.height >= 44,
      inViewport: r.x >= 0 && r.y >= 0 && r.right <= v.width && r.bottom <= v.height,
      hit: el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)),
    };
  }, viewport)).toEqual({ touchSize: true, inViewport: true, hit: true });
}

test('Start waits for the production unit atlas before enabling battle input', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-13T00:00:00Z') });
  let release!: () => void;
  let requested = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/art/units.webp', async route => {
    requested = true; await gate; await route.continue();
  });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  try {
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => requested).toBe(true);
    await expect(page.locator('#start')).toBeDisabled();
    await expect(page.locator('#start')).toContainText('กำลังเตรียมสนาม');
    await expect(page.locator('#hero-tracer')).toBeDisabled();
    release();
    await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
    await expect(page.locator('#hero-tracer')).toBeEnabled();
    // Asset gating and committing are the contract here; cold rendering must
    // not race the one-second hero stage before its assertion can run.
    await page.clock.pauseAt(new Date('2026-10-13T01:00:00Z'));
    await page.locator('#target-raider').click();
    await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase', 'hero');
    await expect(page.locator('dialog[open]')).toHaveCount(0); await finishTurn(page); expect(errors).toEqual([]);
  } finally { release(); }
});

test('normal turns show hero damage first, then the frozen enemy response', async ({ page }, info) => {
  await page.clock.install({ time: new Date('2026-10-13T00:00:00Z') });
  await page.emulateMedia({ reducedMotion: 'no-preference' }); const errors = await start(page);
  await page.clock.pauseAt(new Date('2026-10-13T01:00:00Z'));
  await choose(page, 'weaver', 'bolt', 'brute');
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase', 'hero');
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-actor', 'weaver');
  await expect(page.locator('[data-enemy="brute"]')).toContainText('138 / 164');
  await expect(page.locator('#hero-tracer')).toContainText('56 / 56');
  await expect(page.locator('#hero-weaver')).toHaveClass(/active-actor/);
  await expect(page.locator('#event-log')).not.toContainText('เทิร์นศัตรู');
  await expect(page.locator('#hero-guardian')).toBeDisabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.battle.v1')!).commands.length)).toBe(1);
  await page.clock.runFor(200);
  await page.screenshot({ path: info.outputPath('hero-turn.png'), fullPage: true });
  await page.clock.runFor(1000);
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase', 'enemy');
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-actor', 'raider');
  await expect(page.locator('#hero-tracer')).toContainText('44 / 56');
  await expect(page.locator('[data-enemy="raider"]')).toHaveClass(/active-actor/);
  await expect(page.locator('#intent')).toContainText('นักจู่โจม');
  await expect(page.locator('#event-log')).toContainText('เทิร์นศัตรู');
  await page.screenshot({ path: info.outputPath('enemy-turn.png'), fullPage: true });
  await page.clock.runFor(1000);
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase', 'choice');
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 2');
  expect(errors).toEqual([]);
});

test('phone reduced-motion turns show interrupted response and accurate canvas input after scrolling', async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage(); await page.clock.install({ time: new Date('2026-10-13T00:00:00Z') }); const errors = await start(page);
  await page.clock.pauseAt(new Date('2026-10-13T01:00:00Z'));
  await choose(page, 'guardian', 'bash', 'raider');
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase', 'hero');
  await expect(page.locator('[data-enemy="raider"]')).toContainText('46 / 64');
  await expect(page.locator('#hero-tracer')).toContainText('56 / 56');
  await reachable(page, '#skip-turn');
  expect(await page.locator('#game canvas').evaluate(el => {
    const canvas = el.getBoundingClientRect();
    const banner = document.querySelector('#turn-phase')!.getBoundingClientRect();
    return canvas.top >= banner.bottom && canvas.bottom <= window.innerHeight;
  })).toBe(true);
  await page.clock.runFor(1000);
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase', 'enemy');
  await expect(page.locator('#turn-phase')).toContainText('เทิร์นศัตรูถูกหยุด');
  await expect(page.locator('.enemy-card.active-actor')).toHaveCount(0);
  await expect(page.locator('#hero-tracer')).toContainText('56 / 56');
  await page.screenshot({ path: info.outputPath('interrupted-turn.png') });
  await page.locator('#skip-turn').tap(); await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase', 'choice');
  await page.clock.resume();
  const canvas = page.locator('#game canvas'); await canvas.scrollIntoViewIfNeeded();
  const b = (await canvas.boundingBox())!;
  await canvas.tap({ position: { x: b.width * .18, y: b.height * .77 - 45 } });
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]); await context.close();
});

test('skip, restart, mid-turn reload and hidden-tab completion never replay a command', async ({ page }) => {
  const errors = await start(page);
  await choose(page, 'weaver', 'bolt', 'brute');
  await page.locator('#restart').click();
  await page.waitForTimeout(2100);
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  await expect(page.locator('[data-enemy="brute"]')).toContainText('164 / 164');
  await choose(page, 'weaver', 'ward', 'tracer');
  await expect(page.locator('#hero-tracer .barrier-info')).toHaveText('โล่ 14');
  await page.reload();
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase', 'choice');
  await expect(page.locator('#hero-tracer .barrier-info')).toHaveText('โล่ 2');
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 2');
  await choose(page, 'guardian', 'guard', 'weaver');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    Reflect.deleteProperty(document, 'hidden');
  });
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase', 'choice');
  await expect(page.locator('#hero-guardian')).toContainText('66 / 76');
  await page.waitForTimeout(2100);
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 3');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.battle.v1')!).commands.length)).toBe(2);
  expect(errors).toEqual([]);
});

test('victory waits for turn presentation and the defeated enemy never attacks', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-13T00:00:00Z') }); const errors = await start(page);
  await page.evaluate(moves => localStorage.setItem('asterveil.fateweave.battle.v1', JSON.stringify({
    version: 1, encounterId: 'veil-siege', contentVersion: 3,
    commands: moves.map(([heroId, action, targetId], i) => ({ beat: i + 1, heroId, action, targetId })),
  })), offensive.slice(0, -1));
  await page.reload();
  await page.clock.pauseAt(new Date('2026-10-13T01:00:00Z'));
  await choose(page, 'tracer', 'execute', 'raider');
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase', 'hero');
  await expect(page.locator('.result-card')).toHaveCount(0);
  await page.clock.runFor(1000);
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase', 'enemy');
  await expect(page.locator('#turn-phase')).toContainText('ถูกหยุด');
  await expect(page.locator('.result-card')).toHaveCount(0);
  await page.locator('#skip-turn').click();
  await expect(page.locator('.result-card')).toContainText('ยืนอยู่ 4 / 4 คน');
  await expect(page.locator('.result-card')).toContainText('เลือดทีม 134');
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 1366, height: 1000 }, { width: 390, height: 844 }]) {
  test(`auto-select next hero at ${viewport.width}px, wrap, free selection and reload`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors = await start(page);
    await page.locator('#hero-guardian').tap();
    await page.locator('#action-bash').tap(); await page.locator('#action-attack').tap();
    await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
    await expect(page.locator('#hero-guardian')).toHaveAttribute('aria-pressed', 'true');
    const turns = [
      ['guardian', 'tracer', 'นักดาบ', 'execute'], ['tracer', 'weaver', 'จอมเวท', 'bolt'],
      ['weaver', 'healer', 'นักบวช', 'heal'], ['healer', 'guardian', 'อัศวิน', 'guard'],
    ];
    for (const [actor, next, role, skill] of turns) {
      await expect(page.locator(`#hero-${actor}`)).toHaveAttribute('aria-pressed', 'true');
      await page.locator('#target-brute').tap(); await finishTurn(page);
      await expect(page.locator(`#hero-${next}`)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#selected-hero')).toContainText(role!);
      await expect(page.locator(`#action-${skill}`)).toBeVisible();
      await expect(page.locator('#action-attack')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.hero-slot .portrait')).toHaveAttribute('data-actor', next!);
      await expect(page.locator('dialog[open]')).toHaveCount(0);
      if (next === 'healer') {
        await page.reload(); await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('#beat-status')).toContainText('จังหวะ 4');
      }
    }
    await page.screenshot({ path: info.outputPath('next-hero.png'), fullPage: true });
    await page.locator('#hero-weaver').tap();
    await expect(page.locator('#hero-weaver')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#restart').click();
    await expect(page.locator('#hero-tracer')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
    expect(errors).toEqual([]); await context.close();
  });
}

test('auto-selection skips fallen heroes after commit and saved reload', async ({ page }) => {
  test.setTimeout(60000);
  const errors = await start(page);
  await page.evaluate(() => localStorage.setItem('asterveil.fateweave.battle.v1', JSON.stringify({
    version: 1, encounterId: 'veil-siege', contentVersion: 3,
    commands: Array.from({ length: 6 }, (_, i) => ({ beat: i + 1, heroId: 'guardian', action: 'attack', targetId: 'brute' })),
  })));
  await page.reload();
  await expect(page.locator('#hero-weaver')).toBeDisabled();
  await expect(page.locator('#hero-tracer')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#target-brute').click(); await finishTurn(page);
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  for (const next of ['guardian', 'tracer', 'healer', 'guardian', 'healer', 'healer']) {
    await page.locator('#target-brute').click(); await finishTurn(page);
    await expect(page.locator(`#hero-${next}`)).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.locator('#hero-tracer')).toBeDisabled();
  await expect(page.locator('#hero-guardian')).toBeDisabled();
  await page.reload();
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#target-brute').click(); await finishTurn(page);
  await expect(page.getByRole('heading', { name: 'แพ้แล้ว', exact: true })).toBeVisible();
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('four classes, 2 front/2 back, three owned commands each, and no Crystal interface', async ({ page }, info) => {
  const errors = await start(page);
  await expect(page.locator('.hero-card')).toHaveCount(4);
  await expect(page.locator('.hero-card[data-lane="front"]')).toHaveCount(2);
  await expect(page.locator('.hero-card[data-lane="back"]')).toHaveCount(2);
  await expect(page.locator('body')).not.toContainText('ผลึก');
  await expect(page.locator('body')).not.toContainText('แต้มเบี่ยงพลัง');
  const classes = [['guardian','อัศวิน','bash'],['tracer','นักดาบ','execute'],['weaver','จอมเวท','ward'],['healer','นักบวช','prayer']];
  for (const [id, role, skill] of classes) {
    await page.locator(`#hero-${id}`).click(); await expect(page.locator('#selected-hero')).toContainText(role!);
    await expect(page.locator('.actions button')).toHaveCount(3); await expect(page.locator(`#action-${skill}`)).toBeVisible();
  }
  await page.locator('#action-heal').click(); await expect(page.locator('#target-guardian')).toBeDisabled();
  await expect(page.locator('#commands')).toContainText('เลือดเต็มแล้ว');
  await page.locator('#hero-guardian').click(); await page.screenshot({ path: info.outputPath('four-class-desktop.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('modern phone HUD keeps enemy HP and every class skill status in sync', async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage(); const errors = await start(page);
  await expect(page.locator('#hero-healer [data-skill="heal"]')).toContainText('เลือดเต็ม');
  const cards = await page.locator('.hero-card').evaluateAll(elements => elements.map(el => {
    const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width };
  }));
  expect(cards[0]!.y).toBe(cards[1]!.y); expect(cards[0]!.x).toBeLessThan(cards[1]!.x);
  expect(cards[2]!.y).toBeGreaterThan(cards[0]!.y); expect(cards[2]!.x).toBe(cards[0]!.x);
  await expect.poll(() => page.locator('.hero-card .portrait img').evaluateAll(images => images.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth === 1024))).toBe(true);
  const arena = (await page.locator('.arena').boundingBox())!;
  const intent = (await page.locator('#intent').boundingBox())!;
  expect(intent.y).toBeGreaterThanOrEqual(arena.y + arena.height);
  expect(cards[0]!.y).toBeGreaterThan(intent.y);
  await choose(page, 'weaver', 'bolt', 'brute'); await finishTurn(page);
  await expect(page.locator('[data-enemy="brute"]')).toContainText('138 / 164');
  await expect(page.locator('#hero-weaver [data-skill="bolt"]')).toContainText('รอ 2 จังหวะ');
  await expect(page.locator('#hero-healer [data-skill="heal"]')).toContainText('พร้อมใช้');
  await expect(page.locator('#hero-tracer')).toContainText('44 / 56');
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  await choose(page, 'weaver', 'ward', 'guardian'); await finishTurn(page);
  await expect(page.locator('#hero-guardian .barrier-info')).toHaveText('โล่ 14');
  expect(await page.locator('#hero-guardian .barrier-info').evaluate(el => {
    const r = el.getBoundingClientRect(); const card = el.closest('.hero-card')!.getBoundingClientRect();
    return r.x >= card.x && r.right <= card.right && r.bottom <= card.bottom;
  })).toBe(true);
  await page.locator('#hero-weaver').tap();
  await expect(page.locator('#action-bolt')).toBeDisabled();
  await page.locator('#battle-info').tap();
  await expect(page.locator('#formation-info')).toBeVisible();
  await page.locator('[data-ui=info-close]').tap();
  await page.screenshot({ path: info.outputPath('modern-hud-cooldown.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]); await context.close();
});

test('canvas target executes Guard once; keyboard target works with no modal or extra confirmation', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); const errors = await start(page);
  const canvas = page.locator('#game canvas'); const b = (await canvas.boundingBox())!;
  await canvas.click({ position: { x:b.width*.35, y:b.height*.59-70 } });
  await expect(page.locator('#hero-guardian')).toHaveAttribute('aria-pressed','true');
  await page.locator('#action-guard').click();
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  await expect(page.locator('#target-weaver')).toBeDisabled();
  let targetPoint: {x:number;y:number} | null = null;
  await expect.poll(async()=>{
    // Scrolling can refresh field controls between protocol calls. Resolve
    // readiness, the current rectangle and real hit testing in one DOM read.
    targetPoint = await page.locator('#target-tracer').evaluate(el=>{
      if (!(el instanceof HTMLButtonElement) || !el.isConnected || el.disabled) return null;
      const r=el.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
      return r.width>=44 && r.height>=44 && x>=0 && y>=0 && x<=innerWidth && y<=innerHeight && el.contains(document.elementFromPoint(x,y)) ? {x,y} : null;
    });
    return !!targetPoint;
  }).toBe(true);
  await page.mouse.click(targetPoint!.x, targetPoint!.y);
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase','hero');
  await expect(page.locator('dialog[open], #confirm, #preview')).toHaveCount(0);
  // A second queued click on the newly disabled target cannot issue another command.
  await page.locator('#target-tracer').evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.battle.v1')!).commands.length)).toBe(1);
  await finishTurn(page); await expect(page.locator('#hero-guardian')).toContainText('71 / 76');
  await expect.poll(()=>page.locator('#battle-coach').evaluate(el=>{
    const r=el.getBoundingClientRect(), phase=document.querySelector('#turn-phase')!.getBoundingClientRect();
    return r.top>=phase.bottom && !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#battle-coach');
  })).toBe(true);
  await page.screenshot({path:info.outputPath('desktop-coach-after-cast.png')});
  await expect(page.locator('#event-log')).toContainText('เอกิส เสียเลือด 5');
  await expect(page.locator('.next-slot')).toHaveAttribute('aria-label','จังหวะ 2 อสูรรอยแยก โจมตีไอรา พลังโจมตี 28');
  await page.reload(); await expect(page.locator('#start')).toHaveCount(0);
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 2');
  await page.locator('#target-brute').focus(); await page.keyboard.press('Enter'); await finishTurn(page);
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 3');
  await page.locator('#restart').click(); await expect(page.locator('#hero-healer')).toContainText('46 / 46');
  expect(errors).toEqual([]);
});

test('Mage cooldown survives reload and becomes ready on its exact beat', async ({ page }) => {
  const errors = await start(page); await choose(page,'weaver','bolt','brute'); await finishTurn(page);
  await page.locator('#hero-weaver').click(); await expect(page.locator('#action-bolt')).toBeDisabled();
  await expect(page.locator('#reason-bolt')).toContainText('พร้อมใน 2 จังหวะ');
  await page.reload(); await page.locator('#hero-weaver').click();
  await expect(page.locator('#reason-bolt')).toContainText('พร้อมใน 2 จังหวะ');
  await choose(page,'guardian','guard','weaver'); await finishTurn(page);
  await page.locator('#hero-weaver').click(); await expect(page.locator('#reason-bolt')).toContainText('พร้อมใน 1 จังหวะ');
  await choose(page,'healer','heal','tracer'); await finishTurn(page);
  await page.locator('#hero-weaver').click(); await expect(page.locator('#action-bolt')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('Ward, Heal and Prayer execute immediately with real stage effects', async ({ page }, info) => {
  const errors = await start(page);
  await choose(page,'weaver','ward','tracer');
  await expect(page.locator('#hero-tracer .barrier-info')).toHaveText('โล่ 14'); await finishTurn(page);
  await expect(page.locator('#event-log')).toContainText('โล่รับไว้ 12');
  await expect(page.locator('#hero-tracer .barrier-info')).toHaveText('โล่ 2');
  await choose(page,'guardian','guard','weaver'); await finishTurn(page);
  await choose(page,'healer','heal','guardian');
  await expect(page.locator('#hero-guardian')).toContainText('76 / 76'); await finishTurn(page);
  await expect(page.locator('#event-log')).toContainText('เอกิส ฟื้นเลือด 10');
  await expect(page.locator('#hero-guardian')).toContainText('64 / 76');
  await choose(page,'weaver','ward','tracer'); await finishTurn(page);
  await choose(page,'healer','prayer','party'); await finishTurn(page);
  await expect(page.locator('#event-log')).toContainText('ไลรา ฟื้นเลือด 10');
  await expect(page.locator('#hero-tracer')).toContainText('54 / 56');
  await page.screenshot({path:info.outputPath('healer-party-result.png'),fullPage:true});
  expect(errors).toEqual([]);
});

for (const [name,moves,hp] of [['offensive',offensive,134],['defensive',defensive,94]] as const) {
  test(`four-class ${name} route wins with all four standing`, async ({ page }, info) => {
    test.setTimeout(90000); const errors = await start(page);
    for (const [hero,action,target] of moves) { await choose(page,hero,action,target); await finishTurn(page); }
    await expect(page.getByRole('heading',{name:'ชนะแล้ว',exact:true})).toBeVisible();
    await expect(page.locator('#start-screen')).toContainText('ยืนอยู่ 4 / 4 คน');
    await expect(page.locator('#start-screen')).toContainText(`เลือดทีม ${hp}`);
    await expect(page.locator('#hero-tracer')).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({path:info.outputPath(`${name}-victory.png`),fullPage:true});
    expect(errors).toEqual([]);
  });
}
for (const first of ['raider','brute']) {
  test(`basic attack spam against ${first} still loses`, async ({ page }) => {
    const errors = await start(page);
    for (let i=0;i<30;i++) {
      if (await page.getByRole('heading',{name:'แพ้แล้ว',exact:true}).count()) break;
      let hero='healer'; for(const id of ['tracer','weaver','guardian','healer']) if(await page.locator(`#hero-${id}`).isEnabled()){hero=id;break;}
      await page.locator(`#hero-${hero}`).click(); await page.locator('#action-attack').click();
      const second=first==='raider'?'brute':'raider'; const target=await page.locator(`#target-${first}`).isEnabled()?first:second;
      await page.locator(`#target-${target}`).click(); await finishTurn(page);
    }
    await expect(page.getByRole('heading',{name:'แพ้แล้ว',exact:true})).toBeVisible(); expect(errors).toEqual([]);
  });
}
for(const viewport of [{width:320,height:568},{width:390,height:844},{width:600,height:800},{width:844,height:390}]){
  test(`mobile ${viewport.width}x${viewport.height}: direct touch casts, optional help and reachable targets`,async({browser},info)=>{
    const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage(); const errors=await start(page);
    await expect(page.locator('.hero-card')).toHaveCount(4);
    await page.locator('#hero-guardian').tap(); await page.locator('#action-bash').tap();
    const portrait = viewport.width <= 600 && viewport.height > viewport.width;
    await page.locator('#battle-info').tap(); await expect(page.locator('#info-skill')).toContainText('หยุดการโจมตีกายภาพ');
    await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
    await page.locator('[data-ui=info-close]').tap(); await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
    const member=(await page.locator('#hero-healer').boundingBox())!; expect(member.width).toBeGreaterThanOrEqual(44);expect(member.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({path:info.outputPath('mobile-four-jobs.png'),fullPage:true});
    expect(await page.evaluate(() => {const save=localStorage.getItem('asterveil.fateweave.battle.v1'); return save?JSON.parse(save).commands.length:0;})).toBe(0);
    if (portrait) await reachable(page,'#target-raider'); else await targetReachable(page,'#target-raider');
    await page.locator('#target-raider').tap();
    await expect(page.locator('dialog[open], #confirm, #preview')).toHaveCount(0);
    await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase','hero'); await finishTurn(page);
    await expect(page.locator('#event-log')).toContainText('กระแทกโล่หยุด');
    await page.locator('#hero-guardian').tap(); await expect(page.locator('#action-bash')).toBeDisabled();
    await page.locator('#hero-weaver').tap(); await page.locator('#action-ward').tap();
    if (portrait) await reachable(page,'#target-weaver'); else await targetReachable(page,'#target-weaver');
    await page.locator('#target-weaver').tap(); await finishTurn(page);
    await expect(page.locator('#hero-weaver')).toContainText('34 / 48');
    await page.locator('.command-dock').scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('mobile-direct-result.png'),fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    expect(errors).toEqual([]); await context.close();
  });
}

test('four-class mobile battle, back-row canvas selection and rotation preserve an uncast skill',async({browser},info)=>{
  test.setTimeout(90000);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=await start(page);
  const canvas=page.locator('#game canvas');const b=(await canvas.boundingBox())!;
  await canvas.tap({position:{x:b.width*.18,y:b.height*.77-45}});
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed','true');
  await page.locator('#hero-tracer').tap(); await page.locator('#action-mark').tap();
  for (const viewport of [{width:844,height:390},{width:1366,height:900},{width:390,height:844}]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('#action-mark')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  }
  await targetReachable(page,'#target-brute');
  await page.locator('#target-brute').tap(); await finishTurn(page);
  for(const[hero,action,target]of offensive.slice(1)){await choose(page,hero,action,target);await finishTurn(page);}
  await expect(page.locator('#start-screen')).toContainText('ยืนอยู่ 4 / 4 คน');
  await reachable(page,'.result-card button');await page.screenshot({path:info.outputPath('mobile-four-survivors.png')});
  await page.locator('.result-card button').tap();await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  expect(errors).toEqual([]);await context.close();
});

test('old three-member saves restart safely, and denied storage stays playable',async({page})=>{
  await page.addInitScript(()=>{try{localStorage.setItem('asterveil.fateweave.battle.v1',JSON.stringify({version:1,encounterId:'crystal-rift',contentVersion:2,commands:[{beat:1,heroId:'tracer',action:'mark',targetId:'brute'}]}));}catch{/* The denied-storage variant may run its init script first. */}});
  const errors=await start(page);await expect(page.locator('.hero-card')).toHaveCount(4);await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get:()=>{throw new Error('Denied');}}));
  await page.reload();await page.locator('#start').click();await choose(page,'guardian','guard','tracer');await finishTurn(page);
  await expect(page.locator('#save-status')).toContainText('บันทึกบนเครื่องนี้ไม่ได้');expect(errors).toEqual([]);
});

for (const viewport of [{ width:320,height:568 }, { width:390,height:640 }, { width:390,height:844 }, { width:600,height:800 }]) {
  test(`portrait ${viewport.width}x${viewport.height}: complete battle controls fit without page scrolling`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport, isMobile:true, hasTouch:true, reducedMotion:'reduce' });
    const page = await context.newPage(); const errors = await start(page, async () => {
      await reachable(page,'#start');
      expect(await page.locator('#start').evaluate(el => {const r=el.getBoundingClientRect(), a=document.querySelector('.arena')!.getBoundingClientRect(); return r.top>=a.top && r.bottom<=a.bottom;})).toBe(true);
    });
    const fits = async () => {
      expect(await page.evaluate(() => ({x:scrollX,y:scrollY,overflow:document.documentElement.scrollHeight>innerHeight+1 || document.documentElement.scrollWidth>innerWidth}))).toEqual({x:0,y:0,overflow:false});
      for (const id of ['guardian','tracer','weaver','healer']) await reachable(page,`#hero-${id}`);
      for (const selector of ['#battle-info','#restart','#action-attack']) await reachable(page,selector);
      const field = await page.locator('#game canvas').boundingBox();
      expect(field!.height).toBeGreaterThanOrEqual(120);
      await expect.poll(()=>page.locator('#game canvas').evaluate(el=>{
        const r=el.getBoundingClientRect(), a=document.querySelector('.arena')!.getBoundingClientRect();
        return r.top>=a.top && r.bottom<=a.bottom+1;
      })).toBe(true);
    };
    await fits();
    await reachable(page, '#coach-dismiss');
    expect(await page.locator('#coach-copy').evaluate(el => {
      const r = el.getBoundingClientRect(), box = document.querySelector('#battle-coach')!.getBoundingClientRect();
      return r.top >= box.top && r.bottom <= box.bottom && el.scrollWidth <= el.clientWidth;
    })).toBe(true);
    // Four ally targets, barrier text and unavailable healing cannot grow the dock.
    await page.locator('#hero-weaver').tap(); await page.locator('#action-ward').tap();
    for (const id of ['guardian','tracer','weaver','healer']) await reachable(page,`#target-${id}`);
    // Feet belong to the courtyard; staggered rows keep each face/tap area
    // separate even when the narrow field shrinks the illustrated bodies.
    const field = (await page.locator('#game canvas').boundingBox())!;
    const actors = await page.locator('#field-targets button').evaluateAll(els => els.map(el => {
      const r = el.getBoundingClientRect();
      return { id: el.getAttribute('data-actor'), x: r.x, y: r.y, right: r.right, bottom: r.bottom };
    }));
    for (const actor of actors) {
      expect(actor.bottom).toBeGreaterThan(field.y + field.height * .4);
      expect(actor.bottom).toBeLessThan(field.y + field.height);
      for (const other of actors.filter(a => a.id !== actor.id)) {
        expect(actor.right <= other.x || other.right <= actor.x || actor.bottom <= other.y || other.bottom <= actor.y).toBe(true);
      }
    }
    for (const [back, front] of [['weaver','guardian'], ['healer','tracer']]) {
      const a = actors.find(actor => actor.id === back)!; const b = actors.find(actor => actor.id === front)!;
      expect(b.x).toBeGreaterThan(a.x); expect(b.bottom).toBeGreaterThan(a.bottom);
    }
    await page.locator('#target-weaver').tap(); await reachable(page,'#skip-turn'); await finishTurn(page);
    await fits(); await page.locator('#hero-healer').tap(); await page.locator('#action-heal').tap();
    for (const id of ['guardian','tracer','weaver','healer']) await reachable(page,`#target-${id}`);
    await page.screenshot({path:info.outputPath('single-screen.png')});
    // Reading optional information changes no command and returns to the same screen.
    await page.locator('#battle-info').tap(); await expect(page.locator('#game-info')).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.locator('dialog[open]')).toHaveCount(0);
    await fits();
    await page.evaluate(() => window.scrollTo(0,1000)); await page.mouse.wheel(0,1000); await fits();
    if (viewport.height === 640) {
      await page.addStyleTag({content:'#app { padding-top:20px; padding-bottom:34px; }'});
      await page.setViewportSize({width:390,height:700}); await fits();
      await page.setViewportSize(viewport); await fits();
      await page.locator('#target-tracer').tap(); await finishTurn(page); await fits();
    }
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('asterveil.fateweave.battle.v1')!).commands.length)).toBe(viewport.height === 640 ? 2 : 1);
    if (viewport.height === 640) {
      await page.evaluate(() => localStorage.setItem('asterveil.fateweave.battle.v1', JSON.stringify({version:1,encounterId:'veil-siege',contentVersion:3,commands:Array.from({length:6},(_,i)=>({beat:i+1,heroId:'guardian',action:'attack',targetId:'brute'}))})));
      await page.reload(); await expect(page.locator('#hero-weaver')).toBeDisabled(); await fits();
    }
    expect(errors).toEqual([]); await context.close();
  });
}

test('touch targets sit on the actors; invalid healing does not change hero and Prayer casts through any living ally', async ({ browser }, info) => {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=await start(page);
  await expect(page.locator('#commands [data-ui=target]')).toHaveCount(0);
  await page.locator('#hero-weaver').tap();await page.locator('#action-bolt').tap();
  const field=page.locator('#game canvas');const b=(await field.boundingBox())!;
  await expect(page.locator('#target-brute')).toHaveClass(/valid-target/);
  await reachable(page,'#target-brute');
  const rect=(await page.locator('#target-brute').boundingBox())!;
  expect(rect.x).toBeGreaterThanOrEqual(b.x);expect(rect.y).toBeGreaterThanOrEqual(b.y);
  expect(rect.x+rect.width).toBeLessThanOrEqual(b.x+b.width);expect(rect.y+rect.height).toBeLessThanOrEqual(b.y+b.height);
  await page.screenshot({path:info.outputPath('field-enemy-targets.png')});
  await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);await finishTurn(page);
  await page.locator('#hero-healer').tap();await page.locator('#action-heal').tap();
  await expect(page.locator('#target-guardian')).toBeDisabled();
  await page.locator('#target-guardian').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#action-heal')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#target-tracer')).toHaveClass(/valid-target/);
  await page.locator('#target-tracer').tap();await finishTurn(page);
  await page.locator('#hero-healer').tap();await page.locator('#action-prayer').tap();
  await page.screenshot({path:info.outputPath('field-party-targets.png')});
  await page.locator('#target-party-guardian').tap();await finishTurn(page);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('asterveil.fateweave.battle.v1')!).commands.map((c:{targetId:string})=>c.targetId))).toEqual(['brute','tracer','party']);
  expect(await page.evaluate(()=>({x:scrollX,y:scrollY}))).toEqual({x:0,y:0});
  expect(errors).toEqual([]);await context.close();
});

test('three-turn coach teaches Guard and same-target Mark, survives reload and leads to a four-hero victory', async ({ browser }, info) => {
  test.setTimeout(90000);
  const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page = await context.newPage(); await page.clock.install({time:new Date('2026-10-13T00:00:00Z')});
  const errors = await start(page); await page.clock.pauseAt(new Date('2026-10-13T01:00:00Z'));
  await expect(page.locator('#battle-coach')).toHaveAttribute('data-lesson','1');
  await expect(page.locator('#coach-copy')).toContainText('12 → 5');
  await expect(page.locator('#intent, #hero-guardian')).toHaveClass([/coach-focus/, /coach-focus/]);
  await expect(page.locator('#hero-tracer')).toHaveAttribute('aria-pressed','true');
  await page.locator('#hero-guardian').tap(); await expect(page.locator('#action-guard')).toHaveClass(/coach-focus/);
  await page.locator('#action-guard').tap(); await expect(page.locator('#target-tracer')).toHaveClass(/coach-focus/);
  await page.screenshot({path:info.outputPath('coach-guard.png')});
  await page.locator('#target-tracer').tap();
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase','hero');
  await expect(page.locator('#coach-copy')).toContainText('ลดความเสียหาย 65%');
  await expect(page.locator('#hero-guardian')).toContainText('76 / 76');
  await page.clock.runFor(1000);
  await expect(page.locator('#coach-copy')).toContainText('เสียเลือด 5');
  await expect(page.locator('#coach-copy')).toContainText('รับแทนไลรา');
  await expect(page.locator('#hero-guardian')).toContainText('71 / 76');
  await expect(page.locator('#hero-tracer')).toContainText('56 / 56');
  await finishTurn(page); await page.clock.resume(); await page.reload();
  await expect(page.locator('#battle-coach')).toHaveAttribute('data-lesson','2');
  await expect(page.locator('#hero-tracer')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#action-mark')).toHaveClass(/coach-focus/);
  await page.locator('#action-mark').tap(); await expect(page.locator('#target-brute')).toHaveClass(/coach-focus/);
  await page.screenshot({path:info.outputPath('coach-mark.png')});
  await page.locator('#target-brute').tap();
  await expect(page.locator('#coach-copy')).toContainText('ครั้งถัดไป +22');
  await expect(page.locator('[data-enemy="brute"]')).toContainText('164 / 164');
  await finishTurn(page);
  await expect(page.locator('#battle-coach')).toHaveAttribute('data-lesson','3');
  await expect(page.locator('#coach-copy')).toContainText('28 + 22 = 50');
  await expect(page.locator('#hero-weaver')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#hero-tracer')).toHaveClass(/coach-focus/);
  await page.locator('#hero-tracer').tap(); await expect(page.locator('#action-execute')).toHaveClass(/coach-focus/);
  await page.locator('#action-execute').tap(); await expect(page.locator('#target-brute')).toHaveClass(/coach-focus/);
  await page.screenshot({path:info.outputPath('coach-combo.png')});
  await page.locator('#target-brute').tap(); await finishTurn(page);
  await expect(page.locator('#battle-coach')).toBeHidden();
  await expect(page.locator('.coach-focus')).toHaveCount(0);
  await expect(page.locator('[data-enemy="brute"]')).toContainText('114 / 164');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('asterveil.fateweave.battle.v1')!).commands.length)).toBe(3);
  for(const [hero,action,target] of guided.slice(3)){await choose(page,hero,action,target);await finishTurn(page);}
  await expect(page.getByRole('heading',{name:'ชนะแล้ว',exact:true})).toBeVisible();
  await expect(page.locator('#start-screen')).toContainText('ยืนอยู่ 4 / 4 คน');
  await expect(page.locator('#start-screen')).toContainText('เลือดทีม 117');
  await page.screenshot({path:info.outputPath('guided-victory.png')});
  expect(errors).toEqual([]); await context.close();
});

test('coach dismissal persists without issuing a command; advice can be reopened and other plans stay playable', async ({ browser }, info) => {
  const context = await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page = await context.newPage(); const errors = await start(page);
  await reachable(page,'#coach-dismiss');
  await page.screenshot({path:info.outputPath('coach-narrow.png')});
  await page.locator('#coach-dismiss').tap(); await page.waitForTimeout(350);
  await expect(page.locator('#battle-coach')).toBeHidden(); await expect(page.locator('.coach-focus')).toHaveCount(0);
  expect(await page.evaluate(()=>localStorage.getItem('asterveil.fateweave.battle.v1'))).toBeNull();
  await page.reload(); await page.locator('#start').tap(); await expect(page.locator('#battle-coach')).toBeHidden();
  await page.locator('#battle-info').tap(); await page.locator('#coach-toggle').tap();
  await expect(page.locator('#coach-toggle')).toHaveAttribute('aria-pressed','true');
  await page.waitForTimeout(100); await expect(page.locator('#coach-toggle')).toBeFocused();
  await page.locator('[data-ui=info-close]').tap(); await page.waitForTimeout(300);
  await expect(page.locator('#battle-coach')).toHaveAttribute('data-lesson','1');
  // Ignore Guard and mark a different enemy: the advice follows that real mark.
  await choose(page,'tracer','mark','raider'); await finishTurn(page);
  await expect(page.locator('#coach-copy')).toContainText('ฟันเจาะจุด → นักจู่โจม');
  await expect(page.locator('#coach-copy')).toContainText('28 + 22 = 50');
  await choose(page,'tracer','execute','raider'); await finishTurn(page);
  await expect(page.locator('#coach-copy')).toContainText('แล้วไลราตีเป้าเดิม');
  await expect(page.locator('#coach-copy')).not.toContainText('= 50');
  await choose(page,'healer','heal','tracer'); await finishTurn(page);
  await expect(page.locator('#hero-tracer')).toContainText('56 / 56');
  await expect(page.locator('#battle-coach')).toBeHidden();
  expect(await page.evaluate(()=>({x:scrollX,y:scrollY,overflow:document.documentElement.scrollHeight>innerHeight+1}))).toEqual({x:0,y:0,overflow:false});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('asterveil.fateweave.battle.v1')!).commands.map((c:{action:string})=>c.action))).toEqual(['mark','execute','heal']);
  expect(errors).toEqual([]); await context.close();
});

test('saved coach uses a ready attack when Precision Strike is cooling, and never claims an unmarked bonus', async ({ page }, info) => {
  const errors = await start(page);
  await page.evaluate(()=>localStorage.setItem('asterveil.fateweave.battle.v1',JSON.stringify({version:1,encounterId:'veil-siege',contentVersion:3,commands:[
    {beat:1,heroId:'tracer',action:'execute',targetId:'brute'}, {beat:2,heroId:'tracer',action:'mark',targetId:'raider'},
  ]})));
  await page.reload(); await expect(page.locator('#battle-coach')).toHaveAttribute('data-lesson','3');
  await expect(page.locator('#coach-copy')).toContainText('โจมตี → นักจู่โจม');
  await expect(page.locator('#coach-copy')).toContainText('16 + 22 = 38');
  await page.locator('#hero-tracer').click(); await expect(page.locator('#action-execute')).toBeDisabled();
  await expect(page.locator('#target-raider')).toHaveClass(/coach-focus/);
  await page.locator('#target-raider').click(); await finishTurn(page);
  await expect(page.locator('[data-enemy="raider"]')).toContainText('26 / 64');
  await expect(page.locator('#battle-coach')).toBeHidden();
  await page.locator('#restart').click();
  await expect(page.locator('#battle-coach')).toHaveAttribute('data-lesson','1');
  await choose(page,'guardian','attack','brute'); await finishTurn(page);
  await choose(page,'guardian','attack','brute'); await finishTurn(page);
  await expect(page.locator('#coach-copy')).toContainText('ติดตรา → อสูรรอยแยก');
  await expect(page.locator('#coach-copy')).not.toContainText('= 50');
  await page.screenshot({path:info.outputPath('coach-unmarked.png'),fullPage:true});
  await choose(page,'tracer','mark','brute'); await finishTurn(page);
  await expect(page.locator('[data-enemy="brute"]')).toContainText('ติดตรา');
  await expect(page.locator('#battle-coach')).toBeHidden();
  expect(errors).toEqual([]);
});

for (const viewport of [{width:1920,height:1080},{width:1366,height:768},{width:1280,height:720},{width:1366,height:640},{width:1024,height:768},{width:768,height:1024},{width:844,height:390}]) {
  test(`single-screen ${viewport.width}x${viewport.height}: field, party and commands remain reachable throughout combat`, async ({browser},info) => {
    const context=await browser.newContext({viewport,reducedMotion:'reduce'});
    const page=await context.newPage(); const errors=await start(page);
    const fits=async()=>{
      expect(await page.evaluate(()=>({x:scrollX,y:scrollY,overflow:document.documentElement.scrollHeight>innerHeight}))).toEqual({x:0,y:0,overflow:false});
      for(const selector of ['#battle-info','#restart','#hero-guardian','#hero-tracer','#hero-weaver','#hero-healer','#action-attack']) await reachable(page,selector);
      await expect.poll(()=>page.locator('#game canvas').evaluate(el=>{
        const r=el.getBoundingClientRect(),arena=el.parentElement!.parentElement!.getBoundingClientRect();
        return r.height>=120 && r.left>=arena.left && r.right<=arena.right && r.top>=arena.top && r.bottom<=arena.bottom && r.bottom<=innerHeight;
      })).toBe(true);
    };
    await fits(); await reachable(page,'#coach-dismiss');
    await page.screenshot({path:info.outputPath('single-screen.png')});
    await page.locator('#battle-info').click(); await expect(page.locator('#game-info')).toBeVisible();
    await page.locator('#coach-toggle').click(); await page.locator('[data-ui=info-close]').click();
    await expect(page.locator('#battle-coach')).toBeHidden(); await fits();
    await page.locator('#hero-guardian').click(); await page.locator('#action-guard').click();
    await reachable(page,'#target-tracer'); await page.locator('#target-tracer').click();
    await reachable(page,'#skip-turn'); await finishTurn(page); await fits();
    await expect(page.locator('#hero-guardian')).toContainText('71 / 76');
    for(const [hero,action,target] of guided.slice(1)) { await choose(page,hero,action,target); await finishTurn(page); }
    await expect(page.locator('.result-card')).toContainText('ชนะ'); await reachable(page,'.result-card button');
    await fits(); expect(errors).toEqual([]); await context.close();
  });
}
