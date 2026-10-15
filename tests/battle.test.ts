import { describe, expect, it } from 'vitest';
import { actionReason, beginBattle, corrodeBonus, skillPower, withParty, createBattle, currentHeroId, enemyIntent, plannedIntents, previewCommand, replay, resolveCommand, targetOptions, upcomingTurns, validateCommand } from '../src/core/battle/engine';
import type { ActionId, BattleState } from '../src/core/battle/types';
import { veilSiege as data } from '../src/content/encounters/veil-siege';
import { encounterById } from '../src/content/encounters/catalog';
import { mercenaries } from '../src/content/heroes/mercenaries';
const act = (s: BattleState, action: ActionId, targetId: string, d = data) => resolveCommand(s, d, { beat: s.beat, heroId: currentHeroId(s, d)!, action, targetId });
const at = (id: string, d = data) => {
  let s = createBattle(d);
  while (currentHeroId(s, d) !== id) s = act(s, 'attack', 'brute', d).state;
  return s;
};
describe('spear brace (Garran)', () => {
  const garran = mercenaries.find(m => m.id === 'garran')!; const [, tracer, weaver, healer] = data.heroes;
  const party = withParty(data, [garran, tracer!, weaver!, healer!]);
  const run = (d: typeof party, moves: [string, string][]) => {
    let s = createBattle(d); const events: string[] = [];
    for (const [action, target] of moves) { const r = act(s, action as ActionId, target, d); events.push(...r.events.map(e => e.type)); s = r.state; }
    return { s, events };
  };
  it('counters the first physical hit on a front-lane ally, then is consumed; energy never triggers it', () => {
    // Order: Lyra, Raider, Eira, Garran, Brute, Seren. R1 Raider slashes Lyra before Garran braces.
    const { s: braced, events } = run(party, [['attack', 'brute'], ['attack', 'brute'], ['brace', 'garran']]);
    expect(braced.counter).toEqual({ heroId: 'garran' }); expect(events).toContain('brace');
    expect(events).not.toContain('counter'); // Brute's Rift Bolt is energy
    const raiderBefore = braced.enemies.find(e => e.id === 'raider')!.hp;
    // R2: Lyra acts, then the Raider's physical slash at slot 0 (Garran) is countered.
    const r = act(act(braced, 'attack', 'brute', party).state, 'attack', 'brute', party);
    const counter = r.events.find(e => e.type === 'counter')!;
    expect(counter).toMatchObject({ sourceId: 'garran', targetId: 'raider', amount: 14 });
    expect(r.state.enemies.find(e => e.id === 'raider')!.hp).toBe(raiderBefore - 14);
    expect(r.state.counter).toBeNull();
  });
  it('expires when Garran acts again, cannot be stacked, and stars raise the counter', () => {
    const whelp = withParty(encounterById('rift-whelp')!, [garran, tracer!, weaver!, healer!]);
    let s = createBattle(whelp);
    while (currentHeroId(s, whelp) !== 'garran') s = act(s, 'attack', 'brute', whelp).state;
    s = act(s, 'brace', 'garran', whelp).state;
    expect(targetOptions(s, whelp, 'garran', 'brace')[0]!.valid).toBe(false);
    while (currentHeroId(s, whelp) !== 'garran') s = act(s, 'attack', 'brute', whelp).state;
    expect(s.counter).toBeNull();
    const starred = withParty(data, [{ ...garran, skillBonus: 16 }, tracer!, weaver!, healer!]);
    expect(skillPower(starred, 'garran', 'brace')).toBe(16);
  });
  it('replays and previews identically', () => {
    const moves: [string, string][] = [['attack', 'brute'], ['attack', 'brute'], ['brace', 'garran'], ['attack', 'raider'], ['pierce', 'raider']];
    let s = createBattle(party);
    for (const [action, target] of moves) {
      const command = { beat: s.beat, heroId: currentHeroId(s, party)!, action: action as ActionId, targetId: target };
      if (validateCommand(s, party, command)) break;
      expect(previewCommand(s, party, command)).toEqual(resolveCommand(s, party, command)); s = resolveCommand(s, party, command).state;
    }
    expect(replay(party, s.commands)).toEqual(s);
  });
});

