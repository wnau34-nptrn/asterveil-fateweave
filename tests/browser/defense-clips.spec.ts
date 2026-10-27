import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.skip(!process.env.DEFENSE_CLIPS, 'owner clip capture only');
const cases = [
  ...['guard','aegis','rally','bulwark','stonearmor','guardstone','halo','sanctuary','brace','spearwall','hold'].map(skill => ({skill,outcome:skill==='guardstone'?'stone':skill==='sanctuary'?'save':['brace','spearwall','hold'].includes(skill)?'counter':'normal',mode:'normal'})),
  ...['blocked','partial'].map(outcome=>({skill:'aegis',outcome,mode:'normal'})),
  ...['dodged','cancelled'].map(outcome=>({skill:'guard',outcome,mode:'normal'})),
  ...['aegis','rally'].flatMap(skill=>['fast','reduced','osreduce'].map(mode=>({skill,outcome:'normal',mode}))),
];
for (const { skill, outcome, mode } of cases) test(`defense clip ${skill}-${outcome}-${mode}`, async ({ browser }, info) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: mode === 'osreduce' ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  try {
    await page.goto(`tests/browser/fixtures/defense.html?runtime=1&skill=${skill}&scenario=${outcome}&speed=${mode === 'fast' ? 'fast' : 'normal'}&intensity=${mode === 'reduced' ? 'reduced' : 'standard'}`);
    await page.locator('#start').click(); await page.evaluate(() => window.defenseQA.prime());
    await page.locator(`#action-${skill}`).click(); await expect(page.locator(`#action-${skill}`)).toBeEnabled();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.waitForTimeout(350);
    // Canvas may commit on pointerdown and replace the target before a DOM click exists.
    await page.evaluate(() => document.addEventListener('pointerdown', () => {
      document.documentElement.dataset.defenseClick = String(Date.now() / 1000);
    }, { capture: true, once: true }));
    const dir = info.outputPath('frames'); mkdirSync(dir, { recursive: true });
    const cdp = await ctx.newCDPSession(page), stamps: string[] = [];
    cdp.on('Page.screencastFrame', f => { const n = String(stamps.length).padStart(4, '0'); writeFileSync(`${dir}/${n}.jpg`, Buffer.from(f.data, 'base64')); stamps.push(`${n} ${f.metadata.timestamp}`); void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
    await page.waitForTimeout(300);
    await page.locator(`#target-${await page.evaluate(()=>window.defenseQA.target())}`).click();
    const click = Number(await page.locator('html').getAttribute('data-defense-click'));
    expect(click).toBeGreaterThan(1_000_000_000);
    await page.waitForTimeout(2850);
    await cdp.send('Page.stopScreencast'); writeFileSync(info.outputPath('stamps.txt'), `click ${click}\n${stamps.join('\n')}`);
    writeFileSync(info.outputPath('timing.json'), JSON.stringify(await page.evaluate(() => window.defenseQA.impacts), null, 2));
    expect(stamps.length).toBeGreaterThan(12);
  } finally { await ctx.close(); }
});
