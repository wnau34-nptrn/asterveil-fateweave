import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.skip(process.env.PROJECTILE_CLIPS !== '1', 'separate actual-runtime capture only');
const cases = [
  ...['hinder','volley','weakshot','pin','track','disengage','knives'].flatMap(skill=>['normal','fast','reduced','osreduce'].map(mode=>({skill,scenario:'normal',mode}))),
  ...[['track','delayed'],['track','targetdown'],['track','sourcedown'],['weakshot','delayed'],['knives','frontonly'],['knives','twin'],['knives','quick'],['volley','volleyhinder'],['disengage','quickstep'],['disengage','covershot'],['hinder','heavy'],['hinder','veiled']].map(([skill,scenario])=>({skill:skill!,scenario:scenario!,mode:'normal'})),
].filter(c=>!process.env.PROJECTILE_CAPTURE_FILTER||`${c.skill}-${c.scenario}-${c.mode}`.includes(process.env.PROJECTILE_CAPTURE_FILTER));
for (const { skill, scenario, mode } of cases) test(`projectile clip ${skill}-${scenario}-${mode}`, async ({ browser }, info) => {
  test.setTimeout(60000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: mode === 'osreduce' ? 'reduce' : 'no-preference' });
  try {
    const page = await ctx.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`tests/browser/fixtures/projectile.html?skill=${skill}&scenario=${scenario}&speed=${mode === 'fast' ? 'fast' : 'normal'}&intensity=${mode === 'reduced' ? 'reduced' : 'standard'}`);
    const start=page.locator('#start');if(await start.isVisible())await start.click();
    await page.locator(`#action-${skill}`).click();
    await page.evaluate(() => document.fonts.ready.then(() => undefined)); await page.waitForTimeout(350);
    const commands = skill==='track'&&scenario!=='normal' ? await page.evaluate(() => window.projectileQA.commands()) : [];
    await page.evaluate(() => document.addEventListener('pointerdown', () => { document.documentElement.dataset.projectileClick = String(Date.now()/1000); }, { capture: true, once: true }));
    const dir = info.outputPath('frames'); mkdirSync(dir, { recursive: true });
    const cdp = await ctx.newCDPSession(page), stamps: string[] = [];
    cdp.on('Page.screencastFrame', f => { const n = String(stamps.length).padStart(4, '0'); writeFileSync(`${dir}/${n}.jpg`, Buffer.from(f.data, 'base64')); stamps.push(`${n} ${f.metadata.timestamp}`); void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 }); await page.waitForTimeout(300);
    await page.locator(`#target-${await page.evaluate(() => window.projectileQA.target())}`).click();
    const click = Number(await page.locator('html').getAttribute('data-projectile-click')); expect(click).toBeGreaterThan(1_000_000_000);
    for (const cmd of commands) {
      await page.locator(`#action-${cmd.action}`).click();
      expect(await page.evaluate(() => window.projectileQA.state().beat)).toBe(cmd.beat);
      await page.locator(`#target-${cmd.targetId}`).click();
    }
    await expect(page.locator('#skip-turn')).toBeHidden({ timeout: 12000 }); await page.waitForTimeout(300);
    await cdp.send('Page.stopScreencast');
    const impacts = await page.evaluate(() => window.projectileQA.impacts);
    expect(impacts.some(i => i.action === skill && i.side === 'hero')).toBe(true);
    if(skill==='track')expect(impacts.flatMap(i=>i.cues).filter(c=>c.kind==='followup')).toHaveLength(scenario==='delayed'?1:0);
    expect(await page.evaluate(() => window.projectileQA.state().commands.length)).toBe((await page.evaluate(() => window.projectileQA.prelude())).length+1+commands.length);
    writeFileSync(info.outputPath('stamps.txt'), `click ${click}\n${stamps.join('\n')}`);
    writeFileSync(info.outputPath('timing.json'), JSON.stringify(impacts, null, 2));
    expect(stamps.length).toBeGreaterThan(12);
    writeFileSync(info.outputPath('final-state.json'),JSON.stringify(await page.evaluate(()=>window.projectileQA.state()),null,2)); expect(errors).toEqual([]);
  } finally { await ctx.close(); }
});
