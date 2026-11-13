import type { EncounterDefinition, HeroDefinition } from '../core/battle/types';
import { upgrade, upgradeCost, upgradeReason } from '../core/world/profile';
import { isBigTree, talentPoints } from '../core/world/talents';
import type { MapDefinition, Profile, ProfileEvent } from '../core/world/types';
import { levelOf, starred, wounded } from '../core/world/world';
import { icon } from './icons';
import { portrait, starRow } from './portraits';
import { heroText } from './th';

// Presentation only: use the current cost/eligibility and stat helpers, including blocked previews.
export function starUpgradeView(p: Profile, map: MapDefinition, id: string) {
  // P04-02 (OD-15/16): the member's own shards first; universal shards may pay all of the rest.
  const m=p.members[id],cost=upgradeCost(p,map,id);
  const required=cost?cost.shards+cost.universal:0;
  const shortages:string[]=[];
  if(cost&&m){
    if(p.bank.shard<cost.universal)shortages.push(`เศษ${heroText[id]?.name??''}รวมเศษกลางขาด ${cost.universal-p.bank.shard}`);
    if(p.bank.ore<cost.ore)shortages.push(`แร่ดาวขาด ${cost.ore-p.bank.ore}`);
  }
  return {cost,required,shortages,reason:upgradeReason(p,map,id)};
}
const equal=(a:unknown,b:unknown)=>JSON.stringify(a,(_key,v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v)===JSON.stringify(b,(_key,v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export interface StarSources { hire:boolean; contracts:number; shards:number }
interface Snapshot { source:Profile; fingerprint:string; before:Profile; id:string }
interface Receipt { before:Profile; after:Profile; fingerprint:string; saved:boolean }
export class StarUpgrade {
  private id=''; private review:Snapshot|undefined; private pending:Snapshot|undefined;
  private receipt:Receipt|undefined; private message='';
  constructor(private readonly map:MapDefinition,private readonly heroes:readonly HeroDefinition[],private readonly template:EncounterDefinition){}
  get reviewing():boolean{return !!this.review;}
  open(id:string):void {this.id=id;this.review=undefined;this.pending=undefined;this.receipt=undefined;this.message='';}
  cancel():void {this.review=undefined;this.message='';}
  private valid(p:Profile,s:Snapshot):boolean {return s.id===this.id&&s.source===p&&s.fingerprint===JSON.stringify(p);}
  sync(p:Profile):void {
    if(this.review&&!this.valid(p,this.review)){this.review=undefined;this.message='ข้อมูลเปลี่ยนแล้ว · ตรวจรายการใหม่ก่อนยืนยัน';}
    if(this.receipt&&(this.receipt.after!==p||this.receipt.fingerprint!==JSON.stringify(p))){this.receipt=undefined;this.message='ข้อมูลเปลี่ยนแล้ว · แสดงสถานะปัจจุบัน';}
  }
  reviewFor(p:Profile):void {
    this.sync(p);if(this.pending||this.receipt||!p.company.includes(this.id)||upgradeReason(p,this.map,this.id))return;
    this.review={source:p,fingerprint:JSON.stringify(p),before:structuredClone(p),id:this.id};this.message='';
  }
  confirm(p:Profile,dispatch:(id:string)=>void):void {
    const review=this.review;
    if(!review||this.pending||this.receipt)return;
    this.review=undefined;
    if(!this.valid(p,review)||!p.company.includes(this.id)||upgradeReason(p,this.map,this.id)){this.message='ข้อมูลเปลี่ยนแล้ว · ตรวจรายการใหม่ก่อนยืนยัน';return;}
    // Consume the review before the synchronous adapter can re-enter via an event/render.
    this.pending=review;dispatch(review.id);
  }
  upgraded(after:Profile,event:ProfileEvent,saved:boolean):boolean {
    const pending=this.pending;if(!pending||event.type!=='upgraded'||event.heroId!==pending.id)return false;
    const expected=upgrade(pending.before,this.map,pending.id);
    if(expected.event.type!=='upgraded'||event.stars!==expected.event.stars||!equal(after.members[pending.id],expected.profile.members[pending.id])||!equal(after.bank,expected.profile.bank))return false;
    this.pending=undefined;this.receipt={before:pending.before,after,fingerprint:JSON.stringify(after),saved};return true;
  }
  render(p:Profile,sources?:StarSources):{body:string;dock:string} {
    this.sync(p);const receipt=this.receipt,before=receipt?.before??p,after=receipt?.after;
    const m=before.members[this.id],view=starUpgradeView(before,this.map,this.id),name=heroText[this.id]!.name;
    if(!m)return {body:'<p>ไม่มีสมาชิกคนนี้แล้ว</p>',dock:''};
    const cost=view.cost,to=after?.members[this.id]?.stars??(cost?m.stars+1:m.stars),reviewing=!!this.review;
    const heading=receipt?(receipt.saved?'บันทึกผลอัปดาวแล้ว':'อัปดาวแล้ว แต่บันทึกบนเครื่องไม่สำเร็จ'):reviewing?'ตรวจรายการอัปดาว':'อัปดาว';
    const hero=(profile:Profile,stars:number)=>{const member=profile.members[this.id]!;return wounded(starred(this.heroes.find(h=>h.id===this.id)!,stars,this.map,levelOf(this.map,profile),member.talents,member.gear,member),member.wound);};
    const old=hero(before,m.stars),next=hero(after??before,to),level=levelOf(this.map,before);
    const fields=[['เลือดสูงสุด',old.maxHp,next.maxHp,''],['พลังโจมตี',old.attack,next.attack,''],['พลังเวท',old.skillBonus??0,next.skillBonus??0,'%'],['SPD',old.speed,next.speed,'']] as const;
    const points=talentPoints(this.map,{stars:to},this.id,level)-talentPoints(this.map,m,this.id,level);
    const newActions=next.actions.filter(a=>!old.actions.includes(a));
    const effects=[...(points?[`แต้มผังความถนัด +${points} · ระบบปัจจุบัน`]:[]),...newActions.map(a=>`ปลด ${this.template.skills[a].name}`),...(next.passive&&next.passive!==old.passive?['ปลดพาสซีฟประจำอาชีพ']:[])];
    const ledger=cost?[
      {label:`เศษ${name}`,have:m.shards,use:cost.shards,left:after?.members[this.id]?.shards??m.shards-cost.shards,glyph:portrait(this.id)},
      {label:'เศษกลาง',have:before.bank.shard,use:cost.universal,left:after?.bank.shard??before.bank.shard-cost.universal,glyph:icon('seal')},
      {label:'แร่ดาว',have:before.bank.ore,use:cost.ore,left:after?.bank.ore??before.bank.ore-cost.ore,glyph:icon('ore')},
    ]:[];
    const stats=`<section class="star-box"><h4>ผล${receipt?'ที่ได้รับ':'หลังอัปดาว'}</h4><table class="star-stats"><thead><tr><th>ค่าสถานะ</th><th>เดิม</th><th>${receipt?'ผลจริง':'หลังอัป'}</th></tr></thead><tbody>${fields.map(([label,a,b,unit])=>`<tr><th>${label}</th><td>${a}${unit}</td><td>${b}${unit}</td></tr>`).join('')}</tbody></table>
      ${effects.map(e=>`<p class="star-effect">${e}</p>`).join('')}<p class="star-note">คงเลเวลค่าย อุปกรณ์ บาดแผล และการจัดทีมเดิม${isBigTree(this.map.talents[this.id])?' · สกิล/พาสซีฟปลดในผังความถนัด':''}</p></section>`;
    const materials=cost?`<section class="star-box"><h4>${receipt?'ทรัพยากรที่ใช้จริง':'วัตถุดิบที่ใช้'}</h4><table class="star-ledger"><thead><tr><th>รายการ</th><th>มี${receipt?'ก่อนทำ':''}</th><th>ใช้</th><th>${receipt?'ยอดจริง':'หลังทำ'}</th></tr></thead><tbody>${ledger.map(r=>`<tr><th>${r.glyph}<span>${r.label}</span></th><td>${r.have}</td><td>${r.use}</td><td>${r.left<0?`ขาด ${-r.left}`:r.left}</td></tr>`).join('')}</tbody></table>
      <p class="star-note">ใช้เศษ${name}ก่อน · เศษกลางเติมส่วนที่เหลือได้ทั้งหมด (ต้องใช้รวม ${view.required})</p><p class="star-note">ไม่ใช้สมาชิกคนอื่นเป็นวัตถุดิบ</p></section>`:'';
    const body=`<section class="star-page" data-review="${reviewing}" data-receipt="${!!receipt}"${receipt?` data-persisted="${receipt.saved}"`:''}>
      <p class="star-step">พัฒนา / ${reviewing?'ตรวจรายการ':receipt?'ผลอัปดาว':'อัปดาว'}</p>
      <h3 id="star-status" tabindex="-1" ${receipt?'role="status"':''}>${heading}</h3>
      ${this.message?`<p class="star-warning" role="status">${this.message}</p>`:''}
      ${!receipt&&view.shortages.length?`<div class="star-warning" role="status">${view.shortages.map(s=>`<p>${s}</p>`).join('')}</div>`:''}
      <div class="star-hero">${portrait(this.id)}<div><b>${name}</b><span>Lv${level} · เลเวลค่ายร่วม</span><span>${heroText[this.id]!.role}</span></div></div>
      <div class="star-transition" aria-label="${m.stars} ดาว เป็น ${to} ดาว">${starRow(m.stars,this.map.company.maxStars,true)}${cost?`<span>→</span>${starRow(to,this.map.company.maxStars,true)}`:''}<b>${cost?`${m.stars} → ${to} ดาว`:'ดาวสูงสุดแล้ว'}</b></div>
      ${!receipt?`<p class="star-note">${reviewing?'ยังไม่ใช้ทรัพยากร · ยืนยันเพิ่มครั้งละ 1 ดาว':'ดูผลและต้นทุนก่อนตรวจรายการ · ยังไม่ใช้ทรัพยากร'}</p>`:!receipt.saved?'<p class="star-warning">ผลในรอบนี้ยังไม่ถูกบันทึกถาวร · อย่ายืนยันรายการเดิมซ้ำ</p>':''}
      ${reviewing?materials+stats:stats+materials}

      ${cost&&!receipt&&sources?.hire?`<details class="star-sources star-box"><summary>ดูวิธีหาวัตถุดิบที่เปิดแล้ว</summary><p>ป้ายจ้างในค่าย: จ้างคนที่ถือครองแล้วจะได้เศษของคนนั้น ${this.map.company.shardsPerDuplicate} ชิ้น รายชื่อขึ้นกับป้ายปัจจุบัน ไม่รับประกันว่าจะมีคนนี้</p><p>ตลาดพีโน่: ใบสัญญาซ้ำเลือกผู้รับได้ เหลือ ${sources.contracts} ใบ · ห่อเศษกลางเหลือ ${sources.shards} ห่อในรอบนี้ ตรวจราคาและเงื่อนไขในตลาดก่อนซื้อ</p><p>เศษกลางยังได้จากบอส หีบหายาก อีเวนต์ และการผ่านแผนที่ครั้งแรก</p><p>การอ่านหน้านี้ไม่จ้าง ไม่ซื้อ และไม่เปลี่ยนป้ายให้เอง</p></details>`:''}
      ${!cost?'<p class="star-note">ถึงเพดานดาวของระบบปัจจุบันแล้ว</p>':''}
      </section>`;
    const button=(id:string,action:string,label:string,primary=false,disabled=false)=>`<button id="${id}" data-world="${action}" class="${primary?'primary':'secondary'}"${disabled?' disabled':''}>${label}</button>`;
    const summary=receipt?`ยอดจริง · เศษ${name} ${after!.members[this.id]!.shards} · เศษกลาง ${after!.bank.shard} · แร่ ${after!.bank.ore}`:view.reason?(cost?'ยังทำไม่ได้ · ดูรายการที่ขาด':'ดาวสูงสุดแล้ว'):`ใช้เศษ${name} ${cost!.shards} · เศษกลาง ${cost!.universal} · แร่ ${cost!.ore}`;
    const dock=`<p class="star-cost-summary">${summary}</p>`+(receipt?button('star-next','star-next','ดูขั้นถัดไป',true)+button('star-back','star-back','กลับหน้าตัวละคร'):reviewing?button('star-confirm','star-confirm',`ยืนยันอัปดาว ${name}`,true)+button('star-cancel','star-cancel','กลับไปแก้ไข'):button('star-review','star-review',cost?`ตรวจรายการอัปเป็น ${to} ดาว`:'ดาวสูงสุดแล้ว',true,!!view.reason||!!this.pending)+button('star-back','star-back','กลับหน้าตัวละคร'));
    return {body,dock};
  }
}
