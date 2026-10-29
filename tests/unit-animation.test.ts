import { describe, expect, it } from 'vitest';
import { UnitAnimation, type UnitBody } from '../src/game/visuals/unit-animation';
import { actionPoses, unitPose, unitReactions } from '../src/game/visuals/unit-animation-map';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { heroes } from '../src/content/heroes/team';
import { mercenaries } from '../src/content/heroes/mercenaries';
import { createBattle, resolveCommand } from '../src/core/battle/engine';
import type { BattleEvent, TurnStage } from '../src/core/battle/types';
import { stageTiming } from '../src/ui/battle-playback';

const state = createBattle(veilSiege);
const turn = resolveCommand(state, veilSiege, { beat: state.beat, heroId: 'tracer', action: 'execute', targetId: 'f1' }, true).turns[0]!;
const events = (...events: BattleEvent[]): TurnStage => ({ ...turn, events });
class Body implements UnitBody {
  x = 100; y = 200; rotation = .02; scaleX = 1.2; scaleY = .9;
  setPosition(x: number, y: number) { this.x = x; this.y = y; }
  setRotation(r: number) { this.rotation = r; }
  setScale(x: number, y: number) { this.scaleX = x; this.scaleY = y; }
}
const snapshot = (body: Body) => [body.x, body.y, body.rotation, body.scaleX, body.scaleY];

describe('unit pose routing', () => {
  it('routes every current class basic attack through its weapon/gesture', () => {
    const data = { ...veilSiege, heroes: [...heroes, ...mercenaries] };
    const expected = ['slash','thrust','cast','cast','shoot','throw','slash','smash','song','thrust','punch','punch','dance','dance'];
    expect(data.heroes.map(h => unitPose({ ...turn, action: 'attack', actorId: h.id }, data))).toEqual(expected);
    expect(Object.keys(actionPoses)).toHaveLength(73);
    expect(unitPose({ ...turn, action: 'ward' }, data)).toBe('cast');
    expect(unitPose(events({ type: 'cancel', text: '' }), data)).toBeUndefined();
  });
  it('uses art identity and intent rather than the reused enemy field slot', () => {
    const enemy = { ...turn, side: 'enemy' as const, actorId: 'f1', action: undefined,
      intent: { ...veilSiege.intents[0]!, kind: 'physical' as const, targetId: 'tracer', beat: 0, round: 1 } };
    const data = (art: string) => ({ ...veilSiege, enemies: [{ ...veilSiege.enemies[1]!, id: 'f1' as const, art }] });
    expect(unitPose(enemy, data('foe_tusker'))).toBe('charge');
    expect(unitPose(enemy, data('foe_ruin_bat'))).toBe('pounce');
    expect(unitPose({ ...enemy, intent: { ...enemy.intent, kind: 'energy' } }, data('foe_tusker'))).toBe('cast');
    expect(unitPose({ ...enemy, intent: { ...enemy.intent, name: 'Shadow Knife', kind: 'energy' } }, data('foe_hunter'))).toBe('throw');
    expect(unitPose({ ...enemy, intent: { ...enemy.intent, charge: true } }, data('foe_sentinel'))).toBe('cast');
    expect(unitPose({ ...enemy, intent: { ...enemy.intent, all: true } }, data('foe_sentinel'))).toBe('smash');
    expect(unitPose(enemy, data('future-art'))).toBe('smash');
  });
  it('reacts to real recipients: absorption, Guard redirection, dodge, counter and down', () => {
    const t = events(
      { type: 'damage', sourceId: 'f1', targetId: 'guardian', amount: 0, absorbed: 12, text: '' },
      { type: 'dodge', sourceId: 'b1', targetId: 'sefa', text: '' },
      { type: 'counter', sourceId: 'garran', targetId: 'f1', amount: 8, text: '' },
      { type: 'down', targetId: 'f1', text: '' },
    );
    t.after = undefined;
    const reactions = unitReactions(t);
    expect(reactions.get('guardian')?.pose).toBe('block');
    expect(reactions.has('tracer')).toBe(false);
    expect(reactions.get('sefa')?.pose).toBe('dodge');
    expect(reactions.get('garran')?.pose).toBe('counter');
    expect(reactions.get('f1')?.pose).toBe('down');
  });
  it('never invents reactions for full HP support or replaces a later revival with down', () => {
    expect(unitReactions(events({ type: 'heal', targetId: 'guardian', amount: 0, text: '' })).size).toBe(0);
    const t = events({ type: 'down', targetId: 'guardian', text: '' });
    t.after = turn.before;
    expect(unitReactions(t).has('guardian')).toBe(false);
  });
});