describe('archer (Mira)', () => {
  const mira = mercenaries.find(m => m.id === 'mira')!; const [guardian, tracer, , healer] = data.heroes;
  const party = withParty(data, [guardian!, tracer!, mira, healer!]);
  it('hindering shot damages and sends the target to the end of the NEXT round only; the current round stays frozen', () => {
    let s = createBattle(party);
    // R1 order: Lyra 120, Raider 110, Mira 105, Aegis 80, Brute 70, Seren 60.
    expect(s.order).toEqual(['tracer', 'raider', 'mira', 'guardian', 'brute', 'healer']);
    s = act(s, 'attack', 'brute', party).state;
    const frozen = [...s.order];
    const r = act(s, 'hinder', 'raider', party);
    expect(r.events.find(e => e.type === 'damage')).toMatchObject({ targetId: 'raider', amount: 12 });
    expect(r.events.some(e => e.type === 'delay')).toBe(true);
    expect(r.state.order).toEqual(frozen);
    expect(upcomingTurns(r.state, party, 12).filter(t => t.round === 2).map(t => t.actorId)).toEqual(['tracer', 'mira', 'guardian', 'brute', 'healer', 'raider']);
    let t = r.state; while (t.round < 2) t = act(t, 'attack', 'brute', party).state;
    expect(t.order).toEqual(['tracer', 'mira', 'guardian', 'brute', 'healer', 'raider']);
    while (t.round < 3) t = act(t, 'attack', 'brute', party).state;
    expect(t.order[1]).toBe('raider'); // back to its SPD place
  });
  it('volley hits every living enemy and can finish several at once', () => {
    let s = createBattle(party); s = act(s, 'attack', 'brute', party).state;
    expect(targetOptions(s, party, 'mira', 'volley')).toEqual([{ id: 'enemies', name: 'Enemies', valid: true, reason: '' }]);
    const r = act(s, 'volley', 'enemies', party);
    expect(r.events.filter(e => e.type === 'damage' && e.sourceId === 'mira').map(e => [e.targetId, e.amount])).toEqual([['raider', 10], ['brute', 10]]);
    const weak = structuredClone(s); for (const e of weak.enemies) e.hp = 5;
    expect(act(weak, 'volley', 'enemies', party).state.outcome).toBe('victory');
  });
  it('replays and previews identically', () => {
    let s = createBattle(party);
    for (const [action, target] of [['attack', 'brute'], ['hinder', 'raider'], ['attack', 'brute'], ['attack', 'brute'], ['attack', 'brute'], ['volley', 'enemies']] as [ActionId, string][]) {
      const command = { beat: s.beat, heroId: currentHeroId(s, party)!, action, targetId: target };
      if (validateCommand(s, party, command)) continue;
      expect(previewCommand(s, party, command)).toEqual(resolveCommand(s, party, command)); s = resolveCommand(s, party, command).state;
    }
    expect(s.commands.some(c => c.action === 'volley' || c.action === 'hinder')).toBe(true);
    expect(replay(party, s.commands)).toEqual(s);
  });
});

