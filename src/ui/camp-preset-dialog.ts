import { defaultPresetName, presetNameReason, presetOf, presetSlots } from '../core/world/presets';
import { PRESET_NAME_MAX, type Profile } from '../core/world/types';
import { icon } from './icons';

interface Host { profile():Profile|undefined; usable():boolean; action(kind:'save'|'rename'|'clear',slot:number,name?:string):void }
export class CampPresetDialog {
  private readonly dialog:HTMLDialogElement;
  private slot=0; private error=''; private confirmClear=false; private trigger='team-preset-open';
  private readonly names=new Map<number,string>();
  constructor(private readonly root:HTMLElement,private readonly host:Host){
    this.dialog=document.createElement('dialog');this.dialog.id='team-preset-dialog';this.dialog.className='camp-preset-dialog';this.dialog.setAttribute('aria-labelledby','preset-dialog-title');root.append(this.dialog);
    this.dialog.addEventListener('input',e=>{const input=e.target as HTMLInputElement;if(input.id==='team-preset-name')this.names.set(this.slot,input.value);});
    this.dialog.addEventListener('click',e=>{e.stopPropagation();const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!this.dialog.open||!b||b.disabled||!this.host.usable())return;if(e.detail>1&&['team-preset-save','team-preset-rename','team-preset-clear'].includes(b.id))return;
      if(b.dataset.destination!==undefined){this.slot=Number(b.dataset.destination);this.error='';this.confirmClear=false;this.draw();this.focus(`preset-destination-${this.slot}`);return;}
      if(b.id==='preset-dialog-close'){this.dialog.close();return;}
      if(b.id==='team-preset-clear'){if(!this.confirmClear){this.confirmClear=true;this.draw();this.focus(b.id);return;}this.host.action('clear',this.slot);this.dialog.close();return;}
      if(b.id!=='team-preset-save'&&b.id!=='team-preset-rename')return;
      if(e.detail>1)return;
      const name=this.names.get(this.slot)??this.label(),why=presetNameReason(name);
      this.error=why?({empty:'ใส่ชื่อชุดก่อน',long:`ชื่อยาวเกิน ${PRESET_NAME_MAX} ตัว`,invalid:'ชื่อมีอักขระที่ใช้ไม่ได้'}[why]??'ชื่อใช้ไม่ได้'):'';
      if(this.error){this.draw();this.focus('team-preset-name');return;}
      this.host.action(b.id==='team-preset-save'?'save':'rename',this.slot,name);this.dialog.close();
    });
    this.dialog.addEventListener('close',()=>{if(!root.hidden&&!root.closest('[inert]'))this.root.querySelector<HTMLElement>(`#${this.trigger}`)?.focus({preventScroll:true});});
  }
  get open():boolean{return this.dialog.open;}
  openFor(slot?:number,trigger='team-preset-open'):void{
    if(!this.host.usable())return;const p=this.host.profile()!;
    this.slot=slot??presetSlots().find(i=>!presetOf(p,i))??0;this.trigger=trigger;this.error='';this.confirmClear=false;this.names.clear();this.draw();this.layout();this.dialog.showModal();this.focus('team-preset-name');
  }
  private label():string{return presetOf(this.host.profile()!,this.slot)?.name??defaultPresetName(this.slot);}
  private focus(id:string):void{this.dialog.querySelector<HTMLElement>(`#${id}`)?.focus({preventScroll:true});}
  layout():void{const r=this.root.getBoundingClientRect();Object.assign(this.dialog.style,{left:`${r.left}px`,bottom:`${Math.max(0,innerHeight-r.bottom)}px`,width:`${r.width}px`,maxHeight:`${r.height}px`});}
  private escape(s:string):string{return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
  private draw():void{
    const p=this.host.profile()!;const preset=presetOf(p,this.slot),name=this.names.get(this.slot)??this.label();
    this.dialog.innerHTML=`<header class="preset-dialog-head"><div><h2 id="preset-dialog-title">บันทึกเป็นชุดทีม</h2><p>เก็บทีมปัจจุบันไว้เรียกใช้ครั้งถัดไป</p></div><button id="preset-dialog-close" aria-label="ปิดหน้าบันทึกชุดทีม">${icon('close')}</button></header><div class="preset-dialog-content"><h3>เลือกช่องบันทึก</h3><div class="preset-row">${presetSlots().map(i=>{const item=presetOf(p,i);return `<button id="preset-destination-${i}" data-destination="${i}" aria-pressed="${i===this.slot}" class="preset-slot${i===this.slot?' current':''}"><b>${this.escape(item?.name??`ช่อง ${i+1}`)}</b><small>${item?'มีชุดบันทึกแล้ว':'ว่าง'}</small></button>`;}).join('')}</div><label class="preset-name"><span>ชื่อชุดทีม · ไม่เกิน ${PRESET_NAME_MAX} ตัว</span><input id="team-preset-name" value="${this.escape(name)}" maxlength="${PRESET_NAME_MAX*2}" autocomplete="off" aria-invalid="${!!this.error}"${this.error?' aria-describedby="team-preset-error"':''}></label>${this.error?`<p id="team-preset-error" role="alert">${this.error}</p>`:''}<p class="preset-snapshot"><b>ลงสนาม ${p.party.deployed.length} · สำรอง ${p.party.reserve.length}</b><small>บันทึกสมาชิก ลำดับช่อง และแนวหน้า–หลังครบ</small></p><p class="camp-note">${preset?'ช่องนี้มีชุดเดิมอยู่ · การบันทึกจะแทนที่ชุดนั้น':'ทีมปัจจุบันใช้งานอยู่แล้ว · ปุ่มนี้เก็บเป็นชุดไว้ใช้ซ้ำ'}</p>${preset?`<div class="preset-maintenance"><button id="team-preset-rename" class="secondary">เปลี่ยนชื่อชุดเดิม</button><button id="team-preset-clear" class="danger-button">${this.confirmClear?'ยืนยันล้างชุด · ทีมไม่เปลี่ยน':'ล้างชุดเดิม'}</button></div>`:''}</div><footer><button id="team-preset-save" class="primary">${preset?`บันทึกทับ ${this.escape(preset.name)}`:`บันทึกลงช่อง ${this.slot+1}`}</button></footer>`;
  }
}
