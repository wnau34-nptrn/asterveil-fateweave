/* global document, localStorage */
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {Buffer} from 'node:buffer';
import {fileURLToPath,URL} from 'node:url';
import process from 'node:process';
import {log} from 'node:console';

const out=fileURLToPath(new URL('.',import.meta.url));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE??'/usr/bin/chromium',args:['--no-sandbox']});
try{
  const page=await browser.newPage({viewport:{width:390,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/docs/combat-presentation/rally-r3/index.html');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  if(await page.locator('#board canvas').count()!==3)throw new Error('Missing phases');
  const result=await page.evaluate(()=>{
    const c=[...document.querySelectorAll('#board canvas')],poster=document.createElement('canvas');poster.width=1170;poster.height=950;
    const x=poster.getContext('2d');x.fillStyle='#101c30';x.fillRect(0,0,1170,950);
    ['01 · รวมพลัง','02 · แผ่แสงที่พื้นตั้งรับ','03 · สลาย'].forEach((label,i)=>{
      x.fillStyle='#17243a';x.fillRect(i*390,0,390,62);x.fillStyle='#edf1fb';x.font='bold 16px system-ui';x.fillText(label,i*390+16,27);
      x.fillStyle='#b6c2d5';x.font='12px system-ui';x.fillText('Rally R3 · artwork ใหม่ บนสนามจริง390px',i*390+16,48);x.drawImage(c[i],i*390,62);
    });
    x.fillStyle='#bdc9dd';x.font='12px system-ui';x.fillText('ข้อเสนอภาพนิ่ง · HP/UI คงเดิม · ยังไม่แทน runtime',16,932);
    return {poster:poster.toDataURL(),peak:c[1].toDataURL()};
  });
  writeFileSync(out+'rally-board.png',Buffer.from(result.poster.split(',')[1],'base64'));
  writeFileSync(out+'rally-peak-390.png',Buffer.from(result.peak.split(',')[1],'base64'));
  await page.locator('#toggle').click();
  if(await page.locator('#board canvas').nth(1).evaluate(c=>c.toDataURL())===result.peak)throw new Error('Bare comparison failed');
  await page.locator('#reset').click();await page.locator('#weight').focus();await page.keyboard.press('Home');
  if(await page.locator('#weight').inputValue()!=='60')throw new Error('Weight control failed');
  await page.locator('#reset').click();
  if(await page.locator('#board canvas').nth(1).evaluate(c=>c.toDataURL())!==result.peak)throw new Error('Reset drift');
  await page.locator('[data-phase="1"]').click();
  if(await page.locator('.scroll').evaluate(e=>e.scrollLeft)!==390)throw new Error('Phase navigation failed');
  if(await page.evaluate(()=>localStorage.length)!==0||errors.length)throw new Error(JSON.stringify(errors));
  log('PASS: three native390px phases, bare/weight/reset/phase controls, read-only preview, no page errors');
}finally{await browser.close();}
