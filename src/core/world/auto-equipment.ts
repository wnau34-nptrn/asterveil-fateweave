import type { EncounterDefinition, HeroDefinition } from '../battle/types';
import { GEAR_MARK_HUNTER, GEAR_RENEWAL } from '../battle/engine';
import { gearTotals, setCounts } from './equipment';
import { GEAR_SLOTS, SET_IDS, type ExpeditionState, type Gear, type GearSlot, type Item, type MapDefinition, type MemberProgress, type Profile, type ProfileResult, type SetId, type WorldResult } from './types';
import { canManage, memberDef, rosterIds, starred, wounded, type EncounterLookup } from './world';

export const AUTO_GOALS = ['recommended', 'attack', 'support', 'survival', 'speed'] as const;
export type AutoGoal = typeof AUTO_GOALS[number];
export interface EquipmentEntry { key: string; item: Item; label: string }
export interface AutoChoice { slot: GearSlot; key: string; item: Item }
export interface AutoEquipmentPlan { heroId: string; member: MemberProgress; goal: AutoGoal; set?: SetId; choices: AutoChoice[] }
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Deterministic recommendation, not a combat simulation or a promise of a globally optimal loadout.
// Search current gear plus set-seeded starts, improving one slot at a time. This lets four-piece sets
// compete as complete loadouts instead of discarding their individually weaker first pieces.
export function planEquipment(map: MapDefinition, data: EncounterDefinition, base: HeroDefinition, member: MemberProgress, entries: readonly EquipmentEntry[], goal: AutoGoal = 'recommended', preferred?: SetId, level = 1): AutoEquipmentPlan {
  const current = member.gear ?? {}, slots = GEAR_SLOTS;
  const candidates = slots.map(slot => [
    ...(current[slot] ? [{ key: `worn:${slot}`, item: current[slot]!, label: '' }] : []),
    ...entries.filter(e => e.item.slot === slot && (slot !== 'weapon' || e.item.hero === base.id)).sort((a,b)=>Number(b.item.uid>0)-Number(a.item.uid>0)),
  ].filter((e,_i,list)=>list.findIndex(v=>same({...v.item,uid:0},{...e.item,uid:0}))===_i));
  const ref = wounded(starred(base, member.stars, map, level, member.talents, undefined, member), member.wound);
  const direction = goal === 'recommended' ? map.equipment.supportHeroes.includes(base.id) ? 'support' : base.lane === 'front' ? 'survival' : 'attack' : goal;
  const weights = { attack: [8, 0, 2, 1], support: [1, 8, 2, 1], survival: [1, 1, 8, 1], speed: [1, 1, 2, 8] }[direction]!;
  type Loadout = (EquipmentEntry | undefined)[];
  const toGear = (items: Loadout): Gear => Object.fromEntries(items.flatMap((e,i) => e ? [[slots[i]!, e.item]] : []));
  const cache=new Map<string,number[]>();
  const rank = (items: Loadout): number[] => {
    const key=items.map(e=>e?.key??'').join('|'),cached=cache.get(key);if(cached)return cached;
    const gear = toGear(items), totals = gearTotals(map, gear);
    const h = wounded(starred(base, member.stars, map, level, member.talents, gear, member), member.wound);
    // Ranking weights only. Conditional set/legendary effects get an explicit utility value; real
    // stat/skill comparisons still come from the battle helpers and explain their conditions.
    const extra = h.gear, specials = extra?.specials ?? [];
    const attack = (h.attack + (extra?.freshHit ?? 0) + (specials.includes('markhunter') ? GEAR_MARK_HUNTER : 0)) / Math.max(1,ref.attack);
    const support = 1 + (h.skillBonus ?? 0) / 100 + (extra?.freeCast ? .2 : 0);
    const defense = Math.min(data.rules.defenseCap, h.armour ?? 0) + Math.min(data.rules.defenseCap, h.resist ?? 0);
    const endurance = (h.maxHp + (extra?.barrier ?? 0) + (extra?.overflowCap ?? 0) + totals.regen * 2 + (specials.includes('renewal') ? GEAR_RENEWAL*2 : 0)) / Math.max(1,ref.maxHp) / (1-defense/200) + (specials.includes('laststand') ? .2 : 0) + Math.min(data.rules.leechCap,h.leech ?? 0)/100 + (extra?.thorns ?? 0)/Math.max(1,ref.attack)*.2;
    const speed = h.speed/Math.max(1,ref.speed) + (extra?.firstStrike ? .3 : 0);
    const score = attack*weights[0]! + support*weights[1]! + endurance*weights[2]! + speed*weights[3]! + totals.luck/100;
    const result=[preferred ? Math.min(4,setCounts(gear)[preferred] ?? 0) : 0, score, -items.filter(e=>e && !e.key.startsWith('worn:')).length];cache.set(key,result);return result;
  };
  const better = (a: Loadout, b: Loadout): boolean => {
    const x=rank(a), y=rank(b); for(let i=0;i<x.length;i++) { if(Math.abs(x[i]!-y[i]!)>1e-9) return x[i]!>y[i]!; } return false;
  };
  const initial: Loadout = slots.map((slot,i)=>current[slot] ? candidates[i]![0] : undefined);
  let best = initial;
  const seeds = [undefined,...SET_IDS.filter(set=>entries.some(e=>e.item.set===set)||Object.values(current).some(i=>i?.set===set))];
  for(const set of seeds) {
    let trial = [...initial];
    if(set) for(let i=0;i<slots.length;i++) {
      let picked: Loadout | undefined;
      for(const e of candidates[i]!.filter(e=>e.item.set===set)) { const next=[...trial];next[i]=e;if(!picked||better(next,picked))picked=next; }
      if(picked)trial=picked;
    }
    for(let pass=0;pass<6;pass++) {
      let improved=false;
      for(let i=0;i<slots.length;i++) for(const e of candidates[i]!) { const next=[...trial];next[i]=e;if(better(next,trial)){trial=next;improved=true;} }
      if(!improved)break;
    }
    if(better(trial,best))best=trial;
  }
  return { heroId: base.id, member: structuredClone(member), goal, ...(preferred ? {set:preferred}:{}), choices: best.flatMap((e,i)=>e&&!e.key.startsWith('worn:')?[{slot:slots[i]!,key:e.key,item:structuredClone(e.item)}]:[]) };
}