describe('alchemist (Toma)', () => {
  const toma = mercenaries.find(m => m.id === 'toma')!; const [guardian, tracer, , healer] = data.heroes;
  const party = withParty(data, [guardian!, tracer!, toma, healer!]);
  it('acid hits, then every hero hit on the target gains the corrode bonus for 2 rounds including this one', () => {
    let s = createBattle(party);
    // R1 order: Lyra 120, Raider 110, Toma 95, Aegis 80, Brute 70, Seren 60.
    expect(s.order).toEqual(['tracer', 'raider', 'toma', 'guardian', 'brute', 'healer']);
    s = act(s, 'attack', 'raider', party).state;
    const r = act(s, 'acid', 'brute', party);
    expect(r.events.find(e => e.type === 'damage')).toMatchObject({ targetId: 'brute', amount: 8 });
    expect(r.events.find(e => e.type === 'corrode')).toMatchObject({ targetId: 'brute', amount: 6 });
    const aegis = act(r.state, 'attack', 'brute', party);
    expect(aegis.events.find(e => e.type === 'damage' && e.sourceId === 'guardian')).toMatchObject({ amount: 16 }); // 10 + 6
    let t = aegis.state; while (t.round < 3) t = act(t, 'attack', 'raider', party).state;
    expect(t.enemies.find(e => e.id === 'brute')!.corrodedUntil).toBe(3);
    expect(corrodeBonus(t, party, 'brute')).toBe(0);
  });
  it('haste makes an ally act before everyone next round only, and cannot be stacked', () => {
    let s = createBattle(party); s = act(s, 'attack', 'raider', party).state;
    const r = act(s, 'haste', 'guardian', party);
    expect(r.events.some(e => e.type === 'haste')).toBe(true);
    expect(targetOptions(r.state, party, 'toma', 'haste').find(t => t.id === 'guardian')?.valid ?? false).toBe(false);
    let t = r.state; while (t.round < 2) t = act(t, 'attack', 'raider', party).state;
    expect(t.order[0]).toBe('guardian');
    while (t.round < 3) t = act(t, 'attack', 'raider', party).state;
    expect(t.order[0]).toBe('tracer');
  });
  it('replays and previews identically', () => {
    let s = createBattle(party);
    for (const [action, target] of [['attack', 'raider'], ['acid', 'brute'], ['attack', 'brute'], ['attack', 'brute'], ['attack', 'brute'], ['haste', 'tracer']] as [ActionId, string][]) {
      const command = { beat: s.beat, heroId: currentHeroId(s, party)!, action, targetId: target };
      if (validateCommand(s, party, command)) continue;
      expect(previewCommand(s, party, command)).toEqual(resolveCommand(s, party, command)); s = resolveCommand(s, party, command).state;
    }
    expect(s.commands.some(c => c.action === 'acid')).toBe(true); expect(replay(party, s.commands)).toEqual(s);
  });
});

describe('party slots', () => {
  it('enemy moves aim at a slot, so whoever is deployed there becomes the target', () => {
    const [guardian, tracer, weaver, healer] = data.heroes as typeof data.heroes[number][];
    // veil-siege opens with Raking Slash at slot 1 (physical) and Rift Bolt at slot 2 (energy).
    expect(plannedIntents(createBattle(data), data).map(i => i.targetId)).toEqual(['tracer', 'weaver']);
    const swapped = withParty(data, [tracer!, guardian!, healer!, weaver!]);
    expect(plannedIntents(createBattle(swapped), swapped).map(i => i.targetId)).toEqual(['guardian', 'healer']);
    // A physical move aimed at a back-lane slot still lands on the front lane while it stands.
    const backFirst = withParty(data, [weaver!, tracer!, guardian!, healer!]);
    expect(enemyIntent(createBattle(backFirst), backFirst, 'raider', 1)!.targetId).toBe('tracer');
  });
  it('rejects empty, oversized or duplicated parties and plays a smaller party', () => {
    const [guardian, tracer] = data.heroes;
    expect(() => withParty(data, [])).toThrow(); expect(() => withParty(data, [guardian!, guardian!])).toThrow();
    expect(() => withParty(data, [...data.heroes, { ...guardian!, id: 'extra' }])).toThrow();
    const pair = withParty(data, [guardian!, tracer!]);
    const s = createBattle(pair);
    expect(s.heroes.map(h => h.id)).toEqual(['guardian', 'tracer']);
    expect(plannedIntents(s, pair).every(i => ['guardian', 'tracer'].includes(i.targetId))).toBe(true);
  });
});

