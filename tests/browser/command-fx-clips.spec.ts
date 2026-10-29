import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.skip(process.env.COMMAND_CLIPS !== '1', 'separate actual-runtime capture only');
const cases = [
 ...['taunt','challenge','warcry'].flatMap(skill=>['normal','fast','reduced','osreduce'].map(mode=>({skill,scenario:'normal',mode}))),
 {skill:'warcry',scenario:'kill',mode:'normal'},{skill:'challenge',scenario:'energy',mode:'normal'},
].filter(c=>!process.env.COMMAND_CAPTURE_FILTER||`${c.skill}-${c.scenario}-${c.mode}`.includes(process.env.COMMAND_CAPTURE_FILTER));
for (const { skill, scenario, mode } of cases) test(`command clip ${skill}-${scenario}-${mode}`, async ({ browser }, info) => {
  test.setTimeout(120000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: mode === 'osreduce' ? 'reduce' : 'no-preference' });
  try {
    const page = await ctx.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`tests/browser/fixtures/command-fx.html?skill=${skill}&scenario=${scenario}&speed=${mode === 'fast' ? 'fast' : 'normal'}&intensity=${mode === 'reduced' ? 'reduced' : 'standard'}`);
    const start=page.locator('#start');if(await start.isVisible())await start.click();
    await page.locator(`#action-${await page.evaluate(()=>window.commandQA.action())}`).click();
    await page.evaluate(() => document.fonts.ready.then(() => undefined)); await page.waitForTimeout(350);

    await page.evaluate(() => document.addEventListener('pointerdown', () => { document.documentElement.dataset.commandClick = String(Date.now()/1000); }, { capture: true, once: true }));
    const dir = info.outputPath('frames'); mkdirSync(dir, { recursive: true });
    const cdp = await ctx.newCDPSession(page), stamps: string[] = [];
    cdp.on('Page.screencastFrame', f => { const n = String(stamps.length).padStart(4, '0'); writeFileSync(`${dir}/${n}.jpg`, Buffer.from(f.data, 'base64')); stamps.push(`${n} ${f.metadata.timestamp}`); void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 }); await page.waitForTimeout(300);
    await page.locator(`#target-${await page.evaluate(() => window.commandQA.target())}`).click();
    const click = Number(await page.locator('html').getAttribute('data-command-click')); expect(click).toBeGreaterThan(1_000_000_000);
    await expect(page.locator('#skip-turn')).toBeHidden({ timeout: 12000 });
        await page.waitForTimeout(300);
    await cdp.send('Page.stopScreencast');
    const impacts = await page.evaluate(() => window.commandQA.impacts);
    expect(impacts.some(i => i.cues.length>0)).toBe(true);
    expect(await page.evaluate(() => window.commandQA.state().commands.length)).toBe(1);
    writeFileSync(info.outputPath('stamps.txt'), `click ${click}\n${stamps.join('\n')}`);
    writeFileSync(info.outputPath('timing.json'), JSON.stringify(impacts, null, 2));
    expect(stamps.length).toBeGreaterThan(12);
    const actual=await page.evaluate(()=>window.commandQA.state());
    expect(actual).toEqual(await page.evaluate(()=>window.commandQA.expectedCaptureState()));
    writeFileSync(info.outputPath('final-state.json'),JSON.stringify(actual,null,2)); expect(errors).toEqual([]);
  } finally { await ctx.close(); }
});
