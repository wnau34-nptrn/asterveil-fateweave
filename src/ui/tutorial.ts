import { currentHeroId, targetOptions } from '../core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../core/battle/types';
import { actorName } from './th';
export interface Lesson { step:number; title:string; copy:string; heroId:string; action:ActionId; targetId:string }
// Reactive advice for the teaching battle. It reads the committed state only and
// never suggests commanding a hero outside the current SPD turn.
export function battleLesson(state:BattleState,data:EncounterDefinition):Lesson|undefined {
 if(state.outcome!=='active')return;
 const heroId=currentHeroId(state,data); if(!heroId)return;
 const make=(action:ActionId,targetId:string,title:string,detail:string):Lesson|undefined=>{
  if(!targetOptions(state,data,heroId,action).some(t=>t.id===targetId&&t.valid))return;
  return{step:state.commands.length+1,heroId,action,targetId,title,copy:`${actorName(heroId,data)} → ${data.skills[action].name} → ${actorName(targetId,data)} · ${detail}`};
 };
 const living=state.enemies.filter(e=>e.hp>0);
 const target=living.find(e=>e.markedUntil>state.round)??living.find(e=>e.id==='brute')??living[0];
 if(!target)return;
 const attack=()=>make('attack',target.id,'โจมตีพื้นฐาน','แตะศัตรูในสนาม');
 const intent=state.intent;
 if(heroId==='guardian'){
  if(intent?.kind==='physical')return make('bash',intent.sourceId,'ขัดจังหวะโจมตีกายภาพ',`${actorName(intent.sourceId,data)} จะเสียเทิร์นโจมตีกายภาพถัดไป`)
   ??make('guard',intent.targetId,'อ่านแผนศัตรู',`รับแทนและลดพลัง ${intent.damage} → ${Math.ceil(intent.damage*(1-data.rules.guardReduction))}`)??attack();
  if(intent)return make('guard',intent.targetId,'อ่านแผนศัตรู',`รับแทนและลดพลัง ${intent.damage} → ${Math.ceil(intent.damage*(1-data.rules.guardReduction))}`)??attack();
  return attack();
 }
 if(heroId==='tracer'){
  if(target.markedUntil>state.round)return make('execute',target.id,'ตีเป้าเดิมเพื่อใช้ตรา',`พลัง ${data.skills.execute.power+data.rules.markedBonus}`)??make('attack',target.id,'ตีเป้าเดิมเพื่อใช้ตรา',`เพิ่มพลัง +${data.rules.markedBonus}`);
  return make('mark',target.id,'ติดตราไว้ใช้รอบถัดไป',`ยังไม่ทำความเสียหาย · ตราอยู่ ${data.rules.markDuration} รอบ`)??attack();
 }
 if(heroId==='weaver'){
  if(intent?.kind==='energy'){const ward=make('ward',intent.targetId,'โล่รับพลังงานก่อนเลือด',`โล่ ${data.skills.ward.power}`);if(ward)return ward;}
  return make('bolt',target.id,'จอมเวทโจมตีด้วยพลังงาน',`ศรเวทพลัง ${data.skills.bolt.power}`)??attack();
 }
 const injured=state.heroes.filter(h=>h.hp>0).map(h=>({h,missing:data.heroes.find(d=>d.id===h.id)!.maxHp-h.hp})).filter(v=>v.missing>0).sort((a,b)=>b.missing-a.missing);
 if(injured.length){
  const heal=make('heal',injured[0]!.h.id,'รักษาเพื่อนก่อนศัตรูลงมือ',`ฟื้นเลือดได้ถึง ${data.skills.heal.power}`);if(heal)return heal;
  if(injured.length>1){const prayer=make('prayer','party','ฟื้นฟูทั้งทีม',`คนละ ${data.skills.prayer.power}`);if(prayer)return prayer;}
 }
 return attack();
}
