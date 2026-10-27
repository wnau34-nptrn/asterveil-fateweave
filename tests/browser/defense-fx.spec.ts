import { test, expect } from '@playwright/test';
import { stageTiming } from '../../src/ui/battle-playback';

const skills=['guard','aegis','rally','bulwark','stonearmor','guardstone','halo','sanctuary','brace','spearwall','hold'];
test.skip(process.env.PLAYWRIGHT_PAGES==='true','source-only defense fixture has a separate dev-server gate');
test('defense missing atlas falls back without changing the command',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/assets/fx/defense_fx.*',route=>route.abort());
  await page.goto('tests/browser/fixtures/defense.html?runtime=1&skill=aegis');await page.locator('#start').click();await page.locator('#action-aegis').click();await page.locator('#target-party').click();
  const committed=await page.evaluate(()=>localStorage.getItem('defense-committed'));
  expect(JSON.parse(committed!).commands).toHaveLength(1);expect(await page.evaluate(()=>window.defenseQA.frames())).toEqual([]);
  await page.locator('#skip-turn').click();expect(await page.evaluate(()=>localStorage.getItem('defense-committed'))).toBe(committed);expect(errors).toEqual([]);
});
for(const skill of skills)test(`defense ${skill} uses truthful contact and owned cleanup at 390px`,async({browser},info)=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'}),page=await ctx.newPage(),errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Texture .* has no frame/.test(m.text()))errors.push(m.text());});
  try{
    await page.clock.install({time:new Date('2026-10-26T00:00:00Z')});
    await page.goto(`tests/browser/fixtures/defense.html?runtime=1&skill=${skill}`);await page.locator('#start').click();
    await page.clock.pauseAt(new Date('2026-10-26T01:00:00Z'));
    const turn=(await page.evaluate(()=>window.defenseQA.sequence()))[0]!;
    const cues=(await page.evaluate(()=>window.defenseQA.cues())).filter(c=>c.kind==='cast');
    expect(cues.length).toBeGreaterThan(0);expect(cues.every(c=>c.skill===skill)).toBe(true);
    if(skill==='aegis'||skill==='rally'||skill==='halo')expect(cues).toHaveLength(4);
    if(skill==='bulwark')expect(cues).toHaveLength(2);
    await page.locator(`#action-${skill}`).click();const target=await page.evaluate(()=>window.defenseQA.target());await page.locator(`#target-${target}`).click();
    const committed=await page.evaluate(()=>localStorage.getItem('defense-committed'));
    const timing=stageTiming(turn,false);await page.clock.runFor(timing.contact-1);
    expect((await page.evaluate(()=>window.defenseQA.frames())).some(f=>f.endsWith('_peak'))).toBe(false);
    if(skill==='rally'){
      const prepare=await page.evaluate(()=>window.defenseQA.frames());
      expect(prepare.filter(f=>f==='rally_command_prepare')).toHaveLength(1);
      expect(prepare).not.toContain('rally_prepare');
    }
    await page.clock.runFor(61);
    const peaks=(await page.evaluate(()=>window.defenseQA.painted())).filter(p=>p.frame===`${skill}_peak`);
    expect(peaks).toHaveLength(cues.length);expect(peaks.every(p=>p.alpha>.7)).toBe(true);
    expect(await page.evaluate(()=>window.defenseQA.labelsAbovePaint())).toBe(true);
    if(skill==='rally'){
      expect((await page.evaluate(()=>window.defenseQA.frames())).filter(f=>f==='rally_command_peak')).toHaveLength(1);
      for(const [i,cue]of cues.entries()){
        const foot=(await page.evaluate(id=>window.defenseQA.point(id),cue.targetId)).footY;
        expect(peaks[i]!.y).toBeCloseTo(foot+27);
      }
    }
    if(['stonearmor','aegis'].includes(skill)){
      for(const [i,cue]of cues.entries())expect(peaks[i]!.y).toBeCloseTo((await page.evaluate(id=>window.defenseQA.point(id),cue.targetId)).footY);
    }
    if(['guard','rally','bulwark','guardstone','stonearmor','aegis'].includes(skill))await page.screenshot({path:info.outputPath('runtime-390.png')});
    await page.locator('#skip-turn').click();await page.clock.runFor(6000);
    expect(await page.evaluate(()=>window.defenseQA.frames())).toEqual([]);
    expect(await page.evaluate(()=>localStorage.getItem('defense-committed'))).toBe(committed);
    expect(errors).toEqual([]);
  }finally{await ctx.close();}
});