describe('SPD round initiative', () => {
  it('sorts both sides by SPD, starts with Duelist and keeps separate four-class states', () => {
    const a = createBattle(data), b = createBattle(data);
    expect(a.order).toEqual(['tracer','raider','weaver','guardian','brute','healer']);
    expect(currentHeroId(a,data)).toBe('tracer'); expect(a.round).toBe(1);
    expect(data.heroes.map(h=>h.lane)).toEqual(['front','front','back','back']);
    expect(new Set(data.heroes.map(h=>h.role)).size).toBe(4);
    data.heroes.forEach(h=>expect(h.actions).toHaveLength(3));
    a.heroes[0]!.cooldowns.bash=99; expect(b.heroes[0]!.cooldowns).toEqual({});
    expect(a).not.toHaveProperty('crystal');
  });
  it('breaks equal SPD by permanent definition order across both sides', () => {
    const d = {...data,heroes:data.heroes.map(h=>({...h,speed:100})),enemies:data.enemies.map(e=>({...e,speed:100}))};
    expect(createBattle(d).order).toEqual(['guardian','tracer','weaver','healer','raider','brute']);
    expect(createBattle(d)).toEqual(createBattle(d));
  });
  it('freezes the current round but recalculates changed speeds at the next round', () => {
    let s=createBattle(data); const d={...data,heroes:data.heroes.map(h=>({...h,speed:h.id==='healer'?150:h.speed}))};
    expect(upcomingTurns(s,d).map(t=>t.actorId)).toEqual(['tracer','raider','weaver','guardian','brute','healer']);
    for(let i=0;i<4;i++)s=act(s,'attack','brute',d).state;
    expect(s.round).toBe(2); expect(s.order[0]).toBe('healer'); expect(currentHeroId(s,d)).toBe('healer');
  });
  it('each surviving actor acts once per round; adjacent heroes have no automatic retaliation', () => {
    let s=createBattle(data); const turns=[];
    for(let i=0;i<4;i++){const r=act(s,'attack','brute');turns.push(...r.turns.map(t=>[t.actorId,t.round]));s=r.state;}
    expect(turns).toEqual([['tracer',1],['raider',1],['weaver',1],['guardian',1],['brute',1],['healer',1]]);
    expect(s.round).toBe(2); expect(s.beat).toBe(7); expect(currentHeroId(s,data)).toBe('tracer');
  });
  it('supports faster enemies opening before any hero without replaying those hits', () => {
    const d={...data,enemies:data.enemies.map(e=>({...e,speed:200}))};const r=beginBattle(d);
    expect(r.initial.heroes.map(h=>h.hp)).toEqual([76,56,48,46]);
    expect(r.turns.map(t=>t.actorId)).toEqual(['raider','brute']);
    expect(r.state.heroes.map(h=>h.hp)).toEqual([76,44,20,46]);
    expect(currentHeroId(r.state,d)).toBe('tracer');expect(replay(d,[])).toEqual(r.state);
    const next=act(r.state,'mark','brute',d);expect(next.turns.map(t=>t.actorId)).toEqual(['tracer']);
  });
  it('rejects foreign actors in resolution, previews, replay and target selection', () => {
    const s=createBattle(data), before=structuredClone(s);
    for(const hero of data.heroes.filter(h=>h.id!=='tracer')){
      const c={beat:s.beat,heroId:hero.id,action:'attack' as const,targetId:'brute'};
      expect(validateCommand(s,data,c)).toContain('turn');expect(()=>resolveCommand(s,data,c)).toThrow('turn');
      expect(()=>previewCommand(s,data,c)).toThrow('turn');expect(()=>replay(data,[c])).toThrow('turn');
      expect(targetOptions(s,data,hero.id,'attack').every(t=>!t.valid)).toBe(true);
    }
    expect(s).toEqual(before);
  });
  it('skips a killed enemy without a ghost turn or hit, including the next-round forecast', () => {
    const s=createBattle(data);s.enemies[0]!.hp=1;const r=act(s,'attack','raider');
    expect(r.turns.map(t=>t.actorId)).toEqual(['tracer']);expect(currentHeroId(r.state,data)).toBe('weaver');
    expect(r.state.heroes[1]!.hp).toBe(56);expect(upcomingTurns(r.state,data,10).some(t=>t.actorId==='raider')).toBe(false);
  });
  it('skips an upcoming fallen hero and handles consecutive enemy turns when others are down', () => {
    const s=createBattle(data);s.heroes[2]!.hp=0;s.heroes[0]!.hp=0;
    const r=act(s,'attack','brute');expect(r.turns.map(t=>t.actorId)).toEqual(['tracer','raider','brute']);
    expect(currentHeroId(r.state,data)).toBe('healer');
  });
  it('forecasts round boundaries without mutating or pretending future HP is guaranteed', () => {
    const s=at('healer'),before=structuredClone(s),queue=upcomingTurns(s,data);
    expect(queue.slice(0,3).map(t=>[t.actorId,t.round])).toEqual([['healer',1],['tracer',2],['raider',2]]);
    expect(plannedIntents(s,data).map(i=>[i.sourceId,i.round])).toEqual([['raider',2],['brute',2]]);
    expect(s).toEqual(before);
  });
});
describe('round-based class skills and outcomes', () => {
  it('cooldowns use round boundaries even with only one surviving hero', () => {
    let s=at('guardian');s.heroes.forEach(h=>{if(h.id!=='guardian')h.hp=0;});
    s=act(s,'bash','brute').state;expect(s.round).toBe(2);expect(currentHeroId(s,data)).toBe('guardian');
    expect(actionReason(s,data,'guardian','bash')).toBe('Cooldown: 1');expect(()=>act(s,'bash','brute')).toThrow('Cooldown');
    s=act(s,'guard',s.intent!.targetId).state;expect(s.round).toBe(3);expect(actionReason(s,data,'guardian','bash')).toBe('');
  });
  it('Mark survives to the next Duelist round and only the Duelist consumes it', () => {
    let s=act(createBattle(data),'mark','brute').state;expect(s.enemies[1]!.markedUntil).toBe(3);
    s=act(s,'bolt','brute').state;expect(s.enemies[1]!.markedUntil).toBe(3);
    s=act(s,'guard','weaver').state;s=act(s,'heal','tracer').state;expect(s.round).toBe(2);
    const r=act(s,'execute','brute');expect(r.turns[0]!.events[0]).toMatchObject({amount:50});expect(r.state.enemies[1]!.markedUntil).toBe(0);
    expect(act(s,'attack','brute').turns[0]!.events[0]).toMatchObject({amount:38});
  });
  it('an unused Mark expires at round 3, including when the owner has fallen', () => {
    let s=act(createBattle(data),'mark','brute').state;
    while(s.round<3)s=act(s,'attack','raider').state;
    expect(s.enemies[1]!.markedUntil).toBe(0);
  });
  it('Guard redirects the announced upcoming hit, rounds damage then absorbs barrier', () => {
    const s=at('guardian');s.heroes[0]!.barrier=14;const r=act(s,'guard','weaver');
    expect(r.state.heroes[0]).toMatchObject({hp:76,barrier:4});expect(r.state.heroes[2]!.hp).toBe(48);
    expect(r.turns[1]!.events[0]).toMatchObject({amount:0,absorbed:10,targetId:'guardian'});expect(r.state.guard).toBeNull();
    expect(()=>act(s,'guard','healer')).toThrow('announced target');
  });
  it('Guard survives intervening actors until its attacker and expires on the Knight’s next turn', () => {
    const d={...data,enemies:data.enemies.map(e=>({...e,speed:e.id==='brute'?55:e.speed}))};
    let s=at('guardian',d);const r=act(s,'guard','weaver',d);expect(r.turns).toHaveLength(1);expect(r.state.guard).not.toBeNull();
    s=act(r.state,'attack','brute',d).state;expect(s.heroes[0]!.hp).toBe(66);expect(s.guard).toBeNull();
    const pending=at('guardian');pending.guard={heroId:'guardian',targetId:'weaver',sourceId:'raider'};
    s=act(pending,'attack','brute').state;s=act(s,'heal','weaver').state;s=act(s,'attack','brute').state;
    s=act(s,'attack','brute').state;expect(currentHeroId(s,data)).toBe('guardian');expect(s.guard).toBeNull();
  });
  it('Bash interrupts the chosen enemy’s next physical turn and cannot interrupt energy', () => {
    const d={...data,intents:data.intents.map(i=>({...i,kind:'physical' as const}))};
    const r=act(at('guardian',d),'bash','brute',d);expect(r.turns[0]!.events.some(e=>e.type==='interrupt')).toBe(true);
    expect(r.turns[1]!.events[0]).toMatchObject({type:'cancel',cause:'interrupted'});
    const energy=act(at('guardian'),'bash','brute');expect(energy.turns[1]!.events[0]).toMatchObject({type:'damage',amount:28});
  });
  it('Bash can stop an enemy that already acted this round on its next physical turn', () => {
    let s=at('guardian');s=act(s,'bash','raider').state;expect(s.enemies[0]!.interruptedRound).toBe(2);
    s=act(s,'heal','weaver').state;const r=act(s,'attack','brute');expect(r.turns[1]!.events[0]).toMatchObject({type:'cancel'});
    expect(r.state.enemies[0]!.interruptedRound).toBeUndefined();
  });
  it('physical attacks screen front heroes and re-evaluate living targets at enemy turn start', () => {
    const s=createBattle(data);s.heroes[1]!.hp=0;
    expect(enemyIntent(s,data,'raider',1)?.targetId).toBe('guardian');s.heroes[0]!.hp=0;
    expect(enemyIntent(s,data,'raider',1)?.targetId).toBe('weaver');
    expect(enemyIntent(createBattle(data),data,'brute',1)?.targetId).toBe('weaver');
  });
  it('Ward persists across adjacent hero turns, absorbs before HP and never stacks', () => {
    let s=at('weaver');s=act(s,'ward','weaver').state;expect(s.heroes[2]!.barrier).toBe(14);
    const r=act(s,'attack','brute');expect(r.state.heroes[2]).toMatchObject({hp:34,barrier:0});
    expect(r.turns[1]!.events[0]).toMatchObject({amount:14,absorbed:14});
    const full=at('weaver');full.heroes[2]!.barrier=14;expect(targetOptions(full,data,'weaver','ward').find(t=>t.id==='weaver')?.valid).toBe(false);
  });
  it('Heal clamps and does not grant the recipient an extra turn', () => {
    const s=at('healer');s.heroes[0]!.hp=73;const r=act(s,'heal','guardian');
    expect(r.turns[0]!.events[0]).toMatchObject({amount:3});expect(r.state.heroes[0]!.hp).toBe(76);
    expect(currentHeroId(r.state,data)).toBe('tracer');expect(r.turns).toHaveLength(1);
    s.heroes[2]!.hp=0;expect(()=>act(s,'heal','weaver')).toThrow('down');
  });
  it('Prayer heals living injured allies only and uses a three-round cooldown', () => {
    const s=at('healer');s.heroes[0]!.hp=60;s.heroes[1]!.hp=40;s.heroes[2]!.hp=0;
    const r=act(s,'prayer','party');expect(r.state.heroes.map(h=>h.hp)).toEqual([70,50,0,46]);
    expect(r.turns[0]!.events).toHaveLength(2);expect(r.state.heroes[3]!.cooldowns.prayer).toBe(4);
    const full=at('healer');full.heroes.forEach((h,i)=>{h.hp=data.heroes[i]!.maxHp;});expect(()=>act(full,'prayer','party')).toThrow('full health');
  });
  it('rejects stale commands, missing actions, invalid targets and mismatched encounters', () => {
    const s=createBattle(data),c={beat:1,heroId:'tracer',action:'attack' as const,targetId:'brute'};
    expect(validateCommand(s,data,{...c,beat:0})).toContain('stale');expect(validateCommand({...s,encounterId:'other'},data,c)).toContain('mismatch');
    expect(()=>act(s,'attack','party')).toThrow('Invalid target');expect(()=>act(s,'heal','guardian')).toThrow('does not have');
    s.heroes[1]!.hp=0;expect(()=>resolveCommand(s,data,c)).toThrow('down');
  });
  it('overkill clamps, victory stops the queue immediately and defeat stops automatic turns', () => {
    const s=createBattle(data);s.enemies[0]!.hp=2;s.enemies[1]!.hp=0;const r=act(s,'attack','raider');
    expect(r.turns).toHaveLength(1);expect(r.events[0]).toMatchObject({amount:2});expect(r.state.outcome).toBe('victory');
    expect(currentHeroId(r.state,data)).toBeUndefined();expect(upcomingTurns(r.state,data)).toEqual([]);expect(()=>act(r.state,'attack','raider')).toThrow('ended');
    const loss=createBattle(data);loss.heroes.forEach(h=>{h.hp=h.id==='tracer'?1:0;});const n=act(loss,'mark','brute');
    expect(n.state.outcome).toBe('defeat');expect(n.turns.map(t=>t.actorId)).toEqual(['tracer','raider']);
  });
  it('turn snapshots/logs are isolated and preserve actor order before committed advancement', () => {
    const s=createBattle(data),before=structuredClone(s),r=act(s,'execute','brute');
    expect(r.turns[0]!.state.heroes[1]!.hp).toBe(56);expect(r.turns[1]!.state.heroes[1]!.hp).toBe(44);
    expect(r.turns.map(t=>t.beat)).toEqual([1,2]);expect(r.state.beat).toBe(3);
    r.turns[0]!.state.enemies[1]!.hp=0;expect(r.state.enemies[1]!.hp).toBe(172);expect(s).toEqual(before);
  });
  it('all legal class skills have exact pure previews and deterministically replayable prefixes', () => {
    for(const hero of data.heroes)for(const injured of [false,true]){
      const s=at(hero.id);if(injured)s.heroes.forEach(h=>{h.hp=Math.max(1,h.hp-5);});
      for(const action of hero.actions)for(const target of targetOptions(s,data,hero.id,action).filter(t=>t.valid)){
        const c={beat:s.beat,heroId:hero.id,action,targetId:target.id},before=structuredClone(s);const r=resolveCommand(s,data,c);
        expect(previewCommand(s,data,c)).toEqual(r);expect(s).toEqual(before);expect(r.turns.flatMap(t=>t.events)).toEqual(r.events);
        if(!injured)expect(replay(data,r.state.commands)).toEqual(r.state);
      }
    }
  });
});

