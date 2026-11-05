// One PNG per reference. Portable before/after HTML reuses those files without raster duplication.
const fs=require('node:fs'),path=require('node:path');
const {dir,start,browser,prefix,ready}=require('./runtime.cjs');
(async()=>{const {server,url}=await start(),b=await browser();try{
 const pages=JSON.parse(fs.readFileSync(path.join(dir,'pages.json'))),out=path.join(dir,'export');
 fs.mkdirSync(path.join(out,'before-after'),{recursive:true});const records=[];
 for(const item of pages)for(const [w,h] of item.sizes){
  const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,reducedMotion:'reduce'}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await p.goto(url+prefix+'prototypes/'+item.id+'.html');await ready(p);const stem=item.id+`-${w}x${h}`,name=stem+'.png';await p.screenshot({path:path.join(out,name)});await p.close();
  const before=item.source?`../../before/${w}x${h}/${item.source}.png`:null;
  fs.writeFileSync(path.join(out,'before-after',stem+'.html'),`<!doctype html><html lang="th"><meta charset="utf-8"><title>${item.title} · ก่อน/หลัง</title><link rel="stylesheet" href="../../components.css"><style>:root{--pair-w:${w}px;--pair-h:${h}px}body{display:block;padding:var(--space-4)}main{display:flex;gap:var(--space-4)}figure,img,.missing{width:var(--pair-w);flex-shrink:0}img,.missing{height:var(--pair-h)}img{display:block}figcaption{min-height:var(--space-8);font-size:var(--type-caption)}.missing{background:var(--navy-900);padding:var(--space-4)}</style><body><main><figure><figcaption>ก่อน · ${w}×${h}</figcaption>${before?`<img src="${before}">`:'<div class="missing">ไม่มีภาพก่อน · ต้นแบบจากโค้ด</div>'}</figure><figure><figcaption>หลัง · ${item.variant} · ${w}×${h}</figcaption><img src="../${name}"></figure></main></body></html>`);
  records.push({page:item.id,size:[w,h],dpr:2,file:'export/'+name,comparison:'export/before-after/'+stem+'.html',errors});
 }
 const p=await b.newPage({viewport:{width:1200,height:1000},deviceScaleFactor:2,reducedMotion:'reduce'});await p.goto(url+prefix+'components.html');await ready(p);await p.screenshot({path:path.join(dir,'components_sheet.png'),fullPage:true});await p.close();
 fs.writeFileSync(path.join(dir,'render-report.json'),JSON.stringify({revision:'R2-review',engine:'Chromium',realDevices:false,dpr:2,records},null,2)+'\n');await require('./render_decisions.cjs')();console.log('Exported',records.length,'unique after references; comparisons are HTML');
 }finally{await b.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
