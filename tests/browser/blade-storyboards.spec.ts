import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const skills = ['attack', 'finisher', 'lunge', 'sweep', 'backstab', 'ambush', 'disarm', 'parry', 'pierce', 'halt'];
test.skip(!process.env.FX_STORYBOARDS, 'concept artwork review only');
test('capture immutable 390px game references and resolved anchors', async ({ browser }) => {
  test.skip(process.env.FX_STORYBOARDS !== 'references');
  test.setTimeout(90000);
  const out = path.resolve('incoming/ART-VFX-BLADE-STORYBOARD-001/reference');
  mkdirSync(out, { recursive: true });
  const anchors: Record<string, unknown> = {};
  for (const skill of skills) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    try {
      const page = await ctx.newPage();
      await page.goto(`tests/browser/fixtures/blade.html?skill=${skill}`);
      await page.locator('#start').click();
      await page.locator(`#action-${skill}`).click();
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.waitForTimeout(400);
      anchors[skill] = await page.evaluate(() => window.bladeQA.storyboardAnchors());
      await page.screenshot({ path: path.join(out, `${skill}-390.png`) });
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('blade-committed')!).commands)).toEqual([]);
    } finally { await ctx.close(); }
  }
  writeFileSync(path.join(out, 'anchors.json'), JSON.stringify(anchors, null, 2) + '\n');
});
test('render ten three-phase concept boards at native 390px', async ({ page }) => {
  test.skip(process.env.FX_STORYBOARDS !== 'render');
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1234, height: 1060 });
  await page.goto('docs/combat-presentation/blade-storyboards/index.html');
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  for (const skill of skills) {
    await page.locator(`button[data-skill="${skill}"]`).click();
    await page.waitForFunction(s => document.documentElement.dataset.skill === s, skill);
    const board = page.locator('#board');
    await expect(board.locator('canvas')).toHaveCount(3);
    // Native canvas export avoids viewport scrolling, fractional clip edges and scrollbar clipping.
    const exports = await page.evaluate(() => {
      const canvases = [...document.querySelectorAll('canvas')];
      const poster = document.createElement('canvas'); poster.width=1170; poster.height=950;
      const ctx = poster.getContext('2d')!;
      ctx.fillStyle='#101c30'; ctx.fillRect(0,0,1170,950);
      ['01 · เตรียม','02 · ปะทะหนึ่งครั้ง','03 · สลาย'].forEach((label,i) => {
        ctx.fillStyle='#17243a'; ctx.fillRect(i*390,0,390,62);
        ctx.fillStyle='#edf1fb'; ctx.font='bold 16px system-ui'; ctx.fillText(label,i*390+16,27);
        ctx.fillStyle='#b6c2d5'; ctx.font='12px system-ui'; ctx.fillText('สนามจริง 390px · แบบภาพนิ่ง ยังไม่ใช่ runtime',i*390+16,48);
        ctx.drawImage(canvases[i]!,i*390,62);
      });
      ctx.fillStyle='#bdc9dd';ctx.font='12px system-ui';
      ctx.fillText('แบบภาพสำหรับตรวจรูปร่างและน้ำหนัก · HP และ UI ในภาพอ้างอิงคงเดิมทุกช่อง',16,932);
      return { poster:poster.toDataURL(), contact:canvases[1]!.toDataURL() };
    });
    for (const [suffix,data] of [['board',exports.poster],['contact-390',exports.contact]])
      writeFileSync(`docs/combat-presentation/blade-storyboards/${skill}-${suffix}.png`,Buffer.from(data!.split(',')[1]!, 'base64'));
  }
  const painted = await page.locator('canvas').nth(1).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.locator('#toggle').click();
  const bare = await page.locator('canvas').nth(1).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(bare === painted).toBe(false);
  await page.locator('#reset').click();
  await expect(page.locator('#weight')).toHaveValue('100');
  await expect(page.locator('#toggle')).toHaveText('ดูสนามเปล่า');
  expect(await page.locator('canvas').nth(1).evaluate((c: HTMLCanvasElement, background) => c.toDataURL() === background, bare)).toBe(false);
  expect(errors).toEqual([]);
});
