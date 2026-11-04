import type { ActionId, EncounterDefinition } from '../core/battle/types';
import type { MapDefinition, Profile, ProfileEvent, ProfileResult, TomeLine, TomeSize } from '../core/world/types';
import { TOME_LINES, TOME_SIZES } from '../core/world/types';
import { skillLevelOf, tomeLine } from '../core/world/tomes';
import { heroText, tomeLineText, tomeSizeText } from './th';

export type SkillCommand = {kind:'level';id:string;action:ActionId}|{kind:'trade';line:TomeLine;size:TomeSize;to?:TomeLine};
interface Snapshot { source:Profile; fingerprint:string; before:Profile; command:SkillCommand; expected:ProfileResult }
const equal=(a:unknown,b:unknown)=>JSON.stringify(a,(_k,v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v)===JSON.stringify(b,(_k,v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
// Read-only projections call the same pure commands as the adapter. Only confirm dispatches.
export class SkillReview {
  private review:Snapshot|undefined;private pending:Snapshot|undefined;
  private receipt:{snapshot:Snapshot;after:Profile;saved:boolean;fingerprint:string}|undefined;
  private message='';
  constructor(private readonly map:MapDefinition,private readonly template:EncounterDefinition,private readonly project:(p:Profile,c:SkillCommand)=>ProfileResult|undefined){}
  get active():boolean{return !!(this.review||this.pending||this.receipt||this.message);}
  get reviewing():boolean{return !!this.review;}
  clear():void{this.review=undefined;this.pending=undefined;this.receipt=undefined;this.message='';}
  cancel():void{this.clear();}
  private valid(p:Profile,s:Snapshot):boolean{return p===s.source&&JSON.stringify(p)===s.fingerprint;}
  sync(p:Profile):void{
    if(this.review&&!this.valid(p,this.review)){this.review=undefined;this.message='ข้อมูลเปลี่ยนแล้ว · กลับไปตรวจรายการใหม่';}
    if(this.receipt&&(this.receipt.after!==p||this.receipt.fingerprint!==JSON.stringify(p))){this.receipt=undefined;this.message='ข้อมูลเปลี่ยนแล้ว · กลับไปดูสถานะปัจจุบัน';}
  }
  private projection(p:Profile,c:SkillCommand):ProfileResult|undefined {
    const result=this.project(p,c);
    // v45 tomesOf accepts 0..99,999; tradeReason currently omits the destination cap.
    // Guard the UI projection only until the authoritative rule is repaired (handoff).
    if(result&&result.event.type!=='blocked'&&TOME_LINES.some(l=>TOME_SIZES.some(z=>(result.profile.tomes?.[l][z]??0)>99999)))return {profile:p,event:{type:'blocked',reason:'capacity'}};
    return result;
  }
  start(p:Profile,command:SkillCommand):void{
    if(this.pending||this.receipt)return;
    const expected=this.projection(p,command);if(!expected||expected.event.type==='blocked'){if(expected?.event.type==='blocked'&&expected.event.reason==='capacity'){this.clear();this.message='ตำราขนาดปลายทางเต็มแล้ว · ยังไม่ใช้ตำรา';}return;}
    this.clear();this.review={source:p,fingerprint:JSON.stringify(p),before:structuredClone(p),command:{...command},expected};
  }
  confirm(p:Profile,dispatch:(c:SkillCommand)=>void):void{
    const s=this.review;if(!s||this.pending||this.receipt)return;this.review=undefined;
    const now=this.projection(p,s.command);
    if(!this.valid(p,s)||!now||now.event.type==='blocked'||!equal(now,s.expected)){this.message='ข้อมูลเปลี่ยนแล้ว · กลับไปตรวจรายการใหม่';return;}
    this.pending=s;dispatch(s.command);
  }
  committed(after:Profile,event:ProfileEvent,saved:boolean):boolean{
    const s=this.pending;if(!s||!equal(event,s.expected.event))return false;
    // GameShell canonicalizes last after persistence. Verify the entire projected profile otherwise.
    if(!equal({...after,last:null},{...s.expected.profile,last:null}))return false;
    this.pending=undefined;this.receipt={snapshot:s,after,saved,fingerprint:JSON.stringify(after)};return true;
  }
  render(p:Profile):{body:string;dock:string}{
    this.sync(p);const receipt=this.receipt,s=receipt?.snapshot??this.review??this.pending;
    const button=(action:string,label:string,primary=false,disabled=false)=>`<button id="${action}" data-world="${action}" class="${primary?'primary':'secondary'}"${disabled?' disabled':''}>${label}</button>`;
    if(!s)return {body:`<h3 id="skill-review-status" tabindex="-1" role="status">${this.message||'ตรวจรายการใหม่'}</h3>`,dock:button('skill-review-back','กลับไปสกิล')};
    const before=s.before,after=receipt?.after??s.expected.profile,c=s.command;
    const heading=receipt?(receipt.saved?'บันทึกผลแล้ว':'ทำรายการแล้ว แต่บันทึกบนเครื่องไม่สำเร็จ'):this.pending?'กำลังรับผลรายการ':'ตรวจรายการก่อนใช้ทรัพยากร';
    const rows:{name:string;have:number;after:number}[]=[];
    let subject:string;
    if(c.kind==='level'){
      subject=`${heroText[c.id]!.name} · ${this.template.skills[c.action].name} · Lv${skillLevelOf(before.members[c.id],c.action)} → Lv${skillLevelOf(after.members[c.id],c.action)}`;
      const line=tomeLine(this.map,c.id);
      for(const size of TOME_SIZES)if(before.tomes?.[line][size]!==after.tomes?.[line][size])rows.push({name:`${tomeLineText[line]}${tomeSizeText[size]}`,have:before.tomes?.[line][size]??0,after:after.tomes?.[line][size]??0});
      rows.push({name:'เหรียญทอง',have:before.bank.gold,after:after.bank.gold});
      if((before.riftCore??0)!==(after.riftCore??0))rows.push({name:'แก่นรอยแยก',have:before.riftCore??0,after:after.riftCore??0});
    }else{
      const line=c.to??c.line,size=c.to?c.size:TOME_SIZES[TOME_SIZES.indexOf(c.size)+1]!;
      subject=`แลก ${tomeLineText[c.line]}${tomeSizeText[c.size]} → ${tomeLineText[line]}${tomeSizeText[size]} 1 เล่ม`;
      rows.push({name:`${tomeLineText[c.line]}${tomeSizeText[c.size]}`,have:before.tomes?.[c.line][c.size]??0,after:after.tomes?.[c.line][c.size]??0},{name:`${tomeLineText[line]}${tomeSizeText[size]}`,have:before.tomes?.[line][size]??0,after:after.tomes?.[line][size]??0});
    }
    return {body:`<section class="skill-review-page" data-receipt="${!!receipt}"${receipt?` data-persisted="${receipt.saved}"`:''}><h3 id="skill-review-status" tabindex="-1" role="status">${heading}</h3><p class="skill-review-subject">${subject}</p><p>${receipt?'ผลจากรายการที่ทำจริง':c.kind==='level'?'เพิ่มครั้งละ 1 Lv · ยังไม่ใช้ทรัพยากร':'แลกกลับไม่ได้ · ยังไม่ใช้ตำรา'}</p><table class="star-ledger"><thead><tr><th>รายการ</th><th>มี${receipt?'ก่อนทำ':''}</th><th>ใช้</th>${c.kind==='trade'?'<th>ได้รับ</th>':''}<th>${receipt?'ยอดจริง':'หลังทำ'}</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${r.name}</th><td>${r.have}</td><td>${Math.max(0,r.have-r.after)}</td>${c.kind==='trade'?`<td>${Math.max(0,r.after-r.have)}</td>`:''}<td>${r.after}</td></tr>`).join('')}</tbody></table>${receipt&&!receipt.saved?'<p class="star-warning">ยังไม่บันทึกถาวร · อย่ายืนยันรายการเดิมซ้ำ</p>':''}</section>`,dock:receipt?button('skill-review-back','กลับไปสกิล',true):this.pending?button('skill-review-back','รอผลรายการ',false,true):button('skill-review-confirm',c.kind==='level'?'ยืนยันเพิ่ม 1 Lv':'ยืนยันแลกตำรา',true)+button('skill-review-back','กลับไปแก้ไข')};
  }
}
