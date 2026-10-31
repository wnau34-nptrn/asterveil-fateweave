import { test, expect } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile, depart } from '../../src/core/world/profile';
import { mkdirSync, writeFileSync } from 'node:fs';
import { legacyEnvelope } from '../fixtures/legacy-save';

// Real-time Execute / Ward clips for owner review (A8). Runs only with FX_CLIPS=1; writes frames plus the click offset.
const key = 'asterveil.fateweave.expedition.v1';
test.skip(!process.env.FX_CLIPS, 'clip capture only');
const skills = [['execute', 'f1'], ['ward', 'weaver']] as const;
for (const [skill, target] of skills) {
  for (const [name, width, height, touch, speed, intensity, motion] of [
    ['phone-390-normal', 390, 844, true, 'normal', 'standard', 'no-preference'], ['phone-390-fast', 390, 844, true, 'fast', 'standard', 'no-preference'],
    ['phone-390-reduced', 390, 844, true, 'normal', 'reduced', 'no-preference'], ['phone-390-osreduce', 390, 844, true, 'normal', 'standard', 'reduce'],
    ['phone-320-normal', 320, 568, true, 'normal', 'standard', 'no-preference'], ['pc-1366-normal', 1366, 768, false, 'normal', 'standard', 'no-preference'],
  ] as const) {
    test(`${skill} clip ${name}`, async ({ browser }, info) => {
      test.setTimeout(90000);
      const ctx = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: motion });
      const page = await ctx.newPage();
      const p = newProfile(map, 17); p.commander = { name: 'จังหวะ', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }; p.tutorialDone = true;
      const game = depart(p, map, encounterById, 1234); game.run.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...game.run.hp }, commands: [] };
      await page.addInitScript(({ key, raw, prefs }) => { if (!sessionStorage.getItem('clip')) { localStorage.setItem(key, raw); localStorage.setItem('asterveil.fateweave.presentation.v1', prefs); sessionStorage.setItem('clip', '1'); } },
        { key, raw: JSON.stringify(legacyEnvelope({ version: 34, ...game })), prefs: JSON.stringify({ speed, intensity }) });
      await page.goto('./'); await page.locator('#continue').click(); await page.locator('#start').click();
      for (let i = 0; i < 8 && !(await page.locator(`#action-${skill}`).isVisible()); i++) { await page.locator('#target-f1').click(); await page.waitForTimeout(3500); }
      await expect(page.locator(`#action-${skill}`)).toBeEnabled(); await page.locator(`#action-${skill}`).click(); await page.waitForTimeout(400);
      const dir = info.outputPath('frames'); mkdirSync(dir, { recursive: true }); const cdp = await ctx.newCDPSession(page); const stamps: string[] = [];
      cdp.on('Page.screencastFrame', f => { const n = String(stamps.length).padStart(4, '0'); writeFileSync(`${dir}/${n}.jpg`, Buffer.from(f.data, 'base64')); stamps.push(`${n} ${f.metadata.timestamp}`); void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); });
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 }); await page.waitForTimeout(300);
      const click = Date.now() / 1000; await page.locator(`#target-${target}`).click(); await page.waitForTimeout(1500);
      await cdp.send('Page.stopScreencast'); writeFileSync(info.outputPath('stamps.txt'), `click ${click}\n${stamps.join('\n')}`); await ctx.close();
    });
  }
}
