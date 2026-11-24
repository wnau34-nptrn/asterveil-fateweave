import { describe, expect, it } from 'vitest';
import { contactSounds, effectCaption, effectFamily, prepareSound, readCombatPrefs } from '../src/game/visuals/combat-effects';
import { basicCues } from '../src/game/visuals/basic-attack-fx';
import { stageTiming } from '../src/ui/battle-playback';
import { createBattle, resolveCommand, targetOptions } from '../src/core/battle/engine';
import { encounterById } from '../src/content/encounters/catalog';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { chapterOne } from '../src/content/world/chapter1';
import { heroCatalog } from '../src/core/world/world';
import type { BattleEvent, TurnStage } from '../src/core/battle/types';
import { unitClip, unitRelease } from '../src/game/visuals/unit-frames';

const initial = createBattle(veilSiege);
const turn = resolveCommand(initial,veilSiege,{beat:initial.beat,heroId:'tracer',action:'execute',targetId:'f1'},true).turns[0]!;
describe('truthful combat presentation', () => {
  it('routes real basic attacks for every current and legacy hero on both speeds', () => {
    const roster = heroCatalog(encounterById, chapterOne);
    expect(roster).toHaveLength(17);
    for (const hero of roster) {
      const data = { ...veilSiege, heroes: [{ ...hero, speed: 200 }] };
      const state = createBattle(data);
      const target = targetOptions(state, data, hero.id, 'attack').find(option => option.valid)!;
      const command = { beat: state.beat, heroId: hero.id, action: 'attack' as const, targetId: target.id };
      const result = resolveCommand(state, data, command, true);
      const strike = result.turns[0]!;
      const original = JSON.stringify(strike);
      const cue = basicCues(strike, data)[0];
      const lead = prepareSound(strike, data, 210);
      expect(lead?.name, hero.id).toBe(cue?.weapon === 'arrow' ? 'arrowRelease' : cue?.weapon === 'flask' ? 'flaskRelease'
        : cue?.weapon === 'orb' ? 'orbRelease' : cue?.weapon === 'rhythm' ? 'rhythmLead' : 'swing');
      expect(contactSounds(strike, data)[0], hero.id).toBe(cue?.weapon === 'orb' ? 'zap'
        : cue?.weapon === 'rhythm' ? 'rhythmHit' : cue?.weapon === 'impact' ? 'bluntHit' : 'hit');
      for (const fast of [false, true]) {
        const { contact, end } = stageTiming(strike, false, fast);
        expect(end).toBe(fast ? 390 : 600);
        const sound = prepareSound(strike, data, contact)!;
        expect(sound.at).toBeLessThan(contact);
        if (cue?.weapon === 'arrow' || cue?.weapon === 'flask') {
          const release = unitRelease(hero.id, unitClip(hero.id, 'attack', undefined))!.at;
          expect(sound.at).toBe(Math.round(contact * release));
        }
      }
      expect(prepareSound(strike, data, 0)).toBeUndefined();
      expect(JSON.stringify(strike)).toBe(original);
      expect(result.state).toEqual(resolveCommand(state, data, command).state);
    }
  });
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
    expect(contactSounds({...turn,events:[blocked]})).toEqual(['steelBlock']);
    expect(contactSounds({...turn,action:'bolt',events:[blocked]})).toEqual(['barrier']);
    expect(contactSounds({...turn,action:'ward',events:[{type:'barrier',amount:12,text:''}]})).toEqual(['barrier']);
    expect(effectCaption({...blocked,amount:4})).toBe('−4 · โล่รับ 12');
    expect(effectCaption({type:'counter',amount:6,text:''})).toBe('สวนกลับ −6');
    expect(contactSounds({...turn,events:[{type:'dodge',text:''}]})).toEqual(['miss']);
    // A secondary tick from another actor must not turn a missed Duelist swing into a hit.
    expect(contactSounds({...turn,events:[{type:'damage',sourceId:'weaver',amount:4,text:''},{type:'dodge',sourceId:turn.actorId,text:''}]}, veilSiege)).toEqual(['miss']);
  });
  it('limits mixed damage/support to two recipes and canceled actions never hit', () => {
    expect(contactSounds({...turn,events:[...turn.events,{type:'heal',amount:3,text:''},{type:'barrier',amount:6,text:''},{type:'interrupt',text:''}]})).toEqual(['crit','barrier']);
    const canceled: TurnStage = {...turn,events:[{type:'cancel',cause:'sealed',text:''}]};
    expect(contactSounds(canceled)).toEqual(['cancel']);
    expect(effectFamily(canceled)).toBe('status');
    expect(stageTiming(canceled,false,true).contact).toBe(0);
    expect(prepareSound(canceled, veilSiege, 210)).toBeUndefined();
  });
  it('distinguishes support cues from damage sounds', () => {
    for (const [event, sound] of [['parry', 'guard'], ['revive', 'heal'], ['deflect', 'debuff'], ['chi', 'buff']] as const) {
      expect(contactSounds({ ...turn, events: [{ type: event, amount: 1, text: '' }] }, veilSiege)).toEqual([sound]);
    }
  });
  it('keeps safe defaults when preferences are blocked, corrupt or from a future format', () => {
    for (const raw of [null,'oops','null','[]','{"speed":9,"intensity":"none"}']) expect(readCombatPrefs(raw)).toEqual({speed:'normal',intensity:'standard'});
    expect(readCombatPrefs('{"speed":"fast","intensity":"reduced"}')).toEqual({speed:'fast',intensity:'reduced'});
  });
});
