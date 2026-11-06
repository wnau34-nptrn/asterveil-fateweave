import type { ActionId, HeroDefinition, SkillDefinition } from '../../core/battle/types';
import type { TalentNodeDef, TalentTree } from '../../core/world/types';

// P03 (OD-14: one character per class): Kael the Martial, Wynne the Hexer and Astrid the Seer, from docs/design/ROSTER_30_TH.md §3–5. New members join
// through the existing hiring board's featured slot, never the prologue draft or a story arrival. Numbers are drafts.
export const rosterP03: readonly HeroDefinition[] = [
  { id: 'kael', name: 'Kael', role: 'Martial', lane: 'front', maxHp: 64, attack: 13, speed: 105, actions: ['attack', 'gatherfist', 'releasefist'], color: 0xc98a4b },
  { id: 'wynne', name: 'Wynne', role: 'Hexer', lane: 'back', maxHp: 48, attack: 9, speed: 80, actions: ['attack', 'threadhex', 'lifetoll'], color: 0xb4475a },
  { id: 'astrid', name: 'Astrid', role: 'Seer', lane: 'back', maxHp: 48, attack: 9, speed: 90, actions: ['attack', 'deflectfate', 'turncycle'], color: 0x6f86c9 },
];

export const rosterP03Skills = {
  gatherfist: { name: 'หมัดรวมปราณ', english: 'Gather Fist', icon: '✊', power: 16, cooldown: 1 },
  releasefist: { name: 'ปล่อยปราณ', english: 'Release Fist', icon: '✊', power: 10, cooldown: 2 },
  flowfist: { name: 'หมัดสายน้ำ', english: 'Flow Fist', icon: '✊', power: 12, cooldown: 3 },
  circlefist: { name: 'หมัดวงกลม', english: 'Circle Fist', icon: '✊', power: 14, cooldown: 3 },
  storedfist: { name: 'หมัดเก็บแรง', english: 'Stored Fist', icon: '✊', power: 20, cooldown: 2 },
  perfectfist: { name: 'หมัดสมบูรณ์', english: 'Perfect Fist', icon: '✊', power: 38, cooldown: 4 },
  // Hexer: thread hex's power is the curse's damage per stack as each round ends; Pull Thread (`lifetoll`) and the Pulling
  // Ring (`tollring`) tick a curse at once with that power (skill rework step 2, owner 2026-11-06), so their own power is 0.
  threadhex: { name: 'ด้ายสาป', english: 'Thread Hex', icon: '✂', power: 5, cooldown: 1 },
  lifetoll: { name: 'ดึงด้าย', english: 'Pull Thread', icon: '✂', power: 0, cooldown: 2 },
  wovenhex: { name: 'สาปถักทอ', english: 'Woven Hex', icon: '✂', power: 0, cooldown: 4 },
  longthread: { name: 'ด้ายยาว', english: 'Long Thread', icon: '✂', power: 0, cooldown: 3 },
  tollring: { name: 'วงด้ายดึง', english: 'Pulling Ring', icon: '✂', power: 0, cooldown: 4 },
  knothex: { name: 'ปมสาป', english: 'Knot Hex', icon: '✂', power: 0, cooldown: 3 },
  // Seer: bend or turn announced moves; the needle and the orbit are its plain energy strikes.
  deflectfate: { name: 'เบนชะตา', english: 'Deflect Fate', icon: '✦', power: 0, cooldown: 4 },
  turncycle: { name: 'หมุนวงดาว', english: 'Turn Cycle', icon: '✦', power: 8, cooldown: 3 },
  starneedle: { name: 'เข็มดารา', english: 'Star Needle', icon: '✦', power: 22, cooldown: 2 },
  crossing: { name: 'ทางแยกชะตา', english: 'Crossing', icon: '✦', power: 12, cooldown: 4 },
  readorbit: { name: 'อ่านวงโคจร', english: 'Read Orbit', icon: '✦', power: 18, cooldown: 2 },
  doubledial: { name: 'หมุนสองวง', english: 'Double Dial', icon: '✦', power: 0, cooldown: 5 },
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

const hexerTree: TalentTree = [
  node('a1', 'มือช่างสาป', { stat: 'skill', percent: 4 }, { branch: 'a', tier: 1 }, 2),
  node('a2x', 'ด้ายคม', { cap: 'hexThreadPer', amount: 1 }, { branch: 'a', tier: 2, choice: 'hexer-a2' }),
  node('a2y', 'ปมแรก', { cap: 'hexThreadFresh', amount: 2 }, { branch: 'a', tier: 2, choice: 'hexer-a2' }),
  node('a3', 'สาปถักทอ', { unlock: 'wovenhex' }, { branch: 'a', tier: 3 }),
  node('a4', 'ทอแน่น', { cap: 'hexWovenQuick', amount: 1 }, { branch: 'a', tier: 4 }),
  node('b1', 'ผ้าคลุมหนา', { stat: 'hp', percent: 5 }, { branch: 'b', tier: 1 }, 2),
  node('b2x', 'ดึงแรง', { cap: 'hexPullHeavy', amount: 2 }, { branch: 'b', tier: 2, choice: 'hexer-b2' }),
  node('b2y', 'ดึงไม่คลาย', { cap: 'hexPullKeep', amount: 1 }, { branch: 'b', tier: 2, choice: 'hexer-b2' }),
  node('b3', 'วงด้ายดึง', { unlock: 'tollring' }, { branch: 'b', tier: 3 }),
  node('b4', 'ดึงเต็มวง', { cap: 'hexRingFull', amount: 2 }, { branch: 'b', tier: 4 }),
  node('c1', 'ตุ๊กตาคุ้มตัว', { stat: 'armour', percent: 5 }, { branch: 'c', tier: 1 }, 2),
  node('c1s', 'ด้ายยาว', { unlock: 'longthread' }, { branch: 'c', tier: 1 }),
  node('c2x', 'ด้ายไม่ขาด', { cap: 'hexLongLife', amount: 1 }, { branch: 'c', tier: 2, choice: 'hexer-c2', needs: 'c1s' }),
  node('c2y', 'ด้ายคู่', { cap: 'hexLongDouble', amount: 2 }, { branch: 'c', tier: 2, choice: 'hexer-c2', needs: 'c1s' }),
  node('c3', 'ปมสาป', { unlock: 'knothex' }, { branch: 'c', tier: 3 }),
  node('c4', 'ปมรัดนาน', { cap: 'hexKnotLife', amount: 1 }, { branch: 'c', tier: 4 }),
];

const seerTree: TalentTree = [
  node('a1', 'ดวงตาดาว', { stat: 'skill', percent: 4 }, { branch: 'a', tier: 1 }, 2),
  node('a2x', 'เบนไว', { cap: 'seerDeflectQuick', amount: 1 }, { branch: 'a', tier: 2, choice: 'seer-a2' }),
  node('a2y', 'ชะตารอได้', { cap: 'seerDeflectHold', amount: 1 }, { branch: 'a', tier: 2, choice: 'seer-a2' }),
  node('a3', 'ทางแยกชะตา', { unlock: 'crossing' }, { branch: 'a', tier: 3 }),
  node('a4', 'แยกแล้วแทง', { cap: 'seerCrossingHit', amount: 4 }, { branch: 'a', tier: 4 }),
  node('b1', 'เสื้อคลุมดาว', { stat: 'hp', percent: 5 }, { branch: 'b', tier: 1 }, 2),
  node('b2x', 'หมุนไว', { cap: 'seerTurnQuick', amount: 1 }, { branch: 'b', tier: 2, choice: 'seer-b2' }),
  node('b2y', 'หมุนคืนแรง', { cap: 'seerTurnRefund', amount: 1 }, { branch: 'b', tier: 2, choice: 'seer-b2' }),
  node('b3', 'หมุนสองวง', { unlock: 'doubledial' }, { branch: 'b', tier: 3 }),
  node('b4', 'กำหนดรอบหมุน', { cap: 'seerDialChoose', amount: 1 }, { branch: 'b', tier: 4 }),
  node('c1', 'แผนที่ดาวกันตัว', { stat: 'armour', percent: 5 }, { branch: 'c', tier: 1 }, 2),
  node('c1s', 'เข็มดารา', { unlock: 'starneedle' }, { branch: 'c', tier: 1 }),
  node('c2x', 'ดาวเดี่ยว', { cap: 'seerNeedleLone', amount: 4 }, { branch: 'c', tier: 2, choice: 'seer-c2', needs: 'c1s' }),
  node('c2y', 'เข็มแทนเบน', { cap: 'seerNeedleBlocked', amount: 3 }, { branch: 'c', tier: 2, choice: 'seer-c2', needs: 'c1s' }),
  node('c3', 'อ่านวงโคจร', { unlock: 'readorbit' }, { branch: 'c', tier: 3 }),
  node('c4', 'อ่านท่าไม้ตาย', { cap: 'seerOrbitLocked', amount: 6 }, { branch: 'c', tier: 4 }),
];

export const rosterP03Trees: Readonly<Record<string, TalentTree>> = {
  kael: [...martialTree,
    node('p1', 'ใจว่างก่อนหมัด', { cap: 'kael1', amount: 3 }, { branch: 'p', tier: 1 }),
    node('p2', 'ไหลจากความว่าง', { cap: 'kael2', amount: 1 }, { branch: 'p', tier: 2, needs: 'p1' }),
    node('p3', 'ปล่อยสุดลมหายใจ', { cap: 'kael3', amount: 4 }, { branch: 'p', tier: 3, needs: 'p2' }),
    node('p4', 'วินัยหยุดโทสะ', { cap: 'kael4', amount: 6 }, { branch: 'p', tier: 4, needs: 'p3' }),
  ],
  astrid: [...seerTree,
    node('p1', 'แผนดาวฉบับแรก', { cap: 'astrid1', amount: 1 }, { branch: 'p', tier: 1 }),
    node('p2', 'เส้นทางที่เลือกได้', { power: 'crossing', amount: 3 }, { branch: 'p', tier: 2, needs: 'p1' }),
    node('p3', 'อ่านพายุล่วงหน้า', { cap: 'astrid3', amount: 3 }, { branch: 'p', tier: 3, needs: 'p2' }),
    node('p4', 'ชะตาข้ามแนว', { cap: 'astrid4', amount: 1 }, { branch: 'p', tier: 4, needs: 'p3' }),
  ],
  wynne: [...hexerTree,
    node('p1', 'ด้ายเส้นแรก', { cap: 'wynne1', amount: 1 }, { branch: 'p', tier: 1 }),
    node('p2', 'เย็บไว', { cap: 'wynne2', amount: 1 }, { branch: 'p', tier: 2, needs: 'p1' }),
    node('p3', 'ปมแน่นเต็มตุ๊กตา', { cap: 'wynne3', amount: 1 }, { branch: 'p', tier: 3, needs: 'p2' }),
    node('p4', 'ด้ายจากชายแดน', { cap: 'wynne4', amount: 1 }, { branch: 'p', tier: 4, needs: 'p3' }),
  ],
};
