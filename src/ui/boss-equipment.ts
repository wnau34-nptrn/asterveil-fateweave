import {BOSS_POWERS,startBossPlan} from '../core/world/boss-equipment';
import type {BossPlan,MapDefinition} from '../core/world/types';
import type {BossPower,HeroDefinition} from '../core/battle/types';

export const bossNames:Record<BossPower,string>={aegis:'ตราพิทักษ์ผู้คุม',focus:'เศษแกนรอยแยก',lantern:'ประทีปผนึก'};
export function bossDescription(power:BossPower,amount:number):string {
  return ({aegis:`ครั้งแรกต่อรอบที่เสีย HP จากการโจมตีศัตรูและยังยืนอยู่ ได้โล่ขั้นต่ำ ${amount} หลังรับ hit นั้น ไม่กันตายและไม่ย้อนลดดาเมจ`,focus:`ครั้งแรกต่อรอบที่โจมตีหรือใช้สกิลดาเมจเป้าหมายเดี่ยวใส่ศัตรูติดตรา เพิ่มดาเมจ ${amount} เฉพาะเป้าหมายหลัก ไม่เพิ่มดาเมจหมู่/รอง/สวนกลับ`,lantern:`ครั้งแรกต่อรอบที่ใช้ Heal ฟื้น HP ให้เพื่อนคนอื่นจริง มอบโล่ขั้นต่ำ ${amount} หลังผลปกติ ไม่ทำงานกับ HP เต็ม รักษาตัวเอง Prayer หรือเพลง`})[power];
}
export function heroBossEffect(h:HeroDefinition):string {
  const boss=h.gear?.boss;if(!boss)return '';
  return `<li class="boss-power"><b>◆ ${bossNames[boss.power]} · พลังบอส</b><small>${bossDescription(boss.power,boss.amount)}</small>${boss.power==='lantern'&&!h.actions.includes('heal')?'<small>ตัวละครนี้ไม่มี Heal · พลังประทีปไม่ทำงาน</small>':''}<small>ไม่เพิ่มความแรงจากตีบวก/Attack/Support · ใช้สิทธิ์ครั้งแรกที่เงื่อนไขครบ แม้มีโล่สูงกว่าอยู่แล้ว</small></li>`;
}
export function bossGuide(map:MapDefinition,plan?:BossPlan,preview=false):string {
  const r=map.equipment.boss;
  return `<section class="boss-loot-guide"><h3>◆ อุปกรณ์เฉพาะบอส</h3>${plan?`<p>${preview?'เป้ารอบถัดไป':'เป้ารอบนี้'}: <b>${bossNames[plan.target]}</b></p><p class="boss-progress" role="status">${plan.rewarded?`ยังไม่ดรอป ${plan.misses}/${r.pity-1} ชัยชนะ · รับประกันภายในอีก ${r.pity-plan.misses} ชัยชนะบอส`:'ชัยชนะบอสครั้งแรกหลังอัปเดต รับประกันชิ้นที่เลือก'}</p>`:'<p>รอบเก่า: ยังไม่ใช้ของบอสหรือรับประกันใหม่ จัดแผนได้เมื่อกลับค่าย</p>'}<p class="camp-note">ผู้คุมรอยแยก Lv${map.bossLevel} · ของปกติ ${map.equipment.bossDrops} ชิ้นยังอยู่ครบ โบนัสเครื่องประดับบอสไม่เกิน 1 ชิ้น · หลังรางวัลแรก โอกาส ${r.chance}% / ชัยชนะ รับประกันครั้งที่ ${r.pity} · Luck ไม่เพิ่มโอกาสนี้</p><p class="camp-note">สีทอง · ทุกอาชีพ · พลังบอสแทนพลังตำนานทั่วไป · สุ่มเซ็ตปกติ ${map.equipment.setPercent}% นับรวมชุด 2/4 ชิ้นได้ · คุณสมบัติ/คุณภาพสุ่ม · พลังบอสถ่ายออกไม่ได้</p><details><summary>ดูพลังทั้งสามและกติกาของซ้ำ</summary>${BOSS_POWERS.map(id=>`<p><b>${bossNames[id]}</b>: ${bossDescription(id,id==='focus'?r.damage:r.barrier)}</p>`).join('')}<p>ตัวนับแยกจากหาอาวุธและไม่เพิ่มจากมินิบอส เปลี่ยนเป้าได้ที่ค่ายโดยคงความคืบหน้ารายบอส เป้าถูกตรึงตอนออกเดินทาง · พบของแล้วนับใหม่ทันที ต้องนำกลับค่ายตามกติกาเสียของเดิม คลังเต็มเข้าถาดรอจัดการ</p><p>ของบอสที่นำกลับเริ่มล็อก กันออกจากรีไซเคิลหลายชิ้นและวัตถุดิบผสม/ถ่ายโอน ปลดล็อกเพื่อรีไซเคิลรายชิ้นและคืนทุนพัฒนาตามเดิม</p></details></section>`;
}
export {startBossPlan};
