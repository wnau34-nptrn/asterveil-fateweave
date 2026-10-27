import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.skip(!process.env.ALCHEMY_ART, 'source-only artwork reference/review');
const skills=['acid','bomb','smoke','catalyst','haste','fury'];
const cases=[...skills.map(skill=>({skill,scenario:'base'})),
 {skill:'acid',scenario:'spread'},{skill:'acid',scenario:'down'},
 {skill:'bomb',scenario:'backonly'},{skill:'smoke',scenario:'wide'},{skill:'smoke',scenario:'poison'},
 {skill:'catalyst',scenario:'corroded'},{skill:'haste',scenario:'self'},{skill:'fury',scenario:'self'}];

test('DPR 2 and 3 keep unit landmarks in CSS coordinates',async({browser})=>{
  test.skip(process.env.ALCHEMY_ART!=='references');
  for(const dpr of [2,3]){
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:dpr,reducedMotion:'reduce'});
    try{
      const page=await ctx.newPage();await page.goto('tests/browser/fixtures/alchemy-art.html?skill=acid');
      const start=page.locator('#start');if(await start.isVisible())await start.click();
      await expect(page.locator('#action-acid')).toBeVisible();await page.waitForTimeout(500);
      const a=await page.evaluate(()=>({point:window.alchemyArtQA.capture().source,independent:window.alchemyArtQA.independentPivot()}));
      expect(a.point.x).toBeCloseTo(a.independent.x,1);expect(a.point.footY).toBeCloseTo(a.independent.footY,1);
      expect(a.point.x).toBeLessThan(390);expect(a.point.footY).toBeLessThan(844);
    }finally{await ctx.close();}
  }
});

test('capture legal alchemy recipients and rendered 390px references', async ({browser}) => {
  test.skip(process.env.ALCHEMY_ART !== 'references'); test.setTimeout(240000);
  const out='incoming/ART-VFX-ALCHEMY-001/reference'; mkdirSync(out,{recursive:true});
  const records:Record<string,unknown>={};
  for (const {skill,scenario} of cases) {
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
    try {
      const page=await ctx.newPage(); const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
      await page.goto(`tests/browser/fixtures/alchemy-art.html?skill=${skill}&scenario=${scenario}`);
      const start=page.locator('#start'); if(await start.isVisible())await start.click();
      await page.locator(`#action-${skill}`).click();
      await page.evaluate(()=>document.fonts.ready.then(()=>undefined)); await page.waitForTimeout(500);
      const a=await page.evaluate(()=>window.alchemyArtQA.capture());
      expect(a.committed).toEqual(a.prelude); expect(a.targets.length).toBeGreaterThan(0);
      const recipients=a.targets.map(t=>t.id).sort();
      if(skill==='bomb')expect(recipients).toEqual(scenario==='backonly'?['b1','b2']:['b1','b2','f1','f2']);
      if(skill==='acid'){
        expect(a.events.filter(e=>e.type==='damage')).toHaveLength(1);
        expect(a.events.filter(e=>e.type==='corrode')).toHaveLength(scenario==='spread'?4:scenario==='down'?0:1);
      }
      if(skill==='smoke'){
        expect(a.events.some(e=>e.type==='damage'||e.type==='interrupt')).toBe(false);
        expect(a.events.filter(e=>e.type==='weaken')).toHaveLength(scenario==='wide'?2:1);
      }
      if(skill==='catalyst'){
        expect(a.events.filter(e=>e.type==='damage')).toHaveLength(1);
        if(scenario==='corroded')expect(a.before.enemies.find(e=>e.id==='f1')?.corrodedUntil).toBeGreaterThan(a.before.round);
      }
      if(skill==='haste'||skill==='fury'){
        expect(a.events.some(e=>e.type==='damage')).toBe(false);
        expect(recipients).toEqual([scenario==='self'?'toma':'guardian']);
      }
      records[`${skill}-${scenario}`]=a;
      const mask=await page.evaluate(()=>window.alchemyArtQA.mask());writeFileSync(`${out}/${skill}-${scenario}-mask.png`,Buffer.from(mask.split(',')[1]!, 'base64'));
      await page.screenshot({path:`${out}/${skill}-${scenario}-390.png`});expect(errors).toEqual([]);
    } finally {await ctx.close();}
  }
  writeFileSync(`${out}/anchors.json`,JSON.stringify(records,null,2)+'\n');
});

test('review six skills, real variants, three phases and artwork controls',async({page})=>{
  test.skip(process.env.ALCHEMY_ART !== 'render');test.setTimeout(90000);
  await page.setViewportSize({width:390,height:1000});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('docs/combat-presentation/alchemy-storyboards/index.html');
  await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  for(const {skill,scenario} of cases){
    await page.locator(`button[data-skill="${skill}"]`).click();await page.selectOption('#scenario',scenario);
    await expect(page.locator('canvas')).toHaveCount(3);
    const frames=await page.locator('canvas').evaluateAll(cs=>cs.map(c=>(c as HTMLCanvasElement).toDataURL()));
    frames.forEach((frame,i)=>writeFileSync(`docs/combat-presentation/alchemy-storyboards/${skill}-${scenario}-${i}-390.png`,Buffer.from(frame.split(',')[1]!,'base64')));
  }
  const painted=await page.locator('canvas').nth(1).evaluate((c:HTMLCanvasElement)=>c.toDataURL());
  await page.locator('#toggle').click();expect(await page.locator('canvas').nth(1).evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(painted);
  await page.locator('#weight').fill('60');await page.locator('#reset').click();await expect(page.locator('#weight')).toHaveValue('100');
  await page.locator('[data-phase="2"]').click();expect(await page.locator('.scroll').evaluate(e=>e.scrollLeft)).toBe(780);
  await expect(page.locator('nav button')).toHaveCount(6);expect(errors).toEqual([]);
});
