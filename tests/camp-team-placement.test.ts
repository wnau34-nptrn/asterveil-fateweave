import { expect,it } from 'vitest';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { newProfile } from '../src/core/world/profile';
import { formation } from '../src/core/world/formation';
import { recommendedLane } from '../src/core/world/world';
import { placeCampMember } from '../src/core/world/camp-team';

function profile(){const p=newProfile(map,17);for(const id of ['lio','toma'])if(!p.company.includes(id)){p.company.push(id);p.members[id]={stars:1,shards:0};}p.party={deployed:['guardian','tracer','weaver','healer'],reserve:['lio'],lanes:{guardian:'front',tracer:'front',weaver:'back',healer:'back'}};return p;}
it('places a reserve into the chosen lane atomically without moving the existing field order or lanes',()=>{
  const p=profile(),before=structuredClone(p),r=placeCampMember(p,map,lookup,'lio','deployed',undefined,'front');
  expect(r.event.type).toBe('party');expect(p).toEqual(before);expect(r.profile.party.deployed).toEqual([...p.party.deployed,'lio']);expect(r.profile.party.reserve).toEqual([]);
  expect(formation(r.profile.party,recommendedLane(lookup,map))).toEqual({...p.party.lanes,lio:'front'});
});
it('replaces a field member in the chosen column, keeps the slot, and sends the outgoing member to the incoming group',()=>{
  const p=profile(),r=placeCampMember(p,map,lookup,'lio','deployed','tracer','front');
  expect(r.profile.party.deployed).toEqual(['guardian','lio','weaver','healer']);expect(r.profile.party.reserve).toEqual(['tracer']);expect(r.profile.party.lanes?.lio).toBe('front');
});
it('rejects a full column instead of silently moving another member and leaves the original profile unchanged',()=>{
  const p=profile();p.party.lanes!.weaver='front';const before=structuredClone(p),r=placeCampMember(p,map,lookup,'lio','deployed',undefined,'front');
  expect(r.event).toEqual({type:'blocked',reason:'full'});expect(r.profile).toBe(p);expect(p).toEqual(before);
});
it('keeps field capacity and last-member rules in existing world commands',()=>{
  const p=profile();p.party.deployed.push('toma');expect(placeCampMember(p,map,lookup,'lio','deployed',undefined,'back').event).toEqual({type:'blocked',reason:'full'});
  p.party.deployed=['guardian'];expect(placeCampMember(p,map,lookup,'guardian','bench').event).toEqual({type:'blocked',reason:'last'});
});
it('unarchives a returning bench member and rejects a stale target-column pairing without saving prepared state',()=>{
  const p=profile();p.archived=['toma'];const good=placeCampMember(p,map,lookup,'toma','deployed','healer','back');expect(good.profile.archived).toBeUndefined();expect(good.profile.party.deployed).toContain('toma');
  const bad=placeCampMember(p,map,lookup,'toma','deployed','guardian','back');expect(bad.profile).toBe(p);expect(bad.event.type).toBe('blocked');
});
