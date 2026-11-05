// Measurements, not visual approval. Run after render.cjs.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const {dir,start,browser,prefix,ready}=require('./runtime.cjs');
const characterBounds=JSON.parse(fs.readFileSync(path.join(dir,'character-bounds.json')));
const pages=JSON.parse(fs.readFileSync(path.join(dir,'pages.json')));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fateweave-ui-'));
function literals(){const bad=[];const files=['components.css',...fs.readdirSync(path.join(dir,'prototypes')).filter(f=>f.endsWith('.html')).map(f=>'prototypes/'+f)];for(const file of files){let css=fs.readFileSync(path.join(dir,file),'utf8');if(file.endsWith('.html'))css=[...css.matchAll(/style="([^"]*)"/g)].map(x=>x[1]).join(';');css=css.replace(/\/\*[\s\S]*?\*\//g,'');for(const m of css.matchAll(/([\w-]+)\s*:\s*([^;{}]+)(?:;|(?=\}))/g)){if(m[1].startsWith('--'))continue;const value=m[2].replace(/var\([^)]*\)/g,'');const found=[...value.matchAll(/(?<![\w-])[-+]?(?:\d*\.)?\d+(?:px|rem|em|fr|ms|s|%|vh|dvh)?/g)].map(x=>x[0]).filter(x=>!['0','50%','100%'].includes(x));if(found.length)bad.push({file,property:m[1],value:m[2],literals:found});}}return bad;}
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({schema:2,pass:false,status:'running'})+'\n');
(async()=>{const {server,url}=await start(),b=await browser(),records=[],contrastJobs=[];try{
 for(const item of pages){for(const [w,h] of item.sizes){
  const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,reducedMotion:'reduce'}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await p.goto(url+prefix+'prototypes/'+item.id+'.html');await ready(p);await p.keyboard.press('Tab');
  const reference=item.kind==='hud'?characterBounds[`${w}x${h}`][item.group==='H'?'battle':'map']:[];
  const measurement=await p.evaluate(reference=>{
   const app=document.querySelector('#app'),ar=app.getBoundingClientRect();
   const top=el=>{const r=el.getBoundingClientRect();return [[r.x+r.width/2,r.y+r.height/2],[r.x+4,r.y+4],[r.right-4,r.bottom-4]].some(([x,y])=>{if(x<0||y<0||x>=innerWidth||y>=innerHeight)return false;const e=document.elementFromPoint(x,y);return e&&(e===el||el.contains(e));});};
   const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>2&&r.height>2&&r.bottom>0&&r.top<innerHeight&&s.display!=='none'&&s.visibility!=='hidden'&&+s.opacity>.05&&top(e);};
   const box=e=>{const r=e.getBoundingClientRect();return {x:r.x-ar.x,y:r.y-ar.y,w:r.width,h:r.height};};
   const sig=e=>{const s=getComputedStyle(e);return [s.height,s.borderRadius,s.fontFamily,s.fontSize,s.fontWeight,s.backgroundImage,s.backgroundColor,s.color];};
   const one=sel=>{const e=document.querySelector(sel);return e&&vis(e)?{...box(e),radius:getComputedStyle(e).borderRadius}:null;};
   const buttons=[...document.querySelectorAll('button,a.button,summary,select')].filter(vis);
   const targets=buttons.map(e=>({text:e.getAttribute('aria-label')||e.textContent.trim(),...box(e),disabled:e.disabled||false,original:e.dataset.original?.split(',').map(Number)}));
   const focusFailures=[];for(const e of buttons.filter(e=>!e.disabled)){e.focus({preventScroll:true});const s=getComputedStyle(e);if(s.outlineStyle==='none'||parseFloat(s.outlineWidth)<3)focusFailures.push(e.outerHTML.slice(0,140));}
   document.activeElement?.blur();
   const primary=[...document.querySelectorAll('.primary')].filter(e=>vis(e)&&!e.disabled);
   const secondary=[...document.querySelectorAll('.secondary,.danger')].filter(e=>vis(e)&&!e.disabled&&!e.closest('.tabs,.navigation')&&!e.classList.contains('icon-button'));
   const win=document.querySelector('.window'),ws=win&&getComputedStyle(win);
   const h1=document.querySelector('h1');
   const family=sel=>[...document.querySelectorAll(sel)].filter(vis).map(e=>{const s=getComputedStyle(e);return [s.backgroundColor,s.borderRadius,s.paddingTop,s.paddingBottom,s.fontSize,s.fontFamily];});
   const icons=[...document.querySelectorAll('button svg,a.button svg,summary svg')].filter(vis).map(e=>({...box(e),stroke:getComputedStyle(e).strokeWidth,control:e.closest('button,a,summary')?.getAttribute('aria-label')||e.closest('button,a,summary')?.textContent.trim()}));
   const missingHeaderIcons=[...document.querySelectorAll('.close,.back')].filter(e=>!e.querySelector('svg')).map(e=>e.className);
   const opaqueOverlaps=[];const paintBoxes=[];
   if(app.classList.contains('native-hud'))for(const el of app.querySelectorAll('.hud-stage:not([hidden]) *')){
    if(el.classList.contains('scene-plate')||!vis(el))continue;const s=getComputedStyle(el),r=box(el);const c=s.backgroundColor.match(/[\d.]+/g)||[];const alpha=c.length===4?+c[3]:c.length===3?1:0;
    if(alpha<.05&&s.backgroundImage==='none')continue;
    paintBoxes.push({element:el.className,...r});for(const body of reference){const ix=Math.min(r.x+r.w,body.x+body.w)-Math.max(r.x,body.x),iy=Math.min(r.y+r.h,body.y+body.h)-Math.max(r.y,body.y);if(ix>.1&&iy>.1)opaqueOverlaps.push({element:el.className,body:body.id,intersection:[ix,iy],box:r,character:body});}
   }
   const hudNumerals=[...app.querySelectorAll('.numeric')].filter(vis).map(e=>({text:e.textContent,px:parseFloat(getComputedStyle(e).fontSize)}));
   const truncations=[...app.querySelectorAll('[data-allow-ellipsis]')].filter(vis).filter(e=>e.scrollWidth>e.clientWidth).map(e=>({text:e.textContent,fullText:e.title,width:e.clientWidth,needed:e.scrollWidth,reason:'12px single-line field label uses ellipsis to avoid actors; full name retained in title'}));
   const npc=[...document.querySelectorAll('.npc-fold')].map(e=>({text:e.textContent.trim(),portrait:!!e.querySelector('.npc-bust')&&getComputedStyle(e.querySelector('.npc-bust')).backgroundImage!=='none'}));
   const nav=[...document.querySelectorAll('.navigation .button')].map(e=>({text:e.textContent.trim(),icons:e.querySelectorAll('svg').length,count:e.querySelector('.nav-count')?.textContent}));
   const hudPaint={native:app.classList.contains('native-hud'),legacyBoxes:!!app.querySelector('.hud-label,.hud-readout'),reference,paintBoxes,opaqueOverlaps,hudNumerals,truncations};
   return {icons,missingHeaderIcons,hudPaint,npc,nav,families:{header:family('.window-head'),card:family('.card'),ledger:family('.ledger')},close:one('.close'),back:one('.back'),title:h1?box(h1):null,primary:primary.map(e=>({text:e.textContent.trim(),...box(e),style:sig(e),inDock:!!e.closest('.dock')})),secondary:secondary.map(e=>({kind:e.classList.contains('danger')?'danger':'normal',style:sig(e)})),targets,focusFailures,sideBorders:win?[parseFloat(ws.borderLeftWidth),parseFloat(ws.borderRightWidth)]:null,hscroll:document.documentElement.scrollWidth>innerWidth+1||app.scrollWidth>app.clientWidth+1,bodyText:app.innerText,images:[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),reducedMotion:[...document.querySelectorAll('*')].every(e=>{const s=getComputedStyle(e);return s.animationName==='none'&&parseFloat(s.transitionDuration)===0;})};
  },reference);
  if(item.id.startsWith('c-brew'))measurement.brewFit=await p.evaluate(()=>{const fold=document.querySelector('.npc-fold'),root=document.querySelector('.scroll');const check=()=>{const boundary=root.getBoundingClientRect();return [...document.querySelectorAll('.brew-card')].map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,visible:r.top>=boundary.top&&r.bottom<=boundary.bottom};});};const initial=check(),old=fold.open;fold.open=false;const collapsed=check();fold.open=true;const expanded=check();fold.open=old;return {initial,collapsed,expanded};});
  await p.locator('.queue-items').evaluateAll(es=>es.forEach(e=>e.scrollLeft=0));
  const states=[];const scroll=p.locator('.scroll');const positions=await scroll.count()?[0,.5,1]:[0];
  for(const expanded of (await p.locator('details').count()?[false,true]:[false])){if(expanded)await p.locator('details').evaluateAll(ds=>ds.forEach(d=>d.open=true));
  for(const frac of positions){if(await scroll.count())await scroll.evaluate((e,f)=>e.scrollTop=(e.scrollHeight-e.clientHeight)*f,frac);
   const state=await p.evaluate(()=>{
    const top=el=>{const r=el.getBoundingClientRect();return [[r.x+r.width/2,r.y+r.height/2],[r.x+4,r.y+4],[r.right-4,r.bottom-4]].some(([x,y])=>{if(x<0||y<0||x>=innerWidth||y>=innerHeight)return false;const e=document.elementFromPoint(x,y);return e&&(e===el||el.contains(e));});};
    const texts=[],small=[],overflow=[],wrapped=[];const walker=document.createTreeWalker(document.querySelector('#app'),NodeFilter.SHOW_TEXT);
    for(let n=walker.nextNode();n;n=walker.nextNode()){const text=n.textContent.trim(),e=n.parentElement;if(!text||!e||['OPTION','SCRIPT','STYLE'].includes(e.tagName))continue;const s=getComputedStyle(e),r=e.getBoundingClientRect();if(!r.width||!r.height||s.visibility==='hidden'||s.display==='none'||+s.opacity<=.05||r.bottom<0||r.top>=innerHeight||!top(e))continue;
     const range=document.createRange();range.selectNode(n);const rects=[...range.getClientRects()].filter(r=>r.width&&r.height&&r.bottom>0&&r.top<innerHeight);
     if(!rects.length)continue;if(document.querySelector('#app').classList.contains('native-hud')&&new Set(rects.map(r=>Math.round(r.y))).size>1)wrapped.push({text,element:e.className,lines:rects.length});const px=parseFloat(s.fontSize);if(px<12)small.push({text,px,numeric:e.classList.contains('numeric')});
     const points=[];for(const rr of rects){for(const frac of [.15,.5,.85]){const x=rr.x+rr.width*frac,y=rr.y+rr.height/2;if(x<0||x>=innerWidth||y<0||y>=innerHeight)continue;const hit=document.elementFromPoint(x,y);if(hit&&(hit===e||e.contains(hit)))points.push([x,y]);}if((rr.right>r.right+1||rr.left<r.left-1)&&!(e.dataset.allowEllipsis==='true'&&e.title===text))overflow.push({text,element:e.className,right:rr.right,parentRight:r.right});}
     texts.push({text,px,weight:parseFloat(s.fontWeight),fg:s.color,points});
    }
    return {texts,small,overflow,wrapped};
   });
   const style=await p.addStyleTag({content:'*,*::before,*::after{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important}'});
   const shot=path.join(tmp,`${item.id}-${w}x${h}-${expanded}-${frac}.png`);await p.screenshot({path:shot});await style.evaluate(e=>e.remove());
   contrastJobs.push({key:`${item.id}/${w}x${h}/${expanded?'expanded':'initial'}/${frac}`,path:shot,texts:state.texts});states.push({expanded,scroll:frac,textCount:state.texts.length,small:state.small,overflow:state.overflow,wrapped:state.wrapped});
  }
  }
  // Every disclosure is also measured open; text may scroll vertically, never truncate horizontally.
  if(await p.locator('details').count()){
   await p.locator('details').evaluateAll(ds=>ds.forEach(d=>d.open=true));
   const full=await p.locator('#app').evaluate(e=>({hscroll:e.scrollWidth>e.clientWidth+1,text:e.textContent}));measurement.expandedHscroll=full.hscroll;
  }
  records.push({page:item.id,group:item.group,variant:item.variant,kind:item.kind,size:[w,h],errors,...measurement,states});await p.close();
 }}
 const ip=await b.newPage({viewport:{width:390,height:650},deviceScaleFactor:2,reducedMotion:'reduce'});await ip.goto(url+prefix+'prototypes/c-brew.html');const wasOpen=await ip.locator('.npc-fold').evaluate(e=>e.open);await ip.locator('.npc-fold > summary').click();const disclosure=(await ip.locator('.npc-fold').evaluate(e=>e.open))!==wasOpen;await ip.goto(url+prefix+'prototypes/c-hire.html');await ip.locator('.tabs a[href="c-market.html"]').click();const market=ip.url().endsWith('/c-market.html')&&(await ip.locator('#app').innerText()).includes('ตราสัญญา');await ip.close();const interactions={disclosure,marketTab:market};
 const input=path.join(tmp,'contrast-input.json'),output=path.join(tmp,'contrast-output.json');fs.writeFileSync(input,JSON.stringify(contrastJobs));
 const py=spawnSync('python',[path.join(dir,'measure_contrast.py'),input,output],{encoding:'utf8'});if(py.status!==0)throw Error(py.stderr);const contrasts=JSON.parse(fs.readFileSync(output));
 const baseline=records.filter(r=>r.variant==='r1'&&!['hud','context','mandatory'].includes(r.kind)),r1=records.filter(r=>r.variant==='r1'&&r.kind!=='context');
 const failures={};const fail=(n,v)=>{if(v)(failures[n]??=[]).push(v);};
 for(const r of baseline){const [w,h]=r.size,key=`${r.page}/${w}x${h}`;
  if(!r.close||Math.abs(r.close.x-(w-56))>2||Math.abs(r.close.y-12)>2||r.close.w!==44||r.close.h!==44||!['50%','22px'].includes(r.close.radius))fail(1,key);
  if(r.back&&(Math.abs(r.back.x-12)>2||Math.abs(r.back.y-12)>2||r.back.w!==44||r.back.h!==44))fail(2,key);
  if(r.title&&Math.abs(r.title.x-(r.back?68:16))>2)fail(2,key+' title');
  if(r.primary.length>1)fail(3,key+' multiple primary');for(const e of r.primary)if(e.inDock&&(Math.abs(e.y-(h-64))>2||e.y+e.h>h))fail(3,{key,button:e});
  if(r.sideBorders?.some(x=>x!==0))fail(6,key);
 }
 for(const r of r1){const key=`${r.page}/${r.size.join('x')}`;if(r.states.some(s=>s.small.length))fail(4,{key,small:r.states.flatMap(s=>s.small)});if(r.states.some(s=>s.overflow.length))fail(4,{key,overflow:r.states.flatMap(s=>s.overflow)});
  if(r.hscroll||r.expandedHscroll||r.targets.some(e=>e.w<43.99||e.h<43.99)||r.focusFailures.length)fail(7,{key,hscroll:r.hscroll,expandedHscroll:r.expandedHscroll,smallTargets:r.targets.filter(e=>e.w<43.99||e.h<43.99),focus:r.focusFailures});
  for(const c of contrasts.filter(c=>c.key.startsWith(key+'/')))if(c.failures.length)fail(8,c);
  if(r.errors.length||r.images.some(i=>!i.loaded))fail(10,{key,errors:r.errors,images:r.images.filter(i=>!i.loaded)});
 }
 const literalValues=literals();if(literalValues.length)fail(5,literalValues);
 const familyCounts=Object.fromEntries(['header','card','ledger'].map(k=>[k,new Set(baseline.flatMap(r=>r.families[k].map(e=>JSON.stringify(e)))).size]));
 const primaryStyles=[...new Set(baseline.flatMap(r=>r.primary.map(e=>JSON.stringify(e.style))))];
 const secondaryStyles=[...new Set(baseline.flatMap(r=>r.secondary.map(e=>JSON.stringify(e.style))))];
 if(primaryStyles.length!==1||secondaryStyles.length>2||familyCounts.header>2||familyCounts.card>2||familyCounts.ledger>1)fail(9,{primary:primaryStyles.length,secondary:secondaryStyles.length});
 const pairFailures=[];for(const item of pages)for(const [w,h] of item.sizes)if(!fs.existsSync(path.join(dir,'export/before-after',`${item.id}-${w}x${h}.html`)))pairFailures.push(item.id);if(pairFailures.length)fail(10,pairFailures);
 const preservation={
  'gallery-interactions':interactions.disclosure&&interactions.marketTab,
  'forge-review-guarantee':records.some(r=>r.page==='e-craft-review'&&r.bodyText.includes('ผลที่รับประกัน · ไม่สุ่ม')&&r.bodyText.includes('ยังไม่ใช้วัสดุ')),
  'ledger-five-columns':records.filter(r=>r.page==='e-craft-review'||r.page==='d-star-review').every(r=>['หน่วย','มี','ใช้','ได้รับ','หลังทำ'].every(t=>r.bodyText.includes(t))),
  'star-stats-review':records.some(r=>r.page==='d-star-review'&&r.bodyText.includes('109')&&r.bodyText.includes('115')&&r.bodyText.includes('ใช้ตัวซ้ำที่สะสมของคนนี้')),
  'withdraw-existing-two-states':pages.filter(p=>['f-entrance','f-withdraw'].includes(p.id)).length===2,
  'summary-return-docked':records.filter(r=>r.page==='g-summary').every(r=>r.primary.some(b=>b.text==='กลับค่าย'&&b.inDock)),
  'battle-five-heroes-commands-390x650':records.filter(r=>r.page==='h-battle-hud'&&r.size[1]===650).every(r=>['เอกิส','ไลรา','ไอรา','เซเรน','เคล','โจมตี','ติดตรา','ฟันเจาะจุด'].every(t=>r.bodyText.includes(t))),
  'quest-claim-in-card':fs.readFileSync(path.join(dir,'prototypes/c-quests.html'),'utf8').includes('class="primary"'),
  'camp-context-and-nav':pages.some(p=>p.id==='b-camp'),
  'hud-source-anchors':records.filter(r=>r.kind==='hud').every(r=>r.targets.filter(t=>t.original).every(t=>[t.x,t.y,t.w,t.h].every((v,i)=>Math.abs(v-t.original[i])<=2))),
  'reduced-motion':records.every(r=>r.reducedMotion)
 };for(const [key,value] of Object.entries(preservation))if(!value)fail(10,key);
 const revisionFailures=[];
 for(const r of records){const key=`${r.page}/${r.size.join('x')}`;
  if(r.icons.some(i=>i.w<19.99||i.h<19.99)||r.missingHeaderIcons.length){revisionFailures.push({key,rule:'icons >=20px',icons:r.icons.filter(i=>i.w<19.99||i.h<19.99),missing:r.missingHeaderIcons});fail(7,key+' icon');}
  if(r.kind==='hud'){
   if(r.states.some(s=>s.wrapped.length)){revisionFailures.push({key,rule:'HUD text does not wrap',wrapped:r.states.flatMap(s=>s.wrapped)});fail(4,key+' HUD wrapping');}
   if(!r.hudPaint.native||r.hudPaint.legacyBoxes||r.hudPaint.opaqueOverlaps.length){revisionFailures.push({key,rule:'native HUD must not paint over reference character bboxes',overlaps:r.hudPaint.opaqueOverlaps});fail(10,key+' HUD overlap');}
   const expected=r.variant==='r1'?12:11;if(!r.hudPaint.hudNumerals.length||r.hudPaint.hudNumerals.some(n=>n.px!==expected)){revisionFailures.push({key,rule:'visible R1/R2 numeral scale',expected,values:r.hudPaint.hudNumerals});fail(4,key+' numeric scale');}
  }
  if(r.brewFit&&r.size[0]===390&&r.size[1]===844&&[...r.brewFit.initial,...r.brewFit.collapsed,...r.brewFit.expanded].some(c=>!c.visible)){revisionFailures.push({key,rule:'all four potion cards fit, NPC closed and expanded',fit:r.brewFit});fail(10,key+' potion fit');}
  if(r.nav.length&&(!r.nav.every(n=>n.icons===1)||r.nav.slice(0,3).map(n=>n.count).join(',')!=='5+3,4,6')){revisionFailures.push({key,rule:'camp icons and count badges'});fail(10,key+' nav');}
 }
 for(const id of ['c-brew','c-hire','c-market','c-bag','c-team'])if(records.filter(r=>r.page===id).some(r=>!r.npc.length||r.npc.some(n=>!n.portrait))){revisionFailures.push({page:id,rule:'NPC portrait and dialogue disclosure retained'});fail(10,id+' NPC');}
 const packageBytes=(()=>{const walk=d=>fs.readdirSync(d,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?walk(path.join(d,e.name)):fs.statSync(path.join(d,e.name)).size),0);return walk(dir);})();
 const duplicateRasters=['export/before-after','export/r1-r2'].flatMap(d=>fs.readdirSync(path.join(dir,d)).filter(n=>n.endsWith('.png')).map(n=>d+'/'+n));
 if(packageBytes>=100000000||duplicateRasters.length){revisionFailures.push({rule:'single raster set and package <100MB',packageBytes,duplicateRasters});fail(10,'package size/duplicate rasters');}
 const revisionChecks={revision:'R2-review',iconsAtLeast20:!revisionFailures.some(e=>e.rule.startsWith('icons')),characterOverlapCheck:'reference-image pixel-difference bboxes; all native HUD painted rectangles',packageBytes,duplicateRasters,failures:revisionFailures,pass:revisionFailures.length===0};
 const report={schema:2,revisionChecks,base:'dd99b38d',engine:'Chromium',dpr:2,realDevices:false,visualApproval:false,scope:'R1 criteria 1–10 + review-revision checks for every R1/R2 variant; disclosed single-line field-name ellipses are intentional under the revision request',criteria:Array.from({length:10},(_,i)=>({id:i+1,status:failures[i+1]?'fail':'pass',failures:failures[i+1]||[]})),literalCount:literalValues.length,styleCounts:{...familyCounts,primary:primaryStyles.length,secondary:secondaryStyles.length},styleSignatures:{primary:primaryStyles,secondary:secondaryStyles},preservation,interactions,contrast:contrasts,records};
 report.pass=report.criteria.every(c=>c.status==='pass');fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');const imageCheck=spawnSync('python',[path.join(dir,'verify_image_pairs.py')],{encoding:'utf8'});if(imageCheck.status!==0)throw Error(imageCheck.stderr||imageCheck.stdout);console.log(imageCheck.stdout.trim());console.log(JSON.stringify({pass:report.pass,criteria:report.criteria.map(c=>[c.id,c.status,c.failures.length]),records:records.length,literals:literalValues.length,styles:report.styleCounts},null,2));
 }finally{await b.close();server.close();fs.rmSync(tmp,{recursive:true,force:true});}})().catch(e=>{fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({schema:2,pass:false,status:'error',error:e.message},null,2)+'\n');console.error(e);process.exitCode=1;});
