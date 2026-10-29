import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test.skip(process.env.UNIT_A4_PLAYER!=='1','delivery player verification only');
test('A4 all retained MP4s decode in the 390px player',async({page})=>{
 test.setTimeout(90000);
 const clips=JSON.parse(readFileSync('docs/combat-presentation/unit-a4-slice/clips.json','utf8')) as {file:string;duration:number}[];
 await page.setViewportSize({width:390,height:844});await page.goto('docs/combat-presentation/unit-a4-slice/index.html');
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));expect(clips).toHaveLength(20);
 for(const c of clips){
  await page.locator('#clip-select').selectOption(c.file);
  await expect.poll(()=>page.locator('video').evaluate(v=>(v as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
  const actual=await page.locator('video').evaluate(async(v)=>{const video=v as HTMLVideoElement;await video.play();video.currentTime=Math.max(0,video.duration-.1);await new Promise<void>(r=>video.addEventListener('seeked',()=>r(),{once:true}));video.pause();return {duration:video.duration,w:video.videoWidth,h:video.videoHeight,error:video.error?.message??null};});
  expect(actual.error).toBeNull();expect(actual.w).toBe(390);expect(actual.h).toBe(844);expect(actual.duration).toBeCloseTo(c.duration,2);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
