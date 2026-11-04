import type { ActionId, HeroDefinition, SkillDefinition } from '../../core/battle/types';
import type { TalentNodeDef, TalentTree } from '../../core/world/types';

// P03 (OD-14: one character per class): Kael the Martial, from docs/design/ROSTER_30_TH.md §3–5. New members join
// through the existing hiring board's featured slot, never the prologue draft or a story arrival. Numbers are drafts.
export const rosterP03: readonly HeroDefinition[] = [
  { id: 'kael', name: 'Kael', role: 'Martial', lane: 'front', maxHp: 64, attack: 13, speed: 105, actions: ['attack', 'gatherfist', 'releasefist'], color: 0xc98a4b },
];

export const rosterP03Skills = {
  gatherfist: { name: 'หมัดรวมปราณ', english: 'Gather Fist', icon: '✊', power: 16, cooldown: 1 },
  releasefist: { name: 'ปล่อยปราณ', english: 'Release Fist', icon: '✊', power: 10, cooldown: 2 },
  flowfist: { name: 'หมัดสายน้ำ', english: 'Flow Fist', icon: '✊', power: 12, cooldown: 3 },
  circlefist: { name: 'หมัดวงกลม', english: 'Circle Fist', icon: '✊', power: 14, cooldown: 3 },
  storedfist: { name: 'หมัดเก็บแรง', english: 'Stored Fist', icon: '✊', power: 20, cooldown: 2 },
  perfectfist: { name: 'หมัดสมบูรณ์', english: 'Perfect Fist', icon: '✊', power: 38, cooldown: 4 },
} satisfies Partial<Record<ActionId, SkillDefinition>>;

type Place = Pick<TalentNodeDef, 'branch' | 'tier' | 'choice' | 'needs'>;
const node = (id: string, name: string, effect: TalentNodeDef['effect'], place: Place, max = 1): TalentNodeDef => ({ id, name, max, effect, ...place });

// Sixteen shared nodes for the class, plus four sequential paid personal nodes (same budget as every tree).
const martialTree: TalentTree = [
  node('a1', 'กำปั้นหนัก', { stat: 'attack', percent: 4 }, { branch: 'a', tier: 1 }, 2),
  node('a2x', 'หมัดแน่น', { power: 'gatherfist', amount: 4 }, { branch: 'a', tier: 2, choice: 'martial-a2' }),
  node('a2y', 'ลมหายใจแรก', { cap: 'martialGatherChi', amount: 1 }, { branch: 'a', tier: 2, choice: 'martial-a2' }),
  node('a3', 'หมัดสายน้ำ', { unlock: 'flowfist' }, { branch: 'a', tier: 3 }),
  node('a4', 'น้ำนิ่งไหลลึก', { cap: 'martialFlowZero', amount: 6 }, { branch: 'a', tier: 4 }),
  node('b1', 'กายทน', { stat: 'hp', percent: 5 }, { branch: 'b', tier: 1 }, 2),
  node('b2x', 'ปล่อยหนัก', { cap: 'martialReleasePer', amount: 2 }, { branch: 'b', tier: 2, choice: 'martial-b2' }),
  node('b2y', 'ปล่อยไว', { cap: 'martialReleaseQuick', amount: 1 }, { branch: 'b', tier: 2, choice: 'martial-b2' }),
  node('b3', 'หมัดวงกลม', { unlock: 'circlefist' }, { branch: 'b', tier: 3 }),
  node('b4', 'วงกว้าง', { cap: 'martialCircleCrowd', amount: 4 }, { branch: 'b', tier: 4 }),
  node('c1', 'ผิวเหล็ก', { stat: 'armour', percent: 5 }, { branch: 'c', tier: 1 }, 2),
  node('c1s', 'หมัดเก็บแรง', { unlock: 'storedfist' }, { branch: 'c', tier: 1 }),
  node('c2x', 'เต็มเปี่ยม', { cap: 'martialStoredFull', amount: 5 }, { branch: 'c', tier: 2, choice: 'martial-c2', needs: 'c1s' }),
  node('c2y', 'เก็บทีละนิด', { cap: 'martialStoredBuild', amount: 4 }, { branch: 'c', tier: 2, choice: 'martial-c2', needs: 'c1s' }),
  node('c3', 'หมัดสมบูรณ์', { unlock: 'perfectfist' }, { branch: 'c', tier: 3 }),
  node('c4', 'หมัดหนักแผ่นดิน', { cap: 'martialPerfectHeavy', amount: 8 }, { branch: 'c', tier: 4 }),
];

export const rosterP03Trees: Readonly<Record<string, TalentTree>> = {
  kael: [...martialTree,
    node('p1', 'ใจว่างก่อนหมัด', { cap: 'kael1', amount: 3 }, { branch: 'p', tier: 1 }),
    node('p2', 'ไหลจากความว่าง', { cap: 'kael2', amount: 1 }, { branch: 'p', tier: 2, needs: 'p1' }),
    node('p3', 'ปล่อยสุดลมหายใจ', { cap: 'kael3', amount: 4 }, { branch: 'p', tier: 3, needs: 'p2' }),
    node('p4', 'วินัยหยุดโทสะ', { cap: 'kael4', amount: 6 }, { branch: 'p', tier: 4, needs: 'p3' }),
  ],
};
