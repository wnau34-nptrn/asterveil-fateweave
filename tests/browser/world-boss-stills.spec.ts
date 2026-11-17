import {test, expect} from '@playwright/test';
import manifest from '../../src/game/visuals/unit-atlases.json' with {type:'json'};

test.skip(process.env.PLAYWRIGHT_PAGES === 'true', 'source fixture explicitly checked in CI');
test.use({viewport:{width:390,height:844}, reducedMotion:'reduce'});

for (const [name, intent, cell] of [['kragmor','Stone Fist',0], ['valdrakk','Shard Talon',1], ['morvane','Severing Bolt',2]] as const) {
  test(`${name} keeps its own still/portrait and stable geometry while the optional atlas loads`, async ({page}, info) => {
    let release!:()=>void;
    const held = new Promise<void>(resolve=>release=resolve), errors:string[]=[];
    page.on('pageerror', error=>errors.push(error.message));
    await page.route(`**/${manifest[name].image}`, async route=>{await held; await route.continue();});
    try {
      await page.goto(`tests/browser/fixtures/unit-a9.html?foe=foe_${name}&intent=${encodeURIComponent(intent)}`);
      await expect(page.locator('#start')).toBeEnabled();
      await expect.poll(()=>page.evaluate(()=>window.unitA9QA.frames().f1?.[0]?.texture)).toBe('battle-worldboss');
      const portrait = page.locator(`.portrait[data-actor=foe_${name}]`).first();
      await expect(portrait.locator('img')).toHaveAttribute('src', /portraits_worldboss\.webp\?v=/);
      await expect(portrait).toHaveCSS('--portrait-x', String(cell % 2));
      await expect(portrait).toHaveCSS('--portrait-y', String(Math.floor(cell / 2)));
      expect(await portrait.locator('img').evaluate((img:HTMLImageElement)=>img.complete && img.naturalWidth === 512)).toBe(true);
      await page.locator('#start').click();
      const before = await page.evaluate(()=>({state:window.unitA9QA.state(), geometry:window.unitA9QA.geometry(), frame:window.unitA9QA.frames().f1![0]!}));
      expect(Number(before.frame.frame)).toBe(cell);
      expect(before.frame.originY).toBe(.875);
      await page.screenshot({path:info.outputPath(`${name}-fallback-390.png`)});
      release();
      await expect.poll(()=>page.evaluate(()=>window.unitA9QA.frames().f1?.[0]?.texture)).toBe(`unit-pilot-${name}`);
      const after = await page.evaluate(()=>({state:window.unitA9QA.state(), geometry:window.unitA9QA.geometry(), frame:window.unitA9QA.frames().f1![0]!}));
      expect(after.state).toEqual(before.state);
      expect(after.frame.width).toBeCloseTo(before.frame.width, 5);
      expect(after.frame.originY).toBe(before.frame.originY);
      for (const key of ['x','y'] as const) expect(after.geometry.anchor![key]).toBeCloseTo(before.geometry.anchor![key], 5);
      for (const key of ['left','top','right','bottom'] as const) expect(Math.abs(after.geometry.figure![key]-before.geometry.figure![key])).toBeLessThan(3);
      await page.screenshot({path:info.outputPath(`${name}-loaded-390.png`)});
      expect(errors).toEqual([]);
    } finally {release();}
  });

  test(`${name} remains playable with its own still after an optional atlas failure`, async ({page}) => {
    let requests=0;
    await page.route(`**/${manifest[name].image}`, route=>{requests++; return route.fulfill({status:503,body:''});});
    await page.goto(`tests/browser/fixtures/unit-a9.html?foe=foe_${name}&intent=${encodeURIComponent(intent)}`);
    await expect(page.locator('#start')).toBeEnabled();
    await page.locator('#start').click();
    await page.locator('#action-attack').click();
    await page.locator('#target-f1').click();
    await expect(page.locator('#skip-turn')).toBeHidden();
    expect(await page.evaluate(()=>window.unitA9QA.state())).toEqual(await page.evaluate(()=>window.unitA9QA.expected()));
    expect(await page.evaluate(()=>window.unitA9QA.frames().f1![0]!.texture)).toBe('battle-worldboss');
    expect(requests).toBe(1);
  });
}
