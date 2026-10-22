import { ambushBonus, corrodeBonusOf, guardReductionOf, interruptBlock, tauntReductionOf, currentHeroId, skillPower, targetOptions } from '../core/battle/engine';
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
 if(!living.length)return;
 // Foes this move can reach (front-row foes screen the back row), focus: a marked foe, then the one nearest to falling.
 const reach=(action:ActionId)=>{const ok=new Set(targetOptions(state,data,heroId,action).filter(t=>t.valid).map(t=>t.id));return living.filter(e=>ok.has(e.id));};
 // Back-lane heroes take the screened back row that only they can reach while the front row stands.
 const rear=data.heroes.find(h=>h.id===heroId)?.lane==='back'&&living.some(e=>data.enemies.find(d=>d.id===e.id)?.row==='front');
 const rank=(e:typeof living[number])=>rear&&data.enemies.find(d=>d.id===e.id)?.row==='back'?0:1;
 const focus=(list:typeof living)=>list.find(e=>e.markedUntil>state.round)??[...list].sort((a,b)=>rank(a)-rank(b)||a.hp-b.hp)[0];
 const pick=(action:ActionId)=>focus(reach(action))??focus(reach('attack'))??living[0]!;
 const attack=()=>make('attack',pick('attack').id,'โจมตีพื้นฐาน','แตะศัตรูในสนาม');
 // A phase change or a charge-up deals no damage now: nothing to guard, ward or dodge this turn.
 const intent=state.intent&&!state.intent.special&&!state.intent.charge?state.intent:null;
 if(heroId==='guardian'){
  // A steadfast boss or an unstoppable move cannot be bashed: guard it instead.
  // Guard covers one announced hit; a whole-party move cannot be guarded.
  const guard=()=>intent&&!intent.all?make('guard',intent.targetId,'อ่านแผนศัตรู',`รับแทนและลดพลัง ${intent.damage} → ${Math.ceil(intent.damage*(1-guardReductionOf(data,heroId)))}`):undefined;
  if(intent?.kind==='physical'&&!interruptBlock(state,data,intent.sourceId,intent))return make('bash',intent.sourceId,'ขัดจังหวะโจมตีกายภาพ',`${actorName(intent.sourceId,data)} จะเสียเทิร์นโจมตีกายภาพถัดไป`)??guard()??attack();
  return guard()??attack();
 }
 if(heroId==='toma'){
  const target=pick('acid');
  if(!(target.corrodedUntil&&target.corrodedUntil>state.round)){const a=make('acid',target.id,'กรดกัดกร่อนเป้าหลัก',`ทุกการโจมตีของทีม +${corrodeBonusOf(data,heroId)}`);if(a)return a;}
  // Haste the hardest-hitting standing ally so it strikes first next round.
  const ally=[...data.heroes].filter(h=>h.id!==heroId&&state.heroes.some(s=>s.id===h.id&&s.hp>0)).sort((a,b)=>b.attack-a.attack)[0];
  return (ally&&make('haste',ally.id,'ยาเร่งเพื่อนตัวแรง',`${actorName(ally.id,data)} ลงมือก่อนทุกคนรอบหน้า`))??attack();
 }
 if(heroId==='mira'){
  const living2=state.enemies.filter(e=>e.hp>0);
  if(living2.length>1){const v=make('volley','enemies','ห่าธนูโดนทุกตัว',`ตัวละ ${skillPower(data,heroId,'volley')}`);if(v)return v;}
  // Hinder the fastest living enemy so it acts last next round.
  const fast=[...living2].sort((a,b)=>data.enemies.find(e=>e.id===b.id)!.speed-data.enemies.find(e=>e.id===a.id)!.speed)[0];
  return (fast&&make('hinder',fast.id,'ยิงสกัดศัตรูที่เร็วที่สุด',`${actorName(fast.id,data)} จะลงมือท้ายสุดรอบหน้า`))??attack();
 }
 if(heroId==='lio'){
  // Keep one song playing: mending once the party is worn down, otherwise valor; then attack.
  const song=state.song?.heroId===heroId?state.song.action:undefined;
  const worn=state.heroes.some(h=>h.hp>0&&h.hp<data.heroes.find(d=>d.id===h.id)!.maxHp*.5);
  if(worn&&song!=='mend'){const m=make('mend',heroId,'เพลงฟื้นทั้งทีม',`ทุกคนฟื้น ${skillPower(data,heroId,'mend')} ทุกต้นรอบ`);if(m)return m;}
  if(!song){const v=make('valor',heroId,'เพลงกล้าเพิ่มพลังทีม',`ทุกการโจมตี +${skillPower(data,heroId,'valor')}`);if(v)return v;}
  return attack();
 }
 if(heroId==='brann'){
  // Draw the announced hit away from an ally (reduced on him); otherwise slam the main target.
  if(intent&&intent.targetId!==heroId){const t=make('taunt',heroId,'ยั่วยุดึงการโจมตี',`${actorName(intent.sourceId,data)} จะตีแบรนน์แทน${actorName(intent.targetId,data)} และเบาลง ${Math.round(tauntReductionOf(data,heroId)*100)}%`);if(t)return t;}
  return make('slam',pick('slam').id,'ทุบค้อนรูน',`พลัง ${skillPower(data,heroId,'slam')}`)??attack();
 }
 if(heroId==='sefa'){
  // Step aside from the announced hit; otherwise ambush an enemy that still has to act this round.
  if(intent?.targetId===heroId){const e=make('evade',heroId,'ก้าวเงาหลบการโจมตี',`${actorName(intent.sourceId,data)} จะตีพลาด`);if(e)return e;}
  const options=reach('ambush');
  const foe=options.find(e=>ambushBonus(state,data,e.id,heroId)>0)??focus(options);
  return (foe&&make('ambush',foe.id,'จู่โจมก่อนศัตรูขยับ',`พลัง ${skillPower(data,heroId,'ambush')+ambushBonus(state,data,foe.id,heroId)}`))??attack();
 }
 if(heroId==='garran'){
  const front=intent?.kind==='physical'&&data.heroes.find(h=>h.id===intent.targetId)?.lane==='front';
  if(front)return make('brace',heroId,'ตั้งทวนรอสวน',`${actorName(intent!.sourceId,data)} จะโดนแทงสวน ${skillPower(data,heroId,'brace')}`)??make('pierce',pick('pierce').id,'แทงทะลวง',`พลัง ${skillPower(data,heroId,'pierce')}`)??attack();
  return make('pierce',pick('pierce').id,'แทงทะลวง',`พลัง ${skillPower(data,heroId,'pierce')}`)??attack();
 }
 if(heroId==='tracer'){
  // Mark only a foe the duelist can strike next turn.
  const target=pick('execute');
  if(target.markedUntil>state.round)return make('execute',target.id,'ตีเป้าเดิมเพื่อใช้ตรา',`พลัง ${skillPower(data,heroId,'execute')+data.rules.markedBonus}`)??make('attack',target.id,'ตีเป้าเดิมเพื่อใช้ตรา',`เพิ่มพลัง +${data.rules.markedBonus}`);
  return make('mark',target.id,'ติดตราไว้ใช้รอบถัดไป',`ยังไม่ทำความเสียหาย · ตราอยู่ ${data.rules.markDuration} รอบ`)??attack();
 }
 if(heroId==='weaver'){
  if(intent?.kind==='energy'){const ward=make('ward',intent.targetId,'โล่รับพลังงานก่อนเลือด',`โล่ ${skillPower(data,heroId,'ward')}`);if(ward)return ward;}
  return make('bolt',pick('bolt').id,'จอมเวทโจมตีด้วยพลังงาน',`ศรเวทพลัง ${skillPower(data,heroId,'bolt')}`)??attack();
 }
 const injured=state.heroes.filter(h=>h.hp>0).map(h=>({h,missing:data.heroes.find(d=>d.id===h.id)!.maxHp-h.hp})).filter(v=>v.missing>0).sort((a,b)=>b.missing-a.missing);
 if(injured.length){
  const heal=make('heal',injured[0]!.h.id,'รักษาเพื่อนก่อนศัตรูลงมือ',`ฟื้นเลือดได้ถึง ${skillPower(data,heroId,'heal')}`);if(heal)return heal;
  if(injured.length>1){const prayer=make('prayer','party','ฟื้นฟูทั้งทีม',`คนละ ${skillPower(data,heroId,'prayer')}`);if(prayer)return prayer;}
 }
 return attack();
}