// Commit-time validation is shared by the camp and expedition adapters. Validate everything before
// changing any inventory; an outdated item index, talent/level or worn loadout invalidates the plan.
export function validateEquipmentPlan(member: MemberProgress | undefined, entries: readonly EquipmentEntry[], plan: AutoEquipmentPlan): Gear | undefined {
  if(!member || !same(member,plan.member) || !plan.choices.length || plan.choices.length>GEAR_SLOTS.length) return;
  const gear={...member.gear}, used=new Set<string>(), slots=new Set<GearSlot>();
  for(const choice of plan.choices) {
    const entry=entries.find(e=>e.key===choice.key);
    if(!GEAR_SLOTS.includes(choice.slot)||slots.has(choice.slot)||used.has(choice.key)||!entry||!same(entry.item,choice.item)||entry.item.slot!==choice.slot||(choice.slot==='weapon'&&entry.item.hero!==plan.heroId))return;
    used.add(choice.key);slots.add(choice.slot);gear[choice.slot]=entry.item;
  }
  return gear;
}

export const runEquipment = (s: ExpeditionState): EquipmentEntry[] => (['found','spare'] as const).flatMap(from=>s[from].map((item,index)=>({key:`${from}:${index}`,item,label:from==='found'?'เจอรอบนี้':'ของที่พกมา'})));
export const campEquipment = (p: Profile): EquipmentEntry[] => p.items.map(item=>({key:`owned:${item.uid}`,item,label:'คลังในค่าย'}));

export function applyRunEquipment(initial: ExpeditionState,map: MapDefinition,lookup: EncounterLookup,plan: AutoEquipmentPlan): WorldResult {
  const blocked: WorldResult={state:initial,event:{type:'blocked',reason:'busy'}};
  if(!canManage(initial)||!rosterIds(initial).includes(plan.heroId))return blocked;
  const gear=validateEquipmentPlan(initial.members[plan.heroId],runEquipment(initial),plan);if(!gear)return blocked;
  const state=structuredClone(initial), used=new Set(plan.choices.map(c=>c.key)),old=state.members[plan.heroId]!.gear??{};
  state.found=state.found.filter((_i,n)=>!used.has(`found:${n}`));state.spare=state.spare.filter((_i,n)=>!used.has(`spare:${n}`));
  for(const choice of plan.choices){const item=old[choice.slot];if(item)(item.uid?state.spare:state.found).push(item);}
  state.members[plan.heroId]!.gear=structuredClone(gear);
  // One final HP cap, not one per item: intermediate slot order must not destroy HP.
  state.hp[plan.heroId]=Math.min(state.hp[plan.heroId]??0,memberDef(lookup,map,state,plan.heroId)!.maxHp);
  return {state,event:{type:'equipped',heroId:plan.heroId}};
}
export function applyCampEquipment(initial: Profile,plan: AutoEquipmentPlan): ProfileResult {
  const blocked: ProfileResult={profile:initial,event:{type:'blocked',reason:'unknown'}};
  if(!initial.company.includes(plan.heroId))return blocked;
  const gear=validateEquipmentPlan(initial.members[plan.heroId],campEquipment(initial),plan);if(!gear)return blocked;
  const profile=structuredClone(initial), used=new Set(plan.choices.map(c=>c.key)),old=profile.members[plan.heroId]!.gear??{};
  profile.items=profile.items.filter(item=>!used.has(`owned:${item.uid}`));
  for(const choice of plan.choices){const item=old[choice.slot];if(item)profile.items.push(item);}
  profile.members[plan.heroId]!.gear=structuredClone(gear);
  return {profile,event:{type:'equipped',heroId:plan.heroId}};
}
