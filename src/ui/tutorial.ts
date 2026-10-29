import { cooldownTargets, hasCap, previewCommand, CATALYST_PER_ROUND, SOLO_TIMES, isDelayed, ambushBonus, corrodeBonusOf, guardReductionOf, interruptBlock, nextIntentOf, plannedIntents, tauntReductionOf, currentHeroId, skillPower, targetOptions } from '../core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition, Command } from '../core/battle/types';
import { actorName } from './th';
export interface Lesson { step:number; title:string; copy:string; heroId:string; action:ActionId; targetId:string; cooldownAction?:ActionId; cooldownTargetId?:string }
// Reactive advice for the teaching battle. It reads the committed state only and
// never suggests commanding a hero outside the current SPD turn.
export function battleLesson(state:BattleState,data:EncounterDefinition):Lesson|undefined {
 if(state.outcome!=='active')return;
 const turnHeroId=currentHeroId(state,data); if(!turnHeroId)return;
 const heroId:string=turnHeroId;
 const make=(action:ActionId,targetId:string,title:string,detail:string):Lesson|undefined=>{
  if(!targetOptions(state,data,heroId,action).some(t=>t.id===targetId&&t.valid))return;
  return{step:state.commands.length+1,heroId,action,targetId,title,copy:`${actorName(heroId,data)} → ${data.skills[action].name} → ${actorName(targetId,data)} · ${detail}`};
 };
 const role=data.heroes.find(h=>h.id===heroId)!.role;
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
 // Release A tree skills (docs/design/SKILL_TREES_ALL_TH.md) are suggested only when the hero has them equipped (`make` checks).
 const row=(id:string)=>data.enemies.find(d=>d.id===id)?.row;
 const lane=(id:string)=>data.heroes.find(h=>h.id===id)?.lane;
 const front=living.filter(e=>row(e.id)==='front'),back=living.filter(e=>row(e.id)==='back');
 // New roster kits are compared through the actual resolver. This is an advisor policy,
 // not a second implementation of healing or cooldown rules.
 if(role==='Saint'||role==='Dancer'){
  const candidates:Array<{command:Command;score:number;damage:number;healed:number;recovered:number}>=[];
  const me=data.heroes.find(h=>h.id===heroId)!;
  for(const action of me.actions){
   for(const target of targetOptions(state,data,heroId,action).filter(t=>t.valid)){
    const command:Command={heroId,beat:state.beat,action,targetId:target.id};
    if(action==='duet'&&hasCap(data,heroId,'lalin2'))command.cooldownAction=cooldownTargets(state,data,target.id)[0];
    if(action==='echofoot'&&hasCap(data,heroId,'dancerEchoChoose')){
     const allies=state.heroes.filter(h=>h.id!==heroId&&h.hp>0&&cooldownTargets(state,data,h.id).length).sort((a,b)=>{
      const total=(id:string)=>cooldownTargets(state,data,id).reduce((n,a)=>n+Math.max(0,(state.heroes.find(h=>h.id===id)!.cooldowns[a]??0)-state.round),0);
      return total(b.id)-total(a.id);
     });
     if(allies[0])command.cooldownTargetId=allies[0].id;
    }
    const result=previewCommand(state,data,command),turn=result.turns.find(t=>t.side==='hero');
    if(!turn)continue;
    const damage=turn.events.filter(e=>e.type==='damage'&&e.sourceId===heroId&&state.enemies.some(x=>x.id===e.targetId)).reduce((n,e)=>n+(e.amount??0),0);
    const healed=turn.events.filter(e=>e.type==='heal'&&e.sourceId===heroId).reduce((n,e)=>n+(e.amount??0),0);
    let recovered=0,readied=0;
    for(const ally of state.heroes.filter(h=>h.id!==heroId&&h.hp>0))for(const a of cooldownTargets(state,data,ally.id)){
     const before=Math.max(0,(ally.cooldowns[a]??0)-state.round),after=Math.max(0,(turn.state.heroes.find(h=>h.id===ally.id)?.cooldowns[a]??0)-state.round);
     recovered+=Math.max(0,before-after);
     if(before>0&&after===0)readied++;
    }
    const kills=turn.events.filter(e=>e.type==='down'&&state.enemies.some(x=>x.id===e.targetId)).length;
    candidates.push({command,score:damage+healed*1.5+recovered*5+readied*6+kills*8,damage,healed,recovered});
   }
  }
  const best=candidates.sort((a,b)=>b.score-a.score)[0];
  if(best){const {command,damage,healed,recovered}=best;return{...command,step:state.commands.length+1,title:role==='Saint'?'รุกพร้อมแบ่งเลือดให้เพื่อน':'เลือกจังหวะที่ช่วยทีม',copy:`${actorName(heroId,data)} → ${data.skills[command.action].name} → ${actorName(command.targetId,data)} · คาดการณ์ดาเมจ ${damage}${healed?` · ฟื้นเลือด ${healed}`:''}${recovered?` · คืนคูลดาวน์รวม ${recovered} รอบ`:''}`};}
  return attack();
 }
 const tree=treeAdvice(); if(tree)return tree;
 function treeAdvice():Lesson|undefined{
  if(role==='Knight'){
   if(intent?.all){const b=make('bulwark',heroId,'กำแพงโล่คุ้มแนวหน้า',`ลด ${skillPower(data,heroId,'bulwark')}%`);if(b)return b;}
   const pending=plannedIntents(state,data,3).filter(i=>i.round===state.round&&!i.charge&&!i.special);
   if(intent?.all||new Set(pending.map(i=>i.targetId)).size>=2){const r=make('rally',heroId,'ตั้งรับหมู่รับหลายท่า','ลดท่าแรกของเพื่อนแต่ละคน');if(r)return r;}
   const low=state.heroes.find(h=>h.id!==heroId&&h.hp>0&&h.hp<data.heroes.find(d=>d.id===h.id)!.maxHp*.6);
   if(low&&intent&&!intent.all){const r=make('rouse',heroId,'ยืนเคียงข้างเพื่อนบาดเจ็บ','รับแทนจนถึงเทิร์นถัดไป');if(r)return r;}
  }
  if(role==='Duelist'){
   if(intent?.kind==='physical'&&intent.targetId===heroId){const p=make('parry',heroId,'ปัดดาบรับท่ากายภาพ',`${actorName(intent.sourceId,data)} จะโดนฟันสวน`);if(p)return p;}
   if(front.length>=2){const w=make('sweep','enemies','ฟันกวาดแถวหน้า',`ตัวละ ${skillPower(data,heroId,'sweep')}`);if(w)return w;}
   const low=reach('finisher').find(e=>e.hp*100<data.enemies.find(d=>d.id===e.id)!.maxHp*40);
   if(low){const f=make('finisher',low.id,'ปลิดชีพศัตรูที่เลือดน้อย',`พลัง ${skillPower(data,heroId,'finisher')*2}`);if(f)return f;}
   const rear=back.find(e=>e.markedUntil>state.round);
   if(rear){const l=make('lunge',rear.id,'พุ่งตัดแถวหลังที่ติดตรา',`พลัง ${skillPower(data,heroId,'lunge')+data.rules.markedBonus}`);if(l)return l;}
  }
  if(role==='Mage'){
   if(living.length>=3){const st=make('storm','enemies','พายุเวทโดนทุกตัว',`ตัวละ ${skillPower(data,heroId,'storm')}`);if(st)return st;}
   // Crystal aegis before a whole-party move, or to open a fight while most allies have no barrier.
   const bare=state.heroes.filter(h=>h.hp>0&&!h.barrier).length;
   if(intent?.all||(intent&&bare>=3&&intent.damage>=15)){const a=make('aegis','party','เกราะผลึกให้ทั้งทีม',`ทุกคนได้โล่ ${skillPower(data,heroId,'aegis')}`);if(a)return a;}
   if(intent?.kind==='energy'&&!interruptBlock(state,data,intent.sourceId,intent)&&nextIntentOf(state,data,intent.sourceId)?.kind==='energy'){const g=make('sigil',intent.sourceId,'ตรึงเวทยกเลิกท่าพลังงาน',`${actorName(intent.sourceId,data)} จะเสียท่าพลังงานถัดไป`);if(g)return g;}
   const veiled=living.find(e=>(e.steadyRound??0)>=state.round||data.enemies.find(d=>d.id===e.id)?.traits?.includes('veilguard')&&!(e.markedUntil>state.round)&&!((e.corrodedUntil??0)>state.round)&&!((e.dispelledUntil??0)>state.round));
   if(veiled){const d=make('dispel',veiled.id,'สลายเกราะและไม่หวั่นไหว','ลบความต้านการขัดจังหวะและปิดเกราะพลังงานถึงจบรอบถัดไป');if(d)return d;}
  }
  if(role==='Priest'){
   const fallen=state.heroes.find(h=>h.hp<=0&&h.fell);
   if(fallen){const r=make('revive',fallen.id,'ฟื้นคืนเพื่อนที่ล้ม',`${actorName(fallen.id,data)} กลับมาด้วยเลือด ${skillPower(data,heroId,'revive')}%`);if(r)return r;}
   // Halo a whole-party energy move, or a heavy one while nobody badly needs healing.
   const low=state.heroes.some(h=>h.hp>0&&h.hp<data.heroes.find(d=>d.id===h.id)!.maxHp*.5);
   if(intent?.kind==='energy'&&(intent.all||(intent.damage>=20&&!low))){const h=make('halo',heroId,'วงแสงรับท่าพลังงาน',`ลด ${skillPower(data,heroId,'halo')}%`);if(h)return h;}
   const aimed=intent&&!intent.all?state.heroes.find(h=>h.id===intent.targetId):undefined;
   if(aimed&&aimed.hp+aimed.barrier<=intent!.damage){const c=make('sanctuary',aimed.id,'พรคุ้มภัยกันล้ม',`${actorName(aimed.id,data)} เลือดไม่ต่ำกว่า 1`);if(c)return c;}
   const hurt=state.heroes.some(h=>h.hp>0&&h.hp<data.heroes.find(d=>d.id===h.id)!.maxHp*.7);
   const strong=state.heroes.find(h=>h.hp>0&&!h.renew&&h.hp<data.heroes.find(d=>d.id===h.id)!.maxHp);
   if(hurt&&strong){const b=make('bless',strong.id,'พรต่อเนื่องให้เพื่อนบาดเจ็บ',`ฟื้น ${skillPower(data,heroId,'bless')} ต่อรอบ 2 รอบ`);if(b)return b;}
  }
  if(role==='Spear'){
   // Hold the line for a back-liner the move would hurt badly, while Garran has HP to spare.
   const aimed=intent&&!intent.all&&lane(intent.targetId)==='back'?state.heroes.find(h=>h.id===intent.targetId):undefined;
   const me=state.heroes.find(h=>h.id===heroId)!,myMax=data.heroes.find(h=>h.id===heroId)!.maxHp;
   if(aimed&&intent!.damage*100>=data.heroes.find(h=>h.id===aimed.id)!.maxHp*35&&me.hp*2>myMax){const h=make('hold',heroId,'ทวนโต้คุ้มแนวหลัง',`${actorName(intent!.sourceId,data)} จะโดนแทงสวน`);if(h)return h;}
   if(intent?.kind==='physical'&&lane(intent.targetId)==='front'){const w=make('spearwall',heroId,'กำแพงทวนสวนทุกท่า',`สวน ${skillPower(data,heroId,'spearwall')} ทุกครั้ง`);if(w)return w;}
   const ahead=reach('halt').find(e=>state.order.indexOf(e.id)>state.turnIndex&&nextIntentOf(state,data,e.id)?.kind==='physical'&&nextIntentOf(state,data,e.id)?.round===state.round);
   if(ahead){const t=make('halt',ahead.id,'แทงสวนจังหวะก่อนมันตี',`${actorName(ahead.id,data)} โดนแรงขึ้น 50%`);if(t)return t;}
   // War cry pays off while at least two other front-liners still act this round.
   if(intent?.kind==='physical'&&lane(intent.targetId)==='front'){const c=make('warcry',heroId,'เสียงศึกปลุกแนวหน้า',`แนวหน้าสวนกายภาพ ${skillPower(data,heroId,'warcry')}`);if(c)return c;}
  }
  if(role==='Archer'){
   if(front.length&&back.length&&state.heroes.some(h=>h.hp>0&&lane(h.id)==='front'&&h.id!==heroId)){const p=make('pin','enemies','ตรึงแถวหน้าเปิดแถวหลัง','ทั้งทีมตีแถวหลังได้');if(p)return p;}
   // Tail movement helps when it lets a living ally act before a pending foe, regardless of damage kind or target.
   const foeIndex=intent?state.order.indexOf(intent.sourceId):-1;
   if(intent&&foeIndex>state.turnIndex&&state.order.slice(foeIndex+1).some(id=>state.heroes.some(h=>h.id===id&&h.hp>0))){const d=make('disengage',intent.sourceId,'ยิงถอยคิวเปิดจังหวะให้เพื่อน','ศัตรูไปท้ายคิวรอบนี้');if(d)return d;}
   const slowed=living.find(e=>isDelayed(e,state.round));
   if(slowed){const t=make('track',slowed.id,'ศรตามรอยเป้าที่ถูกสกัด',`ยิงซ้ำตอนจบรอบ`)??make('weakshot',slowed.id,'ศรจุดอ่อนเป้าที่ถูกสกัด',`พลัง ${skillPower(data,heroId,'weakshot')+data.rules.weakshotBonus}`);if(t)return t;}
  }
  // Recruit trees (owner 2026-10-23): suggested only when equipped (`make` checks).
  // A dangerous move: a whole-party move, or one that would take at least 35% of its target's max HP.
  const heavy=!!intent&&(intent.all||intent.damage*100>=(data.heroes.find(h=>h.id===intent.targetId)?.maxHp??0)*35);
  const strongest=[...data.heroes].filter(h=>h.id!==heroId&&state.heroes.some(x=>x.id===h.id&&x.hp>0)).sort((a,b)=>b.attack-a.attack)[0];
  if(role==='Alchemist'){
   if(heavy&&intent){const k=make('smoke',intent.sourceId,'ขวดควันลดท่าที่กำลังมา',`${actorName(intent.sourceId,data)} เบาลง ${skillPower(data,heroId,'smoke')}%`);if(k)return k;}
   const ripe=living.find(e=>(e.corrodedUntil??0)-state.round>=2);
   if(ripe){const c=make('catalyst',ripe.id,'ระเบิดกร่อนด้วยตัวเร่ง',`พลัง ${skillPower(data,heroId,'catalyst')+2*CATALYST_PER_ROUND}`);if(c)return c;}
   if(living.length>=3){const b=make('bomb','enemies','ขวดระเบิดโดนทุกตัว',`ตัวละ ${skillPower(data,heroId,'bomb')}`);if(b)return b;}
   if(strongest&&!(intent&&intent.targetId===strongest.id)){const f=make('fury',strongest.id,'ยาคลั่งให้ตัวตีหลัก',`${actorName(strongest.id,data)} แรงขึ้น ${skillPower(data,heroId,'fury')}%`);if(f)return f;}
  }
  if(role==='Scout'){
   const aimedBack=intent&&!intent.all&&intent.targetId!==heroId&&lane(intent.targetId)==='back'&&intent.damage*100>=data.heroes.find(h=>h.id===intent.targetId)!.maxHp*35;
   if(aimedBack){const d=make('decoy',intent!.targetId,'เงาคุ้มกันแนวหลัง',`${actorName(intent!.sourceId,data)} จะถูกหลบ`);if(d)return d;}
   if(heavy&&intent&&intent.kind==='physical'&&!intent.all){const x=make('disarm',intent.sourceId,'ปาดตัดหน้าศัตรู',`${actorName(intent.sourceId,data)} โดนแรงขึ้นถ้ายังไม่ลงมือและเล็งเพื่อน`);if(x)return x;}
   if(back.length&&(front.length||back.length>=2)){const k=make('knives','enemies','มีดบินใส่แถวหลัง',`ตัวละ ${skillPower(data,heroId,'knives')}`);if(k)return k;}
   const low=reach('backstab').find(e=>e.hp<=skillPower(data,heroId,'backstab')+4);
   if(low){const b=make('backstab',low.id,'ลอบแทงปิดฉาก',`พลัง ${skillPower(data,heroId,'backstab')}`);if(b)return b;}
  }
  if(role==='Warden'){
   if(intent&&!intent.all&&intent.targetId===heroId&&intent.damage>=15){const a=make('stonearmor',heroId,'เกราะหินรับท่าหนัก',`โล่ ${skillPower(data,heroId,'stonearmor')}%`);if(a)return a;}
   if(front.length>=1){const q=make('quake','enemies','ทุบปฐพีแถวหน้า',`ตัวละ ${skillPower(data,heroId,'quake')}`);if(q)return q;}
   if(front.length>=2||(heavy&&intent&&row(intent.sourceId)==='front')){const t=make('tremor','enemies','ปฐพีสั่นแถวหน้า',`ท่าถัดไปเล็งแบรนน์`);if(t)return t;}
   if(intent&&!intent.all&&intent.targetId!==heroId&&state.heroes.find(h=>h.id===heroId)!.cooldowns.taunt!==undefined){const g=make('guardstone',intent.targetId,'ศิลาดึงท่าแทนเพื่อน',`เบาลง ${skillPower(data,heroId,'guardstone')}%`);if(g)return g;}
  }
  if(role==='Bard'){
   // Healing first: a worn party keeps (or gets) the song of mending, and a mending finale when several are hurt.
   const song=state.song?.heroId===heroId?state.song.action:undefined;
   const hurt=state.heroes.filter(h=>h.hp>0&&h.hp<data.heroes.find(d=>d.id===h.id)!.maxHp*.5).length;
   if(hurt&&song!=='mend')return undefined;
   if(song==='mend'&&hurt>=2){const f=make('finale',heroId,'บทสุดท้ายฟื้นทั้งทีม',`ทุกคนฟื้นทันที`);if(f)return f;}
   if(heavy&&(!song||song==='valor')){const d=make('dread',heroId,'เพลงสะท้านรับท่าหนัก',`ทุกท่าศัตรูเบาลง ${skillPower(data,heroId,'dread')}%`);if(d)return d;}
   if(song==='valor'&&strongest){const o=make('solo',strongest.id,'เพลงเดี่ยวให้ตัวตีหลัก',`${actorName(strongest.id,data)} ได้เพลงกล้า ×${SOLO_TIMES}`);if(o)return o;}
   if(song==='valor'&&living.length>=2){const f=make('finale',heroId,'บทสุดท้ายปล่อยพลังเพลง',`ตัวละ ${skillPower(data,heroId,'finale')}`);if(f)return f;}
   if(song){const n=make('note',pick('note').id,'โน้ตคมระหว่างเพลงเล่น',`พลัง ${skillPower(data,heroId,'note')}`);if(n)return n;}
  }
  return undefined;
 }
 if(role==='Knight'){
  // A steadfast boss or an unstoppable move cannot be bashed: guard it instead.
  // Guard covers one announced hit; a whole-party move cannot be guarded.
  const guard=()=>intent&&!intent.all?make('guard',intent.targetId,'อ่านแผนศัตรู',`รับแทนและลดพลัง ${intent.damage} → ${Math.ceil(intent.damage*(1-guardReductionOf(data,heroId)))}`):undefined;
  if(intent?.kind==='physical'&&!interruptBlock(state,data,intent.sourceId,intent))return make('bash',intent.sourceId,'ขัดจังหวะโจมตีกายภาพ',`${actorName(intent.sourceId,data)} จะเสียเทิร์นโจมตีกายภาพถัดไป`)??guard()??attack();
  return guard()??attack();
 }
 if(role==='Alchemist'){
  const target=pick('acid');
  if(!(target.corrodedUntil&&target.corrodedUntil>state.round)){const a=make('acid',target.id,'กรดกัดกร่อนเป้าหลัก',`ทุกการโจมตีของทีม +${corrodeBonusOf(data,heroId)}`);if(a)return a;}
  // Haste the hardest-hitting standing ally so it strikes first next round.
  const ally=[...data.heroes].filter(h=>h.id!==heroId&&state.heroes.some(s=>s.id===h.id&&s.hp>0)).sort((a,b)=>b.attack-a.attack)[0];
  return (ally&&make('haste',ally.id,'ยาเร่งเพื่อนตัวแรง',`${actorName(ally.id,data)} ลงมือก่อนทุกคนรอบหน้า`))??attack();
 }
 if(role==='Archer'){
  const living2=state.enemies.filter(e=>e.hp>0);
  if(living2.length>1){const v=make('volley','enemies','ห่าธนูโดนทุกตัว',`ตัวละ ${skillPower(data,heroId,'volley')}`);if(v)return v;}
  // Hinder the fastest living enemy so it acts last next round.
  const fast=[...living2].sort((a,b)=>data.enemies.find(e=>e.id===b.id)!.speed-data.enemies.find(e=>e.id===a.id)!.speed)[0];
  return (fast&&make('hinder',fast.id,'ยิงสกัดศัตรูที่เร็วที่สุด',`${actorName(fast.id,data)} จะลงมือท้ายสุดรอบหน้า`))??attack();
 }
 if(role==='Bard'){
  // Keep one song playing: mending once the party is worn down, otherwise valor; then attack.
  const song=state.song?.heroId===heroId?state.song.action:undefined;
  const worn=state.heroes.some(h=>h.hp>0&&h.hp<data.heroes.find(d=>d.id===h.id)!.maxHp*.5);
  if(worn&&song!=='mend'){const m=make('mend',heroId,'เพลงฟื้นทั้งทีม',`ทุกคนฟื้น ${skillPower(data,heroId,'mend')} ทุกต้นรอบ`);if(m)return m;}
  if(!song){const v=make('valor',heroId,'เพลงกล้าเพิ่มพลังทีม',`ทุกการโจมตี +${skillPower(data,heroId,'valor')}`);if(v)return v;}
  return attack();
 }
 if(role==='Warden'){
  // Draw the announced hit away from an ally (reduced on him); otherwise slam the main target.
  if(intent&&intent.targetId!==heroId){const t=make('taunt',heroId,'ยั่วยุดึงการโจมตี',`${actorName(intent.sourceId,data)} จะตีแบรนน์แทน${actorName(intent.targetId,data)} และเบาลง ${Math.round(tauntReductionOf(data,heroId)*100)}%`);if(t)return t;}
  return make('slam',pick('slam').id,'ทุบค้อนรูน',`พลัง ${skillPower(data,heroId,'slam')}`)??attack();
 }
 if(role==='Scout'){
  // Step aside from the announced hit; otherwise ambush an enemy that still has to act this round.
  if(intent?.targetId===heroId){const e=make('evade',heroId,'ก้าวเงาหลบการโจมตี',`${actorName(intent.sourceId,data)} จะตีพลาด`);if(e)return e;}
  const options=reach('ambush');
  const foe=options.find(e=>ambushBonus(state,data,e.id,heroId)>0)??focus(options);
  return (foe&&make('ambush',foe.id,'จู่โจมก่อนศัตรูขยับ',`พลัง ${skillPower(data,heroId,'ambush')+ambushBonus(state,data,foe.id,heroId)}`))??attack();
 }
 if(role==='Spear'){
  const front=intent?.kind==='physical'&&data.heroes.find(h=>h.id===intent.targetId)?.lane==='front';
  if(front)return make('brace',heroId,'ตั้งทวนรอสวน',`${actorName(intent!.sourceId,data)} จะโดนแทงสวน ${skillPower(data,heroId,'brace')}`)??make('pierce',pick('pierce').id,'แทงทะลวง',`พลัง ${skillPower(data,heroId,'pierce')}`)??attack();
  return make('pierce',pick('pierce').id,'แทงทะลวง',`พลัง ${skillPower(data,heroId,'pierce')}`)??attack();
 }
 if(role==='Duelist'){
  // Mark only a foe the duelist can strike next turn.
  const target=pick('execute');
  if(target.markedUntil>state.round)return make('execute',target.id,'ตีเป้าเดิมเพื่อใช้ตรา',`พลัง ${skillPower(data,heroId,'execute')+data.rules.markedBonus}`)??make('attack',target.id,'ตีเป้าเดิมเพื่อใช้ตรา',`เพิ่มพลัง +${data.rules.markedBonus}`);
  return make('mark',target.id,'ติดตราไว้ใช้รอบถัดไป',`ยังไม่ทำความเสียหาย · ตราอยู่ ${data.rules.markDuration} รอบ`)??attack();
 }
 if(role==='Mage'){
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
