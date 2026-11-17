// Presentation fixtures for the World Boss trio VFX (ART-VFX-WB-TRIO-001). All outcomes come from the real resolver; only the
// field is narrowed so the chosen move is the boss's next turn: the trio encounter's own five heroes (Guardian first, the rest
// slower than the boss), the boss with its real intent definitions, and for Morvane its standing court (f2/f3/b2, slow). For
// Call the Court, f2 has 1 HP and Guardian's strike fells it, so the boss really calls it back on the same round.
import { encounterById } from '../../src/content/encounters/catalog';
import { beginBattle, currentHeroId, resolveCommand, targetOptions } from '../../src/core/battle/engine';
import type { Command, EncounterDefinition, IntentDefinition } from '../../src/core/battle/types';

export const wbVfxMoves = {
  'Titan Gathering': 'wb-kragmor', 'Mountain Fall': 'wb-kragmor', 'Rift Quake': 'wb-kragmor', 'Fault Awakening': 'wb-kragmor',
  'Wing Gust': 'wb-valdrakk', 'Wing Gathering': 'wb-valdrakk', 'Worldshard Dive': 'wb-valdrakk', 'Sky Rend': 'wb-valdrakk',
  'Severing Bolt': 'wb-morvane', 'Fate Lash': 'wb-morvane', 'Call the Court': 'wb-morvane', 'Shadow Tide': 'wb-morvane', 'Severed Crown': 'wb-morvane',
} as const;
export type WbVfxMove = keyof typeof wbVfxMoves;
// normal: the move's own turn. release: a charge's release, played after the charge turn (the hold is on screen first).
// break: Guardian's Bash cancels a charge on the round it is announced (Wing Gathering: the dive is then staggered).
export type WbVfxScenario = 'normal' | 'release' | 'break';

export function wbVfxFixture(move: WbVfxMove, scenario: WbVfxScenario = 'normal') {
  const base = encounterById(wbVfxMoves[move])!;
  const boss = base.enemies.find(e => e.boss)!;
  const own = base.intents.filter(i => i.sourceId === boss.id);
  const phase = (base.phases ?? []).find(p => p.name === move);
  const strip = ({ phase: _p, ...i }: IntentDefinition): IntentDefinition => { void _p; return i; };
  const clampSlot = (i: IntentDefinition) => ({ ...i, targetSlot: Math.min(i.targetSlot, 4) });
  let cycle: IntentDefinition[];
  if (phase) cycle = [strip(own.find(i => !i.phase && !i.charge && !i.summon)!), ...own.filter(i => i.phase)];
  else {
    const at = own.findIndex(i => i.name === move && !i.phase), mv = own[at]!;
    // A charge keeps its real release next in the cycle; anything else is the cycle's only move.
    cycle = mv.charge ? [strip(mv), strip(own[at + 1]!)] : [strip(mv)];
  }
  const court = boss.court?.by ?? [];
  const build = (maxHp: number): EncounterDefinition => ({
    ...structuredClone(base),
    heroes: base.heroes.map(h => ({ ...h, speed: h.id === 'guardian' ? 200 : Math.min(h.speed, 70) - (h.id === 'metta' ? 1 : 0) })),
    enemies: [...base.enemies.filter(e => court.includes(e.id as never)).map(e => ({ ...e, speed: 30, ...(move === 'Call the Court' && e.id === 'f2' ? { maxHp: 1 } : {}) })), { ...boss, speed: 110, maxHp }],
    intents: [...base.intents.filter(i => court.includes(i.sourceId as never)), ...cycle.map(clampSlot)],
    phases: phase ? [{ ...phase, summon: undefined, hardSummon: undefined }] : undefined,
  });
  const start = (d: EncounterDefinition) => ({ entry: { hp: Object.fromEntries(d.heroes.map(h => [h.id, h.maxHp])) }, state: beginBattle(d, undefined, true).state });
  const act = (d: EncounterDefinition, state: ReturnType<typeof start>['state'], bash = false) => {
    const action = bash ? 'bash' as const : 'attack' as const;
    const t = targetOptions(state, d, 'guardian', action).find(o => o.valid && o.id === (move === 'Call the Court' ? 'f2' : 'f1'))!;
    const command: Command = { beat: state.beat, heroId: 'guardian', action, targetId: t.id };
    return { command, result: resolveCommand(state, d, command, true) };
  };
  let data = build(boss.maxHp);
  if (phase) {
    // One Guardian strike takes the boss below the phase line, so the resolver queues the phase as the boss's next turn.
    const probe = act(data, start(data).state), dealt = boss.maxHp - probe.result.state.enemies.find(e => e.id === 'f1')!.hp;
    data = build(Math.floor(dealt * 100 / (100 - phase.below)));
  }
  const begin = start(data), prelude: Command[] = [];
  let state = begin.state;
  if (scenario === 'release') {
    // The charge turn first (Guardian attacks, the boss gathers), then the clip's command lets the boss release.
    const r = act(data, state); prelude.push(r.command); state = r.result.state;
    // Hand back to Guardian at the start of the next round: the slower heroes each take their turn first.
    for (let hero = currentHeroId(state, data); hero && hero !== 'guardian' && state.outcome === 'active'; hero = currentHeroId(state, data)) {
      const t = targetOptions(state, data, hero, 'attack').find(o => o.valid && o.id === 'f1') ?? targetOptions(state, data, hero, 'attack').find(o => o.valid)!;
      const c: Command = { beat: state.beat, heroId: hero, action: 'attack', targetId: t.id };
      prelude.push(c); state = resolveCommand(state, data, c, true).state;
    }
  }
  const { command, result } = act(data, state, scenario === 'break');
  const turn = result.turns.find(t => t.side === 'enemy' && t.actorId === 'f1')!;
  return { data, entry: begin.entry, prelude, state, command, result, turn };
}
