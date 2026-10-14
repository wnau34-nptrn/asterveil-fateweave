import { currentHeroId, targetOptions } from '../core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../core/battle/types';
import { actorName } from './th';
export interface Lesson { step:number; title:string; copy:string; heroId:string; action:ActionId; targetId:string }
// Advice never suggests commanding a hero outside the current turn.
export function battleLesson(state:BattleState,data:EncounterDefinition):Lesson|undefined {
 if(state.outcome!=='active'||state.beat>3)return;
 const heroId=currentHeroId(state,data); if(!heroId)return;
 const make=(action:ActionId,targetId:string,title:string,detail:string):Lesson|undefined=>{
  if(!targetOptions(state,data,heroId,action).some(t=>t.id===targetId&&t.valid))return;
  return{step:state.beat,heroId,action,targetId,title,copy:`${actorName(heroId,data)} → ${data.skills[action].name} → ${actorName(targetId,data)} · ${detail}`};
 };
 const target=state.enemies.find(e=>e.markedUntil>state.beat&&e.hp>0)??state.enemies.find(e=>e.id==='brute'&&e.hp>0)??state.enemies.find(e=>e.hp>0);
 if(!target)return;
 if(heroId==='guardian'&&state.intent){
  if(data.enemies.length===1&&state.intent.kind==='physical')return make('bash',state.intent.sourceId,'ขัดจังหวะโจมตีกายภาพ','หยุดการตอบโต้จังหวะนี้');
  return make('guard',state.intent.targetId,'อ่านแผนศัตรู',`รับแทนและลดพลัง ${state.intent.damage} → ${Math.ceil(state.intent.damage*(1-data.rules.guardReduction))}`);
 }
 if(heroId==='tracer'){
  if(target.markedUntil>state.beat) return make('execute',target.id,'ตีเป้าเดิมเพื่อใช้ตรา',`พลัง ${data.skills.execute.power+data.rules.markedBonus}`)??make('attack',target.id,'ตีเป้าเดิมเพื่อใช้ตรา',`เพิ่มพลัง +${data.rules.markedBonus}`);
  return make('mark',target.id,'ติดตราไว้ใช้รอบถัดไป',`ยังไม่ทำความเสียหาย · ตราอยู่ ${data.rules.markDuration} จังหวะ`);
 }
 if(heroId==='weaver'){
  if(state.intent?.kind==='energy')return make('ward',state.intent.targetId,'โล่รับพลังงานก่อนเลือด',`โล่ ${data.skills.ward.power}`);
  return make('bolt',target.id,'จอมเวทลงมือในเทิร์นนี้',`ศรเวทพลัง ${data.skills.bolt.power} · ตรารอไลรารอบหน้า`);
 }
 const injured=state.heroes.find(h=>h.hp>0&&h.hp<data.heroes.find(d=>d.id===h.id)!.maxHp);
 return injured?make('heal',injured.id,'รักษาเพื่อนก่อนศัตรูตอบโต้',`ฟื้นเลือดได้ถึง ${data.skills.heal.power}`):make('attack',target.id,'ลงมือเฉพาะเจ้าของเทิร์น','แตะศัตรูในสนาม');
}
