import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.skip(process.env.ALCHEMY_CLIPS !== '1', 'separate actual-runtime capture only');
const cases = [
 ...['acid','bomb','smoke','catalyst','haste','fury'].flatMap(skill=>['normal','fast','reduced','osreduce'].map(mode=>({skill,scenario:'normal',mode}))),
 ...[['acid','spread'],['acid','potent'],['acid','deeper'],['acid','down'],['acid','chainother'],['acid','laterhit'],['bomb','backonly'],['bomb','corroded'],['bomb','down'],['smoke','wide'],['smoke','poison'],['smoke','boss'],['smoke','physical'],['smoke','energy'],['catalyst','corroded'],['catalyst','expired'],['catalyst','kill'],['catalyst','chain'],['catalyst','chainfallback'],['haste','nextalready'],['haste','acted'],['haste','self'],['haste','heal'],['haste','fullhp'],['haste','overflow'],['haste','quickbrew'],['haste','downinvalid'],['fury','self'],['fury','refresh'],['fury','outgoing'],['fury','expiry']].map(([skill,scenario])=>({skill:skill!,scenario:scenario!,mode:'normal'})),
].filter(c=>!process.env.ALCHEMY_CAPTURE_FILTER||`${c.skill}-${c.scenario}-${c.mode}`.includes(process.env.ALCHEMY_CAPTURE_FILTER));
for (const { skill, scenario, mode } of cases) test(`alchemy clip ${skill}-${scenario}-${mode}`, async ({ browser }, info) => {
  test.setTimeout(120000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: mode === 'osreduce' ? 'reduce' : 'no-preference' });
  try {
    const page = await ctx.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`tests/browser/fixtures/alchemy.html?skill=${skill}&scenario=${scenario}&speed=${mode === 'fast' ? 'fast' : 'normal'}&intensity=${mode === 'reduced' ? 'reduced' : 'standard'}`);
    const start=page.locator('#start');if(await start.isVisible())await start.click();
    await page.locator(`#action-${await page.evaluate(()=>window.alchemyQA.action())}`).click();
    await page.evaluate(() => document.fonts.ready.then(() => undefined)); await page.waitForTimeout(350);

    await page.evaluate(() => document.addEventListener('pointerdown', () => { document.documentElement.dataset.alchemyClick = String(Date.now()/1000); }, { capture: true, once: true }));
    const dir = info.outputPath('frames'); mkdirSync(dir, { recursive: true });
    const cdp = await ctx.newCDPSession(page), stamps: string[] = [];
    cdp.on('Page.screencastFrame', f => { const n = String(stamps.length).padStart(4, '0'); writeFileSync(`${dir}/${n}.jpg`, Buffer.from(f.data, 'base64')); stamps.push(`${n} ${f.metadata.timestamp}`); void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 }); await page.waitForTimeout(300);
    await page.locator(`#target-${await page.evaluate(() => window.alchemyQA.target())}`).click();
    const click = Number(await page.locator('html').getAttribute('data-alchemy-click')); expect(click).toBeGreaterThan(1_000_000_000);
    await expect(page.locator('#skip-turn')).toBeHidden({ timeout: 12000 });
    const followups=await page.evaluate(()=>window.alchemyQA.followups());
    for(const cmd of followups){
      await page.locator(`#action-${cmd.action}`).click();await page.locator(`#target-${cmd.targetId}`).click();
      await expect(page.locator('#skip-turn')).toBeHidden({timeout:12000});
    }
    await page.waitForTimeout(300);
    await cdp.send('Page.stopScreencast');
    const impacts = await page.evaluate(() => window.alchemyQA.impacts);
    expect(impacts.some(i => i.cues.length>0)).toBe(true);
    expect(await page.evaluate(() => window.alchemyQA.state().commands.length)).toBe((await page.evaluate(() => window.alchemyQA.prelude())).length+1+followups.length);
    writeFileSync(info.outputPath('stamps.txt'), `click ${click}\n${stamps.join('\n')}`);
    writeFileSync(info.outputPath('timing.json'), JSON.stringify(impacts, null, 2));
    expect(stamps.length).toBeGreaterThan(12);
    const actual=await page.evaluate(()=>window.alchemyQA.state());
    expect(actual).toEqual(await page.evaluate(()=>window.alchemyQA.expectedCaptureState()));
    writeFileSync(info.outputPath('final-state.json'),JSON.stringify(actual,null,2)); expect(errors).toEqual([]);
  } finally { await ctx.close(); }
});
