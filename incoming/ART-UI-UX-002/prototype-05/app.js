/* In-memory interaction model for design review. No game imports, storage or network. */
'use strict';
const frame = document.querySelector('#phone');
const lab = document.querySelector('#lab-ledger');
let model, pendingFocus = 0;
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name => ICONS[name] || '';
const current = () => model.items.find(i => i.uid === model.uid);
const data = plus => FIXTURES.snapshots[plus];
const costOf = item => data(item.plus).cost;
const fingerprint = () => JSON.stringify([model.revision, model.uid, current().plus, model.bank, costOf(current())]);
function reset() {
  const scenario = document.querySelector('#scenario').value;
  model = { view: 'enhance', phase: 'ready', uid: scenario === 'capped' ? 3 : scenario === 'unowned' ? 2 : 1,
    bank: {ore:120,dust:scenario === 'insufficient' ? 2 : 48}, revision:0, commits:0, review:null, result:null, message:'', details:false, scroll:0,
    origin: {tab:'equipment',query:'',scroll:0}, items:[
      {uid:1,name:scenario === 'long' ? 'ดาบอัศวินแห่งรุ่งอรุณผู้พิทักษ์เส้นทางอันยาวไกลและคำสัตย์สาบานแห่งค่ายทหารรับจ้าง' : 'ดาบอัศวินล้ำค่า',plus:4,owner:'เอกิส',locked:false},
      {uid:2,name:'ดาบอัศวินล้ำค่า',plus:4,owner:null,locked:false},
      {uid:3,name:'ดาบอัศวินล้ำค่า',plus:FIXTURES.provenance.cap,owner:null,locked:false}]};
  render(); announce('เริ่มตัวอย่างใหม่');
}
function announce(text) { document.querySelector('#announcer').textContent = text; }
function remember() { const body = frame.querySelector('.content'); if(body) model.scroll=body.scrollTop; const details=frame.querySelector('details'); if(details)model.details=details.open; }
function button(id,text,primary=false,disabled=false) { return `<button type="button" id="${id}" class="${primary?'primary':''}"${disabled?' disabled':''}>${text}</button>`; }
function statRows(before,after,changedOnly=false) {
  return before.map(a=>{const b=after.find(b=>b.id===a.id)||a,delta=b.value-a.value;if(changedOnly&&!delta)return '';return `<div class="stat-row"><span>${escapeHTML(a.name)}</span><span>${a.value}${escapeHTML(a.unit)} → ${b.value}${escapeHTML(b.unit)}${delta?` <b class="gain">${delta>0?'+':''}${delta}</b>`:''}</span></div>`;}).join('');
}
function heading() { return model.view==='picker'?'เลือกอุปกรณ์':model.view==='origin'?'อุปกรณ์ · เอกิส':model.view==='other'?'งานอื่นของช่าง':model.phase==='review'?'ตรวจรายการตีบวก':model.phase==='success'?'ผลการตีบวก':'ตีบวกอุปกรณ์'; }
function identity(item) {
 const tools=model.phase==='review'||model.phase==='success'?`<p class="meta">${model.phase==='review'?'ตรวจชิ้นที่เลือก':'ผลที่ยืนยันแล้ว'}</p>`:button('pick','เปลี่ยนอุปกรณ์')+`<button type="button" id="lock" aria-pressed="${item.locked}" aria-label="${item.locked?'ปลดล็อก':'ล็อก'}อุปกรณ์">${icon(item.locked?'act-unlock':'act-lock')}</button>`;
 return `<section class="identity card"><div class="art" aria-hidden="true"><i></i><span>+${item.plus}</span></div><div><h3>${escapeHTML(item.name)}</h3><p class="meta">อาวุธ · Lv6 · ล้ำค่า · +${item.plus}</p><p class="owner">${item.owner?`สวมอยู่: ${item.owner}`:'ในคลัง · ไม่มีผู้สวม'}</p><div class="tools">${tools}</div></div></section>`;
}
function enhanceBody(item) {
 const success=model.phase==='success', capped=!costOf(item), previous=success?model.result.before:item.plus, next=success?item.plus:capped?item.plus:item.plus+1;
 const before=data(previous),after=data(next),rows=statRows(item.owner?before.heroStats:before.itemStats,item.owner?after.heroStats:after.itemStats,true);
 const note=success?'สำเร็จแล้ว · ตรวจผลก่อนทำขั้นต่อไป':capped?'ถึงเพดานของอุปกรณ์ชิ้นนี้':'สำเร็จแน่นอน · ครั้งละ 1 ขั้น';
 const impact=success?'ผลที่ได้รับ':item.owner?`ผลต่อ${item.owner}`:'ผลต่ออุปกรณ์';
 const summary=capped&&!success?'<p>อุปกรณ์ชิ้นนี้ถึงเพดานตีบวกแล้ว</p>':rows||'<p>ค่าสถานะรวมเท่าเดิมในขั้นนี้</p>';
 return `${model.message?`<p class="notice error" role="alert" id="error" tabindex="-1">${escapeHTML(model.message)}</p>`:''}${success?`<p class="notice" role="status" id="success" tabindex="-1">✓ ตีบวกสำเร็จ · อุปกรณ์ +${item.plus}</p>`:''}${identity(item)}<section class="step card"><strong>${capped&&!success?`+${item.plus} · ขั้นสูงสุด`:`+${previous} → +${next}`}</strong><p><span class="step-caption">${note}</span></p></section><section class="impact card"><h3>${impact}</h3>${summary}<small>ค่าพื้นฐานก่อนเงื่อนไขต่อสู้</small></section><details class="disclosure" id="details"${model.details?' open':''}><summary>รายละเอียดและการคืนทุน</summary><div class="detail-group"><h4>ค่าอุปกรณ์ก่อน–หลัง</h4>${statRows(before.itemStats,after.itemStats)}${item.owner?`<h4>ผลต่อ${item.owner}</h4>${statRows(before.heroStats,after.heroStats)}`:''}<h4>ทุนพัฒนาจากการทดลองนี้</h4><p>แร่ ${item.paid?.ore||0} · ฝุ่น ${item.paid?.dust||0}</p></div></details>${model.phase==='review'?'':button('other','งานอื่นของช่าง　›')}`;
}
function enhanceDock(item) {
 const cost=costOf(item),success=model.phase==='success'; let left,right,remaining,actions;
 if(success){left=`<b>ใช้แร่ ${model.result.cost.ore}</b><br><span>เหลือ ${model.bank.ore}</span>`;right=`<b>ใช้ฝุ่น ${model.result.cost.dust}</b><br><span>เหลือ ${model.bank.dust}</span>`;remaining='ยอดคงเหลือหลังยืนยัน';actions=button('next','ดูขั้นถัดไป',true);}
 else if(!cost){left='<b>ถึงเพดาน</b><br><span>ไม่มีขั้นถัดไป</span>';right='<b>ไม่ใช้วัสดุ</b><br><span>ในสถานะนี้</span>';remaining='เลือกอุปกรณ์ชิ้นอื่นเพื่อพัฒนาต่อ';actions=button('pick-primary','เลือกอุปกรณ์อื่น',true);}
 else {const missingOre=Math.max(0,cost.ore-model.bank.ore),missingDust=Math.max(0,cost.dust-model.bank.dust);left=`<b>${icon('ore')}แร่ · ใช้ ${cost.ore}</b><br><span>มี ${model.bank.ore}${missingOre?` · ขาด ${missingOre}`:''}</span>`;right=`<b>${icon('dust')}ฝุ่น · ใช้ ${cost.dust}</b><br><span>มี ${model.bank.dust}${missingDust?` · ขาด ${missingDust}`:''}</span>`;
 remaining=missingOre?`แร่ไม่พอ · ขาดอีก ${missingOre}`:missingDust?`ฝุ่นไม่พอ · ขาดอีก ${missingDust}`:model.phase==='review'?'ยังไม่ใช้ทรัพยากร · ตรวจรายการก่อนยืนยัน':`หลังตีบวก: แร่ ${model.bank.ore-cost.ore} · ฝุ่น ${model.bank.dust-cost.dust}`;
 actions=model.phase==='review'?button('cancel','กลับไปแก้ไข')+button('confirm',`${icon('enhance')}ยืนยันตีบวก +${item.plus+1}`,true):button('review',`${icon('enhance')}ตรวจรายการตีบวก +${item.plus+1}`,true,!!(missingOre||missingDust));
 }
 return `<div class="resources"><div class="resource ${cost&&!success&&model.bank.ore<cost.ore?'bad':''}">${left}</div><div class="resource ${cost&&!success&&model.bank.dust<cost.dust?'bad':''}">${right}</div></div><p class="remaining">${remaining}</p><div class="actions">${actions}</div>`;
}
function options() {return model.items.map(item=>`<button type="button" class="picker-option" data-uid="${item.uid}" aria-pressed="${model.uid===item.uid}">${escapeHTML(item.name)} +${item.plus}<small>#${item.uid} · ${item.owner?`สวมอยู่: ${item.owner}`:'ในคลัง'}${item.locked?' · ล็อกแล้ว':''}</small></button>`).join('');}
function originList() {return model.items.filter(i=>`${i.name} ${i.uid}`.includes(model.origin.query)).map(i=>`<button type="button" class="picker-option" id="origin-item-${i.uid}" data-open="${i.uid}">${escapeHTML(i.name)} +${i.plus}<small>#${i.uid} · ${i.owner?`สวมอยู่: ${i.owner}`:'ในคลัง'} · เปิดพัฒนาอุปกรณ์</small></button>`).join('')||'<p>ไม่พบอุปกรณ์</p>';}
function render(focusId,restoreScroll=false) {
 cancelAnimationFrame(pendingFocus);const item=current();frame.className=`phone material decorated ${model.view==='enhance'?model.phase:''} ${document.querySelector('#safe').checked?'safe':''} ${document.querySelector('#text-size').value==='2'?'large-text':''}`;frame.dataset.view=model.view;frame.dataset.phase=model.phase;
 let body,dock;
 if(model.view==='enhance'){body=enhanceBody(item);dock=enhanceDock(item);}
 else if(model.view==='picker'){body=options();dock=`<div class="actions">${button('return','กลับไปชิ้นเดิม',true)}</div>`;}
 else if(model.view==='other'){body='<section class="card impact"><h3>งานอื่นของช่าง</h3><p>เพิ่ม Lv · เลื่อนสี · ปรับค่า · ถ่ายโอน · สร้าง · รีไซเคิล · หลอมแร่</p></section>';dock=`<div class="actions">${button('return','กลับหน้าตีบวก',true)}</div>`;}
 else {body=`<label>หมวด<select class="origin-search" id="origin-tab"><option value="equipment"${model.origin.tab==='equipment'?' selected':''}>อุปกรณ์</option><option value="overview"${model.origin.tab==='overview'?' selected':''}>ภาพรวม</option></select></label><label>ค้นหาอุปกรณ์<input class="origin-search" id="origin-search" value="${escapeHTML(model.origin.query)}"></label><section id="origin-list">${originList()}</section>`;dock=`<div class="actions">${button('reopen','กลับหน้าตีบวกชิ้นล่าสุด',true)}</div>`;}
 frame.innerHTML=`<header class="bar"><h3 id="heading" tabindex="-1">${heading()}</h3>${button('close','×')}</header><div class="content">${body}</div><footer class="dock ${model.view==='enhance'?'':'empty-dock'}">${dock}</footer><div class="frame-trim" aria-hidden="true"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i><i class="edge-h top"></i><i class="edge-h bottom"></i><i class="edge-v left"></i><i class="edge-v right"></i></div>`;
 frame.querySelector('#close').setAttribute('aria-label',model.view==='origin'?'กลับหน้าตีบวก':'ปิดกลับต้นทาง');
 lab.textContent=`วัสดุจำลอง: แร่ ${model.bank.ore} · ฝุ่น ${model.bank.dust} | ยืนยันสำเร็จ ${model.commits} ครั้ง | ชิ้น #${model.uid} +${item.plus}`;
 const scroll=model.view==='origin'?model.origin.scroll:restoreScroll?model.scroll:0;frame.querySelector('.content').scrollTop=scroll;
 pendingFocus=requestAnimationFrame(()=>{layoutCosts();frame.querySelector('.content').scrollTop=scroll;fitWings();if(focusId){const target=frame.querySelector('#'+focusId);if(target)target.focus({preventScroll:true});}});
}
function layoutCosts() {
 if(frame.hidden)return;
 const footer=frame.querySelector('.dock'),body=frame.querySelector('.content');
 const compact=frame.classList.contains('large-text')&&frame.clientHeight<720&&model.view==='enhance';
 const old=frame.querySelector('.cost-summary');
 if(compact&&!old){
  const resources=footer.querySelector('.resources'),remaining=footer.querySelector('.remaining');if(!resources)return;
  const section=document.createElement('section');section.className='card cost-summary';section.setAttribute('aria-label','ค่าใช้จ่ายและวัสดุ');section.append(resources,remaining);
  if(model.phase==='review')body.prepend(section);else body.insertBefore(section,body.querySelector('#details'));
 }else if(!compact&&old){const actions=footer.querySelector('.actions');footer.insertBefore(old.querySelector('.resources'),actions);footer.insertBefore(old.querySelector('.remaining'),actions);old.remove();}
 frame.classList.toggle('compact-cost',compact);
}
function fitWings() {if(frame.hidden)return;const step=frame.querySelector('.step');if(!step)return;const caption=step.querySelector('.step-caption'),a=step.getBoundingClientRect(),b=caption.getBoundingClientRect();step.classList.toggle('hide-wings',b.left<a.left+52||b.right>a.right-52||b.height>24);}
function openSelected(uid) {if(model.view==='origin')model.origin.focus=document.activeElement.id;model.origin.scroll=frame.querySelector('.content').scrollTop;model.uid=uid;model.view='enhance';model.phase='ready';model.result=null;model.message='';model.review=null;render('heading');}
function back() {
 if(model.view==='picker'||model.view==='other'){model.view='enhance';render(model.returnFocus||'pick',true);}
 else if(model.view==='enhance'&&model.phase==='review'){model.review=null;model.phase='ready';render('review',true);announce('กลับไปแก้ไข ยังไม่ใช้ทรัพยากร');}
 else if(model.view==='enhance'){remember();model.view='origin';render(model.origin.focus||'reopen');}
 else {model.view='enhance';render('heading',true);}
}
frame.addEventListener('click',event=>{
 const target=event.target.closest('button');if(!target||target.disabled||event.detail>1)return;
 if(target.dataset.uid){model.uid=+target.dataset.uid;model.view='enhance';model.phase='ready';model.review=null;model.result=null;model.message='';model.scroll=0;model.details=false;render('pick');announce('เปลี่ยนอุปกรณ์แล้ว');return;}
 if(target.dataset.open){openSelected(+target.dataset.open);return;}
 const item=current(),id=target.id==='pick-primary'?'pick':target.id;
 if(['close','cancel','return'].includes(id)){back();return;}
 if(id==='reopen'){openSelected(model.uid);return;}
 if(id==='pick'||id==='other'){remember();model.returnFocus=target.id;model.view=id==='pick'?'picker':'other';render('heading');return;}
 if(id==='lock'){remember();item.locked=!item.locked;model.revision++;render('lock',true);announce(item.locked?'ล็อกอุปกรณ์แล้ว':'ปลดล็อกอุปกรณ์แล้ว');return;}
 if(id==='next'){model.phase='ready';model.result=null;model.message='';render('heading');return;}
 if(id==='review') {const cost=costOf(item);if(!cost||model.bank.ore<cost.ore||model.bank.dust<cost.dust)return;remember();model.message='';model.phase='review';model.review={fingerprint:fingerprint(),uid:item.uid,target:item.plus+1};render('cancel');announce('ตรวจรายการก่อนยืนยัน ยังไม่ใช้ทรัพยากร');return;}
 if(id==='confirm') {
  if(model.view!=='enhance'||model.phase!=='review'||!model.review)return;
  const review=model.review;model.review=null;const cost=costOf(item);
  if(review.fingerprint!==fingerprint()||review.uid!==item.uid||review.target!==item.plus+1||!cost||model.bank.ore<cost.ore||model.bank.dust<cost.dust){model.phase='ready';model.message='ข้อมูลเปลี่ยน กรุณาตรวจรายการใหม่ก่อนยืนยัน';render('error');announce(model.message);return;}
  const before=item.plus;model.bank.ore-=cost.ore;model.bank.dust-=cost.dust;item.plus=review.target;item.paid={ore:(item.paid?.ore||0)+cost.ore,dust:(item.paid?.dust||0)+cost.dust};model.revision++;model.commits++;model.result={before,cost:{...cost}};model.phase='success';model.message='';model.scroll=0;render('success');announce(`ตีบวกสำเร็จ อุปกรณ์ +${item.plus}`);
 }
});
frame.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();back();}else if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault();});
frame.addEventListener('input',event=>{if(event.target.id==='origin-search'){model.origin.query=event.target.value;frame.querySelector('#origin-list').innerHTML=originList();}});
frame.addEventListener('change',event=>{if(event.target.id==='origin-tab')model.origin.tab=event.target.value;});
document.querySelector('#scenario').addEventListener('change',reset);
document.querySelector('#reset').addEventListener('click',reset);
document.querySelector('#change-bank').addEventListener('click',()=>{model.bank.dust=Math.max(0,model.bank.dust-1);model.revision++;if(model.phase==='review'){lab.textContent=`ทุนเปลี่ยนแล้ว: ฝุ่น ${model.bank.dust} · ลองยืนยันเพื่อตรวจรายการใหม่`;}else render();});
function resize() {
 const coarse=window.matchMedia('(pointer:coarse)').matches;
 const landscape=coarse&&window.innerWidth>window.innerHeight;
 const tooSmall=window.innerWidth<320||window.innerHeight<560;
 const blocked=landscape||tooSmall;const guidance=document.querySelector('#space-guidance');
 frame.hidden=blocked;frame.inert=blocked;guidance.hidden=!blocked;
 document.querySelector('#space-message').textContent=landscape?'หมุนหน้าจอเป็นแนวตั้งเพื่อทดลองต่อ':'ใช้พื้นที่อย่างน้อย 320 × 560px เพื่อทดลองต่อ';
 const choice=document.querySelector('#size').value;const margin=window.innerWidth>740?48:0;
 frame.style.setProperty('--height',(choice==='auto'?Math.min(844,window.innerHeight-margin):+choice)+'px');layoutCosts();fitWings();
}
document.querySelector('#size').addEventListener('change',resize);
document.querySelector('#text-size').addEventListener('change',()=>{remember();frame.style.setProperty('--text-scale',document.querySelector('#text-size').value);render(undefined,true);});
document.querySelector('#safe').addEventListener('change',()=>{remember();render(undefined,true);});
window.addEventListener('resize',resize);new ResizeObserver(()=>{layoutCosts();fitWings();}).observe(frame);document.fonts.ready.then(fitWings);
Object.defineProperty(window,'prototypeSnapshot',{get:()=>structuredClone(model)});
reset();resize();
