import {bossGuide,bossNames,startBossPlan} from './boss-equipment';
import {BOSS_POWERS,isBossPower} from '../core/world/boss-equipment';
import type {BossPower} from '../core/battle/types';
import type {HuntPlan,MapDefinition,Profile} from '../core/world/types';
import {startHunt} from '../core/world/targeted-loot';
import {heroText,setText} from './th';
export function lootGuide(map:MapDefinition,plan?:HuntPlan,legacy=false,preview=false):string {
  const rules=map.equipment.hunt,target=plan?.target;
  return `<section class="loot-guide"><h3>แหล่งเซ็ตและอาวุธ</h3><p>${legacy?'รอบที่ค้างจากกติกาเดิม: ใช้การดรอปเดิมจนกลับค่าย':target?`${preview?'ตัวอย่างแผนรอบถัดไป':'เป้าหมายรอบนี้'}: ${heroText[target]!.role} · ${heroText[target]!.name}`:'ไม่ได้เลือกอาชีพเป้าหมาย · สุ่มปกติ'}</p>${target?`<p class="loot-progress" role="status">ยังไม่พบ ${plan!.misses}/${rules.pityDrops} ชิ้น · รับประกันภายในอีก ${rules.pityDrops-plan!.misses} ชิ้นที่อุปกรณ์ดรอป</p>`:''}<p class="camp-note">เลือกอาชีพที่มีอยู่ได้จากค่าย → ฟาร์ม รวมสมาชิกที่ไม่ได้พามา · เมื่อมีอาวุธออก อย่างน้อย ${rules.weaponBiasPercent}% จะเป็นอาชีพเป้าหมาย · หากไม่ได้อาวุธนั้นครบ ${rules.pityDrops-1} ชิ้น ชิ้นถัดไปจะเป็นอาวุธเป้าหมาย</p><ul class="loot-zones">${map.zones.filter(z=>z.sets?.length).map(z=>`<li data-loot-zone="${z.id}"><b>${z.name} · Lv${z.levels?.join('–')??'1'}</b><span>${z.sets!.map(id=>'ชุด'+setText[id]).join(' / ')}</span></li>`).join('')}<li><b>${map.bossName} · Lv${map.bossLevel??1}</b><span>ดรอป ${map.equipment.bossDrops} ชิ้น · ${map.bossDrop?.zoneSets?'เซ็ตของแผนที่นี้':'มีโอกาสได้ทุกเซ็ต'} · ใช้น้ำหนักสีที่ดีกว่าศัตรูทั่วไป</span></li></ul><p class="camp-note">อาวุธหาได้ทุกพื้นที่ · ถ้าไม่เลือกเป้าหมาย จะสุ่มอาชีพจากทีมที่พามา · อุปกรณ์มีโอกาสติดเซ็ต ${map.equipment.setPercent}% และสุ่มจากเซ็ตของพื้นที่ที่สู้ ไม่ใช่รางวัลเซ็ตแน่นอน</p><p class="camp-note">อาวุธสำรองสร้างได้ที่ค่าย → ช่าง → สร้างอาวุธ: สีดี คุณภาพ 100% ไม่มีเซ็ต ใช้แร่/ฝุ่นดาว ไม่เพิ่มตัวนับรับประกัน</p><details><summary>กติกาการรับประกัน</summary><p>นับเฉพาะอุปกรณ์ที่ดรอปจากการชนะศึก ไม่ใช่จำนวนศึกหรือก้าวเดิน · ร้านค้า การสร้างอาวุธ การหลอม และศึกแรกไม่นับ · การรับประกันเปลี่ยนช่อง/อาชีพ แต่ไม่เพิ่มจำนวนชิ้น สี Lv คุณภาพ หรือโอกาสติดเซ็ต</p><p>นับใหม่เมื่อมีอาวุธเป้าหมายดรอป แม้ภายหลังเสียของเมื่อทีมล้ม · ความคืบหน้าจำแยกตามอาชีพและบันทึกเมื่อกลับค่าย รวมถอนตัว/ทีมล้ม · เปลี่ยนเป้าหมายได้ที่ค่ายก่อนออกเดินทาง รอบที่เริ่มแล้วเปลี่ยนไม่ได้</p></details></section>`;
}
export class HuntPanel {
  private source:Profile|undefined;private candidate:string|undefined;private bossCandidate:BossPower='aegis';
  cancel():void{this.source=undefined;}
  change(value:string):void {this.candidate=value||undefined;}
  changeBoss(value:string):void{if(isBossPower(value))this.bossCandidate=value;}
  get bossTarget():BossPower{return this.bossCandidate;}
  get target():string|undefined{return this.candidate;}
  // `bossOpen`: the boss charm target shows once a map that pays the charm is open (chapters).
  render(p:Profile,map:MapDefinition,bossOpen=true):string {
    if(this.source!==p){this.source=p;this.candidate=p.hunt?.target;this.bossCandidate=startBossPlan(p,map).target;}
    const trial=startHunt({...p,hunt:{pity:p.hunt?.pity??{},...(this.candidate?{target:this.candidate}:{})}});
    return `<section class="hunt-settings"><h3>เตรียมฟาร์มรอบถัดไป</h3><label class="forge-label">อาชีพที่ต้องการอาวุธ<select id="hunt-target"><option value="">สุ่มปกติ</option>${p.company.map(id=>`<option value="${id}"${this.candidate===id?' selected':''}>${heroText[id]!.role} · ${heroText[id]!.name}</option>`).join('')}</select></label><p class="camp-note">เลือกอย่างเดียวยังไม่บันทึก · ไม่มีค่าใช้จ่าย · สะสมความคืบหน้าแยกตามอาชีพ การสลับเป้าหมายไม่ล้างแต้ม</p><button id="hunt-apply" data-lobby="hunt-apply" class="primary"${this.candidate===p.hunt?.target?' disabled':''}>บันทึกเป้าหมายรอบถัดไป</button>${bossOpen?`<h3>เป้าหมายอุปกรณ์บอส</h3><label class="forge-label">ชิ้นที่ต้องการจากผู้คุมรอยแยก<select id="boss-target">${BOSS_POWERS.map(id=>`<option value="${id}"${this.bossCandidate===id?' selected':''}>${bossNames[id]}</option>`).join('')}</select></label><p class="camp-note">เลือกอย่างเดียวยังไม่บันทึก · แยกจากเป้าอาวุธ · ไม่มีค่าใช้จ่าย</p><button id="boss-apply" data-lobby="boss-apply" class="primary"${this.bossCandidate===startBossPlan(p,map).target?' disabled':''}>บันทึกเป้าหมายบอสรอบถัดไป</button>${bossGuide(map,{...startBossPlan(p,map),target:this.bossCandidate},true)}`:''}${lootGuide(map,trial,false,true)}</section>`;
  }
}