for(const [skill,scenario,kind]of [
  ['guard','normal','redirect'],['guardstone','stone','redirect'],['aegis','blocked','absorb'],['aegis','partial','absorb'],
  ['sanctuary','save','save'],['brace','counter','counter'],['spearwall','counter','counter'],['hold','counter','counter'],
  ['guard','dodged','none'],['guard','cancelled','none'],
] as const)test(`defense ${skill}/${scenario} follows actual response events`,async({page})=>{
  await page.goto(`tests/browser/fixtures/defense.html?runtime=1&skill=${skill}&scenario=${scenario}`);await page.locator('#start').click();
  const turns=await page.evaluate(()=>window.defenseQA.sequence());
  const index=turns.findIndex(t=>t.side==='enemy');expect(index).toBeGreaterThan(0);
  const turn=turns[index]!,cues=await page.evaluate(i=>window.defenseQA.preview(i),index);
  const frames=await page.evaluate(()=>window.defenseQA.frames());
  if(kind==='none'){
    expect(cues).toEqual([]);expect(frames).toEqual([]);
    expect(turn.events.some(e=>e.type===(scenario==='dodged'?'dodge':'cancel'))).toBe(true);
  }else{
    const cue=cues.find(c=>c.kind===kind);expect(cue).toBeDefined();expect(cue!.event).toEqual(expect.objectContaining({targetId:cue!.targetId}));
    if(kind==='redirect'){
      const damage=turn.events.find(e=>e.type==='damage')!;expect(cue!.targetId).toBe(damage.targetId);
      if(skill==='guard')expect(damage.targetId).not.toBe(turn.intent!.targetId);
      else expect(turn.intent!.stoned).toBe(true);
    }
    if(scenario==='blocked'){expect(turn.events.find(e=>e.type==='damage')!.amount).toBe(0);expect(frames).toContain('absorb');}
    if(scenario==='partial'){const hit=turn.events.find(e=>e.type==='damage')!;expect(hit.amount).toBeGreaterThan(0);expect(hit.absorbed).toBe(8);}
    if(kind==='counter'){expect(frames).toContain('brace_peak');expect(cue!.event.amount).toBeGreaterThan(0);}
    if(kind==='save'){
      expect(turn.after!.heroes.find(h=>h.id==='tracer')!.hp).toBe(1);expect(frames).toContain('sanctuary_peak');
      expect(await page.evaluate(()=>window.defenseQA.bladeFrames())).not.toContain('deflect');
    }
  }
  await page.evaluate(()=>window.defenseQA.stop());await page.waitForTimeout(500);
  expect(await page.evaluate(()=>window.defenseQA.frames())).toEqual([]);
});

for(const skill of skills)test(`defense ${skill} reduced motion is a stable still`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await ctx.newPage();
  try{
    await page.goto(`tests/browser/fixtures/defense.html?runtime=1&skill=${skill}`);await page.locator('#start').click();await page.locator(`#action-${skill}`).click();
    await page.locator(`#target-${await page.evaluate(()=>window.defenseQA.target())}`).click();
    const still=await page.evaluate(()=>window.defenseQA.painted());expect(still.some(p=>p.frame===`${skill}_peak`)).toBe(true);
    await page.waitForTimeout(80);expect(await page.evaluate(()=>window.defenseQA.painted())).toEqual(still);
  }finally{await ctx.close();}
});
for(const skill of ['aegis','rally'])for(const mode of ['fast','reduced','osreduce'])test(`defense ${skill} ${mode} resize preserves the committed result`,async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:mode==='osreduce'?'reduce':'no-preference'}),page=await ctx.newPage();
  try{
    await page.goto(`tests/browser/fixtures/defense.html?runtime=1&skill=${skill}&speed=${mode==='fast'?'fast':'normal'}&intensity=${mode==='reduced'?'reduced':'standard'}`);
    await page.locator('#start').click();await page.locator(`#action-${skill}`).click();await page.locator(`#target-${await page.evaluate(()=>window.defenseQA.target())}`).click();
    const committed=await page.evaluate(()=>localStorage.getItem('defense-committed'));await page.setViewportSize({width:391,height:844});await page.waitForTimeout(1400);
    expect(await page.evaluate(()=>localStorage.getItem('defense-committed'))).toBe(committed);
  }finally{await ctx.close();}
});
