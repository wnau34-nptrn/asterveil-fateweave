/* Concept-only compositor. No game imports, rules, playback, storage or commands. */
/* global window, document, Image */
const records = window.defenseStoryboards;
const images = new Map();
const loadImage = src => new Promise((resolve,reject) => {
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(`Missing image: ${src}`));img.src=src;
});
let selected=records.find(r=>r.skill===window.location.hash.slice(1))??records[0],visible=true;
const weight=document.querySelector('#weight');
const canvases=[...document.querySelectorAll('canvas')];
function draw(){
  document.querySelector('#name').textContent=`${selected.skill.toUpperCase()} · ${selected.thai}`;
  document.querySelector('#identity').textContent=selected.identity;
  document.querySelector('#weight-value').textContent=`${weight.value}%`;
  for(const button of document.querySelectorAll('nav button'))button.setAttribute('aria-pressed',String(button.dataset.skill===selected.skill));
  const {source,targets}=selected.anchors;
  // One shared scale across phases: anticipation and dissolve retain their authored relative size.
  const fit=Math.min(selected.width/selected.frameMax[0],selected.height/selected.frameMax[1]);
  canvases.forEach((canvas,phase)=>{
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,390,844);ctx.drawImage(images.get(selected.background),0,0,390,844);
    if(!visible)return;
    const [sx,sy,sw,sh]=selected.frames[phase];
    const recipients=phase===0||selected.placement==='source'?[source]:targets;
    for(const at of recipients){
      const x=Math.max(selected.width/2+2,Math.min(388-selected.width/2,at.x+selected.dx));
      const bottom=at.y+selected.dy+selected.height/2;
      ctx.globalAlpha=[.72,.9,.42][phase]*Number(weight.value)/100;
      ctx.drawImage(images.get(selected.source),sx,sy,sw,sh,x-sw*fit/2,bottom-sh*fit,sw*fit,sh*fit);
    }
    ctx.globalAlpha=1;
  });
  document.documentElement.dataset.skill=selected.skill;
}
async function start(){
  await Promise.all([...new Set(records.flatMap(r=>[r.source,r.background]))].map(async src=>images.set(src,await loadImage(src))));
  for(const record of records){
    const button=document.createElement('button');button.textContent=record.skill;button.dataset.skill=record.skill;
    button.addEventListener('click',()=>{selected=record;window.history.replaceState(null,'',`#${record.skill}`);draw();});document.querySelector('nav').append(button);
  }
  weight.addEventListener('input',draw);
  document.querySelector('#toggle').addEventListener('click',event=>{visible=!visible;event.target.textContent=visible?'ดูสนามเปล่า':'แสดงแบบ VFX';draw();});
  document.querySelector('#reset').addEventListener('click',()=>{visible=true;weight.value='100';document.querySelector('#toggle').textContent='ดูสนามเปล่า';draw();});
  for(const button of document.querySelectorAll('[data-phase]'))button.addEventListener('click',()=>{
    document.querySelector('.scroll').scrollTo({left:Number(button.dataset.phase)*390,behavior:'instant'});
  });
  draw();document.documentElement.dataset.ready='true';
}
start().catch(error=>{document.querySelector('#error').textContent=error.message;});
