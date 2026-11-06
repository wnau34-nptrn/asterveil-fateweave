import { bigMove, capAmount, enemyIntent, actionReason, CHARGE_EXPOSED, SPEARWALL_STEP, hexTickPower, validateCommand, cooldownTargets, previewCommand, CATALYST_PER_ROUND, CATALYST_SPLASH, HASTE_BATON, VENOM_BURST, COAT_HITS, BLADE_HITS, DISPEL_PER_CHARGE, NOTE_MAX_ROUNDS, FINALE_PER_ROUND, CHALLENGE_GRUDGE_MAX, SANCTUARY_HEAL, foeNeighbours, SOLO_TIMES, isDelayed, ambushBonus, corrodeBonusOf, guardReductionOf, interruptBlock, nextIntentOf, plannedIntents, tauntReductionOf, currentHeroId, skillPower, targetOptions } from '../core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition, Command } from '../core/battle/types';
import { actorName } from './th';
// Seer advisor (tree-sim tuned 2026-11-06, drafts): a delayed big move still comes, so a delay is worth a small share of
// its damage, and most of it when the foe is low enough (HP ≤ SEER_DOWN_HP after the hit) to be downed before it lands.
const SEER_DELAY_SHARE=.1,SEER_DOWN_SHARE=.8,SEER_DOWN_HP=50;
export interface Lesson { step:number; title:string; copy:string; heroId:string; action:ActionId; targetId:string; cooldownAction?:ActionId; cooldownTargetId?:string; recipientId?:string; steps?:number }
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
 // Martial (P03): every legal command previewed; stored chi is worth a little, so the advisor builds to a finisher
 // and spends when the payoff beats one more gathering strike.
 if(role==='Martial'){
  const me=data.heroes.find(h=>h.id===heroId)!,chi=state.heroes.find(h=>h.id===heroId)?.chi??0;let best:{command:Command;score:number;damage:number}|undefined;
  for(const action of me.actions)for(const target of targetOptions(state,data,heroId,action).filter(t=>t.valid)){
   const command:Command={heroId,beat:state.beat,action,targetId:target.id};
   const turn=previewCommand(state,data,command).turns.find(t=>t.side==='hero');if(!turn)continue;
   const damage=turn.events.filter(e=>e.type==='damage'&&e.sourceId===heroId&&state.enemies.some(x=>x.id===e.targetId)).reduce((n,e)=>n+(e.amount??0),0);
   const kills=turn.events.filter(e=>e.type==='down'&&state.enemies.some(x=>x.id===e.targetId)).length;
   const after=turn.state.heroes.find(h=>h.id===heroId)?.chi??0;
   // Save v54: a clash is worth the damage it takes off the move aimed at Kael; HP paid for a circle fist costs him.
   const clash=turn.events.filter(e=>e.type==='clash'&&e.sourceId===heroId).reduce((n,e)=>n+(e.amount??0),0);
   const paid=turn.events.filter(e=>e.type==='damage'&&e.sourceId===heroId&&e.targetId===heroId).reduce((n,e)=>n+(e.amount??0),0);
   const score=damage+kills*8+(after-chi)*5+clash-paid*1.2;
   if(!best||score>best.score)best={command,score,damage};
  }
  if(best){const {command,damage}=best;const after=command.action;return{...command,step:state.commands.length+1,title:['releasefist','circlefist','perfectfist'].includes(after)?'จ่ายปราณปิดท่า':'สะสมปราณ',copy:`${actorName(heroId,data)} → ${data.skills[command.action].name} → ${actorName(command.targetId,data)} · คาดการณ์ดาเมจ ${damage} · ปราณ ${chi}`};}
  return attack();
 }
 // Spear (save v50 rework): judged like the Seer, on the whole preview up to the party's next command (counters and a
 // pinned move included); a shove is judged by which foe it pulls forward and which it hides, and the charge's exposure
 // shows as party HP lost in the preview.
 if(role==='Spear'){
  const me=data.heroes.find(h=>h.id===heroId)!;let best:{command:Command;score:number}|undefined;
  const foeLoss=(r:ReturnType<typeof previewCommand>)=>state.enemies.reduce((n,e)=>n+e.hp-(r.state.enemies.find(x=>x.id===e.id)?.hp??0),0);
  const partyLoss=(r:ReturnType<typeof previewCommand>)=>state.heroes.reduce((n,h)=>n+Math.max(0,h.hp+h.barrier-(r.state.heroes.find(x=>x.id===h.id)?.hp??0)-(r.state.heroes.find(x=>x.id===h.id)?.barrier??0)),0);
  for(const action of me.actions)for(const target of targetOptions(state,data,heroId,action).filter(t=>t.valid)){
   const command:Command={heroId,beat:state.beat,action,targetId:target.id};
   if(validateCommand(state,data,command))continue;
   const r=previewCommand(state,data,command);
   // A shove helps when it pulls forward a foe weaker than the one it hides (front-lane allies can finish it); hiding the
   // foe the party is wearing down costs them a target.
   const moved=r.state.enemies.find(e=>e.shoved&&!state.enemies.find(x=>x.id===e.id)?.shoved),partner=moved?.shoved?.partnerId?r.state.enemies.find(e=>e.id===moved.shoved!.partnerId):undefined;
   const pulled=moved?(partner&&partner.hp<=moved.hp?8:-12):0;
   // Effects that outlive the preview window: a stance still waiting on the announced physical hit on the front lane, a
   // pinned foe that has not acted yet, and the charge's exposure to a move aimed at him.
   const countered=r.turns.some(t=>t.events.some(e=>e.type==='counter'&&e.sourceId===heroId));
   const frontHits=living.filter(e=>{const n=nextIntentOf(state,data,e.id);return n?.kind==='physical'&&!n.all&&lane(n.targetId)==='front';}).length;
   const stance=countered?0:(action==='brace'&&intent?.kind==='physical'&&lane(intent.targetId)==='front'?skillPower(data,heroId,'brace')*.8:action==='spearwall'?(skillPower(data,heroId,'spearwall')*.8+(intent?.damage??0)*SPEARWALL_STEP/100)*frontHits:0);
   const pinned=r.state.enemies.find(e=>e.id===target.id&&e.hp>0&&e.weaken&&action==='hold');const pin=pinned?(nextIntentOf(r.state,data,pinned.id)?.damage??0)*pinned.weaken!/100*.4:0;
   const open=action==='warcry'&&intent?.targetId===heroId&&r.state.charge?.heroId===heroId?intent.damage*CHARGE_EXPOSED/100:0;
   const score=foeLoss(r)-partyLoss(r)*1.2+pulled+stance+pin-open*1.2+(r.state.outcome==='victory'?50:0)-(r.state.outcome==='defeat'?100:0);
   if(!best||score>best.score)best={command,score};
  }
  if(best){const {command}=best;return{...command,step:state.commands.length+1,title:command.action==='attack'?'โจมตีพื้นฐาน':`ใช้${data.skills[command.action].name}`,copy:`${actorName(heroId,data)} → ${data.skills[command.action].name} → ${actorName(command.targetId,data)}`};}
  return attack();
 }
 // Hexer (P03): a curse deals nothing now, so the advisor values the damage still to come: each stack's tick for every
 // round-end left on it; a pull's instant tick counts as damage now and its loosened stack as curse value lost. Every
 // candidate goes through the resolver preview.
 // Seer (P03): judged on the whole preview up to the party's next command, enemy turns included: HP removed from foes
 // (a bent move counts) minus HP the party loses. Every legal attacker × recipient pair and dial is tried.
 if(role==='Seer'){
  const me=data.heroes.find(h=>h.id===heroId)!;let best:{command:Command;score:number}|undefined;
  const foeLoss=(r:ReturnType<typeof previewCommand>)=>state.enemies.reduce((n,e)=>n+e.hp-(r.state.enemies.find(x=>x.id===e.id)?.hp??0),0);
  const partyLoss=(r:ReturnType<typeof previewCommand>)=>state.heroes.reduce((n,h)=>n+Math.max(0,h.hp+h.barrier-(r.state.heroes.find(x=>x.id===h.id)?.hp??0)-(r.state.heroes.find(x=>x.id===h.id)?.barrier??0)),0);
  // Effects past the preview window (save v51). A delayed big move still comes a round later, so the delay is worth a share
  // of its damage (a round to prepare for it, or to down the foe first), not all of it: when the stand-in move fell inside
  // the window the preview's saving is taken back and replaced by that share. A falling star still waiting for its round
  // to end counts its hits on the foes standing in the preview, a little discounted for the risk of the Seer falling.
  const alive=state.heroes.filter(h=>h.hp>0).length,hurt=(i:{damage:number;all?:boolean}|null|undefined)=>i?i.damage*(i.all?alive:1):0;
  const seerLater=(r:ReturnType<typeof previewCommand>,command:Command):number=>{
   if(command.action==='turncycle'&&r.turns.some(t=>t.side==='hero'&&t.events.some(e=>e.type==='dial'))){
    const after=r.turns[0]!.state,foe=after.enemies.find(e=>e.id===command.targetId),delay=foe?.postpone;if(!delay)return 0;
    const filler=enemyIntent(after,data,command.targetId,delay.round),block=[1,2].filter(k=>delay.round+k<=delay.until).map(k=>enemyIntent(after,data,command.targetId,delay.round+k));
    const big=Math.max(0,...block.map(hurt)),first=block[0]?.charge?0:hurt(block[0]);
    const inWindow=r.turns.some(t=>t.side==='enemy'&&t.actorId===command.targetId);
    const left=r.state.enemies.find(e=>e.id===command.targetId)?.hp??0,share=left<=SEER_DOWN_HP?SEER_DOWN_SHARE:SEER_DELAY_SHARE;
    return big*share-(inWindow?Math.max(0,first-hurt(filler))*1.2:0);
   }
   if(command.action==='doubledial')return(r.state.meteors??[]).filter(m=>m.heroId===heroId).reduce((n,m)=>n+r.state.enemies.filter(e=>e.hp>0).reduce((k,e)=>k+Math.min(e.hp,m.power+(bigMove(r.state,data,e.id,enemyIntent(r.state,data,e.id,m.round+1))?capAmount(data,heroId,'seerMeteorBig'):0)),0)*.9,0);
   return 0;
  };
  for(const action of me.actions)for(const target of targetOptions(state,data,heroId,action).filter(t=>t.valid)){
   const extras:Partial<Command>[]=action==='deflectfate'?state.enemies.filter(e=>e.hp>0&&e.id!==target.id).map(e=>({recipientId:e.id})):[{}];
   for(const extra of extras){
    const command:Command={heroId,beat:state.beat,action,targetId:target.id,...extra};
    if(validateCommand(state,data,command))continue;
    const r=previewCommand(state,data,command);
    const score=foeLoss(r)-partyLoss(r)*1.2+seerLater(r,command)+(r.state.outcome==='victory'?50:0)-(r.state.outcome==='defeat'?100:0);
    if(!best||score>best.score)best={command,score};
   }
  }
  if(best){const {command}=best;return{...command,step:state.commands.length+1,title:command.action==='deflectfate'?'เบนท่าศัตรูไปลงพวกเดียวกัน':command.action==='attack'?'โจมตีพื้นฐาน':'อ่านชะตาแล้วลงมือ',copy:`${actorName(heroId,data)} → ${data.skills[command.action].name} → ${actorName(command.targetId,data)}${command.recipientId?` → ${actorName(command.recipientId,data)}`:''}`};}
  return attack();
 }
 if(role==='Hexer'){
  const potential=(s:BattleState)=>s.enemies.filter(e=>e.hp>0).reduce((n,e)=>n
   +(e.hexes??[]).filter(h=>h.heroId===heroId).reduce((m,h)=>m+hexTickPower(data,heroId,h.stacks)*Math.max(0,h.until-s.round+1),0),0);
  const me=data.heroes.find(h=>h.id===heroId)!,now=potential(state);let best:{command:Command;score:number}|undefined;
  for(const action of me.actions)for(const target of targetOptions(state,data,heroId,action).filter(t=>t.valid)){
   const command:Command={heroId,beat:state.beat,action,targetId:target.id};
   const turn=previewCommand(state,data,command).turns.find(t=>t.side==='hero');if(!turn)continue;
   const damage=turn.events.filter(e=>e.type==='damage'&&e.sourceId===heroId&&state.enemies.some(x=>x.id===e.targetId)).reduce((n,e)=>n+(e.amount??0),0);
   const kills=turn.events.filter(e=>e.type==='down'&&state.enemies.some(x=>x.id===e.targetId)).length;
   // Stacks keep paying when refreshed, so laid curse value is weighted a little above one-off damage.
   const score=damage+kills*8+(potential(turn.state)-now)*1.3;
   if(!best||score>best.score)best={command,score};
  }
  if(best){const {command}=best;return{...command,step:state.commands.length+1,title:command.action==='attack'?'โจมตีพื้นฐาน':command.action==='lifetoll'||command.action==='tollring'?'ดึงด้ายให้สาปทำงานทันที':'ผูกสาปให้กินเลือดทุกจบรอบ',copy:`${actorName(heroId,data)} → ${data.skills[command.action].name} → ${actorName(command.targetId,data)}`};}
  return attack();
 }
 if(role==='Saint'||role==='Dancer'){
  const candidates:Array<{command:Command;score:number;damage:number;healed:number;recovered:number}>=[];
  const me=data.heroes.find(h=>h.id===heroId)!;
  for(const action of me.actions){
   for(const target of targetOptions(state,data,heroId,action).filter(t=>t.valid)){
    const command:Command={heroId,beat:state.beat,action,targetId:target.id};
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
    // Skill rework 2026-11-05: a dancer's barrier counts when it keeps an ally standing against the damage announced at them
    // this round; a duet is worth its share of the bound ally's strongest ready skill, a deep beat its cut of the hits
    // announced at the ally, and each beat gained a little of the closing step it feeds.
    const incoming=(id:string)=>plannedIntents(state,data,state.order.length).filter(i=>i.round===state.round&&(i.all||i.targetId===id)).reduce((n,i)=>n+i.damage,0);
    const saved=turn.events.filter(e=>e.type==='barrier'&&e.sourceId===heroId).filter(e=>{const a=state.heroes.find(h=>h.id===e.targetId)!,hit=incoming(a.id);return a.hp+a.barrier<=hit&&a.hp+a.barrier+(e.amount??0)>hit;}).length;
    const ready=(id:string)=>Math.max(0,...data.heroes.find(h=>h.id===id)!.actions.filter(a=>a!=='attack'&&!actionReason(state,data,id,a).startsWith('Cooldown')).map(a=>skillPower(data,id,a)));
    const echo=action==='duet'?ready(target.id)*skillPower(data,heroId,'duet')/100:0;
    const cover=action==='rounddance'?turn.events.filter(e=>e.type==='barrier'&&e.sourceId===heroId).reduce((n,e)=>n+Math.min(e.amount??0,incoming(e.targetId!)),0)*.6:0;
    // Deep beat covers every hit on the party this round: worth its cut of the damage announced this round, plus the counter step.
    const steady=action==='deepbeat'?plannedIntents(state,data,state.order.length).filter(i=>i.round===state.round).reduce((n,i)=>n+i.damage*(i.all?2:1),0)*skillPower(data,heroId,'deepbeat')/100*.8:0;
    const beats=turn.events.filter(e=>e.type==='beat'&&e.sourceId===heroId&&(e.amount??0)>0).reduce((n,e)=>n+(e.amount??0),0);
    candidates.push({command,score:damage+healed*1.5+saved*12+echo+steady+cover+beats*3+recovered*5+readied*6+kills*8,damage,healed,recovered});
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
   // Save v53: when Guard cannot cover the announced move (none, a whole-party move, or one at the knight himself), spend
   // a built-up grudge on a hit, else challenge the foe whose single-target move is coming for another ally.
   const free=!intent||intent.all||intent.targetId===heroId,spite=Math.min(CHALLENGE_GRUDGE_MAX,state.heroes.find(h=>h.id===heroId)?.grudge?.amount??0);
   if(free&&spite>=6){const g=state.enemies.find(e=>e.id===state.heroes.find(h=>h.id===heroId)!.grudge!.enemyId&&e.hp>0);const h=(intent?.kind==='physical'&&!intent.all&&make('bash',intent.sourceId,'กระแทกโล่ด้วยแค้นสะสม',`แรงขึ้น +${spite}`))||(g&&make('attack',g.id,'คืนแค้นสะสม',`แรงขึ้น +${spite}`));if(h)return h;}
   const coming=free?plannedIntents(state,data,state.order.length).find(i=>!i.all&&!i.charge&&!i.special&&i.targetId!==heroId&&i.sourceId!==intent?.sourceId&&state.heroes.some(h=>h.id===i.targetId&&h.hp>0)):undefined;
   // A challenge only when the preview (to the party's next command) beats the knight's plain fallback; the grudge it
   // builds counts a little below face value. Ungated it was picked 10× in the tree sim and cost the party HP (88 → 80%,
   // ΔHP −8.6): the pulled hit lands on the knight unreduced, where a later Guard would have cut it.
   const c=coming&&make('challenge',coming.sourceId,'ท้าดวลดึงท่าที่เล็งเพื่อน',`${actorName(coming.sourceId,data)} จะเล็งเอกิสแทน · แค้นสะสมสูงสุด +${CHALLENGE_GRUDGE_MAX}`);
   if(c){
    const worth=(l:Lesson)=>{const r=previewCommand(state,data,{heroId,beat:state.beat,action:l.action,targetId:l.targetId});const me=r.state.heroes.find(h=>h.id===heroId)!;
     return state.enemies.reduce((n,e)=>n+e.hp-(r.state.enemies.find(x=>x.id===e.id)?.hp??0),0)-state.heroes.reduce((n,h)=>{const a=r.state.heroes.find(x=>x.id===h.id)!;return n+Math.max(0,h.hp+h.barrier-a.hp-a.barrier);},0)*1.2+Math.min(CHALLENGE_GRUDGE_MAX,me.grudge?.amount??0)*.8;};
    const plain=(intent?.kind==='physical'&&!intent.all&&!interruptBlock(state,data,intent.sourceId,intent)&&make('bash',intent.sourceId,'',''))||attack();
    if(!plain||worth(c)>worth(plain))return c;
   }
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
   // Save v55 arcane release: spend the charges as soon as there is one, on the lowest-HP foe (it ignores the screen);
   // waiting for 2 or 3 charges was weaker in the tree sim (team HP 91.3% at 1, 89.9% at 2, 88.5% at 3).
   const charges=state.heroes.find(h=>h.id===heroId)?.arcane??0;
   if(charges>=1){const t=[...living].sort((a,b)=>a.hp-b.hp)[0];const d=t&&make('dispel',t.id,'ปลดพลังเวท',`ใช้ประจุ ${charges} · พลัง ${skillPower(data,heroId,'dispel')+charges*DISPEL_PER_CHARGE}`);if(d)return d;}
  }
  if(role==='Priest'){
   const fallen=state.heroes.find(h=>h.hp<=0&&h.fell);
   if(fallen){const r=make('revive',fallen.id,'ฟื้นคืนเพื่อนที่ล้ม',`${actorName(fallen.id,data)} กลับมาด้วยเลือด ${skillPower(data,heroId,'revive')}%`);if(r)return r;}
   // Halo a whole-party energy move, or a heavy one while nobody badly needs healing.
   const low=state.heroes.some(h=>h.hp>0&&h.hp<data.heroes.find(d=>d.id===h.id)!.maxHp*.5);
   if(intent?.kind==='energy'&&(intent.all||(intent.damage>=20&&!low))){const h=make('halo',heroId,'วงแสงรับท่าพลังงาน',`ลด ${skillPower(data,heroId,'halo')}%`);if(h)return h;}
   const aimed=intent&&!intent.all?state.heroes.find(h=>h.id===intent.targetId):undefined;
   // Save v53: the sanctuary lasts, but cast early it cost heals in the tree sim (10 casts, 1 save, team HP 71.9 → 68.8%), so
   // it still goes to an ally the announced hit would down.
   if(aimed&&!aimed.sanctum&&aimed.hp+aimed.barrier<=intent!.damage){const c=make('sanctuary',aimed.id,'พรคุ้มภัยกันล้ม',`${actorName(aimed.id,data)} ครั้งแรกที่จะล้ม เหลือเลือด 1 แล้วรักษา ${SANCTUARY_HEAL}`);if(c)return c;}
   const hurt=state.heroes.some(h=>h.hp>0&&h.hp<data.heroes.find(d=>d.id===h.id)!.maxHp*.7);
   const strong=state.heroes.find(h=>h.hp>0&&!h.renew&&h.hp<data.heroes.find(d=>d.id===h.id)!.maxHp);
   const healReady=!actionReason(state,data,heroId,'heal');
   // Save v53: a blessing (6 now + 6) only while Heal is cooling; before it replaced stronger heals.
   if(hurt&&strong&&!healReady){const b=make('bless',strong.id,'พรต่อเนื่องให้เพื่อนบาดเจ็บ',`ฟื้น ${skillPower(data,heroId,'bless')} ทันทีและอีกครั้งรอบหน้า`);if(b)return b;}
  }
  if(role==='Archer'){
   if(front.length&&back.length&&state.heroes.some(h=>h.hp>0&&lane(h.id)==='front'&&h.id!==heroId)){const p=make('pin','enemies','ตรึงแถวหน้าเปิดแถวหลัง','ทั้งทีมตีแถวหลังได้');if(p)return p;}
   // Save v55: shoot and fall back is a hit plus a dodge, best when a physical move is coming for Mira herself.
   const aimed=plannedIntents(state,data,state.order.length).find(i=>!i.all&&i.kind==='physical'&&i.targetId===heroId);
   // Used every time it is ready it beat the old queue shot (team HP 62.0 → 63.3%) but lost to hinder/weak shot
   // (66.5% without it), so otherwise only while both are cooling.
   if(aimed||(actionReason(state,data,heroId,'hinder')&&actionReason(state,data,heroId,'weakshot'))){const d=make('disengage',pick('disengage').id,'ยิงแล้วถอยหลบ',`หลบท่ากายภาพครั้งแรกจนถึงเทิร์นถัดไป`);if(d)return d;}
   const slowed=living.find(e=>isDelayed(e,state.round));
   if(slowed){const t=make('track',slowed.id,'ศรตามรอยเป้าที่ถูกสกัด',`ยิงซ้ำตอนจบรอบ`)??make('weakshot',slowed.id,'ศรจุดอ่อนเป้าที่ถูกสกัด',`พลัง ${skillPower(data,heroId,'weakshot')+data.rules.weakshotBonus}`);if(t)return t;}
  }
  // Recruit trees (owner 2026-10-23): suggested only when equipped (`make` checks).
  // A dangerous move: a whole-party move, or one that would take at least 35% of its target's max HP.
  const heavy=!!intent&&(intent.all||intent.damage*100>=(data.heroes.find(h=>h.id===intent.targetId)?.maxHp??0)*35);
  const strongest=[...data.heroes].filter(h=>h.id!==heroId&&state.heroes.some(x=>x.id===h.id&&x.hp>0)).sort((a,b)=>b.attack-a.attack)[0];
  if(role==='Alchemist'){
   if(heavy&&intent){const k=make('smoke',intent.sourceId,'ขวดควันลดท่าที่กำลังมา',`${actorName(intent.sourceId,data)} เบาลง ${skillPower(data,heroId,'smoke')}%`);if(k)return k;}
   // Save v52: the catalyst keeps the acid, so any corroded foe is ripe; one with neighbours first (the splash).
   const soaked=living.filter(e=>(e.corrodedUntil??0)>state.round),ripe=soaked.find(e=>foeNeighbours(state,data,e.id).length)??soaked[0];
   if(ripe){const c=make('catalyst',ripe.id,'จุดกรดด้วยตัวเร่ง',`พลัง ${skillPower(data,heroId,'catalyst')+CATALYST_PER_ROUND} กรดยังอยู่${foeNeighbours(state,data,ripe.id).length?` · กระเด็น ${CATALYST_SPLASH}% ไปตัวข้าง ๆ`:''}`);if(c)return c;}
   if(living.length>=3){const b=make('bomb','enemies','ขวดระเบิดโดนทุกตัว',`ตัวละ ${skillPower(data,heroId,'bomb')}`);if(b)return b;}
   if(strongest&&!(intent&&intent.targetId===strongest.id)){const f=make('fury',strongest.id,'ยาคลั่งให้ตัวตีหลัก',`${actorName(strongest.id,data)} แรงขึ้น ${skillPower(data,heroId,'fury')}%`);if(f)return f;}
  }
  if(role==='Scout'){
   const aimedBack=intent&&!intent.all&&intent.targetId!==heroId&&lane(intent.targetId)==='back'&&intent.damage*100>=data.heroes.find(h=>h.id===intent.targetId)!.maxHp*35;
   if(aimedBack){const d=make('decoy',intent!.targetId,'เงาคุ้มกันแนวหลัง',`${actorName(intent!.sourceId,data)} จะถูกหลบ`);if(d)return d;}
   // Save v56 assassin: burst any foe carrying her poison (waiting for 2–3 stacks was no better in the tree sim and the
   // burst was then rarely used), coat the blades whenever they are bare, then the blade storm.
   const venomed=living.filter(e=>e.venom?.heroId===heroId&&e.venom.stacks>=1).sort((a,b)=>b.venom!.stacks-a.venom!.stacks||a.hp-b.hp)[0];
   if(venomed){const x=make('disarm',venomed.id,'ระเบิดพิษ',`พิษ ${venomed.venom!.stacks} ชั้นระเบิด ${venomed.venom!.stacks*VENOM_BURST}`);if(x)return x;}
   const me=state.heroes.find(h=>h.id===heroId)!;
   if(!me.coated){const k=make('knives','enemies','เคลือบพิษก่อนพายุคม',`${COAT_HITS} การโดนถัดไปติดพิษ`);if(k)return k;}
   const storm=focus(reach('backstab'));
   if(storm){const b=make('backstab',storm.id,'พายุคม',`${BLADE_HITS} ครั้ง ครั้งละ ${skillPower(data,heroId,'backstab')}`);if(b)return b;}
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
   // Save v54: a finale grows with each round its song has played, so a valor finale waits until it has played 2 rounds (a dread
   // finale after 2–3 rounds was tried: it cost a win in the tree sim, 10/10 → 9/10, so dread keeps playing).
   const played=Math.min(NOTE_MAX_ROUNDS,state.round-(state.song?.since??state.round));
   if(song==='valor'&&living.length>=2&&played>=2){const f=make('finale',heroId,'บทสุดท้ายปล่อยพลังเพลง',`ตัวละ ${Math.round(skillPower(data,heroId,'finale')*(100+played*FINALE_PER_ROUND)/100)}`);if(f)return f;}
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
  // Save v52 baton: the hardest hitter, as before (a gate on the boost or on a duelist's mark lowered the campaign gate).
  const soon=(id:string)=>state.order.indexOf(id)>state.turnIndex;
  const ally=[...data.heroes].filter(h=>h.id!==heroId&&state.heroes.some(s=>s.id===h.id&&s.hp>0)).sort((a,b)=>b.attack-a.attack)[0];
  const now=ally&&soon(ally.id);
  return (ally&&make('haste',ally.id,'ยาเร่งส่งไม้ให้เพื่อนตัวแรง',`${actorName(ally.id,data)} ${now?'ลงมือต่อทันที':'ลงมือก่อนทุกคนรอบหน้า'} แรงขึ้น ${HASTE_BATON}%`))??attack();
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
