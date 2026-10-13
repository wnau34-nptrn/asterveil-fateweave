import { expect, test, type Page } from '@playwright/test';
import { offensive, defensive } from '../fixtures/party-routes';
async function start(page: Page): Promise<string[]> {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./'); await expect(page.locator('#game canvas')).toBeVisible();
  await page.locator('#start').click(); return errors;
}
async function choose(page: Page, hero: string, action: string, target: string): Promise<void> {
  await page.locator(`#hero-${hero}`).click(); await page.locator(`#action-${action}`).click(); await page.locator(`#target-${target}`).click();
}
async function commit(page: Page): Promise<void> {
  await page.locator('#confirm').click(); await page.locator('#skip-turn').click();
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

test('Start waits for the production unit atlas before enabling battle input', async ({ page }) => {
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
    await page.locator('#target-raider').click(); await expect(page.locator('#confirm')).toBeVisible();
    await page.locator('#cancel').click(); expect(errors).toEqual([]);
  } finally { release(); }
});

test('normal turns show hero damage first, then the frozen enemy response', async ({ page }, info) => {
  await page.clock.install({ time: new Date('2026-10-13T00:00:00Z') });
  await page.emulateMedia({ reducedMotion: 'no-preference' }); const errors = await start(page);
  await page.clock.pauseAt(new Date('2026-10-13T01:00:00Z'));
  await choose(page, 'weaver', 'bolt', 'brute'); await page.locator('#confirm').click();
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
  await choose(page, 'guardian', 'bash', 'raider'); await page.locator('#confirm').tap();
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
  await canvas.tap({ position: { x: b.width * .12, y: 110 + (b.height - 130) * .82 - 45 } });
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]); await context.close();
});

