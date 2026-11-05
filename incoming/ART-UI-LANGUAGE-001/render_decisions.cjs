// Portable R1/R2 comparison pages reuse the single exported PNG set.
const fs=require('node:fs'),path=require('node:path');const dir=__dirname;
async function decisions(){const pages=JSON.parse(fs.readFileSync(path.join(dir,'pages.json'))),out=path.join(dir,'export/r1-r2');fs.mkdirSync(out,{recursive:true});const records=[];
 for(const item of pages.filter(p=>p.variant!=='r1'))for(const [w,h] of item.sizes){const base=item.id.replace(/-r2-.+$/,''),stem=`${item.id}-${w}x${h}`;
  fs.writeFileSync(path.join(out,stem+'.html'),`<!doctype html><html lang="th"><meta charset="utf-8"><title>R1/R2 ${item.title}</title><link rel="stylesheet" href="../../components.css"><style>:root{--pair-w:${w}px;--pair-h:${h}px}body{display:block;padding:var(--space-4)}main{display:flex;gap:var(--space-4)}figure,img{width:var(--pair-w);flex-shrink:0}img{height:var(--pair-h);display:block}figcaption{height:var(--space-8);font-size:var(--type-caption)}</style><body><main><figure><figcaption>R1 · ${w}×${h}</figcaption><img src="../${base}-${w}x${h}.png"></figure><figure><figcaption>R2 ${item.variant.slice(3).toUpperCase()} · ${w}×${h}</figcaption><img src="../${stem}.png"></figure></main></body></html>`);
  records.push({r1:base,r2:item.id,size:[w,h],file:'export/r1-r2/'+stem+'.html'});
 }
 const f=path.join(dir,'render-report.json'),r=JSON.parse(fs.readFileSync(f));r.decisionComparisons=records;fs.writeFileSync(f,JSON.stringify(r,null,2)+'\n');return records.length;}
module.exports=decisions;if(require.main===module)decisions().then(n=>console.log('Comparison HTML:',n));
