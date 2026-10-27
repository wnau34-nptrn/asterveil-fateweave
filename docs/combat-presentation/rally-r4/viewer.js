/* Concept-only compositor. No game imports, rules, playback, storage or commands. */
/* global window, document, Image */
const records = window.defenseStoryboards;
const images = new Map();
const loadImage = src => new Promise((resolve,reject) => {
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(`Missing image: ${src}`));img.src=src;
});
let selected=records.find(r=>r.skill===window.location.hash.slice(1))??records[0],visible=true,previous=false;
const weight=document.querySelector('#weight');
const canvases=[...document.querySelectorAll('canvas')];
function draw(){
  const painting=previous&&selected.previous?selected.previous:selected;
  document.querySelector('#name').textContent=`${selected.skill.toUpperCase()} · ${selected.thai}`;
  document.querySelector('#identity').textContent=painting.identity;
  document.querySelector('#revision').textContent=painting.revision??'V1';
  document.querySelector('#version').hidden=!selected.previous;
  document.querySelector('#version').textContent=previous?'กลับไป R3 aura ช่วงขา':'เทียบ R2 aura สูง';
  document.querySelector('#version').setAttribute('aria-pressed',String(previous));
  document.querySelector('#weight-value').textContent=`${weight.value}%`;
  for(const button of document.querySelectorAll('nav button'))button.setAttribute('aria-pressed',String(button.dataset.skill===selected.skill));
  const {source,targets}=selected.anchors;
  const sprite=images.get(selected.source);
  function paint(ctx,profile,phase,x,bottom,opacity){
    const [sx,sy,sw,sh]=profile.frames[phase];
    const fit=Math.min(profile.width/profile.frameMax[0],profile.height/profile.frameMax[1]);
    ctx.globalAlpha=opacity*Number(weight.value)/100;
    ctx.drawImage(sprite,sx,sy,sw,sh,x-sw*fit/2,bottom-sh*fit,sw*fit,sh*fit);
  }
  canvases.forEach((canvas,phase)=>{
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,390,844);ctx.drawImage(images.get(selected.background),0,0,390,844);
    if(!visible)return;
    const command=selected.command;
    paint(ctx,command,phase,source.x+command.dx,source.y+command.dy+command.height/2,[.88,.95,.25][phase]);
    if(phase>0)for(const at of targets){
      const response=selected.response;
      paint(ctx,response,phase,at.x,at.y+at.size*.48+response.dy,[0,.95,.35][phase]);
    }
    ctx.globalAlpha=1;
  });
  document.documentElement.dataset.skill=selected.skill;
  document.documentElement.dataset.revision=painting.revision??'V1';
}
async function start(){
  await Promise.all([...new Set(records.flatMap(r=>[r.source,r.background,...(r.previous?[r.previous.source]:[])]))].map(async src=>images.set(src,await loadImage(src))));
  for(const record of records){
    const button=document.createElement('button');button.textContent=record.skill;button.dataset.skill=record.skill;
    button.addEventListener('click',()=>{selected=record;previous=false;window.history.replaceState(null,'',`#${record.skill}`);draw();});document.querySelector('nav').append(button);
  }
  weight.addEventListener('input',draw);
  document.querySelector('#toggle').addEventListener('click',event=>{visible=!visible;event.target.textContent=visible?'ดูสนามเปล่า':'แสดงแบบ VFX';draw();});
  document.querySelector('#reset').addEventListener('click',()=>{visible=true;previous=false;weight.value='100';document.querySelector('#toggle').textContent='ดูสนามเปล่า';draw();});
  document.querySelector('#version').addEventListener('click',()=>{previous=!previous;draw();});
  for(const button of document.querySelectorAll('[data-phase]'))button.addEventListener('click',()=>{
    document.querySelector('.scroll').scrollTo({left:Number(button.dataset.phase)*390,behavior:'instant'});
  });
  draw();document.documentElement.dataset.ready='true';
}
start().catch(error=>{document.querySelector('#error').textContent=error.message;});
