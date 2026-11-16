import type { EncounterDefinition, IntentDefinition } from '../../core/battle/types';
import { SPECIES, foes } from '../enemies/species';
import { riftWarden, WORLD_BOSS_HP } from './catalog';

// P11-05 World Boss trio v1 (docs/design/WORLD_BOSS_TRIO_P11_05_TH.md §1, draft numbers from the design probe). Each keeps
// the warden's field shape (five heroes, bark rules) and a boss with the World Boss HP that cannot fall inside an attempt's
// eight rounds. Not offered in game yet: the world rules, save and server come in later steps (design §8).
const boss = (name: string, displayName: string, speed: number, extra: Partial<EncounterDefinition['enemies'][number]> = {}) =>
  ({ id: 'f1' as const, row: 'front' as const, large: true, boss: true, speed, name, displayName, maxHp: WORLD_BOSS_HP, color: 0xd9bf86, art: 'foe_sentinel', ...extra });
const mv = (name: string, slot: number, damage: number, kind: 'physical' | 'energy', more: Partial<IntentDefinition> = {}): IntentDefinition =>
  ({ sourceId: 'f1', targetSlot: slot, name, damage, kind, ...more });

// Kragmor, the Riftborn Titan: armour (veilguard; Mark/acid/dispel open it), a charge before an unstoppable fall on the
// front slot (Guard/taunt/stone/barriers or a Seer delay answer it), a quake on the whole party (healing answers it).
const kragAdds = foes(10, [['f2', SPECIES.shardCrawler], ['b3', SPECIES.riftWisp]]);
export const wbKragmor: EncounterDefinition = {
  ...riftWarden, id: 'wb-kragmor', version: 1, name: 'บอสโลก: คราก์มอร์',
  phases: [{ sourceId: 'f1', below: 70, name: 'Fault Awakening' }],
  enemies: [...kragAdds.enemies, boss('Kragmor', 'คราก์มอร์', 60, { traits: ['veilguard'] })],
  intents: [...kragAdds.intents,
    mv('Stone Fist', 1, 30, 'physical'), mv('Titan Gathering', 0, 0, 'physical', { charge: true }), mv('Mountain Fall', 0, 50, 'physical', { unstoppable: true }),
    mv('Rift Quake', 0, 14, 'physical', { all: true }), mv('Boulder Hurl', 3, 26, 'physical'), mv('Stone Fist', 2, 30, 'physical'),
    // 70%: the charge comes every third turn.
    mv('Titan Gathering', 0, 0, 'physical', { charge: true, phase: 1 }), mv('Mountain Fall', 0, 56, 'physical', { unstoppable: true, phase: 1 }), mv('Rift Quake', 0, 18, 'physical', { all: true, phase: 1 }),
  ],
};

// Valdrakk, the Worldshard Beast: fast (SPD 125), energy gusts and a breakable wing charge (R1): Bash/Sigil that cancels it
// staggers the dive that follows; otherwise the dive strikes the whole party (Ward/Halo/healing answer it).
const valdAdds = foes(10, [['b1', SPECIES.riftWisp], ['b2', SPECIES.riftWisp]]);
export const wbValdrakk: EncounterDefinition = {
  ...riftWarden, id: 'wb-valdrakk', version: 1, name: 'บอสโลก: วัลดรัค',
  phases: [{ sourceId: 'f1', below: 70, name: 'Sky Rend' }],
  enemies: [...valdAdds.enemies, boss('Valdrakk', 'วัลดรัค', 125)],
  intents: [...valdAdds.intents,
    mv('Shard Talon', 1, 26, 'physical'), mv('Wing Gust', 2, 22, 'energy'), mv('Wing Gathering', 0, 0, 'physical', { charge: true, breakable: true }),
    mv('Worldshard Dive', 0, 20, 'energy', { all: true }), mv('Shard Talon', 0, 28, 'physical'), mv('Wing Gust', 3, 22, 'energy'),
    mv('Wing Gathering', 0, 0, 'physical', { charge: true, breakable: true, phase: 1 }), mv('Worldshard Dive', 0, 24, 'energy', { all: true, phase: 1 }),
    mv('Shard Talon', 1, 30, 'physical', { phase: 1 }),
  ],
};

// Morvane, the Severed Monarch: a court of three (two hands in front, a wisp behind; they hit 70% as hard, as the warden's
// wisps do). Each standing court foe raises the monarch's moves by 10% (R2), and every fourth turn it calls the fallen
// court back; area attacks answer it.
const COURT = ['f2', 'f3', 'b2'] as const;
const court = foes(10, [['f2', SPECIES.shardCrawler], ['f3', SPECIES.shardCrawler], ['b2', SPECIES.riftWisp]]);
export const wbMorvane: EncounterDefinition = {
  ...riftWarden, id: 'wb-morvane', version: 1, name: 'บอสโลก: มอร์เวน',
  phases: [{ sourceId: 'f1', below: 70, name: 'Severed Crown' }],
  enemies: [...court.enemies, boss('Morvane', 'มอร์เวน', 80, { court: { percent: 10, by: COURT } })],
  intents: [...court.intents.map(m => ({ ...m, damage: Math.round(m.damage * 0.7) })),
    mv('Six-Hand Rend', 1, 24, 'physical'), mv('Severing Bolt', 3, 22, 'energy'), mv('Call the Court', 0, 0, 'energy', { summon: COURT }),
    mv('Fate Lash', 2, 26, 'energy'), mv('Six-Hand Rend', 0, 28, 'physical'), mv('Shadow Tide', 0, 14, 'energy', { all: true }),
    mv('Severing Bolt', 2, 26, 'energy', { phase: 1 }), mv('Call the Court', 0, 0, 'energy', { summon: COURT, phase: 1 }), mv('Shadow Tide', 0, 18, 'energy', { all: true, phase: 1 }),
  ],
};

export const WORLD_BOSS_TRIO: readonly EncounterDefinition[] = [wbKragmor, wbValdrakk, wbMorvane];