describe('expedition party entry', () => {
  it('starts with carried HP, keeps fallen heroes out of the queue and replays from the same entry', () => {
    const entry = { hp: { guardian: 40, tracer: 0, weaver: 12, healer: 46 } };
    const opening = beginBattle(data, entry);
    expect(opening.initial.heroes.map(h => h.hp)).toEqual([40, 0, 12, 46]);
    expect(opening.initial.order).toEqual(['raider', 'weaver', 'guardian', 'brute', 'healer']);
    // Without Lyra the Raider opens: one real enemy turn before the first hero.
    expect(opening.turns.map(t => t.actorId)).toEqual(['raider']);
    const s = opening.state;
    expect(currentHeroId(s, data)).toBe('weaver');
    const next = resolveCommand(s, data, { beat: s.beat, heroId: 'weaver', action: 'bolt', targetId: 'brute' }).state;
    expect(replay(data, next.commands, entry)).toEqual(next);
    expect(() => resolveCommand(next, data, { beat: next.beat, heroId: 'healer', action: 'heal', targetId: 'tracer' })).toThrow();
  });
  it('rejects impossible entries and keeps the full-HP default unchanged', () => {
    expect(() => createBattle(data, { hp: { guardian: 0, tracer: 0, weaver: 0, healer: 0 } })).toThrow();
    expect(() => createBattle(data, { hp: { guardian: 77 } })).toThrow();
    expect(() => createBattle(data, { hp: { stranger: 5 } })).toThrow();
    expect(() => createBattle(data, { hp: { guardian: 1.5 } })).toThrow();
    expect(createBattle(data, { hp: {} })).toEqual(createBattle(data));
  });
});