test('skip, restart, mid-turn reload and hidden-tab completion never replay a command', async ({ page }) => {
  const errors = await start(page);
  await choose(page, 'weaver', 'bolt', 'brute'); await page.locator('#confirm').click();
  await page.locator('#restart').click();
  await page.waitForTimeout(2100);
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  await expect(page.locator('[data-enemy="brute"]')).toContainText('164 / 164');
  await choose(page, 'weaver', 'ward', 'tracer'); await page.locator('#confirm').click();
  await expect(page.locator('#hero-tracer .barrier-info')).toHaveText('โล่ 14');
  await page.reload();
  await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase', 'choice');
  await expect(page.locator('#hero-tracer .barrier-info')).toHaveText('โล่ 2');
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 2');
  await choose(page, 'guardian', 'guard', 'weaver'); await page.locator('#confirm').click();
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
  await choose(page, 'tracer', 'execute', 'raider'); await page.locator('#confirm').click();
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
  test(`auto-select next hero at ${viewport.width}px, wrap, cancel and reload`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors = await start(page);
    await page.locator('#hero-guardian').tap();
    await page.locator('#target-brute').tap(); await page.locator('#cancel').tap();
    await expect(page.locator('#hero-guardian')).toHaveAttribute('aria-pressed', 'true');
    const turns = [
      ['guardian', 'tracer', 'นักดาบ', 'execute'], ['tracer', 'weaver', 'จอมเวท', 'bolt'],
      ['weaver', 'healer', 'นักบวช', 'heal'], ['healer', 'guardian', 'อัศวิน', 'guard'],
    ];
    for (const [actor, next, role, skill] of turns) {
      await expect(page.locator(`#hero-${actor}`)).toHaveAttribute('aria-pressed', 'true');
      await page.locator('#target-brute').tap(); await commit(page);
      await expect(page.locator(`#hero-${next}`)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#selected-hero')).toContainText(role!);
      await expect(page.locator(`#action-${skill}`)).toBeVisible();
      await expect(page.locator('#action-attack')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.hero-slot .portrait')).toHaveAttribute('data-actor', next!);
      await expect(page.locator('#mobile-preview')).not.toBeVisible();
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
  await page.locator('#target-brute').click(); await commit(page);
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  for (const next of ['guardian', 'tracer', 'healer', 'guardian', 'healer', 'healer']) {
    await page.locator('#target-brute').click(); await commit(page);
    await expect(page.locator(`#hero-${next}`)).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.locator('#hero-tracer')).toBeDisabled();
  await expect(page.locator('#hero-guardian')).toBeDisabled();
  await page.reload();
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#target-brute').click(); await commit(page);
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
  const enemies = (await page.locator('#enemy-roster').boundingBox())!;
  const intent = (await page.locator('#intent').boundingBox())!;
  expect(enemies.y).toBeGreaterThanOrEqual(arena.y + arena.height);
  expect(intent.y).toBeGreaterThan(enemies.y); expect(cards[0]!.y).toBeGreaterThan(intent.y);
  await choose(page, 'weaver', 'bolt', 'brute'); await commit(page);
  await expect(page.locator('[data-enemy="brute"]')).toContainText('138 / 164');
  await expect(page.locator('#hero-weaver [data-skill="bolt"]')).toContainText('รอ 2 จังหวะ');
  await expect(page.locator('#hero-healer [data-skill="heal"]')).toContainText('พร้อมใช้');
  await expect(page.locator('#hero-tracer')).toContainText('44 / 56');
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed', 'true');
  await choose(page, 'weaver', 'ward', 'guardian'); await commit(page);
  await expect(page.locator('#hero-guardian .barrier-info')).toHaveText('โล่ 14');
  expect(await page.locator('#hero-guardian .barrier-info').evaluate(el => {
    const r = el.getBoundingClientRect(); const card = el.closest('.hero-card')!.getBoundingClientRect();
    return r.x >= card.x && r.right <= card.right && r.bottom <= card.bottom;
  })).toBe(true);
  await page.locator('#hero-weaver').tap();
  await expect(page.locator('#action-bolt')).toBeDisabled();
  await page.locator('.help-panel > summary').tap();
  await expect(page.locator('#formation-info')).toBeVisible();
  await page.locator('.help-panel > summary').tap();
  await page.screenshot({ path: info.outputPath('modern-hud-cooldown.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]); await context.close();
});

test('real canvas selection, Guard preview/cancel/Escape, save, reload and restart', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); const errors = await start(page);
  const canvas = page.locator('#game canvas'); const b = (await canvas.boundingBox())!;
  await canvas.click({ position: { x:b.width*.31, y:135+(b.height-170)*.20-70 } });
  await expect(page.locator('#hero-guardian')).toHaveAttribute('aria-pressed','true');
  await page.locator('#action-guard').click();
  await canvas.click({ position: { x:b.width*.31, y:135+(b.height-170)*.82 } });
  await expect(page.locator('#preview')).toContainText('เอกิส เสียเลือด 5');
  await page.locator('#cancel').click(); await expect(page.locator('#target-tracer')).toBeFocused();
  await page.locator('#target-tracer').click(); await page.keyboard.press('Escape');
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  await page.locator('#target-tracer').click(); await commit(page);
  await expect(page.locator('#hero-guardian')).toContainText('71 / 76');
  await expect(page.locator('.next-slot')).toHaveAttribute('aria-label','จังหวะ 2 อสูรรอยแยก โจมตีไอรา พลังโจมตี 28');
  await page.reload(); await expect(page.locator('#start')).toHaveCount(0);
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 2');
  await page.locator('#restart').click(); await expect(page.locator('#hero-healer')).toContainText('46 / 46');
  expect(errors).toEqual([]);
});

test('Mage cooldown survives reload and becomes ready on its exact beat', async ({ page }) => {
  const errors = await start(page); await choose(page,'weaver','bolt','brute'); await commit(page);
  await page.locator('#hero-weaver').click(); await expect(page.locator('#action-bolt')).toBeDisabled();
  await expect(page.locator('#reason-bolt')).toContainText('พร้อมใน 2 จังหวะ');
  await page.reload(); await page.locator('#hero-weaver').click();
  await expect(page.locator('#reason-bolt')).toContainText('พร้อมใน 2 จังหวะ');
  await choose(page,'guardian','guard','weaver'); await commit(page);
  await page.locator('#hero-weaver').click(); await expect(page.locator('#reason-bolt')).toContainText('พร้อมใน 1 จังหวะ');
  await choose(page,'healer','heal','tracer'); await commit(page);
  await page.locator('#hero-weaver').click(); await expect(page.locator('#action-bolt')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('Ward, Heal and Prayer have real same-beat effects with clear previews', async ({ page }, info) => {
  const errors = await start(page);
  await choose(page,'weaver','ward','tracer');
  await expect(page.locator('#preview')).toContainText('โล่รับไว้ 12');
  await expect(page.locator('#preview')).toContainText('โล่ 0 → 2'); await commit(page);
  await choose(page,'guardian','guard','weaver'); await commit(page);
  await choose(page,'healer','heal','guardian');
  await expect(page.locator('.player-outcome')).toContainText('เอกิส ฟื้นเลือด 10');
  await expect(page.locator('.enemy-outcome')).toContainText('เอกิส เสียเลือด 12'); await commit(page);
  await choose(page,'weaver','ward','tracer'); await commit(page);
  await choose(page,'healer','prayer','party');
  await expect(page.locator('.player-outcome')).toContainText('ไลรา ฟื้นเลือด 10');
  await page.screenshot({path:info.outputPath('healer-party-preview.png'),fullPage:true});
  await commit(page); await expect(page.locator('#hero-tracer')).toContainText('54 / 56');
  expect(errors).toEqual([]);
});

for (const [name,moves,hp] of [['offensive',offensive,134],['defensive',defensive,94]] as const) {
  test(`four-class ${name} route wins with all four standing`, async ({ page }, info) => {
    test.setTimeout(90000); const errors = await start(page);
    for (const [hero,action,target] of moves) { await choose(page,hero,action,target); await commit(page); }
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
      await page.locator(`#target-${target}`).click(); await commit(page);
    }
    await expect(page.getByRole('heading',{name:'แพ้แล้ว',exact:true})).toBeVisible(); expect(errors).toEqual([]);
  });
}
for(const viewport of [{width:320,height:568},{width:390,height:844},{width:600,height:800},{width:844,height:390}]){
  test(`mobile ${viewport.width}x${viewport.height}: four-member roster, touch skills and reachable confirmation`,async({browser},info)=>{
    const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage(); const errors=await start(page);
    await expect(page.locator('.hero-card')).toHaveCount(4);
    await page.locator('#hero-guardian').tap(); await page.locator('#action-bash').tap();
    const member=(await page.locator('#hero-healer').boundingBox())!; expect(member.width).toBeGreaterThanOrEqual(44);expect(member.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({path:info.outputPath('mobile-four-jobs.png'),fullPage:true});
    await page.locator('#target-raider').tap(); await reachable(page,'#confirm'); await reachable(page,'#cancel');
    await expect(page.locator('#preview')).toContainText('กระแทกโล่หยุด');
    await page.locator('#cancel').tap(); await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
    await page.locator('#target-raider').tap(); await page.touchscreen.tap(2,2);
    await expect(page.locator('#mobile-preview')).not.toBeVisible();
    await page.locator('#target-raider').tap(); await commit(page);
    await page.locator('#hero-guardian').tap(); await expect(page.locator('#action-bash')).toBeDisabled();
    await page.locator('#hero-weaver').tap(); await page.locator('#action-ward').tap(); await page.locator('#target-weaver').tap();
    await reachable(page,'#confirm');
    await page.locator('.preview-content').evaluate(el=>{el.scrollTop=el.scrollHeight;}); await reachable(page,'#confirm');
    await page.screenshot({path:info.outputPath('mobile-ward-preview.png')}); await commit(page);
    await expect(page.locator('#hero-weaver')).toContainText('34 / 48');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    expect(errors).toEqual([]); await context.close();
  });
}

test('four-class mobile battle, back-row canvas selection and rotation keep pending commands',async({browser},info)=>{
  test.setTimeout(90000);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=await start(page);
  const canvas=page.locator('#game canvas');const b=(await canvas.boundingBox())!;
  await canvas.tap({position:{x:b.width*.12,y:110+(b.height-130)*.82-45}});
  await expect(page.locator('#hero-healer')).toHaveAttribute('aria-pressed','true');
  await choose(page,'tracer','mark','brute');
  await page.setViewportSize({width:844,height:390});await reachable(page,'#confirm');
  await page.setViewportSize({width:1366,height:900});await expect(page.locator('#confirm')).toHaveCount(1);
  await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  await page.setViewportSize({width:390,height:844});await reachable(page,'#confirm');await commit(page);
  for(const[hero,action,target]of offensive.slice(1)){await choose(page,hero,action,target);await commit(page);}
  await expect(page.locator('#start-screen')).toContainText('ยืนอยู่ 4 / 4 คน');
  await reachable(page,'.result-card button');await page.screenshot({path:info.outputPath('mobile-four-survivors.png')});
  await page.locator('.result-card button').tap();await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  expect(errors).toEqual([]);await context.close();
});

test('old three-member saves restart safely, and denied storage stays playable',async({page})=>{
  await page.addInitScript(()=>{try{localStorage.setItem('asterveil.fateweave.battle.v1',JSON.stringify({version:1,encounterId:'crystal-rift',contentVersion:2,commands:[{beat:1,heroId:'tracer',action:'mark',targetId:'brute'}]}));}catch{/* The denied-storage variant may run its init script first. */}});
  const errors=await start(page);await expect(page.locator('.hero-card')).toHaveCount(4);await expect(page.locator('#beat-status')).toContainText('จังหวะ 1');
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get:()=>{throw new Error('Denied');}}));
  await page.reload();await page.locator('#start').click();await choose(page,'guardian','guard','tracer');await commit(page);
  await expect(page.locator('#save-status')).toContainText('บันทึกบนเครื่องนี้ไม่ได้');expect(errors).toEqual([]);
});
