import type {Item,MapDefinition,Profile} from '../core/world/types';
import {collectOverflow,expandStorage,protectedItem,recycleSelection,storageCap,storageItems,type StorageSource} from '../core/world/storage';
import {salvageValue} from '../core/world/equipment';
import {itemName} from './th';
interface Host {collect(ids:number[]):void; recycleStored(source:StorageSource,ids:number[]):void; expandStorage():void}
export class StorageManager {
  source:StorageSource='bag';private ids=new Set<number>();private profile:Profile|undefined;private visible:readonly Item[]=[];
  private review:'collect'|'recycle'|'expand'|undefined;
  constructor(private map:MapDefinition,private host:Host){}
  reset():void{this.ids.clear();this.review=undefined;}
  openOverflow():void{this.reset();this.source='overflow';}
  row(i:Item):string{return `<button id="storage-select-${i.uid}" data-storage="select" data-uid="${i.uid}" class="secondary" aria-pressed="${this.ids.has(i.uid)}"${this.source==='bag'&&protectedItem(i)?' disabled':''}>${this.ids.has(i.uid)?'✓ เลือกแล้ว':'เลือก'}${protectedItem(i)?' · ป้องกัน':''}</button>`;}
  click(b:HTMLButtonElement,p:Profile):string {
    if(b.disabled)return b.id;const a=b.dataset.storage;
    if(a==='confirm'){
      if(this.profile===p&&this.review){const action=this.review,ids=[...this.ids];this.reset();if(action==='expand')this.host.expandStorage();else if(action==='collect')this.host.collect(ids);else this.host.recycleStored(this.source,ids);}
      return 'storage-source-'+this.source;
    }
    this.review=undefined;
    if(a==='source'){this.reset();this.source=b.dataset.source as StorageSource;}
    else if(a==='select'){const id=Number(b.dataset.uid);if(this.ids.has(id))this.ids.delete(id);else this.ids.add(id);}
    else if(a==='safe'){this.ids=new Set(this.visible.filter(i=>!protectedItem(i)).map(i=>i.uid));}
    else if(a==='all'){this.ids=new Set(this.visible.map(i=>i.uid));}
    else if(a==='clear')this.reset();
    else if(a==='collect'||a==='recycle'||a==='expand')this.review=a;
    else if(a==='common'){this.ids=new Set(this.visible.filter(i=>i.rarity===0&&!protectedItem(i)).map(i=>i.uid));this.review='recycle';}
    return this.review?'storage-confirm':b.id;
  }
  render(p:Profile,visible:readonly Item[]):{head:string;review:boolean} {
    if(this.profile!==p){this.reset();this.profile=p;}this.visible=visible;
    const cap=storageCap(p,this.map),cost=this.map.equipment.storage.costs[p.storageTier??0];
    const button=(id:string,action:string,text:string,disabled=false)=>`<button id="${id}" data-storage="${action}" class="secondary"${disabled?' disabled':''}>${text}</button>`;
    const tabs=`<div class="storage-sources" role="group" aria-label="ตำแหน่งอุปกรณ์">${(['bag','overflow'] as const).map(source=>`<button id="storage-source-${source}" data-storage="source" data-source="${source}" aria-pressed="${source===this.source}" class="secondary">${source==='bag'?`คลัง ${p.items.length}/${cap}`:`รอจัด ${p.overflow?.length??0}`}</button>`).join('')}</div>`;
    const selected=storageItems(p,this.source).filter(i=>this.ids.has(i.uid)),ids=[...this.ids],sum=selected.reduce((v,i)=>{const n=salvageValue(this.map,i);return {ore:v.ore+n.ore,dust:v.dust+n.dust};},{ore:0,dust:0});
    if(this.review){
      const trial=this.review==='expand'?expandStorage(p,this.map):this.review==='collect'?collectOverflow(p,this.map,ids):recycleSelection(p,this.map,this.source,ids);
      const reason=trial.event.type==='blocked'?trial.event.reason:'';
      const error=reason==='protected'?'ของล็อกหรือลงทุนแล้ว ต้องเก็บเข้าคลังก่อนจัดการรายชิ้น':reason==='full'?'พื้นที่คลังไม่พอ หรือยอดทรัพยากรเกินเพดาน':reason==='gold'?'เหรียญทองไม่พอ':reason?'ไม่มีรายการที่ทำได้':'';
      const title=this.review==='expand'?'ขยายคลัง':this.review==='collect'?'เก็บเข้าคลัง':'รีไซเคิล';
      return {review:true,head:`${tabs}<section class="storage-review"><h3>ตรวจรายการ${title}</h3>${this.review==='expand'?`<p>คลัง ${cap} → ${cap+this.map.equipment.storage.step} ช่อง</p><p>ใช้เหรียญทอง ${cost??0} · คงเหลือ ${p.bank.gold-(cost??0)}</p>`:`<p>${selected.length} ชิ้น · ${this.review==='recycle'?'รายการต่อไปนี้จะถูกทำลาย':'เก็บจากถาดรอจัดเข้าคลัง'}</p><ul class="storage-review-items">${selected.map(i=>`<li>#${i.uid} ${itemName(i)} Lv${i.level} +${i.plus??0}</li>`).join('')}</ul>`}<div class="storage-footer">${this.review==='recycle'?`<p>รับแร่ ${sum.ore} · ฝุ่น ${sum.dust}</p><small>หลังรับ แร่ ${p.bank.ore+sum.ore} · ฝุ่น ${p.bank.dust+sum.dust}</small>`:''}${error?`<p class="forge-reason" role="status">${error}</p>`:''}${button('storage-confirm','confirm','ยืนยัน'+title,!!reason)}${button('storage-cancel','cancel','ยกเลิก')}</div></section>`};
    }
    return {review:false,head:`${tabs}<p class="camp-note">${this.source==='overflow'?'ของยังอยู่ครบและบันทึกแล้ว · จัดถาดให้เสร็จก่อนออกเดินทางรอบใหม่':'เลือกหลายชิ้นเพื่อรีไซเคิล · เว้นของล็อกและของลงทุนแล้ว'}</p><div class="storage-tools">${button('storage-safe','safe','เลือกของปลอดภัยที่แสดง')}${this.source==='overflow'?button('storage-all','all','เลือกทั้งหมดที่แสดง'):''}${button('storage-clear','clear','ล้างที่เลือก')}</div><div class="storage-tools">${this.source==='overflow'?button('storage-collect','collect',`เก็บที่เลือก (${ids.length})`,!ids.length):''}${button('storage-recycle','recycle',`รีไซเคิลที่เลือก (${ids.length})`,!ids.length||selected.some(protectedItem))}</div><details class="storage-expansion"><summary>ขยายคลังถาวร · เหรียญทอง ${p.bank.gold}</summary><p>${cost===undefined?'ขยายเต็มแล้ว':`เพิ่ม ${this.map.equipment.storage.step} ช่อง · ใช้ ${cost} เหรียญทอง · ปัจจุบัน ${cap} ช่อง`}</p>${button('storage-expand','expand','ตรวจราคาขยายคลัง',cost===undefined)}</details>`};
  }
}
