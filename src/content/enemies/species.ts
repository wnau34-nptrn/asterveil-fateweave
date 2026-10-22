import type { EnemyDefinition, EnemySlot, EncounterDefinition, IntentDefinition } from '../../core/battle/types';

// Reusable foe kinds for the four-slot battles (A7 step 2). Numbers are level 1 values; `foes` scales them to the
// encounter's reference level by the monster-level rule (+7% HP and damage per level, never SPD). Draft numbers,
// validated by `npm run sim`. Physical-looking foes use physical moves, energy-looking foes energy moves.
export interface FoeMove { name: string; damage: number; kind: 'physical' | 'energy'; slot: number }
export interface Species {
  name: string; displayName: string; row: 'front' | 'back'; large?: boolean; art: string; color: number;
  hp: number; speed: number; moves: readonly FoeMove[];
}
const move = (name: string, damage: number, kind: FoeMove['kind'], slot: number): FoeMove => ({ name, damage, kind, slot });

export const SPECIES = {
  // Map 1 ซากชายแดน (ART-CHAR-FOES-002): soft, weak-looking creatures.
  dewSlime: { name: 'Dew Slime', displayName: 'สไลม์น้ำค้าง', row: 'front', art: 'foe_dew_slime', color: 0x8fd8d0, hp: 30, speed: 70,
    moves: [move('Jelly Bounce', 6, 'physical', 1), move('Jelly Bounce', 6, 'physical', 0), move('Jelly Bounce', 7, 'physical', 1)] },
  emberSlime: { name: 'Ember Slime', displayName: 'สไลม์ถ่านไฟ', row: 'back', art: 'foe_ember_slime', color: 0xf0a070, hp: 22, speed: 90,
    moves: [move('Ember Spark', 7, 'energy', 2), move('Ember Spark', 7, 'energy', 3), move('Ember Spark', 8, 'energy', 0)] },
  ruinBat: { name: 'Ruin Bat', displayName: 'ค้างคาวซาก', row: 'back', art: 'foe_ruin_bat', color: 0xb8a6d0, hp: 18, speed: 125,
    moves: [move('Nip', 5, 'physical', 0), move('Nip', 5, 'physical', 1), move('Nip', 6, 'physical', 0)] },
  // Map 1 story only: Vargoth's guard.
  vargothGuard: { name: 'Vargoth Guard', displayName: 'องครักษ์อสูร', row: 'front', large: true, art: 'foe_vargoth_guard', color: 0x9785f2, hp: 100, speed: 70,
    moves: [move('Shield Smash', 14, 'physical', 1), move('Mace Swing', 16, 'physical', 0)] },
  // Earlier foes (ART-CHAR-MERC-ENEMY-001) as kinds.
  sprite: { name: 'Dandelion Sprite', displayName: 'ภูตแดนดิไลออน', row: 'back', art: 'foe_sprite', color: 0xa6dfce, hp: 60, speed: 110,
    moves: [move('Seed Spark', 10, 'energy', 1), move('Seed Spark', 11, 'energy', 3), move('Seed Spark', 10, 'energy', 0)] },
  tusker: { name: 'Mossback Tusker', displayName: 'หมูป่าหลังตะไคร่', row: 'front', large: true, art: 'foe_tusker', color: 0x718746, hp: 112, speed: 70,
    moves: [move('Tusk Charge', 17, 'physical', 1), move('Tusk Charge', 15, 'physical', 0), move('Tusk Charge', 17, 'physical', 1)] },
  stalker: { name: 'Briar Stalker', displayName: 'ลิงซ์หนามพราง', row: 'front', art: 'foe_stalker', color: 0x397e77, hp: 75, speed: 110,
    moves: [move('Thorn Pounce', 14, 'physical', 1), move('Thorn Pounce', 12, 'physical', 0), move('Thorn Pounce', 14, 'physical', 1)] },
  // Map 2 เส้นทางป่าทึบ.
  thornBeetle: { name: 'Thorn Beetle', displayName: 'ด้วงหนาม', row: 'front', art: 'foe_thorn_beetle', color: 0x6f7f3a, hp: 50, speed: 65,
    moves: [move('Thorn Bite', 9, 'physical', 1), move('Thorn Bite', 9, 'physical', 0), move('Thorn Bite', 10, 'physical', 1)] },
  sporePuff: { name: 'Spore Puff', displayName: 'ภูตสปอร์', row: 'back', art: 'foe_spore_puff', color: 0x4fb3a6, hp: 34, speed: 100,
    moves: [move('Spore Dust', 8, 'energy', 3), move('Spore Dust', 8, 'energy', 2), move('Spore Dust', 9, 'energy', 1)] },
  // Map 3 แนวรอยแยก.
  riftChanneler: { name: 'Rift Channeler', displayName: 'อสูรส่งพลัง', row: 'front', large: true, art: 'foe_rift_channeler', color: 0x8a5cd6, hp: 110, speed: 70,
    moves: [move('Rift Beam', 15, 'energy', 2), move('Rift Beam', 14, 'energy', 3), move('Rift Beam', 17, 'energy', 1)] },
  riftWisp: { name: 'Rift Wisp', displayName: 'วิญญาณรอยแยก', row: 'back', art: 'foe_rift_wisp', color: 0xa77ef0, hp: 36, speed: 115,
    moves: [move('Star Flame', 7, 'energy', 3), move('Star Flame', 7, 'energy', 2), move('Star Flame', 8, 'energy', 0)] },
  shardCrawler: { name: 'Shard Crawler', displayName: 'แมงมุมเศษผลึก', row: 'front', art: 'foe_shard_crawler', color: 0x7d5fc0, hp: 60, speed: 85,
    moves: [move('Crystal Stab', 10, 'physical', 0), move('Crystal Stab', 10, 'physical', 1), move('Crystal Stab', 11, 'physical', 0)] },
} as const satisfies Record<string, Species>;

const atLevel = (n: number, level: number) => Math.max(1, Math.round(n * (1 + (level - 1) * 7 / 100)));
// Places kinds in slots at the encounter level. A repeated kind starts one move later so two copies
// do not aim at the same hero in the same round. `extra` overrides a foe's definition (names, boss flag, HP).
export function foes(level: number, placed: readonly [EnemySlot, Species, Partial<EnemyDefinition>?][]): Pick<EncounterDefinition, 'enemies' | 'intents'> {
  const enemies: EnemyDefinition[] = []; const intents: IntentDefinition[] = []; const seen = new Map<Species, number>();
  for (const [id, s, extra] of placed) {
    const copy = seen.get(s) ?? 0; seen.set(s, copy + 1);
    enemies.push({ id, row: s.row, ...(s.large ? { large: true } : {}), name: s.name, displayName: s.displayName, maxHp: atLevel(s.hp, level), speed: s.speed, color: s.color, art: s.art, ...extra });
    for (let i = 0; i < s.moves.length; i++) {
      const m = s.moves[(i + copy) % s.moves.length]!;
      intents.push({ sourceId: id, targetSlot: m.slot, name: m.name, damage: atLevel(m.damage, level), kind: m.kind });
    }
  }
  return { enemies, intents };
}
