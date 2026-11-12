import { groupOf, placeMember, type Group } from './profile';
import { formation } from './formation';
import { recommendedLane, type EncounterLookup } from './world';
import type { Lane, MapDefinition, Profile, ProfileResult } from './types';

// One UI placement commits group + lane together. Existing world commands still own
// membership, capacity, last-member and archive rules. Pin existing lanes before adding
// someone so normalization cannot silently move a different member to make room.
export function placeCampMember(initial:Profile,map:MapDefinition,lookup:EncounterLookup,id:string,target:Group,other?:string,lane?:Lane):ProfileResult {
  const recommend=recommendedLane(lookup,map),before=formation(initial.party,recommend);
  if(lane===undefined){const result=placeMember({...initial,party:{...initial.party,lanes:{...initial.party.lanes,...before}}},map,id,target,other);return result.event.type==='blocked'?{...result,profile:initial}:result;}
  const blocked=(reason:string):ProfileResult=>({profile:initial,event:{type:'blocked',reason}});
  if(target!=='deployed'||groupOf(initial,id)==='deployed')return blocked('busy');
  if(other&&before[other]!==lane)return blocked('unknown');
  const prepared={...initial,party:{...initial.party,lanes:{...initial.party.lanes,...before,[id]:lane}}};
  const result=placeMember(prepared,map,id,target,other);
  if(result.event.type==='blocked')return {...result,profile:initial};
  const after=formation(result.profile.party,recommend);
  if(after[id]!==lane||Object.entries(before).some(([member,was])=>member!==other&&after[member]!==was))return blocked('full');
  return result;
}
