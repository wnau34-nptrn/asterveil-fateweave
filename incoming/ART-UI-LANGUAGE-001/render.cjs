// Repeatable DPR-2 reference export. Run: node incoming/ART-UI-LANGUAGE-001/render.cjs
const fs=require('node:fs'),path=require('node:path');
const {dir,start,browser,prefix,ready}=require('./runtime.cjs');
(async()=>{const {server,url}=await start(),b=await browser();try{
 const pages=JSON.parse(fs.readFileSync(path.join(dir,'pages.json'))),out=path.join(dir,'export');
 fs.mkdirSync(path.join(out,'before-after'),{recursive:true});const records=[];
 for(const item of pages){for(const [w,h] of item.sizes){
  const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,reducedMotion:'reduce'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await p.goto(url+prefix+'prototypes/'+item.id+'.html');await ready(p);
  const name=item.id+`-${w}x${h}.png`;await p.screenshot({path:path.join(out,name)});
  records.push({page:item.id,size:[w,h],dpr:2,file:'export/'+name,errors});
  const before=item.source?`before/${w}x${h}/${item.source}.png`:null;
  if(before&&!fs.existsSync(path.join(dir,before)))throw Error('Missing before '+before);
  const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
  await p.setViewportSize({width:w*2+48,height:h+80});
  await p.setContent(`<!doctype html><html lang="th"><head><link rel="stylesheet" href="${url+prefix}components.css"><style>:root{--compare-w:${w}px;--compare-h:${h}px;--compare-total:${w*2+48}px}body{display:block;padding:var(--space-4);width:var(--compare-total)}main{display:flex;gap:var(--space-4)}figure{width:var(--compare-w)}figcaption{height:var(--space-8);font-size:var(--type-caption)}img,.missing{display:block;width:var(--compare-w);height:var(--compare-h);background:var(--navy-900)}.missing{padding:var(--space-4)}</style></head><body><main><figure><figcaption>ก่อน · ${w}×${h}${before?' · ฐาน dd99b38d':' · ไม่มีภาพก่อน'}</figcaption>${before?`<img src="${url+prefix+before}">`:'<div class="missing">ไม่มีภาพก่อน · ต้นแบบจากโค้ด</div>'}</figure><figure><figcaption>หลัง · ${esc(item.title)} · ${item.variant} · ${w}×${h}</figcaption><img src="${url+prefix+'export/'+name}"></figure></main></body></html>`);
  await ready(p);await p.screenshot({path:path.join(out,'before-after',name)});await p.close();
 }}
 const p=await b.newPage({viewport:{width:1200,height:1000},deviceScaleFactor:2,reducedMotion:'reduce'});await p.goto(url+prefix+'components.html');await ready(p);await p.screenshot({path:path.join(dir,'components_sheet.png'),fullPage:true});await p.screenshot({path:path.join(out,'components_sheet.png'),fullPage:true});await p.close();
 fs.writeFileSync(path.join(dir,'render-report.json'),JSON.stringify({engine:'Chromium',realDevices:false,dpr:2,records},null,2)+'\n');console.log('Exported',records.length,'pages and before/after pairs');
 }finally{await b.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
