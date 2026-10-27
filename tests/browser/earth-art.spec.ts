import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.skip(!process.env.EARTH_ART, 'source-only artwork reference/review');
const skills=['bash','slam','quake','tremor'];
const cases=[...skills.map(skill=>({skill,scenario:'base'})),
 ...['energy','reflect','unstoppable','retribution','down'].map(scenario=>({skill:'bash',scenario})),
 ...['incoming','runequake'].map(scenario=>({skill:'slam',scenario})),
 ...['backonly','skyhammer'].map(scenario=>({skill:'quake',scenario})),
 ...['backonly','redirect'].map(scenario=>({skill:'tremor',scenario}))];

test('DPR 2 and 3 keep unit landmarks in CSS coordinates',async({browser})=>{
  test.skip(process.env.EARTH_ART!=='references');
  for(const dpr of [2,3]){
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:dpr,reducedMotion:'reduce'});
    try{
      const page=await ctx.newPage();await page.goto('tests/browser/fixtures/earth-art.html?skill=bash');
      const start=page.locator('#start');if(await start.isVisible())await start.click();
      await expect(page.locator('#action-bash')).toBeVisible();await page.waitForTimeout(500);
      const a=await page.evaluate(()=>({point:window.earthArtQA.capture().source,independent:window.earthArtQA.independentPivot()}));
      expect(a.point.x).toBeCloseTo(a.independent.x,1);expect(a.point.footY).toBeCloseTo(a.independent.footY,1);
      expect(a.point.x).toBeLessThan(390);expect(a.point.footY).toBeLessThan(844);
    }finally{await ctx.close();}
  }
});

test('capture legal earth recipients and rendered 390px references', async ({browser}) => {
  test.skip(process.env.EARTH_ART !== 'references'); test.setTimeout(240000);
  const out='incoming/ART-VFX-EARTH-001/reference'; mkdirSync(out,{recursive:true});
  const records:Record<string,unknown>={};
  for (const {skill,scenario} of cases) {
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
    try {
      const page=await ctx.newPage(); const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
      await page.goto(`tests/browser/fixtures/earth-art.html?skill=${skill}&scenario=${scenario}`);
      const start=page.locator('#start'); if(await start.isVisible())await start.click();
      await page.locator(`#action-${skill}`).click();
      await page.evaluate(()=>document.fonts.ready.then(()=>undefined)); await page.waitForTimeout(500);
      const a=await page.evaluate(()=>window.earthArtQA.capture());
      expect(a.committed).toEqual(a.prelude); expect(a.targets.length).toBeGreaterThan(0);
      const recipients=a.targets.map(t=>t.id).sort();
      if(skill==='quake'||skill==='tremor')expect(recipients).toEqual(scenario==='backonly'?['b1','b2']:['f1','f2']);
      if(skill==='slam')expect(recipients).toEqual(scenario==='runequake'?['b1','f1']:['f1']);
      if(skill==='bash'){
        expect(recipients).toEqual(['f1']);
        expect(a.events.some(e=>e.type==='interrupt')).toBe(['base','retribution'].includes(scenario));
        expect(a.events.some(e=>e.type==='sigil')).toBe(scenario==='reflect');
        expect(a.events.some(e=>e.type==='resist')).toBe(scenario==='unstoppable');
        expect(a.laterTurns.some(t=>t.actorId==='f1'&&t.events.some(e=>e.type==='cancel'))).toBe(['base','retribution','reflect'].includes(scenario));
      }
      if(skill==='tremor'){
        expect(a.before.intent?.targetId).not.toBe(a.source.id);
        if(scenario==='redirect')expect(a.before.intent?.kind).toBe('energy');
        for(const id of recipients)expect(a.after.enemies.find(e=>e.id===id)?.drawnBy?.heroId).toBe(a.source.id);
        const redirected=a.laterTurns.filter(t=>recipients.includes(t.actorId));
        expect(redirected.length).toBe(recipients.length);expect(redirected.every(t=>t.intent?.targetId===a.source.id)).toBe(true);
        expect(a.events.some(e=>e.type==='weaken')).toBe(false);
      }
      if(scenario==='skyhammer'){expect(a.events.filter(e=>e.type==='heal')).toHaveLength(2);expect(a.events.filter(e=>e.type==='heal').reduce((sum,e)=>sum+(e.amount??0),0)).toBe(8);}
      records[`${skill}-${scenario}`]=a;
      const mask=await page.evaluate(()=>window.earthArtQA.mask());writeFileSync(`${out}/${skill}-${scenario}-mask.png`,Buffer.from(mask.split(',')[1]!, 'base64'));
      await page.screenshot({path:`${out}/${skill}-${scenario}-390.png`});expect(errors).toEqual([]);
    } finally {await ctx.close();}
  }
  writeFileSync(`${out}/anchors.json`,JSON.stringify(records,null,2)+'\n');
});

test('review four skills, real variants, three phases and artwork controls',async({page})=>{
  test.skip(process.env.EARTH_ART !== 'render');test.setTimeout(90000);
  await page.setViewportSize({width:390,height:1000});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('docs/combat-presentation/earth-storyboards/index.html');
  await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  for(const {skill,scenario} of cases){
    await page.locator(`button[data-skill="${skill}"]`).click();await page.selectOption('#scenario',scenario);
    await expect(page.locator('canvas')).toHaveCount(3);
    const frames=await page.locator('canvas').evaluateAll(cs=>cs.map(c=>(c as HTMLCanvasElement).toDataURL()));
    frames.forEach((frame,i)=>writeFileSync(`docs/combat-presentation/earth-storyboards/${skill}-${scenario}-${i}-390.png`,Buffer.from(frame.split(',')[1]!,'base64')));
  }
  const painted=await page.locator('canvas').nth(1).evaluate((c:HTMLCanvasElement)=>c.toDataURL());
  await page.locator('#toggle').click();expect(await page.locator('canvas').nth(1).evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(painted);
  await page.locator('#weight').fill('60');await page.locator('#reset').click();await expect(page.locator('#weight')).toHaveValue('100');
  await page.locator('[data-phase="2"]').click();expect(await page.locator('.scroll').evaluate(e=>e.scrollLeft)).toBe(780);
  await expect(page.locator('nav button')).toHaveCount(4);expect(errors).toEqual([]);
});