describe('unit animation lifecycle', () => {
  for (const fast of [false, true]) it(`holds until contact, recovers and preserves trace at speed fast=${fast}`, () => {
    const before = JSON.stringify(turn), animation = new UnitAnimation(), body = new Body(), initial = snapshot(body), idle: boolean[] = [];
    animation.bind('tracer', body, 96, paused => idle.push(paused));
    const timing = stageTiming(turn, false, fast);
    animation.begin('tracer', 'thrust', 1, timing.contact);
    animation.update(timing.contact * .5);
    expect(body.x).toBeGreaterThan(initial[0]!);
    animation.update(timing.contact * 2);
    expect(body.x).toBe(118); // no autonomous damage/end transition if the UI cue has not fired
    animation.contact('tracer', timing.end - timing.contact);
    animation.update(timing.end);
    expect(snapshot(body)).toEqual(initial);
    expect(idle.at(-1)).toBe(false);
    expect(JSON.stringify(turn)).toBe(before);
  });
  it('mirrors motion without changing body scale/facing and supports simultaneous actors', () => {
    const animation = new UnitAnimation(), left = new Body(), right = new Body();
    animation.bind('hero', left, 96, () => {}); animation.bind('foe', right, 96, () => {});
    animation.begin('hero', 'slash', 1, 100); animation.begin('foe', 'slash', -1, 100); animation.update(100);
    expect(left.x - 100).toBe(-(right.x - 100));
    expect(left.scaleX).toBe(right.scaleX);
    animation.react('hero', 'hit', 1, 300); animation.update(100);
    expect(left.x).toBeLessThan(100);
    expect(right.x).toBeLessThan(100);
  });
  it('settles all transforms and idle after skip/resize/hidden-tab without stale callbacks', () => {
    const animation = new UnitAnimation(), body = new Body(), initial = snapshot(body), idle: boolean[] = [];
    animation.bind('hero', body, 96, paused => idle.push(paused));
    animation.begin('hero', 'guard', 1, 100); animation.update(70);
    expect(snapshot(body)).not.toEqual(initial);
    animation.settle(); animation.update(10000);
    expect(snapshot(body)).toEqual(initial); expect(idle.at(-1)).toBe(false);
    animation.begin('hero', 'dance', -1, 100); animation.update(40); animation.clear();
    const next = new Body(); next.x = 300;
    animation.bind('hero', next, 96, () => {}); animation.update(10000);
    expect(next.x).toBe(300); expect(snapshot(body)).toEqual(initial);
  });
  it('ignores absent actors/zero durations and reactions interrupt a casting pose safely', () => {
    const animation = new UnitAnimation(), body = new Body(), initial = snapshot(body);
    animation.begin('missing', 'cast', 1, 100); animation.update(100);
    animation.bind('hero', body, 96, () => {}); animation.begin('hero', 'cast', 1, 0); animation.update(100);
    expect(snapshot(body)).toEqual(initial);
    animation.begin('hero', 'cast', 1, 100); animation.update(100);
    animation.react('hero', 'down', 1, 300); animation.update(150);
    expect(body.y).toBeGreaterThan(200);
    animation.update(150); expect(snapshot(body)).toEqual(initial);
  });
});
