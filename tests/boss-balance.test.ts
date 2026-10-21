import {writeFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {chapterOne as map} from '../src/content/world/chapter1';
import {encounterById as lookup} from '../src/content/encounters/catalog';
import {heroCatalog,starred} from '../src/core/world/world';
import {beginBattle,resolveCommand,withLevel,withParty} from '../src/core/battle/engine';
import {gearFor} from './sim/class-sim';
import {battleLesson} from '../src/ui/tutorial';
import type {GearSpecial} from '../src/core/battle/types';
import {BOSS_POWERS} from '../src/core/world/boss-equipment';
import {SET_IDS} from '../src/core/world/types';
const builds=['renewal','markhunter','laststand',...BOSS_POWERS] as const;
it('boss powers remain bounded across ten classes, single/multi enemy fights and two enhancement budgets; ordinary legendary effects remain viable',()=>{
  const catalog=heroCatalog(lookup,map),rows:{id:string;plus:number;entry:number;set:string;build:string;won:number;fought:number;hp:number;damage:number;rounds:number}[]=[];
  for(const hero of catalog)for(const plus of [0,10])for(const entry of [1,.6])for(const set of [undefined,...SET_IDS])for(const build of builds){
    const gear=gearFor(hero.id,'main',11);for(const item of Object.values(gear))if(item){item.q={main:100,affixes:item.affixes.map(()=>100)};if(plus)item.plus=plus;}
    gear.charm={...gear.charm!,rarity:4,...(BOSS_POWERS.includes(build as typeof BOSS_POWERS[number])?{boss:build as typeof BOSS_POWERS[number]}:{special:build as GearSpecial})};
    for(const item of Object.values(gear))if(item&&set)item.set=set;
    const me=starred(hero,3,map,6,{},gear),party=[me,...catalog.slice(0,4).filter(h=>h.id!==hero.id).slice(0,3).map(h=>starred(h,3,map,6))];
    const row={id:hero.id,plus,entry,set:set??'none',build,won:0,fought:0,hp:0,damage:0,rounds:0};
    for(const id of ['thicket-ambush','shadow-stalker','crystal-stampede','rear-ambush','elite-tusk-chief','elite-briar-lord',map.bossEncounterId]){
      const data=withParty(withLevel(lookup(id)!,11),party);let state=beginBattle(data,{hp:Object.fromEntries(party.map(h=>[h.id,Math.ceil(h.maxHp*entry)]))}).state,commands=0;
      while(state.outcome==='active'&&commands++<300){const l=battleLesson(state,data)!;const out=resolveCommand(state,data,{beat:state.beat,heroId:l.heroId,action:l.action,targetId:l.targetId});state=out.state;
        row.damage+=out.events.filter(e=>e.sourceId===hero.id&&(e.type==='damage'||e.type==='counter')).reduce((n,e)=>n+(e.amount??0),0);
        expect(state.heroes.every(h=>h.hp>=0&&h.hp<=data.heroes.find(d=>d.id===h.id)!.maxHp&&h.barrier>=0)).toBe(true);
      }
      expect(state.outcome,`${hero.id}/${build}/${id}/+${plus}`).not.toBe('active');row.fought++;if(state.outcome==='victory')row.won++;row.rounds+=state.round;row.hp+=state.heroes.reduce((n,h)=>n+h.hp,0)/data.heroes.reduce((n,h)=>n+h.maxHp,0);
    }
    rows.push(row);
  }
  expect(rows).toHaveLength(1680);expect(rows.reduce((n,r)=>n+r.fought,0)).toBe(11760);
  // At least one ordinary effect must match or beat every boss power in retained party HP in some class/budget.
  for(const power of BOSS_POWERS)expect(rows.filter(r=>r.build===power).some(r=>rows.filter(s=>s.id===r.id&&s.plus===r.plus&&s.entry===r.entry&&s.set===r.set&&!BOSS_POWERS.includes(s.build as typeof BOSS_POWERS[number])).some(s=>s.hp>=r.hp))).toBe(true);
  if(process.env.BOSS_SIM_REPORT)writeFileSync(process.env.BOSS_SIM_REPORT,JSON.stringify({scope:'Advisor; ten classes at star3/Lv6, item Lv11 q100, +0/+10; full/60% entry HP and ungeared companions; none/all six full sets; seven encounters at Lv11. Not physical-device or farm-time evidence.',fights:11760,rows},null,2));
},60000);
