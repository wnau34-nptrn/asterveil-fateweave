import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.skip(!process.env.PROJECTILE_ART, 'source-only artwork reference/review');
const skills = ['hinder','volley','weakshot','pin','track','disengage','knives'];
const cases = [...skills.map(skill => ({skill,scenario:'base'})),
  {skill:'track',scenario:'delayed'},{skill:'track',scenario:'followup'},
  {skill:'weakshot',scenario:'delayed'},{skill:'knives',scenario:'frontonly'},
  {skill:'knives',scenario:'twin'},{skill:'volley',scenario:'volleyhinder'},
  {skill:'disengage',scenario:'quickstep'}];

test('DPR 2 and 3 keep unit landmarks in CSS coordinates',async({browser})=>{
  test.skip(process.env.PROJECTILE_ART!=='references');
  for(const dpr of [2,3]){
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:dpr,reducedMotion:'reduce'});
    try{
      const page=await ctx.newPage();await page.goto('tests/browser/fixtures/projectile-art.html?skill=hinder');
      const start=page.locator('#start');if(await start.isVisible())await start.click();
      await expect(page.locator('#action-hinder')).toBeVisible();await page.waitForTimeout(500);
      const a=await page.evaluate(()=>({point:window.projectileArtQA.capture().source,independent:window.projectileArtQA.independentPivot()}));
      expect(a.point.x).toBeCloseTo(a.independent.x,1);expect(a.point.footY).toBeCloseTo(a.independent.footY,1);
      expect(a.point.x).toBeLessThan(390);expect(a.point.footY).toBeLessThan(844);
    }finally{await ctx.close();}
  }
});

test('capture legal projectile recipients and rendered 390px references', async ({browser}) => {
  test.skip(process.env.PROJECTILE_ART !== 'references'); test.setTimeout(240000);
  const out='incoming/ART-VFX-PROJECTILE-001/reference'; mkdirSync(out,{recursive:true});
  const records:Record<string,unknown>={};
  for (const {skill,scenario} of cases) {
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
    try {
      const page=await ctx.newPage(); const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
      await page.goto(`tests/browser/fixtures/projectile-art.html?skill=${skill}&scenario=${scenario}`);
      const start=page.locator('#start'); if(await start.isVisible())await start.click();
      await page.locator(`#action-${skill}`).click();
      await page.evaluate(()=>document.fonts.ready.then(()=>undefined)); await page.waitForTimeout(500);
      const a=await page.evaluate(()=>window.projectileArtQA.capture());
      expect(a.committed).toEqual(a.prelude); expect(a.targets.length).toBeGreaterThan(0);
      if(skill==='volley')expect(a.targets.map(t=>t.id).sort()).toEqual(['b1','b2','f1','f2']);
      if(skill==='pin') { expect(a.targets.map(t=>t.id).sort()).toEqual(['f1','f2']); expect(a.after.pinned).toBe(a.before.round+1); }
      if(skill==='knives')expect(a.targets.map(t=>t.id).sort()).toEqual(scenario==='twin'?['b1','b2','f1','f2']:scenario==='frontonly'?['f1','f2']:['b1','b2']);
      if(skill==='track') { expect(a.castEvents.filter(e=>e.type==='damage')).toHaveLength(1); expect(a.followup.filter(e=>e.type==='counter')).toHaveLength(scenario==='base'?0:1); }
      if(skill==='hinder'||scenario==='quickstep')expect(a.castEvents.some(e=>e.type==='delay')).toBe(true);
      if(scenario==='volleyhinder')expect(a.castEvents.filter(e=>e.type==='delay')).toHaveLength(1);
      records[`${skill}-${scenario}`]=a;
      const mask=await page.evaluate(()=>window.projectileArtQA.mask());writeFileSync(`${out}/${skill}-${scenario}-mask.png`,Buffer.from(mask.split(',')[1]!, 'base64'));
      await page.screenshot({path:`${out}/${skill}-${scenario}-390.png`});expect(errors).toEqual([]);
    } finally {await ctx.close();}
  }
  writeFileSync(`${out}/anchors.json`,JSON.stringify(records,null,2)+'\n');
});

test('review seven skills, real variants, three phases and artwork controls',async({page})=>{
  test.skip(process.env.PROJECTILE_ART !== 'render');test.setTimeout(90000);
  await page.setViewportSize({width:390,height:1000});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('docs/combat-presentation/projectile-storyboards/index.html');
  await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  for(const {skill,scenario} of cases){
    await page.locator(`button[data-skill="${skill}"]`).click();await page.selectOption('#scenario',scenario);
    await expect(page.locator('canvas')).toHaveCount(3);
    const frames=await page.locator('canvas').evaluateAll(cs=>cs.map(c=>(c as HTMLCanvasElement).toDataURL()));
    frames.forEach((frame,i)=>writeFileSync(`docs/combat-presentation/projectile-storyboards/${skill}-${scenario}-${i}-390.png`,Buffer.from(frame.split(',')[1]!,'base64')));
  }
  const painted=await page.locator('canvas').nth(1).evaluate((c:HTMLCanvasElement)=>c.toDataURL());
  await page.locator('#toggle').click();expect(await page.locator('canvas').nth(1).evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(painted);
  await page.locator('#weight').fill('60');await page.locator('#reset').click();await expect(page.locator('#weight')).toHaveValue('100');
  await page.locator('[data-phase="2"]').click();expect(await page.locator('.scroll').evaluate(e=>e.scrollLeft)).toBe(780);
  await expect(page.locator('nav button')).toHaveCount(7);expect(errors).toEqual([]);
});
