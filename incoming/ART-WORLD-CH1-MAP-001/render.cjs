// Preview-only DOM compositor. NODE_PATH must contain Playwright.
const fs=require('node:fs'), path=require('node:path');
const {chromium}=require('playwright');
const dir=__dirname;
const data=JSON.parse(fs.readFileSync(path.join(dir,'region_ch1.json'),'utf8'));
const b64=(file,type)=>`data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
const map=b64(path.join(dir,'region_ch1.webp'),'image/webp');
const fog=b64(path.join(dir,'region_ch1_fog.webp'),'image/webp');
const root=path.resolve(dir,'../..');
const thai=b64(path.join(root,'public/assets/fonts/noto-sans-thai-400.woff2'),'font/woff2');
const head=b64(path.join(root,'public/assets/fonts/kanit-600.woff2'),'font/woff2');
const cutoff=data.nodes[3].fogRect.y+data.nodes[3].fogRect.height;
const nodes=data.nodes.map(n=>{
  const state=n.id===1?'cleared':n.id===2?'current':n.id===3?'open':'locked';
  const icon=n.id===1?'✓':n.id<=3?n.id:'<svg viewBox="0 0 24 24"><path d="M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4"/></svg>';
  const left=n.x/1080*390, top=n.y/2340*845;
  return `<div class="node ${state}" style="left:${left}px;top:${top}px"><span class="circle">${icon}</span><span class="label" style="transform:translateX(${Math.max(-left+8,Math.min(-70,382-left-140))}px)">${n.name}</span>${n.id===1?'<span class="stars">★★★</span>':''}</div>`;
}).join('');
const html=`<!doctype html><html lang="th"><meta charset="utf-8"><style>
@font-face{font-family:Thai;src:url('${thai}')}@font-face{font-family:Kanit;src:url('${head}');font-weight:600}
*{box-sizing:border-box}html,body{margin:0;background:#08121f;color:#f4f7fc;font-family:Thai,sans-serif}body{display:grid;place-items:center;min-height:100vh}.phone{position:relative;width:390px;height:960px;overflow:hidden;background:#08121f;box-shadow:0 0 0 1px #d9bf8666,0 24px 90px #0008}header{height:64px;padding:9px 16px;background:#08121f;display:flex;align-items:center;gap:12px}h1{font:600 20px Kanit;margin:0;color:#f2d596}header p{font-size:11px;margin:0;color:#bbcadb}.back,.info{width:44px;height:44px;border:1px solid #d9bf8666;border-radius:12px;display:grid;place-items:center;background:#14243a;font:22px Thai}.info{margin-left:auto}.map{position:relative;height:845px;background-image:url('${map}');background-size:100% 100%;overflow:hidden}.fog{position:absolute;inset:0;background:#0d1c2e url('${fog}') center/100% 100%;mask-image:linear-gradient(to bottom,#000 0px,#000 ${cutoff*845/2340-12}px,transparent ${cutoff*845/2340+12}px)}.node{position:absolute;width:0;height:0;--edge:#8b91a6}.circle{position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;border:2px solid var(--edge);background:#0d1c2e;display:grid;place-items:center;font:600 16px Kanit;color:var(--edge);box-shadow:0 3px 7px #0008}.circle svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.7}.label{position:absolute;top:26px;width:140px;text-align:center;font-size:12px;line-height:18px;padding:2px 4px;border-radius:5px;background:#08121ff5;white-space:nowrap}.cleared .label{top:-65px}.cleared{--edge:#68e5b6}.current{--edge:#74d4ef}.current .circle{outline:2px solid #74d4ef;outline-offset:4px}.open{--edge:#d9bf86}.stars{position:absolute;top:-37px;left:-21px;width:44px;color:#f2d596;font-size:12px;text-align:center;letter-spacing:1px}footer{height:51px;display:flex;align-items:center;justify-content:space-between;padding:7px 16px;background:#08121f;font-size:12px;color:#bbcadb}.badge{border:1px solid #b59aff;border-radius:8px;padding:5px 9px;color:#d3c3ff;background:#201b35}
</style><main class="phone"><header><span class="back">‹</span><div><h1>เลือกแผนที่</h1><p>บทที่ 1 · แอสเตอร์เวล</p></div><span class="info" style="font-family:sans-serif">i</span></header><div class="map"><div class="fog"></div>${nodes}</div><footer><span>✓ ผ่านแล้ว　◉ จุดปัจจุบัน</span><span class="badge">โหมดท้าทาย</span></footer></main></html>`;
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:390,height:960},deviceScaleFactor:1});
 await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:path.join(dir,'preview_390.png')});
 await page.setViewportSize({width:1366,height:1050});
 await page.screenshot({path:path.join(dir,'preview_1366.png')});
 const check=await page.locator('.label').evaluateAll(labels=>labels.map(e=>({text:e.textContent,fits:e.scrollWidth<=e.clientWidth})));
 if(check.some(x=>!x.fits))throw new Error(JSON.stringify(check));
 console.log(JSON.stringify({thaiFontLoaded:await page.evaluate(()=>document.fonts.check('12px Thai')),labels:check,nodeCount:await page.locator('.node').count()},null,2));
 await browser.close();
 const report=JSON.parse(fs.readFileSync(path.join(dir,'validation.json'),'utf8'));
 for(const f of report.files)f.bytes=fs.statSync(path.join(dir,f.file)).size;
 for(const [file,size] of [['preview_390.png',[390,960]],['preview_1366.png',[1366,1050]]]){const entry={file,size,mode:'RGB',bytes:fs.statSync(path.join(dir,file)).size,alphaRange:null};const i=report.files.findIndex(x=>x.file===file);if(i<0)report.files.push(entry);else report.files[i]=entry;}
 report.previewRenderer='Chromium DOM with bundled OFL Noto Sans Thai 400 and Kanit 600';
 report.previewLabelChecks=check;
 fs.writeFileSync(path.join(dir,'validation.json'),JSON.stringify(report,null,2)+'\n');
})().catch(e=>{console.error(e);process.exit(1)});
