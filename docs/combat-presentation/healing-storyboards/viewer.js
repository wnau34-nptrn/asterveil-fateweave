/* Artwork-only compositor: no game state mutations or artwork runtime. */
/* global window, document, Image */
const records=window.healingStoryboards, images=new Map();
let selected=records.find(r=>r.skill===window.location.hash.slice(1))??records[0], visible=true;
const mode=document.querySelector('#mode'),weight=document.querySelector('#weight');
const canvases=[...document.querySelectorAll('canvas')];
const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`Missing ${src}`));im.src=src;});
function draw(){
  const tick=mode.value==='tick'&&selected.tick, art=tick||selected;
  mode.options[1].disabled=!selected.tick;
  document.querySelector('#name').textContent=`${selected.skill.toUpperCase()} · ${selected.thai}`;
  document.querySelector('#identity').textContent=art.identity;
  document.querySelector('#weight-value').textContent=`${weight.value}%`;
  for(const b of document.querySelectorAll('nav button'))b.setAttribute('aria-pressed',String(b.dataset.skill===selected.skill));
  // Project the paintings onto a shallow floor plane, same X/Y factors for every phase.
  const fitX=art.width/art.frameMax[0],fitY=art.height/art.frameMax[1];
  canvases.forEach((canvas,phase)=>{
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,390,844);ctx.drawImage(images.get(selected.background),0,0);
    if(!visible)return;
    const {source,targets,tickTargets}=selected.anchors;
    const f=art.frames[phase], [sx,sy,sw,sh]=f.cell;
    const paint=(at,half)=>{
      // Shared floor projection preserves relative phase sizes; protected shoe/HP band stays clear.
      let left=0,right=sw,ax=f.anchor[0];
      if(half==='left'){right=sw/2;ax=sw*.25;}
      if(half==='right'){left=sw/2;ax=sw*.75;}
      ctx.save();ctx.beginPath();ctx.rect(0,at.footY+15,390,21);ctx.clip();
      ctx.drawImage(images.get(art.source),sx+left,sy,right-left,sh,
        at.x+(left-ax)*fitX,at.footY+34-f.anchor[1]*fitY,(right-left)*fitX,sh*fitY);
      ctx.restore();
    };
    ctx.globalAlpha=[.72,.94,.38][phase]*Number(weight.value)/100;
    if(selected.skill==='rouse'){
      paint(source,'left');if(phase>0)for(const at of targets)paint(at,'right');
    }else{
      const recipients=tick?tickTargets:phase===0||selected.skill==='mend'?[source]:targets;
      for(const at of recipients)paint(at);
    }
    ctx.globalAlpha=1;
  });
  document.documentElement.dataset.skill=selected.skill;document.documentElement.dataset.mode=mode.value;
}
async function start(){
  await Promise.all([...new Set(records.flatMap(r=>[r.source,r.background,...(r.tick?[r.tick.source]:[])]))].map(async src=>images.set(src,await load(src))));
  for(const r of records){const b=document.createElement('button');b.textContent=r.skill;b.dataset.skill=r.skill;b.addEventListener('click',()=>{selected=r;mode.value='cast';window.history.replaceState(null,'',`#${r.skill}`);draw();});document.querySelector('nav').append(b);}
  weight.addEventListener('input',draw);mode.addEventListener('change',draw);
  document.querySelector('#toggle').addEventListener('click',e=>{visible=!visible;e.target.textContent=visible?'ดูสนามเปล่า':'แสดงแบบ VFX';draw();});
  document.querySelector('#reset').addEventListener('click',()=>{visible=true;weight.value='100';mode.value='cast';document.querySelector('#toggle').textContent='ดูสนามเปล่า';draw();});
  for(const b of document.querySelectorAll('[data-phase]'))b.addEventListener('click',()=>document.querySelector('.scroll').scrollTo({left:Number(b.dataset.phase)*390,behavior:'instant'}));
  draw();document.documentElement.dataset.ready='true';
}
start().catch(e=>{document.querySelector('#error').textContent=e.message;});
