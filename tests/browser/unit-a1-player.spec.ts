import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test.skip(process.env.UNIT_A1_PLAYER!=='1','separate delivered media verification only');
test('A1 all16 real clips decode and player controls fit390px',async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width:390,height:844});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const clips=JSON.parse(readFileSync('docs/combat-presentation/unit-a1-slice/clips.json','utf8')) as {file:string}[];expect(clips).toHaveLength(16);
 await page.goto('docs/combat-presentation/unit-a1-slice/index.html');
 for(const c of clips){
  const [skill,mode]=c.file.split('-');await page.locator('#skill').selectOption(skill!);await page.locator('#mode').selectOption(mode!);
  await expect(page.locator('video')).toHaveAttribute('src',c.file);
  await page.locator('video').evaluate(async(v:HTMLVideoElement)=>{await v.play();});
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.02);
  expect(await page.locator('video').evaluate((v:HTMLVideoElement)=>({w:v.videoWidth,h:v.videoHeight,error:v.error?.message}))).toEqual({w:390,h:844,error:undefined});
  await page.locator('video').evaluate((v:HTMLVideoElement)=>v.pause());
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
