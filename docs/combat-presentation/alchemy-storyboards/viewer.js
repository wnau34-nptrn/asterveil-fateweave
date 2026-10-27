/* Artwork-only compositor. No gameplay import or state mutation. */
/* global window, document, Image */
const records=window.alchemyStoryboards.records,images=new Map(),canvases=[...document.querySelectorAll('canvas')];
const scenario=document.querySelector('#scenario'),weight=document.querySelector('#weight');
let selected=records.find(r=>r.skill===window.location.hash.slice(1))??records[0],visible=true;
const labels={base:'ผลปกติ',spread:'กระจายคราบ ไม่มี hit เพิ่ม',down:'เป้าล้ม ไม่มีคราบบนผู้ล้ม',backonly:'แถวหลังเท่านั้น',wide:'Smoke ทั้งแถว',poison:'Smoke + corrode เป้าหลัก',corroded:'Catalyst หลัง Acid จริง',self:'ใส่ตนเอง'};
const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error(`Missing ${src}`));im.src=src;});
function selectSkill(r){selected=r;scenario.replaceChildren(...r.variants.map(v=>{const o=document.createElement('option');o.value=v.scenario;o.textContent=labels[v.scenario];return o;}));draw();}
function draw(){
 const v=selected.variants.find(v=>v.scenario===scenario.value)??selected.variants[0],a=v.anchors;
 document.querySelector('#name').textContent=selected.skill.toUpperCase();
 document.querySelector('#identity').textContent=selected.identity;
 document.querySelector('#weight-value').textContent=`${weight.value}%`;
 for(const b of document.querySelectorAll('nav button'))b.setAttribute('aria-pressed',String(b.dataset.skill===selected.skill));
 canvases.forEach((canvas,phase)=>{
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,390,844);ctx.drawImage(images.get(v.background),0,0);
  if(!visible)return;
  const layer=document.createElement('canvas');layer.width=390;layer.height=844;const fx=layer.getContext('2d');
  const f=selected.frames[phase],[sx,sy,sw,sh]=f.cell,[left,top,right,bottom]=f.bright;
  // Uniform scale per cell keeps the original painted arrow/fletching proportions.
  const paint=(x,y,angle,width,opacity)=>{
   const scale=width/(right-left);
   fx.save();fx.translate(x,y);fx.rotate(angle);fx.globalAlpha=opacity*Number(weight.value)/100;
   fx.drawImage(images.get(selected.source),sx,sy,sw,sh,-(left+right)/2*scale,-(top+bottom)/2*scale,sw*scale,sh*scale);fx.restore();
  };
  const from={x:a.source.releaseX,y:a.source.releaseY};
  if(phase===0)paint(from.x,from.y,0,26,.86);
  else for(const target of a.targets){
   const hit=a.events.some(e=>e.targetId===target.id&&(e.type==='damage'||e.type==='dodge'));
   const acidStatus=selected.skill==='acid'&&!hit;
   // Event-only spread uses a small residue wisp, never a second impact.
   const cell=acidStatus?selected.frames[2]:f;
   const [cx,cy,cw,ch]=cell.cell,[cl,ct,cr,cb]=cell.bright;
   const support=['haste','fury'].includes(selected.skill);
   const ribbon=selected.skill==='smoke'||support;
   const rightEdge=target.x>a.canvas.left+a.canvas.width*.76;
   const x=target.x+target.size*(support?.40:rightEdge?.33:-.46);
   const y=target.footY-target.size*(support?.35:.64);
   const width=target.size*(acidStatus?.36:selected.skill==='bomb'?.65:ribbon?.74:.56)*(phase===2?.95:1);
   const scale=width/(cr-cl);
   fx.save();fx.globalAlpha=(phase===1?(acidStatus?.65:.98):.65)*Number(weight.value)/100;
   fx.drawImage(images.get(selected.source),cx,cy,cw,ch,x-(cl+cr)/2*scale,y-(ct+cb)/2*scale,cw*scale,ch*scale);fx.restore();
  }
  // Restore costume pixels from independently extracted actual rendered sprite silhouettes.
  // This puts the proposed effect behind the actors without inventing their artwork.
  fx.globalCompositeOperation='destination-out';fx.drawImage(images.get(v.mask),0,0);fx.globalCompositeOperation='source-over';
  ctx.save();ctx.beginPath();ctx.rect(a.canvas.left,a.canvas.top,a.canvas.width,a.canvas.height);ctx.clip();ctx.drawImage(layer,0,0);ctx.restore();
 });
 document.documentElement.dataset.skill=selected.skill;document.documentElement.dataset.scenario=v.scenario;
}
async function start(){
 const urls=[...new Set(records.flatMap(r=>[r.source,...r.variants.flatMap(v=>[v.background,v.mask])]))];
 await Promise.all(urls.map(async src=>images.set(src,await load(src))));
 for(const r of records){const b=document.createElement('button');b.textContent=r.skill;b.dataset.skill=r.skill;b.addEventListener('click',()=>{window.history.replaceState(null,'',`#${r.skill}`);selectSkill(r);});document.querySelector('nav').append(b);}
 weight.addEventListener('input',draw);scenario.addEventListener('change',draw);
 document.querySelector('#toggle').addEventListener('click',e=>{visible=!visible;e.target.textContent=visible?'ดูสนามเปล่า':'แสดงแบบ VFX';draw();});
 document.querySelector('#reset').addEventListener('click',()=>{visible=true;weight.value='100';scenario.value='base';document.querySelector('#toggle').textContent='ดูสนามเปล่า';draw();});
 for(const b of document.querySelectorAll('[data-phase]'))b.addEventListener('click',()=>document.querySelector('.scroll').scrollTo({left:Number(b.dataset.phase)*390,behavior:'instant'}));
 selectSkill(selected);document.documentElement.dataset.ready='true';
}
start().catch(e=>{document.querySelector('#error').textContent=e.message;});
