/* Concept viewer only. It never imports game rules or writes saves. */
/* global window, document, Image */
const records = window.bladeStoryboards;
const images = new Map();
const loadImage = src => new Promise((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error(`Missing image: ${src}`)); img.src = src;
});
let selected = records.find(record => record.skill === window.location.hash.slice(1)) ?? records[0], visible = true;
const weight = document.querySelector('#weight');
const canvases = [...document.querySelectorAll('canvas')];
function draw() {
  document.querySelector('#name').textContent = `${selected.skill.toUpperCase()} · ${selected.thai}`;
  document.querySelector('#identity').textContent = selected.identity;
  document.querySelector('#weight-value').textContent = `${weight.value}%`;
  for (const button of document.querySelectorAll('nav button')) button.setAttribute('aria-pressed', String(button.dataset.skill === selected.skill));
  const {source, target} = selected.anchors;
  const angle = selected.axial ? Math.atan2(target.y-source.y, target.x-source.x) : 0;
  canvases.forEach((canvas, phase) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 390, 844); ctx.drawImage(images.get(selected.background), 0, 0, 390, 844);
    if (!visible) return;
    const [sx,sy,sw,sh] = selected.frames[phase];
    const multiplier = [0.36,1,0.76][phase];
    const crossScale = selected.crossScale ?? 1;
    const fit = Math.min(selected.width/sw, selected.height/(sh*crossScale)) * multiplier;
    const at = phase === 0 ? source : target;
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(angle);
    ctx.globalAlpha = [.65,.88,.32][phase] * Number(weight.value)/100;
    ctx.drawImage(images.get(selected.source), sx,sy,sw,sh, -sw*fit/2,-sh*fit*crossScale/2,sw*fit,sh*fit*crossScale);
    ctx.restore();
  });
  document.documentElement.dataset.skill = selected.skill;
}
async function start() {
  await Promise.all([...new Set(records.flatMap(r => [r.source,r.background]))].map(async src => images.set(src, await loadImage(src))));
  for (const record of records) {
    const button = document.createElement('button'); button.textContent = record.skill; button.dataset.skill = record.skill;
    button.addEventListener('click', () => { selected=record; window.history.replaceState(null,'',`#${record.skill}`); draw(); }); document.querySelector('nav').append(button);
  }
  weight.addEventListener('input',draw);
  document.querySelector('#toggle').addEventListener('click', event => { visible=!visible; event.target.textContent=visible?'ดูสนามเปล่า':'แสดงแบบ VFX'; draw(); });
  document.querySelector('#reset').addEventListener('click', () => { visible=true; weight.value='100'; document.querySelector('#toggle').textContent='ดูสนามเปล่า'; draw(); });
  draw(); document.documentElement.dataset.ready='true';
}
start().catch(error => { document.querySelector('#error').textContent=error.message; });
