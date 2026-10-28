import type { ActionId, EncounterDefinition, TurnStage } from '../../core/battle/types';
import { artOf } from './assets';

export type UnitPose = 'slash' | 'thrust' | 'smash' | 'shoot' | 'throw' | 'cast' | 'guard' | 'song' | 'dance' | 'punch' | 'charge' | 'pounce';
// Actor gestures are independent of damage type and of the painted VFX family.
export const actionPoses = {
  attack: 'slash', guard: 'guard', bash: 'smash', mark: 'cast', execute: 'thrust', bolt: 'cast', ward: 'cast', heal: 'cast', prayer: 'cast',
  brace: 'guard', pierce: 'thrust', hinder: 'shoot', volley: 'shoot', acid: 'throw', haste: 'cast', ambush: 'slash', evade: 'guard', taunt: 'guard', slam: 'smash', valor: 'song', mend: 'song',
  rally: 'guard', finisher: 'thrust', sigil: 'cast', sanctuary: 'cast', spearwall: 'guard', weakshot: 'shoot', bomb: 'throw', backstab: 'thrust', quake: 'smash', finale: 'song',
  challenge: 'guard', bulwark: 'guard', rouse: 'guard', parry: 'guard', lunge: 'thrust', sweep: 'slash', storm: 'cast', aegis: 'cast', dispel: 'cast', revive: 'cast', halo: 'cast', bless: 'cast',
  hold: 'guard', halt: 'thrust', warcry: 'guard', disengage: 'shoot', pin: 'shoot', track: 'shoot', smoke: 'throw', fury: 'cast', catalyst: 'throw', knives: 'throw', decoy: 'guard', disarm: 'slash',
  stonearmor: 'guard', guardstone: 'guard', tremor: 'smash', dread: 'song', note: 'song', solo: 'song',
  saintstrike: 'punch', communion: 'cast', saintarc: 'punch', vowstrike: 'punch', sharewound: 'cast', lastlight: 'cast',
  cadence: 'dance', duet: 'dance', rounddance: 'dance', deepbeat: 'dance', echofoot: 'dance', closingstep: 'dance',
} as const satisfies Record<ActionId, UnitPose>;

const basicPoses: Readonly<Record<string, UnitPose>> = {
  Knight: 'slash', Duelist: 'thrust', Mage: 'cast', Priest: 'cast', Spear: 'thrust', Archer: 'shoot', Alchemist: 'throw', Scout: 'slash', Warden: 'smash', Bard: 'song', Saint: 'punch', Dancer: 'dance',
};
const enemyPoses: Readonly<Record<string, UnitPose>> = {
  raider: 'slash', brute: 'smash', foe_tusker: 'charge', foe_sprite: 'cast', foe_stalker: 'pounce', foe_mycon: 'cast', foe_golem: 'smash', foe_riftweaver: 'cast',
  foe_matriarch: 'slash', foe_juggernaut: 'charge', foe_sentinel: 'smash', foe_hunter: 'slash', foe_captain: 'smash', foe_dew_slime: 'pounce', foe_ember_slime: 'cast', foe_ruin_bat: 'pounce',
  foe_vargoth_guard: 'smash', foe_thorn_beetle: 'pounce', foe_spore_puff: 'cast', foe_rift_channeler: 'cast', foe_rift_wisp: 'cast', foe_shard_crawler: 'thrust',
};
export function unitPose(turn: TurnStage, data: EncounterDefinition): UnitPose | undefined {
  if (turn.events.some(e => e.type === 'cancel')) return;
  if (turn.side === 'hero') return turn.action === 'attack'
    ? basicPoses[data.heroes.find(h => h.id === turn.actorId)?.role ?? ''] ?? 'slash'
    : turn.action ? actionPoses[turn.action] : 'cast';
  if (turn.intent?.charge || turn.intent?.special === 'phase') return 'cast';
  if (turn.intent?.name === 'Shadow Knife') return 'throw';
  if (turn.intent?.kind === 'energy') return 'cast';
  // Ground waves do not rush the target, even though they deal physical damage.
  if (turn.intent?.all || /Quake|Cataclysm|Stampede/.test(turn.intent?.name ?? '')) return 'smash';
  return enemyPoses[artOf(data, turn.actorId)] ?? 'smash';
}

export type Reaction = 'hit' | 'dodge' | 'block' | 'down' | 'counter';
export function unitReactions(turn: TurnStage, data?: EncounterDefinition): Map<string, { pose: Reaction; sourceId?: string }> {
  const result = new Map<string, { pose: Reaction; sourceId?: string }>();
  const rank: Record<Reaction, number> = { counter: 0, block: 1, dodge: 2, hit: 3, down: 4 };
  const add = (id: string | undefined, pose: Reaction, sourceId?: string) => {
    if (id && (!result.has(id) || rank[pose] > rank[result.get(id)!.pose])) result.set(id, { pose, sourceId });
  };
  for (const e of turn.events) {
    if (e.type === 'damage' || e.type === 'counter') {
      add(e.targetId, (e.amount ?? 0) > 0 ? 'hit' : 'block', e.sourceId);
      if (e.type === 'counter' && e.sourceId !== turn.actorId) add(e.sourceId, 'counter', e.targetId);
    } else if (e.type === 'dodge') add(e.targetId, 'dodge', e.sourceId);
    else if (e.type === 'down') add(e.targetId, 'down', e.sourceId);
  }
  // Aegis braces and ripostes in the SAME reaction window. His actual Guard
  // counter otherwise loses to his incoming hit/block and never shows the sword.
  // Keep down/dodge priority and every other identity's shipped reaction policy.
  for (const e of turn.events) if (e.type === 'counter' && e.sourceId && e.sourceId !== turn.actorId
    && (data ? artOf(data, e.sourceId) : e.sourceId) === 'guardian') {
    const incoming = result.get(e.sourceId);
    if (incoming?.pose === 'hit' || incoming?.pose === 'block') result.set(e.sourceId, { pose: 'counter', sourceId: e.targetId });
  }
  // Respect the final authoritative frame if a later effect revived a downed actor.
  for (const [id, reaction] of result) if (reaction.pose === 'down') {
    const after = [...(turn.after?.heroes ?? []), ...(turn.after?.enemies ?? [])].find(a => a.id === id);
    if (after && after.hp > 0) result.delete(id);
  }
  return result;
}
