/* Artwork-only compositor. No gameplay import or state mutation. */
/* global window, document, Image */
const records=window.projectileStoryboards.records,images=new Map(),canvases=[...document.querySelectorAll('canvas')];
const scenario=document.querySelector('#scenario'),weight=document.querySelector('#weight');
let selected=records.find(r=>r.skill===window.location.hash.slice(1))??records[0],visible=true;
const labels={base:'ตอนใช้สกิล',delayed:'เป้ามี delayed จริง',followup:'Track ยิงซ้ำท้ายรอบจริง',frontonly:'Knives แถวหลังว่าง',twin:'Twinknives เพิ่มแถวหน้าครึ่ง power',volleyhinder:'Volleyhinder ให้ delay ตัวเดียว',quickstep:'Quickstep มี delay รอบหน้า'};
const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error(`Missing ${src}`));im.src=src;});
function selectSkill(r){selected=r;scenario.replaceChildren(...r.variants.map(v=>{const o=document.createElement('option');o.value=v.scenario;o.textContent=labels[v.scenario];return o;}));draw();}
function draw(){
 const v=selected.variants.find(v=>v.scenario===scenario.value)??selected.variants[0],a=v.anchors;
 document.querySelector('#name').textContent=selected.skill.toUpperCase();
 document.querySelector('#identity').textContent=selected.identity+(v.scenario==='followup'?' · counter จริงหนึ่งครั้งแยกจาก cast':'');
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
  if(phase===0)paint(from.x+(selected.skill==='knives'?-7:5),from.y-3,0,30,.85);
  else for(const target of a.targets){
   // One projectile per actual damage/dodge/counter recipient, never per chosen target/row guess.
   const to={x:target.x-14,y:target.y},dx=to.x-from.x,dy=to.y-from.y;
   const lift={hinder:52,volley:92,weakshot:28,pin:70,track:58,disengage:42,knives:68}[selected.skill];
   const t=selected.skill==='knives'&&Math.abs(dy)<100?(phase===1?.25:.23):phase===1?.56:.52;
   const x=from.x+dx*t,y=from.y+dy*t-4*lift*t*(1-t);
   const angle=Math.atan2(dy-4*lift*(1-2*t),dx);
   paint(x,y,angle,phase===1?(selected.skill==='weakshot'?76:selected.skill==='knives'?58:72):46,phase===1?.98:.58);
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
