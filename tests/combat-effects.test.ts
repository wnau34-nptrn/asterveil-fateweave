import { describe, expect, it } from 'vitest';
import { contactSounds, effectCaption, effectFamily, readCombatPrefs } from '../src/game/visuals/combat-effects';
import { stageTiming } from '../src/ui/battle-playback';
import { createBattle, resolveCommand } from '../src/core/battle/engine';
import { veilSiege } from '../src/content/encounters/veil-siege';
import type { BattleEvent, TurnStage } from '../src/core/battle/types';

const initial = createBattle(veilSiege);
const turn = resolveCommand(initial,veilSiege,{beat:initial.beat,heroId:'tracer',action:'execute',targetId:'f1'},true).turns[0]!;
describe('truthful combat presentation', () => {
  it('fast and motion preferences change only time, preserving the entire traced result', () => {
    const snapshot = JSON.stringify(turn);
    expect(stageTiming(turn,false,true)).toEqual({contact:194,end:553});
    expect(stageTiming(turn,true,true)).toEqual({contact:0,end:553});
    expect(effectFamily(turn)).toBe('steel');
    expect(contactSounds(turn)).toEqual(['crit']);
    expect(effectCaption(turn.events.find(e => e.type === 'damage')!)).not.toMatch(/critical/i);
    expect(JSON.stringify(turn)).toBe(snapshot);
    // Bard Finale has physical damage plus healing; its fallback must retain a connecting strike.
    expect(effectFamily({...turn,action:'finale',events:[...turn.events,{type:'heal',amount:3,text:''}]})).toBe('steel');
  });
  it('separates shield absorption from HP damage, counter damage and misses', () => {
    const blocked: BattleEvent = {type:'damage',amount:0,absorbed:12,text:'',targetId:'guardian'};
    expect(effectCaption(blocked)).toBe('โล่รับ 12');
    expect(contactSounds({...turn,events:[blocked]})).toEqual(['barrier']);
    expect(effectCaption({...blocked,amount:4})).toBe('−4 · โล่รับ 12');
    expect(effectCaption({type:'counter',amount:6,text:''})).toBe('สวนกลับ −6');
    expect(contactSounds({...turn,events:[{type:'dodge',text:''}]})).toEqual(['miss']);
  });
  it('limits mixed damage/support to two recipes and canceled actions never hit', () => {
    expect(contactSounds({...turn,events:[...turn.events,{type:'heal',amount:3,text:''},{type:'barrier',amount:6,text:''},{type:'interrupt',text:''}]})).toEqual(['crit','barrier']);
    const canceled: TurnStage = {...turn,events:[{type:'cancel',cause:'sealed',text:''}]};
    expect(contactSounds(canceled)).toEqual(['cancel']);
    expect(effectFamily(canceled)).toBe('status');
    expect(stageTiming(canceled,false,true).contact).toBe(0);
  });
  it('keeps safe defaults when preferences are blocked, corrupt or from a future format', () => {
    for (const raw of [null,'oops','null','[]','{"speed":9,"intensity":"none"}']) expect(readCombatPrefs(raw)).toEqual({speed:'normal',intensity:'standard'});
    expect(readCombatPrefs('{"speed":"fast","intensity":"reduced"}')).toEqual({speed:'fast',intensity:'reduced'});
  });
});
