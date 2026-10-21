import { afterEach, describe, expect, it, vi } from 'vitest';
import { BattlePlayback, stageTiming } from '../src/ui/battle-playback';
import { createBattle, resolveCommand, replay } from '../src/core/battle/engine';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { encounters } from '../src/content/encounters/catalog';
import { battleLesson } from '../src/ui/tutorial';

afterEach(() => vi.useRealTimers());
describe('presentation boundaries without rule changes', () => {
  it('opt-in presentation preserves the exact default resolution and legacy stage frames', () => {
    const s=createBattle(veilSiege),command={beat:s.beat,heroId:'tracer',action:'attack' as const,targetId:'brute'};
    const plain=resolveCommand(s,veilSiege,command),traced=resolveCommand(s,veilSiege,command,true);
    expect({...traced,turns:traced.turns.map(turn=>{const copy={...turn};delete copy.before;delete copy.after;return copy;})}).toEqual(plain);
    expect(plain.turns[0]).not.toHaveProperty('before');
  });
  it('holds attack/leech and later enemy damage in independent authoritative groups', () => {
    const data = structuredClone(veilSiege);
    data.heroes = data.heroes.map(h => h.id === 'tracer' ? {...h,leech:20} : h);
    const initial = createBattle(data, {hp:{tracer:20}});
    const r = resolveCommand(initial,data,{beat:initial.beat,heroId:'tracer',action:'attack',targetId:'brute'},true);
    expect(r.turns[0]!.before!.heroes[1]!.hp).toBe(20);
    expect(r.turns[0]!.after!.heroes[1]!.hp).toBe(23);
    expect(r.turns[1]!.before!.heroes[1]!.hp).toBe(23);
    expect(r.turns[1]!.after!.heroes[1]!.hp).toBe(11);
    expect(r.turns.at(-1)!.after).toEqual(r.state);
    r.turns[0]!.after!.heroes[1]!.hp=0;
    expect(r.state.heroes[1]!.hp).toBe(11); expect(initial.heroes[1]!.hp).toBe(20);
  });
  it('includes actual turn-start renewal which the legacy actor frame does not include', () => {
    const data = structuredClone(veilSiege);
    data.heroes=data.heroes.map(h=>h.id==='weaver'?{...h,gear:{specials:['renewal']}}:h);
    const s=createBattle(data,{hp:{weaver:20}});
    const r=resolveCommand(s,data,{beat:s.beat,heroId:'tracer',action:'attack',targetId:'brute'},true);
    const enemy=r.turns[1]!;
    expect(enemy.events).toContainEqual(expect.objectContaining({type:'heal',targetId:'weaver',amount:4}));
    expect(enemy.state.heroes[2]!.hp).toBe(20);
    expect(enemy.after!.heroes[2]!.hp).toBe(24);
    expect(r.state.heroes[2]!.hp).toBe(24);
  });
  it('keeps replay/save state free of transient snapshots through every encounter route', () => {
    for(const data of encounters){
      let s=createBattle(data);
      for(let n=0;n<100&&s.outcome==='active';n++){
        const lesson=battleLesson(s,data); expect(lesson).toBeDefined(); if(!lesson)break;
        const r=resolveCommand(s,data,{beat:s.beat,heroId:lesson.heroId,action:lesson.action,targetId:lesson.targetId},true);
        expect(r.turns.at(-1)!.after).toEqual(r.state);
        expect(r.state).not.toHaveProperty('before'); expect(r.state).not.toHaveProperty('after');
        expect(replay(data,r.state.commands)).toEqual(r.state); s=r.state;
      }
    }
  });
});
describe('cancelable presentation clock', () => {
  it('applies reduced-motion zero-time feedback synchronously and still cancels the end', () => {
    vi.useFakeTimers();const clock=new BattlePlayback(),apply=vi.fn(),end=vi.fn();
    clock.start([{at:0,run:apply},{at:500,run:end}]);expect(apply).toHaveBeenCalledOnce();
    clock.cancel();vi.runAllTimers();expect(end).not.toHaveBeenCalled();
  });
  it('cancels pending impacts/down cues and playing sounds on skip or replacement', () => {
    vi.useFakeTimers(); const clock=new BattlePlayback(); const contact=vi.fn(),down=vi.fn(),stop=vi.fn();
    clock.start([{at:200,run:()=>{contact();clock.own(stop);}},{at:420,run:down}]);
    vi.advanceTimersByTime(210); expect(contact).toHaveBeenCalledOnce();
    const next=vi.fn();clock.start([{at:100,run:next}]);
    expect(stop).toHaveBeenCalledOnce();vi.runAllTimers();expect(down).not.toHaveBeenCalled();expect(next).toHaveBeenCalledOnce();
    clock.start([{at:100,run:contact}]);clock.cancel();vi.runAllTimers();expect(contact).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
  });
  it('retains the same end and truth for reduced motion while moving feedback to the start', () => {
    const s=createBattle(veilSiege);const turn=resolveCommand(s,veilSiege,{beat:s.beat,heroId:'tracer',action:'attack',targetId:'brute'}).turns[0]!;
    expect(stageTiming(turn,false)).toEqual({contact:210,end:600});expect(stageTiming(turn,true)).toEqual({contact:0,end:600});
  });
});
